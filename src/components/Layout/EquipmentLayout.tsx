/**
 * Equipment Borrowing Layout
 * Layout แยกสำหรับระบบยืมอุปกรณ์คอมพิวเตอร์
 * มี sidebar และ header ของตัวเอง แยกจากระบบหลัก
 */

import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { AppShell, Box, Stack, Text, NavLink as MantineNavLink, Group, Avatar, Menu, ActionIcon, Tooltip, Badge } from '@mantine/core'
import { Suspense, useState } from 'react'
import { TbDeviceLaptop, TbLogout, TbUser, TbArrowLeft, TbHome, TbPackage, TbPackageOff, TbHistory, TbChartBar } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import ChangePasswordModal from './ChangePasswordModal'
import NotificationsMenu from './NotificationsMenu'

// Equipment system menu items
const equipmentMenuItems = [
    {
        path: '/equipment',
        label: 'ภาพรวมยืม-คืนอุปกรณ์',
        icon: TbChartBar,
    },
    {
        path: '/equipment/inventory',
        label: 'คลังอุปกรณ์',
        icon: TbPackage,
        comingSoon: true,
    },
    {
        path: '/equipment/history',
        label: 'ประวัติการยืม-คืน',
        icon: TbHistory,
        comingSoon: true,
    },
]

export default function EquipmentLayout() {
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
                            <Text size="xl" fw={700} c="teal">
                                ศูนย์รวมระบบภายใน — ยืมอุปกรณ์
                            </Text>
                        </Group>
                        <Group gap="md">
                            {/* Back to main system */}
                            <Tooltip label="กลับไปหน้าหลัก">
                                <ActionIcon
                                    variant="light"
                                    color="teal"
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
                                        <Avatar color="teal" radius="xl">
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
                                background: 'linear-gradient(135deg, #00897b 0%, #26a69a 100%)',
                                borderRadius: 12,
                            }}
                        >
                            <Group gap="xs">
                                <TbDeviceLaptop size={24} color="white" />
                                <div>
                                    <Text size="lg" fw={700} c="white">
                                        ยืมอุปกรณ์
                                    </Text>
                                    <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                                        ระบบยืม-คืนอุปกรณ์คอมพิวเตอร์
                                    </Text>
                                </div>
                            </Group>
                        </Box>

                        {/* Menu Items */}
                        {equipmentMenuItems.map((item) => {
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
