/**
 * Position Groups Routes
 * Routes สำหรับจัดการกลุ่มตำแหน่งพนักงาน
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/position-groups
 * ดึงรายการกลุ่มตำแหน่งทั้งหมด พร้อมตำแหน่งในแต่ละกลุ่ม
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get all groups ordered by sort_order
        const [groups] = await pool.execute(
            `SELECT id, name, color, sort_order
             FROM position_groups
             ORDER BY sort_order ASC, name ASC`
        )

        // Get all items for all groups
        const [items] = await pool.execute(
            `SELECT id, group_id, position_name, sort_order
             FROM position_group_items
             ORDER BY sort_order ASC, position_name ASC`
        )

        // Map items into their groups
        const result = groups.map(group => ({
            ...group,
            positions: items
                .filter(item => item.group_id === group.id)
                .map(item => item.position_name),
        }))

        res.json({
            success: true,
            data: result,
        })
    } catch (error) {
        console.error('Get position groups error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    }
})

/**
 * PUT /api/position-groups
 * บันทึก/อัปเดตกลุ่มตำแหน่งทั้งหมด (bulk update)
 * Access: Admin, HR only
 * Body: { groups: [{ name: string, color: string, positions: string[] }] }
 */
router.put('/', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    const connection = await pool.getConnection()
    try {
        const { groups } = req.body

        if (!Array.isArray(groups)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request body: groups must be an array',
            })
        }

        await connection.beginTransaction()

        // 1. Delete all existing items and groups
        await connection.execute('DELETE FROM position_group_items')
        await connection.execute('DELETE FROM position_groups')

        // 2. Insert new groups and their items
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i]
            const groupId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`

            await connection.execute(
                `INSERT INTO position_groups (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
                [groupId, group.name, group.color || 'orange', i + 1]
            )

            if (Array.isArray(group.positions)) {
                for (let j = 0; j < group.positions.length; j++) {
                    const itemId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}-${j}-${Math.random().toString(36).slice(2)}`
                    await connection.execute(
                        `INSERT INTO position_group_items (id, group_id, position_name, sort_order) VALUES (?, ?, ?, ?)`,
                        [itemId, groupId, group.positions[j], j + 1]
                    )
                }
            }
        }

        await connection.commit()

        // Return the updated groups
        const [updatedGroups] = await pool.execute(
            `SELECT id, name, color, sort_order FROM position_groups ORDER BY sort_order ASC`
        )
        const [updatedItems] = await pool.execute(
            `SELECT group_id, position_name FROM position_group_items ORDER BY sort_order ASC`
        )

        const result = updatedGroups.map(g => ({
            ...g,
            positions: updatedItems.filter(item => item.group_id === g.id).map(item => item.position_name),
        }))

        res.json({
            success: true,
            message: 'Position groups updated successfully',
            data: result,
        })
    } catch (error) {
        await connection.rollback()
        console.error('Update position groups error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    } finally {
        connection.release()
    }
})

export default router
