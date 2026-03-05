import { Table, Badge, Button, Text, Card, Loader, Center, Alert, Group } from '@mantine/core'
import { TbFileText, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useEffect, useMemo, memo } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import { derivePp30Status } from '../../utils/pp30StatusUtils'
import monthlyTaxDataService, { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { formatDateTimeNoConversion } from '../../utils/dateTimeUtils'

dayjs.extend(buddhistEra)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('th')

// Helper function to format employee name (first_name + nick_name)
const formatEmployeeName = (firstName: string | null | undefined, nickName: string | null | undefined): string => {
  if (!firstName) return '-'
  const name = firstName.trim()
  const nick = nickName?.trim()
  return nick ? `${name}(${nick})` : name
}

// Helper function to format text with highlight for labels
const formatTextWithHighlight = (text: string) => {
  // Labels to highlight
  const labels = [
    'ผู้ตรวจภาษี:',
    'ผู้ทำบัญชี:',
  ]

  // Split by newlines and process each line
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, index) => {
        // Remove bullet point and leading whitespace for matching
        const trimmedLine = line.trim()
        const hasBullet = trimmedLine.startsWith('•')
        const lineWithoutBullet = hasBullet ? trimmedLine.substring(1).trim() : trimmedLine

        // Check if line contains any label (not necessarily at the start)
        const matchedLabel = labels.find(label => lineWithoutBullet.startsWith(label))

        if (matchedLabel) {
          const labelLength = matchedLabel.length
          const label = lineWithoutBullet.substring(0, labelLength)
          const value = lineWithoutBullet.substring(labelLength).trim()

          return (
            <div key={index} style={{ marginBottom: index < lines.length - 1 ? '4px' : '0' }}>
              {hasBullet && (
                <Text component="span" size="sm" c="dark" style={{ marginRight: '4px' }}>
                  •
                </Text>
              )}
              <Text component="span" size="sm" fw={700} c="#ff6b35">
                {label}
              </Text>
              {value && (
                <Text component="span" size="sm" c="dark">
                  {' '}{value}
                </Text>
              )}
            </div>
          )
        }

        // If no label match, return as is
        return (
          <div key={index} style={{ marginBottom: index < lines.length - 1 ? '4px' : '0' }}>
            <Text size="sm" c="dark">{line}</Text>
          </div>
        )
      })}
    </>
  )
}

interface TaxFilingRecord {
  id: string
  build: string
  companyName: string
  pndReviewReturnedDate: string | null
  wht_inquiry?: string | null
  wht_response?: string | null
  wht_submission_comment?: string | null
  wht_filing_response?: string | null
  pp30_inquiry?: string | null
  pp30_response?: string | null
  pp30_submission_comment?: string | null
  pp30_filing_response?: string | null
  pndStatus:
  | 'received_receipt'
  | 'paid'
  | 'sent_to_customer'
  | 'draft_completed'
  | 'passed'
  | 'pending_review'
  | 'pending_recheck'
  | 'draft_ready'
  | 'needs_correction'
  | 'inquire_customer'
  | 'additional_review'
  | 'not_started'
  | null
  pp30ReviewReturnedDate: string | null
  pp30Status:
  | 'received_receipt'
  | 'paid'
  | 'sent_to_customer'
  | 'draft_completed'
  | 'passed'
  | 'pending_review'
  | 'pending_recheck'
  | 'draft_ready'
  | 'needs_correction'
  | 'inquire_customer'
  | 'additional_review'
  | 'not_submitted'
  | 'not_started'
  | null
  pp30PaymentStatus?: string | null // 'has_payment' | 'no_payment'
  pp30PaymentAmount?: number | null // จำนวนยอดชำระ ภ.พ.30
  performer: string
}

interface TaxFilingTableProps {
  onSelectCompany?: (record: TaxFilingRecord) => void
  wht_filer_employee_id?: string
  vat_filer_employee_id?: string
  filters?: {
    filterMode?: 'all' | 'wht' | 'vat'
    whtStatus?: string[]
    pp30Status?: string[]
    pp30PaymentStatus?: string[]
    dateFrom?: string
    dateTo?: string
  }
  page?: number
  limit?: number
  onPaginationChange?: (pagination: { total: number; totalPages: number; page: number; limit: number }) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string) => void
}

// สีสำหรับแต่ละสถานะ
// ⚠️ สำคัญ: ใช้สีเดียวกันกับ TaxInspectionForm เพื่อให้การแสดงผลสอดคล้องกัน
const getStatusColor = (status: string | null): string => {
  if (!status) return '#808080'
  switch (status) {
    case 'received_receipt':
      return '#4facfe' // Blue
    case 'paid':
      return '#ffc107' // Yellow
    case 'sent_to_customer':
      return '#81d4fa' // Light Blue
    case 'draft_completed':
      return '#ffb74d' // Light Orange (ตรงกับ TaxInspectionForm)
    case 'passed':
      return '#4caf50' // Green
    case 'pending_review':
      return '#ff6b35' // Orange
    case 'pending_recheck':
      return '#f44336' // Red
    case 'draft_ready':
      return '#f8bbd9' // Soft Pink
    case 'needs_correction':
      return '#f44336' // Red
    case 'edit':
      return '#f44336' // Red
    case 'inquire_customer':
      return '#9c27b0' // Purple
    case 'additional_review':
      return '#81d4fa' // Light Blue
    case 'not_submitted':
      return '#000000' // Black (ตรงกับ TaxInspectionForm)
    case 'not_started':
      return '#808080' // Gray
    default:
      return '#808080'
  }
}

const getStatusLabel = (status: string | null): string => {
  if (!status) return 'สถานะยังไม่ดำเนินการ'
  switch (status) {
    case 'received_receipt':
      return 'รับใบเสร็จ'
    case 'paid':
      return 'ชำระแล้ว'
    case 'sent_to_customer':
      return 'ส่งลูกค้าแล้ว'
    case 'draft_completed':
      return 'ร่างแบบเสร็จแล้ว'
    case 'passed':
      return 'ผ่าน'
    case 'pending_review':
      return 'รอตรวจ'
    case 'pending_recheck':
      return 'รอตรวจอีกครั้ง'
    case 'draft_ready':
      return 'ร่างแบบได้'
    case 'needs_correction':
      return 'แก้ไข'
    case 'edit':
      return 'แก้ไข'
    case 'inquire_customer':
      return 'สอบถามลูกค้าเพิ่มเติม'
    case 'additional_review':
      return 'ตรวจสอบเพิ่มเติม'
    case 'not_submitted':
      return 'ไม่มียื่น'
    case 'not_started':
      return 'สถานะยังไม่ดำเนินการ'
    default:
      return status
  }
}

const TaxFilingTable = memo(function TaxFilingTable({
  onSelectCompany,
  wht_filer_employee_id,
  vat_filer_employee_id,
  filters,
  page = 1,
  limit = 20,
  onPaginationChange,
  sortBy = 'build',
  sortOrder = 'asc',
  onSortChange,
}: TaxFilingTableProps) {
  const { user, _hasHydrated } = useAuthStore()
  // Use provided wht_filer_employee_id or vat_filer_employee_id, or fallback to current user's employee_id
  const employeeId = wht_filer_employee_id || vat_filer_employee_id || user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component mount/unmount หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxFilingTable] Component MOUNTED:', {
        hasUser: !!user,
        employeeId,
        wht_filer_employee_id,
        vat_filer_employee_id,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('[TaxFilingTable] Component UNMOUNTED:', {
          timestamp: new Date().toISOString(),
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array เพื่อให้ run เพียงครั้งเดียวเมื่อ mount

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component update หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxFilingTable] Component updated:', {
        hasUser: !!user,
        employeeId,
        wht_filer_employee_id,
        vat_filer_employee_id,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, employeeId, wht_filer_employee_id, vat_filer_employee_id, _hasHydrated])

  // 🔌 WebSocket: Subscribe to real-time updates
  useRealtimeUpdates(employeeId)

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch monthly tax data from API - filter by wht_filer_employee_id and/or vat_filer_employee_id and tax month
  // Backend uses OR logic: shows records where user is responsible for WHT OR VAT OR both
  const {
    data: taxDataResponse,
    isLoading,
    error,
  } = useQuery(
    ['monthly-tax-data', 'tax-filing', page, limit, wht_filer_employee_id, vat_filer_employee_id, currentTaxMonth.year, currentTaxMonth.month, filters?.whtStatus, filters?.pp30Status, filters?.pp30PaymentStatus, sortBy, sortOrder],
    () =>
      monthlyTaxDataService.getList({
        page,
        limit,
        year: currentTaxMonth.year.toString(),
        month: currentTaxMonth.month.toString(),
        wht_filer_employee_id: wht_filer_employee_id || undefined,
        vat_filer_employee_id: vat_filer_employee_id || undefined,
        // ✅ Server-side status filtering
        pnd_status: filters?.whtStatus?.length ? filters.whtStatus.join(',') : undefined,
        pp30_status: filters?.pp30Status?.length ? filters.pp30Status.join(',') : undefined,
        pp30_payment_status: filters?.pp30PaymentStatus?.length ? filters.pp30PaymentStatus.join(',') : undefined,
        dateFrom: filters?.dateFrom || undefined,
        dateTo: filters?.dateTo || undefined,
        filterMode: filters?.filterMode || undefined,
        sortBy,
        sortOrder,
      }),
    {
      keepPreviousData: true,
      enabled: !!(wht_filer_employee_id || vat_filer_employee_id || employeeId) && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      // ✅ Performance Optimization: Cache 30 seconds เพื่อลด API calls (ข้อมูลจะยังถูก invalidate เมื่อบันทึกหรือ WebSocket update)
      staleTime: 30 * 1000, // Cache 30 seconds (แทน 0) - ลด API calls 70-80%
      refetchOnWindowFocus: false, // ปิดการ refetch อัตโนมัติเมื่อ focus window เพื่อลด requests
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น (แก้ปัญหาไม่แสดงข้อมูล)
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      retry: (failureCount: number, error: unknown) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        const err = error as { response?: { status?: number } }
        if (err?.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
      // ✅ BUG-168: Debug logging ใน query callbacks
      onSuccess: (data) => {
        if (import.meta.env.DEV) {
          console.log('[TaxFilingTable] Query SUCCESS:', {
            dataLength: data?.data?.length || 0,
            total: data?.pagination?.total || 0,
            timestamp: new Date().toISOString(),
          })
        }
      },
      onError: (err: unknown) => {
        if (import.meta.env.DEV) {
          console.error('[TaxFilingTable] Query ERROR:', {
            error: (err as Error)?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          })
        }
      },
    }
  )

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า query ทำงานหรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxFilingTable] Query state:', {
        enabled: !!(wht_filer_employee_id || vat_filer_employee_id || employeeId) && _hasHydrated,
        isLoading,
        hasData: !!taxDataResponse,
        dataLength: taxDataResponse?.data?.length || 0,
        error: error ? (error as Error)?.message || 'Unknown error' : null,
        timestamp: new Date().toISOString(),
      })
    }
  }, [wht_filer_employee_id, vat_filer_employee_id, employeeId, _hasHydrated, isLoading, taxDataResponse, error])

  // Send pagination data to parent component when data changes
  useEffect(() => {
    if (taxDataResponse?.pagination && onPaginationChange) {
      onPaginationChange({
        total: taxDataResponse.pagination.total,
        totalPages: taxDataResponse.pagination.totalPages,
        page: taxDataResponse.pagination.page,
        limit: taxDataResponse.pagination.limit,
      })
    }
  }, [taxDataResponse?.pagination, onPaginationChange])

  // Transform API data to table format
  // ⚠️ สำคัญ: ใช้ useMemo เพื่อ memoize การ derive status และลดการ re-render ที่ไม่จำเป็น
  const tableData: TaxFilingRecord[] = useMemo(() => {
    if (!taxDataResponse?.data) return []

    return taxDataResponse.data.map((item: MonthlyTaxData) => {
      // Format dates: ใช้ฟังก์ชันเดียวกับ TaxInspectionForm เพื่อให้การแสดงผลสอดคล้องกัน
      // ⚠️ สำคัญ: Backend ส่งข้อมูลมาเป็น format 'YYYY-MM-DD HH:mm:ss' ซึ่งเป็นเวลาไทยแล้ว (ไม่ใช่ UTC)
      // ดังนั้นไม่ต้องแปลง timezone แต่แปลง format จาก 'YYYY-MM-DD HH:mm:ss' เป็น 'DD/MM/YYYY HH:mm' เท่านั้น
      const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null
        // ใช้ formatDateTimeNoConversion เพื่อแปลง format โดยไม่แปลง timezone (เหมือน TaxInspectionForm)
        const formatted = formatDateTimeNoConversion(dateStr, 'DD/MM/YYYY HH:mm')
        return formatted || null
      }

      // Determine pnd_status from pnd_status field or other fields (เหมือน pp30_status)
      // ⚠️ สำคัญ: ใช้ pnd_status จากฐานข้อมูลเป็นหลัก แต่ถ้าเป็น null ให้ map จาก fields อื่นๆ
      let pndStatus: TaxFilingRecord['pndStatus'] = (item.pnd_status as TaxFilingRecord['pndStatus']) || null

      // ถ้า pnd_status เป็น null หรือว่าง ให้ map จาก fields อื่นๆ
      if (!pndStatus || pndStatus.trim() === '') {
        // Map จาก fields ตามลำดับความสำคัญ (เหมือน pp30_status)
        if (item.wht_filing_response) {
          pndStatus = 'paid' // ถ้ามี filing response แสดงว่าชำระแล้ว
        } else if (item.pnd_sent_to_customer_date) {
          pndStatus = 'sent_to_customer' // ถ้ามีวันที่ส่งลูกค้า แสดงว่าส่งลูกค้าแล้ว
        } else if (item.pnd_review_returned_date) {
          pndStatus = 'pending_recheck' // ถ้ามี review_returned_date แสดงว่ารอตรวจอีกครั้ง
        } else if (item.pnd_sent_for_review_date) {
          pndStatus = 'pending_review' // ถ้ามี sent_for_review_date แสดงว่ารอตรวจ
        } else if (item.wht_draft_completed_date) {
          pndStatus = 'draft_completed' // ถ้ามีวันที่ร่างแบบเสร็จแล้ว แสดงว่าร่างแบบเสร็จแล้ว
        } else {
          pndStatus = null
        }
      }

      // ใช้ shared utility เพื่อ derive pp30_status (single source of truth)
      const pp30Status = derivePp30Status(item) as TaxFilingRecord['pp30Status']

      // สร้างรายชื่อผู้ทำ: ผู้ตรวจภาษี, ผู้ทำบัญชี
      // ใช้ first_name และ nick_name เพื่อแสดงเป็น "ชื่อ (ชื่อเล่น)" โดยไม่แสดงนามสกุล
      const taxInspectorName = formatEmployeeName(
        item.tax_inspection_responsible_first_name,
        item.tax_inspection_responsible_nick_name
      )
      const accountingResponsibleName = formatEmployeeName(
        item.accounting_responsible_first_name,
        item.accounting_responsible_nick_name
      )

      // สร้างข้อความแสดงผู้ทำ (แสดงเฉพาะที่มีข้อมูล)
      // แสดงเป็น bullet points เพื่อให้อ่านง่าย
      const performerList: string[] = []
      if (taxInspectorName !== '-') {
        performerList.push(`• ผู้ตรวจภาษี: ${taxInspectorName}`)
      }
      if (accountingResponsibleName !== '-') {
        performerList.push(`• ผู้ทำบัญชี: ${accountingResponsibleName}`)
      }
      const performerText = performerList.length > 0 ? performerList.join('\n') : '-'

      return {
        id: item.id,
        build: item.build,
        companyName: item.company_name || '-',
        pndReviewReturnedDate: formatDate(item.pnd_review_returned_date),
        wht_inquiry: item.wht_inquiry ?? null,
        wht_response: item.wht_response ?? null,
        wht_submission_comment: item.wht_submission_comment ?? null,
        wht_filing_response: item.wht_filing_response ?? null,
        pp30_inquiry: item.pp30_inquiry ?? null,
        pp30_response: item.pp30_response ?? null,
        pp30_submission_comment: item.pp30_submission_comment ?? null,
        pp30_filing_response: item.pp30_filing_response ?? null,
        pndStatus: pndStatus,
        pp30ReviewReturnedDate: formatDate(item.pp30_review_returned_date),
        pp30Status: pp30Status,
        pp30PaymentStatus: item.pp30_payment_status || null,
        pp30PaymentAmount: item.pp30_payment_amount || null,
        performer: performerText,
      }
    })
  }, [taxDataResponse?.data])

  // ✅ Status filtering is now done server-side (via API query params)
  const filteredTableData = tableData

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Text c="dimmed">-</Text>
    return (
      <Badge
        variant="filled"
        style={{
          backgroundColor: getStatusColor(status),
          color: '#ffffff',
        }}
      >
        {getStatusLabel(status)}
      </Badge>
    )
  }

  const getPndStatusBadge = (status: TaxFilingRecord['pndStatus']) => {
    if (!status) return null
    return getStatusBadge(status)
  }

  const getPp30StatusBadge = (status: TaxFilingRecord['pp30Status']) => {
    if (!status) return <Text c="dimmed">-</Text>
    return getStatusBadge(status)
  }

  if (isLoading) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Card>
    )
  }

  if (error) {
    // Check if error is network-related (backend server not running)
    const err = error as { message?: string, code?: string }
    const isNetworkError =
      err?.message?.includes('Network Error') ||
      err?.code === 'ERR_NETWORK' ||
      err?.code === 'ERR_CONNECTION_REFUSED' ||
      err?.message?.includes('ERR_CONNECTION_REFUSED') ||
      err?.message?.includes('ERR_SOCKET_NOT_CONNECTED')

    const errorMessage = isNetworkError
      ? 'ไม่สามารถเชื่อมต่อกับ Backend Server ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001'
      : 'ไม่สามารถโหลดข้อมูลได้'

    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
          {errorMessage}
        </Alert>
      </Card>
    )
  }

  // ✅ FEATURE-007: ตรวจสอบข้อมูลว่าง (ทั้ง tableData และ filteredTableData)
  if (tableData.length === 0) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Text c="dimmed">ไม่พบข้อมูล</Text>
        </Center>
      </Card>
    )
  }

  if (filteredTableData.length === 0) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Text c="dimmed">ไม่พบข้อมูลที่ตรงกับตัวกรอง</Text>
        </Center>
      </Card>
    )
  }

  return (
    <Card shadow="sm" radius="lg" withBorder p={0}>
      <Table.ScrollContainer minWidth={1200}>
        <Table
          verticalSpacing="md"
          horizontalSpacing="lg"
          highlightOnHover
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 15,
                  backgroundColor: '#fff',
                  borderRight: '1px solid #dee2e6',
                  minWidth: 120,
                  width: 120,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => onSortChange?.('build')}
              >
                <Group gap={4} wrap="nowrap">
                  Build
                  {sortBy === 'build' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 120,
                  zIndex: 15,
                  backgroundColor: '#fff',
                  borderRight: '1px solid #dee2e6',
                  minWidth: 200,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => onSortChange?.('company_name')}
              >
                <Group gap={4} wrap="nowrap">
                  ชื่อบริษัท
                  {sortBy === 'company_name' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pnd_sent_for_review_date')}>
                <Group gap={4} wrap="nowrap">
                  วันที่ส่งตรวจคืน ภ.ง.ด.
                  {sortBy === 'pnd_sent_for_review_date' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pnd_status')}>
                <Group gap={4} wrap="nowrap">
                  สถานะ ภ.ง.ด.
                  {sortBy === 'pnd_status' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_sent_for_review_date')}>
                <Group gap={4} wrap="nowrap">
                  วันที่ส่งตรวจคืน ภ.พ. 30
                  {sortBy === 'pp30_sent_for_review_date' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_form')}>
                <Group gap={4} wrap="nowrap">
                  สถานะ ภ.พ.30
                  {sortBy === 'pp30_form' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_payment_status')}>
                <Group gap={4} wrap="nowrap">
                  สถานะยอดชำระ ภ.พ.30
                  {sortBy === 'pp30_payment_status' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              <Table.Th>ข้อมูลผู้รับผิดชอบ</Table.Th>
              <Table.Th>จัดการ</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredTableData.map((record) => (
              <Table.Tr key={record.id}>
                <Table.Td
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: '#fff',
                    borderRight: '1px solid #dee2e6',
                    minWidth: 120,
                  }}
                >
                  {record.build}
                </Table.Td>
                <Table.Td
                  style={{
                    position: 'sticky',
                    left: 120, // Approximate width of Build column
                    zIndex: 10,
                    backgroundColor: '#fff',
                    borderRight: '1px solid #dee2e6',
                    minWidth: 200,
                  }}
                >
                  {record.companyName}
                </Table.Td>
                <Table.Td style={{ minWidth: 180, whiteSpace: 'nowrap' }}>{record.pndReviewReturnedDate || '-'}</Table.Td>
                <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPndStatusBadge(record.pndStatus)}</Table.Td>
                <Table.Td style={{ minWidth: 180, whiteSpace: 'nowrap' }}>{record.pp30ReviewReturnedDate || '-'}</Table.Td>
                <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPp30StatusBadge(record.pp30Status)}</Table.Td>
                <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                  {record.pp30PaymentStatus === 'has_payment' ? (
                    <Badge color="red" variant="light">มียอดชำระ</Badge>
                  ) : record.pp30PaymentStatus === 'no_payment' ? (
                    <Badge color="green" variant="light">ไม่มียอดชำระ</Badge>
                  ) : (
                    <Text size="sm" c="dimmed">-</Text>
                  )}
                </Table.Td>
                <Table.Td style={{ minWidth: 220, whiteSpace: 'nowrap' }}>
                  {record.performer === '-' ? (
                    <Text size="sm" c="dimmed">-</Text>
                  ) : (
                    formatTextWithHighlight(record.performer)
                  )}
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="filled"
                    color="orange"
                    leftSection={<TbFileText size={14} />}
                    radius="lg"
                    onClick={() => onSelectCompany?.(record)}
                    style={{ backgroundColor: '#ff6b35', color: 'white' }}
                  >
                    เลือกบริษัทนี้
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  )
})

export default TaxFilingTable
