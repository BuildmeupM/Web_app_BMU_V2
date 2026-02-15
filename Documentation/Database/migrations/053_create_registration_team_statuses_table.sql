-- Migration 053: Create Registration Team Statuses Table
-- ตารางเก็บตัวเลือกสถานะการทำงานในทีม (กำหนดได้จากหน้าตั้งค่า)

CREATE TABLE IF NOT EXISTS registration_team_statuses (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'ชื่อสถานะ เช่น รอดำเนินการ, กำลังตรวจสอบ, เสร็จสิ้น',
    color VARCHAR(20) DEFAULT '#228be6' COMMENT 'สีสำหรับแสดงผล (hex code)',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_sort_order (sort_order),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;