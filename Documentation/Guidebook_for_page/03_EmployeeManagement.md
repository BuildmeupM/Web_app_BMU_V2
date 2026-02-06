# 👥 03. Employee Management Page

## 📋 Overview

หน้าจัดการข้อมูลพนักงาน - ระบบจัดการข้อมูลพนักงานครบถ้วนตาม requirements

**Route**: `/employees`  
**Component**: `src/pages/EmployeeManagement.tsx`

**Reference**: `Documentation/Database/MyDatabase/employee.md`

## 🔐 Access Control

### Role Permissions

| Role | Permissions |
|------|-------------|
| **HR** | ✅ Full access (CRUD, Import, Analytics) |
| **Admin** | ✅ Full access (CRUD, Import, Analytics) |
| **Employee** | ✅ View own data only, Edit own data (limited fields) |
| **Other Roles** | ✅ View own data only |

### Access Rules

- **HR/Admin**: มองเห็นข้อมูลพนักงานทุกคน สามารถเปิดดูของใครก็ได้
- **Employee**: มองเห็นเฉพาะข้อมูลส่วนตัวของตัวเองเท่านั้น

## ✨ Features

### 1. Employee List View

#### HR/Admin View
- ✅ แสดงรายชื่อพนักงานทั้งหมด
- ✅ Search และ Filter (ชื่อ, รหัสพนักงาน, ตำแหน่ง, สถานะ)
  - **ค่าเริ่มต้น**: สถานะ = "ทำงานอยู่" (active)
  - **ค่าเริ่มต้น**: เรียงข้อมูลตามตำแหน่งงาน (position) แบบ A-Z (ascending)
- ✅ Sortable Columns
- ✅ Pagination (20 items per page, max 100)
- ✅ Actions: View, Edit, Delete
- ✅ Delete Confirmation Modal - แสดง popup ยืนยันก่อนลบข้อมูล (แสดงชื่อพนักงาน, รหัสพนักงาน, และคำเตือน)

#### Employee View
- ✅ **แสดงข้อมูลของตัวเองโดยตรง**: เมื่อเปิดหน้าข้อมูลพนักงาน จะแสดงข้อมูลของตัวเองทันที (ไม่แสดงรายการ)
- ✅ **ซ่อน Search & Filter**: แถบค้นหาและกรองข้อมูลจะไม่แสดงสำหรับพนักงานที่ไม่ใช่ HR/Admin
- ✅ **ซ่อน Tabs (แถบเลือกหัวข้อ)**: แถบ Tabs ("รายชื่อพนักงาน" และ "Dashboard") จะไม่แสดงสำหรับพนักงานที่ไม่ใช่ HR/Admin
- ✅ **ไม่แสดงปุ่ม "กลับไปรายชื่อ"**: เนื่องจากแสดงข้อมูลของตัวเองโดยตรง ไม่มีรายการให้กลับไป
- ✅ **View own data only**: มองเห็นเฉพาะข้อมูลส่วนตัวของตัวเองเท่านั้น

### 2. Employee Detail View

#### โครงสร้างการแสดงผล

**Card 1: Header Section** (มีขอบสีส้ม)
- รูปภาพพนักงาน (`profile_image`)
- ชื่อ - นามสกุล (`full_name`) พร้อมชื่อเล่น (`nick_name`)
- สถานะงาน (`status`)
- รหัสพนักงาน (`employee_id`)
- ปุ่มแก้ไขข้อมูล (HR/Admin: any employee | Employee: own data only)

**Card 2: ข้อมูลส่วนตัว** (รวมข้อมูลส่วนตัว, การติดต่อ, และที่อยู่ - มีขอบสีส้ม)
- **ข้อมูลส่วนตัวพื้นฐาน**:
  - รหัสบัตรประชาชน (`id_card`) - Masked display (XXX-XXX-XXXX-XXX)
  - เพศ (`gender`)
  - วันเกิด (`birth_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - ชื่อเล่น (`nick_name`)
  - ชื่อภาษาอังกฤษ (`english_name`)
- **ข้อมูลการติดต่อ**:
  - เบอร์โทร (`phone`)
  - อีเมลส่วนตัว (`personal_email`)
  - อีเมลบริษัท (`company_email`)
- **ที่อยู่**:
  - ที่อยู่รวม (`address_full`) - แสดงเฉพาะที่อยู่รวมเท่านั้น (ไม่แสดงรายละเอียดแยกฟิลด์)

**Card 3: ข้อมูลการทำงาน** (มีขอบสีส้ม)
- **ข้อมูลการทำงาน**:
  - ตำแหน่ง (`position`)
  - วันเริ่มงาน (`hire_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - วันผ่านงาน (`probation_end_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - วันสิ้นสุด (`resignation_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - ทำงานมาแล้ว - Calculated (X ปี Y เดือน Z วัน)
- **สถิติการทำงาน** (ถ้ามี):
  - ข้อมูลสถิติวันลา - From API (`/api/employees/:id/statistics`)
  - ข้อมูลสถิติวัน WFH - From API (`/api/employees/:id/statistics`)

#### Additional Display
- ✅ Alert แสดงสถานะข้อมูลครบถ้วน/ไม่ครบถ้วน
- ✅ Edit button (HR/Admin: any employee | Employee: own data only)

### 3. Add Employee Form

**Access**: HR, Admin only

**Features**:
- ✅ Form สำหรับเพิ่มพนักงานใหม่
- ✅ Validation (React Hook Form + Zod)
- ✅ Image upload
- ✅ Address fields (collapsible section)
- ✅ All 33 fields from Excel

**Required Fields**:
- รหัสพนักงาน (`employee_id`)
- ตำแหน่ง (`position`)
- รหัสบัตรประชาชน (`id_card`)
- เพศ (`gender`)
- ชื่อจริง (`first_name`)
- นามสกุล (`last_name`)
- วันเริ่มงาน (`hire_date`)
- สถานะงาน (`status`)

### 4. Edit Employee Form

**Access**: 
- HR/Admin: Edit any employee (all fields)
- Employee: Edit own data only (limited fields)

**Editable Fields (Employee)**:
- เบอร์โทร (`phone`)
- อีเมลส่วนตัว (`personal_email`)
- ที่อยู่ (`address_full` + address fields)
- รูปภาพ (`profile_image`)

### 5. Excel Import

**Access**: HR, Admin only

**Features**:
- ✅ Upload Excel file (.xlsx, .xls)
- ✅ Preview imported data (first 10 rows)
- ✅ Validation errors display
- ✅ Import progress
- ✅ Import results (success/failed count, errors)

**Process**:
1. Upload Excel file (max 10MB)
2. Validate Excel format
3. Preview data
4. Import (batch processing, transaction)
5. Show results

### 6. Dashboard/Analytics

**Access**: HR, Admin only

**Features**:

#### 6.1 Summary Cards
- ✅ พนักงานทำงานอยู่ (total_active)
- ✅ พนักงานลาออก (total_resigned)
- ✅ รวมทั้งหมด
- ✅ **Text Alignment**: หัวข้อและข้อมูลทั้งหมดอยู่ตรงกึ่งกลาง (textAlign: 'center') เพื่อความสวยงาม

#### 6.1.1 Gender Summary Section (2 Column Layout)
- ✅ **Layout**: ใช้ Grid 2 คอลัมน์
  - **คอลัมน์ซ้าย (4 columns)**: แสดง Gender Summary Cards เรียงแนวตั้ง
  - **คอลัมน์ขวา (8 columns)**: แสดง Pie Chart "สรุปข้อมูลเพศของพนักงาน"
- ✅ **Gender Summary Cards** (คอลัมน์ซ้าย):
  - **เพศชาย**: สีฟ้า (#4facfe), แสดงจำนวนและเปอร์เซ็นต์, border-left สีฟ้า
    - มีไอคอน TbGenderMale ขนาด 80px ด้านล่าง Card พร้อม drop-shadow
    - หัวข้อและข้อมูลอยู่ตรงกึ่งกลาง (textAlign: 'center')
  - **เพศหญิง**: สีชมพู (#ff6b9d), แสดงจำนวนและเปอร์เซ็นต์, border-left สีชมพู
    - มีไอคอน TbGenderFemale ขนาด 80px ด้านล่าง Card พร้อม drop-shadow
    - หัวข้อและข้อมูลอยู่ตรงกึ่งกลาง (textAlign: 'center')
  - **อื่นๆ**: สีม่วง (#9c27b0), แสดงจำนวนและเปอร์เซ็นต์, border-left สีม่วง (แสดงเฉพาะเมื่อมีข้อมูล)
    - มีไอคอน TbUser ขนาด 64px ด้านล่าง Card
    - หัวข้อและข้อมูลอยู่ตรงกึ่งกลาง (textAlign: 'center')
  - **แสดงเปอร์เซ็นต์**: คำนวณจากจำนวนพนักงานที่ทำงานอยู่ทั้งหมด
  - **ไอคอน**: ใช้ Tabler Icons (react-icons/tb) สำหรับแสดงไอคอนการ์ตูนผู้ชายและผู้หญิง
  - **Text Alignment**: ใช้ Stack component พร้อม align="center" และ textAlign: 'center' เพื่อให้หัวข้อและข้อมูลอยู่ตรงกึ่งกลาง
  - **Responsive**: บน mobile (base) แสดงเต็มความกว้าง, บน tablet/desktop (md) แสดง 2 คอลัมน์
- ✅ **Gender Distribution Pie Chart** (คอลัมน์ขวา):
  - **Title**: "สรุปข้อมูลเพศของพนักงาน" อยู่ตรงกึ่งกลาง (textAlign: 'center')
  - **Pie Chart** จาก `recharts` สำหรับแสดงสัดส่วนเพศ
  - **สีสำหรับแต่ละเพศ**:
    - เพศชาย: สีฟ้า (#4facfe)
    - เพศหญิง: สีชมพู (#ff6b9d)
    - อื่นๆ: สีม่วง (#9c27b0)
  - **Label**: แสดงชื่อเพศและเปอร์เซ็นต์บน Pie Chart
  - **Tooltip**: แสดงชื่อเพศ, จำนวนคน, และสัดส่วนเปอร์เซ็นต์
  - **Legend**: แสดงชื่อเพศพร้อมจำนวนคน
  - **Responsive**: ปรับขนาดตามหน้าจอ

#### 6.3 6 Months Trend Chart
- ✅ **ComposedChart** จาก `recharts` (กราฟแท่ง + กราฟเส้นรวมกัน)
- ✅ กราฟแท่ง (Bar Chart): พนักงานเข้าทำงานแต่ละเดือน (สีเขียว - green.6)
- ✅ กราฟเส้น (Line Chart): พนักงานลาออกแต่ละเดือน (สีแดง - red.6)
- ✅ ระยะเวลา: 6 เดือนที่ผ่านมาถึงปัจจุบัน
- ✅ **เรียงข้อมูลตามเดือน**: ข้อมูลจะเรียงตามเดือน (YYYY-MM) ก่อนแสดง
- ✅ **รูปแบบเดือน**: แสดงเป็นรูปแบบไทย (เช่น "ส.ค. 2568")
- ✅ Features: แสดงกริด, Legend, Tooltip, Responsive design
- ✅ **Click Functionality**: คลิกที่กราฟแท่งหรือกราฟเส้นเพื่อเปิด Modal แสดงรายละเอียดพนักงานที่เข้าทำงานหรือลาออกในเดือนนั้น
  - Modal มีขนาด **90% ของหน้าจอ** (ความกว้างสูงสุด 1400px, ความสูงสูงสุด 90vh)
  - ScrollArea มีความสูง **650px** เพื่อแสดงข้อมูลได้มากขึ้น
  - แสดงข้อมูลในรูปแบบ Tabs: "เข้าทำงาน" และ "ลาออก"
  - ตารางมี border, spacing, และ typography ที่ปรับปรุงแล้ว
  - Badge สีเขียวสำหรับวันที่เริ่มทำงาน, Badge สีแดงสำหรับวันที่สิ้นสุด
  - **Badge ขนาดใหญ่**: ใช้ `size="lg"` พร้อม `fontSize: '16px'` และ `padding: '8px 12px'` เพื่อให้วันที่อ่านง่ายและเด่นชัด
  - **ชื่อ-นามสกุลและชื่อเล่นแสดงในบรรทัดเดียวกัน**: "ชื่อ-นามสกุล (ชื่อเล่น)" เพื่อประหยัดพื้นที่และอ่านง่ายขึ้น
  - **ขนาดตัวอักษร**: `fontSize="md"` เพื่อให้อ่านง่ายขึ้น

#### 6.4 Probation Reviews (Next 90 Days)
- ✅ รายชื่อพนักงานที่ต้องประเมินการผ่านทดลองงาน
- ✅ อิงข้อมูลจาก `probation_end_date`
- ✅ แสดง: รหัสพนักงาน, ชื่อ-นามสกุล, ตำแหน่ง, วันเริ่มงาน, วันผ่านงาน, จำนวนวันจนถึงวันประเมิน

#### 6.5 Employees by Position
- ✅ สรุปจำนวนพนักงานตามตำแหน่ง
- ✅ **Bar Chart** จาก `recharts` สำหรับแสดงจำนวนพนักงานตามตำแหน่ง
- ✅ **แสดงจำนวนด้านบนของกราฟแท่ง**: Label แสดงจำนวนคนด้านบนของแต่ละแท่ง (เช่น "6 คน")
- ✅ **สีสลับกัน**: ใช้สีสลับกันสำหรับแต่ละแท่ง (ส้ม, ฟ้า, เขียว, เหลือง, ม่วง, แดง, ฟ้าอ่อน)
- ✅ **X-Axis**: แสดงชื่อตำแหน่ง (มุม -45 องศา เพื่อให้อ่านง่าย)
- ✅ **Y-Axis**: แสดงจำนวนคน
- ✅ **Tooltip**: แสดงชื่อตำแหน่งและจำนวนคนเมื่อ hover
- ✅ **Title**: อยู่ตรงกึ่งกลาง (textAlign: 'center')
- ✅ **เรียงตามจำนวน**: ข้อมูลเรียงตามจำนวน (มาก→น้อย) จาก Backend
- ✅ **Responsive**: ปรับขนาดตามหน้าจอ

## 🎨 UI/UX Guidelines

### Layout - Employee List View

```
┌─────────────────────────────────────────┐
│  Title: ข้อมูลพนักงาน                    │
├─────────────────────────────────────────┤
│  [เพิ่มพนักงาน] [นำเข้าจาก Excel] [ส่งออก] │  ← HR/Admin only
├─────────────────────────────────────────┤
│  [Search Bar]                           │
│  [Filter: Position] [Filter: Status]    │
├─────────────────────────────────────────┤
│  Employee List Table                    │
│  ┌───────────────────────────────────┐ │
│  │ รหัส | ชื่อ | ตำแหน่ง | สถานะ | ... │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [Pagination]                           │
└─────────────────────────────────────────┘
```

### Layout - Employee Detail View

```
┌─────────────────────────────────────────┐
│  [Alert: ข้อมูลครบถ้วน/ไม่ครบถ้วน]        │
├─────────────────────────────────────────┤
│  Card: Header Section (ขอบสีส้ม)         │
│  ┌──────────┐  ┌─────────────────────┐ │
│  │ [Avatar] │  │ ชื่อ-นามสกุล (ชื่อเล่น) │ │
│  │          │  │ สถานะ | รหัสพนักงาน    │ │
│  │ [Edit]   │  └─────────────────────┘ │
│  └──────────┘                           │
├─────────────────────────────────────────┤
│  Card: ข้อมูลส่วนตัว (ขอบสีส้ม)            │
│  ┌─────────────────────────────────────┐ │
│  │ ข้อมูลส่วนตัวพื้นฐาน                  │ │
│  │ - รหัสบัตรประชาชน                    │ │
│  │ - เพศ                                │ │
│  │ - วันเกิด                            │ │
│  │ - ชื่อเล่น                            │ │
│  │ - ชื่อภาษาอังกฤษ                      │ │
│  │                                      │ │
│  │ ข้อมูลการติดต่อ                       │ │
│  │ - เบอร์โทร                           │ │
│  │ - อีเมลส่วนตัว                        │ │
│  │ - อีเมลบริษัท                         │ │
│  │                                      │ │
│  │ ที่อยู่                               │ │
│  │ - ที่อยู่รวม (แสดงเฉพาะที่อยู่รวมเท่านั้น) │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Card: ข้อมูลการทำงาน (ขอบสีส้ม)          │
│  ┌─────────────────────────────────────┐ │
│  │ ข้อมูลการทำงาน                       │ │
│  │ - ตำแหน่ง                            │ │
│  │ - วันเริ่มงาน                        │ │
│  │ - วันผ่านงาน                         │ │
│  │ - วันสิ้นสุด                          │ │
│  │ - ทำงานมาแล้ว (X ปี Y เดือน Z วัน)   │ │
│  │                                      │ │
│  │ ─────────────────────────────────── │ │
│  │ สถิติการทำงาน (ถ้ามี)                │ │
│  │ วันลา: X / Y วัน                    │ │
│  │ WFH: X / Y วัน                      │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Note**: 
- Card ทั้งหมดในหน้า Employee Detail มีขอบสีส้ม (#ff6b35) เพื่อความสอดคล้องกัน
- ข้อมูลส่วนตัว, ข้อมูลการติดต่อ, และที่อยู่ ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลส่วนตัว" (มีขอบสีส้ม #ff6b35)
- ที่อยู่แสดงเฉพาะที่อยู่รวม (`address_full`) เท่านั้น ไม่แสดงรายละเอียดแยกฟิลด์ (หมู่บ้าน, เลขที่, ซอย/ตรอก, แขวง/ตำบล, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์) เพราะมีที่อยู่รวมแสดงอยู่แล้ว
- ข้อมูลการทำงานและสถิติการทำงาน ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลการทำงาน" (มีขอบสีส้ม #ff6b35)

### Components

- **Table**: Mantine Table component
- **Search**: Mantine TextInput with search icon
- **Filter**: Mantine Select components
- **Pagination**: Mantine Pagination component
- **Modal**: Mantine Modal for forms
  - Employee Details Modal: ขนาด 90% ของหน้าจอ (maxWidth: 1400px, maxHeight: 90vh)
  - ScrollArea height: 650px สำหรับแสดงข้อมูลพนักงาน
- **Charts**: `recharts` (ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer)
  - **Dependencies**: ต้องติดตั้ง `@mantine/charts` และ `recharts`
  - **Styles**: ต้อง import `@mantine/charts/styles.css` ใน `main.tsx`

### Colors

- Primary: Orange (#ff6b35)
- Success: Green (#4caf50)
- Warning: Yellow (#ff9800)
- Error: Red (#f44336)

## 📊 Data Structure

### Employee Interface

```typescript
interface Employee {
  // Basic Information
  id: string
  employee_id: string
  user_id?: string | null
  position: string
  
  // Personal Information
  id_card: string
  gender: 'male' | 'female' | 'other'
  first_name: string
  last_name: string
  full_name: string  // Auto-generated
  english_name?: string | null
  nick_name?: string | null
  birth_date?: string | null
  
  // Contact Information
  phone?: string | null
  personal_email?: string | null
  company_email?: string | null
  company_email_password?: string | null
  
  // Employment Information
  hire_date: string
  probation_end_date?: string | null
  resignation_date?: string | null
  status: 'active' | 'resigned'
  
  // Address Information
  address_full?: string | null
  village?: string | null
  building?: string | null
  room_number?: string | null
  floor_number?: string | null
  house_number?: string | null
  soi_alley?: string | null
  moo?: string | null
  road?: string | null
  sub_district?: string | null
  district?: string | null
  province?: string | null
  postal_code?: string | null
  
  // Media
  profile_image?: string | null
  
  // Calculated Fields
  working_days?: number
  leave_statistics?: {
    total_leave_days: number
    used_leave_days: number
    remaining_leave_days: number
  }
  wfh_statistics?: {
    total_wfh_days: number
    used_wfh_days: number
    remaining_wfh_days: number
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  deleted_at?: string | null
}
```

## 🔌 API Endpoints

### Core Endpoints

- `GET /api/employees` - Get employee list (paginated)
  - Query: `page`, `limit`, `search`, `position`, `status`, `sortBy`, `sortOrder`
  - **ค่าเริ่มต้น**: `status = 'active'`, `sortBy = 'position'`, `sortOrder = 'asc'`
  - Response: `{ employees: [], pagination: {} }`

- `GET /api/employees/:id` - Get employee detail
  - Response: `{ employee: {} }`

- `POST /api/employees` - Create employee (HR/Admin only)
  - Body: Employee data
  - Response: `{ employee: {} }`

- `PUT /api/employees/:id` - Update employee
  - Body: Employee data (partial)
  - Response: `{ employee: {} }`

- `DELETE /api/employees/:id` - Delete employee (HR/Admin only)
  - Response: `{ success: true }`

### Special Endpoints

- `POST /api/employees/import` - Import from Excel (HR/Admin only)
  - Body: `multipart/form-data` (file)
  - Response: `{ total, success, failed, errors: [] }`

- `GET /api/employees/statistics` - Get statistics (HR/Admin only)
  - Response: `{ total_active, total_resigned, by_position: [], hire_trend_6months: [], probation_reviews_next_90days: [] }`

- `GET /api/employees/:id/working-days` - Calculate working days
  - Response: `{ working_days, working_years, working_months }`

- `GET /api/employees/:id/statistics` - Get leave/WFH statistics
  - Response: `{ leave_statistics: {}, wfh_statistics: {} }`

**ดูรายละเอียดเพิ่มเติม**: `Documentation/API/EMPLOYEE_API_DESIGN.md`

## 🧩 Components

### Main Components

- `EmployeeList.tsx` - Employee list table
- `EmployeeCard.tsx` - Employee card (for grid view, optional)
- `EmployeeDetail.tsx` - Employee detail view
- `EmployeeForm.tsx` - Add/Edit form
- `EmployeeImport.tsx` - Excel import component
- `EmployeeDashboard.tsx` - Analytics dashboard

### Shared Components

- `DataTable.tsx` - Reusable table component
- `SearchBar.tsx` - Search component
- `FilterSection.tsx` - Filter component
- `Pagination.tsx` - Pagination component
- `ExportButton.tsx` - Export component

**ดูรายละเอียดเพิ่มเติม**: `Documentation/Frontend/EMPLOYEE_FRONTEND_DESIGN.md`

## 🔄 User Flow

### HR/Admin Flow

1. **View Employee List**
   - เปิดหน้า `/employees`
   - เห็นรายชื่อพนักงานทั้งหมด
   - Search/Filter/Sort

2. **View Employee Detail**
   - คลิกที่ row ใน table
   - เห็นข้อมูลพนักงานครบถ้วน (13 fields + รูปภาพ)
   - เห็นสถิติวันลา/WFH
   - เห็นวันทำงาน

3. **Add Employee**
   - คลิก "เพิ่มพนักงาน"
   - กรอกข้อมูลใน form
   - Upload รูปภาพ (optional)
   - Submit

4. **Edit Employee**
   - คลิก "Edit" ใน table หรือ detail view
   - แก้ไขข้อมูล
   - Submit

5. **Delete Employee**
   - คลิกปุ่ม "Delete" (ไอคอนถังขยะ) ใน table
   - ระบบจะแสดง confirmation modal:
     - แสดงชื่อพนักงานและรหัสพนักงาน
     - แสดงคำเตือนว่าเป็นการลบแบบ Soft Delete
     - ปุ่ม "ยกเลิก" และ "ลบข้อมูล"
   - คลิก "ลบข้อมูล" เพื่อยืนยันการลบ
   - คลิก "ยกเลิก" เพื่อยกเลิกการลบ

6. **Import Excel**
   - คลิก "นำเข้าจาก Excel"
   - Upload Excel file
   - Preview data
   - Import

7. **View Dashboard**
   - คลิก "Dashboard" tab
   - เห็นสรุปจำนวนพนักงาน
   - เห็นกราฟ 6 เดือน
   - เห็นรายชื่อพนักงานที่ต้องประเมิน
   - เห็นสรุปจำนวนพนักงานตามตำแหน่ง

### Employee Flow

1. **View Own Data**
   - เปิดหน้า `/employees`
   - เห็นเฉพาะข้อมูลของตัวเอง

2. **Edit Own Data**
   - คลิก "Edit"
   - แก้ไขได้เฉพาะ: เบอร์โทร, อีเมลส่วนตัว, ที่อยู่, รูปภาพ
   - Submit

## ✅ Validation Rules

### Required Fields
- `employee_id` - Required, Unique, Max 20 chars
- `position` - Required
- `id_card` - Required, 13 digits, Unique
- `gender` - Required, Enum
- `first_name` - Required, Max 100 chars
- `last_name` - Required, Max 100 chars
- `hire_date` - Required, Valid date
- `status` - Required, Enum

### Format Validation
- `id_card` - 13 digits only
- `phone` - Phone format
- `personal_email` - Email format
- `company_email` - Email format, Unique
- `postal_code` - 5 digits

### Business Rules
- `probation_end_date` - Must be after `hire_date`
- `resignation_date` - Must be after `hire_date`
- `status` = 'resigned' → `resignation_date` required

## 🚨 Error Handling

### API Errors
- 400: Validation error → Show validation messages
- 401: Unauthorized → Redirect to login
- 403: Forbidden → Show "Access Denied" message
- 404: Not found → Show "Employee not found"
- 500: Server error → Show generic error message

### Form Errors
- Show inline validation errors
- Highlight invalid fields
- Show error summary at top

## 📚 Related Documentation

- `Documentation/Database/MyDatabase/employee.md` - Requirements
- `Documentation/Database/EMPLOYEE_DATABASE_DESIGN.md` - Database Design
- `Documentation/Database/EMPLOYEE_COLUMN_MAPPING.md` - Column Mapping
- `Documentation/API/EMPLOYEE_API_DESIGN.md` - API Design
- `Documentation/Frontend/EMPLOYEE_FRONTEND_DESIGN.md` - Frontend Design
- `Documentation/EMPLOYEE_SYSTEM_COMPLETE.md` - Complete Overview

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Complete Requirements Coverage  
**UI Updates**: 
- 2026-01-29 - Card ทั้งหมดในหน้า Employee Detail มีขอบสีส้ม (#ff6b35) เพื่อความสอดคล้องกัน
- 2026-01-29 - ข้อมูลส่วนตัว, ข้อมูลการติดต่อ, และที่อยู่ ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลส่วนตัว" (มีขอบสีส้ม #ff6b35)
- 2026-01-29 - ข้อมูลการทำงานและสถิติการทำงาน ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลการทำงาน" (มีขอบสีส้ม #ff6b35)
- 2026-01-29 - เพิ่ม Delete Confirmation Modal สำหรับยืนยันการลบข้อมูลพนักงาน (แสดงชื่อพนักงาน, รหัสพนักงาน, และคำเตือน Soft Delete)
- 2026-01-29 - เปลี่ยนค่าเริ่มต้นของ Status Filter เป็น "ทำงานอยู่" (active) - แสดงเฉพาะพนักงานที่ทำงานอยู่เป็นค่าเริ่มต้น
- 2026-01-29 - เปลี่ยนค่าเริ่มต้นของการเรียงข้อมูลเป็นเรียงตามตำแหน่งงาน (position) แบบ A-Z (ascending) - ข้อมูลจะเรียงตามตำแหน่งงานตั้งแต่เปิดหน้า
- 2026-01-29 - เพิ่ม ComposedChart สำหรับแสดงสถิติการเข้าทำงาน/ลาออก (6 เดือน) - กราฟแท่ง (สีเขียว) สำหรับเข้าทำงาน + กราฟเส้น (สีแดง) สำหรับลาออก, เรียงข้อมูลตามเดือน, แสดงเดือนเป็นรูปแบบไทย, คลิกที่กราฟเพื่อดูรายละเอียดพนักงาน
- 2026-01-29 - ปรับขนาด Employee Details Modal ให้ใหญ่ขึ้น (90% ของหน้าจอ, maxWidth 1400px, maxHeight 90vh) และเพิ่ม ScrollArea height เป็น 650px
- 2026-01-29 - ปรับปรุงการแสดงผล Badge และตารางใน Employee Details Modal (Badge variant="filled", เพิ่ม border และ spacing ในตาราง, ปรับ typography)
- 2026-01-29 - ปรับปรุงการแสดงผลชื่อ-นามสกุลและชื่อเล่นให้อยู่ในบรรทัดเดียวกัน ("ชื่อ-นามสกุล (ชื่อเล่น)") และเพิ่มขนาดตัวอักษรจาก "sm" เป็น "md"
- 2026-01-29 - ปรับขนาด Badge วันที่ในตาราง Employee Dashboard Modal (hired และ resigned tabs) ให้ใหญ่ขึ้น: เปลี่ยนจาก `size="md"` เป็น `size="lg"` พร้อม `fontSize: '16px'` และ `padding: '8px 12px'` เพื่อให้วันที่อ่านง่ายและเด่นชัดขึ้น
- 2026-01-29 - เพิ่มสรุปข้อมูลเพศใน Dashboard:
  - เพิ่ม Gender Summary Cards (3 cards: เพศชาย, เพศหญิง, อื่นๆ) พร้อมแสดงจำนวนและเปอร์เซ็นต์
  - เพิ่ม Pie Chart สำหรับแสดงสัดส่วนเพศของพนักงาน
  - เพิ่ม API endpoint `/api/employees/statistics` เพื่อดึงข้อมูล `by_gender`
  - อัปเดต EmployeeStatistics interface เพื่อรวม `by_gender` field
  - ปรับ Layout เป็น 2 คอลัมน์: คอลัมน์ซ้ายแสดง Gender Cards (แนวตั้ง), คอลัมน์ขวาแสดง Pie Chart
  - เพิ่มไอคอนการ์ตูนใน Gender Summary Cards:
    - เพิ่ม TbGenderMale icon (ขนาด 80px) ด้านล่าง Card เพศชาย พร้อม drop-shadow
    - เพิ่ม TbGenderFemale icon (ขนาด 80px) ด้านล่าง Card เพศหญิง พร้อม drop-shadow
  - เพิ่ม TbUser icon (ขนาด 64px) ด้านล่าง Card อื่นๆ (เมื่อมีข้อมูล)
  - ใช้ Tabler Icons จาก react-icons/tb เพื่อให้ดูสวยงามและเป็นการ์ตูนมากขึ้น
- 2026-01-29 - ปรับ Text Alignment ให้อยู่ตรงกึ่งกลาง:
  - Summary Cards (พนักงานทำงานอยู่, พนักงานลาออก, รวมทั้งหมด): เพิ่ม textAlign: 'center' ให้กับ Text และ Title
  - Gender Summary Cards (เพศชาย, เพศหญิง, อื่นๆ): เปลี่ยนจาก Group เป็น Stack พร้อม align="center" และเพิ่ม textAlign: 'center'
  - Pie Chart Card Title: เพิ่ม textAlign: 'center' เพื่อให้หัวข้ออยู่ตรงกึ่งกลาง
- 2026-01-29 - ปรับปรุง Employee View สำหรับพนักงานที่ไม่ใช่ HR/Admin:
  - แสดงข้อมูลของตัวเองโดยตรงเมื่อเปิดหน้าข้อมูลพนักงาน (ไม่แสดงรายการ)
  - ซ่อน Search & Filter bars สำหรับพนักงานที่ไม่ใช่ HR/Admin
  - **ซ่อน Tabs (แถบเลือกหัวข้อ)**: แถบ Tabs ("รายชื่อพนักงาน" และ "Dashboard") จะไม่แสดงสำหรับพนักงานที่ไม่ใช่ HR/Admin
  - ไม่แสดงปุ่ม "กลับไปรายชื่อ" สำหรับพนักงาน (เนื่องจากแสดงข้อมูลของตัวเองโดยตรง)
  - ใช้ ownEmployee จาก employeesData.employees[0] เพื่อแสดงข้อมูลของตัวเอง
- 2026-01-29 - ปรับปรุงส่วน "จำนวนพนักงานตามตำแหน่ง":
  - เปลี่ยนจาก Table เป็น Bar Chart จาก recharts
  - เพิ่ม Label แสดงจำนวนคนด้านบนของกราฟแท่ง (เช่น "6 คน")
  - ใช้สีสลับกันสำหรับแต่ละแท่ง (ส้ม, ฟ้า, เขียว, เหลือง, ม่วง, แดง, ฟ้าอ่อน)
  - X-Axis แสดงชื่อตำแหน่ง (มุม -45 องศา), Y-Axis แสดงจำนวนคน
  - เพิ่ม Tooltip สำหรับแสดงรายละเอียดเมื่อ hover
  - Title อยู่ตรงกึ่งกลาง (textAlign: 'center')
