import { Table, Badge, Text, Card, Loader, Center, Alert, Group, Stack, NumberFormatter } from '@mantine/core'
import { useQuery } from 'react-query'
import { TbAlertCircle } from 'react-icons/tb'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('th')

interface TransactionHistoryTableProps {
  page?: number
  limit?: number
  type?: 'sell' | 'buy'
  search?: string
  onPageChange?: (page: number) => void
}

const TransactionHistoryTable = ({ page = 1, limit = 20, type = '', search = '', onPageChange }: TransactionHistoryTableProps) => {
  const {
    data: response,
    isLoading,
    error,
  } = useQuery(
    ['accounting-marketplace-history', page, limit, type, search],
    () =>
      accountingMarketplaceService.getHistory({
        page,
        limit,
        type: type as 'sell' | 'buy' | undefined,
        search,
      }),
    {
      keepPreviousData: true,
    }
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge color="blue">ขายได้</Badge>
      case 'sold':
        return <Badge color="green">ขายแล้ว</Badge>
      case 'cancelled':
        return <Badge color="gray">ยกเลิก</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTransactionTypeBadge = (transactionType?: string) => {
    if (transactionType === 'sell') {
      return <Badge color="orange">ขาย</Badge>
    } else if (transactionType === 'buy') {
      return <Badge color="green">ซื้อ</Badge>
    }
    return <Badge color="gray">-</Badge>
  }

  const formatEmployeeName = (firstName?: string, nickName?: string): string => {
    if (!firstName) return '-'
    if (nickName) {
      return `${firstName} (${nickName})`
    }
    return firstName
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      let date
      if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = dayjs.utc(dateStr).local()
      } else {
        date = dayjs.utc(dateStr, 'YYYY-MM-DD HH:mm:ss').local()
      }
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
        ไม่มีประวัติการซื้อขาย
      </Alert>
    )
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="md">
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Build</Table.Th>
                <Table.Th>ชื่อบริษัท</Table.Th>
                <Table.Th>เดือนภาษี</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>ประเภท</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>ราคา</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                <Table.Th>วันที่ทำรายการ</Table.Th>
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
                  <Table.Td style={{ textAlign: 'center' }}>
                    {getTransactionTypeBadge(listing.transaction_type)}
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
                    {listing.sold_at ? (
                      <Text size="sm">{formatDate(listing.sold_at)}</Text>
                    ) : listing.cancelled_at ? (
                      <Text size="sm" c="dimmed">{formatDate(listing.cancelled_at)}</Text>
                    ) : (
                      <Text size="sm">{formatDate(listing.created_at)}</Text>
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

export default TransactionHistoryTable
