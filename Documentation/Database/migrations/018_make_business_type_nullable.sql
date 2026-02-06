-- Migration 018: Make business_type nullable
-- Description: เปลี่ยน business_type เป็น nullable เพื่อรองรับการ import ข้อมูลที่ไม่มีประเภทกิจการ
-- Created: 2026-01-31
-- Reason: Excel template guide ระบุว่า business_type เป็น optional field แต่ database schema กำหนดเป็น NOT NULL

-- Modify business_type column to allow NULL
ALTER TABLE clients MODIFY COLUMN business_type ENUM('บริษัทจำกัด', 'บริษัทมหาชนจำกัด', 'ห้างหุ้นส่วน') NULL COMMENT 'ประเภทของกิจการ';
