/**
 * Data Verification Utilities
 * สำหรับตรวจสอบความถูกต้องของข้อมูลที่แสดงใน frontend กับฐานข้อมูล
 */

import { MonthlyTaxData } from '../services/monthlyTaxDataService'
import monthlyTaxDataService from '../services/monthlyTaxDataService'

export interface DataVerificationResult {
  isValid: boolean
  mismatches: DataMismatch[]
  summary: {
    totalChecked: number
    validCount: number
    invalidCount: number
  }
}

export interface DataMismatch {
  build: string
  field: string
  displayedValue: string | null
  databaseValue: string | null
  severity: 'high' | 'medium' | 'low'
}

/**
 * ตรวจสอบความถูกต้องของข้อมูลที่แสดงในตารางกับฐานข้อมูล
 * @param displayedData - ข้อมูลที่แสดงในตาราง
 * @param buildIds - Array of build IDs ที่ต้องการตรวจสอบ
 * @param year - Tax year
 * @param month - Tax month
 * @returns DataVerificationResult
 */
export async function verifyTableData(
  displayedData: MonthlyTaxData[],
  buildIds: string[],
  year: number,
  month: number
): Promise<DataVerificationResult> {
  const mismatches: DataMismatch[] = []
  let validCount = 0
  let invalidCount = 0

  // ตรวจสอบแต่ละ record (sequential เพื่อหลีกเลี่ยง 429 errors)
  for (let i = 0; i < displayedData.length; i++) {
    const displayedItem = displayedData[i]
    if (!buildIds.includes(displayedItem.build)) {
      continue
    }

    try {
      // ⚠️ สำคัญ: เพิ่ม delay ระหว่าง requests เพื่อหลีกเลี่ยง 429 (Too Many Requests)
      // Stagger requests: รอ 200ms ระหว่างแต่ละ request (ยกเว้น request แรก)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Fetch ข้อมูลจาก database โดยตรง
      const dbData = await monthlyTaxDataService.getByBuildYearMonth(
        displayedItem.build,
        year,
        month
      )

      // ตรวจสอบ fields สำคัญ
      const fieldChecks = [
        {
          field: 'pnd_status',
          displayed: displayedItem.pnd_status,
          database: dbData.pnd_status,
          severity: 'high' as const,
        },
        {
          field: 'pp30_form',
          displayed: displayedItem.pp30_form,
          database: dbData.pp30_form,
          severity: 'high' as const,
        },
        {
          field: 'pnd_review_returned_date',
          displayed: displayedItem.pnd_review_returned_date,
          database: dbData.pnd_review_returned_date,
          severity: 'medium' as const,
        },
        {
          field: 'pp30_review_returned_date',
          displayed: displayedItem.pp30_review_returned_date,
          database: dbData.pp30_review_returned_date,
          severity: 'medium' as const,
        },
        {
          field: 'pp30_payment_status',
          displayed: displayedItem.pp30_payment_status,
          database: dbData.pp30_payment_status,
          severity: 'medium' as const,
        },
        {
          field: 'company_name',
          displayed: displayedItem.company_name,
          database: dbData.company_name,
          severity: 'low' as const,
        },
      ]

      let hasMismatch = false
      for (const check of fieldChecks) {
        const displayedValue = normalizeValue(check.displayed)
        const databaseValue = normalizeValue(check.database)

        if (displayedValue !== databaseValue) {
          mismatches.push({
            build: displayedItem.build,
            field: check.field,
            displayedValue: check.displayed,
            databaseValue: check.database,
            severity: check.severity,
          })
          hasMismatch = true
        }
      }

      if (hasMismatch) {
        invalidCount++
      } else {
        validCount++
      }
    } catch (error: any) {
      // Handle 429 (Too Many Requests) errors gracefully
      if (error?.response?.status === 429) {
        console.warn(`Rate limit hit for build ${displayedItem.build}, skipping verification`)
        // ถ้าโดน rate limit ให้ข้าม record นี้ (ไม่นับเป็น invalid)
        continue
      }
      console.error(`Error verifying data for build ${displayedItem.build}:`, error)
      // ถ้า fetch ไม่สำเร็จ ให้ถือว่าไม่สามารถตรวจสอบได้ (ไม่นับเป็น invalid)
    }
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    summary: {
      totalChecked: displayedData.length,
      validCount,
      invalidCount,
    },
  }
}

/**
 * Normalize value สำหรับการเปรียบเทียบ
 */
function normalizeValue(value: any): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    return value.trim() === '' ? null : value.trim()
  }
  return String(value).trim()
}

/**
 * ตรวจสอบข้อมูล record เดียว
 */
export async function verifySingleRecord(
  build: string,
  year: number,
  month: number,
  displayedData: MonthlyTaxData
): Promise<DataMismatch[]> {
  try {
    const dbData = await monthlyTaxDataService.getByBuildYearMonth(build, year, month)
    const mismatches: DataMismatch[] = []

    const fieldChecks = [
      {
        field: 'pnd_status',
        displayed: displayedData.pnd_status,
        database: dbData.pnd_status,
        severity: 'high' as const,
      },
      {
        field: 'pp30_form',
        displayed: displayedData.pp30_form,
        database: dbData.pp30_form,
        severity: 'high' as const,
      },
      {
        field: 'pnd_review_returned_date',
        displayed: displayedData.pnd_review_returned_date,
        database: dbData.pnd_review_returned_date,
        severity: 'medium' as const,
      },
      {
        field: 'pp30_review_returned_date',
        displayed: displayedData.pp30_review_returned_date,
        database: dbData.pp30_review_returned_date,
        severity: 'medium' as const,
      },
      {
        field: 'pp30_payment_status',
        displayed: displayedData.pp30_payment_status,
        database: dbData.pp30_payment_status,
        severity: 'medium' as const,
      },
    ]

    for (const check of fieldChecks) {
      const displayedValue = normalizeValue(check.displayed)
      const databaseValue = normalizeValue(check.database)

      if (displayedValue !== databaseValue) {
        mismatches.push({
          build,
          field: check.field,
          displayedValue: check.displayed,
          databaseValue: check.database,
          severity: check.severity,
        })
      }
    }

    return mismatches
  } catch (error) {
    console.error(`Error verifying record for build ${build}:`, error)
    return []
  }
}
