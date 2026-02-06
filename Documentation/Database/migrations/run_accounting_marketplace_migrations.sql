-- Run Accounting Marketplace Migrations
-- Description: รัน migrations สำหรับระบบตลาดกลางผู้ทำบัญชี
-- Created: 2026-02-04
-- Usage: รันไฟล์นี้ใน phpMyAdmin หรือ MySQL CLI

-- ============================================
-- Migration 032: Create Accounting Marketplace Listings Table
-- ============================================

CREATE TABLE IF NOT EXISTS accounting_marketplace_listings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'Build number ของบริษัท',
  tax_year YEAR(4) NOT NULL COMMENT 'ปีภาษี',
  tax_month TINYINT NOT NULL COMMENT 'เดือนภาษี (1-12)',
  seller_employee_id VARCHAR(20) NOT NULL COMMENT 'ผู้ขาย (accounting_responsible เดิม)',
  price DECIMAL(10,2) NOT NULL COMMENT 'ราคา (ขั้นต่ำ 300 บาท)',
  status ENUM('available', 'sold', 'cancelled') DEFAULT 'available' COMMENT 'สถานะ: available=ขายได้, sold=ขายแล้ว, cancelled=ยกเลิก',
  sold_to_employee_id VARCHAR(20) NULL COMMENT 'ผู้ซื้อ',
  sold_at DATETIME NULL COMMENT 'เวลาที่ขาย',
  cancelled_at DATETIME NULL COMMENT 'เวลาที่ยกเลิก',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (seller_employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (sold_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_listings_build (build),
  INDEX idx_listings_month (tax_year, tax_month),
  INDEX idx_listings_seller (seller_employee_id),
  INDEX idx_listings_status (status),
  INDEX idx_listings_sold_to (sold_to_employee_id),
  UNIQUE KEY uk_listings_build_month (build, tax_year, tax_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Migration 033: Add Accounting Marketplace Notification Type
-- ============================================

ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  -- User Management
  'password_change', 'user_created', 'user_updated', 'user_deleted',
  -- Leave & WFH
  'leave_request_created', 'leave_request_approved', 'leave_request_rejected', 'leave_request_cancelled',
  'wfh_request_created', 'wfh_request_approved', 'wfh_request_rejected', 'wfh_request_cancelled',
  -- Work Assignment
  'work_assignment_created', 'work_assignment_updated', 'work_assignment_deleted',
  -- Client Management
  'client_created', 'client_updated', 'client_deleted', 'client_import_completed',
  -- Tax & Document
  'tax_data_updated', 'tax_filing_due', 'document_entry_completed', 'document_entry_pending',
  'tax_review_pending', 'tax_review_pending_recheck', 'tax_inspection_completed',
  -- Accounting Marketplace
  'accounting_marketplace_sold',
  -- System & General
  'system', 'reminder', 'alert', 'info'
) NOT NULL COMMENT 'ประเภทการแจ้งเตือน';

-- ============================================
-- Verify Migrations
-- ============================================

-- Verify table created
SHOW TABLES LIKE 'accounting_marketplace_listings';

-- Verify notification type added
SHOW COLUMNS FROM notifications WHERE Field = 'type';
