# 🗄️ Database Documentation - BMU Work Management System

## 🎯 วัตถุประสงค์

โฟลเดอร์นี้เก็บข้อมูลเกี่ยวกับ Database ของระบบ BMU Work Management System รวมถึงโครงสร้าง, Schema, และคู่มือการใช้งาน

## 📋 ไฟล์ในโฟลเดอร์

### Documentation Files
- [schema.md](./schema.md) - โครงสร้างตาราง (Tables Schema)
- [relationships.md](./relationships.md) - ความสัมพันธ์ระหว่างตาราง (ER Diagram)
- [guide.md](./guide.md) - คู่มือการใช้งาน Database
- [migrations.md](./migrations.md) - Database Migrations
- [README_SETUP.md](./README_SETUP.md) - คู่มือการตั้งค่า Database (เริ่มต้นใช้งาน)

### Migration Files
- [migrations/001_create_users_table.sql](./migrations/001_create_users_table.sql) - สร้างตาราง users
- [migrations/002_insert_initial_users.sql](./migrations/002_insert_initial_users.sql) - Template สำหรับ insert users

### Scripts
- [scripts/generate_password_hashes.js](./scripts/generate_password_hashes.js) - Script สำหรับ generate password hashes

## 🚨 สำคัญ: สำหรับ Cursor AI Agent

**ก่อนพัฒนา Backend หรือ API ที่เกี่ยวข้องกับ Database ต้องอ่าน:**
- ✅ `schema.md` - เพื่อเข้าใจโครงสร้างตาราง
- ✅ `relationships.md` - เพื่อเข้าใจความสัมพันธ์ระหว่างตาราง
- ✅ `guide.md` - เพื่อเข้าใจวิธีการใช้งาน Database

**สำหรับการตั้งค่า Database ครั้งแรก:**
- ✅ `README_SETUP.md` - คู่มือการตั้งค่า Database แบบ step-by-step

## 📊 Database Information

### Database Type
- **MySQL** - Relational Database Management System

### Database Name
- `bmu_work_management` (Development)
- `bmu_work_management_prod` (Production)

### Connection
- **Host**: localhost (Development)
- **Port**: 3306
- **Charset**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

## 🏗️ Database Structure Overview

### Core Tables
1. **users** - ข้อมูลผู้ใช้ระบบ
2. **employees** - ข้อมูลพนักงาน
3. **leave_requests** - การขอลา/WFH
4. **salary_advances** - การเบิกเงินเดือน
5. **attendances** - ข้อมูลการเข้าออฟฟิศ
6. **documents** - เอกสาร
7. **document_entries** - การคีย์เอกสาร
8. **tax_documents** - เอกสารภาษี
9. **tax_filings** - การยื่นภาษี

### Supporting Tables
- **departments** - ข้อมูลแผนก
- **positions** - ข้อมูลตำแหน่ง
- **document_categories** - หมวดหมู่เอกสาร
- **notifications** - การแจ้งเตือน

## 🔐 Security Guidelines

### Database Security
- ✅ ใช้ Parameterized Queries (ป้องกัน SQL Injection)
- ✅ ใช้ Prepared Statements
- ✅ จำกัดสิทธิ์การเข้าถึง Database
- ✅ ใช้ Connection Pooling
- ✅ Backup Database เป็นประจำ
- ✅ Encrypt Sensitive Data

### Best Practices
- ✅ ใช้ Transactions สำหรับ Operations ที่เกี่ยวข้องกัน
- ✅ ใช้ Indexes สำหรับ Performance
- ✅ Normalize Database (3NF)
- ✅ ใช้ Foreign Keys สำหรับ Data Integrity
- ✅ ใช้ Soft Delete (deleted_at) แทน Hard Delete

## 📝 Naming Conventions

### Tables
- ✅ Plural form, lowercase, snake_case
- Example: `users`, `leave_requests`, `tax_documents`

### Columns
- ✅ Singular form, lowercase, snake_case
- Example: `id`, `user_id`, `created_at`, `updated_at`

### Indexes
- ✅ Format: `idx_[table]_[column(s)]`
- Example: `idx_users_email`, `idx_employees_department_id`

### Foreign Keys
- ✅ Format: `fk_[table]_[referenced_table]`
- Example: `fk_employees_department_id`

## 🔄 Migration Guidelines

### Migration Files
- ✅ ใช้ Timestamp สำหรับชื่อไฟล์
- ✅ Format: `YYYYMMDDHHMMSS_[description].sql`
- Example: `20260129120000_create_users_table.sql`

### Migration Process
1. ✅ สร้าง Migration File
2. ✅ Test Migration ใน Development
3. ✅ Backup Production Database
4. ✅ Run Migration ใน Production
5. ✅ Verify Data Integrity

## 📊 Performance Optimization

### Indexes
- ✅ Primary Key Index (Auto)
- ✅ Foreign Key Indexes
- ✅ Frequently Queried Columns
- ✅ Composite Indexes สำหรับ Multi-column Queries

### Query Optimization
- ✅ ใช้ EXPLAIN เพื่อ Analyze Queries
- ✅ Avoid SELECT *
- ✅ ใช้ LIMIT สำหรับ Large Datasets
- ✅ ใช้ JOIN แทน Subqueries เมื่อเป็นไปได้

## 🧪 Testing

### Database Testing
- ✅ Unit Tests สำหรับ Database Functions
- ✅ Integration Tests สำหรับ Database Operations
- ✅ Test Data Seeding
- ✅ Test Database Migrations

---

**Last Updated**: 2026-01-29
