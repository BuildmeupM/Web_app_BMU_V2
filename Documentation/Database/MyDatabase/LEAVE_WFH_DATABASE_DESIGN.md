# 📅 Leave & WFH Database Design - BMU Work Management System

## 📋 Overview

เอกสารนี้อธิบายการออกแบบ Database สำหรับระบบลางานและ Work from Home (WFH) ตาม requirements จาก `Employy_data_WFH _&_ Leave_work.md`

**Last Updated**: 2026-01-29

---

## 🗄️ Database Schema

### 1. leave_requests (ตารางการลางาน)

ตารางสำหรับเก็บข้อมูลการลางานของพนักงาน

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
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leave_requests_employee_id (employee_id),
  INDEX idx_leave_requests_status (status),
  INDEX idx_leave_requests_dates (leave_start_date, leave_end_date),
  INDEX idx_leave_requests_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns Description:**
- `id` - Primary Key (UUID)
- `employee_id` - รหัสพนักงาน (เช่น AC00010, IT00003) - Foreign Key to employees.employee_id
- `request_date` - วันที่ขอลา (วันที่ส่งข้อมูลเข้ามาขอลา)
- `leave_start_date` - วันที่เริ่มลา
- `leave_end_date` - วันที่สิ้นสุดลา
- `leave_type` - ประเภทการลา: ลาป่วย, ลากิจ, ลาพักร้อน, ลาไม่รับค่าจ้าง, ลาอื่นๆ
- `leave_days` - จำนวนวันลา (คำนวณอัตโนมัติจาก leave_start_date ถึง leave_end_date)
- `reason` - หมายเหตุ (เช่น ลากิจเนื่องจากอะไร, ลาอื่นๆ เนื่องจากอะไร)
- `status` - สถานะการลา: รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ
- `approved_by` - Foreign Key to users.id (ผู้ที่อนุมัติ - HR/Admin)
- `approved_at` - เวลาที่อนุมัติ
- `approver_note` - หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**Business Rules:**
- ระบบจะคำนวณ `leave_days` อัตโนมัติจาก `leave_start_date` ถึง `leave_end_date`
- ถ้า `status = 'ไม่อนุมัติ'` ต้องบังคับกรอก `approver_note`
- HR/Admin สามารถอนุมัติตัวเองได้ (self-approval)

---

### 2. wfh_requests (ตารางการขอ WFH)

ตารางสำหรับเก็บข้อมูลการขอ Work from Home ของพนักงาน

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
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_wfh_requests_employee_id (employee_id),
  INDEX idx_wfh_requests_status (status),
  INDEX idx_wfh_requests_wfh_date (wfh_date),
  INDEX idx_wfh_requests_request_date (request_date),
  UNIQUE KEY uk_wfh_employee_date (employee_id, wfh_date, deleted_at) COMMENT 'ป้องกันการขอ WFH ซ้ำในวันเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns Description:**
- `id` - Primary Key (UUID)
- `employee_id` - รหัสพนักงาน (เช่น AC00010, IT00003) - Foreign Key to employees.employee_id
- `request_date` - วันที่ขอ WFH (วันที่ส่งข้อมูลเข้ามาขอ WFH)
- `wfh_date` - วันที่ต้องการ WFH
- `status` - สถานะ WFH: รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ
- `approved_by` - Foreign Key to users.id (ผู้ที่อนุมัติ - HR/Admin)
- `approved_at` - เวลาที่อนุมัติ
- `approver_note` - หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)
- `work_report` - รายงานการทำงาน (พนักงานกรอกหลังจาก WFH)
- `work_report_submitted_at` - เวลาที่ส่งรายงานการทำงาน
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**Business Rules:**
- **สิทธิ์ขอ WFH**: พนักงานต้องทำงานมาแล้วอย่างน้อย 3 เดือน (ตรวจสอบจาก `employees.hire_date`)
- **จำกัดจำนวน WFH ต่อวัน**: สูงสุด 3 คนต่อวัน (ตรวจสอบจาก `wfh_date` และ `status = 'อนุมัติแล้ว'`)
- **จำกัดจำนวน WFH ต่อเดือน**:
  - พนักงานทั่วไป: สูงสุด 6 วันต่อเดือน
  - ตำแหน่ง IT: สูงสุด 16 วันต่อเดือน (ตรวจสอบจาก `employees.position`)
- **ป้องกันการขอซ้ำ**: ไม่สามารถขอ WFH ในวันเดียวกันได้ (UNIQUE constraint)
- ถ้า `status = 'ไม่อนุมัติ'` ต้องบังคับกรอก `approver_note`
- HR/Admin สามารถอนุมัติตัวเองได้ (self-approval)

---

## 🔗 Relationships

### Foreign Keys

1. **leave_requests.employee_id** → **employees.employee_id**
   - ON DELETE: CASCADE (ถ้าลบพนักงาน ลบการลาทั้งหมด)
   - ON UPDATE: CASCADE

2. **leave_requests.approved_by** → **users.id**
   - ON DELETE: SET NULL (ถ้าลบ user ที่อนุมัติ ตั้งค่าเป็น NULL)
   - ON UPDATE: CASCADE

3. **wfh_requests.employee_id** → **employees.employee_id**
   - ON DELETE: CASCADE (ถ้าลบพนักงาน ลบการขอ WFH ทั้งหมด)
   - ON UPDATE: CASCADE

4. **wfh_requests.approved_by** → **users.id**
   - ON DELETE: SET NULL (ถ้าลบ user ที่อนุมัติ ตั้งค่าเป็น NULL)
   - ON UPDATE: CASCADE

---

## 📊 Indexes

### leave_requests
- `idx_leave_requests_employee_id` - สำหรับค้นหาการลาของพนักงาน
- `idx_leave_requests_status` - สำหรับกรองตามสถานะ
- `idx_leave_requests_dates` - สำหรับค้นหาตามช่วงวันที่
- `idx_leave_requests_request_date` - สำหรับค้นหาตามวันที่ขอลา

### wfh_requests
- `idx_wfh_requests_employee_id` - สำหรับค้นหาการขอ WFH ของพนักงาน
- `idx_wfh_requests_status` - สำหรับกรองตามสถานะ
- `idx_wfh_requests_wfh_date` - สำหรับค้นหาตามวันที่ WFH (สำคัญสำหรับ Calendar view)
- `idx_wfh_requests_request_date` - สำหรับค้นหาตามวันที่ขอ WFH
- `uk_wfh_employee_date` - UNIQUE constraint ป้องกันการขอ WFH ซ้ำในวันเดียวกัน

---

## 🔄 Data Flow

### Leave Request Flow

1. **พนักงานขอลา**:
   - กรอกข้อมูล: วันที่ขอลา, วันที่ลา (start-end), ประเภทการลา, หมายเหตุ
   - ระบบคำนวณ `leave_days` อัตโนมัติ
   - `status = 'รออนุมัติ'`

2. **HR/Admin อนุมัติ/ปฏิเสธ**:
   - ถ้าอนุมัติ: `status = 'อนุมัติแล้ว'`, `approved_by = user.id`, `approved_at = NOW()`
   - ถ้าปฏิเสธ: `status = 'ไม่อนุมัติ'`, `approved_by = user.id`, `approved_at = NOW()`, **บังคับกรอก `approver_note`**

### WFH Request Flow

1. **พนักงานขอ WFH**:
   - ตรวจสอบสิทธิ์: ทำงานมาแล้วอย่างน้อย 3 เดือน
   - ตรวจสอบจำนวน WFH ต่อวัน: ไม่เกิน 3 คนต่อวัน
   - ตรวจสอบจำนวน WFH ต่อเดือน: ไม่เกิน 6 วัน (IT: 16 วัน)
   - กรอกข้อมูล: วันที่ขอ WFH, วันที่ต้องการ WFH
   - `status = 'รออนุมัติ'`

2. **HR/Admin อนุมัติ/ปฏิเสธ**:
   - ถ้าอนุมัติ: `status = 'อนุมัติแล้ว'`, `approved_by = user.id`, `approved_at = NOW()`
   - ถ้าปฏิเสธ: `status = 'ไม่อนุมัติ'`, `approved_by = user.id`, `approved_at = NOW()`, **บังคับกรอก `approver_note`**

3. **พนักงานรายงานการทำงาน** (หลังจาก WFH):
   - กรอก `work_report`
   - `work_report_submitted_at = NOW()`

---

## 📝 Migration Scripts

### Migration 1: Create leave_requests table

**File**: `Documentation/Database/migrations/007_create_leave_requests_table.sql`

```sql
-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
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
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leave_requests_employee_id (employee_id),
  INDEX idx_leave_requests_status (status),
  INDEX idx_leave_requests_dates (leave_start_date, leave_end_date),
  INDEX idx_leave_requests_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Migration 2: Create wfh_requests table

**File**: `Documentation/Database/migrations/008_create_wfh_requests_table.sql`

```sql
-- Create wfh_requests table
CREATE TABLE IF NOT EXISTS wfh_requests (
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
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_wfh_requests_employee_id (employee_id),
  INDEX idx_wfh_requests_status (status),
  INDEX idx_wfh_requests_wfh_date (wfh_date),
  INDEX idx_wfh_requests_request_date (request_date),
  UNIQUE KEY uk_wfh_employee_date (employee_id, wfh_date, deleted_at) COMMENT 'ป้องกันการขอ WFH ซ้ำในวันเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔍 Query Examples

### 1. ค้นหาการลาที่รออนุมัติ

```sql
SELECT 
  lr.id,
  lr.employee_id,
  e.full_name,
  lr.request_date,
  lr.leave_start_date,
  lr.leave_end_date,
  lr.leave_type,
  lr.leave_days,
  lr.reason,
  lr.status
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.employee_id
WHERE lr.status = 'รออนุมัติ'
  AND lr.deleted_at IS NULL
ORDER BY lr.request_date DESC;
```

### 2. ค้นหาพนักงานที่จะลาภายใน 3 วันข้างหน้า (สำหรับ Dashboard)

```sql
SELECT 
  lr.id,
  lr.employee_id,
  e.full_name,
  e.position,
  lr.leave_start_date,
  lr.leave_end_date,
  lr.leave_type,
  lr.leave_days
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.employee_id
WHERE lr.status = 'อนุมัติแล้ว'
  AND lr.leave_start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
  AND lr.deleted_at IS NULL
ORDER BY lr.leave_start_date ASC;
```

### 3. นับจำนวน WFH ที่อนุมัติแล้วในวันนั้น (สำหรับ Calendar view)

```sql
SELECT 
  wfh_date,
  COUNT(*) as approved_count
FROM wfh_requests
WHERE wfh_date = ?
  AND status = 'อนุมัติแล้ว'
  AND deleted_at IS NULL
GROUP BY wfh_date;
```

### 4. ตรวจสอบจำนวน WFH ต่อเดือนของพนักงาน

```sql
SELECT 
  employee_id,
  COUNT(*) as wfh_count_this_month
FROM wfh_requests
WHERE employee_id = ?
  AND status = 'อนุมัติแล้ว'
  AND DATE_FORMAT(wfh_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
  AND deleted_at IS NULL
GROUP BY employee_id;
```

### 5. สรุปการลาของพนักงาน (Dashboard)

```sql
SELECT 
  e.employee_id,
  e.full_name,
  COUNT(CASE WHEN lr.status = 'อนุมัติแล้ว' THEN 1 END) as approved_leaves,
  SUM(CASE WHEN lr.status = 'อนุมัติแล้ว' THEN lr.leave_days ELSE 0 END) as total_leave_days,
  COUNT(CASE WHEN lr.status = 'รออนุมัติ' THEN 1 END) as pending_leaves
FROM employees e
LEFT JOIN leave_requests lr ON e.employee_id = lr.employee_id
  AND lr.deleted_at IS NULL
WHERE e.deleted_at IS NULL
  AND e.employee_id = ?
GROUP BY e.employee_id, e.full_name;
```

---

## 📚 Related Documentation

- [Employee Database Design](./EMPLOYEE_DATABASE_DESIGN.md)
- [Database Schema](../schema.md)
- [Database Relationships](../relationships.md)
- [Leave/WFH Requirements](./Employy_data_WFH%20_&_%20Leave_work.md)

---

**Last Updated**: 2026-01-30  
**Author**: Cursor AI  
**Status**: ✅ Design Complete - Implementation Complete

---

## 🚀 Implementation Status

### Database Migration Scripts
- ✅ `007_create_leave_requests_table.sql` - สร้างเสร็จแล้ว
- ✅ `008_create_wfh_requests_table.sql` - สร้างเสร็จแล้ว

### Backend Implementation
- ✅ `backend/routes/leave-requests.js` - สร้างเสร็จแล้ว
- ✅ `backend/routes/wfh-requests.js` - สร้างเสร็จแล้ว
- ✅ `backend/utils/leaveHelpers.js` - สร้างเสร็จแล้ว

### Frontend Implementation
- ✅ `src/services/leaveService.ts` - สร้างเสร็จแล้ว
- ✅ `src/pages/LeaveManagement.tsx` - พัฒนาเสร็จแล้ว
- ✅ `src/components/Leave/*` - สร้าง components ครบถ้วนแล้ว

**หมายเหตุ**: ต้องรัน Migration Scripts เพื่อสร้างตารางในฐานข้อมูลก่อนใช้งาน
