/**
 * Registration Settings Modal
 * Modal สำหรับจัดการประเภทงานและรายการย่อยแต่ละหน่วยงาน
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Modal, Stack, Group, Text, TextInput, Button, ActionIcon, Card, Badge,
    Tabs, Box, Loader, Accordion, Tooltip, Divider, ThemeIcon
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
    TbPlus, TbTrash, TbEdit, TbCheck, TbX, TbBuildingBank, TbReceiptTax,
    TbShieldCheck, TbUsers, TbSettings, TbListDetails
} from 'react-icons/tb'
import {
    WorkType, WorkSubType, Department,
    getWorkTypes, createWorkType, updateWorkType, deleteWorkType,
    createSubType, updateSubType, deleteSubType
} from '../../services/registrationWorkService'

interface RegistrationSettingsModalProps {
    opened: boolean
    onClose: () => void
    onDataChanged?: () => void
}

const departmentConfig: { key: Department; label: string; icon: React.ComponentType<any>; color: string }[] = [
    { key: 'dbd', label: 'DBD', icon: TbBuildingBank, color: '#1565c0' },
    { key: 'rd', label: 'RD', icon: TbReceiptTax, color: '#e65100' },
    { key: 'sso', label: 'SSO', icon: TbShieldCheck, color: '#2e7d32' },
    { key: 'hr', label: 'HR', icon: TbUsers, color: '#7b1fa2' },
]

export default function RegistrationSettingsModal({ opened, onClose, onDataChanged }: RegistrationSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<string>('dbd')
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

    const fetchTypes = useCallback(async () => {
        setLoading(true)
        try {
            const types = await getWorkTypes(activeTab as Department)
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
    }, [activeTab])

    useEffect(() => {
        if (opened) {
            fetchTypes()
        }
    }, [opened, fetchTypes])

    // ============================================================
    // Work Type Handlers
    // ============================================================

    const handleAddType = async () => {
        if (!newTypeName.trim()) return
        setAddingType(true)
        try {
            await createWorkType({ department: activeTab as Department, name: newTypeName.trim() })
            setNewTypeName('')
            notifications.show({ title: 'สำเร็จ', message: 'เพิ่มประเภทงานแล้ว', color: 'green' })
            fetchTypes()
            onDataChanged?.()
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
            onDataChanged?.()
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
            onDataChanged?.()
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
            onDataChanged?.()
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
            onDataChanged?.()
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
            onDataChanged?.()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถลบได้',
                color: 'red'
            })
        }
    }

    const currentDept = departmentConfig.find(d => d.key === activeTab)

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="sm">
                    <TbSettings size={22} />
                    <Text fw={700} size="lg">ตั้งค่าระบบงานทะเบียน</Text>
                </Group>
            }
            size="lg"
            radius="lg"
        >
            <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'dbd')}>
                <Tabs.List grow mb="md">
                    {departmentConfig.map(dept => {
                        const Icon = dept.icon
                        return (
                            <Tabs.Tab key={dept.key} value={dept.key} leftSection={<Icon size={16} />}>
                                {dept.label}
                            </Tabs.Tab>
                        )
                    })}
                </Tabs.List>

                {departmentConfig.map(dept => (
                    <Tabs.Panel key={dept.key} value={dept.key}>
                        <Stack gap="md">
                            {/* Add new type */}
                            <Card withBorder radius="md" p="sm" style={{ borderColor: dept.color + '40' }}>
                                <Group gap="sm">
                                    <TextInput
                                        placeholder="ชื่อประเภทงานใหม่..."
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.currentTarget.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                                        style={{ flex: 1 }}
                                        size="sm"
                                    />
                                    <Button
                                        size="sm"
                                        leftSection={<TbPlus size={16} />}
                                        onClick={handleAddType}
                                        loading={addingType}
                                        color={dept.color}
                                        disabled={!newTypeName.trim()}
                                    >
                                        เพิ่ม
                                    </Button>
                                </Group>
                            </Card>

                            {/* Loading */}
                            {loading && (
                                <Box ta="center" py="xl">
                                    <Loader size="sm" />
                                </Box>
                            )}

                            {/* Empty state */}
                            {!loading && workTypes.length === 0 && (
                                <Box ta="center" py="xl">
                                    <TbListDetails size={40} color="#ccc" />
                                    <Text c="dimmed" size="sm" mt="sm">
                                        ยังไม่มีประเภทงาน — เพิ่มประเภทงานแรกด้านบน
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
                                                                onChange={(e) => setEditTypeName(e.currentTarget.value)}
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
                                                            <Text fw={600} size="sm">{type.name}</Text>
                                                            <Badge size="xs" variant="light" color={currentDept?.color}>
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
                                                                padding: '6px 12px',
                                                                borderRadius: 8,
                                                                backgroundColor: '#f8f9fa',
                                                            }}
                                                        >
                                                            {editingSubId === sub.id ? (
                                                                <Group gap="xs" style={{ flex: 1 }}>
                                                                    <TextInput
                                                                        value={editSubName}
                                                                        onChange={(e) => setEditSubName(e.currentTarget.value)}
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
                                                            onChange={(e) => setNewSubName(prev => ({ ...prev, [type.id]: e.currentTarget.value }))}
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
                    </Tabs.Panel>
                ))}
            </Tabs>
        </Modal>
    )
}
