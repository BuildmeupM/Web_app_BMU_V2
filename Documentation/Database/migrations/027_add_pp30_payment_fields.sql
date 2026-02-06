-- Migration 027: Add PP30 Payment Status and Amount Fields
-- Description: เพิ่มฟิลด์สถานะยอดชำระและจำนวนยอดชำระ ภ.พ.30 ในตาราง monthly_tax_data
-- Created: 2026-02-02
-- Reference: Feature Request - เพิ่มฟิลด์สถานะยอดชำระและจำนวนยอดชำระ ภ.พ.30

-- เพิ่มคอลัมน์สถานะยอดชำระ ภ.พ.30
ALTER TABLE monthly_tax_data 
ADD COLUMN pp30_payment_status VARCHAR(100) NULL COMMENT 'สถานะยอดชำระ ภ.พ.30 (has_payment, no_payment)';

-- เพิ่มคอลัมน์จำนวนยอดชำระ ภ.พ.30
ALTER TABLE monthly_tax_data 
ADD COLUMN pp30_payment_amount DECIMAL(15,2) NULL COMMENT 'จำนวนยอดชำระ ภ.พ.30';
