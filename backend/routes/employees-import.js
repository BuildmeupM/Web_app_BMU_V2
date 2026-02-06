/**
 * Employee Import Routes
 * Routes สำหรับการนำเข้าข้อมูลพนักงานจาก Excel
 */

import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

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
 * POST /api/employees/import/validate
 * Validate Excel file before import
 * Access: Admin only
 */
router.post(
  '/import/validate',
  authenticateToken,
  authorize('admin'),
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
      // Use raw: true to get Excel serial numbers for dates (more reliable than Date objects)
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
        warnings: [], // เพิ่ม warnings สำหรับข้อมูลที่ซ้ำกันแต่ยังสามารถ import ได้
      }

      // Track emails within the file to detect duplicates
      const emailMap = new Map() // email -> [row numbers]
      const employeeIdMap = new Map() // employee_id -> [row numbers]

      // First pass: collect all emails and employee_ids to check for duplicates within file
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const companyEmail = (row['Email Build'] || row['company_email'] || '').toLowerCase().trim()
        const employeeId = (row['รหัสพนักงาน'] || row['employee_id'] || '').trim()

        if (companyEmail) {
          if (!emailMap.has(companyEmail)) {
            emailMap.set(companyEmail, [])
          }
          emailMap.get(companyEmail).push(i + 2)
        }

        if (employeeId) {
          if (!employeeIdMap.has(employeeId)) {
            employeeIdMap.set(employeeId, [])
          }
          employeeIdMap.get(employeeId).push(i + 2)
        }
      }

      // Get existing emails and employee_ids from database
      const [existingEmployees] = await pool.execute(
        `SELECT employee_id, company_email FROM employees WHERE deleted_at IS NULL`
      )
      const existingEmails = new Set(
        existingEmployees
          .map((e) => (e.company_email || '').toLowerCase().trim())
          .filter((e) => e)
      )
      const existingEmployeeIds = new Set(
        existingEmployees.map((e) => e.employee_id).filter((e) => e)
      )

      // Validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2 // +2 because Excel starts at row 1, and row 1 is header

        const missingFields = []
        const errors = []

        // Check required fields
        if (!row['รหัสพนักงาน'] && !row['employee_id']) missingFields.push('รหัสพนักงาน')
        if (!row['ตำแหน่ง'] && !row['position']) missingFields.push('ตำแหน่ง')
        if (!row['รหัสบัตรประชาชน'] && !row['id_card']) missingFields.push('รหัสบัตรประชาชน')
        if (!row['เพศ'] && !row['gender']) missingFields.push('เพศ')
        if (!row['ชื่อจริง'] && !row['first_name']) missingFields.push('ชื่อจริง')
        if (!row['นามสกุล'] && !row['last_name']) missingFields.push('นามสกุล')
        if (!row['ชื่อเล่น'] && !row['nick_name']) missingFields.push('ชื่อเล่น')

        // Validate id_card format (if provided)
        const idCard = String(row['รหัสบัตรประชาชน'] || row['id_card'] || '').replace(/-/g, '')
        if (idCard && idCard.length !== 13) {
          errors.push('รหัสบัตรประชาชนต้องเป็น 13 หลัก')
        }

        // Check duplicate employee_id within file (warning only)
        const employeeId = (row['รหัสพนักงาน'] || row['employee_id'] || '').trim()
        const warnings = []
        
        if (employeeId) {
          const duplicateRows = employeeIdMap.get(employeeId) || []
          if (duplicateRows.length > 1) {
            // Find the first occurrence (lowest row number)
            const firstRow = Math.min(...duplicateRows)
            if (rowNumber === firstRow) {
              warnings.push(`รหัสพนักงานซ้ำในไฟล์ (แถว: ${duplicateRows.join(', ')}) - แถวนี้จะถูกนำเข้า แถวอื่นจะถูกอัพเดท`)
            } else {
              warnings.push(`รหัสพนักงานซ้ำในไฟล์ (แถว: ${duplicateRows.join(', ')}) - จะอัพเดทข้อมูลจากแถวแรก`)
            }
          }
          // Check if exists in database (warning only - will update instead of insert)
          if (existingEmployeeIds.has(employeeId)) {
            warnings.push(`รหัสพนักงานซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ - จะอัพเดทข้อมูลแทนการสร้างใหม่`)
          }
        }

        // Check duplicate company_email within file (warning only - ไม่ข้ามข้อมูล)
        const companyEmail = (row['Email Build'] || row['company_email'] || '').toLowerCase().trim()
        if (companyEmail) {
          const duplicateRows = emailMap.get(companyEmail) || []
          if (duplicateRows.length > 1) {
            // แจ้งเตือนว่าซ้ำกัน แต่ระบบจะนำเข้าทั้งหมด
            warnings.push(`Email Build ซ้ำในไฟล์ (แถว: ${duplicateRows.join(', ')}) - ระบบจะนำเข้าข้อมูลทั้งหมด (Email Build อาจซ้ำกัน)`)
          }
          // Check if exists in database (warning only - ไม่ข้ามข้อมูล)
          if (existingEmails.has(companyEmail)) {
            warnings.push(`Email Build ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ - ระบบจะนำเข้าข้อมูลทั้งหมด`)
          }
        }

        if (missingFields.length > 0 || errors.length > 0) {
          validationResults.invalid++
          validationResults.errors.push({
            row: rowNumber,
            employee_id: employeeId || 'N/A',
            missingFields,
            errors,
            warnings, // เพิ่ม warnings ใน errors
          })
        } else {
          validationResults.valid++
          // เพิ่ม warnings สำหรับแถวที่ valid แต่มี warnings
          if (warnings.length > 0) {
            validationResults.warnings.push({
              row: rowNumber,
              employee_id: employeeId || 'N/A',
              warnings,
            })
          }
        }
      }

      res.json({
        success: true,
        data: validationResults,
      })
    } catch (error) {
      console.error('Validation error:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating file',
        error: error.message,
      })
    }
  }
)

/**
 * POST /api/employees/import
 * Import employees from Excel file
 * Access: Admin only
 */
router.post(
  '/import',
  authenticateToken,
  authorize('admin'),
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
      // Use raw: true to get Excel serial numbers for dates (more reliable than Date objects)
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
        updated: 0, // เพิ่มจำนวนที่ update แทน insert
        skipped: 0, // เพิ่มจำนวนที่ skip
        errors: [],
        warnings: [], // เพิ่ม warnings
      }

      // Track which emails have been used in this import batch
      const usedEmailsInBatch = new Set()

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2 // +2 because Excel starts at row 1, and row 1 is header

        try {
          // Map Excel columns to database fields
          const employeeData = {
            employee_id: row['รหัสพนักงาน'] || row['employee_id'],
            position: row['ตำแหน่ง'] || row['position'],
            id_card: String(row['รหัสบัตรประชาชน'] || row['id_card']).replace(/-/g, ''),
            gender: mapGender(row['เพศ'] || row['gender']),
            first_name: row['ชื่อจริง'] || row['first_name'],
            last_name: row['นามสกุล'] || row['last_name'],
            english_name: row['ชื่อภาษาอังกฤษ'] || row['english_name'] || null,
            nick_name: row['ชื่อเล่น'] || row['nick_name'] || null,
            birth_date: parseDate(row['วันเกิด'] || row['birth_date'], 'birth_date', rowNumber),
            phone: row['เบอร์โทร'] || row['phone'] || null,
            personal_email: row['Email'] || row['personal_email'] || null,
            company_email: row['Email Build'] || row['company_email'] || null,
            company_email_password: row['PassWord E-mail Buildme'] || row['company_email_password'] || null,
            hire_date: parseDate(row['วันเริ่มงาน'] || row['hire_date'], 'hire_date', rowNumber),
            probation_end_date: parseDate(row['วันผ่านงาน'] || row['probation_end_date'], 'probation_end_date', rowNumber),
            resignation_date: parseDate(row['วันสิ้นสุด'] || row['resignation_date'], 'resignation_date', rowNumber),
            status: mapStatus(row['สถานะงาน'] || row['status']),
            address_full: row['ที่อยู่'] || row['address_full'] || null,
            village: row['หมู่บ้าน'] || row['village'] || null,
            building: row['อาคาร'] || row['building'] || null,
            room_number: row['ห้องเลขที่'] || row['room_number'] || null,
            floor_number: row['ชั้นที่'] || row['floor_number'] || null,
            house_number: row['เลขที่'] || row['house_number'] || null,
            soi_alley: row['ซอย/ตรอก'] || row['soi_alley'] || null,
            moo: row['หมู่ที่'] || row['moo'] || null,
            road: row['ถนน'] || row['road'] || null,
            sub_district: row['แขวง/ตำบล'] || row['sub_district'] || null,
            district: row['อำเภอ/เขต'] || row['district'] || null,
            province: row['จังหวัด'] || row['province'] || null,
            postal_code: row['รหัสไปรษณีย์'] || row['postal_code'] || null,
            profile_image: row['รูปภาพ'] || row['profile_image'] || null,
          }

          // Validate required fields
          const missingFields = []
          if (!employeeData.employee_id) missingFields.push('รหัสพนักงาน')
          if (!employeeData.position) missingFields.push('ตำแหน่ง')
          if (!employeeData.id_card) missingFields.push('รหัสบัตรประชาชน')
          if (!employeeData.gender) missingFields.push('เพศ')
          if (!employeeData.first_name) missingFields.push('ชื่อจริง')
          if (!employeeData.last_name) missingFields.push('นามสกุล')
          if (!employeeData.nick_name) missingFields.push('ชื่อเล่น')
          
          if (missingFields.length > 0) {
            throw new Error(`ข้อมูลไม่ครบ: ${missingFields.join(', ')}`)
          }

          // Check if employee_id already exists (including soft-deleted)
          // First check if exists (including soft-deleted) to decide update vs insert
          const [existingAll] = await pool.execute(
            'SELECT id, deleted_at FROM employees WHERE employee_id = ?',
            [employeeData.employee_id]
          )
          
          // Check if exists and not deleted (for update logic)
          const [existing] = await pool.execute(
            'SELECT id FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
            [employeeData.employee_id]
          )

          let isUpdate = false
          let employeeDbId = null
          let isRestore = false

          if (existingAll.length > 0) {
            employeeDbId = existingAll[0].id
            
            if (existing.length > 0) {
              // Employee exists and not deleted - will update
              isUpdate = true
              results.warnings.push({
                row: rowNumber,
                employee_id: employeeData.employee_id,
                warning: `รหัสพนักงานซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ - จะอัพเดทข้อมูลแทนการสร้างใหม่`,
              })
            } else if (existingAll[0].deleted_at) {
              // Employee exists but was soft-deleted - restore it by updating deleted_at to NULL
              isUpdate = true
              isRestore = true
              results.warnings.push({
                row: rowNumber,
                employee_id: employeeData.employee_id,
                warning: `รหัสพนักงานซ้ำกับข้อมูลที่ถูกลบไปแล้ว - จะกู้คืนข้อมูลและอัพเดท`,
              })
            }
          }

          // Check for duplicate company_email (if provided) - แจ้งเตือนเท่านั้น ไม่ข้ามข้อมูล
          if (employeeData.company_email) {
            const emailLower = employeeData.company_email.toLowerCase().trim()
            
            // Check if email was already used in this batch
            if (usedEmailsInBatch.has(emailLower)) {
              results.warnings.push({
                row: rowNumber,
                employee_id: employeeData.employee_id,
                warning: `Email Build ซ้ำในไฟล์ - ระบบจะนำเข้าข้อมูลทั้งหมด (Email Build อาจซ้ำกัน)`,
              })
              // ไม่ข้ามข้อมูล - อนุญาตให้ซ้ำกันได้
            } else {
              // Check if email exists in database
              const [existingEmail] = await pool.execute(
                'SELECT id, employee_id FROM employees WHERE company_email = ? AND deleted_at IS NULL',
                [emailLower]
              )

              if (existingEmail.length > 0) {
                // If updating existing employee, check if email belongs to different employee
                if (isUpdate && existingEmail[0].id !== employeeDbId) {
                  // Email belongs to different employee - แจ้งเตือนแต่ยังนำเข้า
                  results.warnings.push({
                    row: rowNumber,
                    employee_id: employeeData.employee_id,
                    warning: `Email Build ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ: ${employeeData.company_email} (รหัสพนักงาน: ${existingEmail[0].employee_id}) - ระบบจะนำเข้าข้อมูลทั้งหมด`,
                  })
                  // ไม่ข้ามข้อมูล - อนุญาตให้ซ้ำกันได้
                } else if (!isUpdate) {
                  // New employee but email exists - แจ้งเตือนแต่ยังนำเข้า
                  results.warnings.push({
                    row: rowNumber,
                    employee_id: employeeData.employee_id,
                    warning: `Email Build ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ: ${employeeData.company_email} (รหัสพนักงาน: ${existingEmail[0].employee_id}) - ระบบจะนำเข้าข้อมูลทั้งหมด`,
                  })
                  // ไม่ข้ามข้อมูล - อนุญาตให้ซ้ำกันได้
                }
                // If isUpdate and email belongs to same employee, keep it (no warning needed)
              }
              
              // Mark as used in this batch (เพื่อแจ้งเตือนแถวถัดไป)
              usedEmailsInBatch.add(emailLower)
            }
          }

          if (isUpdate) {
            // Update existing employee (and restore if soft-deleted)
            await pool.execute(
              `UPDATE employees SET
                position = ?, id_card = ?, gender = ?, first_name = ?, last_name = ?,
                english_name = ?, nick_name = ?, birth_date = ?, phone = ?, personal_email = ?,
                company_email = ?, company_email_password = ?, hire_date = ?, probation_end_date = ?,
                resignation_date = ?, status = ?, address_full = ?, village = ?, building = ?,
                room_number = ?, floor_number = ?, house_number = ?, soi_alley = ?, moo = ?, road = ?,
                sub_district = ?, district = ?, province = ?, postal_code = ?, profile_image = ?,
                deleted_at = NULL
              WHERE id = ?`,
              [
                employeeData.position,
                employeeData.id_card,
                employeeData.gender,
                employeeData.first_name,
                employeeData.last_name,
                employeeData.english_name,
                employeeData.nick_name,
                employeeData.birth_date,
                employeeData.phone,
                employeeData.personal_email,
                employeeData.company_email,
                employeeData.company_email_password,
                employeeData.hire_date,
                employeeData.probation_end_date,
                employeeData.resignation_date,
                employeeData.status,
                employeeData.address_full,
                employeeData.village,
                employeeData.building,
                employeeData.room_number,
                employeeData.floor_number,
                employeeData.house_number,
                employeeData.soi_alley,
                employeeData.moo,
                employeeData.road,
                employeeData.sub_district,
                employeeData.district,
                employeeData.province,
                employeeData.postal_code,
                employeeData.profile_image,
                employeeDbId,
              ]
            )
            results.updated++
            results.success++
          } else {
            // Insert new employee
            await pool.execute(
              `INSERT INTO employees (
                employee_id, position, id_card, gender, first_name, last_name,
                english_name, nick_name, birth_date, phone, personal_email,
                company_email, company_email_password, hire_date, probation_end_date,
                resignation_date, status, address_full, village, building,
                room_number, floor_number, house_number, soi_alley, moo, road,
                sub_district, district, province, postal_code, profile_image
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                employeeData.employee_id,
                employeeData.position,
                employeeData.id_card,
                employeeData.gender,
                employeeData.first_name,
                employeeData.last_name,
                employeeData.english_name,
                employeeData.nick_name,
                employeeData.birth_date,
                employeeData.phone,
                employeeData.personal_email,
                employeeData.company_email,
                employeeData.company_email_password,
                employeeData.hire_date,
                employeeData.probation_end_date,
                employeeData.resignation_date,
                employeeData.status,
                employeeData.address_full,
                employeeData.village,
                employeeData.building,
                employeeData.room_number,
                employeeData.floor_number,
                employeeData.house_number,
                employeeData.soi_alley,
                employeeData.moo,
                employeeData.road,
                employeeData.sub_district,
                employeeData.district,
                employeeData.province,
                employeeData.postal_code,
                employeeData.profile_image,
              ]
            )
            results.success++
          }
        } catch (error) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            employee_id: row['รหัสพนักงาน'] || row['employee_id'] || 'N/A',
            error: error.message,
          })
        }
      }

      res.json({
        success: true,
        message: 'Import completed',
        data: results,
      })
    } catch (error) {
      console.error('Import employees error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      })
    }
  }
)

/**
 * Helper function: Map gender from Thai to English
 */
function mapGender(gender) {
  if (!gender) return 'other'
  const genderLower = String(gender).toLowerCase()
  if (genderLower.includes('ชาย') || genderLower === 'male' || genderLower === 'm') {
    return 'male'
  }
  if (genderLower.includes('หญิง') || genderLower === 'female' || genderLower === 'f') {
    return 'female'
  }
  return 'other'
}

/**
 * Helper function: Map status from Thai to English
 */
function mapStatus(status) {
  if (!status) return 'active'
  const statusLower = String(status).toLowerCase()
  if (statusLower.includes('ลาออก') || statusLower === 'resigned') {
    return 'resigned'
  }
  return 'active'
}

/**
 * Helper function: Parse date from Excel
 * Fix timezone issue by using local date instead of UTC
 * 
 * IMPORTANT: This function handles timezone issues when importing dates from Excel.
 * Excel dates can come in various formats:
 * 1. Date objects (with timezone issues)
 * 2. Excel serial numbers (days since 1900-01-01)
 * 3. String formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
 * 
 * Solution: Always use local date methods (getFullYear, getMonth, getDate) 
 * instead of UTC methods (toISOString) to avoid timezone conversion issues.
 * 
 * @param {any} dateValue - The date value from Excel (Date object, number, or string)
 * @param {string} fieldName - Name of the field (for debugging)
 * @param {number} rowNumber - Row number (for debugging)
 * @returns {string|null} - Formatted date as YYYY-MM-DD or null
 */
function parseDate(dateValue, fieldName = 'date', rowNumber = 0) {
  if (!dateValue) return null
  
  // Debug: Log the type and value of dateValue
  if (rowNumber > 0) {
    console.log(`Row ${rowNumber} [${fieldName}]: Received value type=${typeof dateValue}, value=${JSON.stringify(dateValue)}`)
  }
  
  let date
  
  // If it's already a Date object (from xlsx library with raw: false)
  // NOTE: With raw: true, dates come as numbers (Excel serial), not Date objects
  // But we handle Date objects just in case
  if (dateValue instanceof Date) {
    // Use local date methods directly to avoid timezone conversion
    // Don't use toISOString() as it converts to UTC which causes -1 day issue
    const year = dateValue.getFullYear()
    const month = dateValue.getMonth() // Already 0-indexed
    const day = dateValue.getDate()
    
    // Debug logging
    if (rowNumber > 0) {
      console.log(`Row ${rowNumber} [${fieldName}]: Date object -> ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
    
    // Create new date using local timezone (no time component)
    date = new Date(year, month, day)
  }
  // If it's a number (Excel date serial number)
  // Excel serial number: days since January 1, 1900 (where 1 = Jan 1, 1900)
  // Excel incorrectly treats 1900 as a leap year, so serial 60 = Feb 29, 1900 (doesn't exist)
  else if (typeof dateValue === 'number') {
    // Excel date serial number conversion
    // Standard formula: (serial - 25569) * 86400000
    // Where 25569 = days between Jan 1, 1900 (Excel epoch) and Jan 1, 1970 (Unix epoch)
    // 86400000 = milliseconds per day
    
    // Excel's leap year bug: Excel treats 1900 as a leap year (it's not)
    // Serial 60 = Feb 29, 1900 (doesn't exist in reality)
    // For dates >= serial 61 (March 1, 1900 onwards), we need to subtract 1 day
    
    // Convert Excel serial to JavaScript Date
    // Excel serial number: days since January 1, 1900 (where 1 = Jan 1, 1900)
    // 
    // IMPORTANT: Use standard Unix epoch offset
    // The correct offset is 25569 (standard Excel offset)
    // xlsx library returns Excel serial numbers that work with standard offset
    // 
    // Formula: (serial - 25569) * 86400000
    
    const unixEpochOffset = 25569 // Standard days between 1900-01-01 and 1970-01-01
    const jsDate = new Date((dateValue - unixEpochOffset) * 86400000)
    
    // IMPORTANT: Use UTC methods to extract date components
    // Excel serial numbers represent dates at midnight UTC, so we use UTC methods
    // to get the correct date components without timezone offset
    const year = jsDate.getUTCFullYear()
    const month = jsDate.getUTCMonth()
    const day = jsDate.getUTCDate()
    
    // Debug logging
    if (rowNumber > 0) {
      console.log(`Row ${rowNumber} [${fieldName}]: Excel serial ${dateValue} (offset: ${unixEpochOffset}) -> UTC: ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
    
    // Validate year is reasonable (between 1900 and 2100)
    if (year < 1900 || year > 2100) {
      console.error(`Row ${rowNumber}: Invalid year ${year} from Excel serial ${dateValue} for field ${fieldName}`)
      return null // Invalid date
    }
    
    // Create new date using local date constructor with UTC-extracted components
    // This ensures the date represents the correct calendar date
    date = new Date(year, month, day)
  }
  // If it's a string, try to parse it
  else if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()
    
    // Try D/M/YYYY or DD/MM/YYYY format (Thai date format) - e.g., "3/10/2022" or "03/10/2022"
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const year = parseInt(parts[2], 10)
        
        // Debug logging
        if (rowNumber > 0) {
          console.log(`Row ${rowNumber} [${fieldName}]: String "${trimmed}" -> parsed as day=${day}, month=${month + 1}, year=${year}`)
        }
        
        // Validate parsed values
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        } else {
          console.warn(`Row ${rowNumber} [${fieldName}]: Invalid date parts from "${trimmed}" -> day=${day}, month=${month + 1}, year=${year}`)
        }
      }
    }
    // Try YYYY-MM-DD format - e.g., "2022-10-03"
    else if (trimmed.includes('-')) {
      const parts = trimmed.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const day = parseInt(parts[2], 10)
        
        // Debug logging
        if (rowNumber > 0) {
          console.log(`Row ${rowNumber} [${fieldName}]: String "${trimmed}" -> parsed as year=${year}, month=${month + 1}, day=${day}`)
        }
        
        // Validate parsed values
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        } else {
          console.warn(`Row ${rowNumber} [${fieldName}]: Invalid date parts from "${trimmed}" -> year=${year}, month=${month + 1}, day=${day}`)
        }
      }
    }
    // Try default Date parsing as fallback (but extract local components)
    else {
      const tempDate = new Date(trimmed)
      if (!isNaN(tempDate.getTime())) {
        const year = tempDate.getFullYear()
        const month = tempDate.getMonth()
        const day = tempDate.getDate()
        
        // Debug logging
        if (rowNumber > 0) {
          console.log(`Row ${rowNumber} [${fieldName}]: String "${trimmed}" -> parsed by Date() as ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
        }
        
        date = new Date(year, month, day)
      }
    }
  }
  else {
    return null
  }
  
  // Validate date
  if (!date || isNaN(date.getTime())) {
    return null
  }
  
  // Format as YYYY-MM-DD using local date methods (not UTC) to avoid timezone issues
  // This ensures the date stored in database matches the date in Excel file
  let year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  // Debug logging for final formatted date
  if (rowNumber > 0) {
    console.log(`Row ${rowNumber} [${fieldName}]: Final formatted date -> ${year}-${month}-${day} (from date object: ${date.toISOString()})`)
  }
  
  // Debug: Log if year seems incorrect (before 2000 for hire_date, before 1950 for birth_date)
  if (fieldName === 'hire_date' && year < 2000 && year >= 1900) {
    console.warn(`Row ${rowNumber}: ${fieldName} has year ${year}, which might be incorrect. Original value: ${dateValue}`)
  }
  if (fieldName === 'birth_date' && year < 1950 && year >= 1900) {
    console.warn(`Row ${rowNumber}: ${fieldName} has year ${year}, which might be incorrect. Original value: ${dateValue}`)
  }
  
  return `${year}-${month}-${day}`
}

export default router
