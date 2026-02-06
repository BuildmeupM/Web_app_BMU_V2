# 🏗️ Architecture - BMU Work Management System

## 🎯 Overview

สถาปัตยกรรมระบบ BMU Work Management System - Full Stack Web Application

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Pages   │  │Components│  │  Store   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│       └─────────────┼─────────────┘                     │
│                     │                                   │
│              ┌──────▼──────┐                           │
│              │   Services   │                           │
│              │   (API Layer)│                           │
│              └──────┬───────┘                           │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────────────┐
│                  Backend API                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Routes  │  │Middleware│  │  Controllers│          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│       └─────────────┼─────────────┘                     │
│                     │                                   │
│              ┌──────▼──────┐                           │
│              │   Services   │                           │
│              │   (Business) │                           │
│              └──────┬───────┘                           │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Database (MySQL)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Users   │  │Employees │  │ Documents│             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Frontend Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (Pages, Components, UI)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         State Management            │
│  (Zustand Stores, React Query)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Service Layer               │
│  (API Services, HTTP Client)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Utilities                   │
│  (Helpers, Validators, Constants)   │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── BrowserRouter
│   └── Routes
│       ├── Login (Public)
│       └── ProtectedRoute
│           └── Layout
│               ├── Header
│               ├── Sidebar
│               └── Outlet
│                   ├── Dashboard
│                   ├── EmployeeManagement
│                   ├── LeaveManagement
│                   └── ... (Other Pages)
```

## 🔐 Authentication Flow

```
1. User เข้าสู่ระบบ (Login Page)
   ↓
2. Submit Credentials
   ↓
3. API Call → Backend
   ↓
4. Backend Validate → Return Token + User Info
   ↓
5. Store Token + User Info (Zustand Store)
   ↓
6. Redirect to Dashboard
   ↓
7. Protected Routes Check Auth
   ↓
8. Sidebar Show Routes Based on Role
```

## 🔒 Authorization Flow

```
1. User Access Page
   ↓
2. Check Authentication (ProtectedRoute)
   ↓
3. Check Role Permission (hasPermission)
   ↓
4. If Allowed → Show Page
   ↓
5. If Not Allowed → Redirect or Show Error
```

## 📊 Data Flow

### Reading Data
```
Component
  ↓ useQuery (React Query)
Service Layer
  ↓ axios.get
API Endpoint
  ↓
Backend Service
  ↓
Database
  ↓
Return Data
  ↓
Update Cache (React Query)
  ↓
Component Re-render
```

### Writing Data
```
Component
  ↓ useMutation (React Query)
Service Layer
  ↓ axios.post/put/delete
API Endpoint
  ↓
Backend Service
  ↓
Database
  ↓
Return Response
  ↓
Invalidate Cache
  ↓
Refetch Data
  ↓
Component Re-render
```

## 🎯 State Management Strategy

### Zustand Stores
- ✅ `authStore` - Authentication State (Persisted)

### React Query
- ✅ Server State Management
- ✅ Caching
- ✅ Automatic Refetching
- ✅ Optimistic Updates

### Local State
- ✅ Component State (useState)
- ✅ Form State (@mantine/form)

## 🔌 API Communication

### Axios Instance
```typescript
api.interceptors.request.use()  // Add Auth Token
api.interceptors.response.use() // Handle Errors
```

### Service Pattern
```typescript
export const service = {
  getAll: () => api.get('/endpoint'),
  getById: (id) => api.get(`/endpoint/${id}`),
  create: (data) => api.post('/endpoint', data),
  update: (id, data) => api.put(`/endpoint/${id}`, data),
  delete: (id) => api.delete(`/endpoint/${id}`),
}
```

## 🎨 Styling Architecture

### Mantine Theme
- ✅ Centralized Theme Configuration
- ✅ Color System
- ✅ Typography
- ✅ Component Defaults

### CSS Architecture
- ✅ Global Styles (`index.css`)
- ✅ Component Styles (Mantine Components)
- ✅ Utility Classes (Mantine Utilities)

## 🧪 Testing Strategy

### Unit Tests
- ✅ Components
- ✅ Utilities
- ✅ Services

### Integration Tests
- ✅ API Integration
- ✅ State Management

### E2E Tests
- ✅ User Flows
- ✅ Critical Paths

## 🚀 Deployment Architecture

### Frontend (Netlify)
```
Source Code
  ↓ Build (Vite)
  ↓
Static Files (dist/)
  ↓ Deploy
  ↓
Netlify CDN
  ↓
Users
```

### Backend (Railway/Render)
```
Source Code
  ↓ Build
  ↓
Docker Container / Server
  ↓ Deploy
  ↓
Railway/Render Platform
  ↓
API Endpoints
```

## 📈 Performance Optimization

### Frontend
- ✅ Code Splitting (React.lazy)
- ✅ Lazy Loading Components
- ✅ Image Optimization
- ✅ Caching (React Query)
- ✅ Memoization (React.memo, useMemo)

### Backend
- ✅ Database Indexing
- ✅ Query Optimization
- ✅ Caching (Redis)
- ✅ Rate Limiting

## 🔒 Security Architecture

### Frontend
- ✅ Input Validation
- ✅ XSS Prevention
- ✅ Secure Storage
- ✅ HTTPS Only

### Backend
- ✅ Authentication (JWT)
- ✅ Authorization (RBAC)
- ✅ Input Validation
- ✅ SQL Injection Prevention
- ✅ Rate Limiting
- ✅ CORS Configuration

---

**Last Updated**: 2026-01-29
