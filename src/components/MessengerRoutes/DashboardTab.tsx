/**
 * DashboardTab — Dashboard analytics tab for Messenger Routes
 * Shows route status donut, stop status bars, period filter, and route summary table
 */

import {
    Box, Card, Text, Group, Stack, SimpleGrid, Badge,
    Progress, Table, Divider, ThemeIcon, Tooltip,
    ActionIcon, RingProgress,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { SegmentedControl } from '@mantine/core'
import {
    TbCalendar, TbRoute, TbSearch, TbTrash,
    TbAlertTriangle, TbMapPin,
} from 'react-icons/tb'
import type { MessengerRoute } from '../../services/messengerRouteService'
import { statusConfig } from './constants'

interface DashboardStats {
    totalDistance: number
    totalStops: number
    completedStopsCount: number
    failedStopsCount: number
    pendingStopsCount: number
    routesByStatus: { planned: number; in_progress: number; completed: number }
    totalRoutes: number
    routeStatusSections: { value: number; color: string; tooltip?: string }[]
    stopCompletionPct: number
    stopFailedPct: number
    stopPendingPct: number
}

interface DashboardTabProps {
    filteredRoutes: MessengerRoute[]
    dashboardStats: DashboardStats
    periodLabel: string
    dashboardPeriod: string
    setDashboardPeriod: (v: string) => void
    customDateStart: Date | null
    setCustomDateStart: (v: Date | null) => void
    customDateEnd: Date | null
    setCustomDateEnd: (v: Date | null) => void
    onViewDetail: (id: string) => void
    onDelete: (id: string) => void
}

export default function DashboardTab({
    filteredRoutes,
    dashboardStats,
    periodLabel,
    dashboardPeriod,
    setDashboardPeriod,
    customDateStart,
    setCustomDateStart,
    customDateEnd,
    setCustomDateEnd,
    onViewDetail,
    onDelete,
}: DashboardTabProps) {
    return (
        <Stack gap="lg">
            {/* Period Filter */}
            <Card withBorder radius="md" p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)' }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                    <Group gap="sm">
                        <ThemeIcon size={32} radius="md" variant="light" color="indigo">
                            <TbCalendar size={18} />
                        </ThemeIcon>
                        <div>
                            <Text size="xs" c="dimmed" fw={500}>ช่วงเวลา</Text>
                            <Text size="sm" fw={600}>{periodLabel}</Text>
                        </div>
                    </Group>
                    <SegmentedControl
                        value={dashboardPeriod}
                        onChange={setDashboardPeriod}
                        data={[
                            { label: '📅 รายวัน', value: 'daily' },
                            { label: '📆 รายสัปดาห์', value: 'weekly' },
                            { label: '🗓️ รายเดือน', value: 'monthly' },
                            { label: '📋 ทั้งหมด', value: 'all' },
                            { label: '🔍 กำหนดเอง', value: 'custom' },
                        ]}
                        radius="lg"
                        size="sm"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                    />
                </Group>
                {dashboardPeriod === 'custom' && (
                    <Group gap="md" mt="sm">
                        <DateInput
                            label="วันเริ่มต้น"
                            placeholder="เลือกวันที่"
                            value={customDateStart}
                            onChange={setCustomDateStart}
                            size="sm"
                            radius="md"
                            clearable
                            maxDate={customDateEnd || undefined}
                            valueFormat="DD MMM YYYY"
                            style={{ flex: 1, minWidth: 160 }}
                        />
                        <Text size="sm" c="dimmed" mt={24}>ถึง</Text>
                        <DateInput
                            label="วันสิ้นสุด"
                            placeholder="เลือกวันที่"
                            value={customDateEnd}
                            onChange={setCustomDateEnd}
                            size="sm"
                            radius="md"
                            clearable
                            minDate={customDateStart || undefined}
                            valueFormat="DD MMM YYYY"
                            style={{ flex: 1, minWidth: 160 }}
                        />
                    </Group>
                )}
            </Card>

            {/* Charts Row */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Route Status Donut Chart */}
                <Card withBorder radius="md" p="lg">
                    <Text fw={700} size="md" mb="md">📊 สถานะเส้นทาง</Text>
                    <Group justify="center" align="center" gap="xl">
                        <RingProgress
                            size={160}
                            thickness={18}
                            roundCaps
                            sections={dashboardStats.routeStatusSections}
                            label={
                                <Stack align="center" gap={0}>
                                    <Text ta="center" size="xl" fw={800}>{dashboardStats.totalRoutes}</Text>
                                    <Text ta="center" size="xs" c="dimmed">เส้นทาง</Text>
                                </Stack>
                            }
                        />
                        <Stack gap="xs">
                            <Group gap="xs">
                                <Box style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#40c057' }} />
                                <Text size="sm">เสร็จสิ้น</Text>
                                <Text size="sm" fw={700} c="green">{dashboardStats.routesByStatus.completed}</Text>
                            </Group>
                            <Group gap="xs">
                                <Box style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#fab005' }} />
                                <Text size="sm">กำลังวิ่ง</Text>
                                <Text size="sm" fw={700} c="yellow.8">{dashboardStats.routesByStatus.in_progress}</Text>
                            </Group>
                            <Group gap="xs">
                                <Box style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ff922b' }} />
                                <Text size="sm">วางแผน</Text>
                                <Text size="sm" fw={700} c="orange">{dashboardStats.routesByStatus.planned}</Text>
                            </Group>
                        </Stack>
                    </Group>
                </Card>

                {/* Stop Status Bar Chart */}
                <Card withBorder radius="md" p="lg">
                    <Text fw={700} size="md" mb="md">📍 สรุปจุดแวะทั้งหมด</Text>
                    <Stack gap="md">
                        <Group justify="center" gap="xl" mb="xs">
                            <Stack align="center" gap={2}>
                                <Text size="2rem" fw={800} c="teal">{dashboardStats.completedStopsCount}</Text>
                                <Text size="xs" c="dimmed">สำเร็จ</Text>
                            </Stack>
                            <Stack align="center" gap={2}>
                                <Text size="2rem" fw={800} c="red">{dashboardStats.failedStopsCount}</Text>
                                <Text size="xs" c="dimmed">ไม่สำเร็จ</Text>
                            </Stack>
                            <Stack align="center" gap={2}>
                                <Text size="2rem" fw={800} c="gray">{dashboardStats.pendingStopsCount}</Text>
                                <Text size="xs" c="dimmed">รอดำเนินการ</Text>
                            </Stack>
                        </Group>

                        <div>
                            <Group justify="space-between" mb={4}>
                                <Text size="xs" c="dimmed">สำเร็จ</Text>
                                <Text size="xs" fw={600} c="teal">{dashboardStats.stopCompletionPct}%</Text>
                            </Group>
                            <Progress value={dashboardStats.stopCompletionPct} color="teal" size="lg" radius="xl" />
                        </div>
                        <div>
                            <Group justify="space-between" mb={4}>
                                <Text size="xs" c="dimmed">ไม่สำเร็จ</Text>
                                <Text size="xs" fw={600} c="red">{dashboardStats.stopFailedPct}%</Text>
                            </Group>
                            <Progress value={dashboardStats.stopFailedPct} color="red" size="lg" radius="xl" />
                        </div>
                        <div>
                            <Group justify="space-between" mb={4}>
                                <Text size="xs" c="dimmed">รอดำเนินการ</Text>
                                <Text size="xs" fw={600} c="gray">{dashboardStats.stopPendingPct}%</Text>
                            </Group>
                            <Progress value={dashboardStats.stopPendingPct} color="gray" size="lg" radius="xl" />
                        </div>

                        <Divider />
                        <Group justify="center">
                            <Text size="sm" c="dimmed">จุดแวะทั้งหมด: <Text span fw={700}>{dashboardStats.totalStops}</Text> จุด</Text>
                        </Group>
                    </Stack>
                </Card>
            </SimpleGrid>

            {/* Route Summary Table */}
            <Card withBorder radius="md" p="lg">
                <Group justify="space-between" mb="md">
                    <Text fw={700} size="md">🗂️ ตารางสรุปเส้นทาง — {periodLabel}</Text>
                    <Badge size="sm" variant="light" color="indigo">{filteredRoutes.length} เส้นทาง</Badge>
                </Group>
                {filteredRoutes.length === 0 ? (
                    <Stack align="center" gap="md" py="xl">
                        <TbRoute size={48} color="#ccc" />
                        <Text c="dimmed" ta="center">ไม่มีข้อมูลเส้นทางในช่วงเวลานี้</Text>
                    </Stack>
                ) : (
                    <Table.ScrollContainer minWidth={800}>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <Table.Th style={{ width: 40 }}>#</Table.Th>
                                    <Table.Th>วันที่</Table.Th>
                                    <Table.Th>จุดเริ่มต้น</Table.Th>
                                    <Table.Th ta="center">จุดแวะ</Table.Th>
                                    <Table.Th ta="center">สำเร็จ / ทั้งหมด</Table.Th>
                                    <Table.Th ta="right">ระยะทาง</Table.Th>
                                    <Table.Th ta="center">ความคืบหน้า</Table.Th>
                                    <Table.Th ta="center">สถานะ</Table.Th>
                                    <Table.Th ta="center">จัดการ</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredRoutes.map((route, idx) => {
                                    const st = statusConfig[route.status] || statusConfig.planned
                                    const ts = Number(route.total_stops) || 0
                                    const cs = Number(route.completed_stops) || 0
                                    const fs = Number(route.failed_stops) || 0
                                    const pct = ts > 0 ? Math.round((cs / ts) * 100) : 0
                                    return (
                                        <Table.Tr key={route.id} style={{ cursor: 'pointer' }} onClick={() => onViewDetail(route.id)}>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">{idx + 1}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={600}>
                                                    {new Date(route.route_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    <TbMapPin size={14} color="#868e96" />
                                                    <Text size="sm">{route.start_location || '-'}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Badge size="sm" variant="light" color="gray">{ts}</Badge>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Group gap={4} justify="center">
                                                    <Text size="sm" fw={600} c={fs > 0 ? 'red' : 'green'}>
                                                        {cs}/{ts}
                                                    </Text>
                                                    {fs > 0 && (
                                                        <Tooltip label={`${fs} จุดไม่สำเร็จ`}>
                                                            <ThemeIcon size={16} variant="transparent" color="red">
                                                                <TbAlertTriangle size={14} />
                                                            </ThemeIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Text size="sm" fw={500}>{Number(route.total_distance).toFixed(1)} km</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Tooltip label={`${pct}%`}>
                                                    <Progress
                                                        value={pct}
                                                        size="sm"
                                                        radius="xl"
                                                        color={pct === 100 ? 'green' : pct > 0 ? 'blue' : 'gray'}
                                                        style={{ minWidth: 80 }}
                                                    />
                                                </Tooltip>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Badge size="sm" variant="light" color={st.color}>{st.label}</Badge>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Group gap={4} justify="center">
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
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Card>
        </Stack>
    )
}
