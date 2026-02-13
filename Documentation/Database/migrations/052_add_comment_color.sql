-- Migration 052: Add comment_color to users and registration_task_comments
-- เพิ่มคอลัมน์สีสำหรับแสดงชื่อผู้เขียนความเห็น

-- 1) เพิ่ม comment_color ในตาราง users (สีเริ่มต้น #2196F3 = สีฟ้า)
ALTER TABLE users
    ADD COLUMN comment_color VARCHAR(7) DEFAULT '#2196F3' COMMENT 'สีสำหรับแสดงชื่อผู้เขียนความเห็น (hex)';

-- 2) เพิ่ม user_color ในตาราง registration_task_comments (denormalized สำหรับแสดงผลเร็ว)
ALTER TABLE registration_task_comments
    ADD COLUMN user_color VARCHAR(7) DEFAULT '#2196F3' COMMENT 'สีของผู้เขียนตอนที่เขียน (hex)' AFTER user_name;
