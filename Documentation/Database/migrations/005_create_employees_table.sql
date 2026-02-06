-- Migration: 005_create_employees_table.sql
-- Description: สร้างตาราง employees สำหรับเก็บข้อมูลพนักงานครบถ้วนตาม requirements
-- Created: 2026-01-29
-- Reference: Documentation/Database/MyDatabase/employee.md

CREATE TABLE IF NOT EXISTS employees (
  -- Primary Key
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- Basic Information
  employee_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'รหัสพนักงาน (เชื่อมกับ users.employee_id)',
  user_id VARCHAR(36) NULL COMMENT 'Foreign Key to users (สำหรับพนักงานที่เข้าสู่ระบบได้)',
  position VARCHAR(100) NOT NULL COMMENT 'ตำแหน่งการทำงาน',
  
  -- Personal Information
  id_card VARCHAR(13) UNIQUE NOT NULL COMMENT 'รหัสบัตรประชาชน 13 หลัก',
  gender ENUM('male', 'female', 'other') NOT NULL COMMENT 'เพศ',
  first_name VARCHAR(100) NOT NULL COMMENT 'ชื่อจริง',
  last_name VARCHAR(100) NOT NULL COMMENT 'นามสกุล',
  full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED COMMENT 'ชื่อ - นามสกุล (auto-generated)',
  english_name VARCHAR(200) NULL COMMENT 'ชื่อภาษาอังกฤษ',
  nick_name VARCHAR(100) NULL COMMENT 'ชื่อเล่น',
  birth_date DATE NULL COMMENT 'วันเกิด',
  
  -- Contact Information
  phone VARCHAR(20) NULL COMMENT 'เบอร์โทร',
  personal_email VARCHAR(100) NULL COMMENT 'อีเมลส่วนตัว',
  company_email VARCHAR(100) UNIQUE NULL COMMENT 'อีเมลบริษัท (Email Build)',
  company_email_password VARCHAR(255) NULL COMMENT 'รหัสผ่านอีเมลบริษัท (PassWord E-mail Buildme)',
  
  -- Employment Information
  hire_date DATE NOT NULL COMMENT 'วันเริ่มงาน',
  probation_end_date DATE NULL COMMENT 'วันผ่านงาน (วันสิ้นสุดทดลองงาน)',
  resignation_date DATE NULL COMMENT 'วันสิ้นสุด (วันลาออก)',
  status ENUM('active', 'resigned') DEFAULT 'active' COMMENT 'สถานะงาน (ทำงานอยู่, ลาออก)',
  
  -- Address Information (Detailed)
  address_full TEXT NULL COMMENT 'ที่อยู่รวม (รวมทุกส่วน)',
  village VARCHAR(100) NULL COMMENT 'หมู่บ้าน',
  building VARCHAR(100) NULL COMMENT 'อาคาร',
  room_number VARCHAR(50) NULL COMMENT 'ห้องเลขที่',
  floor_number VARCHAR(50) NULL COMMENT 'ชั้นที่',
  house_number VARCHAR(50) NULL COMMENT 'เลขที่',
  soi_alley VARCHAR(100) NULL COMMENT 'ซอย/ตรอก',
  moo VARCHAR(50) NULL COMMENT 'หมู่ที่',
  road VARCHAR(100) NULL COMMENT 'ถนน',
  sub_district VARCHAR(100) NULL COMMENT 'แขวง/ตำบล',
  district VARCHAR(100) NULL COMMENT 'อำเภอ/เขต',
  province VARCHAR(100) NULL COMMENT 'จังหวัด',
  postal_code VARCHAR(10) NULL COMMENT 'รหัสไปรษณีย์',
  
  -- Media
  profile_image VARCHAR(500) NULL COMMENT 'รูปภาพพนักงาน (path/URL)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes for Performance
  INDEX idx_employees_employee_id (employee_id),
  INDEX idx_employees_user_id (user_id),
  INDEX idx_employees_id_card (id_card),
  INDEX idx_employees_status (status),
  INDEX idx_employees_position (position),
  INDEX idx_employees_hire_date (hire_date),
  INDEX idx_employees_probation_end_date (probation_end_date),
  INDEX idx_employees_resignation_date (resignation_date),
  INDEX idx_employees_full_name (full_name),
  INDEX idx_employees_company_email (company_email),
  
  -- Composite Indexes for Common Queries
  INDEX idx_employees_status_hire_date (status, hire_date),
  INDEX idx_employees_status_position (status, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- หมายเหตุ:
-- 1. full_name เป็น GENERATED COLUMN ที่ auto-generate จาก first_name + last_name
-- 2. address_full สามารถเก็บที่อยู่รวม หรือจะแยกเก็บแต่ละส่วนก็ได้
-- 3. company_email_password ควร encrypt ก่อนเก็บ (ใช้ encryption function)
-- 4. profile_image เก็บ path หรือ URL ของรูปภาพ
