/**
 * StatisticsSection — Work assignment statistics grouped by role
 * Extracted from WorkAssignment.tsx
 */

import { Card, Text, SimpleGrid } from '@mantine/core'

interface RoleStatGroup {
  role: string
  roleLabel: string
  totalEmployees: number
  grandTotal: number
  totalVatRegistered: number
  totalNotVatRegistered: number
}

interface StatisticsSectionProps {
  workStatisticsByRole: RoleStatGroup[]
}

export default function StatisticsSection({ workStatisticsByRole }: StatisticsSectionProps) {
  if (workStatisticsByRole.length === 0) return null

  return (
    <Card withBorder radius="lg" p="md">
      <Text size="lg" fw={600} mb="md">สถิติการจัดงาน (ข้อมูลที่บันทึกแล้ว)</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {workStatisticsByRole.map((role) => (
          <Card key={role.role} withBorder p="sm" radius="md">
            <Text fw={600} size="sm">{role.roleLabel}</Text>
            <Text size="xs" c="dimmed">{role.totalEmployees} คน | รวม {role.grandTotal} บริษัท</Text>
            <Text size="xs" c="dimmed">จดภาษีมูลค่าเพิ่ม: {role.totalVatRegistered} | ไม่จด: {role.totalNotVatRegistered}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  )
}
