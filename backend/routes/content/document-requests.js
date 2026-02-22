/**
 * Document Requests Routes
 * Routes สำหรับการจัดการคำขอเอกสาร (หนังสือรับรองการทำงาน / หนังสือรับรองเงินเดือน)
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'

const router = express.Router()

/**
 * Helper: Generate UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

/**
 * GET /api/document-requests/pending
 * ดึงคำขอเอกสารที่รออนุมัติ
 * Access: Admin, HR only
 */
router.get('/pending', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query
        const pageNum = parseInt(page)
        const limitNum = Math.min(parseInt(limit), 100)
        const offset = (pageNum - 1) * limitNum

        const [countResults] = await pool.execute(
            `SELECT COUNT(*) as total 
       FROM document_requests 
       WHERE status = 'รออนุมัติ' AND deleted_at IS NULL`
        )
        const total = countResults[0].total

        const [requests] = await pool.execute(
            `SELECT 
        dr.id,
        dr.employee_id,
        DATE_FORMAT(dr.request_date, '%Y-%m-%d') as request_date,
        dr.document_type,
        dr.purpose,
        dr.copies,
        dr.status,
        DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       WHERE dr.status = 'รออนุมัติ' AND dr.deleted_at IS NULL
       ORDER BY dr.request_date ASC, dr.created_at ASC
       LIMIT ? OFFSET ?`,
            [limitNum, offset]
        )

        res.json({
            success: true,
            data: {
                requests,
                pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
            },
        })
    } catch (error) {
        console.error('Get pending document requests error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/document-requests
 * ดึงรายการคำขอเอกสาร
 * Access: All (own data) / Admin,HR (all)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            document_type,
            search = '',
            employee_id,
        } = req.query

        const pageNum = parseInt(page)
        const limitNum = Math.min(parseInt(limit), 100)
        const offset = (pageNum - 1) * limitNum

        const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

        const whereConditions = ['dr.deleted_at IS NULL']
        const queryParams = []

        if (!isHRorAdmin) {
            whereConditions.push('dr.employee_id = ?')
            queryParams.push(req.user.employee_id)
        } else if (employee_id) {
            whereConditions.push('dr.employee_id = ?')
            queryParams.push(employee_id)
        }

        if (status) {
            whereConditions.push('dr.status = ?')
            queryParams.push(status)
        }

        if (document_type) {
            whereConditions.push('dr.document_type = ?')
            queryParams.push(document_type)
        }

        if (search) {
            whereConditions.push('(e.full_name LIKE ? OR dr.employee_id LIKE ?)')
            const searchPattern = `%${search}%`
            queryParams.push(searchPattern, searchPattern)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResults] = await pool.execute(
            `SELECT COUNT(*) as total 
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       ${whereClause}`,
            queryParams
        )
        const total = countResults[0].total

        const [requests] = await pool.execute(
            `SELECT 
        dr.id,
        dr.employee_id,
        DATE_FORMAT(dr.request_date, '%Y-%m-%d') as request_date,
        dr.document_type,
        dr.purpose,
        dr.copies,
        dr.status,
        dr.approved_by,
        DATE_FORMAT(dr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        dr.approver_note,
        DATE_FORMAT(dr.issued_at, '%Y-%m-%d %H:%i:%s') as issued_at,
        DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(dr.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        u.name as approver_name
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       LEFT JOIN users u ON dr.approved_by = u.id
       ${whereClause}
       ORDER BY dr.request_date DESC, dr.created_at DESC
       LIMIT ? OFFSET ?`,
            [...queryParams, limitNum, offset]
        )

        res.json({
            success: true,
            data: {
                requests,
                pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
            },
        })
    } catch (error) {
        console.error('Get document requests error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/document-requests
 * สร้างคำขอเอกสารใหม่
 * Access: All
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { document_type, purpose, copies } = req.body

        const validTypes = ['หนังสือรับรองการทำงาน', 'หนังสือรับรองเงินเดือน']
        if (!document_type || !validTypes.includes(document_type)) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกประเภทเอกสารที่ถูกต้อง',
            })
        }

        if (!req.user.employee_id) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบรหัสพนักงาน',
            })
        }

        const copiesNum = parseInt(copies) || 1
        if (copiesNum < 1 || copiesNum > 10) {
            return res.status(400).json({
                success: false,
                message: 'จำนวนฉบับต้องอยู่ระหว่าง 1-10',
            })
        }

        const id = generateUUID()
        const requestDate = new Date().toISOString().split('T')[0]

        await pool.execute(
            `INSERT INTO document_requests (
        id, employee_id, request_date, document_type, purpose, copies, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'รออนุมัติ')`,
            [id, req.user.employee_id, requestDate, document_type, purpose || null, copiesNum]
        )

        const [requests] = await pool.execute(
            `SELECT 
        dr.id,
        dr.employee_id,
        DATE_FORMAT(dr.request_date, '%Y-%m-%d') as request_date,
        dr.document_type,
        dr.purpose,
        dr.copies,
        dr.status,
        DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       WHERE dr.id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { request: requests[0] },
        })
    } catch (error) {
        console.error('Create document request error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/document-requests/:id/approve
 * อนุมัติคำขอเอกสาร
 * Access: Admin, HR only
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params
        const { approver_note } = req.body

        const [existing] = await pool.execute(
            `SELECT * FROM document_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอเอกสาร' })
        }

        if (existing[0].status !== 'รออนุมัติ') {
            return res.status(400).json({ success: false, message: 'คำขอนี้ถูกดำเนินการแล้ว' })
        }

        await pool.execute(
            `UPDATE document_requests 
       SET status = 'อนุมัติแล้ว', approved_by = ?, approved_at = NOW(), approver_note = ?
       WHERE id = ?`,
            [req.user.id, approver_note || null, id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        dr.id, dr.employee_id, dr.document_type, dr.status,
        DATE_FORMAT(dr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        dr.approver_note,
        e.full_name as employee_name
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       WHERE dr.id = ?`,
            [id]
        )

        res.json({ success: true, data: { request: updated[0] } })
    } catch (error) {
        console.error('Approve document request error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/document-requests/:id/reject
 * ไม่อนุมัติคำขอเอกสาร
 * Access: Admin, HR only
 */
router.put('/:id/reject', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params
        const { approver_note } = req.body

        if (!approver_note) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' })
        }

        const [existing] = await pool.execute(
            `SELECT * FROM document_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอเอกสาร' })
        }

        if (existing[0].status !== 'รออนุมัติ') {
            return res.status(400).json({ success: false, message: 'คำขอนี้ถูกดำเนินการแล้ว' })
        }

        await pool.execute(
            `UPDATE document_requests 
       SET status = 'ไม่อนุมัติ', approved_by = ?, approved_at = NOW(), approver_note = ?
       WHERE id = ?`,
            [req.user.id, approver_note, id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        dr.id, dr.employee_id, dr.document_type, dr.status,
        DATE_FORMAT(dr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        dr.approver_note,
        e.full_name as employee_name
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       WHERE dr.id = ?`,
            [id]
        )

        res.json({ success: true, data: { request: updated[0] } })
    } catch (error) {
        console.error('Reject document request error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/document-requests/:id/issue
 * บันทึกว่าออกเอกสารแล้ว
 * Access: Admin, HR only
 */
router.put('/:id/issue', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params

        const [existing] = await pool.execute(
            `SELECT * FROM document_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอเอกสาร' })
        }

        if (existing[0].status !== 'อนุมัติแล้ว') {
            return res.status(400).json({ success: false, message: 'ต้องอนุมัติคำขอก่อนจึงจะออกเอกสารได้' })
        }

        await pool.execute(
            `UPDATE document_requests 
       SET status = 'ออกเอกสารแล้ว', issued_at = NOW()
       WHERE id = ?`,
            [id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        dr.id, dr.employee_id, dr.document_type, dr.status,
        DATE_FORMAT(dr.issued_at, '%Y-%m-%d %H:%i:%s') as issued_at,
        e.full_name as employee_name
       FROM document_requests dr
       LEFT JOIN employees e ON dr.employee_id = e.employee_id
       WHERE dr.id = ?`,
            [id]
        )

        res.json({ success: true, data: { request: updated[0] } })
    } catch (error) {
        console.error('Issue document error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/document-requests/:id
 * ลบ/ยกเลิกคำขอเอกสาร (เฉพาะเจ้าของคำขอ และสถานะ "รออนุมัติ" เท่านั้น)
 * Admin/HR สามารถลบได้ทุกรายการที่ยังรออนุมัติ
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr'

        const [existing] = await pool.execute(
            `SELECT * FROM document_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอนี้' })
        }

        const request = existing[0]

        // ตรวจสอบสิทธิ์: เจ้าของเท่านั้น หรือ Admin/HR
        if (!isAdmin && request.employee_id !== req.user.employee_id) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบคำขอนี้' })
        }

        // ตรวจสอบสถานะ: ลบได้เฉพาะที่ยังรออนุมัติ
        if (request.status !== 'รออนุมัติ') {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถลบคำขอที่ดำเนินการแล้วได้ (สถานะปัจจุบัน: ' + request.status + ')',
            })
        }

        // Soft delete
        await pool.execute(
            `UPDATE document_requests SET deleted_at = NOW() WHERE id = ?`,
            [id]
        )

        res.json({ success: true, message: 'ลบคำขอเอกสารเรียบร้อยแล้ว' })
    } catch (error) {
        console.error('Delete document request error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
