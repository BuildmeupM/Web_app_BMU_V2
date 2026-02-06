# 🧪 Testing Backend Login - Step by Step Guide

## 📋 Overview

คู่มือการทดสอบ Backend Login API สำหรับ BMU Work Management System

## ✅ Prerequisites

ก่อนเริ่มทดสอบ ตรวจสอบว่า:

1. ✅ Database เชื่อมต่อได้แล้ว (`node scripts/test-db-connection.js` สำเร็จ)
2. ✅ มี users ใน database (28 users)
3. ✅ Backend dependencies ติดตั้งแล้ว (`npm install` ใน `backend/`)

## 🚀 Step-by-Step Testing

### Step 1: ตรวจสอบ Backend Dependencies

```bash
cd backend
npm install
```

**ตรวจสอบว่า dependencies ติดตั้งแล้ว**:
- `express`
- `mysql2`
- `bcrypt`
- `jsonwebtoken`
- `cors`
- `dotenv`

### Step 2: ตรวจสอบ Environment Variables

ตรวจสอบไฟล์ `backend/.env`:

```env
# Database Configuration
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
DB_USER=buildmeM
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management

# JWT Secret Key
JWT_SECRET=4b02249b6ab66162ed837857711eecbf1db5ca175fba3ce333ed720bdebb0684cf1a7483c36d12eecb1916fb2406cb1e203bd53666d943e44f48f25ca3ef83dc

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Step 3: รัน Backend Server

**Terminal 1** (Backend):

```bash
cd backend
npm run dev
```

**Expected Output**:
```
✅ Database connected successfully
🚀 Server is running on http://localhost:3001
📡 API Base URL: http://localhost:3001/api
🌐 CORS Origin: http://localhost:5173
📊 Environment: development
```

### Step 4: ทดสอบ Login API ด้วย Script

**Terminal 2** (ทดสอบ API):

```bash
cd backend
node scripts/test-login-api.js admin admin123
```

**Expected Output** (สำเร็จ):
```
🔍 Testing Login API...
📋 Configuration:
   API URL: http://localhost:3001/api/auth/login
   Username: admin
   Password: ********

✅ Login successful!
📊 Response:
   User ID: 1
   Username: admin
   Role: admin
   Employee ID: EMP001
   Nick Name: Admin
   Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Output** (ล้มเหลว - Invalid credentials):
```
❌ Login failed!
   Status: 401
   Message: Invalid username or password
```

**Expected Output** (ล้มเหลว - Server ไม่รัน):
```
❌ Connection failed!
   Error: connect ECONNREFUSED 127.0.0.1:3001

💡 Troubleshooting:
   1. ตรวจสอบว่า Backend server กำลังรันอยู่ (npm run dev)
   2. ตรวจสอบว่า server รันที่ port 3001
   3. ตรวจสอบ URL: http://localhost:3001/api/auth/login
```

### Step 5: ทดสอบด้วย cURL (Optional)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Step 6: ทดสอบ Frontend Login

**Terminal 3** (Frontend):

```bash
# ตรวจสอบว่า frontend มี .env file
# ถ้ายังไม่มี ให้สร้างไฟล์ .env ใน root directory:

VITE_API_BASE_URL=http://localhost:3001/api
```

**รัน Frontend**:

```bash
npm run dev
```

**ทดสอบ**:
1. เปิด browser: `http://localhost:5173/login`
2. กรอก:
   - Username: `admin`
   - Password: `admin123`
3. คลิก "เข้าสู่ระบบ"
4. ควร redirect ไป `/dashboard`

## 🧪 Test Cases

### Test Case 1: Valid Credentials ✅

- **Input**: `admin` / `admin123`
- **Expected**: Login สำเร็จ, ได้ token, redirect ไป dashboard

### Test Case 2: Invalid Username ❌

- **Input**: `wronguser` / `admin123`
- **Expected**: Error "Invalid username or password"

### Test Case 3: Invalid Password ❌

- **Input**: `admin` / `wrongpass`
- **Expected**: Error "Invalid username or password"

### Test Case 4: Empty Fields ❌

- **Input**: (empty) / (empty)
- **Expected**: Error "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" (Frontend validation)

### Test Case 5: Server Not Running ❌

- **Input**: Any credentials
- **Expected**: Connection error (Frontend) หรือ ECONNREFUSED (Script)

## 🔍 Troubleshooting

### Error: `ECONNREFUSED` หรือ `Connection failed`

**สาเหตุ**: Backend server ไม่ได้รัน

**วิธีแก้**:
1. ตรวจสอบว่า Terminal 1 รัน `npm run dev` แล้ว
2. ตรวจสอบว่า port 3001 ไม่ถูกใช้งานโดยโปรแกรมอื่น
3. ตรวจสอบว่า `.env` มี `PORT=3001`

### Error: `Invalid username or password`

**สาเหตุ**: Username หรือ password ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบว่า user มีอยู่ใน database
2. ตรวจสอบว่า password hash ถูกต้อง
3. ลองใช้ user อื่น (ดูจาก `Documentation/Database/migrations/003_insert_users_with_hashes.sql`)

### Error: `Database connection failed`

**สาเหตุ**: Database ไม่สามารถเชื่อมต่อได้

**วิธีแก้**:
1. รัน `node scripts/test-db-connection.js` เพื่อตรวจสอบ
2. ตรวจสอบ `.env` database configuration
3. ตรวจสอบว่า database server กำลังรันอยู่

### Error: CORS Error (Frontend)

**สาเหตุ**: CORS configuration ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบว่า `backend/.env` มี `CORS_ORIGIN=http://localhost:5173`
2. ตรวจสอบว่า Frontend รันที่ port 5173
3. Restart backend server หลังจากแก้ไข `.env`

## 📝 Test Users

จาก database migration (`003_insert_users_with_hashes.sql`):

| Username | Password | Role | Employee ID |
|----------|----------|------|--------------|
| admin | admin123 | admin | EMP001 |
| manager1 | manager123 | manager | EMP002 |
| user1 | user123 | user | EMP003 |

**หมายเหตุ**: Password ที่แสดงเป็น plain text แต่ใน database จะถูก hash ด้วย bcrypt

## ✅ Checklist

- [ ] Backend dependencies ติดตั้งแล้ว (`npm install`)
- [ ] Database เชื่อมต่อได้ (`test-db-connection.js` สำเร็จ)
- [ ] Backend server รันได้ (`npm run dev`)
- [ ] Login API ทดสอบได้ (`test-login-api.js` สำเร็จ)
- [ ] Frontend `.env` มี `VITE_API_BASE_URL`
- [ ] Frontend Login page เชื่อมต่อกับ Backend ได้
- [ ] Login สำเร็จและ redirect ไป dashboard

---

**Last Updated**: 2026-01-29
