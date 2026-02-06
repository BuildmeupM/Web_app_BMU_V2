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
    return { valid: false, message: 'Username is required' }
  }

  // Trim whitespace
  const trimmed = username.trim()

  // Check length
  if (trimmed.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' }
  }

  if (trimmed.length > 50) {
    return { valid: false, message: 'Username must be less than 50 characters' }
  }

  // Check format (alphanumeric, underscore, dot, hyphen)
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      valid: false,
      message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
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
    return { valid: false, message: 'Password is required' }
  }

  // Check length
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' }
  }

  // Strict validation (for registration/password change)
  if (strict) {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUpperCase) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }

    if (!hasLowerCase) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }

    if (!hasNumber) {
      return { valid: false, message: 'Password must contain at least one number' }
    }

    if (!hasSpecialChar) {
      return {
        valid: false,
        message: 'Password must contain at least one special character',
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
    return { valid: false, message: 'Email is required' }
  }

  const trimmed = email.trim().toLowerCase()

  if (!validator.isEmail(trimmed)) {
    return { valid: false, message: 'Invalid email format' }
  }

  if (trimmed.length > 100) {
    return { valid: false, message: 'Email must be less than 100 characters' }
  }

  return { valid: true, email: trimmed }
}
