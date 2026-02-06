# 📡 Authentication API Reference - BMU Work Management System

## 📋 Overview

เอกสารอ้างอิง API สำหรับระบบ Authentication

**Base URL**: `http://localhost:3001/api` (Development)

## 🔐 Authentication Endpoints

### POST `/api/auth/login`

Login และรับ JWT token

**Request**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "89d72d83-fd20-11f0-bab6-001132f3629c",
      "username": "admin",
      "email": "admin@bmu.local",
      "employee_id": "AC00010",
      "nick_name": "เอ็ม",
      "role": "admin",
      "name": "ยุทธนา (เอ็ม)"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

**Response (403 Forbidden)**:
```json
{
  "success": false,
  "message": "User account is inactive"
}
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Username and password are required"
}
```

---

### POST `/api/auth/logout`

Logout (client-side จะลบ token เอง)

**Request**:
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Access token is required"
}
```

---

### GET `/api/auth/me`

ดึงข้อมูล user ปัจจุบัน

**Request**:
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "89d72d83-fd20-11f0-bab6-001132f3629c",
    "username": "admin",
    "email": "admin@bmu.local",
    "employee_id": "AC00010",
    "nick_name": "เอ็ม",
    "role": "admin",
    "name": "ยุทธนา (เอ็ม)"
  }
}
```

**Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Access token is required"
}
```

**Response (401 Unauthorized - Invalid Token)**:
```json
{
  "success": false,
  "message": "Invalid token"
}
```

**Response (401 Unauthorized - Token Expired)**:
```json
{
  "success": false,
  "message": "Token expired"
}
```

---

## 🔒 Authentication Headers

ทุก API endpoint ที่ต้อง authentication ต้องส่ง header:

```
Authorization: Bearer <jwt-token>
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## 🧪 Example Usage

### cURL Examples

**Login**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Current User**:
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Logout**:
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### JavaScript/TypeScript Examples

**Login**:
```typescript
import axios from 'axios'

const response = await axios.post('http://localhost:3001/api/auth/login', {
  username: 'admin',
  password: 'admin123'
})

const { user, token } = response.data.data
localStorage.setItem('token', token)
```

**Get Current User**:
```typescript
const response = await axios.get('http://localhost:3001/api/auth/me', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
})

const user = response.data.data
```

## 🔐 JWT Token

### Token Structure

JWT token ประกอบด้วย 3 ส่วน:
1. **Header**: Algorithm และ token type
2. **Payload**: User data (userId, username, role)
3. **Signature**: Signature สำหรับ verify

### Token Payload

```json
{
  "userId": "89d72d83-fd20-11f0-bab6-001132f3629c",
  "username": "admin",
  "role": "admin",
  "iat": 1706524800,
  "exp": 1707129600
}
```

### Token Expiration

- Default: 7 วัน
- สามารถปรับได้ใน `.env`: `JWT_EXPIRES_IN=7d`

## 🚨 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (Missing/invalid input) |
| 401 | Unauthorized (Invalid/missing token) |
| 403 | Forbidden (Inactive user) |
| 404 | Not Found (Route not found) |
| 500 | Internal Server Error |

## 📝 Notes

- Token ต้องส่งใน Authorization header ทุกครั้งที่เรียก protected endpoints
- Token หมดอายุใน 7 วัน (default)
- Password ไม่ถูกส่งกลับใน response
- User status ต้องเป็น `active` ถึงจะ login ได้

---

**Last Updated**: 2026-01-29
