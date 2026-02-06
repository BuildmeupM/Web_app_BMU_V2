# 🚀 BMU Work Management System - Backend API

## 📋 Overview

Backend API Server สำหรับระบบ BMU Work Management System  
ใช้ **Node.js** + **Express.js** + **MySQL/MariaDB**

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MySQL/MariaDB (mysql2)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **CORS**: cors

## 📦 Installation

### 1. ติดตั้ง Dependencies

```bash
cd backend
npm install
```

### 2. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env`:

```bash
cp .env.example .env
```

**สร้าง JWT Secret Key ที่ปลอดภัย**:

```bash
# วิธีที่ 1: ใช้ script (แนะนำ)
node scripts/generate-jwt-secret.js

# วิธีที่ 2: ใช้ Node.js command
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# วิธีที่ 3: ใช้ OpenSSL (ถ้ามี)
openssl rand -hex 64
```

คัดลอกค่า JWT_SECRET ที่ได้ไปใส่ในไฟล์ `.env`

แก้ไขไฟล์ `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bmu_work_management

# JWT Secret Key (ใช้ script generate-jwt-secret.js เพื่อสร้างค่าใหม่ที่ปลอดภัย)
# รัน: node scripts/generate-jwt-secret.js
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. ตรวจสอบ Database

- ตรวจสอบว่า Database `bmu_work_management` สร้างแล้ว
- ตรวจสอบว่าตาราง `users` มีข้อมูลแล้ว (รัน migration 001 และ 003)

## 🚀 Running the Server

### Development Mode

```bash
npm run dev
```

หรือ

```bash
node --watch server.js
```

### Production Mode

```bash
npm start
```

หรือ

```bash
node server.js
```

Server จะรันที่ `http://localhost:3001`

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/login`
Login endpoint

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
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

#### POST `/api/auth/logout`
Logout endpoint (ต้องมี Authorization header)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET `/api/auth/me`
Get current user information (ต้องมี Authorization header)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@bmu.local",
    "employee_id": "AC00010",
    "nick_name": "เอ็ม",
    "role": "admin",
    "name": "ยุทธนา (เอ็ม)"
  }
}
```

### Health Check

#### GET `/health`
ตรวจสอบสถานะ server

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-29T10:00:00.000Z"
}
```

## 🔐 Authentication Flow

### 1. Login Flow

```
1. User กรอก username และ password ใน Frontend
2. Frontend ส่ง POST request ไปที่ /api/auth/login
3. Backend:
   - ค้นหา user จาก database ด้วย username
   - ตรวจสอบ password ด้วย bcrypt.compare()
   - สร้าง JWT token
   - อัพเดท last_login_at
   - ส่ง user data และ token กลับไป
4. Frontend:
   - เก็บ token ใน localStorage (ผ่าน zustand persist)
   - เก็บ user data ใน store
   - Redirect ไปหน้า Dashboard
```

### 2. Protected Routes Flow

```
1. User พยายามเข้าถึง protected route
2. Frontend:
   - ส่ง request พร้อม Authorization header (Bearer token)
3. Backend Middleware (authenticateToken):
   - Verify JWT token
   - ดึงข้อมูล user จาก database
   - ตรวจสอบสถานะ user (active/inactive)
   - เพิ่ม user ข้อมูลใน req.user
4. Route Handler:
   - ใช้ req.user เพื่อเข้าถึงข้อมูล user
```

### 3. Logout Flow

```
1. User คลิกปุ่ม Logout
2. Frontend:
   - เรียก POST /api/auth/logout (optional)
   - ลบ token และ user data จาก store
   - Redirect ไปหน้า Login
```

## 🔒 Security Features

### 1. Password Hashing
- ใช้ **bcrypt** สำหรับ hash password
- Cost factor: 10 (default)
- Password ไม่ถูกส่งกลับไปใน response

### 2. JWT Token
- ใช้ **jsonwebtoken** สำหรับสร้างและ verify token
- Token หมดอายุใน 7 วัน (สามารถปรับได้ใน `.env`)
- Token ถูกส่งผ่าน Authorization header

### 3. CORS
- ตั้งค่า CORS เพื่ออนุญาตเฉพาะ origin ที่กำหนด
- Default: `http://localhost:5173` (Vite dev server)

### 4. Input Validation
- ตรวจสอบ username และ password ก่อน query database
- ตรวจสอบสถานะ user (active/inactive)

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration และ connection pool
├── middleware/
│   └── auth.js              # Authentication middleware (JWT verification)
├── routes/
│   └── auth.js              # Authentication routes (login, logout, me)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Dependencies และ scripts
├── README.md                # Documentation (ไฟล์นี้)
└── server.js                # Main server file
```

## 🧪 Testing API

### ใช้ cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get Current User (ต้องใช้ token จาก login)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### ใช้ Postman

1. Import collection จาก `backend/postman_collection.json` (ถ้ามี)
2. หรือสร้าง request ใหม่:
   - Method: POST
   - URL: `http://localhost:3001/api/auth/login`
   - Body (JSON): `{"username":"admin","password":"admin123"}`
   - Headers: `Content-Type: application/json`

## 🐛 Troubleshooting

### Database Connection Error

**Error**: `Database connection failed`

**Solutions**:
1. ตรวจสอบว่า MySQL/MariaDB กำลังรันอยู่
2. ตรวจสอบ credentials ใน `.env`
3. ตรวจสอบว่า database `bmu_work_management` สร้างแล้ว
4. ตรวจสอบว่า table `users` มีข้อมูลแล้ว

### JWT Token Error

**Error**: `Invalid token` หรือ `Token expired`

**Solutions**:
1. Login ใหม่เพื่อรับ token ใหม่
2. ตรวจสอบว่า JWT_SECRET ใน `.env` ถูกต้อง
3. ตรวจสอบว่า token ถูกส่งใน Authorization header

### CORS Error

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
1. ตรวจสอบว่า CORS_ORIGIN ใน `.env` ตรงกับ Frontend URL
2. ตรวจสอบว่า Frontend ส่ง request ไปที่ URL ที่ถูกต้อง

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `bmu_work_management` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:5173` |

## 🔄 Next Steps

1. ✅ Authentication API (Login, Logout, Get Current User)
2. ⏳ Employee Management API
3. ⏳ Leave Management API
4. ⏳ Tax Management API
5. ⏳ Document Management API

---

**Last Updated**: 2026-01-29
