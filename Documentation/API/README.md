# 📡 API Documentation - BMU Work Management System

## 📋 Overview

โฟลเดอร์นี้เก็บ Documentation สำหรับ API ทั้งหมดของระบบ BMU Work Management System

## 🚨 สำคัญ: สำหรับ Cursor AI Agent

**ก่อนสร้าง Feature ใหม่ ต้องอ่าน `API_INDEX.md` ก่อนทุกครั้ง!**

## 📄 ไฟล์หลัก

### API_INDEX.md
**ไฟล์ Index หลักสำหรับ API ทั้งหมด** - **ต้องอ่านก่อนสร้าง Feature ใหม่!**

- ✅ รวบรวม API endpoints ทั้งหมดไว้ในที่เดียว
- ✅ ป้องกันการสร้าง API ซ้ำซ้อน
- ✅ เป็น Reference สำหรับการพัฒนา Feature ใหม่
- ✅ Quick Search Guide สำหรับค้นหา API ที่ต้องการ

**Location**: `Documentation/API/API_INDEX.md`

### EMPLOYEE_API_DESIGN.md
เอกสารออกแบบ API สำหรับ Employee Management

- ✅ Design Principles
- ✅ Access Control
- ✅ API Endpoints (9 endpoints)
- ✅ Request/Response Examples
- ✅ Performance Optimization

### EMPLOYEE_API_IMPLEMENTATION.md
เอกสาร Implementation API สำหรับ Employee Management

- ✅ API Endpoints ที่สร้างแล้ว (9 endpoints)
- ✅ Features และ Security
- ✅ Files Created/Modified
- ✅ Testing Guide
- ✅ Next Steps

## 📖 วิธีใช้งาน

### สำหรับ Cursor AI Agent

**ก่อนสร้าง Feature ใหม่:**

1. ✅ **บังคับ**: อ่าน `Documentation/API/API_INDEX.md` ก่อนทุกครั้ง
2. ✅ ตรวจสอบว่า API ที่ต้องการมีอยู่แล้วหรือไม่
3. ✅ ถ้ามี API อยู่แล้ว:
   - อ่าน Documentation ที่เกี่ยวข้อง (`EMPLOYEE_API_DESIGN.md`, `EMPLOYEE_API_IMPLEMENTATION.md`)
   - ใช้ API ที่มีอยู่แทนการสร้างใหม่
   - อัพเดท Frontend Service เพื่อเรียกใช้ API ที่มีอยู่
4. ✅ ถ้ายังไม่มี API:
   - ออกแบบ API ใหม่ตาม Design Principles
   - สร้าง Backend Route
   - สร้าง Documentation (`[API_NAME]_API_DESIGN.md` และ `[API_NAME]_API_IMPLEMENTATION.md`)
   - **อัพเดท `API_INDEX.md` เพิ่ม API ใหม่ทันที**

### สำหรับ Developer

**ก่อนพัฒนา Feature:**

1. ✅ ตรวจสอบ `API_INDEX.md` ว่ามี API ที่ต้องการหรือไม่
2. ✅ อ่าน Documentation ที่เกี่ยวข้อง
3. ✅ ใช้ API ที่มีอยู่แทนการสร้างใหม่
4. ✅ ถ้าต้องการ API ใหม่ ให้แจ้ง Cursor AI เพื่อสร้างและอัพเดท Index

## 🔍 Quick Reference

### Authentication API
- **Index**: `API_INDEX.md` → Authentication API section
- **Documentation**: `Documentation/Authentication/API_REFERENCE.md`
- **Routes**: `backend/routes/auth.js`

### Employee Management API
- **Index**: `API_INDEX.md` → Employee Management API section
- **Design**: `EMPLOYEE_API_DESIGN.md`
- **Implementation**: `EMPLOYEE_API_IMPLEMENTATION.md`
- **Routes**: 
  - `backend/routes/employees.js`
  - `backend/routes/employees-statistics.js`
  - `backend/routes/employees-import.js`

## 📊 API Summary

### Total Endpoints: **13**

| Category | Count | Status |
|----------|-------|--------|
| Authentication | 3 | ✅ Complete |
| Employee Management | 10 | ✅ Complete |
| **Total** | **13** | ✅ Complete |

## 🛠️ Utility Scripts

### Reset Employees Script

**Command**: `npm run reset-employees`

**Description**: Interactive script to reset all employee data (hard delete)

**Location**: `backend/scripts/reset-employees.js`

**Usage**:
```bash
cd backend
npm run reset-employees
```

**Features**:
- Interactive confirmation (requires "YES" and "CONFIRM")
- Shows statistics before deletion
- Handles foreign key references
- Resets AUTO_INCREMENT counter

**Documentation**: See `EMPLOYEE_API_IMPLEMENTATION.md` → Utility Scripts section

---

## 🔄 การอัพเดท

เมื่อเพิ่ม API ใหม่:

1. ✅ สร้าง Documentation files:
   - `[API_NAME]_API_DESIGN.md` - Design documentation
   - `[API_NAME]_API_IMPLEMENTATION.md` - Implementation documentation
2. ✅ อัพเดท `API_INDEX.md`:
   - เพิ่ม API endpoint ในตารางที่เกี่ยวข้อง
   - อัพเดท "Total Endpoints" count
   - เพิ่มใน "Quick Search Guide"
   - อัพเดท "Last Updated" date

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Active - ใช้เป็น Reference สำหรับการพัฒนา Feature ใหม่
