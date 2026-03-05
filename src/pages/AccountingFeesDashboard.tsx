/**
 * Accounting Fees Dashboard
 * แดชบอร์ดค่าทำบัญชี — สรุปภาพรวมรายรับ + เปรียบเทียบรายเดือน
 */

import { useState, useMemo } from 'react'
import {
    Container,
    Title,
    Stack,
    Card,
    Group,
    Text,
    Badge,
    Box,
    SimpleGrid,
    Table,
    Loader,
    Center,
    NumberInput,
    RingProgress,
    Progress,
    ThemeIcon,
    Paper,
    Divider,
    Select,
    Button,
    ScrollArea,
    TextInput,
} from '@mantine/core'
import {
    TbChartBar,
    TbCoin,
    TbUsers,
    TbBuildingSkyscraper,
    TbTrendingUp,
    TbFileCheck,
    TbFileX,
    TbArrowsExchange,
    TbArrowUp,
    TbArrowDown,
    TbEqual,
    TbSearch,
    TbRefresh,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import api from '../services/api'

// ─── Types ──────────────────────────────────────────────────

interface DashboardData {
    fee_year: number
    totalMonthlyClients: number
    clientsWithFees: number
    statusBreakdown: { company_status: string; count: number }[]
    taxStatusBreakdown: { tax_registration_status: string; count: number }[]
    monthlyTotals: {
        accounting: number[]
        hr: number[]
    }
    topClients: {
        build: string
        company_name: string
        total_accounting: number
        total_hr: number
    }[]
}

interface CompareClient {
    build: string
    company_name: string
    company_status: string
    tax_registration_status: string
    acc_month_a: number
    acc_month_b: number
    hr_month_a: number
    hr_month_b: number
}

interface CompareData {
    fee_year: number
    month_a: string
    month_b: string
    clients: CompareClient[]
    totalClients: number
    totals: {
        acc_month_a: number
        acc_month_b: number
        hr_month_a: number
        hr_month_b: number
    }
}

type SortField = 'build' | 'company_name' | 'acc_month_a' | 'acc_month_b' | 'acc_diff' | 'hr_month_a' | 'hr_month_b' | 'hr_diff' | null

// ─── Constants ──────────────────────────────────────────────

const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_OPTIONS = MONTH_KEYS.map((key, i) => ({ value: key, label: MONTHS_SHORT[i] }))

const formatCurrency = (val: number): string => Math.round(val).toLocaleString('th-TH')

const getMonthLabel = (key: string): string => {
    const idx = MONTH_KEYS.indexOf(key)
    return idx >= 0 ? MONTHS_SHORT[idx] : key
}

const statusColors: Record<string, string> = {
    'รายเดือน': '#4caf50',
    'รายเดือน / วางมือ': '#ff9800',
    'รายเดือน / จ่ายรายปี': '#2196f3',
    'รายเดือน / เดือนสุดท้าย': '#f44336',
}

// ─── DiffBadge Component ────────────────────────────────────

function DiffBadge({ a, b }: { a: number; b: number }) {
    const diff = b - a
    if (diff === 0) return <Badge size="xs" variant="light" color="gray" leftSection={<TbEqual size={10} />}>0</Badge>
    const isUp = diff > 0
    return (
        <Badge
            size="xs"
            variant="light"
            color={isUp ? 'green' : 'red'}
            leftSection={isUp ? <TbArrowUp size={10} /> : <TbArrowDown size={10} />}
        >
            {isUp ? '+' : ''}{formatCurrency(diff)}
        </Badge>
    )
}

// ─── Stat Card Component ────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    suffix,
}: {
    icon: React.ElementType
    label: string
    value: string | number
    color: string
    suffix?: string
}) {
    return (
        <Card withBorder radius="lg" p="lg" style={{ overflow: 'visible' }}>
            <Group justify="space-between" align="flex-start">
                <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        {label}
                    </Text>
                    <Group gap={4} align="baseline" mt={4}>
                        <Text size="xl" fw={700} style={{ lineHeight: 1 }}>
                            {value}
                        </Text>
                        {suffix && (
                            <Text size="sm" c="dimmed">{suffix}</Text>
                        )}
                    </Group>
                </div>
                <ThemeIcon size={48} radius="lg" variant="light" color={color}>
                    <Icon size={24} />
                </ThemeIcon>
            </Group>
        </Card>
    )
}

// ─── Mini Bar Chart Component ───────────────────────────────

function BarChart({
    data,
    labels,
    color,
    maxValue,
}: {
    data: number[]
    labels: string[]
    color: string
    maxValue: number
}) {
    return (
        <Group gap={2} align="end" style={{ height: 140 }}>
            {data.map((val, i) => {
                const height = maxValue > 0 ? (val / maxValue) * 110 : 0
                return (
                    <Box
                        key={i}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <Text size="8px" c="dimmed" fw={500} style={{ whiteSpace: 'nowrap' }}>
                            {val > 0 ? formatCurrency(val) : ''}
                        </Text>
                        <Box
                            style={{
                                width: '100%',
                                maxWidth: 40,
                                height: Math.max(height, 2),
                                backgroundColor: val > 0 ? color : '#e0e0e0',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                opacity: val > 0 ? 1 : 0.3,
                            }}
                        />
                        <Text size="9px" c="dimmed" fw={500}>
                            {labels[i]}
                        </Text>
                    </Box>
                )
            })}
        </Group>
    )
}

// ─── SortableTh Component ─────────────────────────────────────

const SortableTh = ({
    label,
    subLabel,
    field,
    currentField,
    direction,
    onSort,
    align = 'left'
}: {
    label: string;
    subLabel?: string;
    field: SortField;
    currentField: SortField;
    direction: 'asc' | 'desc';
    onSort: (field: SortField) => void;
    align?: 'left' | 'center' | 'right';
}) => {
    const isActive = currentField === field;
    const Icon = isActive ? (direction === 'asc' ? TbArrowUp : TbArrowDown) : null;
    
    return (
        <Table.Th 
            style={{ textAlign: align, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }} 
            onClick={() => onSort(field)}
        >
            <Group gap={4} justify={align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'} wrap="nowrap">
                <Box style={{ textAlign: align }}>
                    <Text size="xs" fw={isActive ? 700 : 600} c={isActive ? 'blue' : 'dark'}>{label}</Text>
                    {subLabel && <Text size="10px" c="dimmed">{subLabel}</Text>}
                </Box>
                {isActive && Icon && <Icon size={14} color="#228be6" />}
            </Group>
        </Table.Th>
    );
};

// ─── MonthComparisonSection Component ───────────────────────

function MonthComparisonSection({ feeYear }: { feeYear: number }) {
    const currentMonth = new Date().getMonth() // 0-based
    const prevMonth = currentMonth > 0 ? currentMonth - 1 : 0

    const [monthA, setMonthA] = useState<string>(MONTH_KEYS[prevMonth])
    const [monthB, setMonthB] = useState<string>(MONTH_KEYS[currentMonth])
    const [searchTerm, setSearchTerm] = useState('')
    const [displayLimit, setDisplayLimit] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    const { data: compareData, isLoading: isCompareLoading } = useQuery<CompareData>(
        ['accounting-fees-compare', feeYear, monthA, monthB, displayLimit],
        async () => {
            const response = await api.get('/clients/accounting-fees-compare', {
                params: {
                    fee_year: feeYear,
                    month_a: monthA,
                    month_b: monthB,
                    ...(displayLimit !== 'all' ? { limit: parseInt(displayLimit) } : {}),
                },
            })
            return response.data.data
        },
        { enabled: !!monthA && !!monthB }
    )

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortField(field)
            setSortDirection('desc') // default new sort to descending for amounts
        }
    }

    const sortedAndFilteredClients = useMemo(() => {
        if (!compareData?.clients) return []
        let result = [...compareData.clients]

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            result = result.filter(
                (c) =>
                    c.build.toLowerCase().includes(term) ||
                    c.company_name.toLowerCase().includes(term)
            )
        }

        if (sortField) {
            result.sort((a, b) => {
                let valA: string | number = 0
                let valB: string | number = 0

                if (sortField === 'acc_diff') {
                    valA = a.acc_month_b - a.acc_month_a
                    valB = b.acc_month_b - b.acc_month_a
                } else if (sortField === 'hr_diff') {
                    valA = a.hr_month_b - a.hr_month_a
                    valB = b.hr_month_b - b.hr_month_a
                } else {
                    valA = a[sortField as keyof CompareClient] as string | number
                    valB = b[sortField as keyof CompareClient] as string | number
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [compareData, searchTerm, sortField, sortDirection])

    const labelA = getMonthLabel(monthA)
    const labelB = getMonthLabel(monthB)

    // Summary stats
    // const totalAccDiff = compareData ? compareData.totals.acc_month_b - compareData.totals.acc_month_a : 0
    // const totalHrDiff = compareData ? compareData.totals.hr_month_b - compareData.totals.hr_month_a : 0

    // Count companies with increased/decreased/unchanged
    const stats = useMemo(() => {
        if (!compareData?.clients) return { increased: 0, decreased: 0, unchanged: 0 }
        const increased = compareData.clients.filter(c => (c.acc_month_b + c.hr_month_b) > (c.acc_month_a + c.hr_month_a)).length
        const decreased = compareData.clients.filter(c => (c.acc_month_b + c.hr_month_b) < (c.acc_month_a + c.hr_month_a)).length
        const unchanged = compareData.clients.filter(c => (c.acc_month_b + c.hr_month_b) === (c.acc_month_a + c.hr_month_a)).length
        return { increased, decreased, unchanged }
    }, [compareData])

    return (
        <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="xs">
                        <ThemeIcon size={32} radius="lg" variant="light" color="indigo">
                            <TbArrowsExchange size={18} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600} size="sm">เปรียบเทียบค่าทำบัญชีรายเดือน</Text>
                            <Text size="xs" c="dimmed">เลือก 2 เดือนเพื่อเปรียบเทียบรายบริษัท</Text>
                        </div>
                    </Group>

                    <Group gap="sm" wrap="wrap">
                        <Select
                            label="เดือน A"
                            data={MONTH_OPTIONS}
                            value={monthA}
                            onChange={(val) => val && setMonthA(val)}
                            size="xs"
                            w={100}
                            styles={{ label: { fontSize: 11 } }}
                        />
                        <Text size="lg" fw={700} c="dimmed" mt={18}>→</Text>
                        <Select
                            label="เดือน B"
                            data={MONTH_OPTIONS}
                            value={monthB}
                            onChange={(val) => val && setMonthB(val)}
                            size="xs"
                            w={100}
                            styles={{ label: { fontSize: 11 } }}
                        />
                        <Select
                            label="แสดง"
                            data={[
                                { value: '20', label: '20 รายการ' },
                                { value: '50', label: '50 รายการ' },
                                { value: '100', label: '100 รายการ' },
                                { value: 'all', label: 'ทั้งหมด' },
                            ]}
                            value={displayLimit}
                            onChange={(val) => val && setDisplayLimit(val)}
                            size="xs"
                            w={120}
                            styles={{ label: { fontSize: 11 } }}
                        />
                    </Group>
                </Group>

                <Divider />

                {isCompareLoading ? (
                    <Center py="lg"><Loader color="indigo" size="sm" /></Center>
                ) : compareData ? (
                    <>
                        {/* Summary cards */}
                        <SimpleGrid cols={{ base: 2, sm: 4 }}>
                            <Paper p="sm" radius="md" style={{ backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">ค่าบัญชี {labelA}</Text>
                                <Text size="md" fw={700} c="#1565c0">{formatCurrency(compareData.totals.acc_month_a)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" style={{ backgroundColor: '#e8f5e9', textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">ค่าบัญชี {labelB}</Text>
                                <Text size="md" fw={700} c="#2e7d32">{formatCurrency(compareData.totals.acc_month_b)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" style={{ backgroundColor: '#fff3e0', textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">ค่า HR {labelA}</Text>
                                <Text size="md" fw={700} c="#e65100">{formatCurrency(compareData.totals.hr_month_a)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" style={{ backgroundColor: '#fce4ec', textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">ค่า HR {labelB}</Text>
                                <Text size="md" fw={700} c="#c62828">{formatCurrency(compareData.totals.hr_month_b)}</Text>
                            </Paper>
                        </SimpleGrid>

                        {/* Change Summary */}
                        <Group justify="center" gap="lg">
                            <Group gap={6}>
                                <Badge size="sm" variant="light" color="green" leftSection={<TbArrowUp size={10} />}>
                                    เพิ่มขึ้น {stats.increased}
                                </Badge>
                            </Group>
                            <Group gap={6}>
                                <Badge size="sm" variant="light" color="red" leftSection={<TbArrowDown size={10} />}>
                                    ลดลง {stats.decreased}
                                </Badge>
                            </Group>
                            <Group gap={6}>
                                <Badge size="sm" variant="light" color="gray" leftSection={<TbEqual size={10} />}>
                                    ไม่เปลี่ยน {stats.unchanged}
                                </Badge>
                            </Group>
                            <Divider orientation="vertical" />
                            <Group gap={4}>
                                <Text size="xs" c="dimmed">ผลต่างค่าบัญชี:</Text>
                                <DiffBadge a={compareData.totals.acc_month_a} b={compareData.totals.acc_month_b} />
                            </Group>
                            <Group gap={4}>
                                <Text size="xs" c="dimmed">ผลต่าง HR:</Text>
                                <DiffBadge a={compareData.totals.hr_month_a} b={compareData.totals.hr_month_b} />
                            </Group>
                        </Group>

                        {/* Search */}
                        <TextInput
                            placeholder="ค้นหา Build code หรือชื่อบริษัท..."
                            leftSection={<TbSearch size={14} />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="xs"
                        />

                        {/* Comparison Table */}
                        <ScrollArea>
                            <Table withTableBorder withColumnBorders highlightOnHover striped>
                                <Table.Thead>
                                    <Table.Tr style={{ backgroundColor: '#e8eaf6' }}>
                                        <Table.Th style={{ textAlign: 'center', width: 40 }}>#</Table.Th>
                                        <SortableTh label="Build" field="build" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                                        <SortableTh label="ชื่อบริษัท" field="company_name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                                        <SortableTh label="ค่าบัญชี" subLabel={labelA} field="acc_month_a" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                                        <SortableTh label="ค่าบัญชี" subLabel={labelB} field="acc_month_b" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                                        <SortableTh label="ผลต่างบัญชี" field="acc_diff" currentField={sortField} direction={sortDirection} onSort={handleSort} align="center" />
                                        <SortableTh label="ค่า HR" subLabel={labelA} field="hr_month_a" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                                        <SortableTh label="ค่า HR" subLabel={labelB} field="hr_month_b" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                                        <SortableTh label="ผลต่าง HR" field="hr_diff" currentField={sortField} direction={sortDirection} onSort={handleSort} align="center" />
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {sortedAndFilteredClients.length === 0 ? (
                                        <Table.Tr>
                                            <Table.Td colSpan={9}>
                                                <Text c="dimmed" ta="center" py="md">ไม่พบข้อมูล</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ) : (
                                        sortedAndFilteredClients.map((client, idx) => {
                                            const totalA = client.acc_month_a + client.hr_month_a
                                            const totalB = client.acc_month_b + client.hr_month_b
                                            const isIncreased = totalB > totalA
                                            const isDecreased = totalB < totalA

                                            return (
                                                <Table.Tr
                                                    key={client.build}
                                                    style={{
                                                        backgroundColor: isIncreased
                                                            ? 'rgba(76, 175, 80, 0.04)'
                                                            : isDecreased
                                                                ? 'rgba(244, 67, 54, 0.04)'
                                                                : undefined,
                                                    }}
                                                >
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <Text size="xs" c="dimmed">{idx + 1}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" c="dark">{client.build}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" fw={500} lineClamp={1}>{client.company_name}</Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {formatCurrency(client.acc_month_a)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {formatCurrency(client.acc_month_b)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <DiffBadge a={client.acc_month_a} b={client.acc_month_b} />
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {formatCurrency(client.hr_month_a)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {formatCurrency(client.hr_month_b)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <DiffBadge a={client.hr_month_a} b={client.hr_month_b} />
                                                    </Table.Td>
                                                </Table.Tr>
                                            )
                                        })
                                    )}
                                    {/* Totals row */}
                                    {sortedAndFilteredClients.length > 0 && (
                                        <Table.Tr style={{ backgroundColor: '#e8eaf6' }}>
                                            <Table.Td colSpan={3}>
                                                <Text size="xs" fw={700} ta="center">
                                                    รวมทั้งหมด ({compareData.totalClients} บริษัท)
                                                    {compareData.totalClients > sortedAndFilteredClients.length && (
                                                        <Text span size="xs" c="dimmed" fw={400}> — แสดง {sortedAndFilteredClients.length} รายการ</Text>
                                                    )}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text size="xs" fw={700}>{formatCurrency(compareData.totals.acc_month_a)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text size="xs" fw={700}>{formatCurrency(compareData.totals.acc_month_b)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <DiffBadge a={compareData.totals.acc_month_a} b={compareData.totals.acc_month_b} />
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text size="xs" fw={700}>{formatCurrency(compareData.totals.hr_month_a)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text size="xs" fw={700}>{formatCurrency(compareData.totals.hr_month_b)}</Text>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <DiffBadge a={compareData.totals.hr_month_a} b={compareData.totals.hr_month_b} />
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </>
                ) : null}
            </Stack>
        </Card>
    )
}

// ─── Main Component ─────────────────────────────────────────

export default function AccountingFeesDashboard() {
    const currentYear = new Date().getFullYear()
    const [feeYear, setFeeYear] = useState(currentYear)

    const { data: dashboardData, isLoading, refetch, isFetching } = useQuery<DashboardData>(
        ['accounting-fees-dashboard', feeYear],
        async () => {
            const response = await api.get('/clients/accounting-fees-dashboard', {
                params: { fee_year: feeYear },
            })
            return response.data.data
        }
    )

    const totalAccounting = useMemo(
        () => dashboardData?.monthlyTotals.accounting.reduce((a, b) => a + b, 0) || 0,
        [dashboardData]
    )
    const totalHR = useMemo(
        () => dashboardData?.monthlyTotals.hr.reduce((a, b) => a + b, 0) || 0,
        [dashboardData]
    )
    const totalRevenue = totalAccounting + totalHR

    const maxMonthly = useMemo(() => {
        if (!dashboardData) return 0
        const allMonthly = dashboardData.monthlyTotals.accounting.map(
            (acc, i) => acc + dashboardData.monthlyTotals.hr[i]
        )
        return Math.max(...allMonthly)
    }, [dashboardData])

    const feeDataPercentage = dashboardData
        ? dashboardData.totalMonthlyClients > 0
            ? Math.round((dashboardData.clientsWithFees / dashboardData.totalMonthlyClients) * 100)
            : 0
        : 0

    if (isLoading) {
        return (
            <Container size="xl" py="xl">
                <Center py="xl"><Loader color="orange" size="lg" /></Center>
            </Container>
        )
    }

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header */}
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
                        border: 'none',
                    }}
                >
                    <Group justify="space-between" align="center">
                        <Group gap="md">
                            <Box
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <TbChartBar size={32} color="white" />
                            </Box>
                            <div>
                                <Title order={2} c="white" fw={700}>
                                    Dashboard ค่าทำบัญชี
                                </Title>
                                <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                    สรุปภาพรวมค่าทำบัญชีและค่าบริการ HR
                                </Text>
                            </div>
                        </Group>
                        <Group gap="sm">
                            <Text c="white" size="sm" fw={500}>ปีค่าธรรมเนียม</Text>
                            <NumberInput
                                value={feeYear}
                                onChange={(val) => val && setFeeYear(Number(val))}
                                min={2020}
                                max={2030}
                                size="sm"
                                w={100}
                                styles={{
                                    input: {
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        fontWeight: 700,
                                        textAlign: 'center',
                                    },
                                }}
                            />
                            <Button
                                variant="white"
                                color="blue"
                                leftSection={<TbRefresh size={16} />}
                                loading={isFetching}
                                onClick={() => refetch()}
                            >
                                รีเฟรชข้อมูล
                            </Button>
                        </Group>
                    </Group>
                </Card>

                {/* Summary Stats */}
                <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
                    <StatCard
                        icon={TbBuildingSkyscraper}
                        label="ลูกค้ารายเดือนทั้งหมด"
                        value={dashboardData?.totalMonthlyClients || 0}
                        color="blue"
                        suffix="บริษัท"
                    />
                    <StatCard
                        icon={TbFileCheck}
                        label="มีข้อมูลค่าทำบัญชี"
                        value={dashboardData?.clientsWithFees || 0}
                        color="green"
                        suffix="บริษัท"
                    />
                    <StatCard
                        icon={TbCoin}
                        label="รวมค่าทำบัญชีทั้งปี"
                        value={formatCurrency(totalAccounting)}
                        color="orange"
                        suffix="บาท"
                    />
                    <StatCard
                        icon={TbUsers}
                        label="รวมค่าบริการ HR ทั้งปี"
                        value={formatCurrency(totalHR)}
                        color="grape"
                        suffix="บาท"
                    />
                </SimpleGrid>

                {/* Revenue Overview + Coverage */}
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                    {/* Total Revenue */}
                    <Card withBorder radius="lg" p="lg">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text fw={600} size="sm">รายรับรวมทั้งปี {feeYear}</Text>
                                <Badge
                                    variant="outline"
                                    color="orange"
                                    size="lg"
                                    style={{ backgroundColor: 'white' }}
                                >
                                    {formatCurrency(totalRevenue)} บาท
                                </Badge>
                            </Group>
                            <Divider />
                            <Group grow>
                                <Paper
                                    p="md"
                                    radius="md"
                                    style={{ backgroundColor: '#fff3e0', textAlign: 'center' }}
                                >
                                    <TbCoin size={20} color="#ff6b35" />
                                    <Text size="xs" c="dimmed" mt={4}>ค่าทำบัญชี</Text>
                                    <Text size="lg" fw={700} c="#ff6b35">
                                        {formatCurrency(totalAccounting)}
                                    </Text>
                                    <Text size="xs" c="dimmed">บาท</Text>
                                </Paper>
                                <Paper
                                    p="md"
                                    radius="md"
                                    style={{ backgroundColor: '#f3e5f5', textAlign: 'center' }}
                                >
                                    <TbUsers size={20} color="#9c27b0" />
                                    <Text size="xs" c="dimmed" mt={4}>ค่าบริการ HR</Text>
                                    <Text size="lg" fw={700} c="#9c27b0">
                                        {formatCurrency(totalHR)}
                                    </Text>
                                    <Text size="xs" c="dimmed">บาท</Text>
                                </Paper>
                            </Group>
                            {totalRevenue > 0 && (
                                <div>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="xs" c="dimmed">สัดส่วน ค่าทำบัญชี vs ค่า HR</Text>
                                        <Text size="xs" c="dimmed">
                                            {Math.round((totalAccounting / totalRevenue) * 100)}% / {Math.round((totalHR / totalRevenue) * 100)}%
                                        </Text>
                                    </Group>
                                    <Progress.Root size="lg" radius="xl">
                                        <Progress.Section
                                            value={(totalAccounting / totalRevenue) * 100}
                                            color="orange"
                                        >
                                            <Progress.Label>บัญชี</Progress.Label>
                                        </Progress.Section>
                                        <Progress.Section
                                            value={(totalHR / totalRevenue) * 100}
                                            color="grape"
                                        >
                                            <Progress.Label>HR</Progress.Label>
                                        </Progress.Section>
                                    </Progress.Root>
                                </div>
                            )}
                        </Stack>
                    </Card>

                    {/* Data Coverage */}
                    <Card withBorder radius="lg" p="lg">
                        <Stack gap="md">
                            <Text fw={600} size="sm">ความครอบคลุมข้อมูลค่าทำบัญชี</Text>
                            <Divider />
                            <Group justify="center">
                                <RingProgress
                                    size={160}
                                    thickness={16}
                                    roundCaps
                                    sections={[
                                        { value: feeDataPercentage, color: 'green' },
                                    ]}
                                    label={
                                        <div style={{ textAlign: 'center' }}>
                                            <Text size="xl" fw={700}>{feeDataPercentage}%</Text>
                                            <Text size="xs" c="dimmed">ครอบคลุม</Text>
                                        </div>
                                    }
                                />
                                <Stack gap="xs">
                                    <Group gap="xs">
                                        <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                                            <TbFileCheck size={12} />
                                        </ThemeIcon>
                                        <Text size="sm">
                                            มีข้อมูล: <b>{dashboardData?.clientsWithFees || 0}</b> บริษัท
                                        </Text>
                                    </Group>
                                    <Group gap="xs">
                                        <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                                            <TbFileX size={12} />
                                        </ThemeIcon>
                                        <Text size="sm">
                                            ยังไม่มีข้อมูล: <b>{(dashboardData?.totalMonthlyClients || 0) - (dashboardData?.clientsWithFees || 0)}</b> บริษัท
                                        </Text>
                                    </Group>
                                </Stack>
                            </Group>

                            {/* Status Breakdown */}
                            <Divider variant="dashed" />
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase">สถานะบริษัท</Text>
                            <Stack gap={6}>
                                {dashboardData?.statusBreakdown.map((s) => (
                                    <Group key={s.company_status} justify="space-between">
                                        <Group gap="xs">
                                            <Box
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: statusColors[s.company_status] || '#999',
                                                }}
                                            />
                                            <Text size="sm">{s.company_status}</Text>
                                        </Group>
                                        <Badge variant="light" color="gray" size="sm">{s.count}</Badge>
                                    </Group>
                                ))}
                            </Stack>

                            {/* Tax Status */}
                            <Divider variant="dashed" />
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase">สถานะจดภาษีมูลค่าเพิ่ม</Text>
                            <Stack gap={6}>
                                {dashboardData?.taxStatusBreakdown.map((t) => (
                                    <Group key={t.tax_registration_status || 'null'} justify="space-between">
                                        <Group gap="xs">
                                            <Box
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        t.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? '#4caf50' :
                                                            t.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม' ? '#f44336' : '#999',
                                                }}
                                            />
                                            <Text size="sm">{t.tax_registration_status || 'ไม่ระบุ'}</Text>
                                        </Group>
                                        <Badge variant="light" color="gray" size="sm">{t.count}</Badge>
                                    </Group>
                                ))}
                            </Stack>
                        </Stack>
                    </Card>
                </SimpleGrid>

                {/* Monthly Charts */}
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card withBorder radius="lg" p="lg">
                        <Group justify="space-between" mb="md">
                            <Group gap="xs">
                                <TbCoin size={18} color="#ff6b35" />
                                <Text fw={600} size="sm">ค่าทำบัญชีรายเดือน</Text>
                            </Group>
                            <Badge variant="light" color="orange" size="sm">
                                รวม {formatCurrency(totalAccounting)} บาท
                            </Badge>
                        </Group>
                        <BarChart
                            data={dashboardData?.monthlyTotals.accounting || Array(12).fill(0)}
                            labels={MONTHS_SHORT}
                            color="#ff6b35"
                            maxValue={maxMonthly}
                        />
                    </Card>

                    <Card withBorder radius="lg" p="lg">
                        <Group justify="space-between" mb="md">
                            <Group gap="xs">
                                <TbUsers size={18} color="#9c27b0" />
                                <Text fw={600} size="sm">ค่าบริการ HR รายเดือน</Text>
                            </Group>
                            <Badge variant="light" color="grape" size="sm">
                                รวม {formatCurrency(totalHR)} บาท
                            </Badge>
                        </Group>
                        <BarChart
                            data={dashboardData?.monthlyTotals.hr || Array(12).fill(0)}
                            labels={MONTHS_SHORT}
                            color="#9c27b0"
                            maxValue={maxMonthly}
                        />
                    </Card>
                </SimpleGrid>

                {/* ────────── Month Comparison Section ────────── */}
                <MonthComparisonSection feeYear={feeYear} />

                {/* Top 10 Clients */}
                <Card withBorder radius="lg" p="lg">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <TbTrendingUp size={18} color="#1565c0" />
                            <Text fw={600} size="sm">Top 10 ลูกค้า — ค่าทำบัญชีสูงสุด</Text>
                        </Group>
                        <Badge variant="light" color="orange" size="sm">ปี {feeYear}</Badge>
                    </Group>
                    <Table withTableBorder withColumnBorders highlightOnHover>
                        <Table.Thead>
                            <Table.Tr style={{ backgroundColor: '#e3f2fd' }}>
                                <Table.Th style={{ textAlign: 'center', width: 40 }}>#</Table.Th>
                                <Table.Th style={{ width: 80 }}>Build</Table.Th>
                                <Table.Th>ชื่อบริษัท</Table.Th>
                                <Table.Th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>ค่าทำบัญชีรวม</Table.Th>
                                <Table.Th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>ค่า HR รวม</Table.Th>
                                <Table.Th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>รวมทั้งหมด</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dashboardData?.topClients && dashboardData.topClients.length > 0 ? (
                                dashboardData.topClients.map((client, i) => (
                                    <Table.Tr key={client.build}>
                                        <Table.Td style={{ textAlign: 'center' }}>
                                            <Badge
                                                size="sm"
                                                variant={i < 3 ? 'filled' : 'light'}
                                                color={i === 0 ? 'yellow' : i === 1 ? 'gray' : i === 2 ? 'orange' : 'blue'}
                                                circle
                                            >
                                                {i + 1}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dark">{client.build}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500} lineClamp={1}>{client.company_name}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Text size="sm" fw={600} c="orange">
                                                {formatCurrency(client.total_accounting)}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Text size="sm" fw={500} c="grape">
                                                {formatCurrency(client.total_hr)}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Text size="sm" fw={700}>
                                                {formatCurrency(client.total_accounting + client.total_hr)}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text c="dimmed" ta="center" py="lg">ไม่พบข้อมูล</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Card>
            </Stack>
        </Container>
    )
}
