/**
 * Accounting Fee Notes Routes
 * Routes สำหรับระบบจดบันทึกเรื่องค่าทำบัญชี
 */

import express from 'express'
import xlsx from 'xlsx'
import pool from '../../config/database.js'
import { authenticateToken } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'
import { invalidateCache } from '../../middleware/cache.js'

const router = express.Router()

/** Category labels for Thai display */
const CATEGORY_LABELS = {
  customer_cancel: 'ลูกค้ายกเลิก',
  fee_adjustment: 'ลูกค้าปรับค่าทำบัญชี',
  address_change: 'ลูกค้าเปลี่ยนที่อยู่',
  name_change: 'ลูกค้าเปลี่ยนชื่อ',
  customer_return: 'ลูกค้ากลับมาทำ',
}

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS)

/**
 * GET /api/accounting-fee-notes
 * List notes with filters (category, month, search, pagination)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      year = '',
      month = '',
      search = '',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const whereConditions = ['n.deleted_at IS NULL']
    const queryParams = []

    if (category && VALID_CATEGORIES.includes(category)) {
      whereConditions.push('n.category = ?')
      queryParams.push(category)
    }

    if (year) {
      whereConditions.push('YEAR(n.created_at) = ?')
      queryParams.push(parseInt(year))
    }

    if (month) {
      whereConditions.push('MONTH(n.created_at) = ?')
      queryParams.push(parseInt(month))
    }

    if (search) {
      whereConditions.push('(n.customer_name LIKE ? OR n.note LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.join(' AND ')

    // Total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM accounting_fee_notes n WHERE ${whereClause}`,
      queryParams
    )
    const total = countResult[0]?.total || 0

    // Fetch notes with creator info
    const [notes] = await pool.execute(
      `SELECT 
        n.id,
        n.category,
        n.customer_name,
        n.note,
        n.created_by,
        n.created_at,
        n.updated_at,
        u.username as created_by_username,
        e.first_name as created_by_name,
        e.nick_name as created_by_nick_name
      FROM accounting_fee_notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: notes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching accounting fee notes:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลโน๊ตได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-fee-notes/summary
 * Dashboard summary: counts per category, optionally filtered by month/year
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { year = '', month = '' } = req.query

    const whereConditions = ['deleted_at IS NULL']
    const queryParams = []

    if (year) {
      whereConditions.push('YEAR(created_at) = ?')
      queryParams.push(parseInt(year))
    }

    if (month) {
      whereConditions.push('MONTH(created_at) = ?')
      queryParams.push(parseInt(month))
    }

    const whereClause = whereConditions.join(' AND ')

    const [summary] = await pool.execute(
      `SELECT 
        category,
        COUNT(*) as count
      FROM accounting_fee_notes
      WHERE ${whereClause}
      GROUP BY category`,
      queryParams
    )

    // Build complete summary with all categories (zeroed where no data)
    const summaryMap = {}
    for (const cat of VALID_CATEGORIES) {
      summaryMap[cat] = { category: cat, label: CATEGORY_LABELS[cat], count: 0 }
    }
    for (const row of summary) {
      if (summaryMap[row.category]) {
        summaryMap[row.category].count = row.count
      }
    }

    // Total count
    const totalCount = Object.values(summaryMap).reduce((sum, item) => sum + item.count, 0)

    res.json({
      success: true,
      data: {
        categories: Object.values(summaryMap),
        total: totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching accounting fee notes summary:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสรุปได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/accounting-fee-notes
 * Create a new note
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, customer_name, note } = req.body
    const userId = req.user.id

    // Validate
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `หัวข้อไม่ถูกต้อง กรุณาเลือก: ${VALID_CATEGORIES.join(', ')}`,
      })
    }

    if (!customer_name || customer_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุชื่อลูกค้า',
      })
    }

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเนื้อหาโน๊ต',
      })
    }

    const id = generateUUID()

    await pool.execute(
      `INSERT INTO accounting_fee_notes (id, category, customer_name, note, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, category, customer_name.trim(), note.trim(), userId]
    )

    // Fetch the created note with creator info
    const [created] = await pool.execute(
      `SELECT 
        n.id, n.category, n.customer_name, n.note, n.created_by, n.created_at, n.updated_at,
        u.username as created_by_username,
        e.first_name as created_by_name,
        e.nick_name as created_by_nick_name
      FROM accounting_fee_notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE n.id = ?`,
      [id]
    )

    // Invalidate backend cache so next GET returns fresh data
    invalidateCache('accounting-fee-notes')

    res.status(201).json({
      success: true,
      message: 'สร้างโน๊ตสำเร็จ',
      data: created[0],
    })
  } catch (error) {
    console.error('Error creating accounting fee note:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างโน๊ตได้',
      error: error.message,
    })
  }
})

/**
 * PUT /api/accounting-fee-notes/:id
 * Update an existing note
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { category, customer_name, note } = req.body

    // Check if note exists
    const [existing] = await pool.execute(
      'SELECT id, created_by FROM accounting_fee_notes WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบโน๊ตที่ต้องการแก้ไข',
      })
    }

    // Validate
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `หัวข้อไม่ถูกต้อง กรุณาเลือก: ${VALID_CATEGORIES.join(', ')}`,
      })
    }

    // Build update fields dynamically
    const updates = []
    const params = []

    if (category) {
      updates.push('category = ?')
      params.push(category)
    }
    if (customer_name !== undefined) {
      updates.push('customer_name = ?')
      params.push(customer_name.trim())
    }
    if (note !== undefined) {
      updates.push('note = ?')
      params.push(note.trim())
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการอัปเดต',
      })
    }

    params.push(id)

    await pool.execute(
      `UPDATE accounting_fee_notes SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    // Fetch updated note
    const [updated] = await pool.execute(
      `SELECT 
        n.id, n.category, n.customer_name, n.note, n.created_by, n.created_at, n.updated_at,
        u.username as created_by_username,
        e.first_name as created_by_name,
        e.nick_name as created_by_nick_name
      FROM accounting_fee_notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE n.id = ?`,
      [id]
    )

    // Invalidate backend cache so next GET returns fresh data
    invalidateCache('accounting-fee-notes')

    res.json({
      success: true,
      message: 'อัปเดตโน๊ตสำเร็จ',
      data: updated[0],
    })
  } catch (error) {
    console.error('Error updating accounting fee note:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตโน๊ตได้',
      error: error.message,
    })
  }
})

/**
 * DELETE /api/accounting-fee-notes/:id
 * Soft delete a note
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if note exists
    const [existing] = await pool.execute(
      'SELECT id FROM accounting_fee_notes WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบโน๊ตที่ต้องการลบ',
      })
    }

    await pool.execute(
      'UPDATE accounting_fee_notes SET deleted_at = NOW() WHERE id = ?',
      [id]
    )

    // Invalidate backend cache so next GET returns fresh data
    invalidateCache('accounting-fee-notes')

    res.json({
      success: true,
      message: 'ลบโน๊ตสำเร็จ',
    })
  } catch (error) {
    console.error('Error deleting accounting fee note:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบโน๊ตได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-fee-notes/export
 * Export notes to Excel — summary + detail sheets
 * Query params: year, month, category (all optional)
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { year = '', month = '', category = '' } = req.query
    const currentYear = year || new Date().getFullYear()

    const monthNames = [
      '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ]

    // Build WHERE clause
    const whereConditions = ['n.deleted_at IS NULL']
    const queryParams = []

    if (year) {
      whereConditions.push('YEAR(n.created_at) = ?')
      queryParams.push(parseInt(year))
    }
    if (month) {
      whereConditions.push('MONTH(n.created_at) = ?')
      queryParams.push(parseInt(month))
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      whereConditions.push('n.category = ?')
      queryParams.push(category)
    }

    const whereClause = whereConditions.join(' AND ')

    // Fetch all notes
    const [notes] = await pool.execute(
      `SELECT 
        n.id, n.category, n.customer_name, n.note, n.created_at,
        u.username as created_by_username,
        e.first_name as created_by_name,
        e.nick_name as created_by_nick_name
      FROM accounting_fee_notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC`,
      queryParams
    )

    // Summary: count per category
    const categoryCounts = {}
    for (const cat of VALID_CATEGORIES) {
      categoryCounts[cat] = 0
    }
    for (const note of notes) {
      if (categoryCounts[note.category] !== undefined) {
        categoryCounts[note.category]++
      }
    }

    // ── Sheet 1: Summary ──
    const summaryData = [
      ['สรุปรายการแจ้งเรื่องค่าทำบัญชี'],
      [`ปี: ${currentYear}${month ? ` เดือน: ${monthNames[parseInt(month)] || month}` : ' (ทุกเดือน)'}`],
      [],
      ['หัวข้อ', 'จำนวน (รายการ)'],
    ]
    for (const cat of VALID_CATEGORIES) {
      summaryData.push([CATEGORY_LABELS[cat], categoryCounts[cat]])
    }
    summaryData.push([])
    summaryData.push(['รวมทั้งหมด', notes.length])

    // ── Sheet 2: Detail ──
    const detailData = [
      ['ลำดับ', 'หัวข้อ', 'ชื่อลูกค้า', 'เนื้อหาโน๊ต', 'ผู้สร้าง', 'วันที่สร้าง'],
    ]
    notes.forEach((note, idx) => {
      const creatorName = note.created_by_nick_name || note.created_by_name || note.created_by_username || '-'
      const createdDate = note.created_at
        ? new Date(note.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '-'
      detailData.push([
        idx + 1,
        CATEGORY_LABELS[note.category] || note.category,
        note.customer_name,
        note.note,
        creatorName,
        createdDate,
      ])
    })

    // Create workbook
    const wb = xlsx.utils.book_new()

    // Summary sheet
    const wsSummary = xlsx.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }]
    xlsx.utils.book_append_sheet(wb, wsSummary, 'สรุป')

    // Detail sheet
    const wsDetail = xlsx.utils.aoa_to_sheet(detailData)
    wsDetail['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 50 }, { wch: 15 }, { wch: 15 }]
    xlsx.utils.book_append_sheet(wb, wsDetail, 'รายละเอียด')

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const monthLabel = month ? `_${monthNames[parseInt(month)] || month}` : ''
    const filename = `สรุปแจ้งเรื่องค่าทำบัญชี_${currentYear}${monthLabel}.xlsx`

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    console.error('Error exporting accounting fee notes:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถส่งออกข้อมูลได้',
      error: error.message,
    })
  }
})

export default router
