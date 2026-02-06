-- Migration: 005_add_temporary_password_to_users.sql
-- Description: เพิ่ม column temporary_password ในตาราง users เพื่อเก็บรหัสผ่านชั่วคราวสำหรับ Admin ดู
-- Created: 2026-01-31

-- เพิ่ม column temporary_password
ALTER TABLE users 
ADD COLUMN temporary_password VARCHAR(255) NULL COMMENT 'รหัสผ่านชั่วคราวสำหรับ Admin ดู (เก็บแบบ plain text)';

-- เพิ่ม index สำหรับ query (optional)
-- CREATE INDEX idx_users_temporary_password ON users(temporary_password) WHERE temporary_password IS NOT NULL;
