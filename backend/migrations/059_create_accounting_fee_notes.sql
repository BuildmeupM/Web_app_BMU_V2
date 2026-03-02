-- Migration 059: Create accounting_fee_notes table
-- ระบบจดบันทึก (Notes/Memo) สำหรับแจ้งเรื่องเกี่ยวกับค่าทำบัญชี

CREATE TABLE IF NOT EXISTS accounting_fee_notes (
    id VARCHAR(36) PRIMARY KEY,
    category ENUM(
        'customer_cancel',
        'fee_adjustment',
        'address_change',
        'name_change',
        'customer_return'
    ) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    note TEXT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_category (category),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;