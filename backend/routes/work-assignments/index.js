/**
 * Work Assignments Routes
 * Routes สำหรับการจัดการการจัดงานรายเดือน (Workflow System)
 *
 * Refactored: แยก helpers/import ออกเป็นไฟล์ย่อย
 * - helpers.js: resetMonthlyData, padBuildCode
 * - import.js: /import/validate, /import
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'
import { invalidateCache } from '../../middleware/cache.js'
import { addJob, getJob, JOB_STATUS } from '../../services/queueService.js'
import { formatDateForResponse } from '../../utils/dateFormatter.js'

import importRouter from './import.js'
import { resetMonthlyData } from './helpers.js'

const router = express.Router()

// Mount sub-router (import routes before /:id param routes)
router.use('/', importRouter)


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
router.post('/bulk-create', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
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
        invalidateCache('GET:/work-assignments')

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
router.get('/bulk-create/:jobId', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
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
router.post('/', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
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
    invalidateCache('GET:/work-assignments')

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
router.put('/:id', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
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
    invalidateCache('GET:/work-assignments')

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
router.post('/:id/reset-data', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
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
    invalidateCache('GET:/work-assignments')

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

router.post('/:id/change-responsible', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params
    const { role_type, new_employee_id, change_reason } = req.body

    // Validation
    const validRoleTypes = ['accounting', 'tax_inspection', 'wht_filer', 'vat_filer', 'document_entry']
    if (!role_type || !validRoleTypes.includes(role_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role_type. Must be one of: ${validRoleTypes.join(', ')}`,
      })
    }

    if (!new_employee_id || (typeof new_employee_id === 'string' && new_employee_id.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'new_employee_id is required',
      })
    }

    // 1. Check if the work assignment exists
    const [assignmentRows] = await connection.execute(
      `SELECT wa.*, c.company_name
       FROM work_assignments wa
       LEFT JOIN clients c ON wa.build = c.build
       WHERE wa.id = ? AND wa.deleted_at IS NULL`,
      [id]
    )

    if (assignmentRows.length === 0) {
      connection.release()
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    const assignment = assignmentRows[0]

    // 2. Validate new_employee_id exists in employees table
    const [empRows] = await connection.execute(
      'SELECT employee_id, full_name, nick_name FROM employees WHERE employee_id = ?',
      [new_employee_id.trim()]
    )

    if (empRows.length === 0) {
      connection.release()
      return res.status(400).json({
        success: false,
        message: `ไม่พบพนักงาน employee_id: ${new_employee_id}`,
      })
    }

    const newEmployee = empRows[0]

    // 3. Map role_type to field names
    // ⚠️ Field names differ between work_assignments and monthly_tax_data
    const fieldMapping = {
      accounting: {
        wa_main: 'accounting_responsible',
        wa_current: 'current_accounting_responsible',
        mtd_main: 'accounting_responsible',
        mtd_current: 'current_accounting_responsible',
      },
      tax_inspection: {
        wa_main: 'tax_inspection_responsible',
        wa_current: 'current_tax_inspection_responsible',
        mtd_main: 'tax_inspection_responsible',
        mtd_current: 'current_tax_inspection_responsible',
      },
      wht_filer: {
        wa_main: 'wht_filer_responsible',
        wa_current: 'current_wht_filer_responsible',
        mtd_main: 'wht_filer_employee_id',
        mtd_current: 'wht_filer_current_employee_id',
      },
      vat_filer: {
        wa_main: 'vat_filer_responsible',
        wa_current: 'current_vat_filer_responsible',
        mtd_main: 'vat_filer_employee_id',
        mtd_current: 'vat_filer_current_employee_id',
      },
      document_entry: {
        wa_main: 'document_entry_responsible',
        wa_current: 'current_document_entry_responsible',
        mtd_main: 'document_entry_responsible',
        mtd_current: 'current_document_entry_responsible',
      },
    }

    const fields = fieldMapping[role_type]
    const previousEmployeeId = assignment[fields.wa_main] || null

    // 4. Check if new employee is the same as current
    if (previousEmployeeId === new_employee_id.trim()) {
      connection.release()
      return res.status(400).json({
        success: false,
        message: 'ผู้รับผิดชอบใหม่เป็นคนเดียวกับผู้รับผิดชอบปัจจุบัน',
      })
    }

    // 5. Begin transaction
    await connection.beginTransaction()

    // 6. Insert change history record
    const historyId = generateUUID()
    await connection.execute(
      `INSERT INTO responsibility_change_history (
        id, work_assignment_id, build, assignment_year, assignment_month,
        role_type, previous_employee_id, new_employee_id,
        changed_by, change_reason, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        historyId,
        id,
        assignment.build,
        assignment.assignment_year,
        assignment.assignment_month,
        role_type,
        previousEmployeeId,
        new_employee_id.trim(),
        req.user.id,
        change_reason || null,
      ]
    )

    // 7. Update work_assignments: set main field and current field
    // original_* is NOT changed (preserves the original assignment)
    await connection.execute(
      `UPDATE work_assignments 
       SET ${fields.wa_main} = ?, ${fields.wa_current} = ?, updated_at = NOW()
       WHERE id = ?`,
      [new_employee_id.trim(), new_employee_id.trim(), id]
    )

    // 8. Update monthly_tax_data: sync the same change
    await connection.execute(
      `UPDATE monthly_tax_data 
       SET ${fields.mtd_main} = ?, ${fields.mtd_current} = ?, updated_at = NOW()
       WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL`,
      [
        new_employee_id.trim(),
        new_employee_id.trim(),
        assignment.build,
        assignment.assignment_year,
        assignment.assignment_month,
      ]
    )

    // 9. Commit transaction
    await connection.commit()

    // 10. Invalidate cache
    invalidateCache('GET:/work-assignments')

    // 11. Get previous employee name for response
    let previousEmployeeName = null
    if (previousEmployeeId) {
      const [prevEmpRows] = await pool.execute(
        'SELECT full_name, nick_name FROM employees WHERE employee_id = ?',
        [previousEmployeeId]
      )
      if (prevEmpRows.length > 0) {
        const prevEmp = prevEmpRows[0]
        const firstName = prevEmp.full_name ? prevEmp.full_name.split(' ')[0] : ''
        previousEmployeeName = prevEmp.nick_name ? `${firstName}(${prevEmp.nick_name})` : firstName
      }
    }

    const newFirstName = newEmployee.full_name ? newEmployee.full_name.split(' ')[0] : ''
    const newEmployeeName = newEmployee.nick_name ? `${newFirstName}(${newEmployee.nick_name})` : newFirstName

    const roleLabels = {
      accounting: 'ผู้รับผิดชอบทำบัญชี',
      tax_inspection: 'ผู้ตรวจภาษี',
      wht_filer: 'ผู้ยื่น WHT',
      vat_filer: 'ผู้ยื่น VAT',
      document_entry: 'ผู้รับผิดชอบคีย์เอกสาร',
    }

    console.log(`[ResponsibilityChange] Build: ${assignment.build}, Role: ${role_type}, ${previousEmployeeId || 'none'} → ${new_employee_id.trim()}, By: ${req.user.id}`)

    res.json({
      success: true,
      message: `เปลี่ยน${roleLabels[role_type]}สำเร็จ`,
      data: {
        history_id: historyId,
        build: assignment.build,
        company_name: assignment.company_name,
        role_type,
        role_label: roleLabels[role_type],
        previous_employee_id: previousEmployeeId,
        previous_employee_name: previousEmployeeName || '-',
        new_employee_id: new_employee_id.trim(),
        new_employee_name: newEmployeeName,
        change_reason: change_reason || null,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Change responsible error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนผู้รับผิดชอบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  } finally {
    connection.release()
  }
})

/**
 * GET /api/work-assignments/:id/change-history
 * ดึงประวัติการเปลี่ยนผู้รับผิดชอบของ work assignment
 * Access: All authenticated users
 */
router.get('/:id/change-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if work assignment exists
    const [assignmentRows] = await pool.execute(
      'SELECT id, build, assignment_year, assignment_month FROM work_assignments WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (assignmentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found',
      })
    }

    // Get change history with employee names
    const [history] = await pool.execute(
      `SELECT 
        rch.id,
        rch.role_type,
        rch.previous_employee_id,
        CASE WHEN prev_emp.nick_name IS NOT NULL 
          THEN CONCAT(SUBSTRING_INDEX(prev_emp.full_name, ' ', 1), '(', prev_emp.nick_name, ')') 
          ELSE SUBSTRING_INDEX(prev_emp.full_name, ' ', 1) 
        END as previous_employee_name,
        rch.new_employee_id,
        CASE WHEN new_emp.nick_name IS NOT NULL 
          THEN CONCAT(SUBSTRING_INDEX(new_emp.full_name, ' ', 1), '(', new_emp.nick_name, ')') 
          ELSE SUBSTRING_INDEX(new_emp.full_name, ' ', 1) 
        END as new_employee_name,
        rch.changed_by,
        u.name as changed_by_name,
        rch.change_reason,
        rch.changed_at
      FROM responsibility_change_history rch
      LEFT JOIN employees prev_emp ON rch.previous_employee_id = prev_emp.employee_id
      LEFT JOIN employees new_emp ON rch.new_employee_id = new_emp.employee_id
      LEFT JOIN users u ON rch.changed_by = u.id
      WHERE rch.work_assignment_id = ?
      ORDER BY rch.changed_at DESC`,
      [id]
    )

    // Format dates
    const formattedHistory = history.map((item) => ({
      ...item,
      changed_at: formatDateForResponse(item.changed_at),
    }))

    res.json({
      success: true,
      data: formattedHistory,
    })
  } catch (error) {
    console.error('Get change history error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * DELETE /api/work-assignments/:id
 * ลบการจัดงาน (soft delete)
 * Soft-delete work_assignments, monthly_tax_data, document_entry_work ที่เกี่ยวข้อง
 * Access: Admin only
 */
router.delete('/:id', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { id } = req.params

    // 1. Check if work assignment exists
    const [assignmentRows] = await connection.execute(
      'SELECT id, build, assignment_year, assignment_month FROM work_assignments WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (assignmentRows.length === 0) {
      connection.release()
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการจัดงานนี้ หรือถูกลบไปแล้ว',
      })
    }

    const assignment = assignmentRows[0]

    await connection.beginTransaction()

    // 2. Soft delete work_assignments
    await connection.execute(
      'UPDATE work_assignments SET deleted_at = NOW(), is_active = FALSE WHERE id = ?',
      [id]
    )

    // 3. Soft delete related monthly_tax_data
    await connection.execute(
      `UPDATE monthly_tax_data 
       SET deleted_at = NOW() 
       WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL`,
      [assignment.build, assignment.assignment_year, assignment.assignment_month]
    )

    // 4. Soft delete related document_entry_work
    await connection.execute(
      `UPDATE document_entry_work 
       SET deleted_at = NOW() 
       WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL`,
      [assignment.build, assignment.assignment_year, assignment.assignment_month]
    )

    await connection.commit()

    // Invalidate caches
    invalidateCache('GET:/work-assignments')
    invalidateCache('GET:/monthly-tax-data')
    invalidateCache('GET:/document-entry-work')

    res.json({
      success: true,
      message: `ลบการจัดงาน ${assignment.build} เดือน ${assignment.assignment_month}/${assignment.assignment_year} สำเร็จ`,
      data: {
        id: assignment.id,
        build: assignment.build,
        assignment_year: assignment.assignment_year,
        assignment_month: assignment.assignment_month,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Delete work assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบการจัดงาน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  } finally {
    connection.release()
  }
})


export default router
