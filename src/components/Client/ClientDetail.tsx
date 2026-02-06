/**
 * ClientDetail Component
 * แสดงรายละเอียดข้อมูลลูกค้า
 */

import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Divider,
  Textarea,
} from '@mantine/core'
import { TbBuilding, TbMapPin, TbFileInvoice, TbEdit, TbCalendar } from 'react-icons/tb'
import { Client } from '../../services/clientsService'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

dayjs.extend(buddhistEra)
dayjs.locale('th')

interface ClientDetailProps {
  client: Client
  onEdit?: () => void
}

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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  try {
    // Format date with Buddhist Era (พ.ศ.) - BBBB is the format code for full BE year
    return dayjs(dateStr).format('DD MMMM BBBB')
  } catch {
    return dateStr
  }
}

const formatLegalEntityNumber = (number: string | null | undefined): string => {
  if (!number) return '-'
  // Remove any existing dashes and return clean 13-digit number
  const cleaned = number.replace(/-/g, '')
  // Return as-is if it's already 13 digits, otherwise return cleaned version
  return cleaned.length === 13 ? cleaned : cleaned
}

export default function ClientDetail({ client, onEdit }: ClientDetailProps) {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'admin' || user?.role === 'data_entry' || user?.role === 'data_entry_and_service'

  return (
    <Stack gap="lg">
      {/* Card 1: Header Section */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }}
      >
        <Group justify="space-between" mb="md">
          <Group gap="md">
            <TbBuilding size={32} color="#ff6b35" />
            <div>
              <Group gap="sm" mb="xs">
                <Badge color="orange" size="lg" variant="light">
                  {client.build}
                </Badge>
                <Badge color={getCompanyStatusColor(client.company_status)} variant="light">
                  {client.company_status}
                </Badge>
                <Badge color="blue" variant="light">
                  {client.business_type}
                </Badge>
              </Group>
              <Text fw={700} size="xl" c="#ff6b35">
                {client.company_name}
              </Text>
            </div>
          </Group>
          {canEdit && onEdit && (
            <Button
              leftSection={<TbEdit size={16} />}
              color="orange"
              variant="light"
              onClick={onEdit}
            >
              แก้ไขข้อมูล
            </Button>
          )}
        </Group>
      </Card>

      {/* Card 2: ข้อมูลพื้นฐาน */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }}
      >
        <Group gap="xs" mb="md" justify="center">
          <TbBuilding size={20} color="#ff6b35" />
          <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
            ข้อมูลพื้นฐาน
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              เลขทะเบียนนิติบุคคล
            </Text>
            <Text fw={500}>{formatLegalEntityNumber(client.legal_entity_number)}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              วันจัดตั้งกิจการ
            </Text>
            <Group gap="xs">
              <TbCalendar size={16} color="#666" />
              <Text fw={500}>{formatDate(client.establishment_date)}</Text>
            </Group>
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              ประเภทธุรกิจ
            </Text>
            <Text fw={500}>{client.business_category || '-'}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              ประเภทธุรกิจย่อย
            </Text>
            <Text fw={500}>{client.business_subcategory || '-'}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              ไซต์บริษัท
            </Text>
            {client.company_size ? (
              <Badge variant="light" color="blue">
                {client.company_size}
              </Badge>
            ) : (
              <Text fw={500}>-</Text>
            )}
          </div>
        </SimpleGrid>
      </Card>

      {/* Card 3: ข้อมูลภาษี */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }}
      >
        <Group gap="xs" mb="md" justify="center">
          <TbFileInvoice size={20} color="#ff6b35" />
          <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
            ข้อมูลภาษี
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              สถานะจดภาษีมูลค่าเพิ่ม
            </Text>
            {client.tax_registration_status ? (
              <Badge
                color={client.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'green' : 'red'}
                variant="light"
              >
                {client.tax_registration_status}
              </Badge>
            ) : (
              <Text fw={500}>-</Text>
            )}
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              วันที่จดภาษีมูลค่าเพิ่ม
            </Text>
            <Group gap="xs">
              <TbCalendar size={16} color="#666" />
              <Text fw={500}>{formatDate(client.vat_registration_date)}</Text>
            </Group>
          </div>
        </SimpleGrid>
      </Card>

      {/* Card 4: ที่อยู่ */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }}
      >
        <Group gap="xs" mb="md" justify="center">
          <TbMapPin size={20} color="#ff6b35" />
          <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
            ที่อยู่บริษัท
          </Text>
        </Group>
        {client.full_address ? (
          <Textarea
            value={client.full_address}
            readOnly
            minRows={3}
            styles={{
              input: {
                backgroundColor: '#f8f9fa',
                cursor: 'default',
              },
            }}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {client.village && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  หมู่บ้าน
                </Text>
                <Text fw={500}>{client.village}</Text>
              </div>
            )}
            {client.building && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  อาคาร
                </Text>
                <Text fw={500}>{client.building}</Text>
              </div>
            )}
            {client.room_number && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  ห้องเลขที่
                </Text>
                <Text fw={500}>{client.room_number}</Text>
              </div>
            )}
            {client.floor_number && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  ชั้นที่
                </Text>
                <Text fw={500}>{client.floor_number}</Text>
              </div>
            )}
            {client.address_number && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  เลขที่
                </Text>
                <Text fw={500}>{client.address_number}</Text>
              </div>
            )}
            {client.soi && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  ซอย/ตรอก
                </Text>
                <Text fw={500}>{client.soi}</Text>
              </div>
            )}
            {client.moo && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  หมู่ที่
                </Text>
                <Text fw={500}>{client.moo}</Text>
              </div>
            )}
            {client.road && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  ถนน
                </Text>
                <Text fw={500}>{client.road}</Text>
              </div>
            )}
            {client.subdistrict && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  แขวง/ตำบล
                </Text>
                <Text fw={500}>{client.subdistrict}</Text>
              </div>
            )}
            {client.district && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  อำเภอ/เขต
                </Text>
                <Text fw={500}>{client.district}</Text>
              </div>
            )}
            {client.province && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  จังหวัด
                </Text>
                <Text fw={500}>{client.province}</Text>
              </div>
            )}
            {client.postal_code && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  รหัสไปรษณี
                </Text>
                <Text fw={500}>{client.postal_code}</Text>
              </div>
            )}
            {!client.village &&
              !client.building &&
              !client.room_number &&
              !client.floor_number &&
              !client.address_number &&
              !client.soi &&
              !client.moo &&
              !client.road &&
              !client.subdistrict &&
              !client.district &&
              !client.province &&
              !client.postal_code && (
                <Text c="dimmed">ไม่มีข้อมูลที่อยู่</Text>
              )}
          </SimpleGrid>
        )}
      </Card>

      {/* Card 5: ข้อมูลเพิ่มเติม */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }}
      >
        <Group gap="xs" mb="md" justify="center">
          <TbCalendar size={20} color="#ff6b35" />
          <Text fw={700} size="lg" c="#ff6b35" style={{ textAlign: 'center' }}>
            ข้อมูลเพิ่มเติม
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              วันที่สร้าง
            </Text>
            <Group gap="xs">
              <TbCalendar size={16} color="#666" />
              <Text fw={500}>
                {client.created_at ? dayjs(client.created_at).format('DD MMMM YYYY HH:mm') : '-'}
              </Text>
            </Group>
          </div>
          <div>
            <Text size="sm" c="dimmed" mb={4}>
              วันที่อัปเดตล่าสุด
            </Text>
            <Group gap="xs">
              <TbCalendar size={16} color="#666" />
              <Text fw={500}>
                {client.updated_at ? dayjs(client.updated_at).format('DD MMMM YYYY HH:mm') : '-'}
              </Text>
            </Group>
          </div>
        </SimpleGrid>
      </Card>
    </Stack>
  )
}
