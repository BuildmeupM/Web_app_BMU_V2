import { Modal, TextInput, NumberInput, Select, Button, Stack, Group, Text, Alert, Card, Badge } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { TbAlertCircle, TbBuilding } from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import accountingMarketplaceService from '../../services/accountingMarketplaceService'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import clientsService from '../../services/clientsService'

interface CreateListingModalProps {
  opened: boolean
  onClose: () => void
}

// Helper function: Format employee name to "ชื่อ (ชื่อเล่น)" format
const formatEmployeeName = (
  firstName: string | null | undefined,
  nickName: string | null | undefined
): string => {
  if (!firstName) return '-'
  if (nickName) {
    return `${firstName}(${nickName})`
  }
  return firstName
}

// Helper functions for status display
const getStatusLabel = (status: string | null): string => {
  if (!status) return 'ยังไม่ระบุ'
  switch (status) {
    case 'received_receipt':
      return 'รับใบเสร็จ'
    case 'paid':
      return 'ชำระแล้ว'
    case 'sent_to_customer':
      return 'ส่งลูกค้าแล้ว'
    case 'draft_completed':
      return 'ร่างแบบเสร็จแล้ว'
    case 'passed':
      return 'ผ่าน'
    case 'pending_review':
      return 'รอตรวจ'
    case 'pending_recheck':
      return 'รอตรวจอีกครั้ง'
    case 'draft_ready':
      return 'ร่างแบบได้'
    case 'needs_correction':
      return 'แก้ไข'
    case 'edit':
      return 'แก้ไข'
    case 'inquire_customer':
      return 'สอบถามลูกค้าเพิ่มเติม'
    case 'additional_review':
      return 'ตรวจสอบเพิ่มเติม'
    case 'not_submitted':
      return 'ไม่มียื่น'
    case 'not_started':
      return 'ยังไม่ดำเนินการ'
    default:
      return status
  }
}

const getStatusColor = (status: string | null): string => {
  if (!status) return 'gray'
  switch (status) {
    case 'paid':
    case 'sent_to_customer':
    case 'passed':
      return 'green'
    case 'pending_review':
    case 'pending_recheck':
      return 'yellow'
    case 'draft_completed':
    case 'draft_ready':
      return 'blue'
    case 'needs_correction':
    case 'edit':
      return 'red'
    default:
      return 'gray'
  }
}

const CreateListingModal = ({ opened, onClose }: CreateListingModalProps) => {
  const queryClient = useQueryClient()
  const currentTaxMonth = getCurrentTaxMonth()

  const form = useForm({
    initialValues: {
      build: '',
      price: 150,
    },
    validate: {
      build: (value) => (!value ? 'กรุณาเลือก Build' : null),
      price: (value) => {
        if (!value) return 'กรุณาระบุราคา'
        if (value < 150) return 'ราคาต้องไม่ต่ำกว่า 150 บาท'
        return null
      },
    },
  })

  // Fetch eligible builds for build dropdown (filtered by role and accounting_responsible)
  const { data: eligibleBuildsResponse } = useQuery(
    ['accounting-marketplace', 'eligible-builds'],
    () => accountingMarketplaceService.getEligibleBuilds(),
    {
      enabled: opened,
    }
  )

  // Fetch monthly tax data when build is selected
  const selectedBuild = form.values.build
  const { data: monthlyTaxData } = useQuery(
    ['monthly-tax-data', selectedBuild, currentTaxMonth.year, currentTaxMonth.month],
    () => monthlyTaxDataService.getByBuildYearMonth(selectedBuild, currentTaxMonth.year, currentTaxMonth.month),
    {
      enabled: !!selectedBuild && opened,
    }
  )

  // Fetch client data when build is selected (for tax_registration_status)
  const { data: clientData } = useQuery(
    ['clients', selectedBuild],
    () => clientsService.getByBuild(selectedBuild),
    {
      enabled: !!selectedBuild && opened,
    }
  )

  const createMutation = useMutation(accountingMarketplaceService.createListing, {
    onSuccess: () => {
      notifications.show({
        title: 'สร้างรายการขายงานสำเร็จ',
        message: 'สร้างรายการขายงานสำเร็จแล้ว',
        color: 'green',
        icon: <TbBuilding size={16} />,
      })
      queryClient.invalidateQueries(['accounting-marketplace'])
      form.reset()
      onClose()
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error.response?.data?.message || 'ไม่สามารถสร้างรายการขายงานได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const handleSubmit = (values: typeof form.values) => {
    createMutation.mutate({
      build: values.build,
      tax_year: currentTaxMonth.year,
      tax_month: currentTaxMonth.month,
      price: values.price,
    })
  }

  const buildOptions =
    eligibleBuildsResponse?.data.map((build) => ({
      value: build.build,
      label: build.label,
    })) || []

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="สร้างรายการขายงาน"
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Alert
            icon={<TbAlertCircle size={16} />}
            title="เดือนภาษีปัจจุบัน"
            styles={{
              root: {
                backgroundColor: '#ffffff',
                border: '1px solid #ff6b35',
                color: '#ff6b35',
              },
              title: {
                color: '#ff6b35',
              },
              message: {
                color: '#ff6b35',
              },
              icon: {
                color: '#ff6b35',
              },
            }}
          >
            เดือนภาษี: {currentTaxMonth.month}/{currentTaxMonth.year} (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
          </Alert>

          <Select
            label="Build *"
            placeholder="เลือก Build"
            data={buildOptions}
            searchable
            {...form.getInputProps('build')}
            leftSection={<TbBuilding size={16} />}
          />

          {/* Display status information when build is selected */}
          {selectedBuild && (monthlyTaxData || clientData) && (
            <Card withBorder p="md" style={{ backgroundColor: '#fff9e6' }}>
              <Stack gap="xs">
                <Text size="sm" fw={600} c="orange">
                  สถานะงานด่วน
                </Text>
                <Group gap="md">
                  <div>
                    <Text size="xs" c="dimmed">
                      สถานะ ภ.ง.ด. *
                    </Text>
                    <Badge
                      color={getStatusColor(monthlyTaxData?.pnd_status || null)}
                      variant="light"
                    >
                      {getStatusLabel(monthlyTaxData?.pnd_status || null)}
                    </Badge>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      สถานะ ภ.พ.30 *
                    </Text>
                    <Badge
                      color={getStatusColor(monthlyTaxData?.pp30_form || null)}
                      variant="light"
                    >
                      {getStatusLabel(monthlyTaxData?.pp30_form || null)}
                    </Badge>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      สถานะจดทะเบียนภาษี
                    </Text>
                    <Badge
                      color={clientData?.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'green' : 'orange'}
                      variant="light"
                    >
                      {clientData?.tax_registration_status || 'ยังไม่ระบุ'}
                    </Badge>
                  </div>
                </Group>
                
                {/* Display responsible persons (except accounting_responsible) */}
                {(monthlyTaxData?.tax_inspection_responsible_first_name ||
                  monthlyTaxData?.document_entry_responsible_first_name ||
                  monthlyTaxData?.wht_filer_current_employee_first_name ||
                  monthlyTaxData?.wht_filer_employee_first_name ||
                  monthlyTaxData?.vat_filer_current_employee_first_name ||
                  monthlyTaxData?.vat_filer_employee_first_name) && (
                  <Stack gap="xs" mt="xs">
                    <Text size="xs" fw={600} c="orange">
                      ผู้รับผิดชอบ
                    </Text>
                    <Group gap="md">
                      {monthlyTaxData?.tax_inspection_responsible_first_name && (
                        <div>
                          <Text size="xs" c="dimmed">
                            ผู้ตรวจภาษี
                          </Text>
                          <Text size="xs" c="dark">
                            {formatEmployeeName(
                              monthlyTaxData.tax_inspection_responsible_first_name,
                              monthlyTaxData.tax_inspection_responsible_nick_name
                            )}
                          </Text>
                        </div>
                      )}
                      {monthlyTaxData?.document_entry_responsible_first_name && (
                        <div>
                          <Text size="xs" c="dimmed">
                            พนักงานที่รับผิดชอบในการคีย์
                          </Text>
                          <Text size="xs" c="dark">
                            {formatEmployeeName(
                              monthlyTaxData.document_entry_responsible_first_name,
                              monthlyTaxData.document_entry_responsible_nick_name
                            )}
                          </Text>
                        </div>
                      )}
                      {(monthlyTaxData?.wht_filer_current_employee_first_name ||
                        monthlyTaxData?.wht_filer_employee_first_name) && (
                        <div>
                          <Text size="xs" c="dimmed">
                            พนักงานที่ยื่น WHT
                          </Text>
                          <Text size="xs" c="dark">
                            {formatEmployeeName(
                              monthlyTaxData.wht_filer_current_employee_first_name ||
                                monthlyTaxData.wht_filer_employee_first_name,
                              monthlyTaxData.wht_filer_current_employee_nick_name ||
                                monthlyTaxData.wht_filer_employee_nick_name
                            )}
                          </Text>
                        </div>
                      )}
                      {(monthlyTaxData?.vat_filer_current_employee_first_name ||
                        monthlyTaxData?.vat_filer_employee_first_name) && (
                        <div>
                          <Text size="xs" c="dimmed">
                            พนักงานที่ยื่น VAT
                          </Text>
                          <Text size="xs" c="dark">
                            {formatEmployeeName(
                              monthlyTaxData.vat_filer_current_employee_first_name ||
                                monthlyTaxData.vat_filer_employee_first_name,
                              monthlyTaxData.vat_filer_current_employee_nick_name ||
                                monthlyTaxData.vat_filer_employee_nick_name
                            )}
                          </Text>
                        </div>
                      )}
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          <TextInput
            label="เดือนภาษี"
            value={`${currentTaxMonth.month}/${currentTaxMonth.year}`}
            readOnly
            disabled
          />

          <NumberInput
            label="ราคา (บาท) *"
            placeholder="ระบุราคา"
            min={150}
            step={50}
            {...form.getInputProps('price')}
            description="ราคาขั้นต่ำ 150 บาท"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" color="orange" loading={createMutation.isLoading}>
              ขายงาน
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export default CreateListingModal
