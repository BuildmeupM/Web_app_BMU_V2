import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Stack,
  NavLink as MantineNavLink,
  Text,
  Collapse,
  UnstyledButton,
  Group,
  Box,
  Tooltip,
  ActionIcon,
  Divider,
} from '@mantine/core'
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
  TbChevronDown,
  TbChevronUp,
  TbUser,
  TbBriefcase,
  TbSettings,
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
} from 'react-icons/tb'
import { useAuthStore, UserRole } from '../../store/authStore'
import { hasPermission } from '../../utils/rolePermissions'

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

interface MenuItem {
  path: string
  label: string
}

interface MenuGroup {
  title: string
  icon: React.ComponentType<any>
  items: MenuItem[]
}

// กลุ่มเมนูตามหัวข้อ
const menuGroups: MenuGroup[] = [
  {
    title: 'ข้อมูลส่วนตัวของพนักงาน',
    icon: TbUser,
    items: [
      { path: '/employees', label: 'ข้อมูลพนักงาน' },
      { path: '/leave', label: 'ลางาน/WFH' },
      { path: '/holidays', label: 'จัดการวันหยุด' },
      { path: '/salary-advance', label: 'ขอเบิกเงินเดือน' },
      { path: '/attendance', label: 'ข้อมูลเข้าออฟฟิศ' },
    ],
  },
  {
    title: 'งานบัญชี',
    icon: TbBriefcase,
    items: [
      { path: '/clients', label: 'ข้อมูลลูกค้า' },
      { path: '/work-assignment', label: 'จัดงานรายเดือน' },
      { path: '/document-sorting', label: 'คัดแยกเอกสาร' },
      { path: '/document-entry', label: 'คีย์เอกสาร' },
      { path: '/tax-inspection', label: 'ตรวจภาษี' },
      { path: '/tax-status', label: 'สถานะยื่นภาษี' },
      { path: '/tax-filing', label: 'ยื่นภาษี' },
      { path: '/accounting-marketplace', label: 'ตลาดกลางผู้ทำบัญชี' },
    ],
  },
  {
    title: 'จัดการข้อมูลระบบ',
    icon: TbSettings,
    items: [
      { path: '/users', label: 'จัดการ User Accounts' },
    ],
  },
]

// ============================
// Expanded Group (แสดงเต็ม)
// ============================
function SidebarGroupExpanded({
  group,
  userRole,
  defaultOpen = true,
}: {
  group: MenuGroup
  userRole: UserRole
  defaultOpen?: boolean
}) {
  const [opened, setOpened] = useState(defaultOpen)
  const location = useLocation()

  const accessibleItems = group.items.filter((item) =>
    hasPermission(userRole, item.path)
  )
  if (accessibleItems.length === 0) return null

  const ChevronIcon = opened ? TbChevronUp : TbChevronDown

  return (
    <Box>
      {/* Pill Header */}
      <UnstyledButton
        onClick={() => setOpened((o) => !o)}
        w="100%"
        py={8}
        px="md"
        style={{
          borderRadius: 20,
          background: opened
            ? 'linear-gradient(135deg, #ff9a56 0%, #ffad70 100%)'
            : 'linear-gradient(135deg, #ffcc9e 0%, #ffddb8 100%)',
          transition: 'all 0.25s ease',
          boxShadow: opened ? '0 2px 8px rgba(255, 154, 86, 0.3)' : 'none',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!opened) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #ffb87a 0%, #ffc894 100%)'
          }
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!opened) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #ffcc9e 0%, #ffddb8 100%)'
          }
        }}
      >
        <Group gap={8} justify="space-between">
          <Text size="sm" fw={700} c={opened ? 'white' : '#c65d00'}>
            {group.title}
          </Text>
          <ChevronIcon size={16} color={opened ? 'white' : '#c65d00'} />
        </Group>
      </UnstyledButton>

      {/* Menu items */}
      <Collapse in={opened} transitionDuration={250}>
        <Stack gap={2} mt={6} mb={4} pl={4}>
          {accessibleItems.map((item) => {
            const Icon = iconMap[item.path] || TbFileText
            const isActive = location.pathname === item.path

            return (
              <MantineNavLink
                key={item.path}
                component={NavLink}
                to={item.path}
                end
                label={item.label}
                leftSection={<Icon size={20} />}
                variant="subtle"
                active={isActive}
                styles={() => ({
                  root: {
                    borderRadius: 12,
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? 'rgba(255, 154, 86, 0.12)' : 'transparent',
                    color: isActive ? '#e65100' : undefined,
                    '&:hover': {
                      backgroundColor: isActive
                        ? 'rgba(255, 154, 86, 0.18)'
                        : 'rgba(255, 154, 86, 0.06)',
                    },
                  },
                  label: {
                    color: isActive ? '#e65100' : undefined,
                  },
                })}
              />
            )
          })}
        </Stack>
      </Collapse>
    </Box>
  )
}

// ============================
// Collapsed Group (แสดงเฉพาะไอคอน)
// ============================
function SidebarGroupCollapsed({
  group,
  userRole,
}: {
  group: MenuGroup
  userRole: UserRole
}) {
  const location = useLocation()

  const accessibleItems = group.items.filter((item) =>
    hasPermission(userRole, item.path)
  )
  if (accessibleItems.length === 0) return null

  const GroupIcon = group.icon

  return (
    <Box>
      {/* Group icon header */}
      <Tooltip label={group.title} position="right" withArrow>
        <Box
          py={6}
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <GroupIcon size={18} color="#ff9a56" />
        </Box>
      </Tooltip>

      {/* Item icons */}
      <Stack gap={2} align="center">
        {accessibleItems.map((item) => {
          const Icon = iconMap[item.path] || TbFileText
          const isActive = location.pathname === item.path

          return (
            <Tooltip key={item.path} label={item.label} position="right" withArrow>
              <ActionIcon
                component={NavLink}
                to={item.path}
                variant="subtle"
                size="lg"
                radius="lg"
                style={{
                  backgroundColor: isActive ? 'rgba(255, 154, 86, 0.15)' : 'transparent',
                  color: isActive ? '#e65100' : '#666',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 154, 86, 0.08)'
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon size={20} />
              </ActionIcon>
            </Tooltip>
          )
        })}
      </Stack>
    </Box>
  )
}

// ============================
// Main Sidebar
// ============================
interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  if (!user) return null

  const isDashboardActive = location.pathname === '/dashboard'

  // ================================
  // Collapsed Mode (ไอคอนอย่างเดียว)
  // ================================
  if (!expanded) {
    return (
      <Stack
        gap="xs"
        align="center"
        style={{ height: '100%' }}
        justify="space-between"
      >
        <Stack gap="xs" align="center" w="100%">
          {/* Logo */}
          <Text size="lg" fw={800} c="orange" ta="center" mb={4}>
            B
          </Text>

          {/* Dashboard icon */}
          {hasPermission(user.role, '/dashboard') && (
            <Tooltip label="แดชบอร์ด" position="right" withArrow>
              <ActionIcon
                component={NavLink}
                to="/dashboard"
                variant="filled"
                size="lg"
                radius="xl"
                style={{
                  backgroundColor: isDashboardActive ? '#ff8c42' : 'rgba(255, 140, 66, 0.1)',
                  color: isDashboardActive ? 'white' : '#e65100',
                }}
              >
                <TbDashboard size={20} />
              </ActionIcon>
            </Tooltip>
          )}

          <Divider w="100%" my={4} color="gray.2" />

          {/* Groups — icon only */}
          {menuGroups.map((group, index) => (
            <Box key={group.title} w="100%">
              <SidebarGroupCollapsed group={group} userRole={user.role} />
              {index < menuGroups.length - 1 && (
                <Divider w="100%" my={4} color="gray.2" />
              )}
            </Box>
          ))}
        </Stack>

        {/* Toggle button (ด้านล่าง) */}
        <Tooltip label="ขยายเมนู" position="right" withArrow>
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="xl"
            onClick={onToggle}
            style={{
              color: '#ff8c42',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 140, 66, 0.1)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <TbLayoutSidebarLeftExpand size={22} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    )
  }

  // ================================
  // Expanded Mode (แสดงเต็ม)
  // ================================
  return (
    <Stack gap="sm" style={{ height: '100%' }} justify="space-between">
      <Stack gap="sm">
        <Text size="xl" fw={700} c="orange" mb="xs">
          BMU System
        </Text>

        {/* Dashboard — pill button */}
        {hasPermission(user.role, '/dashboard') && (
          <MantineNavLink
            component={NavLink}
            to="/dashboard"
            end
            label="แดชบอร์ด"
            leftSection={<TbDashboard size={20} />}
            active={isDashboardActive}
            variant="filled"
            styles={() => ({
              root: {
                borderRadius: 20,
                backgroundColor: isDashboardActive
                  ? '#ff8c42'
                  : 'rgba(255, 140, 66, 0.1)',
                color: isDashboardActive ? 'white' : '#e65100',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: isDashboardActive
                    ? '#ff7b2e'
                    : 'rgba(255, 140, 66, 0.18)',
                },
              },
              label: {
                color: isDashboardActive ? 'white' : '#e65100',
              },
            })}
          />
        )}

        {/* Groups — Pill Header style */}
        {menuGroups.map((group, index) => (
          <SidebarGroupExpanded
            key={group.title}
            group={group}
            userRole={user.role}
            defaultOpen={index === 0}
          />
        ))}
      </Stack>

      {/* Toggle button (ด้านล่าง) */}
      <UnstyledButton
        onClick={onToggle}
        py={8}
        px="md"
        style={{
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#999',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 140, 66, 0.06)'
          e.currentTarget.style.color = '#ff8c42'
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#999'
        }}
      >
        <TbLayoutSidebarLeftCollapse size={20} />
        <Text size="sm" c="inherit">ย่อเมนู</Text>
      </UnstyledButton>
    </Stack>
  )
}
