-- Migration 010: Create accounting_fees table
-- Description: ตารางสำหรับเก็บข้อมูลค่าบริการทำบัญชีและ HR แยกตามเดือน (ตาม Excel Layout)
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md

CREATE TABLE IF NOT EXISTS accounting_fees (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Peak System
  peak_code VARCHAR(100) NULL COMMENT 'รหัส Peak (เช่น C000001, Build008, Build010)',
  
  -- Accounting Period
  accounting_start_date DATE NULL COMMENT 'วันที่เริ่มทำบัญชี',
  accounting_end_date DATE NULL COMMENT 'วันที่สิ้นสุดการทำบัญชี',
  accounting_end_reason TEXT NULL COMMENT 'หมายเหตุการสิ้นสุดการทำบัญชี',
  
  -- Year
  fee_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  
  -- Monthly Accounting Fees (12 เดือน - ตาม Excel Layout)
  accounting_fee_jan DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มกราคม',
  accounting_fee_feb DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กุมภาพันธ์',
  accounting_fee_mar DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มีนาคม',
  accounting_fee_apr DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - เมษายน',
  accounting_fee_may DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - พฤษภาคม',
  accounting_fee_jun DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มิถุนายน',
  accounting_fee_jul DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กรกฎาคม',
  accounting_fee_aug DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - สิงหาคม',
  accounting_fee_sep DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กันยายน',
  accounting_fee_oct DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - ตุลาคม',
  accounting_fee_nov DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - พฤศจิกายน',
  accounting_fee_dec DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - ธันวาคม',
  
  -- Monthly HR Fees (12 เดือน - ตาม Excel Layout)
  hr_fee_jan DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มกราคม',
  hr_fee_feb DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กุมภาพันธ์',
  hr_fee_mar DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มีนาคม',
  hr_fee_apr DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - เมษายน',
  hr_fee_may DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - พฤษภาคม',
  hr_fee_jun DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มิถุนายน',
  hr_fee_jul DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กรกฎาคม',
  hr_fee_aug DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - สิงหาคม',
  hr_fee_sep DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กันยายน',
  hr_fee_oct DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - ตุลาคม',
  hr_fee_nov DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - พฤศจิกายน',
  hr_fee_dec DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - ธันวาคม',
  
  -- API Line Information
  line_chat_type VARCHAR(50) NULL COMMENT 'Type Chat สำหรับส่งข้อความหาลูกค้า (Group, Userid)',
  line_chat_id VARCHAR(200) NULL COMMENT 'API Line สำหรับส่งข้อความหาลูกค้า',
  line_billing_chat_type VARCHAR(50) NULL COMMENT 'Type Chat สำหรับวางบิล (Group, Userid)',
  line_billing_id VARCHAR(200) NULL COMMENT 'API Line สำหรับวางบิล',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_accounting_fees_build (build),
  INDEX idx_accounting_fees_year (fee_year),
  UNIQUE KEY uk_accounting_fees_build_year (build, fee_year, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE accounting_fees COMMENT = 'ตารางข้อมูลค่าบริการทำบัญชีและ HR แยกตามเดือน (ตาม Excel Layout)';
