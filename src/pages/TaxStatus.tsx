import { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Stack, Group, Text, Card } from '@mantine/core'
import { TbQuestionMark, TbBell, TbRefresh, TbCheck } from 'react-icons/tb'
import { useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../store/authStore'
import SummaryCard from '../components/TaxStatus/SummaryCard'
import FilterSection, { FilterValues } from '../components/shared/FilterSection'
import TaxStatusTable from '../components/TaxStatus/TaxStatusTable'
import PaginationSection from '../components/TaxStatus/PaginationSection'
import LoadingSpinner from '../components/Loading/LoadingSpinner'
import AcknowledgmentModal from '../components/TaxInspection/AcknowledgmentModal'
import { hasAcknowledgmentData, getSectionsWithData } from '../utils/taxAcknowledgmentUtils'
import type { RecordWithAcknowledgmentFields } from '../utils/taxAcknowledgmentUtils'

// ✅ Performance Optimization: Lazy load TaxInspectionForm (4115 lines) เพื่อลด initial bundle size
const TaxInspectionForm = lazy(() => import('../components/TaxInspection/TaxInspectionForm'))

// ⏱️ Auto-refresh threshold: 3 minutes (180 seconds)
const AUTO_REFRESH_THRESHOLD_SECONDS = 180

export default function TaxStatus() {
  // ✅ BUG-167: ใช้ useLocation เพื่อ track route changes
  const location = useLocation()

  // ✅ BUG-167: Log component mount/unmount เพื่อ debug
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxStatus] Component mounted', { pathname: location.pathname, key: location.key })
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('[TaxStatus] Component unmounted', { pathname: location.pathname, key: location.key })
      }
    }
  }, [location.pathname, location.key])

  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [formOpened, setFormOpened] = useState(false)
  const [selectedBuildId, setSelectedBuildId] = useState<string | undefined>()
  const [acknowledgmentOpened, setAcknowledgmentOpened] = useState(false)
  const [pendingBuildId, setPendingBuildId] = useState<string | undefined>()
  const [acknowledgmentSections, setAcknowledgmentSections] = useState<string[]>([])
  const [acknowledgmentRecord, setAcknowledgmentRecord] = useState<RecordWithAcknowledgmentFields | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
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

  // Get employee_id from logged-in user (for accounting_responsible filter)
  const employeeId = user?.employee_id || null

  // Handle pagination change from TaxStatusTable
  // ⚠️ สำคัญ: อัพเดทเฉพาะ total และ totalPages เท่านั้น
  // ไม่ต้องอัพเดท page และ limit เพราะผู้ใช้อาจจะเปลี่ยนเองผ่าน PaginationSection
  const handlePaginationChange = (pagination: { total: number; totalPages: number; page: number; limit: number }) => {
    setTotalItems(pagination.total)
    setTotalPages(pagination.totalPages)
    // ไม่ต้องอัพเดท currentPage และ itemsPerPage เพราะผู้ใช้อาจจะเปลี่ยนเอง
    // setCurrentPage(pagination.page)
    // setItemsPerPage(pagination.limit)
  }

  const handleSelectCompany = useCallback((record: { build: string } & RecordWithAcknowledgmentFields) => {
    // ⚠️ แสดง acknowledgment modal เฉพาะเมื่อมีข้อมูลความคิดเห็นต่างๆ
    // ถ้าไม่มีข้อมูล ให้เปิดฟอร์มตรงเลยโดยไม่ต้องยืนยัน
    if (hasAcknowledgmentData(record)) {
      setPendingBuildId(record.build)
      setAcknowledgmentSections(getSectionsWithData(record))
      setAcknowledgmentRecord(record)
      setAcknowledgmentOpened(true)
    } else {
      // ไม่มีข้อมูลความคิดเห็น → เปิดฟอร์มตรงเลย
      setSelectedBuildId(record.build)
      setFormOpened(true)
    }
  }, [])

  const handleAcknowledgmentConfirm = useCallback(() => {
    if (pendingBuildId) {
      setSelectedBuildId(pendingBuildId)
      setFormOpened(true)
    }
    setAcknowledgmentOpened(false)
    setPendingBuildId(undefined)
    setAcknowledgmentSections([])
    setAcknowledgmentRecord(null)
  }, [pendingBuildId])

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
      // ⚠️ สำคัญ: Invalidate cache ทั้งหมดที่เกี่ยวข้องกับ tax-status เพื่อบังคับให้ refetch แม้ว่า cache จะยังไม่ stale
      // ใช้ exact: false เพื่อ invalidate ทุก queries ที่ขึ้นต้นด้วย ['monthly-tax-data', 'tax-status']
      if (import.meta.env.DEV) {
        const listQueriesBefore = queryClient.getQueriesData({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
        const summaryQueriesBefore = queryClient.getQueriesData({ queryKey: ['monthly-tax-data-summary', 'tax-status'], exact: false })
        console.log('[TaxStatus] Before invalidate:', {
          listQueriesCount: listQueriesBefore.length,
          summaryQueriesCount: summaryQueriesBefore.length,
          listQueryKeys: listQueriesBefore.map(([key]) => key),
        })
      }

      // ✅ Performance: invalidateQueries กับ refetchActive: true จะ trigger refetch อัตโนมัติ
      // ไม่ต้องเรียก refetchQueries ซ้ำ และไม่ต้อง delay
      // ✅ ใช้ react-query v3 syntax (ไม่ใช้ object-based v5 syntax)
      await queryClient.invalidateQueries(['monthly-tax-data', 'tax-status'], { exact: false, refetchActive: true })
      await queryClient.invalidateQueries(['monthly-tax-data-summary', 'tax-status'], { exact: false, refetchActive: true })

      if (import.meta.env.DEV) {
        const listQueriesAfter = queryClient.getQueriesData({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
        console.log('[TaxStatus] After refetch:', {
          listQueriesCount: listQueriesAfter.length,
          listQueryKeys: listQueriesAfter.map(([key]) => key),
        })
      }

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

  // ✅ BUG-167: Cleanup effect เพื่อ reset state และ cleanup resources เมื่อ component unmount
  useEffect(() => {
    return () => {
      // Cleanup เมื่อ component unmount
      autoRefreshTriggeredRef.current = false
      isRefreshingRef.current = false
      // Reset state เพื่อป้องกัน memory leaks
      setElapsedSeconds(0)
      setIsRefreshing(false)
    }
  }, [])

  // ✅ BUG-167: ใช้ ref เพื่อเก็บ handleRefresh function เพื่อหลีกเลี่ยง dependency ใน useEffect
  const handleRefreshRef = useRef(handleRefresh)
  useEffect(() => {
    handleRefreshRef.current = handleRefresh
  }, [handleRefresh])

  // ⏱️ Timer effect: Update elapsed time every second and auto-refresh after 3 minutes
  // ✅ BUG-167: แยก useEffect เพื่อหลีกเลี่ยง dependency ที่อาจทำให้ component ไม่ unmount อย่างถูกต้อง
  useEffect(() => {
    // Reset timer when component mounts
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
      // ✅ BUG-167: ใช้ handleRefreshRef.current แทน handleRefresh เพื่อหลีกเลี่ยง dependency
      if (elapsed >= AUTO_REFRESH_THRESHOLD_SECONDS && !autoRefreshTriggeredRef.current && !isRefreshingRef.current) {
        autoRefreshTriggeredRef.current = true
        handleRefreshRef.current()
      }
    }, 10000) // ✅ Performance: อัพเดททุก 10 วินาที (แทน 1 วินาที) ลด re-render 90%

    // ✅ BUG-167: Cleanup function เพื่อ clear interval เมื่อ component unmount
    return () => {
      clearInterval(interval)
      // Reset refs เพื่อป้องกัน memory leaks
      autoRefreshTriggeredRef.current = false
      isRefreshingRef.current = false
    }
  }, []) // ✅ BUG-167: ไม่มี dependency เพื่อให้ effect run เพียงครั้งเดียวเมื่อ component mount

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
              สถานะยื่นภาษี
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
        <SummaryCard />

        {/* Filter Section */}
        <FilterSection onFilterChange={(newFilters: FilterValues) => {
          setFilters(newFilters)
          setCurrentPage(1)
          // Reset sort when switching to date filter (date sorting conflicts with column sort)
          if (newFilters.filterType === 'date') {
            setSortBy('build')
            setSortOrder('asc')
          }
        }} onRefresh={handleRefresh} isRefreshing={isRefreshing} />

        {/* Table */}
        {/* ✅ BUG-167: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน */}
        <TaxStatusTable
          key={`tax-status-table-${location?.pathname || 'default'}`}
          onSelectCompany={handleSelectCompany}
          accounting_responsible={employeeId || undefined}
          page={currentPage}
          limit={itemsPerPage}
          onPaginationChange={handlePaginationChange}
          filters={filters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field: string) => {
            if (sortBy === field) {
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
            } else {
              setSortBy(field)
              setSortOrder('asc')
            }
            setCurrentPage(1)
          }}
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
            sourcePage="taxStatus"
          />
        </Suspense>
      </Stack>
    </Container>
  )
}
