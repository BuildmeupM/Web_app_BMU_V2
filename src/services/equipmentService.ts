import api from './api'

// ── Types ──

export interface Equipment {
    id: string
    name: string
    category: 'laptop' | 'monitor' | 'mouse' | 'keyboard' | 'webcam' | 'headset' | 'charger' | 'cable' | 'other'
    brand: string | null
    model: string | null
    serial_number: string | null
    status: 'available' | 'borrowed' | 'maintenance' | 'retired'
    description: string | null
    // สเปคคอมพิวเตอร์
    cpu: string | null
    ram: string | null
    storage: string | null
    display: string | null
    gpu: string | null
    os: string | null
    purchase_date: string | null
    warranty_expire_date: string | null
    purchase_price: number | null
    created_at: string
    updated_at: string
    current_borrowing: {
        id: string
        borrower_name: string
        borrower_nick_name: string
        borrow_date: string
        expected_return_date: string
        status: string
    } | null
}

export interface EquipmentBorrowing {
    id: string
    equipment_id: string
    borrower_id: string
    approved_by: string | null
    status: 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'overdue'
    borrow_date: string
    expected_return_date: string
    actual_return_date: string | null
    purpose: string | null
    notes: string | null
    created_at: string
    updated_at: string
    equipment_name: string
    equipment_category: string
    equipment_brand: string | null
    equipment_model: string | null
    equipment_serial: string | null
    borrower_name: string
    borrower_nick_name: string | null
    approver_name: string | null
}

export interface EquipmentStats {
    total: number
    available: number
    borrowed: number
    maintenance: number
    retired: number
    overdue: number
}

export interface EquipmentAssignment {
    id: string
    equipment_id: string
    assigned_to: string
    assigned_by: string | null
    assigned_date: string
    return_date: string | null
    notes: string | null
    status: 'active' | 'returned'
    created_at: string
    updated_at: string
    equipment_name: string
    equipment_category: string
    equipment_brand: string | null
    equipment_model: string | null
    equipment_serial: string | null
    equipment_status: string
    employee_name: string
    employee_nick_name: string | null
    employee_code: string | null
    assigned_by_name: string | null
}

export interface EmployeeOption {
    id: string
    name: string
    nick_name: string | null
    employee_id: string | null
}

interface PaginatedResponse<T> {
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    [key: string]: T[] | { page: number; limit: number; total: number; totalPages: number }
}

// ── Service ──

export const equipmentService = {
    // ─── สถิติ ───
    getStats: async (): Promise<EquipmentStats> => {
        const res = await api.get<{ success: boolean; data: EquipmentStats }>('/equipment/stats')
        return res.data.data
    },

    // ─── อุปกรณ์ ───
    getEquipment: async (params: {
        page?: number
        limit?: number
        search?: string
        category?: string
        status?: string
        sortBy?: string
        sortOrder?: string
    }): Promise<{ equipment: Equipment[]; pagination: PaginatedResponse<Equipment>['pagination'] }> => {
        const res = await api.get<{ success: boolean; data: { equipment: Equipment[]; pagination: PaginatedResponse<Equipment>['pagination'] } }>(
            '/equipment',
            { params }
        )
        return res.data.data
    },

    createEquipment: async (data: {
        name: string
        category: string
        brand?: string
        model?: string
        serial_number?: string
        description?: string
        cpu?: string
        ram?: string
        storage?: string
        display?: string
        gpu?: string
        os?: string
        purchase_date?: string
        warranty_expire_date?: string
        purchase_price?: number
    }) => {
        const res = await api.post('/equipment', data)
        return res.data
    },

    updateEquipment: async (id: string, data: {
        name: string
        category: string
        brand?: string
        model?: string
        serial_number?: string
        status?: string
        description?: string
        cpu?: string
        ram?: string
        storage?: string
        display?: string
        gpu?: string
        os?: string
        purchase_date?: string
        warranty_expire_date?: string
        purchase_price?: number
    }) => {
        const res = await api.put(`/equipment/${id}`, data)
        return res.data
    },

    deleteEquipment: async (id: string) => {
        const res = await api.delete(`/equipment/${id}`)
        return res.data
    },

    // ─── การยืม ───
    getBorrowings: async (params: {
        page?: number
        limit?: number
        search?: string
        status?: string
        sortBy?: string
        sortOrder?: string
    }): Promise<{ borrowings: EquipmentBorrowing[]; pagination: PaginatedResponse<EquipmentBorrowing>['pagination'] }> => {
        const res = await api.get<{ success: boolean; data: { borrowings: EquipmentBorrowing[]; pagination: PaginatedResponse<EquipmentBorrowing>['pagination'] } }>(
            '/equipment/borrowings',
            { params }
        )
        return res.data.data
    },

    createBorrowing: async (data: {
        equipment_id: string
        borrow_date: string
        expected_return_date: string
        purpose?: string
    }) => {
        const res = await api.post('/equipment/borrowings', data)
        return res.data
    },

    approveBorrowing: async (id: string) => {
        const res = await api.put(`/equipment/borrowings/${id}/approve`)
        return res.data
    },

    rejectBorrowing: async (id: string, notes?: string) => {
        const res = await api.put(`/equipment/borrowings/${id}/reject`, { notes })
        return res.data
    },

    returnBorrowing: async (id: string, notes?: string) => {
        const res = await api.put(`/equipment/borrowings/${id}/return`, { notes })
        return res.data
    },

    deleteBorrowing: async (id: string) => {
        const res = await api.delete(`/equipment/borrowings/${id}`)
        return res.data
    },

    // ─── การมอบหมายอุปกรณ์ ───
    getAssignments: async (params: {
        page?: number
        limit?: number
        search?: string
        status?: string
        employee_id?: string
        sortBy?: string
        sortOrder?: string
    }): Promise<{ assignments: EquipmentAssignment[]; pagination: PaginatedResponse<EquipmentAssignment>['pagination'] }> => {
        const res = await api.get<{ success: boolean; data: { assignments: EquipmentAssignment[]; pagination: PaginatedResponse<EquipmentAssignment>['pagination'] } }>(
            '/equipment/assignments',
            { params }
        )
        return res.data.data
    },

    createAssignment: async (data: {
        equipment_id: string
        assigned_to: string
        assigned_date?: string
        notes?: string
    }) => {
        const res = await api.post('/equipment/assignments', data)
        return res.data
    },

    returnAssignment: async (id: string, notes?: string) => {
        const res = await api.put(`/equipment/assignments/${id}/return`, { notes })
        return res.data
    },

    deleteAssignment: async (id: string) => {
        const res = await api.delete(`/equipment/assignments/${id}`)
        return res.data
    },

    // ─── พนักงาน (dropdown) ───
    getEmployees: async (): Promise<EmployeeOption[]> => {
        const res = await api.get<{ success: boolean; data: EmployeeOption[] }>('/equipment/employees')
        return res.data.data
    },
}
