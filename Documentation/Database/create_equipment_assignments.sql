-- ====================================
-- Equipment Assignments Table
-- อุปกรณ์ที่มอบหมายประจำให้พนักงาน
-- ====================================

CREATE TABLE IF NOT EXISTS equipment_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    equipment_id VARCHAR(36) NOT NULL,
    assigned_to VARCHAR(36) NOT NULL COMMENT 'พนักงานที่ได้รับมอบหมาย',
    assigned_by VARCHAR(36) DEFAULT NULL COMMENT 'ผู้มอบหมาย (admin)',
    assigned_date DATE NOT NULL DEFAULT (CURDATE()),
    return_date DATE DEFAULT NULL COMMENT 'วันที่คืน (null = ยังใช้อยู่)',
    notes TEXT DEFAULT NULL,
    status ENUM('active', 'returned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_assignment_status (status),
    INDEX idx_assignment_equipment (equipment_id),
    INDEX idx_assignment_user (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
