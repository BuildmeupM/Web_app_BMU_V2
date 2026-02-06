-- Migration: 032_create_accounting_marketplace_listings_table.sql
-- Description: สร้างตาราง accounting_marketplace_listings สำหรับระบบตลาดกลางผู้ทำบัญชี
-- Created: 2026-02-04

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
