import {
  Text,
  Group,
  Stack,
  Divider,
  Grid,
  Progress,
  ThemeIcon,
  Paper,
  Badge,
} from '@mantine/core'
import {
  TbUsers,
  TbUserCheck,
  TbUserOff,
  TbActivityHeartbeat,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import dayjs from 'dayjs'
import usersService from '../../services/usersService'

interface UserTelemetryDashboardProps {
  getRoleLabel: (role: string) => string
}

export function UserTelemetryDashboard({ getRoleLabel }: UserTelemetryDashboardProps) {
  // Fetch ALL users for Global Telemetry Dashboard (unaffected by table filters)
  const { data: globalUsersData } = useQuery(
    ['users-telemetry'],
    () =>
      usersService.getList({
        role: 'all',
        status: 'all',
      }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  const telemetryUsers = globalUsersData?.data || []
  const activeUsers = telemetryUsers.filter((u) => u.status === 'active').length
  const inactiveUsers = telemetryUsers.filter((u) => u.status === 'inactive').length

  // Calculate top roles
  const roleCount = telemetryUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topRoles = Object.entries(roleCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) // Show top 3 roles

  // Recent logins (login within 7 days)
  const recentLogins = telemetryUsers.filter((u) => {
    if (!u.last_login_at) return false
    return dayjs().diff(dayjs(u.last_login_at), 'day') <= 7
  }).length

  return (
    <Paper withBorder p="xl" radius="sm" style={{ borderColor: '#2C2E33', borderWidth: 2 }}>
      <Grid align="center" gutter="xl">
        {/* 30% Left: Massive Total & Health Status */}
        <Grid.Col span={{ base: 12, md: 4 }} style={{ borderRight: '1px solid #E9ECEF' }}>
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} variant="light" color="dark" radius="md">
              <TbUsers size={28} />
            </ThemeIcon>
            <Text size="3rem" fw={900} lh={1} mt="sm">
              {telemetryUsers.length}
            </Text>
            <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: 1 }}>
              Total Users
            </Text>

            <Group mt="lg" gap="xl">
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="green.7">
                  {activeUsers}
                </Text>
                <Group gap={4}>
                  <TbUserCheck size={14} color="var(--mantine-color-green-7)" />
                  <Text size="xs" c="dimmed">Active</Text>
                </Group>
              </Stack>
              <Divider orientation="vertical" />
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="red.6">
                  {inactiveUsers}
                </Text>
                <Group gap={4}>
                  <TbUserOff size={14} color="var(--mantine-color-red-6)" />
                  <Text size="xs" c="dimmed">Suspended</Text>
                </Group>
              </Stack>
            </Group>
          </Stack>
        </Grid.Col>

        {/* 70% Right: Role Distribution & Recent Activity Flow */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="xl" pl={{ base: 0, md: 'md' }}>
            {/* Role Flow */}
            <div>
              <Text size="sm" fw={600} c="dark" mb="md" tt="uppercase" style={{ letterSpacing: 1 }}>
                Role Distribution Top 3
              </Text>
              <Stack gap="sm">
                {topRoles.map(([role, count]) => {
                  const percentage =
                    telemetryUsers.length > 0
                      ? Math.round((count / telemetryUsers.length) * 100)
                      : 0
                  return (
                    <div key={role}>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={500}>
                          {getRoleLabel(role)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {count} ({percentage}%)
                        </Text>
                      </Group>
                      <Progress value={percentage} color="dark" size="md" radius="xs" />
                    </div>
                  )
                })}
                {topRoles.length === 0 && (
                  <Text size="sm" c="dimmed">
                    ไม่มีข้อมูล Role
                  </Text>
                )}
              </Stack>
            </div>

            <Divider />

            {/* Activity Insight */}
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <ThemeIcon variant="outline" color="orange.6" size="lg" radius="md">
                  <TbActivityHeartbeat size={20} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>
                    Recent Activity Insight
                  </Text>
                  <Text size="xs" c="dimmed">
                    ล็อคอินภายใน 7 วันที่ผ่านมา
                  </Text>
                </div>
              </Group>
              <Badge size="xl" variant="filled" color="orange.6" radius="sm">
                {recentLogins} ผู้เข้าใช้งานล่าสุด
              </Badge>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Paper>
  )
}
