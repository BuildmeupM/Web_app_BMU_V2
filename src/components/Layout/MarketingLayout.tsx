/**
 * Marketing Work Layout
 * Layout แยกสำหรับงานออกแบบ/การตลาด
 * มี sidebar และ header ของตัวเอง แยกจากระบบหลัก
 * เข้าถึงได้เฉพาะ role: admin, marketing
 */

import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { AppShell, Box, Stack, Text, NavLink as MantineNavLink, Group, Avatar, Menu, ActionIcon, Tooltip, Badge } from '@mantine/core'
import { Suspense, useState } from 'react'
import { TbPalette, TbLogout, TbUser, TbArrowLeft, TbHome, TbBrandInstagram, TbTargetArrow, TbSpeakerphone, TbPhoto, TbArticle } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import ChangePasswordModal from './ChangePasswordModal'
import NotificationsMenu from './NotificationsMenu'

// Marketing work menu items
const marketingMenuItems = [
    {
        path: '/marketing-work',
        label: 'ภาพรวมงานออกแบบ/การตลาด',
        icon: TbPalette,
    },
    {
        path: '/marketing-work/graphic-design',
        label: 'ออกแบบกราฟิก',
        icon: TbPhoto,
        comingSoon: true,
    },
    {
        path: '/marketing-work/marketing-plan',
        label: 'วางแผนการตลาด',
        icon: TbTargetArrow,
        comingSoon: true,
    },
    {
        path: '/marketing-work/content',
        label: 'จัดการ Content',
        icon: TbArticle,
        comingSoon: true,
    },
    {
        path: '/marketing-work/social-media',
        label: 'Social Media',
        icon: TbBrandInstagram,
        comingSoon: true,
    },
    {
        path: '/marketing-work/campaign',
        label: 'โปรโมชั่น / แคมเปญ',
        icon: TbSpeakerphone,
        comingSoon: true,
    },
]

export default function MarketingLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [changePasswordOpened, setChangePasswordOpened] = useState(false)

    const handleLogout = async () => {
        try {
            await authService.logout()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            logout()
            navigate('/login', { replace: true })
        }
    }

    return (
        <>
            <AppShell
                navbar={{ width: 260, breakpoint: 'sm' }}
                header={{ height: 70 }}
                padding="md"
            >
                {/* Header */}
                <AppShell.Header>
                    <Group justify="space-between" h="100%" px="md">
                        <Group gap="md">
                            <Text size="xl" fw={700} c="#e91e63">
                                ศูนย์รวมระบบภายใน — งานออกแบบ/การตลาด
                            </Text>
                        </Group>
                        <Group gap="md">
                            {/* Back to main system */}
                            <Tooltip label="กลับไปหน้าหลัก">
                                <ActionIcon
                                    variant="light"
                                    color="pink"
                                    size="lg"
                                    radius="xl"
                                    onClick={() => { window.close(); window.location.href = '/'; }}
                                >
                                    <TbHome size={20} />
                                </ActionIcon>
                            </Tooltip>

                            <NotificationsMenu />

                            {/* User menu */}
                            <Menu shadow="md" width={200}>
                                <Menu.Target>
                                    <Group style={{ cursor: 'pointer' }} gap="xs">
                                        <Avatar color="pink" radius="xl">
                                            {user?.name.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>{user?.name}</Text>
                                            <Text size="xs" c="dimmed">{user?.employee_id || user?.role}</Text>
                                        </div>
                                    </Group>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item leftSection={<TbUser size={16} />} onClick={() => setChangePasswordOpened(true)}>
                                        เปลี่ยนรหัสผ่าน
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item leftSection={<TbLogout size={16} />} color="red" onClick={handleLogout}>
                                        ออกจากระบบ
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Group>
                </AppShell.Header>

                {/* Sidebar */}
                <AppShell.Navbar p="md">
                    <Stack gap="xs">
                        {/* Sidebar Title */}
                        <Box
                            mb="md"
                            p="md"
                            style={{
                                background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
                                borderRadius: 12,
                            }}
                        >
                            <Text size="lg" fw={700} c="white">
                                งานออกแบบ/การตลาด
                            </Text>
                            <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                                ระบบจัดการงานออกแบบและการตลาด
                            </Text>
                        </Box>

                        {/* Menu Items */}
                        {marketingMenuItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <MantineNavLink
                                    key={item.path}
                                    component={NavLink}
                                    to={item.path}
                                    end
                                    label={item.label}
                                    leftSection={<Icon size={20} />}
                                    rightSection={
                                        item.comingSoon ? (
                                            <Badge size="xs" variant="light" color="gray" radius="sm">
                                                รอพัฒนา
                                            </Badge>
                                        ) : undefined
                                    }
                                    variant="subtle"
                                    classNames={{
                                        root: 'sidebar-nav-link',
                                    }}
                                    styles={(theme) => ({
                                        root: {
                                            borderRadius: theme.radius.lg,
                                        },
                                    })}
                                />
                            )
                        })}

                        {/* Back to main */}
                        <Box mt="auto" pt="md" style={{ borderTop: '1px solid #eee' }}>
                            <MantineNavLink
                                label="กลับไประบบหลัก"
                                leftSection={<TbArrowLeft size={20} />}
                                variant="subtle"
                                onClick={() => { window.close(); window.location.href = '/'; }}
                                styles={(theme) => ({
                                    root: {
                                        borderRadius: theme.radius.lg,
                                        color: theme.colors.gray[6],
                                    },
                                })}
                            />
                        </Box>
                    </Stack>
                </AppShell.Navbar>

                {/* Main Content */}
                <AppShell.Main>
                    <Suspense
                        fallback={
                            <Box style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LoadingSpinner message="กำลังโหลดหน้า..." />
                            </Box>
                        }
                    >
                        <Outlet key={`${location.pathname}-${location.key}`} />
                    </Suspense>
                </AppShell.Main>
            </AppShell>

            <ChangePasswordModal
                opened={changePasswordOpened}
                onClose={() => setChangePasswordOpened(false)}
            />
        </>
    )
}
