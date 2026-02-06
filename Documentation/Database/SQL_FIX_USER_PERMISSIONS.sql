-- SQL Script สำหรับแก้ไข User Permissions
-- รันใน phpMyAdmin SQL tab

-- 1. ตรวจสอบ users ปัจจุบัน
SELECT user, host FROM mysql.user WHERE user = 'root';

-- 2. เพิ่มสิทธิ์ให้ root จากทุก host (%)
-- หมายเหตุ: เปลี่ยน password ตามที่ต้องการ
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;

-- 3. เพิ่มสิทธิ์ให้ root จาก IP เฉพาะ (ถ้าต้องการ)
-- GRANT ALL PRIVILEGES ON *.* TO 'root'@'184.22.100.243' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;

-- 4. Refresh privileges
FLUSH PRIVILEGES;

-- 5. ตรวจสอบอีกครั้ง
SELECT user, host FROM mysql.user WHERE user = 'root';

-- หมายเหตุ:
-- - '%' หมายถึงทุก host (อนุญาตการเข้าถึงจากทุกที่)
-- - ถ้าต้องการความปลอดภัยมากขึ้น ให้ใช้ IP เฉพาะแทน '%'
-- - หลังจากรันคำสั่งนี้แล้ว ให้ทดสอบการเชื่อมต่ออีกครั้ง
