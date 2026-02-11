-- Migration: สร้างตาราง messenger_routes และ messenger_route_stops
-- สำหรับระบบตารางวิ่งแมส

CREATE TABLE IF NOT EXISTS messenger_routes (
    id VARCHAR(36) PRIMARY KEY,
    route_date DATE NOT NULL,
    total_distance DECIMAL(10, 2) DEFAULT 0,
    status ENUM(
        'planned',
        'in_progress',
        'completed'
    ) DEFAULT 'planned',
    notes TEXT,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_route_date (route_date),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS messenger_route_stops (
    id VARCHAR(36) PRIMARY KEY,
    route_id VARCHAR(36) NOT NULL,
    sort_order INT DEFAULT 0,
    location_name VARCHAR(200) NOT NULL,
    tasks TEXT,
    distance_km DECIMAL(10, 2) DEFAULT 0,
    estimated_time TIME DEFAULT NULL,
    actual_time TIME DEFAULT NULL,
    status ENUM(
        'pending',
        'completed',
        'failed'
    ) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES messenger_routes (id) ON DELETE CASCADE,
    INDEX idx_route_id (route_id),
    INDEX idx_sort_order (sort_order)
);