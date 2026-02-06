# คู่มือการตั้งค่าให้เข้าถึง Frontend และ Backend ผ่าน Network IP

## 📋 ภาพรวม

คู่มือนี้จะอธิบายวิธีการตั้งค่าให้ Frontend และ Backend สามารถเข้าถึงได้ผ่าน IP address จากเครื่องอื่นในเครือข่ายเดียวกัน

## 🔧 การตั้งค่า Backend

### 1. อัปเดตไฟล์ `.env` ในโฟลเดอร์ `backend/`

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0  # ใช้ 0.0.0.0 เพื่อให้เข้าถึงได้จากทุก IP ในเครือข่าย
NODE_ENV=development

# CORS Configuration
# ถ้า Frontend จะรันที่ IP อื่น ต้องเปลี่ยนเป็น IP ของ Frontend server
CORS_ORIGIN=http://YOUR_FRONTEND_IP:3000
# หรือถ้า Frontend อยู่ที่ localhost:
# CORS_ORIGIN=http://localhost:3000
```

### 2. Restart Backend Server

```bash
cd backend
npm start
# หรือ
node server.js
```

### 3. ตรวจสอบว่า Backend ทำงาน

เมื่อ restart แล้ว จะเห็น log แบบนี้:
```
🚀 Server is running on http://localhost:3001
🌐 Server is accessible from network: http://YOUR_IP_ADDRESS:3001
   💡 Replace YOUR_IP_ADDRESS with your actual IP address (e.g., 192.168.1.100)
📡 API Base URL: http://localhost:3001/api
```

## 🎨 การตั้งค่า Frontend

### 1. อัปเดตไฟล์ `.env` ในโฟลเดอร์ root

```env
# API Configuration
# เปลี่ยน localhost เป็น IP ของ Backend server
VITE_API_BASE_URL=http://YOUR_BACKEND_IP:3001/api

# Backend URL for WebSocket (Socket.io)
VITE_BACKEND_URL=http://YOUR_BACKEND_IP:3001
```

**ตัวอย่าง:**
```env
# ถ้า Backend อยู่ที่ IP 192.168.1.100
VITE_API_BASE_URL=http://192.168.1.100:3001/api
VITE_BACKEND_URL=http://192.168.1.100:3001
```

### 2. Restart Frontend Development Server

```bash
npm run dev
```

### 3. ตรวจสอบว่า Frontend ทำงาน

เมื่อ restart แล้ว จะเห็น log แบบนี้:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://YOUR_IP_ADDRESS:3000/
```

## 🔍 หา IP Address ของเครื่อง

### Windows:
```cmd
ipconfig
```
ดูที่ **IPv4 Address** (เช่น `192.168.1.100`)

### Mac/Linux:
```bash
ifconfig
# หรือ
ip addr
```
ดูที่ **inet** address (เช่น `192.168.1.100`)

## 📱 การเข้าถึงจากเครื่องอื่น

### Frontend:
```
http://YOUR_FRONTEND_IP:3000
```
ตัวอย่าง: `http://192.168.1.100:3000`

### Backend API:
```
http://YOUR_BACKEND_IP:3001/api
```
ตัวอย่าง: `http://192.168.1.100:3001/api`

## ⚠️ หมายเหตุสำคัญ

### 1. Firewall Settings
- **Windows**: ต้องอนุญาตให้ port 3000 และ 3001 ผ่าน Windows Firewall
  - ไปที่: Control Panel > Windows Defender Firewall > Advanced Settings
  - สร้าง Inbound Rule สำหรับ port 3000 และ 3001
  
- **Mac**: ไปที่ System Preferences > Security & Privacy > Firewall > Firewall Options
  - อนุญาตให้ Node.js ผ่าน firewall

- **Linux**: ใช้ `ufw` หรือ `iptables`:
  ```bash
  sudo ufw allow 3000
  sudo ufw allow 3001
  ```

### 2. CORS Configuration
- Backend ต้องอนุญาตให้ Frontend IP เข้าถึงได้
- อัปเดต `CORS_ORIGIN` ใน `backend/.env` ให้ตรงกับ Frontend URL

### 3. Security Considerations
- การใช้ `0.0.0.0` จะทำให้ทุกคนในเครือข่ายเดียวกันเข้าถึงได้
- ใช้เฉพาะใน development หรือ network ที่เชื่อถือได้
- สำหรับ production ควรใช้ reverse proxy (เช่น Nginx) และ HTTPS

### 4. Network Requirements
- Frontend และ Backend ต้องอยู่ในเครือข่ายเดียวกัน (LAN)
- หรือต้องเปิด port forwarding ใน router (สำหรับการเข้าถึงจากภายนอก)

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเข้าถึงได้จากเครื่องอื่น

1. **ตรวจสอบ Firewall**: ต้องเปิด port 3000 และ 3001
2. **ตรวจสอบ IP Address**: ใช้ IP ที่ถูกต้อง (ไม่ใช่ localhost)
3. **ตรวจสอบ Network**: Frontend และ Backend ต้องอยู่ในเครือข่ายเดียวกัน
4. **ตรวจสอบ CORS**: Backend CORS_ORIGIN ต้องตรงกับ Frontend URL

### ปัญหา: Frontend ไม่สามารถเชื่อมต่อ Backend ได้

1. **ตรวจสอบ VITE_API_BASE_URL**: ต้องชี้ไปที่ Backend IP (ไม่ใช่ localhost)
2. **ตรวจสอบ VITE_BACKEND_URL**: ต้องชี้ไปที่ Backend IP สำหรับ WebSocket
3. **ตรวจสอบ Backend**: ต้องรันอยู่และเข้าถึงได้จาก IP นั้น

### ปัญหา: WebSocket ไม่ทำงาน

1. **ตรวจสอบ VITE_BACKEND_URL**: ต้องชี้ไปที่ Backend IP
2. **ตรวจสอบ Backend CORS**: Socket.io CORS ต้องอนุญาต Frontend IP
3. **ตรวจสอบ Network**: WebSocket ต้องใช้ port เดียวกับ HTTP (3001)

## 📝 สรุปขั้นตอน

1. ✅ อัปเดต `backend/.env` - เพิ่ม `HOST=0.0.0.0` และ `CORS_ORIGIN`
2. ✅ Restart Backend Server
3. ✅ หา IP Address ของเครื่อง
4. ✅ อัปเดต `.env` - เปลี่ยน `VITE_API_BASE_URL` และ `VITE_BACKEND_URL` เป็น IP
5. ✅ Restart Frontend Development Server
6. ✅ เปิด Firewall สำหรับ port 3000 และ 3001
7. ✅ ทดสอบเข้าถึงจากเครื่องอื่น

## 🔗 ไฟล์ที่เกี่ยวข้อง

- `backend/server.js` - Backend server configuration
- `backend/.env` - Backend environment variables
- `vite.config.ts` - Frontend Vite configuration
- `.env` - Frontend environment variables
- `src/services/api.ts` - API client configuration
- `src/services/socketService.ts` - WebSocket client configuration
