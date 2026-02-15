/**
 * Registration Work Service
 * API service สำหรับจัดการประเภทงานและรายการย่อย — งานทะเบียน
 */

import api from './api'

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
    const params = new URLSearchParams()
    if (department) params.append('department', department)
    params.append('_t', Date.now().toString())

    const response = await api.get<{ success: boolean; data: { types: WorkType[] } }>(
        `/registration-work/types?${params.toString()}`
    )
    return response.data.data.types
}

export async function createWorkType(data: { department: Department; name: string }): Promise<WorkType> {
    const response = await api.post<{ success: boolean; data: { type: WorkType } }>(
        '/registration-work/types',
        data
    )
    return response.data.data.type
}

export async function updateWorkType(id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<WorkType> {
    const response = await api.put<{ success: boolean; data: { type: WorkType } }>(
        `/registration-work/types/${id}`,
        data
    )
    return response.data.data.type
}

export async function deleteWorkType(id: string): Promise<void> {
    await api.delete(`/registration-work/types/${id}`)
}

// ============================================================
// Sub Types API
// ============================================================

export async function createSubType(data: { work_type_id: string; name: string }): Promise<WorkSubType> {
    const response = await api.post<{ success: boolean; data: { sub_type: WorkSubType } }>(
        '/registration-work/sub-types',
        data
    )
    return response.data.data.sub_type
}

export async function updateSubType(id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<WorkSubType> {
    const response = await api.put<{ success: boolean; data: { sub_type: WorkSubType } }>(
        `/registration-work/sub-types/${id}`,
        data
    )
    return response.data.data.sub_type
}

export async function deleteSubType(id: string): Promise<void> {
    await api.delete(`/registration-work/sub-types/${id}`)
}

// ============================================================
// Team Statuses API (สถานะการทำงานในทีม)
// ============================================================

export interface TeamStatus {
    id: string
    name: string
    color: string
    sort_order: number
    is_active: boolean
    created_at?: string
}

export async function getTeamStatuses(): Promise<TeamStatus[]> {
    const response = await api.get<{ success: boolean; data: { statuses: TeamStatus[] } }>(
        `/registration-work/team-statuses?_t=${Date.now()}`
    )
    return response.data.data.statuses
}

export async function createTeamStatus(data: { name: string; color?: string }): Promise<TeamStatus> {
    const response = await api.post<{ success: boolean; data: { status: TeamStatus } }>(
        '/registration-work/team-statuses',
        data
    )
    return response.data.data.status
}

export async function updateTeamStatus(id: string, data: Partial<{ name: string; color: string; sort_order: number; is_active: boolean }>): Promise<TeamStatus> {
    const response = await api.put<{ success: boolean; data: { status: TeamStatus } }>(
        `/registration-work/team-statuses/${id}`,
        data
    )
    return response.data.data.status
}

export async function deleteTeamStatus(id: string): Promise<void> {
    await api.delete(`/registration-work/team-statuses/${id}`)
}
