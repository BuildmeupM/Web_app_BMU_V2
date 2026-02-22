/**
 * HorizontalBarChart — Simple horizontal bar chart
 */

import { Box, Group, Stack, Text } from '@mantine/core'

export default function HorizontalBarChart({
    data,
    maxValue,
}: {
    data: Array<{ label: string; value: number; color: string }>
    maxValue: number
}) {
    return (
        <Stack gap="sm">
            {data.map((d, i) => (
                <Box key={i}>
                    <Group justify="space-between" mb={2}>
                        <Text size="xs" fw={500}>{d.label}</Text>
                        <Text size="xs" fw={700} c={d.color}>{d.value}</Text>
                    </Group>
                    <Box
                        style={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#f1f3f5',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            style={{
                                height: '100%',
                                width: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%`,
                                borderRadius: 5,
                                backgroundColor: d.color,
                                transition: 'width 0.6s ease',
                            }}
                        />
                    </Box>
                </Box>
            ))}
        </Stack>
    )
}
