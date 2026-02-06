/**
 * Script to create missing monthly_tax_data records from work_assignments
 * 
 * Usage: node scripts/create-missing-monthly-tax-data.js [build_code] [year] [month]
 * 
 * This script will:
 * 1. Find work_assignments without corresponding monthly_tax_data
 * 2. Create monthly_tax_data records automatically
 * 3. Report the results
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { generateUUID } from '../utils/leaveHelpers.js'

dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Buildmeup23.04.2022',
  database: process.env.DB_NAME || 'bmu_work_management',
}

async function createMissingMonthlyTaxData(buildCode = null, year = 2026, month = 1) {
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
        wa.tax_inspection_responsible,
        wa.wht_filer_responsible,
        wa.vat_filer_responsible,
        wa.document_entry_responsible,
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
    console.log('='.repeat(80))

    if (missingData.length === 0) {
      console.log('✅ No work_assignments found!')
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

      // Ask for confirmation
      console.log('\n⚠️  Do you want to create missing monthly_tax_data records?')
      console.log('   This will create records for:', missing.length, 'work_assignments')
      
      // For now, auto-create (can be made interactive later)
      console.log('\n🔨 Creating missing monthly_tax_data records...')
      
      await connection.beginTransaction()
      
      let created = 0
      let errors = []

      for (const row of missing) {
        try {
          // Check if client exists
          if (!row.company_name && !row.client_deleted_at) {
            errors.push({
              build: row.build,
              error: 'Client not found or deleted',
            })
            continue
          }

          // Check if monthly_tax_data already exists (deleted)
          if (row.monthly_tax_data_deleted_at) {
            // Restore deleted record instead of creating new one
            const [existing] = await connection.execute(
              'SELECT id FROM monthly_tax_data WHERE build = ? AND tax_year = ? AND tax_month = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1',
              [row.build, row.assignment_year, row.assignment_month]
            )

            if (existing.length > 0) {
              await connection.execute(
                'UPDATE monthly_tax_data SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [existing[0].id]
              )
              console.log(`  ✅ Restored deleted record for build ${row.build}`)
              created++
              continue
            }
          }

          // Create new monthly_tax_data record
          const monthlyTaxDataId = generateUUID()
          await connection.execute(
            `INSERT INTO monthly_tax_data (
              id, build, tax_year, tax_month,
              accounting_responsible, tax_inspection_responsible,
              document_entry_responsible,
              wht_filer_employee_id, vat_filer_employee_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              monthlyTaxDataId,
              row.build,
              row.assignment_year,
              row.assignment_month,
              row.accounting_responsible || null,
              row.tax_inspection_responsible || null,
              row.document_entry_responsible || null,
              row.wht_filer_responsible || null,
              row.vat_filer_responsible || null,
            ]
          )

          console.log(`  ✅ Created monthly_tax_data for build ${row.build} (${row.company_name || 'NO CLIENT'})`)
          created++
        } catch (error) {
          errors.push({
            build: row.build,
            error: error.message,
          })
          console.error(`  ❌ Error creating monthly_tax_data for build ${row.build}:`, error.message)
        }
      }

      await connection.commit()

      console.log('\n📊 Creation Summary:')
      console.log(`  ✅ Created: ${created}`)
      console.log(`  ❌ Errors: ${errors.length}`)

      if (errors.length > 0) {
        console.log('\n❌ Errors:')
        errors.forEach(err => {
          console.log(`  - Build ${err.build}: ${err.error}`)
        })
      }
    }

    if (deleted.length > 0) {
      console.log('\n🗑️  Deleted monthly_tax_data records (not restored):')
      deleted.forEach(row => {
        console.log(`  - Build: ${row.build} (${row.company_name || 'NO CLIENT'}), Year: ${row.assignment_year}, Month: ${row.assignment_month}`)
        console.log(`    Deleted at: ${row.monthly_tax_data_deleted_at}`)
      })
    }

    if (noClient.length > 0) {
      console.log('\n🏢 Missing client records (skipped):')
      noClient.forEach(row => {
        console.log(`  - Build: ${row.build}, Year: ${row.assignment_year}, Month: ${row.assignment_month}`)
      })
    }

  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
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

createMissingMonthlyTaxData(buildCode, year, month)
