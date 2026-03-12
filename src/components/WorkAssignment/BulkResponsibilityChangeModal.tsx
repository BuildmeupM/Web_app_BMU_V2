/**
 * BulkResponsibilityChangeModal Component
 * Modal สำหรับเปลี่ยนผู้รับผิดชอบงานแบบ Bulk (หลายบริษัทพร้อมกัน)
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
  Loader,
  Alert,
  Divider,
  ScrollArea,
  Table,
  Progress,
} from '@mantine/core'
import {
  TbCheck,
  TbAlertCircle,
  TbArrowRight,
  TbUsersGroup,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import workAssignmentsService, {
  type WorkAssignment,
  type RoleType,
} from '../../services/workAssignmentsService'
import usersService, { type User } from '../../services/usersService'

const ROLE_CONFIG: Record<
  RoleType,
  { label: string; color: string; shortLabel: string; allowedRoles: string }
> = {
  accounting: {
    label: 'ผู้รับผิดชอบทำบัญชี',
    color: 'blue',
    shortLabel: 'บัญชี',
    allowedRoles: 'service,data_entry_and_service,audit',
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

// Map role type to assignment field for current responsible
const ROLE_FIELD_MAP: Record<RoleType, { idField: keyof WorkAssignment; nameField: keyof WorkAssignment }> = {
  accounting: { idField: 'accounting_responsible', nameField: 'accounting_responsible_name' },
  tax_inspection: { idField: 'tax_inspection_responsible', nameField: 'tax_inspection_responsible_name' },
  wht_filer: { idField: 'wht_filer_responsible', nameField: 'wht_filer_responsible_name' },
  vat_filer: { idField: 'vat_filer_responsible', nameField: 'vat_filer_responsible_name' },
  document_entry: { idField: 'document_entry_responsible', nameField: 'document_entry_responsible_name' },
}

interface Props {
  opened: boolean
  onClose: () => void
  assignments: WorkAssignment[]
  onSuccess?: () => void
}

export default function BulkResponsibilityChangeModal({
  opened,
  onClose,
  assignments,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient()

  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null)
  const [changeReason, setChangeReason] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (opened) {
      setSelectedRole(null)
      setNewEmployeeId(null)
      setChangeReason('')
      setShowConfirm(false)
    }
  }, [opened])

  // Fetch users for selected role
  const allowedRoles = selectedRole ? ROLE_CONFIG[selectedRole].allowedRoles : ''
  const { data: filteredUsersData, isLoading: isLoadingUsers } = useQuery(
    ['users-for-bulk-role-change', allowedRoles],
    () => usersService.getList({ roles: allowedRoles, status: 'active' }),
    {
      enabled: opened && !!selectedRole && !!allowedRoles,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Bulk change mutation
  const bulkMutation = useMutation(
    (data: { assignment_ids: string[]; role_type: RoleType; new_employee_id: string; change_reason?: string }) =>
      workAssignmentsService.bulkChangeResponsible(data),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['work-assignments'])
        notifications.show({
          title: 'สำเร็จ',
          message: `เปลี่ยน${result.role_label} → ${result.new_employee_name} สำเร็จ ${result.success_count} รายการ${result.skipped_count > 0 ? ` (ข้าม ${result.skipped_count})` : ''}`,
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        onSuccess?.()
        onClose()
      },
      onError: (error: { response?: { data?: { message?: string } } }) => {
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

  const getEmployeeOptions = () => {
    if (!filteredUsersData?.data) return []
    return filteredUsersData.data
      .filter((user: User) => user.employee_id)
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
    bulkMutation.mutate({
      assignment_ids: assignments.map((a) => a.id),
      role_type: selectedRole,
      new_employee_id: newEmployeeId,
      change_reason: changeReason || undefined,
    })
  }

  const selectedRoleConfig = selectedRole ? ROLE_CONFIG[selectedRole] : null
  const selectedUser = newEmployeeId && filteredUsersData?.data
    ? filteredUsersData.data.find((u: User) => u.employee_id === newEmployeeId)
    : null

  // Get current responsibles for selected role
  const getCurrentForRole = (assignment: WorkAssignment, role: RoleType) => {
    const fieldMap = ROLE_FIELD_MAP[role]
    return {
      id: assignment[fieldMap.idField] as string | null,
      name: (assignment[fieldMap.nameField] as string) || '-',
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <TbUsersGroup size={20} />
          <Text fw={600}>เปลี่ยนผู้รับผิดชอบ (Bulk)</Text>
          <Badge variant="light" color="orange" size="sm">
            {assignments.length} รายการ
          </Badge>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Selected companies list */}
        <Card withBorder p="sm">
          <Text size="sm" fw={600} mb="xs">บริษัทที่เลือก</Text>
          <ScrollArea.Autosize mah={150}>
            <Table verticalSpacing={4} horizontalSpacing="xs">
              <Table.Tbody>
                {assignments.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td>
                      <Text size="xs" fw={500}>{a.build}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{a.company_name || '-'}</Text>
                    </Table.Td>
                    {selectedRole && (
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {getCurrentForRole(a, selectedRole).name}
                        </Text>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Card>

        <Divider label="เปลี่ยนผู้รับผิดชอบ" labelPosition="center" />

        {/* Select role */}
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

        {/* Select new employee */}
        {selectedRole && (
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
        )}

        {/* Reason */}
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
            title="ยืนยันการเปลี่ยนผู้รับผิดชอบ (Bulk)"
            icon={<TbAlertCircle />}
          >
            <Stack gap="xs">
              <Group gap="xs">
                <Badge color={selectedRoleConfig!.color} size="sm">
                  {selectedRoleConfig!.label}
                </Badge>
                <TbArrowRight size={16} />
                <Text size="sm" fw={500} c="green">
                  {selectedUser ? selectedUser.name : newEmployeeId}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                จะเปลี่ยนทั้งหมด {assignments.length} บริษัท
              </Text>
              {changeReason && (
                <Text size="xs" c="dimmed">เหตุผล: {changeReason}</Text>
              )}

              {bulkMutation.isLoading && (
                <Progress value={100} animated size="sm" color="orange" />
              )}

              <Group gap="xs" mt="xs">
                <Button
                  size="xs"
                  color="green"
                  onClick={handleConfirm}
                  loading={bulkMutation.isLoading}
                >
                  ยืนยัน
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={() => setShowConfirm(false)}
                  disabled={bulkMutation.isLoading}
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
            color="orange"
          >
            เปลี่ยนผู้รับผิดชอบ ({assignments.length} รายการ)
          </Button>
        )}
      </Stack>
    </Modal>
  )
}
