import { Card, Group, Text, SimpleGrid, Paper, Loader, Center } from '@mantine/core'
import { TbChartBar } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'

interface SummaryStat {
  label: string
  value: string
  total: string
  headerColor: string
}

export default function SummaryCard() {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch summary data from API - filter by accounting_responsible and tax month
  const { data: summaryData, isLoading } = useQuery(
    ['monthly-tax-data-summary', 'tax-status', currentTaxMonth.year, currentTaxMonth.month, employeeId],
    () =>
      monthlyTaxDataService.getSummary({
        year: currentTaxMonth.year.toString(),
        month: currentTaxMonth.month.toString(),
        accounting_responsible: employeeId || undefined,
      }),
    {
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes - ข้อมูล summary ไม่ค่อยเปลี่ยนบ่อย
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น
      refetchOnWindowFocus: false, // ปิดการ refetch เมื่อ focus window เพื่อลด requests
      refetchOnReconnect: false, // ปิดการ refetch เมื่อ reconnect (ใช้ cache แทน)
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
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
  // งานที่รับผิดชอบ - WHT: นับจากสถานะ ภ.ง.ด. (received_receipt, paid, sent_to_customer, not_submitted)
  // งานที่รับผิดชอบ - VAT: นับจากสถานะ ภพ.30 (received_receipt, paid, sent_to_customer)
  // เปอร์เซ็นสถานะกระทบภาษี: นับจาก monthly_tax_impact ที่มีค่า (ไม่ใช่ null)
  // เปอร์เซ็นสถานะกระทบแบงค์: นับจาก bank_impact ที่มีค่า (ไม่ใช่ null)
  const stats: SummaryStat[] = summaryData?.data
    ? [
        {
          label: 'งานที่รับผิดชอบ - WHT',
          value: (summaryData.data.wht.responsible_count || 0).toString(),
          total: summaryData.data.wht.total.toString(),
          headerColor: '#6a1b9a', // Deep purple
        },
        {
          label: 'งานที่รับผิดชอบ - VAT',
          value: (summaryData.data.vat.responsible_count || 0).toString(),
          total: summaryData.data.vat.total.toString(),
          headerColor: '#2e7d32', // Dark green
        },
        {
          label: 'เปอร์เซ็นสถานะกระทบภาษี',
          value: (summaryData.data.impacts?.monthly_tax_impact_count || 0).toString(),
          total: (summaryData.data.impacts?.total || summaryData.data.wht.total || 0).toString(),
          headerColor: '#66bb6a', // Light green
        },
        {
          label: 'เปอร์เซ็นสถานะกระทบแบงค์',
          value: (summaryData.data.impacts?.bank_impact_count || 0).toString(),
          total: (summaryData.data.impacts?.total || summaryData.data.wht.total || 0).toString(),
          headerColor: '#00897b', // Teal
        },
      ]
    : [
        { label: 'งานที่รับผิดชอบ - WHT', value: '0', total: '0', headerColor: '#6a1b9a' },
        { label: 'งานที่รับผิดชอบ - VAT', value: '0', total: '0', headerColor: '#2e7d32' },
        { label: 'เปอร์เซ็นสถานะกระทบภาษี', value: '0', total: '0', headerColor: '#66bb6a' },
        { label: 'เปอร์เซ็นสถานะกระทบแบงค์', value: '0', total: '0', headerColor: '#00897b' },
      ]

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
      <SimpleGrid cols={4} spacing="md" p="md">
        {stats.map((stat, index) => {
          return (
            <Paper
              key={index}
              p={0}
              radius="md"
              style={{
                textAlign: 'center',
                border: '1px solid #000000',
                borderTop: '1px solid #000000',
                borderRight: '1px solid #000000',
                borderBottom: '1px solid #000000',
                borderLeft: '1px solid #000000',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: stat.headerColor,
                  padding: 'var(--mantine-spacing-sm)',
                  borderRadius: 'var(--mantine-radius-md) var(--mantine-radius-md) 0 0',
                }}
              >
                <Text fw={600} size="sm" c="white" style={{ textAlign: 'center' }}>
                  {stat.label}
                </Text>
              </div>
              {/* Value */}
              <div style={{ padding: 'var(--mantine-spacing-sm)' }}>
                <Text fw={700} size="xl">
                  {stat.value}/{stat.total}
                </Text>
              </div>
            </Paper>
          )
        })}
      </SimpleGrid>
    </Card>
  )
}
