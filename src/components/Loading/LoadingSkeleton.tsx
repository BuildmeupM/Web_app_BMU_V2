import { Skeleton, Stack, Card } from '@mantine/core'

interface LoadingSkeletonProps {
  type?: 'table' | 'list' | 'card' | 'form'
  rows?: number
}

export default function LoadingSkeleton({ type = 'table', rows = 5 }: LoadingSkeletonProps) {
  if (type === 'table') {
    return (
      <Stack gap="xs">
        {/* Table header skeleton */}
        <Skeleton height={40} radius="md" />
        {/* Table rows skeleton */}
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} height={50} radius="md" />
        ))}
      </Stack>
    )
  }

  if (type === 'list') {
    return (
      <Stack gap="md">
        {Array.from({ length: rows }).map((_, index) => (
          <Card key={index} padding="md" radius="md" withBorder>
            <Skeleton height={20} radius="md" mb="xs" width="60%" />
            <Skeleton height={16} radius="md" width="40%" />
          </Card>
        ))}
      </Stack>
    )
  }

  if (type === 'card') {
    return (
      <Card padding="md" radius="md" withBorder>
        <Skeleton height={24} radius="md" mb="md" width="50%" />
        <Skeleton height={16} radius="md" mb="xs" />
        <Skeleton height={16} radius="md" mb="xs" width="80%" />
        <Skeleton height={16} radius="md" width="60%" />
      </Card>
    )
  }

  if (type === 'form') {
    return (
      <Stack gap="md">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index}>
            <Skeleton height={16} radius="md" mb="xs" width="30%" />
            <Skeleton height={36} radius="md" />
          </div>
        ))}
      </Stack>
    )
  }

  return null
}
