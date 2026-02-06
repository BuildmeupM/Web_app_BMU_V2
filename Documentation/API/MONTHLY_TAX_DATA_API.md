# 📡 Monthly Tax Data API Documentation

## 📋 Overview

เอกสารนี้อธิบาย API Endpoints ทั้งหมดสำหรับการจัดการข้อมูลภาษีรายเดือน (Monthly Tax Data) ในระบบ BMU Work Management System

**Base URL**: `/api/monthly-tax-data`  
**Authentication**: Required (Bearer Token)  
**Last Updated**: 2026-02-03

---

## 📊 API Endpoints Summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/monthly-tax-data` | All authenticated | ดึงรายการข้อมูลภาษีรายเดือน (paginated, filter) |
| `GET` | `/api/monthly-tax-data/summary` | All authenticated | ดึง Summary สำหรับ Dashboard |
| `GET` | `/api/monthly-tax-data/:build/:year/:month` | All authenticated | ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month |
| `GET` | `/api/monthly-tax-data/:id` | All authenticated | ดึงข้อมูลภาษีรายเดือนตาม ID |
| `POST` | `/api/monthly-tax-data` | Admin only | สร้างข้อมูลภาษีรายเดือนใหม่ |
| `PUT` | `/api/monthly-tax-data/:id` | All authenticated | แก้ไขข้อมูลภาษีรายเดือน |

---

## 🔍 API Endpoints Details

### 1. GET /api/monthly-tax-data

**Description**: ดึงรายการข้อมูลภาษีรายเดือน (paginated, filter)

**Access**: All authenticated users

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | หน้า (default: 1) |
| `limit` | number | No | จำนวนรายการต่อหน้า (default: 20, max: 100) |
| `build` | string | No | Filter by Build code |
| `year` | string | No | Filter by Tax year |
| `month` | string | No | Filter by Tax month (1-12) |
| `search` | string | No | Search by Build code or Company name |
| `sortBy` | string | No | Sort field (default: 'tax_year', options: 'tax_year', 'tax_month', 'build', 'created_at') |
| `sortOrder` | string | No | Sort direction (default: 'desc', options: 'asc', 'desc') |
| `tax_inspection_responsible` | string | No | Filter by tax inspection responsible employee_id (for ตรวจภาษี page) |
| `accounting_responsible` | string | No | Filter by accounting responsible employee_id (for สถานะยื่นภาษี page) |
| `wht_filer_employee_id` | string | No | Filter by WHT filer employee_id (for ยื่นภาษี page - WHT) |
| `vat_filer_employee_id` | string | No | Filter by VAT filer employee_id (for ยื่นภาษี page - VAT) |
| `document_entry_responsible` | string | No | Filter by document entry responsible employee_id |
| `tax_registration_status` | string | No | Filter by tax registration status (for Tax Status page - filterMode: 'vat') |

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "build": "018",
      "company_name": "เอสท์ เซเรนด์ เอ็นจิเนียริ่ง",
      "tax_year": 2026,
      "tax_month": 1,
      "accounting_responsible": "AC00024",
      "accounting_responsible_name": "พงษ์สิทธิ์ สูงสนิท",
      "accounting_responsible_first_name": "พงษ์สิทธิ์",
      "accounting_responsible_nick_name": "ปู",
      "tax_inspection_responsible": "AC00008",
      "tax_inspection_responsible_name": "ธวัชชัย เทียนสงค์",
      "tax_inspection_responsible_first_name": "ธวัชชัย",
      "tax_inspection_responsible_nick_name": "ท๊อป",
      "document_received_date": "2026-02-01 00:00:00",
      "bank_statement_status": null,
      "pnd_sent_for_review_date": null,
      "pnd_review_returned_date": null,
      "pnd_sent_to_customer_date": null,
      "pnd_status": null,
      "pp30_sent_for_review_date": null,
      "pp30_review_returned_date": "2026-02-03 15:42:13",
      "pp30_sent_to_customer_date": null,
      "pp30_form": "draft_completed",
      "pp30_status": "draft_completed",
      "vat_draft_completed_date": "2026-02-03 16:39:41",
      "pp30_payment_status": "has_payment",
      "pp30_payment_amount": "1.00",
      "pp30_filing_response": null,
      "created_at": "2026-02-02T15:35:01.000Z",
      "updated_at": "2026-02-03T09:26:22.000Z",
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Important Fields**:

- **`pp30_form`**: VARCHAR(100) - สถานะ ภ.พ.30 ที่เก็บในฐานข้อมูล (หลัง migration 028)
- **`pp30_status`**: string (derived) - สถานะ ภ.พ.30 ที่ derive จาก `pp30_form` หรือ timestamp fields
- **`pp30_sent_to_customer_date`**: datetime - วันที่ส่งลูกค้า (set เมื่อ `pp30_status` = 'sent_to_customer' และ `sourcePage` = 'taxFiling')
- **`pp30_review_returned_date`**: datetime - วันที่ส่งตรวจคืน (set เมื่อเปลี่ยนจาก 'pending_review'/'pending_recheck' เป็นสถานะอื่น และ `sourcePage` = 'taxInspection')
- **`pp30_sent_for_review_date`**: datetime - วันที่ส่งตรวจ (set เมื่อ `pp30_status` = 'pending_review'/'pending_recheck' และ `sourcePage` = 'taxStatus')
- **`vat_draft_completed_date`**: datetime - วันที่ร่างแบบเสร็จ (set เมื่อ `pp30_status` = 'draft_completed' และ `sourcePage` = 'taxFiling')

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 442-701)

---

### 2. GET /api/monthly-tax-data/summary

**Description**: ดึง Summary สำหรับ Dashboard (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)

**Access**: All authenticated users

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | string | No | Filter by Tax year |
| `month` | string | No | Filter by Tax month (1-12) |
| `accounting_responsible` | string | No | Filter by accounting responsible employee_id |
| `tax_inspection_responsible` | string | No | Filter by tax inspection responsible employee_id |
| `wht_filer_employee_id` | string | No | Filter by WHT filer employee_id |
| `vat_filer_employee_id` | string | No | Filter by VAT filer employee_id |

**Response**:

```json
{
  "success": true,
  "data": {
    "wht": {
      "total": 10,
      "responsible_count": 5,
      "completed": 3,
      "pending": 2,
      "recheck": 1,
      "draft_ready": 2,
      "passed": 1,
      "sent_to_customer": 1
    },
    "vat": {
      "total": 8,
      "responsible_count": 4,
      "completed": 2,
      "pending": 1,
      "recheck": 1,
      "draft_ready": 1,
      "passed": 1,
      "sent_to_customer": 1
    },
    "impacts": {
      "monthly_tax_impact_count": 5,
      "bank_impact_count": 3,
      "total": 8
    }
  }
}
```

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 708-938)

---

### 3. GET /api/monthly-tax-data/:build/:year/:month

**Description**: ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month

**Access**: All authenticated users

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `build` | string | Yes | Build code |
| `year` | number | Yes | Tax year |
| `month` | number | Yes | Tax month (1-12) |

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "build": "018",
    "company_name": "เอสท์ เซเรนด์ เอ็นจิเนียริ่ง",
    "tax_year": 2026,
    "tax_month": 1,
    "pp30_form": "draft_completed",
    "pp30_status": "draft_completed",
    // ... other fields (same as GET /api/monthly-tax-data)
  }
}
```

**Important**: 
- ⚠️ **Route นี้ต้องอยู่ก่อน `/:id` route** เพื่อหลีกเลี่ยง route conflicts
- ส่ง `pp30_form` และ `pp30_status` กลับมาด้วย

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 957-1101)

---

### 4. GET /api/monthly-tax-data/:id

**Description**: ดึงข้อมูลภาษีรายเดือนตาม ID

**Access**: All authenticated users

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Monthly tax data ID |

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "build": "018",
    "company_name": "เอสท์ เซเรนด์ เอ็นจิเนียริ่ง",
    "tax_year": 2026,
    "tax_month": 1,
    "pp30_form": "draft_completed",
    "pp30_status": "draft_completed",
    // ... other fields (same as GET /api/monthly-tax-data)
  }
}
```

**Important**: 
- ⚠️ **Route นี้ต้องอยู่หลัง `/:build/:year/:month` route** เพื่อหลีกเลี่ยง route conflicts
- ส่ง `pp30_form` และ `pp30_status` กลับมาด้วย
- Auto-mark notifications as read เมื่อ user เปิดดูข้อมูล

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 1133-1274)

---

### 5. POST /api/monthly-tax-data

**Description**: สร้างข้อมูลภาษีรายเดือนใหม่

**Access**: Admin only

**Request Body**:

```json
{
  "build": "018",
  "tax_year": 2026,
  "tax_month": 1,
  "accounting_responsible": "AC00024",
  "tax_inspection_responsible": "AC00008",
  "document_received_date": "2026-02-01",
  "bank_statement_status": null,
  "pp30_form": null,
  // ... other fields (optional)
}
```

**Response**:

```json
{
  "success": true,
  "message": "Monthly tax data created successfully",
  "data": {
    "id": "uuid",
    "build": "018",
    // ... other fields
  }
}
```

**Error Responses**:

- `409 Conflict`: Monthly tax data already exists for this month
- `500 Internal Server Error`: Server error

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 1281-1571)

---

### 6. PUT /api/monthly-tax-data/:id

**Description**: แก้ไขข้อมูลภาษีรายเดือน

**Access**: All authenticated users (แต่ต้องเป็น responsible user หรือ admin)

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Monthly tax data ID |

**Request Body**:

```json
{
  "pp30_status": "draft_completed",
  "pp30_form": "draft_completed",
  "sourcePage": "taxFiling",
  "vat_draft_completed_date": null,
  "pp30_sent_to_customer_date": null,
  "pp30_review_returned_date": null,
  "pp30_sent_for_review_date": null,
  // ... other fields (optional)
}
```

**Important Request Fields**:

- **`pp30_status`**: string - สถานะ ภ.พ.30 ที่ต้องการบันทึก (ใช้เพื่อตั้ง timestamp)
- **`pp30_form`**: string - สถานะ ภ.พ.30 ที่เก็บในฐานข้อมูล (หลัง migration 028)
- **`sourcePage`**: string - หน้าเว็บที่ส่งข้อมูลมา ('taxFiling', 'taxInspection', 'taxStatus') - ใช้เพื่อตั้ง timestamp ตามหน้า

**Timestamp Logic** (ตั้งตาม `pp30_status` และ `sourcePage`):

| pp30_status | sourcePage | Timestamp Field ที่ Set |
|-------------|------------|-------------------------|
| `sent_to_customer` | `taxFiling` | `pp30_sent_to_customer_date` |
| `draft_completed` | `taxFiling` | `vat_draft_completed_date` |
| `pending_review` | `taxStatus` | `pp30_sent_for_review_date` |
| `pending_recheck` | `taxStatus` | `pp30_sent_for_review_date` |
| (เปลี่ยนจาก `pending_review`/`pending_recheck`) | `taxInspection` | `pp30_review_returned_date` |

**Response**:

```json
{
  "success": true,
  "message": "Monthly tax data updated successfully",
  "data": {
    "id": "uuid",
    "build": "018",
    "pp30_form": "draft_completed",
    "pp30_status": "draft_completed",
    "vat_draft_completed_date": "2026-02-03 16:39:41",
    // ... other fields
  }
}
```

**Important**: 
- ⚠️ ส่ง `pp30_form` และ `pp30_status` กลับมาด้วย
- Auto-create/update notifications สำหรับ tax review
- Auto-mark notifications as read เมื่อ user เปิดดูข้อมูล

**Backend Implementation**: `backend/routes/monthly-tax-data.js` (บรรทัด 1578-2375)

---

## 🔄 Data Flow

### การอัพเดทข้อมูลหลังบันทึก

1. **Frontend**: ส่ง `PUT /api/monthly-tax-data/:id` พร้อม `pp30_status`, `pp30_form`, `sourcePage`
2. **Backend**: 
   - ตั้ง timestamp ตาม `pp30_status` และ `sourcePage`
   - บันทึก `pp30_form` ลงฐานข้อมูล
   - ส่ง `pp30_form` และ `pp30_status` กลับมา
3. **Frontend**: 
   - อัพเดท cache ทันทีด้วย `setQueryData`
   - Invalidate และ refetch queries เพื่อ sync กับ server

---

## 📊 Database Schema

### Table: `monthly_tax_data`

**Important Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) | Primary key (UUID) |
| `build` | VARCHAR(50) | Build code (FK to clients.build) |
| `tax_year` | INT | Tax year |
| `tax_month` | INT | Tax month (1-12) |
| `pp30_form` | VARCHAR(100) | สถานะ ภ.พ.30 (หลัง migration 028) |
| `pp30_sent_to_customer_date` | DATETIME | วันที่ส่งลูกค้า |
| `pp30_review_returned_date` | DATETIME | วันที่ส่งตรวจคืน |
| `pp30_sent_for_review_date` | DATETIME | วันที่ส่งตรวจ |
| `vat_draft_completed_date` | DATETIME | วันที่ร่างแบบเสร็จ |
| `pp30_filing_response` | VARCHAR(100) | Response จาก filing (backward compatibility) |
| `pp30_payment_status` | VARCHAR(50) | สถานะยอดชำระ ('has_payment', 'no_payment') |
| `pp30_payment_amount` | DECIMAL(10,2) | จำนวนยอดชำระ |
| `created_at` | TIMESTAMP | วันที่สร้าง |
| `updated_at` | TIMESTAMP | วันที่อัพเดท |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Note**: 
- ⚠️ **ไม่มี column `pp30_status`** ในฐานข้อมูล - เป็น derived field ที่คำนวณจาก `pp30_form` หรือ timestamp fields
- ⚠️ **หลัง migration 028**: `pp30_form` เปลี่ยนจาก `BOOLEAN` เป็น `VARCHAR(100)` เพื่อเก็บสถานะโดยตรง

---

## 🔍 Status Derivation Logic

### `pp30_status` Derivation (Backend)

**Priority Order**:

1. **`pp30_form`** (ถ้าไม่ใช่ boolean 0/1) → ใช้ค่าจาก `pp30_form` โดยตรง
2. **`pp30_filing_response`** → 'paid' (backward compatibility)
3. **Timestamp fields** (ล่าสุด) → 
   - `pp30_sent_to_customer_date` → 'sent_to_customer'
   - `pp30_review_returned_date` → 'pending_recheck'
   - `pp30_sent_for_review_date` → 'pending_review'
   - `vat_draft_completed_date` → 'draft_completed'
4. **`pp30_form` = 1** → 'not_started' (backward compatibility)

**Implementation**: `backend/routes/monthly-tax-data.js` → `derivePp30StatusFromRow()` (บรรทัด 43-70)

---

## 🔐 Access Control

### Authorization Rules

1. **GET endpoints**: All authenticated users
2. **POST endpoint**: Admin only
3. **PUT endpoint**: 
   - All authenticated users (แต่ต้องเป็น responsible user หรือ admin)
   - Responsible users: `accounting_responsible`, `tax_inspection_responsible`, `wht_filer_employee_id`, `vat_filer_employee_id`, `document_entry_responsible`

---

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* ... */ },
  "pagination": { /* ... */ } // สำหรับ GET /api/monthly-tax-data เท่านั้น
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

---

## 🔗 Connection Points

### Frontend Pages

| Page | API Endpoints Used |
|------|-------------------|
| **ตรวจภาษี** (`TaxInspection.tsx`) | `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary` |
| **สถานะยื่นภาษี** (`TaxStatus.tsx`) | `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary` |
| **ยื่นภาษี** (`TaxFiling.tsx`) | `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary` + `PUT /api/monthly-tax-data/:id` |
| **ฟอร์มสถานะภาษีประจำเดือน** (`TaxInspectionForm.tsx`) | `GET /api/monthly-tax-data/:build/:year/:month` + `PUT /api/monthly-tax-data/:id` |

---

## ⚠️ Important Notes

1. **`pp30_status` vs `pp30_form`**:
   - `pp30_status`: Derived field (ไม่มีในฐานข้อมูล) - ใช้เพื่อตั้ง timestamp
   - `pp30_form`: Column ในฐานข้อมูล (VARCHAR(100)) - เก็บสถานะโดยตรง

2. **Timestamp Logic**:
   - Timestamp จะถูกตั้งตาม `pp30_status` และ `sourcePage`
   - ดูรายละเอียดใน `Documentation/PP30_TIMESTAMP_LOGIC.md`

3. **Cache Update**:
   - Frontend จะอัพเดท cache ทันทีหลังบันทึก
   - ดูรายละเอียดใน `Documentation/DATA_UPDATE_AFTER_SAVE.md`

4. **Performance**:
   - ดูรายละเอียด optimization ใน `Documentation/API/TAX_STATUS_PERFORMANCE_OPTIMIZATION.md`

---

## 📚 Related Documentation

- `Documentation/API/API_INDEX.md` - API Index
- `Documentation/API/TAX_STATUS_PERFORMANCE_OPTIMIZATION.md` - Performance optimization
- `Documentation/PP30_FORM_STATUS_MIGRATION.md` - Migration 028 details
- `Documentation/PP30_STATUS_DATA_SOURCE.md` - Status derivation logic
- `Documentation/PP30_TIMESTAMP_LOGIC.md` - Timestamp setting logic
- `Documentation/DATA_UPDATE_AFTER_SAVE.md` - Cache update mechanism
- `Documentation/Database/schema.md` - Database schema

---

**Last Updated**: 2026-02-03  
**Maintainer**: Cursor AI
