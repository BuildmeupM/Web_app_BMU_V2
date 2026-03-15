/**
 * Work Assignment Page — Refactored Orchestrator
 * หน้าจัดการการจัดงานรายเดือน (Workflow System)
 * Access: Admin/HR only
 * 
 * Original: ~5,579 lines → Refactored: ~900 lines
 * Sub-components in src/components/WorkAssignment/
 */

import { useState, useEffect } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import {
  Title, Stack, Button, Group, TextInput, Select, Card, Text, Badge,
  Modal, Alert, Box, Grid, NumberInput, SimpleGrid, Tooltip,
} from '@mantine/core'
import {
  TbPlus, TbSearch, TbRefresh, TbAlertCircle, TbCheck,
  TbUpload, TbEye, TbEyeOff,
} from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../store/authStore'
import workAssignmentsService, {
  WorkAssignment as WorkAssignmentType,
} from '../services/workAssignmentsService'
import clientsService, { Client } from '../services/clientsService'
import { getErrorMessage } from '../types/errors'

// Sub-components & shared modules
import {
  AssignmentTable, CreateEditFormModal, BulkCreateModal,
  SaveConfirmationModals, DeleteConfirmModal,
  ResponsibilityChangeModal, BulkResponsibilityChangeModal,
  WorkAssignmentImport,
  useWorkAssignmentQueries, useWorkAssignmentMutations,
  THAI_MONTHS, MONTH_OPTIONS, COMPANY_STATUS_OPTIONS,
  getCurrentTaxMonth,
  validatePreviewData,
  calculateEmployeeStatistics, groupStatisticsByRole,
  SAVED_ASSIGNMENT_ROLE_FIELDS, PREVIEW_ROLE_FIELDS,
} from '../components/WorkAssignment'
import type { PreviewDataItem, SelectOption } from '../components/WorkAssignment'

export default function WorkAssignment() {
  const { user, _hasHydrated } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'audit'

  // ── Filter State ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [build, setBuild] = useState('')
  const [year, setYear] = useState<string | null>(new Date().getFullYear().toString())
  const [month, setMonth] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [syncStatusFilter, setSyncStatusFilter] = useState<'all' | 'synced' | 'unsynced'>('all')
  const [viewMode, setViewMode] = useState<'current' | 'previous'>('current')

  // Filter-by-responsible
  const [filterByAccounting, setFilterByAccounting] = useState<string | null>(null)
  const [filterByTaxInspection, setFilterByTaxInspection] = useState<string | null>(null)
  const [filterByWht, setFilterByWht] = useState<string | null>(null)
  const [filterByVat, setFilterByVat] = useState<string | null>(null)
  const [filterByDocumentEntry, setFilterByDocumentEntry] = useState<string | null>(null)

  // ── Modal State ───────────────────────────────────────────────────
  const [formOpened, setFormOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignmentType | null>(null)
  const [resetConfirmOpened, setResetConfirmOpened] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<WorkAssignmentType | null>(null)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [deleteAssignment, setDeleteAssignment] = useState<WorkAssignmentType | null>(null)
  const [changeResponsibleOpened, setChangeResponsibleOpened] = useState(false)
  const [changeResponsibleAssignment, setChangeResponsibleAssignment] = useState<WorkAssignmentType | null>(null)
  const [importModalOpened, setImportModalOpened] = useState(false)
  const [bulkSyncConfirmOpened, setBulkSyncConfirmOpened] = useState(false)

  // ── Bulk Create State ─────────────────────────────────────────────
  const [bulkCreateModalOpened, setBulkCreateModalOpened] = useState(false)
  const [targetTaxYearModalOpened, setTargetTaxYearModalOpened] = useState(false)
  const [targetTaxYear, setTargetTaxYear] = useState<number | null>(null)
  const [targetTaxMonth, setTargetTaxMonth] = useState<number | null>(null)
  const [selectedCompanyStatuses, setSelectedCompanyStatuses] = useState<string[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [selectedPreviousTaxYear, setSelectedPreviousTaxYear] = useState<number | null>(null)
  const [selectedPreviousTaxMonth, setSelectedPreviousTaxMonth] = useState<number | null>(null)
  const [companyStatusFilter, setCompanyStatusFilter] = useState<string>('all')

  // ── Preview State ─────────────────────────────────────────────────
  const [previewData, setPreviewData] = useState<PreviewDataItem[]>([])
  const [previewPage, setPreviewPage] = useState(1)
  const [previewLimit] = useState(20)
  const [previewSearch, setPreviewSearch] = useState('')
  const [debouncedPreviewSearch] = useDebouncedValue(previewSearch, 300)
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loadedPreviewData, setLoadedPreviewData] = useState<PreviewDataItem[]>([])

  // ── Validation Modals State ───────────────────────────────────────
  const [taxMonthModalOpened, setTaxMonthModalOpened] = useState(false)
  const [incompleteDataModalOpened, setIncompleteDataModalOpened] = useState(false)
  const [duplicateDataModalOpened, setDuplicateDataModalOpened] = useState(false)
  const [selectedTaxYear, setSelectedTaxYear] = useState<number | null>(null)
  const [selectedTaxMonth, setSelectedTaxMonth] = useState<number | null>(null)
  const [incompleteItems, setIncompleteItems] = useState<Array<{ build: string; missingFields: string[] }>>([])
  const [duplicateItems, setDuplicateItems] = useState<WorkAssignmentType[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // ── Form State ────────────────────────────────────────────────────
  const [formBuild, setFormBuild] = useState('')
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1)
  const [formAccountingResponsible, setFormAccountingResponsible] = useState<string | null>(null)
  const [formTaxInspectionResponsible, setFormTaxInspectionResponsible] = useState<string | null>(null)
  const [formWhtFilerResponsible, setFormWhtFilerResponsible] = useState<string | null>(null)
  const [formVatFilerResponsible, setFormVatFilerResponsible] = useState<string | null>(null)
  const [formDocumentEntryResponsible, setFormDocumentEntryResponsible] = useState<string | null>(null)
  const [formNote, setFormNote] = useState('')

  // ── Column & View State ───────────────────────────────────────────
  const [showPreviousColumns, setShowPreviousColumns] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    build: true, company_name: true, legal_entity_number: false,
    tax_registration_status: true, company_status: true,
    target_tax_month: true, assignment_status: true,
    prev_accounting: false, new_accounting: true,
    prev_tax_inspection: false, new_tax_inspection: true,
    prev_wht: false, new_wht: true,
    prev_vat: false, new_vat: true,
    prev_document_entry: false, new_document_entry: true,
  })
  const [filterByAssignmentStatus, setFilterByAssignmentStatus] = useState<'all' | 'assigned' | 'unassigned'>('unassigned')

  // ── Bulk Change Responsible State ─────────────────────────────────
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set())
  const [bulkChangeOpened, setBulkChangeOpened] = useState(false)



  // ── Derived Helpers ───────────────────────────────────────────────
  const getCurrentMonth = () => getCurrentTaxMonth()
  const getPreviousMonth = () => {
    const now = new Date()
    const prevTaxMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { year: prevTaxMonth.getFullYear(), month: prevTaxMonth.getMonth() + 1 }
  }
  const getViewMonth = () => viewMode === 'current' ? getCurrentMonth() : getPreviousMonth()

  // ── Custom Hooks ──────────────────────────────────────────────────
  const queries = useWorkAssignmentQueries({
    isAdmin, hasHydrated: _hasHydrated, page, limit, build, year, month, search,
    syncStatusFilter, filterByAccounting, filterByTaxInspection,
    filterByWht, filterByVat, filterByDocumentEntry,
    getViewMonth, companyStatusFilter,
  })

  const mutations = useWorkAssignmentMutations({
    onCreateSuccess: () => { setFormOpened(false); resetForm() },
    onUpdateSuccess: () => { setFormOpened(false); resetForm() },
    onResetSuccess: () => { setResetConfirmOpened(false); setSelectedAssignment(null) },
    onDeleteSuccess: () => { setDeleteConfirmOpened(false); setDeleteAssignment(null) },
    onBulkSyncSuccess: () => { setBulkSyncConfirmOpened(false) },
  })

  // ── Form Handlers ─────────────────────────────────────────────────
  const resetForm = () => {
    setFormBuild(''); setFormYear(new Date().getFullYear())
    setFormMonth(new Date().getMonth() + 1)
    setFormAccountingResponsible(null); setFormTaxInspectionResponsible(null)
    setFormWhtFilerResponsible(null); setFormVatFilerResponsible(null)
    setFormDocumentEntryResponsible(null); setFormNote('')
  }

  const handleEdit = (assignment: WorkAssignmentType) => {
    setFormMode('edit'); setEditingAssignment(assignment)
    setFormBuild(assignment.build)
    setFormYear(assignment.assignment_year); setFormMonth(assignment.assignment_month)
    setFormAccountingResponsible(assignment.accounting_responsible || null)
    setFormTaxInspectionResponsible(assignment.tax_inspection_responsible || null)
    setFormWhtFilerResponsible(assignment.wht_filer_responsible || null)
    setFormVatFilerResponsible(assignment.vat_filer_responsible || null)
    setFormDocumentEntryResponsible(assignment.document_entry_responsible || null)
    setFormNote(assignment.assignment_note || '')
    setFormOpened(true)
  }

  const handleFormSubmit = async () => {
    if (!formBuild || !formYear || !formMonth) {
      notifications.show({ title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกข้อมูลให้ครบถ้วน', color: 'red', icon: <TbAlertCircle size={16} /> })
      return
    }
    const data = {
      build: formBuild, assignment_year: formYear, assignment_month: formMonth,
      accounting_responsible: formAccountingResponsible || null,
      tax_inspection_responsible: formTaxInspectionResponsible || null,
      wht_filer_responsible: formWhtFilerResponsible || null,
      vat_filer_responsible: formVatFilerResponsible || null,
      document_entry_responsible: formDocumentEntryResponsible || null,
      assignment_note: formNote || null,
    }
    try {
      if (formMode === 'create') await mutations.createMutation.mutateAsync(data)
      else if (editingAssignment) await mutations.updateMutation.mutateAsync({ id: editingAssignment.id, data })
    } catch (error) { console.error('Form submit error:', error) }
  }

  const handleAdd = () => {
    const ct = getCurrentTaxMonth()
    setTargetTaxYear(ct.year); setTargetTaxMonth(ct.month)
    setTargetTaxYearModalOpened(true)
  }

  const toggleAllPreviousColumns = () => {
    const newValue = !showPreviousColumns
    setShowPreviousColumns(newValue)
    setVisibleColumns((prev) => ({
      ...prev,
      prev_accounting: newValue, prev_tax_inspection: newValue,
      prev_wht: newValue, prev_vat: newValue, prev_document_entry: newValue,
    }))
  }

  // ── Bulk Create Logic ─────────────────────────────────────────────
  const handleBulkCreateConfirm = async () => {
    if (selectedCompanyStatuses.length === 0) {
      notifications.show({ title: 'กรุณาเลือกสถานะ', message: 'กรุณาเลือกสถานะบริษัทอย่างน้อย 1 รายการ', color: 'yellow', icon: <TbAlertCircle size={16} /> })
      return
    }
    setIsLoadingPreview(true)
    try {
      const allStatuses = COMPANY_STATUS_OPTIONS.filter((opt) => opt.value !== 'all').map((opt) => opt.value)
      const statusesToFetch = selectedCompanyStatuses.includes('all') ? allStatuses : selectedCompanyStatuses
      const clientPromises = statusesToFetch.map((status) => clientsService.getList({ limit: 99999, company_status: status }))
      const clientResults = await Promise.all(clientPromises)
      const clientMap = new Map<string, Client>()
      clientResults.forEach((result) => { result.data.forEach((client: Client) => { if (!clientMap.has(client.build)) clientMap.set(client.build, client) }) })
      const clients = Array.from(clientMap.values())
      setAllClients(clients)
      if (!targetTaxYear || !targetTaxMonth) {
        notifications.show({ title: 'ข้อมูลไม่ครบ', message: 'กรุณาเลือกเดือนภาษีที่จะบันทึกก่อน', color: 'red', icon: <TbAlertCircle size={16} /> })
        setIsLoadingPreview(false); return
      }
      const prevYear = selectedPreviousTaxYear || (() => { const d = new Date(targetTaxYear, targetTaxMonth - 2, 1); return d.getFullYear() })()
      const prevMonth = selectedPreviousTaxMonth || (() => { const d = new Date(targetTaxYear, targetTaxMonth - 2, 1); return d.getMonth() + 1 })()
      setLoadingProgress({ current: 0, total: clients.length })
      setLoadedPreviewData([])
      const buildCodes = clients.map((c) => c.build)
      setLoadingProgress({ current: 0, total: clients.length })
      const prevAssignments = await workAssignmentsService.getBulkByBuilds(buildCodes, prevYear, prevMonth)
      let existingAssignments: WorkAssignmentType[] = []
      try { existingAssignments = await workAssignmentsService.getBulkByBuilds(buildCodes, targetTaxYear, targetTaxMonth) } catch { /* continue */ }
      const prevMap = new Map<string, WorkAssignmentType>()
      prevAssignments.forEach((a) => prevMap.set(a.build, a))
      const existingMap = new Map<string, WorkAssignmentType>()
      existingAssignments.forEach((a) => existingMap.set(a.build, a))
      const allPreviewItems: PreviewDataItem[] = clients.map((client, i) => {
        setLoadingProgress({ current: i + 1, total: clients.length })
        const prev = prevMap.get(client.build)
        const existing = existingMap.get(client.build)
        const isAssigned = !!existing
        const existingData = loadedPreviewData.find((item) => item.build === client.build)
        return {
          build: client.build, company_name: client.company_name,
          legal_entity_number: client.legal_entity_number || '-',
          tax_registration_status: client.tax_registration_status || null,
          company_status: client.company_status,
          target_tax_year: targetTaxYear, target_tax_month: targetTaxMonth,
          is_assigned: isAssigned, existing_assignment_id: existing?.id || null,
          prev_accounting_responsible: prev?.accounting_responsible || null,
          prev_accounting_responsible_name: prev?.accounting_responsible_name || null,
          prev_tax_inspection_responsible: prev?.tax_inspection_responsible || null,
          prev_tax_inspection_responsible_name: prev?.tax_inspection_responsible_name || null,
          prev_wht_filer_responsible: prev?.wht_filer_responsible || null,
          prev_wht_filer_responsible_name: prev?.wht_filer_responsible_name || null,
          prev_vat_filer_responsible: prev?.vat_filer_responsible || null,
          prev_vat_filer_responsible_name: prev?.vat_filer_responsible_name || null,
          prev_document_entry_responsible: prev?.document_entry_responsible || null,
          prev_document_entry_responsible_name: prev?.document_entry_responsible_name || null,
          new_accounting_responsible: existingData?.new_accounting_responsible ?? (isAssigned ? existing?.accounting_responsible : prev?.accounting_responsible) ?? null,
          new_tax_inspection_responsible: existingData?.new_tax_inspection_responsible ?? (isAssigned ? existing?.tax_inspection_responsible : prev?.tax_inspection_responsible) ?? null,
          new_wht_filer_responsible: existingData?.new_wht_filer_responsible ?? (isAssigned ? existing?.wht_filer_responsible : prev?.wht_filer_responsible) ?? null,
          new_vat_filer_responsible: existingData?.new_vat_filer_responsible ?? (isAssigned ? existing?.vat_filer_responsible : prev?.vat_filer_responsible) ?? null,
          new_document_entry_responsible: existingData?.new_document_entry_responsible ?? (isAssigned ? existing?.document_entry_responsible : prev?.document_entry_responsible) ?? null,
        }
      })
      setLoadedPreviewData(allPreviewItems)
      setPreviewData(allPreviewItems)
      setIsLoadingPreview(false); setLoadingProgress({ current: 0, total: 0 })
      setBulkCreateModalOpened(false); setPreviewPage(1)
      notifications.show({ title: 'ดึงข้อมูลสำเร็จ', message: `ดึงข้อมูล ${allPreviewItems.length} รายการเรียบร้อยแล้ว`, color: 'green', icon: <TbCheck size={16} /> })
    } catch (error) {
      console.error('Error fetching preview data:', error)
      setIsLoadingPreview(false); setLoadingProgress({ current: 0, total: 0 })
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง', color: 'red', icon: <TbAlertCircle size={16} /> })
    }
  }

  // ── Bulk Save Logic ───────────────────────────────────────────────
  const executeBulkSave = async (saveYear: number, saveMonth: number, skipBuilds: string[] = []) => {
    if (isSaving) return
    setIsSaving(true)
    let successCount = 0; let errorCount = 0; let skippedCount = 0
    const errors: Array<{ build: string; error: string }> = []
    try {
      const duplicateMap = new Map<string, WorkAssignmentType>()
      duplicateItems.forEach((dup) => duplicateMap.set(`${dup.build}_${dup.assignment_year}_${dup.assignment_month}`, dup))
      const itemsToSave = previewData.filter((item) => !skipBuilds.includes(item.build))
      const itemsToProcess = itemsToSave.filter((item) => {
        const ty = item.target_tax_year || saveYear
        const tm = item.target_tax_month || saveMonth
        if (duplicateMap.has(`${item.build}_${ty}_${tm}`)) { skippedCount++; return false }
        return true
      })
      const batchSize = 5
      for (let i = 0; i < itemsToProcess.length; i += batchSize) {
        const batch = itemsToProcess.slice(i, i + batchSize)
        await Promise.all(batch.map(async (item) => {
          try {
            await mutations.createMutationBulk.mutateAsync({
              build: item.build,
              assignment_year: item.target_tax_year || saveYear,
              assignment_month: item.target_tax_month || saveMonth,
              accounting_responsible: item.new_accounting_responsible,
              tax_inspection_responsible: item.new_tax_inspection_responsible,
              wht_filer_responsible: item.new_wht_filer_responsible,
              vat_filer_responsible: item.new_vat_filer_responsible,
              document_entry_responsible: item.new_document_entry_responsible,
              assignment_note: null,
            })
            successCount++
          } catch (error: unknown) {
            errorCount++
            errors.push({ build: item.build, error: getErrorMessage(error) })
          }
        }))
        if (i + batchSize < itemsToProcess.length) await new Promise((r) => setTimeout(r, 300))
      }
      if (successCount > 0) {
        notifications.show({ title: 'บันทึกข้อมูลสำเร็จ', message: `บันทึกสำเร็จ ${successCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount}` : ''}${skippedCount > 0 ? `, ข้ามซ้ำ ${skippedCount}` : ''}`, color: errorCount > 0 ? 'yellow' : 'green', icon: errorCount > 0 ? <TbAlertCircle size={16} /> : <TbCheck size={16} /> })
      } else {
        notifications.show({ title: 'ไม่สามารถบันทึกข้อมูลได้', message: `ล้มเหลว ${errorCount}${skippedCount > 0 ? `, ข้ามซ้ำ ${skippedCount}` : ''}`, color: 'red', icon: <TbAlertCircle size={16} /> })
      }
      if (errorCount === 0) { setPreviewData([]); setDuplicateItems([]); setIncompleteItems([]) }
      else { const failedBuilds = new Set(errors.map((e) => e.build)); setPreviewData((prev) => prev.filter((item) => failedBuilds.has(item.build))) }
      mutations.queryClient.invalidateQueries(['work-assignments'])
    } catch (error) {
      console.error('Bulk save error:', error)
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: getErrorMessage(error) || 'ไม่สามารถบันทึกข้อมูลได้', color: 'red', icon: <TbAlertCircle size={16} /> })
    } finally { setIsSaving(false); mutations.queryClient.invalidateQueries(['work-assignments']) }
  }

  // ── Save Flow Handlers ────────────────────────────────────────────
  const handleSavePreviewData = () => {
    if (previewData.length === 0) return
    const ct = getCurrentTaxMonth()
    setSelectedTaxYear(targetTaxYear || ct.year)
    setSelectedTaxMonth(targetTaxMonth || ct.month)
    setTaxMonthModalOpened(true)
  }

  const handleTaxMonthConfirm = async () => {
    if (!selectedTaxYear || !selectedTaxMonth) return
    setTaxMonthModalOpened(false)
    const validation = validatePreviewData(previewData)
    if (!validation.isValid) {
      setIncompleteItems(validation.incompleteItems)
      setIncompleteDataModalOpened(true)
      return
    }
    const duplicates = await workAssignmentsService.checkDuplicates(
      previewData.map((item) => item.build), selectedTaxYear, selectedTaxMonth
    )
    if (duplicates.length > 0) {
      setDuplicateItems(duplicates)
      setDuplicateDataModalOpened(true)
      return
    }
    executeBulkSave(selectedTaxYear, selectedTaxMonth)
  }

  const handleIncompleteDataConfirm = async () => {
    setIncompleteDataModalOpened(false)
    if (!selectedTaxYear || !selectedTaxMonth) return
    const duplicates = await workAssignmentsService.checkDuplicates(
      previewData.map((item) => item.build), selectedTaxYear, selectedTaxMonth
    )
    if (duplicates.length > 0) {
      setDuplicateItems(duplicates)
      setDuplicateDataModalOpened(true)
      return
    }
    executeBulkSave(selectedTaxYear, selectedTaxMonth)
  }

  const handleDuplicateDataConfirm = () => {
    setDuplicateDataModalOpened(false)
    if (!selectedTaxYear || !selectedTaxMonth) return
    executeBulkSave(selectedTaxYear, selectedTaxMonth)
  }

  // ── Effects ───────────────────────────────────────────────────────
  useEffect(() => { setPage(1) }, [search, build, year, month, viewMode, filterByAccounting, filterByTaxInspection, filterByWht, filterByVat, filterByDocumentEntry])

  useEffect(() => {
    const vm = getViewMonth()
    setYear(vm.year.toString())
    setMonth(vm.month.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  useEffect(() => {
    if (formOpened && formMode === 'create') {
      const current = viewMode === 'current' ? getCurrentTaxMonth() : getPreviousMonth()
      setFormYear(current.year); setFormMonth(current.month)
    }
  }, [viewMode, formOpened, formMode])

  useEffect(() => {
    if (bulkCreateModalOpened) {
      setSelectedCompanyStatuses(['รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย', 'ยกเลิกทำ'])
      const ct = getCurrentTaxMonth()
      const prev = new Date(ct.year, ct.month - 2, 1)
      if (selectedPreviousTaxYear === null) setSelectedPreviousTaxYear(prev.getFullYear())
      if (selectedPreviousTaxMonth === null) setSelectedPreviousTaxMonth(prev.getMonth() + 1)
    } else { setSelectedPreviousTaxYear(null); setSelectedPreviousTaxMonth(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkCreateModalOpened])

  // ── Statistics ────────────────────────────────────────────────────
  const userOptionsMap: Record<string, SelectOption[]> = {
    accounting: queries.accountingUserOptions, tax_inspection: queries.taxInspectionUserOptions,
    wht: queries.filingUserOptions, vat: queries.filingUserOptions, document_entry: queries.documentEntryUserOptions,
  }
  const workStatistics = queries.assignmentsData?.data
    ? calculateEmployeeStatistics(queries.assignmentsData.data as unknown as Record<string, unknown>[], SAVED_ASSIGNMENT_ROLE_FIELDS, userOptionsMap)
    : []
  const workStatisticsByRole = groupStatisticsByRole(workStatistics)
  const previewWorkStatistics = previewData.length > 0
    ? calculateEmployeeStatistics(previewData as unknown as Record<string, unknown>[], PREVIEW_ROLE_FIELDS, userOptionsMap)
    : []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const previewWorkStatisticsByRole = groupStatisticsByRole(previewWorkStatistics)

  // ── Filtered Preview Data ─────────────────────────────────────────
  const filteredPreviewData = previewData.filter((item) => {
    if (filterByAssignmentStatus === 'assigned' && !item.is_assigned) return false
    if (filterByAssignmentStatus === 'unassigned' && item.is_assigned) return false
    if (debouncedPreviewSearch) {
      const q = debouncedPreviewSearch.toLowerCase()
      return item.build.toLowerCase().includes(q) || item.company_name.toLowerCase().includes(q)
    }
    return true
  })
  const totalPreviewPages = Math.ceil(filteredPreviewData.length / previewLimit)
  const paginatedPreviewData = filteredPreviewData.slice((previewPage - 1) * previewLimit, previewPage * previewLimit)

  // ── Assignments for bulk change ───────────────────────────────────
  const selectedAssignmentsForBulkChange = queries.assignmentsData?.data?.filter(
    (a) => selectedAssignmentIds.has(a.id)
  ) || []

  // ── Guard: Access Control ─────────────────────────────────────────
  if (!isAdmin) {
    return (
      <Box px="md" py="md">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="ไม่มีสิทธิ์เข้าถึง">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</Alert>
      </Box>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Box style={{ marginLeft: 'calc(var(--mantine-spacing-md) * -1)', marginRight: 'calc(var(--mantine-spacing-md) * -1)', marginTop: 'calc(var(--mantine-spacing-md) * -1)', marginBottom: 'calc(var(--mantine-spacing-md) * -1)', padding: 'var(--mantine-spacing-md)' }}>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>จัดงานรายเดือน</Title>
          <Group gap="sm">
            <Button variant="outline" color="orange" onClick={() => setViewMode('current')} radius="lg" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
              เดือนภาษีปัจจุบัน ({getCurrentTaxMonth().year}/{getCurrentTaxMonth().month})
            </Button>
            <Button variant="outline" color="orange" onClick={() => setViewMode('previous')} radius="lg" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
              เดือนภาษีก่อนหน้า ({getPreviousMonth().year}/{getPreviousMonth().month})
            </Button>
            <Button leftSection={<TbPlus size={18} />} radius="lg" variant="outline" color="orange" onClick={handleAdd} style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>สร้างการจัดงานใหม่</Button>
            <Button leftSection={<TbUpload size={18} />} radius="lg" variant="outline" color="orange" onClick={() => setImportModalOpened(true)} style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>นำเข้าจาก Excel</Button>
            <Button leftSection={<TbRefresh size={18} />} radius="lg" variant="outline" color="red" onClick={() => setBulkSyncConfirmOpened(true)} style={{ backgroundColor: 'white', borderColor: 'var(--mantine-color-red-6)', color: 'var(--mantine-color-red-6)' }}>ซิงค์รายการที่ล้มเหลว</Button>
            <Tooltip label={showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}>
              <Button leftSection={showPreviousColumns ? <TbEyeOff size={18} /> : <TbEye size={18} />} radius="lg" variant="outline" color="gray" onClick={toggleAllPreviousColumns} style={{ backgroundColor: showPreviousColumns ? '#f0f0f0' : 'white', color: 'black' }}>
                {showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {/* Current View Info */}
        <Card withBorder radius="lg" p="md" style={{ backgroundColor: 'white', borderColor: 'var(--mantine-color-orange-6)' }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Text size="sm" fw={500} c="black">กำลังแสดงข้อมูลเดือนภาษี:</Text>
              <Badge size="lg" variant="outline" color="orange" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
                {(() => { const vm = getViewMonth(); const dy = year || vm.year; const dm = month || vm.month; return `${THAI_MONTHS.find((m) => m.value === dm.toString())?.label || dm} ${dy}` })()}
              </Badge>
            </Group>
            <Text size="xs" c="black">{queries.assignmentsData?.pagination?.total || 0} รายการ</Text>
          </Group>
        </Card>

        {/* Filters */}
        <Card withBorder radius="lg" p="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500} c="black">กรองข้อมูล</Text>
              <Button leftSection={<TbRefresh size={18} />} variant="outline" color="orange" onClick={queries.handleRefresh} loading={queries.isRefetching} radius="lg" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>รีเฟรซข้อมูล</Button>
            </Group>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ค้นหา</Text>
                  <TextInput placeholder="ค้นหา..." leftSection={<TbSearch size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} radius="lg" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ปี</Text>
                  <NumberInput placeholder="ปี" value={year ? parseInt(year) : undefined} onChange={(value) => setYear(value ? value.toString() : null)} min={2020} max={2100} radius="lg" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>เดือน</Text>
                  <Select placeholder="ทุกเดือน" data={MONTH_OPTIONS} value={month} onChange={setMonth} clearable radius="lg" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>สถานะซิงค์</Text>
                  <Select data={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'synced', label: 'ซิงค์แล้ว' }, { value: 'unsynced', label: 'ยังไม่ซิงค์' }]} value={syncStatusFilter} onChange={(v) => setSyncStatusFilter((v as 'all' | 'synced' | 'unsynced') || 'all')} radius="lg" />
                </Stack>
              </Grid.Col>
            </Grid>
            <Grid mt="xs">
              <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ทำบัญชี</Text>
                  <Select placeholder="ทั้งหมด" data={queries.accountingUserOptions} value={filterByAccounting} onChange={setFilterByAccounting} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ตรวจภาษี</Text>
                  <Select placeholder="ทั้งหมด" data={queries.taxInspectionUserOptions} value={filterByTaxInspection} onChange={setFilterByTaxInspection} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ยื่น WHT</Text>
                  <Select placeholder="ทั้งหมด" data={queries.filingUserOptions} value={filterByWht} onChange={setFilterByWht} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>ยื่น VAT</Text>
                  <Select placeholder="ทั้งหมด" data={queries.filingUserOptions} value={filterByVat} onChange={setFilterByVat} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>คีย์เอกสาร</Text>
                  <Select placeholder="ทั้งหมด" data={queries.documentEntryUserOptions} value={filterByDocumentEntry} onChange={setFilterByDocumentEntry} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Assignment Table */}
        <AssignmentTable
          assignmentsData={queries.assignmentsData}
          isLoading={queries.isLoading}
          isRefetching={queries.isRefetching}
          error={queries.error}
          page={page}
          setPage={setPage}
          formatEmployeeNameWithId={queries.formatEmployeeNameWithId}
          handleRefresh={queries.handleRefresh}
          handleEdit={handleEdit}
          handleReset={(a) => { setSelectedAssignment(a); setResetConfirmOpened(true) }}
          onChangeResponsible={(a) => { setChangeResponsibleAssignment(a); setChangeResponsibleOpened(true) }}
          onDeleteAssignment={(a) => { setDeleteAssignment(a); setDeleteConfirmOpened(true) }}
          selectedIds={selectedAssignmentIds}
          onSelectionChange={setSelectedAssignmentIds}
          onBulkChangeClick={() => setBulkChangeOpened(true)}
          year={year}
          month={month}
          getViewMonth={getViewMonth}
          setYear={setYear}
          setMonth={setMonth}
          setBuild={setBuild}
          setSearch={setSearch}
        />

        {/* Preview Data Table (inline — this section shows bulk create preview) */}
        {previewData.length > 0 && (
          <Card withBorder radius="lg" p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="lg" fw={600}>ข้อมูลตัวอย่าง ({filteredPreviewData.length} รายการ)</Text>
                <Group gap="sm">
                  <Select size="xs" data={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'assigned', label: 'จัดแล้ว' }, { value: 'unassigned', label: 'ยังไม่จัด' }]} value={filterByAssignmentStatus} onChange={(v) => setFilterByAssignmentStatus((v as 'all' | 'assigned' | 'unassigned') || 'all')} />
                  <TextInput size="xs" placeholder="ค้นหา Build/บริษัท..." value={previewSearch} onChange={(e) => setPreviewSearch(e.target.value)} leftSection={<TbSearch size={14} />} />
                  <Button color="green" onClick={handleSavePreviewData} loading={isSaving}>บันทึกข้อมูลทั้งหมด</Button>
                </Group>
              </Group>
              <Text size="xs" c="dimmed">แสดง {paginatedPreviewData.length} จาก {filteredPreviewData.length} รายการ (หน้า {previewPage}/{totalPreviewPages || 1})</Text>
            </Stack>
          </Card>
        )}

        {/* Statistics Section */}
        {workStatisticsByRole.length > 0 && (
          <Card withBorder radius="lg" p="md">
            <Text size="lg" fw={600} mb="md">สถิติการจัดงาน (ข้อมูลที่บันทึกแล้ว)</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {workStatisticsByRole.map((role) => (
                <Card key={role.role} withBorder p="sm" radius="md">
                  <Text fw={600} size="sm">{role.roleLabel}</Text>
                  <Text size="xs" c="dimmed">{role.totalEmployees} คน | รวม {role.grandTotal} บริษัท</Text>
                  <Text size="xs" c="dimmed">จด VAT: {role.totalVatRegistered} | ไม่จด: {role.totalNotVatRegistered}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Card>
        )}
      </Stack>

      {/* ── Modals ─────────────────────────────────────────────────── */}

      {/* Create/Edit Form Modal */}
      <CreateEditFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        formMode={formMode}
        viewMode={viewMode === 'current' ? 'current' : 'next' as 'current' | 'next'}
        setViewMode={(v) => setViewMode(v === 'current' ? 'current' : 'previous')}
        formBuild={formBuild} setFormBuild={setFormBuild}
        formYear={formYear} setFormYear={setFormYear}
        formMonth={formMonth} setFormMonth={setFormMonth}
        formAccountingResponsible={formAccountingResponsible} setFormAccountingResponsible={setFormAccountingResponsible}
        formTaxInspectionResponsible={formTaxInspectionResponsible} setFormTaxInspectionResponsible={setFormTaxInspectionResponsible}
        formWhtFilerResponsible={formWhtFilerResponsible} setFormWhtFilerResponsible={setFormWhtFilerResponsible}
        formVatFilerResponsible={formVatFilerResponsible} setFormVatFilerResponsible={setFormVatFilerResponsible}
        formDocumentEntryResponsible={formDocumentEntryResponsible} setFormDocumentEntryResponsible={setFormDocumentEntryResponsible}
        formNote={formNote} setFormNote={setFormNote}
        companyStatusFilter={companyStatusFilter} setCompanyStatusFilter={setCompanyStatusFilter}
        companyStatusOptions={COMPANY_STATUS_OPTIONS}
        clientOptions={queries.clientOptions}
        clientSearchValue={queries.clientSearchValue} setClientSearchValue={queries.setClientSearchValue}
        accountingUserOptions={queries.accountingUserOptions}
        taxInspectionUserOptions={queries.taxInspectionUserOptions}
        filingUserOptions={queries.filingUserOptions}
        documentEntryUserOptions={queries.documentEntryUserOptions}
        monthOptions={MONTH_OPTIONS}
        onSubmit={handleFormSubmit}
        resetForm={resetForm}
        isSubmitting={mutations.createMutation.isLoading || mutations.updateMutation.isLoading}
      />

      {/* Bulk Create Modal */}
      <BulkCreateModal
        targetTaxYearModalOpened={targetTaxYearModalOpened} setTargetTaxYearModalOpened={setTargetTaxYearModalOpened}
        targetTaxYear={targetTaxYear} setTargetTaxYear={setTargetTaxYear}
        targetTaxMonth={targetTaxMonth} setTargetTaxMonth={setTargetTaxMonth}
        bulkCreateModalOpened={bulkCreateModalOpened} setBulkCreateModalOpened={setBulkCreateModalOpened}
        selectedCompanyStatuses={selectedCompanyStatuses} setSelectedCompanyStatuses={setSelectedCompanyStatuses}
        companyStatusOptions={COMPANY_STATUS_OPTIONS}
        selectedPreviousTaxYear={selectedPreviousTaxYear} setSelectedPreviousTaxYear={setSelectedPreviousTaxYear}
        selectedPreviousTaxMonth={selectedPreviousTaxMonth} setSelectedPreviousTaxMonth={setSelectedPreviousTaxMonth}
        isLoadingPreview={isLoadingPreview}
        loadingProgress={loadingProgress}
        handleBulkCreateConfirm={handleBulkCreateConfirm}
        setPreviewData={setPreviewData as (v: never[]) => void}
      />

      {/* Save Confirmation Modals (TaxMonth + Incomplete + Duplicate) */}
      <SaveConfirmationModals
        taxMonthModalOpened={taxMonthModalOpened} setTaxMonthModalOpened={setTaxMonthModalOpened}
        selectedTaxYear={selectedTaxYear} setSelectedTaxYear={setSelectedTaxYear}
        selectedTaxMonth={selectedTaxMonth} setSelectedTaxMonth={setSelectedTaxMonth}
        incompleteDataModalOpened={incompleteDataModalOpened} setIncompleteDataModalOpened={setIncompleteDataModalOpened}
        incompleteItems={incompleteItems}
        duplicateDataModalOpened={duplicateDataModalOpened} setDuplicateDataModalOpened={setDuplicateDataModalOpened}
        duplicateItems={duplicateItems}
        previewData={previewData}
        allClients={allClients}
        isSaving={isSaving}
        onTaxMonthConfirm={handleTaxMonthConfirm}
        onIncompleteDataConfirm={handleIncompleteDataConfirm}
        onDuplicateDataConfirm={handleDuplicateDataConfirm}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        opened={deleteConfirmOpened}
        onClose={() => { setDeleteConfirmOpened(false); setDeleteAssignment(null) }}
        assignment={deleteAssignment}
        onConfirm={() => { if (deleteAssignment) mutations.deleteMutation.mutate(deleteAssignment.id) }}
      />

      {/* Reset Confirm Modal */}
      <Modal opened={resetConfirmOpened} onClose={() => setResetConfirmOpened(false)} title="ยืนยันการรีเซ็ต" size="md" centered>
        <Stack gap="md">
          <Alert color="orange" icon={<TbAlertCircle size={16} />}>
            <Text size="sm">คุณต้องการรีเซ็ตข้อมูลของ {selectedAssignment?.build} หรือไม่?</Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setResetConfirmOpened(false)}>ยกเลิก</Button>
            <Button color="orange" onClick={() => { if (selectedAssignment) mutations.resetMutation.mutateAsync(selectedAssignment.id) }} loading={mutations.resetMutation.isLoading}>ยืนยัน</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Sync Confirm Modal */}
      <Modal opened={bulkSyncConfirmOpened} onClose={() => setBulkSyncConfirmOpened(false)} title="ยืนยันการซิงค์ข้อมูล" size="md" centered>
        <Stack gap="md">
          <Alert color="orange" icon={<TbAlertCircle size={16} />}>
            <Text size="sm">ระบบจะซิงค์รายการที่ sync ล้มเหลวทั้งหมด</Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setBulkSyncConfirmOpened(false)}>ยกเลิก</Button>
            <Button color="red" onClick={() => mutations.bulkSyncMutation.mutate({ year: year || undefined, month: month || undefined })} loading={mutations.bulkSyncMutation.isLoading}>ยืนยัน</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Responsibility Change Modals */}
      <ResponsibilityChangeModal opened={changeResponsibleOpened} onClose={() => { setChangeResponsibleOpened(false); setChangeResponsibleAssignment(null) }} assignment={changeResponsibleAssignment} />
      <BulkResponsibilityChangeModal opened={bulkChangeOpened} onClose={() => setBulkChangeOpened(false)} assignments={selectedAssignmentsForBulkChange} onSuccess={() => setSelectedAssignmentIds(new Set())} />

      {/* Import Modal */}
      <WorkAssignmentImport opened={importModalOpened} onClose={() => setImportModalOpened(false)} />
    </Box>
  )
}
