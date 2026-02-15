/**
 * AccountingDashboard — Dashboard งานบัญชี
 * แสดงข้อมูลสรุปภาษีรายเดือนแบบ real-time 4 มุมมอง:
 *   Tab 1: Service (ผู้ทำบัญชี)
 *   Tab 2: Audit (ผู้ตรวจภาษี)
 *   Tab 3: Send Tax (พนักงานยื่นภาษี)
 *   Tab 4: Data Entry (คีย์เอกสาร)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Box,
    Paper,
    Text,
    Group,
    Stack,
    SimpleGrid,
    Select,
    ActionIcon,
    Tooltip,
    Loader,
    Center,
    RingProgress,
    Badge,
    Switch,
    Alert,
    Progress,
    Table,
    Divider,
    ScrollArea,
    Modal,
} from '@mantine/core'
import { TbRefresh, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import monthlyTaxDataService from '../services/monthlyTaxDataService'
import type { MonthlyTaxData } from '../services/monthlyTaxDataService'
import { getCurrentTaxMonth } from '../utils/taxMonthUtils'

// ═══════════════════════════════════════════════════
//  Constants & Types
// ═══════════════════════════════════════════════════

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    received_receipt: { label: 'รับใบเสร็จ', color: '#4facfe' },
    paid: { label: 'ชำระแล้ว', color: '#ffc107' },
    sent_to_customer: { label: 'ส่งลูกค้าแล้ว', color: '#81d4fa' },
    draft_completed: { label: 'ร่างแบบเสร็จแล้ว', color: '#ffb74d' },
    passed: { label: 'ผ่าน', color: '#4caf50' },
    pending_review: { label: 'รอตรวจ', color: '#ff6b35' },
    pending_recheck: { label: 'รอตรวจอีกครั้ง', color: '#f44336' },
    draft_ready: { label: 'ร่างแบบได้', color: '#f8bbd9' },
    needs_correction: { label: 'แก้ไข', color: '#f44336' },
    edit: { label: 'แก้ไข', color: '#f44336' },
    inquire_customer: { label: 'สอบถามลูกค้าเพิ่มเติม', color: '#9c27b0' },
    additional_review: { label: 'ตรวจสอบเพิ่มเติม', color: '#81d4fa' },
    not_submitted: { label: 'ไม่มียื่น', color: '#000000' },
    not_started: { label: 'ยังไม่ดำเนินการ', color: '#808080' },
}

const WHT_COMPLETED_STATUSES = ['pending_review', 'passed', 'sent_to_customer', 'paid', 'received_receipt', 'draft_completed']
const VAT_COMPLETED_STATUSES = ['pending_review', 'passed', 'sent_to_customer', 'paid', 'received_receipt', 'draft_completed']
const CORRECTION_STATUSES = ['needs_correction', 'edit', 'pending_recheck']

type TabKey = 'service' | 'audit' | 'sendTax' | 'dataEntry'

interface StatusCount {
    status: string
    label: string
    count: number
    color: string
}

// ═══════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════

function countStatuses(data: MonthlyTaxData[], field: keyof MonthlyTaxData): StatusCount[] {
    const counts: Record<string, number> = {}
    data.forEach(item => {
        const val = (item[field] as string | null) || 'not_started'
        counts[val] = (counts[val] || 0) + 1
    })
    return Object.entries(counts)
        .map(([status, count]) => ({
            status,
            label: STATUS_CONFIG[status]?.label || status,
            count,
            color: STATUS_CONFIG[status]?.color || '#808080',
        }))
        .sort((a, b) => b.count - a.count)
}

// ═══════════════════════════════════════════════════
//  Summary Card Component
// ═══════════════════════════════════════════════════

function SummaryCard({
    title, value, total, color, icon,
}: {
    title: string
    value: number
    total: number
    color: string
    icon?: string
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    return (
        <Paper
            p="lg"
            radius="lg"
            shadow="sm"
            style={{
                background: '#ffffff',
                border: '1px solid #f0f0f0',
                minHeight: 150,
            }}
        >
            <Stack gap="xs" align="center">
                <Text size="xs" c="gray.6" fw={500} ta="center">
                    {title}
                </Text>
                <RingProgress
                    size={80}
                    thickness={6}
                    roundCaps
                    sections={[{ value: pct, color }]}
                    label={
                        <Text ta="center" fw={700} size="lg" c="dark">
                            {value}
                        </Text>
                    }
                />
                <Group gap={4}>
                    {icon && <Text size="sm">{icon}</Text>}
                    <Text size="xs" c="gray.5">{pct}%</Text>
                </Group>
            </Stack>
        </Paper>
    )
}

// ═══════════════════════════════════════════════════
//  Horizontal Bar Chart Section
// ═══════════════════════════════════════════════════

function StatusBarChart({ data, title }: { data: StatusCount[]; title: string }) {
    return (
        <Paper
            p="lg"
            radius="lg"
            shadow="sm"
            style={{
                background: '#ffffff',
                border: '1px solid #f0f0f0',
            }}
        >
            <Text size="sm" fw={600} c="dark" mb="md">{title}</Text>
            <ResponsiveContainer width="100%" height={Math.max(data.length * 38, 200)}>
                <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fill: '#666', fontSize: 12 }} />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fill: '#444', fontSize: 12 }}
                        width={110}
                    />
                    <RechartsTooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            color: '#333',
                        }}
                    />
                    <Bar dataKey="count" name="จำนวน" radius={[0, 6, 6, 0]}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Paper>
    )
}

// ═══════════════════════════════════════════════════
//  Donut Chart Section
// ═══════════════════════════════════════════════════

function StatusDonutChart({
    data, title, subtitle, total,
}: {
    data: StatusCount[]
    title: string
    subtitle: string
    total: number
}) {
    return (
        <Paper
            p="lg"
            radius="lg"
            shadow="sm"
            style={{
                background: '#ffffff',
                border: '1px solid #f0f0f0',
            }}
        >
            <Text size="sm" fw={600} c="dark" mb={4}>{title}</Text>
            <Text size="xs" c="gray.6" mb="md">{subtitle}</Text>
            <Group align="center" justify="center" gap="xl">
                <Box style={{ position: 'relative' }}>
                    <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                stroke="none"
                            >
                                {data.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{
                                    background: '#ffffff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    color: '#333',
                                    fontSize: 12,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <Box
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}
                    >
                        <Text fw={700} size="xl" c="dark">{total}</Text>
                        <Text size="xs" c="gray.5">Total</Text>
                    </Box>
                </Box>
                {/* Legend */}
                <Stack gap={6}>
                    {data.map((item) => {
                        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                        return (
                            <Group key={item.status} gap={8}>
                                <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                <Text size="xs" c="gray.6" style={{ minWidth: 100 }}>{item.label}</Text>
                                <Text size="xs" c="dark" fw={600}>{pct}%</Text>
                            </Group>
                        )
                    })}
                </Stack>
            </Group>
        </Paper>
    )
}

// ═══════════════════════════════════════════════════
//  Tab Content Components
// ═══════════════════════════════════════════════════

function ServiceTab({ data }: { data: MonthlyTaxData[] }) {
    const total = data.length
    const pndStatuses = countStatuses(data, 'pnd_status')
    const pp30Statuses = countStatuses(data, 'pp30_form')

    // Status detail modal state
    const [detailModal, setDetailModal] = useState<{ status: string; label: string; color: string; type: 'wht' | 'vat' } | null>(null)
    const detailRecords = useMemo(() => {
        if (!detailModal) return []
        const field = detailModal.type === 'wht' ? 'pnd_status' : 'pp30_form'
        return data.filter(d => {
            const val = (d[field as keyof MonthlyTaxData] as string | null) || 'not_started'
            return val === detailModal.status
        })
    }, [data, detailModal])

    // WHT calculations
    const whtTotal = data.filter(d => d.pnd_status && d.pnd_status !== 'not_submitted').length
    const whtCompleted = data.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
    const whtRemaining = whtTotal - whtCompleted
    const whtPct = whtTotal > 0 ? Math.round((whtCompleted / whtTotal) * 1000) / 10 : 0

    // VAT calculations
    const vatTotal = data.filter(d => d.pp30_form && d.pp30_form !== 'not_started' && d.pp30_form !== 'not_submitted').length
    const vatCompleted = data.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
    const vatRemaining = vatTotal - vatCompleted
    const vatPct = vatTotal > 0 ? Math.round((vatCompleted / vatTotal) * 1000) / 10 : 0

    // Employee grouping
    const employeeStats = useMemo(() => {
        const map = new Map<string, { name: string; items: MonthlyTaxData[] }>()
        data.forEach(d => {
            const name = d.accounting_responsible_nick_name || d.accounting_responsible_first_name || 'ไม่ระบุ'
            const id = d.accounting_responsible || 'unknown'
            if (!map.has(id)) map.set(id, { name, items: [] })
            map.get(id)!.items.push(d)
        })
        return Array.from(map.values()).map(emp => {
            const wi = emp.items.filter(d => d.pnd_status && d.pnd_status !== 'not_submitted')
            const wd = wi.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
            const wc = wi.filter(d => CORRECTION_STATUSES.includes(d.pnd_status || '')).length
            const vi = emp.items.filter(d => d.pp30_form && d.pp30_form !== 'not_started' && d.pp30_form !== 'not_submitted')
            const vd = vi.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
            const vc = vi.filter(d => CORRECTION_STATUSES.includes(d.pp30_form || '')).length
            return {
                name: emp.name,
                whtTotal: wi.length, whtDone: wd, whtPct: wi.length > 0 ? Math.round((wd / wi.length) * 1000) / 10 : 0,
                whtCorr: wc, whtCorrPct: wi.length > 0 ? Math.round((wc / wi.length) * 1000) / 10 : 0,
                vatTotal: vi.length, vatDone: vd, vatPct: vi.length > 0 ? Math.round((vd / vi.length) * 1000) / 10 : 0,
                vatCorr: vc, vatCorrPct: vi.length > 0 ? Math.round((vc / vi.length) * 1000) / 10 : 0,
            }
        }).sort((a, b) => b.whtPct - a.whtPct)
    }, [data])

    const top3Wht = employeeStats.filter(e => e.whtTotal > 0).slice(0, 3)
    const top3Vat = [...employeeStats].sort((a, b) => b.vatPct - a.vatPct).filter(e => e.vatTotal > 0).slice(0, 3)

    const getRank = (pct: number, corrPct: number) => {
        const score = pct * 0.7 + (100 - corrPct) * 0.3
        if (score >= 90) return { letter: 'A', color: 'green', scorePct: score }
        if (score >= 75) return { letter: 'B', color: 'blue', scorePct: score }
        if (score >= 55) return { letter: 'C', color: 'orange', scorePct: score }
        return { letter: 'D', color: 'red', scorePct: score }
    }
    const getCorrLabel = (p: number) => {
        if (p === 0) return { text: 'ดีมาก', color: '#4caf50' }
        if (p <= 25) return { text: 'ดี', color: '#2196f3' }
        if (p <= 40) return { text: 'พอใช้', color: '#ff9800' }
        return { text: 'ควรปรับปรุง', color: '#f44336' }
    }
    const getCorrBg = (p: number) => p <= 25 ? '#e8f5e9' : p <= 50 ? '#fff3e0' : '#ffebee'
    const medals = ['🥇', '🥈', '🥉']

    // Unified orange/white theme
    const O = '#ff6b35' // primary orange
    const card = { background: '#fff', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'all 0.2s ease' }

    return (
        <Stack gap="md">
            {/* ═══ Section 1: สถานะลูกค้า ═══ */}
            <Paper p={{ base: 'sm', md: 'lg' }} radius="md" style={card} className="service-section service-card">
                <Group gap={8} mb="sm"><Text size="md">🏢</Text><Text size="md" fw={700} c="dark">สถานะลูกค้าทั้งหมด (รายเดือน)</Text></Group>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                    <Paper p="md" radius="md" className="hero-card" style={{ background: '#fff5f0', borderLeft: `4px solid ${O}` }}>
                        <Text size="xs" c="gray.6">รายเดือน</Text>
                        <Text fw={800} c={O} className="stat-number" style={{ fontSize: 28 }}>{total}</Text>
                        <Text size="xs" c={O} style={{ cursor: 'pointer' }}>คลิกเพื่อดูรายละเอียด →</Text>
                    </Paper>
                    <Paper p="md" radius="md" className="hero-card" style={{ background: '#fafafa', borderLeft: '4px solid #ddd', opacity: 0.6 }}>
                        <Text size="xs" c="gray.6">รายเดือน / จ่ายรายปี</Text>
                        <Text fw={800} c="gray.4" style={{ fontSize: 28 }}>—</Text>
                        <Text size="xs" c="gray.4">เร็วๆ นี้</Text>
                    </Paper>
                    <Paper p="md" radius="md" className="hero-card" style={{ background: '#fafafa', borderLeft: '4px solid #ddd', opacity: 0.6 }}>
                        <Text size="xs" c="gray.6">รายเดือน / วางมือ</Text>
                        <Text fw={800} c="gray.4" style={{ fontSize: 28 }}>—</Text>
                        <Text size="xs" c="gray.4">เร็วๆ นี้</Text>
                    </Paper>
                </SimpleGrid>
            </Paper>

            {/* ═══ Section 2: สรุป WHT + VAT + ความคืบหน้า ═══ */}
            <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={{ ...card, borderLeft: `4px solid ${O}` }}>
                    <Group gap={8} mb="sm"><Text size="md">📋</Text><Text size="md" fw={700} c={O}>สรุป WHT</Text></Group>
                    <Stack gap="xs">
                        <Group justify="space-between"><Text size="sm" c="gray.7">งานทั้งหมด</Text><Text size="lg" fw={700} c="dark">{whtTotal}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7">เสร็จแล้ว</Text><Text size="lg" fw={700} c="dark">{whtCompleted}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7">คงเหลือ</Text><Text size="lg" fw={700} c={O}>{whtRemaining}</Text></Group>
                    </Stack>
                </Paper>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={{ ...card, borderLeft: `4px solid ${O}` }}>
                    <Group gap={8} mb="sm"><Text size="md">📈</Text><Text size="md" fw={700} c={O}>สรุป VAT</Text></Group>
                    <Stack gap="xs">
                        <Group justify="space-between"><Text size="sm" c="gray.7">งานทั้งหมด</Text><Text size="lg" fw={700} c="dark">{vatTotal}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7">เสร็จแล้ว</Text><Text size="lg" fw={700} c="dark">{vatCompleted}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7">คงเหลือ</Text><Text size="lg" fw={700} c={O}>{vatRemaining}</Text></Group>
                    </Stack>
                </Paper>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={{ ...card, borderLeft: `4px solid ${O}` }}>
                    <Group gap={8} mb="md"><Text size="md">📊</Text><Text size="md" fw={700} c={O}>ความคืบหน้า</Text></Group>

                    {/* Dual ring progress */}
                    <Group justify="center" gap="xl" mb="md" wrap="wrap">
                        {/* WHT Ring */}
                        <Stack align="center" gap={4}>
                            <Box className="progress-ring" style={{ position: 'relative' }}>
                                <RingProgress
                                    size={120}
                                    thickness={10}
                                    roundCaps
                                    sections={[{ value: whtPct, color: O }]}
                                    label={
                                        <Stack align="center" gap={0}>
                                            <Text size="xl" fw={800} c={O} style={{ lineHeight: 1 }}>{whtPct}%</Text>
                                            <Text size="xs" c="gray.5">WHT</Text>
                                        </Stack>
                                    }
                                />
                            </Box>
                            <Group gap={6} mt={4}>
                                <Badge size="sm" variant="light" color="green" radius="xl">✓ {whtCompleted}</Badge>
                                <Badge size="sm" variant="light" color="gray" radius="xl">เหลือ {whtRemaining}</Badge>
                            </Group>
                            <Text size="xs" c="gray.5">ทั้งหมด {whtTotal} งาน</Text>
                        </Stack>

                        {/* Divider */}
                        <Divider orientation="vertical" style={{ height: 100, alignSelf: 'center' }} />

                        {/* VAT Ring */}
                        <Stack align="center" gap={4}>
                            <Box className="progress-ring" style={{ position: 'relative' }}>
                                <RingProgress
                                    size={120}
                                    thickness={10}
                                    roundCaps
                                    sections={[{ value: vatPct, color: '#ffa726' }]}
                                    label={
                                        <Stack align="center" gap={0}>
                                            <Text size="xl" fw={800} c="#ffa726" style={{ lineHeight: 1 }}>{vatPct}%</Text>
                                            <Text size="xs" c="gray.5">VAT</Text>
                                        </Stack>
                                    }
                                />
                            </Box>
                            <Group gap={6} mt={4}>
                                <Badge size="sm" variant="light" color="green" radius="xl">✓ {vatCompleted}</Badge>
                                <Badge size="sm" variant="light" color="gray" radius="xl">เหลือ {vatRemaining}</Badge>
                            </Group>
                            <Text size="xs" c="gray.5">ทั้งหมด {vatTotal} งาน</Text>
                        </Stack>
                    </Group>

                    {/* Combined progress bar */}
                    <Box mt="xs">
                        <Group justify="space-between" mb={4}>
                            <Text size="xs" c="gray.6">ภาพรวมทั้งหมด</Text>
                            <Text size="xs" fw={600} c={O}>{(whtTotal + vatTotal) > 0 ? Math.round(((whtCompleted + vatCompleted) / (whtTotal + vatTotal)) * 1000) / 10 : 0}%</Text>
                        </Group>
                        <Progress.Root size="sm" radius="xl">
                            <Progress.Section value={(whtTotal + vatTotal) > 0 ? ((whtCompleted + vatCompleted) / (whtTotal + vatTotal)) * 100 : 0} color="orange" />
                        </Progress.Root>
                    </Box>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 3: 3 อันดับแรก WHT + VAT ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={card}>
                    <Group gap={8} mb="sm"><Text size="md">🏆</Text><Text size="md" fw={700} c="dark">3 อันดับแรกของ WHT</Text></Group>
                    <Stack gap="sm">
                        {top3Wht.map((emp, i) => {
                            const rank = getRank(emp.whtPct, emp.whtCorrPct)
                            const cl = getCorrLabel(emp.whtCorrPct)
                            const rankCol = rank.color === 'green' ? '#4caf50' : rank.color === 'blue' ? '#2196f3' : rank.color === 'orange' ? '#ff9800' : '#f44336'
                            return (
                                <Paper key={emp.name} p="sm" radius="md" withBorder className="rank-card" style={{ borderLeft: `4px solid ${rankCol}` }}>
                                    <Group justify="space-between" wrap="wrap" mb="xs">
                                        <Group gap={8}><Text>{medals[i]}</Text><Text fw={700} c="dark">{emp.name}</Text></Group>
                                        <Group gap={6}>
                                            <Badge size="sm" color="green" variant="filled">เสร็จ {emp.whtDone}</Badge>
                                            <Badge size="sm" color={rank.color} variant="filled">แรงค์ {rank.letter}</Badge>
                                        </Group>
                                    </Group>
                                    <Stack gap={6}>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% งาน</Text><Text size="xs" fw={600} c={O}>{emp.whtPct}%</Text></Group><Progress value={emp.whtPct} color="orange" size="sm" radius="xl" /></Box>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% การแก้ไข</Text><Text size="xs" fw={600} c="gray.7">{emp.whtCorrPct}%</Text></Group><Progress value={emp.whtCorrPct} color="gray" size="sm" radius="xl" /></Box>
                                        <Group justify="space-between"><Text size="xs" c="gray.5">แก้ไข: {emp.whtCorr} ครั้ง</Text><Text size="xs" fw={500} c={cl.color}>{cl.text}</Text></Group>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% แรงค์</Text><Text size="xs" fw={600} c="#4caf50">{Math.round(rank.scorePct * 100) / 100}%</Text></Group><Progress value={rank.scorePct} color="green" size="sm" radius="xl" /></Box>
                                    </Stack>
                                </Paper>
                            )
                        })}
                        {top3Wht.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>

                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={card}>
                    <Group gap={8} mb="sm"><Text size="md">🏆</Text><Text size="md" fw={700} c="dark">3 อันดับแรกของ VAT</Text></Group>
                    <Stack gap="sm">
                        {top3Vat.map((emp, i) => {
                            const rank = getRank(emp.vatPct, emp.vatCorrPct)
                            const cl = getCorrLabel(emp.vatCorrPct)
                            const rankCol = rank.color === 'green' ? '#4caf50' : rank.color === 'blue' ? '#2196f3' : rank.color === 'orange' ? '#ff9800' : '#f44336'
                            return (
                                <Paper key={emp.name} p="sm" radius="md" withBorder className="rank-card" style={{ borderLeft: `4px solid ${rankCol}` }}>
                                    <Group justify="space-between" wrap="wrap" mb="xs">
                                        <Group gap={8}><Text>{medals[i]}</Text><Text fw={700} c="dark">{emp.name}</Text></Group>
                                        <Group gap={6}>
                                            <Badge size="sm" color="green" variant="filled">เสร็จ {emp.vatDone}</Badge>
                                            <Badge size="sm" color={rank.color} variant="filled">แรงค์ {rank.letter}</Badge>
                                        </Group>
                                    </Group>
                                    <Stack gap={6}>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% งาน</Text><Text size="xs" fw={600} c={O}>{emp.vatPct}%</Text></Group><Progress value={emp.vatPct} color="orange" size="sm" radius="xl" /></Box>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% การแก้ไข</Text><Text size="xs" fw={600} c="gray.7">{emp.vatCorrPct}%</Text></Group><Progress value={emp.vatCorrPct} color="gray" size="sm" radius="xl" /></Box>
                                        <Group justify="space-between"><Text size="xs" c="gray.5">แก้ไข: {emp.vatCorr} ครั้ง</Text><Text size="xs" fw={500} c={cl.color}>{cl.text}</Text></Group>
                                        <Box><Group justify="space-between" mb={2}><Text size="xs" c="gray.6">% แรงค์</Text><Text size="xs" fw={600} c="#4caf50">{Math.round(rank.scorePct * 100) / 100}%</Text></Group><Progress value={rank.scorePct} color="green" size="sm" radius="xl" /></Box>
                                    </Stack>
                                </Paper>
                            )
                        })}
                        {top3Vat.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 4: สถานะงาน WHT + VAT ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={card}>
                    <Group gap={8} mb="sm"><Text size="md">📋</Text><Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีหัก ณ ที่จ่าย (WHT)</Text></Box></Group>
                    <Box style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                        <Group px="sm" py="xs" style={{ background: O }}>
                            <Text size="xs" fw={700} c="white" style={{ flex: 1 }}>สถานะ</Text>
                            <Text size="xs" fw={700} c="white" w={50} ta="right">จำนวน</Text>
                        </Group>
                        {pndStatuses.map((s, i) => (
                            <Group key={s.status} px="sm" py={8} onClick={() => setDetailModal({ status: s.status, label: s.label, color: s.color, type: 'wht' })} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.15s' }}>
                                <Group style={{ flex: 1 }} gap={8}>
                                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                                    <Text size="sm" c="dark">{s.label}</Text>
                                </Group>
                                <Badge size="sm" variant="light" color="orange" radius="xl">{s.count} →</Badge>
                            </Group>
                        ))}
                    </Box>
                </Paper>
                <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={card}>
                    <Group gap={8} mb="sm"><Text size="md">📋</Text><Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีมูลค่าเพิ่ม (VAT)</Text></Box></Group>
                    <Box style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                        <Group px="sm" py="xs" style={{ background: O }}>
                            <Text size="xs" fw={700} c="white" style={{ flex: 1 }}>สถานะ</Text>
                            <Text size="xs" fw={700} c="white" w={50} ta="right">จำนวน</Text>
                        </Group>
                        {pp30Statuses.map((s, i) => (
                            <Group key={s.status} px="sm" py={8} onClick={() => setDetailModal({ status: s.status, label: s.label, color: s.color, type: 'vat' })} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.15s' }}>
                                <Group style={{ flex: 1 }} gap={8}>
                                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                                    <Text size="sm" c="dark">{s.label}</Text>
                                </Group>
                                <Badge size="sm" variant="light" color="orange" radius="xl">{s.count} →</Badge>
                            </Group>
                        ))}
                    </Box>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 5: ตารางพนักงาน ═══ */}
            <Paper p={{ base: 'sm', md: 'lg' }} radius="md" className="service-section service-card" style={card}>
                <Group gap={8} mb="sm"><Text size="md">👥</Text><Box><Text size="md" fw={700} c="dark">สถานะงาน WHT และ VAT รายบุคคล</Text><Text size="xs" c="gray.5">สรุปผลงานและการแก้ไขของพนักงานแต่ละคน</Text></Box></Group>
                <ScrollArea>
                    <Table withColumnBorders style={{ minWidth: 850, borderCollapse: 'separate', borderSpacing: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                        <Table.Thead>
                            <Table.Tr className="emp-table-header">
                                {(() => {
                                    const hd = { background: O, color: '#fff', fontSize: 11, fontWeight: 700 as const, textAlign: 'center' as const, padding: '10px 8px' }; return (<>
                                        <Table.Th style={{ ...hd, textAlign: 'left', padding: '10px 12px' }}>พนักงาน</Table.Th>
                                        <Table.Th style={hd}>WHT<br />ทั้งหมด</Table.Th>
                                        <Table.Th style={hd}>WHT<br />เสร็จ</Table.Th>
                                        <Table.Th style={hd}>% WHT</Table.Th>
                                        <Table.Th style={hd}>VAT<br />ทั้งหมด</Table.Th>
                                        <Table.Th style={hd}>VAT<br />เสร็จ</Table.Th>
                                        <Table.Th style={hd}>% VAT</Table.Th>
                                        <Table.Th style={hd}>แก้ไข<br />WHT</Table.Th>
                                        <Table.Th style={hd}>% แก้ไข<br />WHT</Table.Th>
                                        <Table.Th style={hd}>แก้ไข<br />VAT</Table.Th>
                                        <Table.Th style={hd}>% แก้ไข<br />VAT</Table.Th>
                                    </>)
                                })()}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {employeeStats.map((emp, idx) => {
                                const wCl = getCorrLabel(emp.whtCorrPct)
                                const vCl = getCorrLabel(emp.vatCorrPct)
                                return (
                                    <Table.Tr key={emp.name} className="emp-table-row" style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <Table.Td style={{ padding: '8px 12px' }}>
                                            <Group gap={6}>
                                                <Box style={{ width: 24, height: 24, borderRadius: '50%', background: O, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text size="xs" c="white" fw={700}>{emp.name.charAt(0)}</Text>
                                                </Box>
                                                <Text size="sm" fw={600} c="dark">{emp.name}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.whtTotal}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.whtDone}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}>
                                            <Badge size="sm" variant="light" color={emp.whtPct >= 80 ? 'green' : emp.whtPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.whtPct}%</Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.vatTotal}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.vatDone}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}>
                                            <Badge size="sm" variant="light" color={emp.vatPct >= 80 ? 'green' : emp.vatPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.vatPct}%</Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.whtCorr}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px', background: getCorrBg(emp.whtCorrPct) + '40' }}>
                                            <Text size="xs" fw={600} c={wCl.color}>{emp.whtCorrPct}% {wCl.text}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px' }}><Text size="sm">{emp.vatCorr}</Text></Table.Td>
                                        <Table.Td style={{ textAlign: 'center', padding: '8px 6px', background: getCorrBg(emp.vatCorrPct) + '40' }}>
                                            <Text size="xs" fw={600} c={vCl.color}>{emp.vatCorrPct}% {vCl.text}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>

            {/* ═══ Status Detail Modal ═══ */}
            <Modal
                opened={!!detailModal}
                onClose={() => setDetailModal(null)}
                title={
                    detailModal ? (
                        <Group gap={8}>
                            <Box style={{ width: 10, height: 10, borderRadius: 3, background: detailModal.color }} />
                            <Text fw={700} size="md">{detailModal.label}</Text>
                            <Badge size="sm" variant="light" color={detailModal.type === 'wht' ? 'orange' : 'yellow'}>{detailModal.type === 'wht' ? 'WHT' : 'VAT'}</Badge>
                            <Badge size="sm" variant="filled" color="gray">{detailRecords.length} รายการ</Badge>
                        </Group>
                    ) : null
                }
                size={detailModal?.status === 'passed' ? 'xl' : 'lg'}
                centered
            >
                {detailRecords.length > 0 ? (
                    <ScrollArea>
                        <Table withColumnBorders withTableBorder style={{ minWidth: detailModal?.status === 'passed' ? 700 : 500 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>#</Table.Th>
                                    <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>Build Code</Table.Th>
                                    <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>ชื่อบริษัท</Table.Th>
                                    <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>ผู้รับผิดชอบทำบัญชี</Table.Th>
                                    {detailModal?.status === 'passed' && <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>ผู้ยื่น WHT</Table.Th>}
                                    {detailModal?.status === 'passed' && <Table.Th style={{ background: '#ff6b35', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 12px' }}>ผู้ยื่น VAT</Table.Th>}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {detailRecords.map((rec, idx) => (
                                    <Table.Tr key={rec.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <Table.Td style={{ padding: '6px 12px' }}><Text size="sm" c="gray.6">{idx + 1}</Text></Table.Td>
                                        <Table.Td style={{ padding: '6px 12px' }}><Text size="sm" fw={600} c="dark">{rec.build}</Text></Table.Td>
                                        <Table.Td style={{ padding: '6px 12px' }}><Text size="sm" c="dark">{rec.company_name || '-'}</Text></Table.Td>
                                        <Table.Td style={{ padding: '6px 12px' }}>
                                            <Text size="sm" c="dark">
                                                {rec.accounting_responsible_nick_name || rec.accounting_responsible_first_name || rec.accounting_responsible || '-'}
                                            </Text>
                                        </Table.Td>
                                        {detailModal?.status === 'passed' && (
                                            <Table.Td style={{ padding: '6px 12px' }}>
                                                <Text size="sm" c="dark">
                                                    {rec.wht_filer_employee_nick_name || rec.wht_filer_employee_first_name || rec.wht_filer_employee_name || '-'}
                                                </Text>
                                            </Table.Td>
                                        )}
                                        {detailModal?.status === 'passed' && (
                                            <Table.Td style={{ padding: '6px 12px' }}>
                                                <Text size="sm" c="dark">
                                                    {rec.vat_filer_employee_nick_name || rec.vat_filer_employee_first_name || rec.vat_filer_employee_name || '-'}
                                                </Text>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                ) : (
                    <Center h={80}><Text c="gray.4" size="sm">ไม่มีข้อมูล</Text></Center>
                )}
            </Modal>
        </Stack>
    )
}

function AuditTab({ data }: { data: MonthlyTaxData[] }) {
    const total = data.length
    const pndStatuses = countStatuses(data, 'pnd_status')
    const pp30Statuses = countStatuses(data, 'pp30_form')

    const passed = data.filter(d => d.pnd_status === 'passed').length
    const needsCorrection = data.filter(d => d.pnd_status === 'needs_correction' || d.pnd_status === 'edit').length
    const inquireCustomer = data.filter(d => d.pnd_status === 'inquire_customer').length
    const additionalReview = data.filter(d => d.pnd_status === 'additional_review').length

    return (
        <Stack gap="lg">
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <SummaryCard title="งานตรวจทั้งหมด" value={total} total={total} color="#ff6b35" icon="📋" />
                <SummaryCard title="ผ่าน" value={passed} total={total} color="#4caf50" icon="✅" />
                <SummaryCard title="แก้ไข" value={needsCorrection} total={total} color="#f44336" icon="🔴" />
                <SummaryCard title="สอบถามลูกค้า" value={inquireCustomer} total={total} color="#9c27b0" icon="💬" />
            </SimpleGrid>
            <StatusBarChart data={pndStatuses} title="Status Distribution / การกระจายสถานะ ภ.ง.ด." />
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <StatusDonutChart
                    data={pndStatuses}
                    title="WHT (ภ.ง.ด.) Status Summary"
                    subtitle="สรุปสถานะการตรวจภาษีหัก ณ ที่จ่าย"
                    total={total}
                />
                <StatusDonutChart
                    data={pp30Statuses}
                    title="VAT (ภ.พ.30) Status Summary"
                    subtitle="สรุปสถานะการตรวจภาษีมูลค่าเพิ่ม"
                    total={total}
                />
            </SimpleGrid>
        </Stack>
    )
}

function SendTaxTab({ data }: { data: MonthlyTaxData[] }) {
    const total = data.length
    const pndStatuses = countStatuses(data, 'pnd_status')
    const pp30Statuses = countStatuses(data, 'pp30_form')

    const paid = data.filter(d => d.pnd_status === 'paid').length
    const receivedReceipt = data.filter(d => d.pnd_status === 'received_receipt').length
    const sentToCustomer = data.filter(d => d.pnd_status === 'sent_to_customer').length
    const draftCompleted = data.filter(d => d.pnd_status === 'draft_completed').length

    return (
        <Stack gap="lg">
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <SummaryCard title="งานยื่นทั้งหมด" value={total} total={total} color="#ff6b35" icon="📤" />
                <SummaryCard title="ชำระแล้ว" value={paid} total={total} color="#ffc107" icon="💰" />
                <SummaryCard title="รับใบเสร็จ" value={receivedReceipt} total={total} color="#4facfe" icon="🧾" />
                <SummaryCard title="ส่งลูกค้าแล้ว" value={sentToCustomer} total={total} color="#81d4fa" icon="📬" />
            </SimpleGrid>
            <StatusBarChart data={pndStatuses} title="Status Distribution / การกระจายสถานะ ภ.ง.ด." />
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <StatusDonutChart
                    data={pndStatuses}
                    title="WHT (ภ.ง.ด.) Status Summary"
                    subtitle="สรุปสถานะการยื่นภาษีหัก ณ ที่จ่าย"
                    total={total}
                />
                <StatusDonutChart
                    data={pp30Statuses}
                    title="VAT (ภ.พ.30) Status Summary"
                    subtitle="สรุปสถานะการยื่นภาษีมูลค่าเพิ่ม"
                    total={total}
                />
            </SimpleGrid>
        </Stack>
    )
}

function DataEntryTab({ data }: { data: MonthlyTaxData[] }) {
    const total = data.length
    const pndStatuses = countStatuses(data, 'pnd_status')
    const pp30Statuses = countStatuses(data, 'pp30_form')

    const hasDocReceived = data.filter(d => d.document_received_date).length
    const noDocReceived = total - hasDocReceived

    // Attachment form counts
    const formFields = [
        { key: 'pnd_1_40_1_attachment_count' as keyof MonthlyTaxData, label: 'ภ.ง.ด.1 (40(1))' },
        { key: 'pnd_1_40_2_attachment_count' as keyof MonthlyTaxData, label: 'ภ.ง.ด.1 (40(2))' },
        { key: 'pnd_3_attachment_count' as keyof MonthlyTaxData, label: 'ภ.ง.ด.3' },
        { key: 'pnd_53_attachment_count' as keyof MonthlyTaxData, label: 'ภ.ง.ด.53' },
        { key: 'pp_36_attachment_count' as keyof MonthlyTaxData, label: 'ภ.พ.36' },
        { key: 'social_security_form_attachment_count' as keyof MonthlyTaxData, label: 'ประกันสังคม' },
    ]

    const attachmentData = formFields.map(f => ({
        label: f.label,
        count: data.reduce((sum, d) => sum + ((d[f.key] as number) || 0), 0),
        color: '#4facfe',
    }))

    return (
        <Stack gap="lg">
            <SimpleGrid cols={{ base: 2, sm: 3 }}>
                <SummaryCard title="ลูกค้าที่ต้องคีย์" value={total} total={total} color="#ff6b35" icon="⌨️" />
                <SummaryCard title="ได้รับเอกสารแล้ว" value={hasDocReceived} total={total} color="#4caf50" icon="📥" />
                <SummaryCard title="ยังไม่ได้รับเอกสาร" value={noDocReceived} total={total} color="#f44336" icon="⏳" />
            </SimpleGrid>
            <StatusBarChart
                data={attachmentData.map(d => ({ ...d, status: d.label }))}
                title="จำนวนใบแนบรวม (Attachment Count) แยกตามแบบฟอร์ม"
            />
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <StatusDonutChart
                    data={pndStatuses}
                    title="WHT (ภ.ง.ด.) Status Summary"
                    subtitle="สรุปสถานะภาษีหัก ณ ที่จ่าย"
                    total={total}
                />
                <StatusDonutChart
                    data={pp30Statuses}
                    title="VAT (ภ.พ.30) Status Summary"
                    subtitle="สรุปสถานะภาษีมูลค่าเพิ่ม"
                    total={total}
                />
            </SimpleGrid>
        </Stack>
    )
}

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

const TAB_CONFIG: { key: TabKey; label: string }[] = [
    { key: 'service', label: 'Service' },
    { key: 'audit', label: 'Audit' },
    { key: 'sendTax', label: 'Send Tax' },
    { key: 'dataEntry', label: 'Data Entry' },
]

export default function AccountingDashboard() {
    const { year: defaultYear, month: defaultMonth } = getCurrentTaxMonth()
    const [selectedYear, setSelectedYear] = useState(String(defaultYear))
    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonth))
    const [activeTab, setActiveTab] = useState<TabKey>('service')
    const [autoRefresh, setAutoRefresh] = useState(false)

    // Year options — current year ± 2
    const yearOptions = useMemo(() => {
        const now = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => {
            const y = now - 2 + i
            return { value: String(y), label: `${y + 543}` } // แสดงเป็น พ.ศ.
        })
    }, [])

    // Month options
    const monthOptions = useMemo(() =>
        THAI_MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
        []
    )

    // Fetch data
    const { data: listData, isLoading, isError, error, refetch } = useQuery(
        ['accounting-dashboard', selectedYear, selectedMonth],
        () => monthlyTaxDataService.getList({
            year: selectedYear,
            month: selectedMonth,
            limit: 9999,
        }),
        {
            staleTime: 60_000,
            cacheTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount: number, err: any) => {
                if (err?.response?.status >= 400 && err?.response?.status < 500) return false
                return failureCount < 2
            },
        }
    )

    const records = listData?.data || []

    // Auto-refresh interval
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => refetch(), 30_000)
        return () => clearInterval(interval)
    }, [autoRefresh, refetch])

    const handleRefresh = useCallback(() => refetch(), [refetch])

    // ────────────────────────────────────────────
    //  Render
    // ────────────────────────────────────────────

    return (
        <Box p="md" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            {/* Header */}
            <Paper
                p="md"
                radius="lg"
                mb="lg"
                shadow="sm"
                style={{
                    background: '#ffffff',
                    borderTop: '3px solid #ff6b35',
                }}
            >
                <Group justify="space-between" wrap="wrap">
                    {/* Tabs */}
                    <Group gap={0}>
                        {TAB_CONFIG.map(tab => (
                            <Box
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '8px 20px',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab.key ? '3px solid #ff6b35' : '3px solid transparent',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <Text
                                    size="sm"
                                    fw={activeTab === tab.key ? 700 : 400}
                                    c={activeTab === tab.key ? '#ff6b35' : 'gray.6'}
                                >
                                    {tab.label}
                                </Text>
                            </Box>
                        ))}
                    </Group>

                    {/* Filters */}
                    <Group gap="sm">
                        <Select
                            size="xs"
                            w={120}
                            value={selectedMonth}
                            onChange={(v) => v && setSelectedMonth(v)}
                            data={monthOptions}
                            styles={{
                                input: { background: '#fff', borderColor: '#e0e0e0' },
                                option: { '&[data-selected]': { background: '#ff6b35' } },
                            }}
                        />
                        <Select
                            size="xs"
                            w={90}
                            value={selectedYear}
                            onChange={(v) => v && setSelectedYear(v)}
                            data={yearOptions}
                            styles={{
                                input: { background: '#fff', borderColor: '#e0e0e0' },
                                option: { '&[data-selected]': { background: '#ff6b35' } },
                            }}
                        />
                        <Tooltip label="รีเฟรช">
                            <ActionIcon
                                variant="subtle"
                                color="orange"
                                onClick={handleRefresh}
                                loading={isLoading}
                            >
                                <TbRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Switch
                            size="xs"
                            label={<Text size="xs" c="gray.6">Auto</Text>}
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                            color="orange"
                        />
                    </Group>
                </Group>

                {/* Summary info */}
                <Group gap="lg" mt="sm">
                    <Badge size="sm" variant="dot" color="orange">
                        {THAI_MONTHS[parseInt(selectedMonth) - 1]} {parseInt(selectedYear) + 543}
                    </Badge>
                    <Text size="xs" c="gray.6">
                        ข้อมูลทั้งหมด: {records.length} บริษัท
                    </Text>
                    {autoRefresh && (
                        <Text size="xs" c="gray.5">
                            🔄 รีเฟรชอัตโนมัติทุก 30 วินาที
                        </Text>
                    )}
                </Group>
            </Paper>

            {/* Content */}
            {isLoading ? (
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" color="orange" />
                        <Text c="gray.6" size="sm">กำลังโหลดข้อมูล...</Text>
                    </Stack>
                </Center>
            ) : isError ? (
                <Alert icon={<TbAlertCircle />} title="เกิดข้อผิดพลาด" color="red" radius="lg">
                    {(error as any)?.message || 'ไม่สามารถโหลดข้อมูลได้'}
                </Alert>
            ) : records.length === 0 ? (
                <Center h={300}>
                    <Stack align="center" gap="md">
                        <Text size="xl">📊</Text>
                        <Text c="gray.6" size="sm">ไม่พบข้อมูลสำหรับเดือนนี้</Text>
                    </Stack>
                </Center>
            ) : (
                <>
                    {activeTab === 'service' && <ServiceTab data={records} />}
                    {activeTab === 'audit' && <AuditTab data={records} />}
                    {activeTab === 'sendTax' && <SendTaxTab data={records} />}
                    {activeTab === 'dataEntry' && <DataEntryTab data={records} />}
                </>
            )}
        </Box>
    )
}
