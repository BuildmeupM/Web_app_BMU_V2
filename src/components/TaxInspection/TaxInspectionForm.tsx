import { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal, Stack, Group, Text, TextInput, Select, Textarea, Button, Tabs, Card, SimpleGrid, ScrollArea, Loader, Alert, ActionIcon, List } from '@mantine/core'
import { isApiError, isNetworkError, getErrorMessage } from '../../types/errors'
import { DatePickerInput, DateValue } from '@mantine/dates'
import {
  TbBuilding,
  TbId,
  TbMapPin,
  TbFileText,
  TbUser,
  TbCalendar,
  TbWorld,
  TbFileInvoice,
  TbClock,
  TbMessageCircle,
  TbAlertCircle,
  TbCheck,
  TbRefresh,
  TbInfoCircle,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient, useQueries, type QueryKey } from 'react-query'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import { derivePp30Status } from '../../utils/pp30StatusUtils'
import monthlyTaxDataService, { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import clientsService from '../../services/clientsService'
import { employeeService, Employee } from '../../services/employeeService'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { formatTimestampUTCForAPI, convertUTCToLocalTimeString, formatDateTimeNoConversion } from '../../utils/dateTimeUtils'

dayjs.extend(utc)
dayjs.extend(timezone)

interface TaxInspectionFormProps {
  opened: boolean
  onClose: () => void
  buildId?: string
  readOnlyGeneralInfo?: boolean // ถ้าเป็น true จะทำให้ Tab "ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท" เป็น read-only
  sourcePage?: 'taxInspection' | 'taxStatus' | 'taxFiling' // ระบุว่าฟอร์มเปิดจากหน้าอะไร
  wht_filer_employee_id?: string // employee_id ของผู้รับผิดชอบ WHT (deprecated - ไม่ได้ใช้ในการตรวจสอบสิทธิ์แล้ว ใช้ taxData แทน)
  vat_filer_employee_id?: string // employee_id ของผู้รับผิดชอบ VAT (deprecated - ไม่ได้ใช้ในการตรวจสอบสิทธิ์แล้ว ใช้ taxData แทน)
}

export default function TaxInspectionForm({
  opened,
  onClose,
  buildId,
  readOnlyGeneralInfo = false,
  sourcePage = 'taxInspection',
  wht_filer_employee_id: _wht_filer_employee_id, // Deprecated - ไม่ได้ใช้แล้ว
  vat_filer_employee_id: _vat_filer_employee_id, // Deprecated - ไม่ได้ใช้แล้ว
}: TaxInspectionFormProps) {
  // ✅ BUG-158: เพิ่ม logging เพื่อตรวจสอบว่า Modal props ถูกส่งถูกต้องหรือไม่
  useEffect(() => {
    console.log('[TaxInspectionForm] Props changed:', {
      opened,
      buildId,
      sourcePage,
      timestamp: new Date().toISOString(),
    })
  }, [opened, buildId, sourcePage])

  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const currentUserEmployeeId = user?.employee_id || null
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()
  const currentYear = currentTaxMonth.year
  const currentMonth = currentTaxMonth.month

  // Fetch monthly tax data - use tax month (ย้อนหลัง 1 เดือน)
  const { data: taxData, isLoading: isLoadingTaxData, refetch: refetchTaxData } = useQuery(
    ['monthly-tax-data', buildId, currentYear, currentMonth],
    () => monthlyTaxDataService.getByBuildYearMonth(buildId!, currentYear, currentMonth),
    {
      enabled: !!buildId && opened, // ✅ เพิ่มการตรวจสอบ buildId ก่อน query
      staleTime: 0, // ✅ FEATURE-005: ตั้ง staleTime เป็น 0 เพื่อบังคับให้ refetch ทุกครั้งที่เปิด modal
      refetchOnWindowFocus: false, // ไม่ต้อง refetch เมื่อ focus window (ลด unnecessary requests)
      refetchOnMount: true, // ✅ FEATURE-005: ตั้ง refetchOnMount เป็น true เพื่อ refetch ทุกครั้งที่เปิด modal
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      retry: (failureCount, error: unknown) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if (isApiError(error) && error.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
      onSuccess: (data) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:77', message: 'H5: useQuery onSuccess - data received', data: { buildId, pp30_form: data?.pp30_form }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H5' }) }).catch(() => { });
        // #endregion
      },
    }
  )

  // ✅ FEATURE-005: Refetch data when modal opens or buildId changes
  useEffect(() => {
    if (opened && buildId) {
      // Invalidate cache first to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ['monthly-tax-data', buildId, currentYear, currentMonth],
        exact: true,
      })
      // Then refetch
      refetchTaxData()

      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] Refetching data on modal open/buildId change', {
          buildId,
          currentYear,
          currentMonth,
          opened,
        })
      }
    }
  }, [opened, buildId, currentYear, currentMonth, refetchTaxData, queryClient])

  // Fetch client data
  const { data: clientData, isLoading: isLoadingClient } = useQuery(
    ['client', buildId],
    () => clientsService.getByBuild(buildId!),
    {
      enabled: !!buildId && opened, // ✅ เพิ่มการตรวจสอบ buildId ก่อน query
      staleTime: 5 * 60 * 1000,
      retry: false, // ไม่ retry ถ้าเกิด error
    }
  )

  // Fetch employees for dropdowns - Fetch only when needed (backend now includes first_name and nick_name)
  // Note: ถ้า backend ส่ง first_name และ nick_name มาแล้ว อาจไม่จำเป็นต้อง fetch employees list
  const { data: employeesData } = useQuery(
    ['employees-list'],
    () => employeeService.getAll({ limit: 1000, status: 'active' }),
    {
      enabled: false, // ไม่ fetch อัตโนมัติ - ใช้ข้อมูลจาก backend response แทน
      staleTime: 5 * 60 * 1000, // Cache 5 minutes if needed
    }
  )

  // Fetch specific employees needed for nickname lookup (all responsible employees including WHT/VAT filers)
  // This is needed because backend filters employees by logged-in user if not admin
  const employeeIdsToFetch = useMemo(() => {
    const ids: string[] = []
    if (taxData?.accounting_responsible) {
      ids.push(taxData.accounting_responsible)
    }
    if (taxData?.tax_inspection_responsible) {
      ids.push(taxData.tax_inspection_responsible)
    }
    if (taxData?.document_entry_responsible) {
      ids.push(taxData.document_entry_responsible)
    }
    // เพิ่ม WHT filer employee IDs เพื่อให้ formatEmployeeNameWithId หา nickname ได้
    if (taxData?.wht_filer_current_employee_id) {
      ids.push(taxData.wht_filer_current_employee_id)
    }
    if (taxData?.wht_filer_employee_id && taxData.wht_filer_employee_id !== taxData?.wht_filer_current_employee_id) {
      ids.push(taxData.wht_filer_employee_id)
    }
    // เพิ่ม VAT filer employee IDs เพื่อให้ formatEmployeeNameWithId หา nickname ได้
    if (taxData?.vat_filer_current_employee_id) {
      ids.push(taxData.vat_filer_current_employee_id)
    }
    if (taxData?.vat_filer_employee_id && taxData.vat_filer_employee_id !== taxData?.vat_filer_current_employee_id) {
      ids.push(taxData.vat_filer_employee_id)
    }
    // Remove duplicates
    return [...new Set(ids)]
  }, [
    taxData?.accounting_responsible,
    taxData?.tax_inspection_responsible,
    taxData?.document_entry_responsible,
    taxData?.wht_filer_current_employee_id,
    taxData?.wht_filer_employee_id,
    taxData?.vat_filer_current_employee_id,
    taxData?.vat_filer_employee_id,
  ])

  // Fetch individual employees by ID for nickname lookup
  // staleTime ยาว + ไม่ retry เมื่อ 429 เพื่อลดโอกาสโดน rate limit ซ้ำ
  const employeeQueries = useQueries(
    employeeIdsToFetch.map((employeeId) => ({
      queryKey: ['employee', employeeId],
      queryFn: () => employeeService.getById(employeeId),
      enabled: !!employeeId && opened,
      staleTime: 10 * 60 * 1000, // 10 นาที ลดการ refetch บ่อย
      retry: (failureCount: number, error: unknown) => {
        if (isApiError(error) && error.response?.status === 429) return false
        return failureCount < 1
      },
    }))
  )

  // Combine employeesData with individually fetched employees
  const allEmployeesData = useMemo(() => {
    const employees = employeesData?.employees || []
    const fetchedEmployees = employeeQueries
      .map((query) => query.data)
      .filter((emp): emp is Employee => emp !== undefined)

    // Create a map to avoid duplicates
    const employeeMap = new Map<string, Employee>()

    // Add employees from employeesData
    employees.forEach((emp) => {
      employeeMap.set(emp.employee_id, emp)
    })

    // Add/override with individually fetched employees
    fetchedEmployees.forEach((emp) => {
      employeeMap.set(emp.employee_id, emp)
    })

    return {
      employees: Array.from(employeeMap.values()),
      pagination: employeesData?.pagination,
    }
  }, [employeesData, employeeQueries])

  /**
   * Helper function to format employee name with nickname lookup
   * Format: "ชื่อ (ชื่อเล่น)" เช่น "พงษ์สิทธิ์(ปู)" (ตัดนามสกุลออก)
   * Use useCallback to memoize the function so it doesn't cause unnecessary re-renders
   */
  const formatEmployeeNameWithId = useCallback((
    name: string | null | undefined,
    employeeId: string | null | undefined
  ): string => {
    if (!name) return '-'

    // Extract first name only (remove last name)
    // Split by space and take the first part
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0] // Get first name only

    // If name already contains parentheses, extract first name from it
    if (name.includes('(') && name.includes(')')) {
      // Extract first name before parentheses
      const beforeParen = name.split('(')[0].trim()
      const firstNameOnly = beforeParen.split(/\s+/)[0]
      // Extract nickname from parentheses
      const nicknameMatch = name.match(/\(([^)]+)\)/)
      const nickname = nicknameMatch ? nicknameMatch[1] : null
      if (nickname) {
        return `${firstNameOnly}(${nickname})`
      }
      return firstNameOnly
    }

    // Try to find employee by employee_id to get nickname
    // Use allEmployeesData which includes both employeesData and individually fetched employees
    if (employeeId && allEmployeesData?.employees) {
      const employee = allEmployeesData.employees.find(
        (emp) => emp.employee_id === employeeId
      )
      if (employee?.nick_name) {
        // Use first_name if available, otherwise extract from full_name
        const displayName = employee.first_name || firstName
        return `${displayName}(${employee.nick_name})`
      }
    }

    // Return first name only if no nickname found
    return firstName
  }, [allEmployeesData]) // Recreate function when allEmployeesData changes

  // ============================================================================
  // สถานะทั้งหมดที่เป็นไปได้ในระบบ (All Status Options)
  // ============================================================================
  // ⚠️ สำคัญ: รวมทุกสถานะที่อาจมีในฐานข้อมูล เพื่อให้แสดงสถานะทั้งหมด
  // แต่จะ disable สถานะที่ไม่ให้เลือกตามเงื่อนไขของแต่ละหน้า
  const allStatusOptions = [
    // สถานะใหม่ (New Statuses)
    { value: 'received_receipt', label: 'รับใบเสร็จ', color: '#4facfe' }, // Blue
    { value: 'paid', label: 'ชำระแล้ว', color: '#ffc107' }, // Yellow
    { value: 'sent_to_customer', label: 'ส่งลูกค้าแล้ว', color: '#81d4fa' }, // Light Blue
    { value: 'draft_completed', label: 'ร่างแบบเสร็จแล้ว', color: '#ffb74d' }, // Light Orange
    { value: 'passed', label: 'ผ่าน', color: '#4caf50' }, // Green
    { value: 'pending_review', label: 'รอตรวจ', color: '#ff6b35' }, // Orange
    { value: 'pending_recheck', label: 'รอตรวจอีกครั้ง', color: '#f44336' }, // Red
    { value: 'draft_ready', label: 'ร่างแบบได้', color: '#f8bbd9' }, // Soft Pink
    { value: 'needs_correction', label: 'แก้ไข', color: '#f44336' }, // Red
    { value: 'inquire_customer', label: 'สอบถามลูกค้าเพิ่มเติม', color: '#9c27b0' }, // Purple
    { value: 'additional_review', label: 'ตรวจสอบเพิ่มเติม', color: '#81d4fa' }, // Light Blue
    { value: 'not_submitted', label: 'ไม่มียื่น', color: '#000000' }, // Black
  ]

  // ============================================================================
  // สถานะที่เลือกได้ตาม sourcePage (Allowed Statuses by Page)
  // ============================================================================
  // กำหนดสถานะที่แต่ละหน้าสามารถเลือกได้ (ไม่ disabled)
  const allowedStatusesByPage: Record<'taxInspection' | 'taxStatus' | 'taxFiling', string[]> = {
    // หน้าตรวจภาษี (Tax Inspection) - ผู้ตรวจภาษี
    taxInspection: [
      'received_receipt',
      'paid',
      'passed',
      'needs_correction',
      'inquire_customer',
      'additional_review',
      'not_submitted',
    ],
    // หน้าสถานะยื่นภาษี (Tax Status) - ผู้ทำบัญชี
    // ⚠️ สามารถเลือกได้ทุกสถานะ
    taxStatus: [
      'received_receipt',
      'paid',
      'sent_to_customer',
      'draft_completed',
      'passed',
      'pending_review',
      'pending_recheck',
      'draft_ready',
      'needs_correction',
      'inquire_customer',
      'additional_review',
      'not_submitted',
    ],
    // หน้ายื่นภาษี (Tax Filing) - พนักงานยื่นภาษี
    // ⚠️ สำคัญ: พนักงานยื่นภาษีสามารถเลือกได้ 4 สถานะ
    taxFiling: [
      'received_receipt', // รับใบเสร็จ
      'paid', // ชำระแล้ว
      'sent_to_customer', // ส่งลูกค้าแล้ว
      'draft_completed', // ร่างแบบเสร็จแล้ว
    ],
  }

  // ============================================================================
  // Helper Functions สำหรับตรวจสอบสิทธิ์การเลือกสถานะ
  // ============================================================================


  // ============================================================================
  // Validation สำหรับ sourcePage
  // ============================================================================
  // ตรวจสอบว่า sourcePage ถูกต้องหรือไม่
  useEffect(() => {
    const validSourcePages: Array<'taxInspection' | 'taxStatus' | 'taxFiling'> = ['taxInspection', 'taxStatus', 'taxFiling']

    if (!sourcePage || !validSourcePages.includes(sourcePage)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[TaxInspectionForm] Invalid or missing sourcePage:',
          sourcePage,
          'Valid values are:',
          validSourcePages.join(', ')
        )
      }
    }
  }, [sourcePage])

  // ⚠️ หมายเหตุ: ตอนนี้ใช้ allStatusOptions แทน statusOptions ที่แยกตามหน้า
  // เพื่อให้แสดงสถานะทั้งหมดและจัดการ disabled/enabled ตามเงื่อนไข

  // ============================================================================
  // Function to create Select data with disabled options
  // ============================================================================
  // ⚠️ สำคัญ: สำหรับหน้าสถานะยื่นภาษี (taxStatus) - เมื่อผู้ทำบัญชีได้รับสถานะจากผู้ตรวจภาษี
  // Flow การทำงาน:
  // 1. ผู้ทำบัญชีส่ง "รอตรวจ" → ผู้ตรวจภาษีตรวจและส่งสถานะกลับมา (แก้ไข, ผ่าน, สอบถามลูกค้าเพิ่มเติม, ตรวจสอบเพิ่มเติม)
  // 2. ผู้ทำบัญชีได้รับสถานะจากผู้ตรวจภาษี:
  //    - แก้ไข: สามารถเลือก "ผ่าน" (ไม่ต้องส่งตรวจใหม่) หรือ "รอตรวจอีกครั้ง" (ต้องส่งตรวจอีกรอบ)
  //    - สอบถามลูกค้าเพิ่มเติม: สามารถเลือก "รอตรวจอีกครั้ง" (ต้องส่งตรวจอีกรอบ)
  //    - ตรวจสอบเพิ่มเติม: สามารถเลือก "รอตรวจอีกครั้ง" (ต้องส่งตรวจอีกรอบ)
  // 3. เมื่อเลือกสถานะ "รอตรวจอีกครั้ง" แล้ว → ปลดล็อคสถานะเบื้องต้นทั้งหมด (enable ทุกสถานะ) เพื่อให้สามารถแก้ไขได้
  const getSelectData = (currentStatus?: string | null, mainStatus?: string | null) => {
    // ตรวจสอบ sourcePage
    const validSourcePages: Array<'taxInspection' | 'taxStatus' | 'taxFiling'> = ['taxInspection', 'taxStatus', 'taxFiling']
    const currentSourcePage = validSourcePages.includes(sourcePage) ? sourcePage : 'taxInspection'

    const isTaxStatusPage = currentSourcePage === 'taxStatus'
    const allowedStatuses = allowedStatusesByPage[currentSourcePage] || []

    // ตรวจสอบว่าสถานะหลัก (pnd_status หรือ pp30_status) เป็น "รอตรวจอีกครั้ง" หรือไม่
    // ถ้าเป็น "รอตรวจอีกครั้ง" → ปลดล็อคสถานะเบื้องต้นทั้งหมด (enable ทุกสถานะ)
    const isMainStatusPendingRecheck = mainStatus === 'pending_recheck'

    // ตรวจสอบว่าสถานะปัจจุบันเป็นสถานะที่ผู้ตรวจภาษีส่งกลับมาหรือไม่
    const isEditStatus = currentStatus === 'edit' || currentStatus === 'needs_correction'
    const isInquireCustomerStatus = currentStatus === 'inquire_customer'
    const isAdditionalReviewStatus = currentStatus === 'additional_review'

    // สถานะที่ต้อง enable เมื่อสถานะปัจจุบันเป็น "แก้ไข" และอยู่ในหน้าสถานะยื่นภาษี
    // - แก้ไข: สามารถเลือก "ผ่าน" หรือ "รอตรวจอีกครั้ง"
    const allowedStatusesWhenEdit = ['pending_recheck', 'passed']

    // สถานะที่ต้อง enable เมื่อสถานะปัจจุบันเป็น "สอบถามลูกค้าเพิ่มเติม" หรือ "ตรวจสอบเพิ่มเติม"
    // - สอบถามลูกค้าเพิ่มเติม: สามารถเลือก "รอตรวจอีกครั้ง"
    // - ตรวจสอบเพิ่มเติม: สามารถเลือก "รอตรวจอีกครั้ง"
    const allowedStatusesWhenInquireOrReview = ['pending_recheck']

    // ใช้ allStatusOptions แทน statusOptions เพื่อแสดงสถานะทั้งหมด
    // แยกสถานะที่เลือกได้และเลือกไม่ได้ แล้วเรียงให้สถานะที่เลือกได้อยู่ด้านบน
    const enabledOptions: Array<{ value: string; label: string; disabled: boolean }> = []
    const disabledOptions: Array<{ value: string; label: string; disabled: boolean }> = []

    allStatusOptions.forEach((s) => {
      // เริ่มต้นด้วยการตรวจสอบว่าสถานะนี้เลือกได้ตาม sourcePage หรือไม่
      let isDisabled = !allowedStatuses.includes(s.value)

      // Logic พิเศษสำหรับหน้าสถานะยื่นภาษี (taxStatus)
      if (isTaxStatusPage) {
        // กรณีที่ 1: ถ้าสถานะหลักเป็น "รอตรวจอีกครั้ง" → ปลดล็อคสถานะเบื้องต้นทั้งหมด (enable ทุกสถานะ)
        // เพื่อให้สามารถแก้ไขสถานะเบื้องต้นได้
        if (isMainStatusPendingRecheck) {
          isDisabled = false // Enable ทุกสถานะเมื่อสถานะหลักเป็น "รอตรวจอีกครั้ง"
        }
        // กรณีที่ 2: ถ้าสถานะปัจจุบันเป็น "แก้ไข" → enable "รอตรวจอีกครั้ง" และ "ผ่าน"
        else if (isEditStatus && allowedStatusesWhenEdit.includes(s.value)) {
          isDisabled = false // Enable สถานะเหล่านี้เมื่อสถานะปัจจุบันเป็น "แก้ไข"
        }
        // กรณีที่ 3: ถ้าสถานะปัจจุบันเป็น "สอบถามลูกค้าเพิ่มเติม" หรือ "ตรวจสอบเพิ่มเติม" → enable "รอตรวจอีกครั้ง"
        else if (
          (isInquireCustomerStatus || isAdditionalReviewStatus) &&
          allowedStatusesWhenInquireOrReview.includes(s.value)
        ) {
          isDisabled = false // Enable "รอตรวจอีกครั้ง" เมื่อสถานะปัจจุบันเป็น "สอบถามลูกค้าเพิ่มเติม" หรือ "ตรวจสอบเพิ่มเติม"
        }
      }

      const option = {
        value: s.value,
        label: s.label,
        disabled: isDisabled,
      }

      // แยกสถานะที่เลือกได้และเลือกไม่ได้
      if (isDisabled) {
        disabledOptions.push(option)
      } else {
        enabledOptions.push(option)
      }
    })

    // เรียงให้สถานะที่เลือกได้อยู่ด้านบน สถานะที่เลือกไม่ได้อยู่ด้านล่าง
    return [...enabledOptions, ...disabledOptions]
  }

  // Function to get status color for WHT forms
  // ใช้ allStatusOptions เพื่อให้สามารถหา color ของสถานะทั้งหมดได้
  const getWhtStatusColor = (value: string | null) => {
    if (!value) return '#ffffff' // White background when no selection
    const status = allStatusOptions.find((s) => s.value === value)
    return status?.color || '#ffffff'
  }

  // Function to get border color for Select (black when no selection, status color when selected)
  const getSelectBorderColor = (value: string | null) => {
    if (!value) return '#000000' // Black border when no selection
    return getWhtStatusColor(value)
  }

  // State for form values to track changes
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [numberValues, setNumberValues] = useState<Record<string, string>>({})

  // State to track original status values for auto-timestamp logic
  const [originalPndStatus, setOriginalPndStatus] = useState<string | null>(null)
  const [originalPp30Status, setOriginalPp30Status] = useState<string | null>(null)

  // State for WHT inquiry and reply
  const [whtInquiry, setWhtInquiry] = useState<string>('')
  const [whtReply, setWhtReply] = useState<string>('')

  // State for VAT inquiry and reply
  const [vatInquiry, setVatInquiry] = useState<string>('')
  const [vatReply, setVatReply] = useState<string>('')

  // State for tax filing team communication (WHT)
  const [taxFilingComment, setTaxFilingComment] = useState<string>('')
  const [taxFilingReply, setTaxFilingReply] = useState<string>('')

  // State for VAT tax filing team communication
  const [vatFilingComment, setVatFilingComment] = useState<string>('')
  const [vatFilingReply, setVatFilingReply] = useState<string>('')

  // State for VAT form data
  const [purchaseDocuments, setPurchaseDocuments] = useState<string>('')
  const [confirmIncome, setConfirmIncome] = useState<string>('')
  const [confirmIncomeStatus, setConfirmIncomeStatus] = useState<string | null>(null)
  const [confirmExpensesStatus, setConfirmExpensesStatus] = useState<string | null>(null)
  const [pp30PaymentStatus, setPp30PaymentStatus] = useState<string | null>(null)
  const [pp30PaymentAmount, setPp30PaymentAmount] = useState<string>('')

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('general')

  // Check if VAT registration is enabled (จดภาษีมูลค่าเพิ่ม)
  // ตรวจสอบว่า user เป็น wht_filer หรือ vat_filer (สำหรับหน้ายื่นภาษี)
  const isWhtFiler = useMemo(() => {
    if (sourcePage !== 'taxFiling' || !currentUserEmployeeId || !taxData) return false
    // ตรวจสอบว่า user เป็น wht_filer โดยเปรียบเทียบกับ wht_filer_employee_id หรือ wht_filer_current_employee_id จาก taxData เท่านั้น
    // ไม่ใช้ wht_filer_employee_id prop เพราะอาจเป็นค่าเดียวกันกับ vat_filer_employee_id
    return (
      taxData.wht_filer_employee_id === currentUserEmployeeId ||
      taxData.wht_filer_current_employee_id === currentUserEmployeeId
    )
  }, [sourcePage, currentUserEmployeeId, taxData])

  const isVatFiler = useMemo(() => {
    if (sourcePage !== 'taxFiling' || !currentUserEmployeeId || !taxData) return false
    // ตรวจสอบว่า user เป็น vat_filer โดยเปรียบเทียบกับ vat_filer_employee_id หรือ vat_filer_current_employee_id จาก taxData เท่านั้น
    // ไม่ใช้ vat_filer_employee_id prop เพราะอาจเป็นค่าเดียวกันกับ wht_filer_employee_id
    return (
      taxData.vat_filer_employee_id === currentUserEmployeeId ||
      taxData.vat_filer_current_employee_id === currentUserEmployeeId
    )
  }, [sourcePage, currentUserEmployeeId, taxData])

  const isVatRegistered = useMemo(() => {
    return clientData?.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'
  }, [clientData?.tax_registration_status])

  // Options for Confirm Income Status (สำหรับหน้าสถานะยื่นภาษี)
  const confirmIncomeOptions = [
    { value: 'customer_confirmed', label: 'ลูกค้าคอนเฟิร์ม', color: '#4caf50' }, // Green
    { value: 'no_confirmation_needed', label: 'ไม่ต้องคอนเฟิร์มลูกค้า', color: '#ff6b35' }, // Orange
    { value: 'waiting_customer', label: 'รอลูกค้าคอนเฟิร์ม', color: '#ffc107' }, // Yellow
    { value: 'customer_request_change', label: 'ลูกค้าให้แก้รายได้', color: '#f44336' }, // Red
  ]

  // Options for Confirm Expenses (คอนเฟิร์มค่าใช้จ่าย) - แนบของยื่นแบบภาษีมูลค่าเพิ่ม
  const confirmExpensesOptions = [
    { value: 'confirm_expense', label: 'ลูกค้าคอนเฟิร์มค่าใช้จ่าย', color: '#4caf50' },
    { value: 'customer_request_additional_docs', label: 'ลูกค้าแจ้งเพิ่มเอกสาร', color: '#ffc107' },
  ]
  const getConfirmExpensesColor = (value: string | null): string => {
    if (!value) return '#ffffff'
    const status = confirmExpensesOptions.find((s) => s.value === value)
    return status?.color || '#ffffff'
  }

  // Helper function to get confirm income status color
  const getConfirmIncomeColor = (value: string | null): string => {
    if (!value) return '#ffffff'
    const status = confirmIncomeOptions.find((s) => s.value === value)
    return status?.color || '#ffffff'
  }

  // State for General Information Tab
  const [documentReceiptDate, setDocumentReceiptDate] = useState<DateValue>(null)
  const [documentStatus, setDocumentStatus] = useState<string | null>(null)
  const [accountingStatus, setAccountingStatus] = useState<string | null>(null)
  const [bankStatementStatus, setBankStatementStatus] = useState<string | null>(null)
  const [monthlyTaxImpact, setMonthlyTaxImpact] = useState<string | null>(null)
  const [bankImpact, setBankImpact] = useState<string | null>(null)

  // Reset active tab when form opens
  // สำหรับหน้ายื่นภาษี: ถ้าเป็น VAT filer ให้เริ่มที่แถบ VAT, ถ้าเป็น WHT filer ให้เริ่มที่แถบ WHT
  useEffect(() => {
    if (opened) {
      if (sourcePage === 'taxFiling' && taxData && currentUserEmployeeId) {
        // ตรวจสอบว่าเป็น VAT filer หรือ WHT filer
        const isVatFilerCheck =
          taxData.vat_filer_employee_id === currentUserEmployeeId ||
          taxData.vat_filer_current_employee_id === currentUserEmployeeId
        const isWhtFilerCheck =
          taxData.wht_filer_employee_id === currentUserEmployeeId ||
          taxData.wht_filer_current_employee_id === currentUserEmployeeId

        if (isVatFilerCheck && !isWhtFilerCheck) {
          // VAT filer เท่านั้น → เริ่มที่แถบ VAT
          setActiveTab('debtor')
        } else if (isWhtFilerCheck && !isVatFilerCheck) {
          // WHT filer เท่านั้น → เริ่มที่แถบ WHT
          setActiveTab('vat')
        } else {
          // ทั้งสองหรือไม่มี → เริ่มที่แถบ general
          setActiveTab('general')
        }
      } else {
        setActiveTab('general')
      }
    }
  }, [opened, sourcePage, taxData, currentUserEmployeeId])

  // Initialize form data from API
  // ⚠️ สำคัญ: Initialize เฉพาะเมื่อ modal เปิดครั้งแรก (opened เปลี่ยนจาก false เป็น true)
  // เพื่อป้องกันการ override ค่าที่ผู้ใช้กรอกเมื่อบันทึกสำเร็จ
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    // Reset initialization flag when modal closes
    if (!opened) {
      setHasInitialized(false)
      return
    }

    // Initialize เฉพาะเมื่อ modal เปิดครั้งแรก
    if (taxData && !hasInitialized) {
      setHasInitialized(true)
      const data = taxData
      // Initialize dates
      if (data.document_received_date) {
        setDocumentReceiptDate(dayjs(data.document_received_date).toDate())
      }
      // Initialize statuses
      setDocumentStatus(data.document_received_date ? 'received' : null)
      setAccountingStatus(data.accounting_record_status || null)
      setBankStatementStatus(data.bank_statement_status || null)
      setMonthlyTaxImpact(data.monthly_tax_impact || null)
      setBankImpact(data.bank_impact || null)
      // Initialize WHT fields
      // ⚠️ สำคัญ: ใช้ pnd_status จากฐานข้อมูลเป็นหลัก (เพราะ backend จะอัพเดท pnd_status เมื่อบันทึกข้อมูล)
      // แต่ถ้า pnd_status เป็น null หรือว่าง ให้ map จาก fields อื่นๆ ตามลำดับความสำคัญ
      let pndStatus: string | null = data.pnd_status || null

      // ถ้า pnd_status เป็น null หรือว่าง ให้ map จาก fields อื่นๆ
      if (!pndStatus || pndStatus.trim() === '') {
        // Map จาก fields ตามลำดับความสำคัญ (เหมือน pp30_status)
        if (data.wht_filing_response) {
          pndStatus = 'paid' // ถ้ามี filing response แสดงว่าชำระแล้ว
        } else if (data.pnd_sent_to_customer_date) {
          pndStatus = 'sent_to_customer' // ถ้ามีวันที่ส่งลูกค้า แสดงว่าส่งลูกค้าแล้ว
        } else if (data.pnd_review_returned_date) {
          pndStatus = 'pending_recheck' // ถ้ามี review_returned_date แสดงว่ารอตรวจอีกครั้ง
        } else if (data.pnd_sent_for_review_date) {
          pndStatus = 'pending_review' // ถ้ามี sent_for_review_date แสดงว่ารอตรวจ
        } else if (data.wht_draft_completed_date) {
          pndStatus = 'draft_completed' // ถ้ามีวันที่ร่างแบบเสร็จแล้ว แสดงว่าร่างแบบเสร็จแล้ว
        } else {
          pndStatus = null
        }
      } else {
        // แปลงสถานะเก่าเป็นสถานะใหม่ (backward compatibility)
        const statusMapping: Record<string, string> = {
          'receipt': 'received_receipt',
          'inquiry': 'inquire_customer',
          'review': 'additional_review',
          'edit': 'needs_correction',
        }
        pndStatus = statusMapping[pndStatus] || pndStatus
      }
      setFormValues((prev) => ({
        ...prev,
        pnd_status: pndStatus || '',
        // ⚠️ สำคัญ: แปลง UTC timestamp จาก API เป็น local time string ก่อนเก็บใน formValues
        // เพื่อให้ DatePickerInput แสดงเวลาไทย (UTC+7) ถูกต้อง
        pnd_sent_date: data.pnd_sent_for_review_date ? formatDateTimeNoConversion(data.pnd_sent_for_review_date) : '',
        pnd_return_date: data.pnd_review_returned_date ? formatDateTimeNoConversion(data.pnd_review_returned_date) : '',
        pnd_customer_sent_date: data.pnd_sent_to_customer_date ? formatDateTimeNoConversion(data.pnd_sent_to_customer_date) : '',
      }))
      // Store original PND status for auto-timestamp logic
      setOriginalPndStatus(pndStatus || '')
      setWhtInquiry(data.wht_inquiry != null ? String(data.wht_inquiry) : '')
      setWhtReply(data.wht_response != null ? String(data.wht_response) : '')
      setTaxFilingComment(data.wht_submission_comment != null ? String(data.wht_submission_comment) : '')
      setTaxFilingReply(data.wht_filing_response != null ? String(data.wht_filing_response) : '')

      // Log WHT data from API (สำหรับแถบ WHT)
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] ข้อมูล WHT ที่ได้จาก API เมื่อเปิดฟอร์ม:', {
          buildId: buildId,
          pnd_status: data.pnd_status,
          pnd_sent_for_review_date: data.pnd_sent_for_review_date,
          pnd_review_returned_date: data.pnd_review_returned_date,
          pnd_sent_to_customer_date: data.pnd_sent_to_customer_date,
          wht_draft_completed_date: data.wht_draft_completed_date,
          wht_filing_response: data.wht_filing_response,
          wht_inquiry: data.wht_inquiry,
          wht_response: data.wht_response,
          wht_submission_comment: data.wht_submission_comment,
          wht_filer_employee_id: data.wht_filer_employee_id,
          wht_filer_current_employee_id: data.wht_filer_current_employee_id,
          wht_filer_employee_name: data.wht_filer_employee_name,
          wht_filer_current_employee_name: data.wht_filer_current_employee_name,
          wht_filer_employee_first_name: data.wht_filer_employee_first_name,
          wht_filer_current_employee_first_name: data.wht_filer_current_employee_first_name,
          wht_filer_employee_nick_name: data.wht_filer_employee_nick_name,
          wht_filer_current_employee_nick_name: data.wht_filer_current_employee_nick_name,
        })
      }

      // Log derived PND status (สำหรับแถบ WHT)
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] สถานะ PND ที่ derive ได้ (สำหรับแถบ WHT):', {
          pndStatus: pndStatus || '(ว่าง)',
          hasPndStatus: !!data.pnd_status,
          pnd_sent_for_review_date: data.pnd_sent_for_review_date || null,
          pnd_review_returned_date: data.pnd_review_returned_date || null,
          pnd_sent_to_customer_date: data.pnd_sent_to_customer_date || null,
          wht_draft_completed_date: data.wht_draft_completed_date || null,
        })
      }

      // Initialize VAT fields - ใช้ pp30_form จาก API โดยตรง (single source of truth)
      // ⚠️ สำคัญ: ตรวจสอบข้อมูลที่ได้จาก API ก่อน derive สถานะ
      // ⚠️ สำคัญ: หลัง migration 028, pp30_form เป็น VARCHAR(100) ที่เก็บสถานะโดยตรง
      // - Backend ส่งเฉพาะ pp30_form แล้ว ไม่ส่ง pp30_status
      // - ถ้ามี pp30_form และไม่ใช่ boolean (0/1) → ใช้ค่าจาก pp30_form โดยตรง
      // - ถ้าไม่มี: ใช้ derivePp30Status เพื่อ derive จาก timestamp fields
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] ข้อมูล VAT/PP30 ที่ได้จาก API เมื่อเปิดฟอร์ม:', {
          buildId: buildId,
          pp30_form: data.pp30_form,
          pp30_filing_response: data.pp30_filing_response,
          pp30_sent_to_customer_date: data.pp30_sent_to_customer_date,
          pp30_review_returned_date: data.pp30_review_returned_date,
          pp30_sent_for_review_date: data.pp30_sent_for_review_date,
          vat_draft_completed_date: data.vat_draft_completed_date,
        })
      }
      // ⚠️ สำคัญ: ใช้ pp30_form จาก API โดยตรง (backend ส่งเฉพาะ pp30_form แล้ว ไม่ส่ง pp30_status)
      // ถ้าไม่มี pp30_form → ใช้ derivePp30Status เพื่อ derive จาก timestamp fields
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:660', message: 'H2: API response received', data: { buildId, pp30_form: data.pp30_form, pp30_form_type: typeof data.pp30_form, pp30_form_is_null: data.pp30_form === null, pp30_form_is_undefined: data.pp30_form === undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H2' }) }).catch(() => { });
      // #endregion
      let pp30Status = ''
      const pp30FormValue = data.pp30_form
      if (pp30FormValue != null && String(pp30FormValue).trim() !== '' && String(pp30FormValue) !== '0' && String(pp30FormValue) !== '1') {
        // ใช้ pp30_form โดยตรง (หลัง migration 028) - backend ส่งเฉพาะ pp30_form แล้ว
        pp30Status = String(data.pp30_form).trim()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:665', message: 'H3: Using pp30_form from API', data: { buildId, pp30Status, source: 'pp30_form' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) }).catch(() => { });
        // #endregion
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionForm] ใช้ pp30_form จาก API โดยตรง:', {
            pp30Status,
            source: 'pp30_form',
          })
        }
      } else {
        // Derive จาก timestamp fields (fallback)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:677', message: 'H4: Deriving from timestamps', data: { buildId, pp30_form: data.pp30_form, pp30_review_returned_date: data.pp30_review_returned_date }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H4' }) }).catch(() => { });
        // #endregion
        pp30Status = derivePp30Status(data) || ''
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:679', message: 'H4: Derived status result', data: { buildId, pp30Status, source: 'derivePp30Status' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H4' }) }).catch(() => { });
        // #endregion
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionForm] สถานะที่ derive ได้จาก timestamp fields:', {
            pp30Status,
            source: 'derivePp30Status',
            hasPp30Form: !!data.pp30_form,
          })
        }
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:689', message: 'H3: Final pp30Status before setFormValues', data: { buildId, pp30Status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) }).catch(() => { });
      // #endregion
      setFormValues((prev) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:712', message: 'H3: Setting formValues.pp30_status', data: { buildId, pp30Status, prev_pp30_status: prev.pp30_status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) }).catch(() => { });
        // #endregion
        return {
          ...prev,
          pp30_status: pp30Status,
          // ⚠️ สำคัญ: แปลง UTC timestamp จาก API เป็น local time string ก่อนเก็บใน formValues
          // เพื่อให้ DatePickerInput แสดงเวลาไทย (UTC+7) ถูกต้อง
          pp30_sent_date: data.pp30_sent_for_review_date ? formatDateTimeNoConversion(data.pp30_sent_for_review_date) : '',
          pp30_return_date: data.pp30_review_returned_date ? formatDateTimeNoConversion(data.pp30_review_returned_date) : '',
          pp30_customer_sent_date: data.pp30_sent_to_customer_date ? formatDateTimeNoConversion(data.pp30_sent_to_customer_date) : '',
        }
      })
      // Store original PP30 status for auto-timestamp logic
      setOriginalPp30Status(pp30Status)
      setVatInquiry(data.pp30_inquiry != null ? String(data.pp30_inquiry) : '')
      setVatReply(data.pp30_response != null ? String(data.pp30_response) : '')
      setVatFilingComment(data.pp30_submission_comment != null ? String(data.pp30_submission_comment) : '')
      setVatFilingReply(data.pp30_filing_response != null ? String(data.pp30_filing_response) : '')
      // Initialize purchase_document_count
      const purchaseDocCount = data.purchase_document_count
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] ข้อมูล purchase_document_count และ income_confirmed ที่ได้จาก API:', {
          buildId: buildId,
          purchase_document_count_raw: purchaseDocCount,
          purchase_document_count_type: typeof purchaseDocCount,
          purchase_document_count_is_null: purchaseDocCount === null,
          purchase_document_count_is_undefined: purchaseDocCount === undefined,
          purchase_document_count_string: purchaseDocCount?.toString(),
          income_confirmed_raw: data.income_confirmed,
          income_confirmed_type: typeof data.income_confirmed,
          income_confirmed_is_null: data.income_confirmed === null,
          income_confirmed_is_undefined: data.income_confirmed === undefined,
        })
      }
      setPurchaseDocuments(purchaseDocCount !== null && purchaseDocCount !== undefined ? purchaseDocCount.toString() : '')
      // Initialize income_confirmed status
      // income_confirmed is now VARCHAR(100) storing enum string directly
      const incomeConfirmedValue = data.income_confirmed || null
      setConfirmIncomeStatus(incomeConfirmedValue)
      // Map enum value to label for display
      if (incomeConfirmedValue) {
        const incomeConfirmedOption = confirmIncomeOptions.find((opt) => opt.value === incomeConfirmedValue)
        setConfirmIncome(incomeConfirmedOption?.label || '')
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionForm] income_confirmed mapped to label:', {
            value: incomeConfirmedValue,
            label: incomeConfirmedOption?.label,
            found: !!incomeConfirmedOption,
          })
        }
      } else {
        setConfirmIncome('')
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionForm] income_confirmed is null/undefined, setting to empty string')
        }
      }
      setConfirmExpensesStatus(data.expenses_confirmed || null)
      // Initialize pp30_payment_status and pp30_payment_amount
      setPp30PaymentStatus(data.pp30_payment_status || null)
      setPp30PaymentAmount(data.pp30_payment_amount?.toString() || '')
      // Initialize tax form statuses
      // แปลงสถานะเก่าเป็นสถานะใหม่ (backward compatibility)
      const statusMapping: Record<string, string> = {
        'receipt': 'received_receipt',
        'inquiry': 'inquire_customer',
        'review': 'additional_review',
        'edit': 'needs_correction',
      }
      const mapStatus = (status: string | null | undefined): string => {
        if (!status) return ''
        return statusMapping[status] || status
      }
      setFormValues((prev) => ({
        ...prev,
        pnd1_40_1: mapStatus(data.pnd_1_40_1_status),
        pnd1_40_2: mapStatus(data.pnd_1_40_2_status),
        pnd3: mapStatus(data.pnd_3_status),
        pnd53: mapStatus(data.pnd_53_status),
        pp36: mapStatus(data.pp_36_status),
        student_loan: mapStatus(data.student_loan_form_status),
        pnd2: mapStatus(data.pnd_2_status),
        pnd54: mapStatus(data.pnd_54_status),
        pth40: mapStatus(data.pt_40_status),
        social_security: mapStatus(data.social_security_form_status),
      }))
      // Initialize tax form attachment counts
      // ถ้าไม่มีข้อมูลในฐานข้อมูล หรือค่าเป็น 0 ให้แสดงค่าว่าง (ไม่ใช่ 0)
      setNumberValues((prev) => ({
        ...prev,
        pnd1_40_1: data.pnd_1_40_1_attachment_count !== null && data.pnd_1_40_1_attachment_count !== undefined && data.pnd_1_40_1_attachment_count > 0 ? data.pnd_1_40_1_attachment_count.toString() : '',
        pnd1_40_2: data.pnd_1_40_2_attachment_count !== null && data.pnd_1_40_2_attachment_count !== undefined && data.pnd_1_40_2_attachment_count > 0 ? data.pnd_1_40_2_attachment_count.toString() : '',
        pnd3: data.pnd_3_attachment_count !== null && data.pnd_3_attachment_count !== undefined && data.pnd_3_attachment_count > 0 ? data.pnd_3_attachment_count.toString() : '',
        pnd53: data.pnd_53_attachment_count !== null && data.pnd_53_attachment_count !== undefined && data.pnd_53_attachment_count > 0 ? data.pnd_53_attachment_count.toString() : '',
        pp36: data.pp_36_attachment_count !== null && data.pp_36_attachment_count !== undefined && data.pp_36_attachment_count > 0 ? data.pp_36_attachment_count.toString() : '',
        student_loan: data.student_loan_form_attachment_count !== null && data.student_loan_form_attachment_count !== undefined && data.student_loan_form_attachment_count > 0 ? data.student_loan_form_attachment_count.toString() : '',
        pnd2: data.pnd_2_attachment_count !== null && data.pnd_2_attachment_count !== undefined && data.pnd_2_attachment_count > 0 ? data.pnd_2_attachment_count.toString() : '',
        pnd54: data.pnd_54_attachment_count !== null && data.pnd_54_attachment_count !== undefined && data.pnd_54_attachment_count > 0 ? data.pnd_54_attachment_count.toString() : '',
        pth40: data.pt_40_attachment_count !== null && data.pt_40_attachment_count !== undefined && data.pt_40_attachment_count > 0 ? data.pt_40_attachment_count.toString() : '',
        social_security: data.social_security_form_attachment_count !== null && data.social_security_form_attachment_count !== undefined && data.social_security_form_attachment_count > 0 ? data.social_security_form_attachment_count.toString() : '',
      }))
      // Log สถานะที่แสดงในฟอร์มเมื่อเปิด (สำหรับ debug)
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] ข้อมูลที่ได้จาก API เมื่อเปิดฟอร์ม (ทั้งหมด):', {
          buildId: data.build,
          sourcePage,
          // VAT/PP30 Fields
          purchase_document_count: data.purchase_document_count ?? '(null/undefined)',
          income_confirmed: data.income_confirmed ?? '(null/undefined)',
          pp30_payment_status: data.pp30_payment_status ?? '(null/undefined)',
          pp30_payment_amount: data.pp30_payment_amount ?? '(null/undefined)',
          pp30_status: pp30Status || '(ว่าง)',
          pp30_form: data.pp30_form ?? '(null/undefined)',
          pp30_filing_response: data.pp30_filing_response ?? '(null/undefined)',
          pp30_sent_date: data.pp30_sent_for_review_date || '(ว่าง)',
          pp30_return_date: data.pp30_review_returned_date || '(ว่าง)',
          pp30_customer_sent_date: data.pp30_sent_to_customer_date || '(ว่าง)',
          vat_draft_completed_date: data.vat_draft_completed_date || '(ว่าง)',
          // WHT/PND Status
          pnd_status: pndStatus || '(ว่าง)',
          pnd_sent_date: data.pnd_sent_for_review_date || '(ว่าง)',
          pnd_return_date: data.pnd_review_returned_date || '(ว่าง)',
          pnd_customer_sent_date: data.pnd_sent_to_customer_date || '(ว่าง)',
          wht_draft_completed_date: data.wht_draft_completed_date || '(ว่าง)',
          wht_filing_response: data.wht_filing_response || '(ไม่มี)',
          wht_inquiry: data.wht_inquiry || '(ว่าง)',
          wht_response: data.wht_response || '(ว่าง)',
          wht_submission_comment: data.wht_submission_comment || '(ว่าง)',
        })
        console.log('[TaxInspectionForm] สถานะที่แสดงในฟอร์มเมื่อเปิด (รวม WHT และ VAT):', {
          buildId: data.build,
          sourcePage,
          // WHT/PND Status
          pnd_status: pndStatus || '(ว่าง)',
          pnd_sent_date: data.pnd_sent_for_review_date || '(ว่าง)',
          pnd_return_date: data.pnd_review_returned_date || '(ว่าง)',
          pnd_customer_sent_date: data.pnd_sent_to_customer_date || '(ว่าง)',
          wht_draft_completed_date: data.wht_draft_completed_date || '(ว่าง)',
          wht_filing_response: data.wht_filing_response || '(ไม่มี)',
          wht_inquiry: data.wht_inquiry || '(ว่าง)',
          wht_response: data.wht_response || '(ว่าง)',
          wht_submission_comment: data.wht_submission_comment || '(ว่าง)',
          // VAT/PP30 Status
          pp30_status: pp30Status || '(ว่าง)',
          pp30_payment_status: data.pp30_payment_status ?? '(ไม่ส่ง)',
          pp30_filing_response: data.pp30_filing_response ? 'มีค่า' : 'ไม่มี',
          pp30_sent_date: data.pp30_sent_for_review_date || '(ว่าง)',
          pp30_return_date: data.pp30_review_returned_date || '(ว่าง)',
          pp30_customer_sent_date: data.pp30_sent_to_customer_date || '(ว่าง)',
          vat_draft_completed_date: data.vat_draft_completed_date || '(ว่าง)',
        })
      }
    }
  }, [taxData, opened, hasInitialized])

  // ✅ Auto-fill timestamp เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" สำหรับหน้าสถานะยื่นภาษี
  // ⚠️ สำคัญ: สำหรับหน้าสถานะยื่นภาษี (taxStatus) เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" ให้กรอก timestamp อัตโนมัติ
  useEffect(() => {
    // ตรวจสอบว่าเป็นหน้าสถานะยื่นภาษีและ modal เปิดอยู่
    if (sourcePage !== 'taxStatus' || !opened) return

    const currentPndStatus = formValues.pnd_status || ''
    const currentPp30Status = formValues.pp30_status || ''

    // Auto-fill pnd_customer_sent_date เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" และยังไม่มีค่า
    if (currentPndStatus === 'sent_to_customer' && !formValues.pnd_customer_sent_date) {
      // สร้าง UTC timestamp (format 'YYYY-MM-DD HH:mm:ss') แล้วแปลงเป็น local time string
      const utcTimestamp = formatTimestampUTCForAPI() // ได้ 'YYYY-MM-DD HH:mm:ss' (UTC)
      const localTimeString = convertUTCToLocalTimeString(utcTimestamp) // แปลง UTC → local time
      setFormValues((prev) => ({
        ...prev,
        pnd_customer_sent_date: localTimeString
      }))
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] Auto-fill pnd_customer_sent_date:', {
          status: currentPndStatus,
          utcTimestamp,
          localTimeString
        })
      }
    }

    // Auto-fill pp30_customer_sent_date เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" และยังไม่มีค่า
    if (currentPp30Status === 'sent_to_customer' && !formValues.pp30_customer_sent_date) {
      // สร้าง UTC timestamp (format 'YYYY-MM-DD HH:mm:ss') แล้วแปลงเป็น local time string
      const utcTimestamp = formatTimestampUTCForAPI() // ได้ 'YYYY-MM-DD HH:mm:ss' (UTC)
      const localTimeString = convertUTCToLocalTimeString(utcTimestamp) // แปลง UTC → local time
      setFormValues((prev) => ({
        ...prev,
        pp30_customer_sent_date: localTimeString
      }))
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionForm] Auto-fill pp30_customer_sent_date:', {
          status: currentPp30Status,
          utcTimestamp,
          localTimeString
        })
      }
    }
  }, [formValues.pnd_status, formValues.pp30_status, formValues.pnd_customer_sent_date, formValues.pp30_customer_sent_date, sourcePage, opened])

  // Mutation for updating monthly tax data
  const updateMutation = useMutation(
    (data: Partial<MonthlyTaxData>) => {
      if (!taxData?.id) {
        throw new Error('Tax data ID not found')
      }
      return monthlyTaxDataService.update(taxData.id, data)
    },
    {
      onSuccess: async (updatedData) => {

        // ⚠️ สำคัญ: updatedData คือ MonthlyTaxData โดยตรง (ไม่ใช่ { success: true, data: {...} })
        // เพราะ service return response.data.data
        if (import.meta.env.DEV) {
          console.log('[TaxInspectionForm] Save success', {
            buildId,
            updatedDataId: updatedData?.id,
            sourcePage,
            pp30_status: updatedData?.pp30_status,
            pp30_form: updatedData?.pp30_form,
            responseKeys: updatedData ? Object.keys(updatedData) : [],
            hasPp30Status: !!updatedData?.pp30_status,
            hasPp30Form: !!updatedData?.pp30_form,
          })
        }

        notifications.show({
          title: 'บันทึกสำเร็จ',
          message: 'บันทึกข้อมูลภาษีรายเดือนเรียบร้อยแล้ว',
          color: 'green',
          icon: <TbCheck size={16} />,
        })

        // ⚠️ สำคัญ: Update query cache โดยตรงด้วย response data (ไวกว่า refetch)
        // เก็บ buildId ไว้ใน local variable เพราะ parent component อาจ reset มันเป็น undefined
        const currentBuildId = buildId

        if (currentBuildId && updatedData) {
          // Update cache สำหรับ modal query
          queryClient.setQueryData(['monthly-tax-data', currentBuildId, currentYear, currentMonth], updatedData)
          if (import.meta.env.DEV) console.log('[TaxInspectionForm] Detail cache updated', currentBuildId)

          // ⚠️ สำคัญ: อัพเดท form state เมื่อบันทึกสำเร็จ (เฉพาะ status ที่ derive จาก backend)
          let newPp30Status: string = ''
          // ⚠️ สำคัญ: ใช้ derivePp30Status เพื่อ derive สถานะจาก pp30_form และ timestamp fields
          // ไม่ใช้ pp30_filing_response เพราะเป็นข้อมูลที่ผู้ใช้กรอก (TEXT) ไม่ใช่สถานะ
          newPp30Status = derivePp30Status(updatedData) || ''
          if (newPp30Status) {
            setFormValues((prev) => ({ ...prev, pp30_status: newPp30Status }))
          }
          if (updatedData.pp30_filing_response) {
            setVatFilingReply(updatedData.pp30_filing_response)
          }

          // ⚠️ สำคัญ: Update cache สำหรับ list queries (Tax Status, Tax Filing, Tax Inspection)
          // ⚠️ สำคัญ: ใช้ getQueriesData เพื่อหา query keys ทั้งหมดที่ match แล้วอัพเดททีละตัว
          // เพราะ query keys อาจจะมี parameters เยอะ (page, limit, filters, etc.)
          const listFilters = [
            { queryKey: ['monthly-tax-data', 'tax-status'], exact: false },
            { queryKey: ['monthly-tax-data', 'tax-filing'], exact: false },
            { queryKey: ['monthly-tax-data', 'tax-inspection'], exact: false },
          ]

          listFilters.forEach((filters) => {
            const matched = queryClient.getQueriesData(filters)
            if (import.meta.env.DEV) {
              console.log('[TaxInspectionForm] List cache match', filters.queryKey, 'count:', matched.length, 'keys:', matched.map(([k]) => k))
            }

            // ⚠️ สำคัญ: อัพเดท cache สำหรับทุก query key ที่ match (รวมถึง query keys ที่มี parameters เยอะ)
            // เช่น: ['monthly-tax-data', 'tax-status', 1, 20, 'AC00024', 2026, 1, 'all', [], [], []]
            matched.forEach(([queryKey, cachedData]: [unknown, unknown]) => {
              const typedCachedData = cachedData as { data?: MonthlyTaxData[] } | undefined
              if (!typedCachedData?.data || !Array.isArray(typedCachedData.data)) {
                if (import.meta.env.DEV) console.log('[TaxInspectionForm] setQueryData skip (no data array)', { queryKey, hasData: !!typedCachedData?.data, isArray: Array.isArray(typedCachedData?.data) })
                return
              }

              const itemInList = typedCachedData.data.some((item: MonthlyTaxData) => item.id === updatedData.id)
              if (import.meta.env.DEV) console.log('[TaxInspectionForm] Updating cache for query key', { queryKey, itemInList, listLength: typedCachedData.data.length })

              if (itemInList) {
                // ⚠️ สำคัญ: อัพเดท cache พร้อมทั้ง pp30_status และ pp30_form เพื่อให้ตารางแสดงสถานะถูกต้องทันที
                // ⚠️ สำคัญ: ใช้ข้อมูลจาก backend โดยตรง (มี pp30_form และ pp30_status แล้ว)
                // ถ้า backend ไม่ส่งมา ให้ derive จาก pp30_form หรือ timestamp fields
                const updatedItemWithStatus: MonthlyTaxData = {
                  ...updatedData,
                  // ⚠️ สำคัญ: Backend ส่ง pp30_status และ pp30_form มาแล้ว (จาก PUT endpoint response)
                  // ถ้าไม่มี ให้ derive จาก pp30_form หรือ timestamp fields
                  pp30_status: updatedData.pp30_status || derivePp30Status(updatedData) || null,
                  // ⚠️ สำคัญ: Backend ส่ง pp30_form มาแล้ว (หลัง migration 028)
                  // ถ้าไม่มี ให้ใช้ pp30_status เป็น fallback
                  pp30_form: updatedData.pp30_form || updatedData.pp30_status || null,
                }

                if (import.meta.env.DEV) {
                  console.log('[TaxInspectionForm] Updating cache with status', {
                    queryKey,
                    itemId: updatedData.id,
                    build: updatedData.build,
                    pp30_status: updatedItemWithStatus.pp30_status,
                    pp30_form: updatedItemWithStatus.pp30_form,
                    hasPp30Status: !!updatedData.pp30_status,
                    hasPp30Form: !!updatedData.pp30_form,
                    updatedDataKeys: Object.keys(updatedData),
                  })
                }

                // อัพเดท cache สำหรับ query key นี้โดยเฉพาะ (ใช้ setQueryData แทน setQueriesData)
                queryClient.setQueryData(queryKey as QueryKey, {
                  ...typedCachedData,
                  data: typedCachedData.data.map((item: MonthlyTaxData) =>
                    item.id === updatedData.id ? updatedItemWithStatus : item
                  ),
                } as { data: MonthlyTaxData[] })

                if (import.meta.env.DEV) {
                  console.log('[TaxInspectionForm] Cache updated successfully', {
                    queryKey,
                    itemId: updatedData.id,
                    cacheUpdated: true,
                  })
                }
              }
            })
          })
        }

        // ⚠️ สำคัญ: รีเซ็ต/รีเฟรชข้อมูลทั้งหมดจาก backend ใหม่หลังจากบันทึกสำเร็จ
        // ⚠️ สำคัญ: ตั้งค่า refreshing state เพื่อแสดง loading
        setIsRefreshing(true)

        // ⚠️ สำคัญ: Invalidate และ refetch ทั้ง detail query (สำหรับ modal) และ list queries ทั้งหมด
        // เพื่อให้ข้อมูลตรงกับ Database ก่อนปิด modal
        // ⚠️ สำคัญ: ใช้ sequential refetch แทน Promise.all เพื่อหลีกเลี่ยง 429 errors
        const detailQueryKey = currentBuildId ? ['monthly-tax-data', currentBuildId, currentYear, currentMonth] : null

        // ⚠️ สำคัญ: Invalidate และ refetch list queries ทั้งหมด (tax-status, tax-filing, tax-inspection)
        const allListKeys = [
          ['monthly-tax-data', 'tax-status'],
          ['monthly-tax-data', 'tax-filing'],
          ['monthly-tax-data', 'tax-inspection'],
        ]

        // ⚠️ สำคัญ: Invalidate และ refetch summary queries ทั้งหมด
        const allSummaryKeys = [
          ['monthly-tax-data-summary', 'tax-status'],
          ['monthly-tax-data-summary', 'tax-filing'],
          ['monthly-tax-data-summary', 'tax-inspection'],
        ]

          // ⚠️ สำคัญ: Sequential refetch เพื่อหลีกเลี่ยง 429 errors
          ; (async () => {
            try {
              // Step 1: Invalidate detail query ก่อน (สำหรับ modal)
              if (detailQueryKey) {
                await queryClient.invalidateQueries({ queryKey: detailQueryKey })
                await queryClient.refetchQueries({ queryKey: detailQueryKey })
                if (import.meta.env.DEV) {
                  console.log('[TaxInspectionForm] Refetched detail query for modal', { detailQueryKey, buildId: currentBuildId })
                }
                // รอ 50ms ก่อน refetch ถัดไป
                await new Promise((resolve) => setTimeout(resolve, 50))
              }

              // Step 2: Invalidate และ refetch list queries แบบ sequential
              for (const listKey of allListKeys) {
                await queryClient.invalidateQueries({ queryKey: listKey, exact: false })
                await queryClient.refetchQueries({ queryKey: listKey, exact: false })
                if (import.meta.env.DEV) {
                  console.log('[TaxInspectionForm] Refetched list query', { listKey })
                }
                // รอ 50ms ก่อน refetch ถัดไป
                await new Promise((resolve) => setTimeout(resolve, 50))
              }

              // Step 3: Invalidate และ refetch summary queries แบบ sequential
              for (const summaryKey of allSummaryKeys) {
                await queryClient.invalidateQueries({ queryKey: summaryKey, exact: false })
                await queryClient.refetchQueries({ queryKey: summaryKey, exact: false })
                if (import.meta.env.DEV) {
                  console.log('[TaxInspectionForm] Refetched summary query', { summaryKey })
                }
                // รอ 50ms ก่อน refetch ถัดไป
                await new Promise((resolve) => setTimeout(resolve, 50))
              }

              if (import.meta.env.DEV) {
                const detailCacheData = detailQueryKey ? queryClient.getQueryData(detailQueryKey) : null
                console.log('[TaxInspectionForm] All refetches completed', {
                  sourcePage,
                  detailQueryKey,
                  hasDetailData: !!detailCacheData,
                  listQueriesRefetched: allListKeys.length,
                  summaryQueriesRefetched: allSummaryKeys.length,
                })
                console.log('[TaxInspectionForm] ผลการรีเซ็ตข้อมูลหน้าเว็บ', {
                  detailCacheUpdated: !!detailCacheData,
                  listQueriesRefetched: allListKeys.length,
                  summaryQueriesRefetched: allSummaryKeys.length,
                  refetchTriggered: 'sequential',
                  detailRefetched: !!detailQueryKey,
                  statusAfterSave: {
                    pnd_status: updatedData?.pnd_status ?? '(ไม่มี)',
                    pp30_form: updatedData?.pp30_form ?? '(ไม่มี)',
                  },
                })
              }

              // ⚠️ สำคัญ: ปิด refreshing state และปิด modal หลังจาก refetch ทั้งหมดเสร็จแล้ว
              // เพื่อให้ข้อมูลในฟอร์มและตารางตรงกับ Database ก่อนปิด modal
              setIsRefreshing(false)
              onClose()
            } catch (err) {
              if (import.meta.env.DEV) {
                console.warn('[TaxInspectionForm] Refetch error', err)
                console.log('[TaxInspectionForm] ผลการรีเซ็ตข้อมูลหน้าเว็บ', { refetchError: true, sourcePage })
              }
              // แม้ว่า refetch จะ error ก็ปิด modal (ข้อมูลถูกบันทึกแล้ว)
              setIsRefreshing(false)
              onClose()
            }
          })()
      },
      onError: async (error: unknown) => {
        // ⚠️ สำคัญ: ตรวจสอบว่าข้อมูลถูกบันทึกแล้วหรือไม่ก่อนแสดง error
        // เพราะบางครั้ง backend อาจบันทึกข้อมูลสำเร็จแล้วแต่ response error (เช่น query updatedData error)
        const isApiErr = isApiError(error)
        const is500Error = isApiErr && error.response?.status === 500

        // ถ้าเป็น 500 error ให้ลอง refetch ข้อมูลเพื่อตรวจสอบว่าถูกบันทึกแล้วหรือไม่
        if (is500Error && buildId) {
          try {
            console.log('[TaxInspectionForm] 500 error detected, checking if data was saved...')
            const checkData = await monthlyTaxDataService.getByBuildYearMonth(buildId, currentYear, currentMonth)

            // ถ้า refetch สำเร็จและได้ข้อมูลมา แสดงว่าข้อมูลถูกบันทึกแล้ว
            if (checkData) {
              console.log('[TaxInspectionForm] Data was saved successfully despite 500 error')

              // อัพเดท cache
              queryClient.setQueryData(['monthly-tax-data', buildId, currentYear, currentMonth], checkData)

              // แสดง success notification แทน error
              notifications.show({
                title: 'บันทึกสำเร็จ',
                message: 'บันทึกข้อมูลสำเร็จแล้ว (ข้อมูลอาจไม่ครบถ้วนบางส่วน)',
                color: 'green',
                icon: <TbCheck size={16} />,
              })

              // ⚠️ สำคัญ: รีเซ็ต/รีเฟรชข้อมูลทั้งหมดจาก backend ใหม่
              const detailQueryKey = buildId ? ['monthly-tax-data', buildId, currentYear, currentMonth] : null
              const refetchPromises: Promise<any>[] = []

              // ⚠️ สำคัญ: Invalidate และ refetch list queries ทั้งหมด
              const allListKeys = [
                ['monthly-tax-data', 'tax-status'],
                ['monthly-tax-data', 'tax-filing'],
                ['monthly-tax-data', 'tax-inspection'],
              ]

              // ⚠️ สำคัญ: Invalidate และ refetch summary queries ทั้งหมด
              const allSummaryKeys = [
                ['monthly-tax-data-summary', 'tax-status'],
                ['monthly-tax-data-summary', 'tax-filing'],
                ['monthly-tax-data-summary', 'tax-inspection'],
              ]

              setIsRefreshing(true)

              // ⚠️ สำคัญ: Invalidate และ refetch detail query (สำหรับ modal) ก่อน
              if (detailQueryKey) {
                refetchPromises.push(
                  queryClient.invalidateQueries({ queryKey: detailQueryKey }).then(() => {
                    return queryClient.refetchQueries({ queryKey: detailQueryKey })
                  })
                )
              }

              // ⚠️ สำคัญ: Invalidate และ refetch list queries ทั้งหมด
              allListKeys.forEach((listKey) => {
                refetchPromises.push(
                  queryClient.invalidateQueries({ queryKey: listKey, exact: false }).then(() => {
                    return queryClient.refetchQueries({ queryKey: listKey, exact: false })
                  })
                )
              })

              // ⚠️ สำคัญ: Invalidate และ refetch summary queries ทั้งหมด
              allSummaryKeys.forEach((summaryKey) => {
                refetchPromises.push(
                  queryClient.invalidateQueries({ queryKey: summaryKey, exact: false }).then(() => {
                    return queryClient.refetchQueries({ queryKey: summaryKey, exact: false })
                  })
                )
              })

              try {
                // ⚠️ สำคัญ: รอให้ refetch ทั้ง detail และ list queries เสร็จก่อนปิด modal
                await Promise.all(refetchPromises)
                setIsRefreshing(false)
                onClose()
              } catch (refetchError) {
                console.error('[TaxInspectionForm] Error refetching after 500 error:', refetchError)
                setIsRefreshing(false)
                onClose()
              }
              return // ไม่แสดง error notification
            }
          } catch (checkError) {
            console.error('[TaxInspectionForm] Error checking if data was saved:', checkError)
            // ถ้า refetch ไม่สำเร็จ ให้แสดง error ตามปกติ
          }
        }

        // Check if error is network-related (backend server not running)
        const isNetworkErr = isNetworkError(error) ||
          (error instanceof Error && (
            error.message?.includes('Network Error') ||
            error.message?.includes('ERR_CONNECTION_REFUSED') ||
            error.message?.includes('ERR_SOCKET_NOT_CONNECTED')
          ))

        const errorMessage = isNetworkErr
          ? 'ไม่สามารถเชื่อมต่อกับ Backend Server ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001'
          : getErrorMessage(error)

        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: errorMessage,
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  // ✅ FEATURE: Handle refresh data from database
  const handleRefresh = async () => {
    if (!buildId) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่พบ Build ID',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
      return
    }

    setIsRefreshing(true)
    try {
      // Invalidate cache first to ensure fresh data
      await queryClient.invalidateQueries({
        queryKey: ['monthly-tax-data', buildId, currentYear, currentMonth],
        exact: true,
      })

      // Refetch data
      const { data: refreshedData } = await refetchTaxData()

      if (refreshedData) {
        // ✅ สำคัญ: รีเซ็ต hasInitialized เป็น false เพื่อให้ useEffect ทำงานอีกครั้ง
        // และอัพเดท form state ให้ตรงกับข้อมูลใหม่จากฐานข้อมูล
        // นี่จะทำให้สถานะที่ผู้ใช้เปลี่ยนแต่ยังไม่ได้บันทึกถูก reset กลับไปเป็นสถานะจากฐานข้อมูล
        setHasInitialized(false)

        notifications.show({
          title: 'รีเฟรชข้อมูลสำเร็จ',
          message: 'โหลดข้อมูลใหม่จากฐานข้อมูลเรียบร้อยแล้ว',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      }
    } catch (error) {
      console.error('[TaxInspectionForm] Refresh error:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลใหม่ได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSave = () => {
    if (!taxData?.id) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่พบข้อมูลภาษีรายเดือน',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
      return
    }

    // ⚠️ สำคัญ: ประกาศตัวแปรสถานะก่อนเพื่อใช้ใน logic อื่นๆ
    const currentPndStatus = formValues.pnd_status || ''
    const currentPp30Status = formValues.pp30_status || ''

    // Access control สำหรับหน้ายื่นภาษี: ตรวจสอบสิทธิ์การส่งข้อมูล
    if (sourcePage === 'taxFiling') {

      // ถ้าอยู่ในแถบ WHT (vat) → ต้องเป็น wht_filer เท่านั้น
      if (activeTab === 'vat' && !isWhtFiler) {
        notifications.show({
          title: 'ไม่มีสิทธิ์ส่งข้อมูล',
          message: 'คุณเป็นผู้รับผิดชอบในการยื่น VAT เท่านั้น ไม่สามารถส่งข้อมูลในแถบ WHT ได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
        return
      }
      // ถ้าอยู่ในแถบ VAT (debtor) → ต้องเป็น vat_filer เท่านั้น
      if (activeTab === 'debtor' && !isVatFiler) {
        notifications.show({
          title: 'ไม่มีสิทธิ์ส่งข้อมูล',
          message: 'คุณเป็นผู้รับผิดชอบในการยื่น WHT เท่านั้น ไม่สามารถส่งข้อมูลในแถบ VAT ได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
        return
      }

      // ✅ ลบการบังคับกรอกจำนวนใบแนบสำหรับสถานะ "ร่างแบบเสร็จแล้ว" ออกแล้ว
      // ผู้ใช้สามารถเลือกสถานะ "ร่างแบบเสร็จแล้ว" ได้โดยไม่ต้องกรอกจำนวนใบแนบ
    }

    // Validation สำหรับหน้าสถานะยื่นภาษี (taxStatus)
    if (sourcePage === 'taxStatus') {
      // 1. Validation สำหรับ WHT tab: ตรวจสอบว่าสถานะ ภ.ง.ด. ทั้งหมดถูกกรอกแล้วหรือยัง
      const pndStatusFields = [
        { key: 'pnd1_40_1', label: 'แบบ ภ.ง.ด.1 40(1)' },
        { key: 'pnd1_40_2', label: 'แบบ ภ.ง.ด.1 40(2)' },
        { key: 'pnd3', label: 'แบบ ภ.ง.ด.3' },
        { key: 'pnd53', label: 'แบบ ภ.ง.ด.53' },
        { key: 'pnd2', label: 'แบบ ภ.ง.ด.2' },
        { key: 'pnd54', label: 'แบบ ภ.ง.ด.54' },
        { key: 'pp36', label: 'แบบ ภ.พ.36' },
        { key: 'pth40', label: 'แบบ ภ.ธ.40' },
        { key: 'social_security', label: 'แบบ ประกันสังคม' },
        { key: 'student_loan', label: 'แบบ กยศ.' },
      ]

      const missingPndStatuses = pndStatusFields.filter(
        (field) => !formValues[field.key as keyof typeof formValues] || formValues[field.key as keyof typeof formValues] === ''
      )

      if (missingPndStatuses.length > 0) {
        const missingLabels = missingPndStatuses.map((field) => field.label).join(', ')
        notifications.show({
          title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          message: `กรุณาเลือกสถานะสำหรับ: ${missingLabels}`,
          color: 'orange',
          icon: <TbAlertCircle size={16} />,
        })
        // Switch to WHT tab if not already there
        if (activeTab !== 'wht') {
          setActiveTab('wht')
        }
        return
      }

      // 2. Validation สำหรับ WHT tab: ตรวจสอบว่าถ้าเลือกสถานะ "รอตรวจ" แล้วต้องกรอกจำนวนใบแนบ
      // ⚠️ สำคัญ: Validation นี้ต้องทำงานเสมอเมื่อ sourcePage === 'taxStatus' ไม่ว่าจะอยู่แถบไหน
      // รายการแบบฟอร์ม WHT ที่ต้องตรวจสอบ
      const whtFormFieldsForPendingReview = [
        { statusKey: 'pnd1_40_1', attachmentKey: 'pnd1_40_1', label: 'แบบ ภ.ง.ด.1 40(1)' },
        { statusKey: 'pnd1_40_2', attachmentKey: 'pnd1_40_2', label: 'แบบ ภ.ง.ด.1 40(2)' },
        { statusKey: 'pnd3', attachmentKey: 'pnd3', label: 'แบบ ภ.ง.ด.3' },
        { statusKey: 'pnd53', attachmentKey: 'pnd53', label: 'แบบ ภ.ง.ด.53' },
        { statusKey: 'pp36', attachmentKey: 'pp36', label: 'แบบ ภ.พ.36' },
        { statusKey: 'pnd54', attachmentKey: 'pnd54', label: 'แบบ ภ.ง.ด.54' },
        { statusKey: 'pnd2', attachmentKey: 'pnd2', label: 'แบบ ภ.ง.ด.2' },
        { statusKey: 'social_security', attachmentKey: 'social_security', label: 'แบบ ประกันสังคม' },
        { statusKey: 'student_loan', attachmentKey: 'student_loan', label: 'แบบ กยศ.' },
        { statusKey: 'pth40', attachmentKey: 'pth40', label: 'แบบ ภ.ธ.40' },
      ]

      // ตรวจสอบว่าถ้าเลือกสถานะ "รอตรวจ" แล้วต้องกรอกจำนวนใบแนบ
      const missingAttachmentsForPendingReview = whtFormFieldsForPendingReview.filter((field) => {
        const status = formValues[field.statusKey] || ''
        const attachmentCount = numberValues[field.attachmentKey]

        // ถ้าเลือกสถานะ "รอตรวจ" แล้วต้องกรอกจำนวนใบแนบ
        if (status === 'pending_review') {
          // ตรวจสอบว่าจำนวนใบแนบว่างหรือไม่ หรือเป็น 0 หรือไม่ใช่ตัวเลข
          if (!attachmentCount || typeof attachmentCount !== 'string' || attachmentCount.trim() === '' || attachmentCount === '0') {
            return true
          }
          // ตรวจสอบว่าเป็นตัวเลขที่มากกว่า 0 หรือไม่
          const numValue = parseInt(attachmentCount.replace(/,/g, ''))
          if (isNaN(numValue) || numValue <= 0) {
            return true
          }
        }
        return false
      })

      if (missingAttachmentsForPendingReview.length > 0) {
        const missingLabels = missingAttachmentsForPendingReview.map((field) => field.label).join(', ')
        notifications.show({
          title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          message: `กรุณากรอกจำนวนใบแนบสำหรับแบบฟอร์มที่เลือกสถานะ "รอตรวจ": ${missingLabels}`,
          color: 'orange',
          icon: <TbAlertCircle size={16} />,
        })
        // Switch to WHT tab if not already there
        if (activeTab !== 'wht') {
          setActiveTab('wht')
        }
        return
      }

      // 3. Validation สำหรับ VAT tab: ตรวจสอบว่าจำนวนเอกสารภาษีซื้อและคอนเฟิร์มรายได้ถูกกรอกแล้วหรือยัง
      // ⚠️ สำคัญ: บังคับกรอกจำนวนเอกสารภาษีซื้อเฉพาะเมื่อสถานะ ภ.พ.30 ไม่เท่ากับ "ไม่มี"
      // สถานะที่หมายถึง "ไม่มี": 'not_submitted', '(ไม่มี)', หรือค่าว่าง
      const currentPp30Status = formValues.pp30_status || ''
      const isPp30StatusEmpty = !currentPp30Status ||
        currentPp30Status === '' ||
        currentPp30Status === 'not_submitted' ||
        currentPp30Status === '(ไม่มี)'

      // ตรวจสอบว่าจำนวนเอกสารภาษีซื้อถูกกรอกและมากกว่า 0 (เฉพาะเมื่อสถานะ ภ.พ.30 ไม่ใช่ "ไม่มี")
      if (!isPp30StatusEmpty) {
        const purchaseDocCount = purchaseDocuments ? parseInt(purchaseDocuments.replace(/,/g, '')) : null
        if (!purchaseDocuments || purchaseDocuments.trim() === '' || purchaseDocCount === null || isNaN(purchaseDocCount) || purchaseDocCount <= 0) {
          notifications.show({
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            message: 'กรุณากรอกจำนวนเอกสารภาษีซื้อ (ต้องมากกว่า 0) เมื่อสถานะ ภ.พ.30 ไม่ใช่ "ไม่มี"',
            color: 'orange',
            icon: <TbAlertCircle size={16} />,
          })
          // Switch to VAT tab if not already there
          if (activeTab !== 'debtor') {
            setActiveTab('debtor')
          }
          return
        }
      }

      // ตรวจสอบว่าคอนเฟิร์มรายได้ถูกกรอกแล้วหรือยัง (เฉพาะเมื่อสถานะ ภ.พ.30 ไม่ใช่ "ไม่มี")
      if (!isPp30StatusEmpty) {
        if (!confirmIncomeStatus || confirmIncomeStatus.trim() === '') {
          notifications.show({
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            message: 'กรุณาเลือกคอนเฟิร์มรายได้ เมื่อสถานะ ภ.พ.30 ไม่ใช่ "ไม่มี"',
            color: 'orange',
            icon: <TbAlertCircle size={16} />,
          })
          // Switch to VAT tab if not already there
          if (activeTab !== 'debtor') {
            setActiveTab('debtor')
          }
          return
        }
      }

      // Validation สำหรับสถานะยอดชำระและจำนวนยอดชำระ
      // ถ้าเลือก "มียอดชำระ" ต้องกรอกจำนวนยอดชำระและต้องเป็นตัวเลขที่มากกว่า 0
      if (pp30PaymentStatus === 'has_payment') {
        if (!pp30PaymentAmount || pp30PaymentAmount.trim() === '') {
          notifications.show({
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            message: 'กรุณากรอกจำนวนยอดชำระเมื่อเลือก "มียอดชำระ"',
            color: 'orange',
            icon: <TbAlertCircle size={16} />,
          })
          // Switch to VAT tab if not already there
          if (activeTab !== 'debtor') {
            setActiveTab('debtor')
          }
          return
        }
        const paymentAmount = parseFloat(pp30PaymentAmount.replace(/,/g, ''))
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          notifications.show({
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            message: 'จำนวนยอดชำระต้องเป็นตัวเลขที่มากกว่า 0',
            color: 'orange',
            icon: <TbAlertCircle size={16} />,
          })
          // Switch to VAT tab if not already there
          if (activeTab !== 'debtor') {
            setActiveTab('debtor')
          }
          return
        }
      }
    }

    // Auto-timestamp logic: 
    // 1. ถ้าเลือกสถานะ "รอตรวจ" (pending_review) หรือ "รอตรวจอีกครั้ง" (pending_recheck) ให้ set timestamp อัตโนมัติสำหรับ pnd_sent_for_review_date และ pp30_sent_for_review_date
    // 2. ถ้าสถานะเปลี่ยนจาก "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เป็นสถานะอื่น ให้บันทึก Timestamp ปัจจุบันเข้าไปใน review_returned_date
    // ⚠️ สำคัญ: ไม่ว่าจะอยู่แถบไหน (General Info, WHT, VAT) เมื่อกดบันทึก ระบบจะตรวจสอบสถานะทั้งสองและอัพเดท timestamp ทั้งสองตัว
    // หมายเหตุ: currentPndStatus และ currentPp30Status ถูกประกาศไว้แล้วด้านบน

    // ✅ Helper: สถานะที่ไม่ต้องส่ง timestamp fields (เก็บใน pp30_form/pnd_status โดยตรง)
    const statusesWithoutTimestamp = [
      'received_receipt',    // รับใบเสร็จ
      'not_submitted',       // ไม่มียื่น
      'additional_review',   // ตรวจสอบเพิ่มเติม
      'inquire_customer',    // สอบถามลูกค้าเพิ่มเติม
      'draft_ready',         // ร่างแบบได้
      'paid',                // ชำระแล้ว
      'draft_completed',     // ร่างแบบเสร็จแล้ว (ใช้ wht_draft_completed_date/vat_draft_completed_date แทน)
      'pending_review',      // รอตรวจ (ใช้ pnd_sent_for_review_date/pp30_sent_for_review_date แทน)
      'pending_recheck',     // รอตรวจอีกครั้ง (ใช้ pnd_sent_for_review_date/pp30_sent_for_review_date แทน)
    ]
    const shouldNotSendTimestamp = (status: string | null | undefined) => {
      return status && statusesWithoutTimestamp.includes(status)
    }

    // Auto-timestamp สำหรับ pnd_sent_for_review_date: ส่งเฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
    // ⚠️ สำคัญ: อัพเดท timestamp ทุกครั้งที่กดบันทึกเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
    let pndSentForReviewDate: string | null | undefined = undefined // undefined = ไม่ส่งไป backend (ใช้ค่าเดิม)

    // ✅ CRITICAL: ส่ง pnd_sent_for_review_date เฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
    if (currentPndStatus === 'pending_review' || currentPndStatus === 'pending_recheck') {
      // ถ้าเลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ให้ set timestamp อัตโนมัติทุกครั้งที่กดบันทึก
      pndSentForReviewDate = formatTimestampUTCForAPI()
    }
    // ⚠️ สำคัญ: ไม่ส่ง pnd_sent_for_review_date เมื่อสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // เพื่อป้องกันการส่งค่าเดิมจาก formValues หรือ taxData เมื่อเปลี่ยนสถานะ

    // Auto-timestamp สำหรับ pp30_sent_for_review_date: ส่งเฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
    // ⚠️ สำคัญ: อัพเดท timestamp ทุกครั้งที่กดบันทึกเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
    let pp30SentForReviewDate: string | null | undefined = undefined // undefined = ไม่ส่งไป backend (ใช้ค่าเดิม)

    // ✅ CRITICAL: ส่ง pp30_sent_for_review_date เฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
    if (currentPp30Status === 'pending_review' || currentPp30Status === 'pending_recheck') {
      // ถ้าเลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ให้ set timestamp อัตโนมัติทุกครั้งที่กดบันทึก
      // ไม่ว่าจะมี pp30_sent_date ใน formValues หรือไม่ก็ตาม (เพื่อให้อัพเดท timestamp ทุกครั้ง)
      pp30SentForReviewDate = formatTimestampUTCForAPI()
    }
    // ⚠️ สำคัญ: ไม่ส่ง pp30_sent_for_review_date เมื่อสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
    // เพื่อป้องกันการส่งค่าเดิมจาก formValues หรือ taxData เมื่อเปลี่ยนสถานะ

    // Check if PND status changed from "pending_review" or "pending_recheck" to another status
    const pndStatusChanged =
      (originalPndStatus === 'pending_review' || originalPndStatus === 'pending_recheck') &&
      currentPndStatus !== 'pending_review' &&
      currentPndStatus !== 'pending_recheck' &&
      currentPndStatus !== ''

    // Check if PP30 status changed from "pending_review" or "pending_recheck" to another status
    const pp30StatusChanged =
      (originalPp30Status === 'pending_review' || originalPp30Status === 'pending_recheck') &&
      currentPp30Status !== 'pending_review' &&
      currentPp30Status !== 'pending_recheck' &&
      currentPp30Status !== ''

    // Determine pnd_review_returned_date
    // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
    // Logic: สำหรับหน้าตรวจภาษี (taxInspection) - อัพเดท timestamp เมื่อสถานะไม่ใช่ "รอตรวจ", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว"
    let pndReviewReturnedDate: string | null | undefined = undefined // undefined = ไม่ส่งไป backend (ใช้ค่าเดิม)

    if (sourcePage === 'taxInspection') {
      // สำหรับหน้าตรวจภาษี: อัพเดท timestamp เมื่อสถานะไม่ใช่ "รอตรวจ", "รอตรวจอีกครั้ง", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว"
      // ✅ CRITICAL: สถานะ "รอตรวจ" ใช้ pnd_sent_for_review_date, สถานะ "ร่างแบบเสร็จแล้ว" ใช้ wht_draft_completed_date, สถานะ "ส่งลูกค้าแล้ว" ใช้ pnd_sent_to_customer_date
      if (currentPndStatus !== 'pending_review' &&
        currentPndStatus !== 'pending_recheck' &&
        currentPndStatus !== 'draft_completed' &&
        currentPndStatus !== 'sent_to_customer' &&
        currentPndStatus !== '') {
        // อัพเดทเป็น timestamp ปัจจุบันทุกครั้งที่กดบันทึก
        pndReviewReturnedDate = formatTimestampUTCForAPI()
      }
      // ถ้าสถานะเป็น "รอตรวจ", "รอตรวจอีกครั้ง", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว" ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม)
    } else if (sourcePage === 'taxStatus') {
      // ✅ CRITICAL: สำหรับหน้าสถานะยื่นภาษี: ไม่ส่ง pnd_review_returned_date เลย
      // เพราะสถานะต่างๆ มี field ของตัวเอง:
      // - "รอตรวจ" → pnd_sent_for_review_date
      // - "ร่างแบบเสร็จแล้ว" → wht_draft_completed_date
      // - "ส่งลูกค้าแล้ว" → pnd_sent_to_customer_date
      // pnd_review_returned_date ควรมีผลเฉพาะหน้าตรวจภาษี (taxInspection) เท่านั้น
      pndReviewReturnedDate = undefined // ไม่ส่งไป backend = คงค่าเดิม
    } else if (sourcePage === 'taxFiling') {
      // ✅ CRITICAL: สำหรับหน้ายื่นภาษี: ไม่ส่ง pnd_review_returned_date เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว"
      // เพราะหน้ายื่นภาษีจะใช้ wht_draft_completed_date แทน
      if (currentPndStatus === 'draft_completed') {
        pndReviewReturnedDate = undefined // ไม่ส่งไป backend = คงค่าเดิม
      } else if (pndStatusChanged) {
        // Auto-set timestamp if status changed from pending to another status
        pndReviewReturnedDate = formatTimestampUTCForAPI()
      } else if (formValues.pnd_return_date) {
        // Use existing date if user manually set it
        // ⚠️ สำคัญ: formValues.pnd_return_date อาจเป็น:
        // - ISO string จาก backend (เช่น "2026-02-01T05:31:08.000Z") → เป็น UTC แล้ว ต้องส่ง isAlreadyUTC = true
        // - Local time string จาก DatePickerInput (เช่น "2026-02-01 12:00:00") → เป็น local time ต้องส่ง isAlreadyUTC = false
        // - Empty string หรือ null → ข้ามไป
        const dateValue = formValues.pnd_return_date
        if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
          const isISOUTC = dateValue.includes('T') || dateValue.includes('Z')
          pndReviewReturnedDate = formatTimestampUTCForAPI(dateValue, isISOUTC)
        }
      } else if (taxData?.pnd_review_returned_date) {
        // ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว และสถานะไม่ใช่ "ร่างแบบเสร็จแล้ว", "รอตรวจ", หรือ "รอตรวจอีกครั้ง"
        // ให้อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
        if (currentPndStatus !== 'draft_completed' && currentPndStatus !== 'pending_review' && currentPndStatus !== 'pending_recheck' && currentPndStatus !== '') {
          // อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
          pndReviewReturnedDate = formatTimestampUTCForAPI()
        }
        // ถ้าสถานะยังเป็น "ร่างแบบเสร็จแล้ว", "รอตรวจ", หรือ "รอตรวจอีกครั้ง" ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม)
      } else if (currentPndStatus !== 'draft_completed' && currentPndStatus !== 'pending_review' && currentPndStatus !== 'pending_recheck' && currentPndStatus !== '') {
        // ถ้าไม่มีข้อมูลอยู่แล้ว และสถานะไม่ใช่ "ร่างแบบเสร็จแล้ว", "รอตรวจ", หรือ "รอตรวจอีกครั้ง"
        // ให้ set timestamp ปัจจุบัน
        pndReviewReturnedDate = formatTimestampUTCForAPI()
      }
    } else {
      // สำหรับหน้าอื่นๆ: ใช้ logic เดิม
      if (pndStatusChanged) {
        // Auto-set timestamp if status changed from pending to another status
        pndReviewReturnedDate = formatTimestampUTCForAPI()
      } else if (formValues.pnd_return_date) {
        // Use existing date if user manually set it
        // ⚠️ สำคัญ: formValues.pnd_return_date อาจเป็น:
        // - ISO string จาก backend (เช่น "2026-02-01T05:31:08.000Z") → เป็น UTC แล้ว ต้องส่ง isAlreadyUTC = true
        // - Local time string จาก DatePickerInput (เช่น "2026-02-01 12:00:00") → เป็น local time ต้องส่ง isAlreadyUTC = false
        // - Empty string หรือ null → ข้ามไป
        const dateValue = formValues.pnd_return_date
        if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
          const isISOUTC = dateValue.includes('T') || dateValue.includes('Z')
          pndReviewReturnedDate = formatTimestampUTCForAPI(dateValue, isISOUTC)
        }
      } else if (taxData?.pnd_review_returned_date) {
        // ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว และสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
        // ให้อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
        if (currentPndStatus !== 'pending_review' && currentPndStatus !== 'pending_recheck' && currentPndStatus !== '') {
          // อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
          pndReviewReturnedDate = formatTimestampUTCForAPI()
        }
        // ถ้าสถานะยังเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม)
      } else if (currentPndStatus !== 'pending_review' && currentPndStatus !== 'pending_recheck' && currentPndStatus !== '') {
        // ถ้าไม่มีข้อมูลอยู่แล้ว และสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
        // ให้ set timestamp ปัจจุบัน
        pndReviewReturnedDate = formatTimestampUTCForAPI()
      }
    }

    // Determine pp30_review_returned_date
    // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
    // Logic: สำหรับหน้าตรวจภาษี (taxInspection) - อัพเดท timestamp เมื่อสถานะไม่ใช่ "รอตรวจ", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว"
    let pp30ReviewReturnedDate: string | null | undefined = undefined // undefined = ไม่ส่งไป backend (ใช้ค่าเดิม)

    if (sourcePage === 'taxInspection') {
      // สำหรับหน้าตรวจภาษี: อัพเดท timestamp เมื่อสถานะไม่ใช่ "รอตรวจ", "รอตรวจอีกครั้ง", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว"
      // ✅ CRITICAL: สถานะ "รอตรวจ" ใช้ pp30_sent_for_review_date, สถานะ "ร่างแบบเสร็จแล้ว" ใช้ vat_draft_completed_date, สถานะ "ส่งลูกค้าแล้ว" ใช้ pp30_sent_to_customer_date
      if (currentPp30Status !== 'pending_review' &&
        currentPp30Status !== 'pending_recheck' &&
        currentPp30Status !== 'draft_completed' &&
        currentPp30Status !== 'sent_to_customer' &&
        currentPp30Status !== '') {
        // อัพเดทเป็น timestamp ปัจจุบันทุกครั้งที่กดบันทึก
        pp30ReviewReturnedDate = formatTimestampUTCForAPI()
      }
      // ถ้าสถานะเป็น "รอตรวจ", "รอตรวจอีกครั้ง", "ร่างแบบเสร็จแล้ว", หรือ "ส่งลูกค้าแล้ว" ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม)
    } else {
      // ✅ CRITICAL: สำหรับหน้าสถานะยื่นภาษี: ไม่ส่ง pp30_review_returned_date เลย
      // เพราะสถานะต่างๆ มี field ของตัวเอง:
      // - "รอตรวจ" → pp30_sent_for_review_date
      // - "ร่างแบบเสร็จแล้ว" → vat_draft_completed_date
      // - "ส่งลูกค้าแล้ว" → pp30_sent_to_customer_date
      // pp30_review_returned_date ควรมีผลเฉพาะหน้าตรวจภาษี (taxInspection) เท่านั้น
      if (sourcePage === 'taxStatus') {
        pp30ReviewReturnedDate = undefined // ไม่ส่งไป backend = คงค่าเดิม
      } else {
        // สำหรับหน้าอื่นๆ (taxFiling): ใช้ logic เดิม
        if (pp30StatusChanged) {
          // Auto-set timestamp if status changed from pending to another status
          pp30ReviewReturnedDate = formatTimestampUTCForAPI()
        } else if (formValues.pp30_return_date) {
          // Use existing date if user manually set it
          // ⚠️ สำคัญ: formValues.pp30_return_date อาจเป็น:
          // - ISO string จาก backend (เช่น "2026-02-01T05:31:08.000Z") → เป็น UTC แล้ว ต้องส่ง isAlreadyUTC = true
          // - Local time string จาก DatePickerInput (เช่น "2026-02-01 12:00:00") → เป็น local time ต้องส่ง isAlreadyUTC = false
          // - Empty string หรือ null → ข้ามไป
          const dateValue = formValues.pp30_return_date
          if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
            const isISOUTC = dateValue.includes('T') || dateValue.includes('Z')
            pp30ReviewReturnedDate = formatTimestampUTCForAPI(dateValue, isISOUTC)
          }
        } else if (taxData?.pp30_review_returned_date) {
          // ถ้ามีวันที่ส่งตรวจคืนในฐานข้อมูลแล้ว และสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
          // ให้อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
          if (currentPp30Status !== 'pending_review' && currentPp30Status !== 'pending_recheck' && currentPp30Status !== '') {
            // อัพเดทเป็น timestamp ปัจจุบันเมื่อกดบันทึกซ้ำ
            pp30ReviewReturnedDate = formatTimestampUTCForAPI()
          }
          // ถ้าสถานะยังเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม)
        } else if (currentPp30Status !== 'pending_review' && currentPp30Status !== 'pending_recheck' && currentPp30Status !== '') {
          // ถ้าไม่มีข้อมูลอยู่แล้ว และสถานะไม่ใช่ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
          // ให้ set timestamp ปัจจุบัน
          pp30ReviewReturnedDate = formatTimestampUTCForAPI()
        }
      }
    }

    // Auto-timestamp สำหรับ draft_completed และ sent_to_customer (สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี)
    // ⚠️ สำคัญ: แยกการทำงานของสองสถานะนี้ไม่ให้ทับกัน
    // 1. เมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" (draft_completed) → ส่ง timestamp ไปยัง wht_draft_completed_date และ vat_draft_completed_date เท่านั้น
    // 2. เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" (sent_to_customer) → ส่ง timestamp ไปยัง pnd_sent_to_customer_date และ pp30_sent_to_customer_date เท่านั้น

    let whtDraftCompletedDate: string | null | undefined = undefined
    let vatDraftCompletedDate: string | null | undefined = undefined
    let pndSentToCustomerDate: string | null | undefined = undefined
    let pp30SentToCustomerDate: string | null | undefined = undefined

    // ✅ สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี: จัดการ wht_draft_completed_date และ vat_draft_completed_date
    // ⚠️ สำคัญ: หน้าตรวจภาษี (taxInspection) ไม่ควรจัดการ wht_draft_completed_date และ vat_draft_completed_date
    // ⚠️ สำคัญ: อัพเดทเฉพาะเมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" เท่านั้น ไม่ส่งค่าไป backend ถ้าไม่ได้เลือกสถานะนี้
    if (sourcePage === 'taxFiling' || sourcePage === 'taxStatus') {
      // สำหรับสถานะ "ร่างแบบเสร็จแล้ว" (draft_completed) ในช่อง "สถานะ ภ.ง.ด. *"
      // อัพเดทเฉพาะ wht_draft_completed_date เมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" เท่านั้น
      if (currentPndStatus === 'draft_completed') {
        whtDraftCompletedDate = formatTimestampUTCForAPI()
      }
      // ⚠️ สำคัญ: ถ้าไม่ได้เลือกสถานะ "ร่างแบบเสร็จแล้ว" ไม่ส่งค่าไป backend (undefined = ไม่ทับข้อมูล)

      // สำหรับสถานะ "ร่างแบบเสร็จแล้ว" (draft_completed) ในช่อง "สถานะ ภ.พ.30 *"
      // อัพเดทเฉพาะ vat_draft_completed_date เมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" เท่านั้น
      if (currentPp30Status === 'draft_completed') {
        vatDraftCompletedDate = formatTimestampUTCForAPI()
        // ✅ CRITICAL: ไม่ส่ง pp30_sent_to_customer_date เมื่อสถานะเป็น "ร่างแบบเสร็จแล้ว"
        // ให้เป็น undefined (ไม่ส่งไป backend = คงค่าเดิม) เพื่อป้องกันการลบข้อมูล
        // เพราะสถานะ "ร่างแบบเสร็จแล้ว" ใช้ vat_draft_completed_date แทน
        pp30SentToCustomerDate = undefined
      }
      // ⚠️ สำคัญ: ถ้าไม่ได้เลือกสถานะ "ร่างแบบเสร็จแล้ว" ไม่ส่งค่าไป backend (undefined = ไม่ทับข้อมูล)

      // สำหรับสถานะ "ส่งลูกค้าแล้ว" (sent_to_customer) - สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี
      // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      if (sourcePage === 'taxFiling' || sourcePage === 'taxStatus') {
        // ✅ CRITICAL: ส่ง pnd_sent_to_customer_date เฉพาะเมื่อสถานะเป็น "ส่งลูกค้าแล้ว" เท่านั้น
        if (currentPndStatus === 'sent_to_customer') {
          pndSentToCustomerDate = formatTimestampUTCForAPI()
        } else if (formValues.pnd_customer_sent_date) {
          // ถ้าผู้ใช้กรอกวันที่เอง (และสถานะไม่ใช่ "ส่งลูกค้าแล้ว", "ร่างแบบเสร็จแล้ว", "รอตรวจ", หรือ "ชำระแล้ว") ให้ใช้ค่าที่กรอก
          // ⚠️ สำคัญ: formValues.pnd_customer_sent_date อาจเป็น:
          // - ISO string จาก backend (เช่น "2026-02-01T05:31:08.000Z") → เป็น UTC แล้ว ต้องส่ง isAlreadyUTC = true
          // - Local time string จาก DatePickerInput (เช่น "2026-02-01 12:00:00") → เป็น local time ต้องส่ง isAlreadyUTC = false
          // - Empty string หรือ null → ข้ามไป
          // ✅ CRITICAL: ไม่ส่งเมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp (ใช้ helper function)
          if (!shouldNotSendTimestamp(currentPndStatus)) {
            const dateValue = formValues.pnd_customer_sent_date
            if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
              const isISOUTC = dateValue.includes('T') || dateValue.includes('Z')
              pndSentToCustomerDate = formatTimestampUTCForAPI(dateValue, isISOUTC)
            }
          }
        } else if (taxData?.pnd_sent_to_customer_date) {
          // ถ้าไม่ได้เลือกสถานะที่ไม่ต้องตั้ง timestamp และไม่ได้กรอกวันที่เอง แต่มีข้อมูลในฐานข้อมูลแล้ว ให้คงค่าเดิม
          // ✅ CRITICAL: ไม่ส่งเมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp (ใช้ helper function)
          if (!shouldNotSendTimestamp(currentPndStatus)) {
            pndSentToCustomerDate = taxData.pnd_sent_to_customer_date
          }
        }
        // ถ้า undefined = ไม่ส่งไป backend (ใช้ค่าเดิมจากฐานข้อมูล)

        // ✅ CRITICAL: ส่ง pp30_sent_to_customer_date เฉพาะเมื่อสถานะเป็น "ส่งลูกค้าแล้ว" เท่านั้น
        // ⚠️ สำคัญ: จัดการ pp30_sent_to_customer_date เฉพาะเมื่อไม่ได้เลือก "draft_completed"
        // (เพราะถ้าเลือก "draft_completed" จะ clear เป็น null แล้วข้างบน)
        if (currentPp30Status !== 'draft_completed') {
          if (currentPp30Status === 'sent_to_customer') {
            pp30SentToCustomerDate = formatTimestampUTCForAPI()
          } else if (formValues.pp30_customer_sent_date) {
            // ถ้าผู้ใช้กรอกวันที่เอง (และสถานะไม่ใช่ "ส่งลูกค้าแล้ว", "ร่างแบบเสร็จแล้ว", "รอตรวจ", หรือ "ชำระแล้ว") ให้ใช้ค่าที่กรอก
            // ⚠️ สำคัญ: formValues.pp30_customer_sent_date อาจเป็น:
            // - ISO string จาก backend (เช่น "2026-02-01T05:31:08.000Z") → เป็น UTC แล้ว ต้องส่ง isAlreadyUTC = true
            // - Local time string จาก DatePickerInput (เช่น "2026-02-01 12:00:00") → เป็น local time ต้องส่ง isAlreadyUTC = false
            // - Empty string หรือ null → ข้ามไป
            // ✅ CRITICAL: ไม่ส่งเมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp (ใช้ helper function)
            if (!shouldNotSendTimestamp(currentPp30Status)) {
              const dateValue = formValues.pp30_customer_sent_date
              if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
                const isISOUTC = dateValue.includes('T') || dateValue.includes('Z')
                pp30SentToCustomerDate = formatTimestampUTCForAPI(dateValue, isISOUTC)
              }
            }
          } else if (taxData?.pp30_sent_to_customer_date) {
            // ถ้าไม่ได้เลือกสถานะที่ไม่ต้องตั้ง timestamp และไม่ได้กรอกวันที่เอง แต่มีข้อมูลในฐานข้อมูลแล้ว ให้คงค่าเดิม
            // ✅ CRITICAL: ไม่ส่งเมื่อสถานะเป็นสถานะที่ไม่ต้องตั้ง timestamp (ใช้ helper function)
            if (!shouldNotSendTimestamp(currentPp30Status)) {
              pp30SentToCustomerDate = taxData.pp30_sent_to_customer_date
            }
          }
          // ถ้า undefined = ไม่ส่งไป backend (ใช้ค่าเดิมจากฐานข้อมูล)
        }
      }
    } else {
      // ✅ สำหรับหน้าตรวจภาษี: ไม่จัดการ wht_draft_completed_date และ vat_draft_completed_date
      // ให้เป็น undefined เสมอเพื่อป้องกันการทับข้อมูลที่บันทึกไว้จากหน้ายื่นภาษี (taxFiling) หรือหน้าสถานะยื่นภาษี (taxStatus)
      whtDraftCompletedDate = undefined
      vatDraftCompletedDate = undefined
    }

    const updateData: Partial<MonthlyTaxData> = {
      // ⚠️ สำคัญ: ส่ง sourcePage ไปยัง backend เพื่อให้ backend รู้ว่ามาจากหน้าอะไร (สำหรับตั้ง timestamp ตามหน้า)
      sourcePage: sourcePage || 'taxInspection', // ส่ง sourcePage ไปยัง backend
      // Document receipt
      document_received_date: documentReceiptDate ? formatTimestampUTCForAPI(documentReceiptDate) : null,
      bank_statement_status: bankStatementStatus || null,
      // Accounting status
      accounting_record_status: accountingStatus || null,
      monthly_tax_impact: monthlyTaxImpact || null,
      bank_impact: bankImpact || null,
      // PND/WHT fields
      // ✅ CRITICAL: ส่ง pnd_sent_for_review_date เฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
      // ⚠️ สำคัญ: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      ...(pndSentForReviewDate !== undefined && { pnd_sent_for_review_date: pndSentForReviewDate }),
      // ส่ง pnd_review_returned_date เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      ...(pndReviewReturnedDate !== undefined && { pnd_review_returned_date: pndReviewReturnedDate }),
      // สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี: ส่ง pnd_sent_to_customer_date เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" หรือมีค่าจาก form หรือมีค่าจากฐานข้อมูล
      // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      // ⚠️ สำคัญ: สำหรับหน้าตรวจภาษี ไม่ส่ง pnd_sent_to_customer_date เพราะสถานะต่างๆ มี field ของตัวเอง
      ...((sourcePage === 'taxFiling' || sourcePage === 'taxStatus') && pndSentToCustomerDate !== undefined
        ? { pnd_sent_to_customer_date: pndSentToCustomerDate }
        : {}),
      // ✅ สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี: ส่ง wht_draft_completed_date เมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" ในช่อง "สถานะ ภ.ง.ด. *" เท่านั้น
      // ⚠️ สำคัญ: หน้าตรวจภาษี (taxInspection) ไม่ควรส่ง wht_draft_completed_date ไปยัง backend
      // ⚠️ สำคัญ: ส่งค่าไป backend เฉพาะเมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" เท่านั้น ไม่ส่งค่าไป backend ถ้าไม่ได้เลือกสถานะนี้
      ...((sourcePage === 'taxFiling' || sourcePage === 'taxStatus') && whtDraftCompletedDate !== undefined && { wht_draft_completed_date: whtDraftCompletedDate }),
      pnd_status: formValues.pnd_status || null,
      // ⚠️ สำคัญ: ส่ง pp30_status ไปยัง backend เสมอ (แม้ว่าจะไม่มี field ในฐานข้อมูล แต่ backend จะใช้ตรวจสอบเพื่ออัพเดท timestamp และสร้าง notification)
      pp30_status: currentPp30Status || null, // TypeScript: pp30_status is defined in MonthlyTaxData interface
      wht_inquiry: whtInquiry || null,
      wht_response: whtReply || null,
      wht_submission_comment: taxFilingComment || null,
      wht_filing_response: taxFilingReply || null,
      // VAT/PP30 fields
      // ⚠️ สำคัญ: Clear pp30_filing_response เมื่อเปลี่ยนสถานะจาก "paid" เป็นสถานะอื่น
      // เพื่อให้สถานะแสดงถูกต้อง (ถ้ามี pp30_filing_response จะแสดง "paid" เสมอ)
      ...(currentPp30Status && currentPp30Status !== 'paid' && taxData?.pp30_filing_response
        ? { pp30_filing_response: null }  // Clear เมื่อเปลี่ยนจาก paid เป็นสถานะอื่น
        : {}),
      // ส่ง pp30_sent_for_review_date เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      // ✅ CRITICAL: ส่ง pp30_sent_for_review_date เฉพาะเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง" เท่านั้น
      // ⚠️ สำคัญ: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      ...(pp30SentForReviewDate !== null && pp30SentForReviewDate !== undefined && { pp30_sent_for_review_date: pp30SentForReviewDate }),
      // ส่ง pp30_review_returned_date เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      ...(pp30ReviewReturnedDate !== undefined && { pp30_review_returned_date: pp30ReviewReturnedDate }),
      // สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี: ส่ง pp30_sent_to_customer_date เมื่อเลือกสถานะ "ส่งลูกค้าแล้ว" หรือมีค่าจาก form หรือมีค่าจากฐานข้อมูล
      // ✅ CRITICAL: แต่ละสถานะจะส่ง timestamp เฉพาะ field ของตัวเองเท่านั้น ไม่กระทบ field อื่นๆ
      // ⚠️ สำคัญ: สำหรับหน้าตรวจภาษี ไม่ส่ง pp30_sent_to_customer_date เพราะสถานะต่างๆ มี field ของตัวเอง
      ...((sourcePage === 'taxFiling' || sourcePage === 'taxStatus') && pp30SentToCustomerDate !== undefined
        ? { pp30_sent_to_customer_date: pp30SentToCustomerDate }
        : {}),
      // ✅ สำหรับหน้ายื่นภาษีและหน้าสถานะยื่นภาษี: ส่ง vat_draft_completed_date เมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" ในช่อง "สถานะ ภ.พ.30 *" เท่านั้น
      // ⚠️ สำคัญ: หน้าตรวจภาษี (taxInspection) ไม่ควรส่ง vat_draft_completed_date ไปยัง backend
      // ⚠️ สำคัญ: ส่งค่าไป backend เฉพาะเมื่อเลือกสถานะ "ร่างแบบเสร็จแล้ว" เท่านั้น ไม่ส่งค่าไป backend ถ้าไม่ได้เลือกสถานะนี้
      ...((sourcePage === 'taxFiling' || sourcePage === 'taxStatus') && vatDraftCompletedDate !== undefined && { vat_draft_completed_date: vatDraftCompletedDate }),
      pp30_inquiry: vatInquiry || null,
      pp30_response: vatReply || null,
      pp30_submission_comment: vatFilingComment || null,
      // ⚠️ สำคัญ: Clear pp30_filing_response เมื่อเปลี่ยนสถานะจาก "paid" เป็นสถานะอื่น
      // เพื่อให้สถานะแสดงถูกต้อง (ถ้ามี pp30_filing_response จะแสดง "paid" เสมอ)
      ...(currentPp30Status && currentPp30Status !== 'paid' && taxData?.pp30_filing_response
        ? { pp30_filing_response: null }  // Clear เมื่อเปลี่ยนจาก paid เป็นสถานะอื่น
        : { pp30_filing_response: vatFilingReply || null }),  // ใช้ค่าจาก form หรือ null
      purchase_document_count: purchaseDocuments ? parseInt(purchaseDocuments.replace(/,/g, '')) : null,
      // PP30 Form and Income Confirmed (สำหรับหน้าสถานะยื่นภาษี)
      // ⚠️ สำคัญ: หลัง migration 028, pp30_form เปลี่ยนเป็น VARCHAR(100) เพื่อเก็บสถานะ pp30_status โดยตรง
      // ส่ง pp30_form เป็นสถานะ string (เช่น 'paid', 'sent_to_customer') แทน boolean
      // ส่ง pp30_form เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      ...(currentPp30Status !== '' && currentPp30Status !== null && { pp30_form: currentPp30Status }),
      // income_confirmed: ส่ง enum string โดยตรง (customer_confirmed, no_confirmation_needed, waiting_customer, customer_request_change)
      // ส่ง income_confirmed เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      ...(confirmIncomeStatus !== null && confirmIncomeStatus !== undefined && {
        income_confirmed: confirmIncomeStatus
      }),
      ...(confirmExpensesStatus !== null && confirmExpensesStatus !== undefined && {
        expenses_confirmed: confirmExpensesStatus
      }),
      // pp30_payment_status: ส่ง enum string โดยตรง (has_payment, no_payment)
      // ส่ง pp30_payment_status เฉพาะเมื่อมีค่า (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      ...(pp30PaymentStatus !== null && pp30PaymentStatus !== undefined && {
        pp30_payment_status: pp30PaymentStatus
      }),
      // pp30_payment_amount: ส่งตัวเลข (parseFloat)
      // ส่ง pp30_payment_amount เฉพาะเมื่อมีค่าและเป็นตัวเลขที่มากกว่า 0 (undefined = ไม่ส่งไป backend = ใช้ค่าเดิม)
      ...(pp30PaymentAmount && pp30PaymentAmount.trim() !== '' && {
        pp30_payment_amount: parseFloat(pp30PaymentAmount.replace(/,/g, ''))
      }),
      // Tax Form Statuses (ไม่ทับข้อมูลพนักงาน - responsible fields ไม่ได้ถูกส่งมา)
      pnd_1_40_1_status: formValues.pnd1_40_1 || null,
      pnd_1_40_2_status: formValues.pnd1_40_2 || null,
      pnd_3_status: formValues.pnd3 || null,
      pnd_53_status: formValues.pnd53 || null,
      pp_36_status: formValues.pp36 || null,
      student_loan_form_status: formValues.student_loan || null,
      pnd_2_status: formValues.pnd2 || null,
      pnd_54_status: formValues.pnd54 || null,
      pt_40_status: formValues.pth40 || null,
      social_security_form_status: formValues.social_security || null,
      // Tax Form Attachment Counts (ไม่ทับข้อมูลพนักงาน - responsible fields ไม่ได้ถูกส่งมา)
      // แปลง string เป็น number ถ้ามีค่า (ไม่ใช่ empty string) และไม่ใช่ NaN
      pnd_1_40_1_attachment_count: numberValues.pnd1_40_1 && numberValues.pnd1_40_1.trim() !== '' ? (isNaN(parseInt(numberValues.pnd1_40_1)) ? null : parseInt(numberValues.pnd1_40_1)) : null,
      pnd_1_40_2_attachment_count: numberValues.pnd1_40_2 && numberValues.pnd1_40_2.trim() !== '' ? (isNaN(parseInt(numberValues.pnd1_40_2)) ? null : parseInt(numberValues.pnd1_40_2)) : null,
      pnd_3_attachment_count: numberValues.pnd3 && numberValues.pnd3.trim() !== '' ? (isNaN(parseInt(numberValues.pnd3)) ? null : parseInt(numberValues.pnd3)) : null,
      pnd_53_attachment_count: numberValues.pnd53 && numberValues.pnd53.trim() !== '' ? (isNaN(parseInt(numberValues.pnd53)) ? null : parseInt(numberValues.pnd53)) : null,
      pp_36_attachment_count: numberValues.pp36 && numberValues.pp36.trim() !== '' ? (isNaN(parseInt(numberValues.pp36)) ? null : parseInt(numberValues.pp36)) : null,
      student_loan_form_attachment_count: numberValues.student_loan && numberValues.student_loan.trim() !== '' ? (isNaN(parseInt(numberValues.student_loan)) ? null : parseInt(numberValues.student_loan)) : null,
      pnd_2_attachment_count: numberValues.pnd2 && numberValues.pnd2.trim() !== '' ? (isNaN(parseInt(numberValues.pnd2)) ? null : parseInt(numberValues.pnd2)) : null,
      pnd_54_attachment_count: numberValues.pnd54 && numberValues.pnd54.trim() !== '' ? (isNaN(parseInt(numberValues.pnd54)) ? null : parseInt(numberValues.pnd54)) : null,
      pt_40_attachment_count: numberValues.pth40 && numberValues.pth40.trim() !== '' ? (isNaN(parseInt(numberValues.pth40)) ? null : parseInt(numberValues.pth40)) : null,
      social_security_form_attachment_count: numberValues.social_security && numberValues.social_security.trim() !== '' ? (isNaN(parseInt(numberValues.social_security)) ? null : parseInt(numberValues.social_security)) : null,
    }

    // ⚠️ สำคัญ: ไม่ส่ง responsible fields (accounting_responsible, tax_inspection_responsible, etc.)
    // เพื่อป้องกันการทับข้อมูลพนักงานที่เชื่อมมาจากงานที่ได้รับมอบหมาย
    // Backend จะไม่ update responsible fields ถ้าไม่ได้ส่งมา (ใช้ !== undefined check)

    // 🔍 Debug: Log ข้อมูลที่ส่งไป backend เพื่อตรวจสอบ BUG-166
    if (import.meta.env.DEV) {
      console.group('🔍 [TaxInspectionForm] ข้อมูลที่ส่งไปบันทึก (DEBUG BUG-166)')
      console.log('📋 Basic Info:', {
        buildId: taxData?.build,
        sourcePage,
        currentPndStatus,
        currentPp30Status,
      })
      console.log('📅 Draft Completed Dates (Variables):', {
        whtDraftCompletedDate: whtDraftCompletedDate !== undefined ? whtDraftCompletedDate : '(undefined - ไม่ส่งไป backend)',
        vatDraftCompletedDate: vatDraftCompletedDate !== undefined ? vatDraftCompletedDate : '(undefined - ไม่ส่งไป backend)',
        'whtDraftCompletedDate === undefined': whtDraftCompletedDate === undefined,
        'vatDraftCompletedDate === undefined': vatDraftCompletedDate === undefined,
      })
      console.log('📤 Update Data (wht_draft_completed_date & vat_draft_completed_date):', {
        'wht_draft_completed_date in updateData': 'wht_draft_completed_date' in updateData ? updateData.wht_draft_completed_date : '(ไม่มี key นี้ - ไม่ส่งไป backend)',
        'vat_draft_completed_date in updateData': 'vat_draft_completed_date' in updateData ? updateData.vat_draft_completed_date : '(ไม่มี key นี้ - ไม่ส่งไป backend)',
        'sourcePage === "taxFiling"': sourcePage === 'taxFiling',
        'currentPndStatus === "draft_completed"': currentPndStatus === 'draft_completed',
        'currentPp30Status === "draft_completed"': currentPp30Status === 'draft_completed',
      })
      console.log('📊 All Status Fields:', {
        pnd_status: updateData.pnd_status ?? '(ไม่ส่ง)',
        pp30_status: updateData.pp30_status ?? '(ไม่ส่ง)',
        pp30_filing_response: updateData.pp30_filing_response !== undefined ? (updateData.pp30_filing_response ? 'มีค่า' : 'null') : '(ไม่ส่ง)',
        pp30_payment_status: updateData.pp30_payment_status ?? '(ไม่ส่ง)',
        pp30_payment_amount: updateData.pp30_payment_amount ?? '(ไม่ส่ง)',
      })
      console.log('📦 Full Update Data Object:', updateData)
      console.log('🔍 BUG-185 Debug - PND Fields:', {
        'pnd_sent_for_review_date in updateData': 'pnd_sent_for_review_date' in updateData,
        'pnd_sent_for_review_date value': updateData.pnd_sent_for_review_date ?? '(undefined)',
        'pnd_review_returned_date in updateData': 'pnd_review_returned_date' in updateData,
        'pnd_review_returned_date value': updateData.pnd_review_returned_date ?? '(undefined)',
        'pnd_sent_to_customer_date in updateData': 'pnd_sent_to_customer_date' in updateData,
        'pnd_sent_to_customer_date value': updateData.pnd_sent_to_customer_date ?? '(undefined)',
        'pndSentForReviewDate variable': pndSentForReviewDate ?? '(undefined)',
        'pndReviewReturnedDate variable': pndReviewReturnedDate ?? '(undefined)',
        'pndSentToCustomerDate variable': pndSentToCustomerDate ?? '(undefined)',
      })
      console.log('🔍 BUG-185 Debug - PP30 Fields:', {
        'pp30_sent_for_review_date in updateData': 'pp30_sent_for_review_date' in updateData,
        'pp30_sent_for_review_date value': updateData.pp30_sent_for_review_date ?? '(undefined)',
        'pp30_review_returned_date in updateData': 'pp30_review_returned_date' in updateData,
        'pp30_review_returned_date value': updateData.pp30_review_returned_date ?? '(undefined)',
        'pp30_sent_to_customer_date in updateData': 'pp30_sent_to_customer_date' in updateData,
        'pp30_sent_to_customer_date value': updateData.pp30_sent_to_customer_date ?? '(undefined)',
        'pp30SentForReviewDate variable': pp30SentForReviewDate ?? '(undefined)',
        'pp30ReviewReturnedDate variable': pp30ReviewReturnedDate ?? '(undefined)',
        'pp30SentToCustomerDate variable': pp30SentToCustomerDate ?? '(undefined)',
      })
      console.groupEnd()
    }
    updateMutation.mutate(updateData)
  }

  // Options for Document Status
  const documentStatusOptions = [
    { value: 'received', label: 'รับครับแล้ว', color: '#4caf50' }, // Green
    { value: 'requesting', label: 'อยู่ระหว่างการขอ', color: '#ffc107' }, // Yellow
    { value: 'late', label: 'ลูกค้าส่งเอกสารล้าช้า', color: '#f44336' }, // Red
    { value: 'no_response', label: 'ลูกค้าไม่ตอบสนอง', color: '#f44336' }, // Red
  ]

  // Options for Accounting Status
  const accountingStatusOptions = [
    { value: 'more_than_month', label: 'เหลือมากกว่า 1 เดือน', color: '#ffc107' }, // Yellow
    { value: 'completed', label: 'บันทึกครบแล้ว', color: '#4caf50' }, // Green
    { value: 'missing_docs', label: 'ขาดเอกสารบางรายการ', color: '#ff6b35' }, // Orange
  ]

  // Options for Bank Statement Status
  const bankStatementStatusOptions = [
    { value: 'received', label: 'รับครบแล้ว', color: '#4caf50' }, // Green
    { value: 'requesting', label: 'อยู่ระหว่างการขอ', color: '#ffc107' }, // Yellow
    { value: 'no_bank', label: 'ลูกค้ายังไม่เปิดธนาคาร', color: '#f44336' }, // Red
    { value: 'no_response', label: 'ไม่ตอบสนอง', color: '#f44336' }, // Red
  ]

  // Options for Monthly Tax Impact
  const monthlyTaxImpactOptions = [
    { value: 'impacted', label: 'กระทบแล้ว', color: '#4caf50' }, // Green
    { value: 'partial', label: 'กระทบบางส่วน', color: '#f44336' }, // Red
  ]

  // Options for Bank Impact
  const bankImpactOptions = [
    { value: 'all_match', label: 'แบงค์ตรงทุกรายการ', color: '#4caf50' }, // Green
    { value: 'partial', label: 'กระทบแล้วบางส่วน', color: '#ffc107' }, // Yellow
    { value: 'no_bank', label: 'ลูกค้ายังไม่เปิดธนาคาร', color: '#f44336' }, // Red
    { value: 'no_docs', label: 'ลูกค้าไม่ส่งเอกสาร', color: '#f44336' }, // Red
  ]

  // Status descriptions for help tooltips
  const statusDescriptions = {
    accounting_record_status: [
      { value: 'more_than_month', label: 'เหลือมากกว่า 1 เดือน', description: 'ยังไม่ได้บันทึกเอกสารเข้าระบบพีคมากกว่า 1 เดือน (สอดคล้องกับลูกค้าไม่ตอบสนอง)' },
      { value: 'completed', label: 'บันทึกครบแล้ว', description: 'มีการบันทึกเอกสารเข้าระบบพีคทั้งหมดครบทุกเดือน' },
      { value: 'missing_docs', label: 'ขาดเอกสารบางรายการ', description: 'เฉพาะในเดือนปัจจุบัน ขาดเอกสารที่ยังไม่ได้บันทึกเข้าระบบพีคแค่บางรายการ (สอดคล้องกับขาดเอกสารบางราย)' },
    ],
    bank_statement_status: [
      { value: 'received', label: 'รับครบแล้ว', description: 'ได้รับ STM ครบแล้วทุกเดือน' },
      { value: 'requesting', label: 'อยู่ระหว่างการขอ', description: 'เฉพาะในเดือนปัจจุบันที่ยังไม่ได้รับ STM' },
      { value: 'no_bank', label: 'ลูกค้ายังไม่เปิดธนาคาร', description: 'ลูกค้ายังไม่เปิดบัญชีธนาคารบริษัท' },
      { value: 'no_response', label: 'ไม่ตอบสนอง', description: 'ติดตามขอลูกค้าแล้ว แต่ลูกค้าไม่มีการตอบสนองกลับมา เงียบหาย' },
    ],
    monthly_tax_reconciliation: [
      { value: 'impacted', label: 'กระทบแล้ว', description: 'กระทบภาษีทุกเดือน เป็นปัจจุบันแล้ว' },
      { value: 'partial', label: 'กระทบบางส่วน', description: 'กระทบภาษีบางเดือน' },
    ],
    bank_reconciliation: [
      { value: 'all_match', label: 'แบงค์ตรงทุกรายการ', description: 'ข้อมูลในพีค ตรงตาม STM ทุกเดือน' },
      { value: 'partial', label: 'กระทบแล้วบางส่วน', description: 'ข้อมูลตรงตาม STM บางเดือน' },
      { value: 'no_bank', label: 'ลูกค้ายังไม่เปิดธนาคาร', description: 'ลูกค้ายังไม่เปิดบัญชีธนาคารบริษัท' },
      { value: 'no_docs', label: 'ลูกค้าไม่ส่งเอกสาร', description: 'ติดตามขอลูกค้าแล้ว แต่ลูกค้าไม่มีการตอบสนองกลับมา เงียบหาย' },
    ],
  }

  // State for expanded status info sections
  const [expandedStatusInfo, setExpandedStatusInfo] = useState<Record<string, boolean>>({
    accounting_record_status: false,
    bank_statement_status: false,
    monthly_tax_reconciliation: false,
    bank_reconciliation: false,
    confirm_income: false,
  })

  // Helper function to toggle status info
  const toggleStatusInfo = (fieldName: string) => {
    setExpandedStatusInfo((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }))
  }

  // Helper component for Status Info Button
  const StatusInfoButton = ({ fieldName }: { fieldName: string }) => {
    const toggleExpanded = () => {
      toggleStatusInfo(fieldName)
    }

    return (
      <ActionIcon
        variant="subtle"
        color="orange"
        size="sm"
        onClick={toggleExpanded}
        style={{ cursor: 'pointer' }}
      >
        <TbInfoCircle size={16} />
      </ActionIcon>
    )
  }

  // Helper function to get status color from options array (for General Information Tab)
  const getStatusColorFromOptions = (value: string | null, options: Array<{ value: string; color: string }>): string => {
    if (!value) return '#ffffff' // White background when no selection
    const status = options.find((s) => s.value === value)
    return status?.color || '#ffffff'
  }

  // Helper function to get status color for document status
  const getDocumentStatusColor = (value: string | null): string => {
    return getStatusColorFromOptions(value, documentStatusOptions)
  }

  // Helper function to get status color for accounting status
  const getAccountingStatusColor = (value: string | null): string => {
    return getStatusColorFromOptions(value, accountingStatusOptions)
  }

  // Helper function to get status color for bank statement status
  const getBankStatementStatusColor = (value: string | null): string => {
    return getStatusColorFromOptions(value, bankStatementStatusOptions)
  }

  // Helper function to get status color for monthly tax impact
  const getMonthlyTaxImpactColor = (value: string | null): string => {
    return getStatusColorFromOptions(value, monthlyTaxImpactOptions)
  }

  // Helper function to get status color for bank impact
  const getBankImpactColor = (value: string | null): string => {
    return getStatusColorFromOptions(value, bankImpactOptions)
  }

  // Helper function to format date from YYYY-MM-DD to dd/mm/yyyy (for DATE fields only)
  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString || dateString === '-') return '-'
    try {
      const date = dayjs(dateString)
      if (!date.isValid()) return dateString
      return date.format('DD/MM/YYYY')
    } catch (error) {
      return dateString
    }
  }, [])

  // Use API data or fallback to mock data
  // Use useMemo to recalculate when employeesData loads (for nickname lookup)
  const companyData = useMemo(() => {
    if (clientData) {
      return {
        build: clientData.build,
        companyName: clientData.company_name || '-',
        legalEntityNumber: clientData.legal_entity_number || '-',
        address: clientData.full_address || '-',
        taxRegistrationStatus: clientData.tax_registration_status || '-',
        vatRegistrationDate: formatDate(clientData.vat_registration_date) || '-',
        website: '-',
        accountingResponsible: (() => {
          const firstName = taxData?.accounting_responsible_first_name || null
          const nickName = taxData?.accounting_responsible_nick_name || null

          if (firstName && nickName) {
            return `${firstName}(${nickName})`
          }

          return formatEmployeeNameWithId(
            taxData?.accounting_responsible_name || null,
            taxData?.accounting_responsible || null
          )
        })(), // ใช้ first_name และ nick_name สำหรับผู้ทำบัญชี พร้อม nickname
        preparedBy: formatEmployeeNameWithId(
          taxData?.accounting_responsible_name || null,
          taxData?.accounting_responsible || null
        ), // ใช้ accounting_responsible_name สำหรับผู้ทำ (ทำบัญชี) พร้อม nickname (backward compatibility)
        taxInspector: (() => {
          const firstName = taxData?.tax_inspection_responsible_first_name || null
          const nickName = taxData?.tax_inspection_responsible_nick_name || null

          if (firstName && nickName) {
            return `${firstName}(${nickName})`
          }

          return formatEmployeeNameWithId(
            taxData?.tax_inspection_responsible_name || null,
            taxData?.tax_inspection_responsible || null
          )
        })(), // ใช้ first_name และ nick_name สำหรับผู้ตรวจภาษี พร้อม nickname
        responsibleEmployee: formatEmployeeNameWithId(
          taxData?.document_entry_responsible_name || null,
          taxData?.document_entry_responsible || null
        ), // ใช้ document_entry_responsible_name สำหรับพนักงานที่รับผิดชอบในการคีย์ พร้อม nickname
        whtFilerEmployee: (() => {
          // ใช้ wht_filer_current_employee_id ก่อน ถ้าไม่มีค่อยใช้ wht_filer_employee_id
          const currentEmployeeId = taxData?.wht_filer_current_employee_id || null
          const employeeId = taxData?.wht_filer_employee_id || null
          const currentFirstName = taxData?.wht_filer_current_employee_first_name || null
          const currentNickName = taxData?.wht_filer_current_employee_nick_name || null
          const firstName = taxData?.wht_filer_employee_first_name || null
          const nickName = taxData?.wht_filer_employee_nick_name || null

          // ถ้ามี current employee และมี first_name และ nick_name ให้ใช้โดยตรง
          if (currentFirstName && currentNickName) {
            return `${currentFirstName}(${currentNickName})`
          }

          // ถ้าไม่มี current employee แต่มี employee และมี first_name และ nick_name ให้ใช้
          if (firstName && nickName) {
            return `${firstName}(${nickName})`
          }

          // ถ้าไม่มี first_name หรือ nick_name ให้ใช้ formatEmployeeNameWithId
          return formatEmployeeNameWithId(
            taxData?.wht_filer_current_employee_name || taxData?.wht_filer_employee_name || null,
            currentEmployeeId || employeeId
          )
        })(), // ใช้ first_name และ nick_name สำหรับพนักงานที่ยื่น WHT พร้อม nickname
        vatFilerEmployee: (() => {
          // ใช้ vat_filer_current_employee_id ก่อน ถ้าไม่มีค่อยใช้ vat_filer_employee_id
          const currentEmployeeId = taxData?.vat_filer_current_employee_id || null
          const employeeId = taxData?.vat_filer_employee_id || null
          const currentFirstName = taxData?.vat_filer_current_employee_first_name || null
          const currentNickName = taxData?.vat_filer_current_employee_nick_name || null
          const firstName = taxData?.vat_filer_employee_first_name || null
          const nickName = taxData?.vat_filer_employee_nick_name || null

          // ถ้ามี current employee และมี first_name และ nick_name ให้ใช้โดยตรง
          if (currentFirstName && currentNickName) {
            return `${currentFirstName}(${currentNickName})`
          }

          // ถ้าไม่มี current employee แต่มี employee และมี first_name และ nick_name ให้ใช้
          if (firstName && nickName) {
            return `${firstName}(${nickName})`
          }

          // ถ้าไม่มี first_name หรือ nick_name ให้ใช้ formatEmployeeNameWithId
          return formatEmployeeNameWithId(
            taxData?.vat_filer_current_employee_name || taxData?.vat_filer_employee_name || null,
            currentEmployeeId || employeeId
          )
        })(), // ใช้ first_name และ nick_name สำหรับพนักงานที่ยื่น VAT พร้อม nickname
      }
    } else {
      return {
        build: buildId || '-',
        companyName: '-',
        legalEntityNumber: '-',
        address: '-',
        taxRegistrationStatus: '-',
        vatRegistrationDate: '-',
        website: '-',
        accountingResponsible: '-',
        preparedBy: '-',
        responsibleEmployee: '-',
        taxInspector: '-',
        whtFilerEmployee: '-',
        vatFilerEmployee: '-',
      }
    }
  }, [clientData, taxData, employeesData, buildId, formatEmployeeNameWithId, formatDate]) // Recalculate when employeesData changes

  // Helper function to format date from YYYY-MM-DD HH:mm:ss to dd/mm/yyyy hh:mm:ss
  // ⚠️ สำคัญ: แสดงเวลาตามที่เก็บในฐานข้อมูลเลยโดยไม่แปลง timezone (ตัดการบวก offset ทั้งหมด)
  // 
  // การแสดงผล:
  // - Input: '2026-02-05 16:03:54' (YYYY-MM-DD HH:mm:ss จาก database)
  // - Output: '05/02/2026 16:03:54' (DD/MM/YYYY HH:mm:ss สำหรับแสดงผล)
  // 
  // ฟังก์ชันนี้จะแปลง format โดยตรงโดยไม่ parse เป็น Date object เพื่อไม่ให้แปลง timezone
  const formatDateTime = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return ''
    const s = String(dateString).trim()
    if (!s) return ''

    // ถ้าเป็น format 'YYYY-MM-DD HH:mm:ss' ให้แปลง format โดยตรงโดยไม่ parse เป็น Date object
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      // ตัด milliseconds ออกถ้ามี
      const cleanStr = s.split('.')[0]
      // แยกส่วน: YYYY-MM-DD และ HH:mm:ss
      const [datePart, timePart] = cleanStr.split(' ')
      const [year, month, day] = datePart.split('-')
      // แปลงเป็น DD/MM/YYYY HH:mm:ss โดยตรง (ไม่ parse เป็น Date object)
      const result = `${day}/${month}/${year} ${timePart}`
      // 🔍 Debug: Log การแปลง timestamp (เฉพาะใน development)
      if (import.meta.env.DEV) {
        console.log('[formatDateTime] Formatting timestamp (direct conversion):', {
          input: dateString,
          output: result,
          method: 'direct string manipulation'
        })
      }
      return result
    }

    // Fallback: ใช้ formatDateTimeNoConversion สำหรับ format อื่นๆ
    const result = formatDateTimeNoConversion(dateString, 'DD/MM/YYYY HH:mm:ss')
    // 🔍 Debug: Log การแปลง timestamp (เฉพาะใน development)
    if (import.meta.env.DEV && dateString) {
      console.log('[formatDateTime] Formatting timestamp (fallback):', {
        input: dateString,
        output: result,
        method: 'formatDateTimeNoConversion'
      })
    }
    return result
  }, [])

  // Map WHT update data from taxData
  // ✅ Performance: ใช้ useMemo เพื่อลดการเรียก formatDateTime ซ้ำๆ เมื่อ component re-render
  const whtUpdateData = useMemo(() => {
    return {
      pndSentDate: formatDateTime(taxData?.pnd_sent_for_review_date),
      pndReturnDate: formatDateTime(taxData?.pnd_review_returned_date),
      pndCustomerSentDate: formatDateTime(taxData?.pnd_sent_to_customer_date),
      whtDraftCompletedDate: formatDateTime(taxData?.wht_draft_completed_date),
    }
  }, [formatDateTime, taxData?.pnd_sent_for_review_date, taxData?.pnd_review_returned_date, taxData?.pnd_sent_to_customer_date, taxData?.wht_draft_completed_date])

  // Map VAT update data from taxData
  // ✅ Performance: ใช้ useMemo เพื่อลดการเรียก formatDateTime ซ้ำๆ เมื่อ component re-render
  const vatUpdateData = useMemo(() => ({
    pp30SentDate: formatDateTime(taxData?.pp30_sent_for_review_date),
    pp30ReturnDate: formatDateTime(taxData?.pp30_review_returned_date),
    pp30CustomerSentDate: formatDateTime(taxData?.pp30_sent_to_customer_date),
    vatDraftCompletedDate: formatDateTime(taxData?.vat_draft_completed_date),
  }), [formatDateTime, taxData?.pp30_sent_for_review_date, taxData?.pp30_review_returned_date, taxData?.pp30_sent_to_customer_date, taxData?.vat_draft_completed_date])

  // Map WHT reply data from taxData
  const whtReplyData = {
    reply: taxData?.wht_response || '',
  }

  // Map VAT reply data from taxData
  const vatReplyData = {
    reply: taxData?.pp30_response || '',
  }

  const renderContent = () => {
    if (isLoadingTaxData || isLoadingClient) {
      return (
        <Modal
          opened={opened}
          onClose={onClose}
          size="xl"
          title="กำลังโหลดข้อมูล..."
          closeOnClickOutside={false}
          closeOnEscape={false}
          withCloseButton={false}
        >
          <Stack gap="md" align="center" py="xl">
            <Loader size="lg" color="orange" />
            <Text size="sm" c="dimmed" ta="center">
              กำลังโหลดข้อมูลภาษีรายเดือนและข้อมูลบริษัท...
            </Text>
          </Stack>
        </Modal>
      )
    }

    if (!taxData && buildId) {
      return (
        <Modal opened={opened} onClose={onClose} size="xl" title="เกิดข้อผิดพลาด">
          <Alert icon={<TbAlertCircle size={16} />} color="red" title="ไม่พบข้อมูล">
            ไม่พบข้อมูลภาษีรายเดือนสำหรับ Build {buildId} ในเดือน {currentMonth}/{currentYear}
          </Alert>
        </Modal>
      )
    }

    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Group>
              <div
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TbFileText size={24} color="#ff6b35" />
              </div>
              <Text fw={700} size="xl" c="white">
                ฟอร์มสถานะภาษีประจำเดือน
              </Text>
            </Group>
            <Button
              variant="light"
              color="white"
              size="sm"
              radius="md"
              leftSection={
                isRefreshing ? (
                  <Loader size={14} color="#ff6b35" />
                ) : (
                  <TbRefresh size={16} />
                )
              }
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingTaxData || !buildId}
              style={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
            </Button>
          </Group>
        }
        size="xl"
        fullScreen
        styles={{
          header: {
            backgroundColor: '#ff6b35',
            color: 'white',
          },
          close: {
            color: 'white',
          },
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
          content: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Stack gap={0} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Form Content */}
          <ScrollArea style={{ flex: 1, minHeight: 0 }} p="lg">
            {/* Company Information & Responsible Person Information Section */}
            <Card
              withBorder
              radius={0}
              p="lg"
              mb="lg"
              style={{
                backgroundColor: '#fff8f5',
                borderBottom: '3px solid #ff6b35',
                position: 'relative',
              }}
            >
              <Stack gap="lg">
                {/* Company Information Section */}
                <Group align="flex-start" gap="lg">
                  {/* Orange Header Bar */}
                  <Group
                    gap="xs"
                    p="xs"
                    style={{
                      backgroundColor: '#ff6b35',
                      borderRadius: '8px',
                      minWidth: '200px',
                    }}
                  >
                    <TbBuilding size={20} color="white" />
                    <Text fw={700} size="md" c="white">
                      ข้อมูลบริษัท
                    </Text>
                  </Group>

                  {/* Company Info Grid - เรียงลำดับตามที่กำหนด */}
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg" style={{ flex: 1 }}>
                    {/* 1. Build */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        Build
                      </Text>
                      <Group gap="sm">
                        <TbCalendar size={20} color="#ff6b35" />
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.build}
                        </Text>
                      </Group>
                    </div>

                    {/* 2. ชื่อบริษัท */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        ชื่อบริษัท
                      </Text>
                      <Group gap="sm" align="flex-start">
                        <TbBuilding size={20} color="#ff6b35" style={{ marginTop: 2 }} />
                        <Text size="lg" fw={700} c="dark.8" style={{ flex: 1 }}>
                          {companyData.companyName}
                        </Text>
                      </Group>
                    </div>

                    {/* 3. เลขทะเบียนนิติบุคคล */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        เลขทะเบียนนิติบุคคล
                      </Text>
                      <Group gap="sm">
                        <TbId size={20} color="#ff6b35" />
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.legalEntityNumber}
                        </Text>
                      </Group>
                    </div>

                    {/* 4. ไซต์บริษัท */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        ไซต์บริษัท
                      </Text>
                      <Group gap="sm">
                        <TbWorld size={20} color="#ff6b35" />
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.website}
                        </Text>
                      </Group>
                    </div>

                    {/* 5. สถานะจดทะเบียนภาษี */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        สถานะจดทะเบียนภาษี
                      </Text>
                      <Group gap="sm">
                        <TbFileInvoice size={20} color="#ff6b35" />
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.taxRegistrationStatus}
                        </Text>
                      </Group>
                    </div>

                    {/* 6. วันที่จดภาษีมูลค่าเพิ่ม */}
                    <div>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        วันที่จดภาษีมูลค่าเพิ่ม
                      </Text>
                      <Group gap="sm">
                        <TbCalendar size={20} color="#ff6b35" />
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.vatRegistrationDate}
                        </Text>
                      </Group>
                    </div>

                    {/* ที่อยู่บริษัท - Full Width */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Text size="sm" c="gray.7" fw={600} mb={8}>
                        ที่อยู่บริษัท
                      </Text>
                      <Group gap="sm" align="flex-start">
                        <TbMapPin size={20} color="#ff6b35" style={{ marginTop: 2 }} />
                        <Text size="lg" fw={600} c="dark.8" style={{ flex: 1, lineHeight: 1.7 }}>
                          {companyData.address}
                        </Text>
                      </Group>
                    </div>
                  </SimpleGrid>
                </Group>

                {/* Responsible Person Information Section */}
                <Group align="flex-start" gap="lg">
                  {/* Orange Header Bar */}
                  <Group
                    gap="xs"
                    p="xs"
                    style={{
                      backgroundColor: '#ff6b35',
                      borderRadius: '8px',
                      minWidth: '200px',
                    }}
                  >
                    <TbUser size={20} color="white" />
                    <Text fw={700} size="md" c="white">
                      ข้อมูลผู้รับผิดชอบ
                    </Text>
                  </Group>

                  {/* Responsible Person Info - Display horizontally - เรียงลำดับตามที่กำหนด */}
                  <Group gap="xl" style={{ flex: 1, flexWrap: 'wrap' }}>
                    {/* 1. ผู้ทำบัญชี */}
                    {companyData.accountingResponsible && companyData.accountingResponsible !== '-' && (
                      <div>
                        <Text size="sm" c="gray.7" fw={600} mb={4}>
                          ผู้ทำบัญชี
                        </Text>
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.accountingResponsible}
                        </Text>
                      </div>
                    )}
                    {/* 2. ผู้ตรวจภาษี */}
                    {companyData.taxInspector && companyData.taxInspector !== '-' && (
                      <div>
                        <Text size="sm" c="gray.7" fw={600} mb={4}>
                          ผู้ตรวจภาษี
                        </Text>
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.taxInspector}
                        </Text>
                      </div>
                    )}
                    {/* 3. พนักงานที่รับผิดชอบในการคีย์ */}
                    {companyData.responsibleEmployee && companyData.responsibleEmployee !== '-' && (
                      <div>
                        <Text size="sm" c="gray.7" fw={600} mb={4}>
                          พนักงานที่รับผิดชอบในการคีย์
                        </Text>
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.responsibleEmployee}
                        </Text>
                      </div>
                    )}
                    {/* 4. พนักงานที่ยื่น WHT */}
                    {companyData.whtFilerEmployee && companyData.whtFilerEmployee !== '-' && (
                      <div>
                        <Text size="sm" c="gray.7" fw={600} mb={4}>
                          พนักงานที่ยื่น WHT
                        </Text>
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.whtFilerEmployee}
                        </Text>
                      </div>
                    )}
                    {/* 5. พนักงานที่ยื่น VAT */}
                    {companyData.vatFilerEmployee && companyData.vatFilerEmployee !== '-' && (
                      <div>
                        <Text size="sm" c="gray.7" fw={600} mb={4}>
                          พนักงานที่ยื่น VAT
                        </Text>
                        <Text size="lg" fw={700} c="dark.8">
                          {companyData.vatFilerEmployee}
                        </Text>
                      </div>
                    )}
                  </Group>
                </Group>
              </Stack>
            </Card>
            <Tabs
              value={activeTab}
              onChange={(value) => {
                // Prevent switching to VAT tab if not registered
                if (value === 'debtor' && !isVatRegistered) {
                  notifications.show({
                    title: 'ไม่สามารถเข้าใช้งานได้',
                    message: 'บริษัทนี้ยังไม่จดภาษีมูลค่าเพิ่ม กรุณาตรวจสอบสถานะจดทะเบียนภาษีมูลค่าเพิ่ม',
                    color: 'orange',
                    icon: <TbAlertCircle size={16} />,
                  })
                  return
                }
                // Access control logic สำหรับหน้ายื่นภาษี:
                // - wht_filer (ผู้รับผิดชอบ WHT) → เข้าถึงแถบ WHT ได้เท่านั้น
                // - vat_filer (ผู้รับผิดชอบ VAT) → เข้าถึงแถบ VAT ได้เท่านั้น
                // Prevent switching to WHT tab if user is NOT wht_filer
                if (value === 'vat' && sourcePage === 'taxFiling' && !isWhtFiler) {
                  notifications.show({
                    title: 'ไม่สามารถเข้าใช้งานได้',
                    message: 'คุณเป็นผู้รับผิดชอบในการยื่น VAT เท่านั้น ไม่สามารถเข้าถึงแถบ WHT ได้',
                    color: 'orange',
                    icon: <TbAlertCircle size={16} />,
                  })
                  return
                }
                // Prevent switching to VAT tab if user is NOT vat_filer
                if (value === 'debtor' && sourcePage === 'taxFiling' && !isVatFiler) {
                  notifications.show({
                    title: 'ไม่สามารถเข้าใช้งานได้',
                    message: 'คุณเป็นผู้รับผิดชอบในการยื่น WHT เท่านั้น ไม่สามารถเข้าถึงแถบ VAT ได้',
                    color: 'orange',
                    icon: <TbAlertCircle size={16} />,
                  })
                  return
                }
                setActiveTab(value || 'general')
              }}
              styles={{
                list: {
                  gap: 0,
                },
              }}
            >
              <Tabs.List grow>
                <Tabs.Tab
                  value="general"
                  leftSection={<TbFileText size={16} />}
                  style={{
                    backgroundColor: '#4facfe',
                    color: 'white',
                  }}
                  className="tax-tab-general"
                >
                  ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท
                </Tabs.Tab>
                <Tabs.Tab
                  value="vat"
                  leftSection={<TbFileText size={16} />}
                  disabled={sourcePage === 'taxFiling' && !isWhtFiler}
                  style={{
                    backgroundColor: sourcePage === 'taxFiling' && !isWhtFiler ? '#cccccc' : '#ff6b35',
                    color: 'white',
                    opacity: sourcePage === 'taxFiling' && !isWhtFiler ? 0.6 : 1,
                    cursor: sourcePage === 'taxFiling' && !isWhtFiler ? 'not-allowed' : 'pointer',
                  }}
                  className="tax-tab-vat"
                >
                  ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)
                </Tabs.Tab>
                <Tabs.Tab
                  value="debtor"
                  leftSection={<TbFileText size={16} />}
                  disabled={!isVatRegistered || (sourcePage === 'taxFiling' && !isVatFiler)}
                  style={{
                    backgroundColor: (!isVatRegistered || (sourcePage === 'taxFiling' && !isVatFiler)) ? '#cccccc' : '#4caf50',
                    color: 'white',
                    opacity: (!isVatRegistered || (sourcePage === 'taxFiling' && !isVatFiler)) ? 0.6 : 1,
                    cursor: (!isVatRegistered || (sourcePage === 'taxFiling' && !isVatFiler)) ? 'not-allowed' : 'pointer',
                  }}
                  className="tax-tab-debtor"
                >
                  ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)
                </Tabs.Tab>
              </Tabs.List>

              {/* General Information Tab */}
              <Tabs.Panel value="general" pt="lg">
                <Card withBorder radius="lg" p="lg" style={{ borderLeft: '4px solid #4facfe', boxShadow: '0 2px 8px rgba(79, 172, 254, 0.1)', position: 'relative' }}>
                  <Stack gap="md">
                    {/* เอกสาร Section */}
                    <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f0f8ff', borderLeft: '3px solid #4facfe' }}>
                      <Group gap="xs" mb="md" justify="center">
                        <TbFileText size={18} color="#4facfe" />
                        <Text size="sm" fw={600} c="#4facfe" style={{ textAlign: 'center' }}>
                          เอกสาร
                        </Text>
                      </Group>
                      <Group grow>
                        <DatePickerInput
                          label="วันที่รับเอกสาร"
                          placeholder="เลือกหรือกรอกวันที่"
                          value={documentReceiptDate}
                          onChange={readOnlyGeneralInfo ? undefined : setDocumentReceiptDate}
                          leftSection={<TbCalendar size={16} />}
                          radius="lg"
                          clearable={!readOnlyGeneralInfo}
                          disabled={readOnlyGeneralInfo}
                          readOnly={readOnlyGeneralInfo}
                          valueFormat="DD/MM/YYYY"
                          styles={{
                            label: {
                              textAlign: 'center',
                              width: '100%',
                              display: 'block',
                            },
                            input: {
                              textAlign: 'center',
                              backgroundColor: readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff',
                              cursor: readOnlyGeneralInfo ? 'not-allowed' : 'text',
                            },
                          }}
                        />
                        <Select
                          label="สถานะเอกสาร"
                          placeholder="— เลือกสถานะ —"
                          value={documentStatus}
                          onChange={readOnlyGeneralInfo ? undefined : setDocumentStatus}
                          data={documentStatusOptions.map((s) => ({ value: s.value, label: s.label }))}
                          leftSection={<TbFileText size={16} />}
                          radius="lg"
                          searchable={!readOnlyGeneralInfo}
                          clearable={!readOnlyGeneralInfo}
                          disabled={readOnlyGeneralInfo}
                          styles={{
                            label: {
                              textAlign: 'center',
                              width: '100%',
                              display: 'block',
                            },
                            input: {
                              backgroundColor: documentStatus ? getDocumentStatusColor(documentStatus) : (readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff'),
                              color: documentStatus ? '#ffffff' : '#000000',
                              borderColor: documentStatus ? getDocumentStatusColor(documentStatus) : '#000000',
                              borderWidth: '2px',
                              textAlign: 'center',
                              cursor: readOnlyGeneralInfo ? 'not-allowed' : 'pointer',
                            },
                          }}
                        />
                      </Group>
                    </Card>

                    {/* ข้อมูลกระทบยอด Section */}
                    <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f0fff4', borderLeft: '3px solid #4caf50' }}>
                      <Group gap="xs" mb="md" justify="center">
                        <TbFileInvoice size={18} color="#4caf50" />
                        <Text size="sm" fw={600} c="#4caf50" style={{ textAlign: 'center' }}>
                          ข้อมูลกระทบยอด
                        </Text>
                      </Group>
                      <Group grow>
                        <div>
                          <Group gap="xs" justify="center" mb="xs">
                            <Text
                              size="sm"
                              fw={500}
                              style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => toggleStatusInfo('accounting_record_status')}
                            >
                              สถานะบันทึกบัญชี
                            </Text>
                            <StatusInfoButton fieldName="accounting_record_status" />
                          </Group>
                          <Select
                            placeholder="— เลือกสถานะ —"
                            value={accountingStatus}
                            onChange={readOnlyGeneralInfo ? undefined : setAccountingStatus}
                            data={accountingStatusOptions.map((s) => ({ value: s.value, label: s.label }))}
                            leftSection={<TbFileText size={16} />}
                            radius="lg"
                            searchable={!readOnlyGeneralInfo}
                            clearable={!readOnlyGeneralInfo}
                            disabled={readOnlyGeneralInfo}
                            styles={{
                              input: {
                                backgroundColor: accountingStatus ? getAccountingStatusColor(accountingStatus) : (readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff'),
                                color: accountingStatus ? '#ffffff' : '#000000',
                                borderColor: accountingStatus ? getAccountingStatusColor(accountingStatus) : '#000000',
                                borderWidth: '2px',
                                textAlign: 'center',
                                cursor: readOnlyGeneralInfo ? 'not-allowed' : 'pointer',
                              },
                            }}
                          />
                          {expandedStatusInfo.accounting_record_status && (
                            <Card
                              withBorder
                              radius="md"
                              p="sm"
                              mt="xs"
                              style={{
                                backgroundColor: '#fff3e0',
                                borderColor: '#ff6b35',
                                borderWidth: '2px',
                              }}
                            >
                              <Stack gap="xs">
                                <Text size="sm" fw={600} c="orange">
                                  สถานะบันทึกบัญชี
                                </Text>
                                <List size="sm" spacing="xs">
                                  {statusDescriptions.accounting_record_status.map((item, index) => (
                                    <List.Item key={item.value}>
                                      <Text size="sm" fw={500} c="dark">
                                        {index + 1}. {item.label}:
                                      </Text>
                                      <Text size="xs" c="dimmed" ml="md" style={{ lineHeight: 1.5 }}>
                                        {item.description}
                                      </Text>
                                    </List.Item>
                                  ))}
                                </List>
                              </Stack>
                            </Card>
                          )}
                        </div>
                        <div>
                          <Group gap="xs" justify="center" mb="xs">
                            <Text
                              size="sm"
                              fw={500}
                              style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => toggleStatusInfo('bank_statement_status')}
                            >
                              สถานะสเตทเม้นท์ธนาคาร
                            </Text>
                            <StatusInfoButton fieldName="bank_statement_status" />
                          </Group>
                          <Select
                            placeholder="— เลือกสถานะ —"
                            value={bankStatementStatus}
                            onChange={readOnlyGeneralInfo ? undefined : setBankStatementStatus}
                            data={bankStatementStatusOptions.map((s) => ({ value: s.value, label: s.label }))}
                            leftSection={<TbFileText size={16} />}
                            radius="lg"
                            searchable={!readOnlyGeneralInfo}
                            clearable={!readOnlyGeneralInfo}
                            disabled={readOnlyGeneralInfo}
                            styles={{
                              input: {
                                backgroundColor: bankStatementStatus ? getBankStatementStatusColor(bankStatementStatus) : (readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff'),
                                color: bankStatementStatus ? '#ffffff' : '#000000',
                                borderColor: bankStatementStatus ? getBankStatementStatusColor(bankStatementStatus) : '#000000',
                                borderWidth: '2px',
                                textAlign: 'center',
                                cursor: readOnlyGeneralInfo ? 'not-allowed' : 'pointer',
                              },
                            }}
                          />
                          {expandedStatusInfo.bank_statement_status && (
                            <Card
                              withBorder
                              radius="md"
                              p="sm"
                              mt="xs"
                              style={{
                                backgroundColor: '#fff3e0',
                                borderColor: '#ff6b35',
                                borderWidth: '2px',
                              }}
                            >
                              <Stack gap="xs">
                                <Text size="sm" fw={600} c="orange">
                                  สถานะสเตทเม้นท์ธนาคาร
                                </Text>
                                <List size="sm" spacing="xs">
                                  {statusDescriptions.bank_statement_status.map((item, index) => (
                                    <List.Item key={item.value}>
                                      <Text size="sm" fw={500} c="dark">
                                        {index + 1}. {item.label}:
                                      </Text>
                                      <Text size="xs" c="dimmed" ml="md" style={{ lineHeight: 1.5 }}>
                                        {item.description}
                                      </Text>
                                    </List.Item>
                                  ))}
                                </List>
                              </Stack>
                            </Card>
                          )}
                        </div>
                      </Group>
                      <Group grow mt="md">
                        <div>
                          <Group gap="xs" justify="center" mb="xs">
                            <Text
                              size="sm"
                              fw={500}
                              style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => toggleStatusInfo('monthly_tax_reconciliation')}
                            >
                              กระทบภาษีประจำเดือน
                            </Text>
                            <StatusInfoButton fieldName="monthly_tax_reconciliation" />
                          </Group>
                          <Select
                            placeholder="— เลือกสถานะ —"
                            value={monthlyTaxImpact}
                            onChange={readOnlyGeneralInfo ? undefined : setMonthlyTaxImpact}
                            data={monthlyTaxImpactOptions.map((s) => ({ value: s.value, label: s.label }))}
                            leftSection={<TbCalendar size={16} />}
                            radius="lg"
                            searchable={!readOnlyGeneralInfo}
                            clearable={!readOnlyGeneralInfo}
                            disabled={readOnlyGeneralInfo}
                            styles={{
                              input: {
                                backgroundColor: monthlyTaxImpact ? getMonthlyTaxImpactColor(monthlyTaxImpact) : (readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff'),
                                color: monthlyTaxImpact ? '#ffffff' : '#000000',
                                borderColor: monthlyTaxImpact ? getMonthlyTaxImpactColor(monthlyTaxImpact) : '#000000',
                                borderWidth: '2px',
                                textAlign: 'center',
                                cursor: readOnlyGeneralInfo ? 'not-allowed' : 'pointer',
                              },
                            }}
                          />
                          {expandedStatusInfo.monthly_tax_reconciliation && (
                            <Card
                              withBorder
                              radius="md"
                              p="sm"
                              mt="xs"
                              style={{
                                backgroundColor: '#fff3e0',
                                borderColor: '#ff6b35',
                                borderWidth: '2px',
                              }}
                            >
                              <Stack gap="xs">
                                <Text size="sm" fw={600} c="orange">
                                  กระทบภาษีประจำเดือน
                                </Text>
                                <List size="sm" spacing="xs">
                                  {statusDescriptions.monthly_tax_reconciliation.map((item, index) => (
                                    <List.Item key={item.value}>
                                      <Text size="sm" fw={500} c="dark">
                                        {index + 1}. {item.label}:
                                      </Text>
                                      <Text size="xs" c="dimmed" ml="md" style={{ lineHeight: 1.5 }}>
                                        {item.description}
                                      </Text>
                                    </List.Item>
                                  ))}
                                </List>
                              </Stack>
                            </Card>
                          )}
                        </div>
                        <div>
                          <Group gap="xs" justify="center" mb="xs">
                            <Text
                              size="sm"
                              fw={500}
                              style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => toggleStatusInfo('bank_reconciliation')}
                            >
                              กระทบแบงค์
                            </Text>
                            <StatusInfoButton fieldName="bank_reconciliation" />
                          </Group>
                          <Select
                            placeholder="— เลือกสถานะ —"
                            value={bankImpact}
                            onChange={readOnlyGeneralInfo ? undefined : setBankImpact}
                            data={bankImpactOptions.map((s) => ({ value: s.value, label: s.label }))}
                            leftSection={<TbFileText size={16} />}
                            radius="lg"
                            searchable={!readOnlyGeneralInfo}
                            clearable={!readOnlyGeneralInfo}
                            disabled={readOnlyGeneralInfo}
                            styles={{
                              input: {
                                backgroundColor: bankImpact ? getBankImpactColor(bankImpact) : (readOnlyGeneralInfo ? '#f5f5f5' : '#ffffff'),
                                color: bankImpact ? '#ffffff' : '#000000',
                                borderColor: bankImpact ? getBankImpactColor(bankImpact) : '#000000',
                                borderWidth: '2px',
                                textAlign: 'center',
                                cursor: readOnlyGeneralInfo ? 'not-allowed' : 'pointer',
                              },
                            }}
                          />
                          {expandedStatusInfo.bank_reconciliation && (
                            <Card
                              withBorder
                              radius="md"
                              p="sm"
                              mt="xs"
                              style={{
                                backgroundColor: '#fff3e0',
                                borderColor: '#ff6b35',
                                borderWidth: '2px',
                              }}
                            >
                              <Stack gap="xs">
                                <Text size="sm" fw={600} c="orange">
                                  กระทบแบงค์
                                </Text>
                                <List size="sm" spacing="xs">
                                  {statusDescriptions.bank_reconciliation.map((item, index) => (
                                    <List.Item key={item.value}>
                                      <Text size="sm" fw={500} c="dark">
                                        {index + 1}. {item.label}:
                                      </Text>
                                      <Text size="xs" c="dimmed" ml="md" style={{ lineHeight: 1.5 }}>
                                        {item.description}
                                      </Text>
                                    </List.Item>
                                  ))}
                                </List>
                              </Stack>
                            </Card>
                          )}
                        </div>
                      </Group>
                    </Card>
                  </Stack>
                </Card>
              </Tabs.Panel>

              {/* WHT Information Tab */}
              <Tabs.Panel value="vat" pt="lg">
                <Stack gap="lg">
                  {/* 1. วันที่และเวลาสำหรับอัพเดทข้อมูล */}
                  <Card withBorder radius="lg" p="lg" style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)', position: 'relative' }}>
                    <Group gap="xs" mb="md" justify="center">
                      <TbClock size={20} color="#ff6b35" />
                      <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
                        วันที่และเวลาสำหรับอัพเดทข้อมูล
                      </Text>
                    </Group>
                    <Group grow>
                      <TextInput
                        label="วันที่ส่งตรวจ ภ.ง.ด."
                        leftSection={<TbCalendar size={16} />}
                        value={whtUpdateData.pndSentDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ส่งตรวจคืน ภ.ง.ด."
                        leftSection={<TbCalendar size={16} />}
                        value={whtUpdateData.pndReturnDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ส่งลูกค้า ภ.ง.ด."
                        leftSection={<TbCalendar size={16} />}
                        value={whtUpdateData.pndCustomerSentDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ร่างแบบเสร็จแล้ว ภ.ง.ด."
                        leftSection={<TbCalendar size={16} />}
                        value={whtUpdateData.whtDraftCompletedDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                    </Group>
                  </Card>

                  {/* 2. แบบฟอร์มภาษีหัก ณ ที่จ่าย */}
                  <Card withBorder radius="lg" p="lg" style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)', position: 'relative' }}>
                    <Group gap="xs" mb="md" justify="center">
                      <TbFileInvoice size={20} color="#ff6b35" />
                      <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
                        แบบฟอร์มภาษีหัก ณ ที่จ่าย
                      </Text>
                    </Group>

                    {/* สถานะ ภ.ง.ด. */}
                    <Card withBorder radius="md" p="md" mb="lg" style={{ backgroundColor: '#fff3ed', borderLeft: '3px solid #f44336' }}>
                      <Text size="sm" fw={600} c="#f44336" mb="xs" style={{ textAlign: 'center' }}>
                        สถานะ ภ.ง.ด. *
                      </Text>
                      <Select
                        placeholder="— เลือกสถานะ —"
                        data={getSelectData(formValues['pnd_status'], formValues['pnd_status'])}
                        value={formValues['pnd_status'] && formValues['pnd_status'].trim() !== '' ? formValues['pnd_status'] : null}
                        onChange={(value) => {
                          setFormValues((prev) => ({ ...prev, pnd_status: value || '' }))
                        }}
                        radius="lg"
                        searchable
                        disabled={sourcePage === 'taxInspection' && (formValues['pnd_status'] === 'pending_review' || formValues['pnd_status'] === 'pending_recheck' || formValues['pnd_status'] === 'draft_ready') ? false : false}
                        styles={{
                          input: {
                            backgroundColor: getWhtStatusColor(formValues['pnd_status'] || null),
                            color: formValues['pnd_status'] ? '#ffffff' : '#000000',
                            borderColor: getSelectBorderColor(formValues['pnd_status'] || null),
                            borderWidth: '2px',
                            textAlign: 'center',
                          },
                        }}
                      />
                    </Card>

                    {/* แบบฟอร์มต่างๆ */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      {/* Left Column */}
                      <Stack gap="md">
                        {/* แบบ ภ.ง.ด.1 40(1) */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.1 40(1) *' : 'แบบ ภ.ง.ด.1 40(1)'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd1_40_1'], formValues['pnd_status'])}
                            value={formValues['pnd1_40_1'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd1_40_1: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd1_40_1'] || null),
                                color: formValues['pnd1_40_1'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd1_40_1'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.1 40(1)"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd1_40_1'] && numberValues['pnd1_40_1'] !== '0' ? numberValues['pnd1_40_1'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd1_40_1: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd1_40_1'] && numberValues['pnd1_40_1'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd1_40_1'] && numberValues['pnd1_40_1'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.ง.ด.3 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.3 *' : 'แบบ ภ.ง.ด.3'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd3'], formValues['pnd_status'])}
                            value={formValues['pnd3'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd3: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd3'] || null),
                                color: formValues['pnd3'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd3'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.3"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd3'] && numberValues['pnd3'] !== '0' ? numberValues['pnd3'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd3: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd3'] && numberValues['pnd3'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd3'] && numberValues['pnd3'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.พ.36 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.พ.36 *' : 'แบบ ภ.พ.36'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pp36'], formValues['pnd_status'])}
                            value={formValues['pp36'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pp36: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pp36'] || null),
                                color: formValues['pp36'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pp36'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.พ.36"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pp36'] && numberValues['pp36'] !== '0' ? numberValues['pp36'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pp36: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pp36'] && numberValues['pp36'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pp36'] && numberValues['pp36'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ประกันสังคม */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ประกันสังคม *' : 'แบบ ประกันสังคม'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['social_security'], formValues['pnd_status'])}
                            value={formValues['social_security'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, social_security: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['social_security'] || null),
                                color: formValues['social_security'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['social_security'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ประกันสังคม"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['social_security'] && numberValues['social_security'] !== '0' ? numberValues['social_security'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, social_security: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['social_security'] && numberValues['social_security'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['social_security'] && numberValues['social_security'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.ธ.40 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ธ.40 *' : 'แบบ ภ.ธ.40'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pth40'], formValues['pnd_status'])}
                            value={formValues['pth40'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pth40: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pth40'] || null),
                                color: formValues['pth40'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pth40'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ธ.40"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pth40'] && numberValues['pth40'] !== '0' ? numberValues['pth40'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pth40: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pth40'] && numberValues['pth40'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pth40'] && numberValues['pth40'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>
                      </Stack>

                      {/* Right Column */}
                      <Stack gap="md">
                        {/* แบบ ภ.ง.ด.1 40(2) */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.1 40(2) *' : 'แบบ ภ.ง.ด.1 40(2)'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd1_40_2'], formValues['pnd_status'])}
                            value={formValues['pnd1_40_2'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd1_40_2: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd1_40_2'] || null),
                                color: formValues['pnd1_40_2'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd1_40_2'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.1 40(2)"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd1_40_2'] && numberValues['pnd1_40_2'] !== '0' ? numberValues['pnd1_40_2'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd1_40_2: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd1_40_2'] && numberValues['pnd1_40_2'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd1_40_2'] && numberValues['pnd1_40_2'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.ง.ด.53 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.53 *' : 'แบบ ภ.ง.ด.53'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd53'], formValues['pnd_status'])}
                            value={formValues['pnd53'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd53: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd53'] || null),
                                color: formValues['pnd53'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd53'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.53"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd53'] && numberValues['pnd53'] !== '0' ? numberValues['pnd53'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd53: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd53'] && numberValues['pnd53'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd53'] && numberValues['pnd53'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.ง.ด.54 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.54 *' : 'แบบ ภ.ง.ด.54'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd54'], formValues['pnd_status'])}
                            value={formValues['pnd54'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd54: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd54'] || null),
                                color: formValues['pnd54'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd54'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.54"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd54'] && numberValues['pnd54'] !== '0' ? numberValues['pnd54'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd54: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd54'] && numberValues['pnd54'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd54'] && numberValues['pnd54'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ กยศ. */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ กยศ. *' : 'แบบ กยศ.'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['student_loan'], formValues['pnd_status'])}
                            value={formValues['student_loan'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, student_loan: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['student_loan'] || null),
                                color: formValues['student_loan'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['student_loan'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ กยศ."
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['student_loan'] && numberValues['student_loan'] !== '0' ? numberValues['student_loan'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, student_loan: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['student_loan'] && numberValues['student_loan'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['student_loan'] && numberValues['student_loan'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>

                        {/* แบบ ภ.ง.ด.2 */}
                        <Group grow align="flex-end">
                          <Select
                            label={sourcePage === 'taxStatus' ? 'แบบ ภ.ง.ด.2 *' : 'แบบ ภ.ง.ด.2'}
                            placeholder="— เลือก —"
                            data={getSelectData(formValues['pnd2'], formValues['pnd_status'])}
                            value={formValues['pnd2'] || null}
                            onChange={(value) => {
                              setFormValues((prev) => ({ ...prev, pnd2: value || '' }))
                            }}
                            radius="lg"
                            searchable
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: getWhtStatusColor(formValues['pnd2'] || null),
                                color: formValues['pnd2'] ? '#ffffff' : '#000000',
                                borderColor: getSelectBorderColor(formValues['pnd2'] || null),
                                borderWidth: '2px',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="จำนวนใบแนบ แบบ ภ.ง.ด.2"
                            type="number"
                            placeholder="กรอกจำนวนใบแนบ"
                            radius="lg"
                            min={0}
                            value={numberValues['pnd2'] && numberValues['pnd2'] !== '0' ? numberValues['pnd2'] : ''}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setNumberValues((prev) => ({ ...prev, pnd2: e.target.value }))
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                borderColor: numberValues['pnd2'] && numberValues['pnd2'] !== '0' ? '#ff6b35' : undefined,
                                borderWidth: numberValues['pnd2'] && numberValues['pnd2'] !== '0' ? '2px' : undefined,
                                textAlign: 'center',
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : undefined,
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                              },
                            }}
                          />
                        </Group>
                      </Stack>
                    </SimpleGrid>
                  </Card>

                  {/* 3. สอบถามและตอบกลับ - ซ่อนเมื่อเปิดจากหน้ายื่นภาษี */}
                  {sourcePage !== 'taxFiling' && (
                    <Card withBorder radius="lg" p="lg">
                      <Group gap="xs" mb="md" justify="center">
                        <TbMessageCircle size={20} color="#ff6b35" />
                        <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
                          สอบถามและตอบกลับ
                        </Text>
                      </Group>
                      <Group grow align="stretch">
                        {/* สำหรับหน้าสถานะยื่นภาษี: สอบถาม read-only, ตอบกลับ editable */}
                        {sourcePage === 'taxStatus' ? (
                          <>
                            <Textarea
                              label="สอบถามเพิ่มเติม ภ.ง.ด."
                              value={whtInquiry}
                              readOnly
                              placeholder="กรอกคำถามเพิ่มเติมเกี่ยวกับ ภ.ง.ด..."
                              minRows={4}
                              radius="lg"
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับ ภ.ง.ด."
                              value={whtReply}
                              onChange={(e) => setWhtReply(e.target.value)}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบสำหรับการสอบถาม ภ.ง.ด."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        ) : (
                          <>
                            {/* สำหรับหน้าตรวจภาษี: ตำแหน่งเดิม (สอบถามอยู่บน, ตอบกลับอยู่ล่าง) */}
                            <Textarea
                              label="สอบถามเพิ่มเติม ภ.ง.ด."
                              value={whtInquiry}
                              onChange={(e) => setWhtInquiry(e.target.value)}
                              placeholder="กรอกคำถามเพิ่มเติมเกี่ยวกับ ภ.ง.ด..."
                              minRows={4}
                              radius="lg"
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับ ภ.ง.ด."
                              value={whtReplyData.reply}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบเกี่ยวกับ ภ.ง.ด..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'default',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        )}
                      </Group>
                    </Card>
                  )}

                  {/* 4. ส่งงานยื่นภาษีกับทีมยื่นภาษี WHT - แสดงเมื่อเปิดจากหน้าสถานะยื่นภาษีหรือหน้ายื่นภาษี */}
                  {(sourcePage === 'taxStatus' || sourcePage === 'taxFiling') && (
                    <Card withBorder radius="lg" p="lg">
                      <Group gap="xs" mb="md" justify="center">
                        <TbFileText size={20} color="#ff6b35" />
                        <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
                          ส่งงานยื่นภาษีกับทีมยื่นภาษี WHT
                        </Text>
                      </Group>
                      <Group grow align="stretch">
                        {sourcePage === 'taxFiling' ? (
                          <>
                            {/* สำหรับหน้ายื่นภาษี: ความเห็น read-only, ตอบกลับ editable */}
                            <Textarea
                              label="ความเห็นส่งงานยื่นภาษี ภ.ง.ด."
                              value={taxFilingComment}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกความเห็นเกี่ยวกับการส่งงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับงานยื่นภาษี ภ.ง.ด."
                              value={taxFilingReply}
                              onChange={(e) => setTaxFilingReply(e.target.value)}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบสำหรับการตอบกลับงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        ) : (
                          <>
                            {/* สำหรับหน้าสถานะยื่นภาษี: ความเห็น editable, ตอบกลับ read-only */}
                            <Textarea
                              label="ความเห็นส่งงานยื่นภาษี ภ.ง.ด."
                              value={taxFilingComment}
                              onChange={(e) => setTaxFilingComment(e.target.value)}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกความเห็นเกี่ยวกับการส่งงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับงานยื่นภาษี ภ.ง.ด."
                              value={taxFilingReply}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="คำตอบจากทีมยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        )}
                      </Group>
                    </Card>
                  )}
                </Stack>
              </Tabs.Panel>

              {/* VAT Information Tab */}
              <Tabs.Panel value="debtor" pt="lg">
                <Stack gap="lg">
                  {/* Alert: Show warning if VAT not registered */}
                  {!isVatRegistered && (
                    <Alert
                      icon={<TbAlertCircle size={16} />}
                      title="ไม่สามารถใช้งานได้"
                      color="orange"
                      radius="lg"
                    >
                      <Text size="sm">
                        บริษัทนี้ยังไม่จดภาษีมูลค่าเพิ่ม กรุณาตรวจสอบสถานะจดทะเบียนภาษีมูลค่าเพิ่มในข้อมูลบริษัทก่อนใช้งาน
                      </Text>
                    </Alert>
                  )}

                  {/* 1. วันที่และเวลาสำหรับอัพเดทข้อมูล */}
                  <Card withBorder radius="lg" p="lg" style={{ borderLeft: '4px solid #4caf50', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)', position: 'relative' }}>
                    <Group gap="xs" mb="md" justify="center">
                      <TbClock size={20} color="#4caf50" />
                      <Text fw={700} size="lg" c="#4caf50" style={{ textAlign: 'center' }}>
                        วันที่และเวลาสำหรับอัพเดทข้อมูล
                      </Text>
                    </Group>
                    <Group grow>
                      <TextInput
                        label="วันที่ส่งตรวจ ภ.พ. 30"
                        leftSection={<TbCalendar size={16} />}
                        value={vatUpdateData.pp30SentDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ส่งตรวจคืน ภ.พ. 30"
                        leftSection={<TbCalendar size={16} />}
                        value={vatUpdateData.pp30ReturnDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ส่งลูกค้า ภ.พ. 30"
                        leftSection={<TbCalendar size={16} />}
                        value={vatUpdateData.pp30CustomerSentDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                      <TextInput
                        label="วันที่ร่างแบบเสร็จแล้ว ภ.พ.30"
                        leftSection={<TbCalendar size={16} />}
                        value={vatUpdateData.vatDraftCompletedDate}
                        readOnly
                        radius="lg"
                        placeholder="--"
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: '#ffffff',
                            cursor: 'default',
                            textAlign: 'center',
                            paddingLeft: '2.5rem', // ชดเชยกับ leftSection เพื่อให้ข้อความอยู่กึ่งกลาง
                          },
                        }}
                      />
                    </Group>
                  </Card>

                  {/* 2. แบบฟอร์มภาษีมูลค่าเพิ่ม */}
                  <Card withBorder radius="lg" p="lg" style={{ borderLeft: '4px solid #4caf50', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)', position: 'relative' }}>
                    <Group gap="xs" mb="md" justify="center">
                      <TbFileInvoice size={20} color="#4caf50" />
                      <Text fw={700} size="lg" c="#4caf50" style={{ textAlign: 'center' }}>
                        แบบฟอร์มภาษีมูลค่าเพิ่ม
                      </Text>
                    </Group>

                    {/* สถานะ ภ.พ.30 */}
                    <Card withBorder radius="md" p="md" mb="lg" style={{ backgroundColor: '#f0fff4', borderLeft: '3px solid #4caf50' }}>
                      <Text size="sm" fw={600} c="#4caf50" mb="xs" style={{ textAlign: 'center' }}>
                        สถานะ ภ.พ.30 *
                      </Text>
                      <Select
                        placeholder="— เลือกสถานะ —"
                        data={getSelectData(formValues['pp30_status'], formValues['pp30_status'])}
                        value={formValues['pp30_status'] || null}
                        onChange={(value) => {
                          const newStatus = value || ''
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:3557', message: 'H3: Select onChange', data: { buildId, oldValue: formValues['pp30_status'], newValue: newStatus }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) }).catch(() => { });
                          // #endregion
                          setFormValues((prev) => ({ ...prev, pp30_status: newStatus }))
                          // ⚠️ สำคัญ: เมื่อผู้ใช้เลือกสถานะอื่นที่ไม่ใช่ 'paid' ต้อง clear vatFilingReply
                          // เพื่อป้องกันไม่ให้สถานะถูก override กลับไปเป็น 'paid' โดย vatFilingReply onChange handler
                          if (newStatus !== 'paid' && vatFilingReply.trim() !== '') {
                            setVatFilingReply('')
                          }
                        }}
                        onFocus={() => {
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/05294dac-c144-4586-be72-5875c5682fcf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/components/TaxInspection/TaxInspectionForm.tsx:3565', message: 'H3: Select onFocus - current value', data: { buildId, pp30_status: formValues['pp30_status'] }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) }).catch(() => { });
                          // #endregion
                        }}
                        radius="lg"
                        searchable
                        styles={{
                          input: {
                            backgroundColor: getWhtStatusColor(formValues['pp30_status'] || null),
                            color: formValues['pp30_status'] ? '#ffffff' : '#000000',
                            borderColor: getSelectBorderColor(formValues['pp30_status'] || null),
                            borderWidth: '2px',
                            textAlign: 'center',
                          },
                        }}
                      />
                    </Card>

                    {/* จำนวนเอกสารภาษีซื้อ และ คอนเฟิร์มรายได้ */}
                    <Group grow>
                      {sourcePage === 'taxStatus' ? (
                        <>
                          {/* สำหรับหน้าสถานะยื่นภาษี: จำนวนเอกสารภาษีซื้อเป็น number input, คอนเฟิร์มรายได้เป็น Select */}
                          <TextInput
                            label="จำนวนเอกสารภาษีซื้อ *"
                            type="number"
                            value={purchaseDocuments}
                            onChange={(e) => {
                              setPurchaseDocuments(e.target.value)
                            }}
                            radius="lg"
                            placeholder="0"
                            min={0}
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: '#ffffff',
                                textAlign: 'center',
                                borderColor: purchaseDocuments && purchaseDocuments !== '0' ? '#ff6b35' : undefined,
                                borderWidth: purchaseDocuments && purchaseDocuments !== '0' ? '2px' : undefined,
                              },
                            }}
                          />
                          <div>
                            <Group gap="xs" justify="center" mb="xs">
                              <Text
                                size="sm"
                                fw={500}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                                onClick={() => toggleStatusInfo('confirm_income')}
                              >
                                คอนเฟิร์มรายได้ *
                              </Text>
                              <StatusInfoButton fieldName="confirm_income" />
                            </Group>
                            <Select
                              placeholder="— เลือก —"
                              data={confirmIncomeOptions.map((s) => ({ value: s.value, label: s.label }))}
                              value={confirmIncomeStatus}
                              onChange={(value) => {
                                setConfirmIncomeStatus(value)
                              }}
                              radius="lg"
                              searchable
                              clearable
                              styles={{
                                input: {
                                  backgroundColor: getConfirmIncomeColor(confirmIncomeStatus),
                                  color: confirmIncomeStatus ? '#ffffff' : '#000000',
                                  borderColor: confirmIncomeStatus ? getConfirmIncomeColor(confirmIncomeStatus) : undefined,
                                  borderWidth: confirmIncomeStatus ? '2px' : undefined,
                                  textAlign: 'center',
                                },
                              }}
                            />
                            {expandedStatusInfo.confirm_income && (
                              <Card
                                withBorder
                                radius="md"
                                p="sm"
                                mt="xs"
                                style={{
                                  backgroundColor: '#fff3e0',
                                  borderColor: '#ff6b35',
                                  borderWidth: '2px',
                                }}
                              >
                                <Stack gap="xs">
                                  <Text size="sm" fw={600} c="orange">
                                    คอนเฟิร์มรายได้
                                  </Text>
                                  <List size="sm" spacing="xs">
                                    <List.Item>
                                      <Text size="sm" fw={500} c="dark">
                                        สถานะ ลูกค้าให้แก้รายได้:
                                      </Text>
                                      <Text size="xs" c="dimmed" ml="md" style={{ lineHeight: 1.5 }}>
                                        คือสถานะที่จะถูกอัพเดตเมื่อมีการส่งตรวจรายได้ไปแล้ว ลูกค้าพึ่งจะมาแจ้งว่ามีรายได้ที่ยังตกหล่น หรือเพิ่มรายได้
                                      </Text>
                                    </List.Item>
                                  </List>
                                </Stack>
                              </Card>
                            )}
                          </div>
                          <div>
                            <Text size="sm" fw={500} style={{ textAlign: 'center', display: 'block' }} mb="xs">
                              คอนเฟิร์มค่าใช้จ่าย
                            </Text>
                            <Select
                              placeholder="— เลือก —"
                              data={confirmExpensesOptions.map((s) => ({ value: s.value, label: s.label }))}
                              value={confirmExpensesStatus}
                              onChange={(value) => setConfirmExpensesStatus(value)}
                              radius="lg"
                              searchable
                              clearable
                              styles={{
                                input: {
                                  backgroundColor: getConfirmExpensesColor(confirmExpensesStatus),
                                  color: confirmExpensesStatus ? '#ffffff' : '#000000',
                                  borderColor: confirmExpensesStatus ? getConfirmExpensesColor(confirmExpensesStatus) : undefined,
                                  borderWidth: confirmExpensesStatus ? '2px' : undefined,
                                  textAlign: 'center',
                                },
                              }}
                            />
                          </div>
                        </>
                      ) : sourcePage === 'taxFiling' ? (
                        <>
                          {/* สำหรับหน้ายื่นภาษี: อ่านได้อย่างเดียว */}
                          <TextInput
                            label="จำนวนเอกสารภาษีซื้อ"
                            value={purchaseDocuments}
                            readOnly
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: '#f5f5f5',
                                cursor: 'not-allowed',
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="คอนเฟิร์มรายได้"
                            value={confirmIncome}
                            readOnly
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: confirmIncomeStatus ? getConfirmIncomeColor(confirmIncomeStatus) : '#f5f5f5',
                                color: confirmIncomeStatus ? '#ffffff' : '#000000',
                                cursor: 'not-allowed',
                                textAlign: 'center',
                                fontWeight: confirmIncomeStatus ? 500 : 'normal',
                              },
                            }}
                          />
                          <TextInput
                            label="คอนเฟิร์มค่าใช้จ่าย"
                            value={confirmExpensesStatus ? confirmExpensesOptions.find((o) => o.value === confirmExpensesStatus)?.label ?? '' : ''}
                            readOnly
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: confirmExpensesStatus ? getConfirmExpensesColor(confirmExpensesStatus) : '#f5f5f5',
                                color: confirmExpensesStatus ? '#ffffff' : '#000000',
                                cursor: 'not-allowed',
                                textAlign: 'center',
                                fontWeight: confirmExpensesStatus ? 500 : 'normal',
                              },
                            }}
                          />
                        </>
                      ) : (
                        <>
                          {/* สำหรับหน้าตรวจภาษี: แบบเดิม */}
                          <TextInput
                            label="จำนวนเอกสารภาษีซื้อ"
                            value={purchaseDocuments}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setPurchaseDocuments(e.target.value)
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : '#ffffff',
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                                textAlign: 'center',
                              },
                            }}
                          />
                          <TextInput
                            label="คอนเฟิร์มรายได้"
                            value={confirmIncome}
                            onChange={sourcePage === 'taxInspection' ? undefined : (e) => {
                              setConfirmIncome(e.target.value)
                            }}
                            readOnly={sourcePage === 'taxInspection'}
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: confirmIncomeStatus
                                  ? getConfirmIncomeColor(confirmIncomeStatus)
                                  : (sourcePage === 'taxInspection' ? '#f5f5f5' : '#ffffff'),
                                color: confirmIncomeStatus ? '#ffffff' : '#000000',
                                cursor: sourcePage === 'taxInspection' ? 'not-allowed' : undefined,
                                textAlign: 'center',
                                fontWeight: confirmIncomeStatus ? 500 : 'normal',
                              },
                            }}
                          />
                          <TextInput
                            label="คอนเฟิร์มค่าใช้จ่าย"
                            value={confirmExpensesStatus ? confirmExpensesOptions.find((o) => o.value === confirmExpensesStatus)?.label ?? '' : ''}
                            readOnly
                            radius="lg"
                            placeholder="--"
                            styles={{
                              label: {
                                textAlign: 'center',
                                width: '100%',
                                display: 'block',
                              },
                              input: {
                                backgroundColor: confirmExpensesStatus ? getConfirmExpensesColor(confirmExpensesStatus) : (sourcePage === 'taxInspection' ? '#f5f5f5' : '#ffffff'),
                                color: confirmExpensesStatus ? '#ffffff' : '#000000',
                                cursor: 'not-allowed',
                                textAlign: 'center',
                                fontWeight: confirmExpensesStatus ? 500 : 'normal',
                              },
                            }}
                          />
                        </>
                      )}
                    </Group>

                    {/* สถานะยอดชำระและจำนวนยอดชำระ ภ.พ.30 */}
                    <Group grow mt="md">
                      <Select
                        label="สถานะยอดชำระ ภ.พ.30"
                        placeholder="— เลือก —"
                        data={[
                          { value: 'has_payment', label: 'มียอดชำระ' },
                          { value: 'no_payment', label: 'ไม่มียอดชำระ' },
                        ]}
                        value={pp30PaymentStatus}
                        onChange={(value) => {
                          setPp30PaymentStatus(value)
                          // ถ้าเลือก "ไม่มียอดชำระ" ให้ล้างจำนวนยอดชำระ
                          if (value === 'no_payment') {
                            setPp30PaymentAmount('')
                          }
                        }}
                        disabled={sourcePage === 'taxInspection'}
                        radius="lg"
                        searchable
                        clearable
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: sourcePage === 'taxInspection' ? '#f5f5f5' : '#ffffff',
                            cursor: sourcePage === 'taxInspection' ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                          },
                        }}
                      />
                      <TextInput
                        label="จำนวนยอดชำระ"
                        type="number"
                        value={pp30PaymentAmount}
                        onChange={(e) => setPp30PaymentAmount(e.target.value)}
                        readOnly={sourcePage === 'taxInspection'}
                        disabled={sourcePage === 'taxInspection' || pp30PaymentStatus !== 'has_payment'}
                        radius="lg"
                        placeholder={pp30PaymentStatus === 'has_payment' ? '0.00' : '--'}
                        min={0}
                        step={0.01}
                        styles={{
                          label: {
                            textAlign: 'center',
                            width: '100%',
                            display: 'block',
                          },
                          input: {
                            backgroundColor: sourcePage === 'taxInspection' || pp30PaymentStatus !== 'has_payment' ? '#f5f5f5' : '#ffffff',
                            cursor: sourcePage === 'taxInspection' || pp30PaymentStatus !== 'has_payment' ? 'not-allowed' : 'text',
                            textAlign: 'left',
                            borderColor: pp30PaymentAmount && pp30PaymentAmount !== '0' && pp30PaymentStatus === 'has_payment' ? '#ff6b35' : undefined,
                            borderWidth: pp30PaymentAmount && pp30PaymentAmount !== '0' && pp30PaymentStatus === 'has_payment' ? '2px' : undefined,
                          },
                        }}
                      />
                    </Group>
                  </Card>

                  {/* 3. สอบถามและตอบกลับ - ซ่อนเมื่อเปิดจากหน้ายื่นภาษี */}
                  {sourcePage !== 'taxFiling' && (
                    <Card withBorder radius="lg" p="lg">
                      <Group gap="xs" mb="md" justify="center">
                        <TbMessageCircle size={20} color="#4caf50" />
                        <Text fw={700} size="lg" c="#4caf50" style={{ textAlign: 'center' }}>
                          สอบถามและตอบกลับ
                        </Text>
                      </Group>
                      <Group grow align="stretch">
                        {sourcePage === 'taxStatus' ? (
                          <>
                            {/* สำหรับหน้าสถานะยื่นภาษี: ตำแหน่งเดิม (สอบถามอยู่ซ้าย, ตอบกลับอยู่ขวา), ตอบกลับ editable, สอบถาม read-only */}
                            <Textarea
                              label="สอบถามเพิ่มเติม ภ.พ.30"
                              value={vatInquiry}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำถามเพิ่มเติมเกี่ยวกับ ภ.พ.30..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'center',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับ ภ.พ.30"
                              value={vatReply}
                              onChange={(e) => setVatReply(e.target.value)}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบสำหรับการสอบถาม ภ.พ.30..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        ) : (
                          <>
                            {/* สำหรับหน้าตรวจภาษี: แบบเดิม (สอบถาม editable, ตอบกลับ read-only) */}
                            <Textarea
                              label="สอบถามเพิ่มเติม ภ.พ.30"
                              value={vatInquiry}
                              onChange={(e) => setVatInquiry(e.target.value)}
                              placeholder="กรอกคำถามเพิ่มเติมเกี่ยวกับ ภ.พ.30..."
                              minRows={4}
                              radius="lg"
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับ ภ.พ.30"
                              value={vatReplyData.reply}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบเกี่ยวกับ ภ.พ.30..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'default',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        )}
                      </Group>
                    </Card>
                  )}

                  {/* 4. ส่งงานยื่นภาษีกับทีมยื่นภาษี VAT - แสดงเมื่อเปิดจากหน้าสถานะยื่นภาษีหรือหน้ายื่นภาษี */}
                  {(sourcePage === 'taxStatus' || sourcePage === 'taxFiling') && (
                    <Card withBorder radius="lg" p="lg">
                      <Group gap="xs" mb="md" justify="center">
                        <TbFileText size={20} color="#4caf50" />
                        <Text fw={700} size="lg" c="#4caf50" style={{ textAlign: 'center' }}>
                          ส่งงานยื่นภาษีกับทีมยื่นภาษี VAT
                        </Text>
                      </Group>
                      <Group grow align="stretch">
                        {sourcePage === 'taxFiling' ? (
                          <>
                            {/* สำหรับหน้ายื่นภาษี: ความเห็น read-only, ตอบกลับ editable */}
                            <Textarea
                              label="ความเห็นส่งงานยื่นภาษี ภ.พ.30"
                              value={vatFilingComment}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกความเห็นเกี่ยวกับการส่งงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับงานยื่นภาษี ภ.พ.30"
                              value={vatFilingReply}
                              onChange={(e) => {
                                const newValue = e.target.value
                                setVatFilingReply(newValue)
                                // ⚠️ หมายเหตุ: pp30_filing_response เป็นข้อมูลที่ผู้ใช้กรอก (TEXT) ไม่ใช่สถานะ
                                // ไม่ต้องตั้ง pp30_status อัตโนมัติ เพราะสถานะควรให้ผู้ใช้เลือกเอง
                              }}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกคำตอบสำหรับการตอบกลับงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        ) : (
                          <>
                            {/* สำหรับหน้าสถานะยื่นภาษี: ความเห็น editable, ตอบกลับ read-only */}
                            <Textarea
                              label="ความเห็นส่งงานยื่นภาษี ภ.พ.30"
                              value={vatFilingComment}
                              onChange={(e) => setVatFilingComment(e.target.value)}
                              minRows={4}
                              radius="lg"
                              placeholder="กรอกความเห็นเกี่ยวกับการส่งงานยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                            <Textarea
                              label="ตอบกลับงานยื่นภาษี ภ.พ.30"
                              value={vatFilingReply}
                              readOnly
                              minRows={4}
                              radius="lg"
                              placeholder="คำตอบจากทีมยื่นภาษี..."
                              autosize
                              resize="vertical"
                              styles={{
                                label: {
                                  textAlign: 'center',
                                  width: '100%',
                                  display: 'block',
                                },
                                input: {
                                  backgroundColor: '#808080',
                                  color: '#ffffff',
                                  cursor: 'not-allowed',
                                  textAlign: 'left',
                                },
                                wrapper: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            />
                          </>
                        )}
                      </Group>
                    </Card>
                  )}
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </ScrollArea>

          {/* Action Buttons - Fixed at Bottom */}
          <Card
            withBorder
            radius={0}
            p="md"
            style={{
              backgroundColor: '#fff8f5',
              borderTop: '2px solid #ff6b35',
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
            }}
          >
            <Group justify="flex-end">
              <Button variant="light" color="gray" radius="lg" onClick={onClose} size="md">
                ยกเลิก
              </Button>
              <Button
                color="orange"
                radius="lg"
                leftSection={
                  updateMutation.isLoading || isRefreshing ? (
                    <Loader size={16} color="white" />
                  ) : (
                    <TbCheck size={16} />
                  )
                }
                size="md"
                onClick={handleSave}
                loading={updateMutation.isLoading || isRefreshing}
                disabled={updateMutation.isLoading || isRefreshing}
                style={{
                  backgroundColor: '#ff6b35',
                  '&:hover': {
                    backgroundColor: '#ff8c42',
                  },
                }}
              >
                {updateMutation.isLoading
                  ? 'กำลังบันทึก...'
                  : isRefreshing
                    ? 'กำลังรีเฟรชข้อมูล...'
                    : 'บันทึกข้อมูล'}
              </Button>
            </Group>
          </Card>
        </Stack>
      </Modal>
    )
  }

  return renderContent()
}
