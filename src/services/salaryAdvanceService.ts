/**
 * Salary Advance Service
 * API service functions สำหรับการจัดการการขอเบิกเงินเดือนล่วงหน้า
 */

import api from './api'

// Types
export interface SalaryAdvanceRequest {
    id: string
    employee_id: string
    request_date: string
    amount: number
    status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ'
    approved_by: string | null
    approved_at: string | null
    approver_note: string | null
    created_at: string
    updated_at: string
    employee_name?: string
    employee_nick_name?: string
    employee_position?: string
    approver_name?: string
}

export interface SalaryAdvanceListResponse {
    success: boolean
    data: {
        requests: SalaryAdvanceRequest[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
}

export interface SalaryAdvanceDashboardResponse {
    success: boolean
    data: {
        salary_advance: {
            summary: {
                total_requests: number
                pending_count: number
                approved_count: number
                rejected_count: number
                total_approved_amount: number
                total_pending_amount: number
                total_requested_amount: number
            }
            monthly_trend: Array<{
                month: string
                total_requests: number
                approved_count: number
                approved_amount: number
            }>
            top_requesters: Array<{
                employee_id: string
                employee_name: string
                employee_nick_name: string
                employee_position: string
                request_count: number
                total_amount: number
            }>
        }
        document_requests: {
            summary: {
                total_requests: number
                pending_count: number
                approved_count: number
                issued_count: number
                cert_work_count: number
                cert_salary_count: number
            }
        }
        filter: {
            year: number
            month: number
        }
    }
}

export const salaryAdvanceService = {
    /**
     * ดึงรายการคำขอเบิกเงินเดือน
     */
    getAll: async (params?: {
        page?: number
        limit?: number
        status?: string
        start_date?: string
        end_date?: string
        search?: string
        employee_id?: string
    }) => {
        const response = await api.get<SalaryAdvanceListResponse>(
            '/salary-advance',
            { params }
        )
        return response.data
    },

    /**
     * ดึงคำขอที่รออนุมัติ (Admin/HR only)
     */
    getPending: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get<SalaryAdvanceListResponse>(
            '/salary-advance/pending',
            { params }
        )
        return response.data
    },

    /**
     * ดึงข้อมูล Dashboard
     */
    getDashboard: async (params?: { year?: number; month?: number }) => {
        const response = await api.get<SalaryAdvanceDashboardResponse>(
            '/salary-advance/dashboard',
            { params }
        )
        return response.data
    },

    /**
     * สร้างคำขอเบิกเงินเดือนใหม่
     */
    create: async (data: { amount: number }) => {
        const response = await api.post<{ success: boolean; data: { request: SalaryAdvanceRequest } }>(
            '/salary-advance',
            data
        )
        return response.data
    },

    /**
     * อนุมัติคำขอ (Admin/HR only)
     */
    approve: async (id: string, data?: { approver_note?: string }) => {
        const response = await api.put<{ success: boolean; data: { request: SalaryAdvanceRequest } }>(
            `/salary-advance/${id}/approve`,
            data
        )
        return response.data
    },

    /**
     * ไม่อนุมัติคำขอ (Admin/HR only)
     */
    reject: async (id: string, data: { approver_note: string }) => {
        const response = await api.put<{ success: boolean; data: { request: SalaryAdvanceRequest } }>(
            `/salary-advance/${id}/reject`,
            data
        )
        return response.data
    },

    /**
     * ส่งออก Excel สรุปข้อมูลขอเบิกเงินเดือนและขอเอกสาร (Admin/HR only)
     */
    exportExcel: async (params?: { year?: number; month?: number }) => {
        const response = await api.get('/salary-advance/export-excel', {
            params,
            responseType: 'blob',
        })

        // Create download link
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers['content-disposition']
        let filename = `สรุปเบิกเงินเดือนและขอเอกสาร.xlsx`
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?(.+)/i)
            if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
            }
        }

        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    },

    /**
     * ลบ/ยกเลิกคำขอเบิกเงินเดือน (เฉพาะสถานะ "รออนุมัติ")
     */
    delete: async (id: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(
            `/salary-advance/${id}`
        )
        return response.data
    },
}
