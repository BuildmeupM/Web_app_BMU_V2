-- Migration 057: Create error_reports table
-- รายงานข้อผิดพลาดด้านภาษี (Accounting → Registration Messenger)

CREATE TABLE IF NOT EXISTS error_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL COMMENT 'วันที่แจ้งเรื่อง',
    client_id INT NOT NULL COMMENT 'FK → clients (build)',
    client_name VARCHAR(255) NOT NULL COMMENT 'ชื่อบริษัทลูกค้า',
    error_types JSON NOT NULL COMMENT 'หัวข้อผิดพลาด (multi-select array)',
    tax_months JSON NOT NULL COMMENT 'เดือนภาษีที่ผิดพลาด (multi-select array)',
    accountant_id INT NOT NULL COMMENT 'ผู้ทำบัญชี (auto from login)',
    accountant_name VARCHAR(255) NOT NULL COMMENT 'ชื่อผู้ทำบัญชี',
    auditor_id INT DEFAULT NULL COMMENT 'ผู้ตรวจภาษีประจำเดือน (role=audit)',
    auditor_name VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อผู้ตรวจภาษี',
    fault_party ENUM('bmu', 'customer') NOT NULL COMMENT 'ฝ่ายที่ทำให้เกิดข้อผิดพลาด',
    fine_amount DECIMAL(12, 2) DEFAULT 0 COMMENT 'จำนวนค่าปรับ',
    submission_address TEXT DEFAULT NULL COMMENT 'ข้อมูลที่อยู่ที่จะต้องยื่นปรับแบบ',
    -- Approval workflow
    status ENUM(
        'pending',
        'approved',
        'rejected'
    ) DEFAULT 'pending' COMMENT 'สถานะการอนุมัติ',
    approved_by INT DEFAULT NULL COMMENT 'ผู้อนุมัติ (admin/audit)',
    approved_by_name VARCHAR(255) DEFAULT NULL,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    reject_reason TEXT DEFAULT NULL COMMENT 'เหตุผลไม่อนุมัติ',
    -- Messenger link
    messenger_task_id VARCHAR(36) DEFAULT NULL COMMENT 'FK → registration_tasks.id (UUID)',
    -- Metadata
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_client_id (client_id),
    INDEX idx_report_date (report_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;