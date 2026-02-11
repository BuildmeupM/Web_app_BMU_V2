/**
 * WFH Dashboard Component
 * Dashboard สำหรับแสดงรายการการขอ WFH ที่รออนุมัติ (ดูข้อมูลอย่างเดียว)
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Alert,
  Pagination,
  Button,
  Grid,
  Select,
  ScrollArea,
} from '@mantine/core'
import { DateInput, DatesProvider } from '@mantine/dates'
import { TbAlertCircle, TbX, TbCheck, TbClock, TbAlertTriangle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { wfhService, WFHRequest } from '../../services/leaveService'
import { useAuthStore } from '../../store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

export default function WFHDashboard() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'
  const [page, setPage] = useState(1)
  const [limit] = useState(5) // แสดง 5 รายการต่อหน้า
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [chartMonth, setChartMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [filterCalendarMonth, setFilterCalendarMonth] = useState<Date>(new Date())
  const [filterSelectedDate, setFilterSelectedDate] = useState<Date | null>(null)

  // Track calendar month changes by listening to calendar navigation clicks
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleCalendarNavigation = () => {
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Use a small delay to ensure DOM is updated
      timeoutId = setTimeout(() => {
        // Find the calendar header level element that shows the month
        const monthHeader = document.querySelector('.mantine-Calendar-calendarHeaderLevel')
        if (monthHeader) {
          const monthText = monthHeader.textContent || ''
          // Try to parse different date formats
          // Format might be "February 2026" or "กุมภาพันธ์ 2569" (Thai)
          const englishMatch = monthText.match(/(\w+)\s+(\d+)/)
          if (englishMatch) {
            const monthName = englishMatch[1]
            const year = parseInt(englishMatch[2])
            const monthMap: { [key: string]: number } = {
              january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
              july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
            }
            const monthIndex = monthMap[monthName.toLowerCase()]
            if (monthIndex !== undefined) {
              const newMonth = new Date(year, monthIndex, 1)
              // Always update to ensure we fetch the correct month's data
              setCalendarMonth((prevMonth) => {
                if (
                  newMonth.getFullYear() !== prevMonth.getFullYear() ||
                  newMonth.getMonth() !== prevMonth.getMonth()
                ) {
                  return newMonth
                }
                return prevMonth
              })
            }
          }
        }
      }, 100)
    }

    // Set up MutationObserver to watch for calendar changes
    const observer = new MutationObserver(() => {
      handleCalendarNavigation()
    })

    // Observe calendar dropdown for changes
    const calendarContainer = document.querySelector('.mantine-DateInput-dropdown')
    if (calendarContainer) {
      observer.observe(calendarContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    // Also listen for click events on navigation buttons
    const setupButtonListeners = () => {
      const prevButton = document.querySelector('.mantine-Calendar-calendarHeader > button:first-child')
      const nextButton = document.querySelector('.mantine-Calendar-calendarHeader > button:last-child')

      if (prevButton) {
        prevButton.addEventListener('click', handleCalendarNavigation, true)
      }
      if (nextButton) {
        nextButton.addEventListener('click', handleCalendarNavigation, true)
      }
    }

    // Setup listeners immediately and periodically
    setupButtonListeners()
    const interval = setInterval(() => {
      setupButtonListeners()
      handleCalendarNavigation()
    }, 500)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Get pending WFH requests with pagination and date filter
  const { data: pendingData, isLoading: isLoadingPending } = useQuery(
    ['wfh-requests', 'pending', 'dashboard', page, limit, selectedDate],
    () =>
      wfhService.getPending({
        page,
        limit,
        wfh_date: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : undefined,
      }),
    {
      enabled: isAdmin, // Only for admin
      staleTime: 1 * 60 * 1000, // 1 minute cache
      retry: false,
    }
  )

  // Get calendar data for current month and adjacent months (for better coverage)
  const currentMonthStr = dayjs(calendarMonth).format('YYYY-MM')
  const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
  const prevMonthStr = dayjs(prevMonth).format('YYYY-MM')
  const nextMonthStr = dayjs(nextMonth).format('YYYY-MM')

  // Get daily WFH statistics for chart
  const { data: dailyStatsData, isLoading: isLoadingDaily } = useQuery(
    ['wfh-daily-stats', chartMonth],
    () => wfhService.getDailyStats({ month: chartMonth }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
    }
  )

  // Get work reports data
  const { data: workReportsData, isLoading: isLoadingWorkReports } = useQuery(
    ['wfh-work-reports', chartMonth],
    () => wfhService.getWorkReports({ month: chartMonth }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
    }
  )

  // Get calendar data for filter calendar (to show who WFH on which date)
  const filterMonthStr = dayjs(filterCalendarMonth).format('YYYY-MM')
  const { data: filterCalendarData } = useQuery(
    ['wfh-calendar-filter', filterMonthStr],
    () =>
      wfhService.getCalendar({
        month: filterMonthStr,
      }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000,
      retry: false,
    }
  )

  // Fetch calendar data for current month
  const { data: calendarData } = useQuery(
    ['wfh-calendar', currentMonthStr],
    () =>
      wfhService.getCalendar({
        month: currentMonthStr,
      }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
      retry: false,
    }
  )

  // Fetch calendar data for previous month
  const { data: prevCalendarData } = useQuery(
    ['wfh-calendar', prevMonthStr],
    () =>
      wfhService.getCalendar({
        month: prevMonthStr,
      }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000,
      retry: false,
    }
  )

  // Fetch calendar data for next month
  const { data: nextCalendarData } = useQuery(
    ['wfh-calendar', nextMonthStr],
    () =>
      wfhService.getCalendar({
        month: nextMonthStr,
      }),
    {
      enabled: isAdmin,
      staleTime: 2 * 60 * 1000,
      retry: false,
    }
  )

  // Create a map of date to request count for quick lookup (combine all months)
  const dateRequestCountMap = useMemo(() => {
    const map = new Map<string, number>()

    // Helper function to process calendar data
    const processCalendarData = (data: any) => {
      if (data?.data?.calendar) {
        data.data.calendar.forEach((day: any) => {
          // Count only pending requests (รออนุมัติ) for dashboard display
          const pendingCount = day.requests?.filter(
            (req: any) => req.status === 'รออนุมัติ'
          ).length || 0
          map.set(day.date, pendingCount)
        })
      }
    }

    // Process all calendar data
    processCalendarData(calendarData)
    processCalendarData(prevCalendarData)
    processCalendarData(nextCalendarData)

    return map
  }, [calendarData, prevCalendarData, nextCalendarData])

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

  // Format date to YYYY-MM-DD for lookup
  const formatDateToLocal = (date: Date): string => {
    return dayjs(date).format('YYYY-MM-DD')
  }

  // Check if date is weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  // Format Thai date short for chart
  const formatThaiDateShort = (dateString: string): string => {
    if (!dateString) return ''
    const date = dayjs(dateString)
    const thaiWeekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const weekday = thaiWeekdays[date.day()]
    const day = date.date()
    return `${weekday} ${day}`
  }

  // Prepare chart data for WFH monthly chart
  const prepareChartData = () => {
    if (!dailyStatsData?.data) {
      return []
    }

    const currentMonth = dailyStatsData.data.current_month
    const [year, month] = chartMonth.split('-').map(Number)
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth()

    const chartData = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      // Try to find matching data - handle both date string formats
      const dayData = currentMonth.daily_stats.find((d: any) => {
        // Normalize both dates for comparison
        const dDate = dayjs(d.wfh_date).format('YYYY-MM-DD')
        return dDate === dateStr
      })

      chartData.push({
        date: dateStr,
        day: day,
        label: formatThaiDateShort(dateStr),
        approved: dayData ? Number(dayData.approved_employee_count) || 0 : 0,
        pending: dayData ? Number(dayData.pending_employee_count) || 0 : 0,
      })
    }

    return chartData
  }

  const chartData = prepareChartData()

  // Generate month options for chart
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = dayjs().subtract(i, 'month')
    return {
      value: month.format('YYYY-MM'),
      label: month.format('MMMM YYYY'),
    }
  })

  // Create map for filter calendar (date to employee list)
  const dateEmployeeMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        employee_id: string
        employee_name: string
        employee_nick_name?: string
        employee_position?: string
        status: string
      }>
    >()
    if (filterCalendarData?.data?.calendar) {
      filterCalendarData.data.calendar.forEach((day: any) => {
        if (day.requests && day.requests.length > 0) {
          map.set(day.date, day.requests)
        }
      })
    }
    return map
  }, [filterCalendarData])

  // Get day props for filter calendar (showing who WFH on which date)
  const getFilterDayProps = (date: Date) => {
    const dateStr = formatDateToLocal(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isPast = date < today
    const isWeekendDay = isWeekend(date)

    // Disable weekends
    if (isWeekendDay) {
      return {
        disabled: true,
        style: {
          backgroundColor: '#f5f5f5',
          color: '#d0d0d0',
          cursor: 'not-allowed',
          opacity: 0.5,
          borderRadius: '6px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          margin: '1px',
        },
        onClick: undefined,
      }
    }

    const employees = dateEmployeeMap.get(dateStr) || []
    const employeeCount = employees.length

    // Determine background color based on employee count
    let bgColor = '#ffffff' // White for 0 employees
    if (employeeCount >= 3) {
      bgColor = '#ffebee' // Red for 3+ employees
    } else if (employeeCount >= 1) {
      bgColor = '#fff9c4' // Yellow for 1-2 employees
    }

    // For past dates with no employees, use grey
    if (isPast && employeeCount === 0) {
      bgColor = '#f5f5f5'
    }

    return {
      style: {
        backgroundColor: bgColor,
        color: isPast && employeeCount === 0 ? '#666' : '#000',
        cursor: 'pointer',
        borderRadius: '6px',
        border:
          employeeCount >= 3
            ? '1px solid #ffcdd2'
            : employeeCount >= 1
              ? '1px solid #ffe082'
              : '1px solid rgba(0, 0, 0, 0.1)',
        margin: '1px',
        transition: 'all 0.2s ease',
        fontWeight: 600,
        opacity: isPast && employeeCount === 0 ? 0.6 : 1,
      },
    }
  }

  // Track filter calendar month changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleFilterCalendarNavigation = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        const monthHeader = document.querySelectorAll('.mantine-Calendar-calendarHeaderLevel')[1]
        if (monthHeader) {
          const monthText = monthHeader.textContent || ''
          const englishMatch = monthText.match(/(\w+)\s+(\d+)/)
          if (englishMatch) {
            const monthName = englishMatch[1]
            const year = parseInt(englishMatch[2])
            const monthMap: { [key: string]: number } = {
              january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
              july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
            }
            const monthIndex = monthMap[monthName.toLowerCase()]
            if (monthIndex !== undefined) {
              const newMonth = new Date(year, monthIndex, 1)
              setFilterCalendarMonth((prevMonth) => {
                if (
                  newMonth.getFullYear() !== prevMonth.getFullYear() ||
                  newMonth.getMonth() !== prevMonth.getMonth()
                ) {
                  return newMonth
                }
                return prevMonth
              })
            }
          }
        }
      }, 100)
    }

    const observer = new MutationObserver(() => {
      handleFilterCalendarNavigation()
    })

    const calendarContainers = document.querySelectorAll('.mantine-DateInput-dropdown')
    calendarContainers.forEach((container) => {
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    })

    const interval = setInterval(handleFilterCalendarNavigation, 500)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Get day props for calendar styling based on pending WFH request count
  const getDayProps = (date: Date) => {
    const dateStr = formatDateToLocal(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isPast = date < today
    const isWeekendDay = isWeekend(date)

    // Disable weekends (Saturday and Sunday)
    if (isWeekendDay) {
      return {
        disabled: true,
        style: {
          backgroundColor: '#f5f5f5',
          color: '#d0d0d0',
          cursor: 'not-allowed',
          opacity: 0.5,
          borderRadius: '6px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          margin: '1px',
        },
        onClick: undefined,
      }
    }

    // Get request count from map (works for any month since we fetch 3 months)
    const requestCount = dateRequestCountMap.get(dateStr) || 0

    // Determine background color based on request count
    // Show colors for ALL dates that have requests, regardless of which month is displayed
    let bgColor = '#ffffff' // White for 0 requests
    if (requestCount >= 3) {
      bgColor = '#ffebee' // Red for 3+ requests
    } else if (requestCount >= 1) {
      bgColor = '#fff9c4' // Yellow for 1-2 requests
    }

    // For past dates with no requests, use grey
    if (isPast && requestCount === 0) {
      bgColor = '#f5f5f5'
    }

    return {
      style: {
        backgroundColor: bgColor,
        color: isPast && requestCount === 0 ? '#666' : '#000',
        cursor: 'pointer',
        borderRadius: '6px',
        border:
          requestCount >= 3
            ? '1px solid #ffcdd2'
            : requestCount >= 1
              ? '1px solid #ffe082'
              : '1px solid rgba(0, 0, 0, 0.1)',
        margin: '1px',
        transition: 'all 0.2s ease',
        fontWeight: 600,
        opacity: isPast && requestCount === 0 ? 0.6 : 1,
      },
    }
  }

  const handleClearFilter = () => {
    setSelectedDate(null)
    setPage(1) // Reset to first page when clearing filter
  }

  // Update calendarMonth when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const newMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      if (
        newMonth.getFullYear() !== calendarMonth.getFullYear() ||
        newMonth.getMonth() !== calendarMonth.getMonth()
      ) {
        setCalendarMonth(newMonth)
      }
    }
  }, [selectedDate, calendarMonth])

  // Update filterCalendarMonth when filterSelectedDate changes
  useEffect(() => {
    if (filterSelectedDate) {
      const newMonth = new Date(filterSelectedDate.getFullYear(), filterSelectedDate.getMonth(), 1)
      if (
        newMonth.getFullYear() !== filterCalendarMonth.getFullYear() ||
        newMonth.getMonth() !== filterCalendarMonth.getMonth()
      ) {
        setFilterCalendarMonth(newMonth)
      }
    }
  }, [filterSelectedDate, filterCalendarMonth])

  if (!isAdmin) {
    return (
      <Alert color="yellow">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Pending WFH Requests */}
      <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#fff5f5' }}>
        <Group justify="space-between" mb="md">
          <Group>
            <TbAlertCircle size={24} color="#ff6b35" />
            <Title order={3}>การขอ WFH ที่รออนุมัติ</Title>
          </Group>
          <Badge size="xl" color="yellow" variant="filled">
            {isLoadingPending ? '...' : pendingData?.data?.pagination?.total || 0} รายการ
          </Badge>
        </Group>

        {/* Date Filter with Calendar */}
        <Group mb="md" align="flex-start">
          <DatesProvider settings={{ locale: 'th', firstDayOfWeek: 0 }}>
            <DateInput
              key={`pending-filter-${calendarMonth.getTime()}`}
              label="กรองตามวันที่ WFH"
              placeholder="เลือกวันที่"
              value={selectedDate}
              onChange={setSelectedDate}
              clearable
              style={{ width: 250 }}
              valueFormat="DD/MM/YYYY"
              getDayProps={getDayProps}
            />
          </DatesProvider>
          {selectedDate && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<TbX size={16} />}
              onClick={handleClearFilter}
              style={{ marginTop: 24 }}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </Group>

        {/* Color Legend */}
        <Alert color="blue" mb="md" p="xs">
          <Group gap="md">
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff9c4',
                  border: '1px solid #ffe082',
                  borderRadius: 4,
                }}
              />
              <Text size="sm">1-2 คน</Text>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#ffebee',
                  border: '1px solid #ffcdd2',
                  borderRadius: 4,
                }}
              />
              <Text size="sm">3 คนขึ้นไป</Text>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 4,
                }}
              />
              <Text size="sm">0 คน</Text>
            </Group>
          </Group>
        </Alert>

        {isLoadingPending ? (
          <Text>กำลังโหลดข้อมูล...</Text>
        ) : pendingData?.data?.wfh_requests && pendingData.data.wfh_requests.length > 0 ? (
          <Stack gap="xs">
            {pendingData.data.wfh_requests.map((wfh: WFHRequest) => (
              <Group
                key={wfh.id}
                justify="space-between"
                p="sm"
                style={{
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                }}
              >
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text fw={500}>
                      {wfh.employee_name}
                      {wfh.employee_nick_name && ` (${wfh.employee_nick_name})`}
                    </Text>
                    <Badge color="yellow" size="sm">
                      รออนุมัติ
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {wfh.employee_position} • {wfh.employee_id}
                  </Text>
                  <Text size="sm">{formatThaiDate(wfh.wfh_date)}</Text>
                </Stack>
              </Group>
            ))}

            {/* Pagination */}
            {pendingData.data.pagination.totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={pendingData.data.pagination.totalPages}
                  size="md"
                  radius="md"
                />
              </Group>
            )}

            {/* Show total info */}
            {selectedDate && (
              <Alert color="blue" mt="md">
                แสดงผลการกรองตามวันที่: {formatThaiDate(dayjs(selectedDate).format('YYYY-MM-DD'))}
                <Text size="sm" mt="xs">
                  พบทั้งหมด {pendingData.data.pagination.total} รายการ
                </Text>
              </Alert>
            )}
          </Stack>
        ) : (
          <Alert color="green">
            {selectedDate
              ? `ไม่มีการขอ WFH ที่รออนุมัติในวันที่ ${formatThaiDate(dayjs(selectedDate).format('YYYY-MM-DD'))}`
              : 'ไม่มีการขอ WFH ที่รออนุมัติในขณะนี้'}
          </Alert>
        )}
      </Card>

      {/* WFH Monthly Chart */}
      <Card withBorder padding="lg" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={3}>ข้อมูลการ WFH ของเดือนปัจจุบัน</Title>
          <Select
            value={chartMonth}
            onChange={(value) => setChartMonth(value || dayjs().format('YYYY-MM'))}
            data={monthOptions}
            style={{ width: 200 }}
          />
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
                    const item = chartData.find((d) => d.day === value)
                    return item ? item.label : String(value)
                  }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'approved') return [`${value} คน`, 'อนุมัติแล้ว']
                    if (name === 'pending') return [`${value} คน`, 'รออนุมัติ']
                    return value
                  }}
                  labelFormatter={(label) => {
                    const item = chartData.find((d) => d.day === Number(label))
                    return item ? `วันที่ ${item.day} ${item.label}` : label
                  }}
                />
                <Legend
                  formatter={(value) => {
                    if (value === 'approved') return 'อนุมัติแล้ว'
                    if (value === 'pending') return 'รออนุมัติ'
                    return value
                  }}
                />
                <Bar dataKey="approved" fill="#ff6b35" name="approved" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.approved > 0 ? '#ff6b35' : '#e0e0e0'} />
                  ))}
                </Bar>
                <Bar dataKey="pending" fill="#ffc107" name="pending" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`pending-cell-${index}`} fill={entry.pending > 0 ? '#ffc107' : '#e0e0e0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Alert color="blue">ไม่พบข้อมูลการ WFH ในเดือนนี้</Alert>
          )
        ) : (
          <Alert color="yellow">ไม่สามารถโหลดข้อมูลกราฟได้</Alert>
        )}
      </Card>

      {/* Work Reports Section - รวมกรองข้อมูลและรายงานการทำงาน */}
      <Card withBorder padding="lg" radius="md" mb="md">
        <Title order={3} mb="md">
          รายงานการทำงาน
        </Title>

        {/* Filter Section */}
        <Card withBorder padding="md" radius="md" mb="lg" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" c="dimmed" mb="md">
            เลือกวันที่เพื่อกรองข้อมูลในส่วน "รายงานการทำงานแล้ว" และ "ยังไม่ได้รายงาน"
          </Text>
          <Group align="flex-start">
            <DatesProvider settings={{ locale: 'th', firstDayOfWeek: 0 }}>
              <DateInput
                key={`filter-calendar-${filterCalendarMonth.getTime()}`}
                label="กรองข้อมูลตามวันที่ WFH"
                placeholder="เลือกวันที่"
                value={filterSelectedDate}
                onChange={setFilterSelectedDate}
                clearable
                style={{ width: 250 }}
                valueFormat="DD/MM/YYYY"
                getDayProps={getFilterDayProps}
              />
            </DatesProvider>
            {filterSelectedDate && (
              <Button
                variant="subtle"
                color="gray"
                leftSection={<TbX size={16} />}
                onClick={() => {
                  setFilterSelectedDate(null)
                }}
                style={{ marginTop: 24 }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Group>
        </Card>

        {/* Work Reports Grid - 2 Columns */}
        <Grid>
          {/* Column 1: Submitted Work Reports */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" radius="md" h="100%">
              <Group mb="md">
                <TbCheck size={24} color="#4caf50" />
                <Title order={3}>รายงานการทำงานแล้ว</Title>
                <Badge color="green" size="lg">
                  {filterSelectedDate
                    ? workReportsData?.data?.submitted?.filter(
                      (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                    ).length || 0
                    : workReportsData?.data?.summary?.submitted || 0}{' '}
                  รายการ
                </Badge>
              </Group>

              {isLoadingWorkReports ? (
                <Text>กำลังโหลดข้อมูล...</Text>
              ) : (() => {
                const submittedData = filterSelectedDate
                  ? workReportsData?.data?.submitted?.filter(
                    (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                  ) || []
                  : workReportsData?.data?.submitted || []

                return submittedData.length > 0 ? (
                  <ScrollArea h={400}>
                    <Stack gap="xs">
                      {submittedData.map((report: any) => (
                        <Card key={report.id} withBorder padding="sm" radius="md">
                          <Group gap="xs" mb="xs">
                            <Text fw={500} size="sm">
                              {report.employee_name}
                              {report.employee_nick_name && ` (${report.employee_nick_name})`}
                            </Text>
                            <Badge color="green" size="sm">
                              ส่งแล้ว
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {report.employee_position} • {report.employee_id}
                          </Text>
                          <Text size="xs" c="dimmed" mt="xs">
                            วันที่ WFH: {formatThaiDate(report.wfh_date)}
                          </Text>
                          {report.work_report_submitted_at && (
                            <Text size="xs" c="dimmed">
                              ส่งเมื่อ: {dayjs(report.work_report_submitted_at).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          )}
                        </Card>
                      ))}
                    </Stack>
                  </ScrollArea>
                ) : (
                  <Alert color="green">
                    {filterSelectedDate
                      ? `ไม่มีรายงานการทำงานที่ส่งแล้วในวันที่ ${formatThaiDate(dayjs(filterSelectedDate).format('YYYY-MM-DD'))}`
                      : 'ไม่มีรายงานการทำงานที่ส่งแล้ว'}
                  </Alert>
                )
              })()}
            </Card>
          </Grid.Col>

          {/* Column 2: Not Submitted Work Reports */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" radius="md" h="100%">
              <Group mb="md">
                <TbClock size={24} color="#ff9800" />
                <Title order={3}>ยังไม่ได้รายงาน</Title>
                <Badge color="orange" size="lg">
                  {filterSelectedDate
                    ? (workReportsData?.data?.not_submitted?.filter(
                      (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                    ).length || 0) +
                    (workReportsData?.data?.overdue?.filter(
                      (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                    ).length || 0)
                    : workReportsData?.data?.summary?.not_submitted || 0}{' '}
                  รายการ
                </Badge>
              </Group>

              {isLoadingWorkReports ? (
                <Text>กำลังโหลดข้อมูล...</Text>
              ) : (() => {
                const notSubmittedData = filterSelectedDate
                  ? workReportsData?.data?.not_submitted?.filter(
                    (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                  ) || []
                  : workReportsData?.data?.not_submitted || []

                const overdueData = filterSelectedDate
                  ? workReportsData?.data?.overdue?.filter(
                    (r: any) => r.wfh_date === dayjs(filterSelectedDate).format('YYYY-MM-DD')
                  ) || []
                  : workReportsData?.data?.overdue || []

                const allNotSubmitted = [...notSubmittedData, ...overdueData]

                return allNotSubmitted.length > 0 ? (
                  <ScrollArea h={400}>
                    <Stack gap="xs">
                      {allNotSubmitted.map((report: any) => {
                        const wfhDate = new Date(report.wfh_date)
                        wfhDate.setHours(0, 0, 0, 0)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const daysDiff = Math.floor((today.getTime() - wfhDate.getTime()) / (1000 * 60 * 60 * 24))
                        const canStillSubmit = daysDiff >= 0 && daysDiff <= 2

                        return (
                          <Card key={report.id} withBorder padding="sm" radius="md">
                            <Group gap="xs" mb="xs">
                              <Text fw={500} size="sm">
                                {report.employee_name}
                                {report.employee_nick_name && ` (${report.employee_nick_name})`}
                              </Text>
                              <Badge color={canStillSubmit ? 'orange' : 'red'} size="sm">
                                {canStillSubmit ? `ส่งภายใน ${2 - daysDiff} วัน` : 'เลยกำหนด'}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {report.employee_position} • {report.employee_id}
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                              วันที่ WFH: {formatThaiDate(report.wfh_date)}
                            </Text>
                          </Card>
                        )
                      })}
                    </Stack>
                  </ScrollArea>
                ) : (
                  <Alert color="green">
                    {filterSelectedDate
                      ? `ไม่มีรายงานการทำงานที่ยังไม่ได้ส่งในวันที่ ${formatThaiDate(dayjs(filterSelectedDate).format('YYYY-MM-DD'))}`
                      : 'ไม่มีรายงานการทำงานที่ยังไม่ได้ส่ง'}
                  </Alert>
                )
              })()}
            </Card>
          </Grid.Col>
        </Grid>
      </Card>
    </Stack>
  )
}
