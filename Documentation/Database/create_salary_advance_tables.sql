-- =====================================================
-- Salary Advance & Document Requests Tables
-- สร้างตารางสำหรับระบบขอเบิกเงินเดือนและขอเอกสาร
-- =====================================================

-- 1. ตารางคำขอเบิกเงินเดือนล่วงหน้า
CREATE TABLE IF NOT EXISTS salary_advance_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  request_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('รออนุมัติ','อนุมัติแล้ว','ไม่อนุมัติ') NOT NULL DEFAULT 'รออนุมัติ',
  approved_by VARCHAR(36) NULL,
  approved_at DATETIME NULL,
  approver_note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_employee_id (employee_id),
  INDEX idx_status (status),
  INDEX idx_request_date (request_date),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางคำขอเอกสาร (หนังสือรับรองการทำงาน / หนังสือรับรองเงินเดือน)
CREATE TABLE IF NOT EXISTS document_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  request_date DATE NOT NULL,
  document_type ENUM('หนังสือรับรองการทำงาน','หนังสือรับรองเงินเดือน') NOT NULL,
  purpose TEXT NULL,
  copies INT NOT NULL DEFAULT 1,
  status ENUM('รออนุมัติ','อนุมัติแล้ว','ไม่อนุมัติ','ออกเอกสารแล้ว') NOT NULL DEFAULT 'รออนุมัติ',
  approved_by VARCHAR(36) NULL,
  approved_at DATETIME NULL,
  approver_note TEXT NULL,
  issued_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_employee_id (employee_id),
  INDEX idx_document_type (document_type),
  INDEX idx_status (status),
  INDEX idx_request_date (request_date),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
