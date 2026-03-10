import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Group,
  Text,
  Avatar,
  Menu,
  ActionIcon,
  Tooltip,
  Popover,
  SimpleGrid,
  UnstyledButton,
  Box,
  Divider,
} from '@mantine/core'
import { Suspense, useState } from 'react'
import { TbLogout, TbUser, TbApps, TbDeviceLaptop, TbMessageCircle, TbX } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import LoadingSpinner from '../Loading/LoadingSpinner'
import ChangePasswordModal from './ChangePasswordModal'
import NotificationsMenu from './NotificationsMenu'

// Items shown in the internal hub popover
const hubItems = [
  {
    icon: TbDeviceLaptop,
    label: 'ยืมอุปกรณ์',
    path: '/equipment',
    color: '#00897b',
    bgColor: 'linear-gradient(135deg, #00897b 0%, #26a69a 100%)',
    openInNewTab: true,
  },
  {
    icon: TbMessageCircle,
    label: 'แชทลูกค้า',
    path: '/internal-chats',
    color: '#ff9800',
    bgColor: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
    openInNewTab: false,
  },
]

export default function InternalChatLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [changePasswordOpened, setChangePasswordOpened] = useState(false)
  const [hubOpened, setHubOpened] = useState(false)

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
      <AppShell header={{ height: 70 }} padding="md">
        {/* Header */}
        <AppShell.Header>
          <Group justify="space-between" h="100%" px="md">
            <Group gap="md">
              <Text size="xl" fw={700} c="#ff9800">
                ศูนย์รวมระบบภายใน — แชทลูกค้า (Internal Chat)
              </Text>
            </Group>
            <Group gap="md">
              {/* Close tab button */}
              <Tooltip label="ปิดแถบนี้ / กลับหน้าหลัก" position="bottom-end">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  radius="xl"
                  onClick={() => window.close()}
                  style={{ transition: 'all 0.2s ease' }}
                >
                  <TbX size={18} />
                </ActionIcon>
              </Tooltip>

              {/* Internal System Hub Popover */}
              <Popover
                width={240}
                position="bottom-end"
                shadow="lg"
                radius="lg"
                opened={hubOpened}
                onChange={setHubOpened}
              >
                <Popover.Target>
                  <Tooltip label="ศูนย์รวมระบบภายใน">
                    <ActionIcon
                      variant="light"
                      color="orange"
                      size="lg"
                      radius="xl"
                      onClick={() => setHubOpened((o) => !o)}
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <TbApps size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown
                  p="md"
                  style={{ border: '1px solid #eee', borderRadius: 16 }}
                >
                  <Text fw={700} size="sm" ta="center" mb="md" c="dimmed">
                    ศูนย์รวมระบบภายใน
                  </Text>
                  <Divider mb="md" />
                  <SimpleGrid cols={hubItems.length} spacing="xs">
                    {hubItems.map((item) => (
                      <UnstyledButton
                        key={item.path}
                        onClick={() => {
                          if (item.openInNewTab) {
                            window.open(item.path, '_blank')
                          } else {
                            navigate(item.path)
                          }
                          setHubOpened(false)
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 4px',
                          borderRadius: 12,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <Box
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: item.bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 12px ${item.color}40`,
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          <item.icon size={24} color="white" />
                        </Box>
                        <Text size="xs" fw={500} ta="center" c="#555" style={{ lineHeight: 1.3 }}>
                          {item.label}
                        </Text>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </Popover.Dropdown>
              </Popover>

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

        {/* Main Content */}
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
