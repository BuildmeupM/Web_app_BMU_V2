/**
 * SessionSummarySection — Daily session summary table
 */

import { useState } from 'react'
import { Card, Group, Text, Stack, Table, Badge, Skeleton, Avatar } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { TbClock } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { loginActivityService, type SessionSummary } from '../../services/loginActivityService'
import { formatDuration, formatTimeOnly } from './constants'

export default function SessionSummarySection() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const dateStr = selectedDate
        ? selectedDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const { data: summaryData, isLoading } = useQuery(
        ['login-activity', 'session-summary', dateStr],
        () => loginActivityService.getSessionSummary(dateStr),
        { staleTime: 30_000, retry: 1 }
    )

    const summary = summaryData?.summary || []

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <TbClock size={18} color="var(--mantine-color-blue-6)" />
                    <Text fw={700} size="sm">สรุปเวลาใช้งานรายวัน</Text>
                    <Text size="xs" c="dimmed">({summary.length} คน)</Text>
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
                    {[1, 2, 3].map(i => <Skeleton key={i} height={40} radius="md" />)}
                </Stack>
            ) : summary.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีข้อมูล session ในวันที่เลือก
                </Text>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>พนักงาน</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>Sessions</Table.Th>
                            <Table.Th>เวลาใช้งานรวม</Table.Th>
                            <Table.Th>Login แรก</Table.Th>
                            <Table.Th>Active ล่าสุด</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>สถานะ</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {summary.map((s: SessionSummary) => (
                            <Table.Tr key={s.user_id || s.username}>
                                <Table.Td>
                                    <Group gap="xs">
                                        <Avatar size={28} radius="xl" color="blue">
                                            {(s.nick_name || s.user_name || s.username)?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {s.nick_name || s.user_name || s.username}
                                            </Text>
                                            {(s.nick_name || s.user_name) && (
                                                <Text size="xs" c="dimmed">@{s.username}</Text>
                                            )}
                                        </div>
                                    </Group>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                    <Badge size="sm" variant="light" color="blue">{s.session_count}</Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={600} c={s.total_minutes >= 60 ? 'green' : 'orange'}>
                                        {formatDuration(s.total_minutes)}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{formatTimeOnly(s.first_login)}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{formatTimeOnly(s.last_activity)}</Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                    {s.is_online ? (
                                        <Badge size="sm" variant="filled" color="green">ออนไลน์</Badge>
                                    ) : (
                                        <Badge size="sm" variant="light" color="gray">ออฟไลน์</Badge>
                                    )}
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Card>
    )
}
