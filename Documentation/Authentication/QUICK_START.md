# 🚀 Authentication System - Quick Start Guide

## 📋 Prerequisites

- ✅ Node.js (v18+)
- ✅ MySQL/MariaDB Database
- ✅ Database `bmu_work_management` สร้างแล้ว
- ✅ Table `users` มีข้อมูลแล้ว (รัน migrations 001 และ 003)

## ⚡ Quick Setup (5 นาที)

### Step 1: Setup Backend

```bash
# 1. ไปที่โฟลเดอร์ backend
cd backend

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env
cp .env.example .env

# 4. สร้าง JWT Secret Key ที่ปลอดภัย
node scripts/generate-jwt-secret.js
# คัดลอกค่า JWT_SECRET ที่ได้

# 5. แก้ไข .env (ตั้งค่า database credentials และ JWT_SECRET)
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=bmu_work_management
# JWT_SECRET=<paste-generated-secret-here>

# 5. รัน server
npm run dev
```

✅ Server จะรันที่ `http://localhost:3001`

### Step 2: Setup Frontend

```bash
# 1. กลับไปที่ root directory
cd ..

# 2. สร้างไฟล์ .env (ถ้ายังไม่มี)
# VITE_API_BASE_URL=http://localhost:3001/api

# 3. รัน Frontend (ถ้ายังไม่ได้รัน)
npm run dev
```

✅ Frontend จะรันที่ `http://localhost:5173`

### Step 3: Test Login

1. เปิด browser ไปที่ `http://localhost:5173/login`
2. กรอก:
   - **Username**: `admin`
   - **Password**: `admin123`
3. คลิก "เข้าสู่ระบบ"
4. ✅ ควร redirect ไป Dashboard

## 🧪 Test Credentials

จากข้อมูล users ที่ insert แล้ว:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `Ekkacha.A` | `#BMU.adminA` | admin |
| `Panyakorn.plu` | `#BMU.1136` | data_entry |
| `Suthasinee.pha` | `#BMU.1744` | data_entry_and_service |
| `Supaporn.too` | `#BMU.1744` | audit |
| `TTOP007` | `#BMU.1108` | audit |
| `Sawitree.sri` | `#BMU.2931` | service |

## 🔍 Troubleshooting

### Backend ไม่ start

**Error**: `Database connection failed`

**Solution**:
1. ตรวจสอบว่า MySQL/MariaDB กำลังรันอยู่
2. ตรวจสอบ credentials ใน `.env`
3. ตรวจสอบว่า database `bmu_work_management` สร้างแล้ว

### Frontend ไม่สามารถ login ได้

**Error**: `Network Error` หรือ `CORS Error`

**Solution**:
1. ตรวจสอบว่า Backend server กำลังรันอยู่ (`http://localhost:3001`)
2. ตรวจสอบว่า `VITE_API_BASE_URL` ใน `.env` ถูกต้อง
3. ตรวจสอบ CORS settings ใน Backend `.env`

### Login แต่ได้ error

**Error**: `Invalid username or password`

**Solution**:
1. ตรวจสอบว่า username และ password ถูกต้อง
2. ตรวจสอบว่า user มีสถานะ `active` ใน database
3. ตรวจสอบ password hash ใน database (ต้องเป็น bcrypt hash)

## 📚 Next Steps

หลังจาก Login สำเร็จแล้ว:

1. ✅ ตรวจสอบว่า token ถูกเก็บใน localStorage
2. ✅ ตรวจสอบว่า user data ถูกเก็บใน store
3. ✅ ทดสอบ Protected Routes
4. ✅ ทดสอบ Logout

## 📖 Full Documentation

- [Authentication System Documentation](./AUTHENTICATION_SYSTEM.md) - เอกสารฉบับเต็ม
- [Backend API Documentation](../../backend/README.md) - Backend API docs

---

**Last Updated**: 2026-01-29
