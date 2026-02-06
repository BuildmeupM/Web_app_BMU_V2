# 🔗 Database Relationships - BMU Work Management System

## 🎯 Overview

ความสัมพันธ์ระหว่างตารางทั้งหมดในระบบ (ER Diagram)

## 📊 Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │
│ username    │
│ email       │
│ role        │
│ name        │
└──────┬──────┘
       │
       │ 1:1 (optional)
       │
┌──────▼──────┐
│  employees  │
│─────────────│
│ id (PK)     │
│ employee_id │
│ user_id(FK) │◄──┐
│ name        │   │
│ email       │   │
│ department  │   │
│ position    │   │
└──────┬──────┘   │
       │          │
       │ 1:N      │
       │          │
┌──────▼──────┐   │  ┌──────────────┐
│leave_requests│   │  │ departments │
│─────────────│   │  │──────────────│
│ id (PK)     │   │  │ id (PK)      │
│ employee_id │───┘  │ code         │
│ type        │      │ name         │
│ start_date  │      └──────────────┘
│ end_date    │
│ status      │      ┌──────────────┐
│ approved_by │─────►│  positions   │
└─────────────┘      │──────────────│
                      │ id (PK)      │
┌─────────────┐      │ code         │
│salary_advances│     │ name         │
│─────────────│      └──────────────┘
│ id (PK)     │
│ employee_id │───┐
│ amount      │   │
│ status      │   │
│ approved_by │───┼──► users (approver)
└─────────────┘   │
                  │
┌─────────────┐   │
│ attendances │   │
│─────────────│   │
│ id (PK)     │   │
│ employee_id │───┘
│ date        │
│ check_in    │
│ check_out   │
│ status      │
└─────────────┘

┌──────────────┐
│document_categories│
│──────────────│
│ id (PK)      │
│ code         │
│ name         │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────┐
│  documents   │
│──────────────│
│ id (PK)      │
│ category_id  │
│ status       │
│ sorted_by    │───► users
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────┐
│document_entries │
│─────────────────│
│ id (PK)         │
│ document_id     │
│ entered_by      │───► users
│ verified_by     │───► users
│ data (JSON)     │
│ status          │
└─────────────────┘

┌─────────────┐
│tax_documents│
│─────────────│
│ id (PK)     │
│ employee_id │───► employees
│ tax_year    │
│ status      │
│ inspected_by│───► users
└──────┬──────┘
       │
       │ N:1
       │
┌──────▼──────┐
│ tax_filings │
│─────────────│
│ id (PK)     │
│ employee_id │───► employees
│ tax_year    │
│ status      │
│ submitted_by│───► users
│ tax_doc_ids │
└─────────────┘

┌──────────────┐
│notifications │
│──────────────│
│ id (PK)      │
│ user_id      │───► users
│ type         │
│ title        │
│ message      │
│ is_read      │
└──────────────┘

┌──────────────┐
│   clients    │ (Workflow System)
│──────────────│
│ id (PK)      │
│ build (UK)   │
│ company_name │
│ status       │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│  accounting_fees    │
│─────────────────────│
│ id (PK)             │
│ build (FK)          │───► clients
│ fee_year            │
│ accounting_fee_jan  │
│ ... (12 เดือน)      │
│ hr_fee_jan          │
│ ... (12 เดือน)      │
└─────────────────────┘

┌──────────────┐      ┌──────────────┐
│   dbd_info   │      │   boi_info   │
│──────────────│      │──────────────│
│ id (PK)      │      │ id (PK)      │
│ build (FK)   │───┐  │ build (FK)   │───┐
│ capital      │   │  │ boi_dates    │   │
└──────────────┘   │  └──────────────┘   │
                   │                     │
                   └──────────┬──────────┘
                              │
                    ┌─────────▼─────────┐
                    │   clients (build) │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼──────────────┐
                    │ agency_credentials      │
                    │─────────────────────────│
                    │ id (PK)                 │
                    │ build (FK)              │───► clients
                    │ efiling_username/pass   │
                    │ sso_username/pass       │
                    │ dbd_username/pass       │
                    │ ...                     │
                    └─────────────────────────┘

┌──────────────────┐
│ work_assignments │ (Workflow System - จัดงานรายเดือน)
│──────────────────│
│ id (PK)          │
│ build (FK)       │───► clients
│ assignment_year  │
│ assignment_month │
│ accounting_resp  │───► employees
│ tax_insp_resp    │───► employees
│ wht_filer_resp   │───► employees
│ vat_filer_resp   │───► employees
│ doc_entry_resp   │───► employees
│ assigned_by      │───► users
│ is_reset_completed│
└──────┬───────────┘
       │
       │ เมื่อมีการจัดงานใหม่
       │ ↓ (รีเซ็ตข้อมูล)
       │
┌──────▼──────────────┐      ┌──────────────────────┐
│ monthly_tax_data    │      │ document_entry_work  │
│─────────────────────│      │──────────────────────│
│ id (PK)             │      │ id (PK)              │
│ build (FK)          │───┐  │ build (FK)           │───┐
│ tax_year            │   │  │ work_year            │   │
│ tax_month           │   │  │ work_month           │   │
│ accounting_resp     │───┼──┤ responsible_emp_id  │   │
│ tax_insp_resp       │───┼──┤ wht_entry_status     │   │
│ wht_filer_emp_id    │───┼──┤ vat_entry_status     │   │
│ vat_filer_emp_id    │───┼──┤ non_vat_entry_status │   │
│ doc_entry_resp      │───┼──┤ ...                  │   │
│ pnd_*_date          │   │  └──────────────────────┘   │
│ pp30_*_date         │   │                            │
│ ...                 │   │                            │
└─────────────────────┘   │                            │
                          │                            │
                          └────────────┬───────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │   clients (build)       │
                          └─────────────────────────┘
```

## 🔗 Relationship Details

### 1. users ↔ employees
**Type**: One-to-One (Optional)
- `employees.user_id` → `users.id`
- พนักงานอาจมี User Account หรือไม่มีก็ได้
- ถ้า User ถูกลบ → `employee.user_id` = NULL

### 2. employees ↔ departments
**Type**: Many-to-One
- `employees.department_id` → `departments.id`
- พนักงานหลายคนอยู่ในแผนกเดียวกัน
- ถ้า Department ถูกลบ → `employee.department_id` = NULL

### 3. employees ↔ positions
**Type**: Many-to-One
- `employees.position_id` → `positions.id`
- พนักงานหลายคนอยู่ในตำแหน่งเดียวกัน
- ถ้า Position ถูกลบ → `employee.position_id` = NULL

### 4. employees ↔ leave_requests
**Type**: One-to-Many
- `leave_requests.employee_id` → `employees.id`
- พนักงานหนึ่งคนสามารถขอลาได้หลายครั้ง
- ถ้า Employee ถูกลบ → ลบ Leave Requests ทั้งหมด

### 5. employees ↔ salary_advances
**Type**: One-to-Many
- `salary_advances.employee_id` → `employees.id`
- พนักงานหนึ่งคนสามารถเบิกเงินเดือนได้หลายครั้ง
- ถ้า Employee ถูกลบ → ลบ Salary Advances ทั้งหมด

### 6. employees ↔ attendances
**Type**: One-to-Many
- `attendances.employee_id` → `employees.id`
- พนักงานหนึ่งคนมี Attendance Records หลายวัน
- Unique Constraint: (employee_id, date)
- ถ้า Employee ถูกลบ → ลบ Attendances ทั้งหมด

### 7. employees ↔ tax_documents
**Type**: One-to-Many
- `tax_documents.employee_id` → `employees.id`
- พนักงานหนึ่งคนมี Tax Documents หลายไฟล์
- ถ้า Employee ถูกลบ → ลบ Tax Documents ทั้งหมด

### 8. employees ↔ tax_filings
**Type**: One-to-Many
- `tax_filings.employee_id` → `employees.id`
- พนักงานหนึ่งคนยื่นภาษีได้หลายปี
- ถ้า Employee ถูกลบ → ลบ Tax Filings ทั้งหมด

### 9. users ↔ leave_requests (Approver)
**Type**: One-to-Many
- `leave_requests.approved_by` → `users.id`
- User หนึ่งคนสามารถอนุมัติ Leave Requests ได้หลายครั้ง
- ถ้า User ถูกลบ → `leave_request.approved_by` = NULL

### 10. users ↔ salary_advances (Approver)
**Type**: One-to-Many
- `salary_advances.approved_by` → `users.id`
- User หนึ่งคนสามารถอนุมัติ Salary Advances ได้หลายครั้ง
- ถ้า User ถูกลบ → `salary_advance.approved_by` = NULL

### 11. users ↔ documents (Sorter)
**Type**: One-to-Many
- `documents.sorted_by` → `users.id`
- User หนึ่งคนสามารถคัดแยก Documents ได้หลายไฟล์
- ถ้า User ถูกลบ → `document.sorted_by` = NULL

### 12. users ↔ document_entries (Enterer)
**Type**: One-to-Many
- `document_entries.entered_by` → `users.id`
- User หนึ่งคนสามารถคีย์ Documents ได้หลายไฟล์
- ถ้า User ถูกลบ → Error (RESTRICT)

### 13. users ↔ document_entries (Verifier)
**Type**: One-to-Many
- `document_entries.verified_by` → `users.id`
- User หนึ่งคนสามารถ Verify Documents ได้หลายไฟล์
- ถ้า User ถูกลบ → `document_entry.verified_by` = NULL

### 14. users ↔ tax_documents (Inspector)
**Type**: One-to-Many
- `tax_documents.inspected_by` → `users.id`
- User หนึ่งคนสามารถตรวจ Tax Documents ได้หลายไฟล์
- ถ้า User ถูกลบ → `tax_document.inspected_by` = NULL

### 15. users ↔ tax_filings (Submitter)
**Type**: One-to-Many
- `tax_filings.submitted_by` → `users.id`
- User หนึ่งคนสามารถยื่น Tax Filings ได้หลายครั้ง
- ถ้า User ถูกลบ → `tax_filing.submitted_by` = NULL

### 16. users ↔ notifications
**Type**: One-to-Many
- `notifications.user_id` → `users.id`
- User หนึ่งคนมี Notifications หลายข้อความ
- ถ้า User ถูกลบ → ลบ Notifications ทั้งหมด

### 17. document_categories ↔ documents
**Type**: One-to-Many
- `documents.category_id` → `document_categories.id`
- Category หนึ่งมี Documents หลายไฟล์
- ถ้า Category ถูกลบ → Error (RESTRICT)

### 18. documents ↔ document_entries
**Type**: One-to-Many
- `document_entries.document_id` → `documents.id`
- Document หนึ่งมี Entries หลายครั้ง (สำหรับการแก้ไข)
- ถ้า Document ถูกลบ → ลบ Document Entries ทั้งหมด

### 19. tax_documents ↔ tax_filings
**Type**: Many-to-One (via JSON)
- `tax_filings.tax_document_ids` (JSON Array)
- Tax Filing หนึ่งมี Tax Documents หลายไฟล์
- ไม่มี Foreign Key (ใช้ JSON Array แทน)

---

## 🔗 Workflow System Relationships

### 20. clients ↔ accounting_fees
**Type**: One-to-Many
- `accounting_fees.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูลค่าทำบัญชีหลายปี
- ถ้าลบ Client → ลบ Accounting Fees ทั้งหมด (CASCADE)

### 21. clients ↔ dbd_info
**Type**: One-to-One
- `dbd_info.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูล DBD หนึ่งชุด
- ถ้าลบ Client → ลบ DBD Info (CASCADE)

### 22. clients ↔ boi_info
**Type**: One-to-One
- `boi_info.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูล BOI หนึ่งชุด
- ถ้าลบ Client → ลบ BOI Info (CASCADE)

### 23. clients ↔ agency_credentials
**Type**: One-to-One
- `agency_credentials.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูลรหัสผู้ใช้/รหัสผ่านหน่วยงานหนึ่งชุด
- ถ้าลบ Client → ลบ Agency Credentials (CASCADE)

### 24. clients ↔ work_assignments
**Type**: One-to-Many
- `work_assignments.build` → `clients.build`
- ลูกค้าหนึ่งคนมีการจัดงานหลายเดือน
- ถ้าลบ Client → ลบ Work Assignments ทั้งหมด (CASCADE)

### 25. clients ↔ monthly_tax_data
**Type**: One-to-Many
- `monthly_tax_data.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูลภาษีรายเดือนหลายเดือน
- ⚠️ **รีเซ็ตทุกเดือน** เมื่อมีการจัดงานใหม่
- ถ้าลบ Client → ลบ Monthly Tax Data ทั้งหมด (CASCADE)

### 26. clients ↔ document_entry_work
**Type**: One-to-Many
- `document_entry_work.build` → `clients.build`
- ลูกค้าหนึ่งคนมีข้อมูลงานคีย์เอกสารหลายเดือน
- ⚠️ **รีเซ็ตทุกเดือน** เมื่อมีการจัดงานใหม่
- ถ้าลบ Client → ลบ Document Entry Work ทั้งหมด (CASCADE)

### 27. work_assignments ↔ employees (Responsible)
**Type**: Many-to-One (หลาย roles)
- `work_assignments.accounting_responsible` → `employees.employee_id`
- `work_assignments.tax_inspection_responsible` → `employees.employee_id`
- `work_assignments.wht_filer_responsible` → `employees.employee_id`
- `work_assignments.vat_filer_responsible` → `employees.employee_id`
- `work_assignments.document_entry_responsible` → `employees.employee_id`
- ถ้าลบ Employee → SET NULL (SET NULL)

### 28. work_assignments ↔ users (Assigned By)
**Type**: Many-to-One
- `work_assignments.assigned_by` → `users.id`
- User หนึ่งคนสามารถจัดงานได้หลายครั้ง
- ถ้าลบ User → Error (RESTRICT)

### 29. monthly_tax_data ↔ employees (Responsible)
**Type**: Many-to-One (หลาย roles)
- `monthly_tax_data.accounting_responsible` → `employees.employee_id`
- `monthly_tax_data.tax_inspection_responsible` → `employees.employee_id`
- `monthly_tax_data.wht_filer_employee_id` → `employees.employee_id`
- `monthly_tax_data.wht_filer_current_employee_id` → `employees.employee_id`
- `monthly_tax_data.vat_filer_employee_id` → `employees.employee_id`
- `monthly_tax_data.vat_filer_current_employee_id` → `employees.employee_id`
- `monthly_tax_data.document_entry_responsible` → `employees.employee_id`
- ถ้าลบ Employee → SET NULL (SET NULL)

### 30. document_entry_work ↔ employees (Responsible)
**Type**: Many-to-One (หลาย roles)
- `document_entry_work.responsible_employee_id` → `employees.employee_id` (RESTRICT)
- `document_entry_work.current_responsible_employee_id` → `employees.employee_id` (SET NULL)
- `document_entry_work.responsibility_changed_by` → `employees.employee_id` (SET NULL)
- `document_entry_work.wht_status_updated_by` → `employees.employee_id` (SET NULL)
- `document_entry_work.vat_status_updated_by` → `employees.employee_id` (SET NULL)
- `document_entry_work.non_vat_status_updated_by` → `employees.employee_id` (SET NULL)
- ถ้าลบ Employee (responsible_employee_id) → Error (RESTRICT)
- ถ้าลบ Employee (อื่นๆ) → SET NULL

## 🔐 Foreign Key Constraints

### ON DELETE Actions

#### CASCADE
- `leave_requests` → `employees` (ถ้าลบ Employee ลบ Leave Requests)
- `salary_advances` → `employees`
- `attendances` → `employees`
- `tax_documents` → `employees`
- `tax_filings` → `employees`
- `notifications` → `users`
- `document_entries` → `documents`

#### SET NULL
- `employees` → `users` (ถ้าลบ User ให้ user_id = NULL)
- `employees` → `departments`
- `employees` → `positions`
- `leave_requests` → `users` (approved_by)
- `salary_advances` → `users` (approved_by)
- `documents` → `users` (sorted_by)
- `document_entries` → `users` (verified_by)
- `tax_documents` → `users` (inspected_by)
- `tax_filings` → `users` (submitted_by)

#### RESTRICT
- `documents` → `document_categories` (ไม่ให้ลบ Category ถ้ามี Documents)
- `document_entries` → `users` (entered_by) (ไม่ให้ลบ User ถ้ามี Entries)

## 📊 Summary Table

| Parent Table | Child Table | Relationship | FK Column | On Delete |
|-------------|-------------|--------------|-----------|-----------|
| users | employees | 1:1 (optional) | user_id | SET NULL |
| departments | employees | 1:N | department_id | SET NULL |
| positions | employees | 1:N | position_id | SET NULL |
| employees | leave_requests | 1:N | employee_id | CASCADE |
| employees | salary_advances | 1:N | employee_id | CASCADE |
| employees | attendances | 1:N | employee_id | CASCADE |
| employees | tax_documents | 1:N | employee_id | CASCADE |
| employees | tax_filings | 1:N | employee_id | CASCADE |
| users | leave_requests | 1:N | approved_by | SET NULL |
| users | salary_advances | 1:N | approved_by | SET NULL |
| users | documents | 1:N | sorted_by | SET NULL |
| users | document_entries | 1:N | entered_by | RESTRICT |
| users | document_entries | 1:N | verified_by | SET NULL |
| users | tax_documents | 1:N | inspected_by | SET NULL |
| users | tax_filings | 1:N | submitted_by | SET NULL |
| users | notifications | 1:N | user_id | CASCADE |
| document_categories | documents | 1:N | category_id | RESTRICT |
| documents | document_entries | 1:N | document_id | CASCADE |
| clients | accounting_fees | 1:N | build | CASCADE |
| clients | dbd_info | 1:1 | build | CASCADE |
| clients | boi_info | 1:1 | build | CASCADE |
| clients | agency_credentials | 1:1 | build | CASCADE |
| clients | work_assignments | 1:N | build | CASCADE |
| clients | monthly_tax_data | 1:N | build | CASCADE |
| clients | document_entry_work | 1:N | build | CASCADE |
| employees | work_assignments | 1:N | accounting_responsible, tax_inspection_responsible, etc. | SET NULL |
| employees | monthly_tax_data | 1:N | accounting_responsible, tax_inspection_responsible, etc. | SET NULL |
| employees | document_entry_work | 1:N | responsible_employee_id | RESTRICT |
| employees | document_entry_work | 1:N | current_responsible_employee_id, etc. | SET NULL |
| users | work_assignments | 1:N | assigned_by | RESTRICT |

---

**Last Updated**: 2026-01-30
