/**
 * Registration Work Service
 * API service สำหรับจัดการประเภทงานและรายการย่อย — งานทะเบียน
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken(): string | null {
    try {
        const authStorage = sessionStorage.getItem('auth-storage')
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
export interface WorkSubType {
    id: string
    work_type_id: string
    name: string
    sort_order: number
    is_active: boolean
    created_at?: string
}

export interface WorkType {
    id: string
    department: string
    name: string
    sort_order: number
    is_active: boolean
    created_at?: string
    sub_types: WorkSubType[]
}

export type Department = 'dbd' | 'rd' | 'sso' | 'hr'

// ============================================================
// Work Types API
// ============================================================

export async function getWorkTypes(department?: Department): Promise<WorkType[]> {
    const token = getToken()
    const params = new URLSearchParams()
    if (department) params.append('department', department)
    params.append('_t', Date.now().toString())

    const response = await axios.get<{ success: boolean; data: { types: WorkType[] } }>(
        `${API_URL}/api/registration-work/types?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
            }
        }
    )
    return response.data.data.types
}

export async function createWorkType(data: { department: Department; name: string }): Promise<WorkType> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { type: WorkType } }>(
        `${API_URL}/api/registration-work/types`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.type
}

export async function updateWorkType(id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<WorkType> {
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { type: WorkType } }>(
        `${API_URL}/api/registration-work/types/${id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.type
}

export async function deleteWorkType(id: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/registration-work/types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}

// ============================================================
// Sub Types API
// ============================================================

export async function createSubType(data: { work_type_id: string; name: string }): Promise<WorkSubType> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { sub_type: WorkSubType } }>(
        `${API_URL}/api/registration-work/sub-types`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.sub_type
}

export async function updateSubType(id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<WorkSubType> {
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { sub_type: WorkSubType } }>(
        `${API_URL}/api/registration-work/sub-types/${id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.sub_type
}

export async function deleteSubType(id: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/registration-work/sub-types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}
