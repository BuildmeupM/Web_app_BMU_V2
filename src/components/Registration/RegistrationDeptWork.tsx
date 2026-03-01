/**
 * RegistrationDeptWork — Shared Component
 * ใช้ร่วมกันสำหรับหน้า DBD, RD, SSO, HR
 * แต่ละหน้าจะส่ง config (department, title, icon, gradient) เข้ามา
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
    Container, Title, Stack, Card, Group, Text, Badge, Box, TextInput,
    Button, Table, ActionIcon, Modal, Select, Textarea, Tooltip,
    Center, Alert, ScrollArea, Pagination, SimpleGrid,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { DatePickerInput } from '@mantine/dates'
import {
    TbPlus, TbEdit, TbTrash, TbSearch, TbCalendar,
    TbAlertCircle, TbDeviceFloppy, TbFilter, TbUserPlus, TbUser, TbClipboard,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    registrationClientService,
    type RegistrationClient,
    type RegistrationClientCreateData,
} from '../../services/registrationClientService'
import usersService, { type User } from '../../services/usersService'
import { getWorkTypes, type WorkType, type Department } from '../../services/registrationWorkService'
import { registrationTaskService, type RegistrationTask } from '../../services/registrationTaskService'
import { notifications } from '@mantine/notifications'
import TaskDetailDrawer from './TaskDetailDrawer'

// ========== Types ==========
export interface DeptTask {
    id: string
    received_date: string
    client_id: string
    client_name: string
    job_type: string
    job_type_sub: string
    responsible_id: string
    responsible_name: string
    status: 'pending' | 'in_progress' | 'completed'
    notes: string
    created_at: string
}

export interface DeptConfig {
    /** department key ใช้ filter work types จาก API เช่น 'dbd', 'rd', 'sso', 'hr' */
    department: Department
    /** ชื่อหน้า เช่น 'กรมพัฒนาธุรกิจการค้า (DBD)' */
    title: string
    /** คำอธิบายย่อย */
    subtitle: string
    /** React icon component */
    icon: React.ComponentType<{ size?: number; color?: string }>
    /** Gradient สำหรับ header card */
    gradient: string
    /** สี header ของตาราง */
    tableHeaderColor: string
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'in_progress', label: 'กำลังดำเนินการ' },
    { value: 'completed', label: 'เสร็จสิ้น' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'รอดำเนินการ', color: 'yellow' },
    in_progress: { label: 'กำลังดำเนินการ', color: 'orange' },
    completed: { label: 'เสร็จสิ้น', color: 'green' },
}

// ========== Add Client Modal (inline) ==========
interface AddClientModalProps {
    opened: boolean
    onClose: () => void
    onCreated: (client: RegistrationClient) => void
    existingGroups: string[]
}

function AddClientModal({ opened, onClose, onCreated }: AddClientModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<RegistrationClientCreateData>({
        company_name: '',
        legal_entity_number: '',
        phone: '',
        group_name: '',
        line_api: '',
        notes: '',
    })

    useEffect(() => {
        if (opened) {
            setFormData({
                company_name: '',
                legal_entity_number: '',
                phone: '',
                group_name: '',
                line_api: '',
                notes: '',
            })
        }
    }, [opened])

    const createMutation = useMutation(
        (data: RegistrationClientCreateData) => registrationClientService.create(data),
        {
            onSuccess: (newClient) => {
                queryClient.invalidateQueries('registration-clients')
                notifications.show({
                    title: 'สำเร็จ',
                    message: `เพิ่มลูกค้า "${newClient.company_name}" เรียบร้อย`,
                    color: 'green',
                })
                onCreated(newClient)
                onClose()
            },
            onError: () => {
                notifications.show({
                    title: 'ผิดพลาด',
                    message: 'ไม่สามารถเพิ่มลูกค้าได้',
                    color: 'red',
                })
            },
        }
    )

    const handleSubmit = () => {
        if (!formData.company_name.trim()) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณากรอกชื่อลูกค้า', color: 'orange' })
            return
        }
        if (!formData.group_name.trim()) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณากรอกชื่อแชทไลน์', color: 'orange' })
            return
        }
        createMutation.mutate(formData)
    }

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700}>เพิ่มลูกค้าใหม่</Text>} size="md" centered>
            <Stack gap="sm">
                <TextInput
                    label="ชื่อลูกค้า / บริษัท"
                    placeholder="กรอกชื่อลูกค้า"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                />
                <TextInput
                    label="เลขนิติบุคคล"
                    placeholder="กรอกเลขนิติบุคคล (ถ้ามี)"
                    value={formData.legal_entity_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, legal_entity_number: e.target.value }))}
                />
                <TextInput
                    label="เบอร์โทร"
                    placeholder="กรอกเบอร์โทร"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <TextInput
                    label="ชื่อแชทไลน์"
                    placeholder="พิมพ์ชื่อแชทไลน์"
                    value={formData.group_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, group_name: e.target.value }))}
                    required
                />
                <Group justify="flex-end" mt="sm">
                    <Button variant="light" color="gray" onClick={onClose}>ยกเลิก</Button>
                    <Button
                        color="teal"
                        onClick={handleSubmit}
                        loading={createMutation.isLoading}
                        leftSection={<TbDeviceFloppy size={16} />}
                    >
                        บันทึก
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

// ========== Task Form Modal ==========
interface TaskFormModalProps {
    opened: boolean
    onClose: () => void
    editingTask: DeptTask | null
    clients: RegistrationClient[]
    clientGroups: string[]
    workTypes: WorkType[]
    users: User[]
    onSave: (task: Omit<DeptTask, 'id' | 'created_at'>) => void
    deptTitle: string
}

function TaskFormModal({ opened, onClose, editingTask, clients, clientGroups, workTypes, users, onSave, deptTitle }: TaskFormModalProps) {
    const isEditing = !!editingTask

    const [receivedDate, setReceivedDate] = useState<Date | null>(null)
    const [clientId, setClientId] = useState<string | null>(null)
    const [workTypeId, setWorkTypeId] = useState<string | null>(null)
    const [subTypeId, setSubTypeId] = useState<string | null>(null)
    const [responsibleId, setResponsibleId] = useState<string | null>(null)
    const [status, setStatus] = useState<string>('pending')
    const [notes, setNotes] = useState('')

    // Add client modal
    const [addClientOpened, { open: openAddClient, close: closeAddClient }] = useDisclosure(false)

    // Main clients search (debounced — from /api/clients/dropdown)
    const [mainClients, setMainClients] = useState<{ build: string; company_name: string }[]>([])
    const [mainClientSearching, setMainClientSearching] = useState(false)
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const selectedMainClientRef = useRef<{ value: string; label: string } | null>(null)

    const handleClientSearch = useCallback((query: string) => {
        // Clear previous timer
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

        if (!query || query.trim().length < 2) {
            setMainClients([])
            setMainClientSearching(false)
            return
        }

        setMainClientSearching(true)
        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await registrationClientService.searchMainClients(query)
                setMainClients(results)
            } catch {
                setMainClients([])
            } finally {
                setMainClientSearching(false)
            }
        }, 300) // 300ms debounce
    }, [])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        }
    }, [])

    useEffect(() => {
        if (opened && editingTask) {
            setReceivedDate(new Date(editingTask.received_date))
            setClientId(editingTask.client_id)
            setWorkTypeId(editingTask.job_type)
            setSubTypeId(editingTask.job_type_sub || null)
            setResponsibleId(editingTask.responsible_id)
            setStatus(editingTask.status)
            setNotes(editingTask.notes)
        } else if (opened) {
            setReceivedDate(new Date())
            setClientId(null)
            setWorkTypeId(null)
            setSubTypeId(null)
            setResponsibleId(null)
            setStatus('pending')
            setNotes('')
            setMainClients([])
            selectedMainClientRef.current = null
        }
    }, [opened, editingTask])

    // Track selected main client so it persists in options
    const handleClientChange = useCallback((val: string | null) => {
        setClientId(val)
        if (val && val.startsWith('main::')) {
            const buildCode = val.replace('main::', '')
            const mc = mainClients.find(c => c.build === buildCode)
            if (mc) {
                selectedMainClientRef.current = {
                    value: val,
                    label: `${mc.build} - ${mc.company_name}`,
                }
            }
        } else {
            selectedMainClientRef.current = null
        }
    }, [mainClients])

    // Client select data — merge registration clients + main clients
    const clientOptions = useMemo(() => {
        const regItems = (clients || []).filter(c => c.is_active).map(c => ({
            value: c.id,
            label: c.company_name,
        }))

        // Deduplicate: exclude main clients that already exist in registration clients
        const regNames = new Set(regItems.map(o => o.label.toLowerCase()))
        const mainItems = mainClients
            .filter(mc => !regNames.has(mc.company_name.toLowerCase()))
            .map(mc => ({
                value: `main::${mc.build}`,
                label: `${mc.build} - ${mc.company_name}`,
            }))

        // Always include the currently selected main client
        const sel = selectedMainClientRef.current
        if (sel && !mainItems.find(i => i.value === sel.value)) {
            mainItems.unshift(sel)
        }

        const groups: { group: string; items: { value: string; label: string }[] }[] = []
        if (regItems.length > 0) {
            groups.push({ group: 'ลูกค้าทะเบียน', items: regItems })
        }
        if (mainItems.length > 0) {
            groups.push({ group: 'ข้อมูลลูกค้า (ระบบหลัก)', items: mainItems })
        }

        return groups
    }, [clients, mainClients])

    // Work type options (main types from settings API)
    const workTypeOptions = useMemo(() => {
        if (!workTypes || !Array.isArray(workTypes)) return []
        return workTypes.filter(wt => wt.is_active).map(wt => ({
            value: wt.id,
            label: wt.name,
        }))
    }, [workTypes])

    // Sub-type options (filtered by selected work type)
    const selectedWorkType = useMemo(() => {
        if (!workTypeId || !workTypes || !Array.isArray(workTypes)) return null
        return workTypes.find(wt => wt.id === workTypeId) || null
    }, [workTypeId, workTypes])

    const subTypeOptions = useMemo(() => {
        if (!selectedWorkType) return []
        const subs = Array.isArray(selectedWorkType.sub_types) ? selectedWorkType.sub_types : []
        return subs.filter(st => st.is_active).map(st => ({
            value: st.id,
            label: st.name,
        }))
    }, [selectedWorkType])

    const hasSubTypes = subTypeOptions.length > 0

    // User (registration role) select data
    const userOptions = useMemo(() =>
        (users || []).filter(u => u.status === 'active').map(u => ({
            value: u.id,
            label: u.name,
        })),
        [users]
    )

    const handleSubmit = () => {
        if (!receivedDate) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณาเลือกวันที่รับงาน', color: 'orange' })
            return
        }
        if (!clientId) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณาเลือกลูกค้า', color: 'orange' })
            return
        }
        if (!workTypeId) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณาเลือกประเภทงาน', color: 'orange' })
            return
        }
        if (hasSubTypes && !subTypeId) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณาเลือกรายการย่อย', color: 'orange' })
            return
        }
        if (!responsibleId) {
            notifications.show({ title: 'กรุณากรอก', message: 'กรุณาเลือกผู้รับผิดชอบ', color: 'orange' })
            return
        }

        // Resolve client name — handle both registration clients and main clients
        let resolvedClientId = clientId
        let resolvedClientName = ''

        if (clientId.startsWith('main::')) {
            // Main client selected — extract build code
            const buildCode = clientId.replace('main::', '')
            const mainClient = mainClients.find(mc => mc.build === buildCode)
            resolvedClientId = buildCode
            resolvedClientName = mainClient?.company_name || buildCode
        } else {
            const selectedClient = clients.find(c => c.id === clientId)
            resolvedClientName = selectedClient?.company_name || ''
        }

        const selectedUser = users.find(u => u.id === responsibleId)

        onSave({
            received_date: receivedDate.toISOString().split('T')[0],
            client_id: resolvedClientId,
            client_name: resolvedClientName,
            job_type: workTypeId,
            job_type_sub: subTypeId || '',
            responsible_id: responsibleId,
            responsible_name: selectedUser?.name || '',
            status: status as DeptTask['status'],
            notes,
        })

        onClose()
    }

    const handleClientCreated = (newClient: RegistrationClient) => {
        setClientId(newClient.id)
    }

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={<Text fw={700}>{isEditing ? `แก้ไขงาน` : `เพิ่มงาน ${deptTitle}`}</Text>}
                size="lg"
                centered
            >
                <Stack gap="md">
                    {/* วันที่รับงาน */}
                    <DatePickerInput
                        label="วันที่รับงาน"
                        placeholder="เลือกวันที่"
                        value={receivedDate}
                        onChange={setReceivedDate}
                        required
                        leftSection={<TbCalendar size={16} />}
                        valueFormat="DD/MM/YYYY"
                    />

                    {/* ชื่อลูกค้า */}
                    <Box>
                        <Group justify="space-between" mb={4}>
                            <Text size="sm" fw={500}>ชื่อลูกค้า <Text component="span" c="red">*</Text></Text>
                            <Button
                                variant="subtle"
                                size="compact-xs"
                                color="teal"
                                leftSection={<TbUserPlus size={14} />}
                                onClick={openAddClient}
                            >
                                เพิ่มลูกค้าใหม่
                            </Button>
                        </Group>
                        <Select
                            placeholder="ค้นหาชื่อลูกค้า... (พิมพ์ 2 ตัวอักษรขึ้นไป)"
                            data={clientOptions}
                            value={clientId}
                            onChange={handleClientChange}
                            searchable
                            onSearchChange={handleClientSearch}
                            nothingFoundMessage={mainClientSearching ? 'กำลังค้นหา...' : "ไม่พบลูกค้า — กดปุ่ม 'เพิ่มลูกค้าใหม่' ด้านบน"}
                            clearable
                            filter={({ options }) => options}
                        />
                    </Box>

                    <Select
                        label="ประเภทงาน"
                        placeholder="เลือกประเภทงาน"
                        data={workTypeOptions}
                        value={workTypeId}
                        onChange={(val) => {
                            setWorkTypeId(val)
                            setSubTypeId(null)
                        }}
                        required
                        searchable
                    />

                    {/* รายการย่อย — แสดงเมื่อประเภทงานที่เลือกมีรายการย่อย */}
                    {hasSubTypes && (
                        <Select
                            label="รายการย่อย"
                            placeholder="เลือกรายการย่อย"
                            data={subTypeOptions}
                            value={subTypeId}
                            onChange={setSubTypeId}
                            required
                            searchable
                        />
                    )}

                    {/* ผู้รับผิดชอบ */}
                    <Select
                        label="ผู้รับผิดชอบ"
                        placeholder="ค้นหาชื่อพนักงาน..."
                        data={userOptions}
                        value={responsibleId}
                        onChange={setResponsibleId}
                        required
                        searchable
                        nothingFoundMessage="ไม่พบพนักงาน"
                    />

                    {/* สถานะ (เฉพาะตอนแก้ไข) */}
                    {isEditing && (
                        <Select
                            label="สถานะ"
                            data={STATUS_OPTIONS}
                            value={status}
                            onChange={(val) => setStatus(val || 'pending')}
                        />
                    )}

                    {/* หมายเหตุ */}
                    <Textarea
                        label="หมายเหตุ"
                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                        minRows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    {/* Actions */}
                    <Group justify="flex-end" mt="sm">
                        <Button variant="light" color="gray" onClick={onClose}>ยกเลิก</Button>
                        <Button
                            color="teal"
                            onClick={handleSubmit}
                            leftSection={<TbDeviceFloppy size={16} />}
                        >
                            {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มงาน'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Nested: Add Client Modal */}
            <AddClientModal
                opened={addClientOpened}
                onClose={closeAddClient}
                onCreated={handleClientCreated}
                existingGroups={clientGroups}
            />
        </>
    )
}

// ========== Main Shared Page Component ==========
export default function RegistrationDeptWork({ config }: { config: DeptConfig }) {
    const { department, title, subtitle, icon: Icon, gradient, tableHeaderColor } = config

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false)
    const [editingTask, setEditingTask] = useState<DeptTask | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState<string>('10')
    const queryClient = useQueryClient()
    const [statusModalOpened, { open: openStatusModal, close: closeStatusModal }] = useDisclosure(false)
    const [selectedTask, setSelectedTask] = useState<RegistrationTask | null>(null)
    // Capture ?task= param once on mount for deep-link auto-open
    const pendingTaskIdRef = useRef<string | null>(
        new URLSearchParams(window.location.search).get('task')
    )

    // Fetch tasks from API
    const { data: taskData } = useQuery(
        `registration-tasks-${department}`,
        () => registrationTaskService.getByDepartment(department),
    )
    const taskDataSafe = useMemo(() => (taskData?.tasks || []) as DeptTask[], [taskData])
    const tasks: DeptTask[] = taskDataSafe

    // Auto-open task detail from ?task=taskId (e.g. from payment detail modal)
    useEffect(() => {
        if (pendingTaskIdRef.current && tasks.length > 0) {
            const taskId = pendingTaskIdRef.current
            pendingTaskIdRef.current = null // Only trigger once
            const target = tasks.find(t => t.id === taskId)
            if (target) {
                setSelectedTask(target as unknown as RegistrationTask)
                openStatusModal()
            }
            // Clean URL without re-render
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [tasks, openStatusModal])

    // Fetch real clients
    const { data: clientData } = useQuery(
        'registration-clients',
        () => registrationClientService.getAll()
    )
    const clientDataSafe = useMemo(() => clientData?.clients || [], [clientData])
    const clients = clientDataSafe
    const clientGroups = clientData?.groups || []

    // Find selected client for drawer
    const selectedClient = useMemo(() => {
        if (!selectedTask) return null
        return clients.find(c => c.id === selectedTask.client_id) || null
    }, [selectedTask, clients])

    // Fetch work types from settings (filtered by department)
    const { data: deptWorkTypes = [] } = useQuery(
        `registration-work-types-${department}`,
        () => getWorkTypes(department)
    )

    // Fetch users with registration role
    const { data: userData } = useQuery(
        'users-registration-role',
        () => usersService.getList({ role: 'registration', status: 'active' })
    )
    const userDataSafe = useMemo(() => userData?.data || [], [userData])
    const users = userDataSafe

    // Filter tasks
    const filteredTasks = useMemo(() => {
        let result = tasks
        if (search) {
            const s = search.toLowerCase()
            result = result.filter(t =>
                t.client_name.toLowerCase().includes(s) ||
                t.responsible_name.toLowerCase().includes(s) ||
                t.notes.toLowerCase().includes(s)
            )
        }
        if (statusFilter) {
            result = result.filter(t => t.status === statusFilter)
        }
        return result
    }, [tasks, search, statusFilter])

    // Pagination
    const paginatedTasks = useMemo(() => {
        const start = (page - 1) * Number(perPage)
        return filteredTasks.slice(start, start + Number(perPage))
    }, [filteredTasks, page, perPage])

    const totalPages = Math.ceil(filteredTasks.length / Number(perPage))

    // Handlers
    const handleAdd = () => {
        setEditingTask(null)
        openFormModal()
    }

    const handleEdit = (task: DeptTask) => {
        setEditingTask(task)
        openFormModal()
    }

    // === Mutations ===
    const createMutation = useMutation(
        (data: Omit<DeptTask, 'id' | 'created_at'>) =>
            registrationTaskService.create({ ...data, department }),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`registration-tasks-${department}`)
                queryClient.invalidateQueries(`registration-tasks-master`)
                notifications.show({ title: 'สำเร็จ', message: 'เพิ่มงานเรียบร้อย', color: 'green' })
                closeFormModal()
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถเพิ่มงานได้', color: 'red' })
            },
        }
    )

    const updateMutation = useMutation(
        ({ id, data }: { id: string; data: Partial<Omit<DeptTask, 'id' | 'created_at'>> }) =>
            registrationTaskService.update(id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`registration-tasks-${department}`)
                queryClient.invalidateQueries(`registration-tasks-master`)
                notifications.show({ title: 'สำเร็จ', message: 'แก้ไขงานเรียบร้อย', color: 'green' })
                setEditingTask(null)
                closeFormModal()
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถแก้ไขงานได้', color: 'red' })
            },
        }
    )

    const deleteMutation = useMutation(
        (id: string) => registrationTaskService.delete(id),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`registration-tasks-${department}`)
                notifications.show({ title: 'ลบแล้ว', message: 'ลบงานเรียบร้อย', color: 'red' })
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถลบงานได้', color: 'red' })
            },
        }
    )

    const handleSave = (taskData: Omit<DeptTask, 'id' | 'created_at'>) => {
        if (editingTask) {
            updateMutation.mutate({ id: editingTask.id, data: taskData })
        } else {
            createMutation.mutate(taskData)
        }
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id)
        setDeleteConfirmId(null)
    }

    const getJobTypeLabel = (task: DeptTask | Record<string, string>) => {
        return (task as Record<string, string>).job_type_name || task.job_type || '-'
    }

    const getSubTypeLabel = (task: DeptTask | Record<string, string>) => {
        if (!task.job_type_sub) return '-'
        return (task as Record<string, string>).job_type_sub_name || task.job_type_sub
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    // Stats
    const stats = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    }), [tasks])

    // Per-person summary (uses users from API when no tasks yet)
    const personStats = useMemo(() => {
        const map = new Map<string, { name: string; total: number; completed: number; in_progress: number; pending: number }>()
        // Seed with all active users so they appear even with 0 tasks
        for (const u of (users || [])) {
            if (u.status === 'active') {
                map.set(u.id, { name: u.name, total: 0, completed: 0, in_progress: 0, pending: 0 })
            }
        }
        for (const t of tasks) {
            const key = t.responsible_id
            if (!map.has(key)) {
                map.set(key, { name: t.responsible_name, total: 0, completed: 0, in_progress: 0, pending: 0 })
            }
            const entry = map.get(key)!
            entry.total++
            if (t.status === 'completed') entry.completed++
            else if (t.status === 'in_progress') entry.in_progress++
            else entry.pending++
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total)
    }, [tasks, users])

    // Per-job-type summary
    const jobTypeStats = useMemo(() => {
        const map = new Map<string, { label: string; total: number; completed: number; in_progress: number; pending: number }>()
        for (const t of tasks) {
            const key = t.job_type || 'unknown'
            const label = getJobTypeLabel(t)
            if (!map.has(key)) {
                map.set(key, { label, total: 0, completed: 0, in_progress: 0, pending: 0 })
            }
            const entry = map.get(key)!
            entry.total++
            if (t.status === 'completed') entry.completed++
            else if (t.status === 'in_progress') entry.in_progress++
            else entry.pending++
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total)
    }, [tasks])

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header */}
                <Card
                    withBorder radius="xl" p="lg"
                    style={{ background: gradient, border: 'none' }}
                >
                    <Group gap="md">
                        <Box style={{
                            width: 56, height: 56, borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Icon size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>{title}</Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                {subtitle}
                            </Text>
                        </div>
                        <Box style={{ flex: 1 }} />
                        <Group gap="xs">
                            <Badge size="lg" variant="light" color="white" style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                {stats.total} งาน
                            </Badge>
                        </Group>
                    </Group>
                </Card>

                {/* Per-person Summary */}
                {personStats.length > 0 && (
                    <Card withBorder radius="lg" p="md" style={{ overflow: 'hidden' }}>
                        <Group gap="xs" mb="md">
                            <Box style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TbUser size={15} color="white" />
                            </Box>
                            <div>
                                <Text size="sm" fw={700}>สรุปงานตามผู้รับผิดชอบ</Text>
                                <Text size="xs" c="dimmed">ภาพรวมงานของพนักงานแต่ละคน</Text>
                            </div>
                        </Group>
                        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 3 }} spacing="sm">
                            {personStats.map((p, i) => {
                                const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
                                const avatarColors = ['#1976d2', '#e65100', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#4527a0', '#ad1457']
                                const avatarColor = avatarColors[i % avatarColors.length]
                                const initials = p.name.charAt(0).toUpperCase()
                                return (
                                    <Card
                                        key={p.name}
                                        withBorder
                                        radius="lg"
                                        p={0}
                                        style={{
                                            overflow: 'hidden',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(-3px)'
                                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                    >
                                        {/* Gradient accent top bar */}
                                        <Box style={{
                                            height: 6,
                                            background: `linear-gradient(90deg, ${avatarColor}, ${avatarColor}99)`,
                                        }} />

                                        <Box p="md">
                                            {/* Avatar + Name + Progress Ring */}
                                            <Group gap="sm" wrap="nowrap" mb="md">
                                                <Box style={{
                                                    width: 48, height: 48, borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                    boxShadow: `0 3px 12px ${avatarColor}40`,
                                                }}>
                                                    <Text size="lg" fw={700} c="white">{initials}</Text>
                                                </Box>
                                                <Box style={{ flex: 1, minWidth: 0 }}>
                                                    <Text size="sm" fw={700} truncate>{p.name}</Text>
                                                    <Text size="xs" c="dimmed">{p.total} งานทั้งหมด</Text>
                                                </Box>
                                                {/* Progress Ring */}
                                                <Box style={{
                                                    width: 52, height: 52,
                                                    position: 'relative',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                                                        <circle cx="26" cy="26" r="22" fill="none" stroke="#f1f3f5" strokeWidth="5" />
                                                        <circle
                                                            cx="26" cy="26" r="22" fill="none"
                                                            stroke={pct === 100 ? '#40c057' : pct >= 50 ? '#228be6' : '#fd7e14'}
                                                            strokeWidth="5"
                                                            strokeDasharray={`${(pct / 100) * 138.23} 138.23`}
                                                            strokeLinecap="round"
                                                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                                        />
                                                    </svg>
                                                    <Text
                                                        size="xs" fw={800}
                                                        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                                        c={pct === 100 ? 'green' : pct >= 50 ? 'blue' : 'orange'}
                                                    >
                                                        {pct}%
                                                    </Text>
                                                </Box>
                                            </Group>

                                            {/* Mini stat bars */}
                                            <Stack gap={6}>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>เสร็จแล้ว</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: p.total > 0 ? `${(p.completed / p.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #40c057, #69db7c)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="green" style={{ width: 20, textAlign: 'right' }}>{p.completed}</Text>
                                                </Group>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>กำลังทำ</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: p.total > 0 ? `${(p.in_progress / p.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #fd7e14, #ffa94d)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="orange" style={{ width: 20, textAlign: 'right' }}>{p.in_progress}</Text>
                                                </Group>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>รอดำเนิน</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: p.total > 0 ? `${(p.pending / p.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #fab005, #ffd43b)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="yellow.7" style={{ width: 20, textAlign: 'right' }}>{p.pending}</Text>
                                                </Group>
                                            </Stack>
                                        </Box>
                                    </Card>
                                )
                            })}
                        </SimpleGrid>
                    </Card>
                )}

                {/* Per-job-type Summary */}
                {jobTypeStats.length > 0 && (
                    <Card withBorder radius="lg" p="md" style={{ overflow: 'hidden' }}>
                        <Group gap="xs" mb="md">
                            <Box style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TbClipboard size={15} color="white" />
                            </Box>
                            <div>
                                <Text size="sm" fw={700}>สรุปงานตามประเภทงาน</Text>
                                <Text size="xs" c="dimmed">ภาพรวมจำนวนงานแยกตามประเภท</Text>
                            </div>
                        </Group>
                        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="sm">
                            {jobTypeStats.map((jt, i) => {
                                const pct = jt.total > 0 ? Math.round((jt.completed / jt.total) * 100) : 0
                                const barColors = ['#6a1b9a', '#e65100', '#1565c0', '#2e7d32', '#c62828', '#00838f', '#4527a0', '#ad1457']
                                const barColor = barColors[i % barColors.length]
                                const iconEmojis = ['📝', '📊', '📁', '📋', '🔧', '📦', '🏢', '📄']
                                const iconEmoji = iconEmojis[i % iconEmojis.length]
                                return (
                                    <Card
                                        key={jt.label}
                                        withBorder
                                        radius="lg"
                                        p={0}
                                        style={{
                                            overflow: 'hidden',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(-3px)'
                                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                    >
                                        {/* Gradient accent top bar */}
                                        <Box style={{
                                            height: 6,
                                            background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`,
                                        }} />

                                        <Box p="md">
                                            {/* Icon + Label + Progress Ring */}
                                            <Group gap="sm" wrap="nowrap" mb="md">
                                                <Box style={{
                                                    width: 42, height: 42, borderRadius: 12,
                                                    background: `linear-gradient(135deg, ${barColor}18, ${barColor}30)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                    border: `1px solid ${barColor}25`,
                                                }}>
                                                    <Text size="lg">{iconEmoji}</Text>
                                                </Box>
                                                <Box style={{ flex: 1, minWidth: 0 }}>
                                                    <Text size="sm" fw={700} truncate>{jt.label}</Text>
                                                    <Text size="xs" c="dimmed">{jt.total} งานทั้งหมด</Text>
                                                </Box>
                                                {/* Progress Ring */}
                                                <Box style={{
                                                    width: 48, height: 48,
                                                    position: 'relative',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                                                        <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f3f5" strokeWidth="4.5" />
                                                        <circle
                                                            cx="24" cy="24" r="20" fill="none"
                                                            stroke={pct === 100 ? '#40c057' : pct >= 50 ? barColor : '#fd7e14'}
                                                            strokeWidth="4.5"
                                                            strokeDasharray={`${(pct / 100) * 125.66} 125.66`}
                                                            strokeLinecap="round"
                                                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                                        />
                                                    </svg>
                                                    <Text
                                                        size="xs" fw={800}
                                                        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                                        c={pct === 100 ? 'green' : pct >= 50 ? 'blue' : 'orange'}
                                                    >
                                                        {pct}%
                                                    </Text>
                                                </Box>
                                            </Group>

                                            {/* Mini stat bars */}
                                            <Stack gap={6}>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>เสร็จแล้ว</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: jt.total > 0 ? `${(jt.completed / jt.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #40c057, #69db7c)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="green" style={{ width: 20, textAlign: 'right' }}>{jt.completed}</Text>
                                                </Group>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>กำลังทำ</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: jt.total > 0 ? `${(jt.in_progress / jt.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #fd7e14, #ffa94d)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="orange" style={{ width: 20, textAlign: 'right' }}>{jt.in_progress}</Text>
                                                </Group>
                                                <Group gap="xs" wrap="nowrap">
                                                    <Text size="xs" c="dimmed" style={{ width: 60, flexShrink: 0 }}>รอดำเนิน</Text>
                                                    <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
                                                        <Box style={{
                                                            height: '100%', borderRadius: 4,
                                                            width: jt.total > 0 ? `${(jt.pending / jt.total) * 100}%` : '0%',
                                                            background: 'linear-gradient(90deg, #fab005, #ffd43b)',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Text size="xs" fw={600} c="yellow.7" style={{ width: 20, textAlign: 'right' }}>{jt.pending}</Text>
                                                </Group>
                                            </Stack>
                                        </Box>
                                    </Card>
                                )
                            })}
                        </SimpleGrid>
                    </Card>
                )}

                {/* Stats Cards */}
                <Group gap="sm" grow>
                    <Card withBorder radius="lg" p="sm" style={{ textAlign: 'center' }}>
                        <Text size="xl" fw={700} c="yellow.7">{stats.pending}</Text>
                        <Text size="xs" c="dimmed">รอดำเนินการ</Text>
                    </Card>
                    <Card withBorder radius="lg" p="sm" style={{ textAlign: 'center' }}>
                        <Text size="xl" fw={700} c="orange">{stats.in_progress}</Text>
                        <Text size="xs" c="dimmed">กำลังดำเนินการ</Text>
                    </Card>
                    <Card withBorder radius="lg" p="sm" style={{ textAlign: 'center' }}>
                        <Text size="xl" fw={700} c="green">{stats.completed}</Text>
                        <Text size="xs" c="dimmed">เสร็จสิ้น</Text>
                    </Card>
                </Group>

                {/* Toolbar */}
                <Card withBorder radius="lg" p="sm">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                        <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
                            <TextInput
                                placeholder="ค้นหาชื่อลูกค้า / ผู้รับผิดชอบ..."
                                leftSection={<TbSearch size={16} />}
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                style={{ minWidth: 280 }}
                                size="sm"
                            />
                            <Select
                                placeholder="กรองตามสถานะ"
                                data={STATUS_OPTIONS}
                                value={statusFilter}
                                onChange={(val) => { setStatusFilter(val); setPage(1) }}
                                clearable
                                leftSection={<TbFilter size={16} />}
                                size="sm"
                                style={{ minWidth: 180 }}
                            />
                        </Group>
                        <Button
                            color="teal"
                            leftSection={<TbPlus size={16} />}
                            onClick={handleAdd}
                            size="sm"
                        >
                            เพิ่มงาน
                        </Button>
                    </Group>
                </Card>

                {/* Content */}
                {filteredTasks.length === 0 ? (
                    <Card withBorder radius="lg" p="xl">
                        <Center>
                            <Stack align="center" gap="sm">
                                <Icon size={48} color="var(--mantine-color-gray-4)" />
                                <Text c="dimmed" size="sm">
                                    {tasks.length === 0
                                        ? 'ยังไม่มีรายการงาน — กดปุ่ม "เพิ่มงาน" เพื่อเริ่มต้น'
                                        : 'ไม่พบรายการที่ตรงกับการค้นหา'
                                    }
                                </Text>
                                {tasks.length === 0 && (
                                    <Button variant="light" color="teal" leftSection={<TbPlus size={14} />} onClick={handleAdd} size="xs">
                                        เพิ่มงานแรก
                                    </Button>
                                )}
                            </Stack>
                        </Center>
                    </Card>
                ) : (
                    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                        <ScrollArea>
                            <Table striped highlightOnHover withColumnBorders>
                                <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: tableHeaderColor }}>
                                    <Table.Tr>
                                        <Table.Th style={{ minWidth: 50, color: 'white' }}>#</Table.Th>
                                        <Table.Th style={{ minWidth: 120, color: 'white' }}>วันที่รับงาน</Table.Th>
                                        <Table.Th style={{ minWidth: 200, color: 'white' }}>ชื่อลูกค้า</Table.Th>
                                        <Table.Th style={{ minWidth: 180, color: 'white' }}>ประเภทงาน</Table.Th>
                                        <Table.Th style={{ minWidth: 150, color: 'white' }}>รายการย่อย</Table.Th>
                                        <Table.Th style={{ minWidth: 150, color: 'white' }}>ผู้รับผิดชอบ</Table.Th>
                                        <Table.Th style={{ minWidth: 120, color: 'white' }}>สถานะ</Table.Th>
                                        <Table.Th style={{ minWidth: 200, color: 'white' }}>หมายเหตุ</Table.Th>
                                        <Table.Th style={{ minWidth: 100, textAlign: 'center', color: 'white' }}>จัดการ</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {paginatedTasks.map((task, idx) => {
                                        const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
                                        return (
                                            <Table.Tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedTask(task as unknown as RegistrationTask); openStatusModal() }}>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed">{(page - 1) * Number(perPage) + idx + 1}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{formatDate(task.received_date)}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" fw={500}>{task.client_name}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{getJobTypeLabel(task)}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" c={task.job_type_sub ? undefined : 'dimmed'}>
                                                        {getSubTypeLabel(task)}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{task.responsible_name}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge size="sm" variant="light" color={statusConf.color}>
                                                        {statusConf.label}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed" lineClamp={2}>{task.notes || '-'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="center">
                                                        <Tooltip label="แก้ไข" withArrow>
                                                            <ActionIcon variant="light" color="blue" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(task) }}>
                                                                <TbEdit size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="ลบ" withArrow>
                                                            <ActionIcon variant="light" color="red" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(task.id) }}>
                                                                <TbTrash size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        )
                                    })}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>

                        {/* Pagination */}
                        <Box px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <Text size="sm" c="dimmed">แสดง</Text>
                                    <Select
                                        data={['5', '10', '20', '50', '100']}
                                        value={perPage}
                                        onChange={(val) => { setPerPage(val || '10'); setPage(1) }}
                                        size="xs"
                                        style={{ width: 70 }}
                                    />
                                    <Text size="sm" c="dimmed">รายการ จากทั้งหมด {filteredTasks.length} รายการ</Text>
                                </Group>
                                {totalPages > 1 && (
                                    <Pagination
                                        total={totalPages}
                                        value={page}
                                        onChange={setPage}
                                        size="sm"
                                    />
                                )}
                            </Group>
                        </Box>
                    </Card>
                )}
            </Stack>

            {/* Task Form Modal */}
            <TaskFormModal
                opened={formModalOpened}
                onClose={closeFormModal}
                editingTask={editingTask}
                clients={clients}
                clientGroups={clientGroups}
                workTypes={deptWorkTypes}
                users={users}
                onSave={handleSave}
                deptTitle={title}
            />

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                opened={statusModalOpened}
                onClose={closeStatusModal}
                task={selectedTask}
                client={selectedClient}
                allTasks={(tasks as unknown as RegistrationTask[])}
                workTypes={deptWorkTypes}
                onSelectTask={(t) => setSelectedTask(t)}
            />

            {/* Delete Confirmation */}
            <Modal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title={<Text fw={700}>ยืนยันการลบ</Text>}
                size="sm"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">คุณต้องการลบงานนี้หรือไม่?</Text>
                    <Alert color="orange" icon={<TbAlertCircle size={16} />}>
                        <Text size="xs">การลบนี้ไม่สามารถย้อนกลับได้</Text>
                    </Alert>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="light" color="gray" onClick={() => setDeleteConfirmId(null)}>ยกเลิก</Button>
                        <Button color="red" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
                            ลบ
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container >
    )
}
