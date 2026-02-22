/**
 * Registration Work Routes
 * Routes สำหรับจัดการประเภทงานและรายการย่อย — งานทะเบียน
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

const router = express.Router()

// ============================================================
// Work Types (ประเภทงาน)
// ============================================================

/**
 * GET /api/registration-work/types
 * ดึงประเภทงานทั้งหมด พร้อมรายการย่อย
 * Query: ?department=dbd|rd|sso|hr
 */
router.get('/types', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { department } = req.query

        let query = `
            SELECT 
                t.id,
                t.department,
                t.name,
                t.sort_order,
                t.is_active,
                DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM registration_work_types t
            WHERE t.deleted_at IS NULL
        `
        const params = []

        if (department) {
            query += ` AND t.department = ?`
            params.push(department)
        }

        query += ` ORDER BY t.sort_order ASC, t.created_at ASC`

        const [types] = await pool.execute(query, params)

        // ดึงรายการย่อยทั้งหมดของประเภทงานที่พบ
        let subTypes = []
        if (types.length > 0) {
            const typeIds = types.map(t => t.id)
            const placeholders = typeIds.map(() => '?').join(',')
            const [subs] = await pool.execute(
                `SELECT 
                    id,
                    work_type_id,
                    name,
                    sort_order,
                    is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
                FROM registration_work_sub_types
                WHERE work_type_id IN (${placeholders}) AND deleted_at IS NULL
                ORDER BY sort_order ASC, created_at ASC`,
                typeIds
            )
            subTypes = subs
        }

        // จัดกลุ่มรายการย่อยเข้ากับประเภทงาน
        const result = types.map(type => ({
            ...type,
            sub_types: subTypes.filter(s => s.work_type_id === type.id)
        }))

        res.json({
            success: true,
            data: {
                types: result,
                count: result.length
            }
        })
    } catch (error) {
        console.error('Get registration work types error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

/**
 * POST /api/registration-work/types
 * เพิ่มประเภทงานใหม่
 */
router.post('/types', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { department, name } = req.body

        if (!department || !name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน (department, name)'
            })
        }

        const validDepartments = ['dbd', 'rd', 'sso', 'hr']
        if (!validDepartments.includes(department)) {
            return res.status(400).json({
                success: false,
                message: 'department ไม่ถูกต้อง (ต้องเป็น dbd, rd, sso, hr)'
            })
        }

        // หา sort_order ถัดไป
        const [maxOrder] = await pool.execute(
            `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order 
             FROM registration_work_types 
             WHERE department = ? AND deleted_at IS NULL`,
            [department]
        )

        const id = generateUUID()
        const sortOrder = maxOrder[0].next_order

        await pool.execute(
            `INSERT INTO registration_work_types (id, department, name, sort_order) VALUES (?, ?, ?, ?)`,
            [id, department, name, sortOrder]
        )

        const [created] = await pool.execute(
            `SELECT id, department, name, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_work_types WHERE id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { type: { ...created[0], sub_types: [] } },
            message: 'เพิ่มประเภทงานสำเร็จ'
        })
    } catch (error) {
        console.error('Create work type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/registration-work/types/:id
 * แก้ไขประเภทงาน
 */
router.put('/types/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const { name, sort_order, is_active } = req.body

        const [existing] = await pool.execute(
            `SELECT id FROM registration_work_types WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบประเภทงาน' })
        }

        await pool.execute(
            `UPDATE registration_work_types SET
                name = COALESCE(?, name),
                sort_order = COALESCE(?, sort_order),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, sort_order, is_active, id]
        )

        const [updated] = await pool.execute(
            `SELECT id, department, name, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_work_types WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            data: { type: updated[0] },
            message: 'แก้ไขประเภทงานสำเร็จ'
        })
    } catch (error) {
        console.error('Update work type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/registration-work/types/:id
 * ลบประเภทงาน (soft delete) — ลบรายการย่อยด้วย
 */
router.delete('/types/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM registration_work_types WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบประเภทงาน' })
        }

        // Soft delete ทั้ง type และ sub types
        await pool.execute(`UPDATE registration_work_types SET deleted_at = NOW() WHERE id = ?`, [id])
        await pool.execute(`UPDATE registration_work_sub_types SET deleted_at = NOW() WHERE work_type_id = ?`, [id])

        res.json({ success: true, message: 'ลบประเภทงานสำเร็จ' })
    } catch (error) {
        console.error('Delete work type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// Sub Types (รายการย่อย)
// ============================================================

/**
 * POST /api/registration-work/sub-types
 * เพิ่มรายการย่อย
 */
router.post('/sub-types', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { work_type_id, name } = req.body

        if (!work_type_id || !name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน (work_type_id, name)'
            })
        }

        // ตรวจสอบว่า work_type_id มีอยู่จริง
        const [parentType] = await pool.execute(
            `SELECT id FROM registration_work_types WHERE id = ? AND deleted_at IS NULL`,
            [work_type_id]
        )

        if (parentType.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบประเภทงานหลัก' })
        }

        // หา sort_order ถัดไป
        const [maxOrder] = await pool.execute(
            `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order 
             FROM registration_work_sub_types 
             WHERE work_type_id = ? AND deleted_at IS NULL`,
            [work_type_id]
        )

        const id = generateUUID()
        const sortOrder = maxOrder[0].next_order

        await pool.execute(
            `INSERT INTO registration_work_sub_types (id, work_type_id, name, sort_order) VALUES (?, ?, ?, ?)`,
            [id, work_type_id, name, sortOrder]
        )

        const [created] = await pool.execute(
            `SELECT id, work_type_id, name, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_work_sub_types WHERE id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { sub_type: created[0] },
            message: 'เพิ่มรายการย่อยสำเร็จ'
        })
    } catch (error) {
        console.error('Create sub type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/registration-work/sub-types/:id
 * แก้ไขรายการย่อย
 */
router.put('/sub-types/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const { name, sort_order, is_active } = req.body

        const [existing] = await pool.execute(
            `SELECT id FROM registration_work_sub_types WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการย่อย' })
        }

        await pool.execute(
            `UPDATE registration_work_sub_types SET
                name = COALESCE(?, name),
                sort_order = COALESCE(?, sort_order),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, sort_order, is_active, id]
        )

        const [updated] = await pool.execute(
            `SELECT id, work_type_id, name, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_work_sub_types WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            data: { sub_type: updated[0] },
            message: 'แก้ไขรายการย่อยสำเร็จ'
        })
    } catch (error) {
        console.error('Update sub type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/registration-work/sub-types/:id
 * ลบรายการย่อย (soft delete)
 */
router.delete('/sub-types/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM registration_work_sub_types WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการย่อย' })
        }

        await pool.execute(`UPDATE registration_work_sub_types SET deleted_at = NOW() WHERE id = ?`, [id])

        res.json({ success: true, message: 'ลบรายการย่อยสำเร็จ' })
    } catch (error) {
        console.error('Delete sub type error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// Team Statuses (สถานะการทำงานในทีม)
// ============================================================

/**
 * GET /api/registration-work/team-statuses
 * ดึงรายการสถานะทีมทั้งหมด
 */
router.get('/team-statuses', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const [statuses] = await pool.execute(
            `SELECT id, name, color, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_team_statuses
             WHERE deleted_at IS NULL
             ORDER BY sort_order ASC, created_at ASC`
        )

        res.json({
            success: true,
            data: {
                statuses,
                count: statuses.length
            }
        })
    } catch (error) {
        // If table doesn't exist yet, return empty array gracefully
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ success: true, data: { statuses: [], count: 0 } })
        }
        console.error('Get team statuses error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/registration-work/team-statuses
 * เพิ่มสถานะทีมใหม่
 */
router.post('/team-statuses', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { name, color } = req.body

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อสถานะ'
            })
        }

        const [maxOrder] = await pool.execute(
            `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
             FROM registration_team_statuses
             WHERE deleted_at IS NULL`
        )

        const id = generateUUID()
        const sortOrder = maxOrder[0].next_order

        await pool.execute(
            `INSERT INTO registration_team_statuses (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
            [id, name, color || '#228be6', sortOrder]
        )

        const [created] = await pool.execute(
            `SELECT id, name, color, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_team_statuses WHERE id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { status: created[0] },
            message: 'เพิ่มสถานะทีมสำเร็จ'
        })
    } catch (error) {
        console.error('Create team status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/registration-work/team-statuses/:id
 * แก้ไขสถานะทีม
 */
router.put('/team-statuses/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const { name, color, sort_order, is_active } = req.body

        const [existing] = await pool.execute(
            `SELECT id FROM registration_team_statuses WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบสถานะทีม' })
        }

        await pool.execute(
            `UPDATE registration_team_statuses SET
                name = COALESCE(?, name),
                color = COALESCE(?, color),
                sort_order = COALESCE(?, sort_order),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, color, sort_order, is_active, id]
        )

        const [updated] = await pool.execute(
            `SELECT id, name, color, sort_order, is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_team_statuses WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            data: { status: updated[0] },
            message: 'แก้ไขสถานะทีมสำเร็จ'
        })
    } catch (error) {
        console.error('Update team status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/registration-work/team-statuses/:id
 * ลบสถานะทีม (soft delete)
 */
router.delete('/team-statuses/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM registration_team_statuses WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบสถานะทีม' })
        }

        await pool.execute(`UPDATE registration_team_statuses SET deleted_at = NOW() WHERE id = ?`, [id])

        // Clear team_status on tasks that had this status
        try {
            await pool.execute(`UPDATE registration_tasks SET team_status = NULL WHERE team_status = ?`, [id])
        } catch (e) {
            // Ignore if column doesn't exist yet
        }

        res.json({ success: true, message: 'ลบสถานะทีมสำเร็จ' })
    } catch (error) {
        console.error('Delete team status error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
