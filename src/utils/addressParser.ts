/**
 * Thai Address Parser Utility
 * แยกที่อยู่รวมภาษาไทยเป็นฟิลด์ย่อยอัตโนมัติ
 */

export interface ParsedAddress {
    address_number: string
    village: string
    building: string
    room_number: string
    floor_number: string
    soi: string
    moo: string
    road: string
    subdistrict: string
    district: string
    province: string
    postal_code: string
}

/**
 * Parse a Thai full address string into structured sub-fields.
 * 
 * Supports patterns like:
 * "123/4 หมู่บ้านสุขสันต์ อาคารเอบีซี ห้อง 501 ชั้น 5 ซอยลาดพร้าว 1 หมู่ 3 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900"
 */
export function parseThaiAddress(fullAddress: string): ParsedAddress {
    const result: ParsedAddress = {
        address_number: '',
        village: '',
        building: '',
        room_number: '',
        floor_number: '',
        soi: '',
        moo: '',
        road: '',
        subdistrict: '',
        district: '',
        province: '',
        postal_code: '',
    }

    if (!fullAddress || !fullAddress.trim()) return result

    let addr = fullAddress.trim()

    // 1. Extract postal code (5-digit number, usually at the end)
    // Also handles: รหัสไปรษณีย์ 20180
    const postalMatch = addr.match(/(?:รหัสไปรษณีย์\s*)?(\d{5})\s*$/)
    if (postalMatch) {
        result.postal_code = postalMatch[1]
        addr = addr.replace(postalMatch[0], '').trim()
    }

    // 2. Extract province
    // Match "จังหวัด...", "จ....", known provinces, or label-style "จังหวัด กรุงเทพมหานคร"
    const provincePatterns = [
        /(?:จังหวัด|จ\.)\s*([^\s,]+(?:\s+[^\s,]+)?)/,
        /(กรุงเทพ(?:มหานคร|ฯ)?)/,
    ]
    for (const pattern of provincePatterns) {
        const match = addr.match(pattern)
        if (match) {
            result.province = match[1] || match[0]
            addr = addr.replace(match[0], '').trim()
            break
        }
    }

    // 3. Extract district (เขต/อำเภอ/อ. or label-style อำเภอ/เขต)
    const districtPatterns = [
        /(?:อำเภอ\/เขต|เขต\/อำเภอ|เขต|อำเภอ|อ\.)\s*([^\s,]+(?:\s+[^\s,]+)?)/,
    ]
    for (const pattern of districtPatterns) {
        const match = addr.match(pattern)
        if (match) {
            result.district = match[1]
            addr = addr.replace(match[0], '').trim()
            break
        }
    }

    // 4. Extract subdistrict (แขวง/ตำบล/ต. or label-style แขวง/ตำบล)
    const subdistrictPatterns = [
        /(?:แขวง\/ตำบล|ตำบล\/แขวง|แขวง|ตำบล|ต\.)\s*([^\s,]+(?:\s+[^\s,]+)?)/,
    ]
    for (const pattern of subdistrictPatterns) {
        const match = addr.match(pattern)
        if (match) {
            result.subdistrict = match[1]
            addr = addr.replace(match[0], '').trim()
            break
        }
    }

    // 5. Extract road (ถนน/ถ.)
    const roadMatch = addr.match(/(?:ถนน|ถ\.)\s*([^\s,]+(?:\s+[^\s,]+)?)/)
    if (roadMatch) {
        result.road = roadMatch[1]
        addr = addr.replace(roadMatch[0], '').trim()
    }

    // 6. Extract soi (ซอย/ซ.)
    const soiMatch = addr.match(/(?:ซอย|ซ\.)\s*([^\s,]+(?:\s*\d+)?)/)
    if (soiMatch) {
        result.soi = soiMatch[1]
        addr = addr.replace(soiMatch[0], '').trim()
    }

    // 7. Extract moo (หมู่ที่/หมู่/ม.)  — number only
    const mooMatch = addr.match(/(?:หมู่ที่|หมู่\s*ที่|ม\.)\s*(\d+)/)
    if (mooMatch) {
        result.moo = mooMatch[1]
        addr = addr.replace(mooMatch[0], '').trim()
    } else {
        // Try "หมู่ N" (but NOT หมู่บ้าน)
        const mooMatch2 = addr.match(/หมู่\s+(\d+)/)
        if (mooMatch2) {
            result.moo = mooMatch2[1]
            addr = addr.replace(mooMatch2[0], '').trim()
        }
    }

    // 8. Extract floor (ชั้น/ชั้นที่)
    const floorMatch = addr.match(/(?:ชั้นที่|ชั้น)\s*(\d+[A-Za-z]?)/)
    if (floorMatch) {
        result.floor_number = floorMatch[1]
        addr = addr.replace(floorMatch[0], '').trim()
    }

    // 9. Extract room number (ห้อง/ห้องเลขที่)
    const roomMatch = addr.match(/(?:ห้องเลขที่|ห้อง)\s*(\S+)/)
    if (roomMatch) {
        result.room_number = roomMatch[1]
        addr = addr.replace(roomMatch[0], '').trim()
    }

    // 10. Extract building (อาคาร/ตึก)
    const buildingMatch = addr.match(/(?:อาคาร|ตึก)\s*([^\s,]+(?:\s+[^\s,]+)?)/)
    if (buildingMatch) {
        result.building = buildingMatch[1]
        addr = addr.replace(buildingMatch[0], '').trim()
    }

    // 11. Extract village (หมู่บ้าน)
    const villageMatch = addr.match(/(?:หมู่บ้าน)\s*([^\s,]+(?:\s+[^\s,]+)?)/)
    if (villageMatch) {
        result.village = villageMatch[1]
        addr = addr.replace(villageMatch[0], '').trim()
    }

    // 12. Extract address number (เลขที่ / บ้านเลขที่ / leading number like 123/4)
    const addrNumMatch = addr.match(/(?:เลขที่|บ้านเลขที่)\s*(\S+)/)
    if (addrNumMatch) {
        result.address_number = addrNumMatch[1]
        addr = addr.replace(addrNumMatch[0], '').trim()
    } else {
        // Try leading number pattern like "123" or "123/4" or "123/4-5"
        const leadingNumMatch = addr.match(/^(\d+(?:[\/\-]\d+)*)/)
        if (leadingNumMatch) {
            result.address_number = leadingNumMatch[1]
            addr = addr.replace(leadingNumMatch[0], '').trim()
        }
    }

    return result
}
