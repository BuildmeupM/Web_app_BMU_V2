-- Migration 041: Add accounting_fee_image_url to accounting_fees table
-- Description: เพิ่มคอลัมน์ลิงค์รูปค่าทำบัญชี
-- Date: 2026-02-11

ALTER TABLE accounting_fees
ADD COLUMN accounting_fee_image_url VARCHAR(500) NULL
AFTER line_billing_id;
