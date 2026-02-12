/**
 * Account Lockout Utility
 * จัดการ account lockout หลังจาก failed login attempts
 */

import pool from '../config/database.js'
import http from 'http'

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
    // Insert record first (fast)
    const [result] = await pool.execute(
      `INSERT INTO login_attempts 
       (id, user_id, username, ip_address, user_agent, success, failure_reason, attempted_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, username, ipAddress, userAgent, success, failureReason]
    )

    // Async geolocation lookup — non-blocking, won't affect login speed
    lookupGeolocation(ipAddress).catch((err) => {
      console.error('[Geo] Unhandled error:', err.message)
    })
  } catch (error) {
    console.error('Error recording login attempt:', error)
    // ไม่ throw error เพื่อไม่ให้กระทบ login flow
  }
}

/**
 * ค้นหา geolocation จาก IP address แล้วอัปเดตลงใน record ล่าสุด
 * ใช้ ip-api.com (ฟรี, ไม่ต้อง API key, 45 req/min)
 */
async function lookupGeolocation(ipAddress) {
  if (!ipAddress) return

  // ข้าม private / localhost IPs
  const skipIps = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1', 'unknown']
  if (skipIps.includes(ipAddress) || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
    console.log(`[Geo] Skipping private/local IP: ${ipAddress}`)
    return
  }

  console.log(`[Geo] Looking up IP: ${ipAddress}`)

  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${ipAddress}?fields=status,lat,lon,city,country`

    http.get(url, (res) => {
      let rawData = ''
      res.on('data', (chunk) => { rawData += chunk })
      res.on('end', async () => {
        try {
          const data = JSON.parse(rawData)
          console.log(`[Geo] API response for ${ipAddress}:`, data)

          if (data.status === 'success') {
            const [result] = await pool.execute(
              `UPDATE login_attempts 
               SET latitude = ?, longitude = ?, geo_city = ?, geo_country = ?
               WHERE ip_address = ? AND latitude IS NULL
               ORDER BY attempted_at DESC 
               LIMIT 1`,
              [data.lat, data.lon, data.city || null, data.country || null, ipAddress]
            )
            console.log(`[Geo] ✅ Updated ${result.affectedRows} row(s) for IP ${ipAddress}: ${data.city}, ${data.country}`)
          } else {
            console.log(`[Geo] ⚠ API returned non-success for ${ipAddress}:`, data)
          }
        } catch (err) {
          console.error(`[Geo] Error parsing/saving for ${ipAddress}:`, err.message)
        }
        resolve()
      })
    }).on('error', (err) => {
      console.error(`[Geo] HTTP error for ${ipAddress}:`, err.message)
      resolve()
    })
  })
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
