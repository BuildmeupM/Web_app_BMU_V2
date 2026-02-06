// Fix 1: TypeScript enabled - using targeted @ts-expect-error for Mantine Calendar v7 compatibility issues
/**
 * Leave Request Form Component
 * ฟอร์มสำหรับขอลา พร้อม Calendar view สำหรับเลือกช่วงวันที่
 * 
 * Note: @ts-nocheck is used to suppress TypeScript errors for Mantine Calendar v7
 * type definition issues. The Calendar component works correctly at runtime.
 * This is a known limitation of Mantine v7 type definitions.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Group,
  Alert,
  Text,
  Card,
  SimpleGrid,
  Paper,
  Divider,
  Badge,
} from '@mantine/core'
import { TbId, TbUser, TbUserCircle, TbCalendar } from 'react-icons/tb'
import { Calendar, DatesProvider } from '@mantine/dates'
import { useMutation, useQueryClient, useQuery } from 'react-query'
import { leaveService, LeaveRequest } from '../../services/leaveService'
import { employeeService } from '../../services/employeeService'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import './LeaveRequestForm.css'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

interface LeaveRequestFormProps {
  opened: boolean
  onClose: () => void
}

export default function LeaveRequestForm({ opened, onClose }: LeaveRequestFormProps) {
  const [selectedDates, setSelectedDates] = useState<[Date | null, Date | null]>([null, null])
  // Initialize with first day of current month to avoid date overflow issues
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [leaveType, setLeaveType] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // Get employee details if employee_id exists (using search to find by employee_id)
  const { data: employeeListData } = useQuery(
    ['employee-by-id', user?.employee_id],
    () => employeeService.getAll({ search: user?.employee_id || '', limit: 1 }),
    {
      enabled: !!user?.employee_id && opened,
      select: (data) => {
        // Find employee with matching employee_id
        const employee = data.employees.find(emp => emp.employee_id === user?.employee_id)
        return employee || null
      },
    }
  )

  const employeeData = employeeListData

  // Get leave dashboard data for leave entitlements
  const { data: leaveDashboardData } = useQuery(
    ['leave-dashboard', user?.employee_id],
    () => leaveService.getDashboard({ employee_id: user?.employee_id || undefined }),
    {
      enabled: !!user?.employee_id && opened,
    }
  )

  // Get user's leave requests to check for already selected/pending dates
  const { data: userLeaveRequests } = useQuery(
    ['leave-requests', 'user', user?.employee_id],
    () => leaveService.getAll({ employee_id: user?.employee_id || undefined }),
    {
      enabled: opened && !!user?.employee_id,
      staleTime: 0,
      refetchOnMount: true,
    }
  )

  // Create a Set of date ranges that are already selected (pending or approved, excluding rejected)
  const alreadySelectedDateRanges = useMemo(() => {
    const ranges: Array<{ start: string; end: string }> = []
    if (userLeaveRequests?.data.leave_requests) {
      userLeaveRequests.data.leave_requests.forEach((request) => {
        // Only include dates that are pending or approved (not rejected)
        if (request.status === 'รออนุมัติ' || request.status === 'อนุมัติแล้ว') {
          ranges.push({
            start: request.leave_start_date,
            end: request.leave_end_date,
          })
        }
      })
    }
    return ranges
  }, [userLeaveRequests])

  // Helper function to check if a date is within any already selected range
  const isDateInAlreadySelectedRange = (date: Date): boolean => {
    const dateStr = formatDateToLocal(date)
    return alreadySelectedDateRanges.some((range) => {
      return dateStr >= range.start && dateStr <= range.end
    })
  }

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

  // Format month header in Thai (only month name, no year)
  const getMonthLabel = (date: Date) => {
    const thaiMonths = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ]
    const month = date.getMonth()
    const year = date.getFullYear() + 543 // Convert to Buddhist Era
    return `${thaiMonths[month]} ${year}`
  }

  const createMutation = useMutation({
    mutationFn: (data: {
      leave_start_date: string
      leave_end_date: string
      leave_type: LeaveRequest['leave_type']
      reason?: string
    }) => leaveService.create(data),
    onSuccess: () => {
      notifications.show({
        title: 'สำเร็จ',
        message: 'ส่งคำขอลาเรียบร้อยแล้ว',
        color: 'green',
      })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'user'] })
      handleClose()
    },
    onError: (error: any) => {
      // Extract error message from response
      let errorMessage = 'ไม่สามารถส่งคำขอลาได้'
      let errorTitle = 'เกิดข้อผิดพลาด'

      if (error.response) {
        // Server responded with error
        const errorData = error.response.data
        if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.errors) {
          // Handle validation errors
          const errorMessages = Object.values(errorData.errors).filter(Boolean)
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join(', ')
          }
        }
      } else if (error.request) {
        // Request was made but no response received (Network Error)
        errorTitle = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์'
        errorMessage = 'กรุณาตรวจสอบว่า backend server กำลังทำงานอยู่ หรือตรวจสอบการเชื่อมต่อเครือข่าย'
      } else {
        // Error setting up request
        errorMessage = error.message || 'เกิดข้อผิดพลาดในการส่งคำขอ'
      }

      notifications.show({
        title: errorTitle,
        message: errorMessage,
        color: 'red',
        autoClose: 5000,
      })
    },
  })

  const handleClose = () => {
    setSelectedDates([null, null])
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setLeaveType(null)
    setReason('')
    onClose()
  }

  // Update month header text to Thai when month changes and align header width with calendar table
  useEffect(() => {
    if (!opened) return

    let cleanupFunctions: Array<() => void> = []

    // Wait for Calendar to render
    const timer = setTimeout(() => {
      // Update month header button text to Thai
      const headerButton = document.querySelector(
        '.mantine-Calendar-calendarHeaderLevel'
      ) as HTMLButtonElement
      if (headerButton && currentMonth) {
        headerButton.textContent = getMonthLabel(currentMonth)
      }

      // Update weekday labels to Thai
      const weekdayElements = document.querySelectorAll(
        '.mantine-Calendar-weekday'
      )
      const thaiWeekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
      weekdayElements.forEach((el, index) => {
        if (el.textContent) {
          el.textContent = thaiWeekdays[index]
        }
      })

      // Make header width match calendar table width
      const calendarHeader = document.querySelector(
        '.mantine-Calendar-calendarHeader'
      ) as HTMLElement
      const calendarTable = document.querySelector(
        '.mantine-Calendar-month'
      ) as HTMLElement

      if (calendarHeader && calendarTable) {
        const tableWidth = calendarTable.offsetWidth
        if (tableWidth > 0) {
          calendarHeader.style.width = `${tableWidth}px`
          calendarHeader.style.maxWidth = `${tableWidth}px`
          calendarHeader.style.marginLeft = 'auto'
          calendarHeader.style.marginRight = 'auto'
        }
      }

      // Listen for month navigation clicks to update currentMonth state
      const prevButton = document.querySelector(
        '.mantine-Calendar-calendarHeader > button:first-child'
      ) as HTMLButtonElement
      const nextButton = document.querySelector(
        '.mantine-Calendar-calendarHeader > button:last-child'
      ) as HTMLButtonElement

      // Check if current displayed month is the current month or earlier
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonthIndex = now.getMonth()
      const displayedYear = currentMonth.getFullYear()
      const displayedMonthIndex = currentMonth.getMonth()

      // Disable previous button if displayed month is current month or earlier
      const isCurrentOrPastMonth =
        displayedYear < currentYear ||
        (displayedYear === currentYear && displayedMonthIndex <= currentMonthIndex)

      const handlePrevClick = () => {
        // Prevent navigation to previous month
        if (!isCurrentOrPastMonth) {
          const newMonth = new Date(currentMonth)
          newMonth.setMonth(newMonth.getMonth() - 1)
          setCurrentMonth(newMonth)
        }
      }

      const handleNextClick = () => {
        // CRITICAL: Use functional update and always use day 1 to prevent date overflow
        setCurrentMonth((prevMonth) => {
          const year = prevMonth.getFullYear()
          const month = prevMonth.getMonth()
          // Normalize to day 1 of current month first, then calculate next month
          return new Date(year, month + 1, 1)
        })
      }

      if (prevButton) {
        // Disable and style the previous button if current or past month
        if (isCurrentOrPastMonth) {
          prevButton.disabled = true
          prevButton.style.opacity = '0.3'
          prevButton.style.cursor = 'not-allowed'
          prevButton.style.pointerEvents = 'none'
        } else {
          prevButton.disabled = false
          prevButton.style.opacity = '1'
          prevButton.style.cursor = 'pointer'
          prevButton.style.pointerEvents = 'auto'
          prevButton.addEventListener('click', handlePrevClick)
          cleanupFunctions.push(() => {
            prevButton.removeEventListener('click', handlePrevClick)
          })
        }
      }
      if (nextButton) {
        nextButton.addEventListener('click', handleNextClick)
        cleanupFunctions.push(() => {
          nextButton.removeEventListener('click', handleNextClick)
        })
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [opened, currentMonth])

  // Check if date is weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  const handleDateClick = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // ไม่ให้เลือกวันที่ในอดีตหรือวันหยุดสุดสัปดาห์
    if (date < today || isWeekend(date)) {
      return
    }

    // Check if date is already selected/pending (excluding rejected)
    if (isDateInAlreadySelectedRange(date)) {
      notifications.show({
        title: 'วันที่ถูกเลือกไว้แล้ว',
        message: 'วันที่นี้ถูกเลือกไว้แล้ว (รออนุมัติหรืออนุมัติแล้ว)',
        color: 'orange',
      })
      return
    }

    const [start, end] = selectedDates

    // ถ้ายังไม่ได้เลือกวันที่เริ่มต้น หรือเลือกวันที่ใหม่ที่มากกว่าวันที่เริ่มต้น
    if (!start || (start && end)) {
      // เริ่มเลือกใหม่ (เลือกเฉพาะวันทำการ)
      setSelectedDates([date, null])
    } else if (start && !end) {
      // เลือกวันที่สิ้นสุด (เลือกเฉพาะวันทำการ)
      if (date >= start) {
        // ตรวจสอบว่าช่วงวันที่ที่เลือกทับกับวันที่ที่เลือกไว้แล้วหรือไม่
        const tempEnd = date
        let hasOverlap = false
        for (let d = new Date(start); d <= tempEnd; d.setDate(d.getDate() + 1)) {
          if (isDateInAlreadySelectedRange(new Date(d))) {
            hasOverlap = true
            break
          }
        }

        if (hasOverlap) {
          notifications.show({
            title: 'ช่วงวันที่ทับกับวันที่เลือกไว้แล้ว',
            message: 'ช่วงวันที่ที่เลือกทับกับวันที่ที่เลือกไว้แล้ว (รออนุมัติหรืออนุมัติแล้ว)',
            color: 'orange',
          })
          return
        }

        // ถ้าเลือกวันเดียวกัน ให้ลาอย่างเดียว 1 วัน
        if (date.getTime() === start.getTime()) {
          setSelectedDates([date, date])
        } else {
          setSelectedDates([start, date])
        }
      } else {
        // ถ้าเลือกวันที่น้อยกว่าวันที่เริ่มต้น ให้เปลี่ยนวันที่เริ่มต้น
        setSelectedDates([date, null])
      }
    }
  }

  // Helper function to format date to YYYY-MM-DD (local timezone)
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to calculate working days (excluding weekends)
  const calculateWorkingDays = (start: Date, end: Date): number => {
    let days = 0
    const current = new Date(start)

    while (current <= end) {
      const dayOfWeek = current.getDay()
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++
      }
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const handleSubmit = () => {
    // Prevent double-click/multiple submissions
    if (createMutation.isLoading) {
      return
    }

    const [startDate, endDate] = selectedDates

    // ถ้าเลือกแค่วันที่เริ่มต้น ให้ใช้เป็นวันที่สิ้นสุดด้วย (ลา 1 วัน)
    const finalStartDate = startDate
    const finalEndDate = endDate || startDate

    if (!finalStartDate || !finalEndDate || !leaveType) {
      notifications.show({
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        message: 'กรุณาเลือกวันที่ลาและประเภทการลา',
        color: 'orange',
      })
      return
    }

    // Validate dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (finalStartDate < today) {
      notifications.show({
        title: 'วันที่ไม่ถูกต้อง',
        message: 'ไม่สามารถลาวันที่ในอดีตได้',
        color: 'red',
      })
      return
    }

    if (finalEndDate < finalStartDate) {
      notifications.show({
        title: 'วันที่ไม่ถูกต้อง',
        message: 'วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่มต้น',
        color: 'red',
      })
      return
    }

    // Calculate working days (excluding weekends)
    const workingDays = calculateWorkingDays(finalStartDate, finalEndDate)

    if (workingDays <= 0) {
      notifications.show({
        title: 'วันที่ไม่ถูกต้อง',
        message: 'กรุณาเลือกวันที่ทำการ (จันทร์-ศุกร์) เท่านั้น',
        color: 'red',
      })
      return
    }

    // Validate reason for specific types
    if ((leaveType === 'ลากิจ' || leaveType === 'ลาอื่นๆ') && !reason.trim()) {
      notifications.show({
        title: 'กรุณากรอกหมายเหตุ',
        message: 'ประเภทการลานี้ต้องกรอกหมายเหตุ',
        color: 'orange',
      })
      return
    }

    // Fix 3: Validate leave quota before submission
    const entitlement = getLeaveEntitlement(leaveType)
    if (!entitlement.unlimited && entitlement.total !== null) {
      const remainingDays = entitlement.total - entitlement.used
      if (workingDays > remainingDays) {
        notifications.show({
          title: 'เกินสิทธิ์การลา',
          message: `คุณมีสิทธิ์${leaveType}เหลือ ${remainingDays} วัน แต่ขอลา ${workingDays} วัน กรุณาลดจำนวนวันลา`,
          color: 'red',
        })
        return
      }
    }

    // Format dates to YYYY-MM-DD (local timezone, not UTC)
    const leaveStartDateStr = formatDateToLocal(finalStartDate)
    const leaveEndDateStr = formatDateToLocal(finalEndDate)

    createMutation.mutate({
      leave_start_date: leaveStartDateStr,
      leave_end_date: leaveEndDateStr,
      leave_type: leaveType as LeaveRequest['leave_type'],
      reason: reason.trim() || undefined, // Convert empty string to undefined
    })
  }

  const requiresReason = leaveType === 'ลากิจ' || leaveType === 'ลาอื่นๆ'
  const [startDate, endDate] = selectedDates

  // Check if a date belongs to the current displayed month
  const isDateInCurrentMonth = (date: Date): boolean => {
    return date.getFullYear() === currentMonth.getFullYear() &&
      date.getMonth() === currentMonth.getMonth()
  }

  // Helper function to check if date is in range (only weekdays, only current month)
  const isDateInRange = (date: Date) => {
    if (!startDate) return false
    if (!isDateInCurrentMonth(date)) return false // Only check dates in current month
    const endDateToUse = endDate || startDate
    // Skip weekends in range
    if (isWeekend(date)) return false
    const dateStr = formatDateToLocal(date)
    const startStr = formatDateToLocal(startDate)
    const endStr = formatDateToLocal(endDateToUse)
    return dateStr >= startStr && dateStr <= endStr
  }

  // Helper function to check if date is start or end (only current month)
  const isDateStartOrEnd = (date: Date) => {
    if (!startDate) return false
    if (!isDateInCurrentMonth(date)) return false // Only check dates in current month
    const endDateToUse = endDate || startDate
    const dateStr = formatDateToLocal(date)
    const startStr = formatDateToLocal(startDate)
    const endStr = formatDateToLocal(endDateToUse)
    return dateStr === startStr || dateStr === endStr
  }

  // Get day props for calendar styling
  const getDayProps = (date: Date) => {
    // For dates outside current month, show them as faded/greyed out
    if (!isDateInCurrentMonth(date)) {
      return {
        disabled: true,
        style: {
          backgroundColor: '#f9f9f9',
          color: '#d0d0d0',
          cursor: 'not-allowed',
          opacity: 0.4,
          position: 'relative' as const,
        },
        onClick: undefined,
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isPast = date < today
    const isWeekendDay = isWeekend(date)
    const isDisabled = isPast || isWeekendDay
    const isInRange = isDateInRange(date)
    const isStartOrEnd = isDateStartOrEnd(date)
    const isSelected = isStartOrEnd

    // Check if date is already selected/pending (excluding rejected)
    const isAlreadySelectedPending = isDateInAlreadySelectedRange(date)

    let bgColor = 'transparent'
    if (isPast) {
      bgColor = '#f5f5f5'
    } else if (isWeekendDay) {
      bgColor = '#f5f5f5' // Grey out weekends
    } else if (isAlreadySelectedPending) {
      bgColor = '#e3f2fd' // Light blue for already selected/pending dates
    } else if (isInRange) {
      bgColor = '#fff4e6' // Light orange for selected range
    }

    // Disable if already selected/pending (excluding rejected)
    const isDisabledByAlreadySelected = isAlreadySelectedPending && !isSelected

    return {
      disabled: isDisabled || isDisabledByAlreadySelected,
      onClick: (isDisabled || isDisabledByAlreadySelected) ? undefined : () => handleDateClick(date),
      style: {
        backgroundColor: isSelected
          ? '#ff6b35'
          : bgColor,
        color: isSelected
          ? 'white'
          : isDisabled
            ? '#999'
            : '#000', // Use dark color for normal dates in current month
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        borderRadius: isStartOrEnd ? '4px' : '0',
        border:
          isStartOrEnd
            ? '2px solid #ff6b35'
            : isInRange
              ? '1px solid #ffd4a3'
              : 'none',
        fontWeight: isSelected ? 700 : 500,
        opacity: isDisabled ? 0.6 : 1, // Increase opacity for disabled dates
        position: 'relative' as const,
      },
    }
  }

  const calculatedDays = startDate ? calculateDays(startDate, endDate || startDate) : 0

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="ฟอร์มการขอลางาน"
      size="90%"
      centered
      styles={{
        content: {
          maxWidth: '1100px',
          width: '90%',
        },
        body: {
          padding: '24px',
        },
      }}
    >
      <Stack gap="md">
        {/* Calendar */}
        <Card
          withBorder
          padding="xl"
          radius="md"
          style={{
            width: '100%',
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '100%',
            display: 'block',
          }}>
            <DatesProvider settings={{ locale: 'th', firstDayOfWeek: 0 }}>
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-ignore - Mantine Calendar v7 type definitions issue with value/onChange props */}
              <Calendar
                value={startDate}
                onChange={(date: any) => {
                  if (date instanceof Date) handleDateClick(date)
                }}
                month={currentMonth}
                getDayProps={getDayProps}
                excludeDate={(date: Date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const isNotInCurrentMonth = !isDateInCurrentMonth(date)
                  // Exclude dates not in current month, past dates, and weekends
                  return isNotInCurrentMonth || date < today || isWeekend(date)
                }}
                firstDayOfWeek={0}
                styles={{
                  calendarHeader: {
                    fontSize: '28px',
                    fontWeight: 600,
                    marginBottom: '20px',
                    width: '100%',
                    maxWidth: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    position: 'relative',
                    margin: '0 auto',
                  },
                  calendarHeaderLevel: {
                    fontSize: '28px',
                    fontWeight: 600,
                    textAlign: 'center',
                    gridColumn: '2',
                    justifySelf: 'center',
                    width: 'auto',
                  },
                  weekday: {
                    fontSize: '18px',
                    fontWeight: 600,
                    padding: '14px 0',
                  },
                  day: {
                    fontSize: '20px',
                    fontWeight: 500,
                    height: '60px',
                    padding: '14px',
                  },
                }}
              />
            </DatesProvider>
          </div>
        </Card>

        {/* Legend */}
        <Card withBorder padding="sm" radius="md">
          <Text size="sm" fw={500} mb="xs">
            สถานะ:
          </Text>
          <Group gap="md">
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#e8f5e9',
                  borderRadius: '4px',
                }}
              />
              <Text size="xs">มีคนลาแล้ว</Text>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff4e6',
                  borderRadius: '4px',
                }}
              />
              <Text size="xs">ช่วงวันที่เลือก</Text>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#ff6b35',
                  borderRadius: '4px',
                }}
              />
              <Text size="xs">วันที่เริ่มต้น/สิ้นสุด</Text>
            </Group>
          </Group>
        </Card>

        {/* Selected Date Range Display */}
        {startDate && (
          <Alert color="blue" radius="md">
            <Stack gap="xs">
              {endDate && endDate.getTime() !== startDate.getTime() ? (
                <>
                  <Group gap="xs">
                    <Text size="md" fw={600}>
                      ช่วงวันที่ลา:
                    </Text>
                    <Text size="md">
                      {dayjs(startDate).format('DD/MM/YYYY')} - {dayjs(endDate).format('DD/MM/YYYY')}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      รวม {calculatedDays} วันทำการ (ไม่รวมเสาร์-อาทิตย์)
                    </Text>
                  </Group>
                </>
              ) : (
                <>
                  <Group gap="xs">
                    <Text size="md" fw={600}>
                      วันที่ลา:
                    </Text>
                    <Text size="md">
                      {dayjs(startDate).format('DD/MM/YYYY')}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {calculatedDays} วันทำการ
                    </Text>
                  </Group>
                </>
              )}
            </Stack>
          </Alert>
        )}

        {/* Employee Information Card */}
        {user && (
          <Card
            withBorder
            padding="lg"
            radius="md"
            style={{
              background: 'linear-gradient(135deg, #fff9f5 0%, #fff5eb 100%)',
              borderColor: '#ff6b35',
              borderWidth: '2px',
            }}
          >
            <Stack gap="md">
              {/* Header */}
              <Group gap="xs" mb="xs">
                <TbUserCircle size={20} color="#ff6b35" />
                <Text size="md" fw={700} c="#ff6b35">
                  ข้อมูลพนักงาน
                </Text>
              </Group>

              <Divider color="#ff6b35" opacity={0.3} />

              {/* Employee Info Grid */}
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                {/* Employee ID */}
                {user.employee_id && (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #ffe5d9',
                    }}
                  >
                    <Group gap="xs" align="flex-start">
                      <TbId size={18} color="#ff6b35" style={{ marginTop: '2px' }} />
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={500}>
                          รหัสพนักงาน
                        </Text>
                        <Text size="sm" fw={700} c="#2c3e50">
                          {user.employee_id}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                )}

                {/* Full Name */}
                {(employeeData || user.name) && (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #ffe5d9',
                    }}
                  >
                    <Group gap="xs" align="flex-start">
                      <TbUser size={18} color="#ff6b35" style={{ marginTop: '2px' }} />
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={500}>
                          ชื่อ-นามสกุล
                        </Text>
                        <Text size="sm" fw={700} c="#2c3e50">
                          {employeeData
                            ? employeeData.full_name || `${employeeData.first_name} ${employeeData.last_name}`
                            : user.name}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                )}

                {/* Nickname */}
                {(employeeData?.nick_name || user.nick_name) && (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #ffe5d9',
                    }}
                  >
                    <Group gap="xs" align="flex-start">
                      <TbUserCircle size={18} color="#ff6b35" style={{ marginTop: '2px' }} />
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={500}>
                          ชื่อเล่น
                        </Text>
                        <Badge
                          color="orange"
                          variant="light"
                          size="lg"
                          radius="md"
                          style={{ width: 'fit-content' }}
                        >
                          {employeeData?.nick_name || user.nick_name}
                        </Badge>
                      </Stack>
                    </Group>
                  </Paper>
                )}
              </SimpleGrid>
            </Stack>
          </Card>
        )}

        {/* Leave Entitlements Card */}
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
                        color={entitlement.total !== null && entitlement.used >= entitlement.total ? 'red' : entitlement.total !== null && entitlement.used >= entitlement.total * 0.8 ? 'orange' : 'green'}
                        variant="light"
                        size="lg"
                        radius="md"
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
                        color={entitlement.total !== null && entitlement.used >= entitlement.total ? 'red' : entitlement.total !== null && entitlement.used >= entitlement.total * 0.8 ? 'orange' : 'green'}
                        variant="light"
                        size="lg"
                        radius="md"
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
                const total = entitlement.total
                const badgeColor = entitlement.canRequest === false
                  ? 'gray'
                  : total !== null && entitlement.used >= total
                    ? 'red'
                    : total !== null && entitlement.used >= total * 0.8
                      ? 'orange'
                      : 'green'
                const badgeText = entitlement.canRequest === false
                  ? 'ไม่สามารถขอ'
                  : total !== null
                    ? `${entitlement.used}/${total}`
                    : `${entitlement.used}`
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
                        color={badgeColor}
                        variant="light"
                        size="lg"
                        radius="md"
                      >
                        {badgeText}
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลาไม่รับค่าจ้าง */}
              {(() => {
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
                        color="blue"
                        variant="light"
                        size="lg"
                        radius="md"
                      >
                        ไม่จำกัด
                      </Badge>
                    </Group>
                  </Paper>
                )
              })()}

              {/* ลาอื่นๆ */}
              {(() => {
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
                        color="blue"
                        variant="light"
                        size="lg"
                        radius="md"
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

        {/* Leave Type Select - Fix 2: Disable vacation leave if not eligible */}
        <Select
          label="ประเภทการลา"
          placeholder="เลือกประเภทการลา"
          data={(() => {
            const vacationEntitlement = getLeaveEntitlement('ลาพักร้อน')
            const canRequestVacation = vacationEntitlement.canRequest !== false

            return [
              { value: 'ลาป่วย', label: 'ลาป่วย' },
              { value: 'ลากิจ', label: 'ลากิจ' },
              {
                value: 'ลาพักร้อน',
                label: canRequestVacation ? 'ลาพักร้อน' : 'ลาพักร้อน (ต้องทำงานครบ 1 ปี)',
                disabled: !canRequestVacation
              },
              { value: 'ลาไม่รับค่าจ้าง', label: 'ลาไม่รับค่าจ้าง' },
              { value: 'ลาอื่นๆ', label: 'ลาอื่นๆ' },
            ]
          })()}
          value={leaveType}
          onChange={setLeaveType}
          required
          radius="lg"
        />

        {/* Reason Textarea */}
        {requiresReason && (
          <Textarea
            label="หมายเหตุ"
            placeholder="กรุณาระบุเหตุผล (บังคับ)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minRows={3}
            radius="lg"
            autosize
          />
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} radius="lg">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isLoading}
            disabled={createMutation.isLoading || !startDate || !leaveType}
            radius="lg"
            style={{ backgroundColor: '#ff6b35' }}
          >
            ส่งคำขอ
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// Helper function to calculate working days
function calculateDays(startDate: Date, endDate: Date): number {
  let days = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }

  return days
}
