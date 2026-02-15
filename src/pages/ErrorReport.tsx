/**
 * ErrorReport Page — รายงานข้อผิดพลาดด้านภาษี
 * Accounting team creates error reports → admin/audit approves → auto-create messenger task
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
    Container, Title, Button, Group, Text, Badge, Card,
    Table, Modal, TextInput, Textarea, Select, NumberInput,
    Stack, LoadingOverlay, ActionIcon, Tooltip, Box,
    MultiSelect, Paper, Divider, Alert, SimpleGrid,
    Combobox, InputBase, useCombobox,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import {
    TbPlus, TbCheck, TbX, TbEdit, TbTrash,
    TbAlertTriangle, TbSend, TbEye, TbRefresh, TbMapPin,
} from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import {
    errorReportService,
    ErrorReport, ErrorReportForm,
    AuditorOption, ClientOption,
    ERROR_TYPE_OPTIONS, FAULT_PARTY_OPTIONS, MONTH_OPTIONS,
} from '../services/errorReportService'
import { getLocations, createLocation, MessengerLocation } from '../services/messengerRouteService'

// Year options for tax month filter
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - 2 + i),
    label: String(currentYear - 2 + i + 543), // Buddhist year
}))

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending: { color: 'yellow', label: 'รอตรวจสอบ' },
    approved: { color: 'green', label: 'อนุมัติแล้ว' },
    rejected: { color: 'red', label: 'ไม่อนุมัติ' },
}

const MESSENGER_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending: { color: 'yellow', label: 'รอวิ่ง' },
    in_progress: { color: 'blue', label: 'กำลังดำเนินการ' },
    completed: { color: 'green', label: 'เสร็จแล้ว' },
    failed: { color: 'red', label: 'ล้มเหลว' },
}

const getErrorTypeLabels = (types: string[]) => {
    if (!types || !Array.isArray(types)) return '-'
    return types.map(t => {
        const opt = ERROR_TYPE_OPTIONS.find(o => o.value === t)
        return opt ? opt.label : t
    }).join(', ')
}

const getTaxMonthLabels = (months: string[]) => {
    if (!months || !Array.isArray(months)) return '-'
    return months.map(m => {
        const [year, month] = m.split('-')
        const monthOpt = MONTH_OPTIONS.find(o => o.value === month)
        const thaiYear = Number(year) + 543
        return monthOpt ? `${monthOpt.label} ${thaiYear}` : m
    }).join(', ')
}

const emptyForm: ErrorReportForm = {
    report_date: new Date().toISOString().slice(0, 10),
    client_id: null,
    client_name: '',
    error_types: [],
    tax_months: [],
    auditor_id: null,
    auditor_name: '',
    fault_party: '',
    fine_amount: '',
    submission_address: '',
}

export default function ErrorReportPage() {
    const { user } = useAuthStore()
    const isAdminOrAudit = user && ['admin', 'audit'].includes(user.role)

    // Data state
    const [reports, setReports] = useState<ErrorReport[]>([])
    const [auditors, setAuditors] = useState<AuditorOption[]>([])
    const [clients, setClients] = useState<ClientOption[]>([])
    const [clientSearching, setClientSearching] = useState(false)
    const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // Locations for submission address
    const [locations, setLocations] = useState<MessengerLocation[]>([])
    const [addressSearch, setAddressSearch] = useState('')
    const addressCombobox = useCombobox({
        onDropdownClose: () => addressCombobox.resetSelectedOption(),
    })

    // Modal state
    const [formOpened, setFormOpened] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState<ErrorReportForm>({ ...emptyForm })
    const [submitting, setSubmitting] = useState(false)

    // Reject modal
    const [rejectModalId, setRejectModalId] = useState<number | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Detail modal
    const [detailReport, setDetailReport] = useState<ErrorReport | null>(null)

    // Tax month picker state
    const [selectedYear, setSelectedYear] = useState(String(currentYear))

    // Fetch on mount
    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const [r, a, c, locs] = await Promise.all([
                errorReportService.getAll(),
                errorReportService.getAuditors(),
                errorReportService.getClients(),
                getLocations(),
            ])
            setReports(r)
            setAuditors(a)
            setClients(c)
            setLocations(locs)
        } catch {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลได้', color: 'red' })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    // Debounced client search
    const searchClients = useCallback((query: string) => {
        if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current)
        clientSearchTimer.current = setTimeout(async () => {
            setClientSearching(true)
            try {
                const results = await errorReportService.getClients(query)
                // Replace entirely — only keep the currently selected client if not in results
                setClients(results)
            } catch { /* ignore */ }
            setClientSearching(false)
        }, 300)
    }, [])

    // Client select options
    const clientOptions = useMemo(() =>
        clients.map(c => ({ value: String(c.id), label: c.name })),
        [clients]
    )

    // Auditor select options
    const auditorOptions = useMemo(() =>
        auditors.map(a => ({ value: String(a.id), label: a.name })),
        [auditors]
    )

    // Tax month multi-select options (for selected year)
    const taxMonthOptions = useMemo(() =>
        MONTH_OPTIONS.map(m => ({
            value: `${selectedYear}-${m.value}`,
            label: `${m.label} ${Number(selectedYear) + 543}`,
        })),
        [selectedYear]
    )

    // Open create form
    const openCreate = () => {
        setEditingId(null)
        setForm({ ...emptyForm })
        setSelectedYear(String(currentYear))
        setAddressSearch('')
        setFormOpened(true)
    }

    // Open edit form
    const openEdit = (report: ErrorReport) => {
        setEditingId(report.id)
        const errorTypes = typeof report.error_types === 'string' ? JSON.parse(report.error_types) : report.error_types
        const taxMonths = typeof report.tax_months === 'string' ? JSON.parse(report.tax_months) : report.tax_months
        setForm({
            report_date: report.report_date?.slice(0, 10) || '',
            client_id: report.client_id,
            client_name: report.client_name,
            error_types: errorTypes || [],
            tax_months: taxMonths || [],
            auditor_id: report.auditor_id,
            auditor_name: report.auditor_name || '',
            fault_party: report.fault_party || '',
            fine_amount: report.fine_amount || 0,
            submission_address: report.submission_address || '',
        })
        // Detect year from first tax month
        if (taxMonths?.length > 0) {
            setSelectedYear(taxMonths[0].split('-')[0])
        }
        setAddressSearch(report.submission_address || '')
        setFormOpened(true)
    }

    // Submit form (create/edit)
    const handleSubmit = async () => {
        if (!form.client_id || !form.error_types.length || !form.tax_months.length || !form.fault_party || !form.submission_address.trim()) {
            notifications.show({ title: 'กรุณากรอกข้อมูลให้ครบ', message: 'บริษัท, หัวข้อ, เดือนภาษี, ฝ่ายที่ผิด, ที่อยู่ยื่นปรับแบบ จำเป็นต้องกรอก', color: 'orange' })
            return
        }
        setSubmitting(true)
        try {
            if (editingId) {
                await errorReportService.update(editingId, form)
                notifications.show({ title: 'สำเร็จ', message: 'แก้ไขรายงานเรียบร้อย', color: 'green' })
            } else {
                await errorReportService.create(form)
                notifications.show({ title: 'สำเร็จ', message: 'สร้างรายงานเรียบร้อย — รอการตรวจสอบ', color: 'green' })
            }
            setFormOpened(false)
            fetchAll()
        } catch (err: any) {
            notifications.show({
                title: 'ข้อผิดพลาด',
                message: err?.response?.data?.message || 'เกิดข้อผิดพลาด',
                color: 'red',
            })
        } finally {
            setSubmitting(false)
        }
    }

    // Approve
    const handleApprove = async (id: number) => {
        try {
            await errorReportService.approve(id)
            notifications.show({ title: 'อนุมัติแล้ว', message: 'สร้างงานแมสไปทะเบียนเรียบร้อย', color: 'green' })
            fetchAll()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถอนุมัติได้', color: 'red' })
        }
    }

    // Reject
    const handleReject = async () => {
        if (!rejectReason.trim()) {
            notifications.show({ title: 'กรุณาระบุเหตุผล', message: '', color: 'orange' })
            return
        }
        try {
            await errorReportService.reject(rejectModalId!, rejectReason)
            notifications.show({ title: 'ปฏิเสธแล้ว', message: 'บันทึกเหตุผลเรียบร้อย', color: 'orange' })
            setRejectModalId(null)
            setRejectReason('')
            fetchAll()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถปฏิเสธได้', color: 'red' })
        }
    }

    // Delete
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

    const handleDelete = (id: number) => {
        setDeleteConfirmId(id)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmId) return
        const id = deleteConfirmId
        setDeleteConfirmId(null)
        try {
            await errorReportService.delete(id)
            notifications.show({ title: 'ลบแล้ว', message: 'ลบรายงานเรียบร้อย', color: 'gray' })
            fetchAll()
        } catch {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถลบได้', color: 'red' })
        }
    }

    return (
        <Container size="xl" py="lg">
            {/* Header */}
            <Card
                withBorder
                radius="lg"
                mb="lg"
                p="lg"
                style={{
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                    border: 'none',
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <Box
                            style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <TbAlertTriangle size={24} color="white" />
                        </Box>
                        <div>
                            <Title order={3} c="white" fw={700}>รายงานข้อผิดพลาด</Title>
                            <Text size="sm" c="rgba(255,255,255,0.8)">
                                รายงานข้อผิดพลาดด้านภาษี — ส่งงานแมสไปทะเบียน
                            </Text>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <Tooltip label="รีเฟรชข้อมูล">
                            <ActionIcon
                                variant="white"
                                color="orange"
                                radius="md"
                                size="lg"
                                onClick={() => fetchAll(true)}
                                loading={refreshing}
                            >
                                <TbRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Button
                            leftSection={<TbPlus size={18} />}
                            onClick={openCreate}
                            variant="white"
                            color="orange"
                            radius="md"
                            size="sm"
                        >
                            สร้างรายงาน
                        </Button>
                    </Group>
                </Group>
            </Card>

            {/* Summary Cards */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
                {[
                    { label: 'ทั้งหมด', count: reports.length, color: '#6366f1', bg: '#eef2ff' },
                    { label: 'รอตรวจสอบ', count: reports.filter(r => r.status === 'pending').length, color: '#eab308', bg: '#fefce8' },
                    { label: 'อนุมัติแล้ว', count: reports.filter(r => r.status === 'approved').length, color: '#22c55e', bg: '#f0fdf4' },
                    { label: 'ไม่อนุมัติ', count: reports.filter(r => r.status === 'rejected').length, color: '#ef4444', bg: '#fef2f2' },
                ].map(s => (
                    <Card key={s.label} withBorder radius="md" p="sm" style={{ borderColor: '#eee' }}>
                        <Text size="xs" c="dimmed" mb={4}>{s.label}</Text>
                        <Text size="xl" fw={800} style={{ color: s.color }}>{s.count}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Reports Table */}
            <Card withBorder radius="lg" p={0} pos="relative" style={{ overflow: 'hidden' }}>
                <LoadingOverlay visible={loading} />
                <Box style={{ overflowX: 'auto' }}>
                    <Table striped highlightOnHover withColumnBorders>
                        <Table.Thead>
                            <Table.Tr style={{ background: '#f8f9fa' }}>
                                <Table.Th style={{ minWidth: 40 }}>#</Table.Th>
                                <Table.Th style={{ minWidth: 100 }}>วันที่</Table.Th>
                                <Table.Th style={{ minWidth: 160 }}>บริษัท</Table.Th>
                                <Table.Th style={{ minWidth: 180 }}>หัวข้อผิดพลาด</Table.Th>
                                <Table.Th style={{ minWidth: 140 }}>เดือนภาษี</Table.Th>
                                <Table.Th style={{ minWidth: 100 }}>ฝ่ายผิดพลาด</Table.Th>
                                <Table.Th style={{ minWidth: 100 }}>ค่าปรับ</Table.Th>
                                <Table.Th style={{ minWidth: 100 }}>ผู้แจ้ง</Table.Th>
                                <Table.Th style={{ minWidth: 90 }}>สถานะ</Table.Th>
                                <Table.Th style={{ minWidth: 100 }}>วิ่งแมส</Table.Th>
                                <Table.Th style={{ minWidth: 120 }}>จัดการ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {reports.length === 0 && !loading ? (
                                <Table.Tr>
                                    <Table.Td colSpan={11}>
                                        <Text ta="center" py="xl" c="dimmed">ยังไม่มีรายงาน</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                reports.map((r, idx) => {
                                    const errorTypes = typeof r.error_types === 'string' ? JSON.parse(r.error_types) : r.error_types
                                    const taxMonths = typeof r.tax_months === 'string' ? JSON.parse(r.tax_months) : r.tax_months
                                    const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending

                                    return (
                                        <Table.Tr key={r.id}>
                                            <Table.Td>{idx + 1}</Table.Td>
                                            <Table.Td>{r.report_date ? new Date(r.report_date).toLocaleDateString('th-TH') : '-'}</Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500} lineClamp={1}>{r.client_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" lineClamp={2}>{getErrorTypeLabels(errorTypes)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" lineClamp={2}>{getTaxMonthLabels(taxMonths)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={r.fault_party === 'bmu' ? 'orange' : 'blue'}
                                                >
                                                    {r.fault_party === 'bmu' ? 'พนักงาน BMU' : 'ลูกค้า'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={600} c={r.fine_amount > 0 ? 'red' : 'dimmed'}>
                                                    {r.fine_amount > 0 ? `${Number(r.fine_amount).toLocaleString()} ฿` : '-'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" lineClamp={1}>{r.accountant_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={statusCfg.color} variant="light" size="sm">
                                                    {statusCfg.label}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                {r.messenger_task_id ? (
                                                    <Badge
                                                        color={(MESSENGER_STATUS_CONFIG[r.messenger_status || 'pending'] || MESSENGER_STATUS_CONFIG.pending).color}
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {(MESSENGER_STATUS_CONFIG[r.messenger_status || 'pending'] || MESSENGER_STATUS_CONFIG.pending).label}
                                                    </Badge>
                                                ) : (
                                                    <Text size="xs" c="dimmed">-</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4} wrap="nowrap">
                                                    <Tooltip label="ดูรายละเอียด">
                                                        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setDetailReport(r)}>
                                                            <TbEye size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            {(isAdminOrAudit || String(r.created_by) === user?.id) && (
                                                                <Tooltip label="แก้ไข">
                                                                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => openEdit(r)}>
                                                                        <TbEdit size={16} />
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                            {isAdminOrAudit && (
                                                                <>
                                                                    <Tooltip label="อนุมัติ">
                                                                        <ActionIcon variant="subtle" color="green" size="sm" onClick={() => handleApprove(r.id)}>
                                                                            <TbCheck size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label="ไม่อนุมัติ">
                                                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => { setRejectModalId(r.id); setRejectReason('') }}>
                                                                            <TbX size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                    {isAdminOrAudit && (
                                                        <Tooltip label="ลบ">
                                                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(r.id)}>
                                                                <TbTrash size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })
                            )}
                        </Table.Tbody>
                    </Table>
                </Box>
            </Card>

            {/* ============================================================ */}
            {/* Create/Edit Modal */}
            {/* ============================================================ */}
            <Modal
                opened={formOpened}
                onClose={() => setFormOpened(false)}
                title={
                    <Group gap="xs">
                        <TbAlertTriangle size={20} color="#f97316" />
                        <Text fw={700}>{editingId ? 'แก้ไขรายงาน' : 'สร้างรายงานข้อผิดพลาด'}</Text>
                    </Group>
                }
                size="lg"
                centered
            >
                <Stack gap="md">
                    {/* Row 1: Date + Client */}
                    <SimpleGrid cols={2}>
                        <DateInput
                            label="วันที่แจ้ง"
                            value={form.report_date ? new Date(form.report_date) : null}
                            onChange={(val) => setForm(f => ({ ...f, report_date: val ? val.toISOString().slice(0, 10) : '' }))}
                            valueFormat="DD/MM/YYYY"
                            required
                        />
                        <Select
                            label="บริษัท"
                            placeholder="พิมพ์ค้นหาบริษัท..."
                            data={clientOptions}
                            value={form.client_id ? String(form.client_id) : null}
                            onChange={(val) => {
                                const client = clients.find(c => String(c.id) === val)
                                setForm(f => ({
                                    ...f,
                                    client_id: val ? Number(val) : null,
                                    client_name: client?.name || '',
                                }))
                            }}
                            onSearchChange={(query) => searchClients(query)}
                            searchable
                            required
                            nothingFoundMessage={clientSearching ? 'กำลังค้นหา...' : 'ไม่พบข้อมูล'}
                            filter={({ options }) => options}
                        />
                    </SimpleGrid>

                    {/* Error types (multi-select) */}
                    <MultiSelect
                        label="หัวข้อผิดพลาด"
                        placeholder="เลือกรายการ"
                        data={ERROR_TYPE_OPTIONS}
                        value={form.error_types}
                        onChange={(val) => setForm(f => ({ ...f, error_types: val }))}
                        required
                    />

                    {/* Tax months: Year selector + Month multi-select */}
                    <Paper withBorder radius="md" p="sm">
                        <Text size="sm" fw={600} mb="xs">เดือนภาษี <Text component="span" c="red">*</Text></Text>
                        <SimpleGrid cols={2}>
                            <Select
                                label="ปี"
                                data={YEAR_OPTIONS}
                                value={selectedYear}
                                onChange={(val) => setSelectedYear(val || String(currentYear))}
                            />
                            <MultiSelect
                                label="เดือน"
                                placeholder="เลือกเดือน"
                                data={taxMonthOptions}
                                value={form.tax_months}
                                onChange={(val) => setForm(f => ({ ...f, tax_months: val }))}
                            />
                        </SimpleGrid>
                    </Paper>

                    {/* Accountant (auto-filled) */}
                    <TextInput
                        label="ผู้ทำบัญชี"
                        value={user?.name || ''}
                        readOnly
                        variant="filled"
                    />

                    {/* Row: Auditor + Fault party */}
                    <SimpleGrid cols={2}>
                        <Select
                            label="ผู้ตรวจภาษีประจำเดือน"
                            placeholder="เลือกผู้ตรวจ"
                            data={auditorOptions}
                            value={form.auditor_id ? String(form.auditor_id) : null}
                            onChange={(val) => {
                                const auditor = auditors.find(a => String(a.id) === val)
                                setForm(f => ({
                                    ...f,
                                    auditor_id: val || null,
                                    auditor_name: auditor?.name || '',
                                }))
                            }}
                            searchable
                            clearable
                        />
                        <Select
                            label="ฝ่ายที่ทำให้เกิดข้อผิดพลาด"
                            placeholder="เลือก"
                            data={FAULT_PARTY_OPTIONS}
                            value={form.fault_party}
                            onChange={(val) => setForm(f => ({ ...f, fault_party: (val || '') as any }))}
                            required
                        />
                    </SimpleGrid>

                    {/* Fine amount */}
                    <NumberInput
                        label="จำนวนค่าปรับ (บาท)"
                        placeholder="ระบุจำนวนเงิน"
                        value={form.fine_amount === 0 || form.fine_amount === '' ? '' : form.fine_amount}
                        onChange={(val) => setForm(f => ({ ...f, fine_amount: val === '' ? '' : Number(val) }))}
                        min={0}
                        thousandSeparator=","
                        suffix=" บาท"
                        hideControls
                        allowNegative={false}
                        onFocus={(e) => e.currentTarget.select()}
                        styles={{ input: { textAlign: 'right' } }}
                    />

                    {/* Submission address — searchable location dropdown */}
                    <Combobox
                        store={addressCombobox}
                        onOptionSubmit={async (val) => {
                            if (val === '__create__') {
                                // Create new location
                                const name = (addressSearch || '').trim()
                                if (!name) return
                                try {
                                    const newLoc = await createLocation({ name, category: 'อื่นๆ' })
                                    setLocations(prev => [...prev, newLoc])
                                    const addr = newLoc.name
                                    setForm(f => ({ ...f, submission_address: addr }))
                                    setAddressSearch(addr)
                                    notifications.show({ title: 'เพิ่มสถานที่สำเร็จ', message: `เพิ่ม "${name}" แล้ว`, color: 'green' })
                                } catch {
                                    notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถเพิ่มสถานที่ได้', color: 'red' })
                                }
                            } else {
                                const loc = locations.find(l => l.id === val)
                                if (loc) {
                                    const addr = loc.address ? `${loc.name} — ${loc.address}` : loc.name
                                    setForm(f => ({ ...f, submission_address: addr }))
                                    setAddressSearch(addr)
                                }
                            }
                            addressCombobox.closeDropdown()
                        }}
                    >
                        <Combobox.Target>
                            <InputBase
                                label="ข้อมูลที่อยู่ที่จะต้องยื่นปรับแบบ"
                                placeholder="พิมพ์ค้นหาหรือเลือกสถานที่..."
                                required
                                leftSection={<TbMapPin size={16} />}
                                rightSection={<Combobox.Chevron />}
                                rightSectionPointerEvents="none"
                                value={addressSearch || form.submission_address}
                                onChange={(e) => {
                                    const val = e.currentTarget.value
                                    setAddressSearch(val)
                                    setForm(f => ({ ...f, submission_address: val }))
                                    addressCombobox.openDropdown()
                                    addressCombobox.updateSelectedOptionIndex()
                                }}
                                onClick={() => addressCombobox.openDropdown()}
                                onFocus={() => addressCombobox.openDropdown()}
                                onBlur={() => addressCombobox.closeDropdown()}
                            />
                        </Combobox.Target>
                        <Combobox.Dropdown>
                            <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
                                {locations
                                    .filter(loc => {
                                        const q = (addressSearch || form.submission_address || '').toLowerCase().trim()
                                        if (!q) return true
                                        return loc.name.toLowerCase().includes(q) || (loc.address || '').toLowerCase().includes(q)
                                    })
                                    .slice(0, 10)
                                    .map(loc => (
                                        <Combobox.Option value={loc.id} key={loc.id}>
                                            <Group gap="xs">
                                                <TbMapPin size={14} color="#666" />
                                                <div>
                                                    <Text size="sm" fw={500}>{loc.name}</Text>
                                                    {loc.address && <Text size="xs" c="dimmed">{loc.address}</Text>}
                                                </div>
                                                {loc.category && (
                                                    <Badge size="xs" variant="light" color="gray" ml="auto">{loc.category}</Badge>
                                                )}
                                            </Group>
                                        </Combobox.Option>
                                    ))}
                                {locations.filter(loc => {
                                    const q = (addressSearch || form.submission_address || '').toLowerCase().trim()
                                    if (!q) return true
                                    return loc.name.toLowerCase().includes(q) || (loc.address || '').toLowerCase().includes(q)
                                }).length === 0 && (
                                        <Combobox.Empty>ไม่พบสถานที่</Combobox.Empty>
                                    )}
                                {(addressSearch || '').trim() && !locations.some(loc => loc.name.toLowerCase() === (addressSearch || '').toLowerCase().trim()) && (
                                    <Combobox.Option value="__create__" style={{ borderTop: '1px solid #eee' }}>
                                        <Group gap="xs">
                                            <TbPlus size={14} color="#228be6" />
                                            <Text size="sm" c="blue">เพิ่ม "{(addressSearch || '').trim()}" เป็นสถานที่ใหม่</Text>
                                        </Group>
                                    </Combobox.Option>
                                )}
                            </Combobox.Options>
                        </Combobox.Dropdown>
                    </Combobox>

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setFormOpened(false)}>ยกเลิก</Button>
                        <Button
                            leftSection={<TbSend size={16} />}
                            onClick={handleSubmit}
                            loading={submitting}
                            color="orange"
                        >
                            {editingId ? 'บันทึก' : 'ส่งรายงาน'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================================================ */}
            {/* Reject Reason Modal */}
            {/* ============================================================ */}
            <Modal
                opened={rejectModalId !== null}
                onClose={() => setRejectModalId(null)}
                title={<Text fw={700} c="red">ไม่อนุมัติรายงาน</Text>}
                size="md"
                centered
            >
                <Stack>
                    <Textarea
                        label="เหตุผลที่ไม่อนุมัติ"
                        placeholder="กรุณาระบุเหตุผล..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                        required
                        minRows={3}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setRejectModalId(null)}>ยกเลิก</Button>
                        <Button color="red" leftSection={<TbX size={16} />} onClick={handleReject}>
                            ยืนยันไม่อนุมัติ
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================================================ */}
            {/* Detail Modal */}
            {/* ============================================================ */}
            <Modal
                opened={detailReport !== null}
                onClose={() => setDetailReport(null)}
                title={<Text fw={700}>รายละเอียดรายงาน #{detailReport?.id}</Text>}
                size="lg"
                centered
            >
                {detailReport && (() => {
                    const errorTypes = typeof detailReport.error_types === 'string' ? JSON.parse(detailReport.error_types) : detailReport.error_types
                    const taxMonths = typeof detailReport.tax_months === 'string' ? JSON.parse(detailReport.tax_months) : detailReport.tax_months
                    const statusCfg = STATUS_CONFIG[detailReport.status] || STATUS_CONFIG.pending

                    return (
                        <Stack gap="sm">
                            <SimpleGrid cols={2}>
                                <div>
                                    <Text size="xs" c="dimmed">วันที่แจ้ง</Text>
                                    <Text size="sm" fw={500}>{detailReport.report_date ? new Date(detailReport.report_date).toLocaleDateString('th-TH') : '-'}</Text>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed">สถานะ</Text>
                                    <Badge color={statusCfg.color} variant="light">{statusCfg.label}</Badge>
                                </div>
                            </SimpleGrid>

                            <div>
                                <Text size="xs" c="dimmed">บริษัท</Text>
                                <Text size="sm" fw={500}>{detailReport.client_name}</Text>
                            </div>

                            <div>
                                <Text size="xs" c="dimmed">หัวข้อผิดพลาด</Text>
                                <Group gap={4} mt={2}>
                                    {(errorTypes || []).map((t: string) => {
                                        const opt = ERROR_TYPE_OPTIONS.find(o => o.value === t)
                                        return <Badge key={t} size="sm" variant="outline" color="orange">{opt?.label || t}</Badge>
                                    })}
                                </Group>
                            </div>

                            <div>
                                <Text size="xs" c="dimmed">เดือนภาษี</Text>
                                <Text size="sm">{getTaxMonthLabels(taxMonths)}</Text>
                            </div>

                            <SimpleGrid cols={2}>
                                <div>
                                    <Text size="xs" c="dimmed">ผู้ทำบัญชี</Text>
                                    <Text size="sm">{detailReport.accountant_name}</Text>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed">ผู้ตรวจภาษี</Text>
                                    <Text size="sm">{detailReport.auditor_name || '-'}</Text>
                                </div>
                            </SimpleGrid>

                            <SimpleGrid cols={2}>
                                <div>
                                    <Text size="xs" c="dimmed">ฝ่ายที่ทำให้เกิดข้อผิดพลาด</Text>
                                    <Badge color={detailReport.fault_party === 'bmu' ? 'orange' : 'blue'} variant="light">
                                        {detailReport.fault_party === 'bmu' ? 'พนักงาน BMU' : 'ลูกค้า'}
                                    </Badge>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed">ค่าปรับ</Text>
                                    <Text size="sm" fw={600} c={detailReport.fine_amount > 0 ? 'red' : 'dimmed'}>
                                        {detailReport.fine_amount > 0 ? `${Number(detailReport.fine_amount).toLocaleString()} บาท` : 'ไม่มี'}
                                    </Text>
                                </div>
                            </SimpleGrid>

                            {detailReport.submission_address && (
                                <div>
                                    <Text size="xs" c="dimmed">ที่อยู่ยื่นปรับแบบ</Text>
                                    <Text size="sm">{detailReport.submission_address}</Text>
                                </div>
                            )}

                            {detailReport.status === 'approved' && (
                                <Alert color="green" variant="light" title="อนุมัติแล้ว">
                                    <Text size="sm">
                                        อนุมัติโดย: {detailReport.approved_by_name} |
                                        เมื่อ: {detailReport.approved_at ? new Date(detailReport.approved_at).toLocaleString('th-TH') : '-'}
                                    </Text>
                                    {detailReport.messenger_task_id && (
                                        <Text size="xs" c="dimmed" mt={4}>
                                            Messenger Task ID: {detailReport.messenger_task_id}
                                        </Text>
                                    )}
                                </Alert>
                            )}

                            {detailReport.status === 'rejected' && (
                                <Alert color="red" variant="light" title="ไม่อนุมัติ">
                                    <Text size="sm">
                                        โดย: {detailReport.approved_by_name} |
                                        เมื่อ: {detailReport.approved_at ? new Date(detailReport.approved_at).toLocaleString('th-TH') : '-'}
                                    </Text>
                                    <Text size="sm" fw={600} mt={4}>
                                        เหตุผล: {detailReport.reject_reason}
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    )
                })()}
            </Modal>
            {/* ============================================================ */}
            {/* Delete Confirmation Modal */}
            {/* ============================================================ */}
            <Modal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title={<Group gap="sm"><TbTrash size={20} color="red" /><Text fw={700} size="lg">ยืนยันการลบ</Text></Group>}
                size="sm"
                radius="lg"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">ต้องการลบรายงานข้อผิดพลาดนี้หรือไม่? การลบจะไม่สามารถกู้คืนได้</Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setDeleteConfirmId(null)}>ยกเลิก</Button>
                        <Button color="red" leftSection={<TbTrash size={16} />} onClick={confirmDelete}>ลบรายงาน</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    )
}
