# 📊 EXPLAIN Query Analysis - monthly_tax_data

## 🎯 Overview

เอกสารนี้อธิบายการวิเคราะห์ผลลัพธ์จาก `EXPLAIN` query และคำแนะนำสำหรับการปรับปรุงประสิทธิภาพ

**Last Updated**: 2026-02-03  
**Status**: ✅ Analysis Complete

---

## 📋 EXPLAIN Query Result Analysis

### Query ที่ทดสอบ:
```sql
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

### ผลลัพธ์ที่ได้:

| Field | Value | Analysis |
|-------|-------|----------|
| **id** | `1` | Single SELECT statement |
| **select_type** | `SIMPLE` | Simple SELECT (no subqueries) |
| **table** | `monthly_tax_data` | Table being queried |
| **type** | `ref` | ✅ Good - Using index lookup |
| **possible_keys** | `idx_monthly_tax_data_month, idx_monthly_tax_data_accounting_responsible, idx_monthly_tax_data_accounting_year_month` | MySQL พิจารณา 3 indexes |
| **key** | `idx_monthly_tax_data_accounting_responsible` | ⚠️ ใช้ single-column index |
| **key_len** | `83` | Length of index key used |
| **ref** | `const` | ✅ Excellent - Constant value lookup |
| **rows** | `1` | ✅ Excellent - Very selective (1 row examined) |
| **Extra** | `Using index condition; Using where` | ✅ Good - Using index for filtering |

---

## 🔍 Analysis

### ✅ สิ่งที่ดีแล้ว:
1. **Index Usage**: MySQL ใช้ index (`type: ref`) แทน full table scan
2. **Selectivity**: `rows: 1` แสดงว่า query มีความ selective สูงมาก
3. **Index Condition**: `Using index condition` แสดงว่า MySQL ใช้ index เพื่อ filter ข้อมูล

### ⚠️ สิ่งที่ควรปรับปรุง:
1. **Index Choice**: MySQL เลือกใช้ `idx_monthly_tax_data_accounting_responsible` (single-column index) แทนที่จะใช้ `idx_monthly_tax_data_accounting_year_month` (composite index)

**สาเหตุที่เป็นไปได้:**
- Composite index `idx_monthly_tax_data_accounting_year_month` ยังไม่ได้ถูกสร้าง (ยังไม่ได้รัน migration)
- หรือ MySQL statistics ยังไม่ได้อัพเดท (MySQL อาจคิดว่า single-column index ดีกว่า)

---

## ✅ Recommended Actions

### Step 1: ตรวจสอบว่า Composite Index มีอยู่แล้วหรือไม่

```sql
-- ตรวจสอบว่า composite index มีอยู่แล้วหรือไม่
SELECT COUNT(*) as index_exists
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'monthly_tax_data' 
  AND INDEX_NAME = 'idx_monthly_tax_data_accounting_year_month';
```

**ถ้า `index_exists = 0`**: ต้องรัน migration เพื่อสร้าง index

**ถ้า `index_exists > 0`**: Index มีอยู่แล้ว แต่ MySQL อาจต้องอัพเดท statistics

### Step 2: สร้าง Composite Indexes (ถ้ายังไม่มี)

รัน migration file:
```sql
SOURCE Documentation/Database/migrations/029_verify_and_add_indexes.sql;
```

หรือสร้าง index โดยตรง:
```sql
CREATE INDEX idx_monthly_tax_data_accounting_year_month 
ON monthly_tax_data(accounting_responsible, tax_year, tax_month, deleted_at);
```

### Step 3: อัพเดท Table Statistics

```sql
-- อัพเดท statistics เพื่อให้ MySQL ใช้ indexes ใหม่
ANALYZE TABLE monthly_tax_data;
```

### Step 4: ทดสอบอีกครั้ง

```sql
-- รัน EXPLAIN อีกครั้งเพื่อดูว่า MySQL ใช้ composite index หรือไม่
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

**ผลลัพธ์ที่คาดหวังหลังสร้าง composite index:**
- `key`: `idx_monthly_tax_data_accounting_year_month` (ใช้ composite index)
- `Extra`: อาจมี `Using index` (covering index) ถ้า query ใช้เฉพาะ columns ที่อยู่ใน index

---

## 📊 Expected Performance Improvements

### Before (Current):
- **Index Used**: `idx_monthly_tax_data_accounting_responsible` (single-column)
- **Rows Examined**: `1` (ดีแล้ว)
- **Performance**: ดี แต่ยังไม่ optimal สำหรับ queries ที่ filter โดย multiple columns

### After (With Composite Index):
- **Index Used**: `idx_monthly_tax_data_accounting_year_month` (composite)
- **Rows Examined**: `1` (ยังคงดี)
- **Performance**: ✅ Optimal - MySQL สามารถใช้ index เพื่อ filter ทั้ง 4 columns พร้อมกัน
- **Extra**: อาจมี `Using index` (covering index) ซึ่งหมายความว่า query สามารถตอบได้จาก index โดยไม่ต้องอ่าน data rows

---

## 🎯 Benefits of Composite Index

### 1. Better Index Coverage
- Composite index ครอบคลุม columns ทั้งหมดที่ใช้ใน WHERE clause
- MySQL สามารถใช้ index เพื่อ filter ทั้ง 4 columns พร้อมกัน

### 2. Reduced I/O
- ถ้า query ใช้เฉพาะ columns ที่อยู่ใน index (covering index) MySQL ไม่ต้องอ่าน data rows
- ลด disk I/O และเพิ่มความเร็ว

### 3. Better Query Plan
- MySQL สามารถเลือก execution plan ที่ดีที่สุด
- ลดการ scan ข้อมูลที่ไม่จำเป็น

---

## 📝 Testing Checklist

- [ ] ตรวจสอบว่า composite indexes มีอยู่แล้วหรือไม่
- [ ] สร้าง composite indexes (ถ้ายังไม่มี)
- [ ] อัพเดท table statistics (`ANALYZE TABLE`)
- [ ] รัน `EXPLAIN` อีกครั้งเพื่อยืนยันว่า MySQL ใช้ composite index
- [ ] ทดสอบ performance ด้วย queries จริง
- [ ] ตรวจสอบ response time ใน API

---

## 📚 Related Documentation

- `Documentation/API/MONTHLY_TAX_DATA_API_PERFORMANCE.md` - Performance optimization guide
- `Documentation/Database/migrations/029_verify_and_add_indexes.sql` - Migration file with verification steps
- `Documentation/API/INDEX_ANALYSIS_AND_RECOMMENDATIONS.md` - Index analysis and recommendations

---

**Last Updated**: 2026-02-03  
**Status**: ✅ Analysis Complete  
**Maintainer**: Cursor AI
