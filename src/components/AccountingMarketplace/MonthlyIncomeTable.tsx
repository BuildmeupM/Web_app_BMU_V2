import { Table, Text, Card, Loader, Center, Alert, Group, Stack, NumberFormatter, SimpleGrid, Paper } from '@mantine/core'
import { useMemo } from 'react'
import { useQuery } from 'react-query'
import { TbAlertCircle, TbChartBar, TbCurrencyBaht, TbCalendar } from 'react-icons/tb'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'

interface MonthlyIncomeTableProps {
  year?: number
  month?: number
}

const MonthlyIncomeTable = ({ year, month }: MonthlyIncomeTableProps) => {
  const {
    data: response,
    isLoading,
    error,
  } = useQuery(
    ['accounting-marketplace-buyer-income', year, month],
    () =>
      accountingMarketplaceService.getBuyerIncome({
        year,
        month,
      }),
    {
      keepPreviousData: true,
    }
  )

  // รายการงานที่ซื้อ (มี build, company_name) สำหรับแสดงในตาราง
  const { data: purchasedResponse } = useQuery(
    ['accounting-marketplace-purchased-for-income', year, month],
    () =>
      accountingMarketplaceService.getPurchasedJobs({
        limit: 500,
        year,
        month,
      }),
    {
      keepPreviousData: true,
      enabled: !!response?.data?.length,
    }
  )

  const formatEmployeeName = (firstName?: string, nickName?: string): string => {
    if (!firstName) return '-'
    if (nickName) {
      return `${firstName} (${nickName})`
    }
    return firstName
  }

  // Calculate summary statistics (coerce to number to avoid string concatenation e.g. 0 + "500" => "0500")
  const summary = useMemo(() => {
    if (!response?.data) return null

    const totalIncome = response.data.reduce(
      (sum, item) => sum + (Number(item.total_income) || 0),
      0
    )
    const totalJobs = response.data.reduce(
      (sum, item) => sum + (Number(item.job_count) || 0),
      0
    )

    // Group by month
    const monthlyData = new Map<string, { month: string; income: number; jobs: number }>()

    response.data.forEach((item) => {
      const monthKey = `${item.tax_month}/${item.tax_year}`
      const income = Number(item.total_income) || 0
      const jobs = Number(item.job_count) || 0
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { month: monthKey, income: 0, jobs: 0 })
      }
      const monthData = monthlyData.get(monthKey)!
      monthData.income += income
      monthData.jobs += jobs
    })

    return {
      totalIncome,
      totalJobs,
      monthlyBreakdown: Array.from(monthlyData.values()).sort((a, b) => {
        // Sort by year and month descending
        const [aMonth, aYear] = a.month.split('/').map(Number)
        const [bMonth, bYear] = b.month.split('/').map(Number)
        if (aYear !== bYear) return bYear - aYear
        return bMonth - aMonth
      }),
    }
  }, [response?.data])

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    )
  }

  if (error) {
    return (
      <Alert icon={<TbAlertCircle size={16} />} title="เกิดข้อผิดพลาด" color="red">
        ไม่สามารถดึงข้อมูลได้
      </Alert>
    )
  }

  if (!response || response.data.length === 0) {
    return (
      <Alert
        icon={<TbAlertCircle size={16} />}
        title="ไม่มีข้อมูล"
        styles={{
          root: {
            backgroundColor: '#ffffff',
            border: '1px solid #ff6b35',
            color: '#ff6b35',
          },
          title: {
            color: '#ff6b35',
          },
          message: {
            color: '#ff6b35',
          },
          icon: {
            color: '#ff6b35',
          },
        }}
      >
        ไม่มีรายได้รายเดือน
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Summary Dashboard */}
      {summary && (
        <Card shadow="lg" radius="xl" withBorder p={0}>
          {/* Header */}
          <Group
            bg="orange"
            p="md"
            style={{ borderTopLeftRadius: 'var(--mantine-radius-xl)', borderTopRightRadius: 'var(--mantine-radius-xl)' }}
          >
            <TbChartBar size={24} color="white" />
            <Text fw={700} size="lg" c="white">
              สรุปรายได้จากการซื้องาน
            </Text>
          </Group>

          <Stack gap="md" p="md">
            {/* Total Summary Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Card withBorder p="md" radius="md" style={{ backgroundColor: '#fff3e0' }}>
                <Group gap="xs" mb="xs">
                  <TbCurrencyBaht size={24} color="#ff6b35" />
                  <Text size="sm" fw={600} c="orange">
                    รายได้รวมทั้งหมด
                  </Text>
                </Group>
                <Text size="xl" fw={700} c="orange">
                  <NumberFormatter
                    value={summary.totalIncome}
                    thousandSeparator
                    decimalScale={2}
                    fixedDecimalScale
                    suffix=" บาท"
                  />
                </Text>
              </Card>

              <Card withBorder p="md" radius="md" style={{ backgroundColor: '#e3f2fd' }}>
                <Group gap="xs" mb="xs">
                  <TbCalendar size={24} color="#1976d2" />
                  <Text size="sm" fw={600} c="dimmed">
                    จำนวนงานรวมทั้งหมด
                  </Text>
                </Group>
                <Text size="xl" fw={700} c="#1976d2">
                  {summary.totalJobs} งาน
                </Text>
              </Card>
            </SimpleGrid>

            {/* Monthly Breakdown */}
            {summary.monthlyBreakdown.length > 0 && (
              <Card withBorder p="md" radius="md">
                <Text size="md" fw={600} mb="md" c="orange">
                  สรุปรายได้แต่ละเดือน
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {summary.monthlyBreakdown.map((monthData, index) => (
                    <Paper key={index} withBorder p="sm" radius="md" style={{ backgroundColor: '#fff9e6' }}>
                      <Stack gap="xs">
                        <Text size="sm" fw={600} c="dark">
                          เดือนภาษี {monthData.month}
                        </Text>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            จำนวนงาน:
                          </Text>
                          <Text size="sm" fw={500}>
                            {monthData.jobs} งาน
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            รายได้:
                          </Text>
                          <Text size="sm" fw={600} c="orange">
                            <NumberFormatter
                              value={monthData.income}
                              thousandSeparator
                              decimalScale={2}
                              fixedDecimalScale
                              suffix=" บาท"
                            />
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Card>
            )}
          </Stack>
        </Card>
      )}

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Table.ScrollContainer minWidth={800}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Build</Table.Th>
                  <Table.Th>ชื่อบริษัท</Table.Th>
                  <Table.Th>เดือนภาษี</Table.Th>
                  <Table.Th>ชื่อผู้ขาย</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>รายได้</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(purchasedResponse?.data?.length
                  ? purchasedResponse.data
                  : response.data.map((income) => ({
                      id: `${income.tax_year}-${income.tax_month}-${income.sold_to_employee_id}`,
                      build: '-',
                      company_name: '-',
                      tax_year: income.tax_year,
                      tax_month: income.tax_month,
                      price: Number(income.total_income) || 0,
                      seller_first_name: undefined,
                      seller_nick_name: undefined,
                    }))
                ).map((row: { id: string; build: string; company_name?: string; tax_year: number; tax_month: number; price: number; seller_first_name?: string; seller_nick_name?: string }) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Text fw={500}>{row.build}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{row.company_name || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{row.tax_month}/{row.tax_year}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{formatEmployeeName(row.seller_first_name, row.seller_nick_name)}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={500} c="green">
                        <NumberFormatter
                          value={Number(row.price) || 0}
                          thousandSeparator
                          decimalScale={2}
                          fixedDecimalScale
                          suffix=" บาท"
                        />
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Card>
    </Stack>
  )
}

export default MonthlyIncomeTable
