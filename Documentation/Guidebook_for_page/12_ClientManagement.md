# 🏢 12. Client Management Page

## 📋 Overview

หน้าจัดการข้อมูลลูกค้า - ระบบจัดการข้อมูลลูกค้าครบถ้วนตาม requirements

**Route**: `/clients`  
**Component**: `src/pages/ClientManagement.tsx`

**Reference**: 
- `Documentation/Database/schema.md` - Clients table
- `Documentation/Database/migrations/009_create_clients_table.sql`
- `Documentation/API/API_INDEX.md` - Clients API

## 🔐 Access Control

### Role Permissions

| Role | Permissions |
|------|-------------|
| **admin** | ✅ Full access (CRUD, View, Export) |
| **data_entry** | ✅ View, Create, Edit |
| **data_entry_and_service** | ✅ View, Create, Edit |
| **audit** | ✅ View only |
| **service** | ✅ View only |
| **Other Roles** | ❌ No access |

### Access Rules

- **Admin**: Full access - สามารถ CRUD ข้อมูลลูกค้าทุกคน
- **Data Entry Roles**: สามารถสร้างและแก้ไขข้อมูลลูกค้าได้ แต่ไม่สามารถลบได้
- **Audit/Service**: มองเห็นข้อมูลลูกค้าได้เท่านั้น (Read-only)

## ✨ Features

### 1. Client List View

#### Features
- ✅ แสดงรายชื่อลูกค้าทั้งหมด
- ✅ Search และ Filter:
  - **Search**: ค้นหาด้วย Build code, ชื่อบริษัท, เลขทะเบียนนิติบุคคล
  - **Filter**: 
    - สถานะบริษัท (`company_status`): รายเดือน, รายเดือน / วางมือ, รายเดือน / จ่ายรายปี, รายเดือน / เดือนสุดท้าย, ยกเลิกทำ, ทั้งหมด
    - ประเภทกิจการ (`business_type`): บริษัทจำกัด, บริษัทมหาชนจำกัด, ห้างหุ้นส่วน, ทั้งหมด
- ✅ Sortable Columns:
  - Build code (default: ascending)
  - ชื่อบริษัท
  - เลขทะเบียนนิติบุคคล
  - สถานะบริษัท
  - วันที่สร้าง
- ✅ Pagination (20 items per page, max 100)
- ✅ Actions: View, Edit, Delete (Admin only)
- ✅ Delete Confirmation Modal - แสดง popup ยืนยันก่อนลบข้อมูล (แสดง Build code, ชื่อบริษัท, และคำเตือน)

#### Default Settings
- **ค่าเริ่มต้น**: สถานะบริษัท = "รายเดือน" (active clients)
- **ค่าเริ่มต้น**: เรียงข้อมูลตาม Build code แบบ A-Z (ascending)
- **ค่าเริ่มต้น**: 20 items per page

### 2. Client Detail View

#### โครงสร้างการแสดงผล

**Card 1: Header Section** (มีขอบสีส้ม #ff6b35)
- Build code (`build`) - แสดงเป็น Badge สีส้ม
- ชื่อบริษัท (`company_name`) - ตัวหนา, ขนาดใหญ่
- สถานะบริษัท (`company_status`) - Badge สีตามสถานะ
- ประเภทกิจการ (`business_type`) - Badge สีฟ้า
- ปุ่มแก้ไขข้อมูล (Admin/Data Entry: any client | Audit/Service: view only)

**Card 2: ข้อมูลพื้นฐาน** (มีขอบสีส้ม)
- **ข้อมูลบริษัท**:
  - เลขทะเบียนนิติบุคคล (`legal_entity_number`) - แสดงเป็นรูปแบบ XXX-XXXX-XXXX-XX-X
  - วันจัดตั้งกิจการ (`establishment_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - ประเภทธุรกิจ (`business_category`)
  - ประเภทธุรกิจย่อย (`business_subcategory`)
  - ไซต์บริษัท (`company_size`) - Badge (SS, S, MM, M, LL, L, XL, XXL)

**Card 3: ข้อมูลภาษี** (มีขอบสีส้ม)
- **สถานะจดทะเบียนภาษี**:
  - สถานะจดภาษีมูลค่าเพิ่ม (`tax_registration_status`) - Badge สีเขียว/แดง
  - วันที่จดภาษีมูลค่าเพิ่ม (`vat_registration_date`) - Formatted (DD MMMM YYYY พ.ศ.)

**Card 4: ที่อยู่** (มีขอบสีส้ม)
- **ที่อยู่บริษัท**:
  - ที่อยู่รวม (`full_address`) - แสดงเป็น Textarea (read-only)
  - หรือแสดงรายละเอียดแยกฟิลด์:
    - หมู่บ้าน (`village`)
    - อาคาร (`building`)
    - ห้องเลขที่ (`room_number`)
    - ชั้นที่ (`floor_number`)
    - เลขที่ (`address_number`)
    - ซอย/ตรอก (`soi`)
    - หมู่ที่ (`moo`)
    - ถนน (`road`)
    - แขวง/ตำบล (`subdistrict`)
    - อำเภอ/เขต (`district`)
    - จังหวัด (`province`)
    - รหัสไปรษณี (`postal_code`)

**Card 5: ข้อมูลเพิ่มเติม** (มีขอบสีส้ม)
- **Timestamps**:
  - วันที่สร้าง (`created_at`) - Formatted (DD MMMM YYYY HH:mm)
  - วันที่อัปเดตล่าสุด (`updated_at`) - Formatted (DD MMMM YYYY HH:mm)

#### Additional Display
- ✅ Alert แสดงสถานะข้อมูลครบถ้วน/ไม่ครบถ้วน
- ✅ Edit button (Admin/Data Entry: any client | Audit/Service: view only)

### 3. Add Client Form

**Access**: Admin, Data Entry roles only

**Features**:
- ✅ Form สำหรับเพิ่มลูกค้าใหม่
- ✅ Validation (React Hook Form + Zod)
- ✅ All fields from database schema
- ✅ Address fields (collapsible section หรือใช้ Textarea สำหรับ full_address)
- ✅ Real-time validation

**Required Fields**:
- Build code (`build`) - 3 หลัก, Unique, Format: XXX
- ประเภทกิจการ (`business_type`) - Required
- ชื่อบริษัท (`company_name`) - Required
- เลขทะเบียนนิติบุคคล (`legal_entity_number`) - 13 หลัก, Unique, Format: XXX-XXXX-XXXX-XX-X
- สถานะบริษัท (`company_status`) - Default: 'รายเดือน'

**Optional Fields**:
- วันจัดตั้งกิจการ (`establishment_date`)
- ประเภทธุรกิจ (`business_category`)
- ประเภทธุรกิจย่อย (`business_subcategory`)
- ไซต์บริษัท (`company_size`)
- สถานะจดภาษีมูลค่าเพิ่ม (`tax_registration_status`)
- วันที่จดภาษีมูลค่าเพิ่ม (`vat_registration_date`)
- ที่อยู่ทั้งหมด (full_address หรือแยกฟิลด์)

### 4. Edit Client Form

**Access**: 
- Admin/Data Entry: Edit any client (all fields)
- Audit/Service: View only (no edit)

**Editable Fields**:
- ทุกฟิลด์สามารถแก้ไขได้ (ยกเว้น Build code และ legal_entity_number ที่ไม่ควรแก้ไข)

**Validation**:
- Build code: ไม่สามารถแก้ไขได้ (read-only)
- Legal entity number: ไม่สามารถแก้ไขได้ (read-only)
- ชื่อบริษัท: Required
- ประเภทกิจการ: Required

### 5. Delete Client

**Access**: Admin only

**Features**:
- ✅ Soft delete (set `deleted_at` timestamp)
- ✅ Delete Confirmation Modal
- ✅ แสดงคำเตือนก่อนลบ
- ✅ ไม่สามารถลบได้ถ้ามีข้อมูลที่เกี่ยวข้อง (foreign key constraints)

### 6. Excel Import

**Access**: Admin, Data Entry roles only

**Features**:
- ✅ Upload Excel file (.xlsx, .xls)
- ✅ Preview imported data (validation results)
- ✅ Validation errors display
- ✅ Import progress
- ✅ Import results (success/failed count, errors, warnings)
- ✅ Download Template

**Process**:
1. Upload Excel file (max 10MB)
2. Validate Excel format
3. Preview validation results
4. Import (batch processing, transaction)
5. Show results

**Required Fields**:
- Build Code (3 digits)
- ชื่อบริษัท

**Optional Fields**:
- ทุกฟิลด์อื่นๆ (ไม่บังคับกรอก)

**Template**:
- ดาวน์โหลดได้จากหน้า "นำเข้าจาก Excel"
- มีคอลัมน์ทั้งหมด 24 คอลัมน์
- มีตัวอย่างการกรอกข้อมูล
- รองรับทั้งชื่อคอลัมน์ภาษาไทยและภาษาอังกฤษ

## 🎨 UI/UX Guidelines

### Color Scheme
- **Primary Color**: Orange (#ff6b35, #ff8c42)
- **Card Border**: `borderLeft: '4px solid #ff6b35'`
- **Badge Colors**:
  - Build code: Orange (#ff6b35)
  - สถานะบริษัท:
    - รายเดือน: Green (#4caf50)
    - รายเดือน / วางมือ: Yellow (#ff9800)
    - รายเดือน / จ่ายรายปี: Blue (#4facfe)
    - รายเดือน / เดือนสุดท้าย: Orange (#ff6b35)
    - ยกเลิกทำ: Red (#f44336)
  - ประเภทกิจการ: Blue (#4facfe)
  - สถานะจดภาษีมูลค่าเพิ่ม:
    - จดภาษีมูลค่าเพิ่ม: Green (#4caf50)
    - ยังไม่จดภาษีมูลค่าเพิ่ม: Red (#f44336)

### Typography
- **Font Family**: Kanit (Thai), Arial/Sans-serif (English)
- **Headings**: 
  - Page Title: `size="xl"`, `fw={700}`, color: white
  - Card Title: `size="lg"`, `fw={700}`, color: #ff6b35
- **Body**: `size="md"` (16px)
- **Labels**: `size="sm"` (14px), `fw={600}`

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Container (maxWidth: 1400px)             │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Title + Action Buttons              │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Search + Filters                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Client List Table                   │ │
│ │ - Build | Name | Status | Actions  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Pagination                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Components Used

#### Mantine Components
- `Container` - Wrapper สำหรับหน้า
- `Title` - หัวข้อหน้า
- `Stack` - Layout แนวตั้ง
- `Group` - Layout แนวนอน
- `Card` - Card สำหรับแสดงข้อมูล
- `Table` - ตารางแสดงรายการลูกค้า
- `TextInput` - Input สำหรับค้นหา
- `Select` - Dropdown สำหรับ Filter
- `Button` - ปุ่มต่างๆ
- `Badge` - แสดงสถานะ
- `Modal` - Modal สำหรับ Form และ Delete Confirmation
- `Pagination` - Pagination
- `Alert` - แสดงข้อความแจ้งเตือน
- `Loader` - Loading indicator
- `Textarea` - Textarea สำหรับที่อยู่
- `DatePickerInput` - Date picker สำหรับวันที่

#### Icons (react-icons/tb)
- `TbPlus` - เพิ่มลูกค้าใหม่
- `TbSearch` - ค้นหา
- `TbEdit` - แก้ไข
- `TbTrash` - ลบ
- `TbEye` - ดูรายละเอียด
- `TbBuilding` - ไอคอนบริษัท
- `TbMapPin` - ไอคอนที่อยู่
- `TbFileInvoice` - ไอคอนภาษี
- `TbCalendar` - ไอคอนวันที่

### Responsive Design
- **Desktop**: แสดงตารางเต็มรูปแบบ
- **Tablet**: แสดงตารางแบบ responsive (scroll horizontal)
- **Mobile**: แสดงเป็น Card layout แทนตาราง

## 📊 Data Structure

### Client Interface

```typescript
interface Client {
  id: string
  build: string // รหัสลูกค้า 3 หลัก (เช่น 001, 061, 315)
  business_type: string // 'บริษัทจำกัด' | 'บริษัทมหาชนจำกัด' | 'ห้างหุ้นส่วน'
  company_name: string
  legal_entity_number: string // เลขทะเบียนนิติบุคคล 13 หลัก
  establishment_date?: string | null // DATE
  business_category?: string | null
  business_subcategory?: string | null
  company_size?: string | null // 'SS' | 'S' | 'MM' | 'M' | 'LL' | 'L' | 'XL' | 'XXL'
  tax_registration_status?: string | null // 'จดภาษีมูลค่าเพิ่ม' | 'ยังไม่จดภาษีมูลค่าเพิ่ม'
  vat_registration_date?: string | null // DATE
  full_address?: string | null // TEXT
  village?: string | null
  building?: string | null
  room_number?: string | null
  floor_number?: string | null
  address_number?: string | null
  soi?: string | null
  moo?: string | null
  road?: string | null
  subdistrict?: string | null
  district?: string | null
  province?: string | null
  postal_code?: string | null
  company_status: string // 'รายเดือน' | 'รายเดือน / วางมือ' | 'รายเดือน / จ่ายรายปี' | 'รายเดือน / เดือนสุดท้าย' | 'ยกเลิกทำ'
  created_at: string
  updated_at: string
}
```

## 🔌 API Endpoints

### Clients API

**Base URL**: `/api/clients`

#### 1. Get Client List
- **Endpoint**: `GET /api/clients`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `search` (string) - ค้นหาด้วย Build, ชื่อบริษัท, เลขทะเบียนนิติบุคคล
  - `company_status` (string) - Filter by status
  - `business_type` (string) - Filter by business type
  - `sortBy` (string, default: 'build')
  - `sortOrder` ('asc' | 'desc', default: 'asc')
- **Response**: `ClientListResponse`

#### 2. Get Client by Build
- **Endpoint**: `GET /api/clients/:build`
- **Response**: `ClientDetailResponse`

#### 3. Create Client
- **Endpoint**: `POST /api/clients`
- **Body**: `Partial<Client>`
- **Response**: `ClientDetailResponse`
- **Access**: Admin, Data Entry roles

#### 4. Update Client
- **Endpoint**: `PUT /api/clients/:build`
- **Body**: `Partial<Client>`
- **Response**: `ClientDetailResponse`
- **Access**: Admin, Data Entry roles

#### 5. Delete Client
- **Endpoint**: `DELETE /api/clients/:build`
- **Response**: `{ success: boolean, message: string }`
- **Access**: Admin only

#### 6. Validate Import File
- **Endpoint**: `POST /api/clients/import/validate`
- **Body**: `FormData` with `file` field
- **Response**: `{ success: boolean, data: ValidationResult }`
- **Access**: Admin, Data Entry roles

#### 7. Import Clients
- **Endpoint**: `POST /api/clients/import`
- **Body**: `FormData` with `file` field
- **Response**: `{ success: boolean, message: string, data: ImportResult }`
- **Access**: Admin, Data Entry roles

## 🧩 Components

### Main Components

#### 1. ClientManagement.tsx
- Main page component
- Manages state, routing, and data fetching
- Handles CRUD operations

#### 2. ClientList.tsx
- Displays list of clients in table format
- Handles sorting, filtering, and pagination
- Shows actions (View, Edit, Delete)

#### 3. ClientDetail.tsx
- Displays detailed client information
- Shows all client data in organized cards
- Handles edit action

#### 4. ClientForm.tsx
- Form for creating/editing clients
- Handles validation
- Supports both create and edit modes

#### 5. ClientDeleteModal.tsx
- Confirmation modal for deleting clients
- Shows client information before deletion
- Handles delete action

#### 6. ClientImport.tsx
- Component for importing clients from Excel
- File upload and validation
- Shows validation results and import progress
- Handles import action

## 🔄 User Flow

### View Client List
1. User navigates to `/clients`
2. System loads client list with default filters
3. User can search, filter, and sort
4. User clicks on a client to view details

### Add New Client
1. User clicks "เพิ่มลูกค้าใหม่" button
2. Modal opens with empty form
3. User fills in required fields
4. User submits form
5. System validates and creates client
6. Success notification appears
7. Client list refreshes

### Edit Client
1. User clicks "แก้ไข" button on client row or detail page
2. Modal opens with pre-filled form
3. User modifies fields
4. User submits form
5. System validates and updates client
6. Success notification appears
7. Client detail/list refreshes

### Delete Client
1. User clicks "ลบ" button (Admin only)
2. Confirmation modal appears
3. User confirms deletion
4. System soft deletes client
5. Success notification appears
6. Client list refreshes

## ✅ Validation Rules

### Build Code
- Required
- Format: 3 digits (001-999)
- Unique in database
- Cannot be edited after creation

### Legal Entity Number
- Required
- Format: 13 digits (XXX-XXXX-XXXX-XX-X)
- Unique in database
- Cannot be edited after creation

### Company Name
- Required
- Max length: 500 characters
- Cannot be empty

### Business Type
- Required
- Must be one of: 'บริษัทจำกัด', 'บริษัทมหาชนจำกัด', 'ห้างหุ้นส่วน'

### Company Status
- Required
- Default: 'รายเดือน'
- Must be one of: 'รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย', 'ยกเลิกทำ'

### Dates
- Establishment date: Must be valid date (past or present)
- VAT registration date: Must be valid date (past or present)

### Postal Code
- Format: 5 digits (if provided)
- Optional

## 🚨 Error Handling

### API Errors
- **400 Bad Request**: แสดง error message จาก API
- **401 Unauthorized**: Redirect to login
- **403 Forbidden**: แสดงข้อความ "คุณไม่มีสิทธิ์เข้าถึง"
- **404 Not Found**: แสดงข้อความ "ไม่พบข้อมูลลูกค้า"
- **409 Conflict**: แสดงข้อความ "Build code หรือเลขทะเบียนนิติบุคคลซ้ำ"
- **500 Internal Server Error**: แสดงข้อความ "เกิดข้อผิดพลาดในระบบ"

### Validation Errors
- แสดง error message ใต้ field ที่ผิดพลาด
- Highlight field ที่มี error (red border)
- Disable submit button ถ้ามี validation errors

### Network Errors
- แสดง Alert สีแดงพร้อมข้อความ "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
- Retry button สำหรับ retry request

## 📝 Notes

### Important Considerations
1. **Build Code**: เป็น unique identifier ที่สำคัญ ไม่ควรแก้ไขหลังจากสร้าง
2. **Legal Entity Number**: เป็น unique identifier ที่สำคัญ ไม่ควรแก้ไขหลังจากสร้าง
3. **Soft Delete**: ใช้ soft delete เพื่อเก็บประวัติข้อมูล
4. **Foreign Key Constraints**: ตรวจสอบว่ามีข้อมูลที่เกี่ยวข้องก่อนลบ (เช่น monthly_tax_data, accounting_fees)
5. **Address Fields**: รองรับทั้ง full_address (textarea) และแยกฟิลด์ (detailed fields)

### Future Enhancements
- Export to Excel/PDF
- Bulk import from Excel
- Client history/audit log
- Related data view (tax data, accounting fees, etc.)
- Advanced search with multiple criteria
- Client statistics dashboard

---

## ✅ Implementation Status

### Components Created
- ✅ `src/pages/ClientManagement.tsx` - Main page component
- ✅ `src/components/Client/ClientList.tsx` - List component
- ✅ `src/components/Client/ClientDetail.tsx` - Detail component
- ✅ `src/components/Client/ClientForm.tsx` - Form component
- ✅ `src/components/Client/ClientDeleteModal.tsx` - Delete modal component
- ✅ `src/components/Client/ClientImport.tsx` - Excel import component

### Routes Added
- ✅ Route `/clients` added to `src/App.tsx`
- ✅ Menu item added to `src/utils/rolePermissions.ts`
- ✅ Icon added to `src/components/Layout/Sidebar.tsx`

### Features Implemented
- ✅ Client List View with Search, Filter, Sort, Pagination
- ✅ Client Detail View with all information cards
- ✅ Add Client Form with validation
- ✅ Edit Client Form with validation
- ✅ Delete Client with confirmation modal
- ✅ Excel Import with validation and preview
- ✅ Excel Template download
- ✅ Role-based access control
- ✅ Error handling and notifications

### Backend APIs Created
- ✅ `POST /api/clients/import/validate` - Validate Excel file
- ✅ `POST /api/clients/import` - Import clients from Excel

### Documentation Created
- ✅ `Documentation/Client/EXCEL_TEMPLATE_GUIDE.md` - Excel template guide
- ✅ `backend/scripts/generate-client-excel-template.js` - Template generator script

### Testing Status
- ⏳ Pending - CRUD operations testing
- ⏳ Pending - Validation testing
- ⏳ Pending - Error handling testing
- ⏳ Pending - Excel import testing

---

**Last Updated**: 2026-01-31
**Version**: 1.0.0
**Implementation Date**: 2026-01-31
