-- Migration: เพิ่ม messenger fields ให้ registration_tasks
-- สำหรับเก็บข้อมูลการวิ่งแมสของแต่ละงาน

ALTER TABLE registration_tasks
    ADD COLUMN needs_messenger TINYINT(1) NOT NULL DEFAULT 0 AFTER invoice_url,
    ADD COLUMN messenger_destination VARCHAR(255) DEFAULT NULL AFTER needs_messenger,
    ADD COLUMN messenger_details TEXT DEFAULT NULL AFTER messenger_destination,
    ADD COLUMN messenger_notes TEXT DEFAULT NULL AFTER messenger_details,
    ADD COLUMN messenger_status ENUM('pending', 'scheduled', 'completed') DEFAULT 'pending' AFTER messenger_notes;
