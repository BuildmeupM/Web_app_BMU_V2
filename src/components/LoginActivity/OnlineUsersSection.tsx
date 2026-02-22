/**
 * OnlineUsersSection — Grid of online user cards
 */

import {
    Card,
    Group,
    Text,
    SimpleGrid,
    Skeleton,
    Tooltip,
    Paper,
    Box,
    Avatar,
    Badge,
} from '@mantine/core'
import { TbUserCheck, TbPoint } from 'react-icons/tb'
import type { OnlineUser } from '../../services/loginActivityService'

/* ─── Online User Card ─── */
function OnlineUserCard({ user }: { user: OnlineUser }) {
    const durationLabel =
        user.session_duration_minutes < 60
            ? `${user.session_duration_minutes} นาที`
            : `${Math.floor(user.session_duration_minutes / 60)} ชม. ${user.session_duration_minutes % 60} น.`

    return (
        <Tooltip
            label={`${user.nick_name || user.user_name || user.username} — ออนไลน์ ${durationLabel}`}
            withArrow
        >
            <Paper
                p="xs"
                radius="md"
                shadow="xs"
                style={{
                    border: '2px solid var(--mantine-color-green-6)',
                    backgroundColor: '#fff',
                    cursor: 'default',
                    transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    ; (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                    ; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                }}
            >
                <Group gap={6} wrap="nowrap">
                    <Box style={{ position: 'relative' }}>
                        <Avatar
                            size={28}
                            radius="xl"
                            color="green"
                        >
                            {(user.nick_name || user.user_name || user.username)
                                ?.charAt(0)
                                .toUpperCase()}
                        </Avatar>
                        <TbPoint
                            size={12}
                            color="#40c057"
                            fill="#40c057"
                            style={{
                                position: 'absolute',
                                bottom: -1,
                                right: -1,
                            }}
                        />
                    </Box>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <Text size="xs" fw={600} truncate>
                            {user.nick_name || user.user_name || user.username}
                        </Text>
                        <Badge
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<TbUserCheck size={10} />}
                        >
                            {durationLabel}
                        </Badge>
                    </div>
                </Group>
            </Paper>
        </Tooltip>
    )
}

/* ─── Online Users Section (Grid layout) ─── */
export default function OnlineUsersSection({
    users,
    loading,
}: {
    users: OnlineUser[]
    loading: boolean
}) {
    if (loading) {
        return (
            <Card shadow="sm" radius="lg" padding="md" withBorder>
                <Group gap="xs" mb="md">
                    <Text fw={700} size="sm">ผู้ใช้ออนไลน์</Text>
                </Group>
                <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }} spacing="xs">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} height={50} radius="md" />
                    ))}
                </SimpleGrid>
            </Card>
        )
    }

    return (
        <Card shadow="sm" radius="lg" padding="md" withBorder>
            <Group gap="xs" mb="md">
                <Text fw={700} size="sm">ผู้ใช้ออนไลน์</Text>
                <Text size="xs" c="dimmed">({users.length} คน)</Text>
            </Group>

            {users.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                    ไม่มีผู้ใช้ออนไลน์ในขณะนี้
                </Text>
            ) : (
                <SimpleGrid
                    cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 7 }}
                    spacing="xs"
                >
                    {users.map((user) => (
                        <OnlineUserCard key={user.user_id} user={user} />
                    ))}
                </SimpleGrid>
            )}
        </Card>
    )
}
