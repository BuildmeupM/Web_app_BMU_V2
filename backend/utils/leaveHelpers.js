/**
 * Leave & WFH Helper Functions
 * ฟังก์ชันช่วยสำหรับการคำนวณและตรวจสอบข้อมูลการลา/WFH
 */

/**
 * คำนวณจำนวนวันทำการระหว่างวันที่เริ่มต้นถึงวันที่สิ้นสุด
 * (ไม่นับวันหยุดสุดสัปดาห์ - เสาร์และอาทิตย์)
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @returns {number} จำนวนวันทำการ
 */
export function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    return 0
  }

  let days = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * ตรวจสอบว่าพนักงานมีสิทธิ์ขอ WFH หรือไม่
 * (ต้องทำงานมาแล้วอย่างน้อย 3 เดือน)
 * @param {string} hireDate - วันที่เริ่มงาน (YYYY-MM-DD)
 * @returns {boolean} true ถ้ามีสิทธิ์, false ถ้าไม่มีสิทธิ์
 */
export function canRequestWFH(hireDate) {
  if (!hireDate) {
    return false
  }

  const hire = new Date(hireDate)
  const today = new Date()

  // คำนวณจำนวนเดือนที่ทำงาน
  const monthsDiff = (today.getFullYear() - hire.getFullYear()) * 12 +
    (today.getMonth() - hire.getMonth())

  return monthsDiff >= 3
}

/**
 * ตรวจสอบจำนวน WFH ที่ขอแล้วในวันนั้น (รวมทั้ง "รออนุมัติ" และ "อนุมัติแล้ว")
 * @param {object} pool - Database connection pool
 * @param {string} wfhDate - วันที่ต้องการตรวจสอบ (YYYY-MM-DD)
 * @returns {Promise<number>} จำนวนคนที่ขอ WFH แล้ว (ไม่รวม "ไม่อนุมัติ")
 */
export async function getApprovedWFHCount(pool, wfhDate) {
  const [results] = await pool.execute(
    `SELECT COUNT(*) as count 
     FROM wfh_requests 
     WHERE wfh_date = ? 
       AND status IN ('รออนุมัติ', 'อนุมัติแล้ว')
       AND deleted_at IS NULL`,
    [wfhDate]
  )

  return results[0].count || 0
}

/**
 * ตรวจสอบจำนวน WFH ที่อนุมัติแล้วในเดือนนั้น
 * @param {object} pool - Database connection pool
 * @param {string} employeeId - รหัสพนักงาน
 * @param {string} month - เดือนที่ต้องการตรวจสอบ (YYYY-MM)
 * @returns {Promise<number>} จำนวนวัน WFH ที่อนุมัติแล้วในเดือนนั้น
 */
export async function getMonthlyWFHCount(pool, employeeId, month) {
  const [results] = await pool.execute(
    `SELECT COUNT(*) as count 
     FROM wfh_requests 
     WHERE employee_id = ? 
       AND DATE_FORMAT(wfh_date, '%Y-%m') = ? 
       AND status = 'อนุมัติแล้ว' 
       AND deleted_at IS NULL`,
    [employeeId, month]
  )

  return results[0].count || 0
}

/**
 * ตรวจสอบตำแหน่งของพนักงาน (สำหรับกำหนด limit WFH ต่อเดือน)
 * @param {object} pool - Database connection pool
 * @param {string} employeeId - รหัสพนักงาน
 * @returns {Promise<string|null>} ตำแหน่งของพนักงาน หรือ null ถ้าไม่พบ
 */
export async function getEmployeePosition(pool, employeeId) {
  const [results] = await pool.execute(
    `SELECT position 
     FROM employees 
     WHERE employee_id = ? 
       AND deleted_at IS NULL`,
    [employeeId]
  )

  return results.length > 0 ? results[0].position : null
}

/**
 * ตรวจสอบ limit WFH ต่อเดือนตามตำแหน่ง
 * @param {string} position - ตำแหน่งของพนักงาน
 * @returns {number} limit WFH ต่อเดือน (6 วันสำหรับทั่วไป, 16 วันสำหรับ IT)
 */
export function getWFHMonthlyLimit(position) {
  // ตรวจสอบว่าตำแหน่งเป็น IT หรือไม่
  const itPositions = ['IT', 'ไอที', 'IT Support', 'IT Developer', 'IT Manager']
  const isIT = itPositions.some(itPos =>
    position && position.toLowerCase().includes(itPos.toLowerCase())
  )

  return isIT ? 16 : 6
}

/**
 * สร้าง UUID v4
 * @returns {string} UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Fix 4: คำนวณจำนวนวันทำการโดยหักวันหยุดนักขัตฤกษ์
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @param {string[]} holidayDates - รายการวันหยุด (YYYY-MM-DD)
 * @returns {number} จำนวนวันทำการ (ไม่รวมวันหยุดสุดสัปดาห์และวันหยุดนักขัตฤกษ์)
 */
export function calculateWorkingDaysWithHolidays(startDate, endDate, holidayDates = []) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    return 0
  }

  const holidaySet = new Set(holidayDates)
  let days = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    // Format date as YYYY-MM-DD for comparison
    const dateStr = current.toISOString().split('T')[0]

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip holidays
      if (!holidaySet.has(dateStr)) {
        days++
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return days
}

