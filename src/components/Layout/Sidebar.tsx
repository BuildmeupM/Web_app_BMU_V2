import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { Stack, NavLink as MantineNavLink, Group, Text } from '@mantine/core'
import {
  TbDashboard,
  TbUsers,
  TbCalendarEvent,
  TbCash,
  TbClock,
  TbFileText,
  TbFileTypePdf,
  TbSearch,
  TbFileCheck,
  TbFileInvoice,
  TbClipboardList,
  TbBuilding,
  TbUserCircle,
  TbShoppingCart,
  TbCalendarTime,
} from 'react-icons/tb'
import { useAuthStore } from '../../store/authStore'
import { getAccessibleRoutes } from '../../utils/rolePermissions'

const iconMap: Record<string, React.ComponentType<any>> = {
  '/dashboard': TbDashboard,
  '/employees': TbUsers,
  '/leave': TbCalendarEvent,
  '/salary-advance': TbCash,
  '/attendance': TbClock,
  '/document-sorting': TbFileText,
  '/document-entry': TbFileTypePdf,
  '/tax-inspection': TbSearch,
  '/tax-status': TbFileCheck,
  '/tax-filing': TbFileInvoice,
  '/work-assignment': TbClipboardList,
  '/clients': TbBuilding,
  '/users': TbUserCircle,
  '/accounting-marketplace': TbShoppingCart,
  '/holidays': TbCalendarTime,
}

export default function Sidebar() {
  const { user } = useAuthStore()
  const accessibleRoutes = user ? getAccessibleRoutes(user.role) : []

  return (
    <Stack gap="xs">
      <Text size="xl" fw={700} c="orange" mb="md">
        BMU System
      </Text>
      {accessibleRoutes.map((route) => {
        const Icon = iconMap[route.path] || TbFileText
        return (
          <MantineNavLink
            key={route.path}
            component={NavLink}
            to={route.path}
            end
            label={route.label}
            leftSection={<Icon size={20} />}
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
    </Stack>
  )
}
