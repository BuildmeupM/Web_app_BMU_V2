/**
 * Account Lockout Utility
 * จัดการ account lockout หลังจาก failed login attempts
 */

import pool from '../config/database.js'

const MAX_FAILED_ATTEMPTS = 5 // จำนวนครั้งที่ผิดได้ก่อน lock
const LOCKOUT_DURATION_MINUTES = 30 // ระยะเวลา lock (นาที)

/**
 * บันทึก login attempt
 * @param {object} attemptData - ข้อมูล login attempt
 * @param {string} attemptData.username - Username
 * @param {string} attemptData.userId - User ID (null ถ้าไม่มี user)
 * @param {string} attemptData.ipAddress - IP address
 * @param {string} attemptData.userAgent - User agent
 * @param {boolean} attemptData.success - Login สำเร็จหรือไม่
 * @param {string} attemptData.failureReason - สาเหตุที่ล้มเหลว (ถ้าไม่สำเร็จ)
 */
export async function recordLoginAttempt({
  username,
  userId = null,
  ipAddress,
  userAgent = null,
  success,
  failureReason = null,
}) {
  try {
    await pool.execute(
      `INSERT INTO login_attempts 
       (id, user_id, username, ip_address, user_agent, success, failure_reason, attempted_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, username, ipAddress, userAgent, success, failureReason]
    )
  } catch (error) {
    console.error('Error recording login attempt:', error)
    // ไม่ throw error เพื่อไม่ให้กระทบ login flow
  }
}

/**
 * ตรวจสอบว่า account ถูก lock หรือไม่
 * @param {string} username - Username
 * @returns {object} { isLocked: boolean, unlockAt: Date | null, failedAttempts: number }
 */
export async function checkAccountLockout(username) {
  try {
    // นับ failed attempts ในช่วง 30 นาทีที่ผ่านมา
    const [results] = await pool.execute(
      `SELECT COUNT(*) as failed_count, MAX(attempted_at) as last_failed_at
       FROM login_attempts
       WHERE username = ? 
         AND success = FALSE
         AND attempted_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [username, LOCKOUT_DURATION_MINUTES]
    )

    const failedCount = results[0]?.failed_count || 0
    const lastFailedAt = results[0]?.last_failed_at

    if (failedCount >= MAX_FAILED_ATTEMPTS && lastFailedAt) {
      // คำนวณเวลาที่จะ unlock
      const unlockAt = new Date(lastFailedAt)
      unlockAt.setMinutes(unlockAt.getMinutes() + LOCKOUT_DURATION_MINUTES)

      // ตรวจสอบว่ายัง lock อยู่หรือไม่
      if (new Date() < unlockAt) {
        return {
          isLocked: true,
          unlockAt,
          failedAttempts: failedCount,
        }
      }
    }

    return {
      isLocked: false,
      unlockAt: null,
      failedAttempts: failedCount,
    }
  } catch (error) {
    console.error('Error checking account lockout:', error)
    // ถ้าเกิด error ให้อนุญาต login (fail open)
    return {
      isLocked: false,
      unlockAt: null,
      failedAttempts: 0,
    }
  }
}

/**
 * ล้าง failed attempts (เมื่อ login สำเร็จ)
 * @param {string} username - Username
 */
export async function clearFailedAttempts(username) {
  try {
    // ไม่ต้องลบ records จริง แค่ไม่นับใน lockout check
    // หรือสามารถลบ records เก่าได้ถ้าต้องการ
    // await pool.execute(
    //   'DELETE FROM login_attempts WHERE username = ? AND success = FALSE',
    //   [username]
    // )
  } catch (error) {
    console.error('Error clearing failed attempts:', error)
  }
}

/**
 * ดึง IP address จาก request
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  )
}
