/**
 * Authentication Middleware
 * ตรวจสอบ JWT token และอนุญาต/ปฏิเสธ request
 */

import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET is not set in environment variables!')
  // In production, this should throw an error to prevent server from starting with insecure defaults
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment')
  }
}

/**
 * Middleware สำหรับตรวจสอบ JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)

    // ดึงข้อมูล user จาก database (พร้อม retry logic สำหรับ ECONNRESET)
    let users
    let retries = 3
    while (retries > 0) {
      try {
        [users] = await pool.execute(
          'SELECT id, username, email, employee_id, nick_name, role, name, status FROM users WHERE id = ? AND deleted_at IS NULL',
          [decoded.userId]
        )
        break // Success, exit retry loop
      } catch (dbError) {
        retries--
        if (dbError.code === 'ECONNRESET' && retries > 0) {
          // Wait 100ms before retry
          await new Promise((resolve) => setTimeout(resolve, 100))
          continue
        }
        // If not ECONNRESET or no retries left, throw error
        throw dbError
      }
    }

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      })
    }

    const user = users[0]

    // ตรวจสอบสถานะ user
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      })
    }

    // เพิ่ม user ข้อมูลใน request object
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      })
    }
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}

/**
 * Middleware สำหรับตรวจสอบ role
 * @param {string[]} allowedRoles - Array ของ roles ที่อนุญาต
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }

    next()
  }
}
