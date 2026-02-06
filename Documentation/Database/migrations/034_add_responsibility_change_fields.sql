-- Migration 034: Add Responsibility Change Fields
-- Description: เพิ่มฟิลด์สำหรับระบบการเปลี่ยนผู้รับผิดชอบและการซื้อขายงาน
-- Created: 2026-02-04
-- Purpose: 
--   1. เก็บข้อมูลผู้รับผิดชอบทำบัญชีเดือน (original_accounting_responsible) - ค่าเดิมเมื่อมีการจัดงาน
--   2. เก็บข้อมูลผู้รับผิดชอบทำบัญชีปัจจุบัน (current_accounting_responsible) - สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ
--   3. เก็บข้อมูลผู้รับผิดชอบที่ซื้อ (purchased_by_accounting_responsible) - สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ
--   4. เพิ่มฟิลด์เดียวกันสำหรับ WHT, VAT, และ Document Entry

-- ============================================
-- Migration 034: Add Responsibility Change Fields to monthly_tax_data
-- ============================================

ALTER TABLE monthly_tax_data
  -- Accounting Responsible Fields
  ADD COLUMN original_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีเดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER accounting_responsible,
  ADD COLUMN current_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_accounting_responsible,
  ADD COLUMN purchased_by_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_accounting_responsible,
  
  -- WHT Filer Fields
  ADD COLUMN original_wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น WHT เดิม (ค่าเดิมเมื่อมีการจัดงาน)' AFTER wht_filer_employee_id,
  ADD COLUMN purchased_by_wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น WHT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER wht_filer_current_employee_id,
  
  -- VAT Filer Fields
  ADD COLUMN original_vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น VAT เดิม (ค่าเดิมเมื่อมีการจัดงาน)' AFTER vat_filer_employee_id,
  ADD COLUMN purchased_by_vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น VAT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER vat_filer_current_employee_id,
  
  -- Document Entry Responsible Fields
  ADD COLUMN original_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER document_entry_responsible,
  ADD COLUMN current_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_document_entry_responsible,
  ADD COLUMN purchased_by_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_document_entry_responsible,
  
  -- Tax Inspection Responsible Fields (for future use)
  ADD COLUMN original_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีเดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER tax_inspection_responsible,
  ADD COLUMN current_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_tax_inspection_responsible,
  ADD COLUMN purchased_by_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_tax_inspection_responsible;

-- Add Foreign Keys
ALTER TABLE monthly_tax_data
  ADD FOREIGN KEY (original_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Indexes for better query performance
ALTER TABLE monthly_tax_data
  ADD INDEX idx_monthly_tax_data_original_accounting_responsible (original_accounting_responsible),
  ADD INDEX idx_monthly_tax_data_current_accounting_responsible (current_accounting_responsible),
  ADD INDEX idx_monthly_tax_data_purchased_by_accounting_responsible (purchased_by_accounting_responsible),
  ADD INDEX idx_monthly_tax_data_original_wht_filer (original_wht_filer_employee_id),
  ADD INDEX idx_monthly_tax_data_purchased_by_wht_filer (purchased_by_wht_filer_employee_id),
  ADD INDEX idx_monthly_tax_data_original_vat_filer (original_vat_filer_employee_id),
  ADD INDEX idx_monthly_tax_data_purchased_by_vat_filer (purchased_by_vat_filer_employee_id),
  ADD INDEX idx_monthly_tax_data_original_document_entry (original_document_entry_responsible),
  ADD INDEX idx_monthly_tax_data_current_document_entry (current_document_entry_responsible),
  ADD INDEX idx_monthly_tax_data_purchased_by_document_entry (purchased_by_document_entry_responsible);

-- ============================================
-- Migration 034: Add Responsibility Change Fields to work_assignments
-- ============================================

ALTER TABLE work_assignments
  -- Accounting Responsible Fields
  ADD COLUMN original_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีเดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER accounting_responsible,
  ADD COLUMN current_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_accounting_responsible,
  ADD COLUMN purchased_by_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_accounting_responsible,
  
  -- WHT Filer Fields
  ADD COLUMN original_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT เดิม (ค่าเดิมเมื่อมีการจัดงาน)' AFTER wht_filer_responsible,
  ADD COLUMN current_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_wht_filer_responsible,
  ADD COLUMN purchased_by_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_wht_filer_responsible,
  
  -- VAT Filer Fields
  ADD COLUMN original_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT เดิม (ค่าเดิมเมื่อมีการจัดงาน)' AFTER vat_filer_responsible,
  ADD COLUMN current_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_vat_filer_responsible,
  ADD COLUMN purchased_by_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_vat_filer_responsible,
  
  -- Document Entry Responsible Fields
  ADD COLUMN original_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER document_entry_responsible,
  ADD COLUMN current_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_document_entry_responsible,
  ADD COLUMN purchased_by_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_document_entry_responsible,
  
  -- Tax Inspection Responsible Fields
  ADD COLUMN original_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีเดือน (ค่าเดิมเมื่อมีการจัดงาน)' AFTER tax_inspection_responsible,
  ADD COLUMN current_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)' AFTER original_tax_inspection_responsible,
  ADD COLUMN purchased_by_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ)' AFTER current_tax_inspection_responsible;

-- Add Foreign Keys
ALTER TABLE work_assignments
  ADD FOREIGN KEY (original_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (original_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (current_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD FOREIGN KEY (purchased_by_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Indexes for better query performance
ALTER TABLE work_assignments
  ADD INDEX idx_work_assignments_original_accounting_responsible (original_accounting_responsible),
  ADD INDEX idx_work_assignments_current_accounting_responsible (current_accounting_responsible),
  ADD INDEX idx_work_assignments_purchased_by_accounting_responsible (purchased_by_accounting_responsible),
  ADD INDEX idx_work_assignments_original_wht_filer (original_wht_filer_responsible),
  ADD INDEX idx_work_assignments_current_wht_filer (current_wht_filer_responsible),
  ADD INDEX idx_work_assignments_purchased_by_wht_filer (purchased_by_wht_filer_responsible),
  ADD INDEX idx_work_assignments_original_vat_filer (original_vat_filer_responsible),
  ADD INDEX idx_work_assignments_current_vat_filer (current_vat_filer_responsible),
  ADD INDEX idx_work_assignments_purchased_by_vat_filer (purchased_by_vat_filer_responsible),
  ADD INDEX idx_work_assignments_original_document_entry (original_document_entry_responsible),
  ADD INDEX idx_work_assignments_current_document_entry (current_document_entry_responsible),
  ADD INDEX idx_work_assignments_purchased_by_document_entry (purchased_by_document_entry_responsible),
  ADD INDEX idx_work_assignments_original_tax_inspection (original_tax_inspection_responsible),
  ADD INDEX idx_work_assignments_current_tax_inspection (current_tax_inspection_responsible),
  ADD INDEX idx_work_assignments_purchased_by_tax_inspection (purchased_by_tax_inspection_responsible);
