/**
 * Work Assignment Page
 * หน้าจัดการการจัดงานรายเดือน (Workflow System)
 * Access: Admin/HR only
 */

import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Stack,
  Button,
  Group,
  TextInput,
  Select,
  MultiSelect,
  Checkbox,
  Card,
  Table,
  Badge,
  Text,
  Modal,
  Textarea,
  Alert,
  Loader,
  Center,
  Pagination,
  ActionIcon,
  Tooltip,
  Grid,
  NumberInput,
  Menu,
  Divider,
  Box,
  Progress,
  SimpleGrid,
  Accordion,
} from '@mantine/core'
import { TbPlus, TbSearch, TbEdit, TbRefresh, TbAlertCircle, TbCheck, TbColumns, TbEye, TbEyeOff, TbUpload } from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import workAssignmentsService, {
  WorkAssignment as WorkAssignmentType,
} from '../services/workAssignmentsService'
import clientsService, { Client } from '../services/clientsService'
import { employeeService, Employee } from '../services/employeeService'
import usersService, { User } from '../services/usersService'
import { notifications } from '@mantine/notifications'
import WorkAssignmentImport from '../components/WorkAssignment/WorkAssignmentImport'
import { isApiError, isNetworkError, getErrorMessage } from '../types/errors'

// Thai month names for display
const THAI_MONTHS = [
  { value: '1', label: 'มกราคม' },
  { value: '2', label: 'กุมภาพันธ์' },
  { value: '3', label: 'มีนาคม' },
  { value: '4', label: 'เมษายน' },
  { value: '5', label: 'พฤษภาคม' },
  { value: '6', label: 'มิถุนายน' },
  { value: '7', label: 'กรกฎาคม' },
  { value: '8', label: 'สิงหาคม' },
  { value: '9', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
]

/**
 * Format employee name to display as "ชื่อ (ชื่อเล่น)"
 * If name already contains nickname in parentheses, return as is
 * Otherwise, try to extract nickname from name or use provided nickname
 */
const formatEmployeeName = (name: string | null | undefined, nickName?: string | null): string => {
  if (!name) return '-'

  // If name already contains parentheses, assume it's already formatted
  if (name.includes('(') && name.includes(')')) {
    return name
  }

  // If nickname is provided, format as "name (nickname)"
  if (nickName) {
    return `${name}(${nickName})`
  }

  // Try to extract nickname from name if it's in format "ชื่อ (ชื่อเล่น)"
  // This handles cases where backend might send formatted name
  const match = name.match(/^(.+?)\s*\((.+?)\)$/)
  if (match) {
    return name // Already formatted
  }

  // Return name as is if no nickname
  return name
}

export default function WorkAssignment() {
  const { user, _hasHydrated } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component render และ query ทำงานหรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[WorkAssignment] Component mounted/updated:', {
        hasUser: !!user,
        userRole: user?.role,
        isAdmin,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, isAdmin, _hasHydrated])

  // State
  const [search, setSearch] = useState('')
  const [build, setBuild] = useState('')
  const [year, setYear] = useState<string | null>(new Date().getFullYear().toString())
  const [month, setMonth] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [formOpened, setFormOpened] = useState(false)
  const [resetConfirmOpened, setResetConfirmOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignmentType | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<WorkAssignmentType | null>(null)

  // Bulk create state
  const [bulkCreateModalOpened, setBulkCreateModalOpened] = useState(false)

  // Import modal state
  const [importModalOpened, setImportModalOpened] = useState(false)
  const [selectedCompanyStatuses, setSelectedCompanyStatuses] = useState<string[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })

  // State for selecting previous tax month to fetch data from
  const [selectedPreviousTaxYear, setSelectedPreviousTaxYear] = useState<number | null>(null)
  const [selectedPreviousTaxMonth, setSelectedPreviousTaxMonth] = useState<number | null>(null)

  // Preview table pagination state
  const [previewPage, setPreviewPage] = useState(1)
  const [previewLimit, setPreviewLimit] = useState(20)

  // State สำหรับเก็บข้อมูลที่โหลดแล้วและข้อมูลที่กรอกไว้
  const [allClients, setAllClients] = useState<Client[]>([]) // เก็บ client list ทั้งหมด
  const [loadedPreviewData, setLoadedPreviewData] = useState<typeof previewData>([]) // เก็บข้อมูลที่โหลดแล้วและข้อมูลที่กรอกไว้

  // Validation modals state
  const [taxMonthModalOpened, setTaxMonthModalOpened] = useState(false)
  const [incompleteDataModalOpened, setIncompleteDataModalOpened] = useState(false)
  const [duplicateDataModalOpened, setDuplicateDataModalOpened] = useState(false)
  const [selectedTaxYear, setSelectedTaxYear] = useState<number | null>(null)
  const [selectedTaxMonth, setSelectedTaxMonth] = useState<number | null>(null)

  // State for selecting target tax month (เดือนภาษีที่จะบันทึก) - ต้องถามก่อนเลือกสถานะบริษัท
  const [targetTaxYearModalOpened, setTargetTaxYearModalOpened] = useState(false)
  const [targetTaxYear, setTargetTaxYear] = useState<number | null>(null)
  const [targetTaxMonth, setTargetTaxMonth] = useState<number | null>(null)
  const [incompleteItems, setIncompleteItems] = useState<Array<{ build: string; missingFields: string[] }>>([])
  const [duplicateItems, setDuplicateItems] = useState<WorkAssignmentType[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Employee search state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  // Selected role for detail view
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  // Filter by responsible person state
  const [filterByAccounting, setFilterByAccounting] = useState<string | null>(null)
  const [filterByTaxInspection, setFilterByTaxInspection] = useState<string | null>(null)
  const [filterByWht, setFilterByWht] = useState<string | null>(null)
  const [filterByVat, setFilterByVat] = useState<string | null>(null)
  const [filterByDocumentEntry, setFilterByDocumentEntry] = useState<string | null>(null)

  // Filter by assignment status (จัดแล้ว/ยังไม่จัด)
  const [filterByAssignmentStatus, setFilterByAssignmentStatus] = useState<'all' | 'assigned' | 'unassigned'>('unassigned') // Default: แสดงเฉพาะงานที่ยังไม่จัด

  // Toggle for showing/hiding previous month columns
  const [showPreviousColumns, setShowPreviousColumns] = useState(false) // Default: ซ่อนคอลัมน์เดิม

  // Column visibility state - ซ่อนคอลัมน์ "เดิม" โดย default เพื่อลด complexity
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    build: true,
    company_name: true,
    legal_entity_number: false, // ซ่อนโดย default เพื่อลดความกว้าง
    tax_registration_status: true,
    company_status: true,
    target_tax_month: true, // เพิ่มคอลัมน์แสดงเดือนภาษีที่จะบันทึก
    assignment_status: true, // เพิ่มคอลัมน์แสดงสถานะการจัดงาน (จัดแล้ว/ยังไม่จัด)
    prev_accounting: false,      // ✅ ซ่อนโดย default
    new_accounting: true,
    prev_tax_inspection: false,  // ✅ ซ่อนโดย default
    new_tax_inspection: true,
    prev_wht: false,            // ✅ ซ่อนโดย default
    new_wht: true,
    prev_vat: false,            // ✅ ซ่อนโดย default
    new_vat: true,
    prev_document_entry: false, // ✅ ซ่อนโดย default
    new_document_entry: true,
  })

  const [previewData, setPreviewData] = useState<
    Array<{
      build: string
      company_name: string
      legal_entity_number: string
      tax_registration_status: string | null
      company_status: string
      // Target tax month (เดือนภาษีที่จะบันทึก)
      target_tax_year: number | null
      target_tax_month: number | null
      // Status: งานจัดแล้วหรือยังไม่จัด
      is_assigned: boolean // true = จัดแล้ว, false = ยังไม่จัด
      existing_assignment_id: string | null // ID ของ work assignment ที่มีอยู่แล้ว (ถ้ามี)
      // Previous month data
      prev_accounting_responsible: string | null
      prev_accounting_responsible_name: string | null
      prev_tax_inspection_responsible: string | null
      prev_tax_inspection_responsible_name: string | null
      prev_wht_filer_responsible: string | null
      prev_wht_filer_responsible_name: string | null
      prev_vat_filer_responsible: string | null
      prev_vat_filer_responsible_name: string | null
      prev_document_entry_responsible: string | null
      prev_document_entry_responsible_name: string | null
      // New month data (editable)
      new_accounting_responsible: string | null
      new_tax_inspection_responsible: string | null
      new_wht_filer_responsible: string | null
      new_vat_filer_responsible: string | null
      new_document_entry_responsible: string | null
    }>
  >([])

  // Form state
  const [formBuild, setFormBuild] = useState('')
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1) // เดือนปัจจุบัน
  const [viewMode, setViewMode] = useState<'current' | 'next'>('current') // โหมดการดู: เดือนปัจจุบันหรือเดือนถัดไป
  const [formAccountingResponsible, setFormAccountingResponsible] = useState<string | null>(null)
  const [formTaxInspectionResponsible, setFormTaxInspectionResponsible] = useState<string | null>(null)
  const [formWhtFilerResponsible, setFormWhtFilerResponsible] = useState<string | null>(null)
  const [formVatFilerResponsible, setFormVatFilerResponsible] = useState<string | null>(null)
  const [formDocumentEntryResponsible, setFormDocumentEntryResponsible] = useState<string | null>(null)
  const [formNote, setFormNote] = useState('')

  // Get current/next month based on view mode
  const getViewMonth = () => {
    if (viewMode === 'current') {
      return getCurrentMonth()
    } else {
      return getNextMonth()
    }
  }

  // Fetch work assignments
  const {
    data: assignmentsData,
    isLoading,
    error,
    refetch: refetchAssignments,
    isRefetching,
  } = useQuery(
    ['work-assignments', page, limit, build, year, month, search, viewMode],
    () => {
      const viewMonth = getViewMonth()
      // ถ้ามีการตั้งค่า year หรือ month ไว้แล้ว ให้ใช้ค่าที่ตั้งไว้
      // ถ้าไม่มี ให้ใช้ค่า default จาก viewMode
      return workAssignmentsService.getList({
        page,
        limit,
        build: build || undefined,
        year: year || viewMonth.year.toString(),
        month: month || viewMonth.month.toString(),
        search: search || undefined,
        sortBy: 'assigned_at',
        sortOrder: 'desc',
      })
    },
    {
      enabled: isAdmin && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      keepPreviousData: true, // ใช้ keepPreviousData เพื่อให้แสดงข้อมูลเก่าก่อนที่จะโหลดข้อมูลใหม่
      staleTime: 30 * 1000, // ข้อมูลจะ stale หลังจาก 30 วินาที (ลดการ refetch บ่อย)
      cacheTime: 5 * 60 * 1000, // Cache 5 นาที
      refetchOnWindowFocus: false, // ปิดการ refetch อัตโนมัติเมื่อ focus window เพื่อความเสถียร
      refetchOnMount: true, // ✅ BUG-168: เปลี่ยนเป็น true เพื่อให้ refetch เมื่อ navigate ไปหน้าอื่น
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      retry: (failureCount, error: unknown) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if (isApiError(error) && error.response?.status === 429) {
          return false
        }
        // Retry 2 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      onError: (error: unknown) => {
        // Handle 429 errors specifically
        if (isApiError(error) && error.response?.status === 429) {
          notifications.show({
            title: 'คำขอมากเกินไป',
            message: 'กรุณารอสักครู่แล้วรีเฟรชหน้าเว็บ',
            color: 'orange',
            autoClose: 5000,
          })
        }
      },
    }
  )

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า query ทำงานหรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[WorkAssignment] Query state:', {
        enabled: isAdmin && _hasHydrated,
        isLoading,
        isRefetching,
        hasData: !!assignmentsData,
        dataLength: assignmentsData?.data?.length || 0,
        error: error ? (error as any)?.message || 'Unknown error' : null,
        timestamp: new Date().toISOString(),
      })
    }
  }, [isAdmin, _hasHydrated, isLoading, isRefetching, assignmentsData, error])

  // Handler สำหรับรีเฟรซข้อมูล
  const handleRefresh = async () => {
    try {
      // Invalidate queries เพื่อลบ cache และ mark as stale
      queryClient.invalidateQueries(['work-assignments'])
      // Refetch ข้อมูลใหม่ (เฉพาะเมื่อ user กดปุ่ม refresh)
      await refetchAssignments()
      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเฟรซข้อมูลเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
        autoClose: 2000,
      })
    } catch (error: unknown) {
      console.error('Refresh error:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรซข้อมูลได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    }
  }

  // State for company status filter
  const [companyStatusFilter, setCompanyStatusFilter] = useState<string>('all')

  // Fetch clients for dropdown (filtered by company_status)
  const { data: clientsData } = useQuery(
    ['clients-list', companyStatusFilter],
    () =>
      clientsService.getList({
        limit: 1000,
        company_status: companyStatusFilter === 'all' ? undefined : companyStatusFilter,
      }),
    {
      enabled: isAdmin && formOpened,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Fetch employees for dropdown (for old assignments display)
  const { data: employeesData } = useQuery(
    ['employees-list'],
    () => employeeService.getAll({ limit: 1000, status: 'active' }),
    {
      enabled: isAdmin, // Always fetch when admin (needed for name formatting)
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: (failureCount, error: unknown) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if (isApiError(error) && error.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    }
  )

  // Helper function to format employee name with nickname lookup
  const formatEmployeeNameWithId = (
    name: string | null | undefined,
    employeeId: string | null | undefined
  ): string => {
    if (!name) return '-'

    // If name already contains parentheses, assume it's already formatted
    if (name.includes('(') && name.includes(')')) {
      return name
    }

    // Try to find employee by employee_id to get nickname
    if (employeeId && employeesData?.employees) {
      const employee = employeesData.employees.find(
        (emp) => emp.employee_id === employeeId
      )
      if (employee?.nick_name) {
        return `${name}(${employee.nick_name})`
      }
    }

    // Return name as is if no nickname found
    return name
  }

  // Fetch users for accounting (service, data_entry_and_service)
  const { data: accountingUsersData } = useQuery(
    ['users-accounting'],
    () => usersService.getList({ roles: 'service,data_entry_and_service', status: 'active' }),
    {
      enabled: isAdmin && (formOpened || bulkCreateModalOpened || previewData.length > 0),
      staleTime: 5 * 60 * 1000,
    }
  )

  // Fetch users for tax inspection (audit)
  const { data: taxInspectionUsersData } = useQuery(
    ['users-tax-inspection'],
    () => usersService.getList({ role: 'audit', status: 'active' }),
    {
      enabled: isAdmin && (formOpened || bulkCreateModalOpened || previewData.length > 0),
      staleTime: 5 * 60 * 1000,
    }
  )

  // Fetch users for WHT/VAT filing (data_entry_and_service)
  const { data: filingUsersData } = useQuery(
    ['users-filing'],
    () => usersService.getList({ role: 'data_entry_and_service', status: 'active' }),
    {
      enabled: isAdmin && (formOpened || bulkCreateModalOpened || previewData.length > 0),
      staleTime: 5 * 60 * 1000,
    }
  )

  // Fetch users for document entry (data_entry_and_service, data_entry)
  const { data: documentEntryUsersData } = useQuery(
    ['users-document-entry'],
    () => usersService.getList({ roles: 'data_entry_and_service,data_entry', status: 'active' }),
    {
      enabled: isAdmin && (formOpened || bulkCreateModalOpened || previewData.length > 0),
      staleTime: 5 * 60 * 1000,
    }
  )

  // Create mutation (for single create with notification)
  const createMutation = useMutation(workAssignmentsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['work-assignments'])
      setFormOpened(false)
      resetForm()
      notifications.show({
        title: 'สำเร็จ',
        message: 'สร้างการจัดงานเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: getErrorMessage(error) || 'ไม่สามารถสร้างการจัดงานได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  // Create mutation for bulk operations (no notification)
  const createMutationBulk = useMutation(workAssignmentsService.create, {
    onSuccess: () => {
      // Don't show notification for bulk operations
      // Notification will be shown in executeBulkSave
    },
    onError: (error: any) => {
      // Don't show notification for bulk operations
      // Errors will be tracked in executeBulkSave
      throw error // Re-throw to be caught in executeBulkSave
    },
  })

  // Update mutation (for single update with notification)
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<WorkAssignmentType> }) =>
      workAssignmentsService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['work-assignments'])
        setFormOpened(false)
        resetForm()
        notifications.show({
          title: 'สำเร็จ',
          message: 'แก้ไขการจัดงานเรียบร้อยแล้ว',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      },
      onError: (error: unknown) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error.response?.data?.message || 'ไม่สามารถแก้ไขการจัดงานได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  // Update mutation for bulk operations (no notification)
  const updateMutationBulk = useMutation(
    ({ id, data }: { id: string; data: Partial<WorkAssignmentType> }) =>
      workAssignmentsService.update(id, data),
    {
      onSuccess: () => {
        // Don't show notification for bulk operations
        // Notification will be shown in executeBulkSave
      },
      onError: (error: unknown) => {
        // Don't show notification for bulk operations
        // Errors will be tracked in executeBulkSave
        throw error // Re-throw to be caught in executeBulkSave
      },
    }
  )

  // Reset data mutation
  const resetMutation = useMutation(workAssignmentsService.resetData, {
    onSuccess: () => {
      queryClient.invalidateQueries(['work-assignments'])
      setResetConfirmOpened(false)
      setSelectedAssignment(null)
      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเซ็ตข้อมูลเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: getErrorMessage(error) || 'ไม่สามารถรีเซ็ตข้อมูลได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  // Handlers
  const handleAdd = () => {
    // Ask for target tax month first (เดือนภาษีที่จะบันทึก)
    const currentTaxMonth = getCurrentTaxMonth()
    setTargetTaxYear(currentTaxMonth.year)
    setTargetTaxMonth(currentTaxMonth.month)
    setTargetTaxYearModalOpened(true)
  }

  // Function to load preview data for all clients using Bulk API
  const loadPreviewDataForRange = async (
    clientsToLoad: Client[],
    startIndex: number,
    endIndex: number,
    prevYear: number,
    prevMonth: number,
    totalClients: number, // เพิ่ม parameter สำหรับ total clients ทั้งหมด
    targetTaxYear: number | null, // เพิ่ม parameter สำหรับ target tax year
    targetTaxMonth: number | null // เพิ่ม parameter สำหรับ target tax month
  ): Promise<typeof previewData> => {
    const previewItems: typeof previewData = []
    const clientsSlice = clientsToLoad.slice(startIndex, endIndex)

    // Extract build codes
    const buildCodes = clientsSlice.map((client) => client.build)

    // Update progress - แสดงว่ากำลังเตรียมข้อมูล
    setLoadingProgress({ current: startIndex, total: totalClients })

    try {
      // ใช้ Bulk API เพื่อดึงข้อมูลทั้งหมดในครั้งเดียว
      // ดึงข้อมูลเดิม (previous month) สำหรับแสดงเป็น "เดิม"
      const prevAssignments = await workAssignmentsService.getBulkByBuilds(
        buildCodes,
        prevYear,
        prevMonth
      )

      // ดึงข้อมูลงานที่จัดแล้วในเดือนภาษีที่จะบันทึก (target tax month)
      // เพื่อตรวจสอบว่างานไหนจัดแล้วบ้าง
      let existingAssignments: WorkAssignmentType[] = []
      if (targetTaxYear && targetTaxMonth !== null && targetTaxMonth !== undefined) {
        try {
          existingAssignments = await workAssignmentsService.getBulkByBuilds(
            buildCodes,
            targetTaxYear,
            targetTaxMonth
          )
        } catch (error) {
          console.warn('Error fetching existing assignments for target tax month:', error)
          // Continue even if this fails - we'll just show all items
        }
      }

      // Create Maps for quick lookup by build code
      const prevAssignmentsMap = new Map<string, WorkAssignmentType>()
      prevAssignments.forEach((assignment) => {
        prevAssignmentsMap.set(assignment.build, assignment)
      })

      const existingAssignmentsMap = new Map<string, WorkAssignmentType>()
      existingAssignments.forEach((assignment) => {
        existingAssignmentsMap.set(assignment.build, assignment)
      })

      // Process each client and create preview items
      for (let i = 0; i < clientsSlice.length; i++) {
        const client = clientsSlice[i]
        const currentIndex = startIndex + i + 1

        // Update progress
        setLoadingProgress({ current: currentIndex, total: totalClients })

        // Get previous assignment from map (may be undefined if not found)
        const prevAssignment = prevAssignmentsMap.get(client.build)

        // Check if work assignment already exists for target tax month
        const existingAssignment = existingAssignmentsMap.get(client.build)
        const isAssigned = !!existingAssignment

        // Check if we already have data for this client (preserve user input)
        const existingData = loadedPreviewData.find((item) => item.build === client.build)

        previewItems.push({
          build: client.build,
          company_name: client.company_name,
          legal_entity_number: client.legal_entity_number || '-',
          tax_registration_status: client.tax_registration_status || null,
          company_status: client.company_status,
          // Target tax month (เดือนภาษีที่จะบันทึก)
          target_tax_year: targetTaxYear,
          target_tax_month: targetTaxMonth,
          // Status: งานจัดแล้วหรือยังไม่จัด
          is_assigned: isAssigned,
          existing_assignment_id: existingAssignment?.id || null,
          // Previous month data
          prev_accounting_responsible: prevAssignment?.accounting_responsible || null,
          prev_accounting_responsible_name: prevAssignment?.accounting_responsible_name || null,
          prev_tax_inspection_responsible: prevAssignment?.tax_inspection_responsible || null,
          prev_tax_inspection_responsible_name: prevAssignment?.tax_inspection_responsible_name || null,
          prev_wht_filer_responsible: prevAssignment?.wht_filer_responsible || null,
          prev_wht_filer_responsible_name: prevAssignment?.wht_filer_responsible_name || null,
          prev_vat_filer_responsible: prevAssignment?.vat_filer_responsible || null,
          prev_vat_filer_responsible_name: prevAssignment?.vat_filer_responsible_name || null,
          prev_document_entry_responsible: prevAssignment?.document_entry_responsible || null,
          prev_document_entry_responsible_name: prevAssignment?.document_entry_responsible_name || null,
          // New month data - ถ้ามีงานจัดแล้ว ให้ใช้ข้อมูลจาก existing assignment, ถ้ายังไม่จัดให้ใช้ previous หรือ user input
          new_accounting_responsible: existingData?.new_accounting_responsible ?? (isAssigned ? existingAssignment?.accounting_responsible : prevAssignment?.accounting_responsible) ?? null,
          new_tax_inspection_responsible: existingData?.new_tax_inspection_responsible ?? (isAssigned ? existingAssignment?.tax_inspection_responsible : prevAssignment?.tax_inspection_responsible) ?? null,
          new_wht_filer_responsible: existingData?.new_wht_filer_responsible ?? (isAssigned ? existingAssignment?.wht_filer_responsible : prevAssignment?.wht_filer_responsible) ?? null,
          new_vat_filer_responsible: existingData?.new_vat_filer_responsible ?? (isAssigned ? existingAssignment?.vat_filer_responsible : prevAssignment?.vat_filer_responsible) ?? null,
          new_document_entry_responsible: existingData?.new_document_entry_responsible ?? (isAssigned ? existingAssignment?.document_entry_responsible : prevAssignment?.document_entry_responsible) ?? null,
        })
      }
    } catch (error) {
      console.error('Error loading preview data with bulk API:', error)
      // Fallback: ถ้า Bulk API ล้มเหลว ให้ใช้ individual calls (แต่จะช้ากว่า)
      // แต่เพื่อความปลอดภัย ให้ return empty data และแสดง error
      throw error
    }

    return previewItems
  }

  const handleBulkCreateConfirm = async () => {
    if (selectedCompanyStatuses.length === 0) {
      notifications.show({
        title: 'กรุณาเลือกสถานะ',
        message: 'กรุณาเลือกสถานะบริษัทอย่างน้อย 1 รายการ',
        color: 'yellow',
        icon: <TbAlertCircle size={16} />,
      })
      return
    }

    setIsLoadingPreview(true)
    try {
      // Fetch clients by multiple company statuses
      // If "all" is selected, fetch all clients
      const allStatuses = companyStatusOptions.filter((opt) => opt.value !== 'all').map((opt) => opt.value)
      const statusesToFetch =
        selectedCompanyStatuses.includes('all') || selectedCompanyStatuses.length === 0
          ? allStatuses
          : selectedCompanyStatuses

      // Fetch clients for each status and combine
      // ดึงข้อมูลทั้งหมดโดยไม่จำกัด limit (ใช้ limit สูงมาก)
      const clientPromises = statusesToFetch.map((status) =>
        clientsService.getList({
          limit: 99999, // ใช้ limit สูงมากเพื่อดึงข้อมูลทั้งหมด
          company_status: status,
        })
      )

      const clientResults = await Promise.all(clientPromises)

      // Combine and deduplicate clients by build code
      const clientMap = new Map<string, Client>()
      clientResults.forEach((result) => {
        result.data.forEach((client: Client) => {
          if (!clientMap.has(client.build)) {
            clientMap.set(client.build, client)
          }
        })
      })
      const clients = Array.from(clientMap.values())

      // เก็บ client list ทั้งหมด
      setAllClients(clients)

      // Use target tax month from state (ที่ผู้ใช้เลือกไว้แล้ว)
      if (!targetTaxYear || !targetTaxMonth) {
        notifications.show({
          title: 'ข้อมูลไม่ครบ',
          message: 'กรุณาเลือกเดือนภาษีที่จะบันทึกก่อน',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
        setIsLoadingPreview(false)
        return
      }

      // Use selected previous tax month or calculate default (ย้อนหลัง 1 เดือนจากเดือนภาษีที่จะบันทึก)
      const prevYear = selectedPreviousTaxYear || (() => {
        const prevTaxMonthDate = new Date(targetTaxYear, targetTaxMonth - 2, 1)
        return prevTaxMonthDate.getFullYear()
      })()
      const prevMonth = selectedPreviousTaxMonth || (() => {
        const prevTaxMonthDate = new Date(targetTaxYear, targetTaxMonth - 2, 1)
        return prevTaxMonthDate.getMonth() + 1
      })()

      // Debug logging
      console.log('Loading previous month data:', {
        targetTaxMonth: `${targetTaxYear}/${targetTaxMonth}`,
        previousTaxMonth: `${prevYear}/${prevMonth}`,
        targetMonthName: THAI_MONTHS.find((m) => m.value === targetTaxMonth.toString())?.label,
        previousMonthName: THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label,
        userSelected: !!(selectedPreviousTaxYear && selectedPreviousTaxMonth),
      })

      // โหลดข้อมูลทั้งหมดพร้อมกัน (ไม่ใช้ lazy loading แล้ว)
      // Set initial progress
      setLoadingProgress({ current: 0, total: clients.length })

      // Clear previous loaded data if starting fresh
      setLoadedPreviewData([])

      // Load all items - โหลดทั้งหมดพร้อมกัน
      const allPreviewItems = await loadPreviewDataForRange(
        clients,
        0,
        clients.length, // โหลดทั้งหมด
        prevYear,
        prevMonth,
        clients.length, // ส่ง total clients ทั้งหมดเพื่อแสดง progress ที่ถูกต้อง
        targetTaxYear, // ส่ง target tax year
        targetTaxMonth // ส่ง target tax month
      )

      // Merge with existing data (preserve user input)
      const mergedData = [...loadedPreviewData]
      allPreviewItems.forEach((item) => {
        const existingIndex = mergedData.findIndex((d) => d.build === item.build)
        if (existingIndex >= 0) {
          // Preserve user input for existing items
          mergedData[existingIndex] = {
            ...item,
            new_accounting_responsible: mergedData[existingIndex].new_accounting_responsible ?? item.new_accounting_responsible,
            new_tax_inspection_responsible: mergedData[existingIndex].new_tax_inspection_responsible ?? item.new_tax_inspection_responsible,
            new_wht_filer_responsible: mergedData[existingIndex].new_wht_filer_responsible ?? item.new_wht_filer_responsible,
            new_vat_filer_responsible: mergedData[existingIndex].new_vat_filer_responsible ?? item.new_vat_filer_responsible,
            new_document_entry_responsible: mergedData[existingIndex].new_document_entry_responsible ?? item.new_document_entry_responsible,
          }
        } else {
          mergedData.push(item)
        }
      })

      setLoadedPreviewData(mergedData)
      setPreviewData(mergedData)

      // ปิด Modal และ reset loading state หลังจากโหลดเสร็จ
      setIsLoadingPreview(false)
      setLoadingProgress({ current: 0, total: 0 })
      setBulkCreateModalOpened(false)
      setPreviewPage(1) // Reset to first page when new data is loaded
      setPreviewLimit(20) // Reset to default limit

      // Show success notification
      notifications.show({
        title: 'ดึงข้อมูลสำเร็จ',
        message: `ดึงข้อมูล ${allPreviewItems.length} รายการเรียบร้อยแล้ว`,
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    } catch (error) {
      console.error('Error fetching preview data:', error)
      setIsLoadingPreview(false)
      setLoadingProgress({ current: 0, total: 0 })
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    }
  }

  const handleEdit = (assignment: WorkAssignmentType) => {
    setFormMode('edit')
    setEditingAssignment(assignment)
    setFormBuild(assignment.build)
    setFormYear(assignment.assignment_year)
    setFormMonth(assignment.assignment_month)
    setFormAccountingResponsible(assignment.accounting_responsible || null)
    setFormTaxInspectionResponsible(assignment.tax_inspection_responsible || null)
    setFormWhtFilerResponsible(assignment.wht_filer_responsible || null)
    setFormVatFilerResponsible(assignment.vat_filer_responsible || null)
    setFormDocumentEntryResponsible(assignment.document_entry_responsible || null)
    setFormNote(assignment.assignment_note || '')
    setFormOpened(true)
  }

  const handleReset = (assignment: WorkAssignmentType) => {
    setSelectedAssignment(assignment)
    setResetConfirmOpened(true)
  }

  const confirmReset = async () => {
    if (selectedAssignment) {
      await resetMutation.mutateAsync(selectedAssignment.id)
    }
  }

  const resetForm = () => {
    setFormBuild('')
    setFormYear(new Date().getFullYear())
    setFormMonth(new Date().getMonth() + 1)
    setFormAccountingResponsible(null)
    setFormTaxInspectionResponsible(null)
    setFormWhtFilerResponsible(null)
    setFormVatFilerResponsible(null)
    setFormDocumentEntryResponsible(null)
    setFormNote('')
  }

  const handleFormSubmit = async () => {
    if (!formBuild || !formYear || !formMonth) {
      notifications.show({
        title: 'ข้อมูลไม่ครบ',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
      return
    }

    const data = {
      build: formBuild,
      assignment_year: formYear,
      assignment_month: formMonth,
      accounting_responsible: formAccountingResponsible || null,
      tax_inspection_responsible: formTaxInspectionResponsible || null,
      wht_filer_responsible: formWhtFilerResponsible || null,
      vat_filer_responsible: formVatFilerResponsible || null,
      document_entry_responsible: formDocumentEntryResponsible || null,
      assignment_note: formNote || null,
    }

    try {
      if (formMode === 'create') {
        await createMutation.mutateAsync(data)
      } else if (editingAssignment) {
        await updateMutation.mutateAsync({ id: editingAssignment.id, data })
      }
    } catch (error) {
      console.error('Form submit error:', error)
    }
  }

  // ไม่ต้องใช้ lazy loading แล้ว - โหลดข้อมูลทั้งหมดพร้อมกัน

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, build, year, month, viewMode])

  // Auto-set year and month when viewMode changes (only if not manually set)
  useEffect(() => {
    const viewMonth = getViewMonth()
    // Only auto-set if user hasn't manually set year/month filters
    if (viewMode === 'current' && (!year || year !== viewMonth.year.toString())) {
      setYear(viewMonth.year.toString())
    }
    if (viewMode === 'current' && (!month || month !== viewMonth.month.toString())) {
      setMonth(viewMonth.month.toString())
    }
    if (viewMode === 'next') {
      const nextMonth = getNextMonth()
      if (!year || year !== nextMonth.year.toString()) {
        setYear(nextMonth.year.toString())
      }
      if (!month || month !== nextMonth.month.toString()) {
        setMonth(nextMonth.month.toString())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  // Month options
  const monthOptions = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ]

  // Company status options
  const companyStatusOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'รายเดือน', label: 'รายเดือน' },
    { value: 'รายเดือน / วางมือ', label: 'รายเดือน / วางมือ' },
    { value: 'รายเดือน / จ่ายรายปี', label: 'รายเดือน / จ่ายรายปี' },
    { value: 'รายเดือน / เดือนสุดท้าย', label: 'รายเดือน / เดือนสุดท้าย' },
    { value: 'ยกเลิกทำ', label: 'ยกเลิกทำ' },
  ]

  // Toggle all "previous" columns visibility at once
  const toggleAllPreviousColumns = () => {
    const newValue = !showPreviousColumns
    setShowPreviousColumns(newValue)
    setVisibleColumns((prev) => ({
      ...prev,
      prev_accounting: newValue,
      prev_tax_inspection: newValue,
      prev_wht: newValue,
      prev_vat: newValue,
      prev_document_entry: newValue,
    }))
  }

  /**
   * คำนวณเดือนภาษี (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
   * ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีจะเป็น ธันวาคม 2025
   */
  const getCurrentTaxMonth = () => {
    const now = new Date()
    // ย้อนหลัง 1 เดือน
    const taxMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      year: taxMonth.getFullYear(),
      month: taxMonth.getMonth() + 1,
    }
  }

  /**
   * คำนวณเดือนภาษีถัดไป (เท่ากับเดือนปฏิทินปัจจุบัน)
   * ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีถัดไปจะเป็น มกราคม 2026
   */
  const getNextTaxMonth = () => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }
  }

  // Get current and next month info (using tax month)
  const getCurrentMonth = () => getCurrentTaxMonth()
  const getNextMonth = () => getNextTaxMonth()

  /**
   * Validate preview data - ตรวจสอบข้อมูลที่ไม่ได้กรอก
   * ตรวจสอบทุก field: new_accounting_responsible, new_tax_inspection_responsible, 
   * new_wht_filer_responsible, new_vat_filer_responsible, new_document_entry_responsible
   */
  const validatePreviewData = (): {
    isValid: boolean
    incompleteItems: Array<{ build: string; missingFields: string[] }>
  } => {
    const incompleteItems: Array<{ build: string; missingFields: string[] }> = []

    previewData.forEach((item) => {
      const missingFields: string[] = []

      if (!item.new_accounting_responsible) {
        missingFields.push('ผู้รับผิดชอบทำบัญชี')
      }
      if (!item.new_tax_inspection_responsible) {
        missingFields.push('ผู้ตรวจภาษี')
      }
      if (!item.new_wht_filer_responsible) {
        missingFields.push('ผู้ยื่น WHT')
      }
      if (!item.new_vat_filer_responsible && item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') {
        missingFields.push('ผู้ยื่น VAT')
      }
      if (!item.new_document_entry_responsible) {
        missingFields.push('ผู้คีย์เอกสาร')
      }

      if (missingFields.length > 0) {
        incompleteItems.push({
          build: item.build,
          missingFields,
        })
      }
    })

    return {
      isValid: incompleteItems.length === 0,
      incompleteItems,
    }
  }

  /**
   * Check for duplicate assignments in database
   */
  const checkDuplicateAssignments = async (
    year: number,
    month: number
  ): Promise<WorkAssignmentType[]> => {
    if (previewData.length === 0) {
      return []
    }

    // ใช้ target tax month จาก previewData (เดือนภาษีที่จะบันทึก)
    // ถ้า previewData มีข้อมูล ให้ใช้เดือนภาษีจากรายการแรก (ควรจะเหมือนกันทุกรายการ)
    const firstItem = previewData[0]
    const targetYear = firstItem?.target_tax_year || year
    const targetMonth = firstItem?.target_tax_month || month

    // สร้าง Map เพื่อ group builds by target tax month
    const buildsByTaxMonth = new Map<string, string[]>()
    previewData.forEach((item) => {
      const itemTargetYear = item.target_tax_year || targetYear
      const itemTargetMonth = item.target_tax_month || targetMonth
      const key = `${itemTargetYear}_${itemTargetMonth}`
      if (!buildsByTaxMonth.has(key)) {
        buildsByTaxMonth.set(key, [])
      }
      buildsByTaxMonth.get(key)!.push(item.build)
    })

    // ตรวจสอบ duplicates สำหรับแต่ละ target tax month
    const allDuplicates: WorkAssignmentType[] = []
    for (const [key, builds] of buildsByTaxMonth.entries()) {
      const [taxYear, taxMonth] = key.split('_').map(Number)
      const duplicates = await workAssignmentsService.checkDuplicates(builds, taxYear, taxMonth)
      allDuplicates.push(...duplicates)
    }

    return allDuplicates
  }

  /**
   * Validate build code exists in client list
   */
  const validateBuildCode = (build: string): { isValid: boolean; error?: string } => {
    if (!build || build.trim() === '') {
      return { isValid: false, error: 'Build code is required' }
    }
    // Check if build exists in client list
    const clientExists = allClients.some((c) => c.build === build)
    if (!clientExists) {
      return { isValid: false, error: 'Build code not found in system' }
    }
    return { isValid: true }
  }

  /**
   * Validate employee ID exists in user options
   */
  const validateEmployeeId = (
    employeeId: string | null,
    userOptions: Array<{ value: string; label: string }>
  ): { isValid: boolean; error?: string } => {
    if (!employeeId) return { isValid: true } // Optional field
    const employeeExists = userOptions.some((opt) => opt.value === employeeId)
    if (!employeeExists) {
      return { isValid: false, error: 'Employee ID not found in system' }
    }
    return { isValid: true }
  }

  /**
   * Validate tax month
   */
  const validateTaxMonthInput = (year: number | null, month: number | null): { isValid: boolean; error?: string } => {
    if (!year || !month) {
      return { isValid: false, error: 'กรุณาเลือกปีและเดือนภาษี' }
    }
    if (month < 1 || month > 12) {
      return { isValid: false, error: 'เดือนต้องอยู่ระหว่าง 1-12' }
    }
    const currentDate = new Date()
    const maxFutureYear = currentDate.getFullYear() + 2
    if (year > maxFutureYear) {
      return { isValid: false, error: `ปีไม่สามารถเกิน ${maxFutureYear}` }
    }
    if (year < 2000) {
      return { isValid: false, error: 'ปีไม่สามารถน้อยกว่า 2000' }
    }
    return { isValid: true }
  }

  /**
   * Check data integrity before save
   */
  const checkDataIntegrity = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = []

    // Check for duplicates in preview data itself
    const buildSet = new Set<string>()
    previewData.forEach((item) => {
      if (buildSet.has(item.build)) {
        warnings.push(`Build ${item.build} ปรากฏหลายครั้งใน preview`)
      }
      buildSet.add(item.build)
    })

    // Check if builds still exist in client list
    previewData.forEach((item) => {
      const clientExists = allClients.some((c) => c.build === item.build)
      if (!clientExists) {
        warnings.push(`Build ${item.build} ไม่มีอยู่ในระบบแล้ว`)
      }
    })

    return {
      isValid: warnings.length === 0,
      warnings,
    }
  }

  /**
   * Execute bulk save with create and update logic
   * Includes comprehensive error handling and retry logic
   */
  const executeBulkSave = async (
    year: number,
    month: number,
    skipBuilds: string[] = []
  ) => {
    // Prevent duplicate saves
    if (isSaving) {
      notifications.show({
        title: 'กำลังบันทึกข้อมูล',
        message: 'กรุณารอให้การบันทึกเสร็จสิ้นก่อน',
        color: 'blue',
        icon: <TbAlertCircle size={16} />,
      })
      return
    }

    setIsSaving(true)
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    const errors: Array<{ build: string; error: string }> = []
    const retryableErrors: Array<{ build: string; error: string; item: typeof previewData[0] }> = []

    // Backup data before save
    const backupKey = `bulk_save_backup_${Date.now()}`
    try {
      localStorage.setItem(
        backupKey,
        JSON.stringify({
          previewData,
          year,
          month,
          skipBuilds,
          timestamp: new Date().toISOString(),
        })
      )
    } catch (backupError) {
      console.warn('Failed to create backup:', backupError)
    }

    try {
      // Validate tax month
      const taxMonthValidation = validateTaxMonthInput(year, month)
      if (!taxMonthValidation.isValid) {
        notifications.show({
          title: 'ข้อมูลไม่ถูกต้อง',
          message: taxMonthValidation.error || 'กรุณาตรวจสอบข้อมูล',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
        setIsSaving(false)
        return
      }

      // Check data integrity
      const integrityCheck = checkDataIntegrity()
      if (!integrityCheck.isValid && integrityCheck.warnings.length > 0) {
        console.warn('Data integrity warnings:', integrityCheck.warnings)
        // Show warning but continue (user already confirmed)
      }

      // Create a map of duplicate items by build code and target tax month
      // Key format: "build_year_month" (e.g., "018_2026_1")
      const duplicateMap = new Map<string, WorkAssignmentType>()
      duplicateItems.forEach((dup) => {
        const key = `${dup.build}_${dup.assignment_year}_${dup.assignment_month}`
        duplicateMap.set(key, dup)
      })

      // Filter out incomplete items if skipBuilds is provided
      const itemsToSave = previewData.filter((item) => !skipBuilds.includes(item.build))

      // Debug logging
      console.log('executeBulkSave Debug:', {
        previewDataLength: previewData.length,
        skipBuildsLength: skipBuilds.length,
        skipBuilds,
        itemsToSaveLength: itemsToSave.length,
        itemsToSave: itemsToSave.map((i) => ({
          build: i.build,
          hasAccounting: !!i.new_accounting_responsible,
          hasTaxInspection: !!i.new_tax_inspection_responsible,
          hasWHT: !!i.new_wht_filer_responsible,
          hasVAT: !!i.new_vat_filer_responsible,
          hasDocumentEntry: !!i.new_document_entry_responsible,
        })),
      })

      // Validate each item before saving
      const validItems: typeof previewData = []
      const invalidItems: Array<{ build: string; error: string }> = []

      itemsToSave.forEach((item) => {
        // Validate build code
        const buildValidation = validateBuildCode(item.build)
        if (!buildValidation.isValid) {
          invalidItems.push({
            build: item.build,
            error: buildValidation.error || 'Build code ไม่ถูกต้อง',
          })
          return
        }

        // Validate employee IDs (if provided)
        const employeeFields = [
          { key: 'accounting', value: item.new_accounting_responsible, options: accountingUserOptions },
          { key: 'tax_inspection', value: item.new_tax_inspection_responsible, options: taxInspectionUserOptions },
          { key: 'wht', value: item.new_wht_filer_responsible, options: filingUserOptions },
          { key: 'vat', value: item.new_vat_filer_responsible, options: filingUserOptions },
          { key: 'document_entry', value: item.new_document_entry_responsible, options: documentEntryUserOptions },
        ]

        let hasError = false
        for (const field of employeeFields) {
          if (field.value) {
            const validation = validateEmployeeId(field.value, field.options)
            if (!validation.isValid) {
              invalidItems.push({
                build: item.build,
                error: `${field.key}: ${validation.error}`,
              })
              hasError = true
              break
            }
          }
        }

        if (!hasError) {
          validItems.push(item)
        } else {
          console.warn(`Item ${item.build} failed validation:`, { hasError, item })
        }
      })

      // Debug: Check if items have at least one field filled
      itemsToSave.forEach((item) => {
        const hasAnyField =
          !!item.new_accounting_responsible ||
          !!item.new_tax_inspection_responsible ||
          !!item.new_wht_filer_responsible ||
          !!item.new_vat_filer_responsible ||
          !!item.new_document_entry_responsible

        if (!hasAnyField && !skipBuilds.includes(item.build)) {
          console.warn(`Item ${item.build} has no fields filled but is not in skipBuilds`)
        }
      })

      // Show warning for invalid items
      if (invalidItems.length > 0) {
        console.warn('Invalid items found:', invalidItems)
        // Continue with valid items only
      }

      // Debug logging for validation results
      console.log('Validation Results:', {
        itemsToSaveLength: itemsToSave.length,
        validItemsLength: validItems.length,
        invalidItemsLength: invalidItems.length,
        invalidItems,
        validItems: validItems.map((i) => i.build),
      })

      // Check if there are any valid items to save
      if (validItems.length === 0) {
        let errorMessage = 'ไม่มีรายการที่สามารถบันทึกได้'

        if (itemsToSave.length === 0) {
          errorMessage = `ไม่มีรายการที่จะบันทึก (ถูก skip ทั้งหมด ${skipBuilds.length} รายการ)`
        } else if (invalidItems.length > 0) {
          errorMessage = `พบ ${invalidItems.length} รายการที่มีข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูล`
        } else if (itemsToSave.length > 0 && validItems.length === 0) {
          errorMessage = `พบ ${itemsToSave.length} รายการ แต่ไม่ผ่านการตรวจสอบ กรุณาตรวจสอบข้อมูล`
        }

        console.error('No valid items to save:', {
          previewDataLength: previewData.length,
          skipBuildsLength: skipBuilds.length,
          itemsToSaveLength: itemsToSave.length,
          validItemsLength: validItems.length,
          invalidItemsLength: invalidItems.length,
          invalidItems,
        })

        notifications.show({
          title: 'ไม่มีข้อมูลที่จะบันทึก',
          message: errorMessage,
          color: 'red',
          icon: <TbAlertCircle size={16} />,
          autoClose: 15000,
        })
        setIsSaving(false)
        return
      }

      // Filter out duplicate items before processing
      const itemsToProcess = validItems.filter((item) => {
        const targetYear = item.target_tax_year || year
        const targetMonth = item.target_tax_month || month
        const duplicateKey = `${item.build}_${targetYear}_${targetMonth}`
        const duplicate = duplicateMap.get(duplicateKey)

        if (duplicate) {
          // Skip existing assignment - do not update
          console.log(`Skipping duplicate assignment for build ${item.build}, year ${targetYear}, month ${targetMonth}`)
          skippedCount++
          return false
        }
        return true
      })

      // Use batch processing for saving to avoid rate limits
      const batchSize = 5
      const maxRetries = 3
      const retryDelay = 1000 // 1 second

      for (let i = 0; i < itemsToProcess.length; i += batchSize) {
        const batch = itemsToProcess.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (item) => {
            let retryCount = 0
            let lastError: any = null

            while (retryCount < maxRetries) {
              try {
                // Use target tax month from previewData item (เดือนภาษีที่จะบันทึก)
                const targetYear = item.target_tax_year || year
                const targetMonth = item.target_tax_month || month

                // Create new assignment only (duplicates already filtered out)
                await createMutationBulk.mutateAsync({
                  build: item.build,
                  assignment_year: targetYear,
                  assignment_month: targetMonth,
                  accounting_responsible: item.new_accounting_responsible,
                  tax_inspection_responsible: item.new_tax_inspection_responsible,
                  wht_filer_responsible: item.new_wht_filer_responsible,
                  vat_filer_responsible: item.new_vat_filer_responsible,
                  document_entry_responsible: item.new_document_entry_responsible,
                  assignment_note: null,
                })
                successCount++
                break // Success, exit retry loop
              } catch (error: unknown) {
                lastError = error
                retryCount++

                // Check if error is retryable
                const isRetryable =
                  (isNetworkError(error) && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) ||
                  (isApiError(error) && (
                    error.response?.status === 429 ||
                    error.response?.status === 503 ||
                    (error.response?.status !== undefined && error.response.status >= 500 && error.response.status < 600)
                  ))

                if (isRetryable && retryCount < maxRetries) {
                  // Exponential backoff
                  const delay = retryDelay * Math.pow(2, retryCount - 1)
                  await new Promise((resolve) => setTimeout(resolve, delay))
                  continue // Retry
                } else {
                  // Not retryable or max retries reached
                  errorCount++
                  const errorMessage = getErrorMessage(error)
                  errors.push({
                    build: item.build,
                    error: errorMessage,
                  })

                  // Store retryable errors for potential manual retry
                  if (isRetryable) {
                    retryableErrors.push({
                      build: item.build,
                      error: errorMessage,
                      item,
                    })
                  }

                  console.error(`Error saving assignment for ${item.build} (attempt ${retryCount}/${maxRetries}):`, error)
                  break // Exit retry loop
                }
              }
            }
          })
        )
        // Add delay between batches
        if (i + batchSize < validItems.length) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      }

      // Remove backup on success
      try {
        localStorage.removeItem(backupKey)
      } catch (backupError) {
        console.warn('Failed to remove backup:', backupError)
      }

      // Show summary notification
      // Check if no items were saved successfully
      if (successCount === 0) {
        const totalErrors = errorCount + invalidItems.length
        let message = 'ไม่สามารถบันทึกข้อมูลได้'
        if (skippedCount > 0 && totalErrors === 0) {
          message = `ไม่สามารถบันทึกข้อมูลได้ (ข้ามข้อมูลซ้ำ ${skippedCount} รายการ)`
        } else if (totalErrors > 0) {
          message = `ไม่สามารถบันทึกข้อมูลได้ (ล้มเหลว ${totalErrors} รายการ${skippedCount > 0 ? `, ข้ามข้อมูลซ้ำ ${skippedCount} รายการ` : ''}) กรุณาตรวจสอบข้อมูลและลองอีกครั้ง`
        }
        notifications.show({
          title: 'ไม่สามารถบันทึกข้อมูลได้',
          message,
          color: 'red',
          icon: <TbAlertCircle size={16} />,
          autoClose: 15000,
        })

        // Show detailed error notification
        if (errors.length > 0 || invalidItems.length > 0) {
          console.error('Errors during bulk save:', { errors, invalidItems })
        }
      } else if (errorCount > 0 || invalidItems.length > 0 || skippedCount > 0) {
        const totalErrors = errorCount + invalidItems.length
        let message = `บันทึกสำเร็จ ${successCount} รายการ`
        if (totalErrors > 0) {
          message += `, ล้มเหลว ${totalErrors} รายการ`
        }
        if (skippedCount > 0) {
          message += `, ข้ามข้อมูลซ้ำ ${skippedCount} รายการ`
        }
        notifications.show({
          title: 'บันทึกข้อมูลเสร็จสิ้น',
          message,
          color: skippedCount > 0 && totalErrors === 0 ? 'blue' : 'yellow',
          icon: <TbAlertCircle size={16} />,
          autoClose: 10000,
        })

        // Show detailed error notification if there are errors
        if (errors.length > 0 || invalidItems.length > 0) {
          console.error('Errors during bulk save:', { errors, invalidItems })
        }
      } else {
        notifications.show({
          title: 'บันทึกข้อมูลสำเร็จ',
          message: `บันทึกสำเร็จ ${successCount} รายการ`,
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      }

      // Clear preview data and reset states only if all items succeeded
      if (errorCount === 0 && invalidItems.length === 0) {
        setPreviewData([])
        setDuplicateItems([])
        setIncompleteItems([])
        setSelectedTaxYear(null)
        setSelectedTaxMonth(null)
      } else {
        // Keep preview data if there are errors (user can retry)
        // Remove only successfully saved items
        const failedBuilds = new Set([
          ...errors.map((e) => e.build),
          ...invalidItems.map((e) => e.build),
        ])
        setPreviewData((prev) => prev.filter((item) => failedBuilds.has(item.build)))
      }

      // Invalidate queries to mark as stale (will refetch when needed)
      queryClient.invalidateQueries(['work-assignments'])
      // ไม่ต้อง refetch ทันที - ให้ React Query refetch เมื่อ component re-render หรือเมื่อ user action
    } catch (error: unknown) {
      console.error('Bulk save error:', error)

      // Check error type
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        notifications.show({
          title: 'การเชื่อมต่อขัดข้อง',
          message: 'ข้อมูลถูกบันทึกไว้ในระบบแล้ว กรุณารอสักครู่แล้วตรวจสอบผลลัพธ์',
          color: 'yellow',
          icon: <TbAlertCircle size={16} />,
          autoClose: 15000,
        })
      } else if (error.response?.status === 429) {
        notifications.show({
          title: 'การร้องขอมากเกินไป',
          message: 'กรุณารอสักครู่แล้วลองอีกครั้ง',
          color: 'orange',
          icon: <TbAlertCircle size={16} />,
          autoClose: 10000,
        })
      } else {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
          autoClose: 10000,
        })
      }
    } finally {
      setIsSaving(false)
      // Always invalidate queries in finally block to mark as stale
      // This ensures data will be refreshed when component re-renders or user actions
      queryClient.invalidateQueries(['work-assignments'])
      // ไม่ต้อง refetch ทันที - ให้ React Query refetch เมื่อ component re-render หรือเมื่อ user action
    }
  }

  // Set default month based on view mode (using tax month)
  useEffect(() => {
    if (formOpened && formMode === 'create') {
      if (viewMode === 'current') {
        const current = getCurrentTaxMonth()
        setFormYear(current.year)
        setFormMonth(current.month)
      } else {
        const next = getNextTaxMonth()
        setFormYear(next.year)
        setFormMonth(next.month)
      }
    }
  }, [viewMode, formOpened, formMode])

  // Set default previous tax month and initialize selectedCompanyStatuses when bulk create modal opens
  useEffect(() => {
    if (bulkCreateModalOpened) {
      // Initialize selectedCompanyStatuses with all options (except 'all') by default
      const allStatusesExceptAll = [
        'รายเดือน',
        'รายเดือน / วางมือ',
        'รายเดือน / จ่ายรายปี',
        'รายเดือน / เดือนสุดท้าย',
        'ยกเลิกทำ',
      ]
      setSelectedCompanyStatuses(allStatusesExceptAll)

      // Calculate default: ย้อนหลัง 1 เดือนจากเดือนภาษีปัจจุบัน
      const currentTaxMonth = getCurrentTaxMonth()
      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
      const prevYear = prevTaxMonthDate.getFullYear()
      const prevMonth = prevTaxMonthDate.getMonth() + 1

      // Only set if not already set (preserve user selection)
      if (selectedPreviousTaxYear === null) {
        setSelectedPreviousTaxYear(prevYear)
      }
      if (selectedPreviousTaxMonth === null) {
        setSelectedPreviousTaxMonth(prevMonth)
      }
    } else {
      // Reset when modal closes
      setSelectedPreviousTaxYear(null)
      setSelectedPreviousTaxMonth(null)
    }
  }, [bulkCreateModalOpened])

  // Client options
  const clientOptions =
    clientsData?.data?.map((client: Client) => ({
      value: client.build,
      label: `${client.build} - ${client.company_name}`,
    })) || []

  // Employee options (for old assignments display)
  const employeeOptions =
    employeesData?.employees?.map((emp: Employee) => ({
      value: emp.employee_id,
      label: `${emp.employee_id} - ${emp.full_name}`,
    })) || []

  // Helper function to deduplicate options by value
  // ใช้ Map เพื่อเก็บเฉพาะ value แรกที่เจอ (ป้องกัน duplicate)
  const deduplicateOptions = (options: Array<{ value: string; label: string }>) => {
    if (!options || options.length === 0) return []

    const seen = new Map<string, { value: string; label: string }>()
    for (const option of options) {
      // Skip invalid options
      if (!option || !option.value) continue

      // ใช้ value เป็น key เพื่อป้องกัน duplicate
      if (!seen.has(option.value)) {
        seen.set(option.value, option)
      }
    }
    return Array.from(seen.values())
  }

  // User options for accounting (service, data_entry_and_service)
  // ใช้ String() เพื่อแปลงค่าเป็น string และป้องกัน undefined/null
  const accountingUserOptions = deduplicateOptions(
    accountingUsersData?.data
      ?.filter((user: User) => user && (user.employee_id || user.id)) // Filter out invalid users
      .map((user: User) => {
        const value = String(user.employee_id || user.id)
        return {
          value,
          label: formatEmployeeName(user.name, user.nick_name),
        }
      }) || []
  )

  // User options for tax inspection (audit)
  const taxInspectionUserOptions = deduplicateOptions(
    taxInspectionUsersData?.data
      ?.filter((user: User) => user && (user.employee_id || user.id))
      .map((user: User) => {
        const value = String(user.employee_id || user.id)
        return {
          value,
          label: formatEmployeeName(user.name, user.nick_name),
        }
      }) || []
  )

  // User options for WHT/VAT filing (data_entry_and_service)
  const filingUserOptions = deduplicateOptions(
    filingUsersData?.data
      ?.filter((user: User) => user && (user.employee_id || user.id))
      .map((user: User) => {
        const value = String(user.employee_id || user.id)
        return {
          value,
          label: formatEmployeeName(user.name, user.nick_name),
        }
      }) || []
  )

  // User options for document entry (data_entry_and_service, data_entry)
  const documentEntryUserOptions = deduplicateOptions(
    documentEntryUsersData?.data
      ?.filter((user: User) => user && (user.employee_id || user.id))
      .map((user: User) => {
        const value = String(user.employee_id || user.id)
        return {
          value,
          label: formatEmployeeName(user.name, user.nick_name),
        }
      }) || []
  )

  /**
   * Calculate work assignment statistics by employee and VAT registration status
   * ใช้ข้อมูลจาก assignmentsData (ข้อมูลที่บันทึกแล้ว) แทน previewData
   */
  const calculateWorkStatistics = () => {
    interface EmployeeStats {
      employeeId: string
      employeeName: string
      role: string
      vatRegistered: number // จำนวนงานที่จดภาษีมูลค่าเพิ่ม
      notVatRegistered: number // จำนวนงานที่ยังไม่จดภาษีมูลค่าเพิ่ม
      nullVatStatus: number // จำนวนงานที่ไม่มีสถานะจดภาษีมูลค่าเพิ่ม
      total: number
    }

    const statsMap = new Map<string, EmployeeStats>()

    // Helper function to get employee name from employee ID
    const getEmployeeName = (employeeId: string | null, role: string): string => {
      if (!employeeId) return ''

      let options: Array<{ value: string; label: string }> = []
      switch (role) {
        case 'accounting':
          options = accountingUserOptions
          break
        case 'tax_inspection':
          options = taxInspectionUserOptions
          break
        case 'wht':
        case 'vat':
          options = filingUserOptions
          break
        case 'document_entry':
          options = documentEntryUserOptions
          break
      }

      return options.find((opt) => opt.value === employeeId)?.label || employeeId
    }

    // ใช้ข้อมูลจาก assignmentsData (ข้อมูลที่บันทึกแล้ว) แทน previewData
    const dataSource = assignmentsData?.data || []

    // Process each assignment from assignmentsData
    dataSource.forEach((assignment: WorkAssignmentType) => {
      const roles = [
        { key: 'accounting', employeeId: assignment.accounting_responsible },
        { key: 'tax_inspection', employeeId: assignment.tax_inspection_responsible },
        { key: 'wht', employeeId: assignment.wht_filer_responsible },
        { key: 'vat', employeeId: assignment.vat_filer_responsible },
        { key: 'document_entry', employeeId: assignment.document_entry_responsible },
      ]

      roles.forEach((role) => {
        if (role.employeeId) {
          const key = `${role.employeeId}_${role.key}`
          const employeeName = getEmployeeName(role.employeeId, role.key)

          if (!statsMap.has(key)) {
            statsMap.set(key, {
              employeeId: role.employeeId,
              employeeName,
              role: role.key,
              vatRegistered: 0,
              notVatRegistered: 0,
              nullVatStatus: 0,
              total: 0,
            })
          }

          const stats = statsMap.get(key)!

          // Categorize by VAT registration status from client data
          if (assignment.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') {
            stats.vatRegistered++
          } else if (assignment.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม') {
            stats.notVatRegistered++
          } else {
            stats.nullVatStatus++
          }
          stats.total++
        }
      })
    })

    return Array.from(statsMap.values()).sort((a, b) => {
      // Sort by employee name, then by role
      if (a.employeeName !== b.employeeName) {
        return a.employeeName.localeCompare(b.employeeName, 'th')
      }
      return a.role.localeCompare(b.role, 'th')
    })
  }

  const workStatistics = calculateWorkStatistics()

  // Filter previewData by responsible persons
  const filteredPreviewData = previewData.filter((item) => {
    // Filter by assignment status (จัดแล้ว/ยังไม่จัด)
    if (filterByAssignmentStatus === 'assigned' && !item.is_assigned) {
      return false // แสดงเฉพาะงานที่จัดแล้ว
    }
    if (filterByAssignmentStatus === 'unassigned' && item.is_assigned) {
      return false // แสดงเฉพาะงานที่ยังไม่จัด
    }
    // filterByAssignmentStatus === 'all' จะแสดงทั้งหมด

    // If no filters are set, show all
    if (!filterByAccounting && !filterByTaxInspection && !filterByWht && !filterByVat && !filterByDocumentEntry) {
      return true
    }

    // Check each filter
    const matchesAccounting = !filterByAccounting || item.new_accounting_responsible === filterByAccounting
    const matchesTaxInspection = !filterByTaxInspection || item.new_tax_inspection_responsible === filterByTaxInspection
    const matchesWht = !filterByWht || item.new_wht_filer_responsible === filterByWht
    const matchesVat = !filterByVat || item.new_vat_filer_responsible === filterByVat
    const matchesDocumentEntry = !filterByDocumentEntry || item.new_document_entry_responsible === filterByDocumentEntry

    // Show item if it matches at least one active filter (OR logic)
    // Or if all active filters match (AND logic) - using AND for more precise filtering
    const activeFilters = [
      filterByAccounting,
      filterByTaxInspection,
      filterByWht,
      filterByVat,
      filterByDocumentEntry,
    ].filter(Boolean)

    if (activeFilters.length === 0) return true

    // AND logic: all active filters must match
    return (
      (!filterByAccounting || matchesAccounting) &&
      (!filterByTaxInspection || matchesTaxInspection) &&
      (!filterByWht || matchesWht) &&
      (!filterByVat || matchesVat) &&
      (!filterByDocumentEntry || matchesDocumentEntry)
    )
  })

  /**
   * Calculate work assignment statistics from Preview Data (for Preview section)
   * ใช้ข้อมูลจาก filteredPreviewData เพื่อให้ตรงกับตารางที่แสดง
   */
  const calculatePreviewWorkStatistics = () => {
    interface EmployeeStats {
      employeeId: string
      employeeName: string
      role: string
      vatRegistered: number
      notVatRegistered: number
      nullVatStatus: number
      total: number
    }

    const statsMap = new Map<string, EmployeeStats>()

    // Helper function to get employee name from employee ID
    const getEmployeeName = (employeeId: string | null, role: string): string => {
      if (!employeeId) return ''

      let options: Array<{ value: string; label: string }> = []
      switch (role) {
        case 'accounting':
          options = accountingUserOptions
          break
        case 'tax_inspection':
          options = taxInspectionUserOptions
          break
        case 'wht':
        case 'vat':
          options = filingUserOptions
          break
        case 'document_entry':
          options = documentEntryUserOptions
          break
      }

      return options.find((opt) => opt.value === employeeId)?.label || employeeId
    }

    // ใช้ข้อมูลจาก filteredPreviewData เพื่อให้ตรงกับตารางที่แสดง
    filteredPreviewData.forEach((item) => {
      const roles = [
        { key: 'accounting', employeeId: item.new_accounting_responsible },
        { key: 'tax_inspection', employeeId: item.new_tax_inspection_responsible },
        { key: 'wht', employeeId: item.new_wht_filer_responsible },
        { key: 'vat', employeeId: item.new_vat_filer_responsible },
        { key: 'document_entry', employeeId: item.new_document_entry_responsible },
      ]

      roles.forEach((role) => {
        if (role.employeeId) {
          const key = `${role.employeeId}_${role.key}`
          const employeeName = getEmployeeName(role.employeeId, role.key)

          if (!statsMap.has(key)) {
            statsMap.set(key, {
              employeeId: role.employeeId,
              employeeName,
              role: role.key,
              vatRegistered: 0,
              notVatRegistered: 0,
              nullVatStatus: 0,
              total: 0,
            })
          }

          const stats = statsMap.get(key)!

          // Categorize by VAT registration status
          if (item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') {
            stats.vatRegistered++
          } else if (item.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม') {
            stats.notVatRegistered++
          } else {
            stats.nullVatStatus++
          }
          stats.total++
        }
      })
    })

    return Array.from(statsMap.values()).sort((a, b) => {
      // Sort by employee name, then by role
      if (a.employeeName !== b.employeeName) {
        return a.employeeName.localeCompare(b.employeeName, 'th')
      }
      return a.role.localeCompare(b.role, 'th')
    })
  }

  const previewWorkStatistics = calculatePreviewWorkStatistics()

  // Calculate statistics grouped by role
  const calculateWorkStatisticsByRole = () => {
    interface RoleStats {
      role: string
      roleLabel: string
      employees: Array<{
        employeeId: string
        employeeName: string
        vatRegistered: number
        notVatRegistered: number
        total: number
      }>
      totalEmployees: number
      totalVatRegistered: number
      totalNotVatRegistered: number
      grandTotal: number
    }

    const roleMap = new Map<string, RoleStats>()

    // Initialize role map
    const roleConfigs = [
      { key: 'accounting', label: 'ทำบัญชี' },
      { key: 'tax_inspection', label: 'ตรวจภาษี' },
      { key: 'wht', label: 'ยื่น WHT' },
      { key: 'vat', label: 'ยื่น VAT' },
      { key: 'document_entry', label: 'คีย์เอกสาร' },
    ]

    roleConfigs.forEach((config) => {
      roleMap.set(config.key, {
        role: config.key,
        roleLabel: config.label,
        employees: [],
        totalEmployees: 0,
        totalVatRegistered: 0,
        totalNotVatRegistered: 0,
        grandTotal: 0,
      })
    })

    // Group workStatistics by role
    workStatistics.forEach((stat) => {
      const roleStat = roleMap.get(stat.role)
      if (roleStat) {
        // Check if employee already exists in this role
        const existingEmployee = roleStat.employees.find(
          (emp) => emp.employeeId === stat.employeeId
        )

        if (existingEmployee) {
          // Update existing employee stats
          existingEmployee.vatRegistered += stat.vatRegistered
          existingEmployee.notVatRegistered += stat.notVatRegistered
          existingEmployee.total += stat.total
        } else {
          // Add new employee
          roleStat.employees.push({
            employeeId: stat.employeeId,
            employeeName: stat.employeeName,
            vatRegistered: stat.vatRegistered,
            notVatRegistered: stat.notVatRegistered,
            total: stat.total,
          })
        }

        // Update role totals
        roleStat.totalVatRegistered += stat.vatRegistered
        roleStat.totalNotVatRegistered += stat.notVatRegistered
        roleStat.grandTotal += stat.total
      }
    })

    // Calculate total employees for each role
    roleMap.forEach((roleStat) => {
      roleStat.totalEmployees = roleStat.employees.length
      // Sort employees by total work (descending)
      roleStat.employees.sort((a, b) => b.total - a.total)
    })

    // Return only roles that have employees
    return Array.from(roleMap.values()).filter((roleStat) => roleStat.totalEmployees > 0)
  }

  const workStatisticsByRole = calculateWorkStatisticsByRole()

  /**
   * Calculate Preview Work Statistics grouped by role (for Preview section)
   * ใช้ข้อมูลจาก previewWorkStatistics แทน workStatistics
   */
  const calculatePreviewWorkStatisticsByRole = () => {
    interface RoleStats {
      role: string
      roleLabel: string
      employees: Array<{
        employeeId: string
        employeeName: string
        vatRegistered: number
        notVatRegistered: number
        total: number
      }>
      totalEmployees: number
      totalVatRegistered: number
      totalNotVatRegistered: number
      grandTotal: number
    }

    const roleMap = new Map<string, RoleStats>()

    // Initialize role map
    const roleConfigs = [
      { key: 'accounting', label: 'ทำบัญชี' },
      { key: 'tax_inspection', label: 'ตรวจภาษี' },
      { key: 'wht', label: 'ยื่น WHT' },
      { key: 'vat', label: 'ยื่น VAT' },
      { key: 'document_entry', label: 'คีย์เอกสาร' },
    ]

    roleConfigs.forEach((config) => {
      roleMap.set(config.key, {
        role: config.key,
        roleLabel: config.label,
        employees: [],
        totalEmployees: 0,
        totalVatRegistered: 0,
        totalNotVatRegistered: 0,
        grandTotal: 0,
      })
    })

    // Group previewWorkStatistics by role
    previewWorkStatistics.forEach((stat) => {
      const roleStat = roleMap.get(stat.role)
      if (roleStat) {
        // Check if employee already exists in this role
        const existingEmployee = roleStat.employees.find(
          (emp) => emp.employeeId === stat.employeeId
        )

        if (existingEmployee) {
          // Update existing employee stats
          existingEmployee.vatRegistered += stat.vatRegistered
          existingEmployee.notVatRegistered += stat.notVatRegistered
          existingEmployee.total += stat.total
        } else {
          // Add new employee
          roleStat.employees.push({
            employeeId: stat.employeeId,
            employeeName: stat.employeeName,
            vatRegistered: stat.vatRegistered,
            notVatRegistered: stat.notVatRegistered,
            total: stat.total,
          })
        }

        // Update role totals
        roleStat.totalVatRegistered += stat.vatRegistered
        roleStat.totalNotVatRegistered += stat.notVatRegistered
        roleStat.grandTotal += stat.total
      }
    })

    // Calculate total employees for each role
    roleMap.forEach((roleStat) => {
      roleStat.totalEmployees = roleStat.employees.length
      // Sort employees by total work (descending)
      roleStat.employees.sort((a, b) => b.total - a.total)
    })

    // Return only roles that have employees
    return Array.from(roleMap.values()).filter((roleStat) => roleStat.totalEmployees > 0)
  }

  const previewWorkStatisticsByRole = calculatePreviewWorkStatisticsByRole()

  // Function to search for employee and show their work assignments
  const getEmployeeWorkAssignments = (employeeId: string | null) => {
    if (!employeeId) return []

    interface EmployeeWork {
      role: string
      roleLabel: string
      build: string
      companyName: string
      taxRegistrationStatus: string | null
      companyStatus: string
    }

    const assignments: EmployeeWork[] = []

    // ใช้ filteredPreviewData เพื่อให้ตรงกับตารางที่แสดง
    filteredPreviewData.forEach((item) => {
      const roles = [
        { key: 'accounting', employeeId: item.new_accounting_responsible, label: 'ทำบัญชี' },
        { key: 'tax_inspection', employeeId: item.new_tax_inspection_responsible, label: 'ตรวจภาษี' },
        { key: 'wht', employeeId: item.new_wht_filer_responsible, label: 'ยื่น WHT' },
        { key: 'vat', employeeId: item.new_vat_filer_responsible, label: 'ยื่น VAT' },
        { key: 'document_entry', employeeId: item.new_document_entry_responsible, label: 'คีย์เอกสาร' },
      ]

      roles.forEach((role) => {
        if (role.employeeId === employeeId) {
          assignments.push({
            role: role.key,
            roleLabel: role.label,
            build: item.build,
            companyName: item.company_name,
            taxRegistrationStatus: item.tax_registration_status,
            companyStatus: item.company_status,
          })
        }
      })
    })

    return assignments
  }

  // Get all unique employees for search dropdown
  const getAllEmployees = () => {
    const employeeMap = new Map<string, { id: string; name: string }>()

    workStatistics.forEach((stat) => {
      if (!employeeMap.has(stat.employeeId)) {
        employeeMap.set(stat.employeeId, {
          id: stat.employeeId,
          name: stat.employeeName,
        })
      }
    })

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'th')
    )
  }

  const allEmployees = getAllEmployees()
  const employeeWorkAssignments = selectedEmployeeId
    ? getEmployeeWorkAssignments(selectedEmployeeId)
    : []

  if (!isAdmin) {
    return (
      <Box px="md" py="md">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="ไม่มีสิทธิ์เข้าถึง">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      style={{
        marginLeft: 'calc(var(--mantine-spacing-md) * -1)',
        marginRight: 'calc(var(--mantine-spacing-md) * -1)',
        marginTop: 'calc(var(--mantine-spacing-md) * -1)',
        marginBottom: 'calc(var(--mantine-spacing-md) * -1)',
        paddingLeft: 'var(--mantine-spacing-md)',
        paddingRight: 'var(--mantine-spacing-md)',
        paddingTop: 'var(--mantine-spacing-md)',
        paddingBottom: 'var(--mantine-spacing-md)',
      }}
    >
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>จัดงานรายเดือน</Title>
          <Group gap="sm">
            <Button
              variant="outline"
              color="orange"
              onClick={() => setViewMode('current')}
              radius="lg"
              style={{
                backgroundColor: 'white',
                color: 'black',
                borderColor: 'var(--mantine-color-orange-6)',
                borderWidth: '1px',
              }}
            >
              เดือนภาษีปัจจุบัน ({getCurrentTaxMonth().year}/{getCurrentTaxMonth().month})
            </Button>
            <Button
              variant="outline"
              color="orange"
              onClick={() => setViewMode('next')}
              radius="lg"
              style={{
                backgroundColor: 'white',
                color: 'black',
                borderColor: 'var(--mantine-color-orange-6)',
                borderWidth: '1px',
              }}
            >
              เดือนภาษีถัดไป ({getNextTaxMonth().year}/{getNextTaxMonth().month})
            </Button>
            <Button
              leftSection={<TbPlus size={18} />}
              radius="lg"
              variant="outline"
              color="orange"
              onClick={handleAdd}
              style={{
                backgroundColor: 'white',
                color: 'black',
                borderColor: 'var(--mantine-color-orange-6)',
                borderWidth: '1px',
              }}
            >
              สร้างการจัดงานใหม่
            </Button>
            <Button
              leftSection={<TbUpload size={18} />}
              radius="lg"
              variant="outline"
              color="orange"
              onClick={() => setImportModalOpened(true)}
              style={{
                backgroundColor: 'white',
                color: 'black',
                borderColor: 'var(--mantine-color-orange-6)',
                borderWidth: '1px',
              }}
            >
              นำเข้าจาก Excel
            </Button>
            {/* Toggle Previous Columns Button */}
            <Tooltip label={showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}>
              <Button
                leftSection={showPreviousColumns ? <TbEyeOff size={18} /> : <TbEye size={18} />}
                radius="lg"
                variant="outline"
                color="gray"
                onClick={toggleAllPreviousColumns}
                style={{
                  backgroundColor: showPreviousColumns ? '#f0f0f0' : 'white',
                  color: 'black',
                  borderColor: showPreviousColumns ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-gray-4)',
                  borderWidth: '1px',
                }}
              >
                {showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {/* Current View Info */}
        <Card
          withBorder
          radius="lg"
          p="md"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--mantine-color-orange-6)',
            borderWidth: '1px',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Text size="sm" fw={500} c="black">
                กำลังแสดงข้อมูลเดือนภาษี:
              </Text>
              <Badge
                size="lg"
                variant="outline"
                color="orange"
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: 'var(--mantine-color-orange-6)',
                }}
              >
                {(() => {
                  const viewMonth = getViewMonth()
                  const displayYear = year || viewMonth.year
                  const displayMonth = month || viewMonth.month
                  const monthName = THAI_MONTHS.find((m) => m.value === displayMonth.toString())?.label || displayMonth
                  return `${monthName} ${displayYear}`
                })()}
              </Badge>
            </Group>
            <Text size="xs" c="black">
              {assignmentsData?.pagination?.total || 0} รายการ
            </Text>
          </Group>
        </Card>

        {/* Filters */}
        <Card withBorder radius="lg" p="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500} c="black">
                กรองข้อมูล
              </Text>
              <Button
                leftSection={<TbRefresh size={18} />}
                variant="outline"
                color="orange"
                onClick={handleRefresh}
                loading={isRefetching}
                radius="lg"
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: 'var(--mantine-color-orange-6)',
                  borderWidth: '1px',
                }}
              >
                รีเฟรซข้อมูล
              </Button>
            </Group>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>
                    ค้นหา
                  </Text>
                  <TextInput
                    placeholder="ค้นหา..."
                    leftSection={<TbSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    radius="lg"
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>
                    เลือกลูกค้า
                  </Text>
                  <Select
                    placeholder="เลือกลูกค้า"
                    data={clientOptions}
                    value={build}
                    onChange={(value) => setBuild(value || '')}
                    clearable
                    radius="lg"
                    searchable
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>
                    ปี
                  </Text>
                  <NumberInput
                    placeholder="ปี"
                    value={year ? parseInt(year) : undefined}
                    onChange={(value) => setYear(value ? value.toString() : null)}
                    min={2020}
                    max={2100}
                    radius="lg"
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>
                    เดือน
                  </Text>
                  <Select
                    placeholder="เลือกเดือน"
                    data={monthOptions}
                    value={month}
                    onChange={setMonth}
                    clearable
                    radius="lg"
                  />
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Table */}
        <Card withBorder radius="lg" p="md">
          {(isLoading || isRefetching) ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text size="sm" c="dimmed">
                  {isRefetching ? 'กำลังรีเฟรซข้อมูล...' : 'กำลังโหลดข้อมูล...'}
                </Text>
              </Stack>
            </Center>
          ) : error ? (
            <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
              <Stack gap="xs">
                <Text size="sm">ไม่สามารถโหลดข้อมูลได้</Text>
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<TbRefresh size={16} />}
                  onClick={handleRefresh}
                  mt="xs"
                >
                  ลองใหม่
                </Button>
              </Stack>
            </Alert>
          ) : assignmentsData?.data.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="lg" fw={500}>
                  ไม่พบข้อมูลการจัดงาน
                </Text>
                <Text c="dimmed" size="sm">
                  เดือนภาษีที่กำลังค้นหา:{' '}
                  {(() => {
                    const viewMonth = getViewMonth()
                    const displayYear = year || viewMonth.year
                    const displayMonth = month || viewMonth.month
                    const monthName = THAI_MONTHS.find((m) => m.value === displayMonth.toString())?.label || displayMonth
                    return `${monthName} ${displayYear}`
                  })()}
                </Text>
                {year || month ? (
                  <>
                    <Text c="dimmed" size="xs" mt="xs">
                      (กรองตาม: {year ? `ปี ${year}` : ''} {month ? `เดือน ${THAI_MONTHS.find((m) => m.value === month)?.label || month}` : ''})
                    </Text>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => {
                        setYear(null)
                        setMonth(null)
                        setBuild('')
                        setSearch('')
                      }}
                      mt="md"
                    >
                      ล้าง Filter เพื่อดูข้อมูลทั้งหมด
                    </Button>
                  </>
                ) : (
                  <Text c="dimmed" size="xs" mt="xs">
                    💡 ลองเปลี่ยนปีหรือเดือนใน Filter หรือเลือก "เดือนภาษีถัดไป" เพื่อดูข้อมูล
                  </Text>
                )}
              </Stack>
            </Center>
          ) : (
            <>
              <Table.ScrollContainer minWidth={1200}>
                <Table
                  highlightOnHover
                  style={{
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                  }}
                  styles={{
                    th: {
                      border: 'none !important',
                    },
                    td: {
                      border: 'none !important',
                    },
                  }}
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        Build
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        บริษัท
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        เดือน/ปี
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        ทำบัญชี
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        ตรวจภาษี
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        ยื่น WHT
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        ยื่น VAT
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        คีย์เอกสาร
                      </Table.Th>
                      <Table.Th
                        style={{
                          backgroundColor: 'white',
                          color: 'black',
                          border: 'none',
                        }}
                      >
                        จัดการ
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {assignmentsData?.data.map((assignment) => (
                      <Table.Tr key={assignment.id}>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text fw={500} c="black">{assignment.build}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{assignment.company_name || '-'}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Badge
                            variant="outline"
                            color="orange"
                            size="sm"
                            style={{
                              backgroundColor: 'white',
                              color: 'black',
                              borderColor: 'var(--mantine-color-orange-6)',
                            }}
                          >
                            {THAI_MONTHS.find((m) => m.value === assignment.assignment_month.toString())?.label || assignment.assignment_month} {assignment.assignment_year}
                          </Badge>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.accounting_responsible_name, assignment.accounting_responsible)}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.tax_inspection_responsible_name, assignment.tax_inspection_responsible)}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.wht_filer_responsible_name, assignment.wht_filer_responsible)}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.vat_filer_responsible_name, assignment.vat_filer_responsible)}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.document_entry_responsible_name, assignment.document_entry_responsible)}</Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                          }}
                        >
                          <Group gap="xs">
                            <Tooltip label="แก้ไข">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => handleEdit(assignment)}
                              >
                                <TbEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            {!assignment.is_reset_completed && (
                              <Tooltip label="รีเซ็ตข้อมูล">
                                <ActionIcon
                                  variant="subtle"
                                  color="orange"
                                  onClick={() => handleReset(assignment)}
                                >
                                  <TbRefresh size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {/* Pagination */}
              {assignmentsData?.pagination.totalPages && assignmentsData.pagination.totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={assignmentsData.pagination.totalPages}
                    radius="lg"
                  />
                </Group>
              )}
            </>
          )}
        </Card>

        {/* Create/Edit Form Modal */}
        <Modal
          opened={formOpened}
          onClose={() => {
            setFormOpened(false)
            resetForm()
          }}
          title={formMode === 'create' ? 'สร้างการจัดงานใหม่' : 'แก้ไขการจัดงาน'}
          size="xl"
          radius="lg"
        >
          <Stack gap="md">
            {/* Company Status Filter */}
            <Select
              label="กรองตามสถานะบริษัท"
              placeholder="เลือกสถานะบริษัท"
              data={companyStatusOptions}
              value={companyStatusFilter}
              onChange={(value) => setCompanyStatusFilter(value || 'all')}
              clearable={false}
            />
            <Select
              label="ลูกค้า (Build)"
              placeholder="เลือกลูกค้า"
              data={clientOptions}
              value={formBuild}
              onChange={(value) => setFormBuild(value || '')}
              required
              searchable
              disabled={formMode === 'edit'}
              description={
                companyStatusFilter !== 'all'
                  ? `แสดงเฉพาะบริษัทที่มีสถานะ: ${companyStatusOptions.find((opt) => opt.value === companyStatusFilter)?.label}`
                  : 'แสดงบริษัททั้งหมด'
              }
            />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="ปี"
                  value={formYear}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) : new Date().getFullYear())
                    setFormYear(isNaN(numValue) ? new Date().getFullYear() : numValue)
                  }}
                  min={2020}
                  max={2100}
                  required
                  disabled={formMode === 'edit'}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="เดือน"
                  placeholder="เลือกเดือน"
                  data={monthOptions}
                  value={formMonth.toString()}
                  onChange={(value) => setFormMonth(value ? parseInt(value) : 1)}
                  required
                  disabled={formMode === 'edit'}
                />
              </Grid.Col>
            </Grid>
            {formMode === 'create' && (
              <Group gap="sm">
                <Button
                  variant={viewMode === 'current' ? 'filled' : 'light'}
                  color="orange"
                  size="sm"
                  onClick={() => {
                    const current = getCurrentTaxMonth()
                    setFormYear(current.year)
                    setFormMonth(current.month)
                    setViewMode('current')
                  }}
                >
                  ใช้เดือนภาษีปัจจุบัน ({getCurrentTaxMonth().year}/{getCurrentTaxMonth().month})
                </Button>
                <Button
                  variant={viewMode === 'next' ? 'filled' : 'light'}
                  color="blue"
                  size="sm"
                  onClick={() => {
                    const next = getNextTaxMonth()
                    setFormYear(next.year)
                    setFormMonth(next.month)
                    setViewMode('next')
                  }}
                >
                  ใช้เดือนภาษีถัดไป ({getNextTaxMonth().year}/{getNextTaxMonth().month})
                </Button>
              </Group>
            )}
            {formMode === 'create' && (
              <Text size="xs" c="dimmed">
                💡 เดือนภาษีจะนับย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน
                <br />
                ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีจะเป็น ธันวาคม 2025
              </Text>
            )}
            <Select
              label="ผู้ทำบัญชี"
              placeholder="เลือกผู้ทำบัญชี"
              data={accountingUserOptions}
              value={formAccountingResponsible}
              onChange={setFormAccountingResponsible}
              clearable
              searchable
              description="เลือกจาก role: service, data_entry_and_service"
            />
            <Select
              label="ผู้ตรวจภาษี"
              placeholder="เลือกผู้ตรวจภาษี"
              data={taxInspectionUserOptions}
              value={formTaxInspectionResponsible}
              onChange={setFormTaxInspectionResponsible}
              clearable
              searchable
              description="เลือกจาก role: audit"
            />
            <Select
              label="ผู้ยื่น WHT"
              placeholder="เลือกผู้ยื่น WHT"
              data={filingUserOptions}
              value={formWhtFilerResponsible}
              onChange={setFormWhtFilerResponsible}
              clearable
              searchable
              description="เลือกจาก role: data_entry_and_service"
            />
            <Select
              label="ผู้ยื่น VAT"
              placeholder="เลือกผู้ยื่น VAT"
              data={filingUserOptions}
              value={formVatFilerResponsible}
              onChange={setFormVatFilerResponsible}
              clearable
              searchable
              description="เลือกจาก role: data_entry_and_service"
            />
            <Select
              label="ผู้คีย์เอกสาร"
              placeholder="เลือกผู้คีย์เอกสาร"
              data={documentEntryUserOptions}
              value={formDocumentEntryResponsible}
              onChange={setFormDocumentEntryResponsible}
              clearable
              searchable
              description="เลือกจาก role: data_entry_and_service, data_entry"
            />
            <Textarea
              label="หมายเหตุ"
              placeholder="หมายเหตุการจัดงาน"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={3}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setFormOpened(false)
                  resetForm()
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleFormSubmit}
                loading={createMutation.isLoading || updateMutation.isLoading}
                radius="lg"
              >
                {formMode === 'create' ? 'สร้าง' : 'บันทึก'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Reset Confirmation Modal */}
        <Modal
          opened={resetConfirmOpened}
          onClose={() => {
            setResetConfirmOpened(false)
            setSelectedAssignment(null)
          }}
          title="ยืนยันการรีเซ็ตข้อมูล"
          radius="lg"
        >
          <Stack gap="md">
            <Alert icon={<TbAlertCircle size={16} />} color="orange">
              คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูล monthly_tax_data และ document_entry_work
              สำหรับการจัดงานนี้?
            </Alert>
            {selectedAssignment && (
              <Text size="sm" c="dimmed">
                Build: {selectedAssignment.build} | เดือน/ปี:{' '}
                {selectedAssignment.assignment_year}/{selectedAssignment.assignment_month}
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setResetConfirmOpened(false)
                  setSelectedAssignment(null)
                }}
              >
                ยกเลิก
              </Button>
              <Button
                color="orange"
                onClick={confirmReset}
                loading={resetMutation.isLoading}
                radius="lg"
              >
                ยืนยันรีเซ็ต
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Target Tax Month Selection Modal - ต้องถามก่อนเลือกสถานะบริษัท */}
        <Modal
          opened={targetTaxYearModalOpened}
          onClose={() => {
            if (!isLoadingPreview) {
              setTargetTaxYearModalOpened(false)
            }
          }}
          title="เลือกเดือนภาษีที่จะบันทึก"
          size="md"
          radius="lg"
          closeOnClickOutside={!isLoadingPreview}
          closeOnEscape={!isLoadingPreview}
          withCloseButton={!isLoadingPreview}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              กรุณาเลือกเดือนภาษีที่ต้องการจัดงาน (ข้อมูลจะถูกบันทึกสำหรับเดือนภาษีนี้)
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="ปี (พ.ศ.) *"
                  value={targetTaxYear || getCurrentTaxMonth().year}
                  onChange={(value) => setTargetTaxYear(typeof value === 'number' ? value : parseInt(value) || null)}
                  min={2000}
                  max={2100}
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="เดือน *"
                  placeholder="เลือกเดือน"
                  value={targetTaxMonth?.toString() || getCurrentTaxMonth().month.toString()}
                  onChange={(value) => setTargetTaxMonth(value ? parseInt(value) : null)}
                  data={THAI_MONTHS}
                  required
                  searchable
                />
              </Grid.Col>
            </Grid>
            <Alert
              color="orange"
              variant="outline"
              icon={<TbAlertCircle size={16} />}
              style={{
                backgroundColor: '#fff',
                borderColor: '#ff6b35',
                color: '#ff6b35',
              }}
            >
              <Text size="sm" style={{ color: '#ff6b35' }}>
                ข้อมูลจะถูกบันทึกสำหรับเดือนภาษี: {targetTaxYear && targetTaxMonth ? `${THAI_MONTHS.find((m) => m.value === targetTaxMonth.toString())?.label} ${targetTaxYear}` : '-'}
              </Text>
            </Alert>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setTargetTaxYearModalOpened(false)} disabled={isLoadingPreview}>
                ยกเลิก
              </Button>
              <Button
                variant="outline"
                color="orange"
                disabled={!targetTaxYear || !targetTaxMonth || isLoadingPreview}
                onClick={() => {
                  if (targetTaxYear && targetTaxMonth) {
                    setTargetTaxYearModalOpened(false)
                    // เปิด Modal เลือกสถานะบริษัทต่อ
                    setBulkCreateModalOpened(true)
                    setSelectedCompanyStatuses([])
                    setPreviewData([])
                  }
                }}
                style={{
                  backgroundColor: '#fff',
                  borderColor: '#ff6b35',
                  color: '#ff6b35',
                }}
              >
                ดำเนินการต่อ
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Bulk Create Modal - Select Company Status */}
        <Modal
          opened={bulkCreateModalOpened}
          onClose={() => {
            // ป้องกันการปิด Modal เมื่อกำลังโหลด
            if (!isLoadingPreview) {
              setBulkCreateModalOpened(false)
              // Reset to all selected when closing (will be set again when modal opens)
              setSelectedCompanyStatuses([])
            }
          }}
          title="เลือกสถานะบริษัทสำหรับการจัดงาน"
          size="md"
          radius="lg"
          closeOnClickOutside={!isLoadingPreview}
          closeOnEscape={!isLoadingPreview}
          withCloseButton={!isLoadingPreview}
        >
          <Stack gap="md">
            <div>
              <Text size="sm" fw={500} mb="xs">
                สถานะบริษัท (สามารถเลือกได้หลายรายการ)
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                เลือกสถานะบริษัทที่ต้องการดึงข้อมูล (สามารถเลือกได้หลายรายการ)
              </Text>
              <Stack gap="xs">
                {companyStatusOptions.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={selectedCompanyStatuses.includes(option.value)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        // Add to selection
                        setSelectedCompanyStatuses([...selectedCompanyStatuses, option.value])
                      } else {
                        // Remove from selection
                        setSelectedCompanyStatuses(
                          selectedCompanyStatuses.filter((status) => status !== option.value)
                        )
                      }
                    }}
                  />
                ))}
              </Stack>
            </div>

            {/* Quick Select Buttons */}
            <Group gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                เลือกด่วน:
              </Text>
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  const allStatusesExceptAll = companyStatusOptions
                    .filter((opt) => opt.value !== 'all')
                    .map((opt) => opt.value)
                  setSelectedCompanyStatuses(allStatusesExceptAll)
                }}
              >
                เลือกทั้งหมด
              </Button>
              <Button
                variant="light"
                size="xs"
                onClick={() =>
                  setSelectedCompanyStatuses([
                    'รายเดือน',
                    'รายเดือน / วางมือ',
                    'รายเดือน / จ่ายรายปี',
                    'รายเดือน / เดือนสุดท้าย',
                  ])
                }
              >
                รายเดือนทั้งหมด
              </Button>
              <Button
                variant="light"
                size="xs"
                onClick={() => setSelectedCompanyStatuses([])}
              >
                ล้างทั้งหมด
              </Button>
            </Group>

            {/* Selected Statuses Display */}
            {selectedCompanyStatuses.length > 0 && (
              <Alert
                color="orange"
                variant="outline"
                title="สถานะที่เลือก"
                style={{
                  backgroundColor: '#fff',
                  borderColor: '#ff6b35',
                  color: '#ff6b35',
                }}
              >
                <Group gap="xs" wrap="wrap">
                  {selectedCompanyStatuses.map((status) => (
                    <Badge
                      key={status}
                      color="orange"
                      variant="outline"
                      style={{
                        backgroundColor: '#fff',
                        borderColor: '#ff6b35',
                        color: '#ff6b35',
                      }}
                    >
                      {companyStatusOptions.find((opt) => opt.value === status)?.label || status}
                    </Badge>
                  ))}
                </Group>
              </Alert>
            )}

            {/* Previous Tax Month Selection */}
            <Divider label="เลือกเดือนภาษีที่ต้องการดึงข้อมูลเดิม" labelPosition="center" />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="ปี (พ.ศ.)"
                  value={selectedPreviousTaxYear || (() => {
                    const currentTaxMonth = getCurrentTaxMonth()
                    const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                    return prevTaxMonthDate.getFullYear()
                  })()}
                  onChange={(value) => setSelectedPreviousTaxYear(typeof value === 'number' ? value : parseInt(value) || null)}
                  min={2000}
                  max={2100}
                  required
                  description="เลือกปีภาษีที่ต้องการดึงข้อมูลเดิม"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="เดือน"
                  placeholder="เลือกเดือน"
                  value={selectedPreviousTaxMonth?.toString() || (() => {
                    const currentTaxMonth = getCurrentTaxMonth()
                    const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                    return (prevTaxMonthDate.getMonth() + 1).toString()
                  })()}
                  onChange={(value) => setSelectedPreviousTaxMonth(value ? parseInt(value) : null)}
                  data={THAI_MONTHS}
                  required
                  searchable
                  description="เลือกเดือนภาษีที่ต้องการดึงข้อมูลเดิม"
                />
              </Grid.Col>
            </Grid>
            <Alert
              color="orange"
              icon={<TbAlertCircle size={16} />}
              style={{
                backgroundColor: 'var(--mantine-color-orange-0)',
              }}
            >
              <Text size="sm" c="orange">
                ระบบจะดึงข้อมูลการจัดงานจากเดือนภาษีที่เลือกมาแสดงเป็นข้อมูล "เดิม"
                {selectedPreviousTaxYear && selectedPreviousTaxMonth && (
                  <Text component="span" fw={500} c="orange" ml={4}>
                    ({THAI_MONTHS.find((m) => m.value === selectedPreviousTaxMonth.toString())?.label} {selectedPreviousTaxYear})
                  </Text>
                )}
              </Text>
            </Alert>

            {/* Loading Progress - แสดงผลเหมือนภาพตัวอย่าง */}
            {isLoadingPreview && (
              <Alert
                color="blue"
                title={
                  <Text size="md" fw={600} c="blue">
                    กำลังโหลดข้อมูล....
                  </Text>
                }
                styles={{
                  root: {
                    backgroundColor: '#e3f2fd',
                    borderLeft: '4px solid #2196f3',
                  },
                  title: {
                    marginBottom: 12,
                  },
                }}
              >
                <Stack gap="md">
                  {loadingProgress.total > 0 ? (
                    <>
                      <Progress
                        value={Math.min((loadingProgress.current / loadingProgress.total) * 100, 100)}
                        size="lg"
                        radius="xl"
                        color="orange"
                        animated
                        styles={{
                          root: {
                            height: 8,
                          },
                        }}
                      />
                      <Text size="sm" c="dimmed" ta="center" fw={500}>
                        กำลังโหลด... {loadingProgress.current} / {loadingProgress.total} รายการ
                        {loadingProgress.current > 0 && loadingProgress.total > 0 && (
                          <Text component="span" c="orange" fw={700} ml={4}>
                            ({Math.round((loadingProgress.current / loadingProgress.total) * 100)}%)
                          </Text>
                        )}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Progress
                        value={0}
                        size="lg"
                        radius="xl"
                        color="orange"
                        animated
                        styles={{
                          root: {
                            height: 8,
                          },
                        }}
                      />
                      <Text size="sm" c="dimmed" ta="center" fw={500}>
                        กำลังเตรียมข้อมูล...
                      </Text>
                    </>
                  )}
                  <Text size="xs" c="dimmed" ta="center">
                    กรุณารอสักครู่... ระบบกำลังดึงข้อมูลจากเดือนก่อนหน้า
                  </Text>
                </Stack>
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  if (!isLoadingPreview) {
                    setBulkCreateModalOpened(false)
                    setSelectedCompanyStatuses([])
                  }
                }}
                disabled={isLoadingPreview}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleBulkCreateConfirm}
                color="orange"
                loading={isLoadingPreview}
                disabled={selectedCompanyStatuses.length === 0 || isLoadingPreview}
              >
                {isLoadingPreview
                  ? `กำลังโหลด... ${loadingProgress.current}/${loadingProgress.total}`
                  : `ดึงข้อมูล (${selectedCompanyStatuses.length > 0 ? selectedCompanyStatuses.length : 0} รายการ)`}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Preview Table - Display in page instead of Modal */}
        {previewData.length > 0 && (
          <Card withBorder radius="lg" p="md">
            <Stack gap="md">
              {/* Display information about which month's data is being shown */}
              <Alert
                color="orange"
                icon={<TbAlertCircle size={16} />}
                style={{
                  backgroundColor: 'var(--mantine-color-orange-0)',
                }}
              >
                <Group gap="xs" align="center" wrap="wrap">
                  <Text size="sm" fw={500} c="orange">
                    ข้อมูล "เดิม" ที่แสดงมาจากเดือนภาษี:
                  </Text>
                  <Badge
                    size="sm"
                    variant="outline"
                    color="orange"
                    style={{
                      backgroundColor: 'white',
                      color: 'orange',
                      borderColor: 'var(--mantine-color-orange-6)',
                    }}
                  >
                    {(() => {
                      // Use selected previous tax month or calculate default
                      const prevYear = selectedPreviousTaxYear || (() => {
                        const currentTaxMonth = getCurrentTaxMonth()
                        const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                        return prevTaxMonthDate.getFullYear()
                      })()
                      const prevMonth = selectedPreviousTaxMonth || (() => {
                        const currentTaxMonth = getCurrentTaxMonth()
                        const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                        return prevTaxMonthDate.getMonth() + 1
                      })()
                      return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                    })()}
                  </Badge>
                  {selectedPreviousTaxYear && selectedPreviousTaxMonth ? (
                    <Text size="xs" c="orange">
                      (เลือกโดยผู้ใช้)
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      (ค่าเริ่มต้น: ย้อนหลัง 1 เดือนจากเดือนภาษีปัจจุบัน: {THAI_MONTHS.find((m) => m.value === getCurrentTaxMonth().month.toString())?.label} {getCurrentTaxMonth().year})
                    </Text>
                  )}
                </Group>
              </Alert>

              {/* Employee Search */}
              {workStatisticsByRole.length > 0 && (
                <Card withBorder radius="md" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                  <Stack gap="md">
                    <Text fw={700} size="lg">
                      ค้นหาพนักงานและดูงานที่รับผิดชอบ
                    </Text>
                    <Group>
                      <Select
                        placeholder="เลือกพนักงาน..."
                        data={allEmployees.map((emp) => ({
                          value: emp.id,
                          label: emp.name,
                        }))}
                        value={selectedEmployeeId}
                        onChange={(value) => setSelectedEmployeeId(value)}
                        searchable
                        clearable
                        style={{ flex: 1 }}
                        maxDropdownHeight={200}
                      />
                      {selectedEmployeeId && (
                        <Button
                          variant="light"
                          color="red"
                          onClick={() => {
                            setSelectedEmployeeId(null)
                            setEmployeeSearchQuery('')
                          }}
                        >
                          ล้างการค้นหา
                        </Button>
                      )}
                    </Group>

                    {/* Employee Work Assignments */}
                    {selectedEmployeeId && employeeWorkAssignments.length > 0 && (
                      <Card withBorder radius="md" p="md" style={{ backgroundColor: 'white' }}>
                        <Stack gap="md">
                          <Group justify="space-between" align="center">
                            <Text fw={700} size="md">
                              งานที่รับผิดชอบของ{' '}
                              {allEmployees.find((emp) => emp.id === selectedEmployeeId)?.name}
                            </Text>
                            <Badge size="lg" variant="light" color="blue">
                              ทั้งหมด {employeeWorkAssignments.length} รายการ
                            </Badge>
                          </Group>
                          <Table.ScrollContainer minWidth={600}>
                            <Table highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>หน้าที่ทำงาน</Table.Th>
                                  <Table.Th>Build Code</Table.Th>
                                  <Table.Th>ชื่อบริษัท</Table.Th>
                                  <Table.Th>สถานะจดภาษีมูลค่าเพิ่ม</Table.Th>
                                  <Table.Th>สถานะบริษัท</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {employeeWorkAssignments.map((assignment, index) => (
                                  <Table.Tr key={`${selectedEmployeeId}_${assignment.build}_${assignment.role}_${index}`}>
                                    <Table.Td>
                                      <Box
                                        style={{
                                          display: 'inline-block',
                                          padding: '4px 12px',
                                          backgroundColor: 'white',
                                          border: '1px solid #ff6b35',
                                          borderRadius: '4px',
                                          color: 'black',
                                          fontWeight: 500,
                                          fontSize: '14px',
                                        }}
                                      >
                                        {assignment.roleLabel}
                                      </Box>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text fw={500} size="sm">
                                        {assignment.build}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm">
                                        {assignment.companyName}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm">
                                        {assignment.taxRegistrationStatus || '-'}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm">
                                        {assignment.companyStatus}
                                      </Text>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </Table.ScrollContainer>
                        </Stack>
                      </Card>
                    )}

                    {selectedEmployeeId && employeeWorkAssignments.length === 0 && (
                      <Alert color="yellow" icon={<TbAlertCircle size={16} />}>
                        <Text size="sm">
                          ไม่พบงานที่รับผิดชอบสำหรับพนักงานคนนี้
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Card>
              )}

              {/* Work Statistics by Role - แสดงตามข้อมูลที่กำลังดู */}
              {/* ถ้ามี previewData แสดง Preview Statistics, ถ้าไม่มีแสดง Work Statistics จาก assignmentsData */}
              {previewData.length > 0 ? (
                previewWorkStatisticsByRole.length > 0 && (
                  <Card withBorder radius="md" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                    <Stack gap="lg">
                      <Text fw={700} size="lg">
                        สรุปจำนวนงานแยกตามหน้าที่ทำงาน (Preview)
                      </Text>

                      {/* Horizontal Role Cards */}
                      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                        {previewWorkStatisticsByRole.map((roleStat) => (
                          <Card
                            key={roleStat.role}
                            withBorder
                            radius="md"
                            p="md"
                            style={{
                              backgroundColor: selectedRole === roleStat.role ? 'var(--mantine-color-orange-0)' : 'white',
                              border: selectedRole === roleStat.role ? '2px solid #ff6b35' : '1px solid #ff6b35',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onClick={() => {
                              setSelectedRole(selectedRole === roleStat.role ? null : roleStat.role)
                            }}
                          >
                            <Stack gap="xs" align="center">
                              <Box
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 16px',
                                  backgroundColor: 'white',
                                  border: '1px solid #ff6b35',
                                  borderRadius: '4px',
                                  color: 'black',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  width: '100%',
                                  textAlign: 'center',
                                }}
                              >
                                {roleStat.roleLabel}
                              </Box>
                              <Text size="xs" c="dimmed" ta="center">
                                พนักงานทั้งหมด: <Text component="span" fw={700} c="dark">{roleStat.totalEmployees}</Text> คน
                              </Text>
                              <Text size="xs" c="dimmed" ta="center">
                                งานทั้งหมด: <Text component="span" fw={700} c="dark">{roleStat.grandTotal}</Text> รายการ
                              </Text>
                            </Stack>
                          </Card>
                        ))}
                      </SimpleGrid>

                      {/* Detail View for Selected Role */}
                      {selectedRole && (
                        <Card
                          withBorder
                          radius="md"
                          p="md"
                          style={{ backgroundColor: 'white' }}
                          mt="md"
                        >
                          <Stack gap="md">
                            <Group justify="space-between" align="center">
                              <Text fw={700} size="md">
                                รายละเอียด: {previewWorkStatisticsByRole.find((r) => r.role === selectedRole)?.roleLabel}
                              </Text>
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => setSelectedRole(null)}
                              >
                                ปิด
                              </Button>
                            </Group>

                            {(() => {
                              const roleStat = previewWorkStatisticsByRole.find((r) => r.role === selectedRole)
                              if (!roleStat) return null

                              return (
                                <>
                                  {/* Employee List */}
                                  {roleStat.employees.length > 0 && (
                                    <Table.ScrollContainer minWidth={600}>
                                      <Table highlightOnHover>
                                        <Table.Thead>
                                          <Table.Tr>
                                            <Table.Th>พนักงาน</Table.Th>
                                            <Table.Th ta="center">จดภาษีมูลค่าเพิ่ม</Table.Th>
                                            <Table.Th ta="center">ยังไม่จดภาษีมูลค่าเพิ่ม</Table.Th>
                                            <Table.Th ta="center">รวมทั้งหมด</Table.Th>
                                          </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                          {roleStat.employees.map((emp, index) => (
                                            <Table.Tr key={`${roleStat.role}_${emp.employeeId}_${index}`}>
                                              <Table.Td>
                                                <Text fw={500} size="sm">
                                                  {emp.employeeName}
                                                </Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text size="sm">{emp.vatRegistered}</Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text size="sm">{emp.notVatRegistered}</Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text size="sm" fw={700} c="dark">
                                                  {emp.total}
                                                </Text>
                                              </Table.Td>
                                            </Table.Tr>
                                          ))}
                                        </Table.Tbody>
                                      </Table>
                                    </Table.ScrollContainer>
                                  )}

                                  {/* Summary Cards */}
                                  <SimpleGrid cols={3} spacing="md" mt="md">
                                    <Card withBorder radius="md" p="md" style={{ backgroundColor: 'white' }}>
                                      <Stack gap="xs" align="center">
                                        <Text size="xs" c="dimmed">
                                          จดภาษีมูลค่าเพิ่ม
                                        </Text>
                                        <Text size="xl" fw={700} c="dark">
                                          {roleStat.totalVatRegistered}
                                        </Text>
                                      </Stack>
                                    </Card>
                                    <Card withBorder radius="md" p="md" style={{ backgroundColor: 'white' }}>
                                      <Stack gap="xs" align="center">
                                        <Text size="xs" c="dimmed">
                                          ยังไม่จดภาษีมูลค่าเพิ่ม
                                        </Text>
                                        <Text size="xl" fw={700} c="dark">
                                          {roleStat.totalNotVatRegistered}
                                        </Text>
                                      </Stack>
                                    </Card>
                                    <Card withBorder radius="md" p="md" style={{ backgroundColor: 'white' }}>
                                      <Stack gap="xs" align="center">
                                        <Text size="xs" c="dimmed">
                                          รวมทั้งหมด
                                        </Text>
                                        <Text size="xl" fw={700} c="dark">
                                          {roleStat.grandTotal}
                                        </Text>
                                      </Stack>
                                    </Card>
                                  </SimpleGrid>
                                </>
                              )
                            })()}
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  </Card>
                )
              ) : (
                workStatisticsByRole.length > 0 && (
                  <Card withBorder radius="md" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                    <Stack gap="lg">
                      <Text fw={700} size="lg">
                        สรุปจำนวนงานแยกตามหน้าที่ทำงาน
                      </Text>

                      {/* Horizontal Role Cards */}
                      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                        {workStatisticsByRole.map((roleStat) => (
                          <Card
                            key={roleStat.role}
                            withBorder
                            radius="md"
                            p="md"
                            style={{
                              backgroundColor: selectedRole === roleStat.role ? 'var(--mantine-color-orange-0)' : 'white',
                              border: selectedRole === roleStat.role ? '2px solid #ff6b35' : '1px solid #ff6b35',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onClick={() => {
                              setSelectedRole(selectedRole === roleStat.role ? null : roleStat.role)
                            }}
                          >
                            <Stack gap="xs" align="center">
                              <Box
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 16px',
                                  backgroundColor: 'white',
                                  border: '1px solid #ff6b35',
                                  borderRadius: '4px',
                                  color: 'black',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  width: '100%',
                                  textAlign: 'center',
                                }}
                              >
                                {roleStat.roleLabel}
                              </Box>
                              <Text size="xs" c="dimmed" ta="center">
                                พนักงานทั้งหมด: <Text component="span" fw={700} c="dark">{roleStat.totalEmployees}</Text> คน
                              </Text>
                              <Text size="xs" c="dimmed" ta="center">
                                งานทั้งหมด: <Text component="span" fw={700} c="dark">{roleStat.grandTotal}</Text> รายการ
                              </Text>
                            </Stack>
                          </Card>
                        ))}
                      </SimpleGrid>

                      {/* Detail View for Selected Role */}
                      {selectedRole && (
                        <Card
                          withBorder
                          radius="md"
                          p="md"
                          style={{ backgroundColor: 'white' }}
                          mt="md"
                        >
                          <Stack gap="md">
                            <Group justify="space-between" align="center">
                              <Text fw={700} size="md">
                                รายละเอียด: {workStatisticsByRole.find((r) => r.role === selectedRole)?.roleLabel}
                              </Text>
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => setSelectedRole(null)}
                              >
                                ปิด
                              </Button>
                            </Group>

                            {(() => {
                              const roleStat = workStatisticsByRole.find((r) => r.role === selectedRole)
                              if (!roleStat) return null

                              return (
                                <>
                                  {/* Employee List */}
                                  {roleStat.employees.length > 0 && (
                                    <Table.ScrollContainer minWidth={600}>
                                      <Table highlightOnHover>
                                        <Table.Thead>
                                          <Table.Tr>
                                            <Table.Th>พนักงาน</Table.Th>
                                            <Table.Th ta="center">จดภาษีมูลค่าเพิ่ม</Table.Th>
                                            <Table.Th ta="center">ยังไม่จดภาษีมูลค่าเพิ่ม</Table.Th>
                                            <Table.Th ta="center">รวมทั้งหมด</Table.Th>
                                          </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                          {roleStat.employees.map((emp, index) => (
                                            <Table.Tr key={`${roleStat.role}_${emp.employeeId}_${index}`}>
                                              <Table.Td>
                                                <Text fw={500} size="sm">
                                                  {emp.employeeName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                  {emp.employeeId}
                                                </Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text fw={600} size="lg">
                                                  {emp.vatRegistered}
                                                </Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text fw={600} size="lg">
                                                  {emp.notVatRegistered}
                                                </Text>
                                              </Table.Td>
                                              <Table.Td ta="center">
                                                <Text fw={700} size="lg" c="dark">
                                                  {emp.total}
                                                </Text>
                                              </Table.Td>
                                            </Table.Tr>
                                          ))}
                                        </Table.Tbody>
                                      </Table>
                                    </Table.ScrollContainer>
                                  )}

                                  {/* Role Summary */}
                                  <Divider />
                                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                                    <Card withBorder radius="md" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                      <Stack gap={4} align="center">
                                        <Text size="xs" c="dimmed">
                                          จดภาษีมูลค่าเพิ่ม
                                        </Text>
                                        <Text fw={700} size="xl" c="dark">
                                          {roleStat.totalVatRegistered}
                                        </Text>
                                      </Stack>
                                    </Card>
                                    <Card withBorder radius="md" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                      <Stack gap={4} align="center">
                                        <Text size="xs" c="dimmed">
                                          ยังไม่จดภาษีมูลค่าเพิ่ม
                                        </Text>
                                        <Text fw={700} size="xl" c="dark">
                                          {roleStat.totalNotVatRegistered}
                                        </Text>
                                      </Stack>
                                    </Card>
                                    <Card withBorder radius="md" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                      <Stack gap={4} align="center">
                                        <Text size="xs" c="dimmed" fw={500}>
                                          รวมทั้งหมด
                                        </Text>
                                        <Text fw={700} size="xl" c="dark">
                                          {roleStat.grandTotal}
                                        </Text>
                                      </Stack>
                                    </Card>
                                  </SimpleGrid>
                                </>
                              )
                            })()}
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  </Card>
                )
              )}

              {/* Filter by Assignment Status and Responsible Person */}
              {previewData.length > 0 && (
                <Card withBorder radius="md" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Text fw={700} size="md">
                        กรองข้อมูล
                      </Text>
                      {(filterByAccounting || filterByTaxInspection || filterByWht || filterByVat || filterByDocumentEntry || filterByAssignmentStatus !== 'all') && (
                        <Button
                          variant="light"
                          size="xs"
                          color="red"
                          onClick={() => {
                            setFilterByAccounting(null)
                            setFilterByTaxInspection(null)
                            setFilterByWht(null)
                            setFilterByVat(null)
                            setFilterByDocumentEntry(null)
                            setFilterByAssignmentStatus('all')
                            setPreviewPage(1)
                          }}
                        >
                          ล้างการกรอง
                        </Button>
                      )}
                    </Group>

                    {/* Filter by Assignment Status */}
                    <Group gap="xs" align="center">
                      <Text size="sm" fw={500} c="dimmed">
                        สถานะการจัดงาน:
                      </Text>
                      <Button
                        variant={filterByAssignmentStatus === 'all' ? 'filled' : 'light'}
                        size="xs"
                        color={filterByAssignmentStatus === 'all' ? 'blue' : 'gray'}
                        onClick={() => {
                          setFilterByAssignmentStatus('all')
                          setPreviewPage(1)
                        }}
                      >
                        ทั้งหมด ({previewData.length})
                      </Button>
                      <Button
                        variant={filterByAssignmentStatus === 'assigned' ? 'filled' : 'light'}
                        size="xs"
                        color={filterByAssignmentStatus === 'assigned' ? 'green' : 'gray'}
                        onClick={() => {
                          setFilterByAssignmentStatus('assigned')
                          setPreviewPage(1)
                        }}
                      >
                        จัดแล้ว ({previewData.filter((item) => item.is_assigned).length})
                      </Button>
                      <Button
                        variant={filterByAssignmentStatus === 'unassigned' ? 'filled' : 'light'}
                        size="xs"
                        color={filterByAssignmentStatus === 'unassigned' ? 'orange' : 'gray'}
                        onClick={() => {
                          setFilterByAssignmentStatus('unassigned')
                          setPreviewPage(1)
                        }}
                      >
                        ยังไม่จัด ({previewData.filter((item) => !item.is_assigned).length})
                      </Button>
                    </Group>

                    <Divider label="กรองตามผู้รับผิดชอบ" labelPosition="center" />
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
                      <Select
                        placeholder="กรองตามผู้ทำบัญชี..."
                        data={accountingUserOptions}
                        value={filterByAccounting}
                        onChange={(value) => {
                          setFilterByAccounting(value)
                          setPreviewPage(1)
                        }}
                        searchable
                        clearable
                        size="sm"
                      />
                      <Select
                        placeholder="กรองตามผู้ตรวจภาษี..."
                        data={taxInspectionUserOptions}
                        value={filterByTaxInspection}
                        onChange={(value) => {
                          setFilterByTaxInspection(value)
                          setPreviewPage(1)
                        }}
                        searchable
                        clearable
                        size="sm"
                      />
                      <Select
                        placeholder="กรองตามผู้ยื่น WHT..."
                        data={filingUserOptions}
                        value={filterByWht}
                        onChange={(value) => {
                          setFilterByWht(value)
                          setPreviewPage(1)
                        }}
                        searchable
                        clearable
                        size="sm"
                      />
                      <Select
                        placeholder="กรองตามผู้ยื่น VAT..."
                        data={filingUserOptions}
                        value={filterByVat}
                        onChange={(value) => {
                          setFilterByVat(value)
                          setPreviewPage(1)
                        }}
                        searchable
                        clearable
                        size="sm"
                      />
                      <Select
                        placeholder="กรองตามผู้คีย์เอกสาร..."
                        data={documentEntryUserOptions}
                        value={filterByDocumentEntry}
                        onChange={(value) => {
                          setFilterByDocumentEntry(value)
                          setPreviewPage(1)
                        }}
                        searchable
                        clearable
                        size="sm"
                      />
                    </SimpleGrid>
                    {(filterByAccounting || filterByTaxInspection || filterByWht || filterByVat || filterByDocumentEntry || filterByAssignmentStatus !== 'all') && (
                      <Alert color="blue" icon={<TbAlertCircle size={16} />}>
                        <Text size="sm">
                          แสดงผล {filteredPreviewData.length} รายการ จากทั้งหมด {previewData.length} รายการ
                          {filterByAssignmentStatus === 'assigned' && ` (จัดแล้ว: ${previewData.filter((item) => item.is_assigned).length} รายการ)`}
                          {filterByAssignmentStatus === 'unassigned' && ` (ยังไม่จัด: ${previewData.filter((item) => !item.is_assigned).length} รายการ)`}
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Card>
              )}

              <Group justify="space-between" align="center">
                <div>
                  <Text fw={700} size="lg" mb={4}>
                    ข้อมูลการจัดงาน Preview
                  </Text>
                  <Text size="sm" c="dimmed">
                    สถานะ:{' '}
                    {selectedCompanyStatuses.length > 0
                      ? selectedCompanyStatuses.map((s) => companyStatusOptions.find((opt) => opt.value === s)?.label).join(', ')
                      : 'ทั้งหมด'}{' '}
                    (ทั้งหมด {filteredPreviewData.length} รายการ, แสดง {((previewPage - 1) * previewLimit) + 1}-{Math.min(previewPage * previewLimit, filteredPreviewData.length)} รายการ)
                  </Text>
                </div>
                <Group gap="xs">
                  {/* Column Visibility Menu */}
                  <Menu shadow="md" width={280} position="bottom-end">
                    <Menu.Target>
                      <Tooltip label="แสดง/ซ่อนคอลัมน์">
                        <ActionIcon variant="light" color="blue" size="lg" radius="md">
                          <TbColumns size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>ข้อมูลบริษัท</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.build ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, build: !visibleColumns.build })}
                      >
                        Build Code
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.company_name ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, company_name: !visibleColumns.company_name })}
                      >
                        ชื่อบริษัท
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.legal_entity_number ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, legal_entity_number: !visibleColumns.legal_entity_number })}
                      >
                        เลขทะเบียนนิติบุคคล
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.tax_registration_status ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, tax_registration_status: !visibleColumns.tax_registration_status })}
                      >
                        สถานะจดภาษีมูลค่าเพิ่ม
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.company_status ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, company_status: !visibleColumns.company_status })}
                      >
                        สถานะบริษัท
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.target_tax_month ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, target_tax_month: !visibleColumns.target_tax_month })}
                      >
                        เดือนภาษีที่จะบันทึก
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.assignment_status ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, assignment_status: !visibleColumns.assignment_status })}
                      >
                        สถานะการจัดงาน
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>ทำบัญชี</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.prev_accounting ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, prev_accounting: !visibleColumns.prev_accounting })}
                      >
                        ทำบัญชี (เดิม)
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.new_accounting ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, new_accounting: !visibleColumns.new_accounting })}
                      >
                        ผู้ทำบัญชี (ใหม่)
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>ตรวจภาษี</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.prev_tax_inspection ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, prev_tax_inspection: !visibleColumns.prev_tax_inspection })}
                      >
                        ตรวจภาษี (เดิม)
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.new_tax_inspection ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, new_tax_inspection: !visibleColumns.new_tax_inspection })}
                      >
                        ผู้ตรวจภาษี (ใหม่)
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>ยื่น WHT</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.prev_wht ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, prev_wht: !visibleColumns.prev_wht })}
                      >
                        ยื่น WHT (เดิม)
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.new_wht ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, new_wht: !visibleColumns.new_wht })}
                      >
                        ผู้ยื่น WHT (ใหม่)
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>ยื่น VAT</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.prev_vat ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, prev_vat: !visibleColumns.prev_vat })}
                      >
                        ยื่น VAT (เดิม)
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.new_vat ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, new_vat: !visibleColumns.new_vat })}
                      >
                        ผู้ยื่น VAT (ใหม่)
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>คีย์เอกสาร</Menu.Label>
                      <Menu.Item
                        leftSection={visibleColumns.prev_document_entry ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, prev_document_entry: !visibleColumns.prev_document_entry })}
                      >
                        คีย์เอกสาร (เดิม)
                      </Menu.Item>
                      <Menu.Item
                        leftSection={visibleColumns.new_document_entry ? <TbEye size={16} /> : <TbEyeOff size={16} />}
                        onClick={() => setVisibleColumns({ ...visibleColumns, new_document_entry: !visibleColumns.new_document_entry })}
                      >
                        ผู้คีย์เอกสาร (ใหม่)
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        onClick={() => {
                          setVisibleColumns({
                            build: true,
                            company_name: true,
                            legal_entity_number: true,
                            tax_registration_status: true,
                            company_status: true,
                            target_tax_month: true,
                            assignment_status: true,
                            prev_accounting: true,
                            new_accounting: true,
                            prev_tax_inspection: true,
                            new_tax_inspection: true,
                            prev_wht: true,
                            new_wht: true,
                            prev_vat: true,
                            new_vat: true,
                            prev_document_entry: true,
                            new_document_entry: true,
                          })
                        }}
                      >
                        แสดงทั้งหมด
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          setVisibleColumns({
                            build: true,
                            company_name: true,
                            legal_entity_number: false,
                            tax_registration_status: false,
                            company_status: true,
                            target_tax_month: true,
                            assignment_status: true,
                            prev_accounting: false,
                            new_accounting: true,
                            prev_tax_inspection: false,
                            new_tax_inspection: true,
                            prev_wht: false,
                            new_wht: true,
                            prev_vat: false,
                            new_vat: true,
                            prev_document_entry: false,
                            new_document_entry: true,
                          })
                        }}
                      >
                        แสดงเฉพาะ (ใหม่)
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  <Button variant="light" color="red" onClick={() => setPreviewData([])}>
                    ปิด Preview
                  </Button>
                </Group>
              </Group>

              <Alert color="blue" title="ข้อมูล Preview">
                กรุณาตรวจสอบและแก้ไขข้อมูลก่อนบันทึก ข้อมูลจะยังไม่ถูกบันทึกลงฐานข้อมูลจนกว่าจะกดปุ่ม "บันทึกทั้งหมด"
              </Alert>

              <Table.ScrollContainer minWidth={1400}>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      {visibleColumns.build && <Table.Th>Build Code</Table.Th>}
                      {visibleColumns.company_name && <Table.Th>ชื่อบริษัท</Table.Th>}
                      {visibleColumns.legal_entity_number && <Table.Th>เลขทะเบียนนิติบุคคล</Table.Th>}
                      {visibleColumns.tax_registration_status && <Table.Th>สถานะจดภาษีมูลค่าเพิ่ม</Table.Th>}
                      {visibleColumns.company_status && <Table.Th>สถานะบริษัท</Table.Th>}
                      {visibleColumns.target_tax_month && <Table.Th>เดือนภาษีที่จะบันทึก</Table.Th>}
                      {visibleColumns.assignment_status && <Table.Th>สถานะการจัดงาน</Table.Th>}
                      {visibleColumns.prev_accounting && <Table.Th>ทำบัญชี (เดิม)</Table.Th>}
                      {visibleColumns.new_accounting && <Table.Th>ผู้ทำบัญชี (ใหม่)</Table.Th>}
                      {visibleColumns.prev_tax_inspection && <Table.Th>ตรวจภาษี (เดิม)</Table.Th>}
                      {visibleColumns.new_tax_inspection && <Table.Th>ผู้ตรวจภาษี (ใหม่)</Table.Th>}
                      {visibleColumns.prev_wht && <Table.Th>ยื่น WHT (เดิม)</Table.Th>}
                      {visibleColumns.new_wht && <Table.Th>ผู้ยื่น WHT (ใหม่)</Table.Th>}
                      {visibleColumns.prev_vat && <Table.Th>ยื่น VAT (เดิม)</Table.Th>}
                      {visibleColumns.new_vat && <Table.Th>ผู้ยื่น VAT (ใหม่)</Table.Th>}
                      {visibleColumns.prev_document_entry && <Table.Th>คีย์เอกสาร (เดิม)</Table.Th>}
                      {visibleColumns.new_document_entry && <Table.Th>ผู้คีย์เอกสาร (ใหม่)</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredPreviewData
                      .slice((previewPage - 1) * previewLimit, previewPage * previewLimit)
                      .map((item, index) => {
                        // Find the actual index in previewData (not filteredPreviewData)
                        const actualIndex = previewData.findIndex((p) => p.build === item.build)
                        return (
                          <Table.Tr key={item.build}>
                            {visibleColumns.build && (
                              <Table.Td>
                                <Text fw={500} size="sm">
                                  {item.build}
                                </Text>
                              </Table.Td>
                            )}
                            {visibleColumns.company_name && (
                              <Table.Td>
                                <Text size="sm">{item.company_name}</Text>
                              </Table.Td>
                            )}
                            {visibleColumns.legal_entity_number && (
                              <Table.Td>
                                <Text size="sm">{item.legal_entity_number}</Text>
                              </Table.Td>
                            )}
                            {visibleColumns.tax_registration_status && (
                              <Table.Td>
                                <Badge
                                  size="sm"
                                  variant="filled"
                                  color={
                                    item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'
                                      ? 'green'
                                      : item.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม'
                                        ? 'red'
                                        : 'gray'
                                  }
                                >
                                  {item.tax_registration_status || '-'}
                                </Badge>
                              </Table.Td>
                            )}
                            {visibleColumns.company_status && (
                              <Table.Td>
                                <Badge
                                  size="sm"
                                  variant="filled"
                                  color="orange"
                                  styles={{
                                    root: {
                                      color: 'white',
                                    },
                                  }}
                                >
                                  {item.company_status}
                                </Badge>
                              </Table.Td>
                            )}
                            {visibleColumns.target_tax_month && (
                              <Table.Td>
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color="blue"
                                >
                                  {item.target_tax_year && item.target_tax_month !== null && item.target_tax_month !== undefined
                                    ? `${THAI_MONTHS.find((m) => m.value === item.target_tax_month!.toString())?.label || item.target_tax_month} ${item.target_tax_year}`
                                    : '-'}
                                </Badge>
                              </Table.Td>
                            )}
                            {visibleColumns.assignment_status && (
                              <Table.Td>
                                {(() => {
                                  // Count how many new assignments are filled
                                  const isVatRequired = item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'
                                  const fields = [
                                    item.new_accounting_responsible,
                                    item.new_tax_inspection_responsible,
                                    item.new_wht_filer_responsible,
                                    ...(isVatRequired ? [item.new_vat_filer_responsible] : []),
                                    item.new_document_entry_responsible,
                                  ]
                                  const filledCount = fields.filter(Boolean).length
                                  const totalRequired = fields.length

                                  // Determine status: complete, partial, none
                                  const isComplete = filledCount === totalRequired
                                  const isPartial = filledCount > 0 && filledCount < totalRequired

                                  return (
                                    <Badge
                                      size="sm"
                                      variant="filled"
                                      color={isComplete ? 'green' : isPartial ? 'orange' : 'gray'}
                                    >
                                      {isComplete ? 'จัดแล้ว' : isPartial ? 'จัดงานบางส่วน' : 'ยังไม่จัด'}
                                    </Badge>
                                  )
                                })()}
                              </Table.Td>
                            )}
                            {visibleColumns.prev_accounting && (
                              <Table.Td>
                                {item.prev_accounting_responsible_name ? (
                                  <Tooltip label={`ข้อมูลจากเดือนภาษี: ${(() => {
                                    const prevYear = selectedPreviousTaxYear || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getFullYear()
                                    })()
                                    const prevMonth = selectedPreviousTaxMonth || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getMonth() + 1
                                    })()
                                    return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                                  })()}`}>
                                    <Badge size="xs" variant="dot" color="gray" fullWidth>
                                      {formatEmployeeNameWithId(item.prev_accounting_responsible_name, item.prev_accounting_responsible)}
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.new_accounting && (
                              <Table.Td>
                                <Select
                                  value={item.new_accounting_responsible}
                                  onChange={(value) => {
                                    const updated = [...previewData]
                                    updated[actualIndex].new_accounting_responsible = value
                                    setPreviewData(updated)
                                    // Update loadedPreviewData to preserve user input
                                    setLoadedPreviewData((prev) =>
                                      prev.map((prevItem) =>
                                        prevItem.build === item.build
                                          ? { ...prevItem, new_accounting_responsible: value }
                                          : prevItem
                                      )
                                    )
                                  }}
                                  data={accountingUserOptions}
                                  searchable
                                  size="xs"
                                  placeholder="เลือก..."
                                  styles={{
                                    input: { fontSize: '12px', minHeight: '28px', height: '28px' },
                                  }}
                                />
                                {item.prev_accounting_responsible_name && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    เดิม: {formatEmployeeName(item.prev_accounting_responsible_name)}
                                  </Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.prev_tax_inspection && (
                              <Table.Td>
                                {item.prev_tax_inspection_responsible_name ? (
                                  <Tooltip label={`ข้อมูลจากเดือนภาษี: ${(() => {
                                    const prevYear = selectedPreviousTaxYear || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getFullYear()
                                    })()
                                    const prevMonth = selectedPreviousTaxMonth || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getMonth() + 1
                                    })()
                                    return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                                  })()}`}>
                                    <Badge size="xs" variant="dot" color="gray" fullWidth>
                                      {formatEmployeeNameWithId(item.prev_tax_inspection_responsible_name, item.prev_tax_inspection_responsible)}
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.new_tax_inspection && (
                              <Table.Td>
                                <Select
                                  value={item.new_tax_inspection_responsible}
                                  onChange={(value) => {
                                    const updated = [...previewData]
                                    updated[actualIndex].new_tax_inspection_responsible = value
                                    setPreviewData(updated)
                                    // Update loadedPreviewData to preserve user input
                                    setLoadedPreviewData((prev) =>
                                      prev.map((prevItem) =>
                                        prevItem.build === item.build
                                          ? { ...prevItem, new_tax_inspection_responsible: value }
                                          : prevItem
                                      )
                                    )
                                  }}
                                  data={taxInspectionUserOptions}
                                  searchable
                                  size="xs"
                                  placeholder="เลือก..."
                                  styles={{
                                    input: { fontSize: '12px', minHeight: '28px', height: '28px' },
                                  }}
                                />
                                {item.prev_tax_inspection_responsible_name && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    เดิม: {formatEmployeeName(item.prev_tax_inspection_responsible_name)}
                                  </Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.prev_wht && (
                              <Table.Td>
                                {item.prev_wht_filer_responsible_name ? (
                                  <Tooltip label={`ข้อมูลจากเดือนภาษี: ${(() => {
                                    const prevYear = selectedPreviousTaxYear || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getFullYear()
                                    })()
                                    const prevMonth = selectedPreviousTaxMonth || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getMonth() + 1
                                    })()
                                    return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                                  })()}`}>
                                    <Badge size="xs" variant="dot" color="gray" fullWidth>
                                      {formatEmployeeNameWithId(item.prev_wht_filer_responsible_name, item.prev_wht_filer_responsible)}
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.new_wht && (
                              <Table.Td>
                                <Select
                                  value={item.new_wht_filer_responsible}
                                  onChange={(value) => {
                                    const updated = [...previewData]
                                    updated[actualIndex].new_wht_filer_responsible = value
                                    setPreviewData(updated)
                                    // Update loadedPreviewData to preserve user input
                                    setLoadedPreviewData((prev) =>
                                      prev.map((prevItem) =>
                                        prevItem.build === item.build
                                          ? { ...prevItem, new_wht_filer_responsible: value }
                                          : prevItem
                                      )
                                    )
                                  }}
                                  data={filingUserOptions}
                                  searchable
                                  size="xs"
                                  placeholder="เลือก..."
                                  styles={{
                                    input: { fontSize: '12px', minHeight: '28px', height: '28px' },
                                  }}
                                />
                                {item.prev_wht_filer_responsible_name && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    เดิม: {formatEmployeeName(item.prev_wht_filer_responsible_name)}
                                  </Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.prev_vat && (
                              <Table.Td>
                                {item.prev_vat_filer_responsible_name ? (
                                  <Tooltip label={`ข้อมูลจากเดือนภาษี: ${(() => {
                                    const prevYear = selectedPreviousTaxYear || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getFullYear()
                                    })()
                                    const prevMonth = selectedPreviousTaxMonth || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getMonth() + 1
                                    })()
                                    return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                                  })()}`}>
                                    <Badge size="xs" variant="dot" color="gray" fullWidth>
                                      {formatEmployeeNameWithId(item.prev_vat_filer_responsible_name, item.prev_vat_filer_responsible)}
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.new_vat && (
                              <Table.Td>
                                <Select
                                  value={item.new_vat_filer_responsible}
                                  disabled={item.tax_registration_status !== 'จดภาษีมูลค่าเพิ่ม'}
                                  onChange={(value) => {
                                    const updated = [...previewData]
                                    updated[actualIndex].new_vat_filer_responsible = value
                                    setPreviewData(updated)
                                    // Update loadedPreviewData to preserve user input
                                    setLoadedPreviewData((prev) =>
                                      prev.map((prevItem) =>
                                        prevItem.build === item.build
                                          ? { ...prevItem, new_vat_filer_responsible: value }
                                          : prevItem
                                      )
                                    )
                                  }}
                                  data={filingUserOptions}
                                  searchable
                                  size="xs"
                                  placeholder={item.tax_registration_status !== 'จดภาษีมูลค่าเพิ่ม' ? 'ไม่จด VAT' : 'เลือก...'}
                                  styles={{
                                    input: { fontSize: '12px', minHeight: '28px', height: '28px' },
                                  }}
                                />
                                {item.prev_vat_filer_responsible_name && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    เดิม: {formatEmployeeName(item.prev_vat_filer_responsible_name)}
                                  </Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.prev_document_entry && (
                              <Table.Td>
                                {item.prev_document_entry_responsible_name ? (
                                  <Tooltip label={`ข้อมูลจากเดือนภาษี: ${(() => {
                                    const prevYear = selectedPreviousTaxYear || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getFullYear()
                                    })()
                                    const prevMonth = selectedPreviousTaxMonth || (() => {
                                      const currentTaxMonth = getCurrentTaxMonth()
                                      const prevTaxMonthDate = new Date(currentTaxMonth.year, currentTaxMonth.month - 2, 1)
                                      return prevTaxMonthDate.getMonth() + 1
                                    })()
                                    return `${THAI_MONTHS.find((m) => m.value === prevMonth.toString())?.label || prevMonth} ${prevYear}`
                                  })()}`}>
                                    <Badge size="xs" variant="dot" color="gray" fullWidth>
                                      {formatEmployeeNameWithId(item.prev_document_entry_responsible_name, item.prev_document_entry_responsible)}
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Text size="xs" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            )}
                            {visibleColumns.new_document_entry && (
                              <Table.Td>
                                <Select
                                  value={item.new_document_entry_responsible}
                                  onChange={(value) => {
                                    const updated = [...previewData]
                                    updated[actualIndex].new_document_entry_responsible = value
                                    setPreviewData(updated)
                                    // Update loadedPreviewData to preserve user input
                                    setLoadedPreviewData((prev) =>
                                      prev.map((prevItem) =>
                                        prevItem.build === item.build
                                          ? { ...prevItem, new_document_entry_responsible: value }
                                          : prevItem
                                      )
                                    )
                                  }}
                                  data={documentEntryUserOptions}
                                  searchable
                                  size="xs"
                                  placeholder="เลือก..."
                                  styles={{
                                    input: { fontSize: '12px', minHeight: '28px', height: '28px' },
                                  }}
                                />
                                {item.prev_document_entry_responsible_name && (
                                  <Text size="xs" c="dimmed" mt={2}>
                                    เดิม: {formatEmployeeName(item.prev_document_entry_responsible_name)}
                                  </Text>
                                )}
                              </Table.Td>
                            )}
                          </Table.Tr>
                        )
                      })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {/* Pagination Controls */}
              {previewData.length > previewLimit && (
                <Group justify="space-between" align="center" mt="md">
                  <Group gap="xs" align="center">
                    <Text size="sm" c="dimmed">
                      แสดงรายการ:
                    </Text>
                    <Select
                      value={previewLimit.toString()}
                      onChange={(value) => {
                        setPreviewLimit(parseInt(value || '20'))
                        setPreviewPage(1) // Reset to first page when changing limit
                      }}
                      data={[
                        { value: '20', label: '20' },
                        { value: '30', label: '30' },
                        { value: '50', label: '50' },
                        { value: '100', label: '100' },
                      ]}
                      size="sm"
                      style={{ width: 80 }}
                    />
                    <Text size="sm" c="dimmed">
                      จากทั้งหมด {filteredPreviewData.length} รายการ
                    </Text>
                  </Group>
                  <Pagination
                    value={previewPage}
                    onChange={setPreviewPage}
                    total={Math.ceil(filteredPreviewData.length / previewLimit)}
                    size="sm"
                    radius="md"
                  />
                </Group>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => setPreviewData([])}>
                  ยกเลิก
                </Button>
                <Button
                  color="green"
                  disabled={isSaving || previewData.length === 0}
                  onClick={() => {
                    // Prevent duplicate clicks
                    if (isSaving) {
                      return
                    }

                    // Check if preview data is empty
                    if (previewData.length === 0) {
                      notifications.show({
                        title: 'ไม่มีข้อมูล',
                        message: 'ไม่มีข้อมูลที่จะบันทึก',
                        color: 'yellow',
                        icon: <TbAlertCircle size={16} />,
                      })
                      return
                    }

                    // Use target tax month from previewData (ที่ผู้ใช้เลือกไว้แล้วตอนสร้าง)
                    // ถ้า previewData มีข้อมูล ให้ใช้เดือนภาษีจากรายการแรก (ควรจะเหมือนกันทุกรายการ)
                    const firstItem = previewData[0]
                    if (firstItem?.target_tax_year && firstItem?.target_tax_month) {
                      setSelectedTaxYear(firstItem.target_tax_year)
                      setSelectedTaxMonth(firstItem.target_tax_month)
                    } else {
                      // Fallback: ใช้ current tax month
                      const currentTaxMonth = getCurrentTaxMonth()
                      setSelectedTaxYear(currentTaxMonth.year)
                      setSelectedTaxMonth(currentTaxMonth.month)
                    }
                    setTaxMonthModalOpened(true)
                  }}
                >
                  {isSaving ? 'กำลังบันทึก...' : `บันทึกทั้งหมด (${previewData.length} รายการ)`}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Tax Month Selection Modal */}
        <Modal
          opened={taxMonthModalOpened}
          onClose={() => {
            if (!isSaving) {
              setTaxMonthModalOpened(false)
            }
          }}
          title="เลือกเดือนภาษีที่ต้องการจัดงาน"
          size="md"
          closeOnClickOutside={!isSaving}
          closeOnEscape={!isSaving}
          withCloseButton={!isSaving}
        >
          <Stack>
            <Text size="sm" c="dimmed">
              กรุณาเลือกเดือนภาษีที่ต้องการจัดงาน
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="ปี (พ.ศ.)"
                  value={selectedTaxYear || getCurrentTaxMonth().year}
                  onChange={(value) => setSelectedTaxYear(typeof value === 'number' ? value : parseInt(value) || null)}
                  min={2000}
                  max={2100}
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="เดือน"
                  placeholder="เลือกเดือน"
                  value={selectedTaxMonth?.toString() || getCurrentTaxMonth().month.toString()}
                  onChange={(value) => setSelectedTaxMonth(value ? parseInt(value) : null)}
                  data={THAI_MONTHS}
                  required
                  searchable
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setTaxMonthModalOpened(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button
                color="blue"
                disabled={isSaving}
                onClick={async () => {
                  // Validate tax month input
                  const validation = validateTaxMonthInput(selectedTaxYear, selectedTaxMonth)
                  if (!validation.isValid) {
                    notifications.show({
                      title: 'ข้อมูลไม่ถูกต้อง',
                      message: validation.error || 'กรุณาตรวจสอบข้อมูล',
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                    })
                    return
                  }

                  setTaxMonthModalOpened(false)

                  try {
                    // Validate incomplete data
                    const validation = validatePreviewData()
                    if (!validation.isValid) {
                      setIncompleteItems(validation.incompleteItems)
                      setIncompleteDataModalOpened(true)
                      return
                    }

                    // Check for duplicates with error handling - ใช้ target tax month จาก previewData
                    const firstItem = previewData[0]
                    const targetYear = firstItem?.target_tax_year || selectedTaxYear
                    const targetMonth = firstItem?.target_tax_month || selectedTaxMonth

                    if (targetYear && targetMonth !== null && targetMonth !== undefined) {
                      try {
                        const duplicates = await checkDuplicateAssignments(targetYear, targetMonth)
                        if (duplicates.length > 0) {
                          setDuplicateItems(duplicates)
                          setDuplicateDataModalOpened(true)
                          return
                        }
                      } catch (duplicateError: unknown) {
                        console.error('Error checking duplicates:', duplicateError)
                        notifications.show({
                          title: 'เกิดข้อผิดพลาด',
                          message: getErrorMessage(duplicateError) || 'ไม่สามารถตรวจสอบข้อมูลซ้ำได้ กรุณาลองอีกครั้ง',
                          color: 'red',
                          icon: <TbAlertCircle size={16} />,
                        })
                        setTaxMonthModalOpened(true) // Reopen modal to retry
                        return
                      }
                    }

                    // No duplicates, proceed with save - ใช้ target tax month จาก previewData
                    const firstItemForSave = previewData[0]
                    const saveTargetYear = firstItemForSave?.target_tax_year || selectedTaxYear
                    const saveTargetMonth = firstItemForSave?.target_tax_month || selectedTaxMonth

                    if (saveTargetYear && saveTargetMonth !== null && saveTargetMonth !== undefined) {
                      await executeBulkSave(saveTargetYear, saveTargetMonth, [])
                    } else {
                      notifications.show({
                        title: 'ข้อมูลไม่ครบ',
                        message: 'กรุณาเลือกเดือนภาษีที่จะบันทึกก่อน',
                        color: 'red',
                        icon: <TbAlertCircle size={16} />,
                      })
                    }
                  } catch (error: unknown) {
                    console.error('Error in tax month confirmation:', error)
                    notifications.show({
                      title: 'เกิดข้อผิดพลาด',
                      message: error.message || 'เกิดข้อผิดพลาดในการดำเนินการ',
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                    })
                  }
                }}
              >
                ยืนยัน
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Incomplete Data Warning Modal */}
        <Modal
          opened={incompleteDataModalOpened}
          onClose={() => {
            if (!isSaving) {
              setIncompleteDataModalOpened(false)
            }
          }}
          title="พบข้อมูลบางส่วนที่ไม่ได้กรอก"
          size="xl"
          closeOnClickOutside={!isSaving}
          closeOnEscape={!isSaving}
          withCloseButton={!isSaving}
        >
          <Stack>
            <Alert color="yellow" icon={<TbAlertCircle size={16} />}>
              <Text fw={500} mb="xs">
                พบ {incompleteItems.length} รายการที่มีข้อมูลไม่ครบ
              </Text>
              <Text size="sm" mb="xs">
                ระบบจะบันทึกเฉพาะข้อมูลที่กรอกแล้ว คุณต้องการดำเนินการต่อหรือไม่?
              </Text>
              {selectedTaxYear && selectedTaxMonth && (
                <Text size="sm" fw={500} c="orange">
                  เดือนภาษีที่จะบันทึก: {THAI_MONTHS.find((m) => m.value === selectedTaxMonth.toString())?.label} {selectedTaxYear}
                </Text>
              )}
            </Alert>
            <Table.ScrollContainer minWidth={800}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Build Code</Table.Th>
                    <Table.Th>ชื่อบริษัท</Table.Th>
                    <Table.Th>ข้อมูลที่ขาดหายไป</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {incompleteItems.map((item) => {
                    // Find company name from previewData or allClients
                    const previewItem = previewData.find((p) => p.build === item.build)
                    const companyName = previewItem?.company_name ||
                      allClients.find((c) => c.build === item.build)?.company_name ||
                      '-'
                    return (
                      <Table.Tr key={item.build}>
                        <Table.Td>
                          <Text fw={500}>{item.build}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{companyName}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {item.missingFields.join(', ')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setIncompleteDataModalOpened(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button
                color="orange"
                disabled={isSaving}
                onClick={async () => {
                  // Check if there will be any items left to save after skipping incomplete items
                  const incompleteBuilds = incompleteItems.map((i) => i.build)
                  const itemsToSaveAfterSkip = previewData.filter((item) => !incompleteBuilds.includes(item.build))

                  if (itemsToSaveAfterSkip.length === 0) {
                    notifications.show({
                      title: 'ไม่มีข้อมูลที่จะบันทึก',
                      message: `ทุกรายการ (${previewData.length} รายการ) มีข้อมูลไม่ครบ ไม่สามารถบันทึกได้ กรุณากรอกข้อมูลให้ครบก่อนบันทึก`,
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                      autoClose: 15000,
                    })
                    return
                  }

                  setIncompleteDataModalOpened(false)

                  try {
                    // Check for duplicates - ใช้ target tax month จาก previewData
                    const firstItem = previewData[0]
                    const targetYear = firstItem?.target_tax_year || selectedTaxYear
                    const targetMonth = firstItem?.target_tax_month || selectedTaxMonth

                    if (targetYear && targetMonth !== null && targetMonth !== undefined) {
                      try {
                        const duplicates = await checkDuplicateAssignments(targetYear, targetMonth)
                        if (duplicates.length > 0) {
                          setDuplicateItems(duplicates)
                          setDuplicateDataModalOpened(true)
                          return
                        }
                      } catch (duplicateError: unknown) {
                        console.error('Error checking duplicates:', duplicateError)
                        notifications.show({
                          title: 'เกิดข้อผิดพลาด',
                          message: getErrorMessage(duplicateError) || 'ไม่สามารถตรวจสอบข้อมูลซ้ำได้ กรุณาลองอีกครั้ง',
                          color: 'red',
                          icon: <TbAlertCircle size={16} />,
                        })
                        setIncompleteDataModalOpened(true) // Reopen modal to retry
                        return
                      }
                    }

                    // No duplicates, proceed with save
                    if (selectedTaxYear && selectedTaxMonth) {
                      await executeBulkSave(selectedTaxYear, selectedTaxMonth, incompleteItems.map((i) => i.build))
                    }
                  } catch (error: unknown) {
                    console.error('Error in incomplete data confirmation:', error)
                    notifications.show({
                      title: 'เกิดข้อผิดพลาด',
                      message: error.message || 'เกิดข้อผิดพลาดในการดำเนินการ',
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                    })
                  }
                }}
              >
                ยืนยันส่งข้อมูล
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Duplicate Data Warning Modal */}
        <Modal
          opened={duplicateDataModalOpened}
          onClose={() => {
            if (!isSaving) {
              setDuplicateDataModalOpened(false)
            }
          }}
          title="พบข้อมูลซ้ำในเดือนภาษีนี้"
          size="xl"
          closeOnClickOutside={!isSaving}
          closeOnEscape={!isSaving}
          withCloseButton={!isSaving}
        >
          <Stack>
            <Alert color="orange" icon={<TbAlertCircle size={16} />}>
              <Text fw={500} mb="xs">
                พบ {duplicateItems.length} รายการที่มีข้อมูลซ้ำในเดือนภาษี{' '}
                {selectedTaxMonth ? THAI_MONTHS.find((m) => m.value === selectedTaxMonth.toString())?.label : selectedTaxMonth}/{selectedTaxYear}
              </Text>
              <Text size="sm">
                ระบบจะไม่ทับข้อมูลเดิมของ Build code เหล่านี้ และจะบันทึกเฉพาะข้อมูลใหม่ที่ยังไม่เคยมีการจัดงานมาก่อน
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                หมายเหตุ: ระบบจะแสดงเฉพาะ Build code ที่มีข้อมูลซ้ำจริงๆ ในเดือนภาษีที่เลือก และจะข้ามการบันทึกข้อมูลเหล่านี้
              </Text>
            </Alert>
            <Table.ScrollContainer minWidth={800}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Build Code</Table.Th>
                    <Table.Th>ชื่อบริษัท</Table.Th>
                    <Table.Th>เดือนภาษีที่ซ้ำ</Table.Th>
                    <Table.Th>ข้อมูลเดิม</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {duplicateItems
                    .filter((duplicate) => {
                      // Filter: แสดงเฉพาะ build code ที่อยู่ใน previewData และตรงกับ target tax month
                      const previewItem = previewData.find(
                        (item) => item.build === duplicate.build &&
                          item.target_tax_year === duplicate.assignment_year &&
                          item.target_tax_month === duplicate.assignment_month
                      )
                      return !!previewItem
                    })
                    .map((duplicate) => {
                      const previewItem = previewData.find(
                        (item) => item.build === duplicate.build &&
                          item.target_tax_year === duplicate.assignment_year &&
                          item.target_tax_month === duplicate.assignment_month
                      )
                      return (
                        <Table.Tr key={`${duplicate.build}_${duplicate.assignment_year}_${duplicate.assignment_month}`}>
                          <Table.Td>
                            <Text fw={500}>{duplicate.build}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{duplicate.company_name || previewItem?.company_name || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" variant="light" color="orange">
                              {THAI_MONTHS.find((m) => m.value === duplicate.assignment_month.toString())?.label} {duplicate.assignment_year}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              {duplicate.accounting_responsible_name && (
                                <Text size="xs">
                                  บัญชี: {duplicate.accounting_responsible_name}
                                </Text>
                              )}
                              {duplicate.tax_inspection_responsible_name && (
                                <Text size="xs">
                                  ตรวจภาษี: {duplicate.tax_inspection_responsible_name}
                                </Text>
                              )}
                              {duplicate.wht_filer_responsible_name && (
                                <Text size="xs">
                                  WHT: {duplicate.wht_filer_responsible_name}
                                </Text>
                              )}
                              {duplicate.vat_filer_responsible_name && (
                                <Text size="xs">
                                  VAT: {duplicate.vat_filer_responsible_name}
                                </Text>
                              )}
                              {duplicate.document_entry_responsible_name && (
                                <Text size="xs">
                                  คีย์เอกสาร: {duplicate.document_entry_responsible_name}
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setDuplicateDataModalOpened(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button
                color="green"
                disabled={isSaving}
                onClick={async () => {
                  // Check if there will be any items left to save after skipping incomplete items and duplicates
                  const incompleteBuilds = incompleteItems.map((i) => i.build)
                  const duplicateBuilds = duplicateItems.map((d) => d.build)
                  const itemsToSaveAfterSkip = previewData.filter(
                    (item) => !incompleteBuilds.includes(item.build) && !duplicateBuilds.includes(item.build)
                  )

                  if (itemsToSaveAfterSkip.length === 0) {
                    notifications.show({
                      title: 'ไม่มีข้อมูลใหม่ที่จะบันทึก',
                      message: `ทุกรายการ (${previewData.length} รายการ) มีข้อมูลซ้ำหรือข้อมูลไม่ครบ ไม่สามารถบันทึกได้`,
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                      autoClose: 15000,
                    })
                    return
                  }

                  setDuplicateDataModalOpened(false)
                  try {
                    // ใช้ target tax month จาก previewData
                    const firstItem = previewData[0]
                    const targetYear = firstItem?.target_tax_year || selectedTaxYear
                    const targetMonth = firstItem?.target_tax_month || selectedTaxMonth

                    if (targetYear && targetMonth !== null && targetMonth !== undefined) {
                      // Pass duplicate builds to skip them
                      const skipBuilds = [...incompleteItems.map((i) => i.build), ...duplicateItems.map((d) => d.build)]
                      await executeBulkSave(targetYear, targetMonth, skipBuilds)
                    }
                  } catch (error: unknown) {
                    console.error('Error in duplicate data confirmation:', error)
                    notifications.show({
                      title: 'เกิดข้อผิดพลาด',
                      message: error.message || 'เกิดข้อผิดพลาดในการดำเนินการ',
                      color: 'red',
                      icon: <TbAlertCircle size={16} />,
                    })
                  }
                }}
              >
                บันทึกเฉพาะข้อมูลใหม่
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Import Modal */}
        <WorkAssignmentImport
          opened={importModalOpened}
          onClose={() => setImportModalOpened(false)}
        />
      </Stack>
    </Box>
  )
}
