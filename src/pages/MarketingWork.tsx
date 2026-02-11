/**
 * Marketing Work (งานออกแบบ/การตลาด)
 * หน้าจัดการงานออกแบบและการตลาด — ระบบภายใน
 * เข้าถึงได้เฉพาะ role: admin, marketing
 */

import { Container, Title, Stack, Card, Group, Text, Badge, Box, SimpleGrid, ThemeIcon } from '@mantine/core'
import { TbPalette, TbPhoto, TbTargetArrow, TbArticle, TbBrandInstagram, TbSpeakerphone } from 'react-icons/tb'

// Feature cards for marketing work
const marketingFeatures = [
    {
        icon: TbPhoto,
        title: 'ออกแบบกราฟิก',
        description: 'ออกแบบสื่อประชาสัมพันธ์ โลโก้ แบนเนอร์',
        color: '#e91e63',
    },
    {
        icon: TbTargetArrow,
        title: 'วางแผนการตลาด',
        description: 'วางกลยุทธ์และแผนการตลาดรายเดือน',
        color: '#9c27b0',
    },
    {
        icon: TbArticle,
        title: 'จัดการ Content',
        description: 'เขียนบทความ โพสต์ และเนื้อหาต่างๆ',
        color: '#2196f3',
    },
    {
        icon: TbBrandInstagram,
        title: 'Social Media',
        description: 'จัดการ Social Media ทุกช่องทาง',
        color: '#ff5722',
    },
    {
        icon: TbSpeakerphone,
        title: 'โปรโมชั่น / แคมเปญ',
        description: 'วางแผนและจัดการโปรโมชั่นต่างๆ',
        color: '#4caf50',
    },
]

export default function MarketingWork() {
    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header Banner */}
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
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
                            <TbPalette size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>
                                งานออกแบบ/การตลาด
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                จัดการงานออกแบบกราฟิก วางแผนการตลาด และจัดการ Content
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Feature Cards */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {marketingFeatures.map((feature) => (
                        <Card
                            key={feature.title}
                            withBorder
                            radius="lg"
                            p="lg"
                            style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(-4px)'
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = ''
                            }}
                        >
                            <Stack gap="sm">
                                <ThemeIcon
                                    size={48}
                                    radius="lg"
                                    variant="light"
                                    style={{
                                        backgroundColor: `${feature.color}15`,
                                        color: feature.color,
                                    }}
                                >
                                    <feature.icon size={26} />
                                </ThemeIcon>
                                <Text fw={600} size="md">
                                    {feature.title}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {feature.description}
                                </Text>
                                <Badge size="sm" variant="light" color="pink" mt="xs">
                                    กำลังพัฒนา
                                </Badge>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* Coming Soon Notice */}
                <Card withBorder radius="lg" p="xl">
                    <Stack align="center" gap="md" py="md">
                        <TbPalette size={48} color="#ccc" />
                        <Text c="dimmed" ta="center" maw={500}>
                            ระบบงานออกแบบ/การตลาดกำลังอยู่ระหว่างการพัฒนา
                            ฟีเจอร์ต่างๆ จะถูกเพิ่มเข้ามาในเร็วๆ นี้
                        </Text>
                        <Badge size="lg" variant="light" color="pink">Coming Soon</Badge>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    )
}
