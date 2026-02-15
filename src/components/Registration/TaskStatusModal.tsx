/**
 * TaskStatusModal — หน้าต่างอัพเดทสถานะงาน
 * แสดง: ข้อมูลลูกค้า/ผู้รับผิดชอบ, aging, 5-step stepper, comments, completion date, invoice URL
 */

import { useState, useMemo } from 'react'
import {
    Modal, Text, Group, Box, Stack, Card, Badge, TextInput, Button,
    Progress, ActionIcon, Tooltip, ScrollArea, Textarea, Divider,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
    TbBuilding, TbUser, TbClock, TbSend, TbCalendarCheck,
    TbLink, TbCheck, TbDeviceFloppy, TbMessageCircle,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    registrationTaskService,
    type RegistrationTask,
    type RegistrationTaskUpdateData,
    type TaskComment,
} from '../../services/registrationTaskService'
import { notifications } from '@mantine/notifications'

// Step definitions
const STEPS = [
    { key: 'step_1' as const, label: 'ประสานงานขอเอกสาร', pct: 20 },
    { key: 'step_2' as const, label: 'เตรียมข้อมูล', pct: 40 },
    { key: 'step_3' as const, label: 'รอลูกค้าเตรียมเอกสาร', pct: 60 },
    { key: 'step_4' as const, label: 'รอวิ่งแมส', pct: 80 },
    { key: 'step_5' as const, label: 'ส่งมอบงาน', pct: 100 },
]

interface TaskStatusModalProps {
    opened: boolean
    onClose: () => void
    task: RegistrationTask | null
    onUpdated?: () => void
}

export default function TaskStatusModal({ opened, onClose, task, onUpdated }: TaskStatusModalProps) {
    const queryClient = useQueryClient()

    // Local state for step toggles
    const [steps, setSteps] = useState({
        step_1: false, step_2: false, step_3: false, step_4: false, step_5: false,
    })
    const [completionDate, setCompletionDate] = useState<Date | null>(null)
    const [invoiceUrl, setInvoiceUrl] = useState('')
    const [commentText, setCommentText] = useState('')
    const [initialized, setInitialized] = useState<string | null>(null)

    // Sync local state when task changes
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
        setInitialized(task.id)
    }

    // Fetch comments
    const { data: comments = [], isLoading: commentsLoading } = useQuery(
        `task-comments-${task?.id}`,
        () => task ? registrationTaskService.getComments(task.id) : Promise.resolve([]),
        { enabled: !!task && opened },
    )

    // Mutations
    const updateMutation = useMutation(
        (data: RegistrationTaskUpdateData) =>
            registrationTaskService.update(task!.id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(`registration-tasks-${task?.department}`)
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
                notifications.show({ title: 'สำเร็จ', message: 'เพิ่มความเห็นเรียบร้อย', color: 'green' })
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถเพิ่มความเห็นได้', color: 'red' })
            },
        }
    )

    // Progress calculation — step_5 done = 100% regardless of step_4
    const progress = useMemo(() => {
        if (steps.step_5) return 100
        const completed = Object.values(steps).filter(Boolean).length
        return completed * 20
    }, [steps])

    // Aging (days since received)
    const agingDays = useMemo(() => {
        if (!task) return 0
        const received = new Date(task.received_date)
        const now = new Date()
        return Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24))
    }, [task])

    const agingColor = agingDays <= 7 ? 'green' : agingDays <= 14 ? 'orange' : 'red'

    // Toggle step — allow skipping step_4 when checking step_5
    const toggleStep = (stepKey: keyof typeof steps) => {
        setSteps(prev => {
            const stepIndex = STEPS.findIndex(s => s.key === stepKey)
            const isActive = prev[stepKey]
            if (isActive) {
                // Unchecking: also uncheck all steps after this one
                const updated = { ...prev }
                STEPS.forEach((s, i) => {
                    if (i >= stepIndex) updated[s.key] = false
                })
                return updated
            } else {
                // Checking: require all previous steps except step_4 when checking step_5
                for (let i = 0; i < stepIndex; i++) {
                    if (i === 3 && stepIndex === 4) continue // allow skip step_4
                    if (!prev[STEPS[i].key]) {
                        notifications.show({
                            title: 'ไม่สามารถข้ามขั้นตอน',
                            message: `กรุณาทำขั้นตอน "${STEPS[i].label}" ให้เสร็จก่อน`,
                            color: 'orange',
                        })
                        return prev
                    }
                }
                return { ...prev, [stepKey]: true }
            }
        })
    }

    // Handle save
    const handleSave = () => {
        if (!task) return

        // Determine status — step_5 done = completed regardless of step_4
        let status: string = task.status
        if (steps.step_5) status = 'completed'
        else if (Object.values(steps).some(Boolean)) status = 'in_progress'
        else status = 'pending'

        updateMutation.mutate({
            ...steps,
            status,
            completion_date: completionDate ? completionDate.toISOString().split('T')[0] : null,
            invoice_url: invoiceUrl || null,
        })
    }

    // Handle add comment
    const handleAddComment = () => {
        if (!commentText.trim()) return
        addCommentMutation.mutate(commentText.trim())
    }

    // Format date for display
    const formatThaiDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
        } catch { return dateStr }
    }

    const formatTime = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        } catch { return '' }
    }

    if (!task) return null

    return (
        <Modal
            opened={opened}
            onClose={() => { onClose(); setInitialized(null) }}
            title={
                <Text fw={700} size="lg" c="white">อัพเดทสถานะงาน</Text>
            }
            size="lg"
            radius="lg"
            centered
            styles={{
                header: {
                    background: 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
                    borderRadius: '12px 12px 0 0',
                    padding: '16px 20px',
                },
                close: { color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } },
                body: { padding: '0' },
            }}
        >
            <Stack gap={0}>
                {/* Client & Person Info */}
                <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                    <Text size="xs" c="dimmed" mb={6}>Client & Person Info</Text>
                    <Group grow gap="sm">
                        <Card
                            withBorder radius="md" p="sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                        >
                            <Group gap="xs" wrap="nowrap">
                                <Box style={{
                                    width: 32, height: 32, borderRadius: 6,
                                    background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <TbBuilding size={16} color="white" />
                                </Box>
                                <Text size="sm" fw={600} truncate>{task.client_name}</Text>
                            </Group>
                        </Card>
                        <Card
                            withBorder radius="md" p="sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                        >
                            <Group gap="xs" wrap="nowrap">
                                <Box style={{
                                    width: 32, height: 32, borderRadius: 6,
                                    background: 'linear-gradient(135deg, #607D8B, #455A64)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <TbUser size={16} color="white" />
                                </Box>
                                <Text size="sm" fw={600} truncate>{task.responsible_name}</Text>
                            </Group>
                        </Card>
                    </Group>
                </Box>

                {/* Aging Badge */}
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

                    {/* Stepper circles */}
                    <Box style={{ position: 'relative' }}>
                        {/* Connection line */}
                        <Box style={{
                            position: 'absolute',
                            top: 18,
                            left: '8%',
                            right: '8%',
                            height: 3,
                            background: '#e9ecef',
                            borderRadius: 2,
                            zIndex: 0,
                        }} />
                        {/* Active line */}
                        <Box style={{
                            position: 'absolute',
                            top: 18,
                            left: '8%',
                            width: `${Math.max(0, (Object.values(steps).filter(Boolean).length - 1)) * 21.5}%`,
                            height: 3,
                            background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                            borderRadius: 2,
                            zIndex: 1,
                            transition: 'width 0.3s ease',
                        }} />

                        <Group justify="space-between" style={{ position: 'relative', zIndex: 2 }}>
                            {STEPS.map((step, i) => {
                                const isActive = steps[step.key]
                                // Find current active step (first uncompleted)
                                const firstUncompleted = STEPS.findIndex(s => !steps[s.key])
                                const isCurrent = i === firstUncompleted
                                return (
                                    <Tooltip key={step.key} label={`${step.label} — คลิกเพื่อ${isActive ? 'ยกเลิก' : 'เปิด'}`} withArrow>
                                        <Box
                                            style={{ textAlign: 'center', cursor: 'pointer', flex: 1 }}
                                            onClick={() => toggleStep(step.key)}
                                        >
                                            <Box style={{
                                                width: 36, height: 36,
                                                borderRadius: '50%',
                                                background: isActive
                                                    ? 'linear-gradient(135deg, #4CAF50, #66BB6A)'
                                                    : isCurrent
                                                        ? 'linear-gradient(135deg, #2196F3, #42A5F5)'
                                                        : '#e9ecef',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '0 auto',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isActive
                                                    ? '0 2px 8px rgba(76,175,80,0.3)'
                                                    : isCurrent
                                                        ? '0 2px 8px rgba(33,150,243,0.3)'
                                                        : 'none',
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
                                                c={isActive ? 'green' : isCurrent ? 'blue' : 'dimmed'}
                                                fw={isActive || isCurrent ? 600 : 400}
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

                    {/* Progress bar */}
                    <Group justify="flex-end" mt={8}>
                        <Text size="xs" c={progress === 100 ? 'green' : 'blue'} fw={600}>
                            ความคืบหน้า {progress}%
                        </Text>
                    </Group>
                    <Progress
                        value={progress}
                        color={progress === 100 ? 'green' : progress >= 60 ? 'blue' : 'orange'}
                        size="sm"
                        radius="xl"
                        animated={progress > 0 && progress < 100}
                        mt={4}
                    />
                </Box>

                <Divider my="md" />

                {/* Comments Section */}
                <Box px="md">
                    <Group gap="xs" mb={8}>
                        <TbMessageCircle size={16} />
                        <Text size="sm" fw={600}>Comments Section</Text>
                        {comments.length > 0 && (
                            <Badge size="xs" variant="light" color="blue">{comments.length}</Badge>
                        )}
                    </Group>

                    {comments.length > 0 ? (
                        <ScrollArea h={Math.min(comments.length * 55, 180)} mb="sm">
                            <Stack gap={6}>
                                {comments.map((comment: TaskComment, idx: number) => (
                                    <Group key={comment.id} gap="xs" wrap="nowrap" align="flex-start">
                                        <Box style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            backgroundColor: ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#f44336'][idx % 5],
                                            flexShrink: 0,
                                            marginTop: 6,
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <Group gap={4} wrap="nowrap">
                                                <Text size="xs" c="dimmed">
                                                    {formatThaiDate(comment.created_at)} {formatTime(comment.created_at)}
                                                </Text>
                                                <Text size="xs" fw={600} c="blue">
                                                    {comment.user_name}:
                                                </Text>
                                            </Group>
                                            <Text size="xs">{comment.message}</Text>
                                        </div>
                                    </Group>
                                ))}
                            </Stack>
                        </ScrollArea>
                    ) : (
                        <Text size="xs" c="dimmed" mb="sm" ta="center" py="xs">
                            ยังไม่มีความเห็น
                        </Text>
                    )}

                    {/* Add comment input */}
                    <Group gap="xs" mb="md">
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
                            color="teal"
                            size="sm"
                            onClick={handleAddComment}
                            loading={addCommentMutation.isLoading}
                            disabled={!commentText.trim()}
                        >
                            เพิ่มความเห็น
                        </Button>
                    </Group>
                </Box>

                <Divider />

                {/* Completion Date & Invoice URL */}
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
                                clearable
                                size="sm"
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

                {/* Footer Buttons */}
                <Box
                    px="md" py="sm"
                    style={{
                        borderTop: '1px solid var(--mantine-color-gray-2)',
                        backgroundColor: '#fafafa',
                        borderRadius: '0 0 12px 12px',
                    }}
                >
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="default"
                            onClick={() => { onClose(); setInitialized(null) }}
                        >
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
            </Stack>
        </Modal>
    )
}
