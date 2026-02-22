---
trigger: always_on
---

# Local NAS MySQL Connection Rule

## Context
พื้นที่ทำงานนี้เชื่อมต่อกับฐานข้อมูล MySQL/MariaDB ภายในเครือข่าย (Local) ที่โฮสต์อยู่บน **Synology NAS**

## Database Details
* **Host IP: buildmeupconsultant.direct.quickconnect.to
* **Port: 3306
* **Default User: buildmeM
* **Primary Database: bmu_work_management

## Instructions for Agent
1. **Schema Check:** ต้องตรวจสอบโครงสร้างตาราง (Table Schema) ผ่าน MySQL MCP ทุกครั้งก่อนเขียน Query เพื่อความแม่นยำ
2. **Safety First:** เน้นการอ่านข้อมูล (SELECT) เป็นหลัก ห้ามลบ (DELETE) หรือแก้ไข (UPDATE) ข้อมูลโดยไม่ได้รับคำสั่งที่ชัดเจนจากผู้ใช้
3. **Error Handling:** หากเชื่อมต่อไม่ได้ ให้แนะนำผู้ใช้ตรวจสอบ Firewall ของ NAS และสิทธิ์ "Remote Access" ใน MariaDB
4. **Language:** สามารถสื่อสารและอธิบายโค้ดเป็นภาษาไทยได้