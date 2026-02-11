/**
 * Leave Requests Routes
 * Routes สำหรับการจัดการการลางาน
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { leaveRequestRateLimiter } from '../middleware/rateLimiter.js'
import {
  calculateWorkingDays,
  calculateWorkingDaysWithHolidays,
  generateUUID,
} from '../utils/leaveHelpers.js'

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
 * Access: HR/Admin only
 */
router.get('/pending', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Get total count
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM leave_requests 
       WHERE status = 'รออนุมัติ' AND deleted_at IS NULL`
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
        e.position as employee_position
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.employee_id
       WHERE lr.status = 'รออนุมัติ' AND lr.deleted_at IS NULL
       ORDER BY lr.request_date ASC, lr.created_at ASC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
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
        COUNT(CASE WHEN lr.status = 'รออนุมัติ' THEN 1 END) as pending_count
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
          COUNT(CASE WHEN lr.status = 'รออนุมัติ' THEN 1 END) as pending_count
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

    await pool.execute(
      `INSERT INTO leave_requests (
        id, employee_id, request_date, leave_start_date, leave_end_date,
        leave_type, leave_days, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'รออนุมัติ')`,
      [
        id,
        req.user.employee_id,
        requestDate,
        leave_start_date,
        leave_end_date,
        leave_type,
        leaveDays,
        reason || null,
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
 * PUT /api/leave-requests/:id/approve
 * อนุมัติการลา
 * Access: HR/Admin only
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
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

    if (leaveRequest.status !== 'รออนุมัติ') {
      return res.status(400).json({
        success: false,
        message: 'Leave request is not pending',
      })
    }

    // Approve
    await pool.execute(
      `UPDATE leave_requests 
       SET status = 'อนุมัติแล้ว',
           approved_by = ?,
           approved_at = NOW(),
           approver_note = ?
       WHERE id = ?`,
      [req.user.id, approver_note || null, id]
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

    if (leaveRequest.status !== 'รออนุมัติ') {
      return res.status(400).json({
        success: false,
        message: 'Leave request is not pending',
      })
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
