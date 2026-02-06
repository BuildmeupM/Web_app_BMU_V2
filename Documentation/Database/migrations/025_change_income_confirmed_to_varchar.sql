-- Migration 025: Change income_confirmed from BOOLEAN to VARCHAR
-- Description: เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR(100) เพื่อเก็บ enum string (customer_confirmed, no_confirmation_needed, waiting_customer, customer_request_change)
-- Created: 2026-02-02
-- Reference: BUG-122

-- Step 1: Add temporary column to store converted values
ALTER TABLE monthly_tax_data 
ADD COLUMN income_confirmed_temp VARCHAR(100) NULL COMMENT 'Temporary column for migration';

-- Step 2: Convert boolean to enum string
-- TRUE (1) -> 'customer_confirmed' (default)
-- FALSE (0) -> 'waiting_customer' (default)
UPDATE monthly_tax_data 
SET income_confirmed_temp = CASE 
  WHEN income_confirmed = 1 OR income_confirmed = TRUE THEN 'customer_confirmed'
  WHEN income_confirmed = 0 OR income_confirmed = FALSE THEN 'waiting_customer'
  ELSE NULL
END;

-- Step 3: Drop old column
ALTER TABLE monthly_tax_data 
DROP COLUMN income_confirmed;

-- Step 4: Rename temporary column to original name
ALTER TABLE monthly_tax_data 
CHANGE COLUMN income_confirmed_temp income_confirmed VARCHAR(100) NULL COMMENT 'คอนเฟิร์มรายได้ (customer_confirmed, no_confirmation_needed, waiting_customer, customer_request_change)';
