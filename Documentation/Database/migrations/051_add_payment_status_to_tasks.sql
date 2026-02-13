-- Migration: เพิ่ม payment fields ให้ registration_tasks
-- สถานะชำระเงิน + จำนวนมัดจำ

ALTER TABLE registration_tasks
    ADD COLUMN payment_status ENUM('paid_full', 'deposit', 'free', 'unpaid') DEFAULT 'unpaid' AFTER messenger_status,
    ADD COLUMN deposit_amount DECIMAL(12,2) DEFAULT NULL AFTER payment_status;
