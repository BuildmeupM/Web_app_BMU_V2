# 💰 05. Salary Advance Page

## 📋 Overview

หน้าจัดการการเบิกเงินเดือน

**Route**: `/salary-advance`  
**Component**: `src/pages/SalaryAdvance.tsx`

## 🔐 Access Control

- ✅ **ทุก Role** สามารถเข้าถึงได้

## ✨ Features

### 1. Salary Advance Request
- ✅ ขอเบิกเงินเดือน
- ✅ อนุมัติ/ปฏิเสธ (สำหรับ Admin/Audit)

## 📊 Data Structure

```typescript
interface SalaryAdvance {
  id: string
  employeeId: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}
```

---

**Last Updated**: 2026-01-29
