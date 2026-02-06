-- Migration 029: Add Performance Indexes for monthly_tax_data
-- Description: เพิ่ม composite indexes เพื่อปรับปรุงประสิทธิภาพของ queries สำหรับ monthly_tax_data
-- Created: 2026-02-03
-- Reference: Documentation/API/MONTHLY_TAX_DATA_API_PERFORMANCE.md

-- ⚠️ สำคัญ: ตรวจสอบว่า indexes มีอยู่แล้วหรือไม่ก่อนสร้าง
-- MySQL ไม่รองรับ CREATE INDEX IF NOT EXISTS ดังนั้นต้องตรวจสอบก่อน

-- 📊 สถานะ Indexes ปัจจุบัน (จาก SHOW INDEX):
-- ✅ มีอยู่แล้ว:
--   - PRIMARY key บน id
--   - Unique key uk_monthly_tax_data_build_month (build, tax_year, tax_month, deleted_at)
--   - Single-column indexes บน employee IDs (wht_filer_employee_id, vat_filer_employee_id, accounting_responsible, tax_inspection_responsible, document_entry_responsible)
--   - Index บน build (idx_monthly_tax_data_build)
--   - Composite index บน tax_year, tax_month (idx_monthly_tax_data_month)

-- 🎯 Indexes ที่ควรเพิ่ม (Composite indexes สำหรับ common query patterns):

-- 1. Composite index สำหรับ wht_filer_employee_id + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_employee_id และ deleted_at
-- ⚠️ หมายเหตุ: มี single-column index บน wht_filer_employee_id อยู่แล้ว แต่ composite index จะช่วยเมื่อ filter ทั้งสองคอลัมน์
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_wht_filer';
CREATE INDEX idx_monthly_tax_data_wht_filer 
ON monthly_tax_data(wht_filer_employee_id, deleted_at);

-- 2. Composite index สำหรับ vat_filer_employee_id + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_employee_id และ deleted_at
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_vat_filer';
CREATE INDEX idx_monthly_tax_data_vat_filer 
ON monthly_tax_data(vat_filer_employee_id, deleted_at);

-- 3. Composite index สำหรับ accounting_responsible + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย accounting_responsible, year, month (หน้าสถานะยื่นภาษี)
-- ⚠️ หมายเหตุ: มี single-column index บน accounting_responsible และ composite index บน tax_year, tax_month อยู่แล้ว
-- แต่ composite index นี้จะช่วยเมื่อ filter ทั้งหมดพร้อมกัน
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_accounting_year_month';
CREATE INDEX idx_monthly_tax_data_accounting_year_month 
ON monthly_tax_data(accounting_responsible, tax_year, tax_month, deleted_at);

-- 4. Composite index สำหรับ tax_inspection_responsible + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย tax_inspection_responsible, year, month (หน้าตรวจภาษี)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_inspection_year_month';
CREATE INDEX idx_monthly_tax_data_inspection_year_month 
ON monthly_tax_data(tax_inspection_responsible, tax_year, tax_month, deleted_at);

-- 5. Composite index สำหรับ wht_filer_employee_id + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_employee_id, year, month (หน้ายื่นภาษี - WHT)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_wht_year_month';
CREATE INDEX idx_monthly_tax_data_wht_year_month 
ON monthly_tax_data(wht_filer_employee_id, tax_year, tax_month, deleted_at);

-- 6. Composite index สำหรับ vat_filer_employee_id + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_employee_id, year, month (หน้ายื่นภาษี - VAT)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_vat_year_month';
CREATE INDEX idx_monthly_tax_data_vat_year_month 
ON monthly_tax_data(vat_filer_employee_id, tax_year, tax_month, deleted_at);

-- ⚠️ หมายเหตุ: 
-- - employees table มี index บน employee_id อยู่แล้ว (idx_employees_employee_id) - ✅ ดีแล้ว
-- - clients table ควรมี index บน build (ตรวจสอบอีกครั้ง)
-- - Indexes เหล่านี้จะช่วยให้ JOIN operations และ WHERE clause filtering เร็วขึ้น
-- - การเพิ่ม indexes อาจทำให้ INSERT/UPDATE ช้าลงเล็กน้อย แต่ SELECT จะเร็วขึ้นมาก

-- 📊 ตรวจสอบ indexes ที่สร้างแล้ว:
-- SHOW INDEX FROM monthly_tax_data;

-- 📊 ตรวจสอบประสิทธิภาพของ query:
-- EXPLAIN SELECT ... FROM monthly_tax_data WHERE ...;
