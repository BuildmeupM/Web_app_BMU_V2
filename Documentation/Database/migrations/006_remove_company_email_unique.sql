-- Migration: 006_remove_company_email_unique.sql
-- Description: ลบ UNIQUE constraint จาก company_email เพื่อรองรับการใส่ข้อมูลซ้ำกัน
-- Created: 2026-01-29
-- Reason: ต้องการให้ระบบรองรับการนำเข้าข้อมูลที่มี Email Build ซ้ำกันได้

-- หมายเหตุ:
-- ใน MySQL/MariaDB เมื่อใช้ UNIQUE constraint จะสร้าง index ชื่อเดียวกับ column name
-- จาก CREATE TABLE มี INDEX idx_employees_company_email (non-unique) อยู่แล้ว
-- ดังนั้นเมื่อลบ UNIQUE constraint แล้ว index ธรรมดาจะยังอยู่

-- ============================================
-- ส่วนที่ 1: ลบ UNIQUE constraint
-- ============================================
SET @index_name = NULL;
SELECT INDEX_NAME INTO @index_name 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees' 
  AND COLUMN_NAME = 'company_email' 
  AND NON_UNIQUE = 0
LIMIT 1;

SET @sql = IF(@index_name IS NOT NULL, 
  CONCAT('ALTER TABLE employees DROP INDEX ', @index_name), 
  'SELECT "UNIQUE index not found or already removed"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- ส่วนที่ 2: สร้าง index ธรรมดา (ไม่ unique)
-- ============================================
-- ตรวจสอบก่อนว่ามี index อยู่แล้วหรือไม่
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees' 
  AND INDEX_NAME = 'idx_employees_company_email'
  AND COLUMN_NAME = 'company_email'
  AND NON_UNIQUE = 1;

-- สร้าง index ถ้ายังไม่มี
-- หมายเหตุ: MySQL ไม่รองรับ CREATE INDEX IF NOT EXISTS
-- และไม่รองรับ CREATE INDEX ใน prepared statement
-- ดังนั้นต้องรัน CREATE INDEX โดยตรง

-- ถ้า @index_exists = 0 (index ยังไม่มี) ให้รันคำสั่งนี้:
-- CREATE INDEX idx_employees_company_email ON employees(company_email);

-- ถ้า @index_exists > 0 (index มีอยู่แล้ว) ให้ข้าม (ไม่ต้องรัน)

-- หมายเหตุ:
-- 1. การลบ UNIQUE constraint จะทำให้สามารถมี company_email ซ้ำกันได้
-- 2. ระบบจะยังคงแจ้งเตือนเมื่อพบ Email Build ซ้ำกัน แต่จะไม่ข้ามข้อมูล
-- 3. Index ธรรมดาจะยังอยู่หรือถูกสร้างใหม่เพื่อเพิ่มประสิทธิภาพการค้นหา (แต่ไม่บังคับ unique)
