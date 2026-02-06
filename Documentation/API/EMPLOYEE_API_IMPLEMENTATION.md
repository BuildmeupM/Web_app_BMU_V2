# 🔌 Employee API Implementation - Complete Documentation

## 📋 Overview

เอกสารนี้อธิบายการ implement Backend API สำหรับระบบ Employee Management

## ✅ API Endpoints ที่สร้างแล้ว

### 1. GET /api/employees ✅
**Description**: ดึงรายชื่อพนักงาน (paginated)

**File**: `backend/routes/employees.js`

**Features**:
- ✅ Pagination (default: 20 items/page, max: 100)
- ✅ Search (ชื่อ, รหัสพนักงาน)
- ✅ Filter (ตำแหน่ง, สถานะ)
- ✅ Sort (hire_date, full_name, employee_id, position, status)
- ✅ Role-based access (Admin: all | Employee: own data only)
- ✅ SQL injection prevention (parameterized queries)

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 10000 for "all" option)
- `search` - Search term
- `position` - Filter by position
- `status` - Filter by status (active/resigned/all, undefined = no filter)
- `includeDeleted` - Include soft-deleted records (Admin only, default: 'false')
- `sortBy` - Sort field
- `sortOrder` - Sort order (asc/desc)

**Response**:
```json
{
  "success": true,
  "data": {
    "employees": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### 2. GET /api/employees/positions ✅
**Description**: ดึงรายการตำแหน่งทั้งหมด (unique positions)

**File**: `backend/routes/employees.js`

**Access**: All authenticated users

**Features**:
- ✅ Returns distinct positions from employees table
- ✅ Filters out NULL and empty values
- ✅ Only includes non-deleted employees
- ✅ Sorted alphabetically
- ✅ Route must be defined BEFORE `/:id` route to avoid conflicts

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

**Note**: This endpoint is used to populate the position filter dropdown in the Employee Management page.

---

### 3. GET /api/employees/:id ✅
**Description**: ดึงข้อมูลพนักงานรายละเอียด

**File**: `backend/routes/employees.js`

**Features**:
- ✅ Role-based access
- ✅ Calculate working days
- ✅ Include leave/WFH statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "AC00010",
    "full_name": "ยุทธนา (เอ็ม)",
    // ... all fields
    "working_days": 365,
    "leave_statistics": {...},
    "wfh_statistics": {...}
  }
}
```

---

### 3. POST /api/employees ✅
**Description**: เพิ่มพนักงานใหม่

**File**: `backend/routes/employees.js`

**Access**: Admin only

**Features**:
- ✅ Input validation (express-validator)
- ✅ Duplicate check (employee_id, id_card)
- ✅ All 33 fields support

**Request Body**: See `CreateEmployeeDto` interface

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

---

### 4. PUT /api/employees/:id ✅
**Description**: แก้ไขข้อมูลพนักงาน

**File**: `backend/routes/employees.js`

**Access**: Admin (all fields) | Employee (limited fields)

**Features**:
- ✅ Role-based field access
- ✅ Partial update support
- ✅ Input validation

**Request Body**: Partial `UpdateEmployeeDto`

**Response**:
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {...}
}
```

---

### 5. DELETE /api/employees/:id ✅
**Description**: ลบพนักงาน (soft delete)

**File**: `backend/routes/employees.js`

**Access**: Admin only

**Features**:
- ✅ Soft delete (sets `deleted_at`)
- ✅ Access control check

**Response**:
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

---

### 6. POST /api/employees/import ✅
**Description**: นำเข้าข้อมูลพนักงานจาก Excel

**File**: `backend/routes/employees-import.js`

**Access**: Admin only

**Features**:
- ✅ Excel file upload (multer)
- ✅ Parse Excel (xlsx library)
- ✅ Batch processing
- ✅ Transaction rollback on error
- ✅ Validation errors reporting

**Request**: `multipart/form-data` (file)

**Response**:
```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "total": 100,
    "success": 95,
    "failed": 5,
    "errors": [...]
  }
}
```

**Dependencies**:
- `multer` - File upload
- `xlsx` - Excel parsing

---

### 7. GET /api/employees/statistics ✅
**Description**: สถิติพนักงาน (สำหรับ Dashboard)

**File**: `backend/routes/employees-statistics.js`

**Access**: Admin only

**Features**:
- ✅ Total active/resigned count
- ✅ Employees by position
- ✅ 6 months hire/resignation trend
- ✅ Probation reviews (next 90 days)

**Response**:
```json
{
  "success": true,
  "data": {
    "total_active": 150,
    "total_resigned": 20,
    "by_position": [...],
    "hire_trend_6months": [...],
    "probation_reviews_next_90days": [...]
  }
}
```

---

### 8. GET /api/employees/:id/working-days ✅
**Description**: คำนวณวันทำงาน

**File**: `backend/routes/employees.js`

**Features**:
- ✅ Calculate working days (excluding weekends)
- ✅ Calculate years and months
- ✅ Role-based access

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

---

### 9. GET /api/employees/:id/statistics ✅
**Description**: สถิติวันลา/WFH

**File**: `backend/routes/employees.js`

**Features**:
- ✅ Leave statistics
- ✅ WFH statistics
- ✅ Role-based access

**Response**:
```json
{
  "success": true,
  "data": {
    "employee_id": "AC00010",
    "leave_statistics": {...},
    "wfh_statistics": {...},
    "year": 2024
  }
}
```

**Note**: Currently returns default values. Should integrate with `leave_requests` table when available.

---

## 🔒 Security Features

### 1. SQL Injection Prevention ✅
- ✅ Parameterized queries (all queries)
- ✅ Input validation (express-validator)
- ✅ Sort field whitelist

### 2. Role-based Access Control ✅
- ✅ Admin: Full access
- ✅ Employee: Own data only
- ✅ Middleware: `authenticateToken`, `authorize`

### 3. Input Validation ✅
- ✅ Required fields check
- ✅ Format validation (email, phone, id_card, postal_code)
- ✅ Data type validation

---

## 📊 Performance Optimization

### 1. Pagination ✅
- Default: 20 items/page
- Max: 10000 items/page (supports "all" option for frontend)
- Uses LIMIT/OFFSET
- When `limit > 1000`, automatically uses 10000 to support "all" option

### 2. Field Selection ✅
- List view: Only essential fields (7 fields)
- Detail view: All fields

### 3. Indexes ✅
- Multiple indexes on employees table
- Composite indexes for common queries

---

## 🛠️ Utility Scripts

### Reset All Employees Script

**Command**: `npm run reset-employees`

**Description**: Interactive script to reset all employee data (hard delete)

**Features**:
- ✅ Interactive confirmation (requires "YES" and "CONFIRM")
- ✅ Shows statistics before deletion
- ✅ Handles foreign key references (sets `user_id` to NULL)
- ✅ Resets AUTO_INCREMENT counter
- ✅ Detailed output and safety checks

**Usage**:
```bash
cd backend
npm run reset-employees
```

**Script File**: `backend/scripts/reset-employees.js`

**When to Use**:
- Before re-importing employee data from Excel
- When fixing data import issues (e.g., date format problems)
- When you need to completely reset employee data

**Safety Features**:
- Requires double confirmation ("YES" then "CONFIRM")
- Shows statistics before deletion
- Clear warning messages

---

## 🧪 Testing

### Test API Endpoints

#### 1. Get Employee List
```bash
curl -X GET "http://localhost:3001/api/employees?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Get Employee Detail
```bash
curl -X GET "http://localhost:3001/api/employees/UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Create Employee
```bash
curl -X POST "http://localhost:3001/api/employees" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "AC00011",
    "position": "นักบัญชี",
    "id_card": "1234567890123",
    "gender": "female",
    "first_name": "สมหญิง",
    "last_name": "ใจดี",
    "hire_date": "2024-01-20",
    "status": "active"
  }'
```

#### 4. Import Excel
```bash
curl -X POST "http://localhost:3001/api/employees/import" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@employees.xlsx"
```

#### 5. Get Statistics
```bash
curl -X GET "http://localhost:3001/api/employees/statistics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Files Created/Modified

### Backend Files

1. **`backend/routes/employees.js`** ✅
   - Core CRUD endpoints
   - Working days calculation
   - Leave/WFH statistics

2. **`backend/routes/employees-statistics.js`** ✅
   - Statistics endpoint
   - Analytics queries

3. **`backend/routes/employees-import.js`** ✅
   - Excel import endpoint
   - File upload handling

4. **`backend/middleware/validation.js`** ✅
   - Input validation middleware
   - express-validator rules

5. **`backend/server.js`** ✅ (Modified)
   - Added employee routes

6. **`backend/package.json`** ✅ (Modified)
   - Added dependencies: `express-validator`, `multer`, `xlsx`
   - Added script: `reset-employees` → `node scripts/reset-employees.js`

7. **`backend/scripts/reset-employees.js`** ✅ (New)
   - Utility script for resetting all employee data
   - Interactive confirmation
   - Handles foreign keys and AUTO_INCREMENT

### Frontend Files

1. **`src/services/employeeService.ts`** ✅
   - Complete service layer
   - All API methods

2. **`src/components/Employee/EmployeeList.tsx`** ✅
   - Employee list table component

3. **`src/components/Employee/EmployeeDetail.tsx`** ✅
   - Employee detail view component

4. **`src/components/Employee/EmployeeForm.tsx`** ✅
   - Add/Edit form component

5. **`src/components/Employee/EmployeeImport.tsx`** ✅
   - Excel import component

6. **`src/components/Employee/EmployeeDashboard.tsx`** ✅
   - Dashboard/Analytics component

7. **`src/pages/EmployeeManagement.tsx`** ✅ (Updated)
   - Main page with all features

---

## 🚀 Next Steps

### Backend
- [ ] Test all API endpoints
- [ ] Add error handling improvements
- [ ] Add logging for important operations
- [ ] Integrate with leave_requests table for statistics

### Frontend
- [ ] Test all components
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications
- [ ] Install @mantine/charts for better charts

### Testing
- [ ] Unit tests for API endpoints
- [ ] Integration tests
- [ ] E2E tests

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Backend API Complete, Frontend Components Complete
