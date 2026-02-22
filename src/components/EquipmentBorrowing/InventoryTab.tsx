/**
 * InventoryTab — แท็บคลังอุปกรณ์
 */
import {
    Stack, Group, Text, Table, Badge, TextInput, Select, Pagination,
    ActionIcon, Tooltip, Skeleton,
} from '@mantine/core'
import {
    TbSearch, TbEdit, TbTrash, TbPackageOff,
    TbArrowsSort, TbChevronUp, TbChevronDown,
} from 'react-icons/tb'
import type { Equipment } from '../../services/equipmentService'
import { categoryConfig, statusConfig } from './constants'

// ── SortIcon helper ──
function SortIcon({ col, activeSort, activeOrder }: { col: string; activeSort: string; activeOrder: string }) {
    if (col !== activeSort) return <TbArrowsSort size={12} style={{ opacity: 0.3 }} />
    return activeOrder === 'asc' ? <TbChevronUp size={12} /> : <TbChevronDown size={12} />
}

interface InventoryTabProps {
    equipmentData: any
    loading: boolean
    isAdmin: boolean
    // Filter state
    eSearch: string
    setESearch: (v: string) => void
    eCategoryFilter: string | null
    setECategoryFilter: (v: string | null) => void
    eStatusFilter: string | null
    setEStatusFilter: (v: string | null) => void
    eSortBy: string
    eSortOrder: string
    handleESort: (col: string) => void
    // Pagination
    ePage: number
    setEPage: (v: number) => void
    eLimit: number
    setELimit: (v: number) => void
    // Actions
    onBorrow: (eqId: string) => void
    onEdit: (eq: Equipment) => void
    onDelete: (type: 'equipment', id: string, name: string) => void
}

export default function InventoryTab({
    equipmentData, loading, isAdmin,
    eSearch, setESearch, eCategoryFilter, setECategoryFilter,
    eStatusFilter, setEStatusFilter, eSortBy, eSortOrder, handleESort,
    ePage, setEPage, eLimit, setELimit,
    onBorrow, onEdit, onDelete,
}: InventoryTabProps) {
    return (
        <Stack gap="md">
            {/* Filters */}
            <Group justify="space-between">
                <Group gap="xs">
                    <TextInput
                        placeholder="ค้นหาอุปกรณ์..."
                        size="xs" radius="xl"
                        leftSection={<TbSearch size={14} />}
                        value={eSearch}
                        onChange={e => { setESearch(e.target.value); setEPage(1) }}
                        style={{ width: 200 }}
                    />
                    <Select
                        placeholder="หมวดหมู่"
                        size="xs" radius="xl" clearable
                        value={eCategoryFilter}
                        onChange={val => { setECategoryFilter(val); setEPage(1) }}
                        data={Object.entries(categoryConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                        style={{ width: 140 }}
                    />
                    <Select
                        placeholder="สถานะ"
                        size="xs" radius="xl" clearable
                        value={eStatusFilter}
                        onChange={val => { setEStatusFilter(val); setEPage(1) }}
                        data={Object.entries(statusConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                        style={{ width: 130 }}
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
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('name')}>
                                    <Group gap={4} wrap="nowrap">ชื่ออุปกรณ์ <SortIcon col="name" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('category')}>
                                    <Group gap={4} wrap="nowrap">หมวดหมู่ <SortIcon col="category" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th>ยี่ห้อ / รุ่น</Table.Th>
                                <Table.Th>S/N</Table.Th>
                                <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('status')}>
                                    <Group gap={4} wrap="nowrap">สถานะ <SortIcon col="status" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                </Table.Th>
                                <Table.Th>ผู้ยืมปัจจุบัน</Table.Th>
                                <Table.Th style={{ width: 100 }}>จัดการ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {(!equipmentData?.equipment || equipmentData.equipment.length === 0) ? (
                                <Table.Tr>
                                    <Table.Td colSpan={7}>
                                        <Text ta="center" c="dimmed" py="xl">ไม่มีอุปกรณ์ในระบบ</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                equipmentData.equipment.map((eq: Equipment) => {
                                    const sc = statusConfig[eq.status] || { label: eq.status, color: 'gray' }
                                    const cc = categoryConfig[eq.category] || categoryConfig.other
                                    const CatIcon = cc.icon
                                    return (
                                        <Table.Tr key={eq.id}>
                                            <Table.Td>
                                                <Group gap="xs" wrap="nowrap">
                                                    <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                    <Text size="sm" fw={500}>{eq.name}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color={cc.color} size="sm" radius="xl">{cc.label}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{eq.brand || '–'} {eq.model ? `/ ${eq.model}` : ''}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed" ff="monospace">{eq.serial_number || '–'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color={sc.color} size="sm" radius="xl">{sc.label}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                {eq.current_borrowing ? (
                                                    <Text size="xs" c="dimmed">
                                                        {eq.current_borrowing.borrower_nick_name || eq.current_borrowing.borrower_name}
                                                    </Text>
                                                ) : (
                                                    <Text size="xs" c="dimmed">–</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    {eq.status === 'available' && (
                                                        <Tooltip label="ยืม">
                                                            <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => onBorrow(eq.id)}>
                                                                <TbPackageOff size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    {isAdmin && (
                                                        <>
                                                            <Tooltip label="แก้ไข">
                                                                <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => onEdit(eq)}>
                                                                    <TbEdit size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Tooltip label="ลบ">
                                                                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete('equipment', eq.id, eq.name)}>
                                                                    <TbTrash size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </>
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
                    {equipmentData && (
                        <Group justify="space-between" mt="md" align="center">
                            <Group gap="xs">
                                <Text size="xs" c="dimmed">แสดง</Text>
                                <Select size="xs" radius="xl" value={String(eLimit)}
                                    onChange={v => { setELimit(Number(v) || 15); setEPage(1) }}
                                    data={['15', '25', '50', '100']} style={{ width: 75 }} />
                                <Text size="xs" c="dimmed">รายการ</Text>
                            </Group>
                            {equipmentData.pagination.totalPages > 1 && (
                                <Pagination total={equipmentData.pagination.totalPages} value={ePage} onChange={setEPage}
                                    size="sm" radius="xl" color="teal" />
                            )}
                            <Text size="xs" c="dimmed">ทั้งหมด {equipmentData.pagination.total} รายการ</Text>
                        </Group>
                    )}
                </>
            )}
        </Stack>
    )
}
