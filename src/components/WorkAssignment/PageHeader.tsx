/**
 * PageHeader — Header with title, action buttons, and current view info
 * Extracted from WorkAssignment.tsx
 */

import { Group, Title, Button, Card, Text, Badge, Tooltip } from '@mantine/core'
import { TbPlus, TbRefresh, TbUpload, TbEye, TbEyeOff } from 'react-icons/tb'

interface MonthInfo {
  year: number
  month: number
}

interface PageHeaderProps {
  currentMonth: MonthInfo
  previousMonth: MonthInfo
  viewMonth: MonthInfo
  displayYear: string | null
  displayMonth: string | null
  totalCount: number
  showPreviousColumns: boolean
  thaiMonths: Array<{ value: string; label: string }>
  onViewCurrent: () => void
  onViewPrevious: () => void
  onAdd: () => void
  onImport: () => void
  onBulkSync: () => void
  onTogglePreviousColumns: () => void
}

export default function PageHeader({
  currentMonth, previousMonth, viewMonth,
  displayYear, displayMonth, totalCount,
  showPreviousColumns, thaiMonths,
  onViewCurrent, onViewPrevious,
  onAdd, onImport, onBulkSync, onTogglePreviousColumns,
}: PageHeaderProps) {
  const displayLabel = (() => {
    const dy = displayYear || viewMonth.year
    const dm = displayMonth || viewMonth.month
    return `${thaiMonths.find((m) => m.value === dm.toString())?.label || dm} ${dy}`
  })()

  return (
    <>
      {/* Title + Action Buttons */}
      <Group justify="space-between">
        <Title order={1}>จัดงานรายเดือน</Title>
        <Group gap="sm">
          <Button variant="outline" color="orange" onClick={onViewCurrent} radius="lg" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
            เดือนภาษีปัจจุบัน ({currentMonth.year}/{currentMonth.month})
          </Button>
          <Button variant="outline" color="orange" onClick={onViewPrevious} radius="lg" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
            เดือนภาษีก่อนหน้า ({previousMonth.year}/{previousMonth.month})
          </Button>
          <Button leftSection={<TbPlus size={18} />} radius="lg" variant="outline" color="orange" onClick={onAdd} style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
            สร้างการจัดงานใหม่
          </Button>
          <Button leftSection={<TbUpload size={18} />} radius="lg" variant="outline" color="orange" onClick={onImport} style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
            นำเข้าจาก Excel
          </Button>
          <Button leftSection={<TbRefresh size={18} />} radius="lg" variant="outline" color="red" onClick={onBulkSync} style={{ backgroundColor: 'white', borderColor: 'var(--mantine-color-red-6)', color: 'var(--mantine-color-red-6)' }}>
            ซิงค์รายการที่ล้มเหลว
          </Button>
          <Tooltip label={showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}>
            <Button leftSection={showPreviousColumns ? <TbEyeOff size={18} /> : <TbEye size={18} />} radius="lg" variant="outline" color="gray" onClick={onTogglePreviousColumns} style={{ backgroundColor: showPreviousColumns ? '#f0f0f0' : 'white', color: 'black' }}>
              {showPreviousColumns ? 'ซ่อนข้อมูลเดิม' : 'แสดงข้อมูลเดิม'}
            </Button>
          </Tooltip>
        </Group>
      </Group>

      {/* Current View Info */}
      <Card withBorder radius="lg" p="md" style={{ backgroundColor: 'white', borderColor: 'var(--mantine-color-orange-6)' }}>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={500} c="black">กำลังแสดงข้อมูลเดือนภาษี:</Text>
            <Badge size="lg" variant="outline" color="orange" style={{ backgroundColor: 'white', color: 'black', borderColor: 'var(--mantine-color-orange-6)' }}>
              {displayLabel}
            </Badge>
          </Group>
          <Text size="xs" c="black">{totalCount} รายการ</Text>
        </Group>
      </Card>
    </>
  )
}
