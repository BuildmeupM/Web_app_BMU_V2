/**
 * Document Entry Work Service
 * Service สำหรับจัดการงานคีย์เอกสาร (Document Sorting Page)
 */

import api from './api'

/**
 * Document Entry Work Bot Interface
 */
export interface DocumentEntryWorkBot {
  id?: string
  bot_type: 'Shopee (Thailand)' | 'SPX Express (Thailand)' | 'Lazada Limited (Head Office)' | 'Lazada Express Limited' | 'ระบบ OCR'
  document_count: number
  ocr_additional_info?: string | null
}

/**
 * Document Entry Work Interface
 */
export interface DocumentEntryWork {
  id: string
  build: string
  company_name?: string
  work_year: number
  work_month: number
  entry_timestamp: string
  submission_count: number
  responsible_employee_id: string
  current_responsible_employee_id?: string | null
  wht_document_count: number
  wht_entry_status?: 'ยังไม่ดำเนินการ' | 'กำลังดำเนินการ' | 'ดำเนินการเสร็จแล้ว' | null
  wht_entry_start_datetime?: string | null
  wht_entry_completed_datetime?: string | null
  wht_status_updated_by?: string | null
  vat_document_count: number
  vat_entry_status?: 'ยังไม่ดำเนินการ' | 'กำลังดำเนินการ' | 'ดำเนินการเสร็จแล้ว' | null
  vat_entry_start_datetime?: string | null
  vat_entry_completed_datetime?: string | null
  vat_status_updated_by?: string | null
  non_vat_document_count: number
  non_vat_entry_status?: 'ยังไม่ดำเนินการ' | 'กำลังดำเนินการ' | 'ดำเนินการเสร็จแล้ว' | null
  non_vat_entry_start_datetime?: string | null
  non_vat_entry_completed_datetime?: string | null
  non_vat_status_updated_by?: string | null
  submission_comment?: string | null
  return_comment?: string | null
  bots?: DocumentEntryWorkBot[]
  bot_count?: number // จำนวนบอทสำหรับ entry นี้
  created_at?: string
  updated_at?: string
}

/**
 * Document Entry Work List Response
 */
export interface DocumentEntryWorkListResponse {
  success: boolean
  data: DocumentEntryWork[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Document Entry Work Detail Response
 */
export interface DocumentEntryWorkDetailResponse {
  success: boolean
  data: DocumentEntryWork | null
  bots: DocumentEntryWorkBot[]
  submission_count?: number
  tax_registration_status?: string | null // สถานะจดทะเบียนภาษี: 'จดภาษีมูลค่าเพิ่ม' | 'ยังไม่จดภาษีมูลค่าเพิ่ม' | null
  document_entry_responsible?: string | null // พนักงานที่รับผิดชอบในการคีย์จาก monthly_tax_data
}

/**
 * Create Document Entry Work Request
 */
export interface CreateDocumentEntryWorkRequest {
  build: string
  work_year: number
  work_month: number
  responsible_employee_id: string
  wht_document_count?: number
  vat_document_count?: number
  non_vat_document_count?: number
  submission_comment?: string | null
  return_comment?: string | null
  bots?: DocumentEntryWorkBot[]
}

/**
 * Update Document Entry Work Request
 */
export interface UpdateDocumentEntryWorkRequest {
  wht_document_count?: number
  vat_document_count?: number
  non_vat_document_count?: number
  submission_comment?: string | null
  return_comment?: string | null
  bots?: DocumentEntryWorkBot[]
}

/**
 * Update Status Request
 */
export interface UpdateStatusRequest {
  document_type: 'wht' | 'vat' | 'non_vat'
  status: 'ยังไม่ดำเนินการ' | 'กำลังดำเนินการ' | 'ดำเนินการเสร็จแล้ว'
}

/**
 * Document Entry Work Summary Response
 */
export interface DocumentEntryWorkSummaryItem {
  build: string
  company_name: string
  wht_document_count: number
  wht_entry_status: string | null
  vat_document_count: number
  vat_entry_status: string | null
  non_vat_document_count: number
  non_vat_entry_status: string | null
  total_documents: number
  completed_documents: number
  pending_documents: number
}

export interface DocumentEntryWorkSummaryGroup {
  date?: string | null
  month?: number | null
  items: DocumentEntryWorkSummaryItem[]
  total_documents: number
  completed_documents: number
  pending_documents: number
}

export interface DocumentEntryWorkSummaryResponse {
  success: boolean
  data: DocumentEntryWorkSummaryGroup[]
  overall: {
    total_documents: number
    completed_documents: number
    pending_documents: number
  }
  group_by: 'day' | 'month'
}

/**
 * Get list of document entry work (paginated, filter)
 */
export async function getList(params: {
  page?: number
  limit?: number
  build?: string
  year?: number
  month?: number
  accounting_responsible?: string
  document_entry_responsible?: string
}): Promise<DocumentEntryWorkListResponse> {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.build) queryParams.append('build', params.build)
  if (params.year) queryParams.append('year', params.year.toString())
  if (params.month) queryParams.append('month', params.month.toString())
  if (params.accounting_responsible) queryParams.append('accounting_responsible', params.accounting_responsible)
  if (params.document_entry_responsible) queryParams.append('document_entry_responsible', params.document_entry_responsible)

  const response = await api.get<DocumentEntryWorkListResponse>(`/document-entry-work?${queryParams.toString()}`)
  return response.data
}

/**
 * Get document entry work by build, year, month
 */
export async function getByBuildYearMonth(
  build: string,
  year: number,
  month: number
): Promise<DocumentEntryWorkDetailResponse> {
  const response = await api.get<DocumentEntryWorkDetailResponse>(`/document-entry-work/${build}/${year}/${month}`)
  return response.data
}

/**
 * Get document entry work by ID
 */
export async function getById(id: string): Promise<DocumentEntryWorkDetailResponse> {
  const response = await api.get<DocumentEntryWorkDetailResponse>(`/document-entry-work/${id}`)
  return response.data
}

/**
 * Get document entry work history by build, year, month
 */
export async function getHistoryByBuildYearMonth(
  build: string,
  year: number,
  month: number
): Promise<{ success: boolean; data: DocumentEntryWork[] }> {
  const response = await api.get<{ success: boolean; data: DocumentEntryWork[] }>(`/document-entry-work/history/${build}/${year}/${month}`)
  return response.data
}

/**
 * Create new document entry work
 */
export async function create(data: CreateDocumentEntryWorkRequest): Promise<DocumentEntryWorkDetailResponse> {
  const response = await api.post<DocumentEntryWorkDetailResponse>('/document-entry-work', data)
  return response.data
}

/**
 * Update document entry work
 */
export async function update(
  id: string,
  data: UpdateDocumentEntryWorkRequest
): Promise<DocumentEntryWorkDetailResponse> {
  console.log('📡 documentEntryWorkService.update called:', { id, data })
  const response = await api.put<DocumentEntryWorkDetailResponse>(`/document-entry-work/${id}`, data)
  console.log('📥 documentEntryWorkService.update response:', response.data)
  return response.data
}

/**
 * Update document entry work status
 */
export async function updateStatus(
  id: string,
  data: UpdateStatusRequest
): Promise<DocumentEntryWorkDetailResponse> {
  const response = await api.patch<DocumentEntryWorkDetailResponse>(`/document-entry-work/${id}/status`, data)
  return response.data
}

/**
 * Get document entry work summary
 */
export async function getSummary(params: {
  year: number
  month: number
  document_entry_responsible: string
  group_by?: 'day' | 'month'
}): Promise<DocumentEntryWorkSummaryResponse> {
  const queryParams = new URLSearchParams()
  
  queryParams.append('year', params.year.toString())
  queryParams.append('month', params.month.toString())
  queryParams.append('document_entry_responsible', params.document_entry_responsible)
  if (params.group_by) queryParams.append('group_by', params.group_by)

  const response = await api.get<DocumentEntryWorkSummaryResponse>(`/document-entry-work/summary?${queryParams.toString()}`)
  return response.data
}

/**
 * Document Entry Work Service (Default Export)
 */
const documentEntryWorkService = {
  getList,
  getByBuildYearMonth,
  getById,
  getHistoryByBuildYearMonth,
  create,
  update,
  updateStatus,
  getSummary,
}

export default documentEntryWorkService
