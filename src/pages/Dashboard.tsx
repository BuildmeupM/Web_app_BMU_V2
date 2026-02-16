/**
 * Dashboard — ปฏิทินบริษัท + ประกาศ/โพส (2 Tabs)
 * Tab 1: Full-width Google Calendar month view with click-to-detail
 * Tab 2: 2-column feed — posts (left) + comments panel (right, on post click)
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Container, Card, Group, Stack, Text, Title, Badge, Avatar,
  Button, Textarea, ActionIcon, Tooltip, Paper, Divider, Collapse,
  Select, Loader, Center, Modal, TextInput, SegmentedControl, Menu, Tabs,
  Switch, ColorSwatch
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  TbSend, TbHeart, TbHeartFilled, TbMessageCircle, TbPin, TbPinFilled,
  TbTrash, TbDotsVertical, TbSpeakerphone, TbNews, TbMapPin,
  TbMessage2, TbPlus, TbChevronLeft, TbChevronRight,
  TbCalendarEvent, TbClock, TbX, TbRefresh
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { companyFeedService, type Post, type Comment, type CompanyEvent } from '../services/companyFeedService'
import { getHolidays } from '../services/holidayService'
import type { Holiday } from '../services/holidayService'

// ─── Helpers ────────────────────────────────────────
const CATEGORY_MAP: Record<string, { label: string; color: string; icon: typeof TbSpeakerphone }> = {
  announcement: { label: 'ประกาศ', color: 'red', icon: TbSpeakerphone },
  news: { label: 'ข่าวสาร', color: 'blue', icon: TbNews },
  discussion: { label: 'สนทนา', color: 'grape', icon: TbMessage2 },
}

const EVENT_TYPE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  meeting: { label: 'ประชุม', emoji: '🤝', color: '#4263eb' },
  holiday: { label: 'เกี่ยวกับภาษี', emoji: '🧾', color: '#e03131' },
  deadline: { label: 'กำหนดส่ง', emoji: '⏰', color: '#f59f00' },
  other: { label: 'อื่นๆ', emoji: '📌', color: '#868e96' },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr.replace(' ', 'T') + '+07:00')
  const diffMs = now.getTime() - then.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} วันที่แล้ว`
  return dateStr.split(' ')[0]
}

function getInitials(name: string): string {
  return name?.slice(0, 2) || '??'
}

const AVATAR_COLORS = ['blue', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'pink', 'grape', 'violet', 'indigo']
function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Calendar Helpers ──────────────────────────────
const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

// ═══════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<string | null>('calendar')

  // ── Calendar State ──
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [calendarDate, setCalendarDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr)

  // ── Event Modal ──
  const [eventModalOpened, { open: openEventModal, close: closeEventModal }] = useDisclosure(false)
  const defaultEvent = {
    title: '', description: '', event_date: '', event_end_date: '',
    start_time: '09:00', end_time: '10:00',
    is_all_day: true, location: '',
    event_type: 'other', color: '#4263eb'
  }
  const [newEvent, setNewEvent] = useState(defaultEvent)

  // ── Feed State ──
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState<string>('discussion')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // ── Calendar nav ──
  const prevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToday = () => {
    setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(todayStr)
  }

  const calendarDays = useMemo(
    () => getCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate]
  )

  // ── Events query ──
  const { data: events = [] } = useQuery<CompanyEvent[]>(
    ['company-feed', 'events', calendarDate.getFullYear(), calendarDate.getMonth()],
    () => companyFeedService.getEvents({ year: calendarDate.getFullYear(), month: calendarDate.getMonth() + 1 }),
    { staleTime: 0 }
  )

  // ── Holidays query ──
  const buddhistYear = calendarDate.getFullYear() + 543
  const { data: holidays = [] } = useQuery<Holiday[]>(
    ['holidays', buddhistYear],
    async () => {
      const res = await getHolidays(buddhistYear, true)
      return res.data.holidays
    },
    { staleTime: 5 * 60 * 1000 }
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, CompanyEvent[]> = {}
    events.forEach(ev => {
      const d = ev.event_date?.split('T')[0]
      if (d) (map[d] ??= []).push(ev)
    })
    // Merge holidays as special events
    holidays.forEach(h => {
      const d = h.holiday_date?.split('T')[0]
      if (d) {
        const holidayEvent: CompanyEvent = {
          id: `holiday-${h.id}`,
          title: `🎌 ${h.name}`,
          description: h.name_en || null,
          event_date: h.holiday_date,
          event_end_date: null,
          start_time: null,
          end_time: null,
          event_type: 'holiday',
          color: '#e03131',
          is_all_day: true,
          location: null,
          created_by: '',
          created_by_name: 'ระบบ',
        };
        (map[d] ??= []).unshift(holidayEvent)
      }
    })
    return map
  }, [events, holidays])

  // ── Posts query ──
  const { data: postsData, isLoading: loadingPosts } = useQuery(
    ['company-feed', 'posts', categoryFilter],
    () => companyFeedService.getPosts({ category: categoryFilter !== 'all' ? categoryFilter : undefined, limit: 50 }),
    { staleTime: 0 }
  )
  const posts = postsData?.posts || []
  const pinnedPosts = useMemo(() => posts.filter(p => p.is_pinned), [posts])
  const regularPosts = useMemo(() => posts.filter(p => !p.is_pinned), [posts])

  // ── Comments query (only when a post is selected) ──
  const { data: allComments = [], isLoading: loadingComments } = useQuery(
    ['company-feed', 'comments', selectedPost?.id],
    () => companyFeedService.getComments(selectedPost!.id),
    { enabled: !!selectedPost, staleTime: 0 }
  )
  // Show only 4 latest comments
  const latestComments = useMemo(() => {
    const sorted = [...allComments].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sorted.slice(0, 4).reverse() // reverse to show oldest-first of the 4
  }, [allComments])

  // ── Event Mutations (Optimistic) ──
  const createEventMut = useMutation(companyFeedService.createEvent, {
    onMutate: async (newData) => {
      await queryClient.cancelQueries(['company-feed', 'events'])
      const qKey = ['company-feed', 'events', calendarDate.getFullYear(), calendarDate.getMonth()]
      const prev = queryClient.getQueryData<CompanyEvent[]>(qKey)
      const optimistic: CompanyEvent = {
        id: `temp-${Date.now()}`, title: newData.title,
        description: newData.description || null, event_date: newData.event_date,
        event_end_date: newData.event_end_date || null,
        start_time: newData.start_time || null, end_time: newData.end_time || null,
        is_all_day: newData.is_all_day ?? true, location: newData.location || null,
        event_type: (newData.event_type as any) || 'other', color: newData.color || '#4263eb',
        created_by: user?.id || '', created_by_name: user?.name || '',
      }
      queryClient.setQueryData<CompanyEvent[]>(qKey, old => [...(old || []), optimistic])
      closeEventModal(); setNewEvent(defaultEvent)
      return { prev, qKey }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
    onSettled: () => queryClient.invalidateQueries(['company-feed', 'events']),
  })

  const deleteEventMut = useMutation(companyFeedService.deleteEvent, {
    onMutate: async (id) => {
      await queryClient.cancelQueries(['company-feed', 'events'])
      const qKey = ['company-feed', 'events', calendarDate.getFullYear(), calendarDate.getMonth()]
      const prev = queryClient.getQueryData<CompanyEvent[]>(qKey)
      queryClient.setQueryData<CompanyEvent[]>(qKey, old => (old || []).filter(e => e.id !== id))
      return { prev, qKey }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
    onSettled: () => queryClient.invalidateQueries(['company-feed', 'events']),
  })

  // ── Post Mutations (Optimistic) ──
  const createPostMut = useMutation(companyFeedService.createPost, {
    onMutate: async (newData) => {
      await queryClient.cancelQueries(['company-feed', 'posts'])
      const qKey = ['company-feed', 'posts', categoryFilter]
      const prev = queryClient.getQueryData(qKey)
      const optimisticPost: Post = {
        id: `temp-${Date.now()}`, author_id: user?.id || '', category: (newData.category as any) || 'discussion',
        title: newData.title || null, content: newData.content, is_pinned: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        author_name: user?.name || '', author_role: user?.role || '',
        comment_count: 0, reaction_count: 0, user_reacted: 0,
      }
      queryClient.setQueryData(qKey, (old: any) => ({
        ...old, posts: [optimisticPost, ...(old?.posts || [])],
      }))
      setNewPostContent(''); setNewPostTitle(''); setNewPostCategory('discussion'); setIsCreating(false)
      return { prev, qKey }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
    onSettled: () => queryClient.invalidateQueries(['company-feed', 'posts']),
  })

  const deletePostMut = useMutation(companyFeedService.deletePost, {
    onMutate: async (id) => {
      await queryClient.cancelQueries(['company-feed', 'posts'])
      const qKey = ['company-feed', 'posts', categoryFilter]
      const prev = queryClient.getQueryData(qKey)
      queryClient.setQueryData(qKey, (old: any) => ({
        ...old, posts: (old?.posts || []).filter((p: Post) => p.id !== id),
      }))
      if (selectedPost?.id === id) setSelectedPost(null)
      return { prev, qKey }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
    onSettled: () => queryClient.invalidateQueries(['company-feed', 'posts']),
  })

  const pinPostMut = useMutation(
    ({ id, pin }: { id: string; pin: boolean }) => companyFeedService.pinPost(id, pin),
    {
      onMutate: async ({ id, pin }) => {
        await queryClient.cancelQueries(['company-feed', 'posts'])
        const qKey = ['company-feed', 'posts', categoryFilter]
        const prev = queryClient.getQueryData(qKey)
        queryClient.setQueryData(qKey, (old: any) => ({
          ...old, posts: (old?.posts || []).map((p: Post) => p.id === id ? { ...p, is_pinned: pin ? 1 : 0 } : p),
        }))
        return { prev, qKey }
      },
      onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
      onSettled: () => queryClient.invalidateQueries(['company-feed', 'posts']),
    }
  )

  const toggleReactionMut = useMutation(companyFeedService.toggleReaction, {
    onMutate: async (postId) => {
      await queryClient.cancelQueries(['company-feed', 'posts'])
      const qKey = ['company-feed', 'posts', categoryFilter]
      const prev = queryClient.getQueryData(qKey)
      queryClient.setQueryData(qKey, (old: any) => ({
        ...old, posts: (old?.posts || []).map((p: Post) => p.id === postId ? {
          ...p,
          user_reacted: p.user_reacted ? 0 : 1,
          reaction_count: p.user_reacted ? p.reaction_count - 1 : p.reaction_count + 1,
        } : p),
      }))
      return { prev, qKey }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(ctx.qKey, ctx.prev) },
    onSettled: () => queryClient.invalidateQueries(['company-feed', 'posts']),
  })

  // ── Comment Mutations (Optimistic) ──
  const createCommentMut = useMutation(
    (content: string) => companyFeedService.createComment(selectedPost!.id, content),
    {
      onMutate: async (content) => {
        const postId = selectedPost?.id
        if (!postId) return
        await queryClient.cancelQueries(['company-feed', 'comments', postId])
        const cKey = ['company-feed', 'comments', postId]
        const prevComments = queryClient.getQueryData(cKey)
        const optimisticComment: Comment = {
          id: `temp-${Date.now()}`, post_id: postId, author_id: user?.id || '',
          content, created_at: new Date().toISOString(),
          author_name: user?.name || '', author_role: user?.role || '',
        }
        queryClient.setQueryData(cKey, (old: any) => [...(old || []), optimisticComment])
        // Also update comment count in posts
        const pKey = ['company-feed', 'posts', categoryFilter]
        const prevPosts = queryClient.getQueryData(pKey)
        queryClient.setQueryData(pKey, (old: any) => ({
          ...old, posts: (old?.posts || []).map((p: Post) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p),
        }))
        setCommentInput('')
        return { prevComments, cKey, prevPosts, pKey }
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prevComments) queryClient.setQueryData(ctx.cKey, ctx.prevComments)
        if (ctx?.prevPosts) queryClient.setQueryData(ctx.pKey, ctx.prevPosts)
      },
      onSettled: () => {
        queryClient.invalidateQueries(['company-feed', 'comments', selectedPost?.id])
        queryClient.invalidateQueries(['company-feed', 'posts'])
      },
    }
  )

  const deleteCommentMut = useMutation(
    (commentId: string) => companyFeedService.deleteComment(selectedPost!.id, commentId),
    {
      onMutate: async (commentId) => {
        const postId = selectedPost?.id
        if (!postId) return
        await queryClient.cancelQueries(['company-feed', 'comments', postId])
        const cKey = ['company-feed', 'comments', postId]
        const prevComments = queryClient.getQueryData(cKey)
        queryClient.setQueryData(cKey, (old: any) => (old || []).filter((c: Comment) => c.id !== commentId))
        const pKey = ['company-feed', 'posts', categoryFilter]
        const prevPosts = queryClient.getQueryData(pKey)
        queryClient.setQueryData(pKey, (old: any) => ({
          ...old, posts: (old?.posts || []).map((p: Post) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p),
        }))
        return { prevComments, cKey, prevPosts, pKey }
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prevComments) queryClient.setQueryData(ctx.cKey, ctx.prevComments)
        if (ctx?.prevPosts) queryClient.setQueryData(ctx.pKey, ctx.prevPosts)
      },
      onSettled: () => {
        queryClient.invalidateQueries(['company-feed', 'comments', selectedPost?.id])
        queryClient.invalidateQueries(['company-feed', 'posts'])
      },
    }
  )

  // ── Handlers ──
  const handleCreatePost = useCallback(() => {
    if (!newPostContent.trim()) return
    createPostMut.mutate({ category: newPostCategory, title: newPostTitle.trim() || undefined, content: newPostContent.trim() })
  }, [newPostContent, newPostCategory, newPostTitle, createPostMut])

  const handleSendComment = () => {
    const val = commentInput.trim()
    if (!val || !selectedPost) return
    createCommentMut.mutate(val)
  }

  // ── Selected date info ──
  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] || []) : []
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null
  const selectedDayOfWeek = selectedDateObj ? selectedDateObj.getDay() : 0
  const selectedDay = selectedDateObj ? selectedDateObj.getDate() : 0
  const selectedMonth = selectedDateObj ? selectedDateObj.getMonth() : 0
  const selectedYear = selectedDateObj ? selectedDateObj.getFullYear() : 0

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <Container size="xl" py="md">
      {/* ── Tabs Header ── */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md" mb="md">
        <Tabs.List grow style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderRadius: 12,
          padding: 4,
        }}>
          <Tabs.Tab
            value="calendar"
            leftSection={<TbCalendarEvent size={18} />}
            style={{ fontWeight: 600, fontSize: 14, borderRadius: 10, padding: '10px 20px' }}
          >
            ปฏิทิน
          </Tabs.Tab>
          <Tabs.Tab
            value="feed"
            leftSection={<TbSpeakerphone size={18} />}
            style={{ fontWeight: 600, fontSize: 14, borderRadius: 10, padding: '10px 20px' }}
          >
            ประกาศ / โพส
          </Tabs.Tab>
        </Tabs.List>

        {/* ═══════════════════════════════════════
             TAB 1: CALENDAR
           ═══════════════════════════════════════ */}
        <Tabs.Panel value="calendar" pt="md">
          <Card padding={0} radius="lg" withBorder style={{ overflow: 'hidden' }}>
            {/* Calendar Header */}
            <Group
              justify="space-between"
              px="md"
              py="sm"
              style={{
                borderBottom: '2px solid var(--mantine-color-gray-2)',
                background: 'linear-gradient(135deg, rgba(66, 99, 235, 0.03), rgba(255, 255, 255, 1))',
              }}
            >
              <Group gap="sm">
                <TbCalendarEvent size={24} color="var(--mantine-color-blue-6)" />
                <Title order={3} style={{ letterSpacing: '-0.3px' }}>
                  {THAI_MONTHS_FULL[calendarDate.getMonth()]} {calendarDate.getFullYear() + 543}
                </Title>
              </Group>
              <Group gap="xs">
                <Tooltip label="รีเฟรชข้อมูล" withArrow>
                  <ActionIcon
                    variant="light" size="md" radius="xl" color="gray"
                    onClick={() => {
                      queryClient.invalidateQueries(['company-feed'])
                      queryClient.invalidateQueries(['holidays'])
                    }}
                  >
                    <TbRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon variant="light" onClick={prevMonth} size="md" radius="xl">
                  <TbChevronLeft size={18} />
                </ActionIcon>
                <Button variant="subtle" size="xs" radius="md" onClick={goToday} fw={600}>
                  วันนี้
                </Button>
                <ActionIcon variant="light" onClick={nextMonth} size="md" radius="xl">
                  <TbChevronRight size={18} />
                </ActionIcon>
                <Button
                  variant="gradient" gradient={{ from: 'orange', to: '#ff6b35' }}
                  size="xs" leftSection={<TbPlus size={14} />}
                  onClick={openEventModal} radius="md" ml="sm"
                >
                  เพิ่มอีเวนต์
                </Button>
              </Group>
            </Group>

            {/* Day-of-week header */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--mantine-color-gray-2)',
              backgroundColor: 'var(--mantine-color-gray-0)',
            }}>
              {THAI_DAYS.map((d, i) => (
                <Text key={d} size="sm" fw={700} ta="center" py={8}
                  c={i === 0 ? 'red.5' : i === 6 ? 'blue.5' : 'dimmed'}
                  style={{ borderRight: i < 6 ? '1px solid var(--mantine-color-gray-2)' : undefined }}
                >
                  {d}
                </Text>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              gridAutoRows: 'minmax(100px, auto)',
            }}>
              {calendarDays.map((day, i) => {
                const isLastCol = (i + 1) % 7 === 0
                const dayOfWeek = i % 7

                if (day === null) {
                  return (
                    <div key={`e-${i}`} style={{
                      borderRight: !isLastCol ? '1px solid var(--mantine-color-gray-2)' : undefined,
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                    }} />
                  )
                }

                const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = eventsByDate[dateStr] || []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const maxVisible = 3
                const moreCount = dayEvents.length - maxVisible

                return (
                  <div key={i} onClick={() => setSelectedDate(dateStr)}
                    style={{
                      borderRight: !isLastCol ? '1px solid var(--mantine-color-gray-2)' : undefined,
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                      padding: '4px 5px 6px', minHeight: 100,
                      backgroundColor: isSelected ? 'rgba(66, 99, 235, 0.06)' : isToday ? 'rgba(66, 99, 235, 0.02)' : undefined,
                      outline: isSelected ? '2px solid var(--mantine-color-blue-4)' : undefined,
                      outlineOffset: '-2px', borderRadius: isSelected ? 4 : undefined,
                      cursor: 'pointer', transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: '50%', fontSize: 13,
                        fontWeight: isToday ? 700 : 500,
                        background: isToday ? '#4263eb' : 'transparent',
                        color: isToday ? 'white'
                          : dayOfWeek === 0 ? 'var(--mantine-color-red-5)'
                            : dayOfWeek === 6 ? 'var(--mantine-color-blue-5)'
                              : 'var(--mantine-color-dark-6)',
                        marginLeft: 2,
                      }}>
                        {day}
                      </span>
                    </div>
                    <Stack gap={2}>
                      {dayEvents.slice(0, maxVisible).map(ev => (
                        <Tooltip key={ev.id} label={ev.title} withArrow openDelay={200}>
                          <div style={{
                            backgroundColor: ev.color || '#4263eb', color: 'white',
                            fontSize: 10, lineHeight: '16px', padding: '1px 6px',
                            borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', fontWeight: 500,
                          }}>
                            {ev.title}
                          </div>
                        </Tooltip>
                      ))}
                      {moreCount > 0 && (
                        <Text size="10px" c="blue" fw={600} style={{ lineHeight: '14px', paddingLeft: 4 }}>
                          +{moreCount} เพิ่มเติม
                        </Text>
                      )}
                    </Stack>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Selected Date Detail */}
          {selectedDate && (
            <Card padding="lg" radius="lg" withBorder mt="md" style={{
              borderColor: 'var(--mantine-color-blue-2)',
              background: 'linear-gradient(135deg, rgba(66, 99, 235, 0.02), rgba(255, 255, 255, 1))',
            }}>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, #4263eb, #228be6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: 20,
                  }}>
                    {selectedDay}
                  </div>
                  <div>
                    <Text fw={700} size="lg">
                      {THAI_DAYS_FULL[selectedDayOfWeek]}ที่ {selectedDay} {THAI_MONTHS_FULL[selectedMonth]} {selectedYear + 543}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedDateEvents.length > 0 ? `${selectedDateEvents.length} อีเวนต์` : 'ไม่มีอีเวนต์'}
                      {selectedDate === todayStr && ' · วันนี้'}
                    </Text>
                  </div>
                </Group>
                <Button variant="light" size="xs" leftSection={<TbPlus size={14} />}
                  onClick={() => { setNewEvent(prev => ({ ...prev, event_date: selectedDate })); openEventModal() }}
                  radius="md"
                >
                  เพิ่มอีเวนต์วันนี้
                </Button>
              </Group>

              {selectedDateEvents.length === 0 ? (
                <Card padding="xl" radius="md" withBorder style={{ border: '1px dashed var(--mantine-color-gray-3)' }}>
                  <Stack align="center" gap="xs">
                    <TbCalendarEvent size={40} color="var(--mantine-color-gray-4)" />
                    <Text c="dimmed" size="sm">ไม่มีอีเวนต์ในวันนี้</Text>
                  </Stack>
                </Card>
              ) : (
                <Stack gap="sm">
                  {selectedDateEvents.map(ev => {
                    const type = EVENT_TYPE_MAP[ev.event_type] || EVENT_TYPE_MAP.other
                    return (
                      <Card key={ev.id} padding="md" radius="md" withBorder style={{ borderLeft: `4px solid ${ev.color || type.color}` }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              backgroundColor: `${ev.color || type.color}20`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                            }}>
                              {type.emoji}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Text fw={600} size="sm" lineClamp={1}>{ev.title}</Text>
                              {ev.description && <Text size="xs" c="dimmed" lineClamp={2}>{ev.description}</Text>}
                              <Group gap={8} mt={4} wrap="wrap">
                                <Group gap={4}>
                                  <TbClock size={12} color="var(--mantine-color-dimmed)" />
                                  <Text size="xs" c="dimmed">
                                    {ev.is_all_day ? 'ทั้งวัน' : `${ev.start_time?.slice(0, 5) || ''} - ${ev.end_time?.slice(0, 5) || ''}`}
                                    {' · '}{type.label}
                                  </Text>
                                </Group>
                                {ev.location && (
                                  <Group gap={4}>
                                    <TbMapPin size={12} color="var(--mantine-color-dimmed)" />
                                    <Text size="xs" c="dimmed" lineClamp={1}>{ev.location}</Text>
                                  </Group>
                                )}
                              </Group>
                            </div>
                          </Group>
                          {!ev.id.startsWith('holiday-') && (
                            <Tooltip label="ลบอีเวนต์" withArrow>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteEventMut.mutate(ev.id)}>
                                <TbTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Card>
          )}
        </Tabs.Panel>

        {/* ═══════════════════════════════════════
             TAB 2: SOCIAL FEED — 2 Column Layout
           ═══════════════════════════════════════ */}
        <Tabs.Panel value="feed" pt="md">
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedPost ? '1fr 380px' : '1fr',
            gap: 16,
            alignItems: 'start',
            transition: 'grid-template-columns 0.2s ease',
          }}>
            {/* ── LEFT: Posts Feed ── */}
            <Stack gap="md">
              {/* Create Post */}
              <Card padding="lg" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
                <Group gap="sm" mb={isCreating ? 'sm' : 0} onClick={() => !isCreating && setIsCreating(true)} style={{ cursor: isCreating ? 'default' : 'pointer' }}>
                  <Avatar size={40} radius="xl" color={getAvatarColor(user?.name || '')}>
                    {getInitials(user?.name || '')}
                  </Avatar>
                  {!isCreating ? (
                    <Paper p="xs" px="md" radius="xl" withBorder style={{ flex: 1, cursor: 'pointer', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Text size="sm" c="dimmed">คุณกำลังคิดอะไรอยู่...?</Text>
                    </Paper>
                  ) : (
                    <Text fw={600} size="sm">สร้างโพสใหม่</Text>
                  )}
                </Group>
                <Collapse in={isCreating}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Select size="xs" value={newPostCategory}
                        onChange={v => setNewPostCategory(v || 'discussion')}
                        data={[
                          { value: 'discussion', label: '💬 สนทนา' },
                          { value: 'news', label: '📰 ข่าวสาร' },
                          { value: 'announcement', label: '📢 ประกาศ' },
                        ]}
                        style={{ width: 140 }} radius="md"
                      />
                      <TextInput size="xs" placeholder="หัวข้อ (ไม่บังคับ)"
                        value={newPostTitle} onChange={e => setNewPostTitle(e.currentTarget.value)}
                        style={{ flex: 1 }} radius="md"
                      />
                    </Group>
                    <Textarea placeholder="เขียนอะไรสักหน่อย..." value={newPostContent}
                      onChange={e => setNewPostContent(e.currentTarget.value)}
                      minRows={3} autosize radius="md"
                    />
                    <Group justify="flex-end" gap="xs">
                      <Button variant="subtle" size="xs" color="gray" onClick={() => { setIsCreating(false); setNewPostContent(''); setNewPostTitle('') }}>ยกเลิก</Button>
                      <Button size="xs" leftSection={<TbSend size={14} />} onClick={handleCreatePost}
                        loading={createPostMut.isLoading} disabled={!newPostContent.trim()}
                        radius="md" variant="gradient" gradient={{ from: 'orange', to: '#ff6b35' }}
                      >
                        โพส
                      </Button>
                    </Group>
                  </Stack>
                </Collapse>
              </Card>

              {/* Category Filter */}
              <Group gap="xs" align="center">
                <SegmentedControl
                  value={categoryFilter} onChange={setCategoryFilter}
                  data={[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'announcement', label: '📢 ประกาศ' },
                    { value: 'news', label: '📰 ข่าวสาร' },
                    { value: 'discussion', label: '💬 สนทนา' },
                  ]}
                  radius="md" size="xs" style={{ flex: 1 }}
                />
                <Tooltip label="รีเฟรชข้อมูล" withArrow>
                  <ActionIcon
                    variant="light" size="md" radius="xl" color="gray"
                    onClick={() => {
                      queryClient.invalidateQueries(['company-feed', 'posts'])
                    }}
                  >
                    <TbRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              {/* Pinned Posts */}
              {pinnedPosts.length > 0 && (
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">📌 ประกาศปักหมุด</Text>
                  {pinnedPosts.map(post => (
                    <FeedPostCard
                      key={post.id} post={post} isAdmin={isAdmin}
                      currentUserId={user?.id || ''} isPinned
                      isActive={selectedPost?.id === post.id}
                      onSelect={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                      onDelete={id => deletePostMut.mutate(id)}
                      onPin={(id, pin) => pinPostMut.mutate({ id, pin })}
                      onReact={id => toggleReactionMut.mutate(id)}
                    />
                  ))}
                </Stack>
              )}

              {/* Loading */}
              {loadingPosts && <Center py="xl"><Loader size="md" /></Center>}

              {/* Empty */}
              {!loadingPosts && regularPosts.length === 0 && pinnedPosts.length === 0 && (
                <Card padding="xl" radius="lg" withBorder>
                  <Center>
                    <Stack align="center" gap="xs">
                      <TbMessageCircle size={48} color="var(--mantine-color-gray-4)" />
                      <Text c="dimmed" size="sm">ยังไม่มีโพส — เริ่มโพสแรกของคุณเลย!</Text>
                    </Stack>
                  </Center>
                </Card>
              )}

              {/* Regular Posts */}
              {regularPosts.map(post => (
                <FeedPostCard
                  key={post.id} post={post} isAdmin={isAdmin}
                  currentUserId={user?.id || ''} isPinned={false}
                  isActive={selectedPost?.id === post.id}
                  onSelect={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                  onDelete={id => deletePostMut.mutate(id)}
                  onPin={(id, pin) => pinPostMut.mutate({ id, pin })}
                  onReact={id => toggleReactionMut.mutate(id)}
                />
              ))}
            </Stack>

            {/* ── RIGHT: Comments Panel (sticky) ── */}
            {selectedPost && (
              <Card
                padding={0}
                radius="lg"
                withBorder
                style={{
                  position: 'sticky',
                  top: 16,
                  borderColor: 'var(--mantine-color-blue-3)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 120px)',
                }}
              >
                {/* Panel Header */}
                <Group justify="space-between" px="md" py="sm" style={{
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  background: 'linear-gradient(135deg, rgba(66, 99, 235, 0.04), rgba(255, 255, 255, 1))',
                }}>
                  <Group gap="sm">
                    <TbMessageCircle size={18} color="var(--mantine-color-blue-6)" />
                    <Text fw={700} size="sm">ความคิดเห็น</Text>
                    <Badge size="xs" variant="light" circle>{allComments.length}</Badge>
                  </Group>
                  <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setSelectedPost(null)}>
                    <TbX size={16} />
                  </ActionIcon>
                </Group>

                {/* Post preview */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--mantine-color-gray-2)', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                  <Group gap="xs" mb={4}>
                    <Avatar size={24} radius="xl" color={getAvatarColor(selectedPost.author_name)}>
                      {getInitials(selectedPost.author_name)}
                    </Avatar>
                    <Text size="xs" fw={600}>{selectedPost.author_name}</Text>
                    <Text size="xs" c="dimmed">· {timeAgo(selectedPost.created_at)}</Text>
                  </Group>
                  {selectedPost.title && <Text size="sm" fw={600} lineClamp={1}>{selectedPost.title}</Text>}
                  <Text size="xs" c="dimmed" lineClamp={2}>{selectedPost.content}</Text>
                </div>

                {/* Comments list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {loadingComments ? (
                    <Center py="lg"><Loader size="sm" /></Center>
                  ) : latestComments.length === 0 ? (
                    <Center py="lg">
                      <Stack align="center" gap={4}>
                        <TbMessageCircle size={28} color="var(--mantine-color-gray-4)" />
                        <Text size="xs" c="dimmed">ยังไม่มีความคิดเห็น</Text>
                      </Stack>
                    </Center>
                  ) : (
                    <Stack gap="sm">
                      {allComments.length > 4 && (
                        <Text size="xs" c="dimmed" ta="center" mb={4}>
                          แสดง 4 ความคิดเห็นล่าสุด จากทั้งหมด {allComments.length}
                        </Text>
                      )}
                      {latestComments.map((c: Comment) => (
                        <Group key={c.id} gap="xs" wrap="nowrap" align="flex-start">
                          <Avatar size={28} radius="xl" color={getAvatarColor(c.author_name)}>
                            {getInitials(c.author_name)}
                          </Avatar>
                          <Paper px="sm" py={6} radius="lg" style={{ backgroundColor: 'var(--mantine-color-gray-0)', flex: 1 }}>
                            <Group justify="space-between" wrap="nowrap">
                              <Text size="xs" fw={600}>{c.author_name}</Text>
                              {(c.author_id === user?.id || isAdmin) && (
                                <ActionIcon size={16} variant="subtle" color="red" onClick={() => deleteCommentMut.mutate(c.id)}>
                                  <TbTrash size={10} />
                                </ActionIcon>
                              )}
                            </Group>
                            <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</Text>
                            <Text size="10px" c="dimmed" mt={2}>{timeAgo(c.created_at)}</Text>
                          </Paper>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </div>

                {/* Comment input */}
                <div style={{
                  padding: '10px 16px',
                  borderTop: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: 'white',
                }}>
                  <Group gap="xs" wrap="nowrap">
                    <Avatar size={28} radius="xl" color={getAvatarColor(user?.name || '')}>
                      {getInitials(user?.name || '')}
                    </Avatar>
                    <Textarea
                      placeholder="เขียนความคิดเห็น..."
                      value={commentInput}
                      onChange={e => setCommentInput(e.currentTarget.value)}
                      size="xs" radius="xl" autosize minRows={1}
                      style={{ flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                    />
                    <ActionIcon
                      size="sm" variant="gradient" gradient={{ from: 'orange', to: '#ff6b35' }}
                      onClick={handleSendComment}
                      loading={createCommentMut.isLoading}
                      disabled={!commentInput.trim()}
                      radius="xl"
                    >
                      <TbSend size={12} />
                    </ActionIcon>
                  </Group>
                </div>
              </Card>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* ── Event Creation Modal (Google Calendar Style) ── */}
      <Modal
        opened={eventModalOpened}
        onClose={() => { closeEventModal(); setNewEvent(defaultEvent) }}
        title={
          <Group gap="sm">
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: newEvent.color }} />
            <Text fw={700} size="lg">เพิ่มอีเวนต์ใหม่</Text>
          </Group>
        }
        radius="lg"
        centered
        size="lg"
        styles={{ body: { padding: '8px 24px 24px' } }}
      >
        <Stack gap="md">
          {/* Title — large input like Google Calendar */}
          <TextInput
            placeholder="เพิ่มชื่ออีเวนต์"
            value={newEvent.title}
            onChange={e => setNewEvent(prev => ({ ...prev, title: e.currentTarget.value }))}
            required
            size="lg"
            variant="unstyled"
            styles={{
              input: {
                fontSize: 22, fontWeight: 600, borderBottom: '2px solid var(--mantine-color-blue-4)',
                borderRadius: 0, paddingBottom: 8, paddingLeft: 0,
              }
            }}
          />

          {/* Event Type tabs */}
          <SegmentedControl
            value={newEvent.event_type}
            onChange={v => setNewEvent(prev => ({ ...prev, event_type: v }))}
            data={[
              { value: 'meeting', label: '🤝 ประชุม' },
              { value: 'holiday', label: '🧾 เกี่ยวกับภาษี' },
              { value: 'deadline', label: '⏰ กำหนดส่ง' },
              { value: 'other', label: '📌 อื่นๆ' },
            ]}
            size="xs" radius="md" fullWidth
          />

          <Divider />

          {/* Date & Time Section */}
          <div>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <TbClock size={18} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">วันที่และเวลา</Text>
              </Group>
              <Switch
                label="ทั้งวัน"
                checked={newEvent.is_all_day}
                onChange={e => setNewEvent(prev => ({ ...prev, is_all_day: e.currentTarget.checked }))}
                size="xs"
              />
            </Group>

            <Group gap="sm" grow>
              <TextInput
                label="วันที่เริ่มต้น"
                type="date"
                value={newEvent.event_date}
                onChange={e => setNewEvent(prev => ({ ...prev, event_date: e.currentTarget.value }))}
                required
                size="sm" radius="md"
              />
              <TextInput
                label="วันที่สิ้นสุด"
                type="date"
                value={newEvent.event_end_date}
                onChange={e => setNewEvent(prev => ({ ...prev, event_end_date: e.currentTarget.value }))}
                placeholder="ไม่บังคับ"
                size="sm" radius="md"
              />
            </Group>

            {!newEvent.is_all_day && (
              <Group gap="sm" grow mt="xs">
                <TextInput
                  label="เวลาเริ่ม"
                  type="time"
                  value={newEvent.start_time}
                  onChange={e => setNewEvent(prev => ({ ...prev, start_time: e.currentTarget.value }))}
                  size="sm" radius="md"
                />
                <TextInput
                  label="เวลาสิ้นสุด"
                  type="time"
                  value={newEvent.end_time}
                  onChange={e => setNewEvent(prev => ({ ...prev, end_time: e.currentTarget.value }))}
                  size="sm" radius="md"
                />
              </Group>
            )}
          </div>

          <Divider />

          {/* Location */}
          <TextInput
            label={
              <Group gap={6}>
                <TbMapPin size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">สถานที่</Text>
              </Group>
            }
            placeholder="เพิ่มสถานที่ หรือลิงก์วิดีโอคอล"
            value={newEvent.location}
            onChange={e => setNewEvent(prev => ({ ...prev, location: e.currentTarget.value }))}
            size="sm" radius="md"
          />

          {/* Description */}
          <Textarea
            label={
              <Group gap={6}>
                <TbMessage2 size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">รายละเอียด</Text>
              </Group>
            }
            placeholder="เพิ่มรายละเอียด, วาระการประชุม, หรือบันทึกอื่นๆ"
            value={newEvent.description}
            onChange={e => setNewEvent(prev => ({ ...prev, description: e.currentTarget.value }))}
            minRows={3} autosize radius="md" size="sm"
          />

          <Divider />

          {/* Color Picker */}
          <div>
            <Text fw={600} size="sm" mb={6}>สีอีเวนต์</Text>
            <Group gap="xs">
              {[
                { value: '#4263eb', label: 'น้ำเงิน' },
                { value: '#e03131', label: 'แดง' },
                { value: '#2f9e44', label: 'เขียว' },
                { value: '#f59f00', label: 'เหลือง' },
                { value: '#7048e8', label: 'ม่วง' },
                { value: '#e64980', label: 'ชมพู' },
                { value: '#0ca678', label: 'เขียวมิ้นต์' },
                { value: '#868e96', label: 'เทา' },
              ].map(c => (
                <Tooltip key={c.value} label={c.label} withArrow openDelay={200}>
                  <div
                    onClick={() => setNewEvent(prev => ({ ...prev, color: c.value }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: c.value, cursor: 'pointer',
                      outline: newEvent.color === c.value ? `3px solid ${c.value}` : '2px solid transparent',
                      outlineOffset: 2,
                      transition: 'outline 0.15s ease',
                    }}
                  />
                </Tooltip>
              ))}
            </Group>
          </div>

          {/* Submit */}
          <Button
            fullWidth size="md" radius="md"
            onClick={() => createEventMut.mutate({
              title: newEvent.title,
              description: newEvent.description || undefined,
              event_date: newEvent.event_date,
              event_end_date: newEvent.event_end_date || undefined,
              start_time: newEvent.is_all_day ? undefined : newEvent.start_time || undefined,
              end_time: newEvent.is_all_day ? undefined : newEvent.end_time || undefined,
              is_all_day: newEvent.is_all_day,
              location: newEvent.location || undefined,
              event_type: newEvent.event_type,
              color: newEvent.color,
            })}
            loading={createEventMut.isLoading}
            disabled={!newEvent.title || !newEvent.event_date}
            variant="gradient" gradient={{ from: 'orange', to: '#ff6b35' }}
            leftSection={<TbCalendarEvent size={18} />}
          >
            บันทึกอีเวนต์
          </Button>
        </Stack>
      </Modal>
    </Container>
  )
}

// ═══════════════════════════════════════════════════════
//  Feed Post Card — compact card in feed list
// ═══════════════════════════════════════════════════════
interface FeedPostCardProps {
  post: Post
  currentUserId: string
  isAdmin: boolean
  isPinned: boolean
  isActive: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  onPin: (id: string, pin: boolean) => void
  onReact: (id: string) => void
}

function FeedPostCard({
  post, currentUserId, isAdmin, isPinned, isActive,
  onSelect, onDelete, onPin, onReact
}: FeedPostCardProps) {
  const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.discussion
  const isOwn = post.author_id === currentUserId

  return (
    <Card
      padding="lg" radius="lg" withBorder
      style={{
        borderColor: isActive
          ? 'var(--mantine-color-blue-4)'
          : isPinned ? 'var(--mantine-color-yellow-4)' : undefined,
        background: isActive
          ? 'linear-gradient(135deg, rgba(66, 99, 235, 0.04), rgba(255, 255, 255, 1))'
          : isPinned ? 'linear-gradient(135deg, rgba(255,244,230,0.5), rgba(255,255,255,1))' : undefined,
        boxShadow: isActive ? '0 0 0 1px var(--mantine-color-blue-3)' : undefined,
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar size={40} radius="xl" color={getAvatarColor(post.author_name)}>
            {getInitials(post.author_name)}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Group gap={6} wrap="nowrap">
              <Text fw={600} size="sm" lineClamp={1}>{post.author_name}</Text>
              <Badge size="xs" variant="light" color={cat.color}>{cat.label}</Badge>
              {isPinned && <TbPinFilled size={14} color="var(--mantine-color-yellow-6)" />}
            </Group>
            <Text size="xs" c="dimmed">{timeAgo(post.created_at)}</Text>
          </div>
        </Group>

        {(isOwn || isAdmin) && (
          <Menu position="bottom-end" withArrow shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm"><TbDotsVertical size={16} /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {isAdmin && (
                <Menu.Item leftSection={isPinned ? <TbPin size={14} /> : <TbPinFilled size={14} />} onClick={() => onPin(post.id, !isPinned)}>
                  {isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                </Menu.Item>
              )}
              <Menu.Item leftSection={<TbTrash size={14} />} color="red" onClick={() => onDelete(post.id)}>ลบ</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      {/* Content */}
      {post.title && <Text fw={600} mb={4}>{post.title}</Text>}
      <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</Text>
      <Divider mb="xs" />

      {/* Actions */}
      <Group gap="lg">
        <Tooltip label={post.user_reacted ? 'ยกเลิกถูกใจ' : 'ถูกใจ'}>
          <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => onReact(post.id)}>
            {post.user_reacted ? <TbHeartFilled size={18} color="var(--mantine-color-red-6)" /> : <TbHeart size={18} />}
            <Text size="xs" c={post.user_reacted ? 'red' : 'dimmed'}>{post.reaction_count || ''}</Text>
          </Group>
        </Tooltip>
        <Tooltip label="ความคิดเห็น">
          <Group gap={4} style={{ cursor: 'pointer' }} onClick={onSelect}>
            <TbMessageCircle size={18} color={isActive ? 'var(--mantine-color-blue-6)' : undefined} />
            <Text size="xs" c={isActive ? 'blue' : 'dimmed'} fw={isActive ? 600 : undefined}>
              {post.comment_count || ''} {isActive ? '' : ''}
            </Text>
          </Group>
        </Tooltip>
      </Group>
    </Card>
  )
}
