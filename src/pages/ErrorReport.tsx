/**
 * ErrorReport Page — รายงานข้อผิดพลาดด้านภาษี
 * Accounting team creates error reports → admin/audit approves → auto-create messenger task
 *
 * Sub-components extracted to src/components/ErrorReport/
 *   - constants.ts (STATUS_CONFIG, helpers, emptyForm)
 *   - ErrorReportFormModal.tsx
 *   - RejectModal.tsx
 *   - DetailModal.tsx
 *   - DeleteConfirmModal.tsx
 */

import { useState, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import {
    Container, Title, Button, Group, Text, Badge, Card,
    Table, LoadingOverlay, ActionIcon, Tooltip, Box,
    SimpleGrid,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
    TbPlus, TbCheck, TbX, TbEdit, TbTrash,
    TbAlertTriangle, TbEye, TbRefresh,
} from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import {
    errorReportService,
    ErrorReport, ErrorReportForm,
} from '../services/errorReportService'
import { getLocations, MessengerLocation } from '../services/messengerRouteService'
import {
    STATUS_CONFIG, MESSENGER_STATUS_CONFIG, emptyForm,
    getErrorTypeLabels, getTaxMonthLabels,
} from '../components/ErrorReport'
import { ErrorReportFormModal, RejectModal, DetailModal, DeleteConfirmModal } from '../components/ErrorReport'

export default function ErrorReportPage() {
    const { user } = useAuthStore()
    const isAdminOrAudit = user && ['admin', 'audit'].includes(user.role)

    // ✅ Performance: ใช้ react-query แทน manual fetchAll เพื่อให้ได้ caching, deduplication, background refetch
    const queryClient = useQueryClient()

    const { data: reports = [], isLoading: loadingReports } = useQuery(
        ['error-reports'],
        () => errorReportService.getAll(),
        { staleTime: 30 * 1000 } // 30s cache
    )
    const { data: auditors = [] } = useQuery(
        ['error-reports-auditors'],
        () => errorReportService.getAuditors(),
        { staleTime: 5 * 60 * 1000 } // 5 min cache
    )
    const { data: clients = [] } = useQuery(
        ['error-reports-clients'],
        () => errorReportService.getClients(),
        { staleTime: 5 * 60 * 1000 }
    )
    const { data: locations = [] } = useQuery<MessengerLocation[]>(
        ['error-reports-locations'],
        () => getLocations(),
        { staleTime: 5 * 60 * 1000 }
    )
    const loading = loadingReports
    const [refreshing, setRefreshing] = useState(false)


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

    // ✅ Performance: refetch ทุก query ที่เกี่ยวข้อง
    const refreshAll = useCallback(async () => {
        setRefreshing(true)
        try {
            await queryClient.invalidateQueries(['error-reports'])
            await queryClient.invalidateQueries(['error-reports-auditors'])
            await queryClient.invalidateQueries(['error-reports-clients'])
            await queryClient.invalidateQueries(['error-reports-locations'])
        } catch {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลได้', color: 'red' })
        } finally {
            setRefreshing(false)
        }
    }, [queryClient])

    // Debounced client search
    const [clientSearching, setClientSearching] = useState(false)
    const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const searchClients = useCallback((query: string) => {
        if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current)
        clientSearchTimer.current = setTimeout(async () => {
            setClientSearching(true)
            try {
                const results = await errorReportService.getClients(query)
                // ✅ Performance: ใช้ queryClient.setQueryData แทน setState
                queryClient.setQueryData(['error-reports-clients'], results)
            } catch { /* ignore */ }
            setClientSearching(false)
        }, 300)
    }, [queryClient])

    // Open create form
    const openCreate = () => {
        setEditingId(null)
        setForm({ ...emptyForm })
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
            queryClient.invalidateQueries(['error-reports'])
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
            queryClient.invalidateQueries(['error-reports'])
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
            queryClient.invalidateQueries(['error-reports'])
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
            queryClient.invalidateQueries(['error-reports'])
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
                                onClick={() => refreshAll()}
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

            {/* Extracted Modals */}
            <ErrorReportFormModal
                opened={formOpened}
                onClose={() => setFormOpened(false)}
                editingId={editingId}
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                submitting={submitting}
                clients={clients}
                auditors={auditors}
                locations={locations}
                userName={user?.name || ''}
                searchClients={searchClients}
                clientSearching={clientSearching}
                onLocationsUpdate={(updater) =>
                    queryClient.setQueryData<MessengerLocation[]>(
                        ['error-reports-locations'],
                        (prev) => updater(prev || [])
                    )
                }
            />
            <RejectModal
                opened={rejectModalId !== null}
                onClose={() => setRejectModalId(null)}
                rejectReason={rejectReason}
                onRejectReasonChange={setRejectReason}
                onConfirm={handleReject}
            />
            <DetailModal
                report={detailReport}
                onClose={() => setDetailReport(null)}
            />
            <DeleteConfirmModal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
            />
        </Container>
    )
}
