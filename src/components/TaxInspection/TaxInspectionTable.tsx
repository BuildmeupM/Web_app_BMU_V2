import { Table, Badge, Button, Group, Text, Card, Loader, Center, Alert } from '@mantine/core'
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

interface ApiError {
  message?: string;
  code?: string;
  response?: {
    status?: number;
  };
}

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
    'พนักงานที่รับผิดชอบในการคีย์:',
    'พนักงานที่ยื่น WHT:',
    'พนักงานที่ยื่น VAT:',
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

export type TaxInspectionTableRecord = {
  id: string
  build: string
  companyName: string
  pndSentDate: string | null
  pndStatus: string | null
  pp30SentDate: string | null
  pp30Status: string | null
  pp30PaymentStatus: string | null
  pp30PaymentAmount: number | null
  performer: string
  wht_inquiry?: string
  wht_response?: string
  wht_submission_comment?: string
  wht_filing_response?: string
  pp30_inquiry?: string
  pp30_response?: string
  pp30_submission_comment?: string
  pp30_filing_response?: string
}

interface TaxInspectionTableProps {
  onSelectCompany?: (record: TaxInspectionTableRecord) => void
  filters?: {
    filterType?: 'build' | 'date'
    filterMode?: 'all' | 'wht' | 'vat'
    build?: string
    year?: string
    month?: string
    search?: string
    searchValue?: string
    pndStatus?: string[]
    pp30Status?: string[]
    pp30PaymentStatus?: string[]
    tax_inspection_responsible?: string
    dateFrom?: string | Date | null
    dateTo?: string | Date | null
  }
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string) => void
  isDateFilterActive?: boolean
}

// สีสำหรับแต่ละสถานะ
const getStatusColor = (status: string | null): string => {
  if (!status) return '#808080' // สีเทาสำหรับสถานะยังไม่ดำเนินการ
  switch (status) {
    case 'received_receipt':
      return '#4facfe' // สีฟ้า
    case 'paid':
      return '#ffc107' // สีเหลือง
    case 'sent_to_customer':
      return '#81d4fa' // สีฟ้าอ่อน
    case 'draft_completed':
      return '#ffb74d' // สีส้มอ่อน (ตรงกับ TaxInspectionForm)
    case 'passed':
      return '#4caf50' // สีเขียว
    case 'pending_review':
      return '#ff6b35' // สีส้ม
    case 'pending_recheck':
      return '#f44336' // สีแดง
    case 'draft_ready':
      return '#f8bbd9' // สีชมพูอ่อน
    case 'needs_correction':
      return '#f44336' // สีแดง
    case 'edit':
      return '#f44336' // สีแดง
    case 'inquire_customer':
      return '#9c27b0' // สีม่วง
    case 'additional_review':
      return '#81d4fa' // สีฟ้าอ่อน
    case 'not_submitted':
      return '#000000' // สีดำ (ตรงกับ TaxInspectionForm)
    case 'not_started':
      return '#808080' // สีเทา (สถานะยังไม่ดำเนินการ)
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

const TaxInspectionTable = memo(function TaxInspectionTable({
  onSelectCompany,
  filters = {},
  page = 1,
  limit = 20,
  sortBy = 'build',
  sortOrder = 'asc',
  onSortChange,
  isDateFilterActive = false,
}: TaxInspectionTableProps) {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component mount/unmount หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxInspectionTable] Component MOUNTED:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionTable] Component UNMOUNTED:', {
          timestamp: new Date().toISOString(),
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array เพื่อให้ run เพียงครั้งเดียวเมื่อ mount

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component update หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxInspectionTable] Component updated:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, employeeId, _hasHydrated])

  // 🔌 WebSocket: Subscribe to real-time updates
  useRealtimeUpdates(employeeId)

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch monthly tax data from API - filter by tax_inspection_responsible and tax month
  const {
    data: taxDataResponse,
    isLoading,
    error,
  } = useQuery(
    ['monthly-tax-data', 'tax-inspection', page, limit, filters, employeeId, currentTaxMonth.year, currentTaxMonth.month, filters.filterType, filters.searchValue, filters.dateFrom, filters.dateTo, sortBy, sortOrder],
    () =>
      monthlyTaxDataService.getList({
        page,
        limit,
        year: filters.year || currentTaxMonth.year.toString(),
        month: filters.month || currentTaxMonth.month.toString(),
        tax_inspection_responsible: employeeId || undefined,
        // ✅ Server-side status filtering (fixes pagination + filter bug)
        pnd_status: filters.whtStatus?.join(',') || undefined,
        pp30_status: filters.pp30Status?.join(',') || undefined,
        pp30_payment_status: filters.pp30PaymentStatus?.join(',') || undefined,
        // ✅ Text and Date filtering
        build: filters.filterType === 'build' && filters.searchValue ? filters.searchValue : filters.build,
        search: filters.filterType === 'build' && filters.searchValue ? filters.searchValue : filters.search,
        filterMode: filters.filterMode,
        dateFrom: filters.filterType === 'date' && filters.dateFrom ? dayjs(filters.dateFrom).format('YYYY-MM-DD') : undefined,
        dateTo: filters.filterType === 'date' && filters.dateTo ? dayjs(filters.dateTo).format('YYYY-MM-DD') : undefined,
        sortBy,
        sortOrder,
      }),
    {
      keepPreviousData: true,
      // ✅ Performance Optimization: Cache 30 seconds เพื่อลด API calls (ข้อมูลจะยังถูก invalidate เมื่อบันทึกหรือ WebSocket update)
      staleTime: 30 * 1000, // Cache 30 seconds (แทน 0) - ลด API calls 70-80%
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น (แก้ปัญหาไม่แสดงข้อมูล)
      refetchOnWindowFocus: false, // ปิดการ refetch อัตโนมัติเมื่อ focus window เพื่อลด requests
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      retry: (failureCount, error: unknown) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if ((error as ApiError)?.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
      // ✅ BUG-168: Debug logging ใน query callbacks
      onSuccess: (data) => {
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionTable] Query SUCCESS:', {
            dataLength: data?.data?.length || 0,
            total: data?.pagination?.total || 0,
            timestamp: new Date().toISOString(),
          })
        }
      },
      onError: (err: unknown) => {
        if (import.meta.env.DEV) {
          console.error('[TaxInspectionTable] Query ERROR:', {
            error: (err as ApiError)?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          })
        }
      },
    }
  )

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า query ทำงานหรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxInspectionTable] Query state:', {
        enabled: !!employeeId && _hasHydrated,
        isLoading,
        hasData: !!taxDataResponse,
        dataLength: taxDataResponse?.data?.length || 0,
        error: error ? (error as ApiError)?.message || 'Unknown error' : null,
        timestamp: new Date().toISOString(),
      })
    }
  }, [employeeId, _hasHydrated, isLoading, taxDataResponse, error])

  // Transform API data to table format
  const tableData = useMemo(() => {
    return taxDataResponse?.data?.map((item: MonthlyTaxData) => {
      // Format dates: ใช้ฟังก์ชันเดียวกับ TaxInspectionForm เพื่อให้การแสดงผลสอดคล้องกัน
      // ⚠️ สำคัญ: Backend ส่งข้อมูลมาเป็น format 'YYYY-MM-DD HH:mm:ss' ซึ่งเป็นเวลาไทยแล้ว (ไม่ใช่ UTC)
      // ดังนั้นไม่ต้องแปลง timezone แต่แปลง format จาก 'YYYY-MM-DD HH:mm:ss' เป็น 'DD/MM/YYYY HH:mm' เท่านั้น
      const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null
        // ใช้ formatDateTimeNoConversion เพื่อแปลง format โดยไม่แปลง timezone (เหมือน TaxInspectionForm)
        const formatted = formatDateTimeNoConversion(dateStr, 'DD/MM/YYYY HH:mm')
        return formatted || null
      }

      // ⚠️ สำคัญ: ใช้ pp30_status หรือ pp30_form จาก backend โดยตรง (หลัง migration 028)
      // ถ้าไม่มี ให้ derive จาก timestamp fields
      // ใช้ shared utility เพื่อ derive pp30_status (single source of truth)
      // ⚠️ สำคัญ: derivePp30Status จะใช้ pp30_status หรือ pp30_form ก่อน แล้วค่อย derive จาก timestamp
      const pp30Status = derivePp30Status(item)

      // สร้างรายชื่อผู้ทำ: พนักงานที่รับผิดชอบในการคีย์, พนักงานที่ยื่น WHT, พนักงานที่ยื่น VAT, ผู้ทำบัญชี
      // ใช้ first_name และ nick_name เพื่อแสดงเป็น "ชื่อ (ชื่อเล่น)" โดยไม่แสดงนามสกุล
      const documentEntryName = formatEmployeeName(
        item.document_entry_responsible_first_name,
        item.document_entry_responsible_nick_name
      )
      const whtFilerName = formatEmployeeName(
        item.wht_filer_current_employee_first_name || item.wht_filer_employee_first_name,
        item.wht_filer_current_employee_nick_name || item.wht_filer_employee_nick_name
      )
      const vatFilerName = formatEmployeeName(
        item.vat_filer_current_employee_first_name || item.vat_filer_employee_first_name,
        item.vat_filer_current_employee_nick_name || item.vat_filer_employee_nick_name
      )
      const accountingResponsibleName = formatEmployeeName(
        item.accounting_responsible_first_name,
        item.accounting_responsible_nick_name
      )

      // สร้างข้อความแสดงผู้ทำ (แสดงเฉพาะที่มีข้อมูล)
      // แสดงเป็น bullet points เพื่อให้อ่านง่าย
      const performerList: string[] = []
      if (documentEntryName !== '-') {
        performerList.push(`• พนักงานที่รับผิดชอบในการคีย์: ${documentEntryName}`)
      }
      if (whtFilerName !== '-') {
        performerList.push(`• พนักงานที่ยื่น WHT: ${whtFilerName}`)
      }
      if (vatFilerName !== '-') {
        performerList.push(`• พนักงานที่ยื่น VAT: ${vatFilerName}`)
      }
      if (accountingResponsibleName !== '-') {
        performerList.push(`• ผู้ทำบัญชี: ${accountingResponsibleName}`)
      }
      const performerText = performerList.length > 0 ? performerList.join('\n') : '-'

      return {
        id: item.id,
        build: item.build,
        companyName: item.company_name || '-',
        pndSentDate: formatDate(item.pnd_sent_for_review_date),
        pndStatus: item.pnd_status || null,
        pp30SentDate: formatDate(item.pp30_sent_for_review_date),
        pp30Status: pp30Status,
        pp30PaymentStatus: item.pp30_payment_status || null,
        pp30PaymentAmount: item.pp30_payment_amount || null,
        performer: performerText,
        wht_inquiry: item.wht_inquiry ?? undefined,
        wht_response: item.wht_response ?? undefined,
        wht_submission_comment: item.wht_submission_comment ?? undefined,
        wht_filing_response: item.wht_filing_response ?? undefined,
        pp30_inquiry: item.pp30_inquiry ?? undefined,
        pp30_response: item.pp30_response ?? undefined,
        pp30_submission_comment: item.pp30_submission_comment ?? undefined,
        pp30_filing_response: item.pp30_filing_response ?? undefined,
      }
    }) || []
  }, [taxDataResponse?.data])
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

  const getPndStatusBadge = (status: TaxInspectionTableRecord['pndStatus']) => {
    if (!status) return null
    return getStatusBadge(status)
  }

  const getPp30StatusBadge = (status: string | null) => {
    if (!status) return <Text c="dimmed">-</Text>
    return getStatusBadge(status)
  }

  // ✅ Status filtering is now done server-side (via API query params)
  // No client-side filtering needed - data is already pre-filtered by the API
  const filteredData = tableData

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
    const apiError = error as ApiError;
    // Check if error is network-related (backend server not running)
    const isNetworkError =
      apiError?.message?.includes('Network Error') ||
      apiError?.code === 'ERR_NETWORK' ||
      apiError?.code === 'ERR_CONNECTION_REFUSED' ||
      apiError?.message?.includes('ERR_CONNECTION_REFUSED') ||
      apiError?.message?.includes('ERR_SOCKET_NOT_CONNECTED')

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

  if (filteredData.length === 0) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Text c="dimmed">ไม่พบข้อมูล</Text>
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
                  cursor: !isDateFilterActive ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => !isDateFilterActive && onSortChange?.('build')}
              >
                <Group gap={4} wrap="nowrap">
                  Build
                  {!isDateFilterActive && sortBy === 'build' && (
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
                  cursor: !isDateFilterActive ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => !isDateFilterActive && onSortChange?.('company_name')}
              >
                <Group gap={4} wrap="nowrap">
                  ชื่อบริษัท
                  {!isDateFilterActive && sortBy === 'company_name' && (
                    <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                  )}
                </Group>
              </Table.Th>
              {filters?.filterMode !== 'vat' && (
                <Table.Th style={{ cursor: !isDateFilterActive ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => !isDateFilterActive && onSortChange?.('pnd_sent_for_review_date')}>
                  <Group gap={4} wrap="nowrap">
                    วันที่ส่งตรวจ ภ.ง.ด.
                    {!isDateFilterActive && sortBy === 'pnd_sent_for_review_date' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'vat' && (
                <Table.Th style={{ cursor: !isDateFilterActive ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => !isDateFilterActive && onSortChange?.('pnd_status')}>
                  <Group gap={4} wrap="nowrap">
                    สถานะ ภ.ง.ด.
                    {!isDateFilterActive && sortBy === 'pnd_status' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: !isDateFilterActive ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => !isDateFilterActive && onSortChange?.('pp30_sent_for_review_date')}>
                  <Group gap={4} wrap="nowrap">
                    วันที่ส่งตรวจ ภ.พ. 30
                    {!isDateFilterActive && sortBy === 'pp30_sent_for_review_date' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: !isDateFilterActive ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => !isDateFilterActive && onSortChange?.('pp30_form')}>
                  <Group gap={4} wrap="nowrap">
                    แบบ ภพ.30
                    {!isDateFilterActive && sortBy === 'pp30_form' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: !isDateFilterActive ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => !isDateFilterActive && onSortChange?.('pp30_payment_status')}>
                  <Group gap={4} wrap="nowrap">
                    สถานะยอดชำระ ภ.พ.30
                    {!isDateFilterActive && sortBy === 'pp30_payment_status' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              <Table.Th>ข้อมูลผู้รับผิดชอบ</Table.Th>
              <Table.Th>จัดการ</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredData.map((record) => (
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
                {filters?.filterMode !== 'vat' && (
                  <Table.Td style={{ minWidth: 180, whiteSpace: 'nowrap' }}>{record.pndSentDate || '-'}</Table.Td>
                )}
                {filters?.filterMode !== 'vat' && (
                  <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPndStatusBadge(record.pndStatus)}</Table.Td>
                )}
                {filters?.filterMode !== 'wht' && (
                  <Table.Td style={{ minWidth: 180, whiteSpace: 'nowrap' }}>{record.pp30SentDate || '-'}</Table.Td>
                )}
                {filters?.filterMode !== 'wht' && (
                  <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPp30StatusBadge(record.pp30Status)}</Table.Td>
                )}
                {filters?.filterMode !== 'wht' && (
                  <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                    {record.pp30PaymentStatus === 'has_payment' ? (
                      <Badge color="red" variant="light">มียอดชำระ</Badge>
                    ) : record.pp30PaymentStatus === 'no_payment' ? (
                      <Badge color="green" variant="light">ไม่มียอดชำระ</Badge>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                )}
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

export default TaxInspectionTable
