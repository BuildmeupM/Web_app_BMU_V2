import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Group, Text, Avatar, Menu, ActionIcon, Tooltip } from '@mantine/core'
import { Suspense, useState } from 'react'
import { TbLogout, TbUser, TbHome } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import ChangePasswordModal from './ChangePasswordModal'
import NotificationsMenu from './NotificationsMenu'

export default function InternalChatLayout() {
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
                header={{ height: 70 }}
                padding="md"
            >
                {/* Header */}
                <AppShell.Header>
                    <Group justify="space-between" h="100%" px="md">
                        <Group gap="md">
                            <Text size="xl" fw={700} c="#ff9800">
                                ศูนย์รวมระบบภายใน — แชทลูกค้า (Internal Chat)
                            </Text>
                        </Group>
                        <Group gap="md">
                            {/* Back to main system */}
                            <Tooltip label="กลับไปหน้าหลัก">
                                <ActionIcon
                                    variant="light"
                                    color="orange"
                                    size="lg"
                                    radius="xl"
                                    onClick={() => navigate('/')}
                                >
                                    <TbHome size={20} />
                                </ActionIcon>
                            </Tooltip>

                            <NotificationsMenu />

                            {/* User menu */}
                            <Menu shadow="md" width={200}>
                                <Menu.Target>
                                    <Group style={{ cursor: 'pointer' }} gap="xs">
                                        <Avatar color="orange" radius="xl">
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

                {/* Main Content (No Sidebar) */}
                <AppShell.Main>
                    <Suspense
                        fallback={
                            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LoadingSpinner message="กำลังโหลดหน้า..." />
                            </div>
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
