# BMU System — Mobile App Architecture Reference

> **วัตถุประสงค์:** เอกสารนี้สรุปโครงสร้างระบบ BMU Web App ทั้งหมด เพื่อใช้เป็น Reference ในการพัฒนา Mobile Application

---

## 1. Overview ภาพรวมระบบ

BMU System คือระบบ **บัญชีดิจิตอล + บริหารงานพนักงาน** สำหรับบริษัท BMU โดยมีโมดูลหลักดังนี้:

| โมดูล | คำอธิบาย |
|---|---|
| 🔐 Authentication | Login / Logout / Change Password |
| 👥 Employee Management | ข้อมูลพนักงาน, ตำแหน่ง, นำเข้าข้อมูล |
| 📅 Leave & WFH | ขอลา, ขอ WFH, สวัสดิการ |
| 💼 Client Management | ข้อมูลลูกค้า, Dashboard, ค่าธรรมเนียม |
| 📋 Work Assignments | มอบหมายงาน, ติดตามงาน |
| 🧾 Monthly Tax Data | ข้อมูลภาษีรายเดือน |
| 📄 Document Entry | บันทึกเอกสาร |
| 🗂️ Registration | งานจดทะเบียน, ลูกค้า, งาน |
| 🚴 Messenger | เส้นทาง, ตำแหน่งจุดรับส่ง |
| 💬 Internal Chat | แชทภายในองค์กร (Real-time) |
| 🔔 Notifications | แจ้งเตือน Real-time |
| 📊 Accounting | Marketplace, ออกใบแจ้งหนี้ |
| 📑 Company Feed | ข่าวสารองค์กร |
| 🏖️ Holidays | วันหยุดประจำปี |
| 📦 Equipment | ยืม/คืนอุปกรณ์ |
| 💰 Salary Advance | สวัสดิการเงินเดือนล่วงหน้า |
| 🔒 Activity Logs | ประวัติการใช้งาน |
| 📈 Login Activity | ประวัติ Login |

---

## 2. Tech Stack ปัจจุบัน (Web)

### Backend
| Component | Technology |
|---|---|
| Runtime | **Node.js** (ES Modules) |
| Framework | **Express.js** |
| Database | **MySQL** (via `mysql2/promise` pool) |
| Real-time | **Socket.io** (WebSocket) |
| Auth | **JWT** (jsonwebtoken) |
| Password | **bcrypt** |
| Security | Helmet, Rate Limiter, CORS |
| Cache | In-memory cache (custom middleware) |
| Compression | gzip via `compression` |
| Deployment | **Railway** |

### Frontend (Web — ปัจจุบัน)
| Component | Technology |
|---|---|
| Framework | **React 18** + **TypeScript** |
| Build Tool | **Vite** |
| UI Library | **Mantine v7** |
| State | **Zustand** (persist → localStorage) |
| HTTP Client | **Axios** |
| Real-time | **Socket.io-client** |
| Router | **React Router v6** |
| Deployment | **Vercel** |

---

## 3. API Base URL

```
Production:   https://[railway-url]/api
Development:  http://localhost:3001/api
```

**Headers ที่ต้องส่งทุก Request (หลัง Login):**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 4. Authentication

### JWT Token
- **Expiry:** 7 วัน (env `JWT_EXPIRES_IN`)
- **Payload:** `{ userId, username, role }`
- **Storage (Mobile):** เก็บใน **Secure Storage** (Keychain/Keystore) เท่านั้น ห้ามใช้ AsyncStorage

### Endpoints

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/login` | ❌ |
| POST | `/api/auth/logout` | ✅ |
| GET | `/api/auth/me` | ✅ |
| POST | `/api/auth/change-password` | ✅ |

### Login Request / Response
```json
// POST /api/auth/login
// Body:
{ "username": "string", "password": "string" }

// Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "employee_id": "string",
      "nick_name": "string",
      "role": "admin | data_entry | ...",
      "name": "string"
    },
    "token": "JWT_TOKEN",
    "sessionId": "uuid"
  }
}
```

---

## 5. Role-Based Access Control (RBAC)

| Role | คำอธิบาย |
|---|---|
| `admin` | ผู้ดูแลระบบ — ทุก module |
| `data_entry` | บันทึกข้อมูล — งานบัญชี, เอกสาร |
| `data_entry_and_service` | data_entry + service |
| `audit` | ตรวจสอบบัญชี — ดูข้อมูลทุกอย่าง |
| `service` | บริการลูกค้า |
| `hr` | ฝ่ายบุคคล — Employee, Leave |
| `registration` | งานจดทะเบียน |
| `marketing` | การตลาด |

---

## 6. API Endpoints ทั้งหมด

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/auth/me` | ข้อมูล user ปัจจุบัน |
| POST | `/api/auth/change-password` | เปลี่ยนรหัสผ่าน |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | รายชื่อพนักงานทั้งหมด |
| GET | `/api/employees/:id` | ข้อมูลพนักงาน |
| POST | `/api/employees` | เพิ่มพนักงาน |
| PUT | `/api/employees/:id` | แก้ไขข้อมูลพนักงาน |
| DELETE | `/api/employees/:id` | ลบพนักงาน |
| GET | `/api/employees/statistics` | สถิติพนักงาน |
| POST | `/api/employees/import` | นำเข้าจาก Excel |
| GET | `/api/position-groups` | กลุ่มตำแหน่ง |

### Users (System)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | รายชื่อ users ทั้งหมด |
| POST | `/api/users` | สร้าง user ใหม่ |
| PUT | `/api/users/:id` | แก้ไข user |
| DELETE | `/api/users/:id` | ลบ user |

### Leave & WFH
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leave-requests` | รายการขอลา |
| POST | `/api/leave-requests` | ยื่นใบลา |
| PUT | `/api/leave-requests/:id` | แก้ไข / อนุมัติ |
| DELETE | `/api/leave-requests/:id` | ยกเลิก |
| GET | `/api/wfh-requests` | รายการ WFH |
| POST | `/api/wfh-requests` | ยื่น WFH |
| GET | `/api/salary-advance` | สวัสดิการเงินเดือนล่วงหน้า |
| POST | `/api/salary-advance` | ขอสวัสดิการ |

### Clients
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/clients` | รายชื่อลูกค้า |
| GET | `/api/clients/:id` | ข้อมูลลูกค้า |
| POST | `/api/clients` | เพิ่มลูกค้า |
| PUT | `/api/clients/:id` | แก้ไขลูกค้า |
| GET | `/api/clients/dashboard` | Dashboard ลูกค้า |
| GET | `/api/clients/accounting-fees` | ค่าธรรมเนียม |

### Work Assignments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/work-assignments` | งานที่มอบหมาย |
| POST | `/api/work-assignments` | สร้างงานใหม่ |
| PUT | `/api/work-assignments/:id` | อัพเดทงาน |
| GET | `/api/monthly-tax-data` | ข้อมูลภาษีรายเดือน |

### Registration
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/registration-work` | งานจดทะเบียน |
| POST | `/api/registration-work` | สร้างงานจดทะเบียน |
| GET | `/api/registration-clients` | ลูกค้าจดทะเบียน |
| GET | `/api/registration-tasks` | Tasks |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | การแจ้งเตือนของ user |
| PUT | `/api/notifications/:id/read` | อ่านแล้ว |
| PUT | `/api/notifications/read-all` | อ่านทั้งหมด |
| DELETE | `/api/notifications/:id` | ลบแจ้งเตือน |

### Internal Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/internal-chats` | ประวัติแชท |
| POST | `/api/internal-chats` | ส่งข้อความ |

### Company & Content
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/company-feed` | ข่าวสารองค์กร |
| GET | `/api/holidays` | วันหยุด |
| GET | `/api/equipment` | อุปกรณ์ |
| POST | `/api/equipment` | ยืมอุปกรณ์ |
| GET | `/api/document-requests` | คำขอเอกสาร |

### Accounting
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/accounting-marketplace` | Accounting Marketplace |
| GET | `/api/accounting-fee-notes` | ใบแจ้งหนี้ |
| POST | `/api/accounting-fee-notes` | สร้างใบแจ้งหนี้ |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/activity-logs` | ประวัติการใช้งาน |
| GET | `/api/login-activity` | ประวัติ Login |
| POST | `/api/login-activity/heartbeat` | Heartbeat (ส่งทุก 2 นาที) |
| GET | `/api/attendance-dashboard` | สรุปการเข้างาน |
| GET | `/health` | Health check |

---

## 7. Standard Response Format

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "optional"
}

// Error
{
  "success": false,
  "message": "error message"
}

// Paginated
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 8. Real-time (Socket.io / WebSocket)

**Connection URL:** `wss://[backend-url]`

### Client → Server (Emit)
| Event | Data | Description |
|---|---|---|
| `subscribe:user` | `{ userId }` | สมัคร Notifications ส่วนตัว |
| `unsubscribe:user` | `{ userId }` | ยกเลิก |
| `subscribe:monthly-tax-data` | `{ employeeId }` | สมัครข้อมูลภาษี |
| `join:chat` | `{ build }` | เข้าร่วม Chat Room |
| `leave:chat` | `{ build }` | ออกจาก Chat Room |

### Server → Client (Listen)
| Event | Room | Description |
|---|---|---|
| `notification:new` | `user:{userId}` | แจ้งเตือนใหม่ |
| `online-users:changed` | `dashboard:online-users` | Online users เปลี่ยน |
| `monthly-tax-data:updated` | `monthly-tax-data:{employeeId}` | ข้อมูลภาษีอัพเดท |
| `chat:message` | `chat:build:{build}` | ข้อความแชทใหม่ |

### ตัวอย่าง React Native
```javascript
import { io } from 'socket.io-client'

const socket = io('https://your-backend-url', {
  auth: { token: JWT_TOKEN },
  transports: ['websocket'],
})

socket.emit('subscribe:user', { userId: currentUser.id })
socket.on('notification:new', (data) => { /* show push notification */ })
```

---

## 9. Database Entities (ตารางหลัก)

```
users                — ผู้ใช้งานระบบ
employees            — ข้อมูลพนักงาน
user_sessions        — Session tracking
login_attempts       — บันทึกความพยายาม Login

clients              — ลูกค้า
client_accounting    — ค่าธรรมเนียมลูกค้า

leave_requests       — ใบลา
wfh_requests         — WFH
salary_advance       — สวัสดิการเงินเดือน

work_assignments     — การมอบหมายงาน
monthly_tax_data     — ข้อมูลภาษีรายเดือน
document_entry       — บันทึกเอกสาร

registration_work    — งานจดทะเบียน
registration_clients — ลูกค้างานจดทะเบียน
registration_tasks   — Tasks งานจดทะเบียน

notifications        — การแจ้งเตือน
internal_chats       — แชทภายใน
company_feed         — ข่าวสารองค์กร

holidays             — วันหยุด
equipment            — อุปกรณ์
document_requests    — คำขอเอกสาร
messenger_routes     — เส้นทาง Messenger
messenger_locations  — ตำแหน่ง
position_groups      — กลุ่มตำแหน่ง
activity_logs        — ประวัติการใช้งาน
```

---

## 10. แนะนำ Mobile Tech Stack

### React Native + Expo (แนะนำ)
> Team มีประสบการณ์ React + TypeScript อยู่แล้ว → Learning curve น้อยที่สุด

```
Framework:    React Native (Expo SDK 51+)
Language:     TypeScript
State:        Zustand (เหมือน Web)
HTTP:         Axios
Real-time:    socket.io-client
Auth Storage: expo-secure-store  ← แทน localStorage
Navigation:   React Navigation v6
UI:           React Native Paper / NativeBase
Push Notify:  Expo Notifications + FCM/APNs
```

### โครงสร้างโปรเจค
```
mobile-app/
├── src/
│   ├── api/          — Axios instance + JWT interceptor
│   ├── services/     — authService, leaveService, ... (share จาก web ได้)
│   ├── store/        — Zustand stores (เปลี่ยน storage → expo-secure-store)
│   ├── screens/      — แต่ละหน้าแอป
│   ├── components/   — Reusable components
│   ├── hooks/        — useHeartbeat, useSocket, ...
│   ├── types/        — TypeScript types (share จาก web ได้)
│   └── navigation/   — Stack / Tab navigators
```

### Priority Features (ลำดับแนะนำ)
1. 🔐 **Login / Logout**
2. 📊 **Dashboard** — สรุปภาพรวม
3. 🔔 **Notifications** — Real-time
4. 📅 **Leave Requests** — ขอลา / อนุมัติ
5. 🏠 **WFH Requests**
6. 💬 **Internal Chat**
7. 📋 **Work Assignments**
8. 📑 **Company Feed**

---

## 11. Security Checklist สำหรับ Mobile

> [!IMPORTANT]
> - **JWT Token** → เก็บใน **`expo-secure-store`** หรือ `react-native-keychain` เท่านั้น ห้ามใช้ AsyncStorage
> - **Heartbeat** → ส่ง `POST /api/login-activity/heartbeat` ทุก 2 นาที (ป้องกัน forced logout)
> - **CORS** → Backend อนุญาต `origin: null` (Mobile requests) แล้ว
> - **Token Refresh** → ถ้า token หมดอายุ (7 วัน) ให้ redirect ไป Login

---

## 12. Environment Variables (Backend Reference)

```env
PORT=3001
CORS_ORIGIN=https://frontend.vercel.app
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
NODE_ENV=production
```
