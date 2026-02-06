# 📊 Data Flow Documentation - Monthly Tax Status Form (ฟอร์มสถานะภาษีประจำเดือน)

## 🎯 วัตถุประสงค์
เอกสารนี้อธิบาย flow การดึงข้อมูลและบันทึกข้อมูลในฟอร์มสถานะภาษีประจำเดือน (`src/pages/TaxStatus.tsx` และ `src/components/TaxInspection/TaxInspectionForm.tsx`)

---

## 📋 ระบบทำงานอย่างไร

### 1. **หน้า Tax Status (`/tax-status`)**

#### **Component Structure:**
- **Main Page**: `src/pages/TaxStatus.tsx`
- **Form Component**: `src/components/TaxInspection/TaxInspectionForm.tsx` (ใช้ร่วมกับหน้า Tax Inspection)
- **Table Component**: `src/components/TaxStatus/TaxStatusTable.tsx`

#### **Data Filtering:**
- ระบบจะดึงข้อมูลตาม `accounting_responsible` ของผู้ที่ล็อกอินเท่านั้น
- ใช้ `employee_id` จาก `useAuthStore` เพื่อ filter ข้อมูล

---

## 🔄 Data Flow - การดึงข้อมูล

### 1. **ดึงข้อมูลรายการภาษีประจำเดือน**

#### **Frontend:**
```typescript
// src/pages/TaxStatus.tsx
const employeeId = user?.employee_id || null

// ส่งไปยัง TaxStatusTable
<TaxStatusTable 
  accounting_responsible={employeeId || undefined}
/>
```

#### **API Call:**
```typescript
// src/components/TaxStatus/TaxStatusTable.tsx
monthlyTaxDataService.getList({
  page: 1,
  limit: 20,
  accounting_responsible: employeeId, // Filter โดย employee_id ของผู้ล็อกอิน
})
```

#### **Backend Route:**
- **Endpoint**: `GET /api/monthly-tax-data`
- **File**: `backend/routes/monthly-tax-data.js` (line 20-212)
- **Access**: All authenticated users
- **Filter Logic**: 
  ```javascript
  if (accounting_responsible) {
    whereConditions.push('mtd.accounting_responsible = ?')
    queryParams.push(accounting_responsible)
  }
  ```

#### **Database Query:**
```sql
SELECT 
  mtd.id,
  mtd.build,
  c.company_name,
  mtd.tax_year,
  mtd.tax_month,
  mtd.accounting_responsible,
  e1.full_name as accounting_responsible_name,
  ...
FROM monthly_tax_data mtd
LEFT JOIN clients c ON mtd.build = c.build
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
...
WHERE mtd.accounting_responsible = ? 
  AND mtd.deleted_at IS NULL
```

---

### 2. **ดึงข้อมูลรายละเอียดเมื่อคลิกเลือกบริษัท**

#### **Frontend:**
```typescript
// src/pages/TaxStatus.tsx
const handleSelectCompany = (buildId: string) => {
  setSelectedBuildId(buildId)
  setFormOpened(true)
}

// ส่งไปยัง TaxInspectionForm
<TaxInspectionForm
  opened={formOpened}
  buildId={selectedBuildId}
  sourcePage="taxStatus"
/>
```

#### **API Call:**
```typescript
// src/components/TaxInspection/TaxInspectionForm.tsx
const { taxYear, taxMonth } = getCurrentTaxMonth() // ย้อนหลัง 1 เดือน

monthlyTaxDataService.getByBuildYearMonth(
  buildId,
  taxYear,
  taxMonth
)
```

#### **Backend Route:**
- **Endpoint**: `GET /api/monthly-tax-data/:build/:year/:month`
- **File**: `backend/routes/monthly-tax-data.js` (line 314-416)
- **Access**: All authenticated users

#### **Database Query:**
```sql
SELECT 
  mtd.*,
  c.company_name,
  e1.full_name as accounting_responsible_name,
  e2.full_name as tax_inspection_responsible_name,
  ...
FROM monthly_tax_data mtd
LEFT JOIN clients c ON mtd.build = c.build
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
...
WHERE mtd.build = ? 
  AND mtd.tax_year = ? 
  AND mtd.tax_month = ? 
  AND mtd.deleted_at IS NULL
```

---

## 💾 Data Flow - การบันทึกข้อมูล

### 1. **เมื่อผู้ใช้กรอกข้อมูลและกด "บันทึกข้อมูล"**

#### **Frontend:**
```typescript
// src/components/TaxInspection/TaxInspectionForm.tsx
const handleSave = () => {
  const updateData: Partial<MonthlyTaxData> = {
    document_received_date: ...,
    bank_statement_status: ...,
    accounting_record_status: ...,
    monthly_tax_impact: ...,
    bank_impact: ...,
    pnd_sent_for_review_date: ...,
    pnd_review_returned_date: ...,
    pnd_sent_to_customer_date: ...,
    pnd_status: ...,
    pnd_1_40_1: ...,
    pnd_1_40_2: ...,
    pnd_3: ...,
    pnd_53: ...,
    pp_36: ...,
    student_loan_form: ...,
    pnd_2: ...,
    pnd_54: ...,
    pt_40: ...,
    social_security_form: ...,
    wht_inquiry: ...,
    wht_response: ...,
    wht_submission_comment: ...,
    wht_filing_response: ...,
    pp30_sent_for_review_date: ...,
    pp30_review_returned_date: ...,
    pp30_customer_sent_date: ...,
    pp30_inquiry: ...,
    pp30_response: ...,
    pp30_submission_comment: ...,
    pp30_filing_response: ...,
    purchase_document_count: ...,
  }

  updateMutation.mutate(updateData)
}
```

#### **API Call:**
```typescript
// src/services/monthlyTaxDataService.ts
async update(id: string, data: Partial<MonthlyTaxData>): Promise<MonthlyTaxData> {
  const response = await api.put<MonthlyTaxDataDetailResponse>(
    `/monthly-tax-data/${id}`, 
    data
  )
  return response.data.data
}
```

#### **Backend Route:**
- **Endpoint**: `PUT /api/monthly-tax-data/:id`
- **File**: `backend/routes/monthly-tax-data.js` (line 791-1040)
- **Access**: 
  - ✅ **Admin**: สามารถบันทึกได้ทุกข้อมูล
  - ✅ **Responsible Users**: สามารถบันทึกได้เฉพาะข้อมูลที่ตนเองรับผิดชอบ
    - `accounting_responsible` → สำหรับหน้า Tax Status
    - `tax_inspection_responsible` → สำหรับหน้า Tax Inspection
    - `wht_filer_employee_id` → สำหรับหน้า Tax Filing (WHT)
    - `vat_filer_employee_id` → สำหรับหน้า Tax Filing (VAT)
    - `document_entry_responsible` → สำหรับหน้า Document Entry

#### **Permission Check Logic:**
```javascript
// ตรวจสอบว่า user เป็น admin หรือ responsible person
const isAdmin = req.user.role === 'admin'
const userEmployeeId = req.user.employee_id

// ดึงข้อมูลเดิมเพื่อตรวจสอบ responsible fields
const [existingData] = await pool.execute(
  `SELECT 
    accounting_responsible,
    tax_inspection_responsible,
    wht_filer_employee_id,
    vat_filer_employee_id,
    document_entry_responsible
  FROM monthly_tax_data 
  WHERE id = ? AND deleted_at IS NULL`,
  [id]
)

if (!isAdmin) {
  const data = existingData[0]
  const isResponsible = 
    data.accounting_responsible === userEmployeeId ||
    data.tax_inspection_responsible === userEmployeeId ||
    data.wht_filer_employee_id === userEmployeeId ||
    data.vat_filer_employee_id === userEmployeeId ||
    data.document_entry_responsible === userEmployeeId

  if (!isResponsible) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions - You are not responsible for this data',
    })
  }
}
```

#### **Database Update:**
```sql
UPDATE monthly_tax_data SET
  document_received_date = ?,
  bank_statement_status = ?,
  accounting_record_status = ?,
  monthly_tax_impact = ?,
  bank_impact = ?,
  pnd_sent_for_review_date = ?,
  pnd_review_returned_date = ?,
  pnd_sent_to_customer_date = ?,
  pnd_status = ?,
  pnd_1_40_1 = ?,
  pnd_1_40_2 = ?,
  pnd_3 = ?,
  pnd_53 = ?,
  pp_36 = ?,
  student_loan_form = ?,
  pnd_2 = ?,
  pnd_54 = ?,
  pt_40 = ?,
  social_security_form = ?,
  wht_inquiry = ?,
  wht_response = ?,
  wht_submission_comment = ?,
  wht_filing_response = ?,
  pp30_sent_for_review_date = ?,
  pp30_review_returned_date = ?,
  pp30_sent_to_customer_date = ?,
  pp30_inquiry = ?,
  pp30_response = ?,
  pp30_submission_comment = ?,
  pp30_filing_response = ?,
  purchase_document_count = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE id = ?
```

---

## 🔐 Permission System

### **Access Control:**

1. **Admin (`role === 'admin'`)**
   - ✅ สามารถดูและบันทึกข้อมูลได้ทุกอย่าง
   - ✅ ไม่มีการ filter ตาม responsible fields

2. **Responsible Users (Non-Admin)**
   - ✅ สามารถดูข้อมูลได้เฉพาะที่ตนเองรับผิดชอบ
   - ✅ สามารถบันทึกข้อมูลได้เฉพาะที่ตนเองรับผิดชอบ
   - ❌ ไม่สามารถดูหรือบันทึกข้อมูลที่ไม่ได้รับผิดชอบ

### **Responsible Fields Mapping:**

| หน้า | Responsible Field | Employee ID Check |
|------|------------------|-------------------|
| **สถานะยื่นภาษี** (`/tax-status`) | `accounting_responsible` | `req.user.employee_id === mtd.accounting_responsible` |
| **ตรวจภาษี** (`/tax-inspection`) | `tax_inspection_responsible` | `req.user.employee_id === mtd.tax_inspection_responsible` |
| **ยื่นภาษี** (`/tax-filing`) | `wht_filer_employee_id` หรือ `vat_filer_employee_id` | `req.user.employee_id === mtd.wht_filer_employee_id` หรือ `req.user.employee_id === mtd.vat_filer_employee_id` |
| **คีย์เอกสาร** (`/document-entry`) | `document_entry_responsible` | `req.user.employee_id === mtd.document_entry_responsible` |

---

## 📊 Data Sources

### 1. **ข้อมูลบริษัท (Company Information)**
- **Source**: `clients` table
- **API**: `GET /api/clients/:build`
- **Fields**: `build`, `company_name`, `legal_entity_number`, `full_address`, `vat_registration_date`, `tax_registration_status`

### 2. **ข้อมูลภาษีรายเดือน (Monthly Tax Data)**
- **Source**: `monthly_tax_data` table
- **API**: `GET /api/monthly-tax-data/:build/:year/:month`
- **Fields**: ทุก fields ที่เกี่ยวข้องกับภาษีรายเดือน

### 3. **ข้อมูลพนักงาน (Employee Information)**
- **Source**: `employees` table
- **API**: `GET /api/employees/:id` (สำหรับ lookup nickname)
- **Fields**: `full_name`, `nick_name` (สำหรับแสดงชื่อในรูปแบบ "ชื่อ(ชื่อเล่น)")

---

## ⚠️ ปัญหาที่พบและวิธีแก้ไข

### **ปัญหา: "Insufficient permissions" Error**

#### **สาเหตุ:**
- Backend route `PUT /api/monthly-tax-data/:id` มี `authorize('admin')` เท่านั้น
- ทำให้เฉพาะ admin เท่านั้นที่สามารถบันทึกข้อมูลได้
- Responsible users ไม่สามารถบันทึกข้อมูลได้ แม้ว่าจะเป็นผู้รับผิดชอบ

#### **วิธีแก้ไข:**
1. แก้ไข backend route ให้ตรวจสอบว่า user เป็น admin หรือ responsible person
2. เพิ่ม permission check logic เพื่อตรวจสอบ `employee_id` กับ responsible fields
3. อนุญาตให้ responsible users บันทึกข้อมูลได้

---

## 🔄 Auto-Timestamp Logic

### **เงื่อนไขการบันทึก Timestamp อัตโนมัติ**

#### **1. Auto-timestamp สำหรับ `pnd_sent_for_review_date` (วันที่ส่งตรวจ ภงด.)**
- **เงื่อนไข**: เมื่อเลือกสถานะ "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`) ใน Select component (สถานะ ภงด.)
- **ผลลัพธ์**: บันทึก Timestamp ปัจจุบันอัตโนมัติเข้าไปใน `pnd_sent_for_review_date`
- **ข้อยกเว้น**: 
  - ถ้าผู้ใช้กรอกวันที่เอง (`formValues.pnd_sent_date`) → ใช้ค่าที่กรอก
  - ถ้าไม่ได้เลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" แต่มีวันที่ส่งตรวจในฐานข้อมูลแล้ว → คงค่าเดิม

#### **2. Auto-timestamp สำหรับ `pnd_review_returned_date` (วันที่ส่งตรวจคืน ภงด.)**
- **เงื่อนไข**: เปลี่ยนสถานะจาก "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`) เป็นสถานะอื่น (เช่น `edit`, `passed`, `paid`, etc.)
- **ผลลัพธ์**: บันทึก Timestamp ปัจจุบันอัตโนมัติเข้าไปใน `pnd_review_returned_date`
- **ข้อยกเว้น**: 
  - ถ้าผู้ใช้กรอกวันที่เอง (`formValues.pnd_return_date`) → ใช้ค่าที่กรอก
  - ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว → คงค่าเดิม

#### **3. Auto-timestamp สำหรับ `pp30_sent_for_review_date` (วันที่ส่งตรวจ ภ.พ. 30)**
- **เงื่อนไข**: เมื่อเลือกสถานะ "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`) ใน Select component (สถานะ ภ.พ.30)
- **ผลลัพธ์**: บันทึก Timestamp ปัจจุบันอัตโนมัติเข้าไปใน `pp30_sent_for_review_date` ทุกครั้งที่กดบันทึก
- **ข้อยกเว้น**: 
  - ถ้าผู้ใช้กรอกวันที่เอง (`formValues.pp30_sent_date`) → ใช้ค่าที่กรอก
  - ⚠️ **สำคัญ**: ตรวจสอบสถานะก่อน `formValues.pp30_sent_date` เพื่อให้แน่ใจว่าถ้าสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" จะอัพเดท timestamp ทุกครั้ง (แม้จะมีค่าเดิมในฐานข้อมูล)

#### **4. Auto-timestamp สำหรับ `pp30_review_returned_date` (วันที่ส่งตรวจคืน ภ.พ. 30)**
- **เงื่อนไข**: เปลี่ยนสถานะจาก "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`) เป็นสถานะอื่น (เช่น `edit`, `passed`, `paid`, etc.)
- **ผลลัพธ์**: บันทึก Timestamp ปัจจุบันอัตโนมัติเข้าไปใน `pp30_review_returned_date`
- **ข้อยกเว้น**: 
  - ถ้าผู้ใช้กรอกวันที่เอง (`formValues.pp30_return_date`) → ใช้ค่าที่กรอก
  - ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว → คงค่าเดิม

#### **Implementation:**

**1. Auto-timestamp สำหรับ `pnd_sent_for_review_date`:**
```typescript
// ใน handleSave() function
let pndSentForReviewDate: string | null = null
if (formValues.pnd_sent_date) {
  // ถ้าผู้ใช้กรอกวันที่เอง ให้ใช้ค่าที่กรอก
  pndSentForReviewDate = dayjs(formValues.pnd_sent_date).format('YYYY-MM-DD HH:mm:ss')
} else if (currentPndStatus === 'pending_review' || currentPndStatus === 'pending_recheck') {
  // ถ้าเลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ให้ set timestamp อัตโนมัติ
  pndSentForReviewDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
} else if (taxData?.pnd_sent_for_review_date) {
  // ถ้าไม่ได้เลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" แต่มีวันที่ส่งตรวจในฐานข้อมูลแล้ว ให้คงค่าเดิม
  pndSentForReviewDate = taxData.pnd_sent_for_review_date
}
```

**2. Auto-timestamp สำหรับ `pnd_review_returned_date` และ `pp30_review_returned_date`:**
```typescript
// ใน handleSave() function
const currentPndStatus = formValues.pnd_status || ''
const currentPp30Status = formValues.pp30_status || ''

// Check if status changed from pending to another status
const pndStatusChanged = 
  (originalPndStatus === 'pending_review' || originalPndStatus === 'pending_recheck') &&
  currentPndStatus !== 'pending_review' &&
  currentPndStatus !== 'pending_recheck' &&
  currentPndStatus !== ''

const pp30StatusChanged = 
  (originalPp30Status === 'pending_review' || originalPp30Status === 'pending_recheck') &&
  currentPp30Status !== 'pending_review' &&
  currentPp30Status !== 'pending_recheck' &&
  currentPp30Status !== ''

// Auto-set timestamp if status changed
let pndReviewReturnedDate: string | null = null
if (pndStatusChanged) {
  pndReviewReturnedDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
} else if (formValues.pnd_return_date) {
  // ถ้าผู้ใช้กรอกวันที่เอง ให้ใช้ค่าที่กรอก
  pndReviewReturnedDate = dayjs(formValues.pnd_return_date).format('YYYY-MM-DD HH:mm:ss')
} else if (taxData?.pnd_review_returned_date) {
  // ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว ให้คงค่าเดิม
  pndReviewReturnedDate = taxData.pnd_review_returned_date
}

let pp30ReviewReturnedDate: string | null = null
if (pp30StatusChanged) {
  pp30ReviewReturnedDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
} else if (formValues.pp30_return_date) {
  // ถ้าผู้ใช้กรอกวันที่เอง ให้ใช้ค่าที่กรอก
  pp30ReviewReturnedDate = dayjs(formValues.pp30_return_date).format('YYYY-MM-DD HH:mm:ss')
} else if (taxData?.pp30_review_returned_date) {
  // ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว ให้คงค่าเดิม
  pp30ReviewReturnedDate = taxData.pp30_review_returned_date
}
```

#### **หมายเหตุ:**
- **`pnd_sent_for_review_date`**: Auto-timestamp เมื่อเลือกสถานะ "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`)
- **`pnd_review_returned_date` และ `pp30_review_returned_date`**: Auto-timestamp เมื่อเปลี่ยนสถานะจาก "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เป็นสถานะอื่น
- ถ้าผู้ใช้กรอกวันที่ด้วยตนเอง ระบบจะใช้วันที่ที่ผู้ใช้กรอกแทน auto-timestamp
- ถ้ามีวันที่ในฐานข้อมูลแล้ว ระบบจะคงค่าเดิม (ไม่ทับ)

---

## 📝 API Endpoints Summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/monthly-tax-data` | All authenticated | ดึงรายการข้อมูลภาษีรายเดือน (filter โดย responsible fields) |
| `GET` | `/api/monthly-tax-data/:build/:year/:month` | All authenticated | ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month |
| `GET` | `/api/monthly-tax-data/:id` | All authenticated | ดึงข้อมูลภาษีรายเดือนตาม ID |
| `PUT` | `/api/monthly-tax-data/:id` | Admin หรือ Responsible Users | แก้ไขข้อมูลภาษีรายเดือน |

---

## 🔄 Update Flow Diagram

```
User clicks "บันทึกข้อมูล"
  ↓
TaxInspectionForm.handleSave()
  ↓
monthlyTaxDataService.update(id, data)
  ↓
PUT /api/monthly-tax-data/:id
  ↓
Backend: authenticateToken middleware
  ↓
Backend: Check permissions (Admin or Responsible?)
  ↓
If Admin: ✅ Allow
If Responsible: Check employee_id matches responsible fields
  ↓
If matches: ✅ Allow
If not matches: ❌ Return 403 Forbidden
  ↓
Update database: UPDATE monthly_tax_data SET ... WHERE id = ?
  ↓
Return updated data
  ↓
Frontend: Show success notification
```

---

---

## 📝 Recent Updates (2026-01-31)

### เพิ่มระบบสถานะและจำนวนใบแนบของแบบฟอร์มภาษี

**การเปลี่ยนแปลง**:
1. เพิ่ม columns ใหม่ในตาราง `monthly_tax_data`:
   - **สถานะของแบบฟอร์ม** (VARCHAR): `pnd_1_40_1_status`, `pnd_1_40_2_status`, `pnd_3_status`, `pnd_53_status`, `pp_36_status`, `student_loan_form_status`, `pnd_2_status`, `pnd_54_status`, `pt_40_status`, `social_security_form_status`
   - **จำนวนใบแนบ** (INT): `pnd_1_40_1_attachment_count`, `pnd_1_40_2_attachment_count`, `pnd_3_attachment_count`, `pnd_53_attachment_count`, `pp_36_attachment_count`, `student_loan_form_attachment_count`, `pnd_2_attachment_count`, `pnd_54_attachment_count`, `pt_40_attachment_count`, `social_security_form_attachment_count`

2. **Backend API Updates**:
   - `GET /api/monthly-tax-data` - ดึงข้อมูล status และ attachment_count
   - `PUT /api/monthly-tax-data/:id` - บันทึกข้อมูล status และ attachment_count

3. **Frontend Updates**:
   - `TaxInspectionForm.tsx` - แสดงและบันทึกสถานะและจำนวนใบแนบ
   - `monthlyTaxDataService.ts` - เพิ่ม interface fields ใหม่

4. **Security**:
   - ⚠️ การบันทึกข้อมูลจะไม่ทับข้อมูลพนักงาน (responsible fields) ที่เชื่อมมาจากงานที่ได้รับมอบหมาย
   - `handleSave` ไม่ส่ง `accounting_responsible`, `tax_inspection_responsible`, `wht_filer_employee_id`, `vat_filer_employee_id`, `document_entry_responsible` ไปยัง API
   - Backend ใช้ `!== undefined` check เพื่อป้องกันการ update responsible fields ถ้าไม่ได้ส่งมา

**Migration**: `migrations/021_add_tax_form_status_and_attachment_count.sql`

---

---

## 🐛 Bug Fixes (2026-01-31)

### BUG-107: Error 500 เมื่อบันทึกข้อมูลสถานะและจำนวนใบแนบ

**ปัญหา**:
- Error 500 เมื่อบันทึกข้อมูล
- จำนวนใบแนบแสดง "0" แทนค่าว่างเมื่อไม่มีข้อมูล

**การแก้ไข**:
1. แก้ไข `useEffect` ให้แสดงค่าว่างแทน "0" เมื่อไม่มีข้อมูล
2. แก้ไข `parseInt` logic ให้ handle empty string และ invalid values
3. เปลี่ยน placeholder จาก "0" เป็น "" (empty string)
4. เพิ่ม error handling ใน backend สำหรับ database errors

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-107)

---

---

## 🐛 Bug Fixes (2026-01-31) - Continued

### BUG-109: Responsible Fields ถูกลบออกหลังจากบันทึกข้อมูล

**ปัญหา**:
- Responsible fields (`accounting_responsible`, `tax_inspection_responsible`, `wht_filer_employee_id`, `vat_filer_employee_id`, `document_entry_responsible`) ถูกลบออกหลังจากบันทึกข้อมูล

**การแก้ไข**:
1. Backend ใช้ค่าเดิมจากฐานข้อมูลสำหรับ responsible fields ถ้าไม่ได้ส่งมา
2. เพิ่ม `wht_filer_current_employee_id` และ `vat_filer_current_employee_id` ใน existingData query
3. Preserve boolean fields ด้วย (ไม่ reset เป็น false)

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-109)

---

---

## 🐛 Bug Fixes (2026-01-31) - Continued

### BUG-111: Auto-timestamp สำหรับ pnd_sent_for_review_date เมื่อเลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"

**ปัญหา**:
- เมื่อเลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ระบบไม่ set `pnd_sent_for_review_date` อัตโนมัติ

**การแก้ไข**:
- เพิ่ม logic ใน `handleSave` เพื่อ auto-timestamp เมื่อเลือกสถานะ "pending_review" หรือ "pending_recheck"
- ถ้าผู้ใช้กรอกวันที่เอง ระบบจะใช้ค่าที่กรอก
- ถ้าไม่ได้เลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" แต่มีวันที่ส่งตรวจในฐานข้อมูลแล้ว ระบบจะคงค่าเดิม

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-111)

---

---

## 🔔 Tax Review Notification System (2026-01-31)

### ระบบแจ้งเตือนเมื่อส่งรอตรวจ

**ฟีเจอร์**:
1. **Auto-create notification**: เมื่อบันทึกสถานะ "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`)
   - สำหรับ `pnd_status`: ส่งแจ้งเตือนไปยัง `tax_inspection_responsible` (ผู้รับผิดชอบตรวจ)
   - สำหรับ `pp30_status`: ส่งแจ้งเตือนไปยัง `tax_inspection_responsible` (ผู้รับผิดชอบตรวจ)
   - ⚠️ **สำคัญ**: ทั้ง PND และ PP30 จะส่ง notification ไปที่ `tax_inspection_responsible` เพราะเมื่อผู้ทำบัญชี (`accounting_responsible`) ส่งสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ต้องแจ้งผู้ตรวจ (`tax_inspection_responsible`) ให้ทราบ

2. **Auto-mark as read**: เมื่อผู้รับผิดชอบเปิดดูข้อมูลบริษัท
   - `GET /api/monthly-tax-data/:id` - mark notification as read
   - `GET /api/monthly-tax-data/:build/:year/:month` - mark notification as read

3. **Auto-delete**: ลบ notification อัตโนมัติหลังจาก 12 ชั่วโมงหลังจาก `read_at`
   - Scheduled job รันทุกชั่วโมง
   - Endpoint: `POST /api/notifications/cleanup-expired` (Admin only)

**Notification Types**:
- `tax_review_pending` - แจ้งเตือนเมื่อส่งรอตรวจ
- `tax_review_pending_recheck` - แจ้งเตือนเมื่อส่งรอตรวจอีกครั้ง

**Implementation**:
- `backend/routes/monthly-tax-data.js` - Helper functions (`createTaxReviewNotification`) และ logic สำหรับสร้าง notification
- `backend/routes/notifications.js` - Helper function สำหรับ cleanup expired notifications
- `backend/server.js` - Scheduled job สำหรับ cleanup (ทุกชั่วโมง)

**Migration**: `migrations/022_add_tax_review_notification_types.sql`

**การแก้ไข (2026-02-02)**:
- แก้ไข PP30 notification ให้ส่งไปที่ `tax_inspection_responsible` แทน `accounting_responsible`
- ทั้ง PND และ PP30 จะส่ง notification ไปที่ `tax_inspection_responsible` เมื่อมีการส่งสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
- **ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-128)

---

---

## 🔔 Tax Inspection Completed Notification System (2026-02-02)

### ระบบแจ้งเตือนเมื่อผู้ตรวจบันทึกข้อมูลแล้ว

**ฟีเจอร์**:
1. **Auto-create notification**: เมื่อผู้ตรวจ (tax_inspection_responsible) บันทึกข้อมูลและสถานะเปลี่ยนจาก "รอตรวจ" (`pending_review`) หรือ "รอตรวจอีกครั้ง" (`pending_recheck`) เป็นสถานะอื่น (เช่น `edit`, `passed`, `paid`, etc.)
   - ส่งแจ้งเตือนไปยัง `accounting_responsible`
   - แสดงสถานะและคอมเมนต์บางส่วน (100 ตัวอักษรแรก)

2. **Notification Details**:
   - **Title**: "ผู้ตรวจได้ตรวจสอบข้อมูลแล้ว"
   - **Message**: แสดงบริษัท, Build, เดือน/ปี, สถานะ, ผู้ตรวจ, และคอมเมนต์บางส่วน
   - **Icon**: `TbCheck` (สีเขียว)
   - **Action URL**: `/tax-status?build={build}&year={year}&month={month}`
   - **Expires**: 24 ชั่วโมงหลังจากสร้าง

**Notification Type**:
- `tax_inspection_completed` - แจ้งเตือนเมื่อผู้ตรวจบันทึกข้อมูลแล้ว

**Implementation**:
- `backend/routes/monthly-tax-data.js` - Function `createTaxInspectionCompletedNotification()` และ logic สำหรับสร้าง notification
- `backend/routes/monthly-tax-data.js` - PUT route ตรวจสอบว่าเป็นผู้ตรวจและสถานะเปลี่ยนจาก pending เป็นสถานะอื่น

**Migration**: `migrations/024_add_tax_inspection_completed_notification_type.sql`

**เงื่อนไขการสร้าง Notification**:
1. ผู้ใช้เป็น `tax_inspection_responsible` (ผู้ตรวจ)
2. สถานะเดิม (`existingPndStatus`) เป็น `pending_review` หรือ `pending_recheck`
3. สถานะใหม่ (`pnd_status`) ไม่ใช่ `pending_review` หรือ `pending_recheck` และไม่ใช่ empty string
4. ⚠️ **สำคัญ**: สร้าง notification เฉพาะเมื่อสถานะเปลี่ยนจาก "pending" เป็นสถานะอื่นเท่านั้น (ไม่สร้างซ้ำเมื่อบันทึกข้อมูลซ้ำในสถานะเดิม)
4. มี `accounting_responsible` ในข้อมูล

---

---

## 🔄 Data Refresh & Error Handling (2026-02-02)

### ระบบอัพเดทข้อมูลทันทีหลังจากบันทึกสำเร็จ

**ฟีเจอร์**:
1. **Auto-refetch after save**: หลังจากบันทึกสำเร็จ ระบบจะ refetch ข้อมูลทันทีก่อนปิด modal
   - ใช้ `refetchTaxData()` จาก `useQuery` เพื่อ refetch ข้อมูล
   - ใช้ `await` เพื่อรอให้ refetch เสร็จก่อนปิด modal
   - ใช้ try-catch เพื่อจัดการ error ในการ refetch

2. **Auto-refetch on mount/focus**: ข้อมูลจะถูก refetch อัตโนมัติเมื่อ:
   - Component mounts (`refetchOnMount: true`)
   - Window gains focus (`refetchOnWindowFocus: true`)

3. **Query invalidation**: หลังจากบันทึกสำเร็จ ระบบจะ invalidate queries ที่เกี่ยวข้อง:
   - `['monthly-tax-data']` - invalidate ทุก queries
   - `['monthly-tax-data', buildId, currentYear, currentMonth]` - invalidate query ปัจจุบัน
   - `['monthly-tax-data', 'tax-status']` - สำหรับหน้าสถานะยื่นภาษี
   - `['monthly-tax-data', 'tax-inspection']` - สำหรับหน้าตรวจภาษี
   - `['monthly-tax-data', 'tax-filing']` - สำหรับหน้ายื่นภาษี

### Error Handling

**Network Error Detection**:
- ตรวจสอบ `ERR_CONNECTION_REFUSED`, `ERR_SOCKET_NOT_CONNECTED`, `Network Error`
- แสดง error message ที่ชัดเจนเมื่อ Backend Server ไม่ได้รัน
- Error message: "ไม่สามารถเชื่อมต่อกับ Backend Server ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001"

**Implementation**:
- `TaxInspectionForm.tsx` - `onSuccess` callback ใน `updateMutation`
- `TaxStatusTable.tsx`, `TaxFilingTable.tsx`, `TaxInspectionTable.tsx` - Error handling ใน `useQuery`

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-120, BUG-123, BUG-125, BUG-126)

---

## 🚫 VAT Tab Restriction (2026-02-02)

### ระบบจำกัดการเข้าถึงแถบ VAT

**ฟีเจอร์**:
- ป้องกันการเข้าถึงแถบ "ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)" เมื่อบริษัทไม่ได้จดภาษีมูลค่าเพิ่ม
- ตรวจสอบ `tax_registration_status` จาก `clients` table
- ถ้า `tax_registration_status !== 'จดภาษีมูลค่าเพิ่ม'` → disable tab และแสดง Alert

**Implementation**:
- `TaxInspectionForm.tsx` - ใช้ `isVatRegistered` useMemo hook
- `Tabs` component - `disabled` prop และ `onChange` handler
- `Alert` component - แสดงข้อความเตือนใน VAT tab panel

**ผลลัพธ์**:
- ✅ Tab VAT จะถูก disable เมื่อบริษัทไม่ได้จดภาษีมูลค่าเพิ่ม
- ✅ ผู้ใช้ไม่สามารถคลิกหรือเข้าถึงแถบ VAT ได้
- ✅ แสดง Alert ข้อความเตือนเมื่อพยายามเข้าถึง

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-118)

---

## 📅 Date Format Improvements (2026-02-02)

### การปรับปรุงรูปแบบการแสดงผลวันที่

**ฟีเจอร์**:
1. **วันที่รับเอกสาร**: แสดงในรูปแบบ `DD/MM/YYYY` แทน `YYYY-MM-DD`
   - ใช้ `valueFormat="DD/MM/YYYY"` ใน `DatePickerInput`

2. **วันที่จดภาษีมูลค่าเพิ่ม**: แสดงในรูปแบบ `DD/MM/YYYY` แทน `YYYY-MM-DD`
   - ใช้ `formatDate` helper function (dayjs)

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-118)

---

## 🔤 Status Translation (2026-02-02)

### การแปลสถานะ "EDIT" เป็นภาษาไทย

**ฟีเจอร์**:
- แปลงสถานะ "EDIT" จากฐานข้อมูลเป็น "แก้ไข" (ภาษาไทย) ใน UI
- รองรับใน `TaxStatusTable.tsx` และ `TaxFilingTable.tsx`

**Implementation**:
- เพิ่ม `case 'edit'` ใน `getStatusColor` และ `getStatusLabel` functions
- เพิ่ม `'edit'` ใน `TaxStatusRecord['pndStatus']` interface

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-120)

---

## 💾 Database Schema Updates (2026-02-02)

### การเปลี่ยนแปลง Schema สำหรับ `income_confirmed`

**การเปลี่ยนแปลง**:
- เปลี่ยน `income_confirmed` จาก `BOOLEAN` เป็น `VARCHAR(100)`
- รองรับ enum values: `'customer_confirmed'`, `'no_confirmation_needed'`, `'waiting_customer'`, `'customer_request_change'`
- แปลงข้อมูลเดิม: `TRUE` → `'customer_confirmed'`, `FALSE` → `'waiting_customer'`

**Migration**: `migrations/025_change_income_confirmed_to_varchar.sql`

**ดูรายละเอียด**: `Documentation/Agent_cursor_ai/BUG_FIXES.md` (BUG-122)

---

**Last Updated**: 2026-02-02  
**Status**: ✅ Complete (พร้อมแก้ไข Permission Issue + เพิ่มระบบสถานะและจำนวนใบแนบ + แก้ไข BUG-107, BUG-108, BUG-109, BUG-110, BUG-111, BUG-118, BUG-119, BUG-120, BUG-121, BUG-122, BUG-123, BUG-124, BUG-125, BUG-126 + เพิ่มระบบแจ้งเตือนเมื่อส่งรอตรวจ + เพิ่มระบบแจ้งเตือนเมื่อผู้ตรวจบันทึกข้อมูลแล้ว + เพิ่มระบบจำกัดการเข้าถึงแถบ VAT + ปรับปรุงรูปแบบการแสดงผลวันที่ + แปลงสถานะ "EDIT" เป็นภาษาไทย + เปลี่ยน `income_confirmed` เป็น VARCHAR)
