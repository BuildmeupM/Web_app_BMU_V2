/**
 * Salary Advance Routes
 * Routes สำหรับการจัดการการขอเบิกเงินเดือนล่วงหน้า
 */

import express from 'express'
import xlsx from 'xlsx'
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
 * GET /api/salary-advance/dashboard
 * Dashboard สรุปข้อมูลการเบิกเงินเดือน
 * Access: Admin, HR only
 */
router.get('/dashboard', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { year, month } = req.query
        const targetYear = year || new Date().getFullYear()
        const targetMonth = month || String(new Date().getMonth() + 1).padStart(2, '0')

        // Overall summary statistics
        const [summary] = await pool.execute(
            `SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'รออนุมัติ' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'ไม่อนุมัติ' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'อนุมัติแล้ว' THEN amount ELSE 0 END), 0) as total_approved_amount,
        COALESCE(SUM(CASE WHEN status = 'รออนุมัติ' THEN amount ELSE 0 END), 0) as total_pending_amount,
        COALESCE(SUM(amount), 0) as total_requested_amount
       FROM salary_advance_requests
       WHERE YEAR(request_date) = ?
         AND MONTH(request_date) = ?
         AND deleted_at IS NULL`,
            [targetYear, targetMonth]
        )

        // Monthly trend (last 6 months)
        const [monthlyTrend] = await pool.execute(
            `SELECT 
        DATE_FORMAT(request_date, '%Y-%m') as month,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        COALESCE(SUM(CASE WHEN status = 'อนุมัติแล้ว' THEN amount ELSE 0 END), 0) as approved_amount
       FROM salary_advance_requests
       WHERE request_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         AND deleted_at IS NULL
       GROUP BY DATE_FORMAT(request_date, '%Y-%m')
       ORDER BY month ASC`
        )

        // Top requesters this month
        const [topRequesters] = await pool.execute(
            `SELECT 
        sa.employee_id,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        COUNT(*) as request_count,
        COALESCE(SUM(sa.amount), 0) as total_amount
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       WHERE YEAR(sa.request_date) = ?
         AND MONTH(sa.request_date) = ?
         AND sa.deleted_at IS NULL
       GROUP BY sa.employee_id, e.full_name, e.nick_name, e.position
       ORDER BY total_amount DESC
       LIMIT 10`,
            [targetYear, targetMonth]
        )

        // Document requests summary
        const [docSummary] = await pool.execute(
            `SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'รออนุมัติ' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'อนุมัติแล้ว' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'ออกเอกสารแล้ว' THEN 1 END) as issued_count,
        COUNT(CASE WHEN document_type = 'หนังสือรับรองการทำงาน' THEN 1 END) as cert_work_count,
        COUNT(CASE WHEN document_type = 'หนังสือรับรองเงินเดือน' THEN 1 END) as cert_salary_count
       FROM document_requests
       WHERE YEAR(request_date) = ?
         AND MONTH(request_date) = ?
         AND deleted_at IS NULL`,
            [targetYear, targetMonth]
        )

        res.json({
            success: true,
            data: {
                salary_advance: {
                    summary: summary[0],
                    monthly_trend: monthlyTrend,
                    top_requesters: topRequesters,
                },
                document_requests: {
                    summary: docSummary[0],
                },
                filter: {
                    year: parseInt(targetYear),
                    month: parseInt(targetMonth),
                },
            },
        })
    } catch (error) {
        console.error('Get salary advance dashboard error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        })
    }
})

/**
 * GET /api/salary-advance/pending
 * ดึงคำขอที่รออนุมัติ
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
       FROM salary_advance_requests 
       WHERE status = 'รออนุมัติ' AND deleted_at IS NULL`
        )
        const total = countResults[0].total

        const [requests] = await pool.execute(
            `SELECT 
        sa.id,
        sa.employee_id,
        DATE_FORMAT(sa.request_date, '%Y-%m-%d') as request_date,
        sa.amount,
        sa.status,
        DATE_FORMAT(sa.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       WHERE sa.status = 'รออนุมัติ' AND sa.deleted_at IS NULL
       ORDER BY sa.request_date ASC, sa.created_at ASC
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
        console.error('Get pending salary advance error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/salary-advance
 * ดึงรายการคำขอเบิกเงินเดือน
 * Access: All (own data) / Admin,HR (all)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            start_date,
            end_date,
            search = '',
            employee_id,
        } = req.query

        const pageNum = parseInt(page)
        const limitNum = Math.min(parseInt(limit), 100)
        const offset = (pageNum - 1) * limitNum

        const isHRorAdmin = req.user.role === 'admin' || req.user.role === 'hr'

        const whereConditions = ['sa.deleted_at IS NULL']
        const queryParams = []

        if (!isHRorAdmin) {
            whereConditions.push('sa.employee_id = ?')
            queryParams.push(req.user.employee_id)
        } else if (employee_id) {
            whereConditions.push('sa.employee_id = ?')
            queryParams.push(employee_id)
        }

        if (status) {
            whereConditions.push('sa.status = ?')
            queryParams.push(status)
        }

        if (start_date) {
            whereConditions.push('sa.request_date >= ?')
            queryParams.push(start_date)
        }
        if (end_date) {
            whereConditions.push('sa.request_date <= ?')
            queryParams.push(end_date)
        }

        if (search) {
            whereConditions.push('(e.full_name LIKE ? OR sa.employee_id LIKE ?)')
            const searchPattern = `%${search}%`
            queryParams.push(searchPattern, searchPattern)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResults] = await pool.execute(
            `SELECT COUNT(*) as total 
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       ${whereClause}`,
            queryParams
        )
        const total = countResults[0].total

        const [requests] = await pool.execute(
            `SELECT 
        sa.id,
        sa.employee_id,
        DATE_FORMAT(sa.request_date, '%Y-%m-%d') as request_date,
        sa.amount,
        sa.status,
        sa.approved_by,
        DATE_FORMAT(sa.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        sa.approver_note,
        DATE_FORMAT(sa.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(sa.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name,
        e.position as employee_position,
        u.name as approver_name
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       LEFT JOIN users u ON sa.approved_by = u.id
       ${whereClause}
       ORDER BY sa.request_date DESC, sa.created_at DESC
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
        console.error('Get salary advance requests error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/salary-advance
 * สร้างคำขอเบิกเงินเดือนใหม่
 * Access: All
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุจำนวนเงินที่ถูกต้อง',
            })
        }

        if (!req.user.employee_id) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบรหัสพนักงาน',
            })
        }

        const id = generateUUID()
        const requestDate = new Date().toISOString().split('T')[0]

        await pool.execute(
            `INSERT INTO salary_advance_requests (
        id, employee_id, request_date, amount, status
      ) VALUES (?, ?, ?, ?, 'รออนุมัติ')`,
            [id, req.user.employee_id, requestDate, parseFloat(amount)]
        )

        const [requests] = await pool.execute(
            `SELECT 
        sa.id,
        sa.employee_id,
        DATE_FORMAT(sa.request_date, '%Y-%m-%d') as request_date,
        sa.amount,
        sa.status,
        DATE_FORMAT(sa.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        e.full_name as employee_name,
        e.nick_name as employee_nick_name
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       WHERE sa.id = ?`,
            [id]
        )

        res.status(201).json({
            success: true,
            data: { request: requests[0] },
        })
    } catch (error) {
        console.error('Create salary advance request error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/salary-advance/:id/approve
 * อนุมัติคำขอเบิกเงินเดือน
 * Access: Admin, HR only
 */
router.put('/:id/approve', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { id } = req.params
        const { approver_note } = req.body

        const [existing] = await pool.execute(
            `SELECT * FROM salary_advance_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอเบิกเงินเดือน' })
        }

        if (existing[0].status !== 'รออนุมัติ') {
            return res.status(400).json({ success: false, message: 'คำขอนี้ถูกดำเนินการแล้ว' })
        }

        await pool.execute(
            `UPDATE salary_advance_requests 
       SET status = 'อนุมัติแล้ว', approved_by = ?, approved_at = NOW(), approver_note = ?
       WHERE id = ?`,
            [req.user.id, approver_note || null, id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        sa.id, sa.employee_id, sa.amount, sa.status,
        DATE_FORMAT(sa.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        sa.approver_note,
        e.full_name as employee_name
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       WHERE sa.id = ?`,
            [id]
        )

        res.json({ success: true, data: { request: updated[0] } })
    } catch (error) {
        console.error('Approve salary advance error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/salary-advance/:id/reject
 * ไม่อนุมัติคำขอเบิกเงินเดือน
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
            `SELECT * FROM salary_advance_requests WHERE id = ? AND deleted_at IS NULL`,
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอเบิกเงินเดือน' })
        }

        if (existing[0].status !== 'รออนุมัติ') {
            return res.status(400).json({ success: false, message: 'คำขอนี้ถูกดำเนินการแล้ว' })
        }

        await pool.execute(
            `UPDATE salary_advance_requests 
       SET status = 'ไม่อนุมัติ', approved_by = ?, approved_at = NOW(), approver_note = ?
       WHERE id = ?`,
            [req.user.id, approver_note, id]
        )

        const [updated] = await pool.execute(
            `SELECT 
        sa.id, sa.employee_id, sa.amount, sa.status,
        DATE_FORMAT(sa.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
        sa.approver_note,
        e.full_name as employee_name
       FROM salary_advance_requests sa
       LEFT JOIN employees e ON sa.employee_id = e.employee_id
       WHERE sa.id = ?`,
            [id]
        )

        res.json({ success: true, data: { request: updated[0] } })
    } catch (error) {
        console.error('Reject salary advance error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/salary-advance/:id
 * ลบ/ยกเลิกคำขอเบิกเงินเดือน (เฉพาะเจ้าของคำขอ และสถานะ "รออนุมัติ" เท่านั้น)
 * Admin/HR สามารถลบได้ทุกรายการที่ยังรออนุมัติ
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr'

        const [existing] = await pool.execute(
            `SELECT * FROM salary_advance_requests WHERE id = ? AND deleted_at IS NULL`,
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
            `UPDATE salary_advance_requests SET deleted_at = NOW() WHERE id = ?`,
            [id]
        )

        res.json({ success: true, message: 'ลบคำขอเบิกเงินเดือนเรียบร้อยแล้ว' })
    } catch (error) {
        console.error('Delete salary advance error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/salary-advance/export-excel
 * ส่งออกข้อมูลสรุปการขอเบิกเงินเดือน และขอเอกสาร เป็นไฟล์ Excel
 * Query params: year, month
 * Access: Admin, HR only
 */
router.get('/export-excel', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
    try {
        const { year, month } = req.query
        const targetYear = year || new Date().getFullYear()
        const targetMonth = month || String(new Date().getMonth() + 1).padStart(2, '0')

        const monthLabels = {
            '1': 'มกราคม', '2': 'กุมภาพันธ์', '3': 'มีนาคม', '4': 'เมษายน',
            '5': 'พฤษภาคม', '6': 'มิถุนายน', '7': 'กรกฎาคม', '8': 'สิงหาคม',
            '9': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม',
            '01': 'มกราคม', '02': 'กุมภาพันธ์', '03': 'มีนาคม', '04': 'เมษายน',
            '05': 'พฤษภาคม', '06': 'มิถุนายน', '07': 'กรกฎาคม', '08': 'สิงหาคม',
            '09': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม',
        }
        const monthLabel = monthLabels[String(targetMonth)] || targetMonth
        const yearBE = parseInt(targetYear) + 543

        // ===== Sheet 1: Salary Advance Requests =====
        const [saRows] = await pool.execute(
            `SELECT 
                sa.employee_id,
                e.full_name as employee_name,
                e.nick_name as employee_nick_name,
                e.position as employee_position,
                DATE_FORMAT(sa.request_date, '%Y-%m-%d') as request_date,
                sa.amount,
                sa.status,
                sa.approver_note,
                DATE_FORMAT(sa.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
                u.name as approver_name
             FROM salary_advance_requests sa
             LEFT JOIN employees e ON sa.employee_id = e.employee_id
             LEFT JOIN users u ON sa.approved_by = u.id
             WHERE YEAR(sa.request_date) = ?
               AND MONTH(sa.request_date) = ?
               AND sa.deleted_at IS NULL
             ORDER BY sa.request_date ASC, sa.created_at ASC`,
            [targetYear, targetMonth]
        )

        const saData = []
        saData.push([`สรุปการขอเบิกเงินเดือน — ${monthLabel} ${yearBE}`])
        saData.push([])
        saData.push([
            'ลำดับ', 'รหัสพนักงาน', 'ชื่อ-สกุล', 'ชื่อเล่น', 'ตำแหน่ง',
            'วันที่ขอ', 'จำนวนเงิน (บาท)', 'สถานะ', 'ผู้อนุมัติ', 'วันที่อนุมัติ', 'หมายเหตุ',
        ])

        let totalAmount = 0
        let totalApproved = 0
        let totalPending = 0
        let totalRejected = 0

        saRows.forEach((row, index) => {
            const amount = Number(row.amount) || 0
            totalAmount += amount
            if (row.status === 'อนุมัติแล้ว') totalApproved += amount
            if (row.status === 'รออนุมัติ') totalPending += amount
            if (row.status === 'ไม่อนุมัติ') totalRejected += amount

            saData.push([
                index + 1,
                row.employee_id,
                row.employee_name,
                row.employee_nick_name || '',
                row.employee_position || '',
                row.request_date,
                amount,
                row.status,
                row.approver_name || '',
                row.approved_at || '',
                row.approver_note || '',
            ])
        })

        saData.push([])
        saData.push(['', '', '', '', '', 'รวมทั้งหมด', totalAmount, '', '', '', ''])
        saData.push(['', '', '', '', '', 'อนุมัติแล้ว', totalApproved, '', '', '', ''])
        saData.push(['', '', '', '', '', 'รออนุมัติ', totalPending, '', '', '', ''])
        saData.push(['', '', '', '', '', 'ไม่อนุมัติ', totalRejected, '', '', '', ''])

        // ===== Sheet 2: Document Requests =====
        const [docRows] = await pool.execute(
            `SELECT 
                dr.employee_id,
                e.full_name as employee_name,
                e.nick_name as employee_nick_name,
                e.position as employee_position,
                DATE_FORMAT(dr.request_date, '%Y-%m-%d') as request_date,
                dr.document_type,
                dr.purpose,
                dr.copies,
                dr.status,
                dr.approver_note,
                DATE_FORMAT(dr.approved_at, '%Y-%m-%d %H:%i:%s') as approved_at,
                DATE_FORMAT(dr.issued_at, '%Y-%m-%d %H:%i:%s') as issued_at,
                u.name as approver_name
             FROM document_requests dr
             LEFT JOIN employees e ON dr.employee_id = e.employee_id
             LEFT JOIN users u ON dr.approved_by = u.id
             WHERE YEAR(dr.request_date) = ?
               AND MONTH(dr.request_date) = ?
               AND dr.deleted_at IS NULL
             ORDER BY dr.request_date ASC, dr.created_at ASC`,
            [targetYear, targetMonth]
        )

        const docData = []
        docData.push([`สรุปการขอเอกสาร — ${monthLabel} ${yearBE}`])
        docData.push([])
        docData.push([
            'ลำดับ', 'รหัสพนักงาน', 'ชื่อ-สกุล', 'ชื่อเล่น', 'ตำแหน่ง',
            'วันที่ขอ', 'ประเภทเอกสาร', 'วัตถุประสงค์', 'จำนวนฉบับ',
            'สถานะ', 'ผู้อนุมัติ', 'วันที่อนุมัติ', 'วันที่ออกเอกสาร', 'หมายเหตุ',
        ])

        docRows.forEach((row, index) => {
            docData.push([
                index + 1,
                row.employee_id,
                row.employee_name,
                row.employee_nick_name || '',
                row.employee_position || '',
                row.request_date,
                row.document_type,
                row.purpose || '',
                row.copies,
                row.status,
                row.approver_name || '',
                row.approved_at || '',
                row.issued_at || '',
                row.approver_note || '',
            ])
        })

        docData.push([])
        docData.push(['', '', '', '', '', '', `จำนวนคำขอทั้งหมด: ${docRows.length}`, '', '', '', '', '', '', ''])

        // Create workbook
        const wb = xlsx.utils.book_new()

        // Sheet 1 — Salary Advance
        const ws1 = xlsx.utils.aoa_to_sheet(saData)
        ws1['!cols'] = [
            { wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 12 }, { wch: 18 },
            { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 25 },
        ]
        // Apply number format to amount column
        const moneyFormat = '#,##0.00'
        const saRange = xlsx.utils.decode_range(ws1['!ref'])
        for (let R = 3; R <= saRange.e.r; R++) {
            const cellRef = xlsx.utils.encode_cell({ r: R, c: 6 })
            if (ws1[cellRef] && typeof ws1[cellRef].v === 'number') {
                ws1[cellRef].z = moneyFormat
            }
        }
        xlsx.utils.book_append_sheet(wb, ws1, 'ขอเบิกเงินเดือน')

        // Sheet 2 — Document Requests
        const ws2 = xlsx.utils.aoa_to_sheet(docData)
        ws2['!cols'] = [
            { wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 12 }, { wch: 18 },
            { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 10 },
            { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
        ]
        xlsx.utils.book_append_sheet(wb, ws2, 'ขอเอกสาร')

        // Generate buffer
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
        const filename = `สรุปเบิกเงินเดือนและขอเอกสาร_${monthLabel}_${yearBE}.xlsx`

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.send(buffer)
    } catch (error) {
        console.error('Export salary advance excel error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router

