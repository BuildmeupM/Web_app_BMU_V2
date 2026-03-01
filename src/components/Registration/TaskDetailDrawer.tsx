/**
 * TaskDetailDrawer — Dual Panel: ข้อมูลลูกค้า + อัพเดทสถานะงาน
 * เปิดเป็น Drawer กว้าง แบ่ง 2 ฝั่ง
 */

import { useState, useMemo, useEffect } from 'react'
import {
    Drawer, Text, Group, Box, Stack, Card, Badge, TextInput, Button,
    Progress, Tooltip, ScrollArea, Divider, ThemeIcon,
    Paper, CopyButton, ActionIcon, Textarea, Checkbox, Select,
    NumberInput, Radio, ColorSwatch, Popover, ColorPicker,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
    TbBuilding, TbUser, TbClock, TbCalendarCheck, TbLink, TbCheck,
    TbDeviceFloppy, TbMessageCircle, TbPhone, TbBrandLine, TbHash,
    TbFolder, TbNotes, TbHistory, TbCircleDot, TbCopy,
    TbCalendar, TbBriefcase, TbTruck, TbMapPin, TbCash, TbTrash,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    registrationTaskService,
    type RegistrationTask,
    type RegistrationTaskUpdateData,
    type TaskComment,
} from '../../services/registrationTaskService'
import { getLocations } from '../../services/messengerRouteService'
import type { RegistrationClient } from '../../services/registrationClientService'
import { type WorkType, type TeamStatus, getTeamStatuses } from '../../services/registrationWorkService'
import { notifications } from '@mantine/notifications'
import usersService from '../../services/usersService'
import { STEPS, STATUS_CONFIG } from './utils/taskConstants'
import type { StepsState } from './utils/taskConstants'
import { formatThaiDate, formatTime } from './utils/taskFormatters'



interface TaskDetailDrawerProps {
    opened: boolean
    onClose: () => void
    task: RegistrationTask | null
    client: RegistrationClient | null
    allTasks: RegistrationTask[] // ประวัติงานของลูกค้า
    workTypes?: WorkType[]
    onUpdated?: () => void
    onSelectTask?: (task: RegistrationTask) => void
}

export default function TaskDetailDrawer({
    opened, onClose, task, client, allTasks, workTypes = [], onUpdated, onSelectTask,
}: TaskDetailDrawerProps) {
    const queryClient = useQueryClient()

    // Local state
    const [steps, setSteps] = useState({
        step_1: false, step_2: false, step_3: false, step_4: false, step_5: false,
    })
    const [completionDate, setCompletionDate] = useState<Date | null>(null)
    const [invoiceUrl, setInvoiceUrl] = useState('')
    const [commentText, setCommentText] = useState('')
    const [initialized, setInitialized] = useState<string | null>(null)

    // Messenger state
    const [needsMessenger, setNeedsMessenger] = useState(false)
    const [messengerDestination, setMessengerDestination] = useState('')
    const [messengerDetails, setMessengerDetails] = useState('')
    const [messengerNotes, setMessengerNotes] = useState('')
    const [messengerStatus, setMessengerStatus] = useState<string>('pending')
    // Payment state
    const [paymentStatus, setPaymentStatus] = useState<string>('unpaid')
    const [depositAmount, setDepositAmount] = useState<number | string>('')
    // Team status state
    const [teamStatus, setTeamStatus] = useState<string | null>(null)

    // Comment color state
    const [myCommentColor, setMyCommentColor] = useState('#2196F3')
    const [colorPickerOpen, setColorPickerOpen] = useState(false)

    // Load user's comment color on mount
    useEffect(() => {
        usersService.getMyCommentColor().then(setMyCommentColor).catch(() => { })
    }, [])

    // Sync local state
    if (task && initialized !== task.id) {
        setSteps({
            step_1: !!task.step_1,
            step_2: !!task.step_2,
            step_3: !!task.step_3,
            step_4: !!task.step_4,
            step_5: !!task.step_5,
        })
        setCompletionDate(task.completion_date ? new Date(task.completion_date) : null)
        setInvoiceUrl(task.invoice_url || '')
        // Sync messenger
        setNeedsMessenger(!!task.needs_messenger)
        setMessengerDestination(task.messenger_destination || '')
        setMessengerDetails(task.messenger_details || '')
        setMessengerNotes(task.messenger_notes || '')
        setMessengerStatus(task.messenger_status || 'pending')
        // Sync payment
        setPaymentStatus(task.payment_status || 'unpaid')
        setDepositAmount(task.deposit_amount ?? '')
        // Sync team status
        setTeamStatus(task.team_status || null)
        setInitialized(task.id)
    }

    // Comments
    const { data: comments = [] } = useQuery(
        `task-comments-${task?.id}`,
        () => task ? registrationTaskService.getComments(task.id) : Promise.resolve([]),
        { enabled: !!task && opened },
    )

    // Team statuses query
    const { data: teamStatusOptions = [] } = useQuery<TeamStatus[]>(
        'team-statuses',
        () => getTeamStatuses(),
        { staleTime: 5 * 60 * 1000 },
    )

    // Messenger locations — same data as messenger routes page
    const { data: messengerLocations = [] } = useQuery(
        'messenger-locations',
        () => getLocations(),
        { staleTime: 5 * 60 * 1000 },
    )
    const locationOptions = useMemo(() => {
        const grouped = new Map<string, { value: string; label: string }[]>()
        for (const loc of messengerLocations) {
            const cat = loc.category || 'อื่นๆ'
            if (!grouped.has(cat)) grouped.set(cat, [])
            grouped.get(cat)!.push({ value: loc.name, label: loc.address ? `${loc.name} — ${loc.address}` : loc.name })
        }
        if (grouped.size === 0) return []
        if (grouped.size === 1) return [...grouped.values()][0]
        return [...grouped.entries()].map(([group, items]) => ({ group, items }))
    }, [messengerLocations])

    // Mutations
    const updateMutation = useMutation(
        (data: RegistrationTaskUpdateData) => registrationTaskService.update(task!.id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`registration-tasks-${task?.department}`)
                queryClient.invalidateQueries(`registration-tasks-master`)
                notifications.show({ title: 'สำเร็จ', message: 'อัพเดทสถานะเรียบร้อย', color: 'green' })
                onUpdated?.()
                onClose()
                setInitialized(null)
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถอัพเดทได้', color: 'red' })
            },
        }
    )

    const addCommentMutation = useMutation(
        (message: string) => registrationTaskService.addComment(task!.id, message),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`task-comments-${task?.id}`)
                setCommentText('')
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถเพิ่มความเห็นได้', color: 'red' })
            },
        }
    )

    const deleteCommentMutation = useMutation(
        (commentId: string) => registrationTaskService.deleteComment(task!.id, commentId),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`task-comments-${task?.id}`)
                notifications.show({ title: 'สำเร็จ', message: 'ลบความเห็นแล้ว', color: 'green' })
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถลบความเห็นได้', color: 'red' })
            },
        }
    )

    // Computed
    const progress = useMemo(() => {
        // step_5 done = 100% regardless of step_4
        if (steps.step_5) return 100
        return Object.values(steps).filter(Boolean).length * 20
    }, [steps])
    const agingDays = useMemo(() => {
        if (!task) return 0
        return Math.floor((Date.now() - new Date(task.received_date).getTime()) / 86400000)
    }, [task])
    const agingColor = agingDays <= 7 ? 'green' : agingDays <= 14 ? 'orange' : 'red'

    // Client tasks for history
    // Fetch ALL tasks for this client across all departments
    const { data: clientTasks = [] } = useQuery(
        ['client-all-tasks', task?.client_id],
        () => registrationTaskService.getByClientId(task!.client_id),
        {
            enabled: !!task?.client_id,
            select: (tasks) => tasks.filter(t => t.id !== task?.id).slice(0, 20),
        }
    )

    const DEPT_CONFIG: Record<string, { label: string; color: string }> = {
        dbd: { label: 'DBD', color: 'violet' },
        rd: { label: 'RD', color: 'green' },
        sso: { label: 'SSO', color: 'indigo' },
        hr: { label: 'HR', color: 'red' },
    }

    // Resolve job type UUID → readable name
    const resolveJobType = (id: string) => {
        // Use backend-resolved name first
        if ((task as any)?.job_type_name) return (task as any).job_type_name
        const wt = workTypes.find(w => w.id === id)
        return wt?.name || id
    }
    const resolveSubType = (subId: string) => {
        // Use backend-resolved name first
        if ((task as any)?.job_type_sub_name) return (task as any).job_type_sub_name
        for (const wt of workTypes) {
            const sub = wt.sub_types?.find(s => s.id === subId)
            if (sub) return sub.name
        }
        return subId
    }

    const toggleStep = (stepKey: keyof typeof steps, stepIndex: number) => {
        setSteps(prev => {
            const isActive = prev[stepKey]
            if (isActive) {
                // Unchecking: also uncheck all steps after this one
                const updated = { ...prev }
                STEPS.forEach((s, i) => {
                    if (i >= stepIndex) updated[s.key] = false
                })
                // If unchecking step_3 or earlier, clear needsMessenger
                if (stepIndex <= 2) {
                    setNeedsMessenger(false)
                }
                return updated
            } else {
                // Checking: allow step_5 (index 4) even if step_4 (index 3) is not done
                // But steps 1,2,3 must be done
                for (let i = 0; i < stepIndex; i++) {
                    // Allow skipping step_4 (index 3) when checking step_5 (index 4)
                    if (i === 3 && stepIndex === 4) continue
                    if (!prev[STEPS[i].key]) {
                        notifications.show({
                            title: 'ไม่สามารถข้ามขั้นตอน',
                            message: `กรุณาทำขั้นตอน "${STEPS[i].label}" ให้เสร็จก่อน`,
                            color: 'orange',
                        })
                        return prev
                    }
                }
                const updated = { ...prev, [stepKey]: true }
                // Auto-set needsMessenger when step_3 is completed
                if (stepKey === 'step_3') {
                    setNeedsMessenger(true)
                }
                // If checking step_5 without step_4, no messenger needed
                if (stepKey === 'step_5' && !prev.step_4) {
                    setNeedsMessenger(false)
                    setMessengerStatus('not_needed')
                }
                return updated
            }
        })
    }

    const handleSave = () => {
        if (!task) return
        let status: string = task.status
        // step_5 done = completed regardless of step_4
        if (steps.step_5) status = 'completed'
        else if (Object.values(steps).some(Boolean)) status = 'in_progress'
        else status = 'pending'

        updateMutation.mutate({
            ...steps,
            status,
            completion_date: completionDate ? completionDate.toISOString().split('T')[0] : null,
            invoice_url: invoiceUrl || null,
            // Messenger fields
            needs_messenger: needsMessenger,
            messenger_destination: messengerDestination || null,
            messenger_details: messengerDetails || null,
            messenger_notes: messengerNotes || null,
            messenger_status: messengerStatus || 'pending',
            // Payment fields
            payment_status: paymentStatus || 'unpaid',
            deposit_amount: depositAmount !== '' ? Number(depositAmount) : null,
            // Team status
            team_status: teamStatus || null,
        })
    }

    const handleAddComment = () => {
        if (!commentText.trim()) return
        addCommentMutation.mutate(commentText.trim())
    }

    // formatThaiDate and formatTime are now imported from ./utils/taskFormatters

    if (!task) return null

    return (
        <Drawer
            opened={opened}
            onClose={() => { onClose(); setInitialized(null) }}
            position="right"
            size="100%"
            padding={0}
            withCloseButton={false}
            styles={{
                body: { height: '100vh', padding: 0 },
                content: { height: '100vh', maxHeight: '100vh' },
            }}
        >
            <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box
                    p="md"
                    style={{
                        background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
                        flexShrink: 0,
                    }}
                >
                    <Group justify="space-between">
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" variant="white" color="blue">
                                <TbBriefcase size={22} />
                            </ThemeIcon>
                            <div>
                                <Text size="lg" fw={700} c="white">รายละเอียดงาน</Text>
                                <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                                    {task.client_name} — {formatThaiDate(task.received_date)}
                                </Text>
                            </div>
                        </Group>
                        <Button
                            variant="white"
                            color="dark"
                            size="xs"
                            onClick={() => { onClose(); setInitialized(null) }}
                        >
                            ปิด ✕
                        </Button>
                    </Group>
                </Box>

                {/* Content — 2-column layout */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                    {/* ===== LEFT PANEL: Client Info ===== */}
                    <div style={{ width: '33.33%', borderRight: '1px solid var(--mantine-color-gray-3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <ScrollArea style={{ flex: 1 }} p="md">
                            <Stack gap="md">
                                {/* Client Header */}
                                <Card
                                    radius="lg" p="md"
                                    style={{
                                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                        border: 'none',
                                    }}
                                >
                                    <Group gap="sm">
                                        <Box style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: 'linear-gradient(135deg, #1976d2, #42A5F5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(25,118,210,0.3)',
                                        }}>
                                            <TbBuilding size={24} color="white" />
                                        </Box>
                                        <div style={{ flex: 1 }}>
                                            <Text size="lg" fw={700}>{client?.company_name || task.client_name}</Text>
                                            <Badge size="sm" variant="light" color={client?.is_active ? 'green' : 'red'}>
                                                {client?.is_active ? '🟢 Active' : '🔴 Inactive'}
                                            </Badge>
                                        </div>
                                    </Group>
                                </Card>

                                {/* Client Details */}
                                <Card withBorder radius="md" p="md">
                                    <Text size="sm" fw={600} mb="sm" c="orange">ข้อมูลลูกค้า</Text>
                                    <Stack gap="xs">
                                        <InfoRow
                                            icon={<TbHash size={14} />}
                                            label="เลขนิติบุคคล"
                                            value={client?.legal_entity_number}
                                            copyable
                                        />
                                        <InfoRow
                                            icon={<TbPhone size={14} />}
                                            label="เบอร์โทรศัพท์"
                                            value={client?.phone}
                                            copyable
                                        />
                                        <InfoRow
                                            icon={<TbFolder size={14} />}
                                            label="กลุ่มงาน"
                                            value={client?.group_name}
                                        />
                                        <InfoRow
                                            icon={<TbBrandLine size={14} />}
                                            label="LINE API"
                                            value={client?.line_api}
                                            copyable
                                        />
                                        <InfoRow
                                            icon={<TbNotes size={14} />}
                                            label="หมายเหตุ"
                                            value={client?.notes}
                                        />
                                        <InfoRow
                                            icon={<TbMapPin size={14} />}
                                            label="ที่อยู่"
                                            value={client?.full_address}
                                        />
                                        <InfoRow
                                            icon={<TbCalendar size={14} />}
                                            label="วันที่เพิ่ม"
                                            value={client?.created_at ? formatThaiDate(client.created_at) : undefined}
                                        />
                                    </Stack>
                                </Card>

                                {/* Current Task Info */}
                                <Card withBorder radius="md" p="md">
                                    <Text size="sm" fw={600} mb="sm" c="orange">งานปัจจุบัน</Text>
                                    <Stack gap="xs">
                                        <InfoRow
                                            icon={<TbBriefcase size={14} />}
                                            label="ประเภทงาน"
                                            value={resolveJobType(task.job_type)}
                                        />
                                        {task.job_type_sub && (
                                            <InfoRow
                                                icon={<TbCircleDot size={14} />}
                                                label="รายการย่อย"
                                                value={resolveSubType(task.job_type_sub)}
                                            />
                                        )}
                                        <InfoRow
                                            icon={<TbUser size={14} />}
                                            label="ผู้รับผิดชอบ"
                                            value={task.responsible_name}
                                        />
                                        <InfoRow
                                            icon={<TbCalendar size={14} />}
                                            label="วันที่รับงาน"
                                            value={formatThaiDate(task.received_date)}
                                        />
                                        <Group gap="xs" align="center">
                                            <TbClock size={14} color="var(--mantine-color-dimmed)" />
                                            <Text size="xs" c="dimmed" style={{ width: 100 }}>Aging</Text>
                                            <Badge size="sm" color={agingColor} variant="light">
                                                {agingDays} วัน
                                            </Badge>
                                        </Group>
                                        {task.notes && (
                                            <InfoRow
                                                icon={<TbNotes size={14} />}
                                                label="หมายเหตุ"
                                                value={task.notes}
                                            />
                                        )}
                                    </Stack>
                                </Card>

                                {/* Client Task History */}
                                <Card withBorder radius="md" p="md">
                                    <Group gap="xs" mb="sm">
                                        <TbHistory size={16} />
                                        <Text size="sm" fw={600}>ประวัติงานลูกค้า</Text>
                                        <Badge size="xs" variant="light" color="gray">
                                            {clientTasks.length}
                                        </Badge>
                                    </Group>

                                    {clientTasks.length > 0 ? (() => {
                                        const incompleteTasks = clientTasks.filter(ct => ct.status !== 'completed')
                                        const completedTasks = clientTasks.filter(ct => ct.status === 'completed')

                                        const renderTaskItem = (ct: RegistrationTask) => {
                                            const sc = STATUS_CONFIG[ct.status] || STATUS_CONFIG.pending
                                            const jobLabel = (ct as any).job_type_name || ct.job_type || '-'
                                            const subLabel = (ct as any).job_type_sub_name
                                            return (
                                                <Paper
                                                    key={ct.id}
                                                    withBorder p="xs" radius="sm"
                                                    style={{
                                                        borderLeft: `3px solid var(--mantine-color-${sc.color}-5)`,
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onClick={() => {
                                                        if (onSelectTask) {
                                                            onSelectTask(ct)
                                                        }
                                                    }}
                                                    className="hover-highlight"
                                                >
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Text size="xs" fw={500} truncate>
                                                                {jobLabel}{subLabel ? ` — ${subLabel}` : ''}
                                                            </Text>
                                                            <Group gap={4} wrap="nowrap">
                                                                <Text size="xs" c="dimmed">📅 {formatThaiDate(ct.received_date)}</Text>
                                                                {ct.responsible_name && (
                                                                    <Text size="xs" c="dimmed">• 👤 {ct.responsible_name}</Text>
                                                                )}
                                                            </Group>
                                                        </div>
                                                        <Stack gap={2} align="flex-end">
                                                            <Badge size="xs" variant="filled" color={DEPT_CONFIG[(ct as any).department]?.color || 'gray'} radius="sm">
                                                                {DEPT_CONFIG[(ct as any).department]?.label || (ct as any).department || '-'}
                                                            </Badge>
                                                            <Badge size="xs" variant="light" color={sc.color}>
                                                                {sc.label}
                                                            </Badge>
                                                        </Stack>
                                                    </Group>
                                                </Paper>
                                            )
                                        }

                                        return (
                                            <Stack gap="md">
                                                {/* Incomplete tasks */}
                                                <Box>
                                                    <Group gap={6} mb={6}>
                                                        <Text size="xs" fw={600} c="orange">⏳ ยังไม่สำเร็จ</Text>
                                                        <Badge size="xs" variant="light" color="orange">{incompleteTasks.length}</Badge>
                                                    </Group>
                                                    {incompleteTasks.length > 0 ? (
                                                        <Stack gap={6}>
                                                            {incompleteTasks.map(renderTaskItem)}
                                                        </Stack>
                                                    ) : (
                                                        <Text size="xs" c="dimmed" ta="center" py={4}>ไม่มีงานค้าง</Text>
                                                    )}
                                                </Box>

                                                <Divider variant="dashed" />

                                                {/* Completed tasks */}
                                                <Box>
                                                    <Group gap={6} mb={6}>
                                                        <Text size="xs" fw={600} c="green">✅ สำเร็จแล้ว</Text>
                                                        <Badge size="xs" variant="light" color="green">{completedTasks.length}</Badge>
                                                    </Group>
                                                    {completedTasks.length > 0 ? (
                                                        <Stack gap={6}>
                                                            {completedTasks.map(renderTaskItem)}
                                                        </Stack>
                                                    ) : (
                                                        <Text size="xs" c="dimmed" ta="center" py={4}>ยังไม่มีงานที่สำเร็จ</Text>
                                                    )}
                                                </Box>
                                            </Stack>
                                        )
                                    })() : (
                                        <Text size="xs" c="dimmed" ta="center" py="sm">
                                            ไม่มีงานอื่นของลูกค้านี้
                                        </Text>
                                    )}
                                </Card>
                            </Stack>
                        </ScrollArea>
                    </div>

                    {/* ===== RIGHT PANEL: Task Status Update ===== */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                            <Stack gap={0}>
                                {/* Aging Card */}
                                <Box px="md" pt="md">
                                    <Card
                                        radius="md" p="sm"
                                        style={{
                                            background: agingColor === 'green'
                                                ? 'linear-gradient(135deg, #4CAF50, #66BB6A)'
                                                : agingColor === 'orange'
                                                    ? 'linear-gradient(135deg, #FF9800, #FFB74D)'
                                                    : 'linear-gradient(135deg, #f44336, #ef5350)',
                                        }}
                                    >
                                        <Group gap="xs" wrap="nowrap">
                                            <TbClock size={18} color="white" />
                                            <div>
                                                <Text size="sm" fw={700} c="white">
                                                    รับงานมาแล้ว {agingDays} วัน
                                                </Text>
                                                <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                                                    วันที่รับงาน: {formatThaiDate(task.received_date)}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Card>
                                </Box>

                                {/* 5-Step Stepper */}
                                <Box px="md" pt="md">
                                    <Text size="xs" fw={600} c="dimmed" mb={8}>Progress Stepper</Text>

                                    <Box style={{ position: 'relative' }}>
                                        {/* Background line */}
                                        <Box style={{
                                            position: 'absolute', top: 18, left: '8%', right: '8%',
                                            height: 3, background: '#e9ecef', borderRadius: 2, zIndex: 0,
                                        }} />
                                        {/* Active line */}
                                        <Box style={{
                                            position: 'absolute', top: 18, left: '8%',
                                            width: `${Math.max(0, (Object.values(steps).filter(Boolean).length - 1)) * 21.5}%`,
                                            height: 3, background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                                            borderRadius: 2, zIndex: 1, transition: 'width 0.3s ease',
                                        }} />

                                        <Group justify="space-between" style={{ position: 'relative', zIndex: 2 }}>
                                            {STEPS.map((step, i) => {
                                                const isActive = steps[step.key]
                                                const firstUncompleted = STEPS.findIndex(s => !steps[s.key])
                                                const isCurrent = i === firstUncompleted
                                                return (
                                                    <Tooltip key={step.key} label={`${step.label} — คลิกเพื่อ${isActive ? 'ยกเลิก' : 'เปิด'}`} withArrow>
                                                        <Box
                                                            style={{ textAlign: 'center', cursor: 'pointer', flex: 1 }}
                                                            onClick={() => toggleStep(step.key, i)}
                                                        >
                                                            <Box style={{
                                                                width: 36, height: 36, borderRadius: '50%',
                                                                background: isActive
                                                                    ? 'linear-gradient(135deg, #4CAF50, #66BB6A)'
                                                                    : isCurrent
                                                                        ? 'linear-gradient(135deg, #2196F3, #42A5F5)'
                                                                        : '#e9ecef',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                margin: '0 auto', transition: 'all 0.2s ease',
                                                                boxShadow: isActive
                                                                    ? '0 2px 8px rgba(76,175,80,0.3)'
                                                                    : isCurrent ? '0 2px 8px rgba(33,150,243,0.3)' : 'none',
                                                                border: isCurrent ? '2px solid #2196F3' : 'none',
                                                            }}>
                                                                {isActive ? (
                                                                    <TbCheck size={18} color="white" />
                                                                ) : (
                                                                    <Text size="sm" fw={700} c={isCurrent ? 'white' : 'dimmed'}>
                                                                        {i + 1}
                                                                    </Text>
                                                                )}
                                                            </Box>
                                                            <Text
                                                                size="xs"
                                                                c={isActive ? 'dark' : isCurrent ? 'dark' : 'dimmed'}
                                                                fw={isActive || isCurrent ? 700 : 400}
                                                                mt={4}
                                                                style={{ lineHeight: 1.2 }}
                                                            >
                                                                {step.label}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">({step.pct}%)</Text>
                                                        </Box>
                                                    </Tooltip>
                                                )
                                            })}
                                        </Group>
                                    </Box>

                                    <Group justify="flex-end" mt={8}>
                                        <Text size="xs" c="dark" fw={600}>
                                            ความคืบหน้า {progress}%
                                        </Text>
                                    </Group>
                                    <Progress
                                        value={progress}
                                        color={progress === 100 ? 'green' : progress >= 60 ? 'blue' : 'orange'}
                                        size="sm" radius="xl"
                                        animated={progress > 0 && progress < 100}
                                        mt={4}
                                    />
                                </Box>

                                <Divider my="md" />

                                {/* Payment Status */}
                                <Box px="md" pb="md">
                                    <Group gap="xs" mb={8}>
                                        <TbCash size={16} />
                                        <Text size="sm" fw={600}>สถานะชำระเงิน</Text>
                                    </Group>
                                    <Card withBorder radius="md" p="sm" style={{ borderColor: 'var(--mantine-color-green-3)', background: 'var(--mantine-color-green-0)' }}>
                                        <Radio.Group
                                            value={paymentStatus}
                                            onChange={(v) => {
                                                setPaymentStatus(v)
                                                if (v !== 'deposit') setDepositAmount('')
                                            }}
                                        >
                                            <Group gap="md">
                                                <Radio value="paid_full" label="💰 ชำระแล้วเต็มยอด" size="sm" />
                                                <Group gap="xs" align="flex-start">
                                                    <Radio value="deposit" label="💵 มัดจำบางส่วน" size="sm" />
                                                    {paymentStatus === 'deposit' && (
                                                        <NumberInput
                                                            placeholder="จำนวนเงินมัดจำ"
                                                            value={depositAmount}
                                                            onChange={(v) => setDepositAmount(v)}
                                                            size="xs"
                                                            min={0}
                                                            suffix=" ฿"
                                                            thousandSeparator=","
                                                            style={{ width: 140 }}
                                                        />
                                                    )}
                                                </Group>
                                                <Radio value="free" label="🆓 ไม่คิดค่าใช้จ่าย" size="sm" />
                                                <Radio value="unpaid" label="⏳ ยังไม่ชำระ" size="sm" />
                                            </Group>
                                        </Radio.Group>
                                    </Card>
                                </Box>

                                <Divider />

                                {/* Comments */}
                                <Box px="md" pt="md">
                                    <Group gap="xs" mb={8}>
                                        <TbMessageCircle size={16} />
                                        <Text size="sm" fw={600}>Comments</Text>
                                        {comments.length > 0 && (
                                            <Badge size="xs" variant="light" color="blue">{comments.length}</Badge>
                                        )}
                                    </Group>

                                    {comments.length > 0 ? (
                                        <ScrollArea h={comments.length > 4 ? 220 : undefined} offsetScrollbars mb="sm">
                                            <Stack gap={6}>
                                                {[...comments].reverse().map((c: TaskComment, idx: number) => (
                                                    <Group key={c.id} gap="xs" wrap="nowrap" align="flex-start">
                                                        <Box style={{
                                                            width: 8, height: 8, borderRadius: '50%',
                                                            backgroundColor: c.user_color || '#2196F3',
                                                            flexShrink: 0, marginTop: 6,
                                                        }} />
                                                        <div style={{ flex: 1 }}>
                                                            <Group gap={4} wrap="nowrap">
                                                                <Text size="xs" c="dimmed">
                                                                    {formatThaiDate(c.created_at)} {formatTime(c.created_at)}
                                                                </Text>
                                                                <Text size="xs" fw={600} style={{ color: c.user_color || '#2196F3' }}>{c.user_name}:</Text>
                                                            </Group>
                                                            <Text size="xs">{c.message}</Text>
                                                        </div>
                                                        <Tooltip label="ลบความเห็น" withArrow>
                                                            <ActionIcon
                                                                size="xs"
                                                                variant="subtle"
                                                                color="red"
                                                                onClick={() => deleteCommentMutation.mutate(c.id)}
                                                                loading={deleteCommentMutation.isLoading}
                                                            >
                                                                <TbTrash size={12} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </ScrollArea>
                                    ) : (
                                        <Text size="xs" c="dimmed" ta="center" py="xs" mb="sm">
                                            ยังไม่มีความเห็น
                                        </Text>
                                    )}

                                    <Group gap="xs" mb="md">
                                        <Popover opened={colorPickerOpen} onChange={setColorPickerOpen} position="top" withArrow shadow="md">
                                            <Popover.Target>
                                                <Tooltip label="เลือกสีความเห็น" withArrow>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="lg"
                                                        onClick={() => setColorPickerOpen(!colorPickerOpen)}
                                                        style={{ border: '1px solid #dee2e6', borderRadius: 6 }}
                                                    >
                                                        <ColorSwatch color={myCommentColor} size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Popover.Target>
                                            <Popover.Dropdown>
                                                <Text size="xs" fw={600} mb={6}>เลือกสีของคุณ</Text>
                                                <ColorPicker
                                                    value={myCommentColor}
                                                    onChange={(color) => setMyCommentColor(color)}
                                                    onChangeEnd={(color) => {
                                                        usersService.updateMyCommentColor(color).catch(() => { })
                                                        setColorPickerOpen(false)
                                                    }}
                                                    format="hex"
                                                    swatches={[
                                                        '#f44336', '#E91E63', '#9C27B0', '#673AB7',
                                                        '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
                                                        '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
                                                        '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
                                                        '#795548', '#607D8B', '#000000', '#E53935',
                                                    ]}
                                                    size="sm"
                                                />
                                                <Group gap="xs" mt={8}>
                                                    <ColorSwatch color={myCommentColor} size={20} />
                                                    <TextInput
                                                        size="xs"
                                                        placeholder="#FF5733"
                                                        value={myCommentColor}
                                                        onChange={(e) => {
                                                            const v = e.currentTarget.value
                                                            setMyCommentColor(v)
                                                        }}
                                                        onBlur={(e) => {
                                                            const v = e.currentTarget.value
                                                            if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                                                                usersService.updateMyCommentColor(v).catch(() => { })
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const v = e.currentTarget.value
                                                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                                                                    usersService.updateMyCommentColor(v).catch(() => { })
                                                                    setColorPickerOpen(false)
                                                                }
                                                            }
                                                        }}
                                                        style={{ flex: 1 }}
                                                        styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                                                    />
                                                </Group>
                                            </Popover.Dropdown>
                                        </Popover>
                                        <TextInput
                                            placeholder="เขียนความเห็น..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.currentTarget.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleAddComment()
                                                }
                                            }}
                                            style={{ flex: 1 }}
                                            size="sm"
                                            leftSection={<TbMessageCircle size={14} />}
                                        />
                                        <Button
                                            color="teal" size="sm"
                                            onClick={handleAddComment}
                                            loading={addCommentMutation.isLoading}
                                            disabled={!commentText.trim()}
                                        >
                                            เพิ่มความเห็น
                                        </Button>
                                    </Group>
                                </Box>

                                <Divider />

                                {/* Team Status Section */}
                                <Box px="md" py="md">
                                    <Group gap="xs" mb="sm">
                                        <TbBriefcase size={18} color="var(--mantine-color-cyan-6)" />
                                        <Text size="sm" fw={700} c="cyan">สถานะการทำงานในทีม</Text>
                                        {teamStatus && (() => {
                                            const found = teamStatusOptions.find(ts => ts.id === teamStatus)
                                            return found ? (
                                                <Badge size="xs" variant="light" style={{
                                                    backgroundColor: found.color + '20',
                                                    color: found.color,
                                                    borderColor: found.color + '40',
                                                }}>
                                                    {found.name}
                                                </Badge>
                                            ) : null
                                        })()}
                                    </Group>
                                    <Select
                                        placeholder="เลือกสถานะทีม..."
                                        value={teamStatus}
                                        onChange={(v) => setTeamStatus(v)}
                                        data={teamStatusOptions.filter(ts => ts.is_active).map(ts => ({
                                            value: ts.id,
                                            label: ts.name,
                                        }))}
                                        clearable
                                        searchable
                                        nothingFoundMessage="ไม่มีสถานะ — เพิ่มได้ที่หน้าตั้งค่า"
                                        size="sm"
                                        renderOption={({ option }) => {
                                            const ts = teamStatusOptions.find(t => t.id === option.value)
                                            return (
                                                <Group gap="sm">
                                                    <ColorSwatch color={ts?.color || '#ccc'} size={16} />
                                                    <Text size="sm">{option.label}</Text>
                                                </Group>
                                            )
                                        }}
                                    />
                                </Box>

                                <Divider />

                                {/* Messenger Section */}
                                <Box px="md" py="md">
                                    <Group gap="xs" mb="sm">
                                        <TbTruck size={18} color="var(--mantine-color-violet-6)" />
                                        <Text size="sm" fw={700} c="violet">ข้อมูลวิ่งแมส</Text>
                                        {needsMessenger && (
                                            <Badge size="xs" variant="light" color={
                                                messengerStatus === 'completed' ? 'green' :
                                                    messengerStatus === 'scheduled' ? 'blue' : 'orange'
                                            }>
                                                {messengerStatus === 'completed' ? 'วิ่งแล้ว' :
                                                    messengerStatus === 'scheduled' ? 'จัดตาราง' : 'รอดำเนินการ'}
                                            </Badge>
                                        )}
                                    </Group>

                                    <Checkbox
                                        label="งานนี้ต้องวิ่งแมส"
                                        checked={needsMessenger}
                                        onChange={(e) => setNeedsMessenger(e.currentTarget.checked)}
                                        color="violet"
                                        mb="sm"
                                    />

                                    {needsMessenger && (
                                        <Card withBorder radius="md" p="md" style={{ borderColor: 'var(--mantine-color-violet-3)', background: 'var(--mantine-color-violet-0)' }}>
                                            <Stack gap="sm">
                                                <Select
                                                    label="สถานที่ปลายทาง"
                                                    placeholder="เลือกสถานที่..."
                                                    value={messengerDestination}
                                                    onChange={(v) => setMessengerDestination(v || '')}
                                                    data={locationOptions}
                                                    searchable
                                                    clearable
                                                    nothingFoundMessage="ไม่พบสถานที่"
                                                    leftSection={<TbMapPin size={14} />}
                                                    size="sm"
                                                />
                                                <Textarea
                                                    label="รายละเอียดงานที่ต้องทำ"
                                                    placeholder="เช่น ยื่นเอกสารจดทะเบียน, รับหนังสือรับรอง"
                                                    value={messengerDetails}
                                                    onChange={(e) => setMessengerDetails(e.currentTarget.value)}
                                                    minRows={2}
                                                    autosize
                                                    size="sm"
                                                />
                                                <Textarea
                                                    label="หมายเหตุเพิ่มเติม"
                                                    placeholder="เช่น ต้องไปก่อน 14:00, นัดเจ้าหน้าที่ไว้"
                                                    value={messengerNotes}
                                                    onChange={(e) => setMessengerNotes(e.currentTarget.value)}
                                                    minRows={1}
                                                    autosize
                                                    size="sm"
                                                />
                                            </Stack>
                                        </Card>
                                    )}
                                </Box>

                                <Divider />

                                {/* Completion & Invoice */}
                                <Box px="md" py="md">
                                    <Group grow gap="md">
                                        <div>
                                            <Text size="xs" fw={600} c="dimmed" mb={4}>วันที่งานสำเร็จ</Text>
                                            <DatePickerInput
                                                placeholder="DD/MM/YYYY"
                                                value={completionDate}
                                                onChange={setCompletionDate}
                                                valueFormat="DD/MM/YYYY"
                                                leftSection={<TbCalendarCheck size={14} />}
                                                clearable size="sm"
                                            />
                                        </div>
                                        <div>
                                            <Text size="xs" fw={600} c="dimmed" mb={4}>URL ใบวางบิล</Text>
                                            <TextInput
                                                placeholder="https://..."
                                                value={invoiceUrl}
                                                onChange={(e) => setInvoiceUrl(e.currentTarget.value)}
                                                leftSection={<TbLink size={14} />}
                                                size="sm"
                                            />
                                        </div>
                                    </Group>
                                </Box>
                            </Stack>
                        </ScrollArea>
                    </div>
                </div>

                {/* Footer */}
                <Box
                    px="md" py="sm"
                    style={{
                        borderTop: '1px solid var(--mantine-color-gray-3)',
                        backgroundColor: '#fafafa',
                        flexShrink: 0,
                    }}
                >
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => { onClose(); setInitialized(null) }}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="teal"
                            leftSection={<TbDeviceFloppy size={16} />}
                            onClick={handleSave}
                            loading={updateMutation.isLoading}
                        >
                            บันทึก
                        </Button>
                    </Group>
                </Box>
            </Box>
        </Drawer>
    )
}

// ===== Helper Component: Info Row =====
function InfoRow({
    icon, label, value, copyable,
}: {
    icon: React.ReactNode
    label: string
    value?: string | null
    copyable?: boolean
}) {
    return (
        <Group gap="xs" align="flex-start" wrap="nowrap">
            <Box mt={2} c="dimmed">{icon}</Box>
            <Text size="xs" c="dimmed" style={{ width: 100, flexShrink: 0 }}>{label}</Text>
            <div style={{ flex: 1, minWidth: 0 }}>
                {value ? (
                    <Group gap={4} wrap="nowrap">
                        <Text size="xs" fw={500} style={{ wordBreak: 'break-all' }}>
                            {value}
                        </Text>
                        {copyable && (
                            <CopyButton value={value}>
                                {({ copied, copy }) => (
                                    <Tooltip label={copied ? 'คัดลอกแล้ว!' : 'คัดลอก'} withArrow>
                                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            <TbCopy size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        )}
                    </Group>
                ) : (
                    <Text size="xs" c="dimmed">-</Text>
                )}
            </div>
        </Group>
    )
}
