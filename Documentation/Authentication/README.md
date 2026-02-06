# 🔐 Authentication System - BMU Work Management System

## 📋 Overview

โฟลเดอร์นี้เก็บเอกสารทั้งหมดเกี่ยวกับระบบ Authentication

## 📁 Files

- **[AUTHENTICATION_SYSTEM.md](./AUTHENTICATION_SYSTEM.md)** - เอกสารฉบับเต็มเกี่ยวกับระบบ Authentication
  - Architecture
  - Authentication Flow
  - Backend API Documentation
  - Frontend Components Documentation
  - Security Features
  - Testing Guide

- **[SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md)** - การวิเคราะห์ความปลอดภัยแบบละเอียด
  - Security Score: 8.5/10 (High)
  - Security Features ที่มีอยู่
  - Vulnerabilities และ Recommendations

- **[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)** - Security Improvements ที่ implement แล้ว
  - Rate Limiting
  - Account Lockout
  - Input Validation
  - Security Headers
  - Login Attempts Logging

- **[SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md)** - สรุปความปลอดภัยของระบบ
  - Security Score: 8.5/10 (High)
  - Security Features Checklist
  - Production Ready Status

## 🚀 Quick Start

### Backend Setup

1. ติดตั้ง dependencies:
```bash
cd backend
npm install
```

2. ตั้งค่า environment variables:
```bash
cp .env.example .env
# แก้ไข .env ตามที่ต้องการ
```

3. รัน server:
```bash
npm run dev
```

### Frontend Setup

1. ตั้งค่า environment variable (ถ้ายังไม่มี):
```bash
# สร้างไฟล์ .env
VITE_API_BASE_URL=http://localhost:3001/api
```

2. รัน Frontend:
```bash
npm run dev
```

### Testing Login

1. เปิด `http://localhost:5173/login`
2. กรอก:
   - Username: `admin`
   - Password: `admin123`
3. คลิก "เข้าสู่ระบบ"
4. ควร redirect ไป Dashboard

## 📚 Related Documentation

- [Backend README](../../backend/README.md) - Backend API Documentation
- [Database Schema](../Database/schema.md) - Database Schema
- [Login Page Guide](../Guidebook_for_page/01_Login.md) - Frontend Login Page Guide

---

**Last Updated**: 2026-01-29
