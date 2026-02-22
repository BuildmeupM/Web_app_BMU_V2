/**
 * DeleteConfirmModal — Confirm deletion of an error report
 */

import { Modal, Stack, Text, Group, Button } from '@mantine/core'
import { TbTrash } from 'react-icons/tb'

interface DeleteConfirmModalProps {
    opened: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteConfirmModal({ opened, onClose, onConfirm }: DeleteConfirmModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group gap="sm"><TbTrash size={20} color="red" /><Text fw={700} size="lg">ยืนยันการลบ</Text></Group>}
            size="sm"
            radius="lg"
            centered
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">ต้องการลบรายงานข้อผิดพลาดนี้หรือไม่? การลบจะไม่สามารถกู้คืนได้</Text>
                <Group justify="flex-end" gap="sm">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button color="red" leftSection={<TbTrash size={16} />} onClick={onConfirm}>ลบรายงาน</Button>
                </Group>
            </Stack>
        </Modal>
    )
}
