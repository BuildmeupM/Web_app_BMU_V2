import api from './api'

/**
 * User Interface
 */
export interface User {
  id: string
  username: string
  email: string
  employee_id: string | null
  nick_name: string | null
  role: 'admin' | 'data_entry' | 'data_entry_and_service' | 'audit' | 'service'
  name: string
  status: 'active' | 'inactive'
  temporary_password?: string | null // รหัสผ่านชั่วคราวสำหรับ Admin ดู
  last_login_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Users List Response
 */
export interface UsersListResponse {
  success: boolean
  data: User[]
  total: number
}

/**
 * Create User Request
 */
export interface CreateUserRequest {
  username: string
  email: string
  password: string
  employee_id?: string | null
  nick_name?: string | null
  role: 'admin' | 'data_entry' | 'data_entry_and_service' | 'audit' | 'service'
  name: string
  status?: 'active' | 'inactive'
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  username: string
  email: string
  password?: string
  employee_id?: string | null
  nick_name?: string | null
  role: 'admin' | 'data_entry' | 'data_entry_and_service' | 'audit' | 'service'
  name: string
  status?: 'active' | 'inactive'
}

/**
 * User Detail Response
 */
export interface UserDetailResponse {
  success: boolean
  data: User
}

/**
 * Create User Response
 */
export interface CreateUserResponse {
  success: boolean
  message: string
  data: User
  temporary_password?: string // Plain password for one-time display
}

/**
 * Update User Response
 */
export interface UpdateUserResponse {
  success: boolean
  message: string
  data: User
}

/**
 * Delete User Response
 */
export interface DeleteUserResponse {
  success: boolean
  message: string
}

/**
 * Users Service
 */
const usersService = {
  /**
   * Get users list (can filter by role and status)
   */
  async getList(params?: {
    role?: string
    roles?: string // comma-separated roles (e.g., "service,data_entry_and_service")
    status?: string
    search?: string
  }): Promise<UsersListResponse> {
    const response = await api.get<UsersListResponse>('/users', { params })
    return response.data
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await api.get<UserDetailResponse>(`/users/${id}`)
    return response.data.data
  },

  /**
   * Create new user
   */
  async create(data: CreateUserRequest): Promise<{ user: User; temporaryPassword: string }> {
    const response = await api.post<CreateUserResponse>('/users', data)
    return {
      user: response.data.data,
      temporaryPassword: response.data.temporary_password || '',
    }
  },

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await api.put<UpdateUserResponse>(`/users/${id}`, data)
    return response.data.data
  },

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<void> {
    await api.delete<DeleteUserResponse>(`/users/${id}`)
  },

  /**
   * Reset user password (Admin only)
   */
  async resetPassword(id: string, newPassword: string): Promise<{ user: User; temporaryPassword: string }> {
    const response = await api.post<CreateUserResponse>(`/users/${id}/reset-password`, {
      password: newPassword,
    })
    return {
      user: response.data.data,
      temporaryPassword: response.data.temporary_password || '',
    }
  },
}

export default usersService
