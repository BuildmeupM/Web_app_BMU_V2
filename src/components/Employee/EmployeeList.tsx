/**
 * EmployeeList Component
 * แสดงรายชื่อพนักงานในรูปแบบตาราง
 */

import { useState, memo } from 'react'
import {
  Table,
  Text,
  Badge,
  Avatar,
  ActionIcon,
  Group,
  Stack,
  Loader,
  Center,
  Tooltip,
} from '@mantine/core'
import { TbEye, TbEdit, TbTrash, TbAlertCircle } from 'react-icons/tb'
import { Employee } from '../../services/employeeService'
import { useAuthStore } from '../../store/authStore'

interface EmployeeListProps {
  employees: Employee[]
  loading: boolean
  onRowClick: (employee: Employee) => void
  onEdit?: (employee: Employee) => void
  onDelete?: (employee: Employee) => void
}

const EmployeeList = memo(function EmployeeList({
  employees,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: EmployeeListProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  // Check if employee has incomplete data
  const hasIncompleteData = (employee: Employee) => {
    return (
      !employee.company_email ||
      !employee.phone ||
      !employee.personal_email ||
      !employee.birth_date ||
      !employee.english_name ||
      (!employee.address_full && !employee.province) ||
      !employee.profile_image
    )
  }

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    )
  }

  if (employees.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">ไม่พบข้อมูลพนักงาน</Text>
      </Center>
    )
  }

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>รูปภาพ</Table.Th>
            <Table.Th>รหัสพนักงาน</Table.Th>
            <Table.Th>ชื่อ - นามสกุล</Table.Th>
            <Table.Th ta="center">ตำแหน่ง</Table.Th>
            <Table.Th ta="center">สถานะ</Table.Th>
            <Table.Th ta="center">วันเริ่มงาน</Table.Th>
            <Table.Th ta="center">วันลา</Table.Th>
            <Table.Th ta="center">WFH</Table.Th>
            {isAdmin && <Table.Th ta="center">จัดการ</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map((employee) => (
            <Table.Tr
              key={employee.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onRowClick(employee)}
            >
              <Table.Td>
                <Avatar
                  src={employee.profile_image}
                  alt={employee.full_name}
                  size="md"
                  radius="xl"
                >
                  {employee.full_name.charAt(0)}
                </Avatar>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Text fw={500}>{employee.employee_id}</Text>
                  {hasIncompleteData(employee) && (
                    <Tooltip label="ข้อมูลยังไม่ครบถ้วน" withArrow>
                      <Badge size="xs" color="orange" variant="dot" />
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Text>
                    {employee.full_name}
                    {employee.nick_name && ` (${employee.nick_name})`}
                  </Text>
                  {hasIncompleteData(employee) && (
                    <Tooltip label="ข้อมูลยังไม่ครบถ้วน - คลิกเพื่อดูรายละเอียด" withArrow>
                      <ActionIcon
                        size="xs"
                        color="orange"
                        variant="transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowClick(employee)
                        }}
                      >
                        <TbAlertCircle size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td ta="center">
                <Text>{employee.position}</Text>
              </Table.Td>
              <Table.Td ta="center">
                <Group justify="center" gap="xs">
                  <Badge
                    color={employee.status === 'active' ? 'green' : 'red'}
                    variant="light"
                  >
                    {employee.status === 'active' ? 'ทำงานอยู่' : 'ลาออก'}
                  </Badge>
                </Group>
              </Table.Td>
              <Table.Td ta="center">
                <Text>
                  {(() => {
                    const dateParts = employee.hire_date.split('T')[0].split('-')
                    const year = parseInt(dateParts[0])
                    const month = parseInt(dateParts[1]) - 1
                    const day = parseInt(dateParts[2])
                    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
                    return `${day} ${thaiMonths[month]} ${year + 543}`
                  })()}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                <Badge color="blue" variant="light">
                  {(employee as any).leave_days_used ?? 0} วัน
                </Badge>
              </Table.Td>
              <Table.Td ta="center">
                <Badge color="teal" variant="light">
                  {(employee as any).wfh_days_used ?? 0} วัน
                </Badge>
              </Table.Td>
              {isAdmin && (
                <Table.Td ta="center">
                  <Group justify="center" gap="xs" onClick={(e) => e.stopPropagation()}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => onRowClick(employee)}
                    >
                      <TbEye size={18} />
                    </ActionIcon>
                    {onEdit && (
                      <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={() => onEdit(employee)}
                      >
                        <TbEdit size={18} />
                      </ActionIcon>
                    )}
                    {onDelete && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete(employee)}
                      >
                        <TbTrash size={18} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
})

export default EmployeeList
