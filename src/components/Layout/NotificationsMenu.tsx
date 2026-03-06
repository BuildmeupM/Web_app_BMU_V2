import { useEffect, useState, useRef } from 'react'
import { 
  Drawer, Badge, Text, ScrollArea, Group, Stack, Button, ActionIcon, Tooltip, 
  Avatar, TextInput, Box, Affix, Tabs, Loader, Divider 
} from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notifications as mantineNotifications } from '@mantine/notifications'
import notificationsService, { Notification } from '../../services/notificationsService'
import chatService, { Conversation, ChatMessage } from '../../services/chatService'
import { TbBell, TbCheck, TbTrash, TbMessageCircle, TbSend, TbRobot, TbChevronLeft, TbUserPlus } from 'react-icons/tb'
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
  const [activeTab, setActiveTab] = useState<string | null>('bot')
  
  // Chat Feature States
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const viewport = useRef<HTMLDivElement>(null)

  // Keep a ref of activeChat so websocket closures always see the latest value without triggering re-renders
  const activeChatRef = useRef(activeChat)
  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

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
      // 1. Update BOT notifications queue
      queryClient.setQueryData(['notifications'], (oldData: { data: Notification[], unread_count: number } | undefined) => {
        if (!oldData) return oldData
        // Only increment badge for actual bot notes
        let newCount = (oldData.unread_count || 0)
        if ((data.notification.type as string) !== 'chat_message') {
           newCount += data.unread_count_increment
        }
        return {
          ...oldData,
          data: [data.notification, ...(oldData.data || [])],
          unread_count: newCount,
        }
      })

      // 2. Play Toast if we want (Maybe skip toast if user is inside chat)
      if ((data.notification.type as string) !== 'chat_message') {
        mantineNotifications.show({
          title: data.notification.title,
          message: data.notification.message,
          color: data.notification.color || 'blue',
          icon: <TbBell size={16} />,
          autoClose: 5000,
        })
      }
    }

    const handleNewChatMessage = (msg: ChatMessage) => {
      const currentActiveChat = activeChatRef.current
      // If we are receiving this via socket, the sender_id IS the other user.
      const belongsToActiveChat = currentActiveChat && currentActiveChat.id === msg.sender_id

      // Update Active Chat Window if we are inside it
      setChatMessages((prev) => {
        // Prevent duplicate append
        if (prev.find(p => p.id === msg.id)) return prev
        
        // If this is our own message echoing back, try to replace the optimistic fake message
        if (msg.sender_id === user?.id) {
          // Find if there's an optimistic message with same text
          const optimisticIndex = prev.findIndex(p => p.id.startsWith('temp-') && p.message_text === msg.message_text)
          if (optimisticIndex !== -1) {
            const newMsgs = [...prev]
            newMsgs[optimisticIndex] = msg // Replace with real DB message
            return newMsgs
          }
        }

        // Only append if it belongs to current active conversation
        if ((currentActiveChat && currentActiveChat.id === msg.conversation_id) || belongsToActiveChat) {
          return [...prev, msg]
        }
        return prev
      })

      // Also strictly inject the message into React Query cache to prevent stale data upon re-entering chat
      queryClient.setQueryData(['chat-messages', msg.conversation_id], (oldData: { data: ChatMessage[], success?: boolean } | undefined) => {
        if (!oldData) return { data: [msg], success: true }
        if (oldData.data.find((p: ChatMessage) => p.id === msg.id)) return oldData
        
        // Try to replace optimistic message in cache too
        if (msg.sender_id === user?.id) {
          const optimisticIndex = oldData.data.findIndex(p => p.id.startsWith('temp-') && p.message_text === msg.message_text)
          if (optimisticIndex !== -1) {
            const newMsgs = [...oldData.data]
            newMsgs[optimisticIndex] = msg
            return { ...oldData, data: newMsgs }
          }
        }
        
        return {
          ...oldData,
          data: [...oldData.data, msg]
        }
      })

      // Invalidate the conversations list so unread badges update
      queryClient.invalidateQueries(['chat-conversations'])
      
      // Auto-scroll chat window
      if (belongsToActiveChat) {
         setTimeout(() => scrollToBottom(), 100)
      }
    }

    socket.on('notification:new', handleNewNotification)
    socket.on('chat:receiveMessage', handleNewChatMessage)

    return () => {
      // Only remove event listeners on cleanup - DO NOT unsubscribe:user
      // because that removes us from the Socket.IO room, which breaks chat delivery.
      // The room subscription should persist for the entire session until logout/disconnect.
      socket.off('notification:new', handleNewNotification)
      socket.off('chat:receiveMessage', handleNewChatMessage)
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

  // --- CHAT: LIST OF CONVERSATIONS ---
  const { data: conversationsData, isLoading: isLoadingChats } = useQuery(
    ['chat-conversations'],
    () => chatService.getConversations(),
    { enabled: !!user && activeTab === 'chat', staleTime: 30000 }
  )
  const conversations = conversationsData?.data || []
  const totalChatUnread = conversations.reduce((acc, curr) => acc + curr.unread_count, 0)

  // --- CHAT: LIST OF ALL EMPLOYEES (Directory) ---
  const { data: directoryData } = useQuery(
    ['chat-directory'],
    () => chatService.getDirectory(),
    { enabled: !!user && activeTab === 'chat', staleTime: 60000 }
  )
  const directory = directoryData?.data || []

  // Clear messages from UI when switching or closing active chats to prevent state bleed
  useEffect(() => {
    setChatMessages([])
  }, [activeChat?.id])

  // --- CHAT: ACTIVE MESSAGES ---
  useQuery(
    ['chat-messages', activeChat?.id],
    () => chatService.getMessages(activeChat!.id),
    {
      enabled: !!activeChat,
      onSuccess: (res) => {
        setChatMessages(res.data)
        setTimeout(() => scrollToBottom(), 100)
        // Mark conversation as read
        queryClient.invalidateQueries(['chat-conversations'])
      }
    }
  )


  // ==========================================
  // 3. UI HELPER FUNCTIONS
  // ==========================================
  const formatDate = (dateStr: string) => dayjs(dateStr).format('DD MMM BBBB HH:mm')
  
  const scrollToBottom = () => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' })
    }
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeChat || !user) return
    let socket = getSocket()
    if (!socket) {
       socket = createSocketConnection(token)
    }
    if (!socket) return

    const newMessageContent = chatInput.trim()

    // Immediately push to Sockets (Backend handles DB saving)
    socket.emit('chat:sendMessage', {
      conversationId: activeChat.id,
      senderId: user.id,
      receiverId: activeChat.other_user_id,
      text: newMessageContent
    })
    
    setChatInput('')

    // OPTIMISTIC UI: Write fake message to screen instantly so the user doesn't feel any delay
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeChat.id,
      sender_id: user.id,
      sender_name: user.name,
      message_text: newMessageContent,
      created_at: new Date().toISOString()
    }
    
    setChatMessages(prev => [...prev, optimisticMsg])
    setTimeout(() => scrollToBottom(), 100)
  }

  const handleStartNewChat = async (targetId: string, targetName: string) => {
    try {
      const res = await chatService.initConversation(targetId)
      // Open that chat
      setActiveChat({
        id: res.data.conversation_id,
        type: 'direct',
        other_user_id: targetId,
        other_user_name: targetName,
        other_user_role: '', // minor payload info
        unread_count: 0
      })
    } catch (error) {
       mantineNotifications.show({ title: 'Error', message: 'ไม่สามารถสร้างห้องแชทได้', color: 'red' })
    }
  }

  // ==========================================
  // RENDER SECTIONS
  // ==========================================
  
  // 1. Floating Button Bubble
  const FloatButton = () => (
    <Affix position={{ bottom: 30, right: 30 }} zIndex={1000}>
      <Tooltip label={(botUnreadCount + totalChatUnread) > 0 ? `แจ้งเตือน/แชทใหม่ (${botUnreadCount + totalChatUnread})` : 'Chat BMU'}>
        <div style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }} onClick={() => setOpened(true)}>
          <Button
            variant={(botUnreadCount + totalChatUnread) > 0 ? "filled" : "light"}
            color={(botUnreadCount + totalChatUnread) > 0 ? "orange" : "blue"}
            leftSection={<TbMessageCircle size={20} />}
            radius="xl"
            size="md"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            Chat BMU
          </Button>
          {(botUnreadCount + totalChatUnread) > 0 && (
            <Badge
              size="sm" color="red" variant="filled"
              style={{
                position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22,
                padding: '0 6px', fontSize: '11px', fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {(botUnreadCount + totalChatUnread) > 99 ? '99+' : (botUnreadCount + totalChatUnread)}
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
        onClose={() => { setOpened(false); setActiveChat(null); }}
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
                <Text fw={700} size="xl">Chat BMU</Text>
              </Group>
              <ActionIcon onClick={() => { setOpened(false); setActiveChat(null); }} variant="subtle" color="gray">
                X
              </ActionIcon>
            </Group>
          </Box>

          {/* Tab Navigation (Only show if not deep inside a chat window) */}
          <Tabs value={activeTab} onChange={setActiveTab} style={{ display: activeChat ? 'none' : 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <Tabs.List grow>
              <Tabs.Tab 
                value="bot" 
                leftSection={<TbRobot size={16} />}
                rightSection={botUnreadCount > 0 ? <Badge size="xs" color="red" circle>{botUnreadCount}</Badge> : null}
              >
                ระบบแจ้งเตือน
              </Tabs.Tab>
              <Tabs.Tab 
                value="chat" 
                leftSection={<TbMessageCircle size={16} />}
                rightSection={totalChatUnread > 0 ? <Badge size="xs" color="orange" circle>{totalChatUnread}</Badge> : null}
              >
                แชทพนักงาน
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="bot" style={{ flex: 1, overflow: 'hidden' }}>
              <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            </Tabs.Panel>
            
            <Tabs.Panel value="chat" style={{ flex: 1, overflow: 'hidden' }}>
              <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ScrollArea style={{ flex: 1 }} p="md">
                  {isLoadingChats ? <Loader size="sm" mx="auto" mt="xl" /> : (
                    <>
                      <Text size="sm" fw={600} c="dimmed" mb="sm">กล่องข้อความ ({conversations.length})</Text>
                      {conversations.length === 0 ? (
                        <Text size="sm" c="dimmed" fs="italic">ยังไม่มีประวัติการแชท</Text>
                      ) : (
                        <Stack gap="xs">
                          {conversations.map(conv => (
                            <Box 
                              key={conv.id} 
                              onClick={() => setActiveChat(conv)}
                              style={{ 
                                padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: conv.unread_count > 0 ? '#fff3e0' : '#fff',
                                border: `1px solid ${conv.unread_count > 0 ? '#ffd8a8' : '#eee'}`
                              }}
                            >
                              <Group justify="space-between" align="center" wrap="nowrap">
                                <Group gap="sm" align="center">
                                  <Avatar color="orange" radius="xl">{conv.other_user_name.charAt(0)}</Avatar>
                                  <div>
                                    <Text size="sm" fw={conv.unread_count > 0 ? 700 : 500}>{conv.other_user_name}</Text>
                                    <Text size="xs" c={conv.unread_count > 0 ? 'orange.9' : 'dimmed'} truncate w={150}>
                                      {conv.last_message || 'เริ่มการสนทนา'}
                                    </Text>
                                  </div>
                                </Group>
                                {conv.unread_count > 0 && <Badge color="orange" size="sm" circle>{conv.unread_count}</Badge>}
                              </Group>
                            </Box>
                          ))}
                        </Stack>
                      )}

                      <Divider my="lg" label="รายชื่อพนักงานทั้งหมด" labelPosition="center" />
                      
                      <Stack gap="xs">
                        {directory.map(emp => (
                          <Box 
                            key={emp.id} 
                            onClick={() => handleStartNewChat(emp.id, emp.name)}
                            style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #eee' }}
                          >
                            <Group gap="sm">
                              <Avatar color="gray" radius="xl" size="sm"><TbUserPlus size={14} /></Avatar>
                              <Text size="sm">{emp.name}</Text>
                            </Group>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}
                </ScrollArea>
              </Box>
            </Tabs.Panel>
          </Tabs>

          {/* If inside active chat, render it exclusively bypassing tabs */}
          {activeChat !== null && (
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <Box p="sm" style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff', flexShrink: 0 }}>
                    <Group>
                      <ActionIcon onClick={() => setActiveChat(null)} variant="subtle"><TbChevronLeft size={20} /></ActionIcon>
                      <Avatar color="orange" radius="xl" size="sm">{activeChat.other_user_name.charAt(0)}</Avatar>
                      <Text fw={600}>{activeChat.other_user_name}</Text>
                    </Group>
                </Box>

                <ScrollArea viewportRef={viewport} style={{ flex: 1, backgroundColor: '#f8f9fa' }} p="md">
                  <Stack gap="sm">
                      {chatMessages.map(msg => {
                        const isMe = msg.sender_id === user?.id
                        return (
                          <Group key={msg.id} justify={isMe ? 'flex-end' : 'flex-start'} align="flex-start" wrap="nowrap">
                            {!isMe && <Avatar radius="xl" size="sm" color="gray">{msg.sender_name.charAt(0)}</Avatar>}
                            <Box style={{
                                maxWidth: '75%',
                                padding: '8px 12px',
                                backgroundColor: isMe ? '#ff6b35' : '#ffffff',
                                color: isMe ? '#fff' : '#000',
                                border: `1px solid ${isMe ? '#ff6b35' : '#eee'}`,
                                borderRadius: isMe ? '16px 16px 0 16px' : '0 16px 16px 16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                <Text size="sm">{msg.message_text}</Text>
                                <Text size="xs" c={isMe ? '#ffd8a8' : 'dimmed'} ta="right" mt={2}>{dayjs(msg.created_at).format('HH:mm')}</Text>
                            </Box>
                          </Group>
                        )
                      })}
                  </Stack>
                </ScrollArea>

                <Box p="sm" style={{ backgroundColor: '#fff', borderTop: '1px solid #eee', flexShrink: 0 }}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                      <TextInput
                        placeholder="พิมพ์ข้อความ..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.currentTarget.value)}
                        rightSection={
                          <ActionIcon type="submit" variant="filled" color="orange" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                            <TbSend size={16} />
                          </ActionIcon>
                        }
                      />
                    </form>
                </Box>
              </Box>
            </Box>
          )}

        </Box>
      </Drawer>
    </>
  )
}
