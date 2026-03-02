import api from './api'

/** Note category types */
export type FeeNoteCategory =
  | 'customer_cancel'
  | 'fee_adjustment'
  | 'address_change'
  | 'name_change'
  | 'customer_return'

/** Thai labels for each category */
export const CATEGORY_LABELS: Record<FeeNoteCategory, string> = {
  customer_cancel: 'ลูกค้ายกเลิก',
  fee_adjustment: 'ลูกค้าปรับค่าทำบัญชี',
  address_change: 'ลูกค้าเปลี่ยนที่อยู่',
  name_change: 'ลูกค้าเปลี่ยนชื่อ',
  customer_return: 'ลูกค้ากลับมาทำ',
}

/** Category color mapping for UI */
export const CATEGORY_COLORS: Record<FeeNoteCategory, string> = {
  customer_cancel: 'red',
  fee_adjustment: 'orange',
  address_change: 'blue',
  name_change: 'teal',
  customer_return: 'green',
}

/** Category icon mapping */
export const CATEGORY_ICONS: Record<FeeNoteCategory, string> = {
  customer_cancel: 'TbUserOff',
  fee_adjustment: 'TbCurrencyBaht',
  address_change: 'TbMapPin',
  name_change: 'TbUserEdit',
  customer_return: 'TbUserCheck',
}

export interface AccountingFeeNote {
  id: string
  category: FeeNoteCategory
  customer_name: string
  note: string
  created_by: string
  created_at: string
  updated_at: string
  created_by_username?: string
  created_by_name?: string
  created_by_nick_name?: string
}

export interface CategorySummary {
  category: FeeNoteCategory
  label: string
  count: number
}

export interface FeeNotesSummaryResponse {
  success: boolean
  data: {
    categories: CategorySummary[]
    total: number
  }
}

export interface FeeNotesListResponse {
  success: boolean
  data: AccountingFeeNote[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FeeNoteResponse {
  success: boolean
  message: string
  data: AccountingFeeNote
}

export interface CreateFeeNoteRequest {
  category: FeeNoteCategory
  customer_name: string
  note: string
}

export interface UpdateFeeNoteRequest {
  category?: FeeNoteCategory
  customer_name?: string
  note?: string
}

const accountingFeeNotesService = {
  async list(params?: {
    page?: number
    limit?: number
    category?: FeeNoteCategory
    year?: number
    month?: number
    search?: string
  }): Promise<FeeNotesListResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.category) query.append('category', params.category)
    if (params?.year) query.append('year', params.year.toString())
    if (params?.month) query.append('month', params.month.toString())
    if (params?.search) query.append('search', params.search)
    const response = await api.get<FeeNotesListResponse>(`/accounting-fee-notes?${query.toString()}`)
    return response.data
  },

  async summary(params?: { year?: number; month?: number }): Promise<FeeNotesSummaryResponse> {
    const query = new URLSearchParams()
    if (params?.year) query.append('year', params.year.toString())
    if (params?.month) query.append('month', params.month.toString())
    const response = await api.get<FeeNotesSummaryResponse>(`/accounting-fee-notes/summary?${query.toString()}`)
    return response.data
  },

  async create(data: CreateFeeNoteRequest): Promise<FeeNoteResponse> {
    const response = await api.post<FeeNoteResponse>('/accounting-fee-notes', data)
    return response.data
  },

  async update(id: string, data: UpdateFeeNoteRequest): Promise<FeeNoteResponse> {
    const response = await api.put<FeeNoteResponse>(`/accounting-fee-notes/${id}`, data)
    return response.data
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/accounting-fee-notes/${id}`)
    return response.data
  },
}

export default accountingFeeNotesService
