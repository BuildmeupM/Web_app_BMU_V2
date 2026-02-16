/**
 * Company Feed Routes — ระบบประกาศบริษัท / Social Feed / ปฏิทินบริษัท
 * CRUD: Posts, Comments, Reactions, Events
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import crypto from 'crypto'

const router = express.Router()

function uuid() {
    return crypto.randomUUID()
}

// ═══════════════════════════════════════════════════════
//  POSTS
// ═══════════════════════════════════════════════════════

/**
 * GET /api/company-feed/posts
 * ดึงโพสทั้งหมด (พร้อม author, comment count, reaction count)
 */
router.get('/posts', authenticateToken, async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query
        const offset = (parseInt(page) - 1) * parseInt(limit)
        const currentUserId = req.user.id

        let where = 'p.deleted_at IS NULL'
        const params = []

        if (category && category !== 'all') {
            where += ' AND p.category = ?'
            params.push(category)
        }

        // Count total
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM company_posts p WHERE ${where}`,
            params
        )
        const total = countResult[0].total

        // Fetch posts with author info, comment count, reaction count
        const [posts] = await pool.execute(
            `SELECT 
        p.id, p.author_id, p.category, p.title, p.content,
        p.is_pinned,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        u.name as author_name,
        u.role as author_role,
        (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ?) as user_reacted
      FROM company_posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE ${where}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT ? OFFSET ?`,
            [currentUserId, ...params, parseInt(limit), offset]
        )

        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        })
    } catch (error) {
        console.error('Get posts error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/company-feed/posts
 * สร้างโพสใหม่
 */
router.post('/posts', authenticateToken, async (req, res) => {
    try {
        const { category = 'discussion', title, content } = req.body
        const authorId = req.user.id

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกเนื้อหาโพส' })
        }

        const id = uuid()

        await pool.execute(
            `INSERT INTO company_posts (id, author_id, category, title, content)
       VALUES (?, ?, ?, ?, ?)`,
            [id, authorId, category, title || null, content.trim()]
        )

        // Return created post with author info
        const [created] = await pool.execute(
            `SELECT 
        p.id, p.author_id, p.category, p.title, p.content,
        p.is_pinned,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        u.name as author_name,
        u.role as author_role,
        0 as comment_count,
        0 as reaction_count,
        0 as user_reacted
      FROM company_posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { post: created[0] },
            message: 'สร้างโพสสำเร็จ'
        })
    } catch (error) {
        console.error('Create post error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/company-feed/posts/:id
 * แก้ไขโพส (เจ้าของ หรือ admin เท่านั้น)
 */
router.put('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params
        const { category, title, content } = req.body
        const userId = req.user.id
        const userRole = req.user.role

        const [existing] = await pool.execute(
            'SELECT author_id FROM company_posts WHERE id = ? AND deleted_at IS NULL',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบโพส' })
        }

        // Only author or admin can edit
        if (existing[0].author_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขโพสนี้' })
        }

        await pool.execute(
            `UPDATE company_posts SET
        category = COALESCE(?, category),
        title = COALESCE(?, title),
        content = COALESCE(?, content)
      WHERE id = ?`,
            [category, title, content, id]
        )

        res.json({ success: true, message: 'แก้ไขโพสสำเร็จ' })
    } catch (error) {
        console.error('Update post error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/company-feed/posts/:id
 * ลบโพส (soft delete) (เจ้าของ หรือ admin)
 */
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.id
        const userRole = req.user.role

        const [existing] = await pool.execute(
            'SELECT author_id FROM company_posts WHERE id = ? AND deleted_at IS NULL',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบโพส' })
        }

        if (existing[0].author_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบโพสนี้' })
        }

        // Cascade: soft-delete comments, hard-delete reactions
        await pool.execute('UPDATE post_comments SET deleted_at = NOW() WHERE post_id = ? AND deleted_at IS NULL', [id])
        await pool.execute('DELETE FROM post_reactions WHERE post_id = ?', [id])
        await pool.execute('UPDATE company_posts SET deleted_at = NOW() WHERE id = ?', [id])

        res.json({ success: true, message: 'ลบโพสสำเร็จ' })
    } catch (error) {
        console.error('Delete post error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PATCH /api/company-feed/posts/:id/pin
 * ปักหมุด/ยกเลิกปักหมุด (admin only)
 */
router.patch('/posts/:id/pin', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const { is_pinned } = req.body

        await pool.execute('UPDATE company_posts SET is_pinned = ? WHERE id = ? AND deleted_at IS NULL', [
            is_pinned ? 1 : 0,
            id,
        ])

        res.json({ success: true, message: is_pinned ? 'ปักหมุดสำเร็จ' : 'ยกเลิกปักหมุดสำเร็จ' })
    } catch (error) {
        console.error('Pin post error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ═══════════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════════

/**
 * GET /api/company-feed/posts/:postId/comments
 * ดึงคอมเมนต์ของโพส
 */
router.get('/posts/:postId/comments', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params

        const [comments] = await pool.execute(
            `SELECT 
        c.id, c.post_id, c.author_id, c.content,
        DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        u.name as author_name,
        u.role as author_role
      FROM post_comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
            [postId]
        )

        res.json({ success: true, data: { comments } })
    } catch (error) {
        console.error('Get comments error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/company-feed/posts/:postId/comments
 * เพิ่มคอมเมนต์
 */
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params
        const { content } = req.body
        const authorId = req.user.id

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกเนื้อหาคอมเมนต์' })
        }

        // Check post exists
        const [post] = await pool.execute(
            'SELECT id FROM company_posts WHERE id = ? AND deleted_at IS NULL',
            [postId]
        )
        if (post.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบโพส' })
        }

        const id = uuid()

        await pool.execute(
            'INSERT INTO post_comments (id, post_id, author_id, content) VALUES (?, ?, ?, ?)',
            [id, postId, authorId, content.trim()]
        )

        const [created] = await pool.execute(
            `SELECT 
        c.id, c.post_id, c.author_id, c.content,
        DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        u.name as author_name,
        u.role as author_role
      FROM post_comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { comment: created[0] },
            message: 'เพิ่มคอมเมนต์สำเร็จ'
        })
    } catch (error) {
        console.error('Create comment error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/company-feed/posts/:postId/comments/:commentId
 * ลบคอมเมนต์ (เจ้าของ หรือ admin)
 */
router.delete('/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params
        const userId = req.user.id
        const userRole = req.user.role

        const [existing] = await pool.execute(
            'SELECT author_id FROM post_comments WHERE id = ? AND deleted_at IS NULL',
            [commentId]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคอมเมนต์' })
        }

        if (existing[0].author_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบคอมเมนต์นี้' })
        }

        await pool.execute('UPDATE post_comments SET deleted_at = NOW() WHERE id = ?', [commentId])

        res.json({ success: true, message: 'ลบคอมเมนต์สำเร็จ' })
    } catch (error) {
        console.error('Delete comment error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ═══════════════════════════════════════════════════════
//  REACTIONS
// ═══════════════════════════════════════════════════════

/**
 * POST /api/company-feed/posts/:postId/reactions
 * กด like / ยกเลิก like (toggle)
 */
router.post('/posts/:postId/reactions', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params
        const userId = req.user.id

        // Check if already reacted
        const [existing] = await pool.execute(
            'SELECT id FROM post_reactions WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        )

        if (existing.length > 0) {
            // Remove reaction (un-like)
            await pool.execute('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?', [
                postId,
                userId,
            ])
            res.json({ success: true, data: { reacted: false }, message: 'ยกเลิกแล้ว' })
        } else {
            // Add reaction
            const id = uuid()
            await pool.execute(
                'INSERT INTO post_reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)',
                [id, postId, userId, 'like']
            )
            res.json({ success: true, data: { reacted: true }, message: 'กดไลค์แล้ว' })
        }
    } catch (error) {
        console.error('Toggle reaction error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ═══════════════════════════════════════════════════════
//  EVENTS (ปฏิทินบริษัท)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/company-feed/events
 * ดึงอีเวนต์ทั้งหมด (filter by date range)
 */
router.get('/events', authenticateToken, async (req, res) => {
    try {
        const { year, month } = req.query

        let where = 'e.deleted_at IS NULL'
        const params = []

        if (year && month) {
            // ดึงทั้งเดือน + ขยาย ±1 เดือนเพื่อ overlap
            where += ' AND ((YEAR(e.event_date) = ? AND MONTH(e.event_date) = ?) OR (e.event_end_date IS NOT NULL AND e.event_date <= LAST_DAY(?) AND e.event_end_date >= ?))'
            const monthStr = `${year}-${String(month).padStart(2, '0')}-01`
            params.push(parseInt(year), parseInt(month), monthStr, monthStr)
        } else if (year) {
            where += ' AND YEAR(e.event_date) = ?'
            params.push(parseInt(year))
        }

        const [events] = await pool.execute(
            `SELECT 
        e.id, e.title, e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
        DATE_FORMAT(e.event_end_date, '%Y-%m-%d') as event_end_date,
        e.start_time, e.end_time, e.is_all_day, e.location,
        e.event_type, e.color,
        e.created_by,
        u.name as created_by_name
      FROM company_events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE ${where}
      ORDER BY e.event_date ASC, e.start_time ASC`,
            params
        )

        res.json({ success: true, data: { events } })
    } catch (error) {
        console.error('Get events error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/company-feed/events
 * สร้างอีเวนต์ใหม่ (ทุก role)
 */
router.post('/events', authenticateToken, async (req, res) => {
    try {
        const { title, description, event_date, event_end_date, event_type = 'other', color, start_time, end_time, is_all_day = true, location } = req.body
        const createdBy = req.user.id

        if (!title || !event_date) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและวันที่อีเวนต์' })
        }

        const id = uuid()

        await pool.execute(
            `INSERT INTO company_events (id, title, description, event_date, event_end_date, start_time, end_time, is_all_day, location, event_type, color, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, title, description || null, event_date, event_end_date || null, start_time || null, end_time || null, is_all_day ? 1 : 0, location || null, event_type, color || '#4263eb', createdBy]
        )

        const [created] = await pool.execute(
            `SELECT 
        e.id, e.title, e.description,
        DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
        DATE_FORMAT(e.event_end_date, '%Y-%m-%d') as event_end_date,
        e.start_time, e.end_time, e.is_all_day, e.location,
        e.event_type, e.color, e.created_by,
        u.name as created_by_name
      FROM company_events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { event: created[0] },
            message: 'สร้างอีเวนต์สำเร็จ'
        })
    } catch (error) {
        console.error('Create event error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/company-feed/events/:id
 * แก้ไขอีเวนต์ (ทุก role)
 */
router.put('/events/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params
        const { title, description, event_date, event_end_date, event_type, color, start_time, end_time, is_all_day, location } = req.body

        const [existing] = await pool.execute(
            'SELECT id FROM company_events WHERE id = ? AND deleted_at IS NULL',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอีเวนต์' })
        }

        await pool.execute(
            `UPDATE company_events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_date = COALESCE(?, event_date),
        event_end_date = COALESCE(?, event_end_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        is_all_day = COALESCE(?, is_all_day),
        location = COALESCE(?, location),
        event_type = COALESCE(?, event_type),
        color = COALESCE(?, color)
      WHERE id = ?`,
            [title, description, event_date, event_end_date, start_time, end_time, is_all_day !== undefined ? (is_all_day ? 1 : 0) : undefined, location, event_type, color, id]
        )

        res.json({ success: true, message: 'แก้ไขอีเวนต์สำเร็จ' })
    } catch (error) {
        console.error('Update event error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/company-feed/events/:id
 * ลบอีเวนต์ (ทุก role, soft delete)
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params

        await pool.execute('UPDATE company_events SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id])

        res.json({ success: true, message: 'ลบอีเวนต์สำเร็จ' })
    } catch (error) {
        console.error('Delete event error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
