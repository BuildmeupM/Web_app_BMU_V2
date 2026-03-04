/**
 * WFH Requests Routes
 * Routes สำหรับการจัดการการขอ Work from Home (WFH)
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { invalidateCache } from '../../middleware/cache.js'
import {
  canRequestWFH,
  getApprovedWFHCount,
  getMonthlyWFHCount,
  getEmployeePosition,
  getWFHMonthlyLimit,
  generateUUID,
} from '../../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/wfh-requests
 * ดึงรายการการขอ WFH ทั้งหมด
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      start_date,
      end_date,
      search = '',
      employee_id,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Role-based access control
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause
    const whereConditions = ['wr.deleted_at IS NULL']
    const queryParams = []

    // Employee access control
    if (!isHRorAdmin) {
      whereConditions.push('wr.employee_id = ?')
      queryParams.push(req.user.employee_id)
    } else if (employee_id) {
      whereConditions.push('wr.employee_id = ?')
      queryParams.push(employee_id)
    }

    // Filter by status
    if (status) {
      whereConditions.push('wr.status = ?')
      queryParams.push(status)
    }

    // Filter by date range
    if (start_date) {
      whereConditions.push('wr.wfh_date >= ?')
      queryParams.push(start_date)
    }
    if (end_date) {
      whereConditions.push('wr.wfh_date <= ?')
      queryParams.push(end_date)
    }

    // Search by employee name or employee_id
    if (search) {
      whereConditions.push('(e.full_name LIKE ? OR wr.employee_id LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Get total count
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Get WFH requests
    const [wfhRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.employee_id,
        DATE_FORMAT(wr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.status,
        wr.approved_by,
        DATE_FORMAT(wr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        wr.approver_note,
        wr.work_report,
        DATE_FORMAT(wr.work_report_submitted_at, '%Y-%m-%d %H:%i:%s') as work_report_submitted_at,
        DATE_FORMAT(wr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(wr.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       ${whereClause}
       ORDER BY wr.wfh_date DESC, wr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: {
        wfh_requests: wfhRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Get WFH requests error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/pending
 * ดึงการขอ WFH ที่รออนุมัติ
 * Access: HR/Admin/Audit only
 */
router.get('/pending', authenticateToken, authorize('admin', 'hr', 'audit'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      wfh_date,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const userRole = req.user.role;
    let whereConditions = ['wr.deleted_at IS NULL']
    const queryParams = []

    if (userRole === 'audit') {
      whereConditions.push(`(
        (wr.status = 'รอตรวจสอบ' AND u.role IN ('service', 'data_entry', 'data_entry_and_service')) 
        OR 
        (wr.status = 'รอโหวต' AND u.role = 'audit' AND wr.employee_id != ?)
      )`);
      queryParams.push(req.user.employee_id);
    } else if (userRole === 'hr') {
      whereConditions.push(`wr.status = 'รออนุมัติ'`);
    } else if (userRole === 'admin') {
      whereConditions.push(`wr.status IN ('รออนุมัติ', 'รออนุมัติ (ผู้บริหาร)')`);
    }

    // Filter by WFH date if provided
    if (wfh_date) {
      whereConditions.push('wr.wfh_date = ?')
      queryParams.push(wfh_date)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count with filter
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       LEFT JOIN users u ON wr.employee_id = u.employee_id
       WHERE ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Get pending WFH requests with filter
    const [wfhRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.employee_id,
        DATE_FORMAT(wr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.status,
        DATE_FORMAT(wr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        u.role as employee_role
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       LEFT JOIN users u ON wr.employee_id = u.employee_id
       WHERE ${whereClause}
       ORDER BY wr.wfh_date ASC, wr.created_at ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: {
        wfh_requests: wfhRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Get pending WFH requests error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/calendar
 * ดึงข้อมูลสำหรับ Calendar view
 * Access: All
 */
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query
    const targetDate = month ? new Date(`${month}-01`) : new Date()
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`

    // Get all days in the month with WFH count
    // Count both "รออนุมัติ" (pending) and "อนุมัติแล้ว" (approved) - exclude "ไม่อนุมัติ" (rejected)
    const [calendarData] = await pool.execute(
      `SELECT 
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as date,
        COUNT(CASE WHEN wr.status IN ('รออนุมัติ', 'อนุมัติแล้ว') THEN 1 END) as approved_count,
        GROUP_CONCAT(
          CONCAT(
            wr.id, '|',
            wr.employee_id, '|',
            COALESCE(e.full_name, ''), '|',
            COALESCE(e.nick_name, ''), '|',
            COALESCE(e.position, ''), '|',
            wr.status
          ) SEPARATOR '||'
        ) as requests
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       WHERE DATE_FORMAT(wr.wfh_date, '%Y-%m') = ?
         AND wr.deleted_at IS NULL
       GROUP BY wr.wfh_date
       ORDER BY wr.wfh_date ASC`,
      [monthStr]
    )

    // Format calendar data
    // approved_count now includes both "รออนุมัติ" (pending) and "อนุมัติแล้ว" (approved)
    // Excludes "ไม่อนุมัติ" (rejected) because those can be selected again
    const calendar = calendarData.map(item => {
      const approvedCount = parseInt(item.approved_count) || 0
      let status = 'available'
      if (approvedCount >= 3) {
        status = 'full'
      } else if (approvedCount > 0) {
        status = 'warning'
      }

      // Parse requests
      const requests = item.requests
        ? item.requests.split('||').map(req => {
          const parts = req.split('|')
          // Handle both old format (4 parts) and new format (6 parts)
          if (parts.length >= 6) {
            const [id, employee_id, employee_name, employee_nick_name, employee_position, reqStatus] = parts
            return {
              id,
              employee_id,
              employee_name,
              employee_nick_name: employee_nick_name || null,
              employee_position: employee_position || null,
              status: reqStatus,
            }
          } else {
            // Old format (backward compatibility)
            const [id, employee_id, employee_name, reqStatus] = parts
            return {
              id,
              employee_id,
              employee_name,
              employee_nick_name: null,
              employee_position: null,
              status: reqStatus,
            }
          }
        })
        : []

      return {
        date: item.date,
        approved_count: approvedCount,
        status,
        requests,
      }
    })

    // Get employee's monthly limit
    const employeeId = req.user.employee_id
    let monthlyLimit = 6
    let usedThisMonth = 0

    if (employeeId) {
      const position = await getEmployeePosition(pool, employeeId)
      monthlyLimit = getWFHMonthlyLimit(position)
      usedThisMonth = await getMonthlyWFHCount(pool, employeeId, monthStr)
    }

    res.json({
      success: true,
      data: {
        calendar,
        month: monthStr,
        limits: {
          daily_limit: 3,
          monthly_limit: monthlyLimit,
          used_this_month: usedThisMonth,
        },
      },
    })
  } catch (error) {
    console.error('Get WFH calendar error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/work-reports
 * ดึงรายงานการทำงาน (แยกเป็นรายงานแล้ว และยังไม่ได้รายงาน)
 * Access: Admin only
 * 
 * NOTE: Route นี้ต้องอยู่ก่อน route /:id เพื่อไม่ให้ Express match /:id ก่อน
 */
router.get('/work-reports', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { month } = req.query

    // Parse month (YYYY-MM) or use current month
    let targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)

    // Get first and last day of target month
    // So monthNum gives us the last day of targetMonth
    const lastDay = new Date(year, monthNum, 0)

    // Format dates as YYYY-MM-DD
    const firstDayStr = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const lastDayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all approved WFH requests in the month
    // Use DATE() function to ensure proper date comparison
    const [wfhRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.employee_id,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.work_report,
        DATE_FORMAT(wr.work_report_submitted_at, '%Y-%m-%d %H:%i:%s') as work_report_submitted_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       WHERE wr.status = 'อนุมัติแล้ว'
         AND DATE(wr.wfh_date) >= DATE(?)
         AND DATE(wr.wfh_date) <= DATE(?)
         AND wr.deleted_at IS NULL
       ORDER BY wr.wfh_date ASC, e.full_name ASC`,
      [firstDayStr, lastDayStr]
    )

    // Categorize work reports
    const submitted = []
    const notSubmitted = []
    const overdue = []

    wfhRequests.forEach((req) => {
      // Parse wfh_date - handle both string and Date formats
      const wfhDateStr = req.wfh_date
      const wfhDate = new Date(wfhDateStr)
      wfhDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.floor((today.getTime() - wfhDate.getTime()) / (1000 * 60 * 60 * 24))

      // Check if work_report exists and is not empty
      const hasWorkReport = req.work_report && req.work_report.trim() !== ''

      if (hasWorkReport) {
        // Already submitted
        submitted.push(req)
      } else {
        // Not submitted yet
        if (daysDiff > 2) {
          // Overdue (more than 2 days after WFH date)
          overdue.push(req)
        } else if (daysDiff >= 0) {
          // Can still submit (within 2 days)
          notSubmitted.push(req)
        }
      }
    })

    res.json({
      success: true,
      data: {
        month: targetMonth,
        submitted: submitted,
        not_submitted: notSubmitted,
        overdue: overdue,
        summary: {
          total: wfhRequests.length,
          submitted: submitted.length,
          not_submitted: notSubmitted.length,
          overdue: overdue.length,
        },
      },
    })
  } catch (error) {
    console.error('Get work reports error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/:id
 * ดึงข้อมูลการขอ WFH ตาม ID
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause with access control
    let whereClause = 'WHERE wr.id = ? AND wr.deleted_at IS NULL'
    const params = [id]

    if (!isHRorAdmin) {
      whereClause += ' AND wr.employee_id = ?'
      params.push(req.user.employee_id)
    }

    // Get WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.employee_id,
        DATE_FORMAT(wr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.status,
        wr.approved_by,
        DATE_FORMAT(wr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        wr.approver_note,
        wr.work_report,
        DATE_FORMAT(wr.work_report_submitted_at, '%Y-%m-%d %H:%i:%s') as work_report_submitted_at,
        DATE_FORMAT(wr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(wr.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.position as employee_position,
        u.name as approver_name
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       LEFT JOIN users u ON wr.approved_by = u.id
       ${whereClause}`,
      params
    )

    if (wfhRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'WFH request not found',
      })
    }

    res.json({
      success: true,
      data: {
        wfh_request: wfhRequests[0],
      },
    })
  } catch (error) {
    console.error('Get WFH request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/dashboard/summary
 * ดึงข้อมูล Dashboard WFH
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month } = req.query
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'
    const targetEmployeeId = isHRorAdmin ? employee_id : req.user.employee_id

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      })
    }

    const targetDate = month ? new Date(`${month}-01`) : new Date()
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`

    // Get employee position and monthly limit
    const position = await getEmployeePosition(pool, targetEmployeeId)
    const monthlyLimit = getWFHMonthlyLimit(position)
    const usedThisMonth = await getMonthlyWFHCount(pool, targetEmployeeId, monthStr)

    // Get work reports
    const [workReports] = await pool.execute(
      `SELECT 
        wr.id,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.work_report,
        DATE_FORMAT(wr.work_report_submitted_at, '%Y-%m-%d %H:%i:%s') as work_report_submitted_at
       FROM wfh_requests wr
       WHERE wr.employee_id = ?
         AND wr.status = 'อนุมัติแล้ว'
         AND wr.work_report IS NOT NULL
         AND wr.deleted_at IS NULL
       ORDER BY wr.wfh_date DESC
       LIMIT 10`,
      [targetEmployeeId]
    )

    res.json({
      success: true,
      data: {
        summary: {
          monthly_limit: monthlyLimit,
          used_wfh_days: usedThisMonth,
          remaining_wfh_days: Math.max(0, monthlyLimit - usedThisMonth),
        },
        work_reports: workReports,
      },
    })
  } catch (error) {
    console.error('Get WFH dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/wfh-requests/dashboard/daily
 * ดึงข้อมูล WFH รายวันสำหรับกราฟ (สำหรับ Admin)
 * Access: Admin only
 */
router.get('/dashboard/daily', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { month } = req.query

    // Parse month (YYYY-MM) or use current month
    let targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)

    // Get first and last day of target month
    // So monthNum gives us the last day of targetMonth
    const lastDay = new Date(year, monthNum, 0)

    // Format dates as YYYY-MM-DD
    const firstDayStr = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const lastDayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    // Get daily WFH statistics for target month
    const [dailyStats] = await pool.execute(
      `SELECT 
        DATE_FORMAT(dates.date, '%Y-%m-%d') as wfh_date,
        COUNT(DISTINCT CASE WHEN wr.status = 'อนุมัติแล้ว' THEN wr.employee_id END) as approved_employee_count,
        COUNT(DISTINCT CASE WHEN wr.status = 'รออนุมัติ' THEN wr.employee_id END) as pending_employee_count,
        COUNT(CASE WHEN wr.status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        COUNT(CASE WHEN wr.status = 'รออนุมัติ' THEN 1 END) as pending_count,
        GROUP_CONCAT(DISTINCT CASE WHEN wr.status = 'อนุมัติแล้ว' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as approved_employee_names,
        GROUP_CONCAT(DISTINCT CASE WHEN wr.status = 'รออนุมัติ' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as pending_employee_names
       FROM (
         SELECT DATE_ADD(?, INTERVAL seq.seq DAY) as date
         FROM (
           SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
           SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
           SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
           SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
           SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION
           SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION
           SELECT 30 UNION SELECT 31
         ) seq
         WHERE DATE_ADD(?, INTERVAL seq.seq DAY) <= ?
       ) dates
       LEFT JOIN wfh_requests wr ON (
         wr.status IN ('อนุมัติแล้ว', 'รออนุมัติ')
         AND wr.deleted_at IS NULL
         AND DATE(dates.date) = DATE(wr.wfh_date)
       )
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
       GROUP BY dates.date
       ORDER BY wfh_date ASC`,
      [firstDayStr, firstDayStr, lastDayStr]
    )

    res.json({
      success: true,
      data: {
        current_month: {
          month: targetMonth,
          daily_stats: dailyStats,
        },
      },
    })
  } catch (error) {
    console.error('Get daily WFH statistics error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/wfh-requests
 * สร้างการขอ WFH ใหม่
 * Access: All
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { wfh_date } = req.body

    // Validation
    if (!wfh_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          wfh_date: 'Required',
        },
      })
    }

    // Get employee_id from user
    if (!req.user.employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID not found',
      })
    }

    const employeeId = req.user.employee_id

    // Validate date format
    const wfhDate = new Date(wfh_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(wfhDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      })
    }

    // Validate date (cannot be in the past)
    if (wfhDate < today) {
      return res.status(400).json({
        success: false,
        message: 'WFH date cannot be in the past',
      })
    }

    // Check if employee can request WFH (must work at least 3 months)
    const [employees] = await pool.execute(
      `SELECT hire_date, position 
       FROM employees 
       WHERE employee_id = ? AND deleted_at IS NULL`,
      [employeeId]
    )

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      })
    }

    const employee = employees[0]

    if (!canRequestWFH(employee.hire_date)) {
      return res.status(422).json({
        success: false,
        message: 'Cannot request WFH - Employee must work at least 3 months',
      })
    }

    // Check daily limit (max 3 people per day)
    const approvedCount = await getApprovedWFHCount(pool, wfh_date)
    if (approvedCount >= 3) {
      return res.status(409).json({
        success: false,
        message: 'Cannot request WFH - Daily limit reached (3/3)',
      })
    }

    // Check monthly limit
    const monthStr = wfh_date.substring(0, 7) // YYYY-MM
    const monthlyLimit = getWFHMonthlyLimit(employee.position)
    const usedThisMonth = await getMonthlyWFHCount(pool, employeeId, monthStr)

    if (usedThisMonth >= monthlyLimit) {
      return res.status(409).json({
        success: false,
        message: `Cannot request WFH - Monthly limit reached (${monthlyLimit}/${monthlyLimit})`,
      })
    }

    // Check if already requested for this date
    const [existingRequests] = await pool.execute(
      `SELECT id 
       FROM wfh_requests 
       WHERE employee_id = ? 
         AND wfh_date = ? 
         AND deleted_at IS NULL`,
      [employeeId, wfh_date]
    )

    if (existingRequests.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'WFH request already exists for this date',
      })
    }

    // Create WFH request
    const id = generateUUID()
    const requestDate = new Date().toISOString().split('T')[0] // Today

    // Determine initial status based on employee role
    let initialStatus = 'รออนุมัติ'
    if (['service', 'data_entry', 'data_entry_and_service'].includes(req.user.role)) {
      initialStatus = 'รอตรวจสอบ'
    } else if (req.user.role === 'audit') {
      initialStatus = 'รอโหวต'
    }

    await pool.execute(
      `INSERT INTO wfh_requests (
        id, employee_id, request_date, wfh_date, status
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, employeeId, requestDate, wfh_date, initialStatus]
    )

    // Get created WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.employee_id,
        DATE_FORMAT(wr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(wr.wfh_date, '%Y-%m-%d') as wfh_date,
        wr.status,
        DATE_FORMAT(wr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
       FROM wfh_requests wr
       WHERE wr.id = ?`,
      [id]
    )

    res.status(201).json({
      success: true,
      data: {
        wfh_request: wfhRequests[0],
      },
    })
  } catch (error) {
    console.error('Create WFH request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/wfh-requests/:id/vote
 * โหวตคำขอ WFH (เฉพาะทีม Audit)
 * Access: Audit only
 */
router.post('/:id/vote', authenticateToken, authorize('audit'), async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { id } = req.params
    const { vote } = req.body // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(vote)) {
      return res.status(400).json({ success: false, message: 'Invalid vote value' })
    }

    await connection.beginTransaction()

    // 1. Get request
    const [requests] = await connection.execute(
      `SELECT * FROM wfh_requests WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [id]
    )

    if (requests.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: 'WFH request not found' })
    }

    const request = requests[0]

    if (request.status !== 'รอโหวต') {
      await connection.rollback()
      return res.status(400).json({ success: false, message: 'Request is not in voting status' })
    }

    if (request.employee_id === req.user.employee_id) {
      await connection.rollback()
      return res.status(403).json({ success: false, message: 'Cannot vote on your own request' })
    }

    // 2. Record vote
    const voteId = generateUUID()
    await connection.execute(
      `INSERT INTO wfh_request_votes (id, request_id, voter_id, vote) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE vote = VALUES(vote)`,
      [voteId, id, req.user.id, vote]
    )

    // 3. Check total audit count
    const [auditUsers] = await connection.execute(
      `SELECT COUNT(*) as total FROM users WHERE role = 'audit' AND deleted_at IS NULL`
    )
    const totalAuditors = auditUsers[0].total - 1 // excluding the requester

    // 4. Count current votes
    const [voteCounts] = await connection.execute(
      `SELECT vote, COUNT(*) as count FROM wfh_request_votes WHERE request_id = ? GROUP BY vote`,
      [id]
    )

    let approveCount = 0
    let rejectCount = 0

    voteCounts.forEach(v => {
      if (v.vote === 'approve') approveCount = v.count
      if (v.vote === 'reject') rejectCount = v.count
    })

    let newStatus = request.status

    if (rejectCount >= Math.ceil(totalAuditors / 2)) {
      newStatus = 'ไม่อนุมัติ'
    } else if (approveCount > Math.floor(totalAuditors / 2)) {
      newStatus = 'รออนุมัติ (ผู้บริหาร)'
    }

    if (newStatus !== request.status) {
      await connection.execute(
        `UPDATE wfh_requests SET status = ? WHERE id = ?`,
        [newStatus, id]
      )
    }

    await connection.commit()
    invalidateCache('GET:/wfh-requests')

    res.json({
      success: true,
      message: 'Vote recorded',
      data: { status: newStatus, approveCount, rejectCount }
    })
  } catch (error) {
    await connection.rollback()
    console.error('Vote WFH request error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Already voted' })
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  } finally {
    connection.release()
  }
})

/**
 * PUT /api/wfh-requests/:id/approve
 * อนุมัติการขอ WFH (รองรับ 2 ขั้นตอนและสำหรับผู้บริหาร)
 * Access: Admin/HR/Audit
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr', 'audit'), async (req, res) => {
  try {
    const { id } = req.params
    const { approver_note } = req.body

    // Get WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT * FROM wfh_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (wfhRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'WFH request not found',
      })
    }

    const wfhRequest = wfhRequests[0]

    if (!['รออนุมัติ', 'รอตรวจสอบ', 'รออนุมัติ (ผู้บริหาร)'].includes(wfhRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'WFH request is not pending for approval',
      })
    }

    const isAudit = req.user.role === 'audit';
    const isAdmin = req.user.role === 'admin';
    const isHr = req.user.role === 'hr';

    let updateQuery = '';
    let updateParams = [];

    // Check daily limit if it's the final approval step
    if (wfhRequest.status === 'รออนุมัติ' || wfhRequest.status === 'รออนุมัติ (ผู้บริหาร)') {
      const approvedCount = await getApprovedWFHCount(pool, wfhRequest.wfh_date)
      if (approvedCount >= 3) {
        return res.status(409).json({
          success: false,
          message: 'Cannot approve - Daily limit reached (3/3)',
        })
      }
    }

    if (wfhRequest.status === 'รอตรวจสอบ') {
      if (!isAudit) {
        return res.status(403).json({ success: false, message: 'Only Audit can approve this step' });
      }
      updateQuery = `
        UPDATE wfh_requests 
        SET status = 'รออนุมัติ',
            step1_approved_by = ?,
            step1_approved_at = NOW(),
            step1_approver_note = ?
        WHERE id = ?`;
      updateParams = [req.user.id, approver_note || null, id];
    } else if (wfhRequest.status === 'รออนุมัติ (ผู้บริหาร)') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Only Admin can approve this step' });
      }
      updateQuery = `
        UPDATE wfh_requests 
        SET status = 'อนุมัติแล้ว',
            approved_by = ?,
            approved_at = NOW(),
            approver_note = ?
        WHERE id = ?`;
      updateParams = [req.user.id, approver_note || null, id];
    } else if (wfhRequest.status === 'รออนุมัติ') {
      if (!isAdmin && !isHr) {
        return res.status(403).json({ success: false, message: 'Only Admin or HR can approve this step' });
      }
      updateQuery = `
        UPDATE wfh_requests 
        SET status = 'อนุมัติแล้ว',
            approved_by = ?,
            approved_at = NOW(),
            approver_note = ?
        WHERE id = ?`;
      updateParams = [req.user.id, approver_note || null, id];
    }

    // Approve
    if (updateQuery) {
      await pool.execute(updateQuery, updateParams)
    }

    // Get updated WFH request
    const [updatedRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.status,
        wr.approved_by,
        DATE_FORMAT(wr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        wr.approver_note
       FROM wfh_requests wr
       WHERE wr.id = ?`,
      [id]
    )

    // Clear backend cache so next GET returns fresh data
    invalidateCache('GET:/wfh-requests')

    res.json({
      success: true,
      data: {
        wfh_request: updatedRequests[0],
      },
    })
  } catch (error) {
    console.error('Approve WFH request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/wfh-requests/:id/reject
 * ปฏิเสธการขอ WFH
 * Access: Admin/HR/Audit
 */
router.put('/:id/reject', authenticateToken, authorize('admin', 'hr', 'audit'), async (req, res) => {
  try {
    const { id } = req.params
    const { approver_note } = req.body

    // Validation: approver_note is required
    if (!approver_note || approver_note.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Approver note is required when rejecting',
        errors: {
          approver_note: 'Required',
        },
      })
    }

    // Get WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT * FROM wfh_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (wfhRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'WFH request not found',
      })
    }

    const wfhRequest = wfhRequests[0]

    if (!['รออนุมัติ', 'รอตรวจสอบ', 'รออนุมัติ (ผู้บริหาร)'].includes(wfhRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'WFH request is not pending',
      })
    }

    const isAudit = req.user.role === 'audit';
    const isAdmin = req.user.role === 'admin';
    const isHr = req.user.role === 'hr';

    if (wfhRequest.status === 'รอตรวจสอบ' && !isAudit) {
      return res.status(403).json({ success: false, message: 'Only Audit can reject this step' });
    }
    if (wfhRequest.status === 'รออนุมัติ (ผู้บริหาร)' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Admin can reject this step' });
    }
    if (wfhRequest.status === 'รออนุมัติ' && !isAdmin && !isHr) {
      return res.status(403).json({ success: false, message: 'Only Admin or HR can reject this step' });
    }

    // Reject
    await pool.execute(
      `UPDATE wfh_requests 
       SET status = 'ไม่อนุมัติ',
           approved_by = ?,
           approved_at = NOW(),
           approver_note = ?
       WHERE id = ?`,
      [req.user.id, approver_note, id]
    )

    // Get updated WFH request
    const [updatedRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.status,
        wr.approved_by,
        DATE_FORMAT(wr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        wr.approver_note
       FROM wfh_requests wr
       WHERE wr.id = ?`,
      [id]
    )

    // Clear backend cache so next GET returns fresh data
    invalidateCache('GET:/wfh-requests')

    res.json({
      success: true,
      data: {
        wfh_request: updatedRequests[0],
      },
    })
  } catch (error) {
    console.error('Reject WFH request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/wfh-requests/:id/work-report
 * ส่งรายงานการทำงาน
 * Access: All (own data only)
 */
router.put('/:id/work-report', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { work_report } = req.body

    // Validation
    if (!work_report || work_report.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Work report is required',
        errors: {
          work_report: 'Required',
        },
      })
    }

    // Get WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT * FROM wfh_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (wfhRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'WFH request not found',
      })
    }

    const wfhRequest = wfhRequests[0]

    // Check ownership
    if (wfhRequest.employee_id !== req.user.employee_id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You can only submit work report for your own WFH requests',
      })
    }

    // Check status
    if (wfhRequest.status !== 'อนุมัติแล้ว') {
      return res.status(400).json({
        success: false,
        message: 'Work report can only be submitted for approved WFH requests',
      })
    }

    // Check if WFH date is today or in the past (allow submission on WFH date)
    const wfhDate = new Date(wfhRequest.wfh_date)
    wfhDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (wfhDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Work report can only be submitted on or after WFH date',
      })
    }

    // Update work report
    await pool.execute(
      `UPDATE wfh_requests 
       SET work_report = ?,
           work_report_submitted_at = NOW()
       WHERE id = ?`,
      [work_report, id]
    )

    // Get updated WFH request
    const [updatedRequests] = await pool.execute(
      `SELECT 
        wr.id,
        wr.work_report,
        DATE_FORMAT(wr.work_report_submitted_at, '%Y-%m-%d %H:%i:%s') as work_report_submitted_at
       FROM wfh_requests wr
       WHERE wr.id = ?`,
      [id]
    )

    res.json({
      success: true,
      data: {
        wfh_request: updatedRequests[0],
      },
    })
  } catch (error) {
    console.error('Submit work report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/wfh-requests/:id
 * ลบการขอ WFH (Soft delete)
 * Access: Owner (if pending) / Admin / HR (any status)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userRole = req.user.role
    const employeeId = req.user.employee_id

    // Get WFH request
    const [wfhRequests] = await pool.execute(
      `SELECT * FROM wfh_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (wfhRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'WFH request not found or already deleted',
      })
    }

    const wfhRequest = wfhRequests[0]
    const isAdminOrHr = ['admin', 'hr'].includes(userRole)
    const isOwner = wfhRequest.employee_id === employeeId

    // Permission check
    if (!isAdminOrHr) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own requests',
        })
      }
      
      // Regular user can only delete pending requests
      const pendingStatuses = ['รอตรวจสอบ', 'รอโหวต', 'รออนุมัติ', 'รออนุมัติ (ผู้บริหาร)']
      if (!pendingStatuses.includes(wfhRequest.status)) {
        return res.status(400).json({
          success: false,
          message: 'You can only delete requests that are still pending',
        })
      }
    }

    // Perform Soft Delete
    await pool.execute(
      `UPDATE wfh_requests SET deleted_at = NOW() WHERE id = ?`,
      [id]
    )

    // Clear backend cache
    invalidateCache('GET:/wfh-requests')

    res.json({
      success: true,
      message: 'WFH request deleted successfully',
    })
  } catch (error) {
    console.error('Delete WFH request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router
