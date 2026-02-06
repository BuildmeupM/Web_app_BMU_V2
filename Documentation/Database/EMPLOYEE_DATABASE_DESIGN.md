# 📊 Employee Database Design - Complete Documentation

## 📋 Overview

เอกสารนี้อธิบายการออกแบบ Database สำหรับระบบ Employee Management ตาม requirements ที่ระบุไว้ใน `Documentation/Database/MyDatabase/employee.md`

## 🗂️ Database Schema: employees Table

### Table Structure

ตาราง `employees` ถูกออกแบบมาเพื่อเก็บข้อมูลพนักงานครบถ้วน 33 fields ตามที่ระบุ

### Column Mapping (จาก Excel → Database)

| Excel Column | Database Column | Type | Description | Required |
|-------------|----------------|------|-------------|----------|
| รหัสพนักงาน | `employee_id` | VARCHAR(20) | รหัสพนักงาน (เชื่อมกับ users.employee_id) | ✅ Yes |
| ตำแหน่ง | `position` | VARCHAR(100) | ตำแหน่งการทำงาน | ✅ Yes |
| รหัสบัตรประชาชน | `id_card` | VARCHAR(13) | รหัสบัตรประชาชน 13 หลัก | ✅ Yes |
| เพศ | `gender` | ENUM | เพศ (male, female, other) | ✅ Yes |
| ชื่อจริง | `first_name` | VARCHAR(100) | ชื่อจริง | ✅ Yes |
| นามสกุล | `last_name` | VARCHAR(100) | นามสกุล | ✅ Yes |
| ชื่อ - นามสกุล | `full_name` | VARCHAR(200) | Auto-generated จาก first_name + last_name | ✅ Auto |
| ชื่อภาษาอังกฤษ | `english_name` | VARCHAR(200) | ชื่อภาษาอังกฤษ | ❌ No |
| ชื่อเล่น | `nick_name` | VARCHAR(100) | ชื่อเล่น | ❌ No |
| วันเกิด | `birth_date` | DATE | วันเกิด | ❌ No |
| เบอร์โทร | `phone` | VARCHAR(20) | เบอร์โทร | ❌ No |
| Email | `personal_email` | VARCHAR(100) | อีเมลส่วนตัว | ❌ No |
| Email Build | `company_email` | VARCHAR(100) | อีเมลบริษัท | ❌ No |
| PassWord E-mail Buildme | `company_email_password` | VARCHAR(255) | รหัสผ่านอีเมลบริษัท (ควร encrypt) | ❌ No |
| วันเริ่มงาน | `hire_date` | DATE | วันเริ่มงาน | ✅ Yes |
| วันผ่านงาน | `probation_end_date` | DATE | วันผ่านงาน (วันสิ้นสุดทดลองงาน) | ❌ No |
| วันสิ้นสุด | `resignation_date` | DATE | วันลาออก | ❌ No |
| สถานะงาน | `status` | ENUM | ทำงานอยู่, ลาออก | ✅ Yes |
| ที่อยู่ | `address_full` | TEXT | ที่อยู่รวม | ❌ No |
| หมู่บ้าน | `village` | VARCHAR(100) | หมู่บ้าน | ❌ No |
| อาคาร | `building` | VARCHAR(100) | อาคาร | ❌ No |
| ห้องเลขที่ | `room_number` | VARCHAR(50) | ห้องเลขที่ | ❌ No |
| ชั้นที่ | `floor_number` | VARCHAR(50) | ชั้นที่ | ❌ No |
| เลขที่ | `house_number` | VARCHAR(50) | เลขที่ | ❌ No |
| ซอย/ตรอก | `soi_alley` | VARCHAR(100) | ซอย/ตรอก | ❌ No |
| หมู่ที่ | `moo` | VARCHAR(50) | หมู่ที่ | ❌ No |
| ถนน | `road` | VARCHAR(100) | ถนน | ❌ No |
| แขวง/ตำบล | `sub_district` | VARCHAR(100) | แขวง/ตำบล | ❌ No |
| อำเภอ/เขต | `district` | VARCHAR(100) | อำเภอ/เขต | ❌ No |
| จังหวัด | `province` | VARCHAR(100) | จังหวัด | ❌ No |
| รหัสไปรษณีย์ | `postal_code` | VARCHAR(10) | รหัสไปรษณีย์ | ❌ No |
| รูปภาพ | `profile_image` | VARCHAR(500) | Path/URL ของรูปภาพ | ❌ No |

### Special Fields

#### 1. `full_name` (GENERATED COLUMN)
- **Type**: VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
- **Description**: Auto-generate จาก `first_name` + `last_name`
- **Benefits**: ไม่ต้องเก็บซ้ำ, อัพเดทอัตโนมัติเมื่อแก้ไขชื่อ

#### 2. `user_id` (Foreign Key)
- **Type**: VARCHAR(36) NULL
- **Description**: เชื่อมกับ `users.id` สำหรับพนักงานที่เข้าสู่ระบบได้
- **Relationship**: One employee can have one user account (optional)

#### 3. `status` (ENUM)
- **Values**: `'active'` (ทำงานอยู่), `'resigned'` (ลาออก)
- **Default**: `'active'`

### Indexes

#### Single Column Indexes
- `idx_employees_employee_id` - สำหรับค้นหาด้วยรหัสพนักงาน
- `idx_employees_user_id` - สำหรับ join กับ users table
- `idx_employees_id_card` - สำหรับค้นหาด้วยรหัสบัตรประชาชน
- `idx_employees_status` - สำหรับ filter ตามสถานะ
- `idx_employees_position` - สำหรับ filter ตามตำแหน่ง
- `idx_employees_hire_date` - สำหรับ sort/filter ตามวันเริ่มงาน
- `idx_employees_probation_end_date` - สำหรับ query พนักงานที่ต้องประเมิน
- `idx_employees_resignation_date` - สำหรับ query พนักงานที่ลาออก
- `idx_employees_full_name` - สำหรับ search ด้วยชื่อ
- `idx_employees_company_email` - สำหรับค้นหาด้วยอีเมลบริษัท

#### Composite Indexes
- `idx_employees_status_hire_date` - สำหรับ query พนักงานที่ทำงานอยู่เรียงตามวันเริ่มงาน
- `idx_employees_status_position` - สำหรับ query พนักงานตามสถานะและตำแหน่ง

### Relationships

```
employees
├── user_id → users.id (One-to-One, Optional)
└── employee_id → users.employee_id (Reference, Not FK)
```

## 🔐 Security Considerations

### 1. Sensitive Data Encryption
- `company_email_password` - **ควร encrypt** ก่อนเก็บใน database
- `id_card` - **ควร encrypt** หรือ hash (ตามกฎหมาย PDPA)

### 2. Data Access Control
- Role-based access (HR/Admin vs Employee)
- Soft delete (`deleted_at`) สำหรับ audit trail

### 3. Data Validation
- `id_card` - ต้องเป็น 13 หลัก, ตัวเลขเท่านั้น
- `employee_id` - Unique constraint
- `company_email` - Unique constraint, email format validation

## 📊 Performance Optimization

### 1. Pagination
- ใช้ `LIMIT` และ `OFFSET` สำหรับ pagination
- ใช้ cursor-based pagination สำหรับ large datasets

### 2. Lazy Loading
- Load เฉพาะ fields ที่จำเป็นใน list view
- Load details เมื่อต้องการ (detail view)

### 3. Caching
- Cache employee list (short TTL)
- Cache statistics (longer TTL)

## 🔄 Data Migration from Excel

### Excel Import Process

1. **Validate Excel Format**
   - ตรวจสอบ columns ว่าตรงกับที่กำหนด
   - ตรวจสอบ data types

2. **Data Transformation**
   - แปลง Excel data → Database format
   - Generate `full_name` automatically
   - Validate required fields

3. **Bulk Insert**
   - ใช้ transaction สำหรับ rollback ถ้าเกิด error
   - Insert แบบ batch (100-500 records per batch)

4. **Post-import Validation**
   - ตรวจสอบ duplicate `employee_id`
   - ตรวจสอบ duplicate `id_card`
   - ตรวจสอบ data integrity

## 📝 Example Queries

### Get Employee List (Paginated)
```sql
SELECT 
  id, employee_id, full_name, position, status, hire_date
FROM employees
WHERE deleted_at IS NULL
  AND status = 'active'
ORDER BY hire_date DESC
LIMIT 20 OFFSET 0;
```

### Get Employee Detail
```sql
SELECT * FROM employees
WHERE id = ? AND deleted_at IS NULL;
```

### Get Employees by Position
```sql
SELECT 
  position, COUNT(*) as count
FROM employees
WHERE deleted_at IS NULL AND status = 'active'
GROUP BY position
ORDER BY count DESC;
```

### Get Employees for Probation Review (Next 90 Days)
```sql
SELECT 
  id, employee_id, full_name, position, hire_date, probation_end_date
FROM employees
WHERE deleted_at IS NULL
  AND status = 'active'
  AND probation_end_date IS NOT NULL
  AND probation_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
ORDER BY probation_end_date ASC;
```

## 🎯 Next Steps

1. ✅ Create migration file (`005_create_employees_table.sql`)
2. ⏳ Create API endpoints
3. ⏳ Create Frontend components
4. ⏳ Implement Excel import
5. ⏳ Implement Dashboard/Analytics

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Database Design Complete
