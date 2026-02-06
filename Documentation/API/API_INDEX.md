# 📚 API Index - BMU Work Management System

## 🎯 Overview

เอกสารนี้เป็น Index ของ API Endpoints ทั้งหมดในระบบ เพื่อให้ Cursor AI และ Developers สามารถตรวจสอบว่า API ที่ต้องการมีอยู่แล้วหรือไม่ก่อนสร้างใหม่

**Last Updated**: 2026-02-04 (Added Accounting Marketplace API endpoints)

## 🔌 Real-time Updates (WebSocket)

ระบบรองรับ WebSocket (Socket.io) สำหรับ real-time updates ของ Monthly Tax Data:
- **Event**: `monthly-tax-data:updated`
- **Room Pattern**: `monthly-tax-data:{employeeId}`
- **Documentation**: `Documentation/API/WEBSOCKET_IMPLEMENTATION.md`

---

## 📋 API Endpoints List

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ
- `GET /api/auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน

**Documentation**: `Documentation/API/AUTH_API.md` (ถ้ามี)

---

### Employees
- `GET /api/employees` - ดึงรายการพนักงาน (paginated)
- `GET /api/employees/:id` - ดึงข้อมูลพนักงานตาม ID
- `GET /api/employees/positions` - ดึงตำแหน่งทั้งหมด
- `GET /api/employees/statistics` - ดึงสถิติพนักงาน (Dashboard)
- `GET /api/employees/statistics/by-month/:month` - ดึงพนักงานตามเดือน
- `GET /api/employees/:id/working-days` - คำนวณวันทำงาน
- `GET /api/employees/:id/statistics` - ดึงสถิติพนักงานรายคน
- `POST /api/employees` - สร้างพนักงานใหม่
- `PUT /api/employees/:id` - แก้ไขข้อมูลพนักงาน
- `DELETE /api/employees/:id` - ลบพนักงาน (soft delete)
- `POST /api/employees/import` - นำเข้าข้อมูลพนักงานจาก Excel

**Documentation**: `Documentation/API/EMPLOYEE_API.md` (ถ้ามี)

---

### Users (User Accounts Management)
- `GET /api/users` - ดึงรายการ users (สามารถกรองตาม role และ status)
- `GET /api/users/:id` - ดึงข้อมูล user ตาม ID (Admin only)
- `POST /api/users` - สร้าง user account ใหม่ (Admin only) - **Returns temporary_password for one-time display**
- `PUT /api/users/:id` - แก้ไขข้อมูล user (Admin only)
- `DELETE /api/users/:id` - ลบ user account (Soft Delete, Admin only)
- `POST /api/users/:id/reset-password` - รีเซ็ตรหัสผ่าน user (Admin only) - **Returns temporary_password for one-time display**

**Documentation**: `Documentation/API/USER_MANAGEMENT_API.md` (ถ้ามี)

**Implementation Status**: ✅ Complete

**Access Control**: 
- `GET /api/users` - All authenticated users
- `GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` - Admin only

**Features**:
- ✅ Create user account (เชื่อมกับ employee หรือไม่เชื่อมก็ได้)
- ✅ Update user account (username, email, password, role, status, etc.)
- ✅ Delete user account (soft delete)
- ✅ View user details
- ✅ Search and filter by role, status, employee_id, name
- ✅ Auto-update employee.user_id when linking user to employee
- ✅ Prevent deleting own account
- ✅ **Display current password** in table and detail view (from `temporary_password` field)
- ✅ **Store temporary password** in database for Admin to view
- ✅ **Auto-clear temporary password** when user logs in successfully (for security)
- ✅ **Reset password** feature - Admin can reset user password and view new password

---

### Leave Requests
- `GET /api/leave-requests` - ดึงรายการการลาทั้งหมด
- `GET /api/leave-requests/pending` - ดึงการลาที่รออนุมัติ (HR/Admin only)
- `GET /api/leave-requests/:id` - ดึงข้อมูลการลาตาม ID
- `GET /api/leave-requests/dashboard/summary` - ดึงข้อมูล Dashboard การลา
- `POST /api/leave-requests` - สร้างการขอลาใหม่
- `PUT /api/leave-requests/:id/approve` - อนุมัติการลา (HR/Admin only)
- `PUT /api/leave-requests/:id/reject` - ปฏิเสธการลา (HR/Admin only)

**Documentation**: `Documentation/API/LEAVE_WFH_API.md`

**Implementation Status**: ✅ Complete

---

### WFH Requests
- `GET /api/wfh-requests` - ดึงรายการการขอ WFH ทั้งหมด
- `GET /api/wfh-requests/pending` - ดึงการขอ WFH ที่รออนุมัติ (HR/Admin only)
- `GET /api/wfh-requests/calendar` - ดึงข้อมูลสำหรับ Calendar view
- `GET /api/wfh-requests/:id` - ดึงข้อมูลการขอ WFH ตาม ID
- `GET /api/wfh-requests/dashboard/summary` - ดึงข้อมูล Dashboard WFH
- `GET /api/wfh-requests/dashboard/daily` - ดึงข้อมูล WFH รายวันสำหรับกราฟ (Admin only)
- `GET /api/wfh-requests/work-reports` - ดึงรายงานการทำงาน (แยกเป็นรายงานแล้ว และยังไม่ได้รายงาน) (Admin only)
- `POST /api/wfh-requests` - สร้างการขอ WFH ใหม่
- `PUT /api/wfh-requests/:id/approve` - อนุมัติการขอ WFH (HR/Admin only)
- `PUT /api/wfh-requests/:id/reject` - ปฏิเสธการขอ WFH (HR/Admin only)
- `PUT /api/wfh-requests/:id/work-report` - ส่งรายงานการทำงาน

**Documentation**: `Documentation/API/LEAVE_WFH_API.md`

**Implementation Status**: ✅ Complete

---

### Salary Advances
- `GET /api/salary-advances` - ดึงรายการการเบิกเงินเดือน
- `GET /api/salary-advances/:id` - ดึงข้อมูลการเบิกเงินเดือนตาม ID
- `POST /api/salary-advances` - สร้างการเบิกเงินเดือนใหม่
- `PUT /api/salary-advances/:id` - แก้ไขข้อมูลการเบิกเงินเดือน
- `PUT /api/salary-advances/:id/approve` - อนุมัติการเบิกเงินเดือน
- `PUT /api/salary-advances/:id/reject` - ปฏิเสธการเบิกเงินเดือน

**Documentation**: `Documentation/API/SALARY_ADVANCE_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### Office Attendance
- `GET /api/attendances` - ดึงรายการการเข้าออฟฟิศ
- `GET /api/attendances/:id` - ดึงข้อมูลการเข้าออฟฟิศตาม ID
- `POST /api/attendances` - บันทึกการเข้าออฟฟิศ
- `PUT /api/attendances/:id` - แก้ไขข้อมูลการเข้าออฟฟิศ

**Documentation**: `Documentation/API/ATTENDANCE_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### Document Management
- `GET /api/documents` - ดึงรายการเอกสาร
- `GET /api/documents/:id` - ดึงข้อมูลเอกสารตาม ID
- `POST /api/documents` - สร้างเอกสารใหม่
- `PUT /api/documents/:id` - แก้ไขข้อมูลเอกสาร
- `DELETE /api/documents/:id` - ลบเอกสาร

**Documentation**: `Documentation/API/DOCUMENT_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### Tax Management
- `GET /api/tax-documents` - ดึงรายการเอกสารภาษี
- `GET /api/tax-documents/:id` - ดึงข้อมูลเอกสารภาษีตาม ID
- `POST /api/tax-documents` - สร้างเอกสารภาษีใหม่
- `PUT /api/tax-documents/:id` - แก้ไขข้อมูลเอกสารภาษี

**Documentation**: `Documentation/API/TAX_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

## 🆕 Workflow System APIs (2026-01-30)

### Clients
- `GET /api/clients` - ดึงรายการลูกค้า (paginated, search, filter)
- `GET /api/clients/statistics` - ดึงสถิติสรุปข้อมูลลูกค้า (จำนวนทั้งหมด, สถานะบริษัท, สถานะจดภาษีมูลค่าเพิ่ม)
- `GET /api/clients/:build` - ดึงข้อมูลลูกค้าตาม Build code
- `POST /api/clients` - สร้างลูกค้าใหม่
- `PUT /api/clients/:build` - แก้ไขข้อมูลลูกค้า
- `DELETE /api/clients/:build` - ลบลูกค้า (soft delete)
- `POST /api/clients/import/validate` - ตรวจสอบไฟล์ Excel ก่อนนำเข้า
- `POST /api/clients/import` - นำเข้าข้อมูลลูกค้าจาก Excel

**Documentation**: 
- `Documentation/Guidebook_for_page/12_ClientManagement.md`
- `Documentation/Client/EXCEL_TEMPLATE_GUIDE.md`

**Implementation Status**: ✅ Complete (Backend + Frontend Service + Import)

---

### Accounting Fees
- `GET /api/accounting-fees/:build` - ดึงข้อมูลค่าทำบัญชีตาม Build
- `GET /api/accounting-fees/:build/:year` - ดึงข้อมูลค่าทำบัญชีตาม Build และ Year
- `POST /api/accounting-fees` - สร้างข้อมูลค่าทำบัญชีใหม่
- `PUT /api/accounting-fees/:id` - แก้ไขข้อมูลค่าทำบัญชี

**Documentation**: `Documentation/API/ACCOUNTING_FEES_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### DBD Info
- `GET /api/dbd-info/:build` - ดึงข้อมูลกรมพัฒนาธุรกิจตาม Build
- `POST /api/dbd-info` - สร้างข้อมูลกรมพัฒนาธุรกิจใหม่
- `PUT /api/dbd-info/:build` - แก้ไขข้อมูลกรมพัฒนาธุรกิจ

**Documentation**: `Documentation/API/DBD_INFO_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### BOI Info
- `GET /api/boi-info/:build` - ดึงข้อมูลรับสิท BOI ตาม Build
- `POST /api/boi-info` - สร้างข้อมูลรับสิท BOI ใหม่
- `PUT /api/boi-info/:build` - แก้ไขข้อมูลรับสิท BOI

**Documentation**: `Documentation/API/BOI_INFO_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

---

### Agency Credentials
- `GET /api/agency-credentials/:build` - ดึงข้อมูลรหัสแต่ละหน่วยงานตาม Build
- `POST /api/agency-credentials` - สร้างข้อมูลรหัสแต่ละหน่วยงานใหม่
- `PUT /api/agency-credentials/:build` - แก้ไขข้อมูลรหัสแต่ละหน่วยงาน

**Documentation**: `Documentation/API/AGENCY_CREDENTIALS_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

**Security Note**: รหัสผ่านควร Encrypt ก่อนเก็บใน Database

---

### Monthly Tax Data
- `GET /api/monthly-tax-data` - ดึงข้อมูลภาษีรายเดือน (paginated, filter by build, year, month, tax_inspection_responsible, accounting_responsible, wht_filer_employee_id, vat_filer_employee_id, document_entry_responsible)
  - **Filter Parameters**:
    - `tax_inspection_responsible` - Filter by tax inspection responsible employee_id (for ตรวจภาษี page)
    - `accounting_responsible` - Filter by accounting responsible employee_id (for สถานะยื่นภาษี and คัดแยกเอกสาร pages)
    - `wht_filer_employee_id` - Filter by WHT filer employee_id (for ยื่นภาษี page - WHT)
    - `vat_filer_employee_id` - Filter by VAT filer employee_id (for ยื่นภาษี page - VAT)
    - `document_entry_responsible` - Filter by document entry responsible employee_id (for คีย์เอกสาร page - pending development)
- `GET /api/monthly-tax-data/summary` - ดึง Summary สำหรับ Dashboard (เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
- `GET /api/monthly-tax-data/:build/:year/:month` - ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month
- `GET /api/monthly-tax-data/:id` - ดึงข้อมูลภาษีรายเดือนตาม ID
- `POST /api/monthly-tax-data` - สร้างข้อมูลภาษีรายเดือนใหม่
- `PUT /api/monthly-tax-data/:id` - แก้ไขข้อมูลภาษีรายเดือน

**Documentation**: 
- `Documentation/API/MONTHLY_TAX_DATA_API.md` - ✅ Complete API documentation
- `Documentation/API/MONTHLY_TAX_DATA_API_PERFORMANCE.md` - 🚀 Performance optimization สำหรับ monthly_tax_data API (indexes, DATE_FORMAT removal, WHERE clause optimization)
- `Documentation/API/INDEX_ANALYSIS_AND_RECOMMENDATIONS.md` - 📊 Analysis ของ indexes ปัจจุบันและคำแนะนำสำหรับการเพิ่ม indexes
- `Documentation/API/EXPLAIN_QUERY_ANALYSIS.md` - 📊 Analysis ของ EXPLAIN query results และคำแนะนำสำหรับการปรับปรุง
- `Documentation/API/TAX_STATUS_PERFORMANCE_OPTIMIZATION.md` - Performance optimization recommendations (Frontend)
- `Documentation/API/DATA_UPDATE_PERFORMANCE_ISSUE.md` - Data update performance issue and fixes
- `Documentation/API/REALTIME_UPDATE_OPTIMIZATION.md` - ⚡ Real-time update optimization - การอัพเดทแบบเรียลไทม์สำหรับตารางรายการงานที่รับผิดชอบ
- `Documentation/API/WEBSOCKET_IMPLEMENTATION.md` - 🔌 WebSocket Implementation Guide - คู่มือการใช้งาน WebSocket สำหรับ real-time updates

**Implementation Status**: ✅ Complete (Backend + Frontend Service + SummaryCard Component Updated)

**Connection Points**:
- หน้า ตรวจภาษี (`TaxInspection.tsx`) → `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary`
- หน้าสถานะยื่นภาษี (`TaxFilingStatus.tsx`) → `GET /api/monthly-tax-data` + `GET /api/monthly-tax-data/summary`
- หน้ายื่นภาษี (`TaxFiling.tsx`) → `GET /api/monthly-tax-data` + `POST /api/monthly-tax-data` + `PUT /api/monthly-tax-data/:id`

---

### Document Entry Work
- `GET /api/document-entry-work` - ดึงรายการงานคีย์เอกสาร (paginated, filter by build, year, month, accounting_responsible, document_entry_responsible)
  - **Filter Parameters**:
    - `accounting_responsible` - Filter by accounting responsible employee_id (for คัดแยกเอกสาร page)
    - `document_entry_responsible` - Filter by document entry responsible employee_id (for คีย์เอกสาร page)
      - Logic: ถ้า `current_responsible_employee_id` มีค่า → ใช้ `current_responsible_employee_id`
      - ถ้า `current_responsible_employee_id` เป็น NULL → ใช้ `responsible_employee_id`
- `GET /api/document-entry-work/summary` - สรุปข้อมูลการคีย์เอกสาร (รายวัน/รายเดือน) พร้อมรายละเอียดแต่ละ Build
- `GET /api/document-entry-work/:build/:year/:month` - ดึงข้อมูลงานคีย์เอกสารตาม Build, Year, Month (รวม bots)
- `GET /api/document-entry-work/:id` - ดึงข้อมูลงานคีย์เอกสารตาม ID (รวม bots)
- `POST /api/document-entry-work` - สร้างงานคีย์เอกสารใหม่ (พร้อม bots และ notification)
- `PUT /api/document-entry-work/:id` - แก้ไขข้อมูลงานคีย์เอกสาร (พร้อม bots, รองรับ partial update สำหรับ return_comment)
- `PATCH /api/document-entry-work/:id/status` - อัพเดทสถานะการคีย์เอกสาร (WHT, VAT, Non-VAT) พร้อม notification ไปยัง accounting_responsible

**Documentation**: `Documentation/API/DOCUMENT_ENTRY_WORK_API.md` ✅ Complete

**Implementation Status**: ✅ Complete (Backend + Frontend Service + Document Sorting Page + Document Entry Page)

**Connection Points**:
- หน้า คัดแยกเอกสาร (`DocumentSorting.tsx`) → `GET /api/document-entry-work` + `GET /api/document-entry-work/:build/:year/:month` + `POST /api/document-entry-work` + `PUT /api/document-entry-work/:id`
- หน้า คีย์เอกสาร (`DocumentEntry.tsx`) → `GET /api/document-entry-work` + `GET /api/document-entry-work/summary` + `GET /api/document-entry-work/:build/:year/:month` + `PATCH /api/document-entry-work/:id/status` + `PUT /api/document-entry-work/:id`

**Features**:
- ✅ Filter by `document_entry_responsible` (with `current_responsible_employee_id` logic)
- ✅ Summary API with detailed breakdown by Build (WHT, VAT, Non-VAT status)
- ✅ Status update with notifications to `accounting_responsible`
- ✅ Return comment update with notifications
- ✅ Support for multiple submissions per company (submission_count)

---

### Accounting Marketplace (ตลาดกลางผู้ทำบัญชี)
- `GET /api/accounting-marketplace` - ดึงรายการงานที่ขายได้ (Available Jobs) - Filter by tax_year, tax_month, build, search
- `GET /api/accounting-marketplace/my-listings` - ดึงรายการงานที่ฉันขาย (My Listings) - Filter by status, build, search
- `GET /api/accounting-marketplace/purchased` - ดึงรายการงานที่ฉันซื้อ (Purchased Jobs) - Filter by tax_year, tax_month, build, search
- `GET /api/accounting-marketplace/history` - ประวัติการซื้อขาย - Filter by type (sell/buy), tax_year, tax_month, build, search
- `GET /api/accounting-marketplace/buyer-income` - รายได้รายเดือนของคนที่ซื้องาน - Group by tax_year, tax_month, sold_to_employee_id
- `POST /api/accounting-marketplace` - สร้างรายการขายงาน (ต้องเป็น accounting_responsible, ราคาขั้นต่ำ 300 บาท, เดือนภาษีปัจจุบันเท่านั้น)
- `POST /api/accounting-marketplace/:id/purchase` - ซื้องาน (ต้องมี role ที่ถูกต้อง, อัพเดท accounting_responsible อัตโนมัติ, ส่ง notification)
- `POST /api/accounting-marketplace/:id/cancel` - ยกเลิกรายการขาย (ต้องเป็น seller)

**Documentation**: `Documentation/API/ACCOUNTING_MARKETPLACE_API.md` (ถ้ามี)

**Implementation Status**: ✅ Complete (Backend + Frontend Service + Accounting Marketplace Page)

**Connection Points**:
- หน้า ตลาดกลางผู้ทำบัญชี (`AccountingMarketplace.tsx`) → ทุก endpoints

**Features**:
- ✅ ขายงานผู้ทำบัญชีที่รับผิดชอบ (accounting_responsible) ให้กับพนักงานคนอื่น
- ✅ ราคาขั้นต่ำ 300 บาท (ผู้ขายกำหนดราคาเอง)
- ✅ เมื่อมีการซื้อ ระบบจะอัพเดท accounting_responsible ใน monthly_tax_data และ work_assignments อัตโนมัติ
- ✅ ส่งแจ้งเตือนให้ seller เมื่องานถูกซื้อ
- ✅ รองรับเฉพาะเดือนภาษีปัจจุบัน (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
- ✅ Validation: ผู้ขายต้องเป็น accounting_responsible, ผู้ซื้อต้องมี role ที่ถูกต้อง (admin, data_entry_and_service, audit, service)
- ✅ รายได้รายเดือนของคนที่ซื้องาน (Group by month, Sum price)

**Access Control**:
- ผู้ขาย: เฉพาะผู้ทำบัญชีที่รับผิดชอบ (accounting_responsible) เท่านั้น
- ผู้ซื้อ: Role `admin`, `data_entry_and_service`, `audit`, `service`

---

### Work Assignments (การจัดงานรายเดือน)
- `GET /api/work-assignments` - ดึงรายการการจัดงานทั้งหมด (paginated, filter by build, year, month)
- `POST /api/work-assignments/bulk-by-builds` - ดึงข้อมูลการจัดงานหลายรายการพร้อมกันตาม Build Codes, Year, Month (Bulk Query) - **แนะนำใช้สำหรับ Bulk Operations**
- `POST /api/work-assignments/check-duplicates` - ตรวจสอบข้อมูลซ้ำสำหรับหลาย Build codes ในเดือนภาษีเดียวกัน - **ใช้สำหรับตรวจสอบก่อนบันทึก**
- `POST /api/work-assignments/import/validate` - ตรวจสอบไฟล์ Excel ก่อนนำเข้าข้อมูลการจัดงาน (Excel Import Validation)
- `POST /api/work-assignments/import` - นำเข้าข้อมูลการจัดงานจากไฟล์ Excel (Excel Import)
- `GET /api/work-assignments/:build/:year/:month` - ดึงข้อมูลการจัดงานตาม Build, Year, Month (Single Query)
- `GET /api/work-assignments/:id` - ดึงข้อมูลการจัดงานตาม ID
- `POST /api/work-assignments` - สร้างการจัดงานใหม่ (พร้อมรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` อัตโนมัติ)
- `POST /api/work-assignments/bulk-create` - สร้างการจัดงานหลายรายการพร้อมกัน (Background Job) - **แนะนำใช้สำหรับ Bulk Creation (100+ records)**
- `GET /api/work-assignments/bulk-create/:jobId` - ตรวจสอบสถานะของ bulk assignment creation job
- `PUT /api/work-assignments/:id` - แก้ไขการจัดงาน (พร้อมรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` อัตโนมัติ)
- `POST /api/work-assignments/:id/reset-data` - รีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับการจัดงานนี้ (Manual Reset)

**Documentation**: `Documentation/API/WORK_ASSIGNMENTS_API.md` (ถ้ามี)

**Implementation Status**: ✅ Complete (Backend + Frontend Service + WorkAssignment Page)

**Documentation**: `Documentation/API/WORK_ASSIGNMENTS_API.md` (ถ้ามี)

**Implementation Status**: ⏳ Pending

**Important**: 
- เมื่อมีการสร้าง/แก้ไข `work_assignments` ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` อัตโนมัติ
- ผู้ใช้งาน (Admin/HR) จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน

---

## 🔍 How to Use This Index

### Before Creating New API

1. **ตรวจสอบ API Index**: ตรวจสอบว่า API ที่ต้องการมีอยู่แล้วหรือไม่
2. **อ่าน Documentation**: ถ้ามี API อยู่แล้ว ให้อ่าน Documentation เพื่อดูรายละเอียด
3. **ใช้ API ที่มีอยู่**: ถ้ามี API ที่ตรงกับความต้องการ ให้ใช้ API ที่มีอยู่แทนการสร้างใหม่
4. **สร้าง API ใหม่**: ถ้าไม่มี API ที่ตรงกับความต้องการ ให้สร้างใหม่และอัพเดท Index นี้ทันที

### When Creating New API

1. **สร้าง API Route**: สร้างไฟล์ route ใน `backend/routes/`
2. **สร้าง API Documentation**: สร้างไฟล์ documentation ใน `Documentation/API/`
3. **อัพเดท API Index**: เพิ่ม API endpoint ใหม่ใน Index นี้
4. **อัพเดท Page Documentation**: อัพเดท `Documentation/Guidebook_for_page/[PageName].md` ถ้ามี

---

## 📝 Notes

- **Status Legend**:
  - ✅ Complete - พัฒนาเสร็จแล้ว พร้อมใช้งาน
  - ⏳ Pending - ยังไม่ได้พัฒนา
  - 🚧 In Progress - กำลังพัฒนา

- **Documentation**: ถ้ามี Documentation file ให้ระบุ path ไว้

---

## 📊 Workflow System API Summary

### API Groups
1. **Clients** - ข้อมูลลูกค้า (5 endpoints)
2. **Accounting Fees** - ข้อมูลค่าทำบัญชี (4 endpoints)
3. **DBD Info** - ข้อมูลกรมพัฒนาธุรกิจ (3 endpoints)
4. **BOI Info** - ข้อมูลรับสิท BOI (3 endpoints)
5. **Agency Credentials** - ข้อมูลรหัสแต่ละหน่วยงาน (3 endpoints)
6. **Monthly Tax Data** - ข้อมูลภาษีรายเดือน (6 endpoints) - ⚠️ รีเซ็ตทุกเดือน
7. **Document Entry Work** - ข้อมูลงานคีย์เอกสาร (8 endpoints) - ⚠️ รีเซ็ตทุกเดือน
8. **Work Assignments** - ข้อมูลการจัดงานรายเดือน (10 endpoints) - ⚠️ เมื่อมีการจัดงานใหม่จะรีเซ็ตข้อมูลอื่นๆ - **มี Bulk API สำหรับดึงข้อมูลหลายรายการพร้อมกัน, Background Job สำหรับ Bulk Creation, และ Check Duplicates API สำหรับตรวจสอบข้อมูลซ้ำ**

### Total: 41 API Endpoints สำหรับ Workflow System

---

---

## Notifications (ระบบแจ้งเตือน)

### Endpoints

- `GET /api/notifications` - ดึงรายการ notifications ของ user ที่ล็อกอินอยู่ (query params: `is_read`, `limit`)
- `POST /api/notifications` - สร้าง notification ใหม่ (Admin only)
- `PUT /api/notifications/:id/read` - ทำเครื่องหมายว่าอ่านแล้ว
- `PUT /api/notifications/read-all` - ทำเครื่องหมายว่าอ่านทั้งหมด
- `DELETE /api/notifications/:id` - ลบ notification (soft delete)
- `POST /api/notifications/cleanup-expired` - ลบ notification ที่หมดอายุ (12 ชั่วโมงหลังจาก read_at) (Admin only)

**Features**:
- ✅ แสดงการแจ้งเตือนใน Header (ปุ่ม "แจ้งเตือน")
- ✅ Badge แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
- ✅ Dropdown/Menu แสดงรายการการแจ้งเตือน
- ✅ แจ้งเตือนเมื่อมีการเปลี่ยนรหัสผ่าน
- ✅ แจ้งเตือนเมื่อส่งรอตรวจ (tax_review_pending, tax_review_pending_recheck)
- ✅ Auto-mark as read เมื่อผู้รับผิดชอบเปิดดูข้อมูลบริษัท
- ✅ Auto-delete หลังจาก 12 ชั่วโมงหลังจาก read_at (scheduled job ทุกชั่วโมง)
- ✅ Admin สามารถดู, อ่าน, และลบการแจ้งเตือนได้
- ✅ Auto-refresh every 30 seconds

**Documentation**: `Documentation/Agent_cursor_ai/USER_MANAGEMENT_SYSTEM.md`

**Implementation Status**: ✅ Complete

---

## Authentication (เพิ่ม Change Password)

### Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- **`POST /api/auth/change-password`** - เปลี่ยนรหัสผ่าน (สำหรับพนักงานเปลี่ยนรหัสผ่านเอง)

**Features**:
- ✅ พนักงานสามารถเปลี่ยนรหัสผ่านของตัวเองได้
- ✅ ต้องกรอกรหัสผ่านปัจจุบันเพื่อยืนยัน
- ✅ ตั้งรหัสผ่านใหม่ (ต้องยืนยันรหัสผ่าน)
- ✅ Validation: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
- ✅ **อัพเดท temporary_password อัตโนมัติ** เพื่อให้ Admin ยังคงเห็นรหัสผ่านได้
- ✅ **สร้าง Notification อัตโนมัติ** เพื่อแจ้งเตือน Admin ว่ามีการเปลี่ยนรหัสผ่าน

**Documentation**: `Documentation/Agent_cursor_ai/USER_MANAGEMENT_SYSTEM.md`

**Implementation Status**: ✅ Complete

---

**Last Updated**: 2026-01-31  
**Maintainer**: Cursor AI
