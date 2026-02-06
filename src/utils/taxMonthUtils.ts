/**
 * Tax Month Utilities
 * ฟังก์ชันสำหรับคำนวณเดือนภาษี (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
 */

/**
 * คำนวณเดือนภาษีปัจจุบัน (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
 * ตัวอย่าง: ถ้าปัจจุบันเป็นกุมภาพันธ์ 2026 เดือนภาษีจะเป็น มกราคม 2026
 * ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีจะเป็น ธันวาคม 2025
 */
export function getCurrentTaxMonth(): { year: number; month: number } {
  const now = new Date()
  // ย้อนหลัง 1 เดือน
  const taxMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    year: taxMonth.getFullYear(),
    month: taxMonth.getMonth() + 1,
  }
}

/**
 * คำนวณเดือนภาษีถัดไป (เท่ากับเดือนปฏิทินปัจจุบัน)
 * ตัวอย่าง: ถ้าปัจจุบันเป็นกุมภาพันธ์ 2026 เดือนภาษีถัดไปจะเป็น กุมภาพันธ์ 2026
 */
export function getNextTaxMonth(): { year: number; month: number } {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}
