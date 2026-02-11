-- Migration: สร้างตาราง messenger_locations — รายการสถานที่ที่ใช้บ่อย
-- ใช้กับ dropdown สถานที่ในตารางวิ่งแมส

CREATE TABLE IF NOT EXISTS messenger_locations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500) DEFAULT NULL,
    latitude DECIMAL(10, 7) DEFAULT NULL,
    longitude DECIMAL(10, 7) DEFAULT NULL,
    category VARCHAR(100) DEFAULT 'อื่นๆ',
    is_default_start TINYINT(1) DEFAULT 0,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

-- ตัวอย่างข้อมูลสถานที่กรมราชการที่ใช้บ่อย
INSERT INTO
    messenger_locations (
        id,
        name,
        category,
        is_default_start
    )
VALUES (
        UUID(),
        'สำนักงาน BMU',
        'สำนักงาน',
        1
    );

-- Index
CREATE INDEX idx_locations_category ON messenger_locations (category);

CREATE INDEX idx_locations_deleted ON messenger_locations (deleted_at);