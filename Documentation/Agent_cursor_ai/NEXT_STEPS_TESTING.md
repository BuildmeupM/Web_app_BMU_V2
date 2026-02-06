# 🚀 ขั้นตอนต่อไปสำหรับระบบ Testing

## 📋 สถานะปัจจุบัน

✅ **ระบบ Testing พร้อมใช้งานแล้ว**
- Tests ที่ผ่าน: 7 tests (100% pass rate)
- Coverage: 0.38% (ยังมี test น้อย)
- ไฟล์ที่มี test: ProtectedRoute (100%), authService (84.44%)

---

## 🎯 ขั้นตอนต่อไป (เรียงตามความสำคัญ)

### 1. รัน Tests ใน UI Mode (แนะนำ)

Vitest UI Dashboard ช่วยให้ดู tests และ coverage ได้ง่ายขึ้น:

```bash
# รัน tests ใน UI mode
npm run test:ui
```

**ประโยชน์**:
- ✅ ดู tests แบบ real-time
- ✅ ดู coverage แบบ visual
- ✅ Debug tests ได้ง่าย
- ✅ ดู test results แบบละเอียด

**วิธีใช้**:
1. รันคำสั่ง `npm run test:ui`
2. Browser จะเปิดอัตโนมัติที่ `http://localhost:51204`
3. ดู tests และ coverage ใน UI

---

### 2. เพิ่ม Tests สำหรับไฟล์สำคัญ (Priority 1)

#### 🔴 Critical - Authentication & Security
ไฟล์เหล่านี้ควรมี Coverage สูงสุด (100%):

- [ ] **`Login.tsx`** - หน้า Login
  - Test: Form rendering, validation, submit, error handling
  - Priority: 🔴 Critical
  - Target Coverage: 90%+

- [ ] **`authStore.ts`** - State management สำหรับ auth
  - Test: Login, logout, token management, state updates
  - Priority: 🔴 Critical
  - Target Coverage: 100%

- [ ] **`api.ts`** - API interceptor และ error handling
  - Test: Request/response interceptors, error handling, token injection
  - Priority: 🔴 Critical
  - Target Coverage: 80%+

#### 🟠 High Priority - Core Features
ไฟล์เหล่านี้ควรมี Coverage 80%+:

- [ ] **`Dashboard.tsx`** - Dashboard หลัก
  - Test: Role-based rendering, data fetching, loading states
  - Priority: 🟠 High
  - Target Coverage: 80%+

- [ ] **`EmployeeManagement.tsx`** - จัดการพนักงาน
  - Test: Component rendering, navigation, role-based access
  - Priority: 🟠 High
  - Target Coverage: 70%+

- [ ] **`LeaveManagement.tsx`** - จัดการลา/WFH
  - Test: Component rendering, tab navigation, role-based access
  - Priority: 🟠 High
  - Target Coverage: 70%+

#### 🟡 Medium Priority - Services
ไฟล์เหล่านี้ควรมี Coverage 80%+:

- [ ] **`employeeService.ts`** - Employee API calls
  - Test: CRUD operations, error handling, data transformation
  - Priority: 🟡 Medium
  - Target Coverage: 80%+

- [ ] **`leaveService.ts`** - Leave/WFH API calls
  - Test: Request operations, error handling, data transformation
  - Priority: 🟡 Medium
  - Target Coverage: 80%+

---

### 3. เพิ่ม Error Case Tests

ใน `authService.ts` ยังมี uncovered lines:
- Lines 19-20: Error handling ใน login
- Lines 31-33: Error handling ใน logout
- Lines 40-41: Error handling ใน getCurrentUser

**ควรเพิ่ม tests**:
```typescript
// ใน authService.test.ts
it('should handle login error when API returns success: false', async () => {
  const mockResponse = {
    data: {
      success: false,
      message: 'Invalid credentials',
    },
  }
  ;(api.post as any).mockResolvedValue(mockResponse)

  await expect(
    authService.login({ username: 'test@example.com', password: 'wrong' })
  ).rejects.toThrow('Invalid credentials')
})
```

---

### 4. เพิ่ม Tests สำหรับ Components สำคัญ

#### Form Components
- [ ] `EmployeeForm.tsx` - Form สำหรับเพิ่ม/แก้ไขพนักงาน
- [ ] `LeaveRequestForm.tsx` - Form สำหรับขอลา
- [ ] `WFHRequestForm.tsx` - Form สำหรับขอ WFH

#### List Components
- [ ] `EmployeeList.tsx` - รายชื่อพนักงาน
- [ ] `LeaveRequestList.tsx` - รายการขอลา
- [ ] `WFHRequestList.tsx` - รายการขอ WFH

#### Dashboard Components
- [ ] `LeaveDashboard.tsx` - Dashboard สำหรับลา
- [ ] `WFHDashboard.tsx` - Dashboard สำหรับ WFH

---

### 5. เพิ่ม Tests สำหรับ Utils และ Helpers

- [ ] **`rolePermissions.ts`** - Permission checking
  - Test: hasPermission, canAccess, role checks
  - Priority: 🟡 Medium
  - Target Coverage: 100%

---

## 📝 Template สำหรับเขียน Test ใหม่

### Component Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import YourComponent from '../YourComponent'

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const { user } = render(<YourComponent />)
    const button = screen.getByRole('button', { name: 'Click Me' })
    await user.click(button)
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

### Service Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { yourService } from '../yourService'
import api from '../api'

vi.mock('../api')

describe('yourService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch data successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { /* mock data */ },
      },
    }
    ;(api.get as any).mockResolvedValue(mockResponse)

    const result = await yourService.getData()
    expect(result).toEqual(mockResponse.data.data)
  })
})
```

---

## 🎯 Coverage Goals

### Short-term Goals (1-2 สัปดาห์)
- ✅ Authentication: 100% (ProtectedRoute: 100% ✅)
- ⏳ Login page: 90%+
- ⏳ authStore: 100%
- ⏳ api.ts: 80%+

### Medium-term Goals (1 เดือน)
- ⏳ Core Features: 70%+ (Dashboard, EmployeeManagement, LeaveManagement)
- ⏳ Services: 80%+ (employeeService, leaveService)
- ⏳ Overall Coverage: 30%+

### Long-term Goals (3 เดือน)
- ⏳ Overall Coverage: 80%+
- ⏳ Critical Paths: 100%
- ⏳ All Services: 80%+
- ⏳ All Components: 70%+

---

## 📚 เอกสารที่เกี่ยวข้อง

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - คู่มือการทดสอบ
- [COVERAGE_EXPLANATION.md](./COVERAGE_EXPLANATION.md) - คำอธิบาย Coverage Report
- [TEST_LOG.md](./TEST_LOG.md) - บันทึกผลการทดสอบ
- [README_TESTING.md](../../README_TESTING.md) - Quick Start Guide

---

## ✅ Checklist สำหรับการพัฒนา Tests

### ก่อนเขียน Test
- [ ] อ่าน `BUG_FIXES.md` เพื่อดูประวัติบัคที่เกี่ยวข้อง
- [ ] เข้าใจฟังก์ชันที่ต้องทดสอบ
- [ ] ระบุ Test Cases ที่ครอบคลุม (Happy Path, Edge Cases, Error Cases)

### ขณะเขียน Test
- [ ] ใช้ชื่อ Test ที่อธิบายชัดเจน
- [ ] Test แต่ละ Case แยกกัน
- [ ] Mock External Dependencies
- [ ] Test Edge Cases และ Error Cases

### หลังเขียน Test
- [ ] รัน Test และตรวจสอบผลลัพธ์
- [ ] บันทึกผลการทดสอบใน `TEST_LOG.md` ทันที
- [ ] ถ้าพบบัค ให้บันทึกใน `BUG_FIXES.md` ด้วย
- [ ] อัปเดต Test Coverage Summary
- [ ] อัปเดต Functions/Components to Test checklist

---

## 🚀 Quick Start - ขั้นตอนแรก

### 1. รัน Tests ใน UI Mode
```bash
npm run test:ui
```
เปิด browser และดู Vitest UI Dashboard

### 2. เพิ่ม Test สำหรับ Login.tsx (Priority 1)
```bash
# สร้างไฟล์ test
touch src/pages/__tests__/Login.test.tsx
```

### 3. เขียน Test ตาม Template
ใช้ Component Test Template ที่ให้ไว้ด้านบน

### 4. รัน Test และดู Coverage
```bash
npm run test:coverage
```

### 5. บันทึกผลใน TEST_LOG.md
ตาม Template ที่มีใน `TEST_LOG.md`

---

**อัปเดตล่าสุด**: 2026-01-30
**เวอร์ชัน**: 1.0.0
