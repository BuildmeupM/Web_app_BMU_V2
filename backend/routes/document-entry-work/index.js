/**
 * Document Entry Work Routes
 * Routes สำหรับการจัดการงานคีย์เอกสาร (Document Sorting Page)
 * เชื่อมกับหน้า คัดแยกเอกสาร
 *
 * Refactored: แยก helpers/notifications ออกเป็นไฟล์ย่อย
 * - helpers.js: getSubmissionCount, getDocumentEntryResponsible, getAccountingResponsible
 * - notifications.js: createAccountingNotificationForDocumentEntry, createReturnCommentNotification, createDocumentEntryNotification
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'
import { logActivity } from '../../utils/logActivity.js'
import { formatDateForResponse } from '../../utils/dateFormatter.js'

import { getSubmissionCount, getDocumentEntryResponsible, getAccountingResponsible } from './helpers.js'
import {
  createAccountingNotificationForDocumentEntry,
  createReturnCommentNotification,
  createDocumentEntryNotification,
} from './notifications.js'

const router = express.Router()


/**
 * GET /api/document-entry-work
 * ดึงรายการงานคีย์เอกสาร (paginated, filter)
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      build = '',
      year = '',
      month = '',
      accounting_responsible = '',
      document_entry_responsible = '',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 10000)
    const offset = (pageNum - 1) * limitNum

    // Build WHERE clause
    const whereConditions = ['dew.deleted_at IS NULL']
    const queryParams = []

    // Filter by build
    if (build) {
      whereConditions.push('dew.build = ?')
      queryParams.push(build)
    }

    // Filter by year and month
    if (year) {
      whereConditions.push('dew.work_year = ?')
      queryParams.push(year)
    }
    if (month) {
      whereConditions.push('dew.work_month = ?')
      queryParams.push(month)
    }

    // Filter by accounting_responsible (ดึงข้อมูลงานรับผิดชอบจากหน้า TaxStatus)
    if (accounting_responsible) {
      // Join with monthly_tax_data to filter by accounting_responsible
      whereConditions.push('mtd.accounting_responsible = ?')
      queryParams.push(accounting_responsible)
    }

    // Filter by document_entry_responsible (ดึงข้อมูลงานรับผิดชอบจากหน้า Document Entry)
    // Logic: ถ้า current_responsible_employee_id มีค่า → ใช้ current_responsible_employee_id
    //        ถ้า current_responsible_employee_id เป็น NULL → ใช้ responsible_employee_id
    if (document_entry_responsible) {
      whereConditions.push(
        `(dew.current_responsible_employee_id IS NOT NULL AND dew.current_responsible_employee_id = ?) OR (dew.current_responsible_employee_id IS NULL AND dew.responsible_employee_id = ?)`
      )
      queryParams.push(document_entry_responsible, document_entry_responsible)
    }

    // Build query
    const whereClause = whereConditions.join(' AND ')
    const joinClause = accounting_responsible
      ? 'LEFT JOIN monthly_tax_data mtd ON dew.build = mtd.build AND dew.work_year = mtd.tax_year AND dew.work_month = mtd.tax_month AND mtd.deleted_at IS NULL'
      : ''

    // Get total count
    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT dew.id) as total 
       FROM document_entry_work dew 
       ${joinClause}
       WHERE ${whereClause}`,
      queryParams
    )
    const total = countRows[0]?.total || 0

    // Get data with bot count and entry statuses
    const [rows] = await pool.execute(
      `SELECT DISTINCT
        dew.id,
        dew.build,
        c.company_name,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at,
        COALESCE(bot_counts.bot_count, 0) as bot_count
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       LEFT JOIN (
         SELECT document_entry_work_id, COUNT(*) as bot_count
         FROM document_entry_work_bots
         WHERE deleted_at IS NULL
         GROUP BY document_entry_work_id
       ) bot_counts ON dew.id = bot_counts.document_entry_work_id
       ${joinClause}
       WHERE ${whereClause}
       ORDER BY dew.entry_timestamp DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    // Format dates
    const formattedRows = rows.map((row) => ({
      ...row,
      entry_timestamp: formatDateForResponse(row.entry_timestamp),
      wht_entry_start_datetime: row.wht_entry_start_datetime ? formatDateForResponse(row.wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: row.wht_entry_completed_datetime ? formatDateForResponse(row.wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: row.vat_entry_start_datetime ? formatDateForResponse(row.vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: row.vat_entry_completed_datetime ? formatDateForResponse(row.vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: row.non_vat_entry_start_datetime ? formatDateForResponse(row.non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: row.non_vat_entry_completed_datetime ? formatDateForResponse(row.non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(row.created_at),
      updated_at: formatDateForResponse(row.updated_at),
      bot_count: parseInt(row.bot_count) || 0,
    }))

    res.json({
      success: true,
      data: formattedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching document entry work list:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลงานคีย์เอกสารได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/document-entry-work/summary
 * สรุปข้อมูลการคีย์เอกสาร (รายวัน/รายเดือน)
 * Access: All authenticated users
 * 
 * ⚠️ สำคัญ: ต้องอยู่ก่อน route `/:build/:year/:month` เพื่อไม่ให้ Express match `/summary` กับ `/:build/:year/:month`
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const {
      year = '',
      month = '',
      document_entry_responsible = '',
      group_by = 'day', // 'day' or 'month'
    } = req.query

    // Validation
    if (!year || !month || !document_entry_responsible) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: year, month, document_entry_responsible',
      })
    }

    // Build WHERE clause
    const whereConditions = [
      'dew.deleted_at IS NULL',
      'dew.work_year = ?',
      'dew.work_month = ?',
      `(dew.current_responsible_employee_id IS NOT NULL AND dew.current_responsible_employee_id = ?) OR (dew.current_responsible_employee_id IS NULL AND dew.responsible_employee_id = ?)`,
    ]
    const queryParams = [year, month, document_entry_responsible, document_entry_responsible]

    const whereClause = whereConditions.join(' AND ')

    // Get detailed data grouped by date/month and build
    let dateGroupClause = ''
    let orderByClause = ''

    if (group_by === 'day') {
      dateGroupClause = 'DATE(dew.entry_timestamp)'
      orderByClause = 'DATE(dew.entry_timestamp) DESC, c.company_name ASC'
    } else {
      dateGroupClause = 'dew.work_month'
      orderByClause = 'dew.work_month ASC, c.company_name ASC'
    }

    // Get detailed data with Build, Company Name, and Document Status
    const [rows] = await pool.execute(
      `SELECT 
        ${group_by === 'day' ? 'DATE(dew.entry_timestamp) as date,' : 'dew.work_month as month,'}
        dew.build,
        c.company_name,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        (dew.wht_document_count + dew.vat_document_count + dew.non_vat_document_count) as total_documents,
        (
          CASE WHEN dew.wht_entry_status = 'ดำเนินการเสร็จแล้ว' THEN dew.wht_document_count ELSE 0 END +
          CASE WHEN dew.vat_entry_status = 'ดำเนินการเสร็จแล้ว' THEN dew.vat_document_count ELSE 0 END +
          CASE WHEN dew.non_vat_entry_status = 'ดำเนินการเสร็จแล้ว' THEN dew.non_vat_document_count ELSE 0 END
        ) as completed_documents
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE ${whereClause}
         AND (
           dew.wht_entry_status = 'ดำเนินการเสร็จแล้ว' OR
           dew.vat_entry_status = 'ดำเนินการเสร็จแล้ว' OR
           dew.non_vat_entry_status = 'ดำเนินการเสร็จแล้ว'
         )
       ORDER BY ${orderByClause}`,
      queryParams
    )

    // Group data by date/month for summary
    const groupedData = {}
    const overallTotals = { total_documents: 0, completed_documents: 0, pending_documents: 0 }

    rows.forEach((row) => {
      const groupKey = group_by === 'day' ? row.date : `month_${row.month}`

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          date: group_by === 'day' ? formatDateForResponse(row.date) : null,
          month: group_by === 'month' ? parseInt(row.month) : null,
          items: [],
          total_documents: 0,
          completed_documents: 0,
          pending_documents: 0,
        }
      }

      const totalDocs = parseInt(row.total_documents) || 0
      const completedDocs = parseInt(row.completed_documents) || 0
      const pendingDocs = totalDocs - completedDocs

      groupedData[groupKey].items.push({
        build: row.build,
        company_name: row.company_name || '-',
        wht_document_count: parseInt(row.wht_document_count) || 0,
        wht_entry_status: row.wht_entry_status,
        vat_document_count: parseInt(row.vat_document_count) || 0,
        vat_entry_status: row.vat_entry_status,
        non_vat_document_count: parseInt(row.non_vat_document_count) || 0,
        non_vat_entry_status: row.non_vat_entry_status,
        total_documents: totalDocs,
        completed_documents: completedDocs,
        pending_documents: pendingDocs,
      })

      groupedData[groupKey].total_documents += totalDocs
      groupedData[groupKey].completed_documents += completedDocs
      groupedData[groupKey].pending_documents += pendingDocs

      overallTotals.total_documents += totalDocs
      overallTotals.completed_documents += completedDocs
      overallTotals.pending_documents += pendingDocs
    })

    // Convert grouped data to array format
    const formattedRows = Object.values(groupedData).map((group) => ({
      ...group,
      total_documents: parseInt(group.total_documents) || 0,
      completed_documents: parseInt(group.completed_documents) || 0,
      pending_documents: parseInt(group.pending_documents) || 0,
    }))

    // Sort by date/month (descending for day, ascending for month)
    formattedRows.sort((a, b) => {
      if (group_by === 'day') {
        return new Date(b.date) - new Date(a.date)
      } else {
        return a.month - b.month
      }
    })

    res.json({
      success: true,
      data: formattedRows,
      overall: overallTotals,
      group_by: group_by,
    })
  } catch (error) {
    console.error('Error fetching document entry work summary:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสรุปได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/document-entry-work/:build/:year/:month
 * ดึงข้อมูลงานคีย์เอกสารตาม Build, Year, Month (รวม bots)
 * Access: All authenticated users
 */
router.get('/:build/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { build, year, month } = req.params

    // Get document_entry_work with tax_registration_status from clients and document_entry_responsible from monthly_tax_data
    const [rows] = await pool.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        c.tax_registration_status,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.build = ? AND dew.work_year = ? AND dew.work_month = ? AND dew.deleted_at IS NULL
       LIMIT 1`,
      [build, year, month]
    )

    // Get submission_count (MAX) from database - ต้องเช็คจาก database เสมอ
    const submissionCount = await getSubmissionCount(build, parseInt(year), parseInt(month))

    // Get tax_registration_status and document_entry_responsible from clients and monthly_tax_data
    let taxRegistrationStatus = null
    let documentEntryResponsible = null

    if (rows.length === 0) {
      // If no document_entry_work exists, get from clients and monthly_tax_data
      const [clientRows] = await pool.execute(
        `SELECT tax_registration_status 
         FROM clients 
         WHERE build = ? AND deleted_at IS NULL 
         LIMIT 1`,
        [build]
      )
      if (clientRows.length > 0) {
        taxRegistrationStatus = clientRows[0].tax_registration_status
      }

      // Get document_entry_responsible from monthly_tax_data
      documentEntryResponsible = await getDocumentEntryResponsible(build, parseInt(year), parseInt(month))
    } else {
      taxRegistrationStatus = rows[0].tax_registration_status
      // Get document_entry_responsible from monthly_tax_data
      documentEntryResponsible = await getDocumentEntryResponsible(build, parseInt(year), parseInt(month))
    }

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        bots: [],
        submission_count: submissionCount,
        tax_registration_status: taxRegistrationStatus,
        document_entry_responsible: documentEntryResponsible, // เพิ่ม document_entry_responsible ใน response
      })
    }

    const documentEntryWork = rows[0]

    // Get bots
    const [bots] = await pool.execute(
      `SELECT 
        id,
        bot_type,
        document_count,
        ocr_additional_info,
        created_at,
        updated_at
       FROM document_entry_work_bots
       WHERE document_entry_work_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [documentEntryWork.id]
    )

    // Format dates
    const formattedData = {
      ...documentEntryWork,
      entry_timestamp: formatDateForResponse(documentEntryWork.entry_timestamp),
      wht_entry_start_datetime: documentEntryWork.wht_entry_start_datetime ? formatDateForResponse(documentEntryWork.wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: documentEntryWork.wht_entry_completed_datetime ? formatDateForResponse(documentEntryWork.wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: documentEntryWork.vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: documentEntryWork.vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: documentEntryWork.non_vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: documentEntryWork.non_vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(documentEntryWork.created_at),
      updated_at: formatDateForResponse(documentEntryWork.updated_at),
    }

    const formattedBots = bots.map((bot) => ({
      ...bot,
      created_at: formatDateForResponse(bot.created_at),
      updated_at: formatDateForResponse(bot.updated_at),
    }))

    res.json({
      success: true,
      data: formattedData,
      bots: formattedBots,
      submission_count: submissionCount, // ใช้ MAX(submission_count) จาก database เสมอ
      tax_registration_status: taxRegistrationStatus, // สถานะจดทะเบียนภาษีจาก clients table
      document_entry_responsible: documentEntryResponsible, // พนักงานที่รับผิดชอบในการคีย์จาก monthly_tax_data
    })
  } catch (error) {
    console.error('Error fetching document entry work:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลงานคีย์เอกสารได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/document-entry-work/:id
 * ดึงข้อมูลงานคีย์เอกสารตาม ID (รวม bots)
 * Access: All authenticated users
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Get document_entry_work
    const [rows] = await pool.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.id = ? AND dew.deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลงานคีย์เอกสาร',
      })
    }

    const documentEntryWork = rows[0]

    // Get bots
    const [bots] = await pool.execute(
      `SELECT 
        id,
        bot_type,
        document_count,
        ocr_additional_info,
        created_at,
        updated_at
       FROM document_entry_work_bots
       WHERE document_entry_work_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [documentEntryWork.id]
    )

    // Format dates
    const formattedData = {
      ...documentEntryWork,
      entry_timestamp: formatDateForResponse(documentEntryWork.entry_timestamp),
      wht_entry_start_datetime: documentEntryWork.wht_entry_start_datetime ? formatDateForResponse(documentEntryWork.wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: documentEntryWork.wht_entry_completed_datetime ? formatDateForResponse(documentEntryWork.wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: documentEntryWork.vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: documentEntryWork.vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: documentEntryWork.non_vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: documentEntryWork.non_vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(documentEntryWork.created_at),
      updated_at: formatDateForResponse(documentEntryWork.updated_at),
    }

    const formattedBots = bots.map((bot) => ({
      ...bot,
      created_at: formatDateForResponse(bot.created_at),
      updated_at: formatDateForResponse(bot.updated_at),
    }))

    res.json({
      success: true,
      data: formattedData,
      bots: formattedBots,
    })
  } catch (error) {
    console.error('Error fetching document entry work:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลงานคีย์เอกสารได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/document-entry-work
 * สร้างงานคีย์เอกสารใหม่ (พร้อม bots และ notification)
 * Access: All authenticated users
 */
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const {
      build,
      work_year,
      work_month,
      responsible_employee_id,
      wht_document_count = 0,
      vat_document_count = 0,
      non_vat_document_count = 0,
      submission_comment = null,
      return_comment = null,
      bots = [],
    } = req.body

    // Validation
    if (!build || !work_year || !work_month || !responsible_employee_id) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: build, work_year, work_month, responsible_employee_id',
      })
    }

    // Get submission_count
    const currentSubmissionCount = await getSubmissionCount(build, parseInt(work_year), parseInt(work_month))
    const newSubmissionCount = currentSubmissionCount + 1

    // Generate ID
    const id = generateUUID()
    const entryTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // Insert document_entry_work
    // ⚠️ สำคัญ: responsible_employee_id ต้องเป็น document_entry_responsible จาก monthly_tax_data
    // ⚠️ สำคัญ: current_responsible_employee_id ไม่ต้องส่งข้อมูลมา (ฟีเจอร์นี้ยังไม่ได้พัฒนา)
    await connection.execute(
      `INSERT INTO document_entry_work (
        id, build, work_year, work_month, entry_timestamp, submission_count,
        responsible_employee_id, current_responsible_employee_id,
        wht_document_count, vat_document_count, non_vat_document_count,
        submission_comment, return_comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        build,
        work_year,
        work_month,
        entryTimestamp,
        newSubmissionCount,
        responsible_employee_id, // ต้องเป็น document_entry_responsible จาก monthly_tax_data
        null, // current_responsible_employee_id ไม่ต้องส่งข้อมูลมา (ฟีเจอร์นี้ยังไม่ได้พัฒนา)
        wht_document_count,
        vat_document_count,
        non_vat_document_count,
        submission_comment,
        return_comment,
      ]
    )

    // Insert bots
    if (bots && bots.length > 0) {
      for (const bot of bots) {
        const botId = generateUUID()
        await connection.execute(
          `INSERT INTO document_entry_work_bots (
            id, document_entry_work_id, bot_type, document_count, ocr_additional_info
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            botId,
            id,
            bot.bot_type,
            bot.document_count || 0,
            bot.bot_type === 'ระบบ OCR' ? bot.ocr_additional_info || null : null,
          ]
        )
      }
    }

    // Get company name
    const [companyRows] = await connection.execute(
      'SELECT company_name FROM clients WHERE build = ? AND deleted_at IS NULL LIMIT 1',
      [build]
    )
    const companyName = companyRows[0]?.company_name || build

    // Get document_entry_responsible from monthly_tax_data
    const documentEntryResponsible = await getDocumentEntryResponsible(build, parseInt(work_year), parseInt(work_month))

    // Create notification for document entry responsible (พนักงานคีย์)
    if (documentEntryResponsible) {
      await createDocumentEntryNotification(
        documentEntryResponsible,
        build,
        companyName,
        newSubmissionCount,
        id,
        parseInt(work_year),
        parseInt(work_month)
      )
    }

    // Get accounting_responsible from monthly_tax_data
    const accountingResponsible = await getAccountingResponsible(build, parseInt(work_year), parseInt(work_month))

    // Create notification for accounting responsible (ผู้ทำบัญชี) - แจ้งว่ามีการส่งข้อมูลใหม่
    if (accountingResponsible) {
      // Notify for each document type that has data
      if (wht_document_count > 0) {
        await createAccountingNotificationForDocumentEntry(
          accountingResponsible,
          build,
          companyName,
          newSubmissionCount,
          id,
          parseInt(work_year),
          parseInt(work_month),
          'wht',
          'กำลังดำเนินการ'
        )
      }
      if (vat_document_count > 0) {
        await createAccountingNotificationForDocumentEntry(
          accountingResponsible,
          build,
          companyName,
          newSubmissionCount,
          id,
          parseInt(work_year),
          parseInt(work_month),
          'vat',
          'กำลังดำเนินการ'
        )
      }
      if (non_vat_document_count > 0) {
        await createAccountingNotificationForDocumentEntry(
          accountingResponsible,
          build,
          companyName,
          newSubmissionCount,
          id,
          parseInt(work_year),
          parseInt(work_month),
          'non_vat',
          'กำลังดำเนินการ'
        )
      }
      console.log(`✅ Sent notifications to accounting_responsible: ${accountingResponsible}`)
    }

    await connection.commit()

    // ═══ Activity Log ═══
    logActivity({
      userId: req.user.id,
      employeeId: req.user.employee_id,
      userName: req.user.name || req.user.username,
      action: 'data_create',
      page: 'document_sorting',
      entityType: 'document_entry_work',
      entityId: id,
      build,
      companyName,
      description: `ส่งเอกสารครั้งที่ ${newSubmissionCount} (WHT: ${wht_document_count}, VAT: ${vat_document_count}, Non-VAT: ${non_vat_document_count})`,
      metadata: { year: work_year, month: work_month, submissionCount: newSubmissionCount, wht: wht_document_count, vat: vat_document_count, nonVat: non_vat_document_count },
      ipAddress: req.ip,
    })

    // Get created data with bots
    const [createdRows] = await pool.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.vat_document_count,
        dew.non_vat_document_count,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.id = ?`,
      [id]
    )

    const [createdBots] = await pool.execute(
      `SELECT 
        id,
        bot_type,
        document_count,
        ocr_additional_info,
        created_at,
        updated_at
       FROM document_entry_work_bots
       WHERE document_entry_work_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [id]
    )

    const formattedData = {
      ...createdRows[0],
      entry_timestamp: formatDateForResponse(createdRows[0].entry_timestamp),
      created_at: formatDateForResponse(createdRows[0].created_at),
      updated_at: formatDateForResponse(createdRows[0].updated_at),
    }

    const formattedBots = createdBots.map((bot) => ({
      ...bot,
      created_at: formatDateForResponse(bot.created_at),
      updated_at: formatDateForResponse(bot.updated_at),
    }))

    res.status(201).json({
      success: true,
      message: 'สร้างงานคีย์เอกสารสำเร็จ',
      data: formattedData,
      bots: formattedBots,
      submission_count: newSubmissionCount,
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error creating document entry work:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างงานคีย์เอกสารได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

/**
 * PUT /api/document-entry-work/:id
 * แก้ไขข้อมูลงานคีย์เอกสาร
 * Access: All authenticated users
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const { id } = req.params
    const {
      wht_document_count,
      vat_document_count,
      non_vat_document_count,
      submission_comment,
      return_comment,
      bots = [],
    } = req.body

    // Debug logging
    console.log(`📥 PUT /api/document-entry-work/${id} - Request body:`, {
      wht_document_count,
      vat_document_count,
      non_vat_document_count,
      submission_comment,
      return_comment,
      return_comment_type: typeof return_comment,
      return_comment_is_undefined: return_comment === undefined,
      return_comment_is_null: return_comment === null,
      bots_count: bots?.length || 0,
    })

    // Check if document_entry_work exists and get existing values
    const [existingRows] = await connection.execute(
      `SELECT 
        id, build, work_year, work_month,
        wht_document_count, vat_document_count, non_vat_document_count,
        submission_comment, return_comment
       FROM document_entry_work 
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (existingRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลงานคีย์เอกสาร',
      })
    }

    const existing = existingRows[0]

    // Update document_entry_work - only update fields that are provided
    const updateFields = []
    const updateValues = []

    if (wht_document_count !== undefined) {
      updateFields.push('wht_document_count = ?')
      updateValues.push(wht_document_count)
    }
    if (vat_document_count !== undefined) {
      updateFields.push('vat_document_count = ?')
      updateValues.push(vat_document_count)
    }
    if (non_vat_document_count !== undefined) {
      updateFields.push('non_vat_document_count = ?')
      updateValues.push(non_vat_document_count)
    }
    if (submission_comment !== undefined) {
      updateFields.push('submission_comment = ?')
      updateValues.push(submission_comment)
    }
    // Handle return_comment - allow null values (explicitly check for undefined, not falsy)
    let returnCommentChanged = false
    let oldReturnComment = null
    if (return_comment !== undefined) {
      // Get old return_comment value for comparison
      oldReturnComment = existing.return_comment

      // Check if return_comment has changed (normalize empty string to null)
      const newReturnComment = return_comment === null || return_comment === '' ? null : String(return_comment).trim()
      const normalizedOldComment = oldReturnComment === null || oldReturnComment === '' ? null : String(oldReturnComment).trim()
      returnCommentChanged = newReturnComment !== normalizedOldComment

      if (returnCommentChanged) {
        updateFields.push('return_comment = ?')
        updateValues.push(newReturnComment || null) // Ensure null for empty strings
        console.log(`📝 Updating return_comment for document_entry_work ${id}:`, {
          old: oldReturnComment,
          old_normalized: normalizedOldComment,
          new: return_comment,
          new_normalized: newReturnComment,
          will_update_to: newReturnComment || null,
        })
      } else {
        console.log(`ℹ️ return_comment unchanged, skipping update:`, {
          old: oldReturnComment,
          new: return_comment,
        })
      }
    } else {
      console.log(`⚠️ return_comment is undefined in request body, not updating`)
    }

    // Always update updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateValues.push(id) // Add id for WHERE clause

    if (updateFields.length > 1) { // More than just updated_at
      console.log(`🔄 Executing UPDATE with fields:`, updateFields)
      console.log(`📊 Update values (before execution):`, updateValues)
      console.log(`📊 Update values detail:`, updateValues.map((val, idx) => ({
        index: idx,
        value: val,
        type: typeof val,
        isNull: val === null,
        isUndefined: val === undefined,
      })))

      const [updateResult] = await connection.execute(
        `UPDATE document_entry_work SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      )

      console.log(`✅ UPDATE executed successfully for document_entry_work ${id}`)
      console.log(`📊 Update result:`, {
        affectedRows: updateResult.affectedRows,
        changedRows: updateResult.changedRows,
        warningCount: updateResult.warningCount,
      })

      // Verify the update by querying the record
      const [verifyRows] = await connection.execute(
        'SELECT return_comment FROM document_entry_work WHERE id = ?',
        [id]
      )
      console.log(`🔍 Verification query result:`, {
        return_comment: verifyRows[0]?.return_comment,
        return_comment_type: typeof verifyRows[0]?.return_comment,
      })
    } else {
      console.log(`⚠️ No fields to update (only updated_at)`)
    }

    // Create notification for accounting_responsible when return_comment is updated
    if (returnCommentChanged) {
      try {
        // Get accounting_responsible from work_assignments (priority) or monthly_tax_data (fallback)
        let accountingResponsibleEmployeeId = null

        // Try work_assignments first
        const [workAssignments] = await connection.execute(
          `SELECT accounting_responsible 
           FROM work_assignments 
           WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL 
           LIMIT 1`,
          [existing.build, existing.work_year, existing.work_month]
        )

        if (workAssignments.length > 0 && workAssignments[0].accounting_responsible) {
          accountingResponsibleEmployeeId = workAssignments[0].accounting_responsible
        } else {
          // Fallback to monthly_tax_data
          const [taxData] = await connection.execute(
            `SELECT accounting_responsible 
             FROM monthly_tax_data 
             WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [existing.build, existing.work_year, existing.work_month]
          )

          if (taxData.length > 0 && taxData[0].accounting_responsible) {
            accountingResponsibleEmployeeId = taxData[0].accounting_responsible
          }
        }

        // Create notification if accounting_responsible exists
        if (accountingResponsibleEmployeeId) {
          // Get company name
          const [companyRows] = await connection.execute(
            'SELECT company_name FROM clients WHERE build = ? AND deleted_at IS NULL LIMIT 1',
            [existing.build]
          )
          const companyName = companyRows[0]?.company_name || existing.build

          await createReturnCommentNotification(
            accountingResponsibleEmployeeId,
            existing.build,
            companyName,
            existing.submission_count,
            id,
            existing.work_year,
            existing.work_month,
            return_comment
          )
        } else {
          console.log(`⚠️ No accounting_responsible found for build ${existing.build}, year ${existing.work_year}, month ${existing.work_month}`)
        }
      } catch (notificationError) {
        // Don't fail the request if notification creation fails
        console.error('⚠️ Error creating return comment notification (non-critical):', notificationError)
      }
    }

    // Soft delete existing bots
    await connection.execute(
      'UPDATE document_entry_work_bots SET deleted_at = CURRENT_TIMESTAMP WHERE document_entry_work_id = ? AND deleted_at IS NULL',
      [id]
    )

    // Insert new bots
    if (bots && bots.length > 0) {
      for (const bot of bots) {
        const botId = bot.id || generateUUID()
        await connection.execute(
          `INSERT INTO document_entry_work_bots (
            id, document_entry_work_id, bot_type, document_count, ocr_additional_info
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            bot_type = VALUES(bot_type),
            document_count = VALUES(document_count),
            ocr_additional_info = VALUES(ocr_additional_info),
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL`,
          [
            botId,
            id,
            bot.bot_type,
            bot.document_count || 0,
            bot.bot_type === 'ระบบ OCR' ? bot.ocr_additional_info || null : null,
          ]
        )
      }
    }

    await connection.commit()
    console.log(`✅ Transaction committed successfully for document_entry_work ${id}`)

    // ═══ Activity Log ═══
    const [logCompanyRows] = await pool.execute('SELECT company_name FROM clients WHERE build = ? AND deleted_at IS NULL LIMIT 1', [existing.build])
    const logCompanyName = logCompanyRows[0]?.company_name || existing.build
    logActivity({
      userId: req.user.id,
      employeeId: req.user.employee_id,
      userName: req.user.name || req.user.username,
      action: 'data_edit',
      page: 'document_entry',
      entityType: 'document_entry_work',
      entityId: id,
      build: existing.build,
      companyName: logCompanyName,
      description: `แก้ไขข้อมูลคีย์เอกสาร${returnCommentChanged ? ' (เปลี่ยน return_comment)' : ''}`,
      fieldChanged: returnCommentChanged ? 'return_comment' : null,
      oldValue: returnCommentChanged ? oldReturnComment : null,
      newValue: returnCommentChanged ? return_comment : null,
      metadata: { year: existing.work_year, month: existing.work_month },
      ipAddress: req.ip,
    })

    // Get updated data with bots (use connection to ensure we see committed data)
    const [updatedRows] = await connection.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.id = ?`,
      [id]
    )

    const [updatedBots] = await connection.execute(
      `SELECT 
        id,
        bot_type,
        document_count,
        ocr_additional_info,
        created_at,
        updated_at
       FROM document_entry_work_bots
       WHERE document_entry_work_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [id]
    )

    const formattedData = {
      ...updatedRows[0],
      entry_timestamp: formatDateForResponse(updatedRows[0].entry_timestamp),
      wht_entry_start_datetime: updatedRows[0].wht_entry_start_datetime ? formatDateForResponse(updatedRows[0].wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: updatedRows[0].wht_entry_completed_datetime ? formatDateForResponse(updatedRows[0].wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: updatedRows[0].vat_entry_start_datetime ? formatDateForResponse(updatedRows[0].vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: updatedRows[0].vat_entry_completed_datetime ? formatDateForResponse(updatedRows[0].vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: updatedRows[0].non_vat_entry_start_datetime ? formatDateForResponse(updatedRows[0].non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: updatedRows[0].non_vat_entry_completed_datetime ? formatDateForResponse(updatedRows[0].non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(updatedRows[0].created_at),
      updated_at: formatDateForResponse(updatedRows[0].updated_at),
    }

    const formattedBots = updatedBots.map((bot) => ({
      ...bot,
      created_at: formatDateForResponse(bot.created_at),
      updated_at: formatDateForResponse(bot.updated_at),
    }))

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลงานคีย์เอกสารสำเร็จ',
      data: formattedData,
      bots: formattedBots,
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error updating document entry work:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดทข้อมูลงานคีย์เอกสารได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

/**
 * PATCH /api/document-entry-work/:id/status
 * อัพเดทสถานะการคีย์เอกสาร (WHT, VAT, Non-VAT)
 * Access: All authenticated users
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const { id } = req.params
    const { document_type, status } = req.body
    const employeeId = req.user?.employee_id

    // Validation
    if (!document_type || !status) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: document_type, status',
      })
    }

    if (!['wht', 'vat', 'non_vat'].includes(document_type)) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'Invalid document_type. Must be: wht, vat, or non_vat',
      })
    }

    if (!['ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว'].includes(status)) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: ยังไม่ดำเนินการ, กำลังดำเนินการ, or ดำเนินการเสร็จแล้ว',
      })
    }

    // Check if document_entry_work exists
    const [existingRows] = await connection.execute(
      'SELECT id FROM document_entry_work WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existingRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลงานคีย์เอกสาร',
      })
    }

    // Build update query based on document_type
    let updateQuery = ''
    const updateParams = []

    if (document_type === 'wht') {
      if (status === 'กำลังดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          wht_entry_status = ?,
          wht_entry_start_datetime = CURRENT_TIMESTAMP,
          wht_entry_completed_datetime = NULL,
          wht_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ดำเนินการเสร็จแล้ว') {
        updateQuery = `UPDATE document_entry_work SET
          wht_entry_status = ?,
          wht_entry_completed_datetime = CURRENT_TIMESTAMP,
          wht_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ยังไม่ดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          wht_entry_status = ?,
          wht_entry_start_datetime = NULL,
          wht_entry_completed_datetime = NULL,
          wht_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      }
    } else if (document_type === 'vat') {
      if (status === 'กำลังดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          vat_entry_status = ?,
          vat_entry_start_datetime = CURRENT_TIMESTAMP,
          vat_entry_completed_datetime = NULL,
          vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ดำเนินการเสร็จแล้ว') {
        updateQuery = `UPDATE document_entry_work SET
          vat_entry_status = ?,
          vat_entry_completed_datetime = CURRENT_TIMESTAMP,
          vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ยังไม่ดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          vat_entry_status = ?,
          vat_entry_start_datetime = NULL,
          vat_entry_completed_datetime = NULL,
          vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      }
    } else if (document_type === 'non_vat') {
      if (status === 'กำลังดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          non_vat_entry_status = ?,
          non_vat_entry_start_datetime = CURRENT_TIMESTAMP,
          non_vat_entry_completed_datetime = NULL,
          non_vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ดำเนินการเสร็จแล้ว') {
        updateQuery = `UPDATE document_entry_work SET
          non_vat_entry_status = ?,
          non_vat_entry_completed_datetime = CURRENT_TIMESTAMP,
          non_vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      } else if (status === 'ยังไม่ดำเนินการ') {
        updateQuery = `UPDATE document_entry_work SET
          non_vat_entry_status = ?,
          non_vat_entry_start_datetime = NULL,
          non_vat_entry_completed_datetime = NULL,
          non_vat_status_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
        updateParams.push(status, employeeId, id)
      }
    }

    await connection.execute(updateQuery, updateParams)

    // ═══ Activity Log (status update) ═══
    {
      const docTypeLabel = { wht: 'WHT', vat: 'VAT', non_vat: 'Non-VAT' }
      // Get company info for log
      const [logRows] = await connection.execute(
        `SELECT dew.build, c.company_name, dew.work_year, dew.work_month
         FROM document_entry_work dew
         LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
         WHERE dew.id = ? LIMIT 1`, [id]
      )
      const logRow = logRows[0]
      logActivity({
        userId: req.user.id,
        employeeId: req.user.employee_id,
        userName: req.user.name || req.user.username,
        action: 'status_update',
        page: 'document_entry',
        entityType: 'document_entry_work',
        entityId: id,
        build: logRow?.build,
        companyName: logRow?.company_name || logRow?.build,
        description: `อัพเดทสถานะ ${docTypeLabel[document_type] || document_type}: ${status}`,
        fieldChanged: `${document_type}_entry_status`,
        newValue: status,
        metadata: { year: logRow?.work_year, month: logRow?.work_month, documentType: document_type },
        ipAddress: req.ip,
      })
    }

    // Get updated data with company info
    const [updatedRows] = await connection.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        dew.wht_document_count,
        dew.wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        dew.vat_document_count,
        dew.vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        dew.non_vat_document_count,
        dew.non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.id = ? AND dew.deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    const updatedData = updatedRows[0]

    // Create notification for accounting_responsible when status is "กำลังดำเนินการ" or "ดำเนินการเสร็จแล้ว"
    if (status === 'กำลังดำเนินการ' || status === 'ดำเนินการเสร็จแล้ว') {
      try {
        // Get accounting_responsible from work_assignments (priority) or monthly_tax_data (fallback)
        let accountingResponsibleEmployeeId = null

        // Try work_assignments first
        const [workAssignments] = await connection.execute(
          `SELECT accounting_responsible 
           FROM work_assignments 
           WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL 
           LIMIT 1`,
          [updatedData.build, updatedData.work_year, updatedData.work_month]
        )

        if (workAssignments.length > 0 && workAssignments[0].accounting_responsible) {
          accountingResponsibleEmployeeId = workAssignments[0].accounting_responsible
        } else {
          // Fallback to monthly_tax_data
          const [taxData] = await connection.execute(
            `SELECT accounting_responsible 
             FROM monthly_tax_data 
             WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [updatedData.build, updatedData.work_year, updatedData.work_month]
          )

          if (taxData.length > 0 && taxData[0].accounting_responsible) {
            accountingResponsibleEmployeeId = taxData[0].accounting_responsible
          }
        }

        // Create notification if accounting_responsible exists
        if (accountingResponsibleEmployeeId) {
          await createAccountingNotificationForDocumentEntry(
            accountingResponsibleEmployeeId,
            updatedData.build,
            updatedData.company_name || updatedData.build,
            updatedData.submission_count,
            updatedData.id,
            updatedData.work_year,
            updatedData.work_month,
            document_type,
            status
          )
        } else {
          console.log(`⚠️ No accounting_responsible found for build ${updatedData.build}, year ${updatedData.work_year}, month ${updatedData.work_month}`)
        }
      } catch (notificationError) {
        // Don't fail the request if notification creation fails
        console.error('⚠️ Error creating accounting notification (non-critical):', notificationError)
      }
    }

    await connection.commit()

    const formattedData = {
      ...updatedRows[0],
      entry_timestamp: formatDateForResponse(updatedRows[0].entry_timestamp),
      wht_entry_start_datetime: updatedRows[0].wht_entry_start_datetime ? formatDateForResponse(updatedRows[0].wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: updatedRows[0].wht_entry_completed_datetime ? formatDateForResponse(updatedRows[0].wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: updatedRows[0].vat_entry_start_datetime ? formatDateForResponse(updatedRows[0].vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: updatedRows[0].vat_entry_completed_datetime ? formatDateForResponse(updatedRows[0].vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: updatedRows[0].non_vat_entry_start_datetime ? formatDateForResponse(updatedRows[0].non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: updatedRows[0].non_vat_entry_completed_datetime ? formatDateForResponse(updatedRows[0].non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(updatedRows[0].created_at),
      updated_at: formatDateForResponse(updatedRows[0].updated_at),
    }

    res.json({
      success: true,
      message: 'อัพเดทสถานะสำเร็จ',
      data: formattedData,
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error updating document entry work status:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดทสถานะได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

export default router

