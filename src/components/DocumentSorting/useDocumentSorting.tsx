import React, { useState, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbCheck, TbX } from 'react-icons/tb'
import { AxiosError } from 'axios'

import documentEntryWorkService, { DocumentEntryWorkBot, DocumentEntryWork } from '../../services/documentEntryWorkService'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import { getSectionsWithData } from '../../utils/taxAcknowledgmentUtils'
import type { RecordWithAcknowledgmentFields } from '../../utils/taxAcknowledgmentUtils'

interface ErrorResponse {
  message?: string;
  [key: string]: unknown;
}

export function useDocumentSorting() {
  const queryClient = useQueryClient()
  const currentTaxMonth = useMemo(() => getCurrentTaxMonth(), [])

  // === Form state ===
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)
  
  // These should technically be derived, but modifying them keeps functionality identical to old code
  const [taxRegistrationStatus, setTaxRegistrationStatus] = useState<string | null>(null)
  const [documentEntryResponsible, setDocumentEntryResponsible] = useState<string | null>(null) 
  const [submissionCount, setSubmissionCount] = useState<number>(0)
  const [existingDocumentEntryWorkId, setExistingDocumentEntryWorkId] = useState<string | null>(null)
  const [existingRecordSubmissionCount, setExistingRecordSubmissionCount] = useState<number | null>(null)

  // User interations
  const [whtDocumentCount, setWhtDocumentCount] = useState<number>(0)
  const [vatDocumentCount, setVatDocumentCount] = useState<number>(0)
  const [nonVatDocumentCount, setNonVatDocumentCount] = useState<number>(0)
  const [bots, setBots] = useState<DocumentEntryWorkBot[]>([])
  const [submissionComment, setSubmissionComment] = useState<string>('')
  const [returnComment, setReturnComment] = useState<string>('')

  // === Unsaved Modal state ===
  const [unsavedModalOpened, setUnsavedModalOpened] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<{ buildId: string; companyName?: string } | null>(null)

  // === Acknowledgment modal state ===
  const [acknowledgmentOpened, setAcknowledgmentOpened] = useState(false)
  const [pendingBuildId, setPendingBuildId] = useState<string | undefined>()
  const [pendingCompanyName, setPendingCompanyName] = useState<string | undefined>()
  const [acknowledgmentSections, setAcknowledgmentSections] = useState<string[]>([])
  const [acknowledgmentRecord, setAcknowledgmentRecord] = useState<RecordWithAcknowledgmentFields | null>(null)

  // Status check
  const isVatAllowed = taxRegistrationStatus === 'จดภาษีมูลค่าเพิ่ม'
  const isFormDirty =
    whtDocumentCount > 0 ||
    vatDocumentCount > 0 ||
    nonVatDocumentCount > 0 ||
    bots.length > 0 ||
    submissionComment.trim() !== '' ||
    returnComment.trim() !== ''

  const {
    isLoading: isLoadingExisting,
    isError: isErrorExisting,
    refetch: refetchExisting,
  } = useQuery(
    ['document-entry-work', selectedBuild, currentTaxMonth.year, currentTaxMonth.month],
    () => {
      if (!selectedBuild) return null
      return documentEntryWorkService.getByBuildYearMonth(selectedBuild, currentTaxMonth.year, currentTaxMonth.month)
    },
    {
      enabled: !!selectedBuild,
      staleTime: 0,
      cacheTime: 5 * 1000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      onSuccess: (data) => {
        const currentSubmissionCount = data?.submission_count || 0
        setSubmissionCount(currentSubmissionCount)
        setTaxRegistrationStatus(data?.tax_registration_status || null)
        setDocumentEntryResponsible(data?.document_entry_responsible || null)

        if (data?.data?.company_name) {
          setSelectedCompanyName(data.data.company_name)
        }

        if (data?.data && currentSubmissionCount === 0) {
          // Load existing data into form
          setWhtDocumentCount(data.data.wht_document_count || 0)
          setVatDocumentCount(data.data.vat_document_count || 0)
          setNonVatDocumentCount(data.data.non_vat_document_count || 0)
          setBots(data.bots || [])
          setSubmissionComment(data.data.submission_comment || '')
          setReturnComment(data.data.return_comment || '')
          setExistingDocumentEntryWorkId(data.data.id)
          setExistingRecordSubmissionCount(data.data.submission_count || null)
        } else {
          resetFormInput()
        }
      },
    }
  )

  // === Create Mutation ===
  const createMutation = useMutation(
    (data: Parameters<typeof documentEntryWorkService.create>[0]) => documentEntryWorkService.create(data),
    {
      onSuccess: (response) => {
        notifications.show({ title: 'สำเร็จ', message: 'สร้างงานคีย์เอกสารสำเร็จ', color: 'green', icon: <TbCheck size={16} /> })
        queryClient.invalidateQueries(['document-entry-work'])
        if (response.submission_count) setSubmissionCount(response.submission_count)
        
        setSelectedBuild(null)
        resetFormInput()
      },
      onError: (error: AxiosError<ErrorResponse>) => {
        const errorMessage = error.code === 'ERR_NETWORK' ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' : (error.response?.data?.message || 'ไม่สามารถสร้างงานคีย์เอกสารได้')
        notifications.show({ title: 'เกิดข้อผิดพลาด', message: errorMessage, color: 'red', icon: <TbX size={16} /> })
      },
    }
  )

  // === Update Mutation ===
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Parameters<typeof documentEntryWorkService.update>[1] }) =>
      documentEntryWorkService.update(id, data),
    {
      onSuccess: () => {
        notifications.show({ title: 'สำเร็จ', message: 'อัพเดทข้อมูลงานคีย์เอกสารสำเร็จ', color: 'green', icon: <TbCheck size={16} /> })
        queryClient.invalidateQueries(['document-entry-work'])
        refetchExisting()
      },
      onError: (error: AxiosError<ErrorResponse>) => {
        const errorMessage = error.code === 'ERR_NETWORK' ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' : (error.response?.data?.message || 'ไม่สามารถอัพเดทข้อมูลได้')
        notifications.show({ title: 'เกิดข้อผิดพลาด', message: errorMessage, color: 'red', icon: <TbX size={16} /> })
      },
    }
  )

  // === Fetch acknowledgment data ===
  useQuery(
    ['monthly-tax-data', 'acknowledgment', pendingBuildId, currentTaxMonth.year, currentTaxMonth.month],
    () => {
      if (!pendingBuildId) return null
      return monthlyTaxDataService.getByBuildYearMonth(pendingBuildId, currentTaxMonth.year, currentTaxMonth.month)
    },
    {
      enabled: !!pendingBuildId,
      staleTime: 1 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      onSuccess: (data) => {
        let record: RecordWithAcknowledgmentFields | null = null
        if (data) {
          record = {
            wht_inquiry: data.wht_inquiry || null,
            wht_response: data.wht_response || null,
            wht_submission_comment: data.wht_submission_comment || null,
            wht_filing_response: data.wht_filing_response || null,
            pp30_inquiry: data.pp30_inquiry || null,
            pp30_response: data.pp30_response || null,
            pp30_submission_comment: data.pp30_submission_comment || null,
            pp30_filing_response: data.pp30_filing_response || null,
          }
        }
        
        const sections = record ? getSectionsWithData(record) : []
        if (sections.length > 0) {
          setAcknowledgmentSections(sections)
          setAcknowledgmentRecord(record)
          setAcknowledgmentOpened(true)
        } else {
          handleAcknowledgmentConfirm()
        }
      },
      onError: () => handleAcknowledgmentConfirm(),
    }
  )

  // Form input reset helper
  const resetFormInput = useCallback(() => {
    setWhtDocumentCount(0)
    setVatDocumentCount(0)
    setNonVatDocumentCount(0)
    setBots([])
    setSubmissionComment('')
    setReturnComment('')
    setExistingDocumentEntryWorkId(null)
    setExistingRecordSubmissionCount(null)
  }, [])

  // Process selecting a company after passing the Unsaved Guard
  const confirmSelectCompany = useCallback((buildId: string, companyName?: string) => {
    // Process changing to new company directly
    setPendingBuildId(buildId)
    setPendingCompanyName(companyName)
    setUnsavedModalOpened(false)
    setPendingSelection(null)
  }, [])

  // Action for company change (Guarded)
  const handleCompanyChange = useCallback((buildId: string, companyName?: string) => {
    // Check if form has unsaved edits
    if (selectedBuild && isFormDirty) {
      setUnsavedModalOpened(true)
      setPendingSelection({ buildId, companyName })
    } else {
      confirmSelectCompany(buildId, companyName)
    }
  }, [isFormDirty, selectedBuild, confirmSelectCompany])

  // Process Acknowledgment confirmed
  const handleAcknowledgmentConfirm = useCallback(() => {
    if (pendingBuildId) {
      setSelectedBuild(pendingBuildId)
      setSelectedCompanyName(pendingCompanyName || null)
      setTaxRegistrationStatus(null) 
      setDocumentEntryResponsible(null) 
      setSubmissionCount(0)
      resetFormInput()
    }
    setAcknowledgmentOpened(false)
    setPendingBuildId(undefined)
    setPendingCompanyName(undefined)
    setAcknowledgmentSections([])
    setAcknowledgmentRecord(null)
  }, [pendingBuildId, pendingCompanyName, resetFormInput])

  // Common clear selection
  const handleClearSelection = useCallback(() => {
    if (selectedBuild && isFormDirty) {
       setUnsavedModalOpened(true)
       setPendingSelection(null) // User wants to just clear, not switch
       return
    }
    
    setSelectedBuild(null)
    setSelectedCompanyName(null)
    setTaxRegistrationStatus(null)
    setDocumentEntryResponsible(null)
    setSubmissionCount(0)
    resetFormInput()
  }, [selectedBuild, isFormDirty, resetFormInput])

  const proceedWithClearSelection = useCallback(() => {
    setSelectedBuild(null)
    setSelectedCompanyName(null)
    setTaxRegistrationStatus(null)
    setDocumentEntryResponsible(null)
    setSubmissionCount(0)
    resetFormInput()
    setUnsavedModalOpened(false)
    setPendingSelection(null)
  }, [resetFormInput])

  // Handle Edit
  const handleEditEntry = useCallback(async (entry: DocumentEntryWork) => {
    const canEdit =
      (entry.wht_entry_status === null || entry.wht_entry_status === 'ยังไม่ดำเนินการ') &&
      (entry.vat_entry_status === null || entry.vat_entry_status === 'ยังไม่ดำเนินการ') &&
      (entry.non_vat_entry_status === null || entry.non_vat_entry_status === 'ยังไม่ดำเนินการ')

    if (!canEdit) {
      notifications.show({ title: 'ไม่สามารถแก้ไขได้', message: 'สามารถแก้ไขได้เฉพาะเมื่อสถานะทั้งหมดเป็น "ยังไม่ดำเนินการ" เท่านั้น', color: 'orange', icon: <TbX size={16} /> })
      return
    }

    try {
      const entryDetail = await documentEntryWorkService.getById(entry.id)
      if (entryDetail?.data) {
        setWhtDocumentCount(entryDetail.data.wht_document_count || 0)
        setVatDocumentCount(entryDetail.data.vat_document_count || 0)
        setNonVatDocumentCount(entryDetail.data.non_vat_document_count || 0)
        setBots(entryDetail.bots || [])
        setSubmissionComment(entryDetail.data.submission_comment || '')
        setReturnComment(entryDetail.data.return_comment || '')
        setExistingDocumentEntryWorkId(entryDetail.data.id)
        setExistingRecordSubmissionCount(entryDetail.data.submission_count || null)

        setTimeout(() => {
          const formSection = document.querySelector('[data-form-section]')
          if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        notifications.show({ title: 'โหลดข้อมูลสำเร็จ', message: `กำลังแก้ไขข้อมูลครั้งที่ ${entry.submission_count}`, color: 'blue', icon: <TbCheck size={16} /> })
      }
    } catch (error) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้', color: 'red', icon: <TbX size={16} /> })
    }
  }, [])

  // Main submission
  const handleSubmit = useCallback(() => {
    if (!selectedBuild) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'กรุณาเลือกบริษัท', color: 'red', icon: <TbX size={16} /> })
      return
    }

    if (!documentEntryResponsible) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่พบข้อมูลพนักงานที่รับผิดชอบในการคีย์ กรุณาตรวจสอบข้อมูลบริษัท', color: 'red', icon: <TbX size={16} /> })
      return
    }

    const submitData = {
      build: selectedBuild,
      work_year: currentTaxMonth.year,
      work_month: currentTaxMonth.month,
      responsible_employee_id: documentEntryResponsible, 
      wht_document_count: whtDocumentCount,
      vat_document_count: vatDocumentCount,
      non_vat_document_count: nonVatDocumentCount,
      submission_comment: submissionComment || null,
      return_comment: returnComment || null,
      bots: bots.length > 0 ? bots : undefined,
    }

    if (existingDocumentEntryWorkId) {
      updateMutation.mutate({ id: existingDocumentEntryWorkId, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }, [selectedBuild, documentEntryResponsible, currentTaxMonth, whtDocumentCount, vatDocumentCount, nonVatDocumentCount, submissionComment, returnComment, bots, existingDocumentEntryWorkId, createMutation, updateMutation])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries(['document-entry-work']),
        queryClient.invalidateQueries(['monthly-tax-data']),
      ])
      notifications.show({ title: 'สำเร็จ', message: 'รีเฟรชข้อมูลสำเร็จ', color: 'green', icon: <TbCheck size={16} /> })
    } catch (error) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถรีเฟรชข้อมูลได้', color: 'red', icon: <TbX size={16} /> })
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient])

  return {
    state: {
      currentTaxMonth,
      selectedBuild,
      selectedCompanyName,
      taxRegistrationStatus,
      whtDocumentCount,
      vatDocumentCount,
      nonVatDocumentCount,
      bots,
      submissionComment,
      returnComment,
      submissionCount,
      existingDocumentEntryWorkId,
      existingRecordSubmissionCount,
      unsavedModalOpened,
      pendingSelection,
      acknowledgmentOpened,
      acknowledgmentSections,
      acknowledgmentRecord,
      isLoadingExisting,
      isErrorExisting,
      isSubmitting: createMutation.isLoading || updateMutation.isLoading,
      isRefreshing,
      isVatAllowed,
    },
    setters: {
      setWhtDocumentCount,
      setVatDocumentCount,
      setNonVatDocumentCount,
      setBots,
      setSubmissionComment,
      setReturnComment,
      setUnsavedModalOpened,
      setAcknowledgmentOpened,
    },
    actions: {
      handleCompanyChange,
      handleClearSelection,
      handleAcknowledgmentConfirm,
      handleEditEntry,
      handleSubmit,
      handleRefresh,
      confirmSelectCompany,
      proceedWithClearSelection,
      refetchExisting,
    }
  }
}
