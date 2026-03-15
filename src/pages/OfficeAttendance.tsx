import {
  Box,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Loader,
  Center,
  Alert,
  Tooltip,
  Avatar,
  RingProgress,
  Table,
  ScrollArea,
  ActionIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  TbBuilding,
  TbHome,
  TbBeach,
  TbUsers,
  TbCake,
  TbUserPlus,
  TbClock,
  TbCalendarEvent,
  TbAlertCircle,
  TbBriefcase,
  TbSettings,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import {
  attendanceDashboardService,
  type EmployeeAttendance,
} from '../services/attendanceDashboardService'
import { positionGroupService } from '../services/positionGroupService'
import PositionGroupModal from '../components/PositionGroupModal'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

// Helper: format name as ชื่อ(ชื่อเล่น)
function formatName(firstName: string, nickName: string | null): string {
  if (nickName) {
    return `${firstName}(${nickName})`
  }
  return firstName
}

// Helper: format Thai date
function formatThaiDate(dateStr: string): string {
  const date = new Date(dateStr)
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  return `${day} ${month}`
}

// Helper: format full Thai date with year
function formatThaiDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  return `${day} ${month} ${year}`
}

// Summary stat card UI
function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  subtitle?: string
}) {
  return (
    <Paper
      p="md"
      radius="lg"
      shadow="sm"
      style={{
        borderLeft: `4px solid var(--mantine-color-${color}-6)`,
        background: 'var(--mantine-color-body)',
      }}
    >
      <Group gap="sm">
        <ThemeIcon size={44} radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </div>
      </Group>
    </Paper>
  )
}

// Employee card with color-coded status
function EmployeeStatusCard({ employee }: { employee: EmployeeAttendance }) {
  const statusConfig = {
    office: { color: 'green', label: 'เข้าออฟฟิศ', icon: <TbBuilding size={14} /> },
    leave: { color: 'red', label: employee.leave_type || 'ลางาน', icon: <TbBeach size={14} /> },
    wfh: { color: 'yellow', label: 'WFH', icon: <TbHome size={14} /> },
  }

  const config = statusConfig[employee.attendance_status]

  return (
    <Tooltip
      label={`${formatName(employee.first_name, employee.nick_name)} — ${config.label}`}
      withArrow
    >
      <Paper
        p="xs"
        radius="md"
        shadow="xs"
        style={{
          border: `2px solid var(--mantine-color-${config.color}-${employee.attendance_status === 'wfh' ? '5' : '6'})`,
          backgroundColor: '#fff',
          cursor: 'default',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
           (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
           (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
        }}
      >
        <Group gap={6} wrap="nowrap">
          <Avatar
            size={28}
            radius="xl"
            color={config.color}
            src={employee.profile_image}
          >
            {employee.first_name?.charAt(0)}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text size="xs" fw={600} truncate>
              {formatName(employee.first_name, employee.nick_name)}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color={config.color}
              leftSection={config.icon}
            >
              {config.label}
            </Badge>
          </div>
        </Group>
      </Paper>
    </Tooltip>
  )
}

// Holiday interface
interface Holiday {
  id: string
  holiday_date: string
  name: string
  name_en: string | null
  year: number
  is_active: boolean
}

export default function OfficeAttendance() {
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'

  // Fetch dashboard data (react-query v3 syntax)
  const { data, isLoading, error } = useQuery(
    ['attendance-dashboard', today],
    () => attendanceDashboardService.getDashboard(today)
  )

  // Fetch position groups from API
  const { data: positionGroupsData } = useQuery(
    'position-groups',
    positionGroupService.getAll
  )

  // Fetch holidays (react-query v3 syntax)
  const buddhistYear = currentYear + 543
  const { data: holidaysData } = useQuery(
    ['holidays', buddhistYear],
    async () => {
      const response = await api.get(`/holidays?year=${buddhistYear}&active_only=true`)
      return response.data.data?.holidays as Holiday[] ?? []
    }
  )

  if (isLoading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text c="dimmed">กำลังโหลดข้อมูล...</Text>
        </Stack>
      </Center>
    )
  }

  if (error || !data) {
    return (
      <Box px="md" py="md">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      </Box>
    )
  }

  const { summary, by_position, employees, birthdays_this_month, new_hires, probation_ending } = data

  // Compute ring progress values
  const officePercent = summary.total > 0 ? Math.round((summary.office / summary.total) * 100) : 0
  const leavePercent = summary.total > 0 ? Math.round((summary.leave / summary.total) * 100) : 0
  const wfhPercent = summary.total > 0 ? Math.round((summary.wfh / summary.total) * 100) : 0

  // Only include non-zero sections in ring chart
  const ringProgressSections = [
    ...(officePercent > 0 ? [{ value: officePercent, color: 'green', tooltip: `เข้าออฟฟิศ ${summary.office} คน` }] : []),
    ...(leavePercent > 0 ? [{ value: leavePercent, color: 'red', tooltip: `ลางาน ${summary.leave} คน` }] : []),
    ...(wfhPercent > 0 ? [{ value: wfhPercent, color: 'yellow', tooltip: `WFH ${summary.wfh} คน` }] : []),
  ]

  // Department grouping from API (fallback to default if not loaded)
  const defaultGroups = [
    { name: 'กลุ่มบัญชี', color: 'orange', positions: ['บัญชี-หัวหน้าบัญชี', 'บัญชี', 'บัญชี-ทดลองงาน', 'คีย์ข้อมูล', 'บัญชี-ฝึกงาน'] },
    { name: 'กลุ่มทะเบียน', color: 'orange', positions: ['ทะเบียน'] },
    { name: 'กลุ่มตรวจสอบภายใน / ปิดงบ', color: 'orange', positions: ['ตรวจสอบภายใน'] },
    { name: 'กลุ่มออกแบบ / การตลาด', color: 'orange', positions: ['ออกแบบ', 'การตลาด-ฝึกงาน'] },
    { name: 'กลุ่มนักพัฒนา / ข้อมูล / อุปกรณ์', color: 'orange', positions: ['ไอที'] },
  ]
  const departmentGroups = (positionGroupsData && positionGroupsData.length > 0)
    ? positionGroupsData.map(g => ({ name: g.name, color: g.color || 'orange', positions: g.positions }))
    : defaultGroups

  // Map employees into department groups
  const groupedEmployees = departmentGroups.map((group) => {
    const emps = employees.filter((emp) =>
      group.positions.includes(emp.position || '')
    ).sort((a, b) => {
      // Sort by position order within group first, then by name
      const posIndexA = group.positions.indexOf(a.position || '')
      const posIndexB = group.positions.indexOf(b.position || '')
      if (posIndexA !== posIndexB) return posIndexA - posIndexB
      return a.first_name.localeCompare(b.first_name, 'th')
    })
    return { ...group, employees: emps }
  })

  // Catch employees that don't match any group
  const allGroupedPositions = departmentGroups.flatMap((g) => g.positions)
  const ungroupedEmployees = employees.filter(
    (emp) => !allGroupedPositions.includes(emp.position || '')
  ).sort((a, b) => a.first_name.localeCompare(b.first_name, 'th'))

  // Calculate 3-month-ahead cutoff (current month + 2 more months)
  const threeMonthsLater = new Date(currentYear, new Date().getMonth() + 3, 0) // last day of 3rd month
  const threeMonthsCutoff = threeMonthsLater.toISOString().split('T')[0]
  const currentMonthStart = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  // Filter holidays: current month to 3 months ahead
  const relevantHolidays = (holidaysData || [])
    .filter((h) => h.holiday_date >= currentMonthStart && h.holiday_date <= threeMonthsCutoff)

  // Upcoming holidays (today or later, within 3 months)
  const upcomingHolidays = relevantHolidays
    .filter((h) => h.holiday_date >= today)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))

  // Past holidays this month only
  const pastHolidays = relevantHolidays
    .filter((h) => h.holiday_date < today)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))

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
        {/* ======== HEADER ======== */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>ข้อมูลเข้าออฟฟิศ</Title>
            <Text c="dimmed" size="sm">
              วันที่ {formatThaiDateFull(today)}
            </Text>
          </div>
        </Group>

        {/* ======== SECTION 1: SUMMARY STATS ======== */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <StatCard
            icon={<TbUsers size={22} />}
            label="พนักงานทั้งหมด"
            value={summary.total}
            color="blue"
            subtitle="คน"
          />
          <StatCard
            icon={<TbBuilding size={22} />}
            label="เข้าออฟฟิศ"
            value={summary.office}
            color="green"
            subtitle="คน"
          />
          <StatCard
            icon={<TbBeach size={22} />}
            label="ลางาน"
            value={summary.leave}
            color="red"
            subtitle="คน"
          />
          <StatCard
            icon={<TbHome size={22} />}
            label="WFH"
            value={summary.wfh}
            color="yellow"
            subtitle="คน"
          />
        </SimpleGrid>

        {/* ======== SUMMARY BY POSITION + RING CHART ======== */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card shadow="sm" radius="lg" padding="md" withBorder>
              <Group gap="xs" mb="sm">
                <ThemeIcon size={28} radius="md" color="grape" variant="light">
                  <TbBriefcase size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm">สรุปตามแผนก / ตำแหน่ง</Text>
              </Group>
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ตำแหน่ง</Table.Th>
                      <Table.Th ta="center">ทั้งหมด</Table.Th>
                      <Table.Th ta="center">
                        <Badge color="green" variant="light" size="xs">เข้าออฟฟิศ</Badge>
                      </Table.Th>
                      <Table.Th ta="center">
                        <Badge color="red" variant="light" size="xs">ลา</Badge>
                      </Table.Th>
                      <Table.Th ta="center">
                        <Badge color="yellow" variant="light" size="xs">WFH</Badge>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {by_position.map((pos) => (
                      <Table.Tr key={pos.position}>
                        <Table.Td fw={500}>{pos.position}</Table.Td>
                        <Table.Td ta="center">{pos.total}</Table.Td>
                        <Table.Td ta="center">
                          <Text c="green" fw={600}>{pos.office}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text c="red" fw={600}>{pos.leave}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text c="yellow.7" fw={600}>{pos.wfh}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" radius="lg" padding="md" withBorder h="100%">
              <Text fw={700} size="sm" mb="md" ta="center">สัดส่วนการเข้างาน</Text>
              <Center>
                <RingProgress
                  size={180}
                  thickness={20}
                  roundCaps
                  label={
                    <Text size="lg" ta="center" fw={700}>
                      {summary.total}
                      <Text size="xs" c="dimmed">คน</Text>
                    </Text>
                  }
                  sections={ringProgressSections}
                />
              </Center>
              <Group justify="center" gap="lg" mt="md">
                <Group gap={4}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-green-6)' }} />
                  <Text size="xs">ออฟฟิศ {officePercent}%</Text>
                </Group>
                <Group gap={4}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-red-6)' }} />
                  <Text size="xs">ลา {leavePercent}%</Text>
                </Group>
                <Group gap={4}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-yellow-5)' }} />
                  <Text size="xs">WFH {wfhPercent}%</Text>
                </Group>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* ======== SECTION 2: EMPLOYEE STATUS GRID (sorted by position) ======== */}
        <Card shadow="sm" radius="lg" padding="md" withBorder>
          <Group gap="xs" mb="md" justify="space-between">
            <Group gap="xs">
              <ThemeIcon size={28} radius="md" color="teal" variant="light">
                <TbUsers size={16} />
              </ThemeIcon>
              <Text fw={700} size="sm">สถานะพนักงานทั้งหมด</Text>
              <Text size="xs" c="dimmed">({employees.length} คน)</Text>
            </Group>
            {isAdmin && (
              <Tooltip label="จัดกลุ่มตำแหน่ง" withArrow>
                <ActionIcon variant="light" color="gray" size="md" onClick={openGroupModal}>
                  <TbSettings size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          <Stack gap="lg">
            {groupedEmployees.filter((g) => g.employees.length > 0).map((group) => {
              // Check if this group has multiple positions (needs sub-grouping)
              const hasSubGroups = group.positions.length > 1
              const subGroups = hasSubGroups
                ? group.positions
                  .map((pos) => ({
                    position: pos,
                    emps: group.employees.filter((emp) => emp.position === pos),
                  }))
                  .filter((sg) => sg.emps.length > 0)
                : null

              return (
                <Paper key={group.name} p="md" radius="md" style={{ border: `1px solid var(--mantine-color-${group.color}-4)` }}>
                  <Group gap="xs" mb={8}>
                    <Badge variant="filled" color={group.color} size="sm" radius="sm">{group.name}</Badge>
                    <Text size="xs" c="dimmed">({group.employees.length} คน)</Text>
                  </Group>
                  {subGroups ? (
                    <Stack gap="sm">
                      {subGroups.map((sg) => (
                        <div key={sg.position}>
                          <Text size="xs" c="dimmed" fw={600} mb={4} ml={4}>
                            ▸ {sg.position} ({sg.emps.length})
                          </Text>
                          <SimpleGrid
                            cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 7 }}
                            spacing="xs"
                          >
                            {sg.emps.map((emp) => (
                              <EmployeeStatusCard key={emp.id} employee={emp} />
                            ))}
                          </SimpleGrid>
                        </div>
                      ))}
                    </Stack>
                  ) : (
                    <SimpleGrid
                      cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 7 }}
                      spacing="xs"
                    >
                      {group.employees.map((emp) => (
                        <EmployeeStatusCard key={emp.id} employee={emp} />
                      ))}
                    </SimpleGrid>
                  )}
                </Paper>
              )
            })}
            {ungroupedEmployees.length > 0 && (
              <Paper p="md" radius="md" style={{ border: '1px solid #000' }}>
                <Group gap="xs" mb={8}>
                  <Badge variant="filled" color="gray" size="sm" radius="sm">อื่นๆ</Badge>
                  <Text size="xs" c="dimmed">({ungroupedEmployees.length} คน)</Text>
                </Group>
                <SimpleGrid
                  cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 7 }}
                  spacing="xs"
                >
                  {ungroupedEmployees.map((emp) => (
                    <EmployeeStatusCard key={emp.id} employee={emp} />
                  ))}
                </SimpleGrid>
              </Paper>
            )}
          </Stack>
        </Card>

        {/* Position Group Management Modal */}
        <PositionGroupModal
          opened={groupModalOpened}
          onClose={closeGroupModal}
        />

        {/* ======== SECTION 3: INFO PANELS ======== */}
        <Grid gutter="md">
          {/* Birthdays */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" radius="lg" padding="md" withBorder h="100%">
              <Group gap="xs" mb="md">
                <ThemeIcon size={28} radius="md" color="pink" variant="light">
                  <TbCake size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm">🎂 วันเกิดเดือนนี้</Text>
                <Badge size="sm" variant="light" color="pink">{birthdays_this_month.length}</Badge>
              </Group>
              {birthdays_this_month.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">ไม่มีวันเกิดในเดือนนี้</Text>
              ) : (
                <Stack gap="xs">
                  {birthdays_this_month.map((emp) => {
                    const isToday = emp.birth_day === new Date().getDate()
                    return (
                      <Paper
                        key={emp.id}
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: isToday ? 'var(--mantine-color-pink-0)' : undefined,
                          border: isToday ? '1px solid var(--mantine-color-pink-3)' : '1px solid var(--mantine-color-gray-2)',
                        }}
                      >
                        <Group justify="space-between">
                          <Text size="sm" fw={isToday ? 700 : 500}>
                            {isToday && '🎉 '}
                            {formatName(emp.first_name, emp.nick_name)}
                          </Text>
                          <Badge size="sm" variant="outline" color="pink">
                            {formatThaiDate(emp.birth_date)}
                          </Badge>
                        </Group>
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Card>
          </Grid.Col>

          {/* New Hires */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" radius="lg" padding="md" withBorder h="100%">
              <Group gap="xs" mb="md">
                <ThemeIcon size={28} radius="md" color="teal" variant="light">
                  <TbUserPlus size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm">🆕 พนักงานใหม่</Text>
                <Badge size="sm" variant="light" color="teal">{new_hires.length}</Badge>
              </Group>
              <Text size="xs" c="dimmed" mb="xs">เริ่มงานภายใน 30 วัน</Text>
              {new_hires.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">ไม่มีพนักงานใหม่</Text>
              ) : (
                <Stack gap="xs">
                  {new_hires.map((emp) => (
                    <Paper key={emp.id} p="xs" radius="md" withBorder>
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {formatName(emp.first_name, emp.nick_name)}
                          </Text>
                          <Text size="xs" c="dimmed">{emp.position}</Text>
                          <Text size="xs" c="teal">
                            เริ่มงาน: {formatThaiDate(emp.hire_date)}
                          </Text>
                        </div>
                        <Badge size="sm" variant="outline" color="teal">
                          {emp.days_since_hire} วันแล้ว
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid.Col>

          {/* Probation */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" radius="lg" padding="md" withBorder h="100%">
              <Group gap="xs" mb="md">
                <ThemeIcon size={28} radius="md" color="orange" variant="light">
                  <TbClock size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm">⏰ ใกล้ผ่านงาน 90 วัน</Text>
                <Badge size="sm" variant="light" color="orange">{probation_ending.length}</Badge>
              </Group>
              <Text size="xs" c="dimmed" mb="xs">ภายใน 30 วันข้างหน้า</Text>
              {probation_ending.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">ไม่มีพนักงานใกล้ผ่านทดลองงาน</Text>
              ) : (
                <Stack gap="xs">
                  {probation_ending.map((emp) => (
                    <Paper key={emp.id} p="xs" radius="md" withBorder>
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {formatName(emp.first_name, emp.nick_name)}
                          </Text>
                          <Text size="xs" c="dimmed">{emp.position}</Text>
                        </div>
                        <Badge
                          size="sm"
                          variant="filled"
                          color={emp.days_remaining <= 7 ? 'red' : emp.days_remaining <= 14 ? 'orange' : 'yellow'}
                        >
                          อีก {emp.days_remaining} วัน
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* ======== SECTION 4: HOLIDAYS ======== */}
        <Card shadow="sm" radius="lg" padding="md" withBorder>
          <Group gap="xs" mb="md">
            <ThemeIcon size={28} radius="md" color="violet" variant="light">
              <TbCalendarEvent size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">📅 วันหยุดประจำเดือน (ล่วงหน้า 3 เดือน)</Text>
            <Badge size="sm" variant="light" color="violet">
              {relevantHolidays.length} วัน
            </Badge>
          </Group>

          <Grid gutter="md">
            {/* Upcoming */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={600} mb="xs" c="violet">วันหยุดที่ใกล้จะถึง</Text>
              {upcomingHolidays.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">ไม่มีวันหยุดเหลือในปีนี้</Text>
              ) : (
                <Stack gap={6}>
                  {upcomingHolidays.slice(0, 8).map((h) => {
                    const daysUntil = Math.ceil(
                      (new Date(h.holiday_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const isSoon = daysUntil <= 7
                    return (
                      <Paper
                        key={h.id}
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: isSoon ? 'var(--mantine-color-violet-0)' : undefined,
                          border: isSoon
                            ? '1px solid var(--mantine-color-violet-3)'
                            : '1px solid var(--mantine-color-gray-2)',
                        }}
                      >
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Badge size="sm" variant="filled" color="violet" radius="sm">
                              {formatThaiDate(h.holiday_date)}
                            </Badge>
                            <Text size="sm" fw={isSoon ? 600 : 400}>{h.name}</Text>
                          </Group>
                          {daysUntil === 0 ? (
                            <Badge size="xs" color="green" variant="filled">วันนี้!</Badge>
                          ) : (
                            <Text size="xs" c="dimmed">อีก {daysUntil} วัน</Text>
                          )}
                        </Group>
                      </Paper>
                    )
                  })}
                  {upcomingHolidays.length > 8 && (
                    <Text size="xs" c="dimmed" ta="center">
                      และอีก {upcomingHolidays.length - 8} วัน...
                    </Text>
                  )}
                </Stack>
              )}
            </Grid.Col>

            {/* Past */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={600} mb="xs" c="gray">วันหยุดที่ผ่านมาแล้ว</Text>
              {pastHolidays.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">ยังไม่มีวันหยุดที่ผ่านมา</Text>
              ) : (
                <Stack gap={6}>
                  {pastHolidays.map((h) => (
                    <Paper key={h.id} p="xs" radius="md" style={{ border: '1px solid var(--mantine-color-gray-2)', opacity: 0.7 }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Badge size="sm" variant="light" color="gray" radius="sm">
                            {formatThaiDate(h.holiday_date)}
                          </Badge>
                          <Text size="sm" c="dimmed">{h.name}</Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Grid.Col>
          </Grid>
        </Card>
      </Stack>
    </Box>
  )
}
