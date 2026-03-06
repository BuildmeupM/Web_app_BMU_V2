/**
 * Notifications Routes
 * Routes สำหรับการจัดการ notifications
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/notifications
 * ดึงรายการ notifications ของ user ที่ล็อกอินอยู่
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id // ใช้ req.user.id แทน req.user.userId
    const { is_read, limit = 50 } = req.query

    // Validate userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found',
      })
    }

    // Build WHERE clause
    const whereConditions = ['n.deleted_at IS NULL', 'n.user_id = ?']
    const queryParams = [userId]

    // Filter by read status
    if (is_read !== undefined && is_read !== null) {
      whereConditions.push('n.is_read = ?')
      queryParams.push(is_read === 'true' ? 1 : 0)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Validate และ parse limit
    const limitValue = limit ? parseInt(limit, 10) : 50
    const finalLimit = isNaN(limitValue) || limitValue <= 0 ? 50 : limitValue

    // ✅ PERFORMANCE: Combined query - Get notifications + unread count in single query
    // Using subquery to get unread_count alongside notifications data
    const [notifications] = await pool.execute(
      `SELECT 
        n.id,
        n.user_id,
        n.type,
        n.category,
        n.priority,
        n.title,
        n.message,
        n.icon,
        n.color,
        n.action_url,
        n.action_label,
        n.related_user_id,
        n.related_entity_type,
        n.related_entity_id,
        n.metadata,
        n.is_read,
        n.read_at,
        n.expires_at,
        n.created_at,
        n.updated_at,
        u.username AS related_username,
        u.name AS related_user_name,
        (SELECT COUNT(*) FROM notifications n2 
         WHERE n2.deleted_at IS NULL 
           AND n2.user_id = ? 
           AND n2.is_read = FALSE
           AND (n2.expires_at IS NULL OR n2.expires_at > NOW())
        ) AS _unread_count
      FROM notifications n
      LEFT JOIN users u ON n.related_user_id = u.id
      ${whereClause}
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
      ORDER BY 
        CASE n.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END ASC,
        n.is_read ASC,
        n.created_at DESC
      LIMIT ?`,
      [userId, ...queryParams, finalLimit]
    )

    // Extract unread_count from first result (same for all rows in subquery)
    const unreadCount = notifications.length > 0 ? notifications[0]._unread_count : 0

    // Parse metadata JSON for each notification and add sorting fields
    const parsedNotifications = notifications.map((notification) => {
      // ✅ CLEANUP: Remove internal fields from response
      delete notification._unread_count

      if (notification.metadata) {
        try {
          notification.metadata = JSON.parse(notification.metadata)
        } catch (e) {
          notification.metadata = null
        }
      }
      // Extract company name from metadata or message for sorting
      if (notification.metadata && notification.metadata.company_name) {
        notification._sortCompanyName = notification.metadata.company_name
      } else {
        // Fallback: Extract from message
        // Format: "บริษัท {companyName} ({build}) - {taxType} เดือน {month}/{year} สถานะ: {status}"
        // หรือ "บริษัท {companyName} ({build}) - ภ.ง.ด. เดือน {month}/{year}\nสถานะ: {status}\n..."
        const message = notification.message || ''
        const companyMatch = message.match(/บริษัท\s+([^(]+)\s*\(/)
        notification._sortCompanyName = companyMatch ? companyMatch[1].trim() : ''
      }
      // Extract status from message for sorting
      // Format: "สถานะ: {status}" (อาจอยู่ในบรรทัดเดียวกับ company name หรือบรรทัดใหม่)
      // Examples:
      // - "บริษัท XXX (001) - ภ.ง.ด. เดือน 1/2026 สถานะ: รอตรวจ"
      // - "บริษัท XXX (001) - ภ.ง.ด. เดือน 1/2026\nสถานะ: รอตรวจ"
      const message = notification.message || ''
      const statusMatch = message.match(/สถานะ:\s*([^\n]+)/)
      notification._sortStatus = statusMatch ? statusMatch[1].trim() : ''
      return notification
    })

    // Sort by company name and status (after priority and is_read)
    parsedNotifications.sort((a, b) => {
      // First sort by company name
      if (a._sortCompanyName && b._sortCompanyName) {
        const companyCompare = a._sortCompanyName.localeCompare(b._sortCompanyName, 'th')
        if (companyCompare !== 0) return companyCompare
      } else if (a._sortCompanyName && !b._sortCompanyName) {
        return -1
      } else if (!a._sortCompanyName && b._sortCompanyName) {
        return 1
      }
      // Then sort by status
      if (a._sortStatus && b._sortStatus) {
        return a._sortStatus.localeCompare(b._sortStatus, 'th')
      } else if (a._sortStatus && !b._sortStatus) {
        return -1
      } else if (!a._sortStatus && b._sortStatus) {
        return 1
      }
      return 0
    })

    res.json({
      success: true,
      data: parsedNotifications,
      unread_count: unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูล notifications ได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/notifications
 * สร้าง notification ใหม่
 * Access: Admin only (หรือ system)
 */
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const {
      user_id,
      type,
      category,
      priority = 'medium',
      title,
      message,
      icon,
      color,
      action_url,
      action_label,
      related_user_id,
      related_entity_type,
      related_entity_id,
      metadata,
      expires_at,
    } = req.body

    // Validation
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      })
    }

    // Generate UUID
    const id = generateUUID()

    // Insert notification (รองรับ fields ใหม่ทั้งหมด)
    await pool.execute(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message, icon, color,
        action_url, action_label, related_user_id, related_entity_type,
        related_entity_id, metadata, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id,
        type,
        category || null,
        priority,
        title,
        message,
        icon || null,
        color || null,
        action_url || null,
        action_label || null,
        related_user_id || null,
        related_entity_type || null,
        related_entity_id || null,
        metadata ? JSON.stringify(metadata) : null,
        expires_at || null,
      ]
    )

    // Get created notification (รวม fields ใหม่ทั้งหมด)
    const [newNotifications] = await pool.execute(
      `SELECT 
        n.id,
        n.user_id,
        n.type,
        n.category,
        n.priority,
        n.title,
        n.message,
        n.icon,
        n.color,
        n.action_url,
        n.action_label,
        n.related_user_id,
        n.related_entity_type,
        n.related_entity_id,
        n.metadata,
        n.is_read,
        n.read_at,
        n.expires_at,
        n.created_at,
        n.updated_at,
        u.username AS related_username,
        u.name AS related_user_name
      FROM notifications n
      LEFT JOIN users u ON n.related_user_id = u.id
      WHERE n.id = ?`,
      [id]
    )

    // Parse metadata JSON if exists
    const notification = newNotifications[0]
    if (notification && notification.metadata) {
      try {
        notification.metadata = JSON.parse(notification.metadata)
      } catch (e) {
        notification.metadata = null
      }
    }

    // ✅ PERFORMANCE: WebSocket Push - Send real-time notification to user
    // This eliminates the need for polling on the client side
    try {
      const io = req.app.get('io')
      if (io && notification) {
        // Emit to specific user's room (user should join their room on connection)
        io.to(`user:${user_id}`).emit('notification:new', {
          notification: notification,
          unread_count_increment: 1,
        })
        console.log(`📡 [WebSocket] Notification pushed to user:${user_id}`, {
          notificationId: notification.id,
          type: notification.type,
        })
      }
    } catch (wsError) {
      // Don't fail the request if WebSocket push fails
      console.warn('⚠️ [WebSocket] Failed to push notification:', wsError.message)
    }

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: newNotifications[0],
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้าง notification ได้',
      error: error.message,
    })
  }
})

/**
 * PUT /api/notifications/read-all
 * อัพเดทสถานะการอ่าน notifications ทั้งหมด
 * Access: All authenticated users
 * ⚠️ IMPORTANT: This route MUST be defined BEFORE /:id/read to prevent 'read-all' being matched as :id
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id // ใช้ req.user.id แทน req.user.userId

    console.log(`📢 PUT /api/notifications/read-all - User: ${userId}`)

    // Update all unread notifications to read
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE AND deleted_at IS NULL',
      [userId]
    )

    console.log(`✅ Marked ${result.affectedRows} notifications as read for user ${userId}`)

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updated_count: result.affectedRows,
    })
  } catch (error) {
    console.error('Error updating notifications:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดท notifications ได้',
      error: error.message,
    })
  }
})

/**
 * PUT /api/notifications/:id/read
 * อัพเดทสถานะการอ่าน notification
 * Access: All authenticated users (เฉพาะ notification ของตัวเอง)
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id // ใช้ req.user.id แทน req.user.userId

    // Check if notification exists and belongs to user
    const [notifications] = await pool.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    )

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      })
    }

    // Update read status และ read_at timestamp
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )

    res.json({
      success: true,
      message: 'Notification marked as read',
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดท notification ได้',
      error: error.message,
    })
  }
})

/**
 * DELETE /api/notifications/:id
 * ลบ notification (soft delete)
 * Access: All authenticated users (เฉพาะ notification ของตัวเอง)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id // ใช้ req.user.id แทน req.user.userId

    console.log(`🗑️ DELETE /api/notifications/${id} - User: ${userId}`)

    // Check if notification exists (including soft-deleted ones for better error message)
    const [allNotifications] = await pool.execute(
      'SELECT id, user_id, deleted_at FROM notifications WHERE id = ?',
      [id]
    )

    if (allNotifications.length === 0) {
      console.log(`⚠️ Notification ${id} not found in database`)
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      })
    }

    const notification = allNotifications[0]

    // Check if notification belongs to user
    if (notification.user_id !== userId) {
      console.log(`⚠️ Notification ${id} does not belong to user ${userId} (belongs to ${notification.user_id})`)
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this notification',
      })
    }

    // Check if notification is already deleted
    if (notification.deleted_at) {
      console.log(`⚠️ Notification ${id} is already deleted (deleted_at: ${notification.deleted_at})`)
      return res.status(404).json({
        success: false,
        message: 'Notification already deleted',
      })
    }

    // Soft delete
    await pool.execute(
      'UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )

    console.log(`✅ Notification ${id} deleted successfully`)

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบ notification ได้',
      error: error.message,
    })
  }
})

/**
 * Helper function: ลบ notification ถาวรออกจาก DB หากมีอายุเกิน 24 ชั่วโมง
 * เรียกใช้จาก scheduled job หรือ manual endpoint
 */
export async function cleanupExpiredNotifications() {
  try {
    // ลบ notification ที่ created_at ผ่านไปแล้ว 24 ชั่วโมง (Hard Delete ตามที่ขอ)
    const [result] = await pool.execute(
      `DELETE FROM notifications 
       WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    )

    return {
      success: true,
      deletedCount: result.affectedRows || 0,
    }
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * POST /api/notifications/cleanup-expired
 * ลบ notification แบบ Hard Delete หากอายุเกิน 24 ชั่วโมง
 * Access: Admin only หรือ System
 * Note: ควรเรียกใช้จาก scheduled job หรือ cron job
 */
router.post('/cleanup-expired', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await cleanupExpiredNotifications()

    res.json({
      success: result.success,
      message: `Cleaned up ${result.deletedCount} expired notifications`,
      deleted_count: result.deletedCount,
    })
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบ notification ที่หมดอายุได้',
      error: error.message,
    })
  }
})

export default router
