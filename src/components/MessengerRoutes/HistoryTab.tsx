/**
 * HistoryTab — Completed routes history table
 */

import {
    Text, Group, Stack, Badge, Table, Tooltip,
    ActionIcon, ThemeIcon,
} from '@mantine/core'
import { TbHistory, TbSearch, TbAlertTriangle } from 'react-icons/tb'
import type { MessengerRoute } from '../../services/messengerRouteService'

interface HistoryTabProps {
    routes: MessengerRoute[]
    onViewDetail: (id: string) => void
}

export default function HistoryTab({ routes, onViewDetail }: HistoryTabProps) {
    if (routes.length === 0) {
        return (
            <Stack align="center" gap="md" py="xl">
                <TbHistory size={48} color="#ccc" />
                <Text c="dimmed" ta="center">ยังไม่มีประวัติการวิ่งแมส</Text>
            </Stack>
        )
    }

    return (
        <Table.ScrollContainer minWidth={700}>
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>วันที่</Table.Th>
                        <Table.Th ta="center">จุดแวะ</Table.Th>
                        <Table.Th ta="center">สำเร็จ</Table.Th>
                        <Table.Th ta="right">ระยะทาง</Table.Th>
                        <Table.Th ta="center">สถานะ</Table.Th>
                        <Table.Th ta="center">จัดการ</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {routes.map(route => {
                        const totalStops = Number(route.total_stops) || 0
                        const doneStops = Number(route.completed_stops) || 0
                        const failedStops = Number(route.failed_stops) || 0
                        return (
                            <Table.Tr key={route.id}>
                                <Table.Td>
                                    {new Date(route.route_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </Table.Td>
                                <Table.Td ta="center">{totalStops}</Table.Td>
                                <Table.Td ta="center">
                                    <Group gap={4} justify="center">
                                        <Text size="sm" c={failedStops > 0 ? 'red' : 'green'} fw={600}>
                                            {doneStops}/{totalStops}
                                        </Text>
                                        {failedStops > 0 && (
                                            <Tooltip label={`${failedStops} จุดไม่สำเร็จ`}>
                                                <ThemeIcon size={16} variant="transparent" color="red">
                                                    <TbAlertTriangle size={14} />
                                                </ThemeIcon>
                                            </Tooltip>
                                        )}
                                    </Group>
                                </Table.Td>
                                <Table.Td ta="right">{Number(route.total_distance).toFixed(1)} km</Table.Td>
                                <Table.Td ta="center">
                                    <Badge size="sm" variant="light" color="green">เสร็จสิ้น</Badge>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Tooltip label="ดูรายละเอียด">
                                        <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => onViewDetail(route.id)}>
                                            <TbSearch size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Table.Td>
                            </Table.Tr>
                        )
                    })}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    )
}
