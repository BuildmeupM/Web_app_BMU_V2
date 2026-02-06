import { Table, Text, Card, Loader, Center, Alert, Group, Stack, NumberFormatter } from '@mantine/core'
import { useQuery } from 'react-query'
import { TbAlertCircle } from 'react-icons/tb'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('th')

interface PurchasedJobsTableProps {
  page?: number
  limit?: number
  search?: string
  onPageChange?: (page: number) => void
}

const PurchasedJobsTable = ({ page = 1, limit = 20, search = '', onPageChange }: PurchasedJobsTableProps) => {
  const currentTaxMonth = getCurrentTaxMonth()

  const {
    data: response,
    isLoading,
    error,
  } = useQuery(
    ['accounting-marketplace-purchased', page, limit, search, currentTaxMonth.year, currentTaxMonth.month],
    () =>
      accountingMarketplaceService.getPurchasedJobs({
        page,
        limit,
        year: currentTaxMonth.year,
        month: currentTaxMonth.month,
        search,
      }),
    {
      keepPreviousData: true,
    }
  )

  const formatEmployeeName = (firstName?: string, nickName?: string): string => {
    if (!firstName) return '-'
    if (nickName) {
      return `${firstName} (${nickName})`
    }
    return firstName
  }

  /** API ส่งเป็น UTC (ISO 8601 with Z) → แปลงเป็นเวลาท้องถิ่นเพื่อแสดงผล */
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      const isIso = dateStr.includes('T') || dateStr.includes('Z')
      const date = isIso
        ? dayjs.utc(dateStr).local()
        : dayjs.utc(dateStr, 'YYYY-MM-DD HH:mm:ss').local()
      if (!date.isValid()) return dateStr
      return date.format('DD/MM/YYYY HH:mm')
    } catch {
      return dateStr
    }
  }

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
        คุณยังไม่มีงานที่ซื้อ
      </Alert>
    )
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="md">
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Build</Table.Th>
                <Table.Th>ชื่อบริษัท</Table.Th>
                <Table.Th>เดือนภาษี</Table.Th>
                <Table.Th>ผู้ขาย</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>ราคา</Table.Th>
                <Table.Th>วันที่ซื้อ</Table.Th>
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
                  <Table.Td>
                    <Text>{formatEmployeeName(listing.seller_first_name, listing.seller_nick_name)}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={500} c="orange">
                      <NumberFormatter value={listing.price} thousandSeparator suffix=" บาท" />
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {listing.sold_at ? (
                      <Text size="sm">{formatDate(listing.sold_at)}</Text>
                    ) : (
                      <Text c="dimmed" size="sm">-</Text>
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
  )
}

export default PurchasedJobsTable
