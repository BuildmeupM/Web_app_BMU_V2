/**
 * ResponsibilityChangeModal Component
 * Modal สำหรับเปลี่ยนผู้รับผิดชอบงานในหน้าจัดงานรายเดือน
 * ดึงข้อมูลพนักงานตาม Role ของแต่ละตำแหน่ง:
 *   - ผู้รับผิดชอบทำบัญชี → service, data_entry_and_service
 *   - ผู้ตรวจภาษี → audit, admin
 *   - ผู้ยื่น WHT / VAT → data_entry_and_service
 *   - ผู้รับผิดชอบคีย์เอกสาร → data_entry
 */

import { useState, useEffect } from 'react'
import {
    Modal,
    Stack,
    Select,
    Textarea,
    Button,
    Group,
    Text,
    Badge,
    Card,
    Timeline,
    Loader,
    Center,
    Alert,
    Divider,
    Box,
} from '@mantine/core'
import {
    TbCheck,
    TbAlertCircle,
    TbArrowRight,
    TbHistory,
    TbUserEdit,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import workAssignmentsService, {
    type WorkAssignment,
    type RoleType,
} from '../../services/workAssignmentsService'
import usersService, { type User } from '../../services/usersService'

// Role type definitions with Thai labels, badge colors, and allowed user roles
const ROLE_CONFIG: Record<
    RoleType,
    { label: string; color: string; shortLabel: string; allowedRoles: string }
> = {
    accounting: {
        label: 'ผู้รับผิดชอบทำบัญชี',
        color: 'blue',
        shortLabel: 'บัญชี',
        allowedRoles: 'service,data_entry_and_service',
    },
    tax_inspection: {
        label: 'ผู้ตรวจภาษี',
        color: 'violet',
        shortLabel: 'ตรวจภาษี',
        allowedRoles: 'audit,admin',
    },
    wht_filer: {
        label: 'ผู้ยื่น WHT',
        color: 'orange',
        shortLabel: 'WHT',
        allowedRoles: 'data_entry_and_service',
    },
    vat_filer: {
        label: 'ผู้ยื่น VAT',
        color: 'teal',
        shortLabel: 'VAT',
        allowedRoles: 'data_entry_and_service',
    },
    document_entry: {
        label: 'ผู้รับผิดชอบคีย์เอกสาร',
        color: 'pink',
        shortLabel: 'คีย์เอกสาร',
        allowedRoles: 'data_entry',
    },
}

interface Props {
    opened: boolean
    onClose: () => void
    assignment: WorkAssignment | null
}

export default function ResponsibilityChangeModal({
    opened,
    onClose,
    assignment,
}: Props) {
    const queryClient = useQueryClient()

    // Form state
    const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
    const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null)
    const [changeReason, setChangeReason] = useState('')
    const [showConfirm, setShowConfirm] = useState(false)

    // Reset form when modal opens/closes or assignment changes
    useEffect(() => {
        if (opened) {
            setSelectedRole(null)
            setNewEmployeeId(null)
            setChangeReason('')
            setShowConfirm(false)
        }
    }, [opened, assignment?.id])

    // Fetch change history
    const {
        data: changeHistory,
        isLoading: isLoadingHistory,
        refetch: refetchHistory,
    } = useQuery(
        ['change-history', assignment?.id],
        () => workAssignmentsService.getChangeHistory(assignment!.id),
        {
            enabled: opened && !!assignment?.id,
            staleTime: 30 * 1000,
        }
    )

    // Fetch users filtered by roles for the selected role type
    const allowedRoles = selectedRole ? ROLE_CONFIG[selectedRole].allowedRoles : ''
    const {
        data: filteredUsersData,
        isLoading: isLoadingUsers,
    } = useQuery(
        ['users-for-role-change', allowedRoles],
        () => usersService.getList({ roles: allowedRoles, status: 'active' }),
        {
            enabled: opened && !!selectedRole && !!allowedRoles,
            staleTime: 5 * 60 * 1000,
        }
    )

    // Change responsible mutation
    const changeMutation = useMutation(
        (data: { role_type: RoleType; new_employee_id: string; change_reason?: string }) =>
            workAssignmentsService.changeResponsible(assignment!.id, data),
        {
            onSuccess: (result) => {
                queryClient.invalidateQueries(['work-assignments'])
                queryClient.invalidateQueries(['change-history', assignment?.id])
                refetchHistory()
                notifications.show({
                    title: 'สำเร็จ',
                    message: `เปลี่ยน${ROLE_CONFIG[result.role_type].label}: ${result.previous_employee_name} → ${result.new_employee_name}`,
                    color: 'green',
                    icon: <TbCheck size={16} />,
                })
                // Reset form but keep modal open to show updated info
                setSelectedRole(null)
                setNewEmployeeId(null)
                setChangeReason('')
                setShowConfirm(false)
            },
            onError: (error: any) => {
                notifications.show({
                    title: 'เกิดข้อผิดพลาด',
                    message: error?.response?.data?.message || 'ไม่สามารถเปลี่ยนผู้รับผิดชอบได้',
                    color: 'red',
                    icon: <TbAlertCircle size={16} />,
                })
                setShowConfirm(false)
            },
        }
    )

    // Get current responsible for selected role (uses existing data from assignment)
    const getCurrentResponsible = (role: RoleType): { id: string | null; name: string } => {
        if (!assignment) return { id: null, name: '-' }

        const mapping: Record<RoleType, { idField: keyof WorkAssignment; nameField: keyof WorkAssignment }> = {
            accounting: { idField: 'accounting_responsible', nameField: 'accounting_responsible_name' },
            tax_inspection: { idField: 'tax_inspection_responsible', nameField: 'tax_inspection_responsible_name' },
            wht_filer: { idField: 'wht_filer_responsible', nameField: 'wht_filer_responsible_name' },
            vat_filer: { idField: 'vat_filer_responsible', nameField: 'vat_filer_responsible_name' },
            document_entry: { idField: 'document_entry_responsible', nameField: 'document_entry_responsible_name' },
        }

        const m = mapping[role]
        return {
            id: (assignment[m.idField] as string) || null,
            name: (assignment[m.nameField] as string) || '-',
        }
    }

    // Build employee options for Select from filtered users
    const getEmployeeOptions = () => {
        if (!filteredUsersData?.data) return []

        const currentId = selectedRole ? getCurrentResponsible(selectedRole).id : null

        return filteredUsersData.data
            .filter((user: User) => user.employee_id && user.employee_id !== currentId) // exclude current + must have employee_id
            .map((user: User) => ({
                value: user.employee_id!,
                label: `${user.employee_id} - ${user.name}`,
            }))
    }

    const handleSubmit = () => {
        if (!selectedRole || !newEmployeeId) return
        setShowConfirm(true)
    }

    const handleConfirm = () => {
        if (!selectedRole || !newEmployeeId) return
        changeMutation.mutate({
            role_type: selectedRole,
            new_employee_id: newEmployeeId,
            change_reason: changeReason || undefined,
        })
    }

    if (!assignment) return null

    const selectedRoleConfig = selectedRole ? ROLE_CONFIG[selectedRole] : null
    const currentResponsible = selectedRole ? getCurrentResponsible(selectedRole) : null
    const selectedUser = newEmployeeId && filteredUsersData?.data
        ? filteredUsersData.data.find((u: User) => u.employee_id === newEmployeeId)
        : null

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbUserEdit size={20} />
                    <Text fw={600}>เปลี่ยนผู้รับผิดชอบ</Text>
                    <Badge variant="light" size="sm">
                        {assignment.build}
                    </Badge>
                </Group>
            }
            size="lg"
            centered
        >
            <Stack gap="md">
                {/* Company info */}
                <Card withBorder p="xs" bg="gray.0">
                    <Group justify="space-between">
                        <div>
                            <Text size="sm" c="dimmed">บริษัท</Text>
                            <Text fw={500}>{assignment.company_name || assignment.build}</Text>
                        </div>
                        <div>
                            <Text size="sm" c="dimmed">เดือนภาษี</Text>
                            <Text fw={500}>
                                {assignment.assignment_month}/{assignment.assignment_year}
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Current responsibilities summary */}
                <Card withBorder p="sm">
                    <Text size="sm" fw={600} mb="xs">ผู้รับผิดชอบปัจจุบัน</Text>
                    <Stack gap={4}>
                        {(Object.keys(ROLE_CONFIG) as RoleType[]).map((role) => {
                            const current = getCurrentResponsible(role)
                            const config = ROLE_CONFIG[role]
                            return (
                                <Group key={role} gap="xs" justify="space-between">
                                    <Badge variant="light" color={config.color} size="sm" style={{ minWidth: 90 }}>
                                        {config.shortLabel}
                                    </Badge>
                                    <Text size="sm" style={{ flex: 1 }}>
                                        {current.name || '-'}
                                    </Text>
                                </Group>
                            )
                        })}
                    </Stack>
                </Card>

                <Divider label="เปลี่ยนผู้รับผิดชอบ" labelPosition="center" />

                {/* Step 1: Select role */}
                <Select
                    label="เลือกตำแหน่งที่ต้องการเปลี่ยน"
                    placeholder="เลือกตำแหน่ง..."
                    data={Object.entries(ROLE_CONFIG).map(([value, config]) => ({
                        value,
                        label: config.label,
                    }))}
                    value={selectedRole}
                    onChange={(val) => {
                        setSelectedRole(val as RoleType | null)
                        setNewEmployeeId(null)
                        setShowConfirm(false)
                    }}
                    clearable
                />

                {/* Step 2: Select new employee (filtered by role) */}
                {selectedRole && (
                    <>
                        <Box p="xs" bg={`${selectedRoleConfig!.color}.0`} style={{ borderRadius: 8 }}>
                            <Text size="sm" c="dimmed">ผู้รับผิดชอบปัจจุบัน ({selectedRoleConfig!.label})</Text>
                            <Text fw={500}>{currentResponsible?.name || '-'}</Text>
                        </Box>

                        <Select
                            label="เลือกผู้รับผิดชอบใหม่"
                            placeholder={isLoadingUsers ? 'กำลังโหลด...' : 'ค้นหาพนักงาน...'}
                            data={getEmployeeOptions()}
                            value={newEmployeeId}
                            onChange={(val) => {
                                setNewEmployeeId(val)
                                setShowConfirm(false)
                            }}
                            searchable
                            clearable
                            nothingFoundMessage="ไม่พบพนักงานที่มี Role ตรงกับตำแหน่งนี้"
                            disabled={isLoadingUsers}
                            rightSection={isLoadingUsers ? <Loader size="xs" /> : undefined}
                        />
                    </>
                )}

                {/* Step 3: Reason (optional) */}
                {selectedRole && newEmployeeId && (
                    <Textarea
                        label="เหตุผลในการเปลี่ยน (ไม่จำเป็น)"
                        placeholder="ระบุเหตุผลในการเปลี่ยนผู้รับผิดชอบ..."
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.currentTarget.value)}
                        rows={2}
                    />
                )}

                {/* Confirmation */}
                {showConfirm && selectedRole && newEmployeeId && (
                    <Alert
                        variant="light"
                        color="yellow"
                        title="ยืนยันการเปลี่ยนผู้รับผิดชอบ"
                        icon={<TbAlertCircle />}
                    >
                        <Stack gap="xs">
                            <Group gap="xs">
                                <Badge color={selectedRoleConfig!.color} size="sm">
                                    {selectedRoleConfig!.label}
                                </Badge>
                            </Group>
                            <Group gap="xs" align="center">
                                <Text size="sm" fw={500}>{currentResponsible?.name || '-'}</Text>
                                <TbArrowRight size={16} />
                                <Text size="sm" fw={500} c="green">
                                    {selectedUser ? selectedUser.name : '-'}
                                </Text>
                            </Group>
                            {changeReason && (
                                <Text size="xs" c="dimmed">เหตุผล: {changeReason}</Text>
                            )}
                            <Group gap="xs" mt="xs">
                                <Button
                                    size="xs"
                                    color="green"
                                    onClick={handleConfirm}
                                    loading={changeMutation.isLoading}
                                >
                                    ยืนยัน
                                </Button>
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="gray"
                                    onClick={() => setShowConfirm(false)}
                                >
                                    ยกเลิก
                                </Button>
                            </Group>
                        </Stack>
                    </Alert>
                )}

                {/* Submit button */}
                {selectedRole && newEmployeeId && !showConfirm && (
                    <Button
                        fullWidth
                        onClick={handleSubmit}
                        leftSection={<TbCheck size={16} />}
                    >
                        เปลี่ยนผู้รับผิดชอบ
                    </Button>
                )}

                {/* Change History */}
                <Divider label="ประวัติการเปลี่ยน" labelPosition="center" mt="sm" />

                {isLoadingHistory ? (
                    <Center p="md">
                        <Loader size="sm" />
                    </Center>
                ) : changeHistory && changeHistory.length > 0 ? (
                    <Timeline active={-1} bulletSize={24} lineWidth={2}>
                        {changeHistory.map((item) => {
                            const config = ROLE_CONFIG[item.role_type]
                            return (
                                <Timeline.Item
                                    key={item.id}
                                    bullet={<TbHistory size={12} />}
                                    title={
                                        <Group gap="xs">
                                            <Badge size="xs" variant="light" color={config?.color || 'gray'}>
                                                {config?.shortLabel || item.role_type}
                                            </Badge>
                                            <Text size="xs" c="dimmed">
                                                {item.changed_at}
                                            </Text>
                                        </Group>
                                    }
                                >
                                    <Group gap="xs" mt={4}>
                                        <Text size="sm">{item.previous_employee_name || '-'}</Text>
                                        <TbArrowRight size={14} />
                                        <Text size="sm" fw={500} c="green">
                                            {item.new_employee_name || '-'}
                                        </Text>
                                    </Group>
                                    <Text size="xs" c="dimmed" mt={2}>
                                        โดย: {item.changed_by_name || '-'}
                                        {item.change_reason && ` | เหตุผล: ${item.change_reason}`}
                                    </Text>
                                </Timeline.Item>
                            )
                        })}
                    </Timeline>
                ) : (
                    <Text size="sm" c="dimmed" ta="center" py="sm">
                        ยังไม่มีประวัติการเปลี่ยนผู้รับผิดชอบ
                    </Text>
                )}
            </Stack>
        </Modal>
    )
}
