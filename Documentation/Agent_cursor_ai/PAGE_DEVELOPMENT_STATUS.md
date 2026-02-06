# 📊 Page Development Status Tracker

## 🎯 วัตถุประสงค์

ไฟล์นี้ใช้สำหรับติดตามสถานะการพัฒนาของแต่ละหน้าในระบบ BMU Work Management System เพื่อให้:
- ✅ ติดตามความคืบหน้าการพัฒนาของแต่ละหน้า
- ✅ รู้ว่าหน้าไหนมีฟีเจอร์อะไรบ้าง
- ✅ รู้ว่าหน้าไหนเรียกใช้ API อะไรบ้าง
- ✅ รู้ว่าหน้าไหนยังพัฒนาไม่เสร็จ
- ✅ ช่วยในการวางแผนการพัฒนาต่อไป

---

## 📋 โครงสร้างการบันทึก

แต่ละหน้า จะมีข้อมูลดังนี้:
- **Page Name**: ชื่อหน้า
- **Route**: Route path
- **Status**: Development Status (✅ Complete / 🚧 In Progress / 📋 Planned / ⚠️ Needs Update)
- **Last Updated**: วันที่อัพเดตล่าสุด
- **Features**: ฟีเจอร์ที่มีในหน้านี้
- **APIs Used**: API endpoints ที่เรียกใช้
- **Components**: Components ที่ใช้ในหน้านี้
- **Notes**: หมายเหตุเพิ่มเติม

---

## 📄 Pages

### 1. Login
- **Route**: `/login`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-31 (Updated: Enhanced Error Handling)
- **Features**:
  - ✅ User authentication
  - ✅ Role-based redirect
  - ✅ Remember me functionality
  - ✅ Enhanced error handling with specific error messages
  - ✅ Network error detection
  - ✅ Account lockout handling
  - ✅ Validation error handling
- **APIs Used**:
  - `POST /api/auth/login`
- **Components**:
  - `src/pages/Login.tsx`
- **Notes**: 
  - รองรับ Role-based redirect
  - มี Rate limiting protection
  - มี Account lockout protection
  - Error messages ชัดเจนและแนะนำวิธีแก้ไข
  - ตรวจสอบ Network Error และแนะนำให้ตรวจสอบ Backend server
- **Recent Updates** (2026-01-31):
  - ✅ ปรับปรุง Error Handling ให้ชัดเจนขึ้น
  - ✅ เพิ่มการตรวจสอบ Network Error (ECONNREFUSED)
  - ✅ เพิ่มการแยกประเภท Error (Network, Validation, Authentication, Account Locked)
  - ✅ เพิ่ม Error Messages ที่เป็นมิตรกับผู้ใช้และแนะนำวิธีแก้ไข

---

### 2. Dashboard
- **Route**: `/dashboard`
- **Status**: ✅ Complete
- **Last Updated**: 2026-02-06
- **Features**:
  - ✅ Role-based dashboard (admin, data_entry, data_entry_and_service, audit, service)
  - ✅ Statistics cards จาก API จริง (พนักงานทั้งหมด, การลาที่รออนุมัติ) + fallback
  - ✅ Loading skeleton ขณะดึงข้อมูล
  - ✅ Different views per role
- **APIs Used**:
  - `GET /api/employees/statistics` - พนักงานทั้งหมด
  - `GET /api/leave-requests/dashboard/summary` - สรุปการลา
  - `GET /api/leave-requests/pending` (limit=1) - จำนวนการลาที่รออนุมัติ
  - `GET /api/wfh-requests/dashboard/summary` - สรุป WFH
- **Components**:
  - `src/pages/Dashboard.tsx`
- **Notes**:
  - เชื่อม API จริงแล้วสำหรับ employee stats และ leave pending count
  - ค่าที่ยังไม่มี API (เบิกเงินเดือน, เอกสารที่รอคีย์, ยื่นภาษี) แสดง "–" หรือจะเชื่อมเมื่อมี API

---

### 3. Employee Management (ข้อมูลพนักงาน)
- **Route**: `/employees`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-29
- **Features**:
  - ✅ CRUD operations
  - ✅ Search and filter
  - ✅ Pagination
  - ✅ Excel import
  - ✅ Role-based access control
- **APIs Used**:
  - `GET /api/employees` - Get employee list
  - `GET /api/employees/:id` - Get employee detail
  - `POST /api/employees` - Create employee
  - `PUT /api/employees/:id` - Update employee
  - `DELETE /api/employees/:id` - Delete employee
  - `POST /api/employees/import` - Import from Excel
  - `GET /api/employees/statistics` - Get statistics
- **Components**:
  - `src/pages/EmployeeManagement.tsx`
  - `src/components/Employee/EmployeeList.tsx`
  - `src/components/Employee/EmployeeForm.tsx`
  - `src/components/Employee/EmployeeDetail.tsx`
  - `src/components/Employee/EmployeeImport.tsx`
- **Notes**: 
  - รองรับ Excel import
  - มี Statistics summary

---

### 4. Leave Management (ลางาน/WFH)
- **Route**: `/leave`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-30
- **Features**:
  - ✅ Leave request management
  - ✅ WFH request management
  - ✅ Approval workflow
  - ✅ Calendar view
  - ✅ Dashboard view
- **APIs Used**:
  - `GET /api/leave-requests` - Get leave requests
  - `POST /api/leave-requests` - Create leave request
  - `PUT /api/leave-requests/:id` - Update leave request
  - `DELETE /api/leave-requests/:id` - Delete leave request
  - `POST /api/leave-requests/:id/approve` - Approve leave request
  - `POST /api/leave-requests/:id/reject` - Reject leave request
  - `GET /api/wfh-requests` - Get WFH requests
  - `POST /api/wfh-requests` - Create WFH request
  - `PUT /api/wfh-requests/:id` - Update WFH request
  - `POST /api/wfh-requests/:id/approve` - Approve WFH request
  - `POST /api/wfh-requests/:id/reject` - Reject WFH request
- **Components**:
  - `src/pages/LeaveManagement.tsx`
  - `src/components/Leave/LeaveRequestList.tsx`
  - `src/components/Leave/LeaveRequestForm.tsx`
  - `src/components/Leave/WFHRequestList.tsx`
  - `src/components/Leave/WFHRequestForm.tsx`
- **Notes**: 
  - รองรับ Calendar view และ Dashboard view
  - มี Approval workflow

---

### 5. Salary Advance (ขอเบิกเงินเดือน)
- **Route**: `/salary-advance`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-30
- **Features**:
  - ✅ Salary advance request management
  - ✅ Approval workflow
- **APIs Used**:
  - (To be documented)
- **Components**:
  - `src/pages/SalaryAdvance.tsx`
- **Notes**: 
  - ต้องอัพเดท API documentation

---

### 6. Office Attendance (ข้อมูลเข้าออฟฟิศ)
- **Route**: `/office-attendance`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-30
- **Features**:
  - ✅ Attendance tracking
  - ✅ Check-in/Check-out
- **APIs Used**:
  - (To be documented)
- **Components**:
  - `src/pages/OfficeAttendance.tsx`
- **Notes**: 
  - ต้องอัพเดท API documentation

---

### 7. Document Sorting (คัดแยกเอกสาร)
- **Route**: `/document-sorting`
- **Status**: ✅ Complete
- **Last Updated**: 2026-02-05
- **Features**:
  - ✅ Document sorting workflow
  - ✅ Filter by logged-in user's employee_id (accounting_responsible)
  - ✅ **Acknowledgment Modal**: แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัท (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **APIs Used**:
  - `GET /api/monthly-tax-data` - Get monthly tax data list (filtered by accounting_responsible)
  - `GET /api/monthly-tax-data/:build/:year/:month` - Get acknowledgment data for selected company
  - `GET /api/document-entry-work` - Get document entry work list
  - `GET /api/document-entry-work/:build/:year/:month` - Get specific document entry work
  - `POST /api/document-entry-work` - Create document entry work
  - `PUT /api/document-entry-work/:id` - Update document entry work
- **Components**:
  - `src/pages/DocumentSorting.tsx`
  - `src/components/DocumentSorting/CompanyTable.tsx`
  - `src/components/DocumentSorting/SubmissionCountBadge.tsx`
  - `src/components/DocumentSorting/SubmissionHistory.tsx`
  - `src/components/DocumentSorting/DocumentKeyingSection.tsx`
  - `src/components/DocumentSorting/BotSubmissionSection.tsx`
  - `src/components/DocumentSorting/CommentsSection.tsx`
  - `src/components/DocumentSorting/SummaryStats.tsx`
  - `src/components/TaxInspection/AcknowledgmentModal.tsx` (ใช้ร่วมกับหน้าอื่น)
- **Notes**: 
  - ระบบจะดึงข้อมูลตาม `accounting_responsible` ของผู้ที่ล็อคอินเท่านั้น
  - ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล
  - แสดง acknowledgment modal สำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้"
- **Recent Updates** (2026-02-05):
  - ✅ **Feature Update**: เพิ่ม Acknowledgment Modal สำหรับทุกบริษัท - แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้" (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
  - ✅ ดึงข้อมูล acknowledgment จาก `monthly_tax_data` โดยใช้ `getByBuildYearMonth` API

---

### 8. Document Entry (คีย์เอกสาร)
- **Route**: `/document-entry`
- **Status**: 📋 Planned
- **Last Updated**: 2026-01-31
- **Features**:
  - 📋 Document entry workflow (รอการพัฒนา)
  - 📋 Filter by logged-in user's employee_id (document_entry_responsible) - **กำหนดให้ดึงข้อมูลรหัสพนักงานของผู้ที่ล็อคอินตรงกับหัวข้อ คีย์เอกสาร**
- **APIs Used**:
  - `GET /api/monthly-tax-data` - Get monthly tax data list (filtered by document_entry_responsible) - **รอการพัฒนา**
- **Components**:
  - `src/pages/DocumentEntry.tsx` (โครงสร้างพื้นฐานพร้อมแล้ว)
- **Notes**: 
  - **รอการพัฒนา**: ระบบจะต้องดึงข้อมูลตาม `document_entry_responsible` ของผู้ที่ล็อคอินเท่านั้น
  - ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล
  - ต้องอัพเดท API documentation เมื่อพัฒนาเสร็จ

---

### 9. Tax Inspection (ตรวจภาษี)
- **Route**: `/tax-inspection`
- **Status**: ✅ Complete
- **Last Updated**: 2026-02-05
- **Features**:
  - ✅ Tax inspection form
  - ✅ Filter and search
  - ✅ Pagination
  - ✅ Summary statistics
  - ✅ Filter by logged-in user's employee_id (tax_inspection_responsible)
  - ✅ Display employee names with nickname format: "ชื่อ(ชื่อเล่น)" เช่น "พงษ์สิทธิ์(ปู)" (ตัดนามสกุลออก)
  - ✅ Fetch employees separately using useQueries for nickname lookup
  - ✅ **Acknowledgment Modal**: แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัท (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **APIs Used**:
  - `GET /api/monthly-tax-data` - Get monthly tax data list (filtered by tax_inspection_responsible)
  - `GET /api/monthly-tax-data/:build/:year/:month` - Get specific tax data
  - `PUT /api/monthly-tax-data/:id` - Update tax data
  - `GET /api/monthly-tax-data/summary` - Get summary statistics
  - `GET /api/employees` - Get employees list (for nickname lookup)
  - `GET /api/employees/:id` - Get employee by ID (supports both UUID and employee_id, for nickname lookup)
- **Components**:
  - `src/pages/TaxInspection.tsx`
  - `src/components/TaxInspection/TaxInspectionTable.tsx`
  - `src/components/TaxInspection/TaxInspectionForm.tsx`
  - `src/components/TaxInspection/FilterSection.tsx`
  - `src/components/TaxInspection/SummaryCard.tsx`
  - `src/components/TaxInspection/PaginationSection.tsx`
- **Notes**: 
  - ระบบจะดึงข้อมูลตาม `tax_inspection_responsible` ของผู้ที่ล็อคอินเท่านั้น
  - ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล
  - แสดงชื่อพนักงานในรูปแบบ "ชื่อ(ชื่อเล่น)" โดยตัดนามสกุลออก (เช่น "พงษ์สิทธิ์(ปู)" แทน "พงษ์สิทธิ์ สูงสนิท(ปู)")
  - ใช้ `useQueries` เพื่อ fetch employees ที่ต้องการ (`accounting_responsible`, `document_entry_responsible`) แยกต่างหาก เพื่อหา nickname (เพราะ backend filter เฉพาะ employee ของผู้ใช้ที่ล็อกอินถ้าไม่ใช่ admin)
  - Backend route `/api/employees/:id` รองรับทั้ง UUID และ employee_id และอนุญาตให้ผู้ใช้ที่ไม่ใช่ admin ดูข้อมูลพื้นฐาน (full_name, nick_name) ของพนักงานคนอื่นได้
  - รองรับ Filter และ Search
  - มี Summary statistics
- **Recent Updates** (2026-02-02):
  - ✅ BUG-118: จำกัดการเข้าถึงแถบ VAT เมื่อบริษัทไม่ได้จดภาษีมูลค่าเพิ่ม
  - ✅ BUG-119: อัพเดท Notification เมื่อบันทึกข้อมูลซ้ำ
  - ✅ BUG-120: แปลงสถานะ "EDIT" เป็นภาษาไทย ("แก้ไข")
  - ✅ BUG-121, BUG-122: แก้ไข `income_confirmed` จาก BOOLEAN เป็น VARCHAR
  - ✅ BUG-123: Error Message ไม่ชัดเจนเมื่อ Backend Server ไม่ได้รัน (TaxInspectionTable)
  - ✅ BUG-124: pp30_sent_for_review_date ไม่ถูกอัพเดทเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
  - ✅ BUG-125: Error Message ไม่ชัดเจนเมื่อบันทึกข้อมูลล้มเหลว (TaxInspectionForm)
  - ✅ BUG-126: หน้าเว็บไม่อัพเดทข้อมูล pp30_sent_for_review_date หลังจากบันทึกสำเร็จ
  - ✅ ปรับปรุงรูปแบบการแสดงผลวันที่เป็น `DD/MM/YYYY`
  - ✅ เพิ่มระบบ Auto-refetch หลังจากบันทึกสำเร็จ
- **Recent Updates** (2026-02-05):
  - ✅ **Feature Update**: เพิ่ม Acknowledgment Modal สำหรับทุกบริษัท - แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้" (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)

---

### 10. Tax Status (สถานะยื่นภาษี)
- **Route**: `/tax-status`
- **Status**: ✅ Complete
- **Last Updated**: 2026-02-05
- **Features**:
  - ✅ Tax status tracking
  - ✅ Filter and search
  - ✅ Pagination
  - ✅ Filter by logged-in user's employee_id (accounting_responsible)
  - ✅ Permission-based data saving (Admin หรือ Responsible Users เท่านั้น)
  - ✅ **Acknowledgment Modal**: แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัท (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **APIs Used**:
  - `GET /api/monthly-tax-data` - Get monthly tax data list (filtered by accounting_responsible)
  - `GET /api/monthly-tax-data/:build/:year/:month` - Get specific tax data
  - `PUT /api/monthly-tax-data/:id` - Update tax data (Admin หรือ Responsible Users เท่านั้น)
  - `GET /api/monthly-tax-data/summary` - Get summary statistics
- **Components**:
  - `src/pages/TaxStatus.tsx`
  - `src/components/TaxStatus/TaxStatusTable.tsx`
  - `src/components/TaxStatus/FilterSection.tsx`
  - `src/components/TaxStatus/SummaryCard.tsx`
  - `src/components/TaxStatus/PaginationSection.tsx`
  - `src/components/TaxInspection/TaxInspectionForm.tsx` (ใช้ร่วมกับหน้า Tax Inspection)
- **Notes**: 
  - ระบบจะดึงข้อมูลตาม `accounting_responsible` ของผู้ที่ล็อคอินเท่านั้น
  - ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล
  - การบันทึกข้อมูล: Admin สามารถบันทึกได้ทุกข้อมูล, Responsible Users สามารถบันทึกได้เฉพาะข้อมูลที่ตนเองรับผิดชอบ
  - ดูรายละเอียดเพิ่มเติม: `Documentation/Agent_cursor_ai/MONTHLY_TAX_STATUS_FORM_FLOW.md`
- **Recent Updates** (2026-02-05):
  - ✅ **Feature Update**: เพิ่ม Acknowledgment Modal สำหรับทุกบริษัท - แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้" (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **Recent Updates** (2026-02-02):
  - ✅ แก้ไข Permission System: อนุญาตให้ Responsible Users (accounting_responsible) บันทึกข้อมูลได้ ไม่ใช่แค่ Admin
  - ✅ เพิ่ม Permission Check Logic ใน Backend: ตรวจสอบว่า user เป็น admin หรือ responsible person ก่อนอนุญาตให้บันทึก
  - ✅ BUG-118: จำกัดการเข้าถึงแถบ VAT เมื่อบริษัทไม่ได้จดภาษีมูลค่าเพิ่ม
  - ✅ BUG-119: อัพเดท Notification เมื่อบันทึกข้อมูลซ้ำ
  - ✅ BUG-120: แปลงสถานะ "EDIT" เป็นภาษาไทย ("แก้ไข")
  - ✅ BUG-121, BUG-122: แก้ไข `income_confirmed` จาก BOOLEAN เป็น VARCHAR
  - ✅ BUG-123: Error Message ไม่ชัดเจนเมื่อ Backend Server ไม่ได้รัน (TaxStatusTable, TaxFilingTable, TaxInspectionTable)
  - ✅ BUG-124: pp30_sent_for_review_date ไม่ถูกอัพเดทเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
  - ✅ BUG-125: Error Message ไม่ชัดเจนเมื่อบันทึกข้อมูลล้มเหลว (TaxInspectionForm)
  - ✅ BUG-126: หน้าเว็บไม่อัพเดทข้อมูล pp30_sent_for_review_date หลังจากบันทึกสำเร็จ
  - ✅ ปรับปรุงรูปแบบการแสดงผลวันที่เป็น `DD/MM/YYYY`
  - ✅ เพิ่มระบบ Auto-refetch หลังจากบันทึกสำเร็จ
- **Recent Updates** (2026-02-05):
  - ✅ **Feature Update**: เพิ่ม Acknowledgment Modal สำหรับทุกบริษัท - แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้" (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)

---

### 11. Tax Filing (ยื่นภาษี)
- **Route**: `/tax-filing`
- **Status**: ✅ Complete
- **Last Updated**: 2026-02-05
- **Features**:
  - ✅ Tax filing workflow
  - ✅ Filter and search
  - ✅ Pagination
  - ✅ Filter by logged-in user's employee_id (wht_filer_employee_id or vat_filer_employee_id)
  - ✅ **Acknowledgment Modal**: แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัท (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **APIs Used**:
  - `GET /api/monthly-tax-data` - Get monthly tax data list (filtered by wht_filer_employee_id or vat_filer_employee_id)
  - `GET /api/monthly-tax-data/:build/:year/:month` - Get specific tax data
  - `PUT /api/monthly-tax-data/:id` - Update tax data
  - `GET /api/monthly-tax-data/summary` - Get summary statistics
- **Components**:
  - `src/pages/TaxFiling.tsx`
  - `src/components/TaxFiling/TaxFilingTable.tsx`
  - `src/components/TaxFiling/FilterSection.tsx`
  - `src/components/TaxFiling/SummaryCard.tsx`
  - `src/components/TaxFiling/PaginationSection.tsx`
- **Recent Updates** (2026-02-05):
  - ✅ **Feature Update**: เพิ่ม Acknowledgment Modal สำหรับทุกบริษัท - แสดงหน้าต่างยืนยันก่อนเปิดฟอร์มสำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้" (ไม่ต้องตรวจสอบว่ามีข้อมูล acknowledgment หรือไม่)
- **Recent Updates** (2026-02-02):
  - ✅ BUG-120: แปลงสถานะ "EDIT" เป็นภาษาไทย ("แก้ไข")
  - ✅ BUG-123: Error Message ไม่ชัดเจนเมื่อ Backend Server ไม่ได้รัน (TaxFilingTable)
  - ✅ BUG-124: pp30_sent_for_review_date ไม่ถูกอัพเดทเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
  - ✅ BUG-126: หน้าเว็บไม่อัพเดทข้อมูล pp30_sent_for_review_date หลังจากบันทึกสำเร็จ
  - ✅ BUG-127: Pagination แสดงจำนวนรายการไม่ถูกต้อง (แสดง 121 แทน 2)
  - ✅ BUG-128: Notification สำหรับ PP30 ส่งไปที่ผู้ทำบัญชีแทนผู้รับผิดชอบตรวจ
  - ✅ BUG-129: ระบบไม่ส่งสถานะทั้งสองและไม่อัพเดท timestamp ทั้งสองตัวเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
  - ✅ ปรับปรุงรูปแบบการแสดงผลวันที่เป็น `DD/MM/YYYY`
  - ✅ เพิ่มระบบ Auto-refetch หลังจากบันทึกสำเร็จ
- **Notes**: 
  - ระบบจะดึงข้อมูลตาม `wht_filer_employee_id` หรือ `vat_filer_employee_id` ของผู้ที่ล็อคอินเท่านั้น
  - ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล
  - แสดงข้อมูลที่ผู้ใช้รับผิดชอบทั้ง WHT และ VAT

---

### 12. Client Management (จัดการข้อมูลลูกค้า)
- **Route**: `/clients`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-31
- **Features**:
  - ✅ CRUD operations
  - ✅ Search and filter (by company_status, tax_registration_status)
  - ✅ Pagination with items per page selector (20, 50, 100)
  - ✅ Excel import
  - ✅ Statistics summary (total, by company_status, by tax_registration_status)
  - ✅ Role-based access control
- **APIs Used**:
  - `GET /api/clients` - Get client list (with filters)
  - `GET /api/clients/:build` - Get client detail
  - `POST /api/clients` - Create client
  - `PUT /api/clients/:build` - Update client
  - `DELETE /api/clients/:build` - Delete client
  - `POST /api/clients/import` - Import from Excel
  - `POST /api/clients/import/validate` - Validate Excel before import
  - `GET /api/clients/statistics` - Get statistics summary
- **Components**:
  - `src/pages/ClientManagement.tsx`
  - `src/components/Client/ClientList.tsx`
  - `src/components/Client/ClientDetail.tsx`
  - `src/components/Client/ClientForm.tsx`
  - `src/components/Client/ClientDeleteModal.tsx`
  - `src/components/Client/ClientImport.tsx`
- **Notes**: 
  - รองรับ Excel import พร้อม validation
  - มี Statistics summary card
  - รองรับการ filter ตามสถานะบริษัทและสถานะจดภาษีมูลค่าเพิ่ม
  - รองรับการเลือกจำนวนรายการต่อหน้า (20, 50, 100)

---

### 13. Work Assignment (จัดงานรายเดือน)
- **Route**: `/work-assignment`
- **Status**: 🚧 In Progress
- **Last Updated**: 2026-01-31 (Updated: Preview Statistics Fix)
- **Features**:
  - ✅ CRUD operations
  - ✅ Search and filter
  - ✅ Pagination
  - ✅ View current/next tax month
  - ✅ Bulk create with preview (แสดงในหน้าเว็บ)
  - ✅ Multi-select company status filter
  - ✅ Auto-load previous month assignments
  - ✅ Batch processing to avoid rate limits
  - ✅ Column Visibility Toggle (แสดง/ซ่อนคอลัมน์)
  - ✅ Enhanced UI for Preview Table (Badge, improved Select dropdown)
  - ✅ Excel Import with template download and validation
- **APIs Used**:
  - `GET /api/work-assignments` - Get work assignments list
  - `GET /api/work-assignments/:build/:year/:month` - Get specific assignment
  - `GET /api/work-assignments/:id` - Get assignment by ID
  - `POST /api/work-assignments` - Create assignment (with auto reset)
  - `POST /api/work-assignments/import/validate` - Validate Excel file before import
  - `POST /api/work-assignments/import` - Import work assignments from Excel
  - `PUT /api/work-assignments/:id` - Update assignment
  - `POST /api/work-assignments/:id/reset-data` - Reset monthly data
- **Components**:
  - `src/pages/WorkAssignment.tsx`
  - `src/components/WorkAssignment/WorkAssignmentImport.tsx`
- **Notes**: 
  - ใช้เดือนภาษี (ย้อนหลัง 1 เดือนจากเดือนปฏิทิน)
  - รองรับ Excel import พร้อม validation และ template download
  - รองรับ Bulk create พร้อม Preview table
  - Preview table แสดงในหน้าเว็บ (ไม่ใช่ Modal)
  - มี Batch processing เพื่อหลีกเลี่ยง rate limit errors
  - Handle 404 errors gracefully (assignment might not exist)
  - Layout แบบเต็มจอ (Edge-to-Edge) สำหรับ desktop เท่านั้น (ไม่รองรับ mobile)
- **Recent Updates** (2026-01-31):
  - ✅ เพิ่ม Bulk create system พร้อม Preview
  - ✅ ปรับให้ใช้เดือนภาษีแทนเดือนปฏิทิน
  - ✅ เพิ่ม Multi-select สำหรับเลือกสถานะบริษัท
  - ✅ ปรับ Preview table ให้แสดงในหน้าเว็บแทน Modal
  - ✅ เพิ่ม Batch processing เพื่อหลีกเลี่ยง 429 errors
  - ✅ แก้ไข 404 error handling
  - ✅ เพิ่ม Column Visibility Toggle สำหรับซ่อน/แสดงคอลัมน์
  - ✅ ปรับปรุง UI ของ Preview Table (ใช้ Badge, ปรับ Select dropdown)
  - ✅ ปรับ Layout ให้เต็มจอ (Edge-to-Edge) สำหรับ desktop
  - ✅ ปรับ Badge สี (สถานะบริษัท: สีส้ม, ยังไม่จดภาษี: สีแดง)
  - ✅ เพิ่ม Pagination สำหรับ Preview Table (20, 30, 50, 100 รายการต่อหน้า)
  - ✅ ปรับการดึงข้อมูลให้ดึงมาทั้งหมด (ไม่จำกัด limit)
  - ✅ แก้ไข Backend limit จาก 100 เป็น 100000 เพื่อรองรับการดึงข้อมูลทั้งหมด
  - ✅ แก้ไข Badge color logic ให้ใช้ exact match สำหรับความแม่นยำ
  - ✅ เปลี่ยนการดึงข้อมูลจาก employees เป็น users โดยกรองตาม role
  - ✅ ปรับชื่อหัวข้อ (ทำบัญชี → ผู้ทำบัญชี, ตรวจภาษี → ผู้ตรวจภาษี, ฯลฯ)
  - ✅ แสดงผลเป็น "รหัสพนักงาน - ชื่อเต็ม"
  - ✅ เพิ่ม Target Tax Month Selection Modal (เลือกเดือนภาษีที่จะบันทึกก่อนเลือกสถานะบริษัท)
  - ✅ เพิ่มคอลัมน์ "เดือนภาษีที่จะบันทึก" ใน Preview Table
  - ✅ เพิ่มคอลัมน์ "สถานะการจัดงาน" (จัดแล้ว/ยังไม่จัด) ใน Preview Table
  - ✅ เพิ่ม Filter by Assignment Status (ทั้งหมด/จัดแล้ว/ยังไม่จัด) โดยค่าเริ่มต้นเป็น "ยังไม่จัด"
  - ✅ เพิ่มการตรวจสอบและแสดงข้อมูลงานที่จัดแล้วในเดือนภาษีเป้าหมาย
  - ✅ เพิ่ม Work Statistics Summary สำหรับ Preview Data (แยกจาก Work Statistics ปกติ)
  - ✅ แก้ไขให้ Preview Statistics ใช้ข้อมูลจาก filteredPreviewData เพื่อให้ตรงกับตารางที่แสดง
  - ✅ เพิ่ม tax_registration_status ใน Backend API responses

---

### 14. User Management (จัดการ User Accounts)
- **Route**: `/users`
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-31
- **Features**:
  - ✅ Create user account (เชื่อมกับ employee หรือไม่เชื่อมก็ได้)
  - ✅ Update user account (username, email, password, role, status, etc.)
  - ✅ Delete user account (soft delete)
  - ✅ View user details
  - ✅ Search and filter by role, status, employee_id, name
  - ✅ Pagination
  - ✅ Role-based access control (Admin only)
  - ✅ Display temporary password when creating new user account (one-time display with copy button)
  - ✅ Reset password feature - Admin can reset user password and view new password (one-time display)
- **APIs Used**:
  - `GET /api/users` - Get users list (with filters)
  - `GET /api/users/:id` - Get user detail
  - `POST /api/users` - Create user account (returns temporary_password)
  - `PUT /api/users/:id` - Update user account
  - `DELETE /api/users/:id` - Delete user account (soft delete)
  - `POST /api/users/:id/reset-password` - Reset user password (returns temporary_password)
  - `GET /api/employees` - Get employees list (for linking user to employee)
- **Components**:
  - `src/pages/UserManagement.tsx`
- **Notes**: 
  - Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้
  - สามารถสร้าง user account โดยเชื่อมกับ employee หรือไม่เชื่อมก็ได้
  - เมื่อลบ user account ระบบจะทำ soft delete และลบ user_id จาก employee table
  - ไม่สามารถลบ account ของตัวเองได้
  - Password จะถูก hash ด้วย bcrypt ก่อนบันทึกในฐานข้อมูล (one-way hash - ไม่สามารถดูรหัสผ่านเดิมได้)
  - เมื่อแก้ไข user account ถ้าไม่กรอก password ระบบจะไม่เปลี่ยน password
  - **แสดงรหัสผ่านปัจจุบัน** ในตาราง User Management และ Detail Modal (จาก `temporary_password` field)
  - เก็บรหัสผ่านชั่วคราวใน `temporary_password` field (plain text) เพื่อให้ Admin ดูได้
  - รหัสผ่านจะถูกลบอัตโนมัติเมื่อ user login สำเร็จ (เพื่อความปลอดภัย)
  - มีปุ่ม Copy เพื่อคัดลอกรหัสผ่าน

---

## 📊 Summary Statistics

- **Total Pages**: 14
- **Complete**: 13
- **In Progress**: 1
- **Planned**: 0
- **Needs Update**: 0

---

## 🔄 Update Instructions

เมื่อมีการพัฒนาหน้าใหม่หรืออัพเดทหน้าเดิม:
1. อัพเดท `PAGE_DEVELOPMENT_STATUS.md` ทันที
2. อัพเดท `Status` ตามความคืบหน้า
3. เพิ่ม `Features` และ `APIs Used` ที่เพิ่มเข้ามา
4. อัพเดท `Last Updated` date
5. เพิ่ม `Notes` หากมีข้อมูลสำคัญ

---

**Last Updated**: 2026-01-31 (Updated: User Management System, Change Password & Notification System)

---

### 15. Change Password (เปลี่ยนรหัสผ่าน)
- **Route**: `/` (Modal ใน Header)
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-31
- **Features**:
  - ✅ พนักงานสามารถเปลี่ยนรหัสผ่านของตัวเองได้
  - ✅ ต้องกรอกรหัสผ่านปัจจุบันเพื่อยืนยัน
  - ✅ ตั้งรหัสผ่านใหม่ (ต้องยืนยันรหัสผ่าน)
  - ✅ Validation: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
  - ✅ **อัพเดท temporary_password อัตโนมัติ** เพื่อให้ Admin ยังคงเห็นรหัสผ่านได้
  - ✅ **สร้าง Notification อัตโนมัติ** เพื่อแจ้งเตือน Admin ว่ามีการเปลี่ยนรหัสผ่าน
- **APIs Used**:
  - `POST /api/auth/change-password` - เปลี่ยนรหัสผ่าน
- **Components**:
  - `src/components/Layout/ChangePasswordModal.tsx`
- **Notes**: 
  - เปิดจาก Menu ใน Header (คลิกที่ Avatar -> "เปลี่ยนรหัสผ่าน")
  - รหัสผ่านจะถูกอัพเดทใน temporary_password เพื่อให้ Admin ยังคงเห็นได้
  - สร้าง notification อัตโนมัติสำหรับ Admin ทั้งหมด

---

### 16. Notifications (ระบบแจ้งเตือน)
- **Route**: `/` (Dropdown ใน Header)
- **Status**: ✅ Complete
- **Last Updated**: 2026-01-31
- **Features**:
  - ✅ แสดงการแจ้งเตือนใน Header (ปุ่ม "แจ้งเตือน")
  - ✅ Badge แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
  - ✅ Dropdown/Menu แสดงรายการการแจ้งเตือน
  - ✅ แจ้งเตือนเมื่อมีการเปลี่ยนรหัสผ่าน
  - ✅ Admin สามารถดู, อ่าน, และลบการแจ้งเตือนได้
  - ✅ Auto-refresh every 30 seconds
- **APIs Used**:
  - `GET /api/notifications` - ดึงรายการ notifications
  - `PUT /api/notifications/:id/read` - ทำเครื่องหมายว่าอ่านแล้ว
  - `PUT /api/notifications/read-all` - ทำเครื่องหมายว่าอ่านทั้งหมด
  - `DELETE /api/notifications/:id` - ลบ notification
- **Components**:
  - `src/components/Layout/NotificationsMenu.tsx`
- **Notes**: 
  - แสดงเฉพาะสำหรับ Admin เท่านั้น
  - Badge แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
  - สามารถทำเครื่องหมายว่าอ่านแล้วหรือลบได้
  - Auto-refresh every 30 seconds

---

**Total Pages**: 16  
**Maintainer**: Cursor AI
