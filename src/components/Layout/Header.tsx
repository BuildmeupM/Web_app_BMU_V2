import { memo } from 'react'
import { Group, Text, Button, Menu, Avatar } from '@mantine/core'
import { TbLogout, TbUser } from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import NotificationsMenu from './NotificationsMenu'
import ChangePasswordModal from './ChangePasswordModal'
import { useState } from 'react'

const Header = memo(function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [changePasswordOpened, setChangePasswordOpened] = useState(false)

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
