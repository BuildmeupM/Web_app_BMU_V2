/**
 * SendTaxTab — Tab content for Send Tax (พนักงานยื่นภาษี) view
 * แสดงสถานะ WHT (ภ.ง.ด.) และ VAT (ภ.พ.30) จัดกลุ่มตามสถานะ
 * แสดงเฉพาะ 2 สถานะ: ผ่าน (passed) และ ร่างแบบได้ (draft_ready)
 */

import { useMemo, useState } from 'react'
import { Stack, SimpleGrid, Paper, Text, Group, Avatar, ThemeIcon, Box, Divider, Table, Modal, Badge, Button } from '@mantine/core'
import { TbCheck, TbFileText, TbUser, TbBriefcase, TbDownload } from 'react-icons/tb'
import type { MonthlyTaxData } from '../../services/monthlyTaxDataService'
import { fmtName } from './constants'
import { exportToExcel } from '../../utils/exportExcel'

// ═══════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════

interface EmployeeGroup {
    id: string
    name: string
    count: number
    totalAssigned: number
    items: MonthlyTaxData[]
}

interface StatusGroup {
    status: string
    label: string
    icon: React.ReactNode
    color: string
    bgGradient: string
    borderColor: string
    wht: {
        total: number
        employees: EmployeeGroup[]
    }
    vat: {
        total: number
        employees: EmployeeGroup[]
    }
}

// ═══════════════════════════════════════════════════
//  Status Config
// ═══════════════════════════════════════════════════

const DISPLAY_STATUSES = [
    {
        status: 'passed',
        label: 'ผ่าน',
        icon: <TbCheck size={18} />,
        color: '#4caf50',
        bgGradient: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
        borderColor: '#c8e6c9',
    },
    {
        status: 'draft_ready',
        label: 'ร่างแบบได้',
        icon: <TbFileText size={18} />,
        color: '#ff9800',
        bgGradient: 'linear-gradient(135deg, #fff3e0 0%, #fff8e1 100%)',
        borderColor: '#ffe0b2',
    },
]

// ═══════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════

function EmployeeCard({ employee, color, onClick }: { employee: EmployeeGroup; color: string; onClick: () => void }) {
    return (
        <Paper
            p="md"
            radius="lg"
            onClick={onClick}
            style={{
                border: '1px solid #f0f0f0',
                background: '#fafafa',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
            }}
            className="send-tax-employee-card"
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
            <Group gap="sm" align="center">
                <Avatar
                    size={42}
                    radius="xl"
                    color={color === '#4caf50' ? 'green' : 'orange'}
                    variant="light"
                >
                    <TbUser size={20} />
                </Avatar>
                <div style={{ flex: 1 }}>
                    <Text size="sm" fw={700} c="dark" lineClamp={1}>
                        {employee.name}
                    </Text>
                    <Text size="xs" c="dimmed">พนักงานยื่นภาษี</Text>
                </div>
            </Group>
            <Divider my="xs" color="#eee" />
            <Group justify="space-between" align="center">
                <div>
                    <Text size="xs" c="dimmed">จำนวนงาน:</Text>
                    <Text size="lg" fw={800} c={color} style={{ lineHeight: 1.2 }}>
                        {employee.count}
                    </Text>
                </div>
            </Group>
        </Paper>
    )
}

function EmptyState({ type, status }: { type: 'WHT' | 'VAT'; status: string }) {
    return (
        <Paper
            p="xl"
            radius="lg"
            style={{
                border: '2px dashed #e0e0e0',
                background: '#fafafa',
                textAlign: 'center',
            }}
        >
            <TbBriefcase size={36} color="#bdbdbd" style={{ margin: '0 auto 8px' }} />
            <Text size="sm" c="dimmed">
                ไม่พบบริษัทที่สถานะ {type} = "{status}"
            </Text>
        </Paper>
    )
}

function TaxPanel({
    type,
    total,
    employees,
    statusLabel,
    color,
    borderColor,
    onCardClick,
}: {
    type: 'WHT' | 'VAT'
    total: number
    employees: EmployeeGroup[]
    statusLabel: string
    color: string
    borderColor: string
    onCardClick: (emp: EmployeeGroup) => void
}) {
    return (
        <Box>
            {/* Summary count */}
            <Paper
                p="md"
                radius="lg"
                mb="sm"
                style={{
                    border: `2px solid ${borderColor}`,
                    background: 'white',
                }}
            >
                <Group justify="space-between" align="center">
                    <div>
                        <Text
                            size="xl"
                            fw={900}
                            c={color}
                            style={{ lineHeight: 1 }}
                        >
                            {total}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                            บริษัททั้งหมดที่สถานะ {type} = "{statusLabel}"
                        </Text>
                    </div>
                    <ThemeIcon
                        size={44}
                        radius="xl"
                        variant="light"
                        color={color === '#4caf50' ? 'green' : 'orange'}
                        style={{ opacity: 0.8 }}
                    >
                        {color === '#4caf50' ? <TbCheck size={24} /> : <TbFileText size={24} />}
                    </ThemeIcon>
                </Group>
            </Paper>

            {/* Employee cards */}
            {employees.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: employees.length >= 2 ? 2 : 1 }}>
                    {employees.map(emp => (
                        <EmployeeCard key={emp.id} employee={emp} color={color} onClick={() => onCardClick(emp)} />
                    ))}
                </SimpleGrid>
            ) : (
                <EmptyState type={type} status={statusLabel} />
            )}
        </Box>
    )
}

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

export default function SendTaxTab({ data }: { data: MonthlyTaxData[] }) {
    // ── Detail Modal State ──
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedDetail, setSelectedDetail] = useState<{
        name: string
        type: 'WHT' | 'VAT'
        statusLabel: string
        items: MonthlyTaxData[]
    } | null>(null)

    // ── Compute total assignments per employee ──
    const whtTotalMap = useMemo(() => {
        const map = new Map<string, number>()
        data.forEach(d => {
            const id = d.wht_filer_current_employee_id || d.wht_filer_employee_id || ''
            if (id) map.set(id, (map.get(id) || 0) + 1)
        })
        return map
    }, [data])

    const vatTotalMap = useMemo(() => {
        const map = new Map<string, number>()
        data.forEach(d => {
            const id = d.vat_filer_current_employee_id || d.vat_filer_employee_id || ''
            if (id && d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') map.set(id, (map.get(id) || 0) + 1)
        })
        return map
    }, [data])

    // ── Build status groups ──
    const statusGroups: StatusGroup[] = useMemo(() => {
        return DISPLAY_STATUSES.map(cfg => {
            // WHT: group by wht_filer
            const whtFiltered = data.filter(d => (d.pnd_status || 'not_started') === cfg.status)
            const whtEmpMap = new Map<string, EmployeeGroup>()
            whtFiltered.forEach(d => {
                const id = d.wht_filer_current_employee_id || d.wht_filer_employee_id || 'unknown'
                const name = fmtName(
                    d.wht_filer_current_employee_first_name || d.wht_filer_employee_first_name,
                    d.wht_filer_current_employee_nick_name || d.wht_filer_employee_nick_name,
                )
                const emp = whtEmpMap.get(id) || { id, name, count: 0, totalAssigned: whtTotalMap.get(id) || 0, items: [] }
                emp.count++
                emp.items.push(d)
                whtEmpMap.set(id, emp)
            })

            // VAT: group by vat_filer
            const vatFiltered = data.filter(d => (d.pp30_form || 'not_started') === cfg.status && d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
            const vatEmpMap = new Map<string, EmployeeGroup>()
            vatFiltered.forEach(d => {
                const id = d.vat_filer_current_employee_id || d.vat_filer_employee_id || 'unknown'
                const name = fmtName(
                    d.vat_filer_current_employee_first_name || d.vat_filer_employee_first_name,
                    d.vat_filer_current_employee_nick_name || d.vat_filer_employee_nick_name,
                )
                const emp = vatEmpMap.get(id) || { id, name, count: 0, totalAssigned: vatTotalMap.get(id) || 0, items: [] }
                emp.count++
                emp.items.push(d)
                vatEmpMap.set(id, emp)
            })

            return {
                ...cfg,
                wht: {
                    total: whtFiltered.length,
                    employees: Array.from(whtEmpMap.values()).sort((a, b) => b.count - a.count),
                },
                vat: {
                    total: vatFiltered.length,
                    employees: Array.from(vatEmpMap.values()).sort((a, b) => b.count - a.count),
                },
            }
        })
    }, [data, whtTotalMap, vatTotalMap])

    // ── Total assigned overview (unique employees, merged WHT+VAT) ──
    const allEmployees = useMemo(() => {
        const empMap = new Map<string, { id: string; name: string; whtCount: number; vatCount: number }>()

        data.forEach(d => {
            // WHT filer
            const whtId = d.wht_filer_current_employee_id || d.wht_filer_employee_id || ''
            if (whtId) {
                const whtName = fmtName(
                    d.wht_filer_current_employee_first_name || d.wht_filer_employee_first_name,
                    d.wht_filer_current_employee_nick_name || d.wht_filer_employee_nick_name,
                )
                const emp = empMap.get(whtId) || { id: whtId, name: whtName, whtCount: 0, vatCount: 0 }
                emp.whtCount++
                empMap.set(whtId, emp)
            }

            // VAT filer
            const vatId = d.vat_filer_current_employee_id || d.vat_filer_employee_id || ''
            if (vatId && d.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม') {
                const vatName = fmtName(
                    d.vat_filer_current_employee_first_name || d.vat_filer_employee_first_name,
                    d.vat_filer_current_employee_nick_name || d.vat_filer_employee_nick_name,
                )
                const emp = empMap.get(vatId) || { id: vatId, name: vatName, whtCount: 0, vatCount: 0 }
                emp.vatCount++
                empMap.set(vatId, emp)
            }
        })

        return Array.from(empMap.values()).sort((a, b) => (b.whtCount + b.vatCount) - (a.whtCount + a.vatCount))
    }, [data])

    return (
        <Stack gap="xl">
            {/* ── Total Assigned Overview ── */}
            <Paper
                p="lg"
                radius="lg"
                style={{
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)',
                    border: '1px solid #ffe0cc',
                }}
            >
                <Group justify="space-between" align="flex-start" mb="lg">
                    <div>
                        <Text size="sm" fw={700} c="dark">
                            สรุปงานที่ได้รับมอบหมาย (ทั้งหมด {data.length} บริษัท)
                        </Text>
                        <Text size="xs" c="dimmed">
                            จำนวนงานยื่นภาษีที่แต่ละคนรับผิดชอบ
                        </Text>
                    </div>
                    <Button
                        variant="light"
                        color="green"
                        leftSection={<TbDownload size={16} />}
                        onClick={() => {
                            const exportData = allEmployees.map(emp => ({
                                'พนักงาน': emp.name,
                                'งานยื่น ภ.ง.ด.': emp.whtCount,
                                'งานยื่น ภ.พ.30': emp.vatCount,
                                'รวมจำนวนงาน': emp.whtCount + emp.vatCount
                            }))
                            exportToExcel(exportData, `สรุปงานพนักงานยื่นภาษี_${new Date().toISOString().split('T')[0]}`)
                        }}
                        radius="md"
                        size="sm"
                    >
                        ส่งออก Excel (สรุปงาน)
                    </Button>
                </Group>
                {allEmployees.length > 0 ? (
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white' }}>พนักงาน</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white', width: 100 }}>WHT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white', width: 100 }}>VAT</Table.Th>
                                <Table.Th ta="center" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8f5e)', color: 'white', width: 100 }}>รวม</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {allEmployees.map(emp => (
                                <Table.Tr key={`overview-${emp.id}-${emp.whtCount}-${emp.vatCount}`}>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Avatar size={28} radius="xl" color="orange" variant="light">
                                                <TbUser size={14} />
                                            </Avatar>
                                            <Text size="sm" fw={600}>{emp.name}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={700} c={emp.whtCount > 0 ? 'orange.7' : 'gray.4'}>
                                            {emp.whtCount}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={700} c={emp.vatCount > 0 ? 'green.7' : 'gray.4'}>
                                            {emp.vatCount}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Text size="sm" fw={800} c="dark">
                                            {emp.whtCount + emp.vatCount}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        ไม่พบข้อมูลผู้ยื่นภาษี
                    </Text>
                )}
            </Paper>

            {/* ── Status Sections ── */}
            {statusGroups.map(group => (
                <SimpleGrid key={group.status} cols={{ base: 1, md: 2 }} spacing="lg">
                    {/* WHT Column */}
                    <Paper
                        p="lg"
                        radius="lg"
                        style={{
                            background: group.bgGradient,
                            border: `1px solid ${group.borderColor}`,
                        }}
                    >
                        <Group gap={8} mb="md">
                            <ThemeIcon
                                size={28}
                                radius="xl"
                                color={group.color === '#4caf50' ? 'green' : 'orange'}
                                variant="filled"
                            >
                                {group.icon}
                            </ThemeIcon>
                            <Text size="sm" fw={700} c="dark">
                                สถานะงาน WHT = "{group.label}"
                            </Text>
                        </Group>
                        <TaxPanel
                            type="WHT"
                            total={group.wht.total}
                            employees={group.wht.employees}
                            statusLabel={group.label}
                            color={group.color}
                            borderColor={group.borderColor}
                            onCardClick={(emp) => {
                                setSelectedDetail({
                                    name: emp.name,
                                    type: 'WHT',
                                    statusLabel: group.label,
                                    items: emp.items,
                                })
                                setDetailModalOpen(true)
                            }}
                        />
                    </Paper>

                    {/* VAT Column */}
                    <Paper
                        p="lg"
                        radius="lg"
                        style={{
                            background: group.bgGradient,
                            border: `1px solid ${group.borderColor}`,
                        }}
                    >
                        <Group gap={8} mb="md">
                            <ThemeIcon
                                size={28}
                                radius="xl"
                                color={group.color === '#4caf50' ? 'green' : 'orange'}
                                variant="filled"
                            >
                                {group.icon}
                            </ThemeIcon>
                            <Text size="sm" fw={700} c="dark">
                                สถานะงาน VAT = "{group.label}"
                            </Text>
                        </Group>
                        <TaxPanel
                            type="VAT"
                            total={group.vat.total}
                            employees={group.vat.employees}
                            statusLabel={group.label}
                            color={group.color}
                            borderColor={group.borderColor}
                            onCardClick={(emp) => {
                                setSelectedDetail({
                                    name: emp.name,
                                    type: 'VAT',
                                    statusLabel: group.label,
                                    items: emp.items,
                                })
                                setDetailModalOpen(true)
                            }}
                        />
                    </Paper>
                </SimpleGrid>
            ))}

            {/* ── Detail Modal ── */}
            <Modal
                opened={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={
                    <Group gap="sm">
                        <Avatar color={selectedDetail?.type === 'WHT' ? 'orange' : 'green'} radius="xl">
                            <TbUser size={18} />
                        </Avatar>
                        <div>
                            <Text fw={700} size="lg">{selectedDetail?.name}</Text>
                            <Text size="xs" c="dimmed">
                                {selectedDetail?.type} สถานะ = "{selectedDetail?.statusLabel}"
                            </Text>
                        </div>
                    </Group>
                }
                size="xl"
                padding="xl"
                radius="md"
            >
                <Table striped highlightOnHover withTableBorder>
                    <Table.Thead bg="gray.0">
                        <Table.Tr>
                            <Table.Th>Build Code</Table.Th>
                            <Table.Th>ชื่อบริษัท</Table.Th>
                            <Table.Th>ผู้ทำบัญชี</Table.Th>
                            <Table.Th>ผู้ตรวจ</Table.Th>
                            <Table.Th ta="center">สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {selectedDetail?.items.map((item, index) => (
                            <Table.Tr key={`${item.build}-${index}`}>
                                <Table.Td fw={500}>{item.build}</Table.Td>
                                <Table.Td>{item.company_name || 'ไม่มีชื่อบริษัท'}</Table.Td>
                                <Table.Td>
                                    <Text size="sm">
                                        {fmtName(item.accounting_responsible_first_name || '', item.accounting_responsible_nick_name || '') || item.accounting_responsible_name || '-'}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">
                                        {fmtName(item.tax_inspection_responsible_first_name || '', item.tax_inspection_responsible_nick_name || '') || item.tax_inspection_responsible_name || '-'}
                                    </Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Badge
                                        color={selectedDetail.statusLabel === 'ผ่าน' ? 'green' : 'orange'}
                                        variant="light"
                                    >
                                        {selectedDetail.statusLabel}
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!selectedDetail?.items.length && (
                            <Table.Tr>
                                <Table.Td colSpan={5} ta="center" py="lg">
                                    <Text c="dimmed" size="sm">ไม่พบข้อมูลบริษัท</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Modal>
        </Stack>
    )
}
