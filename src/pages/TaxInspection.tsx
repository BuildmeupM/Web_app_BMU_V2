import { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Stack, Group, Text, Card } from '@mantine/core'
import { TbQuestionMark, TbBell, TbRefresh, TbCheck } from 'react-icons/tb'
import { useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../store/authStore'
import SummaryCard from '../components/TaxInspection/SummaryCard'
import FilterSection, { FilterValues } from '../components/shared/FilterSection'
import TaxInspectionTable from '../components/TaxInspection/TaxInspectionTable'
import PaginationSection from '../components/TaxInspection/PaginationSection'
import LoadingSpinner from '../components/Loading/LoadingSpinner'
import AcknowledgmentModal from '../components/TaxInspection/AcknowledgmentModal'
import { hasAcknowledgmentData, getSectionsWithData } from '../utils/taxAcknowledgmentUtils'
import type { RecordWithAcknowledgmentFields } from '../utils/taxAcknowledgmentUtils'

// ✅ Performance Optimization: Lazy load TaxInspectionForm (4115 lines) เพื่อลด initial bundle size
const TaxInspectionForm = lazy(() => import('../components/TaxInspection/TaxInspectionForm'))

// ⏱️ Auto-refresh threshold: 3 minutes (180 seconds)
const AUTO_REFRESH_THRESHOLD_SECONDS = 180

export default function TaxInspection() {
  // ✅ BUG-168: ใช้ useLocation เพื่อ track route changes และใช้ key prop
  const location = useLocation()
  const { user, _hasHydrated } = useAuthStore()
  const queryClient = useQueryClient()
  const [formOpened, setFormOpened] = useState(false)
  const [selectedBuildId, setSelectedBuildId] = useState<string | undefined>()
  const [acknowledgmentOpened, setAcknowledgmentOpened] = useState(false)
  const [pendingBuildId, setPendingBuildId] = useState<string | undefined>()
  const [acknowledgmentSections, setAcknowledgmentSections] = useState<string[]>([])
  const [acknowledgmentRecord, setAcknowledgmentRecord] = useState<RecordWithAcknowledgmentFields | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState<string>('build')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<FilterValues>({
    filterType: 'build',
    filterMode: 'all',
    searchValue: '',
    dateFrom: null,
    dateTo: null,
    whtStatus: [],
    pp30Status: [],
    pp30PaymentStatus: [],
  })

  // ⏱️ Track last update time for auto-refresh feature
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const autoRefreshTriggeredRef = useRef(false)
  const lastUpdateTimeRef = useRef<Date>(new Date())
  const isRefreshingRef = useRef(false)

  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Get employee_id from logged-in user (for tax_inspection_responsible filter)
  const employeeId = user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component render และ query ทำงานหรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxInspection] Component mounted/updated:', {
        hasUser: !!user,
        userRole: user?.role,
        employeeId,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, employeeId, _hasHydrated])

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  // (Left empty: no longer need currentTaxMonth for fetching in the parent wrapper unless it's sent to children, but TaxInspectionTable handles it internally anyway)

  // Handle pagination change from TaxInspectionTable
  // ⚠️ สำคัญ: อัพเดทเฉพาะ total และ totalPages เท่านั้น
  // ไม่ต้องอัพเดท page และ limit เพราะผู้ใช้อาจจะเปลี่ยนเองผ่าน PaginationSection
  const handlePaginationChange = useCallback((pagination: { total: number; totalPages: number; page: number; limit: number }) => {
    setTotalItems(pagination.total)
    setTotalPages(pagination.totalPages)
  }, [])

  const handleSelectCompany = (record: { build: string } & RecordWithAcknowledgmentFields) => {
    // ⚠️ แสดง acknowledgment modal เฉพาะเมื่อมีข้อมูล สอบถาม/ตอบกลับ (inquiry) เท่านั้น
    // ไม่ตรวจ ส่งงาน/ตอบกลับ (submission)
    if (hasAcknowledgmentData(record, 'inquiry')) {
      setPendingBuildId(record.build)
      setAcknowledgmentSections(getSectionsWithData(record, 'inquiry'))
      setAcknowledgmentRecord(record)
      setAcknowledgmentOpened(true)
    } else {
      // ไม่มีข้อมูลสอบถาม/ตอบกลับ → เปิดฟอร์มตรงเลย
      setSelectedBuildId(record.build)
      setFormOpened(true)
    }
  }

  const handleAcknowledgmentConfirm = () => {
    if (pendingBuildId) {
      setSelectedBuildId(pendingBuildId)
      setFormOpened(true)
    }
    setAcknowledgmentOpened(false)
    setPendingBuildId(undefined)
    setAcknowledgmentSections([])
    setAcknowledgmentRecord(null)
  }

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
    
    // ตั้งค่าเรียงลำดับใหม่เมื่อเลือกประเภทวันที่ (ให้เรียงตามวันที่ขึ้นก่อน - น้อยไปมาก)
    if (newFilters.filterType === 'date') {
      const dateSortCol = newFilters.filterMode === 'vat' ? 'pp30_sent_for_review_date' : 'pnd_sent_for_review_date';
      setSortBy(dateSortCol)
      setSortOrder('asc')
    }
  }, [])

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1) // Reset to first page when sort changes
  }

  // Handle refresh from FilterSection - ใช้ queryClient.refetchQueries โดยตรง
  // ทำแบบ staggered (list ก่อน แล้วค่อย summary) เพื่อลด burst request และโอกาสโดน 429
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)

    // แสดง notification ว่ากำลังโหลด
    const loadingNotificationId = notifications.show({
      id: 'refresh-loading',
      title: 'กำลังรีเฟรชข้อมูล',
      message: 'กำลังดึงข้อมูลล่าสุดจาก server...',
      color: 'blue',
      icon: <TbRefresh size={16} />,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    })

    try {
      // ✅ Performance: invalidateQueries กับ refetchActive: true จะ trigger refetch อัตโนมัติ
      // ไม่ต้องเรียก refetchQueries ซ้ำ
      await queryClient.invalidateQueries(['monthly-tax-data', 'tax-inspection'], { exact: false, refetchActive: true })
      await queryClient.invalidateQueries(['monthly-tax-data-summary', 'tax-inspection'], { exact: false, refetchActive: true })

      // ⏱️ Reset last update time after successful refresh
      const newUpdateTime = new Date()
      setLastUpdateTime(newUpdateTime)
      lastUpdateTimeRef.current = newUpdateTime
      setElapsedSeconds(0)
      autoRefreshTriggeredRef.current = false

      // ปิด loading notification และแสดง success notification
      notifications.update({
        id: loadingNotificationId,
        title: 'รีเฟรชข้อมูลสำเร็จ',
        message: 'อัพเดทข้อมูลล่าสุดเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
        loading: false,
        autoClose: 3000,
        withCloseButton: true,
      })
    } catch (error) {
      console.error('Refresh error:', error)

      // ปิด loading notification และแสดง error notification
      notifications.update({
        id: loadingNotificationId,
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรชข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        color: 'red',
        icon: <TbBell size={16} />,
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      })
    } finally {
      setIsRefreshing(false)
      isRefreshingRef.current = false
    }
  }, [queryClient])

  // ⏱️ Update isRefreshing ref when state changes
  useEffect(() => {
    isRefreshingRef.current = isRefreshing
  }, [isRefreshing])

  // ⏱️ Timer effect: Update elapsed time every second and auto-refresh after 3 minutes
  useEffect(() => {
    // Reset timer when component mounts or lastUpdateTime changes
    const newUpdateTime = new Date()
    setLastUpdateTime(newUpdateTime)
    lastUpdateTimeRef.current = newUpdateTime
    setElapsedSeconds(0)
    autoRefreshTriggeredRef.current = false

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - lastUpdateTimeRef.current.getTime()) / 1000)
      setElapsedSeconds(elapsed)

      // Auto-refresh when 3 minutes (180 seconds) have passed
      if (elapsed >= AUTO_REFRESH_THRESHOLD_SECONDS && !autoRefreshTriggeredRef.current && !isRefreshingRef.current) {
        autoRefreshTriggeredRef.current = true
        handleRefresh()
      }
    }, 10000) // ✅ Performance: อัพเดททุก 10 วินาที (แทน 1 วินาที) ลด re-render 90%

    return () => clearInterval(interval)
  }, [lastUpdateTime, handleRefresh])

  // ⏱️ Format elapsed time for display
  const formatUpdateTime = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Format elapsed time
    let elapsedText = ''
    if (elapsedSeconds < 60) {
      elapsedText = `${elapsedSeconds} วินาที`
    } else if (elapsedSeconds < 3600) {
      const minutes = Math.floor(elapsedSeconds / 60)
      const seconds = elapsedSeconds % 60
      elapsedText = `${minutes} นาที${seconds > 0 ? ` ${seconds} วินาที` : ''}`
    } else {
      const hours = Math.floor(elapsedSeconds / 3600)
      const minutes = Math.floor((elapsedSeconds % 3600) / 60)
      elapsedText = `${hours} ชั่วโมง${minutes > 0 ? ` ${minutes} นาที` : ''}`
    }

    return `อัพเดทเมื่อ ${elapsedText}ที่แล้ว (${dateStr} ${timeStr})`
  }

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
          <Group justify="space-between">
            <Text fw={700} size="xl" c="white">
              รายการตรวจภาษี
            </Text>
            <Group gap="xs">
              <TbQuestionMark size={20} color="white" style={{ cursor: 'pointer' }} />
              <TbBell size={20} color="white" style={{ cursor: 'pointer' }} />
              <Text size="sm" c="white">
                {formatUpdateTime()}
              </Text>
            </Group>
          </Group>
        </Card>

        {/* Summary Card */}
        {/* ✅ BUG-168: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน (ใช้ location.key เพื่อให้เปลี่ยนทุกครั้งที่ navigate) */}
        <SummaryCard key={`tax-inspection-summary-${location?.key || 'default'}`} />

        {/* Filter Section */}
        <FilterSection onFilterChange={handleFilterChange} onRefresh={handleRefresh} isRefreshing={isRefreshing} />

        {/* Table */}
        {/* ✅ BUG-168: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน (ใช้ location.key เพื่อให้เปลี่ยนทุกครั้งที่ navigate) */}
        <TaxInspectionTable
          key={`tax-inspection-table-${location?.key || 'default'}`}
          onSelectCompany={handleSelectCompany}
          filters={filters}
          page={currentPage}
          limit={itemsPerPage}
          onPaginationChange={handlePaginationChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          isDateFilterActive={filters.filterType === 'date'}
        />

        {/* Pagination */}
        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />

        {/* Acknowledgment Modal (ก่อนเปิดฟอร์มเมื่อมีข้อมูลสอบถาม/ส่งงาน) */}
        <AcknowledgmentModal
          opened={acknowledgmentOpened}
          onClose={() => {
            setAcknowledgmentOpened(false)
            setPendingBuildId(undefined)
            setAcknowledgmentSections([])
            setAcknowledgmentRecord(null)
          }}
          sectionsWithData={acknowledgmentSections}
          record={acknowledgmentRecord}
          filter="inquiry"
          onConfirm={handleAcknowledgmentConfirm}
        />

        {/* Form Modal */}
        <Suspense fallback={<LoadingSpinner />}>
          <TaxInspectionForm
            opened={formOpened}
            onClose={() => {
              setFormOpened(false)
              setSelectedBuildId(undefined)
            }}
            buildId={selectedBuildId}
            readOnlyGeneralInfo={true}
            sourcePage="taxInspection"
          />
        </Suspense>
      </Stack>
    </Container>
  )
}
