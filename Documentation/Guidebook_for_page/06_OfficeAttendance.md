# 🕐 06. Office Attendance Page

## 📋 Overview

หน้าจัดการข้อมูลการเข้าออฟฟิศ

**Route**: `/attendance`  
**Component**: `src/pages/OfficeAttendance.tsx`

## 🔐 Access Control

- ✅ **ทุก Role** สามารถเข้าถึงได้

## ✨ Features

### 1. Attendance Records
- ✅ แสดงข้อมูลการเข้าออฟฟิศ
- ✅ Filter ตามวันที่
- ✅ Export Data

## 📊 Data Structure

```typescript
interface Attendance {
  id: string
  employeeId: string
  date: string
  checkIn: string
  checkOut: string
  status: 'present' | 'absent' | 'late'
}
```

---

**Last Updated**: 2026-01-29
