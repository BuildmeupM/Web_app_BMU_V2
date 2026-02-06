/**
 * Notifications Menu Component
 * Dropdown menu สำหรับแสดงการแจ้งเตือน
 * ✅ PERFORMANCE: Uses WebSocket for real-time updates + fallback polling
 */

import { useEffect } from 'react'
import { Menu, Badge, Text, ScrollArea, Group, Stack, Button, ActionIcon, Tooltip } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notifications as mantineNotifications } from '@mantine/notifications'
import notificationsService, { Notification } from '../../services/notificationsService'
import { TbBell, TbCheck, TbTrash, TbAlertCircle } from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import { useAuthStore } from '../../store/authStore'
import { getSocket } from '../../services/socketService'

dayjs.extend(buddhistEra)
dayjs.locale('th')

export default function NotificationsMenu() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // ✅ PERFORMANCE: WebSocket subscription for real-time notifications
  useEffect(() => {
    if (!user?.id) return

    const socket = getSocket()
    if (!socket) return

    // Subscribe to user's notification room
    socket.emit('subscribe:user', { userId: user.id })

    // Listen for new notifications
    const handleNewNotification = (data: { notification: Notification; unread_count_increment: number }) => {
      console.log('🔔 [WebSocket] New notification received:', data.notification.id)

      // Update cache optimistically
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: [data.notification, ...(oldData.data || [])],
          unread_count: (oldData.unread_count || 0) + data.unread_count_increment,
        }
      })

      // Show toast notification
      mantineNotifications.show({
        title: data.notification.title,
        message: data.notification.message,
        color: data.notification.color || 'blue',
        icon: <TbBell size={16} />,
        autoClose: 5000,
      })
    }

    socket.on('notification:new', handleNewNotification)

    // Cleanup on unmount
    return () => {
      socket.emit('unsubscribe:user', { userId: user.id })
      socket.off('notification:new', handleNewNotification)
    }
  }, [user?.id, queryClient])

  // Fetch notifications for all logged-in users
  // ✅ PERFORMANCE: Increased polling interval since WebSocket handles real-time updates
  const { data: notificationsData, refetch } = useQuery(
    ['notifications'],
    () => notificationsService.getList({ limit: 20 }),
    {
      enabled: !!user, // แสดงสำหรับทุก user ที่ล็อกอิน (backend จะ filter notifications ตาม user_id)
      refetchInterval: 300000, // ✅ OPTIMIZED: Refetch every 5 minutes (fallback, WebSocket is primary)
      staleTime: 120 * 1000, // ✅ OPTIMIZED: Data stays fresh for 2 minutes
      refetchOnMount: false, // ปิดการ refetch เมื่อ mount เพื่อลด requests
      refetchOnWindowFocus: false, // ปิดการ refetch เมื่อ focus window เพื่อลด requests
      refetchOnReconnect: true, // ✅ Enable: Refetch when reconnecting (WebSocket might have missed events)
      retry: (failureCount, error: any) => {
        // ไม่ retry สำหรับ 429 errors เพราะจะทำให้แย่ลง
        if (error?.response?.status === 429) {
          return false
        }
        // Retry 1 ครั้งสำหรับ errors อื่นๆ
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    }
  )

  const notifications = notificationsData?.data || []
  const unreadCount = notificationsData?.unread_count || 0

  // Mark as read mutation
  const markAsReadMutation = useMutation(notificationsService.markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      refetch()
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(notificationsService.markAllAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      refetch()
      mantineNotifications.show({
        title: 'สำเร็จ',
        message: 'ทำเครื่องหมายอ่านทั้งหมดแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation(notificationsService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      refetch()
      mantineNotifications.show({
        title: 'สำเร็จ',
        message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
    },
    onError: (error: any) => {
      console.error('Error deleting notification:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'ไม่สามารถลบการแจ้งเตือนได้'
      mantineNotifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: errorMessage,
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('DD MMM BBBB HH:mm')
  }

  const getNotificationIcon = (notification: Notification) => {
    // ใช้ icon จาก notification ถ้ามี
    if (notification.icon) {
      // ในอนาคตสามารถ map icon name เป็น component ได้
      // ตอนนี้ใช้ default icons ตาม type
    }

    // ใช้สีจาก notification ถ้ามี
    const color = notification.color || '#666'

    switch (notification.type) {
      case 'password_change':
        return <TbAlertCircle size={16} color={color} />
      case 'leave_request_created':
      case 'leave_request_approved':
      case 'leave_request_rejected':
        return <TbAlertCircle size={16} color={color} />
      case 'work_assignment_created':
      case 'work_assignment_updated':
        return <TbAlertCircle size={16} color={color} />
      default:
        return <TbBell size={16} color={color} />
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'red'
      case 'high':
        return 'orange'
      case 'medium':
        return 'blue'
      case 'low':
        return 'gray'
      default:
        return 'blue'
    }
  }

  // Always show notification menu icon for all users (even if no notifications)
  return (
    <Menu shadow="md" width={400} position="bottom-end">
      <Menu.Target>
        <Tooltip label={unreadCount > 0 ? `การแจ้งเตือน (${unreadCount} รายการ)` : 'การแจ้งเตือน'}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <ActionIcon
              variant={unreadCount > 0 ? "filled" : "subtle"}
              size="lg"
              color={unreadCount > 0 ? "orange" : "gray"}
            >
              <TbBell size={20} />
            </ActionIcon>
            {unreadCount > 0 && (
              <Badge
                size="xs"
                color="red"
                variant="filled"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Group justify="space-between">
            <Text fw={500}>การแจ้งเตือน</Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => markAllAsReadMutation.mutate()}
                loading={markAllAsReadMutation.isLoading}
              >
                ทำเครื่องหมายอ่านทั้งหมด
              </Button>
            )}
          </Group>
        </Menu.Label>

        <Menu.Divider />

        {notifications.length === 0 ? (
          <Menu.Item disabled>
            <Text c="dimmed" size="sm" ta="center" py="md">
              ไม่มีการแจ้งเตือนใหม่
            </Text>
          </Menu.Item>
        ) : (
          <ScrollArea.Autosize mah={400}>
            <Stack gap="xs" p="xs">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: notification.is_read ? 'transparent' : '#fff5e6',
                    border: notification.is_read
                      ? 'none'
                      : `1px solid ${notification.color || '#ff6b35'}`,
                  }}
                >
                  <Group justify="space-between" align="flex-start" gap="xs">
                    <Group gap="xs" style={{ flex: 1 }}>
                      {getNotificationIcon(notification)}
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Group gap="xs" align="center">
                          <Text size="sm" fw={notification.is_read ? 400 : 600}>
                            {notification.title}
                          </Text>
                          {notification.priority && notification.priority !== 'medium' && (
                            <Badge
                              size="xs"
                              color={getPriorityColor(notification.priority)}
                              variant="light"
                            >
                              {notification.priority === 'urgent'
                                ? 'ด่วน'
                                : notification.priority === 'high'
                                  ? 'สำคัญ'
                                  : 'ต่ำ'}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {notification.message}
                        </Text>

                        <Text size="xs" c="dimmed">
                          {formatDate(notification.created_at)}
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap="xs">
                      {!notification.is_read && (
                        <Tooltip label="ทำเครื่องหมายว่าอ่านแล้ว">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            loading={markAsReadMutation.isLoading}
                          >
                            <TbCheck size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip label="ลบ">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => deleteMutation.mutate(notification.id)}
                          loading={deleteMutation.isLoading}
                        >
                          <TbTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </div>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
