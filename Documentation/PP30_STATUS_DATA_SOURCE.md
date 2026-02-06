# 📊 แหล่งข้อมูลสถานะ ภ.พ.30 (PP30 Status Data Source)

## 🎯 คำตอบสั้นๆ

**หลัง Migration 028:** ระบบดึงข้อมูลสถานะ ภ.พ.30 จากคอลัมน์ **`pp30_form`** ในตาราง **`monthly_tax_data`**

---

## 📋 รายละเอียด

### 1. คอลัมน์หลัก (Primary Source)

**คอลัมน์:** `pp30_form`  
**ตาราง:** `monthly_tax_data`  
**ประเภท:** `VARCHAR(100)` (หลัง Migration 028)  
**ค่า:** สถานะโดยตรง เช่น `'paid'`, `'sent_to_customer'`, `'pending_recheck'`, `'draft_completed'`, `'received_receipt'`, `'not_started'`, `'passed'` ฯลฯ

**ตัวอย่าง:**
```sql
SELECT pp30_form FROM monthly_tax_data WHERE build = '018' AND tax_year = 2026 AND tax_month = 1;
-- ผลลัพธ์: 'paid' หรือ 'sent_to_customer' หรือ 'received_receipt' ฯลฯ
```

---

### 2. คอลัมน์สำรอง (Fallback Sources - Backward Compatibility)

ถ้า `pp30_form` ไม่มีค่า (NULL) หรือเป็น boolean (0/1) ระบบจะ derive สถานะจากคอลัมน์อื่นตามลำดับนี้:

#### 2.1 `pp30_filing_response`
- **ค่า:** TEXT
- **สถานะที่ derive:** `'paid'`
- **เงื่อนไข:** ถ้ามีค่า (ไม่ใช่ NULL หรือ empty string)

#### 2.2 Timestamp Fields (เรียงตามวันที่ล่าสุด)
- **`pp30_sent_to_customer_date`** → สถานะ: `'sent_to_customer'`
- **`pp30_review_returned_date`** → สถานะ: `'pending_recheck'`
- **`pp30_sent_for_review_date`** → สถานะ: `'pending_review'`
- **`vat_draft_completed_date`** → สถานะ: `'draft_completed'`

**Logic:** ใช้ timestamp ที่ล่าสุด (วันที่มากที่สุด) เป็นสถานะ

#### 2.3 `pp30_form = 1` (Boolean - Backward Compatibility)
- **ค่า:** `1` (TRUE) หรือ `'1'` (string)
- **สถานะที่ derive:** `'not_started'`
- **หมายเหตุ:** สำหรับข้อมูลเก่าที่ยังไม่ได้ migrate

---

## 🔄 Flow การทำงาน

### เมื่ออ่านข้อมูล (GET)

```
Backend:
1. อ่าน pp30_form จาก monthly_tax_data
2. ถ้า pp30_form มีค่าและไม่ใช่ boolean (0/1)
   → ใช้ pp30_form โดยตรง
3. ถ้าไม่มี → derive จาก pp30_filing_response หรือ timestamp fields
4. ส่ง pp30_status ใน response

Frontend:
1. รับ pp30_status จาก API response
2. หรือใช้ derivePp30Status() เพื่อ derive จาก pp30_form/fields อื่นๆ
3. แสดงสถานะใน UI
```

### เมื่อบันทึกข้อมูล (PUT/PATCH)

```
Frontend:
1. ผู้ใช้เลือกสถานะ (เช่น "ชำระแล้ว" = 'paid')
2. ส่ง pp30_status: 'paid' และ pp30_form: 'paid' ไปยัง backend

Backend:
1. รับ pp30_status และ pp30_form
2. เก็บ pp30_form = 'paid' ในฐานข้อมูล
3. อัพเดท timestamp fields (ถ้าจำเป็น)
4. ส่ง response กลับพร้อม pp30_status: 'paid'
```

---

## 📊 ตารางสรุป

| คอลัมน์ | ประเภท | ใช้เมื่อ | สถานะที่ derive |
|---------|--------|---------|-----------------|
| **`pp30_form`** | VARCHAR(100) | **หลัก** (หลัง Migration 028) | ใช้ค่าจากคอลัมน์โดยตรง |
| `pp30_filing_response` | TEXT | Fallback #1 | `'paid'` |
| `pp30_sent_to_customer_date` | DATETIME | Fallback #2 (timestamp ล่าสุด) | `'sent_to_customer'` |
| `pp30_review_returned_date` | DATETIME | Fallback #2 (timestamp ล่าสุด) | `'pending_recheck'` |
| `pp30_sent_for_review_date` | DATETIME | Fallback #2 (timestamp ล่าสุด) | `'pending_review'` |
| `vat_draft_completed_date` | DATETIME | Fallback #2 (timestamp ล่าสุด) | `'draft_completed'` |
| `pp30_form = 1` | BOOLEAN | Backward compatibility | `'not_started'` |

---

## 🔍 วิธีตรวจสอบ

### 1. เช็คในฐานข้อมูล
```sql
-- เช็คสถานะจาก pp30_form
SELECT 
  build,
  pp30_form,
  pp30_filing_response,
  pp30_sent_to_customer_date,
  pp30_review_returned_date,
  pp30_sent_for_review_date,
  vat_draft_completed_date
FROM monthly_tax_data
WHERE build = '018' AND tax_year = 2026 AND tax_month = 1;
```

### 2. เช็คใน Backend Logs
```javascript
// Backend จะ log:
console.log('🔍 [Backend] Received pp30_status conversion request:', {
  pp30_status,
  pp30_form,
  // ...
})
```

### 3. เช็คใน Frontend Console
```javascript
// Frontend จะ derive และ log:
const pp30Status = derivePp30Status(data)
console.log('สถานะที่แสดง:', pp30Status)
```

---

## ⚠️ หมายเหตุสำคัญ

1. **หลัง Migration 028:** `pp30_form` เป็นแหล่งข้อมูลหลัก - เก็บสถานะโดยตรง
2. **ก่อน Migration 028:** `pp30_form` เป็น BOOLEAN - ระบบจะ derive จาก timestamp fields
3. **Backward Compatibility:** ระบบยังรองรับการ derive จาก timestamp fields ถ้า `pp30_form` ไม่มีค่า
4. **Single Source of Truth:** `derivePp30Status()` และ `derivePp30StatusFromRow()` ใช้ logic เดียวกันทั้ง frontend และ backend

---

## 📚 เอกสารที่เกี่ยวข้อง

- `Documentation/PP30_FORM_STATUS_MIGRATION.md` - รายละเอียด Migration 028
- `Documentation/PP30_STATUS_DATABASE_DESIGN.md` - ออกแบบฐานข้อมูล
- `Documentation/PP30_STATUS_FLOW.md` - Flow การทำงานของ pp30_status
- `src/utils/pp30StatusUtils.ts` - Frontend utility function
- `backend/routes/monthly-tax-data.js` - Backend derive function
