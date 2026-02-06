/**
 * Security Event Logger
 * บันทึก security events สำหรับ monitoring และ auditing
 */

import pool from '../config/database.js'

/**
 * Log security event
 * @param {object} eventData - ข้อมูล event
 * @param {string} eventData.type - ประเภท event (login_success, login_failed, account_locked, etc.)
 * @param {string} eventData.userId - User ID (null ถ้าไม่มี)
 * @param {string} eventData.username - Username
 * @param {string} eventData.ipAddress - IP address
 * @param {string} eventData.userAgent - User agent
 * @param {string} eventData.details - รายละเอียดเพิ่มเติม
 */
export async function logSecurityEvent({
  type,
  userId = null,
  username = null,
  ipAddress = null,
  userAgent = null,
  details = null,
}) {
  try {
    // ใช้ตาราง login_attempts ที่มีอยู่แล้ว (หรือสร้างตาราง security_events แยก)
    // สำหรับตอนนี้จะใช้ login_attempts เพื่อความง่าย
    console.log(`[SECURITY] ${type} - User: ${username || 'unknown'} - IP: ${ipAddress || 'unknown'}`)
    
    // ในอนาคตสามารถสร้างตาราง security_events แยกได้
    // await pool.execute(
    //   `INSERT INTO security_events (id, type, user_id, username, ip_address, user_agent, details, created_at)
    //    VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
    //   [type, userId, username, ipAddress, userAgent, details]
    // )
  } catch (error) {
    console.error('Error logging security event:', error)
    // ไม่ throw error เพื่อไม่ให้กระทบ main flow
  }
}
