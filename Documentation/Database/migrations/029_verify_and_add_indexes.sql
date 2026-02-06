-- Migration 029: Verify and Add Performance Indexes for monthly_tax_data
-- Description: ตรวจสอบและเพิ่ม composite indexes เพื่อปรับปรุงประสิทธิภาพของ queries
-- Created: 2026-02-03
-- Reference: Documentation/API/MONTHLY_TAX_DATA_API_PERFORMANCE.md

-- ⚠️ สำคัญ: MySQL ไม่รองรับ CREATE INDEX IF NOT EXISTS ดังนั้นต้องตรวจสอบก่อน

-- 📊 Step 1: ตรวจสอบว่า indexes มีอยู่แล้วหรือไม่
-- รันคำสั่งนี้ก่อนเพื่อดู indexes ที่มีอยู่:
-- SHOW INDEX FROM monthly_tax_data;

-- 📊 Step 2: ตรวจสอบว่า composite index มีอยู่แล้วหรือไม่ (สำหรับแต่ละ index)
-- ถ้า COUNT(*) = 0 แสดงว่ายังไม่มี index นี้

-- ตรวจสอบ idx_monthly_tax_data_accounting_year_month
SELECT COUNT(*) as index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'monthly_tax_data' 
  AND INDEX_NAME = 'idx_monthly_tax_data_accounting_year_month';

-- ถ้า index_exists = 0 ให้รันคำสั่ง CREATE INDEX ด้านล่าง

-- ============================================
-- 🎯 Indexes ที่ควรเพิ่ม (รันทีละ index)
-- ============================================

-- 1. Composite index สำหรับ accounting_responsible + tax_year + tax_month + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย accounting_responsible, year, month (หน้าสถานะยื่นภาษี)
-- ⚠️ ตรวจสอบก่อน: SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_tax_data' AND INDEX_NAME = 'idx_monthly_tax_data_accounting_year_month';
-- ถ้า COUNT(*) = 0 ให้รัน:
CREATE INDEX idx_monthly_tax_data_accounting_year_month 
ON monthly_tax_data(accounting_responsible, tax_year, tax_month, deleted_at);

-- 2. Composite index สำหรับ tax_inspection_responsible + tax_year + tax_month + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย tax_inspection_responsible, year, month (หน้าตรวจภาษี)
CREATE INDEX idx_monthly_tax_data_inspection_year_month 
ON monthly_tax_data(tax_inspection_responsible, tax_year, tax_month, deleted_at);

-- 3. Composite index สำหรับ wht_filer_employee_id + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_employee_id และ deleted_at
CREATE INDEX idx_monthly_tax_data_wht_filer 
ON monthly_tax_data(wht_filer_employee_id, deleted_at);

-- 4. Composite index สำหรับ vat_filer_employee_id + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_employee_id และ deleted_at
CREATE INDEX idx_monthly_tax_data_vat_filer 
ON monthly_tax_data(vat_filer_employee_id, deleted_at);

-- 5. Composite index สำหรับ wht_filer_employee_id + tax_year + tax_month + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย wht_filer_employee_id, year, month (หน้ายื่นภาษี - WHT)
CREATE INDEX idx_monthly_tax_data_wht_year_month 
ON monthly_tax_data(wht_filer_employee_id, tax_year, tax_month, deleted_at);

-- 6. Composite index สำหรับ vat_filer_employee_id + tax_year + tax_month + deleted_at
-- ⚠️ ใช้สำหรับ optimize queries ที่ filter โดย vat_filer_employee_id, year, month (หน้ายื่นภาษี - VAT)
CREATE INDEX idx_monthly_tax_data_vat_year_month 
ON monthly_tax_data(vat_filer_employee_id, tax_year, tax_month, deleted_at);

-- ============================================
-- 📊 Step 3: ตรวจสอบ indexes ที่สร้างแล้ว
-- ============================================
-- SHOW INDEX FROM monthly_tax_data;

-- ============================================
-- 🧪 Step 4: ทดสอบ Performance
-- ============================================
-- รัน EXPLAIN เพื่อดูว่า MySQL ใช้ index ไหน:

-- Test 1: Query สำหรับหน้าสถานะยื่นภาษี
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;

-- Test 2: Query สำหรับหน้าตรวจภาษี
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE tax_inspection_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;

-- Test 3: Query สำหรับหน้ายื่นภาษี - WHT
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE wht_filer_employee_id = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;

-- Test 4: Query สำหรับหน้ายื่นภาษี - VAT
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE vat_filer_employee_id = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;

-- ⚠️ หมายเหตุ: 
-- - หลังสร้าง indexes แล้ว MySQL อาจต้องอัพเดท statistics ก่อนจะใช้ index ใหม่
-- - รัน ANALYZE TABLE monthly_tax_data; เพื่ออัพเดท statistics
-- - หรือรอให้ MySQL อัพเดท statistics อัตโนมัติ (อาจใช้เวลาสักครู่)

-- ============================================
-- 🔄 Step 5: อัพเดท Table Statistics (Optional)
-- ============================================
-- รันคำสั่งนี้เพื่อให้ MySQL อัพเดท statistics และใช้ indexes ใหม่:
-- ANALYZE TABLE monthly_tax_data;
