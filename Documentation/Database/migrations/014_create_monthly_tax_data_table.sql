-- Migration 014: Create monthly_tax_data table
-- Description: ตารางสำหรับเก็บข้อมูลภาษีรายเดือน - เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี
-- Created: 2026-01-30
-- Reference: Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md
-- Important: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่

CREATE TABLE IF NOT EXISTS monthly_tax_data (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  tax_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  tax_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Responsible Employees
  accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชี (employee_id)',
  tax_inspection_responsible VARCHAR(20) NULL COMMENT 'สถานะเอกสาร (ผู้รับผิดชอบการตรวจภาษีรายเดือน) (employee_id)',
  
  -- Document Receipt
  document_received_date DATETIME NULL COMMENT 'วันที่รับเอกสาร',
  bank_statement_status VARCHAR(100) NULL COMMENT 'สถานะสเตทเม้นท์ธนาคาร',
  
  -- PND (ภงด.) Information
  pnd_sent_for_review_date DATETIME NULL COMMENT 'วันที่ส่งตรวจ ภงด.',
  pnd_review_returned_date DATETIME NULL COMMENT 'วันที่ส่งตรวจคืน ภงด.',
  pnd_sent_to_customer_date DATETIME NULL COMMENT 'วันที่ส่งลูกค้า ภงด.',
  pnd_status VARCHAR(100) NULL COMMENT 'สถานะ ภงด.',
  
  -- PND Forms (Boolean) - ⚠️ DEPRECATED: ถูกลบออกใน migration 023
  -- ระบบใช้ status และ attachment_count แทน (เพิ่มใน migration 021)
  -- pnd_1_40_1, pnd_1_40_2, pnd_3, pnd_53, pp_36, student_loan_form, pnd_2, pnd_54, pt_40, social_security_form
  
  -- Accounting Status
  accounting_record_status VARCHAR(100) NULL COMMENT 'สถานะบันทึกบัญชี',
  monthly_tax_impact VARCHAR(200) NULL COMMENT 'กระทบภาษีประจำเดือน',
  bank_impact VARCHAR(200) NULL COMMENT 'กระทบแบงค์',
  
  -- WHT (Withholding Tax) Information
  wht_draft_completed_date DATETIME NULL COMMENT 'วันที่ร่างแบบเสร็จแล้ว WHT',
  wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น WHT (employee_id)',
  wht_filer_current_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น WHT - คนปัจจุบัน (employee_id)',
  wht_inquiry TEXT NULL COMMENT 'สอบถามเพิ่มเติม ภงด.',
  wht_response TEXT NULL COMMENT 'ตอบกลับ ภงด.',
  wht_submission_comment TEXT NULL COMMENT 'ความเห็นส่งงานยื่นภาษี ภ.ง.ด.',
  wht_filing_response TEXT NULL COMMENT 'ตอบกลับงานยื่นภาษี ภ.ง.ด.',
  
  -- VAT (PP.30) Information
  pp30_sent_for_review_date DATETIME NULL COMMENT 'วันที่ส่งตรวจ ภ.พ. 30',
  pp30_review_returned_date DATETIME NULL COMMENT 'วันที่ส่งตรวจคืน ภ.พ. 30',
  pp30_sent_to_customer_date DATETIME NULL COMMENT 'วันที่ส่งลูกค้า ภ.พ. 30',
  pp30_form BOOLEAN DEFAULT FALSE COMMENT 'แบบ ภพ.30',
  purchase_document_count INT NULL COMMENT 'จำนวนเอกสารภาษีซื้อ',
  income_confirmed BOOLEAN DEFAULT FALSE COMMENT 'คอนเฟิร์มรายได้ (⚠️ Changed to VARCHAR(100) in migration 025)',
  vat_draft_completed_date DATETIME NULL COMMENT 'วันที่ร่างแบบเสร็จแล้ว VAT',
  vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น VAT (employee_id)',
  vat_filer_current_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น VAT - คนปัจจุบัน (employee_id)',
  pp30_inquiry TEXT NULL COMMENT 'สอบถามเพิ่มเติม ภพ.30',
  pp30_response TEXT NULL COMMENT 'ตอบกลับ ภพ.30',
  pp30_submission_comment TEXT NULL COMMENT 'ความเห็นส่งงานยื่นภาษี ภ.พ.30',
  pp30_filing_response TEXT NULL COMMENT 'ตอบกลับงานยื่นภาษี ภ.พ.30',
  
  -- Document Entry Responsible
  document_entry_responsible VARCHAR(20) NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ (employee_id)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_monthly_tax_data_build (build),
  INDEX idx_monthly_tax_data_month (tax_year, tax_month),
  INDEX idx_monthly_tax_data_accounting_responsible (accounting_responsible),
  INDEX idx_monthly_tax_data_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_monthly_tax_data_document_entry_responsible (document_entry_responsible),
  UNIQUE KEY uk_monthly_tax_data_build_month (build, tax_year, tax_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE monthly_tax_data COMMENT = 'ตารางข้อมูลภาษีรายเดือน - รีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่';
