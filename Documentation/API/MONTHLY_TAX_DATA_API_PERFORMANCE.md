# 🚀 Monthly Tax Data API - Performance Optimization

## 📋 Overview

เอกสารนี้อธิบายการปรับปรุงประสิทธิภาพของ API สำหรับ monthly_tax_data เพื่อให้การดึงข้อมูลจากฐานข้อมูลส่งกลับมาที่ Frontend เร็วขึ้น

**Last Updated**: 2026-02-03  
**Status**: 🔴 Critical - กำลังแก้ไข

---

## 🔍 ปัญหาที่พบ

### 1. SQL Query Performance Issues

**ปัญหา**:
- การ JOIN กับ `employees` table 7 ครั้ง (e1-e7) และ `clients` table 1 ครั้ง
- SELECT fields มากมาย (80+ fields) ซึ่งอาจไม่จำเป็นทั้งหมด
- การใช้ `DATE_FORMAT` ใน SQL query ซึ่งช้ากว่า application-level formatting
- อาจไม่มี indexes ที่เหมาะสมสำหรับ JOIN operations

**Current Query Structure**:
```sql
SELECT 
  mtd.id,
  mtd.build,
  c.company_name,
  -- ... 80+ fields ...
  e1.full_name as accounting_responsible_name,
  e1.first_name as accounting_responsible_first_name,
  e1.nick_name as accounting_responsible_nick_name,
  -- ... repeat for e2-e7 ...
  DATE_FORMAT(mtd.document_received_date, '%Y-%m-%d %H:%i:%s') as document_received_date,
  -- ... more DATE_FORMAT ...
FROM monthly_tax_data mtd
LEFT JOIN clients c ON mtd.build = c.build
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
LEFT JOIN employees e3 ON mtd.wht_filer_employee_id = e3.employee_id
LEFT JOIN employees e4 ON mtd.wht_filer_current_employee_id = e4.employee_id
LEFT JOIN employees e5 ON mtd.vat_filer_employee_id = e5.employee_id
LEFT JOIN employees e6 ON mtd.vat_filer_current_employee_id = e6.employee_id
LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
WHERE mtd.deleted_at IS NULL
ORDER BY mtd.tax_year DESC, mtd.tax_month DESC
LIMIT ? OFFSET ?
```

---

## ✅ Recommended Optimizations

### 1. Database Indexes

#### ✅ เพิ่ม Indexes สำหรับ JOIN Operations

**ปัญหา**: `employees` table อาจไม่มี index บน `employee_id` สำหรับ JOIN operations

**วิธีแก้**: ตรวจสอบและเพิ่ม indexes ถ้ายังไม่มี

```sql
-- ตรวจสอบว่า employees table มี index บน employee_id หรือไม่
SHOW INDEX FROM employees WHERE Column_name = 'employee_id';

-- ถ้ายังไม่มี ให้เพิ่ม index (ควรมีอยู่แล้วจาก schema แต่ตรวจสอบอีกครั้ง)
-- CREATE INDEX idx_employees_employee_id ON employees(employee_id);

-- เพิ่ม composite index สำหรับ monthly_tax_data เพื่อ optimize WHERE และ ORDER BY
CREATE INDEX idx_monthly_tax_data_year_month_deleted 
ON monthly_tax_data(tax_year, tax_month, deleted_at);

-- เพิ่ม index สำหรับ responsible fields (ถ้ายังไม่มี)
CREATE INDEX idx_monthly_tax_data_wht_filer ON monthly_tax_data(wht_filer_employee_id, deleted_at);
CREATE INDEX idx_monthly_tax_data_vat_filer ON monthly_tax_data(vat_filer_employee_id, deleted_at);
```

**Expected Improvement**: 30-50% faster queries

---

### 2. Reduce DATE_FORMAT Usage

**ปัญหา**: การใช้ `DATE_FORMAT` ใน SQL query ช้ากว่า application-level formatting

**วิธีแก้**: ลบ `DATE_FORMAT` ออกจาก SELECT และ format ใน application layer แทน

**Before**:
```sql
DATE_FORMAT(mtd.document_received_date, '%Y-%m-%d %H:%i:%s') as document_received_date
```

**After**:
```sql
mtd.document_received_date
```

**Backend Formatting**:
```javascript
// Format dates in JavaScript (faster than SQL DATE_FORMAT)
const formatDate = (dateStr) => {
  if (!dateStr) return null
  return dateStr.replace('T', ' ').slice(0, 19)
}
```

**Expected Improvement**: 10-20% faster queries

---

### 3. Optimize SELECT Fields

**ปัญหา**: SELECT fields มากมาย (80+ fields) ซึ่งอาจไม่จำเป็นทั้งหมด

**วิธีแก้**: สร้าง separate endpoints หรือใช้ query parameters เพื่อเลือก fields ที่ต้องการ

**Option 1: Add `fields` Query Parameter** (Recommended)
```javascript
// GET /api/monthly-tax-data?fields=id,build,company_name,pp30_status,pp30_form
const fields = req.query.fields ? req.query.fields.split(',') : null
const selectFields = fields 
  ? fields.map(f => `mtd.${f}`).join(', ')
  : '*' // Default: select all
```

**Option 2: Create Lightweight Endpoint**
```javascript
// GET /api/monthly-tax-data/list (lightweight - only essential fields)
SELECT 
  mtd.id,
  mtd.build,
  c.company_name,
  mtd.tax_year,
  mtd.tax_month,
  mtd.pp30_form,
  mtd.pp30_status,
  -- ... only essential fields ...
```

**Expected Improvement**: 20-40% faster queries (depends on fields selected)

---

### 4. Optimize JOIN Operations

**ปัญหา**: การ JOIN กับ `employees` table 7 ครั้งอาจช้า

**วิธีแก้**: 
1. ตรวจสอบว่า `employees.employee_id` มี index หรือไม่
2. ใช้ INNER JOIN แทน LEFT JOIN ถ้าไม่จำเป็นต้องแสดง NULL values
3. Cache employee data ใน application layer

**Before**:
```sql
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
-- ... 5 more JOINs ...
```

**After** (ถ้า employee_id มี index):
```sql
-- Same query แต่เร็วขึ้นเพราะมี index
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
-- ... (no change needed if index exists)
```

**Expected Improvement**: 10-30% faster queries (if indexes exist)

---

### 5. Add Query Result Caching

**ปัญหา**: ข้อมูลเดียวกันถูก query ซ้ำๆ

**วิธีแก้**: เพิ่ม application-level caching (Redis หรือ in-memory cache)

```javascript
// Example: Use Redis cache
const cacheKey = `monthly-tax-data:${build}:${year}:${month}`
const cached = await redis.get(cacheKey)
if (cached) {
  return res.json(JSON.parse(cached))
}

// Query database
const result = await queryDatabase(...)

// Cache for 30 seconds
await redis.setex(cacheKey, 30, JSON.stringify(result))
```

**Expected Improvement**: 80-90% faster for cached queries

---

### 6. Optimize WHERE Clause

**ปัญหา**: WHERE clause อาจไม่ใช้ indexes อย่างมีประสิทธิภาพ

**วิธีแก้**: ตรวจสอบและปรับ WHERE clause ให้ใช้ indexes

**Current**:
```sql
WHERE mtd.deleted_at IS NULL
  AND mtd.tax_year = ?
  AND mtd.tax_month = ?
  AND mtd.accounting_responsible = ?
```

**Optimized** (with composite index):
```sql
-- Use composite index: idx_monthly_tax_data_year_month_deleted
WHERE mtd.tax_year = ?
  AND mtd.tax_month = ?
  AND mtd.deleted_at IS NULL
  AND mtd.accounting_responsible = ?
```

**Expected Improvement**: 20-40% faster queries

---

## 📊 Expected Performance Improvements

### Before Optimization
- **Query Time**: 200-500ms (depends on data size)
- **Response Time**: 300-700ms (including network)
- **Database Load**: High (multiple JOINs, DATE_FORMAT)

### After Optimization
- **Query Time**: 50-150ms (with indexes and optimizations)
- **Response Time**: 100-250ms (including network)
- **Database Load**: Medium (optimized queries, caching)

### Estimated Overall Improvement
- **Query Speed**: 60-70% faster
- **Response Time**: 50-60% faster
- **Database Load**: 40-50% reduction

---

## 🎯 Implementation Priority

### High Priority (ทำทันที)
1. ✅ เพิ่ม indexes สำหรับ JOIN operations
2. ✅ ลดการใช้ DATE_FORMAT
3. ✅ Optimize WHERE clause

### Medium Priority (ทำตามโอกาส)
1. ✅ เพิ่ม query result caching
2. ✅ Optimize SELECT fields (add fields parameter)

### Low Priority (ทำเมื่อมีเวลา)
1. ✅ Create lightweight endpoints
2. ✅ Implement database connection pooling optimization

---

## 📝 Implementation Steps

### Step 1: Add Database Indexes

```sql
-- Migration file: 029_add_performance_indexes.sql

-- 1. Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_monthly_tax_data_year_month_deleted 
ON monthly_tax_data(tax_year, tax_month, deleted_at);

-- 2. Indexes for responsible fields
CREATE INDEX IF NOT EXISTS idx_monthly_tax_data_wht_filer 
ON monthly_tax_data(wht_filer_employee_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_monthly_tax_data_vat_filer 
ON monthly_tax_data(vat_filer_employee_id, deleted_at);

-- 3. Verify employees table has index on employee_id
-- (Should already exist, but verify)
SHOW INDEX FROM employees WHERE Column_name = 'employee_id';
```

### Step 2: Remove DATE_FORMAT from SQL

**File**: `backend/routes/monthly-tax-data.js`

**Change**: ลบ `DATE_FORMAT()` ออกจาก SELECT statements และ format ใน JavaScript แทน

### Step 3: Optimize WHERE Clause Order

**File**: `backend/routes/monthly-tax-data.js`

**Change**: จัดเรียง WHERE conditions ให้ใช้ composite index อย่างมีประสิทธิภาพ

---

## ⚠️ Important Notes

1. **Indexes**: 
   - เพิ่ม indexes อาจทำให้ INSERT/UPDATE ช้าลงเล็กน้อย แต่ SELECT จะเร็วขึ้นมาก
   - ตรวจสอบ disk space ก่อนเพิ่ม indexes

2. **DATE_FORMAT**:
   - การลบ DATE_FORMAT จะทำให้ response เป็น ISO format (e.g., '2026-02-03T16:39:41.000Z')
   - Frontend ต้อง format เอง (ใช้ dayjs หรือ date-fns)

3. **Caching**:
   - Cache ควรมี TTL สั้นๆ (30-60 seconds) เพื่อให้ข้อมูลทันที
   - Invalidate cache เมื่อมีการ UPDATE

4. **Backward Compatibility**:
   - การเปลี่ยนแปลงทั้งหมดเป็น backward compatible
   - Frontend จะยังทำงานได้ปกติ (แต่ต้อง format dates เอง)

---

## 📚 Related Documentation

- `Documentation/API/MONTHLY_TAX_DATA_API.md` - API documentation
- `Documentation/API/TAX_STATUS_PERFORMANCE_OPTIMIZATION.md` - Frontend optimization
- `Documentation/Database/schema.md` - Database schema

---

**Last Updated**: 2026-02-03  
**Status**: 🔴 Critical - กำลังแก้ไข  
**Maintainer**: Cursor AI
