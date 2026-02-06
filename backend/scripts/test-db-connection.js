/**
 * Script สำหรับทดสอบการเชื่อมต่อ Database
 * Usage: node scripts/test-db-connection.js
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bmu_work_management',
  }

  console.log('🔍 Testing database connection...')
  console.log('📋 Configuration:')
  console.log(`   Host: ${config.host}`)
  console.log(`   Port: ${config.port}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Database: ${config.database}`)
  console.log('')

  try {
    const connection = await mysql.createConnection(config)
    
    console.log('✅ Database connected successfully!')
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users')
    console.log(`📊 Users in database: ${rows[0].count}`)
    
    await connection.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Connection failed!')
    console.error(`   Error: ${error.message}`)
    console.error('')
    console.error('💡 Troubleshooting:')
    console.error('   1. ตรวจสอบว่า MySQL/MariaDB กำลังรันอยู่')
    console.error('   2. ตรวจสอบ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD ใน .env')
    console.error('   3. ตรวจสอบว่า database และ user มีอยู่จริง')
    console.error('   4. ตรวจสอบ Firewall settings')
    console.error('   5. ลองใช้ Local IP address แทน QuickConnect host')
    process.exit(1)
  }
}

testConnection()
