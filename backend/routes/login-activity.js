/**
 * Login Activity Routes
 * API endpoints สำหรับดูข้อมูล login/logout activity (Admin only)
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

// ทุก route ต้อง authenticate + admin only
router.use(authenticateToken)
router.use(authorize('admin'))

/**
 * GET /api/login-activity/stats
 * สถิติรวมของการ login/logout
 */
router.get('/stats', async (req, res) => {
  try {
    // Login สำเร็จวันนี้
    const [loginToday] = await pool.execute(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE success = TRUE AND DATE(attempted_at) = CURDATE()`
    )

    // Login ล้มเหลววันนี้
    const [failedToday] = await pool.execute(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE success = FALSE AND DATE(attempted_at) = CURDATE()`
    )

    // Users ที่ online อยู่ (active session + heartbeat ภายใน 5 นาที)
    const [onlineUsers] = await pool.execute(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_sessions 
       WHERE session_status = 'active' 
         AND last_active_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    )

    // Average session duration (วันนี้, เฉพาะ sessions ที่ logout แล้ว)
    const [avgDuration] = await pool.execute(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, login_at, logout_at)) as avg_minutes 
       FROM user_sessions 
       WHERE session_status = 'logged_out' 
         AND DATE(login_at) = CURDATE()`
    )

    // Total login attempts ทั้งหมด
    const [totalAttempts] = await pool.execute(
      `SELECT COUNT(*) as count FROM login_attempts`
    )

    // Unique users ที่ login วันนี้
    const [uniqueUsers] = await pool.execute(
      `SELECT COUNT(DISTINCT username) as count FROM login_attempts 
       WHERE success = TRUE AND DATE(attempted_at) = CURDATE()`
    )

    res.json({
      success: true,
      data: {
        loginToday: loginToday[0].count,
        failedToday: failedToday[0].count,
        onlineUsers: onlineUsers[0].count,
        avgSessionMinutes: Math.round(avgDuration[0].avg_minutes || 0),
        totalAttempts: totalAttempts[0].count,
        uniqueUsersToday: uniqueUsers[0].count,
      },
    })
  } catch (error) {
    console.error('Error getting login activity stats:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/login-activity/attempts
 * รายการ login attempts (pagination + filters)
 */
router.get('/attempts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const { username, success, startDate, endDate, sortBy, sortOrder } = req.query

    // Sorting — whitelist columns to prevent SQL injection
    const allowedSortColumns = {
      attempted_at: 'la.attempted_at',
      username: 'la.username',
      success: 'la.success',
      ip_address: 'la.ip_address',
    }
    const sortColumn = allowedSortColumns[sortBy] || 'la.attempted_at'
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC'

    let whereClause = 'WHERE 1=1'
    const params = []

    if (username) {
      whereClause += ' AND la.username LIKE ?'
      params.push(`%${username}%`)
    }

    if (success !== undefined && success !== '') {
      whereClause += ' AND la.success = ?'
      params.push(success === 'true' || success === '1' ? 1 : 0)
    }

    if (startDate) {
      whereClause += ' AND la.attempted_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ' AND la.attempted_at <= ?'
      params.push(endDate + ' 23:59:59')
    }

    // Count total
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM login_attempts la ${whereClause}`,
      params
    )
    const total = countResult[0].total

    // Get data
    const [attempts] = await pool.execute(
      `SELECT la.id, la.user_id, la.username, la.ip_address, la.user_agent,
              la.success, la.failure_reason, la.attempted_at,
              u.name as user_name, u.nick_name
       FROM login_attempts la
       LEFT JOIN users u ON la.user_id = u.id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    )

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error getting login attempts:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/login-activity/online-users
 * รายชื่อ users ที่ online อยู่
 */
router.get('/online-users', async (req, res) => {
  try {
    const [onlineUsers] = await pool.execute(
      `SELECT us.user_id, us.username, us.login_at, us.last_active_at,
              us.ip_address, us.user_agent,
              u.name as user_name, u.nick_name, u.role,
              TIMESTAMPDIFF(MINUTE, us.login_at, NOW()) as session_duration_minutes
       FROM user_sessions us
       INNER JOIN (
         SELECT user_id, MAX(login_at) as latest_login
         FROM user_sessions
         WHERE session_status = 'active'
           AND last_active_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         GROUP BY user_id
       ) latest ON us.user_id = latest.user_id AND us.login_at = latest.latest_login
       LEFT JOIN users u ON us.user_id = u.id
       WHERE us.session_status = 'active'
       ORDER BY us.last_active_at DESC`
    )

    res.json({
      success: true,
      data: {
        users: onlineUsers,
        count: onlineUsers.length,
      },
    })
  } catch (error) {
    console.error('Error getting online users:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/login-activity/chart
 * ข้อมูลกราฟ 7 วันล่าสุด
 */
router.get('/chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7

    const [chartData] = await pool.execute(
      `SELECT 
         DATE(attempted_at) as date,
         SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as success_count,
         SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed_count,
         COUNT(*) as total_count
       FROM login_attempts
       WHERE attempted_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(attempted_at)
       ORDER BY date ASC`,
      [String(days)]
    )

    res.json({
      success: true,
      data: chartData,
    })
  } catch (error) {
    console.error('Error getting chart data:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/login-activity/heartbeat
 * Heartbeat จาก frontend — ทุก authenticated user (ไม่จำกัด admin)
 * อัพเดท last_active_at ใน user_sessions
 */
router.use('/heartbeat', (req, res, next) => {
  // Override authorize middleware สำหรับ heartbeat เท่านั้น
  // ให้ทุก authenticated user ใช้ได้
  next()
})

// ต้องสร้าง route แยกที่ไม่ผ่าน authorize('admin')
// จะย้ายไปอยู่ข้างล่าง

/**
 * GET /api/login-activity/session-summary?date=YYYY-MM-DD
 * สรุปเวลาใช้งานรายวันของพนักงานแต่ละคน
 * ถ้าไม่ส่ง date → ใช้วันนี้
 */
router.get('/session-summary', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    const [rows] = await pool.execute(
      `SELECT 
         us.user_id,
         us.username,
         u.name as user_name,
         u.nick_name,
         COUNT(*) as session_count,
         SUM(
           TIMESTAMPDIFF(MINUTE, us.login_at, 
             CASE 
               WHEN us.logout_at IS NOT NULL THEN us.logout_at
               WHEN us.session_status = 'active' THEN NOW()
               ELSE us.last_active_at
             END
           )
         ) as total_minutes,
         MIN(us.login_at) as first_login,
         MAX(COALESCE(us.last_active_at, us.login_at)) as last_activity,
         MAX(CASE WHEN us.session_status = 'active' THEN 1 ELSE 0 END) as is_online
       FROM user_sessions us
       LEFT JOIN users u ON us.user_id = u.id
       WHERE DATE(us.login_at) = ?
       GROUP BY us.user_id, us.username, u.name, u.nick_name
       ORDER BY total_minutes DESC`,
      [date]
    )

    res.json({
      success: true,
      data: {
        date,
        summary: rows,
        totalUsers: rows.length,
      },
    })
  } catch (error) {
    console.error('Error getting session summary:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/login-activity/session-history?date=YYYY-MM-DD
 * ประวัติ login/logout ของพนักงานแต่ละคนในวันที่เลือก
 * return array ของ users พร้อม sessions
 */
router.get('/session-history', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    const [sessions] = await pool.execute(
      `SELECT 
         us.id as session_id,
         us.user_id,
         us.username,
         u.name as user_name,
         u.nick_name,
         us.login_at,
         us.logout_at,
         us.last_active_at,
         us.session_status,
         us.ip_address,
         TIMESTAMPDIFF(MINUTE, us.login_at,
           CASE 
             WHEN us.logout_at IS NOT NULL THEN us.logout_at
             WHEN us.session_status = 'active' THEN NOW()
             ELSE us.last_active_at
           END
         ) as duration_minutes
       FROM user_sessions us
       LEFT JOIN users u ON us.user_id = u.id
       WHERE DATE(us.login_at) = ?
       ORDER BY us.username, us.login_at DESC`,
      [date]
    )

    // Group sessions by user
    const usersMap = new Map()
    for (const s of sessions) {
      const key = s.user_id || s.username
      if (!usersMap.has(key)) {
        usersMap.set(key, {
          user_id: s.user_id,
          username: s.username,
          user_name: s.user_name,
          nick_name: s.nick_name,
          sessions: [],
        })
      }
      usersMap.get(key).sessions.push({
        session_id: s.session_id,
        login_at: s.login_at,
        logout_at: s.logout_at,
        last_active_at: s.last_active_at,
        session_status: s.session_status,
        ip_address: s.ip_address,
        duration_minutes: s.duration_minutes,
      })
    }

    const users = Array.from(usersMap.values())

    res.json({
      success: true,
      data: {
        date,
        users,
        totalUsers: users.length,
        totalSessions: sessions.length,
      },
    })
  } catch (error) {
    console.error('Error getting session history:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/login-activity/external-ips
 * ดึง login attempts ทั้งหมดที่มาจาก IP ภายนอก
 */
const KNOWN_INTERNAL_IPS = ['171.7.95.152', '110.169.43.81', '127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']

router.get('/external-ips', async (req, res) => {
  try {
    const { today } = req.query
    const placeholders = KNOWN_INTERNAL_IPS.map(() => '?').join(',')

    let dateFilter = ''
    if (today === 'true') {
      dateFilter = 'AND DATE(la.attempted_at) = CURDATE()'
    }

    const [attempts] = await pool.execute(
      `SELECT la.id, la.user_id, la.username, la.ip_address, la.user_agent,
              la.success, la.failure_reason, la.attempted_at,
              u.name as user_name, u.nick_name
       FROM login_attempts la
       LEFT JOIN users u ON la.user_id = u.id
       WHERE la.ip_address IS NOT NULL 
         AND la.ip_address != ''
         AND la.ip_address NOT IN (${placeholders})
         ${dateFilter}
       ORDER BY la.attempted_at DESC
       LIMIT 200`,
      KNOWN_INTERNAL_IPS
    )

    res.json({
      success: true,
      data: {
        attempts,
        count: attempts.length,
      },
    })
  } catch (error) {
    console.error('Error getting external IP attempts:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/login-activity/attempts/:id
 * ลบ login attempt รายการเดียว
 */
router.delete('/attempts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.execute(
      'DELETE FROM login_attempts WHERE id = ?',
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการที่ต้องการลบ',
      })
    }
    res.json({ success: true, message: 'ลบรายการสำเร็จ' })
  } catch (error) {
    console.error('Error deleting login attempt:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/login-activity/attempts
 * ลบ login attempts หลายรายการ (ส่ง ids[] หรือ ลบทั้งหมด)
 * Body: { ids: string[] } หรือ { deleteAll: true, beforeDate?: string }
 */
router.delete('/attempts', async (req, res) => {
  try {
    const { ids, deleteAll, beforeDate } = req.body

    if (deleteAll) {
      let query = 'DELETE FROM login_attempts'
      const params = []
      if (beforeDate) {
        query += ' WHERE attempted_at <= ?'
        params.push(beforeDate + ' 23:59:59')
      }
      const [result] = await pool.execute(query, params)
      return res.json({
        success: true,
        message: `ลบ ${result.affectedRows} รายการสำเร็จ`,
        deletedCount: result.affectedRows,
      })
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await pool.execute(
        `DELETE FROM login_attempts WHERE id IN (${placeholders})`,
        ids
      )
      return res.json({
        success: true,
        message: `ลบ ${result.affectedRows} รายการสำเร็จ`,
        deletedCount: result.affectedRows,
      })
    }

    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ ids หรือ deleteAll',
    })
  } catch (error) {
    console.error('Error deleting login attempts:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router

/**
 * Heartbeat Router — แยกออกมาเพราะไม่ต้อง admin
 * ให้ทุก authenticated user ส่ง heartbeat ได้
 */
export const heartbeatRouter = express.Router()

heartbeatRouter.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId } = req.body

    // ── ตรวจสอบว่า session ยังเป็น active อยู่ไหม (ป้องกัน login ซ้อน) ──
    if (sessionId) {
      const [sessions] = await pool.execute(
        `SELECT session_status FROM user_sessions WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
      )

      if (sessions.length > 0 && sessions[0].session_status === 'forced_logout') {
        // Session ถูกปิดเพราะ login จากที่อื่น
        return res.json({
          success: true,
          sessionStatus: 'forced_logout',
          message: 'Session was terminated due to login from another location',
        })
      }

      // อัพเดท specific session
      await pool.execute(
        `UPDATE user_sessions 
         SET last_active_at = NOW() 
         WHERE id = ? AND user_id = ? AND session_status = 'active'`,
        [sessionId, userId]
      )
    } else {
      // อัพเดท latest active session ของ user
      await pool.execute(
        `UPDATE user_sessions 
         SET last_active_at = NOW() 
         WHERE user_id = ? AND session_status = 'active'
         ORDER BY login_at DESC
         LIMIT 1`,
        [userId]
      )
    }

    // Mark expired sessions (ไม่มี heartbeat > 30 นาที)
    await pool.execute(
      `UPDATE user_sessions 
       SET session_status = 'expired', logout_at = last_active_at
       WHERE session_status = 'active' 
         AND last_active_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
    )

    res.json({ success: true, sessionStatus: 'active' })
  } catch (error) {
    console.error('Error processing heartbeat:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})
