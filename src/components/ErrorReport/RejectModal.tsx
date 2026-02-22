/**
 * RejectModal — Modal for rejecting an error report with a reason
 */

import { Modal, Stack, Textarea, Group, Button, Text } from '@mantine/core'
import { TbX } from 'react-icons/tb'

interface RejectModalProps {
    opened: boolean
    onClose: () => void
    rejectReason: string
    onRejectReasonChange: (value: string) => void
    onConfirm: () => void
}

export default function RejectModal({
    opened,
    onClose,
    rejectReason,
    onRejectReasonChange,
    onConfirm,
}: RejectModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text fw={700} c="red">ไม่อนุมัติรายงาน</Text>}
            size="md"
            centered
        >
            <Stack>
                <Textarea
                    label="เหตุผลที่ไม่อนุมัติ"
                    placeholder="กรุณาระบุเหตุผล..."
                    value={rejectReason}
                    onChange={(e) => onRejectReasonChange(e.currentTarget.value)}
                    required
                    minRows={3}
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button color="red" leftSection={<TbX size={16} />} onClick={onConfirm}>
                        ยืนยันไม่อนุมัติ
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
