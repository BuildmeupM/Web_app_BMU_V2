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
import { TbUserCheck } from 'react-icons/tb'
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
                style={{
                    padding: '10px 14px',
                    border: '1px solid rgba(132, 94, 247, 0.2)',
                    background: 'linear-gradient(135deg, var(--mantine-color-gray-0) 0%, #fff 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default',
                    transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
            >
                <Group wrap="nowrap" gap="sm">
                    <Box style={{ position: 'relative' }}>
                        <Avatar size="md" radius="xl" color="violet">
                            {(user.nick_name || user.user_name || user.username)?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box
                            className="pulse-dot"
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: 'var(--mantine-color-green-5)',
                                border: '2px solid white',
                                zIndex: 2,
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
