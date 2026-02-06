# 📊 Database Schema - BMU Work Management System

## 🎯 Overview

โครงสร้างตารางทั้งหมดในระบบ BMU Work Management System

## 📋 Tables

### 1. users
ตารางผู้ใช้ระบบ (Authentication)

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  temporary_password VARCHAR(255) NULL COMMENT 'รหัสผ่านชั่วคราวสำหรับ Admin ดู (เก็บแบบ plain text, จะถูกลบเมื่อ user login สำเร็จ)',
  employee_id VARCHAR(20) NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  nick_name VARCHAR(100) NULL COMMENT 'ชื่อเล่น (เช่น เอ็ม, ซอคเกอร์, มิ้น)',
  role ENUM('admin', 'data_entry', 'data_entry_and_service', 'audit', 'service') NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'ชื่อเต็ม',
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_role (role),
  INDEX idx_users_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns:**
- `id` - Primary Key (UUID)
- `username` - ชื่อผู้ใช้ (Unique)
- `email` - อีเมล (Unique)
- `password_hash` - รหัสผ่านที่ Hash แล้ว (ใช้ bcrypt)
- `temporary_password` - รหัสผ่านชั่วคราวสำหรับ Admin ดู (เก็บแบบ plain text, ไม่ถูกลบเมื่อ login สำเร็จเพื่อให้ Admin ควบคุมได้ทุกอย่าง) - Optional
- `employee_id` - รหัสพนักงาน (เช่น AC00010, IT00003, STAC001) - Optional
- `nick_name` - ชื่อเล่น (เช่น เอ็ม, ซอคเกอร์, มิ้น) - Optional
- `role` - บทบาท (admin, data_entry, data_entry_and_service, audit, service)
- `name` - ชื่อเต็ม
- `status` - สถานะ (active, inactive)
- `last_login_at` - เวลาที่ Login ล่าสุด
- `created_at` - เวลาที่สร้าง
- `updated_at` - เวลาที่อัปเดตล่าสุด
- `deleted_at` - Soft Delete

---

### 2. employees
ตารางข้อมูลพนักงาน

```sql
CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  user_id VARCHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NULL,
  department_id VARCHAR(36) NULL,
  position_id VARCHAR(36) NULL,
  hire_date DATE NOT NULL,
  status ENUM('active', 'inactive', 'resigned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  INDEX idx_employees_employee_id (employee_id),
  INDEX idx_employees_email (email),
  INDEX idx_employees_department_id (department_id),
  INDEX idx_employees_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns:**
- `id` - Primary Key (UUID)
- `employee_id` - รหัสพนักงาน (Unique)
- `user_id` - Foreign Key to users (Optional - สำหรับพนักงานที่เข้าสู่ระบบได้)
- `name` - ชื่อพนักงาน
- `email` - อีเมล (Unique)
- `phone` - เบอร์โทรศัพท์
- `department_id` - Foreign Key to departments
- `position_id` - Foreign Key to positions
- `hire_date` - วันที่เข้าทำงาน
- `status` - สถานะ (active, inactive, resigned)
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**หมายเหตุ (2026-01-29)**:
- `company_email` (Email Build) ไม่มี UNIQUE constraint แล้ว - ระบบรองรับข้อมูลซ้ำกันได้
- ดูรายละเอียดเพิ่มเติม: [ALLOW_DUPLICATE_EMAIL_GUIDE.md](./ALLOW_DUPLICATE_EMAIL_GUIDE.md)

---

### 3. departments
ตารางข้อมูลแผนก

```sql
CREATE TABLE departments (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. positions
ตารางข้อมูลตำแหน่ง

```sql
CREATE TABLE positions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_positions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. leave_requests
ตารางการลางาน

**Reference**: `Documentation/Database/MyDatabase/LEAVE_WFH_DATABASE_DESIGN.md`

```sql
CREATE TABLE leave_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  request_date DATE NOT NULL COMMENT 'วันที่ขอลา (วันที่ส่งข้อมูลเข้ามาขอลา)',
  leave_start_date DATE NOT NULL COMMENT 'วันที่เริ่มลา',
  leave_end_date DATE NOT NULL COMMENT 'วันที่สิ้นสุดลา',
  leave_type ENUM('ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาไม่รับค่าจ้าง', 'ลาอื่นๆ') NOT NULL COMMENT 'ประเภทการลา',
  leave_days DECIMAL(5,2) NOT NULL COMMENT 'จำนวนวันลา (คำนวณจาก leave_start_date ถึง leave_end_date)',
  reason TEXT NULL COMMENT 'หมายเหตุ (เช่น ลากิจเนื่องจากอะไร, ลาอื่นๆ เนื่องจากอะไร)',
  status ENUM('รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ') DEFAULT 'รออนุมัติ' COMMENT 'สถานะการลา',
  approved_by VARCHAR(36) NULL COMMENT 'Foreign Key to users (ผู้ที่อนุมัติ)',
  approved_at DATETIME NULL COMMENT 'เวลาที่อนุมัติ',
  approver_note TEXT NULL COMMENT 'หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_leave_requests_employee_id (employee_id),
  INDEX idx_leave_requests_status (status),
  INDEX idx_leave_requests_dates (leave_start_date, leave_end_date),
  INDEX idx_leave_requests_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns:**
- `id` - Primary Key
- `employee_id` - รหัสพนักงาน (Foreign Key to employees.employee_id)
- `request_date` - วันที่ขอลา (วันที่ส่งข้อมูลเข้ามาขอลา)
- `leave_start_date` - วันที่เริ่มลา
- `leave_end_date` - วันที่สิ้นสุดลา
- `leave_type` - ประเภทการลา (ลาป่วย, ลากิจ, ลาพักร้อน, ลาไม่รับค่าจ้าง, ลาอื่นๆ)
- `leave_days` - จำนวนวันลา (คำนวณอัตโนมัติ)
- `reason` - หมายเหตุ
- `status` - สถานะ (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ)
- `approved_by` - Foreign Key to users (ผู้ที่อนุมัติ)
- `approved_at` - เวลาที่อนุมัติ
- `approver_note` - หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)

---

### 6. wfh_requests
ตารางการขอ Work from Home (WFH)

**Reference**: `Documentation/Database/MyDatabase/LEAVE_WFH_DATABASE_DESIGN.md`

```sql
CREATE TABLE wfh_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  request_date DATE NOT NULL COMMENT 'วันที่ขอ WFH (วันที่ส่งข้อมูลเข้ามาขอ WFH)',
  wfh_date DATE NOT NULL COMMENT 'วันที่ต้องการ WFH',
  status ENUM('รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ') DEFAULT 'รออนุมัติ' COMMENT 'สถานะ WFH',
  approved_by VARCHAR(36) NULL COMMENT 'Foreign Key to users (ผู้ที่อนุมัติ)',
  approved_at DATETIME NULL COMMENT 'เวลาที่อนุมัติ',
  approver_note TEXT NULL COMMENT 'หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)',
  work_report TEXT NULL COMMENT 'รายงานการทำงาน (พนักงานกรอกหลังจาก WFH)',
  work_report_submitted_at DATETIME NULL COMMENT 'เวลาที่ส่งรายงานการทำงาน',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_wfh_requests_employee_id (employee_id),
  INDEX idx_wfh_requests_status (status),
  INDEX idx_wfh_requests_wfh_date (wfh_date),
  INDEX idx_wfh_requests_request_date (request_date),
  UNIQUE KEY uk_wfh_employee_date (employee_id, wfh_date, deleted_at) COMMENT 'ป้องกันการขอ WFH ซ้ำในวันเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns:**
- `id` - Primary Key
- `employee_id` - รหัสพนักงาน (Foreign Key to employees.employee_id)
- `request_date` - วันที่ขอ WFH (วันที่ส่งข้อมูลเข้ามาขอ WFH)
- `wfh_date` - วันที่ต้องการ WFH
- `status` - สถานะ (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ)
- `approved_by` - Foreign Key to users (ผู้ที่อนุมัติ)
- `approved_at` - เวลาที่อนุมัติ
- `approver_note` - หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)
- `work_report` - รายงานการทำงาน (พนักงานกรอกหลังจาก WFH)
- `work_report_submitted_at` - เวลาที่ส่งรายงานการทำงาน

**Business Rules:**
- สิทธิ์ขอ WFH: พนักงานต้องทำงานมาแล้วอย่างน้อย 3 เดือน
- จำกัดจำนวน WFH ต่อวัน: สูงสุด 3 คนต่อวัน
- จำกัดจำนวน WFH ต่อเดือน: พนักงานทั่วไป 6 วัน, ตำแหน่ง IT 16 วัน
- ป้องกันการขอ WFH ซ้ำในวันเดียวกัน (UNIQUE constraint)

---

### 7. salary_advances
ตารางการเบิกเงินเดือน

```sql
CREATE TABLE salary_advances (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled') DEFAULT 'pending',
  approved_by VARCHAR(36) NULL,
  approved_at DATETIME NULL,
  paid_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_salary_advances_employee_id (employee_id),
  INDEX idx_salary_advances_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. attendances
ตารางข้อมูลการเข้าออฟฟิศ

```sql
CREATE TABLE attendances (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status ENUM('present', 'absent', 'late', 'half_day') DEFAULT 'present',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uk_attendances_employee_date (employee_id, date),
  INDEX idx_attendances_employee_id (employee_id),
  INDEX idx_attendances_date (date),
  INDEX idx_attendances_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 9. document_categories
ตารางหมวดหมู่เอกสาร

```sql
CREATE TABLE document_categories (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_document_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 10. documents
ตารางเอกสาร

```sql
CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  document_number VARCHAR(50) UNIQUE NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('pending', 'sorted', 'processed', 'archived') DEFAULT 'pending',
  sorted_by VARCHAR(36) NULL,
  sorted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (sorted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_documents_document_number (document_number),
  INDEX idx_documents_category_id (category_id),
  INDEX idx_documents_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 11. document_entries
ตารางการคีย์เอกสาร

```sql
CREATE TABLE document_entries (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  entered_by VARCHAR(36) NOT NULL,
  data JSON NOT NULL,
  status ENUM('draft', 'completed', 'verified') DEFAULT 'draft',
  verified_by VARCHAR(36) NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_document_entries_document_id (document_id),
  INDEX idx_document_entries_entered_by (entered_by),
  INDEX idx_document_entries_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 12. tax_documents
ตารางเอกสารภาษี

```sql
CREATE TABLE tax_documents (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  tax_year YEAR NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_path VARCHAR(500) NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  inspected_by VARCHAR(36) NULL,
  inspected_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tax_documents_employee_id (employee_id),
  INDEX idx_tax_documents_tax_year (tax_year),
  INDEX idx_tax_documents_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 13. tax_filings
ตารางการยื่นภาษี

```sql
CREATE TABLE tax_filings (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  tax_year YEAR NOT NULL,
  filing_date DATE NULL,
  status ENUM('draft', 'submitted', 'processing', 'approved', 'rejected') DEFAULT 'draft',
  submitted_by VARCHAR(36) NULL,
  submitted_at DATETIME NULL,
  tax_document_ids JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tax_filings_employee_id (employee_id),
  INDEX idx_tax_filings_tax_year (tax_year),
  INDEX idx_tax_filings_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 14. notifications
ตารางการแจ้งเตือน

```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 15. clients
ตารางข้อมูลลูกค้า (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

```sql
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) UNIQUE NOT NULL COMMENT 'รหัสลูกค้า 3 หลัก (เช่น 001, 061, 315)',
  business_type ENUM('บริษัทจำกัด', 'บริษัทมหาชนจำกัด', 'ห้างหุ้นส่วน') NULL COMMENT 'ประเภทของกิจการ (optional - สามารถเป็น null ได้)',
  company_name VARCHAR(500) NOT NULL,
  legal_entity_number VARCHAR(13) NULL COMMENT 'เลขทะเบียนนิติบุคคล 13 หลัก (สามารถซ้ำกันได้สำหรับสาขา, สามารถเป็น null ได้)',
  establishment_date DATE NULL,
  business_category VARCHAR(200) NULL,
  business_subcategory VARCHAR(200) NULL,
  company_size ENUM('SS', 'S', 'MM', 'M', 'LL', 'L', 'XL', 'XXL') NULL,
  tax_registration_status ENUM('จดภาษีมูลค่าเพิ่ม', 'ยังไม่จดภาษีมูลค่าเพิ่ม') NULL,
  vat_registration_date DATE NULL,
  full_address TEXT NULL,
  village VARCHAR(200) NULL,
  building VARCHAR(200) NULL,
  room_number VARCHAR(50) NULL,
  floor_number VARCHAR(50) NULL,
  address_number VARCHAR(50) NULL,
  soi VARCHAR(200) NULL,
  moo VARCHAR(50) NULL,
  road VARCHAR(200) NULL,
  subdistrict VARCHAR(200) NULL,
  district VARCHAR(200) NULL,
  province VARCHAR(200) NULL,
  postal_code VARCHAR(10) NULL,
  company_status ENUM('รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย', 'ยกเลิกทำ') DEFAULT 'รายเดือน',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_clients_build (build),
  INDEX idx_clients_legal_entity_number (legal_entity_number),
  INDEX idx_clients_company_status (company_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/009_create_clients_table.sql`

---

### 16. accounting_fees
ตารางข้อมูลค่าทำบัญชี (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

**โครงสร้างตาม Excel Layout**: 1 row = 1 ลูกค้า + 1 ปี, 12 columns = 12 เดือน

```sql
CREATE TABLE accounting_fees (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  peak_code VARCHAR(100) NULL,
  accounting_start_date DATE NULL,
  accounting_end_date DATE NULL,
  accounting_end_reason TEXT NULL,
  fee_year YEAR(4) NOT NULL,
  -- Monthly Accounting Fees (12 เดือน)
  accounting_fee_jan DECIMAL(12,2) NULL,
  accounting_fee_feb DECIMAL(12,2) NULL,
  accounting_fee_mar DECIMAL(12,2) NULL,
  accounting_fee_apr DECIMAL(12,2) NULL,
  accounting_fee_may DECIMAL(12,2) NULL,
  accounting_fee_jun DECIMAL(12,2) NULL,
  accounting_fee_jul DECIMAL(12,2) NULL,
  accounting_fee_aug DECIMAL(12,2) NULL,
  accounting_fee_sep DECIMAL(12,2) NULL,
  accounting_fee_oct DECIMAL(12,2) NULL,
  accounting_fee_nov DECIMAL(12,2) NULL,
  accounting_fee_dec DECIMAL(12,2) NULL,
  -- Monthly HR Fees (12 เดือน)
  hr_fee_jan DECIMAL(12,2) NULL,
  hr_fee_feb DECIMAL(12,2) NULL,
  hr_fee_mar DECIMAL(12,2) NULL,
  hr_fee_apr DECIMAL(12,2) NULL,
  hr_fee_may DECIMAL(12,2) NULL,
  hr_fee_jun DECIMAL(12,2) NULL,
  hr_fee_jul DECIMAL(12,2) NULL,
  hr_fee_aug DECIMAL(12,2) NULL,
  hr_fee_sep DECIMAL(12,2) NULL,
  hr_fee_oct DECIMAL(12,2) NULL,
  hr_fee_nov DECIMAL(12,2) NULL,
  hr_fee_dec DECIMAL(12,2) NULL,
  -- API Line Information
  line_chat_type VARCHAR(50) NULL,
  line_chat_id VARCHAR(200) NULL,
  line_billing_chat_type VARCHAR(50) NULL,
  line_billing_id VARCHAR(200) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_accounting_fees_build (build),
  INDEX idx_accounting_fees_year (fee_year),
  UNIQUE KEY uk_accounting_fees_build_year (build, fee_year, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/010_create_accounting_fees_table.sql`

---

### 17. dbd_info
ตารางข้อมูลกรมพัฒนาธุรกิจ (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

```sql
CREATE TABLE dbd_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  accounting_period VARCHAR(100) NULL,
  registered_capital DECIMAL(15,2) NULL,
  paid_capital DECIMAL(15,2) NULL,
  business_code VARCHAR(100) NULL,
  business_objective_at_registration TEXT NULL,
  latest_business_code VARCHAR(100) NULL,
  latest_business_objective TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_dbd_info_build (build),
  UNIQUE KEY uk_dbd_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/011_create_dbd_info_table.sql`

---

### 18. boi_info
ตารางข้อมูลสิทธิ์ BOI (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

```sql
CREATE TABLE boi_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  boi_approval_date DATE NULL,
  boi_first_use_date DATE NULL,
  boi_expiry_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_boi_info_build (build),
  UNIQUE KEY uk_boi_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/012_create_boi_info_table.sql`

---

### 19. agency_credentials
ตารางข้อมูลรหัสผู้ใช้และรหัสผ่านของหน่วยงานต่างๆ (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

**Security Note**: รหัสผ่านควร Encrypt ก่อนเก็บใน Database

```sql
CREATE TABLE agency_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  efiling_username VARCHAR(200) NULL,
  efiling_password VARCHAR(500) NULL COMMENT 'ควร Encrypt',
  sso_username VARCHAR(200) NULL,
  sso_password VARCHAR(500) NULL COMMENT 'ควร Encrypt',
  dbd_username VARCHAR(200) NULL,
  dbd_password VARCHAR(500) NULL COMMENT 'ควร Encrypt',
  student_loan_username VARCHAR(200) NULL,
  student_loan_password VARCHAR(500) NULL COMMENT 'ควร Encrypt',
  enforcement_username VARCHAR(200) NULL,
  enforcement_password VARCHAR(500) NULL COMMENT 'ควร Encrypt',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_agency_credentials_build (build),
  UNIQUE KEY uk_agency_credentials_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/013_create_agency_credentials_table.sql`

---

### 20. monthly_tax_data
ตารางข้อมูลภาษีรายเดือน (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

**⚠️ Important**: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่

```sql
CREATE TABLE monthly_tax_data (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  tax_year YEAR(4) NOT NULL,
  tax_month TINYINT NOT NULL COMMENT 'เดือน (1-12)',
  accounting_responsible VARCHAR(20) NULL,
  original_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีเดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  tax_inspection_responsible VARCHAR(20) NULL,
  original_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีเดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  document_received_date DATETIME NULL,
  bank_statement_status VARCHAR(100) NULL,
  -- PND Information
  pnd_sent_for_review_date DATETIME NULL,
  pnd_review_returned_date DATETIME NULL,
  pnd_sent_to_customer_date DATETIME NULL,
  pnd_status VARCHAR(100) NULL,
  -- Tax Form Statuses (VARCHAR)
  pnd_1_40_1_status VARCHAR(100) NULL,
  pnd_1_40_2_status VARCHAR(100) NULL,
  pnd_3_status VARCHAR(100) NULL,
  pnd_53_status VARCHAR(100) NULL,
  pp_36_status VARCHAR(100) NULL,
  student_loan_form_status VARCHAR(100) NULL,
  pnd_2_status VARCHAR(100) NULL,
  pnd_54_status VARCHAR(100) NULL,
  pt_40_status VARCHAR(100) NULL,
  social_security_form_status VARCHAR(100) NULL,
  -- Tax Form Attachment Counts (INT)
  pnd_1_40_1_attachment_count INT NULL,
  pnd_1_40_2_attachment_count INT NULL,
  pnd_3_attachment_count INT NULL,
  pnd_53_attachment_count INT NULL,
  pp_36_attachment_count INT NULL,
  student_loan_form_attachment_count INT NULL,
  pnd_2_attachment_count INT NULL,
  pnd_54_attachment_count INT NULL,
  pt_40_attachment_count INT NULL,
  social_security_form_attachment_count INT NULL,
  -- Accounting Status
  accounting_record_status VARCHAR(100) NULL,
  monthly_tax_impact VARCHAR(200) NULL,
  bank_impact VARCHAR(200) NULL,
  -- WHT Information
  wht_draft_completed_date DATETIME NULL,
  wht_filer_employee_id VARCHAR(20) NULL,
  original_wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น WHT เดิม (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  wht_filer_current_employee_id VARCHAR(20) NULL,
  purchased_by_wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น WHT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  wht_inquiry TEXT NULL,
  wht_response TEXT NULL,
  wht_submission_comment TEXT NULL,
  wht_filing_response TEXT NULL,
  -- VAT Information
  pp30_sent_for_review_date DATETIME NULL,
  pp30_review_returned_date DATETIME NULL,
  pp30_sent_to_customer_date DATETIME NULL,
  pp30_form VARCHAR(100) NULL COMMENT 'สถานะ ภ.พ.30 (paid, sent_to_customer, pending_recheck, pending_review, draft_completed, etc.) - เปลี่ยนจาก BOOLEAN เป็น VARCHAR(100) ใน Migration 028',
  purchase_document_count INT NULL,
  income_confirmed VARCHAR(100) NULL COMMENT 'คอนเฟิร์มรายได้ (customer_confirmed, no_confirmation_needed, waiting_customer, customer_request_change)',
  expenses_confirmed VARCHAR(100) NULL COMMENT 'คอนเฟิร์มค่าใช้จ่าย (confirm_income, customer_request_additional_docs) - Migration 036',
  pp30_payment_status VARCHAR(100) NULL COMMENT 'สถานะยอดชำระ ภ.พ.30 (has_payment, no_payment)',
  pp30_payment_amount DECIMAL(15,2) NULL COMMENT 'จำนวนยอดชำระ ภ.พ.30',
  vat_draft_completed_date DATETIME NULL,
  vat_filer_employee_id VARCHAR(20) NULL,
  original_vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น VAT เดิม (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  vat_filer_current_employee_id VARCHAR(20) NULL,
  purchased_by_vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ผู้ยื่น VAT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  pp30_inquiry TEXT NULL,
  pp30_response TEXT NULL,
  pp30_submission_comment TEXT NULL,
  pp30_filing_response TEXT NULL,
  document_entry_responsible VARCHAR(20) NULL,
  original_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_monthly_tax_data_build (build),
  INDEX idx_monthly_tax_data_month (tax_year, tax_month),
  INDEX idx_monthly_tax_data_accounting_responsible (accounting_responsible),
  INDEX idx_monthly_tax_data_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_monthly_tax_data_document_entry_responsible (document_entry_responsible),
  UNIQUE KEY uk_monthly_tax_data_build_month (build, tax_year, tax_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/014_create_monthly_tax_data_table.sql`

**⚠️ Updated in Migration 034**: เพิ่มฟิลด์สำหรับระบบการเปลี่ยนผู้รับผิดชอบ:
- `original_*_responsible` / `original_*_employee_id` - ค่าเดิมเมื่อมีการจัดงาน
- `current_*_responsible` / `*_current_employee_id` - ค่าปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)
- `purchased_by_*_responsible` / `purchased_by_*_employee_id` - ผู้รับผิดชอบที่ซื้อ (สำหรับระบบตลาดกลาง)

ดูรายละเอียดเพิ่มเติม: `Documentation/Database/RESPONSIBILITY_CHANGE_SYSTEM.md`

---

### 21. document_entry_work
ตารางข้อมูลงานคีย์เอกสาร (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

**⚠️ Important**: ข้อมูลจะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่

```sql
CREATE TABLE document_entry_work (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  work_year YEAR(4) NOT NULL,
  work_month TINYINT NOT NULL COMMENT 'เดือน (1-12)',
  entry_timestamp DATETIME NOT NULL,
  submission_count INT DEFAULT 1,
  responsible_employee_id VARCHAR(20) NOT NULL,
  current_responsible_employee_id VARCHAR(20) NULL,
  responsibility_changed_date DATETIME NULL,
  responsibility_changed_by VARCHAR(20) NULL,
  responsibility_change_note TEXT NULL,
  -- WHT Documents
  wht_document_count INT DEFAULT 0,
  wht_entry_start_datetime DATETIME NULL,
  wht_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ',
  wht_entry_completed_datetime DATETIME NULL,
  wht_status_updated_by VARCHAR(20) NULL,
  -- VAT Documents
  vat_document_count INT DEFAULT 0,
  vat_entry_start_datetime DATETIME NULL,
  vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ',
  vat_entry_completed_datetime DATETIME NULL,
  vat_status_updated_by VARCHAR(20) NULL,
  -- Non-VAT Documents
  non_vat_document_count INT DEFAULT 0,
  non_vat_entry_start_datetime DATETIME NULL,
  non_vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ',
  non_vat_entry_completed_datetime DATETIME NULL,
  non_vat_status_updated_by VARCHAR(20) NULL,
  submission_comment TEXT NULL,
  return_comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (responsible_employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (current_responsible_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (responsibility_changed_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (non_vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_document_entry_work_build (build),
  INDEX idx_document_entry_work_month (work_year, work_month),
  INDEX idx_document_entry_work_responsible (responsible_employee_id),
  INDEX idx_document_entry_work_current_responsible (current_responsible_employee_id),
  INDEX idx_document_entry_work_entry_timestamp (entry_timestamp),
  INDEX idx_document_entry_work_wht_status (wht_entry_status),
  INDEX idx_document_entry_work_vat_status (vat_entry_status),
  INDEX idx_document_entry_work_non_vat_status (non_vat_entry_status),
  UNIQUE KEY uk_document_entry_work_build_month (build, work_year, work_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/015_create_document_entry_work_table.sql`

---

### 21.1. document_entry_work_bots
ตารางข้อมูลบอทอัตโนมัติสำหรับงานคีย์เอกสาร

**Reference**: Plan - Document Sorting Page Development

```sql
CREATE TABLE document_entry_work_bots (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_entry_work_id VARCHAR(36) NOT NULL,
  bot_type ENUM('Shopee (Thailand)', 'SPX Express (Thailand)', 'Lazada Limited (Head Office)', 'Lazada Express Limited', 'ระบบ OCR') NOT NULL,
  document_count INT DEFAULT 0,
  ocr_additional_info TEXT NULL COMMENT 'ข้อมูลเพิ่มเติมสำหรับระบบ OCR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (document_entry_work_id) REFERENCES document_entry_work(id) ON DELETE CASCADE,
  INDEX idx_document_entry_work_bots_work_id (document_entry_work_id),
  INDEX idx_document_entry_work_bots_bot_type (bot_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns**:
- `id` - Primary Key (UUID)
- `document_entry_work_id` - Foreign Key to document_entry_work
- `bot_type` - ประเภทบอท (5 ตัวเลือก)
- `document_count` - จำนวนเอกสาร
- `ocr_additional_info` - ข้อมูลเพิ่มเติมสำหรับระบบ OCR (แสดงเมื่อเลือก "ระบบ OCR")
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**Migration**: `migrations/031_create_document_entry_work_bots_table.sql`

---

### 22. work_assignments
ตารางข้อมูลการจัดงานรายเดือน (Workflow System)

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

**⚠️ Important**: การเปลี่ยนงานคือรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` ใหม่ทั้งหมด

```sql
CREATE TABLE work_assignments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL,
  assignment_year YEAR(4) NOT NULL,
  assignment_month TINYINT NOT NULL COMMENT 'เดือน (1-12)',
  accounting_responsible VARCHAR(20) NULL,
  original_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีเดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  tax_inspection_responsible VARCHAR(20) NULL,
  original_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีเดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้ตรวจภาษีที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  wht_filer_responsible VARCHAR(20) NULL,
  original_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT เดิม (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  vat_filer_responsible VARCHAR(20) NULL,
  original_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT เดิม (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  document_entry_responsible VARCHAR(20) NULL,
  original_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เดือน (ค่าเดิมเมื่อมีการจัดงาน) - เพิ่มใน Migration 034',
  current_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ) - เพิ่มใน Migration 034',
  purchased_by_document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์ที่ซื้อ (สำหรับเก็บข้อมูลของพนักงานที่ซื้องานไปทำต่อ) - เพิ่มใน Migration 034',
  assigned_by VARCHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL,
  assignment_note TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_reset_completed BOOLEAN DEFAULT FALSE,
  reset_completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (original_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (current_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (purchased_by_document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_work_assignments_build (build),
  INDEX idx_work_assignments_month (assignment_year, assignment_month),
  INDEX idx_work_assignments_accounting_responsible (accounting_responsible),
  INDEX idx_work_assignments_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_work_assignments_wht_filer_responsible (wht_filer_responsible),
  INDEX idx_work_assignments_vat_filer_responsible (vat_filer_responsible),
  INDEX idx_work_assignments_document_entry_responsible (document_entry_responsible),
  INDEX idx_work_assignments_assigned_by (assigned_by),
  INDEX idx_work_assignments_is_active (is_active),
  UNIQUE KEY uk_work_assignments_build_month (build, assignment_year, assignment_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/016_create_work_assignments_table.sql`

**⚠️ Updated in Migration 034**: เพิ่มฟิลด์สำหรับระบบการเปลี่ยนผู้รับผิดชอบ:
- `original_*_responsible` - ค่าเดิมเมื่อมีการจัดงาน
- `current_*_responsible` - ค่าปัจจุบัน (สำหรับฟังก์ชั่นการเปลี่ยนผู้รับผิดชอบ)
- `purchased_by_*_responsible` - ผู้รับผิดชอบที่ซื้อ (สำหรับระบบตลาดกลาง)

ดูรายละเอียดเพิ่มเติม: `Documentation/Database/RESPONSIBILITY_CHANGE_SYSTEM.md`

---

### 22. accounting_marketplace_listings
ตารางข้อมูลตลาดกลางผู้ทำบัญชี

```sql
CREATE TABLE accounting_marketplace_listings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'Build number ของบริษัท',
  tax_year YEAR(4) NOT NULL COMMENT 'ปีภาษี',
  tax_month TINYINT NOT NULL COMMENT 'เดือนภาษี (1-12)',
  seller_employee_id VARCHAR(20) NOT NULL COMMENT 'ผู้ขาย (accounting_responsible เดิม)',
  price DECIMAL(10,2) NOT NULL COMMENT 'ราคา (ขั้นต่ำ 300 บาท)',
  status ENUM('available', 'sold', 'cancelled') DEFAULT 'available' COMMENT 'สถานะ: available=ขายได้, sold=ขายแล้ว, cancelled=ยกเลิก',
  sold_to_employee_id VARCHAR(20) NULL COMMENT 'ผู้ซื้อ',
  sold_at DATETIME NULL COMMENT 'เวลาที่ขาย',
  cancelled_at DATETIME NULL COMMENT 'เวลาที่ยกเลิก',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (seller_employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (sold_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_listings_build (build),
  INDEX idx_listings_month (tax_year, tax_month),
  INDEX idx_listings_seller (seller_employee_id),
  INDEX idx_listings_status (status),
  INDEX idx_listings_sold_to (sold_to_employee_id),
  UNIQUE KEY uk_listings_build_month (build, tax_year, tax_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration**: `migrations/032_create_accounting_marketplace_listings_table.sql`

---

## 🔑 Indexes Summary

### Primary Indexes
- ทุกตารางมี `id` เป็น Primary Key

### Foreign Key Indexes
- ทุก Foreign Key มี Index เพื่อเพิ่ม Performance

### Composite Indexes
- `attendances`: (employee_id, date) - Unique
- `leave_requests`: (start_date, end_date)

### Single Column Indexes
- Email, Username, Status columns
- Date columns สำหรับ Query Performance

---

## 📝 Notes

- ✅ ใช้ UUID (VARCHAR(36)) สำหรับ Primary Keys
- ✅ ใช้ Soft Delete (deleted_at) แทน Hard Delete
- ✅ Timestamps: created_at, updated_at
- ✅ Status columns สำหรับ State Management
- ✅ Foreign Keys สำหรับ Data Integrity
- ✅ Indexes สำหรับ Query Performance

---

## 📊 Workflow System Tables Summary

### Core Tables (Workflow System)
- **clients** (009) - ข้อมูลลูกค้า
- **accounting_fees** (010) - ข้อมูลค่าทำบัญชี (Excel Layout)
- **dbd_info** (011) - ข้อมูลกรมพัฒนาธุรกิจ
- **boi_info** (012) - ข้อมูลสิทธิ์ BOI
- **agency_credentials** (013) - ข้อมูลรหัสผู้ใช้/รหัสผ่านหน่วยงาน
- **monthly_tax_data** (014) - ข้อมูลภาษีรายเดือน (รีเซ็ตทุกเดือน)
- **document_entry_work** (015) - ข้อมูลงานคีย์เอกสาร (รีเซ็ตทุกเดือน)
- **work_assignments** (016) - ข้อมูลการจัดงานรายเดือน

### Key Features
- **Build Code**: `build` (รหัสลูกค้า 3 หลัก) เป็นคีย์หลักสำหรับเชื่อมข้อมูลทั้งหมด
- **Monthly Reset**: `monthly_tax_data` และ `document_entry_work` จะถูกรีเซ็ตทุกเดือนเมื่อมีการจัดงานใหม่
- **Work Assignment**: ผู้ใช้งาน (Admin/HR) จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน

**Reference**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`

---

**Last Updated**: 2026-02-04 (Updated: Added accounting_marketplace_listings table)
