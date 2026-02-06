# Document Entry Work API Documentation

## Overview

API สำหรับจัดการงานคีย์เอกสาร (Document Sorting Page) - สำหรับคัดแยกข้อมูลเอกสารและส่งข้อมูลเข้าไปยัง `document_entry_work` พร้อมระบบแจ้งเตือนไปยัง `document_entry_responsible`

**Base URL**: `/api/document-entry-work`

**Authentication**: Required (Bearer Token)

---

## Endpoints

### GET /api/document-entry-work

ดึงรายการงานคีย์เอกสาร (paginated, filter)

**Query Parameters**:
- `page` (optional, default: 1) - หน้าที่ต้องการ
- `limit` (optional, default: 20, max: 100) - จำนวนรายการต่อหน้า
- `build` (optional) - Filter by build code
- `year` (optional) - Filter by work year
- `month` (optional) - Filter by work month (1-12)
- `accounting_responsible` (optional) - Filter by accounting responsible employee_id (for คัดแยกเอกสาร page)
- `document_entry_responsible` (optional) - Filter by document entry responsible employee_id (for คีย์เอกสาร page)
  - Logic: ถ้า `current_responsible_employee_id` มีค่า → ใช้ `current_responsible_employee_id` ในการกรอง
  - ถ้า `current_responsible_employee_id` เป็น NULL → ใช้ `responsible_employee_id` ในการกรอง

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "build": "BUILD001",
      "company_name": "Company Name",
      "work_year": 2026,
      "work_month": 1,
      "entry_timestamp": "2026-02-03 10:00:00",
      "submission_count": 1,
      "responsible_employee_id": "EMP001",
      "current_responsible_employee_id": "EMP001",
      "wht_document_count": 10,
      "vat_document_count": 20,
      "non_vat_document_count": 5,
      "submission_comment": "Comment",
      "return_comment": null,
      "created_at": "2026-02-03 10:00:00",
      "updated_at": "2026-02-03 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### GET /api/document-entry-work/:build/:year/:month

ดึงข้อมูลงานคีย์เอกสารตาม Build, Year, Month (รวม bots)

**URL Parameters**:
- `build` - Build code
- `year` - Work year
- `month` - Work month (1-12)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "build": "BUILD001",
    "company_name": "Company Name",
    "work_year": 2026,
    "work_month": 1,
    "entry_timestamp": "2026-02-03 10:00:00",
    "submission_count": 1,
    "responsible_employee_id": "EMP001",
    "current_responsible_employee_id": "EMP001",
    "wht_document_count": 10,
    "vat_document_count": 20,
    "non_vat_document_count": 5,
    "submission_comment": "Comment",
    "return_comment": null,
    "created_at": "2026-02-03 10:00:00",
    "updated_at": "2026-02-03 10:00:00"
  },
  "bots": [
    {
      "id": "uuid",
      "bot_type": "Shopee (Thailand)",
      "document_count": 5,
      "ocr_additional_info": null,
      "created_at": "2026-02-03 10:00:00",
      "updated_at": "2026-02-03 10:00:00"
    }
  ],
  "submission_count": 1
}
```

**Note**: ถ้าไม่มีข้อมูล จะคืนค่า `data: null` และ `bots: []` พร้อม `submission_count` ที่คำนวณจาก database

---

### GET /api/document-entry-work/:id

ดึงข้อมูลงานคีย์เอกสารตาม ID (รวม bots)

**URL Parameters**:
- `id` - Document entry work ID

**Response**: เหมือนกับ `GET /api/document-entry-work/:build/:year/:month`

**Error Response** (404):
```json
{
  "success": false,
  "message": "ไม่พบข้อมูลงานคีย์เอกสาร"
}
```

---

### POST /api/document-entry-work

สร้างงานคีย์เอกสารใหม่ (พร้อม bots และ notification)

**Request Body**:
```json
{
  "build": "BUILD001",
  "work_year": 2026,
  "work_month": 1,
  "responsible_employee_id": "EMP001",
  "wht_document_count": 10,
  "vat_document_count": 20,
  "non_vat_document_count": 5,
  "submission_comment": "Comment",
  "return_comment": null,
  "bots": [
    {
      "bot_type": "Shopee (Thailand)",
      "document_count": 5,
      "ocr_additional_info": null
    },
    {
      "bot_type": "ระบบ OCR",
      "document_count": 10,
      "ocr_additional_info": "Additional info for OCR"
    }
  ]
}
```

**Required Fields**:
- `build` - Build code
- `work_year` - Work year
- `work_month` - Work month (1-12)
- `responsible_employee_id` - Responsible employee ID

**Optional Fields**:
- `wht_document_count` (default: 0)
- `vat_document_count` (default: 0)
- `non_vat_document_count` (default: 0)
- `submission_comment` (default: null)
- `return_comment` (default: null)
- `bots` (default: [])

**Bot Types**:
- `Shopee (Thailand)`
- `SPX Express (Thailand)`
- `Lazada Limited (Head Office)`
- `Lazada Express Limited`
- `ระบบ OCR` (ต้องมี `ocr_additional_info`)

**Response**:
```json
{
  "success": true,
  "message": "สร้างงานคีย์เอกสารสำเร็จ",
  "data": {
    "id": "uuid",
    "build": "BUILD001",
    "company_name": "Company Name",
    "work_year": 2026,
    "work_month": 1,
    "entry_timestamp": "2026-02-03 10:00:00",
    "submission_count": 1,
    "responsible_employee_id": "EMP001",
    "current_responsible_employee_id": "EMP001",
    "wht_document_count": 10,
    "vat_document_count": 20,
    "non_vat_document_count": 5,
    "submission_comment": "Comment",
    "return_comment": null,
    "created_at": "2026-02-03 10:00:00",
    "updated_at": "2026-02-03 10:00:00"
  },
  "bots": [
    {
      "id": "uuid",
      "bot_type": "Shopee (Thailand)",
      "document_count": 5,
      "ocr_additional_info": null,
      "created_at": "2026-02-03 10:00:00",
      "updated_at": "2026-02-03 10:00:00"
    }
  ],
  "submission_count": 1
}
```

**Features**:
- ✅ Auto-calculate `submission_count` (increment from existing max count)
- ✅ Create notification for `document_entry_responsible` from `monthly_tax_data`
- ✅ Support multiple bots per document entry work

---

### PUT /api/document-entry-work/:id

แก้ไขข้อมูลงานคีย์เอกสาร (พร้อม bots)

**URL Parameters**:
- `id` - Document entry work ID

**Request Body**:
```json
{
  "wht_document_count": 15,
  "vat_document_count": 25,
  "non_vat_document_count": 8,
  "submission_comment": "Updated comment",
  "return_comment": null,
  "bots": [
    {
      "id": "existing-bot-id",
      "bot_type": "Shopee (Thailand)",
      "document_count": 10,
      "ocr_additional_info": null
    },
    {
      "bot_type": "ระบบ OCR",
      "document_count": 15,
      "ocr_additional_info": "New OCR info"
    }
  ]
}
```

**Optional Fields** (all fields are optional):
- `wht_document_count`
- `vat_document_count`
- `non_vat_document_count`
- `submission_comment`
- `return_comment`
- `bots` (array of bots - existing bots will be soft deleted and replaced)

**Response**: เหมือนกับ `POST /api/document-entry-work`

**Error Response** (404):
```json
{
  "success": false,
  "message": "ไม่พบข้อมูลงานคีย์เอกสาร"
}
```

**Features**:
- ✅ Soft delete existing bots and create new ones
- ✅ Support updating bots (if `id` is provided, will update; otherwise, will create new)

---

## Helper Functions

### getSubmissionCount(build, workYear, workMonth)

เช็ค `submission_count` จาก `document_entry_work` เพื่อดูว่าส่งงานครั้งที่เท่าไหร่

**Returns**: `number` - submission_count (default: 0)

### getDocumentEntryResponsible(build, year, month)

ดึง `document_entry_responsible` จาก `monthly_tax_data`

**Returns**: `string | null` - document_entry_responsible employee_id

### createDocumentEntryNotification(...)

สร้าง notification สำหรับ `document_entry_responsible`

**Parameters**:
- `documentEntryResponsibleEmployeeId` - Employee ID
- `build` - Build code
- `companyName` - Company name
- `submissionCount` - Submission count
- `documentEntryWorkId` - Document entry work ID
- `workYear` - Work year
- `workMonth` - Work month

**Notification Type**: `document_entry_pending`

**Message**: "มีการส่งข้อมูลการคัดแยกเอกสารสำหรับ {companyName} ครั้งที่ {submissionCount}"

---

## Database Schema

### document_entry_work

ตารางหลักสำหรับเก็บข้อมูลงานคีย์เอกสาร

**Migration**: `migrations/015_create_document_entry_work_table.sql`

### document_entry_work_bots

ตารางสำหรับเก็บข้อมูลบอทอัตโนมัติสำหรับแต่ละงานคีย์เอกสาร

**Migration**: `migrations/031_create_document_entry_work_bots_table.sql`

**Bot Types**:
- `Shopee (Thailand)`
- `SPX Express (Thailand)`
- `Lazada Limited (Head Office)`
- `Lazada Express Limited`
- `ระบบ OCR`

---

## Error Handling

**400 Bad Request**:
```json
{
  "success": false,
  "message": "Missing required fields: build, work_year, work_month, responsible_employee_id"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "message": "ไม่พบข้อมูลงานคีย์เอกสาร"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "ไม่สามารถสร้างงานคีย์เอกสารได้",
  "error": "Error message"
}
```

---

## Related Documentation

- `Documentation/Database/schema.md` - Database schema
- `Documentation/Database/migrations.md` - Migration files
- `Documentation/Guidebook_for_page/12_DocumentSorting.md` - Page guidebook

---

### PATCH /api/document-entry-work/:id/status

อัพเดทสถานะการคีย์เอกสาร (WHT, VAT, Non-VAT)

**URL Parameters**:
- `id` - Document entry work ID

**Request Body**:
```json
{
  "document_type": "wht" | "vat" | "non_vat",
  "status": "ยังไม่ดำเนินการ" | "กำลังดำเนินการ" | "ดำเนินการเสร็จแล้ว"
}
```

**Required Fields**:
- `document_type` - ประเภทเอกสาร (wht, vat, non_vat)
- `status` - สถานะการคีย์ (ยังไม่ดำเนินการ, กำลังดำเนินการ, ดำเนินการเสร็จแล้ว)

**Response**:
```json
{
  "success": true,
  "message": "อัพเดทสถานะสำเร็จ",
  "data": {
    "id": "uuid",
    "build": "BUILD001",
    "company_name": "Company Name",
    "wht_entry_status": "กำลังดำเนินการ",
    "wht_entry_start_datetime": "2026-02-04 10:00:00",
    "wht_entry_completed_datetime": null,
    "wht_status_updated_by": "EMP001",
    "vat_entry_status": "ยังไม่ดำเนินการ",
    "non_vat_entry_status": "ยังไม่ดำเนินการ",
    ...
  }
}
```

**Logic**:
- ถ้า `status` = "กำลังดำเนินการ" → บันทึก `*_entry_start_datetime` = CURRENT_TIMESTAMP, `*_status_updated_by` = req.user.employee_id
- ถ้า `status` = "ดำเนินการเสร็จแล้ว" → บันทึก `*_entry_completed_datetime` = CURRENT_TIMESTAMP, `*_status_updated_by` = req.user.employee_id
- ถ้า `status` = "ยังไม่ดำเนินการ" → clear datetime fields (set เป็น NULL)

**Error Response** (400):
```json
{
  "success": false,
  "message": "Invalid document_type. Must be: wht, vat, or non_vat"
}
```

**Error Response** (404):
```json
{
  "success": false,
  "message": "ไม่พบข้อมูลงานคีย์เอกสาร"
}
```

---

### GET /api/document-entry-work/summary

สรุปข้อมูลการคีย์เอกสาร (รายวัน/รายเดือน) พร้อมรายละเอียดแต่ละ Build

**Query Parameters**:
- `year` (required) - Work year
- `month` (required) - Work month (1-12)
- `document_entry_responsible` (required) - Document entry responsible employee_id
- `group_by` (optional, default: 'day') - Group by 'day' or 'month'

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-03",
      "month": null,
      "items": [
        {
          "build": "001",
          "company_name": "Company Name",
          "wht_document_count": 1,
          "wht_entry_status": "ดำเนินการเสร็จแล้ว",
          "vat_document_count": 3,
          "vat_entry_status": "ดำเนินการเสร็จแล้ว",
          "non_vat_document_count": 3,
          "non_vat_entry_status": "ดำเนินการเสร็จแล้ว",
          "total_documents": 7,
          "completed_documents": 7,
          "pending_documents": 0
        }
      ],
      "total_documents": 7,
      "completed_documents": 7,
      "pending_documents": 0
    }
  ],
  "overall": {
    "total_documents": 7,
    "completed_documents": 7,
    "pending_documents": 0
  },
  "group_by": "day"
}
```

**Features**:
- แสดงเฉพาะรายการที่มี `completed_documents > 0`
- แต่ละ group (วัน/เดือน) มี `items` array ที่ประกอบด้วยรายละเอียดแต่ละ Build:
  - `build` - Build code
  - `company_name` - ชื่อบริษัท (จาก `clients` table)
  - `wht_document_count`, `vat_document_count`, `non_vat_document_count` - จำนวนเอกสารแต่ละประเภท
  - `wht_entry_status`, `vat_entry_status`, `non_vat_entry_status` - สถานะการดำเนินงานแต่ละประเภท
  - `total_documents` - จำนวนเอกสารทั้งหมด
  - `completed_documents` - จำนวนเอกสารที่เสร็จสิ้นแล้ว
  - `pending_documents` - จำนวนเอกสารที่รอดำเนินการ
- `overall` จะเป็นผลรวมของทุกวัน/เดือน

**Note**: 
- เมื่อ `group_by` = 'day' → `date` จะมีค่า, `month` จะเป็น null
- เมื่อ `group_by` = 'month' → `month` จะมีค่า, `date` จะเป็น null
- `overall` จะเป็นผลรวมของทุกวัน/เดือน

---

---

## Notification System

### createAccountingNotificationForDocumentEntry(...)

สร้าง notification สำหรับ `accounting_responsible` เมื่อสถานะการคีย์เอกสารเปลี่ยน

**Parameters**:
- `accountingResponsibleEmployeeId` - Employee ID ของ accounting_responsible
- `build` - Build code
- `companyName` - Company name
- `submissionCount` - ครั้งที่ส่งงาน
- `documentEntryWorkId` - ID ของ document_entry_work
- `workYear` - Work year
- `workMonth` - Work month
- `documentType` - 'wht', 'vat', หรือ 'non_vat'
- `status` - 'กำลังดำเนินการ' หรือ 'ดำเนินการเสร็จแล้ว'

**Notification Types**:
- `document_entry_pending` (yellow) - เมื่อ status = 'กำลังดำเนินการ'
- `document_entry_completed` (green) - เมื่อ status = 'ดำเนินการเสร็จแล้ว'

**Notification Source**: ดึง `accounting_responsible` จาก `work_assignments` (priority) หรือ `monthly_tax_data` (fallback)

### createReturnCommentNotification(...)

สร้าง notification สำหรับ `accounting_responsible` เมื่อ `return_comment` ถูกอัพเดท

**Parameters**:
- `accountingResponsibleEmployeeId` - Employee ID ของ accounting_responsible
- `build` - Build code
- `companyName` - Company name
- `submissionCount` - ครั้งที่ส่งงาน
- `documentEntryWorkId` - ID ของ document_entry_work
- `workYear` - Work year
- `workMonth` - Work month
- `returnComment` - ข้อความความคิดเห็นส่งคืนงานคีย์

**Notification Type**: `document_entry_pending` (orange)

**Notification Source**: ดึง `accounting_responsible` จาก `work_assignments` (priority) หรือ `monthly_tax_data` (fallback)

---

**Last Updated**: 2026-02-04
