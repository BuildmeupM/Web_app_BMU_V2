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

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
    Paper,
    Checkbox,
    Button,
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
    formatDateTime,
} from '../components/LoginActivity/constants'
import StatCard from '../components/LoginActivity/StatCard'
import LoginChart from '../components/LoginActivity/LoginChart'
import OnlineUsersSection from '../components/LoginActivity/OnlineUsersSection'
import SessionSummarySection from '../components/LoginActivity/SessionSummarySection'
import SessionHistorySection from '../components/LoginActivity/SessionHistorySection'
import LoginAttemptRow from '../components/LoginActivity/LoginAttemptRow'
import DeleteConfirmModal from '../components/LoginActivity/DeleteConfirmModal'
import ExternalIpAlertModal from '../components/LoginActivity/ExternalIpAlertModal'
import { useTableResize } from '../hooks/useTableResize'
import { getSocket } from '../services/socketService'
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
    const { tableRef, onResizeMouseDown } = useTableResize()

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
    // ✅ PERFORMANCE: Uses WebSocket for real-time updates via 'online-users:changed' event
    // with a 60-second polling fallback.
    const {
        data: onlineData,
        isLoading: loadingOnline,
        refetch: refetchOnline,
    } = useQuery(['login-activity', 'online-users'], () => loginActivityService.getOnlineUsers(), {
        staleTime: 30_000,
        retry: 1,
        refetchInterval: 60_000,
    })

    // Listen to real-time online user changes via WebSockets
    useEffect(() => {
        const socket = getSocket()
        if (!socket) return

        socket.emit('subscribe:online-users')

        const handleOnlineUsersChanged = () => {
            console.log('📡 [WebSocket] Online users status changed. Refetching data...')
            queryClient.invalidateQueries(['login-activity', 'online-users'])
            queryClient.invalidateQueries(['login-activity', 'stats']) // Optional: refresh stats too
        }

        socket.on('online-users:changed', handleOnlineUsersChanged)

        return () => {
            socket.emit('unsubscribe:online-users')
            socket.off('online-users:changed', handleOnlineUsersChanged)
        }
    }, [queryClient])

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
    const externalAttemptsToday = useMemo(() => externalIpTodayData?.attempts || [], [externalIpTodayData?.attempts])
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
    const toggleSelectId = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const toggleSelectAll = useCallback(() => {
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
    }, [attemptsData?.attempts, selectedIds])

    const handleDeleteClick = useCallback((id: string) => {
        setSingleDeleteId(id)
        setDeleteModalType('single')
    }, [])

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
        setDeleting(true)
        try {
            await loginActivityService.deleteAttempts(idsToDelete)
            // ซ่อนจาก UI ทันที
            setDeletedIds(prev => {
                const next = new Set(prev)
                idsToDelete.forEach(id => next.add(id))
                return next
            })
            setSelectedIds(new Set())
            setDeleteModalType(null)
        } catch (error) {
            console.error('Error deleting attempts:', error)
        } finally {
            setDeleting(false)
            queryClient.invalidateQueries(['login-activity'])
        }
    }

    const handleDeleteAll = async () => {
        setDeleting(true)
        try {
            await loginActivityService.deleteAllAttempts()
            setSelectedIds(new Set())
            setDeleteModalType(null)
            setPage(1)
        } catch (error) {
            console.error('Error deleting all attempts:', error)
        } finally {
            setDeleting(false)
            queryClient.invalidateQueries(['login-activity'])
        }
    }

    const handleDeleteSingle = async () => {
        if (!singleDeleteId) return
        const idToDelete = singleDeleteId
        setDeleting(true)
        try {
            await loginActivityService.deleteAttempt(idToDelete)
            // ซ่อนจาก UI ทันที
            setDeletedIds(prev => new Set(prev).add(idToDelete))
            setSingleDeleteId(null)
            setDeleteModalType(null)
        } catch (error) {
            console.error('Error deleting attempt:', error)
        } finally {
            setDeleting(false)
            queryClient.invalidateQueries(['login-activity'])
        }
    }

    return (
        <>
            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                opened={deleteModalType !== null}
                onClose={() => {
                    setDeleteModalType(null)
                    setSingleDeleteId(null)
                }}
                type={deleteModalType}
                selectedCount={selectedIds.size}
                totalCount={attemptsData?.pagination.total ?? 0}
                deleting={deleting}
                onConfirm={
                    deleteModalType === 'single'
                        ? handleDeleteSingle
                        : deleteModalType === 'selected' ? handleDeleteSelected : handleDeleteAll
                }
            />

            {/* External IP Alert Modal — auto-popup (วันนี้เท่านั้น) */}
            <ExternalIpAlertModal
                opened={externalIpModalOpen}
                onClose={() => setExternalIpModalOpen(false)}
                externalAttemptsToday={externalAttemptsToday}
            />

            <Container size="xl" py="xl" style={{ backgroundColor: 'var(--mantine-color-gray-0)', minHeight: '100vh', borderRadius: '16px' }}>
                <Stack gap="xl">
                    {/* Header */}
                    <Group justify="space-between" mb="xl">
                        <div>
                            <Title order={2} style={{
                                background: 'linear-gradient(to right, var(--mantine-color-blue-7), var(--mantine-color-cyan-5))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                ประวัติการเข้าสู่ระบบ
                            </Title>
                            <Text c="dimmed" size="sm" mt={4}>
                                ข้อมูลการ Login ย้อนหลัง กราฟแสดงแนวโน้ม และผู้ที่กำลังออนไลน์
                            </Text>
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
                            subtitle={`จาก ${(stats?.loginToday ?? 0) + (stats?.failedToday ?? 0)} ครั้ง`}
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
                                        ? `⚠ พบ ${externalAttempts.length} รายการจากภายนอก`
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
                                                    border: '1px solid rgba(255, 135, 135, 0.3)',
                                                    backgroundColor: 'rgba(255, 245, 245, 0.8)',
                                                    backdropFilter: 'blur(4px)',
                                                    transition: 'transform 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    const el = e.currentTarget as HTMLElement
                                                    el.style.transform = 'translateY(-2px)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    const el = e.currentTarget as HTMLElement
                                                    el.style.transform = 'translateY(0)'
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
                                ทุกการเข้าสู่ระบบมาจาก IP ภายในที่อนุญาต
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
                                                <LoginAttemptRow
                                                    key={attempt.id}
                                                    attempt={attempt}
                                                    isSelected={selectedIds.has(attempt.id)}
                                                    onToggleSelect={toggleSelectId}
                                                    onDeleteClick={handleDeleteClick}
                                                />
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
            </Container>

            {/* Put the Modal back here inside the Fragment */}
            <DeleteConfirmModal
                opened={deleteModalType !== null}
                onClose={() => {
                    setDeleteModalType(null)
                    setSingleDeleteId(null)
                }}
                type={deleteModalType}
                selectedCount={selectedIds.size}
                totalCount={attemptsData?.pagination.total ?? 0}
                deleting={deleting}
                onConfirm={
                    deleteModalType === 'single'
                        ? handleDeleteSingle
                        : deleteModalType === 'selected' ? handleDeleteSelected : handleDeleteAll
                }
            />

        </>
    )
}
