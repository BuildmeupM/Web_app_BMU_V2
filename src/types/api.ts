/**
 * Shared API Types
 * Common response shapes used across all services
 */

/** Standard paginated response from API */
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Standard single-item API response */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

/** Standard list params for API calls */
export interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

/** Sort direction */
export type SortOrder = 'asc' | 'desc'

/** Generic select option for dropdowns */
export interface SelectOption {
  value: string
  label: string
}

/** Grouped select option (with group label) */
export interface GroupedSelectOption {
  group: string
  items: SelectOption[]
}
