/**
 * ClientList Component
 * แสดงรายชื่อลูกค้าในรูปแบบตาราง
 */

import { memo } from 'react'
import { Table, Text, Badge, ActionIcon, Group, Center, Tooltip } from '@mantine/core'
import { TbEye, TbEdit, TbTrash } from 'react-icons/tb'
import { Client } from '../../services/clientsService'
import { useAuthStore } from '../../store/authStore'

interface ClientListProps {
  clients: Client[]
  loading: boolean
  onRowClick: (client: Client) => void
  onEdit?: (client: Client) => void
  onDelete?: (client: Client) => void
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

const getTaxRegistrationStatusColor = (status: string | null | undefined): string => {
  if (!status) return 'gray'
  switch (status) {
    case 'จดภาษีมูลค่าเพิ่ม':
      return 'green'
    case 'ยังไม่จดภาษีมูลค่าเพิ่ม':
      return 'red'
    default:
      return 'gray'
  }
}

const ClientList = memo(function ClientList({
  clients,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: ClientListProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const canEdit = isAdmin || user?.role === 'data_entry' || user?.role === 'data_entry_and_service'

  if (loading) {
    return (
      <Center py="xl">
        <Text c="dimmed">กำลังโหลดข้อมูล...</Text>
      </Center>
    )
  }

  if (clients.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">ไม่พบข้อมูลลูกค้า</Text>
      </Center>
    )
  }

  return (
    <Table.ScrollContainer minWidth={1000}>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Build Code</Table.Th>
            <Table.Th>ชื่อบริษัท</Table.Th>
            <Table.Th ta="center">เลขทะเบียนนิติบุคคล</Table.Th>
            <Table.Th ta="center">สถานะจดภาษีมูลค่าเพิ่ม</Table.Th>
            <Table.Th ta="center">สถานะบริษัท</Table.Th>
            <Table.Th ta="center">จัดการ</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {clients.map((client) => (
            <Table.Tr
              key={client.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onRowClick(client)}
            >
              <Table.Td>
                <Badge color="orange" size="lg" variant="light">
                  {client.build}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text fw={500}>{client.company_name}</Text>
              </Table.Td>
              <Table.Td ta="center">
                <Text size="sm" c="dimmed">
                  {client.legal_entity_number
                    ? client.legal_entity_number.replace(/-/g, '')
                    : '-'}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                {client.tax_registration_status ? (
                  <Badge color={getTaxRegistrationStatusColor(client.tax_registration_status)} variant="light">
                    {client.tax_registration_status}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">-</Text>
                )}
              </Table.Td>
              <Table.Td ta="center">
                <Badge color={getCompanyStatusColor(client.company_status)} variant="light">
                  {client.company_status}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="center" onClick={(e) => e.stopPropagation()}>
                  <Tooltip label="ดูรายละเอียด">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => onRowClick(client)}
                    >
                      <TbEye size={18} />
                    </ActionIcon>
                  </Tooltip>
                  {canEdit && (
                    <Tooltip label="แก้ไข">
                      <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={() => onEdit?.(client)}
                      >
                        <TbEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {isAdmin && (
                    <Tooltip label="ลบ">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete?.(client)}
                      >
                        <TbTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
})

export default ClientList
