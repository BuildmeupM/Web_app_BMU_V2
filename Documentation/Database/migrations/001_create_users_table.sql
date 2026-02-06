-- Migration: 001_create_users_table.sql
-- Description: สร้างตาราง users สำหรับระบบ Authentication และ User Management
-- Created: 2026-01-29

-- สร้างตาราง users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  employee_id VARCHAR(20) NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  nick_name VARCHAR(100) NULL COMMENT 'ชื่อเล่น (เช่น เอ็ม, ซอคเกอร์, มิ้น)',
  role ENUM('admin', 'data_entry', 'data_entry_and_service', 'audit', 'service') NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'ชื่อเต็ม',
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_role (role),
  INDEX idx_users_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่ม comment สำหรับตาราง
ALTER TABLE users COMMENT = 'ตารางผู้ใช้ระบบ (Authentication และ User Management)';
