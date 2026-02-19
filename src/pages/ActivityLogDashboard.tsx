/**
 * ActivityLogDashboard — Dashboard - Log
 * Premium design matching AccountingDashboard style
 * Mantine components + white-orange theme
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Box,
    Paper,
    Text,
    Group,
    Stack,
    SimpleGrid,
    ActionIcon,
    Tooltip,
    Loader,
    Center,
    Badge,
    Table,
    ScrollArea,
    TextInput,
    Select,
} from '@mantine/core'
import { TbRefresh, TbSearch } from 'react-icons/tb'
import {
    activityLogsService,
    type ActivityLogStats,
    type ActivityLog,
    type ChartData,
    type CorrectionSummary,
    type EmployeeSummary,
} from '../services/activityLogsService'
import './ActivityLogDashboard.css'

// ═══════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════

const PAGE_LABELS: Record<string, string> = {
    tax_inspection: 'ตรวจภาษี',
    tax_filing: 'ยื่นภาษี',
    tax_filing_status: 'สถานะยื่นภาษี',
    document_sorting: 'คัดแยกเอกสาร',
    document_entry: 'คีย์เอกสาร',
    accounting_marketplace: 'ตลาดกลาง',
}

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
    status_update: { label: 'อัพเดทสถานะ', cls: 'status' },
    data_create: { label: 'สร้างข้อมูล', cls: 'create' },
    data_edit: { label: 'แก้ไข', cls: 'edit' },
    listing_create: { label: 'ลงขาย', cls: 'listing' },
    listing_purchase: { label: 'ซื้องาน', cls: 'listing' },
    listing_cancel: { label: 'ยกเลิก', cls: 'correction' },
}

// ═══════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════

function fmtDateTime(d: string) {
    try {
        const dt = new Date(d)
        return dt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) +
            ' ' + dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    } catch { return d }
}

function fmtShortDate(d: string) {
    try {
        return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
    } catch { return d }
}

function initial(name: string) {
    return name ? name.charAt(0).toUpperCase() : '?'
}

// ═══════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════

export default function ActivityLogDashboard() {
    const [stats, setStats] = useState<ActivityLogStats | null>(null)
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [chart, setChart] = useState<ChartData | null>(null)
    const [corrections, setCorrections] = useState<CorrectionSummary[]>([])
    const [employees, setEmployees] = useState<EmployeeSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [chartDays, setChartDays] = useState(7)

    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [filterPage, setFilterPage] = useState<string | null>(null)
    const [filterAction, setFilterAction] = useState<string | null>(null)

    // ─── Fetch all dashboard data ───
    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [s, c, cr, em] = await Promise.all([
                activityLogsService.getStats(),
                activityLogsService.getChart(chartDays),
                activityLogsService.getCorrectionSummary(),
                activityLogsService.getEmployeeSummary(),
            ])
            setStats(s); setChart(c); setCorrections(cr); setEmployees(em)
        } catch (err) { console.error('Activity log fetch error:', err) }
        finally { setLoading(false) }
    }, [chartDays])

    const fetchLogs = useCallback(async () => {
        try {
            const res = await activityLogsService.getList({
                page, limit: 15,
                search: search || undefined,
                pageName: filterPage || undefined,
                action: filterAction || undefined,
            })
            setLogs(res.logs)
            setTotalPages(res.pagination.totalPages)
            setTotal(res.pagination.total)
        } catch (err) { console.error('Log list fetch error:', err) }
    }, [page, search, filterPage, filterAction])

    useEffect(() => { fetchAll() }, [fetchAll])
    useEffect(() => { fetchLogs() }, [fetchLogs])

    const refresh = () => { setPage(1); fetchAll(); fetchLogs() }

    const maxBar = chart?.trend ? Math.max(...chart.trend.map(d => d.count), 1) : 1

    // ─── STAT CARDS CONFIG ───
    const statCards = [
        { label: 'กิจกรรมวันนี้', value: stats?.todayCount ?? 0, icon: '📊' },
        { label: 'สัปดาห์นี้', value: stats?.weekCount ?? 0, icon: '📅' },
        { label: 'เดือนนี้', value: stats?.monthCount ?? 0, icon: '📈' },
        { label: 'ผู้ใช้งาน (วันนี้)', value: stats?.activeUsers ?? 0, icon: '👥' },
        { label: 'หน้าที่ใช้มากสุด', value: PAGE_LABELS[stats?.topPage || ''] || stats?.topPage || '-', icon: '⭐', isText: true },
        { label: 'แก้ไข (เดือนนี้)', value: stats?.corrections ?? 0, icon: '🔄' },
    ]

    // ═══ Loading ═══
    if (loading && !stats) {
        return (
            <div className="ald-root">
                <Center style={{ minHeight: 400 }}>
                    <Stack align="center" gap="sm">
                        <Loader color="orange" size="lg" />
                        <Text size="sm" c="dimmed">กำลังโหลดข้อมูล...</Text>
                    </Stack>
                </Center>
            </div>
        )
    }

    // ═══ Render ═══
    return (
        <div className="ald-root">
            {/* ═══ Header Banner ═══ */}
            <Box className="ald-header-banner ald-animate ald-delay-1">
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                    <Box style={{ position: 'relative', zIndex: 1 }}>
                        <Text size="xl" fw={800} c="white" mb={2}>
                            📋 Dashboard - Log
                        </Text>
                        <Text size="xs" c="rgba(255,255,255,0.75)" fw={500}>
                            ติดตามการทำงานของพนักงานในระบบ
                        </Text>
                    </Box>
                    <Group gap="xs" style={{ position: 'relative', zIndex: 1 }}>
                        <Box className="ald-filter-glass">
                            <Group gap={4}>
                                <button
                                    className={`ald-tab-pill ${chartDays === 7 ? 'ald-tab-pill--active' : ''}`}
                                    onClick={() => setChartDays(7)}
                                >7 วัน</button>
                                <button
                                    className={`ald-tab-pill ${chartDays === 30 ? 'ald-tab-pill--active' : ''}`}
                                    onClick={() => setChartDays(30)}
                                >30 วัน</button>
                            </Group>
                        </Box>
                        <Tooltip label="รีเฟรชข้อมูล" withArrow>
                            <ActionIcon
                                variant="white" size="lg" radius="xl" onClick={refresh}
                                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                            >
                                <TbRefresh size={18} color="#FF6B35" />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Box>

            {/* ═══ Stat Cards ═══ */}
            <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md" mb="lg" className="ald-animate ald-delay-2">
                {statCards.map((s, i) => (
                    <Box className="ald-hero-card" key={i}>
                        <Group gap="xs" mb={8}>
                            <div className="ald-hero-icon">{s.icon}</div>
                        </Group>
                        <Text size="xs" c="dimmed" fw={600} mb={4} style={{ letterSpacing: '0.3px' }}>
                            {s.label}
                        </Text>
                        {'isText' in s && s.isText ? (
                            <Text size="md" fw={800} c="#1a1a2e" lineClamp={1}>{String(s.value)}</Text>
                        ) : (
                            <Text className="ald-stat-number">{String(s.value)}</Text>
                        )}
                    </Box>
                ))}
            </SimpleGrid>

            {/* ═══ Chart Section ═══ */}
            <Paper className="ald-glass-card ald-animate ald-delay-3" p="xl" mb="lg">
                <Group gap="xs" mb="lg">
                    <div className="ald-section-icon">📈</div>
                    <Text fw={700} size="md" c="#1a1a2e">แนวโน้มกิจกรรม</Text>
                    <Badge variant="light" color="orange" size="sm" ml={4}>
                        {chartDays === 7 ? '7 วัน' : '30 วัน'}
                    </Badge>
                </Group>

                {chart?.trend && chart.trend.length > 0 ? (
                    <div className="ald-chart-area">
                        {chart.trend.map((pt, i) => (
                            <div className="ald-bar-col" key={i}>
                                <span className="ald-bar-val">{pt.count || ''}</span>
                                <div
                                    className="ald-bar"
                                    style={{ height: `${Math.max((pt.count / maxBar) * 180, 4)}px` }}
                                    title={`${pt.date}: ${pt.count} กิจกรรม`}
                                />
                                <span className="ald-bar-date">{fmtShortDate(pt.date)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Center py={60}>
                        <Stack align="center" gap="xs">
                            <Text size="2rem">📊</Text>
                            <Text c="dimmed" size="sm">ยังไม่มีข้อมูลกิจกรรม</Text>
                        </Stack>
                    </Center>
                )}

                {/* Page breakdown chips */}
                {chart?.pageBreakdown && chart.pageBreakdown.length > 0 && (
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm" mt="lg">
                        {chart.pageBreakdown.map((p, i) => (
                            <div className="ald-chip" key={i}>
                                <div className="ald-chip-dot" />
                                <Text size="xs" c="dimmed" style={{ flex: 1 }}>{PAGE_LABELS[p.page] || p.page}</Text>
                                <Text size="sm" fw={800} c="#1a1a2e">{p.count}</Text>
                            </div>
                        ))}
                    </SimpleGrid>
                )}
            </Paper>

            {/* ═══ Two Column: Correction + Employee ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
                {/* Correction Summary */}
                <Box className="ald-summary-card red-line ald-animate ald-delay-4">
                    <Group gap="xs" mb="md">
                        <div className="ald-section-icon" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}>🔄</div>
                        <Text fw={700} size="md" c="#1a1a2e">สรุปแก้ไข (เดือนนี้)</Text>
                    </Group>

                    {corrections.length > 0 ? (
                        <Stack gap={0}>
                            {corrections.map((c, i) => (
                                <div className="ald-summary-row" key={i}>
                                    <div className="ald-avatar"><span>{initial(c.user_name)}</span></div>
                                    <Box ml="sm" style={{ flex: 1 }}>
                                        <Text size="sm" fw={600}>{c.user_name || c.employee_id}</Text>
                                        <Text size="xs" c="dimmed">{fmtDateTime(c.last_correction)}</Text>
                                    </Box>
                                    <Text fw={800} size="lg" c="#ef4444">{c.correction_count}</Text>
                                </div>
                            ))}
                        </Stack>
                    ) : (
                        <Center py={40}>
                            <Stack align="center" gap="xs">
                                <Text size="2rem">✅</Text>
                                <Text size="sm" c="dimmed">ไม่มีการแก้ไขในเดือนนี้</Text>
                            </Stack>
                        </Center>
                    )}
                </Box>

                {/* Employee Summary */}
                <Box className="ald-summary-card orange-line ald-animate ald-delay-5">
                    <Group gap="xs" mb="md">
                        <div className="ald-section-icon">👥</div>
                        <Text fw={700} size="md" c="#1a1a2e">สรุปกิจกรรมพนักงาน</Text>
                    </Group>

                    {employees.length > 0 ? (
                        <ScrollArea h={300}>
                            <div className="ald-table-wrap">
                                <Table verticalSpacing="xs" horizontalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>พนักงาน</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>ทั้งหมด</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>สร้าง</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>แก้ไข</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {employees.map((e, i) => (
                                            <Table.Tr key={i}>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <div className="ald-avatar"><span>{initial(e.user_name)}</span></div>
                                                        <Text size="sm" fw={500}>{e.user_name || e.employee_id}</Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>
                                                    <Text fw={700} c="#FF6B35">{e.total_actions}</Text>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>{e.status_updates}</Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>{e.data_creates}</Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>{e.data_edits}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </div>
                        </ScrollArea>
                    ) : (
                        <Center py={40}>
                            <Stack align="center" gap="xs">
                                <Text size="2rem">📋</Text>
                                <Text size="sm" c="dimmed">ยังไม่มีข้อมูลพนักงาน</Text>
                            </Stack>
                        </Center>
                    )}
                </Box>
            </SimpleGrid>

            {/* ═══ Activity Log Table ═══ */}
            <Paper className="ald-glass-card ald-animate ald-delay-6" p="xl">
                <Group gap="xs" mb="lg" justify="space-between" wrap="wrap">
                    <Group gap="xs">
                        <div className="ald-section-icon">📝</div>
                        <Text fw={700} size="md" c="#1a1a2e">รายการกิจกรรมล่าสุด</Text>
                        <Badge variant="light" color="gray" size="sm">{total} รายการ</Badge>
                    </Group>
                </Group>

                {/* Filters */}
                <Group gap="sm" mb="md" wrap="wrap">
                    <TextInput
                        placeholder="ค้นหา..."
                        leftSection={<TbSearch size={16} />}
                        value={search}
                        onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
                        size="sm"
                        radius="md"
                        style={{ flex: 1, minWidth: 180 }}
                        styles={{ input: { border: '1px solid #eee', '&:focus': { borderColor: '#FF8A5C' } } }}
                    />
                    <Select
                        placeholder="ทุกหน้า"
                        clearable
                        value={filterPage}
                        onChange={(v) => { setFilterPage(v); setPage(1) }}
                        data={Object.entries(PAGE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                        size="sm"
                        radius="md"
                        style={{ minWidth: 160 }}
                    />
                    <Select
                        placeholder="ทุกการกระทำ"
                        clearable
                        value={filterAction}
                        onChange={(v) => { setFilterAction(v); setPage(1) }}
                        data={Object.entries(ACTION_CONFIG).map(([k, { label }]) => ({ value: k, label }))}
                        size="sm"
                        radius="md"
                        style={{ minWidth: 160 }}
                    />
                </Group>

                {/* Table */}
                <ScrollArea>
                    <div className="ald-table-wrap">
                        <Table verticalSpacing="xs" horizontalSpacing="sm" striped={false}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>เวลา</Table.Th>
                                    <Table.Th>ผู้ใช้</Table.Th>
                                    <Table.Th>การกระทำ</Table.Th>
                                    <Table.Th>หน้า</Table.Th>
                                    <Table.Th>Build</Table.Th>
                                    <Table.Th>รายละเอียด</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {logs.length > 0 ? logs.map((log) => {
                                    const ac = ACTION_CONFIG[log.action] || { label: log.action, cls: 'page-badge' }
                                    return (
                                        <Table.Tr key={log.id}>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                                    {fmtDateTime(log.created_at)}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <div className="ald-avatar"><span>{initial(log.user_name || '')}</span></div>
                                                    <Text size="sm" fw={600}>{log.user_name || '-'}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className={`ald-action-badge ${ac.cls}`}>{ac.label}</span>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="ald-action-badge page-badge">{PAGE_LABELS[log.page] || log.page}</span>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" ff="monospace" c="dimmed">{log.build || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" lineClamp={1} style={{ maxWidth: 260 }}>{log.description || '-'}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                }) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6}>
                                            <Center py={40}>
                                                <Stack align="center" gap="xs">
                                                    <Text size="2rem">📋</Text>
                                                    <Text size="sm" c="dimmed">ไม่พบข้อมูลกิจกรรม</Text>
                                                </Stack>
                                            </Center>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="ald-pager">
                        <button className="ald-pager-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                            const num = start + i
                            if (num > totalPages) return null
                            return (
                                <button
                                    key={num}
                                    className={`ald-pager-btn ${num === page ? 'active' : ''}`}
                                    onClick={() => setPage(num)}
                                >{num}</button>
                            )
                        })}
                        <Text size="xs" c="dimmed" mx={4}>/ {totalPages}</Text>
                        <button className="ald-pager-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
                    </div>
                )}
            </Paper>
        </div>
    )
}
