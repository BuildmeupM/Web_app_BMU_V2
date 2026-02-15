/**
 * Utility สำหรับตรวจสอบว่าบริษัทมีข้อมูลในส่วน "สอบถามและตอบกลับ" หรือ "ส่งงานยื่นภาษี"
 * ใช้ก่อนเปิดฟอร์มสถานะภาษี (ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
 */

/** Filter type สำหรับเลือกตรวจเฉพาะบาง section */
export type AcknowledgmentFilter = 'inquiry' | 'submission' | 'all'

/** โครงสร้างสำหรับแสดงเนื้อหาในป๊อปอัพ (ชื่อฟิลด์ + label แสดงผล) */
export type AcknowledgmentFieldDef = { key: keyof RecordWithAcknowledgmentFields; label: string }

export const ACKNOWLEDGMENT_SECTIONS: readonly {
  key: string
  label: string
  fields: readonly (keyof RecordWithAcknowledgmentFields)[]
  fieldLabels: readonly AcknowledgmentFieldDef[]
}[] = [
    {
      key: 'wht_inquiry',
      label: 'สอบถามและตอบกลับ ภ.ง.ด.',
      fields: ['wht_inquiry', 'wht_response'] as const,
      fieldLabels: [
        { key: 'wht_inquiry', label: 'สอบถามเพิ่มเติม ภ.ง.ด.' },
        { key: 'wht_response', label: 'ตอบกลับ ภ.ง.ด.' },
      ],
    },
    {
      key: 'wht_submission',
      label: 'ส่งงานยื่นภาษีกับทีมยื่นภาษี ภ.ง.ด.',
      fields: ['wht_submission_comment', 'wht_filing_response'] as const,
      fieldLabels: [
        { key: 'wht_submission_comment', label: 'ความเห็นส่งงานยื่นภาษี ภ.ง.ด.' },
        { key: 'wht_filing_response', label: 'ตอบกลับงานยื่นภาษี ภ.ง.ด.' },
      ],
    },
    {
      key: 'pp30_inquiry',
      label: 'สอบถามและตอบกลับ ภ.พ.30',
      fields: ['pp30_inquiry', 'pp30_response'] as const,
      fieldLabels: [
        { key: 'pp30_inquiry', label: 'สอบถามเพิ่มเติม ภ.พ.30' },
        { key: 'pp30_response', label: 'ตอบกลับ ภ.พ.30' },
      ],
    },
    {
      key: 'pp30_submission',
      label: 'ส่งงานยื่นภาษีกับทีมยื่นภาษี ภ.พ.30',
      fields: ['pp30_submission_comment', 'pp30_filing_response'] as const,
      fieldLabels: [
        { key: 'pp30_submission_comment', label: 'ความเห็นส่งงานยื่นภาษี ภ.พ.30' },
        { key: 'pp30_filing_response', label: 'ตอบกลับงานยื่นภาษี ภ.พ.30' },
      ],
    },
  ]

export type RecordWithAcknowledgmentFields = {
  wht_inquiry?: string | null
  wht_response?: string | null
  wht_submission_comment?: string | null
  wht_filing_response?: string | null
  pp30_inquiry?: string | null
  pp30_response?: string | null
  pp30_submission_comment?: string | null
  pp30_filing_response?: string | null
}

function hasValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * กรอง ACKNOWLEDGMENT_SECTIONS ตาม filter
 * - 'inquiry'    → เฉพาะ section ที่ key ลงท้ายด้วย _inquiry (สอบถาม/ตอบกลับ)
 * - 'submission'  → เฉพาะ section ที่ key ลงท้ายด้วย _submission (ส่งงาน/ตอบกลับ)
 * - 'all'         → ทุก section
 */
export function getFilteredSections(filter: AcknowledgmentFilter = 'all') {
  if (filter === 'all') return ACKNOWLEDGMENT_SECTIONS
  return ACKNOWLEDGMENT_SECTIONS.filter((s) =>
    filter === 'inquiry' ? s.key.endsWith('_inquiry') : s.key.endsWith('_submission')
  )
}

/**
 * คืน array ของ label ส่วนที่มีข้อมูล (trim แล้วไม่ว่าง)
 * @param filter - เลือกตรวจเฉพาะ section ที่เกี่ยวข้อง (default: 'all')
 */
export function getSectionsWithData(
  record: RecordWithAcknowledgmentFields | null | undefined,
  filter: AcknowledgmentFilter = 'all'
): string[] {
  if (!record) return []
  const result: string[] = []
  for (const section of getFilteredSections(filter)) {
    const hasData = section.fields.some((field) => hasValue(record[field]))
    if (hasData) result.push(section.label)
  }
  return result
}

/**
 * คืน true ถ้ามีข้อมูลอย่างน้อย 1 ส่วน
 * @param filter - เลือกตรวจเฉพาะ section ที่เกี่ยวข้อง (default: 'all')
 */
export function hasAcknowledgmentData(
  record: RecordWithAcknowledgmentFields | null | undefined,
  filter: AcknowledgmentFilter = 'all'
): boolean {
  return getSectionsWithData(record, filter).length > 0
}

/** คำที่ยอมรับสำหรับยืนยัน (ต้องพิมพ์ให้ตรงตัว) */
export const ACKNOWLEDGMENT_KEYWORDS = ['yes', 'Yes', 'YES'] as const

export function isAcknowledgmentKeyword(input: string): boolean {
  const trimmed = input.trim()
  return ACKNOWLEDGMENT_KEYWORDS.includes(trimmed as (typeof ACKNOWLEDGMENT_KEYWORDS)[number])
}
