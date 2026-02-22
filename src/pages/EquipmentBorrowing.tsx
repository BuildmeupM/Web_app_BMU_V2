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
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import {
    equipmentService,
    type Equipment,
    type EquipmentBorrowing as EquipmentBorrowingType,
    type EquipmentStats,
    type EquipmentAssignment,
    type EmployeeOption,
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
        </>
    )
}
