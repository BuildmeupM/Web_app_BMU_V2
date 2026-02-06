-- Migration 023: Remove unused boolean fields from monthly_tax_data table
-- Description: ลบคอลัมน์ boolean fields ที่ไม่ได้ใช้งานแล้ว (pnd_1_40_1, pnd_1_40_2, etc.)
--              ระบบใช้ status และ attachment_count แทนแล้ว
-- Created: 2026-02-02
-- Reference: User request to remove unused columns from monthly_tax_data

-- ลบคอลัมน์ boolean fields ที่ไม่ได้ใช้งานแล้ว
-- ระบบใช้ pnd_1_40_1_status และ pnd_1_40_1_attachment_count แทนแล้ว
ALTER TABLE monthly_tax_data
  DROP COLUMN pnd_1_40_1,
  DROP COLUMN pnd_1_40_2,
  DROP COLUMN pnd_3,
  DROP COLUMN pnd_53,
  DROP COLUMN pp_36,
  DROP COLUMN student_loan_form,
  DROP COLUMN pnd_2,
  DROP COLUMN pnd_54,
  DROP COLUMN pt_40,
  DROP COLUMN social_security_form;

-- Note: คอลัมน์ pp30_form และ income_confirmed ยังคงอยู่เพราะยังใช้งานอยู่
