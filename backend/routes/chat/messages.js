/**
 * Chat Messages API Routes
 * สำหรับจัดการห้องแชทและข้อความระหว่างพนักงาน
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/chat/directory
 * ดึงรายชื่อพนักงานทั้งหมด (เพื่อเลือกสำหรับแชท)
 */
router.get('/directory', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    // ดึงพนักงานทุกคนยกเว้นตัวเอง มาพร้อม position/department พื้นฐาน
    const [users] = await pool.execute(`
      SELECT u.id, u.employee_id, u.username, u.name, u.role
      FROM users u
      WHERE u.id != ? AND u.status = 'active' AND u.deleted_at IS NULL
      ORDER BY u.name ASC
    `, [userId])

    res.json({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('Error fetching user directory:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลพนักงานได้', error: error.message })
  }
})

/**
 * GET /api/chat/conversations
 * ดึงรายชื่อห้องแชททั้งหมดของผู้ใช้ (Inbox) พร้อมข้อความล่าสุด
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const [conversations] = await pool.execute(`
      SELECT 
        c.id, 
        c.type, 
        cp.last_read_at,
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.role AS other_user_role,
        (
          SELECT message_text 
          FROM chat_messages cm 
          WHERE cm.conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT created_at 
          FROM chat_messages cm 
          WHERE cm.conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS last_message_time,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm 
          WHERE cm.conversation_id = c.id 
            AND cm.created_at > IFNULL(cp.last_read_at, '1970-01-01')
            AND cm.sender_id != ?
        ) AS unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
      JOIN conversation_participants other_cp ON c.id = other_cp.conversation_id AND other_cp.user_id != ?
      JOIN users u ON other_cp.user_id = u.id
      ORDER BY last_message_time IS NULL, last_message_time DESC
    `, [userId, userId, userId])

    res.json({
      success: true,
      data: conversations
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลห้องแชทได้', error: error.message })
  }
})

/**
 * GET /api/chat/conversations/:id/messages
 * ดึงข้อความในห้องแชทที่ระบุ
 */
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id
    const userId = req.user.id

    // Check participation security
    const [authCheck] = await pool.execute(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    )

    if (authCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' })
    }

    const [messages] = await pool.execute(`
      SELECT * FROM (
        SELECT 
          m.id, 
          m.conversation_id, 
          m.sender_id, 
          m.message_text, 
          m.created_at,
          u.name AS sender_name
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT 100
      ) recent_msgs ORDER BY created_at ASC
    `, [conversationId])

    // Update last_read_at since user opened it
    await pool.execute(
      'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    )

    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้', error: error.message })
  }
})

/**
 * POST /api/chat/conversations/init
 * ค้นหาห้องแชท 1-1 หรือสร้างใหม่ถ้ายังไม่มี
 */
router.post('/conversations/init', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { targetUserId } = req.body

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required' })
    }

    // Check if conversation already exists (1-on-1 exact match)
    const [existingConv] = await pool.execute(`
      SELECT cp1.conversation_id 
      FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      JOIN conversations c ON cp1.conversation_id = c.id
      WHERE cp1.user_id = ? AND cp2.user_id = ? AND c.type = 'direct'
    `, [userId, targetUserId])

    if (existingConv.length > 0) {
      return res.json({
        success: true,
        data: { conversation_id: existingConv[0].conversation_id }
      })
    }

    // If not exists, create new Direct Conversation
    const conversationId = generateUUID()
    
    await pool.execute('INSERT INTO conversations (id, type) VALUES (?, "direct")', [conversationId])
    
    await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, userId])
    await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, targetUserId])

    res.json({
      success: true,
      data: { conversation_id: conversationId },
      message: 'Created new conversation'
    })
  } catch (error) {
    console.error('Error initializing conversation:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถสร้างห้องแชทได้', error: error.message })
  }
})

export default router
