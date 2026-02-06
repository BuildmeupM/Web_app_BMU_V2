/**
 * Leave & WFH Service
 * API service functions สำหรับการจัดการการลาและ WFH
 */

import api from './api'

// Types
export interface LeaveRequest {
  id: string
  employee_id: string
  request_date: string
  leave_start_date: string
  leave_end_date: string
  leave_type: 'ลาป่วย' | 'ลากิจ' | 'ลาพักร้อน' | 'ลาไม่รับค่าจ้าง' | 'ลาอื่นๆ'
  leave_days: number
  reason: string | null
  status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ'
  approved_by: string | null
  approved_at: string | null
  approver_note: string | null
  created_at: string
  updated_at: string
  employee_name?: string
  employee_nick_name?: string
  employee_position?: string
  approver_name?: string
}

export interface WFHRequest {
  id: string
  employee_id: string
  request_date: string
  wfh_date: string
  status: 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ'
  approved_by: string | null
  approved_at: string | null
  approver_note: string | null
  work_report: string | null
  work_report_submitted_at: string | null
  created_at: string
  updated_at: string
  employee_name?: string
  employee_nick_name?: string
  employee_position?: string
  approver_name?: string
}

export interface LeaveRequestListResponse {
  success: boolean
  data: {
    leave_requests: LeaveRequest[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface WFHRequestListResponse {
  success: boolean
  data: {
    wfh_requests: WFHRequest[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface LeaveDashboardResponse {
  success: boolean
  data: {
    summary: {
      total_leave_days: number
      used_leave_days: number
      remaining_leave_days: number
      pending_leave_days: number
    }
    by_type: Record<string, { count: number; days: number }>
    upcoming_leaves: Array<{
      id: string
      employee_id: string
      leave_start_date: string
      leave_end_date: string
      leave_type: string
      leave_days: number
      employee_name: string
      employee_position: string
    }>
  }
}

export interface WFHDashboardResponse {
  success: boolean
  data: {
    summary: {
      monthly_limit: number
      used_wfh_days: number
      remaining_wfh_days: number
    }
    work_reports: Array<{
      id: string
      wfh_date: string
      work_report: string
      work_report_submitted_at: string
    }>
  }
}

export interface WFHCalendarResponse {
  success: boolean
  data: {
    calendar: Array<{
      date: string
      approved_count: number
      status: 'available' | 'warning' | 'full'
      requests: Array<{
        id: string
        employee_id: string
        employee_name: string
        status: string
      }>
    }>
    month: string
    limits: {
      daily_limit: number
      monthly_limit: number
      used_this_month: number
    }
  }
}

// Leave Requests API

export const leaveService = {
  /**
   * ดึงรายการการลาทั้งหมด
   */
  getAll: async (params?: {
    page?: number
    limit?: number
    status?: string
    leave_type?: string
    start_date?: string
    end_date?: string
    search?: string
    employee_id?: string
  }) => {
    // If employee_id is provided, always filter by it (even for admin)
    // This ensures "ข้อมูลการลางาน" tab shows only own data
    const response = await api.get<LeaveRequestListResponse>(
      '/leave-requests',
      { params }
    )
    return response.data
  },

  /**
   * ดึงการลาที่รออนุมัติ (HR/Admin only)
   */
  getPending: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<LeaveRequestListResponse>(
      '/leave-requests/pending',
      { params }
    )
    return response.data
  },

  /**
   * ดึงข้อมูลการลาตาม ID
   */
  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: { leave_request: LeaveRequest } }>(
      `/leave-requests/${id}`
    )
    return response.data
  },

  /**
   * ดึงข้อมูล Dashboard การลา
   */
  getDashboard: async (params?: { employee_id?: string; year?: number }) => {
    const response = await api.get<LeaveDashboardResponse>(
      '/leave-requests/dashboard/summary',
      { params }
    )
    return response.data
  },

  /**
   * ดึงข้อมูลการลาแบบรายวันสำหรับกราฟแท่ง
   */
  getDailyStats: async (params?: { month?: string; compare_previous?: boolean }) => {
    const response = await api.get<{
      success: boolean
      data: {
        current_month: {
          month: string
          daily_stats: Array<{
            leave_date: string
            approved_employee_count: number
            pending_employee_count: number
            approved_count: number
            pending_count: number
          }>
        }
        previous_month: {
          month: string
          daily_stats: Array<{
            leave_date: string
            approved_employee_count: number
            pending_employee_count: number
            approved_count: number
            pending_count: number
          }>
        } | null
      }
    }>('/leave-requests/dashboard/daily', {
      params: {
        ...params,
        compare_previous: params?.compare_previous ? 'true' : 'false',
      },
    })
    return response.data
  },

  /**
   * สร้างการขอลาใหม่
   */
  create: async (data: {
    leave_start_date: string
    leave_end_date: string
    leave_type: LeaveRequest['leave_type']
    reason?: string | null
  }) => {
    const response = await api.post<{ success: boolean; data: { leave_request: LeaveRequest } }>(
      '/leave-requests',
      data
    )
    return response.data
  },

  /**
   * อนุมัติการลา (HR/Admin only)
   */
  approve: async (id: string, data?: { approver_note?: string }) => {
    const response = await api.put<{ success: boolean; data: { leave_request: LeaveRequest } }>(
      `/leave-requests/${id}/approve`,
      data
    )
    return response.data
  },

  /**
   * ปฏิเสธการลา (HR/Admin only)
   */
  reject: async (id: string, data: { approver_note: string }) => {
    const response = await api.put<{ success: boolean; data: { leave_request: LeaveRequest } }>(
      `/leave-requests/${id}/reject`,
      data
    )
    return response.data
  },
}

// WFH Requests API

export const wfhService = {
  /**
   * ดึงรายการการขอ WFH ทั้งหมด
   */
  getAll: async (params?: {
    page?: number
    limit?: number
    status?: string
    start_date?: string
    end_date?: string
    search?: string
    employee_id?: string
  }) => {
    const response = await api.get<WFHRequestListResponse>(
      '/wfh-requests',
      { params }
    )
    return response.data
  },

  /**
   * ดึงการขอ WFH ที่รออนุมัติ (HR/Admin only)
   */
  getPending: async (params?: { page?: number; limit?: number; wfh_date?: string }) => {
    const response = await api.get<WFHRequestListResponse>(
      '/wfh-requests/pending',
      { params }
    )
    return response.data
  },

  /**
   * ดึงข้อมูลสำหรับ Calendar view
   */
  getCalendar: async (params?: { month?: string; year?: number }) => {
    const response = await api.get<WFHCalendarResponse>(
      '/wfh-requests/calendar',
      { params }
    )
    return response.data
  },

  /**
   * ดึงข้อมูลการขอ WFH ตาม ID
   */
  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: { wfh_request: WFHRequest } }>(
      `/wfh-requests/${id}`
    )
    return response.data
  },

  /**
   * ดึงข้อมูล Dashboard WFH
   */
  getDashboard: async (params?: { employee_id?: string; month?: string }) => {
    const response = await api.get<WFHDashboardResponse>(
      '/wfh-requests/dashboard/summary',
      { params }
    )
    return response.data
  },

  /**
   * ดึงข้อมูล WFH รายวันสำหรับกราฟ (Admin only)
   */
  getDailyStats: async (params?: { month?: string }) => {
    const response = await api.get<{
      success: boolean
      data: {
        current_month: {
          month: string
          daily_stats: Array<{
            wfh_date: string
            approved_employee_count: number
            pending_employee_count: number
            approved_count: number
            pending_count: number
          }>
        }
      }
    }>('/wfh-requests/dashboard/daily', { params })
    return response.data
  },

  /**
   * ดึงรายงานการทำงาน (Admin only)
   */
  getWorkReports: async (params?: { month?: string }) => {
    const response = await api.get<{
      success: boolean
      data: {
        month: string
        submitted: Array<WFHRequest & { employee_name?: string; employee_nick_name?: string; employee_position?: string }>
        not_submitted: Array<WFHRequest & { employee_name?: string; employee_nick_name?: string; employee_position?: string }>
        overdue: Array<WFHRequest & { employee_name?: string; employee_nick_name?: string; employee_position?: string }>
        summary: {
          total: number
          submitted: number
          not_submitted: number
          overdue: number
        }
      }
    }>('/wfh-requests/work-reports', { params })
    return response.data
  },

  /**
   * สร้างการขอ WFH ใหม่
   */
  create: async (data: { wfh_date: string }) => {
    const response = await api.post<{ success: boolean; data: { wfh_request: WFHRequest } }>(
      '/wfh-requests',
      data
    )
    return response.data
  },

  /**
   * อนุมัติการขอ WFH (HR/Admin only)
   */
  approve: async (id: string, data?: { approver_note?: string }) => {
    const response = await api.put<{ success: boolean; data: { wfh_request: WFHRequest } }>(
      `/wfh-requests/${id}/approve`,
      data
    )
    return response.data
  },

  /**
   * ปฏิเสธการขอ WFH (HR/Admin only)
   */
  reject: async (id: string, data: { approver_note: string }) => {
    const response = await api.put<{ success: boolean; data: { wfh_request: WFHRequest } }>(
      `/wfh-requests/${id}/reject`,
      data
    )
    return response.data
  },

  /**
   * ส่งรายงานการทำงาน
   */
  submitWorkReport: async (id: string, data: { work_report: string }) => {
    const response = await api.put<{ success: boolean; data: { wfh_request: WFHRequest } }>(
      `/wfh-requests/${id}/work-report`,
      data
    )
    return response.data
  },
}
