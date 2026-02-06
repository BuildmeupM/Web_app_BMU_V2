/**
 * Shared utility for deriving pp30_status from monthly tax data.
 * Single source of truth: ใช้ logic เดียวกันทุกที่ (Form, TaxFilingTable, TaxInspectionTable, TaxStatusTable)
 * เพื่อป้องกันความไม่สอดคล้องของสถานะระหว่างตารางและฟอร์ม
 */

export interface Pp30StatusInput {
  /** ถ้า API/backend ส่ง pp30_status มา ให้ใช้ค่าดังกล่าวก่อน (ให้ตรงกับฐานข้อมูล/ที่บันทึก) */
  pp30_status?: string | null
  /** หลัง migration 028: pp30_form เปลี่ยนเป็น VARCHAR(100) ที่เก็บสถานะโดยตรง */
  pp30_form?: string | boolean | null
  pp30_filing_response?: string | null
  pp30_sent_to_customer_date?: string | null
  pp30_review_returned_date?: string | null
  pp30_sent_for_review_date?: string | null
  vat_draft_completed_date?: string | null
}

/**
 * Derive pp30_status from raw API/DB fields.
 * ⚠️ สำคัญ: หลัง migration 028, pp30_form เปลี่ยนเป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
 * - ถ้า API ส่ง pp30_status มา → ใช้ค่าดังกล่าว (ให้ตรงกับที่ backend บันทึก/ส่งกลับ)
 * - ถ้ามี pp30_form และไม่ใช่ boolean (0/1) → ใช้ค่าจาก pp30_form โดยตรง (หลัง migration 028)
 * - ถ้าไม่มี: ใช้ timestamp ล่าสุดจาก status dates → sent_to_customer | pending_recheck | pending_review | draft_completed
 * - ถ้าไม่มี date เลยแต่มี pp30_form = true/1 → 'not_started' (backward compatibility)
 * 
 * ⚠️ หมายเหตุ: pp30_filing_response เป็นข้อมูลที่ผู้ใช้กรอก (TEXT) ไม่ใช่สถานะ จึงไม่ใช้ในการ derive สถานะ
 */
export function derivePp30Status(data: Pp30StatusInput | null | undefined): string | null {
  if (!data) return null

  // ⚠️ สำคัญ: หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
  // Backend ส่งเฉพาะ pp30_form แล้ว ไม่ส่ง pp30_status
  // ถ้า pp30_form มีค่าและไม่ใช่ boolean (0/1) ให้ใช้ค่าดังกล่าวก่อน
  if (data.pp30_form != null && String(data.pp30_form).trim() !== '' && data.pp30_form !== '0' && data.pp30_form !== '1' && data.pp30_form !== 0 && data.pp30_form !== 1 && data.pp30_form !== true && data.pp30_form !== false) {
    return String(data.pp30_form).trim()
  }

  // Derive จาก timestamp fields (เรียงตามวันที่ล่าสุด)
  const statuses: Array<{ status: string; date: string }> = []
  if (data.pp30_sent_to_customer_date) {
    statuses.push({ status: 'sent_to_customer', date: data.pp30_sent_to_customer_date })
  }
  if (data.pp30_review_returned_date) {
    statuses.push({ status: 'pending_recheck', date: data.pp30_review_returned_date })
  }
  if (data.pp30_sent_for_review_date) {
    statuses.push({ status: 'pending_review', date: data.pp30_sent_for_review_date })
  }
  if (data.vat_draft_completed_date) {
    statuses.push({ status: 'draft_completed', date: data.vat_draft_completed_date })
  }

  if (statuses.length > 0) {
    statuses.sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return tb - ta // ล่าสุดก่อน
    })
    return statuses[0].status
  }

  // Backward compatibility: ถ้า pp30_form = true/1 (boolean) → 'not_started'
  if (data.pp30_form === true || data.pp30_form === 1 || data.pp30_form === '1') {
    return 'not_started'
  }

  return null
}
