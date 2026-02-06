import api from './api'

/**
 * Accounting Marketplace Listing Interface
 */
export interface AccountingMarketplaceListing {
  id: string
  build: string
  company_name?: string
  tax_year: number
  tax_month: number
  seller_employee_id: string
  seller_first_name?: string
  seller_nick_name?: string
  sold_to_employee_id?: string
  buyer_first_name?: string
  buyer_nick_name?: string
  price: number
  status: 'available' | 'sold' | 'cancelled'
  sold_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  transaction_type?: 'sell' | 'buy'
}

/**
 * Buyer Income Interface
 */
export interface BuyerIncome {
  tax_year: number
  tax_month: number
  sold_to_employee_id: string
  buyer_first_name?: string
  buyer_nick_name?: string
  job_count: number
  total_income: number
}

/**
 * List Response Interface
 */
export interface AccountingMarketplaceListResponse {
  success: boolean
  data: AccountingMarketplaceListing[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Buyer Income Response Interface
 */
export interface BuyerIncomeResponse {
  success: boolean
  data: BuyerIncome[]
}

/**
 * Single Listing Response Interface
 */
export interface AccountingMarketplaceResponse {
  success: boolean
  message?: string
  data: AccountingMarketplaceListing
}

/**
 * Create Listing Request Interface
 */
export interface CreateListingRequest {
  build: string
  tax_year: number
  tax_month: number
  price: number
}

/**
 * Eligible Build Interface
 */
export interface EligibleBuild {
  build: string
  company_name: string
  label: string
}

/**
 * Eligible Builds Response Interface
 */
export interface EligibleBuildsResponse {
  success: boolean
  data: EligibleBuild[]
}

/**
 * Accounting Marketplace Service
 */
const accountingMarketplaceService = {
  /**
   * Get eligible builds (Build ที่สามารถขายได้)
   */
  async getEligibleBuilds(): Promise<EligibleBuildsResponse> {
    const response = await api.get<EligibleBuildsResponse>(
      '/accounting-marketplace/eligible-builds'
    )
    return response.data
  },

  /**
   * Get available jobs (งานที่ขายได้)
   */
  async getAvailableJobs(params?: {
    page?: number
    limit?: number
    build?: string
    year?: number
    month?: number
    search?: string
  }): Promise<AccountingMarketplaceListResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.build) queryParams.append('build', params.build)
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get<AccountingMarketplaceListResponse>(
      `/accounting-marketplace?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Get my listings (งานที่ฉันขาย)
   */
  async getMyListings(params?: {
    page?: number
    limit?: number
    build?: string
    status?: string
    search?: string
  }): Promise<AccountingMarketplaceListResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.build) queryParams.append('build', params.build)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get<AccountingMarketplaceListResponse>(
      `/accounting-marketplace/my-listings?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Get purchased jobs (งานที่ฉันซื้อ)
   */
  async getPurchasedJobs(params?: {
    page?: number
    limit?: number
    build?: string
    year?: number
    month?: number
    search?: string
  }): Promise<AccountingMarketplaceListResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.build) queryParams.append('build', params.build)
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get<AccountingMarketplaceListResponse>(
      `/accounting-marketplace/purchased?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Get transaction history (ประวัติการซื้อขาย)
   */
  async getHistory(params?: {
    page?: number
    limit?: number
    build?: string
    year?: number
    month?: number
    type?: 'sell' | 'buy'
    search?: string
  }): Promise<AccountingMarketplaceListResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.build) queryParams.append('build', params.build)
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.type) queryParams.append('type', params.type)
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get<AccountingMarketplaceListResponse>(
      `/accounting-marketplace/history?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Get buyer income (รายได้รายเดือน)
   */
  async getBuyerIncome(params?: {
    year?: number
    month?: number
    employee_id?: string
  }): Promise<BuyerIncomeResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id)

    const response = await api.get<BuyerIncomeResponse>(
      `/accounting-marketplace/buyer-income?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Create listing (สร้างรายการขายงาน)
   */
  async createListing(data: CreateListingRequest): Promise<AccountingMarketplaceResponse> {
    const response = await api.post<AccountingMarketplaceResponse>(
      '/accounting-marketplace',
      data
    )
    return response.data
  },

  /**
   * Purchase listing (ซื้องาน)
   */
  async purchaseListing(id: string): Promise<AccountingMarketplaceResponse> {
    const response = await api.post<AccountingMarketplaceResponse>(
      `/accounting-marketplace/${id}/purchase`
    )
    return response.data
  },

  /**
   * Cancel listing (ยกเลิกรายการขาย)
   */
  async cancelListing(id: string): Promise<AccountingMarketplaceResponse> {
    const response = await api.post<AccountingMarketplaceResponse>(
      `/accounting-marketplace/${id}/cancel`
    )
    return response.data
  },
}

export default accountingMarketplaceService
