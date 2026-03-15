/**
 * Tests for pp30StatusUtils
 * Covers: derivePp30Status
 */

import { describe, it, expect } from 'vitest'
import { derivePp30Status, Pp30StatusInput } from '../pp30StatusUtils'

describe('derivePp30Status', () => {
  it('returns null for null/undefined', () => {
    expect(derivePp30Status(null)).toBeNull()
    expect(derivePp30Status(undefined)).toBeNull()
  })

  it('returns null for empty data (no fields set)', () => {
    expect(derivePp30Status({})).toBeNull()
  })

  // --- pp30_form as direct status (post-migration 028) ---

  it('uses pp30_form directly when it is a meaningful string status', () => {
    const data: Pp30StatusInput = { pp30_form: 'draft_completed' }
    expect(derivePp30Status(data)).toBe('draft_completed')
  })

  it('uses pp30_form directly (not_started string)', () => {
    const data: Pp30StatusInput = { pp30_form: 'not_started' }
    expect(derivePp30Status(data)).toBe('not_started')
  })

  it('uses pp30_form directly (sent_to_customer)', () => {
    expect(derivePp30Status({ pp30_form: 'sent_to_customer' })).toBe('sent_to_customer')
  })

  it('trims whitespace from pp30_form', () => {
    expect(derivePp30Status({ pp30_form: '  pending_review  ' })).toBe('pending_review')
  })

  // --- pp30_form as boolean (backward compatibility) ---

  it('returns "not_started" for pp30_form = true', () => {
    expect(derivePp30Status({ pp30_form: true })).toBe('not_started')
  })

  it('returns "not_started" for pp30_form = "1"', () => {
    expect(derivePp30Status({ pp30_form: '1' })).toBe('not_started')
  })

  it('returns null for pp30_form = false', () => {
    expect(derivePp30Status({ pp30_form: false })).toBeNull()
  })

  it('returns null for pp30_form = "0"', () => {
    expect(derivePp30Status({ pp30_form: '0' })).toBeNull()
  })

  // --- Derive from timestamp fields ---

  it('derives "sent_to_customer" from pp30_sent_to_customer_date', () => {
    expect(derivePp30Status({
      pp30_sent_to_customer_date: '2026-01-15 10:00:00',
    })).toBe('sent_to_customer')
  })

  it('derives "pending_recheck" from pp30_review_returned_date', () => {
    expect(derivePp30Status({
      pp30_review_returned_date: '2026-01-15 10:00:00',
    })).toBe('pending_recheck')
  })

  it('derives "pending_review" from pp30_sent_for_review_date', () => {
    expect(derivePp30Status({
      pp30_sent_for_review_date: '2026-01-15 10:00:00',
    })).toBe('pending_review')
  })

  it('derives "draft_completed" from vat_draft_completed_date', () => {
    expect(derivePp30Status({
      vat_draft_completed_date: '2026-01-15 10:00:00',
    })).toBe('draft_completed')
  })

  it('picks the most recent status when multiple timestamps are present', () => {
    expect(derivePp30Status({
      pp30_sent_for_review_date: '2026-01-10 10:00:00',
      pp30_review_returned_date: '2026-01-15 10:00:00',
      vat_draft_completed_date: '2026-01-05 10:00:00',
    })).toBe('pending_recheck') // Jan 15 is most recent
  })

  it('picks sent_to_customer when it is the most recent', () => {
    expect(derivePp30Status({
      pp30_sent_to_customer_date: '2026-01-20 10:00:00',
      pp30_review_returned_date: '2026-01-15 10:00:00',
      pp30_sent_for_review_date: '2026-01-10 10:00:00',
    })).toBe('sent_to_customer') // Jan 20 is most recent
  })

  // --- pp30_form takes priority over timestamps ---

  it('pp30_form (string status) takes priority over timestamps', () => {
    expect(derivePp30Status({
      pp30_form: 'sent_to_customer',
      pp30_sent_for_review_date: '2026-01-20 10:00:00',
    })).toBe('sent_to_customer')
  })
})
