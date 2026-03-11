import { useState } from 'react'
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Group,
    Stack,
    ActionIcon,
    Skeleton,
    Button,
    Modal,
    Tabs,
} from '@mantine/core'
import {
    TbDeviceLaptop,
    TbRefresh,
    TbPlus,
    TbTrash,
    TbPackage,
    TbPackageOff,
    TbTool,
    TbCircleCheck,
    TbClock,
    TbAlertTriangle,
    TbUserCheck,
    TbCopy,
    TbCheck,
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import {
    equipmentService,
    type Equipment,
    type EquipmentBorrowing as EquipmentBorrowingType,
    type EquipmentStats,
    type EquipmentAssignment,
    type EmployeeOption,
    type SystemInfo,
} from '../services/equipmentService'
import { useAuthStore } from '../store/authStore'
import { notifications } from '@mantine/notifications'
import {
    categoryConfig,
    statusConfig,
    borrowStatusConfig,
    formatDate,
    BorrowingsTab,
    InventoryTab,
    AssignmentsTab,
    EquipmentFormModal,
    BorrowModal,
    AssignModal,
} from '../components/EquipmentBorrowing'

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
    const [systemInfoModalOpen, setSystemInfoModalOpen] = useState(false)
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

    // ── System Info (Python) ──
    const { data: systemInfo, isLoading: loadingSystemInfo } = useQuery<SystemInfo>(
        ['equipment', 'system-info'],
        () => equipmentService.getSystemInfo(),
        { enabled: systemInfoModalOpen, staleTime: 60_000, retry: 1 }
    )

    // Helper to format system info as text for copying
    const getSystemInfoText = (info: SystemInfo) => {
        return `[ข้อมูลเครื่องเซิร์ฟเวอร์]
--- CPU ---
ชื่อ: ${info.cpu.name || '-'}
ผู้ผลิต: ${info.cpu.manufacturer || '-'}
Cores/Threads: ${info.cpu.threads || '-'}
Socket: ${info.cpu.socket || '-'}
Max Clock: ${info.cpu.base_clock || '-'}
L2/L3 Cache: ${info.cpu.l2_cache} / ${info.cpu.l3_cache}

--- Mainboard ---
ผู้ผลิต: ${info.mainboard.manufacturer || '-'}
รุ่น: ${info.mainboard.model} ${info.mainboard.version}
BIOS Vendor: ${info.mainboard.bios_vendor || '-'}
BIOS Version: ${info.mainboard.bios_version} (${info.mainboard.bios_date})

--- Memory ---
ขนาดรวม: ${info.memory.size || '-'}
ความเร็ว: ${info.memory.speed || '-'}
ผู้ผลิต: ${info.memory.manufacturer} ${info.memory.part_number}
รูปแบบ: ${info.memory.form_factor || '-'}

--- Graphics ---
ชื่อ GPU: ${info.graphics.name || '-'}
ผู้ผลิต: ${info.graphics.manufacturer || '-'}
VRAM: ${info.graphics.vram || '-'}
Driver: ${info.graphics.driver || '-'}

--- OS & Peripherals ---
ระบบปฏิบัติการ: ${info.about.os || '-'}
ชื่อเครื่อง: ${info.about.computer_name || '-'}
หน้าจอ: ${info.devices.monitor || '-'}
พื้นที่จัดเก็บ: ${info.devices.disk || '-'}
คีย์บอร์ด: ${info.devices.keyboard || '-'}
เมาส์: ${info.devices.mouse || '-'}
พอร์ต USB: ${info.devices.usb || '-'}`
    }

    const handleCopySysInfo = async () => {
        if (!systemInfo) return
        try {
            await navigator.clipboard.writeText(getSystemInfoText(systemInfo))
            notifications.show({ title: 'คัดลอกสำเร็จ', message: 'คัดลอกข้อมูลระบบลงคลิปบอร์ดแล้ว', color: 'green', icon: <TbCheck size={18} /> })
        } catch (err) {
            notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถคัดลอกข้อมูลได้', color: 'red' })
        }
    }

    // ── Refresh ──
    const handleRefresh = () => {
        queryClient.invalidateQueries(['equipment'])
    }

    // ── Sort helpers ──
    const handleBSort = (col: string) => {
        if (bSortBy === col) {
            setBSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setBSortBy(col)
            setBSortOrder('asc')
        }
    }
    const handleESort = (col: string) => {
        if (eSortBy === col) {
            setESortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setESortBy(col)
            setESortOrder('asc')
        }
    }

    // ── Equipment Modal handlers ──
    const openAddEquipment = () => {
        setEditingEquipment(null)
        setFormName(''); setFormCategory(null); setFormBrand(''); setFormModel('')
        setFormSerial(''); setFormDesc(''); setFormStatus('available')
        setFormCpu(''); setFormRam(''); setFormStorage('')
        setFormDisplay(''); setFormGpu(''); setFormOs('')
        setFormPurchaseDate(''); setFormWarrantyDate(''); setFormPrice('')
        setEquipmentModalOpen(true)
    }
    const openEditEquipment = (eq: Equipment) => {
        setEditingEquipment(eq)
        setFormName(eq.name); setFormCategory(eq.category); setFormBrand(eq.brand || '')
        setFormModel(eq.model || ''); setFormSerial(eq.serial_number || '')
        setFormDesc(eq.description || ''); setFormStatus(eq.status)
        setFormCpu(eq.specs?.cpu || ''); setFormRam(eq.specs?.ram || '')
        setFormStorage(eq.specs?.storage || ''); setFormDisplay(eq.specs?.display || '')
        setFormGpu(eq.specs?.gpu || ''); setFormOs(eq.specs?.os || '')
        setFormPurchaseDate(eq.purchase_date || ''); setFormWarrantyDate(eq.warranty_expiry || '')
        setFormPrice(eq.purchase_price || '')
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
                name: formName, category: formCategory!, brand: formBrand || undefined,
                model: formModel || undefined, serial_number: formSerial || undefined,
                description: formDesc || undefined, status: formStatus || 'available',
                specs: {
                    cpu: formCpu || undefined, ram: formRam || undefined,
                    storage: formStorage || undefined, display: formDisplay || undefined,
                    gpu: formGpu || undefined, os: formOs || undefined,
                },
                purchase_date: formPurchaseDate || undefined,
                warranty_expiry: formWarrantyDate || undefined,
                purchase_price: formPrice ? Number(formPrice) : undefined,
            }
            if (editingEquipment) {
                await equipmentService.updateEquipment(editingEquipment.id, payload)
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
        setBorrowDateRange([null, null])
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
            notifications.show({ title: 'สำเร็จ', message: 'อนุมัติการยืมสำเร็จ', color: 'green' })
            handleRefresh()
        } catch (err: any) {
            notifications.show({ title: 'ข้อผิดพลาด', message: err?.response?.data?.message || 'เกิดข้อผิดพลาด', color: 'red' })
        }
    }
    const handleReject = async (id: string) => {
        try {
            await equipmentService.rejectBorrowing(id)
            notifications.show({ title: 'สำเร็จ', message: 'ปฏิเสธการยืมสำเร็จ', color: 'green' })
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
            } else if (deleteTarget.type === 'borrowing') {
                await equipmentService.deleteBorrowing(deleteTarget.id)
            } else if (deleteTarget.type === 'assignment') {
                await equipmentService.deleteAssignment(deleteTarget.id)
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
    const availableEquipment = (equipmentData?.equipment || []).filter((e: Equipment) => e.status === 'available')

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

    // ── Delete target helper ──
    const openDeleteConfirm = (type: 'equipment' | 'borrowing' | 'assignment', id: string, name: string) => {
        setDeleteTarget({ type, id, name })
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
                            {isAdmin && (
                                <Button
                                    variant="light" color="orange" size="sm" radius="xl"
                                    leftSection={<TbDeviceLaptop size={16} />}
                                    onClick={() => setSystemInfoModalOpen(true)}
                                >
                                    ข้อมูลเซิร์ฟเวอร์
                                </Button>
                            )}
                            <Button
                                variant="light" color="teal" size="sm" radius="xl"
                                leftSection={<TbPlus size={16} />}
                                onClick={() => openBorrowModal()}
                            >
                                ยืมอุปกรณ์
                            </Button>
                            {isAdmin && (
                                <Button
                                    variant="filled" color="teal" size="sm" radius="xl"
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

                            <Tabs.Panel value="borrowings" mt="md">
                                <BorrowingsTab
                                    borrowingsData={borrowingsData}
                                    loading={loadingBorrowings}
                                    isAdmin={isAdmin}
                                    bSearch={bSearch} setBSearch={setBSearch}
                                    bStatusFilter={bStatusFilter} setBStatusFilter={setBStatusFilter}
                                    bSortBy={bSortBy} bSortOrder={bSortOrder} handleBSort={handleBSort}
                                    bPage={bPage} setBPage={setBPage}
                                    bLimit={bLimit} setBLimit={setBLimit}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onReturn={handleReturn}
                                    onDelete={openDeleteConfirm}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="inventory" mt="md">
                                <InventoryTab
                                    equipmentData={equipmentData}
                                    loading={loadingEquipment}
                                    isAdmin={isAdmin}
                                    eSearch={eSearch} setESearch={setESearch}
                                    eCategoryFilter={eCategoryFilter} setECategoryFilter={setECategoryFilter}
                                    eStatusFilter={eStatusFilter} setEStatusFilter={setEStatusFilter}
                                    eSortBy={eSortBy} eSortOrder={eSortOrder} handleESort={handleESort}
                                    ePage={ePage} setEPage={setEPage}
                                    eLimit={eLimit} setELimit={setELimit}
                                    onBorrow={openBorrowModal}
                                    onEdit={openEditEquipment}
                                    onDelete={openDeleteConfirm}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="assignments" mt="md">
                                <AssignmentsTab
                                    assignmentsData={assignmentsData}
                                    loading={loadingAssignments}
                                    isAdmin={isAdmin}
                                    aSearch={aSearch} setASearch={setASearch}
                                    aPage={aPage} setAPage={setAPage}
                                    onOpenAssignModal={openAssignModal}
                                    onReturnAssignment={handleReturnAssignment}
                                    onDeleteAssignment={openDeleteConfirm}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Card>
                </Stack>
            </Container>

            {/* ══════════ Modals ══════════ */}
            <EquipmentFormModal
                opened={equipmentModalOpen}
                onClose={() => setEquipmentModalOpen(false)}
                editingEquipment={editingEquipment}
                saving={saving}
                onSave={handleSaveEquipment}
                formName={formName} setFormName={setFormName}
                formCategory={formCategory} setFormCategory={setFormCategory}
                formBrand={formBrand} setFormBrand={setFormBrand}
                formModel={formModel} setFormModel={setFormModel}
                formSerial={formSerial} setFormSerial={setFormSerial}
                formStatus={formStatus} setFormStatus={setFormStatus}
                formCpu={formCpu} setFormCpu={setFormCpu}
                formRam={formRam} setFormRam={setFormRam}
                formStorage={formStorage} setFormStorage={setFormStorage}
                formDisplay={formDisplay} setFormDisplay={setFormDisplay}
                formGpu={formGpu} setFormGpu={setFormGpu}
                formOs={formOs} setFormOs={setFormOs}
                formPurchaseDate={formPurchaseDate} setFormPurchaseDate={setFormPurchaseDate}
                formWarrantyDate={formWarrantyDate} setFormWarrantyDate={setFormWarrantyDate}
                formPrice={formPrice} setFormPrice={setFormPrice}
                formDesc={formDesc} setFormDesc={setFormDesc}
            />

            <BorrowModal
                opened={borrowModalOpen}
                onClose={() => setBorrowModalOpen(false)}
                saving={saving}
                onSubmit={handleCreateBorrowing}
                borrowEquipmentId={borrowEquipmentId} setBorrowEquipmentId={setBorrowEquipmentId}
                borrowDateRange={borrowDateRange} setBorrowDateRange={setBorrowDateRange}
                borrowPurpose={borrowPurpose} setBorrowPurpose={setBorrowPurpose}
                availableEquipment={availableEquipment}
            />

            <AssignModal
                opened={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                saving={saving}
                onSubmit={handleCreateAssignment}
                assignEmployeeId={assignEmployeeId} setAssignEmployeeId={setAssignEmployeeId}
                assignEquipmentId={assignEquipmentId} setAssignEquipmentId={setAssignEquipmentId}
                assignNotes={assignNotes} setAssignNotes={setAssignNotes}
                employees={employees || []}
                availableEquipment={availableEquipment}
            />

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

            {/* ══════════ Modal: System Server Info ══════════ */}
            <Modal
                opened={systemInfoModalOpen}
                onClose={() => setSystemInfoModalOpen(false)}
                title={
                    <Group gap="xs">
                        <TbDeviceLaptop size={20} color="var(--mantine-color-blue-6)" />
                        <Text fw={600}>ข้อมูลเครื่องเซิร์ฟเวอร์ (Hardware Config)</Text>
                    </Group>
                }
                size="xl"
                centered
            >
                {loadingSystemInfo ? (
                    <Stack align="center" py="xl">
                        <Skeleton height={200} width="100%" radius="md" />
                        <Text c="dimmed">กำลังโหลดข้อมูลระบบ...</Text>
                    </Stack>
                ) : systemInfo ? (
                    <Tabs defaultValue="cpu" variant="outline">
                        <Tabs.List>
                            <Tabs.Tab value="cpu">CPU</Tabs.Tab>
                            <Tabs.Tab value="mainboard">Mainboard</Tabs.Tab>
                            <Tabs.Tab value="memory">Memory</Tabs.Tab>
                            <Tabs.Tab value="graphics">Graphics</Tabs.Tab>
                            <Tabs.Tab value="about">OS & Peripherals</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="cpu" pt="xs">
                            <SimpleGrid cols={2} spacing="md">
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Name</Text>
                                    <Text fw={500}>{systemInfo.cpu.name || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Manufacturer</Text>
                                    <Text fw={500}>{systemInfo.cpu.manufacturer || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Cores / Threads</Text>
                                    <Text fw={500}>{systemInfo.cpu.threads || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Socket</Text>
                                    <Text fw={500}>{systemInfo.cpu.socket || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Max Clock</Text>
                                    <Text fw={500}>{systemInfo.cpu.base_clock || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>L2 / L3 Cache</Text>
                                    <Text fw={500}>{systemInfo.cpu.l2_cache} / {systemInfo.cpu.l3_cache}</Text>
                                </Card>
                            </SimpleGrid>
                        </Tabs.Panel>

                        <Tabs.Panel value="mainboard" pt="xs">
                            <SimpleGrid cols={2} spacing="md">
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Motherboard Manufacturer</Text>
                                    <Text fw={500}>{systemInfo.mainboard.manufacturer || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Model & Version</Text>
                                    <Text fw={500}>{systemInfo.mainboard.model} {systemInfo.mainboard.version}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>BIOS Vendor</Text>
                                    <Text fw={500}>{systemInfo.mainboard.bios_vendor || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>BIOS Version & Date</Text>
                                    <Text fw={500}>{systemInfo.mainboard.bios_version} ({systemInfo.mainboard.bios_date})</Text>
                                </Card>
                            </SimpleGrid>
                        </Tabs.Panel>

                        <Tabs.Panel value="memory" pt="xs">
                            <SimpleGrid cols={2} spacing="md">
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Total Size</Text>
                                    <Text fw={500}>{systemInfo.memory.size || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Speed</Text>
                                    <Text fw={500}>{systemInfo.memory.speed || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Manufacturer & Part</Text>
                                    <Text fw={500}>{systemInfo.memory.manufacturer} {systemInfo.memory.part_number}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Form Factor</Text>
                                    <Text fw={500}>{systemInfo.memory.form_factor || '-'}</Text>
                                </Card>
                            </SimpleGrid>
                        </Tabs.Panel>

                        <Tabs.Panel value="graphics" pt="xs">
                            <SimpleGrid cols={2} spacing="md">
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>GPU Name</Text>
                                    <Text fw={500}>{systemInfo.graphics.name || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Manufacturer</Text>
                                    <Text fw={500}>{systemInfo.graphics.manufacturer || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>VRAM</Text>
                                    <Text fw={500}>{systemInfo.graphics.vram || '-'}</Text>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Text size="sm" c="dimmed" fw={500}>Driver Version</Text>
                                    <Text fw={500}>{systemInfo.graphics.driver || '-'}</Text>
                                </Card>
                            </SimpleGrid>
                        </Tabs.Panel>

                        <Tabs.Panel value="about" pt="xs">
                            <Stack gap="sm">
                                <Card withBorder shadow="sm" radius="md">
                                    <Group grow>
                                        <div>
                                            <Text size="sm" c="dimmed" fw={500}>OS Version</Text>
                                            <Text fw={500}>{systemInfo.about.os || '-'}</Text>
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed" fw={500}>Computer Name</Text>
                                            <Text fw={500}>{systemInfo.about.computer_name || '-'}</Text>
                                        </div>
                                    </Group>
                                </Card>
                                <Card withBorder shadow="sm" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" c="dimmed" fw={500} mb={4}>Peripherals</Text>
                                        <Group align="flex-start" mb="xs">
                                            <Text w={100} size="sm" fw={600}>Monitor:</Text>
                                            <Text size="sm" style={{ flex: 1 }}>{systemInfo.devices.monitor || '-'}</Text>
                                        </Group>
                                        <Group align="flex-start" mb="xs">
                                            <Text w={100} size="sm" fw={600}>Storage (Disk):</Text>
                                            <Text size="sm" style={{ flex: 1 }}>{systemInfo.devices.disk || '-'}</Text>
                                        </Group>
                                        <Group align="flex-start" mb="xs">
                                            <Text w={100} size="sm" fw={600}>Keyboard:</Text>
                                            <Text size="sm" style={{ flex: 1 }}>{systemInfo.devices.keyboard || '-'}</Text>
                                        </Group>
                                        <Group align="flex-start" mb="xs">
                                            <Text w={100} size="sm" fw={600}>Mouse:</Text>
                                            <Text size="sm" style={{ flex: 1 }}>{systemInfo.devices.mouse || '-'}</Text>
                                        </Group>
                                        <Group align="flex-start">
                                            <Text w={100} size="sm" fw={600}>USB Devices:</Text>
                                            <Text size="sm" style={{ flex: 1 }}>{systemInfo.devices.usb || '-'}</Text>
                                        </Group>
                                    </Stack>
                                </Card>
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                ) : (
                    <Text ta="center" c="red" py="xl">ไม่สามารถโหลดข้อมูลระบบได้</Text>
                )}
                <Group justify="flex-end" mt="lg">
                    {systemInfo && (
                        <Button
                            variant="light"
                            color="orange"
                            leftSection={<TbCopy size={16} />}
                            onClick={handleCopySysInfo}
                        >
                            คัดลอกเป็นข้อความ
                        </Button>
                    )}
                    <Button onClick={() => setSystemInfoModalOpen(false)}>ปิด</Button>
                </Group>
            </Modal>
        </>
    )
}
