# 📋 Employee Column Mapping - Excel to Database

## 📊 Complete Field Mapping

เอกสารนี้แสดงการ map ข้อมูลจาก Excel columns ไปยัง Database columns

## 🗂️ Column Mapping Table

| # | Excel Column (Thai) | Database Column | Type | Required | Description |
|---|---------------------|-----------------|------|----------|-------------|
| 1 | รหัสพนักงาน | `employee_id` | VARCHAR(20) | ✅ Yes | รหัสพนักงาน (เชื่อมกับ users.employee_id) |
| 2 | ตำแหน่ง | `position` | VARCHAR(100) | ✅ Yes | ตำแหน่งการทำงาน |
| 3 | รหัสบัตรประชาชน | `id_card` | VARCHAR(13) | ✅ Yes | รหัสบัตรประชาชน 13 หลัก |
| 4 | เพศ | `gender` | ENUM | ✅ Yes | เพศ (male, female, other) |
| 5 | ชื่อจริง | `first_name` | VARCHAR(100) | ✅ Yes | ชื่อจริง |
| 6 | นามสกุล | `last_name` | VARCHAR(100) | ✅ Yes | นามสกุล |
| 7 | ชื่อ - นามสกุล | `full_name` | VARCHAR(200) | ✅ Auto | Auto-generated จาก first_name + last_name |
| 8 | ชื่อภาษาอังกฤษ | `english_name` | VARCHAR(200) | ❌ No | ชื่อภาษาอังกฤษ |
| 9 | ชื่อเล่น | `nick_name` | VARCHAR(100) | ✅ Yes | ชื่อเล่น (บังคับกรอก) |
| 10 | วันเกิด | `birth_date` | DATE | ❌ No | วันเกิด |
| 11 | เบอร์โทร | `phone` | VARCHAR(20) | ❌ No | เบอร์โทร |
| 12 | Email | `personal_email` | VARCHAR(100) | ❌ No | อีเมลส่วนตัว |
| 13 | Email Build | `company_email` | VARCHAR(100) | ❌ No | อีเมลบริษัท (Unique) |
| 14 | PassWord E-mail Buildme | `company_email_password` | VARCHAR(255) | ❌ No | รหัสผ่านอีเมลบริษัท (ควร encrypt) |
| 15 | วันเริ่มงาน | `hire_date` | DATE | ✅ Yes | วันเริ่มงาน |
| 16 | วันผ่านงาน | `probation_end_date` | DATE | ❌ No | วันผ่านงาน (วันสิ้นสุดทดลองงาน) |
| 17 | วันสิ้นสุด | `resignation_date` | DATE | ❌ No | วันลาออก |
| 18 | สถานะงาน | `status` | ENUM | ✅ Yes | ทำงานอยู่ (active), ลาออก (resigned) |
| 19 | ที่อยู่ | `address_full` | TEXT | ❌ No | ที่อยู่รวม |
| 20 | หมู่บ้าน | `village` | VARCHAR(100) | ❌ No | หมู่บ้าน |
| 21 | อาคาร | `building` | VARCHAR(100) | ❌ No | อาคาร |
| 22 | ห้องเลขที่ | `room_number` | VARCHAR(50) | ❌ No | ห้องเลขที่ |
| 23 | ชั้นที่ | `floor_number` | VARCHAR(50) | ❌ No | ชั้นที่ |
| 24 | เลขที่ | `house_number` | VARCHAR(50) | ❌ No | เลขที่ |
| 25 | ซอย/ตรอก | `soi_alley` | VARCHAR(100) | ❌ No | ซอย/ตรอก |
| 26 | หมู่ที่ | `moo` | VARCHAR(50) | ❌ No | หมู่ที่ |
| 27 | ถนน | `road` | VARCHAR(100) | ❌ No | ถนน |
| 28 | แขวง/ตำบล | `sub_district` | VARCHAR(100) | ❌ No | แขวง/ตำบล |
| 29 | อำเภอ/เขต | `district` | VARCHAR(100) | ❌ No | อำเภอ/เขต |
| 30 | จังหวัด | `province` | VARCHAR(100) | ❌ No | จังหวัด |
| 31 | รหัสไปรษณีย์ | `postal_code` | VARCHAR(10) | ❌ No | รหัสไปรษณีย์ |
| 32 | รูปภาพ | `profile_image` | VARCHAR(500) | ❌ No | Path/URL ของรูปภาพ |

## 📝 Additional Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR(36) | Primary Key (UUID) |
| `user_id` | VARCHAR(36) | Foreign Key to users (optional) |
| `created_at` | TIMESTAMP | เวลาที่สร้าง record |
| `updated_at` | TIMESTAMP | เวลาที่อัพเดตล่าสุด |
| `deleted_at` | TIMESTAMP | เวลาที่ลบ (soft delete) |

## 🔄 Data Transformation Rules

### 1. full_name (Auto-generated)
```sql
full_name = CONCAT(first_name, ' ', last_name)
```
- ไม่ต้องส่งมาจาก Excel
- Database จะ generate อัตโนมัติ
- อัพเดทอัตโนมัติเมื่อแก้ไข first_name หรือ last_name

### 2. status Mapping
| Excel Value | Database Value |
|-------------|----------------|
| ทำงานอยู่ | `active` |
| ลาออก | `resigned` |

### 3. gender Mapping
| Excel Value | Database Value |
|-------------|----------------|
| ชาย | `male` |
| หญิง | `female` |
| อื่นๆ | `other` |

## 📊 Excel Import Process

### Step 1: Validate Excel Format
- ตรวจสอบว่า columns ตรงกับที่กำหนด
- ตรวจสอบ data types

### Step 2: Data Transformation
```javascript
// Example transformation
{
  employee_id: row['รหัสพนักงาน'],
  position: row['ตำแหน่ง'],
  id_card: row['รหัสบัตรประชาชน'].replace(/-/g, ''), // Remove dashes
  gender: mapGender(row['เพศ']),
  first_name: row['ชื่อจริง'],
  last_name: row['นามสกุล'],
  // full_name will be auto-generated
  english_name: row['ชื่อภาษาอังกฤษ'],
  nick_name: row['ชื่อเล่น'],
  birth_date: parseDate(row['วันเกิด']),
  // ... other fields
}
```

### Step 3: Validation
- `employee_id` - Unique, required
- `id_card` - 13 digits, unique, required
- `first_name`, `last_name` - Required
- `hire_date` - Required, valid date
- `company_email` - Unique, email format

### Step 4: Bulk Insert
- ใช้ transaction
- Insert แบบ batch (100-500 records)
- Rollback ถ้าเกิด error

## 🔍 Field Descriptions

### Required Fields (7 fields)
1. **employee_id** - รหัสพนักงาน (เชื่อมกับ users.employee_id)
2. **position** - ตำแหน่งการทำงาน
3. **id_card** - รหัสบัตรประชาชน 13 หลัก
4. **gender** - เพศ
5. **first_name** - ชื่อจริง
6. **last_name** - นามสกุล
7. **nick_name** - ชื่อเล่น (บังคับกรอก)

### Auto-generated Fields (1 field)
- **full_name** - สร้างอัตโนมัติจาก first_name + last_name

### Optional Fields (24 fields)
- Personal info: english_name, nick_name, birth_date
- Contact: phone, personal_email, company_email, company_email_password
- Employment: probation_end_date, resignation_date
- Address: address_full + 13 address fields
- Media: profile_image

## 🎯 Usage Examples

### Excel Row Example
```
รหัสพนักงาน: AC00010
ตำแหน่ง: ผู้จัดการ
รหัสบัตรประชาชน: 1234567890123
เพศ: ชาย
ชื่อจริง: ยุทธนา
นามสกุล: (เอ็ม)
ชื่อ - นามสกุล: ยุทธนา (เอ็ม)  ← จะถูก generate อัตโนมัติ
...
```

### Database Record Example
```json
{
  "id": "uuid-here",
  "employee_id": "AC00010",
  "position": "ผู้จัดการ",
  "id_card": "1234567890123",
  "gender": "male",
  "first_name": "ยุทธนา",
  "last_name": "(เอ็ม)",
  "full_name": "ยุทธนา (เอ็ม)",  // Auto-generated
  "hire_date": "2024-01-15",
  "status": "active"
}
```

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Complete Column Mapping Documentation
