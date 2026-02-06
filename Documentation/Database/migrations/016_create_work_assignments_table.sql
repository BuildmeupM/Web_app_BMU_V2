-- Migration 016: Create work_assignments table
-- Description: ตารางสำหรับเก็บข้อมูลการจัดงานรายเดือน - ผู้ใช้งานจะต้องเป็นคนเปลี่ยนงานเองใหม่ในแต่ละเดือน
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md
-- Important: การเปลี่ยนงานคือรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work ใหม่ทั้งหมด

CREATE TABLE IF NOT EXISTS work_assignments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  assignment_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  assignment_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Responsible Employees (ผู้รับผิดชอบแต่ละส่วน)
  accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชี (employee_id)',
  tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบการตรวจภาษีรายเดือน (employee_id)',
  wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT (employee_id)',
  vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT (employee_id)',
  document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เอกสาร (employee_id)',
  
  -- Assignment Information
  assigned_by VARCHAR(36) NOT NULL COMMENT 'ผู้ที่จัดงาน (user_id)',
  assigned_at DATETIME NOT NULL COMMENT 'วันที่และเวลาที่จัดงาน',
  assignment_note TEXT NULL COMMENT 'หมายเหตุการจัดงาน',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE COMMENT 'สถานะการจัดงาน (true = ใช้งานอยู่, false = ยกเลิก)',
  is_reset_completed BOOLEAN DEFAULT FALSE COMMENT 'สถานะการรีเซ็ตข้อมูล (true = รีเซ็ตเสร็จแล้ว, false = ยังไม่รีเซ็ต)',
  reset_completed_at DATETIME NULL COMMENT 'วันที่และเวลาที่รีเซ็ตข้อมูลเสร็จ',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  INDEX idx_work_assignments_build (build),
  INDEX idx_work_assignments_month (assignment_year, assignment_month),
  INDEX idx_work_assignments_accounting_responsible (accounting_responsible),
  INDEX idx_work_assignments_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_work_assignments_wht_filer_responsible (wht_filer_responsible),
  INDEX idx_work_assignments_vat_filer_responsible (vat_filer_responsible),
  INDEX idx_work_assignments_document_entry_responsible (document_entry_responsible),
  INDEX idx_work_assignments_assigned_by (assigned_by),
  INDEX idx_work_assignments_is_active (is_active),
  UNIQUE KEY uk_work_assignments_build_month (build, assignment_year, assignment_month, deleted_at) COMMENT 'ป้องกันข้อมูลซ้ำในเดือนเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE work_assignments COMMENT = 'ตารางข้อมูลการจัดงานรายเดือน - เมื่อมีการจัดงานใหม่จะรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work';
