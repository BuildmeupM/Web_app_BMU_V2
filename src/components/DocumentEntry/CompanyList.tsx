/**
 * Company List Component
 * Component สำหรับแสดงรายการบริษัทที่ได้รับมอบหมายและสรุปสถานะ
 */

import React, { useState, useMemo, memo } from 'react'
import { Table, Card, Text, Badge, Group, SimpleGrid, Center, Alert, Stack } from '@mantine/core'
import { useQuery } from 'react-query'
import { TbAlertCircle, TbChevronDown, TbChevronUp } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import documentEntryWorkService from '../../services/documentEntryWorkService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import CompanyDetailSection from './CompanyDetailSection'

interface CompanyListProps {
  year: number
  month: number
}

interface CompanyRecord {
  build: string
  companyName: string
  totalSubmissions: number
  status: 'completed' | 'pending' | 'in_progress'
  whtTotal: number
  vatTotal: number
  nonVatTotal: number
  botTotal: number
}

// Helper function: Check if company is completed
const isCompanyCompleted = (entries: any[]): boolean => {
  if (entries.length === 0) return false

  // Group entries by build
  const buildEntries = new Map<string, any[]>()
  entries.forEach((entry) => {
    if (!buildEntries.has(entry.build)) {
      buildEntries.set(entry.build, [])
    }
    buildEntries.get(entry.build)!.push(entry)
  })

  // Check each build
  for (const [, buildEntriesList] of buildEntries) {
    // For each submission in this build
    for (const entry of buildEntriesList) {
      // Check WHT
      if (entry.wht_document_count > 0) {
        if (entry.wht_entry_status !== 'ดำเนินการเสร็จแล้ว') {
          return false
        }
      }
      // Check VAT
      if (entry.vat_document_count > 0) {
        if (entry.vat_entry_status !== 'ดำเนินการเสร็จแล้ว') {
          return false
        }
      }
      // Check Non-VAT
      if (entry.non_vat_document_count > 0) {
        if (entry.non_vat_entry_status !== 'ดำเนินการเสร็จแล้ว') {
          return false
        }
      }
    }
  }

  return true
}

// Helper function: Check if company has pending work
const hasPendingWork = (entries: any[]): boolean => {
  if (entries.length === 0) return false

  for (const entry of entries) {
    // Check if any document type has pending status
    if (entry.wht_document_count > 0 && entry.wht_entry_status === 'ยังไม่ดำเนินการ') {
      return true
    }
    if (entry.vat_document_count > 0 && entry.vat_entry_status === 'ยังไม่ดำเนินการ') {
      return true
    }
    if (entry.non_vat_document_count > 0 && entry.non_vat_entry_status === 'ยังไม่ดำเนินการ') {
      return true
    }
  }

  return false
}

const CompanyList = memo(({ year, month }: CompanyListProps) => {
  const { user, _hasHydrated } = useAuthStore()
  const employeeId = user?.employee_id || null
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null)

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component render หรือไม่
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[CompanyList] Component mounted/updated:', {
        hasUser: !!user,
        employeeId,
        _hasHydrated,
        year,
        month,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, employeeId, _hasHydrated, year, month])

  // Fetch document entry work entries filtered by document_entry_responsible
  const {
    data: documentEntryWorkResponse,
    isLoading,
    error,
  } = useQuery(
    ['document-entry-work', 'company-list', year, month, employeeId],
    () =>
      documentEntryWorkService.getList({
        year,
        month,
        document_entry_responsible: employeeId || undefined,
        limit: 1000, // Get all entries
      }),
    {
      enabled: !!employeeId && _hasHydrated, // ✅ BUG-168: รอ hydration เสร็จก่อน enable query
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: true, // ✅ BUG-168: refetch เมื่อ navigate ไปหน้าอื่น
    }
  )

  // Transform data to company records
  const companyRecords: CompanyRecord[] = useMemo(() => {
    if (!documentEntryWorkResponse?.data) return []

    // Group entries by build
    const buildMap = new Map<string, any[]>()
    documentEntryWorkResponse.data.forEach((entry) => {
      if (entry.build) {
        if (!buildMap.has(entry.build)) {
          buildMap.set(entry.build, [])
        }
        buildMap.get(entry.build)!.push(entry)
      }
    })

    return Array.from(buildMap.entries()).map(([build, entries]) => {
      // Get company name from first entry
      const companyName = entries[0]?.company_name || build

      // Calculate totals
      const whtTotal = entries.reduce((sum, e) => sum + (e.wht_document_count || 0), 0)
      const vatTotal = entries.reduce((sum, e) => sum + (e.vat_document_count || 0), 0)
      const nonVatTotal = entries.reduce((sum, e) => sum + (e.non_vat_document_count || 0), 0)
      const botTotal = entries.reduce((sum, e) => sum + (e.bot_count || 0), 0)

      // Determine status
      const completed = isCompanyCompleted(entries)
      const pending = hasPendingWork(entries)

      let status: 'completed' | 'pending' | 'in_progress' = 'pending'
      if (completed) {
        status = 'completed'
      } else if (!pending) {
        status = 'in_progress'
      }

      return {
        build,
        companyName,
        totalSubmissions: entries.length,
        status,
        whtTotal,
        vatTotal,
        nonVatTotal,
        botTotal,
      }
    })
  }, [documentEntryWorkResponse?.data])

  // Calculate summary statistics - count by entries (jobs) instead of companies
  const summary = useMemo(() => {
    if (!documentEntryWorkResponse?.data) {
      return {
        totalEntries: 0,
        fullyCompletedEntries: 0,
        partiallyCompletedEntries: 0,
        notStartedEntries: 0,
      }
    }

    const entries = documentEntryWorkResponse.data
    let fullyCompleted = 0
    let partiallyCompleted = 0
    let notStarted = 0

    entries.forEach((entry) => {
      // Check if entry has any documents
      const hasDocuments =
        (entry.wht_document_count || 0) > 0 ||
        (entry.vat_document_count || 0) > 0 ||
        (entry.non_vat_document_count || 0) > 0

      if (!hasDocuments) {
        // No documents at all (bot data only) - don't count in any category
        return
      }

      // Check status of each document type
      const whtCompleted =
        (entry.wht_document_count || 0) === 0 || entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว'
      const vatCompleted =
        (entry.vat_document_count || 0) === 0 || entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว'
      const nonVatCompleted =
        (entry.non_vat_document_count || 0) === 0 ||
        entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว'

      const whtStarted =
        entry.wht_entry_status === 'กำลังดำเนินการ' || entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว'
      const vatStarted =
        entry.vat_entry_status === 'กำลังดำเนินการ' || entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว'
      const nonVatStarted =
        entry.non_vat_entry_status === 'กำลังดำเนินการ' ||
        entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว'

      // Check if all document types are completed
      if (whtCompleted && vatCompleted && nonVatCompleted) {
        fullyCompleted++
      } else if (whtStarted || vatStarted || nonVatStarted) {
        // At least one type is started but not all completed
        partiallyCompleted++
      } else {
        // No document types started
        notStarted++
      }
    })

    return {
      totalEntries: fullyCompleted + partiallyCompleted + notStarted,
      fullyCompletedEntries: fullyCompleted,
      partiallyCompletedEntries: partiallyCompleted,
      notStartedEntries: notStarted,
    }
  }, [documentEntryWorkResponse?.data])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <Alert icon={<TbAlertCircle size={16} />} title="เกิดข้อผิดพลาด" color="red">
        ไม่สามารถดึงข้อมูลได้
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Text size="sm" fw={500} c="dimmed" mb={4}>
            งานทั้งหมด
          </Text>
          <Text size="xl" fw={700} c="orange">
            {summary.totalEntries}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#e8f5e9' }}>
          <Text size="sm" fw={500} c="dimmed" mb={4}>
            ดำเนินการเสร็จทั้งหมด
          </Text>
          <Text size="xl" fw={700} c="#388e3c">
            {summary.fullyCompletedEntries}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#fff3e0' }}>
          <Text size="sm" fw={500} c="dimmed" mb={4}>
            ดำเนินการเสร็จบางส่วน
          </Text>
          <Text size="xl" fw={700} c="#ff6b35">
            {summary.partiallyCompletedEntries}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f5f5f5' }}>
          <Text size="sm" fw={500} c="dimmed" mb={4}>
            ยังไม่ดำเนินการ
          </Text>
          <Text size="xl" fw={700} c="#757575">
            {summary.notStartedEntries}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            รายการ
          </Text>
        </Card>
      </SimpleGrid>

      {/* Company Table */}
      <Card withBorder radius="md" p="md">
        <Text size="lg" fw={600} mb="md">
          งานที่ได้รับผิดชอบ
        </Text>
        {companyRecords.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">ไม่มีข้อมูลบริษัทที่ได้รับมอบหมาย</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Build</Table.Th>
                  <Table.Th>ชื่อบริษัท</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>จำนวนครั้งที่ส่ง</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>WHT</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>VAT</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Non-VAT</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>บอท</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>จัดการ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companyRecords.map((record) => {
                  const isSelected = selectedBuild === record.build
                  return (
                    <React.Fragment key={record.build}>
                      <Table.Tr
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#fff3e0' : undefined
                        }}
                        onClick={() => setSelectedBuild(isSelected ? null : record.build)}
                      >
                        <Table.Td>
                          <Badge variant="outline" color="orange">
                            {record.build}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{record.companyName}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Text>{record.totalSubmissions}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Text>{record.whtTotal}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Text>{record.vatTotal}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Text>{record.nonVatTotal}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Text>{record.botTotal}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {record.status === 'completed' ? (
                            <Badge color="green" variant="light">
                              เสร็จแล้ว
                            </Badge>
                          ) : record.status === 'in_progress' ? (
                            <Badge color="yellow" variant="light">
                              กำลังดำเนินการ
                            </Badge>
                          ) : (
                            <Badge color="red" variant="light">
                              รอดำเนินการ
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group gap="xs" justify="center">
                            <Text size="xs" c="dimmed">
                              {isSelected ? 'ซ่อน' : 'ดู'}
                            </Text>
                            {isSelected ? (
                              <TbChevronUp size={16} />
                            ) : (
                              <TbChevronDown size={16} />
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                      {isSelected && (
                        <Table.Tr>
                          <Table.Td colSpan={9} style={{ padding: 0, borderTop: 0 }}>
                            <CompanyDetailSection
                              build={record.build}
                              companyName={record.companyName}
                              year={year}
                              month={month}
                            />
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
})

CompanyList.displayName = 'CompanyList'

export default CompanyList
