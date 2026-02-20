/**
 * Input Validation Utilities
 * ใช้สำหรับ validate และ sanitize inputs
 */

import validator from 'validator'

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} { valid: boolean, message: string }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'กรุณากรอกชื่อผู้ใช้งาน' }
  }

  // Trim whitespace
  const trimmed = username.trim()

  // Check length
  if (trimmed.length < 3) {
    return { valid: false, message: 'ชื่อผู้ใช้งานต้องมีอย่างน้อย 3 ตัวอักษร' }
  }

  if (trimmed.length > 50) {
    return { valid: false, message: 'ชื่อผู้ใช้งานต้องไม่เกิน 50 ตัวอักษร' }
  }

  // Check format (alphanumeric, underscore, dot, hyphen)
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      valid: false,
      message: 'ชื่อผู้ใช้งานสามารถประกอบด้วยตัวอักษร ตัวเลข จุด ขีดล่าง และขีดกลางเท่านั้น',
    }
  }

  return { valid: true, username: trimmed }
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {boolean} strict - If true, require strong password (for registration)
 * @returns {object} { valid: boolean, message: string }
 */
export function validatePassword(password, strict = false) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'กรุณากรอกรหัสผ่าน' }
  }

  // Check length
  if (password.length < 8) {
    return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
  }

  if (password.length > 128) {
    return { valid: false, message: 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร' }
  }

  // Strict validation (for registration/password change)
  if (strict) {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUpperCase) {
      return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' }
    }

    if (!hasLowerCase) {
      return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว' }
    }

    if (!hasNumber) {
      return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' }
    }

    if (!hasSpecialChar) {
      return {
        valid: false,
        message: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว',
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Trim whitespace
  let sanitized = input.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Escape HTML (basic)
  sanitized = validator.escape(sanitized)

  return sanitized
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {object} { valid: boolean, message: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'กรุณากรอกอีเมล' }
  }

  const trimmed = email.trim().toLowerCase()

  if (!validator.isEmail(trimmed)) {
    return { valid: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' }
  }

  if (trimmed.length > 100) {
    return { valid: false, message: 'อีเมลต้องไม่เกิน 100 ตัวอักษร' }
  }

  return { valid: true, email: trimmed }
}
