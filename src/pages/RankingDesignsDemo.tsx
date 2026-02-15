import { Paper, Group, Text, Stack, RingProgress, Badge, Progress, Avatar, SimpleGrid, Box, Divider } from '@mantine/core'

export default function RankingDesignsDemo() {
    const O = '#ff6b35'
    const emp = { name: 'สมชาย', score: 95, done: 45, total: 50, fix: 2, fixPct: 4, rank: 'A' }

    return (
        <Stack gap="xl" p="md">
            <Text size="xl" fw={700} ta="center">✨ 5 Design Options for Ranking ✨</Text>

            {/* Option 1 */}
            <Paper p="md" radius="md" withBorder style={{ borderLeft: '4px solid #4caf50' }}>
                <Text size="sm" c="gray.5" mb="xs">Option 1: The Golden Podium</Text>
                <Group>
                    <Avatar color="green" radius="xl" size="lg">A</Avatar>
                    <Box style={{ flex: 1 }}>
                        <Text fw={700} size="lg">🥇 {emp.name}</Text>
                        <Group gap="xs">
                            <Badge size="sm" color="green" variant="light">เสร็จ {emp.done}</Badge>
                            <Badge size="sm" color="gray" variant="light">แก้ไข {emp.fix}</Badge>
                        </Group>
                    </Box>
                    <RingProgress
                        size={70}
                        thickness={6}
                        roundCaps
                        sections={[{ value: emp.score, color: 'green' }]}
                        label={<Text ta="center" size="sm" fw={700}>{emp.score}%</Text>}
                    />
                </Group>
            </Paper>

            {/* Option 2 */}
            <Paper p="md" radius="md" withBorder>
                <Text size="sm" c="gray.5" mb="xs">Option 2: The Performance Bar</Text>
                <Group justify="space-between" mb="xs">
                    <Group gap="xs"><Text size="lg">🥈</Text><Text fw={700}>{emp.name}</Text></Group>
                    <Badge color="blue" size="lg" radius="sm">RANK A</Badge>
                </Group>
                <Progress.Root size="xl" radius="xl">
                    <Progress.Section value={80} color="green"><Progress.Label>งาน 80%</Progress.Label></Progress.Section>
                    <Progress.Section value={15} color="gray"><Progress.Label>เหลือ 15%</Progress.Label></Progress.Section>
                    <Progress.Section value={5} color="red"><Progress.Label>แก้ 5%</Progress.Label></Progress.Section>
                </Progress.Root>
            </Paper>

            {/* Option 3 */}
            <Paper p="lg" radius="lg" style={{ background: 'linear-gradient(135deg, #fff 0%, #fff8f5 100%)', border: '1px solid #ffdecb' }}>
                <Text size="sm" c="gray.5" mb="xs">Option 3: Modern Glass</Text>
                <Group align="center">
                    <Avatar src={null} alt={emp.name} radius="xl" size="md" color="orange">{emp.name[0]}</Avatar>
                    <Text fw={700} size="lg">{emp.name}</Text>
                    <Group gap="xs" ml="auto">
                        <Box style={{ textAlign: 'center' }}>
                            <Text size="xs" c="gray.5">งาน</Text>
                            <Badge variant="dot" color="green" size="lg">90%</Badge>
                        </Box>
                        <Divider orientation="vertical" />
                        <Box style={{ textAlign: 'center' }}>
                            <Text size="xs" c="gray.5">แก้ไข</Text>
                            <Badge variant="dot" color="red" size="lg">5%</Badge>
                        </Box>
                    </Group>
                </Group>
            </Paper>

            {/* Option 4 */}
            <Paper p="sm" radius="md" withBorder>
                <Text size="sm" c="gray.5" mb="xs">Option 4: The Stat Row</Text>
                <Group gap="md">
                    <Text fw={900} size="xl" c="gray.3" style={{ fontStyle: 'italic' }}>#1</Text>
                    <Avatar radius="xl" size="sm" color="blue" />
                    <Box style={{ width: 120 }}><Text fw={600} lineClamp={1}>{emp.name}</Text></Box>
                    <Box style={{ flex: 1 }}>
                        <Group justify="space-between" mb={2}><Text size="xs">Progress</Text><Text size="xs">95%</Text></Group>
                        <Progress value={95} color="blue" size="sm" />
                    </Box>
                    <Box style={{ textAlign: 'right' }}>
                        <Text fw={700} size="lg" c="blue">A</Text>
                        <Text size="xs" c="gray.5">98.5</Text>
                    </Box>
                </Group>
            </Paper>

            {/* Option 5 */}
            <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #ff6b35' }}>
                <Text size="sm" c="gray.5" mb="xs">Option 5: The Metric Grid</Text>
                <SimpleGrid cols={2}>
                    <Stack gap={4} justify="center">
                        <Group gap="xs"><Text size="xl">🏆</Text><Text fw={700} size="lg">{emp.name}</Text></Group>
                        <Badge color="orange" variant="light">Rank A (Good)</Badge>
                    </Stack>
                    <SimpleGrid cols={2} spacing="xs">
                        <Paper withBorder p="xs" bg="gray.0"><Text size="xs" c="gray.5">งานเสร็จ</Text><Text fw={700} c="green">45</Text></Paper>
                        <Paper withBorder p="xs" bg="gray.0"><Text size="xs" c="gray.5">แก้ไข</Text><Text fw={700} c="red">2</Text></Paper>
                        <Paper withBorder p="xs" bg="gray.0"><Text size="xs" c="gray.5">% งาน</Text><Text fw={700} c="blue">95%</Text></Paper>
                        <Paper withBorder p="xs" bg="gray.0"><Text size="xs" c="gray.5">Score</Text><Text fw={700} c="orange">98</Text></Paper>
                    </SimpleGrid>
                </SimpleGrid>
            </Paper>
        </Stack>
    )
}
