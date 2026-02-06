-- Migration: 004_create_login_attempts_table.sql
-- Description: สร้างตาราง login_attempts สำหรับบันทึก failed login attempts และ account lockout
-- Created: 2026-01-29

CREATE TABLE IF NOT EXISTS login_attempts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NULL COMMENT 'User ID (NULL ถ้า username ไม่มีในระบบ)',
  username VARCHAR(50) NOT NULL COMMENT 'Username ที่พยายาม login',
  ip_address VARCHAR(45) NOT NULL COMMENT 'IP address ของผู้พยายาม login',
  user_agent TEXT NULL COMMENT 'User agent string',
  success BOOLEAN DEFAULT FALSE COMMENT 'Login สำเร็จหรือไม่',
  failure_reason VARCHAR(100) NULL COMMENT 'สาเหตุที่ login ล้มเหลว (เช่น invalid_password, account_locked)',
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่พยายาม login',
  INDEX idx_login_attempts_user_id (user_id),
  INDEX idx_login_attempts_username (username),
  INDEX idx_login_attempts_ip_address (ip_address),
  INDEX idx_login_attempts_attempted_at (attempted_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- สร้าง index สำหรับ query ที่ใช้บ่อย (failed attempts ในช่วงเวลาที่กำหนด)
-- หมายเหตุ: MySQL/MariaDB ไม่รองรับ WHERE clause ใน CREATE INDEX (ใช้ได้เฉพาะ PostgreSQL)
-- แต่ index นี้ยังช่วยเพิ่มประสิทธิภาพการ query ได้
CREATE INDEX idx_login_attempts_failed_recent ON login_attempts(username, attempted_at, success);
