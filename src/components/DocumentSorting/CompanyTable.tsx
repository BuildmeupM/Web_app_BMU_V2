/**
 * Company Table Component
 * Component สำหรับแสดงตารางบริษัทพร้อมปุ่มเลือก (คล้ายกับ TaxStatusTable)
 */

import { Table, Button, Text, Card, Loader, Center, Alert } from '@mantine/core'
import React, { useMemo, memo } from 'react'
import { TbFileText, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import monthlyTaxDataService, { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import documentEntryWorkService from '../../services/documentEntryWorkService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'

// Helper function: Format employee name to "ชื่อ (ชื่อเล่น)" format
const formatEmployeeName = (
  firstName: string | null | undefined,
  nickName: string | null | undefined
): string => {
  if (!firstName) return '-'
  if (nickName) {
    return `${firstName}(${nickName})`
  }
  return firstName
}


interface CompanyRecord {
  id: string
  build: string
  companyName: string
  // Document counts (รวมทุกครั้งที่ส่ง)
  whtTotal: number
  vatTotal: number
  nonVatTotal: number
  // Bot count (รวมทุกครั้งที่ส่ง)
  botTotal: number
  // Document entry responsible
  documentEntryResponsible: string | null
}

interface CompanyTableProps {
  onSelectCompany?: (buildId: string, companyName?: string) => void
  selectedBuild?: string | null
  disabled?: boolean
}

const CompanyTable = memo(({ onSelectCompany, selectedBuild, disabled = false }: CompanyTableProps) => {
  const { user } = useAuthStore()
  const employeeId = user?.employee_id || null
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch companies from monthly_tax_data (filter by accounting_responsible)
  const {
    data: taxDataResponse,
    isLoading: isLoadingTaxData,
    error: taxDataError,
  } = useQuery(
    ['monthly-tax-data', 'document-sorting-companies', employeeId, currentTaxMonth.year, currentTaxMonth.month],
    () =>
      monthlyTaxDataService.getList({
        accounting_responsible: employeeId || undefined,
        year: currentTaxMonth.year,
        month: currentTaxMonth.month,
        limit: 1000, // Get all companies
      }),
    {
      enabled: !!employeeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Fetch document_entry_work for all builds to sum document counts
  const {
    data: documentEntryWorkResponse,
    isLoading: isLoadingDocumentWork,
  } = useQuery(
    ['document-entry-work', 'all-builds', currentTaxMonth.year, currentTaxMonth.month, employeeId],
    () =>
      documentEntryWorkService.getList({
        year: currentTaxMonth.year,
        month: currentTaxMonth.month,
        accounting_responsible: employeeId || undefined,
        limit: 1000, // Get all entries
      }),
    {
      enabled: !!employeeId && !!taxDataResponse?.data,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  const isLoading = isLoadingTaxData || isLoadingDocumentWork
  const error = taxDataError

  // Transform data to table records
  const tableData: CompanyRecord[] = useMemo(() => {
    if (!taxDataResponse?.data) return []

    // Get unique builds with company names
    const buildMap = new Map<string, MonthlyTaxData>()
    taxDataResponse.data.forEach((item) => {
      if (item.build && !buildMap.has(item.build)) {
        buildMap.set(item.build, item)
      }
    })

    // Create a map of build -> document counts and bot counts (sum all submissions)
    const documentCountsMap = new Map<string, { wht: number; vat: number; nonVat: number; bots: number }>()
    if (documentEntryWorkResponse?.data) {
      documentEntryWorkResponse.data.forEach((entry) => {
        if (entry.build) {
          const current = documentCountsMap.get(entry.build) || { wht: 0, vat: 0, nonVat: 0, bots: 0 }
          documentCountsMap.set(entry.build, {
            wht: current.wht + (entry.wht_document_count || 0),
            vat: current.vat + (entry.vat_document_count || 0),
            nonVat: current.nonVat + (entry.non_vat_document_count || 0),
            bots: current.bots + (entry.bot_count || 0),
          })
        }
      })
    }

    return Array.from(buildMap.values()).map((item) => {
      const documentCounts = documentCountsMap.get(item.build) || { wht: 0, vat: 0, nonVat: 0, bots: 0 }
      const documentEntryResponsible = item.document_entry_responsible_first_name
        ? formatEmployeeName(item.document_entry_responsible_first_name, item.document_entry_responsible_nick_name)
        : null

      return {
        id: item.id,
        build: item.build,
        companyName: item.company_name || item.build,
        whtTotal: documentCounts.wht,
        vatTotal: documentCounts.vat,
        nonVatTotal: documentCounts.nonVat,
        botTotal: documentCounts.bots,
        documentEntryResponsible,
      } as CompanyRecord
    })
  }, [taxDataResponse?.data, documentEntryWorkResponse?.data])

  // Table Row Component
  const TableRow = memo(({ record }: { record: CompanyRecord }) => {
    const isSelected = selectedBuild === record.build

    return (
      <Table.Tr style={{ backgroundColor: isSelected ? '#fff3e0' : undefined }}>
        <Table.Td 
          style={{ 
            minWidth: 120,
            position: 'sticky',
            left: 0,
            zIndex: 10,
            backgroundColor: isSelected ? '#fff3e0' : '#fff',
            borderRight: '1px solid #dee2e6',
          }}
        >
          {record.build}
        </Table.Td>
        <Table.Td 
          style={{ 
            minWidth: 200,
            position: 'sticky',
            left: 120,
            zIndex: 10,
            backgroundColor: isSelected ? '#fff3e0' : '#fff',
            borderRight: '1px solid #dee2e6',
          }}
        >
          {record.companyName}
        </Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>
          <Text size="sm" fw={500} ta="center">
            {record.whtTotal.toLocaleString()}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>
          <Text size="sm" fw={500} ta="center">
            {record.vatTotal.toLocaleString()}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>
          <Text size="sm" fw={500} ta="center">
            {record.nonVatTotal.toLocaleString()}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>
          <Text size="sm" fw={500} ta="center">
            {record.botTotal.toLocaleString()}
          </Text>
        </Table.Td>
        <Table.Td>
          {record.documentEntryResponsible ? (
            <Text size="sm">
              <Text component="span" fw={700} c="#ff6b35">
                พนักงานที่รับผิดชอบในการคีย์:
              </Text>
              {' '}
              <Text component="span" c="dark">
                {record.documentEntryResponsible}
              </Text>
            </Text>
          ) : (
            <Text size="sm" c="dimmed">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          <Button
            size="xs"
            variant="filled"
            color="orange"
            leftSection={<TbFileText size={14} />}
            radius="lg"
            onClick={(e) => {
              e.stopPropagation()
              if (record.build && onSelectCompany) {
                onSelectCompany(record.build, record.companyName)
              }
            }}
            style={{
              backgroundColor: '#ff6b35',
              color: 'white',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            disabled={disabled || !record.build}
          >
            เลือกบริษัทนี้
          </Button>
        </Table.Td>
      </Table.Tr>
    )
  })

  TableRow.displayName = 'TableRow'

  if (isLoading) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Card>
    )
  }

  if (error) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
          ไม่สามารถโหลดข้อมูลบริษัทได้
        </Alert>
      </Card>
    )
  }

  if (tableData.length === 0) {
    return (
      <Card shadow="sm" radius="lg" withBorder p={0}>
        <Center py="xl">
          <Text c="dimmed">ไม่พบข้อมูลบริษัทที่รับผิดชอบ</Text>
        </Center>
      </Card>
    )
  }

  return (
    <Card shadow="sm" radius="lg" withBorder p={0}>
      <Table.ScrollContainer minWidth={1200}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th 
                style={{ 
                  minWidth: 120,
                  position: 'sticky',
                  left: 0,
                  zIndex: 15,
                  backgroundColor: '#fff',
                  borderRight: '1px solid #dee2e6',
                }}
              >
                Build
              </Table.Th>
              <Table.Th 
                style={{ 
                  minWidth: 200,
                  position: 'sticky',
                  left: 120,
                  zIndex: 15,
                  backgroundColor: '#fff',
                  borderRight: '1px solid #dee2e6',
                }}
              >
                ชื่อบริษัท
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>เอกสารมีหัก ณ ที่จ่าย (WHT)</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>เอกสารมีภาษีมูลค่าเพิ่ม (VAT)</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>เอกสารไม่มีภาษีมูลค่าเพิ่ม (Non-VAT)</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>ส่งข้อมูลบอทอัตโนมัติ</Table.Th>
              <Table.Th>ข้อมูลผู้รับผิดชอบ</Table.Th>
              <Table.Th>จัดการ</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tableData.map((record) => (
              <TableRow key={record.id} record={record} />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  )
})

CompanyTable.displayName = 'CompanyTable'

export default CompanyTable
