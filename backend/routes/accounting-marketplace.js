/**
 * Accounting Marketplace Routes
 * Routes สำหรับระบบตลาดกลางผู้ทำบัญชี
 * เชื่อมกับหน้า ตลาดกลางผู้ทำบัญชี
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { generateUUID } from '../utils/leaveHelpers.js'
import { logActivity } from '../utils/logActivity.js'

const router = express.Router()

/**
 * Helper function: คำนวณเดือนภาษีปัจจุบัน (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
 * @returns {{year: number, month: number}} Tax month object
 */
function getCurrentTaxMonth() {
  const now = new Date()
  const taxMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    year: taxMonth.getFullYear(),
    month: taxMonth.getMonth() + 1,
  }
}

/**
 * Helper function: Format date for API response as ISO 8601 UTC (e.g. 2026-02-04T13:52:17.000Z)
 * เพื่อให้ Frontend แปลงเป็นเวลาท้องถิ่นได้ถูกต้อง (ไม่มี ambiguity)
 */
function formatDateForResponse(dateValue) {
  if (!dateValue) return null
  if (dateValue instanceof Date) {
    return dateValue.toISOString()
  }
  if (typeof dateValue === 'string') {
    const s = dateValue.trim()
    if (s.includes('T')) {
      return s.endsWith('Z') ? s : s + (s.match(/\.\d{3}$/) ? '' : '.000') + 'Z'
    }
    // ส่งกลับเป็น UTC โดยต่อท้าย Z (ข้อมูลใน DB เก็บเป็น UTC)
    return s.replace(' ', 'T') + (s.includes('.') ? '' : '.000') + 'Z'
  }
  return null
}

/**
 * Helper function: สร้าง notification สำหรับ seller เมื่องานถูกซื้อ
 */
async function createMarketplaceNotification(
  sellerEmployeeId,
  buyerEmployeeId,
  build,
  companyName,
  taxYear,
  taxMonth,
  listingId
) {
  if (!sellerEmployeeId) {
    console.log('⚠️ No seller employee_id provided - Notification will not be created')
    return null
  }

  try {
    // Get user_id from seller employee_id
    const [sellerUsers] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
      [sellerEmployeeId]
    )

    if (sellerUsers.length === 0) {
      console.log(`⚠️ No user found for seller employee_id: ${sellerEmployeeId} - Notification will not be created`)
      return null
    }

    const sellerUserId = sellerUsers[0].id

    // Get buyer name
    const [buyerEmployees] = await pool.execute(
      'SELECT first_name, nick_name FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
      [buyerEmployeeId]
    )

    const buyerName = buyerEmployees.length > 0
      ? buyerEmployees[0].nick_name
        ? `${buyerEmployees[0].first_name} (${buyerEmployees[0].nick_name})`
        : buyerEmployees[0].first_name
      : 'ไม่ทราบชื่อ'

    const notificationId = generateUUID()
    const title = 'งานถูกซื้อแล้ว'
    const message = `บริษัท ${companyName} (${build}) - เดือน ${taxMonth}/${taxYear} ถูกซื้อโดย ${buyerName}`

    // Set expires_at to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    // Insert notification
    await pool.execute(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message, 
        icon, color, action_url, action_label,
        related_user_id, related_entity_type, related_entity_id, metadata, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        sellerUserId,
        'accounting_marketplace_sold',
        'marketplace',
        'medium',
        title,
        message,
        'TbShoppingCart',
        'orange',
        `/accounting-marketplace/my-listings`,
        'ดูรายละเอียด',
        sellerUserId, // related_user_id = user_id ของ seller
        'accounting_marketplace_listing',
        listingId,
        JSON.stringify({
          build,
          company_name: companyName,
          tax_year: taxYear,
          tax_month: taxMonth,
          buyer_employee_id: buyerEmployeeId,
          buyer_name: buyerName,
        }),
        expiresAt,
      ]
    )

    console.log(`✅ Created marketplace notification for seller: ${sellerEmployeeId}`)
    return notificationId
  } catch (error) {
    console.error('Error creating marketplace notification:', error)
    return null
  }
}

/**
 * GET /api/accounting-marketplace
 * ดึงรายการงานที่ขายได้ (Available Jobs)
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
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    // Get current tax month
    const currentTaxMonth = getCurrentTaxMonth()

    // Build WHERE clause
    const whereConditions = ['aml.deleted_at IS NULL', "aml.status = 'available'"]
    const queryParams = []

    // Filter by tax month (default to current tax month)
    const taxYear = year ? parseInt(year) : currentTaxMonth.year
    const taxMonth = month ? parseInt(month) : currentTaxMonth.month

    whereConditions.push('aml.tax_year = ?')
    whereConditions.push('aml.tax_month = ?')
    queryParams.push(taxYear, taxMonth)

    // Filter by build
    if (build) {
      whereConditions.push('aml.build = ?')
      queryParams.push(build)
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(aml.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    // Exclude jobs where current user is already accounting_responsible
    const { employee_id: currentEmployeeId } = req.user
    if (currentEmployeeId) {
      whereConditions.push(`(mtd.accounting_responsible != ? OR mtd.accounting_responsible IS NULL)`)
      whereConditions.push(`(wa.accounting_responsible != ? OR wa.accounting_responsible IS NULL)`)
      queryParams.push(currentEmployeeId, currentEmployeeId)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT aml.id) as total
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN monthly_tax_data mtd ON aml.build = mtd.build 
        AND aml.tax_year = mtd.tax_year 
        AND aml.tax_month = mtd.tax_month 
        AND mtd.deleted_at IS NULL
      LEFT JOIN work_assignments wa ON aml.build = wa.build 
        AND aml.tax_year = wa.assignment_year 
        AND aml.tax_month = wa.assignment_month 
        AND wa.deleted_at IS NULL
      WHERE ${whereClause}`,
      queryParams
    )

    const total = countResult[0]?.total || 0

    // Get listings
    const [listings] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.seller_employee_id,
        e1.first_name as seller_first_name,
        e1.nick_name as seller_nick_name,
        aml.price,
        aml.status,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON aml.seller_employee_id = e1.employee_id
      LEFT JOIN monthly_tax_data mtd ON aml.build = mtd.build 
        AND aml.tax_year = mtd.tax_year 
        AND aml.tax_month = mtd.tax_month 
        AND mtd.deleted_at IS NULL
      LEFT JOIN work_assignments wa ON aml.build = wa.build 
        AND aml.tax_year = wa.assignment_year 
        AND aml.tax_month = wa.assignment_month 
        AND wa.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY aml.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    // Format dates
    const formattedListings = listings.map((listing) => ({
      ...listing,
      created_at: formatDateForResponse(listing.created_at),
      updated_at: formatDateForResponse(listing.updated_at),
    }))

    res.json({
      success: true,
      data: formattedListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching available jobs:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายการงานที่ขายได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-marketplace/my-listings
 * ดึงรายการงานที่ฉันขาย (My Listings)
 * Access: All authenticated users
 */
router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      build = '',
      status = '',
      search = '',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const { employee_id: currentEmployeeId } = req.user

    if (!currentEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Build WHERE clause
    const whereConditions = ['aml.deleted_at IS NULL', 'aml.seller_employee_id = ?']
    const queryParams = [currentEmployeeId]

    // Filter by build
    if (build) {
      whereConditions.push('aml.build = ?')
      queryParams.push(build)
    }

    // Filter by status
    if (status) {
      whereConditions.push('aml.status = ?')
      queryParams.push(status)
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(aml.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT aml.id) as total
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      WHERE ${whereClause}`,
      queryParams
    )

    const total = countResult[0]?.total || 0

    // Get listings
    const [listings] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.price,
        aml.status,
        aml.sold_to_employee_id,
        e2.first_name as buyer_first_name,
        e2.nick_name as buyer_nick_name,
        aml.sold_at,
        aml.cancelled_at,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e2 ON aml.sold_to_employee_id = e2.employee_id
      WHERE ${whereClause}
      ORDER BY aml.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    // Format dates
    const formattedListings = listings.map((listing) => ({
      ...listing,
      sold_at: formatDateForResponse(listing.sold_at),
      cancelled_at: formatDateForResponse(listing.cancelled_at),
      created_at: formatDateForResponse(listing.created_at),
      updated_at: formatDateForResponse(listing.updated_at),
    }))

    res.json({
      success: true,
      data: formattedListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching my listings:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายการงานที่ฉันขายได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-marketplace/purchased
 * ดึงรายการงานที่ฉันซื้อ (Purchased Jobs)
 * Access: All authenticated users
 */
router.get('/purchased', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      build = '',
      year = '',
      month = '',
      search = '',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const { employee_id: currentEmployeeId } = req.user

    if (!currentEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Build WHERE clause
    const whereConditions = ['aml.deleted_at IS NULL', 'aml.status = ?', 'aml.sold_to_employee_id = ?']
    const queryParams = ['sold', currentEmployeeId]

    // Filter by build
    if (build) {
      whereConditions.push('aml.build = ?')
      queryParams.push(build)
    }

    // Filter by year and month
    if (year) {
      whereConditions.push('aml.tax_year = ?')
      queryParams.push(parseInt(year))
    }
    if (month) {
      whereConditions.push('aml.tax_month = ?')
      queryParams.push(parseInt(month))
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(aml.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT aml.id) as total
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      WHERE ${whereClause}`,
      queryParams
    )

    const total = countResult[0]?.total || 0

    // Get listings
    const [listings] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.seller_employee_id,
        e1.first_name as seller_first_name,
        e1.nick_name as seller_nick_name,
        aml.price,
        aml.sold_at,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON aml.seller_employee_id = e1.employee_id
      WHERE ${whereClause}
      ORDER BY aml.sold_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    )

    // Format dates
    const formattedListings = listings.map((listing) => ({
      ...listing,
      sold_at: formatDateForResponse(listing.sold_at),
      created_at: formatDateForResponse(listing.created_at),
      updated_at: formatDateForResponse(listing.updated_at),
    }))

    res.json({
      success: true,
      data: formattedListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching purchased jobs:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายการงานที่ฉันซื้อได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-marketplace/history
 * ประวัติการซื้อขาย
 * Access: All authenticated users
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      build = '',
      year = '',
      month = '',
      type = '', // 'sell' or 'buy'
      search = '',
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const offset = (pageNum - 1) * limitNum

    const { employee_id: currentEmployeeId } = req.user

    if (!currentEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Build WHERE clause
    const whereConditions = [
      'aml.deleted_at IS NULL',
      '(aml.seller_employee_id = ? OR aml.sold_to_employee_id = ?)',
    ]
    const queryParams = [currentEmployeeId, currentEmployeeId]

    // Filter by build
    if (build) {
      whereConditions.push('aml.build = ?')
      queryParams.push(build)
    }

    // Filter by year and month
    if (year) {
      whereConditions.push('aml.tax_year = ?')
      queryParams.push(parseInt(year))
    }
    if (month) {
      whereConditions.push('aml.tax_month = ?')
      queryParams.push(parseInt(month))
    }

    // Filter by type (sell or buy)
    if (type === 'sell') {
      whereConditions.push('aml.seller_employee_id = ?')
      queryParams.push(currentEmployeeId)
    } else if (type === 'buy') {
      whereConditions.push('aml.sold_to_employee_id = ?')
      queryParams.push(currentEmployeeId)
    }

    // Search by build or company_name
    if (search) {
      whereConditions.push('(aml.build LIKE ? OR c.company_name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT aml.id) as total
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      WHERE ${whereClause}`,
      queryParams
    )

    const total = countResult[0]?.total || 0

    // Get listings
    const [listings] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.seller_employee_id,
        e1.first_name as seller_first_name,
        e1.nick_name as seller_nick_name,
        aml.sold_to_employee_id,
        e2.first_name as buyer_first_name,
        e2.nick_name as buyer_nick_name,
        aml.price,
        aml.status,
        aml.sold_at,
        aml.cancelled_at,
        aml.created_at,
        aml.updated_at,
        CASE 
          WHEN aml.seller_employee_id = ? THEN 'sell'
          WHEN aml.sold_to_employee_id = ? THEN 'buy'
          ELSE NULL
        END as transaction_type
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON aml.seller_employee_id = e1.employee_id
      LEFT JOIN employees e2 ON aml.sold_to_employee_id = e2.employee_id
      WHERE ${whereClause}
      ORDER BY aml.created_at DESC
      LIMIT ? OFFSET ?`,
      [currentEmployeeId, currentEmployeeId, ...queryParams, limitNum, offset]
    )

    // Format dates
    const formattedListings = listings.map((listing) => ({
      ...listing,
      sold_at: formatDateForResponse(listing.sold_at),
      cancelled_at: formatDateForResponse(listing.cancelled_at),
      created_at: formatDateForResponse(listing.created_at),
      updated_at: formatDateForResponse(listing.updated_at),
    }))

    res.json({
      success: true,
      data: formattedListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงประวัติการซื้อขายได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-marketplace/buyer-income
 * รายได้รายเดือนของคนที่ซื้องาน
 * Access: All authenticated users
 */
router.get('/buyer-income', authenticateToken, async (req, res) => {
  try {
    const {
      year = '',
      month = '',
      employee_id = '',
    } = req.query

    const { employee_id: currentEmployeeId, role } = req.user

    // Build WHERE clause
    const whereConditions = ['aml.deleted_at IS NULL', "aml.status = 'sold'"]
    const queryParams = []

    // Filter by employee_id (default to current user if not admin)
    const targetEmployeeId = employee_id || (role !== 'admin' ? currentEmployeeId : null)
    if (targetEmployeeId) {
      whereConditions.push('aml.sold_to_employee_id = ?')
      queryParams.push(targetEmployeeId)
    }

    // Filter by year and month
    if (year) {
      whereConditions.push('aml.tax_year = ?')
      queryParams.push(parseInt(year))
    }
    if (month) {
      whereConditions.push('aml.tax_month = ?')
      queryParams.push(parseInt(month))
    }

    const whereClause = whereConditions.join(' AND ')

    // Get buyer income grouped by month
    const [incomeData] = await pool.execute(
      `SELECT 
        aml.tax_year,
        aml.tax_month,
        aml.sold_to_employee_id,
        e.first_name as buyer_first_name,
        e.nick_name as buyer_nick_name,
        COUNT(aml.id) as job_count,
        SUM(aml.price) as total_income
      FROM accounting_marketplace_listings aml
      LEFT JOIN employees e ON aml.sold_to_employee_id = e.employee_id
      WHERE ${whereClause}
      GROUP BY aml.tax_year, aml.tax_month, aml.sold_to_employee_id, e.first_name, e.nick_name
      ORDER BY aml.tax_year DESC, aml.tax_month DESC`,
      queryParams
    )

    res.json({
      success: true,
      data: incomeData,
    })
  } catch (error) {
    console.error('Error fetching buyer income:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายได้รายเดือนได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/accounting-marketplace/eligible-builds
 * ดึง Build ที่สามารถขายได้
 * Access: All authenticated users
 * - Admin: แสดง Build ทั้งหมดที่มีการจัดงานแล้วใน work_assignments หรือ monthly_tax_data
 * - Non-admin: แสดงเฉพาะ Build ที่ตัวเองเป็น accounting_responsible
 */
router.get('/eligible-builds', authenticateToken, async (req, res) => {
  try {
    const { employee_id: currentEmployeeId, role } = req.user
    const currentTaxMonth = getCurrentTaxMonth()

    if (!currentEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    let buildsQuery = ''
    let queryParams = []

    if (role === 'admin') {
      // Admin: แสดง Build ทั้งหมดที่มีการจัดงานแล้วใน work_assignments หรือ monthly_tax_data
      buildsQuery = `
        SELECT DISTINCT c.build, c.company_name
        FROM clients c
        WHERE c.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM work_assignments wa
            WHERE wa.build = c.build
            AND wa.assignment_year = ?
            AND wa.assignment_month = ?
            AND wa.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM monthly_tax_data mtd
            WHERE mtd.build = c.build
            AND mtd.tax_year = ?
            AND mtd.tax_month = ?
            AND mtd.deleted_at IS NULL
          )
        )
        ORDER BY c.build ASC
      `
      queryParams = [
        currentTaxMonth.year,
        currentTaxMonth.month,
        currentTaxMonth.year,
        currentTaxMonth.month,
      ]
    } else {
      // Non-admin: แสดงเฉพาะ Build ที่ตัวเองเป็น accounting_responsible
      buildsQuery = `
        SELECT DISTINCT c.build, c.company_name
        FROM clients c
        WHERE c.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM work_assignments wa
            WHERE wa.build = c.build
            AND wa.assignment_year = ?
            AND wa.assignment_month = ?
            AND wa.accounting_responsible = ?
            AND wa.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM monthly_tax_data mtd
            WHERE mtd.build = c.build
            AND mtd.tax_year = ?
            AND mtd.tax_month = ?
            AND mtd.accounting_responsible = ?
            AND mtd.deleted_at IS NULL
          )
        )
        ORDER BY c.build ASC
      `
      queryParams = [
        currentTaxMonth.year,
        currentTaxMonth.month,
        currentEmployeeId,
        currentTaxMonth.year,
        currentTaxMonth.month,
        currentEmployeeId,
      ]
    }

    const [builds] = await pool.execute(buildsQuery, queryParams)

    res.json({
      success: true,
      data: builds.map((row) => ({
        build: row.build,
        company_name: row.company_name,
        label: `${row.build} - ${row.company_name}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching eligible builds:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึง Build ที่สามารถขายได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/accounting-marketplace
 * สร้างรายการขายงาน
 * Access: All authenticated users (but must be accounting_responsible or admin)
 */
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { build, tax_year, tax_month, price } = req.body
    const { employee_id: sellerEmployeeId, role } = req.user

    if (!sellerEmployeeId) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Validation
    if (!build || !tax_year || !tax_month || !price) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      })
    }

    // Validate price (minimum 300)
    if (parseFloat(price) < 300) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ราคาต้องไม่ต่ำกว่า 300 บาท',
      })
    }

    // Get current tax month
    const currentTaxMonth = getCurrentTaxMonth()

    // Validate tax month (must be current tax month)
    if (parseInt(tax_year) !== currentTaxMonth.year || parseInt(tax_month) !== currentTaxMonth.month) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: `สามารถขายงานได้เฉพาะเดือนภาษีปัจจุบันเท่านั้น (${currentTaxMonth.month}/${currentTaxMonth.year})`,
      })
    }

    // Check if work exists in work_assignments or monthly_tax_data
    const [taxDataCheck] = await connection.execute(
      `SELECT accounting_responsible 
      FROM monthly_tax_data 
      WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL
      LIMIT 1`,
      [build, tax_year, tax_month]
    )

    const [workAssignmentCheck] = await connection.execute(
      `SELECT accounting_responsible 
      FROM work_assignments 
      WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL
      LIMIT 1`,
      [build, tax_year, tax_month]
    )

    // Validate: Admin can list any assigned work, non-admin must be accounting_responsible
    if (role === 'admin') {
      // Admin: ต้องมีงานใน work_assignments หรือ monthly_tax_data
      if (taxDataCheck.length === 0 && workAssignmentCheck.length === 0) {
        await connection.rollback()
        return res.status(403).json({
          success: false,
          message: 'ไม่พบงานที่จัดงานแล้วสำหรับ Build และเดือนภาษีนี้',
        })
      }
    } else {
      // Non-admin: ต้องเป็น accounting_responsible เท่านั้น (ตรวจสอบทั้ง work_assignments และ monthly_tax_data)
      // Priority: ตรวจสอบ work_assignments ก่อน (เพราะเป็นตารางหลัก) แล้วค่อยตรวจสอบ monthly_tax_data
      let isAccountingResponsible = false

      if (workAssignmentCheck.length > 0) {
        // มีข้อมูลใน work_assignments → ต้องเป็น accounting_responsible ใน work_assignments
        isAccountingResponsible = workAssignmentCheck[0].accounting_responsible === sellerEmployeeId
      } else if (taxDataCheck.length > 0) {
        // ไม่มีใน work_assignments แต่มีใน monthly_tax_data → ต้องเป็น accounting_responsible ใน monthly_tax_data
        isAccountingResponsible = taxDataCheck[0].accounting_responsible === sellerEmployeeId
      } else {
        // ไม่มีข้อมูลในทั้ง 2 ตาราง
        await connection.rollback()
        return res.status(403).json({
          success: false,
          message: 'ไม่พบงานที่จัดงานแล้วสำหรับ Build และเดือนภาษีนี้',
        })
      }

      if (!isAccountingResponsible) {
        await connection.rollback()
        return res.status(403).json({
          success: false,
          message: 'คุณไม่ใช่ผู้ทำบัญชีที่รับผิดชอบงานนี้ - เฉพาะผู้รับผิดชอบงานเท่านั้นที่สามารถขายงานได้',
        })
      }
    }

    // Check if listing already exists for this build and month
    const [existingListing] = await connection.execute(
      `SELECT id FROM accounting_marketplace_listings 
      WHERE build = ? AND tax_year = ? AND tax_month = ? 
      AND status = 'available' AND deleted_at IS NULL
      LIMIT 1`,
      [build, tax_year, tax_month]
    )

    if (existingListing.length > 0) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'มีรายการขายงานนี้อยู่แล้ว',
      })
    }

    // Create listing
    const listingId = generateUUID()
    await connection.execute(
      `INSERT INTO accounting_marketplace_listings (
        id, build, tax_year, tax_month, seller_employee_id, price, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'available')`,
      [listingId, build, tax_year, tax_month, sellerEmployeeId, parseFloat(price)]
    )

    await connection.commit()

    // ═══ Activity Log ═══
    const [logCompany] = await pool.execute('SELECT company_name FROM clients WHERE build = ? AND deleted_at IS NULL LIMIT 1', [build])
    logActivity({
      userId: req.user.id,
      employeeId: sellerEmployeeId,
      userName: req.user.name || req.user.username,
      action: 'listing_create',
      page: 'accounting_marketplace',
      entityType: 'accounting_marketplace_listings',
      entityId: listingId,
      build,
      companyName: logCompany[0]?.company_name || build,
      description: `ลงขายงาน ราคา ${price} บาท`,
      metadata: { taxYear: tax_year, taxMonth: tax_month, price },
      ipAddress: req.ip,
    })

    // Get created listing
    const [newListing] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.seller_employee_id,
        e.first_name as seller_first_name,
        e.nick_name as seller_nick_name,
        aml.price,
        aml.status,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e ON aml.seller_employee_id = e.employee_id
      WHERE aml.id = ?`,
      [listingId]
    )

    res.status(201).json({
      success: true,
      message: 'สร้างรายการขายงานสำเร็จ',
      data: {
        ...newListing[0],
        created_at: formatDateForResponse(newListing[0].created_at),
        updated_at: formatDateForResponse(newListing[0].updated_at),
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error creating listing:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างรายการขายงานได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

/**
 * POST /api/accounting-marketplace/:id/purchase
 * ซื้องาน
 * Access: All authenticated users (but must have correct role)
 */
router.post('/:id/purchase', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const { employee_id: buyerEmployeeId, role } = req.user

    if (!buyerEmployeeId) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Validate role (admin, data_entry_and_service, audit, service)
    const allowedRoles = ['admin', 'data_entry_and_service', 'audit', 'service']
    if (!allowedRoles.includes(role)) {
      await connection.rollback()
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ซื้องาน',
      })
    }

    // Get listing
    const [listings] = await connection.execute(
      `SELECT 
        aml.*,
        c.company_name
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      WHERE aml.id = ? AND aml.deleted_at IS NULL`,
      [id]
    )

    if (listings.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการขายงาน',
      })
    }

    const listing = listings[0]

    // Validate status
    if (listing.status !== 'available') {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'รายการนี้ไม่สามารถซื้อได้ (อาจถูกซื้อไปแล้วหรือถูกยกเลิก)',
      })
    }

    // Validate buyer is not seller
    if (listing.seller_employee_id === buyerEmployeeId) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถซื้องานที่ตัวเองขายได้',
      })
    }

    // Update listing status
    const soldAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await connection.execute(
      `UPDATE accounting_marketplace_listings 
      SET status = 'sold', sold_to_employee_id = ?, sold_at = ?
      WHERE id = ?`,
      [buyerEmployeeId, soldAt, id]
    )

    // Get seller employee ID from listing
    const sellerEmployeeId = listing.seller_employee_id

    // Update accounting_responsible in monthly_tax_data
    // Also set purchased_by_accounting_responsible and current_accounting_responsible
    // If original_accounting_responsible is NULL, set it to seller (preserve original assignment)
    await connection.execute(
      `UPDATE monthly_tax_data 
      SET 
        accounting_responsible = ?,
        purchased_by_accounting_responsible = ?,
        current_accounting_responsible = ?,
        original_accounting_responsible = COALESCE(original_accounting_responsible, ?)
      WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL`,
      [
        buyerEmployeeId, // accounting_responsible
        buyerEmployeeId, // purchased_by_accounting_responsible
        buyerEmployeeId, // current_accounting_responsible
        sellerEmployeeId, // original_accounting_responsible (only if NULL)
        listing.build,
        listing.tax_year,
        listing.tax_month,
      ]
    )

    // Update accounting_responsible in work_assignments
    // Also set purchased_by_accounting_responsible and current_accounting_responsible
    // If original_accounting_responsible is NULL, set it to seller (preserve original assignment)
    await connection.execute(
      `UPDATE work_assignments 
      SET 
        accounting_responsible = ?,
        purchased_by_accounting_responsible = ?,
        current_accounting_responsible = ?,
        original_accounting_responsible = COALESCE(original_accounting_responsible, ?)
      WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL`,
      [
        buyerEmployeeId, // accounting_responsible
        buyerEmployeeId, // purchased_by_accounting_responsible
        buyerEmployeeId, // current_accounting_responsible
        sellerEmployeeId, // original_accounting_responsible (only if NULL)
        listing.build,
        listing.tax_year,
        listing.tax_month,
      ]
    )

    await connection.commit()

    // ═══ Activity Log ═══
    logActivity({
      userId: req.user.id,
      employeeId: buyerEmployeeId,
      userName: req.user.name || req.user.username,
      action: 'listing_purchase',
      page: 'accounting_marketplace',
      entityType: 'accounting_marketplace_listings',
      entityId: id,
      build: listing.build,
      companyName: listing.company_name || listing.build,
      description: `ซื้องาน ราคา ${listing.price} บาท`,
      metadata: { taxYear: listing.tax_year, taxMonth: listing.tax_month, price: listing.price, sellerEmployeeId: listing.seller_employee_id },
      ipAddress: req.ip,
    })

    // Create notification for seller
    await createMarketplaceNotification(
      listing.seller_employee_id,
      buyerEmployeeId,
      listing.build,
      listing.company_name,
      listing.tax_year,
      listing.tax_month,
      id
    )

    // Get updated listing
    const [updatedListing] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.seller_employee_id,
        e1.first_name as seller_first_name,
        e1.nick_name as seller_nick_name,
        aml.sold_to_employee_id,
        e2.first_name as buyer_first_name,
        e2.nick_name as buyer_nick_name,
        aml.price,
        aml.status,
        aml.sold_at,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN employees e1 ON aml.seller_employee_id = e1.employee_id
      LEFT JOIN employees e2 ON aml.sold_to_employee_id = e2.employee_id
      WHERE aml.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: 'ซื้องานสำเร็จ',
      data: {
        ...updatedListing[0],
        sold_at: formatDateForResponse(updatedListing[0].sold_at),
        created_at: formatDateForResponse(updatedListing[0].created_at),
        updated_at: formatDateForResponse(updatedListing[0].updated_at),
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error purchasing listing:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถซื้องานได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

/**
 * POST /api/accounting-marketplace/:id/cancel
 * ยกเลิกรายการขาย
 * Access: All authenticated users (but must be seller)
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const { employee_id: currentEmployeeId } = req.user

    if (!currentEmployeeId) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ employee_id ของผู้ใช้',
      })
    }

    // Get listing
    const [listings] = await connection.execute(
      `SELECT * FROM accounting_marketplace_listings 
      WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )

    if (listings.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการขายงาน',
      })
    }

    const listing = listings[0]

    // Validate status
    if (listing.status !== 'available') {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถยกเลิกรายการที่ขายแล้วหรือยกเลิกแล้วได้',
      })
    }

    // Validate seller
    if (listing.seller_employee_id !== currentEmployeeId) {
      await connection.rollback()
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ยกเลิกรายการนี้',
      })
    }

    // Update listing status
    const cancelledAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await connection.execute(
      `UPDATE accounting_marketplace_listings 
      SET status = 'cancelled', cancelled_at = ?
      WHERE id = ?`,
      [cancelledAt, id]
    )

    await connection.commit()

    // ═══ Activity Log ═══
    logActivity({
      userId: req.user.id,
      employeeId: currentEmployeeId,
      userName: req.user.name || req.user.username,
      action: 'listing_cancel',
      page: 'accounting_marketplace',
      entityType: 'accounting_marketplace_listings',
      entityId: id,
      build: listing.build,
      description: `ยกเลิกรายการขายงาน`,
      metadata: { taxYear: listing.tax_year, taxMonth: listing.tax_month, price: listing.price },
      ipAddress: req.ip,
    })

    // Get updated listing
    const [updatedListing] = await pool.execute(
      `SELECT 
        aml.id,
        aml.build,
        c.company_name,
        aml.tax_year,
        aml.tax_month,
        aml.price,
        aml.status,
        aml.cancelled_at,
        aml.created_at,
        aml.updated_at
      FROM accounting_marketplace_listings aml
      LEFT JOIN clients c ON aml.build = c.build AND c.deleted_at IS NULL
      WHERE aml.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: 'ยกเลิกรายการขายสำเร็จ',
      data: {
        ...updatedListing[0],
        cancelled_at: formatDateForResponse(updatedListing[0].cancelled_at),
        created_at: formatDateForResponse(updatedListing[0].created_at),
        updated_at: formatDateForResponse(updatedListing[0].updated_at),
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error cancelling listing:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถยกเลิกรายการขายได้',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

export default router
