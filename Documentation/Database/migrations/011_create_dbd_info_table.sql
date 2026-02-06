-- Migration 011: Create dbd_info table
-- Description: ตารางสำหรับเก็บข้อมูลกรมพัฒนาธุรกิจ (DBD)
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md

CREATE TABLE IF NOT EXISTS dbd_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Accounting Period
  accounting_period VARCHAR(100) NULL COMMENT 'รอบบัญชี',
  
  -- Capital Information
  registered_capital DECIMAL(15,2) NULL COMMENT 'ทุนจดทะเบียน',
  paid_capital DECIMAL(15,2) NULL COMMENT 'ทุนชำระ',
  
  -- Business Information
  business_code VARCHAR(100) NULL COMMENT 'รหัสธุรกิจ',
  business_objective_at_registration TEXT NULL COMMENT 'วัตถุประสงค์ ตอนจดทะเบียน',
  
  -- Latest Filing Information
  latest_business_code VARCHAR(100) NULL COMMENT 'รหัสธุรกิจ ที่ส่งงบปีล่าสุด',
  latest_business_objective TEXT NULL COMMENT 'วัตถุประสงค์ ที่ส่งงบปีล่าสุด',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_dbd_info_build (build),
  UNIQUE KEY uk_dbd_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE dbd_info COMMENT = 'ตารางข้อมูลกรมพัฒนาธุรกิจ (DBD)';
