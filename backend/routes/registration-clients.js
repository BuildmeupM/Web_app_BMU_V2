/**
 * Registration Clients Routes
 * Routes สำหรับจัดการข้อมูลลูกค้างานทะเบียน
 */

import express from 'express'
import crypto from 'crypto'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/registration-clients
 * ดึงรายการลูกค้าทะเบียนทั้งหมด
 * Query: ?search=keyword&group=groupName&active=true|false
 */
router.get('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { search, group, active } = req.query

        let query = `
            SELECT id, company_name, legal_entity_number, phone, group_name,
                   line_api, notes,
                   full_address, address_number, village, building, room_number,
                   floor_number, soi, moo, road, subdistrict, district, province, postal_code,
                   is_active,
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                   DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM registration_clients
            WHERE deleted_at IS NULL
        `
        const params = []

        // Search filter
        if (search) {
            query += ` AND (company_name LIKE ? OR legal_entity_number LIKE ? OR phone LIKE ? OR group_name LIKE ?)`
            const searchPattern = `%${search}%`
            params.push(searchPattern, searchPattern, searchPattern, searchPattern)
        }

        // Group filter
        if (group) {
            query += ` AND group_name = ?`
            params.push(group)
        }

        // Active filter
        if (active !== undefined) {
            query += ` AND is_active = ?`
            params.push(active === 'true' ? 1 : 0)
        }

        query += ` ORDER BY group_name ASC, company_name ASC`

        const [rows] = await pool.execute(query, params)

        // Also get distinct group names for filter dropdown
        const [groups] = await pool.execute(
            `SELECT DISTINCT group_name FROM registration_clients WHERE deleted_at IS NULL ORDER BY group_name ASC`
        )

        res.json({
            success: true,
            data: {
                clients: rows,
                groups: groups.map(g => g.group_name),
                count: rows.length,
            },
        })
    } catch (error) {
        console.error('Get registration clients error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    }
})

/**
 * GET /api/registration-clients/:id
 * ดึงข้อมูลลูกค้าทะเบียนรายตัว
 */
router.get('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const [rows] = await pool.execute(
            `SELECT id, company_name, legal_entity_number, phone, group_name,
                    line_api, notes,
                    full_address, address_number, village, building, room_number,
                    floor_number, soi, moo, road, subdistrict, district, province, postal_code,
                    is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
             FROM registration_clients
             WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' })
        }

        res.json({ success: true, data: rows[0] })
    } catch (error) {
        console.error('Get registration client error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/registration-clients
 * เพิ่มลูกค้าทะเบียนใหม่
 */
router.post('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const {
            company_name, legal_entity_number, phone, group_name, line_api, notes,
            full_address, address_number, village, building, room_number,
            floor_number, soi, moo, road, subdistrict, district, province, postal_code
        } = req.body

        // Validation
        if (!company_name || !company_name.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อลูกค้า / บริษัท' })
        }
        if (!group_name || !group_name.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อกลุ่ม' })
        }

        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

        await pool.execute(
            `INSERT INTO registration_clients (
                id, company_name, legal_entity_number, phone, group_name, line_api, notes,
                full_address, address_number, village, building, room_number,
                floor_number, soi, moo, road, subdistrict, district, province, postal_code
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, company_name.trim(), legal_entity_number || null, phone || null,
                group_name.trim(), line_api || null, notes || null,
                full_address || null, address_number || null, village || null,
                building || null, room_number || null, floor_number || null,
                soi || null, moo || null, road || null,
                subdistrict || null, district || null, province || null, postal_code || null
            ]
        )

        const [created] = await pool.execute(
            `SELECT id, company_name, legal_entity_number, phone, group_name,
                    line_api, notes,
                    full_address, address_number, village, building, room_number,
                    floor_number, soi, moo, road, subdistrict, district, province, postal_code,
                    is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
             FROM registration_clients WHERE id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: created[0],
            message: 'เพิ่มลูกค้าทะเบียนสำเร็จ',
        })
    } catch (error) {
        console.error('Create registration client error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/registration-clients/:id
 * แก้ไขข้อมูลลูกค้าทะเบียน
 */
router.put('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const {
            company_name, legal_entity_number, phone, group_name, line_api, notes, is_active,
            full_address, address_number, village, building, room_number,
            floor_number, soi, moo, road, subdistrict, district, province, postal_code
        } = req.body

        // Check exists
        const [existing] = await pool.execute(
            `SELECT id FROM registration_clients WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' })
        }

        // Validation
        if (company_name !== undefined && (!company_name || !company_name.trim())) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อลูกค้า / บริษัท' })
        }
        if (group_name !== undefined && (!group_name || !group_name.trim())) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อกลุ่ม' })
        }

        // Build dynamic update
        const updates = []
        const params = []

        if (company_name !== undefined) { updates.push('company_name = ?'); params.push(company_name.trim()) }
        if (legal_entity_number !== undefined) { updates.push('legal_entity_number = ?'); params.push(legal_entity_number || null) }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null) }
        if (group_name !== undefined) { updates.push('group_name = ?'); params.push(group_name.trim()) }
        if (line_api !== undefined) { updates.push('line_api = ?'); params.push(line_api || null) }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes || null) }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0) }
        // Address fields
        if (full_address !== undefined) { updates.push('full_address = ?'); params.push(full_address || null) }
        if (address_number !== undefined) { updates.push('address_number = ?'); params.push(address_number || null) }
        if (village !== undefined) { updates.push('village = ?'); params.push(village || null) }
        if (building !== undefined) { updates.push('building = ?'); params.push(building || null) }
        if (room_number !== undefined) { updates.push('room_number = ?'); params.push(room_number || null) }
        if (floor_number !== undefined) { updates.push('floor_number = ?'); params.push(floor_number || null) }
        if (soi !== undefined) { updates.push('soi = ?'); params.push(soi || null) }
        if (moo !== undefined) { updates.push('moo = ?'); params.push(moo || null) }
        if (road !== undefined) { updates.push('road = ?'); params.push(road || null) }
        if (subdistrict !== undefined) { updates.push('subdistrict = ?'); params.push(subdistrict || null) }
        if (district !== undefined) { updates.push('district = ?'); params.push(district || null) }
        if (province !== undefined) { updates.push('province = ?'); params.push(province || null) }
        if (postal_code !== undefined) { updates.push('postal_code = ?'); params.push(postal_code || null) }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })
        }

        params.push(id)
        await pool.execute(
            `UPDATE registration_clients SET ${updates.join(', ')} WHERE id = ?`,
            params
        )

        const [updated] = await pool.execute(
            `SELECT id, company_name, legal_entity_number, phone, group_name,
                    line_api, notes,
                    full_address, address_number, village, building, room_number,
                    floor_number, soi, moo, road, subdistrict, district, province, postal_code,
                    is_active,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
             FROM registration_clients WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            data: updated[0],
            message: 'แก้ไขข้อมูลลูกค้าสำเร็จ',
        })
    } catch (error) {
        console.error('Update registration client error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/registration-clients/:id
 * ลบลูกค้าทะเบียน (soft delete)
 */
router.delete('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM registration_clients WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' })
        }

        await pool.execute(
            `UPDATE registration_clients SET deleted_at = NOW() WHERE id = ?`,
            [id]
        )

        res.json({
            success: true,
            message: 'ลบข้อมูลลูกค้าสำเร็จ',
        })
    } catch (error) {
        console.error('Delete registration client error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
