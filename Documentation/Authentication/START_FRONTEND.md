# 🚀 How to Start Frontend Dev Server

## 📋 Problem

Error: `ERR_CONNECTION_REFUSED` เมื่อเปิด `http://localhost:5173/login`

**สาเหตุ**: Frontend dev server ไม่ได้รันอยู่

## ✅ Solution

### Step 1: เปิด Terminal ใน Root Directory

เปิด Terminal/PowerShell ใน root directory ของโปรเจกต์:

```
Web_app_BMU React/
├── package.json      ← ต้องอยู่ที่นี้
├── vite.config.ts
├── src/
└── backend/
```

### Step 2: รัน Frontend Dev Server

```bash
npm run dev
```

**Expected Output**:
```
  VITE v5.4.2  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 3: เปิด Browser

**สำคัญ**: ดูที่ port ที่แสดงใน Terminal!

- ถ้า `vite.config.ts` มี `port: 3000` → เปิด `http://localhost:3000/login`
- ถ้าไม่มี port ใน config → เปิด `http://localhost:5173/login` (default Vite port)

## 🔍 ตรวจสอบ Port Configuration

ดูไฟล์ `vite.config.ts`:

```typescript
server: {
  port: 3000,  // ← Port นี้
  open: true,
}
```

ถ้ามี port กำหนดไว้ → ใช้ port นั้น  
ถ้าไม่มี → ใช้ default port 5173

## ⚠️ Troubleshooting

### Error: `npm: command not found`

**สาเหตุ**: Node.js/npm ไม่ได้ติดตั้ง

**วิธีแก้**:
1. ติดตั้ง Node.js จาก https://nodejs.org/
2. Restart Terminal
3. รัน `npm --version` เพื่อตรวจสอบ

### Error: `Cannot find module`

**สาเหตุ**: Dependencies ยังไม่ได้ติดตั้ง

**วิธีแก้**:
```bash
npm install
```

### Port ถูกใช้งานแล้ว

**Error**: `Port 3000 is already in use`

**วิธีแก้**:
1. หยุด process ที่ใช้ port นั้น
2. หรือเปลี่ยน port ใน `vite.config.ts`:
```typescript
server: {
  port: 5173,  // เปลี่ยนเป็น port อื่น
}
```

### Frontend รันแล้วแต่ยังเชื่อมต่อไม่ได้

**ตรวจสอบ**:
1. ดู Terminal output ว่าแสดง URL อะไร
2. ตรวจสอบว่า URL ใน browser ตรงกับที่แสดงใน Terminal
3. ตรวจสอบว่า Backend server รันอยู่ (port 3001)

## 📝 Quick Checklist

- [ ] เปิด Terminal ใน root directory
- [ ] รัน `npm run dev`
- [ ] ดู port ที่แสดงใน Terminal
- [ ] เปิด browser ที่ URL ที่ถูกต้อง (เช่น `http://localhost:3000/login`)
- [ ] ตรวจสอบว่า Backend server รันอยู่ (`http://localhost:3001`)

## 🎯 Typical Workflow

**Terminal 1** (Backend):
```bash
cd backend
npm run dev
```

**Terminal 2** (Frontend):
```bash
npm run dev
```

**Browser**:
- เปิด `http://localhost:3000/login` (หรือ port ที่แสดงใน Terminal)

---

**Last Updated**: 2026-01-29
