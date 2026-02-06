-- Migration 009: Create clients table
-- Description: ตารางสำหรับเก็บข้อมูลพื้นฐานของลูกค้า
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) UNIQUE NOT NULL COMMENT 'รหัสลูกค้า 3 หลัก (เช่น 001, 061, 315)',
  
  -- Basic Information
  business_type ENUM('บริษัทจำกัด', 'บริษัทมหาชนจำกัด', 'ห้างหุ้นส่วน') NOT NULL COMMENT 'ประเภทของกิจการ',
  company_name VARCHAR(500) NOT NULL COMMENT 'ชื่อบริษัท',
  legal_entity_number VARCHAR(13) UNIQUE NOT NULL COMMENT 'เลขทะเบียนนิติบุคคล 13 หลัก',
  establishment_date DATE NULL COMMENT 'วันจัดตั้งกิจการ',
  business_category VARCHAR(200) NULL COMMENT 'ประเภทธุรกิจ',
  business_subcategory VARCHAR(200) NULL COMMENT 'ประเภทธุรกิจย่อย',
  company_size ENUM('SS', 'S', 'MM', 'M', 'LL', 'L', 'XL', 'XXL') NULL COMMENT 'ไซต์บริษัท',
  
  -- Tax Registration
  tax_registration_status ENUM('จดภาษีมูลค่าเพิ่ม', 'ยังไม่จดภาษีมูลค่าเพิ่ม') NULL COMMENT 'สถานะจดทะเบียนภาษี',
  vat_registration_date DATE NULL COMMENT 'วันที่จดภาษีมูลค่าเพิ่ม',
  
  -- Address (Full Address)
  full_address TEXT NULL COMMENT 'ที่อยู่บริษัทแบบรวมทั้งหมด',
  village VARCHAR(200) NULL COMMENT 'หมู่บ้าน',
  building VARCHAR(200) NULL COMMENT 'อาคาร',
  room_number VARCHAR(50) NULL COMMENT 'ห้องเลขที่',
  floor_number VARCHAR(50) NULL COMMENT 'ชั้นที่',
  address_number VARCHAR(50) NULL COMMENT 'เลขที่',
  soi VARCHAR(200) NULL COMMENT 'ซอย/ตรอก',
  moo VARCHAR(50) NULL COMMENT 'หมู่ที่',
  road VARCHAR(200) NULL COMMENT 'ถนน',
  subdistrict VARCHAR(200) NULL COMMENT 'แขวง/ตำบล',
  district VARCHAR(200) NULL COMMENT 'อำเภอ/เขต',
  province VARCHAR(200) NULL COMMENT 'จังหวัด',
  postal_code VARCHAR(10) NULL COMMENT 'รหัสไปรษณี',
  
  -- Company Status
  company_status ENUM('รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย', 'ยกเลิกทำ') DEFAULT 'รายเดือน' COMMENT 'สถานะบริษัท',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_clients_build (build),
  INDEX idx_clients_legal_entity_number (legal_entity_number),
  INDEX idx_clients_company_status (company_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE clients COMMENT = 'ตารางข้อมูลพื้นฐานของลูกค้า';
