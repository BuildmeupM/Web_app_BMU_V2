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
} from '@mantine/core'
import {
  TbPlus,
  TbSearch,
  TbEdit,
  TbTrash,
  TbEye,
  TbAlertCircle,
  TbCheck,
  TbKey,
  TbCopy,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import usersService, { User, CreateUserRequest, UpdateUserRequest } from '../services/usersService'
import { employeeService, Employee } from '../services/employeeService'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

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
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [formOpened, setFormOpened] = useState(false)
  const [detailOpened, setDetailOpened] = useState(false)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [passwordDisplayOpened, setPasswordDisplayOpened] = useState(false)
  const [resetPasswordOpened, setResetPasswordOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string>('')
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    username: '',
    email: '',
    password: '',
    employee_id: null,
    nick_name: null,
    role: 'data_entry',
    name: '',
    status: 'active',
  })

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
    refetch: refetchUsers,
  } = useQuery(
    ['users', page, limit, search, roleFilter, statusFilter],
    () =>
      usersService.getList({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
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

  // Get employees without user accounts
  const availableEmployees = employeesData?.employees?.filter((emp) => !emp.user_id) || []

  // Create user mutation
  const createMutation = useMutation(usersService.create, {
    onSuccess: async (data) => {
      queryClient.invalidateQueries(['users'])
      queryClient.invalidateQueries(['employees-without-users'])
      await refetchUsers() // Refetch เพื่อให้ตารางแสดงข้อมูลใหม่
      setFormOpened(false)
      // Store password temporarily to display
      setTemporaryPassword(data.temporaryPassword)
      setSelectedUser(data.user)
      setPasswordDisplayOpened(true)
      resetForm()
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error?.response?.data?.message || 'ไม่สามารถสร้าง User Account ได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
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
        resetForm()
        notifications.show({
          title: 'สำเร็จ',
          message: 'อัพเดท User Account สำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถอัพเดท User Account ได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
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
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error?.response?.data?.message || 'ไม่สามารถลบ User Account ได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  // Handlers
  const handleAdd = () => {
    setFormMode('create')
    resetForm()
    setFormOpened(true)
  }

  const handleEdit = (user: User) => {
    setFormMode('edit')
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      employee_id: user.employee_id || null,
      nick_name: user.nick_name || null,
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
      onSuccess: async (data) => {
        // Invalidate และ refetch ทันทีเพื่อให้ตารางแสดงข้อมูลใหม่
        queryClient.invalidateQueries(['users'])
        await refetchUsers()

        setResetPasswordOpened(false)
        setTemporaryPassword(data.temporaryPassword)
        // อัพเดท selectedUser ด้วยข้อมูลใหม่ที่รวม temporary_password
        setSelectedUser(data.user)
        setPasswordDisplayOpened(true)
        setResetPasswordUser(null)
        notifications.show({
          title: 'สำเร็จ',
          message: 'รีเซ็ตรหัสผ่านสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
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

  const handleSubmit = () => {
    if (formMode === 'create') {
      createMutation.mutate(formData as CreateUserRequest)
    } else if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: formData as UpdateUserRequest })
    }
  }

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      employee_id: null,
      nick_name: null,
      role: 'data_entry',
      name: '',
      status: 'active',
    })
    setSelectedUser(null)
  }

  // Format date to Thai Buddhist Era
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return dayjs(dateStr).format('DD MMM BBBB HH:mm', { locale: 'th' })
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
  const totalPages = Math.ceil(users.length / limit)
  const paginatedUsers = users.slice((page - 1) * limit, page * limit)

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
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <Select
              placeholder="กรองตาม Role"
              data={[{ value: 'all', label: 'ทั้งหมด' }, ...roleOptions]}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value || 'all')
                setPage(1)
              }}
            />
            <Select
              placeholder="กรองตาม Status"
              data={[{ value: 'all', label: 'ทั้งหมด' }, ...statusOptions]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || 'all')
                setPage(1)
              }}
            />
          </Group>
        </Card>

        {/* Summary */}
        <Card withBorder p="md">
          <Group>
            <Text size="sm" c="dimmed">
              รวมทั้งหมด:
            </Text>
            <Badge size="lg" variant="light">
              {users.length} รายการ
            </Badge>
          </Group>
        </Card>

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
                      <Table.Th>Username</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>รหัสพนักงาน</Table.Th>
                      <Table.Th>ชื่อ</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>รหัสผ่าน</Table.Th>
                      <Table.Th>Login ล่าสุด</Table.Th>
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
                  <Pagination value={page} onChange={setPage} total={totalPages} />
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
            resetForm()
          }}
          title={formMode === 'create' ? 'สร้าง User Account' : 'แก้ไข User Account'}
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Username *"
              placeholder="กรอก username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <TextInput
              label={formMode === 'create' ? 'Password *' : 'Password (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)'}
              placeholder="กรอก password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              value={formData.employee_id || ''}
              onChange={(value) => {
                const selectedEmployee = availableEmployees.find((emp) => emp.employee_id === value)
                setFormData({
                  ...formData,
                  employee_id: value || null,
                  email: selectedEmployee?.company_email || formData.email,
                  name: selectedEmployee ? selectedEmployee.full_name : formData.name,
                  nick_name: selectedEmployee ? (selectedEmployee.nick_name || null) : formData.nick_name,
                  english_name: selectedEmployee?.english_name || (formData as any).english_name || null,
                } as any)
              }}
              searchable
            />
            <TextInput
              label="อีเมล *"
              placeholder="กรอก email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextInput
              label="ชื่อเต็ม *"
              placeholder="กรอกชื่อเต็ม"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextInput
              label="ชื่อภาษาอังกฤษ"
              placeholder="กรอกชื่อภาษาอังกฤษ (ถ้ามี)"
              value={(formData as any).english_name || ''}
              onChange={(e) => setFormData({ ...formData, english_name: e.target.value || null } as any)}
            />
            <TextInput
              label="ชื่อเล่น"
              placeholder="กรอกชื่อเล่น (ถ้ามี)"
              value={formData.nick_name || ''}
              onChange={(e) => setFormData({ ...formData, nick_name: e.target.value || null })}
            />
            <Select
              label="Role *"
              placeholder="เลือก role"
              data={roleOptions}
              value={formData.role}
              onChange={(value) =>
                setFormData({ ...formData, role: value as User['role'] })
              }
              required
            />
            <Select
              label="Status *"
              placeholder="เลือก status"
              data={statusOptions}
              value={formData.status || 'active'}
              onChange={(value) =>
                setFormData({ ...formData, status: value as 'active' | 'inactive' })
              }
              required
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setFormOpened(false)
                  resetForm()
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                loading={createMutation.isLoading || updateMutation.isLoading}
                color="orange"
              >
                {formMode === 'create' ? 'สร้าง' : 'บันทึก'}
              </Button>
            </Group>
          </Stack>
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

        {/* Password Display Modal (แสดงรหัสผ่านชั่วคราว) */}
        <Modal
          opened={passwordDisplayOpened}
          onClose={() => {
            setPasswordDisplayOpened(false)
            setTemporaryPassword('')
            setSelectedUser(null)
          }}
          title="รหัสผ่านชั่วคราว"
          size="md"
        >
          <Stack gap="md">
            <Alert icon={<TbAlertCircle size={16} />} color="orange">
              กรุณาบันทึกรหัสผ่านนี้ไว้ ระบบจะไม่แสดงรหัสผ่านนี้อีกครั้ง
            </Alert>
            {selectedUser && (
              <Group>
                <Text fw={500} w={120}>
                  Username:
                </Text>
                <Text>{selectedUser.username}</Text>
              </Group>
            )}
            <Group>
              <Text fw={500} w={120}>
                รหัสผ่าน:
              </Text>
              <Group gap="xs" style={{ flex: 1 }}>
                <TextInput
                  value={temporaryPassword}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                    },
                  }}
                />
                <Tooltip label="คัดลอก">
                  <ActionIcon
                    variant="light"
                    onClick={() => {
                      navigator.clipboard.writeText(temporaryPassword)
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
            </Group>
            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  setPasswordDisplayOpened(false)
                  setTemporaryPassword('')
                  setSelectedUser(null)
                }}
                color="orange"
              >
                ปิด
              </Button>
            </Group>
          </Stack>
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

// Reset Password Form Component
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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)

    if (!password) {
      setError('กรุณากรอกรหัสผ่าน')
      return
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }

    onSubmit(password)
  }

  return (
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
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setError(null)
        }}
        required
      />
      <TextInput
        label="ยืนยันรหัสผ่าน *"
        placeholder="กรอกรหัสผ่านอีกครั้ง"
        type="password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          setError(null)
        }}
        required
        error={error}
      />
      {error && (
        <Alert icon={<TbAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button onClick={handleSubmit} loading={isLoading} color="orange">
          รีเซ็ตรหัสผ่าน
        </Button>
      </Group>
    </Stack>
  )
}
