/**
 * Validation Middleware
 * Input validation สำหรับ Employee routes
 */

import { body, validationResult } from 'express-validator'

/**
 * Validate employee creation
 */
export const validateEmployee = [
  body('employee_id')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Employee ID must be between 1 and 20 characters'),
  
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isLength({ max: 100 })
    .withMessage('Position must be less than 100 characters'),
  
  body('id_card')
    .notEmpty()
    .withMessage('ID Card is required')
    .matches(/^\d{13}$/)
    .withMessage('ID Card must be exactly 13 digits'),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('first_name')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('hire_date')
    .notEmpty()
    .withMessage('Hire date is required')
    .isISO8601()
    .withMessage('Hire date must be a valid date'),
  
  body('status')
    .optional()
    .isIn(['active', 'resigned'])
    .withMessage('Status must be active or resigned'),
  
  body('phone')
    .optional()
    .matches(/^[0-9-+() ]+$/)
    .withMessage('Phone number format is invalid'),
  
  body('personal_email')
    .optional()
    .isEmail()
    .withMessage('Personal email must be a valid email'),
  
  body('company_email')
    .optional()
    .isEmail()
    .withMessage('Company email must be a valid email'),
  
  body('postal_code')
    .optional()
    .matches(/^\d{5}$/)
    .withMessage('Postal code must be 5 digits'),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      })
    }
    next()
  },
]

/**
 * Validate employee update
 */
export const validateEmployeeUpdate = [
  body('employee_id')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Employee ID must be between 1 and 20 characters'),
  
  body('id_card')
    .optional()
    .matches(/^\d{13}$/)
    .withMessage('ID Card must be exactly 13 digits'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('phone')
    .optional()
    .matches(/^[0-9-+() ]+$/)
    .withMessage('Phone number format is invalid'),
  
  body('personal_email')
    .optional()
    .isEmail()
    .withMessage('Personal email must be a valid email'),
  
  body('company_email')
    .optional()
    .isEmail()
    .withMessage('Company email must be a valid email'),
  
  body('postal_code')
    .optional()
    .matches(/^\d{5}$/)
    .withMessage('Postal code must be 5 digits'),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      })
    }
    next()
  },
]
