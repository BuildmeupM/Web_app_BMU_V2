/**
 * Error Reports API Routes
 * รายงานข้อผิดพลาดด้านภาษี — งานบัญชีเชื่อมแมสทะเบียน
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import crypto from 'crypto'

const router = express.Router()

    // ============================================================
    // Auto-create error_reports table if not exists
    // ============================================================
    ; (async () => {
        try {
            await pool.execute(`
            CREATE TABLE IF NOT EXISTS error_reports (
                id                INT AUTO_INCREMENT PRIMARY KEY,
                report_date       DATE NOT NULL,
                client_id         INT NOT NULL,
                client_name       VARCHAR(255) NOT NULL,
                error_types       JSON NOT NULL,
                tax_months        JSON NOT NULL,
                accountant_id     VARCHAR(36) NOT NULL,
                accountant_name   VARCHAR(255) NOT NULL,
                auditor_id        VARCHAR(36) DEFAULT NULL,
                auditor_name      VARCHAR(255) DEFAULT NULL,
                fault_party       ENUM('bmu','customer') NOT NULL,
                fine_amount       DECIMAL(12,2) DEFAULT 0,
                submission_address TEXT DEFAULT NULL,
                status            ENUM('pending','approved','rejected') DEFAULT 'pending',
                approved_by       VARCHAR(36) DEFAULT NULL,
                approved_by_name  VARCHAR(255) DEFAULT NULL,
                approved_at       TIMESTAMP NULL DEFAULT NULL,
                reject_reason     TEXT DEFAULT NULL,
                messenger_task_id VARCHAR(36) DEFAULT NULL,
                created_by        VARCHAR(36) NOT NULL,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at        TIMESTAMP NULL DEFAULT NULL,
                INDEX idx_status (status),
                INDEX idx_created_by (created_by),
                INDEX idx_client_id (client_id),
                INDEX idx_report_date (report_date),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
            console.log('✅ error_reports table ready')

            // Fix column types if table was created with INT instead of VARCHAR(36)
            await pool.execute(`ALTER TABLE error_reports MODIFY COLUMN accountant_id VARCHAR(36) NOT NULL`)
            await pool.execute(`ALTER TABLE error_reports MODIFY COLUMN auditor_id VARCHAR(36) DEFAULT NULL`)
            await pool.execute(`ALTER TABLE error_reports MODIFY COLUMN approved_by VARCHAR(36) DEFAULT NULL`)
            await pool.execute(`ALTER TABLE error_reports MODIFY COLUMN created_by VARCHAR(36) NOT NULL`)
        } catch (err) {
            console.error('❌ Failed to auto-create error_reports table:', err.message)
        }
    })()

// ============================================================
// GET /api/error-reports — รายการทั้งหมด (filtered by role)
// ============================================================
router.get('/', authenticateToken, authorize('admin', 'audit', 'data_entry_and_service', 'service'), async (req, res) => {
    try {
        const user = req.user
        const isAdminOrAudit = ['admin', 'audit'].includes(user.role)

        let query = `
            SELECT er.*,
                rt.messenger_status,
                rt.messenger_destination
            FROM error_reports er
            LEFT JOIN registration_tasks rt ON rt.id = er.messenger_task_id
            WHERE er.deleted_at IS NULL
        `
        const params = []

        // Non-admin/audit users can only see their own reports
        if (!isAdminOrAudit) {
            query += ` AND er.created_by = ?`
            params.push(user.id)
        }

        query += ` ORDER BY er.created_at DESC`

        const [rows] = await pool.execute(query, params)

        res.json({
            success: true,
            data: rows,
        })
    } catch (error) {
        console.error('❌ Error fetching error reports:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' })
    }
})

// ============================================================
// GET /api/error-reports/auditors — ดึงพนักงาน role=audit
// ============================================================
router.get('/auditors', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, name, nick_name
             FROM users
             WHERE role = 'audit' AND (status = 'active' OR status IS NULL) AND deleted_at IS NULL
             ORDER BY name`
        )
        res.json({
            success: true,
            data: rows.map(r => ({
                id: r.id,
                name: r.name.includes('(') ? r.name : `${r.name}${r.nick_name ? ` (${r.nick_name})` : ''}`,
            })),
        })
    } catch (error) {
        console.error('❌ Error fetching auditors:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// ============================================================
// GET /api/error-reports/clients — ดึงรายชื่อลูกค้า (search + limit 5)
// ============================================================
router.get('/clients', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query
        let query = `SELECT build, company_name FROM clients WHERE deleted_at IS NULL`
        const params = []

        if (search && search.trim()) {
            const s = search.trim()
            // Match: build starts with search OR company_name contains search
            query += ` AND (CAST(build AS CHAR) LIKE ? OR company_name LIKE ?)`
            params.push(`${s}%`, `%${s}%`)
            // Order by relevance: exact build → build prefix → name starts-with → name contains
            query += ` ORDER BY
                CASE
                    WHEN CAST(build AS CHAR) = ? THEN 0
                    WHEN CAST(build AS CHAR) LIKE ? THEN 1
                    WHEN company_name LIKE ? THEN 2
                    ELSE 3
                END, company_name`
            params.push(s, `${s}%`, `${s}%`)
        } else {
            query += ` ORDER BY company_name`
        }

        query += ` LIMIT 5`

        const [rows] = await pool.execute(query, params)
        res.json({
            success: true,
            data: rows.map(r => ({
                id: r.build,
                name: `${r.build} - ${r.company_name}`,
            })),
        })
    } catch (error) {
        console.error('❌ Error fetching clients for error reports:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// ============================================================
// POST /api/error-reports — สร้างรายงานใหม่ (status=pending)
// ============================================================
router.post('/', authenticateToken, authorize('admin', 'audit', 'data_entry_and_service', 'service'), async (req, res) => {
    try {
        const user = req.user
        const {
            report_date, client_id, client_name,
            error_types, tax_months,
            auditor_id, auditor_name,
            fault_party, fine_amount,
            submission_address,
        } = req.body

        // Validate required fields
        if (!report_date || !client_id || !client_name || !error_types || !tax_months || !fault_party) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            })
        }

        const [result] = await pool.execute(
            `INSERT INTO error_reports
                (report_date, client_id, client_name, error_types, tax_months,
                 accountant_id, accountant_name, auditor_id, auditor_name,
                 fault_party, fine_amount, submission_address,
                 status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                report_date, client_id, client_name,
                JSON.stringify(error_types), JSON.stringify(tax_months),
                user.id, user.name,
                auditor_id || null, auditor_name || null,
                fault_party, fine_amount || 0, submission_address || null,
                user.id,
            ]
        )

        // Fetch the created record
        const [created] = await pool.execute(
            `SELECT * FROM error_reports WHERE id = ?`,
            [result.insertId]
        )

        res.status(201).json({
            success: true,
            message: 'สร้างรายงานข้อผิดพลาดเรียบร้อย',
            data: created[0],
        })
    } catch (error) {
        console.error('❌ Error creating error report:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างรายงาน' })
    }
})

// ============================================================
// PUT /api/error-reports/:id — แก้ไขรายงาน (only pending)
// ============================================================
router.put('/:id', authenticateToken, authorize('admin', 'audit', 'data_entry_and_service', 'service'), async (req, res) => {
    try {
        const { id } = req.params
        const user = req.user
        const isAdminOrAudit = ['admin', 'audit'].includes(user.role)

        // Check ownership (non-admin can only edit own reports)
        const [existing] = await pool.execute(
            `SELECT * FROM error_reports WHERE id = ? AND deleted_at IS NULL`, [id]
        )
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายงาน' })
        }
        if (!isAdminOrAudit && existing[0].created_by !== user.id) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขรายงานนี้' })
        }
        if (existing[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'ไม่สามารถแก้ไขรายงานที่อนุมัติ/ปฏิเสธแล้วได้' })
        }

        const {
            report_date, client_id, client_name,
            error_types, tax_months,
            auditor_id, auditor_name,
            fault_party, fine_amount,
            submission_address,
        } = req.body

        await pool.execute(
            `UPDATE error_reports SET
                report_date = ?, client_id = ?, client_name = ?,
                error_types = ?, tax_months = ?,
                auditor_id = ?, auditor_name = ?,
                fault_party = ?, fine_amount = ?, submission_address = ?
             WHERE id = ?`,
            [
                report_date, client_id, client_name,
                JSON.stringify(error_types), JSON.stringify(tax_months),
                auditor_id || null, auditor_name || null,
                fault_party, fine_amount || 0, submission_address || null,
                id,
            ]
        )

        const [updated] = await pool.execute(`SELECT * FROM error_reports WHERE id = ?`, [id])

        res.json({
            success: true,
            message: 'แก้ไขรายงานเรียบร้อย',
            data: updated[0],
        })
    } catch (error) {
        console.error('❌ Error updating error report:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไข' })
    }
})

// ============================================================
// POST /api/error-reports/:id/approve — อนุมัติ → auto-create messenger task
// ============================================================
router.post('/:id/approve', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
    try {
        const { id } = req.params
        const user = req.user

        const [existing] = await pool.execute(
            `SELECT * FROM error_reports WHERE id = ? AND deleted_at IS NULL`, [id]
        )
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายงาน' })
        }
        if (existing[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'รายงานนี้ได้รับการตรวจสอบแล้ว' })
        }

        const report = existing[0]

        // Parse JSON fields
        const errorTypes = typeof report.error_types === 'string' ? JSON.parse(report.error_types) : report.error_types
        const taxMonths = typeof report.tax_months === 'string' ? JSON.parse(report.tax_months) : report.tax_months

        // Create registration task with needs_messenger=1 → shows in "รอวิ่งแมส" tab
        const taskId = crypto.randomUUID()
        const jobDescription = `ปรับแบบภาษี: ${errorTypes.join(', ')} | เดือน: ${taxMonths.join(', ')} | ค่าปรับ: ${report.fine_amount || 0} บาท`

        await pool.execute(
            `INSERT INTO registration_tasks
                (id, department, received_date, client_id, client_name,
                 job_type, job_type_sub, responsible_id, responsible_name,
                 status, notes, needs_messenger, messenger_destination, messenger_details,
                 messenger_status, step_1, step_2, step_3, step_4, step_5)
             VALUES (?, 'rd', ?, ?, ?, 'error_report', NULL, ?, ?, 'in_progress', ?, 1, ?, ?, 'pending', 1, 1, 1, 0, 0)`,
            [
                taskId,
                report.report_date,
                String(report.client_id),
                report.client_name,
                report.accountant_id,
                report.accountant_name,
                `จากรายงานข้อผิดพลาด #${report.id} | ผู้ตรวจ: ${report.auditor_name || '-'} | ฝ่าย: ${report.fault_party === 'bmu' ? 'พนักงาน BMU' : 'ลูกค้า'}`,
                report.submission_address || '',
                jobDescription,
            ]
        )

        // Update error_report with approval info
        await pool.execute(
            `UPDATE error_reports SET
                status = 'approved',
                approved_by = ?,
                approved_by_name = ?,
                approved_at = NOW(),
                messenger_task_id = ?
             WHERE id = ?`,
            [user.id, user.name, taskId, id]
        )

        const [updated] = await pool.execute(`SELECT * FROM error_reports WHERE id = ?`, [id])

        res.json({
            success: true,
            message: 'อนุมัติรายงานเรียบร้อย — สร้างงานรอวิ่งแมสแล้ว',
            data: updated[0],
        })
    } catch (error) {
        console.error('❌ Error approving error report:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอนุมัติ' })
    }
})

// ============================================================
// POST /api/error-reports/:id/reject — ไม่อนุมัติ
// ============================================================
router.post('/:id/reject', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
    try {
        const { id } = req.params
        const user = req.user
        const { reject_reason } = req.body

        if (!reject_reason) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุเหตุผล' })
        }

        const [existing] = await pool.execute(
            `SELECT * FROM error_reports WHERE id = ? AND deleted_at IS NULL`, [id]
        )
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายงาน' })
        }
        if (existing[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'รายงานนี้ได้รับการตรวจสอบแล้ว' })
        }

        await pool.execute(
            `UPDATE error_reports SET
                status = 'rejected',
                approved_by = ?,
                approved_by_name = ?,
                approved_at = NOW(),
                reject_reason = ?
             WHERE id = ?`,
            [user.id, user.name, reject_reason, id]
        )

        const [updated] = await pool.execute(`SELECT * FROM error_reports WHERE id = ?`, [id])

        res.json({
            success: true,
            message: 'ปฏิเสธรายงานเรียบร้อย',
            data: updated[0],
        })
    } catch (error) {
        console.error('❌ Error rejecting error report:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// ============================================================
// DELETE /api/error-reports/:id — soft delete
// ============================================================
router.delete('/:id', authenticateToken, authorize('admin', 'audit'), async (req, res) => {
    try {
        const { id } = req.params

        await pool.execute(
            `UPDATE error_reports SET deleted_at = NOW() WHERE id = ?`, [id]
        )

        res.json({ success: true, message: 'ลบรายงานเรียบร้อย' })
    } catch (error) {
        console.error('❌ Error deleting error report:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

export default router
