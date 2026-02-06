# 🔌 Employee API Design - Complete Documentation

## 📋 Overview

เอกสารนี้อธิบายการออกแบบ API สำหรับระบบ Employee Management ตาม requirements ที่ระบุไว้

## 🎯 Design Principles

1. **Performance First**: Pagination, lazy loading, selective fields
2. **Role-based Access**: HR/Admin vs Employee
3. **Security**: Input validation, data encryption
4. **Scalability**: Efficient queries, caching

## 📅 Date Format Handling

### Important: Date Fields Format

**All date fields (`birth_date`, `hire_date`, `probation_end_date`, `resignation_date`) are returned as `YYYY-MM-DD` strings, NOT Date objects.**

**Implementation Details**:
- Backend uses `DATE_FORMAT(date_field, '%Y-%m-%d')` in SQL queries to ensure dates are formatted as strings directly from MySQL
- This avoids timezone conversion issues when mysql2 library converts MySQL DATE type to JavaScript Date objects
- Frontend receives date strings in `YYYY-MM-DD` format and formats them for display using direct string parsing

**Example**:
```json
{
  "hire_date": "2022-10-03",  // String, not Date object
  "birth_date": "2001-12-05"  // String, not Date object
}
```

**Why This Approach**:
- Prevents timezone offset issues (e.g., `2022-10-03` becoming `2022-10-02T17:00:00.000Z`)
- Ensures consistent date display across all browsers and timezones
- Frontend can parse date strings directly without creating Date objects

## 🔐 Access Control

### Role Permissions

| Role | Permissions |
|------|-------------|
| **HR** | Full access (CRUD, Import, Analytics) |
| **Admin** | Full access (CRUD, Import, Analytics) |
| **Employee** | View own data only |
| **Other Roles** | View own data only |

## 📡 API Endpoints

### Base URL
```
/api/employees
```

### 1. Get Employee List (Paginated)

**Endpoint**: `GET /api/employees`

**Description**: ดึงรายชื่อพนักงาน (paginated, lazy loading)

**Access**: HR, Admin (all employees) | Employee (own data only)

**Query Parameters**:
```typescript
{
  page?: number          // Page number (default: 1)
  limit?: number        // Items per page (default: 20, max: 10000 for "all")
  search?: string       // Search by name, employee_id
  position?: string     // Filter by position
  status?: 'active' | 'resigned' | 'all'  // Filter by status (undefined or 'all' = no filter)
  includeDeleted?: 'true' | 'false'  // Include soft-deleted records (Admin only, default: 'false')
  sortBy?: string       // Sort field (default: 'hire_date')
  sortOrder?: 'asc' | 'desc'  // Sort order (default: 'desc')
  fields?: string[]     // Select specific fields (optional)
}
```

**Response** (HR/Admin):
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "uuid",
        "employee_id": "AC00010",
        "full_name": "ยุทธนา (เอ็ม)",
        "position": "ผู้จัดการ",
        "status": "active",
        "hire_date": "2024-01-15",
        "profile_image": "/images/employees/AC00010.jpg"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Response** (Employee):
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "uuid",
        "employee_id": "AC00010",
        "full_name": "ยุทธนา (เอ็ม)",
        "position": "ผู้จัดการ",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Performance**: 
- Uses pagination (LIMIT/OFFSET)
- Only loads essential fields by default
- Uses indexes for filtering/sorting
- **Date fields**: Uses `DATE_FORMAT()` in SQL to return dates as `YYYY-MM-DD` strings

---

### 2. Get All Positions

**Endpoint**: `GET /api/employees/positions`

**Description**: ดึงรายการตำแหน่งทั้งหมด (unique positions) สำหรับใช้ใน filter dropdown

**Access**: All authenticated users

**Response**:
```json
{
  "success": true,
  "data": [
    "ผู้จัดการ",
    "พนักงานขาย",
    "นักพัฒนา",
    "นักบัญชี"
  ]
}
```

**Implementation Notes**:
- Returns distinct positions from `employees` table
- Filters out `NULL` and empty string values
- Only includes positions from non-deleted employees (`deleted_at IS NULL`)
- Sorted alphabetically (ASC)
- **Important**: This route must be defined BEFORE the `/:id` route in Express to avoid route conflicts (Express matches routes in order)

**Use Case**: Used to populate the position filter dropdown in the Employee Management page frontend.

---

### 3. Get Employee Detail

**Endpoint**: `GET /api/employees/:id`

**Description**: ดึงข้อมูลพนักงานรายละเอียด

**Access**: HR, Admin (any employee) | Employee (own data only)

**Implementation Note**:
- Uses `DATE_FORMAT(date_field, '%Y-%m-%d')` in SQL query for all date fields
- Returns date fields as `YYYY-MM-DD` strings (not Date objects)
- This ensures consistent date format and avoids timezone conversion issues

**Response** (HR/Admin):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "AC00010",
    "user_id": "user-uuid",
    "position": "ผู้จัดการ",
    "id_card": "1234567890123",
    "gender": "male",
    "first_name": "ยุทธนา",
    "last_name": "(เอ็ม)",
    "full_name": "ยุทธนา (เอ็ม)",
    "english_name": "Yuttana",
    "nick_name": "เอ็ม",
    "birth_date": "1990-01-15",
    "phone": "0812345678",
    "personal_email": "personal@email.com",
    "company_email": "yuttana@bmu.local",
    "hire_date": "2024-01-15",
    "probation_end_date": "2024-04-15",
    "resignation_date": null,
    "status": "active",
    "address_full": "123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร 10110",
    "village": null,
    "building": "อาคาร ABC",
    "room_number": "101",
    "floor_number": "5",
    "house_number": "123",
    "soi_alley": "ซอยสุขุมวิท 1",
    "moo": null,
    "road": "ถนนสุขุมวิท",
    "sub_district": "แขวงคลองตัน",
    "district": "เขตคลองตัน",
    "province": "กรุงเทพมหานคร",
    "postal_code": "10110",
    "profile_image": "/images/employees/AC00010.jpg",
    "working_days": 365,
    "leave_statistics": {
      "total_leave_days": 10,
      "used_leave_days": 5,
      "remaining_leave_days": 5
    },
    "wfh_statistics": {
      "total_wfh_days": 20,
      "used_wfh_days": 10
    },
    "created_at": "2024-01-15T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

**Response** (Employee - Own Data):
```json
{
  "success": true,
  "data": {
    // Same as above (all fields visible to employee)
  }
}
```

**Performance**:
- Loads all fields (detail view)
- Calculates `working_days` on-the-fly
- Joins with leave_requests for statistics
- **Date fields**: Uses `DATE_FORMAT()` in SQL to return dates as `YYYY-MM-DD` strings

---

### 4. Create Employee

**Endpoint**: `POST /api/employees`

**Description**: เพิ่มพนักงานใหม่

**Access**: HR, Admin only

**Request Body**:
```json
{
  "employee_id": "AC00011",
  "position": "นักบัญชี",
  "id_card": "1234567890123",
  "gender": "female",
  "first_name": "สมหญิง",
  "last_name": "ใจดี",
  "english_name": "Somying",
  "nick_name": "หญิง",
  "birth_date": "1995-05-20",
  "phone": "0812345679",
  "personal_email": "somying@email.com",
  "company_email": "somying@bmu.local",
  "company_email_password": "password123",
  "hire_date": "2024-01-20",
  "probation_end_date": "2024-04-20",
  "status": "active",
  "address_full": "...",
  // ... address fields
  "profile_image": null
}
```

**Response**:
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": "uuid",
    "employee_id": "AC00011",
    "full_name": "สมหญิง ใจดี"
  }
}
```

**Validation**:
- `employee_id` - Unique, required
- `id_card` - 13 digits, unique, required
- `first_name`, `last_name` - Required
- `hire_date` - Required, valid date
- `company_email` - Unique, email format

---

### 5. Update Employee

**Endpoint**: `PUT /api/employees/:id`

**Description**: แก้ไขข้อมูลพนักงาน

**Access**: HR, Admin (any employee) | Employee (own data only, limited fields)

**Request Body**: (Same as Create, all fields optional)

**Response**:
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": "uuid",
    "employee_id": "AC00011",
    "full_name": "สมหญิง ใจดี"
  }
}
```

**Note**: Employee can only update:
- `phone`
- `personal_email`
- `address_full` and address fields
- `profile_image`

---

### 5. Delete Employee (Soft Delete)

**Endpoint**: `DELETE /api/employees/:id`

**Description**: ลบพนักงาน (soft delete)

**Access**: HR, Admin only

**Response**:
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

**Note**: Sets `deleted_at` timestamp, doesn't actually delete

---

### 5.5. Delete All Employees (Hard Delete)

**Endpoint**: `DELETE /api/employees/reset/all`

**Description**: ลบข้อมูลพนักงานทั้งหมด (hard delete) - สำหรับ reset ข้อมูลทั้งหมดก่อนนำเข้าใหม่

**Access**: Admin only

**⚠️ WARNING**: This will permanently delete ALL employee records from the database!

**Response**:
```json
{
  "success": true,
  "message": "ลบข้อมูลพนักงานทั้งหมด 52 รายการเรียบร้อยแล้ว",
  "deleted_count": 52
}
```

**Use Case**: 
- Reset all employee data before re-importing from Excel
- Useful when fixing data import issues (e.g., date format problems)

**Note**: This is a hard delete - records are permanently removed, not soft-deleted

**Alternative Method - Using npm Script**:
You can also use the npm script to reset all employees:
```bash
npm run reset-employees
```

This script provides:
- Interactive confirmation (requires typing "YES" and "CONFIRM")
- Shows statistics before deletion
- Handles foreign key references (sets `user_id` to NULL)
- Resets AUTO_INCREMENT counter
- More detailed output and safety checks

**Script Location**: `backend/scripts/reset-employees.js`

---

### 6. Import Employees from Excel

**Endpoint**: `POST /api/employees/import`

**Description**: นำเข้าข้อมูลพนักงานจาก Excel

**Access**: HR, Admin only

**Request**: `multipart/form-data`
```
file: <Excel file>
```

**Response**:
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "total": 100,
    "success": 95,
    "failed": 5,
    "errors": [
      {
        "row": 10,
        "employee_id": "AC00020",
        "error": "Duplicate employee_id"
      }
    ]
  }
}
```

**Process**:
1. Validate Excel format
2. Parse Excel data
3. Validate each row
4. Bulk insert (transaction)
5. Return results

---

### 7. Get Employee Statistics

**Endpoint**: `GET /api/employees/statistics`

**Description**: สถิติพนักงาน (สำหรับ Dashboard)

**Access**: HR, Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "total_active": 150,
    "total_resigned": 20,
    "by_position": [
      {
        "position": "นักบัญชี",
        "count": 30
      },
      {
        "position": "ผู้จัดการ",
        "count": 10
      }
    ],
    "hire_trend_6months": [
      {
        "month": "2024-07",
        "hired": 5,
        "resigned": 2
      },
      {
        "month": "2024-08",
        "hired": 8,
        "resigned": 1
      }
    ],
    "probation_reviews_next_90days": [
      {
        "id": "uuid",
        "employee_id": "AC00010",
        "full_name": "ยุทธนา (เอ็ม)",
        "position": "ผู้จัดการ",
        "hire_date": "2024-01-15",
        "probation_end_date": "2024-04-15",
        "days_until_review": 15
      }
    ]
  }
}
```

**Performance**:
- Cached for 5 minutes
- Uses aggregated queries
- Pre-calculated statistics

---

### 8. Get Employee Working Days

**Endpoint**: `GET /api/employees/:id/working-days`

**Description**: คำนวณวันทำงาน (ตั้งแต่วันเริ่มงานถึงปัจจุบัน)

**Access**: HR, Admin (any employee) | Employee (own data only)

**Response**:
```json
{
  "success": true,
  "data": {
    "employee_id": "uuid",
    "hire_date": "2022-10-03",
    "working_days": 1185,
    "working_years": 3,
    "working_months": 3,
    "working_days_remaining": 27,
    "calculation_date": "2026-01-30"
  }
}
```

**Response Fields**:
- `employee_id`: Employee UUID (from URL parameter)
- `hire_date`: Hire date from database (YYYY-MM-DD string)
- `working_days`: Total calendar days worked (including start date)
- `working_years`: Years worked
- `working_months`: Remaining months worked (after years)
- `working_days_remaining`: Remaining days worked (after years and months)
- `calculation_date`: Date used for calculation (YYYY-MM-DD string)

**Calculation**:
- Uses calendar days (includes all days, not excluding weekends)
- Calculates years, months, and remaining days based on actual calendar dates
- If `resignation_date` exists, uses it as end date; otherwise uses current date
- Handles date parsing to avoid timezone issues

---

### 9. Get Employee Leave/WFH Statistics

**Endpoint**: `GET /api/employees/:id/statistics`

**Description**: สถิติวันลาและ WFH

**Access**: HR, Admin (any employee) | Employee (own data only)

**Response**:
```json
{
  "success": true,
  "data": {
    "employee_id": "AC00010",
    "leave_statistics": {
      "total_leave_days": 10,
      "used_leave_days": 5,
      "remaining_leave_days": 5,
      "pending_leave_days": 2
    },
    "wfh_statistics": {
      "total_wfh_days": 20,
      "used_wfh_days": 10,
      "remaining_wfh_days": 10
    },
    "year": 2024
  }
}
```

---

## 🔒 Security Features

### 1. Input Validation
- All inputs validated using `express-validator`
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize inputs)

### 2. Data Encryption
- `company_email_password` - Encrypted before storage
- `id_card` - Encrypted (PDPA compliance)

### 3. Rate Limiting
- Import endpoint: 10 requests per hour
- Other endpoints: Standard rate limiting

## 📊 Performance Optimization

### 1. Pagination
- Default: 20 items per page
- Max: 10000 items per page (supports "all" option for frontend)
- Uses `LIMIT` and `OFFSET`
- When `limit > 1000`, automatically uses 10000 to support "all" option

### 2. Field Selection
- List view: Only essential fields
- Detail view: All fields
- Use `fields` query parameter for custom selection

### 3. Caching
- Statistics: 5 minutes cache
- Employee list: 1 minute cache
- Employee detail: 2 minutes cache

### 4. Database Optimization
- Uses indexes for filtering/sorting
- Composite indexes for common queries
- Avoids N+1 queries
- **Date Format**: Uses `DATE_FORMAT()` in SQL queries to return dates as strings, avoiding timezone conversion issues

## 🧪 Example API Calls

### Get Employee List (Page 1)
```bash
GET /api/employees?page=1&limit=20&status=active&sortBy=hire_date&sortOrder=desc
```

### Search Employees
```bash
GET /api/employees?search=ยุทธนา&page=1&limit=20
```

### Get Employee Detail
```bash
GET /api/employees/uuid-here
```

### Import Excel
```bash
POST /api/employees/import
Content-Type: multipart/form-data

file: <excel-file.xlsx>
```

---

**Last Updated**: 2026-01-29  
**Status**: ✅ API Design Complete  
**Date Format Fix**: ✅ Fixed - All date fields use `DATE_FORMAT()` in SQL to return `YYYY-MM-DD` strings (verified 2026-01-29)
