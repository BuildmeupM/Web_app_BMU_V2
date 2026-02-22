/**
 * LoginActivity — ประวัติการเข้าสู่ระบบ
 *
 * Sub-components extracted to src/components/LoginActivity/
 *   - constants.ts (helpers, labels, maps)
 *   - StatCard.tsx
 *   - LoginChart.tsx
 *   - OnlineUsersSection.tsx
 *   - SessionSummarySection.tsx
 *   - SessionHistorySection.tsx
 */

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
import {
    TbLogin,
    TbUserCheck,
    TbClock,
    TbSearch,
    TbRefresh,
    TbShieldCheck,
    TbShieldX,
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
    type ChartDataPoint,
} from '../services/loginActivityService'
import {
    failureReasonLabels,
    KNOWN_INTERNAL_IPS,
    isInternalIP,
    formatDateTime,
} from '../components/LoginActivity/constants'
import StatCard from '../components/LoginActivity/StatCard'
import LoginChart from '../components/LoginActivity/LoginChart'
import OnlineUsersSection from '../components/LoginActivity/OnlineUsersSection'
import SessionSummarySection from '../components/LoginActivity/SessionSummarySection'
import SessionHistorySection from '../components/LoginActivity/SessionHistorySection'
import './LoginActivity.css'

/* ═══════════════════════════════════════════════════
 *  Main Page
 * ═══════════════════════════════════════════════════ */

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

    // ─── Column resize ───
    const tableRef = useRef<HTMLTableElement>(null)
    const resizingCol = useRef<{ idx: number; startX: number; startW: number } | null>(null)

    const onResizeMouseDown = (e: React.MouseEvent, colIdx: number) => {
        e.preventDefault()
        const th = (e.target as HTMLElement).closest('th') as HTMLTableCellElement
        if (!th) return
        resizingCol.current = { idx: colIdx, startX: e.clientX, startW: th.offsetWidth }

        const onMove = (ev: MouseEvent) => {
            if (!resizingCol.current || !tableRef.current) return
            const delta = ev.clientX - resizingCol.current.startX
            const newW = Math.max(60, resizingCol.current.startW + delta)
            const ths = tableRef.current.querySelectorAll('thead th')
            const target = ths[resizingCol.current.idx] as HTMLElement
            if (target) {
                target.style.width = `${newW}px`
                target.style.minWidth = `${newW}px`
            }
        }
        const onUp = () => {
            resizingCol.current = null
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

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
                                <Table striped highlightOnHover ref={tableRef} style={{ tableLayout: 'fixed' }}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th style={{ width: 40, position: 'relative' }}>
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
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 0)} />
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
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
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 1)} />
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
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
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 2)} />
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
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
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 3)} />
                                            </Table.Th>
                                            <Table.Th
                                                style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
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
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 4)} />
                                            </Table.Th>
                                            <Table.Th style={{ position: 'relative' }}>
                                                สาเหตุ
                                                <span className="ald-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 5)} />
                                            </Table.Th>
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
                                                        <Text size="xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDateTime(attempt.attempted_at)}</Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <Group gap="xs" wrap="nowrap">
                                                            <Avatar size="xs" radius="xl" color="orange" style={{ flexShrink: 0 }}>
                                                                {attempt.username.charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <div style={{ minWidth: 0 }}>
                                                                <Text size="sm" fw={500} truncate>
                                                                    {attempt.nick_name || attempt.user_name || attempt.username}
                                                                </Text>
                                                                {(attempt.nick_name || attempt.user_name) && (
                                                                    <Text size="xs" c="dimmed" truncate>
                                                                        @{attempt.username}
                                                                    </Text>
                                                                )}
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {attempt.ip_address ? (
                                                            isInternalIP(attempt.ip_address) ? (
                                                                <Group gap={4} wrap="nowrap">
                                                                    <Text size="xs" c="dimmed" truncate>
                                                                        {attempt.ip_address}
                                                                    </Text>
                                                                    <Badge size="xs" variant="light" color="green" style={{ flexShrink: 0 }}>
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
                                                                        overflow: 'hidden'
                                                                    }}
                                                                >
                                                                    <Group gap={4} wrap="nowrap">
                                                                        <Text size="xs" c="red" fw={600} truncate>
                                                                            {attempt.ip_address}
                                                                        </Text>
                                                                        <Badge size="xs" variant="filled" color="red" style={{ flexShrink: 0 }}>
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
                                                    <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
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
