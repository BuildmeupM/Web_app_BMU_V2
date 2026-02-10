/**
 * Attendance Dashboard Routes
 * Routes สำหรับ Dashboard ข้อมูลเข้าออฟฟิศประจำวัน
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/attendance-dashboard
 * ดึงข้อมูล Dashboard การเข้าออฟฟิศประจำวัน
 * Access: All authenticated users
 * Query: date=YYYY-MM-DD (optional, default = today)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query
        const targetDate = date || new Date().toISOString().split('T')[0]
        const targetMonth = targetDate.substring(0, 7) // YYYY-MM

        // 1. Get all active employees
        const [employees] = await pool.execute(
            `SELECT 
        id,
        employee_id,
        first_name,
        nick_name,
        position,
        profile_image
      FROM employees
      WHERE status = 'active' AND deleted_at IS NULL
      ORDER BY first_name ASC`
        )

        // 2. Get employees on leave today (approved)
        const [onLeaveToday] = await pool.execute(
            `SELECT 
        lr.employee_id,
        lr.leave_type,
        e.first_name,
        e.nick_name,
        e.position
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.employee_id
      WHERE lr.status = 'อนุมัติแล้ว'
        AND ? BETWEEN lr.leave_start_date AND lr.leave_end_date
        AND lr.deleted_at IS NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL`,
            [targetDate]
        )

        // 3. Get employees WFH today (approved)
        const [wfhToday] = await pool.execute(
            `SELECT 
        wr.employee_id,
        e.first_name,
        e.nick_name,
        e.position
      FROM wfh_requests wr
      JOIN employees e ON wr.employee_id = e.employee_id
      WHERE wr.status = 'อนุมัติแล้ว'
        AND wr.wfh_date = ?
        AND wr.deleted_at IS NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL`,
            [targetDate]
        )

        // 4. Get birthdays this month
        const [birthdaysThisMonth] = await pool.execute(
            `SELECT 
        id,
        employee_id,
        first_name,
        nick_name,
        DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
        DAY(birth_date) as birth_day
      FROM employees
      WHERE status = 'active' AND deleted_at IS NULL
        AND birth_date IS NOT NULL
        AND MONTH(birth_date) = MONTH(?)
      ORDER BY DAY(birth_date) ASC`,
            [targetDate]
        )

        // 5. Get new hires (within 30 days from target date)
        const [newHires] = await pool.execute(
            `SELECT 
        id,
        employee_id,
        first_name,
        nick_name,
        position,
        DATE_FORMAT(hire_date, '%Y-%m-%d') as hire_date,
        DATEDIFF(?, hire_date) as days_since_hire
      FROM employees
      WHERE status = 'active' AND deleted_at IS NULL
        AND hire_date IS NOT NULL
        AND DATEDIFF(?, hire_date) >= 0
        AND DATEDIFF(?, hire_date) <= 30
      ORDER BY hire_date DESC`,
            [targetDate, targetDate, targetDate]
        )

        // 6. Get probation ending (within 30 days ahead)
        const [probationEnding] = await pool.execute(
            `SELECT 
        id,
        employee_id,
        first_name,
        nick_name,
        position,
        DATE_FORMAT(hire_date, '%Y-%m-%d') as hire_date,
        DATE_FORMAT(probation_end_date, '%Y-%m-%d') as probation_end_date,
        DATEDIFF(probation_end_date, ?) as days_remaining
      FROM employees
      WHERE status = 'active' AND deleted_at IS NULL
        AND probation_end_date IS NOT NULL
        AND probation_end_date BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
      ORDER BY probation_end_date ASC`,
            [targetDate, targetDate, targetDate]
        )

        // Build response
        const leaveSet = new Set(onLeaveToday.map(l => l.employee_id))
        const wfhSet = new Set(wfhToday.map(w => w.employee_id))

        // Build position summary
        const positionMap = new Map()
        employees.forEach(emp => {
            const pos = emp.position || 'ไม่ระบุ'
            if (!positionMap.has(pos)) {
                positionMap.set(pos, { position: pos, total: 0, office: 0, leave: 0, wfh: 0 })
            }
            const entry = positionMap.get(pos)
            entry.total++
            if (leaveSet.has(emp.employee_id)) {
                entry.leave++
            } else if (wfhSet.has(emp.employee_id)) {
                entry.wfh++
            } else {
                entry.office++
            }
        })

        const totalEmployees = employees.length
        const totalLeave = onLeaveToday.length
        const totalWfh = wfhToday.length
        const totalOffice = totalEmployees - totalLeave - totalWfh

        res.json({
            success: true,
            data: {
                date: targetDate,
                summary: {
                    total: totalEmployees,
                    office: totalOffice,
                    leave: totalLeave,
                    wfh: totalWfh,
                },
                by_position: Array.from(positionMap.values()),
                employees: employees.map(emp => ({
                    ...emp,
                    attendance_status: leaveSet.has(emp.employee_id)
                        ? 'leave'
                        : wfhSet.has(emp.employee_id)
                            ? 'wfh'
                            : 'office',
                    leave_type: onLeaveToday.find(l => l.employee_id === emp.employee_id)?.leave_type || null,
                })),
                on_leave_today: onLeaveToday,
                wfh_today: wfhToday,
                birthdays_this_month: birthdaysThisMonth,
                new_hires: newHires,
                probation_ending: probationEnding,
            },
        })
    } catch (error) {
        console.error('Get attendance dashboard error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    }
})

export default router
