/**
 * Company Detail Expandable Component
 * Component สำหรับแสดงรายละเอียดบริษัทและผู้รับผิดชอบ (แสดงแบบ expandable ในตาราง)
 */

import { Stack, Group, Text, Badge, SimpleGrid, Loader, Center, Paper } from '@mantine/core'
import { useQuery } from 'react-query'
import { TbBuilding, TbUser } from 'react-icons/tb'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import clientsService from '../../services/clientsService'
import workAssignmentsService from '../../services/workAssignmentsService'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('th')

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

// Helper function: Format address from client data
const formatAddress = (client: any): string => {
  if (!client) return '-'
  
  // Use full_address if available
  if (client.full_address) {
    return client.full_address
  }
  
  // Otherwise, build from individual fields
  const parts: string[] = []
  
  if (client.address_number) parts.push(`เลขที่ ${client.address_number}`)
  if (client.soi) parts.push(`ซอย ${client.soi}`)
  if (client.moo) parts.push(`หมู่ ${client.moo}`)
  if (client.road) parts.push(`ถนน ${client.road}`)
  if (client.subdistrict) parts.push(`แขวง/ตำบล ${client.subdistrict}`)
  if (client.district) parts.push(`อำเภอ/เขต ${client.district}`)
  if (client.province) parts.push(`จังหวัด ${client.province}`)
  if (client.postal_code) parts.push(`รหัสไปรษณีย์ ${client.postal_code}`)
  
  return parts.length > 0 ? parts.join(' ') : '-'
}

interface CompanyDetailExpandableProps {
  build: string
  companyName: string
  year: number
  month: number
}

export default function CompanyDetailExpandable({
  build,
  companyName,
  year,
  month,
}: CompanyDetailExpandableProps) {
  // Fetch client data
  const { data: clientData, isLoading: isLoadingClient } = useQuery(
    ['clients', build],
    () => clientsService.getByBuild(build),
    {
      enabled: !!build,
    }
  )

  // Fetch monthly tax data
  const { data: taxData, isLoading: isLoadingTaxData } = useQuery(
    ['monthly-tax-data', build, year, month],
    () => monthlyTaxDataService.getByBuildYearMonth(build, year, month),
    {
      enabled: !!build && !!year && !!month,
    }
  )

  // Fetch work assignment
  const { data: workAssignment, isLoading: isLoadingWorkAssignment } = useQuery(
    ['work-assignments', build, year, month],
    () => workAssignmentsService.getByBuildYearMonth(build, year, month),
    {
      enabled: !!build && !!year && !!month,
    }
  )

  const isLoading = isLoadingClient || isLoadingTaxData || isLoadingWorkAssignment

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    )
  }

  return (
    <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#fff9e6' }}>
      <Stack gap="md">
        {/* Company Information */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group gap="xs">
              <TbBuilding size={16} />
              <Text size="sm" fw={600}>
                ข้อมูลบริษัท
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Group gap="xs">
                <Text size="sm" fw={600} w={120}>
                  Build:
                </Text>
                <Badge variant="outline" color="orange">
                  {build}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text size="sm" fw={600} w={120}>
                  ชื่อบริษัท:
                </Text>
                <Text size="sm">{companyName || '-'}</Text>
              </Group>
              {clientData?.legal_entity_number && (
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    เลขทะเบียนนิติบุคคล:
                  </Text>
                  <Text size="sm">{clientData.legal_entity_number}</Text>
                </Group>
              )}
              {clientData?.business_type && (
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    ประเภทกิจการ:
                  </Text>
                  <Text size="sm">{clientData.business_type}</Text>
                </Group>
              )}
              {clientData?.tax_registration_status && (
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    สถานะจดทะเบียนภาษี:
                  </Text>
                  <Badge
                    color={clientData.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'green' : 'orange'}
                    variant="light"
                  >
                    {clientData.tax_registration_status}
                  </Badge>
                </Group>
              )}
              {clientData?.vat_registration_date && (
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    วันที่จดภาษีมูลค่าเพิ่ม:
                  </Text>
                  <Text size="sm">
                    {dayjs(clientData.vat_registration_date).format('DD/MM/YYYY')}
                  </Text>
                </Group>
              )}
              {formatAddress(clientData) !== '-' && (
                <Group gap="xs" style={{ gridColumn: '1 / -1' }}>
                  <Text size="sm" fw={600} w={120}>
                    ที่อยู่บริษัท:
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {formatAddress(clientData)}
                  </Text>
                </Group>
              )}
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Responsible Employees */}
        {(workAssignment || taxData) && (
          <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#fff3e0' }}>
            <Group gap="xs" mb="md">
              <TbUser size={20} color="#ff6b35" />
              <Text size="md" fw={600} c="orange">
                ข้อมูลผู้รับผิดชอบ
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {/* Get accounting_responsible from work_assignments (fallback to monthly_tax_data) */}
              {(workAssignment?.accounting_responsible || taxData?.accounting_responsible) && (
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    ผู้ทำบัญชี:
                  </Text>
                  <Text size="sm">
                    {workAssignment?.accounting_responsible_name
                      ? workAssignment.accounting_responsible_name
                      : taxData?.accounting_responsible_first_name
                      ? formatEmployeeName(
                          taxData.accounting_responsible_first_name,
                          taxData.accounting_responsible_nick_name
                        )
                      : workAssignment?.accounting_responsible || taxData?.accounting_responsible || '-'}
                  </Text>
                </Group>
              )}
              {/* Get tax_inspection_responsible from work_assignments (fallback to monthly_tax_data) */}
              {(workAssignment?.tax_inspection_responsible || taxData?.tax_inspection_responsible) && (
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    ผู้ตรวจภาษี:
                  </Text>
                  <Text size="sm">
                    {workAssignment?.tax_inspection_responsible_name
                      ? workAssignment.tax_inspection_responsible_name
                      : taxData?.tax_inspection_responsible_first_name
                      ? formatEmployeeName(
                          taxData.tax_inspection_responsible_first_name,
                          taxData.tax_inspection_responsible_nick_name
                        )
                      : workAssignment?.tax_inspection_responsible || taxData?.tax_inspection_responsible || '-'}
                  </Text>
                </Group>
              )}
              {/* document_entry_responsible */}
              {taxData?.document_entry_responsible && (
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    พนักงานที่รับผิดชอบในการคีย์:
                  </Text>
                  <Text size="sm">
                    {formatEmployeeName(
                      taxData.document_entry_responsible_first_name,
                      taxData.document_entry_responsible_nick_name
                    )}
                  </Text>
                </Group>
              )}
              {/* wht_filer */}
              {(taxData?.wht_filer_current_employee_id || taxData?.wht_filer_employee_id) && (
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    พนักงานที่ยื่น WHT:
                  </Text>
                  <Text size="sm">
                    {formatEmployeeName(
                      taxData.wht_filer_current_employee_first_name ||
                        taxData.wht_filer_employee_first_name,
                      taxData.wht_filer_current_employee_nick_name ||
                        taxData.wht_filer_employee_nick_name
                    )}
                  </Text>
                </Group>
              )}
              {/* vat_filer */}
              {(taxData?.vat_filer_current_employee_id || taxData?.vat_filer_employee_id) && (
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    พนักงานที่ยื่น VAT:
                  </Text>
                  <Text size="sm">
                    {formatEmployeeName(
                      taxData.vat_filer_current_employee_first_name ||
                        taxData.vat_filer_employee_first_name,
                      taxData.vat_filer_current_employee_nick_name ||
                        taxData.vat_filer_employee_nick_name
                    )}
                  </Text>
                </Group>
              )}
            </SimpleGrid>
          </Paper>
        )}
      </Stack>
    </Paper>
  )
}
