/**
 * Registration Settings Page (ตั้งค่าระบบงานทะเบียน)
 * Master-Detail Layout: ด้านซ้ายเป็นรายการหน่วยงาน, ด้านขวาแสดงประเภทงาน
 * เข้าถึงได้เฉพาะ role: admin, registration
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Container, Stack, Group, Text, TextInput, Button, ActionIcon, Card, Badge,
    Box, Loader, Accordion, Tooltip, Divider, ThemeIcon, Title, Paper, Grid, ScrollArea,
    ColorSwatch, ColorPicker,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
    TbPlus, TbTrash, TbEdit, TbCheck, TbX, TbBuildingBank, TbReceiptTax,
    TbShieldCheck, TbUsers, TbSettings, TbListDetails, TbChevronRight,
    TbUsersGroup,
} from 'react-icons/tb'
import {
    WorkType, Department,
    getWorkTypes, createWorkType, updateWorkType, deleteWorkType,
    createSubType, updateSubType, deleteSubType,
    TeamStatus, getTeamStatuses, createTeamStatus, updateTeamStatus, deleteTeamStatus,
} from '../services/registrationWorkService'

const departmentConfig: { key: Department; label: string; fullLabel: string; icon: React.ComponentType<any>; color: string; gradient: string }[] = [
    { key: 'dbd', label: 'DBD', fullLabel: 'กรมพัฒนาธุรกิจการค้า', icon: TbBuildingBank, color: '#6a1b9a', gradient: 'linear-gradient(135deg, #6a1b9a 0%, #ab47bc 100%)' },
    { key: 'rd', label: 'RD', fullLabel: 'กรมสรรพากร', icon: TbReceiptTax, color: '#2e7d32', gradient: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' },
    { key: 'sso', label: 'SSO', fullLabel: 'สำนักงานประกันสังคม', icon: TbShieldCheck, color: '#1565c0', gradient: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)' },
    { key: 'hr', label: 'HR', fullLabel: 'งานฝ่ายบุคคล', icon: TbUsers, color: '#c62828', gradient: 'linear-gradient(135deg, #c62828 0%, #ef5350 100%)' },
]

export default function RegistrationSettings() {
    const [activeDept, setActiveDept] = useState<Department>('dbd')
    const [workTypes, setWorkTypes] = useState<WorkType[]>([])
    const [loading, setLoading] = useState(false)
    const [newTypeName, setNewTypeName] = useState('')
    const [addingType, setAddingType] = useState(false)
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
    const [editTypeName, setEditTypeName] = useState('')
    const [newSubName, setNewSubName] = useState<Record<string, string>>({})
    const [addingSubFor, setAddingSubFor] = useState<string | null>(null)
    const [editingSubId, setEditingSubId] = useState<string | null>(null)
    const [editSubName, setEditSubName] = useState('')

    // Team Status state
    const [teamStatuses, setTeamStatuses] = useState<TeamStatus[]>([])
    const [loadingTeam, setLoadingTeam] = useState(false)
    const [newTeamName, setNewTeamName] = useState('')
    const [newTeamColor, setNewTeamColor] = useState('#228be6')
    const [addingTeam, setAddingTeam] = useState(false)
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
    const [editTeamName, setEditTeamName] = useState('')
    const [editTeamColor, setEditTeamColor] = useState('')

    const currentDept = departmentConfig.find(d => d.key === activeDept)!

    const fetchTypes = useCallback(async () => {
        setLoading(true)
        try {
            const types = await getWorkTypes(activeDept)
            setWorkTypes(types)
        } catch (error: any) {
            console.error('Fetch work types error:', error)
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้',
                color: 'red'
            })
        } finally {
            setLoading(false)
        }
    }, [activeDept])

    useEffect(() => {
        fetchTypes()
    }, [fetchTypes])

    // Reset form states when switching department
    useEffect(() => {
        setNewTypeName('')
        setEditingTypeId(null)
        setEditingSubId(null)
        setNewSubName({})
    }, [activeDept])

    // ============================================================
    // Work Type Handlers
    // ============================================================
    const handleAddType = async () => {
        if (!newTypeName.trim()) return
        setAddingType(true)
        try {
            await createWorkType({ department: activeDept, name: newTypeName.trim() })
            setNewTypeName('')
            notifications.show({ title: 'สำเร็จ', message: 'เพิ่มประเภทงานแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถเพิ่มได้',
                color: 'red'
            })
        } finally {
            setAddingType(false)
        }
    }

    const handleUpdateType = async (id: string) => {
        if (!editTypeName.trim()) return
        try {
            await updateWorkType(id, { name: editTypeName.trim() })
            setEditingTypeId(null)
            notifications.show({ title: 'สำเร็จ', message: 'แก้ไขประเภทงานแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถแก้ไขได้',
                color: 'red'
            })
        }
    }

    const handleDeleteType = async (id: string, name: string) => {
        if (!window.confirm(`ต้องการลบประเภทงาน "${name}" และรายการย่อยทั้งหมดหรือไม่?`)) return
        try {
            await deleteWorkType(id)
            notifications.show({ title: 'สำเร็จ', message: 'ลบประเภทงานแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถลบได้',
                color: 'red'
            })
        }
    }

    // ============================================================
    // Sub Type Handlers
    // ============================================================
    const handleAddSub = async (workTypeId: string) => {
        const name = newSubName[workTypeId]?.trim()
        if (!name) return
        setAddingSubFor(workTypeId)
        try {
            await createSubType({ work_type_id: workTypeId, name })
            setNewSubName(prev => ({ ...prev, [workTypeId]: '' }))
            notifications.show({ title: 'สำเร็จ', message: 'เพิ่มรายการย่อยแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถเพิ่มได้',
                color: 'red'
            })
        } finally {
            setAddingSubFor(null)
        }
    }

    const handleUpdateSub = async (id: string) => {
        if (!editSubName.trim()) return
        try {
            await updateSubType(id, { name: editSubName.trim() })
            setEditingSubId(null)
            notifications.show({ title: 'สำเร็จ', message: 'แก้ไขรายการย่อยแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถแก้ไขได้',
                color: 'red'
            })
        }
    }

    const handleDeleteSub = async (id: string, name: string) => {
        if (!window.confirm(`ต้องการลบรายการย่อย "${name}" หรือไม่?`)) return
        try {
            await deleteSubType(id)
            notifications.show({ title: 'สำเร็จ', message: 'ลบรายการย่อยแล้ว', color: 'green' })
            fetchTypes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถลบได้',
                color: 'red'
            })
        }
    }

    const totalSubs = workTypes.reduce((sum, t) => sum + t.sub_types.length, 0)
    const DeptIcon = currentDept.icon

    // ============================================================
    // Team Status Handlers
    // ============================================================
    const fetchTeamStatuses = useCallback(async () => {
        setLoadingTeam(true)
        try {
            const statuses = await getTeamStatuses()
            setTeamStatuses(statuses)
        } catch (error: any) {
            console.error('Fetch team statuses error:', error)
        } finally {
            setLoadingTeam(false)
        }
    }, [])

    useEffect(() => {
        fetchTeamStatuses()
    }, [fetchTeamStatuses])

    const handleAddTeamStatus = async () => {
        if (!newTeamName.trim()) return
        setAddingTeam(true)
        try {
            await createTeamStatus({ name: newTeamName.trim(), color: newTeamColor })
            setNewTeamName('')
            setNewTeamColor('#228be6')
            notifications.show({ title: 'สำเร็จ', message: 'เพิ่มสถานะทีมแล้ว', color: 'green' })
            fetchTeamStatuses()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถเพิ่มได้',
                color: 'red'
            })
        } finally {
            setAddingTeam(false)
        }
    }

    const handleUpdateTeamStatus = async (id: string) => {
        if (!editTeamName.trim()) return
        try {
            await updateTeamStatus(id, { name: editTeamName.trim(), color: editTeamColor })
            setEditingTeamId(null)
            notifications.show({ title: 'สำเร็จ', message: 'แก้ไขสถานะทีมแล้ว', color: 'green' })
            fetchTeamStatuses()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถแก้ไขได้',
                color: 'red'
            })
        }
    }

    const handleDeleteTeamStatus = async (id: string, name: string) => {
        if (!window.confirm(`ต้องการลบสถานะ "${name}" หรือไม่? งานที่ใช้สถานะนี้จะถูกเคลียร์`)) return
        try {
            await deleteTeamStatus(id)
            notifications.show({ title: 'สำเร็จ', message: 'ลบสถานะทีมแล้ว', color: 'green' })
            fetchTeamStatuses()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถลบได้',
                color: 'red'
            })
        }
    }

    const TEAM_COLOR_SWATCHES = [
        '#f44336', '#E91E63', '#9C27B0', '#673AB7',
        '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
        '#009688', '#4CAF50', '#8BC34A', '#FF9800',
        '#FF5722', '#795548', '#607D8B', '#228be6',
    ]

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                {/* Header Banner */}
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #455a64 0%, #78909c 100%)',
                        border: 'none',
                    }}
                >
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
                            <TbSettings size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>
                                ตั้งค่าระบบ
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                จัดการประเภทงานและรายการย่อยสำหรับแต่ละหน่วยงาน
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Section Title */}
                <Group gap="sm">
                    <ThemeIcon size={32} radius="md" variant="light" color="gray">
                        <TbListDetails size={20} />
                    </ThemeIcon>
                    <div>
                        <Text size="lg" fw={700}>ข้อมูลประเภทงานของหน่วยงาน</Text>
                        <Text size="xs" c="dimmed">เลือกหน่วยงานด้านซ้ายเพื่อดูและจัดการประเภทงาน</Text>
                    </div>
                </Group>

                {/* Master-Detail Layout */}
                <Grid gutter="md">
                    {/* ======================== LEFT PANEL - Department List ======================== */}
                    <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
                        <Card withBorder radius="lg" p="sm" style={{ position: 'sticky', top: 90 }}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm" px="xs">
                                หน่วยงาน
                            </Text>
                            <Stack gap={6}>
                                {departmentConfig.map(dept => {
                                    const Icon = dept.icon
                                    const isActive = activeDept === dept.key
                                    return (
                                        <Paper
                                            key={dept.key}
                                            radius="md"
                                            p="sm"
                                            onClick={() => setActiveDept(dept.key)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isActive ? dept.color + '12' : 'transparent',
                                                borderLeft: `3px solid ${isActive ? dept.color : 'transparent'}`,
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                                                }
                                            }}
                                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                                }
                                            }}
                                        >
                                            <Group justify="space-between" wrap="nowrap">
                                                <Group gap="sm" wrap="nowrap">
                                                    <ThemeIcon
                                                        size={36}
                                                        radius="md"
                                                        variant={isActive ? 'filled' : 'light'}
                                                        color={dept.color}
                                                        style={isActive ? { background: dept.gradient } : {}}
                                                    >
                                                        <Icon size={20} color={isActive ? 'white' : dept.color} />
                                                    </ThemeIcon>
                                                    <div>
                                                        <Text size="sm" fw={isActive ? 700 : 500} c={isActive ? dept.color : 'dark'}>
                                                            {dept.fullLabel}
                                                        </Text>
                                                        <Badge size="xs" variant="light" color={dept.color}>
                                                            {dept.label}
                                                        </Badge>
                                                    </div>
                                                </Group>
                                                {isActive && (
                                                    <TbChevronRight size={16} color={dept.color} />
                                                )}
                                            </Group>
                                        </Paper>
                                    )
                                })}
                            </Stack>
                        </Card>
                    </Grid.Col>

                    {/* ======================== RIGHT PANEL - Work Types Detail ======================== */}
                    <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
                        <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                            {/* Department Header */}
                            <Box
                                p="md"
                                style={{
                                    background: currentDept.gradient,
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="md">
                                        <Box
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: 'rgba(255,255,255,0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <DeptIcon size={24} color="white" />
                                        </Box>
                                        <div>
                                            <Group gap="xs">
                                                <Text size="lg" fw={700} c="white">
                                                    {currentDept.fullLabel}
                                                </Text>
                                                <Badge
                                                    size="sm"
                                                    variant="white"
                                                    style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }}
                                                >
                                                    {currentDept.label}
                                                </Badge>
                                            </Group>
                                            <Text size="xs" c="rgba(255,255,255,0.8)">
                                                {workTypes.length} ประเภทงาน • {totalSubs} รายการย่อย
                                            </Text>
                                        </div>
                                    </Group>
                                </Group>
                            </Box>

                            {/* Content */}
                            <Box p="md">
                                <Stack gap="md">
                                    {/* Add new type */}
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            border: `1px solid ${currentDept.color}30`,
                                            backgroundColor: currentDept.color + '06',
                                        }}
                                    >
                                        <Text size="sm" fw={600} mb="xs" c={currentDept.color}>
                                            เพิ่มประเภทงานใหม่
                                        </Text>
                                        <Group gap="sm">
                                            <TextInput
                                                placeholder="ชื่อประเภทงาน..."
                                                value={newTypeName}
                                                onChange={(e) => { const val = e.currentTarget.value; setNewTypeName(val) }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                                                style={{ flex: 1 }}
                                                size="sm"
                                            />
                                            <Button
                                                size="sm"
                                                leftSection={<TbPlus size={16} />}
                                                onClick={handleAddType}
                                                loading={addingType}
                                                color={currentDept.color}
                                                disabled={!newTypeName.trim()}
                                            >
                                                เพิ่มประเภทงาน
                                            </Button>
                                        </Group>
                                    </Paper>

                                    {/* Loading */}
                                    {loading && (
                                        <Box ta="center" py="xl">
                                            <Loader size="sm" />
                                        </Box>
                                    )}

                                    {/* Empty state */}
                                    {!loading && workTypes.length === 0 && (
                                        <Box ta="center" py="xl">
                                            <TbListDetails size={48} color="#ccc" />
                                            <Text c="dimmed" size="sm" mt="sm">
                                                ยังไม่มีประเภทงานสำหรับ{currentDept.fullLabel}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                เพิ่มประเภทงานแรกด้านบน
                                            </Text>
                                        </Box>
                                    )}

                                    {/* Work Types List */}
                                    {!loading && workTypes.length > 0 && (
                                        <Accordion variant="separated" radius="md">
                                            {workTypes.map(type => (
                                                <Accordion.Item key={type.id} value={type.id}>
                                                    <Accordion.Control>
                                                        <Group justify="space-between" wrap="nowrap" pr="xs">
                                                            {editingTypeId === type.id ? (
                                                                <Group gap="xs" style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                                                    <TextInput
                                                                        value={editTypeName}
                                                                        onChange={(e) => { const val = e.currentTarget.value; setEditTypeName(val) }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleUpdateType(type.id)
                                                                            if (e.key === 'Escape') setEditingTypeId(null)
                                                                        }}
                                                                        size="xs"
                                                                        style={{ flex: 1 }}
                                                                        autoFocus
                                                                    />
                                                                    <ActionIcon size="sm" color="green" variant="light" onClick={() => handleUpdateType(type.id)}>
                                                                        <TbCheck size={14} />
                                                                    </ActionIcon>
                                                                    <ActionIcon size="sm" color="gray" variant="light" onClick={() => setEditingTypeId(null)}>
                                                                        <TbX size={14} />
                                                                    </ActionIcon>
                                                                </Group>
                                                            ) : (
                                                                <Group gap="sm">
                                                                    <ThemeIcon size={28} radius="md" variant="light" color={currentDept.color}>
                                                                        <TbListDetails size={16} />
                                                                    </ThemeIcon>
                                                                    <Text fw={600} size="sm">{type.name}</Text>
                                                                    <Badge size="xs" variant="light" color={currentDept.color}>
                                                                        {type.sub_types.length} รายการย่อย
                                                                    </Badge>
                                                                </Group>
                                                            )}
                                                            {editingTypeId !== type.id && (
                                                                <Group gap={4} onClick={(e) => e.stopPropagation()}>
                                                                    <Tooltip label="แก้ไข">
                                                                        <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => {
                                                                            setEditingTypeId(type.id)
                                                                            setEditTypeName(type.name)
                                                                        }}>
                                                                            <TbEdit size={14} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label="ลบ">
                                                                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDeleteType(type.id, type.name)}>
                                                                            <TbTrash size={14} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                            )}
                                                        </Group>
                                                    </Accordion.Control>
                                                    <Accordion.Panel>
                                                        <Stack gap="xs">
                                                            {/* Sub types list */}
                                                            {type.sub_types.map(sub => (
                                                                <Group key={sub.id} gap="xs" justify="space-between"
                                                                    style={{
                                                                        padding: '8px 14px',
                                                                        borderRadius: 8,
                                                                        backgroundColor: '#f8f9fa',
                                                                    }}
                                                                >
                                                                    {editingSubId === sub.id ? (
                                                                        <Group gap="xs" style={{ flex: 1 }}>
                                                                            <TextInput
                                                                                value={editSubName}
                                                                                onChange={(e) => { const val = e.currentTarget.value; setEditSubName(val) }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleUpdateSub(sub.id)
                                                                                    if (e.key === 'Escape') setEditingSubId(null)
                                                                                }}
                                                                                size="xs"
                                                                                style={{ flex: 1 }}
                                                                                autoFocus
                                                                            />
                                                                            <ActionIcon size="sm" color="green" variant="light" onClick={() => handleUpdateSub(sub.id)}>
                                                                                <TbCheck size={14} />
                                                                            </ActionIcon>
                                                                            <ActionIcon size="sm" color="gray" variant="light" onClick={() => setEditingSubId(null)}>
                                                                                <TbX size={14} />
                                                                            </ActionIcon>
                                                                        </Group>
                                                                    ) : (
                                                                        <>
                                                                            <Text size="sm">• {sub.name}</Text>
                                                                            <Group gap={4}>
                                                                                <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => {
                                                                                    setEditingSubId(sub.id)
                                                                                    setEditSubName(sub.name)
                                                                                }}>
                                                                                    <TbEdit size={12} />
                                                                                </ActionIcon>
                                                                                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleDeleteSub(sub.id, sub.name)}>
                                                                                    <TbTrash size={12} />
                                                                                </ActionIcon>
                                                                            </Group>
                                                                        </>
                                                                    )}
                                                                </Group>
                                                            ))}

                                                            {type.sub_types.length === 0 && (
                                                                <Text size="xs" c="dimmed" ta="center" py="xs">
                                                                    ยังไม่มีรายการย่อย
                                                                </Text>
                                                            )}

                                                            {/* Add sub type */}
                                                            <Divider />
                                                            <Group gap="xs">
                                                                <TextInput
                                                                    placeholder="เพิ่มรายการย่อย..."
                                                                    value={newSubName[type.id] || ''}
                                                                    onChange={(e) => { const val = e.currentTarget.value; setNewSubName(prev => ({ ...prev, [type.id]: val })) }}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSub(type.id)}
                                                                    size="xs"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <Button
                                                                    size="xs"
                                                                    variant="light"
                                                                    leftSection={<TbPlus size={14} />}
                                                                    onClick={() => handleAddSub(type.id)}
                                                                    loading={addingSubFor === type.id}
                                                                    disabled={!newSubName[type.id]?.trim()}
                                                                >
                                                                    เพิ่ม
                                                                </Button>
                                                            </Group>
                                                        </Stack>
                                                    </Accordion.Panel>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>
                                    )}
                                </Stack>
                            </Box>
                        </Card>
                    </Grid.Col>
                </Grid>

                {/* ======================== TEAM STATUS SECTION ======================== */}
                <Divider />

                <Group gap="sm">
                    <ThemeIcon size={32} radius="md" variant="light" color="cyan">
                        <TbUsersGroup size={20} />
                    </ThemeIcon>
                    <div>
                        <Text size="lg" fw={700}>สถานะการทำงานในทีม</Text>
                        <Text size="xs" c="dimmed">กำหนดตัวเลือกสถานะทีมที่ใช้ในระบบ (ใช้ร่วมกันทุกหน่วยงาน)</Text>
                    </div>
                </Group>

                <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                    {/* Header */}
                    <Box p="md" style={{ background: 'linear-gradient(135deg, #0097a7 0%, #00bcd4 100%)' }}>
                        <Group gap="md">
                            <Box style={{
                                width: 44, height: 44, borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TbUsersGroup size={24} color="white" />
                            </Box>
                            <div>
                                <Text size="lg" fw={700} c="white">สถานะการทำงานในทีม</Text>
                                <Text size="xs" c="rgba(255,255,255,0.8)">
                                    {teamStatuses.length} สถานะ
                                </Text>
                            </div>
                        </Group>
                    </Box>

                    {/* Content */}
                    <Box p="md">
                        <Stack gap="md">
                            {/* Add new team status */}
                            <Paper p="sm" radius="md" style={{ border: '1px solid #00bcd430', backgroundColor: '#00bcd406' }}>
                                <Text size="sm" fw={600} mb="xs" c="#0097a7">เพิ่มสถานะใหม่</Text>
                                <Group gap="sm" align="flex-end">
                                    <TextInput
                                        placeholder="ชื่อสถานะ เช่น รอดำเนินการ, กำลังตรวจสอบ..."
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.currentTarget.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTeamStatus()}
                                        style={{ flex: 1 }}
                                        size="sm"
                                    />
                                    <Group gap={6}>
                                        {TEAM_COLOR_SWATCHES.slice(0, 8).map(c => (
                                            <ColorSwatch
                                                key={c}
                                                color={c}
                                                size={22}
                                                onClick={() => setNewTeamColor(c)}
                                                style={{
                                                    cursor: 'pointer',
                                                    border: newTeamColor === c ? '2px solid #333' : '2px solid transparent',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        ))}
                                    </Group>
                                    <Button
                                        size="sm"
                                        leftSection={<TbPlus size={16} />}
                                        onClick={handleAddTeamStatus}
                                        loading={addingTeam}
                                        color="cyan"
                                        disabled={!newTeamName.trim()}
                                    >
                                        เพิ่มสถานะ
                                    </Button>
                                </Group>
                            </Paper>

                            {/* Loading */}
                            {loadingTeam && (
                                <Box ta="center" py="xl"><Loader size="sm" /></Box>
                            )}

                            {/* Empty */}
                            {!loadingTeam && teamStatuses.length === 0 && (
                                <Box ta="center" py="xl">
                                    <TbUsersGroup size={48} color="#ccc" />
                                    <Text c="dimmed" size="sm" mt="sm">ยังไม่มีสถานะทีม</Text>
                                    <Text c="dimmed" size="xs">เพิ่มสถานะแรกด้านบน</Text>
                                </Box>
                            )}

                            {/* Team Statuses List */}
                            {!loadingTeam && teamStatuses.length > 0 && (
                                <Stack gap={6}>
                                    {teamStatuses.map((ts, idx) => (
                                        <Group key={ts.id} gap="sm" justify="space-between"
                                            style={{
                                                padding: '10px 14px', borderRadius: 8,
                                                backgroundColor: '#f8f9fa',
                                            }}
                                        >
                                            {editingTeamId === ts.id ? (
                                                <Group gap="xs" style={{ flex: 1 }} wrap="wrap">
                                                    <TextInput
                                                        value={editTeamName}
                                                        onChange={(e) => setEditTeamName(e.currentTarget.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateTeamStatus(ts.id)
                                                            if (e.key === 'Escape') setEditingTeamId(null)
                                                        }}
                                                        size="xs"
                                                        style={{ flex: 1, minWidth: 150 }}
                                                        autoFocus
                                                    />
                                                    <Group gap={4}>
                                                        {TEAM_COLOR_SWATCHES.map(c => (
                                                            <ColorSwatch
                                                                key={c}
                                                                color={c}
                                                                size={18}
                                                                onClick={() => setEditTeamColor(c)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    border: editTeamColor === c ? '2px solid #333' : '2px solid transparent',
                                                                    borderRadius: '50%',
                                                                }}
                                                            />
                                                        ))}
                                                    </Group>
                                                    <Group gap={4}>
                                                        <ActionIcon size="sm" color="green" variant="light" onClick={() => handleUpdateTeamStatus(ts.id)}>
                                                            <TbCheck size={14} />
                                                        </ActionIcon>
                                                        <ActionIcon size="sm" color="gray" variant="light" onClick={() => setEditingTeamId(null)}>
                                                            <TbX size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Group>
                                            ) : (
                                                <>
                                                    <Group gap="sm">
                                                        <Text size="xs" c="dimmed" w={20} ta="center">{idx + 1}</Text>
                                                        <ColorSwatch color={ts.color} size={20} />
                                                        <Text size="sm" fw={500}>{ts.name}</Text>
                                                    </Group>
                                                    <Group gap={4}>
                                                        <Tooltip label="แก้ไข">
                                                            <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => {
                                                                setEditingTeamId(ts.id)
                                                                setEditTeamName(ts.name)
                                                                setEditTeamColor(ts.color)
                                                            }}>
                                                                <TbEdit size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="ลบ">
                                                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDeleteTeamStatus(ts.id, ts.name)}>
                                                                <TbTrash size={14} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </>
                                            )}
                                        </Group>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Box>
                </Card>
            </Stack>
        </Container>
    )
}
