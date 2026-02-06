-- Migration 021: Add status and attachment_count columns for tax forms
-- Description: เพิ่ม columns สำหรับสถานะและจำนวนใบแนบของแต่ละแบบฟอร์มภาษี
-- Created: 2026-01-31
-- Reference: User request for Tax Status Form enhancement

-- เพิ่ม columns สำหรับสถานะของแบบฟอร์ม (VARCHAR สำหรับเก็บสถานะ)
ALTER TABLE monthly_tax_data
  ADD COLUMN pnd_1_40_1_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(1)',
  ADD COLUMN pnd_1_40_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(2)',
  ADD COLUMN pnd_3_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.3',
  ADD COLUMN pnd_53_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.53',
  ADD COLUMN pp_36_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภ.พ.36',
  ADD COLUMN student_loan_form_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ กยศ.',
  ADD COLUMN pnd_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.2',
  ADD COLUMN pnd_54_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.54',
  ADD COLUMN pt_40_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภ.ธ.40',
  ADD COLUMN social_security_form_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ประกันสังคม';

-- เพิ่ม columns สำหรับจำนวนใบแนบ (INT สำหรับเก็บตัวเลข)
ALTER TABLE monthly_tax_data
  ADD COLUMN pnd_1_40_1_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(1)',
  ADD COLUMN pnd_1_40_2_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(2)',
  ADD COLUMN pnd_3_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.3',
  ADD COLUMN pnd_53_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.53',
  ADD COLUMN pp_36_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภ.พ.36',
  ADD COLUMN student_loan_form_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ กยศ.',
  ADD COLUMN pnd_2_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.2',
  ADD COLUMN pnd_54_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภงด.54',
  ADD COLUMN pt_40_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ภ.ธ.40',
  ADD COLUMN social_security_form_attachment_count INT NULL DEFAULT 0 COMMENT 'จำนวนใบแนบ แบบ ประกันสังคม';

-- Note: Columns BOOLEAN เดิม (pnd_1_40_1, pnd_1_40_2, etc.) ยังคงอยู่เพื่อ backward compatibility
-- แต่ระบบจะใช้ status และ attachment_count แทน
