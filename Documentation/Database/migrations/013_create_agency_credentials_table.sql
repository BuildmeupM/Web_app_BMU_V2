-- Migration 013: Create agency_credentials table
-- Description: ตารางสำหรับเก็บรหัสผู้ใช้และรหัสผ่านของหน่วยงานต่างๆ
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md
-- Security Note: รหัสผ่านควร Encrypt ก่อนเก็บใน Database

CREATE TABLE IF NOT EXISTS agency_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- E-filing
  efiling_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ E-filing',
  efiling_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน E-filing (ควร Encrypt)',
  
  -- SSO (ประกันสังคม)
  sso_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ SSO',
  sso_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน SSO (ควร Encrypt)',
  
  -- DBD
  dbd_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ DBD',
  dbd_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน DBD (ควร Encrypt)',
  
  -- กยศ.
  student_loan_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ กยศ.',
  student_loan_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน กยศ. (ควร Encrypt)',
  
  -- กรมบังคับคดี
  enforcement_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ กรมบังคับคดี',
  enforcement_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน กรมบังคับคดี (ควร Encrypt)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_agency_credentials_build (build),
  UNIQUE KEY uk_agency_credentials_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE agency_credentials COMMENT = 'ตารางข้อมูลรหัสผู้ใช้และรหัสผ่านของหน่วยงานต่างๆ (ควร Encrypt รหัสผ่านก่อนเก็บ)';
