/**
 * ActivityLogDashboard — Dashboard - Log
 * Premium design matching AccountingDashboard style
 * Mantine components + white-orange theme
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
    Skeleton,
    Pagination,
    Modal,
    Button,
} from '@mantine/core'
import { MonthPickerInput, DatePickerInput } from '@mantine/dates'
import { TbRefresh, TbSearch, TbCalendar, TbDownload } from 'react-icons/tb'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

dayjs.extend(buddhistEra)
dayjs.locale('th')

import {
    activityLogsService,
    type ActivityLogStats,
    type ActivityLog,
    type CorrectionSummary,
    type StatusSummaryPoint,
} from '../services/activityLogsService'
import usersService, { type User } from '../services/usersService'
import './ActivityLogDashboard.css'

// Helper to use either nickname or username for display
const formatUserName = (user: User): string => {
  if (!user.name) return user.username;
  if (!user.nick_name) return user.name;
  
  // If the name already contains the nickname, don't append it again
  if (user.name.includes(user.nick_name)) {
      return user.name;
  }
  
  return `${user.name}(${user.nick_name})`;
}

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
    status_correction: { label: 'คืนงานกลับ/สถานะแก้ไข', cls: 'correction' },
    data_create: { label: 'สร้างข้อมูล', cls: 'create' },
    data_edit: { label: 'แก้ไขข้อมูล', cls: 'edit' },
    listing_create: { label: 'ลงขาย', cls: 'listing' },
    listing_purchase: { label: 'ซื้องาน', cls: 'listing' },
    listing_cancel: { label: 'ยกเลิก', cls: 'correction' },
}

const DETAILS_STATUS_CONFIG: Record<string, string> = {
    needs_correction: 'แก้ไข',
    additional_review: 'ตรวจสอบเพิ่มเติม',
    inquire_customer: 'สอบถามลูกค้า',
    draft_completed: 'คีย์ดราฟเสร็จสิ้น',
    pending_review: 'รอตรวจ',
    pending_recheck: 'รอตรวจอีกครั้ง',
    passed: 'ผ่าน',
    paid: 'ชำระแล้ว',
    received_receipt: 'รับใบเสร็จ',
    sent_to_customer: 'ส่งลูกค้าแล้ว',
    not_submitted: 'ไม่ได้ยื่น',
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

function initial(name: string) {
    return name ? name.charAt(0).toUpperCase() : '?'
}

function localToIsoDate(date: Date) {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════

export default function ActivityLogDashboard() {
    const [stats, setStats] = useState<ActivityLogStats | null>(null)
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [corrections, setCorrections] = useState<CorrectionSummary[]>([])
    const [chartData, setChartData] = useState<StatusSummaryPoint[]>([])
    const [loading, setLoading] = useState(true)

    const [chartPeriod, setChartPeriod] = useState<string>('30')
    const [chartDate, setChartDate] = useState<Date | null>(new Date())
    const [chartPage, setChartPage] = useState<string | null>(null)
    const [chartReviewer, setChartReviewer] = useState<string | null>(null)
    const [chartAccountant, setChartAccountant] = useState<string | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [exportModalOpened, setExportModalOpened] = useState(false)
    const [exportStart, setExportStart] = useState<Date | null>(new Date())
    const [exportEnd, setExportEnd] = useState<Date | null>(new Date())

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [filterPage, setFilterPage] = useState<string | null>(null)
    const [filterDetailsStatus, setFilterDetailsStatus] = useState<string | null>(null)
    const [filterMonth, setFilterMonth] = useState<Date | null>(null)
    const [loadingLogs, setLoadingLogs] = useState(false)

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

    // ─── Fetch all dashboard data ───
    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [s, cr, us] = await Promise.all([
                activityLogsService.getStats(),
                activityLogsService.getCorrectionSummary(),
                usersService.getList({ status: 'active' })
            ])
            setStats(s); setCorrections(cr); setUsers(us.data)
        } catch (err) { console.error('Activity log fetch error:', err) }
        finally { setLoading(false) }
    }, [])

    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true)
        try {
            const taxYear = filterMonth ? filterMonth.getFullYear() : undefined
            const taxMonth = filterMonth ? filterMonth.getMonth() + 1 : undefined

            const res = await activityLogsService.getList({
                page, limit,
                search: search || undefined,
                pageName: filterPage || undefined,
                detailsStatus: filterDetailsStatus || undefined,
                taxMonth,
                taxYear,
            })
            setLogs(res.logs)
            setTotalPages(res.pagination.totalPages)
            setTotal(res.pagination.total)
        } catch (err) { console.error('Log list fetch error:', err) }
        finally { setLoadingLogs(false) }
    }, [page, limit, search, filterPage, filterDetailsStatus, filterMonth])

    const fetchChartData = useCallback(async () => {
        try {
            const d = chartPeriod === 'custom' && chartDate ? localToIsoDate(chartDate) : undefined
            const days = chartPeriod !== 'custom' ? chartPeriod : undefined
            const res = await activityLogsService.getChartStatusSummary({
                date: d, days,
                pageName: chartPage || undefined,
                reviewer: chartReviewer || undefined,
                accountant: chartAccountant || undefined
            })
            setChartData(res)
        } catch (err) { console.error('Error fetching chart data:', err) }
    }, [chartDate, chartPage, chartPeriod, chartReviewer, chartAccountant])

    useEffect(() => { fetchAll() }, [fetchAll])
    useEffect(() => { fetchLogs() }, [fetchLogs])
    useEffect(() => { fetchChartData() }, [fetchChartData])

    const refresh = () => { setPage(1); fetchAll(); fetchLogs(); fetchChartData() }

    const handleExportExcel = async () => {
        try {
            const s = exportStart ? localToIsoDate(exportStart) : undefined
            const e = exportEnd ? localToIsoDate(exportEnd) : undefined

            const blob = await activityLogsService.exportLogsToExcel({
                startDate: s, endDate: e,
                reviewer: chartReviewer || undefined,
                accountant: chartAccountant || undefined
            })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `activity_logs_${s || 'start'}_to_${e || 'end'}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setExportModalOpened(false)
        } catch (err) {
            console.error('Export error:', err)
        }
    }

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
        <>
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
                        <MonthPickerInput
                            placeholder="ค้นหาจากเดือนภาษี"
                            leftSection={<TbCalendar size={16} />}
                            value={filterMonth}
                            onChange={(val) => { setFilterMonth(val); setPage(1) }}
                            clearable
                            size="sm"
                            radius="md"
                            variant="filled"
                            style={{ minWidth: 180, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 8 }}
                            valueFormat="MM/YYYY"
                        />
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

            {/* ═══ Two Column: Correction + Employee ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
                {/* Correction Summary */}
                <Box className="ald-summary-card red-line ald-animate ald-delay-4">
                    <Group gap="xs" mb="md">
                        <div className="ald-section-icon" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}>🔄</div>
                        <Text fw={700} size="md" c="#1a1a2e">สรุปแก้ไข (เดือนนี้)</Text>
                    </Group>

                    {corrections.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth: 400 }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Build</Table.Th>
                                        <Table.Th>ชื่อบริษัท</Table.Th>
                                        <Table.Th>ผู้ทำบัญชี</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>จำนวนแก้ไข</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {corrections.map((c, i) => {
                                        const acctName = c.first_name ? `${c.first_name}${c.nick_name ? `(${c.nick_name})` : ''}` : 'ไม่ระบุ'
                                        return (
                                            <Table.Tr key={i}>
                                                <Table.Td><Text size="sm" fw={600} c="dimmed">{c.build}</Text></Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" fw={600}>
                                                        {c.company_name || 'ไม่ระบุชื่อบริษัท'}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td><Text size="sm">{acctName}</Text></Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>
                                                    <Badge color="red" variant="light" size="lg" fw={800}>{c.correction_count}</Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        )
                                    })}
                                </Table.Tbody>
                            </Table>
                        </div>
                    ) : (
                        <Center py={40}>
                            <Stack align="center" gap="xs">
                                <Text size="2rem">✅</Text>
                                <Text size="sm" c="dimmed">ไม่มีการแก้ไขในเดือนนี้</Text>
                            </Stack>
                        </Center>
                    )}
                </Box>

                {/* Activity Status Chart */}
                <Box className="ald-summary-card orange-line ald-animate ald-delay-5" style={{ display: 'flex', flexDirection: 'column' }}>
                    <Group justify="space-between" align="center" mb="md" wrap="wrap">
                        <Group gap="xs">
                            <div className="ald-section-icon">📊</div>
                            <Text fw={700} size="md" c="#1a1a2e">สรุปกิจกรรม (สถานะ)</Text>
                        </Group>
                        <Group gap="xs">
                            <Select
                                value={chartPeriod}
                                onChange={(val) => {
                                    setChartPeriod(val || '30')
                                    if (val !== 'custom') setChartDate(null)
                                    else setChartDate(new Date())
                                }}
                                data={[
                                    { value: '1', label: 'วันนี้' },
                                    { value: '7', label: '7 วันที่ผ่านมา' },
                                    { value: '14', label: '14 วันที่ผ่านมา' },
                                    { value: '30', label: '30 วันที่ผ่านมา' },
                                    { value: 'custom', label: 'ระบุวันที่' },
                                ]}
                                size="xs"
                                radius="md"
                                style={{ width: 130 }}
                                allowDeselect={false}
                            />
                            {chartPeriod === 'custom' && (
                                <DatePickerInput
                                    placeholder="เลือกวันที่"
                                    value={chartDate}
                                    onChange={setChartDate}
                                    size="xs"
                                    radius="md"
                                    style={{ width: 140 }}
                                    clearable
                                    locale="th"
                                    valueFormat="DD MMM BBBB"
                                />
                            )}
                            <Select
                                placeholder="ทุกหน้า"
                                clearable
                                value={chartPage}
                                onChange={setChartPage}
                                data={Object.entries(PAGE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                                size="xs"
                                radius="md"
                                style={{ width: 120 }}
                            />
                            <Select
                                placeholder="ผู้ตรวจ"
                                clearable
                                value={chartReviewer}
                                onChange={setChartReviewer}
                                data={users
                                    .filter(u => ['admin', 'audit'].includes(u.role))
                                    .map(u => ({ value: u.employee_id || u.id, label: formatUserName(u) }))}
                                size="xs"
                                radius="md"
                                style={{ width: 140 }}
                                searchable
                            />
                            <Select
                                placeholder="ผู้ทำบัญชี"
                                clearable
                                value={chartAccountant}
                                onChange={setChartAccountant}
                                data={users
                                    .filter(u => ['service', 'data_entry_and_service'].includes(u.role))
                                    .map(u => ({ value: u.employee_id || u.id, label: formatUserName(u) }))}
                                size="xs"
                                radius="md"
                                style={{ width: 140 }}
                                searchable
                            />
                            <Button size="xs" radius="md" color="green" leftSection={<TbDownload size={14} />} onClick={() => setExportModalOpened(true)}>
                                ส่งออก Excel
                            </Button>
                        </Group>
                    </Group>

                    <div style={{ width: '100%', flex: 1, minHeight: 400 }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="status" tickFormatter={(val) => DETAILS_STATUS_CONFIG[val] || val} tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartsTooltip formatter={(value: number) => [value, 'จำนวน']} labelFormatter={(label) => DETAILS_STATUS_CONFIG[label] || label} cursor={{ fill: 'rgba(255, 107, 53, 0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" fill="#FF6B35" radius={[4, 4, 0, 0]} maxBarSize={50} animationDuration={1000}>
                                        {chartData.map((_, i) => (
                                            <Cell key={`cell-${i}`} fill={i % 2 === 0 ? '#FF6B35' : '#FF8C66'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Center h="100%">
                                <Text c="dimmed" size="sm">ไม่มีข้อมูลในวันที่เลือก</Text>
                            </Center>
                        )}
                    </div>
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
                        style={{ flex: 1, minWidth: 150 }}
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
                        style={{ minWidth: 140 }}
                    />
                    <Select
                        placeholder="ทุกสถานะที่แก้ไข"
                        clearable
                        value={filterDetailsStatus}
                        onChange={(v) => { setFilterDetailsStatus(v); setPage(1) }}
                        data={Object.entries(DETAILS_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v }))}
                        size="sm"
                        radius="md"
                        style={{ minWidth: 160 }}
                    />
                </Group>

                {/* Page size selector */}
                <Group gap="sm" mb="md" justify="flex-end">
                    <Group gap={6} align="center">
                        <Text size="xs" c="dimmed">แสดง</Text>
                        <Select
                            value={String(limit)}
                            onChange={(v) => { setLimit(Number(v)); setPage(1) }}
                            data={[
                                { value: '20', label: '20 รายการ' },
                                { value: '50', label: '50 รายการ' },
                                { value: '100', label: '100 รายการ' },
                            ]}
                            size="xs"
                            radius="md"
                            style={{ width: 130 }}
                            allowDeselect={false}
                        />
                    </Group>
                </Group>

                {/* Table */}
                <ScrollArea>
                    <div className="ald-table-wrap">
                        <Table verticalSpacing="xs" horizontalSpacing="sm" striped={false} ref={tableRef} style={{ tableLayout: 'fixed' }}>
                            <Table.Thead>
                                <Table.Tr>
                                    {['เวลา', 'ผู้ใช้', 'การกระทำ', 'หน้า', 'Build', 'ชื่อบริษัท', 'รายละเอียด'].map((h, i) => (
                                        <Table.Th key={h} style={{ position: 'relative' }}>
                                            {h}
                                            <span
                                                className="ald-resize-handle"
                                                onMouseDown={(e) => onResizeMouseDown(e, i)}
                                            />
                                        </Table.Th>
                                    ))}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {loadingLogs ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <Table.Tr key={`skel-${i}`}>
                                            <Table.Td><Skeleton height={20} radius="xl" /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" width={80} /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" width={80} /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" width={60} /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" /></Table.Td>
                                            <Table.Td><Skeleton height={20} radius="xl" /></Table.Td>
                                        </Table.Tr>
                                    ))
                                ) : logs.length > 0 ? logs.map((log) => {
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
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={
                                                        ac.cls === 'status' || ac.cls === 'create' || ac.cls === 'edit' || ac.cls === 'listing'
                                                            ? 'orange'
                                                            : ac.cls === 'correction' ? 'red' : 'gray'
                                                    }
                                                >
                                                    {ac.label}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge size="sm" variant="light" color="gray">
                                                    {PAGE_LABELS[log.page] || log.page}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" ff="monospace" c="dimmed">{log.build || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" style={{ wordBreak: 'break-word' }}>{log.company_name || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" style={{ wordBreak: 'break-word' }}>{log.description || '-'}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                }) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={7}>
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
                {!loadingLogs && totalPages >= 1 && (
                    <Group justify="space-between" align="center" mt="xl" wrap="wrap">
                        <Text size="xs" c="dimmed">
                            แสดง {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} จาก {total} รายการ
                        </Text>
                        <Pagination
                            total={totalPages}
                            value={page}
                            onChange={setPage}
                            size="sm"
                            radius="xl"
                            color="orange"
                            withEdges
                        />
                    </Group>
                )}
            </Paper>
        </div>

            {/* Export Modal */}
            <Modal opened={exportModalOpened} onClose={() => setExportModalOpened(false)} title="ส่งออกข้อมูลกิจกรรม (Excel)" centered radius="md">
                <Stack>
                    <DatePickerInput
                        label="วันที่เริ่มต้น"
                        placeholder="เลือกวันที่"
                        value={exportStart}
                        onChange={setExportStart}
                        radius="md"
                        clearable
                        locale="th"
                        valueFormat="DD MMM BBBB"
                    />
                    <DatePickerInput
                        label="วันที่สิ้นสุด"
                        placeholder="เลือกวันที่"
                        value={exportEnd}
                        onChange={setExportEnd}
                        radius="md"
                        clearable
                        locale="th"
                        valueFormat="DD MMM BBBB"
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setExportModalOpened(false)} radius="md">ยกเลิก</Button>
                        <Button color="green" onClick={handleExportExcel} radius="md" leftSection={<TbDownload size={16} />}>
                            ดาวน์โหลด
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    )
}
