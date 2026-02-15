/**
 * Script to generate Thailand province SVG data file
 * Fetches from @svg-maps/thailand and creates a TypeScript data file
 */
import fs from 'fs'
import path from 'path'

// English name -> Thai name mapping for all 77 provinces
const EN_TO_TH = {
    'Bangkok': 'กรุงเทพมหานคร',
    'Samut Prakan': 'สมุทรปราการ',
    'Nonthaburi': 'นนทบุรี',
    'Pathum Thani': 'ปทุมธานี',
    'Phra Nakhon Si Ayutthaya': 'พระนครศรีอยุธยา',
    'Ang Thong': 'อ่างทอง',
    'Lop Buri': 'ลพบุรี',
    'Sing Buri': 'สิงห์บุรี',
    'Chai Nat': 'ชัยนาท',
    'Saraburi': 'สระบุรี',
    'Chon Buri': 'ชลบุรี',
    'Rayong': 'ระยอง',
    'Chanthaburi': 'จันทบุรี',
    'Trat': 'ตราด',
    'Chachoengsao': 'ฉะเชิงเทรา',
    'Prachin Buri': 'ปราจีนบุรี',
    'Nakhon Nayok': 'นครนายก',
    'Sa Kaeo': 'สระแก้ว',
    'Nakhon Ratchasima': 'นครราชสีมา',
    'Buriram': 'บุรีรัมย์',
    'Surin': 'สุรินทร์',
    'Si Sa Ket': 'ศรีสะเกษ',
    'Ubon Ratchathani': 'อุบลราชธานี',
    'Yasothon': 'ยโสธร',
    'Chaiyaphum': 'ชัยภูมิ',
    'Amnat Charoen': 'อำนาจเจริญ',
    'Bueng Kan': 'บึงกาฬ',
    'Nong Bua Lam Phu': 'หนองบัวลำภู',
    'Khon Kaen': 'ขอนแก่น',
    'Udon Thani': 'อุดรธานี',
    'Loei': 'เลย',
    'Nong Khai': 'หนองคาย',
    'Maha Sarakham': 'มหาสารคาม',
    'Roi Et': 'ร้อยเอ็ด',
    'Kalasin': 'กาฬสินธุ์',
    'Sakon Nakhon': 'สกลนคร',
    'Nakhon Phanom': 'นครพนม',
    'Mukdahan': 'มุกดาหาร',
    'Chiang Mai': 'เชียงใหม่',
    'Lamphun': 'ลำพูน',
    'Lampang': 'ลำปาง',
    'Uttaradit': 'อุตรดิตถ์',
    'Phrae': 'แพร่',
    'Nan': 'น่าน',
    'Phayao': 'พะเยา',
    'Chiang Rai': 'เชียงราย',
    'Mae Hong Son': 'แม่ฮ่องสอน',
    'Nakhon Sawan': 'นครสวรรค์',
    'Uthai Thani': 'อุทัยธานี',
    'Kamphaeng Phet': 'กำแพงเพชร',
    'Tak': 'ตาก',
    'Sukhothai': 'สุโขทัย',
    'Phitsanulok': 'พิษณุโลก',
    'Phichit': 'พิจิตร',
    'Phetchabun': 'เพชรบูรณ์',
    'Ratchaburi': 'ราชบุรี',
    'Kanchanaburi': 'กาญจนบุรี',
    'Suphan Buri': 'สุพรรณบุรี',
    'Nakhon Pathom': 'นครปฐม',
    'Samut Sakhon': 'สมุทรสาคร',
    'Samut Songkhram': 'สมุทรสงคราม',
    'Phetchaburi': 'เพชรบุรี',
    'Prachuap Khiri Khan': 'ประจวบคีรีขันธ์',
    'Nakhon Si Thammarat': 'นครศรีธรรมราช',
    'Krabi': 'กระบี่',
    'Phangnga': 'พังงา',
    'Phuket': 'ภูเก็ต',
    'Surat Thani': 'สุราษฎร์ธานี',
    'Ranong': 'ระนอง',
    'Chumphon': 'ชุมพร',
    'Songkhla': 'สงขลา',
    'Satun': 'สตูล',
    'Trang': 'ตรัง',
    'Phatthalung': 'พัทลุง',
    'Pattani': 'ปัตตานี',
    'Yala': 'ยะลา',
    'Narathiwat': 'นราธิวาส',
}

// Function to calculate centroid from SVG path
function getCentroid(pathData) {
    const coords = []
    // Extract all coordinate pairs from the path
    const parts = pathData.replace(/[mlhvcsqtaz]/gi, ' ').trim().split(/[\s,]+/)
    let x = 0, y = 0
    const pathCommands = pathData.match(/[mMlLhHvVcCsSqQtTaAzZ][^mMlLhHvVcCsSqQtTaAzZ]*/g)

    if (!pathCommands) return { cx: 0, cy: 0 }

    for (const cmd of pathCommands) {
        const type = cmd[0]
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

        if (type === 'm' || type === 'M') {
            if (type === 'M') { x = nums[0]; y = nums[1] }
            else { x += nums[0]; y += nums[1] }
            coords.push([x, y])
            // remaining pairs are implicit line-to
            for (let i = 2; i < nums.length; i += 2) {
                if (type === 'M') { x = nums[i]; y = nums[i + 1] }
                else { x += nums[i]; y += nums[i + 1] }
                coords.push([x, y])
            }
        } else if (type === 'l') {
            for (let i = 0; i < nums.length; i += 2) {
                x += nums[i]; y += nums[i + 1]
                coords.push([x, y])
            }
        } else if (type === 'L') {
            for (let i = 0; i < nums.length; i += 2) {
                x = nums[i]; y = nums[i + 1]
                coords.push([x, y])
            }
        }
        // For z/Z, just close
    }

    if (coords.length === 0) return { cx: 0, cy: 0 }

    // Simple average centroid
    const sumX = coords.reduce((s, c) => s + c[0], 0)
    const sumY = coords.reduce((s, c) => s + c[1], 0)
    return {
        cx: Math.round((sumX / coords.length) * 100) / 100,
        cy: Math.round((sumY / coords.length) * 100) / 100,
    }
}

async function main() {
    const res = await fetch('https://unpkg.com/@svg-maps/thailand@1.0.1/index.js')
    const text = await res.text()

    // Parse the JSON-like data from the module
    const jsonMatch = text.match(/\{.*\}/s)
    if (!jsonMatch) { console.error('Could not parse data'); return }

    const mapData = JSON.parse(jsonMatch[0])

    const provinces = mapData.locations.map(loc => {
        const thaiName = EN_TO_TH[loc.name] || loc.name
        const { cx, cy } = getCentroid(loc.path)
        return { name: thaiName, id: loc.id, path: loc.path, cx, cy }
    })

    // Generate TypeScript file
    let output = `/**
 * Thailand Province SVG Data
 * Source: @svg-maps/thailand (simplified, web-optimized)
 * ViewBox: 0 0 560 1025
 * 77 provinces with accurate boundary paths
 * Auto-generated — do not edit manually
 */

export interface ProvinceData {
  name: string   // Thai province name
  id: string     // Short ID
  path: string   // SVG path data
  cx: number     // Center X for label
  cy: number     // Center Y for label
}

export const SVG_VIEWBOX = '0 0 560 1025'

export const PROVINCES: ProvinceData[] = [\n`

    for (const p of provinces) {
        output += `  { name: '${p.name}', id: '${p.id}', path: '${p.path}', cx: ${p.cx}, cy: ${p.cy} },\n`
    }

    output += `]\n`

    const outPath = path.resolve('src/components/Client/thailandProvinceData.ts')
    fs.writeFileSync(outPath, output, 'utf-8')
    console.log(`✅ Generated ${provinces.length} provinces → ${outPath}`)
}

main().catch(console.error)
