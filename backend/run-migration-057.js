// Temporary migration runner — run once then delete
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const sql = fs.readFileSync(
    path.join(__dirname, '..', 'Documentation', 'Database', 'migrations', '057_create_error_reports_table.sql'),
    'utf-8'
)

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
    })
    console.log('Connected to DB, running migration...')
    await conn.execute(sql)
    console.log('✅ Migration 057_create_error_reports_table completed!')
    await conn.end()
}

run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1) })
