import { Table, Badge, Button, Text, Card, Loader, Center, Alert, Group, Stack, NumberFormatter } from '@mantine/core'
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { TbShoppingCart, TbAlertCircle, TbChevronDown, TbChevronUp } from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import CompanyDetailExpandable from './CompanyDetailExpandable'

interface AvailableJobsTableProps {
  page?: number
  limit?: number
  search?: string
  onPageChange?: (page: number) => void
}

const AvailableJobsTable = ({ page = 1, limit = 20, search = '', onPageChange }: AvailableJobsTableProps) => {
  const queryClient = useQueryClient()
  const currentTaxMonth = getCurrentTaxMonth()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const {
    data: response,
    isLoading,
    error,
  } = useQuery(
    ['accounting-marketplace-available', page, limit, search, currentTaxMonth.year, currentTaxMonth.month],
    () =>
      accountingMarketplaceService.getAvailableJobs({
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

  const purchaseMutation = useMutation(accountingMarketplaceService.purchaseListing, {
    onSuccess: () => {
      notifications.show({
        title: 'ซื้องานสำเร็จ',
        message: 'ซื้องานสำเร็จแล้ว',
        color: 'green',
        icon: <TbShoppingCart size={16} />,
      })
      queryClient.invalidateQueries(['accounting-marketplace'])
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error.response?.data?.message || 'ไม่สามารถซื้องานได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const handlePurchase = (id: string) => {
    purchaseMutation.mutate(id)
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
        ไม่มีงานที่ขายได้ในเดือนภาษีปัจจุบัน
      </Alert>
    )
  }

  const formatEmployeeName = (firstName?: string, nickName?: string): string => {
    if (!firstName) return '-'
    if (nickName) {
      return `${firstName} (${nickName})`
    }
    return firstName
  }

  const toggleRow = (listingId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(listingId)) {
        newSet.delete(listingId)
      } else {
        newSet.add(listingId)
      }
      return newSet
    })
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
                <Table.Th style={{ textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {response.data.map((listing) => {
                const isExpanded = expandedRows.has(listing.id)
                return (
                  <React.Fragment key={listing.id}>
                    <Table.Tr>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            variant="subtle"
                            size="xs"
                            onClick={() => toggleRow(listing.id)}
                            p={0}
                            style={{ minWidth: 'auto', width: 'auto' }}
                          >
                            {isExpanded ? <TbChevronUp size={16} /> : <TbChevronDown size={16} />}
                          </Button>
                          <Text fw={500}>{listing.build}</Text>
                        </Group>
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
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Button
                          size="xs"
                          color="orange"
                          leftSection={<TbShoppingCart size={14} />}
                          onClick={() => handlePurchase(listing.id)}
                          loading={purchaseMutation.isLoading}
                        >
                          ซื้อ
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                    {isExpanded && (
                      <Table.Tr>
                        <Table.Td colSpan={6} style={{ padding: 0, borderTop: 0 }}>
                          <div style={{ padding: '16px' }}>
                            <CompanyDetailExpandable
                              build={listing.build}
                              companyName={listing.company_name || '-'}
                              year={listing.tax_year}
                              month={listing.tax_month}
                            />
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                )
              })}
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

export default AvailableJobsTable
