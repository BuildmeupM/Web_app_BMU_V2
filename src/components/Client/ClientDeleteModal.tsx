/**
 * ClientDeleteModal Component
 * Modal สำหรับยืนยันการลบลูกค้า
 */

import { Modal, Stack, Text, Group, Button, Alert } from '@mantine/core'
import { TbAlertCircle, TbTrash } from 'react-icons/tb'
import { Client } from '../../services/clientsService'

interface ClientDeleteModalProps {
  opened: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  client: Client | null
}

export default function ClientDeleteModal({
  opened,
  onClose,
  onConfirm,
  client,
}: ClientDeleteModalProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="ยืนยันการลบลูกค้า"
      centered
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<TbAlertCircle size={16} />} color="red" title="คำเตือน">
          คุณกำลังจะลบข้อมูลลูกค้านี้ การกระทำนี้ไม่สามารถยกเลิกได้
        </Alert>

        {client && (
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Build Code:
              </Text>
              <Text fw={600}>{client.build}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                ชื่อบริษัท:
              </Text>
              <Text fw={600}>{client.company_name}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                เลขทะเบียนนิติบุคคล:
              </Text>
              <Text fw={600}>{client.legal_entity_number}</Text>
            </Group>
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="red"
            leftSection={<TbTrash size={16} />}
            onClick={handleConfirm}
          >
            ลบข้อมูล
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
