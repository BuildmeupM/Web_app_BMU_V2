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
  // Fields from list API JOIN with accounting_fees
  peak_code?: string | null
  accounting_start_date?: string | null
  // Related data from 4 tables (only available from getByBuild)
  dbd_info?: DbdInfo | null
  boi_info?: BoiInfo | null
  agency_credentials?: AgencyCredentials | null
  accounting_fees?: AccountingFees | null
}

/**
 * DBD Info Interface
 * ข้อมูลกรมพัฒนาธุรกิจการค้า
 */
export interface DbdInfo {
  accounting_period?: string | null
  registered_capital?: number | null
  paid_capital?: number | null
  business_code?: string | null
  business_objective_at_registration?: string | null
  latest_business_code?: string | null
  latest_business_objective?: string | null
}

/**
 * BOI Info Interface
 * ข้อมูลสิทธิ์ BOI
 */
export interface BoiInfo {
  boi_approval_date?: string | null
  boi_first_use_date?: string | null
  boi_expiry_date?: string | null
}

/**
 * Agency Credentials Interface
 * รหัสผู้ใช้หน่วยงานราชการ
 */
export interface AgencyCredentials {
  efiling_username?: string | null
  efiling_password?: string | null
  sso_username?: string | null
  sso_password?: string | null
  dbd_username?: string | null
  dbd_password?: string | null
  student_loan_username?: string | null
  student_loan_password?: string | null
  enforcement_username?: string | null
  enforcement_password?: string | null
}

/**
 * Accounting Fees Interface
 * ค่าทำบัญชี/HR รายเดือน
 */
export interface AccountingFees {
  peak_code?: string | null
  accounting_start_date?: string | null
  accounting_end_date?: string | null
  accounting_end_reason?: string | null
  fee_year?: number | null
  accounting_fee_jan?: number | null
  accounting_fee_feb?: number | null
  accounting_fee_mar?: number | null
  accounting_fee_apr?: number | null
  accounting_fee_may?: number | null
  accounting_fee_jun?: number | null
  accounting_fee_jul?: number | null
  accounting_fee_aug?: number | null
  accounting_fee_sep?: number | null
  accounting_fee_oct?: number | null
  accounting_fee_nov?: number | null
  accounting_fee_dec?: number | null
  hr_fee_jan?: number | null
  hr_fee_feb?: number | null
  hr_fee_mar?: number | null
  hr_fee_apr?: number | null
  hr_fee_may?: number | null
  hr_fee_jun?: number | null
  hr_fee_jul?: number | null
  hr_fee_aug?: number | null
  hr_fee_sep?: number | null
  hr_fee_oct?: number | null
  hr_fee_nov?: number | null
  hr_fee_dec?: number | null
  line_chat_type?: string | null
  line_chat_id?: string | null
  line_billing_chat_type?: string | null
  line_billing_id?: string | null
  accounting_fee_image_url?: string | null
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
   * Get client list for dropdown (lightweight — only build + company_name)
   * Supports search and limit for on-type search
   */
  async getDropdownList(params?: {
    company_status?: string
    search?: string
    limit?: number
  }): Promise<{ build: string; company_name: string }[]> {
    const response = await api.get<{ success: boolean; data: { build: string; company_name: string }[] }>(
      '/clients/dropdown',
      { params }
    )
    return response.data.data
  },

  /**
   * Get client by build code (includes related data from 4 tables)
   */
  async getByBuild(build: string): Promise<Client> {
    const response = await api.get<ClientDetailResponse>(`/clients/${build}`)
    return response.data.data
  },

  /**
   * Create new client (includes related data)
   */
  async create(data: Partial<Client>): Promise<Client> {
    const response = await api.post<ClientDetailResponse>('/clients', data)
    return response.data.data
  },

  /**
   * Update client (includes related data)
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
    incompleteData: {
      basicInfo: { count: number; clients: Array<{ build: string; company_name: string }> }
      taxInfo: { count: number; clients: Array<{ build: string; company_name: string }> }
      address: { count: number; clients: Array<{ build: string; company_name: string }> }
    }
  }> {
    const response = await api.get<{
      success: boolean
      data: {
        total: number
        byCompanyStatus: Array<{ company_status: string; count: number }>
        byTaxRegistrationStatus: Array<{ tax_registration_status: string; count: number }>
        incompleteData: {
          basicInfo: { count: number; clients: Array<{ build: string; company_name: string }> }
          taxInfo: { count: number; clients: Array<{ build: string; company_name: string }> }
          address: { count: number; clients: Array<{ build: string; company_name: string }> }
        }
      }
    }>('/clients/statistics')
    return response.data.data
  },

  /**
   * Update accounting fees only (dedicated endpoint)
   * ใช้สำหรับหน้า AccountingFeesManagement
   */
  async updateAccountingFees(build: string, data: AccountingFees): Promise<void> {
    await api.patch(`/clients/${build}/accounting-fees`, data)
  },

  /**
   * Export accounting fees summary as Excel
   * ส่งออกข้อมูลสรุปยอดค่าทำบัญชี / ค่าบริการ HR เป็น Excel
   */
  async exportAccountingFeesExcel(params: {
    month: string
    fee_year?: number
    exempt_builds?: string
  }): Promise<void> {
    const response = await api.get('/clients/accounting-fees-export', {
      params,
      responseType: 'blob',
    })

    // Create download link
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let filename = `สรุปค่าบริการ.xlsx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?(.+)/i)
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
      }
    }

    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

export default clientsService
