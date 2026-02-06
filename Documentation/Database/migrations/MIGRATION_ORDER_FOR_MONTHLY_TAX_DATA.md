# 📋 ลำดับการรัน Migrations สำหรับ monthly_tax_data Table

## 🎯 วัตถุประสงค์

เอกสารนี้อธิบายลำดับการรัน migrations ที่เกี่ยวข้องกับตาราง `monthly_tax_data` เพื่อให้ระบบทำงานได้อย่างถูกต้อง

---

## 📝 Migrations ที่เกี่ยวข้อง

### 1. Migration 014: Create monthly_tax_data Table
**File**: `014_create_monthly_tax_data_table.sql`  
**วันที่สร้าง**: 2026-01-30  
**วัตถุประสงค์**: สร้างตาราง `monthly_tax_data` พร้อมโครงสร้างพื้นฐาน

**Dependencies**: 
- ต้องรัน `009_create_clients_table.sql` ก่อน (เพราะมี Foreign Key)
- ต้องรัน `016_create_work_assignments_table.sql` ก่อน (ถ้าต้องการ)

---

### 2. Migration 021: Add Tax Form Status and Attachment Count Columns
**File**: `021_add_tax_form_status_and_attachment_count.sql`  
**วันที่สร้าง**: 2026-01-31  
**วัตถุประสงค์**: เพิ่ม columns สำหรับสถานะและจำนวนใบแนบของแต่ละแบบฟอร์มภาษี

**Dependencies**: 
- ต้องรัน `014_create_monthly_tax_data_table.sql` ก่อน

---

### 3. Migration 023: Remove Unused Boolean Fields
**File**: `023_remove_unused_boolean_fields_from_monthly_tax_data.sql`  
**วันที่สร้าง**: 2026-02-02  
**วัตถุประสงค์**: ลบคอลัมน์ boolean fields ที่ไม่ได้ใช้งานแล้ว (pnd_1_40_1, pnd_1_40_2, etc.)

**Dependencies**: 
- ต้องรัน `021_add_tax_form_status_and_attachment_count.sql` ก่อน (เพราะต้องมี status และ attachment_count columns ก่อน)

---

### 4. Migration 025: Change income_confirmed to VARCHAR
**File**: `025_change_income_confirmed_to_varchar.sql`  
**วันที่สร้าง**: 2026-02-02  
**วัตถุประสงค์**: เปลี่ยน `income_confirmed` จาก BOOLEAN เป็น VARCHAR(100) เพื่อเก็บ enum string

**Dependencies**: 
- ต้องรัน `014_create_monthly_tax_data_table.sql` ก่อน (เพราะต้องมีตารางและ column `income_confirmed` ก่อน)

---

## ✅ ลำดับการรัน Migrations

### สำหรับระบบใหม่ (ยังไม่มีตาราง monthly_tax_data)

```sql
-- 1. สร้างตาราง clients ก่อน (เป็น Foreign Key สำหรับตารางอื่น)
SOURCE migrations/009_create_clients_table.sql;

-- 2. สร้างตาราง work_assignments (ถ้ายังไม่มี)
SOURCE migrations/016_create_work_assignments_table.sql;

-- 3. สร้างตาราง monthly_tax_data
SOURCE migrations/014_create_monthly_tax_data_table.sql;

-- 4. เพิ่ม columns สำหรับ status และ attachment_count
SOURCE migrations/021_add_tax_form_status_and_attachment_count.sql;

-- 5. ลบ boolean fields ที่ไม่ได้ใช้แล้ว
SOURCE migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql;

-- 6. เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

---

### สำหรับระบบที่มีตาราง monthly_tax_data อยู่แล้ว

**ตรวจสอบว่าได้รัน migrations ไหนไปแล้วบ้าง:**

#### ถ้ายังไม่รัน Migration 021:
```sql
-- เพิ่ม columns สำหรับ status และ attachment_count
SOURCE migrations/021_add_tax_form_status_and_attachment_count.sql;

-- ลบ boolean fields ที่ไม่ได้ใช้แล้ว
SOURCE migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql;

-- เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

#### ถ้ารัน Migration 021 แล้ว แต่ยังไม่รัน 023:
```sql
-- ลบ boolean fields ที่ไม่ได้ใช้แล้ว
SOURCE migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql;

-- เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

#### ถ้ารัน Migrations 021 และ 023 แล้ว:
```sql
-- เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

---

## ⚠️ หมายเหตุสำคัญ

1. **Migration 014**: ต้องรันก่อน migrations อื่นๆ ทั้งหมด (เพราะสร้างตาราง)
2. **Migration 021**: ต้องรันก่อน Migration 023 (เพราะ 023 ลบ columns ที่สร้างใน 014)
3. **Migration 023**: ต้องรันก่อน Migration 025 (เพื่อให้โครงสร้างตารางสะอาด)
4. **Migration 025**: รันสุดท้าย (เปลี่ยน `income_confirmed` จาก BOOLEAN เป็น VARCHAR)

---

## 🔍 การตรวจสอบสถานะ

### ตรวจสอบว่าตาราง monthly_tax_data มีอยู่แล้วหรือไม่:
```sql
SHOW TABLES LIKE 'monthly_tax_data';
```

### ตรวจสอบว่า column income_confirmed เป็น BOOLEAN หรือ VARCHAR:
```sql
DESCRIBE monthly_tax_data;
-- หรือ
SHOW COLUMNS FROM monthly_tax_data WHERE Field = 'income_confirmed';
```

### ตรวจสอบว่า columns status และ attachment_count มีอยู่แล้วหรือไม่:
```sql
SHOW COLUMNS FROM monthly_tax_data LIKE '%_status';
SHOW COLUMNS FROM monthly_tax_data LIKE '%_attachment_count';
```

---

## 📚 Related Documentation

- [Database Schema](../schema.md)
- [Workflow Database Design](../MyDatabase/WORKFLOW_DATABASE_DESIGN.md)
- [Bug Fixes](../../Agent_cursor_ai/BUG_FIXES.md)
