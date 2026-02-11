/**
 * Holidays Routes
 * Routes สำหรับการจัดการวันหยุดนักขัตฤกษ์
 * Fix 4: Holiday Calendar for working days calculation
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { generateUUID } from '../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/holidays
 * ดึงรายการวันหยุดทั้งหมด
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { year, active_only } = req.query

        let query = `
      SELECT 
        id,
        DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date,
        name,
        name_en,
        year,
        is_active,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM holidays
      WHERE deleted_at IS NULL
    `
        const params = []

        if (year) {
            query += ` AND year = ?`
            params.push(parseInt(year))
        }

        if (active_only === 'true') {
            query += ` AND is_active = TRUE`
        }

        query += ` ORDER BY holiday_date ASC`

        const [holidays] = await pool.execute(query, params)

        res.json({
            success: true,
            data: {
                holidays,
                count: holidays.length
            }
        })
    } catch (error) {
        console.error('Get holidays error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

/**
 * GET /api/holidays/dates
 * ดึงเฉพาะวันที่หยุด (สำหรับ calendar)
 * Access: All authenticated users
 */
router.get('/dates', authenticateToken, async (req, res) => {
    try {
        const { year, start_date, end_date } = req.query

        let query = `
      SELECT DATE_FORMAT(holiday_date, '%Y-%m-%d') as date
      FROM holidays
      WHERE deleted_at IS NULL AND is_active = TRUE
    `
        const params = []

        if (year) {
            query += ` AND year = ?`
            params.push(parseInt(year))
        }

        if (start_date && end_date) {
            query += ` AND holiday_date BETWEEN ? AND ?`
            params.push(start_date, end_date)
        }

        query += ` ORDER BY holiday_date ASC`

        const [holidays] = await pool.execute(query, params)

        res.json({
            success: true,
            data: {
                dates: holidays.map(h => h.date)
            }
        })
    } catch (error) {
        console.error('Get holiday dates error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

/**
 * POST /api/holidays
 * เพิ่มวันหยุดใหม่
 * Access: Admin only
 */
router.post('/', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { holiday_date, name, name_en, year } = req.body

        // Validation
        if (!holiday_date || !name || !year) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน (วันที่, ชื่อวันหยุด, ปี)'
            })
        }

        // Check for duplicate
        const [existing] = await pool.execute(
            `SELECT id FROM holidays WHERE holiday_date = ? AND deleted_at IS NULL`,
            [holiday_date]
        )

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'วันที่นี้มีการกำหนดเป็นวันหยุดแล้ว'
            })
        }

        const id = generateUUID()

        await pool.execute(
            `INSERT INTO holidays (id, holiday_date, name, name_en, year, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
            [id, holiday_date, name, name_en || null, year]
        )

        const [created] = await pool.execute(
            `SELECT 
        id,
        DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date,
        name,
        name_en,
        year,
        is_active
       FROM holidays WHERE id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { holiday: created[0] },
            message: 'เพิ่มวันหยุดสำเร็จ'
        })
    } catch (error) {
        console.error('Create holiday error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

/**
 * PUT /api/holidays/:id
 * แก้ไขวันหยุด
 * Access: Admin only
 */
router.put('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params
        const { holiday_date, name, name_en, year, is_active } = req.body

        // Check if exists
        const [existing] = await pool.execute(
            `SELECT id FROM holidays WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบวันหยุดที่ต้องการแก้ไข'
            })
        }

        // Check for duplicate date (if changing)
        if (holiday_date) {
            const [duplicate] = await pool.execute(
                `SELECT id FROM holidays WHERE holiday_date = ? AND id != ? AND deleted_at IS NULL`,
                [holiday_date, id]
            )

            if (duplicate.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'วันที่นี้มีการกำหนดเป็นวันหยุดแล้ว'
                })
            }
        }

        await pool.execute(
            `UPDATE holidays SET
        holiday_date = COALESCE(?, holiday_date),
        name = COALESCE(?, name),
        name_en = COALESCE(?, name_en),
        year = COALESCE(?, year),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
            [holiday_date, name, name_en, year, is_active, id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        id,
        DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date,
        name,
        name_en,
        year,
        is_active
       FROM holidays WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            data: { holiday: updated[0] },
            message: 'แก้ไขวันหยุดสำเร็จ'
        })
    } catch (error) {
        console.error('Update holiday error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

/**
 * DELETE /api/holidays/:id
 * ลบวันหยุด (soft delete)
 * Access: Admin only
 */
router.delete('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM holidays WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบวันหยุดที่ต้องการลบ'
            })
        }

        await pool.execute(
            `UPDATE holidays SET deleted_at = NOW() WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            message: 'ลบวันหยุดสำเร็จ'
        })
    } catch (error) {
        console.error('Delete holiday error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

export default router
