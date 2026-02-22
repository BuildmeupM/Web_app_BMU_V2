/**
 * AuditTab — Tab content for Audit (ผู้ตรวจภาษี) view
 * Redesigned: Summary cards, WHT/VAT breakdown, Top 3 leaderboard, Pending review queue
 */

import { useMemo, useState, useEffect } from 'react'
import { Stack, SimpleGrid, Paper, Text, Group, ThemeIcon, Progress, Modal, Table, Badge, Button } from '@mantine/core'
import { TbUsers, TbFileCheck, TbChartBar, TbTrophy, TbClock, TbUser, TbEye, TbEdit } from 'react-icons/tb'
import type { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import { STATUS_CONFIG, WHT_COMPLETED_STATUSES, VAT_COMPLETED_STATUSES } from './constants'
import { activityLogsService } from '../../services/activityLogsService'
import type { AuditCorrectionAuditor, AuditCorrectionCompany } from '../../services/activityLogsService'

// ── Types ──
interface AuditorStats {
    id: string
    name: string
    total: number
    whtTotal: number
    whtCompleted: number
    whtPending: number
    vatTotal: number
    vatCompleted: number
    vatPending: number
    combinedTotal: number
    combinedCompleted: number
    combinedPct: number
    whtPct: number
    vatPct: number
}

// ── Helpers ──
function getAuditorName(d: MonthlyTaxData): string {
    const first = d.tax_inspection_responsible_first_name
    const nick = d.tax_inspection_responsible_nick_name
    if (first && nick) return `${first}(${nick})`
    return first || nick || 'ไม่ระบุ'
}


const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#FFD700', '#7B68EE', '#9370DB']
const CARD_GRADIENTS = [
    'linear-gradient(135deg, #fff8e1, #fffde7)',
    'linear-gradient(135deg, #e8eaf6, #f3e5f5)',
    'linear-gradient(135deg, #f3e5f5, #fce4ec)',
]

export default function AuditTab({
    data,
    employeeNameMap = new Map(),
    year,
    month,
}: {
    data: MonthlyTaxData[]
    employeeNameMap?: Map<string, string>
    year: number
    month: number
}) {
    // ── Compute auditor stats ──
    const { auditors, totals } = useMemo(() => {
        const map = new Map<string, AuditorStats>()
        let whtAll = 0, whtDoneAll = 0, vatAll = 0, vatDoneAll = 0

        data.forEach(d => {
            const empId = d.tax_inspection_responsible || 'unknown'
            const displayName = employeeNameMap.get(empId) || getAuditorName(d)

            const auditor = map.get(empId) || {
                id: empId,
                name: displayName,
                total: 0,
                whtTotal: 0, whtCompleted: 0, whtPending: 0,
                vatTotal: 0, vatCompleted: 0, vatPending: 0,
                combinedTotal: 0, combinedCompleted: 0, combinedPct: 0,
                whtPct: 0, vatPct: 0,
            }

            auditor.total++

            // WHT (pnd_status)
            const pnd = d.pnd_status || 'not_started'
            if (pnd !== 'not_started') {
                auditor.whtTotal++
                whtAll++
                if (WHT_COMPLETED_STATUSES.includes(pnd)) {
                    auditor.whtCompleted++
                    whtDoneAll++
                }
                if (pnd === 'pending_review') auditor.whtPending++
            }

            // VAT (pp30_form)
            const vat = d.pp30_form || 'not_started'
            if (vat !== 'not_started') {
                auditor.vatTotal++
                vatAll++
                if (VAT_COMPLETED_STATUSES.includes(vat)) {
                    auditor.vatCompleted++
                    vatDoneAll++
                }
                if (vat === 'pending_review') auditor.vatPending++
            }

            map.set(empId, auditor)
        })

        // Calculate percentages
        const list = Array.from(map.values()).map(a => {
            a.combinedTotal = a.whtTotal + a.vatTotal
            a.combinedCompleted = a.whtCompleted + a.vatCompleted
            a.combinedPct = a.combinedTotal > 0 ? Math.round((a.combinedCompleted / a.combinedTotal) * 1000) / 10 : 0
            a.whtPct = a.whtTotal > 0 ? Math.round((a.whtCompleted / a.whtTotal) * 1000) / 10 : 0
            a.vatPct = a.vatTotal > 0 ? Math.round((a.vatCompleted / a.vatTotal) * 1000) / 10 : 0
            return a
        })

        // Sort by combined % descending, then by total completed
        list.sort((a, b) => b.combinedPct - a.combinedPct || b.combinedCompleted - a.combinedCompleted)

        const overallPct = (whtAll + vatAll) > 0
            ? Math.round(((whtDoneAll + vatDoneAll) / (whtAll + vatAll)) * 1000) / 10
            : 0

        return {
            auditors: list,
            totals: {
                auditorCount: list.filter(a => a.id !== 'unknown').length,
                whtTotal: whtAll,
                whtCompleted: whtDoneAll,
                whtRemaining: whtAll - whtDoneAll,
                vatTotal: vatAll,
                vatCompleted: vatDoneAll,
                vatRemaining: vatAll - vatDoneAll,
                overallPct,
                whtPct: whtAll > 0 ? Math.round((whtDoneAll / whtAll) * 1000) / 10 : 0,
                vatPct: vatAll > 0 ? Math.round((vatDoneAll / vatAll) * 1000) / 10 : 0,
            },
        }
    }, [data, employeeNameMap])

    // ── Pending review items with company details ──
    type PendingCompany = { build: string; companyName: string; status: string; accountingResponsible: string }
    type PendingAuditor = { id: string; name: string; count: number; companies: PendingCompany[] }

    const { whtPending, vatPending } = useMemo(() => {
        const whtMap = new Map<string, PendingAuditor>()
        const vatMap = new Map<string, PendingAuditor>()

        data.forEach(d => {
            const empId = d.tax_inspection_responsible || 'unknown'
            const displayName = employeeNameMap.get(empId) || getAuditorName(d)
            const companyName = d.company_name || d.build
            const acctName = d.accounting_responsible_first_name && d.accounting_responsible_nick_name
                ? `${d.accounting_responsible_first_name}(${d.accounting_responsible_nick_name})`
                : d.accounting_responsible_first_name || d.accounting_responsible_nick_name || '-'

            if (d.pnd_status === 'pending_review') {
                const cur = whtMap.get(empId) || { id: empId, name: displayName, count: 0, companies: [] }
                cur.count++
                cur.companies.push({ build: d.build, companyName, status: d.pnd_status || 'not_started', accountingResponsible: acctName })
                whtMap.set(empId, cur)
            }
            if (d.pp30_form === 'pending_review') {
                const cur = vatMap.get(empId) || { id: empId, name: displayName, count: 0, companies: [] }
                cur.count++
                cur.companies.push({ build: d.build, companyName, status: d.pp30_form || 'not_started', accountingResponsible: acctName })
                vatMap.set(empId, cur)
            }
        })

        return {
            whtPending: Array.from(whtMap.values()).sort((a, b) => b.count - a.count),
            vatPending: Array.from(vatMap.values()).sort((a, b) => b.count - a.count),
        }
    }, [data, employeeNameMap])

    // ── Correction data from activity_logs (API) ──
    const [correctionData, setCorrectionData] = useState<{
        auditors: AuditCorrectionAuditor[]
        total_wht: number
        total_vat: number
    }>({ auditors: [], total_wht: 0, total_vat: 0 })

    useEffect(() => {
        activityLogsService.getAuditCorrections(year, month)
            .then(data => setCorrectionData(data))
            .catch(err => console.error('Failed to fetch audit corrections:', err))
    }, [year, month])

    // ── Modal state ──
    const [detailModal, setDetailModal] = useState<{
        open: boolean
        type: 'WHT' | 'VAT'
        auditorName: string
        companies: PendingCompany[]
    }>({ open: false, type: 'WHT', auditorName: '', companies: [] })

    const [correctionModal, setCorrectionModal] = useState<{
        open: boolean
        type: 'WHT' | 'VAT' | 'ทั้งหมด'
        auditorName: string
        companies: AuditCorrectionCompany[]
    }>({ open: false, type: 'WHT', auditorName: '', companies: [] })

    const whtPendingTotal = whtPending.reduce((s, p) => s + p.count, 0)
    const vatPendingTotal = vatPending.reduce((s, p) => s + p.count, 0)

    const top3 = auditors.filter(a => a.id !== 'unknown').slice(0, 3)

    return (
        <Stack gap="lg">
            {/* ═══ Section 1: Summary Cards ═══ */}
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderLeft: '4px solid #2196f3' }}>
                    <Group gap={8} mb="xs">
                        <ThemeIcon size={32} radius="md" color="blue" variant="light"><TbUsers size={18} /></ThemeIcon>
                        <Text size="xs" c="gray.6" fw={500}>ผู้ตรวจทั้งหมด</Text>
                    </Group>
                    <Text size="xl" fw={800} c="blue">{totals.auditorCount}</Text>
                    <Text size="xs" c="gray.5">คน</Text>
                </Paper>

                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderLeft: '4px solid #4caf50' }}>
                    <Group gap={8} mb="xs">
                        <ThemeIcon size={32} radius="md" color="green" variant="light"><TbFileCheck size={18} /></ThemeIcon>
                        <Text size="xs" c="gray.6" fw={500}>งาน WHT ทั้งหมด</Text>
                    </Group>
                    <Text size="xl" fw={800} c="green">{totals.whtTotal}</Text>
                    <Text size="xs" c="gray.5">รายการ</Text>
                </Paper>

                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderLeft: '4px solid #9c27b0' }}>
                    <Group gap={8} mb="xs">
                        <ThemeIcon size={32} radius="md" color="violet" variant="light"><TbFileCheck size={18} /></ThemeIcon>
                        <Text size="xs" c="gray.6" fw={500}>งาน VAT ทั้งหมด</Text>
                    </Group>
                    <Text size="xl" fw={800} c="violet">{totals.vatTotal}</Text>
                    <Text size="xs" c="gray.5">รายการ</Text>
                </Paper>

                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderLeft: '4px solid #ff6b35' }}>
                    <Group gap={8} mb="xs">
                        <ThemeIcon size={32} radius="md" color="orange" variant="light"><TbChartBar size={18} /></ThemeIcon>
                        <Text size="xs" c="gray.6" fw={500}>อัตราเฉลี่ยสำเร็จ</Text>
                    </Group>
                    <Text size="xl" fw={800} c="orange">{totals.overallPct}%</Text>
                    <Text size="xs" c="gray.5">WHT + VAT</Text>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 2: WHT / VAT Summary + Progress ═══ */}
            <SimpleGrid cols={{ base: 1, md: 3 }}>
                {/* WHT Summary */}
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="blue" variant="light"><TbFileCheck size={16} /></ThemeIcon>
                        <Text size="sm" fw={700} c="dark">สรุป WHT</Text>
                    </Group>
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">งานทั้งหมด:</Text>
                            <Text size="lg" fw={800}>{totals.whtTotal}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">เสร็จแล้วทั้งหมด:</Text>
                            <Text size="lg" fw={800} c="green">{totals.whtCompleted}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">คงเหลือที่ยังไม่เสร็จ:</Text>
                            <Text size="lg" fw={800} c="red">{totals.whtRemaining}</Text>
                        </Group>
                    </Stack>
                </Paper>

                {/* VAT Summary */}
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="violet" variant="light"><TbChartBar size={16} /></ThemeIcon>
                        <Text size="sm" fw={700} c="dark">สรุป VAT</Text>
                    </Group>
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">งานทั้งหมด:</Text>
                            <Text size="lg" fw={800}>{totals.vatTotal}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">เสร็จแล้วทั้งหมด:</Text>
                            <Text size="lg" fw={800} c="green">{totals.vatCompleted}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">คงเหลือที่ยังไม่เสร็จ:</Text>
                            <Text size="lg" fw={800} c="red">{totals.vatRemaining}</Text>
                        </Group>
                    </Stack>
                </Paper>

                {/* Progress */}
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="orange" variant="light"><TbChartBar size={16} /></ThemeIcon>
                        <Text size="sm" fw={700} c="dark">ความคืบหน้า</Text>
                    </Group>
                    <Stack gap="lg">
                        <div>
                            <Group justify="space-between" mb={4}>
                                <Text size="sm" fw={500}>WHT</Text>
                                <Text size="sm" fw={700} c="blue">{totals.whtPct}%</Text>
                            </Group>
                            <Progress value={totals.whtPct} color="blue" size="lg" radius="md" animated />
                        </div>
                        <div>
                            <Group justify="space-between" mb={4}>
                                <Text size="sm" fw={500}>VAT</Text>
                                <Text size="sm" fw={700} c="orange">{totals.vatPct}%</Text>
                            </Group>
                            <Progress value={totals.vatPct} color="orange" size="lg" radius="md" animated />
                        </div>
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 3: Top 3 Leaderboard ═══ */}
            {top3.length > 0 && (
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="lg">
                        <ThemeIcon size={28} radius="md" color="yellow" variant="light">
                            <TbTrophy size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={700} c="dark">🏆 Top {Math.min(3, top3.length)} ผู้ตรวจ (WHT + VAT)</Text>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: Math.min(3, top3.length) }}>
                        {top3.map((a, i) => (
                            <Paper
                                key={a.id}
                                p="lg"
                                radius="lg"
                                style={{
                                    background: CARD_GRADIENTS[i] || CARD_GRADIENTS[2],
                                    border: i === 0 ? '2px solid #FFD700' : '1px solid #e0e0e0',
                                }}
                            >
                                {/* Header with medal */}
                                <Group justify="center" mb="sm">
                                    <Text size="xl">{MEDAL[i]}</Text>
                                </Group>
                                <Text ta="center" fw={800} size="lg" mb="md">{a.name}</Text>

                                {/* Combined Score */}
                                <Paper p="sm" radius="md" bg="white" mb="sm" withBorder>
                                    <Text ta="center" size="xs" c="gray.6" fw={500}>รวม (WHT + VAT)</Text>
                                    <Text ta="center" size="xl" fw={900} c={MEDAL_COLORS[i]}>
                                        {a.combinedPct}%
                                    </Text>
                                    <Text ta="center" size="xs" c="gray.5">
                                        {a.combinedCompleted}/{a.combinedTotal} งาน
                                    </Text>
                                </Paper>

                                {/* WHT Section */}
                                <Paper
                                    p="sm" radius="md" mb="xs"
                                    style={{ background: 'linear-gradient(135deg, #42a5f5, #64b5f6)' }}
                                >
                                    <Text ta="center" size="xs" c="white" fw={700} mb={4}>WHT</Text>
                                    <Text ta="center" size="lg" fw={900} c="white">{a.whtPct}%</Text>
                                    <SimpleGrid cols={3} mt={4}>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">เสร็จ:</Text>
                                            <Text size="sm" fw={700} c="white">{a.whtCompleted}</Text>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">ทั้งหมด:</Text>
                                            <Text size="sm" fw={700} c="white">{a.whtTotal}</Text>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">รอตรวจ:</Text>
                                            <Text size="sm" fw={700} c="white">{a.whtPending}</Text>
                                        </div>
                                    </SimpleGrid>
                                </Paper>

                                {/* VAT Section */}
                                <Paper
                                    p="sm" radius="md"
                                    style={{ background: 'linear-gradient(135deg, #ab47bc, #ce93d8)' }}
                                >
                                    <Text ta="center" size="xs" c="white" fw={700} mb={4}>VAT</Text>
                                    <Text ta="center" size="lg" fw={900} c="white">{a.vatPct}%</Text>
                                    <SimpleGrid cols={3} mt={4}>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">เสร็จ:</Text>
                                            <Text size="sm" fw={700} c="white">{a.vatCompleted}</Text>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">ทั้งหมด:</Text>
                                            <Text size="sm" fw={700} c="white">{a.vatTotal}</Text>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">รอตรวจ:</Text>
                                            <Text size="sm" fw={700} c="white">{a.vatPending}</Text>
                                        </div>
                                    </SimpleGrid>
                                </Paper>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </Paper>
            )}

            {/* ═══ Section 4: Pending Review Queue ═══ */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                {/* WHT Pending */}
                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderTop: '3px solid #FFB300' }}>
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="yellow" variant="light">
                            <TbClock size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={700} c="dark">สถานะงาน WHT = "รอตรวจ"</Text>
                        </div>
                    </Group>

                    <Paper p="md" radius="md" bg="rgba(255,179,0,0.08)" mb="md">
                        <Group justify="space-between">
                            <div>
                                <Text size="xl" fw={900} c="orange">{whtPendingTotal}</Text>
                                <Text size="xs" c="gray.6">บริษัททั้งหมดที่สถานะ WHT = "รอตรวจ"</Text>
                            </div>
                            <ThemeIcon size={40} radius="xl" color="yellow" variant="light">
                                <TbClock size={20} />
                            </ThemeIcon>
                        </Group>
                    </Paper>

                    {whtPending.length === 0 ? (
                        <Text ta="center" size="sm" c="gray.5" py="md">✅ ไม่มีงานรอตรวจ</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: Math.min(3, whtPending.length) }}>
                            {whtPending.map(p => (
                                <Paper
                                    key={p.id}
                                    p="md"
                                    radius="md"
                                    withBorder
                                    style={{ borderColor: '#FFE082', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,179,0,0.3)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                                    onClick={() => setDetailModal({ open: true, type: 'WHT', auditorName: p.name, companies: p.companies })}
                                >
                                    <Group gap={8} mb="xs">
                                        <ThemeIcon size={28} radius="xl" color="yellow" variant="light">
                                            <TbUser size={14} />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="sm" fw={700}>{p.name}</Text>
                                            <Text size="xs" c="gray.5">ผู้ตรวจ</Text>
                                        </div>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="xs" c="gray.6">จำนวนงาน:</Text>
                                        <Text size="lg" fw={900} c="orange">{p.count}</Text>
                                    </Group>
                                    <Text size="xs" c="orange" ta="center" mt="xs" fw={500}>▶ คลิกเพื่อดูรายละเอียด</Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    )}
                </Paper>

                {/* VAT Pending */}
                <Paper p="lg" radius="lg" className="acct-glass-card" style={{ borderTop: '3px solid #FFB300' }}>
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="yellow" variant="light">
                            <TbClock size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={700} c="dark">สถานะงาน VAT = "รอตรวจ"</Text>
                        </div>
                    </Group>

                    <Paper p="md" radius="md" bg="rgba(255,179,0,0.08)" mb="md">
                        <Group justify="space-between">
                            <div>
                                <Text size="xl" fw={900} c="orange">{vatPendingTotal}</Text>
                                <Text size="xs" c="gray.6">บริษัททั้งหมดที่สถานะ VAT = "รอตรวจ"</Text>
                            </div>
                            <ThemeIcon size={40} radius="xl" color="yellow" variant="light">
                                <TbClock size={20} />
                            </ThemeIcon>
                        </Group>
                    </Paper>

                    {vatPending.length === 0 ? (
                        <Text ta="center" size="sm" c="gray.5" py="md">✅ ไม่มีงานรอตรวจ</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: Math.min(3, vatPending.length) }}>
                            {vatPending.map(p => (
                                <Paper
                                    key={p.id}
                                    p="md"
                                    radius="md"
                                    withBorder
                                    style={{ borderColor: '#FFE082', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,179,0,0.3)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                                    onClick={() => setDetailModal({ open: true, type: 'VAT', auditorName: p.name, companies: p.companies })}
                                >
                                    <Group gap={8} mb="xs">
                                        <ThemeIcon size={28} radius="xl" color="yellow" variant="light">
                                            <TbUser size={14} />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="sm" fw={700}>{p.name}</Text>
                                            <Text size="xs" c="gray.5">ผู้ตรวจ</Text>
                                        </div>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="xs" c="gray.6">จำนวนงาน:</Text>
                                        <Text size="lg" fw={900} c="orange">{p.count}</Text>
                                    </Group>
                                    <Text size="xs" c="orange" ta="center" mt="xs" fw={500}>▶ คลิกเพื่อดูรายละเอียด</Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    )}
                </Paper>
            </SimpleGrid>

            {/* ═══ Section 5: Correction Summary ═══ */}
            <Paper p="lg" radius="lg" className="acct-glass-card">
                <Group gap={8} mb="lg">
                    <ThemeIcon size={28} radius="md" color="orange" variant="light">
                        <TbEdit size={16} />
                    </ThemeIcon>
                    <Text size="sm" fw={700} c="dark">สรุปจำนวนการแก้ไขที่ผู้ตรวจเจอ</Text>
                </Group>

                {/* Totals */}
                <Text size="sm" fw={700} mb="sm">สรุปรวม</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} mb="lg">
                    <Paper p="md" radius="md" withBorder style={{ borderColor: '#2196f3' }}>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">จำนวนการแก้ไข WHT รวม:</Text>
                            <Text size="xl" fw={900} c="blue">{correctionData.total_wht}</Text>
                        </Group>
                    </Paper>
                    <Paper p="md" radius="md" withBorder style={{ borderColor: '#ff6b35' }}>
                        <Group justify="space-between">
                            <Text size="sm" c="gray.7">จำนวนการแก้ไข VAT รวม:</Text>
                            <Text size="xl" fw={900} c="orange">{correctionData.total_vat}</Text>
                        </Group>
                    </Paper>
                </SimpleGrid>

                {/* Table */}
                <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>ผู้ตรวจ</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>จำนวนการแก้ไข WHT</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>จำนวนการแก้ไข VAT</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>รวมทั้งหมด</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>จัดการ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {correctionData.auditors.map(a => {
                            const totalCorr = a.wht_corrections + a.vat_corrections
                            return (
                                <Table.Tr key={a.employee_id}>
                                    <Table.Td>
                                        <Text size="sm" fw={600}>{a.user_name}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={600}>{a.wht_corrections}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={600}>{a.vat_corrections}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={700}>{totalCorr}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Button
                                            size="xs"
                                            color="orange"
                                            variant="filled"
                                            radius="md"
                                            leftSection={<TbEye size={14} />}
                                            onClick={() => setCorrectionModal({ open: true, type: 'ทั้งหมด', auditorName: a.user_name, companies: [...a.wht_companies, ...a.vat_companies] })}
                                        >
                                            ดูรายละเอียด
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            )
                        })}
                    </Table.Tbody>
                </Table>
            </Paper>

            {/* ═══ Detail Modal (Pending) ═══ */}
            <Modal
                opened={detailModal.open}
                onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
                title={
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="orange" variant="light">
                            <TbEye size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={700}>รายละเอียดงานรอตรวจ {detailModal.type}</Text>
                            <Text size="xs" c="gray.6">ผู้ตรวจ: {detailModal.auditorName}</Text>
                        </div>
                    </Group>
                }
                size="lg"
                radius="lg"
            >
                <Text size="sm" c="gray.6" mb="sm">
                    ทั้งหมด {detailModal.companies.length} บริษัท
                </Text>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>#</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>Build</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>ชื่อบริษัท</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>ผู้ทำบัญชี</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8a5c)', color: 'white' }}>สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {detailModal.companies.map((c, idx) => (
                            <Table.Tr key={c.build}>
                                <Table.Td><Text size="sm">{idx + 1}</Text></Table.Td>
                                <Table.Td><Text size="sm" fw={500}>{c.build}</Text></Table.Td>
                                <Table.Td><Text size="sm">{c.companyName}</Text></Table.Td>
                                <Table.Td><Text size="sm">{c.accountingResponsible}</Text></Table.Td>
                                <Table.Td ta="center">
                                    <Badge
                                        color={STATUS_CONFIG[c.status]?.color || '#808080'}
                                        variant="light"
                                        size="sm"
                                    >
                                        {STATUS_CONFIG[c.status]?.label || c.status}
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Modal>

            {/* ═══ Correction Detail Modal ═══ */}
            <Modal
                opened={correctionModal.open}
                onClose={() => setCorrectionModal(prev => ({ ...prev, open: false }))}
                title={
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="red" variant="light">
                            <TbEdit size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={700}>รายละเอียดการแก้ไข {correctionModal.type}</Text>
                            <Text size="xs" c="gray.6">ผู้ตรวจ: {correctionModal.auditorName}</Text>
                        </div>
                    </Group>
                }
                size="lg"
                radius="lg"
            >
                <Text size="sm" c="gray.6" mb="sm">
                    ทั้งหมด {correctionModal.companies.length} บริษัท
                </Text>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #f44336, #ef5350)', color: 'white' }}>#</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #f44336, #ef5350)', color: 'white' }}>Build</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #f44336, #ef5350)', color: 'white' }}>ชื่อบริษัท</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #f44336, #ef5350)', color: 'white' }}>ผู้ทำบัญชี</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #f44336, #ef5350)', color: 'white' }}>สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {correctionModal.companies.map((c, idx) => (
                            <Table.Tr key={c.build}>
                                <Table.Td><Text size="sm">{idx + 1}</Text></Table.Td>
                                <Table.Td><Text size="sm" fw={500}>{c.build}</Text></Table.Td>
                                <Table.Td><Text size="sm">{c.company_name}</Text></Table.Td>
                                <Table.Td><Text size="sm">{c.accounting_responsible}</Text></Table.Td>
                                <Table.Td ta="center">
                                    <Badge
                                        color={STATUS_CONFIG[c.status]?.color || '#808080'}
                                        variant="light"
                                        size="sm"
                                    >
                                        {STATUS_CONFIG[c.status]?.label || c.status}
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Modal>
        </Stack>
    )
}
