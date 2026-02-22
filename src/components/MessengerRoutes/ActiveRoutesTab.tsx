/**
 * ActiveRoutesTab — Active routes list for MessengerRoutes page
 */

import {
    Card, Text, Group, Stack, Badge, Progress,
    Tooltip, ActionIcon,
} from '@mantine/core'
import { TbMotorbike, TbSearch, TbTrash } from 'react-icons/tb'
import type { MessengerRoute } from '../../services/messengerRouteService'
import { statusConfig } from './constants'

interface ActiveRoutesTabProps {
    routes: MessengerRoute[]
    onViewDetail: (id: string) => void
    onDelete: (id: string) => void
}

export default function ActiveRoutesTab({ routes, onViewDetail, onDelete }: ActiveRoutesTabProps) {
    if (routes.length === 0) {
        return (
            <Stack align="center" gap="md" py="xl">
                <TbMotorbike size={48} color="#ccc" />
                <Text c="dimmed" ta="center">ยังไม่มีเส้นทางที่กำลังวิ่ง</Text>
            </Stack>
        )
    }

    return (
        <Stack gap="sm">
            {routes.map(route => {
                const st = statusConfig[route.status] || statusConfig.planned
                const totalStops = Number(route.total_stops) || 0
                const completedStops = Number(route.completed_stops) || 0
                const failedStops = Number(route.failed_stops) || 0
                const progressPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0
                return (
                    <Card key={route.id} withBorder radius="md" p="md" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => onViewDetail(route.id)}
                        className="route-card-hover"
                    >
                        <Group justify="space-between" mb="xs">
                            <Group gap="sm">
                                <Text fw={600}>
                                    📅 {new Date(route.route_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </Text>
                                <Badge size="sm" variant="light" color={st.color}>{st.label}</Badge>
                            </Group>
                            <Group gap={4}>
                                <Tooltip label="ดูรายละเอียด">
                                    <ActionIcon size="sm" variant="subtle" color="blue" onClick={(e) => { e.stopPropagation(); onViewDetail(route.id) }}>
                                        <TbSearch size={16} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="ลบ">
                                    <ActionIcon size="sm" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); onDelete(route.id) }}>
                                        <TbTrash size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </Group>
                        <Group gap="lg" mb="xs">
                            <Text size="sm" c="dimmed">📍 จุดแวะ: <Text span fw={600} c="dark">{totalStops}</Text></Text>
                            <Text size="sm" c="dimmed">📏 ระยะทาง: <Text span fw={600} c="dark">{Number(route.total_distance).toFixed(1)} km</Text></Text>
                            <Text size="sm" c="dimmed">✅ สำเร็จ: <Text span fw={600} c={failedStops > 0 ? 'red' : 'green'}>{completedStops}/{totalStops}</Text></Text>
                        </Group>
                        <Progress value={progressPct} size="sm" radius="xl" color={route.status === 'in_progress' ? 'blue' : 'orange'} mb="xs" />
                        {route.stops && route.stops.length > 0 && (
                            <Group gap={4}>
                                {route.stops.slice(0, 3).map((s, i) => (
                                    <Badge key={i} size="xs" variant="light" color="gray">📍 {s.location_name}</Badge>
                                ))}
                                {route.stops.length > 3 && <Badge size="xs" variant="light" color="gray">+{route.stops.length - 3}</Badge>}
                            </Group>
                        )}
                    </Card>
                )
            })}
        </Stack>
    )
}
