import { Card, Group, Text, SimpleGrid, Badge, Paper, Loader, Center } from '@mantine/core'
import { TbChartBar } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'

interface SummaryStat {
  label: string
  value: string
  total: string
  color: 'orange' | 'red' | 'green'
}

export default function SummaryCard() {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component mount/unmount หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TaxInspectionSummaryCard] Component MOUNTED:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        timestamp: new Date().toISOString(),
      })
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('[TaxInspectionSummaryCard] Component UNMOUNTED:', {
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, []) // Empty dependency array เพื่อให้ run เพียงครั้งเดียวเมื่อ mount
  
  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch summary data from API - filter by tax month and tax_inspection_responsible
  // สำหรับหน้าตรวจภาษี: นับ "ตรวจแล้ว" จาก pnd_review_returned_date และ pp30_review_returned_date
  const { data: summaryData, isLoading } = useQuery(
    ['monthly-tax-data-summary', 'tax-inspection', currentTaxMonth.year, currentTaxMonth.month, employeeId],
    () => monthlyTaxDataService.getSummary({
      year: currentTaxMonth.year.toString(),
      month: currentTaxMonth.month.toString(),
      tax_inspection_responsible: employeeId || undefined,
    }),
    {
      staleTime: 2 * 60 * 1000, // ✅ Performance: Cache 2 minutes (ข้อมูล summary ไม่ค่อยเปลี่ยนบ่อย)
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น
    }
  )

  // Build stats from API data
  const stats: SummaryStat[] = summaryData?.data
    ? [
        {
          label: 'รอตรวจ (WHT)',
          value: summaryData.data.wht.pending.toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'orange',
        },
        {
          label: 'รอตรวจอีกครั้ง (WHT)',
          value: summaryData.data.wht.recheck.toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'red',
        },
        {
          label: 'ตรวจแล้ว (WHT)',
          value: summaryData.data.wht.completed.toString(),
          total: summaryData.data.wht.total.toString(),
          color: 'green',
        },
        {
          label: 'รอตรวจ (VAT)',
          value: summaryData.data.vat.pending.toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'orange',
        },
        {
          label: 'รอตรวจอีกครั้ง (VAT)',
          value: summaryData.data.vat.recheck.toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'red',
        },
        {
          label: 'ตรวจแล้ว (VAT)',
          value: summaryData.data.vat.completed.toString(),
          total: summaryData.data.vat.total.toString(),
          color: 'green',
        },
      ]
    : [
        { label: 'รอตรวจ (WHT)', value: '0', total: '0', color: 'orange' },
        { label: 'รอตรวจอีกครั้ง (WHT)', value: '0', total: '0', color: 'red' },
        { label: 'ตรวจแล้ว (WHT)', value: '0', total: '0', color: 'green' },
        { label: 'รอตรวจ (VAT)', value: '0', total: '0', color: 'orange' },
        { label: 'รอตรวจอีกครั้ง (VAT)', value: '0', total: '0', color: 'red' },
        { label: 'ตรวจแล้ว (VAT)', value: '0', total: '0', color: 'green' },
      ]

  if (isLoading) {
    return (
      <Card shadow="lg" radius="xl" withBorder p={0} mb="lg">
        <Group
          bg="orange"
          p="md"
          style={{
            borderTopLeftRadius: 'var(--mantine-radius-xl)',
            borderTopRightRadius: 'var(--mantine-radius-xl)',
          }}
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

  const getColorValue = (color: string) => {
    switch (color) {
      case 'orange':
        return 'orange'
      case 'red':
        return 'red'
      case 'green':
        return 'green'
      default:
        return 'gray'
    }
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
