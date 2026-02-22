/**
 * Employee Routes
 * Routes สำหรับการจัดการข้อมูลพนักงาน
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { validateEmployee, validateEmployeeUpdate } from '../../middleware/validation.js'

const router = express.Router()

/**
 * GET /api/employees
 * Get employee list (paginated)
 * Access: HR, Admin (all) | Employee (own data only)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      position = '',
      status, // ไม่ตั้ง default เพื่อให้สามารถตรวจสอบ undefined ได้
      includeDeleted = 'false', // เพิ่ม parameter สำหรับแสดงข้อมูลที่ถูก soft delete
      sortBy = 'hire_date',
      sortOrder = 'desc',
    } = req.query

    const pageNum = parseInt(page)
    // ถ้า limit มากกว่า 1000 ให้ใช้ 10000 (สำหรับกรณี "ทั้งหมด")
    const limitNum = parseInt(limit) > 1000 ? 10000 : Math.min(parseInt(limit), 10000)
    const offset = (pageNum - 1) * limitNum

    // Debug log
    console.log('GET /api/employees - Query params:', {
      page,
      limit,
      search,
      position,
      status,
      sortBy,
      sortOrder,
      limitNum,
      offset,
    })

    // Role-based access control
    // HR = admin role (ตาม requirements: Role : HR , Admin จะมองเห็นทุกระบบ)
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Check if should include deleted records (only for admin)
    const shouldIncludeDeleted = isHRorAdmin && includeDeleted === 'true'

    // Build WHERE clause with parameterized queries (prevent SQL injection)
    const whereConditions = []
    const queryParams = []

    // Only filter deleted_at if not including deleted records
    if (!shouldIncludeDeleted) {
      whereConditions.push('e.deleted_at IS NULL')
    }

    if (!isHRorAdmin) {
      whereConditions.push('e.employee_id = ?')
      queryParams.push(req.user.employee_id)
    }

    // Only filter by status if status is provided, not empty, and not 'all'
    // ถ้า status เป็น undefined, null, empty string, หรือ 'all' จะไม่ filter
    if (status && typeof status === 'string' && status.trim() !== '' && status.trim() !== 'all') {
      whereConditions.push('e.status = ?')
      queryParams.push(status.trim())
    }

    if (position) {
      whereConditions.push('e.position = ?')
      queryParams.push(position)
    }

    if (search) {
      whereConditions.push('(e.full_name LIKE ? OR e.employee_id LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ')

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['hire_date', 'full_name', 'employee_id', 'position', 'status']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'hire_date'
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    // Debug log - Check status distribution BEFORE filtering
    const [statusCheck] = await pool.execute(
      `SELECT 
        COALESCE(status, 'NULL') as status, 
        COUNT(*) as count 
      FROM employees 
      WHERE deleted_at IS NULL 
      GROUP BY status`
    )
    console.log('GET /api/employees - Status distribution (all):', statusCheck)

    // Debug log - Check total count without status filter
    const [totalCheck] = await pool.execute(
      `SELECT COUNT(*) as total FROM employees WHERE deleted_at IS NULL`
    )
    console.log('GET /api/employees - Total employees (no filter):', totalCheck[0].total)

    // Debug log - Check active count specifically
    if (status === 'active') {
      // Check active without deleted_at filter
      const [activeNoFilter] = await pool.execute(
        `SELECT COUNT(*) as total FROM employees WHERE status = 'active'`
      )
      console.log('GET /api/employees - Active employees (no deleted_at filter):', activeNoFilter[0].total)

      // Check active with deleted_at IS NULL (what we use)
      const [activeCheck] = await pool.execute(
        `SELECT COUNT(*) as total FROM employees WHERE deleted_at IS NULL AND status = 'active'`
      )
      console.log('GET /api/employees - Active employees (deleted_at IS NULL):', activeCheck[0].total)

      // Check active with deleted_at IS NOT NULL (soft-deleted)
      const [activeDeleted] = await pool.execute(
        `SELECT COUNT(*) as total FROM employees WHERE deleted_at IS NOT NULL AND status = 'active'`
      )
      console.log('GET /api/employees - Active employees (deleted_at IS NOT NULL - soft-deleted):', activeDeleted[0].total)

      // Check all statuses including soft-deleted
      const [statusAll] = await pool.execute(
        `SELECT 
          COALESCE(status, 'NULL') as status, 
          COUNT(*) as count,
          SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as not_deleted,
          SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted
        FROM employees 
        GROUP BY status`
      )
      console.log('GET /api/employees - Status distribution (with deleted info):', JSON.stringify(statusAll, null, 2))
    }

    // Get total count
    const countParams = [...queryParams]
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
      countParams
    )
    const total = countResult[0].total

    // Debug log
    console.log('GET /api/employees - Query results:', {
      total,
      limitNum,
      offset,
      whereClause,
      queryParams,
    })

    // Get employees (only essential fields for list view)
    // Use DATE_FORMAT() for hire_date to ensure YYYY-MM-DD string format
    // Add leave and WFH statistics for current year using LEFT JOINs
    const employeeParams = [...queryParams, limitNum, offset]
    const [employees] = await pool.execute(
      `SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.full_name,
        e.english_name,
        e.nick_name,
        e.company_email,
        e.position,
        e.status,
        DATE_FORMAT(e.hire_date, '%Y-%m-%d') as hire_date,
        e.profile_image,
        COALESCE(leave_stats.total_leave_days, 0) as leave_days_used,
        COALESCE(wfh_stats.total_wfh_days, 0) as wfh_days_used
      FROM employees e
      LEFT JOIN (
        SELECT employee_id, SUM(leave_days) as total_leave_days
        FROM leave_requests
        WHERE status = 'อนุมัติแล้ว'
          AND deleted_at IS NULL
          AND YEAR(leave_start_date) = YEAR(CURDATE())
        GROUP BY employee_id
      ) leave_stats ON leave_stats.employee_id = e.employee_id
      LEFT JOIN (
        SELECT employee_id, COUNT(*) as total_wfh_days
        FROM wfh_requests
        WHERE status = 'อนุมัติแล้ว'
          AND deleted_at IS NULL
          AND YEAR(wfh_date) = YEAR(CURDATE())
        GROUP BY employee_id
      ) wfh_stats ON wfh_stats.employee_id = e.employee_id
      ${whereClause}
      ORDER BY e.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?`,
      employeeParams
    )

    // Debug log
    console.log('GET /api/employees - Response:', {
      employeesCount: employees.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Get employees error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/positions
 * Get all unique positions
 * Access: All authenticated users
 */
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const [positions] = await pool.execute(
      `SELECT DISTINCT position 
       FROM employees 
       WHERE deleted_at IS NULL 
         AND position IS NOT NULL 
         AND position != ''
       ORDER BY position ASC`
    )

    const positionList = positions.map((p) => p.position)

    res.json({
      success: true,
      data: positionList,
    })
  } catch (error) {
    console.error('Get positions error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/positions
 * Get all unique positions
 * Access: All authenticated users
 * NOTE: This route must be defined BEFORE /:id route to avoid route conflicts
 */
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const [positions] = await pool.execute(
      `SELECT DISTINCT position 
       FROM employees 
       WHERE deleted_at IS NULL 
         AND position IS NOT NULL 
         AND position != ''
       ORDER BY position ASC`
    )

    const positionList = positions.map((p) => p.position)

    res.json({
      success: true,
      data: positionList,
    })
  } catch (error) {
    console.error('Get positions error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/:id
 * Get employee detail
 * Access: HR, Admin (any) | Employee (own data only)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause with access control
    // Support both UUID (e.id) and employee_id (e.employee_id) formats
    // Check if id looks like a UUID (contains hyphens) or is an employee_id (e.g., AC00035)
    const isUUID = id.includes('-') && id.length > 20
    let whereClause = isUUID
      ? 'WHERE e.id = ? AND e.deleted_at IS NULL'
      : 'WHERE e.employee_id = ? AND e.deleted_at IS NULL'
    const params = [id]

    // Note: Allow all authenticated users to view basic employee info (for nickname lookup)
    // Full access control is handled in the response filtering below
    // Non-admin users can view basic info but not sensitive data

    // Get employee detail
    // Use DATE_FORMAT() to ensure dates are returned as YYYY-MM-DD strings
    // This avoids timezone issues when mysql2 converts DATE to Date objects
    const [employees] = await pool.execute(
      `SELECT 
        e.id,
        e.employee_id,
        e.position,
        e.id_card,
        e.gender,
        e.first_name,
        e.last_name,
        e.full_name,
        e.english_name,
        e.nick_name,
        DATE_FORMAT(e.birth_date, '%Y-%m-%d') as birth_date,
        e.phone,
        e.personal_email,
        e.company_email,
        DATE_FORMAT(e.hire_date, '%Y-%m-%d') as hire_date,
        DATE_FORMAT(e.probation_end_date, '%Y-%m-%d') as probation_end_date,
        DATE_FORMAT(e.resignation_date, '%Y-%m-%d') as resignation_date,
        e.status,
        e.address_full,
        e.village,
        e.building,
        e.room_number,
        e.floor_number,
        e.house_number,
        e.soi_alley,
        e.moo,
        e.road,
        e.sub_district,
        e.district,
        e.province,
        e.postal_code,
        e.profile_image,
        e.created_at,
        e.updated_at,
        e.deleted_at,
        u.id as user_id,
        u.username,
        u.role as user_role
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ${whereClause}`,
      params
    )

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    const employee = employees[0]

    // Debug log - Check if id_card and birth_date are present
    console.log('GET /api/employees/:id - Employee data check:', {
      id: employee.id,
      employee_id: employee.employee_id,
      id_card: employee.id_card,
      id_card_type: typeof employee.id_card,
      id_card_length: employee.id_card ? employee.id_card.length : null,
      birth_date: employee.birth_date,
      birth_date_type: typeof employee.birth_date,
      hire_date: employee.hire_date,
      hire_date_type: typeof employee.hire_date,
      has_id_card: 'id_card' in employee,
      has_birth_date: 'birth_date' in employee,
    })

    // Calculate working days using formatted date string (YYYY-MM-DD)
    // hire_date is already formatted as YYYY-MM-DD string from DATE_FORMAT()
    const hireDateStr = employee.hire_date
    const hireDateParts = hireDateStr ? hireDateStr.split('T')[0].split('-') : null
    const hireDate = hireDateParts
      ? new Date(parseInt(hireDateParts[0]), parseInt(hireDateParts[1]) - 1, parseInt(hireDateParts[2]))
      : new Date()
    const today = new Date()
    const workingDays = Math.floor((today - hireDate) / (1000 * 60 * 60 * 24))

    // Get leave/WFH statistics from database for current year
    const [[leaveResult]] = await pool.execute(
      `SELECT COALESCE(SUM(leave_days), 0) as used_leave_days
       FROM leave_requests
       WHERE employee_id = ?
         AND status = 'อนุมัติแล้ว'
         AND deleted_at IS NULL
         AND YEAR(leave_start_date) = YEAR(CURDATE())`,
      [employee.employee_id]
    )

    // Get leave breakdown by type for current year
    const [leaveByType] = await pool.execute(
      `SELECT 
         leave_type,
         COALESCE(SUM(leave_days), 0) as days_used
       FROM leave_requests
       WHERE employee_id = ?
         AND status = 'อนุมัติแล้ว'
         AND deleted_at IS NULL
         AND YEAR(leave_start_date) = YEAR(CURDATE())
       GROUP BY leave_type`,
      [employee.employee_id]
    )

    // Map leave types with quotas
    const leaveTypeQuotas = {
      'ลาป่วย': 30,
      'ลากิจ': 6,
      'ลาพักร้อน': 6,
      'ลาไม่รับค่าจ้าง': null, // No limit
      'ลาอื่นๆ': null, // No limit
    }

    // Build leave breakdown object
    const leaveBreakdown = Object.keys(leaveTypeQuotas).map(type => {
      const found = leaveByType.find(r => r.leave_type === type)
      const used = found ? Number(found.days_used) : 0
      const quota = leaveTypeQuotas[type]
      return {
        type,
        used,
        quota,
        remaining: quota !== null ? Math.max(0, quota - used) : null,
      }
    })

    const [[wfhResult]] = await pool.execute(
      `SELECT COUNT(*) as used_wfh_days
       FROM wfh_requests
       WHERE employee_id = ?
         AND status = 'อนุมัติแล้ว'
         AND deleted_at IS NULL
         AND YEAR(wfh_date) = YEAR(CURDATE())`,
      [employee.employee_id]
    )

    const usedLeaveDays = Number(leaveResult.used_leave_days) || 0
    const usedWfhDays = Number(wfhResult.used_wfh_days) || 0
    const totalLeaveDays = 6 // Annual vacation leave allowance (ลาพักร้อน)

    const leaveStatistics = {
      total_leave_days: totalLeaveDays,
      used_leave_days: usedLeaveDays,
      remaining_leave_days: Math.max(0, totalLeaveDays - usedLeaveDays),
      breakdown: leaveBreakdown,
    }

    const wfhStatistics = {
      used_wfh_days: usedWfhDays,
    }

    // Remove sensitive data
    delete employee.company_email_password

    // For non-admin users viewing other employees, only return basic info (for nickname lookup)
    // Admin users can see all data
    const isViewingOwnData = employee.employee_id === req.user.employee_id
    if (!isHRorAdmin && !isViewingOwnData) {
      // Return only basic fields needed for nickname lookup
      const basicEmployee = {
        id: employee.id,
        employee_id: employee.employee_id,
        first_name: employee.first_name,
        full_name: employee.full_name,
        nick_name: employee.nick_name,
        position: employee.position,
        status: employee.status,
      }
      return res.json({
        success: true,
        data: basicEmployee,
      })
    }

    // All date fields are already formatted as YYYY-MM-DD strings by DATE_FORMAT() in SQL
    // No need for additional formatting
    const formattedEmployee = {
      ...employee,
      // birth_date, hire_date, probation_end_date, resignation_date are already formatted by DATE_FORMAT()
      working_days: workingDays,
      leave_statistics: leaveStatistics,
      wfh_statistics: wfhStatistics,
    }

    // Debug log - Check formatted dates
    console.log('GET /api/employees/:id - Formatted dates:', {
      hire_date: {
        formatted: formattedEmployee.hire_date,
        type: typeof formattedEmployee.hire_date,
      },
      birth_date: {
        formatted: formattedEmployee.birth_date,
        type: typeof formattedEmployee.birth_date,
      },
    })

    res.json({
      success: true,
      data: formattedEmployee,
    })
  } catch (error) {
    console.error('Get employee detail error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/employees
 * Create employee
 * Access: HR, Admin only
 */
router.post('/', authenticateToken, authorize('admin', 'hr'), validateEmployee, async (req, res) => {
  try {
    const {
      employee_id,
      position,
      id_card,
      gender,
      first_name,
      last_name,
      english_name,
      nick_name,
      birth_date,
      phone,
      personal_email,
      company_email,
      company_email_password,
      hire_date,
      probation_end_date,
      resignation_date,
      status = 'active',
      address_full,
      village,
      building,
      room_number,
      floor_number,
      house_number,
      soi_alley,
      moo,
      road,
      sub_district,
      district,
      province,
      postal_code,
      profile_image,
    } = req.body

    // Check if employee_id already exists
    const [existing] = await pool.execute(
      'SELECT id FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
      [employee_id]
    )

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists',
      })
    }

    // Note: company_email and personal_email can be duplicated (no unique constraint)

    // Insert employee
    console.log('=== Creating new employee ===')
    console.log('Employee data:', {
      employee_id,
      position,
      id_card,
      gender: gender || null,
      first_name,
      last_name,
      hire_date: hire_date || null,
      status,
    })

    const [result] = await pool.execute(
      `INSERT INTO employees (
        employee_id, position, id_card, gender, first_name, last_name,
        english_name, nick_name, birth_date, phone, personal_email,
        company_email, company_email_password, hire_date, probation_end_date,
        resignation_date, status, address_full, village, building,
        room_number, floor_number, house_number, soi_alley, moo, road,
        sub_district, district, province, postal_code, profile_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        position,
        id_card,
        gender || null,
        first_name,
        last_name,
        english_name || null,
        nick_name || null,
        birth_date || null,
        phone || null,
        personal_email || null,
        company_email || null,
        company_email_password || null,
        hire_date || null,
        probation_end_date || null,
        resignation_date || null,
        status,
        address_full || null,
        village || null,
        building || null,
        room_number || null,
        floor_number || null,
        house_number || null,
        soi_alley || null,
        moo || null,
        road || null,
        sub_district || null,
        district || null,
        province || null,
        postal_code || null,
        profile_image || null,
      ]
    )

    console.log('INSERT result:', { insertId: result.insertId, affectedRows: result.affectedRows })

    // Get created employee - use employee_id instead of insertId
    // (insertId is 0 for UUID-based tables)
    const [newEmployee] = await pool.execute(
      'SELECT id, employee_id, full_name FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
      [employee_id]
    )

    console.log('Created employee lookup result:', newEmployee)

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee[0],
    })
  } catch (error) {
    console.error('Create employee error:', error)

    // Handle duplicate entry errors with user-friendly messages
    if (error.code === 'ER_DUP_ENTRY') {
      let message = 'มีข้อมูลซ้ำในระบบ (Duplicate entry)'
      if (error.sqlMessage?.includes('company_email')) {
        message = 'อีเมลบริษัทนี้มีอยู่ในระบบแล้ว (Company email already exists)'
      } else if (error.sqlMessage?.includes('id_card')) {
        message = 'รหัสบัตรประชาชนนี้มีอยู่ในระบบแล้ว (ID Card already exists)'
      } else if (error.sqlMessage?.includes('employee_id')) {
        message = 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว (Employee ID already exists)'
      }
      return res.status(400).json({
        success: false,
        message,
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/employees/:id
 * Update employee
 * Access: HR, Admin (any) | Employee (own data only, limited fields)
 */
router.put('/:id', authenticateToken, validateEmployeeUpdate, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Check if employee exists and access control
    let whereClause = 'WHERE id = ? AND deleted_at IS NULL'
    const checkParams = [id]

    if (!isHRorAdmin) {
      whereClause += ' AND employee_id = ?'
      checkParams.push(req.user.employee_id)
    }

    const [existing] = await pool.execute(
      `SELECT id, employee_id FROM employees ${whereClause}`,
      checkParams
    )

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    // Determine updatable fields based on role
    const updatableFields = isHRorAdmin
      ? req.body // All fields for HR/Admin
      : {
        // Limited fields for Employee
        phone: req.body.phone,
        personal_email: req.body.personal_email,
        address_full: req.body.address_full,
        village: req.body.village,
        building: req.body.building,
        room_number: req.body.room_number,
        floor_number: req.body.floor_number,
        house_number: req.body.house_number,
        soi_alley: req.body.soi_alley,
        moo: req.body.moo,
        road: req.body.road,
        sub_district: req.body.sub_district,
        district: req.body.district,
        province: req.body.province,
        postal_code: req.body.postal_code,
        profile_image: req.body.profile_image,
      }

    // Build UPDATE query dynamically
    const updateFields = []
    const updateValues = []

    Object.keys(updatableFields).forEach((key) => {
      if (updatableFields[key] !== undefined) {
        updateFields.push(`${key} = ?`)
        updateValues.push(updatableFields[key])
      }
    })

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      })
    }

    updateValues.push(id)

    await pool.execute(
      `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    )

    // Get updated employee
    const [updated] = await pool.execute(
      'SELECT id, employee_id, full_name FROM employees WHERE id = ?',
      [id]
    )

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated[0],
    })
  } catch (error) {
    console.error('Update employee error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/employees/:id
 * Delete employee (soft delete)
 * Access: HR, Admin only
 */
router.delete('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params

    // Check if employee exists
    const [existing] = await pool.execute(
      'SELECT id FROM employees WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    // Soft delete
    await pool.execute('UPDATE employees SET deleted_at = NOW() WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    })
  } catch (error) {
    console.error('Delete employee error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/employees/reset/all
 * Delete ALL employees (hard delete) - สำหรับ reset ข้อมูลทั้งหมดก่อนนำเข้าใหม่
 * Access: Admin only
 * ⚠️ WARNING: This will permanently delete ALL employee records!
 */
router.delete('/reset/all', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // Get count before deletion
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM employees')
    const totalCount = countResult[0].total

    // Hard delete all employees (permanently remove from database)
    await pool.execute('DELETE FROM employees')

    res.json({
      success: true,
      message: `ลบข้อมูลพนักงานทั้งหมด ${totalCount} รายการเรียบร้อยแล้ว`,
      deleted_count: totalCount,
    })
  } catch (error) {
    console.error('Delete all employees error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/:id/working-days
 * Calculate working days (from hire_date to today)
 * Access: HR, Admin (any) | Employee (own data only)
 */
router.get('/:id/working-days', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause with access control
    let whereClause = 'WHERE e.id = ? AND e.deleted_at IS NULL'
    const params = [id]

    if (!isHRorAdmin) {
      whereClause += ' AND e.employee_id = ?'
      params.push(req.user.employee_id)
    }

    const [employees] = await pool.execute(
      `SELECT hire_date, resignation_date FROM employees e ${whereClause}`,
      params
    )

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    const employee = employees[0]

    // Parse hire_date and end_date (use local date, not UTC)
    // Handle different date formats (string, Date object, or null)
    let hireDate
    if (employee.hire_date) {
      if (typeof employee.hire_date === 'string') {
        const hireDateStr = employee.hire_date.split('T')[0] // Format: YYYY-MM-DD
        const hireDateParts = hireDateStr.split('-')
        if (hireDateParts.length === 3) {
          hireDate = new Date(
            parseInt(hireDateParts[0]),
            parseInt(hireDateParts[1]) - 1, // Month is 0-indexed
            parseInt(hireDateParts[2])
          )
        } else {
          hireDate = new Date(employee.hire_date)
        }
      } else if (employee.hire_date instanceof Date) {
        hireDate = new Date(employee.hire_date)
      } else {
        hireDate = new Date(employee.hire_date)
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Hire date is required',
      })
    }

    let endDate
    if (employee.resignation_date) {
      if (typeof employee.resignation_date === 'string') {
        const endDateStr = employee.resignation_date.split('T')[0]
        const endDateParts = endDateStr.split('-')
        if (endDateParts.length === 3) {
          endDate = new Date(
            parseInt(endDateParts[0]),
            parseInt(endDateParts[1]) - 1,
            parseInt(endDateParts[2])
          )
        } else {
          endDate = new Date(employee.resignation_date)
        }
      } else if (employee.resignation_date instanceof Date) {
        endDate = new Date(employee.resignation_date)
      } else {
        endDate = new Date(employee.resignation_date)
      }
    } else {
      endDate = new Date()
    }

    // Reset time to midnight to avoid timezone issues
    hireDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    // Validate dates
    if (isNaN(hireDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hire date format',
      })
    }

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format',
      })
    }

    // Calculate total calendar days (including all days)
    const totalDays = Math.floor((endDate - hireDate) / (1000 * 60 * 60 * 24)) + 1 // +1 to include start date

    // Calculate years, months, and days using actual calendar dates
    let years = endDate.getFullYear() - hireDate.getFullYear()
    let months = endDate.getMonth() - hireDate.getMonth()
    let days = endDate.getDate() - hireDate.getDate()

    // Adjust for negative days
    if (days < 0) {
      months--
      // Get days in the previous month
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0)
      days += prevMonth.getDate()
    }

    // Adjust for negative months
    if (months < 0) {
      years--
      months += 12
    }

    // Ensure non-negative values
    years = Math.max(0, years)
    months = Math.max(0, months)
    days = Math.max(0, days)

    res.json({
      success: true,
      data: {
        employee_id: req.params.id,
        hire_date: employee.hire_date,
        working_days: totalDays,
        working_years: years,
        working_months: months,
        working_days_remaining: days,
        calculation_date: endDate.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Calculate working days error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/:id/statistics
 * Get leave/WFH statistics
 * Access: HR, Admin (any) | Employee (own data only)
 */
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause with access control
    let whereClause = 'WHERE e.id = ? AND e.deleted_at IS NULL'
    const params = [id]

    if (!isHRorAdmin) {
      whereClause += ' AND e.employee_id = ?'
      params.push(req.user.employee_id)
    }

    const [employees] = await pool.execute(
      `SELECT employee_id FROM employees e ${whereClause}`,
      params
    )

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    const employeeId = employees[0].employee_id

    // Get leave statistics (if leave_requests table exists)
    // For now, return default values
    // TODO: Join with leave_requests table when available
    const leaveStatistics = {
      total_leave_days: 10, // Default
      used_leave_days: 0,
      remaining_leave_days: 10,
      pending_leave_days: 0,
    }

    const wfhStatistics = {
      total_wfh_days: 20, // Default
      used_wfh_days: 0,
      remaining_wfh_days: 20,
    }

    res.json({
      success: true,
      data: {
        employee_id: employeeId,
        leave_statistics: leaveStatistics,
        wfh_statistics: wfhStatistics,
        year: new Date().getFullYear(),
      },
    })
  } catch (error) {
    console.error('Get employee statistics error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router
