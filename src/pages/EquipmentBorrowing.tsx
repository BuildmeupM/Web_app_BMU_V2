import { useState } from 'react'
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Group,
    Stack,
    Table,
    Badge,
    TextInput,
    Select,
    Pagination,
    ActionIcon,
    Tooltip,
    Skeleton,
    Button,
    Modal,
    Textarea,
    Tabs,
    Divider,
    NumberInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
    TbDeviceLaptop,
    TbDeviceDesktop,
    TbMouse,
    TbKeyboard,
    TbCamera,
    TbHeadphones,
    TbPlug,
    TbLink,
    TbBox,
    TbSearch,
    TbRefresh,
    TbPlus,
    TbEdit,
    TbTrash,
    TbCheck,
    TbX,
    TbArrowBackUp,
    TbArrowsSort,
    TbChevronUp,
    TbChevronDown,
    TbPackage,
    TbPackageOff,
    TbTool,
    TbCircleCheck,
    TbClock,
    TbAlertTriangle,
    TbUserCheck,
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import {
    equipmentService,
    type Equipment,
    type EquipmentBorrowing,
    type EquipmentStats,
    type EquipmentAssignment,
    type EmployeeOption,
} from '../services/equipmentService'
import { useAuthStore } from '../store/authStore'
import { notifications } from '@mantine/notifications'

// ── หมวดหมู่ label + icon ──
const categoryConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
    laptop: { label: 'แล็ปท็อป', icon: TbDeviceLaptop, color: 'blue' },
    monitor: { label: 'จอมอนิเตอร์', icon: TbDeviceDesktop, color: 'violet' },
    mouse: { label: 'เมาส์', icon: TbMouse, color: 'green' },
    keyboard: { label: 'คีย์บอร์ด', icon: TbKeyboard, color: 'orange' },
    webcam: { label: 'กล้องเว็บแคม', icon: TbCamera, color: 'pink' },
    headset: { label: 'หูฟัง', icon: TbHeadphones, color: 'cyan' },
    charger: { label: 'ที่ชาร์จ', icon: TbPlug, color: 'yellow' },
    cable: { label: 'สายเคเบิล', icon: TbLink, color: 'gray' },
    other: { label: 'อื่นๆ', icon: TbBox, color: 'dark' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
    available: { label: 'พร้อมใช้งาน', color: 'green' },
    borrowed: { label: 'กำลังถูกยืม', color: 'orange' },
    maintenance: { label: 'ซ่อมบำรุง', color: 'yellow' },
    retired: { label: 'ปลดระวาง', color: 'gray' },
}

const borrowStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'รออนุมัติ', color: 'yellow' },
    approved: { label: 'อนุมัติแล้ว', color: 'blue' },
    borrowed: { label: 'กำลังยืม', color: 'orange' },
    returned: { label: 'คืนแล้ว', color: 'green' },
    rejected: { label: 'ปฏิเสธ', color: 'red' },
    overdue: { label: 'เกินกำหนด', color: 'red' },
}

// ── Utility: format date ──
const formatDate = (d: string | null): string => {
    if (!d) return '–'
    try {
        return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    } catch {
        return d
    }
}

export default function EquipmentBorrowing() {
    const { user } = useAuthStore()
    const isAdmin = user?.role === 'admin'
    const queryClient = useQueryClient()

    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<string | null>('borrowings')

    // ── ตาราง borrowings state ──
    const [bPage, setBPage] = useState(1)
    const [bLimit, setBLimit] = useState(15)
    const [bSearch, setBSearch] = useState('')
    const [bStatusFilter, setBStatusFilter] = useState<string | null>(null)
    const [bSortBy, setBSortBy] = useState('created_at')
    const [bSortOrder, setBSortOrder] = useState<'asc' | 'desc'>('desc')

    // ── ตาราง equipment state ──
    const [ePage, setEPage] = useState(1)
    const [eLimit, setELimit] = useState(15)
    const [eSearch, setESearch] = useState('')
    const [eCategoryFilter, setECategoryFilter] = useState<string | null>(null)
    const [eStatusFilter, setEStatusFilter] = useState<string | null>(null)
    const [eSortBy, setESortBy] = useState('created_at')
    const [eSortOrder, setESortOrder] = useState<'asc' | 'desc'>('desc')

    // ── Modals state ──
    const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
    const [borrowModalOpen, setBorrowModalOpen] = useState(false)
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'equipment' | 'borrowing' | 'assignment'; id: string; name: string } | null>(null)

    // ── Form state ──
    const [formName, setFormName] = useState('')
    const [formCategory, setFormCategory] = useState<string | null>(null)
    const [formBrand, setFormBrand] = useState('')
    const [formModel, setFormModel] = useState('')
    const [formSerial, setFormSerial] = useState('')
    const [formDesc, setFormDesc] = useState('')
    const [formStatus, setFormStatus] = useState<string | null>('available')
    // spec fields
    const [formCpu, setFormCpu] = useState('')
    const [formRam, setFormRam] = useState('')
    const [formStorage, setFormStorage] = useState('')
    const [formDisplay, setFormDisplay] = useState('')
    const [formGpu, setFormGpu] = useState('')
    const [formOs, setFormOs] = useState('')
    const [formPurchaseDate, setFormPurchaseDate] = useState('')
    const [formWarrantyDate, setFormWarrantyDate] = useState('')
    const [formPrice, setFormPrice] = useState<number | string>('')

    // borrow form
    const [borrowEquipmentId, setBorrowEquipmentId] = useState<string | null>(null)
    const [borrowDateRange, setBorrowDateRange] = useState<[Date | null, Date | null]>([null, null])
    const [borrowPurpose, setBorrowPurpose] = useState('')

    // assignment form
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [assignEquipmentId, setAssignEquipmentId] = useState<string | null>(null)
    const [assignEmployeeId, setAssignEmployeeId] = useState<string | null>(null)
    const [assignNotes, setAssignNotes] = useState('')

    // assignment table state
    const [aPage, setAPage] = useState(1)
    const [aLimit, setALimit] = useState(50)
    const [aSearch, setASearch] = useState('')

    const [saving, setSaving] = useState(false)

    // ── Queries ──
    const { data: stats, isLoading: loadingStats } = useQuery<EquipmentStats>(
        ['equipment', 'stats'],
        () => equipmentService.getStats(),
        { staleTime: 30_000, retry: 1 }
    )

    const { data: borrowingsData, isLoading: loadingBorrowings } = useQuery(
        ['equipment', 'borrowings', bPage, bLimit, bSearch, bStatusFilter, bSortBy, bSortOrder],
        () =>
            equipmentService.getBorrowings({
                page: bPage,
                limit: bLimit,
                search: bSearch || undefined,
                status: bStatusFilter || undefined,
                sortBy: bSortBy,
                sortOrder: bSortOrder,
            }),
        { staleTime: 15_000, retry: 1, keepPreviousData: true }
    )

    const { data: equipmentData, isLoading: loadingEquipment } = useQuery(
        ['equipment', 'list', ePage, eLimit, eSearch, eCategoryFilter, eStatusFilter, eSortBy, eSortOrder],
        () =>
            equipmentService.getEquipment({
                page: ePage,
                limit: eLimit,
                search: eSearch || undefined,
                category: eCategoryFilter || undefined,
                status: eStatusFilter || undefined,
                sortBy: eSortBy,
                sortOrder: eSortOrder,
            }),
        { staleTime: 15_000, retry: 1, keepPreviousData: true }
    )

    // ── Assignments query ──
    const { data: assignmentsData, isLoading: loadingAssignments } = useQuery(
        ['equipment', 'assignments', aPage, aLimit, aSearch],
        () =>
            equipmentService.getAssignments({
                page: aPage,
                limit: aLimit,
                search: aSearch || undefined,
            }),
        { staleTime: 15_000, retry: 1, keepPreviousData: true }
    )

    // ── Employees for dropdown ──
    const { data: employees } = useQuery<EmployeeOption[]>(
        ['equipment', 'employees'],
        () => equipmentService.getEmployees(),
        { staleTime: 60_000, retry: 1 }
    )

    // ── Refresh ──
    const handleRefresh = () => {
        queryClient.invalidateQueries(['equipment'])
    }

    // ── Sort helpers ──
    const handleBSort = (col: string) => {
        if (bSortBy === col) setBSortOrder(p => p === 'asc' ? 'desc' : 'asc')
        else { setBSortBy(col); setBSortOrder('desc') }
        setBPage(1)
    }
    const handleESort = (col: string) => {
        if (eSortBy === col) setESortOrder(p => p === 'asc' ? 'desc' : 'asc')
        else { setESortBy(col); setESortOrder('desc') }
        setEPage(1)
    }

    const SortIcon = ({ col, activeSort, activeOrder }: { col: string; activeSort: string; activeOrder: string }) => {
        if (activeSort === col) return activeOrder === 'asc' ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />
        return <TbArrowsSort size={14} color="gray" />
    }

    // ── Equipment Modal handlers ──
    const openAddEquipment = () => {
        setEditingEquipment(null)
        setFormName(''); setFormCategory(null); setFormBrand(''); setFormModel('')
        setFormSerial(''); setFormDesc(''); setFormStatus('available')
        setFormCpu(''); setFormRam(''); setFormStorage(''); setFormDisplay('')
        setFormGpu(''); setFormOs(''); setFormPurchaseDate(''); setFormWarrantyDate(''); setFormPrice('')
        setEquipmentModalOpen(true)
    }
    const openEditEquipment = (eq: Equipment) => {
        setEditingEquipment(eq)
        setFormName(eq.name); setFormCategory(eq.category); setFormBrand(eq.brand || '')
        setFormModel(eq.model || ''); setFormSerial(eq.serial_number || '')
        setFormDesc(eq.description || ''); setFormStatus(eq.status)
        setFormCpu(eq.cpu || ''); setFormRam(eq.ram || ''); setFormStorage(eq.storage || '')
        setFormDisplay(eq.display || ''); setFormGpu(eq.gpu || ''); setFormOs(eq.os || '')
        setFormPurchaseDate(eq.purchase_date ? eq.purchase_date.split('T')[0] : '')
        setFormWarrantyDate(eq.warranty_expire_date ? eq.warranty_expire_date.split('T')[0] : '')
        setFormPrice(eq.purchase_price ?? '')
        setEquipmentModalOpen(true)
    }
    const handleSaveEquipment = async () => {
        if (!formName || !formCategory) {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'กรุณากรอกชื่อและหมวดหมู่', color: 'red' })
            return
        }
        setSaving(true)
        try {
            const payload = {
                name: formName,
                category: formCategory,
                brand: formBrand || undefined,
                model: formModel || undefined,
                serial_number: formSerial || undefined,
                description: formDesc || undefined,
                status: formStatus || undefined,
                cpu: formCpu || undefined,
                ram: formRam || undefined,
                storage: formStorage || undefined,
                display: formDisplay || undefined,
                gpu: formGpu || undefined,
                os: formOs || undefined,
                purchase_date: formPurchaseDate || undefined,
                warranty_expire_date: formWarrantyDate || undefined,
                purchase_price: formPrice !== '' ? Number(formPrice) : undefined,
            }
            if (editingEquipment) {
                await equipmentService.updateEquipment(editingEquipment.id, payload as any)
                notifications.show({ title: 'สำเร็จ', message: 'แก้ไขอุปกรณ์สำเร็จ', color: 'green' })
            } else {
                await equipmentService.createEquipment(payload)
                notifications.show({ title: 'สำเร็จ', message: 'เพิ่มอุปกรณ์สำเร็จ', color: 'green' })
            }
            setEquipmentModalOpen(false)
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        } finally {
            setSaving(false)
        }
    }

    // ── Borrow Modal ──
    const openBorrowModal = (eqId?: string) => {
        setBorrowEquipmentId(eqId || null)
        setBorrowDateRange([new Date(), null])
        setBorrowPurpose('')
        setBorrowModalOpen(true)
    }
    const handleCreateBorrowing = async () => {
        if (!borrowEquipmentId || !borrowDateRange[0] || !borrowDateRange[1]) {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'กรุณากรอกข้อมูลให้ครบ', color: 'red' })
            return
        }
        setSaving(true)
        try {
            await equipmentService.createBorrowing({
                equipment_id: borrowEquipmentId,
                borrow_date: borrowDateRange[0].toISOString().split('T')[0],
                expected_return_date: borrowDateRange[1].toISOString().split('T')[0],
                purpose: borrowPurpose || undefined,
            })
            notifications.show({ title: 'สำเร็จ', message: 'ส่งคำขอยืมสำเร็จ', color: 'green' })
            setBorrowModalOpen(false)
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        } finally {
            setSaving(false)
        }
    }

    // ── Actions ──
    const handleApprove = async (id: string) => {
        try {
            await equipmentService.approveBorrowing(id)
            notifications.show({ title: 'สำเร็จ', message: 'อนุมัติคำขอสำเร็จ', color: 'green' })
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        }
    }
    const handleReject = async (id: string) => {
        try {
            await equipmentService.rejectBorrowing(id)
            notifications.show({ title: 'สำเร็จ', message: 'ปฏิเสธคำขอสำเร็จ', color: 'orange' })
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        }
    }
    const handleReturn = async (id: string) => {
        try {
            await equipmentService.returnBorrowing(id)
            notifications.show({ title: 'สำเร็จ', message: 'คืนอุปกรณ์สำเร็จ', color: 'green' })
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        }
    }
    const handleDelete = async () => {
        if (!deleteTarget) return
        setSaving(true)
        try {
            if (deleteTarget.type === 'equipment') {
                await equipmentService.deleteEquipment(deleteTarget.id)
            } else if (deleteTarget.type === 'assignment') {
                await equipmentService.deleteAssignment(deleteTarget.id)
            } else {
                await equipmentService.deleteBorrowing(deleteTarget.id)
            }
            notifications.show({ title: 'สำเร็จ', message: 'ลบสำเร็จ', color: 'green' })
            setDeleteModalOpen(false)
            setDeleteTarget(null)
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        } finally {
            setSaving(false)
        }
    }

    // ── Available equipment for borrow dropdown ──
    const availableEquipment = (equipmentData?.equipment || []).filter(e => e.status === 'available')

    // ── Assignment handlers ──
    const openAssignModal = () => {
        setAssignEquipmentId(null)
        setAssignEmployeeId(null)
        setAssignNotes('')
        setAssignModalOpen(true)
    }
    const handleCreateAssignment = async () => {
        if (!assignEquipmentId || !assignEmployeeId) {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'กรุณาเลือกอุปกรณ์และพนักงาน', color: 'red' })
            return
        }
        setSaving(true)
        try {
            await equipmentService.createAssignment({
                equipment_id: assignEquipmentId,
                assigned_to: assignEmployeeId,
                notes: assignNotes || undefined,
            })
            notifications.show({ title: 'สำเร็จ', message: 'มอบหมายอุปกรณ์สำเร็จ', color: 'green' })
            setAssignModalOpen(false)
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        } finally {
            setSaving(false)
        }
    }
    const handleReturnAssignment = async (id: string) => {
        try {
            await equipmentService.returnAssignment(id)
            notifications.show({ title: 'สำเร็จ', message: 'คืนอุปกรณ์สำเร็จ', color: 'green' })
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        }
    }
    const handleDeleteAssignment = async (id: string, name: string) => {
        setDeleteTarget({ type: 'equipment', id, name })
        setDeleteModalOpen(true)
    }

    return (
        <>
            <Container size="xl">
                <Stack gap="lg">
                    {/* Header */}
                    <Group justify="space-between" align="flex-end">
                        <div>
                            <Title order={2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TbDeviceLaptop size={28} color="var(--mantine-color-teal-6)" />
                                ระบบยืมอุปกรณ์คอมพิวเตอร์
                            </Title>
                            <Text c="dimmed" size="sm">จัดการอุปกรณ์ IT ยืม-คืน และตรวจสอบสถานะ</Text>
                        </div>
                        <Group gap="xs">
                            <Button
                                variant="light"
                                color="teal"
                                size="sm"
                                radius="xl"
                                leftSection={<TbPlus size={16} />}
                                onClick={() => openBorrowModal()}
                            >
                                ยืมอุปกรณ์
                            </Button>
                            {isAdmin && (
                                <Button
                                    variant="filled"
                                    color="teal"
                                    size="sm"
                                    radius="xl"
                                    leftSection={<TbPlus size={16} />}
                                    onClick={openAddEquipment}
                                >
                                    เพิ่มอุปกรณ์
                                </Button>
                            )}
                            <ActionIcon variant="subtle" color="gray" size="lg" onClick={handleRefresh} radius="xl">
                                <TbRefresh size={18} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    {/* ── Stats Cards ── */}
                    <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
                        {[
                            { label: 'ทั้งหมด', value: stats?.total, icon: TbPackage, color: 'blue' },
                            { label: 'พร้อมใช้งาน', value: stats?.available, icon: TbCircleCheck, color: 'green' },
                            { label: 'กำลังถูกยืม', value: stats?.borrowed, icon: TbClock, color: 'orange' },
                            { label: 'ซ่อมบำรุง', value: stats?.maintenance, icon: TbTool, color: 'yellow' },
                            { label: 'เกินกำหนดคืน', value: stats?.overdue, icon: TbAlertTriangle, color: 'red' },
                        ].map((s, i) => (
                            <Card key={i} padding="md" radius="xl" withBorder>
                                <Group justify="space-between">
                                    <div>
                                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">{s.label}</Text>
                                        {loadingStats ? (
                                            <Skeleton height={28} mt="xs" width={40} />
                                        ) : (
                                            <Text size="xl" fw={700} mt={4} c={s.color}>{s.value ?? '–'}</Text>
                                        )}
                                    </div>
                                    <s.icon size={32} color={`var(--mantine-color-${s.color}-5)`} style={{ opacity: 0.6 }} />
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>

                    {/* ── Tabs ── */}
                    <Card padding="lg" radius="xl" withBorder>
                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <Tabs.List>
                                <Tabs.Tab value="borrowings" leftSection={<TbPackageOff size={16} />}>
                                    รายการยืม-คืน
                                </Tabs.Tab>
                                <Tabs.Tab value="inventory" leftSection={<TbPackage size={16} />}>
                                    คลังอุปกรณ์
                                </Tabs.Tab>
                                <Tabs.Tab value="assignments" leftSection={<TbUserCheck size={16} />}>
                                    อุปกรณ์ที่พนักงานใช้
                                </Tabs.Tab>
                            </Tabs.List>

                            {/* ══════════ Tab: Borrowings ══════════ */}
                            <Tabs.Panel value="borrowings" mt="md">
                                <Stack gap="md">
                                    {/* Filters */}
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <TextInput
                                                placeholder="ค้นหาอุปกรณ์ / ผู้ยืม..."
                                                size="xs"
                                                radius="xl"
                                                leftSection={<TbSearch size={14} />}
                                                value={bSearch}
                                                onChange={e => { setBSearch(e.target.value); setBPage(1) }}
                                                style={{ width: 220 }}
                                            />
                                            <Select
                                                placeholder="ทุกสถานะ"
                                                size="xs"
                                                radius="xl"
                                                clearable
                                                value={bStatusFilter}
                                                onChange={val => { setBStatusFilter(val); setBPage(1) }}
                                                data={Object.entries(borrowStatusConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                                                style={{ width: 140 }}
                                            />
                                        </Group>
                                    </Group>

                                    {/* Table */}
                                    {loadingBorrowings ? (
                                        <Stack gap="xs">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} />)}</Stack>
                                    ) : (
                                        <>
                                            <Table striped highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('equipment_name')}>
                                                            <Group gap={4} wrap="nowrap">อุปกรณ์ <SortIcon col="equipment_name" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('borrower_name')}>
                                                            <Group gap={4} wrap="nowrap">ผู้ยืม <SortIcon col="borrower_name" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('borrow_date')}>
                                                            <Group gap={4} wrap="nowrap">วันที่ยืม <SortIcon col="borrow_date" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('expected_return_date')}>
                                                            <Group gap={4} wrap="nowrap">กำหนดคืน <SortIcon col="expected_return_date" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBSort('status')}>
                                                            <Group gap={4} wrap="nowrap">สถานะ <SortIcon col="status" activeSort={bSortBy} activeOrder={bSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th>เหตุผล</Table.Th>
                                                        <Table.Th style={{ width: 120 }}>จัดการ</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {(!borrowingsData?.borrowings || borrowingsData.borrowings.length === 0) ? (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={7}>
                                                                <Text ta="center" c="dimmed" py="xl">ไม่มีรายการยืม-คืน</Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ) : (
                                                        borrowingsData.borrowings.map((b: EquipmentBorrowing) => {
                                                            const bsc = borrowStatusConfig[b.status] || { label: b.status, color: 'gray' }
                                                            const cc = categoryConfig[b.equipment_category] || categoryConfig.other
                                                            const CatIcon = cc.icon
                                                            return (
                                                                <Table.Tr key={b.id}>
                                                                    <Table.Td>
                                                                        <Group gap="xs" wrap="nowrap">
                                                                            <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                                            <div>
                                                                                <Text size="sm" fw={500} lineClamp={1}>{b.equipment_name}</Text>
                                                                                {b.equipment_brand && (
                                                                                    <Text size="xs" c="dimmed">{b.equipment_brand} {b.equipment_model || ''}</Text>
                                                                                )}
                                                                            </div>
                                                                        </Group>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm" fw={500}>{b.borrower_nick_name || b.borrower_name}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{formatDate(b.borrow_date)}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{formatDate(b.expected_return_date)}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge variant="light" color={bsc.color} size="sm" radius="xl">{bsc.label}</Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" c="dimmed" lineClamp={1}>{b.purpose || '–'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Group gap={4}>
                                                                            {isAdmin && b.status === 'pending' && (
                                                                                <>
                                                                                    <Tooltip label="อนุมัติ">
                                                                                        <ActionIcon variant="subtle" color="green" size="sm" onClick={() => handleApprove(b.id)}>
                                                                                            <TbCheck size={14} />
                                                                                        </ActionIcon>
                                                                                    </Tooltip>
                                                                                    <Tooltip label="ปฏิเสธ">
                                                                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleReject(b.id)}>
                                                                                            <TbX size={14} />
                                                                                        </ActionIcon>
                                                                                    </Tooltip>
                                                                                </>
                                                                            )}
                                                                            {['approved', 'borrowed', 'overdue'].includes(b.status) && (
                                                                                <Tooltip label="คืนอุปกรณ์">
                                                                                    <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => handleReturn(b.id)}>
                                                                                        <TbArrowBackUp size={14} />
                                                                                    </ActionIcon>
                                                                                </Tooltip>
                                                                            )}
                                                                            {isAdmin && (
                                                                                <Tooltip label="ลบ">
                                                                                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => {
                                                                                        setDeleteTarget({ type: 'borrowing', id: b.id, name: b.equipment_name })
                                                                                        setDeleteModalOpen(true)
                                                                                    }}>
                                                                                        <TbTrash size={14} />
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

                                            {/* Pagination */}
                                            {borrowingsData && (
                                                <Group justify="space-between" mt="md" align="center">
                                                    <Group gap="xs">
                                                        <Text size="xs" c="dimmed">แสดง</Text>
                                                        <Select size="xs" radius="xl" value={String(bLimit)}
                                                            onChange={v => { setBLimit(Number(v) || 15); setBPage(1) }}
                                                            data={['15', '25', '50', '100']} style={{ width: 75 }} />
                                                        <Text size="xs" c="dimmed">รายการ</Text>
                                                    </Group>
                                                    {borrowingsData.pagination.totalPages > 1 && (
                                                        <Pagination total={borrowingsData.pagination.totalPages} value={bPage} onChange={setBPage}
                                                            size="sm" radius="xl" color="teal" />
                                                    )}
                                                    <Text size="xs" c="dimmed">ทั้งหมด {borrowingsData.pagination.total} รายการ</Text>
                                                </Group>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Tabs.Panel>

                            {/* ══════════ Tab: Inventory ══════════ */}
                            <Tabs.Panel value="inventory" mt="md">
                                <Stack gap="md">
                                    {/* Filters */}
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <TextInput
                                                placeholder="ค้นหาอุปกรณ์..."
                                                size="xs"
                                                radius="xl"
                                                leftSection={<TbSearch size={14} />}
                                                value={eSearch}
                                                onChange={e => { setESearch(e.target.value); setEPage(1) }}
                                                style={{ width: 200 }}
                                            />
                                            <Select
                                                placeholder="หมวดหมู่"
                                                size="xs"
                                                radius="xl"
                                                clearable
                                                value={eCategoryFilter}
                                                onChange={val => { setECategoryFilter(val); setEPage(1) }}
                                                data={Object.entries(categoryConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                                                style={{ width: 140 }}
                                            />
                                            <Select
                                                placeholder="สถานะ"
                                                size="xs"
                                                radius="xl"
                                                clearable
                                                value={eStatusFilter}
                                                onChange={val => { setEStatusFilter(val); setEPage(1) }}
                                                data={Object.entries(statusConfig).map(([v, c]) => ({ value: v, label: c.label }))}
                                                style={{ width: 130 }}
                                            />
                                        </Group>
                                    </Group>

                                    {/* Table */}
                                    {loadingEquipment ? (
                                        <Stack gap="xs">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} />)}</Stack>
                                    ) : (
                                        <>
                                            <Table striped highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('name')}>
                                                            <Group gap={4} wrap="nowrap">ชื่ออุปกรณ์ <SortIcon col="name" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('category')}>
                                                            <Group gap={4} wrap="nowrap">หมวดหมู่ <SortIcon col="category" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th>ยี่ห้อ / รุ่น</Table.Th>
                                                        <Table.Th>S/N</Table.Th>
                                                        <Table.Th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleESort('status')}>
                                                            <Group gap={4} wrap="nowrap">สถานะ <SortIcon col="status" activeSort={eSortBy} activeOrder={eSortOrder} /></Group>
                                                        </Table.Th>
                                                        <Table.Th>ผู้ยืมปัจจุบัน</Table.Th>
                                                        <Table.Th style={{ width: 100 }}>จัดการ</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {(!equipmentData?.equipment || equipmentData.equipment.length === 0) ? (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={7}>
                                                                <Text ta="center" c="dimmed" py="xl">ไม่มีอุปกรณ์ในระบบ</Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ) : (
                                                        equipmentData.equipment.map((eq: Equipment) => {
                                                            const sc = statusConfig[eq.status] || { label: eq.status, color: 'gray' }
                                                            const cc = categoryConfig[eq.category] || categoryConfig.other
                                                            const CatIcon = cc.icon
                                                            return (
                                                                <Table.Tr key={eq.id}>
                                                                    <Table.Td>
                                                                        <Group gap="xs" wrap="nowrap">
                                                                            <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                                            <Text size="sm" fw={500}>{eq.name}</Text>
                                                                        </Group>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge variant="light" color={cc.color} size="sm" radius="xl">{cc.label}</Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{eq.brand || '–'} {eq.model ? `/ ${eq.model}` : ''}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" c="dimmed" ff="monospace">{eq.serial_number || '–'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge variant="light" color={sc.color} size="sm" radius="xl">{sc.label}</Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        {eq.current_borrowing ? (
                                                                            <Text size="xs" c="dimmed">
                                                                                {eq.current_borrowing.borrower_nick_name || eq.current_borrowing.borrower_name}
                                                                            </Text>
                                                                        ) : (
                                                                            <Text size="xs" c="dimmed">–</Text>
                                                                        )}
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Group gap={4}>
                                                                            {eq.status === 'available' && (
                                                                                <Tooltip label="ยืม">
                                                                                    <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => openBorrowModal(eq.id)}>
                                                                                        <TbPackageOff size={14} />
                                                                                    </ActionIcon>
                                                                                </Tooltip>
                                                                            )}
                                                                            {isAdmin && (
                                                                                <>
                                                                                    <Tooltip label="แก้ไข">
                                                                                        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => openEditEquipment(eq)}>
                                                                                            <TbEdit size={14} />
                                                                                        </ActionIcon>
                                                                                    </Tooltip>
                                                                                    <Tooltip label="ลบ">
                                                                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => {
                                                                                            setDeleteTarget({ type: 'equipment', id: eq.id, name: eq.name })
                                                                                            setDeleteModalOpen(true)
                                                                                        }}>
                                                                                            <TbTrash size={14} />
                                                                                        </ActionIcon>
                                                                                    </Tooltip>
                                                                                </>
                                                                            )}
                                                                        </Group>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            )
                                                        })
                                                    )}
                                                </Table.Tbody>
                                            </Table>

                                            {/* Pagination */}
                                            {equipmentData && (
                                                <Group justify="space-between" mt="md" align="center">
                                                    <Group gap="xs">
                                                        <Text size="xs" c="dimmed">แสดง</Text>
                                                        <Select size="xs" radius="xl" value={String(eLimit)}
                                                            onChange={v => { setELimit(Number(v) || 15); setEPage(1) }}
                                                            data={['15', '25', '50', '100']} style={{ width: 75 }} />
                                                        <Text size="xs" c="dimmed">รายการ</Text>
                                                    </Group>
                                                    {equipmentData.pagination.totalPages > 1 && (
                                                        <Pagination total={equipmentData.pagination.totalPages} value={ePage} onChange={setEPage}
                                                            size="sm" radius="xl" color="teal" />
                                                    )}
                                                    <Text size="xs" c="dimmed">ทั้งหมด {equipmentData.pagination.total} รายการ</Text>
                                                </Group>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Tabs.Panel>

                            {/* ══════════ Tab: Assignments ══════════ */}
                            <Tabs.Panel value="assignments" mt="md">
                                <Stack gap="md">
                                    {/* Filters + Add button */}
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <TextInput
                                                placeholder="ค้นหาพนักงาน / อุปกรณ์..."
                                                size="xs"
                                                radius="xl"
                                                leftSection={<TbSearch size={14} />}
                                                value={aSearch}
                                                onChange={e => { setASearch(e.target.value); setAPage(1) }}
                                                style={{ width: 250 }}
                                            />
                                        </Group>
                                        {isAdmin && (
                                            <Button
                                                variant="filled"
                                                color="teal"
                                                size="xs"
                                                radius="xl"
                                                leftSection={<TbPlus size={14} />}
                                                onClick={openAssignModal}
                                            >
                                                มอบหมายอุปกรณ์
                                            </Button>
                                        )}
                                    </Group>

                                    {/* Table */}
                                    {loadingAssignments ? (
                                        <Stack gap="xs">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} />)}</Stack>
                                    ) : (
                                        <>
                                            <Table striped highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th>พนักงาน</Table.Th>
                                                        <Table.Th>อุปกรณ์</Table.Th>
                                                        <Table.Th>หมวดหมู่</Table.Th>
                                                        <Table.Th>ยี่ห้อ / รุ่น</Table.Th>
                                                        <Table.Th>S/N</Table.Th>
                                                        <Table.Th>วันที่มอบหมาย</Table.Th>
                                                        <Table.Th>หมายเหตุ</Table.Th>
                                                        {isAdmin && <Table.Th style={{ width: 80 }}>จัดการ</Table.Th>}
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {(!assignmentsData?.assignments || assignmentsData.assignments.length === 0) ? (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={isAdmin ? 8 : 7}>
                                                                <Text ta="center" c="dimmed" py="xl">ยังไม่มีการมอบหมายอุปกรณ์</Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ) : (
                                                        assignmentsData.assignments.map((a: EquipmentAssignment) => {
                                                            const cc = categoryConfig[a.equipment_category] || categoryConfig.other
                                                            const CatIcon = cc.icon
                                                            return (
                                                                <Table.Tr key={a.id}>
                                                                    <Table.Td>
                                                                        <div>
                                                                            <Text size="sm" fw={500}>{a.employee_nick_name || a.employee_name}</Text>
                                                                            {a.employee_code && <Text size="xs" c="dimmed">{a.employee_code}</Text>}
                                                                        </div>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Group gap="xs" wrap="nowrap">
                                                                            <CatIcon size={18} color={`var(--mantine-color-${cc.color}-5)`} />
                                                                            <Text size="sm" fw={500}>{a.equipment_name}</Text>
                                                                        </Group>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge variant="light" color={cc.color} size="sm" radius="xl">{cc.label}</Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{a.equipment_brand || '–'} {a.equipment_model ? `/ ${a.equipment_model}` : ''}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" c="dimmed" ff="monospace">{a.equipment_serial || '–'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{formatDate(a.assigned_date)}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" c="dimmed" lineClamp={1}>{a.notes || '–'}</Text>
                                                                    </Table.Td>
                                                                    {isAdmin && (
                                                                        <Table.Td>
                                                                            <Group gap={4}>
                                                                                <Tooltip label="เรียกคืน">
                                                                                    <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => handleReturnAssignment(a.id)}>
                                                                                        <TbArrowBackUp size={14} />
                                                                                    </ActionIcon>
                                                                                </Tooltip>
                                                                                <Tooltip label="ลบ">
                                                                                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => {
                                                                                        setDeleteTarget({ type: 'assignment', id: a.id, name: `${a.equipment_name} → ${a.employee_name}` })
                                                                                        setDeleteModalOpen(true)
                                                                                    }}>
                                                                                        <TbTrash size={14} />
                                                                                    </ActionIcon>
                                                                                </Tooltip>
                                                                            </Group>
                                                                        </Table.Td>
                                                                    )}
                                                                </Table.Tr>
                                                            )
                                                        })
                                                    )}
                                                </Table.Tbody>
                                            </Table>

                                            {/* Pagination */}
                                            {assignmentsData && (
                                                <Group justify="space-between" mt="md" align="center">
                                                    <Text size="xs" c="dimmed">ทั้งหมด {assignmentsData.pagination.total} รายการ</Text>
                                                    {assignmentsData.pagination.totalPages > 1 && (
                                                        <Pagination total={assignmentsData.pagination.totalPages} value={aPage} onChange={setAPage}
                                                            size="sm" radius="xl" color="teal" />
                                                    )}
                                                </Group>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Card>
                </Stack>
            </Container>

            {/* ══════════ Modal: เพิ่ม/แก้ไขอุปกรณ์ ══════════ */}
            <Modal
                opened={equipmentModalOpen}
                onClose={() => setEquipmentModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbPackage size={20} color="var(--mantine-color-teal-6)" />
                        <Text fw={600}>{editingEquipment ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</Text>
                    </Group>
                }
                centered
                size="lg"
            >
                <Stack gap="md">
                    <TextInput label="ชื่ออุปกรณ์" placeholder="เช่น Laptop Dell Latitude 5540" required
                        value={formName} onChange={e => setFormName(e.target.value)} />
                    <Select label="หมวดหมู่" placeholder="เลือกหมวดหมู่" required
                        value={formCategory} onChange={setFormCategory}
                        data={Object.entries(categoryConfig).map(([v, c]) => ({ value: v, label: c.label }))} />
                    <Group grow>
                        <TextInput label="ยี่ห้อ" placeholder="Dell, HP, Logitech..."
                            value={formBrand} onChange={e => setFormBrand(e.target.value)} />
                        <TextInput label="รุ่น" placeholder="Latitude 5540"
                            value={formModel} onChange={e => setFormModel(e.target.value)} />
                    </Group>
                    <TextInput label="S/N" placeholder="หมายเลข Serial Number"
                        value={formSerial} onChange={e => setFormSerial(e.target.value)} />
                    {editingEquipment && (
                        <Select label="สถานะ" value={formStatus} onChange={setFormStatus}
                            data={Object.entries(statusConfig).map(([v, c]) => ({ value: v, label: c.label }))} />
                    )}

                    {/* ── สเปคคอมพิวเตอร์ ── */}
                    <Divider label="สเปคคอมพิวเตอร์" labelPosition="center" />
                    <Group grow>
                        <TextInput label="CPU" placeholder="Intel i7-13700H, AMD Ryzen 5..."
                            value={formCpu} onChange={e => setFormCpu(e.target.value)} />
                        <TextInput label="RAM" placeholder="16GB DDR5"
                            value={formRam} onChange={e => setFormRam(e.target.value)} />
                    </Group>
                    <Group grow>
                        <TextInput label="Storage" placeholder="512GB NVMe SSD"
                            value={formStorage} onChange={e => setFormStorage(e.target.value)} />
                        <TextInput label="GPU" placeholder="NVIDIA RTX 4060, Intel UHD..."
                            value={formGpu} onChange={e => setFormGpu(e.target.value)} />
                    </Group>
                    <Group grow>
                        <TextInput label="หน้าจอ" placeholder='15.6" FHD IPS, 24" 4K...'
                            value={formDisplay} onChange={e => setFormDisplay(e.target.value)} />
                        <TextInput label="ระบบปฏิบัติการ" placeholder="Windows 11 Pro, macOS..."
                            value={formOs} onChange={e => setFormOs(e.target.value)} />
                    </Group>

                    {/* ── ข้อมูลการซื้อ ── */}
                    <Divider label="ข้อมูลการซื้อ / ประกัน" labelPosition="center" />
                    <Group grow>
                        <TextInput label="วันที่ซื้อ" type="date"
                            value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)} />
                        <TextInput label="วันหมดประกัน" type="date"
                            value={formWarrantyDate} onChange={e => setFormWarrantyDate(e.target.value)} />
                    </Group>
                    <NumberInput label="ราคาซื้อ (บาท)" placeholder="0.00"
                        value={formPrice} onChange={setFormPrice}
                        min={0} decimalScale={2} thousandSeparator="," />

                    <Textarea label="รายละเอียดเพิ่มเติม" placeholder="หมายเหตุอื่นๆ..."
                        value={formDesc} onChange={e => setFormDesc(e.target.value)} minRows={2} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setEquipmentModalOpen(false)}>ยกเลิก</Button>
                        <Button color="teal" onClick={handleSaveEquipment} loading={saving}>
                            {editingEquipment ? 'บันทึก' : 'เพิ่ม'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ══════════ Modal: ยืมอุปกรณ์ ══════════ */}
            <Modal
                opened={borrowModalOpen}
                onClose={() => setBorrowModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbPackageOff size={20} color="var(--mantine-color-teal-6)" />
                        <Text fw={600}>ยืมอุปกรณ์</Text>
                    </Group>
                }
                centered
                size="md"
            >
                <Stack gap="md">
                    <Select
                        label="เลือกอุปกรณ์"
                        placeholder="เลือกอุปกรณ์ที่ต้องการยืม"
                        required
                        value={borrowEquipmentId}
                        onChange={setBorrowEquipmentId}
                        data={availableEquipment.map(e => ({
                            value: e.id,
                            label: `${e.name}${e.brand ? ` (${e.brand})` : ''}`,
                        }))}
                        searchable
                        nothingFoundMessage="ไม่พบอุปกรณ์ที่พร้อมให้ยืม"
                    />
                    <DatePickerInput
                        type="range"
                        label="ช่วงวันที่ยืม - คืน"
                        placeholder="เลือกวันเริ่มต้น - สิ้นสุด"
                        required
                        value={borrowDateRange}
                        onChange={setBorrowDateRange}
                        locale="th"
                    />
                    <Textarea label="เหตุผลการยืม" placeholder="ระบุเหตุผล..."
                        value={borrowPurpose} onChange={e => setBorrowPurpose(e.target.value)} minRows={2} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setBorrowModalOpen(false)}>ยกเลิก</Button>
                        <Button color="teal" onClick={handleCreateBorrowing} loading={saving}>
                            ส่งคำขอยืม
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ══════════ Modal: มอบหมายอุปกรณ์ ══════════ */}
            <Modal
                opened={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbUserCheck size={20} color="var(--mantine-color-teal-6)" />
                        <Text fw={600}>มอบหมายอุปกรณ์ให้พนักงาน</Text>
                    </Group>
                }
                centered
                size="md"
            >
                <Stack gap="md">
                    <Select
                        label="เลือกพนักงาน"
                        placeholder="ค้นหาชื่อพนักงาน..."
                        required
                        searchable
                        value={assignEmployeeId}
                        onChange={setAssignEmployeeId}
                        data={(employees || []).map(emp => ({
                            value: emp.id,
                            label: `${emp.name}${emp.nick_name ? ` (${emp.nick_name})` : ''}${emp.employee_id ? ` - ${emp.employee_id}` : ''}`,
                        }))}
                        nothingFoundMessage="ไม่พบพนักงาน"
                    />
                    <Select
                        label="เลือกอุปกรณ์"
                        placeholder="ค้นหาอุปกรณ์..."
                        required
                        searchable
                        value={assignEquipmentId}
                        onChange={setAssignEquipmentId}
                        data={availableEquipment.map(e => ({
                            value: e.id,
                            label: `${e.name}${e.brand ? ` (${e.brand})` : ''}${e.serial_number ? ` [${e.serial_number}]` : ''}`,
                        }))}
                        nothingFoundMessage="ไม่พบอุปกรณ์ที่พร้อมใช้"
                    />
                    <Textarea label="หมายเหตุ" placeholder="เช่น อุปกรณ์ประจำตำแหน่ง, อุปกรณ์ทดแทน..."
                        value={assignNotes} onChange={e => setAssignNotes(e.target.value)} minRows={2} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setAssignModalOpen(false)}>ยกเลิก</Button>
                        <Button color="teal" onClick={handleCreateAssignment} loading={saving}>
                            มอบหมาย
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ══════════ Modal: ยืนยันลบ ══════════ */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbTrash size={20} color="var(--mantine-color-red-6)" />
                        <Text fw={600}>ยืนยันการลบ</Text>
                    </Group>
                }
                centered
                size="sm"
            >
                <Stack gap="md">
                    <Text>คุณต้องการลบ <b>{deleteTarget?.name}</b> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setDeleteModalOpen(false)}>ยกเลิก</Button>
                        <Button color="red" onClick={handleDelete} loading={saving}>ลบ</Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    )
}
