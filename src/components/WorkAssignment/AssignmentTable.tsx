/**
 * AssignmentTable — ตารางแสดงรายการจัดงานรายเดือน
 * Extracted from WorkAssignment page (lines 1832-2162)
 */
import {
  Card, Table, Text, Badge, Group, ActionIcon, Tooltip, Alert,
  Button, Center, Stack, Loader, Pagination,
} from '@mantine/core'
import { TbEdit, TbRefresh, TbAlertCircle, TbUserEdit, TbTrash } from 'react-icons/tb'
import { THAI_MONTHS } from './constants'
import type { WorkAssignment as WorkAssignmentType } from '../../services/workAssignmentsService'

interface AssignmentTableProps {
  assignmentsData: {
    data: WorkAssignmentType[]
    pagination: { totalPages: number; total?: number }
  } | undefined
  isLoading: boolean
  isRefetching: boolean
  error: unknown
  page: number
  setPage: (p: number) => void
  formatEmployeeNameWithId: (name: string | null | undefined, employeeId: string | null | undefined) => string
  handleRefresh: () => void
  handleEdit: (assignment: WorkAssignmentType) => void
  handleReset: (assignment: WorkAssignmentType) => void
  onChangeResponsible: (assignment: WorkAssignmentType) => void
  onDeleteAssignment: (assignment: WorkAssignmentType) => void
  // For empty state display
  year: string | null
  month: string | null
  getViewMonth: () => { year: number; month: number }
  setYear: (v: string | null) => void
  setMonth: (v: string | null) => void
  setBuild: (v: string) => void
  setSearch: (v: string) => void
}

export default function AssignmentTable({
  assignmentsData, isLoading, isRefetching, error, page, setPage,
  formatEmployeeNameWithId, handleRefresh, handleEdit, handleReset,
  onChangeResponsible, onDeleteAssignment,
  year, month, getViewMonth, setYear, setMonth, setBuild, setSearch,
}: AssignmentTableProps) {
  const thStyle = { backgroundColor: 'white', color: 'black', border: 'none' }
  const tdStyle = { backgroundColor: 'white', color: 'black', border: 'none' }

  return (
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
            <Button variant="light" size="sm" leftSection={<TbRefresh size={16} />} onClick={handleRefresh} mt="xs">
              ลองใหม่
            </Button>
          </Stack>
        </Alert>
      ) : assignmentsData?.data.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text c="dimmed" size="lg" fw={500}>ไม่พบข้อมูลการจัดงาน</Text>
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
                <Button variant="light" size="sm" onClick={() => { setYear(null); setMonth(null); setBuild(''); setSearch('') }} mt="md">
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
              style={{ borderCollapse: 'separate', borderSpacing: 0 }}
              styles={{ th: { border: 'none !important' }, td: { border: 'none !important' } }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={thStyle}>Build</Table.Th>
                  <Table.Th style={thStyle}>บริษัท</Table.Th>
                  <Table.Th style={thStyle}>เดือน/ปี</Table.Th>
                  <Table.Th style={thStyle}>ทำบัญชี</Table.Th>
                  <Table.Th style={thStyle}>ตรวจภาษี</Table.Th>
                  <Table.Th style={thStyle}>ยื่น WHT</Table.Th>
                  <Table.Th style={thStyle}>ยื่น VAT</Table.Th>
                  <Table.Th style={thStyle}>คีย์เอกสาร</Table.Th>
                  <Table.Th style={thStyle}>จัดการ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {assignmentsData?.data.map((assignment) => (
                  <Table.Tr key={assignment.id}>
                    <Table.Td style={tdStyle}>
                      <Text fw={500} c="black">{assignment.build}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{assignment.company_name || '-'}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Badge variant="outline" color="orange" size="sm"
                        style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
                        {THAI_MONTHS.find((m) => m.value === assignment.assignment_month.toString())?.label || assignment.assignment_month} {assignment.assignment_year}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.accounting_responsible_name, assignment.accounting_responsible)}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.tax_inspection_responsible_name, assignment.tax_inspection_responsible)}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.wht_filer_responsible_name, assignment.wht_filer_responsible)}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.vat_filer_responsible_name, assignment.vat_filer_responsible)}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="black">{formatEmployeeNameWithId(assignment.document_entry_responsible_name, assignment.document_entry_responsible)}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Group gap="xs">
                        <Tooltip label="แก้ไข">
                          <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(assignment)}>
                            <TbEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="เปลี่ยนผู้รับผิดชอบ">
                          <ActionIcon variant="subtle" color="violet" onClick={() => onChangeResponsible(assignment)}>
                            <TbUserEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {!assignment.is_reset_completed && (
                          <Tooltip label="รีเซ็ตข้อมูล">
                            <ActionIcon variant="subtle" color="orange" onClick={() => handleReset(assignment)}>
                              <TbRefresh size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="ลบ">
                          <ActionIcon variant="subtle" color="red" onClick={() => onDeleteAssignment(assignment)}>
                            <TbTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
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
              <Pagination value={page} onChange={setPage} total={assignmentsData.pagination.totalPages} radius="lg" />
            </Group>
          )}
        </>
      )}
    </Card>
  )
}
