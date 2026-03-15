/**
 * PreviewDataTable — Preview bulk-create data with editable responsible fields
 * Extracted from WorkAssignment.tsx for maintainability
 */

import { useMemo } from 'react'
import {
  Stack, Group, Card, Text, Badge, Box, SimpleGrid,
  Table, Select, TextInput, Button, Pagination,
} from '@mantine/core'
import { TbSearch, TbCheck } from 'react-icons/tb'
import type { PreviewDataItem, SelectOption } from './types'

interface UserOptions {
  accountingUserOptions: SelectOption[]
  taxInspectionUserOptions: SelectOption[]
  filingUserOptions: SelectOption[]
  documentEntryUserOptions: SelectOption[]
}

interface PreviewDataTableProps {
  filteredPreviewData: PreviewDataItem[]
  paginatedPreviewData: PreviewDataItem[]
  previewPage: number
  previewLimit: number
  totalPreviewPages: number
  previewSearch: string
  filterByAssignmentStatus: 'all' | 'assigned' | 'partial' | 'unassigned'
  isSaving: boolean
  userOptions: UserOptions
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onFilterChange: (filter: 'all' | 'assigned' | 'partial' | 'unassigned') => void
  onPreviewDataUpdate: (updater: (prev: PreviewDataItem[]) => PreviewDataItem[]) => void
  onSave: () => void
}

const TH_STYLE: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  color: '#495057',
  border: 'none',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

/** Merge base dropdown options with pre-selected values from preview data */
function mergeWithPreviewValues(
  baseOptions: SelectOption[],
  previewData: PreviewDataItem[],
  idField: keyof PreviewDataItem,
  nameField: keyof PreviewDataItem,
  newIdField: keyof PreviewDataItem,
): SelectOption[] {
  const existingValues = new Set(baseOptions.map((o) => o.value))
  const extras: SelectOption[] = []
  // Build {id → name} map from all preview items
  const nameMap = new Map<string, string>()
  previewData.forEach((item) => {
    const prevId = item[idField] as string | null
    const prevName = item[nameField] as string | null
    if (prevId && prevName) nameMap.set(prevId, prevName)
  })

  // Add options for any new_* values not already in dropdown
  previewData.forEach((item) => {
    const newId = item[newIdField] as string | null
    if (newId && !existingValues.has(newId)) {
      const name = nameMap.get(newId)
      if (name) {
        existingValues.add(newId)
        extras.push({ value: newId, label: name })
      }
    }
  })

  return extras.length > 0 ? [...baseOptions, ...extras] : baseOptions
}

export default function PreviewDataTable({
  filteredPreviewData,
  paginatedPreviewData,
  previewPage,
  previewLimit,
  totalPreviewPages,
  previewSearch,
  filterByAssignmentStatus,
  isSaving,
  userOptions,
  onPageChange,
  onSearchChange,
  onFilterChange,
  onPreviewDataUpdate,
  onSave,
}: PreviewDataTableProps) {
  // Merge dropdown options with pre-selected values from preview data
  const mergedOptions = useMemo(() => ({
    accounting: mergeWithPreviewValues(
      userOptions.accountingUserOptions, filteredPreviewData,
      'prev_accounting_responsible', 'prev_accounting_responsible_name',
      'new_accounting_responsible',
    ),
    taxInspection: mergeWithPreviewValues(
      userOptions.taxInspectionUserOptions, filteredPreviewData,
      'prev_tax_inspection_responsible', 'prev_tax_inspection_responsible_name',
      'new_tax_inspection_responsible',
    ),
    wht: mergeWithPreviewValues(
      userOptions.filingUserOptions, filteredPreviewData,
      'prev_wht_filer_responsible', 'prev_wht_filer_responsible_name',
      'new_wht_filer_responsible',
    ),
    vat: mergeWithPreviewValues(
      userOptions.filingUserOptions, filteredPreviewData,
      'prev_vat_filer_responsible', 'prev_vat_filer_responsible_name',
      'new_vat_filer_responsible',
    ),
    documentEntry: mergeWithPreviewValues(
      userOptions.documentEntryUserOptions, filteredPreviewData,
      'prev_document_entry_responsible', 'prev_document_entry_responsible_name',
      'new_document_entry_responsible',
    ),
  }), [userOptions, filteredPreviewData])

  // Pre-compute stats
  const statsAll = filteredPreviewData.map((item) => {
    const isVat = item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'
    const fields = [
      item.new_accounting_responsible,
      item.new_tax_inspection_responsible,
      item.new_wht_filer_responsible,
      item.new_document_entry_responsible,
      ...(isVat ? [item.new_vat_filer_responsible] : []),
    ]
    const total = fields.length
    const filled = fields.filter(Boolean).length
    return { status: filled === 0 ? 'none' : filled === total ? 'full' : 'partial' }
  })
  const countFull = statsAll.filter((s) => s.status === 'full').length
  const countPartial = statsAll.filter((s) => s.status === 'partial').length
  const countNone = statsAll.filter((s) => s.status === 'none').length
  const countVat = filteredPreviewData.filter((i) => i.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม').length
  const countNoVat = filteredPreviewData.length - countVat

  const updateField = (build: string, field: keyof PreviewDataItem, value: string | null) => {
    onPreviewDataUpdate((prev) =>
      prev.map((p) => (p.build === build ? { ...p, [field]: value } : p))
    )
  }

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <Text size="lg" fw={700}>ข้อมูลตัวอย่าง</Text>
            <Badge size="lg" variant="filled" color="gray" radius="md">
              {filteredPreviewData.length} รายการ
            </Badge>
          </Group>
          <Group gap="sm">
            <Select
              size="xs"
              radius="md"
              data={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'assigned', label: 'จัดครบแล้ว' },
                { value: 'partial', label: 'จัดบางส่วน' },
                { value: 'unassigned', label: 'ยังไม่จัด' },
              ]}
              value={filterByAssignmentStatus}
              onChange={(v) => onFilterChange((v as 'all' | 'assigned' | 'partial' | 'unassigned') || 'all')}
            />
            <TextInput
              size="xs"
              radius="md"
              placeholder="ค้นหา Build/บริษัท..."
              value={previewSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              leftSection={<TbSearch size={14} />}
              style={{ minWidth: 200 }}
            />
            <Button
              color="green"
              radius="md"
              onClick={onSave}
              loading={isSaving}
              leftSection={<TbCheck size={16} />}
            >
              บันทึกข้อมูลทั้งหมด
            </Button>
          </Group>
        </Group>

        {/* Summary Stats */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          <Card p="sm" radius="md" style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
            <Group gap="xs" align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4caf50' }} />
              <Text size="xs" fw={600} c="dark">จัดครบแล้ว</Text>
            </Group>
            <Text size="xl" fw={700} c="green.8" mt={4}>{countFull}</Text>
          </Card>
          <Card p="sm" radius="md" style={{ backgroundColor: '#fff3e0', border: '1px solid #ffcc80' }}>
            <Group gap="xs" align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff9800' }} />
              <Text size="xs" fw={600} c="dark">จัดบางส่วน</Text>
            </Group>
            <Text size="xl" fw={700} c="orange.8" mt={4}>{countPartial}</Text>
          </Card>
          <Card p="sm" radius="md" style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0' }}>
            <Group gap="xs" align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9e9e9e' }} />
              <Text size="xs" fw={600} c="dark">ยังไม่จัด</Text>
            </Group>
            <Text size="xl" fw={700} c="gray.7" mt={4}>{countNone}</Text>
          </Card>
          <Card p="sm" radius="md" style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
            <Group gap="xs" align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4caf50' }} />
              <Text size="xs" fw={600} c="dark">จดภาษีมูลค่าเพิ่ม</Text>
            </Group>
            <Text size="xl" fw={700} c="green.8" mt={4}>{countVat}</Text>
          </Card>
          <Card p="sm" radius="md" style={{ backgroundColor: '#ffebee', border: '1px solid #ef9a9a' }}>
            <Group gap="xs" align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f44336' }} />
              <Text size="xs" fw={600} c="dark">ยังไม่จดภาษีมูลค่าเพิ่ม</Text>
            </Group>
            <Text size="xl" fw={700} c="red.7" mt={4}>{countNoVat}</Text>
          </Card>
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          แสดง {paginatedPreviewData.length} จาก {filteredPreviewData.length} รายการ (หน้า {previewPage}/{totalPreviewPages || 1})
        </Text>

        {/* Table */}
        <Table.ScrollContainer minWidth={1200}>
          <Table
            highlightOnHover
            style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}
            styles={{
              th: { border: 'none !important' },
              td: { border: 'none !important', verticalAlign: 'top' },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ ...TH_STYLE, width: 40 }}>#</Table.Th>
                <Table.Th style={TH_STYLE}>Build</Table.Th>
                <Table.Th style={TH_STYLE}>บริษัท</Table.Th>
                <Table.Th style={{ ...TH_STYLE, textAlign: 'center' }}>สถานะบริษัท</Table.Th>
                <Table.Th style={{ ...TH_STYLE, textAlign: 'center' }}>จดภาษีมูลค่าเพิ่ม</Table.Th>
                <Table.Th style={{ ...TH_STYLE, textAlign: 'center' }}>ความคืบหน้า</Table.Th>
                <Table.Th style={TH_STYLE}>ทำบัญชี</Table.Th>
                <Table.Th style={TH_STYLE}>ตรวจภาษี</Table.Th>
                <Table.Th style={TH_STYLE}>ยื่น WHT</Table.Th>
                <Table.Th style={TH_STYLE}>ยื่น VAT</Table.Th>
                <Table.Th style={TH_STYLE}>คีย์เอกสาร</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedPreviewData.map((item, idx) => {
                const isVatRegistered = item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'
                const requiredFields = [
                  item.new_accounting_responsible,
                  item.new_tax_inspection_responsible,
                  item.new_wht_filer_responsible,
                  item.new_document_entry_responsible,
                  ...(isVatRegistered ? [item.new_vat_filer_responsible] : []),
                ]
                const totalRequired = requiredFields.length
                const filledCount = requiredFields.filter(Boolean).length
                const assignStatus = filledCount === 0 ? 'none' : filledCount === totalRequired ? 'full' : 'partial'
                const progressPercent = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 0
                const progressColor = assignStatus === 'full' ? '#4caf50' : assignStatus === 'partial' ? '#ff9800' : '#e0e0e0'
                const rowNum = (previewPage - 1) * previewLimit + idx + 1
                const rowBg = assignStatus === 'full' ? '#f1f8e9' : assignStatus === 'partial' ? '#fff8e1' : 'white'
                const tdStyle: React.CSSProperties = { backgroundColor: 'transparent', border: 'none' }

                return (
                  <Table.Tr key={item.build} style={{ backgroundColor: rowBg, borderRadius: 8 }}>
                    <Table.Td style={tdStyle}>
                      <Text size="xs" fw={500} c="dimmed">{rowNum}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text fw={600} size="sm" c="dark">{item.build}</Text>
                    </Table.Td>
                    <Table.Td style={tdStyle}>
                      <Text size="sm" c="dark" lineClamp={1} style={{ maxWidth: 180 }}>{item.company_name}</Text>
                    </Table.Td>
                    {/* สถานะบริษัท */}
                    <Table.Td style={{ ...tdStyle, textAlign: 'center' }}>
                      <Badge size="sm" variant="light" radius="sm" color={
                        item.company_status === 'ยกเลิกทำ' ? 'red'
                        : item.company_status?.includes('เดือนสุดท้าย') ? 'orange'
                        : item.company_status?.includes('วางมือ') || item.company_status?.includes('จ่ายรายปี') ? 'yellow'
                        : 'teal'
                      }>
                        {item.company_status || '-'}
                      </Badge>
                    </Table.Td>
                    {/* สถานะจดภาษีมูลค่าเพิ่ม */}
                    <Table.Td style={{ ...tdStyle, textAlign: 'center' }}>
                      <Badge size="sm" variant="filled" color={isVatRegistered ? 'green' : 'red'} radius="sm">
                        {isVatRegistered ? 'จดภาษีมูลค่าเพิ่ม' : 'ยังไม่จดภาษีมูลค่าเพิ่ม'}
                      </Badge>
                    </Table.Td>
                    {/* ความคืบหน้า */}
                    <Table.Td style={{ ...tdStyle, textAlign: 'center', minWidth: 120 }}>
                      <Stack gap={4} align="center">
                        <Group gap={4} align="center">
                          <Text size="xs" fw={700} c={assignStatus === 'full' ? 'green.7' : assignStatus === 'partial' ? 'orange.7' : 'gray.5'}>
                            {filledCount}/{totalRequired}
                          </Text>
                          <Text size="xs" c="dimmed">({progressPercent}%)</Text>
                        </Group>
                        <Box style={{ width: '100%', height: 6, backgroundColor: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
                          <Box style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressColor, borderRadius: 3, transition: 'width 0.3s ease' }} />
                        </Box>
                        <Text size="xs" c={assignStatus === 'full' ? 'green.7' : assignStatus === 'partial' ? 'orange.6' : 'gray.5'} fw={600}>
                          {assignStatus === 'full' ? '✓ จัดครบแล้ว' : assignStatus === 'partial' ? 'จัดบางส่วน' : 'ยังไม่จัด'}
                        </Text>
                      </Stack>
                    </Table.Td>
                    {/* ทำบัญชี */}
                    <Table.Td style={tdStyle}>
                      <Select size="xs" placeholder="เลือก..." data={mergedOptions.accounting} value={item.new_accounting_responsible}
                        onChange={(v) => updateField(item.build, 'new_accounting_responsible', v)} clearable searchable style={{ minWidth: 150 }} radius="md" />
                      <Text size="xs" c="dimmed" mt={3}>เดิม: {item.prev_accounting_responsible_name || '-'}</Text>
                    </Table.Td>
                    {/* ตรวจภาษี */}
                    <Table.Td style={tdStyle}>
                      <Select size="xs" placeholder="เลือก..." data={mergedOptions.taxInspection} value={item.new_tax_inspection_responsible}
                        onChange={(v) => updateField(item.build, 'new_tax_inspection_responsible', v)} clearable searchable style={{ minWidth: 150 }} radius="md" />
                      <Text size="xs" c="dimmed" mt={3}>เดิม: {item.prev_tax_inspection_responsible_name || '-'}</Text>
                    </Table.Td>
                    {/* ยื่น WHT */}
                    <Table.Td style={tdStyle}>
                      <Select size="xs" placeholder="เลือก..." data={mergedOptions.wht} value={item.new_wht_filer_responsible}
                        onChange={(v) => updateField(item.build, 'new_wht_filer_responsible', v)} clearable searchable style={{ minWidth: 150 }} radius="md" />
                      <Text size="xs" c="dimmed" mt={3}>เดิม: {item.prev_wht_filer_responsible_name || '-'}</Text>
                    </Table.Td>
                    {/* ยื่น VAT */}
                    <Table.Td style={{ ...tdStyle, opacity: isVatRegistered ? 1 : 0.5 }}>
                      <Select size="xs" placeholder={isVatRegistered ? 'เลือก...' : 'ไม่จดภาษีมูลค่าเพิ่ม'}
                        data={mergedOptions.vat} value={isVatRegistered ? item.new_vat_filer_responsible : null}
                        onChange={(v) => updateField(item.build, 'new_vat_filer_responsible', v)}
                        clearable searchable disabled={!isVatRegistered} style={{ minWidth: 150 }} radius="md" />
                      <Text size="xs" c="dimmed" mt={3}>
                        {isVatRegistered ? `เดิม: ${item.prev_vat_filer_responsible_name || '-'}` : 'ไม่ต้องยื่น VAT'}
                      </Text>
                    </Table.Td>
                    {/* คีย์เอกสาร */}
                    <Table.Td style={tdStyle}>
                      <Select size="xs" placeholder="เลือก..." data={mergedOptions.documentEntry} value={item.new_document_entry_responsible}
                        onChange={(v) => updateField(item.build, 'new_document_entry_responsible', v)} clearable searchable style={{ minWidth: 150 }} radius="md" />
                      <Text size="xs" c="dimmed" mt={3}>เดิม: {item.prev_document_entry_responsible_name || '-'}</Text>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {/* Pagination */}
        {totalPreviewPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={previewPage} onChange={onPageChange} total={totalPreviewPages} radius="lg" />
          </Group>
        )}
      </Stack>
    </Card>
  )
}
