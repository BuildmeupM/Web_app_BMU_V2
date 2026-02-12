/**
 * Registration Clients Page
 * หน้าจัดการข้อมูลลูกค้างานทะเบียน
 */

import { useState, useMemo, useEffect } from 'react'
import {
    Container, Title, Stack, Card, Group, Text, Badge, Box, TextInput,
    Button, Table, ActionIcon, Modal, Select, Textarea, Switch, Tooltip,
    Paper, ThemeIcon, Divider, Loader, Center, Alert, ScrollArea, Pagination,
    SimpleGrid,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
    TbPlus, TbEdit, TbTrash, TbSearch, TbAddressBook, TbPhone,
    TbBuildingSkyscraper, TbUsers, TbApi, TbAlertCircle, TbX,
    TbDeviceFloppy, TbFilter,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    registrationClientService,
    type RegistrationClient,
    type RegistrationClientCreateData,
} from '../services/registrationClientService'
import { notifications } from '@mantine/notifications'

// ========== Form Modal Component ==========
interface ClientFormModalProps {
    opened: boolean
    onClose: () => void
    editingClient: RegistrationClient | null
    existingGroups: string[]
}

function ClientFormModal({ opened, onClose, editingClient, existingGroups }: ClientFormModalProps) {
    const queryClient = useQueryClient()
    const isEditing = !!editingClient

    const [formData, setFormData] = useState<RegistrationClientCreateData & { is_active?: boolean }>({
        company_name: '',
        legal_entity_number: '',
        phone: '',
        group_name: '',
        line_api: '',
        notes: '',
    })
    const [customGroup, setCustomGroup] = useState('')
    const [useCustomGroup, setUseCustomGroup] = useState(false)

    // Reset form when modal opens
    useEffect(() => {
        if (opened && editingClient) {
            setFormData({
                company_name: editingClient.company_name,
                legal_entity_number: editingClient.legal_entity_number || '',
                phone: editingClient.phone || '',
                group_name: editingClient.group_name,
                line_api: editingClient.line_api || '',
                notes: editingClient.notes || '',
                is_active: editingClient.is_active,
            })
            setUseCustomGroup(!existingGroups.includes(editingClient.group_name))
            setCustomGroup(!existingGroups.includes(editingClient.group_name) ? editingClient.group_name : '')
        } else if (opened) {
            setFormData({
                company_name: '',
                legal_entity_number: '',
                phone: '',
                group_name: '',
                line_api: '',
                notes: '',
            })
            setUseCustomGroup(false)
            setCustomGroup('')
        }
    }, [opened, editingClient])

    // Create mutation
    const createMutation = useMutation(
        (data: RegistrationClientCreateData) => registrationClientService.create(data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('registration-clients')
                notifications.show({ title: 'สำเร็จ', message: 'เพิ่มลูกค้าทะเบียนสำเร็จ', color: 'green' })
                onClose()
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถเพิ่มข้อมูลได้', color: 'red' })
            },
        }
    )

    // Update mutation
    const updateMutation = useMutation(
        (data: Partial<RegistrationClientCreateData & { is_active: boolean }>) =>
            registrationClientService.update(editingClient!.id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('registration-clients')
                notifications.show({ title: 'สำเร็จ', message: 'แก้ไขข้อมูลสำเร็จ', color: 'green' })
                onClose()
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถแก้ไขข้อมูลได้', color: 'red' })
            },
        }
    )

    const handleSubmit = () => {
        const groupName = useCustomGroup ? customGroup : formData.group_name
        const submitData = { ...formData, group_name: groupName }

        if (!submitData.company_name?.trim()) {
            notifications.show({ title: 'กรุณากรอกข้อมูล', message: 'ชื่อลูกค้า / บริษัท จำเป็นต้องกรอก', color: 'orange' })
            return
        }
        if (!submitData.group_name?.trim()) {
            notifications.show({ title: 'กรุณากรอกข้อมูล', message: 'ชื่อแชทไลน์ จำเป็นต้องกรอก', color: 'orange' })
            return
        }

        if (isEditing) {
            updateMutation.mutate(submitData)
        } else {
            createMutation.mutate(submitData as RegistrationClientCreateData)
        }
    }

    const isSubmitting = createMutation.isLoading || updateMutation.isLoading

    // Group options for Select
    const groupOptions = existingGroups.map(g => ({ value: g, label: g }))

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="teal" variant="light">
                        <TbAddressBook size={16} />
                    </ThemeIcon>
                    <Text fw={700} size="lg">{isEditing ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</Text>
                </Group>
            }
            size="lg"
            centered
        >
            <Stack gap="md">
                {/* Company Name — Required */}
                <TextInput
                    label="ชื่อลูกค้า / บริษัท"
                    placeholder="เช่น บริษัท ABC จำกัด"
                    required
                    leftSection={<TbBuildingSkyscraper size={16} />}
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                />

                <SimpleGrid cols={2}>
                    {/* Legal Entity Number */}
                    <TextInput
                        label="เลขนิติบุคคล"
                        placeholder="เลข 13 หลัก"
                        maxLength={13}
                        value={formData.legal_entity_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, legal_entity_number: e.target.value }))}
                    />

                    {/* Phone */}
                    <TextInput
                        label="เบอร์โทร"
                        placeholder="เช่น 02-xxx-xxxx"
                        leftSection={<TbPhone size={16} />}
                        value={formData.phone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                </SimpleGrid>

                {/* Group Name — Required */}
                <Box>
                    <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>ชื่อแชทไลน์ <Text component="span" c="red">*</Text></Text>
                        <Switch
                            size="xs"
                            label="สร้างชื่อใหม่"
                            checked={useCustomGroup}
                            onChange={(e) => setUseCustomGroup(e.currentTarget.checked)}
                        />
                    </Group>
                    {useCustomGroup ? (
                        <TextInput
                            placeholder="พิมพ์ชื่อแชทไลน์ใหม่..."
                            leftSection={<TbUsers size={16} />}
                            value={customGroup}
                            onChange={(e) => setCustomGroup(e.target.value)}
                        />
                    ) : (
                        <Select
                            placeholder="เลือกชื่อแชทไลน์..."
                            data={groupOptions}
                            value={formData.group_name}
                            onChange={(val) => setFormData(prev => ({ ...prev, group_name: val || '' }))}
                            searchable
                            clearable
                            nothingFoundMessage="ไม่พบชื่อ — ลองสร้างชื่อใหม่"
                            leftSection={<TbUsers size={16} />}
                        />
                    )}
                </Box>

                {/* API Line */}
                <TextInput
                    label="API Line"
                    placeholder="Line API Token / URL"
                    leftSection={<TbApi size={16} />}
                    value={formData.line_api || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, line_api: e.target.value }))}
                />

                {/* Notes */}
                <Textarea
                    label="หมายเหตุ"
                    placeholder="หมายเหตุเพิ่มเติม..."
                    minRows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />

                {/* Active toggle (edit only) */}
                {isEditing && (
                    <Switch
                        label="เปิดใช้งาน (Active)"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.currentTarget.checked }))}
                        color="green"
                    />
                )}

                <Divider />

                {/* Actions */}
                <Group justify="flex-end" gap="sm">
                    <Button variant="default" onClick={onClose} leftSection={<TbX size={16} />}>
                        ยกเลิก
                    </Button>
                    <Button
                        color="blue"
                        onClick={handleSubmit}
                        leftSection={<TbDeviceFloppy size={16} />}
                        loading={isSubmitting}
                    >
                        {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

// ========== Main Page ==========
export default function RegistrationClients() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [groupFilter, setGroupFilter] = useState<string | null>(null)
    const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false)
    const [editingClient, setEditingClient] = useState<RegistrationClient | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState<string>('10')

    // Fetch clients
    const { data, isLoading, error } = useQuery(
        ['registration-clients', search, groupFilter],
        () => registrationClientService.getAll({
            search: search || undefined,
            group: groupFilter || undefined,
        }),
        { keepPreviousData: true }
    )

    // Delete mutation
    const deleteMutation = useMutation(
        (id: string) => registrationClientService.delete(id),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('registration-clients')
                notifications.show({ title: 'สำเร็จ', message: 'ลบลูกค้าทะเบียนสำเร็จ', color: 'green' })
                setDeleteConfirmId(null)
            },
            onError: () => {
                notifications.show({ title: 'ผิดพลาด', message: 'ไม่สามารถลบข้อมูลได้', color: 'red' })
            },
        }
    )

    const clients = data?.clients || []
    const groups = data?.groups || []

    const handleEdit = (client: RegistrationClient) => {
        setEditingClient(client)
        openFormModal()
    }

    const handleAdd = () => {
        setEditingClient(null)
        openFormModal()
    }

    // Group filter options

    const groupFilterOptions = groups.map(g => ({ value: g, label: g }))

    if (error) {
        return (
            <Container size="xl" py="md">
                <Alert color="red" icon={<TbAlertCircle size={16} />} title="เกิดข้อผิดพลาด">
                    ไม่สามารถโหลดข้อมูลลูกค้าได้ กรุณาลองใหม่
                </Alert>
            </Container>
        )
    }

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header */}
                <Card
                    withBorder radius="xl" p="lg"
                    style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)', border: 'none' }}
                >
                    <Group gap="md">
                        <Box style={{
                            width: 56, height: 56, borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <TbAddressBook size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>ลูกค้างานทะเบียน</Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                จัดการข้อมูลลูกค้าในส่วนงานทะเบียน
                            </Text>
                        </div>
                        <Box style={{ flex: 1 }} />
                        <Badge size="lg" variant="light" color="white" style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                            {clients.length} ลูกค้า
                        </Badge>
                    </Group>
                </Card>

                {/* Toolbar */}
                <Card withBorder radius="lg" p="sm">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                        <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
                            <TextInput
                                placeholder="ค้นหาชื่อ / เลขนิติบุคคล / เบอร์โทร..."
                                leftSection={<TbSearch size={16} />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ minWidth: 280 }}
                                size="sm"
                            />
                            <Select
                                placeholder="กรองตามแชทไลน์"
                                data={groupFilterOptions}
                                value={groupFilter}
                                onChange={(val) => setGroupFilter(val)}
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
                            เพิ่มลูกค้า
                        </Button>
                    </Group>
                </Card>

                {/* Content */}
                {isLoading ? (
                    <Center py="xl">
                        <Stack align="center" gap="md">
                            <Loader size="md" />
                            <Text size="sm" c="dimmed">กำลังโหลดข้อมูล...</Text>
                        </Stack>
                    </Center>
                ) : clients.length === 0 ? (
                    <Card withBorder radius="lg" p="xl">
                        <Center>
                            <Stack align="center" gap="sm">
                                <TbAddressBook size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                                <Text c="dimmed" size="sm">ยังไม่มีข้อมูลลูกค้า</Text>
                                <Button variant="light" color="teal" leftSection={<TbPlus size={14} />} onClick={handleAdd} size="xs">
                                    เพิ่มลูกค้าคนแรก
                                </Button>
                            </Stack>
                        </Center>
                    </Card>
                ) : (
                    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                        <ScrollArea>
                            <Table striped highlightOnHover withColumnBorders>
                                <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f57c00' }}>
                                    <Table.Tr>
                                        <Table.Th style={{ minWidth: 50, color: 'white' }}>#</Table.Th>
                                        <Table.Th style={{ minWidth: 200, color: 'white' }}>ชื่อลูกค้า / บริษัท</Table.Th>
                                        <Table.Th style={{ minWidth: 140, color: 'white' }}>เลขนิติบุคคล</Table.Th>
                                        <Table.Th style={{ minWidth: 130, color: 'white' }}>เบอร์โทร</Table.Th>
                                        <Table.Th style={{ minWidth: 140, color: 'white' }}>ชื่อแชทไลน์</Table.Th>
                                        <Table.Th style={{ minWidth: 180, color: 'white' }}>API Line</Table.Th>
                                        <Table.Th style={{ minWidth: 80, color: 'white' }}>สถานะ</Table.Th>
                                        <Table.Th style={{ minWidth: 100, textAlign: 'center', color: 'white' }}>จัดการ</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {clients.slice((page - 1) * Number(perPage), page * Number(perPage)).map((client, idx) => (
                                        <Table.Tr key={client.id} style={{ opacity: client.is_active ? 1 : 0.5 }}>
                                            <Table.Td>
                                                <Text size="xs" c="dimmed">{(page - 1) * Number(perPage) + idx + 1}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>{client.company_name}</Text>
                                                {client.notes && (
                                                    <Text size="xs" c="dimmed" lineClamp={1}>{client.notes}</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" ff="monospace">{client.legal_entity_number || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{client.phone || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{client.group_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {client.line_api ? (
                                                    <Text size="xs" ff="monospace" lineClamp={1} style={{ maxWidth: 180 }}>
                                                        {client.line_api}
                                                    </Text>
                                                ) : (
                                                    <Text size="sm" c="dimmed">-</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    size="xs"
                                                    color={client.is_active ? 'green' : 'gray'}
                                                    variant="light"
                                                >
                                                    {client.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4} justify="center">
                                                    <Tooltip label="แก้ไข" withArrow>
                                                        <ActionIcon variant="light" color="blue" size="sm" onClick={() => handleEdit(client)}>
                                                            <TbEdit size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="ลบ" withArrow>
                                                        <ActionIcon variant="light" color="red" size="sm" onClick={() => setDeleteConfirmId(client.id)}>
                                                            <TbTrash size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
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
                                        onChange={(val) => { setPerPage(val || '10'); setPage(1); }}
                                        size="xs"
                                        style={{ width: 70 }}
                                    />
                                    <Text size="sm" c="dimmed">รายการ จากทั้งหมด {clients.length} รายการ</Text>
                                </Group>
                                <Pagination
                                    total={Math.ceil(clients.length / Number(perPage))}
                                    value={page}
                                    onChange={setPage}
                                    size="sm"
                                />
                            </Group>
                        </Box>
                    </Card>
                )}
            </Stack>

            {/* Form Modal */}
            <ClientFormModal
                opened={formModalOpened}
                onClose={closeFormModal}
                editingClient={editingClient}
                existingGroups={groups}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title={<Text fw={700}>ยืนยันการลบ</Text>}
                size="sm"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">คุณต้องการลบข้อมูลลูกค้านี้หรือไม่?</Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setDeleteConfirmId(null)}>ยกเลิก</Button>
                        <Button
                            color="red"
                            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                            loading={deleteMutation.isLoading}
                        >
                            ลบ
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    )
}
