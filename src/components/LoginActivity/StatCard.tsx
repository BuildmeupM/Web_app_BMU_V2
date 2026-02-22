/**
 * StatCard — Summary statistics card for LoginActivity
 */

import { Card, Group, Text, Skeleton, Box } from '@mantine/core'

export default function StatCard({
    label,
    value,
    icon: Icon,
    color,
    subtitle,
    loading,
}: {
    label: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    subtitle?: string
    loading?: boolean
}) {
    return (
        <Card
            padding="lg"
            radius="xl"
            withBorder
            style={{
                borderColor: `var(--mantine-color-${color}-2)`,
                transition: 'all 0.2s ease',
            }}
        >
            <Group justify="space-between">
                <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        {label}
                    </Text>
                    {loading ? (
                        <Skeleton height={32} mt="xs" width={80} />
                    ) : (
                        <Text size="xl" fw={700} mt="xs" c={color}>
                            {value}
                        </Text>
                    )}
                    {subtitle && (
                        <Text size="xs" c="dimmed" mt={4}>
                            {subtitle}
                        </Text>
                    )}
                </div>
                <Box
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: `var(--mantine-color-${color}-0)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon size={28} color={`var(--mantine-color-${color}-6)`} />
                </Box>
            </Group>
        </Card>
    )
}
