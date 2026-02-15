/**
 * Client Management Page
 * หน้าจัดการข้อมูลลูกค้า
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
  Card,
  Pagination,
  Alert,
  Loader,
  Center,
  Badge,
  Text,
  SimpleGrid,
  Paper,
  Divider,
  Box,
} from '@mantine/core'
import {
  TbPlus,
  TbSearch,
  TbAlertCircle,
  TbBuilding,
  TbCalendar,
  TbCheck,
  TbX,
  TbCash,
  TbFileInvoice,
  TbFileOff,
  TbUpload,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import clientsService, { Client, AccountingFees, DbdInfo, AgencyCredentials } from '../services/clientsService'
import ClientList from '../components/Client/ClientList'
import ClientDetail from '../components/Client/ClientDetail'
import ClientForm from '../components/Client/ClientForm'
import ClientDeleteModal from '../components/Client/ClientDeleteModal'
import ClientImport from '../components/Client/ClientImport'
import MonthlyFeesForm from '../components/Client/MonthlyFeesForm'
import DbdInfoForm from '../components/Client/DbdInfoForm'
import AgencyCredentialsForm from '../components/Client/AgencyCredentialsForm'
import { notifications } from '@mantine/notifications'

// Component to load and display client detail + manage related-data modals
function ClientDetailView({
  build,
  onBack,
  onEdit,
}: {
  build: string
  onBack?: () => void
  onEdit: (client: Client) => void
}) {
  const queryClient = useQueryClient()
  const { data: client, isLoading, error } = useQuery(
    ['client', build],
    () => clientsService.getByBuild(build),
    { enabled: !!build }
  )

  // Modal states
  const [monthlyFeesOpened, setMonthlyFeesOpened] = useState(false)
  const [dbdOpened, setDbdOpened] = useState(false)
  const [credentialsOpened, setCredentialsOpened] = useState(false)

  // Save handler for monthly fees
  const handleSaveMonthlyFees = async (data: AccountingFees) => {
    try {
      // Merge with existing accounting_fees (preserve peak_code, dates)
      const existingFees = client?.accounting_fees || {}
      const merged = { ...existingFees, ...data }
      await clientsService.update(build, { accounting_fees: merged })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกค่าทำบัญชีรายเดือนเรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setMonthlyFeesOpened(false)
    } catch (err: any) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  // Save handler for DBD info
  const handleSaveDbdInfo = async (data: DbdInfo) => {
    try {
      await clientsService.update(build, { dbd_info: data })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกข้อมูล DBD เรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setDbdOpened(false)
    } catch (err: any) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  // Save handler for credentials
  const handleSaveCredentials = async (data: AgencyCredentials) => {
    try {
      await clientsService.update(build, { agency_credentials: data })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกรหัสผู้ใช้เรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setCredentialsOpened(false)
    } catch (err: any) {
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: err?.response?.data?.message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <Center py="xl"><Loader /></Center>
      </Card>
    )
  }

  if (error || !client) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <Alert icon={<TbAlertCircle size={16} />} color="red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า
        </Alert>
      </Card>
    )
  }

  return (
    <>
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <ClientDetail
          client={client}
          onEdit={() => onEdit(client)}
          onEditMonthlyFees={() => setMonthlyFeesOpened(true)}
          onEditDbdInfo={() => setDbdOpened(true)}
          onEditCredentials={() => setCredentialsOpened(true)}
        />
      </Card>

      {/* Monthly Fees Modal */}
      <MonthlyFeesForm
        opened={monthlyFeesOpened}
        onClose={() => setMonthlyFeesOpened(false)}
        onSubmit={handleSaveMonthlyFees}
        data={client.accounting_fees}
        build={build}
      />

      {/* DBD Info Modal */}
      <DbdInfoForm
        opened={dbdOpened}
        onClose={() => setDbdOpened(false)}
        onSubmit={handleSaveDbdInfo}
        data={client.dbd_info}
        build={build}
      />

      {/* Credentials Modal */}
      <AgencyCredentialsForm
        opened={credentialsOpened}
        onClose={() => setCredentialsOpened(false)}
        onSubmit={handleSaveCredentials}
        data={client.agency_credentials}
        build={build}
      />
    </>
  )
}

export default function ClientManagement() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const canEdit = isAdmin || user?.role === 'hr' || user?.role === 'data_entry' || user?.role === 'data_entry_and_service'

  // State
  const [search, setSearch] = useState('')
  const [companyStatus, setCompanyStatus] = useState<string>('all')
  const [taxRegistrationStatus, setTaxRegistrationStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState<string>('build')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [formOpened, setFormOpened] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [importOpened, setImportOpened] = useState(false)

  // Fetch clients
  const {
    data: clientsData,
    isLoading,
    error,
  } = useQuery(
    ['clients', page, limit, search, companyStatus, taxRegistrationStatus, sortBy, sortOrder],
    () =>
      clientsService.getList({
        page,
        limit,
        search: search || undefined,
        company_status: companyStatus === 'all' ? undefined : companyStatus,
        tax_registration_status: taxRegistrationStatus === 'all' ? undefined : taxRegistrationStatus,
        sortBy,
        sortOrder,
      }),
    {
      keepPreviousData: true,
    }
  )

  // Fetch statistics
  const { data: statisticsData } = useQuery(
    ['clients-statistics'],
    () => clientsService.getStatistics(),
    {
      keepPreviousData: true,
    }
  )

  // Create mutation
  const createMutation = useMutation(
    (data: Partial<Client>) => clientsService.create(data),
    {
      onSuccess: () => {
        notifications.show({
          title: 'เพิ่มสำเร็จ',
          message: 'เพิ่มข้อมูลลูกค้าเรียบร้อยแล้ว',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        queryClient.invalidateQueries(['clients'])
        setFormOpened(false)
        setEditingClient(null)
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถเพิ่มข้อมูลได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  // Update mutation
  const updateMutation = useMutation(
    ({ build, data }: { build: string; data: Partial<Client> }) =>
      clientsService.update(build, data),
    {
      onSuccess: () => {
        notifications.show({
          title: 'แก้ไขสำเร็จ',
          message: 'แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        queryClient.invalidateQueries(['clients'])
        queryClient.invalidateQueries(['client', editingClient?.build])
        setFormOpened(false)
        setEditingClient(null)
        setSelectedClient(null)
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้',
          color: 'red',
          icon: <TbAlertCircle size={16} />,
        })
      },
    }
  )

  // Delete mutation
  const deleteMutation = useMutation((build: string) => clientsService.delete(build), {
    onSuccess: () => {
      notifications.show({
        title: 'ลบสำเร็จ',
        message: 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
      queryClient.invalidateQueries(['clients'])
      setDeleteConfirmOpened(false)
      setClientToDelete(null)
      setSelectedClient(null)
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error?.response?.data?.message || 'ไม่สามารถลบข้อมูลได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const handleRowClick = (client: Client) => {
    setSelectedClient(client)
  }

  const handleAdd = () => {
    setFormMode('create')
    setEditingClient(null)
    setFormOpened(true)
  }

  const handleEdit = async (client: Client) => {
    try {
      // Fetch full client data (includes accounting_fees, boi_info, etc.)
      const fullClient = await clientsService.getByBuild(client.build)
      setFormMode('edit')
      setEditingClient(fullClient)
      setFormOpened(true)
    } catch (error) {
      console.error('Failed to load client details:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลลูกค้าได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    }
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setDeleteConfirmOpened(true)
  }

  const handleFormSubmit = async (data: Partial<Client>) => {
    if (formMode === 'create') {
      await createMutation.mutateAsync(data)
    } else if (editingClient) {
      await updateMutation.mutateAsync({ build: editingClient.build, data })
    }
  }

  const handleDeleteConfirm = async () => {
    if (clientToDelete) {
      await deleteMutation.mutateAsync(clientToDelete.build)
    }
  }

  const handleBackToList = () => {
    setSelectedClient(null)
  }

  const companyStatusOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'รายเดือน', label: 'รายเดือน' },
    { value: 'รายเดือน / วางมือ', label: 'รายเดือน / วางมือ' },
    { value: 'รายเดือน / จ่ายรายปี', label: 'รายเดือน / จ่ายรายปี' },
    { value: 'รายเดือน / เดือนสุดท้าย', label: 'รายเดือน / เดือนสุดท้าย' },
    { value: 'ยกเลิกทำ', label: 'ยกเลิกทำ' },
  ]

  const taxRegistrationStatusOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'จดภาษีมูลค่าเพิ่ม', label: 'จดภาษีมูลค่าเพิ่ม' },
    { value: 'ยังไม่จดภาษีมูลค่าเพิ่ม', label: 'ยังไม่จดภาษีมูลค่าเพิ่ม' },
  ]

  // Helper function to get company status color
  const getCompanyStatusColor = (status: string): string => {
    switch (status) {
      case 'รายเดือน':
        return 'green'
      case 'รายเดือน / วางมือ':
        return 'yellow'
      case 'รายเดือน / จ่ายรายปี':
        return 'blue'
      case 'รายเดือน / เดือนสุดท้าย':
        return 'orange'
      case 'ยกเลิกทำ':
        return 'red'
      default:
        return 'gray'
    }
  }

  // Helper function to get company status icon
  const getCompanyStatusIcon = (status: string) => {
    switch (status) {
      case 'รายเดือน':
        return TbCalendar
      case 'รายเดือน / วางมือ':
        return TbCheck
      case 'รายเดือน / จ่ายรายปี':
        return TbCash
      case 'รายเดือน / เดือนสุดท้าย':
        return TbFileInvoice
      case 'ยกเลิกทำ':
        return TbX
      default:
        return TbBuilding
    }
  }

  // Helper function to get company status color value
  const getCompanyStatusColorValue = (status: string): string => {
    switch (status) {
      case 'รายเดือน':
        return '#4caf50'
      case 'รายเดือน / วางมือ':
        return '#ff9800'
      case 'รายเดือน / จ่ายรายปี':
        return '#4facfe'
      case 'รายเดือน / เดือนสุดท้าย':
        return '#ff6b35'
      case 'ยกเลิกทำ':
        return '#f44336'
      default:
        return '#999'
    }
  }

  // Helper function to get tax registration status icon
  const getTaxStatusIcon = (status: string) => {
    return status === 'จดภาษีมูลค่าเพิ่ม' ? TbFileInvoice : TbFileOff
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={1} c="white" fw={700}>
            จัดการข้อมูลลูกค้า
          </Title>
          {canEdit && (
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<TbUpload size={16} />}
                color="blue"
                onClick={() => setImportOpened(true)}
              >
                นำเข้าจาก Excel
              </Button>
              <Button
                leftSection={<TbPlus size={16} />}
                color="orange"
                onClick={handleAdd}
              >
                เพิ่มลูกค้าใหม่
              </Button>
            </Group>
          )}
        </Group>

        {/* Error Alert */}
        {error && (
          <Alert icon={<TbAlertCircle size={16} />} color="red">
            เกิดข้อผิดพลาดในการโหลดข้อมูล
          </Alert>
        )}

        {/* Content */}
        {selectedClient ? (
          /* Client Detail View */
          <ClientDetailView
            build={selectedClient.build}
            onBack={handleBackToList}
            onEdit={handleEdit}
          />
        ) : (
          /* Client List View */
          <Stack gap="md">
            {/* Statistics Summary */}
            <Card
              withBorder
              radius="xl"
              p={0}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                borderLeft: '4px solid #ff6b35',
                boxShadow: '0 4px 20px rgba(255, 107, 53, 0.15)',
                overflow: 'hidden',
              }}
            >
              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing={0} style={{ margin: 0 }}>
                {/* Left Column - Total Clients (Prominent) */}
                <Box
                  p="xl"
                  style={{
                    background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 280,
                    position: 'relative',
                  }}
                >
                  <Box
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Stack gap="xs" align="center" style={{ position: 'relative', zIndex: 1 }}>
                    <TbBuilding size={48} color="white" style={{ opacity: 0.95 }} />
                    <Text fw={900} size="3xl" c="white" style={{ lineHeight: 1.2 }}>
                      {statisticsData?.total || 0}
                    </Text>
                    <Text fw={600} size="md" c="white" style={{ opacity: 0.95 }}>
                      จำนวนลูกค้าทั้งหมด
                    </Text>
                  </Stack>
                </Box>

                {/* Middle Column - Company Status */}
                <Box
                  p="lg"
                  style={{
                    borderRight: '1px solid #e9ecef',
                  }}
                >
                  <Stack gap="md">
                    <Text
                      fw={700}
                      size="sm"
                      c="#666"
                      ta="center"
                      style={{
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                      }}
                    >
                      สถานะบริษัท
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 2, md: 1, lg: 1 }} spacing="xs">
                      {statisticsData?.byCompanyStatus && statisticsData.byCompanyStatus.length > 0 ? (
                        statisticsData.byCompanyStatus.map((item) => {
                          const StatusIcon = getCompanyStatusIcon(item.company_status)
                          const colorValue = getCompanyStatusColorValue(item.company_status)
                          return (
                            <Paper
                              key={item.company_status}
                              p="sm"
                              radius="md"
                              withBorder
                              style={{
                                borderLeft: `3px solid ${colorValue}`,
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)'
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colorValue}30`
                                e.currentTarget.style.backgroundColor = `${colorValue}08`
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)'
                                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                                e.currentTarget.style.backgroundColor = '#fff'
                              }}
                            >
                              <Group gap="sm" wrap="nowrap">
                                <Box
                                  style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    backgroundColor: `${colorValue}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <StatusIcon size={20} color={colorValue} />
                                </Box>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Text fw={600} size="xs" c="dimmed" lineClamp={1}>
                                    {item.company_status}
                                  </Text>
                                  <Text fw={800} size="lg" c="#333" style={{ lineHeight: 1.2 }}>
                                    {item.count}
                                  </Text>
                                </div>
                              </Group>
                            </Paper>
                          )
                        })
                      ) : (
                        <Text size="sm" c="dimmed" ta="center">
                          ไม่มีข้อมูล
                        </Text>
                      )}
                    </SimpleGrid>
                  </Stack>
                </Box>

                {/* Right Column - Tax Registration Status */}
                <Box p="lg">
                  <Stack gap="md">
                    <Text
                      fw={700}
                      size="sm"
                      c="#666"
                      ta="center"
                      style={{
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                      }}
                    >
                      สถานะจดภาษีมูลค่าเพิ่ม
                    </Text>
                    <SimpleGrid cols={1} spacing="xs">
                      {statisticsData?.byTaxRegistrationStatus &&
                        statisticsData.byTaxRegistrationStatus.length > 0 ? (
                        statisticsData.byTaxRegistrationStatus.map((item) => {
                          const TaxIcon = getTaxStatusIcon(item.tax_registration_status)
                          const colorValue =
                            item.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? '#4caf50' : '#f44336'
                          return (
                            <Paper
                              key={item.tax_registration_status}
                              p="sm"
                              radius="md"
                              withBorder
                              style={{
                                borderLeft: `3px solid ${colorValue}`,
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)'
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colorValue}30`
                                e.currentTarget.style.backgroundColor = `${colorValue}08`
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)'
                                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                                e.currentTarget.style.backgroundColor = '#fff'
                              }}
                            >
                              <Group gap="sm" wrap="nowrap">
                                <Box
                                  style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    backgroundColor: `${colorValue}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <TaxIcon size={20} color={colorValue} />
                                </Box>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Text fw={600} size="xs" c="dimmed" lineClamp={1}>
                                    {item.tax_registration_status}
                                  </Text>
                                  <Text fw={800} size="lg" c="#333" style={{ lineHeight: 1.2 }}>
                                    {item.count}
                                  </Text>
                                </div>
                              </Group>
                            </Paper>
                          )
                        })
                      ) : (
                        <Text size="sm" c="dimmed" ta="center">
                          ไม่มีข้อมูล
                        </Text>
                      )}
                    </SimpleGrid>
                  </Stack>
                </Box>
              </SimpleGrid>
            </Card>

            {/* Incomplete Data Summary */}
            {statisticsData?.incompleteData && (
              statisticsData.incompleteData.basicInfo.count > 0 ||
              statisticsData.incompleteData.taxInfo.count > 0 ||
              statisticsData.incompleteData.address.count > 0
            ) && (
                <Card
                  withBorder
                  radius="xl"
                  p="lg"
                  style={{
                    background: 'linear-gradient(135deg, #fff8f0 0%, #fff3e6 100%)',
                    borderLeft: '4px solid #ff9800',
                  }}
                >
                  <Group gap="sm" mb="md">
                    <TbAlertCircle size={24} color="#ff9800" />
                    <Text fw={700} size="lg" c="#e65100">
                      บริษัทที่ยังกรอกข้อมูลไม่ครบ
                    </Text>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {/* Basic Info */}
                    {statisticsData.incompleteData.basicInfo.count > 0 && (
                      <Paper
                        withBorder
                        radius="lg"
                        p="md"
                        style={{
                          borderTop: '3px solid #ff6b35',
                          background: '#fff',
                        }}
                      >
                        <Group gap="sm" mb="sm">
                          <TbBuilding size={20} color="#ff6b35" />
                          <Text fw={700} size="sm">ข้อมูลพื้นฐาน</Text>
                          <Badge size="sm" color="orange" variant="filled" ml="auto">
                            {statisticsData.incompleteData.basicInfo.count}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mb="sm">
                          วันจัดตั้ง, ประเภทธุรกิจ, ขนาดบริษัท
                        </Text>
                        <Divider mb="xs" />
                        <Stack gap={4} style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {statisticsData.incompleteData.basicInfo.clients.map((c) => (
                            <Paper
                              key={c.build}
                              p="xs"
                              radius="sm"
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fff3e6'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                              onClick={() => setSelectedClient({ build: c.build } as Client)}
                            >
                              <Group gap="xs" wrap="nowrap">
                                <Badge size="xs" variant="outline" color="orange" style={{ flexShrink: 0 }}>
                                  {c.build}
                                </Badge>
                                <Text size="xs" lineClamp={1}>{c.company_name}</Text>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    )}

                    {/* Tax Info */}
                    {statisticsData.incompleteData.taxInfo.count > 0 && (
                      <Paper
                        withBorder
                        radius="lg"
                        p="md"
                        style={{
                          borderTop: '3px solid #e91e63',
                          background: '#fff',
                        }}
                      >
                        <Group gap="sm" mb="sm">
                          <TbFileInvoice size={20} color="#e91e63" />
                          <Text fw={700} size="sm">ข้อมูลภาษี</Text>
                          <Badge size="sm" color="pink" variant="filled" ml="auto">
                            {statisticsData.incompleteData.taxInfo.count}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mb="sm">
                          สถานะจดทะเบียนภาษี
                        </Text>
                        <Divider mb="xs" />
                        <Stack gap={4} style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {statisticsData.incompleteData.taxInfo.clients.map((c) => (
                            <Paper
                              key={c.build}
                              p="xs"
                              radius="sm"
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fce4ec'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                              onClick={() => setSelectedClient({ build: c.build } as Client)}
                            >
                              <Group gap="xs" wrap="nowrap">
                                <Badge size="xs" variant="outline" color="pink" style={{ flexShrink: 0 }}>
                                  {c.build}
                                </Badge>
                                <Text size="xs" lineClamp={1}>{c.company_name}</Text>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    )}

                    {/* Address */}
                    {statisticsData.incompleteData.address.count > 0 && (
                      <Paper
                        withBorder
                        radius="lg"
                        p="md"
                        style={{
                          borderTop: '3px solid #7c3aed',
                          background: '#fff',
                        }}
                      >
                        <Group gap="sm" mb="sm">
                          <TbBuilding size={20} color="#7c3aed" />
                          <Text fw={700} size="sm">ที่อยู่บริษัท</Text>
                          <Badge size="sm" color="grape" variant="filled" ml="auto">
                            {statisticsData.incompleteData.address.count}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mb="sm">
                          จังหวัด, อำเภอ, ตำบล, รหัสไปรษณีย์
                        </Text>
                        <Divider mb="xs" />
                        <Stack gap={4} style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {statisticsData.incompleteData.address.clients.map((c) => (
                            <Paper
                              key={c.build}
                              p="xs"
                              radius="sm"
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3e8ff'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                              onClick={() => setSelectedClient({ build: c.build } as Client)}
                            >
                              <Group gap="xs" wrap="nowrap">
                                <Badge size="xs" variant="outline" color="grape" style={{ flexShrink: 0 }}>
                                  {c.build}
                                </Badge>
                                <Text size="xs" lineClamp={1}>{c.company_name}</Text>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    )}
                  </SimpleGrid>
                </Card>
              )}

            {/* Search and Filters */}
            <Card withBorder radius="lg" p="md">
              <Group gap="md">
                <TextInput
                  placeholder="ค้นหาด้วย Build code, ชื่อบริษัท, เลขทะเบียนนิติบุคคล"
                  leftSection={<TbSearch size={16} />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="สถานะบริษัท"
                  data={companyStatusOptions}
                  value={companyStatus}
                  onChange={(value) => {
                    setCompanyStatus(value || 'all')
                    setPage(1)
                  }}
                  style={{ width: 200 }}
                />
                <Select
                  placeholder="สถานะจดภาษีมูลค่าเพิ่ม"
                  data={taxRegistrationStatusOptions}
                  value={taxRegistrationStatus}
                  onChange={(value) => {
                    setTaxRegistrationStatus(value || 'all')
                    setPage(1)
                  }}
                  style={{ width: 200 }}
                />
              </Group>
            </Card>

            {/* Client List */}
            <Card withBorder radius="lg" p="md">
              <ClientList
                clients={clientsData?.data || []}
                loading={isLoading}
                onRowClick={handleRowClick}
                onEdit={canEdit ? handleEdit : undefined}
                onDelete={isAdmin ? handleDelete : undefined}
              />
            </Card>

            {/* Pagination */}
            {clientsData && (
              <Group justify="space-between" align="center" wrap="wrap">
                {/* Left: Items per page selector */}
                <Group gap="xs" wrap="wrap">
                  <Text size="sm">แสดง</Text>
                  <Select
                    value={limit.toString()}
                    onChange={(value) => {
                      const newLimit = Number(value)
                      setLimit(newLimit)
                      setPage(1) // Reset to first page when changing limit
                    }}
                    data={[
                      { value: '20', label: '20' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                    ]}
                    style={{ width: 80 }}
                    size="sm"
                  />
                  <Text size="sm">รายการต่อหน้า</Text>
                  {clientsData.pagination.total > 0 && (
                    <Text size="sm" c="dimmed">
                      แสดง{' '}
                      {(page - 1) * limit + 1}-{Math.min(page * limit, clientsData.pagination.total)} จาก{' '}
                      {clientsData.pagination.total} รายการ
                    </Text>
                  )}
                </Group>

                {/* Right: Page navigation */}
                {clientsData.pagination.totalPages > 1 && (
                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      radius="md"
                    >
                      &lt; ก่อนหน้า
                    </Button>

                    {/* Page numbers */}
                    {(() => {
                      const pages: (number | string)[] = []
                      const totalPages = clientsData.pagination.totalPages
                      const maxVisible = 5

                      if (totalPages <= maxVisible) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i)
                        }
                      } else {
                        if (page <= 3) {
                          for (let i = 1; i <= 5; i++) {
                            pages.push(i)
                          }
                          pages.push('...')
                          pages.push(totalPages)
                        } else if (page >= totalPages - 2) {
                          pages.push(1)
                          pages.push('...')
                          for (let i = totalPages - 4; i <= totalPages; i++) {
                            pages.push(i)
                          }
                        } else {
                          pages.push(1)
                          pages.push('...')
                          for (let i = page - 1; i <= page + 1; i++) {
                            pages.push(i)
                          }
                          pages.push('...')
                          pages.push(totalPages)
                        }
                      }

                      return pages.map((p, index) => {
                        if (p === '...') {
                          return (
                            <Text key={`ellipsis-${index}`} size="sm" c="dimmed" px="xs">
                              ...
                            </Text>
                          )
                        }
                        const pageNum = p as number
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'filled' : 'light'}
                            color={page === pageNum ? 'orange' : 'gray'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            radius="md"
                          >
                            {pageNum}
                          </Button>
                        )
                      })
                    })()}

                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === clientsData.pagination.totalPages}
                      radius="md"
                    >
                      ถัดไป &gt;
                    </Button>
                  </Group>
                )}
              </Group>
            )}
          </Stack>
        )}

        {/* Forms */}
        <ClientForm
          opened={formOpened}
          onClose={() => {
            setFormOpened(false)
            setEditingClient(null)
          }}
          onSubmit={handleFormSubmit}
          client={editingClient}
          mode={formMode}
        />

        <ClientDeleteModal
          opened={deleteConfirmOpened}
          onClose={() => {
            setDeleteConfirmOpened(false)
            setClientToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          client={clientToDelete}
        />

        <ClientImport
          opened={importOpened}
          onClose={() => setImportOpened(false)}
        />
      </Stack>
    </Container>
  )
}
