/**
 * Shared Date Formatter Utility
 * ใช้ร่วมกันทุก route file — format date เป็น 'YYYY-MM-DD HH:mm:ss' (เวลา Bangkok UTC+7)
 * 
 * ✅ ใช้ UTC methods + offset +7 เพื่อให้ทำงานถูกต้องทั้ง local (Bangkok) และ cloud (UTC)
 * 
 * เดิมถูกเขียนซ้ำใน:
 *   - routes/monthly-tax-data.js (เวอร์ชัน Bangkok, สมบูรณ์ที่สุด)
 *   - routes/work-assignments.js (เวอร์ชันง่าย, ไม่มี timezone handling)
 *   - routes/document-entry-work.js (เวอร์ชันง่าย, ไม่มี timezone handling)
 */

export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7 in milliseconds

/**
 * Helper: แปลง Date object → 'YYYY-MM-DD HH:mm:ss' ในเวลา Bangkok (UTC+7)
 * ✅ ใช้ getUTC* methods + offset เพื่อไม่ขึ้นกับ OS timezone
 * @param {Date} d - Date object
 * @returns {string} Formatted date string in Bangkok time
 */
function dateToString(d) {
  // Shift epoch by +7 hours แล้วใช้ UTC methods → ได้เวลา Bangkok เสมอ
  const shifted = new Date(d.getTime() + BANGKOK_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  const hours = String(shifted.getUTCHours()).padStart(2, '0')
  const minutes = String(shifted.getUTCMinutes()).padStart(2, '0')
  const seconds = String(shifted.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Format date for API response as 'YYYY-MM-DD HH:mm:ss' (เวลา Bangkok UTC+7)
 * @param {string|Date|null} dateValue - Date value from database
 * @param {string} fieldName - Optional field name for debugging
 * @returns {string|null} String in format 'YYYY-MM-DD HH:mm:ss' (Bangkok time) or null
 */
export function formatDateForResponse(dateValue, fieldName = '') {
  if (!dateValue) return null

  // ถ้าเป็น Date object ให้แปลงเป็น Bangkok time string
  if (dateValue instanceof Date) {
    const result = dateToString(dateValue)
    if (process.env.NODE_ENV === 'development' && fieldName) {
      console.log(`[formatDateForResponse] ${fieldName}: Date object -> string (Bangkok):`, {
        original: dateValue.toISOString(),
        result: result,
        type: 'Date object (using UTC+7 offset)'
      })
    }
    return result
  }

  // ถ้าเป็น string
  if (typeof dateValue === 'string') {
    const s = dateValue.trim()

    // ถ้าเป็น ISO format (มี 'T' หรือ 'Z') ให้แปลงเป็น Bangkok time string
    if (s.includes('T')) {
      const dateObj = new Date(s)
      if (isNaN(dateObj.getTime())) {
        if (process.env.NODE_ENV === 'development' && fieldName) {
          console.warn(`[formatDateForResponse] ${fieldName}: Invalid ISO date string:`, s)
        }
        return null
      }
      const result = dateToString(dateObj)
      if (process.env.NODE_ENV === 'development' && fieldName) {
        console.log(`[formatDateForResponse] ${fieldName}: ISO string -> string (Bangkok):`, {
          original: s,
          result: result,
          type: 'ISO string (using UTC+7 offset)'
        })
      }
      return result
    }

    // ถ้าเป็น format 'YYYY-MM-DD HH:mm:ss' อยู่แล้ว ให้คืนค่าเดิม (ตัด milliseconds ออก)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      const result = s.split('.')[0]
      if (process.env.NODE_ENV === 'development' && fieldName) {
        console.log(`[formatDateForResponse] ${fieldName}: String (already correct format):`, {
          original: s,
          result: result,
          type: 'YYYY-MM-DD HH:mm:ss'
        })
      }
      return result
    }

    // ถ้าไม่ใช่ format ที่รู้จัก ให้คืนค่าเดิม
    if (process.env.NODE_ENV === 'development' && fieldName) {
      console.warn(`[formatDateForResponse] ${fieldName}: Unknown date format:`, s)
    }
    return s
  }

  return null
}
