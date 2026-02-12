import { useState, useMemo, useEffect, useRef } from 'react'
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Group,
    Stack,
    Table,
    Badge,
    TextInput,
    Select,
    Pagination,
    ActionIcon,
    Tooltip,
    Avatar,
    Skeleton,
    Box,
    Paper,
    Checkbox,
    Button,
    Modal,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
    TbLogin,
    TbUserCheck,
    TbClock,
    TbSearch,
    TbRefresh,
    TbShieldCheck,
    TbShieldX,
    TbPoint,
    TbTrash,
    TbTrashX,
    TbAlertTriangle,
    TbChevronDown,
    TbChevronUp,
    TbArrowsSort,
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import {
    loginActivityService,
    type LoginStats,
    type LoginAttempt,
    type OnlineUser,
    type ChartDataPoint,
    type SessionSummary,
    type SessionHistoryUser,
} from '../services/loginActivityService'

/* ─────────────── Failure Reason Labels ─────────────── */
const failureReasonLabels: Record<string, string> = {
    invalid_password: 'รหัสผ่านไม่ถูกต้อง',
    user_not_found: 'ไม่พบผู้ใช้',
    account_locked: 'บัญชีถูกล็อค',
    account_inactive: 'บัญชีไม่ได้ใช้งาน',
    invalid_username_format: 'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง',
    invalid_password_format: 'รูปแบบรหัสผ่านไม่ถูกต้อง',
}

/* ─────────────── IP Address Monitoring ─────────────── */
const KNOWN_INTERNAL_IPS = ['171.7.95.152', '110.169.43.81', '127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']

function isInternalIP(ip: string | null | undefined): boolean {
    if (!ip) return false
    return KNOWN_INTERNAL_IPS.includes(ip)
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({
    label,
    value,
    icon: Icon,
    color,
    subtitle,
    loading,
}: {
    label: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    subtitle?: string
    loading?: boolean
}) {
    return (
        <Card
            padding="lg"
            radius="xl"
            withBorder
            style={{
                borderColor: `var(--mantine-color-${color}-2)`,
                transition: 'all 0.2s ease',
            }}
        >
            <Group justify="space-between">
                <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        {label}
                    </Text>
                    {loading ? (
                        <Skeleton height={32} mt="xs" width={80} />
                    ) : (
                        <Text size="xl" fw={700} mt="xs" c={color}>
                            {value}
                        </Text>
                    )}
                    {subtitle && (
                        <Text size="xs" c="dimmed" mt={4}>
                            {subtitle}
                        </Text>
                    )}
                </div>
                <Box
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: `var(--mantine-color-${color}-0)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon size={28} color={`var(--mantine-color-${color}-6)`} />
                </Box>
            </Group>
        </Card>
    )
}

/* ─────────────── Mini Bar Chart (SVG) ─────────────── */
function LoginChart({ data, loading }: { data: ChartDataPoint[]; loading: boolean }) {
    if (loading) {
        return (
            <Card padding="lg" radius="xl" withBorder>
                <Text size="sm" fw={600} mb="md">
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Skeleton height={200} />
            </Card>
        )
    }

    if (!data || data.length === 0) {
        return (
            <Card padding="lg" radius="xl" withBorder>
                <Text size="sm" fw={600} mb="md">
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Box style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text c="dimmed" size="sm">
                        ไม่มีข้อมูล
                    </Text>
                </Box>
            </Card>
        )
    }

    const maxVal = Math.max(...data.map((d) => d.total_count), 1)
    const chartHeight = 200
    const paddingX = 40
    const paddingTop = 10
    const paddingBottom = 30
    const viewBoxW = 500
    const viewBoxH = chartHeight + paddingTop + paddingBottom
    const barAreaW = viewBoxW - paddingX * 2
    const barGroupW = barAreaW / data.length
    const barW = barGroupW * 0.35
    const gapBetween = 3

    return (
        <Card padding="lg" radius="xl" withBorder>
            <Group justify="space-between" mb="md">
                <Text size="sm" fw={600}>
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Group gap="md">
                    <Group gap={4}>
                        <Box style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--mantine-color-green-6)' }} />
                        <Text size="xs" c="dimmed">สำเร็จ</Text>
                    </Group>
                    <Group gap={4}>
                        <Box style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--mantine-color-red-5)' }} />
                        <Text size="xs" c="dimmed">ล้มเหลว</Text>
                    </Group>
                </Group>
            </Group>

            <svg width="100%" viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} style={{ overflow: 'visible' }}>
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const yy = paddingTop + chartHeight - frac * chartHeight
                    const val = Math.round(maxVal * frac)
                    return (
                        <g key={frac}>
                            <line x1={paddingX} y1={yy} x2={viewBoxW - paddingX} y2={yy} stroke="#e9ecef" strokeWidth={0.5} />
                            <text x={paddingX - 6} y={yy + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{val}</text>
                        </g>
                    )
                })}

                {data.map((d, i) => {
                    const cx = paddingX + i * barGroupW + barGroupW / 2
                    const sH = (d.success_count / maxVal) * chartHeight
                    const fH = (d.failed_count / maxVal) * chartHeight

                    const dayLabel = new Date(d.date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                    })

                    return (
                        <g key={i}>
                            {/* Success bar */}
                            <rect
                                x={cx - barW - gapBetween / 2}
                                y={paddingTop + chartHeight - sH}
                                width={barW}
                                height={sH}
                                rx={3}
                                fill="var(--mantine-color-green-6)"
                                opacity={0.85}
                            />
                            {/* Success count label */}
                            {d.success_count > 0 && (
                                <text
                                    x={cx - gapBetween / 2 - barW / 2}
                                    y={paddingTop + chartHeight - sH - 4}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="var(--mantine-color-green-7)"
                                    fontWeight={600}
                                >
                                    {d.success_count}
                                </text>
                            )}
                            {/* Fail bar */}
                            <rect
                                x={cx + gapBetween / 2}
                                y={paddingTop + chartHeight - fH}
                                width={barW}
                                height={fH}
                                rx={3}
                                fill="var(--mantine-color-red-5)"
                                opacity={0.85}
                            />
                            {/* Fail count label */}
                            {d.failed_count > 0 && (
                                <text
                                    x={cx + gapBetween / 2 + barW / 2}
                                    y={paddingTop + chartHeight - fH - 4}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="var(--mantine-color-red-6)"
                                    fontWeight={600}
                                >
                                    {d.failed_count}
                                </text>
                            )}
                            {/* Day label */}
                            <text
                                x={cx}
                                y={paddingTop + chartHeight + 18}
                                textAnchor="middle"
                                fontSize={11}
                                fill="#868e96"
                            >
                                {dayLabel}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </Card>
    )
}

/* ─────────────── Online User Card (EmployeeStatusCard style) ─────────────── */
function OnlineUserCard({ user }: { user: OnlineUser }) {
    const durationLabel =
        user.session_duration_minutes < 60
            ? `${user.session_duration_minutes} นาที`
            : `${Math.floor(user.session_duration_minutes / 60)} ชม. ${user.session_duration_minutes % 60} น.`

    return (
        <Tooltip
            label={`${user.nick_name || user.user_name || user.username} — ออนไลน์ ${durationLabel}`}
            withArrow
        >
            <Paper
                p="xs"
                radius="md"
                shadow="xs"
                style={{
                    border: '2px solid var(--mantine-color-green-6)',
                    backgroundColor: '#fff',
                    cursor: 'default',
                    transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    ; (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                    ; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                }}
            >
                <Group gap={6} wrap="nowrap">
                    <Box style={{ position: 'relative' }}>
                        <Avatar
                            size={28}
                            radius="xl"
                            color="green"
                        >
                            {(user.nick_name || user.user_name || user.username)
                                ?.charAt(0)
                                .toUpperCase()}
                        </Avatar>
                        <TbPoint
                            size={12}
                            color="#40c057"
                            fill="#40c057"
                            style={{
                                position: 'absolute',
                                bottom: -1,
                                right: -1,
                            }}
                        />
                    </Box>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <Text size="xs" fw={600} truncate>
                            {user.nick_name || user.user_name || user.username}
                        </Text>
                        <Badge
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<TbUserCheck size={10} />}
                        >
                            {durationLabel}
                        </Badge>
                    </div>
                </Group>
            </Paper>
        </Tooltip>
    )
}

/* ─────────────── Online Users Section (Grid layout) ─────────────── */
function OnlineUsersSection({
    users,
    loading,
}: {
    users: OnlineUser[]
    loading: boolean
}) {
    if (loading) {
        return (
            <Card shadow="sm" radius="lg" padding="md" withBorder>
                <Group gap="xs" mb="md">
                    <Text fw={700} size="sm">ผู้ใช้ออนไลน์</Text>
                </Group>
                <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }} spacing="xs">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} height={50} radius="md" />
                    ))}
                </SimpleGrid>
            </Card>
        )
    }

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group gap="xs" mb="md">
                <Text fw={700} size="sm">ผู้ใช้ออนไลน์</Text>
                <Text size="xs" c="dimmed">({users.length} คน)</Text>
            </Group>

            {users.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีผู้ใช้ออนไลน์ในขณะนี้
                </Text>
            ) : (
                <SimpleGrid
                    cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 7 }}
                    spacing="xs"
                >
                    {users.map((user) => (
                        <OnlineUserCard key={user.user_id} user={user} />
                    ))}
                </SimpleGrid>
            )}
        </Card>
    )
}

/* ─────────────── Format Duration ─────────────── */
function formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return '0 นาที'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h} ชม. ${m} นาที`
    return `${m} นาที`
}

/* ─────────────── Session Summary Section ─────────────── */
function SessionSummarySection() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const dateStr = selectedDate
        ? selectedDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const { data: summaryData, isLoading } = useQuery(
        ['login-activity', 'session-summary', dateStr],
        () => loginActivityService.getSessionSummary(dateStr),
        { staleTime: 30_000, retry: 1 }
    )

    const summary = summaryData?.summary || []

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <TbClock size={18} color="var(--mantine-color-blue-6)" />
                    <Text fw={700} size="sm">สรุปเวลาใช้งานรายวัน</Text>
                    <Text size="xs" c="dimmed">({summary.length} คน)</Text>
                </Group>
                <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="เลือกวันที่"
                    size="xs"
                    radius="xl"
                    maxDate={new Date()}
                    valueFormat="DD/MM/YYYY"
                    style={{ width: 160 }}
                    clearable={false}
                />
            </Group>

            {isLoading ? (
                <Stack gap="xs">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={40} radius="md" />)}
                </Stack>
            ) : summary.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีข้อมูล session ในวันที่เลือก
                </Text>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>พนักงาน</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>Sessions</Table.Th>
                            <Table.Th>เวลาใช้งานรวม</Table.Th>
                            <Table.Th>Login แรก</Table.Th>
                            <Table.Th>Active ล่าสุด</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {summary.map((s: SessionSummary) => (
                            <Table.Tr key={s.user_id || s.username}>
                                <Table.Td>
                                    <Group gap="xs">
                                        <Avatar size={28} radius="xl" color="blue">
                                            {(s.nick_name || s.user_name || s.username)?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {s.nick_name || s.user_name || s.username}
                                            </Text>
                                            {(s.nick_name || s.user_name) && (
                                                <Text size="xs" c="dimmed">@{s.username}</Text>
                                            )}
                                        </div>
                                    </Group>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                    <Badge size="sm" variant="light" color="blue">{s.session_count}</Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={600} c={s.total_minutes >= 60 ? 'green' : 'orange'}>
                                        {formatDuration(s.total_minutes)}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{formatTimeOnly(s.first_login)}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{formatTimeOnly(s.last_activity)}</Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                    {s.is_online ? (
                                        <Badge size="sm" variant="filled" color="green">ออนไลน์</Badge>
                                    ) : (
                                        <Badge size="sm" variant="light" color="gray">ออฟไลน์</Badge>
                                    )}
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Card>
    )
}

/* ─────────────── Format Time Only ─────────────── */
function formatTimeOnly(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

/* ─────────────── Session Status Label ─────────────── */
const sessionStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: 'กำลังใช้งาน', color: 'green' },
    logged_out: { label: 'ออกจากระบบ', color: 'blue' },
    expired: { label: 'หมดเวลา', color: 'orange' },
}

/* ─────────────── Session History Section ─────────────── */
function SessionHistorySection() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const [expandedUser, setExpandedUser] = useState<string | null>(null)
    const dateStr = selectedDate
        ? selectedDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const { data: historyData, isLoading } = useQuery(
        ['login-activity', 'session-history', dateStr],
        () => loginActivityService.getSessionHistory(dateStr),
        { staleTime: 30_000, retry: 1 }
    )

    const users = historyData?.users || []

    const toggleUser = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId)
    }

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <TbLogin size={18} color="var(--mantine-color-violet-6)" />
                    <Text fw={700} size="sm">ประวัติ Login / Logout รายบุคคล</Text>
                    <Text size="xs" c="dimmed">
                        ({historyData?.totalSessions || 0} sessions)
                    </Text>
                </Group>
                <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="เลือกวันที่"
                    size="xs"
                    radius="xl"
                    maxDate={new Date()}
                    valueFormat="DD/MM/YYYY"
                    style={{ width: 160 }}
                    clearable={false}
                />
            </Group>

            {isLoading ? (
                <Stack gap="xs">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius="md" />)}
                </Stack>
            ) : users.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีข้อมูล session ในวันที่เลือก
                </Text>
            ) : (
                <Stack gap="xs">
                    {users.map((user: SessionHistoryUser) => {
                        const userId = user.user_id || user.username
                        const isExpanded = expandedUser === userId
                        const totalMin = user.sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

                        return (
                            <Paper
                                key={userId}
                                radius="md"
                                withBorder
                                style={{ overflow: 'hidden' }}
                            >
                                {/* User Row — clickable */}
                                <Box
                                    p="sm"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: isExpanded
                                            ? 'var(--mantine-color-violet-0)'
                                            : undefined,
                                    }}
                                    onClick={() => toggleUser(userId)}
                                >
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <Avatar size={30} radius="xl" color="violet">
                                                {(user.nick_name || user.user_name || user.username)?.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <div>
                                                <Text size="sm" fw={600}>
                                                    {user.nick_name || user.user_name || user.username}
                                                </Text>
                                                {(user.nick_name || user.user_name) && (
                                                    <Text size="xs" c="dimmed">@{user.username}</Text>
                                                )}
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            <Badge size="sm" variant="light" color="violet">
                                                {user.sessions.length} รายการ
                                            </Badge>
                                            <Badge size="sm" variant="light" color="gray">
                                                {formatDuration(totalMin)}
                                            </Badge>
                                            {isExpanded ? <TbChevronUp size={16} /> : <TbChevronDown size={16} />}
                                        </Group>
                                    </Group>
                                </Box>

                                {/* Expanded Sessions */}
                                {isExpanded && (
                                    <Box px="sm" pb="sm">
                                        <Table striped highlightOnHover>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Login</Table.Th>
                                                    <Table.Th>Logout</Table.Th>
                                                    <Table.Th>ระยะเวลา</Table.Th>
                                                    <Table.Th>สถานะ</Table.Th>
                                                    <Table.Th>IP</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {user.sessions.map((s) => {
                                                    const statusInfo = sessionStatusMap[s.session_status] || { label: s.session_status, color: 'gray' }
                                                    return (
                                                        <Table.Tr key={s.session_id}>
                                                            <Table.Td>
                                                                <Text size="xs" fw={500}>
                                                                    {formatTimeOnly(s.login_at)}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" c={s.logout_at ? undefined : 'dimmed'}>
                                                                    {s.logout_at ? formatTimeOnly(s.logout_at) : '—'}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" fw={500}>
                                                                    {formatDuration(s.duration_minutes)}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge
                                                                    size="xs"
                                                                    variant={s.session_status === 'active' ? 'filled' : 'light'}
                                                                    color={statusInfo.color}
                                                                >
                                                                    {statusInfo.label}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" c="dimmed">
                                                                    {s.ip_address || '—'}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    )
                                                })}
                                            </Table.Tbody>
                                        </Table>
                                    </Box>
                                )}
                            </Paper>
                        )
                    })}
                </Stack>
            )}
        </Card>
    )
}

/* ─────────────── Format DateTime ─────────────── */
function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/* ─────────────── Main Page ─────────────── */
export default function LoginActivity() {
    const [page, setPage] = useState(1)
    const [searchUsername, setSearchUsername] = useState('')
    const [filterSuccess, setFilterSuccess] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [deleteModalType, setDeleteModalType] = useState<'single' | 'selected' | 'all' | null>(null)
    const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [externalIpModalOpen, setExternalIpModalOpen] = useState(false)
    const [externalIpAlerted, setExternalIpAlerted] = useState(false)
    const [limit, setLimit] = useState(15)
    const [sortBy, setSortBy] = useState<string>('attempted_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(column)
            setSortOrder('desc')
        }
        setPage(1)
    }

    const queryClient = useQueryClient()

    // Fetch stats
    const {
        data: stats,
        isLoading: loadingStats,
        refetch: refetchStats,
    } = useQuery<LoginStats>(['login-activity', 'stats'], () => loginActivityService.getStats(), {
        staleTime: 30_000,
        retry: 1,
    })

    // Fetch chart data
    const { data: chartData, isLoading: loadingChart } = useQuery<ChartDataPoint[]>(
        ['login-activity', 'chart'],
        () => loginActivityService.getChartData(7),
        { staleTime: 60_000, retry: 1 }
    )

    // Fetch online users
    const {
        data: onlineData,
        isLoading: loadingOnline,
        refetch: refetchOnline,
    } = useQuery(['login-activity', 'online-users'], () => loginActivityService.getOnlineUsers(), {
        staleTime: 30_000,
        retry: 1,
        refetchInterval: 60_000,
    })

    // Fetch attempts
    const { data: attemptsData, isLoading: loadingAttempts } = useQuery(
        ['login-activity', 'attempts', page, limit, searchUsername, filterSuccess, sortBy, sortOrder],
        () =>
            loginActivityService.getAttempts({
                page,
                limit,
                username: searchUsername || undefined,
                success: filterSuccess || undefined,
                sortBy,
                sortOrder,
            }),
        { staleTime: 15_000, retry: 1, keepPreviousData: true }
    )

    const handleRefresh = () => {
        refetchStats()
        refetchOnline()
    }

    // Fetch external IP attempts — ทั้งหมด (สำหรับ card เฝ้าระวัง)
    const { data: externalIpData } = useQuery(
        ['login-activity', 'external-ips', 'all'],
        () => loginActivityService.getExternalIpAttempts(),
        { staleTime: 30_000, retry: 1 }
    )

    // Fetch external IP attempts — วันนี้เท่านั้น (สำหรับ popup แจ้งเตือน)
    const { data: externalIpTodayData } = useQuery(
        ['login-activity', 'external-ips', 'today'],
        () => loginActivityService.getExternalIpAttempts(true),
        { staleTime: 30_000, retry: 1 }
    )

    const externalAttempts = externalIpData?.attempts || []
    const externalAttemptsToday = externalIpTodayData?.attempts || []
    const [showAllExternal, setShowAllExternal] = useState(false)

    // Auto-popup when TODAY's external IPs detected
    useEffect(() => {
        if (externalAttemptsToday.length > 0 && !externalIpAlerted) {
            setExternalIpModalOpen(true)
            setExternalIpAlerted(true)
        }
    }, [externalAttemptsToday, externalIpAlerted])

    const successRate = useMemo(() => {
        if (!stats) return '–'
        const total = stats.loginToday + stats.failedToday
        if (total === 0) return '0%'
        return Math.round((stats.loginToday / total) * 100) + '%'
    }, [stats])

    const avgDurationLabel = useMemo(() => {
        if (!stats || !stats.avgSessionMinutes) return '–'
        const mins = stats.avgSessionMinutes
        if (mins < 60) return `${mins} นาที`
        const hrs = Math.floor(mins / 60)
        const remMins = mins % 60
        return `${hrs} ชม. ${remMins} นาที`
    }, [stats])

    // Selection handlers
    const toggleSelectId = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleSelectAll = () => {
        if (!attemptsData?.attempts) return
        const currentPageIds = attemptsData.attempts.map((a) => a.id)
        const allSelected = currentPageIds.every((id) => selectedIds.has(id))
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (allSelected) {
                currentPageIds.forEach((id) => next.delete(id))
            } else {
                currentPageIds.forEach((id) => next.add(id))
            }
            return next
        })
    }

    const isAllSelected =
        attemptsData?.attempts &&
        attemptsData.attempts.length > 0 &&
        attemptsData.attempts.every((a) => selectedIds.has(a.id))

    // ── Track locally deleted items for instant UI removal ──
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    // Reset deletedIds เมื่อ data ถูก refetch ใหม่จาก server
    const attemptsDataRef = useRef(attemptsData)
    useEffect(() => {
        if (attemptsData && attemptsData !== attemptsDataRef.current) {
            attemptsDataRef.current = attemptsData
            setDeletedIds(new Set())
        }
    }, [attemptsData])

    // Filter attempts ที่แสดงใน UI (ซ่อนรายการที่ลบไปแล้ว)
    const visibleAttempts = useMemo(() => {
        if (!attemptsData?.attempts) return []
        if (deletedIds.size === 0) return attemptsData.attempts
        return attemptsData.attempts.filter((a: LoginAttempt) => !deletedIds.has(a.id))
    }, [attemptsData, deletedIds])

    // Delete handlers
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return
        const idsToDelete = Array.from(selectedIds)
        // ซ่อนจาก UI ทันที
        setDeletedIds(prev => {
            const next = new Set(prev)
            idsToDelete.forEach(id => next.add(id))
            return next
        })
        setSelectedIds(new Set())
        setDeleteModalType(null)
        try {
            await loginActivityService.deleteAttempts(idsToDelete)
        } catch (error) {
            console.error('Error deleting attempts:', error)
        }
        queryClient.invalidateQueries(['login-activity'])
    }

    const handleDeleteAll = async () => {
        setSelectedIds(new Set())
        setDeleteModalType(null)
        setPage(1)
        try {
            await loginActivityService.deleteAllAttempts()
        } catch (error) {
            console.error('Error deleting all attempts:', error)
        }
        queryClient.invalidateQueries(['login-activity'])
    }

    const handleDeleteSingle = async () => {
        if (!singleDeleteId) return
        const idToDelete = singleDeleteId
        // ซ่อนจาก UI ทันที
        setDeletedIds(prev => new Set(prev).add(idToDelete))
        setSingleDeleteId(null)
        setDeleteModalType(null)
        try {
            await loginActivityService.deleteAttempt(idToDelete)
        } catch (error) {
            console.error('Error deleting attempt:', error)
        }
        queryClient.invalidateQueries(['login-activity'])
    }

    return (
        <>
            {/* Delete Confirmation Modal */}
            <Modal
                opened={deleteModalType !== null}
                onClose={() => setDeleteModalType(null)}
                title={
                    <Group gap="xs">
                        <TbTrashX size={20} color="var(--mantine-color-red-6)" />
                        <Text fw={600}>ยืนยันการลบ</Text>
                    </Group>
                }
                centered
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm">
                        {deleteModalType === 'single'
                            ? 'คุณต้องการลบรายการนี้ใช่หรือไม่?'
                            : deleteModalType === 'selected'
                                ? `คุณต้องการลบรายการที่เลือก ${selectedIds.size} รายการ ใช่หรือไม่?`
                                : `คุณต้องการลบรายการ Login Attempts ทั้งหมด (${attemptsData?.pagination.total ?? 0} รายการ) ใช่หรือไม่?`
                        }
                    </Text>
                    <Text size="xs" c="red">
                        ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setDeleteModalType(null)}
                            disabled={deleting}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="red"
                            size="sm"
                            leftSection={<TbTrash size={16} />}
                            loading={deleting}
                            onClick={
                                deleteModalType === 'single'
                                    ? handleDeleteSingle
                                    : deleteModalType === 'selected' ? handleDeleteSelected : handleDeleteAll
                            }
                        >
                            {deleteModalType === 'single' ? 'ลบรายการ' : deleteModalType === 'selected' ? `ลบ ${selectedIds.size} รายการ` : 'ลบทั้งหมด'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* External IP Alert Modal — auto-popup (วันนี้เท่านั้น) */}
            <Modal
                opened={externalIpModalOpen}
                onClose={() => setExternalIpModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbAlertTriangle size={22} color="var(--mantine-color-red-6)" />
                        <Text fw={700} c="red">⚠ พบการเข้าสู่ระบบจาก IP ภายนอก! (วันนี้)</Text>
                    </Group>
                }
                centered
                size="lg"
                overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
                styles={{
                    header: {
                        backgroundColor: 'var(--mantine-color-red-0)',
                        borderBottom: '2px solid var(--mantine-color-red-3)',
                    },
                    body: {
                        backgroundColor: 'var(--mantine-color-red-0)',
                    },
                }}
            >
                <Stack gap="md">
                    <Text size="sm" c="red.8" fw={500}>
                        ตรวจพบ {externalAttemptsToday.length} รายการเข้าสู่ระบบจาก IP ภายนอกวันนี้:
                    </Text>

                    <Stack gap="xs">
                        {externalAttemptsToday.map((a) => (
                            <Paper
                                key={a.id}
                                p="sm"
                                radius="md"
                                style={{
                                    border: '1px solid var(--mantine-color-red-3)',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="sm" wrap="nowrap">
                                        <Avatar size={32} radius="xl" color="red">
                                            {(a.nick_name || a.user_name || a.username)?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={600}>
                                                {a.nick_name || a.user_name || a.username}
                                            </Text>
                                            <Text size="xs" c="dimmed">@{a.username}</Text>
                                        </div>
                                    </Group>
                                    <div style={{ textAlign: 'right' }}>
                                        <Badge size="sm" variant="filled" color="red">
                                            {a.ip_address}
                                        </Badge>

                                        <Text size="xs" c="dimmed" mt={2}>
                                            {formatDateTime(a.attempted_at)}
                                        </Text>
                                    </div>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>

                    <Group justify="flex-end">
                        <Button
                            color="red"
                            variant="light"
                            onClick={() => setExternalIpModalOpen(false)}
                        >
                            รับทราบ
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Container size="xl">
                <Stack gap="xl">
                    {/* Header */}
                    <Group justify="space-between">
                        <div>
                            <Title order={1} mb="xs">
                                ประวัติการเข้าสู่ระบบ
                            </Title>
                            <Text c="dimmed">ตรวจสอบการ Login/Logout และสถานะออนไลน์ของผู้ใช้</Text>
                        </div>
                        <Tooltip label="รีเฟรชข้อมูล">
                            <ActionIcon variant="light" color="orange" size="lg" radius="xl" onClick={handleRefresh}>
                                <TbRefresh size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>

                    {/* Summary Cards */}
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                        <StatCard
                            label="Login วันนี้"
                            value={stats?.loginToday ?? '–'}
                            icon={TbLogin}
                            color="green"
                            subtitle={`อัตราสำเร็จ ${successRate}`}
                            loading={loadingStats}
                        />
                        <StatCard
                            label="ล้มเหลววันนี้"
                            value={stats?.failedToday ?? '–'}
                            icon={TbShieldX}
                            color="red"
                            subtitle={`จาก ${(stats?.loginToday ?? 0) + (stats?.failedToday ?? 0)} พยายาม`}
                            loading={loadingStats}
                        />
                        <StatCard
                            label="ออนไลน์ตอนนี้"
                            value={onlineData?.count ?? stats?.onlineUsers ?? '–'}
                            icon={TbUserCheck}
                            color="blue"
                            subtitle={`${stats?.uniqueUsersToday ?? 0} users วันนี้`}
                            loading={loadingStats}
                        />
                        <StatCard
                            label="เวลาใช้งานเฉลี่ย"
                            value={avgDurationLabel}
                            icon={TbClock}
                            color="orange"
                            subtitle="Session เฉลี่ยวันนี้"
                            loading={loadingStats}
                        />
                    </SimpleGrid>

                    {/* Chart — full width */}
                    <LoginChart data={chartData || []} loading={loadingChart} />

                    {/* IP Monitoring Alert */}
                    <Card
                        padding="lg"
                        radius="xl"
                        withBorder
                        style={{
                            borderColor: externalAttempts.length > 0
                                ? 'var(--mantine-color-red-4)'
                                : 'var(--mantine-color-green-4)',
                            backgroundColor: externalAttempts.length > 0
                                ? 'var(--mantine-color-red-0)'
                                : 'var(--mantine-color-green-0)',
                        }}
                    >
                        <Group justify="space-between" mb="sm">
                            <Group gap="xs">
                                <TbShieldCheck
                                    size={20}
                                    color={
                                        externalAttempts.length > 0
                                            ? 'var(--mantine-color-red-6)'
                                            : 'var(--mantine-color-green-6)'
                                    }
                                />
                                <Text size="sm" fw={700}>
                                    เฝ้าระวัง IP Address
                                </Text>
                            </Group>
                            <Group gap="xs">
                                {externalAttempts.length > 8 && (
                                    <Button
                                        size="xs"
                                        variant="light"
                                        color="red"
                                        radius="xl"
                                        onClick={() => setShowAllExternal(!showAllExternal)}
                                    >
                                        {showAllExternal ? 'ย่อ' : `ดูทั้งหมด (${externalAttempts.length})`}
                                    </Button>
                                )}
                                <Badge
                                    size="sm"
                                    variant="filled"
                                    color={externalAttempts.length > 0 ? 'red' : 'green'}
                                >
                                    {externalAttempts.length > 0
                                        ? `⚠ พบ ${externalAttempts.length} การเข้าสู่ระบบจากภายนอก`
                                        : '✓ ปลอดภัย — เฉพาะ IP ภายใน'}
                                </Badge>
                            </Group>
                        </Group>

                        {externalAttempts.length > 0 ? (
                            <Stack gap="xs">
                                <Text size="xs" c="red.7" fw={500}>
                                    IP ที่ไม่ใช่ภายใน (ทั้งหมด {externalAttempts.length} รายการ):
                                </Text>
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="xs">
                                    {externalAttempts
                                        .slice(0, showAllExternal ? undefined : 8)
                                        .map((a) => (
                                            <Paper
                                                key={a.id}
                                                p="xs"
                                                radius="md"
                                                style={{
                                                    border: '1px solid var(--mantine-color-red-3)',
                                                    backgroundColor: '#fff',
                                                }}
                                            >
                                                <Group gap={6} wrap="nowrap">
                                                    <Avatar size={24} radius="xl" color="red">
                                                        {(a.nick_name || a.user_name || a.username)?.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <Text size="xs" fw={600} truncate>
                                                            {a.nick_name || a.user_name || a.username}
                                                        </Text>
                                                        <Group gap={4}>
                                                            <Text size="xs" c="red" fw={600}>
                                                                {a.ip_address}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                • {formatDateTime(a.attempted_at)}
                                                            </Text>
                                                        </Group>

                                                    </div>
                                                </Group>
                                            </Paper>
                                        ))}
                                </SimpleGrid>
                                {!showAllExternal && externalAttempts.length > 8 && (
                                    <Button
                                        size="xs"
                                        variant="subtle"
                                        color="red"
                                        onClick={() => setShowAllExternal(true)}
                                        fullWidth
                                    >
                                        แสดงอีก {externalAttempts.length - 8} รายการ...
                                    </Button>
                                )}
                            </Stack>
                        ) : (
                            <Text size="xs" c="green.7">
                                ทุกการเข้าสู่ระบบมาจาก IP ภายในที่อนุญาต ({KNOWN_INTERNAL_IPS.filter(ip => !ip.startsWith('::') && ip !== 'localhost').join(', ')})
                            </Text>
                        )}
                    </Card>

                    {/* Online Users — card grid style like OfficeAttendance */}
                    <OnlineUsersSection users={onlineData?.users || []} loading={loadingOnline} />

                    {/* ═══════ Session Summary — สรุปเวลาใช้งานรายวัน ═══════ */}
                    <SessionSummarySection />

                    {/* ═══════ Session History — ประวัติ Login/Logout ═══════ */}
                    <SessionHistorySection />

                    {/* Login Attempts Table */}
                    <Card padding="lg" radius="xl" withBorder>
                        <Group justify="space-between" mb="md">
                            <Text size="sm" fw={600}>
                                รายการ Login Attempts
                            </Text>
                            <Group gap="sm">
                                {/* Delete buttons */}
                                {selectedIds.size > 0 && (
                                    <Button
                                        variant="light"
                                        color="red"
                                        size="xs"
                                        radius="xl"
                                        leftSection={<TbTrash size={14} />}
                                        onClick={() => setDeleteModalType('selected')}
                                    >
                                        ลบที่เลือก ({selectedIds.size})
                                    </Button>
                                )}
                                <Button
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    radius="xl"
                                    leftSection={<TbTrashX size={14} />}
                                    onClick={() => setDeleteModalType('all')}
                                >
                                    ลบทั้งหมด
                                </Button>
                                <TextInput
                                    placeholder="ค้นหา username..."
                                    size="xs"
                                    radius="xl"
                                    leftSection={<TbSearch size={14} />}
                                    value={searchUsername}
                                    onChange={(e) => {
                                        setSearchUsername(e.target.value)
                                        setPage(1)
                                    }}
                                    style={{ width: 200 }}
                                />
                                <Select
                                    placeholder="ทั้งหมด"
                                    size="xs"
                                    radius="xl"
                                    clearable
                                    value={filterSuccess}
                                    onChange={(val) => {
                                        setFilterSuccess(val)
                                        setPage(1)
                                    }}
                                    data={[
                                        { value: 'true', label: 'สำเร็จ' },
                                        { value: 'false', label: 'ล้มเหลว' },
                                    ]}
                                    style={{ width: 120 }}
                                />
                            </Group>
                        </Group>

                        {loadingAttempts ? (
                            <Stack gap="xs">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} height={40} />
                                ))}
                            </Stack>
                        ) : (
                            <>
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th style={{ width: 40 }}>
                                                <Checkbox
                                                    size="xs"
                                                    checked={!!isAllSelected}
                                                    indeterminate={
                                                        selectedIds.size > 0 &&
                                                        !isAllSelected &&
                                                        attemptsData?.attempts?.some((a) => selectedIds.has(a.id))
                                                    }
                                                    onChange={toggleSelectAll}
                                                    aria-label="เลือกทั้งหมด"
                                                />
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('attempted_at')}
                                            >
                                                <Group gap={4} wrap="nowrap">
                                                    เวลา
                                                    {sortBy === 'attempted_at' ? (
                                                        sortOrder === 'asc' ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />
                                                    ) : (
                                                        <TbArrowsSort size={14} color="gray" />
                                                    )}
                                                </Group>
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('username')}
                                            >
                                                <Group gap={4} wrap="nowrap">
                                                    ผู้ใช้
                                                    {sortBy === 'username' ? (
                                                        sortOrder === 'asc' ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />
                                                    ) : (
                                                        <TbArrowsSort size={14} color="gray" />
                                                    )}
                                                </Group>
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('ip_address')}
                                            >
                                                <Group gap={4} wrap="nowrap">
                                                    IP Address
                                                    {sortBy === 'ip_address' ? (
                                                        sortOrder === 'asc' ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />
                                                    ) : (
                                                        <TbArrowsSort size={14} color="gray" />
                                                    )}
                                                </Group>
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('success')}
                                            >
                                                <Group gap={4} wrap="nowrap">
                                                    สถานะ
                                                    {sortBy === 'success' ? (
                                                        sortOrder === 'asc' ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />
                                                    ) : (
                                                        <TbArrowsSort size={14} color="gray" />
                                                    )}
                                                </Group>
                                            </Table.Th>
                                            <Table.Th>สาเหตุ</Table.Th>
                                            <Table.Th style={{ width: 50 }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {visibleAttempts.length === 0 ? (
                                            <Table.Tr>
                                                <Table.Td colSpan={7}>
                                                    <Text c="dimmed" ta="center" py="md">
                                                        ไม่พบข้อมูล
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ) : (
                                            visibleAttempts.map((attempt: LoginAttempt) => (
                                                <Table.Tr
                                                    key={attempt.id}
                                                    style={{
                                                        backgroundColor: selectedIds.has(attempt.id)
                                                            ? 'var(--mantine-color-red-0)'
                                                            : undefined,
                                                    }}
                                                >
                                                    <Table.Td>
                                                        <Checkbox
                                                            size="xs"
                                                            checked={selectedIds.has(attempt.id)}
                                                            onChange={() => toggleSelectId(attempt.id)}
                                                            aria-label={`เลือก ${attempt.username}`}
                                                        />
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs">{formatDateTime(attempt.attempted_at)}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Avatar size="xs" radius="xl" color="orange">
                                                                {attempt.username.charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={500}>
                                                                    {attempt.nick_name || attempt.user_name || attempt.username}
                                                                </Text>
                                                                {(attempt.nick_name || attempt.user_name) && (
                                                                    <Text size="xs" c="dimmed">
                                                                        @{attempt.username}
                                                                    </Text>
                                                                )}
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {attempt.ip_address ? (
                                                            isInternalIP(attempt.ip_address) ? (
                                                                <Group gap={4}>
                                                                    <Text size="xs" c="dimmed">
                                                                        {attempt.ip_address}
                                                                    </Text>
                                                                    <Badge size="xs" variant="light" color="green">
                                                                        ภายใน
                                                                    </Badge>
                                                                </Group>
                                                            ) : (
                                                                <Paper
                                                                    p={4}
                                                                    radius="sm"
                                                                    style={{
                                                                        backgroundColor: 'var(--mantine-color-red-0)',
                                                                        border: '1px solid var(--mantine-color-red-3)',
                                                                    }}
                                                                >
                                                                    <Group gap={4}>
                                                                        <Text size="xs" c="red" fw={600}>
                                                                            {attempt.ip_address}
                                                                        </Text>
                                                                        <Badge size="xs" variant="filled" color="red">
                                                                            ภายนอก
                                                                        </Badge>
                                                                    </Group>

                                                                </Paper>
                                                            )
                                                        ) : (
                                                            <Text size="xs" c="dimmed">–</Text>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {attempt.success ? (
                                                            <Badge
                                                                color="green"
                                                                variant="light"
                                                                size="sm"
                                                                leftSection={<TbShieldCheck size={12} />}
                                                            >
                                                                สำเร็จ
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                color="red"
                                                                variant="light"
                                                                size="sm"
                                                                leftSection={<TbShieldX size={12} />}
                                                            >
                                                                ล้มเหลว
                                                            </Badge>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" c="dimmed">
                                                            {attempt.failure_reason
                                                                ? failureReasonLabels[attempt.failure_reason] ||
                                                                attempt.failure_reason
                                                                : '–'}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Tooltip label="ลบรายการนี้">
                                                            <ActionIcon
                                                                variant="subtle"
                                                                color="red"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSingleDeleteId(attempt.id)
                                                                    setDeleteModalType('single')
                                                                }}
                                                            >
                                                                <TbTrash size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))
                                        )}
                                    </Table.Tbody>
                                </Table>

                                {/* Pagination & Per-page selector */}
                                {attemptsData && (
                                    <Group justify="space-between" mt="md" align="center">
                                        <Group gap="xs">
                                            <Text size="xs" c="dimmed">แสดง</Text>
                                            <Select
                                                size="xs"
                                                radius="xl"
                                                value={String(limit)}
                                                onChange={(val) => {
                                                    setLimit(Number(val) || 15)
                                                    setPage(1)
                                                }}
                                                data={[
                                                    { value: '15', label: '15' },
                                                    { value: '25', label: '25' },
                                                    { value: '50', label: '50' },
                                                    { value: '100', label: '100' },
                                                ]}
                                                style={{ width: 75 }}
                                            />
                                            <Text size="xs" c="dimmed">รายการ</Text>
                                        </Group>
                                        {attemptsData.pagination.totalPages > 1 && (
                                            <Pagination
                                                total={attemptsData.pagination.totalPages}
                                                value={page}
                                                onChange={setPage}
                                                size="sm"
                                                radius="xl"
                                                color="orange"
                                            />
                                        )}
                                        <Text size="xs" c="dimmed">
                                            ทั้งหมด {attemptsData.pagination.total} รายการ
                                        </Text>
                                    </Group>
                                )}
                            </>
                        )}
                    </Card>
                </Stack>
            </Container >
        </>
    )
}
