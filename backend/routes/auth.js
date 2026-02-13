/**
 * Authentication Routes
 * Routes สำหรับการ Authentication (Login, Logout, Get Current User)
 */

import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loginRateLimiter } from '../middleware/rateLimiter.js'
import { validateUsername, validatePassword } from '../utils/validation.js'
import {
  checkAccountLockout,
  recordLoginAttempt,
  clearFailedAttempts,
  getClientIp,
} from '../utils/accountLockout.js'
import { generateUUID } from '../utils/leaveHelpers.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET is not set in environment variables!')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment')
  }
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d' // 7 วัน

/**
 * POST /api/auth/login
 * Login endpoint
 * Body: { username, password }
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  const clientIp = getClientIp(req)
  const userAgent = req.headers['user-agent'] || null

  try {
    const { username, password } = req.body

    // Validate input format
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      await recordLoginAttempt({
        username: username || 'unknown',
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'invalid_username_format',
      })
      return res.status(400).json({
        success: false,
        message: usernameValidation.message,
      })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      await recordLoginAttempt({
        username: usernameValidation.username,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'invalid_password_format',
      })
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      })
    }

    const sanitizedUsername = usernameValidation.username

    // ตรวจสอบ account lockout
    const lockoutStatus = await checkAccountLockout(sanitizedUsername)
    if (lockoutStatus.isLocked) {
      await recordLoginAttempt({
        username: sanitizedUsername,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'account_locked',
      })
      const unlockTime = new Date(lockoutStatus.unlockAt).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
      })
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to too many failed login attempts. Please try again after ${unlockTime}`,
        unlockAt: lockoutStatus.unlockAt,
      })
    }

    // ค้นหา user จาก database
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, employee_id, nick_name, role, name, status FROM users WHERE username = ? AND deleted_at IS NULL',
      [sanitizedUsername]
    )

    if (users.length === 0) {
      // บันทึก failed attempt (ไม่มี user ในระบบ)
      await recordLoginAttempt({
        username: sanitizedUsername,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'user_not_found',
      })
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      })
    }

    const user = users[0]

    // ตรวจสอบสถานะ user
    if (user.status !== 'active') {
      await recordLoginAttempt({
        username: sanitizedUsername,
        userId: user.id,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'account_inactive',
      })
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      })
    }

    // ตรวจสอบ password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      // บันทึก failed attempt
      await recordLoginAttempt({
        username: sanitizedUsername,
        userId: user.id,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'invalid_password',
      })
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      })
    }

    // Login สำเร็จ - ล้าง failed attempts และบันทึก successful attempt
    await clearFailedAttempts(sanitizedUsername)
    await recordLoginAttempt({
      username: sanitizedUsername,
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      success: true,
    })

    // อัพเดท last_login_at (เก็บ temporary_password ไว้เพื่อให้ Admin ดูได้ตลอดเวลา)
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

    // สร้าง session record ใน user_sessions
    const sessionId = generateUUID()
    try {
      // ── ป้องกัน Login ซ้อน: ปิด active sessions เดิมทั้งหมดของ user ──
      await pool.execute(
        `UPDATE user_sessions 
         SET session_status = 'forced_logout', logout_at = NOW()
         WHERE user_id = ? AND session_status = 'active'`,
        [user.id]
      )

      await pool.execute(
        `INSERT INTO user_sessions (id, user_id, username, login_at, last_active_at, ip_address, user_agent, session_status)
         VALUES (?, ?, ?, NOW(), NOW(), ?, ?, 'active')`,
        [sessionId, user.id, user.username, clientIp, userAgent]
      )
    } catch (sessionError) {
      console.error('Error creating user session:', sessionError)
      // ไม่ block login ถ้าสร้าง session ไม่สำเร็จ
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    )

    // ส่งข้อมูล user และ token กลับไป (ไม่ส่ง password_hash)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      employee_id: user.employee_id,
      nick_name: user.nick_name,
      role: user.role,
      name: user.name,
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        sessionId,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side จะลบ token เอง)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId } = req.body

    // อัพเดท user_sessions — บันทึกเวลา logout
    try {
      if (sessionId) {
        // Logout specific session
        await pool.execute(
          `UPDATE user_sessions 
           SET logout_at = NOW(), session_status = 'logged_out'
           WHERE id = ? AND user_id = ? AND session_status = 'active'`,
          [sessionId, userId]
        )
      } else {
        // Logout latest active session
        await pool.execute(
          `UPDATE user_sessions 
           SET logout_at = NOW(), session_status = 'logged_out'
           WHERE user_id = ? AND session_status = 'active'
           ORDER BY login_at DESC
           LIMIT 1`,
          [userId]
        )
      }
    } catch (sessionError) {
      console.error('Error updating session on logout:', sessionError)
      // ไม่ block logout ถ้า update session ไม่สำเร็จ
    }

    res.json({
      success: true,
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // req.user ถูก set โดย authenticateToken middleware
    const userResponse = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      employee_id: req.user.employee_id,
      nick_name: req.user.nick_name,
      role: req.user.role,
      name: req.user.name,
    }

    res.json({
      success: true,
      data: userResponse,
    })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * POST /api/auth/change-password
 * เปลี่ยนรหัสผ่าน (สำหรับพนักงานเปลี่ยนรหัสผ่านเอง)
 * Access: All authenticated users
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    const userId = req.user.id // ใช้ req.user.id แทน req.user.userId

    // Validation
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      })
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT id, password_hash, username, name, role FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const user = users[0]

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      })
    }

    // Hash new password
    const saltRounds = 10
    const password_hash = await bcrypt.hash(new_password, saltRounds)

    // Update password และ clear temporary_password (ไม่เก็บ plain-text password เพื่อความปลอดภัย)
    // เมื่อ user เปลี่ยนรหัสผ่านเอง จะ clear temporary_password ทิ้ง
    await pool.execute(
      'UPDATE users SET password_hash = ?, temporary_password = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [password_hash, userId]
    )

    // สร้าง notification สำหรับ Admin (ทุกคนที่มี role = 'admin')
    const [adminUsers] = await pool.execute(
      "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL",
      []
    )

    const notificationTitle = 'มีการเปลี่ยนรหัสผ่าน'
    const notificationMessage = `พนักงาน ${user.name} (${user.username}) ได้เปลี่ยนรหัสผ่านแล้ว`

    for (const admin of adminUsers) {
      const notificationId = generateUUID()
      await pool.execute(
        `INSERT INTO notifications (
          id, user_id, type, category, priority, title, message,
          icon, color, action_url, related_user_id, related_entity_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,
          admin.id,
          'password_change',
          'user_management',
          'medium',
          notificationTitle,
          notificationMessage,
          'TbKey',
          'orange',
          '/users',
          userId,
          'user',
        ]
      )
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
      error: error.message,
    })
  }
})

export default router
