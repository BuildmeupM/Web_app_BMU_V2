/**
 * FeedPostCard — compact card in feed list
 */
import {
  Card, Group, Text, Badge, Avatar, ActionIcon, Tooltip, Divider, Menu,
} from '@mantine/core'
import {
  TbHeart, TbHeartFilled, TbMessageCircle, TbPin, TbPinFilled,
  TbTrash, TbDotsVertical,
} from 'react-icons/tb'
import type { Post } from '../../services/companyFeedService'
import { CATEGORY_MAP, timeAgo, getInitials, getAvatarColor } from './constants'

export interface FeedPostCardProps {
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

export default function FeedPostCard({
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
