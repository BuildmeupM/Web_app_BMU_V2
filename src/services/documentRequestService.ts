/**
 * Document Request Service
 * API service functions สำหรับการจัดการคำขอเอกสาร
 */

import api from './api'

// Types
export interface DocumentRequest {
    id: string
    employee_id: string
    request_date: string
    document_type: 'หนังสือรับรองการทำงาน' | 'หนังสือรับรองเงินเดือน'
    purpose: string | null
    copies: number
    status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ' | 'ออกเอกสารแล้ว'
    approved_by: string | null
    approved_at: string | null
    approver_note: string | null
    issued_at: string | null
    created_at: string
    updated_at: string
    employee_name?: string
    employee_nick_name?: string
    employee_position?: string
    approver_name?: string
}

export interface DocumentRequestListResponse {
    success: boolean
    data: {
        requests: DocumentRequest[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
}

export const documentRequestService = {
    /**
     * ดึงรายการคำขอเอกสาร
     */
    getAll: async (params?: {
        page?: number
        limit?: number
        status?: string
        document_type?: string
        search?: string
        employee_id?: string
    }) => {
        const response = await api.get<DocumentRequestListResponse>(
            '/document-requests',
            { params }
        )
        return response.data
    },

    /**
     * ดึงคำขอที่รออนุมัติ (Admin/HR only)
     */
    getPending: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get<DocumentRequestListResponse>(
            '/document-requests/pending',
            { params }
        )
        return response.data
    },

    /**
     * สร้างคำขอเอกสารใหม่
     */
    create: async (data: {
        document_type: DocumentRequest['document_type']
        purpose?: string
        copies?: number
    }) => {
        const response = await api.post<{ success: boolean; data: { request: DocumentRequest } }>(
            '/document-requests',
            data
        )
        return response.data
    },

    /**
     * อนุมัติคำขอ (Admin/HR only)
     */
    approve: async (id: string, data?: { approver_note?: string }) => {
        const response = await api.put<{ success: boolean; data: { request: DocumentRequest } }>(
            `/document-requests/${id}/approve`,
            data
        )
        return response.data
    },

    /**
     * ไม่อนุมัติคำขอ (Admin/HR only)
     */
    reject: async (id: string, data: { approver_note: string }) => {
        const response = await api.put<{ success: boolean; data: { request: DocumentRequest } }>(
            `/document-requests/${id}/reject`,
            data
        )
        return response.data
    },

    /**
     * ออกเอกสารแล้ว (Admin/HR only)
     */
    issue: async (id: string) => {
        const response = await api.put<{ success: boolean; data: { request: DocumentRequest } }>(
            `/document-requests/${id}/issue`
        )
        return response.data
    },

    /**
     * ลบ/ยกเลิกคำขอเอกสาร (เฉพาะสถานะ "รออนุมัติ")
     */
    delete: async (id: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(
            `/document-requests/${id}`
        )
        return response.data
    },
}
