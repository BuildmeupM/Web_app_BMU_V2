/**
 * StatCard — Statistics card for ClientDashboard
 */

import { Group, Stack, Text, Paper, ThemeIcon } from '@mantine/core'

export default function StatCard({
    icon: Icon,
    label,
    value,
    color,
    subtitle,
}: {
    icon: React.ComponentType<{ size?: number }>
    label: string
    value: number | string
    color: string
    subtitle?: string
}) {
    return (
        <Paper
            p="lg"
            radius="xl"
            withBorder
            style={{
                borderLeft: `4px solid ${color}`,
                background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                transition: 'all 0.2s ease',
                cursor: 'default',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 25px ${color}20`
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
            }}
        >
            <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.5px' }}>
                        {label}
                    </Text>
                    <Text fw={800} size="2rem" c="#333" style={{ lineHeight: 1.1 }}>
                        {value}
                    </Text>
                    {subtitle && (
                        <Text size="xs" c="dimmed">{subtitle}</Text>
                    )}
                </Stack>
                <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    style={{ backgroundColor: `${color}15`, color }}
                >
                    <Icon size={24} />
                </ThemeIcon>
            </Group>
        </Paper>
    )
}
