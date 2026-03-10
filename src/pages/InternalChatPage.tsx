import { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Grid,
  Paper,
  Text,
  TextInput,
  ScrollArea,
  NavLink,
  Box,
  LoadingOverlay,
  Badge,
  ActionIcon,
  Tooltip,
  Tabs,
  Group,
  Avatar,
  Stack,
  Divider,
} from '@mantine/core'
import {
  TbSearch,
  TbHash,
  TbArrowLeft,
  TbMessageCircle,
  TbList,
  TbClock,
  TbBuildingCommunity,
  TbRefresh,
} from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import relativeTime from 'dayjs/plugin/relativeTime'
import clientsService from '../services/clientsService'
import internalChatService, { ChatRecentActivity } from '../services/internalChatService'
import ChatRoom from '../components/InternalChat/ChatRoom'
import { useDebouncedValue } from '@mantine/hooks'
import { getSocket } from '../services/socketService'

dayjs.extend(relativeTime)
dayjs.locale('th')

// ---------------------------------------------------------------------------
// Recent Activity Item
// ---------------------------------------------------------------------------
interface RecentActivityItemProps {
  item: ChatRecentActivity
  isSelected: boolean
  onClick: () => void
}

function RecentActivityItem({ item, isSelected, onClick }: RecentActivityItemProps) {
  const isActive = item.is_active === 1
  const timeAgo = dayjs(item.last_message_at).locale('th').fromNow()

  return (
    <Box
      onClick={onClick}
      p="sm"
      mb={4}
      style={{
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: isSelected ? '#fff0e6' : '#fff',
        border: isSelected ? '1.5px solid #ff6b35' : '1px solid #f1f3f5',
        transition: 'background-color 0.15s, border-color 0.15s',
        position: 'relative',
      }}
    >
      {/* Active pulse indicator */}
      {isActive && !isSelected && (
        <Box
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ff6b35',
            boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.4)',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar color={isActive ? 'orange' : 'gray'} radius="md" size="md">
          <TbBuildingCommunity size={18} />
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" mb={2}>
            <Text
              size="sm"
              fw={isSelected ? 700 : isActive ? 600 : 500}
              lineClamp={1}
              c={isSelected ? 'orange.7' : 'dark'}
              style={{ flex: 1, minWidth: 0 }}
            >
              {item.company_name}
            </Text>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {timeAgo}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1} mb={4}>
            <Text span fw={500} c={isSelected ? 'orange.6' : 'dark.4'}>
              {item.last_sender_name?.split(' (')[0]}:
            </Text>{' '}
            {item.last_message}
          </Text>
          <Group gap={6}>
            {isActive && (
              <Badge size="xs" color="orange" variant="filled" radius="xl">
                🔴 กำลังคุย
              </Badge>
            )}
            <Badge
              size="xs"
              color="gray"
              variant="light"
              radius="xl"
              leftSection={<TbMessageCircle size={9} />}
            >
              {item.total_messages} ข้อความ
            </Badge>
          </Group>
        </Box>
      </Group>
    </Box>
  )
}

import { useSearchParams } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function InternalChatPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlBuild = searchParams.get('build')
  const urlCompanyName = searchParams.get('companyName')
  const urlTab = searchParams.get('tab')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 300)
  const [selectedBuild, setSelectedBuild] = useState<string | null>(urlBuild)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(urlCompanyName || null)
  const [activeTab, setActiveTab] = useState<string | null>(urlTab || 'recent')

  // Sync state with URL params (e.g. from notification deep links)
  useEffect(() => {
    if (urlBuild && urlBuild !== selectedBuild) {
      setSelectedBuild(urlBuild)
      setSelectedCompanyName(urlCompanyName || '')
    }
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [urlBuild, urlCompanyName, urlTab, selectedBuild, activeTab])

  // Persist active tab to URL without clearing other params
  const handleTabChange = useCallback((tab: string | null) => {
    setActiveTab(tab)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (tab) next.set('tab', tab)
      else next.delete('tab')
      return next
    })
  }, [setSearchParams])

  // Fetch client list for "ลูกค้าทั้งหมด" tab
  const { data: clients = [], isLoading: isLoadingClients } = useQuery(
    ['clients-dropdown', debouncedSearchQuery],
    () => clientsService.getDropdownList({ search: debouncedSearchQuery, limit: 100 }),
    {
      keepPreviousData: true,
      staleTime: 60000,
    }
  )

  // Fetch recent activity for "ล่าสุด" tab
  const { data: recentActivityData, isLoading: isLoadingRecent } = useQuery(
    ['chat-recent-activity'],
    () => internalChatService.getRecentActivity(),
    {
      staleTime: 30000,
      refetchOnWindowFocus: true,
    }
  )
  const recentActivity = recentActivityData?.data || []

  const handleSelectClient = useCallback((build: string, companyName: string) => {
    setSelectedBuild(build)
    setSelectedCompanyName(companyName)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('build', build)
      next.set('companyName', companyName)
      // Preserve the current tab so clicking in 'all' stays in 'all'
      if (activeTab) next.set('tab', activeTab)
      return next
    })
  }, [setSearchParams, activeTab])

  // Real-time: when any new message arrives, update sidebar optimistically WITHOUT a network round-trip
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = ({ message }: { message: { build: string; message: string; sender_name: string; created_at: string } }) => {
      queryClient.setQueryData<{ success: boolean; data: ChatRecentActivity[] } | undefined>(
        ['chat-recent-activity'],
        (old) => {
          if (!old) return old

          const now = new Date().toISOString()
          const existing = old.data.find(a => a.build === message.build)

          let updated: ChatRecentActivity[]

          if (existing) {
            // Update existing room and move to top
            updated = [
              { ...existing, last_message: message.message, last_sender_name: message.sender_name, last_message_at: now, is_active: 1 },
              ...old.data.filter(a => a.build !== message.build),
            ]
          } else {
            // Unknown room — trigger a refetch to get full data
            queryClient.invalidateQueries(['chat-recent-activity'])
            return old
          }

          return { ...old, data: updated }
        }
      )
    }

    socket.on('chat:new_message', handleNewMessage)
    return () => {
      socket.off('chat:new_message', handleNewMessage)
    }
  }, [queryClient])

  // On mobile: hide sidebar when a client is selected
  const isMobileChatOpen = !!selectedBuild

  // Count active chats (within last hour)
  const activeCount = recentActivity.filter(a => a.is_active === 1).length

  return (
    <Container fluid p={0} style={{ height: 'calc(100vh - 80px)', display: 'flex' }}>
      {/* Pulse animation for active badge & CSS for mobile master-detail */}
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(255, 107, 53, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
        }
        @media (max-width: 767px) {
          .chat-sidebar { display: ${isMobileChatOpen ? 'none' : 'flex'} !important; }
          .chat-main    { display: ${isMobileChatOpen ? 'flex' : 'none'} !important; }
        }
        @media (min-width: 768px) {
          .chat-sidebar, .chat-main { display: flex !important; }
        }
      `}</style>

      <Grid gutter={0} style={{ flex: 1, height: '100%' }}>
        {/* Sidebar */}
        <Grid.Col
          span={{ base: 12, sm: 4, md: 3 }}
          className="chat-sidebar"
          style={{ height: '100%', borderRight: '1px solid #dee2e6', flexDirection: 'column' }}
        >
          <Paper shadow="none" radius={0} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <Box px="md" pt="md" pb="xs">
              <Group align="center" justify="space-between" mb="sm">
                <Group gap="xs" align="center">
                  <TbMessageCircle size={22} color="#ff6b35" />
                  <Text fw={800} size="xl" c="dark">แชทภายใน</Text>
                  {activeCount > 0 && (
                    <Badge color="orange" variant="filled" size="sm" radius="xl">
                      {activeCount} ห้องกำลังคุย
                    </Badge>
                  )}
                </Group>
                <Tooltip label="รีเฟรชข้อมูล" position="left">
                  <ActionIcon
                    variant="subtle"
                    color="orange"
                    size="sm"
                    loading={isLoadingRecent || isLoadingClients}
                    onClick={() => {
                      queryClient.invalidateQueries(['chat-recent-activity'])
                      queryClient.invalidateQueries(['clients-dropdown'])
                    }}
                    style={{ transition: 'transform 0.3s' }}
                  >
                    <TbRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Box>

            <Divider />

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
              styles={{
                root: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
                panel: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
              }}
            >
              <Tabs.List px="md" pt="xs">
                <Tabs.Tab
                  value="recent"
                  leftSection={<TbClock size={15} />}
                  rightSection={
                    recentActivity.length > 0 ? (
                      <Badge size="xs" variant="filled" color="orange" circle>
                        {recentActivity.length}
                      </Badge>
                    ) : undefined
                  }
                >
                  ล่าสุด
                </Tabs.Tab>
                <Tabs.Tab value="all" leftSection={<TbList size={15} />}>
                  ทั้งหมด
                </Tabs.Tab>
              </Tabs.List>

              {/* ===== Recent Activity Tab ===== */}
              <Tabs.Panel value="recent">
                <ScrollArea style={{ flex: 1, height: '100%' }} p="sm">
                  <Box style={{ position: 'relative', minHeight: 80 }}>
                    <LoadingOverlay visible={isLoadingRecent} overlayProps={{ blur: 2 }} />
                    {recentActivity.length === 0 && !isLoadingRecent ? (
                      <Stack align="center" mt="xl" gap="xs">
                        <TbMessageCircle size={36} color="#ced4da" />
                        <Text c="dimmed" ta="center" size="sm">ยังไม่มีการสนทนาในระบบ</Text>
                        <Text c="dimmed" ta="center" size="xs">เริ่มสนทนาได้จากแท็บ "ทั้งหมด"</Text>
                      </Stack>
                    ) : (
                      <>
                        {/* Active first — sort is already done by backend */}
                        {recentActivity.map(item => (
                          <RecentActivityItem
                            key={item.build}
                            item={item}
                            isSelected={selectedBuild === item.build}
                            onClick={() => handleSelectClient(item.build, item.company_name)}
                          />
                        ))}
                      </>
                    )}
                  </Box>
                </ScrollArea>
              </Tabs.Panel>

              {/* ===== All Clients Tab ===== */}
              <Tabs.Panel value="all">
                <Box px="md" pt="sm" pb="xs">
                  <TextInput
                    placeholder="ค้นหาชื่อบริษัท หรือ รหัส build"
                    leftSection={<TbSearch size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    radius="xl"
                    size="sm"
                  />
                </Box>
                <ScrollArea style={{ flex: 1, height: '100%' }} px="sm">
                  <Box style={{ position: 'relative', minHeight: 80 }}>
                    <LoadingOverlay visible={isLoadingClients} overlayProps={{ blur: 2 }} />
                    {clients.length === 0 && !isLoadingClients ? (
                      <Text c="dimmed" ta="center" mt="md" size="sm">ไม่พบรายชื่อลูกค้า</Text>
                    ) : (
                      clients.map((client) => (
                        <NavLink
                          key={client.build}
                          active={selectedBuild === client.build}
                          label={
                            <Box>
                              <Text size="sm" fw={selectedBuild === client.build ? 600 : 400} lineClamp={1}>
                                {client.company_name}
                              </Text>
                              <Badge variant="light" color="gray" size="xs" mt={2} leftSection={<TbHash size={10} />}>
                                {client.build}
                              </Badge>
                            </Box>
                          }
                          onClick={() => handleSelectClient(client.build, client.company_name)}
                          variant="filled"
                          color="orange"
                          styles={(theme) => ({
                            root: {
                              borderRadius: theme.radius.md,
                              marginBottom: 4,
                              ...(selectedBuild === client.build
                                ? {
                                    backgroundColor: theme.colors.orange[0],
                                    color: theme.colors.orange[9],
                                  }
                                : {}),
                            },
                          })}
                        />
                      ))
                    )}
                  </Box>
                </ScrollArea>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Grid.Col>

        {/* Main Content: Chat Room */}
        <Grid.Col
          span={{ base: 12, sm: 8, md: 9 }}
          className="chat-main"
          style={{ height: '100%', backgroundColor: '#f8f9fa', flexDirection: 'column' }}
        >
          <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {isMobileChatOpen && (
              <Box
                hiddenFrom="sm"
                px="md"
                py="xs"
                style={{ borderBottom: '1px solid #dee2e6', backgroundColor: '#fff' }}
              >
                <Tooltip label="กลับไปรายชื่อลูกค้า">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    onClick={() => { 
                      setSelectedBuild(null); 
                      setSelectedCompanyName(null);
                      setSearchParams({});
                    }}
                  >
                    <TbArrowLeft size={20} />
                  </ActionIcon>
                </Tooltip>
              </Box>
            )}
            <Box p="md" style={{ flex: 1, minHeight: 0 }}>
              <ChatRoom build={selectedBuild} companyName={selectedCompanyName} />
            </Box>
          </Box>
        </Grid.Col>
      </Grid>
    </Container>
  )
}
