/**
 * Bot Export Management
 * จัดงานส่งออกระบบบอท — รอพัฒนา
 */

import { Container, Title, Stack, Card, Group, Text, Badge, Box } from '@mantine/core'
import { TbRobot } from 'react-icons/tb'

export default function BotExportManagement() {
    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
                        border: 'none',
                    }}
                >
                    <Group gap="md">
                        <Box
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <TbRobot size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>
                                จัดงานส่งออกระบบบอท
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                จัดการและส่งออกข้อมูลสำหรับระบบบอท
                            </Text>
                        </div>
                    </Group>
                </Card>

                <Card withBorder radius="lg" p="xl">
                    <Stack align="center" gap="md" py="xl">
                        <TbRobot size={64} color="#ccc" />
                        <Title order={3} c="dimmed">กำลังพัฒนา</Title>
                        <Text c="dimmed" ta="center" maw={400}>
                            ระบบจัดการส่งออกข้อมูลสำหรับระบบบอทอัตโนมัติ
                            กำลังอยู่ระหว่างการพัฒนา
                        </Text>
                        <Badge size="lg" variant="light" color="grape">Coming Soon</Badge>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    )
}
