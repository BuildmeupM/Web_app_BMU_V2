import api from './api'

/**
 * Client Interface
 * ตรงกับ database schema
 */
export interface Client {
  id: string
  build: string
  business_type: string
  company_name: string
  legal_entity_number: string
  establishment_date?: string | null
  business_category?: string | null
  business_subcategory?: string | null
  company_size?: string | null
  tax_registration_status?: string | null
  vat_registration_date?: string | null
  full_address?: string | null
  village?: string | null
  building?: string | null
  room_number?: string | null
  floor_number?: string | null
  address_number?: string | null
  soi?: string | null
  moo?: string | null
  road?: string | null
  subdistrict?: string | null
  district?: string | null
  province?: string | null
  postal_code?: string | null
  company_status: string
  created_at: string
  updated_at: string
}

/**
 * Client List Response
 */
export interface ClientListResponse {
  success: boolean
  data: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Client Detail Response
 */
export interface ClientDetailResponse {
  success: boolean
  data: Client
}

/**
 * Client Service
 */
const clientsService = {
  /**
   * Get client list
   */
  async getList(params?: {
    page?: number
    limit?: number
    search?: string
    company_status?: string
    tax_registration_status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ClientListResponse> {
    const response = await api.get<ClientListResponse>('/clients', { params })
    return response.data
  },

  /**
   * Get client by build code
   */
  async getByBuild(build: string): Promise<Client> {
    const response = await api.get<ClientDetailResponse>(`/clients/${build}`)
    return response.data.data
  },

  /**
   * Create new client
   */
  async create(data: Partial<Client>): Promise<Client> {
    const response = await api.post<ClientDetailResponse>('/clients', data)
    return response.data.data
  },

  /**
   * Update client
   */
  async update(build: string, data: Partial<Client>): Promise<Client> {
    const response = await api.put<ClientDetailResponse>(`/clients/${build}`, data)
    return response.data.data
  },

  /**
   * Delete client (soft delete)
   */
  async delete(build: string): Promise<void> {
    await api.delete(`/clients/${build}`)
  },

  /**
   * Get client statistics
   */
  async getStatistics(): Promise<{
    total: number
    byCompanyStatus: Array<{ company_status: string; count: number }>
    byTaxRegistrationStatus: Array<{ tax_registration_status: string; count: number }>
  }> {
    const response = await api.get<{
      success: boolean
      data: {
        total: number
        byCompanyStatus: Array<{ company_status: string; count: number }>
        byTaxRegistrationStatus: Array<{ tax_registration_status: string; count: number }>
      }
    }>('/clients/statistics')
    return response.data.data
  },
}

export default clientsService
