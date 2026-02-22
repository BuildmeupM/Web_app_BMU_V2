/**
 * SummaryCard — Ring progress summary card for AccountingDashboard
 */

import { Paper, Stack, Group, Text, RingProgress } from '@mantine/core'

export default function SummaryCard({
    title, value, total, color, icon,
}: {
    title: string
    value: number
    total: number
    color: string
    icon?: string
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    return (
        <Paper
            p="lg"
            radius="lg"
            className="acct-glass-card"
            style={{ minHeight: 150 }}
        >
            <Stack gap="xs" align="center">
                <Group gap={6}>
                    {icon && <div className="acct-section-icon" style={{ width: 28, height: 28, fontSize: 14 }}>{icon}</div>}
                    <Text size="xs" c="gray.6" fw={600} ta="center">{title}</Text>
                </Group>
                <RingProgress
                    size={80}
                    thickness={6}
                    roundCaps
                    sections={[{ value: pct, color }]}
                    label={
                        <Text ta="center" fw={800} size="lg" c="dark" className="acct-summary-value" style={{ fontSize: 20 }}>
                            {value}
                        </Text>
                    }
                />
                <Text size="xs" c="gray.5" fw={600}>{pct}%</Text>
            </Stack>
        </Paper>
    )
}
