# 🧪 Testing Setup Guide - Quick Start

## การติดตั้ง Dependencies

### Frontend
```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Backend
```bash
cd backend
npm install --save-dev jest supertest @babel/core @babel/preset-env babel-jest @types/jest @types/supertest
```

## การรัน Tests

### Frontend (แนะนำ)
```bash
# รัน frontend tests ใน watch mode
npm run test

# รัน frontend tests แบบ UI (แนะนำ)
npm run test:ui

# รัน frontend tests ครั้งเดียว
npm run test:run

# รัน frontend tests พร้อม coverage (แนะนำ)
npm run test:coverage

# หรือใช้คำสั่งเฉพาะ frontend
npm run test:frontend
```

### Backend
```bash
cd backend

# รัน backend tests (ต้องมี database connection)
npm test

# รัน backend tests ใน watch mode
npm run test:watch

# รัน backend tests พร้อม coverage
npm run test:coverage

# หรือใช้คำสั่งจาก root directory
npm run test:backend
```

**หมายเหตุ**: Backend tests ต้องการ database connection จริง หรือต้อง mock database ให้ครบถ้วน

## โครงสร้างไฟล์ Test

### Frontend
- Test files อยู่ใน `src/**/__tests__/*.test.tsx` หรือ `*.test.ts`
- Test utilities อยู่ใน `src/test/`

### Backend
- Test files อยู่ใน `backend/**/__tests__/*.test.js`

## ตัวอย่างการเขียน Test

ดูรายละเอียดเพิ่มเติมใน `Documentation/Agent_cursor_ai/TESTING_GUIDE.md`

## การบันทึกผลการทดสอบ

หลังจากรัน tests แล้ว ให้บันทึกผลใน:
- `Documentation/Agent_cursor_ai/TEST_LOG.md` - บันทึกผลการทดสอบ
- `Documentation/Agent_cursor_ai/BUG_FIXES.md` - บันทึกบัคที่พบ (ถ้ามี)
