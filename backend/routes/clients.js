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
        c.updated_at
      FROM clients c
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

    res.json({
      success: true,
      data: {
        total,
        byCompanyStatus: companyStatusCounts,
        byTaxRegistrationStatus: taxStatusCounts,
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
 * ดึงข้อมูลลูกค้าตาม Build code
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

    res.json({
      success: true,
      data: clients[0],
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
 * สร้างลูกค้าใหม่
 * Access: Admin/HR only
 */
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
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

    // Get created client
    const [newClients] = await pool.execute(
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
      WHERE c.id = ?`,
      [id]
    )

    // Invalidate cache for clients list and statistics
    invalidateCache('GET:/api/clients')

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: newClients[0],
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
 * แก้ไขข้อมูลลูกค้า
 * Access: Admin/HR only
 */
router.put('/:build', authenticateToken, authorize('admin'), async (req, res) => {
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

    // Get updated client
    const [updatedClients] = await pool.execute(
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
      WHERE c.build = ?`,
      [build]
    )

    // Invalidate cache for clients list, statistics, and this specific client
    invalidateCache('GET:/api/clients')

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClients[0],
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
