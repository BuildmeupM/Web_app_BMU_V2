/**
 * Accounting Fee Notifications
 * รับแจ้งเรื่องเกี่ยวกับค่าทำบัญชี — รอพัฒนา
 */

import { Container, Title, Stack, Card, Group, Text, Badge, Box } from '@mantine/core'
import { TbBellRinging } from 'react-icons/tb'

export default function AccountingFeeNotifications() {
    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
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
                            <TbBellRinging size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>
                                รับแจ้งเรื่องเกี่ยวกับค่าทำบัญชี
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                ระบบแจ้งเตือนและจัดการเรื่องเกี่ยวกับค่าทำบัญชี
                            </Text>
                        </div>
                    </Group>
                </Card>

                <Card withBorder radius="lg" p="xl">
                    <Stack align="center" gap="md" py="xl">
                        <TbBellRinging size={64} color="#ccc" />
                        <Title order={3} c="dimmed">กำลังพัฒนา</Title>
                        <Text c="dimmed" ta="center" maw={400}>
                            ระบบรับแจ้งเรื่องเกี่ยวกับค่าทำบัญชี การติดตาม
                            และจัดการข้อร้องเรียน กำลังอยู่ระหว่างการพัฒนา
                        </Text>
                        <Badge size="lg" variant="light" color="orange">Coming Soon</Badge>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    )
}
