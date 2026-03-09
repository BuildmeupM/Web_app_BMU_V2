/* global process */
/**
 * Monthly Tax Data Routes
 * Routes สำหรับการจัดการข้อมูลภาษีรายเดือน (Workflow System)
 * ⚠️ Important: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่
 * เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี
 *
 * 📁 Refactored: แยก helpers/notifications ออกเป็นไฟล์ย่อย
 * - helpers.js: checkPaymentColumnsExist, fetchEmployeesBulk, derivePp30StatusFromRow
 * - notifications.js: createTaxInspectionCompletedNotification, createTaxReviewNotification,
 *   createSentToCustomerNotification, markTaxReviewNotificationsAsRead
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'
import { invalidateCache } from '../../middleware/cache.js'
import { emitMonthlyTaxDataUpdate } from '../../services/socketService.js'
import { logActivity } from '../../utils/logActivity.js'
import { formatDateForResponse } from '../../utils/dateFormatter.js'

// Import extracted helpers
import { checkPaymentColumnsExist, derivePp30StatusFromRow } from './helpers.js'
import {
  createTaxInspectionCompletedNotification,
  createTaxReviewNotification,
  createSentToCustomerNotification,
  markTaxReviewNotificationsAsRead,
} from './notifications.js'

const router = express.Router()


/**
 * GET /api/monthly-tax-data
 * ดึงข้อมูลภาษีรายเดือน (paginated, filter)
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
      search = '',
      sortBy = 'tax_year',
      sortOrder = 'desc',
      // Filter by employee responsible fields
      tax_inspection_responsible = '',
      accounting_responsible = '',
      wht_filer_employee_id = '',
      vat_filer_employee_id = '',
      document_entry_responsible = '',
      // Filter by tax registration status
      tax_registration_status = '',
      // Filter by tax status fields
      pnd_status = '',
      pp30_status = '',
      pp30_payment_status = '',
      // Filter by date
      dateFrom = '',
      dateTo = '',
      filterMode = 'all',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 10000)
    const offset = (pageNum - 1) * limitNum

    // Build WHERE clause
    const whereConditions = ['mtd.deleted_at IS NULL']
    const queryParams = []

    // Filter by build
    if (build) {
      whereConditions.push('mtd.build = ?')
      queryParams.push(build)
    }

    // Filter by year (for tax month filtering)
    if (year) {
      whereConditions.push('mtd.tax_year = ?')
      queryParams.push(parseInt(year))
    }

    // Filter by month (for tax month filtering)
    if (month) {
      whereConditions.push('mtd.tax_month = ?')
      queryParams.push(parseInt(month))
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(mtd.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    // Filter by tax_inspection_responsible (for ตรวจภาษี page)
    if (tax_inspection_responsible) {
      whereConditions.push('mtd.tax_inspection_responsible = ?')
      queryParams.push(tax_inspection_responsible)
    }

    // Filter by accounting_responsible (for สถานะยื่นภาษี page)
    if (accounting_responsible) {
      whereConditions.push('mtd.accounting_responsible = ?')
      queryParams.push(accounting_responsible)
    }

    // Filter by wht_filer_employee_id and/or vat_filer_employee_id (for ยื่นภาษี page)
    // Use OR logic if both are provided - show records where user is responsible for WHT OR VAT
    if (wht_filer_employee_id && vat_filer_employee_id) {
      // If both are provided and are the same employee, use OR logic
      if (wht_filer_employee_id === vat_filer_employee_id) {
        whereConditions.push('((mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?) OR (mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?))')
        queryParams.push(wht_filer_employee_id, wht_filer_employee_id, vat_filer_employee_id, vat_filer_employee_id)
      } else {
        // If both are provided but different employees, use OR logic to show records for either
        whereConditions.push('((mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?) OR (mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?))')
        queryParams.push(wht_filer_employee_id, wht_filer_employee_id, vat_filer_employee_id, vat_filer_employee_id)
      }
    } else if (wht_filer_employee_id) {
      // Only WHT filer
      whereConditions.push('(mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?)')
      queryParams.push(wht_filer_employee_id, wht_filer_employee_id)
    } else if (vat_filer_employee_id) {
      // Only VAT filer
      whereConditions.push('(mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?)')
      queryParams.push(vat_filer_employee_id, vat_filer_employee_id)
    }

    // Filter by document_entry_responsible (for คีย์เอกสาร page - pending development)
    if (document_entry_responsible) {
      whereConditions.push('mtd.document_entry_responsible = ?')
      queryParams.push(document_entry_responsible)
    }

    // Filter by tax_registration_status (for Tax Status page - filterMode: 'vat')
    // เมื่อ filterMode = 'vat' จะแสดงเฉพาะบริษัทที่จดภาษีมูลค่าเพิ่ม
    if (tax_registration_status) {
      whereConditions.push('c.tax_registration_status = ?')
      queryParams.push(tax_registration_status)
    }

    // Filter by pnd_status (สถานะ ภ.ง.ด.) - supports comma-separated values for multi-status filtering
    if (pnd_status) {
      const statuses = pnd_status.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length > 0) {
        whereConditions.push(`mtd.pnd_status IN (${statuses.map(() => '?').join(',')})`)
        queryParams.push(...statuses)
      }
    }

    // Filter by pp30_status (สถานะ ภ.พ.30) - supports comma-separated values
    // ⚠️ pp30_status stored in pp30_form column (after migration 028)
    if (pp30_status) {
      const statuses = pp30_status.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length > 0) {
        whereConditions.push(`mtd.pp30_form IN (${statuses.map(() => '?').join(',')})`)
        queryParams.push(...statuses)
      }
    }

    // Filter by pp30_payment_status (สถานะยอดชำระ ภ.พ.30) - supports comma-separated values
    if (pp30_payment_status) {
      const statuses = pp30_payment_status.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length > 0) {
        whereConditions.push(`mtd.pp30_payment_status IN (${statuses.map(() => '?').join(',')})`)
        queryParams.push(...statuses)
      }
    }

    // Filter by date (sent for review date)
    if (dateFrom || dateTo) {
      // ⚠️ สำคัญ: ฐานข้อมูลเก็บเวลาเป็น UTC ต้องชดเชยเวลาเป็นเวลาไทย (UTC+7) ก่อนแยกแค่วันที่
      // เพื่อป้องกันไม่ให้ข้อมูลของวันที่ 6 รั่วไหลมาเป็นวันที่ 5 (เนื่องจาก 06/03/2026 01:00 TH = 05/03/2026 18:00 UTC)
      const pndDateCol = 'DATE(DATE_ADD(mtd.pnd_sent_for_review_date, INTERVAL 7 HOUR))'
      const pp30DateCol = 'DATE(DATE_ADD(mtd.pp30_sent_for_review_date, INTERVAL 7 HOUR))'
      
      let pndCond = ''
      let pp30Cond = ''

      if (dateFrom && dateTo) {
        pndCond = `${pndDateCol} >= ? AND ${pndDateCol} <= ?`
        pp30Cond = `${pp30DateCol} >= ? AND ${pp30DateCol} <= ?`
      } else if (dateFrom) {
        pndCond = `${pndDateCol} >= ?`
        pp30Cond = `${pp30DateCol} >= ?`
      } else if (dateTo) {
        pndCond = `${pndDateCol} <= ?`
        pp30Cond = `${pp30DateCol} <= ?`
      }

      if (filterMode === 'wht') {
        whereConditions.push(`(${pndCond})`)
        if (dateFrom && dateTo) queryParams.push(dateFrom, dateTo)
        else if (dateFrom) queryParams.push(dateFrom)
        else if (dateTo) queryParams.push(dateTo)
      } else if (filterMode === 'vat') {
        whereConditions.push(`(${pp30Cond})`)
        if (dateFrom && dateTo) queryParams.push(dateFrom, dateTo)
        else if (dateFrom) queryParams.push(dateFrom)
        else if (dateTo) queryParams.push(dateTo)
      } else {
        whereConditions.push(`((${pndCond}) OR (${pp30Cond}))`)
        if (dateFrom && dateTo) queryParams.push(dateFrom, dateTo, dateFrom, dateTo)
        else if (dateFrom) queryParams.push(dateFrom, dateFrom)
        else if (dateTo) queryParams.push(dateTo, dateTo)
      }
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Validate sortBy
    const allowedSortFields = [
      'tax_year', 'tax_month', 'build', 'created_at',
      'company_name', 'pnd_sent_for_review_date', 'pnd_status',
      'pp30_sent_for_review_date', 'pp30_form', 'pp30_payment_status',
    ]
    // Map sort fields to their SQL expressions
    // Date fields need CAST to DATETIME to ensure proper chronological sorting (date + time)
    const sortFieldMap = {
      company_name: 'c.company_name',
      created_at: 'CAST(mtd.created_at AS DATETIME)',
      pnd_sent_for_review_date: 'CAST(mtd.pnd_sent_for_review_date AS DATETIME)',
      pp30_sent_for_review_date: 'CAST(mtd.pp30_sent_for_review_date AS DATETIME)',
    }
    const rawSortField = allowedSortFields.includes(sortBy) ? sortBy : 'build'
    const sortField = sortFieldMap[rawSortField] || `mtd.${rawSortField}`
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    // Get total count
    // ⚠️ สำคัญ: เพิ่ม filter c.deleted_at IS NULL เพื่อไม่แสดงข้อมูล client ที่ถูกลบแล้ว
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM monthly_tax_data mtd
       LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL AND c.deleted_at IS NULL
       ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Check if pp30_payment_status and pp30_payment_amount columns exist
    const hasPaymentColumns = await checkPaymentColumnsExist()

    // Build payment columns part of SELECT statement
    const paymentColumns = hasPaymentColumns
      ? 'mtd.pp30_payment_status,\n        mtd.pp30_payment_amount,'
      : 'NULL as pp30_payment_status,\n        NULL as pp30_payment_amount,'

    // Get monthly tax data
    const [taxData] = await pool.execute(
      `SELECT 
        mtd.id,
        mtd.build,
        c.company_name,
        mtd.tax_year,
        mtd.tax_month,
        mtd.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        e1.first_name as accounting_responsible_first_name,
        e1.nick_name as accounting_responsible_nick_name,
        mtd.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        e2.first_name as tax_inspection_responsible_first_name,
        e2.nick_name as tax_inspection_responsible_nick_name,
        mtd.document_received_date,
        mtd.bank_statement_status,
        mtd.pnd_sent_for_review_date,
        mtd.pnd_review_returned_date,
        mtd.pnd_sent_to_customer_date,
        mtd.pnd_status,
        mtd.pnd_1_40_1_status,
        mtd.pnd_1_40_2_status,
        mtd.pnd_3_status,
        mtd.pnd_53_status,
        mtd.pp_36_status,
        mtd.student_loan_form_status,
        mtd.pnd_2_status,
        mtd.pnd_54_status,
        mtd.pt_40_status,
        mtd.social_security_form_status,
        mtd.pnd_1_40_1_attachment_count,
        mtd.pnd_1_40_2_attachment_count,
        mtd.pnd_3_attachment_count,
        mtd.pnd_53_attachment_count,
        mtd.pp_36_attachment_count,
        mtd.student_loan_form_attachment_count,
        mtd.pnd_2_attachment_count,
        mtd.pnd_54_attachment_count,
        mtd.pt_40_attachment_count,
        mtd.social_security_form_attachment_count,
        mtd.accounting_record_status,
        mtd.monthly_tax_impact,
        mtd.bank_impact,
        mtd.wht_draft_completed_date,
        mtd.wht_filer_employee_id,
        e3.full_name as wht_filer_employee_name,
        e3.first_name as wht_filer_employee_first_name,
        e3.nick_name as wht_filer_employee_nick_name,
        mtd.wht_filer_current_employee_id,
        e4.full_name as wht_filer_current_employee_name,
        e4.first_name as wht_filer_current_employee_first_name,
        e4.nick_name as wht_filer_current_employee_nick_name,
        mtd.wht_inquiry,
        mtd.wht_response,
        mtd.wht_submission_comment,
        mtd.wht_filing_response,
        mtd.pp30_sent_for_review_date,
        mtd.pp30_review_returned_date,
        mtd.pp30_sent_to_customer_date,
        mtd.pp30_form,
        mtd.purchase_document_count,
        mtd.income_confirmed,
        mtd.expenses_confirmed,
        ${paymentColumns}
        mtd.vat_draft_completed_date,
        mtd.vat_filer_employee_id,
        e5.full_name as vat_filer_employee_name,
        e5.first_name as vat_filer_employee_first_name,
        e5.nick_name as vat_filer_employee_nick_name,
        mtd.vat_filer_current_employee_id,
        e6.full_name as vat_filer_current_employee_name,
        e6.first_name as vat_filer_current_employee_first_name,
        e6.nick_name as vat_filer_current_employee_nick_name,
        mtd.pp30_inquiry,
        mtd.pp30_response,
        mtd.pp30_submission_comment,
        mtd.pp30_filing_response,
        mtd.document_entry_responsible,
        e7.full_name as document_entry_responsible_name,
        e7.first_name as document_entry_responsible_first_name,
        e7.nick_name as document_entry_responsible_nick_name,
        c.tax_registration_status,
        mtd.created_at,
        mtd.updated_at
      FROM monthly_tax_data mtd
      LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
      LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
      LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
      LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
      LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}, mtd.tax_month ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    // 🔍 Debug: Log query results for troubleshooting
    // ✅ Performance: ไม่ log ใน production เพื่อลดการสร้าง response ที่ช้า
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 [Backend] GET /api/monthly-tax-data - Query results:', {
        totalRecords: taxData.length,
        totalCount: total,
        builds: taxData.map(r => ({ build: r.build, company_name: r.company_name })),
        page: pageNum,
        limit: limitNum,
        filters: {
          accounting_responsible,
          tax_registration_status,
          year,
          month,
        },
        whereClause,
        queryParams,
      })
    }

    // ⚠️ สำคัญ: ส่ง pp30_form กลับมาด้วยเพื่อให้ frontend ใช้เป็น single source of truth
    // หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
    // ⚠️ Performance: Format dates ใน JavaScript แทน DATE_FORMAT ใน SQL
    const dataWithPp30Status = taxData.map((row) => {
      // 🔍 Debug: Log pp30_form จากฐานข้อมูลก่อนประมวลผล
      if (process.env.NODE_ENV !== 'production' && row.build === '018') {
        console.log('🔍 [Backend] GET list - Raw pp30_form from DB for Build 018:', {
          build: row.build,
          id: row.id,
          pp30_form_raw: row.pp30_form,
          pp30_form_type: typeof row.pp30_form,
          pp30_form_is_null: row.pp30_form === null,
          pp30_form_is_undefined: row.pp30_form === undefined,
        })
      }

      // ⚠️ สำคัญ: ใช้ pp30_form จากฐานข้อมูลโดยตรงก่อน (ให้ตรงกับที่บันทึกไว้)
      // ถ้าไม่มี pp30_form → ใช้ derivePp30StatusFromRow เพื่อ derive จาก timestamp fields
      const pp30FormFromDb = row.pp30_form && String(row.pp30_form).trim() !== '' && row.pp30_form !== '0' && row.pp30_form !== '1' && row.pp30_form !== 0 && row.pp30_form !== 1
        ? String(row.pp30_form).trim()
        : null
      const derivedStatus = derivePp30StatusFromRow(row)
      // ⚠️ สำคัญ: ใช้ pp30_form จากฐานข้อมูลก่อน (ให้ตรงกับที่บันทึกไว้)
      // ถ้าไม่มี pp30_form → ใช้ derivedStatus เป็น fallback
      const finalPp30Status = pp30FormFromDb || derivedStatus

      // 🔍 Debug: Log ข้อมูลหลังประมวลผล
      if (process.env.NODE_ENV !== 'production' && row.build === '018') {
        console.log('🔍 [Backend] GET list - Processed pp30_form for Build 018:', {
          build: row.build,
          id: row.id,
          pp30FormFromDb,
          derivedStatus,
          finalPp30Status,
          pp30_form_sent: pp30FormFromDb || (derivedStatus || null),
        })
      }

      return {
        ...row,
        // ⚠️ สำคัญ: ส่งเฉพาะ pp30_form กลับมา (ไม่ส่ง pp30_status แล้ว)
        // ใช้ pp30_form จากฐานข้อมูลก่อน (ให้ตรงกับที่บันทึกไว้)
        pp30_form: pp30FormFromDb || (derivedStatus || null),
        // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
        document_received_date: formatDateForResponse(row.document_received_date, 'document_received_date'),
        pnd_sent_for_review_date: formatDateForResponse(row.pnd_sent_for_review_date, 'pnd_sent_for_review_date'),
        pnd_review_returned_date: formatDateForResponse(row.pnd_review_returned_date, 'pnd_review_returned_date'),
        pnd_sent_to_customer_date: formatDateForResponse(row.pnd_sent_to_customer_date, 'pnd_sent_to_customer_date'),
        wht_draft_completed_date: formatDateForResponse(row.wht_draft_completed_date, 'wht_draft_completed_date'),
        pp30_sent_for_review_date: formatDateForResponse(row.pp30_sent_for_review_date, 'pp30_sent_for_review_date'),
        pp30_review_returned_date: formatDateForResponse(row.pp30_review_returned_date, 'pp30_review_returned_date'),
        pp30_sent_to_customer_date: formatDateForResponse(row.pp30_sent_to_customer_date, 'pp30_sent_to_customer_date'),
        vat_draft_completed_date: formatDateForResponse(row.vat_draft_completed_date, 'vat_draft_completed_date'),
      }
    })
    res.json({
      success: true,
      data: dataWithPp30Status,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get monthly tax data error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/monthly-tax-data/summary
 * ดึง Summary สำหรับ Dashboard (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
 * Access: All authenticated users
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { year, month, accounting_responsible, tax_inspection_responsible, wht_filer_employee_id, vat_filer_employee_id } = req.query

    // Build WHERE clause
    const whereConditions = ['mtd.deleted_at IS NULL']
    const queryParams = []

    if (year) {
      whereConditions.push('mtd.tax_year = ?')
      queryParams.push(parseInt(year))
    }

    if (month) {
      whereConditions.push('mtd.tax_month = ?')
      queryParams.push(parseInt(month))
    }

    // Filter by accounting_responsible (for Tax Status page)
    if (accounting_responsible) {
      whereConditions.push('mtd.accounting_responsible = ?')
      queryParams.push(accounting_responsible)
    }

    // Filter by tax_inspection_responsible (for Tax Inspection page)
    if (tax_inspection_responsible) {
      whereConditions.push('mtd.tax_inspection_responsible = ?')
      queryParams.push(tax_inspection_responsible)
    }

    // Filter by wht_filer_employee_id and/or vat_filer_employee_id (for Tax Filing page)
    // Use OR logic if both are provided - show records where user is responsible for WHT OR VAT
    if (wht_filer_employee_id && vat_filer_employee_id) {
      // If both are provided, use OR logic
      if (wht_filer_employee_id === vat_filer_employee_id) {
        whereConditions.push('((mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?) OR (mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?))')
        queryParams.push(wht_filer_employee_id, wht_filer_employee_id, vat_filer_employee_id, vat_filer_employee_id)
      } else {
        whereConditions.push('((mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?) OR (mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?))')
        queryParams.push(wht_filer_employee_id, wht_filer_employee_id, vat_filer_employee_id, vat_filer_employee_id)
      }
    } else if (wht_filer_employee_id) {
      // Only WHT filer
      whereConditions.push('(mtd.wht_filer_employee_id = ? OR mtd.wht_filer_current_employee_id = ?)')
      queryParams.push(wht_filer_employee_id, wht_filer_employee_id)
    } else if (vat_filer_employee_id) {
      // Only VAT filer
      whereConditions.push('(mtd.vat_filer_employee_id = ? OR mtd.vat_filer_current_employee_id = ?)')
      queryParams.push(vat_filer_employee_id, vat_filer_employee_id)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // ✅ Fix #3: vatWhereClause ไม่จำเป็นแล้ว — ใช้ CASE WHEN c.tax_registration_status inline แทน

    const isTaxInspectionPage = !!tax_inspection_responsible
    const isTaxFilingPage = !!(wht_filer_employee_id || vat_filer_employee_id)

    // WHT dynamic columns
    let whtDraftReadyCount = '0'
    let whtPassedCount = '0'
    let whtSentToCustomerCount = '0'

    if (isTaxFilingPage) {
      whtDraftReadyCount = "SUM(CASE WHEN mtd.pnd_status = 'draft_ready' THEN 1 ELSE 0 END)"
      whtPassedCount = "SUM(CASE WHEN mtd.pnd_status = 'passed' THEN 1 ELSE 0 END)"
      whtSentToCustomerCount = "SUM(CASE WHEN mtd.pnd_status IN ('paid', 'sent_to_customer', 'received_receipt') THEN 1 ELSE 0 END)"
    }

    // ✅ FIX: WHT completed สำหรับหน้าตรวจภาษี = ผู้ตรวจส่งคืนแล้ว (วันที่ส่งคืน IS NOT NULL)
    // ตัด pending_recheck ออกเพื่อไม่ให้นับซ้ำกับช่อง "รอตรวจอีกครั้ง"
    const whtCompletedCondition = isTaxInspectionPage
      ? "SUM(CASE WHEN mtd.pnd_review_returned_date IS NOT NULL AND mtd.pnd_status != 'pending_recheck' THEN 1 ELSE 0 END) as wht_completed"
      : "SUM(CASE WHEN mtd.pnd_status IN ('paid', 'sent_to_customer', 'draft_completed', 'passed') THEN 1 ELSE 0 END) as wht_completed"

    // ✅ Performance Fix #3: รวม 3 SQL queries (WHT, VAT, Impact) เป็น 1 query เดียว
    // ลดจาก 3 round-trips ไป database เหลือ 1
    // ✅ FIX: VAT counts ใช้ pp30_form (status column) แทน date fields
    // เพื่อให้ตรงกับวิธีที่ตาราง filter (ใช้ mtd.pp30_form column)
    const [combinedSummary] = await pool.execute(
      `SELECT 
        /* === WHT Summary === */
        COUNT(*) as wht_total,
        SUM(CASE WHEN mtd.pnd_status IN ('received_receipt', 'paid', 'sent_to_customer', 'not_submitted') THEN 1 ELSE 0 END) as wht_responsible_count,
        ${whtCompletedCondition},
        SUM(CASE WHEN mtd.pnd_status = 'pending_review' THEN 1 ELSE 0 END) as wht_pending,
        SUM(CASE WHEN mtd.pnd_status = 'pending_recheck' THEN 1 ELSE 0 END) as wht_recheck,
        ${whtDraftReadyCount} as wht_draft_ready,
        ${whtPassedCount} as wht_passed,
        ${whtSentToCustomerCount} as wht_sent_to_customer,

        /* === VAT Summary (เฉพาะบริษัทจดภาษีมูลค่าเพิ่ม) === */
        /* ✅ FIX: ใช้ pp30_form (status column) แทน date fields ทั้งหมด */
        SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' THEN 1 ELSE 0 END) as vat_total,
        SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
          mtd.pp30_form IN ('sent_to_customer', 'paid', 'received_receipt', 'not_submitted')
        THEN 1 ELSE 0 END) as vat_responsible_count,
        ${isTaxInspectionPage
        ? `SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
              mtd.pp30_review_returned_date IS NOT NULL AND mtd.pp30_form != 'pending_recheck'
           THEN 1 ELSE 0 END) as vat_completed`
        : `SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
              mtd.pp30_form IN ('sent_to_customer', 'paid', 'received_receipt', 'passed', 'draft_completed')
           THEN 1 ELSE 0 END) as vat_completed`
      },
        SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
          mtd.pp30_form = 'pending_review'
        THEN 1 ELSE 0 END) as vat_pending,
        SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
          mtd.pp30_form = 'pending_recheck'
        THEN 1 ELSE 0 END) as vat_recheck,
        ${isTaxFilingPage
        ? `SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
              mtd.pp30_form IN ('draft_ready', 'draft_completed')
           THEN 1 ELSE 0 END) as vat_draft_ready,
           SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
              mtd.pp30_form = 'passed'
           THEN 1 ELSE 0 END) as vat_passed,
           SUM(CASE WHEN c.tax_registration_status = 'จดภาษีมูลค่าเพิ่ม' AND 
              mtd.pp30_form IN ('sent_to_customer', 'paid', 'received_receipt')
           THEN 1 ELSE 0 END) as vat_sent_to_customer`
        : `0 as vat_draft_ready, 0 as vat_passed, 0 as vat_sent_to_customer`
      },

        /* === Impact Summary === */
        SUM(CASE WHEN mtd.monthly_tax_impact IS NOT NULL AND mtd.monthly_tax_impact != '' THEN 1 ELSE 0 END) as monthly_tax_impact_count,
        SUM(CASE WHEN mtd.bank_impact IS NOT NULL AND mtd.bank_impact != '' THEN 1 ELSE 0 END) as bank_impact_count
      FROM monthly_tax_data mtd
      LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
      ${whereClause}`,
      queryParams
    )

    const row = combinedSummary[0]

    res.json({
      success: true,
      data: {
        wht: {
          total: row.wht_total || 0,
          responsible_count: row.wht_responsible_count || 0,
          completed: row.wht_completed || 0,
          pending: row.wht_pending || 0,
          recheck: row.wht_recheck || 0,
          draft_ready: row.wht_draft_ready || 0,
          passed: row.wht_passed || 0,
          sent_to_customer: row.wht_sent_to_customer || 0,
        },
        vat: {
          total: row.vat_total || 0,
          responsible_count: row.vat_responsible_count || 0,
          completed: row.vat_completed || 0,
          pending: row.vat_pending || 0,
          recheck: row.vat_recheck || 0,
          draft_ready: row.vat_draft_ready || 0,
          passed: row.vat_passed || 0,
          sent_to_customer: row.vat_sent_to_customer || 0,
        },
        impacts: {
          monthly_tax_impact_count: row.monthly_tax_impact_count || 0,
          bank_impact_count: row.bank_impact_count || 0,
          total: row.wht_total || 0,
        },
      },
    })
  } catch (error) {
    console.error('Get monthly tax data summary error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})


/**
 * GET /api/monthly-tax-data/:build/:year/:month
 * ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month
 * Access: All authenticated users
 * NOTE: This route must be defined BEFORE /:id route to avoid route conflicts
 */
router.get('/:build/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { build, year, month } = req.params
    const taxYear = parseInt(year)
    const taxMonth = parseInt(month)

    if (taxMonth < 1 || taxMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    // Check if pp30_payment_status and pp30_payment_amount columns exist
    const hasPaymentColumns = await checkPaymentColumnsExist()

    // Build payment columns part of SELECT statement
    const paymentColumns = hasPaymentColumns
      ? 'mtd.pp30_payment_status,\n        mtd.pp30_payment_amount,'
      : 'NULL as pp30_payment_status,\n        NULL as pp30_payment_amount,'

    const [taxData] = await pool.execute(
      `SELECT 
        mtd.id,
        mtd.build,
        c.company_name,
        mtd.tax_year,
        mtd.tax_month,
        mtd.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        e1.first_name as accounting_responsible_first_name,
        e1.nick_name as accounting_responsible_nick_name,
        mtd.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        e2.first_name as tax_inspection_responsible_first_name,
        e2.nick_name as tax_inspection_responsible_nick_name,
        mtd.document_received_date,
        mtd.bank_statement_status,
        mtd.pnd_sent_for_review_date,
        mtd.pnd_review_returned_date,
        mtd.pnd_sent_to_customer_date,
        mtd.pnd_status,
        mtd.pnd_1_40_1_status,
        mtd.pnd_1_40_2_status,
        mtd.pnd_3_status,
        mtd.pnd_53_status,
        mtd.pp_36_status,
        mtd.student_loan_form_status,
        mtd.pnd_2_status,
        mtd.pnd_54_status,
        mtd.pt_40_status,
        mtd.social_security_form_status,
        mtd.pnd_1_40_1_attachment_count,
        mtd.pnd_1_40_2_attachment_count,
        mtd.pnd_3_attachment_count,
        mtd.pnd_53_attachment_count,
        mtd.pp_36_attachment_count,
        mtd.student_loan_form_attachment_count,
        mtd.pnd_2_attachment_count,
        mtd.pnd_54_attachment_count,
        mtd.pt_40_attachment_count,
        mtd.social_security_form_attachment_count,
        mtd.accounting_record_status,
        mtd.monthly_tax_impact,
        mtd.bank_impact,
        mtd.wht_draft_completed_date,
        mtd.wht_filer_employee_id,
        e3.full_name as wht_filer_employee_name,
        e3.first_name as wht_filer_employee_first_name,
        e3.nick_name as wht_filer_employee_nick_name,
        mtd.wht_filer_current_employee_id,
        e4.full_name as wht_filer_current_employee_name,
        e4.first_name as wht_filer_current_employee_first_name,
        e4.nick_name as wht_filer_current_employee_nick_name,
        mtd.wht_inquiry,
        mtd.wht_response,
        mtd.wht_submission_comment,
        mtd.wht_filing_response,
        mtd.pp30_sent_for_review_date,
        mtd.pp30_review_returned_date,
        mtd.pp30_sent_to_customer_date,
        mtd.pp30_form,
        mtd.purchase_document_count,
        mtd.income_confirmed,
        mtd.expenses_confirmed,
        ${paymentColumns}
        mtd.vat_draft_completed_date,
        mtd.vat_filer_employee_id,
        e5.full_name as vat_filer_employee_name,
        e5.first_name as vat_filer_employee_first_name,
        e5.nick_name as vat_filer_employee_nick_name,
        mtd.vat_filer_current_employee_id,
        e6.full_name as vat_filer_current_employee_name,
        e6.first_name as vat_filer_current_employee_first_name,
        e6.nick_name as vat_filer_current_employee_nick_name,
        mtd.pp30_inquiry,
        mtd.pp30_response,
        mtd.pp30_submission_comment,
        mtd.pp30_filing_response,
        mtd.document_entry_responsible,
        e7.full_name as document_entry_responsible_name,
        e7.first_name as document_entry_responsible_first_name,
        e7.nick_name as document_entry_responsible_nick_name,
        mtd.created_at,
        mtd.updated_at
      FROM monthly_tax_data mtd
      LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
      LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
      LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
      LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
      LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
      WHERE mtd.build = ? AND mtd.tax_year = ? AND mtd.tax_month = ? AND mtd.deleted_at IS NULL`,
      [build, taxYear, taxMonth]
    )

    if (taxData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Monthly tax data not found',
      })
    }

    // Mark notifications as read when user views tax data
    if (taxData[0].id) {
      await markTaxReviewNotificationsAsRead(taxData[0].id, req.user.id)
    }

    // ⚠️ สำคัญ: ส่ง pp30_form กลับมาด้วยเพื่อให้ frontend ใช้เป็น single source of truth
    // หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
    // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
    // ⚠️ สำคัญ: ใช้ pp30_form จากฐานข้อมูลโดยตรงก่อน (ให้ตรงกับที่บันทึกไว้)
    // ถ้าไม่มี pp30_form → ใช้ derivePp30StatusFromRow เพื่อ derive จาก timestamp fields
    const pp30FormFromDb = taxData[0].pp30_form && String(taxData[0].pp30_form).trim() !== '' && taxData[0].pp30_form !== '0' && taxData[0].pp30_form !== '1' && taxData[0].pp30_form !== 0 && taxData[0].pp30_form !== 1
      ? String(taxData[0].pp30_form).trim()
      : null
    const derivedStatus = derivePp30StatusFromRow(taxData[0])
    const r = taxData[0]
    const row = {
      ...r,
      // ⚠️ สำคัญ: ส่งเฉพาะ pp30_form กลับมา (ไม่ส่ง pp30_status แล้ว)
      pp30_form: pp30FormFromDb || (derivedStatus || null),
      // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
      document_received_date: formatDateForResponse(r.document_received_date, 'document_received_date'),
      pnd_sent_for_review_date: formatDateForResponse(r.pnd_sent_for_review_date, 'pnd_sent_for_review_date'),
      pnd_review_returned_date: formatDateForResponse(r.pnd_review_returned_date, 'pnd_review_returned_date'),
      pnd_sent_to_customer_date: formatDateForResponse(r.pnd_sent_to_customer_date, 'pnd_sent_to_customer_date'),
      wht_draft_completed_date: formatDateForResponse(r.wht_draft_completed_date, 'wht_draft_completed_date'),
      pp30_sent_for_review_date: formatDateForResponse(r.pp30_sent_for_review_date, 'pp30_sent_for_review_date'),
      pp30_review_returned_date: formatDateForResponse(r.pp30_review_returned_date, 'pp30_review_returned_date'),
      pp30_sent_to_customer_date: formatDateForResponse(r.pp30_sent_to_customer_date, 'pp30_sent_to_customer_date'),
      vat_draft_completed_date: formatDateForResponse(r.vat_draft_completed_date, 'vat_draft_completed_date'),
      // ✅ แมปช่องคอมเมนต์/ความคิดเห็นให้ชัดเจน เพื่อให้ frontend แสดงข้อมูลในช่องคอมเมนต์ได้เสมอ
      wht_inquiry: r.wht_inquiry != null ? String(r.wht_inquiry) : null,
      wht_response: r.wht_response != null ? String(r.wht_response) : null,
      wht_submission_comment: r.wht_submission_comment != null ? String(r.wht_submission_comment) : null,
      wht_filing_response: r.wht_filing_response != null ? String(r.wht_filing_response) : null,
      pp30_inquiry: r.pp30_inquiry != null ? String(r.pp30_inquiry) : null,
      pp30_response: r.pp30_response != null ? String(r.pp30_response) : null,
      pp30_submission_comment: r.pp30_submission_comment != null ? String(r.pp30_submission_comment) : null,
      pp30_filing_response: r.pp30_filing_response != null ? String(r.pp30_filing_response) : null,
    }

    // 🔍 Debug: Log ข้อมูลที่ส่งกลับไปยัง frontend
    console.log('📤 [Backend] GET /api/monthly-tax-data/:build/:year/:month - Sending response:', {
      build: taxData[0].build,
      tax_year: taxData[0].tax_year,
      tax_month: taxData[0].tax_month,
      pp30_form: row.pp30_form,
      pp30_form_from_db: taxData[0].pp30_form,
      pp30_form_used: pp30FormFromDb ? 'pp30_form from DB' : 'derived from timestamps',
      derived_status: derivedStatus,
      pp30_filing_response: taxData[0].pp30_filing_response,
      pp30_sent_to_customer_date: taxData[0].pp30_sent_to_customer_date,
      pp30_review_returned_date: taxData[0].pp30_review_returned_date,
      pp30_sent_for_review_date: taxData[0].pp30_sent_for_review_date,
      vat_draft_completed_date: taxData[0].vat_draft_completed_date,
      purchase_document_count: taxData[0].purchase_document_count,
      income_confirmed: taxData[0].income_confirmed,
      pp30_payment_status: taxData[0].pp30_payment_status,
      pp30_payment_amount: taxData[0].pp30_payment_amount,
    })

    res.json({
      success: true,
      data: row,
    })
  } catch (error) {
    console.error('Get monthly tax data error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/monthly-tax-data/:id
 * ดึงข้อมูลภาษีรายเดือนตาม ID
 * Access: All authenticated users
 * NOTE: This route must be defined AFTER /:build/:year/:month route
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if pp30_payment_status and pp30_payment_amount columns exist
    const hasPaymentColumns = await checkPaymentColumnsExist()

    // Build payment columns part of SELECT statement
    const paymentColumns = hasPaymentColumns
      ? 'mtd.pp30_payment_status,\n        mtd.pp30_payment_amount,'
      : 'NULL as pp30_payment_status,\n        NULL as pp30_payment_amount,'

    const [taxData] = await pool.execute(
      `SELECT 
        mtd.id,
        mtd.build,
        c.company_name,
        mtd.tax_year,
        mtd.tax_month,
        mtd.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        e1.first_name as accounting_responsible_first_name,
        e1.nick_name as accounting_responsible_nick_name,
        mtd.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        e2.first_name as tax_inspection_responsible_first_name,
        e2.nick_name as tax_inspection_responsible_nick_name,
        mtd.document_received_date,
        mtd.bank_statement_status,
        mtd.pnd_sent_for_review_date,
        mtd.pnd_review_returned_date,
        mtd.pnd_sent_to_customer_date,
        mtd.pnd_status,
        mtd.pnd_1_40_1_status,
        mtd.pnd_1_40_2_status,
        mtd.pnd_3_status,
        mtd.pnd_53_status,
        mtd.pp_36_status,
        mtd.student_loan_form_status,
        mtd.pnd_2_status,
        mtd.pnd_54_status,
        mtd.pt_40_status,
        mtd.social_security_form_status,
        mtd.pnd_1_40_1_attachment_count,
        mtd.pnd_1_40_2_attachment_count,
        mtd.pnd_3_attachment_count,
        mtd.pnd_53_attachment_count,
        mtd.pp_36_attachment_count,
        mtd.student_loan_form_attachment_count,
        mtd.pnd_2_attachment_count,
        mtd.pnd_54_attachment_count,
        mtd.pt_40_attachment_count,
        mtd.social_security_form_attachment_count,
        mtd.accounting_record_status,
        mtd.monthly_tax_impact,
        mtd.bank_impact,
        mtd.wht_draft_completed_date,
        mtd.wht_filer_employee_id,
        e3.full_name as wht_filer_employee_name,
        e3.first_name as wht_filer_employee_first_name,
        e3.nick_name as wht_filer_employee_nick_name,
        mtd.wht_filer_current_employee_id,
        e4.full_name as wht_filer_current_employee_name,
        e4.first_name as wht_filer_current_employee_first_name,
        e4.nick_name as wht_filer_current_employee_nick_name,
        mtd.wht_inquiry,
        mtd.wht_response,
        mtd.wht_submission_comment,
        mtd.wht_filing_response,
        mtd.pp30_sent_for_review_date,
        mtd.pp30_review_returned_date,
        mtd.pp30_sent_to_customer_date,
        mtd.pp30_form,
        mtd.purchase_document_count,
        mtd.income_confirmed,
        mtd.expenses_confirmed,
        ${paymentColumns}
        mtd.vat_draft_completed_date,
        mtd.vat_filer_employee_id,
        e5.full_name as vat_filer_employee_name,
        e5.first_name as vat_filer_employee_first_name,
        e5.nick_name as vat_filer_employee_nick_name,
        mtd.vat_filer_current_employee_id,
        e6.full_name as vat_filer_current_employee_name,
        e6.first_name as vat_filer_current_employee_first_name,
        e6.nick_name as vat_filer_current_employee_nick_name,
        mtd.pp30_inquiry,
        mtd.pp30_response,
        mtd.pp30_submission_comment,
        mtd.pp30_filing_response,
        mtd.document_entry_responsible,
        e7.full_name as document_entry_responsible_name,
        e7.first_name as document_entry_responsible_first_name,
        e7.nick_name as document_entry_responsible_nick_name,
        mtd.created_at,
        mtd.updated_at
      FROM monthly_tax_data mtd
      LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
      LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
      LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
      LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
      LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
      WHERE mtd.id = ? AND mtd.deleted_at IS NULL`,
      [id]
    )

    if (taxData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Monthly tax data not found',
      })
    }

    // Mark notifications as read when user views tax data
    await markTaxReviewNotificationsAsRead(id, req.user.id)

    // ⚠️ สำคัญ: ส่ง pp30_form กลับมาด้วยเพื่อให้ frontend ใช้เป็น single source of truth
    // หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
    // ⚠️ Performance: Format dates ใน JavaScript (เร็วกว่า DATE_FORMAT ใน SQL)
    const derivedStatus = derivePp30StatusFromRow(taxData[0])
    const pp30FormFromDb = taxData[0].pp30_form && String(taxData[0].pp30_form).trim() !== '' && taxData[0].pp30_form !== '0' && taxData[0].pp30_form !== '1' && taxData[0].pp30_form !== 0 && taxData[0].pp30_form !== 1
      ? String(taxData[0].pp30_form).trim()
      : null
    const rId = taxData[0]
    const row = {
      ...rId,
      pp30_form: pp30FormFromDb || (derivedStatus || null),
      document_received_date: formatDateForResponse(rId.document_received_date, 'document_received_date'),
      pnd_sent_for_review_date: formatDateForResponse(rId.pnd_sent_for_review_date, 'pnd_sent_for_review_date'),
      pnd_review_returned_date: formatDateForResponse(rId.pnd_review_returned_date, 'pnd_review_returned_date'),
      pnd_sent_to_customer_date: formatDateForResponse(rId.pnd_sent_to_customer_date, 'pnd_sent_to_customer_date'),
      wht_draft_completed_date: formatDateForResponse(rId.wht_draft_completed_date, 'wht_draft_completed_date'),
      pp30_sent_for_review_date: formatDateForResponse(rId.pp30_sent_for_review_date, 'pp30_sent_for_review_date'),
      pp30_review_returned_date: formatDateForResponse(rId.pp30_review_returned_date, 'pp30_review_returned_date'),
      pp30_sent_to_customer_date: formatDateForResponse(rId.pp30_sent_to_customer_date, 'pp30_sent_to_customer_date'),
      vat_draft_completed_date: formatDateForResponse(rId.vat_draft_completed_date, 'vat_draft_completed_date'),
      wht_inquiry: rId.wht_inquiry != null ? String(rId.wht_inquiry) : null,
      wht_response: rId.wht_response != null ? String(rId.wht_response) : null,
      wht_submission_comment: rId.wht_submission_comment != null ? String(rId.wht_submission_comment) : null,
      wht_filing_response: rId.wht_filing_response != null ? String(rId.wht_filing_response) : null,
      pp30_inquiry: rId.pp30_inquiry != null ? String(rId.pp30_inquiry) : null,
      pp30_response: rId.pp30_response != null ? String(rId.pp30_response) : null,
      pp30_submission_comment: rId.pp30_submission_comment != null ? String(rId.pp30_submission_comment) : null,
      pp30_filing_response: rId.pp30_filing_response != null ? String(rId.pp30_filing_response) : null,
    }
    res.json({
      success: true,
      data: row,
    })
  } catch (error) {
    console.error('Get monthly tax data error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/monthly-tax-data
 * สร้างข้อมูลภาษีรายเดือนใหม่
 * Access: Admin/HR only
 */
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const {
      build,
      tax_year,
      tax_month,
      accounting_responsible,
      tax_inspection_responsible,
      document_received_date,
      bank_statement_status,
      // PND Information
      pnd_sent_for_review_date,
      pnd_review_returned_date,
      pnd_sent_to_customer_date,
      pnd_status,
      // Tax Form Statuses & Attachment Counts
      // (ไม่ destructure เพราะไม่ได้ใช้ใน INSERT — เก็บไว้ใน req.body สำหรับอนาคต)
      // Accounting Status
      accounting_record_status,
      monthly_tax_impact,
      bank_impact,
      // WHT Information
      wht_draft_completed_date,
      wht_filer_employee_id,
      wht_filer_current_employee_id,
      wht_inquiry,
      wht_response,
      wht_submission_comment,
      wht_filing_response,
      // VAT Information
      pp30_sent_for_review_date,
      pp30_review_returned_date,
      pp30_sent_to_customer_date,
      pp30_form,
      purchase_document_count,
      income_confirmed,
      expenses_confirmed,
      vat_draft_completed_date,
      vat_filer_employee_id,
      vat_filer_current_employee_id,
      pp30_inquiry,
      pp30_response,
      pp30_submission_comment,
      pp30_filing_response,
      document_entry_responsible,
    } = req.body

    // Validation
    if (!build || !tax_year || !tax_month) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          build: !build ? 'Required' : undefined,
          tax_year: !tax_year ? 'Required' : undefined,
          tax_month: !tax_month ? 'Required' : undefined,
        },
      })
    }

    const year = parseInt(tax_year)
    const month = parseInt(tax_month)

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month (must be 1-12)',
      })
    }

    // Check if client exists
    const [clients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    // Check if data already exists
    const [existingData] = await pool.execute(
      'SELECT id FROM monthly_tax_data WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    if (existingData.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Monthly tax data already exists for this month',
      })
    }

    const id = generateUUID()

    // Insert monthly tax data
    await pool.execute(
      `INSERT INTO monthly_tax_data (
        id, build, tax_year, tax_month,
        accounting_responsible, tax_inspection_responsible,
        document_received_date, bank_statement_status,
        pnd_sent_for_review_date, pnd_review_returned_date, pnd_sent_to_customer_date, pnd_status,
        accounting_record_status, monthly_tax_impact, bank_impact,
        wht_draft_completed_date, wht_filer_employee_id, wht_filer_current_employee_id,
        wht_inquiry, wht_response, wht_submission_comment, wht_filing_response,
        pp30_sent_for_review_date, pp30_review_returned_date, pp30_sent_to_customer_date,         pp30_form,
        purchase_document_count, income_confirmed, expenses_confirmed,
        vat_draft_completed_date, vat_filer_employee_id, vat_filer_current_employee_id,
        pp30_inquiry, pp30_response, pp30_submission_comment, pp30_filing_response,
        document_entry_responsible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        build,
        year,
        month,
        accounting_responsible || null,
        tax_inspection_responsible || null,
        document_received_date || null,
        bank_statement_status || null,
        pnd_sent_for_review_date || null,
        pnd_review_returned_date || null,
        pnd_sent_to_customer_date || null,
        pnd_status || null,
        accounting_record_status || null,
        monthly_tax_impact || null,
        bank_impact || null,
        wht_draft_completed_date || null,
        wht_filer_employee_id || null,
        wht_filer_current_employee_id || null,
        wht_inquiry || null,
        wht_response || null,
        wht_submission_comment || null,
        wht_filing_response || null,
        pp30_sent_for_review_date || null,
        pp30_review_returned_date || null,
        pp30_sent_to_customer_date || null,
        pp30_form || null, // หลัง migration 028: pp30_form เป็น VARCHAR(100) เก็บสถานะ pp30_status
        purchase_document_count || null,
        income_confirmed || null,
        expenses_confirmed || null,
        vat_draft_completed_date || null,
        vat_filer_employee_id || null,
        vat_filer_current_employee_id || null,
        pp30_inquiry || null,
        pp30_response || null,
        pp30_submission_comment || null,
        pp30_filing_response || null,
        document_entry_responsible || null,
      ]
    )

    // Check if pp30_payment_status and pp30_payment_amount columns exist
    const hasPaymentColumns = await checkPaymentColumnsExist()
    const paymentColumns = hasPaymentColumns
      ? 'mtd.pp30_payment_status,\n        mtd.pp30_payment_amount,'
      : 'NULL as pp30_payment_status,\n        NULL as pp30_payment_amount,'

    // Get created data
    const [newData] = await pool.execute(
      `SELECT 
        mtd.id,
        mtd.build,
        c.company_name,
        mtd.tax_year,
        mtd.tax_month,
        mtd.accounting_responsible,
        e1.full_name as accounting_responsible_name,
        e1.first_name as accounting_responsible_first_name,
        e1.nick_name as accounting_responsible_nick_name,
        mtd.tax_inspection_responsible,
        e2.full_name as tax_inspection_responsible_name,
        e2.first_name as tax_inspection_responsible_first_name,
        e2.nick_name as tax_inspection_responsible_nick_name,
        mtd.document_received_date,
        mtd.bank_statement_status,
        mtd.pnd_sent_for_review_date,
        mtd.pnd_review_returned_date,
        mtd.pnd_sent_to_customer_date,
        mtd.pnd_status,
        mtd.pnd_1_40_1_status,
        mtd.pnd_1_40_2_status,
        mtd.pnd_3_status,
        mtd.pnd_53_status,
        mtd.pp_36_status,
        mtd.student_loan_form_status,
        mtd.pnd_2_status,
        mtd.pnd_54_status,
        mtd.pt_40_status,
        mtd.social_security_form_status,
        mtd.pnd_1_40_1_attachment_count,
        mtd.pnd_1_40_2_attachment_count,
        mtd.pnd_3_attachment_count,
        mtd.pnd_53_attachment_count,
        mtd.pp_36_attachment_count,
        mtd.student_loan_form_attachment_count,
        mtd.pnd_2_attachment_count,
        mtd.pnd_54_attachment_count,
        mtd.pt_40_attachment_count,
        mtd.social_security_form_attachment_count,
        mtd.accounting_record_status,
        mtd.monthly_tax_impact,
        mtd.bank_impact,
        mtd.wht_draft_completed_date,
        mtd.wht_filer_employee_id,
        e3.full_name as wht_filer_employee_name,
        e3.first_name as wht_filer_employee_first_name,
        e3.nick_name as wht_filer_employee_nick_name,
        mtd.wht_filer_current_employee_id,
        e4.full_name as wht_filer_current_employee_name,
        e4.first_name as wht_filer_current_employee_first_name,
        e4.nick_name as wht_filer_current_employee_nick_name,
        mtd.wht_inquiry,
        mtd.wht_response,
        mtd.wht_submission_comment,
        mtd.wht_filing_response,
        mtd.pp30_sent_for_review_date,
        mtd.pp30_review_returned_date,
        mtd.pp30_sent_to_customer_date,
        mtd.pp30_form,
        mtd.purchase_document_count,
        mtd.income_confirmed,
        mtd.expenses_confirmed,
        ${paymentColumns}
        mtd.vat_draft_completed_date,
        mtd.vat_filer_employee_id,
        e5.full_name as vat_filer_employee_name,
        e5.first_name as vat_filer_employee_first_name,
        e5.nick_name as vat_filer_employee_nick_name,
        mtd.vat_filer_current_employee_id,
        e6.full_name as vat_filer_current_employee_name,
        e6.first_name as vat_filer_current_employee_first_name,
        e6.nick_name as vat_filer_current_employee_nick_name,
        mtd.pp30_inquiry,
        mtd.pp30_response,
        mtd.pp30_submission_comment,
        mtd.pp30_filing_response,
        mtd.document_entry_responsible,
        e7.full_name as document_entry_responsible_name,
        e7.first_name as document_entry_responsible_first_name,
        e7.nick_name as document_entry_responsible_nick_name,
        mtd.created_at,
        mtd.updated_at
      FROM monthly_tax_data mtd
      LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
      LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
      LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
      LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
      LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
      LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
      LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
      WHERE mtd.id = ?`,
      [id]
    )

    // ✅ Performance Optimization: Invalidate cache after creating new data
    // Invalidate ทั้ง list และ summary endpoints
    try {
      invalidateCache('GET:/monthly-tax-data')
      invalidateCache('GET:/monthly-tax-data/summary')
    } catch (cacheError) {
      console.error('⚠️ Error invalidating cache (non-critical):', cacheError)
      // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
    }

    res.status(201).json({
      success: true,
      message: 'Monthly tax data created successfully',
      data: newData[0],
    })
  } catch (error) {
    console.error('Create monthly tax data error:', error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Monthly tax data already exists for this month',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/monthly-tax-data/:id
 * แก้ไขข้อมูลภาษีรายเดือน
 * Access: Admin หรือ Responsible Users (accounting_responsible, tax_inspection_responsible, wht_filer_employee_id, vat_filer_employee_id, document_entry_responsible)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // 🔍 Debug: Log incoming request
    console.log('📥 [Backend] PUT /api/monthly-tax-data/:id - Request received:', {
      id,
      userId: req.user?.id,
      employeeId: req.user?.employee_id,
      role: req.user?.role,
      bodyKeys: Object.keys(req.body),
      bodySize: JSON.stringify(req.body).length,
    })
    // 🔍 BUG-185 Debug: Log PND fields ที่ส่งมา
    console.log('🔍 BUG-185 Debug - PND Fields in Request:', {
      'pnd_sent_for_review_date in body': 'pnd_sent_for_review_date' in req.body,
      'pnd_sent_for_review_date value': req.body.pnd_sent_for_review_date ?? '(undefined)',
      'pnd_review_returned_date in body': 'pnd_review_returned_date' in req.body,
      'pnd_review_returned_date value': req.body.pnd_review_returned_date ?? '(undefined)',
      'pnd_sent_to_customer_date in body': 'pnd_sent_to_customer_date' in req.body,
      'pnd_sent_to_customer_date value': req.body.pnd_sent_to_customer_date ?? '(undefined)',
      sourcePage: req.body.sourcePage,
      pnd_status: req.body.pnd_status,
    })
    // 🔍 BUG-185 Debug: Log PP30 fields ที่ส่งมา
    console.log('🔍 BUG-185 Debug - PP30 Fields in Request:', {
      'pp30_sent_for_review_date in body': 'pp30_sent_for_review_date' in req.body,
      'pp30_sent_for_review_date value': req.body.pp30_sent_for_review_date ?? '(undefined)',
      'pp30_review_returned_date in body': 'pp30_review_returned_date' in req.body,
      'pp30_review_returned_date value': req.body.pp30_review_returned_date ?? '(undefined)',
      'pp30_sent_to_customer_date in body': 'pp30_sent_to_customer_date' in req.body,
      'pp30_sent_to_customer_date value': req.body.pp30_sent_to_customer_date ?? '(undefined)',
      sourcePage: req.body.sourcePage,
      pp30_status: req.body.pp30_status,
    })

    const {
      accounting_responsible,
      tax_inspection_responsible,
      document_received_date,
      bank_statement_status,
      // PND Information
      pnd_sent_for_review_date,
      pnd_review_returned_date,
      pnd_sent_to_customer_date,
      pnd_status,
      // PP30 Status (ไม่มี field ในฐานข้อมูล แต่ใช้ส่งไปยัง backend เพื่อตรวจสอบสถานะและอัพเดท timestamp)
      pp30_status,
      // Tax Form Statuses
      pnd_1_40_1_status,
      pnd_1_40_2_status,
      pnd_3_status,
      pnd_53_status,
      pp_36_status,
      student_loan_form_status,
      pnd_2_status,
      pnd_54_status,
      pt_40_status,
      social_security_form_status,
      // Tax Form Attachment Counts
      pnd_1_40_1_attachment_count,
      pnd_1_40_2_attachment_count,
      pnd_3_attachment_count,
      pnd_53_attachment_count,
      pp_36_attachment_count,
      student_loan_form_attachment_count,
      pnd_2_attachment_count,
      pnd_54_attachment_count,
      pt_40_attachment_count,
      social_security_form_attachment_count,
      // Accounting Status
      accounting_record_status,
      monthly_tax_impact,
      bank_impact,
      // WHT Information
      wht_draft_completed_date,
      wht_filer_employee_id,
      wht_filer_current_employee_id,
      wht_inquiry,
      wht_response,
      wht_submission_comment,
      wht_filing_response,
      // VAT Information
      pp30_sent_for_review_date,
      pp30_review_returned_date,
      pp30_sent_to_customer_date,
      pp30_form,
      purchase_document_count,
      income_confirmed,
      expenses_confirmed,
      pp30_payment_status,
      pp30_payment_amount,
      vat_draft_completed_date,
      vat_filer_employee_id,
      vat_filer_current_employee_id,
      pp30_inquiry,
      pp30_response,
      pp30_submission_comment,
      pp30_filing_response,
      document_entry_responsible,
      sourcePage, // ⚠️ สำคัญ: หน้าเว็บที่ส่งข้อมูลมา (taxFiling, taxInspection, taxStatus)
    } = req.body

    // ⚠️ สำคัญ: หลัง migration 028, pp30_form เปลี่ยนเป็น VARCHAR(100) เพื่อเก็บสถานะ pp30_status โดยตรง
    // ยังคงแปลงเป็น timestamp fields สำหรับ backward compatibility และการทำงานของระบบ
    // ⚠️ สำคัญ: ตั้ง timestamp ตามสถานะและ sourcePage ที่กำหนด:
    // - pp30_sent_to_customer_date: เมื่อสถานะ = "sent_to_customer" และ sourcePage = "taxFiling" (หน้ายื่นภาษี)
    // - pp30_review_returned_date: เมื่อสถานะ = "needs_correction", "pending_review", "pending_recheck" และ sourcePage = "taxInspection" (หน้าตรวจภาษี)
    // - vat_draft_completed_date: เมื่อสถานะ = "draft_completed" และ sourcePage = "taxFiling" หรือ "taxStatus" (หน้ายื่นภาษีหรือหน้าสถานะยื่นภาษี)
    // - wht_draft_completed_date: เมื่อสถานะ pnd_status = "draft_completed" และ sourcePage = "taxFiling" หรือ "taxStatus" (หน้ายื่นภาษีหรือหน้าสถานะยื่นภาษี)
    // - pp30_sent_for_review_date: เมื่อสถานะ = "pending_review", "pending_recheck" และ sourcePage = "taxStatus" (หน้าสถานะยื่นภาษี)
    let computedPp30SentToCustomerDate = pp30_sent_to_customer_date
    let computedPp30ReviewReturnedDate = pp30_review_returned_date
    let computedPp30SentForReviewDate = pp30_sent_for_review_date
    let computedVatDraftCompletedDate = vat_draft_completed_date
    let computedPp30Form = pp30_form // ใช้เก็บสถานะ pp30_status

    // 🔍 Debug: Log ข้อมูลที่ได้รับจาก frontend
    console.log('🔍 [Backend] Received pp30_status conversion request:', {
      id,
      pp30_status,
      pp30_form,
      sourcePage,
      pp30_sent_to_customer_date,
      pp30_review_returned_date,
      pp30_sent_for_review_date,
      vat_draft_completed_date,
    })

    // ⚠️ สำคัญ: ถ้ามี pp30_status จาก frontend ให้เก็บใน pp30_form และตั้ง timestamp ตาม sourcePage
    if (pp30_status) {
      computedPp30Form = pp30_status
      // ⚠️ สำคัญ: ใช้ timestamp จาก frontend ถ้ามี (เป็น UTC แล้ว) หรือสร้างใหม่ถ้าไม่มี
      // Frontend ส่ง timestamp เป็น UTC format 'YYYY-MM-DD HH:mm:ss' แล้ว
      const getNowUTC = () => {
        // ถ้า frontend ส่ง timestamp มาแล้ว ให้ใช้ค่าจาก frontend (เป็น UTC แล้ว)
        // แต่ถ้าไม่มี ให้สร้างใหม่ด้วย UTC time
        return new Date().toISOString().slice(0, 19).replace('T', ' ')
      }

      switch (pp30_status) {
        case 'sent_to_customer':
          // ⚠️ สำคัญ: ตั้ง pp30_sent_to_customer_date เมื่อ sourcePage = "taxFiling" (หน้ายื่นภาษี)
          if (sourcePage === 'taxFiling') {
            if (!computedPp30SentToCustomerDate) {
              // ถ้า frontend ส่งมาแล้ว ให้ใช้ค่าจาก frontend (เป็น UTC แล้ว)
              // ถ้าไม่มี ให้สร้างใหม่
              computedPp30SentToCustomerDate = pp30_sent_to_customer_date || getNowUTC()
            }
            console.log('✅ [Backend] Set pp30_sent_to_customer_date for "sent_to_customer" (taxFiling):', {
              computedPp30Form,
              computedPp30SentToCustomerDate,
              sourcePage,
            })
          }
          break
        case 'draft_completed':
          // ⚠️ สำคัญ: ตั้ง vat_draft_completed_date เมื่อ sourcePage = "taxFiling" หรือ "taxStatus" (หน้ายื่นภาษีหรือหน้าสถานะยื่นภาษี)
          if (sourcePage === 'taxFiling' || sourcePage === 'taxStatus') {
            if (!computedVatDraftCompletedDate) {
              // ถ้า frontend ส่งมาแล้ว ให้ใช้ค่าจาก frontend (เป็น UTC แล้ว)
              // ถ้าไม่มี ให้สร้างใหม่
              computedVatDraftCompletedDate = vat_draft_completed_date || getNowUTC()
            }
            // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pp30_sent_for_review_date, pp30_review_returned_date, และ pp30_sent_to_customer_date
            if (sourcePage === 'taxStatus') {
              // ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
              // ถ้า frontend ส่ง field มา (มีค่า) ให้ใช้ค่าจาก frontend
              if (pp30_sent_for_review_date === undefined) {
                computedPp30SentForReviewDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
              if (pp30_review_returned_date === undefined) {
                computedPp30ReviewReturnedDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
              if (pp30_sent_to_customer_date === undefined) {
                computedPp30SentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
              console.log('✅ BUG-185 [Backend] Preserving PP30 fields for draft_completed (taxStatus):', {
                computedPp30Form,
                'pp30_sent_for_review_date from req.body': pp30_sent_for_review_date ?? '(undefined)',
                'pp30_review_returned_date from req.body': pp30_review_returned_date ?? '(undefined)',
                'pp30_sent_to_customer_date from req.body': pp30_sent_to_customer_date ?? '(undefined)',
                'computedPp30SentForReviewDate': computedPp30SentForReviewDate ?? '(undefined)',
                'computedPp30ReviewReturnedDate': computedPp30ReviewReturnedDate ?? '(undefined)',
                'computedPp30SentToCustomerDate': computedPp30SentToCustomerDate ?? '(undefined)',
                sourcePage,
              })
            } else {
              // ✅ FIX: สำหรับหน้ายื่นภาษี (taxFiling): preserve ค่าเดิมจากฐานข้อมูลเมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว"
              // ไม่ควร clear pp30_sent_to_customer_date เพราะอาจมีการส่งลูกค้าไปแล้วก่อนหน้า
              // ใช้ pattern เดียวกับ taxStatus: ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล
              if (pp30_sent_for_review_date === undefined) {
                computedPp30SentForReviewDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
              if (pp30_review_returned_date === undefined) {
                computedPp30ReviewReturnedDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
              if (pp30_sent_to_customer_date === undefined) {
                computedPp30SentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
              }
            }
            console.log('✅ [Backend] Set vat_draft_completed_date for "draft_completed" (taxFiling/taxStatus):', {
              computedPp30Form,
              computedVatDraftCompletedDate,
              computedPp30SentToCustomerDate,
              sourcePage,
            })
          }
          break
        case 'needs_correction':
        case 'pending_review':
        case 'pending_recheck':
          // ⚠️ สำคัญ: ตั้ง pp30_sent_for_review_date เมื่อ sourcePage = "taxStatus" (หน้าสถานะยื่นภาษี)
          if (sourcePage === 'taxStatus' && (pp30_status === 'pending_review' || pp30_status === 'pending_recheck')) {
            if (!computedPp30SentForReviewDate) {
              // ถ้า frontend ส่งมาแล้ว ให้ใช้ค่าจาก frontend (เป็น UTC แล้ว)
              // ถ้าไม่มี ให้สร้างใหม่
              computedPp30SentForReviewDate = pp30_sent_for_review_date || getNowUTC()
            }
            console.log('✅ [Backend] Set pp30_sent_for_review_date for status (taxStatus):', {
              computedPp30Form,
              pp30_status,
              computedPp30SentForReviewDate,
              sourcePage,
            })
          }
          // ⚠️ หมายเหตุ: pp30_review_returned_date จะถูกตั้งหลังจากเช็คสถานะเดิม (ดูด้านล่าง)
          break
        case 'received_receipt':
          // ⚠️ สำคัญ: สถานะ "รับใบเสร็จ" (received_receipt) ไม่ต้องตั้ง timestamp fields
          // เพราะเป็นสถานะที่เก็บใน pp30_form โดยตรง
          // แต่ถ้ามี pp30_sent_to_customer_date อยู่แล้ว อาจถือว่าเป็น received_receipt ด้วย
          // ไม่ต้อง clear dates เพราะ received_receipt อาจเกิดขึ้นหลังจาก sent_to_customer
          // ✅ BUG-XXX: เมื่อสถานะเป็น "รับใบเสร็จ" ไม่ควรลบข้อมูล pp30_sent_to_customer_date
          // ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
          if (pp30_sent_to_customer_date === undefined) {
            computedPp30SentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
          }
          console.log('✅ [Backend] Processing "received_receipt" status:', {
            computedPp30Form,
            sourcePage,
            'pp30_sent_to_customer_date from req.body': pp30_sent_to_customer_date ?? '(undefined)',
            'computedPp30SentToCustomerDate': computedPp30SentToCustomerDate ?? '(undefined)',
          })
          break
        case 'not_submitted':
        case 'additional_review':
        case 'inquire_customer':
        case 'draft_ready':
          // ⚠️ สำคัญ: สถานะเหล่านี้ไม่ต้องตั้ง timestamp fields
          // เพราะเป็นสถานะที่เก็บใน pp30_form โดยตรง
          // ไม่ต้อง clear dates เพราะสถานะเหล่านี้ไม่ควรลบข้อมูล timestamp ที่มีอยู่แล้ว
          // ✅ BUG-XXX: เมื่อสถานะเป็นสถานะเหล่านี้ไม่ควรลบข้อมูล pp30_sent_to_customer_date
          // ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
          if (pp30_sent_to_customer_date === undefined) {
            computedPp30SentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
          }
          console.log(`✅ [Backend] Processing "${pp30_status}" status:`, {
            computedPp30Form,
            sourcePage,
            'pp30_sent_to_customer_date from req.body': pp30_sent_to_customer_date ?? '(undefined)',
            'computedPp30SentToCustomerDate': computedPp30SentToCustomerDate ?? '(undefined)',
          })
          break
        case 'paid':
          // ⚠️ สำคัญ: สถานะ "ชำระแล้ว" (paid) ไม่ต้องตั้ง timestamp fields
          // เพราะเป็นสถานะที่เก็บใน pp30_form โดยตรง
          // ไม่ต้อง clear dates เพราะ paid อาจเกิดขึ้นหลังจาก sent_to_customer หรือ received_receipt
          // ✅ BUG-XXX: เมื่อสถานะเป็น "ชำระแล้ว" ไม่ควรลบข้อมูล pp30_sent_to_customer_date
          // ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
          if (pp30_sent_to_customer_date === undefined) {
            computedPp30SentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
          }
          console.log('✅ [Backend] Processing "paid" status:', {
            computedPp30Form,
            sourcePage,
            'pp30_sent_to_customer_date from req.body': pp30_sent_to_customer_date ?? '(undefined)',
            'computedPp30SentToCustomerDate': computedPp30SentToCustomerDate ?? '(undefined)',
          })
          break
        case 'passed':
          // ถ้าเลือก "ผ่าน" ให้ clear dates
          computedPp30SentToCustomerDate = null
          computedVatDraftCompletedDate = null
          break
      }
    } else if (pp30_form !== undefined && pp30_form !== null) {
      // ถ้า frontend ส่ง pp30_form มาโดยตรง (ไม่ใช่ pp30_status) ให้ใช้ค่าดังกล่าว
      computedPp30Form = String(pp30_form).trim()
    }

    // ⚠️ สำคัญ: จัดการ wht_draft_completed_date เมื่อ pnd_status = "draft_completed" และ sourcePage = "taxFiling" หรือ "taxStatus"
    // ถ้า frontend ส่ง wht_draft_completed_date มาแล้ว ให้ใช้ค่าที่ frontend ส่งมา
    // ถ้า frontend ไม่ได้ส่งมา และ pnd_status = "draft_completed" ให้ตั้งค่าใหม่
    // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pnd_sent_for_review_date, pnd_review_returned_date, และ pnd_sent_to_customer_date
    let computedWhtDraftCompletedDate = wht_draft_completed_date
    let computedPndSentForReviewDate = pnd_sent_for_review_date
    let computedPndReviewReturnedDate = pnd_review_returned_date
    let computedPndSentToCustomerDate = pnd_sent_to_customer_date

    if (pnd_status === 'draft_completed' && (sourcePage === 'taxFiling' || sourcePage === 'taxStatus')) {
      // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pnd_sent_for_review_date, pnd_review_returned_date, และ pnd_sent_to_customer_date
      // ถ้า frontend ไม่ส่ง field เหล่านี้มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
      if (sourcePage === 'taxStatus') {
        // ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล
        if (pnd_sent_for_review_date === undefined) {
          computedPndSentForReviewDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
        }
        if (pnd_review_returned_date === undefined) {
          computedPndReviewReturnedDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
        }
        if (pnd_sent_to_customer_date === undefined) {
          computedPndSentToCustomerDate = undefined // จะใช้ค่าเดิมจากฐานข้อมูลในส่วน actualParams
        }
        console.log('✅ BUG-185 [Backend] Preserving PND fields for draft_completed (taxStatus):', {
          pnd_status,
          sourcePage,
          'pnd_sent_for_review_date from req.body': pnd_sent_for_review_date ?? '(undefined)',
          'pnd_review_returned_date from req.body': pnd_review_returned_date ?? '(undefined)',
          'pnd_sent_to_customer_date from req.body': pnd_sent_to_customer_date ?? '(undefined)',
          'computedPndSentForReviewDate': computedPndSentForReviewDate ?? '(undefined)',
          'computedPndReviewReturnedDate': computedPndReviewReturnedDate ?? '(undefined)',
          'computedPndSentToCustomerDate': computedPndSentToCustomerDate ?? '(undefined)',
        })
      }

      // ถ้า frontend ส่ง wht_draft_completed_date มาแล้ว ให้ใช้ค่าที่ frontend ส่งมา
      if (wht_draft_completed_date !== undefined && wht_draft_completed_date !== null && wht_draft_completed_date !== '') {
        computedWhtDraftCompletedDate = wht_draft_completed_date
        console.log('✅ [Backend] Using wht_draft_completed_date from frontend:', {
          pnd_status,
          computedWhtDraftCompletedDate,
          sourcePage,
        })
      } else {
        // ถ้า frontend ไม่ได้ส่งมา ให้ตั้งค่าใหม่ (เป็น UTC time)
        computedWhtDraftCompletedDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
        console.log('✅ [Backend] Set wht_draft_completed_date for "draft_completed" (taxFiling/taxStatus):', {
          pnd_status,
          computedWhtDraftCompletedDate,
          sourcePage,
          wht_draft_completed_date_from_request: wht_draft_completed_date,
        })
      }
    }

    // Check if data exists and get responsible fields for permission check and preserving values
    // ⚠️ สำคัญ: SELECT wht_draft_completed_date และ vat_draft_completed_date เพื่อใช้ค่าเดิมจากฐานข้อมูลเมื่อไม่ได้ส่งมา (BUG-166)
    // ✅ BUG-185: SELECT pnd_sent_for_review_date, pnd_review_returned_date, pnd_sent_to_customer_date, pp30_sent_for_review_date, pp30_review_returned_date, pp30_sent_to_customer_date เพื่อใช้ค่าเดิมจากฐานข้อมูลเมื่อไม่ได้ส่งมา
    console.log('🔍 [Backend] Fetching existing data for id:', id)
    const [existingData] = await pool.execute(
      `SELECT 
        id,
        build,
        tax_year,
        tax_month,
        accounting_responsible,
        tax_inspection_responsible,
        wht_filer_employee_id,
        wht_filer_current_employee_id,
        vat_filer_employee_id,
        vat_filer_current_employee_id,
        document_entry_responsible,
        pnd_status,
        pnd_sent_for_review_date,
        pnd_review_returned_date,
        pnd_sent_to_customer_date,
        pp30_sent_for_review_date,
        pp30_review_returned_date,
        pp30_sent_to_customer_date,
        pp30_form,
        income_confirmed,
        pp30_filing_response,
        wht_draft_completed_date,
        vat_draft_completed_date
      FROM monthly_tax_data 
      WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    console.log('✅ [Backend] Existing data fetched:', {
      found: existingData.length > 0,
      build: existingData[0]?.build,
      pnd_status: existingData[0]?.pnd_status,
    })

    if (existingData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Monthly tax data not found',
      })
    }

    const existing = existingData[0]

    // ⚠️ สำคัญ: ตั้ง pp30_review_returned_date เมื่อเปลี่ยนสถานะจาก "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เป็นสถานะอื่น
    // เงื่อนไข:
    // 1. สถานะเดิม (existing) เป็น "pending_review" หรือ "pending_recheck"
    // 2. สถานะใหม่ (pp30_status) ไม่ใช่ "pending_review" หรือ "pending_recheck"
    // 3. sourcePage = "taxInspection" (หน้าตรวจภาษี)
    if (pp30_status && sourcePage === 'taxInspection') {
      // Derive สถานะเดิมจาก existing data
      const existingPp30Status = derivePp30StatusFromRow(existing)
      const isOldStatusPending = existingPp30Status === 'pending_review' || existingPp30Status === 'pending_recheck'
      const isNewStatusNotPending = pp30_status !== 'pending_review' && pp30_status !== 'pending_recheck'

      if (isOldStatusPending && isNewStatusNotPending) {
        // เปลี่ยนจาก "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เป็นสถานะอื่น → ตั้ง pp30_review_returned_date
        if (!computedPp30ReviewReturnedDate) {
          // ถ้า frontend ส่งมาแล้ว ให้ใช้ค่าจาก frontend (เป็น UTC แล้ว)
          // ถ้าไม่มี ให้สร้างใหม่ (เป็น UTC time)
          computedPp30ReviewReturnedDate = pp30_review_returned_date || new Date().toISOString().slice(0, 19).replace('T', ' ')
        }
        console.log('✅ [Backend] Set pp30_review_returned_date - Changed from pending status:', {
          existingPp30Status,
          newPp30Status: pp30_status,
          computedPp30ReviewReturnedDate,
          sourcePage,
        })
      }
    }

    // ⚠️ สำคัญ: pp30_filing_response เป็นข้อมูลที่ผู้ใช้กรอก (TEXT) ไม่ใช่สถานะ
    // ไม่ต้องตั้งค่า pp30_filing_response อัตโนมัติตามสถานะ เพราะสถานะเก็บใน pp30_form แล้ว
    let computedPp30FilingResponse = pp30_filing_response

    // Permission check: Admin หรือ Responsible User เท่านั้นที่สามารถบันทึกได้
    const isAdmin = req.user.role === 'admin'
    const userEmployeeId = req.user.employee_id

    if (!isAdmin) {
      // ตรวจสอบว่า user เป็น responsible person หรือไม่
      const data = existingData[0]
      const isResponsible =
        (data.accounting_responsible && data.accounting_responsible === userEmployeeId) ||
        (data.tax_inspection_responsible && data.tax_inspection_responsible === userEmployeeId) ||
        (data.wht_filer_employee_id && data.wht_filer_employee_id === userEmployeeId) ||
        (data.wht_filer_current_employee_id && data.wht_filer_current_employee_id === userEmployeeId) ||
        (data.vat_filer_employee_id && data.vat_filer_employee_id === userEmployeeId) ||
        (data.vat_filer_current_employee_id && data.vat_filer_current_employee_id === userEmployeeId) ||
        (data.document_entry_responsible && data.document_entry_responsible === userEmployeeId)

      if (!isResponsible) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions - You are not responsible for this data',
        })
      }
    }

    // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลสำหรับ responsible fields ถ้าไม่ได้ส่งมา
    // เพื่อป้องกันการทับข้อมูลพนักงานที่เชื่อมมาจากงานที่ได้รับมอบหมาย
    // Note: 'existing' is already declared at line 1640

    // Check if pp30_payment_status and pp30_payment_amount columns exist
    console.log('🔍 [Backend] Checking payment columns existence...')
    const hasPaymentColumns = await checkPaymentColumnsExist()
    console.log('✅ [Backend] Payment columns exist:', hasPaymentColumns)

    // Validation: ถ้า pp30_payment_status === 'has_payment' ต้องมี pp30_payment_amount และต้องเป็นตัวเลขที่มากกว่า 0
    // แต่ถ้าคอลัมน์ยังไม่มี ให้ข้าม validation นี้
    if (hasPaymentColumns && pp30_payment_status === 'has_payment') {
      if (!pp30_payment_amount || pp30_payment_amount === '' || pp30_payment_amount === null || pp30_payment_amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกจำนวนยอดชำระเมื่อเลือก "มียอดชำระ"',
        })
      }
      const paymentAmount = parseFloat(pp30_payment_amount)
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนยอดชำระต้องเป็นตัวเลขที่มากกว่า 0',
        })
      }
    }

    // Build UPDATE query with conditional payment columns
    const paymentColumnsUpdate = hasPaymentColumns
      ? 'pp30_payment_status = ?,\n        pp30_payment_amount = ?,\n        '
      : ''

    // Build SELECT query with conditional payment columns (for response)
    const paymentColumns = hasPaymentColumns
      ? 'mtd.pp30_payment_status,\n        mtd.pp30_payment_amount,'
      : 'NULL as pp30_payment_status,\n        NULL as pp30_payment_amount,'

    // Update monthly tax data
    const updateQuery = `UPDATE monthly_tax_data SET
        accounting_responsible = ?,
        tax_inspection_responsible = ?,
        document_received_date = ?,
        bank_statement_status = ?,
        pnd_sent_for_review_date = ?,
        pnd_review_returned_date = ?,
        pnd_sent_to_customer_date = ?,
        pnd_status = ?,
        pnd_1_40_1_status = ?,
        pnd_1_40_2_status = ?,
        pnd_3_status = ?,
        pnd_53_status = ?,
        pp_36_status = ?,
        student_loan_form_status = ?,
        pnd_2_status = ?,
        pnd_54_status = ?,
        pt_40_status = ?,
        social_security_form_status = ?,
        pnd_1_40_1_attachment_count = ?,
        pnd_1_40_2_attachment_count = ?,
        pnd_3_attachment_count = ?,
        pnd_53_attachment_count = ?,
        pp_36_attachment_count = ?,
        student_loan_form_attachment_count = ?,
        pnd_2_attachment_count = ?,
        pnd_54_attachment_count = ?,
        pt_40_attachment_count = ?,
        social_security_form_attachment_count = ?,
        accounting_record_status = ?,
        monthly_tax_impact = ?,
        bank_impact = ?,
        wht_draft_completed_date = ?,
        wht_filer_employee_id = ?,
        wht_filer_current_employee_id = ?,
        wht_inquiry = ?,
        wht_response = ?,
        wht_submission_comment = ?,
        wht_filing_response = ?,
        pp30_sent_for_review_date = ?,
        pp30_review_returned_date = ?,
        pp30_sent_to_customer_date = ?,
        pp30_form = ?,
        purchase_document_count = ?,
        income_confirmed = ?,
        expenses_confirmed = ?,
        ${paymentColumnsUpdate}vat_draft_completed_date = ?,
        vat_filer_employee_id = ?,
        vat_filer_current_employee_id = ?,
        pp30_inquiry = ?,
        pp30_response = ?,
        pp30_submission_comment = ?,
        pp30_filing_response = ?,
        document_entry_responsible = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`

    // 🔍 Debug: Log computedPp30Form before UPDATE
    console.log('🔍 [Backend] Before UPDATE - computedPp30Form:', {
      build: existing?.build,
      id,
      pp30_status,
      pp30_form,
      computedPp30Form,
      existing_pp30_form: existing?.pp30_form,
      sourcePage,
    })

    // 🔍 Debug: Log wht_draft_completed_date และ vat_draft_completed_date เพื่อตรวจสอบ BUG-166
    const finalWhtDraftCompletedDate = computedWhtDraftCompletedDate !== undefined && computedWhtDraftCompletedDate !== null
      ? computedWhtDraftCompletedDate
      : (wht_draft_completed_date !== undefined && wht_draft_completed_date !== null
        ? wht_draft_completed_date
        : (existing.wht_draft_completed_date !== undefined && existing.wht_draft_completed_date !== null ? existing.wht_draft_completed_date : null))
    const finalVatDraftCompletedDate = computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : (vat_draft_completed_date !== undefined ? vat_draft_completed_date : existing.vat_draft_completed_date)

    console.log('🔍 [Backend] BUG-166 Debug - wht_draft_completed_date & vat_draft_completed_date:', {
      sourcePage,
      pnd_status,
      'wht_draft_completed_date from request': wht_draft_completed_date !== undefined ? wht_draft_completed_date : '(undefined - ไม่ส่งมา)',
      'computedWhtDraftCompletedDate': computedWhtDraftCompletedDate !== undefined ? computedWhtDraftCompletedDate : '(undefined)',
      'existing.wht_draft_completed_date': existing.wht_draft_completed_date,
      'finalWhtDraftCompletedDate (will be saved)': finalWhtDraftCompletedDate,
      'vat_draft_completed_date from request': vat_draft_completed_date !== undefined ? vat_draft_completed_date : '(undefined - ไม่ส่งมา)',
      'computedVatDraftCompletedDate': computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : '(undefined)',
      'existing.vat_draft_completed_date': existing.vat_draft_completed_date,
      'finalVatDraftCompletedDate (will be saved)': finalVatDraftCompletedDate,
    })

    // Count SQL placeholders
    const sqlPlaceholders = (updateQuery.match(/\?/g) || []).length
    console.log('💾 [Backend] Executing UPDATE query:', {
      table: 'monthly_tax_data',
      id,
      build: existing?.build,
      pp30_status,
      pp30_form: computedPp30Form !== undefined ? computedPp30Form : (pp30_status || pp30_form !== undefined ? pp30_form : existing.pp30_form),
      pp30_filing_response: computedPp30FilingResponse,
      pnd_status,
      finalWhtDraftCompletedDate,
      finalWhtDraftCompletedDate_type: typeof finalWhtDraftCompletedDate,
      sqlPlaceholders,
      hasPaymentColumns,
    })

    // Count actual parameters
    // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error "Bind parameters must not contain undefined"

    // 🔍 BUG-185 Debug: Log values before processing
    // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pnd_sent_for_review_date, pnd_review_returned_date, และ pnd_sent_to_customer_date
    // ถ้า frontend ไม่ส่ง field มา (undefined) และสถานะเป็น "draft_completed" ในหน้าสถานะยื่นภาษี ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
    let pndSentForReviewDateValue
    let pndReviewReturnedDateValue
    let pndSentToCustomerDateValue

    // ✅ BUG-XXX: สถานะที่ไม่ต้องตั้ง timestamp: paid, received_receipt, not_submitted, additional_review, inquire_customer, draft_ready, draft_completed
    const pndStatusesWithoutTimestamp = ['paid', 'received_receipt', 'not_submitted', 'additional_review', 'inquire_customer', 'draft_ready', 'draft_completed']
    const isPndStatusWithoutTimestamp = pnd_status && pndStatusesWithoutTimestamp.includes(pnd_status)

    if ((sourcePage === 'taxStatus' && pnd_status === 'draft_completed') || isPndStatusWithoutTimestamp) {
      // ✅ BUG-185/BUG-XXX: ถ้า frontend ไม่ส่ง field มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
      // ถ้า frontend ส่ง field มา (มีค่า) ให้ใช้ค่าจาก frontend
      // ⚠️ สำคัญ: ใช้ `computedPndSentForReviewDate` ถ้ามี (จาก logic ด้านบน) ไม่งั้นใช้ค่าจาก req.body หรือ existing
      // ⚠️ สำคัญ: ถ้า `computedPndSentForReviewDate` เป็น `undefined` ให้ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า)
      if (computedPndSentForReviewDate !== undefined) {
        pndSentForReviewDateValue = computedPndSentForReviewDate
      } else if (pnd_sent_for_review_date !== undefined) {
        pndSentForReviewDateValue = pnd_sent_for_review_date
      } else {
        // ✅ BUG-185/BUG-XXX: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
        // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง ไม่ต้องตรวจสอบ `!== undefined && !== null` เพราะถ้าเป็น `null` ก็ควรจะใช้ `null` (ไม่เปลี่ยน)
        pndSentForReviewDateValue = existing.pnd_sent_for_review_date !== undefined ? existing.pnd_sent_for_review_date : null
      }

      if (computedPndReviewReturnedDate !== undefined) {
        pndReviewReturnedDateValue = computedPndReviewReturnedDate
      } else if (pnd_review_returned_date !== undefined) {
        pndReviewReturnedDateValue = pnd_review_returned_date
      } else {
        // ✅ BUG-185/BUG-XXX: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
        // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง ไม่ต้องตรวจสอบ `!== undefined && !== null` เพราะถ้าเป็น `null` ก็ควรจะใช้ `null` (ไม่เปลี่ยน)
        pndReviewReturnedDateValue = existing.pnd_review_returned_date !== undefined ? existing.pnd_review_returned_date : null
      }

      if (computedPndSentToCustomerDate !== undefined) {
        pndSentToCustomerDateValue = computedPndSentToCustomerDate
      } else if (pnd_sent_to_customer_date !== undefined) {
        pndSentToCustomerDateValue = pnd_sent_to_customer_date
      } else {
        // ✅ BUG-185/BUG-XXX: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
        // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง ไม่ต้องตรวจสอบ `!== undefined && !== null` เพราะถ้าเป็น `null` ก็ควรจะใช้ `null` (ไม่เปลี่ยน)
        pndSentToCustomerDateValue = existing.pnd_sent_to_customer_date !== undefined ? existing.pnd_sent_to_customer_date : null
      }
    } else {
      // สำหรับกรณีอื่นๆ: ใช้ logic เดิม
      pndSentForReviewDateValue = pnd_sent_for_review_date !== undefined ? pnd_sent_for_review_date : (existing.pnd_sent_for_review_date !== undefined ? existing.pnd_sent_for_review_date : null)
      pndReviewReturnedDateValue = pnd_review_returned_date !== undefined ? pnd_review_returned_date : (existing.pnd_review_returned_date !== undefined ? existing.pnd_review_returned_date : null)
      pndSentToCustomerDateValue = pnd_sent_to_customer_date !== undefined ? pnd_sent_to_customer_date : (existing.pnd_sent_to_customer_date !== undefined ? existing.pnd_sent_to_customer_date : null)
    }

    console.log('🔍 BUG-185 Debug - Backend Processing PND Fields:', {
      'pnd_sent_for_review_date in req.body': 'pnd_sent_for_review_date' in req.body,
      'pnd_sent_for_review_date from req.body': pnd_sent_for_review_date ?? '(undefined)',
      'existing.pnd_sent_for_review_date': existing.pnd_sent_for_review_date ?? '(null/undefined)',
      'computedPndSentForReviewDate': computedPndSentForReviewDate ?? '(undefined)',
      'pndSentForReviewDateValue (final)': pndSentForReviewDateValue ?? '(null)',
      'pnd_review_returned_date in req.body': 'pnd_review_returned_date' in req.body,
      'pnd_review_returned_date from req.body': pnd_review_returned_date ?? '(undefined)',
      'existing.pnd_review_returned_date': existing.pnd_review_returned_date ?? '(null/undefined)',
      'computedPndReviewReturnedDate': computedPndReviewReturnedDate ?? '(undefined)',
      'pndReviewReturnedDateValue (final)': pndReviewReturnedDateValue ?? '(null)',
      'pnd_sent_to_customer_date in req.body': 'pnd_sent_to_customer_date' in req.body,
      'pnd_sent_to_customer_date from req.body': pnd_sent_to_customer_date ?? '(undefined)',
      'existing.pnd_sent_to_customer_date': existing.pnd_sent_to_customer_date ?? '(null/undefined)',
      'computedPndSentToCustomerDate': computedPndSentToCustomerDate ?? '(undefined)',
      'pndSentToCustomerDateValue (final)': pndSentToCustomerDateValue ?? '(null)',
      sourcePage: sourcePage,
      pnd_status: pnd_status,
      'isTaxStatusAndDraftCompleted': sourcePage === 'taxStatus' && pnd_status === 'draft_completed',
    })

    const actualParams = [
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน
      accounting_responsible !== undefined ? accounting_responsible : existing.accounting_responsible,
      tax_inspection_responsible !== undefined ? tax_inspection_responsible : existing.tax_inspection_responsible,
      document_received_date !== undefined ? document_received_date : null,
      bank_statement_status !== undefined ? bank_statement_status : null,
      // ✅ BUG-185: ถ้า frontend ไม่ส่ง pnd_sent_for_review_date มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
      pndSentForReviewDateValue,
      // ✅ BUG-185: ถ้า frontend ไม่ส่ง pnd_review_returned_date มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
      pndReviewReturnedDateValue,
      // ✅ BUG-185: ถ้า frontend ไม่ส่ง pnd_sent_to_customer_date มา (undefined) ให้ใช้ค่าเดิมจากฐานข้อมูล (ไม่ update)
      pndSentToCustomerDateValue,
      pnd_status !== undefined ? pnd_status : null,
      // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error "Bind parameters must not contain undefined"
      pnd_1_40_1_status !== undefined ? pnd_1_40_1_status : null,
      pnd_1_40_2_status !== undefined ? pnd_1_40_2_status : null,
      pnd_3_status !== undefined ? pnd_3_status : null,
      pnd_53_status !== undefined ? pnd_53_status : null,
      pp_36_status !== undefined ? pp_36_status : null,
      student_loan_form_status !== undefined ? student_loan_form_status : null,
      pnd_2_status !== undefined ? pnd_2_status : null,
      pnd_54_status !== undefined ? pnd_54_status : null,
      pt_40_status !== undefined ? pt_40_status : null,
      social_security_form_status !== undefined ? social_security_form_status : null,
      pnd_1_40_1_attachment_count !== undefined ? pnd_1_40_1_attachment_count : null,
      pnd_1_40_2_attachment_count !== undefined ? pnd_1_40_2_attachment_count : null,
      pnd_3_attachment_count !== undefined ? pnd_3_attachment_count : null,
      pnd_53_attachment_count !== undefined ? pnd_53_attachment_count : null,
      pp_36_attachment_count !== undefined ? pp_36_attachment_count : null,
      student_loan_form_attachment_count !== undefined ? student_loan_form_attachment_count : null,
      pnd_2_attachment_count !== undefined ? pnd_2_attachment_count : null,
      pnd_54_attachment_count !== undefined ? pnd_54_attachment_count : null,
      pt_40_attachment_count !== undefined ? pt_40_attachment_count : null,
      social_security_form_attachment_count !== undefined ? social_security_form_attachment_count : null,
      accounting_record_status !== undefined ? accounting_record_status : null,
      monthly_tax_impact !== undefined ? monthly_tax_impact : null,
      bank_impact !== undefined ? bank_impact : null,
      // ✅ BUG-166: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูล wht_draft_completed_date
      // ⚠️ สำคัญ: wht_draft_completed_date ควรจะถูกจัดการเฉพาะในหน้า "ยื่นภาษี" (taxFiling) หรือ "สถานะยื่นภาษี" (taxStatus) เท่านั้น
      // หน้า "ตรวจภาษี" (taxInspection) ไม่ควรส่ง wht_draft_completed_date ไปยัง backend
      // ⚠️ สำคัญ: ใช้ finalWhtDraftCompletedDate ที่คำนวณแล้ว (ใช้ computedWhtDraftCompletedDate ถ้ามี หรือใช้ค่าจาก request หรือใช้ค่าเดิมจากฐานข้อมูล)
      // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error
      finalWhtDraftCompletedDate !== undefined && finalWhtDraftCompletedDate !== null ? finalWhtDraftCompletedDate : null,
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน แต่แปลง undefined เป็น null
      wht_filer_employee_id !== undefined ? wht_filer_employee_id : (existing.wht_filer_employee_id !== undefined ? existing.wht_filer_employee_id : null),
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน แต่แปลง undefined เป็น null
      wht_filer_current_employee_id !== undefined ? wht_filer_current_employee_id : (existing.wht_filer_current_employee_id !== undefined ? existing.wht_filer_current_employee_id : null),
      wht_inquiry !== undefined ? wht_inquiry : null,
      wht_response !== undefined ? wht_response : null,
      wht_submission_comment !== undefined ? wht_submission_comment : null,
      wht_filing_response !== undefined ? wht_filing_response : null,
      // ⚠️ สำคัญ: ใช้ค่าที่คำนวณแล้ว (computed) สำหรับ timestamp fields ที่ตั้งตามสถานะและ sourcePage
      // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pp30_sent_for_review_date, pp30_review_returned_date, และ pp30_sent_to_customer_date
      // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error
      // ⚠️ สำคัญ: ถ้า computedPp30SentForReviewDate เป็น undefined และ sourcePage === 'taxStatus' && pp30_status === 'draft_completed' ให้ใช้ค่าเดิมจากฐานข้อมูล
      (() => {
        if (computedPp30SentForReviewDate !== undefined) {
          return computedPp30SentForReviewDate
        } else if (pp30_sent_for_review_date !== undefined) {
          return pp30_sent_for_review_date
        } else if (sourcePage === 'taxStatus' && pp30_status === 'draft_completed') {
          // ✅ BUG-185: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
          return existing.pp30_sent_for_review_date !== undefined ? existing.pp30_sent_for_review_date : null
        } else {
          return existing.pp30_sent_for_review_date !== undefined ? existing.pp30_sent_for_review_date : null
        }
      })(),
      (() => {
        if (computedPp30ReviewReturnedDate !== undefined) {
          return computedPp30ReviewReturnedDate
        } else if (pp30_review_returned_date !== undefined) {
          return pp30_review_returned_date
        } else if (sourcePage === 'taxStatus' && pp30_status === 'draft_completed') {
          // ✅ BUG-185: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
          return existing.pp30_review_returned_date !== undefined ? existing.pp30_review_returned_date : null
        } else {
          return existing.pp30_review_returned_date !== undefined ? existing.pp30_review_returned_date : null
        }
      })(),
      // ✅ BUG-185: สำหรับหน้าสถานะยื่นภาษี: เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว" ไม่ควรลบข้อมูล pp30_sent_to_customer_date
      // ✅ BUG-XXX: เมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp ไม่ควรลบข้อมูล pp30_sent_to_customer_date
      // สถานะที่ไม่ต้องตั้ง timestamp: paid, received_receipt, not_submitted, additional_review, inquire_customer, draft_ready
      // ถ้า computedPp30SentToCustomerDate เป็น undefined และสถานะเป็นสถานะเหล่านี้ ให้ใช้ค่าเดิมจากฐานข้อมูล
      (() => {
        if (computedPp30SentToCustomerDate !== undefined) {
          return computedPp30SentToCustomerDate
        } else if (pp30_sent_to_customer_date !== undefined) {
          return pp30_sent_to_customer_date
        } else if (sourcePage === 'taxStatus' && pp30_status === 'draft_completed') {
          // ✅ BUG-185: ใช้ค่าเดิมจากฐานข้อมูลโดยตรง (ไม่ว่าจะเป็น `null` หรือมีค่า) เพื่อป้องกันการลบข้อมูล
          return existing.pp30_sent_to_customer_date !== undefined ? existing.pp30_sent_to_customer_date : null
        } else if (pp30_status === 'paid' ||
          pp30_status === 'received_receipt' ||
          pp30_status === 'not_submitted' ||
          pp30_status === 'additional_review' ||
          pp30_status === 'inquire_customer' ||
          pp30_status === 'draft_ready') {
          // ✅ BUG-XXX: เมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp ใช้ค่าเดิมจากฐานข้อมูลเพื่อป้องกันการลบข้อมูล
          // เพราะสถานะเหล่านี้เก็บใน pp30_form โดยตรง ไม่ควรลบ pp30_sent_to_customer_date
          return existing.pp30_sent_to_customer_date !== undefined ? existing.pp30_sent_to_customer_date : null
        } else {
          return null
        }
      })(),
      // ⚠️ สำคัญ: เก็บ pp30_status ใน pp30_form (เปลี่ยนจาก BOOLEAN เป็น VARCHAR(100) ใน migration 028)
      computedPp30Form !== undefined ? computedPp30Form : (pp30_status || pp30_form !== undefined ? pp30_form : (existing.pp30_form !== undefined ? existing.pp30_form : null)),
      purchase_document_count !== undefined ? purchase_document_count : null,
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา แต่แปลง undefined เป็น null
      income_confirmed !== undefined ? income_confirmed : (existing.income_confirmed !== undefined ? existing.income_confirmed : null),
      expenses_confirmed !== undefined ? expenses_confirmed : (existing.expenses_confirmed !== undefined ? existing.expenses_confirmed : null),
      // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error
      ...(hasPaymentColumns ? [
        pp30_payment_status !== undefined ? pp30_payment_status : null,
        pp30_payment_amount !== undefined && pp30_payment_amount !== null && pp30_payment_amount !== '' ? parseFloat(pp30_payment_amount) : null,
      ] : []),
      // ✅ BUG-166: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูล vat_draft_completed_date
      // ⚠️ สำคัญ: vat_draft_completed_date ควรจะถูกจัดการเฉพาะในหน้า "ยื่นภาษี" (taxFiling) หรือ "สถานะยื่นภาษี" (taxStatus) เท่านั้น
      // หน้า "ตรวจภาษี" (taxInspection) ไม่ควรส่ง vat_draft_completed_date ไปยัง backend
      // ⚠️ สำคัญ: แปลง undefined เป็น null เพื่อป้องกัน MySQL2 error
      computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : (vat_draft_completed_date !== undefined ? vat_draft_completed_date : (existing.vat_draft_completed_date !== undefined ? existing.vat_draft_completed_date : null)),
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน แต่แปลง undefined เป็น null
      vat_filer_employee_id !== undefined ? vat_filer_employee_id : (existing.vat_filer_employee_id !== undefined ? existing.vat_filer_employee_id : null),
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน แต่แปลง undefined เป็น null
      vat_filer_current_employee_id !== undefined ? vat_filer_current_employee_id : (existing.vat_filer_current_employee_id !== undefined ? existing.vat_filer_current_employee_id : null),
      pp30_inquiry !== undefined ? pp30_inquiry : null,
      pp30_response !== undefined ? pp30_response : null,
      pp30_submission_comment !== undefined ? pp30_submission_comment : null,
      computedPp30FilingResponse !== undefined ? computedPp30FilingResponse : (pp30_filing_response !== undefined ? pp30_filing_response : null),
      // ⚠️ สำคัญ: ใช้ค่าเดิมจากฐานข้อมูลถ้าไม่ได้ส่งมา เพื่อป้องกันการทับข้อมูลพนักงาน แต่แปลง undefined เป็น null
      document_entry_responsible !== undefined ? document_entry_responsible : (existing.document_entry_responsible !== undefined ? existing.document_entry_responsible : null),
      id,
    ]

    // ⚠️ สำคัญ: แปลง undefined เป็น null ใน parameters array เพื่อป้องกัน MySQL2 error
    const sanitizedParams = actualParams.map(param => param === undefined ? null : param)

    const actualParamsCount = sanitizedParams.length
    console.log('💾 [Backend] SQL Parameters count:', {
      sqlPlaceholders,
      actualParamsCount,
      match: sqlPlaceholders === actualParamsCount,
      finalWhtDraftCompletedDate_value: finalWhtDraftCompletedDate,
      finalWhtDraftCompletedDate_index: sanitizedParams.findIndex((p, i) => {
        // Find wht_draft_completed_date position (should be around index 30-32)
        return i >= 30 && i <= 32 && p === finalWhtDraftCompletedDate
      }),
      hasUndefined: actualParams.some(p => p === undefined),
      undefinedCount: actualParams.filter(p => p === undefined).length,
    })

    if (sqlPlaceholders !== actualParamsCount) {
      console.error('❌ [Backend] SQL Placeholders mismatch!', {
        sqlPlaceholders,
        actualParamsCount,
        difference: sqlPlaceholders - actualParamsCount,
      })
    }

    if (actualParams.some(p => p === undefined)) {
      console.warn('⚠️ [Backend] Found undefined values in parameters! Converting to null...', {
        undefinedIndices: actualParams.map((p, i) => p === undefined ? i : null).filter(i => i !== null),
        undefinedValues: actualParams.filter((p) => p === undefined).map((p) => ({ index: actualParams.indexOf(p), value: p })),
      })
    }

    const [updateResult] = await pool.execute(
      updateQuery,
      sanitizedParams
    )

    // 🔍 Debug: Log pp30_form ที่อัพเดท
    const pp30FormValue = computedPp30Form !== undefined ? computedPp30Form : (pp30_status || pp30_form !== undefined ? pp30_form : existing.pp30_form)

    console.log('✅ [Backend] UPDATE executed successfully:', {
      table: 'monthly_tax_data',
      id,
      affectedRows: updateResult.affectedRows,
      changedRows: updateResult.changedRows,
      build: existing?.build,
      pp30_status,
      pp30_form_updated: pp30FormValue, // ⚠️ สำคัญ: เพิ่ม logging สำหรับ pp30_form ที่อัพเดท
      pp30_filing_response: computedPp30FilingResponse,
      pnd_status,
    })

    // Get company name for notification
    const [clientData] = await pool.execute(
      'SELECT company_name FROM clients WHERE build = ? AND deleted_at IS NULL',
      [existing.build]
    )
    const companyName = clientData.length > 0 ? clientData[0].company_name : existing.build

    // ═══ Activity Log ═══
    const sourcePageMap = {
      taxInspection: 'tax_inspection',
      taxFiling: 'tax_filing',
      taxStatus: 'tax_filing_status',
    }
    const logPage = sourcePageMap[sourcePage] || 'tax_filing_status'
    const existingPndStatusVal = existing.pnd_status || null
    const existingPp30Status = derivePp30StatusFromRow ? derivePp30StatusFromRow(existing) : (existing.pp30_form || null)

    // Log pnd_status change
    if (pnd_status && pnd_status !== existingPndStatusVal) {
      const pndLabel = { pending_review: 'รอตรวจ', passed: 'ผ่าน', needs_correction: 'แก้ไข', draft_completed: 'ร่างแบบเสร็จแล้ว', draft_ready: 'ร่างแบบได้', pending_recheck: 'รอตรวจอีกครั้ง', sent_to_customer: 'ส่งลูกค้าแล้ว', paid: 'ชำระแล้ว', received_receipt: 'รับใบเสร็จ', not_started: 'ยังไม่ดำเนินการ', inquire_customer: 'สอบถามลูกค้าเพิ่มเติม', additional_review: 'ตรวจสอบเพิ่มเติม', not_submitted: 'ไม่มียื่น', edit: 'แก้ไข' }
      logActivity({
        userId: req.user.id,
        employeeId: req.user.employee_id,
        userName: req.user.name || req.user.username,
        action: 'status_update',
        page: logPage,
        entityType: 'monthly_tax_data',
        entityId: id,
        build: existing.build,
        companyName,
        description: `อัพเดทสถานะ WHT: ${pndLabel[existingPndStatusVal] || existingPndStatusVal || '-'} → ${pndLabel[pnd_status] || pnd_status}`,
        fieldChanged: 'pnd_status',
        oldValue: existingPndStatusVal,
        newValue: pnd_status,
        metadata: { month: existing.tax_month, year: existing.tax_year, sourcePage },
        ipAddress: req.ip,
      })
    }

    // Log pp30_status change
    if (pp30_status && pp30_status !== existingPp30Status) {
      const pp30Label = { pending_review: 'รอตรวจ', passed: 'ผ่าน', needs_correction: 'แก้ไข', draft_completed: 'ร่างแบบเสร็จแล้ว', draft_ready: 'ร่างแบบได้', pending_recheck: 'รอตรวจอีกครั้ง', sent_to_customer: 'ส่งลูกค้าแล้ว', paid: 'ชำระแล้ว', received_receipt: 'รับใบเสร็จ', not_started: 'ยังไม่ดำเนินการ', inquire_customer: 'สอบถามลูกค้าเพิ่มเติม', additional_review: 'ตรวจสอบเพิ่มเติม', not_submitted: 'ไม่มียื่น', edit: 'แก้ไข' }
      logActivity({
        userId: req.user.id,
        employeeId: req.user.employee_id,
        userName: req.user.name || req.user.username,
        action: 'status_update',
        page: logPage,
        entityType: 'monthly_tax_data',
        entityId: id,
        build: existing.build,
        companyName,
        description: `อัพเดทสถานะ VAT: ${pp30Label[existingPp30Status] || existingPp30Status || '-'} → ${pp30Label[pp30_status] || pp30_status}`,
        fieldChanged: 'pp30_form_status',
        oldValue: existingPp30Status,
        newValue: pp30_status,
        metadata: { month: existing.tax_month, year: existing.tax_year, sourcePage },
        ipAddress: req.ip,
      })
    }

    // Create notifications if status changed to "pending_review" or "pending_recheck"
    const existingPndStatus = existing.pnd_status || null

    console.log('🔔 Notification check:', {
      pnd_status,
      existingPndStatus,
      tax_inspection_responsible: existing.tax_inspection_responsible,
      build: existing.build,
      companyName,
    })

    // Check if PND status is "pending_review" or "pending_recheck"
    // ⚠️ สำคัญ: สร้าง notification เฉพาะเมื่อผู้ทำบัญชี (accounting_responsible) ส่งสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // เพื่อแจ้งผู้ตรวจ (tax_inspection_responsible) ให้ทราบ
    // Note: createTaxReviewNotification จะตรวจสอบว่า notification ที่ยังไม่อ่านมีอยู่แล้วหรือไม่
    // ถ้ามีอยู่แล้วจะไม่สร้างใหม่ ถ้าไม่มี (ถูกอ่านแล้วหรือหมดอายุแล้ว) จะสร้างใหม่
    const isPendingStatus = pnd_status === 'pending_review' || pnd_status === 'pending_recheck'
    const isAccountingResponsible = existing.accounting_responsible === userEmployeeId

    if (pnd_status && isPendingStatus && isAccountingResponsible && existing.tax_inspection_responsible) {
      console.log(`📢 Attempting to create notification for PND status: ${pnd_status} (existing: ${existingPndStatus})`)
      console.log(`   User is accounting_responsible, sending notification to tax_inspection_responsible: ${existing.tax_inspection_responsible}`)
      const notificationType = pnd_status === 'pending_review' ? 'tax_review_pending' : 'tax_review_pending_recheck'
      // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน notification creation ทำให้ response fail
      // เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      try {
        const notificationId = await createTaxReviewNotification(
          existing.tax_inspection_responsible,
          notificationType,
          'pnd',
          existing.build,
          companyName,
          existing.tax_year,
          existing.tax_month,
          id,
          req.user.id
        )
        if (notificationId) {
          console.log(`✅ Notification created successfully: ${notificationId}`)
        } else {
          console.log(`⚠️ Notification creation returned null (may already exist as unread or no user found)`)
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating PND notification (non-critical):', notificationError)
        // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      }
    } else {
      console.log('ℹ️ No notification needed:', {
        pnd_status,
        existingPndStatus,
        isPendingStatus,
        isAccountingResponsible,
        hasTaxInspectionResponsible: !!existing.tax_inspection_responsible,
        reason: !isPendingStatus ? 'not pending status' : !isAccountingResponsible ? 'user is not accounting_responsible' : !existing.tax_inspection_responsible ? 'no tax_inspection_responsible' : 'unknown',
      })
    }

    // Check if PP30 status changed to "pending_review" or "pending_recheck"
    // ⚠️ สำคัญ: ใช้ pp30_status จาก frontend เพื่อตรวจสอบสถานะ (แม้ว่าจะไม่มี field ในฐานข้อมูล)
    // ถ้าไม่มี pp30_status จาก frontend ให้ตรวจสอบจาก pp30_sent_for_review_date และ pp30_review_returned_date แทน
    const isPp30PendingStatus = pp30_status && (pp30_status === 'pending_review' || pp30_status === 'pending_recheck')
    const wasPp30PendingBefore = existing.pp30_sent_for_review_date && !existing.pp30_review_returned_date
    const isPp30PendingNow = isPp30PendingStatus || (pp30_sent_for_review_date && !pp30_review_returned_date)
    const wasPp30RecheckBefore = existing.pp30_review_returned_date && existing.pp30_sent_for_review_date && !existing.pp30_sent_to_customer_date
    const isPp30PendingRecheck = (pp30_status && pp30_status === 'pending_recheck') || (existing.pp30_review_returned_date && pp30_sent_for_review_date && !pp30_review_returned_date)

    console.log('🔔 PP30 Notification check:', {
      pp30_status, // ⚠️ เพิ่ม: สถานะ PP30 จาก frontend
      pp30_sent_for_review_date,
      pp30_review_returned_date,
      existing_pp30_sent_for_review_date: existing.pp30_sent_for_review_date,
      existing_pp30_review_returned_date: existing.pp30_review_returned_date,
      isPp30PendingStatus, // ⚠️ เพิ่ม: ตรวจสอบสถานะจาก pp30_status
      wasPp30PendingBefore,
      isPp30PendingNow,
      wasPp30RecheckBefore,
      isPp30PendingRecheck,
      tax_inspection_responsible: existing.tax_inspection_responsible, // ⚠️ แก้ไข: ใช้ tax_inspection_responsible แทน accounting_responsible
      accounting_responsible: existing.accounting_responsible,
    })

    // สร้าง notification เมื่อ pp30_status เป็น "pending_review" หรือ "pending_recheck"
    // หรือ pp30_sent_for_review_date ถูก set และยังไม่มี pp30_review_returned_date (pending review)
    // หรือ pp30_sent_for_review_date ถูก set หลังจากมี pp30_review_returned_date (pending recheck)
    // ⚠️ สำคัญ: สร้าง notification เฉพาะเมื่อผู้ทำบัญชี (accounting_responsible) ส่งสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // เพื่อแจ้งผู้ตรวจ (tax_inspection_responsible) ให้ทราบ
    // Note: createTaxReviewNotification จะตรวจสอบว่า notification ที่ยังไม่อ่านมีอยู่แล้วหรือไม่
    if ((isPp30PendingStatus || isPp30PendingNow) && isAccountingResponsible && existing.tax_inspection_responsible) {
      // Pending review (มี sent_for_review_date แต่ยังไม่มี review_returned_date)
      const notificationType = isPp30PendingRecheck ? 'tax_review_pending_recheck' : 'tax_review_pending'
      console.log(`📢 Attempting to create notification for PP30: ${notificationType}`)
      console.log(`   User is accounting_responsible, sending notification to tax_inspection_responsible: ${existing.tax_inspection_responsible}`)
      // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน notification creation ทำให้ response fail
      // เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      try {
        const notificationId = await createTaxReviewNotification(
          existing.tax_inspection_responsible, // ⚠️ แก้ไข: ส่งไปที่ tax_inspection_responsible แทน accounting_responsible
          notificationType,
          'pp30',
          existing.build,
          companyName,
          existing.tax_year,
          existing.tax_month,
          id,
          req.user.id
        )
        if (notificationId) {
          console.log(`✅ PP30 Notification created successfully: ${notificationId}`)
        } else {
          console.log(`⚠️ PP30 Notification creation returned null (may already exist as unread or no user found)`)
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating PP30 notification (non-critical):', notificationError)
        // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      }
    } else {
      console.log('ℹ️ No PP30 notification needed:', {
        isPp30PendingNow,
        wasPp30PendingBefore,
        isPp30PendingRecheck,
        wasPp30RecheckBefore,
        isAccountingResponsible,
        hasTaxInspectionResponsible: !!existing.tax_inspection_responsible,
        reason: !(isPp30PendingStatus || isPp30PendingNow) ? 'not pending' : !isAccountingResponsible ? 'user is not accounting_responsible' : !existing.tax_inspection_responsible ? 'no tax_inspection_responsible' : 'unknown',
      })
    }

    // Check if tax inspector completed review
    // ⚠️ สำคัญ: สร้าง notification เมื่อผู้ตรวจ (tax_inspection_responsible) บันทึกข้อมูล
    // และสถานะไม่ใช่ "pending_review" หรือ "pending_recheck" (ไม่ว่าจะเปลี่ยนสถานะหรือไม่)
    // เพื่อแจ้งผู้ทำบัญชี (accounting_responsible) ให้ทราบว่าผู้ตรวจได้ตรวจสอบข้อมูลแล้ว
    const isTaxInspector = existing.tax_inspection_responsible === userEmployeeId
    const isNotPendingNow = pnd_status && pnd_status !== 'pending_review' && pnd_status !== 'pending_recheck' && pnd_status !== ''

    console.log('🔔 Tax Inspector Completed Review check:', {
      isTaxInspector,
      isNotPendingNow,
      existingPndStatus,
      pnd_status,
      accounting_responsible: existing.accounting_responsible,
    })

    // สร้าง notification เมื่อ:
    // 1. ผู้ใช้เป็น tax_inspection_responsible (ผู้ตรวจ)
    // 2. สถานะปัจจุบันไม่ใช่ "pending_review" หรือ "pending_recheck"
    // 3. มี accounting_responsible (ผู้ทำบัญชี)
    // 4. ⚠️ สำคัญ: accounting_responsible และ tax_inspection_responsible ต้องไม่ใช่คนเดียวกัน
    // ⚠️ สำคัญ: สร้าง notification ทุกครั้งที่ผู้ตรวจบันทึกข้อมูล (ไม่ว่าจะเปลี่ยนสถานะหรือไม่)
    // เพื่อแจ้งผู้ทำบัญชีให้ทราบว่าผู้ตรวจได้ตรวจสอบข้อมูลแล้ว
    const isSamePerson = existing.accounting_responsible === existing.tax_inspection_responsible
    if (isTaxInspector && isNotPendingNow && existing.accounting_responsible && !isSamePerson) {
      // Get inspector name
      const [inspectorData] = await pool.execute(
        'SELECT full_name FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
        [existing.tax_inspection_responsible]
      )
      const inspectorName = inspectorData.length > 0 ? inspectorData[0].full_name : 'ผู้ตรวจ'

      // Get comment preview (use wht_response or wht_submission_comment)
      const comment = wht_response || wht_submission_comment || ''

      console.log(`📢 Attempting to create tax inspection completed notification`)
      console.log(`   Sending to accounting_responsible (employee_id): ${existing.accounting_responsible}`)
      console.log(`   Inspector (employee_id): ${existing.tax_inspection_responsible}`)
      console.log(`   Current user (employee_id): ${userEmployeeId}`)
      // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน notification creation ทำให้ response fail
      // เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      try {
        const notificationId = await createTaxInspectionCompletedNotification(
          existing.accounting_responsible,
          existing.build,
          companyName,
          existing.tax_year,
          existing.tax_month,
          id,
          pnd_status,
          inspectorName,
          comment,
          req.user.id
        )
        if (notificationId) {
          console.log(`✅ Tax inspection completed notification created successfully: ${notificationId}`)
          console.log(`   Notification sent to accounting_responsible (employee_id): ${existing.accounting_responsible}`)
        } else {
          console.log(`⚠️ Tax inspection completed notification creation returned null (may already exist as unread or no user found)`)
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating tax inspection completed notification (non-critical):', notificationError)
        // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
      }
    } else {
      console.log('ℹ️ No tax inspection completed notification needed:', {
        isTaxInspector,
        isNotPendingNow,
        hasAccountingResponsible: !!existing.accounting_responsible,
        isSamePerson,
        accounting_responsible_employee_id: existing.accounting_responsible,
        tax_inspection_responsible_employee_id: existing.tax_inspection_responsible,
        current_user_employee_id: userEmployeeId,
        existingPndStatus,
        pnd_status,
        reason: !isTaxInspector ? 'user is not tax_inspection_responsible' : !isNotPendingNow ? 'status is pending_review or pending_recheck' : !existing.accounting_responsible ? 'no accounting_responsible' : isSamePerson ? 'accounting_responsible and tax_inspection_responsible are the same person' : 'unknown',
      })
    }

    // Check if status changed to "sent_to_customer" (ส่งลูกค้าแล้ว)
    // ⚠️ สำคัญ: สร้าง notification เมื่อสถานะเปลี่ยนเป็น "ส่งลูกค้าแล้ว"
    // เพื่อแจ้งผู้ทำบัญชี (accounting_responsible) ให้ทราบ
    const isPndSentToCustomer = pnd_status === 'sent_to_customer'
    const isPp30SentToCustomer = pp30_status === 'sent_to_customer'
    const wasPndSentToCustomerBefore = existingPndStatus === 'sent_to_customer'
    const wasPp30SentToCustomerBefore = existing.pp30_form === 'sent_to_customer'

    console.log('🔔 Sent to Customer Notification check:', {
      isPndSentToCustomer,
      isPp30SentToCustomer,
      wasPndSentToCustomerBefore,
      wasPp30SentToCustomerBefore,
      accounting_responsible: existing.accounting_responsible,
      userEmployeeId,
    })

    // สร้าง notification สำหรับ PND ถ้าสถานะเปลี่ยนเป็น "ส่งลูกค้าแล้ว" และมี accounting_responsible
    if (isPndSentToCustomer && !wasPndSentToCustomerBefore && existing.accounting_responsible) {
      console.log(`📢 Attempting to create sent_to_customer notification for PND`)
      try {
        const notificationId = await createSentToCustomerNotification(
          existing.accounting_responsible,
          'pnd',
          existing.build,
          companyName,
          existing.tax_year,
          existing.tax_month,
          id,
          req.user.id
        )
        if (notificationId) {
          console.log(`✅ PND sent_to_customer notification created successfully: ${notificationId}`)
        } else {
          console.log(`⚠️ PND sent_to_customer notification creation returned null`)
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating PND sent_to_customer notification (non-critical):', notificationError)
      }
    }

    // สร้าง notification สำหรับ PP30 ถ้าสถานะเปลี่ยนเป็น "ส่งลูกค้าแล้ว" และมี accounting_responsible
    if (isPp30SentToCustomer && !wasPp30SentToCustomerBefore && existing.accounting_responsible) {
      console.log(`📢 Attempting to create sent_to_customer notification for PP30`)
      try {
        const notificationId = await createSentToCustomerNotification(
          existing.accounting_responsible,
          'pp30',
          existing.build,
          companyName,
          existing.tax_year,
          existing.tax_month,
          id,
          req.user.id
        )
        if (notificationId) {
          console.log(`✅ PP30 sent_to_customer notification created successfully: ${notificationId}`)
        } else {
          console.log(`⚠️ PP30 sent_to_customer notification creation returned null`)
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating PP30 sent_to_customer notification (non-critical):', notificationError)
      }
    }

    // Get updated data (include new status and attachment_count columns)
    // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ในการ query updatedData ทำให้ response fail
    // เพราะข้อมูลถูกบันทึกสำเร็จแล้ว (UPDATE query สำเร็จแล้ว)
    let updatedData = null
    let responseData = null

    try {
      const [fetchedData] = await pool.execute(
        `SELECT 
          mtd.id,
          mtd.build,
          c.company_name,
          mtd.tax_year,
          mtd.tax_month,
          mtd.accounting_responsible,
          e1.full_name as accounting_responsible_name,
          e1.first_name as accounting_responsible_first_name,
          e1.nick_name as accounting_responsible_nick_name,
          mtd.tax_inspection_responsible,
          e2.full_name as tax_inspection_responsible_name,
          e2.first_name as tax_inspection_responsible_first_name,
          e2.nick_name as tax_inspection_responsible_nick_name,
          mtd.document_received_date,
          mtd.bank_statement_status,
          mtd.pnd_sent_for_review_date,
          mtd.pnd_review_returned_date,
          mtd.pnd_sent_to_customer_date,
          mtd.pnd_status,
          mtd.pnd_1_40_1_status,
          mtd.pnd_1_40_2_status,
          mtd.pnd_3_status,
          mtd.pnd_53_status,
          mtd.pp_36_status,
          mtd.student_loan_form_status,
          mtd.pnd_2_status,
          mtd.pnd_54_status,
          mtd.pt_40_status,
          mtd.social_security_form_status,
          mtd.pnd_1_40_1_attachment_count,
          mtd.pnd_1_40_2_attachment_count,
          mtd.pnd_3_attachment_count,
          mtd.pnd_53_attachment_count,
          mtd.pp_36_attachment_count,
          mtd.student_loan_form_attachment_count,
          mtd.pnd_2_attachment_count,
          mtd.pnd_54_attachment_count,
          mtd.pt_40_attachment_count,
          mtd.social_security_form_attachment_count,
          mtd.accounting_record_status,
          mtd.monthly_tax_impact,
          mtd.bank_impact,
          mtd.wht_draft_completed_date,
          mtd.wht_filer_employee_id,
          e3.full_name as wht_filer_employee_name,
          e3.first_name as wht_filer_employee_first_name,
          e3.nick_name as wht_filer_employee_nick_name,
          mtd.wht_filer_current_employee_id,
          e4.full_name as wht_filer_current_employee_name,
          e4.first_name as wht_filer_current_employee_first_name,
          e4.nick_name as wht_filer_current_employee_nick_name,
          mtd.wht_inquiry,
          mtd.wht_response,
          mtd.wht_submission_comment,
          mtd.wht_filing_response,
          mtd.pp30_sent_for_review_date,
          mtd.pp30_review_returned_date,
          mtd.pp30_sent_to_customer_date,
          mtd.pp30_form,
          mtd.purchase_document_count,
          mtd.income_confirmed,
          ${paymentColumns}
          mtd.vat_draft_completed_date,
          mtd.vat_filer_employee_id,
          e5.full_name as vat_filer_employee_name,
          e5.first_name as vat_filer_employee_first_name,
          e5.nick_name as vat_filer_employee_nick_name,
          mtd.vat_filer_current_employee_id,
          e6.full_name as vat_filer_current_employee_name,
          e6.first_name as vat_filer_current_employee_first_name,
          e6.nick_name as vat_filer_current_employee_nick_name,
          mtd.pp30_inquiry,
          mtd.pp30_response,
          mtd.pp30_submission_comment,
          mtd.pp30_filing_response,
          mtd.document_entry_responsible,
          e7.full_name as document_entry_responsible_name,
          e7.first_name as document_entry_responsible_first_name,
          e7.nick_name as document_entry_responsible_nick_name,
          mtd.created_at,
          mtd.updated_at
        FROM monthly_tax_data mtd
        LEFT JOIN clients c ON mtd.build = c.build AND c.deleted_at IS NULL
        LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
        LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
        LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
        LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
        LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
        LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
        LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
        WHERE mtd.id = ?`,
        [id]
      )
      updatedData = fetchedData
    } catch (queryError) {
      console.error('⚠️ Error querying updated data (non-critical, data was saved successfully):', queryError)
      console.error('⚠️ Query error details:', {
        message: queryError.message,
        code: queryError.code,
        sqlState: queryError.sqlState,
        sql: queryError.sql,
      })
      // ⚠️ สำคัญ: ถ้า query error แต่ UPDATE สำเร็จแล้ว ให้ใช้ข้อมูลจาก existing + updated fields
      // เพื่อสร้าง response data แบบง่ายๆ (ไม่มี employee names)
      console.log('⚠️ Using existing data + updated fields for response')

      // ⚠️ สำคัญ: ตรวจสอบว่า companyName มีอยู่จริง (อาจเป็น undefined ถ้า query company name error)
      const fallbackCompanyName = companyName || existing.build || 'Unknown'

      updatedData = [{
        ...existing,
        // อัพเดท fields ที่ถูก update
        pnd_status: pnd_status !== undefined ? pnd_status : existing.pnd_status,
        wht_draft_completed_date: finalWhtDraftCompletedDate !== undefined && finalWhtDraftCompletedDate !== null ? finalWhtDraftCompletedDate : existing.wht_draft_completed_date,
        pp30_form: computedPp30Form !== undefined ? computedPp30Form : existing.pp30_form,
        pp30_sent_for_review_date: computedPp30SentForReviewDate !== undefined ? computedPp30SentForReviewDate : existing.pp30_sent_for_review_date,
        pp30_review_returned_date: computedPp30ReviewReturnedDate !== undefined ? computedPp30ReviewReturnedDate : existing.pp30_review_returned_date,
        // ✅ BUG-XXX: เมื่อสถานะเป็น "ชำระแล้ว" (paid) หรือ "ร่างแบบเสร็จแล้ว" (draft_completed) ใช้ค่าเดิมจากฐานข้อมูลเมื่อ computedPp30SentToCustomerDate เป็น undefined
        pp30_sent_to_customer_date: computedPp30SentToCustomerDate !== undefined ? computedPp30SentToCustomerDate : (existing.pp30_sent_to_customer_date !== undefined ? existing.pp30_sent_to_customer_date : null),
        vat_draft_completed_date: computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : existing.vat_draft_completed_date,
        pp30_filing_response: computedPp30FilingResponse !== undefined ? computedPp30FilingResponse : existing.pp30_filing_response,
        company_name: fallbackCompanyName, // ใช้ fallback ถ้า companyName เป็น undefined
        // ตั้งค่า employee names เป็น null (ไม่มีข้อมูลจาก JOIN)
        accounting_responsible_name: null,
        accounting_responsible_first_name: null,
        accounting_responsible_nick_name: null,
        tax_inspection_responsible_name: null,
        tax_inspection_responsible_first_name: null,
        tax_inspection_responsible_nick_name: null,
        wht_filer_employee_name: null,
        wht_filer_employee_first_name: null,
        wht_filer_employee_nick_name: null,
        wht_filer_current_employee_name: null,
        wht_filer_current_employee_first_name: null,
        wht_filer_current_employee_nick_name: null,
        vat_filer_employee_name: null,
        vat_filer_employee_first_name: null,
        vat_filer_employee_nick_name: null,
        vat_filer_current_employee_name: null,
        vat_filer_current_employee_first_name: null,
        vat_filer_current_employee_nick_name: null,
        document_entry_responsible_name: null,
        document_entry_responsible_first_name: null,
        document_entry_responsible_nick_name: null,
      }]
    }

    // Mark notifications as read when user views tax data
    // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน notification marking ทำให้ response fail
    // เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
    try {
      await markTaxReviewNotificationsAsRead(id, req.user.id)
    } catch (notificationError) {
      console.error('⚠️ Error marking notifications as read (non-critical):', notificationError)
      // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
    }

    // ⚠️ สำคัญ: หลัง migration 028, pp30_form เก็บสถานะโดยตรง — ใช้เป็น pp30_status ใน response
    // ⚠️ สำคัญ: ตรวจสอบว่า updatedData[0] มีอยู่จริงก่อนเรียก derivePp30StatusFromRow
    // ถ้าไม่มี ให้สร้าง fallback response จาก existing data
    if (!updatedData || !updatedData[0]) {
      console.error('❌ [Backend] updatedData is empty or null! Creating fallback response...', {
        updatedData,
        updatedDataLength: updatedData?.length,
        existing: existing ? { build: existing.build, id: existing.id } : null,
      })

      // สร้าง fallback response จาก existing data + updated fields
      const fallbackCompanyName = companyName || existing?.build || 'Unknown'
      updatedData = [{
        ...existing,
        pnd_status: pnd_status !== undefined ? pnd_status : existing?.pnd_status,
        wht_draft_completed_date: finalWhtDraftCompletedDate !== undefined && finalWhtDraftCompletedDate !== null ? finalWhtDraftCompletedDate : existing?.wht_draft_completed_date,
        pp30_form: computedPp30Form !== undefined ? computedPp30Form : existing?.pp30_form,
        pp30_sent_for_review_date: computedPp30SentForReviewDate !== undefined ? computedPp30SentForReviewDate : existing?.pp30_sent_for_review_date,
        pp30_review_returned_date: computedPp30ReviewReturnedDate !== undefined ? computedPp30ReviewReturnedDate : existing?.pp30_review_returned_date,
        // ✅ BUG-XXX: เมื่อสถานะเป็น "ชำระแล้ว" (paid) หรือ "ร่างแบบเสร็จแล้ว" (draft_completed) ใช้ค่าเดิมจากฐานข้อมูลเมื่อ computedPp30SentToCustomerDate เป็น undefined
        pp30_sent_to_customer_date: computedPp30SentToCustomerDate !== undefined ? computedPp30SentToCustomerDate : (existing?.pp30_sent_to_customer_date !== undefined ? existing.pp30_sent_to_customer_date : null),
        vat_draft_completed_date: computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : existing?.vat_draft_completed_date,
        pp30_filing_response: computedPp30FilingResponse !== undefined ? computedPp30FilingResponse : existing?.pp30_filing_response,
        company_name: fallbackCompanyName,
        // ตั้งค่า employee names เป็น null (ไม่มีข้อมูลจาก JOIN)
        accounting_responsible_name: null,
        tax_inspection_responsible_name: null,
        wht_filer_employee_name: null,
        vat_filer_employee_name: null,
        document_entry_responsible_name: null,
      }]

      console.log('✅ [Backend] Fallback response data created:', {
        build: updatedData[0]?.build,
        pnd_status: updatedData[0]?.pnd_status,
      })
    }

    const pp30StatusFromForm = updatedData[0]?.pp30_form && String(updatedData[0].pp30_form).trim() !== '' && updatedData[0].pp30_form !== '0' && updatedData[0].pp30_form !== '1' && updatedData[0].pp30_form !== 0 && updatedData[0].pp30_form !== 1
      ? String(updatedData[0].pp30_form).trim()
      : (pp30_status || derivePp30StatusFromRow(updatedData[0]))

    // ⚠️ สำคัญ: ตรวจสอบว่า updatedData[0] มีอยู่จริงก่อนสร้าง response
    if (!updatedData || !updatedData[0]) {
      console.error('❌ [Backend] updatedData is empty or null after all attempts!', {
        updatedData,
        updatedDataLength: updatedData?.length,
        existingData: existing ? { build: existing.build, id: existing.id } : null,
      })
      // สร้าง fallback response จาก existing data + updated fields
      responseData = {
        ...existing,
        pnd_status: pnd_status !== undefined ? pnd_status : existing.pnd_status,
        wht_draft_completed_date: finalWhtDraftCompletedDate !== undefined && finalWhtDraftCompletedDate !== null ? finalWhtDraftCompletedDate : existing.wht_draft_completed_date,
        pp30_form: computedPp30Form !== undefined ? computedPp30Form : existing.pp30_form,
        pp30_sent_for_review_date: computedPp30SentForReviewDate !== undefined ? computedPp30SentForReviewDate : existing.pp30_sent_for_review_date,
        pp30_review_returned_date: computedPp30ReviewReturnedDate !== undefined ? computedPp30ReviewReturnedDate : existing.pp30_review_returned_date,
        // ✅ BUG-XXX: เมื่อสถานะเป็น "ชำระแล้ว" (paid) หรือ "ร่างแบบเสร็จแล้ว" (draft_completed) ใช้ค่าเดิมจากฐานข้อมูลเมื่อ computedPp30SentToCustomerDate เป็น undefined
        pp30_sent_to_customer_date: computedPp30SentToCustomerDate !== undefined ? computedPp30SentToCustomerDate : (existing.pp30_sent_to_customer_date !== undefined ? existing.pp30_sent_to_customer_date : null),
        vat_draft_completed_date: computedVatDraftCompletedDate !== undefined ? computedVatDraftCompletedDate : existing.vat_draft_completed_date,
        pp30_filing_response: computedPp30FilingResponse !== undefined ? computedPp30FilingResponse : existing.pp30_filing_response,
        company_name: companyName,
        pp30_status: pp30_status || derivePp30StatusFromRow(existing) || null,
      }
    } else {
      console.log('📤 Sending response:', {
        hasData: !!updatedData[0],
        dataKeys: updatedData[0] ? Object.keys(updatedData[0]).length : 0,
        id: updatedData[0]?.id,
        build: updatedData[0]?.build,
        pnd_status: updatedData[0]?.pnd_status,
        // 🔍 Debug: Log PP30 related fields
        pp30_status: pp30StatusFromForm, // จาก pp30_form หรือ derive
        pp30_form: updatedData[0]?.pp30_form, // ⚠️ สำคัญ: ส่ง pp30_form กลับมาด้วย
        vat_draft_completed_date: updatedData[0]?.vat_draft_completed_date,
        pp30_sent_to_customer_date: updatedData[0]?.pp30_sent_to_customer_date,
        pp30_review_returned_date: updatedData[0]?.pp30_review_returned_date,
        pp30_sent_for_review_date: updatedData[0]?.pp30_sent_for_review_date,
        pp30_filing_response: updatedData[0]?.pp30_filing_response,
      })
      responseData = {
        ...updatedData[0],
        pp30_status: pp30StatusFromForm || null,
        // ⚠️ สำคัญ: ส่ง pp30_form กลับมาด้วยเพื่อให้ frontend cache มีข้อมูลครบถ้วน
        // ถ้า pp30_form ไม่มีค่า ให้ใช้ pp30StatusFromForm เป็น fallback
        pp30_form: updatedData[0]?.pp30_form && String(updatedData[0].pp30_form).trim() !== '' && updatedData[0].pp30_form !== '0' && updatedData[0].pp30_form !== '1' && updatedData[0].pp30_form !== 0 && updatedData[0].pp30_form !== 1
          ? String(updatedData[0].pp30_form).trim()
          : (pp30StatusFromForm || null),
        // ✅ BUG-XXX: Format date fields เพื่อป้องกันการแสดงผลผิดพลาด (แปลง Date object เป็น string)
        document_received_date: formatDateForResponse(updatedData[0]?.document_received_date, 'document_received_date'),
        pnd_sent_for_review_date: formatDateForResponse(updatedData[0]?.pnd_sent_for_review_date, 'pnd_sent_for_review_date'),
        pnd_review_returned_date: formatDateForResponse(updatedData[0]?.pnd_review_returned_date, 'pnd_review_returned_date'),
        pnd_sent_to_customer_date: formatDateForResponse(updatedData[0]?.pnd_sent_to_customer_date, 'pnd_sent_to_customer_date'),
        wht_draft_completed_date: formatDateForResponse(updatedData[0]?.wht_draft_completed_date, 'wht_draft_completed_date'),
        pp30_sent_for_review_date: formatDateForResponse(updatedData[0]?.pp30_sent_for_review_date, 'pp30_sent_for_review_date'),
        pp30_review_returned_date: formatDateForResponse(updatedData[0]?.pp30_review_returned_date, 'pp30_review_returned_date'),
        pp30_sent_to_customer_date: formatDateForResponse(updatedData[0]?.pp30_sent_to_customer_date, 'pp30_sent_to_customer_date'),
        vat_draft_completed_date: formatDateForResponse(updatedData[0]?.vat_draft_completed_date, 'vat_draft_completed_date'),
      }
    }

    // ✅ Performance Optimization: Invalidate cache after updating data
    // Invalidate ทั้ง list, detail, และ summary endpoints
    // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน cache invalidation ทำให้ response fail
    try {
      invalidateCache('GET:/monthly-tax-data')
      invalidateCache('GET:/monthly-tax-data/summary')
      // Invalidate detail endpoint ด้วย (ถ้ามี build, year, month)
      if (responseData.build && responseData.tax_year && responseData.tax_month) {
        invalidateCache(`GET:/monthly-tax-data/${responseData.build}`)
      }
      // Invalidate by ID endpoint
      if (responseData.id) {
        invalidateCache(`GET:/monthly-tax-data/${responseData.id}`)
      }
    } catch (cacheError) {
      console.error('⚠️ Error invalidating cache (non-critical):', cacheError)
      // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
    }

    // 🔌 WebSocket: Emit real-time update event to responsible employees
    // ⚠️ สำคัญ: ใช้ try-catch เพื่อไม่ให้ error ใน WebSocket emit ทำให้ response fail
    try {
      const io = req.app.get('io')
      if (io && responseData) {
        // Collect all responsible employee IDs
        const responsibleEmployeeIds = [
          responseData.accounting_responsible,
          responseData.tax_inspection_responsible,
          responseData.wht_filer_current_employee_id,
          responseData.vat_filer_current_employee_id,
          responseData.document_entry_responsible,
        ].filter(Boolean) // Remove null/undefined values

        if (responsibleEmployeeIds.length > 0) {
          // 🔍 Debug: Log pp30_form before emitting WebSocket event
          console.log('📤 [WebSocket] Preparing to emit monthly-tax-data:updated event', {
            build: responseData.build,
            id: responseData.id,
            employeeIds: responsibleEmployeeIds,
            pp30_form: responseData.pp30_form,
            pp30_status: responseData.pp30_status,
            pp30_sent_to_customer_date: responseData.pp30_sent_to_customer_date,
            pp30_review_returned_date: responseData.pp30_review_returned_date,
            pp30_sent_for_review_date: responseData.pp30_sent_for_review_date,
            vat_draft_completed_date: responseData.vat_draft_completed_date,
          })
          emitMonthlyTaxDataUpdate(io, responseData, responsibleEmployeeIds)
          console.log('📤 [WebSocket] Emitted monthly-tax-data:updated event', {
            build: responseData.build,
            id: responseData.id,
            employeeIds: responsibleEmployeeIds,
            pp30_form: responseData.pp30_form, // ⚠️ สำคัญ: เพิ่ม logging สำหรับ pp30_form
            pp30_status: responseData.pp30_status,
          })
        }
      }
    } catch (socketError) {
      console.error('⚠️ Error emitting WebSocket event (non-critical):', socketError)
      // ไม่ throw error เพราะข้อมูลถูกบันทึกสำเร็จแล้ว
    }

    res.json({
      success: true,
      message: 'Monthly tax data updated successfully',
      data: responseData,
    })
  } catch (error) {
    console.error('Update monthly tax data error:', error)
    console.error('Error details:', {
      code: error.code,
      sqlState: error.sqlState,
      message: error.message,
      sql: error.sql,
    })

    // Provide more detailed error message for debugging
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_UNKNOWN_COLUMN') {
      // Check which migration might be missing based on error message
      let migrationMessage = 'Database columns not found. Please run migrations:'
      if (error.message && error.message.includes('pnd_1_40_1_status') || error.message.includes('attachment_count')) {
        migrationMessage += ' 021_add_tax_form_status_and_attachment_count.sql'
      }
      if (error.message && error.message.includes('tax_inspection_completed')) {
        migrationMessage += ' 024_add_tax_inspection_completed_notification_type.sql'
      }
      if (error.message && (error.message.includes('pnd_1_40_1') || error.message.includes('pnd_1_40_2'))) {
        migrationMessage += ' (Note: Boolean fields were removed in migration 023)'
      }

      return res.status(500).json({
        success: false,
        message: migrationMessage,
        error: error.message,
        errorCode: error.code,
      })
    }

    if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_SYNTAX_ERROR') {
      return res.status(500).json({
        success: false,
        message: 'SQL syntax error',
        error: error.message,
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

export default router
