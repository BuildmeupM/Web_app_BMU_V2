/**
 * ClientDetail Component
 * แสดงรายละเอียดข้อมูลลูกค้า (รวม 4 ตารางที่เกี่ยวข้อง)
 * พร้อมปุ่มแก้ไขแยกสำหรับ: ค่ารายเดือน, DBD, Credentials
 */

import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Textarea,
  Table,
} from '@mantine/core'
import {
  TbBuilding, TbMapPin, TbFileInvoice, TbEdit, TbCalendar,
  TbKey, TbCoin, TbShieldCheck, TbBuildingBank, TbPlus,
} from 'react-icons/tb'
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
  onEditMonthlyFees?: () => void
  onEditDbdInfo?: () => void
  onEditCredentials?: () => void
}

const getCompanyStatusColor = (status: string): string => {
  switch (status) {
    case 'รายเดือน': return 'green'
    case 'รายเดือน / วางมือ': return 'yellow'
    case 'รายเดือน / จ่ายรายปี': return 'blue'
    case 'รายเดือน / เดือนสุดท้าย': return 'orange'
    case 'ยกเลิกทำ': return 'red'
    default: return 'gray'
  }
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  try { return dayjs(dateStr).format('DD MMMM BBBB') }
  catch { return dateStr }
}

const formatLegalEntityNumber = (number: string | null | undefined): string => {
  if (!number) return '-'
  return number.replace(/-/g, '')
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const cardStyle = { borderLeft: '4px solid #ff6b35', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)' }

const SectionHeader = ({ icon: Icon, title, onAction, actionLabel, actionIcon }: {
  icon: React.ComponentType<{ size: number; color: string }>
  title: string
  onAction?: () => void
  actionLabel?: string
  actionIcon?: React.ReactNode
}) => (
  <Group justify="space-between" mb="md">
    <Group gap="xs">
      <Icon size={20} color="#ff6b35" />
      <Text fw={700} size="lg" c="#ff6b35">{title}</Text>
    </Group>
    {onAction && (
      <Button
        leftSection={actionIcon || <TbEdit size={14} />}
        variant="light"
        color="orange"
        size="xs"
        onClick={onAction}
      >
        {actionLabel || 'แก้ไข'}
      </Button>
    )}
  </Group>
)

const InfoItem = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <div>
    <Text size="sm" c="dimmed" mb={4}>{label}</Text>
    {typeof value === 'string' ? <Text fw={500}>{value}</Text> : value}
  </div>
)

export default function ClientDetail({ client, onEdit, onEditMonthlyFees, onEditDbdInfo, onEditCredentials }: ClientDetailProps) {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'data_entry' || user?.role === 'data_entry_and_service'

  const af = client.accounting_fees
  const dbd = client.dbd_info
  const boi = client.boi_info
  const creds = client.agency_credentials

  return (
    <Stack gap="lg">
      {/* Card 1: Header */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <Group justify="space-between" mb="md">
          <Group gap="md">
            <TbBuilding size={32} color="#ff6b35" />
            <div>
              <Group gap="sm" mb="xs">
                <Badge color="orange" size="lg" variant="light">{client.build}</Badge>
                <Badge color={getCompanyStatusColor(client.company_status)} variant="light">{client.company_status}</Badge>
                <Badge color="blue" variant="light">{client.business_type}</Badge>
              </Group>
              <Text fw={700} size="xl" c="#ff6b35">{client.company_name}</Text>
            </div>
          </Group>
          {canEdit && onEdit && (
            <Button leftSection={<TbEdit size={16} />} color="orange" variant="light" onClick={onEdit}>
              แก้ไขข้อมูลหลัก
            </Button>
          )}
        </Group>
      </Card>

      {/* Card 2: ข้อมูลพื้นฐาน */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader icon={TbBuilding} title="ข้อมูลพื้นฐาน" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <InfoItem label="เลขทะเบียนนิติบุคคล" value={formatLegalEntityNumber(client.legal_entity_number)} />
          <InfoItem label="วันจัดตั้งกิจการ" value={
            <Group gap="xs"><TbCalendar size={16} color="#666" /><Text fw={500}>{formatDate(client.establishment_date)}</Text></Group>
          } />
          <InfoItem label="ประเภทธุรกิจ" value={client.business_category || '-'} />
          <InfoItem label="ประเภทธุรกิจย่อย" value={client.business_subcategory || '-'} />
          <InfoItem label="ไซต์บริษัท" value={
            client.company_size ? <Badge variant="light" color="blue">{client.company_size}</Badge> : '-'
          } />
        </SimpleGrid>
      </Card>

      {/* Card 3: ข้อมูลภาษี */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader icon={TbFileInvoice} title="ข้อมูลภาษี" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <InfoItem label="สถานะจดภาษีมูลค่าเพิ่ม" value={
            client.tax_registration_status ? (
              <Badge color={client.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? 'green' : 'red'} variant="light">
                {client.tax_registration_status}
              </Badge>
            ) : '-'
          } />
          <InfoItem label="วันที่จดภาษีมูลค่าเพิ่ม" value={
            <Group gap="xs"><TbCalendar size={16} color="#666" /><Text fw={500}>{formatDate(client.vat_registration_date)}</Text></Group>
          } />
        </SimpleGrid>
      </Card>

      {/* Card 4: ที่อยู่ */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader icon={TbMapPin} title="ที่อยู่บริษัท" />
        {client.full_address ? (
          <Textarea value={client.full_address} readOnly minRows={3} styles={{ input: { backgroundColor: '#f8f9fa', cursor: 'default' } }} />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {client.village && <InfoItem label="หมู่บ้าน" value={client.village} />}
            {client.building && <InfoItem label="อาคาร" value={client.building} />}
            {client.room_number && <InfoItem label="ห้องเลขที่" value={client.room_number} />}
            {client.floor_number && <InfoItem label="ชั้นที่" value={client.floor_number} />}
            {client.address_number && <InfoItem label="เลขที่" value={client.address_number} />}
            {client.soi && <InfoItem label="ซอย/ตรอก" value={client.soi} />}
            {client.moo && <InfoItem label="หมู่ที่" value={client.moo} />}
            {client.road && <InfoItem label="ถนน" value={client.road} />}
            {client.subdistrict && <InfoItem label="แขวง/ตำบล" value={client.subdistrict} />}
            {client.district && <InfoItem label="อำเภอ/เขต" value={client.district} />}
            {client.province && <InfoItem label="จังหวัด" value={client.province} />}
            {client.postal_code && <InfoItem label="รหัสไปรษณีย์" value={client.postal_code} />}
            {!client.village && !client.building && !client.room_number && !client.floor_number &&
              !client.address_number && !client.soi && !client.moo && !client.road &&
              !client.subdistrict && !client.district && !client.province && !client.postal_code && (
                <Text c="dimmed">ไม่มีข้อมูลที่อยู่</Text>
              )}
          </SimpleGrid>
        )}
      </Card>

      {/* Card 5: ค่าทำบัญชี / ค่าบริการ HR — ย้ายไปจัดการที่หน้า ค่าทำบัญชี / ค่าบริการ HR แทน */}

      {/* Card 6: ข้อมูล DBD */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader
          icon={TbBuildingBank}
          title="ข้อมูลกรมพัฒนาธุรกิจ (DBD)"
          onAction={canEdit ? onEditDbdInfo : undefined}
          actionLabel={dbd ? 'แก้ไขข้อมูล DBD' : 'เพิ่มข้อมูล DBD'}
          actionIcon={dbd ? <TbEdit size={14} /> : <TbPlus size={14} />}
        />
        {dbd ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <InfoItem label="รอบปีบัญชี" value={dbd.accounting_period || '-'} />
            <InfoItem label="ทุนจดทะเบียน" value={dbd.registered_capital ? `${formatCurrency(dbd.registered_capital)} บาท` : '-'} />
            <InfoItem label="ทุนชำระแล้ว" value={dbd.paid_capital ? `${formatCurrency(dbd.paid_capital)} บาท` : '-'} />
            <InfoItem label="รหัสธุรกิจ" value={dbd.business_code || '-'} />
            <InfoItem label="รหัสธุรกิจล่าสุด" value={dbd.latest_business_code || '-'} />
            {dbd.business_objective_at_registration && (
              <div style={{ gridColumn: '1 / -1' }}>
                <InfoItem label="วัตถุประสงค์ที่จดทะเบียน" value={dbd.business_objective_at_registration} />
              </div>
            )}
            {dbd.latest_business_objective && (
              <div style={{ gridColumn: '1 / -1' }}>
                <InfoItem label="วัตถุประสงค์ล่าสุด" value={dbd.latest_business_objective} />
              </div>
            )}
          </SimpleGrid>
        ) : (
          <Text c="dimmed" ta="center">ยังไม่มีข้อมูล DBD</Text>
        )}
      </Card>

      {/* Card 7: ข้อมูล BOI */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader icon={TbShieldCheck} title="ข้อมูลสิทธิ์ BOI" />
        {boi ? (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <InfoItem label="วันที่อนุมัติ BOI" value={formatDate(boi.boi_approval_date)} />
            <InfoItem label="วันที่เริ่มใช้สิทธิ์ BOI" value={formatDate(boi.boi_first_use_date)} />
            <InfoItem label="วันที่หมดอายุ BOI" value={formatDate(boi.boi_expiry_date)} />
          </SimpleGrid>
        ) : (
          <Text c="dimmed" ta="center">ไม่มีข้อมูล BOI</Text>
        )}
      </Card>

      {/* Card 8: รหัสผู้ใช้หน่วยงานราชการ */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader
          icon={TbKey}
          title="รหัสผู้ใช้หน่วยงานราชการ"
          onAction={canEdit ? onEditCredentials : undefined}
          actionLabel={creds ? 'แก้ไขรหัสผู้ใช้' : 'เพิ่มรหัสผู้ใช้'}
          actionIcon={creds ? <TbEdit size={14} /> : <TbPlus size={14} />}
        />
        {creds ? (
          <Table withTableBorder withColumnBorders striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>หน่วยงาน</Table.Th>
                <Table.Th>Username</Table.Th>
                <Table.Th>Password</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[
                { label: 'e-Filing (สรรพากร)', user: creds.efiling_username, pass: creds.efiling_password },
                { label: 'ประกันสังคม (SSO)', user: creds.sso_username, pass: creds.sso_password },
                { label: 'กรมพัฒนาธุรกิจ (DBD)', user: creds.dbd_username, pass: creds.dbd_password },
                { label: 'กยศ. (Student Loan)', user: creds.student_loan_username, pass: creds.student_loan_password },
                { label: 'บังคับคดี (Enforcement)', user: creds.enforcement_username, pass: creds.enforcement_password },
              ].map(({ label, user: u, pass }) => (
                <Table.Tr key={label}>
                  <Table.Td fw={500}>{label}</Table.Td>
                  <Table.Td>{u || '-'}</Table.Td>
                  <Table.Td>{pass || '-'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" ta="center">ยังไม่มีข้อมูลรหัสผู้ใช้</Text>
        )}
      </Card>

      {/* Card 9: ข้อมูลเพิ่มเติม */}
      <Card withBorder radius="lg" p="lg" style={cardStyle}>
        <SectionHeader icon={TbCalendar} title="ข้อมูลเพิ่มเติม" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <InfoItem label="วันที่สร้าง" value={
            <Group gap="xs"><TbCalendar size={16} color="#666" />
              <Text fw={500}>{client.created_at ? dayjs(client.created_at).format('DD MMMM YYYY HH:mm') : '-'}</Text>
            </Group>
          } />
          <InfoItem label="วันที่อัปเดตล่าสุด" value={
            <Group gap="xs"><TbCalendar size={16} color="#666" />
              <Text fw={500}>{client.updated_at ? dayjs(client.updated_at).format('DD MMMM YYYY HH:mm') : '-'}</Text>
            </Group>
          } />
        </SimpleGrid>
      </Card>
    </Stack>
  )
}
