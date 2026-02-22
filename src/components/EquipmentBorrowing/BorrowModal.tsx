/**
 * BorrowModal — Modal ยืมอุปกรณ์
 */
import {
    Stack, Group, Text, Modal, Select, Textarea, Button,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { TbPackageOff } from 'react-icons/tb'
import type { Equipment } from '../../services/equipmentService'

interface BorrowModalProps {
    opened: boolean
    onClose: () => void
    saving: boolean
    onSubmit: () => void
    // Form state
    borrowEquipmentId: string | null
    setBorrowEquipmentId: (v: string | null) => void
    borrowDateRange: [Date | null, Date | null]
    setBorrowDateRange: (v: [Date | null, Date | null]) => void
    borrowPurpose: string
    setBorrowPurpose: (v: string) => void
    // Available equipment list
    availableEquipment: Equipment[]
}

export default function BorrowModal({
    opened, onClose, saving, onSubmit,
    borrowEquipmentId, setBorrowEquipmentId,
    borrowDateRange, setBorrowDateRange,
    borrowPurpose, setBorrowPurpose,
    availableEquipment,
}: BorrowModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbPackageOff size={20} color="var(--mantine-color-teal-6)" />
                    <Text fw={600}>ยืมอุปกรณ์</Text>
                </Group>
            }
            centered
            size="md"
        >
            <Stack gap="md">
                <Select
                    label="เลือกอุปกรณ์"
                    placeholder="เลือกอุปกรณ์ที่ต้องการยืม"
                    required
                    value={borrowEquipmentId}
                    onChange={setBorrowEquipmentId}
                    data={availableEquipment.map(e => ({
                        value: e.id,
                        label: `${e.name}${e.brand ? ` (${e.brand})` : ''}`,
                    }))}
                    searchable
                    nothingFoundMessage="ไม่พบอุปกรณ์ที่พร้อมให้ยืม"
                />
                <DatePickerInput
                    type="range"
                    label="ช่วงวันที่ยืม - คืน"
                    placeholder="เลือกวันเริ่มต้น - สิ้นสุด"
                    required
                    value={borrowDateRange}
                    onChange={setBorrowDateRange}
                    locale="th"
                />
                <Textarea label="เหตุผลการยืม" placeholder="ระบุเหตุผล..."
                    value={borrowPurpose} onChange={e => setBorrowPurpose(e.target.value)} minRows={2} />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button color="teal" onClick={onSubmit} loading={saving}>
                        ส่งคำขอยืม
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
