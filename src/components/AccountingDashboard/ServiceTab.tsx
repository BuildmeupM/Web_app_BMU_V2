/**
 * ServiceTab — Tab content for Service (ผู้ทำบัญชี) view
 * Shows WHT/VAT summary, top 3 rankings, status rows, and employee table
 */

import { useState, useMemo } from 'react'
import {
    Box,
    Paper,
    Text,
    Group,
    Stack,
    SimpleGrid,
    Badge,
    Progress,
    Table,
    Divider,
    ScrollArea,
    Modal,
    Center,
    RingProgress,
} from '@mantine/core'
import type { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import {
    BuildingIcon, ClipboardIcon, ChartIcon, TrophyIcon,
    UsersIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon,
    PieChartIcon,
} from '../AccountingIcons'
import {
    STATUS_CONFIG,
    WHT_COMPLETED_STATUSES,
    VAT_COMPLETED_STATUSES,
    CORRECTION_STATUSES,
    countStatuses,
    fmtName,
} from './constants'


export default function ServiceTab({ data }: { data: MonthlyTaxData[] }) {
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

    // WHT calculations — นับทุกรายการ, not_submitted นับเป็นเสร็จ
    const whtTotal = data.length
    const whtCompleted = data.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
    const whtRemaining = whtTotal - whtCompleted
    const whtPct = whtTotal > 0 ? Math.round((whtCompleted / whtTotal) * 1000) / 10 : 0

    // VAT calculations — นับทุกรายการ, not_submitted นับเป็นเสร็จ
    const vatTotal = data.length
    const vatCompleted = data.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
    const vatRemaining = vatTotal - vatCompleted
    const vatPct = vatTotal > 0 ? Math.round((vatCompleted / vatTotal) * 1000) / 10 : 0

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
            const wi = emp.items // นับทุกรายการ
            const wd = wi.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
            const wc = wi.filter(d => CORRECTION_STATUSES.includes(d.pnd_status || '')).length
            const vi = emp.items // นับทุกรายการ
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
                                    <Table.Th>WHT<br />คงเหลือ</Table.Th>
                                    <Table.Th>% WHT</Table.Th>
                                    <Table.Th>VAT<br />ทั้งหมด</Table.Th>
                                    <Table.Th>VAT<br />เสร็จ</Table.Th>
                                    <Table.Th>VAT<br />คงเหลือ</Table.Th>
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
                                                <Text size="sm" fw={600} c={emp.whtTotal - emp.whtDone > 0 ? '#f44336' : '#4caf50'}>{emp.whtTotal - emp.whtDone}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Badge size="sm" variant="light" color={emp.whtPct >= 80 ? 'green' : emp.whtPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.whtPct}%</Badge>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatTotal}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatDone}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Text size="sm" fw={600} c={emp.vatTotal - emp.vatDone > 0 ? '#f44336' : '#4caf50'}>{emp.vatTotal - emp.vatDone}</Text>
                                            </Table.Td>
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
                                                <Table.Th style={hd}>สถานะจดทะเบียนภาษี</Table.Th>
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
                                                    <Badge size="sm" variant="light" radius="xl"
                                                        color={rec.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'teal' : rec.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม' ? 'red' : 'gray'}
                                                    >
                                                        {rec.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'จดทะเบียนภาษีมูลค่าเพิ่ม' : rec.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม' ? 'ยังไม่จดทะเบียนภาษีมูลค่าเพิ่ม' : '-'}
                                                    </Badge>
                                                </Table.Td>
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
