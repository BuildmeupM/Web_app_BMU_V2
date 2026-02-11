/**
 * EmployeeDetail Component
 * แสดงข้อมูลพนักงานรายละเอียด (13 fields + รูปภาพ)
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Grid,
  Stack,
  Text,
  Avatar,
  Badge,
  Group,
  Button,
  Divider,
  Title,
  Paper,
  SimpleGrid,
  Alert,
  List,
} from '@mantine/core'
import { TbEdit, TbPhone, TbMail, TbCalendar, TbMapPin, TbId, TbAlertCircle, TbCheck } from 'react-icons/tb'
import { Employee, employeeService } from '../../services/employeeService'
import { useAuthStore } from '../../store/authStore'

interface EmployeeDetailProps {
  employee: Employee
  onEdit?: () => void
}

export default function EmployeeDetail({ employee, onEdit }: EmployeeDetailProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'
  const canEdit = isAdmin || user?.employee_id === employee.employee_id

  const [workingDaysData, setWorkingDaysData] = useState<{
    years: number
    months: number
    days: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load working days
    const loadWorkingDays = async () => {
      try {
        setLoading(true)
        const data = await employeeService.getWorkingDays(employee.id)
        setWorkingDaysData({
          years: data.working_years,
          months: data.working_months,
          days: data.working_days_remaining,
        })
      } catch (error) {
        console.error('Error loading working days:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkingDays()
  }, [employee.id])

  // Format working duration as "X ปี Y เดือน Z วัน"
  const formatWorkingDuration = (years: number, months: number, days: number) => {
    const parts: string[] = []
    if (years > 0) parts.push(`${years} ปี`)
    if (months > 0) parts.push(`${months} เดือน`)
    if (days > 0) parts.push(`${days} วัน`)
    return parts.length > 0 ? parts.join(' ') : '0 วัน'
  }

  // Mask ID card (X-XXXX-XXXXX-XX-X) - Thai standard format
  const maskIdCard = (idCard: string | null | undefined) => {
    if (!idCard || typeof idCard !== 'string' || idCard.trim() === '') return '-'
    const cleanedIdCard = idCard.replace(/-/g, '') // Remove existing dashes
    if (cleanedIdCard.length !== 13) return cleanedIdCard // Return as-is if not 13 digits
    return `${cleanedIdCard[0]}-${cleanedIdCard.substring(1, 5)}-${cleanedIdCard.substring(5, 10)}-${cleanedIdCard.substring(10, 12)}-${cleanedIdCard[12]}`
  }

  // Format date (handle timezone issues)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'

    // Parse date string and extract components directly
    // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
    const dateOnly = dateString.split('T')[0] // Get YYYY-MM-DD part only
    const dateParts = dateOnly.split('-') // Format: YYYY-MM-DD
    if (dateParts.length !== 3) {
      console.warn(`formatDate: Invalid date format "${dateString}"`)
      return '-'
    }

    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
    const day = parseInt(dateParts[2], 10)

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
      console.warn(`formatDate: Invalid date parts from "${dateString}": year=${year}, month=${month + 1}, day=${day}`)
      return '-'
    }

    // Convert year to Buddhist Era (BE) by adding 543
    const beYear = year + 543

    // Thai month names
    const thaiMonths = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ]

    // Format directly from date components to avoid timezone issues
    // Use the parsed day, month, year directly without creating Date object
    const formatted = `${day} ${thaiMonths[month]} ${beYear}`

    return formatted
  }

  // Check for incomplete data
  const getIncompleteFields = () => {
    const incomplete: string[] = []

    // Check optional but important fields
    if (!employee.company_email) incomplete.push('Email Build')
    if (!employee.phone) incomplete.push('เบอร์โทร')
    if (!employee.personal_email) incomplete.push('Email ส่วนตัว')
    if (!employee.birth_date) incomplete.push('วันเกิด')
    if (!employee.english_name) incomplete.push('ชื่อภาษาอังกฤษ')
    if (!employee.address_full && !employee.province) incomplete.push('ที่อยู่')
    if (!employee.profile_image) incomplete.push('รูปภาพ')

    return incomplete
  }

  const incompleteFields = getIncompleteFields()
  const hasIncompleteData = incompleteFields.length > 0

  return (
    <Stack gap="lg">
      {/* Incomplete Data Alert */}
      {hasIncompleteData && (
        <Alert
          icon={<TbAlertCircle size={16} />}
          color="orange"
          title="⚠️ ข้อมูลยังไม่ครบถ้วน"
        >
          <Stack gap="xs">
            <Text size="sm">
              พบข้อมูลที่ยังไม่ครบถ้วน {incompleteFields.length} รายการ กรุณาแก้ไขข้อมูลดังต่อไปนี้:
            </Text>
            <List size="sm" spacing="xs">
              {incompleteFields.map((field, index) => (
                <List.Item key={index}>{field}</List.Item>
              ))}
            </List>
            {canEdit && onEdit && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<TbEdit size={14} />}
                onClick={onEdit}
                mt="xs"
              >
                แก้ไขข้อมูลตอนนี้
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      {/* Complete Data Alert */}
      {!hasIncompleteData && (
        <Alert
          icon={<TbCheck size={16} />}
          color="green"
          title="✅ ข้อมูลครบถ้วน"
        >
          <Text size="sm">ข้อมูลพนักงานครบถ้วนทั้งหมดแล้ว</Text>
        </Alert>
      )}
      {/* Header Section */}
      <Card
        withBorder
        style={{
          borderColor: '#ff6b35',
          borderWidth: '1px',
        }}
      >
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack align="center" gap="md">
              <Avatar
                src={employee.profile_image}
                alt={employee.full_name}
                size={200}
                radius="xl"
              >
                {employee.full_name.charAt(0)}
              </Avatar>
              {canEdit && onEdit && (
                <Button leftSection={<TbEdit size={16} />} onClick={onEdit}>
                  แก้ไขข้อมูล
                </Button>
              )}
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <div>
                <Text size="sm" c="dimmed">
                  ชื่อ - นามสกุล
                </Text>
                <Title order={3}>
                  {employee.full_name}
                  {employee.nick_name && ` (${employee.nick_name})`}
                </Title>
              </div>
              <Group>
                <Badge color={employee.status === 'active' ? 'green' : 'red'} variant="light">
                  {employee.status === 'active' ? 'ทำงานอยู่' : 'ลาออก'}
                </Badge>
                <Text size="sm" c="dimmed">
                  รหัสพนักงาน: {employee.employee_id}
                </Text>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Personal Information - รวมข้อมูลส่วนตัว, การติดต่อ, และที่อยู่ */}
      <Card
        withBorder
        style={{
          borderColor: '#ff6b35',
          borderWidth: '1px',
        }}
      >
        <Title order={4} mb="md">
          ข้อมูลส่วนตัว
        </Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Basic Personal Information */}
          <div>
            <Text size="sm" c="dimmed">
              รหัสบัตรประชาชน
            </Text>
            <Group gap="xs" mt={4}>
              <TbId size={16} />
              <Text>{maskIdCard(employee.id_card)}</Text>
            </Group>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              เพศ
            </Text>
            <Text mt={4}>
              {employee.gender === 'male' ? 'ชาย' : employee.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              วันเกิด
            </Text>
            <Group gap="xs" mt={4}>
              <TbCalendar size={16} />
              <Text>{formatDate(employee.birth_date)}</Text>
            </Group>
          </div>
          {employee.nick_name && (
            <div>
              <Text size="sm" c="dimmed">
                ชื่อเล่น
              </Text>
              <Text mt={4}>{employee.nick_name}</Text>
            </div>
          )}
          {employee.english_name && (
            <div>
              <Text size="sm" c="dimmed">
                ชื่อภาษาอังกฤษ
              </Text>
              <Text mt={4}>{employee.english_name}</Text>
            </div>
          )}

          {/* Contact Information */}
          {employee.phone && (
            <div>
              <Text size="sm" c="dimmed">
                เบอร์โทร
              </Text>
              <Group gap="xs" mt={4}>
                <TbPhone size={16} />
                <Text>{employee.phone}</Text>
              </Group>
            </div>
          )}
          {employee.personal_email && (
            <div>
              <Text size="sm" c="dimmed">
                อีเมลส่วนตัว
              </Text>
              <Group gap="xs" mt={4}>
                <TbMail size={16} />
                <Text>{employee.personal_email}</Text>
              </Group>
            </div>
          )}
          {employee.company_email && (
            <div>
              <Text size="sm" c="dimmed">
                อีเมลบริษัท
              </Text>
              <Group gap="xs" mt={4}>
                <TbMail size={16} />
                <Text>{employee.company_email}</Text>
              </Group>
            </div>
          )}

          {/* Address Information - แสดงเฉพาะที่อยู่รวม */}
          {employee.address_full && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Text size="sm" c="dimmed">
                ที่อยู่
              </Text>
              <Group gap="xs" align="flex-start" mt={4}>
                <TbMapPin size={16} style={{ marginTop: 4 }} />
                <Text>{employee.address_full}</Text>
              </Group>
            </div>
          )}
        </SimpleGrid>
      </Card>

      {/* Employment Information - รวมสถิติการทำงาน */}
      <Card
        withBorder
        style={{
          borderColor: '#ff6b35',
          borderWidth: '1px',
        }}
      >
        <Title order={4} mb="md">
          ข้อมูลการทำงาน
        </Title>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed">
                ตำแหน่ง
              </Text>
              <Text mt={4} fw={500}>
                {employee.position}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                วันเริ่มงาน
              </Text>
              <Group gap="xs" mt={4}>
                <TbCalendar size={16} />
                <Text>{formatDate(employee.hire_date)}</Text>
              </Group>
            </div>
            {employee.probation_end_date && (
              <div>
                <Text size="sm" c="dimmed">
                  วันผ่านงาน
                </Text>
                <Group gap="xs" mt={4}>
                  <TbCalendar size={16} />
                  <Text>{formatDate(employee.probation_end_date)}</Text>
                </Group>
              </div>
            )}
            {employee.resignation_date && (
              <div>
                <Text size="sm" c="dimmed">
                  วันสิ้นสุด
                </Text>
                <Group gap="xs" mt={4}>
                  <TbCalendar size={16} />
                  <Text>{formatDate(employee.resignation_date)}</Text>
                </Group>
              </div>
            )}
            {workingDaysData !== null && (
              <div>
                <Text size="sm" c="dimmed">
                  ทำงานมาแล้ว
                </Text>
                <Text mt={4} fw={500} c="orange">
                  {formatWorkingDuration(workingDaysData.years, workingDaysData.months, workingDaysData.days)}
                </Text>
              </div>
            )}
          </SimpleGrid>

          {/* Leave Statistics Section */}
          {employee.leave_statistics?.breakdown && (
            <>
              <Divider my="md" />
              <div>
                <Title order={5} mb="md">
                  สถิติการลา
                </Title>
                <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
                  {employee.leave_statistics.breakdown.map((item: { type: string; used: number; quota: number | null; remaining: number | null }) => (
                    <Paper key={item.type} p="md" withBorder radius="md">
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" c="dimmed">
                          {item.type}
                        </Text>
                        {item.quota !== null ? (
                          <Badge
                            color={item.used > item.quota ? 'red' : 'orange'}
                            variant="filled"
                          >
                            {item.used}/{item.quota}
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">
                            {item.used} วัน
                          </Badge>
                        )}
                      </Group>
                      {item.quota !== null ? (
                        item.remaining !== null && item.remaining > 0 ? (
                          <Text size="xs" c="green">
                            เหลือ {item.remaining} วัน
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed">
                            ใช้หมดแล้ว
                          </Text>
                        )
                      ) : (
                        <Text size="xs" c="dimmed">
                          ไม่จำกัด
                        </Text>
                      )}
                    </Paper>
                  ))}
                </SimpleGrid>
              </div>
            </>
          )}

          {/* WFH Statistics Section */}
          {employee.wfh_statistics && (
            <>
              <Divider my="md" />
              <div>
                <Title order={5} mb="md">
                  สถิติการทำงาน WFH
                </Title>
                <Paper p="md" withBorder radius="md" style={{ maxWidth: 300 }}>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">
                      วัน WFH
                    </Text>
                    <Badge color="teal" variant="filled" size="lg">
                      {employee.wfh_statistics.used_wfh_days} วัน
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    WFH ไปแล้ว {employee.wfh_statistics.used_wfh_days} วัน ในปีนี้
                  </Text>
                </Paper>
              </div>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
