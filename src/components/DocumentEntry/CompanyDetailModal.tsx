/**
 * Company Detail Modal Component
 * Modal สำหรับแสดงรายละเอียดบริษัทและ submissions ทั้งหมด
 */

import { useState, useMemo } from 'react'
import {
  Modal,
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
} from '@mantine/core'
import { useQuery, useQueries, useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle, TbFileText, TbCheck } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWork } from '../../services/documentEntryWorkService'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import { employeeService } from '../../services/employeeService'
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

interface CompanyDetailModalProps {
  opened: boolean
  onClose: () => void
  build: string
  companyName: string
  year: number
  month: number
}

export default function CompanyDetailModal({
  opened,
  onClose,
  build,
  companyName,
  year,
  month,
}: CompanyDetailModalProps) {
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
      enabled: opened && !!build,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
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
      enabled: opened && !!build,
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
    if (taxDataResponse) {
      const taxData = taxDataResponse
      if (taxData.accounting_responsible) ids.add(taxData.accounting_responsible)
      if (taxData.tax_inspection_responsible) ids.add(taxData.tax_inspection_responsible)
      if (taxData.document_entry_responsible) ids.add(taxData.document_entry_responsible)
      if (taxData.wht_filer_employee_id) ids.add(taxData.wht_filer_employee_id)
      if (taxData.vat_filer_employee_id) ids.add(taxData.vat_filer_employee_id)
    }
    return Array.from(ids)
  }, [submissionsResponse?.data, taxDataResponse])

  // Fetch employee data for all unique IDs using useQueries
  const employeeQueries = useQueries(
    employeeIds.map((employeeId) => ({
      queryKey: ['employee', employeeId],
      queryFn: () => employeeService.getById(employeeId),
      enabled: !!employeeId && employeeIds.length > 0 && opened,
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

  // Update return comment mutation
  const updateReturnCommentMutation = useMutation(
    ({ id, returnComment }: { id: string; returnComment: string | null }) =>
      documentEntryWorkService.update(id, { return_comment: returnComment }),
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

  const handleReturnCommentBlur = (entryId: string, entry: DocumentEntryWork) => {
    const newComment = editingReturnComment[entryId] ?? entry.return_comment ?? ''
    if (newComment !== (entry.return_comment || '')) {
      updateReturnCommentMutation.mutate({
        id: entryId,
        returnComment: newComment || null,
      })
    }
  }

  const isLoading = isLoadingSubmissions || isLoadingTaxData
  const submissions = submissionsResponse?.data || []
  const taxData = taxDataResponse

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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <TbFileText size={20} />
          <Text fw={600}>รายละเอียดบริษัท: {companyName}</Text>
        </Group>
      }
      size="xl"
      centered
      scrollAreaComponent={({ children, ...others }) => (
        <div {...others} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {children}
        </div>
      )}
    >
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
          {/* Company Information */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  Build:
                </Text>
                <Badge variant="outline" color="orange">
                  {build}
                </Badge>
              </Group>
              {taxData && (
                <>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      ผู้ทำบัญชี:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.accounting_responsible)}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      ผู้ตรวจภาษี:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.tax_inspection_responsible)}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      ผู้รับผิดชอบในการคีย์:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.document_entry_responsible)}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      ผู้ยื่นภาษี WHT:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.wht_filer_employee_id)}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      ผู้ยื่นภาษี VAT:
                    </Text>
                    <Text size="sm">{getEmployeeName(taxData.vat_filer_employee_id)}</Text>
                  </Group>
                </>
              )}
            </Stack>
          </Paper>

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
                                : // ถ้ามีประเภทใดที่มีข้อมูลเสร็จแล้ว ให้แสดงเป็น "เสร็จบางส่วน"
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
                        <HeaderActionButtons entry={entry} disabled={updateReturnCommentMutation.isLoading} />

                        {/* Document Type Cards */}
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                          <SubmissionCard
                            documentType="wht"
                            documentCount={entry.wht_document_count || 0}
                            status={entry.wht_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.wht_entry_start_datetime}
                            completedDatetime={entry.wht_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading}
                          />
                          <SubmissionCard
                            documentType="vat"
                            documentCount={entry.vat_document_count || 0}
                            status={entry.vat_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.vat_entry_start_datetime}
                            completedDatetime={entry.vat_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading}
                          />
                          <SubmissionCard
                            documentType="non_vat"
                            documentCount={entry.non_vat_document_count || 0}
                            status={entry.non_vat_entry_status || 'ยังไม่ดำเนินการ'}
                            startDatetime={entry.non_vat_entry_start_datetime}
                            completedDatetime={entry.non_vat_entry_completed_datetime}
                            entryId={entry.id}
                            disabled={updateReturnCommentMutation.isLoading}
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
                              onBlur={() => handleReturnCommentBlur(entry.id, entry)}
                              minRows={3}
                              disabled={updateReturnCommentMutation.isLoading}
                            />
                            <Text size="xs" c="dimmed" mt={4}>
                              พิมพ์ความคิดเห็นแล้วกดออกจากช่องเพื่อบันทึกอัตโนมัติ
                            </Text>
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
    </Modal>
  )
}
