# 👥 User Management System - ระบบจัดการ User Accounts

## 🎯 วัตถุประสงค์

ระบบจัดการ User Accounts สำหรับพนักงานในบริษัท โดย Admin สามารถสร้าง, แก้ไข, ลบ, และตรวจสอบ User Accounts ได้ทั้งหมด

---

## 📋 Features

### 1. **สร้าง User Account (Create)**
- ✅ สร้าง User Account ใหม่
- ✅ เชื่อมกับ Employee (optional) - สามารถเลือกพนักงานที่ยังไม่มี User Account
- ✅ ตั้งค่า Role (admin, data_entry, data_entry_and_service, audit, service)
- ✅ ตั้งค่า Status (active, inactive)
- ✅ Password จะถูก hash ด้วย bcrypt ก่อนบันทึก
- ✅ **แสดงรหัสผ่านชั่วคราว** หลังจากสร้างสำเร็จ (แสดงครั้งเดียวใน Modal พร้อมปุ่ม Copy)

### 2. **แก้ไข User Account (Update)**
- ✅ แก้ไข Username, Email, Password, Role, Status
- ✅ เชื่อม/ยกเลิกการเชื่อมกับ Employee
- ✅ ถ้าไม่กรอก Password ระบบจะไม่เปลี่ยน Password
- ✅ Auto-update `employee.user_id` เมื่อเชื่อมกับ Employee

### 2.1. **รีเซ็ตรหัสผ่าน (Reset Password)**
- ✅ Admin สามารถรีเซ็ตรหัสผ่านของ User ได้
- ✅ ตั้งรหัสผ่านใหม่ (ต้องยืนยันรหัสผ่าน)
- ✅ **แสดงรหัสผ่านใหม่ชั่วคราว** หลังจากรีเซ็ตสำเร็จ (แสดงครั้งเดียวใน Modal พร้อมปุ่ม Copy)
- ✅ Validation: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร

### 3. **ลบ User Account (Delete)**
- ✅ Soft Delete (ไม่ลบข้อมูลจริง)
- ✅ Auto-remove `user_id` จาก Employee table
- ✅ ป้องกันการลบ Account ของตัวเอง

### 4. **ตรวจสอบ User Account (View)**
- ✅ ดูรายละเอียด User Account
- ✅ แสดงข้อมูล: Username, Email, Employee ID, Name, Role, Status, **รหัสผ่าน (temporary_password)**, Last Login, Created/Updated dates
- ✅ **แสดงรหัสผ่านปัจจุบัน** ในตารางและ Detail Modal (จาก `temporary_password` field)
- ✅ มีปุ่ม Copy เพื่อคัดลอกรหัสผ่าน
- ✅ **Admin สามารถดูรหัสผ่านของทุกคนได้ตลอดเวลา** (ไม่ถูกลบเมื่อ login สำเร็จ)
- ✅ รหัสผ่านจะถูกอัพเดทอัตโนมัติเมื่อ Admin แก้ไขหรือรีเซ็ตรหัสผ่าน

### 5. **Search & Filter**
- ✅ ค้นหาตาม Employee ID หรือ Name
- ✅ Filter ตาม Role
- ✅ Filter ตาม Status
- ✅ Pagination

---

## 🔐 Access Control

- **Admin Only**: หน้า User Management และ API endpoints ทั้งหมด (ยกเว้น `GET /api/users` ที่ทุกคนสามารถดูได้)
- **Role-based**: ใช้ `authorize('admin')` middleware ใน Backend

---

## 📊 Database Schema

### `users` Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  temporary_password VARCHAR(255) NULL COMMENT 'รหัสผ่านชั่วคราวสำหรับ Admin ดู (เก็บแบบ plain text, จะถูกลบเมื่อ user login สำเร็จ)',
  employee_id VARCHAR(20) NULL,
  nick_name VARCHAR(100) NULL,
  role ENUM('admin', 'data_entry', 'data_entry_and_service', 'audit', 'service') NOT NULL,
  name VARCHAR(100) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
)
```

### `employees` Table (เชื่อมกับ users)
```sql
CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  user_id VARCHAR(36) NULL, -- Foreign Key to users.id
  ...
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)
```

---

## 🔄 Data Flow

### 1. **สร้าง User Account**

```
Admin clicks "สร้าง User Account"
  ↓
UserManagement.tsx → handleAdd()
  ↓
Open Form Modal
  ↓
Fill form (username, email, password, employee_id, role, name, status)
  ↓
Click "สร้าง"
  ↓
usersService.create(formData)
  ↓
POST /api/users
  ↓
Backend: authenticateToken + authorize('admin')
  ↓
Validate input (username, email, password, role, name)
  ↓
Check duplicates (username, email, employee_id)
  ↓
Hash password with bcrypt
  ↓
INSERT INTO users
  ↓
If employee_id provided: UPDATE employees SET user_id = ?
  ↓
Return created user
  ↓
Frontend: Show success notification
  ↓
Refresh user list
```

### 2. **แก้ไข User Account**

```
Admin clicks "แก้ไข" on user row
  ↓
UserManagement.tsx → handleEdit(user)
  ↓
Load user data into form
  ↓
Open Form Modal (pre-filled)
  ↓
Modify fields (password optional)
  ↓
Click "บันทึก"
  ↓
usersService.update(id, formData)
  ↓
PUT /api/users/:id
  ↓
Backend: authenticateToken + authorize('admin')
  ↓
Validate input
  ↓
Check duplicates (excluding current user)
  ↓
If password provided: Hash password
  ↓
UPDATE users SET ... WHERE id = ?
  ↓
If employee_id changed: Update employees.user_id
  ↓
Return updated user
  ↓
Frontend: Show success notification
  ↓
Refresh user list
```

### 3. **ลบ User Account**

```
Admin clicks "ลบ" on user row
  ↓
UserManagement.tsx → handleDelete(user)
  ↓
Open Delete Confirmation Modal
  ↓
Click "ลบ" to confirm
  ↓
usersService.delete(id)
  ↓
DELETE /api/users/:id
  ↓
Backend: authenticateToken + authorize('admin')
  ↓
Check if user exists
  ↓
Prevent deleting own account (req.user.id === id)
  ↓
Soft Delete: UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?
  ↓
Remove user_id from employee: UPDATE employees SET user_id = NULL WHERE employee_id = ?
  ↓
Return success
  ↓
Frontend: Show success notification
  ↓
Refresh user list
```

---

## 📡 API Endpoints

### `GET /api/users`
- **Description**: ดึงรายการ users (สามารถกรองตาม role และ status)
- **Access**: All authenticated users
- **Query Parameters**:
  - `role` (optional): Filter by role
  - `roles` (optional): Filter by multiple roles (comma-separated)
  - `status` (optional): Filter by status (active, inactive, all)
  - `search` (optional): Search by employee_id or name
- **Response**: `{ success: true, data: User[], total: number }`

### `GET /api/users/:id`
- **Description**: ดึงข้อมูล user ตาม ID
- **Access**: Admin only
- **Response**: `{ success: true, data: User }`

### `POST /api/users`
- **Description**: สร้าง user account ใหม่
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "username": "string (required)",
    "email": "string (required)",
    "password": "string (required)",
    "employee_id": "string (optional)",
    "nick_name": "string (optional)",
    "role": "admin | data_entry | data_entry_and_service | audit | service (required)",
    "name": "string (required)",
    "status": "active | inactive (optional, default: active)"
  }
  ```
- **Response**: `{ success: true, message: string, data: User, temporary_password: string }`
  - `temporary_password`: รหัสผ่านที่กรอก (plain text) สำหรับแสดงครั้งเดียว

### `PUT /api/users/:id`
- **Description**: แก้ไขข้อมูล user
- **Access**: Admin only
- **Request Body**: Same as POST (password is optional)
- **Response**: `{ success: true, message: string, data: User }`

### `DELETE /api/users/:id`
- **Description**: ลบ user account (Soft Delete)
- **Access**: Admin only
- **Response**: `{ success: true, message: string }`

### `POST /api/users/:id/reset-password`
- **Description**: รีเซ็ตรหัสผ่าน user
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "password": "string (required, min 6 characters)"
  }
  ```
- **Response**: `{ success: true, message: string, data: User, temporary_password: string }`
  - `temporary_password`: รหัสผ่านใหม่ (plain text) สำหรับแสดงครั้งเดียว

---

## 🎨 UI Components

### **UserManagement.tsx** (Main Page)
- **Location**: `src/pages/UserManagement.tsx`
- **Features**:
  - Search bar (ค้นหาตาม Employee ID หรือ Name)
  - Filter dropdowns (Role, Status)
  - User table with pagination
  - Action buttons (View, Edit, Delete)
  - Create/Edit Form Modal
  - Detail View Modal
  - Delete Confirmation Modal

### **Table Columns**:
1. Username
2. Email
3. รหัสพนักงาน (Employee ID)
4. ชื่อ (Name + Nickname)
5. Role (Badge)
6. Status (Badge)
7. **รหัสผ่าน** (แสดง temporary_password พร้อมปุ่ม Copy)
8. Login ล่าสุด (Last Login)
9. จัดการ (Actions: View, Edit, Reset Password, Delete)

### **Password Display Modal**:
- แสดงรหัสผ่านชั่วคราวหลังจากสร้าง User Account หรือรีเซ็ตรหัสผ่าน
- มีปุ่ม Copy เพื่อคัดลอกรหัสผ่าน
- แสดงครั้งเดียวเท่านั้น (ไม่สามารถดูได้อีกครั้ง)
- แสดง Username และรหัสผ่านชัดเจน

### **Reset Password Modal**:
- Form สำหรับรีเซ็ตรหัสผ่าน
- ต้องกรอกรหัสผ่านใหม่ 2 ครั้ง (ยืนยัน)
- Validation: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
- หลังจากรีเซ็ตสำเร็จจะแสดงรหัสผ่านใหม่ใน Password Display Modal

---

## 🔒 Security Features

1. **Password Hashing**: ใช้ bcrypt (salt rounds: 10)
2. **Input Validation**: ตรวจสอบ required fields, valid roles, valid statuses
3. **Duplicate Prevention**: ตรวจสอบ username, email, employee_id ซ้ำ
4. **Soft Delete**: ไม่ลบข้อมูลจริง ใช้ `deleted_at` timestamp
5. **Self-Protection**: ป้องกันการลบ account ของตัวเอง
6. **Role-based Access**: Admin เท่านั้นที่สามารถจัดการ User Accounts ได้

---

## 📝 Validation Rules

### **Username**:
- Required
- Unique (ไม่ซ้ำกับ users อื่น)
- Format: ตาม `validateUsername()` function

### **Email**:
- Required
- Unique (ไม่ซ้ำกับ users อื่น)
- Valid email format

### **Password**:
- Required (เมื่อสร้างใหม่)
- Optional (เมื่อแก้ไข - ถ้าไม่กรอกจะไม่เปลี่ยน password)
- Format: ตาม `validatePassword()` function

### **Role**:
- Required
- Must be one of: `admin`, `data_entry`, `data_entry_and_service`, `audit`, `service`

### **Name**:
- Required
- Full name of the user

### **Employee ID**:
- Optional
- Unique (ไม่ซ้ำกับ users อื่น)
- Must exist in `employees` table
- Employee must not have a user account already

---

## 🔗 Integration with Employee System

### **Linking User to Employee**:
- เมื่อสร้าง/แก้ไข User Account และระบุ `employee_id`
- ระบบจะอัพเดท `employees.user_id` อัตโนมัติ
- เมื่อลบ User Account ระบบจะลบ `user_id` จาก Employee อัตโนมัติ

### **Available Employees Dropdown**:
- แสดงเฉพาะพนักงานที่ยังไม่มี User Account (`user_id IS NULL`)
- Format: `{employee_id} - {full_name}`

---

## 📊 Statistics & Summary

- **Total Users**: แสดงจำนวน User Accounts ทั้งหมด
- **Filtered Count**: แสดงจำนวน User Accounts หลังกรอง

---

## ⚠️ Important Notes

1. **Admin Only**: หน้า User Management และ API endpoints (ยกเว้น `GET /api/users`) ต้องเป็น Admin เท่านั้น
2. **Password Security**: 
   - Password จะถูก hash ด้วย bcrypt ก่อนบันทึก (one-way hash - ไม่สามารถถอดรหัสกลับได้)
   - **เก็บรหัสผ่าน** ใน `temporary_password` field (plain text) เพื่อให้ Admin ดูได้ตลอดเวลา
   - `temporary_password` **จะไม่ถูกลบ** เมื่อ user login สำเร็จ (เพื่อให้ Admin สามารถควบคุมได้ทุกอย่าง)
   - `temporary_password` จะถูกอัพเดทอัตโนมัติเมื่อ Admin แก้ไขหรือรีเซ็ตรหัสผ่าน
3. **Password Display**: 
   - แสดงรหัสผ่านในตาราง User Management (column "รหัสผ่าน")
   - แสดงรหัสผ่านใน Detail Modal
   - มีปุ่ม Copy เพื่อคัดลอกรหัสผ่าน
   - **สำหรับ User ที่ไม่มี temporary_password**: แสดงข้อความ "ไม่มีข้อมูล" พร้อมปุ่มรีเซ็ตรหัสผ่านเพื่อสร้าง temporary_password ใหม่
   - **Admin สามารถดูรหัสผ่านของทุกคนได้ตลอดเวลา** (ไม่ถูกลบเมื่อ login สำเร็จ)
   - รหัสผ่านจะถูกอัพเดทอัตโนมัติเมื่อ Admin แก้ไขหรือรีเซ็ตรหัสผ่าน
4. **Password Persistence**: 
   - `temporary_password` จะไม่ถูกลบเมื่อ user login สำเร็จ (เพื่อให้ Admin สามารถควบคุมได้ทุกอย่าง)
   - `temporary_password` จะถูกอัพเดทอัตโนมัติเมื่อ Admin แก้ไขหรือรีเซ็ตรหัสผ่าน
   - สำหรับ User ที่มีอยู่แล้วและไม่มี `temporary_password` สามารถรีเซ็ตรหัสผ่านเพื่อสร้าง `temporary_password` ใหม่ได้
5. **Soft Delete**: การลบ User Account จะทำ Soft Delete เท่านั้น ข้อมูลยังคงอยู่ในฐานข้อมูล
6. **Employee Linking**: เมื่อเชื่อม User กับ Employee ระบบจะอัพเดท `employee.user_id` อัตโนมัติ
7. **Self-Protection**: ไม่สามารถลบ account ของตัวเองได้ (ป้องกันทั้ง Frontend และ Backend)

---

## 🚀 Usage Example

### **สร้าง User Account**:
1. Login เป็น Admin
2. ไปที่หน้า "จัดการ User Accounts" (`/users`)
3. คลิก "สร้าง User Account"
4. กรอกข้อมูล:
   - Username: `john.doe`
   - Email: `john.doe@example.com`
   - Password: `SecurePassword123`
   - รหัสพนักงาน: เลือก `AC00010 - John Doe` (optional)
   - ชื่อเล่น: `จอห์น` (optional)
   - ชื่อเต็ม: `John Doe`
   - Role: `data_entry`
   - Status: `active`
5. คลิก "สร้าง"
6. ระบบจะสร้าง User Account และเชื่อมกับ Employee (ถ้าเลือก)

### **แก้ไข User Account**:
1. คลิก "แก้ไข" ในแถวของ User ที่ต้องการแก้ไข
2. แก้ไขข้อมูลที่ต้องการ (password เป็น optional)
3. คลิก "บันทึก"

### **รีเซ็ตรหัสผ่าน**:
1. คลิกปุ่ม "รีเซ็ตรหัสผ่าน" (ไอคอนกุญแจ) ในแถวของ User ที่ต้องการรีเซ็ตรหัสผ่าน
2. กรอกรหัสผ่านใหม่ (ต้องกรอก 2 ครั้งเพื่อยืนยัน)
3. คลิก "รีเซ็ตรหัสผ่าน"
4. ระบบจะแสดงรหัสผ่านใหม่ใน Modal (แสดงครั้งเดียว)
5. คลิกปุ่ม Copy เพื่อคัดลอกรหัสผ่าน หรือบันทึกไว้

### **ลบ User Account**:
1. คลิก "ลบ" ในแถวของ User ที่ต้องการลบ
2. ยืนยันการลบใน Modal
3. ระบบจะทำ Soft Delete และลบ `user_id` จาก Employee

---

### 6. **เปลี่ยนรหัสผ่าน (Change Password) - สำหรับพนักงาน**
- ✅ พนักงานสามารถเปลี่ยนรหัสผ่านของตัวเองได้
- ✅ ต้องกรอกรหัสผ่านปัจจุบันเพื่อยืนยัน
- ✅ ตั้งรหัสผ่านใหม่ (ต้องยืนยันรหัสผ่าน)
- ✅ Validation: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
- ✅ **อัพเดท temporary_password อัตโนมัติ** เพื่อให้ Admin ยังคงเห็นรหัสผ่านได้
- ✅ **สร้าง Notification อัตโนมัติ** เพื่อแจ้งเตือน Admin ว่ามีการเปลี่ยนรหัสผ่าน

### 7. **ระบบแจ้งเตือน (Notification System)**
- ✅ แสดงการแจ้งเตือนใน Header (ปุ่ม "แจ้งเตือน")
- ✅ Badge แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
- ✅ Dropdown/Menu แสดงรายการการแจ้งเตือน
- ✅ แจ้งเตือนเมื่อมีการเปลี่ยนรหัสผ่าน
- ✅ Admin สามารถดู, อ่าน, และลบการแจ้งเตือนได้

---

---

## 🔔 Notification System Architecture (รองรับการพัฒนาต่อในอนาคต)

### Database Schema

#### `notifications` Table
- **รองรับหลายประเภทการแจ้งเตือน**: User Management, Leave/WFH, Work Assignment, Client, Tax, Document, System
- **Priority System**: low, medium, high, urgent
- **Category System**: จัดกลุ่มการแจ้งเตือนตามหมวดหมู่
- **Action Support**: รองรับ action_url และ action_label สำหรับไปยังหน้าที่เกี่ยวข้อง
- **Metadata Support**: JSON field สำหรับเก็บข้อมูลเพิ่มเติม
- **Expiration Support**: รองรับการตั้งวันหมดอายุของการแจ้งเตือน
- **Related Entity Support**: รองรับการเชื่อมโยงกับ entity อื่นๆ (leave_request, work_assignment, client, etc.)

#### `notification_preferences` Table
- **User Preferences**: แต่ละ user สามารถตั้งค่าการแจ้งเตือนได้
- **Email Support**: รองรับการส่งอีเมลแจ้งเตือนในอนาคต
- **Push Notification Support**: รองรับการส่ง push notification ในอนาคต

### Future Extensibility

#### Supported Notification Types:
1. **User Management**: password_change, user_created, user_updated, user_deleted
2. **Leave & WFH**: leave_request_created, leave_request_approved, leave_request_rejected, leave_request_cancelled, wfh_request_created, wfh_request_approved, wfh_request_rejected, wfh_request_cancelled
3. **Work Assignment**: work_assignment_created, work_assignment_updated, work_assignment_deleted
4. **Client Management**: client_created, client_updated, client_deleted, client_import_completed
5. **Tax & Document**: tax_data_updated, tax_filing_due, document_entry_completed, document_entry_pending
6. **System**: system, reminder, alert, info

#### Future Features:
- ✅ Email Notifications
- ✅ Push Notifications
- ✅ Notification Preferences per User
- ✅ Notification Templates
- ✅ Notification Scheduling
- ✅ Notification Groups/Channels

---

**Last Updated**: 2026-01-31 (Updated: Added Change Password & Notification System with Future Extensibility)  
**Status**: ✅ Complete  
**Maintainer**: Cursor AI
