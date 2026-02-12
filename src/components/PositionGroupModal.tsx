import { useState, useEffect } from 'react'
import {
    Modal,
    Stack,
    Group,
    Text,
    TextInput,
    Button,
    Paper,
    Badge,
    ActionIcon,
    MultiSelect,
    Divider,
    Alert,
    Loader,
    Center,
    ScrollArea,
    Tooltip,
    ColorSwatch,
} from '@mantine/core'
import {
    TbPlus,
    TbTrash,
    TbDeviceFloppy,
    TbAlertCircle,
    TbArrowUp,
    TbArrowDown,
    TbEdit,
    TbCheck,
    TbX,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { positionGroupService, type PositionGroup } from '../services/positionGroupService'
import api from '../services/api'

// Available colors for groups
const GROUP_COLORS = [
    'orange', 'blue', 'green', 'red', 'violet',
    'teal', 'cyan', 'pink', 'grape', 'indigo', 'lime', 'yellow',
]

interface PositionGroupModalProps {
    opened: boolean
    onClose: () => void
    onSaved?: () => void
}

interface EditableGroup {
    name: string
    color: string
    positions: string[]
    isEditingName: boolean
}

export default function PositionGroupModal({ opened, onClose, onSaved }: PositionGroupModalProps) {
    const queryClient = useQueryClient()
    const [groups, setGroups] = useState<EditableGroup[]>([])
    const [hasChanges, setHasChanges] = useState(false)

    // Fetch position groups from API
    const { data: savedGroups, isLoading: isLoadingGroups } = useQuery(
        'position-groups',
        positionGroupService.getAll,
        { enabled: opened }
    )

    // Fetch all available positions from employees
    const { data: allPositions, isLoading: isLoadingPositions } = useQuery(
        'employee-positions',
        async () => {
            const response = await api.get('/employees/positions')
            return response.data.data as string[]
        },
        { enabled: opened }
    )

    // Initialize groups when data is loaded
    useEffect(() => {
        if (savedGroups && opened) {
            setGroups(
                savedGroups.map(g => ({
                    name: g.name,
                    color: g.color || 'orange',
                    positions: [...g.positions],
                    isEditingName: false,
                }))
            )
            setHasChanges(false)
        }
    }, [savedGroups, opened])

    // Save mutation
    const saveMutation = useMutation(
        (data: PositionGroup[]) => positionGroupService.updateAll(data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('position-groups')
                queryClient.invalidateQueries('attendance-dashboard')
                setHasChanges(false)
                onSaved?.()
                onClose()
            },
        }
    )

    // Get positions that are already assigned to a group
    const assignedPositions = groups.flatMap(g => g.positions)

    // Get positions not yet assigned to any group
    const unassignedPositions = (allPositions || []).filter(
        pos => !assignedPositions.includes(pos)
    )

    // All position options for MultiSelect (position name as both value and label)
    const getPositionOptions = (currentGroupPositions: string[]) => {
        // Show: positions already in this group + unassigned positions
        const available = [
            ...currentGroupPositions,
            ...unassignedPositions,
        ]
        return [...new Set(available)].sort((a, b) => a.localeCompare(b, 'th')).map(pos => ({
            value: pos,
            label: pos,
        }))
    }

    // Handlers
    const addGroup = () => {
        setGroups(prev => [
            ...prev,
            { name: 'กลุ่มใหม่', color: GROUP_COLORS[prev.length % GROUP_COLORS.length], positions: [], isEditingName: true },
        ])
        setHasChanges(true)
    }

    const removeGroup = (index: number) => {
        setGroups(prev => prev.filter((_, i) => i !== index))
        setHasChanges(true)
    }

    const updateGroupName = (index: number, name: string) => {
        setGroups(prev => prev.map((g, i) => i === index ? { ...g, name } : g))
        setHasChanges(true)
    }

    const updateGroupColor = (index: number, color: string) => {
        setGroups(prev => prev.map((g, i) => i === index ? { ...g, color } : g))
        setHasChanges(true)
    }

    const updateGroupPositions = (index: number, positions: string[]) => {
        setGroups(prev => prev.map((g, i) => i === index ? { ...g, positions } : g))
        setHasChanges(true)
    }

    const toggleEditName = (index: number) => {
        setGroups(prev => prev.map((g, i) => i === index ? { ...g, isEditingName: !g.isEditingName } : g))
    }

    const moveGroup = (index: number, direction: 'up' | 'down') => {
        setGroups(prev => {
            const newGroups = [...prev]
            const targetIndex = direction === 'up' ? index - 1 : index + 1
            if (targetIndex < 0 || targetIndex >= newGroups.length) return prev
                ;[newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]]
            return newGroups
        })
        setHasChanges(true)
    }

    const handleSave = () => {
        const data: PositionGroup[] = groups.map(g => ({
            name: g.name,
            color: g.color,
            positions: g.positions,
        }))
        saveMutation.mutate(data)
    }

    const isLoading = isLoadingGroups || isLoadingPositions

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <Text fw={700} size="lg">⚙️ จัดกลุ่มตำแหน่ง</Text>
                </Group>
            }
            size="lg"
            centered
            closeOnClickOutside={!hasChanges}
        >
            {isLoading ? (
                <Center py="xl">
                    <Stack align="center" gap="md">
                        <Loader size="md" />
                        <Text size="sm" c="dimmed">กำลังโหลดข้อมูล...</Text>
                    </Stack>
                </Center>
            ) : (
                <Stack gap="md">
                    {/* Instructions */}
                    <Alert variant="light" color="blue" icon={<TbAlertCircle size={16} />}>
                        <Text size="xs">
                            สร้างกลุ่มตำแหน่งเพื่อจัดกลุ่มพนักงานในหน้า Dashboard เลือกตำแหน่งเข้ากลุ่มได้โดยใช้ Dropdown
                        </Text>
                    </Alert>

                    {/* Unassigned positions info */}
                    {unassignedPositions.length > 0 && (
                        <Paper p="xs" radius="md" style={{ border: '1px dashed var(--mantine-color-orange-4)', backgroundColor: 'var(--mantine-color-orange-0)' }}>
                            <Text size="xs" fw={600} c="orange.7" mb={4}>
                                ตำแหน่งที่ยังไม่มีกลุ่ม ({unassignedPositions.length}):
                            </Text>
                            <Group gap={4}>
                                {unassignedPositions.map(pos => (
                                    <Badge key={pos} size="xs" variant="outline" color="orange">{pos}</Badge>
                                ))}
                            </Group>
                        </Paper>
                    )}

                    <Divider />

                    {/* Groups list */}
                    <ScrollArea.Autosize mah={400}>
                        <Stack gap="sm">
                            {groups.map((group, index) => (
                                <Paper
                                    key={index}
                                    p="sm"
                                    radius="md"
                                    withBorder
                                    style={{ borderLeft: `4px solid var(--mantine-color-${group.color}-6)` }}
                                >
                                    <Stack gap="xs">
                                        {/* Group header */}
                                        <Group justify="space-between" wrap="nowrap">
                                            <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                                                <Stack gap={0}>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="gray"
                                                        size={18}
                                                        disabled={index === 0}
                                                        onClick={() => moveGroup(index, 'up')}
                                                        style={{ opacity: index === 0 ? 0.3 : 1 }}
                                                    >
                                                        <TbArrowUp size={14} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="gray"
                                                        size={18}
                                                        disabled={index === groups.length - 1}
                                                        onClick={() => moveGroup(index, 'down')}
                                                        style={{ opacity: index === groups.length - 1 ? 0.3 : 1 }}
                                                    >
                                                        <TbArrowDown size={14} />
                                                    </ActionIcon>
                                                </Stack>
                                                {group.isEditingName ? (
                                                    <TextInput
                                                        size="xs"
                                                        value={group.name}
                                                        onChange={(e) => updateGroupName(index, e.target.value)}
                                                        onBlur={() => toggleEditName(index)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') toggleEditName(index) }}
                                                        autoFocus
                                                        style={{ flex: 1 }}
                                                    />
                                                ) : (
                                                    <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => toggleEditName(index)}>
                                                        <Text size="sm" fw={600}>{group.name}</Text>
                                                        <TbEdit size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                                    </Group>
                                                )}
                                                <Badge size="xs" variant="light" color={group.color}>
                                                    {group.positions.length} ตำแหน่ง
                                                </Badge>
                                            </Group>
                                            <Group gap={4}>
                                                {/* Color picker */}
                                                <Tooltip label="เปลี่ยนสี" withArrow>
                                                    <div style={{ position: 'relative' }}>
                                                        <Group gap={2}>
                                                            {GROUP_COLORS.slice(0, 6).map(color => (
                                                                <ColorSwatch
                                                                    key={color}
                                                                    color={`var(--mantine-color-${color}-6)`}
                                                                    size={16}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        border: group.color === color ? '2px solid var(--mantine-color-dark-4)' : '1px solid var(--mantine-color-gray-3)',
                                                                    }}
                                                                    onClick={() => updateGroupColor(index, color)}
                                                                />
                                                            ))}
                                                        </Group>
                                                    </div>
                                                </Tooltip>
                                                <Tooltip label="ลบกลุ่ม" withArrow>
                                                    <ActionIcon
                                                        variant="light"
                                                        color="red"
                                                        size="sm"
                                                        onClick={() => removeGroup(index)}
                                                    >
                                                        <TbTrash size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>

                                        {/* Position selector */}
                                        <MultiSelect
                                            size="xs"
                                            placeholder="เลือกตำแหน่ง..."
                                            data={getPositionOptions(group.positions)}
                                            value={group.positions}
                                            onChange={(values) => updateGroupPositions(index, values)}
                                            searchable
                                            clearable
                                            maxDropdownHeight={200}
                                        />
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </ScrollArea.Autosize>

                    {/* Add group button */}
                    <Button
                        variant="light"
                        color="teal"
                        leftSection={<TbPlus size={16} />}
                        onClick={addGroup}
                        fullWidth
                    >
                        เพิ่มกลุ่มใหม่
                    </Button>

                    <Divider />

                    {/* Action buttons */}
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={onClose} leftSection={<TbX size={16} />}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="blue"
                            onClick={handleSave}
                            leftSection={<TbDeviceFloppy size={16} />}
                            loading={saveMutation.isLoading}
                            disabled={!hasChanges}
                        >
                            บันทึก
                        </Button>
                    </Group>

                    {saveMutation.isError && (
                        <Alert color="red" icon={<TbAlertCircle size={16} />}>
                            <Text size="xs">เกิดข้อผิดพลาดในการบันทึก กรุณาลองอีกครั้ง</Text>
                        </Alert>
                    )}
                </Stack>
            )}
        </Modal>
    )
}
