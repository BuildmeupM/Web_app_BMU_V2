-- =============================================
-- System Specs Table
-- เก็บข้อมูลสเปคเครื่องคอมพิวเตอร์ของพนักงาน
-- =============================================

CREATE TABLE IF NOT EXISTS system_specs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    hostname VARCHAR(255),
    os_name VARCHAR(255),
    os_version VARCHAR(255),
    cpu_name VARCHAR(255),
    cpu_cores INT,
    cpu_threads INT,
    ram_total_gb DECIMAL(10,2),
    ram_type VARCHAR(50),
    ram_speed_mhz INT,
    ram_slots TEXT COMMENT 'JSON: [{"slot":"DIMM1","size":"16GB","speed":"3200MHz"}]',
    gpu_name VARCHAR(255),
    gpu_vram VARCHAR(50),
    storage_info TEXT COMMENT 'JSON: [{"drive":"C:","size":"512GB","type":"SSD"}]',
    serial_number VARCHAR(255),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
