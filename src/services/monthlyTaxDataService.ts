import api from './api'

/**
 * Monthly Tax Data Interface
 * ตรงกับ database schema
 */
export interface MonthlyTaxData {
  id: string
  build: string
  company_name?: string
  tax_year: number
  tax_month: number
  accounting_responsible?: string | null
  accounting_responsible_name?: string | null
  accounting_responsible_first_name?: string | null
  accounting_responsible_nick_name?: string | null
  tax_inspection_responsible?: string | null
  tax_inspection_responsible_name?: string | null
  tax_inspection_responsible_first_name?: string | null
  tax_inspection_responsible_nick_name?: string | null
  document_received_date?: string | null
  bank_statement_status?: string | null
  // PND Information
  pnd_sent_for_review_date?: string | null
  pnd_review_returned_date?: string | null
  pnd_sent_to_customer_date?: string | null
  pnd_status?: string | null
  // Tax Form Statuses
  pnd_1_40_1_status?: string | null
  pnd_1_40_2_status?: string | null
  pnd_3_status?: string | null
  pnd_53_status?: string | null
  pp_36_status?: string | null
  student_loan_form_status?: string | null
  pnd_2_status?: string | null
  pnd_54_status?: string | null
  pt_40_status?: string | null
  social_security_form_status?: string | null
  // Tax Form Attachment Counts
  pnd_1_40_1_attachment_count?: number | null
  pnd_1_40_2_attachment_count?: number | null
  pnd_3_attachment_count?: number | null
  pnd_53_attachment_count?: number | null
  pp_36_attachment_count?: number | null
  student_loan_form_attachment_count?: number | null
  pnd_2_attachment_count?: number | null
  pnd_54_attachment_count?: number | null
  pt_40_attachment_count?: number | null
  social_security_form_attachment_count?: number | null
  // Accounting Status
  accounting_record_status?: string | null
  monthly_tax_impact?: string | null
  bank_impact?: string | null
  // WHT Information
  wht_draft_completed_date?: string | null
  wht_filer_employee_id?: string | null
  wht_filer_employee_name?: string | null
  wht_filer_employee_first_name?: string | null
  wht_filer_employee_nick_name?: string | null
  wht_filer_current_employee_id?: string | null
  wht_filer_current_employee_name?: string | null
  wht_filer_current_employee_first_name?: string | null
  wht_filer_current_employee_nick_name?: string | null
  wht_inquiry?: string | null
  wht_response?: string | null
  wht_submission_comment?: string | null
  wht_filing_response?: string | null
  // VAT Information
  pp30_sent_for_review_date?: string | null
  pp30_review_returned_date?: string | null
  pp30_sent_to_customer_date?: string | null
  pp30_status?: string | null // ⚠️ ไม่มี field ในฐานข้อมูล แต่ใช้ส่งไปยัง backend เพื่อตรวจสอบสถานะและอัพเดท timestamp
  pp30_form?: string | null // ⚠️ หลัง migration 028: เปลี่ยนจาก boolean เป็น VARCHAR(100) เพื่อเก็บสถานะ pp30_status โดยตรง
  sourcePage?: 'taxFiling' | 'taxInspection' | 'taxStatus' | null // ⚠️ ไม่มี field ในฐานข้อมูล แต่ใช้ส่งไปยัง backend เพื่อตั้ง timestamp ตามหน้า
  purchase_document_count?: number | null
  income_confirmed?: string | null // Enum: 'customer_confirmed', 'no_confirmation_needed', 'waiting_customer', 'customer_request_change'
  expenses_confirmed?: string | null // Enum: 'confirm_income', 'customer_request_additional_docs'
  pp30_payment_status?: string | null // Enum: 'has_payment', 'no_payment'
  pp30_payment_amount?: number | null // จำนวนยอดชำระ ภ.พ.30
  vat_draft_completed_date?: string | null
  vat_filer_employee_id?: string | null
  vat_filer_employee_name?: string | null
  vat_filer_employee_first_name?: string | null
  vat_filer_employee_nick_name?: string | null
  vat_filer_current_employee_id?: string | null
  vat_filer_current_employee_name?: string | null
  vat_filer_current_employee_first_name?: string | null
  vat_filer_current_employee_nick_name?: string | null
  pp30_inquiry?: string | null
  pp30_response?: string | null
  pp30_submission_comment?: string | null
  pp30_filing_response?: string | null
  document_entry_responsible?: string | null
  document_entry_responsible_name?: string | null
  document_entry_responsible_first_name?: string | null
  document_entry_responsible_nick_name?: string | null
  tax_registration_status?: string | null
  created_at: string
  updated_at: string
}

/**
 * Monthly Tax Data List Response
 */
export interface MonthlyTaxDataListResponse {
  success: boolean
  data: MonthlyTaxData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Monthly Tax Data Detail Response
 */
export interface MonthlyTaxDataDetailResponse {
  success: boolean
  data: MonthlyTaxData
}

/**
 * Monthly Tax Data Summary Response
 */
export interface MonthlyTaxDataSummaryResponse {
  success: boolean
  data: {
    wht: {
      total: number
      responsible_count?: number // สำหรับ Tax Status page
      completed: number
      pending: number
      recheck: number
      // สำหรับหน้ายื่นภาษี
      draft_ready?: number // รอร่างแบบภาษี (WHT)
      passed?: number // สถานะผ่าน (WHT)
      sent_to_customer?: number // ส่งให้ลูกค้าแล้ว (WHT)
    }
    vat: {
      total: number
      responsible_count?: number // สำหรับ Tax Status page
      completed: number
      pending: number
      recheck: number
      // สำหรับหน้ายื่นภาษี
      draft_ready?: number // รอร่างแบบภาษี (VAT)
      passed?: number // สถานะผ่าน (VAT)
      sent_to_customer?: number // ส่งให้ลูกค้าแล้ว (VAT)
    }
    impacts?: {
      monthly_tax_impact_count: number
      bank_impact_count: number
      total: number
    }
  }
}

/**
 * Monthly Tax Data Service
 */
const monthlyTaxDataService = {
  /**
   * Get monthly tax data list
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
    // Filter by employee responsible fields
    tax_inspection_responsible?: string
    accounting_responsible?: string
    wht_filer_employee_id?: string
    vat_filer_employee_id?: string
    document_entry_responsible?: string
    // Filter by tax registration status
    tax_registration_status?: string
    // Filter by tax status fields
    pnd_status?: string
    pp30_status?: string
    pp30_payment_status?: string
  }): Promise<MonthlyTaxDataListResponse> {
    const response = await api.get<MonthlyTaxDataListResponse>('/monthly-tax-data', { params })
    return response.data
  },

  /**
   * Get monthly tax data summary
   */
  async getSummary(params?: {
    year?: string
    month?: string
    accounting_responsible?: string
    tax_inspection_responsible?: string
    wht_filer_employee_id?: string
    vat_filer_employee_id?: string
  }): Promise<MonthlyTaxDataSummaryResponse> {
    const response = await api.get<MonthlyTaxDataSummaryResponse>('/monthly-tax-data/summary', {
      params,
    })
    return response.data
  },

  /**
   * Get monthly tax data by build, year, month
   */
  async getByBuildYearMonth(
    build: string,
    year: number,
    month: number
  ): Promise<MonthlyTaxData> {
    const response = await api.get<MonthlyTaxDataDetailResponse>(
      `/monthly-tax-data/${build}/${year}/${month}`
    )
    return response.data.data
  },

  /**
   * Get monthly tax data by ID
   */
  async getById(id: string): Promise<MonthlyTaxData> {
    const response = await api.get<MonthlyTaxDataDetailResponse>(`/monthly-tax-data/${id}`)
    return response.data.data
  },

  /**
   * Create new monthly tax data
   */
  async create(data: Partial<MonthlyTaxData>): Promise<MonthlyTaxData> {
    const response = await api.post<MonthlyTaxDataDetailResponse>('/monthly-tax-data', data)
    return response.data.data
  },

  /**
   * Update monthly tax data
   */
  async update(id: string, data: Partial<MonthlyTaxData>): Promise<MonthlyTaxData> {
    const response = await api.put<MonthlyTaxDataDetailResponse>(`/monthly-tax-data/${id}`, data)
    return response.data.data
  },
}

export default monthlyTaxDataService
