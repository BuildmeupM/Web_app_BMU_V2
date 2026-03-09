import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateUUID } from '../utils/leaveHelpers.js';

const router = express.Router();

/**
 * GET /api/internal-chats/recent-activity
 * Get chat rooms with recent activity (last message per build, sorted by recency)
 * ⚠️ MUST be defined BEFORE /:build route to avoid Express matching 'recent-activity' as a build ID
 */
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        latest.build,
        c.company_name,
        icc.message AS last_message,
        icc.sender_employee_id AS last_sender_employee_id,
        CONCAT(e.first_name, ' (', e.nick_name, ')') AS last_sender_name,
        icc.created_at AS last_message_at,
        latest.total_messages,
        CASE WHEN icc.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 ELSE 0 END AS is_active
      FROM (
        SELECT 
          build,
          MAX(id) AS max_id,
          COUNT(*) AS total_messages
        FROM internal_client_chats
        GROUP BY build
      ) latest
      JOIN internal_client_chats icc ON icc.id = latest.max_id
      JOIN clients c ON c.build = latest.build
      LEFT JOIN employees e ON e.employee_id = icc.sender_employee_id
      ORDER BY icc.created_at DESC
    `;

    const [rows] = await pool.query(query);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching recent chat activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching recent activity',
    });
  }
});

/**
 * GET /api/internal-chats/:build
 * Get chat history for a specific client (identified by build)
 */
router.get('/:build', authenticateToken, async (req, res) => {
  try {
    const { build } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Fetch latest messages with LIMIT/OFFSET, then sort ASC chronologically
    const query = `
      SELECT * FROM (
        SELECT 
          icc.id,
          icc.build,
          icc.sender_employee_id,
          CONCAT(e.first_name, ' (', e.nick_name, ')') AS sender_name,
          icc.message,
          icc.reply_to_id,
          reply.message AS reply_to_message,
          CONCAT(reply_e.first_name, ' (', reply_e.nick_name, ')') AS reply_to_sender_name,
          icc.created_at,
          icc.updated_at
        FROM internal_client_chats icc
        LEFT JOIN employees e ON icc.sender_employee_id = e.employee_id
        LEFT JOIN internal_client_chats reply ON icc.reply_to_id = reply.id
        LEFT JOIN employees reply_e ON reply.sender_employee_id = reply_e.employee_id
        WHERE icc.build = ?
        ORDER BY icc.created_at DESC
        LIMIT ? OFFSET ?
      ) AS sub
      ORDER BY sub.created_at ASC
    `;

    // pool.execute with LIMIT requires parameters to be numbers, not strings.
    const [rows] = await pool.query(query, [build, limit, offset]);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching internal chats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching chats',
    });
  }
});

/**
 * POST /api/internal-chats
 * Add a new message to the chat
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { build, message, reply_to_id, mentioned_employee_ids } = req.body;
    const sender_employee_id = req.user.employee_id; // Using from token
    
    if (!build || !message) {
      return res.status(400).json({
        success: false,
        message: 'Build and message are required',
      });
    }

    const query = `
      INSERT INTO internal_client_chats 
      (build, sender_employee_id, message, reply_to_id) 
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      build,
      sender_employee_id,
      message,
      reply_to_id || null, // Ensure undefined is explicitly passed as null
    ]);

    // Fetch the inserted message to return
    const selectQuery = `
      SELECT 
        icc.id,
        icc.build,
        icc.sender_employee_id,
        CONCAT(e.first_name, ' (', e.nick_name, ')') AS sender_name,
        icc.message,
        icc.reply_to_id,
        reply.message AS reply_to_message,
        CONCAT(reply_e.first_name, ' (', reply_e.nick_name, ')') AS reply_to_sender_name,
        icc.created_at,
        icc.updated_at
      FROM internal_client_chats icc
      LEFT JOIN employees e ON icc.sender_employee_id = e.employee_id
      LEFT JOIN internal_client_chats reply ON icc.reply_to_id = reply.id
      LEFT JOIN employees reply_e ON reply.sender_employee_id = reply_e.employee_id
      WHERE icc.id = ?
    `;

    const [newRow] = await pool.execute(selectQuery, [result.insertId]);

    const newMessage = newRow[0];

    res.status(201).json({
      success: true,
      data: newMessage,
    });

    // --- Broadcast new message to all users in the chat room (Real-time) ---
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:build:${build}`).emit('chat:new_message', { message: newMessage });
      console.log(`📡 [Chat] Broadcasted new message to room chat:build:${build}`);
    }

    // --- Process Notifications for Mentions ---
    if (Array.isArray(mentioned_employee_ids) && mentioned_employee_ids.length > 0) {
      try {
        const senderName = newRow[0].sender_name;

        // Fetch user IDs for mentioned employees via the users table (employees.user_id may be null)
        const placeholders = mentioned_employee_ids.map(() => '?').join(',');
        const [mentionedUsers] = await pool.execute(
          `SELECT e.employee_id, u.id AS user_id 
           FROM employees e 
           JOIN users u ON u.employee_id = e.employee_id
           WHERE e.employee_id IN (${placeholders})`,
          mentioned_employee_ids
        );

        console.log(`📣 [Chat Notification] Mentioned employee IDs: ${mentioned_employee_ids.join(', ')}`);
        console.log(`📣 [Chat Notification] Resolved users to notify: ${JSON.stringify(mentionedUsers)}`);

        // Fetch company name for this build
        const [[clientRow]] = await pool.execute('SELECT company_name FROM clients WHERE build = ?', [build]);
        const companyName = clientRow?.company_name || build;

        for (const user of mentionedUsers) {
          // Prevent notifying oneself (Commented out for testing purposes)
          // if (user.employee_id === sender_employee_id) continue;

          const notifId = generateUUID();
          const title = `ถูกกล่าวถึงในแชทลูกค้า: ${companyName}`;
          const notifMsg = `จาก ${senderName}: ${message}`;
          
          await pool.execute(
            `INSERT INTO notifications (
              id, user_id, type, category, priority, title, message, icon, color,
              action_url, related_entity_type, related_entity_id, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              notifId,
              user.user_id,
              'info', // Valid enum value
              'chat_mention', // Category
              'medium',
              title,
              notifMsg.substring(0, 500) + (notifMsg.length > 500 ? '...' : ''),
              'TbAt',
              'orange',
              `/internal/internal-chats`,
              'internal_client_chat',
              result.insertId,
              JSON.stringify({ build, company_name: companyName })
            ]
          );

          // Notify valid websocket
          if (io) {
            const [insertedNotif] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [notifId]);
            if (insertedNotif.length > 0) {
              io.to(`user:${user.user_id}`).emit('notification:new', {
                notification: insertedNotif[0],
                unread_count_increment: 1,
              });
            }
          }
        }
      } catch (notifErr) {
        console.error('Error creating mention notifications:', notifErr);
      }
    }
  } catch (error) {
    console.error('Error sending internal chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while sending message',
    });
  }
});

/**
 * DELETE /api/internal-chats/:id
 * Delete a specific chat message
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sender_employee_id = req.user.employee_id;

    // Check ownership (also fetch build for room broadcast)
    const [rows] = await pool.execute('SELECT sender_employee_id, build FROM internal_client_chats WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    // Optional: Allow deletion only if it's the sender
    if (rows[0].sender_employee_id !== sender_employee_id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ลบข้อความนี้' });
    }

    // Delete message
    await pool.execute('DELETE FROM internal_client_chats WHERE id = ?', [id])
    
    // Broadcast deletion to all users in the chat room
    const io = req.app.get('io')
    if (io) {
      io.to(`chat:build:${rows[0].build}`).emit('chat:message_deleted', { id: parseInt(id) })
    }

    // Also optional: Delete related notifications (by related_entity_id)
    await pool.execute('DELETE FROM notifications WHERE related_entity_type = ? AND related_entity_id = ?', ['internal_client_chat', id])

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting internal chat message:', error);
    res.status(500).json({ success: false, message: 'Internal server error while deleting message' });
  }
});

export default router;
