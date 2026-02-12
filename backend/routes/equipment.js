/**
 * Equipment Borrowing Routes
 * ระบบยืม-คืนอุปกรณ์คอมพิวเตอร์
 */

import express from 'express'
import { authenticateToken, authorize } from '../middleware/auth.js'
import pool from '../config/database.js'

const router = express.Router()

// ── ทุก route ต้อง login ก่อน ──
router.use(authenticateToken)

// ╔══════════════════════════════════╗
// ║           EQUIPMENT             ║
// ╚══════════════════════════════════╝

/**
 * GET /api/equipment/stats
 * สถิติอุปกรณ์
 */
router.get('/stats', async (req, res) => {
    try {
        const [statusCounts] = await pool.execute(
            `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
         SUM(CASE WHEN status = 'borrowed' THEN 1 ELSE 0 END) as borrowed,
         SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
         SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired
       FROM equipment`
        )

        // นับรายการที่เกินกำหนดคืน
        const [overdueCounts] = await pool.execute(
            `SELECT COUNT(*) as overdue
       FROM equipment_borrowings
       WHERE status IN ('borrowed', 'approved')
         AND expected_return_date < CURDATE()
         AND actual_return_date IS NULL`
        )

        res.json({
            success: true,
            data: {
                ...statusCounts[0],
                overdue: overdueCounts[0].overdue,
            },
        })
    } catch (error) {
        console.error('Error getting equipment stats:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/equipment
 * รายการอุปกรณ์ทั้งหมด (pagination + filter + sort)
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const offset = (page - 1) * limit
        const { search, category, status, sortBy, sortOrder } = req.query

        // Sorting whitelist
        const allowedSort = {
            name: 'e.name',
            category: 'e.category',
            status: 'e.status',
            brand: 'e.brand',
            created_at: 'e.created_at',
        }
        const sortCol = allowedSort[sortBy] || 'e.created_at'
        const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC'

        let where = 'WHERE 1=1'
        const params = []

        if (search) {
            where += ' AND (e.name LIKE ? OR e.brand LIKE ? OR e.model LIKE ? OR e.serial_number LIKE ?)'
            const s = `%${search}%`
            params.push(s, s, s, s)
        }
        if (category) {
            where += ' AND e.category = ?'
            params.push(category)
        }
        if (status) {
            where += ' AND e.status = ?'
            params.push(status)
        }

        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM equipment e ${where}`,
            params
        )

        const [rows] = await pool.execute(
            `SELECT e.*,
              (SELECT JSON_OBJECT(
                'id', eb.id,
                'borrower_name', u.name,
                'borrower_nick_name', u.nick_name,
                'borrow_date', eb.borrow_date,
                'expected_return_date', eb.expected_return_date,
                'status', eb.status
              )
              FROM equipment_borrowings eb
              LEFT JOIN users u ON eb.borrower_id = u.id
              WHERE eb.equipment_id = e.id
                AND eb.status IN ('pending', 'approved', 'borrowed')
              ORDER BY eb.created_at DESC
              LIMIT 1) as current_borrowing
       FROM equipment e
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        )

        // Parse current_borrowing JSON
        const equipment = rows.map(row => ({
            ...row,
            current_borrowing: row.current_borrowing ? JSON.parse(row.current_borrowing) : null,
        }))

        res.json({
            success: true,
            data: {
                equipment,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit),
                },
            },
        })
    } catch (error) {
        console.error('Error getting equipment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/equipment
 * เพิ่มอุปกรณ์ (admin เท่านั้น)
 */
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const { name, category, brand, model, serial_number, description, cpu, ram, storage, display, gpu, os, purchase_date, warranty_expire_date, purchase_price } = req.body

        if (!name || !category) {
            return res.status(400).json({ success: false, message: 'ชื่ออุปกรณ์และหมวดหมู่จำเป็นต้องกรอก' })
        }

        const [result] = await pool.execute(
            `INSERT INTO equipment (name, category, brand, model, serial_number, description, cpu, ram, storage, display, gpu, os, purchase_date, warranty_expire_date, purchase_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, brand || null, model || null, serial_number || null, description || null, cpu || null, ram || null, storage || null, display || null, gpu || null, os || null, purchase_date || null, warranty_expire_date || null, purchase_price || null]
        )

        // ดึง ID ที่เพิ่งสร้าง
        const [newRow] = await pool.execute(
            'SELECT * FROM equipment WHERE id = LAST_INSERT_ID() OR name = ? ORDER BY created_at DESC LIMIT 1',
            [name]
        )

        res.status(201).json({
            success: true,
            message: 'เพิ่มอุปกรณ์สำเร็จ',
            data: newRow[0] || null,
        })
    } catch (error) {
        console.error('Error creating equipment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/equipment/:id
 * แก้ไขอุปกรณ์ (admin เท่านั้น)
 */
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const { name, category, brand, model, serial_number, status, description, cpu, ram, storage, display, gpu, os, purchase_date, warranty_expire_date, purchase_price } = req.body

        const [existing] = await pool.execute('SELECT id FROM equipment WHERE id = ?', [id])
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        }

        await pool.execute(
            `UPDATE equipment SET name = ?, category = ?, brand = ?, model = ?, 
       serial_number = ?, status = ?, description = ?,
       cpu = ?, ram = ?, storage = ?, display = ?, gpu = ?, os = ?,
       purchase_date = ?, warranty_expire_date = ?, purchase_price = ?
       WHERE id = ?`,
            [name, category, brand || null, model || null, serial_number || null, status || 'available', description || null, cpu || null, ram || null, storage || null, display || null, gpu || null, os || null, purchase_date || null, warranty_expire_date || null, purchase_price || null, id]
        )

        const [updated] = await pool.execute('SELECT * FROM equipment WHERE id = ?', [id])

        res.json({
            success: true,
            message: 'แก้ไขอุปกรณ์สำเร็จ',
            data: updated[0],
        })
    } catch (error) {
        console.error('Error updating equipment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/equipment/:id
 * ลบอุปกรณ์ (admin เท่านั้น)
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params

        // ตรวจสอบว่ากำลังถูกยืมอยู่หรือไม่
        const [activeBorrowings] = await pool.execute(
            `SELECT id FROM equipment_borrowings WHERE equipment_id = ? AND status IN ('pending', 'approved', 'borrowed')`,
            [id]
        )
        if (activeBorrowings.length > 0) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบได้ อุปกรณ์กำลังถูกยืมอยู่' })
        }

        await pool.execute('DELETE FROM equipment WHERE id = ?', [id])

        res.json({ success: true, message: 'ลบอุปกรณ์สำเร็จ' })
    } catch (error) {
        console.error('Error deleting equipment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ╔══════════════════════════════════╗
// ║      EQUIPMENT BORROWINGS       ║
// ╚══════════════════════════════════╝

/**
 * GET /api/equipment/borrowings
 * รายการการยืม-คืน (pagination + filter + sort)
 */
router.get('/borrowings', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const offset = (page - 1) * limit
        const { search, status, sortBy, sortOrder } = req.query

        const allowedSort = {
            borrow_date: 'eb.borrow_date',
            expected_return_date: 'eb.expected_return_date',
            status: 'eb.status',
            created_at: 'eb.created_at',
            equipment_name: 'e.name',
            borrower_name: 'u.name',
        }
        const sortCol = allowedSort[sortBy] || 'eb.created_at'
        const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC'

        let where = 'WHERE 1=1'
        const params = []

        if (search) {
            where += ' AND (e.name LIKE ? OR u.name LIKE ? OR u.nick_name LIKE ?)'
            const s = `%${search}%`
            params.push(s, s, s)
        }
        if (status) {
            where += ' AND eb.status = ?'
            params.push(status)
        }

        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total
       FROM equipment_borrowings eb
       LEFT JOIN equipment e ON eb.equipment_id = e.id
       LEFT JOIN users u ON eb.borrower_id = u.id
       ${where}`,
            params
        )

        const [rows] = await pool.execute(
            `SELECT eb.*,
              e.name as equipment_name, e.category as equipment_category,
              e.brand as equipment_brand, e.model as equipment_model,
              e.serial_number as equipment_serial,
              u.name as borrower_name, u.nick_name as borrower_nick_name,
              approver.name as approver_name
       FROM equipment_borrowings eb
       LEFT JOIN equipment e ON eb.equipment_id = e.id
       LEFT JOIN users u ON eb.borrower_id = u.id
       LEFT JOIN users approver ON eb.approved_by = approver.id
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        )

        res.json({
            success: true,
            data: {
                borrowings: rows,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit),
                },
            },
        })
    } catch (error) {
        console.error('Error getting borrowings:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/equipment/borrowings
 * ส่งคำขอยืมอุปกรณ์
 */
router.post('/borrowings', async (req, res) => {
    try {
        const { equipment_id, borrow_date, expected_return_date, purpose } = req.body
        const borrower_id = req.user.id

        if (!equipment_id || !borrow_date || !expected_return_date) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
        }

        // ตรวจสอบอุปกรณ์พร้อมใช้งาน
        const [eq] = await pool.execute('SELECT status FROM equipment WHERE id = ?', [equipment_id])
        if (eq.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        }
        if (eq[0].status !== 'available') {
            return res.status(400).json({ success: false, message: 'อุปกรณ์ไม่พร้อมให้ยืม' })
        }

        await pool.execute(
            `INSERT INTO equipment_borrowings (equipment_id, borrower_id, borrow_date, expected_return_date, purpose, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
            [equipment_id, borrower_id, borrow_date, expected_return_date, purpose || null]
        )

        // อัพเดท equipment status เป็น borrowed
        await pool.execute("UPDATE equipment SET status = 'borrowed' WHERE id = ?", [equipment_id])

        res.status(201).json({ success: true, message: 'ส่งคำขอยืมสำเร็จ' })
    } catch (error) {
        console.error('Error creating borrowing:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/equipment/borrowings/:id/approve
 * อนุมัติคำขอยืม (admin)
 */
router.put('/borrowings/:id/approve', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params

        const [borrowing] = await pool.execute(
            'SELECT * FROM equipment_borrowings WHERE id = ?',
            [id]
        )
        if (borrowing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }
        if (borrowing[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ' })
        }

        await pool.execute(
            "UPDATE equipment_borrowings SET status = 'approved', approved_by = ? WHERE id = ?",
            [req.user.id, id]
        )

        res.json({ success: true, message: 'อนุมัติคำขอสำเร็จ' })
    } catch (error) {
        console.error('Error approving borrowing:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/equipment/borrowings/:id/reject
 * ปฏิเสธคำขอยืม (admin)
 */
router.put('/borrowings/:id/reject', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const { notes } = req.body

        const [borrowing] = await pool.execute(
            'SELECT * FROM equipment_borrowings WHERE id = ?',
            [id]
        )
        if (borrowing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }
        if (borrowing[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ' })
        }

        await pool.execute(
            "UPDATE equipment_borrowings SET status = 'rejected', notes = ?, approved_by = ? WHERE id = ?",
            [notes || null, req.user.id, id]
        )

        // คืนสถานะอุปกรณ์
        await pool.execute("UPDATE equipment SET status = 'available' WHERE id = ?", [borrowing[0].equipment_id])

        res.json({ success: true, message: 'ปฏิเสธคำขอสำเร็จ' })
    } catch (error) {
        console.error('Error rejecting borrowing:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/equipment/borrowings/:id/return
 * บันทึกคืนอุปกรณ์
 */
router.put('/borrowings/:id/return', async (req, res) => {
    try {
        const { id } = req.params
        const { notes } = req.body

        const [borrowing] = await pool.execute(
            'SELECT * FROM equipment_borrowings WHERE id = ?',
            [id]
        )
        if (borrowing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }
        if (!['approved', 'borrowed', 'overdue'].includes(borrowing[0].status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' })
        }

        // อนุญาตเฉพาะ admin หรือผู้ยืมเอง
        if (req.user.role !== 'admin' && req.user.id !== borrowing[0].borrower_id) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' })
        }

        const today = new Date().toISOString().split('T')[0]

        await pool.execute(
            "UPDATE equipment_borrowings SET status = 'returned', actual_return_date = ?, notes = COALESCE(?, notes) WHERE id = ?",
            [today, notes || null, id]
        )

        // คืนสถานะอุปกรณ์
        await pool.execute("UPDATE equipment SET status = 'available' WHERE id = ?", [borrowing[0].equipment_id])

        res.json({ success: true, message: 'คืนอุปกรณ์สำเร็จ' })
    } catch (error) {
        console.error('Error returning equipment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/equipment/borrowings/:id
 * ลบรายการยืม (admin)
 */
router.delete('/borrowings/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params

        const [borrowing] = await pool.execute(
            'SELECT * FROM equipment_borrowings WHERE id = ?',
            [id]
        )
        if (borrowing.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }

        // ถ้ายังไม่คืน ให้คืนสถานะอุปกรณ์
        if (['pending', 'approved', 'borrowed'].includes(borrowing[0].status)) {
            await pool.execute("UPDATE equipment SET status = 'available' WHERE id = ?", [borrowing[0].equipment_id])
        }

        await pool.execute('DELETE FROM equipment_borrowings WHERE id = ?', [id])

        res.json({ success: true, message: 'ลบรายการสำเร็จ' })
    } catch (error) {
        console.error('Error deleting borrowing:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ╔══════════════════════════════════╗
// ║    EQUIPMENT ASSIGNMENTS        ║
// ║   อุปกรณ์ที่มอบหมายให้พนักงาน     ║
// ╚══════════════════════════════════╝

/**
 * GET /api/equipment/assignments
 * รายการมอบหมายอุปกรณ์ (pagination + filter + sort)
 */
router.get('/assignments', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 50
        const offset = (page - 1) * limit
        const { search, status, employee_id, sortBy, sortOrder } = req.query

        const allowedSort = {
            assigned_date: 'ea.assigned_date',
            status: 'ea.status',
            created_at: 'ea.created_at',
            employee_name: 'u.name',
            equipment_name: 'e.name',
        }
        const sortCol = allowedSort[sortBy] || 'ea.assigned_date'
        const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC'

        let where = 'WHERE 1=1'
        const params = []

        if (search) {
            where += ' AND (e.name LIKE ? OR e.brand LIKE ? OR u.name LIKE ? OR u.nick_name LIKE ?)'
            const s = `%${search}%`
            params.push(s, s, s, s)
        }
        if (status) {
            where += ' AND ea.status = ?'
            params.push(status)
        } else {
            // default: แสดงเฉพาะ active
            where += " AND ea.status = 'active'"
        }
        if (employee_id) {
            where += ' AND ea.assigned_to = ?'
            params.push(employee_id)
        }

        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total
       FROM equipment_assignments ea
       LEFT JOIN equipment e ON ea.equipment_id = e.id
       LEFT JOIN users u ON ea.assigned_to = u.id
       ${where}`,
            params
        )

        const [rows] = await pool.execute(
            `SELECT ea.*,
              e.name as equipment_name, e.category as equipment_category,
              e.brand as equipment_brand, e.model as equipment_model,
              e.serial_number as equipment_serial, e.status as equipment_status,
              u.name as employee_name, u.nick_name as employee_nick_name,
              u.employee_id as employee_code,
              assigner.name as assigned_by_name
       FROM equipment_assignments ea
       LEFT JOIN equipment e ON ea.equipment_id = e.id
       LEFT JOIN users u ON ea.assigned_to = u.id
       LEFT JOIN users assigner ON ea.assigned_by = assigner.id
       ${where}
       ORDER BY u.name ASC, ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        )

        res.json({
            success: true,
            data: {
                assignments: rows,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit),
                },
            },
        })
    } catch (error) {
        console.error('Error getting assignments:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * POST /api/equipment/assignments
 * มอบหมายอุปกรณ์ให้พนักงาน (admin)
 */
router.post('/assignments', authorize('admin'), async (req, res) => {
    try {
        const { equipment_id, assigned_to, assigned_date, notes } = req.body

        if (!equipment_id || !assigned_to) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกอุปกรณ์และพนักงาน' })
        }

        // ตรวจสอบว่าอุปกรณ์มีอยู่
        const [eq] = await pool.execute('SELECT id, name, status FROM equipment WHERE id = ?', [equipment_id])
        if (eq.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        }

        // ตรวจสอบซ้ำ: อุปกรณ์นี้มอบหมายให้คนอื่นอยู่แล้วหรือไม่
        const [existing] = await pool.execute(
            "SELECT id FROM equipment_assignments WHERE equipment_id = ? AND status = 'active'",
            [equipment_id]
        )
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'อุปกรณ์นี้ถูกมอบหมายให้คนอื่นอยู่แล้ว' })
        }

        // ตรวจสอบพนักงาน
        const [user] = await pool.execute('SELECT id FROM users WHERE id = ?', [assigned_to])
        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบพนักงาน' })
        }

        await pool.execute(
            `INSERT INTO equipment_assignments (equipment_id, assigned_to, assigned_by, assigned_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
            [equipment_id, assigned_to, req.user.id, assigned_date || new Date().toISOString().split('T')[0], notes || null]
        )

        // อัพเดทสถานะอุปกรณ์เป็น borrowed (ถูกใช้งาน)
        await pool.execute("UPDATE equipment SET status = 'borrowed' WHERE id = ?", [equipment_id])

        res.status(201).json({ success: true, message: 'มอบหมายอุปกรณ์สำเร็จ' })
    } catch (error) {
        console.error('Error creating assignment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * PUT /api/equipment/assignments/:id/return
 * คืนอุปกรณ์ที่มอบหมาย
 */
router.put('/assignments/:id/return', async (req, res) => {
    try {
        const { id } = req.params
        const { notes } = req.body

        const [assignment] = await pool.execute(
            'SELECT * FROM equipment_assignments WHERE id = ?',
            [id]
        )
        if (assignment.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }
        if (assignment[0].status !== 'active') {
            return res.status(400).json({ success: false, message: 'รายการนี้คืนแล้ว' })
        }

        // อนุญาตเฉพาะ admin หรือพนักงานคนนั้น
        if (req.user.role !== 'admin' && req.user.id !== assignment[0].assigned_to) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' })
        }

        const today = new Date().toISOString().split('T')[0]

        await pool.execute(
            "UPDATE equipment_assignments SET status = 'returned', return_date = ?, notes = COALESCE(?, notes) WHERE id = ?",
            [today, notes || null, id]
        )

        // คืนสถานะอุปกรณ์
        await pool.execute("UPDATE equipment SET status = 'available' WHERE id = ?", [assignment[0].equipment_id])

        res.json({ success: true, message: 'คืนอุปกรณ์สำเร็จ' })
    } catch (error) {
        console.error('Error returning assignment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * DELETE /api/equipment/assignments/:id
 * ลบรายการมอบหมาย (admin)
 */
router.delete('/assignments/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params

        const [assignment] = await pool.execute(
            'SELECT * FROM equipment_assignments WHERE id = ?',
            [id]
        )
        if (assignment.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
        }

        // ถ้ายังใช้งานอยู่ ให้คืนสถานะอุปกรณ์
        if (assignment[0].status === 'active') {
            await pool.execute("UPDATE equipment SET status = 'available' WHERE id = ?", [assignment[0].equipment_id])
        }

        await pool.execute('DELETE FROM equipment_assignments WHERE id = ?', [id])

        res.json({ success: true, message: 'ลบรายการสำเร็จ' })
    } catch (error) {
        console.error('Error deleting assignment:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/equipment/employees
 * รายชื่อพนักงานทั้งหมด (สำหรับ dropdown)
 */
router.get('/employees', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, name, nick_name, employee_id FROM users WHERE status = 'active' OR status IS NULL ORDER BY name ASC"
        )
        res.json({ success: true, data: rows })
    } catch (error) {
        console.error('Error getting employees:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

export default router
