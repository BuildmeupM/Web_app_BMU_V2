-- Migration 049: Add step tracking, comments, and completion fields
-- เพิ่มขั้นตอนงาน 5 สเตป + ตารางความเห็น + วันสำเร็จ + URL ใบวางบิล

-- 1) Add step columns + completion fields to registration_tasks
ALTER TABLE registration_tasks
    ADD COLUMN step_1 TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'ประสานงานขอเอกสาร (20%)' AFTER notes,
    ADD COLUMN step_2 TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'อยู่ระหว่างเตรียมข้อมูล (40%)' AFTER step_1,
    ADD COLUMN step_3 TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'รอลูกค้าเตรียมเอกสาร/ลงรายมือชื่อ (60%)' AFTER step_2,
    ADD COLUMN step_4 TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'รอวิ่งแมส (80%)' AFTER step_3,
    ADD COLUMN step_5 TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'ส่งมอบงานคืนลูกค้า (100%)' AFTER step_4,
    ADD COLUMN completion_date DATE DEFAULT NULL COMMENT 'วันที่งานสำเร็จ' AFTER step_5,
    ADD COLUMN invoice_url VARCHAR(500) DEFAULT NULL COMMENT 'URL ใบวางบิล' AFTER completion_date;

-- 2) Create comments table
CREATE TABLE IF NOT EXISTS registration_task_comments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL COMMENT 'FK → registration_tasks.id',
    user_id VARCHAR(36) NOT NULL COMMENT 'FK → users.id',
    user_name VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้เขียน (denormalized)',
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
