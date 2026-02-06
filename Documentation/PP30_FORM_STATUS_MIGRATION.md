# 🔄 Migration 028: เปลี่ยน pp30_form จาก BOOLEAN เป็น VARCHAR(100) เพื่อเก็บสถานะ

## 📋 สรุป

**Migration:** `028_change_pp30_form_to_status.sql`  
**วันที่:** 2026-02-03  
**วัตถุประสงค์:** เปลี่ยน `pp30_form` จาก `BOOLEAN` (tinyint(1)) เป็น `VARCHAR(100)` เพื่อเก็บสถานะ ภ.พ.30 โดยตรง

---

## 🎯 เหตุผล

ผู้ใช้ต้องการให้:
1. **ทุกสถานะ pp30_status ถูกส่งเข้าไปเก็บไว้ใน `pp30_form`**
2. **หน้าเว็บดึงข้อมูลจาก `pp30_form`** แทนที่จะ derive จาก timestamp fields

---

## 📊 การเปลี่ยนแปลง

### ก่อน Migration (เดิม)

```sql
pp30_form BOOLEAN DEFAULT FALSE COMMENT 'แบบ ภพ.30'
```

- **ประเภท:** `BOOLEAN` (tinyint(1))
- **ค่า:** `0` (FALSE) หรือ `1` (TRUE)
- **ใช้สำหรับ:** บอกว่ามีแบบฟอร์ม ภ.พ.30 หรือไม่
- **สถานะ:** Derive จาก timestamp fields (`pp30_filing_response`, `pp30_sent_to_customer_date`, etc.)

### หลัง Migration (ใหม่)

```sql
pp30_form VARCHAR(100) NULL COMMENT 'สถานะ ภ.พ.30 (paid, sent_to_customer, pending_recheck, pending_review, draft_completed, etc.)'
```

- **ประเภท:** `VARCHAR(100)`
- **ค่า:** สถานะโดยตรง เช่น `'paid'`, `'sent_to_customer'`, `'pending_recheck'`, `'draft_completed'`, `'not_started'`, `'received_receipt'`, `'passed'` ฯลฯ
- **ใช้สำหรับ:** เก็บสถานะ ภ.พ.30 โดยตรง
- **สถานะ:** อ่านจาก `pp30_form` โดยตรง (ไม่ต้อง derive)

---

## 🔄 Migration Steps

### 1. Backup Data (ถ้ามี)
- Migration จะแปลงค่าเดิม:
  - `pp30_form = 1` (TRUE) → `'not_started'` (เพราะมีแบบฟอร์มแต่ยังไม่เริ่ม)
  - `pp30_form = 0` (FALSE) หรือ `NULL` → `NULL`

### 2. Change Column Type
```sql
ALTER TABLE monthly_tax_data 
MODIFY COLUMN pp30_form VARCHAR(100) NULL COMMENT 'สถานะ ภ.พ.30 (...)';
```

### 3. Migrate Existing Data
```sql
UPDATE monthly_tax_data 
SET pp30_form = CASE 
  WHEN pp30_form = 1 THEN 'not_started'
  ELSE NULL
END
WHERE pp30_form IS NOT NULL;
```

---

## 🔧 การเปลี่ยนแปลงใน Code

### Backend (`backend/routes/monthly-tax-data.js`)

**1. เมื่อบันทึก (PUT /api/monthly-tax-data/:id):**
- รับ `pp30_status` จาก frontend
- เก็บใน `pp30_form` โดยตรง: `computedPp30Form = pp30_status`
- UPDATE: `pp30_form = 'paid'` (แทนที่จะเป็น `1` หรือ `0`)

**2. เมื่ออ่าน (GET /api/monthly-tax-data/:id, GET list):**
- `derivePp30StatusFromRow(row)` อ่านจาก `pp30_form` ก่อน:
  ```javascript
  if (row.pp30_form && String(row.pp30_form).trim() !== '' && row.pp30_form !== '0' && row.pp30_form !== '1') {
    return String(row.pp30_form).trim() // ใช้ค่าจาก pp30_form โดยตรง
  }
  ```
- Response: `pp30_status: row.pp30_form` (หรือ derive ถ้าไม่มี)

### Frontend (`src/utils/pp30StatusUtils.ts`)

**`derivePp30Status(data)`:**
- อ่านจาก `data.pp30_form` ก่อน (ถ้าไม่ใช่ boolean 0/1)
- Fallback ไป timestamp fields (backward compatibility)

---

## 📝 วิธีรัน Migration

### 1. Backup Database (แนะนำ)
```sql
-- Backup ตาราง monthly_tax_data
CREATE TABLE monthly_tax_data_backup AS SELECT * FROM monthly_tax_data;
```

### 2. รัน Migration
```bash
# ใน MySQL client หรือ phpMyAdmin
mysql -u [username] -p [database_name] < Documentation/Database/migrations/028_change_pp30_form_to_status.sql
```

หรือรัน SQL โดยตรง:
```sql
-- ดูไฟล์: Documentation/Database/migrations/028_change_pp30_form_to_status.sql
```

### 3. ตรวจสอบผลลัพธ์
```sql
-- เช็คว่า column type เปลี่ยนแล้ว
DESCRIBE monthly_tax_data;

-- เช็คว่าข้อมูลถูก migrate แล้ว
SELECT id, build, pp30_form FROM monthly_tax_data LIMIT 10;
```

---

## ✅ ผลลัพธ์หลัง Migration

### เมื่อบันทึกสถานะ "ชำระแล้ว" (paid)
```sql
-- Database
pp30_form = 'paid'
pp30_filing_response = 'paid' (ยังคงเก็บไว้เพื่อ backward compatibility)
```

### เมื่อบันทึกสถานะ "ส่งลูกค้าแล้ว" (sent_to_customer)
```sql
-- Database
pp30_form = 'sent_to_customer'
pp30_sent_to_customer_date = '2026-02-03 14:54:14' (ยังคงเก็บไว้เพื่อ backward compatibility)
```

### เมื่ออ่านกลับมา
```javascript
// Backend response
{
  pp30_form: 'paid',  // ← อ่านจาก DB โดยตรง
  pp30_status: 'paid' // ← ส่งให้ frontend (จาก pp30_form)
}
```

---

## ⚠️ หมายเหตุ

1. **Backward Compatibility:** ระบบยังคงเก็บ timestamp fields (`pp30_filing_response`, `pp30_sent_to_customer_date`, etc.) เพื่อ backward compatibility
2. **Derive Function:** `derivePp30StatusFromRow` และ `derivePp30Status` ยังรองรับการ derive จาก timestamp fields ถ้า `pp30_form` ไม่มีค่า
3. **Data Migration:** ข้อมูลเดิมที่มี `pp30_form = 1` จะถูกแปลงเป็น `'not_started'`

---

## 🔍 วิธีตรวจสอบว่า Migration สำเร็จ

```sql
-- 1. เช็ค column type
DESCRIBE monthly_tax_data;
-- ควรเห็น: pp30_form | varchar(100) | YES | NULL | ...

-- 2. เช็คข้อมูล
SELECT id, build, pp30_form FROM monthly_tax_data WHERE pp30_form IS NOT NULL LIMIT 10;
-- ควรเห็นค่าสถานะ เช่น 'paid', 'sent_to_customer', 'not_started' ฯลฯ

-- 3. Test: บันทึกสถานะใหม่
-- Frontend → Backend → Database
-- ควรเห็น pp30_form = 'paid' (หรือสถานะที่เลือก)
```
