/**
 * Registration Work — Dashboard งานทะเบียน
 * หน้า Dashboard สำหรับงานทะเบียน
 * เข้าถึงได้เฉพาะ role: admin, registration
 */

import { useNavigate } from 'react-router-dom'
import { Container, Title, Stack, Card, Group, Text, Badge, Box, SimpleGrid, ThemeIcon } from '@mantine/core'
import { TbClipboardData, TbBuildingBank, TbReceiptTax, TbShieldCheck, TbUsers, TbArrowRight } from 'react-icons/tb'

// Department cards config
const departmentCards = [
    {
        key: 'dbd',
        path: '/registration-work/dbd',
        icon: TbBuildingBank,
        title: 'กรมพัฒนาธุรกิจการค้า (DBD)',
        description: 'จดทะเบียนบริษัท ห้างหุ้นส่วน แก้ไขเปลี่ยนแปลงทะเบียน',
        color: '#1565c0',
    },
    {
        key: 'rd',
        path: '/registration-work/rd',
        icon: TbReceiptTax,
        title: 'กรมสรรพากร (RD)',
        description: 'จดทะเบียนภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ',
        color: '#e65100',
    },
    {
        key: 'sso',
        path: '/registration-work/sso',
        icon: TbShieldCheck,
        title: 'สำนักงานประกันสังคม (SSO)',
        description: 'ขึ้นทะเบียนนายจ้าง ลูกจ้าง งานประกันสังคม',
        color: '#2e7d32',
    },
    {
        key: 'hr',
        path: '/registration-work/hr',
        icon: TbUsers,
        title: 'งานฝ่ายบุคคล HR',
        description: 'งานทะเบียนฝ่ายบุคคล สัญญาจ้าง เอกสาร HR',
        color: '#7b1fa2',
    },
]

export default function RegistrationWork() {
    const navigate = useNavigate()

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header Banner */}
                <Card
                    withBorder
                    radius="xl"
                    p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
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
                            <TbClipboardData size={32} color="white" />
                        </Box>
                        <div>
                            <Title order={2} c="white" fw={700}>
                                Dashboard งานทะเบียน
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                ภาพรวมระบบจัดการงานทะเบียน ภาษี และประกันสังคม
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Department Cards */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {departmentCards.map((dept) => (
                        <Card
                            key={dept.key}
                            withBorder
                            radius="lg"
                            p={0}
                            style={{
                                cursor: 'pointer',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => navigate(dept.path)}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(-4px)'
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = ''
                            }}
                        >
                            {/* Department Color Header */}
                            <Box
                                p="md"
                                style={{
                                    background: `linear-gradient(135deg, ${dept.color} 0%, ${dept.color}cc 100%)`,
                                }}
                            >
                                <Group gap="sm" justify="space-between">
                                    <Group gap="sm">
                                        <ThemeIcon
                                            size={40}
                                            radius="md"
                                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                        >
                                            <dept.icon size={22} color="white" />
                                        </ThemeIcon>
                                        <div>
                                            <Text fw={700} c="white" size="md">{dept.title}</Text>
                                            <Text c="white" size="xs" style={{ opacity: 0.85 }}>{dept.description}</Text>
                                        </div>
                                    </Group>
                                    <ThemeIcon
                                        size={32}
                                        radius="xl"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        <TbArrowRight size={18} color="white" />
                                    </ThemeIcon>
                                </Group>
                            </Box>

                            {/* Content area — placeholder for future stats */}
                            <Box p="md">
                                <Group justify="center">
                                    <Badge size="sm" variant="light" color="blue">
                                        กำลังพัฒนา
                                    </Badge>
                                </Group>
                            </Box>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    )
}
