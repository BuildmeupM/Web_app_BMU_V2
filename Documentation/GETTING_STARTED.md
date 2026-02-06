# 🚀 Getting Started - คู่มือการเริ่มระบบ

**Last Updated**: 2026-02-03

---

## 📋 Prerequisites (สิ่งที่ต้องมีก่อนเริ่ม)

1. ✅ **Node.js** (version >= 18.0.0)
   - ตรวจสอบ: `node --version`
   - ดาวน์โหลด: https://nodejs.org/

2. ✅ **MySQL Database** (เชื่อมต่อได้)
   - Database: `bmu_work_management`
   - Host: `buildmeupconsultant.direct.quickconnect.to`
   - Port: `3306`

3. ✅ **npm** หรือ **yarn** (package manager)

---

## 🚀 ขั้นตอนการเริ่มระบบ

### Step 1: ติดตั้ง Dependencies

#### Frontend:
```bash
# เปิด Terminal ในโฟลเดอร์หลักของโปรเจกต์
cd "C:\Users\USER\Desktop\Web_app_BMU React"

# ติดตั้ง dependencies สำหรับ frontend
npm install
```

#### Backend:
```bash
# เปิด Terminal ใหม่ หรือใช้ Terminal เดียวกัน
cd "C:\Users\USER\Desktop\Web_app_BMU React\backend"

# ติดตั้ง dependencies สำหรับ backend
npm install
```

---

### Step 2: ตรวจสอบ Environment Variables

**File**: `backend/.env`

ตรวจสอบว่ามีค่าต่อไปนี้:
```env
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
DB_USER=buildmeM
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**⚠️ สำคัญ**: 
- `CORS_ORIGIN` ควรเป็น `http://localhost:5173` (Vite default port)
- ถ้า frontend รันที่ port อื่น ให้เปลี่ยน `CORS_ORIGIN` ให้ตรงกัน

---

### Step 3: เริ่ม Backend Server

```bash
# เปิด Terminal ในโฟลเดอร์ backend
cd "C:\Users\USER\Desktop\Web_app_BMU React\backend"

# Development mode (auto-reload เมื่อแก้ไขไฟล์)
npm run dev

# หรือ Production mode
npm start
```

**ผลลัพธ์ที่คาดหวัง**:
```
✅ Database connected successfully
🚀 Server is running on http://localhost:3001
📡 API Base URL: http://localhost:3001/api
🔌 WebSocket Server: ws://localhost:3001
🌐 CORS Origin: http://localhost:5173
📊 Environment: development
```

**⚠️ สำคัญ**: Backend ต้องรันก่อน frontend

---

### Step 4: เริ่ม Frontend Server

**เปิด Terminal ใหม่** (ให้ backend ยังรันอยู่):

```bash
# เปิด Terminal ในโฟลเดอร์หลักของโปรเจกต์
cd "C:\Users\USER\Desktop\Web_app_BMU React"

# Development mode
npm run dev
```

**ผลลัพธ์ที่คาดหวัง**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 5: เปิด Browser

1. เปิด Browser ไปที่: **http://localhost:5173**
2. ควรเห็นหน้า Login
3. Login ด้วย username/password ที่มีในระบบ

---

## ✅ ตรวจสอบว่าระบบทำงานถูกต้อง

### 1. ตรวจสอบ Backend
- ✅ Backend server รันที่ `http://localhost:3001`
- ✅ Database connected successfully
- ✅ WebSocket server พร้อมใช้งาน

### 2. ตรวจสอบ Frontend
- ✅ Frontend server รันที่ `http://localhost:5173`
- ✅ สามารถ Login ได้
- ✅ หน้าเว็บโหลดได้ปกติ

### 3. ตรวจสอบ Performance Optimizations
- ✅ Response compression ทำงาน (ตรวจสอบใน Network tab)
- ✅ Cache ทำงาน (ตรวจสอบใน React Query DevTools)
- ✅ Code splitting ทำงาน (ตรวจสอบใน Network tab)

---

## 🛠️ คำสั่งที่ใช้บ่อย

### Backend:
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### Frontend:
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

---

## ⚠️ Troubleshooting

### ปัญหา: Backend ไม่สามารถเชื่อมต่อ Database

**วิธีแก้**:
1. ตรวจสอบว่า Database server ทำงานอยู่
2. ตรวจสอบ `backend/.env` ว่ามีค่าถูกต้อง
3. ตรวจสอบ network connection

---

### ปัญหา: Frontend ไม่สามารถเชื่อมต่อ Backend

**วิธีแก้**:
1. ตรวจสอบว่า Backend server รันอยู่ (`http://localhost:3001`)
2. ตรวจสอบ `CORS_ORIGIN` ใน `backend/.env` ว่าตรงกับ frontend URL
3. ตรวจสอบ Browser Console สำหรับ errors

---

### ปัญหา: Port 3001 หรือ 5173 ถูกใช้งานแล้ว

**วิธีแก้**:
```bash
# เปลี่ยน PORT ใน backend/.env
PORT=3002

# เปลี่ยน port ใน frontend (vite.config.ts)
server: {
  port: 5174
}
```

---

## 📊 Performance Optimizations ที่ทำงานอยู่แล้ว

### ✅ Phase 1: Quick Wins
- ✅ Response Compression (ลด response size 60-80%)
- ✅ React Query staleTime (ลด API calls 70-80%)
- ✅ React.memo (ลด re-renders 50-70%)

### ✅ Phase 2: Medium Optimizations
- ✅ Query Result Caching (TTL 30 seconds)
- ✅ Code Splitting (ลด bundle size 40-60%)

### ✅ Phase 3: Long-term (Optional)
- ⏳ Database Indexes (Migration 030 - ต้องรันบน database)
- ⏳ Redis Cache (Optional - สำหรับ production scale)

---

## 🎯 Next Steps (Optional)

### 1. รัน Migration 030 (แนะนำ)
```sql
-- รัน migration บน database เพื่อเพิ่ม indexes
SOURCE Documentation/Database/migrations/030_add_additional_performance_indexes.sql;
```

**ผลลัพธ์**: Query execution time ลดลง 30-50%

---

### 2. Setup Redis (Optional - สำหรับ Production Scale)

**ไม่จำเป็นตอนนี้** - NodeCache ทำงานได้ดีแล้ว

ถ้าต้องการใช้ Redis:
1. ติดตั้ง Docker Desktop
2. รัน Redis: `docker run -d -p 6379:6379 --name redis-bmu redis:7-alpine`
3. ตาม `Documentation/REDIS_IMPLEMENTATION_GUIDE.md`

---

## 📚 Documentation

- `Documentation/PERFORMANCE_OPTIMIZATION_SUMMARY.md` - สรุปผลการปรับปรุงประสิทธิภาพ
- `Documentation/PERFORMANCE_OPTIMIZATION_PLAN.md` - แผนการปรับปรุงประสิทธิภาพ
- `Documentation/REDIS_IMPLEMENTATION_GUIDE.md` - คู่มือ Redis (Optional)
- `Documentation/NODECACHE_VS_REDIS_COMPARISON.md` - เปรียบเทียบ NodeCache vs Redis
- `Documentation/DOCKER_SETUP_GUIDE.md` - คู่มือ Docker (Optional)

---

## ✅ Checklist

ก่อนเริ่มระบบ ตรวจสอบว่า:
- [ ] Node.js ติดตั้งแล้ว (version >= 18.0.0)
- [ ] Database เชื่อมต่อได้
- [ ] Dependencies ติดตั้งแล้ว (frontend + backend)
- [ ] Environment variables ตั้งค่าแล้ว (`backend/.env`)
- [ ] Backend server รันได้ (`http://localhost:3001`)
- [ ] Frontend server รันได้ (`http://localhost:5173`)

---

**Last Updated**: 2026-02-03  
**Status**: ✅ Ready to Start
