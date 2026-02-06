# 🔧 Troubleshooting: Blank Page Issue

## 📋 ปัญหา
หน้าเว็บแสดงเป็นสีขาวว่างเปล่า แม้ว่า Frontend Server (Vite) จะรันได้ปกติ

## 🔍 สาเหตุที่เป็นไปได้

### 1. Backend Server ไม่ได้รัน
**อาการ**: หน้าเว็บว่างเปล่า, Browser Console แสดง API errors

**วิธีแก้ไข**:
```bash
# ไปที่ backend directory
cd backend

# รัน backend server
npm run dev
```

**ตรวจสอบ**: Backend ควรรันที่ `http://localhost:3001`

---

### 2. JavaScript Error ใน Browser Console
**อาการ**: หน้าเว็บว่างเปล่า, มี error ใน Browser Console

**วิธีตรวจสอบ**:
1. เปิด Browser Developer Tools (F12)
2. ไปที่แท็บ **Console**
3. ดูว่ามี error อะไร (สีแดง)

**วิธีแก้ไข**:
- แก้ไข error ตามที่แสดงใน Console
- ตรวจสอบว่า component ที่ import มีอยู่จริง
- ตรวจสอบว่า API endpoint ถูกต้อง

---

### 3. ProtectedRoute Redirect Loop
**อาการ**: หน้าเว็บว่างเปล่า, Network tab แสดง redirect loop

**วิธีแก้ไข**:
- ลองเข้า `/login` โดยตรง: `http://localhost:3000/login`
- ตรวจสอบว่า `authStore` ทำงานถูกต้อง
- ตรวจสอบว่า token ถูกเก็บใน localStorage หรือไม่

---

### 4. CORS Error
**อาการ**: หน้าเว็บว่างเปล่า, Console แสดง CORS error

**วิธีแก้ไข**:
1. ตรวจสอบ `backend/.env`:
   ```env
   CORS_ORIGIN=http://localhost:3000
   ```
2. Restart backend server

---

## 🚀 ขั้นตอนการตรวจสอบ

### Step 1: ตรวจสอบ Backend Server
```bash
# Terminal 1: Backend
cd backend
npm run dev

# ควรเห็น:
# 🚀 Server is running on http://localhost:3001
# 📡 API Base URL: http://localhost:3001/api
```

### Step 2: ตรวจสอบ Frontend Server
```bash
# Terminal 2: Frontend
npm run dev

# ควรเห็น:
# ➜  Local:   http://localhost:3000/
```

### Step 3: เปิด Browser Console
1. เปิด `http://localhost:3000`
2. กด **F12** เพื่อเปิด Developer Tools
3. ไปที่แท็บ **Console**
4. ดูว่ามี error อะไร

### Step 4: ตรวจสอบ Network Tab
1. ไปที่แท็บ **Network** ใน Developer Tools
2. Refresh หน้าเว็บ (F5)
3. ดูว่ามี API calls อะไรบ้าง
4. ตรวจสอบว่า API calls สำเร็จหรือไม่

### Step 5: ลองเข้า Login Page โดยตรง
```
http://localhost:3000/login
```

ถ้า Login page แสดง แสดงว่า routing ทำงาน แต่ ProtectedRoute อาจมีปัญหา

---

## 🔧 Quick Fixes

### Fix 1: Restart ทั้ง Backend และ Frontend
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (root directory)
npm run dev
```

### Fix 2: Clear Browser Cache
1. กด **Ctrl + Shift + Delete**
2. เลือก "Cached images and files"
3. Clear data
4. Refresh หน้าเว็บ (Ctrl + F5)

### Fix 3: Clear localStorage
1. เปิด Browser Console (F12)
2. ไปที่แท็บ **Console**
3. พิมพ์:
   ```javascript
   localStorage.clear()
   ```
4. Refresh หน้าเว็บ

### Fix 4: ตรวจสอบ Environment Variables
**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

**Backend** (`backend/.env`):
```env
CORS_ORIGIN=http://localhost:3000
```

---

## 📝 Common Errors และ Solutions

### Error: "Failed to fetch" หรือ "Network Error"
**สาเหตุ**: Backend ไม่ได้รัน

**แก้ไข**: รัน backend server

---

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**สาเหตุ**: CORS configuration ไม่ถูกต้อง

**แก้ไข**: 
1. ตรวจสอบ `backend/.env`: `CORS_ORIGIN=http://localhost:3000`
2. Restart backend server

---

### Error: "Cannot read property 'role' of null"
**สาเหตุ**: `user` เป็น `null` ใน `authStore`

**แก้ไข**: 
- ตรวจสอบว่า `ProtectedRoute` redirect ไป `/login` เมื่อ `isAuthenticated` เป็น `false`
- ลอง login ใหม่

---

### Error: "Module not found" หรือ "Cannot resolve module"
**สาเหตุ**: Import path ผิด หรือ component ไม่มี

**แก้ไข**: 
- ตรวจสอบว่าไฟล์ที่ import มีอยู่จริง
- ตรวจสอบ import path ว่าถูกต้อง

---

## ✅ Checklist

- [ ] Backend server รันอยู่ที่ `http://localhost:3001`
- [ ] Frontend server รันอยู่ที่ `http://localhost:3000`
- [ ] ไม่มี error ใน Browser Console
- [ ] API calls ใน Network tab สำเร็จ (status 200)
- [ ] CORS configuration ถูกต้อง
- [ ] Environment variables ถูกต้อง
- [ ] ลองเข้า `/login` โดยตรงได้

---

**Last Updated**: 2026-01-29
