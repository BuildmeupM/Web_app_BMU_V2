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
let hasTeamStatusColumn = null

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

async function checkTeamStatusColumn() {
    if (hasTeamStatusColumn !== null) return hasTeamStatusColumn
    try {
        await pool.execute(`SELECT team_status FROM registration_tasks LIMIT 1`)
        hasTeamStatusColumn = true
    } catch {
        hasTeamStatusColumn = false
    }
    return hasTeamStatusColumn
}

// Build SELECT columns based on available columns
function getTaskColumns(withSteps, withMessenger, withPayment, withTeamStatus) {
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

    if (withTeamStatus) {
        cols += `,
        t.team_status, ts.name as team_status_name, ts.color as team_status_color`
    }

    return cols
}

// Build FROM clause based on available columns
function getTaskFrom(withTeamStatus) {
    let from = `FROM registration_tasks t
    LEFT JOIN registration_work_types wt ON wt.id = t.job_type
    LEFT JOIN registration_work_sub_types wst ON wst.id = t.job_type_sub`
    if (withTeamStatus) {
        from += `
    LEFT JOIN registration_team_statuses ts ON ts.id = t.team_status`
    }
    return from
}

// Keep backward-compatible constant for routes that don't use team_status
const TASK_FROM = `FROM registration_tasks t
    LEFT JOIN registration_work_types wt ON wt.id = t.job_type
    LEFT JOIN registration_work_sub_types wst ON wst.id = t.job_type_sub`

// ============================================================
// GET /api/registration-tasks/messenger-pending
// ดึงเฉพาะงานที่ต้องวิ่งแมสแต่ยังไม่ได้จัดเส้นทาง
// ============================================================
router.get('/messenger-pending', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const withMessenger = await checkMessengerColumns()
        if (!withMessenger) {
            return res.json({ success: true, data: { tasks: [], count: 0 } })
        }

        const withSteps = await checkStepColumns()
        const withPayment = await checkPaymentColumns()
        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment)

        // Also join with registration_clients for address info
        // Only show tasks that have reached step 4 (รอวิ่งแมส): step_1,2,3 done, step_5 not done
        const stepFilter = withSteps
            ? `AND t.step_1 = 1 AND t.step_2 = 1 AND t.step_3 = 1 AND t.step_5 = 0`
            : ''
        const query = `SELECT ${TASK_COLUMNS},
            rc.full_address as client_address,
            rc.phone as client_phone,
            rc.subdistrict as client_subdistrict,
            rc.district as client_district,
            rc.province as client_province,
            rc.road as client_road,
            rc.postal_code as client_postal_code
            ${TASK_FROM}
            LEFT JOIN registration_clients rc ON rc.id = t.client_id
            WHERE t.deleted_at IS NULL
              AND t.needs_messenger = 1
              AND t.messenger_status = 'pending'
              ${stepFilter}
            ORDER BY t.received_date ASC, t.created_at ASC`

        const [tasks] = await pool.execute(query)

        res.json({
            success: true,
            data: {
                tasks: tasks,
                count: tasks.length,
            },
        })
    } catch (error) {
        console.error('Get messenger pending tasks error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// GET /api/registration-tasks/dashboard-summary
// ข้อมูลสรุปสำหรับ Dashboard (aggregated)
// ============================================================
router.get('/dashboard-summary', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        // Run all aggregation queries in parallel
        const [
            [deptStatus],
            [paymentBreakdown],
            [workload],
            [recentTasks],
            [clientCount],
            [messengerRoutes],
            [messengerPending],
        ] = await Promise.all([
            // 1. Per-department status counts
            pool.execute(`
                SELECT department, status, COUNT(*) as count
                FROM registration_tasks
                WHERE deleted_at IS NULL
                GROUP BY department, status
            `),
            // 2. Payment status breakdown
            pool.execute(`
                SELECT COALESCE(payment_status, 'unpaid') as payment_status, COUNT(*) as count
                FROM registration_tasks
                WHERE deleted_at IS NULL
                GROUP BY payment_status
            `),
            // 3. Workload per responsible (with department breakdown)
            pool.execute(`
                SELECT responsible_name, department,
                       COUNT(*) as total,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                FROM registration_tasks
                WHERE deleted_at IS NULL
                GROUP BY responsible_name, department
                ORDER BY total DESC
            `),
            // 4. Recent 10 tasks
            pool.execute(`
                SELECT t.id, t.client_name,
                       COALESCE(wt.name, t.job_type) as job_type,
                       t.department, t.status,
                       DATE_FORMAT(t.received_date, '%Y-%m-%d') as received_date
                FROM registration_tasks t
                LEFT JOIN registration_work_types wt ON wt.id = t.job_type
                WHERE t.deleted_at IS NULL
                ORDER BY t.received_date DESC, t.created_at DESC
                LIMIT 10
            `),
            // 5. Total distinct clients
            pool.execute(`
                SELECT COUNT(DISTINCT client_id) as total_clients
                FROM registration_tasks
                WHERE deleted_at IS NULL
            `),
            // 6. Messenger routes summary (this month)
            pool.execute(`
                SELECT
                  COUNT(*) as total_routes,
                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_routes,
                  SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_routes,
                  SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_routes,
                  COALESCE(SUM(total_distance), 0) as total_distance
                FROM messenger_routes
                WHERE deleted_at IS NULL
                  AND route_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            `),
            // 7. Messenger pending tasks count
            pool.execute(`
                SELECT COUNT(*) as pending_count
                FROM registration_tasks
                WHERE deleted_at IS NULL
                  AND needs_messenger = 1
                  AND (messenger_status IS NULL OR messenger_status = 'pending')
            `),
        ])

        // Build per-department summary
        const departments = ['dbd', 'rd', 'sso', 'hr']
        const byDepartment = {}
        for (const dept of departments) {
            byDepartment[dept] = { pending: 0, in_progress: 0, completed: 0, total: 0 }
        }
        for (const row of deptStatus) {
            if (byDepartment[row.department]) {
                byDepartment[row.department][row.status] = Number(row.count)
                byDepartment[row.department].total += Number(row.count)
            }
        }

        // Build totals
        let totalPending = 0, totalInProgress = 0, totalCompleted = 0
        for (const dept of departments) {
            totalPending += byDepartment[dept].pending
            totalInProgress += byDepartment[dept].in_progress
            totalCompleted += byDepartment[dept].completed
        }

        res.json({
            success: true,
            data: {
                totals: {
                    all: totalPending + totalInProgress + totalCompleted,
                    pending: totalPending,
                    in_progress: totalInProgress,
                    completed: totalCompleted,
                    clients: Number(clientCount[0]?.total_clients || 0),
                },
                byDepartment,
                payment: paymentBreakdown.map(r => ({
                    status: r.payment_status,
                    count: Number(r.count),
                })),
                workload: (() => {
                    const personMap = {}
                    for (const r of workload) {
                        const name = r.responsible_name
                        if (!personMap[name]) {
                            personMap[name] = { name, total: 0, completed: 0, in_progress: 0, pending: 0, departments: {} }
                        }
                        const p = personMap[name]
                        const t = Number(r.total), c = Number(r.completed), ip = Number(r.in_progress), pd = Number(r.pending)
                        p.total += t
                        p.completed += c
                        p.in_progress += ip
                        p.pending += pd
                        if (r.department) {
                            p.departments[r.department] = { total: t, completed: c, in_progress: ip, pending: pd }
                        }
                    }
                    return Object.values(personMap).sort((a, b) => b.total - a.total).slice(0, 10)
                })(),
                recentTasks: recentTasks,
                messengerSummary: {
                    total_routes: Number(messengerRoutes[0]?.total_routes || 0),
                    completed_routes: Number(messengerRoutes[0]?.completed_routes || 0),
                    active_routes: Number(messengerRoutes[0]?.active_routes || 0),
                    planned_routes: Number(messengerRoutes[0]?.planned_routes || 0),
                    total_distance: Number(messengerRoutes[0]?.total_distance || 0),
                    pending_tasks: Number(messengerPending[0]?.pending_count || 0),
                },
            }
        })
    } catch (error) {
        console.error('Dashboard summary error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ============================================================
// GET /api/registration-tasks?department=dbd
// ดึงรายการงานทั้งหมด (กรองตาม department)
// ============================================================
router.get('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const withSteps = await checkStepColumns()
        const withMessenger = await checkMessengerColumns()
        const withPayment = await checkPaymentColumns()
        const withTeamStatus = await checkTeamStatusColumn()
        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment, withTeamStatus)
        const TASK_FROM_Q = getTaskFrom(withTeamStatus)
        const { department, status, search } = req.query

        let query = `SELECT ${TASK_COLUMNS} ${TASK_FROM_Q} WHERE t.deleted_at IS NULL`
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

        // Filter by payment_status
        const { payment_status } = req.query
        if (payment_status) {
            query += ` AND COALESCE(t.payment_status, 'unpaid') = ?`
            params.push(payment_status)
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
        if (!withTeamStatus) {
            enrichedTasks = enrichedTasks.map(t => ({
                ...t,
                team_status: null, team_status_name: null, team_status_color: null,
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
            team_status,
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

        // Only include team_status if column exists
        const withTeamStatus = await checkTeamStatusColumn()
        if (withTeamStatus) {
            if (team_status !== undefined) { fields.push('team_status = ?'); values.push(team_status || null) }
        }

        if (fields.length > 0) {
            values.push(id)
            await pool.execute(
                `UPDATE registration_tasks SET ${fields.join(', ')} WHERE id = ?`,
                values
            )
        }

        const TASK_COLUMNS = getTaskColumns(withSteps, withMessenger, withPayment, withTeamStatus)
        const TASK_FROM_Q = getTaskFrom(withTeamStatus)
        const [updated] = await pool.execute(
            `SELECT ${TASK_COLUMNS} ${TASK_FROM_Q} WHERE t.id = ?`,
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
        if (!withTeamStatus) {
            result = {
                ...result,
                team_status: null, team_status_name: null, team_status_color: null,
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
