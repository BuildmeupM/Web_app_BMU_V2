# ⚡ Quick Test Guide - Backend Login

## 🚀 Quick Start (3 ขั้นตอน)

### Step 1: รัน Backend Server

```bash
cd backend
npm run dev
```

**Expected Output**:
```
✅ Database connected successfully
🚀 Server is running on http://localhost:3001
```

### Step 2: ทดสอบ Login API

**เปิด Terminal ใหม่** (ให้ Backend server รันอยู่):

```bash
cd backend
node scripts/test-login-api.js admin admin123
```

**Expected Output**:
```
✅ Login successful!
📊 Response:
   User ID: ...
   Username: admin
   Role: admin
   Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: ทดสอบ Frontend Login

**ตรวจสอบ Frontend .env**:

สร้างไฟล์ `.env` ใน root directory (ถ้ายังไม่มี):

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

**รัน Frontend**:

```bash
npm run dev
```

**ทดสอบ**:
1. เปิด `http://localhost:5173/login`
2. Login ด้วย: `admin` / `admin123`
3. ควร redirect ไป `/dashboard`

## ✅ Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| Ekkacha.A | Ekkacha.A123 | admin |
| Panyakorn.plu | Panyakorn.plu123 | data_entry |

**หมายเหตุ**: Password format คือ `{username}123` สำหรับ users ส่วนใหญ่

## 🐛 Troubleshooting

### Backend ไม่รัน
- ตรวจสอบว่า `npm install` รันแล้ว
- ตรวจสอบว่า database เชื่อมต่อได้ (`node scripts/test-db-connection.js`)

### Login API ไม่ทำงาน
- ตรวจสอบว่า Backend server รันอยู่
- ตรวจสอบ port 3001 ไม่ถูกใช้งาน

### Frontend ไม่เชื่อมต่อ Backend
- ตรวจสอบว่า `.env` มี `VITE_API_BASE_URL=http://localhost:3001/api`
- Restart Frontend dev server หลังจากสร้าง/แก้ไข `.env`

---

**ดูรายละเอียดเพิ่มเติม**: `TESTING_LOGIN.md`
