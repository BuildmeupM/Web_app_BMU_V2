/**
 * Work Assignments - Import Routes
 * แยกมาจาก work-assignments.js
 * - POST /import/validate
 * - POST /import
 */

import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import { generateUUID } from '../../utils/leaveHelpers.js'
import { invalidateCache } from '../../middleware/cache.js'
import { padBuildCode, resetMonthlyData } from './helpers.js'

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
 * POST /api/work-assignments/import/validate
 * Validate Excel file before import
 * Access: Admin only
 */
router.post(
  '/import/validate',
  authenticateToken,
  authorize('admin', 'audit'),
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

      // Track duplicate build+year+month combinations within the file
      const assignmentMap = new Map() // "build-year-month" -> [row numbers]

      // First pass: collect all assignments to detect duplicates
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const year = row['ปีภาษี'] || row['assignment_year']
        const month = row['เดือนภาษี'] || row['assignment_month']

        if (build && year && month) {
          const key = `${build}-${year}-${month}`
          if (!assignmentMap.has(key)) {
            assignmentMap.set(key, [])
          }
          assignmentMap.get(key).push(rowNumber)
        }
      }

      // Check for duplicates within file
      assignmentMap.forEach((rows, key) => {
        if (rows.length > 1) {
          const [build, year, month] = key.split('-')
          validationResults.warnings.push({
            row: rows[0],
            build: build,
            warnings: [`การจัดงานซ้ำกันในไฟล์ (Build: ${build}, ปี: ${year}, เดือน: ${month}, พบ ${rows.length} แถว)`],
          })
        }
      })

      // Second pass: validate each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        const buildRaw = row['Build Code'] || row['build'] || ''
        const build = padBuildCode(buildRaw)
        const yearRaw = row['ปีภาษี'] || row['assignment_year']
        const year = yearRaw ? parseInt(String(yearRaw), 10) : null
        const monthRaw = row['เดือนภาษี'] || row['assignment_month']
        const month = monthRaw ? parseInt(String(monthRaw), 10) : null

        const accountingResponsible = row['ผู้ทำบัญชี (รหัสพนักงาน)'] || row['accounting_responsible'] || null
        const taxInspectionResponsible = row['ผู้ตรวจภาษี (รหัสพนักงาน)'] || row['tax_inspection_responsible'] || null
        const whtFilerResponsible = row['ผู้ยื่น WHT (รหัสพนักงาน)'] || row['wht_filer_responsible'] || null
        const vatFilerResponsible = row['ผู้ยื่น VAT (รหัสพนักงาน)'] || row['vat_filer_responsible'] || null
        const documentEntryResponsible = row['ผู้คีย์เอกสาร (รหัสพนักงาน)'] || row['document_entry_responsible'] || null

        const missingFields = []
        const errors = []
        const warnings = []

        // Required fields validation
        if (!build) {
          missingFields.push('Build Code')
        } else if (build.length < 3) {
          errors.push('Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก')
        }

        if (!year || isNaN(year) || year < 2000 || year > 2100) {
          missingFields.push('ปีภาษี')
          if (yearRaw && (isNaN(year) || year < 2000 || year > 2100)) {
            errors.push('ปีภาษีต้องเป็นตัวเลขระหว่าง 2000-2100')
          }
        }

        if (!month || isNaN(month) || month < 1 || month > 12) {
          missingFields.push('เดือนภาษี')
          if (monthRaw && (isNaN(month) || month < 1 || month > 12)) {
            errors.push('เดือนภาษีต้องเป็นตัวเลขระหว่าง 1-12')
          }
        }

        // Check if build exists in database
        if (build && build.length >= 3) {
          try {
            const [existing] = await pool.execute(
              'SELECT build, company_name FROM clients WHERE build = ? AND deleted_at IS NULL',
              [build]
            )
            if (existing.length === 0) {
              errors.push(`Build Code "${build}" ไม่มีอยู่ในระบบ`)
            }
          } catch (error) {
            // Ignore database errors during validation
          }
        }

        // Check if employee IDs exist (for warnings only)
        const employeeIds = [
          { field: 'accounting_responsible', value: accountingResponsible, name: 'ผู้ทำบัญชี' },
          { field: 'tax_inspection_responsible', value: taxInspectionResponsible, name: 'ผู้ตรวจภาษี' },
          { field: 'wht_filer_responsible', value: whtFilerResponsible, name: 'ผู้ยื่น WHT' },
          { field: 'vat_filer_responsible', value: vatFilerResponsible, name: 'ผู้ยื่น VAT' },
          { field: 'document_entry_responsible', value: documentEntryResponsible, name: 'ผู้คีย์เอกสาร' },
        ]

        for (const { value, name } of employeeIds) {
          if (value) {
            try {
              const [existing] = await pool.execute(
                'SELECT employee_id FROM employees WHERE employee_id = ? AND deleted_at IS NULL',
                [value]
              )
              if (existing.length === 0) {
                warnings.push(`รหัสพนักงาน "${value}" สำหรับ${name} ไม่มีอยู่ในระบบ`)
              }
            } catch (error) {
              // Ignore database errors during validation
            }
          }
        }

        // Check if assignment already exists in database
        if (build && year && month && !isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
          try {
            const [existing] = await pool.execute(
              'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
              [build, year, month]
            )
            if (existing.length > 0) {
              warnings.push(`การจัดงานนี้มีอยู่ในระบบแล้ว (Build: ${build}, ปี: ${year}, เดือน: ${month}) ระบบจะอัพเดทข้อมูลเดิม`)
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
          if (warnings.length > 0) {
            validationResults.warnings.push({
              row: rowNumber,
              build: build || '',
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
      console.error('Work assignment import validation error:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating file',
        error: error.message,
      })
    }
  }
)

/**
 * POST /api/work-assignments/import
 * Import work assignments from Excel file
 * Access: Admin only
 */
router.post(
  '/import',
  authenticateToken,
  authorize('admin', 'audit'),
  upload.single('file'),
  async (req, res) => {
    const connection = await pool.getConnection()

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required',
        })
      }

      const userId = req.user.id

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

      await connection.beginTransaction()

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        updated: 0,
        errors: [],
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 2

        try {
          const buildRaw = row['Build Code'] || row['build'] || ''
          const build = padBuildCode(buildRaw)
          const yearRaw = row['ปีภาษี'] || row['assignment_year']
          const year = yearRaw ? parseInt(String(yearRaw), 10) : null
          const monthRaw = row['เดือนภาษี'] || row['assignment_month']
          const month = monthRaw ? parseInt(String(monthRaw), 10) : null

          const accountingResponsible = row['ผู้ทำบัญชี (รหัสพนักงาน)'] || row['accounting_responsible'] || null
          const taxInspectionResponsible = row['ผู้ตรวจภาษี (รหัสพนักงาน)'] || row['tax_inspection_responsible'] || null
          const whtFilerResponsible = row['ผู้ยื่น WHT (รหัสพนักงาน)'] || row['wht_filer_responsible'] || null
          const vatFilerResponsible = row['ผู้ยื่น VAT (รหัสพนักงาน)'] || row['vat_filer_responsible'] || null
          const documentEntryResponsible = row['ผู้คีย์เอกสาร (รหัสพนักงาน)'] || row['document_entry_responsible'] || null
          const assignmentNote = row['หมายเหตุ'] || row['assignment_note'] || null

          // Validation
          if (!build || build.length < 3) {
            throw new Error('Build Code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก')
          }

          if (!year || isNaN(year) || year < 2000 || year > 2100) {
            throw new Error('ปีภาษีต้องเป็นตัวเลขระหว่าง 2000-2100')
          }

          if (!month || isNaN(month) || month < 1 || month > 12) {
            throw new Error('เดือนภาษีต้องเป็นตัวเลขระหว่าง 1-12')
          }

          // Check if build exists
          const [buildCheck] = await connection.execute(
            'SELECT build FROM clients WHERE build = ? AND deleted_at IS NULL',
            [build]
          )
          if (buildCheck.length === 0) {
            throw new Error(`Build Code "${build}" ไม่มีอยู่ในระบบ`)
          }

          // Check if assignment already exists
          const [existing] = await connection.execute(
            'SELECT id FROM work_assignments WHERE build = ? AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL',
            [build, year, month]
          )

          const assignmentData = {
            build,
            assignment_year: year,
            assignment_month: month,
            accounting_responsible: accountingResponsible || null,
            tax_inspection_responsible: taxInspectionResponsible || null,
            wht_filer_responsible: whtFilerResponsible || null,
            vat_filer_responsible: vatFilerResponsible || null,
            document_entry_responsible: documentEntryResponsible || null,
            assigned_by: userId,
            assigned_at: new Date(),
            assignment_note: assignmentNote || null,
          }

          if (existing.length > 0) {
            // Update existing assignment
            const assignmentId = existing[0].id
            await connection.execute(
              `UPDATE work_assignments SET
                accounting_responsible = ?,
                tax_inspection_responsible = ?,
                wht_filer_responsible = ?,
                vat_filer_responsible = ?,
                document_entry_responsible = ?,
                assignment_note = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
              [
                assignmentData.accounting_responsible,
                assignmentData.tax_inspection_responsible,
                assignmentData.wht_filer_responsible,
                assignmentData.vat_filer_responsible,
                assignmentData.document_entry_responsible,
                assignmentData.assignment_note,
                assignmentId,
              ]
            )

            // Reset monthly data
            await resetMonthlyData(build, year, month, assignmentData)

            // อัพเดทสถานะการรีเซ็ตหลังจาก resetMonthlyData เสร็จแล้ว
            await connection.execute(
              'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
              [assignmentId]
            )

            results.success++
            results.updated++
          } else {
            // Create new assignment
            // Set original_* and current_* to the assigned values when creating new assignment
            const assignmentId = generateUUID()
            await connection.execute(
              `INSERT INTO work_assignments (
                id, build, assignment_year, assignment_month,
                accounting_responsible, original_accounting_responsible, current_accounting_responsible,
                tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
                wht_filer_responsible, original_wht_filer_responsible, current_wht_filer_responsible,
                vat_filer_responsible, original_vat_filer_responsible, current_vat_filer_responsible,
                document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
                assigned_by, assigned_at, assignment_note, is_reset_completed
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
              [
                assignmentId,
                assignmentData.build,
                assignmentData.assignment_year,
                assignmentData.assignment_month,
                assignmentData.accounting_responsible,
                assignmentData.accounting_responsible, // original_accounting_responsible
                assignmentData.accounting_responsible, // current_accounting_responsible
                assignmentData.tax_inspection_responsible,
                assignmentData.tax_inspection_responsible, // original_tax_inspection_responsible
                assignmentData.tax_inspection_responsible, // current_tax_inspection_responsible
                assignmentData.wht_filer_responsible,
                assignmentData.wht_filer_responsible, // original_wht_filer_responsible
                assignmentData.wht_filer_responsible, // current_wht_filer_responsible
                assignmentData.vat_filer_responsible,
                assignmentData.vat_filer_responsible, // original_vat_filer_responsible
                assignmentData.vat_filer_responsible, // current_vat_filer_responsible
                assignmentData.document_entry_responsible,
                assignmentData.document_entry_responsible, // original_document_entry_responsible
                assignmentData.document_entry_responsible, // current_document_entry_responsible
                assignmentData.assigned_by,
                assignmentData.assigned_at,
                assignmentData.assignment_note,
              ]
            )

            // Reset monthly data
            await resetMonthlyData(build, year, month, assignmentData)

            // อัพเดทสถานะการรีเซ็ตหลังจาก resetMonthlyData เสร็จแล้ว
            await connection.execute(
              'UPDATE work_assignments SET is_reset_completed = TRUE, reset_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
              [assignmentId]
            )

            results.success++
          }
        } catch (error) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            build: row['Build Code'] || row['build'] || '',
            error: error.message,
          })
        }
      }

      await connection.commit()

      // Invalidate cache
      invalidateCache('GET:/work-assignments')

      res.json({
        success: true,
        message: 'Work assignments imported successfully',
        data: results,
      })
    } catch (error) {
      await connection.rollback()
      console.error('Work assignment import error:', error)
      res.status(500).json({
        success: false,
        message: 'Error importing work assignments',
        error: error.message,
      })
    } finally {
      connection.release()
    }
  }
)

/**
 * POST /api/work-assignments/:id/change-responsible
 * เปลี่ยนผู้รับผิดชอบงาน (พร้อมเก็บประวัติ)
 * อัปเดตทั้ง work_assignments และ monthly_tax_data ใน transaction เดียว
 * Access: Admin only
 * 
 * Request Body:
 * {
 *   role_type: 'accounting' | 'tax_inspection' | 'wht_filer' | 'vat_filer' | 'document_entry',
 *   new_employee_id: string,
 *   change_reason?: string
 * }
 */

export default router
