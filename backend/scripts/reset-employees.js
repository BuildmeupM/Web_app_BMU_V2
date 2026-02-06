/**
 * Reset Employees Script
 * Script สำหรับรีเซ็ตข้อมูลพนักงานทั้งหมดในฐานข้อมูล
 * 
 * ⚠️ คำเตือน: Script นี้จะลบข้อมูลพนักงานทั้งหมด (hard delete)
 * ใช้เฉพาะเมื่อต้องการรีเซ็ตข้อมูลเพื่อนำเข้าใหม่
 * 
 * Usage: node scripts/reset-employees.js
 */

import pool from '../config/database.js'
import { testConnection } from '../config/database.js'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function resetEmployees() {
  try {
    console.log('🔄 Reset Employees Script')
    console.log('=' .repeat(50))
    
    // Test database connection
    console.log('\n📡 กำลังเชื่อมต่อฐานข้อมูล...')
    const connected = await testConnection()
    if (!connected) {
      console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้')
      process.exit(1)
    }

    // Get current count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM employees'
    )
    const totalEmployees = countResult[0].total

    const [activeCount] = await pool.execute(
      "SELECT COUNT(*) as total FROM employees WHERE status = 'active' AND deleted_at IS NULL"
    )
    const activeEmployees = activeCount[0].total

    const [deletedCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM employees WHERE deleted_at IS NOT NULL'
    )
    const deletedEmployees = deletedCount[0].total

    console.log('\n📊 สถิติข้อมูลปัจจุบัน:')
    console.log(`   - ข้อมูลทั้งหมด: ${totalEmployees} รายการ`)
    console.log(`   - ข้อมูลที่ยังไม่ถูกลบ: ${activeEmployees} รายการ`)
    console.log(`   - ข้อมูลที่ถูกลบ (soft delete): ${deletedEmployees} รายการ`)

    // Confirmation
    console.log('\n⚠️  คำเตือน: Script นี้จะลบข้อมูลพนักงานทั้งหมด (hard delete)')
    console.log('   - ข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้')
    console.log('   - Foreign keys (user_id) จะถูก set เป็น NULL')
    console.log('   - ข้อมูลใน users table จะไม่ถูกลบ')

    const confirm1 = await question('\n❓ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมด? (พิมพ์ "YES" เพื่อยืนยัน): ')
    if (confirm1 !== 'YES') {
      console.log('❌ ยกเลิกการรีเซ็ตข้อมูล')
      rl.close()
      process.exit(0)
    }

    const confirm2 = await question('❓ ยืนยันอีกครั้ง: พิมพ์ "CONFIRM" เพื่อดำเนินการ: ')
    if (confirm2 !== 'CONFIRM') {
      console.log('❌ ยกเลิกการรีเซ็ตข้อมูล')
      rl.close()
      process.exit(0)
    }

    console.log('\n🔄 กำลังรีเซ็ตข้อมูล...')

    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Step 1: Set user_id to NULL for all employees (to avoid foreign key constraint)
      console.log('   📝 กำลังลบ foreign key references (user_id)...')
      await connection.execute('UPDATE employees SET user_id = NULL')
      console.log('   ✅ ลบ foreign key references สำเร็จ')

      // Step 2: Delete all employees (hard delete)
      console.log('   🗑️  กำลังลบข้อมูลพนักงานทั้งหมด...')
      const [deleteResult] = await connection.execute('DELETE FROM employees')
      console.log(`   ✅ ลบข้อมูลสำเร็จ: ${deleteResult.affectedRows} รายการ`)

      // Step 3: Reset AUTO_INCREMENT (if exists)
      console.log('   🔄 กำลังรีเซ็ต AUTO_INCREMENT...')
      try {
        await connection.execute('ALTER TABLE employees AUTO_INCREMENT = 1')
        console.log('   ✅ รีเซ็ต AUTO_INCREMENT สำเร็จ')
      } catch (error) {
        // AUTO_INCREMENT might not exist if using UUID
        console.log('   ℹ️  ไม่มี AUTO_INCREMENT (ใช้ UUID)')
      }

      // Commit transaction
      await connection.commit()
      console.log('\n✅ รีเซ็ตข้อมูลสำเร็จ!')

      // Verify
      const [verifyResult] = await pool.execute('SELECT COUNT(*) as total FROM employees')
      console.log(`\n📊 จำนวนข้อมูลหลังรีเซ็ต: ${verifyResult[0].total} รายการ`)

      console.log('\n💡 ขั้นตอนถัดไป:')
      console.log('   1. ใช้หน้าเว็บ "นำเข้าจาก Excel" เพื่อนำเข้าข้อมูลใหม่')
      console.log('   2. หรือใช้ API POST /api/employees เพื่อเพิ่มข้อมูลทีละรายการ')

    } catch (error) {
      // Rollback on error
      await connection.rollback()
      throw error
    } finally {
      connection.release()
      rl.close()
    }

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run script
resetEmployees()
