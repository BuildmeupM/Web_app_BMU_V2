/**
 * Date/Time utilities for BMU Work Management System
 * ใช้สำหรับส่งค่า Timestamp ไปยัง API ให้เป็น UTC เสมอ (สอดคล้องกับ BUG-165 และไทม์โซนไทย UTC+7)
 * 
 * กฎการทำงาน:
 * - ฐานข้อมูลเก็บเป็น UTC เสมอ (เช่น 2026-02-05 06:22:27 = 06:22 UTC)
 * - ตอนส่งเข้า DB: Frontend ส่ง UTC ไป Backend อยู่แล้ว (formatTimestampUTCForAPI) — ถูกต้อง ไม่ต้องบวก offset
 * - ตอนแสดงผล: แปลง UTC จาก API → เวลาไทย (+7) ก่อนแสดง (formatUTCTimestampToThailand) → ควรเห็น 13:22:27
 */

import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const API_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY HH:mm:ss'
export const THAILAND_TIMEZONE = 'Asia/Bangkok'

/**
 * แปลง format วันที่/เวลาโดยไม่แปลง timezone (แสดงตามที่เก็บในฐานข้อมูล)
 * - แปลงจาก 'YYYY-MM-DD HH:mm:ss' เป็น 'DD/MM/YYYY HH:mm:ss'
 * - หรือจาก ISO format เป็น 'DD/MM/YYYY HH:mm:ss'
 * - ไม่แปลง timezone (แสดงตามที่เก็บในฐานข้อมูล)
 * 
 * @param dateString - ค่าจาก backend (ISO UTC หรือ YYYY-MM-DD HH:mm:ss)
 * @param format - รูปแบบแสดงผล (default: DD/MM/YYYY HH:mm:ss)
 * @returns string สำหรับแสดงผล หรือ '' ถ้าไม่มีค่า
 */
export function formatDateTimeNoConversion(dateString: string | null | undefined, format: string = DISPLAY_DATE_FORMAT): string {
  if (!dateString || typeof dateString !== 'string') return ''
  const s = dateString.trim()
  if (!s) return ''
  try {
    // ถ้าเป็น format 'YYYY-MM-DD HH:mm:ss' ให้แปลง format โดยตรงโดยไม่ parse เป็น Date object
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      // ตัด milliseconds ออกถ้ามี
      const cleanStr = s.split('.')[0]
      // แยกส่วน: YYYY-MM-DD และ HH:mm:ss
      const [datePart, timePart] = cleanStr.split(' ')
      const [year, month, day] = datePart.split('-')
      // แปลงเป็น DD/MM/YYYY HH:mm:ss
      return `${day}/${month}/${year} ${timePart}`
    }
    
    // ถ้าเป็น ISO format (มี 'T' หรือ 'Z') ให้แปลงเป็น 'YYYY-MM-DD HH:mm:ss' ก่อนแล้วแปลง format
    // ⚠️ สำคัญ: แปลง ISO string เป็น 'YYYY-MM-DD HH:mm:ss' โดยใช้ UTC methods แล้วแปลง format
    // เพื่อไม่ให้แปลง timezone (แสดงตามที่เก็บในฐานข้อมูล)
    if (s.includes('T') || s.includes('Z')) {
      // Parse ISO string โดยใช้ UTC methods เพื่อไม่แปลง timezone
      const dateUtc = dayjs.utc(s)
      if (!dateUtc.isValid()) return s
      // แปลงเป็น 'YYYY-MM-DD HH:mm:ss' ก่อน (ใช้ UTC time)
      const utcString = dateUtc.format(API_DATE_FORMAT)
      // แล้วแปลง format เป็น DD/MM/YYYY HH:mm:ss โดยตรง (ไม่ parse อีกครั้ง)
      const [datePart, timePart] = utcString.split(' ')
      const [year, month, day] = datePart.split('-')
      return `${day}/${month}/${year} ${timePart}`
    }
    
    // Fallback: parse โดยตรง (ไม่แปลง timezone)
    const date = dayjs(s)
    if (!date.isValid()) return s
    return date.format(format)
  } catch {
    return s
  }
}

/**
 * แปลง UTC timestamp จาก API เป็นเวลาไทย (Asia/Bangkok, UTC+7) สำหรับแสดงผล
 * - รองรับ ISO 8601 UTC (มีหรือไม่มี 'Z' ลงท้าย) และ format 'YYYY-MM-DD HH:mm:ss' (ถือว่าเป็น UTC)
 * - ⚠️ ถ้า string มี 'T' แต่ไม่มี 'Z' ให้ต่อ 'Z' ก่อน parse เพื่อให้ dayjs ตีความเป็น UTC เสมอ
 * 
 * @param dateString - ค่าจาก backend (ISO UTC หรือ YYYY-MM-DD HH:mm:ss ใน UTC)
 * @param format - รูปแบบแสดงผล (default: DD/MM/YYYY HH:mm:ss)
 * @returns string สำหรับแสดงผล หรือ '' ถ้าไม่มีค่า
 */
/**
 * เวลาไทย = UTC+7 (ใช้บวก 7 ชม. จาก UTC เพื่อแสดงผล)
 * ปรับกลับเป็น UTC+7 ตามปกติแล้ว (ไม่ใช้ UTC+14 แล้ว)
 */
const THAILAND_UTC_OFFSET_HOURS = 7

export function formatUTCTimestampToThailand(
  dateString: string | null | undefined,
  format: string = DISPLAY_DATE_FORMAT
): string {
  if (!dateString || typeof dateString !== 'string') return ''
  const s = dateString.trim()
  if (!s) return ''
  try {
    // บังคับให้ ISO string ที่มี 'T' แต่ไม่มี 'Z' ลงท้ายถูกตีความเป็น UTC
    let parseStr = s
    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
      parseStr = s + (s.includes('.') ? '' : '.000') + 'Z'
    }
    let dateUtc
    if (parseStr.includes('T') || parseStr.includes('Z')) {
      dateUtc = dayjs.utc(parseStr)
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(parseStr)) {
      // ⚠️ สำคัญ: ถ้าเป็น format 'YYYY-MM-DD HH:mm:ss' (ไม่มี timezone indicator) ให้ตีความเป็น UTC
      dateUtc = dayjs.utc(parseStr, API_DATE_FORMAT)
    } else {
      dateUtc = dayjs.utc(parseStr)
    }
    if (!dateUtc.isValid()) {
      // 🔍 Debug: Log เมื่อ parse ไม่สำเร็จ
      if (import.meta.env.DEV) {
        console.warn('[formatUTCTimestampToThailand] Invalid date:', s)
      }
      return s
    }
    // แปลง UTC → เวลาไทย โดยบวก 7 ชั่วโมง (UTC+7)
    const dateThailand = dateUtc.add(THAILAND_UTC_OFFSET_HOURS, 'hour')
    const result = dateThailand.format(format)
    // 🔍 Debug: Log การแปลง timestamp (เฉพาะใน development)
    if (import.meta.env.DEV) {
      console.log('[formatUTCTimestampToThailand] Converting timestamp:', {
        input: s,
        parseStr,
        dateUtc: dateUtc.format('YYYY-MM-DD HH:mm:ss'),
        dateThailand: dateThailand.format('YYYY-MM-DD HH:mm:ss'),
        result,
        format
      })
    }
    return result
  } catch (error) {
    // 🔍 Debug: Log เมื่อเกิด error
    if (import.meta.env.DEV) {
      console.error('[formatUTCTimestampToThailand] Error:', error, 'Input:', s)
    }
    return s
  }
}

/**
 * แปลง UTC timestamp จาก API เป็น local time string (format 'YYYY-MM-DD HH:mm:ss') สำหรับ DatePickerInput
 * - รองรับ ISO 8601 UTC (มีหรือไม่มี 'Z' ลงท้าย) และ format 'YYYY-MM-DD HH:mm:ss' (ถือว่าเป็น UTC)
 * - ⚠️ สำคัญ: ใช้สำหรับแปลงค่า UTC จาก API เป็น local time string ก่อนเก็บใน formValues
 * - ⚠️ สำคัญ: DatePickerInput จะแสดง local time โดยอัตโนมัติ ดังนั้นต้องแปลง UTC → local time ก่อน
 * 
 * @param dateString - ค่าจาก backend (ISO UTC หรือ YYYY-MM-DD HH:mm:ss ใน UTC)
 * @returns string ใน format 'YYYY-MM-DD HH:mm:ss' (local time) หรือ '' ถ้าไม่มีค่า
 */
export function convertUTCToLocalTimeString(dateString: string | null | undefined): string {
  if (!dateString || typeof dateString !== 'string') return ''
  const s = dateString.trim()
  if (!s) return ''
  try {
    // ถ้าเป็น format 'YYYY-MM-DD HH:mm:ss' อยู่แล้ว ให้คืนค่าเดิม (ไม่แปลง timezone)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      // ตัด milliseconds ออกถ้ามี
      return s.split('.')[0]
    }
    
    // ถ้าเป็น ISO format (มี 'T' หรือ 'Z') ให้แปลงเป็น 'YYYY-MM-DD HH:mm:ss' โดยใช้ UTC methods
    if (s.includes('T') || s.includes('Z')) {
      const date = dayjs.utc(s)
      if (!date.isValid()) return s
      return date.format(API_DATE_FORMAT)
    }
    
    // Fallback: คืนค่าเดิม
    return s
  } catch {
    return s
  }
}

/**
 * แปลงเวลาเป็น UTC และ format เป็น string สำหรับส่งไปยัง Backend
 * - ไม่ส่ง argument = ใช้เวลาปัจจุบัน (local) แปลงเป็น UTC
 * - ส่ง date = ใช้ค่าวันที่/เวลานั้น (local) แปลงเป็น UTC
 * ใช้ในหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี เพื่อให้ Timestamp ตรงตามไทม์โซน (Backend เก็บ UTC, Frontend แสดงเป็น local)
 * 
 * ⚠️ สำคัญ: 
 * - ถ้า date เป็น string ที่ไม่มี timezone indicator (เช่น '2026-02-05 12:00:00') จะตีความเป็น local time (เวลาไทย UTC+7) แล้วแปลงเป็น UTC
 * - ถ้า date เป็น Date object หรือ ISO string (มี 'T' หรือ 'Z') จะตีความเป็น UTC หรือ local time ตามที่ระบุ
 * - ถ้า date เป็น string จาก backend (format 'YYYY-MM-DD HH:mm:ss') ซึ่งเป็น UTC แล้ว จะไม่แปลงอีกครั้ง
 * 
 * @param date - Optional. Date object, ISO string, or dayjs instance (interpreted as local time)
 * @param isAlreadyUTC - Optional. ถ้าเป็น true แสดงว่า date เป็น UTC แล้ว ไม่ต้องแปลงอีก (default: false)
 * @returns String in format 'YYYY-MM-DD HH:mm:ss' in UTC
 */
export function formatTimestampUTCForAPI(date?: Date | string | Dayjs | null, isAlreadyUTC: boolean = false): string {
  if (date == null || date === '') {
    // ใช้เวลาปัจจุบัน (local) แปลงเป็น UTC โดยตรง
    // ⚠️ สำคัญ: ใช้ dayjs() เพื่อได้เวลาตาม browser timezone (local time)
    // แล้วแปลงเป็น UTC โดยใช้ timezone ไทย (UTC+7) แล้วแปลงเป็น UTC
    // แต่เพื่อให้ตรงกับเวลาปัจจุบันที่ผู้ใช้เห็น ต้องบวก 7 ชั่วโมงก่อนแปลงเป็น UTC
    // เพราะถ้าเวลาปัจจุบันคือ 15:39 (เวลาไทย) ควรส่งเป็น 15:39 UTC (ไม่ใช่ 08:39 UTC)
    // ⚠️ Workaround: บวก 7 ชั่วโมงก่อนแปลงเป็น UTC เพื่อให้ตรงกับเวลาปัจจุบัน (ดู BUG-183)
    const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
    // บวก 7 ชั่วโมงเพื่อชดเชยการแปลงเวลาที่อาจเกิดขึ้นในระบบ
    const nowThailandAdjusted = nowThailand.add(7, 'hour')
    const nowUtc = nowThailandAdjusted.utc()
    // 🔍 Debug: Log การแปลงเวลา (เฉพาะใน development)
    if (import.meta.env.DEV) {
      console.log('[formatTimestampUTCForAPI] Converting current time to UTC:', {
        nowThailand: nowThailand.format('YYYY-MM-DD HH:mm:ss'),
        nowThailandAdjusted: nowThailandAdjusted.format('YYYY-MM-DD HH:mm:ss'),
        nowUtc: nowUtc.format('YYYY-MM-DD HH:mm:ss'),
        result: nowUtc.format(API_DATE_FORMAT)
      })
    }
    return nowUtc.format(API_DATE_FORMAT)
  }
  
  // ถ้าเป็น Date object หรือ ISO string (มี 'T' หรือ 'Z')
  if (date instanceof Date || (typeof date === 'string' && (date.includes('T') || date.includes('Z')))) {
    try {
      // ถ้าเป็น ISO string ที่มี 'Z' แสดงว่าเป็น UTC แล้ว
      if (typeof date === 'string' && date.includes('Z')) {
        const utcDate = dayjs.utc(date)
        if (!utcDate.isValid()) {
          throw new Error('Invalid UTC date string')
        }
        return utcDate.format(API_DATE_FORMAT)
      }
      // ถ้าเป็น Date object หรือ ISO string ที่ไม่มี 'Z' ให้ตีความเป็น local time แล้วแปลงเป็น UTC
      // ⚠️ สำคัญ: dayjs(date) จะตีความเป็น local time แล้ว .utc() จะแปลงเป็น UTC โดยอัตโนมัติ
      const localDate = dayjs(date)
      if (!localDate.isValid()) {
        throw new Error('Invalid date object or ISO string')
      }
      const utcDate = localDate.utc()
      if (!utcDate.isValid()) {
        throw new Error('Failed to convert to UTC')
      }
      return utcDate.format(API_DATE_FORMAT)
    } catch (error) {
      // ถ้าเกิด error ให้ใช้เวลาปัจจุบันแทน
      if (import.meta.env.DEV) {
        console.error('[formatTimestampUTCForAPI] Error parsing Date/ISO string, using current time:', {
          input: date,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
      const nowThailandAdjusted = nowThailand.add(7, 'hour')
      const nowUtc = nowThailandAdjusted.utc()
      return nowUtc.format(API_DATE_FORMAT)
    }
  }
  
  // ถ้าเป็น string ที่ไม่มี timezone indicator (เช่น '2026-02-05 12:00:00')
  if (typeof date === 'string') {
    // ตรวจสอบว่า string ว่างหรือไม่
    const trimmedDate = date.trim()
    if (!trimmedDate || trimmedDate === '') {
      // ถ้า string ว่าง ให้ใช้เวลาปัจจุบัน
      const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
      const nowThailandAdjusted = nowThailand.add(7, 'hour')
      const nowUtc = nowThailandAdjusted.utc()
      return nowUtc.format(API_DATE_FORMAT)
    }
    
    // ถ้า isAlreadyUTC เป็น true แสดงว่า string นี้เป็น UTC แล้ว (เช่น มาจาก backend)
    if (isAlreadyUTC) {
      return trimmedDate // คืนค่าเดิมเพราะเป็น UTC แล้ว
    }
    
    // ถ้า isAlreadyUTC เป็น false แสดงว่า string นี้เป็น local time (เช่น ผู้ใช้กรอกเอง)
    // ⚠️ สำคัญ: ตีความเป็น local time (เวลาไทย UTC+7) แล้วแปลงเป็น UTC
    // ใช้ dayjs.tz() เพื่อระบุว่า string นี้เป็นเวลาไทย (UTC+7) แล้วแปลงเป็น UTC
    try {
      const parsedDate = dayjs.tz(trimmedDate, API_DATE_FORMAT, THAILAND_TIMEZONE)
      
      // ตรวจสอบว่า parse สำเร็จหรือไม่
      if (!parsedDate.isValid()) {
        // ถ้า parse ไม่สำเร็จ ให้ log error และใช้เวลาปัจจุบันแทน
        if (import.meta.env.DEV) {
          console.warn('[formatTimestampUTCForAPI] Invalid date string, using current time:', {
            input: trimmedDate,
            format: API_DATE_FORMAT,
            timezone: THAILAND_TIMEZONE
          })
        }
        const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
        const nowThailandAdjusted = nowThailand.add(7, 'hour')
        const nowUtc = nowThailandAdjusted.utc()
        return nowUtc.format(API_DATE_FORMAT)
      }
      
      const utcDate = parsedDate.utc()
      if (!utcDate.isValid()) {
        // ถ้าแปลงเป็น UTC ไม่สำเร็จ ให้ใช้เวลาปัจจุบันแทน
        if (import.meta.env.DEV) {
          console.warn('[formatTimestampUTCForAPI] Failed to convert to UTC, using current time:', {
            input: trimmedDate,
            parsedDate: parsedDate.format(),
            timezone: THAILAND_TIMEZONE
          })
        }
        const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
        const nowThailandAdjusted = nowThailand.add(7, 'hour')
        const nowUtc = nowThailandAdjusted.utc()
        return nowUtc.format(API_DATE_FORMAT)
      }
      
      return utcDate.format(API_DATE_FORMAT)
    } catch (error) {
      // ถ้าเกิด error ระหว่าง parse หรือ format ให้ใช้เวลาปัจจุบันแทน
      if (import.meta.env.DEV) {
        console.error('[formatTimestampUTCForAPI] Error parsing date string, using current time:', {
          input: trimmedDate,
          error: error instanceof Error ? error.message : String(error),
          format: API_DATE_FORMAT,
          timezone: THAILAND_TIMEZONE
        })
      }
      const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
      const nowThailandAdjusted = nowThailand.add(7, 'hour')
      const nowUtc = nowThailandAdjusted.utc()
      return nowUtc.format(API_DATE_FORMAT)
    }
  }
  
  // ถ้าเป็น dayjs instance
  if (dayjs.isDayjs(date)) {
    try {
      // ถ้า dayjs instance ยังไม่มี timezone ให้ตีความเป็น local time แล้วแปลงเป็น UTC
      if (!date.isValid()) {
        throw new Error('Invalid dayjs instance')
      }
      const utcDate = date.utc()
      if (!utcDate.isValid()) {
        throw new Error('Failed to convert dayjs instance to UTC')
      }
      return utcDate.format(API_DATE_FORMAT)
    } catch (error) {
      // ถ้าเกิด error ให้ใช้เวลาปัจจุบันแทน
      if (import.meta.env.DEV) {
        console.error('[formatTimestampUTCForAPI] Error converting dayjs instance, using current time:', {
          input: date.format(),
          error: error instanceof Error ? error.message : String(error)
        })
      }
      const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
      const nowThailandAdjusted = nowThailand.add(7, 'hour')
      const nowUtc = nowThailandAdjusted.utc()
      return nowUtc.format(API_DATE_FORMAT)
    }
  }
  
  // Fallback: ตีความเป็น local time แล้วแปลงเป็น UTC
  try {
    const localDate = dayjs(date)
    if (!localDate.isValid()) {
      throw new Error('Invalid date in fallback')
    }
    const utcDate = localDate.utc()
    if (!utcDate.isValid()) {
      throw new Error('Failed to convert to UTC in fallback')
    }
    return utcDate.format(API_DATE_FORMAT)
  } catch (error) {
    // ถ้าเกิด error ให้ใช้เวลาปัจจุบันแทน
    if (import.meta.env.DEV) {
      console.error('[formatTimestampUTCForAPI] Error in fallback, using current time:', {
        input: date,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    const nowThailand = dayjs().tz(THAILAND_TIMEZONE)
    const nowThailandAdjusted = nowThailand.add(7, 'hour')
    const nowUtc = nowThailandAdjusted.utc()
    return nowUtc.format(API_DATE_FORMAT)
  }
}
