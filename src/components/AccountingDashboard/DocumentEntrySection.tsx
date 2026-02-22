/**
 * DocumentEntrySection — สรุปข้อมูลจาก document_entry_work
 * แสดงสถานะการคีย์เอกสาร, จำนวนเอกสาร, สรุปตามพนักงาน, และบริษัทที่เสร็จแล้ว
 */

import { useMemo, useState, useCallback } from 'react'
import { Table, Badge, Paper, Text, Group, ThemeIcon, Stack, SimpleGrid, Progress, TextInput, Modal, Divider, Loader, Box, Select, ActionIcon } from '@mantine/core'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { TbFileCheck, TbUsers, TbChecklist, TbChartBar, TbSearch, TbEye, TbChevronLeft, TbChevronRight } from 'react-icons/tb'
import type { DocumentEntryWork } from '../../services/documentEntryWorkService'
import { getByBuildYearMonth } from '../../services/documentEntryWorkService'
import type { DocumentEntryWorkBot } from '../../services/documentEntryWorkService'

// ═══════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════

interface EmployeeSummary {
    id: string
    name: string
    clientCount: number
    whtDone: number
    vatDone: number
    nonVatDone: number
    whtDocs: number
    vatDocs: number
    nonVatDocs: number
    // Document counts for completed entries only
    whtDocsCompleted: number
    vatDocsCompleted: number
    nonVatDocsCompleted: number
}



// ═══════════════════════════════════════════════════
//  Status helpers
// ═══════════════════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    'ดำเนินการเสร็จแล้ว': { label: 'เสร็จแล้ว', color: '#4caf50', icon: '✅' },
    'กำลังดำเนินการ': { label: 'กำลังทำ', color: '#ff9800', icon: '🔄' },
    'ยังไม่ดำเนินการ': { label: 'ยังไม่เริ่ม', color: '#9e9e9e', icon: '⏳' },
}

function getStatusBadge(status: string | null | undefined) {
    const s = status || 'ยังไม่ดำเนินการ'
    const cfg = STATUS_LABELS[s] || STATUS_LABELS['ยังไม่ดำเนินการ']
    return (
        <Badge
            size="sm"
            variant="light"
            color={s === 'ดำเนินการเสร็จแล้ว' ? 'green' : s === 'กำลังดำเนินการ' ? 'orange' : 'gray'}
        >
            {cfg.icon} {cfg.label}
        </Badge>
    )
}

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

export default function DocumentEntrySection({ data, employeeNameMap = new Map() }: { data: DocumentEntryWork[]; employeeNameMap?: Map<string, string> }) {
    const total = data.length

    // ── Status Counts ──
    const statusCounts = useMemo(() => {
        const count = (field: 'wht_entry_status' | 'vat_entry_status' | 'non_vat_entry_status') => {
            const completed = data.filter(d => d[field] === 'ดำเนินการเสร็จแล้ว').length
            const inProgress = data.filter(d => d[field] === 'กำลังดำเนินการ').length
            const notStarted = total - completed - inProgress
            return { completed, inProgress, notStarted }
        }
        return {
            wht: count('wht_entry_status'),
            vat: count('vat_entry_status'),
            nonVat: count('non_vat_entry_status'),
        }
    }, [data, total])

    // ── Document Counts ──
    const docCounts = useMemo(() => {
        const wht = data.reduce((s, d) => s + (d.wht_document_count || 0), 0)
        const vat = data.reduce((s, d) => s + (d.vat_document_count || 0), 0)
        const nonVat = data.reduce((s, d) => s + (d.non_vat_document_count || 0), 0)
        return { wht, vat, nonVat, total: wht + vat + nonVat }
    }, [data])

    // ── Employee Summary ──
    const employees = useMemo(() => {
        const map = new Map<string, EmployeeSummary>()
        data.forEach(d => {
            const empId = d.responsible_employee_id || 'ไม่ระบุ'
            const displayName = employeeNameMap.get(empId) || empId
            const emp = map.get(empId) || {
                id: empId,
                name: displayName,
                clientCount: 0,
                whtDone: 0, vatDone: 0, nonVatDone: 0,
                whtDocs: 0, vatDocs: 0, nonVatDocs: 0,
                whtDocsCompleted: 0, vatDocsCompleted: 0, nonVatDocsCompleted: 0,
            }
            emp.clientCount++
            const whtDone = d.wht_entry_status === 'ดำเนินการเสร็จแล้ว'
            const vatDone = d.vat_entry_status === 'ดำเนินการเสร็จแล้ว'
            const nonVatDone = d.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว'
            if (whtDone) emp.whtDone++
            if (vatDone) emp.vatDone++
            if (nonVatDone) emp.nonVatDone++
            emp.whtDocs += d.wht_document_count || 0
            emp.vatDocs += d.vat_document_count || 0
            emp.nonVatDocs += d.non_vat_document_count || 0
            if (whtDone) emp.whtDocsCompleted += d.wht_document_count || 0
            if (vatDone) emp.vatDocsCompleted += d.vat_document_count || 0
            if (nonVatDone) emp.nonVatDocsCompleted += d.non_vat_document_count || 0
            map.set(empId, emp)
        })
        return Array.from(map.values()).sort((a, b) => b.clientCount - a.clientCount)
    }, [data, employeeNameMap])

    // ── Companies with data only (submission_count > 0) ──
    const allCompanies = useMemo(() => {
        return data
            .filter(d => (d.submission_count || 0) > 0)
            .map(d => ({
                build: d.build,
                companyName: d.company_name || d.build,
                whtStatus: d.wht_entry_status || 'ยังไม่ดำเนินการ',
                vatStatus: d.vat_entry_status || 'ยังไม่ดำเนินการ',
                nonVatStatus: d.non_vat_entry_status || 'ยังไม่ดำเนินการ',
                whtDocs: d.wht_document_count || 0,
                vatDocs: d.vat_document_count || 0,
                nonVatDocs: d.non_vat_document_count || 0,
                submissionCount: d.submission_count || 0,
                entryTimestamp: d.entry_timestamp,
                workYear: d.work_year,
                workMonth: d.work_month,
            }))
    }, [data])

    // ── Chart data for document counts ──
    const docChartData = [
        { label: 'WHT', count: docCounts.wht, color: '#ff6b35' },
        { label: 'VAT', count: docCounts.vat, color: '#4facfe' },
        { label: 'Non-VAT', count: docCounts.nonVat, color: '#66bb6a' },
    ]

    // ── State for search, pagination & detail modal ──
    const [companySearch, setCompanySearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [selectedCompany, setSelectedCompany] = useState<{
        build: string
        companyName: string
        data: DocumentEntryWork | null
        bots: DocumentEntryWorkBot[]
        submissionCount: number
    } | null>(null)

    const filteredCompanies = useMemo(() => {
        if (!companySearch.trim()) return allCompanies
        const term = companySearch.trim().toLowerCase()
        return allCompanies.filter(c =>
            c.companyName.toLowerCase().includes(term) || c.build.toLowerCase().includes(term)
        )
    }, [allCompanies, companySearch])

    // Reset page when search or pageSize changes
    const handleSearchChange = useCallback((val: string) => {
        setCompanySearch(val)
        setCurrentPage(1)
    }, [])

    const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize))
    const paginatedCompanies = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredCompanies.slice(start, start + pageSize)
    }, [filteredCompanies, currentPage, pageSize])

    const handleCompanyClick = useCallback(async (company: typeof allCompanies[0]) => {
        setDetailModalOpen(true)
        setDetailLoading(true)
        setSelectedCompany({
            build: company.build,
            companyName: company.companyName,
            data: null,
            bots: [],
            submissionCount: company.submissionCount,
        })
        try {
            const detail = await getByBuildYearMonth(company.build, company.workYear, company.workMonth)
            setSelectedCompany({
                build: company.build,
                companyName: company.companyName,
                data: detail.data,
                bots: detail.bots || [],
                submissionCount: detail.submission_count || company.submissionCount,
            })
        } catch {
            // Keep modal open with basic info
        } finally {
            setDetailLoading(false)
        }
    }, [])

    if (total === 0) return null

    return (
        <Stack gap="lg" mt="lg">
            {/* ── Section Header ── */}
            <Paper p="md" radius="lg" className="acct-glass-card" style={{ background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)' }}>
                <Group gap={8}>
                    <ThemeIcon size={32} radius="md" color="orange" variant="light">
                        <TbFileCheck size={18} />
                    </ThemeIcon>
                    <div>
                        <Text size="sm" fw={700} c="dark">สรุปการคีย์เอกสาร (Document Entry)</Text>
                        <Text size="xs" c="gray.6">ข้อมูลจากหน้าคีย์เอกสาร — ทั้งหมด {total} บริษัท</Text>
                    </div>
                </Group>
            </Paper>

            {/* ── 1. Entry Status Summary ── */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="orange" variant="light">
                            <TbChecklist size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="dark">สถานะการคีย์เอกสาร</Text>
                    </Group>
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white' }}>สถานะ</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white' }}>WHT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white' }}>VAT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white' }}>Non-VAT</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td><Badge color="green" variant="light" size="sm">✅ เสร็จแล้ว</Badge></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="green">{statusCounts.wht.completed}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="green">{statusCounts.vat.completed}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="green">{statusCounts.nonVat.completed}</Text></Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Badge color="orange" variant="light" size="sm">🔄 กำลังทำ</Badge></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="orange">{statusCounts.wht.inProgress}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="orange">{statusCounts.vat.inProgress}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="orange">{statusCounts.nonVat.inProgress}</Text></Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td><Badge color="gray" variant="light" size="sm">⏳ ยังไม่เริ่ม</Badge></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="gray.6">{statusCounts.wht.notStarted}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="gray.6">{statusCounts.vat.notStarted}</Text></Table.Td>
                                <Table.Td ta="center"><Text fw={600} c="gray.6">{statusCounts.nonVat.notStarted}</Text></Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                    {/* Progress bars */}
                    <Stack gap="xs" mt="md">
                        {[
                            { label: 'WHT', done: statusCounts.wht.completed, color: '#ff6b35' },
                            { label: 'VAT', done: statusCounts.vat.completed, color: '#4facfe' },
                            { label: 'Non-VAT', done: statusCounts.nonVat.completed, color: '#66bb6a' },
                        ].map(item => (
                            <Group key={item.label} gap="xs">
                                <Text size="xs" fw={600} w={60}>{item.label}</Text>
                                <Progress
                                    value={total > 0 ? (item.done / total) * 100 : 0}
                                    color={item.color}
                                    size="sm"
                                    radius="xl"
                                    style={{ flex: 1 }}
                                />
                                <Text size="xs" c="gray.6" w={50} ta="right">
                                    {total > 0 ? Math.round((item.done / total) * 100) : 0}%
                                </Text>
                            </Group>
                        ))}
                    </Stack>
                </Paper>

                {/* ── 2. Document Count Chart ── */}
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="blue" variant="light">
                            <TbChartBar size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={600} c="dark">จำนวนเอกสารที่คีย์</Text>
                            <Text size="xs" c="gray.6">รวมทั้งหมด {docCounts.total.toLocaleString()} ใบ</Text>
                        </div>
                    </Group>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={docChartData} layout="vertical" margin={{ left: 60, right: 40, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fill: '#666', fontSize: 12 }} />
                            <YAxis
                                type="category"
                                dataKey="label"
                                tick={{ fill: '#444', fontSize: 13, fontWeight: 600 }}
                                width={55}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    background: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 12,
                                    color: '#333',
                                }}
                                formatter={(value: number) => [`${value.toLocaleString()} ใบ`, 'จำนวน']}
                            />
                            <Bar dataKey="count" name="จำนวน" radius={[0, 8, 8, 0]} barSize={28}>
                                {docChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                                <LabelList dataKey="count" position="right" style={{ fill: '#444', fontSize: 12, fontWeight: 600 }} formatter={(v: number) => `${v.toLocaleString()} ใบ`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Summary cards */}
                    <SimpleGrid cols={3} mt="md">
                        {docChartData.map(item => (
                            <Paper key={item.label} p="xs" radius="md" style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}>
                                <Text size="xs" c="gray.6" ta="center">{item.label}</Text>
                                <Text size="lg" fw={700} ta="center" style={{ color: item.color }}>{item.count.toLocaleString()}</Text>
                                <Text size="xs" c="gray.5" ta="center">ใบ</Text>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </Paper>
            </SimpleGrid>

            {/* ── 3. Employee Summary Table ── */}
            {employees.length > 0 && (
                <Paper p="lg" radius="lg" className="acct-glass-card">
                    <Group gap={8} mb="md">
                        <ThemeIcon size={28} radius="md" color="violet" variant="light">
                            <TbUsers size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="dark">สรุปตามพนักงานรับผิดชอบ</Text>
                    </Group>
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>พนักงาน</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>เอกสาร WHT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>เอกสาร VAT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>เอกสาร Non-VAT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>รวมทั้งหมด</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>%</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {employees.map(emp => {
                                const totalDocs = emp.whtDocs + emp.vatDocs + emp.nonVatDocs
                                const totalCompleted = emp.whtDocsCompleted + emp.vatDocsCompleted + emp.nonVatDocsCompleted
                                const pct = totalDocs > 0 ? Math.round((totalCompleted / totalDocs) * 100) : 0
                                return (
                                    <Table.Tr key={emp.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>{emp.name}</Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Text size="sm" fw={600} c={emp.whtDocsCompleted >= emp.whtDocs && emp.whtDocs > 0 ? 'green' : emp.whtDocsCompleted > 0 ? 'orange' : 'gray.5'}>
                                                {emp.whtDocsCompleted}/{emp.whtDocs}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Text size="sm" fw={600} c={emp.vatDocsCompleted >= emp.vatDocs && emp.vatDocs > 0 ? 'green' : emp.vatDocsCompleted > 0 ? 'orange' : 'gray.5'}>
                                                {emp.vatDocsCompleted}/{emp.vatDocs}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Text size="sm" fw={600} c={emp.nonVatDocsCompleted >= emp.nonVatDocs && emp.nonVatDocs > 0 ? 'green' : emp.nonVatDocsCompleted > 0 ? 'orange' : 'gray.5'}>
                                                {emp.nonVatDocsCompleted}/{emp.nonVatDocs}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Text size="sm" fw={700} c={totalCompleted >= totalDocs && totalDocs > 0 ? 'green' : 'dark'}>
                                                {totalCompleted}/{totalDocs}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Badge
                                                color={pct >= 100 ? 'green' : pct >= 50 ? 'orange' : 'red'}
                                                variant="light"
                                                size="md"
                                            >
                                                {pct}%
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                </Paper>
            )}

            {/* ── 4. All Companies (with search) ── */}
            <Paper p="lg" radius="lg" className="acct-glass-card">
                <Group gap={8} mb="md" justify="space-between">
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="green" variant="light">
                            <TbFileCheck size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={600} c="dark">สรุปสถานะรายบริษัท</Text>
                            <Text size="xs" c="gray.6">ทั้งหมด {allCompanies.length} บริษัท · คลิกที่บริษัทเพื่อดูรายละเอียด</Text>
                        </div>
                    </Group>
                    <TextInput
                        placeholder="ค้นหาบริษัท หรือ Build Code..."
                        leftSection={<TbSearch size={14} />}
                        value={companySearch}
                        onChange={e => handleSearchChange(e.currentTarget.value)}
                        size="sm"
                        style={{ width: 280 }}
                        radius="md"
                    />
                </Group>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>Build</Table.Th>
                            <Table.Th style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>ชื่อบริษัท</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>WHT</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>VAT</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>Non-VAT</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>ส่งเข้าระบบ</Table.Th>
                            <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #2e7d32, #66bb6a)', color: 'white' }}>จัดการ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredCompanies.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={7} ta="center">
                                    <Text size="sm" c="gray.5" py="md">ไม่พบบริษัทที่ค้นหา</Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : paginatedCompanies.map(c => (
                            <Table.Tr
                                key={c.build}
                            >
                                <Table.Td>
                                    <Text size="sm" fw={500}>{c.build}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={500}>{c.companyName}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Stack gap={2} align="center">
                                        {getStatusBadge(c.whtStatus)}
                                        {c.whtDocs > 0 && <Text size="xs" c="gray.6">({c.whtDocs} ใบ)</Text>}
                                    </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Stack gap={2} align="center">
                                        {getStatusBadge(c.vatStatus)}
                                        {c.vatDocs > 0 && <Text size="xs" c="gray.6">({c.vatDocs} ใบ)</Text>}
                                    </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Stack gap={2} align="center">
                                        {getStatusBadge(c.nonVatStatus)}
                                        {c.nonVatDocs > 0 && <Text size="xs" c="gray.6">({c.nonVatDocs} ใบ)</Text>}
                                    </Stack>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Text size="sm" fw={500}>{c.submissionCount} ครั้ง</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Badge
                                        leftSection={<TbEye size={12} />}
                                        color="orange"
                                        variant="filled"
                                        size="md"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleCompanyClick(c)}
                                    >
                                        ดูรายละเอียด
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>

                {/* ── Pagination Controls ── */}
                <Group justify="space-between" mt="md" px="xs">
                    <Group gap={8}>
                        <Text size="xs" c="gray.6">แสดง</Text>
                        <Select
                            data={[
                                { value: '20', label: '20 รายการ' },
                                { value: '50', label: '50 รายการ' },
                                { value: '100', label: '100 รายการ' },
                            ]}
                            value={String(pageSize)}
                            onChange={val => { setPageSize(Number(val)); setCurrentPage(1) }}
                            size="xs"
                            style={{ width: 120 }}
                            allowDeselect={false}
                        />
                        <Text size="xs" c="gray.6">
                            {filteredCompanies.length > 0
                                ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredCompanies.length)} จาก ${filteredCompanies.length} รายการ`
                                : '0 รายการ'}
                        </Text>
                    </Group>
                    <Group gap={4}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <TbChevronLeft size={16} />
                        </ActionIcon>
                        <Text size="sm" fw={500} px="xs">
                            หน้า {currentPage} / {totalPages}
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            <TbChevronRight size={16} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Paper>

            {/* ── Company Detail Modal ── */}
            <Modal
                opened={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedCompany(null) }}
                title={
                    <Group gap={8}>
                        <ThemeIcon size={28} radius="md" color="orange" variant="light">
                            <TbFileCheck size={16} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={700}>{selectedCompany?.companyName || ''}</Text>
                            <Text size="xs" c="gray.6">{selectedCompany?.build || ''}</Text>
                        </div>
                    </Group>
                }
                size="lg"
                radius="lg"
            >
                {detailLoading ? (
                    <Stack align="center" py="xl">
                        <Loader color="orange" />
                        <Text size="sm" c="gray.6">กำลังโหลดข้อมูล...</Text>
                    </Stack>
                ) : selectedCompany?.data ? (
                    <Stack gap="md">
                        {/* Summary */}
                        <SimpleGrid cols={3}>
                            <Paper p="sm" radius="md" style={{ background: '#fff5f0', border: '1px solid #ffe0cc' }}>
                                <Text size="xs" c="gray.6" ta="center">WHT</Text>
                                <Text size="lg" fw={700} ta="center" c="#ff6b35">{selectedCompany.data.wht_document_count || 0}</Text>
                                <Text size="xs" c="gray.5" ta="center">ใบ</Text>
                                <Box mt={4}>{getStatusBadge(selectedCompany.data.wht_entry_status)}</Box>
                            </Paper>
                            <Paper p="sm" radius="md" style={{ background: '#f0f7ff', border: '1px solid #cce5ff' }}>
                                <Text size="xs" c="gray.6" ta="center">VAT</Text>
                                <Text size="lg" fw={700} ta="center" c="#4facfe">{selectedCompany.data.vat_document_count || 0}</Text>
                                <Text size="xs" c="gray.5" ta="center">ใบ</Text>
                                <Box mt={4}>{getStatusBadge(selectedCompany.data.vat_entry_status)}</Box>
                            </Paper>
                            <Paper p="sm" radius="md" style={{ background: '#f0faf0', border: '1px solid #c8e6c9' }}>
                                <Text size="xs" c="gray.6" ta="center">Non-VAT</Text>
                                <Text size="lg" fw={700} ta="center" c="#66bb6a">{selectedCompany.data.non_vat_document_count || 0}</Text>
                                <Text size="xs" c="gray.5" ta="center">ใบ</Text>
                                <Box mt={4}>{getStatusBadge(selectedCompany.data.non_vat_entry_status)}</Box>
                            </Paper>
                        </SimpleGrid>

                        <Divider />

                        {/* Submission info */}
                        <div>
                            <Text size="sm" fw={600} mb="xs">ข้อมูลการส่งเข้าระบบ</Text>
                            <SimpleGrid cols={2}>
                                <Group gap={4}>
                                    <Text size="xs" c="gray.6">จำนวนครั้งที่ส่ง:</Text>
                                    <Badge color="blue" variant="light" size="sm">{selectedCompany.submissionCount} ครั้ง</Badge>
                                </Group>
                                <Group gap={4}>
                                    <Text size="xs" c="gray.6">ส่งล่าสุด:</Text>
                                    <Text size="xs" fw={500}>
                                        {selectedCompany.data.entry_timestamp
                                            ? new Date(selectedCompany.data.entry_timestamp).toLocaleString('th-TH')
                                            : '-'}
                                    </Text>
                                </Group>
                            </SimpleGrid>
                        </div>

                        {/* Status timeline */}
                        <div>
                            <Text size="sm" fw={600} mb="xs">ไทม์ไลน์การคีย์</Text>
                            <Table withTableBorder withColumnBorders striped>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th style={{ background: '#f8f9fa' }}>ประเภท</Table.Th>
                                        <Table.Th ta="center" style={{ background: '#f8f9fa' }}>เริ่มคีย์</Table.Th>
                                        <Table.Th ta="center" style={{ background: '#f8f9fa' }}>คีย์เสร็จ</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {[
                                        {
                                            label: 'WHT',
                                            start: selectedCompany.data.wht_entry_start_datetime,
                                            end: selectedCompany.data.wht_entry_completed_datetime,
                                        },
                                        {
                                            label: 'VAT',
                                            start: selectedCompany.data.vat_entry_start_datetime,
                                            end: selectedCompany.data.vat_entry_completed_datetime,
                                        },
                                        {
                                            label: 'Non-VAT',
                                            start: selectedCompany.data.non_vat_entry_start_datetime,
                                            end: selectedCompany.data.non_vat_entry_completed_datetime,
                                        },
                                    ].map(row => (
                                        <Table.Tr key={row.label}>
                                            <Table.Td><Text size="sm" fw={500}>{row.label}</Text></Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs">{row.start ? new Date(row.start).toLocaleString('th-TH') : '-'}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs">{row.end ? new Date(row.end).toLocaleString('th-TH') : '-'}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>

                        {/* Comments */}
                        {(selectedCompany.data.submission_comment || selectedCompany.data.return_comment) && (
                            <>
                                <Divider />
                                <div>
                                    <Text size="sm" fw={600} mb="xs">หมายเหตุ</Text>
                                    {selectedCompany.data.submission_comment && (
                                        <Paper p="sm" radius="md" style={{ background: '#f8f9fa' }} mb="xs">
                                            <Text size="xs" c="gray.6" mb={2}>หมายเหตุการส่ง:</Text>
                                            <Text size="sm">{selectedCompany.data.submission_comment}</Text>
                                        </Paper>
                                    )}
                                    {selectedCompany.data.return_comment && (
                                        <Paper p="sm" radius="md" style={{ background: '#fff5f5' }}>
                                            <Text size="xs" c="red.6" mb={2}>หมายเหตุการคืน:</Text>
                                            <Text size="sm">{selectedCompany.data.return_comment}</Text>
                                        </Paper>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Bots */}
                        {selectedCompany.bots.length > 0 && (
                            <>
                                <Divider />
                                <div>
                                    <Text size="sm" fw={600} mb="xs">แหล่งที่ส่งเข้าระบบ (Bots)</Text>
                                    <Table withTableBorder striped>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ background: '#f8f9fa' }}>แหล่ง</Table.Th>
                                                <Table.Th ta="center" style={{ background: '#f8f9fa' }}>จำนวนเอกสาร</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {selectedCompany.bots.map((bot, idx) => (
                                                <Table.Tr key={idx}>
                                                    <Table.Td>
                                                        <Text size="sm">{bot.bot_type}</Text>
                                                        {bot.ocr_additional_info && (
                                                            <Text size="xs" c="gray.5">{bot.ocr_additional_info}</Text>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td ta="center">
                                                        <Badge color="blue" variant="light" size="md">{bot.document_count}</Badge>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </Stack>
                ) : !detailLoading && (
                    <Text size="sm" c="gray.5" ta="center" py="xl">ไม่พบข้อมูลรายละเอียด</Text>
                )}
            </Modal>
        </Stack>
    )
}
