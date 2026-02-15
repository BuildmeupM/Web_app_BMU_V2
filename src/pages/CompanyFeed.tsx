/**
 * CompanyFeed — โพสประกาศ & สนทนา
 * Social feed page with posts, comments, and reactions
 */

import { useState, useMemo, useCallback } from 'react'
import {
    Container, Card, Group, Stack, Text, Title, Badge, Avatar,
    Button, Textarea, ActionIcon, Tooltip, Paper, Divider, Collapse,
    Select, Loader, Center, TextInput,
    SegmentedControl, Menu
} from '@mantine/core'
import {
    TbSend, TbHeart, TbHeartFilled, TbMessageCircle, TbPin, TbPinFilled,
    TbTrash, TbDotsVertical, TbSpeakerphone, TbNews,
    TbMessage2
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { companyFeedService, type Post, type Comment } from '../services/companyFeedService'

// ─── Helpers ────────────────────────────────────────
const CATEGORY_MAP: Record<string, { label: string; color: string; icon: typeof TbSpeakerphone }> = {
    announcement: { label: 'ประกาศ', color: 'red', icon: TbSpeakerphone },
    news: { label: 'ข่าวสาร', color: 'blue', icon: TbNews },
    discussion: { label: 'สนทนา', color: 'grape', icon: TbMessage2 },
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

// ═══════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════
export default function CompanyFeed() {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const isAdmin = user?.role === 'admin'

    // ── State ──
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [newPostContent, setNewPostContent] = useState('')
    const [newPostCategory, setNewPostCategory] = useState<string>('discussion')
    const [newPostTitle, setNewPostTitle] = useState('')
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
    const [isCreating, setIsCreating] = useState(false)

    // ── Queries ──
    const { data: postsData, isLoading: loadingPosts } = useQuery(
        ['company-feed', 'posts', categoryFilter],
        () => companyFeedService.getPosts({ category: categoryFilter !== 'all' ? categoryFilter : undefined, limit: 50 }),
        { staleTime: 30_000 }
    )

    const posts = postsData?.posts || []
    const pinnedPosts = useMemo(() => posts.filter(p => p.is_pinned), [posts])
    const regularPosts = useMemo(() => posts.filter(p => !p.is_pinned), [posts])

    // ── Mutations ──
    const createPostMut = useMutation(companyFeedService.createPost, {
        onSuccess: () => {
            queryClient.invalidateQueries(['company-feed', 'posts'])
            setNewPostContent('')
            setNewPostTitle('')
            setNewPostCategory('discussion')
            setIsCreating(false)
        }
    })

    const deletePostMut = useMutation(companyFeedService.deletePost, {
        onSuccess: () => queryClient.invalidateQueries(['company-feed', 'posts'])
    })

    const pinPostMut = useMutation(
        ({ id, pin }: { id: string; pin: boolean }) => companyFeedService.pinPost(id, pin),
        { onSuccess: () => queryClient.invalidateQueries(['company-feed', 'posts']) }
    )

    const toggleReactionMut = useMutation(companyFeedService.toggleReaction, {
        onSuccess: () => queryClient.invalidateQueries(['company-feed', 'posts'])
    })

    // ── Handlers ──
    const handleCreatePost = useCallback(() => {
        if (!newPostContent.trim()) return
        createPostMut.mutate({
            category: newPostCategory,
            title: newPostTitle.trim() || undefined,
            content: newPostContent.trim()
        })
    }, [newPostContent, newPostCategory, newPostTitle, createPostMut])

    const toggleComments = useCallback((postId: string) => {
        setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }))
    }, [])

    return (
        <Container size="md" py="md">
            {/* ── Header ── */}
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2} style={{ letterSpacing: '-0.5px' }}>
                        💬 โพสและประกาศ
                    </Title>
                    <Text size="sm" c="dimmed">แชร์ข่าวสาร ประกาศ และสนทนากับทีม</Text>
                </div>
            </Group>

            <Stack gap="md">
                {/* ── Create Post Box ── */}
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
                                <Select
                                    size="xs"
                                    value={newPostCategory}
                                    onChange={v => setNewPostCategory(v || 'discussion')}
                                    data={[
                                        { value: 'discussion', label: '💬 สนทนา' },
                                        { value: 'news', label: '📰 ข่าวสาร' },
                                        { value: 'announcement', label: '📢 ประกาศ' },
                                    ]}
                                    style={{ width: 140 }}
                                    radius="md"
                                />
                                <TextInput
                                    size="xs"
                                    placeholder="หัวข้อ (ไม่บังคับ)"
                                    value={newPostTitle}
                                    onChange={e => setNewPostTitle(e.currentTarget.value)}
                                    style={{ flex: 1 }}
                                    radius="md"
                                />
                            </Group>
                            <Textarea
                                placeholder="เขียนอะไรสักหน่อย..."
                                value={newPostContent}
                                onChange={e => setNewPostContent(e.currentTarget.value)}
                                minRows={3}
                                autosize
                                radius="md"
                            />
                            <Group justify="flex-end" gap="xs">
                                <Button variant="subtle" size="xs" color="gray" onClick={() => { setIsCreating(false); setNewPostContent(''); setNewPostTitle('') }}>
                                    ยกเลิก
                                </Button>
                                <Button
                                    size="xs"
                                    leftSection={<TbSend size={14} />}
                                    onClick={handleCreatePost}
                                    loading={createPostMut.isLoading}
                                    disabled={!newPostContent.trim()}
                                    radius="md"
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan' }}
                                >
                                    โพส
                                </Button>
                            </Group>
                        </Stack>
                    </Collapse>
                </Card>

                {/* ── Category Filter ── */}
                <SegmentedControl
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    data={[
                        { value: 'all', label: 'ทั้งหมด' },
                        { value: 'announcement', label: '📢 ประกาศ' },
                        { value: 'news', label: '📰 ข่าวสาร' },
                        { value: 'discussion', label: '💬 สนทนา' },
                    ]}
                    radius="md"
                    size="xs"
                    fullWidth
                />

                {/* ── Pinned Posts ── */}
                {pinnedPosts.length > 0 && (
                    <Stack gap="xs">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">📌 ประกาศปักหมุด</Text>
                        {pinnedPosts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUserId={user?.id || ''}
                                currentUserName={user?.name || ''}
                                isAdmin={isAdmin}
                                isPinned
                                onToggleComments={toggleComments}
                                expandedComments={expandedComments}
                                commentInputs={commentInputs}
                                setCommentInputs={setCommentInputs}
                                onDelete={id => deletePostMut.mutate(id)}
                                onPin={(id, pin) => pinPostMut.mutate({ id, pin })}
                                onReact={id => toggleReactionMut.mutate(id)}
                            />
                        ))}
                    </Stack>
                )}

                {/* ── Loading ── */}
                {loadingPosts && (
                    <Center py="xl">
                        <Loader size="md" />
                    </Center>
                )}

                {/* ── Empty State ── */}
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

                {/* ── Regular Posts ── */}
                {regularPosts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.id || ''}
                        currentUserName={user?.name || ''}
                        isAdmin={isAdmin}
                        isPinned={false}
                        onToggleComments={toggleComments}
                        expandedComments={expandedComments}
                        commentInputs={commentInputs}
                        setCommentInputs={setCommentInputs}
                        onDelete={id => deletePostMut.mutate(id)}
                        onPin={(id, pin) => pinPostMut.mutate({ id, pin })}
                        onReact={id => toggleReactionMut.mutate(id)}
                    />
                ))}
            </Stack>
        </Container>
    )
}

// ═══════════════════════════════════════════════════════
//  Post Card Sub-component
// ═══════════════════════════════════════════════════════
interface PostCardProps {
    post: Post
    currentUserId: string
    currentUserName: string
    isAdmin: boolean
    isPinned: boolean
    onToggleComments: (id: string) => void
    expandedComments: Record<string, boolean>
    commentInputs: Record<string, string>
    setCommentInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
    onDelete: (id: string) => void
    onPin: (id: string, pin: boolean) => void
    onReact: (id: string) => void
}

function PostCard({
    post, currentUserId, currentUserName, isAdmin, isPinned,
    onToggleComments, expandedComments, commentInputs, setCommentInputs,
    onDelete, onPin, onReact
}: PostCardProps) {
    const queryClient = useQueryClient()
    const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.discussion
    const isOwn = post.author_id === currentUserId
    const isExpanded = expandedComments[post.id]

    const { data: comments = [], isLoading: loadingComments } = useQuery(
        ['company-feed', 'comments', post.id],
        () => companyFeedService.getComments(post.id),
        { enabled: !!isExpanded, staleTime: 30_000 }
    )

    const createCommentMut = useMutation(
        (content: string) => companyFeedService.createComment(post.id, content),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['company-feed', 'comments', post.id])
                queryClient.invalidateQueries(['company-feed', 'posts'])
                setCommentInputs(prev => ({ ...prev, [post.id]: '' }))
            }
        }
    )

    const deleteCommentMut = useMutation(
        (commentId: string) => companyFeedService.deleteComment(post.id, commentId),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['company-feed', 'comments', post.id])
                queryClient.invalidateQueries(['company-feed', 'posts'])
            }
        }
    )

    const handleSendComment = () => {
        const val = commentInputs[post.id]?.trim()
        if (!val) return
        createCommentMut.mutate(val)
    }

    return (
        <Card
            padding="lg"
            radius="lg"
            withBorder
            style={{
                borderColor: isPinned ? 'var(--mantine-color-yellow-4)' : undefined,
                background: isPinned
                    ? 'linear-gradient(135deg, rgba(255,244,230,0.5), rgba(255,255,255,1))'
                    : undefined,
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
                            <ActionIcon variant="subtle" color="gray" size="sm">
                                <TbDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {isAdmin && (
                                <Menu.Item
                                    leftSection={isPinned ? <TbPin size={14} /> : <TbPinFilled size={14} />}
                                    onClick={() => onPin(post.id, !isPinned)}
                                >
                                    {isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                                </Menu.Item>
                            )}
                            <Menu.Item
                                leftSection={<TbTrash size={14} />}
                                color="red"
                                onClick={() => onDelete(post.id)}
                            >
                                ลบ
                            </Menu.Item>
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
                    <Group
                        gap={4}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onReact(post.id)}
                    >
                        {post.user_reacted ? (
                            <TbHeartFilled size={18} color="var(--mantine-color-red-6)" />
                        ) : (
                            <TbHeart size={18} />
                        )}
                        <Text size="xs" c={post.user_reacted ? 'red' : 'dimmed'}>
                            {post.reaction_count || ''}
                        </Text>
                    </Group>
                </Tooltip>

                <Group
                    gap={4}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onToggleComments(post.id)}
                >
                    <TbMessageCircle size={18} />
                    <Text size="xs" c="dimmed">{post.comment_count || ''}</Text>
                </Group>
            </Group>

            {/* Comments */}
            <Collapse in={!!isExpanded}>
                <Divider my="xs" />
                <Stack gap="xs">
                    {loadingComments ? (
                        <Center py="xs"><Loader size="xs" /></Center>
                    ) : (
                        comments.map((c: Comment) => (
                            <Group key={c.id} gap="xs" wrap="nowrap" align="flex-start">
                                <Avatar size={28} radius="xl" color={getAvatarColor(c.author_name)}>
                                    {getInitials(c.author_name)}
                                </Avatar>
                                <Paper px="sm" py={4} radius="lg" style={{ backgroundColor: 'var(--mantine-color-gray-0)', flex: 1 }}>
                                    <Text size="xs" fw={600}>{c.author_name}</Text>
                                    <Text size="xs">{c.content}</Text>
                                    <Text size="10px" c="dimmed">{timeAgo(c.created_at)}</Text>
                                </Paper>
                                {(c.author_id === currentUserId || isAdmin) && (
                                    <ActionIcon size="xs" variant="subtle" color="red" onClick={() => deleteCommentMut.mutate(c.id)}>
                                        <TbTrash size={10} />
                                    </ActionIcon>
                                )}
                            </Group>
                        ))
                    )}

                    {/* Comment input */}
                    <Group gap="xs" wrap="nowrap">
                        <Avatar size={28} radius="xl" color={getAvatarColor(currentUserName)}>
                            {getInitials(currentUserName)}
                        </Avatar>
                        <Textarea
                            placeholder="เขียนความคิดเห็น..."
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.currentTarget.value }))}
                            size="xs"
                            radius="xl"
                            autosize
                            minRows={1}
                            style={{ flex: 1 }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendComment()
                                }
                            }}
                        />
                        <ActionIcon
                            size="sm"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                            onClick={handleSendComment}
                            loading={createCommentMut.isLoading}
                            disabled={!commentInputs[post.id]?.trim()}
                            radius="xl"
                        >
                            <TbSend size={12} />
                        </ActionIcon>
                    </Group>
                </Stack>
            </Collapse>
        </Card>
    )
}
