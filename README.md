# BMU Work Management System

ระบบจัดการงานสำหรับองค์กรภายใน - Full Stack Web Application

## 🚀 Tech Stack

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Mantine UI** - Component Library
- **React Router** - Routing
- **Zustand** - State Management
- **React Query** - Data Fetching
- **Axios** - HTTP Client

### Backend ✅ (สร้างแล้ว)
- **Node.js + Express.js** - Backend API Framework
- **MySQL/MariaDB** - Database (mysql2)
- **JWT (jsonwebtoken)** - Authentication
- **bcrypt** - Password Hashing
- **CORS** - Cross-Origin Resource Sharing

### Deployment
- **Frontend**: Netlify
- **Backend**: Railway / Render

## 📋 Features

### ระบบ Authentication ✅ (พร้อมใช้งาน)
- ✅ Backend API สำหรับ Login/Logout
- ✅ JWT Token Authentication
- ✅ Frontend Login Component
- ✅ Protected Routes
- ✅ Role-based Access Control (RBAC)
- ✅ Auto Logout เมื่อ Token หมดอายุ
- ✅ Protected Routes

### หน้า Pages (11 หน้า)
1. **Login** - หน้าเข้าสู่ระบบ
2. **Dashboard** - หน้าแดชบอร์ดหลัก (แตกต่างตาม Role)
3. **ข้อมูลพนักงาน** - จัดการข้อมูลพนักงาน
4. **ลางาน/WFH** - จัดการการลาและ Work from Home
5. **ขอเบิกเงินเดือน** - จัดการการเบิกเงินเดือน
6. **ข้อมูลเข้าออฟฟิศ** - จัดการข้อมูลการเข้าออฟฟิศ
7. **คัดแยกเอกสาร** - จัดการการคัดแยกเอกสาร
8. **คีย์เอกสาร** - จัดการการคีย์เอกสาร
9. **ตรวจภาษี** - ตรวจสอบเอกสารภาษี
10. **สถานะยื่นภาษี** - ติดตามสถานะการยื่นภาษี
11. **ยื่นภาษี** - ยื่นภาษีออนไลน์

### Roles และ Permissions

#### admin
- เข้าถึงได้ทุกหน้า

#### data_entry
- Dashboard
- ข้อมูลพนักงาน
- ลางาน/WFH
- ขอเบิกเงินเดือน
- ข้อมูลเข้าออฟฟิศ
- คีย์เอกสาร

#### data_entry_and_service
- Dashboard
- ข้อมูลพนักงาน
- ลางาน/WFH
- ขอเบิกเงินเดือน
- ข้อมูลเข้าออฟิศ
- คีย์เอกสาร
- สถานะยื่นภาษี
- ยื่นภาษี

#### audit
- Dashboard
- ข้อมูลพนักงาน
- ลางาน/WFH
- ขอเบิกเงินเดือน
- ข้อมูลเข้าออฟฟิศ
- ตรวจภาษี

#### service
- Dashboard
- ข้อมูลพนักงาน
- ลางาน/WFH
- ขอเบิกเงินเดือน
- ข้อมูลเข้าออฟฟิศ
- คัดแยกเอกสาร
- สถานะยื่นภาษี

## 🎨 Design System

### Colors
- **Primary**: Orange (#ff6b35, #ff8c42)
- **Secondary**: Blue (#4facfe, #00f2fe)
- **Success**: Green (#4caf50)
- **Error**: Red (#f44336)
- **Warning**: Yellow (#ff9800)

### Typography
- **Font Family**: Kanit (Thai), Arial/Sans-serif (English)
- **Headings**: 2xl, 3xl, 4xl
- **Body**: base (16px)
- **Small**: sm (14px)

### Design Style
- Clean และ Modern
- Responsive (Mobile, Tablet, Desktop)
- User-Friendly
- Consistent Design System

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm หรือ yarn

### Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd Web_app_BMU-React
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:3001/api

# Backend Environment Variables (backend/.env)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bmu_work_management
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

4. **Run development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

6. **Preview production build**
```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── Auth/           # Authentication components
│   └── Layout/         # Layout components (Sidebar, Header)
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── ...
├── services/           # API services
│   ├── api.ts
│   ├── authService.ts
│   └── ...
├── store/              # State management (Zustand)
│   └── authStore.ts
├── utils/              # Utility functions
│   └── rolePermissions.ts
├── theme.ts            # Mantine theme configuration
├── App.tsx             # Main App component
└── main.tsx            # Entry point
```

## 🔐 Security Guidelines

### Frontend
- ✅ Input Validation
- ✅ XSS Prevention
- ✅ CSRF Protection
- ✅ Secure Storage (ไม่เก็บ Sensitive Data ใน LocalStorage)

### Backend (แนะนำ)
- ✅ Input Validation
- ✅ SQL Injection Prevention (Parameterized Queries)
- ✅ Secure Authentication (JWT)
- ✅ Authorization (Role-based)
- ✅ Rate Limiting

## 🧪 Testing

```bash
# Unit Tests (เมื่อพร้อม)
npm run test

# E2E Tests (เมื่อพร้อม)
npm run test:e2e
```

## 🚀 Deployment

### Frontend (Netlify)
1. Build project: `npm run build`
2. Deploy `dist` folder to Netlify
3. Set environment variables in Netlify dashboard

### Backend (Railway/Render)
1. Setup backend API
2. Configure database connection
3. Deploy to Railway/Render
4. Update `VITE_API_BASE_URL` in frontend

## 📝 Development Guidelines

### Code Quality
- ✅ Clean Code
- ✅ DRY (Don't Repeat Yourself)
- ✅ SOLID Principles
- ✅ Comments สำหรับโค้ดที่ซับซ้อน

### Git Workflow
- ✅ Use branches for features
- ✅ Commit frequently with clear messages
- ✅ Use Pull Requests for review
- ✅ Merge after review

## 📚 Next Steps

### TODO
- [ ] สร้าง Shared Components (Tables, Forms, Modals)
- [x] ✅ เชื่อมต่อ Backend API (Authentication)
- [ ] เชื่อมต่อ Backend API สำหรับ Features อื่นๆ
- [ ] เพิ่ม Form Validation
- [ ] เพิ่ม Error Handling
- [ ] เพิ่ม Loading States
- [ ] เพิ่ม Export Data (PDF, Excel)
- [ ] เพิ่ม Search และ Filter
- [ ] เพิ่ม Pagination
- [ ] เพิ่ม Unit Tests
- [ ] เพิ่ม E2E Tests

## 🤝 Contributing

1. Read `AGENT.md` before starting development
2. Follow guidelines in `AGENT.md`
3. Ask questions if unclear
4. Review code before merging
5. Test all features

## 📄 License

Private - Internal Use Only

## 👥 Contact

BMU Development Team
