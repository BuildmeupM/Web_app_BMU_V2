/**
 * SessionHistorySection — Per-user session history with expandable rows
 */

import { useState } from 'react'
import { Card, Group, Text, Stack, Table, Badge, Skeleton, Paper, Box, Avatar } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { TbLogin, TbChevronDown, TbChevronUp } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { loginActivityService, type SessionHistoryUser } from '../../services/loginActivityService'
import { sessionStatusMap, formatDuration, formatTimeOnly } from './constants'

export default function SessionHistorySection() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const [expandedUser, setExpandedUser] = useState<string | null>(null)
    const dateStr = selectedDate
        ? selectedDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const { data: historyData, isLoading } = useQuery(
        ['login-activity', 'session-history', dateStr],
        () => loginActivityService.getSessionHistory(dateStr),
        { staleTime: 30_000, retry: 1 }
    )

    const users = historyData?.users || []

    const toggleUser = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId)
    }

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <TbLogin size={18} color="var(--mantine-color-violet-6)" />
                    <Text fw={700} size="sm">ประวัติ Login / Logout รายบุคคล</Text>
                    <Text size="xs" c="dimmed">
                        ({historyData?.totalSessions || 0} sessions)
                    </Text>
                </Group>
                <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="เลือกวันที่"
                    size="xs"
                    radius="xl"
                    maxDate={new Date()}
                    valueFormat="DD/MM/YYYY"
                    style={{ width: 160 }}
                    clearable={false}
                />
            </Group>

            {isLoading ? (
                <Stack gap="xs">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius="md" />)}
                </Stack>
            ) : users.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีข้อมูล session ในวันที่เลือก
                </Text>
            ) : (
                <Stack gap="xs">
                    {users.map((user: SessionHistoryUser) => {
                        const userId = user.user_id || user.username
                        const isExpanded = expandedUser === userId
                        const totalMin = user.sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

                        return (
                            <Paper
                                key={userId}
                                radius="md"
                                withBorder
                                style={{ overflow: 'hidden' }}
                            >
                                {/* User Row — clickable */}
                                <Box
                                    p="sm"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: isExpanded
                                            ? 'var(--mantine-color-violet-0)'
                                            : undefined,
                                    }}
                                    onClick={() => toggleUser(userId)}
                                >
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <Avatar size={30} radius="xl" color="violet">
                                                {(user.nick_name || user.user_name || user.username)?.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <div>
                                                <Text size="sm" fw={600}>
                                                    {user.nick_name || user.user_name || user.username}
                                                </Text>
                                                {(user.nick_name || user.user_name) && (
                                                    <Text size="xs" c="dimmed">@{user.username}</Text>
                                                )}
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            <Badge size="sm" variant="light" color="violet">
                                                {user.sessions.length} รายการ
                                            </Badge>
                                            <Badge size="sm" variant="light" color="gray">
                                                {formatDuration(totalMin)}
                                            </Badge>
                                            {isExpanded ? <TbChevronUp size={16} /> : <TbChevronDown size={16} />}
                                        </Group>
                                    </Group>
                                </Box>

                                {/* Expanded Sessions */}
                                {isExpanded && (
                                    <Box px="sm" pb="sm">
                                        <Table striped highlightOnHover>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Login</Table.Th>
                                                    <Table.Th>Logout</Table.Th>
                                                    <Table.Th>ระยะเวลา</Table.Th>
                                                    <Table.Th>สถานะ</Table.Th>
                                                    <Table.Th>IP</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {user.sessions.map((s) => {
                                                    const statusInfo = sessionStatusMap[s.session_status] || { label: s.session_status, color: 'gray' }
                                                    return (
                                                        <Table.Tr key={s.session_id}>
                                                            <Table.Td>
                                                                <Text size="xs" fw={500}>
                                                                    {formatTimeOnly(s.login_at)}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" c={s.logout_at ? undefined : 'dimmed'}>
                                                                    {s.logout_at ? formatTimeOnly(s.logout_at) : '—'}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" fw={500}>
                                                                    {formatDuration(s.duration_minutes)}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge
                                                                    size="xs"
                                                                    variant={s.session_status === 'active' ? 'filled' : 'light'}
                                                                    color={statusInfo.color}
                                                                >
                                                                    {statusInfo.label}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" c="dimmed">
                                                                    {s.ip_address || '—'}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    )
                                                })}
                                            </Table.Tbody>
                                        </Table>
                                    </Box>
                                )}
                            </Paper>
                        )
                    })}
                </Stack>
            )}
        </Card>
    )
}
