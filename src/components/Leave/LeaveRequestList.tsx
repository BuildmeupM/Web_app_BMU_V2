/**
 * Leave Request List Component
 * แสดงรายการการลางาน
 */

import { useState, memo } from 'react'
import {
  Stack,
  Group,
  Select,
  Table,
  Badge,
  Button,
  Pagination,
  Alert,
  Text,
  ActionIcon,
  Tooltip,
  Card,
  SimpleGrid,
  Paper,
  Divider,
  Modal,
  Title,
} from '@mantine/core'
import { TbRefresh, TbEye, TbCheck, TbX, TbCalendar, TbInfoCircle, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { leaveService, LeaveRequest } from '../../services/leaveService'
import { employeeService } from '../../services/employeeService'
import { useAuthStore } from '../../store/authStore'
import { DateInput } from '@mantine/dates'
import ApprovalModal from './ApprovalModal'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

interface LeaveRequestListProps {
  pendingOnly?: boolean
}

const LeaveRequestList = memo(function LeaveRequestList({ pendingOnly = false }: LeaveRequestListProps) {
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [status, setStatus] = useState<string | null>(pendingOnly ? 'รออนุมัติ' : null)
  const [leaveType, setLeaveType] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [approvalModalOpened, setApprovalModalOpened] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>('approve')
  const [rejectionReasonModalOpened, setRejectionReasonModalOpened] = useState(false)
  const [selectedRejectedRequest, setSelectedRejectedRequest] = useState<LeaveRequest | null>(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'

  // Get employee details if employee_id exists
  const { data: employeeListData } = useQuery(
    ['employee-by-id', user?.employee_id],
    () => employeeService.getAll({ search: user?.employee_id || '', limit: 1 }),
    {
      enabled: !!user?.employee_id && !pendingOnly,
      select: (data) => {
        const employee = data.employees.find(emp => emp.employee_id === user?.employee_id)
        return employee || null
      },
      retry: 1,
      refetchOnWindowFocus: false,
    }
  )

  const employeeData = employeeListData

  // Get leave dashboard data for leave entitlements
  const { data: leaveDashboardData } = useQuery(
    ['leave-dashboard', user?.employee_id],
    () => leaveService.getDashboard({ employee_id: user?.employee_id }),
    {
      enabled: !!user?.employee_id && !pendingOnly,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  )

  // Calculate leave entitlements by type
  const getLeaveEntitlement = (leaveType: string) => {
    const byType = leaveDashboardData?.data.by_type || {}
    const usedDays = byType[leaveType]?.days || 0

    switch (leaveType) {
      case 'ลาป่วย':
        return { used: usedDays, total: 30, unlimited: false }
      case 'ลากิจ':
        return { used: usedDays, total: 6, unlimited: false }
      case 'ลาพักร้อน':
        // Check if employee has worked for at least 1 year
        const hireDate = employeeData?.hire_date ? new Date(employeeData.hire_date) : null
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        const canRequestVacation = hireDate && hireDate <= oneYearAgo
        return { used: usedDays, total: 6, unlimited: false, canRequest: canRequestVacation }
      case 'ลาไม่รับค่าจ้าง':
        return { used: usedDays, total: null, unlimited: true }
      case 'ลาอื่นๆ':
        return { used: usedDays, total: null, unlimited: true }
      default:
        return { used: 0, total: 0, unlimited: false }
    }
  }

  // Fetch leave requests
  // For "ข้อมูลการลางาน" tab (history), always filter by own employee_id
  // For "ข้อมูลการขอลางาน" tab (pendingOnly), show all pending requests (admin only)
  const { data, isLoading, error, refetch } = useQuery(
    [
      'leave-requests',
      pendingOnly ? 'pending' : 'all',
      page,
      limit,
      status,
      leaveType,
      startDate,
      endDate,
      user?.employee_id, // Include employee_id in query key
    ],
    () =>
      leaveService.getAll({
        page,
        limit,
        status: status || undefined,
        leave_type: leaveType || undefined,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        // Always filter by own employee_id for history tab (not pendingOnly)
        // This ensures all users (including HR/Admin) see only their own leave data
        employee_id: !pendingOnly && user?.employee_id ? user.employee_id : undefined,
      }),
    {
      enabled: (!pendingOnly || isAdmin) && !!user?.employee_id, // Only fetch pending if admin, and require employee_id
    }
  )

  // Fetch pending requests if needed
  const { data: pendingData, isLoading: pendingLoading } = useQuery(
    ['leave-requests', 'pending', page, limit],
    () => leaveService.getPending({ page, limit }),
    {
      enabled: pendingOnly && isAdmin,
    }
  )

  // Fetch upcoming leaves (within 3 days) for pending page
  const { data: upcomingLeavesData } = useQuery(
    ['upcoming-leaves-pending'],
    async () => {
      // Use leaveService to fetch approved leaves within 3 days
      const response = await leaveService.getAll({
        status: 'อนุมัติแล้ว',
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
        limit: 100,
      })
      // Filter to only include leaves starting within 3 days
      const today = dayjs().startOf('day')
      const threeDaysLater = dayjs().add(3, 'day').endOf('day')
      return (response.data?.leave_requests || []).filter((leave: any) => {
        const startDate = dayjs(leave.leave_start_date).startOf('day')
        return (startDate.isAfter(today) || startDate.isSame(today)) &&
          (startDate.isBefore(threeDaysLater) || startDate.isSame(threeDaysLater))
      })
    },
    {
      enabled: pendingOnly && isAdmin,
      staleTime: 1 * 60 * 1000, // 1 minute cache
      retry: false,
    }
  )

  const displayData = pendingOnly ? pendingData : data
  const displayLoading = pendingOnly ? pendingLoading : isLoading
  const displayUpcomingLeaves = (upcomingLeavesData || [])

  // Fetch all employees to map nick_name (only for admin in pending view)
  const { data: allEmployeesData } = useQuery(
    ['all-employees-for-nickname'],
    () => employeeService.getAll({ limit: 10000 }),
    {
      enabled: isAdmin && pendingOnly, // Only fetch if admin viewing pending requests
      select: (data) => {
        // Create a map of employee_id -> nick_name
        const employeeMap = new Map<string, string>()
        data.employees.forEach((emp) => {
          if (emp.employee_id && emp.nick_name) {
            employeeMap.set(emp.employee_id, emp.nick_name)
          }
        })
        return employeeMap
      },
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Helper function to get employee name with nickname
  const getEmployeeDisplayName = (employeeName?: string, employeeId?: string, nickName?: string) => {
    if (!employeeName) return '-'
    const displayNickName = nickName || (allEmployeesData && employeeId ? allEmployeesData.get(employeeId) : undefined)
    if (displayNickName) {
      return `${employeeName} (${displayNickName})`
    }
    return employeeName
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'อนุมัติแล้ว':
        return 'green'
      case 'ไม่อนุมัติ':
        return 'red'
      case 'รออนุมัติ':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'รออนุมัติ':
        return {
          root: {
            backgroundColor: '#ffc107', // สีเหลือง
            color: '#000000',
            fontSize: '13px',
            fontWeight: 600,
            padding: '5px 10px',
          }
        }
      case 'อนุมัติแล้ว':
        return {
          root: {
            backgroundColor: '#28a745', // สีเขียว
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '5px 10px',
          }
        }
      case 'ไม่อนุมัติ':
        return {
          root: {
            backgroundColor: '#dc3545', // สีแดง
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '5px 10px',
          }
        }
      default:
        return {
          root: {
            backgroundColor: '#6c757d',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '5px 10px',
          }
        }
    }
  }

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'ลาป่วย':
        return 'blue'
      case 'ลากิจ':
        return 'orange'
      case 'ลาพักร้อน':
        return 'cyan'
      case 'ลาไม่รับค่าจ้าง':
        return 'gray'
      case 'ลาอื่นๆ':
        return 'violet'
      default:
        return 'gray'
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบภาษาไทย: "วัน (ชื่อวัน) ที่ (วันที่) (เดือน) (ปี พ.ศ.)"
   * @param {string} dateString วันที่ในรูปแบบ YYYY-MM-DD
   * @returns {string} วันที่ในรูปแบบภาษาไทย
   */
  const formatThaiDate = (dateString: string): string => {
    if (!dateString) return '-'

    const date = dayjs(dateString)
    const thaiWeekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ]

    const weekday = thaiWeekdays[date.day()]
    const day = date.date()
    const month = thaiMonths[date.month()]
    const year = date.year() + 543 // Convert to Buddhist Era

    return `${weekday} ที่ ${day} ${month} ${year}`
  }

  if (error) {
    return (
      <Alert icon={<TbRefresh size={16} />} color="red">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Leave Entitlements Card */}
      {!pendingOnly && user && (
        <Card
          withBorder
          padding="lg"
          radius="md"
          style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderColor: '#dee2e6',
          }}
        >
          <Stack gap="md">
            <Group gap="xs">
              <TbCalendar size={20} color="#495057" />
              <Text size="md" fw={700} c="#495057">
                สิทธิ์การลา
              </Text>
            </Group>

            <Divider color="#dee2e6" />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {/* ลาป่วย */}
              {(() => {
                const entitlement = getLeaveEntitlement('ลาป่วย')
                return (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c="#495057">
                          ลาป่วย
                        </Text>
                        <Text size="xs" c="dimmed">
                          30 วันต่อปี
                        </Text>
                      </Stack>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xl"
                        radius="md"
                        style={{
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '8px 12px',
                        }}
                      >
                        {entitlement.used}/{entitlement.total}
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลากิจ */}
              {(() => {
                const entitlement = getLeaveEntitlement('ลากิจ')
                return (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c="#495057">
                          ลากิจ
                        </Text>
                        <Text size="xs" c="dimmed">
                          6 วันต่อปี
                        </Text>
                      </Stack>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xl"
                        radius="md"
                        style={{
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '8px 12px',
                        }}
                      >
                        {entitlement.used}/{entitlement.total}
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลาพักร้อน */}
              {(() => {
                const entitlement = getLeaveEntitlement('ลาพักร้อน')
                return (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                      opacity: entitlement.canRequest === false ? 0.6 : 1,
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text size="sm" fw={600} c="#495057">
                            ลาพักร้อน
                          </Text>
                          {entitlement.canRequest === false && (
                            <Badge size="xs" color="orange" variant="dot">
                              ต้องทำงาน 1 ปี
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          6 วันต่อปี (ต้องทำงาน 1 ปี)
                        </Text>
                      </Stack>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xl"
                        radius="md"
                        style={{
                          backgroundColor: entitlement.canRequest === false ? '#adb5bd' : '#ff6b35',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '8px 12px',
                        }}
                      >
                        {entitlement.canRequest === false ? 'ไม่สามารถขอ' : `${entitlement.used}/${entitlement.total}`}
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลาไม่รับค่าจ้าง */}
              {(() => {
                const entitlement = getLeaveEntitlement('ลาไม่รับค่าจ้าง')
                return (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c="#495057">
                          ลาไม่รับค่าจ้าง
                        </Text>
                        <Text size="xs" c="dimmed">
                          ไม่จำกัดจำนวนวัน
                        </Text>
                      </Stack>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xl"
                        radius="md"
                        style={{
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '8px 12px',
                        }}
                      >
                        ไม่จำกัด
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลาอื่นๆ */}
              {(() => {
                const entitlement = getLeaveEntitlement('ลาอื่นๆ')
                return (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c="#495057">
                          ลาอื่นๆ
                        </Text>
                        <Text size="xs" c="dimmed">
                          ไม่จำกัดจำนวนวัน
                        </Text>
                      </Stack>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xl"
                        radius="md"
                        style={{
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '8px 12px',
                        }}
                      >
                        ไม่จำกัด
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}
            </SimpleGrid>
          </Stack>
        </Card>
      )}

      {/* Upcoming Leaves - Show in pending page */}
      {pendingOnly && isAdmin && displayUpcomingLeaves.length > 0 && (
        <Card withBorder padding="lg" radius="md">
          <Group mb="md">
            <TbCalendar size={20} color="#ff6b35" />
            <Title order={3}>พนักงานที่จะลาภายใน 3 วันข้างหน้า</Title>
          </Group>
          <Stack gap="xs">
            {displayUpcomingLeaves.map((leave: any) => {
              const startDate = dayjs(leave.leave_start_date)
              const endDate = dayjs(leave.leave_end_date)
              const daysUntilLeave = startDate.diff(dayjs(), 'day')

              return (
                <Group
                  key={leave.id}
                  justify="space-between"
                  p="sm"
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: daysUntilLeave <= 1 ? '#fff5f5' : 'white'
                  }}
                >
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={500}>
                        {getEmployeeDisplayName(leave.employee_name, leave.employee_id, leave.employee_nick_name)}
                      </Text>
                      {daysUntilLeave <= 1 && (
                        <Badge color="red" size="sm">ใกล้ถึงวันลา</Badge>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed">
                      {leave.employee_position || '-'}
                    </Text>
                  </Stack>
                  <Stack gap={4} align="flex-end">
                    <Badge color="orange">{leave.leave_type}</Badge>
                    <Text size="sm" fw={500}>
                      {startDate.format('DD/MM/YYYY') === endDate.format('DD/MM/YYYY')
                        ? formatThaiDate(leave.leave_start_date)
                        : `${formatThaiDate(leave.leave_start_date)} - ${formatThaiDate(leave.leave_end_date)}`}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {Math.round(leave.leave_days)} วัน
                      </Text>
                      {daysUntilLeave >= 0 && (
                        <Badge color={daysUntilLeave === 0 ? 'red' : daysUntilLeave === 1 ? 'orange' : 'blue'} size="sm">
                          {daysUntilLeave === 0 ? 'วันนี้' : daysUntilLeave === 1 ? 'พรุ่งนี้' : `อีก ${daysUntilLeave} วัน`}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Group>
              )
            })}
          </Stack>
        </Card>
      )}

      {/* Search & Filter */}
      {!pendingOnly && (
        <Group>
          <Select
            placeholder="สถานะ"
            data={[
              { value: 'รออนุมัติ', label: 'รออนุมัติ' },
              { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
              { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
            ]}
            value={status}
            onChange={setStatus}
            clearable
            style={{ width: 150 }}
          />
          <Select
            placeholder="ประเภทการลา"
            data={[
              { value: 'ลาป่วย', label: 'ลาป่วย' },
              { value: 'ลากิจ', label: 'ลากิจ' },
              { value: 'ลาพักร้อน', label: 'ลาพักร้อน' },
              { value: 'ลาไม่รับค่าจ้าง', label: 'ลาไม่รับค่าจ้าง' },
              { value: 'ลาอื่นๆ', label: 'ลาอื่นๆ' },
            ]}
            value={leaveType}
            onChange={setLeaveType}
            clearable
            style={{ width: 180 }}
          />
          <DateInput
            placeholder="วันที่เริ่มต้น"
            value={startDate}
            onChange={setStartDate}
            clearable
            style={{ width: 180 }}
          />
          <DateInput
            placeholder="วันที่สิ้นสุด"
            value={endDate}
            onChange={setEndDate}
            clearable
            style={{ width: 180 }}
          />
          <Button
            variant="subtle"
            leftSection={<TbRefresh size={16} />}
            onClick={() => {
              // Reset all filters
              setStatus(null)
              setLeaveType(null)
              setStartDate(null)
              setEndDate(null)
              setPage(1)
              // Refetch data
              refetch()
            }}
          >
            รีเซ็ต
          </Button>
        </Group>
      )}

      {/* Table */}
      {displayLoading ? (
        <Text>กำลังโหลดข้อมูล...</Text>
      ) : displayData?.data.leave_requests.length === 0 ? (
        <Alert color="blue">ไม่พบข้อมูลการลา</Alert>
      ) : (
        <>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>รหัสพนักงาน</Table.Th>
                <Table.Th>ชื่อ-นามสกุล</Table.Th>
                <Table.Th>วันที่ขอลา</Table.Th>
                <Table.Th>วันที่ลา</Table.Th>
                <Table.Th>ประเภทการลา</Table.Th>
                <Table.Th>หมายเหตุ</Table.Th>
                <Table.Th>จำนวนวัน</Table.Th>
                <Table.Th>สถานะ</Table.Th>
                {isAdmin && <Table.Th>จัดการ</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {displayData?.data.leave_requests.map((request: LeaveRequest) => (
                <Table.Tr key={request.id}>
                  <Table.Td>{request.employee_id}</Table.Td>
                  <Table.Td>
                    {getEmployeeDisplayName(
                      request.employee_name,
                      request.employee_id,
                      request.employee_nick_name
                    )}
                  </Table.Td>
                  <Table.Td>{formatThaiDate(request.request_date)}</Table.Td>
                  <Table.Td>
                    {request.leave_start_date === request.leave_end_date
                      ? formatThaiDate(request.leave_start_date)
                      : `${formatThaiDate(request.leave_start_date)} - ${formatThaiDate(request.leave_end_date)}`}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color="orange"
                      variant="filled"
                      size="lg"
                      styles={{
                        root: {
                          backgroundColor: '#ff6b35',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 600,
                          padding: '6px 10px',
                        }
                      }}
                    >
                      {request.leave_type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={request.reason ? undefined : 'dimmed'} lineClamp={2}>
                      {request.reason || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>{Math.round(request.leave_days)} วัน</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge
                        color={getStatusColor(request.status)}
                        variant="filled"
                        size="lg"
                        styles={getStatusBadgeStyles(request.status)}
                      >
                        {request.status}
                      </Badge>
                      {request.status === 'ไม่อนุมัติ' && request.approver_note && (
                        <Tooltip label="ดูเหตุผลการปฏิเสธ">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => {
                              setSelectedRejectedRequest(request)
                              setRejectionReasonModalOpened(true)
                            }}
                          >
                            <TbInfoCircle size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                  {isAdmin && pendingOnly && (
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="อนุมัติ">
                          <ActionIcon
                            variant="subtle"
                            color="green"
                            onClick={() => {
                              setSelectedRequest(request)
                              setApprovalMode('approve')
                              setApprovalModalOpened(true)
                            }}
                          >
                            <TbCheck size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="ปฏิเสธ">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => {
                              setSelectedRequest(request)
                              setApprovalMode('reject')
                              setApprovalModalOpened(true)
                            }}
                          >
                            <TbX size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  )}
                  {isAdmin && !pendingOnly && (
                    <Table.Td>
                      <Tooltip label="ดูรายละเอียด">
                        <ActionIcon variant="subtle" color="blue">
                          <TbEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {/* Pagination */}
          {displayData?.data.pagination.totalPages && displayData.data.pagination.totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination
                value={page}
                onChange={setPage}
                total={displayData.data.pagination.totalPages}
              />
            </Group>
          )}
        </>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        opened={rejectionReasonModalOpened}
        onClose={() => {
          setRejectionReasonModalOpened(false)
          setSelectedRejectedRequest(null)
        }}
        title="เหตุผลการปฏิเสธการลา"
        size="lg"
        centered
        styles={{
          content: {
            maxWidth: '900px',
          }
        }}
      >
        {selectedRejectedRequest && (
          <Stack gap="md">
            <Card withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">รหัสพนักงาน:</Text>
                  <Text fw={500}>{selectedRejectedRequest.employee_id}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">ชื่อ-นามสกุล:</Text>
                  <Text fw={500}>
                    {getEmployeeDisplayName(
                      selectedRejectedRequest.employee_name,
                      selectedRejectedRequest.employee_id,
                      selectedRejectedRequest.employee_nick_name
                    )}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">วันที่ลา:</Text>
                  <Text fw={500}>
                    {selectedRejectedRequest.leave_start_date === selectedRejectedRequest.leave_end_date
                      ? formatThaiDate(selectedRejectedRequest.leave_start_date)
                      : `${formatThaiDate(selectedRejectedRequest.leave_start_date)} - ${formatThaiDate(selectedRejectedRequest.leave_end_date)}`}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">ประเภทการลา:</Text>
                  <Badge color="orange" variant="filled">
                    {selectedRejectedRequest.leave_type}
                  </Badge>
                </Group>
              </Stack>
            </Card>

            <Divider />

            <Stack gap="xs">
              <Title order={5} c="red">เหตุผลที่ไม่อนุมัติ:</Title>
              <Card withBorder p="md" style={{ backgroundColor: '#fff5f5' }}>
                <Text>{selectedRejectedRequest.approver_note || 'ไม่มีเหตุผลระบุ'}</Text>
              </Card>
            </Stack>

            {selectedRejectedRequest.approved_at && (
              <Text size="xs" c="dimmed" ta="right">
                อนุมัติเมื่อ: {formatThaiDate(selectedRejectedRequest.approved_at.split(' ')[0])}
              </Text>
            )}
          </Stack>
        )}
      </Modal>

      {/* Approval Modal */}
      {isAdmin && selectedRequest && (
        <ApprovalModal
          opened={approvalModalOpened}
          onClose={() => {
            setApprovalModalOpened(false)
            setSelectedRequest(null)
          }}
          type="leave"
          requestId={selectedRequest.id}
          requestData={{
            employee_name: selectedRequest.employee_name,
            employee_id: selectedRequest.employee_id,
            leave_type: selectedRequest.leave_type,
            leave_start_date: selectedRequest.leave_start_date,
            leave_end_date: selectedRequest.leave_end_date,
            status: selectedRequest.status,
          }}
          mode={approvalMode}
        />
      )}
    </Stack>
  )
})

export default LeaveRequestList
