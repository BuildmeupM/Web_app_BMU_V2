-- Migration 036: Add expenses_confirmed to monthly_tax_data
-- Description: เพิ่มคอลัมน์ คอนเฟิร์มค่าใช้จ่าย (แนบของยื่นแบบภาษีมูลค่าเพิ่ม)
-- ค่า: confirm_income (คอนเฟิร์มรายได้), customer_request_additional_docs (ลูกค้าแจ้งเพิ่มเอกสาร)
-- Prerequisite: ตาราง monthly_tax_data ต้องมีอยู่แล้ว (migration 014)

ALTER TABLE monthly_tax_data
ADD COLUMN expenses_confirmed VARCHAR(100) NULL
COMMENT 'คอนเฟิร์มค่าใช้จ่าย (confirm_income, customer_request_additional_docs)'
AFTER income_confirmed;
