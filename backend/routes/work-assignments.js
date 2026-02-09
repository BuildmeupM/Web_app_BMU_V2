/**
 * Work Assignments Routes
 * Routes สำหรับการจัดการการจัดงานรายเดือน (Workflow System)
 * ⚠️ Important: เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work อัตโนมัติ
 */

import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { generateUUID } from '../utils/leaveHelpers.js'
import { invalidateCache } from '../middleware/cache.js'
import { addJob, getJob, JOB_STATUS } from '../services/queueService.js'

const router = express.Router()

/**
 * Helper function: Format date from database to 'YYYY-MM-DD HH:mm:ss' format
 * ⚠️ Performance: Format ใน JavaScript เร็วกว่า DATE_FORMAT ใน SQL
 * @param {string|Date|null} dateValue - Date value from database
 * @returns {string|null} Formatted date string or null
 */
function formatDateForResponse(dateValue) {
  if (!dateValue) return null
  // ถ้าเป็น Date object ให้แปลงเป็น string
  if (dateValue instanceof Date) {
    return dateValue.toISOString().slice(0, 19).replace('T', ' ')
  }
  // ถ้าเป็น string ที่มี 'T' ให้แปลงเป็น format ที่ต้องการ
  if (typeof dateValue === 'string') {
    // Handle ISO format: '2026-02-03T16:39:41.000Z' -> '2026-02-03 16:39:41'
    if (dateValue.includes('T')) {
      return dateValue.replace('T', ' ').slice(0, 19)
    }
    // ถ้าเป็น format ที่ถูกต้องแล้ว (YYYY-MM-DD HH:mm:ss) ให้คืนค่าเดิม
    return dateValue
  }
  return null
}

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'), false)
    }
  },
})

/**
 * Helper function: รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
 * @param {string} build - Build code
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {object} assignment - Work assignment data
 */
async function resetMonthlyData(build, year, month, assignment) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Soft delete ข้อมูลเก่า (ถ้ามี)
    await connection.execute(
      'UPDATE monthly_tax_data SET deleted_at = CURRENT_TIMESTAMP WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    await connection.execute(
      'UPDATE document_entry_work SET deleted_at = CURRENT_TIMESTAMP WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    // 2. สร้างข้อมูลใหม่สำหรับ monthly_tax_data
    // Set original_* and current_* to the assigned values when resetting monthly data
    const monthlyTaxDataId = generateUUID()
    await connection.execute(
      `INSERT INTO monthly_tax_data (
        id, build, tax_year, tax_month,
        accounting_responsible, original_accounting_responsible, current_accounting_responsible,
        tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
        document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
        wht_filer_employee_id, original_wht_filer_employee_id,
        vat_filer_employee_id, original_vat_filer_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        monthlyTaxDataId,
        build,
        year,
        month,
        assignment.accounting_responsible || null,
        assignment.accounting_responsible || null, // original_accounting_responsible
        assignment.accounting_responsible || null, // current_accounting_responsible
        assignment.tax_inspection_responsible || null,
        assignment.tax_inspection_responsible || null, // original_tax_inspection_responsible
        assignment.tax_inspection_responsible || null, // current_tax_inspection_responsible
        assignment.document_entry_responsible || null,
        assignment.document_entry_responsible || null, // original_document_entry_responsible
        assignment.document_entry_responsible || null, // current_document_entry_responsible
        assignment.wht_filer_responsible || null,
        assignment.wht_filer_responsible || null, // original_wht_filer_employee_id
        assignment.vat_filer_responsible || null,
        assignment.vat_filer_responsible || null, // original_vat_filer_employee_id
      ]
    )

    // 3. สร้างข้อมูลใหม่สำหรับ document_entry_work
    const documentEntryWorkId = generateUUID()
    await connection.execute(
      `INSERT INTO document_entry_work (
        id, build, work_year, work_month,
        entry_timestamp, submission_count,
        responsible_employee_id, current_responsible_employee_id
      ) VALUES (?, ?, ?, ?, NOW(), 1, ?, ?)`,
      [
        documentEntryWorkId,
        build,
        year,
        month,
        assignment.document_entry_responsible || null,
        assignment.document_entry_responsible || null,
      ]
    )

    await connection.commit()
    return { success: true }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

/**
 * GET /api/work-assignments
 * ดึงรายการการจัดงานทั้งหมด (paginated, filter)
 * Access: All authenticated users (Admin/HR can see all)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      build = '',
      year = '',
      month = '',
      search = '',
      sortBy = 'assigned_at',
      sortOrder = 'desc',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Role-based access control
    const isHRorAdmin = req.user.role === 'admin'

    // Build WHERE clause
    const whereConditions = ['wa.deleted_at IS NULL']
    const queryParams = []

    // Filter by build
    if (build) {
      whereConditions.push('wa.build = ?')
      queryParams.push(build)
    }

    // Filter by year
    if (year) {
      whereConditions.push('wa.assignment_year = ?')
      queryParams.push(parseInt(year))
    }

    // Filter by month
    if (month) {
      whereConditions.push('wa.assignment_month = ?')
      queryParams.push(parseInt(month))
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(wa.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Validate sortBy
    const allowedSortFields = ['assigned_at', 'assignment_year', 'assignment_month', 'build', 'created_at']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'assigned_at'
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    // Get total count (พร้อม retry logic สำหรับ ECONNRESET)
    let countResults
    let retries = 3
    while (retries > 0) {
      try {
        [countResults] = await pool.execute(
          `SELECT COUNT(*) as total 
           FROM work_assignments wa
           LEFT JOIN clients c ON wa.build = c.build
           ${whereClause}`,
          queryParams
        )
        break // Success, exit retry loop
      } catch (dbError) {
        retries--
        if (dbError.code === 'ECONNRESET' && retries > 0) {
          // Wait 100ms before retry
          await new Promise((resolve) => setTimeout(resolve, 100))
          continue
        }
        // If not ECONNRESET or no retries left, throw error
        throw dbError
      }
    }
    const total = countResults[0].total

    // Get work assignments (พร้อม retry logic สำหรับ ECONNRESET)
    let assignments
    retries = 3
    while (retries > 0) {
      try {
        [assignments] = await pool.execute(
          `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        c.tax_registration_status,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        CASE WHEN e1.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e1.full_name, ' ', 1), '(', e1.nick_name, ')') ELSE SUBSTRING_INDEX(e1.full_name, ' ', 1) END as accounting_responsible_name,
        wa.tax_inspection_responsible,
        CASE WHEN e2.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e2.full_name, ' ', 1), '(', e2.nick_name, ')') ELSE SUBSTRING_INDEX(e2.full_name, ' ', 1) END as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        CASE WHEN e3.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e3.full_name, ' ', 1), '(', e3.nick_name, ')') ELSE SUBSTRING_INDEX(e3.full_name, ' ', 1) END as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        CASE WHEN e4.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e4.full_name, ' ', 1), '(', e4.nick_name, ')') ELSE SUBSTRING_INDEX(e4.full_name, ' ', 1) END as vat_filer_responsible_name,
        wa.document_entry_responsible,
        CASE WHEN e5.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e5.full_name, ' ', 1), '(', e5.nick_name, ')') ELSE SUBSTRING_INDEX(e5.full_name, ' ', 1) END as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      ${whereClause}
      ORDER BY wa.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?`,
          [...queryParams, limitNum, offset]
        )
        break // Success, exit retry loop
      } catch (dbError) {
        retries--
        if (dbError.code === 'ECONNRESET' && retries > 0) {
          // Wait 100ms before retry
          await new Promise((resolve) => setTimeout(resolve, 100))
          continue
        }
        // If not ECONNRESET or no retries left, throw error
        throw dbError
      }
    }

    // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
    const formattedAssignments = assignments.map((assignment) => ({
      ...assignment,
      assigned_at: formatDateForResponse(assignment.assigned_at),
      reset_completed_at: formatDateForResponse(assignment.reset_completed_at),
    }))

    res.json({
      success: true,
      data: formattedAssignments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get work assignments error:', error)

    // Handle specific database errors
    if (error.code === 'ECONNRESET') {
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again.',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})


/**
 * POST /api/work-assignments/bulk-by-builds
 * ดึงข้อมูลการจัดงานหลายรายการพร้อมกันตาม Build Codes, Year, Month (Bulk Query)
 * Access: All authenticated users
 * NOTE: This route must be defined BEFORE /:build/:year/:month route to avoid route conflicts
 * 
 * Request Body:
 * {
 *   builds: string[], // Array of build codes
 *   year: number,
 *   month: number
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: WorkAssignment[] // Array of work assignments (may be empty if no assignments found)
 * }
 */
router.post('/bulk-by-builds', authenticateToken, async (req, res) => {
  try {
    const { builds, year, month } = req.body

    // Validation
    if (!builds || !Array.isArray(builds) || builds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'builds must be a non-empty array',
      })
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required',
      })
    }

    const assignmentYear = parseInt(year)
    const assignmentMonth = parseInt(month)

    if (assignmentMonth < 1 || assignmentMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    // Limit builds array to prevent SQL injection and performance issues
    if (builds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 builds allowed per request',
      })
    }

    // Create placeholders for IN clause
    const placeholders = builds.map(() => '?').join(',')

    // Query multiple builds at once using IN clause
    const [assignments] = await pool.execute(
      `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        c.tax_registration_status,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        CASE WHEN e1.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e1.full_name, ' ', 1), '(', e1.nick_name, ')') ELSE SUBSTRING_INDEX(e1.full_name, ' ', 1) END as accounting_responsible_name,
        wa.tax_inspection_responsible,
        CASE WHEN e2.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e2.full_name, ' ', 1), '(', e2.nick_name, ')') ELSE SUBSTRING_INDEX(e2.full_name, ' ', 1) END as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        CASE WHEN e3.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e3.full_name, ' ', 1), '(', e3.nick_name, ')') ELSE SUBSTRING_INDEX(e3.full_name, ' ', 1) END as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        CASE WHEN e4.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e4.full_name, ' ', 1), '(', e4.nick_name, ')') ELSE SUBSTRING_INDEX(e4.full_name, ' ', 1) END as vat_filer_responsible_name,
        wa.document_entry_responsible,
        CASE WHEN e5.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e5.full_name, ' ', 1), '(', e5.nick_name, ')') ELSE SUBSTRING_INDEX(e5.full_name, ' ', 1) END as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.build IN (${placeholders}) 
        AND wa.assignment_year = ? 
        AND wa.assignment_month = ? 
        AND wa.deleted_at IS NULL`,
      [...builds, assignmentYear, assignmentMonth]
    )

    // Return assignments as array (may be empty if no assignments found)
    // This is normal - not all builds may have assignments for the given year/month
    res.json({
      success: true,
      data: assignments,
    })
  } catch (error) {
    console.error('Bulk get work assignments error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * POST /api/work-assignments/check-duplicates
 * ตรวจสอบข้อมูลซ้ำสำหรับหลาย Build codes ในเดือนภาษีเดียวกัน
 * Access: All authenticated users
 * 
 * Request Body:
 * {
 *   builds: string[], // Array of build codes
 *   year: number,
 *   month: number
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: WorkAssignment[] // Array of existing assignments (may be empty)
 * }
 */
router.post('/check-duplicates', authenticateToken, async (req, res) => {
  try {
    const { builds, year, month } = req.body

    // Validation
    if (!builds || !Array.isArray(builds) || builds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'builds must be a non-empty array',
      })
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required',
      })
    }

    const assignmentYear = parseInt(year)
    const assignmentMonth = parseInt(month)

    // Validate year range
    if (isNaN(assignmentYear) || assignmentYear < 2000 || assignmentYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year (must be between 2000-2100)',
      })
    }

    if (isNaN(assignmentMonth) || assignmentMonth < 1 || assignmentMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    // Limit builds array to prevent performance issues
    if (builds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 builds allowed per request',
      })
    }

    // Validate build codes
    if (builds.some((build) => typeof build !== 'string' || build.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'All build codes must be non-empty strings',
      })
    }

    // Remove duplicates from builds array
    const uniqueBuilds = [...new Set(builds)]
    if (uniqueBuilds.length !== builds.length) {
      console.warn(`Duplicate builds detected: ${builds.length - uniqueBuilds.length} duplicates removed`)
    }

    // Query multiple builds at once using IN clause
    const placeholders = uniqueBuilds.map(() => '?').join(',')
    let retries = 3
    let assignments

    while (retries > 0) {
      try {
        [assignments] = await pool.execute(
          `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        c.tax_registration_status,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        CASE WHEN e1.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e1.full_name, ' ', 1), '(', e1.nick_name, ')') ELSE SUBSTRING_INDEX(e1.full_name, ' ', 1) END as accounting_responsible_name,
        wa.tax_inspection_responsible,
        CASE WHEN e2.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e2.full_name, ' ', 1), '(', e2.nick_name, ')') ELSE SUBSTRING_INDEX(e2.full_name, ' ', 1) END as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        CASE WHEN e3.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e3.full_name, ' ', 1), '(', e3.nick_name, ')') ELSE SUBSTRING_INDEX(e3.full_name, ' ', 1) END as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        CASE WHEN e4.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e4.full_name, ' ', 1), '(', e4.nick_name, ')') ELSE SUBSTRING_INDEX(e4.full_name, ' ', 1) END as vat_filer_responsible_name,
        wa.document_entry_responsible,
        CASE WHEN e5.nick_name IS NOT NULL THEN CONCAT(SUBSTRING_INDEX(e5.full_name, ' ', 1), '(', e5.nick_name, ')') ELSE SUBSTRING_INDEX(e5.full_name, ' ', 1) END as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.build IN (${placeholders}) 
        AND wa.assignment_year = ? 
        AND wa.assignment_month = ? 
        AND wa.deleted_at IS NULL`,
          [...uniqueBuilds, assignmentYear, assignmentMonth]
        )
        break // Success, exit retry loop
      } catch (dbError) {
        retries--
        if (dbError.code === 'ECONNRESET' && retries > 0) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 100))
          continue
        }
        throw dbError // Re-throw if not retryable or max retries reached
      }
    }

    // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
    const formattedAssignments = (assignments || []).map((assignment) => ({
      ...assignment,
      assigned_at: formatDateForResponse(assignment.assigned_at),
      reset_completed_at: formatDateForResponse(assignment.reset_completed_at),
    }))

    res.json({
      success: true,
      data: formattedAssignments,
    })
  } catch (error) {
    console.error('Check duplicates error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * GET /api/work-assignments/:build/:year/:month
 * ดึงข้อมูลการจัดงานตาม Build, Year, Month
 * Access: All authenticated users
 * NOTE: This route must be defined BEFORE /:id route to avoid route conflicts
 */
router.get('/:build/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { build, year, month } = req.params
    const assignmentYear = parseInt(year)
    const assignmentMonth = parseInt(month)

    if (assignmentMonth < 1 || assignmentMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    const [assignments] = await pool.execute(
      `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        wa.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        e3.full_name as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        e4.full_name as vat_filer_responsible_name,
        wa.document_entry_responsible,
        e5.full_name as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.build = ? AND wa.assignment_year = ? AND wa.assignment_month = ? AND wa.deleted_at IS NULL`,
      [build, assignmentYear, assignmentMonth]
    )

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    res.json({
      success: true,
      data: assignments[0],
    })
  } catch (error) {
    console.error('Get work assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/work-assignments/:id
 * ดึงข้อมูลการจัดงานตาม ID
 * Access: All authenticated users
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const [assignments] = await pool.execute(
      `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        wa.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        e3.full_name as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        e4.full_name as vat_filer_responsible_name,
        wa.document_entry_responsible,
        e5.full_name as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.id = ? AND wa.deleted_at IS NULL`,
      [id]
    )

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    res.json({
      success: true,
      data: assignments[0],
    })
  } catch (error) {
    console.error('Get work assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/work-assignments/bulk-create
 * สร้างการจัดงานหลายรายการพร้อมกัน (Background Job)
 * Access: Admin/HR only
 * 
 * Request Body:
 * {
 *   assignments: [
 *     {
 *       build: string,
 *       assignment_year: number,
 *       assignment_month: number,
 *       accounting_responsible?: string,
 *       tax_inspection_responsible?: string,
 *       wht_filer_responsible?: string,
 *       vat_filer_responsible?: string,
 *       document_entry_responsible?: string,
 *       assignment_note?: string
 *     },
 *     ...
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   jobId: string, // Job ID for polling status
 *   message: string
 * }
 */
router.post('/bulk-create', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { assignments } = req.body

    // Validation
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'assignments must be a non-empty array',
      })
    }

    // Limit assignments array to prevent performance issues
    if (assignments.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 assignments allowed per request',
      })
    }

    // Validate each assignment
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]
      if (!assignment.build || !assignment.assignment_year || !assignment.assignment_month) {
        return res.status(400).json({
          success: false,
          message: `Assignment at index ${i} is missing required fields (build, assignment_year, assignment_month)`,
        })
      }

      const month = parseInt(assignment.assignment_month)
      if (month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: `Assignment at index ${i} has invalid month (must be 1-12)`,
        })
      }
    }

    // Create background job
    const jobId = addJob(
      'bulk-assignment',
      {
        assignments,
        userId: req.user.id,
      },
      async (data, updateProgress) => {
        const { assignments, userId } = data
        const results = {
          success: 0,
          failed: 0,
          errors: [],
        }

        for (let i = 0; i < assignments.length; i++) {
          const assignment = assignments[i]
          updateProgress(i + 1, assignments.length)

          try {
            const build = assignment.build
            const year = parseInt(assignment.assignment_year)
            const month = parseInt(assignment.assignment_month)

            // ✅ FIX: Sanitize employee IDs - convert empty strings/whitespace to null
            const sanitize = (value) => {
              if (!value || (typeof value === 'string' && value.trim() === '')) return null
              return String(value).trim()
            }

            const acct = sanitize(assignment.accounting_responsible)
            const taxInsp = sanitize(assignment.tax_inspection_responsible)
            const whtFiler = sanitize(assignment.wht_filer_responsible)
            const vatFiler = sanitize(assignment.vat_filer_responsible)
            const docEntry = sanitize(assignment.document_entry_responsible)

            // Check if client exists
            const [clients] = await pool.execute(
              'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
              [build]
            )

            if (clients.length === 0) {
              results.failed++
              results.errors.push({
                build,
                error: 'Client not found',
              })
              continue
            }

            // ✅ FIX: Validate employee IDs exist in employees table
            const empFieldsToCheck = [
              { name: 'accounting_responsible', value: acct },
              { name: 'tax_inspection_responsible', value: taxInsp },
              { name: 'wht_filer_responsible', value: whtFiler },
              { name: 'vat_filer_responsible', value: vatFiler },
              { name: 'document_entry_responsible', value: docEntry },
            ]

            let hasInvalidEmployee = false
            for (const field of empFieldsToCheck) {
              if (field.value) {
                const [empCheck] = await pool.execute(
                  'SELECT employee_id FROM employees WHERE employee_id = ?',
                  [field.value]
                )
                if (empCheck.length === 0) {
                  results.failed++
                  results.errors.push({
                    build,
                    error: `ไม่พบพนักงาน ${field.name}=${field.value} ในระบบ`,
                  })
                  hasInvalidEmployee = true
                  break
                }
              }
            }

            if (hasInvalidEmployee) continue

            // Check if assignment already exists
            const [existingAssignments] = await pool.execute(
              'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
              [build, year, month]
            )

            if (existingAssignments.length > 0) {
              results.failed++
              results.errors.push({
                build,
                error: 'Work assignment already exists for this month',
              })
              continue
            }

            const id = generateUUID()
            const assignedAt = new Date()

            // Create work assignment
            // Set original_* and current_* to the assigned values when creating new assignment
            await pool.execute(
              `INSERT INTO work_assignments (
                id, build, assignment_year, assignment_month,
                accounting_responsible, original_accounting_responsible, current_accounting_responsible,
                tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
                wht_filer_responsible, original_wht_filer_responsible, current_wht_filer_responsible,
                vat_filer_responsible, original_vat_filer_responsible, current_vat_filer_responsible,
                document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
                assigned_by, assigned_at, assignment_note
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                build,
                year,
                month,
                acct,
                acct, // original_accounting_responsible
                acct, // current_accounting_responsible
                taxInsp,
                taxInsp, // original_tax_inspection_responsible
                taxInsp, // current_tax_inspection_responsible
                whtFiler,
                whtFiler, // original_wht_filer_responsible
                whtFiler, // current_wht_filer_responsible
                vatFiler,
                vatFiler, // original_vat_filer_responsible
                vatFiler, // current_vat_filer_responsible
                docEntry,
                docEntry, // original_document_entry_responsible
                docEntry, // current_document_entry_responsible
                userId,
                assignedAt,
                assignment.assignment_note || null,
              ]
            )

            // Reset monthly data
            try {
              await resetMonthlyData(build, year, month, {
                accounting_responsible: assignment.accounting_responsible,
                tax_inspection_responsible: assignment.tax_inspection_responsible,
                wht_filer_responsible: assignment.wht_filer_responsible,
                vat_filer_responsible: assignment.vat_filer_responsible,
                document_entry_responsible: assignment.document_entry_responsible,
              })

              // Update reset status
              await pool.execute(
                'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
              )
            } catch (resetError) {
              console.error(`Reset monthly data error for build ${build}:`, resetError)
              // Continue processing other assignments
            }

            results.success++
          } catch (error) {
            results.failed++
            results.errors.push({
              build: assignment.build,
              error: error.message || 'Unknown error',
            })
          }
        }

        // Invalidate cache after all assignments are created
        invalidateCache('GET:/api/work-assignments')

        return results
      }
    )

    res.status(202).json({
      success: true,
      jobId,
      message: 'Bulk assignment creation job started',
    })
  } catch (error) {
    console.error('Bulk create work assignments error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * GET /api/work-assignments/bulk-create/:jobId
 * ตรวจสอบสถานะของ bulk assignment creation job
 * Access: Admin/HR only
 * 
 * Response:
 * {
 *   success: boolean,
 *   job: {
 *     id: string,
 *     status: 'pending' | 'processing' | 'completed' | 'failed',
 *     progress: number,
 *     total: number,
 *     result?: object,
 *     error?: object,
 *     createdAt: string,
 *     startedAt?: string,
 *     completedAt?: string
 *   }
 * }
 */
router.get('/bulk-create/:jobId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { jobId } = req.params

    const job = getJob(jobId)

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      })
    }

    // Format job response (exclude processor function)
    const jobResponse = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      total: job.total,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    }

    res.json({
      success: true,
      job: jobResponse,
    })
  } catch (error) {
    console.error('Get bulk create job status error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/work-assignments
 * สร้างการจัดงานใหม่ (พร้อมรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work อัตโนมัติ)
 * Access: Admin/HR only
 */
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const {
      build,
      assignment_year,
      assignment_month,
      assignment_note,
    } = req.body

    // ✅ FIX: Sanitize employee IDs - convert empty strings/whitespace to null
    const sanitizeEmployeeId = (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return null
      return String(value).trim()
    }

    const accounting_responsible = sanitizeEmployeeId(req.body.accounting_responsible)
    const tax_inspection_responsible = sanitizeEmployeeId(req.body.tax_inspection_responsible)
    const wht_filer_responsible = sanitizeEmployeeId(req.body.wht_filer_responsible)
    const vat_filer_responsible = sanitizeEmployeeId(req.body.vat_filer_responsible)
    const document_entry_responsible = sanitizeEmployeeId(req.body.document_entry_responsible)

    // Validation
    if (!build || !assignment_year || !assignment_month) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          build: !build ? 'Required' : undefined,
          assignment_year: !assignment_year ? 'Required' : undefined,
          assignment_month: !assignment_month ? 'Required' : undefined,
        },
      })
    }

    const year = parseInt(assignment_year)
    const month = parseInt(assignment_month)

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    // Check if client exists
    const [clients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    // ✅ FIX: Validate employee IDs exist in employees table before INSERT
    const employeeFields = [
      { name: 'accounting_responsible', value: accounting_responsible },
      { name: 'tax_inspection_responsible', value: tax_inspection_responsible },
      { name: 'wht_filer_responsible', value: wht_filer_responsible },
      { name: 'vat_filer_responsible', value: vat_filer_responsible },
      { name: 'document_entry_responsible', value: document_entry_responsible },
    ]

    const invalidEmployees = []
    for (const field of employeeFields) {
      if (field.value) {
        const [empRows] = await pool.execute(
          'SELECT employee_id, full_name FROM employees WHERE employee_id = ?',
          [field.value]
        )
        if (empRows.length === 0) {
          invalidEmployees.push({
            field: field.name,
            employee_id: field.value,
          })
        }
      }
    }

    if (invalidEmployees.length > 0) {
      console.error('Invalid employee IDs found:', invalidEmployees)
      return res.status(400).json({
        success: false,
        message: `ไม่พบพนักงานในระบบ: ${invalidEmployees.map(e => `${e.field}=${e.employee_id}`).join(', ')}`,
        invalidEmployees,
      })
    }

    // Check if assignment already exists
    const [existingAssignments] = await pool.execute(
      'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    if (existingAssignments.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Work assignment already exists for this month',
      })
    }

    const id = generateUUID()
    const assignedBy = req.user.id
    const assignedAt = new Date()

    // Create work assignment
    // Set original_* and current_* to the assigned values when creating new assignment
    // ✅ FIX: Values are already sanitized above (empty strings → null)
    console.log('Creating work assignment with employee IDs:', {
      build, year, month,
      accounting_responsible,
      tax_inspection_responsible,
      wht_filer_responsible,
      vat_filer_responsible,
      document_entry_responsible,
    })

    await pool.execute(
      `INSERT INTO work_assignments (
        id, build, assignment_year, assignment_month,
        accounting_responsible, original_accounting_responsible, current_accounting_responsible,
        tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
        wht_filer_responsible, original_wht_filer_responsible, current_wht_filer_responsible,
        vat_filer_responsible, original_vat_filer_responsible, current_vat_filer_responsible,
        document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
        assigned_by, assigned_at, assignment_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        build,
        year,
        month,
        accounting_responsible,
        accounting_responsible, // original_accounting_responsible
        accounting_responsible, // current_accounting_responsible
        tax_inspection_responsible,
        tax_inspection_responsible, // original_tax_inspection_responsible
        tax_inspection_responsible, // current_tax_inspection_responsible
        wht_filer_responsible,
        wht_filer_responsible, // original_wht_filer_responsible
        wht_filer_responsible, // current_wht_filer_responsible
        vat_filer_responsible,
        vat_filer_responsible, // original_vat_filer_responsible
        vat_filer_responsible, // current_vat_filer_responsible
        document_entry_responsible,
        document_entry_responsible, // original_document_entry_responsible
        document_entry_responsible, // current_document_entry_responsible
        assignedBy,
        assignedAt,
        assignment_note || null,
      ]
    )

    // รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
    try {
      await resetMonthlyData(build, year, month, {
        accounting_responsible,
        tax_inspection_responsible,
        wht_filer_responsible,
        vat_filer_responsible,
        document_entry_responsible,
      })

      // อัพเดทสถานะการรีเซ็ต
      await pool.execute(
        'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      )
    } catch (resetError) {
      console.error('Reset monthly data error:', resetError)
      // ไม่ throw error เพื่อให้การสร้าง work assignment สำเร็จ แต่บันทึก error ไว้
      // Frontend สามารถเรียก reset-data endpoint แยกได้
    }

    // Get created assignment
    const [newAssignments] = await pool.execute(
      `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        c.tax_registration_status,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        wa.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        e3.full_name as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        e4.full_name as vat_filer_responsible_name,
        wa.document_entry_responsible,
        e5.full_name as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.id = ?`,
      [id]
    )

    // Invalidate cache for work assignments list
    invalidateCache('GET:/api/work-assignments')

    res.status(201).json({
      success: true,
      message: 'Work assignment created successfully',
      data: newAssignments[0],
    })
  } catch (error) {
    console.error('Create work assignment error:', error)
    // ✅ FIX: Log full error details for debugging
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      requestBody: req.body,
    })

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Work assignment already exists for this month',
      })
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: `ข้อมูลพนักงานไม่ถูกต้อง: ${error.sqlMessage}`,
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/work-assignments/:id
 * แก้ไขการจัดงาน (พร้อมรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work อัตโนมัติ)
 * Access: Admin/HR only
 */
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { assignment_note, is_active } = req.body

    // ✅ FIX: Sanitize employee IDs - convert empty strings/whitespace to null
    const sanitizeEmployeeId = (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return null
      return String(value).trim()
    }

    const accounting_responsible = sanitizeEmployeeId(req.body.accounting_responsible)
    const tax_inspection_responsible = sanitizeEmployeeId(req.body.tax_inspection_responsible)
    const wht_filer_responsible = sanitizeEmployeeId(req.body.wht_filer_responsible)
    const vat_filer_responsible = sanitizeEmployeeId(req.body.vat_filer_responsible)
    const document_entry_responsible = sanitizeEmployeeId(req.body.document_entry_responsible)

    // Check if assignment exists
    const [existingAssignments] = await pool.execute(
      'SELECT build, assignment_year, assignment_month FROM work_assignments WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existingAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    const assignment = existingAssignments[0]

    // ✅ FIX: Validate employee IDs exist in employees table before UPDATE
    const employeeFields = [
      { name: 'accounting_responsible', value: accounting_responsible },
      { name: 'tax_inspection_responsible', value: tax_inspection_responsible },
      { name: 'wht_filer_responsible', value: wht_filer_responsible },
      { name: 'vat_filer_responsible', value: vat_filer_responsible },
      { name: 'document_entry_responsible', value: document_entry_responsible },
    ]

    const invalidEmployees = []
    for (const field of employeeFields) {
      if (field.value) {
        const [empRows] = await pool.execute(
          'SELECT employee_id, full_name FROM employees WHERE employee_id = ?',
          [field.value]
        )
        if (empRows.length === 0) {
          invalidEmployees.push({
            field: field.name,
            employee_id: field.value,
          })
        }
      }
    }

    if (invalidEmployees.length > 0) {
      console.error('Invalid employee IDs found (update):', invalidEmployees)
      return res.status(400).json({
        success: false,
        message: `ไม่พบพนักงานในระบบ: ${invalidEmployees.map(e => `${e.field}=${e.employee_id}`).join(', ')}`,
        invalidEmployees,
      })
    }

    // Update work assignment
    await pool.execute(
      `UPDATE work_assignments SET
        accounting_responsible = ?,
        tax_inspection_responsible = ?,
        wht_filer_responsible = ?,
        vat_filer_responsible = ?,
        document_entry_responsible = ?,
        assignment_note = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        accounting_responsible,
        tax_inspection_responsible,
        wht_filer_responsible,
        vat_filer_responsible,
        document_entry_responsible,
        assignment_note || null,
        is_active !== undefined ? is_active : true,
        id,
      ]
    )

    // รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
    try {
      await resetMonthlyData(assignment.build, assignment.assignment_year, assignment.assignment_month, {
        accounting_responsible,
        tax_inspection_responsible,
        wht_filer_responsible,
        vat_filer_responsible,
        document_entry_responsible,
      })

      // อัพเดทสถานะการรีเซ็ต
      await pool.execute(
        'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      )
    } catch (resetError) {
      console.error('Reset monthly data error:', resetError)
      // ไม่ throw error เพื่อให้การอัพเดท work assignment สำเร็จ
    }

    // Get updated assignment
    const [updatedAssignments] = await pool.execute(
      `SELECT 
        wa.id,
        wa.build,
        c.company_name,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        wa.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        wa.wht_filer_responsible,
        e3.full_name as wht_filer_responsible_name,
        wa.vat_filer_responsible,
        e4.full_name as vat_filer_responsible_name,
        wa.document_entry_responsible,
        e5.full_name as document_entry_responsible_name,
        wa.assigned_by,
        u.name as assigned_by_name,
        wa.assigned_at,
        wa.assignment_note,
        wa.is_active,
        wa.is_reset_completed,
        wa.reset_completed_at,
        wa.created_at,
        wa.updated_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build
      LEFT JOIN employees e1 ON wa.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON wa.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON wa.wht_filer_responsible = e3.employee_id
      LEFT JOIN employees e4 ON wa.vat_filer_responsible = e4.employee_id
      LEFT JOIN employees e5 ON wa.document_entry_responsible = e5.employee_id
      LEFT JOIN users u ON wa.assigned_by = u.id
      WHERE wa.id = ?`,
      [id]
    )

    // Invalidate cache for work assignments list
    invalidateCache('GET:/api/work-assignments')

    res.json({
      success: true,
      message: 'Work assignment updated successfully',
      data: updatedAssignments[0],
    })
  } catch (error) {
    console.error('Update work assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/work-assignments/:id/reset-data
 * รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work สำหรับการจัดงานนี้ (Manual Reset)
 * Access: Admin/HR only
 */
router.post('/:id/reset-data', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params

    // Get assignment
    const [assignments] = await pool.execute(
      'SELECT build, assignment_year, assignment_month, accounting_responsible, tax_inspection_responsible, wht_filer_responsible, vat_filer_responsible, document_entry_responsible FROM work_assignments WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    const assignment = assignments[0]

    // รีเซ็ตข้อมูล
    await resetMonthlyData(
      assignment.build,
      assignment.assignment_year,
      assignment.assignment_month,
      {
        accounting_responsible: assignment.accounting_responsible,
        tax_inspection_responsible: assignment.tax_inspection_responsible,
        wht_filer_responsible: assignment.wht_filer_responsible,
        vat_filer_responsible: assignment.vat_filer_responsible,
        document_entry_responsible: assignment.document_entry_responsible,
      }
    )

    // อัพเดทสถานะการรีเซ็ต
    await pool.execute(
      'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )

    // Invalidate cache for work assignments list
    invalidateCache('GET:/api/work-assignments')

    res.json({
      success: true,
      message: 'Monthly data reset successfully',
    })
  } catch (error) {
    console.error('Reset monthly data error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * Helper function to pad Build Code with leading zeros
 * @param {string|number} value - Build Code value from Excel
 * @returns {string} - Padded Build Code
 */
function padBuildCode(value) {
  if (!value && value !== 0) return ''
  const str = String(value).trim()
  // If it contains decimal point or other non-digit characters, don't pad
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to minimum 3 digits for pure numbers
  return str.padStart(3, '0')
}

/**
 * POST /api/work-assignments/import/validate
 * Validate Excel file before import
 * Access: Admin only
 */
router.post(
  '/import/validate',
  authenticateToken,
  authorize('admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required',
        })
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null })

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty',
        })
      }

      const validationResults = {
        total: data.length,
        valid: 0,
        invalid: 0,
        errors: [],
        warnings: [],
      }

      // Track duplicate build+year+month combinations within the file
      const assignmentMap = new Map() // "build-year-month" -> [row numbers]

      // First pass: collect all assignments to detect duplicates
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const year = row['ปีภาษี'] || row['assignment_year']
        const month = row['เดือนภาษี'] || row['assignment_month']

        if (build && year && month) {
          const key = `${build}-${year}-${month}`
          if (!assignmentMap.has(key)) {
            assignmentMap.set(key, [])
          }
          assignmentMap.get(key).push(rowNumber)
        }
      }

      // Check for duplicates within file
      assignmentMap.forEach((rows, key) => {
        if (rows.length > 1) {
          const [build, year, month] = key.split('-')
          validationResults.warnings.push({
            row: rows[0],
            build: build,
            warnings: [`การจัดงานซ้ำกันในไฟล์ (Build: ${build}, ปี: ${year}, เดือน: ${month}, พบ ${rows.length} แถว)`],
          })
        }
      })

      // Second pass: validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const yearRaw = row['ปีภาษี'] || row['assignment_year']
        const year = yearRaw ? parseInt(String(yearRaw), 10) : null
        const monthRaw = row['เดือนภาษี'] || row['assignment_month']
        const month = monthRaw ? parseInt(String(monthRaw), 10) : null

        const accountingResponsible = row['ผู้ทำบัญชี (รหัสพนักงาน)'] || row['accounting_responsible'] || null
        const taxInspectionResponsible = row['ผู้ตรวจภาษี (รหัสพนักงาน)'] || row['tax_inspection_responsible'] || null
        const whtFilerResponsible = row['ผู้ยื่น WHT (รหัสพนักงาน)'] || row['wht_filer_responsible'] || null
        const vatFilerResponsible = row['ผู้ยื่น VAT (รหัสพนักงาน)'] || row['vat_filer_responsible'] || null
        const documentEntryResponsible = row['ผู้คีย์เอกสาร (รหัสพนักงาน)'] || row['document_entry_responsible'] || null

        const missingFields = []
        const errors = []
        const warnings = []

        // Required fields validation
        if (!build) {
          missingFields.push('Build Code')
        } else if (build.length < 3) {
          errors.push('Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก')
        }

        if (!year || isNaN(year) || year < 2000 || year > 2100) {
          missingFields.push('ปีภาษี')
          if (yearRaw && (isNaN(year) || year < 2000 || year > 2100)) {
            errors.push('ปีภาษีต้องเป็นตัวเลขระหว่าง 2000-2100')
          }
        }

        if (!month || isNaN(month) || month < 1 || month > 12) {
          missingFields.push('เดือนภาษี')
          if (monthRaw && (isNaN(month) || month < 1 || month > 12)) {
            errors.push('เดือนภาษีต้องเป็นตัวเลขระหว่าง 1-12')
          }
        }

        // Check if build exists in database
        if (build && build.length >= 3) {
          try {
            const [existing] = await pool.execute(
              'SELECT build, company_name FROM clients WHERE build = ? AND deleted_at IS NULL',
              [build]
            )
            if (existing.length === 0) {
              errors.push(`Build Code "${build}" ไม่มีอยู่ในระบบ`)
            }
          } catch (error) {
            // Ignore database errors during validation
          }
        }

        // Check if employee IDs exist (for warnings only)
        const employeeIds = [
          { field: 'accounting_responsible', value: accountingResponsible, name: 'ผู้ทำบัญชี' },
          { field: 'tax_inspection_responsible', value: taxInspectionResponsible, name: 'ผู้ตรวจภาษี' },
          { field: 'wht_filer_responsible', value: whtFilerResponsible, name: 'ผู้ยื่น WHT' },
          { field: 'vat_filer_responsible', value: vatFilerResponsible, name: 'ผู้ยื่น VAT' },
          { field: 'document_entry_responsible', value: documentEntryResponsible, name: 'ผู้คีย์เอกสาร' },
        ]

        for (const { value, name } of employeeIds) {
          if (value) {
            try {
              const [existing] = await pool.execute(
                'SELECT employee_id FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
                [value]
              )
              if (existing.length === 0) {
                warnings.push(`รหัสพนักงาน "${value}" สำหรับ${name} ไม่มีอยู่ในระบบ`)
              }
            } catch (error) {
              // Ignore database errors during validation
            }
          }
        }

        // Check if assignment already exists in database
        if (build && year && month && !isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
          try {
            const [existing] = await pool.execute(
              'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
              [build, year, month]
            )
            if (existing.length > 0) {
              warnings.push(`การจัดงานนี้มีอยู่ในระบบแล้ว (Build: ${build}, ปี: ${year}, เดือน: ${month}) ระบบจะอัพเดทข้อมูลเดิม`)
            }
          } catch (error) {
            // Ignore database errors during validation
          }
        }

        if (missingFields.length > 0 || errors.length > 0) {
          validationResults.invalid++
          validationResults.errors.push({
            row: rowNumber,
            build: build || '',
            missingFields,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
          })
        } else {
          validationResults.valid++
          if (warnings.length > 0) {
            validationResults.warnings.push({
              row: rowNumber,
              build: build || '',
              warnings,
            })
          }
        }
      }

      res.json({
        success: true,
        data: validationResults,
      })
    } catch (error) {
      console.error('Work assignment import validation error:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating file',
        error: error.message,
      })
    }
  }
)

/**
 * POST /api/work-assignments/import
 * Import work assignments from Excel file
 * Access: Admin only
 */
router.post(
  '/import',
  authenticateToken,
  authorize('admin'),
  upload.single('file'),
  async (req, res) => {
    const connection = await pool.getConnection()

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required',
        })
      }

      const userId = req.user.id

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null })

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty',
        })
      }

      await connection.beginTransaction()

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        updated: 0,
        errors: [],
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        try {
          const buildRaw = row['Build Code'] || row['build'] || ''
          const build = padBuildCode(buildRaw)
          const yearRaw = row['ปีภาษี'] || row['assignment_year']
          const year = yearRaw ? parseInt(String(yearRaw), 10) : null
          const monthRaw = row['เดือนภาษี'] || row['assignment_month']
          const month = monthRaw ? parseInt(String(monthRaw), 10) : null

          const accountingResponsible = row['ผู้ทำบัญชี (รหัสพนักงาน)'] || row['accounting_responsible'] || null
          const taxInspectionResponsible = row['ผู้ตรวจภาษี (รหัสพนักงาน)'] || row['tax_inspection_responsible'] || null
          const whtFilerResponsible = row['ผู้ยื่น WHT (รหัสพนักงาน)'] || row['wht_filer_responsible'] || null
          const vatFilerResponsible = row['ผู้ยื่น VAT (รหัสพนักงาน)'] || row['vat_filer_responsible'] || null
          const documentEntryResponsible = row['ผู้คีย์เอกสาร (รหัสพนักงาน)'] || row['document_entry_responsible'] || null
          const assignmentNote = row['หมายเหตุ'] || row['assignment_note'] || null

          // Validation
          if (!build || build.length < 3) {
            throw new Error('Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก')
          }

          if (!year || isNaN(year) || year < 2000 || year > 2100) {
            throw new Error('ปีภาษีต้องเป็นตัวเลขระหว่าง 2000-2100')
          }

          if (!month || isNaN(month) || month < 1 || month > 12) {
            throw new Error('เดือนภาษีต้องเป็นตัวเลขระหว่าง 1-12')
          }

          // Check if build exists
          const [buildCheck] = await connection.execute(
            'SELECT build FROM clients WHERE build = ? AND deleted_at IS NULL',
            [build]
          )
          if (buildCheck.length === 0) {
            throw new Error(`Build Code "${build}" ไม่มีอยู่ในระบบ`)
          }

          // Check if assignment already exists
          const [existing] = await connection.execute(
            'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
            [build, year, month]
          )

          const assignmentData = {
            build,
            assignment_year: year,
            assignment_month: month,
            accounting_responsible: accountingResponsible || null,
            tax_inspection_responsible: taxInspectionResponsible || null,
            wht_filer_responsible: whtFilerResponsible || null,
            vat_filer_responsible: vatFilerResponsible || null,
            document_entry_responsible: documentEntryResponsible || null,
            assigned_by: userId,
            assigned_at: new Date(),
            assignment_note: assignmentNote || null,
          }

          if (existing.length > 0) {
            // Update existing assignment
            const assignmentId = existing[0].id
            await connection.execute(
              `UPDATE work_assignments SET
                accounting_responsible = ?,
                tax_inspection_responsible = ?,
                wht_filer_responsible = ?,
                vat_filer_responsible = ?,
                document_entry_responsible = ?,
                assignment_note = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
              [
                assignmentData.accounting_responsible,
                assignmentData.tax_inspection_responsible,
                assignmentData.wht_filer_responsible,
                assignmentData.vat_filer_responsible,
                assignmentData.document_entry_responsible,
                assignmentData.assignment_note,
                assignmentId,
              ]
            )

            // Reset monthly data
            await resetMonthlyData(build, year, month, assignmentData)

            // อัพเดทสถานะการรีเซ็ตหลังจาก resetMonthlyData เสร็จแล้ว
            await connection.execute(
              'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
              [assignmentId]
            )

            results.success++
            results.updated++
          } else {
            // Create new assignment
            // Set original_* and current_* to the assigned values when creating new assignment
            const assignmentId = generateUUID()
            await connection.execute(
              `INSERT INTO work_assignments (
                id, build, assignment_year, assignment_month,
                accounting_responsible, original_accounting_responsible, current_accounting_responsible,
                tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
                wht_filer_responsible, original_wht_filer_responsible, current_wht_filer_responsible,
                vat_filer_responsible, original_vat_filer_responsible, current_vat_filer_responsible,
                document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
                assigned_by, assigned_at, assignment_note, is_reset_completed
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
              [
                assignmentId,
                assignmentData.build,
                assignmentData.assignment_year,
                assignmentData.assignment_month,
                assignmentData.accounting_responsible,
                assignmentData.accounting_responsible, // original_accounting_responsible
                assignmentData.accounting_responsible, // current_accounting_responsible
                assignmentData.tax_inspection_responsible,
                assignmentData.tax_inspection_responsible, // original_tax_inspection_responsible
                assignmentData.tax_inspection_responsible, // current_tax_inspection_responsible
                assignmentData.wht_filer_responsible,
                assignmentData.wht_filer_responsible, // original_wht_filer_responsible
                assignmentData.wht_filer_responsible, // current_wht_filer_responsible
                assignmentData.vat_filer_responsible,
                assignmentData.vat_filer_responsible, // original_vat_filer_responsible
                assignmentData.vat_filer_responsible, // current_vat_filer_responsible
                assignmentData.document_entry_responsible,
                assignmentData.document_entry_responsible, // original_document_entry_responsible
                assignmentData.document_entry_responsible, // current_document_entry_responsible
                assignmentData.assigned_by,
                assignmentData.assigned_at,
                assignmentData.assignment_note,
              ]
            )

            // Reset monthly data
            await resetMonthlyData(build, year, month, assignmentData)

            // อัพเดทสถานะการรีเซ็ตหลังจาก resetMonthlyData เสร็จแล้ว
            await connection.execute(
              'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
              [assignmentId]
            )

            results.success++
          }
        } catch (error) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            build: row['Build Code'] || row['build'] || '',
            error: error.message,
          })
        }
      }

      await connection.commit()

      // Invalidate cache
      invalidateCache('GET:/api/work-assignments')

      res.json({
        success: true,
        message: 'Work assignments imported successfully',
        data: results,
      })
    } catch (error) {
      await connection.rollback()
      console.error('Work assignment import error:', error)
      res.status(500).json({
        success: false,
        message: 'Error importing work assignments',
        error: error.message,
      })
    } finally {
      connection.release()
    }
  }
)

export default router
