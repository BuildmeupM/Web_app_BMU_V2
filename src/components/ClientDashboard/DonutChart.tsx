/**
 * DonutChart — CSS-based donut chart using Mantine RingProgress
 */

import { Box, Center, Group, Stack, Text, RingProgress } from '@mantine/core'

export default function DonutChart({
    data,
    total,
}: {
    data: Array<{ label: string; value: number; color: string }>
    total: number
}) {
    // Calculate ring segments for Mantine RingProgress
    const sections = data.map(d => ({
        value: total > 0 ? (d.value / total) * 100 : 0,
        color: d.color,
        tooltip: `${d.label}: ${d.value}`,
    }))

    return (
        <Box>
            <Center>
                <RingProgress
                    size={200}
                    thickness={28}
                    roundCaps
                    sections={sections}
                    label={
                        <Text ta="center" fw={700} size="xl">
                            {total}
                            <Text size="xs" c="dimmed" >รวม</Text>
                        </Text>
                    }
                />
            </Center>
            <Stack gap={6} mt="md">
                {data.map((d, i) => (
                    <Group key={i} gap="xs" justify="space-between">
                        <Group gap="xs">
                            <Box style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
                            <Text size="xs" c="dimmed">{d.label}</Text>
                        </Group>
                        <Group gap={4}>
                            <Text size="xs" fw={600}>{d.value}</Text>
                            <Text size="xs" c="dimmed">
                                ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                            </Text>
                        </Group>
                    </Group>
                ))}
            </Stack>
        </Box>
    )
}
