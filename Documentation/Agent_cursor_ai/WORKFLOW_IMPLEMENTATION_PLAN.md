# 📋 Workflow Implementation Plan - ระบบการรับส่งงานภายใน

## 🎯 Overview

เอกสารนี้เป็นแผนการพัฒนาระบบการรับส่งงานภายในตาม requirements ที่ระบุไว้ใน `Documentation/Database/MyDatabase/work_flow.md`

**Last Updated**: 2026-01-30

---

## 📊 Current Status

### ✅ Completed
- Database Schema Design: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`
- Basic Tables: `users`, `employees`, `leave_requests`, `wfh_requests`
- Frontend Pages: ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี (UI only, no backend connection)

### ⏳ Pending
- Database Tables: `clients`, `accounting_fees`, `dbd_info`, `boi_info`, `agency_credentials`, `monthly_tax_data`, `document_entry_work`
- API Routes: สำหรับ CRUD operations ของทุกตาราง
- Frontend Integration: เชื่อมหน้า UI กับ API
- Document Entry Page: หน้า คีย์เอกสาร (ยังไม่มี)

---

## 🗂️ Database Tables to Create

### Priority 1: Core Tables (ต้องสร้างก่อน)

1. **clients** - ข้อมูลลูกค้า (Primary Table)
   - Migration: `009_create_clients_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 1

2. **monthly_tax_data** - ข้อมูลภาษีรายเดือน (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
   - Migration: `010_create_monthly_tax_data_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 6

3. **document_entry_work** - ข้อมูลงานคีย์เอกสาร (เชื่อมกับหน้า คีย์เอกสาร)
   - Migration: `011_create_document_entry_work_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 7

### Priority 2: Supporting Tables

4. **accounting_fees** - ข้อมูลค่าทำบัญชี
   - Migration: `012_create_accounting_fees_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 2

5. **dbd_info** - ข้อมูลกรมพัฒนาธุรกิจ
   - Migration: `013_create_dbd_info_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 3

6. **boi_info** - ข้อมูลรับสิท BOI
   - Migration: `014_create_boi_info_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 4

7. **agency_credentials** - ข้อมูลรหัสแต่ละหน่วยงาน
   - Migration: `015_create_agency_credentials_table.sql`
   - Reference: `WORKFLOW_DATABASE_DESIGN.md` section 5
   - **Security Note**: ต้อง Encrypt รหัสผ่านก่อนเก็บ

---

## 🔌 API Routes to Create

### Priority 1: Core APIs (เชื่อมกับ Frontend ที่มีอยู่)

#### Clients API
- `GET /api/clients` - ดึงรายการลูกค้า (paginated, search, filter)
- `GET /api/clients/:build` - ดึงข้อมูลลูกค้าตาม Build code
- `POST /api/clients` - สร้างลูกค้าใหม่
- `PUT /api/clients/:build` - แก้ไขข้อมูลลูกค้า
- `DELETE /api/clients/:build` - ลบลูกค้า (soft delete)

**File**: `backend/routes/clients.js`

#### Monthly Tax Data API
- `GET /api/monthly-tax-data` - ดึงข้อมูลภาษีรายเดือน (paginated, filter by build, year, month)
- `GET /api/monthly-tax-data/:build/:year/:month` - ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month
- `POST /api/monthly-tax-data` - สร้างข้อมูลภาษีรายเดือนใหม่
- `PUT /api/monthly-tax-data/:id` - แก้ไขข้อมูลภาษีรายเดือน
- `GET /api/monthly-tax-data/summary` - ดึง Summary สำหรับ Dashboard (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)

**File**: `backend/routes/monthly-tax-data.js`

**Connection Points**:
- หน้า ตรวจภาษี (`TaxInspection.tsx`) → `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary`
- หน้าสถานะยื่นภาษี (`TaxFilingStatus.tsx`) → `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary`
- หน้ายื่นภาษี (`TaxFiling.tsx`) → `GET /api/monthly-tax-data` + `POST /api/monthly-tax-data` + `PUT /api/monthly-tax-data/:id`

#### Document Entry Work API
- `GET /api/document-entry-work` - ดึงรายการงานคีย์เอกสาร (paginated, filter by build, employee, status)
- `GET /api/document-entry-work/:id` - ดึงข้อมูลงานคีย์เอกสารตาม ID
- `POST /api/document-entry-work` - สร้างงานคีย์เอกสารใหม่
- `PUT /api/document-entry-work/:id` - แก้ไขข้อมูลงานคีย์เอกสาร
- `PUT /api/document-entry-work/:id/change-responsible` - เปลี่ยนผู้รับผิดชอบ
- `PUT /api/document-entry-work/:id/update-status` - อัพเดทสถานะการคีย์ (WHT/VAT/Non-VAT)

**File**: `backend/routes/document-entry-work.js`

**Connection Points**:
- หน้า คีย์เอกสาร (ยังไม่มี) → ต้องสร้างหน้าใหม่

### Priority 2: Supporting APIs

#### Accounting Fees API
- `GET /api/accounting-fees/:build` - ดึงข้อมูลค่าทำบัญชีตาม Build
- `GET /api/accounting-fees/:build/:year/:month` - ดึงข้อมูลค่าทำบัญชีตาม Build, Year, Month
- `POST /api/accounting-fees` - สร้างข้อมูลค่าทำบัญชีใหม่
- `PUT /api/accounting-fees/:id` - แก้ไขข้อมูลค่าทำบัญชี

**File**: `backend/routes/accounting-fees.js`

#### DBD Info API
- `GET /api/dbd-info/:build` - ดึงข้อมูลกรมพัฒนาธุรกิจตาม Build
- `POST /api/dbd-info` - สร้างข้อมูลกรมพัฒนาธุรกิจใหม่
- `PUT /api/dbd-info/:build` - แก้ไขข้อมูลกรมพัฒนาธุรกิจ

**File**: `backend/routes/dbd-info.js`

#### BOI Info API
- `GET /api/boi-info/:build` - ดึงข้อมูลรับสิท BOI ตาม Build
- `POST /api/boi-info` - สร้างข้อมูลรับสิท BOI ใหม่
- `PUT /api/boi-info/:build` - แก้ไขข้อมูลรับสิท BOI

**File**: `backend/routes/boi-info.js`

#### Agency Credentials API
- `GET /api/agency-credentials/:build` - ดึงข้อมูลรหัสแต่ละหน่วยงานตาม Build
- `POST /api/agency-credentials` - สร้างข้อมูลรหัสแต่ละหน่วยงานใหม่
- `PUT /api/agency-credentials/:build` - แก้ไขข้อมูลรหัสแต่ละหน่วยงาน
- **Security**: ต้อง Encrypt/Decrypt รหัสผ่าน

**File**: `backend/routes/agency-credentials.js`

---

## 🎨 Frontend Pages to Update/Create

### Priority 1: Update Existing Pages

#### 1. Tax Inspection Page (`src/pages/TaxInspection.tsx`)
**Current Status**: มี UI แต่ยังไม่เชื่อมกับ API

**Actions**:
- สร้าง Service: `src/services/monthlyTaxDataService.ts`
- อัพเดท Component ให้เรียก API `GET /api/monthly-tax-data` และ `GET /api/monthly-tax-data/summary`
- อัพเดท Form Submit ให้เรียก API `PUT /api/monthly-tax-data/:id`

**Reference**: `Documentation/Guidebook_for_page/09_TaxInspection.md`

#### 2. Tax Filing Status Page (`src/pages/TaxFilingStatus.tsx`)
**Current Status**: มี UI แต่ยังไม่เชื่อมกับ API

**Actions**:
- ใช้ Service เดียวกัน: `src/services/monthlyTaxDataService.ts`
- อัพเดท Component ให้เรียก API `GET /api/monthly-tax-data` และ `GET /api/monthly-tax-data/summary`

**Reference**: `Documentation/Guidebook_for_page/10_TaxFilingStatus.md`

#### 3. Tax Filing Page (`src/pages/TaxFiling.tsx`)
**Current Status**: มี UI แต่ยังไม่เชื่อมกับ API

**Actions**:
- ใช้ Service เดียวกัน: `src/services/monthlyTaxDataService.ts`
- อัพเดท Component ให้เรียก API `GET /api/monthly-tax-data`, `POST /api/monthly-tax-data`, `PUT /api/monthly-tax-data/:id`

**Reference**: `Documentation/Guidebook_for_page/11_TaxFiling.md`

### Priority 2: Create New Pages

#### 4. Document Entry Work Page (`src/pages/DocumentEntryWork.tsx`)
**Current Status**: ยังไม่มี

**Actions**:
- สร้าง Component ใหม่
- สร้าง Service: `src/services/documentEntryWorkService.ts`
- ออกแบบ UI ตาม requirements ใน `work_flow.md` section "ข้อมูลงานคีย์เอกสาร"
- Features:
  - แสดงรายการงานคีย์เอกสาร (Filter by Build, Employee, Status)
  - Form สำหรับสร้างงานคีย์เอกสารใหม่
  - Form สำหรับแก้ไขข้อมูลงานคีย์เอกสาร
  - ระบบเปลี่ยนผู้รับผิดชอบ
  - ระบบอัพเดทสถานะการคีย์ (WHT/VAT/Non-VAT)
  - แสดงจำนวนเอกสารและสถานะการคีย์

**Reference**: `Documentation/Database/MyDatabase/work_flow.md` (lines 132-158)

---

## 📝 Documentation to Update

### 1. API Documentation
- `Documentation/API/API_INDEX.md` - เพิ่ม API endpoints ใหม่ทั้งหมด
- `Documentation/API/CLIENTS_API.md` - สร้างใหม่
- `Documentation/API/MONTHLY_TAX_DATA_API.md` - สร้างใหม่
- `Documentation/API/DOCUMENT_ENTRY_WORK_API.md` - สร้างใหม่
- `Documentation/API/ACCOUNTING_FEES_API.md` - สร้างใหม่
- `Documentation/API/DBD_INFO_API.md` - สร้างใหม่
- `Documentation/API/BOI_INFO_API.md` - สร้างใหม่
- `Documentation/API/AGENCY_CREDENTIALS_API.md` - สร้างใหม่

### 2. Page Guidebooks
- `Documentation/Guidebook_for_page/09_TaxInspection.md` - อัพเดท API endpoints
- `Documentation/Guidebook_for_page/10_TaxFilingStatus.md` - อัพเดท API endpoints
- `Documentation/Guidebook_for_page/11_TaxFiling.md` - อัพเดท API endpoints
- `Documentation/Guidebook_for_page/12_DocumentEntryWork.md` - สร้างใหม่

### 3. Database Documentation
- `Documentation/Database/schema.md` - เพิ่มตารางใหม่ทั้งหมด
- `Documentation/Database/relationships.md` - อัพเดท ER Diagram

---

## 🚀 Implementation Steps

### Phase 1: Database Setup (Week 1)
1. ✅ สร้าง Database Design Document (`WORKFLOW_DATABASE_DESIGN.md`)
2. ⏳ สร้าง Migration Files สำหรับทุกตาราง
3. ⏳ รัน Migrations บน Development Database
4. ⏳ ทดสอบ Database Schema

### Phase 2: Core APIs (Week 2-3)
1. ⏳ สร้าง `clients.js` API Route
2. ⏳ สร้าง `monthly-tax-data.js` API Route
3. ⏳ สร้าง `document-entry-work.js` API Route
4. ⏳ ทดสอบ APIs ด้วย Postman/Thunder Client

### Phase 3: Frontend Integration (Week 4)
1. ⏳ สร้าง Services (`monthlyTaxDataService.ts`, `documentEntryWorkService.ts`)
2. ⏳ อัพเดท Tax Inspection Page
3. ⏳ อัพเดท Tax Filing Status Page
4. ⏳ อัพเดท Tax Filing Page
5. ⏳ สร้าง Document Entry Work Page

### Phase 4: Supporting Features (Week 5)
1. ⏳ สร้าง Supporting APIs (accounting-fees, dbd-info, boi-info, agency-credentials)
2. ⏳ สร้าง Frontend Components สำหรับ Supporting Features (ถ้าจำเป็น)

### Phase 5: Documentation & Testing (Week 6)
1. ⏳ อัพเดท API Documentation
2. ⏳ อัพเดท Page Guidebooks
3. ⏳ อัพเดท Database Documentation
4. ⏳ เขียน Unit Tests สำหรับ APIs
5. ⏳ Integration Testing

---

## 🔐 Security Considerations

### 1. Agency Credentials
- **Encryption**: ต้อง Encrypt รหัสผ่านก่อนเก็บใน Database
- **Decryption**: ต้อง Decrypt เมื่อดึงข้อมูลออกมา (เฉพาะ Role ที่มีสิทธิ์)
- **Access Control**: จำกัดสิทธิ์การเข้าถึง (เฉพาะ Role ที่จำเป็น)

### 2. API Authentication
- ทุก API Route ต้องมี Authentication Middleware
- ตรวจสอบ Role Permissions สำหรับแต่ละ Endpoint

### 3. Data Validation
- Validate Input Data ก่อนบันทึกลง Database
- Sanitize User Input เพื่อป้องกัน SQL Injection, XSS

---

## 📊 Performance Considerations

### 1. Database Indexing
- สร้าง Indexes สำหรับ Foreign Keys
- สร้าง Indexes สำหรับ Columns ที่ใช้ Filter/Search บ่อย
- ใช้ Composite Indexes สำหรับ Unique Constraints

### 2. API Optimization
- ใช้ Pagination สำหรับ List APIs
- ใช้ Caching สำหรับข้อมูลที่ไม่เปลี่ยนบ่อย (เช่น clients list)
- Optimize Queries เพื่อลดจำนวน Database Calls

### 3. Frontend Optimization
- ใช้ React Query สำหรับ Data Fetching และ Caching
- ใช้ Lazy Loading สำหรับ Pages ที่ไม่ใช้บ่อย
- Optimize Re-renders ด้วย useMemo, useCallback

---

## ✅ Checklist

### Database
- [ ] สร้าง Migration Files ทั้งหมด
- [ ] รัน Migrations บน Development
- [ ] ทดสอบ Database Schema
- [ ] อัพเดท `schema.md`
- [ ] อัพเดท `relationships.md`

### Backend APIs
- [ ] สร้าง `clients.js` Route
- [ ] สร้าง `monthly-tax-data.js` Route
- [ ] สร้าง `document-entry-work.js` Route
- [ ] สร้าง Supporting Routes (accounting-fees, dbd-info, boi-info, agency-credentials)
- [ ] เพิ่ม Routes ใน `server.js`
- [ ] ทดสอบ APIs

### Frontend Services
- [ ] สร้าง `monthlyTaxDataService.ts`
- [ ] สร้าง `documentEntryWorkService.ts`
- [ ] สร้าง Supporting Services (ถ้าจำเป็น)

### Frontend Pages
- [ ] อัพเดท Tax Inspection Page
- [ ] อัพเดท Tax Filing Status Page
- [ ] อัพเดท Tax Filing Page
- [ ] สร้าง Document Entry Work Page

### Documentation
- [ ] อัพเดท `API_INDEX.md`
- [ ] สร้าง API Documentation Files
- [ ] อัพเดท Page Guidebooks
- [ ] อัพเดท Database Documentation

### Testing
- [ ] เขียน Unit Tests สำหรับ APIs
- [ ] Integration Testing
- [ ] Update `TEST_LOG.md`

---

## 📚 References

- **Workflow Requirements**: `Documentation/Database/MyDatabase/work_flow.md`
- **Database Design**: `Documentation/Database/MyDatabase/WORKFLOW_DATABASE_DESIGN.md`
- **API Index**: `Documentation/API/API_INDEX.md`
- **Page Guidebooks**: `Documentation/Guidebook_for_page/`

---

**Last Updated**: 2026-01-30  
**Maintainer**: Cursor AI
