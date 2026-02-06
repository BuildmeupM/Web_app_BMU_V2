# 🧪 Testing Guide - BMU Work Management System

## 📋 วัตถุประสงค์

คู่มือนี้ใช้สำหรับแนะนำวิธีการสร้างและรัน Tests สำหรับระบบ BMU Work Management System เพื่อตรวจสอบว่าระบบทำงานถูกต้องและไม่มีบัค

---

## 🛠️ Testing Tools ที่ใช้

### Frontend (React + TypeScript + Vite)
- **Vitest**: Test runner ที่ทำงานร่วมกับ Vite ได้ดี
- **React Testing Library**: สำหรับทดสอบ React Components
- **@testing-library/jest-dom**: Matchers เพิ่มเติมสำหรับ DOM testing
- **jsdom**: DOM environment สำหรับ testing

### Backend (Node.js + Express)
- **Jest**: Test runner สำหรับ Node.js
- **Supertest**: สำหรับทดสอบ HTTP endpoints

---

## 📁 โครงสร้างไฟล์ Test

### Frontend
```
src/
├── components/
│   └── Auth/
│       └── __tests__/
│           └── ProtectedRoute.test.tsx
├── services/
│   └── __tests__/
│       └── authService.test.ts
├── utils/
│   └── __tests__/
│       └── rolePermissions.test.ts
└── test/
    ├── setup.ts          # Test setup configuration
    ├── utils.tsx         # Test utilities และ helpers
    └── __mocks__/
        └── axios.ts      # Mock สำหรับ axios
```

### Backend
```
backend/
├── routes/
│   └── __tests__/
│       ├── auth.test.js
│       └── employees.test.js
├── middleware/
│   └── __tests__/
│       └── auth.test.js
└── utils/
    └── __tests__/
        └── validation.test.js
```

---

## 🚀 การติดตั้งและตั้งค่า

### 1. ติดตั้ง Dependencies

#### Frontend
```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

#### Backend
```bash
cd backend
npm install --save-dev jest supertest @babel/core @babel/preset-env
```

### 2. Configuration Files

#### Frontend: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

#### Backend: `jest.config.js`
```javascript
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['routes/**/*.js', 'middleware/**/*.js'],
}
```

---

## 📝 การเขียน Tests

### Frontend Component Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Frontend Service Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../authService'
import api from '../api'

vi.mock('../api')

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should login successfully', async () => {
    const mockResponse = { data: { token: 'token', user: {} } }
    ;(api.post as any).mockResolvedValue(mockResponse)

    const result = await authService.login('email', 'password')
    expect(result).toEqual(mockResponse.data)
  })
})
```

### Backend Route Test

```javascript
import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth.js'

const app = express()
app.use('/api/auth', authRoutes)

describe('POST /api/auth/login', () => {
  it('should login successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
  })
})
```

---

## 🎯 Test Types

### 1. Unit Tests
- ทดสอบฟังก์ชันหรือ Component แยกกัน
- ใช้ Mock สำหรับ dependencies
- ครอบคลุม: Happy Path, Edge Cases, Error Cases

### 2. Integration Tests
- ทดสอบการทำงานร่วมกันของหลาย Components/Services
- ทดสอบ API Endpoints กับ Database
- ทดสอบ Authentication และ Authorization

### 3. E2E Tests (End-to-End)
- ทดสอบ User Flows ทั้งหมด
- ทดสอบ Critical Paths
- ใช้ Playwright หรือ Cypress (แนะนำให้เพิ่มในอนาคต)

---

## 📊 การรัน Tests

### Frontend

```bash
# รัน tests ใน watch mode
npm run test

# รัน tests แบบ UI
npm run test:ui

# รัน tests ครั้งเดียว (ไม่ watch)
npm run test:run

# รัน tests พร้อม coverage report
npm run test:coverage
```

### Backend

```bash
cd backend

# รัน tests
npm test

# รัน tests พร้อม coverage
npm test -- --coverage
```

---

## ✅ Best Practices

### 1. ก่อนเขียน Test
- ✅ อ่าน `BUG_FIXES.md` เพื่อดูประวัติบัคที่เกี่ยวข้อง
- ✅ เข้าใจฟังก์ชันที่ต้องทดสอบ
- ✅ ระบุ Test Cases ที่ครอบคลุม

### 2. ขณะเขียน Test
- ✅ ใช้ชื่อ Test ที่อธิบายชัดเจน
- ✅ Test แต่ละ Case แยกกัน
- ✅ Mock External Dependencies
- ✅ Test Edge Cases และ Error Cases

### 3. หลังเขียน Test
- ✅ รัน Test และตรวจสอบผลลัพธ์
- ✅ บันทึกผลการทดสอบใน `TEST_LOG.md` ทันที
- ✅ ถ้าพบบัค ให้บันทึกใน `BUG_FIXES.md` ด้วย
- ✅ อัปเดต Test Coverage Summary

---

## 📈 Test Coverage Goals

### Coverage Targets
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: 60%+ coverage
- **Critical Paths**: 100% coverage

### Priority Areas
1. **Authentication & Authorization** - 100% coverage
2. **API Endpoints** - 80%+ coverage
3. **Form Validation** - 90%+ coverage
4. **Business Logic** - 80%+ coverage
5. **UI Components** - 70%+ coverage

---

## 🐛 การจัดการบัคที่พบระหว่าง Testing

### เมื่อพบบัคระหว่างการทดสอบ:

1. **บันทึกใน `BUG_FIXES.md`**:
   - อธิบายปัญหา
   - สาเหตุของบัค
   - วิธีแก้ไข
   - ไฟล์ที่แก้ไข

2. **บันทึกใน `TEST_LOG.md`**:
   - Test Case ที่พบบัค
   - ผลการทดสอบ (Failed)
   - บัคที่พบ
   - ไฟล์ Test และ Source

3. **แก้ไขบัค**:
   - แก้ไขโค้ด
   - รัน Test อีกครั้ง
   - อัพเดท Documentation

---

## 📚 ตัวอย่าง Test Cases

### Component Test Example

```typescript
describe('Login Component', () => {
  it('should render login form', () => {
    render(<Login />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('should show error on invalid credentials', async () => {
    render(<Login />)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Login' })

    await userEvent.type(emailInput, 'wrong@example.com')
    await userEvent.type(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })
})
```

### Service Test Example

```typescript
describe('employeeService', () => {
  it('should fetch employees list', async () => {
    const mockEmployees = [
      { id: 1, employee_id: 'AC00001', full_name: 'John Doe' },
    ]
    ;(api.get as any).mockResolvedValue({ data: mockEmployees })

    const result = await employeeService.getEmployees()

    expect(api.get).toHaveBeenCalledWith('/employees')
    expect(result).toEqual(mockEmployees)
  })
})
```

---

## 🔗 Related Documentation

- [TEST_LOG.md](./TEST_LOG.md) - บันทึกการทดสอบทั้งหมด
- [BUG_FIXES.md](./BUG_FIXES.md) - บันทึกการแก้ไขบัค
- [AGENT.md](./AGENT.md) - Guidelines และ Standards

---

## 📌 หมายเหตุ

1. **เขียน Test ก่อนแก้ไขโค้ด**: เมื่อแก้ไขโค้ด ให้เขียน Test เพื่อป้องกัน regression
2. **รัน Tests เป็นประจำ**: รัน Tests ก่อน commit code
3. **Maintain Test Quality**: Tests ควรอ่านง่ายและบำรุงรักษาได้
4. **Update Documentation**: อัพเดท `TEST_LOG.md` ทุกครั้งที่รัน Tests

---

**อัปเดตล่าสุด**: 2026-01-30
**เวอร์ชัน**: 1.0.0
