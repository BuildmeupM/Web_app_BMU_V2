/**
 * StatusDonutChart — Donut chart with legend for status distribution
 */

import { Paper, Box, Group, Stack, Text } from '@mantine/core'
import {
    PieChart, Pie, Cell,
    Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import type { StatusCount } from './constants'

export default function StatusDonutChart({
    data, title, subtitle, total,
}: {
    data: StatusCount[]
    title: string
    subtitle: string
    total: number
}) {
    return (
        <Paper
            p="lg"
            radius="lg"
            className="acct-glass-card"
        >
            <Text size="sm" fw={600} c="dark" mb={4}>{title}</Text>
            <Text size="xs" c="gray.6" mb="md">{subtitle}</Text>
            <Group align="center" justify="center" gap="xl">
                <Box style={{ position: 'relative' }}>
                    <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                stroke="none"
                            >
                                {data.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{
                                    background: '#ffffff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    color: '#333',
                                    fontSize: 12,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <Box
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}
                    >
                        <Text fw={700} size="xl" c="dark">{total}</Text>
                        <Text size="xs" c="gray.5">Total</Text>
                    </Box>
                </Box>
                {/* Legend */}
                <Stack gap={6}>
                    {data.map((item) => {
                        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                        return (
                            <Group key={item.status} gap={8}>
                                <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                <Text size="xs" c="gray.6" style={{ minWidth: 100 }}>{item.label}</Text>
                                <Text size="xs" c="dark" fw={600}>{pct}%</Text>
                            </Group>
                        )
                    })}
                </Stack>
            </Group>
        </Paper>
    )
}
