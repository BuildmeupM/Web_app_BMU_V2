import { useMemo } from 'react'
import { Container, Title, Text, SimpleGrid, Card, Group, Stack, Skeleton } from '@mantine/core'
import {
  TbUsers,
  TbCalendarEvent,
  TbCash,
  TbClock,
  TbFileText,
  TbTrendingUp,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { employeeService } from '../services/employeeService'
import { leaveService, wfhService } from '../services/leaveService'

type StatItem = {
  label: string
  value: string
  icon: typeof TbUsers
  color: string
}

export default function Dashboard() {
  const { user } = useAuthStore()

  // ดึงข้อมูลจริงจาก API (เฉพาะ role ที่มีสิทธิ์)
  const { data: empStats, isLoading: loadingEmp } = useQuery(
    ['dashboard', 'employees', 'statistics'],
    () => employeeService.getStatistics(),
    { staleTime: 60_000, retry: 1 }
  )
  const { data: leaveDashboard, isLoading: loadingLeave } = useQuery(
    ['dashboard', 'leave', 'summary'],
    () => leaveService.getDashboard(),
    { staleTime: 60_000, retry: 1 }
  )
  const { data: leavePending, isLoading: loadingPending } = useQuery(
    ['dashboard', 'leave', 'pending'],
    () => leaveService.getPending({ page: 1, limit: 1 }),
    { staleTime: 30_000, retry: 1 }
  )
  const { data: wfhDashboard, isLoading: loadingWFH } = useQuery(
    ['dashboard', 'wfh', 'summary'],
    () => wfhService.getDashboard(),
    { staleTime: 60_000, retry: 1 }
  )

  const pendingLeaveCount = leavePending?.data?.pagination?.total ?? null
  const totalActive = empStats?.total_active ?? null
  const leaveSummary = leaveDashboard?.data?.summary ?? null
  const wfhSummary = wfhDashboard?.data?.summary ?? null

  const isLoading = loadingEmp || loadingLeave || loadingPending || loadingWFH

  // สร้าง stats จาก API เมื่อมี ค้างค่า mock เป็น fallback
  const { title, stats } = useMemo((): { title: string; stats: StatItem[] } => {
    const fallback = (real: number | null | undefined, mock: string): string =>
      real != null ? String(real) : mock

    switch (user?.role) {
      case 'admin':
        return {
          title: 'แดชบอร์ดผู้ดูแลระบบ',
          stats: [
            { label: 'พนักงานทั้งหมด', value: fallback(totalActive, '–'), icon: TbUsers, color: 'blue' },
            { label: 'การลาที่รออนุมัติ', value: fallback(pendingLeaveCount, '–'), icon: TbCalendarEvent, color: 'yellow' },
            { label: 'การเบิกเงินเดือน', value: '–', icon: TbCash, color: 'green' },
            { label: 'เข้างานวันนี้', value: fallback(totalActive, '–'), icon: TbClock, color: 'orange' },
            { label: 'เอกสารที่รอคีย์', value: '–', icon: TbFileText, color: 'blue' },
            { label: 'ยื่นภาษีเดือนนี้', value: '–', icon: TbTrendingUp, color: 'green' },
          ],
        }
      case 'data_entry':
        return {
          title: 'แดชบอร์ดผู้คีย์ข้อมูล',
          stats: [
            { label: 'เอกสารที่รอคีย์', value: '–', icon: TbFileText, color: 'blue' },
            { label: 'การลาที่รออนุมัติ', value: fallback(pendingLeaveCount, '–'), icon: TbCalendarEvent, color: 'yellow' },
            { label: 'การเบิกเงินเดือน', value: '–', icon: TbCash, color: 'green' },
          ],
        }
      case 'data_entry_and_service':
        return {
          title: 'แดชบอร์ดผู้คีย์ข้อมูลและบริการ',
          stats: [
            { label: 'เอกสารที่รอคีย์', value: '–', icon: TbFileText, color: 'blue' },
            { label: 'เอกสารที่รอคัดแยก', value: '–', icon: TbFileText, color: 'orange' },
            { label: 'สถานะยื่นภาษี', value: '–', icon: TbTrendingUp, color: 'green' },
          ],
        }
      case 'audit':
        return {
          title: 'แดชบอร์ดผู้ตรวจสอบ',
          stats: [
            { label: 'เอกสารที่รอตรวจ', value: '–', icon: TbFileText, color: 'blue' },
            { label: 'การลาที่รออนุมัติ', value: fallback(pendingLeaveCount, '–'), icon: TbCalendarEvent, color: 'yellow' },
            { label: 'การเบิกเงินเดือน', value: '–', icon: TbCash, color: 'green' },
          ],
        }
      case 'service':
        return {
          title: 'แดชบอร์ดผู้ให้บริการ',
          stats: [
            { label: 'เอกสารที่รอคัดแยก', value: '–', icon: TbFileText, color: 'orange' },
            { label: 'สถานะยื่นภาษี', value: '–', icon: TbTrendingUp, color: 'green' },
            { label: 'เข้างานวันนี้', value: fallback(totalActive, '–'), icon: TbClock, color: 'blue' },
          ],
        }
      default:
        return { title: 'แดชบอร์ด', stats: [] }
    }
  }, [user?.role, totalActive, pendingLeaveCount])

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            {title}
          </Title>
          <Text c="dimmed">ยินดีต้อนรับ, {user?.name}</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {stats.map((stat, index) => (
            <Card key={index} padding="lg" radius="xl" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    {stat.label}
                  </Text>
                  {isLoading ? (
                    <Skeleton height={28} mt="xs" width={64} />
                  ) : (
                    <Text size="xl" fw={700} mt="xs">
                      {stat.value}
                    </Text>
                  )}
                </div>
                <stat.icon size={40} color={`var(--mantine-color-${stat.color}-6)`} />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
