/**
 * FilterBar — Reusable filter container with refresh/reset actions
 * Wraps filter inputs in a consistent Card layout
 */

import { Card, Stack, Group, Button, Text, Badge } from '@mantine/core'
import { TbRefresh, TbFilter } from 'react-icons/tb'

export interface FilterBarProps {
  /** Filter inputs — rendered inside Grid or Group */
  children: React.ReactNode
  /** Title (default: กรองข้อมูล) */
  title?: string
  /** Refresh handler */
  onRefresh?: () => void
  /** Whether refresh is in progress */
  isRefreshing?: boolean
  /** Reset all filters handler */
  onReset?: () => void
  /** Number of currently active filters */
  activeFilterCount?: number
  /** Card padding */
  padding?: string
  /** Card radius */
  radius?: string
}

export default function FilterBar({
  children,
  title = 'กรองข้อมูล',
  onRefresh,
  isRefreshing = false,
  onReset,
  activeFilterCount = 0,
  padding = 'md',
  radius = 'lg',
}: FilterBarProps) {
  return (
    <Card withBorder radius={radius} p={padding}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="black">{title}</Text>
            {activeFilterCount > 0 && (
              <Badge size="sm" variant="light" color="orange">
                {activeFilterCount} ตัวกรอง
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            {onReset && activeFilterCount > 0 && (
              <Button
                leftSection={<TbFilter size={16} />}
                variant="subtle"
                color="gray"
                onClick={onReset}
                size="xs"
                radius="lg"
              >
                รีเซ็ต
              </Button>
            )}
            {onRefresh && (
              <Button
                leftSection={<TbRefresh size={18} />}
                variant="outline"
                color="orange"
                onClick={onRefresh}
                loading={isRefreshing}
                radius="lg"
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: 'var(--mantine-color-orange-6)',
                  borderWidth: '1px',
                }}
              >
                รีเฟรซข้อมูล
              </Button>
            )}
          </Group>
        </Group>

        {/* Filter Content */}
        {children}
      </Stack>
    </Card>
  )
}
