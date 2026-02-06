/**
 * Submission History Component
 * Component สำหรับแสดงประวัติการส่งข้อมูลก่อนหน้านี้
 */

import { Card, Table, Badge, Text, Stack, Loader, Center, Alert, Paper, SimpleGrid, Button, Group } from '@mantine/core'
import { useQuery, useQueries } from 'react-query'
import { TbAlertCircle, TbEdit } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWork } from '../../services/documentEntryWorkService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { employeeService, Employee } from '../../services/employeeService'
import { useMemo, Fragment } from 'react'

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

// Helper function: Format count — แสดง '-' เมื่อเป็น 0
const formatCount = (value: number | null | undefined): string => {
  if (value == null || value === 0) return '-'
  return value.toLocaleString()
}

// Helper function: Get status badge color
const getStatusColor = (status: string | null | undefined): string => {
  if (!status) return 'red'
  switch (status) {
    case 'ยังไม่ดำเนินการ':
      return 'red'
    case 'กำลังดำเนินการ':
      return 'yellow'
    case 'ดำเนินการเสร็จแล้ว':
      return 'green'
    default:
      return 'red'
  }
}

// แสดงสถานะเมื่อมีข้อมูล (count > 0) — รวม "ยังไม่ดำเนินการ" | ไม่มีข้อมูล (0) → ไม่แสดงสถานะ (แสดง '-')
const hasData = (count: number | null | undefined): boolean => {
  return (count ?? 0) > 0
}

interface SubmissionHistoryProps {
  build: string
  year: number
  month: number
  onEditEntry?: (entry: DocumentEntryWork) => void
}

export default function SubmissionHistory({ build, year, month, onEditEntry }: SubmissionHistoryProps) {
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch all submission history for this build, year, month
  const {
    data: submissionHistoryResponse,
    isLoading,
    error,
  } = useQuery(
    ['document-entry-work', 'history', build, year, month],
    () =>
      documentEntryWorkService.getList({
        build,
        year,
        month,
        limit: 1000, // Get all submissions
      }),
    {
      enabled: !!build,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Get unique employee IDs for lookup
  const employeeIds = useMemo(() => {
    if (!submissionHistoryResponse?.data) return []
    const ids = new Set<string>()
    submissionHistoryResponse.data.forEach((entry) => {
      if (entry.wht_status_updated_by) ids.add(entry.wht_status_updated_by)
      if (entry.vat_status_updated_by) ids.add(entry.vat_status_updated_by)
      if (entry.non_vat_status_updated_by) ids.add(entry.non_vat_status_updated_by)
    })
    return Array.from(ids)
  }, [submissionHistoryResponse?.data])

  // Fetch employee data for all unique IDs using useQueries
  const employeeQueries = useQueries(
    employeeIds.map((employeeId) => ({
      queryKey: ['employee', employeeId],
      queryFn: () => employeeService.getById(employeeId),
      enabled: !!employeeId && employeeIds.length > 0,
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry on 404 or 429
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

  if (isLoading) {
    return (
      <Card shadow="sm" radius="lg" withBorder p="md">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Card>
    )
  }

  if (error) {
    return (
      <Card shadow="sm" radius="lg" withBorder p="md">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
          ไม่สามารถโหลดประวัติการส่งข้อมูลได้
        </Alert>
      </Card>
    )
  }

  const submissionHistory = submissionHistoryResponse?.data || []

  if (submissionHistory.length === 0) {
    return (
      <Card shadow="sm" radius="lg" withBorder p="md">
        <Text size="sm" c="dimmed" ta="center" py="md">
          ยังไม่มีประวัติการส่งข้อมูล
        </Text>
      </Card>
    )
  }

  return (
    <Card shadow="sm" radius="lg" withBorder p="md">
      <Stack gap="md">
        <Text size="lg" fw={600}>
          ประวัติการส่งข้อมูลก่อนหน้านี้
        </Text>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Table.ScrollContainer minWidth={1000}>
            <Table
              styles={{
                thead: {
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--mantine-color-body)',
                  boxShadow: '0 1px 0 0 var(--mantine-color-default-border)',
                },
                th: {
                  backgroundColor: 'var(--mantine-color-body)',
                },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ครั้งที่</Table.Th>
                  <Table.Th>วันที่ส่ง</Table.Th>
                  <Table.Th>WHT</Table.Th>
                  <Table.Th>สถานะ WHT</Table.Th>
                  <Table.Th>ผู้อนุมัติ WHT</Table.Th>
                  <Table.Th>VAT</Table.Th>
                  <Table.Th>สถานะ VAT</Table.Th>
                  <Table.Th>ผู้อนุมัติ VAT</Table.Th>
                  <Table.Th>Non-VAT</Table.Th>
                  <Table.Th>สถานะ Non-VAT</Table.Th>
                  <Table.Th>ผู้อนุมัติ Non-VAT</Table.Th>
                  <Table.Th>บอท</Table.Th>
                  <Table.Th>จัดการ</Table.Th>
                </Table.Tr>
              </Table.Thead>
            <Table.Tbody>
              {submissionHistory.map((entry) => (
                <Fragment key={entry.id}>
                  <Table.Tr>
                    <Table.Td>
                      <Badge
                        variant="outline"
                        size="sm"
                        style={{
                          backgroundColor: '#fff',
                          borderColor: '#ff6b35',
                          color: '#ff6b35',
                        }}
                      >
                        ครั้งที่ {entry.submission_count}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(entry.entry_timestamp)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatCount(entry.wht_document_count)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {hasData(entry.wht_document_count) ? (
                        <Badge color={getStatusColor(entry.wht_entry_status)} variant="light" size="sm">
                          {entry.wht_entry_status || 'ยังไม่ดำเนินการ'}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{getEmployeeName(entry.wht_status_updated_by)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatCount(entry.vat_document_count)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {hasData(entry.vat_document_count) ? (
                        <Badge color={getStatusColor(entry.vat_entry_status)} variant="light" size="sm">
                          {entry.vat_entry_status || 'ยังไม่ดำเนินการ'}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{getEmployeeName(entry.vat_status_updated_by)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatCount(entry.non_vat_document_count)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {hasData(entry.non_vat_document_count) ? (
                        <Badge color={getStatusColor(entry.non_vat_entry_status)} variant="light" size="sm">
                          {entry.non_vat_entry_status || 'ยังไม่ดำเนินการ'}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{getEmployeeName(entry.non_vat_status_updated_by)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatCount(entry.bot_count)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {/* ตรวจสอบว่าสามารถแก้ไขได้หรือไม่ (สถานะทั้งหมดต้องเป็น "ยังไม่ดำเนินการ") */}
                      {(() => {
                        const canEdit = 
                          (entry.wht_entry_status === null || entry.wht_entry_status === 'ยังไม่ดำเนินการ') &&
                          (entry.vat_entry_status === null || entry.vat_entry_status === 'ยังไม่ดำเนินการ') &&
                          (entry.non_vat_entry_status === null || entry.non_vat_entry_status === 'ยังไม่ดำเนินการ')
                        
                        return canEdit && onEditEntry ? (
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<TbEdit size={14} />}
                            onClick={() => onEditEntry(entry)}
                          >
                            แก้ไข
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )
                      })()}
                    </Table.Td>
                  </Table.Tr>
                  {/* Comments Row - แสดงความคิดเห็นด้านล่างของแต่ละรายการ (แสดงทุกครั้ง) */}
                  <Table.Tr key={`${entry.id}-comments`}>
                    <Table.Td colSpan={13} style={{ paddingTop: 0, paddingBottom: '16px' }}>
                      <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <div>
                            <Text size="sm" fw={600} c="#ff6b35" mb={4}>
                              ความคิดเห็นส่งมอบงานคีย์:
                            </Text>
                            <Text 
                              size="sm" 
                              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                              c={entry.submission_comment ? 'dark' : 'dimmed'}
                            >
                              {entry.submission_comment || '-'}
                            </Text>
                          </div>
                          <div>
                            <Text size="sm" fw={600} c="#ff6b35" mb={4}>
                              ความคิดเห็นส่งคืนงานคีย์:
                            </Text>
                            <Text 
                              size="sm" 
                              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                              c={entry.return_comment ? 'dark' : 'dimmed'}
                            >
                              {entry.return_comment || '-'}
                            </Text>
                          </div>
                        </SimpleGrid>
                      </Paper>
                    </Table.Td>
                  </Table.Tr>
                </Fragment>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        </div>
      </Stack>
    </Card>
  )
}
