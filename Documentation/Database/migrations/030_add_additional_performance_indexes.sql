-- Migration 030: Add Additional Performance Indexes for monthly_tax_data
-- Description: เพิ่ม composite indexes เพิ่มเติมเพื่อปรับปรุงประสิทธิภาพของ queries
-- Created: 2026-02-03
-- Reference: Documentation/PERFORMANCE_OPTIMIZATION_PLAN.md

-- ⚠️ สำคัญ: ตรวจสอบว่า indexes มีอยู่แล้วหรือไม่ก่อนสร้าง
-- MySQL ไม่รองรับ CREATE INDEX IF NOT EXISTS ดังนั้นต้องตรวจสอบก่อน

-- 📊 Query Patterns ที่วิเคราะห์:
-- 1. GET /api/monthly-tax-data (List):
--    - WHERE: accounting_responsible + tax_year + tax_month + deleted_at (หน้าสถานะยื่นภาษี)
--    - WHERE: tax_inspection_responsible + tax_year + tax_month + deleted_at (หน้าตรวจภาษี)
--    - WHERE: (wht_filer_employee_id OR wht_filer_current_employee_id) + tax_year + tax_month + deleted_at (หน้ายื่นภาษี - WHT)
--    - WHERE: (vat_filer_employee_id OR vat_filer_current_employee_id) + tax_year + tax_month + deleted_at (หน้ายื่นภาษี - VAT)
--    - ORDER BY: tax_year DESC, tax_month DESC (default)
--    - ORDER BY: build ASC/DESC
--    - ORDER BY: updated_at DESC

-- 2. GET /api/monthly-tax-data/:build/:year/:month (Detail):
--    - WHERE: build + tax_year + tax_month + deleted_at

-- 3. GET /api/monthly-tax-data/summary:
--    - WHERE: accounting_responsible + tax_year + tax_month + deleted_at
--    - WHERE: tax_inspection_responsible + tax_year + tax_month + deleted_at
--    - WHERE: (wht_filer_employee_id OR wht_filer_current_employee_id) + tax_year + tax_month + deleted_at
--    - WHERE: (vat_filer_employee_id OR vat_filer_current_employee_id) + tax_year + tax_month + deleted_at

-- 🎯 Indexes ที่ควรเพิ่ม (เพิ่มเติมจาก Migration 029):

-- 1. Composite index สำหรับ wht_filer_current_employee_id + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_current_employee_id และ deleted_at
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_wht_current_filer';
CREATE INDEX idx_monthly_tax_data_wht_current_filer 
ON monthly_tax_data(wht_filer_current_employee_id, deleted_at);

-- 2. Composite index สำหรับ vat_filer_current_employee_id + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_current_employee_id และ deleted_at
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_vat_current_filer';
CREATE INDEX idx_monthly_tax_data_vat_current_filer 
ON monthly_tax_data(vat_filer_current_employee_id, deleted_at);

-- 3. Composite index สำหรับ wht_filer_current_employee_id + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_current_employee_id, year, month (หน้ายื่นภาษี - WHT current)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_wht_current_year_month';
CREATE INDEX idx_monthly_tax_data_wht_current_year_month 
ON monthly_tax_data(wht_filer_current_employee_id, tax_year, tax_month, deleted_at);

-- 4. Composite index สำหรับ vat_filer_current_employee_id + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_current_employee_id, year, month (หน้ายื่นภาษี - VAT current)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_vat_current_year_month';
CREATE INDEX idx_monthly_tax_data_vat_current_year_month 
ON monthly_tax_data(vat_filer_current_employee_id, tax_year, tax_month, deleted_at);

-- 5. Composite index สำหรับ build + tax_year + tax_month + deleted_at
-- ใช้สำหรับ optimize GET /api/monthly-tax-data/:build/:year/:month (Detail endpoint)
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_build_year_month';
CREATE INDEX idx_monthly_tax_data_build_year_month 
ON monthly_tax_data(build, tax_year, tax_month, deleted_at);

-- 6. Composite index สำหรับ updated_at + deleted_at
-- ใช้สำหรับ optimize ORDER BY updated_at DESC queries
-- ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_updated_at';
CREATE INDEX idx_monthly_tax_data_updated_at 
ON monthly_tax_data(updated_at DESC, deleted_at);

-- ⚠️ หมายเหตุ: 
-- - Indexes เหล่านี้จะช่วยให้ JOIN operations และ WHERE clause filtering เร็วขึ้น
-- - การเพิ่ม indexes อาจทำให้ INSERT/UPDATE ช้าลงเล็กน้อย แต่ SELECT จะเร็วขึ้นมาก
-- - สำหรับ production, ควร monitor query performance หลังเพิ่ม indexes

-- 📊 ตรวจสอบ indexes ที่สร้างแล้ว:
-- SHOW INDEX FROM monthly_tax_data;

-- 📊 ตรวจสอบประสิทธิภาพของ query:
-- EXPLAIN SELECT ... FROM monthly_tax_data WHERE ...;

-- 📊 ตรวจสอบขนาดของ indexes:
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS 'Index Size (MB)'
-- FROM mysql.innodb_index_stats
-- WHERE TABLE_NAME = 'monthly_tax_data'
--   AND STAT_NAME = 'size'
-- ORDER BY STAT_VALUE DESC;
