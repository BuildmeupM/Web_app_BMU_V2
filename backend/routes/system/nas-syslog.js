import express from 'express'
import pool from '../../config/database.js'

const router = express.Router()

/**
 * GET /api/nas-syslog
 * Query historical NAS syslog logs with filters + pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      event,
      user,
      page = 1,
      limit = 50,
    } = req.query

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
    const offset = (pageNum - 1) * limitNum

    let where = '1=1'
    const params = []

    if (startDate) {
      where += ' AND timestamp >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND timestamp <= ?'
      params.push(`${endDate} 23:59:59`)
    }
    if (event) {
      where += ' AND event = ?'
      params.push(event)
    }
    if (user) {
      where += ' AND user LIKE ?'
      params.push(`%${user}%`)
    }

    // Count total matching rows
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM nas_syslog WHERE ${where}`,
      params
    )

    // Fetch paginated rows
    const [rows] = await pool.query(
      `SELECT id, timestamp, severity, service, event, user, ip, file_type, size, path
       FROM nas_syslog
       WHERE ${where}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('❌ [NAS Syslog] Query error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to query syslog data' })
  }
})

/**
 * GET /api/nas-syslog/stats
 * Summary statistics: total count, breakdown by event and top users
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let where = '1=1'
    const params = []

    if (startDate) {
      where += ' AND timestamp >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND timestamp <= ?'
      params.push(`${endDate} 23:59:59`)
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM nas_syslog WHERE ${where}`,
      params
    )

    const [byEvent] = await pool.query(
      `SELECT event, COUNT(*) AS count
       FROM nas_syslog WHERE ${where}
       GROUP BY event ORDER BY count DESC`,
      params
    )

    const [byUser] = await pool.query(
      `SELECT user, COUNT(*) AS count
       FROM nas_syslog WHERE ${where}
       GROUP BY user ORDER BY count DESC LIMIT 20`,
      params
    )

    res.json({
      success: true,
      data: { total, byEvent, byUser },
    })
  } catch (error) {
    console.error('❌ [NAS Syslog] Stats error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to get syslog stats' })
  }
})

export default router
