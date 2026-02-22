---
description: ขั้นตอนการตรวจสอบ build หลังแก้ไขโค้ด
---

# วิธีตรวจสอบ Build หลังแก้ไขโค้ด

## กฎสำคัญ

- **ห้าม** ใช้ `run_command` สำหรับคำสั่งที่ใช้เวลานาน เช่น `tsc`, `vite build`, `npm run dev`, `npm install`
- **ให้** บอกผู้ใช้ว่าต้องรันคำสั่งอะไร แล้วผู้ใช้จะรันเองใน terminal ภายนอก
- **ให้** ใช้ `read_terminal` เพื่ออ่านผลลัพธ์จาก terminal ของผู้ใช้

## ขั้นตอน

1. **แจ้งคำสั่งที่ต้องรัน** — บอกผู้ใช้ว่าต้องรันคำสั่งอะไรบ้าง พร้อมอธิบายว่าแต่ละคำสั่งทำอะไร เช่น:
   - `npx tsc --noEmit` — ตรวจ TypeScript errors
   - `npx vite build` — build production bundle
   - `npm run dev` — รัน dev server
   - `node --check <file>` — ตรวจ syntax ไฟล์ JavaScript

2. **รอผู้ใช้แจ้งกลับ** — รอจนกว่าผู้ใช้จะบอกว่ารันเสร็จแล้ว หรือแจ้ง terminal process ID มา

// turbo 3. **อ่านผลลัพธ์จาก terminal** — ใช้ `read_terminal` tool เพื่ออ่าน output จาก terminal ที่ผู้ใช้แจ้งมา

4. **วิเคราะห์ผลลัพธ์** — ตรวจสอบว่า:
   - มี error ใหม่จากไฟล์ที่แก้ไขหรือไม่
   - error ที่เห็นเป็น pre-existing หรือเป็น error ใหม่
   - สรุปผลให้ผู้ใช้ทราบ

## คำสั่งที่ agent รันเองได้ (สั้นและเร็ว)

- `dir`, `type`, `echo` — คำสั่ง Windows พื้นฐาน
- `git status`, `git diff`, `git log -n 5` — ดูสถานะ Git
- `node -e "console.log('test')"` — คำสั่ง Node.js สั้นๆ
