/**
 * Error Report Service
 * รายงานข้อผิดพลาดด้านภาษี
 */

import api from './api'

// =====================
// Types
// =====================
export interface ErrorReport {
    id: number
    report_date: string
    client_id: number
    client_name: string
    error_types: string[]
    tax_months: string[]
    accountant_id: string
    accountant_name: string
    auditor_id: string | null
    auditor_name: string | null
    fault_party: 'bmu' | 'customer'
    fine_amount: number
    submission_address: string | null
    status: 'pending' | 'approved' | 'rejected'
    approved_by: string | null
    approved_by_name: string | null
    approved_at: string | null
    reject_reason: string | null
    messenger_task_id: string | null
    messenger_status: string | null
    messenger_destination: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface ErrorReportForm {
    report_date: string
    client_id: number | null
    client_name: string
    error_types: string[]
    tax_months: string[]
    auditor_id: string | null
    auditor_name: string
    fault_party: 'bmu' | 'customer' | ''
    fine_amount: number | string
    submission_address: string
}

export interface AuditorOption {
    id: string
    name: string
}

export interface ClientOption {
    id: number
    name: string
}

// =====================
// Error type options
// =====================
export const ERROR_TYPE_OPTIONS = [
    { value: 'pnd1_401', label: 'แบบ ภ.ง.ด.1 40(1)' },
    { value: 'pnd1_402', label: 'แบบ ภ.ง.ด.1 40(2)' },
    { value: 'pnd3', label: 'แบบ ภ.ง.ด.3' },
    { value: 'pnd53', label: 'แบบ ภ.ง.ด.53' },
    { value: 'pp36', label: 'แบบ ภ.พ.36' },
    { value: 'pnd54', label: 'แบบ ภ.ง.ด.54' },
    { value: 'sso', label: 'แบบ ประกันสังคม' },
    { value: 'slf', label: 'แบบ กยศ.' },
    { value: 'pt40', label: 'แบบ ภ.ธ.40' },
    { value: 'pnd2', label: 'แบบ ภ.ง.ด.2' },
]

export const FAULT_PARTY_OPTIONS = [
    { value: 'bmu', label: 'พนักงาน BMU' },
    { value: 'customer', label: 'ลูกค้า' },
]

export const MONTH_OPTIONS = [
    { value: '01', label: 'มกราคม' },
    { value: '02', label: 'กุมภาพันธ์' },
    { value: '03', label: 'มีนาคม' },
    { value: '04', label: 'เมษายน' },
    { value: '05', label: 'พฤษภาคม' },
    { value: '06', label: 'มิถุนายน' },
    { value: '07', label: 'กรกฎาคม' },
    { value: '08', label: 'สิงหาคม' },
    { value: '09', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
]

// =====================
// API Functions
// =====================
export const errorReportService = {
    getAll: async (): Promise<ErrorReport[]> => {
        const response = await api.get('/error-reports')
        return response.data.data
    },

    create: async (data: ErrorReportForm): Promise<ErrorReport> => {
        const response = await api.post('/error-reports', data)
        return response.data.data
    },

    update: async (id: number, data: ErrorReportForm): Promise<ErrorReport> => {
        const response = await api.put(`/error-reports/${id}`, data)
        return response.data.data
    },

    approve: async (id: number): Promise<ErrorReport> => {
        const response = await api.post(`/error-reports/${id}/approve`)
        return response.data.data
    },

    reject: async (id: number, reject_reason: string): Promise<ErrorReport> => {
        const response = await api.post(`/error-reports/${id}/reject`, { reject_reason })
        return response.data.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/error-reports/${id}`)
    },

    getAuditors: async (): Promise<AuditorOption[]> => {
        const response = await api.get('/error-reports/auditors')
        return response.data.data
    },

    getClients: async (search?: string): Promise<ClientOption[]> => {
        const params = search ? `?search=${encodeURIComponent(search)}` : ''
        const response = await api.get(`/error-reports/clients${params}`)
        return response.data.data
    },
}
