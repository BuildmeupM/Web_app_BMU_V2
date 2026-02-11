/**
 * Messenger Locations API
 * CRUD สำหรับจัดการรายการสถานที่ที่ใช้บ่อย
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

// GET /api/messenger-locations — ดึงรายการสถานที่ทั้งหมด
router.get('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { category, search } = req.query
        let query = 'SELECT * FROM messenger_locations WHERE deleted_at IS NULL'
        const params = []

        if (category) {
            query += ' AND category = ?'
            params.push(category)
        }
        if (search) {
            query += ' AND (name LIKE ? OR address LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        query += ' ORDER BY is_default_start DESC, usage_count DESC, name ASC'

        const [locations] = await pool.execute(query, params)
        res.json({ success: true, data: { locations } })
    } catch (error) {
        console.error('Get locations error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// POST /api/messenger-locations — เพิ่มสถานที่ใหม่
router.post('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { name, address, latitude, longitude, category, is_default_start } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสถานที่' })
        }

        const id = generateUUID()
        await pool.execute(
            `INSERT INTO messenger_locations (id, name, address, latitude, longitude, category, is_default_start)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name.trim(), address || null, latitude || null, longitude || null, category || 'other', is_default_start ? 1 : 0]
        )

        const [created] = await pool.execute('SELECT * FROM messenger_locations WHERE id = ?', [id])
        res.status(201).json({ success: true, data: { location: created[0] } })
    } catch (error) {
        console.error('Create location error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// PUT /api/messenger-locations/:id — แก้ไขสถานที่
router.put('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const { name, address, latitude, longitude, category, is_default_start } = req.body

        const updates = []
        const params = []

        if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()) }
        if (address !== undefined) { updates.push('address = ?'); params.push(address) }
        if (latitude !== undefined) { updates.push('latitude = ?'); params.push(latitude) }
        if (longitude !== undefined) { updates.push('longitude = ?'); params.push(longitude) }
        if (category !== undefined) { updates.push('category = ?'); params.push(category) }
        if (is_default_start !== undefined) { updates.push('is_default_start = ?'); params.push(is_default_start ? 1 : 0) }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัปเดต' })
        }

        params.push(id)
        await pool.execute(`UPDATE messenger_locations SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params)

        const [updated] = await pool.execute('SELECT * FROM messenger_locations WHERE id = ?', [id])
        res.json({ success: true, data: { location: updated[0] } })
    } catch (error) {
        console.error('Update location error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// PUT /api/messenger-locations/:id/increment — เพิ่ม usage_count
router.put('/:id/increment', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        await pool.execute('UPDATE messenger_locations SET usage_count = usage_count + 1 WHERE id = ?', [id])
        res.json({ success: true })
    } catch (error) {
        console.error('Increment usage error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// DELETE /api/messenger-locations/:id — soft delete
router.delete('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        await pool.execute('UPDATE messenger_locations SET deleted_at = NOW() WHERE id = ?', [id])
        res.json({ success: true, message: 'ลบสถานที่แล้ว' })
    } catch (error) {
        console.error('Delete location error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

export default router
