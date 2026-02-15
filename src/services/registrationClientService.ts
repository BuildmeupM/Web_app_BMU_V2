import api from './api'

export interface RegistrationClient {
    id: string
    company_name: string
    legal_entity_number: string | null
    phone: string | null
    group_name: string
    line_api: string | null
    notes: string | null
    // Address fields
    full_address: string | null
    address_number: string | null
    village: string | null
    building: string | null
    room_number: string | null
    floor_number: string | null
    soi: string | null
    moo: string | null
    road: string | null
    subdistrict: string | null
    district: string | null
    province: string | null
    postal_code: string | null
    is_active: boolean
    created_at?: string
    updated_at?: string
}

export interface RegistrationClientCreateData {
    company_name: string
    legal_entity_number?: string
    phone?: string
    group_name: string
    line_api?: string
    notes?: string
    // Address fields
    full_address?: string
    address_number?: string
    village?: string
    building?: string
    room_number?: string
    floor_number?: string
    soi?: string
    moo?: string
    road?: string
    subdistrict?: string
    district?: string
    province?: string
    postal_code?: string
}

export interface RegistrationClientListResponse {
    clients: RegistrationClient[]
    groups: string[]
    count: number
}

export const registrationClientService = {
    /**
     * ดึงรายการลูกค้าทะเบียนทั้งหมด
     */
    getAll: async (params?: { search?: string; group?: string; active?: string }): Promise<RegistrationClientListResponse> => {
        const queryParams = new URLSearchParams()
        if (params?.search) queryParams.set('search', params.search)
        if (params?.group) queryParams.set('group', params.group)
        if (params?.active) queryParams.set('active', params.active)

        const queryString = queryParams.toString()
        const url = queryString ? `/registration-clients?${queryString}` : '/registration-clients'
        const response = await api.get(url)
        return response.data.data
    },

    /**
     * เพิ่มลูกค้าทะเบียนใหม่
     */
    create: async (data: RegistrationClientCreateData): Promise<RegistrationClient> => {
        const response = await api.post('/registration-clients', data)
        return response.data.data
    },

    /**
     * แก้ไขข้อมูลลูกค้าทะเบียน
     */
    update: async (id: string, data: Partial<RegistrationClientCreateData & { is_active: boolean }>): Promise<RegistrationClient> => {
        const response = await api.put(`/registration-clients/${id}`, data)
        return response.data.data
    },

    /**
     * ลบลูกค้าทะเบียน
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/registration-clients/${id}`)
    },

    /**
     * ค้นหาลูกค้าจากระบบหลัก (clients table) — lightweight dropdown
     * ใช้ GET /api/clients/dropdown?search=xxx&limit=20
     * คืนค่าเฉพาะ build + company_name เพื่อประสิทธิภาพ
     */
    searchMainClients: async (search: string): Promise<{ build: string; company_name: string }[]> => {
        if (!search || search.trim().length < 2) return []
        const response = await api.get(`/clients/dropdown?search=${encodeURIComponent(search.trim())}&limit=20`)
        return response.data.data || []
    },
}
