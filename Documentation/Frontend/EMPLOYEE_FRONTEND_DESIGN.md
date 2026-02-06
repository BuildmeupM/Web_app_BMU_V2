# 🎨 Employee Frontend Design - Complete Documentation

## 📋 Overview

เอกสารนี้อธิบายการออกแบบ Frontend Components และ Features สำหรับระบบ Employee Management

## 🎯 Features Overview

### 1. Employee List View
- แสดงรายชื่อพนักงาน (paginated)
- Search และ Filter
- Sortable columns
- Role-based access (HR/Admin vs Employee)

### 2. Employee Detail View
- แสดงข้อมูลพนักงานครบถ้วน (13 fields + รูปภาพ)
- สถิติวันลา/WFH
- คำนวณวันทำงาน

### 3. Add Employee Form
- Form สำหรับเพิ่มพนักงานใหม่ (HR/Admin only)
- Validation
- Image upload

### 4. Edit Employee Form
- Form สำหรับแก้ไขข้อมูล (HR/Admin: all fields | Employee: limited fields)

### 5. Excel Import
- Upload Excel file
- Preview imported data
- Import results

### 6. Dashboard/Analytics
- สรุปจำนวนพนักงาน
- กราฟ 6 เดือน (เข้าทำงาน/ลาออก)
- รายชื่อพนักงานที่ต้องประเมิน (90 วัน)
- สรุปจำนวนพนักงานตามตำแหน่ง

## 🧩 Components Structure

```
src/
├── pages/
│   └── EmployeeManagement.tsx          # Main page
├── components/
│   ├── Employee/
│   │   ├── EmployeeList.tsx           # Employee list table
│   │   ├── EmployeeCard.tsx           # Employee card (for grid view)
│   │   ├── EmployeeDetail.tsx         # Employee detail view
│   │   ├── EmployeeForm.tsx           # Add/Edit form
│   │   ├── EmployeeImport.tsx         # Excel import component
│   │   └── EmployeeDashboard.tsx      # Analytics dashboard
│   └── Shared/
│       ├── DataTable.tsx              # Reusable table component
│       ├── SearchBar.tsx              # Search component
│       ├── FilterSection.tsx          # Filter component
│       ├── Pagination.tsx             # Pagination component
│       └── ExportButton.tsx           # Export component
```

## 📄 Page: EmployeeManagement.tsx

### Layout Structure

```typescript
<Container>
  {/* Header Section */}
  <Title>ข้อมูลพนักงาน</Title>
  
  {/* Action Buttons (HR/Admin only) */}
  {isHRorAdmin && (
    <Group>
      <Button onClick={handleAdd}>เพิ่มพนักงาน</Button>
      <Button onClick={handleImport}>นำเข้าจาก Excel</Button>
      <Button onClick={handleExport}>ส่งออกข้อมูล</Button>
    </Group>
  )}
  
  {/* Search & Filter */}
  <SearchBar />
  <FilterSection />
  
  {/* Employee List */}
  <EmployeeList />
  
  {/* Pagination */}
  <Pagination />
</Container>
```

### State Management

```typescript
const [employees, setEmployees] = useState<Employee[]>([])
const [loading, setLoading] = useState(false)
const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
const [filters, setFilters] = useState({ 
  search: '', 
  position: '', 
  status: 'active'  // ค่าเริ่มต้น: "ทำงานอยู่"
})
const [sortBy, setSortBy] = useState<string>('position')  // ค่าเริ่มต้น: เรียงตามตำแหน่งงาน
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')  // ค่าเริ่มต้น: เรียงแบบ A-Z
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
```

## 🧩 Component: EmployeeList.tsx

### Features
- Paginated table
- Sortable columns
- Row click → Detail view
- Role-based data display

### Props
```typescript
interface EmployeeListProps {
  employees: Employee[]
  loading: boolean
  onRowClick: (employee: Employee) => void
  onSort: (field: string, order: 'asc' | 'desc') => void
  userRole: UserRole
}
```

### Columns (HR/Admin)
- รหัสพนักงาน
- ชื่อ - นามสกุล
- ตำแหน่ง
- สถานะ
- วันเริ่มงาน
- Actions (View, Edit, Delete)
  - Delete: แสดง confirmation modal ก่อนลบ (แสดงชื่อพนักงาน, รหัสพนักงาน, และคำเตือน)

### Columns (Employee)
- รหัสพนักงาน
- ชื่อ - นามสกุล
- ตำแหน่ง
- สถานะ

## 🧩 Component: EmployeeDetail.tsx

### Features
- แสดงข้อมูลพนักงานครบถ้วน
- รูปภาพพนักงาน
- สถิติวันลา/WFH
- คำนวณวันทำงาน (X ปี Y เดือน Z วัน)
- Edit button (HR/Admin or own data)
- Alert แสดงสถานะข้อมูลครบถ้วน/ไม่ครบถ้วน

### Data Display Structure

**Card 1: Header Section** (มีขอบสีส้ม #ff6b35)
- Profile Image (`profile_image`)
- Full Name (`full_name`) + Nickname (`nick_name`)
- Status Badge (`status`)
- Employee ID (`employee_id`)
- Edit Button

**Card 2: ข้อมูลส่วนตัว** (รวมข้อมูลส่วนตัว, การติดต่อ, และที่อยู่ - มีขอบสีส้ม #ff6b35)
- **Personal Information**:
  - ID Card (`id_card`) - Masked (XXX-XXX-XXXX-XXX)
  - Gender (`gender`)
  - Birth Date (`birth_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - Nickname (`nick_name`)
  - English Name (`english_name`)
- **Contact Information**:
  - Phone (`phone`)
  - Personal Email (`personal_email`)
  - Company Email (`company_email`)
- **Address Information**:
  - Full Address (`address_full`) - แสดงเฉพาะที่อยู่รวมเท่านั้น (ไม่แสดงรายละเอียดแยกฟิลด์)

**Card 3: ข้อมูลการทำงาน** (มีขอบสีส้ม #ff6b35)
- **ข้อมูลการทำงาน**:
  - Position (`position`)
  - Hire Date (`hire_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - Probation End Date (`probation_end_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - Resignation Date (`resignation_date`) - Formatted (DD MMMM YYYY พ.ศ.)
  - Working Duration - Calculated (X ปี Y เดือน Z วัน)
- **สถิติการทำงาน** (ถ้ามี):
  - Leave Statistics - From API (`/api/employees/:id/statistics`)
  - WFH Statistics - From API (`/api/employees/:id/statistics`)

### Layout Structure

```typescript
<Stack gap="lg">
  {/* Incomplete/Complete Data Alert */}
  <Alert>...</Alert>
  
  {/* Header Section (ขอบสีส้ม) */}
  <Card withBorder style={{ borderColor: '#ff6b35' }}>
    <Grid>
      <Grid.Col span={4}>
        <Avatar size={200} src={employee.profile_image} />
        <Button>แก้ไขข้อมูล</Button>
      </Grid.Col>
      <Grid.Col span={8}>
        <Title>{employee.full_name} ({employee.nick_name})</Title>
        <Badge>{employee.status}</Badge>
        <Text>รหัสพนักงาน: {employee.employee_id}</Text>
      </Grid.Col>
    </Grid>
  </Card>
  
  {/* ข้อมูลส่วนตัว - รวมข้อมูลส่วนตัว, การติดต่อ, และที่อยู่ (ขอบสีส้ม) */}
  <Card withBorder style={{ borderColor: '#ff6b35' }}>
    <Title order={4}>ข้อมูลส่วนตัว</Title>
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      {/* Personal Info Fields */}
      {/* Contact Info Fields */}
      {/* Address Fields */}
    </SimpleGrid>
  </Card>
  
  {/* ข้อมูลการทำงาน - รวมสถิติการทำงาน (ขอบสีส้ม) */}
  <Card withBorder style={{ borderColor: '#ff6b35' }}>
    <Title order={4}>ข้อมูลการทำงาน</Title>
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* Employment Fields */}
      </SimpleGrid>
      
      {/* Statistics Section */}
      <Divider />
      <Title order={5}>สถิติการทำงาน</Title>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* Statistics */}
      </SimpleGrid>
    </Stack>
  </Card>
</Stack>
```

### UI Structure Notes
- **Card Borders**: Card ทั้งหมดในหน้า Employee Detail มีขอบสีส้ม (#ff6b35) เพื่อความสอดคล้องกัน
- **ข้อมูลส่วนตัว**: รวมข้อมูลส่วนตัวพื้นฐาน, ข้อมูลการติดต่อ, และที่อยู่ไว้ใน Card เดียวกัน (มีขอบสีส้ม #ff6b35)
- **ข้อมูลการทำงาน**: รวมข้อมูลการทำงานและสถิติการทำงานไว้ใน Card เดียวกัน (มีขอบสีส้ม #ff6b35)
- **Grid Layout**: ใช้ SimpleGrid 2 columns (responsive: 1 column on mobile)
- **Address Display**: ที่อยู่รวม (`address_full`) แสดงเต็มความกว้าง (gridColumn: '1 / -1') - **ไม่แสดงรายละเอียดที่อยู่แยกฟิลด์** (เช่น หมู่บ้าน, เลขที่, ซอย/ตรอก, แขวง/ตำบล, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์) เพราะมีที่อยู่รวมแสดงอยู่แล้ว
- **Card Border**: Card ข้อมูลการทำงานมีขอบสีส้ม (#ff6b35) เพื่อเน้นความสำคัญ
- **Conditional Rendering**: แสดงเฉพาะ fields ที่มีข้อมูล (ไม่แสดง null/empty values)

## 🧩 Component: EmployeeForm.tsx

### Features
- Add/Edit employee form
- Validation (React Hook Form + Zod)
- Image upload
- Address fields (collapsible section)

### Form Fields

#### Basic Information
- รหัสพนักงาน (`employee_id`) - Required, Unique
- ตำแหน่ง (`position`) - Required, Select
- รหัสบัตรประชาชน (`id_card`) - Required, 13 digits, Unique
- เพศ (`gender`) - Required, Radio
- ชื่อจริง (`first_name`) - Required
- นามสกุล (`last_name`) - Required
- ชื่อภาษาอังกฤษ (`english_name`) - Optional
- ชื่อเล่น (`nick_name`) - Optional
- วันเกิด (`birth_date`) - Optional, DatePicker

#### Contact Information
- เบอร์โทร (`phone`) - Optional, Phone format
- อีเมลส่วนตัว (`personal_email`) - Optional, Email format
- อีเมลบริษัท (`company_email`) - Optional, Email format, Unique
- รหัสผ่านอีเมลบริษัท (`company_email_password`) - Optional, Password field

#### Employment Information
- วันเริ่มงาน (`hire_date`) - Required, DatePicker
- วันผ่านงาน (`probation_end_date`) - Optional, DatePicker
- วันสิ้นสุด (`resignation_date`) - Optional, DatePicker
- สถานะงาน (`status`) - Required, Select

#### Address Information (Collapsible)
- ที่อยู่รวม (`address_full`) - Optional, Textarea
- หรือแยกเป็น:
  - หมู่บ้าน, อาคาร, ห้องเลขที่, ชั้นที่, เลขที่
  - ซอย/ตรอก, หมู่ที่, ถนน
  - แขวง/ตำบล, อำเภอ/เขต, จังหวัด
  - รหัสไปรษณีย์

#### Media
- รูปภาพ (`profile_image`) - Optional, FileUpload

### Validation Schema (Zod)

```typescript
const employeeSchema = z.object({
  employee_id: z.string().min(1).max(20),
  position: z.string().min(1),
  id_card: z.string().regex(/^\d{13}$/),
  gender: z.enum(['male', 'female', 'other']),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  // ... other fields
})
```

## 🧩 Component: EmployeeImport.tsx

### Features
- Excel file upload
- Preview imported data
- Validation errors display
- Import progress
- Import results

### Flow

1. **Upload Excel File**
   - Drag & drop or file picker
   - Validate file format (.xlsx, .xls)
   - Max file size: 10MB

2. **Preview Data**
   - Show first 10 rows
   - Highlight validation errors
   - Show total rows

3. **Import**
   - Show progress bar
   - Display import results
   - Show errors (if any)

### UI

```typescript
<Modal opened={opened} onClose={onClose} size="xl">
  <Title>นำเข้าข้อมูลพนักงานจาก Excel</Title>
  
  {/* File Upload */}
  <Dropzone onDrop={handleFileUpload}>
    <Text>ลากไฟล์ Excel มาวางที่นี่</Text>
  </Dropzone>
  
  {/* Preview */}
  {previewData && (
    <Table>
      {/* Preview table */}
    </Table>
  )}
  
  {/* Import Button */}
  <Button onClick={handleImport} loading={importing}>
    นำเข้าข้อมูล
  </Button>
  
  {/* Results */}
  {importResults && (
    <Alert>
      <Text>สำเร็จ: {importResults.success}</Text>
      <Text>ล้มเหลว: {importResults.failed}</Text>
    </Alert>
  )}
</Modal>
```

## 🧩 Component: EmployeeDashboard.tsx

### Features
- สรุปจำนวนพนักงาน (Cards)
- กราฟ 6 เดือน (ComposedChart: Bar + Line Chart) - **Implemented**
  - กราฟแท่งสำหรับ "เข้าทำงาน" (สีเขียว)
  - กราฟเส้นสำหรับ "ลาออก" (สีแดง)
  - เรียงข้อมูลตามเดือน (YYYY-MM)
  - แสดงเดือนเป็นรูปแบบไทย (เช่น "ส.ค. 2568")
  - **Click Functionality**: คลิกที่กราฟเพื่อเปิด Modal แสดงรายละเอียดพนักงาน
    - Modal ขนาด 90% ของหน้าจอ (maxWidth: 1400px, maxHeight: 90vh)
    - ScrollArea height: 650px
    - แสดงข้อมูลใน Tabs: "เข้าทำงาน" และ "ลาออก"
    - ตารางมี border, spacing, และ typography ที่ปรับปรุงแล้ว
    - **ชื่อ-นามสกุลและชื่อเล่นแสดงในบรรทัดเดียวกัน**: "ชื่อ-นามสกุล (ชื่อเล่น)" เพื่อประหยัดพื้นที่และอ่านง่ายขึ้น
    - **ขนาดตัวอักษร**: `fontSize="md"` เพื่อให้อ่านง่ายขึ้น
- รายชื่อพนักงานที่ต้องประเมิน (90 วัน)
- สรุปจำนวนพนักงานตามตำแหน่ง (Pie Chart หรือ Table)

### Layout

```typescript
<Container>
  {/* Summary Cards */}
  <SimpleGrid cols={3}>
    <Card>
      <Text>พนักงานทำงานอยู่</Text>
      <Title>{stats.total_active}</Title>
    </Card>
    <Card>
      <Text>พนักงานลาออก</Text>
      <Title>{stats.total_resigned}</Title>
    </Card>
    <Card>
      <Text>รวมทั้งหมด</Text>
      <Title>{stats.total_active + stats.total_resigned}</Title>
    </Card>
  </SimpleGrid>
  
  {/* 6 Months Trend Chart */}
  <Card>
    <Title>สถิติการเข้าทำงาน/ลาออก (6 เดือน)</Title>
    <Paper p="md" withBorder>
      <CompositeChart
        h={400}
        data={hireTrendData}
        dataKey="monthLabel"
        series={[
          {
            name: 'hired',
            label: 'เข้าทำงาน',
            color: 'green.6',
            type: 'bar',
          },
          {
            name: 'resigned',
            label: 'ลาออก',
            color: 'red.6',
            type: 'line',
          },
        ]}
        tickLine="xy"
        gridAxis="xy"
        withLegend
        legendProps={{ verticalAlign: 'bottom', height: 50 }}
      />
    </Paper>
  </Card>
  
  {/* Probation Reviews (Next 90 Days) */}
  <Card>
    <Title>พนักงานที่ต้องประเมิน (90 วันข้างหน้า)</Title>
    <Table>
      {/* List of employees */}
    </Table>
  </Card>
  
  {/* Employees by Position */}
  <Card>
    <Title>จำนวนพนักงานตามตำแหน่ง</Title>
    <PieChart>
      {/* Pie chart */}
    </PieChart>
  </Card>
</Container>
```

### Charts Library

**Implemented**: `recharts` (direct usage for better click event handling)

**Installation**:
```bash
npm install @mantine/charts recharts
```

**Styles Import** (in `main.tsx`):
```typescript
import '@mantine/charts/styles.css'
```

**Usage**:
```typescript
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

// 6 Months Trend - Combined Bar + Line Chart
<ComposedChart
  data={hireTrendData}
  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="monthLabel" />
  <YAxis />
  <Tooltip content={CustomTooltip} />
  <Legend />
  <Bar dataKey="hired" fill="#4caf50" onClick={handleBarClick}>
    {hireTrendData.map((entry, index) => (
      <Cell key={`cell-${index}`} onClick={() => handleTooltipClick(entry.month)} />
    ))}
  </Bar>
  <Line type="monotone" dataKey="resigned" stroke="#f44336" strokeWidth={2} onClick={handleLineClick} />
</ComposedChart>

// Data Preparation
const hireTrendData = [...statistics.hire_trend_6months]
  .sort((a, b) => a.month.localeCompare(b.month)) // เรียงตามเดือน
  .map((item) => {
    const [year, month] = item.month.split('-')
    const monthNum = parseInt(month) - 1
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const thaiYear = parseInt(year) + 543
    return {
      month: item.month,
      monthLabel: `${thaiMonths[monthNum]} ${thaiYear}`,
      hired: item.hired,
      resigned: item.resigned,
    }
  })
```

## 🔐 Role-based Access Control

### HR/Admin Access
- ✅ View all employees
- ✅ Add employee
- ✅ Edit any employee
- ✅ Delete employee (with confirmation modal)
- ✅ Import Excel
- ✅ Export data
- ✅ View Dashboard/Analytics

### Employee Access
- ✅ View own data only
- ✅ Edit own data (limited fields: phone, email, address, profile_image)
- ❌ Cannot view other employees
- ❌ Cannot add/edit/delete
- ❌ Cannot import/export

### Implementation

```typescript
const { user } = useAuthStore()
const isHRorAdmin = user?.role === 'admin' || user?.role === 'hr'

// In API calls
const employeeId = isHRorAdmin ? undefined : user?.employee_id
```

## 📊 Data Fetching Strategy

### List View
- **Initial Load**: First page only (20 items)
- **Pagination**: Load on demand
- **Search/Filter**: Debounced (300ms)
- **Cache**: 1 minute

### Detail View
- **Load on Demand**: When clicking row
- **Cache**: 2 minutes
- **Includes**: All fields + statistics

### Dashboard
- **Load on Mount**: All statistics
- **Cache**: 5 minutes
- **Refresh**: Manual refresh button

## 🎨 UI/UX Guidelines

### Colors
- Primary: Orange (#ff6b35)
- Success: Green (#4caf50)
- Warning: Yellow (#ff9800)
- Error: Red (#f44336)

### Typography
- Font: Kanit (Thai), Arial (English)
- Headings: Mantine Title component
- Body: Mantine Text component

### Components
- Use Mantine components
- Consistent spacing (Mantine spacing scale)
- Responsive design (Mobile, Tablet, Desktop)

## 🧪 Testing Considerations

### Unit Tests
- Form validation
- Data transformation
- Calculations (working days, statistics)

### Integration Tests
- API calls
- Role-based access
- Pagination

### E2E Tests
- Add employee flow
- Edit employee flow
- Import Excel flow
- Search and filter

---

## 🔍 Filter & Sort Configuration

### Default Filter Values
- **Status Filter**: `'active'` (ทำงานอยู่) - แสดงเฉพาะพนักงานที่ทำงานอยู่เป็นค่าเริ่มต้น
- **Position Filter**: `''` (ทั้งหมด) - ไม่กรองตามตำแหน่งเป็นค่าเริ่มต้น

### Default Sort Configuration
- **Sort By**: `'position'` (ตำแหน่งงาน) - เรียงข้อมูลตามตำแหน่งงานเป็นค่าเริ่มต้น
- **Sort Order**: `'asc'` (A-Z) - เรียงแบบ ascending (ก-ฮ) เป็นค่าเริ่มต้น

### Filter & Sort Behavior
- เมื่อเปิดหน้า Employee Management ครั้งแรก:
  - แสดงเฉพาะพนักงานที่สถานะ = "ทำงานอยู่"
  - เรียงข้อมูลตามตำแหน่งงานแบบ A-Z
- ผู้ใช้สามารถเปลี่ยน filter และ sort ได้ตามต้องการ
- การเปลี่ยนแปลง filter/sort จะ reset หน้าเป็นหน้าแรก (page = 1)

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Frontend Design Complete  
**UI Updates**: 
- 2026-01-29 - Card ทั้งหมดในหน้า Employee Detail มีขอบสีส้ม (#ff6b35) เพื่อความสอดคล้องกัน
- 2026-01-29 - ข้อมูลส่วนตัว, ข้อมูลการติดต่อ, และที่อยู่ ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลส่วนตัว" (มีขอบสีส้ม #ff6b35)
- 2026-01-29 - ข้อมูลการทำงานและสถิติการทำงาน ถูกรวมอยู่ใน Card เดียวกันภายใต้หัวข้อ "ข้อมูลการทำงาน" (มีขอบสีส้ม #ff6b35)
- 2026-01-29 - เพิ่ม Delete Confirmation Modal สำหรับยืนยันการลบข้อมูลพนักงาน (แทนที่ window.confirm)
- 2026-01-29 - เปลี่ยนค่าเริ่มต้นของ Status Filter เป็น "ทำงานอยู่" (active)
- 2026-01-29 - เปลี่ยนค่าเริ่มต้นของการเรียงข้อมูลเป็นเรียงตามตำแหน่งงาน (position) แบบ A-Z (ascending)
- 2026-01-29 - เพิ่ม ComposedChart สำหรับแสดงสถิติการเข้าทำงาน/ลาออก (6 เดือน) - กราฟแท่ง + กราฟเส้นรวมกัน, เรียงข้อมูลตามเดือน, แสดงเดือนเป็นรูปแบบไทย, คลิกที่กราฟเพื่อดูรายละเอียดพนักงาน
- 2026-01-29 - ปรับขนาด Employee Details Modal ให้ใหญ่ขึ้น (90% ของหน้าจอ, maxWidth 1400px, maxHeight 90vh) และเพิ่ม ScrollArea height เป็น 650px
- 2026-01-29 - ปรับปรุงการแสดงผล Badge และตารางใน Employee Details Modal (Badge variant="filled", เพิ่ม border และ spacing ในตาราง, ปรับ typography)
- 2026-01-29 - ปรับปรุงการแสดงผลชื่อ-นามสกุลและชื่อเล่นให้อยู่ในบรรทัดเดียวกัน ("ชื่อ-นามสกุล (ชื่อเล่น)") และเพิ่มขนาดตัวอักษรจาก "sm" เป็น "md"
