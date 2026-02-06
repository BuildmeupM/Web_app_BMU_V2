# 🔧 Force Composite Index Usage - monthly_tax_data

## 🎯 Overview

เอกสารนี้อธิบายวิธีการบังคับให้ MySQL ใช้ composite index แทน single-column index สำหรับ queries ที่ filter โดย multiple columns

**Last Updated**: 2026-02-03  
**Status**: ✅ Analysis Complete

---

## 📋 Current Situation

### EXPLAIN Query Result:
```sql
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

**Results:**
- `possible_keys`: `idx_monthly_tax_data_month`, `idx_monthly_tax_data_accounting_responsible`, `idx_monthly_tax_data_accounting_year_month` ✅
- `key`: `idx_monthly_tax_data_accounting_responsible` ⚠️ (ใช้ single-column index)
- `rows`: `1` ✅ (ดีมาก)
- `Extra`: `Using index condition; Using where`

### Analysis:
- ✅ Composite index `idx_monthly_tax_data_accounting_year_month` มีอยู่แล้ว
- ⚠️ แต่ MySQL เลือกใช้ single-column index แทน
- ✅ Performance ดีอยู่แล้ว (`rows: 1`) แต่ยังไม่ optimal

---

## 🔍 Why MySQL Chooses Single-Column Index?

### สาเหตุที่เป็นไปได้:

1. **Statistics**: MySQL statistics อาจบอกว่า single-column index มี selectivity ดีกว่า
2. **Index Cardinality**: Single-column index อาจมี cardinality สูงกว่า (unique values มากกว่า)
3. **Query Optimizer Decision**: MySQL คิดว่า single-column index ดีพอแล้ว (`rows: 1` ดีมากอยู่แล้ว)

---

## ✅ Solutions

### Solution 1: อัพเดท Table Statistics (Recommended)

```sql
-- อัพเดท statistics เพื่อให้ MySQL รู้จัก composite index ดีขึ้น
ANALYZE TABLE monthly_tax_data;

-- รัน EXPLAIN อีกครั้ง
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

**Expected Result:**
- MySQL อาจเลือกใช้ composite index หลังจากอัพเดท statistics

---

### Solution 2: ใช้ Index Hint (Force Index)

```sql
-- บังคับให้ MySQL ใช้ composite index
EXPLAIN SELECT *
FROM monthly_tax_data USE INDEX (idx_monthly_tax_data_accounting_year_month)
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

**หรือใช้ FORCE INDEX:**
```sql
EXPLAIN SELECT *
FROM monthly_tax_data FORCE INDEX (idx_monthly_tax_data_accounting_year_month)
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

**⚠️ หมายเหตุ:**
- Index hints ควรใช้เฉพาะเมื่อจำเป็นจริงๆ
- ไม่แนะนำให้ใช้ใน production code (ควรให้ MySQL เลือกเอง)
- ใช้สำหรับ testing/debugging เท่านั้น

---

### Solution 3: ปรับปรุง Composite Index Order

ตรวจสอบว่า column order ใน composite index ตรงกับ query pattern หรือไม่:

**Current Index:**
```sql
CREATE INDEX idx_monthly_tax_data_accounting_year_month 
ON monthly_tax_data(accounting_responsible, tax_year, tax_month, deleted_at);
```

**Query Pattern:**
```sql
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL
```

**Analysis:**
- ✅ Column order ถูกต้องแล้ว (accounting_responsible → tax_year → tax_month → deleted_at)
- ✅ ตรงกับ query pattern

---

### Solution 4: ตรวจสอบ Index Cardinality

```sql
-- ตรวจสอบ cardinality ของ indexes
SHOW INDEX FROM monthly_tax_data 
WHERE Key_name IN ('idx_monthly_tax_data_accounting_responsible', 'idx_monthly_tax_data_accounting_year_month');
```

**Analysis:**
- ถ้า single-column index มี cardinality สูงกว่า (unique values มากกว่า) MySQL อาจเลือกใช้มัน
- Composite index อาจมี cardinality ต่ำกว่าเพราะรวมหลาย columns

---

## 📊 Performance Comparison

### Current (Single-Column Index):
- **Index Used**: `idx_monthly_tax_data_accounting_responsible`
- **Rows Examined**: `1` ✅
- **Extra**: `Using index condition; Using where`
- **Performance**: ดีมาก แต่ต้อง filter `tax_year`, `tax_month`, `deleted_at` หลังใช้ index

### With Composite Index:
- **Index Used**: `idx_monthly_tax_data_accounting_year_month`
- **Rows Examined**: `1` ✅ (คาดหวัง)
- **Extra**: อาจมี `Using index` (covering index) ถ้า query ใช้เฉพาะ columns ที่อยู่ใน index
- **Performance**: ✅ Optimal - MySQL สามารถใช้ index เพื่อ filter ทั้ง 4 columns พร้อมกัน

---

## 🎯 Recommended Actions

### Step 1: อัพเดท Table Statistics
```sql
ANALYZE TABLE monthly_tax_data;
```

### Step 2: ทดสอบอีกครั้ง
```sql
EXPLAIN SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;
```

### Step 3: ตรวจสอบผลลัพธ์
- ถ้า MySQL ยังใช้ single-column index → อาจไม่จำเป็นต้องเปลี่ยน (performance ดีอยู่แล้ว)
- ถ้า MySQL ใช้ composite index → ✅ Perfect!

### Step 4: ทดสอบ Performance จริง
```sql
-- ทดสอบ query time
SET profiling = 1;

SELECT *
FROM monthly_tax_data
WHERE accounting_responsible = 'AC0008'
  AND tax_year = 2026
  AND tax_month = 1
  AND deleted_at IS NULL;

SHOW PROFILES;
```

---

## ⚠️ Important Notes

1. **Performance is Already Good**: 
   - `rows: 1` แสดงว่า query มีความ selective สูงมาก
   - Performance ดีอยู่แล้ว แม้จะใช้ single-column index

2. **Composite Index Benefits**:
   - อาจช่วยเมื่อ query มีความ selective น้อยกว่า (หลาย rows)
   - อาจช่วยเมื่อ query ใช้เฉพาะ columns ที่อยู่ใน index (covering index)

3. **Don't Over-Optimize**:
   - ถ้า performance ดีอยู่แล้ว ไม่จำเป็นต้องบังคับให้ใช้ composite index
   - ให้ MySQL เลือก index ที่เหมาะสมที่สุด

---

## 📝 Testing Checklist

- [ ] อัพเดท table statistics (`ANALYZE TABLE`)
- [ ] รัน `EXPLAIN` อีกครั้งเพื่อดูว่า MySQL ใช้ composite index หรือไม่
- [ ] ทดสอบ performance ด้วย queries จริง
- [ ] เปรียบเทียบ query time ระหว่าง single-column และ composite index
- [ ] ตรวจสอบว่า composite index ช่วยในกรณีอื่นๆ หรือไม่ (เช่น queries ที่มีหลาย rows)

---

## 📚 Related Documentation

- `Documentation/API/EXPLAIN_QUERY_ANALYSIS.md` - EXPLAIN query analysis
- `Documentation/API/MONTHLY_TAX_DATA_API_PERFORMANCE.md` - Performance optimization guide
- `Documentation/Database/migrations/029_add_monthly_tax_data_performance_indexes.sql` - Migration file

---

**Last Updated**: 2026-02-03  
**Status**: ✅ Analysis Complete  
**Maintainer**: Cursor AI
