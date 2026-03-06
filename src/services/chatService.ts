import api from './api'

export interface ChatUser {
  id: string
  employee_id: string
  username: string
  name: string
  role: string
  department?: string
  position?: string
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  last_read_at?: string
  other_user_id: string
  other_user_name: string
  other_user_role: string
  last_message?: string
  last_message_time?: string
  unread_count: number
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  message_text: string
  created_at: string
}

export const chatService = {
  // ดึงรายชื่อพนักงานทั้งหมด (ยกเว้นตัวเอง) เพื่อเริ่มแชท
  getDirectory: async () => {
    const response = await api.get<{ success: boolean; data: ChatUser[] }>('/chat/directory')
    return response.data
  },

  // ดึงประวัติห้องแชท (Inbox) ของตัวเอง
  getConversations: async () => {
    const response = await api.get<{ success: boolean; data: Conversation[] }>('/chat/conversations')
    return response.data
  },

  // เข้าห้องแชท (โหลดประวัติข้อความ)
  getMessages: async (conversationId: string) => {
    const response = await api.get<{ success: boolean; data: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`)
    return response.data
  },

  // สร้า่ง/เริ่มคุยแชท 1-1 ใหม่
  initConversation: async (targetUserId: string) => {
    const response = await api.post<{ success: boolean; data: { conversation_id: string } }>('/chat/conversations/init', {
      targetUserId,
    })
    return response.data
  },
}

export default chatService
