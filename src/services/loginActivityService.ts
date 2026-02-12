import api from './api'

export interface LoginAttempt {
    id: string
    user_id: string | null
    username: string
    ip_address: string
    user_agent: string
    success: boolean
    failure_reason: string | null
    attempted_at: string
    user_name: string | null
    nick_name: string | null
}

export interface LoginStats {
    loginToday: number
    failedToday: number
    onlineUsers: number
    avgSessionMinutes: number
    totalAttempts: number
    uniqueUsersToday: number
}

export interface OnlineUser {
    user_id: string
    username: string
    login_at: string
    last_active_at: string
    ip_address: string
    user_agent: string
    user_name: string
    nick_name: string | null
    role: string
    session_duration_minutes: number
}

export interface ChartDataPoint {
    date: string
    success_count: number
    failed_count: number
    total_count: number
}

export interface AttemptsResponse {
    attempts: LoginAttempt[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface SessionSummary {
    user_id: string
    username: string
    user_name: string | null
    nick_name: string | null
    session_count: number
    total_minutes: number
    first_login: string
    last_activity: string
    is_online: number
}

export interface SessionDetail {
    session_id: string
    login_at: string
    logout_at: string | null
    last_active_at: string | null
    session_status: string
    ip_address: string
    duration_minutes: number
}

export interface SessionHistoryUser {
    user_id: string
    username: string
    user_name: string | null
    nick_name: string | null
    sessions: SessionDetail[]
}


export const loginActivityService = {
    getStats: async (): Promise<LoginStats> => {
        const response = await api.get<{ success: boolean; data: LoginStats }>('/login-activity/stats')
        return response.data.data
    },

    getAttempts: async (params: {
        page?: number
        limit?: number
        username?: string
        success?: string
        startDate?: string
        endDate?: string
        sortBy?: string
        sortOrder?: string
    }): Promise<AttemptsResponse> => {
        const response = await api.get<{ success: boolean; data: AttemptsResponse }>(
            '/login-activity/attempts',
            { params }
        )
        return response.data.data
    },

    getOnlineUsers: async (): Promise<{ users: OnlineUser[]; count: number }> => {
        const response = await api.get<{
            success: boolean
            data: { users: OnlineUser[]; count: number }
        }>('/login-activity/online-users')
        return response.data.data
    },

    getChartData: async (days: number = 7): Promise<ChartDataPoint[]> => {
        const response = await api.get<{ success: boolean; data: ChartDataPoint[] }>(
            '/login-activity/chart',
            { params: { days } }
        )
        return response.data.data
    },

    sendHeartbeat: async (sessionId?: string | null): Promise<void> => {
        await api.post('/login-activity/heartbeat', { sessionId })
    },

    deleteAttempt: async (id: string): Promise<void> => {
        await api.delete(`/login-activity/attempts/${id}`)
    },

    deleteAttempts: async (ids: string[]): Promise<{ deletedCount: number }> => {
        const response = await api.delete<{ success: boolean; deletedCount: number }>(
            '/login-activity/attempts',
            { data: { ids } }
        )
        return { deletedCount: response.data.deletedCount }
    },

    deleteAllAttempts: async (beforeDate?: string): Promise<{ deletedCount: number }> => {
        const response = await api.delete<{ success: boolean; deletedCount: number }>(
            '/login-activity/attempts',
            { data: { deleteAll: true, beforeDate } }
        )
        return { deletedCount: response.data.deletedCount }
    },

    getExternalIpAttempts: async (today?: boolean): Promise<{ attempts: LoginAttempt[]; count: number }> => {
        const params = today ? '?today=true' : ''
        const response = await api.get<{
            success: boolean
            data: { attempts: LoginAttempt[]; count: number }
        }>(`/login-activity/external-ips${params}`)
        return response.data.data
    },

    getSessionSummary: async (date?: string): Promise<{ date: string; summary: SessionSummary[]; totalUsers: number }> => {
        const response = await api.get<{
            success: boolean
            data: { date: string; summary: SessionSummary[]; totalUsers: number }
        }>('/login-activity/session-summary', { params: date ? { date } : {} })
        return response.data.data
    },

    getSessionHistory: async (date?: string): Promise<{ date: string; users: SessionHistoryUser[]; totalUsers: number; totalSessions: number }> => {
        const response = await api.get<{
            success: boolean
            data: { date: string; users: SessionHistoryUser[]; totalUsers: number; totalSessions: number }
        }>('/login-activity/session-history', { params: date ? { date } : {} })
        return response.data.data
    },
}
