-- Migration 015: Create document_entry_work table
-- Description: ตารางสำหรับเก็บข้อมูลงานคีย์เอกสาร - เชื่อมกับหน้า คีย์เอกสาร
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md
-- Important: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่

CREATE TABLE IF NOT EXISTS document_entry_work (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  work_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  work_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Entry Information
  entry_timestamp DATETIME NOT NULL COMMENT 'timestamp - สำหรับพนักงานส่งข้อมูลเข้ามาระบบจะเก็บข้อมูลว่าส่งเข้ามาตอนไหน (ในเดือนนี้)',
  submission_count INT DEFAULT 1 COMMENT 'จำนวนครั้งที่ส่งเข้ามาในระบบ (ในเดือนนี้)',
  
  -- Responsible Employee
  responsible_employee_id VARCHAR(20) NOT NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ (employee_id)',
  current_responsible_employee_id VARCHAR(20) NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ - คนปัจจุบัน (employee_id)',
  
  -- Responsibility Change Tracking
  responsibility_changed_date DATETIME NULL COMMENT 'วันที่เปลี่ยนผู้รับผิดชอบ',
  responsibility_changed_by VARCHAR(20) NULL COMMENT 'ชื่อผู้เปลี่ยนผู้รับผิดชอบ (employee_id)',
  responsibility_change_note TEXT NULL COMMENT 'หมายเหตุเปลี่ยนผู้รับผิดชอบ',
  
  -- Withholding Tax Documents (เอกสารหัก ณ ที่จ่าย)
  wht_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารหัก ณ ที่จ่าย',
  wht_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารหัก ณ ที่จ่าย',
  wht_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารหัก ณ ที่จ่าย',
  wht_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารหัก ณ ที่จ่าย',
  wht_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารหัก ณ ที่จ่าย (employee_id)',
  
  -- VAT Documents (เอกสารภาษีมูลค่าเพิ่ม)
  vat_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารภาษีมูลค่าเพิ่ม',
  vat_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารภาษีมูลค่าเพิ่ม (employee_id)',
  
  -- Non-VAT Documents (เอกสารไม่มีภาษีมูลค่าเพิ่ม)
  non_vat_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารไม่มีภาษีมูลค่าเพิ่ม (employee_id)',
  
  -- Comments
  submission_comment TEXT NULL COMMENT 'ความคิดเห็นส่งมอบงานคีย์',
  return_comment TEXT NULL COMMENT 'ความคิดเห็นส่งคืนงานคีย์',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (responsible_employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (current_responsible_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (responsibility_changed_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (non_vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_document_entry_work_build (build),
  INDEX idx_document_entry_work_month (work_year, work_month),
  INDEX idx_document_entry_work_responsible (responsible_employee_id),
  INDEX idx_document_entry_work_current_responsible (current_responsible_employee_id),
  INDEX idx_document_entry_work_entry_timestamp (entry_timestamp),
  INDEX idx_document_entry_work_wht_status (wht_entry_status),
  INDEX idx_document_entry_work_vat_status (vat_entry_status),
  INDEX idx_document_entry_work_non_vat_status (non_vat_entry_status),
  UNIQUE KEY uk_document_entry_work_build_month (build, work_year, work_month, deleted_at) COMMENT 'ป้องกันข้อมูลซ้ำในเดือนเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE document_entry_work COMMENT = 'ตารางข้อมูลงานคีย์เอกสาร - รีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่';
