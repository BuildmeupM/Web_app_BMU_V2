# 📁 Project Structure - BMU Work Management System

## 🎯 Overview

โครงสร้างโปรเจกต์ React + TypeScript + Vite สำหรับ BMU Work Management System

## 📂 Directory Structure

```
Web_app_BMU React/
├── Documentation/              # 📚 Documentation ทั้งหมด
│   ├── Agent_cursor_ai/       # 🤖 Agent Guidelines
│   │   ├── AGENT.md           # ไฟล์หลักกำหนดทิศทาง
│   │   └── README.md          # คำแนะนำ
│   ├── Guidebook_for_page/    # 📖 คู่มือแต่ละหน้า
│   │   ├── README.md          # Index
│   │   ├── 01_Login.md
│   │   ├── 02_Dashboard.md
│   │   └── ...
│   ├── Project_structure/     # 📁 โครงสร้างโปรเจกต์
│   │   ├── README.md
│   │   ├── structure.md       # ไฟล์นี้
│   │   └── architecture.md
│   └── README.md              # Index หลัก
│
├── src/                       # 💻 Source Code
│   ├── components/            # 🧩 Reusable Components
│   │   ├── Auth/              # Authentication Components
│   │   │   └── ProtectedRoute.tsx
│   │   └── Layout/            # Layout Components
│   │       ├── Layout.tsx
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   │
│   ├── pages/                 # 📄 Page Components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EmployeeManagement.tsx
│   │   ├── LeaveManagement.tsx
│   │   ├── SalaryAdvance.tsx
│   │   ├── OfficeAttendance.tsx
│   │   ├── DocumentSorting.tsx
│   │   ├── DocumentEntry.tsx
│   │   ├── TaxInspection.tsx
│   │   ├── TaxStatus.tsx
│   │   └── TaxFiling.tsx
│   │
│   ├── services/              # 🔌 API Services
│   │   ├── api.ts             # Axios instance
│   │   ├── authService.ts     # Auth API
│   │   └── employeeService.ts # Employee API
│   │
│   ├── store/                 # 🗄️ State Management
│   │   └── authStore.ts       # Auth Store (Zustand)
│   │
│   ├── utils/                 # 🛠️ Utility Functions
│   │   └── rolePermissions.ts # Role & Permission Utils
│   │
│   ├── theme.ts               # 🎨 Mantine Theme
│   ├── App.tsx                # Main App Component
│   ├── main.tsx               # Entry Point
│   ├── index.css              # Global Styles
│   └── vite-env.d.ts          # Vite Types
│
├── public/                    # 🌐 Public Assets
│
├── Documentation/             # 📚 Documentation (ดูด้านบน)
│
├── .env.example               # 🔐 Environment Variables Example
├── .eslintrc.cjs              # 🔍 ESLint Config
├── .gitignore                 # 🚫 Git Ignore
├── AGENT.md                   # 🤖 Agent Guidelines (Root)
├── ANALYSIS.md                # 📊 Analysis Document
├── index.html                 # 📄 HTML Entry
├── package.json               # 📦 Dependencies
├── README.md                  # 📖 Project README
├── tsconfig.json              # ⚙️ TypeScript Config
├── tsconfig.node.json         # ⚙️ TypeScript Node Config
└── vite.config.ts             # ⚙️ Vite Config
```

## 📁 Detailed Structure

### `/src/components/`
Reusable Components ที่ใช้ในหลายหน้า

#### `/Auth/`
- `ProtectedRoute.tsx` - Component สำหรับป้องกัน Route

#### `/Layout/`
- `Layout.tsx` - Main Layout Component (AppShell)
- `Sidebar.tsx` - Sidebar Navigation
- `Header.tsx` - Header Component

### `/src/pages/`
Page Components แต่ละหน้าในระบบ

### `/src/services/`
API Service Layer

- `api.ts` - Axios instance พร้อม interceptors
- `authService.ts` - Authentication API
- `employeeService.ts` - Employee Management API

### `/src/store/`
State Management (Zustand)

- `authStore.ts` - Authentication State

### `/src/utils/`
Utility Functions

- `rolePermissions.ts` - Role และ Permission Utilities

## 🎯 Naming Conventions

### Files
- ✅ Components: `PascalCase.tsx` (e.g., `Login.tsx`)
- ✅ Utilities: `camelCase.ts` (e.g., `rolePermissions.ts`)
- ✅ Services: `camelCase.ts` (e.g., `authService.ts`)
- ✅ Stores: `camelCase.ts` (e.g., `authStore.ts`)

### Folders
- ✅ Components: `PascalCase/` (e.g., `Auth/`)
- ✅ Pages: `pages/` (lowercase)
- ✅ Services: `services/` (lowercase)
- ✅ Utils: `utils/` (lowercase)

## 📦 Dependencies Structure

### Core
- `react` - UI Library
- `react-dom` - DOM Renderer
- `react-router-dom` - Routing

### UI
- `@mantine/core` - UI Components
- `@mantine/hooks` - Hooks
- `@mantine/form` - Form Management
- `@mantine/notifications` - Notifications
- `@mantine/dates` - Date Pickers

### State & Data
- `zustand` - State Management
- `react-query` - Data Fetching
- `axios` - HTTP Client

### Utilities
- `dayjs` - Date Manipulation

## 🔗 Import Paths

ใช้ Path Aliases:
```typescript
import { useAuthStore } from '@/store/authStore'
import { hasPermission } from '@/utils/rolePermissions'
```

Configured in:
- `tsconfig.json` - `paths: { "@/*": ["./src/*"] }`
- `vite.config.ts` - `resolve.alias`

## 📝 File Organization Rules

1. ✅ **One Component per File** - แต่ละ Component อยู่ในไฟล์ของตัวเอง
2. ✅ **Co-location** - Related files อยู่ใกล้กัน
3. ✅ **Barrel Exports** - ใช้ `index.ts` ถ้าจำเป็น
4. ✅ **Clear Separation** - แยก Components, Pages, Services, Utils

## 🚀 Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

---

**Last Updated**: 2026-01-29
