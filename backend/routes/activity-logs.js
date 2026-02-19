/**
 * Activity Logs Routes
 * API endpoints สำหรับดู activity log (Admin + Audit only)
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

// ทุก route ต้อง authenticate + admin/audit only
router.use(authenticateToken)
router.use(authorize('admin', 'audit'))

/**
 * GET /api/activity-logs/stats
 * สถิติรวมของ activity logs
 */
router.get('/stats', async (req, res) => {
    try {
        // จำนวน log วันนี้
        const [todayResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs WHERE DATE(created_at) = CURDATE()`
        )

        // จำนวน log สัปดาห์นี้
        const [weekResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
        )

        // จำนวน log เดือนนี้
        const [monthResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
        )

        // Active users วันนี้ (unique users ที่มี activity)
        const [activeUsersResult] = await pool.execute(
            `SELECT COUNT(DISTINCT user_id) as count FROM activity_logs 
       WHERE DATE(created_at) = CURDATE()`
        )

        // Top page วันนี้
        const [topPageResult] = await pool.execute(
            `SELECT page, COUNT(*) as count FROM activity_logs 
       WHERE DATE(created_at) = CURDATE()
       GROUP BY page ORDER BY count DESC LIMIT 1`
        )

        // จำนวนครั้ง correction (field_changed เป็น status และ new_value เป็น แก้ไข)
        const [correctionResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE new_value IN ('needs_correction', 'edit') 
       AND DATE(created_at) = CURDATE()`
        )

        res.json({
            success: true,
            data: {
                today: todayResult[0].count,
                thisWeek: weekResult[0].count,
                thisMonth: monthResult[0].count,
                activeUsersToday: activeUsersResult[0].count,
                topPage: topPageResult[0] || null,
                correctionsToday: correctionResult[0].count,
            },
        })
    } catch (error) {
        console.error('Error getting activity log stats:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/list
 * รายการ activity logs (pagination + filters)
 */
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const offset = (page - 1) * limit
        const { userId, pageName, action, startDate, endDate, build, search } = req.query

        let whereClause = 'WHERE 1=1'
        const params = []

        if (userId) {
            whereClause += ' AND al.user_id = ?'
            params.push(userId)
        }
        if (pageName) {
            whereClause += ' AND al.page = ?'
            params.push(pageName)
        }
        if (action) {
            whereClause += ' AND al.action = ?'
            params.push(action)
        }
        if (startDate) {
            whereClause += ' AND DATE(al.created_at) >= ?'
            params.push(startDate)
        }
        if (endDate) {
            whereClause += ' AND DATE(al.created_at) <= ?'
            params.push(endDate)
        }
        if (build) {
            whereClause += ' AND al.build = ?'
            params.push(build)
        }
        if (search) {
            whereClause += ' AND (al.company_name LIKE ? OR al.description LIKE ? OR al.user_name LIKE ?)'
            const searchTerm = `%${search}%`
            params.push(searchTerm, searchTerm, searchTerm)
        }

        // Count total
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
            params
        )
        const total = countResult[0].total

        // Get data
        const [logs] = await pool.execute(
            `SELECT al.id, al.user_id, al.employee_id, al.user_name, al.action, al.page,
              al.entity_type, al.entity_id, al.build, al.company_name, al.description,
              al.field_changed, al.old_value, al.new_value, al.metadata, al.ip_address,
              al.created_at
       FROM activity_logs al
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
            params
        )

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        })
    } catch (error) {
        console.error('Error getting activity logs:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/chart
 * ข้อมูลกราฟ activity (7 หรือ 30 วัน)
 */
router.get('/chart', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7

        const [chartData] = await pool.execute(
            `SELECT 
         DATE(created_at) as date,
         COUNT(*) as total,
         SUM(CASE WHEN action = 'status_update' THEN 1 ELSE 0 END) as status_updates,
         SUM(CASE WHEN action = 'form_submit' THEN 1 ELSE 0 END) as form_submits,
         SUM(CASE WHEN action = 'data_create' THEN 1 ELSE 0 END) as data_creates,
         SUM(CASE WHEN action = 'data_edit' THEN 1 ELSE 0 END) as data_edits
       FROM activity_logs 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
            [days]
        )

        // Page breakdown
        const [pageBreakdown] = await pool.execute(
            `SELECT page, COUNT(*) as count
       FROM activity_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY page
       ORDER BY count DESC`,
            [days]
        )

        res.json({
            success: true,
            data: { chartData, pageBreakdown },
        })
    } catch (error) {
        console.error('Error getting activity chart data:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/employee-summary
 * สรุปจำนวน activity รายพนักงาน
 */
router.get('/employee-summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30
        const pageName = req.query.page || null

        let whereClause = 'WHERE al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'
        const params = [days]

        if (pageName) {
            whereClause += ' AND al.page = ?'
            params.push(pageName)
        }

        const [summary] = await pool.execute(
            `SELECT 
         al.user_id,
         al.user_name,
         al.employee_id,
         COUNT(*) as total_actions,
         SUM(CASE WHEN al.action = 'status_update' THEN 1 ELSE 0 END) as status_updates,
         SUM(CASE WHEN al.action = 'form_submit' THEN 1 ELSE 0 END) as form_submits,
         SUM(CASE WHEN al.action = 'data_edit' THEN 1 ELSE 0 END) as data_edits,
         MAX(al.created_at) as last_activity
       FROM activity_logs al
       ${whereClause}
       GROUP BY al.user_id, al.user_name, al.employee_id
       ORDER BY total_actions DESC`,
            params
        )

        res.json({
            success: true,
            data: summary,
        })
    } catch (error) {
        console.error('Error getting employee summary:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/correction-summary
 * สรุปจำนวนครั้งที่งานถูกส่งกลับ "แก้ไข" รายพนักงาน
 * คือ จำนวนลูกค้าที่พนักงานคนนั้นรับผิดชอบ แล้วมีสถานะเปลี่ยนเป็น แก้ไข
 */
router.get('/correction-summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30

        // สรุปจำนวน correction grouped by คนที่ถูกแก้ไข (ดูจาก build → ดูว่าใครรับผิดชอบ)
        // แต่ในที่นี้เราดูจาก user ที่ทำการ update สถานะเป็น needs_correction/edit
        const [corrections] = await pool.execute(
            `SELECT 
         al.user_name,
         al.user_id,
         al.employee_id,
         COUNT(*) as correction_count,
         COUNT(DISTINCT al.build) as unique_companies,
         GROUP_CONCAT(DISTINCT al.build ORDER BY al.build SEPARATOR ', ') as affected_builds,
         MAX(al.created_at) as last_correction
       FROM activity_logs al
       WHERE al.new_value IN ('needs_correction', 'edit')
         AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY al.user_id, al.user_name, al.employee_id
       ORDER BY correction_count DESC`,
            [days]
        )

        // สรุปรวม
        const [totalResult] = await pool.execute(
            `SELECT COUNT(*) as total_corrections, 
              COUNT(DISTINCT build) as total_affected_companies
       FROM activity_logs 
       WHERE new_value IN ('needs_correction', 'edit')
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
            [days]
        )

        res.json({
            success: true,
            data: {
                corrections,
                summary: totalResult[0],
            },
        })
    } catch (error) {
        console.error('Error getting correction summary:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
