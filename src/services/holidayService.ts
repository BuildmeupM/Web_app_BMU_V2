/**
 * Holiday Service
 * API service สำหรับการจัดการวันหยุดนักขัตฤกษ์
 * Fix 4: Holiday Calendar for working days calculation
 * Fix 5: Use configured api instance instead of raw axios to fix 401 errors
 */

import api from './api'

// Types
export interface Holiday {
    id: string
    holiday_date: string
    name: string
    name_en?: string
    year: number
    is_active: boolean
    created_at?: string
}

export interface HolidaysResponse {
    success: boolean
    data: {
        holidays: Holiday[]
        count: number
    }
}

export interface HolidayDatesResponse {
    success: boolean
    data: {
        dates: string[]
    }
}

// Get all holidays
export async function getHolidays(year?: number, activeOnly = true): Promise<HolidaysResponse> {
    const params: Record<string, string> = {}
    if (year) params.year = year.toString()
    if (activeOnly) params.active_only = 'true'
    params._t = Date.now().toString()

    const response = await api.get<HolidaysResponse>('/holidays', {
        params,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        }
    })
    return response.data
}

// Get holiday dates only (for calendar)
export async function getHolidayDates(options?: {
    year?: number
    startDate?: string
    endDate?: string
}): Promise<string[]> {
    const params: Record<string, string> = {}
    if (options?.year) params.year = options.year.toString()
    if (options?.startDate) params.start_date = options.startDate
    if (options?.endDate) params.end_date = options.endDate

    const response = await api.get<HolidayDatesResponse>('/holidays/dates', { params })
    return response.data.data.dates
}

// Create holiday (Admin only)
export async function createHoliday(data: {
    holiday_date: string
    name: string
    name_en?: string
    year: number
}): Promise<Holiday> {
    const response = await api.post<{ success: boolean; data: { holiday: Holiday } }>(
        '/holidays',
        data
    )
    return response.data.data.holiday
}

// Update holiday (Admin only)
export async function updateHoliday(id: string, data: Partial<{
    holiday_date: string
    name: string
    name_en?: string
    year: number
    is_active: boolean
}>): Promise<Holiday> {
    const response = await api.put<{ success: boolean; data: { holiday: Holiday } }>(
        `/holidays/${id}`,
        data
    )
    return response.data.data.holiday
}

// Delete holiday (Admin only)
export async function deleteHoliday(id: string): Promise<void> {
    await api.delete(`/holidays/${id}`)
}

// Helper: Calculate working days excluding weekends AND holidays
export function calculateWorkingDaysWithHolidays(
    startDate: Date,
    endDate: Date,
    holidayDates: string[]
): number {
    let days = 0
    const current = new Date(startDate)
    const holidaySet = new Set(holidayDates)

    while (current <= endDate) {
        const dayOfWeek = current.getDay()
        const dateStr = current.toISOString().split('T')[0]

        // Skip weekends (Saturday = 6, Sunday = 0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Skip holidays
            if (!holidaySet.has(dateStr)) {
                days++
            }
        }
        current.setDate(current.getDate() + 1)
    }

    return days
}
