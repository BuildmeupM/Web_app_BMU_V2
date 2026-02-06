# 🔌 Leave & WFH API Documentation

## 📋 Overview

API Documentation สำหรับระบบลางานและ Work from Home (WFH)

**Base URL**: `/api`

**Authentication**: Required (Bearer Token)

**Last Updated**: 2026-01-29

---

## 🔐 Authentication

ทุก API endpoint ต้องใช้ Bearer Token ใน Authorization header:

```
Authorization: Bearer <token>
```

---

## 📅 Leave Requests API

### 1. GET /api/leave-requests

ดึงรายการการลาทั้งหมด

**Access**: All (own data) / HR/Admin (all)

**Query Parameters**:
- `page` (number, optional): หน้าปัจจุบัน (default: 1)
- `limit` (number, optional): จำนวนรายการต่อหน้า (default: 20, max: 100)
- `status` (string, optional): กรองตามสถานะ (`รออนุมัติ`, `อนุมัติแล้ว`, `ไม่อนุมัติ`)
- `leave_type` (string, optional): กรองตามประเภทการลา (`ลาป่วย`, `ลากิจ`, `ลาพักร้อน`, `ลาไม่รับค่าจ้าง`, `ลาอื่นๆ`)
- `start_date` (string, optional): วันที่เริ่มต้น (YYYY-MM-DD)
- `end_date` (string, optional): วันที่สิ้นสุด (YYYY-MM-DD)
- `search` (string, optional): ค้นหาตามชื่อพนักงานหรือรหัสพนักงาน
- `employee_id` (string, optional): กรองตามรหัสพนักงาน (สำหรับ Employee: auto-fill)

**Response**:
```json
{
  "success": true,
  "data": {
    "leave_requests": [
      {
        "id": "uuid",
        "employee_id": "AC00010",
        "request_date": "2026-01-29",
        "leave_start_date": "2026-02-01",
        "leave_end_date": "2026-02-03",
        "leave_type": "ลากิจ",
        "leave_days": 3,
        "reason": "ไปธุระส่วนตัว",
        "status": "รออนุมัติ",
        "approved_by": null,
        "approved_at": null,
        "approver_note": null,
        "created_at": "2026-01-29T10:00:00Z",
        "updated_at": "2026-01-29T10:00:00Z",
        "employee": {
          "employee_id": "AC00010",
          "full_name": "สมชาย ใจดี",
          "position": "บัญชี"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**Performance Notes**:
- ใช้ pagination เพื่อลดภาระการทำงานของระบบ
- ใช้ indexes สำหรับการค้นหาและกรองข้อมูล
- สำหรับ Employee: ดึงเฉพาะข้อมูลของตัวเอง (ไม่ต้อง paginate ถ้ามีไม่มาก)

---

### 2. GET /api/leave-requests/pending

ดึงการลาที่รออนุมัติ

**Access**: HR/Admin only

**Query Parameters**:
- `page` (number, optional): หน้าปัจจุบัน (default: 1)
- `limit` (number, optional): จำนวนรายการต่อหน้า (default: 20)

**Response**: Same as GET /api/leave-requests (filtered by status = 'รออนุมัติ')

**Performance Notes**:
- ใช้ index `idx_leave_requests_status` เพื่อเพิ่มประสิทธิภาพ
- จำกัดจำนวนรายการที่ดึงมา (default: 20)

---

### 3. GET /api/leave-requests/:id

ดึงข้อมูลการลาตาม ID

**Access**: All (own data) / HR/Admin (all)

**Response**:
```json
{
  "success": true,
  "data": {
    "leave_request": {
      "id": "uuid",
      "employee_id": "AC00010",
      "request_date": "2026-01-29",
      "leave_start_date": "2026-02-01",
      "leave_end_date": "2026-02-03",
      "leave_type": "ลากิจ",
      "leave_days": 3,
      "reason": "ไปธุระส่วนตัว",
      "status": "อนุมัติแล้ว",
      "approved_by": "user-uuid",
      "approved_at": "2026-01-29T14:00:00Z",
      "approver_note": null,
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T14:00:00Z",
      "employee": {
        "employee_id": "AC00010",
        "full_name": "สมชาย ใจดี",
        "position": "บัญชี"
      },
      "approver": {
        "id": "user-uuid",
        "name": "ผู้ดูแลระบบ"
      }
    }
  }
}
```

---

### 4. GET /api/leave-requests/dashboard

ดึงข้อมูล Dashboard การลา

**Access**: All (own data) / HR/Admin (all)

**Query Parameters**:
- `employee_id` (string, optional): รหัสพนักงาน (สำหรับ Employee: auto-fill)
- `year` (number, optional): ปีที่ต้องการดู (default: ปีปัจจุบัน)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_leave_days": 10,
      "used_leave_days": 5,
      "remaining_leave_days": 5,
      "pending_leave_days": 2
    },
    "by_type": {
      "ลาป่วย": 2,
      "ลากิจ": 2,
      "ลาพักร้อน": 1,
      "ลาไม่รับค่าจ้าง": 0,
      "ลาอื่นๆ": 0
    },
    "upcoming_leaves": [
      {
        "id": "uuid",
        "employee_id": "AC00010",
        "employee_name": "สมชาย ใจดี",
        "leave_start_date": "2026-02-01",
        "leave_end_date": "2026-02-03",
        "leave_type": "ลากิจ",
        "leave_days": 3
      }
    ]
  }
}
```

**Performance Notes**:
- ใช้ aggregation queries เพื่อลดจำนวน queries
- Cache ผลลัพธ์สำหรับ 5 นาที (ถ้าเป็นไปได้)

---

### 5. POST /api/leave-requests

สร้างการขอลาใหม่

**Access**: All

**Request Body**:
```json
{
  "leave_start_date": "2026-02-01",
  "leave_end_date": "2026-02-03",
  "leave_type": "ลากิจ",
  "reason": "ไปธุระส่วนตัว"
}
```

**Validation**:
- `leave_start_date` และ `leave_end_date` ต้องเป็นวันที่ในอนาคต
- `leave_end_date` ต้องมากกว่าหรือเท่ากับ `leave_start_date`
- `leave_type` ต้องเป็นค่าที่ถูกต้อง
- ถ้า `leave_type` เป็น "ลากิจ" หรือ "ลาอื่นๆ" ต้องกรอก `reason`

**Response**:
```json
{
  "success": true,
  "data": {
    "leave_request": {
      "id": "uuid",
      "employee_id": "AC00010",
      "request_date": "2026-01-29",
      "leave_start_date": "2026-02-01",
      "leave_end_date": "2026-02-03",
      "leave_type": "ลากิจ",
      "leave_days": 3,
      "reason": "ไปธุระส่วนตัว",
      "status": "รออนุมัติ",
      "created_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

**Business Logic**:
- `request_date` = วันนี้ (auto-fill)
- `leave_days` = คำนวณอัตโนมัติจาก `leave_start_date` ถึง `leave_end_date`
- `employee_id` = ดึงจาก token (current user)

---

### 6. PUT /api/leave-requests/:id/approve

อนุมัติการลา

**Access**: HR/Admin only

**Request Body**:
```json
{
  "approver_note": "อนุมัติ" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "leave_request": {
      "id": "uuid",
      "status": "อนุมัติแล้ว",
      "approved_by": "user-uuid",
      "approved_at": "2026-01-29T14:00:00Z",
      "approver_note": "อนุมัติ"
    }
  }
}
```

**Business Logic**:
- `approved_by` = ดึงจาก token (current user)
- `approved_at` = เวลาปัจจุบัน
- Self-approval: HR/Admin สามารถอนุมัติตัวเองได้

---

### 7. PUT /api/leave-requests/:id/reject

ปฏิเสธการลา

**Access**: HR/Admin only

**Request Body**:
```json
{
  "approver_note": "ปฏิเสธเนื่องจาก..." // required
}
```

**Validation**:
- `approver_note` ต้องกรอก (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "leave_request": {
      "id": "uuid",
      "status": "ไม่อนุมัติ",
      "approved_by": "user-uuid",
      "approved_at": "2026-01-29T14:00:00Z",
      "approver_note": "ปฏิเสธเนื่องจาก..."
    }
  }
}
```

---

## 🏠 WFH Requests API

### 1. GET /api/wfh-requests

ดึงรายการการขอ WFH ทั้งหมด

**Access**: All (own data) / HR/Admin (all)

**Query Parameters**: Same as Leave Requests API

**Response**: Similar to Leave Requests API (with WFH-specific fields)

---

### 2. GET /api/wfh-requests/pending

ดึงการขอ WFH ที่รออนุมัติ

**Access**: HR/Admin only

**Response**: Similar to Leave Requests Pending API

---

### 3. GET /api/wfh-requests/calendar

ดึงข้อมูลสำหรับ Calendar view

**Access**: All

**Query Parameters**:
- `month` (string, required): เดือนที่ต้องการดู (YYYY-MM)
- `year` (number, optional): ปี (default: ปีปัจจุบัน)

**Response**:
```json
{
  "success": true,
  "data": {
    "calendar": [
      {
        "date": "2026-02-01",
        "approved_count": 2,
        "status": "warning", // "available" | "warning" | "full"
        "requests": [
          {
            "id": "uuid",
            "employee_id": "AC00010",
            "employee_name": "สมชาย ใจดี",
            "status": "อนุมัติแล้ว"
          },
          {
            "id": "uuid",
            "employee_id": "IT00003",
            "employee_name": "สมหญิง ใจดี",
            "status": "อนุมัติแล้ว"
          }
        ]
      }
    ],
    "month": "2026-02",
    "limits": {
      "daily_limit": 3,
      "monthly_limit": 6, // หรือ 16 สำหรับ IT
      "used_this_month": 2
    }
  }
}
```

**Performance Notes**:
- ดึงเฉพาะข้อมูลที่จำเป็นสำหรับ Calendar view
- ใช้ aggregation เพื่อนับจำนวนคนที่อนุมัติแล้วในแต่ละวัน
- Cache ผลลัพธ์สำหรับ 1 นาที (เนื่องจากข้อมูลเปลี่ยนแปลงบ่อย)

---

### 4. GET /api/wfh-requests/:id

ดึงข้อมูลการขอ WFH ตาม ID

**Access**: All (own data) / HR/Admin (all)

**Response**: Similar to Leave Request Detail API (with WFH-specific fields)

---

### 5. GET /api/wfh-requests/dashboard

ดึงข้อมูล Dashboard WFH

**Access**: All (own data) / HR/Admin (all)

**Query Parameters**:
- `employee_id` (string, optional): รหัสพนักงาน
- `month` (string, optional): เดือนที่ต้องการดู (YYYY-MM, default: เดือนปัจจุบัน)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "monthly_limit": 6, // หรือ 16 สำหรับ IT
      "used_wfh_days": 2,
      "remaining_wfh_days": 4
    },
    "work_reports": [
      {
        "id": "uuid",
        "wfh_date": "2026-01-15",
        "work_report": "ทำงานที่บ้าน...",
        "work_report_submitted_at": "2026-01-16T09:00:00Z"
      }
    ]
  }
}
```

---

### 6. POST /api/wfh-requests

สร้างการขอ WFH ใหม่

**Access**: All

**Request Body**:
```json
{
  "wfh_date": "2026-02-01"
}
```

**Validation**:
- `wfh_date` ต้องเป็นวันที่ในอนาคต
- ตรวจสอบสิทธิ์: พนักงานต้องทำงานมาแล้วอย่างน้อย 3 เดือน
- ตรวจสอบจำนวน WFH ต่อวัน: ไม่เกิน 3 คนต่อวัน
- ตรวจสอบจำนวน WFH ต่อเดือน: ไม่เกิน 6 วัน (IT: 16 วัน)
- ไม่สามารถขอ WFH ในวันเดียวกันซ้ำได้

**Response**: Similar to Leave Request Create API

**Business Logic**:
- `request_date` = วันนี้ (auto-fill)
- `employee_id` = ดึงจาก token (current user)
- ตรวจสอบสิทธิ์และข้อจำกัดก่อนสร้าง

---

### 7. PUT /api/wfh-requests/:id/approve

อนุมัติการขอ WFH

**Access**: HR/Admin only

**Request Body**: Same as Leave Request Approve API

**Response**: Similar to Leave Request Approve API

---

### 8. PUT /api/wfh-requests/:id/reject

ปฏิเสธการขอ WFH

**Access**: HR/Admin only

**Request Body**: Same as Leave Request Reject API (approver_note required)

**Response**: Similar to Leave Request Reject API

---

### 9. PUT /api/wfh-requests/:id/work-report

ส่งรายงานการทำงาน

**Access**: All (own data only)

**Request Body**:
```json
{
  "work_report": "รายงานการทำงาน..."
}
```

**Validation**:
- `work_report` ต้องกรอก (required)
- การขอ WFH ต้อง `status = 'อนุมัติแล้ว'`
- `wfh_date` ต้องเป็นอดีต (ไม่สามารถรายงานล่วงหน้าได้)

**Response**:
```json
{
  "success": true,
  "data": {
    "wfh_request": {
      "id": "uuid",
      "work_report": "รายงานการทำงาน...",
      "work_report_submitted_at": "2026-01-30T09:00:00Z"
    }
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "leave_start_date": "วันที่ลาไม่สามารถเป็นอดีตได้",
    "leave_type": "ประเภทการลาต้องกรอก"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Forbidden - You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Leave request not found"
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "Cannot request WFH - Daily limit reached (3/3)"
}
```

### 422 Unprocessable Entity

```json
{
  "success": false,
  "message": "Cannot request WFH - Employee must work at least 3 months"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📊 Performance Optimization

### 1. Pagination
- ใช้ pagination สำหรับรายการที่ยาว
- Default limit: 20 รายการต่อหน้า
- Max limit: 100 รายการต่อหน้า

### 2. Indexes
- ใช้ indexes สำหรับการค้นหาและกรองข้อมูล
- `idx_leave_requests_employee_id` - สำหรับค้นหาตามพนักงาน
- `idx_leave_requests_status` - สำหรับกรองตามสถานะ
- `idx_leave_requests_dates` - สำหรับค้นหาตามช่วงวันที่
- `idx_wfh_requests_wfh_date` - สำหรับ Calendar view

### 3. Caching
- Cache Dashboard data สำหรับ 5 นาที
- Cache Calendar data สำหรับ 1 นาที

### 4. Query Optimization
- ใช้ JOIN แทน multiple queries
- ใช้ aggregation สำหรับ Dashboard
- จำกัดข้อมูลที่ดึงมาเฉพาะที่จำเป็น

---

## 📝 Notes

- **Self-approval**: HR/Admin สามารถอนุมัติตัวเองได้
- **Date Format**: ใช้ YYYY-MM-DD สำหรับวันที่
- **DateTime Format**: ใช้ ISO 8601 สำหรับ datetime
- **Time Zone**: ใช้ timezone ของ server (Asia/Bangkok)

---

**Last Updated**: 2026-01-30  
**Status**: ✅ Implementation Complete - Ready for Testing

---

## 🚀 Implementation Status

### Backend Implementation
- ✅ `backend/routes/leave-requests.js` - สร้างเสร็จแล้ว
- ✅ `backend/routes/wfh-requests.js` - สร้างเสร็จแล้ว
- ✅ `backend/utils/leaveHelpers.js` - สร้างเสร็จแล้ว
- ✅ `backend/server.js` - อัพเดทแล้ว (เพิ่ม routes)

### Frontend Implementation
- ✅ `src/services/leaveService.ts` - สร้างเสร็จแล้ว
- ✅ `src/pages/LeaveManagement.tsx` - พัฒนาเสร็จแล้ว
- ✅ `src/components/Leave/*` - สร้าง components ครบถ้วนแล้ว

### Database Migration
- ✅ `Documentation/Database/migrations/007_create_leave_requests_table.sql` - สร้างเสร็จแล้ว
- ✅ `Documentation/Database/migrations/008_create_wfh_requests_table.sql` - สร้างเสร็จแล้ว

**หมายเหตุ**: ต้องรัน Migration Scripts เพื่อสร้างตารางในฐานข้อมูลก่อนใช้งาน
