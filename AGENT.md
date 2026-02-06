# 🤖 Agent Guidelines - ทิศทางและมาตรฐานโปรเจกต์
วัตถุประสงค์ : ไฟล์นี้ใช้เป็นแนวทางสำหรับ Cursor AI Agent ในการพัฒนาโปรเจกต์ ให้โปรเจกต์ไปในทิศทางที่ถูกต้องและสอดคล้องกันทั้งหมด

ชื่อโปรเจ็กต์ : BMU Work Management System
ประเภทโปรเจ็กต์ : Full Stack Web Application - ระบบจัดการงานสำหรับองค์กรภายใน
Tech Stack ตามข้อมูลรายละเอียดด้านล่าง
- FrontEnd : React 
- Backend : ให้ Cursor AI แนะนำสำหรับโปรเจคนี้มีผู้ใช้งานเว็บประมาณ 30-100 คนตามสเกลพนักงานในอนาคต
- Database : PHPMYSQL
- Styling : Mantine
- Deployment : Netlify (Frontend), Railway/Render (Backend)

Design Guidelines :

### Color Scheme
- **Primary Color**: Orange (#ff6b35, #ff8c42)
- **Secondary Colors**: 
  - Blue: #4facfe, #00f2fe (สำหรับ Actions)
  - Green: #4caf50 (สำหรับ Success)
  - Red: #f44336 (สำหรับ Errors/Danger)
  - Yellow: #ff9800 (สำหรับ Warnings)

### Typography
- **Font Family**: Kanit (Thai), Arial/Sans-serif (English)
- **Font Sizes**: 
  - Headings: 2xl, 3xl, 4xl
  - Body: base (16px)
  - Small: sm (14px)

### Design Style
- **Clean และ Modern**: ดีไซน์เรียบง่าย สวยงาม
- **Responsive**: รองรับทุกขนาดหน้าจอ (Mobile, Tablet, Desktop)
- **User-Friendly**: ใช้งานง่าย เข้าใจง่าย
- **Consistent**: ใช้ Design System ที่สอดคล้องกัน

### UI Components Style
- **Cards**: Rounded corners (rounded-xl, rounded-2xl), Shadow (shadow-lg)
- **Buttons**: Rounded (rounded-lg, rounded-xl), Hover effects
- **Forms**: Clean inputs, Clear labels, Good spacing
- **Tables**: Clean design, Hover effects, Responsive

Role : 
- admin : สามารถมองเห็นทุกอย่างเข้าถึงข้อมูลได้ทุก Role
- data_entry : สามารถมองเห็นหน้า Dashboard , ข้อมูลพนักงาน , ลางาน/WFH , ขอเบิกเงินเดือน , ข้อมูลเข้าออฟฟิศ , คีย์เอกสาร
- data_entry_and_service : สามารถมองเห็นหน้า Dashboard , ข้อมูลพนักงาน , ลางาน/WFH , ขอเบิกเงินเดือน , ข้อมูลเข้าออฟฟิศ , คีย์เอกสาร , สถานะยื่นภาษี , ยื่นภาษี
- audit สามารถมองเห็นหน้า Dashboard , ข้อมูลพนักงาน , ลางาน/WFH , ขอเบิกเงินเดือน , ข้อมูลเข้าออฟฟิศ , ตรวจภาษี
- service : สามารถมองเห็นหน้า Dashboard , ข้อมูลพนักงาน , ลางาน/WFH , ขอเบิกเงินเดือน , ข้อมูลเข้าออฟฟิศ , คัดแยกเอกสาร ,สถานะยื่นภาษี 

Features และ Pages :
1. **Login** - หน้าเข้าสู่ระบบ
2. **Dashboard** - หน้าแดชบอร์ดหลัก 
- ระบบเเสดงข้อมูลของหน้า Dashboard อยากให้ดีไซน์ออกมาโดยให้แต่ละตำแหน่งมองเห็นงานที่แตกต่างกันและไม่เหมือนกันเลยแบ่งเป็น Role : admin , data_entry , data_entry_and_service , audit , service 
3. **ข้อมูลพนักงาน** - จัดการข้อมูลพนักงาน
4. **ลางาน/WFH** - จัดการการลาและ Work from Home
5. **ขอเบิกเงินเดือน** - จัดการการเบิกเงินเดือน
6. **ข้อมูลเข้าออฟฟิศ** - จัดการข้อมูลการเข้าออฟฟิศ
7. **คัดแยกเอกสาร** - จัดการการคัดแยกเอกสาร
8. **คีย์เอกสาร** - จัดการการคีย์เอกสาร
9. **ตรวจภาษี** - ตรวจสอบเอกสารภาษี
10. **สถานะยื่นภาษี** - ติดตามสถานะการยื่นภาษี
11. **ยื่นภาษี** - ยื่นภาษีออนไลน์

### Features ที่ควรมี
- ✅ Authentication (Login/Logout)
- ✅ Role-based Access Control
- ✅ Data Validation
- ✅ Error Handling
- ✅ Loading States
- ✅ Responsive Design
- ✅ Form Validation
- ✅ Search และ Filter
- ✅ Pagination
- ✅ Export Data (PDF, Excel)

### Layout
- ✅ **Consistent Layout**: ใช้ Layout เดียวกันทุกหน้า
- ✅ **Navigation**: Sidebar Navigation ที่ชัดเจน
- ✅ **Header**: Header ที่มี User Info และ Notifications
- ✅ **Footer**: Footer ที่มีข้อมูลสำคัญ

### Forms
- ✅ **Clear Labels**: Label ที่ชัดเจน
- ✅ **Validation**: Real-time Validation
- ✅ **Error Messages**: Error Messages ที่เข้าใจง่าย
- ✅ **Success Feedback**: แสดงผลเมื่อสำเร็จ

### Tables
- ✅ **Sortable**: สามารถ Sort ได้
- ✅ **Filterable**: สามารถ Filter ได้
- ✅ **Pagination**: Pagination สำหรับข้อมูลเยอะ
- ✅ **Responsive**: Responsive บนมือถือ

### Buttons
- ✅ **Clear Actions**: ปุ่มที่มี Action ชัดเจน
- ✅ **Loading States**: แสดง Loading เมื่อกำลังทำงาน
- ✅ **Disabled States**: Disable เมื่อไม่สามารถใช้งานได้
- ✅ **Hover Effects**: Hover Effects ที่ชัดเจน

### Modals/Dialogs
- ✅ **Clear Title**: Title ที่ชัดเจน
- ✅ **Close Button**: ปุ่มปิดที่เห็นชัด
- ✅ **Actions**: ปุ่ม Actions ที่ชัดเจน
- ✅ **Backdrop**: Backdrop ที่เหมาะสม

## 🔒 Security Guidelines

### Frontend
- ✅ **Input Validation**: Validate ทุก Input
- ✅ **XSS Prevention**: Escape User Input
- ✅ **CSRF Protection**: ใช้ CSRF Tokens
- ✅ **Secure Storage**: ไม่เก็บ Sensitive Data ใน LocalStorage

### Backend
- ✅ **Input Validation**: Validate ทุก Input
- ✅ **SQL Injection Prevention**: ใช้ Parameterized Queries
- ✅ **Authentication**: ใช้ Secure Authentication
- ✅ **Authorization**: ตรวจสอบ Permissions
- ✅ **Rate Limiting**: Rate Limiting สำหรับ API

## 📊 Data Guidelines

### Data Structure
- ✅ **Consistent Format**: ใช้ Format เดียวกัน
- ✅ **Validation**: Validate ทุก Data
- ✅ **Error Handling**: Handle Errors อย่างเหมาะสม

### Database
- ✅ **Normalization**: Normalize Database
- ✅ **Indexes**: ใช้ Indexes สำหรับ Performance
- ✅ **Backup**: Backup Database เป็นประจำ

## 🧪 Testing Guidelines

### Unit Tests
- ✅ Test ทุก Function
- ✅ Test Edge Cases
- ✅ Test Error Cases
- ✅ Coverage อย่างน้อย 80%

### Integration Tests
- ✅ Test API Endpoints
- ✅ Test Database Operations
- ✅ Test Authentication

### E2E Tests
- ✅ Test User Flows
- ✅ Test Critical Paths
- ✅ Test Cross-browser

## 🚀 Deployment Guidelines

### Frontend
- ✅ **Build**: Build โปรเจกต์ก่อน Deploy
- ✅ **Environment Variables**: ตั้งค่า Environment Variables
- ✅ **CDN**: ใช้ CDN สำหรับ Static Assets
- ✅ **Caching**: ตั้งค่า Caching

### Backend
- ✅ **Environment Variables**: ตั้งค่า Environment Variables
- ✅ **Database**: เชื่อมต่อ Database
- ✅ **Monitoring**: ตั้งค่า Monitoring
- ✅ **Logging**: ตั้งค่า Logging

---

## 📚 Documentation Guidelines

### Code Documentation
- ✅ **Comments**: Comment โค้ดที่ซับซ้อน
- ✅ **Function Docs**: Document Functions
- ✅ **README**: README ที่ครบถ้วน

### API Documentation
- ✅ **Endpoints**: Document ทุก Endpoint
- ✅ **Request/Response**: Document Request/Response Format
- ✅ **Examples**: มี Examples

## 🔄 Workflow

### Development Workflow
1. ✅ **Plan**: วางแผนก่อนเขียนโค้ด
2. ✅ **Develop**: พัฒนาตาม Plan
3. ✅ **Test**: Test ทุก Feature
4. ✅ **Review**: Review Code
5. ✅ **Deploy**: Deploy เมื่อพร้อม

### Git Workflow
- ✅ **Branch**: ใช้ Branch สำหรับ Features
- ✅ **Commit**: Commit บ่อยๆ พร้อม Message ที่ชัดเจน
- ✅ **Pull Request**: ใช้ Pull Request สำหรับ Review
- ✅ **Merge**: Merge เมื่อ Review แล้ว

## 🎓 Best Practices

### Code Quality
- ✅ **Clean Code**: โค้ดที่อ่านง่าย เข้าใจง่าย
- ✅ **DRY**: Don't Repeat Yourself
- ✅ **SOLID**: ใช้ SOLID Principles
- ✅ **Comments**: Comment โค้ดที่ซับซ้อน

### Performance
- ✅ **Optimize Images**: Optimize Images
- ✅ **Lazy Loading**: Lazy Load Components
- ✅ **Code Splitting**: Code Splitting
- ✅ **Caching**: ใช้ Caching

### Security
- ✅ **Input Validation**: Validate ทุก Input
- ✅ **Authentication**: ใช้ Secure Authentication
- ✅ **Authorization**: ตรวจสอบ Permissions
- ✅ **HTTPS**: ใช้ HTTPS

---

## 🚨 Important Notes

### สำหรับ Cursor Agent
1. ✅ **อ่าน Context**: อ่าน Context ก่อนตอบ
2. ✅ **ถามถ้าไม่ชัดเจน**: ถามถ้าไม่เข้าใจ Requirements
3. ✅ **แนะนำ Best Practices**: แนะนำ Best Practices
4. ✅ **อธิบายโค้ด**: อธิบายโค้ดที่สร้างให้
5. ✅ **Refactor**: Refactor โค้ดให้ดีขึ้นเมื่อเป็นไปได้

### สำหรับ Developer
1. ✅ **อ่าน Agent.md**: อ่าน Agent.md ก่อนเริ่มพัฒนา
2. ✅ **ทำตาม Guidelines**: ทำตาม Guidelines
3. ✅ **ถาม Cursor**: ถาม Cursor ถ้ามีคำถาม
4. ✅ **Review Code**: Review Code ที่ Cursor สร้าง
5. ✅ **Test**: Test ทุก Feature

