-- Migration 048: Create Registration Tasks Table
-- ตารางเก็บรายการงานจริงของระบบทะเบียน (DBD, RD, SSO, HR)

CREATE TABLE IF NOT EXISTS registration_tasks (
    id VARCHAR(36) PRIMARY KEY,
    department VARCHAR(20) NOT NULL COMMENT 'dbd, rd, sso, hr',
    received_date DATE NOT NULL COMMENT 'วันที่รับงาน',
    client_id VARCHAR(36) NOT NULL COMMENT 'FK → registration_clients.id',
    client_name VARCHAR(255) NOT NULL COMMENT 'ชื่อลูกค้า (denormalized)',
    job_type VARCHAR(36) NOT NULL COMMENT 'FK → registration_work_types.id',
    job_type_sub VARCHAR(36) DEFAULT NULL COMMENT 'FK → registration_work_sub_types.id',
    responsible_id VARCHAR(36) NOT NULL COMMENT 'FK → users.id',
    responsible_name VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้รับผิดชอบ (denormalized)',
    status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_department (department),
    INDEX idx_client_id (client_id),
    INDEX idx_responsible_id (responsible_id),
    INDEX idx_status (status),
    INDEX idx_received_date (received_date),
    INDEX idx_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
