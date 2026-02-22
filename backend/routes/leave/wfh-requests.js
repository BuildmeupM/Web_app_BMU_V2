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
 * Access: HR/Admin only
 */
router.get('/pending', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      wfh_date,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Build WHERE clause for date filter
    const whereConditions = ['wr.status = ?', 'wr.deleted_at IS NULL']
    const queryParams = ['รออนุมัติ']

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
        e.position as employee_position
       FROM wfh_requests wr
       LEFT JOIN employees e ON wr.employee_id = e.employee_id
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
    const { month, year } = req.query
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
    // monthNum - 1 because JavaScript months are 0-indexed
    const firstDay = new Date(year, monthNum - 1, 1)
    // monthNum (not monthNum - 1) gives us the last day of the previous month
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
    // monthNum - 1 because JavaScript months are 0-indexed
    const firstDay = new Date(year, monthNum - 1, 1)
    // monthNum (not monthNum - 1) gives us the last day of the previous month
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
        COUNT(CASE WHEN wr.status = 'รออนุมัติ' THEN 1 END) as pending_count
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

    await pool.execute(
      `INSERT INTO wfh_requests (
        id, employee_id, request_date, wfh_date, status
      ) VALUES (?, ?, ?, ?, 'รออนุมัติ')`,
      [id, employeeId, requestDate, wfh_date]
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
 * PUT /api/wfh-requests/:id/approve
 * อนุมัติการขอ WFH
 * Access: HR/Admin only
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
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

    if (wfhRequest.status !== 'รออนุมัติ') {
      return res.status(400).json({
        success: false,
        message: 'WFH request is not pending',
      })
    }

    // Check daily limit before approving
    const approvedCount = await getApprovedWFHCount(pool, wfhRequest.wfh_date)
    if (approvedCount >= 3) {
      return res.status(409).json({
        success: false,
        message: 'Cannot approve - Daily limit reached (3/3)',
      })
    }

    // Approve
    await pool.execute(
      `UPDATE wfh_requests 
       SET status = 'อนุมัติแล้ว',
           approved_by = ?,
           approved_at = NOW(),
           approver_note = ?
       WHERE id = ?`,
      [req.user.id, approver_note || null, id]
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
 * Access: HR/Admin only
 */
router.put('/:id/reject', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
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

    if (wfhRequest.status !== 'รออนุมัติ') {
      return res.status(400).json({
        success: false,
        message: 'WFH request is not pending',
      })
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

export default router
