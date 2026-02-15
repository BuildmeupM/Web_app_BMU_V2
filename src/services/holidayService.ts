/**
 * Holiday Service
 * API service สำหรับการจัดการวันหยุดนักขัตฤกษ์
 * Fix 4: Holiday Calendar for working days calculation
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Helper to get token from localStorage (matching authStore persist config)
function getToken(): string | null {
    try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
            const parsed = JSON.parse(authStorage)
            return parsed?.state?.token || null
        }
    } catch {
        return null
    }
    return null
}

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
    const token = getToken()
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (activeOnly) params.append('active_only', 'true')

    params.append('_t', Date.now().toString())
    const response = await axios.get<HolidaysResponse>(
        `${API_URL}/api/holidays?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            }
        }
    )
    return response.data
}

// Get holiday dates only (for calendar)
export async function getHolidayDates(options?: {
    year?: number
    startDate?: string
    endDate?: string
}): Promise<string[]> {
    const token = getToken()
    const params = new URLSearchParams()
    if (options?.year) params.append('year', options.year.toString())
    if (options?.startDate) params.append('start_date', options.startDate)
    if (options?.endDate) params.append('end_date', options.endDate)

    const response = await axios.get<HolidayDatesResponse>(
        `${API_URL}/api/holidays/dates?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    )
    return response.data.data.dates
}

// Create holiday (Admin only)
export async function createHoliday(data: {
    holiday_date: string
    name: string
    name_en?: string
    year: number
}): Promise<Holiday> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { holiday: Holiday } }>(
        `${API_URL}/api/holidays`,
        data,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
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
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { holiday: Holiday } }>(
        `${API_URL}/api/holidays/${id}`,
        data,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    )
    return response.data.data.holiday
}

// Delete holiday (Admin only)
export async function deleteHoliday(id: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
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
