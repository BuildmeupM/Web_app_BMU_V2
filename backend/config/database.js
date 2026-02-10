/**
 * Database Configuration
 * การตั้งค่าการเชื่อมต่อ MySQL/MariaDB
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Buildmeup23.04.2022',
  database: process.env.DB_NAME || 'bmu_work_management',
  waitForConnections: true,
  connectionLimit: 20, // ✅ Performance: เพิ่มจาก 10 เป็น 20 เพื่อรองรับ concurrent users ได้มากขึ้น
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00', // ✅ สำคัญ: ตั้ง timezone เป็น Bangkok (UTC+7) เพื่อให้ mysql2 แปลง DATETIME ถูกต้อง ทั้ง local และ cloud (Railway/UTC)
  // เพิ่มการจัดการ connection ที่ขาด
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // ส่ง TCP keep-alive ทุก 10 วินาที ป้องกัน stale connection (ETIMEDOUT)
  // ✅ Performance: timeout configuration
  // ⚠️ สำคัญ: MySQL2 รองรับเฉพาะ connectTimeout สำหรับการเชื่อมต่อครั้งแรก
  // ไม่มี acquireTimeout และ timeout options สำหรับ createPool
  connectTimeout: 60000, // 60 seconds timeout สำหรับ initial connection (default: 10000)
}

// สร้าง connection pool
const pool = mysql.createPool(dbConfig)

// ✅ Handle connection pool errors
pool.on('connection', (connection) => {
  console.log('✅ [DB Pool] New connection established:', connection.threadId)

  // ⚠️ สำคัญ: ไม่ตั้งค่า timezone เพื่อให้ MySQL ส่งคืน DATETIME/TIMESTAMP ตามที่เก็บในฐานข้อมูล
  // เพื่อให้แสดงเวลาตามที่เก็บในฐานข้อมูลโดยไม่แปลง timezone
  // connection.query('SET time_zone = "+00:00"', (err) => {
  //   if (err) {
  //     console.error('⚠️ [DB Connection] Failed to set timezone to UTC:', err.message)
  //   } else {
  //     console.log('✅ [DB Connection] Timezone set to UTC for connection:', connection.threadId)
  //   }
  // })

  // Handle connection errors
  connection.on('error', (err) => {
    console.error('❌ [DB Connection Error]:', {
      threadId: connection.threadId,
      code: err.code,
      message: err.message,
      fatal: err.fatal,
    })

    // If connection is fatal, it will be removed from pool automatically
    if (err.fatal) {
      console.error('⚠️ [DB Connection] Fatal error, connection will be removed from pool')
    }
  })
})

// pool.on('acquire') และ pool.on('release') ถูกลบออกเพื่อลด log ที่รก
// หากต้องการ debug connection pool สามารถเพิ่มกลับได้

// ✅ Handle pool errors
pool.on('error', (err) => {
  console.error('❌ [DB Pool Error]:', {
    code: err.code,
    message: err.message,
    stack: err.stack,
  })

  // Don't exit process - let it recover
  // The pool will try to reconnect automatically
})

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ Database connected successfully')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
    return false
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    totalConnections: pool.pool?._allConnections?.length || 0,
    freeConnections: pool.pool?._freeConnections?.length || 0,
    queuedRequests: pool.pool?._connectionQueue?.length || 0,
  }
}

export default pool
