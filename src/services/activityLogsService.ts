import api from './api'

export interface ActivityLog {
    id: number
    user_id: string
    employee_id: string | null
    user_name: string | null
    action: string
    page: string
    entity_type: string
    entity_id: string | null
    build: string | null
    company_name: string | null
    description: string | null
    field_changed: string | null
    old_value: string | null
    new_value: string | null
    metadata: Record<string, unknown> | null
    ip_address: string | null
    created_at: string
}

export interface ActivityLogStats {
    todayCount: number
    weekCount: number
    monthCount: number
    activeUsers: number
    topPage: string | null
    corrections: number
}

export interface ChartDataPoint {
    date: string
    count: number
}

export interface PageBreakdown {
    page: string
    count: number
}

export interface ChartData {
    trend: ChartDataPoint[]
    pageBreakdown: PageBreakdown[]
}

export interface EmployeeSummary {
    employee_id: string
    user_name: string
    total_actions: number
    status_updates: number
    data_creates: number
    data_edits: number
}

export interface CorrectionSummary {
    employee_id: string
    user_name: string
    correction_count: number
    last_correction: string
}

export interface LogListResponse {
    logs: ActivityLog[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export const activityLogsService = {
    getStats: async (): Promise<ActivityLogStats> => {
        const response = await api.get<{ success: boolean; data: ActivityLogStats }>(
            '/activity-logs/stats'
        )
        return response.data.data
    },

    getList: async (params: {
        page?: number
        limit?: number
        userId?: string
        pageName?: string
        action?: string
        startDate?: string
        endDate?: string
        build?: string
        search?: string
    }): Promise<LogListResponse> => {
        const response = await api.get<{ success: boolean; data: LogListResponse }>(
            '/activity-logs/list',
            { params }
        )
        return response.data.data
    },

    getChart: async (days: number = 7): Promise<ChartData> => {
        const response = await api.get<{ success: boolean; data: ChartData }>(
            '/activity-logs/chart',
            { params: { days } }
        )
        return response.data.data
    },

    getEmployeeSummary: async (): Promise<EmployeeSummary[]> => {
        const response = await api.get<{ success: boolean; data: EmployeeSummary[] }>(
            '/activity-logs/employee-summary'
        )
        return response.data.data
    },

    getCorrectionSummary: async (): Promise<CorrectionSummary[]> => {
        const response = await api.get<{ success: boolean; data: CorrectionSummary[] }>(
            '/activity-logs/correction-summary'
        )
        return response.data.data
    },
}
