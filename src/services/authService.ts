import api from './api'
import { User } from '../store/authStore'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
  sessionId?: string
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<{ data: LoginResponse }> => {
    const response = await api.post<{ success: boolean; message: string; data: LoginResponse }>('/auth/login', credentials)

    if (!response.data.success) {
      const error = new Error(response.data.message || 'Login failed')
      // @ts-expect-error - เพิ่ม response เพื่อให้ error handler สามารถเข้าถึงได้
      error.response = response
      throw error
    }

    return {
      data: response.data.data,
    }
  },

  logout: async (): Promise<void> => {
    try {
      // ส่ง sessionId ไปเพื่อบันทึก logout ใน user_sessions
      const { sessionId } = await import('../store/authStore').then(m => m.useAuthStore.getState())
      await api.post('/auth/logout', { sessionId })
    } catch (error) {
      // Ignore logout errors (อาจจะ token หมดอายุแล้ว)
      console.error('Logout error:', error)
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me')

    if (!response.data.success) {
      throw new Error('Failed to get current user')
    }

    return response.data.data
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    const response = await api.post<{ success: boolean; message: string }>('/auth/change-password', data)
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to change password')
    }
  },
}
