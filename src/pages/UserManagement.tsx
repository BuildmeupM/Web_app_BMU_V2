/**
 * User Management Page
 * หน้าจัดการ User Accounts ของพนักงาน
 * Access: Admin only
 */

import { useState } from 'react'
import {
  Container,
  Title,
  Stack,
  Button,
  Group,
  TextInput,
  Select,
  Modal,
  Pagination,
  Alert,
  Card,
  Text,
  Badge,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Table,
  UnstyledButton,
} from '@mantine/core'
import { AxiosError } from 'axios'
import { TbPlus, TbSearch, TbEdit, TbTrash, TbEye, TbAlertCircle, TbCheck, TbKey, TbCopy, TbChevronUp, TbChevronDown, TbSelector } from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSearchParams } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { useAuthStore } from '../store/authStore'
import usersService, { User, CreateUserRequest, UpdateUserRequest } from '../services/usersService'
import { employeeService } from '../services/employeeService'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import { UserTelemetryDashboard } from '../components/UserManagement/UserTelemetryDashboard'

dayjs.extend(buddhistEra)
dayjs.locale('th')

// Role options
const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'data_entry_and_service', label: 'Data Entry & Service' },
  { value: 'audit', label: 'Audit' },
  { value: 'service', label: 'Service' },
  { value: 'hr', label: 'HR' },
  { value: 'registration', label: 'Registration' },
  { value: 'marketing', label: 'Marketing' },
]

// Status options
const statusOptions = [
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ไม่ใช้งาน' },
]

export default function UserManagement() {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = currentUser?.role === 'admin'

  // State
  const [searchParams, setSearchParams] = useSearchParams()

  // State from URL
  const search = searchParams.get('search') || ''
  const roleFilter = searchParams.get('role') || 'all'
  const statusFilter = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc'
  const limit = 20

  const [debouncedSearch] = useDebouncedValue(search, 300) // รอ 300ms ค่อยยิง API
  const [localSearch, setLocalSearch] = useState(search) // For immediate input display
  
  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // If not explicitly setting page, reset to 1 on filter/sort change
    if (!newParams.page && (newParams.search !== undefined || newParams.role !== undefined || newParams.status !== undefined || newParams.sortBy !== undefined || newParams.sortDir !== undefined)) {
        params.set('page', '1')
    }
    setSearchParams(params, { replace: true })
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateUrlParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      updateUrlParams({ sortBy: field, sortDir: 'asc' })
    }
  }

  const SortableHeader = ({ label, field, sortable = true }: { label: string; field: string; sortable?: boolean }) => {
    if (!sortable) return <Table.Th>{label}</Table.Th>
    const isActive = sortBy === field
    return (
      <Table.Th>
        <UnstyledButton onClick={() => handleSort(field)} style={{ width: '100%', padding: '4px 0' }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text fw={700} size="sm">{label}</Text>
            {isActive ? (
              sortDir === 'desc' ? <TbChevronDown size={16} /> : <TbChevronUp size={16} />
            ) : (
              <TbSelector size={16} color="gray" style={{ opacity: 0.5 }} />
            )}
          </Group>
        </UnstyledButton>
      </Table.Th>
    )
  }

  const [formOpened, setFormOpened] = useState(false)
  const [detailOpened, setDetailOpened] = useState(false)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [resetPasswordOpened, setResetPasswordOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  // Use Mantine Form
  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
      employee_id: '' as string | null,
      nick_name: '' as string | null,
      role: 'data_entry',
      name: '',
      status: 'active',
    },
    validate: {
      username: (value) => value.trim().length > 0 ? null : 'กรุณากรอก Username',
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'รูปแบบอีเมลไม่ถูกต้อง'),
      name: (value) => value.trim().length > 0 ? null : 'กรุณากรอกชื่อเต็ม',
      password: (value) => formMode === 'create' && value.length < 6 ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : null,
      role: (value) => value ? null : 'กรุณาเลือก Role',
      status: (value) => value ? null : 'กรุณาเลือก Status',
    },
  })

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
    refetch: refetchUsers,
  } = useQuery(
    ['users', page, limit, debouncedSearch, roleFilter, statusFilter, sortBy, sortDir],
    () =>
      usersService.getList({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy: sortBy || undefined,
        sortDir,
      }),
    {
      keepPreviousData: true,
    }
  )

  // Fetch employees for dropdown (only those without user accounts)
  const { data: employeesData } = useQuery(
    ['employees-without-users'],
    () => employeeService.getAll({ limit: 1000, status: 'active' }),
    {
      staleTime: 5 * 60 * 1000,
    }
  )

  // Get employees without user accounts OR the employee assigned to the currently selected user
  const availableEmployees = employeesData?.employees?.filter(
    (emp) => !emp.user_id || (formMode === 'edit' && selectedUser && emp.employee_id === selectedUser.employee_id)
  ) || []

  // Create user mutation
  const createMutation = useMutation(usersService.create, {
    onSuccess: async () => {
      queryClient.invalidateQueries(['users'])
      queryClient.invalidateQueries(['employees-without-users'])
      await refetchUsers() // Refetch เพื่อให้ตารางแสดงข้อมูลใหม่
      setFormOpened(false)
      form.reset()
      
      notifications.show({
        title: 'สำเร็จ',
        message: 'สร้าง User Account ใหม่และออกรหัสผ่านสำเร็จ',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string; errors?: Record<string, string> }>
      
      // Map validation errors back to the form if any
      if (err?.response?.data?.errors) {
        form.setErrors(err.response.data.errors)
      } else {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: err?.response?.data?.message || 'ไม่สามารถสร้าง User Account ได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      }
    },
  })

  // Update user mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdateUserRequest }) => usersService.update(id, data),
    {
      onSuccess: async () => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['employees-without-users'])
        await refetchUsers() // Refetch เพื่อให้ตารางแสดงข้อมูลใหม่
        setFormOpened(false)
        setSelectedUser(null)
        form.reset()
        notifications.show({
          title: 'สำเร็จ',
          message: 'อัพเดท User Account สำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      },
      onError: (error: unknown) => {
        const err = error as AxiosError<{ message: string; errors?: Record<string, string> }>
        if (err?.response?.data?.errors) {
          form.setErrors(err.response.data.errors)
        } else {
          notifications.show({
            title: 'เกิดข้อผิดพลาด',
            message: err?.response?.data?.message || 'ไม่สามารถอัพเดท User Account ได้',
            color: 'red',
            icon: <TbAlertCircle size={16} />,
          })
        }
      },
    }
  )

  // Delete user mutation
  const deleteMutation = useMutation(usersService.delete, {
    onSuccess: async () => {
      queryClient.invalidateQueries(['users'])
      queryClient.invalidateQueries(['employees-without-users'])
      await refetchUsers() // Refetch เพื่อให้ตารางแสดงข้อมูลใหม่
      setDeleteConfirmOpened(false)
      setUserToDelete(null)
      notifications.show({
        title: 'สำเร็จ',
        message: 'ลบ User Account สำเร็จ',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: err?.response?.data?.message || 'ไม่สามารถลบ User Account ได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  // Handlers
  const handleAdd = () => {
    setFormMode('create')
    form.reset()
    setFormOpened(true)
  }

  const handleEdit = (user: User) => {
    setFormMode('edit')
    setSelectedUser(user)
    form.setValues({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      employee_id: user.employee_id || '',
      nick_name: user.nick_name || '',
      role: user.role,
      name: user.name,
      status: user.status,
    })
    setFormOpened(true)
  }

  const handleView = (user: User) => {
    setSelectedUser(user)
    setDetailOpened(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmOpened(true)
  }

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user)
    setResetPasswordOpened(true)
  }

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    ({ id, password }: { id: string; password: string }) =>
      usersService.resetPassword(id, password),
    {
      onSuccess: async () => {
        queryClient.invalidateQueries(['users'])
        await refetchUsers()

        setResetPasswordOpened(false)
        setResetPasswordUser(null)
        
        notifications.show({
          title: 'สำเร็จ',
          message: 'รีเซ็ตรหัสผ่านสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      },
      onError: (error: unknown) => {
        const err = error as AxiosError<{ message: string }>
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: err?.response?.data?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  const handleResetPasswordSubmit = (newPassword: string) => {
    if (resetPasswordUser) {
      resetPasswordMutation.mutate({ id: resetPasswordUser.id, password: newPassword })
    }
  }

  const handleSubmit = form.onSubmit((values) => {
    if (formMode === 'create') {
      createMutation.mutate(values as CreateUserRequest)
    } else if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: values as UpdateUserRequest })
    }
  })

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
    }
  }

  // Format date to Thai Buddhist Era
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return dayjs(dateStr).format('DD MMM BBBB HH:mm')
  }

  // Get role label
  const getRoleLabel = (role: string) => {
    return roleOptions.find((r) => r.value === role)?.label || role
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    return (
      <Badge color={status === 'active' ? 'green' : 'red'} variant="light">
        {status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
      </Badge>
    )
  }

  // Filter users for pagination
  const users = usersData?.data || []
  const totalPages = usersData?.pagination?.totalPages || Math.ceil((usersData?.total || 0) / limit)
  const paginatedUsers = users // Data is already paginated explicitly by backend

  if (!isAdmin) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="ไม่มีสิทธิ์เข้าถึง">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={2}>จัดการ User Accounts</Title>
          <Button leftSection={<TbPlus size={16} />} onClick={handleAdd} color="orange">
            สร้าง User Account
          </Button>
        </Group>

        {/* Filters */}
        <Card withBorder p="md">
          <Group grow>
            <TextInput
              placeholder="ค้นหา (รหัสพนักงาน, ชื่อ)"
              leftSection={<TbSearch size={16} />}
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                updateUrlParams({ search: e.target.value })
              }}
            />
            <Select
              placeholder="กรองตาม Role"
              data={[{ value: 'all', label: 'ทั้งหมด' }, ...roleOptions]}
              value={roleFilter}
              onChange={(value) => updateUrlParams({ role: value || 'all' })}
            />
            <Select
              placeholder="กรองตาม Status"
              data={[{ value: 'all', label: 'ทั้งหมด' }, ...statusOptions]}
              value={statusFilter}
              onChange={(value) => updateUrlParams({ status: value || 'all' })}
            />
          </Group>
        </Card>

        {/* Asymmetric Telemetry Dashboard */}
        <UserTelemetryDashboard getRoleLabel={getRoleLabel} />

        {/* Table */}
        <Card withBorder>
          {isLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : error ? (
            <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
              ไม่สามารถโหลดข้อมูลได้
            </Alert>
          ) : paginatedUsers.length === 0 ? (
            <Center py="xl">
              <Text c="dimmed">ไม่พบข้อมูล User Accounts</Text>
            </Center>
          ) : (
            <>
              <Table.ScrollContainer minWidth={800}>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <SortableHeader label="Username" field="username" />
                      <SortableHeader label="Email" field="email" />
                      <SortableHeader label="รหัสพนักงาน" field="employee_id" />
                      <SortableHeader label="ชื่อ" field="name" />
                      <SortableHeader label="Role" field="role" />
                      <SortableHeader label="Status" field="status" />
                      <Table.Th>รหัสผ่าน</Table.Th>
                      <SortableHeader label="Login ล่าสุด" field="last_login_at" />
                      <Table.Th ta="center">จัดการ</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedUsers.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td>
                          <Text fw={500}>{user.username}</Text>
                        </Table.Td>
                        <Table.Td>{user.email}</Table.Td>
                        <Table.Td>{user.employee_id || '-'}</Table.Td>
                        <Table.Td>
                          {user.name}
                          {user.nick_name && (
                            <Text size="xs" c="dimmed">
                              ({user.nick_name})
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="orange">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{getStatusBadge(user.status)}</Table.Td>
                        <Table.Td>
                          {user.temporary_password ? (
                            <Group gap="xs">
                              <TextInput
                                value={user.temporary_password}
                                readOnly
                                size="xs"
                                styles={{
                                  input: {
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: '#f8f9fa',
                                    width: '120px',
                                  },
                                }}
                              />
                              <Tooltip label="คัดลอก">
                                <ActionIcon
                                  variant="light"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.temporary_password || '')
                                    notifications.show({
                                      title: 'สำเร็จ',
                                      message: 'คัดลอกรหัสผ่านแล้ว',
                                      color: 'green',
                                      icon: <TbCheck size={16} />,
                                    })
                                  }}
                                >
                                  <TbCopy size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          ) : (
                            <Group gap="xs">
                              <Text c="dimmed" size="sm">
                                ไม่มีข้อมูล
                              </Text>
                              <Tooltip label="รีเซ็ตรหัสผ่านเพื่อดูรหัสผ่าน">
                                <ActionIcon
                                  variant="light"
                                  size="sm"
                                  color="orange"
                                  onClick={() => {
                                    setResetPasswordUser(user)
                                    setResetPasswordOpened(true)
                                  }}
                                >
                                  <TbKey size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>{formatDate(user.last_login_at)}</Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="center">
                            <Tooltip label="ดูรายละเอียด">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => handleView(user)}
                              >
                                <TbEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="แก้ไข">
                              <ActionIcon
                                variant="subtle"
                                color="orange"
                                onClick={() => handleEdit(user)}
                              >
                                <TbEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="รีเซ็ตรหัสผ่าน">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => handleResetPassword(user)}
                              >
                                <TbKey size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="ลบ">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => handleDelete(user)}
                                disabled={user.id === currentUser?.id} // Prevent deleting own account (will be checked in backend)
                              >
                                <TbTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination 
                    value={page} 
                    onChange={(p) => updateUrlParams({ page: p.toString() })} 
                    total={totalPages} 
                  />
                </Group>
              )}
            </>
          )}
        </Card>

        {/* Create/Edit Form Modal */}
        <Modal
          opened={formOpened}
          onClose={() => {
            setFormOpened(false)
            form.reset()
          }}
          title={formMode === 'create' ? 'สร้าง User Account' : 'แก้ไข User Account'}
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Username *"
                placeholder="กรอก username"
                {...form.getInputProps('username')}
                required
              />
              <TextInput
                label={formMode === 'create' ? 'Password *' : 'Password (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)'}
                placeholder="กรอก password"
                type="password"
                {...form.getInputProps('password')}
                required={formMode === 'create'}
              />
              <Select
                label="รหัสพนักงาน (เชื่อมกับข้อมูลพนักงาน)"
                placeholder="เลือกพนักงาน"
                data={[
                  { value: '', label: 'ไม่เชื่อมกับพนักงาน' },
                  ...availableEmployees.map((emp) => ({
                    value: emp.employee_id,
                    label: `${emp.employee_id} - ${emp.first_name || ''}${emp.nick_name ? `(${emp.nick_name})` : ''} - ${emp.position || ''}`,
                  })),
                ]}
                {...form.getInputProps('employee_id')}
                onChange={(value) => {
                  form.setFieldValue('employee_id', value || null)
                  // Auto-fill related fields if linked
                  if (value) {
                    const selectedEmployee = availableEmployees.find((emp) => emp.employee_id === value)
                    if (selectedEmployee) {
                        form.setValues({
                            email: selectedEmployee.company_email || form.values.email,
                            name: selectedEmployee.full_name,
                            nick_name: selectedEmployee.nick_name || form.values.nick_name
                        })
                    }
                  }
                }}
                searchable
              />
              <TextInput
                label="อีเมล *"
                placeholder="กรอก email"
                type="email"
                {...form.getInputProps('email')}
                required
              />
              <TextInput
                label="ชื่อเต็ม *"
                placeholder="กรอกชื่อเต็ม"
                {...form.getInputProps('name')}
                required
              />
              <TextInput
                label="ชื่อเล่น"
                placeholder="กรอกชื่อเล่น (ถ้ามี)"
                {...form.getInputProps('nick_name')}
              />
              <Select
                label="Role *"
                placeholder="เลือก role"
                data={roleOptions}
                {...form.getInputProps('role')}
                required
              />
              <Select
                label="Status *"
                placeholder="เลือก status"
                data={statusOptions}
                {...form.getInputProps('status')}
                required
              />
              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setFormOpened(false)
                    form.reset()
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isLoading || updateMutation.isLoading}
                  color="orange"
                >
                  {formMode === 'create' ? 'สร้าง' : 'บันทึก'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Detail Modal */}
        <Modal
          opened={detailOpened}
          onClose={() => {
            setDetailOpened(false)
            setSelectedUser(null)
          }}
          title="รายละเอียด User Account"
          size="lg"
        >
          {selectedUser && (
            <Stack gap="md">
              <Group>
                <Text fw={500} w={150}>
                  Username:
                </Text>
                <Text>{selectedUser.username}</Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  Email:
                </Text>
                <Text>{selectedUser.email}</Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  รหัสพนักงาน:
                </Text>
                <Text>{selectedUser.employee_id || '-'}</Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  ชื่อ:
                </Text>
                <Text>
                  {selectedUser.name}
                  {selectedUser.nick_name && ` (${selectedUser.nick_name})`}
                </Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  Role:
                </Text>
                <Badge variant="light" color="orange">
                  {getRoleLabel(selectedUser.role)}
                </Badge>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  Status:
                </Text>
                {getStatusBadge(selectedUser.status)}
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  รหัสผ่าน:
                </Text>
                {selectedUser.temporary_password ? (
                  <Group gap="xs">
                    <TextInput
                      value={selectedUser.temporary_password}
                      readOnly
                      styles={{
                        input: {
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          fontWeight: 600,
                          backgroundColor: '#f8f9fa',
                          width: '200px',
                        },
                      }}
                    />
                    <Tooltip label="คัดลอก">
                      <ActionIcon
                        variant="light"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedUser.temporary_password || '')
                          notifications.show({
                            title: 'สำเร็จ',
                            message: 'คัดลอกรหัสผ่านแล้ว',
                            color: 'green',
                            icon: <TbCheck size={16} />,
                          })
                        }}
                      >
                        <TbCopy size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ) : (
                  <Group gap="xs">
                    <Text c="dimmed">ไม่มีข้อมูล</Text>
                    <Button
                      size="xs"
                      variant="light"
                      color="orange"
                      leftSection={<TbKey size={14} />}
                      onClick={() => {
                        setResetPasswordUser(selectedUser)
                        setResetPasswordOpened(true)
                        setDetailOpened(false)
                      }}
                    >
                      รีเซ็ตรหัสผ่าน
                    </Button>
                  </Group>
                )}
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  Login ล่าสุด:
                </Text>
                <Text>{formatDate(selectedUser.last_login_at)}</Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  สร้างเมื่อ:
                </Text>
                <Text>{formatDate(selectedUser.created_at)}</Text>
              </Group>
              <Group>
                <Text fw={500} w={150}>
                  อัพเดทเมื่อ:
                </Text>
                <Text>{formatDate(selectedUser.updated_at)}</Text>
              </Group>
              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setDetailOpened(false)
                    setSelectedUser(null)
                  }}
                >
                  ปิด
                </Button>
                <Button
                  onClick={() => {
                    setDetailOpened(false)
                    handleEdit(selectedUser)
                  }}
                  color="orange"
                >
                  แก้ไข
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>


        {/* Reset Password Modal */}
        <Modal
          opened={resetPasswordOpened}
          onClose={() => {
            setResetPasswordOpened(false)
            setResetPasswordUser(null)
          }}
          title="รีเซ็ตรหัสผ่าน"
          size="md"
        >
          {resetPasswordUser && (
            <ResetPasswordForm
              user={resetPasswordUser}
              onSubmit={handleResetPasswordSubmit}
              onCancel={() => {
                setResetPasswordOpened(false)
                setResetPasswordUser(null)
              }}
              isLoading={resetPasswordMutation.isLoading}
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={() => {
            setDeleteConfirmOpened(false)
            setUserToDelete(null)
          }}
          title="ยืนยันการลบ"
        >
          <Stack gap="md">
            <Alert icon={<TbAlertCircle size={16} />} color="red">
              คุณแน่ใจหรือไม่ว่าต้องการลบ User Account นี้?
            </Alert>
            {userToDelete && (
              <Text>
                Username: <strong>{userToDelete.username}</strong>
                <br />
                Email: <strong>{userToDelete.email}</strong>
                <br />
                ชื่อ: <strong>{userToDelete.name}</strong>
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setDeleteConfirmOpened(false)
                  setUserToDelete(null)
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                loading={deleteMutation.isLoading}
                color="red"
              >
                ลบ
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}

function ResetPasswordForm({
  user,
  onSubmit,
  onCancel,
  isLoading,
}: {
  user: User
  onSubmit: (password: string) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => value.length < 6 ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : null,
      confirmPassword: (value, values) => value !== values.password ? 'รหัสผ่านไม่ตรงกัน' : null,
    }
  })

  return (
    <form onSubmit={form.onSubmit((values) => onSubmit(values.password))}>
      <Stack gap="md">
        <Group>
          <Text fw={500} w={120}>
            Username:
          </Text>
          <Text>{user.username}</Text>
        </Group>
        <Group>
          <Text fw={500} w={120}>
            ชื่อ:
          </Text>
          <Text>{user.name}</Text>
        </Group>
        <TextInput
          label="รหัสผ่านใหม่ *"
          placeholder="กรอกรหัสผ่านใหม่"
          type="password"
          {...form.getInputProps('password')}
          required
        />
        <TextInput
          label="ยืนยันรหัสผ่าน *"
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          type="password"
          {...form.getInputProps('confirmPassword')}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={isLoading} color="orange">
            รีเซ็ตรหัสผ่าน
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
