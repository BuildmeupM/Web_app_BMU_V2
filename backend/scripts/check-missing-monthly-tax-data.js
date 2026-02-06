/**
 * Script to check for missing monthly_tax_data records
 * 
 * Usage: node scripts/check-missing-monthly-tax-data.js [build_code] [year] [month]
 * 
 * This script will:
 * 1. Check if monthly_tax_data exists for work_assignments
 * 2. Report missing records
 * 3. Suggest fixes
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
}

async function checkMissingData(buildCode = null, year = 2026, month = 1) {
  let connection
  try {
    console.log('🔌 Connecting to database...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connected to database')

    // Build WHERE clause
    let whereClause = 'wa.deleted_at IS NULL'
    const params = []

    if (buildCode) {
      whereClause += ' AND wa.build = ?'
      params.push(buildCode)
    } else {
      whereClause += ' AND wa.assignment_year = ? AND wa.assignment_month = ?'
      params.push(year, month)
    }

    // Find work_assignments without corresponding monthly_tax_data
    const [missingData] = await connection.execute(
      `SELECT 
        wa.build,
        wa.assignment_year,
        wa.assignment_month,
        wa.accounting_responsible,
        c.company_name,
        c.deleted_at as client_deleted_at,
        mtd.id as monthly_tax_data_id,
        mtd.deleted_at as monthly_tax_data_deleted_at
      FROM work_assignments wa
      LEFT JOIN clients c ON wa.build = c.build AND c.deleted_at IS NULL
      LEFT JOIN monthly_tax_data mtd ON wa.build = mtd.build 
        AND wa.assignment_year = mtd.tax_year 
        AND wa.assignment_month = mtd.tax_month 
        AND mtd.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY wa.build, wa.assignment_year, wa.assignment_month`,
      params
    )

    console.log('\n📊 Missing Monthly Tax Data Report:')
    console.log('=' .repeat(80))

    if (missingData.length === 0) {
      console.log('✅ No missing data found!')
      return
    }

    const missing = missingData.filter(row => !row.monthly_tax_data_id)
    const deleted = missingData.filter(row => row.monthly_tax_data_deleted_at)
    const noClient = missingData.filter(row => !row.company_name && !row.client_deleted_at)

    console.log(`\n📋 Total work_assignments checked: ${missingData.length}`)
    console.log(`❌ Missing monthly_tax_data: ${missing.length}`)
    console.log(`🗑️  Deleted monthly_tax_data: ${deleted.length}`)
    console.log(`🏢 Missing client: ${noClient.length}`)

    if (missing.length > 0) {
      console.log('\n❌ Missing monthly_tax_data records:')
      missing.forEach(row => {
        console.log(`  - Build: ${row.build} (${row.company_name || 'NO CLIENT'}), Year: ${row.assignment_year}, Month: ${row.assignment_month}`)
        console.log(`    Accounting Responsible: ${row.accounting_responsible || 'NULL'}`)
      })
    }

    if (deleted.length > 0) {
      console.log('\n🗑️  Deleted monthly_tax_data records:')
      deleted.forEach(row => {
        console.log(`  - Build: ${row.build} (${row.company_name || 'NO CLIENT'}), Year: ${row.assignment_year}, Month: ${row.assignment_month}`)
        console.log(`    Deleted at: ${row.monthly_tax_data_deleted_at}`)
      })
    }

    if (noClient.length > 0) {
      console.log('\n🏢 Missing client records:')
      noClient.forEach(row => {
        console.log(`  - Build: ${row.build}, Year: ${row.assignment_year}, Month: ${row.assignment_month}`)
      })
    }

    console.log('\n💡 Suggestions:')
    if (missing.length > 0) {
      console.log('  1. Run resetMonthlyData for missing builds to create monthly_tax_data')
      console.log('  2. Check if work_assignments were created correctly')
    }
    if (deleted.length > 0) {
      console.log('  1. Check why monthly_tax_data was deleted')
      console.log('  2. Consider restoring deleted records if needed')
    }
    if (noClient.length > 0) {
      console.log('  1. Check if clients exist in clients table')
      console.log('  2. Check if clients were deleted (deleted_at)')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Get command line arguments
const buildCode = process.argv[2] || null
const year = parseInt(process.argv[3]) || 2026
const month = parseInt(process.argv[4]) || 1

checkMissingData(buildCode, year, month)
