# 🌐 Remote Database Connection Guide - Synology QuickConnect

## 📋 Overview

คู่มือการเชื่อมต่อ Database ที่อยู่บน Synology NAS ผ่าน QuickConnect

## 🔍 ข้อมูลจาก URL

จาก URL ที่ให้มา: `https://buildmeupconsultant.direct.quickconnect.to:23464`

- **Host**: `buildmeupconsultant.direct.quickconnect.to`
- **phpMyAdmin Port**: `23464` (นี่คือ port ของ web interface)
- **MySQL Port**: `3306` (default) หรืออาจจะเป็น port อื่น

## ⚙️ การตั้งค่า

### วิธีที่ 1: ใช้ QuickConnect Host (ถ้า MySQL port เปิดไว้)

แก้ไขไฟล์ `backend/.env`:

```env
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

**หมายเหตุ**: Port 3306 อาจจะไม่ทำงานผ่าน QuickConnect เพราะ QuickConnect มักจะเปิดเฉพาะ web services

### วิธีที่ 2: ใช้ Local IP Address (แนะนำ)

ถ้า Backend รันบนเครื่องเดียวกับที่เข้าถึง NAS ได้:

1. หา Local IP Address ของ Synology NAS:
   - เปิด Synology DSM
   - ไปที่ Control Panel > Network > Network Interface
   - ดู IP Address (เช่น `192.168.1.100`)

2. แก้ไขไฟล์ `backend/.env`:

```env
DB_HOST=192.168.1.100  # เปลี่ยนเป็น IP Address จริงของ NAS
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

### วิธีที่ 3: ใช้ SSH Tunnel (ถ้าต้องการความปลอดภัย)

ถ้า MySQL port ไม่เปิดจากภายนอก สามารถใช้ SSH tunnel:

```bash
# สร้าง SSH tunnel
ssh -L 3307:localhost:3306 admin@buildmeupconsultant.direct.quickconnect.to -p 22

# แล้วตั้งค่าใน .env
DB_HOST=localhost
DB_PORT=3307
```

## 🔧 ขั้นตอนการแก้ไข

### 1. ตรวจสอบ MySQL Port

ใน Synology DSM:
1. ไปที่ Package Center
2. เปิด MariaDB หรือ MySQL package
3. ดู port ที่ตั้งค่าไว้ (ปกติคือ 3306)

### 2. ตรวจสอบ Firewall

ใน Synology DSM:
1. ไปที่ Control Panel > Security > Firewall
2. ตรวจสอบว่า MySQL port (3306) ถูกเปิดไว้

### 3. ตรวจสอบ User Permissions

ใน phpMyAdmin:
1. ไปที่ User accounts
2. ตรวจสอบว่า user `root` มีสิทธิ์เข้าถึงจาก host ที่ต้องการ
3. อาจจะต้องเพิ่ม host `%` เพื่ออนุญาตการเข้าถึงจากทุก host

## 🧪 ทดสอบการเชื่อมต่อ

### ใช้ MySQL Client

```bash
mysql -h buildmeupconsultant.direct.quickconnect.to -P 3306 -u root -p
```

หรือ

```bash
mysql -h 192.168.1.100 -P 3306 -u root -p
```

### ใช้ Node.js Script

สร้างไฟล์ `backend/scripts/test-db-connection.js`:

```javascript
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    })
    
    console.log('✅ Database connected successfully!')
    await connection.end()
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testConnection()
```

รัน:
```bash
node scripts/test-db-connection.js
```

## 🚨 Troubleshooting

### Error: Access denied for user 'root'@'localhost'

**สาเหตุ**: MySQL user ไม่มีสิทธิ์เข้าถึงจาก host ที่ระบุ

**วิธีแก้**:
1. เข้า phpMyAdmin
2. ไปที่ User accounts
3. แก้ไข user `root`
4. เพิ่ม Host: `%` (อนุญาตทุก host) หรือ host เฉพาะ

### Error: Can't connect to MySQL server

**สาเหตุ**: MySQL port ไม่เปิดหรือไม่สามารถเข้าถึงได้

**วิธีแก้**:
1. ตรวจสอบว่า MySQL/MariaDB กำลังรันอยู่
2. ตรวจสอบ Firewall settings
3. ลองใช้ Local IP แทน QuickConnect host
4. ลองใช้ SSH tunnel

### Error: Connection timeout

**สาเหตุ**: Network หรือ Firewall block

**วิธีแก้**:
1. ตรวจสอบ Network connection
2. ตรวจสอบ Firewall rules
3. ลองใช้ Local IP address

## 📝 ตัวอย่างการตั้งค่า

### สำหรับ Local Network

```env
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

### สำหรับ QuickConnect (ถ้า port เปิดไว้)

```env
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

### สำหรับ SSH Tunnel

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

---

**Last Updated**: 2026-01-29
