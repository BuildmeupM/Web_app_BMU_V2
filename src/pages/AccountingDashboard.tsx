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
import {
    BuildingIcon, ClipboardIcon, ChartIcon, TrophyIcon,
    UsersIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon,
    PieChartIcon
} from '../components/AccountingIcons'
import './AccountingDashboard.css'

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

const WHT_COMPLETED_STATUSES = ['sent_to_customer', 'paid', 'received_receipt']
const VAT_COMPLETED_STATUSES = ['sent_to_customer', 'paid', 'received_receipt']
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

// ลำดับสถานะตามความเสร็จของงาน (เสร็จมาก → เสร็จน้อย)
const STATUS_ORDER: string[] = [
    'received_receipt',     // รับใบเสร็จ
    'paid',                 // ชำระแล้ว
    'sent_to_customer',     // ส่งลูกค้าแล้ว
    'passed',               // ผ่าน
    'pending_review',       // รอตรวจ
    'needs_correction',     // แก้ไข
    'edit',                 // แก้ไข
    'pending_recheck',      // รอตรวจอีกครั้ง
    'draft_completed',      // ร่างแบบเสร็จแล้ว
    'draft_ready',          // ร่างแบบได้
    'inquire_customer',     // สอบถามลูกค้าเพิ่มเติม
    'additional_review',    // ตรวจสอบเพิ่มเติม
    'not_submitted',        // ไม่มียื่น
    'not_started',          // ยังไม่ดำเนินการ
]

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
        .sort((a, b) => {
            const ia = STATUS_ORDER.indexOf(a.status)
            const ib = STATUS_ORDER.indexOf(b.status)
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
        })
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
            className="acct-glass-card"
            style={{ minHeight: 150 }}
        >
            <Stack gap="xs" align="center">
                <Group gap={6}>
                    {icon && <div className="acct-section-icon" style={{ width: 28, height: 28, fontSize: 14 }}>{icon}</div>}
                    <Text size="xs" c="gray.6" fw={600} ta="center">{title}</Text>
                </Group>
                <RingProgress
                    size={80}
                    thickness={6}
                    roundCaps
                    sections={[{ value: pct, color }]}
                    label={
                        <Text ta="center" fw={800} size="lg" c="dark" className="acct-summary-value" style={{ fontSize: 20 }}>
                            {value}
                        </Text>
                    }
                />
                <Text size="xs" c="gray.5" fw={600}>{pct}%</Text>
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
            className="acct-glass-card"
        >
            <Group gap={8} mb="md">
                <div className="acct-section-icon"><ChartIcon /></div>
                <Text size="sm" fw={700} c="dark">{title}</Text>
            </Group>
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
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #f0f0f0',
                            borderRadius: 12,
                            color: '#333',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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
            className="acct-glass-card"
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

    // Employee detail modal state
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)

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

    // Helper: format employee name as ชื่อ(ชื่อเล่น)
    const fmtName = (firstName?: string | null, nickName?: string | null) => {
        const f = firstName || ''
        const n = nickName || ''
        if (f && n) return `${f}(${n})`
        return f || n || 'ไม่ระบุ'
    }

    // Employee grouping
    const employeeStats = useMemo(() => {
        const map = new Map<string, { name: string; id: string; items: MonthlyTaxData[] }>()
        data.forEach(d => {
            const name = fmtName(d.accounting_responsible_first_name, d.accounting_responsible_nick_name)
            const id = d.accounting_responsible || 'unknown'
            if (!map.has(id)) map.set(id, { name, id, items: [] })
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
                id: emp.id,
                items: emp.items,
                whtTotal: wi.length, whtDone: wd, whtPct: wi.length > 0 ? Math.round((wd / wi.length) * 1000) / 10 : 0,
                whtCorr: wc, whtCorrPct: wi.length > 0 ? Math.round((wc / wi.length) * 1000) / 10 : 0,
                vatTotal: vi.length, vatDone: vd, vatPct: vi.length > 0 ? Math.round((vd / vi.length) * 1000) / 10 : 0,
                vatCorr: vc, vatCorrPct: vi.length > 0 ? Math.round((vc / vi.length) * 1000) / 10 : 0,
            }
        }).sort((a, b) => b.whtPct - a.whtPct)
    }, [data])

    // Selected employee detail data
    const selectedEmpData = useMemo(() => {
        if (!selectedEmployee) return null
        return employeeStats.find(e => e.id === selectedEmployee) || null
    }, [selectedEmployee, employeeStats])

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
    const medals = [<GoldMedalIcon key="gold" />, <SilverMedalIcon key="silver" />, <BronzeMedalIcon key="bronze" />]

    // Unified orange/white theme
    const O = '#ff6b35' // primary orange

    return (
        <Stack gap="lg">
            {/* ═══ Section 1: สถานะลูกค้า ═══ */}
            <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card acct-animate acct-animate-1">
                <Group gap={8} mb="md"><div className="acct-section-icon"><BuildingIcon /></div><Text size="md" fw={700} c="dark">สถานะลูกค้าทั้งหมด (รายเดือน)</Text></Group>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                    <div className="acct-hero-card">
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน</Text>
                        <Text className="acct-stat-number">{total}</Text>
                        <Text size="xs" c={O} fw={500} style={{ cursor: 'pointer' }}>คลิกเพื่อดูรายละเอียด →</Text>
                    </div>
                    <div className="acct-hero-card acct-hero-card--disabled">
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน / จ่ายรายปี</Text>
                        <Text fw={800} c="gray.4" style={{ fontSize: 32, lineHeight: 1 }}>—</Text>
                        <Text size="xs" c="gray.4">เร็วๆ นี้</Text>
                    </div>
                    <div className="acct-hero-card acct-hero-card--disabled">
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน / วางมือ</Text>
                        <Text fw={800} c="gray.4" style={{ fontSize: 32, lineHeight: 1 }}>—</Text>
                        <Text size="xs" c="gray.4">เร็วๆ นี้</Text>
                    </div>
                </SimpleGrid>
            </Paper>

            {/* ═══ Section 2: สรุป WHT + VAT + ความคืบหน้า ═══ */}
            <SimpleGrid cols={{ base: 1, md: 3 }} className="acct-animate acct-animate-2">
                <div className="acct-summary-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><ClipboardIcon /></div><Text size="md" fw={700} c={O}>สรุป WHT</Text></Group>
                    <Stack gap="xs">
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>งานทั้งหมด</Text><Text size="lg" fw={800} c="dark">{whtTotal}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>เสร็จแล้ว</Text><Text size="lg" fw={800} c="dark">{whtCompleted}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>คงเหลือ</Text><Text size="lg" fw={800} c={O}>{whtRemaining}</Text></Group>
                    </Stack>
                </div>
                <div className="acct-summary-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><ChartIcon /></div><Text size="md" fw={700} c={O}>สรุป VAT</Text></Group>
                    <Stack gap="xs">
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>งานทั้งหมด</Text><Text size="lg" fw={800} c="dark">{vatTotal}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>เสร็จแล้ว</Text><Text size="lg" fw={800} c="dark">{vatCompleted}</Text></Group>
                        <Divider />
                        <Group justify="space-between"><Text size="sm" c="gray.7" fw={500}>คงเหลือ</Text><Text size="lg" fw={800} c={O}>{vatRemaining}</Text></Group>
                    </Stack>
                </div>
                <div className="acct-summary-card">
                    <Group gap={8} mb="md"><div className="acct-section-icon"><PieChartIcon /></div><Text size="md" fw={700} c={O}>ความคืบหน้า</Text></Group>

                    {/* Dual ring progress */}
                    <Group justify="center" gap="xl" mb="md" wrap="wrap">
                        {/* WHT Ring */}
                        <Stack align="center" gap={4}>
                            <Box className="acct-ring-container">
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
                            <Box className="acct-ring-container">
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
                            <Text size="xs" c="gray.6" fw={500}>ภาพรวมทั้งหมด</Text>
                            <Text size="xs" fw={700} c={O}>{(whtTotal + vatTotal) > 0 ? Math.round(((whtCompleted + vatCompleted) / (whtTotal + vatTotal)) * 1000) / 10 : 0}%</Text>
                        </Group>
                        <Progress.Root size="sm" radius="xl">
                            <Progress.Section value={(whtTotal + vatTotal) > 0 ? ((whtCompleted + vatCompleted) / (whtTotal + vatTotal)) * 100 : 0} color="orange" />
                        </Progress.Root>
                    </Box>
                </div>
            </SimpleGrid>

            {/* ═══ Section 3: 3 อันดับแรก WHT + VAT ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }} className="acct-animate acct-animate-3">
                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><TrophyIcon /></div><Text size="md" fw={700} c="dark">3 อันดับแรกของ WHT</Text></Group>
                    <Stack gap="sm">
                        {top3Wht.map((emp, i) => {
                            const rank = getRank(emp.whtPct, emp.whtCorrPct)
                            const cl = getCorrLabel(emp.whtCorrPct)
                            const trophyClass = i === 0 ? 'acct-trophy-card--gold' : i === 1 ? 'acct-trophy-card--silver' : 'acct-trophy-card--bronze'
                            const medalClass = i === 0 ? 'acct-trophy-medal--gold' : i === 1 ? 'acct-trophy-medal--silver' : 'acct-trophy-medal--bronze'
                            return (
                                <div key={emp.name} className={`acct-trophy-card ${trophyClass}`}>
                                    <Group justify="space-between" wrap="wrap" mb="xs">
                                        <Group gap={10}>
                                            <div className={`acct-trophy-medal ${medalClass}`}>{medals[i]}</div>
                                            <Text fw={700} c="dark">{emp.name}</Text>
                                        </Group>
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
                                </div>
                            )
                        })}
                        {top3Wht.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>

                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><TrophyIcon /></div><Text size="md" fw={700} c="dark">3 อันดับแรกของ VAT</Text></Group>
                    <Stack gap="sm">
                        {top3Vat.map((emp, i) => {
                            const rank = getRank(emp.vatPct, emp.vatCorrPct)
                            const cl = getCorrLabel(emp.vatCorrPct)
                            const trophyClass = i === 0 ? 'acct-trophy-card--gold' : i === 1 ? 'acct-trophy-card--silver' : 'acct-trophy-card--bronze'
                            const medalClass = i === 0 ? 'acct-trophy-medal--gold' : i === 1 ? 'acct-trophy-medal--silver' : 'acct-trophy-medal--bronze'
                            return (
                                <div key={emp.name} className={`acct-trophy-card ${trophyClass}`}>
                                    <Group justify="space-between" wrap="wrap" mb="xs">
                                        <Group gap={10}>
                                            <div className={`acct-trophy-medal ${medalClass}`}>{medals[i]}</div>
                                            <Text fw={700} c="dark">{emp.name}</Text>
                                        </Group>
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
                                </div>
                            )
                        })}
                        {top3Vat.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 4: สถานะงาน WHT + VAT ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }} className="acct-animate acct-animate-4">
                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><ClipboardIcon /></div><Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีหัก ณ ที่จ่าย (WHT)</Text></Box></Group>
                    <Stack gap={0}>
                        {pndStatuses.map((s) => (
                            <div key={s.status} className="acct-status-row" onClick={() => setDetailModal({ status: s.status, label: s.label, color: s.color, type: 'wht' })}>
                                <div className="acct-status-dot" style={{ background: s.color }} />
                                <Text size="sm" c="dark" fw={500} style={{ flex: 1, marginLeft: 10 }}>{s.label}</Text>
                                <Badge size="sm" variant="light" color="orange" radius="xl">{s.count} →</Badge>
                            </div>
                        ))}
                    </Stack>
                </Paper>
                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon"><ClipboardIcon /></div><Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีมูลค่าเพิ่ม (VAT)</Text></Box></Group>
                    <Stack gap={0}>
                        {pp30Statuses.map((s) => (
                            <div key={s.status} className="acct-status-row" onClick={() => setDetailModal({ status: s.status, label: s.label, color: s.color, type: 'vat' })}>
                                <div className="acct-status-dot" style={{ background: s.color }} />
                                <Text size="sm" c="dark" fw={500} style={{ flex: 1, marginLeft: 10 }}>{s.label}</Text>
                                <Badge size="sm" variant="light" color="orange" radius="xl">{s.count} →</Badge>
                            </div>
                        ))}
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 5: ตารางพนักงาน ═══ */}
            <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card acct-animate acct-animate-5">
                <Group gap={8} mb="md"><div className="acct-section-icon"><UsersIcon /></div><Box><Text size="md" fw={700} c="dark">สถานะงาน WHT และ VAT รายบุคคล</Text><Text size="xs" c="gray.5">สรุปผลงานและการแก้ไขของพนักงานแต่ละคน</Text></Box></Group>
                <ScrollArea>
                    <div className="acct-table-wrapper">
                        <Table withColumnBorders style={{ minWidth: 850 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ textAlign: 'left', padding: '12px' }}>พนักงาน</Table.Th>
                                    <Table.Th>WHT<br />ทั้งหมด</Table.Th>
                                    <Table.Th>WHT<br />เสร็จ</Table.Th>
                                    <Table.Th>% WHT</Table.Th>
                                    <Table.Th>VAT<br />ทั้งหมด</Table.Th>
                                    <Table.Th>VAT<br />เสร็จ</Table.Th>
                                    <Table.Th>% VAT</Table.Th>
                                    <Table.Th>แก้ไข<br />WHT</Table.Th>
                                    <Table.Th>% แก้ไข<br />WHT</Table.Th>
                                    <Table.Th>แก้ไข<br />VAT</Table.Th>
                                    <Table.Th>% แก้ไข<br />VAT</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {employeeStats.map((emp, idx) => {
                                    const wCl = getCorrLabel(emp.whtCorrPct)
                                    const vCl = getCorrLabel(emp.vatCorrPct)
                                    return (
                                        <Table.Tr key={emp.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <Table.Td style={{ padding: '10px 12px' }}>
                                                <Group gap={6} justify="space-between" wrap="nowrap">
                                                    <Group gap={8} wrap="nowrap">
                                                        <div className="acct-avatar"><span>{emp.name.charAt(0)}</span></div>
                                                        <Text size="sm" fw={600} c="dark">{emp.name}</Text>
                                                    </Group>
                                                    <Badge size="sm" variant="light" color="orange" radius="xl" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setSelectedEmployee(emp.id)}>ดูงาน →</Badge>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.whtTotal}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.whtDone}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Badge size="sm" variant="light" color={emp.whtPct >= 80 ? 'green' : emp.whtPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.whtPct}%</Badge>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatTotal}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatDone}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Badge size="sm" variant="light" color={emp.vatPct >= 80 ? 'green' : emp.vatPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.vatPct}%</Badge>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.whtCorr}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center', background: getCorrBg(emp.whtCorrPct) + '40' }}>
                                                <Text size="xs" fw={600} c={wCl.color}>{emp.whtCorrPct}% {wCl.text}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatCorr}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center', background: getCorrBg(emp.vatCorrPct) + '40' }}>
                                                <Text size="xs" fw={600} c={vCl.color}>{emp.vatCorrPct}% {vCl.text}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </div>
                </ScrollArea>
            </Paper>

            {/* ═══ Status Detail Modal ═══ */}
            <Modal
                opened={!!detailModal}
                onClose={() => setDetailModal(null)}
                title={
                    detailModal ? (
                        <Group gap={10}>
                            <Box style={{ width: 12, height: 12, borderRadius: 4, background: detailModal.color }} />
                            <Text fw={700} size="lg">{detailModal.label}</Text>
                            <Badge size="md" variant="light" color={detailModal.type === 'wht' ? 'orange' : 'yellow'}>{detailModal.type === 'wht' ? 'WHT' : 'VAT'}</Badge>
                            <Badge size="md" variant="filled" color="gray">{detailRecords.length} รายการ</Badge>
                        </Group>
                    ) : null
                }
                size="90%"
                styles={{ content: { maxWidth: 1200 }, header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 12 } }}
                centered
            >
                {detailRecords.length > 0 ? (
                    <ScrollArea mt="md">
                        <Table withColumnBorders withTableBorder style={{ minWidth: 850, borderRadius: 10, overflow: 'hidden', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #eee' }}>
                            <Table.Thead>
                                <Table.Tr>
                                    {(() => {
                                        const th = { background: '#ff6b35', color: '#fff', fontSize: 13, fontWeight: 700 as const, padding: '12px 16px', textAlign: 'center' as const }; return (<>
                                            <Table.Th style={{ ...th, width: 50 }}>#</Table.Th>
                                            <Table.Th style={{ ...th, width: 100 }}>Build Code</Table.Th>
                                            <Table.Th style={{ ...th, textAlign: 'left' }}>ชื่อบริษัท</Table.Th>
                                            <Table.Th style={th}>ผู้รับผิดชอบทำบัญชี</Table.Th>
                                            <Table.Th style={th}>ตรวจภาษี</Table.Th>
                                            {detailModal?.status === 'passed' && <Table.Th style={th}>ผู้ยื่น WHT</Table.Th>}
                                            {detailModal?.status === 'passed' && <Table.Th style={th}>ผู้ยื่น VAT</Table.Th>}
                                        </>)
                                    })()}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {detailRecords.map((rec, idx) => (
                                    <Table.Tr key={rec.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#faf8f6', transition: 'background 0.15s' }}>
                                        <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}><Text size="sm" c="gray.5" fw={500}>{idx + 1}</Text></Table.Td>
                                        <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge size="md" variant="light" color="orange" radius="md">{rec.build}</Badge></Table.Td>
                                        <Table.Td style={{ padding: '12px 16px' }}><Text size="md" fw={500} c="dark">{rec.company_name || '-'}</Text></Table.Td>
                                        <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <Text size="sm" c="dark">{fmtName(rec.accounting_responsible_first_name, rec.accounting_responsible_nick_name)}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <Text size="sm" c="dark">{fmtName(rec.tax_inspection_responsible_first_name, rec.tax_inspection_responsible_nick_name)}</Text>
                                        </Table.Td>
                                        {detailModal?.status === 'passed' && (
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.wht_filer_employee_first_name, rec.wht_filer_employee_nick_name)}</Text>
                                            </Table.Td>
                                        )}
                                        {detailModal?.status === 'passed' && (
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.vat_filer_employee_first_name, rec.vat_filer_employee_nick_name)}</Text>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                ) : (
                    <Center h={100}><Text c="gray.4" size="md">ไม่มีข้อมูล</Text></Center>
                )}
            </Modal>

            {/* ═══ Employee Detail Modal ═══ */}
            <Modal
                opened={!!selectedEmployee && !!selectedEmpData}
                onClose={() => setSelectedEmployee(null)}
                title={
                    selectedEmpData ? (
                        <Group gap={8}>
                            <Box style={{ width: 28, height: 28, borderRadius: '50%', background: O, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Text size="xs" c="white" fw={700}>{selectedEmpData.name.charAt(0)}</Text>
                            </Box>
                            <Text fw={700} size="md">{selectedEmpData.name}</Text>
                            <Badge size="sm" variant="filled" color="gray">{selectedEmpData.items.length} ลูกค้า</Badge>
                        </Group>
                    ) : null
                }
                size="xl"
                centered
            >
                {selectedEmpData && (
                    <Stack gap="md">
                        {/* Summary Cards */}
                        <SimpleGrid cols={4}>
                            <Paper p="sm" radius="md" withBorder style={{ borderLeft: `3px solid ${O}` }}>
                                <Text size="xs" c="gray.6">WHT เสร็จ</Text>
                                <Group gap={4} mt={2}><Text fw={700} size="lg" c="dark">{selectedEmpData.whtDone}</Text><Text size="xs" c="gray.5">/ {selectedEmpData.whtTotal}</Text></Group>
                                <Badge size="xs" variant="light" color={selectedEmpData.whtPct >= 80 ? 'green' : selectedEmpData.whtPct >= 50 ? 'orange' : 'red'} mt={4}>{selectedEmpData.whtPct}%</Badge>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #ffa726' }}>
                                <Text size="xs" c="gray.6">VAT เสร็จ</Text>
                                <Group gap={4} mt={2}><Text fw={700} size="lg" c="dark">{selectedEmpData.vatDone}</Text><Text size="xs" c="gray.5">/ {selectedEmpData.vatTotal}</Text></Group>
                                <Badge size="xs" variant="light" color={selectedEmpData.vatPct >= 80 ? 'green' : selectedEmpData.vatPct >= 50 ? 'orange' : 'red'} mt={4}>{selectedEmpData.vatPct}%</Badge>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #f44336' }}>
                                <Text size="xs" c="gray.6">แก้ไข WHT</Text>
                                <Text fw={700} size="lg" c="dark" mt={2}>{selectedEmpData.whtCorr}</Text>
                                <Badge size="xs" variant="light" color={selectedEmpData.whtCorrPct <= 25 ? 'green' : selectedEmpData.whtCorrPct <= 50 ? 'orange' : 'red'} mt={4}>{selectedEmpData.whtCorrPct}%</Badge>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #f44336' }}>
                                <Text size="xs" c="gray.6">แก้ไข VAT</Text>
                                <Text fw={700} size="lg" c="dark" mt={2}>{selectedEmpData.vatCorr}</Text>
                                <Badge size="xs" variant="light" color={selectedEmpData.vatCorrPct <= 25 ? 'green' : selectedEmpData.vatCorrPct <= 50 ? 'orange' : 'red'} mt={4}>{selectedEmpData.vatCorrPct}%</Badge>
                            </Paper>
                        </SimpleGrid>

                        {/* Task Table */}
                        <ScrollArea>
                            <Table withColumnBorders withTableBorder style={{ minWidth: 650 }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        {(() => {
                                            const hd = { background: O, color: '#fff', fontSize: 11, fontWeight: 700 as const, textAlign: 'center' as const, padding: '8px' }; return (<>
                                                <Table.Th style={{ ...hd, width: 40 }}>#</Table.Th>
                                                <Table.Th style={{ ...hd, textAlign: 'left', padding: '8px 12px' }}>Build</Table.Th>
                                                <Table.Th style={{ ...hd, textAlign: 'left', padding: '8px 12px' }}>ชื่อบริษัท</Table.Th>
                                                <Table.Th style={hd}>สถานะ WHT</Table.Th>
                                                <Table.Th style={hd}>สถานะ VAT</Table.Th>
                                            </>)
                                        })()}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {selectedEmpData.items.map((rec, idx) => {
                                        const whtStatus = rec.pnd_status || 'not_started'
                                        const vatStatus = rec.pp30_form || 'not_started'
                                        const whtCfg = STATUS_CONFIG[whtStatus] || { label: whtStatus, color: '#808080' }
                                        const vatCfg = STATUS_CONFIG[vatStatus] || { label: vatStatus, color: '#808080' }
                                        return (
                                            <Table.Tr key={rec.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <Table.Td style={{ textAlign: 'center', padding: '6px 8px' }}><Text size="sm" c="gray.6">{idx + 1}</Text></Table.Td>
                                                <Table.Td style={{ padding: '6px 12px' }}><Text size="sm" fw={600} c="dark">{rec.build}</Text></Table.Td>
                                                <Table.Td style={{ padding: '6px 12px' }}><Text size="sm" c="dark" lineClamp={1}>{rec.company_name || '-'}</Text></Table.Td>
                                                <Table.Td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <Badge size="sm" variant="light" radius="xl" style={{ backgroundColor: whtCfg.color + '20', color: whtCfg.color, borderColor: whtCfg.color + '40' }}>{whtCfg.label}</Badge>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <Badge size="sm" variant="light" radius="xl" style={{ backgroundColor: vatCfg.color + '20', color: vatCfg.color, borderColor: vatCfg.color + '40' }}>{vatCfg.label}</Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        )
                                    })}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Stack>
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
        <Box p="md" className="acct-dashboard">
            {/* Header */}
            <div className="acct-header acct-animate acct-animate-1">
                <Group justify="space-between" wrap="wrap" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Tabs */}
                    <Group gap={6}>
                        {TAB_CONFIG.map(tab => (
                            <div
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`acct-tab-pill ${activeTab === tab.key ? 'acct-tab-pill--active' : ''}`}
                            >
                                <Text
                                    size="sm"
                                    fw={activeTab === tab.key ? 700 : 500}
                                    c={activeTab === tab.key ? '#ff6b35' : 'white'}
                                >
                                    {tab.label}
                                </Text>
                            </div>
                        ))}
                    </Group>

                    {/* Filters */}
                    <Group gap="sm" className="acct-filter-group">
                        <Select
                            size="xs"
                            w={120}
                            value={selectedMonth}
                            onChange={(v) => v && setSelectedMonth(v)}
                            data={monthOptions}
                            styles={{
                                input: { background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8 },
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
                                input: { background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8 },
                                option: { '&[data-selected]': { background: '#ff6b35' } },
                            }}
                        />
                        <Tooltip label="รีเฟรช">
                            <ActionIcon
                                variant="subtle"
                                color="white"
                                onClick={handleRefresh}
                                loading={isLoading}
                            >
                                <TbRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Switch
                            size="xs"
                            label={<Text size="xs" c="white">Auto</Text>}
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                            color="orange"
                        />
                    </Group>
                </Group>

                {/* Summary info */}
                <Group gap="lg" mt="sm" style={{ position: 'relative', zIndex: 1 }}>
                    <Badge size="sm" variant="filled" color="rgba(255,255,255,0.25)" style={{ color: 'white' }}>
                        📅 {THAI_MONTHS[parseInt(selectedMonth) - 1]} {parseInt(selectedYear) + 543}
                    </Badge>
                    <Text size="xs" c="white" style={{ opacity: 0.9 }}>
                        ข้อมูลทั้งหมด: {records.length} บริษัท
                    </Text>
                    {autoRefresh && (
                        <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                            🔄 รีเฟรชอัตโนมัติทุก 30 วินาที
                        </Text>
                    )}
                </Group>
            </div>

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
