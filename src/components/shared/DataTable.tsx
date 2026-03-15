/**
 * DataTable — Reusable table with pagination, loading, and empty states
 * Wraps Mantine Table + Pagination into a consistent pattern
 */

import {
  Table,
  Center,
  Loader,
  Text,
  Stack,
  Pagination,
  Group,
  Select,

} from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'

export interface DataTableColumn<T> {
  /** Unique column key */
  key: string
  /** Column header label */
  label: string
  /** Column width */
  width?: number | string
  /** Custom cell renderer */
  render: (item: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[]
  /** Data array */
  data: T[]
  /** Unique key extractor */
  rowKey: (item: T) => string
  /** Whether data is loading */
  isLoading?: boolean
  /** Message when no data */
  emptyMessage?: string
  /** Current page (1-indexed) */
  page?: number
  /** Total number of pages */
  totalPages?: number
  /** Page change handler */
  onPageChange?: (page: number) => void
  /** Items per page options */
  pageSizeOptions?: string[]
  /** Current page size */
  pageSize?: number
  /** Page size change handler */
  onPageSizeChange?: (size: number) => void
  /** Total item count (for display) */
  totalItems?: number
  /** Highlight rows on hover */
  highlightOnHover?: boolean
  /** Striped rows */
  striped?: boolean
  /** Show column borders */
  withColumnBorders?: boolean
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyMessage = 'ไม่พบข้อมูล',
  page,
  totalPages,
  onPageChange,
  pageSizeOptions,
  pageSize,
  onPageSizeChange,
  totalItems,
  highlightOnHover = true,
  striped = false,
  withColumnBorders = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Loader size="md" color="orange" />
          <Text size="sm" c="dimmed">กำลังโหลดข้อมูล...</Text>
        </Stack>
      </Center>
    )
  }

  if (data.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <TbAlertCircle size={40} color="var(--mantine-color-gray-5)" />
          <Text size="sm" c="dimmed">{emptyMessage}</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Stack gap="md">
      <Table.ScrollContainer minWidth={600}>
        <Table
          highlightOnHover={highlightOnHover}
          striped={striped}
          withColumnBorders={withColumnBorders}
          withTableBorder
        >
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((item, index) => (
              <Table.Tr key={rowKey(item)}>
                {columns.map((col) => (
                  <Table.Td key={col.key}>{col.render(item, index)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* Pagination */}
      {(page !== undefined && totalPages !== undefined && onPageChange) && (
        <Group justify="space-between" align="center">
          <Group gap="sm">
            {totalItems !== undefined && (
              <Text size="sm" c="dimmed">ทั้งหมด {totalItems} รายการ</Text>
            )}
            {pageSizeOptions && onPageSizeChange && (
              <Select
                size="xs"
                data={pageSizeOptions}
                value={String(pageSize)}
                onChange={(v) => v && onPageSizeChange(Number(v))}
                style={{ width: 100 }}
              />
            )}
          </Group>
          <Pagination
            value={page}
            onChange={onPageChange}
            total={totalPages}
            size="sm"
            radius="lg"
          />
        </Group>
      )}
    </Stack>
  )
}
