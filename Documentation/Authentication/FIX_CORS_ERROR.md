# 🔧 Fix CORS Error

## 📋 Problem

**Error**: `Access to XMLHttpRequest at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy`

**สาเหตุ**: Backend CORS configuration ไม่ตรงกับ Frontend origin

- Frontend รันที่: `http://localhost:3000`
- Backend อนุญาต: `http://localhost:5173` (ไม่ตรงกัน!)

## ✅ Solution

### Step 1: แก้ไข Backend `.env`

แก้ไขไฟล์ `backend/.env`:

```env
# CORS Configuration
CORS_ORIGIN=http://localhost:3000  # ← เปลี่ยนจาก 5173 เป็น 3000
```

### Step 2: Restart Backend Server

**สำคัญ**: ต้อง restart Backend server หลังจากแก้ไข `.env`

1. หยุด Backend server (กด `Ctrl+C` ใน Terminal ที่รัน Backend)
2. รันใหม่:
```bash
cd backend
npm run dev
```

### Step 3: ทดสอบอีกครั้ง

1. Refresh browser ที่ `http://localhost:3000/login`
2. Login ด้วย `admin` / `admin123`
3. ควรไม่มี CORS error แล้ว

## 🔍 ตรวจสอบ CORS Configuration

### Backend (`backend/.env`)

```env
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`vite.config.ts`)

```typescript
server: {
  port: 3000,  // ← Port นี้ต้องตรงกับ CORS_ORIGIN
}
```

## ⚠️ ถ้ายังไม่ได้

### Option 1: อนุญาตหลาย Origins (Development)

แก้ไข `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}))
```

### Option 2: อนุญาตทุก Origin (Development Only!)

**⚠️ ใช้เฉพาะตอน Development เท่านั้น!**

```javascript
app.use(cors({
  origin: '*',  // ← อนุญาตทุก origin (ไม่ปลอดภัยสำหรับ production!)
  credentials: true,
}))
```

## 📝 Checklist

- [ ] แก้ไข `backend/.env` → `CORS_ORIGIN=http://localhost:3000`
- [ ] Restart Backend server
- [ ] Refresh browser
- [ ] ทดสอบ Login อีกครั้ง
- [ ] ตรวจสอบว่าไม่มี CORS error ใน console

---

**Last Updated**: 2026-01-29
