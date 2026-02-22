/**
 * DeleteConfirmModal — Modal ยืนยันการลบการจัดงาน
 * Extracted from WorkAssignment page (lines 4540-4620)
 */
import {
  Modal, Stack, Text, Group, Button, Alert, Card,
} from '@mantine/core'
import { TbTrash, TbAlertCircle } from 'react-icons/tb'
import type { WorkAssignment as WorkAssignmentType } from '../../services/workAssignmentsService'

interface DeleteConfirmModalProps {
  opened: boolean
  onClose: () => void
  assignment: WorkAssignmentType | null
  onConfirm: () => void
}

export default function DeleteConfirmModal({
  opened, onClose, assignment, onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <TbTrash size={20} color="red" />
          <Text fw={600} c="red">ยืนยันการลบการจัดงาน</Text>
        </Group>
      }
      size="md" centered
    >
      {assignment && (
        <Stack gap="md">
          <Alert variant="light" color="red" icon={<TbAlertCircle />}>
            <Text size="sm">
              คุณต้องการลบการจัดงานนี้หรือไม่? การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด รวมถึงข้อมูลภาษีรายเดือนและข้อมูลคีย์เอกสาร
            </Text>
          </Alert>
          <Card withBorder p="sm">
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Build:</Text>
                <Text size="sm" fw={500}>{assignment.build}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">บริษัท:</Text>
                <Text size="sm" fw={500}>{assignment.company_name || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">เดือนภาษี:</Text>
                <Text size="sm" fw={500}>{assignment.assignment_month}/{assignment.assignment_year}</Text>
              </Group>
            </Stack>
          </Card>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={onClose}>ยกเลิก</Button>
            <Button color="red" leftSection={<TbTrash size={16} />} onClick={onConfirm}>ยืนยันลบ</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
