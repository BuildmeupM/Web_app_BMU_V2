import api from './api'

/**
 * Employee Interface
 * ตรงกับ database schema
 */
export interface Employee {
  // Basic Information
  id: string
  employee_id: string
  user_id?: string | null
  position: string

  // Personal Information
  id_card: string | null
  gender: 'male' | 'female' | 'other'
  first_name: string
  last_name: string
  full_name: string
  english_name?: string | null
  nick_name?: string | null
  birth_date?: string | null

  // Contact Information
  phone?: string | null
  personal_email?: string | null
  company_email?: string | null

  // Employment Information
  hire_date: string
  probation_end_date?: string | null
  resignation_date?: string | null
  status: 'active' | 'resigned'

  // Address Information
  address_full?: string | null
  village?: string | null
  building?: string | null
  room_number?: string | null
  floor_number?: string | null
  house_number?: string | null
  soi_alley?: string | null
  moo?: string | null
  road?: string | null
  sub_district?: string | null
  district?: string | null
  province?: string | null
  postal_code?: string | null

  // Media
  profile_image?: string | null

  // Calculated Fields (from API)
  working_days?: number
  leave_statistics?: {
    total_leave_days: number
    used_leave_days: number
    remaining_leave_days: number
    breakdown?: Array<{
      type: string
      used: number
      quota: number | null
      remaining: number | null
    }>
  }
  wfh_statistics?: {
    used_wfh_days: number
  }

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

/**
 * Employee List Response
 */
export interface EmployeeListResponse {
  employees: Employee[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Create Employee DTO
 */
export interface CreateEmployeeDto {
  employee_id: string
  position: string
  id_card: string
  gender: 'male' | 'female' | 'other'
  first_name: string
  last_name: string
  english_name?: string
  nick_name?: string
  birth_date?: string
  phone?: string
  personal_email?: string
  company_email?: string
  company_email_password?: string
  hire_date: string
  probation_end_date?: string
  resignation_date?: string
  status?: 'active' | 'resigned'
  address_full?: string
  village?: string
  building?: string
  room_number?: string
  floor_number?: string
  house_number?: string
  soi_alley?: string
  moo?: string
  road?: string
  sub_district?: string
  district?: string
  province?: string
  postal_code?: string
  profile_image?: string
}

/**
 * Update Employee DTO
 */
export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> { }

/**
 * Employee Statistics
 */
export interface EmployeeStatistics {
  total_active: number
  total_resigned: number
  by_position: Array<{
    position: string
    count: number
  }>
  by_gender: Array<{
    gender: 'male' | 'female' | 'other'
    count: number
  }>
  hire_trend_6months: Array<{
    month: string
    hired: number
    resigned: number
  }>
  probation_reviews_next_90days: Array<{
    id: string
    employee_id: string
    full_name: string
    nick_name?: string | null
    position: string
    hire_date: string
    probation_end_date: string
    days_until_review: number
  }>
}

/**
 * Working Days Response
 */
export interface WorkingDaysResponse {
  employee_id: string
  hire_date: string
  working_days: number
  working_years: number
  working_months: number
  working_days_remaining: number
  calculation_date: string
}

/**
 * Employee Leave/WFH Statistics
 */
export interface EmployeeLeaveStatistics {
  employee_id: string
  leave_statistics: {
    total_leave_days: number
    used_leave_days: number
    remaining_leave_days: number
    pending_leave_days: number
  }
  wfh_statistics: {
    total_wfh_days: number
    used_wfh_days: number
    remaining_wfh_days: number
  }
  year: number
}

/**
 * Employee Service
 */
export const employeeService = {
  /**
   * Get employee list (paginated)
   */
  getAll: async (params?: {
    page?: number
    limit?: number
    search?: string
    position?: string
    status?: 'active' | 'resigned'
    includeDeleted?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<EmployeeListResponse> => {
    const response = await api.get<{ success: boolean; data: EmployeeListResponse }>(
      '/employees',
      { params }
    )
    return response.data.data
  },

  /**
   * Get employee by ID
   */
  getById: async (id: string): Promise<Employee> => {
    const response = await api.get<{ success: boolean; data: Employee }>(`/employees/${id}`)
    return response.data.data
  },

  /**
   * Create employee
   */
  create: async (data: CreateEmployeeDto): Promise<Employee> => {
    const response = await api.post<{ success: boolean; message: string; data: Employee }>(
      '/employees',
      data
    )
    return response.data.data
  },

  /**
   * Update employee
   */
  update: async (id: string, data: UpdateEmployeeDto): Promise<Employee> => {
    const response = await api.put<{ success: boolean; message: string; data: Employee }>(
      `/employees/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Delete employee (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/employees/${id}`)
  },

  /**
   * Get employee statistics (for Dashboard)
   */
  getStatistics: async (): Promise<EmployeeStatistics> => {
    const response = await api.get<{ success: boolean; data: EmployeeStatistics }>(
      '/employees/statistics'
    )
    return response.data.data
  },

  /**
   * Get working days
   */
  getWorkingDays: async (id: string): Promise<WorkingDaysResponse> => {
    const response = await api.get<{ success: boolean; data: WorkingDaysResponse }>(
      `/employees/${id}/working-days`
    )
    return response.data.data
  },

  /**
   * Get leave/WFH statistics
   */
  getLeaveStatistics: async (id: string): Promise<EmployeeLeaveStatistics> => {
    const response = await api.get<{ success: boolean; data: EmployeeLeaveStatistics }>(
      `/employees/${id}/statistics`
    )
    return response.data.data
  },

  /**
   * Get all unique positions
   */
  getPositions: async (): Promise<string[]> => {
    const response = await api.get<{ success: boolean; data: string[] }>(
      '/employees/positions'
    )
    return response.data.data
  },

  /**
   * Get employees hired or resigned in a specific month
   */
  getEmployeesByMonth: async (month: string): Promise<{
    month: string
    hired: Array<{
      id: string
      employee_id: string
      full_name: string
      nick_name?: string | null
      position: string
      hire_date: string
    }>
    resigned: Array<{
      id: string
      employee_id: string
      full_name: string
      nick_name?: string | null
      position: string
      hire_date: string
      resignation_date: string
    }>
  }> => {
    const response = await api.get<{
      success: boolean
      data: {
        month: string
        hired: Array<{
          id: string
          employee_id: string
          full_name: string
          nick_name?: string | null
          position: string
          hire_date: string
        }>
        resigned: Array<{
          id: string
          employee_id: string
          full_name: string
          nick_name?: string | null
          position: string
          hire_date: string
          resignation_date: string
        }>
      }
    }>(`/employees/statistics/by-month/${month}`)
    return response.data.data
  },
}
