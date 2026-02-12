-- =============================================
-- เพิ่มคอลัมน์สเปคคอมพิวเตอร์ในตาราง equipment
-- =============================================

ALTER TABLE equipment
    ADD COLUMN cpu VARCHAR(150) DEFAULT NULL COMMENT 'ซีพียู เช่น Intel i7-13700H' AFTER serial_number,
    ADD COLUMN ram VARCHAR(100) DEFAULT NULL COMMENT 'แรม เช่น 16GB DDR5' AFTER cpu,
    ADD COLUMN storage VARCHAR(150) DEFAULT NULL COMMENT 'พื้นที่เก็บข้อมูล เช่น 512GB NVMe SSD' AFTER ram,
    ADD COLUMN display VARCHAR(150) DEFAULT NULL COMMENT 'หน้าจอ เช่น 15.6" FHD IPS' AFTER storage,
    ADD COLUMN gpu VARCHAR(150) DEFAULT NULL COMMENT 'การ์ดจอ เช่น NVIDIA RTX 4060' AFTER display,
    ADD COLUMN os VARCHAR(100) DEFAULT NULL COMMENT 'ระบบปฏิบัติการ เช่น Windows 11 Pro' AFTER gpu,
    ADD COLUMN purchase_date DATE DEFAULT NULL COMMENT 'วันที่ซื้อ' AFTER os,
    ADD COLUMN warranty_expire_date DATE DEFAULT NULL COMMENT 'วันหมดประกัน' AFTER purchase_date,
    ADD COLUMN purchase_price DECIMAL(12,2) DEFAULT NULL COMMENT 'ราคาซื้อ (บาท)' AFTER warranty_expire_date;
