/**
 * Clients - Dashboard Routes
 * Routes สำหรับ Client Dashboard และ Statistics
 *
 * แยกมาจาก clients.js เพื่อลดขนาดไฟล์
 * - GET /dashboard: ข้อมูลรวมสำหรับ Dashboard
 * - GET /province-clients: ลูกค้าในจังหวัดที่เลือก
 * - GET /province-districts: ลูกค้าแยกตามเขต/อำเภอ
 * - GET /statistics: สถิติลูกค้า
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken } from '../../middleware/auth.js'

const router = express.Router()

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

export default router
