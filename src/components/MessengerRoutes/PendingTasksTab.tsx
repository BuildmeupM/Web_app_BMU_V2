/**
 * PendingTasksTab — Pending messenger tasks table
 */

import {
    Box, Text, Group, Stack, Badge, Table, Loader,
} from '@mantine/core'
import { TbClipboardList } from 'react-icons/tb'
import type { MessengerPendingTask } from '../../services/messengerRouteService'

interface PendingTasksTabProps {
    tasks: MessengerPendingTask[]
    loading: boolean
}

const deptColors: Record<string, string> = { dbd: 'violet', rd: 'green', sso: 'blue', hr: 'red' }

export default function PendingTasksTab({ tasks, loading }: PendingTasksTabProps) {
    if (loading) {
        return <Box ta="center" py="xl"><Loader size="md" /></Box>
    }

    if (tasks.length === 0) {
        return (
            <Stack align="center" gap="md" py="xl">
                <TbClipboardList size={48} color="#ccc" />
                <Text c="dimmed" ta="center">ไม่มีงานที่รอวิ่งแมส</Text>
            </Stack>
        )
    }

    return (
        <>
            <Table.ScrollContainer minWidth={700}>
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ลูกค้า</Table.Th>
                            <Table.Th>ปลายทาง</Table.Th>
                            <Table.Th>รายละเอียด</Table.Th>
                            <Table.Th ta="center">แผนก</Table.Th>
                            <Table.Th>วันที่รับงาน</Table.Th>
                            <Table.Th ta="center">สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {tasks.map(task => (
                            <Table.Tr key={task.id}>
                                <Table.Td>
                                    <Text fw={600} size="sm">{task.client_name}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed">{task.messenger_destination || '-'}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed">{task.messenger_details || task.notes || '-'}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Badge size="xs" variant="light" color={deptColors[task.department] || 'gray'}>
                                        {task.department?.toUpperCase()}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{new Date(task.received_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Badge size="xs" variant="light" color="orange">รอจัดเส้นทาง</Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
            <Group justify="space-between" mt="md" px="xs">
                <Text size="sm" c="dimmed">ทั้งหมด {tasks.length} รายการ</Text>
            </Group>
        </>
    )
}
