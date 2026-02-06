import { Table, Badge, Button, Text, Card, Loader, Center, Alert, Group, Stack, NumberFormatter, SimpleGrid, Paper } from '@mantine/core'
import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { TbX, TbAlertCircle, TbChartBar, TbUsers, TbCurrencyBaht } from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('th')

interface MyListingsTableProps {
  page?: number
  limit?: number
  status?: string
  search?: string
  onPageChange?: (page: number) => void
}

const MyListingsTable = ({ page = 1, limit = 20, status = '', search = '', onPageChange }: MyListingsTableProps) => {
  const queryClient = useQueryClient()
  const currentTaxMonth = getCurrentTaxMonth()

  const {
    data: response,
    isLoading,
    error,
  } = useQuery(
    ['accounting-marketplace-my-listings', page, limit, status, search],
    () =>
      accountingMarketplaceService.getMyListings({
        page,
        limit,
        status,
        search,
      }),
    {
      keepPreviousData: true,
    }
  )

  const cancelMutation = useMutation(accountingMarketplaceService.cancelListing, {
    onSuccess: () => {
      notifications.show({
        title: 'ยกเลิกรายการสำเร็จ',
        message: 'ยกเลิกรายการขายงานสำเร็จแล้ว',
        color: 'green',
        icon: <TbX size={16} />,
      })
      queryClient.invalidateQueries(['accounting-marketplace'])
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error.response?.data?.message || 'ไม่สามารถยกเลิกรายการได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const handleCancel = (id: string) => {
    if (window.confirm('คุณต้องการยกเลิกรายการขายงานนี้หรือไม่?')) {
      cancelMutation.mutate(id)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      let date
      // ถ้า string มี 'T' หรือ 'Z' แสดงว่าเป็น ISO format (UTC) ให้ parse เป็น UTC ก่อน
      if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = dayjs.utc(dateStr).local()
      } else {
        // ถ้าเป็น format YYYY-MM-DD HH:mm:ss ให้ parse เป็น UTC ก่อน (เพราะ backend ส่งมาเป็น UTC)
        // แล้วแปลงเป็น local time
        date = dayjs.utc(dateStr, 'YYYY-MM-DD HH:mm:ss').local()
      }
      if (!date.isValid()) return dateStr
      return date.format('DD/MM/YYYY HH:mm')
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    const badgeStyles = {
      root: {
        backgroundColor: '#ffffff',
        border: '1px solid #ff6b35',
        color: '#ff6b35',
      },
    }

    switch (status) {
      case 'available':
        return (
          <Badge
            styles={badgeStyles}
            variant="outline"
          >
            กำลังขาย
          </Badge>
        )
      case 'sold':
        return (
          <Badge
            styles={badgeStyles}
            variant="outline"
          >
            ขายได้
          </Badge>
        )
      case 'cancelled':
        return <Badge color="gray">ยกเลิก</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatEmployeeName = (firstName?: string, nickName?: string): string => {
    if (!firstName) return '-'
    if (nickName) {
      return `${firstName} (${nickName})`
    }
    return firstName
  }

  // Calculate summary for current tax month
  // ⚠️ IMPORTANT: useMemo must be called before any early returns to maintain hook order
  const currentMonthSummary = useMemo(() => {
    if (!response?.data) return null

    const currentMonthListings = response.data.filter(
      (listing) =>
        listing.status === 'sold' &&
        listing.tax_year === currentTaxMonth.year &&
        listing.tax_month === currentTaxMonth.month
    )

    // Group by buyer
    const buyerMap = new Map<string, { name: string; total: number; count: number }>()
    let totalRevenue = 0

    currentMonthListings.forEach((listing) => {
      if (listing.sold_to_employee_id && listing.buyer_first_name) {
        const buyerKey = listing.sold_to_employee_id
        const buyerName = formatEmployeeName(listing.buyer_first_name, listing.buyer_nick_name)
        const price = Number(listing.price) || 0

        if (!buyerMap.has(buyerKey)) {
          buyerMap.set(buyerKey, { name: buyerName, total: 0, count: 0 })
        }

        const buyerData = buyerMap.get(buyerKey)!
        buyerData.total += price
        buyerData.count += 1
        totalRevenue += price
      }
    })

    return {
      buyers: Array.from(buyerMap.values()),
      totalRevenue,
      totalJobs: currentMonthListings.length,
    }
  }, [response?.data, currentTaxMonth])

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
        คุณยังไม่มีรายการขายงาน
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Summary Card for Current Tax Month */}
      {currentMonthSummary && currentMonthSummary.totalJobs > 0 && (
        <Card shadow="lg" radius="xl" withBorder p={0}>
          {/* Header */}
          <Group
            bg="orange"
            p="md"
            style={{ borderTopLeftRadius: 'var(--mantine-radius-xl)', borderTopRightRadius: 'var(--mantine-radius-xl)' }}
          >
            <TbChartBar size={24} color="white" />
            <Text fw={700} size="lg" c="white">
              สรุปการขายเดือนภาษี {currentTaxMonth.month}/{currentTaxMonth.year}
            </Text>
          </Group>

          <Stack gap="md" p="md">
            {/* Total Revenue Card */}
            <Card withBorder p="md" radius="md" style={{ backgroundColor: '#fff3e0' }}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <TbCurrencyBaht size={24} color="#ff6b35" />
                  <Text size="md" fw={600} c="orange">
                    รวมเงินที่ขายได้ในเดือนนี้
                  </Text>
                </Group>
                <Text size="xl" fw={700} c="orange">
                  <NumberFormatter
                    value={currentMonthSummary.totalRevenue}
                    thousandSeparator
                    decimalScale={2}
                    fixedDecimalScale
                    suffix=" บาท"
                  />
                </Text>
              </Group>
            </Card>

            {/* Buyers List */}
            {currentMonthSummary.buyers.length > 0 && (
              <Card withBorder p="md" radius="md">
                <Group gap="xs" mb="md">
                  <TbUsers size={20} color="#ff6b35" />
                  <Text size="md" fw={600} c="orange">
                    สรุปการขายให้ผู้ซื้อแต่ละคน
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {currentMonthSummary.buyers.map((buyer, index) => (
                    <Paper key={index} withBorder p="sm" radius="md" style={{ backgroundColor: '#fff9e6' }}>
                      <Stack gap="xs">
                        <Text size="sm" fw={600} c="dark">
                          {buyer.name}
                        </Text>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            จำนวนงาน:
                          </Text>
                          <Text size="sm" fw={500}>
                            {buyer.count} งาน
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            รวมเงิน:
                          </Text>
                          <Text size="sm" fw={600} c="orange">
                            <NumberFormatter
                              value={buyer.total}
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
        <Table.ScrollContainer minWidth={1100}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Build</Table.Th>
                <Table.Th>ชื่อบริษัท</Table.Th>
                <Table.Th>เดือนภาษี</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>ราคา</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                <Table.Th>วันที่ลงขาย</Table.Th>
                <Table.Th>ผู้ซื้อ</Table.Th>
                <Table.Th>วันที่ขาย</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {response.data.map((listing) => (
                <Table.Tr key={listing.id}>
                  <Table.Td>
                    <Text fw={500}>{listing.build}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{listing.company_name || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{listing.tax_month}/{listing.tax_year}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={500} c="orange">
                      <NumberFormatter value={listing.price} thousandSeparator suffix=" บาท" />
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    {getStatusBadge(listing.status)}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDate(listing.created_at)}</Text>
                  </Table.Td>
                  <Table.Td>
                    {listing.status === 'sold' ? (
                      <Text>{formatEmployeeName(listing.buyer_first_name, listing.buyer_nick_name)}</Text>
                    ) : (
                      <Text c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {listing.sold_at ? (
                      <Text size="sm">{formatDate(listing.sold_at)}</Text>
                    ) : (
                      <Text c="dimmed" size="sm">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    {listing.status === 'available' && (
                      <Button
                        size="xs"
                        color="red"
                        variant="outline"
                        leftSection={<TbX size={14} />}
                        onClick={() => handleCancel(listing.id)}
                        loading={cancelMutation.isLoading}
                      >
                        ยกเลิก
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {response.pagination.totalPages > 1 && (
          <Group justify="center">
            <Text size="sm" c="dimmed">
              หน้า {response.pagination.page} จาก {response.pagination.totalPages} (ทั้งหมด {response.pagination.total} รายการ)
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
    </Stack>
  )
}

export default MyListingsTable
