-- =============================================
-- ระบบยืมอุปกรณ์คอมพิวเตอร์ (Equipment Borrowing System)
-- =============================================

-- ตาราง: equipment (อุปกรณ์)
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL COMMENT 'ชื่ออุปกรณ์',
    category ENUM('laptop', 'monitor', 'mouse', 'keyboard', 'webcam', 'headset', 'charger', 'cable', 'other') NOT NULL DEFAULT 'other' COMMENT 'หมวดหมู่',
    brand VARCHAR(100) DEFAULT NULL COMMENT 'ยี่ห้อ',
    model VARCHAR(100) DEFAULT NULL COMMENT 'รุ่น',
    serial_number VARCHAR(100) DEFAULT NULL COMMENT 'หมายเลข S/N',
    status ENUM('available', 'borrowed', 'maintenance', 'retired') NOT NULL DEFAULT 'available' COMMENT 'สถานะ',
    description TEXT DEFAULT NULL COMMENT 'รายละเอียดเพิ่มเติม',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_equipment_status (status),
    INDEX idx_equipment_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: equipment_borrowings (การยืม-คืน)
CREATE TABLE IF NOT EXISTS equipment_borrowings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    equipment_id VARCHAR(36) NOT NULL COMMENT 'อุปกรณ์ที่ยืม',
    borrower_id VARCHAR(36) NOT NULL COMMENT 'ผู้ยืม (users.id)',
    approved_by VARCHAR(36) DEFAULT NULL COMMENT 'ผู้อนุมัติ (users.id)',
    status ENUM('pending', 'approved', 'borrowed', 'returned', 'rejected', 'overdue') NOT NULL DEFAULT 'pending' COMMENT 'สถานะ',
    borrow_date DATE NOT NULL COMMENT 'วันที่ยืม',
    expected_return_date DATE NOT NULL COMMENT 'กำหนดคืน',
    actual_return_date DATE DEFAULT NULL COMMENT 'วันที่คืนจริง',
    purpose TEXT DEFAULT NULL COMMENT 'เหตุผลการยืม',
    notes TEXT DEFAULT NULL COMMENT 'หมายเหตุ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_borrowing_status (status),
    INDEX idx_borrowing_equipment (equipment_id),
    INDEX idx_borrowing_borrower (borrower_id),
    INDEX idx_borrowing_dates (borrow_date, expected_return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
