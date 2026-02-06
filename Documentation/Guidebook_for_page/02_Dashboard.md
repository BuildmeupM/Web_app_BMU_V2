# 📊 02. Dashboard Page

## 📋 Overview

หน้าแดชบอร์ดหลักที่แสดงข้อมูลสรุปตาม Role ของผู้ใช้

**Route**: `/dashboard`  
**Component**: `src/pages/Dashboard.tsx`

## 🔐 Access Control

- ✅ **ทุก Role** สามารถเข้าถึงได้
- ✅ แสดงข้อมูลแตกต่างกันตาม Role

## ✨ Features

### Dashboard ตาม Role

#### 1. **admin** (ผู้ดูแลระบบ)
แสดงข้อมูลทั้งหมด:
- ✅ พนักงานทั้งหมด
- ✅ การลาที่รออนุมัติ
- ✅ การเบิกเงินเดือน
- ✅ เข้างานวันนี้
- ✅ เอกสารที่รอคีย์
- ✅ ยื่นภาษีเดือนนี้

#### 2. **data_entry** (ผู้คีย์ข้อมูล)
แสดงงานที่เกี่ยวข้อง:
- ✅ เอกสารที่รอคีย์
- ✅ การลาที่รออนุมัติ
- ✅ การเบิกเงินเดือน

#### 3. **data_entry_and_service** (ผู้คีย์ข้อมูลและบริการ)
แสดงงานที่เกี่ยวข้อง:
- ✅ เอกสารที่รอคีย์
- ✅ เอกสารที่รอคัดแยก
- ✅ สถานะยื่นภาษี

#### 4. **audit** (ผู้ตรวจสอบ)
แสดงงานที่เกี่ยวข้อง:
- ✅ เอกสารที่รอตรวจ
- ✅ การลาที่รออนุมัติ
- ✅ การเบิกเงินเดือน

#### 5. **service** (ผู้ให้บริการ)
แสดงงานที่เกี่ยวข้อง:
- ✅ เอกสารที่รอคัดแยก
- ✅ สถานะยื่นภาษี
- ✅ เข้างานวันนี้

## 🎨 UI/UX Guidelines

### Design
- ✅ Card-based Layout
- ✅ Grid Layout (Responsive)
- ✅ Icons สำหรับแต่ละ Stat
- ✅ Color Coding ตามประเภทข้อมูล
- ✅ Hover Effects

### Layout
```
┌─────────────────────────────────────┐
│  Dashboard Title                    │
│  Welcome, [User Name]               │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ Stat │ │ Stat │ │ Stat │       │
│  │ Card │ │ Card │ │ Card │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ Stat │ │ Stat │ │ Stat │       │
│  │ Card │ │ Card │ │ Card │       │
│  └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────┘
```

### Components
- `Container` - Main container
- `Title` - Page title
- `SimpleGrid` - Grid layout
- `Card` - Stat cards
- `Group` - Layout group
- `Text` - Text display
- Icons จาก `@tabler/icons-react`

## 📊 Data Structure

### Dashboard Data
```typescript
interface DashboardStat {
  label: string
  value: string | number
  icon: React.ComponentType
  color: 'blue' | 'green' | 'orange' | 'yellow' | 'red'
}
```

## 🔌 API Endpoints

### GET `/api/dashboard`
**Response:**
```json
{
  "stats": [
    {
      "label": "พนักงานทั้งหมด",
      "value": 150,
      "type": "employees"
    },
    {
      "label": "การลาที่รออนุมัติ",
      "value": 12,
      "type": "leave_requests"
    }
  ]
}
```

## ✅ Validation Rules

- ✅ ตรวจสอบ Role ก่อนแสดงข้อมูล
- ✅ Validate Data จาก API

## 🚨 Error Handling

- ✅ Loading State
- ✅ Error State
- ✅ Empty State

## 🔄 User Flow

```
1. User เข้าสู่ระบบ
2. Redirect ไป Dashboard
3. ตรวจสอบ Role
4. Fetch Dashboard Data ตาม Role
5. แสดง Stats Cards
6. User สามารถคลิก Card เพื่อไปหน้าที่เกี่ยวข้อง
```

## 📝 Implementation Notes

- ✅ ใช้ `useAuthStore` เพื่อดึง Role
- ✅ ใช้ `getDashboardData()` เพื่อดึงข้อมูลตาม Role
- ✅ ใช้ `SimpleGrid` สำหรับ Responsive Layout
- ✅ ใช้ `Card` Component สำหรับ Stat Cards
- ✅ ใช้ Icons จาก `@tabler/icons-react`

---

**Last Updated**: 2026-01-29
