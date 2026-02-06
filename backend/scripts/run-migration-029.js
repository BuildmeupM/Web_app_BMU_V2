/**
 * Script to run Migration 029: Add Performance Indexes for monthly_tax_data
 * 
 * Usage: node scripts/run-migration-029.js
 * 
 * This script will:
 * 1. Check if indexes already exist
 * 2. Create indexes if they don't exist
 * 3. Report the results
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Buildmeup23.04.2022',
  database: process.env.DB_NAME || 'bmu_work_management',
}

const indexes = [
  {
    name: 'idx_monthly_tax_data_wht_filer',
    sql: 'CREATE INDEX idx_monthly_tax_data_wht_filer ON monthly_tax_data(wht_filer_employee_id, deleted_at)',
    description: 'Composite index for wht_filer_employee_id + deleted_at',
  },
  {
    name: 'idx_monthly_tax_data_vat_filer',
    sql: 'CREATE INDEX idx_monthly_tax_data_vat_filer ON monthly_tax_data(vat_filer_employee_id, deleted_at)',
    description: 'Composite index for vat_filer_employee_id + deleted_at',
  },
  {
    name: 'idx_monthly_tax_data_accounting_year_month',
    sql: 'CREATE INDEX idx_monthly_tax_data_accounting_year_month ON monthly_tax_data(accounting_responsible, tax_year, tax_month, deleted_at)',
    description: 'Composite index for accounting_responsible + tax_year + tax_month + deleted_at',
  },
  {
    name: 'idx_monthly_tax_data_inspection_year_month',
    sql: 'CREATE INDEX idx_monthly_tax_data_inspection_year_month ON monthly_tax_data(tax_inspection_responsible, tax_year, tax_month, deleted_at)',
    description: 'Composite index for tax_inspection_responsible + tax_year + tax_month + deleted_at',
  },
  {
    name: 'idx_monthly_tax_data_wht_year_month',
    sql: 'CREATE INDEX idx_monthly_tax_data_wht_year_month ON monthly_tax_data(wht_filer_employee_id, tax_year, tax_month, deleted_at)',
    description: 'Composite index for wht_filer_employee_id + tax_year + tax_month + deleted_at',
  },
  {
    name: 'idx_monthly_tax_data_vat_year_month',
    sql: 'CREATE INDEX idx_monthly_tax_data_vat_year_month ON monthly_tax_data(vat_filer_employee_id, tax_year, tax_month, deleted_at)',
    description: 'Composite index for vat_filer_employee_id + tax_year + tax_month + deleted_at',
  },
]

async function checkIndexExists(connection, indexName) {
  try {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'monthly_tax_data' 
       AND INDEX_NAME = ?`,
      [indexName]
    )
    return rows[0].count > 0
  } catch (error) {
    console.error(`Error checking index ${indexName}:`, error.message)
    return false
  }
}

async function runMigration() {
  let connection
  try {
    console.log('🔌 Connecting to database...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connected to database')

    console.log('\n📊 Checking existing indexes...')
    const results = []

    for (const index of indexes) {
      const exists = await checkIndexExists(connection, index.name)
      results.push({ ...index, exists })
      
      if (exists) {
        console.log(`  ✅ ${index.name} - Already exists`)
      } else {
        console.log(`  ❌ ${index.name} - Not found`)
      }
    }

    console.log('\n🔨 Creating missing indexes...')
    let created = 0
    let skipped = 0

    for (const index of results) {
      if (index.exists) {
        skipped++
        continue
      }

      try {
        console.log(`  Creating ${index.name}...`)
        await connection.execute(index.sql)
        console.log(`  ✅ Created ${index.name}`)
        created++
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`  ⚠️  ${index.name} - Already exists (duplicate key)`)
          skipped++
        } else {
          console.error(`  ❌ Error creating ${index.name}:`, error.message)
          throw error
        }
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`  ✅ Created: ${created}`)
    console.log(`  ⏭️  Skipped: ${skipped}`)
    console.log(`  📋 Total: ${indexes.length}`)

    if (created > 0) {
      console.log('\n✅ Migration completed successfully!')
    } else {
      console.log('\n✅ All indexes already exist. No changes needed.')
    }

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
