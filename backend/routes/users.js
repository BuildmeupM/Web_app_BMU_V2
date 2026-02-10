/**
 * Users Routes
 * Routes สำหรับการจัดการข้อมูล users
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import bcrypt from 'bcrypt'
import { generateUUID } from '../utils/leaveHelpers.js'

const router = express.Router()

/**
 * GET /api/users
 * ดึงรายการ users (สามารถกรองตาม role และ status)
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      role = '',
      roles = '', // สำหรับกรองหลาย role (comma-separated)
      status = 'active',
      search = '',
    } = req.query

    // Build WHERE clause
    const whereConditions = ['u.deleted_at IS NULL']
    const queryParams = []

    // Filter by status
    if (status && status !== 'all') {
      whereConditions.push('u.status = ?')
      queryParams.push(status)
    }

    // Filter by single role
    if (role && role !== 'all') {
      whereConditions.push('u.role = ?')
      queryParams.push(role)
    }

    // Filter by multiple roles (comma-separated)
    if (roles && roles !== 'all') {
      const roleArray = roles.split(',').map((r) => r.trim()).filter((r) => r)
      if (roleArray.length > 0) {
        const placeholders = roleArray.map(() => '?').join(',')
        whereConditions.push(`u.role IN (${placeholders})`)
        queryParams.push(...roleArray)
      }
    }

    // Search by employee_id or name
    if (search) {
      whereConditions.push('(u.employee_id LIKE ? OR u.name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ')

    // Get users (รวม temporary_password สำหรับ Admin)
    const [users] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.employee_id,
        u.nick_name,
        u.role,
        u.name,
        u.status,
        u.temporary_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      ${whereClause}
      ORDER BY u.employee_id ASC, u.name ASC`,
      queryParams
    )

    res.json({
      success: true,
      data: users,
      total: users.length,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูล users ได้',
      error: error.message,
    })
  }
})

/**
 * GET /api/users/:id
 * ดึงข้อมูล user ตาม ID
 * Access: Admin only
 */
router.get('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params

    const [users] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.employee_id,
        u.nick_name,
        u.role,
        u.name,
        u.status,
        u.temporary_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.json({
      success: true,
      data: users[0],
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูล user ได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/users
 * สร้าง user account ใหม่
 * Access: Admin only
 */
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      employee_id,
      nick_name,
      role,
      name,
      status = 'active',
    } = req.body

    // Validation
    if (!username || !email || !password || !role || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          username: !username ? 'Required' : undefined,
          email: !email ? 'Required' : undefined,
          password: !password ? 'Required' : undefined,
          role: !role ? 'Required' : undefined,
          name: !name ? 'Required' : undefined,
        },
      })
    }

    // Validate role
    const validRoles = ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr', 'registration', 'marketing']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      })
    }

    // Validate status
    const validStatuses = ['active', 'inactive']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      })
    }

    // Check if username already exists
    const [existingUsername] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL',
      [username]
    )

    if (existingUsername.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      })
    }

    // Check if email already exists
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      })
    }

    // Check if employee_id already has a user account
    if (employee_id) {
      const [existingEmployee] = await pool.execute(
        'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
        [employee_id]
      )

      if (existingEmployee.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Employee already has a user account',
        })
      }
    }

    // Hash password
    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Generate UUID
    const id = generateUUID()

    // Insert user (เก็บ temporary_password เพื่อให้ Admin ดูได้ตลอดเวลา)
    await pool.execute(
      `INSERT INTO users (
        id, username, email, password_hash, temporary_password, employee_id, nick_name, role, name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        email,
        password_hash,
        password, // เก็บ plain password เพื่อให้ Admin ดูได้ตลอดเวลา
        employee_id || null,
        nick_name || null,
        role,
        name,
        status,
      ]
    )

    // Update employee.user_id if employee_id is provided
    if (employee_id) {
      await pool.execute(
        'UPDATE employees SET user_id = ? WHERE employee_id = ? AND deleted_at IS NULL',
        [id, employee_id]
      )
    }

    // Get created user
    const [newUsers] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.employee_id,
        u.nick_name,
        u.role,
        u.name,
        u.status,
        u.temporary_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?`,
      [id]
    )

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUsers[0],
      temporary_password: password, // Return plain password for one-time display
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้าง user ได้',
      error: error.message,
    })
  }
})

/**
 * PUT /api/users/:id
 * แก้ไขข้อมูล user
 * Access: Admin only
 */
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      username,
      email,
      password,
      employee_id,
      nick_name,
      role,
      name,
      status,
    } = req.body

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id, employee_id FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const existingUser = existingUsers[0]

    // Validation
    if (!username || !email || !role || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: {
          username: !username ? 'Required' : undefined,
          email: !email ? 'Required' : undefined,
          role: !role ? 'Required' : undefined,
          name: !name ? 'Required' : undefined,
        },
      })
    }

    // Validate role
    const validRoles = ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr', 'registration', 'marketing']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      })
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        })
      }
    }

    // Check if username already exists (excluding current user)
    const [existingUsername] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND id != ? AND deleted_at IS NULL',
      [username, id]
    )

    if (existingUsername.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      })
    }

    // Check if email already exists (excluding current user)
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
      [email, id]
    )

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      })
    }

    // Check if employee_id already has a user account (excluding current user)
    if (employee_id) {
      const [existingEmployee] = await pool.execute(
        'SELECT id FROM users WHERE employee_id = ? AND id != ? AND deleted_at IS NULL',
        [employee_id, id]
      )

      if (existingEmployee.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Employee already has a user account',
        })
      }
    }

    // Build update query
    const updateFields = []
    const updateParams = []

    updateFields.push('username = ?')
    updateParams.push(username)

    updateFields.push('email = ?')
    updateParams.push(email)

    updateFields.push('employee_id = ?')
    updateParams.push(employee_id || null)

    updateFields.push('nick_name = ?')
    updateParams.push(nick_name || null)

    updateFields.push('role = ?')
    updateParams.push(role)

    updateFields.push('name = ?')
    updateParams.push(name)

    if (status) {
      updateFields.push('status = ?')
      updateParams.push(status)
    }

    // ถ้ามีการเปลี่ยน password ให้อัพเดท password_hash และ temporary_password ด้วย
    // (เก็บ temporary_password เพื่อให้ Admin ดูได้ตลอดเวลา)
    if (password) {
      const saltRounds = 10
      const password_hash = await bcrypt.hash(password, saltRounds)
      updateFields.push('password_hash = ?')
      updateParams.push(password_hash)
      updateFields.push('temporary_password = ?')
      updateParams.push(password) // เก็บ plain password เพื่อให้ Admin ดูได้ตลอดเวลา
    }

    updateParams.push(id)

    // Update user
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateParams
    )

    // Update employee.user_id if employee_id changed
    if (employee_id && employee_id !== existingUser.employee_id) {
      // Remove user_id from old employee
      if (existingUser.employee_id) {
        await pool.execute(
          'UPDATE employees SET user_id = NULL WHERE employee_id = ? AND deleted_at IS NULL',
          [existingUser.employee_id]
        )
      }
      // Set user_id to new employee
      await pool.execute(
        'UPDATE employees SET user_id = ? WHERE employee_id = ? AND deleted_at IS NULL',
        [id, employee_id]
      )
    } else if (!employee_id && existingUser.employee_id) {
      // Remove user_id if employee_id is removed
      await pool.execute(
        'UPDATE employees SET user_id = NULL WHERE employee_id = ? AND deleted_at IS NULL',
        [existingUser.employee_id]
      )
    }

    // Get updated user (รวม temporary_password เพื่อให้ Admin ดูได้)
    const [updatedUsers] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.employee_id,
        u.nick_name,
        u.role,
        u.name,
        u.status,
        u.temporary_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUsers[0],
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดท user ได้',
      error: error.message,
    })
  }
})

/**
 * DELETE /api/users/:id
 * ลบ user account (Soft Delete)
 * Access: Admin only
 */
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id, employee_id FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const existingUser = existingUsers[0]

    // Prevent deleting own account
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      })
    }

    // Soft delete user
    await pool.execute(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )

    // Remove user_id from employee
    if (existingUser.employee_id) {
      await pool.execute(
        'UPDATE employees SET user_id = NULL WHERE employee_id = ? AND deleted_at IS NULL',
        [existingUser.employee_id]
      )
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบ user ได้',
      error: error.message,
    })
  }
})

/**
 * POST /api/users/:id/reset-password
 * รีเซ็ตรหัสผ่าน user (Admin only)
 * Access: Admin only
 */
router.post('/:id/reset-password', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    // Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // Hash password
    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Update password และ temporary_password (เก็บ temporary_password เพื่อให้ Admin ดูได้ตลอดเวลา)
    await pool.execute(
      'UPDATE users SET password_hash = ?, temporary_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [password_hash, password, id] // เก็บ plain password เพื่อให้ Admin ดูได้ตลอดเวลา
    )

    // Get updated user
    const [updatedUsers] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.employee_id,
        u.nick_name,
        u.role,
        u.name,
        u.status,
        u.temporary_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: updatedUsers[0],
      temporary_password: password, // Return plain password for one-time display
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
      error: error.message,
    })
  }
})

export default router
