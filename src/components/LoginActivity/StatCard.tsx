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
    icon: React.ElementType
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
                borderColor: `var(--mantine-color-${color}-1)`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
            }}
            onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = '0 8px 15px rgba(0,0,0,0.05)'
            }}
            onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
            }}
        >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" truncate>
                        {label}
                    </Text>
                    {loading ? (
                        <Skeleton height={36} mt="xs" width={80} radius="md" />
                    ) : (
                        <Text size="xl" fw={800} mt={4} c={`${color}.7`} style={{ letterSpacing: '-0.5px' }}>
                            {value}
                        </Text>
                    )}
                    {subtitle && (
                        <Text size="xs" c="dimmed" mt={4} truncate>
                            {subtitle}
                        </Text>
                    )}
                </div>
                <Box
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: '16px', // squircle look
                        background: `linear-gradient(135deg, var(--mantine-color-${color}-0) 0%, var(--mantine-color-${color}-1) 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Icon size={24} color={`var(--mantine-color-${color}-6)`} stroke={2} />
                </Box>
            </Group>
        </Card>
    )
}
