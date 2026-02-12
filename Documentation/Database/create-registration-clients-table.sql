-- =============================================
-- Registration Clients Table
-- ตารางข้อมูลลูกค้างานทะเบียน (แยกจาก clients รายเดือน)
-- =============================================

CREATE TABLE IF NOT EXISTS registration_clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_name VARCHAR(500) NOT NULL COMMENT 'ชื่อลูกค้า / บริษัท',
  legal_entity_number VARCHAR(13) NULL COMMENT 'เลขนิติบุคคล',
  phone VARCHAR(50) NULL COMMENT 'เบอร์โทร',
  group_name VARCHAR(200) NOT NULL COMMENT 'ชื่อกลุ่ม',
  line_api VARCHAR(500) NULL COMMENT 'API Line',
  notes TEXT NULL COMMENT 'หมายเหตุเพิ่มเติม',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'สถานะ active/inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_reg_clients_company_name (company_name(100)),
  INDEX idx_reg_clients_group_name (group_name),
  INDEX idx_reg_clients_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
