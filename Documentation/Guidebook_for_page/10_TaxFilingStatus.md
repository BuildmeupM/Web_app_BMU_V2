# 📊 10. Tax Filing Status Page (สถานะยื่นภาษี)

## 📋 Overview

หน้าติดตามสถานะการยื่นภาษี - ระบบติดตามสถานะการยื่นภาษีที่ครอบคลุมทั้ง WHT และ VAT

**Route**: `/tax-status`  
**Component**: `src/pages/TaxStatus.tsx`

## 🔐 Access Control

- ✅ **admin**
- ✅ **data_entry_and_service**
- ✅ **service**

## ✨ Features

### 1. Summary Card (สรุปงานที่รับผิดชอบ)
- ✅ แสดงสรุปงานที่รับผิดชอบ 4 รายการ:
  - งานที่รับผิดชอบ - WHT (Header สีม่วงเข้ม #6a1b9a)
  - งานที่รับผิดชอบ - VAT (Header สีเขียวเข้ม #2e7d32)
  - เปอร์เซ็นสถานะกระทบภาษี (Header สีเขียวอ่อน #66bb6a)
  - เปอร์เซ็นสถานะกระทบแบงค์ (Header สีเทา-น้ำเงิน #00897b)
- ✅ แสดงจำนวนงานในรูปแบบ value/total (เช่น 11/11, 4/7)
- ✅ แต่ละส่วนมี border แยกชัดเจน (ใช้ Paper component with border สีดำ)
- ✅ Header แต่ละ card มีสีพื้นหลังตามที่กำหนด และฟอนต์สีขาว

### 2. Filter Section (ส่วนกรองข้อมูล)
- ✅ เลือกประเภทการกรอง: หมายเลข Build หรือ วันที่และเวลา
- ✅ **Date Range Picker**: เมื่อเลือกกรองตามวันที่
  - DatePickerInput สำหรับวันที่เริ่มต้น
  - DatePickerInput สำหรับวันที่สิ้นสุด (มี minDate เป็นวันที่เริ่มต้น)
  - รองรับการล้างค่า (clearable)
- ✅ **Search Input**: ค้นหาด้วยหมายเลข Build หรือชื่อบริษัท (เมื่อเลือกกรองตาม Build)
- ✅ **Quick Filter Buttons**: ปุ่มลัดสำหรับกรองสถานะที่ใช้บ่อย
  - รอยื่น
  - ยื่นแล้ว
- ✅ **Status Filters (MultiSelect - สามารถเลือกได้หลายสถานะ)**:
  - **สถานะ WHT** และ **สถานะ VAT** รองรับตัวเลือกสถานะทั้งหมด 12 รายการ:
    - รับใบเสร็จ
    - ชำระแล้ว
    - ส่งลูกค้าแล้ว
    - ร่างแบบเสร็จแล้ว
    - ผ่าน
    - รอตรวจ
    - รอตรวจอีกครั้ง
    - ร่างแบบได้
    - แก้ไข
    - สอบถามลูกค้าเพิ่มเติม
    - ตรวจสอบเพิ่มเติม
    - สถานะยังไม่ดำเนินการ (ข้อมูลที่ยังไม่มีการอัพเดทสถานะ)
  - **คุณสมบัติ MultiSelect**:
    - สามารถเลือกได้หลายสถานะพร้อมกัน
    - มี searchable เพื่อค้นหาสถานะที่ต้องการ
    - มี clearable เพื่อล้างการเลือกทั้งหมด
- ✅ **Active Filters Count Badge**: แสดงจำนวนตัวกรองที่ใช้งานอยู่
- ✅ **Filter Summary**: แสดงตัวกรองที่เลือกอยู่พร้อมปุ่มลบแต่ละตัว
  - แสดง Badge สำหรับแต่ละ filter ที่เลือก
  - สามารถลบแต่ละ filter ได้โดยคลิกที่ปุ่ม X
  - แสดงวันที่ในรูปแบบ DD/MM/YYYY
- ✅ **Action Buttons**:
  - รีเฟรชข้อมูล
  - รีเซ็ตฟิลเตอร์ (ล้างการเลือกทั้งหมด, ปุ่มจะ disabled เมื่อไม่มี filter)
- ✅ **Filter Change Callback**: ส่ง filter values ไปยัง parent component เมื่อมีการเปลี่ยนแปลง

### 3. Tax Status Table (ตารางสถานะยื่นภาษี)
- ✅ แสดงข้อมูล:
  - Build Number
  - ชื่อบริษัท
  - วันที่ยื่น ภงด. (PND)
  - สถานะ ภงด. (รองรับสถานะทั้งหมด 12 รายการ)
  - วันที่ยื่น ภ.พ. 30 (PP30)
  - สถานะ ภ.พ.30 (รองรับสถานะทั้งหมด 12 รายการ)
  - ผู้ทำ
  - จัดการ (ปุ่มเลือกบริษัทนี้ - เปิดฟอร์มตรวจภาษี)
- ✅ **Status Badges: Color-coded badges สำหรับแต่ละสถานะ (ฟอนต์สีขาว)**
  - **รับใบเสร็จ**: สีฟ้า (#4facfe)
  - **ชำระแล้ว**: สีเหลือง (#ffc107)
  - **ส่งลูกค้าแล้ว**: สีฟ้าอ่อน (#81d4fa)
  - **ร่างแบบเสร็จแล้ว**: สีแดงอ่อน (#ffcdd2)
  - **ผ่าน**: สีเขียว (#4caf50)
  - **รอตรวจ**: สีส้ม (#ff6b35)
  - **รอตรวจอีกครั้ง**: สีแดง (#f44336)
  - **ร่างแบบได้**: สีแดงอ่อน (#ffcdd2)
  - **แก้ไข**: สีแดง (#f44336)
  - **สอบถามลูกค้าเพิ่มเติม**: สีม่วง (#9c27b0)
  - **ตรวจสอบเพิ่มเติม**: สีฟ้าอ่อน (#81d4fa)
  - **ไม่มียื่น**: สีเทา (#808080)
  - **สถานะยังไม่ดำเนินการ**: สีเทา (#808080)
- ✅ Hover Effects: Highlight row เมื่อ hover
- ✅ Responsive: Scrollable table สำหรับหน้าจอเล็ก

### 4. Pagination (การแบ่งหน้า)
- ✅ Items Per Page Selector (10, 20, 50, 100)
- ✅ Page Navigation (Previous, Page Numbers, Next)
- ✅ Display: แสดงจำนวนรายการที่แสดง (เช่น "แสดง 1-20 จาก 121 รายการ")
- ✅ Active Page Highlight: Highlight หน้าที่กำลังดู

### 5. Tax Inspection Form Modal (ฟอร์มสถานะภาษีประจำเดือน)
- ✅ Full Screen Modal
- ✅ Modal Title: "ฟอร์มสถานะภาษีประจำเดือน"
- ✅ เปิดเมื่อคลิกปุ่ม "เลือกบริษัทนี้" ในตาราง
- ✅ ใช้ TaxInspectionForm component เดียวกับหน้าตรวจภาษี แต่ส่ง `sourcePage="taxStatus"` prop
- ✅ แสดงข้อมูลบริษัทและฟอร์มตรวจภาษีครบถ้วน
- ✅ **Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)** - มีสถานะที่แตกต่างจากหน้าตรวจภาษี:
  - รับใบเสร็จ (สีฟ้า #4facfe)
  - ชำระแล้ว (สีเหลือง #ffc107)
  - ผ่าน (สีเขียว #4caf50)
  - ร่างแบบได้ (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว)
  - รอตรวจ (สีส้ม #ff6b35, ฟอนต์สีขาว)
  - รอตรวจอีกครั้ง (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว)
  - สอบถามลูกค้าเพิ่มเติม (สีม่วง #9c27b0)
  - ตรวจสอบเพิ่มเติม (สีฟ้าอ่อน #81d4fa)
  - ไม่มียื่น (สีดำ #000000)
- ✅ **ส่วนสอบถามและตอบกลับ (WHT)** - ตำแหน่งและสิทธิ์การแก้ไข:
  - **สอบถามเพิ่มเติม ภ.ง.ด.**: อยู่ด้านบน, แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
  - **ตอบกลับ ภ.ง.ด.**: อยู่ด้านล่าง, ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ, placeholder: "กรอกคำตอบสำหรับการสอบถาม ภ.ง.ด.", ไม่มีค่าเริ่มต้น
  - ตรงกับหน้าตรวจภาษี (สอบถามอยู่บน, ตอบกลับอยู่ล่าง) แต่สิทธิ์การแก้ไขต่างกัน
- ✅ **ส่วนส่งงานยื่นภาษีกับทีมยื่นภาษี WHT** - หัวข้อใหม่ (แสดงเฉพาะเมื่อเปิดจากหน้าสถานะยื่นภาษี):
  - แสดงเฉพาะเมื่อ `sourcePage === 'taxStatus'`
  - ไม่แสดงเมื่อเปิดจากหน้าตรวจภาษี (`sourcePage === 'taxInspection'`)
  - **ความเห็นส่งงานยื่นภาษี ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **ตอบกลับงานยื่นภาษี ภ.ง.ด.**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
- ✅ **ส่วนจำนวนเอกสารภาษีซื้อ และ คอนเฟิร์มรายได้ (VAT)** - สำหรับหน้าสถานะยื่นภาษี:
  - **จำนวนเอกสารภาษีซื้อ**: 
    - Type: number input
    - Placeholder: "0"
    - เมื่อกรอกตัวเลข: ขอบเป็นสีส้ม (#ff6b35), borderWidth: 2px
    - ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **คอนเฟิร์มรายได้**: 
    - Type: Select (dropdown)
    - ตัวเลือก:
      - ลูกค้าคอนเฟิร์ม (สีเขียว #4caf50, ฟอนต์สีขาว)
      - ไม่ต้องคอนเฟิร์มลูกค้า (สีส้ม #ff6b35, ฟอนต์สีขาว)
      - รอลูกค้าคอนเฟิร์ม (สีเหลือง #ffc107, ฟอนต์สีขาว)
      - ลูกค้าให้แก้รายได้ (สีแดง #f44336, ฟอนต์สีขาว)
    - รองรับ searchable และ clearable
- ✅ **ส่วนสอบถามและตอบกลับ (VAT)** - สำหรับหน้าสถานะยื่นภาษี:
  - ตำแหน่ง: สอบถามเพิ่มเติม ภ.พ.30 อยู่ด้านซ้าย, ตอบกลับ ภ.พ.30 อยู่ด้านขวา (ตำแหน่งเดิม)
  - **สอบถามเพิ่มเติม ภ.พ.30**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
  - **ตอบกลับ ภ.พ.30**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ, placeholder: "กรอกคำตอบสำหรับการสอบถาม ภ.พ.30..."
- ✅ **ส่วนส่งงานยื่นภาษีกับทีมยื่นภาษี VAT** - หัวข้อใหม่ (แสดงเฉพาะเมื่อเปิดจากหน้าสถานะยื่นภาษี):
  - แสดงเฉพาะเมื่อ `sourcePage === 'taxStatus'`
  - ไม่แสดงเมื่อเปิดจากหน้าตรวจภาษี (`sourcePage === 'taxInspection'`)
  - อยู่ใน Tab 3: ยื่นแบบภาษีมูลค่าเพิ่ม (VAT), ต่อจากส่วนสอบถามและตอบกลับ
  - **ความเห็นส่งงานยื่นภาษี ภ.พ.30**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **ตอบกลับงานยื่นภาษี ภ.พ.30**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed

## 🎨 UI/UX Guidelines

### Layout Structure

```
┌─────────────────────────────────────┐
│  Header (Orange)                    │
│  - Title: สถานะยื่นภาษี             │
│  - Icons + Update Time              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Summary Card (Orange Header)       │
│  - สรุปงานที่รับผิดชอบ               │
│  - 4 Stats Cards:                    │
│    • งานที่รับผิดชอบ - WHT           │
│    • งานที่รับผิดชอบ - VAT            │
│    • เปอร์เซ็นสถานะกระทบภาษี         │
│    • เปอร์เซ็นสถานะกระทบแบงค์         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Filter Section                     │
│  - Filter Type (Radio)               │
│  - Search + Status Dropdowns        │
│  - Action Buttons                   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Table                              │
│  - Tax Status Records               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Pagination                         │
│  - Items Per Page + Page Nav        │
└─────────────────────────────────────┘
```

### Color Scheme
- **Orange (#ff6b35, #ff8c42)**: 
  - Primary actions, Headers, Active states
  - Status "รอตรวจ"
- **Deep Purple (#6a1b9a)**: 
  - Summary Card Header: "งานที่รับผิดชอบ - WHT"
- **Dark Green (#2e7d32)**: 
  - Summary Card Header: "งานที่รับผิดชอบ - VAT"
- **Light Green (#66bb6a)**: 
  - Summary Card Header: "เปอร์เซ็นสถานะกระทบภาษี"
- **Teal (#00897b)**: 
  - Summary Card Header: "เปอร์เซ็นสถานะกระทบแบงค์"
- **White**: 
  - Main background
  - Card backgrounds
  - Input fields
  - Status Badge text color (ทุกสถานะ)
- **Blue (#4facfe)**: 
  - Status "รับใบเสร็จ"
- **Light Blue (#81d4fa)**: 
  - Status "ส่งลูกค้าแล้ว", "ตรวจสอบเพิ่มเติม"
- **Green (#4caf50)**: 
  - Status "ผ่าน"
- **Yellow (#ffc107)**: 
  - Status "ชำระแล้ว"
- **Red (#f44336)**: 
  - Status "รอตรวจอีกครั้ง", "แก้ไข"
- **Light Red (#ffcdd2)**: 
  - Status "ร่างแบบเสร็จแล้ว", "ร่างแบบได้"
- **Purple (#9c27b0)**: 
  - Status "สอบถามลูกค้าเพิ่มเติม"
- **Gray (#808080)**: 
  - Status "ไม่มียื่น", "สถานะยังไม่ดำเนินการ"

### Components Used
- `Card` - สำหรับ Summary, Filter sections
- `Paper` - สำหรับแสดง border รอบแต่ละส่วนของ Summary Card และ Filter Summary
- `Table` - สำหรับแสดงข้อมูล
- `Badge` - สำหรับสถานะและ Active Filters Count
- `Button` - สำหรับ Actions และ Quick Filter Buttons
- `Modal` - สำหรับ Form (Full Screen)
- `Select` / `MultiSelect` - สำหรับ Dropdowns และ Status Filters
- `TextInput` / `Textarea` - สำหรับ Form inputs
- `DatePickerInput` - สำหรับเลือกวันที่ (Date Range Picker)
- `SimpleGrid` - สำหรับ Summary Card Grid
- `Tabs` - สำหรับ Form navigation
- `Group` / `Stack` / `Flex` - สำหรับ Layout และ Spacing
- `Radio` / `Radio.Group` - สำหรับเลือกประเภทการกรอง
- `ScrollArea` - สำหรับ Form Content ที่เลื่อนได้

## 📊 Data Structure

### Tax Status Record
```typescript
interface TaxStatusRecord {
  build: string
  companyName: string
  pndFilingDate: string | null
  pndStatus:
    | 'received_receipt'
    | 'paid'
    | 'sent_to_customer'
    | 'draft_completed'
    | 'passed'
    | 'pending_review'
    | 'pending_recheck'
    | 'draft_ready'
    | 'needs_correction'
    | 'inquire_customer'
    | 'additional_review'
    | 'not_started'
    | null
  pp30FilingDate: string | null
  pp30Status:
    | 'received_receipt'
    | 'paid'
    | 'sent_to_customer'
    | 'draft_completed'
    | 'passed'
    | 'pending_review'
    | 'pending_recheck'
    | 'draft_ready'
    | 'needs_correction'
    | 'inquire_customer'
    | 'additional_review'
    | 'not_submitted'
    | 'not_started'
    | null
  performer: string
}
```

### Filter State
```typescript
interface FilterValues {
  filterType: 'build' | 'date'
  searchValue: string
  dateFrom: Date | null
  dateTo: Date | null
  whtStatus: string[]
  vatStatus: string[]
}
```

## 🔌 API Endpoints

### GET `/api/tax-status/summary`
**Response:**
```json
{
  "wht": {
    "pending": 0,
    "filed": 120,
    "total": 121
  },
  "vat": {
    "pending": 0,
    "filed": 84,
    "total": 84
  }
}
```

### GET `/api/tax-status/list`
**Query Parameters:**
- `page`: number
- `limit`: number
- `filterType`: 'build' | 'date'
- `search`: string
- `whtStatus`: string[]
- `vatStatus`: string[]

**Response:**
```json
{
  "data": [
    {
      "build": "21",
      "companyName": "ไซม่อน อินเตอร์เนชั่นแนล โปรไวเดอร์",
      "pndFilingDate": "12/01/2026 10:51",
      "pndStatus": "paid",
      "pp30FilingDate": "22/01/2026 16:16",
      "pp30Status": "paid",
      "performer": "ครีม"
    }
  ],
  "total": 121,
  "page": 1,
  "limit": 20
}
```

## ✅ Validation Rules

### Search Input
- ✅ Min length: 1 character
- ✅ Max length: 100 characters

## 🚨 Error Handling

- ✅ Loading State: แสดง Loading เมื่อกำลังโหลดข้อมูล
- ✅ Empty State: แสดงข้อความเมื่อไม่มีข้อมูล
- ✅ Error State: แสดง Error message เมื่อเกิดข้อผิดพลาด
- ✅ Network Error: แสดงข้อความเมื่อไม่สามารถเชื่อมต่อ API

## 🔄 User Flow

```
1. User เข้าหน้าสถานะยื่นภาษี
2. แสดง Summary Card (สรุปงานที่รับผิดชอบ)
3. User สามารถ Filter และ Search
4. แสดง Table พร้อมข้อมูล
5. User คลิก "เลือกบริษัทนี้"
6. เปิด Form Modal (Full Screen) - ฟอร์มตรวจภาษี
7. แสดงข้อมูลบริษัทและฟอร์มตรวจภาษี
8. User กรอกข้อมูลและบันทึก
9. ปิด Modal และ Refresh Table
```

## 📝 Implementation Notes

### Components Structure
```
src/components/TaxStatus/
├── SummaryCard.tsx          # Summary Card Component
├── FilterSection.tsx         # Filter Section Component
├── TaxStatusTable.tsx        # Table Component
└── PaginationSection.tsx     # Pagination Component
```

### State Management
- ✅ ใช้ `useState` สำหรับ local state
- ✅ Filter state, Pagination state

### Data Fetching
- ✅ ใช้ React Query สำหรับ data fetching
- ✅ Cache และ Refetch เมื่อจำเป็น

## 🎯 Next Steps

- [ ] เชื่อมต่อ Backend API
- [ ] เพิ่ม Real-time Updates
- [ ] เพิ่ม Export Functions (PDF, Excel)
- [ ] เพิ่ม Advanced Filters
- [ ] เพิ่ม Detail View Modal

---

## 📝 Recent Updates

### 2026-01-29 (ตอนค่ำ - เพิ่มฟอร์มตรวจภาษี)
- ✅ ปรับปุ่มในตาราง:
  - เปลี่ยนชื่อจาก "ดูรายละเอียด" เป็น "เลือกบริษัทนี้"
  - เปลี่ยน icon จาก TbEye เป็น TbFileText
  - เมื่อคลิกปุ่มจะเปิดฟอร์มตรวจภาษี (Tax Inspection Form Modal)
- ✅ เพิ่ม Tax Inspection Form Modal:
  - ใช้ TaxInspectionForm component เดียวกับหน้าตรวจภาษี แต่ส่ง `sourcePage="taxStatus"` prop
  - Full Screen Modal
  - แสดงข้อมูลบริษัทและฟอร์มตรวจภาษีครบถ้วน
  - รองรับการบันทึกและปิด Modal
- ✅ **ปรับ Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)**:
  - สถานะที่แตกต่างจากหน้าตรวจภาษี:
    - เพิ่ม "ร่างแบบได้" (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว)
    - เพิ่ม "รอตรวจ" (สีส้ม #ff6b35, ฟอนต์สีขาว)
    - เพิ่ม "รอตรวจอีกครั้ง" (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว)
    - ลบ "แก้ไข" (มีเฉพาะในหน้าตรวจภาษี)
  - **ส่วนสอบถามและตอบกลับ**:
    - สลับตำแหน่ง: ตอบกลับ ภ.ง.ด. อยู่ด้านบน, สอบถามเพิ่มเติม ภ.ง.ด. อยู่ด้านล่าง
    - ตอบกลับ ภ.ง.ด.: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
    - สอบถามเพิ่มเติม ภ.ง.ด.: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080)
    - สลับกับหน้าตรวจภาษี (หน้าตรวจภาษี: สอบถามแก้ไขได้, ตอบกลับ read-only)

### 2026-01-29 (ตอนค่ำ)
- ✅ ปรับ Summary Card:
  - เปลี่ยนหัวข้อจาก "สรุปสถานะยื่นภาษี" เป็น "สรุปงานที่รับผิดชอบ"
  - เปลี่ยนเป็น 4 cards:
    - งานที่รับผิดชอบ - WHT (Header สีม่วงเข้ม #6a1b9a)
    - งานที่รับผิดชอบ - VAT (Header สีเขียวเข้ม #2e7d32)
    - เปอร์เซ็นสถานะกระทบภาษี (Header สีเขียวอ่อน #66bb6a)
    - เปอร์เซ็นสถานะกระทบแบงค์ (Header สีเทา-น้ำเงิน #00897b)
  - แต่ละ card มี header สีพื้นหลังตามที่กำหนด และฟอนต์สีขาว
  - แสดงข้อมูลในรูปแบบ value/total

### 2026-01-29
- ✅ คัดลอก UI จากหน้าตรวจภาษีมาใช้
  - Summary Card: สรุปสถานะยื่นภาษี (รอยื่น, ยื่นแล้ว)
  - Filter Section: พร้อม Date Range Picker, Quick Filters, Filter Summary
  - Table: แสดงสถานะการยื่นภาษีพร้อม Status Badges
  - Pagination: Items Per Page และ Page Navigation
- ✅ ปรับ Quick Filters เป็น "รอยื่น" และ "ยื่นแล้ว"
- ✅ ปรับปุ่มในตารางเป็น "ดูรายละเอียด"
- ✅ Header Section พร้อม Update Time

### 2026-01-29 (ตอนค่ำ - ปรับ Tab WHT และส่วนสอบถาม/ตอบกลับ)
- ✅ เพิ่ม prop `sourcePage` ใน TaxInspectionForm:
  - รองรับ `'taxInspection' | 'taxStatus' | 'taxFiling'`
  - หน้าสถานะยื่นภาษีส่ง `sourcePage="taxStatus"`
- ✅ **ปรับสถานะใน Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)** สำหรับหน้าสถานะยื่นภาษี:
  - สถานะที่แตกต่างจากหน้าตรวจภาษี:
    - รับใบเสร็จ (สีฟ้า #4facfe)
    - ชำระแล้ว (สีเหลือง #ffc107)
    - ผ่าน (สีเขียว #4caf50)
    - **ร่างแบบได้** (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว) - เพิ่มใหม่
    - **รอตรวจ** (สีส้ม #ff6b35, ฟอนต์สีขาว) - เพิ่มใหม่
    - **รอตรวจอีกครั้ง** (สีแดงอ่อน #ffcdd2, ฟอนต์สีขาว) - เพิ่มใหม่
    - สอบถามลูกค้าเพิ่มเติม (สีม่วง #9c27b0)
    - ตรวจสอบเพิ่มเติม (สีฟ้าอ่อน #81d4fa)
    - ไม่มียื่น (สีดำ #000000)
  - ลบสถานะ "แก้ไข" (มีเฉพาะในหน้าตรวจภาษี)
- ✅ **ปรับส่วนสอบถามและตอบกลับ (WHT)** สำหรับหน้าสถานะยื่นภาษี:
  - สลับตำแหน่งให้ตรงกับหน้าตรวจภาษี: สอบถามเพิ่มเติม ภ.ง.ด. อยู่ด้านบน, ตอบกลับ ภ.ง.ด. อยู่ด้านล่าง
  - **สอบถามเพิ่มเติม ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ
  - **ตอบกลับ ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ
  - ตรงกับหน้าตรวจภาษี (สอบถามอยู่บน, ตอบกลับอยู่ล่าง)
- ✅ **เพิ่มหัวข้อใหม่: ส่งงานยื่นภาษีกับทีมยื่นภาษี WHT** ใน Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT):
  - แสดงเฉพาะเมื่อเปิดจากหน้าสถานะยื่นภาษี (`sourcePage === 'taxStatus'`)
  - ไม่แสดงเมื่อเปิดจากหน้าตรวจภาษี (`sourcePage === 'taxInspection'`)
  - ต่อจากส่วนสอบถามและตอบกลับ
  - **ความเห็นส่งงานยื่นภาษี**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ
  - **ตอบกลับงานยื่นภาษี**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
- ✅ เพิ่ม state `whtInquiry`, `whtReply`, `taxFilingComment`, `taxFilingReply`, `vatFilingComment`, และ `vatFilingReply` สำหรับจัดการข้อมูลสอบถาม/ตอบกลับและส่งงานยื่นภาษี

### 2026-01-29 (ตอนค่ำ - เพิ่มหัวข้อส่งงานยื่นภาษีและปรับสอบถาม/ตอบกลับ)
- ✅ **ปรับส่วนสอบถามและตอบกลับ (WHT)** สำหรับหน้าสถานะยื่นภาษี:
  - ตำแหน่ง: สอบถามเพิ่มเติม ภ.ง.ด. อยู่ด้านบน, ตอบกลับ ภ.ง.ด. อยู่ด้านล่าง (ตรงกับหน้าตรวจภาษี)
  - **สอบถามเพิ่มเติม ภ.ง.ด.**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
  - **ตอบกลับ ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff), ฟอนต์สีดำ, placeholder: "กรอกคำตอบสำหรับการสอบถาม ภงด.", ไม่มีค่าเริ่มต้น (ลบ "คำตอบจากฐานข้อมูล..." ออก)
- ✅ **เพิ่มหัวข้อใหม่: ส่งงานยื่นภาษีกับทีมยื่นภาษี WHT**:
  - แสดงเฉพาะเมื่อเปิดจากหน้าสถานะยื่นภาษี (`sourcePage === 'taxStatus'`)
  - ไม่แสดงเมื่อเปิดจากหน้าตรวจภาษี (`sourcePage === 'taxInspection'`)
  - **ความเห็นส่งงานยื่นภาษี ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **ตอบกลับงานยื่นภาษี ภ.ง.ด.**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
- ✅ **เพิ่มหัวข้อใหม่: ส่งงานยื่นภาษีกับทีมยื่นภาษี WHT** ใน Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT):
  - ต่อจากส่วนสอบถามและตอบกลับ
  - **ความเห็นส่งงานยื่นภาษี ภ.ง.ด.**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **ตอบกลับงานยื่นภาษี ภ.ง.ด.**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
- ✅ **เพิ่มหัวข้อใหม่: ส่งงานยื่นภาษีกับทีมยื่นภาษี VAT** ใน Tab 3: ยื่นแบบภาษีมูลค่าเพิ่ม (VAT):
  - ต่อจากส่วนสอบถามและตอบกลับ
  - แสดงเฉพาะเมื่อเปิดจากหน้าสถานะยื่นภาษี (`sourcePage === 'taxStatus'`)
  - **ความเห็นส่งงานยื่นภาษี ภ.พ.30**: ผู้ใช้กรอกได้, พื้นหลังสีขาว (#ffffff)
  - **ตอบกลับงานยื่นภาษี ภ.พ.30**: แก้ไขไม่ได้ (read-only), พื้นหลังสีเทา (#808080), ฟอนต์สีขาว, cursor: not-allowed
- ✅ เพิ่ม state `taxFilingComment`, `taxFilingReply`, `vatFilingComment`, และ `vatFilingReply` สำหรับจัดการข้อมูลส่งงานยื่นภาษี

---

**Last Updated**: 2026-01-29 (ตอนค่ำ - เพิ่มหัวข้อส่งงานยื่นภาษีและปรับสอบถาม/ตอบกลับ)
