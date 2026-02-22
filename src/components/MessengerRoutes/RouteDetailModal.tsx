/**
 * RouteDetailModal — Route detail view modal with timeline, map, and stop actions
 */

import {
    Box, Card, Text, Group, Stack, SimpleGrid, Badge, Modal,
    Select, Button, ThemeIcon, Loader, Divider,
} from '@mantine/core'
import {
    TbEye, TbCurrentLocation, TbCheck, TbX,
} from 'react-icons/tb'
import type { MessengerRoute } from '../../services/messengerRouteService'
import { stopStatusConfig } from './constants'
import RouteMap from '../Messenger/RouteMap'

interface RouteDetailModalProps {
    opened: boolean
    onClose: () => void
    route: MessengerRoute | null
    loading: boolean
    onUpdateRouteStatus: (routeId: string, status: string) => void
    onUpdateStopStatus: (stopId: string, status: string, notes?: string) => void
}

export default function RouteDetailModal({
    opened,
    onClose,
    route,
    loading,
    onUpdateRouteStatus,
    onUpdateStopStatus,
}: RouteDetailModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group gap="sm"><TbEye size={20} /><Text fw={700} size="lg">รายละเอียดตารางวิ่ง</Text></Group>}
            size="lg" radius="lg"
        >
            {loading && <Box ta="center" py="xl"><Loader /></Box>}

            {!loading && route && (
                <Stack gap="md">
                    <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f0f7ff' }}>
                        <SimpleGrid cols={2} spacing="sm">
                            <div>
                                <Text size="xs" c="dimmed">วันที่</Text>
                                <Text fw={600}>
                                    {new Date(route.route_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed">ระยะทางรวม</Text>
                                <Text fw={700} c="orange" size="lg">{Number(route.total_distance).toFixed(1)} km</Text>
                            </div>
                        </SimpleGrid>

                        {route.start_location && (
                            <Box mt="sm" p="xs" style={{ backgroundColor: '#e8f5e9', borderRadius: 8 }}>
                                <Text size="xs" c="dimmed">🚩 จุดเริ่มต้น:</Text>
                                <Text size="sm" fw={500}>{route.start_location}</Text>
                            </Box>
                        )}

                        {route.notes && (
                            <Box mt="sm" p="xs" style={{ backgroundColor: '#fff3e0', borderRadius: 8 }}>
                                <Text size="xs" c="dimmed">หมายเหตุ:</Text>
                                <Text size="sm">{route.notes}</Text>
                            </Box>
                        )}

                        <Group mt="sm" gap="xs">
                            <Text size="xs" c="dimmed">สถานะ:</Text>
                            <Select
                                size="xs" value={route.status}
                                data={[
                                    { value: 'planned', label: '📝 วางแผน' },
                                    { value: 'in_progress', label: '🔄 กำลังดำเนินการ' },
                                    { value: 'completed', label: '✅ เสร็จสิ้น' },
                                ]}
                                onChange={(v) => v && onUpdateRouteStatus(route.id, v)}
                                style={{ width: 180 }}
                            />
                        </Group>
                    </Card>

                    {/* 🗺️ Map */}
                    <Divider label="🗺️ แผนที่เส้นทาง" labelPosition="center" />
                    <RouteMap
                        startLocation={route.start_location}
                        startLat={route.start_lat}
                        startLng={route.start_lng}
                        stops={route.stops}
                        height={350}
                    />

                    <Divider label="เส้นทาง" labelPosition="center" />

                    {/* Starting point marker */}
                    {route.start_location && (
                        <Box>
                            <Group gap="sm" align="flex-start">
                                <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                                    <ThemeIcon size={32} radius="xl" color="teal" variant="filled">
                                        <TbCurrentLocation size={16} />
                                    </ThemeIcon>
                                    {route.stops.length > 0 && (
                                        <Box style={{ width: 2, height: 40, backgroundColor: '#dee2e6', margin: '4px 0' }} />
                                    )}
                                </Box>
                                <Card withBorder radius="md" p="sm" style={{ flex: 1, backgroundColor: '#e8f5e9' }}>
                                    <Text fw={600} size="sm">🚩 {route.start_location}</Text>
                                    <Text size="xs" c="dimmed">จุดเริ่มต้น</Text>
                                </Card>
                            </Group>
                        </Box>
                    )}

                    {/* Stops Timeline */}
                    {route.stops.map((stop, i) => {
                        const st = stopStatusConfig[stop.status] || stopStatusConfig.pending
                        const StIcon = st.icon
                        return (
                            <Box key={stop.id || i}>
                                <Group gap="sm" align="flex-start">
                                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                                        <ThemeIcon size={32} radius="xl" color={st.color} variant="filled">
                                            <StIcon size={16} />
                                        </ThemeIcon>
                                        {i < route.stops.length - 1 && (
                                            <Box style={{ width: 2, height: 40, backgroundColor: '#dee2e6', margin: '4px 0' }} />
                                        )}
                                    </Box>
                                    <Card withBorder radius="md" p="sm" style={{ flex: 1 }}>
                                        <Group justify="space-between">
                                            <div>
                                                <Text fw={600} size="sm">{stop.location_name}</Text>
                                                {stop.estimated_time && <Text size="xs" c="dimmed">⏰ {stop.estimated_time}</Text>}
                                            </div>
                                            <Group gap="xs">
                                                {stop.distance_km > 0 && (
                                                    <Badge size="xs" variant="light" color="orange">
                                                        {Number(stop.distance_km).toFixed(1)} km
                                                    </Badge>
                                                )}
                                                <Badge size="xs" variant="light" color={st.color}>{st.label}</Badge>
                                            </Group>
                                        </Group>

                                        {stop.tasks && stop.tasks.length > 0 && (
                                            <Group gap={4} mt={4}>
                                                {stop.tasks.map((task, ti) => (
                                                    <Badge key={ti} size="xs" variant="outline" color="gray">📋 {task}</Badge>
                                                ))}
                                            </Group>
                                        )}

                                        {stop.notes && (
                                            <Box mt={4} p={6} style={{
                                                backgroundColor: stop.status === 'failed' ? '#ffebee' : '#fff8e1',
                                                borderRadius: 6,
                                                borderLeft: `3px solid ${stop.status === 'failed' ? '#e53935' : '#f9a825'}`,
                                            }}>
                                                <Text size="xs">
                                                    {stop.status === 'failed' ? '⚠️' : '📝'} {stop.notes}
                                                </Text>
                                            </Box>
                                        )}

                                        {stop.status === 'pending' && stop.id && (
                                            <Group gap="xs" mt="xs">
                                                <Button size="xs" variant="light" color="green" leftSection={<TbCheck size={12} />}
                                                    onClick={() => onUpdateStopStatus(stop.id!, 'completed')}>
                                                    สำเร็จ
                                                </Button>
                                                <Button size="xs" variant="light" color="red" leftSection={<TbX size={12} />}
                                                    onClick={() => {
                                                        const note = window.prompt('หมายเหตุ (เหตุผลที่ไม่สำเร็จ):')
                                                        if (note !== null) onUpdateStopStatus(stop.id!, 'failed', note || undefined)
                                                    }}>
                                                    ไม่สำเร็จ
                                                </Button>
                                            </Group>
                                        )}
                                    </Card>
                                </Group>
                            </Box>
                        )
                    })}

                    {route.stops.length === 0 && (
                        <Text c="dimmed" ta="center" py="md">ไม่มีจุดแวะ</Text>
                    )}
                </Stack>
            )}
        </Modal>
    )
}
