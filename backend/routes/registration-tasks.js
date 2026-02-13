/**
 * Registration Tasks Routes
 * CRUD สำหรับรายการงานจริงของระบบทะเบียน (DBD, RD, SSO, HR)
 * + Step tracking & Comments
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { generateUUID } from '../utils/leaveHelpers.js'

const router = express.Router()

// Check if step columns exist and cache the result
let hasStepColumns = null // null = not checked, true/false = result
let hasMessengerColumns = null
let hasPaymentColumns = null

async function checkStepColumns() {
    if (hasStepColumns !== null) return hasStepColumns
    try {
        await pool.execute(`SELECT step_1 FROM registration_tasks LIMIT 1`)
        hasStepColumns = true
    } catch {
        hasStepColumns = false
    }
    return hasStepColumns
}

async function checkMessengerColumns() {
    if (hasMessengerColumns !== null) return hasMessengerColumns
    try {
        await pool.execute(`SELECT needs_messenger FROM registration_tasks LIMIT 1`)
        hasMessengerColumns = true
    } catch {
        hasMessengerColumns = false
    }
    return hasMessengerColumns
}

async function checkPaymentColumns() {
    if (hasPaymentColumns !== null) return hasPaymentColumns
    try {
        await pool.execute(`SELECT payment_status FROM registration_tasks LIMIT 1`)
        hasPaymentColumns = true
    } catch {
        hasPaymentColumns = false
    }
    return hasPaymentColumns
}

// Build SELECT columns based on available columns
function getTaskColumns(withSteps, withMessenger, withPayment) {
    const base = `
        t.id, t.department,
        DATE_FORMAT(t.received_date, '%Y-%m-%d') as received_date,
        t.client_id, t.client_name, t.job_type, t.job_type_sub,
        wt.name as job_type_name,
        wst.name as job_type_sub_name,
        t.responsible_id, t.responsible_name, t.status, t.notes,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as created_at`

    let cols = base

    if (withSteps) {
        cols += `,
        t.step_1, t.step_2, t.step_3, t.step_4, t.step_5,
        DATE_FORMAT(t.completion_date, '%Y-%m-%d') as completion_date,
        t.invoice_url`
    }

    if (withMessenger) {
        cols += `,
        t.needs_messenger, t.messenger_destination, t.messenger_details,
        t.messenger_notes, t.messenger_status`
    }

    if (withPayment) {
        cols += `,
        t.payment_status, t.deposit_amount`
    }

    return cols
}

const TASK_FROM = `FROM registration_tasks t
    LEFT JOIN registration_work_types wt ON wt.id = t.job_type
    LEFT JOIN registration_work_sub_types wst ON wst.id = t.job_type_sub`

// ============================================================
// GET /api/registration-tasks?department=dbd
// ดึงรายการงานทั้งหมด (กรองตาม department)
// ============================================================
router.get('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const withSteps = await checkStepColumns()
        const withMessenger = await checkMessengerColumns()
        const withPayment = await checkPaymentColumns()
        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment)
        const { department, status, search } = req.query

        let query = `SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE t.deleted_at IS NULL`
        const params = []

        if (department) {
            query += ` AND t.department = ?`
            params.push(department)
        }

        // Filter by client_id (for cross-department client history)
        const { client_id } = req.query
        if (client_id) {
            query += ` AND t.client_id = ?`
            params.push(client_id)
        }

        if (status) {
            query += ` AND t.status = ?`
            params.push(status)
        }

        if (search) {
            query += ` AND (t.client_name LIKE ? OR t.responsible_name LIKE ? OR t.notes LIKE ?)`
            const searchPattern = `%${search}%`
            params.push(searchPattern, searchPattern, searchPattern)
        }

        query += ` ORDER BY t.received_date DESC, t.created_at DESC`

        const [tasks] = await pool.execute(query, params)

        // Add default values if columns don't exist
        let enrichedTasks = tasks
        if (!withSteps) {
            enrichedTasks = enrichedTasks.map(t => ({
                ...t,
                step_1: 0, step_2: 0, step_3: 0, step_4: 0, step_5: 0,
                completion_date: null, invoice_url: null,
            }))
        }
        if (!withMessenger) {
            enrichedTasks = enrichedTasks.map(t => ({
                ...t,
                needs_messenger: 0, messenger_destination: null,
                messenger_details: null, messenger_notes: null,
                messenger_status: 'pending',
            }))
        }
        if (!withPayment) {
            enrichedTasks = enrichedTasks.map(t => ({
                ...t,
                payment_status: 'unpaid', deposit_amount: null,
            }))
        }

        res.json({
            success: true,
            data: {
                tasks: enrichedTasks,
                count: tasks.length,
            },
        })
    } catch (error) {
        console.error('Get registration tasks error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// POST /api/registration-tasks
// สร้างรายการงานใหม่
// ============================================================
router.post('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const {
            department, received_date, client_id, client_name,
            job_type, job_type_sub, responsible_id, responsible_name,
            status, notes,
        } = req.body

        // Validate required fields
        if (!department || !received_date || !client_id || !client_name || !job_type || !responsible_id || !responsible_name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            })
        }

        const validDepartments = ['dbd', 'rd', 'sso', 'hr']
        if (!validDepartments.includes(department)) {
            return res.status(400).json({
                success: false,
                message: 'department ไม่ถูกต้อง (ต้องเป็น dbd, rd, sso, hr)',
            })
        }

        const id = generateUUID()

        await pool.execute(
            `INSERT INTO registration_tasks 
                (id, department, received_date, client_id, client_name, job_type, job_type_sub, responsible_id, responsible_name, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, department, received_date, client_id, client_name,
                job_type, job_type_sub || null,
                responsible_id, responsible_name,
                status || 'pending', notes || null,
            ]
        )

        const withSteps = await checkStepColumns()
        const withMessenger = await checkMessengerColumns()
        const withPayment = await checkPaymentColumns()
        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment)

        const [created] = await pool.execute(
            `SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE t.id = ?`,
            [id]
        )

        let result = created[0]
        if (!withSteps) {
            result = {
                ...result,
                step_1: 0, step_2: 0, step_3: 0, step_4: 0, step_5: 0,
                completion_date: null, invoice_url: null,
            }
        }
        if (!withMessenger) {
            result = {
                ...result,
                needs_messenger: 0, messenger_destination: null,
                messenger_details: null, messenger_notes: null,
                messenger_status: 'pending',
            }
        }
        if (!withPayment) {
            result = {
                ...result,
                payment_status: 'unpaid', deposit_amount: null,
            }
        }

        res.status(201).json({
            success: true,
            data: { task: result },
            message: 'เพิ่มงานสำเร็จ',
        })
    } catch (error) {
        console.error('Create registration task error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// PUT /api/registration-tasks/:id
// แก้ไขรายการงาน (รวม step tracking + completion)
// ============================================================
router.put('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const {
            received_date, client_id, client_name,
            job_type, job_type_sub, responsible_id, responsible_name,
            status, notes,
            step_1, step_2, step_3, step_4, step_5,
            completion_date, invoice_url,
            needs_messenger, messenger_destination, messenger_details,
            messenger_notes, messenger_status,
            payment_status, deposit_amount,
        } = req.body

        // Check exists
        const [existing] = await pool.execute(
            `SELECT id FROM registration_tasks WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการงาน' })
        }

        const withSteps = await checkStepColumns()
        const withMessenger = await checkMessengerColumns()
        const withPayment = await checkPaymentColumns()

        // Build dynamic UPDATE
        const fields = []
        const values = []

        if (received_date !== undefined) { fields.push('received_date = ?'); values.push(received_date) }
        if (client_id !== undefined) { fields.push('client_id = ?'); values.push(client_id) }
        if (client_name !== undefined) { fields.push('client_name = ?'); values.push(client_name) }
        if (job_type !== undefined) { fields.push('job_type = ?'); values.push(job_type) }
        if (job_type_sub !== undefined) { fields.push('job_type_sub = ?'); values.push(job_type_sub || null) }
        if (responsible_id !== undefined) { fields.push('responsible_id = ?'); values.push(responsible_id) }
        if (responsible_name !== undefined) { fields.push('responsible_name = ?'); values.push(responsible_name) }
        if (status !== undefined) { fields.push('status = ?'); values.push(status) }
        if (notes !== undefined) { fields.push('notes = ?'); values.push(notes || null) }

        // Only include step fields if columns exist
        if (withSteps) {
            if (step_1 !== undefined) { fields.push('step_1 = ?'); values.push(step_1 ? 1 : 0) }
            if (step_2 !== undefined) { fields.push('step_2 = ?'); values.push(step_2 ? 1 : 0) }
            if (step_3 !== undefined) { fields.push('step_3 = ?'); values.push(step_3 ? 1 : 0) }
            if (step_4 !== undefined) { fields.push('step_4 = ?'); values.push(step_4 ? 1 : 0) }
            if (step_5 !== undefined) { fields.push('step_5 = ?'); values.push(step_5 ? 1 : 0) }
            if (completion_date !== undefined) { fields.push('completion_date = ?'); values.push(completion_date || null) }
            if (invoice_url !== undefined) { fields.push('invoice_url = ?'); values.push(invoice_url || null) }
        }

        // Only include messenger fields if columns exist
        if (withMessenger) {
            if (needs_messenger !== undefined) { fields.push('needs_messenger = ?'); values.push(needs_messenger ? 1 : 0) }
            if (messenger_destination !== undefined) { fields.push('messenger_destination = ?'); values.push(messenger_destination || null) }
            if (messenger_details !== undefined) { fields.push('messenger_details = ?'); values.push(messenger_details || null) }
            if (messenger_notes !== undefined) { fields.push('messenger_notes = ?'); values.push(messenger_notes || null) }
            if (messenger_status !== undefined) { fields.push('messenger_status = ?'); values.push(messenger_status || 'pending') }
        }

        // Only include payment fields if columns exist
        if (withPayment) {
            if (payment_status !== undefined) { fields.push('payment_status = ?'); values.push(payment_status || 'unpaid') }
            if (deposit_amount !== undefined) { fields.push('deposit_amount = ?'); values.push(deposit_amount !== null && deposit_amount !== '' ? deposit_amount : null) }
        }

        if (fields.length > 0) {
            values.push(id)
            await pool.execute(
                `UPDATE registration_tasks SET ${fields.join(', ')} WHERE id = ?`,
                values
            )
        }

        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment)
        const [updated] = await pool.execute(
            `SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE t.id = ?`,
            [id]
        )

        let result = updated[0]
        if (!withSteps) {
            result = {
                ...result,
                step_1: 0, step_2: 0, step_3: 0, step_4: 0, step_5: 0,
                completion_date: null, invoice_url: null,
            }
        }
        if (!withMessenger) {
            result = {
                ...result,
                needs_messenger: 0, messenger_destination: null,
                messenger_details: null, messenger_notes: null,
                messenger_status: 'pending',
            }
        }
        if (!withPayment) {
            result = {
                ...result,
                payment_status: 'unpaid', deposit_amount: null,
            }
        }

        res.json({
            success: true,
            data: { task: result },
            message: 'แก้ไขงานสำเร็จ',
        })
    } catch (error) {
        console.error('Update registration task error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// DELETE /api/registration-tasks/:id
// ลบรายการงาน (soft delete)
// ============================================================
router.delete('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT id FROM registration_tasks WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการงาน' })
        }

        await pool.execute(
            `UPDATE registration_tasks SET deleted_at = NOW() WHERE id = ?`,
            [id]
        )

        res.json({ success: true, message: 'ลบงานสำเร็จ' })
    } catch (error) {
        console.error('Delete registration task error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// GET /api/registration-tasks/:id/comments
// ดึงความเห็นทั้งหมดของงาน
// ============================================================
router.get('/:id/comments', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        // Check if comments table exists
        try {
            const [comments] = await pool.execute(
                `SELECT 
                    id, task_id, user_id, user_name, user_color, message,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
                 FROM registration_task_comments
                 WHERE task_id = ?
                 ORDER BY created_at ASC`,
                [id]
            )

            res.json({
                success: true,
                data: { comments },
            })
        } catch (err) {
            // Table doesn't exist yet, return empty
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ success: true, data: { comments: [] } })
            }
            throw err
        }
    } catch (error) {
        console.error('Get task comments error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// POST /api/registration-tasks/:id/comments
// เพิ่มความเห็นใหม่
// ============================================================
router.post('/:id/comments', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id: taskId } = req.params
        const { message } = req.body
        const user = req.user // from authenticateToken

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อความ',
            })
        }

        // Check task exists
        const [taskExists] = await pool.execute(
            `SELECT id FROM registration_tasks WHERE id = ? AND deleted_at IS NULL`,
            [taskId]
        )

        if (taskExists.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการงาน' })
        }

        const commentId = generateUUID()

        // Get user info + comment_color
        const userId = user.id || user.userId
        const userName = user.name || user.username || 'ระบบ'

        let userColor = '#2196F3'
        try {
            const [userRows] = await pool.execute(
                'SELECT comment_color FROM users WHERE id = ?',
                [userId]
            )
            if (userRows.length > 0 && userRows[0].comment_color) {
                userColor = userRows[0].comment_color
            }
        } catch (_) { /* column might not exist yet */ }

        await pool.execute(
            `INSERT INTO registration_task_comments (id, task_id, user_id, user_name, user_color, message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [commentId, taskId, userId, userName, userColor, message.trim()]
        )

        const [created] = await pool.execute(
            `SELECT 
                id, task_id, user_id, user_name, user_color, message,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
             FROM registration_task_comments WHERE id = ?`,
            [commentId]
        )

        res.status(201).json({
            success: true,
            data: { comment: created[0] },
            message: 'เพิ่มความเห็นสำเร็จ',
        })
    } catch (error) {
        console.error('Create task comment error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// ลบความเห็น
// ============================================================
router.delete('/:id/comments/:commentId', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { commentId } = req.params

        const [result] = await pool.execute(
            `DELETE FROM registration_task_comments WHERE id = ?`,
            [commentId]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบความเห็นนี้' })
        }

        res.json({
            success: true,
            message: 'ลบความเห็นสำเร็จ',
        })
    } catch (error) {
        console.error('Delete task comment error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
