-- Migration 059: Create activity_logs table
-- ระบบเก็บ log การส่งข้อมูลเข้าหลังบ้าน
-- ใครส่ง, บริษัทไหน, ส่งอะไร, หน้าไหน, เมื่อไหร่

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    employee_id VARCHAR(50) NULL,
    user_name VARCHAR(100) NULL,
    action VARCHAR(50) NOT NULL,
    page VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    build VARCHAR(20) NULL,
    company_name VARCHAR(255) NULL,
    description TEXT NULL,
    field_changed VARCHAR(100) NULL,
    old_value VARCHAR(500) NULL,
    new_value VARCHAR(500) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_user_id (user_id),
    INDEX idx_activity_page (page),ffff
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_build (build),
    INDEX idx_activity_created_at (created_at),
    INDEX idx_activity_field_changed (field_changed),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);