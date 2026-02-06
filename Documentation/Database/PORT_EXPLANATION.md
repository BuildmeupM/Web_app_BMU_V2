# 🔌 Port Explanation - MySQL vs phpMyAdmin

## 📋 Overview

เมื่อเชื่อมต่อ Database บน Synology NAS ต้องเข้าใจความแตกต่างระหว่าง ports

## 🔍 Ports ที่เกี่ยวข้อง

### Port 23464 - phpMyAdmin (Web Interface)
- **ใช้สำหรับ**: เข้าถึง phpMyAdmin ผ่าน web browser
- **URL**: `https://buildmeupconsultant.direct.quickconnect.to:23464`
- **ไม่ใช่**: MySQL/MariaDB connection port
- **ใช้เมื่อ**: ต้องการจัดการ database ผ่าน web interface

### Port 3306 - MySQL/MariaDB (Database Server)
- **ใช้สำหรับ**: เชื่อมต่อ MySQL/MariaDB โดยตรง (Node.js, Python, etc.)
- **Default port**: `3306` (standard MySQL port)
- **ใช้เมื่อ**: Backend API ต้องการเชื่อมต่อ database

## ⚠️ ข้อผิดพลาดที่พบบ่อย

### ❌ ผิด: ใช้ port 23464 สำหรับ MySQL connection

```env
# ❌ ผิด
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=23464  # ← นี่คือ port ของ phpMyAdmin ไม่ใช่ MySQL!
```

**Error ที่จะได้**:
- `connect ETIMEDOUT` - ไม่สามารถเชื่อมต่อได้
- `ECONNREFUSED` - connection ถูกปฏิเสธ

### ✅ ถูก: ใช้ port 3306 สำหรับ MySQL connection

```env
# ✅ ถูก
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306  # ← นี่คือ MySQL port
```

## 📝 การตั้งค่าใน `.env`

### สำหรับ MySQL Connection (Backend API)

```env
# Database Configuration
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306                    # ← MySQL port (ไม่ใช่ 23464)
DB_USER=buildmeM
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

### สำหรับ phpMyAdmin (Web Browser)

- **URL**: `https://buildmeupconsultant.direct.quickconnect.to:23464`
- ไม่ต้องตั้งค่าใน `.env`
- เข้าได้ผ่าน web browser เท่านั้น

## 🔧 ตรวจสอบ MySQL Port

### ใน Synology DSM

1. เปิด **Package Center**
2. หา **MariaDB 10** หรือ **MySQL**
3. เปิด **MariaDB 10** > **Information**
4. ดู **Port**: ปกติจะเป็น `3306`

### ใน phpMyAdmin

1. เข้า phpMyAdmin: `https://buildmeupconsultant.direct.quickconnect.to:23464`
2. ดูที่ **Information** section
3. **Port**: จะแสดง `3306` (MySQL port)

## 🚨 Troubleshooting

### Error: `connect ETIMEDOUT` เมื่อใช้ port 23464

**สาเหตุ**: ใช้ port ของ phpMyAdmin แทน MySQL port

**วิธีแก้**:
1. เปลี่ยน `DB_PORT` ใน `.env` จาก `23464` เป็น `3306`
2. รัน `node scripts/test-db-connection.js` อีกครั้ง

### Error: `connect ETIMEDOUT` แม้ใช้ port 3306

**สาเหตุ**: MySQL port อาจจะไม่เปิดจากภายนอก หรือ QuickConnect ไม่รองรับ MySQL port

**วิธีแก้**:
1. ใช้ **Local IP Address** แทน QuickConnect host
2. หรือตั้งค่า **Port Forwarding** ใน router
3. หรือใช้ **SSH Tunnel** (ดู `Documentation/Database/REMOTE_CONNECTION.md`)

---

**Last Updated**: 2026-01-29
