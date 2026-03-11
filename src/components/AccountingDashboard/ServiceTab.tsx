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
    Pagination,
    Select,
    Button,
    ThemeIcon, // Added ThemeIcon
} from '@mantine/core'
import { TbDownload } from 'react-icons/tb'
import { exportToExcel } from '../../utils/exportExcel'
import { DatePickerInput, DateValue } from '@mantine/dates'
import 'dayjs/locale/th'
import monthlyTaxDataService, { type MonthlyTaxData } from '../../services/monthlyTaxDataService'
import {
    BuildingIcon, ClipboardIcon, ChartIcon, TrophyIcon,
    UsersIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon,
    PieChartIcon,
} from '../AccountingIcons'
import {
    STATUS_CONFIG,
    WHT_COMPLETED_STATUSES,
    VAT_COMPLETED_STATUSES,
    STATUS_ORDER,
    countStatuses,
    fmtName,
} from './constants'


export default function ServiceTab({ data }: { data: MonthlyTaxData[] }) {
    const total = data.length
    const statusCounts = useMemo(() => {
        const counts = { monthly: 0, yearly: 0, handsOff: 0 }
        data.forEach(d => {
            const s = d.company_status || 'รายเดือน'
            if (s === 'รายเดือน') counts.monthly++
            else if (s === 'รายเดือน / จ่ายรายปี') counts.yearly++
            else if (s === 'รายเดือน / วางมือ') counts.handsOff++
        })
        return counts
    }, [data])
    
    const pndStatuses = countStatuses(data, 'pnd_status')
    const pp30Statuses = countStatuses(data.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'), 'pp30_form')

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

    // Company Status detail modal state
    const [statusDetailModal, setStatusDetailModal] = useState<{ status: string; label: string; color: string } | null>(null)
    const [statusModalPage, setStatusModalPage] = useState(1)
    const [statusModalLimit, setStatusModalLimit] = useState('20')
    const statusDetailRecords = useMemo(() => {
        if (!statusDetailModal) return []
        return data.filter(d => {
            const val = d.company_status || 'รายเดือน'
            return val === statusDetailModal.status
        })
    }, [data, statusDetailModal])

    const paginatedStatusRecords = useMemo(() => {
        const lim = parseInt(statusModalLimit, 10)
        const start = (statusModalPage - 1) * lim
        return statusDetailRecords.slice(start, start + lim)
    }, [statusDetailRecords, statusModalPage, statusModalLimit])

    const handleOpenStatusModal = (status: string, label: string, color: string) => {
        setStatusDetailModal({ status, label, color })
        setStatusModalPage(1)
    }

    // Employee detail modal state
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const [exportModalOpen, setExportModalOpen] = useState(false)
    const [exportStartDate, setExportStartDate] = useState<DateValue>(null)
    const [exportEndDate, setExportEndDate] = useState<DateValue>(null)
    const [exportType, setExportType] = useState('overall')
    const [exportDetail, setExportDetail] = useState('summary')
    const [isExporting, setIsExporting] = useState(false)

    // Export Status Modal State
    const [exportStatusModalOpen, setExportStatusModalOpen] = useState(false)
    const [exportTargetType, setExportTargetType] = useState('wht')
    const [exportTargetStatus, setExportTargetStatus] = useState('all')
    const [isExportingStatus, setIsExportingStatus] = useState(false)

    // WHT calculations — นับทุกรายการ, not_submitted นับเป็นเสร็จ
    const whtTotal = data.length
    const whtCompleted = data.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
    const whtRemaining = whtTotal - whtCompleted
    const whtPct = whtTotal > 0 ? Math.round((whtCompleted / whtTotal) * 1000) / 10 : 0

    // VAT calculations — นับเฉพาะบริษัทที่จดภาษีมูลค่าเพิ่ม
    const vatFilteredData = data.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
    const vatTotal = vatFilteredData.length
    const vatCompleted = vatFilteredData.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
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
            const wc = wi.reduce((sum, d) => sum + (d.wht_correction_count || 0), 0)
            const vi = emp.items.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') // นับเฉพาะผู้จด VAT
            const vd = vi.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
            const vc = vi.reduce((sum, d) => sum + (d.vat_correction_count || 0), 0)
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
        const score = pct * 0.5 + (100 - corrPct) * 0.5
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
                    <div 
                        className={statusCounts.monthly > 0 ? "acct-hero-card" : "acct-hero-card acct-hero-card--disabled"} 
                        onClick={() => statusCounts.monthly > 0 && handleOpenStatusModal('รายเดือน', 'รายเดือน', O)} 
                        style={{ cursor: statusCounts.monthly > 0 ? 'pointer' : 'default' }}
                    >
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน</Text>
                        <Text className="acct-stat-number">{statusCounts.monthly}</Text>
                        {statusCounts.monthly > 0 ? (
                            <Text size="xs" c={O} fw={500}>ทั้งหมด {total} รายการ</Text>
                        ) : (
                            <Text size="xs" c="gray.4">ไม่มีข้อมูล</Text>
                        )}
                    </div>
                    <div 
                        className={statusCounts.yearly > 0 ? "acct-hero-card" : "acct-hero-card acct-hero-card--disabled"} 
                        onClick={() => statusCounts.yearly > 0 && handleOpenStatusModal('รายเดือน / จ่ายรายปี', 'รายเดือน / จ่ายรายปี', O)} 
                        style={{ cursor: statusCounts.yearly > 0 ? 'pointer' : 'default' }}
                    >
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน / จ่ายรายปี</Text>
                        {statusCounts.yearly > 0 ? (
                            <>
                                <Text className="acct-stat-number">{statusCounts.yearly}</Text>
                                <Text size="xs" c={O} fw={500}>คลิกเพื่อดูรายละเอียด →</Text>
                            </>
                        ) : (
                            <>
                                <Text fw={800} c="gray.4" style={{ fontSize: 32, lineHeight: 1 }}>0</Text>
                                <Text size="xs" c="gray.4">ไม่มีบริษัทในสถานะนี้</Text>
                            </>
                        )}
                    </div>
                    <div 
                        className={statusCounts.handsOff > 0 ? "acct-hero-card" : "acct-hero-card acct-hero-card--disabled"} 
                        onClick={() => statusCounts.handsOff > 0 && handleOpenStatusModal('รายเดือน / วางมือ', 'รายเดือน / วางมือ', O)} 
                        style={{ cursor: statusCounts.handsOff > 0 ? 'pointer' : 'default' }}
                    >
                        <Text size="xs" c="gray.6" fw={500}>รายเดือน / วางมือ</Text>
                        {statusCounts.handsOff > 0 ? (
                            <>
                                <Text className="acct-stat-number">{statusCounts.handsOff}</Text>
                                <Text size="xs" c={O} fw={500}>คลิกเพื่อดูรายละเอียด →</Text>
                            </>
                        ) : (
                            <>
                                <Text fw={800} c="gray.4" style={{ fontSize: 32, lineHeight: 1 }}>0</Text>
                                <Text size="xs" c="gray.4">ไม่มีบริษัทในสถานะนี้</Text>
                            </>
                        )}
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
                            const pct = emp.whtPct
                            const corrPct = emp.whtCorrPct
                            const done = emp.whtDone
                            const corr = emp.whtCorr
                            const rank = getRank(pct, corrPct)
                            
                            const styles = [
                                { bg: 'linear-gradient(135deg, #fffaf0 0%, #fff0c2 100%)', border: '1px solid #fce8a1', icon: '#f5b041', badgeBg: 'rgba(245, 176, 65, 0.15)', badgeText: '#b9770e', title: 'อันดับ 1 ยอดเยี่ยม' },
                                { bg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6', icon: '#868e96', badgeBg: 'rgba(134, 142, 150, 0.15)', badgeText: '#495057', title: 'อันดับ 2 ดีเด่น' },
                                { bg: 'linear-gradient(135deg, #fff5f0 0%, #ffdfcc 100%)', border: '1px solid #fcd2b8', icon: '#d97742', badgeBg: 'rgba(217, 119, 66, 0.15)', badgeText: '#b3592d', title: 'อันดับ 3 ชมเชย' }
                            ][i]

                            return (
                                <Paper 
                                    key={emp.name} 
                                    p="md" 
                                    radius="lg" 
                                    style={{ 
                                        background: styles.bg, 
                                        border: styles.border,
                                        boxShadow: i === 0 ? '0 4px 15px rgba(245, 176, 65, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
                                        <Group gap={12} wrap="nowrap">
                                            <Box style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                                {medals[i]}
                                            </Box>
                                            <Box>
                                                <Text fw={800} size="md" c="dark" style={{ lineHeight: 1.2 }}>{emp.name}</Text>
                                                <Text size="xs" c="dimmed" mt={2} fw={600}>{styles.title}</Text>
                                            </Box>
                                        </Group>
                                        
                                        <Group gap={6} align="center">
                                            <Badge size="md" style={{ background: styles.badgeBg, color: styles.badgeText, fontWeight: 700 }} variant="filled" radius="sm">เสร็จ {done}</Badge>
                                            <Badge size="md" variant="filled" color={rank.color} radius="sm" fw={700}>แรงค์ {rank.letter}</Badge>
                                        </Group>
                                    </Group>

                                    <Stack gap={10} mt="lg">
                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Text size="xs" fw={700} c="gray.7">ความคืบหน้างาน</Text>
                                                <Text size="xs" fw={800} c={styles.icon}>{pct}%</Text>
                                            </Group>
                                            <Progress value={pct} color={styles.icon} size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>

                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Text size="xs" fw={700} c="gray.7">ประสิทธิภาพการทำงาน</Text>
                                                <Text size="xs" fw={800} c="teal.6">{rank.scorePct.toFixed(1)}%</Text>
                                            </Group>
                                            <Progress value={rank.scorePct} color="teal.5" size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>

                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Group gap={6}>
                                                    <Text size="xs" fw={700} c="gray.7">อัตราการแก้ไขงาน</Text>
                                                    <Badge size="var(--mantine-font-size-xs)" style={{ padding: '0 6px', height: 20 }} variant="white" color={corrPct <= 25 ? "green" : "red"} radius="sm" fw={700}>{corr} ครั้ง</Badge>
                                                </Group>
                                                <Text size="xs" fw={800} c={corrPct <= 25 ? "green.6" : "red.6"}>{corrPct}%</Text>
                                            </Group>
                                            <Progress value={corrPct} color={corrPct <= 25 ? "green.4" : "red.5"} size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>
                                    </Stack>
                                </Paper>
                            )
                        })}
                        {top3Wht.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>

                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group gap={8} mb="sm"><div className="acct-section-icon" style={{ background: '#e3f2fd', color: '#1976d2' }}><TrophyIcon /></div><Text size="md" fw={700} c="dark">3 อันดับแรกของ VAT</Text></Group>
                    <Stack gap="sm">
                        {top3Vat.map((emp, i) => {
                            const pct = emp.vatPct
                            const corrPct = emp.vatCorrPct
                            const done = emp.vatDone
                            const corr = emp.vatCorr
                            const rank = getRank(pct, corrPct)
                            
                            const styles = [
                                { bg: 'linear-gradient(135deg, #f0f7ff 0%, #cde2ff 100%)', border: '1px solid #b3d1ff', icon: '#1976d2', badgeBg: 'rgba(25, 118, 210, 0.15)', badgeText: '#0d47a1', title: 'อันดับ 1 ยอดเยี่ยม' },
                                { bg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6', icon: '#868e96', badgeBg: 'rgba(134, 142, 150, 0.15)', badgeText: '#495057', title: 'อันดับ 2 ดีเด่น' },
                                { bg: 'linear-gradient(135deg, #fff5f0 0%, #ffdfcc 100%)', border: '1px solid #fcd2b8', icon: '#d97742', badgeBg: 'rgba(217, 119, 66, 0.15)', badgeText: '#b3592d', title: 'อันดับ 3 ชมเชย' }
                            ][i]

                            return (
                                <Paper 
                                    key={emp.name} 
                                    p="md" 
                                    radius="lg" 
                                    style={{ 
                                        background: styles.bg, 
                                        border: styles.border,
                                        boxShadow: i === 0 ? '0 4px 15px rgba(25, 118, 210, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
                                        <Group gap={12} wrap="nowrap">
                                            <Box style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                                {medals[i]}
                                            </Box>
                                            <Box>
                                                <Text fw={800} size="md" c="dark" style={{ lineHeight: 1.2 }}>{emp.name}</Text>
                                                <Text size="xs" c="dimmed" mt={2} fw={600}>{styles.title}</Text>
                                            </Box>
                                        </Group>
                                        
                                        <Group gap={6} align="center">
                                            <Badge size="md" style={{ background: styles.badgeBg, color: styles.badgeText, fontWeight: 700 }} variant="filled" radius="sm">เสร็จ {done}</Badge>
                                            <Badge size="md" variant="filled" color={rank.color} radius="sm" fw={700}>แรงค์ {rank.letter}</Badge>
                                        </Group>
                                    </Group>

                                    <Stack gap={10} mt="lg">
                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Text size="xs" fw={700} c="gray.7">ความคืบหน้างาน</Text>
                                                <Text size="xs" fw={800} c={styles.icon}>{pct}%</Text>
                                            </Group>
                                            <Progress value={pct} color={styles.icon} size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>

                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Text size="xs" fw={700} c="gray.7">ประสิทธิภาพการทำงาน</Text>
                                                <Text size="xs" fw={800} c="teal.6">{rank.scorePct.toFixed(1)}%</Text>
                                            </Group>
                                            <Progress value={rank.scorePct} color="teal.5" size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>

                                        <Box>
                                            <Group justify="space-between" mb={6}>
                                                <Group gap={6}>
                                                    <Text size="xs" fw={700} c="gray.7">อัตราการแก้ไขงาน</Text>
                                                    <Badge size="var(--mantine-font-size-xs)" style={{ padding: '0 6px', height: 20 }} variant="white" color={corrPct <= 25 ? "green" : "red"} radius="sm" fw={700}>{corr} ครั้ง</Badge>
                                                </Group>
                                                <Text size="xs" fw={800} c={corrPct <= 25 ? "green.6" : "red.6"}>{corrPct}%</Text>
                                            </Group>
                                            <Progress value={corrPct} color={corrPct <= 25 ? "green.4" : "red.5"} size="md" radius="xl" bg="rgba(255,255,255,0.6)" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                                        </Box>
                                    </Stack>
                                </Paper>
                            )
                        })}
                        {top3Vat.length === 0 && <Center h={120}><Text c="gray.4" size="sm">ยังไม่มีข้อมูล</Text></Center>}
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 4: สถานะงาน WHT + VAT ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }} className="acct-animate acct-animate-4">
                <Paper p={{ base: 'sm', md: 'lg' }} radius={16} className="acct-glass-card">
                    <Group justify="space-between" mb="sm">
                        <Group gap={8}>
                            <div className="acct-section-icon"><ClipboardIcon /></div>
                            <Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีหัก ณ ที่จ่าย (WHT)</Text></Box>
                        </Group>
                        <Button
                            variant="light"
                            color="orange"
                            size="xs"
                            radius="md"
                            leftSection={<TbDownload size={16} />}
                            onClick={() => { setExportTargetType('wht'); setExportTargetStatus('all'); setExportStatusModalOpen(true) }}
                        >
                            ส่งออก Excel
                        </Button>
                    </Group>
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
                    <Group justify="space-between" mb="sm">
                        <Group gap={8}>
                            <div className="acct-section-icon"><ClipboardIcon /></div>
                            <Box><Text size="sm" fw={700} c="dark">สถานะงานทั้งหมด</Text><Text size="xs" c="gray.5">ภาษีมูลค่าเพิ่ม (VAT)</Text></Box>
                        </Group>
                        <Button
                            variant="light"
                            color="orange"
                            size="xs"
                            radius="md"
                            leftSection={<TbDownload size={16} />}
                            onClick={() => { setExportTargetType('vat'); setExportTargetStatus('all'); setExportStatusModalOpen(true) }}
                        >
                            ส่งออก Excel
                        </Button>
                    </Group>
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
                <Group justify="space-between" align="flex-start" mb="md">
                    <Group gap={8}>
                        <div className="acct-section-icon"><UsersIcon /></div>
                        <Box>
                            <Text size="md" fw={700} c="dark">สถานะงาน WHT และ VAT รายบุคคล</Text>
                            <Text size="xs" c="gray.5">สรุปผลงานและการแก้ไขของพนักงานแต่ละคน</Text>
                        </Box>
                    </Group>
                    <Button
                        variant="light"
                        color="green"
                        leftSection={<TbDownload size={16} />}
                        onClick={() => setExportModalOpen(true)}
                        radius="md"
                        size="sm"
                    >
                        ส่งออก Excel
                    </Button>
                </Group>
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
                                    <Table.Th>แก้ไข<br />WHT</Table.Th>
                                    <Table.Th>% แก้ไข<br />WHT</Table.Th>
                                    <Table.Th>ประสิทธิภาพ<br />WHT</Table.Th>
                                    <Table.Th>VAT<br />ทั้งหมด</Table.Th>
                                    <Table.Th>VAT<br />เสร็จ</Table.Th>
                                    <Table.Th>VAT<br />คงเหลือ</Table.Th>
                                    <Table.Th>% VAT</Table.Th>
                                    <Table.Th>แก้ไข<br />VAT</Table.Th>
                                    <Table.Th>% แก้ไข<br />VAT</Table.Th>
                                    <Table.Th>ประสิทธิภาพ<br />VAT</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {employeeStats.map((emp, idx) => {
                                    const wCl = getCorrLabel(emp.whtCorrPct)
                                    const vCl = getCorrLabel(emp.vatCorrPct)
                                    const whtRank = getRank(emp.whtPct, emp.whtCorrPct)
                                    const vatRank = getRank(emp.vatPct, emp.vatCorrPct)
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
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.whtCorr}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center', background: getCorrBg(emp.whtCorrPct) + '40' }}>
                                                <Text size="xs" fw={600} c={wCl.color}>{emp.whtCorrPct}% {wCl.text}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                {emp.whtTotal > 0 ? (
                                                    <Badge size="sm" variant="light" color={whtRank.color} radius="sm">{whtRank.scorePct.toFixed(1)}%</Badge>
                                                ) : (
                                                    <Text size="xs" c="gray.4">-</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatTotal}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatDone}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Text size="sm" fw={600} c={emp.vatTotal - emp.vatDone > 0 ? '#f44336' : '#4caf50'}>{emp.vatTotal - emp.vatDone}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Badge size="sm" variant="light" color={emp.vatPct >= 80 ? 'green' : emp.vatPct >= 50 ? 'orange' : 'red'} radius="xl">{emp.vatPct}%</Badge>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}><Text size="sm">{emp.vatCorr}</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center', background: getCorrBg(emp.vatCorrPct) + '40' }}>
                                                <Text size="xs" fw={600} c={vCl.color}>{emp.vatCorrPct}% {vCl.text}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                {emp.vatTotal > 0 ? (
                                                    <Badge size="sm" variant="light" color={vatRank.color} radius="sm">{vatRank.scorePct.toFixed(1)}%</Badge>
                                                ) : (
                                                    <Text size="xs" c="gray.4">-</Text>
                                                )}
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

            {/* ═══ Company Status Detail Modal ═══ */}
            <Modal
                opened={!!statusDetailModal}
                onClose={() => setStatusDetailModal(null)}
                title={
                    statusDetailModal ? (
                        <Group gap={10}>
                            <Box style={{ width: 12, height: 12, borderRadius: 4, background: statusDetailModal.color }} />
                            <Text fw={700} size="lg">สถานะลูกค้า: {statusDetailModal.label}</Text>
                            <Badge size="md" variant="filled" color="gray">{statusDetailRecords.length} รายการ</Badge>
                        </Group>
                    ) : null
                }
                size="90%"
                styles={{ content: { maxWidth: 1000 }, header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 12 } }}
                centered
            >
                {statusDetailRecords.length > 0 ? (
                    <Stack gap="md" mt="md">
                        <ScrollArea>
                            <Table withColumnBorders withTableBorder style={{ minWidth: 900, borderRadius: 10, overflow: 'hidden', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #eee' }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        {(() => {
                                            const th = { background: '#ff6b35', color: '#fff', fontSize: 13, fontWeight: 700 as const, padding: '12px 16px', textAlign: 'center' as const }; return (<>
                                                <Table.Th style={{ ...th, width: 50 }}>#</Table.Th>
                                                <Table.Th style={{ ...th, width: 100 }}>Build Code</Table.Th>
                                                <Table.Th style={{ ...th, textAlign: 'left' }}>ชื่อบริษัท</Table.Th>
                                                <Table.Th style={th}>ผู้รับผิดชอบทำบัญชี</Table.Th>
                                                <Table.Th style={th}>ตรวจภาษี</Table.Th>
                                                <Table.Th style={th}>ผู้ยื่น WHT</Table.Th>
                                                <Table.Th style={th}>ผู้ยื่น VAT</Table.Th>
                                            </>)
                                        })()}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {paginatedStatusRecords.map((rec, idx) => (
                                        <Table.Tr key={rec.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#faf8f6', transition: 'background 0.15s' }}>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}><Text size="sm" c="gray.5" fw={500}>{(statusModalPage - 1) * parseInt(statusModalLimit, 10) + idx + 1}</Text></Table.Td>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge size="md" variant="light" color="orange" radius="md">{rec.build}</Badge></Table.Td>
                                            <Table.Td style={{ padding: '12px 16px' }}><Text size="md" fw={500} c="dark">{rec.company_name || '-'}</Text></Table.Td>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.accounting_responsible_first_name, rec.accounting_responsible_nick_name)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.tax_inspection_responsible_first_name, rec.tax_inspection_responsible_nick_name)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.wht_filer_employee_first_name, rec.wht_filer_employee_nick_name)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Text size="sm" c="dark">{fmtName(rec.vat_filer_employee_first_name, rec.vat_filer_employee_nick_name)}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>

                        <Group justify="space-between" mt="sm">
                            <Group gap="xs">
                                <Text size="sm" c="gray.6">แสดง</Text>
                                <Select
                                    data={['20', '50', '100']}
                                    value={statusModalLimit}
                                    onChange={(val) => {
                                        setStatusModalLimit(val as string)
                                        setStatusModalPage(1)
                                    }}
                                    size="xs"
                                    style={{ width: 80 }}
                                />
                                <Text size="sm" c="gray.6">รายการต่อหน้า</Text>
                            </Group>
                            <Pagination
                                total={Math.ceil(statusDetailRecords.length / parseInt(statusModalLimit, 10))}
                                value={statusModalPage}
                                onChange={setStatusModalPage}
                                color="orange"
                                size="sm"
                                radius="xl"
                            />
                        </Group>
                    </Stack>
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
                size="90%"
                styles={{ content: { maxWidth: 1200 } }}
                centered
            >
                {selectedEmpData && (
                    <Stack gap="md">
                        {/* Summary Cards */}
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                            <Paper p="md" radius="md" withBorder style={{ borderLeft: `4px solid ${O}` }}>
                                <Group justify="space-between" align="flex-end" mb="xs">
                                    <div>
                                        <Text size="sm" c="dimmed" fw={500}>WHT เสร็จ</Text>
                                        <Group gap="xs" align="center" mt={4}>
                                            <Text fw={800} size="h3" style={{ lineHeight: 1 }}>{selectedEmpData.whtDone}</Text>
                                            <Text size="sm" c="dimmed" fw={500}>/ {selectedEmpData.whtTotal}</Text>
                                        </Group>
                                    </div>
                                    <Text fw={700} size="lg" c={selectedEmpData.whtPct >= 80 ? 'teal' : selectedEmpData.whtPct >= 50 ? 'orange' : 'red'}>
                                        {selectedEmpData.whtPct}%
                                    </Text>
                                </Group>
                                <Progress value={selectedEmpData.whtPct} size="sm" color={selectedEmpData.whtPct >= 80 ? 'teal' : selectedEmpData.whtPct >= 50 ? 'orange' : 'red'} radius="xl" />
                            </Paper>

                            <Paper p="md" radius="md" withBorder style={{ borderLeft: '4px solid #ffa726' }}>
                                <Group justify="space-between" align="flex-end" mb="xs">
                                    <div>
                                        <Text size="sm" c="dimmed" fw={500}>VAT เสร็จ</Text>
                                        <Group gap="xs" align="center" mt={4}>
                                            <Text fw={800} size="h3" style={{ lineHeight: 1 }}>{selectedEmpData.vatDone}</Text>
                                            <Text size="sm" c="dimmed" fw={500}>/ {selectedEmpData.vatTotal}</Text>
                                        </Group>
                                    </div>
                                    <Text fw={700} size="lg" c={selectedEmpData.vatPct >= 80 ? 'teal' : selectedEmpData.vatPct >= 50 ? 'orange' : 'red'}>
                                        {selectedEmpData.vatPct}%
                                    </Text>
                                </Group>
                                <Progress value={selectedEmpData.vatPct} size="sm" color={selectedEmpData.vatPct >= 80 ? 'teal' : selectedEmpData.vatPct >= 50 ? 'orange' : 'red'} radius="xl" />
                            </Paper>

                            <Paper p="md" radius="md" withBorder style={{ borderLeft: '4px solid #f44336' }}>
                                <Group justify="space-between" align="flex-end" mb="xs">
                                    <div>
                                        <Text size="sm" c="dimmed" fw={500}>อัตราการแก้ไข WHT</Text>
                                        <Group gap="xs" align="center" mt={4}>
                                            <Text fw={800} size="h3" style={{ lineHeight: 1, color: selectedEmpData.whtCorr > 0 ? '#f44336' : '#2e2e2e' }}>{selectedEmpData.whtCorr}</Text>
                                            <Text size="sm" c="dimmed" fw={500}>รายการ</Text>
                                        </Group>
                                    </div>
                                    <Text fw={700} size="lg" c={selectedEmpData.whtCorrPct <= 25 ? 'teal' : selectedEmpData.whtCorrPct <= 50 ? 'orange' : 'red'}>
                                        {selectedEmpData.whtCorrPct}%
                                    </Text>
                                </Group>
                                <Progress value={Math.min(selectedEmpData.whtCorrPct, 100)} size="sm" color={selectedEmpData.whtCorrPct <= 25 ? 'teal' : selectedEmpData.whtCorrPct <= 50 ? 'orange' : 'red'} radius="xl" />
                            </Paper>

                            <Paper p="md" radius="md" withBorder style={{ borderLeft: '4px solid #f44336' }}>
                                <Group justify="space-between" align="flex-end" mb="xs">
                                    <div>
                                        <Text size="sm" c="dimmed" fw={500}>อัตราการแก้ไข VAT</Text>
                                        <Group gap="xs" align="center" mt={4}>
                                            <Text fw={800} size="h3" style={{ lineHeight: 1, color: selectedEmpData.vatCorr > 0 ? '#f44336' : '#2e2e2e' }}>{selectedEmpData.vatCorr}</Text>
                                            <Text size="sm" c="dimmed" fw={500}>รายการ</Text>
                                        </Group>
                                    </div>
                                    <Text fw={700} size="lg" c={selectedEmpData.vatCorrPct <= 25 ? 'teal' : selectedEmpData.vatCorrPct <= 50 ? 'orange' : 'red'}>
                                        {selectedEmpData.vatCorrPct}%
                                    </Text>
                                </Group>
                                <Progress value={Math.min(selectedEmpData.vatCorrPct, 100)} size="sm" color={selectedEmpData.vatCorrPct <= 25 ? 'teal' : selectedEmpData.vatCorrPct <= 50 ? 'orange' : 'red'} radius="xl" />
                            </Paper>
                        </SimpleGrid>

                        {/* Task Table */}
                        <ScrollArea>
                            <Table withColumnBorders withTableBorder style={{ minWidth: 900 }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        {(() => {
                                            const hd = { background: O, color: '#fff', fontSize: 11, fontWeight: 700 as const, textAlign: 'center' as const, padding: '8px' }; return (<>
                                                <Table.Th style={{ ...hd, width: 40 }}>#</Table.Th>
                                                <Table.Th style={{ ...hd, textAlign: 'left', padding: '8px 12px' }}>Build</Table.Th>
                                                <Table.Th style={{ ...hd, textAlign: 'left', padding: '8px 12px' }}>ชื่อบริษัท</Table.Th>
                                                <Table.Th style={hd}>สถานะจดทะเบียนภาษี</Table.Th>
                                                <Table.Th style={hd}>สถานะ WHT</Table.Th>
                                                <Table.Th style={hd}>แก้ไข WHT</Table.Th>
                                                <Table.Th style={hd}>สถานะ VAT</Table.Th>
                                                <Table.Th style={hd}>แก้ไข VAT</Table.Th>
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
                                                    {rec.wht_correction_count && rec.wht_correction_count > 0 ? (
                                                        <Badge size="sm" color="red" variant="light" radius="sm">{rec.wht_correction_count} ครั้ง</Badge>
                                                    ) : (
                                                        <Text size="xs" c="gray.4">-</Text>
                                                    )}
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <Badge size="sm" variant="light" radius="xl" style={{ backgroundColor: vatCfg.color + '20', color: vatCfg.color, borderColor: vatCfg.color + '40' }}>{vatCfg.label}</Badge>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    {rec.vat_correction_count && rec.vat_correction_count > 0 ? (
                                                        <Badge size="sm" color="red" variant="light" radius="sm">{rec.vat_correction_count} ครั้ง</Badge>
                                                    ) : (
                                                        <Text size="xs" c="gray.4">-</Text>
                                                    )}
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

            {/* ═══ Export Modal ═══ */}
            <Modal
                opened={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                title={
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="green" variant="light">
                            <TbDownload size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={700}>เลือกลักษณะการส่งออกข้อมูล Excel</Text>
                    </Group>
                }
                size="lg"
                radius="lg"
                centered
            >
                <Stack gap="md">
                    <Group grow>
                        <DatePickerInput
                            label="วันที่เริ่มต้น"
                            placeholder="วว/ดด/ปปปป"
                            value={exportStartDate}
                            onChange={setExportStartDate}
                            valueFormat="DD/MM/YYYY"
                            locale="th"
                            clearable
                        />
                        <DatePickerInput
                            label="ถึงวันที่"
                            placeholder="วว/ดด/ปปปป"
                            value={exportEndDate}
                            onChange={setExportEndDate}
                            valueFormat="DD/MM/YYYY"
                            locale="th"
                            clearable
                        />
                    </Group>
                    
                    <Select
                        label="ประเภทข้อมูลการดึง"
                        data={[
                            { value: 'overall', label: 'แบบสรุปรวมทั้งหมด' },
                            { value: 'individual', label: 'สรุปแยกรายบุคคล' }
                        ]}
                        value={exportType}
                        onChange={(val) => setExportType(val || 'overall')}
                    />
                    
                    <Select
                        label="รายละเอียดของการดึง"
                        data={[
                            { value: 'summary', label: 'ดึงข้อมูลสรุป' },
                            { value: 'details', label: 'ดึงข้อมูลรับผิดชอบงานทั้งหมด' }
                        ]}
                        value={exportDetail}
                        onChange={(val) => setExportDetail(val || 'summary')}
                    />

                    <Button
                        variant="light"
                        color="green"
                        fullWidth
                        loading={isExporting}
                        onClick={async () => {
                            setIsExporting(true)
                            try {
                                let dataToProcess = data;

                                // If cross-month export requested via dates, fetch from API
                                if (exportStartDate || exportEndDate) {
                                    const res = await monthlyTaxDataService.getList({
                                        limit: 9999,
                                        dateFrom: exportStartDate ? exportStartDate.toISOString().split('T')[0] : undefined,
                                        dateTo: exportEndDate ? exportEndDate.toISOString().split('T')[0] : undefined
                                    });
                                    dataToProcess = res.data || [];
                                }

                                // Filter data by date range for accuracy
                                const filteredData = dataToProcess.filter(d => {
                                    if (!exportStartDate && !exportEndDate) return true;
                                    const dDateStr = d.updated_at || d.created_at;
                                    if (!dDateStr) return false;
                                    const dDate = new Date(dDateStr).getTime();
                                    
                                    let inRange = true;
                                    if (exportStartDate) {
                                        const s = new Date(exportStartDate);
                                        s.setHours(0,0,0,0);
                                        if (dDate < s.getTime()) inRange = false;
                                    }
                                    if (exportEndDate) {
                                        const e = new Date(exportEndDate);
                                        e.setHours(23, 59, 59, 999);
                                        if (dDate > e.getTime()) inRange = false;
                                    }
                                    return inRange;
                                });

                                if (exportDetail === 'summary') {
                                    if (exportType === 'overall') {
                                        const whtTotal = filteredData.length
                                        const whtCompleted = filteredData.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
                                        const vatFilteredData = filteredData.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
                                        const vatTotal = vatFilteredData.length
                                        const vatCompleted = vatFilteredData.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
                                        
                                        const overallRow = {
                                            'รายการ / พนักงาน': 'สรุปภาพรวมทั้งหมด',
                                            'WHT ทั้งหมด': whtTotal,
                                            'WHT เสร็จ': whtCompleted,
                                            'WHT คงเหลือ': whtTotal - whtCompleted,
                                            '% WHT': whtTotal > 0 ? Math.round((whtCompleted / whtTotal) * 1000) / 10 : 0,
                                            'แก้ไข WHT': filteredData.reduce((sum, d) => sum + (d.wht_correction_count || 0), 0),
                                            '% แก้ไข WHT': filteredData.length > 0 ? Math.round((filteredData.reduce((s, d) => s + (d.wht_correction_count || 0), 0) / filteredData.length) * 1000) / 10 : 0,
                                            'VAT ทั้งหมด': vatTotal,
                                            'VAT เสร็จ': vatCompleted,
                                            'VAT คงเหลือ': vatTotal - vatCompleted,
                                            '% VAT': vatTotal > 0 ? Math.round((vatCompleted / vatTotal) * 1000) / 10 : 0,
                                            'แก้ไข VAT': vatFilteredData.reduce((sum, d) => sum + (d.vat_correction_count || 0), 0),
                                            '% แก้ไข VAT': vatFilteredData.length > 0 ? Math.round((vatFilteredData.reduce((s, d) => s + (d.vat_correction_count || 0), 0) / vatFilteredData.length) * 1000) / 10 : 0,
                                        }

                                        const map = new Map<string, { name: string; id: string; items: MonthlyTaxData[] }>()
                                        filteredData.forEach(d => {
                                            const name = fmtName(d.accounting_responsible_first_name, d.accounting_responsible_nick_name)
                                            const id = d.accounting_responsible || 'unknown'
                                            if (!map.has(id)) map.set(id, { name, id, items: [] })
                                            map.get(id)!.items.push(d)
                                        })

                                        const empStats = Array.from(map.values()).map(emp => {
                                            const wi = emp.items
                                            const wd = wi.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
                                            const wc = wi.reduce((sum, d) => sum + (d.wht_correction_count || 0), 0)
                                            const vi = emp.items.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
                                            const vd = vi.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
                                            const vc = vi.reduce((sum, d) => sum + (d.vat_correction_count || 0), 0)
                                            return {
                                                'รายการ / พนักงาน': emp.name,
                                                'WHT ทั้งหมด': wi.length,
                                                'WHT เสร็จ': wd,
                                                'WHT คงเหลือ': wi.length - wd,
                                                '% WHT': wi.length > 0 ? Math.round((wd / wi.length) * 1000) / 10 : 0,
                                                'แก้ไข WHT': wc,
                                                '% แก้ไข WHT': wi.length > 0 ? Math.round((wc / wi.length) * 1000) / 10 : 0,
                                                'VAT ทั้งหมด': vi.length,
                                                'VAT เสร็จ': vd,
                                                'VAT คงเหลือ': vi.length - vd,
                                                '% VAT': vi.length > 0 ? Math.round((vd / vi.length) * 1000) / 10 : 0,
                                                'แก้ไข VAT': vc,
                                                '% แก้ไข VAT': vi.length > 0 ? Math.round((vc / vi.length) * 1000) / 10 : 0,
                                            }
                                        })
                                        
                                        const exData = [overallRow, ...empStats]
                                        exportToExcel(exData, `สรุปภาพรวมทั้งหมด_${new Date().toISOString().split('T')[0]}`)
                                    } else {
                                        const map = new Map<string, { name: string; id: string; items: MonthlyTaxData[] }>()
                                        filteredData.forEach(d => {
                                            const name = fmtName(d.accounting_responsible_first_name, d.accounting_responsible_nick_name)
                                            const id = d.accounting_responsible || 'unknown'
                                            if (!map.has(id)) map.set(id, { name, id, items: [] })
                                            map.get(id)!.items.push(d)
                                        })
                                        const empStats = Array.from(map.values()).map(emp => {
                                            const wi = emp.items
                                            const wd = wi.filter(d => WHT_COMPLETED_STATUSES.includes(d.pnd_status || '')).length
                                            const wc = wi.reduce((sum, d) => sum + (d.wht_correction_count || 0), 0)
                                            const vi = emp.items.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
                                            const vd = vi.filter(d => VAT_COMPLETED_STATUSES.includes(d.pp30_form || '')).length
                                            const vc = vi.reduce((sum, d) => sum + (d.vat_correction_count || 0), 0)
                                            return {
                                                'พนักงาน': emp.name,
                                                'WHT ทั้งหมด': wi.length,
                                                'WHT เสร็จ': wd,
                                                'WHT คงเหลือ': wi.length - wd,
                                                '% WHT': wi.length > 0 ? Math.round((wd / wi.length) * 1000) / 10 : 0,
                                                'แก้ไข WHT': wc,
                                                '% แก้ไข WHT': wi.length > 0 ? Math.round((wc / wi.length) * 1000) / 10 : 0,
                                                'VAT ทั้งหมด': vi.length,
                                                'VAT เสร็จ': vd,
                                                'VAT คงเหลือ': vi.length - vd,
                                                '% VAT': vi.length > 0 ? Math.round((vd / vi.length) * 1000) / 10 : 0,
                                                'แก้ไข VAT': vc,
                                                '% แก้ไข VAT': vi.length > 0 ? Math.round((vc / vi.length) * 1000) / 10 : 0,
                                            }
                                        })
                                        exportToExcel(empStats, `สรุปผลงานผู้ทำบัญชี_${new Date().toISOString().split('T')[0]}`)
                                    }
                                } else {
                                    const rawExportData = filteredData.map(d => ({
                                        'Build': d.build,
                                        'ชื่อบริษัท': d.company_name,
                                        'ผู้ทำบัญชี': fmtName(d.accounting_responsible_first_name, d.accounting_responsible_nick_name),
                                        'สถานะ WHT': d.pnd_status ? (STATUS_CONFIG[d.pnd_status]?.label || d.pnd_status) : '-',
                                        'สถานะ VAT': d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' 
                                            ? (d.pp30_form ? (STATUS_CONFIG[d.pp30_form]?.label || d.pp30_form) : '-') 
                                            : 'ไม่ได้จด VAT',
                                        'แก้ไขล่าสุด': d.updated_at ? new Date(d.updated_at).toLocaleString('th-TH') : '-'
                                    }));
                                    
                                    if (exportType === 'individual') {
                                        rawExportData.sort((a, b) => {
                                            if (a['ผู้ทำบัญชี'] !== b['ผู้ทำบัญชี']) return (a['ผู้ทำบัญชี'] || '').localeCompare(b['ผู้ทำบัญชี'] || '');
                                            return (a['Build'] || '').localeCompare(b['Build'] || '');
                                        });
                                        exportToExcel(rawExportData, `รายละเอียดงานรายบุคคล_${new Date().toISOString().split('T')[0]}`)
                                    } else {
                                        rawExportData.sort((a, b) => (a['Build'] || '').localeCompare(b['Build'] || ''));
                                        exportToExcel(rawExportData, `รายละเอียดงานทั้งหมด_${new Date().toISOString().split('T')[0]}`)
                                    }
                                }
                            } catch (error) {
                                console.error('Export error:', error);
                            } finally {
                                setIsExporting(false);
                                setExportModalOpen(false);
                            }
                        }}
                        mt="md"
                    >
                        ดาวน์โหลด Excel
                    </Button>
                </Stack>
            </Modal>

            {/* ═══ Export Status Modal ═══ */}
            <Modal
                opened={exportStatusModalOpen}
                onClose={() => setExportStatusModalOpen(false)}
                title={
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="orange" variant="light">
                            <TbDownload size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={700}>ส่งออกข้อมูลสถานะงาน (Excel)</Text>
                    </Group>
                }
                size="md"
                radius="lg"
                centered
            >
                <Stack gap="md">
                    <Select
                        label="ประเภทภาษี"
                        data={[
                            { value: 'wht', label: 'ภาษีหัก ณ ที่จ่าย (WHT)' },
                            { value: 'vat', label: 'ภาษีมูลค่าเพิ่ม (VAT)' }
                        ]}
                        value={exportTargetType}
                        onChange={(val) => {
                            setExportTargetType(val || 'wht')
                            setExportTargetStatus('all')
                        }}
                    />
                    
                    <Select
                        label="สถานะงาน"
                        data={[
                            { value: 'all', label: 'ทุกสถานะ' },
                            ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_CONFIG[s]?.label || s }))
                        ]}
                        value={exportTargetStatus}
                        onChange={(val) => setExportTargetStatus(val || 'all')}
                        searchable
                    />

                    <Button
                        variant="light"
                        color="orange"
                        fullWidth
                        loading={isExportingStatus}
                        onClick={async () => {
                            setIsExportingStatus(true)
                            try {
                                let filteredData = data;
                                
                                if (exportTargetType === 'vat') {
                                    filteredData = data.filter(d => d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม');
                                    if (exportTargetStatus !== 'all') {
                                        filteredData = filteredData.filter(d => (d.pp30_form || 'not_started') === exportTargetStatus);
                                    }
                                } else {
                                    if (exportTargetStatus !== 'all') {
                                        filteredData = filteredData.filter(d => (d.pnd_status || 'not_started') === exportTargetStatus);
                                    }
                                }

                                const rawExportData = filteredData.map((d, index) => ({
                                    'ลำดับ': index + 1,
                                    'Build': d.build,
                                    'ชื่อบริษัท': d.company_name,
                                    'ผู้ทำบัญชี': fmtName(d.accounting_responsible_first_name, d.accounting_responsible_nick_name),
                                    'ประเภทภาษี': exportTargetType === 'wht' ? 'WHT' : 'VAT',
                                    'สถานะงาน': exportTargetType === 'wht' 
                                        ? (STATUS_CONFIG[d.pnd_status || 'not_started']?.label || '-') 
                                        : (STATUS_CONFIG[d.pp30_form || 'not_started']?.label || '-'),
                                    'แก้ไขล่าสุด': d.updated_at ? new Date(d.updated_at).toLocaleString('th-TH') : '-'
                                }));

                                exportToExcel(rawExportData, `สถานะงาน_${exportTargetType.toUpperCase()}_${exportTargetStatus === 'all' ? 'ทั้งหมด' : (STATUS_CONFIG[exportTargetStatus]?.label || exportTargetStatus)}_${new Date().toISOString().split('T')[0]}`)
                            } catch (error) {
                                console.error('Export error:', error);
                            } finally {
                                setIsExportingStatus(false)
                                setExportStatusModalOpen(false)
                            }
                        }}
                        mt="md"
                    >
                        ดาวน์โหลด Excel
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    )
}
