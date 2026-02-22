/**
 * Document Entry Work - Helper Functions
 * แยกมาจาก document-entry-work.js
 * - getSubmissionCount
 * - getDocumentEntryResponsible
 * - getAccountingResponsible
 */

import pool from '../../config/database.js'

/**
 * Helper function: เช็ค submission_count จาก document_entry_work
 * @param {string} build - Build code
 * @param {number} workYear - Work year
 * @param {number} workMonth - Work month (1-12)
 * @returns {Promise<number>} submission_count (default: 0)
 */
async function getSubmissionCount(build, workYear, workMonth) {
  try {
    const [rows] = await pool.execute(
      `SELECT MAX(submission_count) as max_count 
       FROM document_entry_work 
       WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL`,
      [build, workYear, workMonth]
    )
    return rows[0]?.max_count || 0
  } catch (error) {
    console.error('Error getting submission count:', error)
    return 0
  }
}

/**
 * Helper function: ดึง document_entry_responsible จาก monthly_tax_data
 * @param {string} build - Build code
 * @param {number} year - Tax year
 * @param {number} month - Tax month (1-12)
 * @returns {Promise<string|null>} document_entry_responsible employee_id
 */
async function getDocumentEntryResponsible(build, year, month) {
  try {
    const [rows] = await pool.execute(
      `SELECT document_entry_responsible 
       FROM monthly_tax_data 
       WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL 
       LIMIT 1`,
      [build, year, month]
    )
    return rows[0]?.document_entry_responsible || null
  } catch (error) {
    console.error('Error getting document_entry_responsible:', error)
    return null
  }
}

/**
 * Helper function: ดึง accounting_responsible จาก monthly_tax_data
 * @param {string} build - Build code
 * @param {number} year - Tax year
 * @param {number} month - Tax month (1-12)
 * @returns {Promise<string|null>} accounting_responsible employee_id
 */
async function getAccountingResponsible(build, year, month) {
  try {
    const [rows] = await pool.execute(
      `SELECT accounting_responsible 
       FROM monthly_tax_data 
       WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NULL 
       LIMIT 1`,
      [build, year, month]
    )
    return rows[0]?.accounting_responsible || null
  } catch (error) {
    console.error('Error getting accounting_responsible:', error)
    return null
  }
}

export { getSubmissionCount, getDocumentEntryResponsible, getAccountingResponsible }
