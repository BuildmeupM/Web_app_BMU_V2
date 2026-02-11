-- Migration 042: Create Registration Work Types Tables
-- ตารางประเภทงานและรายการย่อยสำหรับระบบงานทะเบียน

-- ตารางประเภทงาน (Work Types)
CREATE TABLE IF NOT EXISTS registration_work_types (
    id VARCHAR(36) PRIMARY KEY,
    department VARCHAR(20) NOT NULL COMMENT 'dbd, rd, sso, hr',
    name VARCHAR(255) NOT NULL COMMENT 'ชื่อประเภทงาน',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_department (department),
    INDEX idx_sort_order (sort_order),
    INDEX idx_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ตารางรายการย่อย (Sub Types)
CREATE TABLE IF NOT EXISTS registration_work_sub_types (
    id VARCHAR(36) PRIMARY KEY,
    work_type_id VARCHAR(36) NOT NULL COMMENT 'FK → registration_work_types.id',
    name VARCHAR(255) NOT NULL COMMENT 'ชื่อรายการย่อย',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_work_type_id (work_type_id),
    INDEX idx_sort_order (sort_order),
    INDEX idx_deleted_at (deleted_at),
    CONSTRAINT fk_sub_type_work_type FOREIGN KEY (work_type_id) REFERENCES registration_work_types (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;