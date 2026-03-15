/**
 * Script to run Migration 030: Update expenses_confirmed value
 * 
 * Usage: node scripts/run-migration-030.js
 * 
 * This script will:
 * 1. Update all records where expenses_confirmed = 'confirm_income' to 'confirm_expense'
 * 2. Report the number of updated records
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bmu_work_management',
}

async function runMigration() {
    let connection
    try {
        console.log('🔌 Connecting to database...')
        connection = await mysql.createConnection(dbConfig)
        console.log('✅ Connected to database')

        // Check current count of records
        console.log('\n📊 Checking current records...')
        const [countBefore] = await connection.execute(
            `SELECT COUNT(*) as count FROM monthly_tax_data WHERE expenses_confirmed = 'confirm_income'`
        )
        console.log(`  📋 Records with 'confirm_income': ${countBefore[0].count}`)

        if (countBefore[0].count === 0) {
            console.log('\n✅ No records to update. Migration not needed.')
            return
        }

        // Update records
        console.log('\n🔨 Updating records...')
        console.log(`  Changing: 'confirm_income' → 'confirm_expense'`)

        const [updateResult] = await connection.execute(
            `UPDATE monthly_tax_data SET expenses_confirmed = 'confirm_expense' WHERE expenses_confirmed = 'confirm_income'`
        )

        console.log(`  ✅ Updated ${updateResult.affectedRows} records`)

        // Verify
        console.log('\n📊 Verifying update...')
        const [countAfter] = await connection.execute(
            `SELECT COUNT(*) as count FROM monthly_tax_data WHERE expenses_confirmed = 'confirm_expense'`
        )
        console.log(`  📋 Records with 'confirm_expense': ${countAfter[0].count}`)

        const [remainingOld] = await connection.execute(
            `SELECT COUNT(*) as count FROM monthly_tax_data WHERE expenses_confirmed = 'confirm_income'`
        )
        console.log(`  📋 Records with 'confirm_income': ${remainingOld[0].count}`)

        console.log('\n📊 Migration Summary:')
        console.log(`  ✅ Updated: ${updateResult.affectedRows}`)
        console.log(`  📋 New value: 'confirm_expense'`)
        console.log('\n✅ Migration 030 completed successfully!')

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message)
        process.exit(1)
    } finally {
        if (connection) {
            await connection.end()
            console.log('\n🔌 Database connection closed')
        }
    }
}

runMigration()
