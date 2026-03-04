/**
 * Leave Requests Routes
 * Routes สำหรับการจัดการการลางาน
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { leaveRequestRateLimiter } from '../../middleware/rateLimiter.js'
import { invalidateCache } from '../../middleware/cache.js'
import {
  calculateWorkingDaysWithHolidays,
  generateUUID,
} from '../../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/leave-requests
 * ดึงรายการการลาทั้งหมด
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      leave_type,
      start_date,
      end_date,
      search = '',
      employee_id,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Role-based access control
    const isHRorAdmin = req.user.role === 'admin'

    // Build WHERE clause
    const whereConditions = ['lr.deleted_at IS NULL']
    const queryParams = []

    // Employee access control
    if (!isHRorAdmin) {
      // Employee: ดึงเฉพาะข้อมูลของตัวเอง
      whereConditions.push('lr.employee_id = ?')
      queryParams.push(req.user.employee_id)
    } else if (employee_id) {
      // Admin: สามารถกรองตาม employee_id ได้
      whereConditions.push('lr.employee_id = ?')
      queryParams.push(employee_id)
    }

    // Filter by status
    if (status) {
      whereConditions.push('lr.status = ?')
      queryParams.push(status)
    }

    // Filter by leave_type
    if (leave_type) {
      whereConditions.push('lr.leave_type = ?')
      queryParams.push(leave_type)
    }

    // Filter by date range
    if (start_date) {
      whereConditions.push('lr.leave_start_date >= ?')
      queryParams.push(start_date)
    }
    if (end_date) {
      whereConditions.push('lr.leave_end_date <= ?')
      queryParams.push(end_date)
    }

    // Search by employee name or employee_id
    if (search) {
      whereConditions.push('(e.full_name LIKE ? OR lr.employee_id LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Get total count
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Get leave requests
    const [leaveRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.employee_id,
        DATE_FORMAT(lr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(lr.leave_start_date, '%Y-%m-%d') as leave_start_date,
        DATE_FORMAT(lr.leave_end_date, '%Y-%m-%d') as leave_end_date,
        lr.leave_type,
        lr.leave_days,
        lr.reason,
        lr.status,
        lr.approved_by,
        DATE_FORMAT(lr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        lr.approver_note,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(lr.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       ${whereClause}
       ORDER BY lr.request_date DESC, lr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: {
        leave_requests: leaveRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Get leave requests error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/leave-requests/pending
 * ดึงการลาที่รออนุมัติ
 * Access: HR/Admin/Audit only
 */
router.get('/pending', authenticateToken, authorize('admin', 'hr', 'audit'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const userRole = req.user.role;
    let whereClause = 'lr.deleted_at IS NULL';
    const queryParams = [];

    if (userRole === 'audit') {
      // Audit sees:
      // 1. 'รอตรวจสอบ' from service/data entry
      // 2. 'รอโหวต' from other audit (excluding themselves)
      // They also shouldn't see requests they have already voted on (will handle in next step or simple query)
      whereClause += ` AND (
        (lr.status = 'รอตรวจสอบ' AND u.role IN ('service', 'data_entry', 'data_entry_and_service')) 
        OR 
        (lr.status = 'รอโหวต' AND u.role = 'audit' AND lr.employee_id != ?)
      )`;
      queryParams.push(req.user.employee_id);
    } else if (userRole === 'hr') {
      // HR sees only 'รออนุมัติ'
      whereClause += ` AND lr.status = 'รออนุมัติ'`;
    } else if (userRole === 'admin') {
      // Admin sees 'รออนุมัติ' and 'รออนุมัติ (ผู้บริหาร)'
      whereClause += ` AND lr.status IN ('รออนุมัติ', 'รออนุมัติ (ผู้บริหาร)')`;
    }

    // Get total count
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       LEFT JOIN users u ON lr.employee_id = u.employee_id
       WHERE ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Get pending leave requests
    const [leaveRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.employee_id,
        DATE_FORMAT(lr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(lr.leave_start_date, '%Y-%m-%d') as leave_start_date,
        DATE_FORMAT(lr.leave_end_date, '%Y-%m-%d') as leave_end_date,
        lr.leave_type,
        lr.leave_days,
        lr.reason,
        lr.status,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        u.role as employee_role
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       LEFT JOIN users u ON lr.employee_id = u.employee_id
       WHERE ${whereClause}
       ORDER BY lr.request_date ASC, lr.created_at ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: {
        leave_requests: leaveRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('Get pending leave requests error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/leave-requests/:id
 * ดึงข้อมูลการลาตาม ID
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    // Build WHERE clause with access control
    let whereClause = 'WHERE lr.id = ? AND lr.deleted_at IS NULL'
    const params = [id]

    if (!isHRorAdmin) {
      whereClause += ' AND lr.employee_id = ?'
      params.push(req.user.employee_id)
    }

    // Get leave request
    const [leaveRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.employee_id,
        DATE_FORMAT(lr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(lr.leave_start_date, '%Y-%m-%d') as leave_start_date,
        DATE_FORMAT(lr.leave_end_date, '%Y-%m-%d') as leave_end_date,
        lr.leave_type,
        lr.leave_days,
        lr.reason,
        lr.status,
        lr.approved_by,
        DATE_FORMAT(lr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        lr.approver_note,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(lr.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        u.name as approver_name
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       LEFT JOIN users u ON lr.approved_by = u.id
       ${whereClause}`,
      params
    )

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      })
    }

    const leaveRequest = leaveRequests[0]

    res.json({
      success: true,
      data: {
        leave_request: leaveRequest,
      },
    })
  } catch (error) {
    console.error('Get leave request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/leave-requests/dashboard
 * ดึงข้อมูล Dashboard การลา
 * Access: All (own data) / HR/Admin (all)
 */
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const { employee_id, year } = req.query
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'
    const targetYear = year || new Date().getFullYear()
    const targetEmployeeId = isHRorAdmin ? employee_id : req.user.employee_id

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      })
    }

    // Get summary statistics
    const [summary] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        SUM(CASE WHEN status = 'อนุมัติแล้ว' THEN leave_days ELSE 0 END) as used_leave_days,
        COUNT(CASE WHEN status = 'รออนุมัติ' THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 'รออนุมัติ' THEN leave_days ELSE 0 END) as pending_leave_days
       FROM leave_requests
       WHERE employee_id = ?
         AND YEAR(leave_start_date) = ?
         AND deleted_at IS NULL`,
      [targetEmployeeId, targetYear]
    )

    // Get by type
    const [byType] = await pool.execute(
      `SELECT 
        leave_type,
        COUNT(*) as count,
        SUM(leave_days) as total_days
       FROM leave_requests
       WHERE employee_id = ?
         AND status = 'อนุมัติแล้ว'
         AND YEAR(leave_start_date) = ?
         AND deleted_at IS NULL
       GROUP BY leave_type`,
      [targetEmployeeId, targetYear]
    )

    // Get upcoming leaves (within 3 days)
    const [upcomingLeaves] = await pool.execute(
      `SELECT 
        lr.id,
        lr.employee_id,
        DATE_FORMAT(lr.leave_start_date, '%Y-%m-%d') as leave_start_date,
        DATE_FORMAT(lr.leave_end_date, '%Y-%m-%d') as leave_end_date,
        lr.leave_type,
        lr.leave_days,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       WHERE lr.status = 'อนุมัติแล้ว'
         AND lr.leave_start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND lr.deleted_at IS NULL
       ORDER BY lr.leave_start_date ASC
       LIMIT 20`,
      []
    )

    const summaryData = summary[0]
    const totalLeaveDays = 6 // Default - สามารถปรับได้ตาม policy

    res.json({
      success: true,
      data: {
        summary: {
          total_leave_days: totalLeaveDays,
          used_leave_days: parseFloat(summaryData.used_leave_days) || 0,
          remaining_leave_days: Math.max(0, totalLeaveDays - (parseFloat(summaryData.used_leave_days) || 0)),
          pending_leave_days: parseFloat(summaryData.pending_leave_days) || 0,
        },
        by_type: byType.reduce((acc, item) => {
          acc[item.leave_type] = {
            count: item.count,
            days: parseFloat(item.total_days) || 0,
          }
          return acc
        }, {}),
        upcoming_leaves: upcomingLeaves,
      },
    })
  } catch (error) {
    console.error('Get leave dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/leave-requests/dashboard/daily
 * ดึงข้อมูลการลาแบบรายวันสำหรับกราฟแท่ง
 * Access: HR/Admin only
 */
router.get('/dashboard/daily', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { month, compare_previous } = req.query
    const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

    if (!isHRorAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    // Parse month (YYYY-MM) or use current month
    let targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)

    // Get first and last day of target month
    const firstDay = new Date(year, monthNum - 1, 1)
    const lastDay = new Date(year, monthNum, 0)

    // Get daily leave statistics for target month
    // Count employees who are on leave each day (considering leave date ranges)
    const firstDayStr = firstDay.toISOString().split('T')[0]
    const lastDayStr = lastDay.toISOString().split('T')[0]

    const [dailyStats] = await pool.execute(
      `SELECT 
        dates.date as leave_date,
        COUNT(DISTINCT CASE WHEN lr.status = 'อนุมัติแล้ว' THEN lr.employee_id END) as approved_employee_count,
        COUNT(DISTINCT CASE WHEN lr.status = 'รออนุมัติ' THEN lr.employee_id END) as pending_employee_count,
        COUNT(CASE WHEN lr.status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        COUNT(CASE WHEN lr.status = 'รออนุมัติ' THEN 1 END) as pending_count,
        GROUP_CONCAT(DISTINCT CASE WHEN lr.status = 'อนุมัติแล้ว' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as approved_employee_names,
        GROUP_CONCAT(DISTINCT CASE WHEN lr.status = 'รออนุมัติ' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as pending_employee_names
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
       LEFT JOIN leave_requests lr ON (
         lr.status IN ('อนุมัติแล้ว', 'รออนุมัติ')
         AND lr.deleted_at IS NULL
         AND dates.date >= lr.leave_start_date
         AND dates.date <= lr.leave_end_date
       )
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       GROUP BY dates.date
       ORDER BY leave_date ASC`,
      [firstDayStr, firstDayStr, lastDayStr]
    )

    let previousMonthStats = []
    let prevYear = null
    let prevMonth = null

    // If compare_previous is true, get previous month data
    if (compare_previous === 'true') {
      prevMonth = monthNum === 1 ? 12 : monthNum - 1
      prevYear = monthNum === 1 ? year - 1 : year
      const prevFirstDay = new Date(prevYear, prevMonth - 1, 1)
      const prevLastDay = new Date(prevYear, prevMonth, 0)

      const prevFirstDayStr = prevFirstDay.toISOString().split('T')[0]
      const prevLastDayStr = prevLastDay.toISOString().split('T')[0]

      const [prevStats] = await pool.execute(
        `SELECT 
          dates.date as leave_date,
          COUNT(DISTINCT CASE WHEN lr.status = 'อนุมัติแล้ว' THEN lr.employee_id END) as approved_employee_count,
          COUNT(DISTINCT CASE WHEN lr.status = 'รออนุมัติ' THEN lr.employee_id END) as pending_employee_count,
          COUNT(CASE WHEN lr.status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
          COUNT(CASE WHEN lr.status = 'รออนุมัติ' THEN 1 END) as pending_count,
          GROUP_CONCAT(DISTINCT CASE WHEN lr.status = 'อนุมัติแล้ว' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as approved_employee_names,
          GROUP_CONCAT(DISTINCT CASE WHEN lr.status = 'รออนุมัติ' THEN CONCAT(e.full_name, COALESCE(CONCAT(' (', e.nick_name, ')'), '')) END SEPARATOR ', ') as pending_employee_names
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
         LEFT JOIN leave_requests lr ON (
           lr.status IN ('อนุมัติแล้ว', 'รออนุมัติ')
           AND lr.deleted_at IS NULL
           AND dates.date >= lr.leave_start_date
           AND dates.date <= lr.leave_end_date
         )
         LEFT JOIN employees e ON lr.employee_id = e.employee_id
         GROUP BY dates.date
         ORDER BY leave_date ASC`,
        [prevFirstDayStr, prevFirstDayStr, prevLastDayStr]
      )

      previousMonthStats = prevStats
    }

    res.json({
      success: true,
      data: {
        current_month: {
          month: targetMonth,
          daily_stats: dailyStats,
        },
        previous_month: compare_previous === 'true' && prevYear && prevMonth ? {
          month: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
          daily_stats: previousMonthStats,
        } : null,
      },
    })
  } catch (error) {
    console.error('Get daily leave statistics error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/leave-requests
 * สร้างการขอลาใหม่
 * Access: All
 * Fix 6: Rate limited to 5 requests per minute
 */
router.post('/', authenticateToken, leaveRequestRateLimiter, async (req, res) => {
  try {
    const {
      leave_start_date,
      leave_end_date,
      leave_type,
      reason,
    } = req.body

    // Validation
    if (!leave_start_date || !leave_end_date || !leave_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          leave_start_date: !leave_start_date ? 'Required' : undefined,
          leave_end_date: !leave_end_date ? 'Required' : undefined,
          leave_type: !leave_type ? 'Required' : undefined,
        },
      })
    }

    // Validate date format
    const startDate = new Date(leave_start_date)
    const endDate = new Date(leave_end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      })
    }

    // Validate dates
    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Leave start date cannot be in the past',
      })
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'Leave end date must be after start date',
      })
    }

    // Validate leave_type
    const validLeaveTypes = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาไม่รับค่าจ้าง', 'ลาอื่นๆ']
    if (!validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type',
      })
    }

    // Validate reason for specific types
    if ((leave_type === 'ลากิจ' || leave_type === 'ลาอื่นๆ') && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for this leave type',
      })
    }

    // Get employee_id from user
    if (!req.user.employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID not found',
      })
    }

    // Fix 2: Validate vacation leave eligibility (must work for at least 1 year)
    if (leave_type === 'ลาพักร้อน') {
      const [employees] = await pool.execute(
        `SELECT hire_date FROM employees WHERE employee_id = ? AND deleted_at IS NULL`,
        [req.user.employee_id]
      )

      if (employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน',
        })
      }

      const hireDate = employees[0].hire_date ? new Date(employees[0].hire_date) : null
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      if (!hireDate || hireDate > oneYearAgo) {
        return res.status(400).json({
          success: false,
          message: 'คุณต้องทำงานครบ 1 ปีขึ้นไปจึงจะสามารถขอลาพักร้อนได้',
        })
      }
    }

    // Fix 4: Fetch holidays to calculate working days excluding public holidays
    const [holidaysResult] = await pool.execute(
      `SELECT DATE_FORMAT(holiday_date, '%Y-%m-%d') as date
       FROM holidays
       WHERE is_active = TRUE
       AND deleted_at IS NULL
       AND holiday_date BETWEEN ? AND ?`,
      [leave_start_date, leave_end_date]
    )
    const holidayDates = holidaysResult.map(h => h.date)

    // Calculate leave days (excluding weekends AND holidays)
    const leaveDays = calculateWorkingDaysWithHolidays(leave_start_date, leave_end_date, holidayDates)

    if (leaveDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range หรือวันที่เลือกเป็นวันหยุดทั้งหมด',
      })
    }

    // Fix 3: Leave quota validation (Block if exceeded)
    const quotaLimits = {
      'ลาป่วย': 30,
      'ลากิจ': 6,
      'ลาพักร้อน': 6,
      'ลาไม่รับค่าจ้าง': null, // Unlimited
      'ลาอื่นๆ': null, // Unlimited
    }

    const quotaLimit = quotaLimits[leave_type]
    if (quotaLimit !== null) {
      const currentYear = new Date().getFullYear()
      const [usedDaysResult] = await pool.execute(
        `SELECT COALESCE(SUM(leave_days), 0) as used_days
         FROM leave_requests
         WHERE employee_id = ?
         AND leave_type = ?
         AND status = 'อนุมัติแล้ว'
         AND YEAR(leave_start_date) = ?
         AND deleted_at IS NULL`,
        [req.user.employee_id, leave_type, currentYear]
      )

      const usedDays = parseFloat(usedDaysResult[0].used_days) || 0
      const remainingDays = quotaLimit - usedDays

      if (leaveDays > remainingDays) {
        return res.status(400).json({
          success: false,
          message: `คุณมีสิทธิ์${leave_type}เหลือ ${remainingDays} วัน แต่ขอลา ${leaveDays} วัน กรุณาลดจำนวนวันลา`,
          errors: {
            quota_exceeded: true,
            leave_type: leave_type,
            quota_limit: quotaLimit,
            used_days: usedDays,
            remaining_days: remainingDays,
            requested_days: leaveDays,
          }
        })
      }
    }

    // Fix 5: Check for overlapping leave requests (duplicate check)
    const [existingLeaves] = await pool.execute(
      `SELECT id, leave_start_date, leave_end_date, leave_type, status
       FROM leave_requests 
       WHERE employee_id = ? 
       AND status IN ('รออนุมัติ', 'อนุมัติแล้ว')
       AND deleted_at IS NULL
       AND (
         (leave_start_date <= ? AND leave_end_date >= ?) OR
         (leave_start_date <= ? AND leave_end_date >= ?) OR
         (leave_start_date >= ? AND leave_end_date <= ?)
       )`,
      [
        req.user.employee_id,
        leave_end_date, leave_start_date,  // Check if existing overlaps with new
        leave_start_date, leave_start_date, // Check if new start is within existing
        leave_start_date, leave_end_date    // Check if existing is within new
      ]
    )

    if (existingLeaves.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'คุณมีการลาในช่วงวันที่นี้อยู่แล้ว กรุณาตรวจสอบรายการลาที่มีอยู่',
        errors: {
          overlapping_leaves: existingLeaves.map(leave => ({
            id: leave.id,
            start_date: leave.leave_start_date,
            end_date: leave.leave_end_date,
            type: leave.leave_type,
            status: leave.status
          }))
        }
      })
    }

    // Create leave request
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
      `INSERT INTO leave_requests (
        id, employee_id, request_date, leave_start_date, leave_end_date,
        leave_type, leave_days, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.employee_id,
        requestDate,
        leave_start_date,
        leave_end_date,
        leave_type,
        leaveDays,
        reason || null,
        initialStatus,
      ]
    )

    // Get created leave request
    const [leaveRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.employee_id,
        DATE_FORMAT(lr.request_date, '%Y-%m-%d') as request_date,
        DATE_FORMAT(lr.leave_start_date, '%Y-%m-%d') as leave_start_date,
        DATE_FORMAT(lr.leave_end_date, '%Y-%m-%d') as leave_end_date,
        lr.leave_type,
        lr.leave_days,
        lr.reason,
        lr.status,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
       FROM leave_requests lr
       WHERE lr.id = ?`,
      [id]
    )

    res.status(201).json({
      success: true,
      data: {
        leave_request: leaveRequests[0],
      },
    })
  } catch (error) {
    console.error('Create leave request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/leave-requests/:id/vote
 * โหวตคำขอลา (เฉพาะทีม Audit)
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
      `SELECT * FROM leave_requests WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [id]
    )

    if (requests.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: 'Leave request not found' })
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
      `INSERT INTO leave_request_votes (id, request_id, voter_id, vote) 
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
      `SELECT vote, COUNT(*) as count FROM leave_request_votes WHERE request_id = ? GROUP BY vote`,
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
      // Majority rejected or half rejected (which means it can't get majority approval)
      newStatus = 'ไม่อนุมัติ'
    } else if (approveCount > Math.floor(totalAuditors / 2)) {
      // Majority approved
      newStatus = 'รออนุมัติ (ผู้บริหาร)'
    }

    if (newStatus !== request.status) {
      await connection.execute(
        `UPDATE leave_requests SET status = ? WHERE id = ?`,
        [newStatus, id]
      )
    }

    await connection.commit()
    invalidateCache('GET:/leave-requests')

    res.json({
      success: true,
      message: 'Vote recorded',
      data: { status: newStatus, approveCount, rejectCount }
    })
  } catch (error) {
    await connection.rollback()
    console.error('Vote leave request error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Already voted' })
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  } finally {
    connection.release()
  }
})

/**
 * PUT /api/leave-requests/:id/approve
 * อนุมัติการลา (รองรับ 2 ขั้นตอนและสำหรับผู้บริหาร)
 * Access: Admin/HR/Audit
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr', 'audit'), async (req, res) => {
  try {
    const { id } = req.params
    const { approver_note } = req.body

    // Get leave request
    const [leaveRequests] = await pool.execute(
      `SELECT * FROM leave_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      })
    }

    const leaveRequest = leaveRequests[0]

    if (!['รออนุมัติ', 'รอตรวจสอบ', 'รออนุมัติ (ผู้บริหาร)'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Leave request is not pending for approval',
      })
    }

    const isAudit = req.user.role === 'audit';
    const isAdmin = req.user.role === 'admin';
    const isHr = req.user.role === 'hr';

    let updateQuery = '';
    let updateParams = [];

    if (leaveRequest.status === 'รอตรวจสอบ') {
      if (!isAudit) {
        return res.status(403).json({ success: false, message: 'Only Audit can approve this step' });
      }
      updateQuery = `
        UPDATE leave_requests 
        SET status = 'รออนุมัติ',
            step1_approved_by = ?,
            step1_approved_at = NOW(),
            step1_approver_note = ?
        WHERE id = ?`;
      updateParams = [req.user.id, approver_note || null, id];
    } else if (leaveRequest.status === 'รออนุมัติ (ผู้บริหาร)') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Only Admin can approve this step' });
      }
      updateQuery = `
        UPDATE leave_requests 
        SET status = 'อนุมัติแล้ว',
            approved_by = ?,
            approved_at = NOW(),
            approver_note = ?
        WHERE id = ?`;
      updateParams = [req.user.id, approver_note || null, id];
    } else if (leaveRequest.status === 'รออนุมัติ') {
      if (!isAdmin && !isHr) {
        return res.status(403).json({ success: false, message: 'Only Admin or HR can approve this step' });
      }
      updateQuery = `
        UPDATE leave_requests 
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

    // Get updated leave request
    const [updatedRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.status,
        lr.approved_by,
        DATE_FORMAT(lr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        lr.approver_note
       FROM leave_requests lr
       WHERE lr.id = ?`,
      [id]
    )

    // Clear backend cache so next GET returns fresh data
    invalidateCache('GET:/leave-requests')

    res.json({
      success: true,
      data: {
        leave_request: updatedRequests[0],
      },
    })
  } catch (error) {
    console.error('Approve leave request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/leave-requests/:id/reject
 * ปฏิเสธการลา
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

    // Get leave request
    const [leaveRequests] = await pool.execute(
      `SELECT * FROM leave_requests WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      })
    }

    const leaveRequest = leaveRequests[0]

    if (!['รออนุมัติ', 'รอตรวจสอบ', 'รออนุมัติ (ผู้บริหาร)'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Leave request is not pending',
      })
    }

    const isAudit = req.user.role === 'audit';
    const isAdmin = req.user.role === 'admin';
    const isHr = req.user.role === 'hr';

    if (leaveRequest.status === 'รอตรวจสอบ' && !isAudit) {
      return res.status(403).json({ success: false, message: 'Only Audit can reject this step' });
    }
    if (leaveRequest.status === 'รออนุมัติ (ผู้บริหาร)' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Admin can reject this step' });
    }
    if (leaveRequest.status === 'รออนุมัติ' && !isAdmin && !isHr) {
      return res.status(403).json({ success: false, message: 'Only Admin or HR can reject this step' });
    }

    // Reject
    await pool.execute(
      `UPDATE leave_requests 
       SET status = 'ไม่อนุมัติ',
           approved_by = ?,
           approved_at = NOW(),
           approver_note = ?
       WHERE id = ?`,
      [req.user.id, approver_note, id]
    )

    // Get updated leave request
    const [updatedRequests] = await pool.execute(
      `SELECT 
        lr.id,
        lr.status,
        lr.approved_by,
        DATE_FORMAT(lr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        lr.approver_note
       FROM leave_requests lr
       WHERE lr.id = ?`,
      [id]
    )

    // Clear backend cache so next GET returns fresh data
    invalidateCache('GET:/leave-requests')

    res.json({
      success: true,
      data: {
        leave_request: updatedRequests[0],
      },
    })
  } catch (error) {
    console.error('Reject leave request error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router
