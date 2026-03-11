-- =============================================
-- เพิ่มคอลัมน์ขนาดจอ สำหรับ Monitor
-- =============================================

ALTER TABLE equipment
    ADD COLUMN screen_size VARCHAR(50) DEFAULT NULL COMMENT 'ขนาดจอ (นิ้ว) เช่น 27"' AFTER os;
