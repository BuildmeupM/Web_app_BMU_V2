# 🔧 Frontend Environment Variables Setup

## 📋 Overview

คู่มือการตั้งค่า Frontend Environment Variables สำหรับ BMU Work Management System

## 🎯 ทำไมต้องมีไฟล์ `.env`?

ไฟล์ `.env` ใช้เก็บ configuration ที่แตกต่างกันระหว่าง development และ production:

- **Development**: `VITE_API_BASE_URL=http://localhost:3001/api`
- **Production**: `VITE_API_BASE_URL=https://api.yourdomain.com/api`

## ✅ Step-by-Step Setup

### Step 1: สร้างไฟล์ `.env`

**วิธีที่ 1: คัดลอกจาก `.env.example`** (แนะนำ):

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Windows CMD
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

**วิธีที่ 2: สร้างไฟล์ใหม่**:

สร้างไฟล์ `.env` ใน root directory (ระดับเดียวกับ `package.json`) และเพิ่ม:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Add other environment variables as needed
```

### Step 2: ตรวจสอบไฟล์ `.env`

ไฟล์ `.env` ควรอยู่ใน root directory:

```
Web_app_BMU React/
├── .env              ← ไฟล์นี้
├── .env.example
├── package.json
├── src/
└── backend/
```

### Step 3: Restart Frontend Dev Server

**สำคัญ**: หลังจากสร้างหรือแก้ไขไฟล์ `.env` ต้อง restart Frontend dev server:

1. หยุด Frontend dev server (กด `Ctrl+C`)
2. รันใหม่:
```bash
npm run dev
```

## 🔍 ตรวจสอบว่า Frontend อ่าน `.env` ได้หรือไม่

### วิธีที่ 1: ดูใน Browser Console

1. เปิด Browser DevTools (F12)
2. ไปที่ Console tab
3. พิมพ์:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

ควรเห็น: `http://localhost:3001/api`

### วิธีที่ 2: ดูใน Network Tab

1. เปิด Browser DevTools (F12)
2. ไปที่ Network tab
3. Login ในหน้า Login
4. ดู Request URL ควรเป็น: `http://localhost:3001/api/auth/login`

## ⚠️ ข้อควรระวัง

### 1. ไฟล์ `.env` ไม่ถูก Git Track

ไฟล์ `.env` ถูกเพิ่มใน `.gitignore` แล้ว เพื่อป้องกันไม่ให้ commit sensitive data

### 2. ใช้ `VITE_` Prefix

ใน Vite, environment variables ต้องมี prefix `VITE_` เพื่อให้ Frontend เข้าถึงได้:

```env
# ✅ ถูกต้อง
VITE_API_BASE_URL=http://localhost:3001/api

# ❌ ผิด (Frontend จะไม่เห็น)
API_BASE_URL=http://localhost:3001/api
```

### 3. Restart Dev Server หลังแก้ไข `.env`

Vite จะอ่าน `.env` ตอนเริ่มต้นเท่านั้น ต้อง restart dev server หลังจากแก้ไข

### 4. Fallback Value

ถ้าไม่มีไฟล์ `.env`, Frontend จะใช้ fallback value จาก `src/services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
```

## 📝 Environment Variables ที่ใช้

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001/api` | `https://api.example.com/api` |

## 🚀 Production Setup

สำหรับ Production, สร้างไฟล์ `.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Vite จะใช้ไฟล์นี้เมื่อ build ด้วย `npm run build`

## ✅ Checklist

- [ ] สร้างไฟล์ `.env` จาก `.env.example`
- [ ] ตั้งค่า `VITE_API_BASE_URL=http://localhost:3001/api`
- [ ] Restart Frontend dev server
- [ ] ทดสอบ Login ว่าทำงานได้
- [ ] ตรวจสอบ Network tab ว่าเรียก API ที่ถูกต้อง

---

**Last Updated**: 2026-01-29
