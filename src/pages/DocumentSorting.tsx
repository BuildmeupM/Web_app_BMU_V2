/**
 * Document Sorting Page
 * หน้าคัดแยกเอกสาร - สำหรับคัดแยกข้อมูลเอกสารและส่งข้อมูลเข้าไปยัง document_entry_work
 */

import { useState, useCallback } from 'react'
import { Container, Stack, Card, Button, Group, Text, Paper, Divider } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbCheck, TbX, TbLoader, TbRefresh } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWorkBot, DocumentEntryWork } from '../services/documentEntryWorkService'
import monthlyTaxDataService from '../services/monthlyTaxDataService'
import { getCurrentTaxMonth } from '../utils/taxMonthUtils'
import { getSectionsWithData } from '../utils/taxAcknowledgmentUtils'
import type { RecordWithAcknowledgmentFields } from '../utils/taxAcknowledgmentUtils'
import CompanyTable from '../components/DocumentSorting/CompanyTable'
import SubmissionCountBadge from '../components/DocumentSorting/SubmissionCountBadge'
import SubmissionHistory from '../components/DocumentSorting/SubmissionHistory'
import DocumentKeyingSection from '../components/DocumentSorting/DocumentKeyingSection'
import BotSubmissionSection from '../components/DocumentSorting/BotSubmissionSection'
import CommentsSection from '../components/DocumentSorting/CommentsSection'
import LoadingSpinner from '../components/Loading/LoadingSpinner'
import SummaryStats from '../components/DocumentSorting/SummaryStats'
import AcknowledgmentModal from '../components/TaxInspection/AcknowledgmentModal'

export default function DocumentSorting() {
  const queryClient = useQueryClient()

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Form state
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)
  const [taxRegistrationStatus, setTaxRegistrationStatus] = useState<string | null>(null)
  const [documentEntryResponsible, setDocumentEntryResponsible] = useState<string | null>(null) // พนักงานที่รับผิดชอบในการคีย์
  const [whtDocumentCount, setWhtDocumentCount] = useState<number>(0)
  const [vatDocumentCount, setVatDocumentCount] = useState<number>(0)
  const [nonVatDocumentCount, setNonVatDocumentCount] = useState<number>(0)
  const [bots, setBots] = useState<DocumentEntryWorkBot[]>([])
  const [submissionComment, setSubmissionComment] = useState<string>('')
  const [returnComment, setReturnComment] = useState<string>('')

  // Submission count
  const [submissionCount, setSubmissionCount] = useState<number>(0)
  const [existingDocumentEntryWorkId, setExistingDocumentEntryWorkId] = useState<string | null>(null)
  const [existingRecordSubmissionCount, setExistingRecordSubmissionCount] = useState<number | null>(null)

  // Acknowledgment modal state
  const [acknowledgmentOpened, setAcknowledgmentOpened] = useState(false)
  const [pendingBuildId, setPendingBuildId] = useState<string | undefined>()
  const [pendingCompanyName, setPendingCompanyName] = useState<string | undefined>()
  const [acknowledgmentSections, setAcknowledgmentSections] = useState<string[]>([])
  const [acknowledgmentRecord, setAcknowledgmentRecord] = useState<RecordWithAcknowledgmentFields | null>(null)

  // Check if VAT is allowed (only if tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
  const isVatAllowed = taxRegistrationStatus === 'จดภาษีมูลค่าเพิ่ม'

  // Fetch existing document entry work when company is selected
  const {
    isLoading: isLoadingExisting,
    refetch: refetchExisting,
  } = useQuery(
    ['document-entry-work', selectedBuild, currentTaxMonth.year, currentTaxMonth.month],
    () => {
      if (!selectedBuild) return null
      return documentEntryWorkService.getByBuildYearMonth(selectedBuild, currentTaxMonth.year, currentTaxMonth.month)
    },
    {
      enabled: !!selectedBuild,
      staleTime: 0, // ⚠️ ไม่ใช้ cache เพื่อป้องกันข้อมูลสลับกันระหว่างบริษัท
      cacheTime: 0, // ⚠️ ไม่เก็บ cache เพื่อให้ fetch ข้อมูลใหม่ทุกครั้งที่เปลี่ยนบริษัท
      refetchOnWindowFocus: false, // ป้องกันการ refetch เมื่อ window focus กลับมา
      refetchOnReconnect: false, // ป้องกันการ refetch เมื่อ reconnect
      onSuccess: (data) => {
        // ⚠️ ตรวจสอบว่าข้อมูลที่ได้มาตรงกับบริษัทที่เลือกอยู่หรือไม่
        // ป้องกัน race condition เมื่อเปลี่ยนบริษัทเร็วๆ
        if (data?.data?.build && data.data.build !== selectedBuild) {
          console.warn(`⚠️ Data mismatch: received build ${data.data.build}, but selected ${selectedBuild}. Ignoring stale data.`)
          return // ไม่ update state ถ้าข้อมูลไม่ตรงกับบริษัทที่เลือก
        }

        // Set submission_count เสมอ (จาก database)
        const currentSubmissionCount = data?.submission_count || 0
        setSubmissionCount(currentSubmissionCount)

        // Set tax_registration_status from response
        setTaxRegistrationStatus(data?.tax_registration_status || null)

        // Set document_entry_responsible from response
        setDocumentEntryResponsible(data?.document_entry_responsible || null)

        // Set company name from response
        if (data?.data?.company_name) {
          setSelectedCompanyName(data.data.company_name)
        }

        // ตรวจสอบว่ามีการส่งข้อมูลไปแล้วหรือไม่
        // ถ้ามีการส่งไปแล้ว (submissionCount > 0) ให้ reset form เป็นค่าว่าง ไม่โหลดข้อมูลเก่ามาแสดง
        // ถ้ายังไม่มีการส่ง (submissionCount === 0) และมี record อยู่ ให้โหลดข้อมูลมาแสดง (เพื่อให้แก้ไขได้)
        if (data?.data && currentSubmissionCount === 0) {
          // Load existing data into form (เฉพาะเมื่อยังไม่มีการส่งครั้งแรก)
          // เพื่อให้ผู้ใช้สามารถแก้ไขข้อมูลได้ก่อนส่งครั้งแรก
          setWhtDocumentCount(data.data.wht_document_count || 0)
          setVatDocumentCount(data.data.vat_document_count || 0)
          setNonVatDocumentCount(data.data.non_vat_document_count || 0)
          setBots(data.bots || [])
          setSubmissionComment(data.data.submission_comment || '')
          setReturnComment(data.data.return_comment || '')
          setExistingDocumentEntryWorkId(data.data.id)
          // เก็บ submission_count ของ record ที่โหลดมา เพื่อตรวจสอบว่าเป็น record ล่าสุดหรือไม่
          setExistingRecordSubmissionCount(data.data.submission_count || null)
        } else {
          // Reset form for new entry (เมื่อไม่มี record หรือมีการส่งไปแล้ว)
          // ถ้ามีการส่งไปแล้ว (submissionCount > 0) จะ reset form เพื่อให้ผู้ใช้กรอกข้อมูลใหม่สำหรับครั้งถัดไป
          setWhtDocumentCount(0) // Keep as 0 for backend, but display as empty
          setVatDocumentCount(0)
          setNonVatDocumentCount(0)
          setBots([])
          setSubmissionComment('')
          setReturnComment('')
          setExistingDocumentEntryWorkId(null)
          setExistingRecordSubmissionCount(null)
        }
      },
    }
  )

  // Create mutation
  const createMutation = useMutation(
    (data: Parameters<typeof documentEntryWorkService.create>[0]) => documentEntryWorkService.create(data),
    {
      onSuccess: (response) => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'สร้างงานคีย์เอกสารสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        // Invalidate queries
        queryClient.invalidateQueries(['document-entry-work'])
        // Update submission count
        if (response.submission_count) {
          setSubmissionCount(response.submission_count)
        }
        // Reset form
        setSelectedBuild(null)
        setWhtDocumentCount(0)
        setVatDocumentCount(0)
        setNonVatDocumentCount(0)
        setBots([])
        setSubmissionComment('')
        setReturnComment('')
        setExistingDocumentEntryWorkId(null)
        setExistingRecordSubmissionCount(null)
      },
      onError: (error: any) => {
        let errorMessage = 'ไม่สามารถสร้างงานคีย์เอกสารได้'

        // ตรวจสอบว่าเป็น network error หรือไม่
        if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend server รันอยู่หรือไม่'
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message
        }

        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: errorMessage,
          color: 'red',
          icon: <TbX size={16} />,
        })
      },
    }
  )

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Parameters<typeof documentEntryWorkService.update>[1] }) =>
      documentEntryWorkService.update(id, data),
    {
      onSuccess: () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'อัพเดทข้อมูลงานคีย์เอกสารสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        // Invalidate queries
        queryClient.invalidateQueries(['document-entry-work'])
        // Refetch existing data
        refetchExisting()
      },
      onError: (error: any) => {
        let errorMessage = 'ไม่สามารถอัพเดทข้อมูลงานคีย์เอกสารได้'

        // ตรวจสอบว่าเป็น network error หรือไม่
        if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend server รันอยู่หรือไม่'
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message
        }

        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: errorMessage,
          color: 'red',
          icon: <TbX size={16} />,
        })
      },
    }
  )

  // Fetch acknowledgment data when build is selected
  useQuery(
    ['monthly-tax-data', 'acknowledgment', pendingBuildId, currentTaxMonth.year, currentTaxMonth.month],
    () => {
      if (!pendingBuildId) return null
      return monthlyTaxDataService.getByBuildYearMonth(
        pendingBuildId,
        currentTaxMonth.year,
        currentTaxMonth.month
      )
    },
    {
      enabled: !!pendingBuildId,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => {
        // ⚠️ แสดง modal เฉพาะเมื่อมีข้อมูลความคิดเห็นต่างๆ
        // ถ้าไม่มีข้อมูล ให้ข้ามการยืนยันไปเลย
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

        // ตรวจสอบว่ามีข้อมูลความคิดเห็นหรือไม่
        const sections = record ? getSectionsWithData(record) : []
        if (sections.length > 0) {
          // มีข้อมูล → แสดง modal
          setAcknowledgmentSections(sections)
          setAcknowledgmentRecord(record)
          setAcknowledgmentOpened(true)
        } else {
          // ไม่มีข้อมูล → ยืนยันทันทีโดยไม่ต้องแสดง modal
          handleAcknowledgmentConfirm()
        }
      },
      onError: () => {
        // เกิด error → ยืนยันทันทีโดยไม่ต้องแสดง modal
        handleAcknowledgmentConfirm()
      },
    }
  )

  // Handle company selection - เลือกบริษัททันทีโดยไม่ต้องแสดง modal ยืนยัน
  const handleCompanyChange = useCallback((buildId: string, companyName?: string) => {
    // เลือกบริษัททันที
    setSelectedBuild(buildId)
    setSelectedCompanyName(companyName || null)
    setTaxRegistrationStatus(null) // Will be updated from API response
    setDocumentEntryResponsible(null) // Will be updated from API response
    // Reset form when company changes
    setWhtDocumentCount(0)
    setVatDocumentCount(0)
    setNonVatDocumentCount(0)
    setBots([])
    setSubmissionComment('')
    setReturnComment('')
    setExistingDocumentEntryWorkId(null)
    setExistingRecordSubmissionCount(null)
    setSubmissionCount(0) // Will be updated from API response
  }, [])

  // Handle acknowledgment confirm - หลังจากยืนยันแล้วค่อยตั้งค่า selectedBuild
  const handleAcknowledgmentConfirm = useCallback(() => {
    if (pendingBuildId) {
      setSelectedBuild(pendingBuildId)
      setSelectedCompanyName(pendingCompanyName || null)
      setTaxRegistrationStatus(null) // Will be updated from API response
      setDocumentEntryResponsible(null) // Will be updated from API response
      // Reset form when company changes
      setWhtDocumentCount(0)
      setVatDocumentCount(0)
      setNonVatDocumentCount(0)
      setBots([])
      setSubmissionComment('')
      setReturnComment('')
      setExistingDocumentEntryWorkId(null)
      setExistingRecordSubmissionCount(null)
      setSubmissionCount(0) // Will be updated from API response
    }
    setAcknowledgmentOpened(false)
    setPendingBuildId(undefined)
    setPendingCompanyName(undefined)
    setAcknowledgmentSections([])
    setAcknowledgmentRecord(null)
  }, [pendingBuildId, pendingCompanyName])

  // Handle clear company selection
  const handleClearSelection = useCallback(() => {
    setSelectedBuild(null)
    setSelectedCompanyName(null)
    setTaxRegistrationStatus(null)
    setDocumentEntryResponsible(null)
    // Reset form
    setWhtDocumentCount(0)
    setVatDocumentCount(0)
    setNonVatDocumentCount(0)
    setBots([])
    setSubmissionComment('')
    setReturnComment('')
    setExistingDocumentEntryWorkId(null)
    setExistingRecordSubmissionCount(null)
    setSubmissionCount(0)
  }, [])

  // Handle edit entry from submission history
  const handleEditEntry = useCallback(async (entry: DocumentEntryWork) => {
    // ตรวจสอบว่าสามารถแก้ไขได้หรือไม่ (สถานะทั้งหมดต้องเป็น "ยังไม่ดำเนินการ")
    const canEdit =
      (entry.wht_entry_status === null || entry.wht_entry_status === 'ยังไม่ดำเนินการ') &&
      (entry.vat_entry_status === null || entry.vat_entry_status === 'ยังไม่ดำเนินการ') &&
      (entry.non_vat_entry_status === null || entry.non_vat_entry_status === 'ยังไม่ดำเนินการ')

    if (!canEdit) {
      notifications.show({
        title: 'ไม่สามารถแก้ไขได้',
        message: 'สามารถแก้ไขได้เฉพาะเมื่อสถานะทั้งหมดเป็น "ยังไม่ดำเนินการ" เท่านั้น',
        color: 'orange',
        icon: <TbX size={16} />,
      })
      return
    }

    try {
      // ดึงข้อมูล bots สำหรับ entry นี้
      const entryDetail = await documentEntryWorkService.getById(entry.id)

      if (entryDetail?.data) {
        // โหลดข้อมูลเข้า form
        setWhtDocumentCount(entryDetail.data.wht_document_count || 0)
        setVatDocumentCount(entryDetail.data.vat_document_count || 0)
        setNonVatDocumentCount(entryDetail.data.non_vat_document_count || 0)
        setBots(entryDetail.bots || [])
        setSubmissionComment(entryDetail.data.submission_comment || '')
        setReturnComment(entryDetail.data.return_comment || '')
        setExistingDocumentEntryWorkId(entryDetail.data.id)
        setExistingRecordSubmissionCount(entryDetail.data.submission_count || null)
        // ไม่ต้องตั้งค่า submissionCount เพราะจะใช้ค่าจาก entry ที่กำลังแก้ไข
        // submissionCount จะถูกใช้เพื่อแสดง "ครั้งที่ X" ใน badge

        // Scroll to form section
        setTimeout(() => {
          const formSection = document.querySelector('[data-form-section]')
          if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)

        notifications.show({
          title: 'โหลดข้อมูลสำเร็จ',
          message: `กำลังแก้ไขข้อมูลครั้งที่ ${entry.submission_count}`,
          color: 'blue',
          icon: <TbCheck size={16} />,
        })
      }
    } catch (error) {
      console.error('Error loading entry for edit:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้',
        color: 'red',
        icon: <TbX size={16} />,
      })
    }
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!selectedBuild) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'กรุณาเลือกบริษัท',
        color: 'red',
        icon: <TbX size={16} />,
      })
      return
    }

    // ⚠️ สำคัญ: responsible_employee_id ต้องเป็น document_entry_responsible จาก monthly_tax_data
    // ไม่ใช่ employeeId (ผู้ทำบัญชี) ที่ login เข้ามา
    if (!documentEntryResponsible) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่พบข้อมูลพนักงานที่รับผิดชอบในการคีย์ กรุณาตรวจสอบข้อมูลบริษัท',
        color: 'red',
        icon: <TbX size={16} />,
      })
      return
    }

    const submitData = {
      build: selectedBuild,
      work_year: currentTaxMonth.year,
      work_month: currentTaxMonth.month,
      responsible_employee_id: documentEntryResponsible, // ใช้ document_entry_responsible แทน employeeId
      wht_document_count: whtDocumentCount,
      vat_document_count: vatDocumentCount,
      non_vat_document_count: nonVatDocumentCount,
      submission_comment: submissionComment || null,
      return_comment: returnComment || null,
      bots: bots.length > 0 ? bots : undefined,
    }

    // Logic การตัดสินใจว่าจะ update หรือ create:
    // 1. ถ้ามี existingDocumentEntryWorkId แสดงว่ากำลังแก้ไข entry ที่มีอยู่ → Update
    // 2. ถ้าไม่มี existingDocumentEntryWorkId → Create ใหม่
    // หมายเหตุ: การแก้ไข entry จาก submission history จะตั้งค่า existingDocumentEntryWorkId

    if (existingDocumentEntryWorkId) {
      // Update existing (เมื่อมีการแก้ไข entry ที่มีอยู่)
      updateMutation.mutate({
        id: existingDocumentEntryWorkId,
        data: submitData,
      })
    } else {
      // Create new (เมื่อไม่มี record - สร้างครั้งใหม่)
      // การส่งครั้งที่ 2, 3, ... จะสร้าง record ใหม่เสมอ ไม่ได้อัพเดทครั้งที่ 1
      createMutation.mutate(submitData)
    }
  }, [
    selectedBuild,
    documentEntryResponsible,
    currentTaxMonth.year,
    currentTaxMonth.month,
    whtDocumentCount,
    vatDocumentCount,
    nonVatDocumentCount,
    submissionComment,
    returnComment,
    bots,
    existingDocumentEntryWorkId,
    createMutation,
    updateMutation,
  ])

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Invalidate queries ทั้งหมดที่เกี่ยวข้อง (จะ trigger refetch อัตโนมัติ)
      await Promise.all([
        queryClient.invalidateQueries(['document-entry-work']),
        queryClient.invalidateQueries(['monthly-tax-data']),
      ])

      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเฟรชข้อมูลสำเร็จ',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    } catch (error) {
      console.error('Refresh error:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรชข้อมูลได้',
        color: 'red',
        icon: <TbX size={16} />,
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient])

  return (
    <Container fluid px="xl" py="md">
      <Stack gap="lg">
        {/* Header Section */}
        <Card
          bg="orange"
          radius="lg"
          p="md"
          style={{ borderTopLeftRadius: 'var(--mantine-radius-lg)', borderTopRightRadius: 'var(--mantine-radius-lg)' }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Text size="xl" fw={700} c="white">
                คัดแยกเอกสาร
              </Text>
              <Text size="sm" c="white" opacity={0.9}>
                คัดแยกข้อมูลเอกสารและส่งข้อมูลเข้าไปยัง document_entry_work
              </Text>
            </div>
            <Button
              variant="white"
              color="orange"
              leftSection={isRefreshing ? <TbLoader size={18} /> : <TbRefresh size={18} />}
              onClick={handleRefresh}
              disabled={isSubmitting || isRefreshing}
              loading={isRefreshing}
              radius="md"
            >
              รีเฟรชข้อมูล
            </Button>
          </Group>
        </Card>

        {/* Form Section */}
        <Paper withBorder p="lg" radius="md">
          <Stack gap="lg">
            {/* Summary Stats */}
            <SummaryStats year={currentTaxMonth.year} month={currentTaxMonth.month} onSelectCompany={handleCompanyChange} />

            {/* Company Selection */}
            <Stack gap="md">
              <Text size="lg" fw={600}>
                เลือกบริษัท
              </Text>
              <CompanyTable
                onSelectCompany={handleCompanyChange}
                selectedBuild={selectedBuild}
                disabled={isSubmitting}
              />
            </Stack>

            {/* Acknowledgment Modal (ก่อนเปิดฟอร์มเมื่อเลือกบริษัท) */}
            <AcknowledgmentModal
              opened={acknowledgmentOpened}
              onClose={() => {
                setAcknowledgmentOpened(false)
                setPendingBuildId(undefined)
                setPendingCompanyName(undefined)
                setAcknowledgmentSections([])
                setAcknowledgmentRecord(null)
              }}
              sectionsWithData={acknowledgmentSections}
              record={acknowledgmentRecord}
              onConfirm={handleAcknowledgmentConfirm}
            />

            {isLoadingExisting && selectedBuild ? (
              <LoadingSpinner />
            ) : selectedBuild ? (
              <>
                <Divider />

                {/* Clear Selection Button */}
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<TbX size={16} />}
                    onClick={handleClearSelection}
                    disabled={isSubmitting}
                    size="sm"
                  >
                    ปิด/ล้างการเลือกบริษัท
                  </Button>
                </Group>

                {/* ส่วนที่จะต้องกรอกข้อมูล — ไว้ด้านบนของประวัติการส่งข้อมูล */}
                {selectedBuild && !isLoadingExisting && (
                  <Group gap="xs" mb="md">
                    <Text size="sm" c="dimmed">
                      {existingDocumentEntryWorkId && existingRecordSubmissionCount !== null
                        ? 'กำลังแก้ไขข้อมูลการส่งงานคีย์ของบริษัท'
                        : 'การส่งงานคีย์ของบริษัท'}
                    </Text>
                    <Text size="sm" fw={600} c="orange">
                      {selectedCompanyName || selectedBuild}
                    </Text>
                    <Text size="sm" c="dimmed">
                      ครั้งที่
                    </Text>
                    <SubmissionCountBadge
                      submissionCount={
                        existingDocumentEntryWorkId && existingRecordSubmissionCount !== null
                          ? existingRecordSubmissionCount
                          : (submissionCount || 0) + 1
                      }
                    />
                  </Group>
                )}

                <div data-form-section>
                  <DocumentKeyingSection
                    whtDocumentCount={whtDocumentCount}
                    vatDocumentCount={vatDocumentCount}
                    nonVatDocumentCount={nonVatDocumentCount}
                    onWhtChange={(val) => setWhtDocumentCount(typeof val === 'number' ? val : 0)}
                    onVatChange={(val) => setVatDocumentCount(typeof val === 'number' ? val : 0)}
                    onNonVatChange={(val) => setNonVatDocumentCount(typeof val === 'number' ? val : 0)}
                    disabled={isSubmitting}
                    vatDisabled={!isVatAllowed}
                  />

                  <Divider />

                  <BotSubmissionSection bots={bots} onChange={setBots} disabled={isSubmitting} />

                  <Divider />

                  <CommentsSection
                    submissionComment={submissionComment}
                    returnComment={returnComment}
                    onSubmissionCommentChange={setSubmissionComment}
                    onReturnCommentChange={setReturnComment}
                    disabled={isSubmitting}
                  />

                  <Divider />

                  <Group justify="flex-end">
                    <Button
                      onClick={handleSubmit}
                      loading={isSubmitting}
                      leftSection={isSubmitting ? <TbLoader size={16} /> : <TbCheck size={16} />}
                      size="md"
                    >
                      {existingDocumentEntryWorkId ? 'อัพเดทข้อมูล' : 'เริ่มต้นการคัดแยกเอกสาร'}
                    </Button>
                  </Group>
                </div>

                <Divider />

                {/* ประวัติการส่งข้อมูลก่อนหน้านี้ */}
                <SubmissionHistory
                  build={selectedBuild}
                  year={currentTaxMonth.year}
                  month={currentTaxMonth.month}
                  onEditEntry={handleEditEntry}
                />
              </>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                กรุณาเลือกบริษัทเพื่อเริ่มต้นการคัดแยกเอกสาร
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
