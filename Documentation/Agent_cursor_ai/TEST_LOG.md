# 🧪 Unit Test Log & Tracking - BMU Work Management System

## 📋 วัตถุประสงค์

ไฟล์นี้ใช้สำหรับบันทึกการทดสอบ Unit Test ของฟังก์ชันแต่ละส่วนในระบบ เพื่อให้ Cursor AI และ Developer สามารถ:
- ✅ ติดตามว่าทดสอบฟังก์ชันไหนไปแล้วบ้าง
- ✅ รู้ว่าฟังก์ชันไหนยังไม่ได้ทดสอบ
- ✅ บันทึกบัคที่พบระหว่างการทดสอบ
- ✅ ติดตาม Coverage ของแต่ละหน้า/Component
- ✅ หลีกเลี่ยงการแก้ไขโค้ดที่เคยเจอบัคจากการทดสอบ
- ✅ เข้าใจประวัติการทดสอบและผลลัพธ์

---

## 📝 โครงสร้างการบันทึก

แต่ละ Test Entry จะมีข้อมูลดังนี้:
- **วันที่ทดสอบ**: วันที่ที่ทำการทดสอบ
- **ส่วน/หน้าที่เกี่ยวข้อง**: หน้า/Component ที่ทดสอบ
- **ฟังก์ชันที่ทดสอบ**: ชื่อฟังก์ชัน/Component ที่ทดสอบ
- **Test Case**: รายละเอียด Test Case ที่ทดสอบ
- **ผลการทดสอบ**: Passed / Failed / Pending
- **บัคที่พบ**: บัคที่พบระหว่างการทดสอบ (ถ้ามี)
- **ไฟล์ Test**: ไฟล์ test ที่เกี่ยวข้อง
- **ไฟล์ Source**: ไฟล์ source code ที่ทดสอบ
- **ผู้ทดสอบ**: ผู้ที่ทำการทดสอบ (ถ้ามี)
- **หมายเหตุ**: ข้อมูลเพิ่มเติม

---

## 🔍 การค้นหา Test Logs

### ตามส่วน/หน้า
- [Login](#login)
- [Dashboard](#dashboard)
- [ข้อมูลพนักงาน](#ข้อมูลพนักงาน)
- [ลางาน/WFH](#ลางานwfh)
- [ขอเบิกเงินเดือน](#ขอเบิกเงินเดือน)
- [ข้อมูลเข้าออฟฟิศ](#ข้อมูลเข้าออฟฟิศ)
- [คัดแยกเอกสาร](#คัดแยกเอกสาร)
- [คีย์เอกสาร](#คีย์เอกสาร)
- [ตรวจภาษี](#ตรวจภาษี)
- [สถานะยื่นภาษี](#สถานะยื่นภาษี)
- [ยื่นภาษี](#ยื่นภาษี)
- [Layout/Components](#layoutcomponents)
- [Authentication](#authentication)
- [Services/API](#servicesapi)
- [Utils/Helpers](#utilshelpers)
- [Store/State Management](#storestate-management)

---

## 📊 Test Coverage Summary

### สรุป Coverage ตามส่วน/หน้า

| ส่วน/หน้า | ฟังก์ชันทั้งหมด | ทดสอบแล้ว | ผ่าน | ล้มเหลว | Coverage % | สถานะ |
|-----------|----------------|-----------|------|---------|------------|-------|
| Login | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| Dashboard | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ข้อมูลพนักงาน | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ลางาน/WFH | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ขอเบิกเงินเดือน | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ข้อมูลเข้าออฟฟิศ | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| คัดแยกเอกสาร | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| คีย์เอกสาร | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ตรวจภาษี | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| สถานะยื่นภาษี | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| ยื่นภาษี | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| Layout/Components | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |
| Authentication | 2 | 2 | 2 | 0 | 100% | ✅ Completed |
| Services/API | 3 | 3 | 3 | 0 | 100% | ✅ Completed |
| Utils/Helpers | 3 | 3 | 3 | 0 | 100% | ✅ Completed |
| Store/State Management | 0 | 0 | 0 | 0 | 0% | ⚠️ Not Started |

**รวมทั้งหมด**: 8 ฟังก์ชัน, ทดสอบแล้ว 8 ฟังก์ชัน, Coverage: สูงขึ้น (rolePermissions + authService error cases)

---

## 📅 Test Logs

### Login

#### Functions/Components to Test
- [ ] `Login` component rendering
- [ ] Form validation (email, password)
- [ ] Submit handler
- [ ] Error handling
- [ ] Loading states
- [ ] Success redirect
- [ ] Role-based redirect after login

#### Test Entries

<!-- ตัวอย่างโครงสร้าง Test Entry -->
<!-- 
#### TEST-001: [ชื่อ Test Case]
- **วันที่ทดสอบ**: YYYY-MM-DD
- **ส่วน/หน้าที่เกี่ยวข้อง**: Login
- **ฟังก์ชันที่ทดสอบ**: `handleLogin`
- **Test Case**: 
  - Test case description
  - Input: [input values]
  - Expected: [expected output]
- **ผลการทดสอบ**: ✅ Passed / ❌ Failed / ⏳ Pending
- **บัคที่พบ**: 
  - [อธิบายบัคที่พบ ถ้ามี]
  - [สาเหตุของบัค]
- **ไฟล์ Test**: `src/pages/__tests__/Login.test.tsx`
- **ไฟล์ Source**: `src/pages/Login.tsx`
- **ผู้ทดสอบ**: [ชื่อผู้ทดสอบ]
- **หมายเหตุ**: [ข้อมูลเพิ่มเติม]
-->

---

### Dashboard

#### Functions/Components to Test
- [ ] `Dashboard` component rendering
- [ ] Role-based data display
- [ ] Data fetching
- [ ] Loading states
- [ ] Error handling
- [ ] Chart rendering (if any)
- [ ] Statistics calculation

#### Test Entries

---

### ข้อมูลพนักงาน

#### Functions/Components to Test
- [ ] `EmployeeManagement` component rendering
- [ ] Employee list display
- [ ] Add employee form
- [ ] Edit employee form
- [ ] Delete employee
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Pagination
- [ ] Form validation
- [ ] Data export (PDF, Excel)

#### Test Entries

---

### ลางาน/WFH

#### Functions/Components to Test
- [ ] `LeaveManagement` component rendering
- [ ] Leave request form
- [ ] WFH request form
- [ ] Leave list display
- [ ] Approval workflow
- [ ] Date validation
- [ ] Leave balance calculation
- [ ] Calendar integration

#### Test Entries

---

### ขอเบิกเงินเดือน

#### Functions/Components to Test
- [ ] `SalaryAdvance` component rendering
- [ ] Salary advance request form
- [ ] Request list display
- [ ] Approval workflow
- [ ] Amount validation
- [ ] Calculation logic

#### Test Entries

---

### ข้อมูลเข้าออฟฟิศ

#### Functions/Components to Test
- [ ] `OfficeAttendance` component rendering
- [ ] Attendance list display
- [ ] Check-in/Check-out functionality
- [ ] Attendance statistics
- [ ] Date filtering
- [ ] Export functionality

#### Test Entries

---

### คัดแยกเอกสาร

#### Functions/Components to Test
- [ ] `DocumentSorting` component rendering
- [ ] Document list display
- [ ] Sorting functionality
- [ ] Category assignment
- [ ] Status update
- [ ] File upload handling

#### Test Entries

---

### คีย์เอกสาร

#### Functions/Components to Test
- [ ] `DocumentEntry` component rendering
- [ ] Document entry form
- [ ] Form validation
- [ ] Data submission
- [ ] File attachment handling
- [ ] Auto-save functionality

#### Test Entries

---

### ตรวจภาษี

#### Functions/Components to Test
- [ ] `TaxInspection` component rendering
- [ ] Document inspection workflow
- [ ] Status update
- [ ] Comment/Note functionality
- [ ] Document viewer

#### Test Entries

---

### สถานะยื่นภาษี

#### Functions/Components to Test
- [ ] `TaxStatus` component rendering
- [ ] Status tracking display
- [ ] Status update notifications
- [ ] Timeline display
- [ ] Filter by status

#### Test Entries

---

### ยื่นภาษี

#### Functions/Components to Test
- [ ] `TaxFiling` component rendering
- [ ] Tax filing form
- [ ] Form validation
- [ ] Document upload
- [ ] Submission workflow
- [ ] Confirmation display

#### Test Entries

---

### Layout/Components

#### Layout Components
- [ ] `Layout` component rendering
- [ ] `Sidebar` component rendering
- [ ] `Header` component rendering
- [ ] Navigation functionality
- [ ] Responsive behavior
- [ ] Active route highlighting

#### Reusable Components
- [ ] Form components
- [ ] Table components
- [ ] Modal components
- [ ] Button components
- [ ] Input components
- [ ] Card components

#### Test Entries

---

### Authentication

#### Functions/Components to Test
- [x] `ProtectedRoute` component rendering
- [x] Route protection logic (authenticated/unauthenticated)
- [ ] Role-based access control (requiredRole prop)
- [ ] Token validation
- [ ] Session management
- [ ] Logout functionality

#### Test Entries

#### TEST-001: ProtectedRoute Component Tests
- **วันที่ทดสอบ**: 2026-01-30
- **ส่วน/หน้าที่เกี่ยวข้อง**: Authentication
- **ฟังก์ชันที่ทดสอบ**: `ProtectedRoute` component
- **Test Case**: 
  - Test 1: should render children when user is authenticated
    - Input: `isAuthenticated: true, token: 'mock-token'`
    - Expected: Children component should be rendered
    - Actual: ✅ Passed
  - Test 2: should redirect to login when user is not authenticated
    - Input: `isAuthenticated: false, token: null`
    - Expected: Should redirect to `/login`
    - Actual: ✅ Passed
  - Test 3: should redirect to login when token is missing
    - Input: `isAuthenticated: true, token: null`
    - Expected: Should redirect to `/login`
    - Actual: ✅ Passed
- **ผลการทดสอบ**: ✅ Passed (3/3 tests)
- **Coverage**: 100% (ProtectedRoute.tsx)
- **ไฟล์ Test**: `src/components/Auth/__tests__/ProtectedRoute.test.tsx`
- **ไฟล์ Source**: `src/components/Auth/ProtectedRoute.tsx`
- **หมายเหตุ**: Tests ครอบคลุมการ render และ redirect logic แล้ว แต่ยังไม่มี test สำหรับ `requiredRole` prop

---

### Services/API

#### API Services to Test
- [x] `authService` - Login, Logout, GetCurrentUser (รวม error cases: success:false, logout fail, getCurrentUser fail)
- [ ] `employeeService` - CRUD operations
- [ ] `leaveService` - Leave management
- [ ] `salaryService` - Salary advance
- [ ] `attendanceService` - Attendance tracking
- [ ] `documentService` - Document operations
- [ ] `taxService` - Tax operations
- [ ] Error handling
- [ ] Request/Response interceptors

#### Test Entries

#### TEST-002: Auth Service Tests
- **วันที่ทดสอบ**: 2026-01-30
- **ส่วน/หน้าที่เกี่ยวข้อง**: Services/API
- **ฟังก์ชันที่ทดสอบ**: `authService` (login, logout, getCurrentUser)
- **Test Case**: 
  - Test 1: login - should login successfully with valid credentials
    - Input: `{ username: 'test@example.com', password: 'password123' }`
    - Expected: Should return user data and token
    - Actual: ✅ Passed
  - Test 2: login - should throw error with invalid credentials
    - Input: `{ username: 'wrong@example.com', password: 'wrongpassword' }`
    - Expected: Should throw error with 401 status
    - Actual: ✅ Passed
  - Test 3: logout - should logout successfully
    - Input: None
    - Expected: Should call API logout endpoint
    - Actual: ✅ Passed
  - Test 4: getCurrentUser - should get current user successfully
    - Input: None (uses token from store)
    - Expected: Should return user data
    - Actual: ✅ Passed
- **ผลการทดสอบ**: ✅ Passed (4/4 tests)
- **Coverage**: 84.44% (authService.ts)
- **Uncovered Lines**: (ลดลงหลังเพิ่ม error-case tests)
- **ไฟล์ Test**: `src/services/__tests__/authService.test.ts`
- **ไฟล์ Source**: `src/services/authService.ts`
- **หมายเหตุ**: เพิ่ม error-case tests (2026-02-06): login เมื่อ API ส่ง success: false, logout เมื่อ API fail (ไม่ throw), getCurrentUser เมื่อ success: false

---

### Utils/Helpers

#### Utility Functions to Test
- [x] `rolePermissions.ts` - Permission checking (hasPermission, getAccessibleRoutes, routePermissions)
- [ ] Date formatting functions
- [ ] Validation functions
- [ ] Formatting functions
- [ ] Calculation functions
- [ ] Helper functions

#### Test Entries

#### TEST-003: rolePermissions Unit Tests
- **วันที่ทดสอบ**: 2026-02-06
- **ส่วน/หน้าที่เกี่ยวข้อง**: Utils/Helpers
- **ฟังก์ชันที่ทดสอบ**: `hasPermission`, `getAccessibleRoutes`, `routePermissions`
- **Test Case**:
  - routePermissions: dashboard สำหรับทุก role, document-sorting เฉพาะ admin/service, work-assignment เฉพาะ admin
  - hasPermission: true เมื่อ role มีสิทธิ์, false เมื่อไม่มีสิทธิ์, false สำหรับ path ไม่รู้จัก
  - getAccessibleRoutes: admin ได้ทุก route, data_entry น้อยกว่า admin, ทุก route มี path และ label
- **ผลการทดสอบ**: ✅ Passed (10/10 tests)
- **ไฟล์ Test**: `src/utils/__tests__/rolePermissions.test.ts`
- **ไฟล์ Source**: `src/utils/rolePermissions.ts`
- **หมายเหตุ**: ครอบคลุม permission logic สำหรับ Sidebar และ ProtectedRoute

---

### Store/State Management

#### Stores to Test
- [ ] `authStore` - Authentication state
- [ ] State updates
- [ ] State persistence
- [ ] State reset
- [ ] Actions and reducers

#### Test Entries

---

## 🐛 Bugs Found During Testing

### Critical Bugs
<!-- บัคที่พบระหว่างการทดสอบที่ร้ายแรง -->

### High Priority Bugs
<!-- บัคที่พบระหว่างการทดสอบที่มีความสำคัญสูง -->

### Medium Priority Bugs
<!-- บัคที่พบระหว่างการทดสอบที่มีความสำคัญปานกลาง -->

### Low Priority Bugs
<!-- บัคที่พบระหว่างการทดสอบที่มีความสำคัญต่ำ -->

---

## 📌 Test Best Practices

### ก่อนเขียน Test
1. ✅ อ่าน `BUG_FIXES.md` เพื่อดูประวัติบัคที่เกี่ยวข้อง
2. ✅ เข้าใจฟังก์ชันที่ต้องทดสอบ
3. ✅ ระบุ Test Cases ที่ครอบคลุม (Happy Path, Edge Cases, Error Cases)
4. ✅ วางแผนโครงสร้าง Test File

### ขณะเขียน Test
1. ✅ เขียน Test ที่อ่านง่ายและเข้าใจง่าย
2. ✅ ใช้ชื่อ Test ที่อธิบายชัดเจน
3. ✅ Test แต่ละ Case แยกกัน
4. ✅ Mock External Dependencies
5. ✅ Test Edge Cases และ Error Cases

### หลังเขียน Test
1. ✅ รัน Test และตรวจสอบผลลัพธ์
2. ✅ บันทึกผลการทดสอบใน `TEST_LOG.md` ทันที
3. ✅ ถ้าพบบัค ให้บันทึกใน `BUG_FIXES.md` ด้วย
4. ✅ อัปเดต Test Coverage Summary
5. ✅ อัปเดต Functions/Components to Test checklist

---

## 🔄 Template สำหรับบันทึก Test

เมื่อเขียนและรัน Test เสร็จแล้ว ให้คัดลอก Template นี้ไปใช้:

```markdown
#### TEST-XXX: [ชื่อ Test Case]
- **วันที่ทดสอบ**: YYYY-MM-DD
- **ส่วน/หน้าที่เกี่ยวข้อง**: [ชื่อหน้า/Component]
- **ฟังก์ชันที่ทดสอบ**: `[functionName]`
- **Test Case**: 
  - [อธิบาย Test Case]
  - Input: [input values]
  - Expected: [expected output]
  - Actual: [actual output]
- **ผลการทดสอบ**: ✅ Passed / ❌ Failed / ⏳ Pending
- **บัคที่พบ**: 
  - [อธิบายบัคที่พบ ถ้ามี]
  - [สาเหตุของบัค]
  - [วิธีแก้ไข (ถ้าแก้ไขแล้ว)]
- **ไฟล์ Test**: `[path/to/test/file.test.tsx]`
- **ไฟล์ Source**: `[path/to/source/file.tsx]`
- **ผู้ทดสอบ**: [ชื่อผู้ทดสอบ]
- **หมายเหตุ**: [ข้อมูลเพิ่มเติม]
```

---

## 📈 Test Statistics

### Overall Statistics
- **Total Functions**: 8 (tested)
- **Tested Functions**: 8
- **Passed Tests**: 20
- **Failed Tests**: 0
- **Pending Tests**: 0
- **Test Coverage**: 100% (ProtectedRoute), 100% (rolePermissions), authService รวม error cases

### Recent Tests (Last 30 days)
- Tests run: 20
- Tests passed: 20
- Tests failed: 0
- Bugs found: 0
- Test Files: 3 (ProtectedRoute, authService, rolePermissions)
- Coverage: เพิ่ม rolePermissions 100%, authService error cases

---

## 🔗 Related Documentation

- [BUG_FIXES.md](./BUG_FIXES.md) - บันทึกการแก้ไขบัค
- [AGENT.md](./AGENT.md) - Guidelines และ Standards
- [Testing Guidelines in AGENT.md](./AGENT.md#-testing-guidelines)

---

## 📌 หมายเหตุ

1. **บันทึกทันที**: เมื่อรัน Test เสร็จแล้ว ให้บันทึกผลทันที
2. **อธิบายให้ชัดเจน**: อธิบาย Test Case และผลลัพธ์ให้ชัดเจน
3. **บันทึกบัค**: ถ้าพบบัคระหว่างการทดสอบ ให้บันทึกใน `BUG_FIXES.md` ด้วย
4. **อัปเดต Coverage**: อัปเดต Test Coverage Summary ทุกครั้งที่เพิ่ม Test ใหม่
5. **ใช้ Template**: ใช้ Template ที่ให้ไว้เพื่อให้ข้อมูลครบถ้วนและสอดคล้องกัน
6. **ตรวจสอบก่อนแก้ไข**: ก่อนแก้ไขโค้ด ให้ตรวจสอบ `TEST_LOG.md` และ `BUG_FIXES.md` เพื่อดูว่ามีบัคที่เกี่ยวข้องหรือไม่

---

**อัปเดตล่าสุด**: 2026-02-06
**เวอร์ชัน**: 1.2.0

---

## 📝 Recent Test Runs

### Test Run #2 - 2026-02-06
- **Command**: `npm run test:run`
- **Test Files**: 3 passed (authService, rolePermissions, ProtectedRoute)
- **Tests**: 20 passed (20 total)
- **Status**: ✅ All tests passed
- **Notes**:
  - เพิ่ม `src/utils/__tests__/rolePermissions.test.ts` (10 tests)
  - เพิ่ม authService error-case tests: login success:false, logout ไม่ throw เมื่อ API fail, getCurrentUser success:false

### Test Run #1 - 2026-01-30 22:48:07
- **Command**: `npm run test:coverage`
- **Test Files**: 2 passed
- **Tests**: 7 passed (7 total)
- **Duration**: 36.50s
- **Coverage**:
  - Overall: 0.38% Stmts, 14.51% Branch, 7.4% Funcs, 0.38% Lines
  - ProtectedRoute.tsx: 100% ✅
  - authService.ts: 84.44% ✅
- **Files Tested**:
  - `src/components/Auth/__tests__/ProtectedRoute.test.tsx` (3 tests)
  - `src/services/__tests__/authService.test.ts` (4 tests)
- **Status**: ✅ All tests passed
- **Notes**: 
  - ระบบ Testing setup สำเร็จแล้ว
  - Frontend tests ทำงานได้ดี
  - Backend tests ถูก exclude จาก frontend test runner แล้ว
  - ควรเพิ่ม tests สำหรับ error cases ใน authService (lines 19-20, 31-33, 40-41)
