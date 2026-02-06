/**
 * Generate Client Excel Template
 * Script สำหรับสร้าง Excel template สำหรับนำเข้าข้อมูลลูกค้า
 */

import xlsx from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define template columns
const columns = [
  { header: 'Build Code', key: 'build', required: true, example: '001' },
  { header: 'ชื่อบริษัท', key: 'company_name', required: true, example: 'บริษัท ABC จำกัด' },
  { header: 'ประเภทกิจการ', key: 'business_type', required: false, example: 'บริษัทจำกัด' },
  { header: 'เลขทะเบียนนิติบุคคล', key: 'legal_entity_number', required: false, example: '1234567890123' },
  { header: 'วันจัดตั้งกิจการ', key: 'establishment_date', required: false, example: '2020-01-15' },
  { header: 'ประเภทธุรกิจ', key: 'business_category', required: false, example: 'การค้าปลีก' },
  { header: 'ประเภทธุรกิจย่อย', key: 'business_subcategory', required: false, example: 'ค้าปลีกสินค้าทั่วไป' },
  { header: 'ไซต์บริษัท', key: 'company_size', required: false, example: 'M' },
  { header: 'สถานะจดภาษีมูลค่าเพิ่ม', key: 'tax_registration_status', required: false, example: 'จดภาษีมูลค่าเพิ่ม' },
  { header: 'วันที่จดภาษีมูลค่าเพิ่ม', key: 'vat_registration_date', required: false, example: '2020-02-01' },
  { header: 'ที่อยู่รวม', key: 'full_address', required: false, example: '123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร 10110' },
  { header: 'หมู่บ้าน', key: 'village', required: false, example: '' },
  { header: 'อาคาร', key: 'building', required: false, example: '' },
  { header: 'ห้องเลขที่', key: 'room_number', required: false, example: '' },
  { header: 'ชั้นที่', key: 'floor_number', required: false, example: '' },
  { header: 'เลขที่', key: 'address_number', required: false, example: '123' },
  { header: 'ซอย/ตรอก', key: 'soi', required: false, example: 'สุขุมวิท 39' },
  { header: 'หมู่ที่', key: 'moo', required: false, example: '' },
  { header: 'ถนน', key: 'road', required: false, example: 'สุขุมวิท' },
  { header: 'แขวง/ตำบล', key: 'subdistrict', required: false, example: 'คลองตัน' },
  { header: 'อำเภอ/เขต', key: 'district', required: false, example: 'คลองตัน' },
  { header: 'จังหวัด', key: 'province', required: false, example: 'กรุงเทพมหานคร' },
  { header: 'รหัสไปรษณี', key: 'postal_code', required: false, example: '10110' },
  { header: 'สถานะบริษัท', key: 'company_status', required: false, example: 'รายเดือน' },
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
for (let i = 0; i < 5; i++) {
  worksheetData.push(columns.map(() => ''))
}

// Create worksheet
const worksheet = xlsx.utils.aoa_to_sheet(worksheetData)

// Set column widths
const columnWidths = columns.map((col) => {
  // Calculate width based on header length
  const headerLength = col.header.length
  return { wch: Math.max(headerLength + 2, 15) }
})
worksheet['!cols'] = columnWidths

// Add worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Clients')

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../../public/templates')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write file
const outputPath = path.join(outputDir, 'client_import_template.xlsx')
xlsx.writeFile(workbook, outputPath)

console.log('✅ Client Excel template generated successfully!')
console.log(`📁 Output: ${outputPath}`)
console.log(`\n📋 Template includes:`)
console.log(`   - ${columns.length} columns`)
console.log(`   - Header row`)
console.log(`   - Example row`)
console.log(`   - 5 empty rows for data entry`)
console.log(`\n📝 Required fields:`)
columns
  .filter((col) => col.required)
  .forEach((col) => {
    console.log(`   - ${col.header} (${col.key})`)
  })
