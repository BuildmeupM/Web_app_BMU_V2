/**
 * Company Detail Section Component
 * Section สำหรับแสดงรายละเอียดบริษัทและ submissions ทั้งหมด (แสดงแบบ inline ไม่ใช่ Modal)
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Stack,
  Group,
  Text,
  Badge,
  Accordion,
  SimpleGrid,
  Textarea,
  Divider,
  Loader,
  Center,
  Alert,
  Paper,
  Button,
} from '@mantine/core'
import { useQuery, useQueries, useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle, TbFileText, TbCheck, TbBuilding, TbId, TbWorld, TbCalendar, TbMapPin, TbUser } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWork } from '../../services/documentEntryWorkService'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import { employeeService } from '../../services/employeeService'
import clientsService from '../../services/clientsService'
import workAssignmentsService from '../../services/workAssignmentsService'
import SubmissionCard from './SubmissionCard'
import HeaderActionButtons from './HeaderActionButtons'
import SubmissionCountBadge from '../DocumentSorting/SubmissionCountBadge'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

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

// Helper function: Format date from database
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    const date = dayjs.utc(dateString).local()
    return date.format('DD/MM/YYYY HH:mm')
  } catch (error) {
    return dateString
  }
}

// Helper function: Format date only (without time)
const formatDateOnly = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    const date = dayjs.utc(dateString).local()
    return date.format('DD/MM/YYYY')
  } catch (error) {
    return dateString
  }
}

// Helper function: Format address from client data
const formatAddress = (client: any): string => {
  if (!client) return '-'

  // Use full_address if available
  if (client.full_address) {
    return client.full_address
  }

  // Otherwise, build from individual fields
  const parts: string[] = []

  if (client.address_number) parts.push(`เลขที่ ${client.address_number}`)
  if (client.soi) parts.push(`ซอย ${client.soi}`)
  if (client.moo) parts.push(`หมู่ ${client.moo}`)
  if (client.road) parts.push(`ถนน ${client.road}`)
  if (client.subdistrict) parts.push(`แขวง/ตำบล ${client.subdistrict}`)
  if (client.district) parts.push(`อำเภอ/เขต ${client.district}`)
  if (client.province) parts.push(`จังหวัด ${client.province}`)
  if (client.postal_code) parts.push(`รหัสไปรษณีย์ ${client.postal_code}`)

  return parts.length > 0 ? parts.join(' ') : '-'
}

interface CompanyDetailSectionProps {
  build: string
  companyName: string
  year: number
  month: number
}

export default function CompanyDetailSection({
  build,
  companyName,
  year,
  month,
}: CompanyDetailSectionProps) {
  const queryClient = useQueryClient()
  const [editingReturnComment, setEditingReturnComment] = useState<Record<string, string>>({})

  // Fetch all submissions for this company
  const {
    data: submissionsResponse,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery(
    ['document-entry-work', 'submissions', build, year, month],
    () =>
      documentEntryWorkService.getList({
        build,
        year,
        month,
        limit: 1000, // Get all submissions
      }),
    {
      enabled: !!build && !!year && !!month,
      staleTime: 0, // Always consider stale to allow immediate refetch
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: 'always', // Always refetch when component mounts
    }
  )

  // Fetch monthly tax data for company info and responsible employees
  const {
    data: taxDataResponse,
    isLoading: isLoadingTaxData,
  } = useQuery(
    ['monthly-tax-data', 'company-detail', build, year, month],
    () => monthlyTaxDataService.getByBuildYearMonth(build, year, month),
    {
      enabled: !!build && !!year && !!month,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Fetch work assignment data for accounting_responsible and tax_inspection_responsible
  const {
    data: workAssignmentData,
    isLoading: isLoadingWorkAssignment,
  } = useQuery(
    ['work-assignment', 'company-detail', build, year, month],
    () => workAssignmentsService.getByBuildYearMonth(build, year, month),
    {
      enabled: !!build && !!year && !!month,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: false, // Don't retry on 404 (work assignment might not exist)
    }
  )

  // Fetch client data for company information
  const {
    data: clientData,
    isLoading: isLoadingClient,
  } = useQuery(
    ['client', 'company-detail', build],
    () => clientsService.getByBuild(build),
    {
      enabled: !!build,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Get unique employee IDs for lookup
  const employeeIds = useMemo(() => {
    const ids = new Set<string>()
    if (submissionsResponse?.data) {
      submissionsResponse.data.forEach((entry) => {
        if (entry.responsible_employee_id) ids.add(entry.responsible_employee_id)
        if (entry.current_responsible_employee_id) ids.add(entry.current_responsible_employee_id)
        if (entry.wht_status_updated_by) ids.add(entry.wht_status_updated_by)
        if (entry.vat_status_updated_by) ids.add(entry.vat_status_updated_by)
        if (entry.non_vat_status_updated_by) ids.add(entry.non_vat_status_updated_by)
      })
    }
    // Get accounting_responsible and tax_inspection_responsible from work_assignments
    if (workAssignmentData) {
      if (workAssignmentData.accounting_responsible) ids.add(workAssignmentData.accounting_responsible)
      if (workAssignmentData.tax_inspection_responsible) ids.add(workAssignmentData.tax_inspection_responsible)
    }
    // Get document_entry_responsible, wht_filer, vat_filer from monthly_tax_data
    if (taxDataResponse) {
      if (taxDataResponse.document_entry_responsible) ids.add(taxDataResponse.document_entry_responsible)
      if (taxDataResponse.wht_filer_employee_id) ids.add(taxDataResponse.wht_filer_employee_id)
      if (taxDataResponse.vat_filer_employee_id) ids.add(taxDataResponse.vat_filer_employee_id)
    }
    return Array.from(ids)
  }, [submissionsResponse?.data, workAssignmentData, taxDataResponse])

  // Fetch employee data for all unique IDs using useQueries
  const employeeQueries = useQueries(
    employeeIds.map((employeeId) => ({
      queryKey: ['employee', employeeId],
      queryFn: () => employeeService.getById(employeeId),
      enabled: !!employeeId && employeeIds.length > 0 && !!build,
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: unknown) => {
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as { response?: { status?: number } }
          if (apiError.response?.status === 404 || apiError.response?.status === 429) {
            return false
          }
        }
        return failureCount < 1
      },
    }))
  )

  // Create employee map for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, { first_name: string; nick_name?: string | null }>()
    employeeQueries.forEach((query) => {
      const employee = query.data
      if (employee) {
        map.set(employee.employee_id, {
          first_name: employee.first_name,
          nick_name: employee.nick_name,
        })
      }
    })
    return map
  }, [employeeQueries])

  // Helper function to get employee name
  const getEmployeeName = (employeeId: string | null | undefined): string => {
    if (!employeeId) return '-'
    const employee = employeeMap.get(employeeId)
    if (employee) {
      return formatEmployeeName(employee.first_name, employee.nick_name)
    }
    return employeeId // Fallback to employee_id if not found
  }

  // Helper function to format employee name with ID (for work assignment names)
  const formatEmployeeNameWithId = useCallback(
    (
      name: string | null | undefined,
      employeeId: string | null | undefined
    ): string => {
      if (!name && !employeeId) return '-'

      // If name already contains parentheses, assume it's already formatted
      if (name && name.includes('(') && name.includes(')')) {
        return name
      }

      // Try to find employee by employee_id to get nickname
      if (employeeId && employeeMap.has(employeeId)) {
        const employee = employeeMap.get(employeeId)!
        if (employee.nick_name) {
          // Use first_name from employee data if available, otherwise extract from name
          const displayName = employee.first_name || (name ? name.trim().split(/\s+/)[0] : employeeId)
          return `${displayName}(${employee.nick_name})`
        }
        // If no nickname but have employee data, use first_name
        if (employee.first_name) {
          return employee.first_name
        }
      }

      // Return name as is if no nickname found, or use employeeId as fallback
      return name || employeeId || '-'
    },
    [employeeMap]
  )

  // Update return comment mutation
  const updateReturnCommentMutation = useMutation(
    ({ id, returnComment }: { id: string; returnComment: string | null }) => {
      const updateData = { return_comment: returnComment }
      console.log('🔧 Mutation called with:', { id, returnComment, updateData })
      console.log('📤 Calling documentEntryWorkService.update with:', { id, data: updateData })
      return documentEntryWorkService.update(id, updateData)
    },
    {
      onSuccess: () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'บันทึกความคิดเห็นสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        queryClient.invalidateQueries(['document-entry-work'])
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถบันทึกความคิดเห็นได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  const handleReturnCommentChange = (entryId: string, value: string) => {
    setEditingReturnComment((prev) => ({ ...prev, [entryId]: value }))
  }

  const handleReturnCommentSave = (entryId: string, entry: DocumentEntryWork) => {
    const newComment = editingReturnComment[entryId] ?? entry.return_comment ?? ''
    const currentComment = entry.return_comment || ''

    // Check if comment has changed (trim whitespace for comparison)
    if (newComment.trim() !== currentComment.trim()) {
      const commentToSave = newComment.trim() === '' ? null : newComment.trim()
      console.log('💾 Saving return comment:', {
        entryId,
        currentComment,
        newComment,
        commentToSave,
      })
      console.log('📤 Calling update with:', {
        id: entryId,
        data: { return_comment: commentToSave },
      })
      updateReturnCommentMutation.mutate({
        id: entryId,
        returnComment: commentToSave, // This will be mapped to return_comment in the mutation
      })
    } else {
      notifications.show({
        title: 'แจ้งเตือน',
        message: 'ไม่มีการเปลี่ยนแปลงข้อมูล',
        color: 'blue',
        icon: <TbFileText size={16} />,
      })
    }
  }

  const isLoading = isLoadingSubmissions || isLoadingTaxData || isLoadingWorkAssignment || isLoadingClient
  const submissions = submissionsResponse?.data || []
  const taxData = taxDataResponse
  const workAssignment = workAssignmentData
  const client = clientData

  // Get responsible employee (use current_responsible_employee_id if exists, otherwise responsible_employee_id)
  const getResponsibleEmployee = (entry: DocumentEntryWork): string => {
    const employeeId = entry.current_responsible_employee_id || entry.responsible_employee_id
    return getEmployeeName(employeeId)
  }

  // Sort submissions by submission_count descending (latest first)
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => (b.submission_count || 0) - (a.submission_count || 0))
  }, [submissions])

  return (
    <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
      {isLoading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : submissionsError ? (
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
          ไม่สามารถโหลดข้อมูลได้
        </Alert>
      ) : (
        <Stack gap="md">
          {/* Company Information Section */}
          <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#fff3e0' }}>
            <Group gap="xs" mb="md" p="xs" style={{ backgroundColor: '#ff6b35', borderRadius: '4px' }}>
              <TbBuilding size={20} color="white" />
              <Text size="md" fw={600} c="white">
                ข้อมูลบริษัท
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Group gap="xs">
                <TbCalendar size={16} color="#ff6b35" />
                <Text size="sm" fw={600}>
                  Build:
                </Text>
                <Badge variant="outline" color="orange">
                  {build}
                </Badge>
              </Group>
              <Group gap="xs">
                <TbBuilding size={16} color="#ff6b35" />
                <Text size="sm" fw={600}>
                  ชื่อบริษัท:
                </Text>
                <Text size="sm">{client?.company_name || companyName}</Text>
              </Group>
              {client?.legal_entity_number && (
                <Group gap="xs">
                  <TbId size={16} color="#ff6b35" />
                  <Text size="sm" fw={600}>
                    เลขทะเบียนนิติบุคคล:
                  </Text>
                  <Text size="sm">{client.legal_entity_number}</Text>
                </Group>
              )}
              <Group gap="xs">
                <TbWorld size={16} color="#ff6b35" />
                <Text size="sm" fw={600}>
                  ไซต์บริษัท:
                </Text>
                <Text size="sm">-</Text>
              </Group>
              {client?.tax_registration_status && (
                <Group gap="xs">
                  <TbFileText size={16} color="#ff6b35" />
                  <Text size="sm" fw={600}>
                    สถานะจดทะเบียนภาษี:
                  </Text>
                  <Text size="sm">{client.tax_registration_status}</Text>
                </Group>
              )}
              {client?.vat_registration_date && (
                <Group gap="xs">
                  <TbCalendar size={16} color="#ff6b35" />
                  <Text size="sm" fw={600}>
                    วันที่จดภาษีมูลค่าเพิ่ม:
                  </Text>
                  <Text size="sm">{formatDateOnly(client.vat_registration_date)}</Text>
                </Group>
              )}
              {client && (
                <Group gap="xs" style={{ gridColumn: '1 / -1' }}>
                  <TbMapPin size={16} color="#ff6b35" />
                  <Text size="sm" fw={600}>
                    ที่อยู่บริษัท:
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {formatAddress(client)}
                  </Text>
                </Group>
              )}
            </SimpleGrid>
          </Paper>

          {/* Responsible Employee Information Section */}
          {(workAssignment || taxData) && (
            <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#fff3e0' }}>
              <Group gap="xs" mb="md" p="xs" style={{ backgroundColor: '#ff6b35', borderRadius: '4px' }}>
                <TbUser size={20} color="white" />
                <Text size="md" fw={600} c="white">
                  ข้อมูลผู้รับผิดชอบ
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {/* Get accounting_responsible from work_assignments (fallback to monthly_tax_data) */}
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    ผู้ทำบัญชี:
                  </Text>
                  <Text size="sm">
                    {workAssignment && (workAssignment.accounting_responsible || workAssignment.accounting_responsible_name)
                      ? formatEmployeeNameWithId(
                        workAssignment.accounting_responsible_name || null,
                        workAssignment.accounting_responsible || null
                      )
                      : taxData?.accounting_responsible
                        ? getEmployeeName(taxData.accounting_responsible)
                        : '-'}
                  </Text>
                </Group>
                {/* Get tax_inspection_responsible from work_assignments (fallback to monthly_tax_data) */}
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    ผู้ตรวจภาษี:
                  </Text>
                  <Text size="sm">
                    {workAssignment && (workAssignment.tax_inspection_responsible || workAssignment.tax_inspection_responsible_name)
                      ? formatEmployeeNameWithId(
                        workAssignment.tax_inspection_responsible_name || null,
                        workAssignment.tax_inspection_responsible || null
                      )
                      : taxData?.tax_inspection_responsible
                        ? getEmployeeName(taxData.tax_inspection_responsible)
                        : '-'}
                  </Text>
                </Group>
                {/* Get document_entry_responsible from monthly_tax_data */}
                {taxData && (
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      พนักงานที่รับผิดชอบในการคีย์:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.document_entry_responsible) || '-'}</Text>
                  </Group>
                )}
                {/* Only show WHT and VAT filer if they have data */}
                {taxData?.wht_filer_employee_id && getEmployeeName(taxData.wht_filer_employee_id) !== '-' && (
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      พนักงานที่ยื่น WHT:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.wht_filer_employee_id)}</Text>
                  </Group>
                )}
                {taxData?.vat_filer_employee_id && getEmployeeName(taxData.vat_filer_employee_id) !== '-' && (
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      พนักงานที่ยื่น VAT:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.vat_filer_employee_id)}</Text>
                  </Group>
                )}
              </SimpleGrid>
            </Paper>
          )}

          {/* Submissions */}
          {sortedSubmissions.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              ยังไม่มีข้อมูลการส่งงานคีย์
            </Text>
          ) : (
            <Accordion variant="separated" radius="md">
              {sortedSubmissions.map((entry, index) => {
                const isLatest = index === 0
                const responsibleEmployee = getResponsibleEmployee(entry)
                const returnCommentValue = editingReturnComment[entry.id] ?? entry.return_comment ?? ''

                // ตรวจสอบว่าทุกประเภทเอกสาร "ที่มีข้อมูล" เสร็จสิ้นแล้วหรือไม่
                // ประเภทที่ไม่มีเอกสาร (count = 0) จะไม่นับเข้าเงื่อนไข
                const whtHasData = (entry.wht_document_count || 0) > 0
                const vatHasData = (entry.vat_document_count || 0) > 0
                const nonVatHasData = (entry.non_vat_document_count || 0) > 0

                const whtCompleted = !whtHasData || entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว'
                const vatCompleted = !vatHasData || entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว'
                const nonVatCompleted = !nonVatHasData || entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว'

                // เสร็จสิ้นเมื่อทุกประเภทที่มีข้อมูลเสร็จแล้ว (และต้องมีอย่างน้อย 1 ประเภทที่มีข้อมูล)
                const hasAnyData = whtHasData || vatHasData || nonVatHasData
                const isAllCompleted = hasAnyData && whtCompleted && vatCompleted && nonVatCompleted

                // ตรวจสอบว่าเป็นข้อมูลบอท (ไม่มีเอกสารทุกประเภท)
                const isBotData = !hasAnyData

                return (
                  <Accordion.Item key={entry.id} value={entry.id}>
                    <Accordion.Control>
                      <Group gap="xs" justify="space-between" style={{ flex: 1 }}>
                        <Group gap="xs">
                          <SubmissionCountBadge submissionCount={entry.submission_count || 1} />
                          {isLatest && (
                            <Badge color="green" variant="light" size="sm">
                              ล่าสุด
                            </Badge>
                          )}
                          <Text size="sm" c="dimmed">
                            {formatDate(entry.entry_timestamp)}
                          </Text>
                          <Text size="sm" c="dimmed">
                            ผู้รับผิดชอบ: {responsibleEmployee}
                          </Text>
                        </Group>
                        <Badge
                          color={
                            isBotData
                              ? 'violet'
                              : isAllCompleted
                                ? 'green'
                                : // ถ้ามีประเภทใดที่มีข้อมูลเสร็จแล้ว ให้แสดงเป็น "เสร็จบางส่วน" หรือ "กำลังดำเนินการ"
                                (whtHasData && entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                  (vatHasData && entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                  (nonVatHasData && entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว')
                                  ? 'yellow'
                                  : entry.wht_entry_status === 'กำลังดำเนินการ' ||
                                    entry.vat_entry_status === 'กำลังดำเนินการ' ||
                                    entry.non_vat_entry_status === 'กำลังดำเนินการ'
                                    ? 'yellow'
                                    : 'gray'
                          }
                          variant={
                            isBotData
                              ? 'light'
                              : isAllCompleted ||
                                (whtHasData && entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                (vatHasData && entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                (nonVatHasData && entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว')
                                ? 'outline'
                                : 'light'
                          }
                          style={
                            isBotData
                              ? undefined
                              : isAllCompleted
                                ? {
                                  borderColor: '#51cf66',
                                  color: '#51cf66',
                                  backgroundColor: 'transparent',
                                }
                                : (whtHasData && entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                  (vatHasData && entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                  (nonVatHasData && entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว')
                                  ? {
                                    borderColor: '#fab005',
                                    color: '#fab005',
                                    backgroundColor: 'transparent',
                                  }
                                  : undefined
                          }
                        >
                          {isBotData
                            ? 'ข้อมูลบอท'
                            : isAllCompleted
                              ? 'เสร็จสิ้น'
                              : // ถ้ามีประเภทใด(ที่มีข้อมูล)เสร็จแล้ว ให้แสดง "เสร็จบางส่วน"
                              (whtHasData && entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                (vatHasData && entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว') ||
                                (nonVatHasData && entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว')
                                ? 'เสร็จบางส่วน'
                                : entry.wht_entry_status === 'กำลังดำเนินการ' ||
                                  entry.vat_entry_status === 'กำลังดำเนินการ' ||
                                  entry.non_vat_entry_status === 'กำลังดำเนินการ'
                                  ? 'กำลังดำเนินการ'
                                  : 'รอดำเนินการ'}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {/* Action Buttons */}
                        <HeaderActionButtons entry={entry} disabled={updateReturnCommentMutation.isLoading || isAllCompleted} />

                        {/* Document Type Cards */}
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                          <SubmissionCard
                            documentType="wht"
                            documentCount={entry.wht_document_count || 0}
                            status={entry.wht_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.wht_entry_start_datetime}
                            completedDatetime={entry.wht_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading || isAllCompleted}
                          />
                          <SubmissionCard
                            documentType="vat"
                            documentCount={entry.vat_document_count || 0}
                            status={entry.vat_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.vat_entry_start_datetime}
                            completedDatetime={entry.vat_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading || isAllCompleted}
                          />
                          <SubmissionCard
                            documentType="non_vat"
                            documentCount={entry.non_vat_document_count || 0}
                            status={entry.non_vat_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.non_vat_entry_start_datetime}
                            completedDatetime={entry.non_vat_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading || isAllCompleted}
                          />
                        </SimpleGrid>

                        <Divider />

                        {/* Comments Section */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <div>
                            <Group gap="xs" mb="xs">
                              <TbFileText size={16} />
                              <Text size="sm" fw={600}>
                                ความคิดเห็นส่งมอบงานคีย์
                              </Text>
                            </Group>
                            <Paper withBorder p="sm" radius="sm" style={{ backgroundColor: '#f5f5f5' }}>
                              <Text size="sm" c={entry.submission_comment ? undefined : 'dimmed'}>
                                {entry.submission_comment || 'ไม่มีความคิดเห็น'}
                              </Text>
                            </Paper>
                          </div>
                          <div>
                            <Group gap="xs" mb="xs">
                              <TbFileText size={16} />
                              <Text size="sm" fw={600}>
                                ความคิดเห็นส่งคืนงานคีย์
                              </Text>
                            </Group>
                            <Textarea
                              placeholder="กรอกความคิดเห็นส่งคืนงานคีย์..."
                              value={returnCommentValue}
                              onChange={(e) => handleReturnCommentChange(entry.id, e.target.value)}
                              minRows={3}
                              disabled={updateReturnCommentMutation.isLoading || isAllCompleted}
                            />
                            <Group justify="flex-end" mt="xs">
                              <Button
                                size="xs"
                                color="orange"
                                leftSection={<TbCheck size={14} />}
                                onClick={() => handleReturnCommentSave(entry.id, entry)}
                                disabled={updateReturnCommentMutation.isLoading || returnCommentValue === (entry.return_comment || '') || isAllCompleted}
                                loading={updateReturnCommentMutation.isLoading}
                              >
                                บันทึก ความคิดเห็นส่งคืนงานคีย์
                              </Button>
                            </Group>
                          </div>
                        </SimpleGrid>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          )}
        </Stack>
      )}
    </Paper>
  )
}
