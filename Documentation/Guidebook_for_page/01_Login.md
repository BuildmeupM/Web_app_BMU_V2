# 🔐 01. Login Page

## 📋 Overview

หน้าเข้าสู่ระบบสำหรับผู้ใช้ทุก Role

**Route**: `/login`  
**Component**: `src/pages/Login.tsx`

## 🔐 Access Control

- ✅ **ทุก Role** สามารถเข้าถึงได้
- ✅ ถ้า Login แล้วจะ Redirect ไป `/dashboard`

## ✨ Features

### 1. Login Form
- ✅ Username Input
- ✅ Password Input
- ✅ Login Button
- ✅ Error Handling
- ✅ Loading State

### 2. Authentication
- ✅ เชื่อมต่อกับ Backend API (`/api/auth/login`)
- ✅ Validate Credentials ด้วย bcrypt
- ✅ Store JWT Token และ User Info ใน Zustand Store
- ✅ Auto Redirect ไป `/dashboard` เมื่อ login สำเร็จ
- ✅ Error Handling สำหรับ invalid credentials

## 🎨 UI/UX Guidelines

### Design
- ✅ Clean และ Modern Design
- ✅ Centered Layout
- ✅ Card-based Form
- ✅ Orange Primary Color
- ✅ Kanit Font

### Layout
```
┌─────────────────────────┐
│   BMU System Logo/Title  │
│                         │
│  ┌───────────────────┐  │
│  │   Login Form       │  │
│  │   - Username       │  │
│  │   - Password       │  │
│  │   - Login Button   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

### Components
- `Container` - Centered container
- `Paper` - Card for form
- `TextInput` - Username input
- `PasswordInput` - Password input
- `Button` - Login button
- `Alert` - Error messages

## 📊 Data Structure

### Login Request
```typescript
interface LoginCredentials {
  username: string
  password: string
}
```

### Login Response
```typescript
interface LoginResponse {
  user: {
    id: string
    username: string
    email: string
    employee_id?: string | null
    nick_name?: string | null
    role: UserRole
    name: string
  }
  token: string
}
```

## 🔌 API Endpoints

### POST `/api/auth/login`
**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@bmu.local",
      "employee_id": "AC00010",
      "nick_name": "เอ็ม",
      "role": "admin",
      "name": "ยุทธนา (เอ็ม)"
    },
    "token": "jwt-token-here"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

## ✅ Validation Rules

### Username
- ✅ Required
- ✅ Min length: 3 characters
- ✅ Max length: 50 characters
- ✅ Alphanumeric และ underscore only

### Password
- ✅ Required
- ✅ Min length: 6 characters
- ✅ Max length: 100 characters

## 🚨 Error Handling

### Errors
- ✅ Invalid credentials → "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
- ✅ Network error → "เกิดข้อผิดพลาดในการเชื่อมต่อ"
- ✅ Server error → "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"

## 🔄 User Flow

```
1. User เข้าสู่ระบบ
2. กรอก Username และ Password
3. กดปุ่ม Login
4. Validate Input
5. ส่ง Request ไป API
6. ถ้าสำเร็จ → Store Token และ User Info → Redirect ไป Dashboard
7. ถ้าไม่สำเร็จ → แสดง Error Message
```

## 📝 Implementation Notes

- ✅ ใช้ `useAuthStore` สำหรับจัดการ Authentication State
- ✅ ใช้ `useNavigate` สำหรับ Navigation
- ✅ ใช้ `Mantine` Components สำหรับ UI
- ✅ ใช้ `axios` สำหรับ API Calls
- ✅ Handle Loading State
- ✅ Handle Error State

---

## 🔗 Related Documentation

- [Authentication System Documentation](../../Authentication/AUTHENTICATION_SYSTEM.md) - เอกสารฉบับเต็มเกี่ยวกับระบบ Authentication
- [Backend API Documentation](../../../backend/README.md) - Backend API Documentation

---

**Last Updated**: 2026-01-29 (เพิ่ม Backend API Integration)
