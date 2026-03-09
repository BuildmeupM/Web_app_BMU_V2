import { Table, Badge, Button, Text, Card, Loader, Center, Alert, Group, Tooltip, Stack } from '@mantine/core'
import React, { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react'
import { TbFileText, TbAlertCircle, TbCheck, TbRefresh, TbAlertTriangle, TbTerminal2 } from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import { derivePp30Status } from '../../utils/pp30StatusUtils'
import monthlyTaxDataService, { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import { FilterValues } from './FilterSection'
import { verifyTableData, DataVerificationResult, DataMismatch } from '../../utils/dataVerification'
import { notifications } from '@mantine/notifications'
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

// Helper function: Format employee name to "ชื่อ (ชื่อเล่น)" format
const formatEmployeeName = (
  firstName: string | null | undefined,
  nickName: string | null | undefined
): string => {
  if (!firstName) return '-'
  if (nickName) {
    return `${firstName}(${nickName})`
  }
  return firstName
}

// Helper function: Format text with highlighted labels
const formatTextWithHighlight = (text: string): React.ReactNode => {
  // List of labels to highlight
  const labels = [
    'วันที่ส่งตรวจ ภ.ง.ด.:',
    'วันที่ส่งตรวจคืน ภ.ง.ด.:',
    'วันที่ส่งลูกค้า ภ.ง.ด.:',
    'วันที่ส่งตรวจ ภ.พ.30:',
    'วันที่ส่งตรวจคืน ภ.พ.30:',
    'วันที่ส่งลูกค้า ภ.พ.30:',
    'ผู้ตรวจภาษี:',
    'พนักงานที่รับผิดชอบในการคีย์:',
    'พนักงานที่ยื่น WHT:',
    'พนักงานที่ยื่น VAT:',
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

interface TaxStatusRecord {
  id: string
  build: string
  companyName: string
  // PND Dates
  pndSentForReviewDate: string | null
  pndReviewReturnedDate: string | null
  pndSentToCustomerDate: string | null
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
  | 'edit'
  | 'inquire_customer'
  | 'additional_review'
  | 'not_started'
  | null
  // PP30 Dates
  pp30SentForReviewDate: string | null
  pp30ReviewReturnedDate: string | null
  pp30SentToCustomerDate: string | null
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
  performers: {
    taxInspector?: string | null
    documentEntry?: string | null
    whtFiler?: string | null
    vatFiler?: string | null
  }
  wht_inquiry?: string | null
  wht_response?: string | null
  wht_submission_comment?: string | null
  wht_filing_response?: string | null
  pp30_inquiry?: string | null
  pp30_response?: string | null
  pp30_submission_comment?: string | null
  pp30_filing_response?: string | null
}

interface TaxStatusTableProps {
  onSelectCompany?: (record: TaxStatusRecord) => void
  accounting_responsible?: string
  page?: number
  limit?: number
  onPaginationChange?: (pagination: { total: number; totalPages: number; page: number; limit: number }) => void
  filters?: FilterValues
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string) => void
}

// สีสำหรับแต่ละสถานะ
const getStatusColor = (status: string | null): string => {
  if (!status) return '#808080'
  switch (status) {
    case 'received_receipt':
      return '#4facfe'
    case 'paid':
      return '#ffc107'
    case 'sent_to_customer':
      return '#81d4fa'
    case 'draft_completed':
      return '#ffb74d' // Light Orange (ตรงกับ TaxInspectionForm)
    case 'passed':
      return '#4caf50'
    case 'pending_review':
      return '#ff6b35'
    case 'pending_recheck':
      return '#f44336'
    case 'draft_ready':
      return '#f8bbd9'
    case 'needs_correction':
      return '#f44336'
    case 'edit':
      return '#f44336'
    case 'inquire_customer':
      return '#9c27b0'
    case 'additional_review':
      return '#81d4fa'
    case 'not_submitted':
      return '#000000' // Black (ตรงกับ TaxInspectionForm)
    case 'not_started':
      return '#808080'
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

// ✅ Performance: Memoize component to avoid unnecessary re-renders
const TaxStatusTable = memo(function TaxStatusTable({
  onSelectCompany,
  accounting_responsible,
  page = 1,
  limit = 20,
  onPaginationChange,
  filters,
  sortBy = 'build',
  sortOrder = 'asc',
  onSortChange,
}: TaxStatusTableProps) {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = accounting_responsible || user?.employee_id || null
  const queryClient = useQueryClient()

  // 🔌 WebSocket: Subscribe to real-time updates
  useRealtimeUpdates(employeeId)

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Refs สำหรับคำนวณความกว้างของคอลัมน์ Build
  const buildHeaderRef = useRef<HTMLTableCellElement>(null)
  const [buildColumnWidth, setBuildColumnWidth] = useState(120)

  // State สำหรับ data verification
  const [verificationResult, setVerificationResult] = useState<DataVerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationMismatches, setVerificationMismatches] = useState<DataMismatch[]>([])

  // State สำหรับ console logging
  const [isConsoleLoggingEnabled, setIsConsoleLoggingEnabled] = useState(false)

  // Determine tax_registration_status filter based on filterMode
  // 'all' = ไม่ filter, 'wht' = ไม่ filter (แสดงทั้งหมด), 'vat' = filter เฉพาะ 'จดภาษีมูลค่าเพิ่ม'
  const taxRegistrationStatus = filters?.filterMode === 'vat' ? 'จดภาษีมูลค่าเพิ่ม' : undefined

  // Fetch monthly tax data from API - filter by accounting_responsible, tax month, and filterMode
  // ⚠️ สำคัญ: ต้อง declare taxDataResponse ก่อน handleVerifyData เพื่อหลีกเลี่ยง ReferenceError
  const {
    data: taxDataResponse,
    isLoading,
    error,
  } = useQuery(
    ['monthly-tax-data', 'tax-status', page, limit, employeeId, currentTaxMonth.year, currentTaxMonth.month, filters?.filterType, filters?.searchValue, filters?.dateFrom, filters?.dateTo, filters?.filterMode, filters?.whtStatus, filters?.pp30Status, filters?.pp30PaymentStatus, sortBy, sortOrder],
    () =>
      monthlyTaxDataService.getList({
        page,
        limit,
        year: currentTaxMonth.year.toString(),
        month: currentTaxMonth.month.toString(),
        accounting_responsible: employeeId || undefined,
        tax_registration_status: taxRegistrationStatus,
        // ✅ Text and Date filtering
        build: filters?.filterType === 'build' && filters?.searchValue ? filters.searchValue : undefined,
        search: filters?.filterType === 'build' && filters?.searchValue ? filters.searchValue : undefined,
        filterMode: filters?.filterMode,
        dateFrom: filters?.filterType === 'date' && filters?.dateFrom ? dayjs(filters.dateFrom).format('YYYY-MM-DD') : undefined,
        dateTo: filters?.filterType === 'date' && filters?.dateTo ? dayjs(filters.dateTo).format('YYYY-MM-DD') : undefined,
        // ✅ Server-side status filtering
        pnd_status: filters?.whtStatus?.length ? filters.whtStatus.join(',') : undefined,
        pp30_status: filters?.pp30Status?.length ? filters.pp30Status.join(',') : undefined,
        pp30_payment_status: filters?.pp30PaymentStatus?.length ? filters.pp30PaymentStatus.join(',') : undefined,
        sortBy,
        sortOrder,
      }),
    {
      keepPreviousData: true,
      // ✅ Performance Optimization: Cache 30 seconds เพื่อลด API calls (ข้อมูลจะยังถูก invalidate เมื่อบันทึกหรือ WebSocket update)
      staleTime: 30 * 1000, // Cache 30 seconds (แทน 0) - ลด API calls 70-80%
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น (key prop จะทำให้ component unmount/mount ใหม่อยู่แล้ว แต่เพิ่มเพื่อความแน่ใจ)
      refetchOnWindowFocus: false, // ปิดการ refetch เมื่อ focus window เพื่อลด requests
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
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
    }
  )

  // Function สำหรับตรวจสอบข้อมูล
  // ⚠️ สำคัญ: ต้อง declare หลังจาก taxDataResponse เพื่อหลีกเลี่ยง ReferenceError
  const handleVerifyData = useCallback(async () => {
    if (!taxDataResponse?.data || taxDataResponse.data.length === 0) {
      notifications.show({
        title: 'ไม่สามารถตรวจสอบได้',
        message: 'ไม่มีข้อมูลในตาราง',
        color: 'yellow',
        icon: <TbAlertTriangle size={16} />,
      })
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)
    setVerificationMismatches([])

    const loadingNotificationId = notifications.show({
      id: 'verify-loading',
      title: 'กำลังตรวจสอบข้อมูล',
      message: 'กำลังเปรียบเทียบข้อมูลกับฐานข้อมูล...',
      color: 'blue',
      icon: <TbRefresh size={16} />,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    })

    try {
      const buildIds = taxDataResponse.data.map((item) => item.build)
      const result = await verifyTableData(
        taxDataResponse.data,
        buildIds,
        currentTaxMonth.year,
        currentTaxMonth.month
      )

      setVerificationResult(result)
      setVerificationMismatches(result.mismatches)

      if (result.isValid) {
        notifications.update({
          id: loadingNotificationId,
          title: 'ตรวจสอบข้อมูลสำเร็จ',
          message: `ข้อมูลทั้งหมด ${result.summary.totalChecked} รายการถูกต้องตามฐานข้อมูล`,
          color: 'green',
          icon: <TbCheck size={16} />,
          loading: false,
          autoClose: 5000,
          withCloseButton: true,
        })
      } else {
        const highSeverityCount = result.mismatches.filter((m) => m.severity === 'high').length
        const mediumSeverityCount = result.mismatches.filter((m) => m.severity === 'medium').length
        const lowSeverityCount = result.mismatches.filter((m) => m.severity === 'low').length

        notifications.update({
          id: loadingNotificationId,
          title: 'พบข้อมูลไม่ตรงกัน',
          message: `พบ ${result.summary.invalidCount} รายการที่ไม่ตรงกับฐานข้อมูล (High: ${highSeverityCount}, Medium: ${mediumSeverityCount}, Low: ${lowSeverityCount})`,
          color: 'red',
          icon: <TbAlertTriangle size={16} />,
          loading: false,
          autoClose: 10000,
          withCloseButton: true,
        })

        // ถ้าพบข้อมูลไม่ตรงกัน ให้ invalidate cache และ refetch
        await queryClient.invalidateQueries({
          queryKey: ['monthly-tax-data', 'tax-status'],
          exact: false,
        })
        await queryClient.refetchQueries(
          ['monthly-tax-data', 'tax-status'],
          { exact: false, active: true }
        )
      }
    } catch (error) {
      console.error('Data verification error:', error)
      notifications.update({
        id: loadingNotificationId,
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      })
    } finally {
      setIsVerifying(false)
    }
  }, [taxDataResponse?.data, currentTaxMonth.year, currentTaxMonth.month, queryClient])

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

  // ⚠️ ปิด auto-verify เพื่อหลีกเลี่ยง 429 (Too Many Requests) errors
  // ผู้ใช้สามารถกดปุ่ม "ตรวจสอบข้อมูล" เพื่อ verify ข้อมูลได้เอง
  // Auto-verify data when data changes (disabled to prevent 429 errors)
  // useEffect(() => {
  //   if (import.meta.env.DEV && taxDataResponse?.data && taxDataResponse.data.length > 0 && !isVerifying) {
  //     // Auto-verify after a short delay to avoid blocking initial render
  //     const timeoutId = setTimeout(() => {
  //       handleVerifyData()
  //     }, 2000) // ตรวจสอบหลังจาก 2 วินาที
  //
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [taxDataResponse?.data, isVerifying, handleVerifyData])

  // Log ข้อมูลจากฐานข้อมูลไปยัง console เมื่อเปิดใช้งาน
  useEffect(() => {
    if (isConsoleLoggingEnabled && taxDataResponse?.data) {
      console.group('📊 [TaxStatusTable] ข้อมูลจากฐานข้อมูล')
      console.log('📋 สรุปข้อมูล:', {
        totalRecords: taxDataResponse.data.length,
        pagination: taxDataResponse.pagination,
        filters: {
          year: currentTaxMonth.year,
          month: currentTaxMonth.month,
          accounting_responsible: employeeId,
          filterMode: filters?.filterMode,
        },
      })

      console.log('📝 รายละเอียดข้อมูลทั้งหมด:')
      taxDataResponse.data.forEach((item, index) => {
        console.group(`📌 Record ${index + 1}: Build ${item.build} - ${item.company_name || '(ไม่มีชื่อบริษัท)'}`)
        console.log('🆔 ข้อมูลพื้นฐาน:', {
          id: item.id,
          build: item.build,
          company_name: item.company_name,
          tax_year: item.tax_year,
          tax_month: item.tax_month,
        })

        console.log('👥 ผู้รับผิดชอบ:', {
          accounting_responsible: item.accounting_responsible_name || item.accounting_responsible,
          accounting_responsible_first_name: item.accounting_responsible_first_name,
          accounting_responsible_nick_name: item.accounting_responsible_nick_name,
          tax_inspection_responsible: item.tax_inspection_responsible_name || item.tax_inspection_responsible,
          tax_inspection_responsible_first_name: item.tax_inspection_responsible_first_name,
          tax_inspection_responsible_nick_name: item.tax_inspection_responsible_nick_name,
          document_entry_responsible: item.document_entry_responsible_name || item.document_entry_responsible,
          document_entry_responsible_first_name: item.document_entry_responsible_first_name,
          document_entry_responsible_nick_name: item.document_entry_responsible_nick_name,
        })

        console.log('📄 สถานะ ภ.ง.ด. (PND):', {
          pnd_status: item.pnd_status,
          pnd_sent_for_review_date: item.pnd_sent_for_review_date,
          pnd_review_returned_date: item.pnd_review_returned_date,
          pnd_sent_to_customer_date: item.pnd_sent_to_customer_date,
          pnd_1_40_1_status: item.pnd_1_40_1_status,
          pnd_1_40_2_status: item.pnd_1_40_2_status,
          pnd_3_status: item.pnd_3_status,
          pnd_53_status: item.pnd_53_status,
          pnd_2_status: item.pnd_2_status,
          pnd_54_status: item.pnd_54_status,
        })

        console.log('📄 สถานะ ภ.พ.30 (PP30):', {
          pp30_form: item.pp30_form,
          pp30_status: item.pp30_status,
          pp30_sent_for_review_date: item.pp30_sent_for_review_date,
          pp30_review_returned_date: item.pp30_review_returned_date,
          pp30_sent_to_customer_date: item.pp30_sent_to_customer_date,
          pp30_payment_status: item.pp30_payment_status,
          pp30_payment_amount: item.pp30_payment_amount,
          pp30_filing_response: item.pp30_filing_response,
          purchase_document_count: item.purchase_document_count,
          income_confirmed: item.income_confirmed,
        })

        console.log('💰 สถานะการชำระเงิน:', {
          pp30_payment_status: item.pp30_payment_status,
          pp30_payment_amount: item.pp30_payment_amount,
        })

        console.log('👨‍💼 พนักงานที่ยื่นภาษี:', {
          wht_filer: {
            employee_id: item.wht_filer_current_employee_id || item.wht_filer_employee_id,
            name: item.wht_filer_current_employee_name || item.wht_filer_employee_name,
            first_name: item.wht_filer_current_employee_first_name || item.wht_filer_employee_first_name,
            nick_name: item.wht_filer_current_employee_nick_name || item.wht_filer_employee_nick_name,
            draft_completed_date: item.wht_draft_completed_date,
          },
          vat_filer: {
            employee_id: item.vat_filer_current_employee_id || item.vat_filer_employee_id,
            name: item.vat_filer_current_employee_name || item.vat_filer_employee_name,
            first_name: item.vat_filer_current_employee_first_name || item.vat_filer_employee_first_name,
            nick_name: item.vat_filer_current_employee_nick_name || item.vat_filer_employee_nick_name,
            draft_completed_date: item.vat_draft_completed_date,
          },
        })

        console.log('📅 Timestamps:', {
          created_at: item.created_at,
          updated_at: item.updated_at,
          document_received_date: item.document_received_date,
        })

        console.log('📊 Raw Data (Full Object):', item)
        console.groupEnd()
      })

      console.groupEnd()
    }
  }, [isConsoleLoggingEnabled, taxDataResponse, currentTaxMonth, employeeId, filters])

  // Calculate Build column width when component mounts or data changes
  useEffect(() => {
    const updateWidth = () => {
      if (buildHeaderRef.current) {
        setBuildColumnWidth(buildHeaderRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [taxDataResponse?.data])

  // ✅ Performance: Memoize transformed data to avoid unnecessary recalculations
  const allTableData = useMemo<TaxStatusRecord[]>(() => {
    if (import.meta.env.DEV && taxDataResponse?.data) {
      console.log('🔍 [TaxStatusTable] Processing data from API:', {
        totalRecords: taxDataResponse.data.length,
        sampleRecord: taxDataResponse.data[0] ? {
          build: taxDataResponse.data[0].build,
          pnd_status: taxDataResponse.data[0].pnd_status,
          pp30_status: taxDataResponse.data[0].pp30_status,
          pp30_form: taxDataResponse.data[0].pp30_form,
          pp30_sent_for_review_date: taxDataResponse.data[0].pp30_sent_for_review_date,
          pp30_review_returned_date: taxDataResponse.data[0].pp30_review_returned_date,
          pp30_sent_to_customer_date: taxDataResponse.data[0].pp30_sent_to_customer_date,
          vat_draft_completed_date: taxDataResponse.data[0].vat_draft_completed_date,
        } : null,
      })
    }

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

      // ⚠️ สำคัญ: ใช้ pp30_form จาก API โดยตรง (backend ส่งเฉพาะ pp30_form แล้ว ไม่ส่ง pp30_status)
      // ถ้าไม่มี pp30_form → ใช้ derivePp30Status เพื่อ derive จาก timestamp fields (fallback)
      let pp30Status = ''
      if (item.pp30_form != null && String(item.pp30_form).trim() !== '' && item.pp30_form !== '0' && item.pp30_form !== '1' && String(item.pp30_form) !== '0' && String(item.pp30_form) !== '1' && String(item.pp30_form) !== 'true' && String(item.pp30_form) !== 'false') {
        // ใช้ pp30_form โดยตรง (หลัง migration 028) - backend ส่งเฉพาะ pp30_form แล้ว
        pp30Status = String(item.pp30_form).trim()
      } else {
        // Derive จาก timestamp fields (fallback)
        pp30Status = derivePp30Status(item) || ''
      }

      if (import.meta.env.DEV) {
        console.log(`🔍 [TaxStatusTable] Build ${item.build}:`, {
          pp30_form_from_api: item.pp30_form,
          pp30_form_type: typeof item.pp30_form,
          pp30_form_is_null: item.pp30_form === null,
          pp30_form_is_undefined: item.pp30_form === undefined,
          pp30_form_is_empty: item.pp30_form === '',
          pp30_status_derived: pp30Status,
          pp30_status_final: pp30Status,
          pnd_status: item.pnd_status,
          // 🔍 Debug: Log timestamp fields for comparison
          pp30_sent_to_customer_date: item.pp30_sent_to_customer_date,
          pp30_review_returned_date: item.pp30_review_returned_date,
          pp30_sent_for_review_date: item.pp30_sent_for_review_date,
          vat_draft_completed_date: item.vat_draft_completed_date,
        })
      }

      // สร้างรายชื่อผู้ทำ: ผู้ตรวจภาษี, พนักงานที่รับผิดชอบในการคีย์, พนักงานที่ยื่น WHT, พนักงานที่ยื่น VAT
      // ใช้ first_name และ nick_name เพื่อแสดงเป็น "ชื่อ (ชื่อเล่น)" โดยไม่แสดงนามสกุล
      const taxInspectorName = formatEmployeeName(
        item.tax_inspection_responsible_first_name,
        item.tax_inspection_responsible_nick_name
      )
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

      const performers = {
        taxInspector: taxInspectorName !== '-' ? taxInspectorName : null,
        documentEntry: documentEntryName !== '-' ? documentEntryName : null,
        whtFiler: whtFilerName !== '-' ? whtFilerName : null,
        vatFiler: vatFilerName !== '-' ? vatFilerName : null,
      }

      // สร้างข้อความแสดงผู้ทำ (แสดงเฉพาะที่มีข้อมูล)
      // แสดงเป็น bullet points เพื่อให้อ่านง่าย
      const performerList: string[] = []
      if (performers.taxInspector) {
        performerList.push(`• ผู้ตรวจภาษี: ${performers.taxInspector}`)
      }
      if (performers.documentEntry) {
        performerList.push(`• พนักงานที่รับผิดชอบในการคีย์: ${performers.documentEntry}`)
      }
      if (performers.whtFiler) {
        performerList.push(`• พนักงานที่ยื่น WHT: ${performers.whtFiler}`)
      }
      if (performers.vatFiler) {
        performerList.push(`• พนักงานที่ยื่น VAT: ${performers.vatFiler}`)
      }
      const performerText = performerList.length > 0 ? performerList.join('\n') : '-'

      return {
        id: item.id,
        build: item.build,
        companyName: item.company_name || '-',
        // PND Dates
        pndSentForReviewDate: formatDate(item.pnd_sent_for_review_date),
        pndReviewReturnedDate: formatDate(item.pnd_review_returned_date),
        pndSentToCustomerDate: formatDate(item.pnd_sent_to_customer_date),
        // ⚠️ สำคัญ: ใช้ pnd_status จาก API โดยตรง (backend ส่งมาแล้ว)
        // ถ้าไม่มีจาก API ค่อย derive เอง (fallback)
        pndStatus: (item.pnd_status && String(item.pnd_status).trim() !== ''
          ? item.pnd_status as TaxStatusRecord['pndStatus']
          : (() => {
            // Derive จาก fields อื่นๆ ถ้า pnd_status ไม่มี
            if (item.pnd_sent_to_customer_date) return 'sent_to_customer'
            if (item.pnd_review_returned_date) return 'pending_recheck'
            if (item.pnd_sent_for_review_date) return 'pending_review'
            if (item.wht_draft_completed_date) return 'draft_completed'
            if (item.wht_filing_response) return 'paid'
            return null
          })()) as TaxStatusRecord['pndStatus'],
        // PP30 Dates
        pp30SentForReviewDate: formatDate(item.pp30_sent_for_review_date),
        pp30ReviewReturnedDate: formatDate(item.pp30_review_returned_date),
        pp30SentToCustomerDate: formatDate(item.pp30_sent_to_customer_date),
        pp30Status: pp30Status as TaxStatusRecord['pp30Status'],
        pp30PaymentStatus: item.pp30_payment_status || null,
        pp30PaymentAmount: item.pp30_payment_amount || null,
        performer: performerText, // เก็บข้อความรวมไว้สำหรับ backward compatibility
        performers: performers, // เก็บข้อมูลแยกไว้สำหรับการแสดงผลแบบละเอียด
        wht_inquiry: item.wht_inquiry ?? null,
        wht_response: item.wht_response ?? null,
        wht_submission_comment: item.wht_submission_comment ?? null,
        wht_filing_response: item.wht_filing_response ?? null,
        pp30_inquiry: item.pp30_inquiry ?? null,
        pp30_response: item.pp30_response ?? null,
        pp30_submission_comment: item.pp30_submission_comment ?? null,
        pp30_filing_response: item.pp30_filing_response ?? null,
      }
    }) || []
  }, [taxDataResponse?.data])

  // ✅ Status filtering is now done server-side (via API query params)
  const tableData = allTableData
  // ✅ Performance: Memoize status badge function
  const getStatusBadge = useCallback((status: string | null) => {
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
  }, [])

  const getPndStatusBadge = useCallback((status: TaxStatusRecord['pndStatus']) => {
    if (!status) return null
    return getStatusBadge(status)
  }, [getStatusBadge])

  const getPp30StatusBadge = useCallback((status: TaxStatusRecord['pp30Status']) => {
    if (!status) return <Text c="dimmed">-</Text>
    return getStatusBadge(status)
  }, [getStatusBadge])

  // ✅ Performance Optimization: Memoized Table Row Component
  // ✅ Acknowledgment: ส่ง record ทั้งก้อนเพื่อให้หน้า parent ตรวจ hasAcknowledgmentData ก่อนเปิดฟอร์ม
  const handleSelectCompanyClick = useCallback((record: TaxStatusRecord) => {
    if (!record?.build) return
    if (!onSelectCompany) return
    onSelectCompany(record)
  }, [onSelectCompany])

  // ✅ FIX: ใช้ render function แทน memo component ที่สร้างภายใน function body
  // (การใช้ memo() ภายใน function body เป็น anti-pattern ที่ทำให้ React สร้าง component ใหม่ทุกครั้ง)
  const renderTableRow = (record: TaxStatusRecord) => {
    const pndDates: string[] = []
    if (record.pndSentForReviewDate) {
      pndDates.push(`วันที่ส่งตรวจ ภ.ง.ด.: ${record.pndSentForReviewDate}`)
    }
    if (record.pndReviewReturnedDate) {
      pndDates.push(`วันที่ส่งตรวจคืน ภ.ง.ด.: ${record.pndReviewReturnedDate}`)
    }
    if (record.pndSentToCustomerDate) {
      pndDates.push(`วันที่ส่งลูกค้า ภ.ง.ด.: ${record.pndSentToCustomerDate}`)
    }
    const pndDatesText = pndDates.length > 0 ? pndDates.join('\n') : '-'

    const pp30Dates: string[] = []
    if (record.pp30SentForReviewDate) {
      pp30Dates.push(`วันที่ส่งตรวจ ภ.พ.30: ${record.pp30SentForReviewDate}`)
    }
    if (record.pp30ReviewReturnedDate) {
      pp30Dates.push(`วันที่ส่งตรวจคืน ภ.พ.30: ${record.pp30ReviewReturnedDate}`)
    }
    if (record.pp30SentToCustomerDate) {
      pp30Dates.push(`วันที่ส่งลูกค้า ภ.พ.30: ${record.pp30SentToCustomerDate}`)
    }
    const pp30DatesText = pp30Dates.length > 0 ? pp30Dates.join('\n') : '-'
    const filterMode = filters?.filterMode

    return (
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
            left: buildColumnWidth,
            zIndex: 10,
            backgroundColor: '#fff',
            borderRight: '1px solid #dee2e6',
            minWidth: 200,
          }}
        >
          {record.companyName}
        </Table.Td>
        {filterMode !== 'vat' && (
          <Table.Td style={{ minWidth: 200, whiteSpace: 'nowrap' }}>
            {pndDatesText === '-' ? (
              <Text size="sm" c="dimmed">-</Text>
            ) : (
              formatTextWithHighlight(pndDatesText)
            )}
          </Table.Td>
        )}
        {filterMode !== 'vat' && (
          <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPndStatusBadge(record.pndStatus)}</Table.Td>
        )}
        {filterMode !== 'wht' && (
          <Table.Td style={{ minWidth: 200, whiteSpace: 'nowrap' }}>
            {pp30DatesText === '-' ? (
              <Text size="sm" c="dimmed">-</Text>
            ) : (
              formatTextWithHighlight(pp30DatesText)
            )}
          </Table.Td>
        )}
        {filterMode !== 'wht' && (
          <Table.Td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{getPp30StatusBadge(record.pp30Status)}</Table.Td>
        )}
        {filterMode !== 'wht' && (
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
            onClick={(e) => {
              e.stopPropagation()
              handleSelectCompanyClick(record)
            }}
            style={{ backgroundColor: '#ff6b35', color: 'white' }}
            disabled={!record.build}
          >
            เลือกบริษัทนี้
          </Button>
        </Table.Td>
      </Table.Tr>
    )
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
    const isNetworkError =
      (error as Error)?.message?.includes('Network Error') ||
      (error as Error & { code?: string })?.code === 'ERR_NETWORK' ||
      (error as Error & { code?: string })?.code === 'ERR_CONNECTION_REFUSED' ||
      (error as Error)?.message?.includes('ERR_CONNECTION_REFUSED') ||
      (error as Error)?.message?.includes('ERR_SOCKET_NOT_CONNECTED')

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

  if (tableData.length === 0) {
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
      {/* Verification Alert */}
      {verificationResult && !verificationResult.isValid && verificationMismatches.length > 0 && (
        <Alert
          icon={<TbAlertTriangle size={16} />}
          color="red"
          title="พบข้อมูลไม่ตรงกับฐานข้อมูล"
          mb="md"
          style={{ margin: '16px' }}
        >
          <Text size="sm" mb="xs">
            พบ {verificationResult.summary.invalidCount} รายการที่ไม่ตรงกับฐานข้อมูล:
          </Text>
          <Stack gap="xs">
            {verificationMismatches.map((mismatch, index) => (
              <Text key={index} size="xs" c="dimmed">
                • Build {mismatch.build}: {mismatch.field} - แสดง: {mismatch.displayedValue || '(ว่าง)'},
                ฐานข้อมูล: {mismatch.databaseValue || '(ว่าง)'}
                <Badge size="xs" color={mismatch.severity === 'high' ? 'red' : mismatch.severity === 'medium' ? 'yellow' : 'gray'} ml="xs">
                  {mismatch.severity}
                </Badge>
              </Text>
            ))}
          </Stack>
          <Group mt="md">
            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<TbRefresh size={14} />}
              onClick={handleVerifyData}
              disabled={isVerifying}
            >
              ตรวจสอบอีกครั้ง
            </Button>
          </Group>
        </Alert>
      )}

      {/* Verification Button & Console Logging Toggle */}
      <Group justify="flex-end" p="md" pb="xs" gap="xs">
        <Tooltip label={isConsoleLoggingEnabled ? 'ปิดการแสดงข้อมูลใน Console Log' : 'เปิดการแสดงข้อมูลใน Console Log'}>
          <Button
            size="xs"
            variant={isConsoleLoggingEnabled ? 'filled' : 'light'}
            color={isConsoleLoggingEnabled ? 'green' : 'gray'}
            leftSection={<TbTerminal2 size={14} />}
            onClick={() => {
              setIsConsoleLoggingEnabled(!isConsoleLoggingEnabled)
              if (!isConsoleLoggingEnabled) {
                notifications.show({
                  title: 'เปิดการแสดง Console Log',
                  message: 'ข้อมูลจากฐานข้อมูลจะแสดงใน Console (กด F12 เพื่อเปิด Developer Tools)',
                  color: 'blue',
                  icon: <TbTerminal2 size={16} />,
                  autoClose: 3000,
                })
              } else {
                notifications.show({
                  title: 'ปิดการแสดง Console Log',
                  message: 'หยุดการแสดงข้อมูลใน Console แล้ว',
                  color: 'gray',
                  icon: <TbTerminal2 size={16} />,
                  autoClose: 2000,
                })
              }
            }}
          >
            {isConsoleLoggingEnabled ? 'ปิด Console Log' : 'เปิด Console Log'}
          </Button>
        </Tooltip>
        <Tooltip label="ตรวจสอบว่าข้อมูลที่แสดงในตารางตรงกับฐานข้อมูลหรือไม่">
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={isVerifying ? <Loader size={14} /> : <TbCheck size={14} />}
            onClick={handleVerifyData}
            disabled={isVerifying || isLoading || !taxDataResponse?.data || taxDataResponse.data.length === 0}
          >
            {isVerifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
          </Button>
        </Tooltip>
      </Group>

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
                ref={buildHeaderRef}
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
                  left: buildColumnWidth,
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
              {filters?.filterMode !== 'vat' && (
                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pnd_sent_for_review_date')}>
                  <Group gap={4} wrap="nowrap">
                    วันที่สถานะ ภ.ง.ด.
                    {sortBy === 'pnd_sent_for_review_date' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'vat' && (
                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pnd_status')}>
                  <Group gap={4} wrap="nowrap">
                    สถานะ ภ.ง.ด.
                    {sortBy === 'pnd_status' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_sent_for_review_date')}>
                  <Group gap={4} wrap="nowrap">
                    วันที่สถานะ ภ.พ.30
                    {sortBy === 'pp30_sent_for_review_date' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_form')}>
                  <Group gap={4} wrap="nowrap">
                    สถานะ ภ.พ.30
                    {sortBy === 'pp30_form' && (
                      <Text size="xs" c="orange" fw={700}>{sortOrder === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
              )}
              {filters?.filterMode !== 'wht' && (
                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onSortChange?.('pp30_payment_status')}>
                  <Group gap={4} wrap="nowrap">
                    สถานะยอดชำระ ภ.พ.30
                    {sortBy === 'pp30_payment_status' && (
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
            {tableData.map((record) => renderTableRow(record))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  )
})

export default TaxStatusTable
