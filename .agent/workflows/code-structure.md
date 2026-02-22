---
description: แนวทางการเขียนโค้ดและจัดเรียงไฟล์ให้พัฒนาต่อได้อย่างมีประสิทธิภาพ
---

# แนวทางการเขียนโค้ดและจัดเรียงไฟล์

## กฎหลัก

- **ห้าม** สร้างไฟล์ที่มีมากกว่า 300 บรรทัด (God File) — ถ้าเกินให้แยกออกเป็นส่วนย่อย
- **ห้าม** เขียนโค้ดซ้ำ (DRY Principle) — ถ้ามีโค้ดเหมือนกัน 2 ที่ขึ้นไป ให้สร้าง shared utility
- **ต้อง** จัดเรียงไฟล์ตามโครงสร้างที่กำหนดไว้ด้านล่าง
- **ต้อง** เขียน comment เป็นภาษาไทยสำหรับ business logic

---

## โครงสร้างไฟล์ Backend

```
backend/
├── config/           ← การตั้งค่าระบบ (database, env)
├── middleware/        ← Middleware ทั่วไป (auth, cache, rateLimiter)
├── routes/            ← Route handlers (แยกตามโดเมน)
│   ├── clients.js
│   ├── leaves.js
│   └── monthly-tax-data.js
├── services/          ← Business logic ที่ซับซ้อน
│   ├── socketService.js
│   └── queueService.js
└── utils/             ← Helper functions ที่ใช้ร่วมกัน
    ├── dateFormatter.js
    ├── leaveHelpers.js
    └── logActivity.js
```

### กฎ Backend

1. **Route files** — ใส่เฉพาะ route handler + validation ห้ามใส่ business logic ที่ซับซ้อน
2. **Services** — ใส่ business logic ที่ใช้ร่วมกันหลาย routes
3. **Utils** — ใส่ helper functions ที่ไม่ขึ้นกับ business logic เช่น date formatting, string utils
4. **ถ้า route file เกิน 300 บรรทัด** — ให้แยก logic ออกเป็น service file

---

## โครงสร้างไฟล์ Frontend

```
src/
├── components/        ← UI Components (แยกตามฟีเจอร์)
│   ├── Registration/
│   │   ├── TaskDetailDrawer.tsx
│   │   ├── TaskStatusModal.tsx
│   │   └── utils/              ← shared utils สำหรับ component กลุ่มนี้
│   │       ├── taskConstants.ts
│   │       └── taskFormatters.ts
│   ├── Leave/
│   └── Dashboard/
├── hooks/             ← Custom React hooks ที่ใช้ร่วมกัน
├── pages/             ← Page-level components
├── services/          ← API service functions
├── utils/             ← Global utility functions
└── types/             ← TypeScript type definitions
```

### กฎ Frontend

1. **Components** — แยกตามฟีเจอร์/โดเมน ไม่ใช่ตามประเภท (button, modal)
2. **Utils ภายใน component** — ถ้า util ใช้เฉพาะกลุ่ม component นั้น ให้วางใน `<ComponentGroup>/utils/`
3. **Utils ทั่วไป** — ถ้า util ใช้ข้าม component หลายกลุ่ม ให้วางใน `src/utils/`
4. **Hooks** — Custom hooks ที่ใช้ร่วมกันให้วางใน `src/hooks/`
5. **Types** — Type ที่ใช้ร่วมกันหลายที่ให้วางใน `src/types/`
6. **ถ้า component เกิน 300 บรรทัด** — ให้แยก sub-components หรือ custom hooks ออก

---

## ขั้นตอนเมื่อสร้างโค้ดใหม่

### 1. วิเคราะห์ก่อนเขียน

- ตรวจสอบว่ามีโค้ดที่คล้ายกันอยู่แล้วหรือไม่
- ระบุว่า function/component ควรอยู่ที่ไหนตามโครงสร้าง
- ถ้าจะสร้างไฟล์ใหม่ ให้อธิบายเหตุผลให้ผู้ใช้ทราบ

### 2. เขียนโค้ด

- แยก concerns ให้ชัดเจน (UI / Logic / Data)
- ใช้ TypeScript types สำหรับ frontend
- เขียน JSDoc comment สำหรับ backend functions
- ตั้งชื่อไฟล์ให้สื่อความหมาย (camelCase สำหรับ utils, PascalCase สำหรับ components)

### 3. ตรวจสอบหลังเขียน

- ไฟล์ใหม่ต้องไม่เกิน 300 บรรทัด
- ไม่มีโค้ดซ้ำกับไฟล์อื่น
- import/export ถูกต้อง
- ไม่มี unused imports

---

## เมื่อแก้ไขไฟล์ที่มีอยู่

### 1. ตรวจสอบขนาดไฟล์

- ถ้าไฟล์เกิน 300 บรรทัด → **แนะนำผู้ใช้** ว่าควร refactor
- ระบุว่าส่วนไหนควรแยกออก พร้อมเหตุผล

### 2. ตรวจสอบโค้ดซ้ำ

- ก่อนเขียน function ใหม่ ให้ค้นหาว่ามี function คล้ายกันอยู่แล้วหรือไม่
- ถ้าพบโค้ดซ้ำ → สร้าง shared utility แล้วอัพเดททุกที่ที่ใช้

### 3. จัดการ imports

- ลบ unused imports ทุกครั้ง
- จัดเรียง imports: built-in → external → internal → relative

---

## ตัวอย่างการตั้งชื่อ

| ประเภท    | รูปแบบ                 | ตัวอย่าง                     |
| --------- | ---------------------- | ---------------------------- |
| Component | PascalCase.tsx         | `TaskDetailDrawer.tsx`       |
| Hook      | camelCase (use prefix) | `useTaskSteps.ts`            |
| Utility   | camelCase.ts           | `dateFormatter.js`           |
| Constants | camelCase.ts           | `taskConstants.ts`           |
| Service   | camelCase.ts           | `registrationTaskService.ts` |
| Type file | camelCase.ts           | `taskTypes.ts`               |
