/**
 * Tests for dateTimeUtils
 * Covers: formatDateTimeNoConversion, formatUTCTimestampToThailand,
 *         convertUTCToLocalTimeString, dateParser
 */

import { describe, it, expect } from 'vitest'
import {
  formatDateTimeNoConversion,
  formatUTCTimestampToThailand,
  convertUTCToLocalTimeString,
  dateParser,
} from '../dateTimeUtils'

describe('formatDateTimeNoConversion', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatDateTimeNoConversion(null)).toBe('')
    expect(formatDateTimeNoConversion(undefined)).toBe('')
    expect(formatDateTimeNoConversion('')).toBe('')
    expect(formatDateTimeNoConversion('  ')).toBe('')
  })

  it('converts YYYY-MM-DD HH:mm:ss to DD/MM/YYYY HH:mm:ss', () => {
    expect(formatDateTimeNoConversion('2026-02-05 06:22:27')).toBe('05/02/2026 06:22:27')
  })

  it('strips milliseconds from YYYY-MM-DD HH:mm:ss.ms format', () => {
    expect(formatDateTimeNoConversion('2026-02-05 06:22:27.123')).toBe('05/02/2026 06:22:27')
  })

  it('handles ISO format with T and Z', () => {
    const result = formatDateTimeNoConversion('2026-02-05T06:22:27Z')
    expect(result).toBe('05/02/2026 06:22:27')
  })

  it('handles ISO format with T but no Z (uses UTC)', () => {
    const result = formatDateTimeNoConversion('2026-02-05T06:22:27')
    // Should parse as UTC without timezone conversion
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatUTCTimestampToThailand', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatUTCTimestampToThailand(null)).toBe('')
    expect(formatUTCTimestampToThailand(undefined)).toBe('')
    expect(formatUTCTimestampToThailand('')).toBe('')
  })

  it('converts UTC "YYYY-MM-DD HH:mm:ss" to Thailand time (+7 hours)', () => {
    // 06:22:27 UTC → 13:22:27 Thailand (+7)
    const result = formatUTCTimestampToThailand('2026-02-05 06:22:27')
    expect(result).toBe('05/02/2026 13:22:27')
  })

  it('converts ISO UTC string to Thailand time', () => {
    // 06:22:27Z → 13:22:27 Thailand
    const result = formatUTCTimestampToThailand('2026-02-05T06:22:27Z')
    expect(result).toBe('05/02/2026 13:22:27')
  })

  it('handles date boundary crossing (e.g. 20:00 UTC → 03:00+1 Thailand)', () => {
    const result = formatUTCTimestampToThailand('2026-02-05 20:00:00')
    expect(result).toBe('06/02/2026 03:00:00')
  })

  it('returns original string for invalid date', () => {
    expect(formatUTCTimestampToThailand('not-a-date')).toBe('not-a-date')
  })

  it('supports custom format', () => {
    const result = formatUTCTimestampToThailand('2026-02-05 06:22:27', 'YYYY-MM-DD')
    expect(result).toBe('2026-02-05')
  })
})

describe('convertUTCToLocalTimeString', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(convertUTCToLocalTimeString(null)).toBe('')
    expect(convertUTCToLocalTimeString(undefined)).toBe('')
    expect(convertUTCToLocalTimeString('')).toBe('')
  })

  it('returns YYYY-MM-DD HH:mm:ss unchanged', () => {
    expect(convertUTCToLocalTimeString('2026-02-05 06:22:27')).toBe('2026-02-05 06:22:27')
  })

  it('strips milliseconds from YYYY-MM-DD HH:mm:ss.ms', () => {
    expect(convertUTCToLocalTimeString('2026-02-05 06:22:27.123')).toBe('2026-02-05 06:22:27')
  })

  it('converts ISO UTC to YYYY-MM-DD HH:mm:ss', () => {
    expect(convertUTCToLocalTimeString('2026-02-05T06:22:27Z')).toBe('2026-02-05 06:22:27')
  })

  it('returns original string for unsupported formats', () => {
    expect(convertUTCToLocalTimeString('05/02/2026')).toBe('05/02/2026')
  })
})

describe('dateParser', () => {
  it('returns null for null/empty/whitespace', () => {
    expect(dateParser('')).toBeNull()
    expect(dateParser('  ')).toBeNull()
  })

  it('parses DD/MM/YYYY format correctly', () => {
    const result = dateParser('05/02/2026')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
    expect(result!.getMonth()).toBe(1) // February = 1
    expect(result!.getDate()).toBe(5)
  })

  it('parses D/M/YYYY format correctly', () => {
    const result = dateParser('5/2/2026')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
    expect(result!.getMonth()).toBe(1)
    expect(result!.getDate()).toBe(5)
  })

  it('parses YYYY-MM-DD format correctly', () => {
    const result = dateParser('2026-02-05')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
  })

  it('converts Buddhist Era year (> 2500) to CE', () => {
    const result = dateParser('05/02/2569')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026) // 2569 - 543 = 2026
    expect(result!.getMonth()).toBe(1)
    expect(result!.getDate()).toBe(5)
  })

  it('parses dash-separated format', () => {
    const result = dateParser('05-02-2026')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
  })

  it('parses dot-separated format', () => {
    const result = dateParser('05.02.2026')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
  })

  it('returns null for completely invalid input', () => {
    expect(dateParser('not-a-date-at-all')).toBeNull()
  })
})
