-- Migration: Create holidays table for storing public holidays
-- Fix 4: Holiday Calendar for working days calculation
-- Created: 2026-02-06

CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(36) PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT 'ชื่อวันหยุด',
    name_en VARCHAR(255) NULL COMMENT 'Holiday name in English',
    year INT NOT NULL COMMENT 'ปี พ.ศ. หรือ ค.ศ.',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'สถานะใช้งาน',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

-- Indexes
UNIQUE KEY uk_holiday_date (holiday_date),
    INDEX idx_year (year),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ตารางวันหยุดนักขัตฤกษ์สำหรับคำนวณวันลา';

-- Insert Thai public holidays for 2026 (BE 2569)
INSERT INTO
    holidays (
        id,
        holiday_date,
        name,
        name_en,
        year,
        is_active
    )
VALUES (
        UUID(),
        '2026-01-01',
        'วันขึ้นปีใหม่',
        'New Year''s Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-02-17',
        'วันมาฆบูชา',
        'Makha Bucha Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-04-06',
        'วันจักรี',
        'Chakri Memorial Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-04-13',
        'วันสงกรานต์',
        'Songkran Festival',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-04-14',
        'วันสงกรานต์',
        'Songkran Festival',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-04-15',
        'วันสงกรานต์',
        'Songkran Festival',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-05-01',
        'วันแรงงานแห่งชาติ',
        'National Labour Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-05-04',
        'วันฉัตรมงคล',
        'Coronation Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-05-13',
        'วันวิสาขบูชา',
        'Visakha Bucha Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-06-03',
        'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ',
        'Queen Suthida''s Birthday',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-07-10',
        'วันอาสาฬหบูชา',
        'Asanha Bucha Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-07-28',
        'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
        'King''s Birthday',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-08-12',
        'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง',
        'Queen Mother''s Birthday',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-10-13',
        'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร',
        'King Bhumibol Memorial Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-10-23',
        'วันปิยมหาราช',
        'Chulalongkorn Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-12-05',
        'วันคล้ายวันพระบรมราชสมภพพระบาทสมเด็จพระบรมชนกาธิเบศร',
        'King Bhumibol''s Birthday',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-12-10',
        'วันรัฐธรรมนูญ',
        'Constitution Day',
        2569,
        TRUE
    ),
    (
        UUID(),
        '2026-12-31',
        'วันสิ้นปี',
        'New Year''s Eve',
        2569,
        TRUE
    );