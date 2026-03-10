import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  ActionIcon,
  Avatar,
  LoadingOverlay,
  CloseButton,
  Badge,
  Drawer,
  Button,
  Loader,
  Box,
  ScrollArea,
  Popover,
  UnstyledButton,
  TextInput,
  Modal,
} from '@mantine/core'
import { TbSend, TbMessageCircle, TbBuildingCommunity, TbInfoCircle, TbCornerUpLeft, TbTrash, TbSearch, TbX } from 'react-icons/tb'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from 'react-query'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import relativeTime from 'dayjs/plugin/relativeTime'
import internalChatService, { InternalChatMessage, InternalChatListResponse } from '../../services/internalChatService'
import clientsService from '../../services/clientsService'
import { employeeService } from '../../services/employeeService'
import { useAuthStore } from '../../store/authStore'
import ClientDetail from '../Client/ClientDetail'
import { getSocket } from '../../services/socketService'
import { Employee } from '../../services/employeeService'

dayjs.extend(relativeTime)
dayjs.locale('th')

// ---------------------------------------------------------------------------
// Memoized Message Component
// ---------------------------------------------------------------------------
interface MemoizedChatMessageProps {
  chat: InternalChatMessage
  isMine: boolean
  isOptimistic: boolean
  mentionPattern: RegExp | null
  onReply: (chat: InternalChatMessage) => void
  onDelete: (id: number) => void
  isDeleting: boolean
  isHighlighted?: boolean
}

const MemoizedChatMessage = React.memo(({
  chat, isMine, isOptimistic, mentionPattern, onReply, onDelete, isDeleting, isHighlighted
}: MemoizedChatMessageProps) => {
  const [hovered, setHovered] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const renderMessageWithMentions = (text: string, mine: boolean) => {
    if (!mentionPattern) return <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
    const parts = text.split(mentionPattern)
    return (
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((part, i) => {
          const isMention = i % 2 === 1
          if (isMention) {
            return (
              <Text key={i} span c={mine ? 'yellow.2' : 'orange.6'} fw={600}>
                {part}
              </Text>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </Text>
    )
  }

  return (
    <Box
      id={`chat-message-${chat.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        backgroundColor: isHighlighted ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
        transition: 'background-color 0.5s ease',
        padding: isHighlighted ? '8px' : '0',
        borderRadius: isHighlighted ? '8px' : '0',
      }}
    >
      <Group gap="xs" mb={4} align="flex-end" dir={isMine ? 'rtl' : 'ltr'}>
        <Avatar color={isMine ? 'orange' : 'blue'} radius="xl" size="sm">
          {chat.sender_name?.charAt(0) || 'U'}
        </Avatar>
        <Text size="xs" c="dimmed" dir="ltr">
          {chat.sender_name} • {dayjs(chat.created_at).locale('th').fromNow()}
        </Text>
      </Group>

      <Group gap="xs" align="flex-start" wrap="nowrap" dir={isMine ? 'rtl' : 'ltr'} w="100%"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      >
        <Box
          style={{
            backgroundColor: isMine ? '#ff6b35' : '#ffffff',
            color: isMine ? 'white' : '#212529',
            padding: '8px 14px',
            borderRadius: '12px',
            borderTopRightRadius: isMine ? '2px' : '12px',
            borderTopLeftRadius: isMine ? '12px' : '2px',
            maxWidth: '70%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: isMine ? 'none' : '1px solid #e9ecef',
          }}
          dir="ltr"
        >
          {chat.reply_to_id && (
            <Box
              style={{
                backgroundColor: isMine ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                borderLeft: `3px solid ${isMine ? 'white' : '#adb5bd'}`,
                padding: '4px 8px',
                marginBottom: '6px',
                borderRadius: '4px',
                fontSize: '0.8rem',
              }}
            >
              <Text fw={600} size="xs" c={isMine ? 'white' : 'dark'}>{chat.reply_to_sender_name}</Text>
              <Text size="xs" lineClamp={1}>{chat.reply_to_message}</Text>
            </Box>
          )}
          {renderMessageWithMentions(chat.message, isMine)}
        </Box>

        {!isOptimistic && (
          <Group gap={4} style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }} dir="ltr">
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => onReply(chat)} title="ตอบกลับ">
              <TbCornerUpLeft size={16} />
            </ActionIcon>
            {isMine && (
              <ActionIcon
                size="sm" variant="subtle" color="red"
                onClick={() => setConfirmDeleteOpen(true)}
                title="ยกเลิกข้อความ"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader size={14} color="gray" /> : <TbTrash size={16} />}
              </ActionIcon>
            )}
          </Group>
        )}
      </Group>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={
          <Group gap="xs">
            <TbTrash size={18} color="red" />
            <Text fw={700} c="red">ยืนยันลบข้อความ</Text>
          </Group>
        }
        centered
        size="sm"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">คุณต้องการลบข้อความนี้ใช่ไหม? การดำเนินการนี้ไม่สามารถย้อนคืนได้</Text>
          <Box
            p="sm"
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #ffc9c9',
              borderLeft: '3px solid #fa5252',
              borderRadius: '6px',
            }}
          >
            <Text size="xs" c="dimmed" mb={2}>ข้อความที่จะลบ:</Text>
            <Text size="sm" lineClamp={3} style={{ whiteSpace: 'pre-wrap' }}>{chat.message}</Text>
          </Box>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              color="red"
              leftSection={<TbTrash size={16} />}
              loading={isDeleting}
              onClick={() => {
                setConfirmDeleteOpen(false)
                onDelete(chat.id)
              }}
            >
              ยืนยันลบ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
})
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Chat Message Input — isolated component to prevent re-rendering message list
// ---------------------------------------------------------------------------
interface ChatMessageInputProps {
  replyTo: InternalChatMessage | null
  onClearReply: () => void
  onSend: (payload: { message: string; reply_to_id?: number | null; mentioned_employee_ids?: string[] }) => void
  isSending: boolean
  employees: Employee[]
  mentionPattern: RegExp | null
}

const ChatMessageInput = React.memo(({ replyTo, onClearReply, onSend, isSending, employees, mentionPattern
}: ChatMessageInputProps) => {
  const [message, setMessage] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  const filteredMentions = React.useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return employees.filter(e =>
      (e.first_name && e.first_name.toLowerCase().includes(q)) ||
      (e.last_name && e.last_name.toLowerCase().includes(q)) ||
      (e.nick_name && e.nick_name.toLowerCase().includes(q))
    ).slice(0, 5)
  }, [mentionQuery, employees])

  const handleSend = useCallback(() => {
    if (!message.trim()) return

    const mentioned_employee_ids: string[] = []
    employees.forEach(emp => {
      const lastNamePart = emp.last_name ? ` ${emp.last_name}` : ''
      const nicknamePart = emp.nick_name ? ` (${emp.nick_name})` : ''
      const mentionStr = `@${emp.first_name}${lastNamePart}${nicknamePart}`
      if (message.includes(mentionStr)) {
        mentioned_employee_ids.push(emp.employee_id)
      }
    })

    onSend({
      message: message.trim(),
      reply_to_id: replyTo?.id ?? null,
      mentioned_employee_ids: Array.from(new Set(mentioned_employee_ids)),
    })
    setMessage('')
    setMentionQuery(null)
  }, [message, replyTo, employees, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (mentionQuery !== null) return // popover open — don't submit
      handleSend()
    }
  }, [mentionQuery, handleSend])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value
    setMessage(val)
    const match = val.match(/(?:^|\s)@(\S*)$/)
    if (match) {
      setMentionQuery(match[1])
    } else {
      setMentionQuery(null)
    }
  }, [])

  return (
    <Box p="sm" style={{ borderTop: '1px solid #dee2e6', backgroundColor: '#f8f9fa', flexShrink: 0 }}>
      {replyTo && (
        <Group justify="space-between" align="center" mb="sm" p="xs"
          style={{ backgroundColor: '#e9ecef', borderRadius: '4px', borderLeft: '3px solid #ff6b35' }}
        >
          <Box style={{ flex: 1, overflow: 'hidden' }}>
            <Text size="xs" fw={600} c="dimmed">ตอบกลับ: {replyTo.sender_name}</Text>
            <Text size="xs" truncate>{replyTo.message}</Text>
          </Box>
          <CloseButton size="sm" onClick={onClearReply} />
        </Group>
      )}
      <Group gap="sm" align="flex-end">
        <Popover opened={mentionQuery !== null && filteredMentions.length > 0} position="top-start" width={300} withArrow shadow="md">
          <Popover.Target>
            <Box style={{ flex: 1, position: 'relative' }}>
              {/* Transparent overlay for colored mentions */}
              <Box
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  padding: '10px 16px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  pointerEvents: 'none',
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                  zIndex: 1,
                  color: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '32px',
                }}
              >
                {mentionPattern ? message.split(mentionPattern).map((part, i) => {
                  const isMention = i % 2 === 1
                  return (
                    <span key={i} style={{
                      color: isMention ? '#f76707' : 'transparent',
                      fontWeight: isMention ? 600 : 'normal',
                    }}>
                      {part}
                    </span>
                  )
                }) : <span style={{ color: 'transparent' }}>{message}</span>}
                <span style={{ color: 'transparent' }}> </span>
              </Box>
              <TextInput
                placeholder="พิมพ์ข้อความที่นี่... (พิมพ์ @ เพื่อระบุตัวพนักงาน)"
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                size="md"
                radius="xl"
                rightSection={(
                  <ActionIcon
                    color="orange"
                    size="md"
                    radius="xl"
                    variant="filled"
                    onClick={handleSend}
                    loading={isSending}
                    disabled={!message.trim()}
                    style={{ marginRight: 4 }}
                  >
                    <TbSend size={16} />
                  </ActionIcon>
                )}
                rightSectionWidth={46}
                styles={{
                  root: { flex: 1 },
                  input: {
                    color: message.length > 0 ? 'transparent' : 'inherit',
                    caretColor: 'black',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid #ced4da',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:focus': {
                      borderColor: '#ff6b35',
                      boxShadow: '0 0 0 2px rgba(255, 107, 53, 0.2)',
                    },
                    zIndex: 2,
                    position: 'relative',
                    textShadow: message.length > 0 ? '0 0 0 #495057' : 'none',
                    paddingRight: 46,
                  },
                }}
              />
            </Box>
          </Popover.Target>
          <Popover.Dropdown p={0}>
            <ScrollArea h={filteredMentions.length > 3 ? 200 : undefined}>
              {filteredMentions.map(emp => (
                <UnstyledButton
                  key={emp.id}
                  w="100%"
                  p="sm"
                  onClick={() => {
                    const regex = /(?:^|\s)(@\S*)$/
                    const lastNamePart = emp.last_name ? ` ${emp.last_name}` : ''
                    const nicknamePart = emp.nick_name ? ` (${emp.nick_name})` : ''
                    const newVal = message.replace(regex, (match, p1) => {
                      const prefix = match.substring(0, match.length - p1.length)
                      return `${prefix}@${emp.first_name}${lastNamePart}${nicknamePart} `
                    })
                    setMessage(newVal)
                    setMentionQuery(null)
                  }}
                  style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }}
                >
                  <Group gap="sm">
                    <Avatar src={emp.profile_image} radius="xl" size="sm" color="orange">
                      {emp.first_name ? emp.first_name.charAt(0) : 'U'}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={500}>{emp.first_name} {emp.last_name || ''} {emp.nick_name ? `(${emp.nick_name})` : ''}</Text>
                      <Text size="xs" c="dimmed">{emp.position}</Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              ))}
            </ScrollArea>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Box>
  )
})
// ---------------------------------------------------------------------------

interface InfiniteChatData {
  pages: InternalChatListResponse[]
  pageParams: unknown[]
}

interface ChatRoomProps {
  build: string | null
  companyName: string | null
}

export default function ChatRoom({ build, companyName }: ChatRoomProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [replyTo, setReplyTo] = useState<InternalChatMessage | null>(null)
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false)

  // Fetch active employees for mention
  const { data: employeesData } = useQuery(
    ['active-employees'],
    () => employeeService.getAll({ limit: 1000, status: 'active' }),
    { staleTime: 5 * 60 * 1000 }
  )
  const employees = React.useMemo(() => employeesData?.employees || [], [employeesData?.employees])

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 300)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Build dynamic regex for matching mentions
  const mentionPattern = React.useMemo(() => {
    if (!employees || employees.length === 0) return null
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const terms = employees.map(emp => {
      const lastNamePart = emp.last_name ? ` ${emp.last_name}` : ''
      const nicknamePart = emp.nick_name ? ` (${emp.nick_name})` : ''
      return escapeRegExp(`@${emp.first_name}${lastNamePart}${nicknamePart}`)
    })
    return new RegExp(`(${terms.join('|')})`, 'g')
  }, [employees])

  // Fetch chat history with Infinite Query — NO polling, socket handles real-time
  const {
    data: fetchResult,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    ['internal-chats-list', build],
    ({ pageParam = 1 }) => internalChatService.getChatsByBuild(build!, pageParam, 50),
    {
      enabled: !!build,
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.data.length === 50 ? allPages.length + 1 : undefined
      },
      // No refetchInterval — socket.io handles all real-time updates
    }
  )

  const chats = React.useMemo(() => {
    if (!fetchResult?.pages) return []
    const allChats: InternalChatMessage[] = []
    for (let i = fetchResult.pages.length - 1; i >= 0; i--) {
      if (fetchResult.pages[i]?.data) {
        allChats.push(...fetchResult.pages[i].data)
      }
    }
    return allChats
  }, [fetchResult])

  const searchResults = React.useMemo(() => {
    if (!debouncedSearchQuery.trim()) return []
    const lowerQuery = debouncedSearchQuery.toLowerCase()
    return chats.filter(chat => 
      chat.message.toLowerCase().includes(lowerQuery) || 
      chat.sender_name?.toLowerCase().includes(lowerQuery)
    ).slice(0, 15) // limit to recent 15 matches 
  }, [chats, debouncedSearchQuery])

  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)

  const scrollToMessage = useCallback((messageId: number) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    
    setTimeout(() => {
      const element = document.getElementById(`chat-message-${messageId}`)
      if (element && viewportRef.current) {
        // Find position of element relative to viewport
        const viewport = viewportRef.current
        const elementRect = element.getBoundingClientRect()
        const viewportRect = viewport.getBoundingClientRect()
        
        // Scroll to center
        viewport.scrollTo({
          top: viewport.scrollTop + (elementRect.top - viewportRect.top) - (viewport.clientHeight / 2) + (elementRect.height / 2),
          behavior: 'smooth'
        })

        setHighlightedMessageId(messageId)
        setTimeout(() => setHighlightedMessageId(null), 2500)
      }
    }, 100)
  }, [])

  // Real-time: Join socket room and listen for new chat messages
  useEffect(() => {
    if (!build) return
    const socket = getSocket()
    if (!socket) return

    socket.emit('join:chat', { build })
    console.log(`🔌 [ChatRoom] Joined chat room: chat:build:${build}`)

    const handleNewMessage = ({ message }: { message: InternalChatMessage }) => {
      queryClient.setQueryData<InfiniteChatData | undefined>(['internal-chats-list', build], (old) => {
        if (!old || old.pages.length === 0) return old

        const newPages = [...old.pages]
        const firstPage = newPages[0]

        const withoutOptimistic = firstPage.data.filter(m => m.id < 1000000000000)
        const alreadyExists = withoutOptimistic.some(m => m.id === message.id)
        if (alreadyExists) return old

        newPages[0] = { ...firstPage, data: [...withoutOptimistic, message] }
        return { ...old, pages: newPages }
      })
    }

    const handleDeletedMessage = ({ id }: { id: number }) => {
      queryClient.setQueryData<InfiniteChatData | undefined>(['internal-chats-list', build], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.filter(m => m.id !== id)
          }))
        }
      })
    }

    socket.on('chat:new_message', handleNewMessage)
    socket.on('chat:message_deleted', handleDeletedMessage)

    return () => {
      socket.off('chat:new_message', handleNewMessage)
      socket.off('chat:message_deleted', handleDeletedMessage)
      socket.emit('leave:chat', { build })
    }
  }, [build, queryClient])

  // Fetch single client detail (only when drawer is opened)
  const { data: clientDetail, isLoading: isLoadingClient } = useQuery(
    ['client-detail', build],
    () => clientsService.getByBuild(build!),
    {
      enabled: !!build && isClientDetailOpen,
      staleTime: 60000,
    }
  )

  // Smart auto-scroll: scroll to bottom only if already near the bottom
  const isNearBottom = useCallback(() => {
    const el = viewportRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    }
  }, [])

  // Track previous chats count to detect new messages
  const prevChatsLengthRef = useRef(0)
  useEffect(() => {
    const prevLen = prevChatsLengthRef.current
    const currLen = chats.length

    if (currLen === 0) {
      prevChatsLengthRef.current = 0
      return
    }

    if (prevLen === 0) {
      // Initial load — always scroll to bottom instantly
      scrollToBottom(false)
    } else if (currLen > prevLen) {
      // New message arrived — scroll only if near bottom (user hasn't scrolled up)
      if (isNearBottom()) {
        scrollToBottom(true)
      }
    }

    prevChatsLengthRef.current = currLen
  }, [chats.length, isNearBottom, scrollToBottom])

  // Send message mutation — no invalidateQueries: socket broadcast handles the update
  const sendMessageMutation = useMutation(
    (payload: { build: string; message: string; reply_to_id?: number | null; mentioned_employee_ids?: string[] }) =>
      internalChatService.sendMessage(payload),
    {
      onMutate: async (newMsg) => {
        // Optimistic update — show message instantly before server confirms
        await queryClient.cancelQueries(['internal-chats-list', build])
        const previousChats = queryClient.getQueryData<InfiniteChatData>(['internal-chats-list', build])

        queryClient.setQueryData<InfiniteChatData | undefined>(['internal-chats-list', build], (old) => {
          if (!old || old.pages.length === 0) return old
          const optimisticMessage: InternalChatMessage = {
            id: Date.now(),
            build: newMsg.build,
            sender_employee_id: user?.employee_id || '',
            sender_name: user?.name || 'Unknown',
            message: newMsg.message,
            reply_to_id: replyTo?.id || null,
            reply_to_message: replyTo?.message || null,
            reply_to_sender_name: replyTo?.sender_name || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const newPages = [...old.pages]
          newPages[0] = {
            ...newPages[0],
            data: [...(newPages[0]?.data || []), optimisticMessage],
          }
          return { ...old, pages: newPages }
        })

        // Scroll to bottom immediately on send
        setTimeout(() => scrollToBottom(true), 50)

        return { previousChats }
      },
      onError: (_err, _newMsg, context: { previousChats?: InfiniteChatData } | undefined) => {
        if (context?.previousChats) {
          queryClient.setQueryData(['internal-chats-list', build], context.previousChats)
        }
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง',
          color: 'red',
        })
      },
      // No onSettled/invalidateQueries — socket 'chat:new_message' replaces optimistic ID with real ID
    }
  )

  // Delete message mutation — socket handles broadcast; no invalidateQueries needed
  const deleteMessageMutation = useMutation(
    (id: number) => internalChatService.deleteMessage(id),
    {
      onMutate: async (deletedId) => {
        await queryClient.cancelQueries(['internal-chats-list', build])
        const previousChats = queryClient.getQueryData<InfiniteChatData>(['internal-chats-list', build])
        queryClient.setQueryData<InfiniteChatData | undefined>(['internal-chats-list', build], (old) => {
          if (!old || !old.pages) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              data: (page.data || []).filter(m => m.id !== deletedId)
            }))
          }
        })
        return { previousChats }
      },
      onError: (_err, _id, context: { previousChats?: InfiniteChatData } | undefined) => {
        if (context?.previousChats) {
          queryClient.setQueryData(['internal-chats-list', build], context.previousChats)
        }
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถลบข้อความได้',
          color: 'red',
        })
      },
      // No onSettled — socket 'chat:message_deleted' handles removal for all users
    }
  )

  const HighlightText = ({ text = '', highlight = '' }) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <Text key={i} span c="orange.7" bg="orange.1" fw={700} style={{ borderRadius: '2px', padding: '0 2px' }}>
              {part}
            </Text>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // --- Render Functions ---

  const handleSend = useCallback((payload: { message: string; reply_to_id?: number | null; mentioned_employee_ids?: string[] }) => {
    if (!build) return
    sendMessageMutation.mutate({ build, ...payload })
    setReplyTo(null)
  }, [build, sendMessageMutation])

  // --- Empty State (no client selected) ---
  if (!build) {
    return (
      <Paper shadow="sm" radius="md" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <Stack align="center" gap="xs">
          <Box
            style={{
              width: 72, height: 72,
              borderRadius: '50%',
              backgroundColor: '#ffede5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <TbMessageCircle size={36} color="#ff6b35" />
          </Box>
          <Text fw={600} size="lg" c="dark.5" mt="xs">เลือกลูกค้าเพื่อเริ่มสนทนา</Text>
          <Text c="dimmed" size="sm" ta="center" maw={280}>เลือกรายชื่อลูกค้าด้านซ้ายเพื่อเปิดห้องสนทนาภายใน</Text>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper shadow="sm" radius="md" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <LoadingOverlay visible={isLoading && chats.length === 0} overlayProps={{ blur: 2 }} />

      {/* Chat Header */}
      <Box p="lg" style={{ borderBottom: '1px solid #dee2e6', backgroundColor: '#fff', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', flexShrink: 0 }}>
        <Group align="center" gap="md">
          <Avatar color="orange" radius="md" size="lg">
            <TbBuildingCommunity size={24} />
          </Avatar>
          <Box style={{ flex: 1 }}>
            <Text fw={700} size="xl" c="dark.9">{companyName}</Text>
            <Group gap="xs" mt={2}>
              <Text size="sm" c="dimmed">รหัสการทำงาน:</Text>
              <Badge variant="light" color="orange" size="sm" radius="sm">
                {build}
              </Badge>
            </Group>
          </Box>
          <Group gap="sm">
            {isSearchOpen ? (
              <Popover opened={debouncedSearchQuery.trim().length > 0 && searchResults.length > 0} position="bottom-end" shadow="md" width={420}>
                <Popover.Target>
                  <TextInput
                    placeholder="ค้นหาข้อความ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    rightSection={
                      <ActionIcon size="md" variant="transparent" color="gray" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                        <TbX size={16} />
                      </ActionIcon>
                    }
                    size="md"
                    radius="md"
                    w={{ base: 250, sm: 400 }}
                    styles={{ input: { backgroundColor: '#f8f9fa' } }}
                    autoFocus
                  />
                </Popover.Target>
                <Popover.Dropdown p={4}>
                  <ScrollArea h={Math.min(searchResults.length * 75, 450)}>
                    {searchResults.map(msg => (
                      <UnstyledButton
                        key={msg.id}
                        w="100%"
                        p="md"
                        onClick={() => scrollToMessage(msg.id)}
                        style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', '&:hover': { backgroundColor: '#f8f9fa' } }}
                      >
                        <Group gap="md" wrap="nowrap" align="flex-start">
                          <Avatar radius="xl" size="md" color="orange">
                            {msg.sender_name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box style={{ flex: 1, overflow: 'hidden' }}>
                            <Group justify="space-between" wrap="nowrap" align="center">
                              <Text size="sm" fw={600} lineClamp={1}>{msg.sender_name}</Text>
                              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{dayjs(msg.created_at).locale('th').format('DD MMM HH:mm')}</Text>
                            </Group>
                            <Text size="sm" c="dark.7" lineClamp={2} mt={4}>
                              <HighlightText text={msg.message} highlight={debouncedSearchQuery} />
                            </Text>
                          </Box>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>
            ) : (
              <ActionIcon variant="light" color="orange" size="lg" radius="md" onClick={() => setIsSearchOpen(true)}>
                <TbSearch size={20} />
              </ActionIcon>
            )}
            <Button
              leftSection={<TbInfoCircle size={18} />}
              variant="light"
              color="orange"
              onClick={() => setIsClientDetailOpen(true)}
            >
              ดูข้อมูลลูกค้า
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Messages Area */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} p="md" viewportRef={viewportRef}>
        <Stack gap="md">
          {hasNextPage && (
            <Box style={{ display: 'flex', justifyContent: 'center' }} my="sm">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                โหลดข้อความเก่าเพิ่มเติม
              </Button>
            </Box>
          )}

          {chats.length === 0 && !isLoading ? (
            <Stack align="center" gap="xs" mt="xl">
              <TbMessageCircle size={40} color="#ced4da" />
              <Text c="dimmed" ta="center">ยังไม่มีข้อความสนทนาในห้องนี้</Text>
              <Text c="dimmed" size="xs" ta="center">เริ่มบทสนทนาด้วยการพิมพ์ข้อความด้านล่าง</Text>
            </Stack>
          ) : (
            chats.map((chat, index) => {
              const isMine = chat.sender_employee_id === user?.employee_id
              const isOptimistic = chat.id > 1000000000000

              // Date separator logic
              const chatDate = dayjs(chat.created_at).startOf('day')
              const prevChat = chats[index - 1]
              const prevDate = prevChat ? dayjs(prevChat.created_at).startOf('day') : null
              const showDateSeparator = !prevDate || !chatDate.isSame(prevDate, 'day')
              const today = dayjs().startOf('day')
              const yesterday = today.subtract(1, 'day')
              const dateLabel = chatDate.isSame(today, 'day')
                ? 'วันนี้'
                : chatDate.isSame(yesterday, 'day')
                  ? 'เมื่อวาน'
                  : chatDate.locale('th').format('DD MMMM BBBB')

              return (
                <React.Fragment key={chat.id}>
                  {showDateSeparator && (
                    <Group gap="sm" my="xs">
                      <Box style={{ flex: 1, height: 1, backgroundColor: '#dee2e6' }} />
                      <Badge variant="light" color="gray" size="sm" radius="xl" style={{ flexShrink: 0 }}>
                        {dateLabel}
                      </Badge>
                      <Box style={{ flex: 1, height: 1, backgroundColor: '#dee2e6' }} />
                    </Group>
                  )}
                  <MemoizedChatMessage
                    chat={chat}
                    isMine={isMine}
                    isOptimistic={isOptimistic}
                    mentionPattern={mentionPattern}
                    onReply={setReplyTo}
                    onDelete={deleteMessageMutation.mutate}
                    isDeleting={deleteMessageMutation.isLoading && deleteMessageMutation.variables === chat.id}
                    isHighlighted={highlightedMessageId === chat.id}
                  />
                </React.Fragment>
              )
            })
          )}
        </Stack>
      </ScrollArea>

      {/* Input Area — isolated component, typing here does NOT re-render message list */}
      <ChatMessageInput
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={handleSend}
        isSending={sendMessageMutation.isLoading}
        employees={employees}
        mentionPattern={mentionPattern}
      />

      {/* Client Detail Drawer */}
      <Drawer
        opened={isClientDetailOpen}
        onClose={() => setIsClientDetailOpen(false)}
        title={<Text fw={700} size="xl" c="orange">ข้อมูลลูกค้า</Text>}
        position="right"
        size="lg"
      >
        <ScrollArea h="100%" type="auto">
          {isLoadingClient ? (
            <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}><Loader color="orange" /></Box>
          ) : clientDetail ? (
            <Box pb="xl">
              <ClientDetail client={clientDetail} />
            </Box>
          ) : (
            <Text c="dimmed" ta="center">ไม่พบข้อมูลลูกค้า</Text>
          )}
        </ScrollArea>
      </Drawer>
    </Paper>
  )
}
