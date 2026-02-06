# 🔄 Database Migrations - BMU Work Management System

## 🎯 Overview

Database Migration Files และวิธีการจัดการ Migrations

## 📋 Migration Files

### Migration 001: Create Users Table
**File**: `migrations/001_create_users_table.sql`  
**Date**: 2026-01-29  
**Description**: สร้างตาราง users สำหรับระบบ Authentication และ User Management

**Features**:
- สร้างตาราง users พร้อม columns: id, username, email, password_hash, employee_id, nick_name, role, name, status, timestamps
- เพิ่ม indexes สำหรับ email, username, role, employee_id
- รองรับ Soft Delete (deleted_at)
- รองรับ Roles: admin, data_entry, data_entry_and_service, audit, service

**Usage**:
```sql
-- รันใน phpMyAdmin หรือ MySQL CLI
SOURCE migrations/001_create_users_table.sql;
```

### Migration 002: Insert Initial Users (Template)
**File**: `migrations/002_insert_initial_users.sql`  
**Date**: 2026-01-29  
**Description**: Template สำหรับ insert ข้อมูล users เริ่มต้น (ไม่แนะนำ - ใช้ Migration 003 แทน)

**Note**: 
- ⚠️ ไฟล์นี้เป็น template เท่านั้น (ไม่แนะนำให้ใช้)
- ใช้ Migration 003 แทน (มี password hashes พร้อมแล้ว)

### Migration 003: Insert Users with Password Hashes ✅ (แนะนำ)
**File**: `migrations/003_insert_users_with_hashes.sql`  
**Date**: 2026-01-29  
**Description**: Insert ข้อมูล users เริ่มต้น 28 รายการพร้อม password hashes ที่ hash แล้ว

**Features**:
- Password hashes ถูก generate ด้วย bcrypt (cost factor: 10)
- พร้อมใช้งานทันที - ไม่ต้อง hash password เอง
- รวม 28 users จากภาพประกอบที่ 2

**Usage**:
```sql
-- เปิดไฟล์และรัน SQL statements ทั้งหมดใน phpMyAdmin
SOURCE migrations/003_insert_users_with_hashes.sql;
```

**หรือ**:
1. เปิดไฟล์ `migrations/003_insert_users_with_hashes.sql`
2. คัดลอก SQL ทั้งหมด
3. วางใน phpMyAdmin SQL tab
4. คลิก **Go** เพื่อรัน

### Migration 005: Create Employees Table
**File**: `migrations/005_create_employees_table.sql`  
**Date**: 2026-01-29  
**Description**: สร้างตาราง employees สำหรับเก็บข้อมูลพนักงานครบถ้วนตาม requirements

**Features**:
- สร้างตาราง employees พร้อม columns ครบถ้วน
- รองรับ Soft Delete (deleted_at)
- มี UNIQUE constraint บน `company_email` (ถูกลบใน Migration 006)

**Usage**:
```sql
SOURCE migrations/005_create_employees_table.sql;
```

### Migration 006: Remove Company Email Unique Constraint ✅
**File**: `migrations/006_remove_company_email_unique.sql`  
**Date**: 2026-01-29  
**Description**: ลบ UNIQUE constraint จาก `company_email` เพื่อรองรับการใส่ข้อมูลซ้ำกัน

**Features**:
- ลบ UNIQUE constraint จาก `company_email`
- สร้าง index ธรรมดา (ไม่ unique) เพื่อเพิ่มประสิทธิภาพการค้นหา
- ระบบรองรับการนำเข้าข้อมูลที่มี Email Build ซ้ำกันได้

**Usage**:
```sql
-- รันใน phpMyAdmin หรือ MySQL CLI (แยกเป็น 2 ส่วน)
-- ส่วนที่ 1: ลบ UNIQUE constraint
-- ส่วนที่ 2: สร้าง index ธรรมดา (ถ้ายังไม่มี)
SOURCE migrations/006_remove_company_email_unique.sql;
```

**หมายเหตุ**:
- Migration นี้แบ่งเป็น 2 ส่วน (เนื่องจาก MySQL ไม่รองรับ CREATE INDEX ใน prepared statement)
- ดูรายละเอียดเพิ่มเติม: [ALLOW_DUPLICATE_EMAIL_GUIDE.md](./ALLOW_DUPLICATE_EMAIL_GUIDE.md)

### Migration 007: Create Leave Requests Table ✅
**File**: `migrations/007_create_leave_requests_table.sql`  
**Date**: 2026-01-29  
**Description**: สร้างตาราง leave_requests สำหรับระบบลางาน

### Migration 008: Create WFH Requests Table ✅
**File**: `migrations/008_create_wfh_requests_table.sql`  
**Date**: 2026-01-29  
**Description**: สร้างตาราง wfh_requests สำหรับระบบ Work from Home

---

## 🆕 Workflow System Migrations (2026-01-30)

### Migration 009: Create Clients Table ✅
**File**: `migrations/009_create_clients_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง clients สำหรับเก็บข้อมูลพื้นฐานของลูกค้า

**Features**:
- เก็บข้อมูลพื้นฐานของลูกค้า (Build, ชื่อบริษัท, เลขทะเบียนนิติบุคคล, ที่อยู่, สถานะบริษัท)
- Build code เป็น UNIQUE key สำหรับเชื่อมข้อมูลทั้งหมด
- รองรับ Soft Delete (deleted_at)

**Usage**:
```sql
SOURCE migrations/009_create_clients_table.sql;
```

### Migration 010: Create Accounting Fees Table ✅
**File**: `migrations/010_create_accounting_fees_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง accounting_fees สำหรับเก็บข้อมูลค่าบริการทำบัญชีและ HR (ตาม Excel Layout)

**Features**:
- เก็บข้อมูลค่าบริการทำบัญชีและ HR แยกตามเดือน (12 columns สำหรับ 12 เดือน)
- โครงสร้างตรงกับ Excel Layout: 1 row = 1 ลูกค้า + 1 ปี
- เก็บข้อมูล API Line สำหรับส่งข้อความและวางบิล

**Usage**:
```sql
SOURCE migrations/010_create_accounting_fees_table.sql;
```

### Migration 011: Create DBD Info Table ✅
**File**: `migrations/011_create_dbd_info_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง dbd_info สำหรับเก็บข้อมูลกรมพัฒนาธุรกิจ (DBD)

**Features**:
- เก็บข้อมูลทุนจดทะเบียน/ชำระ, รหัสธุรกิจ, วัตถุประสงค์
- เก็บข้อมูลการยื่นงบการเงินปีล่าสุด

**Usage**:
```sql
SOURCE migrations/011_create_dbd_info_table.sql;
```

### Migration 012: Create BOI Info Table ✅
**File**: `migrations/012_create_boi_info_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง boi_info สำหรับเก็บข้อมูลสิทธิ์ BOI

**Features**:
- เก็บวันที่ได้รับสิทธิ์ BOI, วันที่ใช้สิทธิ์ครั้งแรก, วันที่หมดอายุ

**Usage**:
```sql
SOURCE migrations/012_create_boi_info_table.sql;
```

### Migration 013: Create Agency Credentials Table ✅
**File**: `migrations/013_create_agency_credentials_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง agency_credentials สำหรับเก็บรหัสผู้ใช้และรหัสผ่านของหน่วยงานต่างๆ

**Features**:
- เก็บรหัสผู้ใช้/รหัสผ่านสำหรับ E-filing, SSO, DBD, กยศ., กรมบังคับคดี
- ⚠️ **Security Note**: รหัสผ่านควร Encrypt ก่อนเก็บใน Database

**Usage**:
```sql
SOURCE migrations/013_create_agency_credentials_table.sql;
```

### Migration 014: Create Monthly Tax Data Table ✅
**File**: `migrations/014_create_monthly_tax_data_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง monthly_tax_data สำหรับเก็บข้อมูลภาษีรายเดือน

**Features**:
- เก็บข้อมูลภาษีรายเดือน (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
- ⚠️ **Important**: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่
- แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
- เก็บข้อมูล PND (ภงด.), VAT (PP.30), และผู้รับผิดชอบแต่ละส่วน

**Usage**:
```sql
SOURCE migrations/014_create_monthly_tax_data_table.sql;
```

### Migration 015: Create Document Entry Work Table ✅
**File**: `migrations/015_create_document_entry_work_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง document_entry_work สำหรับเก็บข้อมูลงานคีย์เอกสาร

**Features**:
- เก็บข้อมูลงานคีย์เอกสาร (เชื่อมกับหน้า คีย์เอกสาร)
- ⚠️ **Important**: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่
- แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
- เก็บข้อมูลเอกสารหัก ณ ที่จ่าย (WHT), เอกสารภาษีมูลค่าเพิ่ม (VAT), และเอกสารไม่มีภาษีมูลค่าเพิ่ม

**Usage**:
```sql
SOURCE migrations/015_create_document_entry_work_table.sql;
```

### Migration 016: Create Work Assignments Table ✅
**File**: `migrations/016_create_work_assignments_table.sql`  
**Date**: 2026-01-30  
**Description**: สร้างตาราง work_assignments สำหรับเก็บข้อมูลการจัดงานรายเดือน

**Features**:
- เก็บข้อมูลการจัดงานรายเดือน - ผู้ใช้งาน (Admin/HR) จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน
- ⚠️ **Important**: การเปลี่ยนงานคือรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` ใหม่ทั้งหมด
- เก็บข้อมูลผู้รับผิดชอบแต่ละส่วน (ทำบัญชี, ตรวจภาษี, ยื่น WHT, ยื่น VAT, คีย์เอกสาร)
- เก็บสถานะการรีเซ็ตข้อมูล (`is_reset_completed`, `reset_completed_at`)

**Usage**:
```sql
SOURCE migrations/016_create_work_assignments_table.sql;
```

**Migration Order**:
1. รัน Migration 009 ก่อน (clients table)
2. รัน Migrations 010-013 (accounting_fees, dbd_info, boi_info, agency_credentials)

### Migration 032: Create Accounting Marketplace Listings Table ✅
**File**: `migrations/032_create_accounting_marketplace_listings_table.sql`  
**Date**: 2026-02-04  
**Description**: สร้างตาราง accounting_marketplace_listings สำหรับระบบตลาดกลางผู้ทำบัญชี

**Features**:
- เก็บข้อมูลรายการงานที่ขายในตลาดกลางผู้ทำบัญชี
- รองรับการขายงานผู้ทำบัญชีที่รับผิดชอบให้กับพนักงานคนอื่น
- ราคาขั้นต่ำ 300 บาท
- สถานะ: available (ขายได้), sold (ขายแล้ว), cancelled (ยกเลิก)
- เมื่อมีการซื้อ ระบบจะอัพเดท accounting_responsible ใน monthly_tax_data และ work_assignments

**Usage**:
```sql
SOURCE migrations/032_create_accounting_marketplace_listings_table.sql;
```

### Migration 033: Add Accounting Marketplace Notification Type ✅
**File**: `migrations/033_add_accounting_marketplace_notification_type.sql`  
**Date**: 2026-02-04  
**Description**: เพิ่ม notification type 'accounting_marketplace_sold' สำหรับระบบตลาดกลางผู้ทำบัญชี

**Features**:
- เพิ่ม notification type 'accounting_marketplace_sold' ใน ENUM ของ notifications table
- ใช้สำหรับแจ้งเตือนผู้ขายเมื่องานถูกซื้อ

**Usage**:
```sql
SOURCE migrations/033_add_accounting_marketplace_notification_type.sql;
```

### Migration 036: Add expenses_confirmed to monthly_tax_data ✅
**File**: `migrations/036_add_expenses_confirmed_to_monthly_tax_data.sql`  
**Description**: เพิ่มคอลัมน์ คอนเฟิร์มค่าใช้จ่าย (แนบของยื่นแบบภาษีมูลค่าเพิ่ม)

**Features**:
- เพิ่ม `expenses_confirmed` VARCHAR(100) NULL หลัง `income_confirmed`
- ค่า: `confirm_income` (คอนเฟิร์มรายได้), `customer_request_additional_docs` (ลูกค้าแจ้งเพิ่มเอกสาร)

**Usage**:
```sql
SOURCE migrations/036_add_expenses_confirmed_to_monthly_tax_data.sql;
```

### Initial Migration (Planned)
**File**: `20260129000000_initial_schema.sql` (ยังไม่สร้าง)

สร้างตารางทั้งหมด:
- users ✅ (สร้างแล้วใน Migration 001)
- employees ✅ (สร้างแล้วใน Migration 005)
- departments
- positions
- leave_requests
- salary_advances
- attendances
- document_categories
- documents
- document_entries
- tax_documents
- tax_filings
- notifications

### Migration Naming Convention
Format: `YYYYMMDDHHMMSS_[description].sql`

Examples:
- `20260129000000_initial_schema.sql`
- `20260129120000_add_indexes.sql`
- `20260130150000_add_soft_delete.sql`

## 🔄 Migration Process

### 1. Create Migration File
```sql
-- File: 20260129120000_add_user_avatar.sql

ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500) NULL AFTER name;
```

### 2. Test Migration
```bash
# Development
mysql -u root -p bmu_work_management < migrations/20260129120000_add_user_avatar.sql
```

### 3. Backup Production Database
```bash
mysqldump -u root -p bmu_work_management > backup_20260129.sql
```

### 4. Run Migration in Production
```bash
mysql -u root -p bmu_work_management_prod < migrations/20260129120000_add_user_avatar.sql
```

### 5. Verify Migration
```sql
DESCRIBE users;
-- Check if avatar_url column exists
```

## 📝 Rollback Strategy

### Create Rollback Migration
```sql
-- File: 20260129120000_add_user_avatar_rollback.sql

ALTER TABLE users 
DROP COLUMN avatar_url;
```

## 🔍 Migration Checklist

- [ ] Create migration file with timestamp
- [ ] Test migration in development
- [ ] Backup production database
- [ ] Run migration in production
- [ ] Verify data integrity
- [ ] Update documentation
- [ ] Create rollback script (if needed)

## 📚 Related Documentation

- [Allow Duplicate Email Guide](./ALLOW_DUPLICATE_EMAIL_GUIDE.md)
- [Database Schema](./schema.md)
- [Employee Import Guide](../Employee/EXCEL_TEMPLATE_GUIDE.md)
- [Bug Fixes](../Agent_cursor_ai/BUG_FIXES.md)

---

## 📋 Migration Execution Order

### สำหรับ Workflow System (Migrations 009-016)

**ลำดับการรัน Migrations**:
```sql
-- 1. สร้างตาราง clients ก่อน (เป็น Foreign Key สำหรับตารางอื่น)
SOURCE migrations/009_create_clients_table.sql;

-- 2. สร้างตารางที่อ้างอิง clients
SOURCE migrations/010_create_accounting_fees_table.sql;
SOURCE migrations/011_create_dbd_info_table.sql;
SOURCE migrations/012_create_boi_info_table.sql;
SOURCE migrations/013_create_agency_credentials_table.sql;

-- 3. สร้างตาราง work_assignments (ใช้สำหรับจัดงาน)
SOURCE migrations/016_create_work_assignments_table.sql;

-- 4. สร้างตารางที่อ้างอิง work_assignments (จะถูกรีเซ็ตเมื่อมีการจัดงานใหม่)
SOURCE migrations/014_create_monthly_tax_data_table.sql;
SOURCE migrations/015_create_document_entry_work_table.sql;
```

**หรือรันทั้งหมดในครั้งเดียว**:
```sql
SOURCE migrations/009_create_clients_table.sql;
SOURCE migrations/010_create_accounting_fees_table.sql;
SOURCE migrations/011_create_dbd_info_table.sql;
SOURCE migrations/012_create_boi_info_table.sql;
SOURCE migrations/013_create_agency_credentials_table.sql;
SOURCE migrations/016_create_work_assignments_table.sql;
SOURCE migrations/014_create_monthly_tax_data_table.sql;
SOURCE migrations/015_create_document_entry_work_table.sql;
```

---

### Migration 021: Add Tax Form Status and Attachment Count Columns
**File**: `migrations/021_add_tax_form_status_and_attachment_count.sql`  
**Date**: 2026-01-31  
**Description**: เพิ่ม columns สำหรับสถานะและจำนวนใบแนบของแต่ละแบบฟอร์มภาษี

**Features**:
- เพิ่ม columns สำหรับสถานะของแบบฟอร์ม (VARCHAR): `pnd_1_40_1_status`, `pnd_1_40_2_status`, `pnd_3_status`, `pnd_53_status`, `pp_36_status`, `student_loan_form_status`, `pnd_2_status`, `pnd_54_status`, `pt_40_status`, `social_security_form_status`
- เพิ่ม columns สำหรับจำนวนใบแนบ (INT): `pnd_1_40_1_attachment_count`, `pnd_1_40_2_attachment_count`, `pnd_3_attachment_count`, `pnd_53_attachment_count`, `pp_36_attachment_count`, `student_loan_form_attachment_count`, `pnd_2_attachment_count`, `pnd_54_attachment_count`, `pt_40_attachment_count`, `social_security_form_attachment_count`
- Columns BOOLEAN เดิมยังคงอยู่เพื่อ backward compatibility
- รองรับการบันทึกข้อมูลสถานะและจำนวนใบแนบในฟอร์มสถานะภาษีประจำเดือน (หน้า สถานะยื่นภาษี)

**Usage**:
```sql
-- รันใน phpMyAdmin หรือ MySQL CLI
SOURCE migrations/021_add_tax_form_status_and_attachment_count.sql;
```

**Note**: 
- ⚠️ การบันทึกข้อมูลจะไม่ทับข้อมูลพนักงาน (responsible fields) ที่เชื่อมมาจากงานที่ได้รับมอบหมาย
- Backend จะไม่ update responsible fields ถ้าไม่ได้ส่งมา (ใช้ `!== undefined` check)

---

---

## Migration 022: Add Tax Review Notification Types

**Date**: 2026-01-31  
**File**: `migrations/022_add_tax_review_notification_types.sql`

### Description
เพิ่ม notification types ใหม่สำหรับการแจ้งเตือนเมื่อส่งรอตรวจ

### Changes
- เพิ่ม `tax_review_pending` - แจ้งเตือนเมื่อส่งรอตรวจ
- เพิ่ม `tax_review_pending_recheck` - แจ้งเตือนเมื่อส่งรอตรวจอีกครั้ง

### Usage
```sql
-- Run migration
SOURCE migrations/022_add_tax_review_notification_types.sql;
```

### Related Features
- ระบบแจ้งเตือนเมื่อส่งรอตรวจ (Tax Review Notification System)
- Auto-mark as read เมื่อผู้รับผิดชอบเปิดดูข้อมูล
- Auto-delete หลังจาก 12 ชั่วโมงหลังจาก read_at

---

### Migration 023: Remove Unused Boolean Fields from monthly_tax_data
**File**: `migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql`  
**Date**: 2026-02-02  
**Description**: ลบคอลัมน์ boolean fields ที่ไม่ได้ใช้งานแล้ว (pnd_1_40_1, pnd_1_40_2, etc.)

**Features**:
- ลบ boolean columns: `pnd_1_40_1`, `pnd_1_40_2`, `pnd_3`, `pnd_53`, `pp_36`, `student_loan_form`, `pnd_2`, `pnd_54`, `pt_40`, `social_security_form`
- ระบบใช้ `_status` และ `_attachment_count` columns แทนแล้ว (จาก Migration 021)

**Dependencies**: 
- ต้องรัน `021_add_tax_form_status_and_attachment_count.sql` ก่อน

**Usage**:
```sql
SOURCE migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql;
```

---

### Migration 024: Add Tax Inspection Completed Notification Type
**File**: `migrations/024_add_tax_inspection_completed_notification_type.sql`  
**Date**: 2026-02-02  
**Description**: เพิ่ม notification type สำหรับการแจ้งเตือนเมื่อผู้ตรวจบันทึกข้อมูลแล้ว

**Features**:
- เพิ่ม `tax_inspection_completed` - แจ้งเตือนเมื่อผู้ตรวจ (tax_inspection_responsible) บันทึกข้อมูลแล้ว

**Usage**:
```sql
SOURCE migrations/024_add_tax_inspection_completed_notification_type.sql;
```

---

### Migration 025: Change income_confirmed from BOOLEAN to VARCHAR
**File**: `migrations/025_change_income_confirmed_to_varchar.sql`  
**Date**: 2026-02-02  
**Description**: เปลี่ยน `income_confirmed` จาก BOOLEAN เป็น VARCHAR(100) เพื่อเก็บ enum string

**Features**:
- เปลี่ยน `income_confirmed` จาก BOOLEAN เป็น VARCHAR(100)
- แปลงข้อมูลเดิม: TRUE (1) → 'customer_confirmed', FALSE (0) → 'waiting_customer'
- รองรับ enum values: 'customer_confirmed', 'no_confirmation_needed', 'waiting_customer', 'customer_request_change'

**Dependencies**: 
- ต้องรัน `014_create_monthly_tax_data_table.sql` ก่อน (เพราะต้องมีตารางและ column `income_confirmed` ก่อน)

**Usage**:
```sql
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

**Note**: 
- ⚠️ Migration นี้จะแปลงข้อมูลเดิมอัตโนมัติ:
  - `1` หรือ `TRUE` → `'customer_confirmed'`
  - `0` หรือ `FALSE` → `'waiting_customer'`
- ⚠️ หลังจากรัน migration แล้ว `income_confirmed` จะเป็น nullable (NULL = ยังไม่เลือกสถานะ)

### Migration 026: Update notification text from "ภงด." to "ภ.ง.ด."
**File**: `migrations/026_update_notification_pnd_text.sql`  
**Date**: 2026-02-02  
**Description**: อัพเดทข้อความใน notifications table จาก "ภงด." เป็น "ภ.ง.ด." ใน title และ message

**Features**:
- อัพเดท title: "มีข้อมูลภงด. ส่งรอตรวจ" -> "มีข้อมูลภ.ง.ด. ส่งรอตรวจ"
- อัพเดท message: แทนที่ "ภงด." ทั้งหมดเป็น "ภ.ง.ด."
- อัพเดท `updated_at` timestamp

**Usage**:
```sql
SOURCE migrations/026_update_notification_pnd_text.sql;
```

**Related Documentation**:
- `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-131, BUG-133, BUG-134) - การแก้ไขข้อความ "ภงด." เป็น "ภ.ง.ด."

---

## 📋 ลำดับการรัน Migrations สำหรับ monthly_tax_data

สำหรับข้อมูลเพิ่มเติมเกี่ยวกับลำดับการรัน migrations ที่เกี่ยวข้องกับ `monthly_tax_data` table โปรดดูที่:
- [MIGRATION_ORDER_FOR_MONTHLY_TAX_DATA.md](./migrations/MIGRATION_ORDER_FOR_MONTHLY_TAX_DATA.md)

**ลำดับการรัน Migrations สำหรับ monthly_tax_data**:
```sql
-- 1. สร้างตาราง monthly_tax_data
SOURCE migrations/014_create_monthly_tax_data_table.sql;

-- 2. เพิ่ม columns สำหรับ status และ attachment_count
SOURCE migrations/021_add_tax_form_status_and_attachment_count.sql;

-- 3. ลบ boolean fields ที่ไม่ได้ใช้แล้ว
SOURCE migrations/023_remove_unused_boolean_fields_from_monthly_tax_data.sql;

-- 4. เปลี่ยน income_confirmed จาก BOOLEAN เป็น VARCHAR
SOURCE migrations/025_change_income_confirmed_to_varchar.sql;
```

### Migration 031: Create Document Entry Work Bots Table
**File**: `migrations/031_create_document_entry_work_bots_table.sql`  
**Date**: 2026-02-03  
**Description**: สร้างตาราง document_entry_work_bots สำหรับเก็บข้อมูลบอทอัตโนมัติสำหรับแต่ละงานคีย์เอกสาร

**Features**:
- เก็บข้อมูลบอทหลายตัวสำหรับแต่ละ document_entry_work
- รองรับ 5 ประเภทบอท: Shopee (Thailand), SPX Express (Thailand), Lazada Limited (Head Office), Lazada Express Limited, ระบบ OCR
- มี field `ocr_additional_info` สำหรับเก็บข้อมูลเพิ่มเติมเมื่อเลือก "ระบบ OCR"
- Foreign Key ไปยัง document_entry_work (CASCADE on delete)

**Usage**:
```sql
SOURCE migrations/031_create_document_entry_work_bots_table.sql;
```

---

**Last Updated**: 2026-02-03 (Added Migration 031)
