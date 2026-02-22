/**
 * Work Assignments - Helper Functions
 * แยกมาจาก work-assignments.js
 * - resetMonthlyData: รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
 * - padBuildCode: Pad Build Code with leading zeros
 */

import pool from '../../config/database.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

/**
 * Helper function: รีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
 * @param {string} build - Build code
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {object} assignment - Work assignment data
 */
async function resetMonthlyData(build, year, month, assignment) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Soft delete ข้อมูลเก่า (ถ้ามี)
    await connection.execute(
      'UPDATE monthly_tax_data SET deleted_at = CURRENT_TIMESTAMP WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    await connection.execute(
      'UPDATE document_entry_work SET deleted_at = CURRENT_TIMESTAMP WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL',
      [build, year, month]
    )

    // 2. สร้างข้อมูลใหม่สำหรับ monthly_tax_data
    // Set original_* and current_* to the assigned values when resetting monthly data
    const monthlyTaxDataId = generateUUID()
    await connection.execute(
      `INSERT INTO monthly_tax_data (
        id, build, tax_year, tax_month,
        accounting_responsible, original_accounting_responsible, current_accounting_responsible,
        tax_inspection_responsible, original_tax_inspection_responsible, current_tax_inspection_responsible,
        document_entry_responsible, original_document_entry_responsible, current_document_entry_responsible,
        wht_filer_employee_id, original_wht_filer_employee_id,
        vat_filer_employee_id, original_vat_filer_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        monthlyTaxDataId,
        build,
        year,
        month,
        assignment.accounting_responsible || null,
        assignment.accounting_responsible || null, // original_accounting_responsible
        assignment.accounting_responsible || null, // current_accounting_responsible
        assignment.tax_inspection_responsible || null,
        assignment.tax_inspection_responsible || null, // original_tax_inspection_responsible
        assignment.tax_inspection_responsible || null, // current_tax_inspection_responsible
        assignment.document_entry_responsible || null,
        assignment.document_entry_responsible || null, // original_document_entry_responsible
        assignment.document_entry_responsible || null, // current_document_entry_responsible
        assignment.wht_filer_responsible || null,
        assignment.wht_filer_responsible || null, // original_wht_filer_employee_id
        assignment.vat_filer_responsible || null,
        assignment.vat_filer_responsible || null, // original_vat_filer_employee_id
      ]
    )

    // 3. สร้างข้อมูลใหม่สำหรับ document_entry_work
    const documentEntryWorkId = generateUUID()
    await connection.execute(
      `INSERT INTO document_entry_work (
        id, build, work_year, work_month,
        entry_timestamp, submission_count,
        responsible_employee_id, current_responsible_employee_id
      ) VALUES (?, ?, ?, ?, NOW(), 1, ?, ?)`,
      [
        documentEntryWorkId,
        build,
        year,
        month,
        assignment.document_entry_responsible || null,
        assignment.document_entry_responsible || null,
      ]
    )

    await connection.commit()
    return { success: true }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}


/**
 * Helper function to pad Build Code with leading zeros
 * @param {string|number} value - Build Code value from Excel
 * @returns {string} - Padded Build Code
 */
function padBuildCode(value) {
  if (!value && value !== 0) return ''
  const str = String(value).trim()
  // If it contains decimal point or other non-digit characters, don't pad
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to minimum 3 digits for pure numbers
  return str.padStart(3, '0')
}

export { resetMonthlyData, padBuildCode }
