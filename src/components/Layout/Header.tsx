import { memo } from 'react'
import {
  Group,
  Text,
  Button,
  Menu,
  Avatar,
  ActionIcon,
  Popover,
  Stack,
  SimpleGrid,
  UnstyledButton,
  Box,
  Divider,
} from '@mantine/core'
import { TbLogout, TbUser, TbApps, TbCoin, TbClipboardData, TbPalette, TbMenu2 } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import NotificationsMenu from './NotificationsMenu'
import ChangePasswordModal from './ChangePasswordModal'
import { useState } from 'react'

// Internal system hub items
const internalSystemItems = [
  {
    icon: TbCoin,
    label: 'ค่าทำบัญชี / ค่าบริการ HR',
    path: '/accounting-fees',
    color: '#ff6b35',
    bgColor: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
    openInNewTab: true,
    allowedRoles: ['admin', 'registration'] as string[],
  },
  {
    icon: TbClipboardData,
    label: 'งานทะเบียน',
    path: '/registration-work',
    color: '#1565c0',
    bgColor: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
    openInNewTab: true,
    allowedRoles: ['admin', 'registration'] as string[],
  },
  {
    icon: TbPalette,
    label: 'งานออกแบบ/การตลาด',
    path: '/marketing-work',
    color: '#e91e63',
    bgColor: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
    openInNewTab: true,
    allowedRoles: ['admin', 'marketing'] as string[],
  },
]

const Header = memo(function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [changePasswordOpened, setChangePasswordOpened] = useState(false)
  const [hubOpened, setHubOpened] = useState(false)

  const handleLogout = async () => {
    try {
      // เรียก logout API
      await authService.logout()
    } catch (error) {
      // Ignore errors (อาจจะ token หมดอายุแล้ว)
      console.error('Logout error:', error)
    } finally {
      // ลบข้อมูลจาก store และ redirect
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <Group justify="space-between" h="100%" px="md">
        <Text size="xl" fw={700} c="orange">
          BMU Work Management System
        </Text>
        <Group gap="md">
          <NotificationsMenu />

          {/* Internal System Hub */}
          <Popover
            width={280}
            position="bottom-end"
            shadow="lg"
            radius="lg"
            opened={hubOpened}
            onChange={setHubOpened}
          >
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                size="lg"
                radius="xl"
                onClick={() => setHubOpened((o) => !o)}
                style={{
                  transition: 'all 0.2s ease',
                }}
                styles={{
                  root: {
                    '&:hover': {
                      backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    },
                  },
                }}
              >
                <TbApps size={22} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown
              p="md"
              style={{
                border: '1px solid #eee',
                borderRadius: 16,
              }}
            >
              <Text fw={700} size="sm" ta="center" mb="md" c="dimmed">
                ศูนย์รวมระบบภายใน
              </Text>
              <Divider mb="md" />

              <SimpleGrid cols={3} spacing="xs">
                {internalSystemItems
                  .filter((item) => !item.allowedRoles || item.allowedRoles.includes(user?.role || ''))
                  .map((item) => (
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
                      <Text
                        size="xs"
                        fw={500}
                        ta="center"
                        c="#555"
                        style={{ lineHeight: 1.3 }}
                      >
                        {item.label}
                      </Text>
                    </UnstyledButton>
                  ))}
              </SimpleGrid>
            </Popover.Dropdown>
          </Popover>

          {/* User menu */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Group style={{ cursor: 'pointer' }} gap="xs">
                <Avatar color="orange" radius="xl">
                  {user?.name.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Text size="sm" fw={500}>
                    {user?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user?.employee_id || user?.role}
                  </Text>
                </div>
              </Group>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<TbUser size={16} />} onClick={() => setChangePasswordOpened(true)}>
                เปลี่ยนรหัสผ่าน
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<TbLogout size={16} />}
                color="red"
                onClick={handleLogout}
              >
                ออกจากระบบ
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <ChangePasswordModal
        opened={changePasswordOpened}
        onClose={() => setChangePasswordOpened(false)}
      />
    </>
  )
})

export default Header
