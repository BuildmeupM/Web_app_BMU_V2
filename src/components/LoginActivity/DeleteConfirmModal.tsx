import React from 'react';
import { Modal, Group, Text, Stack, Button } from '@mantine/core';
import { TbTrashX, TbTrash } from 'react-icons/tb';

interface DeleteConfirmModalProps {
    opened: boolean;
    onClose: () => void;
    type: 'single' | 'selected' | 'all' | null;
    selectedCount: number;
    totalCount: number;
    deleting: boolean;
    onConfirm: () => void;
}

export default function DeleteConfirmModal({
    opened,
    onClose,
    type,
    selectedCount,
    totalCount,
    deleting,
    onConfirm
}: DeleteConfirmModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbTrashX size={20} color="var(--mantine-color-red-6)" />
                    <Text fw={600}>ยืนยันการลบ</Text>
                </Group>
            }
            centered
            size="sm"
        >
            <Stack gap="md">
                <Text size="sm">
                    {type === 'single'
                        ? 'คุณต้องการลบรายการนี้ใช่หรือไม่?'
                        : type === 'selected'
                            ? `คุณต้องการลบรายการที่เลือก ${selectedCount} รายการ ใช่หรือไม่?`
                            : `คุณต้องการลบรายการ Login Attempts ทั้งหมด (${totalCount} รายการ) ใช่หรือไม่?`
                    }
                </Text>
                <Text size="xs" c="red">
                    ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </Text>
                <Group justify="flex-end" gap="sm">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        color="red"
                        size="sm"
                        leftSection={<TbTrash size={16} />}
                        loading={deleting}
                        onClick={onConfirm}
                    >
                        {type === 'single' ? 'ลบรายการ' : type === 'selected' ? `ลบ ${selectedCount} รายการ` : 'ลบทั้งหมด'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
