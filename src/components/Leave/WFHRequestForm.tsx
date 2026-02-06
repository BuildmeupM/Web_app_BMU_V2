/**
 * WFH Request Form Component
 * ฟอร์มสำหรับขอ WFH พร้อม Calendar view
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Stack,
  Button,
  Group,
  Alert,
  Text,
  Grid,
  Card,
  Badge,
  Title,
  ScrollArea,
  Tooltip,
} from '@mantine/core'
import { Calendar, DatesProvider } from '@mantine/dates'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { wfhService } from '../../services/leaveService'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import './LeaveRequestForm.css'

interface WFHRequestFormProps {
  opened: boolean
  onClose: () => void
}

export default function WFHRequestForm({ opened, onClose }: WFHRequestFormProps) {
  // Change to multiple dates selection (array of dates)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  // State for displaying employee names for selected date
  const [selectedDateForDisplay, setSelectedDateForDisplay] = useState<Date | null>(null)
  // Initialize with first day of current month to avoid date overflow issues
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // Get calendar data for the selected month
  const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
  const { data: calendarData } = useQuery(
    ['wfh-calendar', monthStr],
    () => wfhService.getCalendar({ month: monthStr }),
    {
      enabled: opened && !!monthStr,
      staleTime: 0, // Always refetch when month changes
      refetchOnMount: true, // Refetch when component mounts
    }
  )

  // Get user's WFH requests to check for already selected/pending dates
  const { data: userWFHRequests } = useQuery(
    ['wfh-requests', 'user', user?.employee_id],
    () => wfhService.getAll({ employee_id: user?.employee_id }),
    {
      enabled: opened && !!user?.employee_id,
      staleTime: 0,
      refetchOnMount: true,
    }
  )

  // Create a Set of dates that are already selected (pending or approved, excluding rejected)
  const alreadySelectedDates = useMemo(() => {
    const dateSet = new Set<string>()
    if (userWFHRequests?.data.wfh_requests) {
      userWFHRequests.data.wfh_requests.forEach((request) => {
        // Only include dates that are pending or approved (not rejected)
        if (request.status === 'รออนุมัติ' || request.status === 'อนุมัติแล้ว') {
          dateSet.add(request.wfh_date)
        }
      })
    }
    return dateSet
  }, [userWFHRequests])

  // Calculate used days including pending requests
  const usedDaysIncludingPending = useMemo(() => {
    if (!userWFHRequests?.data.wfh_requests) return 0
    return userWFHRequests.data.wfh_requests.filter(
      (req) => req.status === 'รออนุมัติ' || req.status === 'อนุมัติแล้ว'
    ).length
  }, [userWFHRequests])

  // Format month header in Thai (month name with year in Buddhist Era)
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

  // Check if date is weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  // Helper function to format date to YYYY-MM-DD (local timezone, avoid timezone issues)
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleClose = () => {
    setSelectedDates([])
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    onClose()
  }

  const handleSubmit = async () => {
    if (selectedDates.length === 0) {
      notifications.show({
        title: 'กรุณาเลือกวันที่',
        message: 'กรุณาเลือกวันที่ที่ต้องการขอ WFH',
        color: 'orange',
      })
      return
    }

    // Check if selected dates exceed remaining monthly limit
    if (selectedDates.length > remainingDays) {
      notifications.show({
        title: 'เกินขีดจำกัด',
        message: `คุณสามารถเลือกได้สูงสุด ${remainingDays} วัน (เหลือ ${remainingDays} วันจาก ${monthlyLimit} วันต่อเดือน)`,
        color: 'red',
      })
      return
    }

    setIsSubmitting(true)
    
    // Submit all selected dates sequentially
    try {
      for (const date of selectedDates) {
        await wfhService.create({
          wfh_date: formatDateToLocal(date),
        })
      }
      
      // Show success notification
      notifications.show({
        title: 'สำเร็จ',
        message: `ส่งคำขอ WFH จำนวน ${selectedDates.length} วันเรียบร้อยแล้ว`,
        color: 'green',
      })
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['wfh-requests'] })
      queryClient.invalidateQueries({ queryKey: ['wfh-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['wfh-requests', 'user'] })
      
      // Close after submitting
      handleClose()
    } catch (error: any) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error.response?.data?.message || 'ไม่สามารถส่งคำขอ WFH ได้',
        color: 'red',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get day status from calendar data
  const getDayStatus = (date: Date) => {
    if (!calendarData?.data.calendar) return null
    const dateStr = formatDateToLocal(date)
    const dayData = calendarData.data.calendar.find((d) => d.date === dateStr)
    return dayData ? dayData.status : null
  }

  // Get day approved count
  const getDayApprovedCount = (date: Date) => {
    if (!calendarData?.data.calendar) return null
    const dateStr = formatDateToLocal(date)
    const dayData = calendarData.data.calendar.find((d) => d.date === dateStr)
    return dayData ? dayData.approved_count : 0
  }

  // Check if a date belongs to the current displayed month
  const isDateInCurrentMonth = (date: Date): boolean => {
    return date.getFullYear() === selectedMonth.getFullYear() &&
           date.getMonth() === selectedMonth.getMonth()
  }

  // Handle date click - support multiple dates selection up to monthly limit
  const handleDateClick = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Always set selected date for display when clicking any date
    setSelectedDateForDisplay(date)
    
    // ไม่ให้เลือกวันที่ในอดีตหรือวันหยุดสุดสัปดาห์
    if (date < today || isWeekend(date)) {
      return
    }

    // Check if date is already selected/pending (excluding rejected)
    const dateStr = formatDateToLocal(date)
    if (alreadySelectedDates.has(dateStr)) {
      notifications.show({
        title: 'วันที่ถูกเลือกไว้แล้ว',
        message: 'วันที่นี้ถูกเลือกไว้แล้ว (รออนุมัติหรืออนุมัติแล้ว)',
        color: 'orange',
      })
      return
    }

    // Check if date is full
    const status = getDayStatus(date)
    if (status === 'full') {
      return
    }

    // Toggle date selection (add if not selected, remove if already selected)
    setSelectedDates((prevDates) => {
      const isAlreadySelected = prevDates.some(
        (d) => formatDateToLocal(d) === dateStr
      )
      
      if (isAlreadySelected) {
        // Remove date if already selected
        return prevDates.filter((d) => formatDateToLocal(d) !== dateStr)
      } else {
        // Check monthly limit before adding (include pending requests)
        if (prevDates.length >= remainingDays) {
          notifications.show({
            title: 'ถึงขีดจำกัด',
            message: `สามารถเลือกได้สูงสุด ${remainingDays} วัน (เหลือ ${remainingDays} วันจาก ${monthlyLimit} วันต่อเดือน)`,
            color: 'orange',
          })
          return prevDates
        }
        // Add date
        return [...prevDates, date].sort((a, b) => a.getTime() - b.getTime())
      }
    })
  }

  // Get day props for calendar styling (copied from LeaveRequestForm and adapted for WFH)
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
    
    // Check status for WFH
    const status = getDayStatus(date)
    const isFull = status === 'full'
    const isDisabledByStatus = isDisabled || isFull
    
    // Check if date is in selected dates array
    const dateStr = formatDateToLocal(date)
    const isSelected = selectedDates.some(
      (d) => formatDateToLocal(d) === dateStr
    )

    // Check if date is already selected/pending (excluding rejected)
    const isAlreadySelectedPending = alreadySelectedDates.has(dateStr)

    let bgColor = 'transparent'
    if (isPast) {
      bgColor = '#f5f5f5'
    } else if (isWeekendDay) {
      bgColor = '#f5f5f5' // Grey out weekends
    } else if (isAlreadySelectedPending) {
      bgColor = '#e3f2fd' // Light blue for already selected/pending dates
    } else if (isFull) {
      bgColor = '#ffebee' // Red for full
    } else if (status === 'warning') {
      bgColor = '#fff9c4' // Yellow for warning
    } else {
      // Default to vibrant green for available weekdays (like image)
      bgColor = '#4caf50' // Vibrant green (#4caf50) for available weekdays (like image)
    }

    // Disable if already selected/pending (excluding rejected)
    const isDisabledByAlreadySelected = isAlreadySelectedPending && !isSelected

    return {
      disabled: isDisabledByStatus || isDisabledByAlreadySelected,
      onClick: (isDisabledByStatus || isDisabledByAlreadySelected) ? undefined : () => handleDateClick(date),
      style: {
        backgroundColor: isSelected
          ? '#ff6b35'
          : bgColor,
        color: isSelected 
          ? 'white' 
          : (bgColor === '#e8f5e9' || bgColor === '#4caf50')
          ? 'white' // White text for green cells like image
          : isDisabledByStatus 
          ? '#666' 
          : '#000', // Use dark color for normal dates in current month
        cursor: isDisabledByStatus ? 'not-allowed' : 'pointer',
        borderRadius: '6px',
        border: isSelected 
          ? '2px solid #ff6b35' 
          : bgColor === '#4caf50' || bgColor === '#e8f5e9'
          ? '1px solid rgba(0, 0, 0, 0.1)' 
          : bgColor === '#fff9c4'
          ? '1px solid #ffe082'
          : bgColor === '#ffebee'
          ? '1px solid #ffcdd2'
          : bgColor === '#f5f5f5'
          ? '1px solid rgba(0, 0, 0, 0.1)'
          : '1px solid rgba(0, 0, 0, 0.1)',
        margin: '1px',
        transition: 'all 0.2s ease',
        fontWeight: isSelected ? 700 : 600,
        opacity: isPast ? 0.6 : 1, // Increase opacity for disabled dates
        position: 'relative' as const,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        width: '100%',
        height: '100%',
        aspectRatio: '1',
        padding: '4px',
        boxSizing: 'border-box' as const,
        boxShadow: isSelected ? '0 2px 8px rgba(255, 107, 53, 0.3)' : 'none',
      },
      // Add data attribute for date to use in useEffect (use local format to avoid timezone issues)
      'data-date': formatDateToLocal(date),
    }
  }

  const limits = calendarData?.data.limits
  const monthlyLimit = limits?.monthly_limit || 16
  const usedThisMonth = limits?.used_this_month || 0
  // Include pending requests in used days count
  const totalUsedDays = usedDaysIncludingPending
  const remainingDays = monthlyLimit - totalUsedDays

  // Update month header text to Thai when month changes
  useEffect(() => {
    if (!opened) return

    let cleanupFunctions: Array<() => void> = []

    // Wait for Calendar to render
    const timer = setTimeout(() => {
      // Update month header button text to Thai (month name with year)
      // Disable click functionality - make it display-only (no year/month picker)
      const headerButton = document.querySelector(
        '.mantine-Calendar-calendarHeaderLevel'
      ) as HTMLButtonElement
      if (headerButton && selectedMonth) {
        const thaiMonthNameWithYear = getMonthLabel(selectedMonth)
        headerButton.textContent = thaiMonthNameWithYear
        // Disable click - prevent opening year/month picker
        headerButton.style.pointerEvents = 'none'
        headerButton.style.cursor = 'default'
        headerButton.setAttribute('tabindex', '-1')
        // Prevent default click behavior
        const preventClick = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        headerButton.addEventListener('click', preventClick, true)
        headerButton.addEventListener('mousedown', preventClick, true)
        cleanupFunctions.push(() => {
          headerButton.removeEventListener('click', preventClick, true)
          headerButton.removeEventListener('mousedown', preventClick, true)
        })
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
      
      // Listen for month navigation clicks to update selectedMonth state
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
      const displayedYear = selectedMonth.getFullYear()
      const displayedMonthIndex = selectedMonth.getMonth()
      
      // Disable previous button if displayed month is current month or earlier
      const isCurrentOrPastMonth = 
        displayedYear < currentYear || 
        (displayedYear === currentYear && displayedMonthIndex <= currentMonthIndex)
      
      const handlePrevClick = () => {
        // Prevent navigation to previous month
        if (!isCurrentOrPastMonth) {
          // CRITICAL: Use functional update and always use day 1 to prevent date overflow
          setSelectedMonth((prevMonth) => {
            const year = prevMonth.getFullYear()
            const month = prevMonth.getMonth()
            // Normalize to day 1 of current month first, then calculate previous month
            return new Date(year, month - 1, 1)
          })
        }
      }
      
      const handleNextClick = () => {
        // CRITICAL: Use functional update and always use day 1 to prevent date overflow
        setSelectedMonth((prevMonth) => {
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
      
      // Add approved count display (0/3) below date numbers for weekdays in current month
      const dayCells = document.querySelectorAll('.mantine-Calendar-day')
      dayCells.forEach((cell, index) => {
        const cellElement = cell as HTMLElement
        
        // Get date string from data attribute (set by getDayProps)
        let dateStr = cellElement.getAttribute('data-date')
        
        // If no data-date attribute, calculate from cell position
        if (!dateStr) {
          // Get the day number from cell - it's the main text content
          const cellText = cellElement.textContent?.trim() || ''
          // Extract first number from cell text (the day number)
          const dayMatch = cellText.match(/^(\d+)/)
          if (!dayMatch) return
          
          const dayNumber = parseInt(dayMatch[1])
          if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) return
          
          // Create date from selectedMonth and day number
          const cellDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), dayNumber)
          // Check if this date is actually in the current month
          if (cellDate.getMonth() !== selectedMonth.getMonth()) {
            // This is a date from previous/next month, skip
            return
          }
          dateStr = formatDateToLocal(cellDate)
          cellElement.setAttribute('data-date', dateStr)
        }
        
        if (!dateStr) return
        
        // Parse date from string (YYYY-MM-DD format) - use local timezone to avoid issues
        const dateParts = dateStr.split('-')
        if (dateParts.length !== 3) return
        
        const year = parseInt(dateParts[0], 10)
        const month = parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
        const day = parseInt(dateParts[2], 10)
        
        if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) return
        
        // Create date using local timezone (not UTC)
        const cellDate = new Date(year, month, day)
        if (isNaN(cellDate.getTime())) return
        
        // Check if date is in current month
        if (!isDateInCurrentMonth(cellDate)) {
          // Remove count text for dates outside current month
          const countText = cellElement.querySelector('.wfh-date-count')
          if (countText) {
            countText.remove()
          }
          return
        }
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isPast = cellDate < today
        
        // Only show count for weekdays (Monday-Friday, not weekends) and not past dates
        // Saturday (6) and Sunday (0) should not show count
        const dayOfWeek = cellDate.getDay()
        const isSaturday = dayOfWeek === 6
        const isSunday = dayOfWeek === 0
        const isWeekend = isSaturday || isSunday
        
        // Remove count text if it's a weekend or past date
        if (isWeekend || isPast) {
          const countText = cellElement.querySelector('.wfh-date-count')
          if (countText) {
            countText.remove()
          }
          return
        }
        
        // Show count only for weekdays (Monday-Friday) that are not past
        if (!isPast) {
          // Get approved count from calendar data
          let approvedCount = 0
          if (calendarData?.data.calendar) {
            const dayData = calendarData.data.calendar.find((d) => d.date === dateStr)
            approvedCount = dayData ? dayData.approved_count : 0
          }
          
          // Check if count text already exists
          let countText = cellElement.querySelector('.wfh-date-count') as HTMLElement
          if (!countText) {
            countText = document.createElement('div')
            countText.className = 'wfh-date-count'
            cellElement.appendChild(countText)
          }
          countText.textContent = `(${approvedCount}/3)`
          
          // Remove tooltip elements (no longer using hover tooltip)
          const tooltip = cellElement.querySelector('.wfh-employee-tooltip')
          if (tooltip) {
            tooltip.remove()
          }
          cellElement.removeAttribute('data-employees')
          cellElement.removeAttribute('title')
          
          // Make count text white for green cells
          const bgColorStyle = cellElement.style.backgroundColor
          if (bgColorStyle === 'rgb(76, 175, 80)' || 
              bgColorStyle === '#4caf50' ||
              bgColorStyle === 'rgb(232, 245, 233)' ||
              bgColorStyle === '#e8f5e9') {
            countText.style.color = 'white'
            countText.style.opacity = '1'
          } else {
            countText.style.color = 'inherit'
            countText.style.opacity = '0.8'
          }
        } else {
          // Remove count text for weekends and past dates
          const countText = cellElement.querySelector('.wfh-date-count')
          if (countText) {
            countText.remove()
          }
          // Remove tooltip
          const tooltip = cellElement.querySelector('.wfh-employee-tooltip')
          if (tooltip) {
            tooltip.remove()
          }
          cellElement.removeAttribute('data-employees')
          cellElement.removeAttribute('title')
        }
      })
    }, 200) // Increase timeout to ensure calendar is fully rendered

    return () => {
      clearTimeout(timer)
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [opened, selectedMonth, calendarData])

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="ขอ WFH"
      size="90%"
      centered
      styles={{
        content: {
          maxWidth: '1400px',
          width: '90%',
        },
        body: {
          padding: '24px',
        },
      }}
    >
      <Grid>
        {/* Calendar */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
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
                  {/* @ts-ignore - Mantine Calendar v7 type definitions don't include value prop but it works at runtime */}
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  <Calendar
                    value={selectedDates.length > 0 ? selectedDates[0] : null}
                    onChange={(date: any) => {
                      if (date instanceof Date) handleDateClick(date)
                    }}
                    month={selectedMonth}
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
                        pointerEvents: 'none',
                        cursor: 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                        display: 'inline-block',
                      },
                      weekday: {
                        fontSize: '18px',
                        fontWeight: 600,
                        padding: '14px 0',
                      },
                      day: {
                        fontSize: '16px',
                        fontWeight: 600,
                        width: '100%',
                        height: '100%',
                        aspectRatio: '1',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        margin: '1px',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      },
                    }}
                  />
                </DatesProvider>
              </div>
            </Card>

            {/* Employee Names Display */}
            <Card withBorder padding="sm" radius="md">
              {selectedDateForDisplay && calendarData?.data.calendar && (() => {
                const dateStr = formatDateToLocal(selectedDateForDisplay)
                const dayData = calendarData.data.calendar.find((d) => d.date === dateStr)
                const employeeNames: string[] = []
                
                if (dayData?.requests && Array.isArray(dayData.requests)) {
                  dayData.requests
                    .filter((req: any) => req.status === 'รออนุมัติ' || req.status === 'อนุมัติแล้ว')
                    .forEach((req: any) => {
                      const name = req.employee_name || req.employee_id || 'ไม่ระบุชื่อ'
                      if (!employeeNames.includes(name)) {
                        employeeNames.push(name)
                      }
                    })
                }
                
                return (
                  <>
                    <Text size="sm" fw={500} mb="xs">
                      พนักงานที่เลือกวันที่ {selectedDateForDisplay.getDate()}/{selectedDateForDisplay.getMonth() + 1}/{selectedDateForDisplay.getFullYear()}
                    </Text>
                    {employeeNames.length > 0 ? (
                      <Stack gap="xs">
                        {employeeNames.map((name, index) => (
                          <Text key={index} size="sm" c="dark">
                            • {name}
                          </Text>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        ยังไม่มีพนักงานเลือกวันนี้
                      </Text>
                    )}
                  </>
                )
              })()}
              {!selectedDateForDisplay && (
                <>
                  <Text size="sm" fw={500} mb="xs">
                    พนักงานที่เลือก
                  </Text>
                  <Text size="sm" c="dimmed">
                    คลิกที่วันที่ในปฏิทินเพื่อดูรายชื่อพนักงานที่เลือกวันนั้น
                  </Text>
                </>
              )}
            </Card>
          </Stack>
        </Grid.Col>

        {/* Info Panel */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="md">
            {/* Limits Info */}
            {limits && (
              <Card withBorder padding="md" radius="md">
                <Title order={4} mb="md">
                  สิทธิ์ WFH
                </Title>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">จำกัดต่อวัน:</Text>
                    <Badge color="blue">{limits.daily_limit} คน</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">จำกัดต่อเดือน:</Text>
                    <Badge color="orange">{limits.monthly_limit} วัน</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">ใช้ไปแล้ว (เดือนนี้):</Text>
                    <Badge color={totalUsedDays >= limits.monthly_limit ? 'red' : 'green'}>
                      {totalUsedDays}/{limits.monthly_limit} วัน
                    </Badge>
                  </Group>
                  {totalUsedDays > usedThisMonth && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">(รวมรออนุมัติ: {totalUsedDays - usedThisMonth} วัน)</Text>
                    </Group>
                  )}
                </Stack>
              </Card>
            )}

            {/* Selected Dates Info */}
            {selectedDates.length > 0 && (
              <Card withBorder padding="md" radius="md">
                <Title order={4} mb="md">
                  วันที่เลือก ({selectedDates.length}/{remainingDays} วัน)
                </Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">เลือกแล้ว:</Text>
                    <Badge color="blue">{selectedDates.length} วัน</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">เหลือ:</Text>
                    <Badge color={remainingDays - selectedDates.length > 0 ? 'green' : 'red'}>
                      {remainingDays - selectedDates.length} วัน
                    </Badge>
                  </Group>
                  {selectedDates.length > remainingDays && (
                    <Alert icon={<TbAlertCircle size={16} />} color="red">
                      คุณเลือกเกินขีดจำกัด ({selectedDates.length} วัน จากที่เหลือ {remainingDays} วัน)
                    </Alert>
                  )}
                  <ScrollArea h={200}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        วันที่เลือก:
                      </Text>
                      {selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date, index) => {
                          const dateStr = formatDateToLocal(date)
                          const dayInfo = calendarData?.data.calendar.find((d) => d.date === dateStr)
                          return (
                            <Group key={index} justify="space-between" p="xs" style={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                              <Text size="sm">{date.toLocaleDateString('th-TH')}</Text>
                              <Badge
                                size="sm"
                                color={
                                  dayInfo?.approved_count >= 3
                                    ? 'red'
                                    : dayInfo?.approved_count > 0
                                    ? 'yellow'
                                    : 'green'
                                }
                              >
                                {dayInfo?.approved_count || 0}/3
                              </Badge>
                            </Group>
                          )
                        })}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </Card>
            )}

            {/* Submit Button */}
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={
                  selectedDates.length === 0 ||
                  selectedDates.length > remainingDays ||
                  (limits && limits.used_this_month >= limits.monthly_limit) ||
                  isSubmitting
                }
              >
                ส่งคำขอ ({selectedDates.length} วัน)
              </Button>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  )
}
