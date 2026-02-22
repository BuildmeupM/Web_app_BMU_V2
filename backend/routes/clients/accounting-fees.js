/**
 * Clients - Accounting Fees Routes
 * Routes สำหรับจัดการค่าทำบัญชี
 *
 * แยกมาจาก clients.js เพื่อลดขนาดไฟล์
 * - GET /accounting-fees-dashboard: สรุปค่าทำบัญชี
 * - GET /accounting-fees-compare: เปรียบเทียบค่าทำบัญชี 2 เดือน
 * - GET /accounting-fees-export: ส่งออก Excel
 */

import express from 'express'
import xlsx from 'xlsx'
import pool from '../../config/database.js'
import { authenticateToken } from '../../middleware/auth.js'

const router = express.Router()

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

export default router
