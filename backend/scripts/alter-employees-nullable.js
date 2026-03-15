/**
 * Migration: ALTER TABLE employees
 * ทำให้ hire_date และ gender เป็น nullable
 * เพื่อให้สร้างพนักงานใหม่โดยไม่ต้องกรอกวันเริ่มงานและเพศ
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bmu_work_management',
    })

    try {
        // Check current column definitions
        const [cols] = await conn.query(
            "SHOW COLUMNS FROM employees WHERE Field IN ('hire_date', 'gender')"
        )
        console.log('Current column definitions:')
        cols.forEach(col => {
            console.log(`  ${col.Field}: Type=${col.Type}, Null=${col.Null}, Default=${col.Default}`)
        })

        // ALTER hire_date to allow NULL
        console.log('\nAltering hire_date to allow NULL...')
        await conn.query('ALTER TABLE employees MODIFY COLUMN hire_date DATE NULL DEFAULT NULL')
        console.log('✅ hire_date is now nullable')

        // ALTER gender to allow NULL
        console.log('Altering gender to allow NULL...')
        await conn.query("ALTER TABLE employees MODIFY COLUMN gender ENUM('male','female','other') NULL DEFAULT NULL")
        console.log('✅ gender is now nullable')

        // Verify
        const [newCols] = await conn.query(
            "SHOW COLUMNS FROM employees WHERE Field IN ('hire_date', 'gender')"
        )
        console.log('\nUpdated column definitions:')
        newCols.forEach(col => {
            console.log(`  ${col.Field}: Type=${col.Type}, Null=${col.Null}, Default=${col.Default}`)
        })

        console.log('\n🎉 Migration completed successfully!')
    } catch (error) {
        console.error('❌ Migration failed:', error.message)
    } finally {
        await conn.end()
    }
}

run()
