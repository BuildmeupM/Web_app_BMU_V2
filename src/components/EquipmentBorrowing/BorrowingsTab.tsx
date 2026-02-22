/**
 * BorrowingsTab — แท็บรายการยืม-คืน
 */
import {
    Stack, Group, Text, Table, Badge, TextInput, Select, Pagination,
    ActionIcon, Tooltip, Skeleton,
} from '@mantine/core'
import {
    TbSearch, TbCheck, TbX, TbArrowBackUp, TbTrash,
    TbArrowsSort, TbChevronUp, TbChevronDown,
} from 'react-icons/tb'
import type { EquipmentBorrowing as EquipmentBorrowingType } from '../../services/equipmentService'
import { categoryConfig, borrowStatusConfig, formatDate } from './constants'

// ── SortIcon helper ──
function SortIcon({ col, activeSort, activeOrder }: { col: string; activeSort: string; activeOrder: string }) {
    if (col !== activeSort) return <TbArrowsSort size={12} style={{ opacity: 0.3 }} />
    return activeOrder === 'asc' ? <TbChevronUp size={12} /> : <TbChevronDown size={12} />
}

interface BorrowingsTabProps {
    borrowingsData: any
    loading: boolean
    isAdmin: boolean
    // Filter state
    bSearch: string
    setBSearch: (v: string) => void
    bStatusFilter: string | null
    setBStatusFilter: (v: string | null) => void
    bSortBy: string
    bSortOrder: string
    handleBSort: (col: string) => void
    // Pagination
    bPage: number
    setBPage: (v: number) => void
    bLimit: number
    setBLimit: (v: number) => void
    // Actions
    onApprove: (id: string) => void
    onReject: (id: string) => void
    onReturn: (id: string) => void
    onDelete: (type: 'borrowing', id: string, name: string) => void
}

export default function BorrowingsTab({
    borrowingsData, loading, isAdmin,
    bSearch, setBSearch, bStatusFilter, setBStatusFilter,
    bSortBy, bSortOrder, handleBSort,
    bPage, setBPage, bLimit, setBLimit,
    onApprove, onReject, onReturn, onDelete,
}: BorrowingsTabProps) {
    return (
        <Stack gap="md">
            {/* Filters */}
            <Group justify="space-between">
                <Group gap="xs">
                    <TextInput
                        placeholder="ค้นหาอุปกรณ์ / ผู้ยืม..."
                        size="xs" radius="xl"
                        leftSection={<TbSearch size={14} />}
                        value={bSearch}
                        onChange={e => { setBSearch(e.target.value); setBPage(1) }}
                        style={{ width: 220 }}
                    />
                    <Select
                        placeholder="ทุกสถานะ"
                        size="xs" radius="xl" clearable
                        value={bStatusFilter}
                        onChange={val => { setBStatusFilter(val); setBPage(1) }}
                        data={Object.entries(borrowStatusConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                        style={{ width: 140 }}
                    />
                </Group>
            </Group>

            {/* Table */}
            {loading ? (
                <Stack gap="xs">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} />)}</Stack>
            ) : (
                <>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('equipment_name')}>
                                    <Group gap={4} wrap="nowrap">อุปกรณ์ <SortIcon col="equipment_name" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('borrower_name')}>
                                    <Group gap={4} wrap="nowrap">ผู้ยืม <SortIcon col="borrower_name" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('borrow_date')}>
                                    <Group gap={4} wrap="nowrap">วันที่ยืม <SortIcon col="borrow_date" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('expected_return_date')}>
                                    <Group gap={4} wrap="nowrap">กำหนดคืน <SortIcon col="expected_return_date" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('status')}>
                                    <Group gap={4} wrap="nowrap">สถานะ <SortIcon col="status" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th>เหตุผล</Table.Th>
                                <Table.Th style={{ width: 120 }}>จัดการ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {(!borrowingsData?.borrowings || borrowingsData.borrowings.length === 0) ? (
                                <Table.Tr>
                                    <Table.Td colSpan={7}>
                                        <Text ta="center" c="dimmed" py="xl">ไม่มีรายการยืม-คืน</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                borrowingsData.borrowings.map((b: EquipmentBorrowingType) => {
                                    const bsc = borrowStatusConfig[b.status] || { label: b.status, color: 'gray' }
                                    const cc = categoryConfig[b.equipment_category] || categoryConfig.other
                                    const CatIcon = cc.icon
                                    return (
                                        <Table.Tr key={b.id}>
                                            <Table.Td>
                                                <Group gap="xs" wrap="nowrap">
                                                    <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                    <div>
                                                        <Text size="sm" fw={500} lineClamp={1}>{b.equipment_name}</Text>
                                                        {b.equipment_brand && (
                                                            <Text size="xs" c="dimmed">{b.equipment_brand} {b.equipment_model || ''}</Text>
                                                        )}
                                                    </div>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>{b.borrower_nick_name || b.borrower_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(b.borrow_date)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(b.expected_return_date)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color={bsc.color} size="sm" radius="xl">{bsc.label}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed" lineClamp={1}>{b.purpose || '–'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    {isAdmin && b.status === 'pending' && (
                                                        <>
                                                            <Tooltip label="อนุมัติ">
                                                                <ActionIcon variant="subtle" color="green" size="sm" onClick={() => onApprove(b.id)}>
                                                                    <TbCheck size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Tooltip label="ปฏิเสธ">
                                                                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onReject(b.id)}>
                                                                    <TbX size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    {['approved', 'borrowed', 'overdue'].includes(b.status) && (
                                                        <Tooltip label="คืนอุปกรณ์">
                                                            <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => onReturn(b.id)}>
                                                                <TbArrowBackUp size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    {isAdmin && (
                                                        <Tooltip label="ลบ">
                                                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete('borrowing', b.id, b.equipment_name)}>
                                                                <TbTrash size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })
                            )}
                        </Table.Tbody>
                    </Table>

                    {/* Pagination */}
                    {borrowingsData && (
                        <Group justify="space-between" mt="md" align="center">
                            <Group gap="xs">
                                <Text size="xs" c="dimmed">แสดง</Text>
                                <Select size="xs" radius="xl" value={String(bLimit)}
                                    onChange={v => { setBLimit(Number(v) || 15); setBPage(1) }}
                                    data={['15', '25', '50', '100']} style={{ width: 75 }} />
                                <Text size="xs" c="dimmed">รายการ</Text>
                            </Group>
                            {borrowingsData.pagination.totalPages > 1 && (
                                <Pagination total={borrowingsData.pagination.totalPages} value={bPage} onChange={setBPage}
                                    size="sm" radius="xl" color="teal" />
                            )}
                            <Text size="xs" c="dimmed">ทั้งหมด {borrowingsData.pagination.total} รายการ</Text>
                        </Group>
                    )}
                </>
            )}
        </Stack>
    )
}
