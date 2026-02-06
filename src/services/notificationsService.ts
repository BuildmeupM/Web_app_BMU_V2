/**
 * Notifications Service
 * Service สำหรับจัดการ notifications
 */

import api from './api'

/**
 * Notification Interface (รองรับการพัฒนาต่อในอนาคต)
 */
export interface Notification {
  id: string
  user_id: string
  type:
    | 'password_change'
    | 'user_created'
    | 'user_updated'
    | 'user_deleted'
    | 'leave_request_created'
    | 'leave_request_approved'
    | 'leave_request_rejected'
    | 'leave_request_cancelled'
    | 'wfh_request_created'
    | 'wfh_request_approved'
    | 'wfh_request_rejected'
    | 'wfh_request_cancelled'
    | 'work_assignment_created'
    | 'work_assignment_updated'
    | 'work_assignment_deleted'
    | 'client_created'
    | 'client_updated'
    | 'client_deleted'
    | 'client_import_completed'
    | 'tax_data_updated'
    | 'tax_filing_due'
    | 'document_entry_completed'
    | 'document_entry_pending'
    | 'tax_review_pending'
    | 'tax_review_pending_recheck'
    | 'tax_inspection_completed'
    | 'system'
    | 'reminder'
    | 'alert'
    | 'info'
  category?: string | null // user_management, leave, work_assignment, client, tax, document, system
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  icon?: string | null // ชื่อไอคอน เช่น TbBell, TbAlertCircle
  color?: string | null // สี เช่น blue, green, orange, red
  action_url?: string | null // URL สำหรับไปยังหน้าที่เกี่ยวข้อง
  action_label?: string | null // ข้อความบนปุ่ม action
  related_user_id?: string | null
  related_username?: string | null
  related_user_name?: string | null
  related_entity_type?: string | null // leave_request, work_assignment, client, etc.
  related_entity_id?: string | null // ID ของ entity ที่เกี่ยวข้อง
  metadata?: Record<string, any> | null // ข้อมูลเพิ่มเติมในรูปแบบ JSON
  is_read: boolean
  read_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Notifications List Response
 */
export interface NotificationsListResponse {
  success: boolean
  data: Notification[]
  unread_count: number
}

/**
 * Create Notification Request (รองรับการพัฒนาต่อในอนาคต)
 */
export interface CreateNotificationRequest {
  user_id: string
  type: Notification['type']
  category?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  icon?: string | null
  color?: string | null
  action_url?: string | null
  action_label?: string | null
  related_user_id?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  metadata?: Record<string, any> | null
  expires_at?: string | null
}

const notificationsService = {
  /**
   * Get notifications list
   */
  async getList(params?: {
    is_read?: boolean
    limit?: number
  }): Promise<NotificationsListResponse> {
    const response = await api.get<NotificationsListResponse>('/notifications', { params })
    return response.data
  },

  /**
   * Create notification (Admin only)
   */
  async create(data: CreateNotificationRequest): Promise<Notification> {
    const response = await api.post<{ success: boolean; data: Notification }>('/notifications', data)
    return response.data.data
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`)
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all')
  },

  /**
   * Delete notification
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },
}

export default notificationsService
