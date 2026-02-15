-- Migration 057: Create responsibility_change_history table
-- ตารางเก็บประวัติการเปลี่ยนผู้รับผิดชอบงาน

CREATE TABLE IF NOT EXISTS responsibility_change_history (
    id VARCHAR(36) PRIMARY KEY,
    work_assignment_id VARCHAR(36) NOT NULL COMMENT 'FK ไปยัง work_assignments',
    build VARCHAR(20) NOT NULL COMMENT 'Build code ของลูกค้า',
    assignment_year INT NOT NULL COMMENT 'ปีภาษี',
    assignment_month INT NOT NULL COMMENT 'เดือนภาษี (1-12)',
    -- ตำแหน่งที่เปลี่ยน
    role_type ENUM(
        'accounting',
        'tax_inspection',
        'wht_filer',
        'vat_filer',
        'document_entry'
    ) NOT NULL COMMENT 'ตำแหน่งที่เปลี่ยน',
    -- ข้อมูลผู้รับผิดชอบ
    previous_employee_id VARCHAR(20) NULL COMMENT 'รหัสพนักงานเดิม',
    new_employee_id VARCHAR(20) NULL COMMENT 'รหัสพนักงานใหม่',
    -- ข้อมูลผู้ทำรายการ
    changed_by VARCHAR(36) NOT NULL COMMENT 'ผู้ทำรายการเปลี่ยน (user id)',
    change_reason TEXT NULL COMMENT 'เหตุผลในการเปลี่ยน',
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่เปลี่ยน',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (work_assignment_id) REFERENCES work_assignments (id) ON DELETE CASCADE,
    FOREIGN KEY (previous_employee_id) REFERENCES employees (employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (new_employee_id) REFERENCES employees (employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- Indexes
    INDEX idx_rch_work_assignment (work_assignment_id),
    INDEX idx_rch_build_year_month (
        build,
        assignment_year,
        assignment_month
    ),
    INDEX idx_rch_changed_at (changed_at),
    INDEX idx_rch_role_type (role_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;