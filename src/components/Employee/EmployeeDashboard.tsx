/**
 * EmployeeDashboard Component
 * Dashboard สำหรับแสดงสถิติและ analytics
 */

import { useState } from 'react'
import {
  Card,
  SimpleGrid,
  Grid,
  Text,
  Title,
  Stack,
  Table,
  Paper,
  Group,
  Badge,
  Loader,
  Center,
  Modal,
  Tabs,
  ScrollArea,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Divider,
} from '@mantine/core'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CompositeChart } from '@mantine/charts'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, BarChart } from 'recharts'
import { TbGenderMale, TbGenderFemale, TbUser } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { employeeService, EmployeeStatistics } from '../../services/employeeService'

export default function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  const { data: statistics, isLoading } = useQuery<EmployeeStatistics>(
    ['employee-statistics'],
    () => employeeService.getStatistics(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  // Fetch employees for selected month
  const { data: monthEmployees, isLoading: isLoadingMonth } = useQuery(
    ['employees-by-month', selectedMonth],
    () => employeeService.getEmployeesByMonth(selectedMonth!),
    {
      enabled: !!selectedMonth && modalOpened,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
    }
  )

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    )
  }

  if (!statistics) {
    return (
      <Center py="xl">
        <Text c="dimmed">ไม่พบข้อมูล</Text>
      </Center>
    )
  }

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const dateParts = dateString.split('T')[0].split('-')
    const year = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1
    const day = parseInt(dateParts[2])
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    return `${day} ${thaiMonths[month]} ${year + 543}`
  }

  // Helper function to format month label
  const formatMonthLabel = (month: string): string => {
    const [year, monthNum] = month.split('-')
    const monthIndex = parseInt(monthNum) - 1
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const thaiYear = parseInt(year) + 543
    return `${thaiMonths[monthIndex]} ${thaiYear}`
  }

  // Handle tooltip click
  const handleTooltipClick = (month: string) => {
    setSelectedMonth(month)
    setModalOpened(true)
  }

  // Prepare chart data - เรียงตามเดือน
  const hireTrendData = [...statistics.hire_trend_6months]
    .sort((a, b) => a.month.localeCompare(b.month)) // เรียงตามเดือน (YYYY-MM)
    .map((item) => {
      // แปลงเดือนจาก YYYY-MM เป็นรูปแบบที่อ่านง่าย (เช่น "ส.ค. 2568")
      const [year, month] = item.month.split('-')
      const monthNum = parseInt(month) - 1
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      const thaiYear = parseInt(year) + 543
      return {
        month: item.month, // เก็บค่าเดิมไว้สำหรับ sorting
        monthLabel: `${thaiMonths[monthNum]} ${thaiYear}`, // แสดงผล
        hired: item.hired,
        resigned: item.resigned,
      }
    })

  const positionData = statistics.by_position.map((item) => ({
    name: item.position,
    value: item.count,
  }))

  // Prepare gender data for charts
  const genderData = statistics.by_gender.map((item) => {
    let label = ''
    let color = ''
    switch (item.gender) {
      case 'male':
        label = 'ชาย'
        color = '#4facfe' // Blue
        break
      case 'female':
        label = 'หญิง'
        color = '#ff6b9d' // Pink
        break
      case 'other':
        label = 'อื่นๆ'
        color = '#9c27b0' // Purple
        break
      default:
        label = item.gender
        color = '#808080' // Gray
    }
    return {
      name: label,
      value: item.count,
      gender: item.gender,
      color,
    }
  })

  // Calculate gender totals
  const maleCount = statistics.by_gender.find((g) => g.gender === 'male')?.count || 0
  const femaleCount = statistics.by_gender.find((g) => g.gender === 'female')?.count || 0
  const otherCount = statistics.by_gender.find((g) => g.gender === 'other')?.count || 0

  return (
    <Stack gap="lg">
      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed" mb="xs" ta="center">
            พนักงานทำงานอยู่
          </Text>
          <Title order={2} c="green" ta="center">
            {statistics.total_active}
          </Title>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed" mb="xs" ta="center">
            พนักงานลาออก
          </Text>
          <Title order={2} c="red" ta="center">
            {statistics.total_resigned}
          </Title>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed" mb="xs" ta="center">
            รวมทั้งหมด
          </Text>
          <Title order={2} ta="center">
            {statistics.total_active + statistics.total_resigned}
          </Title>
        </Card>
      </SimpleGrid>

      {/* Gender Summary Section - 2 Column Layout */}
      <Grid>
        {/* Left Column: Gender Cards */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Card withBorder style={{ borderLeft: '4px solid #4facfe' }}>
              <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed" mb="xs" ta="center" style={{ width: '100%' }}>
                  เพศชาย
                </Text>
                <Title order={2} c="#4facfe" ta="center" style={{ width: '100%' }}>
                  {maleCount}
                </Title>
                <Text size="xs" c="dimmed" mt="xs" ta="center" style={{ width: '100%' }}>
                  {statistics.total_active > 0
                    ? `${((maleCount / statistics.total_active) * 100).toFixed(1)}%`
                    : '0%'}
                </Text>
              </Stack>
              <Center mt="md" pb="xs">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TbGenderMale size={80} color="#4facfe" style={{ opacity: 0.8, filter: 'drop-shadow(0 2px 4px rgba(79, 172, 254, 0.3))' }} />
                </div>
              </Center>
            </Card>
            <Card withBorder style={{ borderLeft: '4px solid #ff6b9d' }}>
              <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed" mb="xs" ta="center" style={{ width: '100%' }}>
                  เพศหญิง
                </Text>
                <Title order={2} c="#ff6b9d" ta="center" style={{ width: '100%' }}>
                  {femaleCount}
                </Title>
                <Text size="xs" c="dimmed" mt="xs" ta="center" style={{ width: '100%' }}>
                  {statistics.total_active > 0
                    ? `${((femaleCount / statistics.total_active) * 100).toFixed(1)}%`
                    : '0%'}
                </Text>
              </Stack>
              <Center mt="md" pb="xs">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TbGenderFemale size={80} color="#ff6b9d" style={{ opacity: 0.8, filter: 'drop-shadow(0 2px 4px rgba(255, 107, 157, 0.3))' }} />
                </div>
              </Center>
            </Card>
            {otherCount > 0 && (
              <Card withBorder style={{ borderLeft: '4px solid #9c27b0' }}>
                <Stack align="center" gap="xs">
                  <Text size="sm" c="dimmed" mb="xs" ta="center" style={{ width: '100%' }}>
                    อื่นๆ
                  </Text>
                  <Title order={2} c="#9c27b0" ta="center" style={{ width: '100%' }}>
                    {otherCount}
                  </Title>
                  <Text size="xs" c="dimmed" mt="xs" ta="center" style={{ width: '100%' }}>
                    {statistics.total_active > 0
                      ? `${((otherCount / statistics.total_active) * 100).toFixed(1)}%`
                      : '0%'}
                  </Text>
                </Stack>
                <Center mt="md" pb="xs">
                  <TbUser size={64} color="#9c27b0" style={{ opacity: 0.7 }} />
                </Center>
              </Card>
            )}
          </Stack>
        </Grid.Col>

        {/* Right Column: Pie Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder h="100%">
            <Title order={4} mb="md" ta="center">
              สรุปข้อมูลเพศของพนักงาน
            </Title>
            <Paper p="md" withBorder>
              {genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload
                          return (
                            <Paper p="sm" withBorder style={{ backgroundColor: 'white' }}>
                              <Text size="sm" fw={600} mb="xs">
                                {data.name}
                              </Text>
                              <Text size="sm">
                                จำนวน: {data.value} คน
                              </Text>
                              <Text size="sm" c="dimmed">
                                สัดส่วน: {((data.value / statistics.total_active) * 100).toFixed(1)}%
                              </Text>
                            </Paper>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value, entry: any) => {
                        const data = genderData.find((g) => g.name === value)
                        return (
                          <span style={{ color: entry.color }}>
                            {value} ({data?.value || 0} คน)
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  ไม่มีข้อมูลเพศ
                </Text>
              )}
            </Paper>
          </Card>
        </Grid.Col>
      </Grid>

      {/* 6 Months Trend Chart */}
      <Card withBorder>
        <Title order={4} mb="md">
          สถิติการเข้าทำงาน/ลาออก (6 เดือน)
        </Title>
        <Paper p="md" withBorder>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={hireTrendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'จำนวนคน', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload
                    return (
                      <Paper 
                        p="sm" 
                        withBorder 
                        style={{ backgroundColor: 'white' }}
                      >
                        <Text size="sm" fw={600} mb="xs">
                          {data.monthLabel}
                        </Text>
                        <Stack gap="xs">
                          {/* แสดงข้อมูลเข้าทำงาน */}
                          <Group justify="space-between" gap="md">
                            <Text size="sm">เข้าทำงาน:</Text>
                            <Badge color="green">{data.hired || 0} คน</Badge>
                          </Group>
                          {/* แสดงข้อมูลลาออก */}
                          <Group justify="space-between" gap="md">
                            <Text size="sm">ลาออก:</Text>
                            <Badge color="red">{data.resigned || 0} คน</Badge>
                          </Group>
                        </Stack>
                      </Paper>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  if (value === 'hired') return 'เข้าทำงาน'
                  if (value === 'resigned') return 'ลาออก'
                  return value
                }}
              />
              <Bar 
                dataKey="hired" 
                fill="#4caf50" 
                name="เข้าทำงาน"
                radius={[4, 4, 0, 0]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) => {
                  // data contains the payload object directly
                  if (data && data.month) {
                    handleTooltipClick(data.month)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {hireTrendData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="#4caf50"
                    onClick={() => {
                      if (entry && entry.month) {
                        handleTooltipClick(entry.month)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="resigned" 
                stroke="#f44336" 
                strokeWidth={3}
                dot={{ 
                  fill: '#f44336', 
                  r: 5, 
                  cursor: 'pointer',
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick: (data: any) => {
                    // data.payload contains the data object
                    if (data && data.payload && data.payload.month) {
                      handleTooltipClick(data.payload.month)
                    }
                  }
                }}
                activeDot={{ r: 7 }}
                name="ลาออก"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) => {
                  // data.payload contains the data object
                  if (data && data.payload && data.payload.month) {
                    handleTooltipClick(data.payload.month)
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <Text size="xs" c="dimmed" mt="sm" ta="center">
            💡 คลิกที่กราฟแท่งหรือกราฟเส้นเพื่อดูรายละเอียดพนักงาน
          </Text>
        </Paper>
      </Card>

      {/* Employee Details Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false)
          setSelectedMonth(null)
        }}
        title={`รายละเอียดพนักงาน - ${selectedMonth ? formatMonthLabel(selectedMonth) : ''}`}
        size="90%"
        centered
        styles={{
          content: {
            maxWidth: '1400px',
            maxHeight: '90vh',
          },
        }}
      >
        {isLoadingMonth ? (
          <Center py="xl">
            <Loader size="lg" />
          </Center>
        ) : monthEmployees ? (
          <Tabs defaultValue="hired">
            <Tabs.List>
              <Tabs.Tab value="hired">
                เข้าทำงาน ({monthEmployees.hired.length})
              </Tabs.Tab>
              <Tabs.Tab value="resigned">
                ลาออก ({monthEmployees.resigned.length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="hired" pt="md">
              {monthEmployees.hired.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  ไม่มีพนักงานที่เข้าทำงานในเดือนนี้
                </Text>
              ) : (
                <ScrollArea h={650}>
                  <Table
                    highlightOnHover
                    withTableBorder
                    withColumnBorders
                    verticalSpacing="md"
                    horizontalSpacing="lg"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th fw={600}>รหัสพนักงาน</Table.Th>
                        <Table.Th fw={600}>ชื่อ - นามสกุล</Table.Th>
                        <Table.Th fw={600}>ตำแหน่ง</Table.Th>
                        <Table.Th fw={600}>วันที่เริ่มทำงาน</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {monthEmployees.hired.map((employee) => (
                        <Table.Tr key={employee.id}>
                          <Table.Td fw={500}>{employee.employee_id}</Table.Td>
                          <Table.Td>
                            <Text fw={500} size="md">
                              {employee.full_name}
                              {employee.nick_name && (
                                <Text component="span" c="dimmed" ml="xs">
                                  {' '}({employee.nick_name})
                                </Text>
                              )}
                            </Text>
                          </Table.Td>
                          <Table.Td fw={500}>{employee.position}</Table.Td>
                          <Table.Td>
                            <Badge color="green" variant="filled" size="lg" style={{ fontSize: '16px', padding: '8px 12px' }}>
                              {formatDate(employee.hire_date)}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="resigned" pt="md">
              {monthEmployees.resigned.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  ไม่มีพนักงานที่ลาออกในเดือนนี้
                </Text>
              ) : (
                <ScrollArea h={650}>
                  <Table
                    highlightOnHover
                    withTableBorder
                    withColumnBorders
                    verticalSpacing="md"
                    horizontalSpacing="lg"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th fw={600}>รหัสพนักงาน</Table.Th>
                        <Table.Th fw={600}>ชื่อ - นามสกุล</Table.Th>
                        <Table.Th fw={600}>ตำแหน่ง</Table.Th>
                        <Table.Th fw={600}>วันที่เริ่มทำงาน</Table.Th>
                        <Table.Th fw={600}>วันที่สิ้นสุด</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {monthEmployees.resigned.map((employee) => (
                        <Table.Tr key={employee.id}>
                          <Table.Td fw={500}>{employee.employee_id}</Table.Td>
                          <Table.Td>
                            <Text fw={500} size="md">
                              {employee.full_name}
                              {employee.nick_name && (
                                <Text component="span" c="dimmed" ml="xs">
                                  {' '}({employee.nick_name})
                                </Text>
                              )}
                            </Text>
                          </Table.Td>
                          <Table.Td fw={500}>{employee.position}</Table.Td>
                          <Table.Td>
                            <Badge color="green" variant="filled" size="lg" style={{ fontSize: '16px', padding: '8px 12px' }}>
                              {formatDate(employee.hire_date)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="red" variant="filled" size="lg" style={{ fontSize: '16px', padding: '8px 12px' }}>
                              {formatDate(employee.resignation_date)}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Tabs.Panel>
          </Tabs>
        ) : null}
      </Modal>

      {/* Probation Reviews */}
      <Card withBorder>
        <Title order={4} mb="md">
          พนักงานที่ต้องประเมิน (90 วันข้างหน้า)
        </Title>
        {statistics.probation_reviews_next_90days.length === 0 ? (
          <Text c="dimmed">ไม่มีพนักงานที่ต้องประเมิน</Text>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>รหัสพนักงาน</Table.Th>
                  <Table.Th>ชื่อ - นามสกุล</Table.Th>
                  <Table.Th>ตำแหน่ง</Table.Th>
                  <Table.Th>วันเริ่มงาน</Table.Th>
                  <Table.Th>วันผ่านงาน</Table.Th>
                  <Table.Th>จำนวนวันจนถึงวันประเมิน</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {statistics.probation_reviews_next_90days.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td>{employee.employee_id}</Table.Td>
                    <Table.Td>
                      {employee.full_name}
                      {employee.nick_name && ` (${employee.nick_name})`}
                    </Table.Td>
                    <Table.Td>{employee.position}</Table.Td>
                    <Table.Td>
                      {(() => {
                        const dateParts = employee.hire_date.split('T')[0].split('-')
                        const year = parseInt(dateParts[0])
                        const month = parseInt(dateParts[1]) - 1
                        const day = parseInt(dateParts[2])
                        const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
                        return `${day} ${thaiMonths[month]} ${year + 543}`
                      })()}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const dateParts = employee.probation_end_date.split('T')[0].split('-')
                        const year = parseInt(dateParts[0])
                        const month = parseInt(dateParts[1]) - 1
                        const day = parseInt(dateParts[2])
                        const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
                        return `${day} ${thaiMonths[month]} ${year + 543}`
                      })()}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={employee.days_until_review <= 30 ? 'red' : 'yellow'}>
                        {employee.days_until_review} วัน
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {/* Employees by Position */}
      <Card withBorder>
        <Title order={4} mb="md" ta="center">
          จำนวนพนักงานตามตำแหน่ง
        </Title>
        <Paper p="md" withBorder>
          {positionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={positionData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'จำนวนคน', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload
                      return (
                        <Paper p="sm" withBorder style={{ backgroundColor: 'white' }}>
                          <Text size="sm" fw={600} mb="xs">
                            {data.name}
                          </Text>
                          <Text size="sm">
                            จำนวน: {data.value} คน
                          </Text>
                        </Paper>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#ff6b35"
                  radius={[8, 8, 0, 0]}
                  label={{ 
                    position: 'top', 
                    formatter: (value: number) => `${value} คน`,
                    fontSize: 12,
                    fill: '#333'
                  }}
                >
                  {positionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#ff6b35', '#4facfe', '#4caf50', '#ffc107', '#9c27b0', '#f44336', '#00bcd4'][index % 7]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              ไม่มีข้อมูลตำแหน่ง
            </Text>
          )}
        </Paper>
      </Card>
    </Stack>
  )
}
