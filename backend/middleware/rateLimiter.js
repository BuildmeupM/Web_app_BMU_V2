/**
 * Rate Limiting Middleware
 * ป้องกัน brute force attacks และ DoS attacks
 */

import rateLimit from 'express-rate-limit'

/**
 * Rate limiter สำหรับ login endpoint
 * จำกัด 5 ครั้งต่อ 15 นาที
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: true,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress
  },
})

/**
 * General API rate limiter
 * จำกัด 250 requests ต่อ 15 นาที (เพิ่มจาก 100 เพื่อลด 429 ในหน้ายื่นภาษี/ตรวจภาษี ที่มีการโหลด list + summary + employee หลายรายการ)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 250, // จำกัด 250 requests ต่อ window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Fix 6: Rate limiter สำหรับ leave/WFH request endpoint
 * จำกัด 5 ครั้งต่อ 1 นาที ป้องกันการ spam คำขอ
 */
export const leaveRequestRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 5, // จำกัด 5 requests ต่อ window
  message: {
    success: false,
    message: 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use both IP and employee_id for more accurate limiting
    return `${req.ip}-${req.user?.employee_id || 'anonymous'}`
  },
})
