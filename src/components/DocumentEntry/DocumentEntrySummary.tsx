/**
 * Document Entry Summary Component
 * แสดงสรุปข้อมูลการคีย์เอกสารทั้งหมดของเดือนภาษีที่ได้รับมอบหมาย
 */

import { useState, useEffect } from 'react'
import { Card, Group, Text, SimpleGrid, Button, Badge, Stack, Table, Accordion } from '@mantine/core'
import { useQuery } from 'react-query'
import { TbFileText, TbCheck, TbClock, TbCalendar, TbTransfer, TbChevronDown } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import documentEntryWorkService, { DocumentEntryWorkSummaryItem } from '../../services/documentEntryWorkService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import dayjs from 'dayjs'

interface DocumentEntrySummaryProps {
  year: number
  month: number
}

export default function DocumentEntrySummary({ year, month }: DocumentEntrySummaryProps) {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component render หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[DocumentEntrySummary] Component mounted/updated:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        year,
        month,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, employeeId, _hasHydrated, year, month])
  const [summaryMode, setSummaryMode] = useState<'overall' | 'day' | 'month'>('overall')

  // Fetch summary data
  const { data: summaryData, isLoading } = useQuery(
    ['document-entry-work-summary', year, month, employeeId, summaryMode],
    () => {
      if (!employeeId) return null
      // Always fetch with group_by='day' for overall calculation, or use summaryMode
      return documentEntryWorkService.getSummary({
        year,
        month,
        document_entry_responsible: employeeId,
        group_by: summaryMode === 'overall' ? 'day' : summaryMode,
      })
    },
    {
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น
    }
  )

  // Calculate overall totals
  const overallTotals = summaryData?.overall || {
    total_documents: 0,
    completed_documents: 0,
    pending_documents: 0,
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Stack gap="md">
      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {/* Total Documents */}
        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#e3f2fd' }}>
          <Group gap="xs" mb="xs">
            <TbFileText size={24} color="#1976d2" />
            <Text size="sm" fw={500} c="dimmed">
              เอกสารรวมทั้งหมด
            </Text>
          </Group>
          <Text size="xl" fw={700} c="#1976d2">
            {overallTotals.total_documents}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>

        {/* Completed Documents */}
        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#e8f5e9' }}>
          <Group gap="xs" mb="xs">
            <TbCheck size={24} color="#388e3c" />
            <Text size="sm" fw={500} c="dimmed">
              เอกสารคีย์แล้วทั้งหมด
            </Text>
          </Group>
          <Text size="xl" fw={700} c="#388e3c">
            {overallTotals.completed_documents}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>

        {/* Pending Documents */}
        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f5f5f5' }}>
          <Group gap="xs" mb="xs">
            <TbClock size={24} color="#757575" />
            <Text size="sm" fw={500} c="dimmed">
              รอคีย์ทั้งหมด
            </Text>
          </Group>
          <Text size="xl" fw={700} c="#757575">
            {overallTotals.pending_documents}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>
      </SimpleGrid>

      {/* Summary Mode Buttons */}
      <Group gap="md" justify="center">
        <Button
          variant="outline"
          color="orange"
          leftSection={<TbCalendar size={16} />}
          onClick={() => setSummaryMode('day')}
          radius="md"
          style={{
            backgroundColor: summaryMode === 'day' ? '#fff' : '#fff',
            borderColor: '#ff6b35',
            color: '#ff6b35',
          }}
        >
          สรุปข้อมูลรายวัน
        </Button>
        <Button
          variant="outline"
          color="orange"
          leftSection={<TbCalendar size={16} />}
          onClick={() => setSummaryMode('month')}
          radius="md"
          style={{
            backgroundColor: summaryMode === 'month' ? '#fff' : '#fff',
            borderColor: '#ff6b35',
            color: '#ff6b35',
          }}
        >
          สรุปข้อมูลรายเดือน
        </Button>
        <Button
          variant="outline"
          color="gray"
          leftSection={<TbTransfer size={16} />}
          disabled
          radius="md"
          title="ฟีเจอร์นี้จะพัฒนาในอนาคต"
        >
          โยกงาน
        </Button>
      </Group>

      {/* Summary Details (when mode is day or month) */}
      {summaryMode !== 'overall' && (
        <Card withBorder radius="md" p="md">
          <Text size="sm" fw={600} mb="md">
            {summaryMode === 'day' ? 'สรุปข้อมูลรายวัน' : 'สรุปข้อมูลรายเดือน'}
          </Text>
          {summaryData?.data && summaryData.data.length > 0 ? (
            <Accordion variant="separated" radius="md">
              {summaryData.data.map((group, groupIndex) => (
                <Accordion.Item key={groupIndex} value={`group-${groupIndex}`}>
                  <Accordion.Control>
                    <Group gap="md" justify="space-between" style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {summaryMode === 'day' 
                            ? dayjs(group.date).format('DD/MM/YYYY')
                            : `เดือน ${group.month}`
                          }
                        </Text>
                        <Badge color="blue" size="sm" variant="light">
                          รวม: {group.total_documents}
                        </Badge>
                        <Badge color="green" size="sm" variant="light">
                          เสร็จ: {group.completed_documents}
                        </Badge>
                        <Badge color="gray" size="sm" variant="light">
                          รอ: {group.pending_documents}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {group.items?.length || 0} บริษัท
                      </Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {group.items && group.items.length > 0 ? (
                      <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Build</Table.Th>
                            <Table.Th>ชื่อบริษัท</Table.Th>
                            <Table.Th ta="center">เอกสารหัก ณ ที่จ่าย</Table.Th>
                            <Table.Th ta="center">เอกสารมีภาษีมูลค่าเพิ่ม</Table.Th>
                            <Table.Th ta="center">เอกสารไม่มีภาษีมูลค่าเพิ่ม</Table.Th>
                            <Table.Th ta="center">รวม</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {group.items.map((item: DocumentEntryWorkSummaryItem, itemIndex: number) => {
                            const getStatusBadge = (status: string | null, count: number) => {
                              if (!status || count === 0) {
                                return <Badge color="gray" size="sm" variant="light">-</Badge>
                              }
                              if (status === 'ดำเนินการเสร็จแล้ว') {
                                return <Badge color="green" size="sm" variant="light">เสร็จสิ้น</Badge>
                              }
                              if (status === 'กำลังดำเนินการ') {
                                return <Badge color="yellow" size="sm" variant="light">กำลังดำเนินการ</Badge>
                              }
                              return <Badge color="gray" size="sm" variant="light">รอดำเนินการ</Badge>
                            }

                            return (
                              <Table.Tr key={itemIndex}>
                                <Table.Td>
                                  <Text size="sm" fw={500}>{item.build}</Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">{item.company_name}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Stack gap={4} align="center">
                                    <Text size="xs" c="dimmed">{item.wht_document_count} รายการ</Text>
                                    {getStatusBadge(item.wht_entry_status, item.wht_document_count)}
                                  </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Stack gap={4} align="center">
                                    <Text size="xs" c="dimmed">{item.vat_document_count} รายการ</Text>
                                    {getStatusBadge(item.vat_entry_status, item.vat_document_count)}
                                  </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Stack gap={4} align="center">
                                    <Text size="xs" c="dimmed">{item.non_vat_document_count} รายการ</Text>
                                    {getStatusBadge(item.non_vat_entry_status, item.non_vat_document_count)}
                                  </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Stack gap={4} align="center">
                                    <Text size="sm" fw={600}>{item.completed_documents}</Text>
                                    {item.completed_documents > 0 && (
                                      <Badge 
                                        color="green" 
                                        size="sm" 
                                        variant="light"
                                      >
                                        เสร็จสิ้น
                                      </Badge>
                                    )}
                                    {item.completed_documents === 0 && (
                                      <Badge 
                                        color="gray" 
                                        size="sm" 
                                        variant="light"
                                      >
                                        ยังไม่เสร็จ
                                      </Badge>
                                    )}
                                  </Stack>
                                </Table.Td>
                              </Table.Tr>
                            )
                          })}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        ไม่มีข้อมูล
                      </Text>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          ) : (
            <Text size="sm" c="dimmed" ta="center" py="md">
              ยังไม่มีเอกสารที่คีย์เสร็จแล้วใน{summaryMode === 'day' ? 'ช่วงเวลานี้' : 'เดือนนี้'}
            </Text>
          )}
        </Card>
      )}
    </Stack>
  )
}
