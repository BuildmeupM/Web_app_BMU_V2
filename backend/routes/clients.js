/**
 * Clients Routes
 * Routes สำหรับการจัดการข้อมูลลูกค้า (Workflow System)
 */

import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { generateUUID } from '../utils/leaveHelpers.js'
import { invalidateCache } from '../middleware/cache.js'

const router = express.Router()

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'), false)
    }
  },
})

/**
 * Helper function to pad Build Code with leading zeros
 * Excel converts "001" to number 1, so we need to pad it back to 3 digits
 * Note: Only pad if it's a pure number (no decimals or other characters)
 * @param {string|number} value - Build Code value from Excel
 * @returns {string} - Padded Build Code (minimum 3 digits for pure numbers)
 */
function padBuildCode(value) {
  if (!value && value !== 0) return ''
  const str = String(value).trim()
  // If it contains decimal point or other non-digit characters, don't pad
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to minimum 3 digits for pure numbers
  return str.padStart(3, '0')
}

/**
 * Helper function to validate Build Code format
 * Build Code can be:
 * - Pure numbers: at least 3 digits (e.g., 001, 122, 375)
 * - Numbers with decimal: at least 3 characters total (e.g., 122.1, 214.2)
 * - Maximum 10 characters (database VARCHAR(10))
 * @param {string} value - Build Code value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidBuildCode(value) {
  if (!value) return false
  const str = String(value).trim()
  // Must be at least 3 characters and max 10 characters
  if (str.length < 3 || str.length > 10) return false
  // Allow digits and decimal point (e.g., 122.1, 214.2)
  // Must start with digit, can have one decimal point followed by digits
  return /^\d{3,}(\.[\d]+)?$/.test(str)
}

/**
 * Helper function to pad Legal Entity Number with leading zeros
 * Excel converts "0105564065416" to number 105564065416, so we need to pad it back to 13 digits
 * @param {string|number} value - Legal Entity Number value from Excel
 * @returns {string} - Padded Legal Entity Number (13 digits)
 */
function padLegalEntityNumber(value) {
  if (!value && value !== 0) return ''
  const str = String(value).replace(/-/g, '').trim()
  // Check if it's a valid number
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to 13 digits
  return str.padStart(13, '0')
}

/**
 * GET /api/clients/dashboard
 * ดึงข้อมูลรวมสำหรับ Client Dashboard (สถานะ, ประเภท, จังหวัด, ฯลฯ)
 * Access: All authenticated users
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Parse optional status filter
    const statusFilter = req.query.statuses ? String(req.query.statuses).split(',').filter(Boolean) : []
    let statusCondition = ''
    const statusParams = []
    if (statusFilter.length > 0) {
      statusCondition = ` AND company_status IN (${statusFilter.map(() => '?').join(',')})`
      statusParams.push(...statusFilter)
    }

    // 1. Total clients
    const [totalResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM clients WHERE deleted_at IS NULL${statusCondition}`,
      statusParams
    )
    const total = Number(totalResult[0]?.total) || 0

    // 2. By company_status (always unfiltered to show all status options)
    const [byCompanyStatus] = await pool.execute(
      `SELECT company_status, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL
       GROUP BY company_status
       ORDER BY count DESC`
    )

    // 3. By business_type
    const [byBusinessType] = await pool.execute(
      `SELECT COALESCE(business_type, 'ไม่ระบุ') as business_type, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY business_type
       ORDER BY count DESC`,
      statusParams
    )

    // 4. By tax_registration_status
    const [byTaxRegistrationStatus] = await pool.execute(
      `SELECT COALESCE(tax_registration_status, 'ไม่ระบุ') as tax_registration_status, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY tax_registration_status
       ORDER BY count DESC`,
      statusParams
    )

    // 5. By province
    const [byProvince] = await pool.execute(
      `SELECT COALESCE(province, 'ไม่ระบุ') as province, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY province
       ORDER BY count DESC`,
      statusParams
    )

    // 6. By company_size
    const [byCompanySize] = await pool.execute(
      `SELECT COALESCE(company_size, 'ไม่ระบุ') as company_size, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY company_size
       ORDER BY count DESC`,
      statusParams
    )

    // 7. By business_category
    const [byBusinessCategory] = await pool.execute(
      `SELECT COALESCE(business_category, 'ไม่ระบุ') as business_category, COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY business_category
       ORDER BY count DESC
       LIMIT 20`,
      statusParams
    )

    // 8. By business_subcategory (grouped with category)
    const [byBusinessSubcategory] = await pool.execute(
      `SELECT COALESCE(business_category, 'ไม่ระบุ') as business_category,
              COALESCE(business_subcategory, 'ไม่ระบุ') as business_subcategory,
              COUNT(*) as count
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       GROUP BY business_category, business_subcategory
       ORDER BY business_category ASC, count DESC`,
      statusParams
    )

    // 9. Recent clients (latest 10)
    const [recentClients] = await pool.execute(
      `SELECT build, company_name, company_status, province, business_type, created_at
       FROM clients WHERE deleted_at IS NULL${statusCondition}
       ORDER BY created_at DESC
       LIMIT 10`,
      statusParams
    )

    res.json({
      success: true,
      data: {
        total,
        byCompanyStatus: byCompanyStatus.map(r => ({ ...r, count: Number(r.count) })),
        byBusinessType: byBusinessType.map(r => ({ ...r, count: Number(r.count) })),
        byTaxRegistrationStatus: byTaxRegistrationStatus.map(r => ({ ...r, count: Number(r.count) })),
        byProvince: byProvince.map(r => ({ ...r, count: Number(r.count) })),
        byCompanySize: byCompanySize.map(r => ({ ...r, count: Number(r.count) })),
        byBusinessCategory: byBusinessCategory.map(r => ({ ...r, count: Number(r.count) })),
        byBusinessSubcategory: byBusinessSubcategory.map(r => ({ ...r, count: Number(r.count) })),
        recentClients,
      },
    })
  } catch (error) {
    console.error('Get client dashboard error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/province-clients
 * ดึงรายชื่อลูกค้าในจังหวัดที่เลือก (สำหรับ drill-down)
 * Access: All authenticated users
 */
router.get('/province-clients', authenticateToken, async (req, res) => {
  try {
    const { province } = req.query

    if (!province) {
      return res.status(400).json({ success: false, message: 'Province parameter is required' })
    }

    let query, params
    if (province === 'ไม่ระบุ') {
      query = `SELECT build, company_name, company_status, business_type, tax_registration_status, province
               FROM clients WHERE deleted_at IS NULL AND (province IS NULL OR province = '')
               ORDER BY build ASC`
      params = []
    } else {
      query = `SELECT build, company_name, company_status, business_type, tax_registration_status, province
               FROM clients WHERE deleted_at IS NULL AND province = ?
               ORDER BY build ASC`
      params = [province]
    }

    const [clients] = await pool.execute(query, params)

    res.json({
      success: true,
      data: clients,
    })
  } catch (error) {
    console.error('Get province clients error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/province-districts
 * ดึงจำนวนลูกค้าแยกตามเขต/อำเภอ ในจังหวัดที่เลือก (สำหรับ district map drill-down)
 * Access: All authenticated users
 */
router.get('/province-districts', authenticateToken, async (req, res) => {
  try {
    const { province } = req.query

    if (!province) {
      return res.status(400).json({ success: false, message: 'Province parameter is required' })
    }

    // Get district breakdown
    const [districtCounts] = await pool.execute(
      `SELECT COALESCE(district, 'ไม่ระบุ') as district, COUNT(*) as count
       FROM clients
       WHERE deleted_at IS NULL AND province = ?
       GROUP BY district
       ORDER BY count DESC`,
      [province]
    )

    // Get clients with district info for this province
    const [clients] = await pool.execute(
      `SELECT build, company_name, company_status, business_type,
              tax_registration_status, COALESCE(district, 'ไม่ระบุ') as district
       FROM clients
       WHERE deleted_at IS NULL AND province = ?
       ORDER BY district ASC, build ASC`,
      [province]
    )

    res.json({
      success: true,
      data: {
        province,
        districtCounts: districtCounts.map(r => ({ ...r, count: Number(r.count) })),
        clients,
      },
    })
  } catch (error) {
    console.error('Get province districts error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/accounting-fees-dashboard
 * ดึงข้อมูลสรุปค่าทำบัญชีสำหรับ Dashboard
 * Access: All authenticated users
 */
router.get('/accounting-fees-dashboard', authenticateToken, async (req, res) => {
  try {
    const { fee_year } = req.query
    const currentYear = fee_year || new Date().getFullYear()

    // 1. Get total clients with monthly statuses
    const [statusCounts] = await pool.execute(
      `SELECT company_status, COUNT(*) as count 
       FROM clients WHERE deleted_at IS NULL 
       AND company_status LIKE '%รายเดือน%'
       GROUP BY company_status`
    )

    // 2. Get tax registration status counts  
    const [taxCounts] = await pool.execute(
      `SELECT tax_registration_status, COUNT(*) as count 
       FROM clients WHERE deleted_at IS NULL 
       AND company_status LIKE '%รายเดือน%'
       GROUP BY tax_registration_status`
    )

    // 3. Get monthly fee totals for the year
    const [monthlyTotals] = await pool.execute(
      `SELECT 
        COALESCE(SUM(accounting_fee_jan), 0) as acc_jan, COALESCE(SUM(accounting_fee_feb), 0) as acc_feb,
        COALESCE(SUM(accounting_fee_mar), 0) as acc_mar, COALESCE(SUM(accounting_fee_apr), 0) as acc_apr,
        COALESCE(SUM(accounting_fee_may), 0) as acc_may, COALESCE(SUM(accounting_fee_jun), 0) as acc_jun,
        COALESCE(SUM(accounting_fee_jul), 0) as acc_jul, COALESCE(SUM(accounting_fee_aug), 0) as acc_aug,
        COALESCE(SUM(accounting_fee_sep), 0) as acc_sep, COALESCE(SUM(accounting_fee_oct), 0) as acc_oct,
        COALESCE(SUM(accounting_fee_nov), 0) as acc_nov, COALESCE(SUM(accounting_fee_dec), 0) as acc_dec,
        COALESCE(SUM(hr_fee_jan), 0) as hr_jan, COALESCE(SUM(hr_fee_feb), 0) as hr_feb,
        COALESCE(SUM(hr_fee_mar), 0) as hr_mar, COALESCE(SUM(hr_fee_apr), 0) as hr_apr,
        COALESCE(SUM(hr_fee_may), 0) as hr_may, COALESCE(SUM(hr_fee_jun), 0) as hr_jun,
        COALESCE(SUM(hr_fee_jul), 0) as hr_jul, COALESCE(SUM(hr_fee_aug), 0) as hr_aug,
        COALESCE(SUM(hr_fee_sep), 0) as hr_sep, COALESCE(SUM(hr_fee_oct), 0) as hr_oct,
        COALESCE(SUM(hr_fee_nov), 0) as hr_nov, COALESCE(SUM(hr_fee_dec), 0) as hr_dec,
        COUNT(*) as total_with_fees
       FROM accounting_fees af
       INNER JOIN clients c ON af.build = c.build AND c.deleted_at IS NULL
       WHERE af.fee_year = ? AND af.deleted_at IS NULL`,
      [currentYear]
    )

    // 4. Get total clients with "รายเดือน" statuses
    const [totalMonthly] = await pool.execute(
      `SELECT COUNT(*) as total FROM clients WHERE deleted_at IS NULL AND company_status LIKE '%รายเดือน%'`
    )

    // 5. Count clients that have fee data for this year
    const [clientsWithFees] = await pool.execute(
      `SELECT COUNT(DISTINCT af.build) as count 
       FROM accounting_fees af
       INNER JOIN clients c ON af.build = c.build AND c.deleted_at IS NULL AND c.company_status LIKE '%รายเดือน%'
       WHERE af.fee_year = ? AND af.deleted_at IS NULL`,
      [currentYear]
    )

    // 6. Top 10 clients by total fees
    const [topClients] = await pool.execute(
      `SELECT af.build, c.company_name,
        (COALESCE(af.accounting_fee_jan,0) + COALESCE(af.accounting_fee_feb,0) + COALESCE(af.accounting_fee_mar,0) +
         COALESCE(af.accounting_fee_apr,0) + COALESCE(af.accounting_fee_may,0) + COALESCE(af.accounting_fee_jun,0) +
         COALESCE(af.accounting_fee_jul,0) + COALESCE(af.accounting_fee_aug,0) + COALESCE(af.accounting_fee_sep,0) +
         COALESCE(af.accounting_fee_oct,0) + COALESCE(af.accounting_fee_nov,0) + COALESCE(af.accounting_fee_dec,0)) as total_accounting,
        (COALESCE(af.hr_fee_jan,0) + COALESCE(af.hr_fee_feb,0) + COALESCE(af.hr_fee_mar,0) +
         COALESCE(af.hr_fee_apr,0) + COALESCE(af.hr_fee_may,0) + COALESCE(af.hr_fee_jun,0) +
         COALESCE(af.hr_fee_jul,0) + COALESCE(af.hr_fee_aug,0) + COALESCE(af.hr_fee_sep,0) +
         COALESCE(af.hr_fee_oct,0) + COALESCE(af.hr_fee_nov,0) + COALESCE(af.hr_fee_dec,0)) as total_hr
       FROM accounting_fees af
       INNER JOIN clients c ON af.build = c.build AND c.deleted_at IS NULL
       WHERE af.fee_year = ? AND af.deleted_at IS NULL
       ORDER BY total_accounting DESC
       LIMIT 10`,
      [currentYear]
    )

    const totals = monthlyTotals[0] || {}

    res.json({
      success: true,
      data: {
        fee_year: parseInt(currentYear),
        totalMonthlyClients: Number(totalMonthly[0]?.total) || 0,
        clientsWithFees: Number(clientsWithFees[0]?.count) || 0,
        statusBreakdown: statusCounts.map(s => ({ ...s, count: Number(s.count) })),
        taxStatusBreakdown: taxCounts.map(t => ({ ...t, count: Number(t.count) })),
        monthlyTotals: {
          accounting: [
            Number(totals.acc_jan) || 0, Number(totals.acc_feb) || 0, Number(totals.acc_mar) || 0, Number(totals.acc_apr) || 0,
            Number(totals.acc_may) || 0, Number(totals.acc_jun) || 0, Number(totals.acc_jul) || 0, Number(totals.acc_aug) || 0,
            Number(totals.acc_sep) || 0, Number(totals.acc_oct) || 0, Number(totals.acc_nov) || 0, Number(totals.acc_dec) || 0,
          ],
          hr: [
            Number(totals.hr_jan) || 0, Number(totals.hr_feb) || 0, Number(totals.hr_mar) || 0, Number(totals.hr_apr) || 0,
            Number(totals.hr_may) || 0, Number(totals.hr_jun) || 0, Number(totals.hr_jul) || 0, Number(totals.hr_aug) || 0,
            Number(totals.hr_sep) || 0, Number(totals.hr_oct) || 0, Number(totals.hr_nov) || 0, Number(totals.hr_dec) || 0,
          ],
        },
        topClients: topClients.map(c => ({
          ...c,
          total_accounting: Number(c.total_accounting) || 0,
          total_hr: Number(c.total_hr) || 0,
        })),
      },
    })
  } catch (error) {
    console.error('Get accounting fees dashboard error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/accounting-fees-compare
 * เปรียบเทียบค่าทำบัญชีระหว่าง 2 เดือน — แสดงข้อมูลรายบริษัท
 * Query params: fee_year, month_a (jan-dec), month_b (jan-dec)
 * Access: All authenticated users
 */
router.get('/accounting-fees-compare', authenticateToken, async (req, res) => {
  try {
    const { fee_year, month_a, month_b } = req.query
    const currentYear = fee_year || new Date().getFullYear()

    if (!month_a || !month_b) {
      return res.status(400).json({
        success: false,
        message: 'month_a and month_b are required (jan, feb, ... dec)',
      })
    }

    const accColA = `accounting_fee_${month_a}`
    const accColB = `accounting_fee_${month_b}`
    const hrColA = `hr_fee_${month_a}`
    const hrColB = `hr_fee_${month_b}`

    // Validate column names to prevent SQL injection
    const validMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    if (!validMonths.includes(month_a) || !validMonths.includes(month_b)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month key. Use: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec',
      })
    }

    const [rows] = await pool.execute(
      `SELECT 
        af.build, c.company_name, c.company_status, c.tax_registration_status,
        COALESCE(af.${accColA}, 0) as acc_month_a,
        COALESCE(af.${accColB}, 0) as acc_month_b,
        COALESCE(af.${hrColA}, 0) as hr_month_a,
        COALESCE(af.${hrColB}, 0) as hr_month_b
       FROM accounting_fees af
       INNER JOIN clients c ON af.build = c.build AND c.deleted_at IS NULL AND c.company_status LIKE '%รายเดือน%'
       WHERE af.fee_year = ? AND af.deleted_at IS NULL
       ORDER BY af.${accColA} DESC`,
      [currentYear]
    )

    // Calculate totals
    const totals = rows.reduce((acc, r) => ({
      acc_month_a: acc.acc_month_a + Number(r.acc_month_a),
      acc_month_b: acc.acc_month_b + Number(r.acc_month_b),
      hr_month_a: acc.hr_month_a + Number(r.hr_month_a),
      hr_month_b: acc.hr_month_b + Number(r.hr_month_b),
    }), { acc_month_a: 0, acc_month_b: 0, hr_month_a: 0, hr_month_b: 0 })

    res.json({
      success: true,
      data: {
        fee_year: parseInt(currentYear),
        month_a,
        month_b,
        clients: rows,
        totals,
      },
    })
  } catch (error) {
    console.error('Compare accounting fees error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/accounting-fees-export
 * ส่งออกข้อมูลสรุปยอดค่าทำบัญชี / ค่าบริการ HR เป็นไฟล์ Excel
 * Query params:
 *   - month (jan-dec) — เดือนที่ต้องการสรุป (required)
 *   - fee_year (optional, default ปีปัจจุบัน)
 *   - exempt_builds (optional, comma-separated build codes ที่ยกเว้น WHT)
 * Access: All authenticated users
 */
router.get('/accounting-fees-export', authenticateToken, async (req, res) => {
  try {
    const { month, fee_year, exempt_builds = '' } = req.query

    // Validate month
    const validMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    if (!month || !validMonths.includes(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing month. Use: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec',
      })
    }

    const currentYear = fee_year || new Date().getFullYear()
    const accCol = `accounting_fee_${month}`
    const hrCol = `hr_fee_${month}`

    // Parse exempt builds
    const exemptBuildsArray = exempt_builds
      ? exempt_builds.split(',').map(b => b.trim()).filter(Boolean)
      : []

    // Query data
    const [rows] = await pool.execute(
      `SELECT 
        af.build,
        c.company_name,
        c.company_status,
        c.tax_registration_status,
        COALESCE(af.${accCol}, 0) as accounting_fee,
        COALESCE(af.${hrCol}, 0) as hr_fee,
        af.accounting_fee_image_url
       FROM accounting_fees af
       INNER JOIN clients c ON af.build = c.build AND c.deleted_at IS NULL AND c.company_status LIKE '%รายเดือน%'
       WHERE af.fee_year = ? AND af.deleted_at IS NULL
       ORDER BY af.build ASC`,
      [currentYear]
    )

    // Month labels for display
    const monthLabels = {
      jan: 'มกราคม', feb: 'กุมภาพันธ์', mar: 'มีนาคม', apr: 'เมษายน',
      may: 'พฤษภาคม', jun: 'มิถุนายน', jul: 'กรกฎาคม', aug: 'สิงหาคม',
      sep: 'กันยายน', oct: 'ตุลาคม', nov: 'พฤศจิกายน', dec: 'ธันวาคม',
    }

    // Build Excel data
    const excelData = []

    // Header row
    excelData.push([
      'ลำดับ', 'Build', 'ชื่อบริษัท',
      'ค่าบริการบัญชี', 'VAT 7%', 'ยอดก่อนหัก', 'WHT 3%', 'ยอดสุทธิ(บัญชี)',
      'ค่าบริการ HR', 'VAT 7%', 'ยอดก่อนหัก', 'WHT 3%', 'ยอดสุทธิ(HR)',
      'ยอดสุทธิรวม', 'หมายเหตุ', 'ลิงค์รูปค่าทำบัญชี',
    ])

    // Totals accumulators
    let totalAccFee = 0, totalAccVat = 0, totalAccBeforeWht = 0, totalAccWht = 0, totalAccNet = 0
    let totalHrFee = 0, totalHrVat = 0, totalHrBeforeWht = 0, totalHrWht = 0, totalHrNet = 0
    let totalGrandNet = 0

    rows.forEach((row, index) => {
      const accFee = Number(row.accounting_fee) || 0
      const hrFee = Number(row.hr_fee) || 0
      const isExempt = exemptBuildsArray.includes(row.build)

      // Accounting fee calculations
      const accVat = Math.round(accFee * 0.07 * 100) / 100
      const accBeforeWht = accFee + accVat
      const accWht = isExempt ? 0 : Math.round(accFee * 0.03 * 100) / 100
      const accNet = accBeforeWht - accWht

      // HR fee calculations
      const hrVat = Math.round(hrFee * 0.07 * 100) / 100
      const hrBeforeWht = hrFee + hrVat
      const hrWht = isExempt ? 0 : Math.round(hrFee * 0.03 * 100) / 100
      const hrNet = hrBeforeWht - hrWht

      const grandNet = accNet + hrNet

      // Accumulate totals
      totalAccFee += accFee; totalAccVat += accVat; totalAccBeforeWht += accBeforeWht
      totalAccWht += accWht; totalAccNet += accNet
      totalHrFee += hrFee; totalHrVat += hrVat; totalHrBeforeWht += hrBeforeWht
      totalHrWht += hrWht; totalHrNet += hrNet
      totalGrandNet += grandNet

      excelData.push([
        index + 1,
        row.build,
        row.company_name,
        accFee, accVat, accBeforeWht, accWht, accNet,
        hrFee, hrVat, hrBeforeWht, hrWht, hrNet,
        grandNet,
        isExempt ? 'ยกเว้นหัก ณ ที่จ่าย' : '',
        row.accounting_fee_image_url || '',
      ])
    })

    // Totals row
    excelData.push([
      '', '', 'รวมทั้งหมด',
      totalAccFee, totalAccVat, totalAccBeforeWht, totalAccWht, totalAccNet,
      totalHrFee, totalHrVat, totalHrBeforeWht, totalHrWht, totalHrNet,
      totalGrandNet, '', '',
    ])

    // Create workbook
    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.aoa_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // ลำดับ
      { wch: 8 },   // Build
      { wch: 35 },  // ชื่อบริษัท
      { wch: 15 },  // ค่าบริการบัญชี
      { wch: 12 },  // VAT 7%
      { wch: 14 },  // ยอดก่อนหัก
      { wch: 12 },  // WHT 3%
      { wch: 16 },  // ยอดสุทธิ(บัญชี)
      { wch: 15 },  // ค่าบริการ HR
      { wch: 12 },  // VAT 7%
      { wch: 14 },  // ยอดก่อนหัก
      { wch: 12 },  // WHT 3%
      { wch: 16 },  // ยอดสุทธิ(HR)
      { wch: 14 },  // ยอดสุทธิรวม
      { wch: 22 },  // หมายเหตุ
      { wch: 40 },  // ลิงค์รูปค่าทำบัญชี
    ]

    // Apply currency number format to monetary columns (D to N, index 3-13)
    const moneyFormat = '#,##0.00'
    const range = xlsx.utils.decode_range(ws['!ref'])
    for (let R = 1; R <= range.e.r; R++) { // Skip header row (row 0)
      for (let C = 3; C <= 13; C++) { // Columns D(3) to N(13)
        const cellRef = xlsx.utils.encode_cell({ r: R, c: C })
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = moneyFormat
        }
      }
    }

    const sheetName = `สรุปค่าบริการ ${monthLabels[month]} ${currentYear}`
    xlsx.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = `สรุปค่าบริการ_${monthLabels[month]}_${currentYear}.xlsx`

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    console.error('Export accounting fees error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients/dropdown
 * ดึงรายชื่อลูกค้าสำหรับ dropdown (lightweight — เฉพาะ build + company_name)
 * รองรับ search (ค้นหาตาม build หรือ company_name) และ limit (จำกัดจำนวน)
 * ไม่ JOIN ตารางอื่น ทำให้เร็วกว่า GET /api/clients มาก
 * Access: All authenticated users
 */
router.get('/dropdown', authenticateToken, async (req, res) => {
  try {
    const { company_status, search, limit = 5 } = req.query
    const limitNum = Math.min(parseInt(limit) || 5, 50)

    const whereConditions = ['deleted_at IS NULL']
    const queryParams = []

    if (company_status && company_status !== 'all') {
      whereConditions.push('company_status = ?')
      queryParams.push(company_status)
    }

    if (search && search.trim()) {
      whereConditions.push('(build LIKE ? OR company_name LIKE ?)')
      const searchPattern = `%${search.trim()}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ')

    const [clients] = await pool.execute(
      `SELECT build, company_name
       FROM clients
       ${whereClause}
       ORDER BY build ASC
       LIMIT ?`,
      [...queryParams, limitNum]
    )

    res.json({
      success: true,
      data: clients,
    })
  } catch (error) {
    console.error('Get clients dropdown error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

/**
 * GET /api/clients
 * ดึงรายการลูกค้า (paginated, search, filter)
 * Access: All authenticated users (Admin/HR can see all, others limited)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      company_status = '',
      tax_registration_status = '',
      sortBy = 'build',
      sortOrder = 'asc',
    } = req.query

    const pageNum = parseInt(page)
    // เพิ่ม limit สูงสุดเป็น 100000 เพื่อรองรับการดึงข้อมูลทั้งหมด
    const limitNum = Math.min(parseInt(limit), 100000)
    const offset = (pageNum - 1) * limitNum

    // Role-based access control
    const isHRorAdmin = req.user.role === 'admin'

    // Build WHERE clause
    const whereConditions = ['c.deleted_at IS NULL']
    const queryParams = []

    // Filter by company_status
    if (company_status && company_status !== 'all') {
      whereConditions.push('c.company_status = ?')
      queryParams.push(company_status)
    }

    // Filter by tax_registration_status
    if (tax_registration_status && tax_registration_status !== 'all') {
      whereConditions.push('c.tax_registration_status = ?')
      queryParams.push(tax_registration_status)
    }

    // Search by build, company_name, or legal_entity_number
    if (search) {
      whereConditions.push('(c.build LIKE ? OR c.company_name LIKE ? OR c.legal_entity_number LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['build', 'company_name', 'legal_entity_number', 'company_status', 'created_at']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'build'
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'

    // Get total count
    const [countResults] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM clients c
       ${whereClause}`,
      queryParams
    )
    const total = countResults[0].total

    // Get clients
    const [clients] = await pool.execute(
      `SELECT 
        c.id,
        c.build,
        c.business_type,
        c.company_name,
        c.legal_entity_number,
        DATE_FORMAT(c.establishment_date, '%Y-%m-%d') as establishment_date,
        c.business_category,
        c.business_subcategory,
        c.company_size,
        c.tax_registration_status,
        DATE_FORMAT(c.vat_registration_date, '%Y-%m-%d') as vat_registration_date,
        c.full_address,
        c.village,
        c.building,
        c.room_number,
        c.floor_number,
        c.address_number,
        c.soi,
        c.moo,
        c.road,
        c.subdistrict,
        c.district,
        c.province,
        c.postal_code,
        c.company_status,
        c.created_at,
        c.updated_at,
        af.peak_code,
        DATE_FORMAT(af.accounting_start_date, '%Y-%m-%d') as accounting_start_date
      FROM clients c
      LEFT JOIN accounting_fees af ON af.build = c.build AND af.deleted_at IS NULL
      ${whereClause}
      ORDER BY c.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    res.json({
      success: true,
      data: clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get clients error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/clients/statistics
 * ดึงสถิติสรุปข้อมูลลูกค้า
 * Access: All authenticated users
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Get total clients count
    const [totalCount] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM clients 
       WHERE deleted_at IS NULL`
    )
    const total = totalCount[0].total

    // Get count by company_status
    const [companyStatusCounts] = await pool.execute(
      `SELECT 
        company_status,
        COUNT(*) as count
      FROM clients
      WHERE deleted_at IS NULL
      GROUP BY company_status
      ORDER BY 
        CASE company_status
          WHEN 'รายเดือน' THEN 1
          WHEN 'รายเดือน / วางมือ' THEN 2
          WHEN 'รายเดือน / จ่ายรายปี' THEN 3
          WHEN 'รายเดือน / เดือนสุดท้าย' THEN 4
          WHEN 'ยกเลิกทำ' THEN 5
        END`
    )

    // Get count by tax_registration_status
    const [taxStatusCounts] = await pool.execute(
      `SELECT 
        tax_registration_status,
        COUNT(*) as count
      FROM clients
      WHERE deleted_at IS NULL
        AND tax_registration_status IS NOT NULL
      GROUP BY tax_registration_status
      ORDER BY 
        CASE tax_registration_status
          WHEN 'จดภาษีมูลค่าเพิ่ม' THEN 1
          WHEN 'ยังไม่จดภาษีมูลค่าเพิ่ม' THEN 2
        END`
    )

    // Incomplete data: Basic Info (establishment_date, business_category, company_size)
    const [incompleteBasic] = await pool.execute(
      `SELECT build, company_name
       FROM clients
       WHERE deleted_at IS NULL
         AND (establishment_date IS NULL
           OR business_category IS NULL OR business_category = ''
           OR company_size IS NULL OR company_size = '')
       ORDER BY build`
    )

    // Incomplete data: Tax Info (tax_registration_status)
    const [incompleteTax] = await pool.execute(
      `SELECT build, company_name
       FROM clients
       WHERE deleted_at IS NULL
         AND (tax_registration_status IS NULL OR tax_registration_status = '')
       ORDER BY build`
    )

    // Incomplete data: Address (province, district, subdistrict, postal_code)
    const [incompleteAddress] = await pool.execute(
      `SELECT build, company_name
       FROM clients
       WHERE deleted_at IS NULL
         AND (province IS NULL OR province = ''
           OR district IS NULL OR district = ''
           OR subdistrict IS NULL OR subdistrict = ''
           OR postal_code IS NULL OR postal_code = '')
       ORDER BY build`
    )

    res.json({
      success: true,
      data: {
        total,
        byCompanyStatus: companyStatusCounts,
        byTaxRegistrationStatus: taxStatusCounts,
        incompleteData: {
          basicInfo: { count: incompleteBasic.length, clients: incompleteBasic },
          taxInfo: { count: incompleteTax.length, clients: incompleteTax },
          address: { count: incompleteAddress.length, clients: incompleteAddress },
        },
      },
    })
  } catch (error) {
    console.error('Get clients statistics error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
})

/**
 * GET /api/clients/:build
 * ดึงข้อมูลลูกค้าตาม Build code (รวมข้อมูลจาก 4 ตารางที่เกี่ยวข้อง)
 * Access: All authenticated users
 */
router.get('/:build', authenticateToken, async (req, res) => {
  try {
    const { build } = req.params

    const [clients] = await pool.execute(
      `SELECT 
        c.id,
        c.build,
        c.business_type,
        c.company_name,
        c.legal_entity_number,
        DATE_FORMAT(c.establishment_date, '%Y-%m-%d') as establishment_date,
        c.business_category,
        c.business_subcategory,
        c.company_size,
        c.tax_registration_status,
        DATE_FORMAT(c.vat_registration_date, '%Y-%m-%d') as vat_registration_date,
        c.full_address,
        c.village,
        c.building,
        c.room_number,
        c.floor_number,
        c.address_number,
        c.soi,
        c.moo,
        c.road,
        c.subdistrict,
        c.district,
        c.province,
        c.postal_code,
        c.company_status,
        c.created_at,
        c.updated_at
      FROM clients c
      WHERE c.build = ? AND c.deleted_at IS NULL`,
      [build]
    )

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    const clientData = clients[0]

    // Fetch related data from 4 tables
    const [dbdRows] = await pool.execute(
      `SELECT 
        accounting_period, registered_capital, paid_capital,
        business_code, business_objective_at_registration,
        latest_business_code, latest_business_objective
      FROM dbd_info WHERE build = ? AND deleted_at IS NULL`,
      [build]
    )

    const [boiRows] = await pool.execute(
      `SELECT 
        DATE_FORMAT(boi_approval_date, '%Y-%m-%d') as boi_approval_date,
        DATE_FORMAT(boi_first_use_date, '%Y-%m-%d') as boi_first_use_date,
        DATE_FORMAT(boi_expiry_date, '%Y-%m-%d') as boi_expiry_date
      FROM boi_info WHERE build = ? AND deleted_at IS NULL`,
      [build]
    )

    const [credentialRows] = await pool.execute(
      `SELECT 
        efiling_username, efiling_password,
        sso_username, sso_password,
        dbd_username, dbd_password,
        student_loan_username, student_loan_password,
        enforcement_username, enforcement_password
      FROM agency_credentials WHERE build = ? AND deleted_at IS NULL`,
      [build]
    )

    const [feeRows] = await pool.execute(
      `SELECT 
        peak_code,
        DATE_FORMAT(accounting_start_date, '%Y-%m-%d') as accounting_start_date,
        DATE_FORMAT(accounting_end_date, '%Y-%m-%d') as accounting_end_date,
        accounting_end_reason,
        fee_year,
        accounting_fee_jan, accounting_fee_feb, accounting_fee_mar,
        accounting_fee_apr, accounting_fee_may, accounting_fee_jun,
        accounting_fee_jul, accounting_fee_aug, accounting_fee_sep,
        accounting_fee_oct, accounting_fee_nov, accounting_fee_dec,
        hr_fee_jan, hr_fee_feb, hr_fee_mar,
        hr_fee_apr, hr_fee_may, hr_fee_jun,
        hr_fee_jul, hr_fee_aug, hr_fee_sep,
        hr_fee_oct, hr_fee_nov, hr_fee_dec,
        line_chat_type, line_chat_id,
        line_billing_chat_type, line_billing_id,
        accounting_fee_image_url
      FROM accounting_fees WHERE build = ? AND deleted_at IS NULL
      ORDER BY fee_year DESC LIMIT 1`,
      [build]
    )

    res.json({
      success: true,
      data: {
        ...clientData,
        dbd_info: dbdRows[0] || null,
        boi_info: boiRows[0] || null,
        agency_credentials: credentialRows[0] || null,
        accounting_fees: feeRows[0] || null,
      },
    })
  } catch (error) {
    console.error('Get client error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/clients
 * สร้างลูกค้าใหม่ (รวมข้อมูล 4 ตารางที่เกี่ยวข้อง)
 * Access: Admin/HR only
 */
router.post('/', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const {
      build,
      business_type,
      company_name,
      legal_entity_number,
      establishment_date,
      business_category,
      business_subcategory,
      company_size,
      tax_registration_status,
      vat_registration_date,
      full_address,
      village,
      building,
      room_number,
      floor_number,
      address_number,
      soi,
      moo,
      road,
      subdistrict,
      district,
      province,
      postal_code,
      company_status = 'รายเดือน',
      // Related tables data
      dbd_info,
      boi_info,
      agency_credentials,
      accounting_fees,
    } = req.body

    // Validation
    if (!build || !business_type || !company_name || !legal_entity_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          build: !build ? 'Required' : undefined,
          business_type: !business_type ? 'Required' : undefined,
          company_name: !company_name ? 'Required' : undefined,
          legal_entity_number: !legal_entity_number ? 'Required' : undefined,
        },
      })
    }

    // Validate legal_entity_number format (13 digits)
    if (legal_entity_number && !/^\d{13}$/.test(legal_entity_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid legal entity number format (must be 13 digits)',
      })
    }

    // Check if build already exists
    const [existingClients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (existingClients.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Build code already exists',
      })
    }

    // Check if legal_entity_number already exists
    const [existingLegalEntity] = await pool.execute(
      'SELECT id FROM clients WHERE legal_entity_number = ? AND deleted_at IS NULL',
      [legal_entity_number]
    )

    if (existingLegalEntity.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Legal entity number already exists',
      })
    }

    const id = generateUUID()

    // Insert client
    await pool.execute(
      `INSERT INTO clients (
        id, build, business_type, company_name, legal_entity_number,
        establishment_date, business_category, business_subcategory, company_size,
        tax_registration_status, vat_registration_date,
        full_address, village, building, room_number, floor_number, address_number,
        soi, moo, road, subdistrict, district, province, postal_code,
        company_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        build,
        business_type,
        company_name,
        legal_entity_number,
        establishment_date || null,
        business_category || null,
        business_subcategory || null,
        company_size || null,
        tax_registration_status || null,
        vat_registration_date || null,
        full_address || null,
        village || null,
        building || null,
        room_number || null,
        floor_number || null,
        address_number || null,
        soi || null,
        moo || null,
        road || null,
        subdistrict || null,
        district || null,
        province || null,
        postal_code || null,
        company_status,
      ]
    )

    // Insert related data: dbd_info
    if (dbd_info) {
      await pool.execute(
        `INSERT INTO dbd_info (
          id, build, accounting_period, registered_capital, paid_capital,
          business_code, business_objective_at_registration,
          latest_business_code, latest_business_objective
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(), build,
          dbd_info.accounting_period || null,
          dbd_info.registered_capital || null,
          dbd_info.paid_capital || null,
          dbd_info.business_code || null,
          dbd_info.business_objective_at_registration || null,
          dbd_info.latest_business_code || null,
          dbd_info.latest_business_objective || null,
        ]
      )
    }

    // Insert related data: boi_info
    if (boi_info) {
      await pool.execute(
        `INSERT INTO boi_info (
          id, build, boi_approval_date, boi_first_use_date, boi_expiry_date
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          generateUUID(), build,
          boi_info.boi_approval_date || null,
          boi_info.boi_first_use_date || null,
          boi_info.boi_expiry_date || null,
        ]
      )
    }

    // Insert related data: agency_credentials
    if (agency_credentials) {
      await pool.execute(
        `INSERT INTO agency_credentials (
          id, build,
          efiling_username, efiling_password,
          sso_username, sso_password,
          dbd_username, dbd_password,
          student_loan_username, student_loan_password,
          enforcement_username, enforcement_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(), build,
          agency_credentials.efiling_username || null,
          agency_credentials.efiling_password || null,
          agency_credentials.sso_username || null,
          agency_credentials.sso_password || null,
          agency_credentials.dbd_username || null,
          agency_credentials.dbd_password || null,
          agency_credentials.student_loan_username || null,
          agency_credentials.student_loan_password || null,
          agency_credentials.enforcement_username || null,
          agency_credentials.enforcement_password || null,
        ]
      )
    }

    // Insert related data: accounting_fees
    if (accounting_fees) {
      const currentYear = new Date().getFullYear()
      await pool.execute(
        `INSERT INTO accounting_fees (
          id, build, peak_code, accounting_start_date, accounting_end_date, accounting_end_reason,
          fee_year,
          accounting_fee_jan, accounting_fee_feb, accounting_fee_mar,
          accounting_fee_apr, accounting_fee_may, accounting_fee_jun,
          accounting_fee_jul, accounting_fee_aug, accounting_fee_sep,
          accounting_fee_oct, accounting_fee_nov, accounting_fee_dec,
          hr_fee_jan, hr_fee_feb, hr_fee_mar,
          hr_fee_apr, hr_fee_may, hr_fee_jun,
          hr_fee_jul, hr_fee_aug, hr_fee_sep,
          hr_fee_oct, hr_fee_nov, hr_fee_dec,
          line_chat_type, line_chat_id,
          line_billing_chat_type, line_billing_id,
          accounting_fee_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(), build,
          accounting_fees.peak_code || null,
          accounting_fees.accounting_start_date || null,
          accounting_fees.accounting_end_date || null,
          accounting_fees.accounting_end_reason || null,
          accounting_fees.fee_year || currentYear,
          accounting_fees.accounting_fee_jan || null,
          accounting_fees.accounting_fee_feb || null,
          accounting_fees.accounting_fee_mar || null,
          accounting_fees.accounting_fee_apr || null,
          accounting_fees.accounting_fee_may || null,
          accounting_fees.accounting_fee_jun || null,
          accounting_fees.accounting_fee_jul || null,
          accounting_fees.accounting_fee_aug || null,
          accounting_fees.accounting_fee_sep || null,
          accounting_fees.accounting_fee_oct || null,
          accounting_fees.accounting_fee_nov || null,
          accounting_fees.accounting_fee_dec || null,
          accounting_fees.hr_fee_jan || null,
          accounting_fees.hr_fee_feb || null,
          accounting_fees.hr_fee_mar || null,
          accounting_fees.hr_fee_apr || null,
          accounting_fees.hr_fee_may || null,
          accounting_fees.hr_fee_jun || null,
          accounting_fees.hr_fee_jul || null,
          accounting_fees.hr_fee_aug || null,
          accounting_fees.hr_fee_sep || null,
          accounting_fees.hr_fee_oct || null,
          accounting_fees.hr_fee_nov || null,
          accounting_fees.hr_fee_dec || null,
          accounting_fees.line_chat_type || null,
          accounting_fees.line_chat_id || null,
          accounting_fees.line_billing_chat_type || null,
          accounting_fees.line_billing_id || null,
          accounting_fees.accounting_fee_image_url || null,
        ]
      )
    }

    // Invalidate cache for clients list and statistics
    invalidateCache('GET:/api/clients')

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { id, build },
    })
  } catch (error) {
    console.error('Create client error:', error)

    // Handle MySQL errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry - Build code or Legal entity number already exists',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PUT /api/clients/:build
 * แก้ไขข้อมูลลูกค้า (รวมข้อมูล 4 ตารางที่เกี่ยวข้อง)
 * Access: Admin/HR only
 */
router.put('/:build', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { build } = req.params
    const {
      business_type,
      company_name,
      legal_entity_number,
      establishment_date,
      business_category,
      business_subcategory,
      company_size,
      tax_registration_status,
      vat_registration_date,
      full_address,
      village,
      building,
      room_number,
      floor_number,
      address_number,
      soi,
      moo,
      road,
      subdistrict,
      district,
      province,
      postal_code,
      company_status,
      // Related tables data
      dbd_info,
      boi_info,
      agency_credentials,
      accounting_fees,
    } = req.body

    // Check if client exists
    const [existingClients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (existingClients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    // Validate legal_entity_number format if provided
    if (legal_entity_number && !/^\d{13}$/.test(legal_entity_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid legal entity number format (must be 13 digits)',
      })
    }

    // Check if legal_entity_number already exists (for another client)
    if (legal_entity_number) {
      const [existingLegalEntity] = await pool.execute(
        'SELECT id FROM clients WHERE legal_entity_number = ? AND build != ? AND deleted_at IS NULL',
        [legal_entity_number, build]
      )

      if (existingLegalEntity.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Legal entity number already exists for another client',
        })
      }
    }

    // Update client
    await pool.execute(
      `UPDATE clients SET
        business_type = ?,
        company_name = ?,
        legal_entity_number = ?,
        establishment_date = ?,
        business_category = ?,
        business_subcategory = ?,
        company_size = ?,
        tax_registration_status = ?,
        vat_registration_date = ?,
        full_address = ?,
        village = ?,
        building = ?,
        room_number = ?,
        floor_number = ?,
        address_number = ?,
        soi = ?,
        moo = ?,
        road = ?,
        subdistrict = ?,
        district = ?,
        province = ?,
        postal_code = ?,
        company_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE build = ? AND deleted_at IS NULL`,
      [
        business_type,
        company_name,
        legal_entity_number,
        establishment_date || null,
        business_category || null,
        business_subcategory || null,
        company_size || null,
        tax_registration_status || null,
        vat_registration_date || null,
        full_address || null,
        village || null,
        building || null,
        room_number || null,
        floor_number || null,
        address_number || null,
        soi || null,
        moo || null,
        road || null,
        subdistrict || null,
        district || null,
        province || null,
        postal_code || null,
        company_status,
        build,
      ]
    )

    // Upsert related data: dbd_info (delete old + insert new)
    if (dbd_info !== undefined) {
      await pool.execute('DELETE FROM dbd_info WHERE build = ? AND deleted_at IS NULL', [build])
      if (dbd_info) {
        await pool.execute(
          `INSERT INTO dbd_info (
            id, build, accounting_period, registered_capital, paid_capital,
            business_code, business_objective_at_registration,
            latest_business_code, latest_business_objective
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(), build,
            dbd_info.accounting_period || null,
            dbd_info.registered_capital || null,
            dbd_info.paid_capital || null,
            dbd_info.business_code || null,
            dbd_info.business_objective_at_registration || null,
            dbd_info.latest_business_code || null,
            dbd_info.latest_business_objective || null,
          ]
        )
      }
    }

    // Upsert related data: boi_info
    if (boi_info !== undefined) {
      await pool.execute('DELETE FROM boi_info WHERE build = ? AND deleted_at IS NULL', [build])
      if (boi_info) {
        await pool.execute(
          `INSERT INTO boi_info (
            id, build, boi_approval_date, boi_first_use_date, boi_expiry_date
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            generateUUID(), build,
            boi_info.boi_approval_date || null,
            boi_info.boi_first_use_date || null,
            boi_info.boi_expiry_date || null,
          ]
        )
      }
    }

    // Upsert related data: agency_credentials
    if (agency_credentials !== undefined) {
      await pool.execute('DELETE FROM agency_credentials WHERE build = ? AND deleted_at IS NULL', [build])
      if (agency_credentials) {
        await pool.execute(
          `INSERT INTO agency_credentials (
            id, build,
            efiling_username, efiling_password,
            sso_username, sso_password,
            dbd_username, dbd_password,
            student_loan_username, student_loan_password,
            enforcement_username, enforcement_password
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(), build,
            agency_credentials.efiling_username || null,
            agency_credentials.efiling_password || null,
            agency_credentials.sso_username || null,
            agency_credentials.sso_password || null,
            agency_credentials.dbd_username || null,
            agency_credentials.dbd_password || null,
            agency_credentials.student_loan_username || null,
            agency_credentials.student_loan_password || null,
            agency_credentials.enforcement_username || null,
            agency_credentials.enforcement_password || null,
          ]
        )
      }
    }

    // Upsert related data: accounting_fees
    // Only update the fields that are actually sent — preserve monthly fees
    if (accounting_fees !== undefined && accounting_fees) {
      const currentYear = new Date().getFullYear()
      const feeYear = accounting_fees.fee_year || currentYear

      // Check if a row already exists
      const [existingFees] = await pool.execute(
        'SELECT id FROM accounting_fees WHERE build = ? AND fee_year = ? AND deleted_at IS NULL',
        [build, feeYear]
      )

      if (existingFees.length > 0) {
        // UPDATE only the fields that are provided (non-undefined)
        // Build dynamic SET clause from provided fields
        const updateFields = []
        const updateValues = []

        // Basic info fields (from ClientForm edit)
        if (accounting_fees.peak_code !== undefined) { updateFields.push('peak_code = ?'); updateValues.push(accounting_fees.peak_code || null) }
        if (accounting_fees.accounting_start_date !== undefined) { updateFields.push('accounting_start_date = ?'); updateValues.push(accounting_fees.accounting_start_date || null) }
        if (accounting_fees.accounting_end_date !== undefined) { updateFields.push('accounting_end_date = ?'); updateValues.push(accounting_fees.accounting_end_date || null) }
        if (accounting_fees.accounting_end_reason !== undefined) { updateFields.push('accounting_end_reason = ?'); updateValues.push(accounting_fees.accounting_end_reason || null) }

        // Monthly fee fields (from MonthlyFeesForm)
        const monthlyFields = [
          'accounting_fee_jan', 'accounting_fee_feb', 'accounting_fee_mar',
          'accounting_fee_apr', 'accounting_fee_may', 'accounting_fee_jun',
          'accounting_fee_jul', 'accounting_fee_aug', 'accounting_fee_sep',
          'accounting_fee_oct', 'accounting_fee_nov', 'accounting_fee_dec',
          'hr_fee_jan', 'hr_fee_feb', 'hr_fee_mar',
          'hr_fee_apr', 'hr_fee_may', 'hr_fee_jun',
          'hr_fee_jul', 'hr_fee_aug', 'hr_fee_sep',
          'hr_fee_oct', 'hr_fee_nov', 'hr_fee_dec',
          'line_chat_type', 'line_chat_id',
          'line_billing_chat_type', 'line_billing_id',
          'accounting_fee_image_url',
        ]
        for (const field of monthlyFields) {
          if (accounting_fees[field] !== undefined) {
            updateFields.push(`${field} = ?`)
            updateValues.push(accounting_fees[field] ?? null)
          }
        }

        if (updateFields.length > 0) {
          updateFields.push('updated_at = CURRENT_TIMESTAMP')
          updateValues.push(build, feeYear)
          await pool.execute(
            `UPDATE accounting_fees SET ${updateFields.join(', ')} WHERE build = ? AND fee_year = ? AND deleted_at IS NULL`,
            updateValues
          )
        }
      } else {
        // No existing row — INSERT new record
        await pool.execute(
          `INSERT INTO accounting_fees (
            id, build, peak_code, accounting_start_date, accounting_end_date, accounting_end_reason,
            fee_year,
            accounting_fee_jan, accounting_fee_feb, accounting_fee_mar,
            accounting_fee_apr, accounting_fee_may, accounting_fee_jun,
            accounting_fee_jul, accounting_fee_aug, accounting_fee_sep,
            accounting_fee_oct, accounting_fee_nov, accounting_fee_dec,
            hr_fee_jan, hr_fee_feb, hr_fee_mar,
            hr_fee_apr, hr_fee_may, hr_fee_jun,
            hr_fee_jul, hr_fee_aug, hr_fee_sep,
            hr_fee_oct, hr_fee_nov, hr_fee_dec,
            line_chat_type, line_chat_id,
            line_billing_chat_type, line_billing_id,
            accounting_fee_image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(), build,
            accounting_fees.peak_code || null,
            accounting_fees.accounting_start_date || null,
            accounting_fees.accounting_end_date || null,
            accounting_fees.accounting_end_reason || null,
            feeYear,
            accounting_fees.accounting_fee_jan || null,
            accounting_fees.accounting_fee_feb || null,
            accounting_fees.accounting_fee_mar || null,
            accounting_fees.accounting_fee_apr || null,
            accounting_fees.accounting_fee_may || null,
            accounting_fees.accounting_fee_jun || null,
            accounting_fees.accounting_fee_jul || null,
            accounting_fees.accounting_fee_aug || null,
            accounting_fees.accounting_fee_sep || null,
            accounting_fees.accounting_fee_oct || null,
            accounting_fees.accounting_fee_nov || null,
            accounting_fees.accounting_fee_dec || null,
            accounting_fees.hr_fee_jan || null,
            accounting_fees.hr_fee_feb || null,
            accounting_fees.hr_fee_mar || null,
            accounting_fees.hr_fee_apr || null,
            accounting_fees.hr_fee_may || null,
            accounting_fees.hr_fee_jun || null,
            accounting_fees.hr_fee_jul || null,
            accounting_fees.hr_fee_aug || null,
            accounting_fees.hr_fee_sep || null,
            accounting_fees.hr_fee_oct || null,
            accounting_fees.hr_fee_nov || null,
            accounting_fees.hr_fee_dec || null,
            accounting_fees.line_chat_type || null,
            accounting_fees.line_chat_id || null,
            accounting_fees.line_billing_chat_type || null,
            accounting_fees.line_billing_id || null,
            accounting_fees.accounting_fee_image_url || null,
          ]
        )
      }
    }

    // Invalidate cache for clients list, statistics, and this specific client
    invalidateCache('GET:/api/clients')

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { build },
    })
  } catch (error) {
    console.error('Update client error:', error)

    // Handle MySQL errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry - Legal entity number already exists',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * PATCH /api/clients/:build/accounting-fees
 * อัพเดทเฉพาะข้อมูลค่าทำบัญชี/HR (ไม่ต้องส่งข้อมูลลูกค้าทั้งหมด)
 * Access: Admin, HR, Data Entry, Data Entry & Service
 */
router.patch('/:build/accounting-fees', authenticateToken, authorize('admin', 'hr', 'data_entry', 'data_entry_and_service'), async (req, res) => {
  try {
    const { build } = req.params
    const accounting_fees = req.body

    // Check if client exists
    const [existingClients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (existingClients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    if (!accounting_fees || Object.keys(accounting_fees).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accounting fees data provided',
      })
    }

    const currentYear = new Date().getFullYear()
    const feeYear = accounting_fees.fee_year || currentYear

    // Check if a row already exists for this year
    const [existingFees] = await pool.execute(
      'SELECT id FROM accounting_fees WHERE build = ? AND fee_year = ? AND deleted_at IS NULL',
      [build, feeYear]
    )

    if (existingFees.length > 0) {
      // UPDATE only the fields that are actually provided — preserve all other data
      const updateFields = []
      const updateValues = []

      // Basic info fields
      if (accounting_fees.peak_code !== undefined) { updateFields.push('peak_code = ?'); updateValues.push(accounting_fees.peak_code || null) }
      if (accounting_fees.accounting_start_date !== undefined) { updateFields.push('accounting_start_date = ?'); updateValues.push(accounting_fees.accounting_start_date || null) }
      if (accounting_fees.accounting_end_date !== undefined) { updateFields.push('accounting_end_date = ?'); updateValues.push(accounting_fees.accounting_end_date || null) }
      if (accounting_fees.accounting_end_reason !== undefined) { updateFields.push('accounting_end_reason = ?'); updateValues.push(accounting_fees.accounting_end_reason || null) }

      // Monthly fee fields and other fields
      const dynamicFields = [
        'accounting_fee_jan', 'accounting_fee_feb', 'accounting_fee_mar',
        'accounting_fee_apr', 'accounting_fee_may', 'accounting_fee_jun',
        'accounting_fee_jul', 'accounting_fee_aug', 'accounting_fee_sep',
        'accounting_fee_oct', 'accounting_fee_nov', 'accounting_fee_dec',
        'hr_fee_jan', 'hr_fee_feb', 'hr_fee_mar',
        'hr_fee_apr', 'hr_fee_may', 'hr_fee_jun',
        'hr_fee_jul', 'hr_fee_aug', 'hr_fee_sep',
        'hr_fee_oct', 'hr_fee_nov', 'hr_fee_dec',
        'line_chat_type', 'line_chat_id',
        'line_billing_chat_type', 'line_billing_id',
        'accounting_fee_image_url',
      ]
      for (const field of dynamicFields) {
        if (accounting_fees[field] !== undefined) {
          updateFields.push(`${field} = ?`)
          updateValues.push(accounting_fees[field] ?? null)
        }
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        updateValues.push(build, feeYear)
        await pool.execute(
          `UPDATE accounting_fees SET ${updateFields.join(', ')} WHERE build = ? AND fee_year = ? AND deleted_at IS NULL`,
          updateValues
        )
      }
    } else {
      // No existing row — INSERT new record
      await pool.execute(
        `INSERT INTO accounting_fees (
          id, build, peak_code, accounting_start_date, accounting_end_date, accounting_end_reason,
          fee_year,
          accounting_fee_jan, accounting_fee_feb, accounting_fee_mar,
          accounting_fee_apr, accounting_fee_may, accounting_fee_jun,
          accounting_fee_jul, accounting_fee_aug, accounting_fee_sep,
          accounting_fee_oct, accounting_fee_nov, accounting_fee_dec,
          hr_fee_jan, hr_fee_feb, hr_fee_mar,
          hr_fee_apr, hr_fee_may, hr_fee_jun,
          hr_fee_jul, hr_fee_aug, hr_fee_sep,
          hr_fee_oct, hr_fee_nov, hr_fee_dec,
          line_chat_type, line_chat_id,
          line_billing_chat_type, line_billing_id,
          accounting_fee_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(), build,
          accounting_fees.peak_code || null,
          accounting_fees.accounting_start_date || null,
          accounting_fees.accounting_end_date || null,
          accounting_fees.accounting_end_reason || null,
          feeYear,
          accounting_fees.accounting_fee_jan ?? null,
          accounting_fees.accounting_fee_feb ?? null,
          accounting_fees.accounting_fee_mar ?? null,
          accounting_fees.accounting_fee_apr ?? null,
          accounting_fees.accounting_fee_may ?? null,
          accounting_fees.accounting_fee_jun ?? null,
          accounting_fees.accounting_fee_jul ?? null,
          accounting_fees.accounting_fee_aug ?? null,
          accounting_fees.accounting_fee_sep ?? null,
          accounting_fees.accounting_fee_oct ?? null,
          accounting_fees.accounting_fee_nov ?? null,
          accounting_fees.accounting_fee_dec ?? null,
          accounting_fees.hr_fee_jan ?? null,
          accounting_fees.hr_fee_feb ?? null,
          accounting_fees.hr_fee_mar ?? null,
          accounting_fees.hr_fee_apr ?? null,
          accounting_fees.hr_fee_may ?? null,
          accounting_fees.hr_fee_jun ?? null,
          accounting_fees.hr_fee_jul ?? null,
          accounting_fees.hr_fee_aug ?? null,
          accounting_fees.hr_fee_sep ?? null,
          accounting_fees.hr_fee_oct ?? null,
          accounting_fees.hr_fee_nov ?? null,
          accounting_fees.hr_fee_dec ?? null,
          accounting_fees.line_chat_type || null,
          accounting_fees.line_chat_id || null,
          accounting_fees.line_billing_chat_type || null,
          accounting_fees.line_billing_id || null,
          accounting_fees.accounting_fee_image_url || null,
        ]
      )
    }

    // Invalidate cache
    invalidateCache('GET:/api/clients')

    res.json({
      success: true,
      message: 'Accounting fees updated successfully',
      data: { build, fee_year: feeYear },
    })
  } catch (error) {
    console.error('Update accounting fees error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * DELETE /api/clients/:build
 * ลบลูกค้า (soft delete)
 * Access: Admin/HR only
 */
router.delete('/:build', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { build } = req.params

    // Check if client exists
    const [existingClients] = await pool.execute(
      'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
      [build]
    )

    if (existingClients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      })
    }

    // Soft delete
    await pool.execute(
      'UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE build = ?',
      [build]
    )

    // Invalidate cache for clients list and statistics
    invalidateCache('GET:/api/clients')

    res.json({
      success: true,
      message: 'Client deleted successfully',
    })
  } catch (error) {
    console.error('Delete client error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * Helper function to parse date from Excel
 */
function parseDate(dateValue, fieldName = 'date', rowNumber = 0) {
  if (!dateValue) return null

  let date

  // If it's already a Date object
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear()
    const month = dateValue.getMonth()
    const day = dateValue.getDate()
    date = new Date(year, month, day)
  }
  // If it's a number (Excel date serial number)
  else if (typeof dateValue === 'number') {
    const unixEpochOffset = 25569
    const jsDate = new Date((dateValue - unixEpochOffset) * 86400000)
    const year = jsDate.getUTCFullYear()
    const month = jsDate.getUTCMonth()
    const day = jsDate.getUTCDate()

    if (year < 1900 || year > 2100) {
      return null
    }

    date = new Date(year, month, day)
  }
  // If it's a string
  else if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()

    // Try D/M/YYYY or DD/MM/YYYY format
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const year = parseInt(parts[2], 10)

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        }
      }
    }
    // Try YYYY-MM-DD format
    else if (trimmed.includes('-')) {
      const parts = trimmed.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        }
      }
    }
    // Try default Date parsing
    else {
      const tempDate = new Date(trimmed)
      if (!isNaN(tempDate.getTime())) {
        const year = tempDate.getFullYear()
        const month = tempDate.getMonth()
        const day = tempDate.getDate()
        date = new Date(year, month, day)
      }
    }
  } else {
    return null
  }

  // Validate date
  if (!date || isNaN(date.getTime())) {
    return null
  }

  // Format as YYYY-MM-DD using local date methods
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * POST /api/clients/import/validate
 * Validate Excel file before import
 * Access: Admin, Data Entry roles
 */
router.post(
  '/import/validate',
  authenticateToken,
  authorize('admin', 'data_entry', 'data_entry_and_service'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required',
        })
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null })

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty',
        })
      }

      const validationResults = {
        total: data.length,
        valid: 0,
        invalid: 0,
        errors: [],
        warnings: [],
      }

      // Track builds within the file to detect duplicates
      const buildMap = new Map() // build -> [row numbers]
      const legalEntityNumberMap = new Map() // legal_entity_number -> [row numbers]

      // First pass: collect all builds and legal entity numbers
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const legalEntityNumberRaw = row['เลขทะเบียนนิติบุคคล'] || row['legal_entity_number']
        const legalEntityNumber = legalEntityNumberRaw ? padLegalEntityNumber(legalEntityNumberRaw) : null

        if (build) {
          if (!buildMap.has(build)) {
            buildMap.set(build, [])
          }
          buildMap.get(build).push(rowNumber)
        }

        if (legalEntityNumber) {
          if (legalEntityNumber.length === 13) {
            if (!legalEntityNumberMap.has(legalEntityNumber)) {
              legalEntityNumberMap.set(legalEntityNumber, [])
            }
            legalEntityNumberMap.get(legalEntityNumber).push(rowNumber)
          }
        }
      }

      // Check for duplicates within file
      buildMap.forEach((rows, build) => {
        if (rows.length > 1) {
          validationResults.warnings.push({
            row: rows[0],
            build: build,
            warnings: [`Build Code ซ้ำกันในไฟล์ (พบ ${rows.length} แถว)`],
          })
        }
      })

      legalEntityNumberMap.forEach((rows, legalEntityNumber) => {
        if (rows.length > 1) {
          // Legal entity number can be duplicated for branches - show informational message
          validationResults.warnings.push({
            row: rows[0],
            build: data[rows[0] - 2]?.['Build Code'] || data[rows[0] - 2]?.['build'] || '',
            warnings: [`เลขทะเบียนนิติบุคคลซ้ำกันในไฟล์ (พบ ${rows.length} แถว) - อาจเป็นสาขา ระบบจะนำเข้าทั้งหมด`],
          })
        }
      })

      // Second pass: validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const companyName = String(row['ชื่อบริษัท'] || row['company_name'] || '').trim()
        const legalEntityNumberRaw = row['เลขทะเบียนนิติบุคคล'] || row['legal_entity_number']
        const legalEntityNumber = legalEntityNumberRaw ? padLegalEntityNumber(legalEntityNumberRaw) : null

        const missingFields = []
        const errors = []
        const warnings = []

        // Required fields validation
        if (!build) {
          missingFields.push('Build Code')
        } else if (!isValidBuildCode(build)) {
          errors.push('Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก (รองรับจุดทศนิยม เช่น 122.1)')
        }

        if (!companyName) {
          missingFields.push('ชื่อบริษัท')
        }

        // Legal entity number validation
        if (legalEntityNumberRaw) {
          if (!legalEntityNumber || legalEntityNumber.length !== 13) {
            errors.push('เลขทะเบียนนิติบุคคลต้องเป็นตัวเลข 13 หลัก')
          }
        }

        // Check if build exists in database
        if (build && isValidBuildCode(build)) {
          try {
            const [existing] = await pool.execute(
              'SELECT build FROM clients WHERE build = ? AND deleted_at IS NULL',
              [build]
            )
            if (existing.length > 0) {
              warnings.push('Build Code มีอยู่ในระบบแล้ว ระบบจะอัพเดทข้อมูลเดิม')
            }
          } catch (error) {
            // Ignore database errors during validation
          }
        }

        // Check if legal entity number exists in database (for warning only, not error)
        // Note: Legal entity number can be duplicated for branches, so we only show warning
        if (legalEntityNumber && legalEntityNumber.length === 13) {
          try {
            const [existing] = await pool.execute(
              'SELECT build FROM clients WHERE legal_entity_number = ? AND build != ? AND deleted_at IS NULL',
              [legalEntityNumber, build]
            )
            if (existing.length > 0) {
              warnings.push(`เลขทะเบียนนิติบุคคลมีอยู่ในระบบแล้ว (Build Code: ${existing[0].build}) - อาจเป็นสาขา`)
            }
          } catch (error) {
            // Ignore database errors during validation
          }
        }

        if (missingFields.length > 0 || errors.length > 0) {
          validationResults.invalid++
          validationResults.errors.push({
            row: rowNumber,
            build: build || '',
            missingFields,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
          })
        } else {
          validationResults.valid++
        }
      }

      res.json({
        success: true,
        data: validationResults,
      })
    } catch (error) {
      console.error('Client import validation error:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating file',
        error: error.message,
      })
    }
  }
)

/**
 * POST /api/clients/import
 * Import clients from Excel file
 * Access: Admin, Data Entry roles
 */
router.post(
  '/import',
  authenticateToken,
  authorize('admin', 'data_entry', 'data_entry_and_service'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required',
        })
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null })

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty',
        })
      }

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        warnings: [],
      }

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        try {
          // Map Excel columns to database fields
          // Pad leading zeros for Build Code and Legal Entity Number (Excel strips leading zeros)
          const buildRaw = row['Build Code'] || row['build'] || ''
          const build = padBuildCode(buildRaw)
          const companyName = String(row['ชื่อบริษัท'] || row['company_name'] || '').trim()
          const legalEntityNumberRaw = row['เลขทะเบียนนิติบุคคล'] || row['legal_entity_number']
          const cleanedLegalEntityNumber = legalEntityNumberRaw
            ? padLegalEntityNumber(legalEntityNumberRaw)
            : null

          // Validate required fields
          if (!build || !isValidBuildCode(build)) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              build: build || '',
              error: 'Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก (รองรับจุดทศนิยม เช่น 122.1)',
            })
            continue
          }

          if (!companyName) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              build: build,
              error: 'ชื่อบริษัทต้องกรอก',
            })
            continue
          }

          // Validate legal entity number format
          if (legalEntityNumberRaw && (!cleanedLegalEntityNumber || cleanedLegalEntityNumber.length !== 13)) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              build: build,
              error: 'เลขทะเบียนนิติบุคคลต้องเป็นตัวเลข 13 หลัก',
            })
            continue
          }

          // Check if legal entity number already exists (for warning only, not error)
          // Note: Legal entity number can be duplicated for branches, so we allow it
          // We only log it for information purposes
          if (cleanedLegalEntityNumber && cleanedLegalEntityNumber.length === 13) {
            try {
              const [existing] = await pool.execute(
                'SELECT build FROM clients WHERE legal_entity_number = ? AND build != ? AND deleted_at IS NULL',
                [cleanedLegalEntityNumber, build]
              )
              if (existing.length > 0) {
                // Add warning instead of error - branches can have same legal entity number
                results.warnings.push({
                  row: rowNumber,
                  build: build,
                  warning: `เลขทะเบียนนิติบุคคลมีอยู่ในระบบแล้ว (Build Code: ${existing[0].build}) - อาจเป็นสาขา`,
                })
              }
            } catch (error) {
              // Ignore database errors
            }
          }

          // Normalize company_status - validate against ENUM values
          const companyStatusRaw = String(row['สถานะบริษัท'] || row['company_status'] || '').trim()
          const validCompanyStatuses = [
            'รายเดือน',
            'รายเดือน / วางมือ',
            'รายเดือน / จ่ายรายปี',
            'รายเดือน / เดือนสุดท้าย',
            'ยกเลิกทำ',
          ]
          // Use default if empty or not in valid list
          const companyStatus =
            companyStatusRaw && validCompanyStatuses.includes(companyStatusRaw)
              ? companyStatusRaw
              : 'รายเดือน'

          // Prepare client data
          const clientData = {
            build: build,
            business_type: row['ประเภทกิจการ'] || row['business_type'] || null,
            company_name: companyName,
            legal_entity_number: cleanedLegalEntityNumber || null,
            establishment_date: parseDate(
              row['วันจัดตั้งกิจการ'] || row['establishment_date'],
              'establishment_date',
              rowNumber
            ),
            business_category: row['ประเภทธุรกิจ'] || row['business_category'] || null,
            business_subcategory: row['ประเภทธุรกิจย่อย'] || row['business_subcategory'] || null,
            company_size: row['ไซต์บริษัท'] || row['company_size'] || null,
            tax_registration_status:
              row['สถานะจดภาษีมูลค่าเพิ่ม'] || row['tax_registration_status'] || null,
            vat_registration_date: parseDate(
              row['วันที่จดภาษีมูลค่าเพิ่ม'] || row['vat_registration_date'],
              'vat_registration_date',
              rowNumber
            ),
            full_address: row['ที่อยู่รวม'] || row['full_address'] || null,
            village: row['หมู่บ้าน'] || row['village'] || null,
            building: row['อาคาร'] || row['building'] || null,
            room_number: row['ห้องเลขที่'] || row['room_number'] || null,
            floor_number: row['ชั้นที่'] || row['floor_number'] || null,
            address_number: row['เลขที่'] || row['address_number'] || null,
            soi: row['ซอย/ตรอก'] || row['soi'] || null,
            moo: row['หมู่ที่'] || row['moo'] || null,
            road: row['ถนน'] || row['road'] || null,
            subdistrict: row['แขวง/ตำบล'] || row['subdistrict'] || null,
            district: row['อำเภอ/เขต'] || row['district'] || null,
            province: row['จังหวัด'] || row['province'] || null,
            postal_code: row['รหัสไปรษณี'] || row['postal_code'] || null,
            company_status: companyStatus,
          }

          // Check if build exists
          const [existing] = await pool.execute(
            'SELECT id FROM clients WHERE build = ? AND deleted_at IS NULL',
            [build]
          )

          if (existing.length > 0) {
            // Skip existing client - don't update, just skip
            results.skipped++
            results.warnings.push({
              row: rowNumber,
              build: build,
              warning: `Build Code มีอยู่ในระบบแล้ว - ข้ามการนำเข้า (ไม่อัพเดทข้อมูลเดิม)`,
            })
          } else {
            // Insert new client only if it doesn't exist
            const id = generateUUID()
            await pool.execute(
              `INSERT INTO clients (
                id, build, business_type, company_name, legal_entity_number,
                establishment_date, business_category, business_subcategory,
                company_size, tax_registration_status, vat_registration_date,
                full_address, village, building, room_number, floor_number,
                address_number, soi, moo, road, subdistrict, district,
                province, postal_code, company_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                clientData.build,
                clientData.business_type,
                clientData.company_name,
                clientData.legal_entity_number,
                clientData.establishment_date,
                clientData.business_category,
                clientData.business_subcategory,
                clientData.company_size,
                clientData.tax_registration_status,
                clientData.vat_registration_date,
                clientData.full_address,
                clientData.village,
                clientData.building,
                clientData.room_number,
                clientData.floor_number,
                clientData.address_number,
                clientData.soi,
                clientData.moo,
                clientData.road,
                clientData.subdistrict,
                clientData.district,
                clientData.province,
                clientData.postal_code,
                clientData.company_status,
              ]
            )
            results.success++
          }
        } catch (error) {
          results.failed++
          const build = String(data[i]?.['Build Code'] || data[i]?.['build'] || '').trim()
          results.errors.push({
            row: rowNumber,
            build: build || '',
            error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
          })
        }
      }

      // Invalidate cache for clients list and statistics after import
      invalidateCache('GET:/api/clients')

      res.json({
        success: true,
        message: `นำเข้าข้อมูลสำเร็จ ${results.success} รายการ${results.skipped > 0 ? `, ข้าม ${results.skipped} รายการ (มีอยู่ในระบบแล้ว)` : ''}${results.failed > 0 ? `, ล้มเหลว ${results.failed} รายการ` : ''}`,
        data: results,
      })
    } catch (error) {
      console.error('Client import error:', error)
      res.status(500).json({
        success: false,
        message: 'Error importing file',
        error: error.message,
      })
    }
  }
)

export default router
