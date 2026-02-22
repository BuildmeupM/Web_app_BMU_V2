/**
 * Monthly Tax Data - Helper Functions
 * ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันใน route handlers
 *
 * แยกมาจาก monthly-tax-data.js เพื่อลดขนาดไฟล์
 * - checkPaymentColumnsExist: ตรวจสอบว่าคอลัมน์ payment มีอยู่หรือไม่
 * - fetchEmployeesBulk: ดึงข้อมูลพนักงานแบบ bulk (ลด query time 40-60%)
 * - derivePp30StatusFromRow: คำนวณสถานะ PP30 จากข้อมูลแถว
 */

import pool from '../../config/database.js'

// =============================================
// Payment Columns Cache
// =============================================

let _paymentColumnsExistCache = null
let _paymentColumnsCacheTime = 0
const PAYMENT_COLUMNS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * ตรวจสอบว่าคอลัมน์ pp30_payment_status และ pp30_payment_amount มีอยู่ในตารางหรือไม่
 * ✅ Performance: Cache ผลลัพธ์ไว้ 1 ชั่วโมง เพื่อไม่ต้อง query INFORMATION_SCHEMA ทุก request
 * @returns {Promise<boolean>} true ถ้าคอลัมน์ทั้งสองมีอยู่, false ถ้าไม่มี
 */
export async function checkPaymentColumnsExist() {
  // ✅ Performance: ใช้ cached result ถ้ายังไม่หมดอายุ
  if (_paymentColumnsExistCache !== null && Date.now() - _paymentColumnsCacheTime < PAYMENT_COLUMNS_CACHE_TTL) {
    return _paymentColumnsExistCache
  }
  try {
    const [columnCheck] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'monthly_tax_data' 
       AND COLUMN_NAME IN ('pp30_payment_status', 'pp30_payment_amount')`
    )
    _paymentColumnsExistCache = columnCheck[0].count === 2
    _paymentColumnsCacheTime = Date.now()
    return _paymentColumnsExistCache
  } catch (err) {
    console.warn('⚠️ Could not check for payment columns, assuming they do not exist:', err.message)
    return false
  }
}

// =============================================
// Employee Bulk Fetch
// =============================================

/**
 * ✅ Performance Optimization: Helper function to fetch employees in bulk
 * แทนการ JOIN 7 ครั้งกับ employees table (ลด query time 40-60%)
 * Note: สำหรับ endpoints อื่นๆ (GET detail, POST, PUT) ยังใช้ JOIN อยู่เพื่อความปลอดภัย
 * แต่สามารถปรับเป็น bulk fetch ได้ในอนาคต
 * @param {Array<string>} employeeIds - Array of employee IDs to fetch
 * @returns {Promise<Map<string, Object>>} Map of employee_id -> employee data
 */
export async function fetchEmployeesBulk(employeeIds) {
  if (!employeeIds || employeeIds.length === 0) {
    return new Map()
  }

  // Remove duplicates and null/undefined values
  const uniqueIds = [...new Set(employeeIds.filter(id => id != null))]

  if (uniqueIds.length === 0) {
    return new Map()
  }

  try {
    const [employees] = await pool.execute(
      `SELECT 
        employee_id,
        full_name,
        first_name,
        nick_name
      FROM employees
      WHERE employee_id IN (${uniqueIds.map(() => '?').join(',')})`,
      uniqueIds
    )

    // Create a Map for O(1) lookup
    const employeeMap = new Map()
    employees.forEach(emp => {
      employeeMap.set(emp.employee_id, {
        full_name: emp.full_name,
        first_name: emp.first_name,
        nick_name: emp.nick_name,
      })
    })

    return employeeMap
  } catch (error) {
    console.error('Error fetching employees bulk:', error)
    return new Map() // Return empty map on error
  }
}

// =============================================
// PP30 Status Derivation
// =============================================

/**
 * Derive pp30_status from row
 * ⚠️ สำคัญ: หลัง migration 028, pp30_form เปลี่ยนเป็น VARCHAR(100) เพื่อเก็บสถานะโดยตรง
 * - ถ้ามี pp30_form และไม่ใช่ boolean (0/1) → ใช้ค่าจาก pp30_form โดยตรง
 * - ถ้าไม่มี: ใช้ timestamp ล่าสุด → sent_to_customer | pending_recheck | pending_review | draft_completed
 * - ถ้าไม่มี date เลยแต่มี pp30_form = 1 (boolean) → 'not_started' (backward compatibility)
 * 
 * ⚠️ หมายเหตุ: pp30_filing_response เป็นข้อมูลที่ผู้ใช้กรอก (TEXT) ไม่ใช่สถานะ จึงไม่ใช้ในการ derive สถานะ
 */
export function derivePp30StatusFromRow(row) {
  if (!row) return null

  // ⚠️ สำคัญ: หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
  // ถ้า pp30_form มีค่าและไม่ใช่ boolean (0/1) ให้ใช้ค่าดังกล่าวก่อน
  if (row.pp30_form && String(row.pp30_form).trim() !== '' && row.pp30_form !== '0' && row.pp30_form !== '1' && row.pp30_form !== 0 && row.pp30_form !== 1) {
    return String(row.pp30_form).trim()
  }

  // Derive จาก timestamp fields (เรียงตามวันที่ล่าสุด)
  const statuses = []
  if (row.pp30_sent_to_customer_date) statuses.push({ status: 'sent_to_customer', date: row.pp30_sent_to_customer_date })
  if (row.pp30_review_returned_date) statuses.push({ status: 'pending_recheck', date: row.pp30_review_returned_date })
  if (row.pp30_sent_for_review_date) statuses.push({ status: 'pending_review', date: row.pp30_sent_for_review_date })
  if (row.vat_draft_completed_date) statuses.push({ status: 'draft_completed', date: row.vat_draft_completed_date })
  if (statuses.length > 0) {
    statuses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return statuses[0].status
  }

  // Backward compatibility: ถ้า pp30_form = 1 (boolean) → 'not_started'
  if (row.pp30_form === 1 || row.pp30_form === '1') return 'not_started'

  return null
}
