/**
 * Employee Management Page
 * หน้าจัดการข้อมูลพนักงาน
 */

import { useState, useEffect } from 'react'
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
  Tabs,
  Card,
  SimpleGrid,
  Text,
  Badge,
  Switch,
  Loader,
  Center,
} from '@mantine/core'
import { TbPlus, TbSearch, TbUpload, TbDownload, TbAlertCircle, TbTrash } from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { employeeService, Employee } from '../services/employeeService'
import EmployeeList from '../components/Employee/EmployeeList'
import EmployeeDetail from '../components/Employee/EmployeeDetail'
import EmployeeForm from '../components/Employee/EmployeeForm'
import EmployeeImport from '../components/Employee/EmployeeImport'
import EmployeeDashboard from '../components/Employee/EmployeeDashboard'

// Component to load and display employee detail
function EmployeeDetailView({
  employeeId,
  onBack,
  onEdit,
}: {
  employeeId: string
  onBack?: () => void
  onEdit: () => void
}) {
  const { data: employee, isLoading, error } = useQuery(
    ['employee', employeeId],
    () => employeeService.getById(employeeId),
    {
      enabled: !!employeeId,
    }
  )

  if (isLoading) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>
              ← กลับไปรายชื่อ
            </Button>
          </Group>
        )}
        <Center py="xl">
          <Loader />
        </Center>
      </Card>
    )
  }

  if (error || !employee) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>
              ← กลับไปรายชื่อ
            </Button>
          </Group>
        )}
        <Alert icon={<TbAlertCircle size={16} />} color="red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน
        </Alert>
      </Card>
    )
  }

  return (
    <Card>
      {onBack && (
        <Group justify="space-between" mb="md">
          <Button variant="subtle" onClick={onBack}>
            ← กลับไปรายชื่อ
          </Button>
        </Group>
      )}
      <EmployeeDetail employee={employee} onEdit={onEdit} />
    </Card>
  )
}

export default function EmployeeManagement() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const isEmployee = !isAdmin // พนักงานที่ไม่ใช่ admin

  // State
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [status, setStatus] = useState<'active' | 'resigned' | 'all'>('active')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number | 'all'>(20)
  const [sortBy, setSortBy] = useState<string>('position')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formOpened, setFormOpened] = useState(false)
  const [importOpened, setImportOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)

  // Fetch employees (สำหรับ admin) หรือข้อมูลของตัวเอง (สำหรับ employee)
  const {
    data: employeesData,
    isLoading,
    error,
  } = useQuery(
    ['employees', page, limit, search, position, status, includeDeleted, sortBy, sortOrder],
    () =>
      employeeService.getAll({
        page: limit === 'all' ? 1 : page,
        limit: limit === 'all' ? 10000 : limit, // ส่งค่ามากพอเพื่อดึงข้อมูลทั้งหมด
        search,
        position: position || undefined,
        status: status === 'all' ? undefined : status,
        includeDeleted: isAdmin ? includeDeleted : false, // เฉพาะ admin เท่านั้น
        sortBy,
        sortOrder,
      }),
    {
      keepPreviousData: true,
    }
  )

  // สำหรับ employee: ดึงข้อมูลของตัวเองโดยตรง
  const ownEmployee = isEmployee && employeesData?.employees?.[0] ? employeesData.employees[0] : null

  // Fetch positions
  const { data: positions = [] } = useQuery(
    ['positions'],
    () => employeeService.getPositions(),
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Create employee mutation
  const createMutation = useMutation(employeeService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setFormOpened(false)
    },
  })

  // Update employee mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => employeeService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees'])
        setFormOpened(false)
        setSelectedEmployee(null)
      },
    }
  )

  // Delete employee mutation
  const deleteMutation = useMutation(employeeService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setSelectedEmployee(null)
    },
  })

  // Handlers
  const handleAdd = () => {
    setFormMode('create')
    setEditingEmployee(null)
    setFormOpened(true)
  }

  const handleEdit = async (employee: Employee) => {
    setFormMode('edit')
    setFormOpened(true)
    // Fetch full employee data from API to ensure all fields are populated
    try {
      const fullEmployeeData = await employeeService.getById(employee.id)
      setEditingEmployee(fullEmployeeData)
    } catch (error) {
      console.error('Error fetching employee data:', error)
      // Fallback to employee from list if API call fails
      setEditingEmployee(employee)
    }
  }

  const handleDelete = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteConfirmOpened(true)
  }

  const confirmDelete = async () => {
    if (employeeToDelete) {
      await deleteMutation.mutateAsync(employeeToDelete.id)
      setDeleteConfirmOpened(false)
      setEmployeeToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmOpened(false)
    setEmployeeToDelete(null)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (formMode === 'create') {
        await createMutation.mutateAsync(data)
      } else if (editingEmployee) {
        await updateMutation.mutateAsync({ id: editingEmployee.id, data })
      }
    } catch (error) {
      console.error('Form submit error:', error)
      throw error
    }
  }

  // Reset page when search/filter/limit changes
  useEffect(() => {
    setPage(1)
  }, [search, position, status, limit, includeDeleted])

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>ข้อมูลพนักงาน</Title>
          {isAdmin && (
            <Group>
              <Button
                leftSection={<TbUpload size={18} />}
                variant="light"
                onClick={() => setImportOpened(true)}
              >
                นำเข้าจาก Excel
              </Button>
              <Button leftSection={<TbPlus size={18} />} onClick={handleAdd}>
                เพิ่มพนักงาน
              </Button>
            </Group>
          )}
        </Group>

        {/* Tabs - แสดงเฉพาะสำหรับ Admin */}
        {isAdmin ? (
          <Tabs defaultValue="list">
            <Tabs.List>
              <Tabs.Tab value="list">รายชื่อพนักงาน</Tabs.Tab>
              <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
            </Tabs.List>

            {/* Employee List Tab */}
            <Tabs.Panel value="list" pt="lg">
              <Stack gap="md">
                {/* Search & Filter */}
                <Group>
                  <TextInput
                    placeholder="ค้นหาพนักงาน..."
                    leftSection={<TbSearch size={16} />}
                    style={{ flex: 1 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select
                    placeholder="ตำแหน่ง"
                    data={positions.map((pos) => ({ value: pos, label: pos }))}
                    value={position}
                    onChange={(value) => setPosition(value || '')}
                    clearable
                    searchable
                    style={{ width: 200 }}
                  />
                  <Select
                    placeholder="สถานะ"
                    data={[
                      { value: 'all', label: 'ทั้งหมด' },
                      { value: 'active', label: 'ทำงานอยู่' },
                      { value: 'resigned', label: 'ลาออก' },
                    ]}
                    value={status}
                    onChange={(value) => setStatus((value as 'active' | 'resigned' | 'all') || 'all')}
                    style={{ width: 150 }}
                  />
                  <Select
                    placeholder="แสดงต่อหน้า"
                    data={[
                      { value: '20', label: '20 รายการ' },
                      { value: '50', label: '50 รายการ' },
                      { value: '100', label: '100 รายการ' },
                      { value: 'all', label: 'ทั้งหมด' },
                    ]}
                    value={limit === 'all' ? 'all' : String(limit)}
                    onChange={(value) => {
                      if (value === 'all') {
                        setLimit('all')
                      } else {
                        setLimit(parseInt(value || '20'))
                      }
                    }}
                    style={{ width: 150 }}
                  />
                  <Switch
                    label="รวมข้อมูลที่ถูกลบ"
                    checked={includeDeleted}
                    onChange={(event) => setIncludeDeleted(event.currentTarget.checked)}
                    style={{ width: 180 }}
                  />
                </Group>

                {/* Error Alert */}
                {error && (
                  <Alert icon={<TbAlertCircle size={16} />} color="red">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล
                  </Alert>
                )}

                {/* Employee List or Detail */}
                {selectedEmployee ? (
                  <EmployeeDetailView
                    employeeId={selectedEmployee.id}
                    onBack={() => setSelectedEmployee(null)}
                    onEdit={() => handleEdit(selectedEmployee)}
                  />
                ) : (
                  <>
                    {/* Show total count */}
                    {employeesData && (
                      <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                          แสดง {employeesData.employees.length} จาก {employeesData.pagination.total} รายการ
                          {limit === 'all' && ' (ทั้งหมด)'}
                        </Text>
                      </Group>
                    )}

                    <EmployeeList
                      employees={employeesData?.employees || []}
                      loading={isLoading}
                      onRowClick={setSelectedEmployee}
                      onEdit={isAdmin ? handleEdit : undefined}
                      onDelete={isAdmin ? handleDelete : undefined}
                    />

                    {/* Pagination - แสดงเฉพาะเมื่อไม่ใช่ "ทั้งหมด" */}
                    {employeesData && limit !== 'all' && employeesData.pagination.totalPages > 1 && (
                      <Group justify="center" mt="md">
                        <Pagination
                          value={page}
                          onChange={setPage}
                          total={employeesData.pagination.totalPages}
                        />
                      </Group>
                    )}
                  </>
                )}
              </Stack>
            </Tabs.Panel>

            {/* Dashboard Tab */}
            <Tabs.Panel value="dashboard" pt="lg">
              <EmployeeDashboard />
            </Tabs.Panel>
          </Tabs>
        ) : (
          /* สำหรับ Employee: แสดงข้อมูลของตัวเองโดยตรง (ไม่แสดง Tabs) */
          <Stack gap="md">
            {/* Error Alert */}
            {error && (
              <Alert icon={<TbAlertCircle size={16} />} color="red">
                เกิดข้อผิดพลาดในการโหลดข้อมูล
              </Alert>
            )}

            {/* แสดงข้อมูลของตัวเองโดยตรง */}
            {ownEmployee ? (
              <EmployeeDetailView
                employeeId={ownEmployee.id}
                onBack={undefined} // ไม่มีปุ่มกลับสำหรับ employee
                onEdit={() => handleEdit(ownEmployee)}
              />
            ) : isLoading ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : (
              <Alert icon={<TbAlertCircle size={16} />} color="yellow">
                ไม่พบข้อมูลพนักงานของคุณ
              </Alert>
            )}
          </Stack>
        )}

        {/* Forms */}
        <EmployeeForm
          opened={formOpened}
          onClose={() => {
            setFormOpened(false)
            setEditingEmployee(null)
          }}
          onSubmit={handleFormSubmit}
          employee={editingEmployee}
          mode={formMode}
        />

        <EmployeeImport
          opened={importOpened}
          onClose={() => setImportOpened(false)}
        />

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={cancelDelete}
          title={
            <Group gap="xs">
              <TbTrash size={20} color="red" />
              <Text fw={600}>ยืนยันการลบข้อมูลพนักงาน</Text>
            </Group>
          }
          centered
        >
          <Stack gap="md">
            <Text>
              คุณต้องการลบข้อมูลพนักงาน{' '}
              <Text component="span" fw={600} c="orange">
                {employeeToDelete?.full_name}
              </Text>{' '}
              (รหัสพนักงาน: {employeeToDelete?.employee_id}) หรือไม่?
            </Text>
            <Alert color="red" icon={<TbAlertCircle size={16} />}>
              <Text size="sm">
                ⚠️ การลบข้อมูลนี้เป็นการลบแบบ Soft Delete ข้อมูลจะยังคงอยู่ในฐานข้อมูลแต่จะไม่แสดงในรายการปกติ
              </Text>
            </Alert>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={cancelDelete}>
                ยกเลิก
              </Button>
              <Button
                color="red"
                leftSection={<TbTrash size={16} />}
                onClick={confirmDelete}
                loading={deleteMutation.isPending}
              >
                ลบข้อมูล
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}
