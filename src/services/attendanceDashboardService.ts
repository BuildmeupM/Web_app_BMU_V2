import api from './api'

export interface EmployeeAttendance {
    id: string
    employee_id: string
    first_name: string
    nick_name: string | null
    position: string | null
    profile_image: string | null
    attendance_status: 'office' | 'leave' | 'wfh'
    leave_type: string | null
}

export interface PositionSummary {
    position: string
    total: number
    office: number
    leave: number
    wfh: number
}

export interface BirthdayEmployee {
    id: string
    employee_id: string
    first_name: string
    nick_name: string | null
    birth_date: string
    birth_day: number
}

export interface NewHireEmployee {
    id: string
    employee_id: string
    first_name: string
    nick_name: string | null
    position: string | null
    hire_date: string
    days_since_hire: number
}

export interface ProbationEmployee {
    id: string
    employee_id: string
    first_name: string
    nick_name: string | null
    position: string | null
    hire_date: string
    probation_end_date: string
    days_remaining: number
}

export interface AttendanceDashboardData {
    date: string
    summary: {
        total: number
        office: number
        leave: number
        wfh: number
    }
    by_position: PositionSummary[]
    employees: EmployeeAttendance[]
    on_leave_today: Array<{
        employee_id: string
        leave_type: string
        first_name: string
        nick_name: string | null
        position: string | null
    }>
    wfh_today: Array<{
        employee_id: string
        first_name: string
        nick_name: string | null
        position: string | null
    }>
    birthdays_this_month: BirthdayEmployee[]
    new_hires: NewHireEmployee[]
    probation_ending: ProbationEmployee[]
}

export const attendanceDashboardService = {
    getDashboard: async (date?: string): Promise<AttendanceDashboardData> => {
        const params = date ? `?date=${date}` : ''
        const response = await api.get(`/attendance-dashboard${params}`)
        return response.data.data
    },
}
