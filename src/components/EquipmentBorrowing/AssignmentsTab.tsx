/**
 * AssignmentsTab — แท็บอุปกรณ์ที่พนักงานใช้
 */
import {
    Stack, Group, Text, Table, Badge, TextInput, Pagination, Button,
    ActionIcon, Tooltip, Skeleton,
} from '@mantine/core'
import { TbSearch, TbPlus, TbArrowBackUp, TbTrash } from 'react-icons/tb'
import type { EquipmentAssignment } from '../../services/equipmentService'
import { categoryConfig, formatDate } from './constants'

interface AssignmentsTabProps {
    assignmentsData: any
    loading: boolean
    isAdmin: boolean
    // Filter state
    aSearch: string
    setASearch: (v: string) => void
    // Pagination
    aPage: number
    setAPage: (v: number) => void
    // Actions
    onOpenAssignModal: () => void
    onReturnAssignment: (id: string) => void
    onDeleteAssignment: (type: 'assignment', id: string, name: string) => void
}

export default function AssignmentsTab({
    assignmentsData, loading, isAdmin,
    aSearch, setASearch,
    aPage, setAPage,
    onOpenAssignModal, onReturnAssignment, onDeleteAssignment,
}: AssignmentsTabProps) {
    return (
        <Stack gap="md">
            {/* Filters + Add button */}
            <Group justify="space-between">
                <Group gap="xs">
                    <TextInput
                        placeholder="ค้นหาพนักงาน / อุปกรณ์..."
                        size="xs" radius="xl"
                        leftSection={<TbSearch size={14} />}
                        value={aSearch}
                        onChange={e => { setASearch(e.target.value); setAPage(1) }}
                        style={{ width: 250 }}
                    />
                </Group>
                {isAdmin && (
                    <Button
                        variant="filled" color="teal" size="xs" radius="xl"
                        leftSection={<TbPlus size={14} />}
                        onClick={onOpenAssignModal}
                    >
                        มอบหมายอุปกรณ์
                    </Button>
                )}
            </Group>

            {/* Table */}
            {loading ? (
                <Stack gap="xs">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} />)}</Stack>
            ) : (
                <>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>พนักงาน</Table.Th>
                                <Table.Th>อุปกรณ์</Table.Th>
                                <Table.Th>หมวดหมู่</Table.Th>
                                <Table.Th>ยี่ห้อ / รุ่น</Table.Th>
                                <Table.Th>S/N</Table.Th>
                                <Table.Th>วันที่มอบหมาย</Table.Th>
                                <Table.Th>หมายเหตุ</Table.Th>
                                {isAdmin && <Table.Th style={{ width: 80 }}>จัดการ</Table.Th>}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {(!assignmentsData?.assignments || assignmentsData.assignments.length === 0) ? (
                                <Table.Tr>
                                    <Table.Td colSpan={isAdmin ? 8 : 7}>
                                        <Text ta="center" c="dimmed" py="xl">ยังไม่มีการมอบหมายอุปกรณ์</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                assignmentsData.assignments.map((a: EquipmentAssignment) => {
                                    const cc = categoryConfig[a.equipment_category] || categoryConfig.other
                                    const CatIcon = cc.icon
                                    return (
                                        <Table.Tr key={a.id}>
                                            <Table.Td>
                                                <div>
                                                    <Text size="sm" fw={500}>{a.employee_nick_name || a.employee_name}</Text>
                                                    {a.employee_code && <Text size="xs" c="dimmed">{a.employee_code}</Text>}
                                                </div>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs" wrap="nowrap">
                                                    <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                    <Text size="sm" fw={500}>{a.equipment_name}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color={cc.color} size="sm" radius="xl">{cc.label}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{a.equipment_brand || '–'} {a.equipment_model ? `/ ${a.equipment_model}` : ''}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed" ff="monospace">{a.equipment_serial || '–'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(a.assigned_date)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed" lineClamp={1}>{a.notes || '–'}</Text>
                                            </Table.Td>
                                            {isAdmin && (
                                                <Table.Td>
                                                    <Group gap={4}>
                                                        <Tooltip label="เรียกคืน">
                                                            <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => onReturnAssignment(a.id)}>
                                                                <TbArrowBackUp size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="ลบ">
                                                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => {
                                                                onDeleteAssignment('assignment', a.id, `${a.equipment_name} → ${a.employee_name}`)
                                                            }}>
                                                                <TbTrash size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Table.Td>
                                            )}
                                        </Table.Tr>
                                    )
                                })
                            )}
                        </Table.Tbody>
                    </Table>

                    {/* Pagination */}
                    {assignmentsData && (
                        <Group justify="space-between" mt="md" align="center">
                            <Text size="xs" c="dimmed">ทั้งหมด {assignmentsData.pagination.total} รายการ</Text>
                            {assignmentsData.pagination.totalPages > 1 && (
                                <Pagination total={assignmentsData.pagination.totalPages} value={aPage} onChange={setAPage}
                                    size="sm" radius="xl" color="teal" />
                            )}
                        </Group>
                    )}
                </>
            )}
        </Stack>
    )
}
