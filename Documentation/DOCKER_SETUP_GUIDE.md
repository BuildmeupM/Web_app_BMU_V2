# 🐳 Docker Setup Guide - คู่มือการติดตั้ง Docker

**Last Updated**: 2026-02-03

---

## 📋 Overview

คู่มือนี้จะช่วยคุณติดตั้ง Docker Desktop สำหรับ Windows เพื่อรัน Redis server

---

## 🚀 ขั้นตอนการติดตั้ง Docker Desktop

### Step 1: ดาวน์โหลด Docker Desktop

1. ไปที่เว็บไซต์: https://www.docker.com/products/docker-desktop/
2. คลิก "Download for Windows"
3. ดาวน์โหลดไฟล์ `Docker Desktop Installer.exe`

### Step 2: ติดตั้ง Docker Desktop

1. ดับเบิลคลิกไฟล์ `Docker Desktop Installer.exe`
2. ทำตามขั้นตอนการติดตั้ง (คลิก Next, Accept, Install)
3. **สำคัญ**: ต้อง restart เครื่องหลังติดตั้งเสร็จ

### Step 3: รัน Docker Desktop

1. เปิด Docker Desktop จาก Start Menu
2. รอให้ Docker Desktop เริ่มทำงาน (จะเห็น icon Docker ใน system tray)
3. ตรวจสอบว่า Docker ทำงานแล้ว:
   ```bash
   docker --version
   ```
   ควรเห็น: `Docker version 24.x.x` หรือใกล้เคียง

---

## ✅ ตรวจสอบการติดตั้ง

```bash
# ตรวจสอบว่า Docker ทำงานแล้ว
docker ps

# ควรเห็น: CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
# (อาจจะว่างเปล่า ถ้ายังไม่มี container)
```

---

## 🔴 รัน Redis Server

หลังจาก Docker Desktop ทำงานแล้ว:

```bash
# รัน Redis server
docker run -d -p 6379:6379 --name redis-bmu redis:7-alpine

# ตรวจสอบว่า Redis ทำงานแล้ว
docker ps

# ควรเห็น redis-bmu container
```

---

## 🛠️ คำสั่ง Docker ที่ใช้บ่อย

```bash
# ดู container ทั้งหมด (รวมที่หยุดแล้ว)
docker ps -a

# เริ่ม Redis container
docker start redis-bmu

# หยุด Redis container
docker stop redis-bmu

# ลบ Redis container
docker rm redis-bmu

# ดู logs ของ Redis
docker logs redis-bmu

# เข้าไปใน Redis container
docker exec -it redis-bmu sh
```

---

## ⚠️ Troubleshooting

### ปัญหา: Docker Desktop ไม่ start

**วิธีแก้**:
1. ตรวจสอบว่า Windows Features: "Virtual Machine Platform" และ "Windows Subsystem for Linux" เปิดอยู่
2. Restart เครื่อง
3. เปิด Docker Desktop อีกครั้ง

### ปัญหา: Port 6379 ถูกใช้งานแล้ว

**วิธีแก้**:
```bash
# ใช้ port อื่นแทน
docker run -d -p 6380:6379 --name redis-bmu redis:7-alpine

# แล้วอัพเดท .env:
# REDIS_PORT=6380
```

---

## 📚 References

- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

---

**Last Updated**: 2026-02-03
