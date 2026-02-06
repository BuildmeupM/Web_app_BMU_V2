/**
 * Generate Work Assignment Excel Template
 * Script สำหรับสร้าง Excel template สำหรับนำเข้าข้อมูลการจัดงานรายเดือน
 */

import xlsx from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define template columns
const columns = [
  { header: 'Build Code', key: 'build', required: true, example: '001', description: 'รหัสลูกค้า (เช่น 001, 122, 122.1)' },
  { header: 'ปีภาษี', key: 'assignment_year', required: true, example: '2026', description: 'ปีภาษี (เช่น 2026)' },
  { header: 'เดือนภาษี', key: 'assignment_month', required: true, example: '1', description: 'เดือนภาษี (1-12)' },
  { header: 'ผู้ทำบัญชี (รหัสพนักงาน)', key: 'accounting_responsible', required: false, example: 'AC00034', description: 'รหัสพนักงานผู้รับผิดชอบทำบัญชี' },
  { header: 'ผู้ตรวจภาษี (รหัสพนักงาน)', key: 'tax_inspection_responsible', required: false, example: 'AC00035', description: 'รหัสพนักงานผู้รับผิดชอบตรวจภาษี' },
  { header: 'ผู้ยื่น WHT (รหัสพนักงาน)', key: 'wht_filer_responsible', required: false, example: 'AC00036', description: 'รหัสพนักงานผู้รับผิดชอบยื่น WHT' },
  { header: 'ผู้ยื่น VAT (รหัสพนักงาน)', key: 'vat_filer_responsible', required: false, example: 'AC00037', description: 'รหัสพนักงานผู้รับผิดชอบยื่น VAT' },
  { header: 'ผู้คีย์เอกสาร (รหัสพนักงาน)', key: 'document_entry_responsible', required: false, example: 'AC00038', description: 'รหัสพนักงานผู้รับผิดชอบคีย์เอกสาร' },
  { header: 'หมายเหตุ', key: 'assignment_note', required: false, example: 'หมายเหตุการจัดงาน', description: 'หมายเหตุเพิ่มเติม (ถ้ามี)' },
]

// Create workbook
const workbook = xlsx.utils.book_new()

// Create worksheet data
const worksheetData = []

// Add header row
const headerRow = columns.map((col) => col.header)
worksheetData.push(headerRow)

// Add example row
const exampleRow = columns.map((col) => col.example || '')
worksheetData.push(exampleRow)

// Add empty rows for user to fill
for (let i = 0; i < 10; i++) {
  worksheetData.push(columns.map(() => ''))
}

// Create worksheet
const worksheet = xlsx.utils.aoa_to_sheet(worksheetData)

// Set column widths
const columnWidths = columns.map((col) => {
  // Calculate width based on header length
  const headerLength = col.header.length
  return { wch: Math.max(headerLength + 5, 20) }
})
worksheet['!cols'] = columnWidths

// Add worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Work Assignments')

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../../public/templates')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write file
const outputPath = path.join(outputDir, 'work_assignment_import_template.xlsx')
xlsx.writeFile(workbook, outputPath)

console.log('✅ Work Assignment Excel template generated successfully!')
console.log(`📁 Output: ${outputPath}`)
console.log(`\n📋 Template includes:`)
console.log(`   - ${columns.length} columns`)
console.log(`   - Header row`)
console.log(`   - Example row`)
console.log(`   - 10 empty rows for data entry`)
console.log(`\n📝 Required fields:`)
columns
  .filter((col) => col.required)
  .forEach((col) => {
    console.log(`   - ${col.header} (${col.key})`)
  })
console.log(`\n📖 Optional fields:`)
columns
  .filter((col) => !col.required)
  .forEach((col) => {
    console.log(`   - ${col.header} (${col.key})`)
  })
