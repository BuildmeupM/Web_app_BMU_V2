import { useEffect, useState } from 'react'
import { 
  Drawer, Badge, Text, ScrollArea, Group, Stack, Button, ActionIcon, Tooltip, 
  Avatar, Box, Affix
} from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notifications as mantineNotifications } from '@mantine/notifications'
import notificationsService, { Notification } from '../../services/notificationsService'
import { TbBell, TbCheck, TbTrash, TbMessageCircle, TbRobot } from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import { useAuthStore } from '../../store/authStore'
import { getSocket, createSocketConnection } from '../../services/socketService'
import { useNavigate } from 'react-router-dom'

dayjs.extend(buddhistEra)
dayjs.locale('th')

export default function NotificationsMenu() {
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Base UI States
  const [opened, setOpened] = useState(false)

  // ==========================================
  // 1. WEB SOCKET CONNECTIONS
  // ==========================================
  useEffect(() => {
    if (!user?.id) return
    let socket = getSocket()
    if (!socket) {
       socket = createSocketConnection(token)
    }
    if (!socket) return

    socket.emit('subscribe:user', { userId: user.id })

    const handleNewNotification = (data: { notification: Notification; unread_count_increment: number }) => {
      queryClient.setQueryData(['notifications'], (oldData: { data: Notification[], unread_count: number } | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: [data.notification, ...(oldData.data || [])],
          unread_count: (oldData.unread_count || 0) + data.unread_count_increment,
        }
      })

      mantineNotifications.show({
        title: data.notification.title,
        message: data.notification.message,
        color: data.notification.color || 'blue',
        icon: <TbBell size={16} />,
        autoClose: 5000,
      })
    }

    socket.on('notification:new', handleNewNotification)

    return () => {
      socket.off('notification:new', handleNewNotification)
    }
  }, [user?.id, queryClient, token])


  // ==========================================
  // 2. DATA QUERIES (React Query)
  // ==========================================

  // --- BOT NOTIFICATIONS ---
  const { data: notificationsData, refetch: refetchNotifs } = useQuery(
    ['notifications'],
    () => notificationsService.getList({ limit: 20 }),
    { enabled: !!user, refetchInterval: 300000, staleTime: 120000 }
  )
  const notifications = notificationsData?.data || []
  const botUnreadCount = notificationsData?.unread_count || 0

  const markAsReadMutation = useMutation(notificationsService.markAsRead, {
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); refetchNotifs() }
  })
  const markAllAsReadMutation = useMutation(notificationsService.markAllAsRead, {
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); refetchNotifs() }
  })
  const deleteMutation = useMutation(notificationsService.delete, {
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); refetchNotifs() }
  })


  // ==========================================
  // 3. UI HELPER FUNCTIONS
  // ==========================================
  const formatDate = (dateStr: string) => dayjs(dateStr).format('DD MMM BBBB HH:mm')

  // ==========================================
  // RENDER SECTIONS
  // ==========================================
  
  // 1. Floating Button Bubble
  const FloatButton = () => (
    <Affix position={{ bottom: 30, right: 30 }} zIndex={1000}>
      <Tooltip label={botUnreadCount > 0 ? `แจ้งเตือนใหม่ (${botUnreadCount})` : 'ระบบแจ้งเตือน'}>
        <div style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }} onClick={() => setOpened(true)}>
          <Button
            variant={botUnreadCount > 0 ? "filled" : "light"}
            color={botUnreadCount > 0 ? "orange" : "blue"}
            leftSection={<TbBell size={20} />}
            radius="xl"
            size="md"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            แจ้งเตือน
          </Button>
          {botUnreadCount > 0 && (
            <Badge
              size="sm" color="red" variant="filled"
              style={{
                position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22,
                padding: '0 6px', fontSize: '11px', fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {botUnreadCount > 99 ? '99+' : botUnreadCount}
            </Badge>
          )}
        </div>
      </Tooltip>
    </Affix>
  )


  // ==========================================
  // MASTER WRAPPER
  // ==========================================
  return (
    <>
      {FloatButton()}

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        zIndex={2000}
        size="md"
        withCloseButton={false}
        padding={0}
      >
        <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          
          {/* Static App Header Drawer */}
          <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
            <Group justify="space-between">
              <Group gap="xs">
                <TbMessageCircle size={24} color="#ff6b35" />
                <Text fw={700} size="xl">ระบบแจ้งเตือน</Text>
              </Group>
              <ActionIcon onClick={() => setOpened(false)} variant="subtle" color="gray">
                X
              </ActionIcon>
            </Group>
          </Box>

          {/* Notifications Content */}
          <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <Box p="md" style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff', flexShrink: 0 }}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">ทั้งหมด {notifications.length} รายการ</Text>
                {botUnreadCount > 0 && (
                  <Button size="xs" variant="subtle" color="blue" onClick={() => markAllAsReadMutation.mutate()} loading={markAllAsReadMutation.isLoading}>
                    อ่านทั้งหมด
                  </Button>
                )}
              </Group>
            </Box>

            <ScrollArea style={{ flex: 1 }} p="md">
              {notifications.length === 0 ? (
                <Stack align="center" justify="center" h={200}>
                  <TbMessageCircle size={40} color="#ccc" />
                  <Text c="dimmed" size="sm">ยังไม่มีข้อความระบบใหม่ครับ 😊</Text>
                </Stack>
              ) : (
                <Stack gap="lg">
                  {notifications.map((notif) => (
                    <div key={notif.id} style={{ display: 'flex', gap: '12px' }}>
                      <Avatar size="md" radius="xl" color={notif.is_read ? 'gray' : (notif.color || 'blue')} variant="light">
                        <TbRobot size={20} />
                      </Avatar>
                      <div style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" mb={4} ml={4}>BMU Bot • {formatDate(notif.created_at)}</Text>
                        <Box
                          style={{
                            backgroundColor: notif.is_read ? '#ffffff' : '#e7f5ff',
                            border: `1px solid ${notif.is_read ? '#eaeaea' : '#74c0fc'}`,
                            borderRadius: '0 16px 16px 16px',
                            padding: '12px 16px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <Group justify="space-between" align="flex-start" mb={4}>
                            <Group gap="xs" align="center">
                              <Text size="sm" fw={600} c={notif.is_read ? 'dark' : 'blue.9'}>{notif.title}</Text>
                            </Group>
                            <Group gap={4}>
                              {!notif.is_read && (
                                <Tooltip label="ทำเครื่องหมายว่าอ่านแล้ว">
                                  <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => markAsReadMutation.mutate(notif.id)}>
                                    <TbCheck size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="ลบ">
                                <ActionIcon size="sm" variant="subtle" color="red" onClick={() => deleteMutation.mutate(notif.id)}>
                                  <TbTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Group>
                          <Text size="sm" c={notif.is_read ? 'dimmed' : 'dark'} lh={1.5}>{notif.message}</Text>
                          {notif.action_url && (
                            <Button fullWidth size="sm" variant={notif.is_read ? "light" : "filled"} color={notif.color || 'blue'} mt="md" onClick={() => {
                              if (!notif.is_read) markAsReadMutation.mutate(notif.id)
                              setOpened(false)
                              navigate(notif.action_url)
                            }}>
                              {notif.action_label || 'ดำเนินการคลิกที่นี่'}
                            </Button>
                          )}
                        </Box>
                      </div>
                    </div>
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Box>

        </Box>
      </Drawer>
    </>
  )
}
