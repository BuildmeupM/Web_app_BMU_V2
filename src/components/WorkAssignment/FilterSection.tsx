/**
 * FilterSection — Filters card for work assignment list
 * Extracted from WorkAssignment.tsx
 */

import { Card, Stack, Group, Text, Grid, TextInput, NumberInput, Select, Button } from '@mantine/core'
import { TbSearch, TbRefresh } from 'react-icons/tb'
import type { SelectOption } from './types'

interface FilterSectionProps {
  search: string
  onSearchChange: (value: string) => void
  year: string | null
  onYearChange: (value: string | null) => void
  month: string | null
  onMonthChange: (value: string | null) => void
  syncStatusFilter: 'all' | 'synced' | 'unsynced'
  onSyncStatusChange: (value: 'all' | 'synced' | 'unsynced') => void
  monthOptions: SelectOption[]
  // Responsible person filters
  accountingUserOptions: SelectOption[]
  taxInspectionUserOptions: SelectOption[]
  filingUserOptions: SelectOption[]
  documentEntryUserOptions: SelectOption[]
  filterByAccounting: string | null
  onFilterByAccountingChange: (value: string | null) => void
  filterByTaxInspection: string | null
  onFilterByTaxInspectionChange: (value: string | null) => void
  filterByWht: string | null
  onFilterByWhtChange: (value: string | null) => void
  filterByVat: string | null
  onFilterByVatChange: (value: string | null) => void
  filterByDocumentEntry: string | null
  onFilterByDocumentEntryChange: (value: string | null) => void
  // Refresh
  onRefresh: () => void
  isRefetching: boolean
}

export default function FilterSection({
  search, onSearchChange,
  year, onYearChange,
  month, onMonthChange,
  syncStatusFilter, onSyncStatusChange,
  monthOptions,
  accountingUserOptions, taxInspectionUserOptions,
  filingUserOptions, documentEntryUserOptions,
  filterByAccounting, onFilterByAccountingChange,
  filterByTaxInspection, onFilterByTaxInspectionChange,
  filterByWht, onFilterByWhtChange,
  filterByVat, onFilterByVatChange,
  filterByDocumentEntry, onFilterByDocumentEntryChange,
  onRefresh, isRefetching,
}: FilterSectionProps) {
  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500} c="black">กรองข้อมูล</Text>
          <Button
            leftSection={<TbRefresh size={18} />}
            variant="outline"
            color="orange"
            onClick={onRefresh}
            loading={isRefetching}
            radius="lg"
            style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}
          >
            รีเฟรซข้อมูล
          </Button>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ค้นหา</Text>
              <TextInput placeholder="ค้นหา..." leftSection={<TbSearch size={16} />} value={search} onChange={(e) => onSearchChange(e.target.value)} radius="lg" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ปี</Text>
              <NumberInput placeholder="ปี" value={year ? parseInt(year) : undefined} onChange={(value) => onYearChange(value ? value.toString() : null)} min={2020} max={2100} radius="lg" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>เดือน</Text>
              <Select placeholder="ทุกเดือน" data={monthOptions} value={month} onChange={onMonthChange} clearable radius="lg" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>สถานะซิงค์</Text>
              <Select
                data={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'synced', label: 'ซิงค์แล้ว' }, { value: 'unsynced', label: 'ยังไม่ซิงค์' }]}
                value={syncStatusFilter}
                onChange={(v) => onSyncStatusChange((v as 'all' | 'synced' | 'unsynced') || 'all')}
                radius="lg"
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <Grid mt="xs">
          <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ทำบัญชี</Text>
              <Select placeholder="ทั้งหมด" data={accountingUserOptions} value={filterByAccounting} onChange={onFilterByAccountingChange} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ตรวจภาษี</Text>
              <Select placeholder="ทั้งหมด" data={taxInspectionUserOptions} value={filterByTaxInspection} onChange={onFilterByTaxInspectionChange} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ยื่น WHT</Text>
              <Select placeholder="ทั้งหมด" data={filingUserOptions} value={filterByWht} onChange={onFilterByWhtChange} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>ยื่น VAT</Text>
              <Select placeholder="ทั้งหมด" data={filingUserOptions} value={filterByVat} onChange={onFilterByVatChange} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
            <Stack gap={4}>
              <Text size="xs" c="dimmed" fw={500}>คีย์เอกสาร</Text>
              <Select placeholder="ทั้งหมด" data={documentEntryUserOptions} value={filterByDocumentEntry} onChange={onFilterByDocumentEntryChange} clearable searchable radius="lg" nothingFoundMessage="ไม่พบพนักงาน" />
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  )
}
