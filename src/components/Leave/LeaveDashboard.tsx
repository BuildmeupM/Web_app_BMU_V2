/**
 * Leave Dashboard Component
 * Dashboard สำหรับสรุปข้อมูลการลา
 */

import { useState } from 'react'
import { Stack, Card, SimpleGrid, Text, Title, Badge, Group, Alert, Switch, Select } from '@mantine/core'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useQuery } from 'react-query'
import { leaveService } from '../../services/leaveService'
import { useAuthStore } from '../../store/authStore'
import { TbAlertCircle } from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

export default function LeaveDashboard() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const [comparePrevious, setComparePrevious] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'))

  // Only fetch dashboard summary for non-admin users (for byType and upcomingLeaves)
  // Admin users don't need this data as they use daily stats instead
  const { data, isLoading, error } = useQuery(
    ['leave-dashboard', user?.employee_id],
    () => leaveService.getDashboard({ employee_id: user?.employee_id }),
    {
      enabled: !!user?.employee_id && !isAdmin, // Disable for admin to avoid 400 error
      retry: false, // Don't retry on error
    }
  )

  // Get daily statistics for chart
  const { data: dailyStatsData, isLoading: isLoadingDaily } = useQuery(
    ['leave-daily-stats', selectedMonth, comparePrevious],
    () => leaveService.getDailyStats({ month: selectedMonth, compare_previous: comparePrevious }),
    {
      enabled: isAdmin, // Only for admin
      staleTime: 2 * 60 * 1000, // 2 minutes cache
    }
  )

  // Get pending leave requests count for admin
  const { data: pendingData, isLoading: isLoadingPending } = useQuery(
    ['pending-leave-requests-count'],
    () => leaveService.getPending({ page: 1, limit: 100 }),
    {
      enabled: isAdmin, // Only for admin
      staleTime: 1 * 60 * 1000, // 1 minute cache
      retry: false,
    }
  )


  // Early return AFTER all hooks
  if (isLoading) {
    return <Text>กำลังโหลดข้อมูล...</Text>
  }

  if (error) {
    return (
      <Alert icon={<TbAlertCircle size={16} />} color="red">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </Alert>
    )
  }

  const summary = data?.data.summary
  const byType = data?.data.by_type || {}

  // Format Thai date helper for chart (short format)
  const formatThaiDateShort = (dateString: string): string => {
    if (!dateString) return ''
    const date = dayjs(dateString)
    const thaiWeekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const weekday = thaiWeekdays[date.day()]
    const day = date.date()
    return `${weekday} ${day}`
  }

  // Format Thai date helper for display (full format)
  const formatThaiDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = dayjs(dateString)
    const thaiWeekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ]
    const weekday = thaiWeekdays[date.day()]
    const day = date.date()
    const month = thaiMonths[date.month()]
    const year = date.year() + 543
    return `วัน${weekday} ที่ ${day} ${month} ${year}`
  }

  // Prepare chart data
  const prepareChartData = () => {
    if (!dailyStatsData?.data) return []

    const currentMonth = dailyStatsData.data.current_month
    const previousMonth = dailyStatsData.data.previous_month

    // Get all days in current month
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth()
    
    const chartData = []
    
    // Normalize date strings for comparison (YYYY-MM-DD format)
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return ''
      // Handle both Date objects and strings
      const date = dayjs(dateStr)
      return date.format('YYYY-MM-DD')
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const normalizedDateStr = normalizeDate(dateStr)
      
      // Find matching data - handle both string and Date object formats
      const currentDayData = currentMonth.daily_stats.find((d: any) => {
        const normalizedLeaveDate = normalizeDate(d.leave_date)
        return normalizedLeaveDate === normalizedDateStr
      })
      
      const prevDayData = previousMonth?.daily_stats.find((d: any) => {
        const dDate = dayjs(d.leave_date)
        return dDate.date() === day && dDate.month() === (month === 1 ? 11 : month - 2)
      })

      chartData.push({
        date: dateStr,
        day: day,
        label: formatThaiDateShort(dateStr),
        current: currentDayData ? Number(currentDayData.approved_employee_count) || 0 : 0,
        currentPending: currentDayData ? Number(currentDayData.pending_employee_count) || 0 : 0,
        previous: comparePrevious && prevDayData ? Number(prevDayData.approved_employee_count) || 0 : null,
        previousPending: comparePrevious && prevDayData ? Number(prevDayData.pending_employee_count) || 0 : null,
      })
    }

    return chartData
  }

  const chartData = prepareChartData()

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = dayjs().subtract(i, 'month')
    return {
      value: month.format('YYYY-MM'),
      label: month.format('MMMM YYYY'),
    }
  })


  return (
    <Stack gap="md">
      {/* Pending Leave Requests - Only for Admin - Show at top */}
      {isAdmin && (
        <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#fff5f5' }}>
          <Group justify="space-between" mb="md">
            <Group>
              <TbAlertCircle size={24} color="#ff6b35" />
              <Title order={3}>การลาที่รออนุมัติ</Title>
            </Group>
            <Badge size="xl" color="yellow" variant="filled">
              {isLoadingPending ? '...' : pendingData?.data?.pagination?.total || 0} รายการ
            </Badge>
          </Group>
          
          {isLoadingPending ? (
            <Text>กำลังโหลดข้อมูล...</Text>
          ) : pendingData?.data?.leave_requests && pendingData.data.leave_requests.length > 0 ? (
            <Stack gap="xs">
              {pendingData.data.leave_requests.slice(0, 10).map((leave: any) => (
                <Group 
                  key={leave.id} 
                  justify="space-between" 
                  p="sm" 
                  style={{ 
                    border: '1px solid #ffc107', 
                    borderRadius: '8px',
                    backgroundColor: 'white'
                  }}
                >
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={500}>
                        {leave.employee_name}
                        {leave.employee_nick_name && ` (${leave.employee_nick_name})`}
                      </Text>
                      <Badge color="yellow" size="sm">รออนุมัติ</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {leave.employee_position} • {leave.employee_id}
                    </Text>
                    <Text size="sm">
                      {formatThaiDate(leave.leave_start_date)}
                      {leave.leave_start_date !== leave.leave_end_date && ` - ${formatThaiDate(leave.leave_end_date)}`}
                    </Text>
                  </Stack>
                  <Stack gap={4} align="flex-end">
                    <Badge color="orange" size="lg">{leave.leave_type}</Badge>
                    <Text size="sm" fw={500}>
                      {Math.round(leave.leave_days)} วัน
                    </Text>
                    {leave.reason && (
                      <Text size="xs" c="dimmed" style={{ maxWidth: 200, textAlign: 'right' }}>
                        {leave.reason}
                      </Text>
                    )}
                  </Stack>
                </Group>
              ))}
              {pendingData.data.pagination.total > 10 && (
                <Alert color="yellow" mt="md">
                  มีการลาที่รออนุมัติทั้งหมด {pendingData.data.pagination.total} รายการ (แสดง 10 รายการแรก)
                  <Text size="sm" mt="xs">
                    ดูรายการทั้งหมดได้ที่แท็บ "ข้อมูลการขอลางาน"
                  </Text>
                </Alert>
              )}
            </Stack>
          ) : (
            <Alert color="green">
              ไม่มีการลาที่รออนุมัติในขณะนี้
            </Alert>
          )}
        </Card>
      )}

      {/* By Type - Only show for non-admin */}
      {!isAdmin && Object.keys(byType).length > 0 && (
        <Card withBorder padding="lg" radius="md">
          <Title order={3} mb="md">
            สรุปตามประเภทการลา
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
            {Object.entries(byType).map(([type, data]) => (
              <Card key={type} withBorder padding="sm" radius="md">
                <Stack gap="xs" align="center">
                  <Text size="sm" fw={500}>
                    {type}
                  </Text>
                  <Badge size="lg" color="blue">
                    {data.days} วัน
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {data.count} ครั้ง
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Card>
      )}

      {/* Daily Leave Chart - Only for Admin */}
      {isAdmin && (
        <Card withBorder padding="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>ข้อมูลการลาของเดือนปัจจุบัน</Title>
            <Group>
              <Select
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(value || dayjs().format('YYYY-MM'))}
                data={monthOptions}
                style={{ width: 200 }}
              />
              <Switch
                label="เปรียบเทียบกับเดือนก่อนหน้า"
                checked={comparePrevious}
                onChange={(e) => setComparePrevious(e.currentTarget.checked)}
              />
            </Group>
          </Group>
          
          {isLoadingDaily ? (
            <Text>กำลังโหลดข้อมูลกราฟ...</Text>
          ) : dailyStatsData?.data ? (
            chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tickFormatter={(value) => {
                      const item = chartData.find(d => d.day === value)
                      return item ? item.label : String(value)
                    }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'current') return [`${value} คน`, 'อนุมัติแล้ว - เดือนปัจจุบัน']
                      if (name === 'currentPending') return [`${value} คน`, 'รออนุมัติ - เดือนปัจจุบัน']
                      if (name === 'previous') return [`${value} คน`, 'อนุมัติแล้ว - เดือนก่อนหน้า']
                      if (name === 'previousPending') return [`${value} คน`, 'รออนุมัติ - เดือนก่อนหน้า']
                      return value
                    }}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.day === Number(label))
                      return item ? `วันที่ ${item.day} ${item.label}` : label
                    }}
                  />
                  <Legend 
                    formatter={(value) => {
                      if (value === 'current') return 'อนุมัติแล้ว - เดือนปัจจุบัน'
                      if (value === 'currentPending') return 'รออนุมัติ - เดือนปัจจุบัน'
                      if (value === 'previous') return 'อนุมัติแล้ว - เดือนก่อนหน้า'
                      if (value === 'previousPending') return 'รออนุมัติ - เดือนก่อนหน้า'
                      return value
                    }}
                  />
                  <Bar dataKey="current" fill="#ff6b35" name="current" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.current > 0 ? '#ff6b35' : '#e0e0e0'} />
                    ))}
                  </Bar>
                  <Bar dataKey="currentPending" fill="#ffc107" name="currentPending" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`pending-cell-${index}`} fill={entry.currentPending > 0 ? '#ffc107' : '#e0e0e0'} />
                    ))}
                  </Bar>
                  {comparePrevious && (
                    <>
                      <Bar dataKey="previous" fill="#ffa500" name="previous" radius={[4, 4, 0, 0]} opacity={0.7}>
                        {chartData.map((entry, index) => (
                          <Cell key={`prev-cell-${index}`} fill={entry.previous !== null && entry.previous > 0 ? '#ffa500' : '#e0e0e0'} />
                        ))}
                      </Bar>
                      <Bar dataKey="previousPending" fill="#ffd54f" name="previousPending" radius={[4, 4, 0, 0]} opacity={0.7}>
                        {chartData.map((entry, index) => (
                          <Cell key={`prev-pending-cell-${index}`} fill={entry.previousPending !== null && entry.previousPending > 0 ? '#ffd54f' : '#e0e0e0'} />
                        ))}
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Alert color="blue">ไม่พบข้อมูลการลาในเดือนนี้</Alert>
            )
          ) : (
            <Alert color="yellow">ไม่สามารถโหลดข้อมูลกราฟได้</Alert>
          )}
        </Card>
      )}
    </Stack>
  )
}
