# 🗄️ Database Setup Guide - BMU Work Management System

## 📋 Overview

คู่มือการตั้งค่า Database สำหรับระบบ BMU Work Management System

## 🚀 Quick Start

### ขั้นตอนที่ 1: สร้าง Database

1. เปิด phpMyAdmin
2. คลิกที่แท็บ **SQL**
3. รันคำสั่งต่อไปนี้:

```sql
CREATE DATABASE IF NOT EXISTS bmu_work_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE bmu_work_management;
```

### ขั้นตอนที่ 2: สร้างตาราง users

1. เปิดไฟล์ `Documentation/Database/migrations/001_create_users_table.sql`
2. คัดลอก SQL statements ทั้งหมด
3. วางใน phpMyAdmin SQL tab
4. คลิก **Go** เพื่อรัน

หรือใช้คำสั่ง:

```sql
-- สร้างตาราง users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
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

### ขั้นตอนที่ 3: Insert Users พร้อม Password Hashes

#### วิธีที่ 1: ใช้ไฟล์ SQL ที่เตรียมไว้แล้ว (แนะนำ - เร็วที่สุด)

1. เปิดไฟล์ `Documentation/Database/migrations/003_insert_users_with_hashes.sql`
2. คัดลอก SQL statements ทั้งหมด
3. วางใน phpMyAdmin SQL tab
4. คลิก **Go** เพื่อรัน

#### วิธีที่ 2: Generate Password Hashes ใหม่ (ถ้าต้องการ)

1. ติดตั้ง bcrypt (ถ้ายังไม่ได้ติดตั้ง):
```bash
npm install bcrypt
```

2. รัน script:
```bash
node Documentation/Database/scripts/generate_password_hashes.js
```

3. คัดลอก SQL INSERT statements ที่ได้จาก output
4. วางใน phpMyAdmin SQL tab
5. คลิก **Go** เพื่อรัน

#### วิธีที่ 2: ใช้ PHP Script

1. สร้างไฟล์ `generate_hashes.php`:
```php
<?php
require 'vendor/autoload.php'; // หรือใช้ password_hash() ของ PHP

$users = [
  ['username' => 'admin', 'password' => 'admin123', ...],
  // ... users ทั้งหมด
];

foreach ($users as $user) {
  $hash = password_hash($user['password'], PASSWORD_BCRYPT);
  // Generate INSERT statement
}
?>
```

2. รัน script และคัดลอก SQL statements

#### วิธีที่ 3: Hash Password ด้วย Online Tool (ไม่แนะนำ - Security Risk)

⚠️ **ไม่แนะนำ** เพราะอาจเสี่ยงต่อการรั่วไหลของข้อมูล

### ขั้นตอนที่ 4: ตรวจสอบข้อมูล

รันคำสั่ง SQL เพื่อตรวจสอบ:

```sql
-- ตรวจสอบจำนวน users
SELECT COUNT(*) as total_users FROM users;

-- ตรวจสอบ users ทั้งหมด
SELECT id, username, email, employee_id, nick_name, role, name, status 
FROM users 
ORDER BY created_at;

-- ตรวจสอบ users ตาม role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

## 📊 ข้อมูล Users เริ่มต้น

จากภาพประกอบที่ 2 มี users ทั้งหมด **27 รายการ** แบ่งตาม role:

- **admin**: 2 รายการ
- **data_entry**: 2 รายการ
- **data_entry_and_service**: 5 รายการ
- **audit**: 5 รายการ
- **service**: 13 รายการ

## 🔐 Password Format

- Password จะถูก hash ด้วย **bcrypt** (cost factor: 10)
- Password hash จะมีความยาว 60 ตัวอักษร
- Format: `$2b$10$...`

## 📝 Notes

1. **Email**: จะสร้างเป็น `username@bmu.local` (สามารถแก้ไขได้ภายหลัง)
2. **UUID**: จะถูกสร้างอัตโนมัติด้วย `UUID()` function ใน MySQL
3. **Password**: ต้อง hash ก่อน insert (ใช้ bcrypt)
4. **Employee ID**: อาจมี duplicate (เช่น AC00040 ใช้กับ 2 users) - ต้องตรวจสอบ

## 🔍 Troubleshooting

### Error: Table already exists
```sql
DROP TABLE IF EXISTS users;
-- แล้วรัน CREATE TABLE อีกครั้ง
```

### Error: Duplicate entry for key 'username'
- ตรวจสอบว่ามี username ซ้ำหรือไม่
- ลบ user ที่ซ้ำออกก่อน insert ใหม่

### Error: Invalid password hash
- ตรวจสอบว่า password hash มีความยาว 60 ตัวอักษร
- ตรวจสอบว่าใช้ bcrypt hash format ที่ถูกต้อง

## 📚 ไฟล์ที่เกี่ยวข้อง

- `Documentation/Database/migrations/001_create_users_table.sql` - SQL สำหรับสร้างตาราง
- `Documentation/Database/migrations/002_insert_initial_users.sql` - SQL template สำหรับ insert users
- `Documentation/Database/scripts/generate_password_hashes.js` - Script สำหรับ generate password hashes
- `Documentation/Database/schema.md` - Schema documentation

---

**Last Updated**: 2026-01-29
