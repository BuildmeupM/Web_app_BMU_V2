import api from './api'

/**
 * Work Assignment Interface
 * ตรงกับ database schema
 */
export interface WorkAssignment {
  id: string
  build: string
  company_name?: string
  tax_registration_status?: string | null
  assignment_year: number
  assignment_month: number
  accounting_responsible?: string | null
  accounting_responsible_name?: string | null
  tax_inspection_responsible?: string | null
  tax_inspection_responsible_name?: string | null
  wht_filer_responsible?: string | null
  wht_filer_responsible_name?: string | null
  vat_filer_responsible?: string | null
  vat_filer_responsible_name?: string | null
  document_entry_responsible?: string | null
  document_entry_responsible_name?: string | null
  assigned_by: string
  assigned_by_name?: string | null
  assigned_at: string
  assignment_note?: string | null
  is_active: boolean
  is_reset_completed: boolean
  reset_completed_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Work Assignment List Response
 */
export interface WorkAssignmentListResponse {
  success: boolean
  data: WorkAssignment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Work Assignment Detail Response
 */
export interface WorkAssignmentDetailResponse {
  success: boolean
  data: WorkAssignment
}

/**
 * Work Assignment Service
 */
const workAssignmentsService = {
  /**
   * Get work assignment list
   */
  async getList(params?: {
    page?: number
    limit?: number
    build?: string
    year?: string
    month?: string
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<WorkAssignmentListResponse> {
    const response = await api.get<WorkAssignmentListResponse>('/work-assignments', { params })
    return response.data
  },

  /**
   * Get work assignment by build, year, month
   * Returns null if not found (404) instead of throwing error
   */
  async getByBuildYearMonth(build: string, year: number, month: number): Promise<WorkAssignment | null> {
    try {
      const response = await api.get<WorkAssignmentDetailResponse>(
        `/work-assignments/${build}/${year}/${month}`
      )
      return response.data.data
    } catch (error: any) {
      // If 404, return null (assignment doesn't exist - this is normal)
      if (error?.response?.status === 404) {
        return null
      }
      // For other errors, rethrow
      throw error
    }
  },

  /**
   * Get work assignment by ID
   */
  async getById(id: string): Promise<WorkAssignment> {
    const response = await api.get<WorkAssignmentDetailResponse>(`/work-assignments/${id}`)
    return response.data.data
  },

  /**
   * Create new work assignment
   */
  async create(data: {
    build: string
    assignment_year: number
    assignment_month: number
    accounting_responsible?: string | null
    tax_inspection_responsible?: string | null
    wht_filer_responsible?: string | null
    vat_filer_responsible?: string | null
    document_entry_responsible?: string | null
    assignment_note?: string | null
  }): Promise<WorkAssignment> {
    const response = await api.post<WorkAssignmentDetailResponse>('/work-assignments', data)
    return response.data.data
  },

  /**
   * Update work assignment
   */
  async update(id: string, data: Partial<WorkAssignment>): Promise<WorkAssignment> {
    const response = await api.put<WorkAssignmentDetailResponse>(`/work-assignments/${id}`, data)
    return response.data.data
  },

  /**
   * Reset monthly data for work assignment
   */
  async resetData(id: string): Promise<void> {
    await api.post(`/work-assignments/${id}/reset-data`)
  },

  /**
   * Get multiple work assignments by build codes, year, month (Bulk Query)
   * Returns array of work assignments (may be empty if no assignments found)
   * This is much faster than calling getByBuildYearMonth multiple times
   */
  async getBulkByBuilds(
    builds: string[],
    year: number,
    month: number
  ): Promise<WorkAssignment[]> {
    const response = await api.post<{ success: boolean; data: WorkAssignment[] }>(
      '/work-assignments/bulk-by-builds',
      {
        builds,
        year,
        month,
      }
    )
    return response.data.data || []
  },

  /**
   * Check for duplicate work assignments
   * Returns array of existing assignments for the given builds, year, and month
   */
  async checkDuplicates(
    builds: string[],
    year: number,
    month: number
  ): Promise<WorkAssignment[]> {
    const response = await api.post<{ success: boolean; data: WorkAssignment[] }>(
      '/work-assignments/check-duplicates',
      {
        builds,
        year,
        month,
      }
    )
    return response.data.data || []
  },

  /**
   * เปลี่ยนผู้รับผิดชอบงาน
   */
  async changeResponsible(
    id: string,
    data: ResponsibilityChangeRequest
  ): Promise<ResponsibilityChangeResponse> {
    const response = await api.post<{ success: boolean; message: string; data: ResponsibilityChangeResponse }>(
      `/work-assignments/${id}/change-responsible`,
      data
    )
    return response.data.data
  },

  /**
   * ดึงประวัติการเปลี่ยนผู้รับผิดชอบ
   */
  async getChangeHistory(id: string): Promise<ResponsibilityChangeHistory[]> {
    const response = await api.get<{ success: boolean; data: ResponsibilityChangeHistory[] }>(
      `/work-assignments/${id}/change-history`
    )
    return response.data.data || []
  },

  /**
   * ลบการจัดงาน (soft delete)
   */
  async deleteAssignment(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/work-assignments/${id}`
    )
    return response.data
  },
}

/**
 * ประเภทตำแหน่งที่สามารถเปลี่ยนได้
 */
export type RoleType = 'accounting' | 'tax_inspection' | 'wht_filer' | 'vat_filer' | 'document_entry'

/**
 * Request สำหรับเปลี่ยนผู้รับผิดชอบ
 */
export interface ResponsibilityChangeRequest {
  role_type: RoleType
  new_employee_id: string
  change_reason?: string
}

/**
 * Response สำหรับเปลี่ยนผู้รับผิดชอบ
 */
export interface ResponsibilityChangeResponse {
  history_id: string
  build: string
  company_name: string
  role_type: RoleType
  role_label: string
  previous_employee_id: string | null
  previous_employee_name: string
  new_employee_id: string
  new_employee_name: string
  change_reason: string | null
}

/**
 * ประวัติการเปลี่ยนผู้รับผิดชอบ
 */
export interface ResponsibilityChangeHistory {
  id: string
  role_type: RoleType
  previous_employee_id: string | null
  previous_employee_name: string | null
  new_employee_id: string
  new_employee_name: string
  changed_by: string
  changed_by_name: string
  change_reason: string | null
  changed_at: string
}

export default workAssignmentsService

