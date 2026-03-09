import api from './api'

export interface InternalChatMessage {
  id: number
  build: string
  sender_employee_id: string
  sender_name: string
  message: string
  reply_to_id: number | null
  reply_to_message: string | null
  reply_to_sender_name: string | null
  created_at: string
  updated_at: string
}

export interface InternalChatListResponse {
  success: boolean
  data: InternalChatMessage[]
}

export interface InternalChatDetailResponse {
  success: boolean
  data: InternalChatMessage
}

export interface ChatRecentActivity {
  build: string
  company_name: string
  last_message: string
  last_sender_name: string
  last_sender_employee_id: string
  last_message_at: string
  total_messages: number
  is_active: 0 | 1  // 1 = มีข้อความในช่วง 1 ชั่วโมงที่ผ่านมา
}

export interface ChatRecentActivityResponse {
  success: boolean
  data: ChatRecentActivity[]
}

export const internalChatService = {
  /**
   * Fetch chat history for a specific client (identified by build)
   * @param build The client's build ID
   * @param page Page number (1-indexed)
   * @param limit Items per page
   */
  async getChatsByBuild(build: string, page = 1, limit = 50): Promise<InternalChatListResponse> {
    const offset = (page - 1) * limit
    const response = await api.get<InternalChatListResponse>(`/internal-chats/${build}`, {
      params: { limit, offset }
    })
    return response.data
  },

  /**
   * Send a new chat message
   * @param payload Message data
   */
  async sendMessage(payload: {
    build: string
    message: string
    reply_to_id?: number | null
    mentioned_employee_ids?: string[]
  }): Promise<InternalChatDetailResponse> {
    const response = await api.post<InternalChatDetailResponse>('/internal-chats', payload)
    return response.data
  },

  /**
   * Delete a chat message
   * @param id Message ID
   */
  async deleteMessage(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/internal-chats/${id}`)
    return response.data
  },

  /**
   * Get recent chat activity across all client rooms
   * Returns last message, sender, timestamp per build — sorted by recency
   */
  async getRecentActivity(): Promise<ChatRecentActivityResponse> {
    const response = await api.get<ChatRecentActivityResponse>('/internal-chats/recent-activity')
    return response.data
  },
}

export default internalChatService
