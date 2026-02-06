# 📊 Data Flow Documentation - Tax Inspection Form

## 🎯 วัตถุประสงค์
เอกสารนี้อธิบาย flow การดึงข้อมูลและแสดงผลในฟอร์ม Tax Inspection Form (`src/components/TaxInspection/TaxInspectionForm.tsx`)

---

## 📋 Data Sources และ Flow

### 1. ข้อมูลบริษัท (Company Information)

#### **Source: `clients` Table**
- **API Endpoint**: `GET /api/clients/:build`
- **Service**: `clientsService.getByBuild(buildId)`
- **Backend Route**: `backend/routes/clients.js` → `GET /:build`
- **Query**: 
  ```sql
  SELECT 
    c.id, c.build, c.company_name, c.legal_entity_number,
    c.tax_registration_status, c.vat_registration_date,
    c.full_address, ...
  FROM clients c
  WHERE c.build = ? AND c.deleted_at IS NULL
  ```

#### **Fields ที่ใช้:**
- `build` → **Build Code** (แสดงในฟอร์ม)
- `company_name` → **ชื่อบริษัท** (แสดงในฟอร์ม)
- `legal_entity_number` → **เลขทะเบียนนิติบุคคล** (แสดงในฟอร์ม)
- `full_address` → **ที่อยู่บริษัท** (แสดงในฟอร์ม)
- `tax_registration_status` → **สถานะจดทะเบียนภาษี** (แสดงในฟอร์ม)
- `vat_registration_date` → **วันที่จดภาษีมูลค่าเพิ่ม** (แสดงในฟอร์ม)

#### **Flow:**
```
TaxInspectionForm.tsx (line 61-68)
  ↓
clientsService.getByBuild(buildId)
  ↓
GET /api/clients/:build
  ↓
backend/routes/clients.js → GET /:build
  ↓
Query: SELECT * FROM clients WHERE build = ?
  ↓
Return: Client object
  ↓
Display: companyData.companyName, companyData.legalEntityNumber, etc.
```

---

### 2. ข้อมูลภาษีรายเดือน (Monthly Tax Data)

#### **Source: `monthly_tax_data` Table**
- **API Endpoint**: `GET /api/monthly-tax-data/:build/:year/:month`
- **Service**: `monthlyTaxDataService.getByBuildYearMonth(buildId, year, month)`
- **Backend Route**: `backend/routes/monthly-tax-data.js` → `GET /:build/:year/:month`
- **Query**: 
  ```sql
  SELECT 
    mtd.*,
    c.company_name,
    e1.full_name as accounting_responsible_name,
    e2.full_name as tax_inspection_responsible_name,
    e7.full_name as document_entry_responsible_name,
    ...
  FROM monthly_tax_data mtd
  LEFT JOIN clients c ON mtd.build = c.build
  LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
  LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
  LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
  WHERE mtd.build = ? AND mtd.tax_year = ? AND mtd.tax_month = ? 
    AND mtd.deleted_at IS NULL
  ```

#### **Fields ที่ใช้:**
- `accounting_responsible_name` → **ผู้ทำ** (ทำบัญชี) - JOIN จาก `employees` table
- `document_entry_responsible_name` → **พนักงานที่รับผิดชอบในการคีย์** - JOIN จาก `employees` table
- `tax_inspection_responsible_name` → **ผู้ตรวจภาษี** - JOIN จาก `employees` table
- `wht_filer_employee_name` → **ผู้ยื่น WHT** - JOIN จาก `employees` table
- `vat_filer_employee_name` → **ผู้ยื่น VAT** - JOIN จาก `employees` table
- และ fields อื่นๆ สำหรับข้อมูลภาษี

#### **Flow:**
```
TaxInspectionForm.tsx (line 51-58)
  ↓
getCurrentTaxMonth() → ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน
  ↓
monthlyTaxDataService.getByBuildYearMonth(buildId, taxYear, taxMonth)
  ↓
GET /api/monthly-tax-data/:build/:year/:month
  ↓
backend/routes/monthly-tax-data.js → GET /:build/:year/:month
  ↓
Query: SELECT mtd.*, e1.full_name as accounting_responsible_name, ...
  FROM monthly_tax_data mtd
  LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
  ...
  ↓
Return: MonthlyTaxData object
  ↓
Display: 
  - companyData.preparedBy = taxData?.accounting_responsible_name
  - companyData.responsibleEmployee = taxData?.document_entry_responsible_name
```

---

### 3. พนักงานที่รับผิดชอบ (Responsible Employees)

#### **Source: `employees` Table**
- **Primary Source**: JOIN จาก `monthly_tax_data` query (ได้ `full_name` และ `employee_id`)
- **Additional Source**: Fetch แยกต่างหากด้วย `useQueries` เพื่อหา `nick_name` (เพราะ backend filter เฉพาะ employee ของผู้ใช้ที่ล็อกอินถ้าไม่ใช่ admin)
- **JOIN Logic** (จาก monthly_tax_data):
  ```sql
  LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
  LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
  LEFT JOIN employees e7 ON mtd.document_entry_responsible = e7.employee_id
  ```

#### **Fields ที่ใช้:**
- `e1.full_name` → `accounting_responsible_name` → **ผู้ทำ** (ทำบัญชี)
- `e7.full_name` → `document_entry_responsible_name` → **พนักงานที่รับผิดชอบในการคีย์**
- `e1.employee_id` → `accounting_responsible` → ใช้สำหรับ lookup nickname
- `e7.employee_id` → `document_entry_responsible` → ใช้สำหรับ lookup nickname

#### **Flow:**
```
monthly_tax_data table
  ↓
JOIN employees table (e1, e7)
  ↓
Get employee full_name และ employee_id
  ↓
Return as:
  - accounting_responsible_name (full_name)
  - accounting_responsible (employee_id)
  - document_entry_responsible_name (full_name)
  - document_entry_responsible (employee_id)
  ↓
TaxInspectionForm:
  1. Fetch employeesData (มี nick_name field) - GET /api/employees (limit: 1000, status: 'active')
  2. Fetch specific employees by ID using useQueries:
     - accounting_responsible (employee_id) → GET /api/employees/:employee_id
     - document_entry_responsible (employee_id) → GET /api/employees/:employee_id
     - รวมข้อมูลเข้ากับ employeesData เป็น allEmployeesData
  3. formatEmployeeNameWithId(name, employee_id)
     → Lookup nickname จาก allEmployeesData โดยใช้ employee_id
     → Extract first name only (ตัดนามสกุลออก)
     → Format: "ชื่อ(ชื่อเล่น)" เช่น "พงษ์สิทธิ์(ปู)" (ไม่แสดงนามสกุล)
  ↓
Display in TaxInspectionForm:
  - ผู้ทำ: "ชื่อ(ชื่อเล่น)" เช่น "พงษ์สิทธิ์(ปู)"
  - พนักงานที่รับผิดชอบในการคีย์: "ชื่อ(ชื่อเล่น)" เช่น "ปัญญากร(ซอคเกอร์)"
```

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              TaxInspectionForm Component                    │
│  (src/components/TaxInspection/TaxInspectionForm.tsx)     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                     │
        ▼                                     ▼
┌─────────────────────┐           ┌──────────────────────┐
│ 1. Fetch Client Data │           │ 2. Fetch Tax Data    │
│                      │           │                      │
│ clientsService       │           │ monthlyTaxDataService│
│ .getByBuild(buildId) │           │ .getByBuildYearMonth │
└─────────────────────┘           └──────────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
┌─────────────────────┐           ┌──────────────────────┐
│ GET /api/clients/   │           │ GET /api/monthly-tax- │
│        :build       │           │ data/:build/:year/    │
│                     │           │        :month        │
└─────────────────────┘           └──────────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
┌─────────────────────┐           ┌──────────────────────┐
│ backend/routes/     │           │ backend/routes/      │
│ clients.js          │           │ monthly-tax-data.js  │
└─────────────────────┘           └──────────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
┌─────────────────────┐           ┌──────────────────────┐
│ SELECT * FROM       │           │ SELECT mtd.*,         │
│ clients             │           │   e1.full_name as    │
│ WHERE build = ?     │           │   accounting_respons │
│                     │           │   ible_name,         │
│                     │           │   e7.full_name as    │
│                     │           │   document_entry_    │
│                     │           │   responsible_name   │
│                     │           │ FROM monthly_tax_data│
│                     │           │ LEFT JOIN employees  │
│                     │           │   e1 ON ...          │
│                     │           │ LEFT JOIN employees  │
│                     │           │   e7 ON ...          │
└─────────────────────┘           └──────────────────────┘
        │                                     │
        │                                     │
        └─────────────────┬───────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   Map Data to companyData Object    │
        │                                     │
        │   companyData = {                   │
        │     build: clientData.build,        │
        │     companyName: clientData.        │
        │       company_name,                 │
        │     legalEntityNumber: clientData.  │
        │       legal_entity_number,          │
        │     ...                             │
        │     preparedBy: formatEmployeeName  │
        │       WithId(                       │
        │         taxData?.accounting_        │
        │         responsible_name,           │
        │         taxData?.accounting_        │
        │         responsible                 │
        │       ),                            │
        │     responsibleEmployee: format      │
        │       EmployeeNameWithId(           │
        │         taxData?.document_entry_    │
        │         responsible_name,           │
        │         taxData?.document_entry_    │
        │         responsible                 │
        │       ),                            │
        │   }                                 │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Display in UI Form             │
        │                                     │
        │   - Build: {companyData.build}      │
        │   - ชื่อบริษัท: {companyData.      │
        │       companyName}                  │
        │   - ผู้ทำ: {companyData.          │
        │       preparedBy}                   │
        │     → แสดงเป็น "ชื่อ(ชื่อเล่น)"   │
        │     เช่น "พงษ์สิทธิ์(ปู)"         │
        │     (ตัดนามสกุลออก)                │
        │   - พนักงานที่รับผิดชอบในการคีย์:  │
        │     {companyData.responsibleEmployee}│
        │     → แสดงเป็น "ชื่อ(ชื่อเล่น)"   │
        │     เช่น "ปัญญากร(ซอคเกอร์)"      │
        │     (ตัดนามสกุลออก)                │
        └─────────────────────────────────────┘
```

---

## 📝 Field Mapping Summary

| Field ในฟอร์ม | Source Table | Source Field | API Response Field | Display Location |
|---------------|--------------|--------------|-------------------|------------------|
| **Build** | `clients` | `build` | `clientData.build` | ข้อมูลบริษัท |
| **ชื่อบริษัท** | `clients` | `company_name` | `clientData.company_name` | ข้อมูลบริษัท |
| **เลขทะเบียนนิติบุคคล** | `clients` | `legal_entity_number` | `clientData.legal_entity_number` | ข้อมูลบริษัท |
| **สถานะจดทะเบียนภาษี** | `clients` | `tax_registration_status` | `clientData.tax_registration_status` | ข้อมูลบริษัท |
| **วันที่จดภาษีมูลค่าเพิ่ม** | `clients` | `vat_registration_date` | `clientData.vat_registration_date` | ข้อมูลบริษัท |
| **ที่อยู่บริษัท** | `clients` | `full_address` | `clientData.full_address` | ข้อมูลบริษัท |
| **ผู้ทำ** | `monthly_tax_data` + `employees` | `accounting_responsible` → JOIN `employees.full_name` | `taxData.accounting_responsible_name` | ข้อมูลบริษัท |
| **พนักงานที่รับผิดชอบในการคีย์** | `monthly_tax_data` + `employees` | `document_entry_responsible` → JOIN `employees.full_name` | `taxData.document_entry_responsible_name` | ข้อมูลบริษัท |

---

## 🔍 API Endpoints ที่ใช้

### 1. `GET /api/clients/:build`
- **Purpose**: ดึงข้อมูลบริษัทตาม Build Code
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "build": "122",
      "company_name": "ชิคสไมล์เด็นทัล(สาขานนทบุรี)",
      "legal_entity_number": "0705565002650",
      "tax_registration_status": "ยังไม่จดภาษีมูลค่าเพิ่ม",
      "vat_registration_date": null,
      "full_address": "...",
      ...
    }
  }
  ```

### 2. `GET /api/monthly-tax-data/:build/:year/:month`
- **Purpose**: ดึงข้อมูลภาษีรายเดือนตาม Build, Year, Month (เดือนภาษี = ย้อนหลัง 1 เดือน)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "build": "122",
      "tax_year": 2026,
      "tax_month": 1,
      "accounting_responsible": "AC00034",
      "accounting_responsible_name": "ปัญญากร ปลื้มใจ",
      "document_entry_responsible": "AC00040",
      "document_entry_responsible_name": "พงษ์สิทธิ์ สูงสนิท",
      ...
    }
  }
  ```

### 3. `GET /api/employees` (List)
- **Purpose**: ดึงรายชื่อพนักงานทั้งหมด (สำหรับ lookup nickname)
- **Query Parameters**: `limit=1000`, `status=active`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "employees": [
        {
          "employee_id": "AC00008",
          "full_name": "ชื่อเต็ม",
          "nick_name": "ชื่อเล่น",
          ...
        }
      ],
      "pagination": {...}
    }
  }
  ```
- **Note**: Backend filter เฉพาะ employee ของผู้ใช้ที่ล็อกอินถ้าไม่ใช่ admin

### 4. `GET /api/employees/:id` (Detail)
- **Purpose**: ดึงข้อมูลพนักงานแต่ละคน (สำหรับ lookup nickname ของพนักงานคนอื่น)
- **Parameters**: รองรับทั้ง UUID (`e.id`) และ `employee_id` (เช่น `AC00035`)
- **Access Control**: 
  - Admin: ดูข้อมูลครบถ้วน
  - Non-admin viewing own data: ดูข้อมูลครบถ้วน
  - Non-admin viewing other employees: ดูเฉพาะข้อมูลพื้นฐาน (`full_name`, `nick_name`, `position`, `status`)
- **Response** (Non-admin viewing other employees):
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "employee_id": "AC00035",
      "full_name": "ชื่อเต็ม",
      "nick_name": "ชื่อเล่น",
      "position": "...",
      "status": "active"
    }
  }
  ```
- **Note**: ใช้ `useQueries` เพื่อ fetch employees ที่ต้องการ (`accounting_responsible` และ `document_entry_responsible`) แยกต่างหาก

---

## ✅ Verification Checklist

- [x] Backend API ดึง `accounting_responsible_name` มาแล้ว
- [x] Backend API ดึง `document_entry_responsible_name` มาแล้ว
- [x] Backend API ดึง `accounting_responsible` (employee_id) มาแล้ว
- [x] Backend API ดึง `document_entry_responsible` (employee_id) มาแล้ว
- [x] Frontend Service มี field `accounting_responsible_name`, `accounting_responsible`, `document_entry_responsible_name`, `document_entry_responsible`
- [x] Frontend Form มี helper function `formatEmployeeNameWithId` สำหรับ format ชื่อพร้อม nickname
- [x] Frontend Form แสดง `accounting_responsible_name` พร้อม nickname ในช่อง "ผู้ทำ" (รูปแบบ: "ชื่อ(ชื่อเล่น)" เช่น "พงษ์สิทธิ์(ปู)" - ตัดนามสกุลออก)
- [x] Frontend Form แสดง `document_entry_responsible_name` พร้อม nickname ในช่อง "พนักงานที่รับผิดชอบในการคีย์" (รูปแบบ: "ชื่อ(ชื่อเล่น)" เช่น "ปัญญากร(ซอคเกอร์)" - ตัดนามสกุลออก)
- [x] Frontend Form ใช้ `useQueries` เพื่อ fetch employees แยกต่างหาก (accounting_responsible และ document_entry_responsible) เพื่อหา nickname
- [x] Backend Route `/api/employees/:id` รองรับทั้ง UUID (e.id) และ employee_id (เช่น AC00035)
- [x] Backend Route `/api/employees/:id` อนุญาตให้ผู้ใช้ที่ไม่ใช่ admin ดูข้อมูลพื้นฐาน (full_name, nick_name) ของพนักงานคนอื่นได้

---

---

## 🔧 Technical Implementation Details

### Employee Name Formatting Logic

#### `formatEmployeeNameWithId` Function:
```typescript
const formatEmployeeNameWithId = useCallback((
  name: string | null | undefined,
  employeeId: string | null | undefined
): string => {
  if (!name) return '-'
  
  // Extract first name only (remove last name)
  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0]
  
  // Handle already formatted names (with parentheses)
  if (name.includes('(') && name.includes(')')) {
    const beforeParen = name.split('(')[0].trim()
    const firstNameOnly = beforeParen.split(/\s+/)[0]
    const nicknameMatch = name.match(/\(([^)]+)\)/)
    const nickname = nicknameMatch ? nicknameMatch[1] : null
    if (nickname) {
      return `${firstNameOnly}(${nickname})`
    }
    return firstNameOnly
  }
  
  // Lookup nickname from allEmployeesData
  if (employeeId && allEmployeesData?.employees) {
    const employee = allEmployeesData.employees.find(
      (emp) => emp.employee_id === employeeId
    )
    if (employee?.nick_name) {
      const displayName = employee.first_name || firstName
      return `${displayName}(${employee.nick_name})`
    }
  }
  
  return firstName
}, [allEmployeesData])
```

#### Key Features:
- ✅ Extract first name only (ตัดนามสกุลออก)
- ✅ Lookup nickname จาก `allEmployeesData` (รวมข้อมูลจาก `employeesData` และ `useQueries`)
- ✅ Support both `first_name` field และ extraction จาก `full_name`
- ✅ Handle already formatted names (with parentheses)

### Data Fetching Strategy

#### Why use `useQueries`?
- Backend `/api/employees` filter เฉพาะ employee ของผู้ใช้ที่ล็อกอินถ้าไม่ใช่ admin
- ต้อง fetch employees ที่ต้องการ (`accounting_responsible`, `document_entry_responsible`) แยกต่างหาก
- รวมข้อมูลเข้ากับ `employeesData` เป็น `allEmployeesData` เพื่อให้ lookup nickname ได้ครบถ้วน

#### Implementation:
```typescript
// Fetch employees list
const { data: employeesData } = useQuery(
  ['employees-list'],
  () => employeeService.getAll({ limit: 1000, status: 'active' }),
  { enabled: true, staleTime: 5 * 60 * 1000 }
)

// Fetch specific employees by ID
const employeeIdsToFetch = useMemo(() => {
  const ids: string[] = []
  if (taxData?.accounting_responsible) ids.push(taxData.accounting_responsible)
  if (taxData?.document_entry_responsible) ids.push(taxData.document_entry_responsible)
  return [...new Set(ids)]
}, [taxData?.accounting_responsible, taxData?.document_entry_responsible])

const employeeQueries = useQueries(
  employeeIdsToFetch.map((employeeId) => ({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeService.getById(employeeId),
    enabled: !!employeeId && opened,
    staleTime: 5 * 60 * 1000,
  }))
)

// Combine data
const allEmployeesData = useMemo(() => {
  const employees = employeesData?.employees || []
  const fetchedEmployees = employeeQueries
    .map((query) => query.data)
    .filter((emp): emp is Employee => emp !== undefined)
  
  const employeeMap = new Map<string, Employee>()
  employees.forEach((emp) => employeeMap.set(emp.employee_id, emp))
  fetchedEmployees.forEach((emp) => employeeMap.set(emp.employee_id, emp))
  
  return {
    employees: Array.from(employeeMap.values()),
    pagination: employeesData?.pagination,
  }
}, [employeesData, employeeQueries])
```

---

**Last Updated**: 2026-01-31  
**Maintainer**: Cursor AI
