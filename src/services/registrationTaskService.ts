/**
 * Registration Task Service
 * API service สำหรับจัดการรายการงานจริง — งานทะเบียน (DBD, RD, SSO, HR)
 * รวม Step Tracking + Comments
 */

import api from './api'
import type { Department } from './registrationWorkService'

// ================== Types ==================

export interface RegistrationTask {
    id: string
    department: Department
    received_date: string
    client_id: string
    client_name: string
    job_type: string
    job_type_sub: string
    responsible_id: string
    responsible_name: string
    status: 'pending' | 'in_progress' | 'completed'
    notes: string
    step_1: boolean
    step_2: boolean
    step_3: boolean
    step_4: boolean
    step_5: boolean
    completion_date: string | null
    invoice_url: string | null
    // Messenger fields
    needs_messenger: boolean
    messenger_destination: string | null
    messenger_details: string | null
    messenger_notes: string | null
    messenger_status: 'pending' | 'scheduled' | 'completed'
    // Payment fields
    payment_status: 'paid_full' | 'deposit' | 'free' | 'unpaid'
    deposit_amount: number | null
    created_at: string
}

export interface RegistrationTaskCreateData {
    department: Department
    received_date: string
    client_id: string
    client_name: string
    job_type: string
    job_type_sub?: string
    responsible_id: string
    responsible_name: string
    status?: string
    notes?: string
}

export interface RegistrationTaskUpdateData {
    received_date?: string
    client_id?: string
    client_name?: string
    job_type?: string
    job_type_sub?: string
    responsible_id?: string
    responsible_name?: string
    status?: string
    notes?: string
    step_1?: boolean
    step_2?: boolean
    step_3?: boolean
    step_4?: boolean
    step_5?: boolean
    completion_date?: string | null
    invoice_url?: string | null
    // Messenger fields
    needs_messenger?: boolean
    messenger_destination?: string | null
    messenger_details?: string | null
    messenger_notes?: string | null
    messenger_status?: string | null
    // Payment fields
    payment_status?: string | null
    deposit_amount?: number | null
}

export interface TaskComment {
    id: string
    task_id: string
    user_id: string
    user_name: string
    user_color?: string
    message: string
    created_at: string
}

export interface RegistrationTaskListResponse {
    tasks: RegistrationTask[]
    count: number
}

// ================== Service ==================

export const registrationTaskService = {
    /**
     * ดึงรายการงานทั้งหมด (กรองตาม department)
     */
    getByDepartment: async (department: Department): Promise<RegistrationTaskListResponse> => {
        const response = await api.get(`/registration-tasks?department=${department}&_t=${Date.now()}`)
        return response.data.data
    },

    /**
     * ดึงงานทั้งหมดของลูกค้า (ข้ามหน่วยงาน)
     */
    getByClientId: async (clientId: string): Promise<RegistrationTask[]> => {
        const response = await api.get(`/registration-tasks?client_id=${clientId}&_t=${Date.now()}`)
        return response.data.data?.tasks || response.data.data || []
    },

    /**
     * สร้างรายการงานใหม่
     */
    create: async (data: RegistrationTaskCreateData): Promise<RegistrationTask> => {
        const response = await api.post('/registration-tasks', data)
        return response.data.data.task
    },

    /**
     * แก้ไขรายการงาน (รวม steps + completion)
     */
    update: async (id: string, data: RegistrationTaskUpdateData): Promise<RegistrationTask> => {
        const response = await api.put(`/registration-tasks/${id}`, data)
        return response.data.data.task
    },

    /**
     * ลบรายการงาน (soft delete)
     */
    delete: async (id: string): Promise<void> => {
        await api.delete(`/registration-tasks/${id}`)
    },

    // ============== Comments ==============

    /**
     * ดึงความเห็นทั้งหมดของงาน
     */
    getComments: async (taskId: string): Promise<TaskComment[]> => {
        const response = await api.get(`/registration-tasks/${taskId}/comments?_t=${Date.now()}`)
        return response.data.data.comments
    },

    /**
     * เพิ่มความเห็นใหม่
     */
    addComment: async (taskId: string, message: string): Promise<TaskComment> => {
        const response = await api.post(`/registration-tasks/${taskId}/comments`, { message })
        return response.data.data.comment
    },

    /**
     * ลบความเห็น
     */
    deleteComment: async (taskId: string, commentId: string): Promise<void> => {
        await api.delete(`/registration-tasks/${taskId}/comments/${commentId}`)
    },
}
