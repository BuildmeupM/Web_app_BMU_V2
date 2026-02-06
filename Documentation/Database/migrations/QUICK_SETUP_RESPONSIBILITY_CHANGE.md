# Quick Setup Guide: Responsibility Change System

## 📋 ภาพรวม

Migration นี้เพิ่มฟิลด์สำหรับระบบการเปลี่ยนผู้รับผิดชอบและการซื้อขายงานในตาราง `monthly_tax_data` และ `work_assignments`

## 🚀 การรัน Migration

### วิธีที่ 1: รันไฟล์ Migration โดยตรง

1. เปิด phpMyAdmin หรือ MySQL CLI
2. เลือก database `bmu_work_management`
3. รันไฟล์ `Documentation/Database/migrations/034_add_responsibility_change_fields.sql`

### วิธีที่ 2: Copy-Paste SQL

คัดลอก SQL จากไฟล์ `034_add_responsibility_change_fields.sql` และรันใน phpMyAdmin หรือ MySQL CLI

## ✅ ตรวจสอบผลลัพธ์

หลังจากรัน migration แล้ว ให้ตรวจสอบว่า:

1. **ตาราง `monthly_tax_data` มีฟิลด์ใหม่**:
   ```sql
   DESCRIBE monthly_tax_data;
   ```
   ควรเห็นฟิลด์:
   - `original_accounting_responsible`
   - `current_accounting_responsible`
   - `purchased_by_accounting_responsible`
   - `original_wht_filer_employee_id`
   - `purchased_by_wht_filer_employee_id`
   - `original_vat_filer_employee_id`
   - `purchased_by_vat_filer_employee_id`
   - `original_document_entry_responsible`
   - `current_document_entry_responsible`
   - `purchased_by_document_entry_responsible`
   - `original_tax_inspection_responsible`
   - `current_tax_inspection_responsible`
   - `purchased_by_tax_inspection_responsible`

2. **ตาราง `work_assignments` มีฟิลด์ใหม่**:
   ```sql
   DESCRIBE work_assignments;
   ```
   ควรเห็นฟิลด์:
   - `original_accounting_responsible`
   - `current_accounting_responsible`
   - `purchased_by_accounting_responsible`
   - `original_wht_filer_responsible`
   - `current_wht_filer_responsible`
   - `purchased_by_wht_filer_responsible`
   - `original_vat_filer_responsible`
   - `current_vat_filer_responsible`
   - `purchased_by_vat_filer_responsible`
   - `original_document_entry_responsible`
   - `current_document_entry_responsible`
   - `purchased_by_document_entry_responsible`
   - `original_tax_inspection_responsible`
   - `current_tax_inspection_responsible`
   - `purchased_by_tax_inspection_responsible`

3. **Foreign Keys และ Indexes ถูกสร้างแล้ว**:
   ```sql
   SHOW CREATE TABLE monthly_tax_data;
   SHOW CREATE TABLE work_assignments;
   ```

## 📝 หมายเหตุ

- Migration นี้จะไม่ลบข้อมูลเดิม
- ฟิลด์ใหม่ทั้งหมดเป็น `NULL` ได้ (nullable)
- ข้อมูลเดิมจะไม่ได้รับผลกระทบ
- Backend code ถูกอัปเดตแล้วให้รองรับฟิลด์ใหม่:
  - `backend/routes/work-assignments.js` - อัปเดต INSERT statements และ resetMonthlyData function
  - `backend/routes/accounting-marketplace.js` - อัปเดต purchase endpoint

## 🔄 หลัง Migration

1. **Restart Backend Server**: เพื่อให้ backend code ใหม่ทำงาน
2. **ทดสอบการจัดงานใหม่**: สร้าง work assignment ใหม่และตรวจสอบว่า `original_*` และ `current_*` ถูกตั้งค่าถูกต้อง
3. **ทดสอบการซื้อขายงาน**: ซื้องานผ่าน Accounting Marketplace และตรวจสอบว่า `purchased_by_*` ถูกบันทึก

## 📚 เอกสารเพิ่มเติม

- `Documentation/Database/RESPONSIBILITY_CHANGE_SYSTEM.md` - เอกสารอธิบายระบบการเปลี่ยนผู้รับผิดชอบ
- `Documentation/Database/migrations/035_update_accounting_marketplace_purchase_to_set_purchased_by_fields.sql` - เอกสารการอัปเดต backend logic
