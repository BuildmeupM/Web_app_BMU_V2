/**
 * Accounting Fees Management Page
 * หน้าจัดการค่าทำบัญชี / ค่าบริการ HR
 * - Expandable rows แสดงค่าทำบัญชีรายเดือน
 * - ตัวเลือก 3/6/9/12 เดือน
 * - Mini card grid แสดงค่าแต่ละเดือน
 */

import { useState, useMemo, useCallback, Fragment } from 'react'
import {
    Container,
    Title,
    Stack,
    Card,
    Group,
    TextInput,
    MultiSelect,
    Table,
    Text,
    Badge,
    Button,
    Alert,
    Loader,
    Center,
    ActionIcon,
    Tooltip,
    Box,
    SegmentedControl,
    SimpleGrid,
    Collapse,
    Divider,
    CopyButton,
    Paper,
} from '@mantine/core'
import {
    TbSearch,
    TbAlertCircle,
    TbEdit,
    TbCoin,
    TbCheck,
    TbArrowLeft,
    TbArrowRight,
    TbFilter,
    TbChevronDown,
    TbChevronRight,
    TbUsers,
    TbCurrencyBaht,
    TbCalendar,
    TbRefresh,
    TbExternalLink,
    TbPhoto,
    TbCopy,
    TbMapPin,
    TbMessage,
    TbReceipt,
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import clientsService, { Client, AccountingFees } from '../services/clientsService'
import MonthlyFeesForm from '../components/Client/MonthlyFeesForm'
import { notifications } from '@mantine/notifications'

// ─── Constants ───────────────────────────────────────────────

const companyStatusOptions = [
    { value: 'รายเดือน', label: 'รายเดือน' },
    { value: 'รายเดือน / วางมือ', label: 'รายเดือน / วางมือ' },
    { value: 'รายเดือน / จ่ายรายปี', label: 'รายเดือน / จ่ายรายปี' },
    { value: 'รายเดือน / เดือนสุดท้าย', label: 'รายเดือน / เดือนสุดท้าย' },
    { value: 'ยกเลิกทำ', label: 'ยกเลิกทำ' },
]

const defaultStatuses = companyStatusOptions
    .filter((opt) => opt.value.includes('รายเดือน'))
    .map((opt) => opt.value)

const MONTHS_TH = [
    { key: 'jan', label: 'ม.ค.' },
    { key: 'feb', label: 'ก.พ.' },
    { key: 'mar', label: 'มี.ค.' },
    { key: 'apr', label: 'เม.ย.' },
    { key: 'may', label: 'พ.ค.' },
    { key: 'jun', label: 'มิ.ย.' },
    { key: 'jul', label: 'ก.ค.' },
    { key: 'aug', label: 'ส.ค.' },
    { key: 'sep', label: 'ก.ย.' },
    { key: 'oct', label: 'ต.ค.' },
    { key: 'nov', label: 'พ.ย.' },
    { key: 'dec', label: 'ธ.ค.' },
]

const monthViewOptions = [
    { label: '3 เดือน', value: '3' },
    { label: '6 เดือน', value: '6' },
    { label: '9 เดือน', value: '9' },
    { label: '12 เดือน', value: '12' },
]

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'รายเดือน': return 'green'
        case 'รายเดือน / วางมือ': return 'yellow'
        case 'รายเดือน / จ่ายรายปี': return 'blue'
        case 'รายเดือน / เดือนสุดท้าย': return 'orange'
        case 'ยกเลิกทำ': return 'red'
        default: return 'gray'
    }
}

const formatCurrency = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-'
    return Math.round(val).toLocaleString('th-TH')
}

const getMonthlyFee = (fees: AccountingFees | null | undefined, prefix: string, monthKey: string): number | null => {
    if (!fees) return null
    return (fees as any)[`${prefix}_${monthKey}`] ?? null
}

const sumFees = (fees: AccountingFees | null | undefined, prefix: string, monthCount: number): number => {
    if (!fees) return 0
    const months = MONTHS_TH.slice(0, monthCount)
    return months.reduce((sum, m) => {
        const val = (fees as any)[`${prefix}_${m.key}`]
        return sum + (typeof val === 'number' ? val : 0)
    }, 0)
}

// ─── MonthCard Component ────────────────────────────────────

function MonthCard({ label, value }: { label: string; value: number | null }) {
    const hasValue = value !== null && value !== undefined
    return (
        <Box
            style={{
                backgroundColor: hasValue ? '#e8f5e9' : '#f5f5f5',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                border: hasValue ? '1px solid #c8e6c9' : '1px solid #e0e0e0',
                minWidth: 0,
            }}
        >
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
            <Text
                size="sm"
                fw={hasValue ? 700 : 400}
                c={hasValue ? 'dark' : 'dimmed'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
            >
                {hasValue ? formatCurrency(value) : '-'}
            </Text>
        </Box>
    )
}

// ─── ExpandedRow Component ──────────────────────────────────

function ExpandedRow({
    fees,
    monthCount,
    canEdit,
    onEdit,
}: {
    fees: AccountingFees | null
    monthCount: number
    canEdit: boolean
    onEdit: () => void
}) {
    const months = MONTHS_TH.slice(0, monthCount)
    const totalAccounting = sumFees(fees, 'accounting_fee', monthCount)
    const totalHR = sumFees(fees, 'hr_fee', monthCount)

    if (!fees) {
        return (
            <Box p="md" style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
                <Group justify="space-between" align="center">
                    <Text c="dimmed" fs="italic" size="sm">ยังไม่มีข้อมูลค่าทำบัญชี</Text>
                    {canEdit && (
                        <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<TbEdit size={14} />}
                            onClick={onEdit}
                        >
                            เพิ่มข้อมูล
                        </Button>
                    )}
                </Group>
            </Box>
        )
    }

    return (
        <Box p="md" style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
            <Stack gap="md">
                {/* ค่าทำบัญชี */}
                <div>
                    <Group justify="space-between" mb={8}>
                        <Group gap={6}>
                            <TbCurrencyBaht size={16} color="#ff6b35" />
                            <Text size="sm" fw={600} c="#ff6b35">ค่าทำบัญชีรายเดือน</Text>
                            {fees?.fee_year && (
                                <Badge size="xs" variant="light" color="gray">ปี {fees.fee_year}</Badge>
                            )}
                        </Group>
                        <Badge variant="light" color="orange" size="sm">
                            รวม {formatCurrency(totalAccounting)} บาท
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 6, md: monthCount <= 6 ? monthCount : 6, lg: monthCount }}>
                        {months.map((m) => (
                            <MonthCard
                                key={`acc-${m.key}`}
                                label={m.label}
                                value={getMonthlyFee(fees, 'accounting_fee', m.key)}
                            />
                        ))}
                    </SimpleGrid>
                </div>

                <Divider variant="dashed" />

                {/* ค่า HR */}
                <div>
                    <Group justify="space-between" mb={8}>
                        <Group gap={6}>
                            <TbUsers size={16} color="#1976d2" />
                            <Text size="sm" fw={600} c="#1976d2">ค่าบริการ HR รายเดือน</Text>
                        </Group>
                        <Badge variant="light" color="blue" size="sm">
                            รวม {formatCurrency(totalHR)} บาท
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 6, md: monthCount <= 6 ? monthCount : 6, lg: monthCount }}>
                        {months.map((m) => (
                            <MonthCard
                                key={`hr-${m.key}`}
                                label={m.label}
                                value={getMonthlyFee(fees, 'hr_fee', m.key)}
                            />
                        ))}
                    </SimpleGrid>
                </div>

                {/* Footer: Info Cards Grid */}
                <Divider variant="dashed" />
                <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                    {/* Peak Code Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbMapPin size={14} color="#ff6b35" />
                            <Text size="xs" fw={600} c="dimmed">Peak Code</Text>
                        </Group>
                        <Text size="sm" fw={700} c="dark">
                            {fees.peak_code || <Text span fs="italic" c="dimmed">-</Text>}
                        </Text>
                    </Paper>

                    {/* Line Chat Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbMessage size={14} color="#06c755" />
                            <Text size="xs" fw={600} c="dimmed">Line Chat</Text>
                            {fees.line_chat_type && (
                                <Badge size="xs" variant="light" color={fees.line_chat_type === 'group' ? 'green' : 'teal'}>
                                    {fees.line_chat_type}
                                </Badge>
                            )}
                        </Group>
                        {fees.line_chat_id ? (
                            <Group gap={4}>
                                <Tooltip label={fees.line_chat_id} multiline maw={300}>
                                    <Text size="xs" ff="monospace" c="dark" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                        {fees.line_chat_id}
                                    </Text>
                                </Tooltip>
                                <CopyButton value={fees.line_chat_id}>
                                    {({ copied, copy }) => (
                                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            {copied ? <TbCheck size={12} /> : <TbCopy size={12} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        ) : (
                            <Text size="xs" c="dimmed" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>

                    {/* Billing Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbReceipt size={14} color="#2196f3" />
                            <Text size="xs" fw={600} c="dimmed">Line Billing</Text>
                            {fees.line_billing_chat_type && (
                                <Badge size="xs" variant="light" color={fees.line_billing_chat_type === 'group' ? 'green' : 'teal'}>
                                    {fees.line_billing_chat_type}
                                </Badge>
                            )}
                        </Group>
                        {fees.line_billing_id ? (
                            <Group gap={4}>
                                <Tooltip label={fees.line_billing_id} multiline maw={300}>
                                    <Text size="xs" ff="monospace" c="dark" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                        {fees.line_billing_id}
                                    </Text>
                                </Tooltip>
                                <CopyButton value={fees.line_billing_id}>
                                    {({ copied, copy }) => (
                                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            {copied ? <TbCheck size={12} /> : <TbCopy size={12} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        ) : (
                            <Text size="xs" c="dimmed" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>

                    {/* Image Link Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: fees.accounting_fee_image_url ? '#4caf50' : '#ef5350', borderWidth: 1.5 }}>
                        <Group gap={8} mb={4}>
                            <TbPhoto size={14} color={fees.accounting_fee_image_url ? '#4caf50' : '#ef5350'} />
                            <Text size="xs" fw={600} c="dimmed">รูปค่าทำบัญชี</Text>
                        </Group>
                        {fees.accounting_fee_image_url ? (
                            <Button
                                size="xs"
                                variant="light"
                                color="green"
                                fullWidth
                                leftSection={<TbExternalLink size={14} />}
                                onClick={() => window.open(fees.accounting_fee_image_url!, '_blank')}
                            >
                                ดูรูปค่าทำบัญชี
                            </Button>
                        ) : (
                            <Text size="xs" c="red" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>
                </SimpleGrid>

                {/* Edit Button */}
                {canEdit && (
                    <Group justify="flex-end">
                        <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<TbEdit size={14} />}
                            onClick={onEdit}
                        >
                            แก้ไข
                        </Button>
                    </Group>
                )}
            </Stack>
        </Box>
    )
}

// ─── Main Component ─────────────────────────────────────────

export default function AccountingFeesManagement() {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const canEdit = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'data_entry' || user?.role === 'data_entry_and_service'

    // Filters
    const [search, setSearch] = useState('')
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(defaultStatuses)
    const [page, setPage] = useState(1)
    const [limit] = useState(50)
    const [monthView, setMonthView] = useState('12')

    // Expanded rows (track which builds are expanded)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    // Cache fetched fee data per build
    const [feesCache, setFeesCache] = useState<Record<string, AccountingFees | null>>({})
    // Loading states for individual rows
    const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set())

    // Modal state
    const [editClient, setEditClient] = useState<{ build: string; fees: AccountingFees | null } | null>(null)

    // Fetch clients list
    const { data: clientsData, isLoading, error, refetch, isFetching } = useQuery(
        ['clients-fees', page, limit, search],
        () => clientsService.getList({
            page,
            limit,
            search: search || undefined,
            sortBy: 'build',
            sortOrder: 'asc',
        }),
        { keepPreviousData: true }
    )

    // Client-side filter by selected statuses
    const filteredClients = useMemo(() => {
        const clients = clientsData?.data || []
        if (selectedStatuses.length === 0) return clients
        return clients.filter((c) => selectedStatuses.includes(c.company_status))
    }, [clientsData?.data, selectedStatuses])

    // Toggle expand row
    const toggleExpand = useCallback(async (build: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(build)) {
            newExpanded.delete(build)
            setExpandedRows(newExpanded)
            return
        }

        // Expand and fetch data if not cached
        newExpanded.add(build)
        setExpandedRows(newExpanded)

        if (feesCache[build] === undefined) {
            setLoadingRows((prev) => new Set(prev).add(build))
            try {
                const fullClient = await clientsService.getByBuild(build)
                setFeesCache((prev) => ({ ...prev, [build]: fullClient.accounting_fees || null }))
            } catch {
                setFeesCache((prev) => ({ ...prev, [build]: null }))
            }
            setLoadingRows((prev) => {
                const next = new Set(prev)
                next.delete(build)
                return next
            })
        }
    }, [expandedRows, feesCache])

    // Edit handler
    const handleEditClick = useCallback(async (client: Client) => {
        try {
            const fullClient = await clientsService.getByBuild(client.build)
            setEditClient({
                build: client.build,
                fees: fullClient.accounting_fees || null,
            })
        } catch {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลได้', color: 'red' })
        }
    }, [])

    // Save monthly fees
    const handleSaveMonthlyFees = async (data: AccountingFees) => {
        if (!editClient) return
        try {
            await clientsService.updateAccountingFees(editClient.build, data)
            notifications.show({
                title: 'บันทึกสำเร็จ',
                message: `บันทึกค่าทำบัญชี ${editClient.build} เรียบร้อย`,
                color: 'green',
                icon: <TbCheck size={16} />,
            })
            // Update cache & refetch
            setFeesCache((prev) => ({ ...prev, [editClient.build]: data }))
            queryClient.invalidateQueries(['clients-fees'])
            setEditClient(null)
        } catch (err: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: err?.response?.data?.message || 'ไม่สามารถบันทึกได้',
                color: 'red',
            })
        }
    }

    const totalPages = clientsData?.pagination?.totalPages || 1
    const monthCount = parseInt(monthView)
    const colSpan = canEdit ? 9 : 8

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header */}
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
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
                                <TbCoin size={32} color="white" />
                            </Box>
                            <div>
                                <Title order={2} c="white" fw={700}>
                                    ค่าทำบัญชี / ค่าบริการ HR
                                </Title>
                                <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                    จัดการค่าทำบัญชีและค่าบริการ HR รายเดือนของทุกบริษัท
                                </Text>
                            </div>
                        </Group>
                        <Badge
                            size="xl"
                            variant="white"
                            color="orange"
                            radius="lg"
                            style={{ fontSize: 16, padding: '8px 16px' }}
                        >
                            {filteredClients.length} / {clientsData?.pagination?.total || 0} บริษัท
                        </Badge>
                    </Group>
                </Card>

                {/* Search & Filters */}
                <Card withBorder radius="lg" p="md">
                    <Group gap="md" align="end" wrap="wrap">
                        <TextInput
                            placeholder="ค้นหาด้วย Build code, ชื่อบริษัท..."
                            leftSection={<TbSearch size={16} />}
                            label="ค้นหา"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            style={{ flex: 1, minWidth: 200 }}
                        />
                        <MultiSelect
                            label="สถานะบริษัท"
                            placeholder="เลือกสถานะ"
                            data={companyStatusOptions}
                            value={selectedStatuses}
                            onChange={(val) => {
                                setSelectedStatuses(val)
                                setPage(1)
                            }}
                            clearable
                            searchable
                            leftSection={<TbFilter size={16} />}
                            style={{ flex: 1, minWidth: 280 }}
                        />
                        <div>
                            <Text size="sm" fw={500} mb={4}>
                                <Group gap={4}>
                                    <TbCalendar size={14} />
                                    แสดงข้อมูล
                                </Group>
                            </Text>
                            <SegmentedControl
                                value={monthView}
                                onChange={setMonthView}
                                data={monthViewOptions}
                                size="sm"
                                color="orange"
                            />
                        </div>
                        <Button
                            variant="light"
                            color="orange"
                            leftSection={<TbRefresh size={16} />}
                            loading={isFetching}
                            onClick={() => refetch()}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            รีเฟรชข้อมูล
                        </Button>
                    </Group>
                </Card>

                {/* Error */}
                {error && (
                    <Alert icon={<TbAlertCircle size={16} />} color="red">
                        เกิดข้อผิดพลาดในการโหลดข้อมูล
                    </Alert>
                )}

                {/* Loading */}
                {isLoading && (
                    <Center py="xl"><Loader /></Center>
                )}

                {/* Table */}
                {!isLoading && (
                    <Card withBorder radius="lg" p="md" style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        <Table withTableBorder withColumnBorders highlightOnHover stickyHeader stickyHeaderOffset={0}>
                            <Table.Thead style={{ zIndex: 1 }}>
                                <Table.Tr>
                                    <Table.Th style={{ width: 40, textAlign: 'center', backgroundColor: '#ff6b35', color: 'white' }}></Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', minWidth: 80, backgroundColor: '#ff6b35', color: 'white' }}>Build</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', minWidth: 200, backgroundColor: '#ff6b35', color: 'white' }}>ชื่อบริษัท</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: 130, backgroundColor: '#ff6b35', color: 'white' }}>สถานะ</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: 140, backgroundColor: '#ff6b35', color: 'white' }}>สถานะจดภาษีมูลค่าเพิ่ม</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: 100, backgroundColor: '#ff6b35', color: 'white' }}>Peak Code</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: 120, backgroundColor: '#ff6b35', color: 'white' }}>วันเริ่มทำบัญชี</Table.Th>
                                    <Table.Th style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: 100, backgroundColor: '#ff6b35', color: 'white' }}>ข้อมูลค่าทำบัญชี</Table.Th>
                                    {canEdit && (
                                        <Table.Th style={{ textAlign: 'center', width: 70, backgroundColor: '#ff6b35', color: 'white' }}>จัดการ</Table.Th>
                                    )}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredClients.length === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={colSpan}>
                                            <Text c="dimmed" ta="center" py="lg">ไม่พบข้อมูล</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ) : (
                                    filteredClients.map((client) => {
                                        const isExpanded = expandedRows.has(client.build)
                                        const isRowLoading = loadingRows.has(client.build)
                                        const fees = feesCache[client.build]
                                        const hasFeeData = fees !== undefined && fees !== null

                                        return (
                                            <Fragment key={client.build}>
                                                {/* Main Row */}
                                                <Table.Tr
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: isExpanded ? '#fff8f0' : undefined,
                                                    }}
                                                    onClick={() => toggleExpand(client.build)}
                                                >
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        {isRowLoading ? (
                                                            <Loader size={14} color="orange" />
                                                        ) : isExpanded ? (
                                                            <TbChevronDown size={16} color="#ff6b35" />
                                                        ) : (
                                                            <TbChevronRight size={16} color="#999" />
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="light" color="orange" size="sm">{client.build}</Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={500} lineClamp={1}>{client.company_name}</Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <Badge size="xs" variant="light" color={getStatusColor(client.company_status)}>
                                                            {client.company_status}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <Badge size="xs" variant="light" color={client.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'teal' : client.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม' ? 'red' : 'gray'}>
                                                            {client.tax_registration_status || '-'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <Text size="sm" fw={500}>{client.peak_code || '—'}</Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        <Text size="sm">{client.accounting_start_date ? new Date(client.accounting_start_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</Text>
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>
                                                        {fees === undefined ? (
                                                            <Text size="xs" c="dimmed">—</Text>
                                                        ) : hasFeeData ? (
                                                            <Badge size="xs" variant="light" color="green" leftSection={<TbCheck size={10} />}>
                                                                มีข้อมูล
                                                            </Badge>
                                                        ) : (
                                                            <Badge size="xs" variant="light" color="gray">
                                                                ยังไม่มี
                                                            </Badge>
                                                        )}
                                                    </Table.Td>
                                                    {canEdit && (
                                                        <Table.Td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                            <Tooltip label="แก้ไขค่าทำบัญชี/HR">
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="orange"
                                                                    size="sm"
                                                                    onClick={() => handleEditClick(client)}
                                                                >
                                                                    <TbEdit size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </Table.Td>
                                                    )}
                                                </Table.Tr>

                                                {/* Expanded Detail Row */}
                                                {isExpanded && (
                                                    <Table.Tr>
                                                        <Table.Td colSpan={colSpan} p={0} style={{ border: 'none' }}>
                                                            <Collapse in={isExpanded}>
                                                                <Box p="sm">
                                                                    {isRowLoading ? (
                                                                        <Center py="md"><Loader size="sm" color="orange" /></Center>
                                                                    ) : (
                                                                        <ExpandedRow
                                                                            fees={fees ?? null}
                                                                            monthCount={monthCount}
                                                                            canEdit={!!canEdit}
                                                                            onEdit={() => handleEditClick(client)}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            </Collapse>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )}
                                            </Fragment>
                                        )
                                    })
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {/* Pagination */}
                {clientsData && totalPages > 1 && (
                    <Group justify="center" gap="sm">
                        <Button
                            variant="light"
                            size="xs"
                            leftSection={<TbArrowLeft size={14} />}
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            ก่อนหน้า
                        </Button>
                        <Text size="sm" c="dimmed">
                            หน้า {page} จาก {totalPages}
                        </Text>
                        <Button
                            variant="light"
                            size="xs"
                            rightSection={<TbArrowRight size={14} />}
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            ถัดไป
                        </Button>
                    </Group>
                )}
            </Stack>

            {/* Monthly Fees Modal */}
            {editClient && (
                <MonthlyFeesForm
                    opened={!!editClient}
                    onClose={() => setEditClient(null)}
                    onSubmit={handleSaveMonthlyFees}
                    data={editClient.fees}
                    build={editClient.build}
                />
            )}
        </Container>
    )
}
