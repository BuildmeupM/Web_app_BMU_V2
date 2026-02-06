import { Card, Group, Text, SimpleGrid, Badge, Paper, Loader, Center, Alert } from '@mantine/core'
import { TbChartBar, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'

interface SummaryStat {
  label: string
  value: string
  total: string
  color: 'orange' | 'red' | 'green' | 'blue' | 'yellow'
}

export default function SummaryCard() {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component mount/unmount หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxFilingSummaryCard] Component MOUNTED:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('[TaxFilingSummaryCard] Component UNMOUNTED:', {
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, []) // Empty dependency array เพื่อให้ run เพียงครั้งเดียวเมื่อ mount

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch summary data from API - filter by wht_filer_employee_id and/or vat_filer_employee_id and tax month
  const { data: summaryData, isLoading, isError, error, refetch: refetchSummary } = useQuery(
    ['monthly-tax-data-summary', 'tax-filing', currentTaxMonth.year, currentTaxMonth.month, employeeId],
    () =>
      monthlyTaxDataService.getSummary({
        year: currentTaxMonth.year.toString(),
        month: currentTaxMonth.month.toString(),
        wht_filer_employee_id: employeeId || undefined,
        vat_filer_employee_id: employeeId || undefined,
      }),
    {
      staleTime: 2 * 60 * 1000, // ✅ Performance: Cache 2 minutes (ข้อมูล summary ไม่ค่อยเปลี่ยนบ่อย)
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      refetchOnWindowFocus: false, // ปิดการ refetch อัตโนมัติเมื่อ focus window เพื่อลด requests
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น (แก้ปัญหาไม่แสดงข้อมูล)
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      retry: (failureCount, error: any) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if (error?.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    }
  )

  // Build stats from API data
  // สำหรับหน้ายื่นภาษี:
  // - รอร่างแบบภาษี (WHT) > นับจากสถานะ "ร่างแบบได้" (draft_ready) จาก สถานะ ภ.ง.ด. (pnd_status)
  // - สถานะผ่าน (WHT) > นับจากสถานะ "ผ่าน" (passed) จาก สถานะ ภ.ง.ด. (pnd_status)
  // - ส่งให้ลูกค้าแล้ว (WHT) > นับจากสถานะ "ชำระแล้ว" (paid), "ส่งลูกค้าแล้ว" (sent_to_customer), "รับใบเสร็จ" (received_receipt) จาก สถานะ ภ.ง.ด. (pnd_status)
  // - รอร่างแบบภาษี (VAT) > นับจากสถานะ "ร่างแบบได้" (draft_ready) จาก สถานะ ภ.พ.30
  // - สถานะผ่าน (VAT) > นับจากสถานะ "ผ่าน" (passed) จาก สถานะ ภ.พ.30
  // - ส่งให้ลูกค้าแล้ว (VAT) > นับจากสถานะ "ชำระแล้ว" (paid), "ส่งลูกค้าแล้ว" (sent_to_customer), "รับใบเสร็จ" (received_receipt) จาก สถานะ ภ.พ.30
  const stats: SummaryStat[] = summaryData?.data
    ? [
        {
          label: 'รอร่างแบบภาษี (WHT)',
          value: (summaryData.data.wht.draft_ready || 0).toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'orange',
        },
        {
          label: 'สถานะผ่าน (WHT)',
          value: (summaryData.data.wht.passed || 0).toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'green',
        },
        {
          label: 'ส่งให้ลูกค้าแล้ว (WHT)',
          value: (summaryData.data.wht.sent_to_customer || 0).toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'blue',
        },
        {
          label: 'รอร่างแบบภาษี (VAT)',
          value: (summaryData.data.vat.draft_ready || 0).toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'orange',
        },
        {
          label: 'สถานะผ่าน (VAT)',
          value: (summaryData.data.vat.passed || 0).toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'green',
        },
        {
          label: 'ส่งให้ลูกค้าแล้ว (VAT)',
          value: (summaryData.data.vat.sent_to_customer || 0).toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'blue',
        },
      ]
    : [
        { label: 'รอร่างแบบภาษี (WHT)', value: '0', total: '0', color: 'orange' },
        { label: 'สถานะผ่าน (WHT)', value: '0', total: '0', color: 'green' },
        { label: 'ส่งให้ลูกค้าแล้ว (WHT)', value: '0', total: '0', color: 'blue' },
        { label: 'รอร่างแบบภาษี (VAT)', value: '0', total: '0', color: 'orange' },
        { label: 'สถานะผ่าน (VAT)', value: '0', total: '0', color: 'green' },
        { label: 'ส่งให้ลูกค้าแล้ว (VAT)', value: '0', total: '0', color: 'blue' },
      ]

  const getColorValue = (color: string) => {
    switch (color) {
      case 'orange':
        return 'orange'
      case 'red':
        return 'red'
      case 'green':
        return 'green'
      case 'blue':
        return 'blue'
      case 'yellow':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  if (isLoading) {
    return (
      <Card shadow="lg" radius="xl" withBorder p={0} mb="lg">
        <Group
          bg="orange"
          p="md"
          style={{ borderTopLeftRadius: 'var(--mantine-radius-xl)', borderTopRightRadius: 'var(--mantine-radius-xl)' }}
        >
          <TbChartBar size={24} color="white" />
          <Text fw={700} size="lg" c="white">
            สรุปงานที่รับผิดชอบ
          </Text>
        </Group>
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Card>
    )
  }

  if (isError) {
    // Check if error is 429 (Too Many Requests)
    const is429Error = (error as any)?.response?.status === 429
    // Check if error is network-related (backend server not running)
    const isNetworkError = 
      (error as any)?.message?.includes('Network Error') ||
      (error as any)?.code === 'ERR_NETWORK' ||
      (error as any)?.code === 'ERR_CONNECTION_REFUSED' ||
      (error as any)?.message?.includes('ERR_CONNECTION_REFUSED') ||
      (error as any)?.message?.includes('ERR_SOCKET_NOT_CONNECTED')

    const errorMessage = is429Error
      ? 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
      : isNetworkError
      ? 'ไม่สามารถเชื่อมต่อกับ Backend Server ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001'
      : 'ไม่สามารถโหลดข้อมูลได้'

    return (
      <Card shadow="lg" radius="xl" withBorder p={0} mb="lg">
        <Group
          bg="orange"
          p="md"
          style={{ borderTopLeftRadius: 'var(--mantine-radius-xl)', borderTopRightRadius: 'var(--mantine-radius-xl)' }}
        >
          <TbChartBar size={24} color="white" />
          <Text fw={700} size="lg" c="white">
            สรุปงานที่รับผิดชอบ
          </Text>
        </Group>
        <Alert icon={<TbAlertCircle size={16} />} color={is429Error ? 'orange' : 'red'} title="เกิดข้อผิดพลาด" p="md">
          {errorMessage}
        </Alert>
      </Card>
    )
  }

  return (
    <Card shadow="lg" radius="xl" withBorder p={0} mb="lg">
      {/* Header */}
      <Group
        bg="orange"
        p="md"
        style={{ borderTopLeftRadius: 'var(--mantine-radius-xl)', borderTopRightRadius: 'var(--mantine-radius-xl)' }}
      >
        <TbChartBar size={24} color="white" />
        <Text fw={700} size="lg" c="white">
          สรุปงานที่รับผิดชอบ
        </Text>
      </Group>

      {/* Stats Grid */}
      <SimpleGrid cols={6} spacing="md" p="md">
        {stats.map((stat, index) => {
          return (
            <Paper
              key={index}
              p="sm"
              radius="md"
              style={{
                textAlign: 'center',
                border: '1px solid #000000',
                borderTop: '1px solid #000000',
                borderRight: '1px solid #000000',
                borderBottom: '1px solid #000000',
                borderLeft: '1px solid #000000',
              }}
            >
              {/* Header */}
              <Badge
                fullWidth
                size="lg"
                color={getColorValue(stat.color)}
                variant="filled"
                mb="xs"
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              >
                {stat.label}
              </Badge>
              {/* Value */}
              <Text fw={700} size="xl">
                {stat.value}/{stat.total}
              </Text>
            </Paper>
          )
        })}
      </SimpleGrid>
    </Card>
  )
}
