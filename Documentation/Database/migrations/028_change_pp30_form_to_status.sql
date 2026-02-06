-- Migration 028: Change pp30_form from BOOLEAN to VARCHAR(100) to store pp30_status
-- Description: เปลี่ยน pp30_form จาก BOOLEAN (มีแบบฟอร์มหรือไม่) เป็น VARCHAR(100) เพื่อเก็บสถานะ ภ.พ.30 (paid, sent_to_customer, pending_recheck, draft_completed, etc.)
-- Created: 2026-02-03
-- Reason: ต้องการให้ทุกสถานะ pp30_status ถูกเก็บในคอลัมน์ pp30_form และให้หน้าเว็บดึงข้อมูลจากคอลัมน์นี้

-- Step 1: Backup existing data (ถ้ามี)
-- Note: pp30_form เดิมเป็น BOOLEAN (0/1) - ถ้ามีค่า 1 จะแปลงเป็น 'not_started', ถ้า 0 หรือ NULL จะเป็น NULL

-- Step 2: Change column type from BOOLEAN to VARCHAR(100)
ALTER TABLE monthly_tax_data 
MODIFY COLUMN pp30_form VARCHAR(100) NULL COMMENT 'สถานะ ภ.พ.30 (paid, sent_to_customer, pending_recheck, pending_review, draft_completed, not_started, received_receipt, passed, etc.)';

-- Step 3: Migrate existing data (ถ้ามี)
-- ถ้า pp30_form เดิมเป็น 1 (TRUE) → ตั้งเป็น 'not_started' (เพราะมีแบบฟอร์มแต่ยังไม่เริ่ม)
-- ถ้า pp30_form เดิมเป็น 0 (FALSE) หรือ NULL → ตั้งเป็น NULL
UPDATE monthly_tax_data 
SET pp30_form = CASE 
  WHEN pp30_form = 1 THEN 'not_started'
  ELSE NULL
END
WHERE pp30_form IS NOT NULL;

-- Step 4: Add index for better query performance (optional)
-- ALTER TABLE monthly_tax_data ADD INDEX idx_monthly_tax_data_pp30_form (pp30_form);
