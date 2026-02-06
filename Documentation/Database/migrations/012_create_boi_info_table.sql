-- Migration 012: Create boi_info table
-- Description: ตารางสำหรับเก็บข้อมูลสิทธิ์ BOI
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md

CREATE TABLE IF NOT EXISTS boi_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- BOI Dates
  boi_approval_date DATE NULL COMMENT 'วันที่ได้รับสิทธิ์ BOI',
  boi_first_use_date DATE NULL COMMENT 'วันที่ใช้สิทธิ์ BOI ครั้งแรก',
  boi_expiry_date DATE NULL COMMENT 'วันที่หมดอายุสิทธิ์ BOI',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_boi_info_build (build),
  UNIQUE KEY uk_boi_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE boi_info COMMENT = 'ตารางข้อมูลสิทธิ์ BOI';
