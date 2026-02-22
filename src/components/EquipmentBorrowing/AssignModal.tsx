/**
 * AssignModal — Modal มอบหมายอุปกรณ์ให้พนักงาน
 */
import {
    Stack, Group, Text, Modal, Select, Textarea, Button,
} from '@mantine/core'
import { TbUserCheck } from 'react-icons/tb'
import type { Equipment, EmployeeOption } from '../../services/equipmentService'

interface AssignModalProps {
    opened: boolean
    onClose: () => void
    saving: boolean
    onSubmit: () => void
    // Form state
    assignEmployeeId: string | null
    setAssignEmployeeId: (v: string | null) => void
    assignEquipmentId: string | null
    setAssignEquipmentId: (v: string | null) => void
    assignNotes: string
    setAssignNotes: (v: string) => void
    // Data
    employees: EmployeeOption[]
    availableEquipment: Equipment[]
}

export default function AssignModal({
    opened, onClose, saving, onSubmit,
    assignEmployeeId, setAssignEmployeeId,
    assignEquipmentId, setAssignEquipmentId,
    assignNotes, setAssignNotes,
    employees, availableEquipment,
}: AssignModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbUserCheck size={20} color="var(--mantine-color-teal-6)" />
                    <Text fw={600}>มอบหมายอุปกรณ์ให้พนักงาน</Text>
                </Group>
            }
            centered
            size="md"
        >
            <Stack gap="md">
                <Select
                    label="เลือกพนักงาน"
                    placeholder="ค้นหาชื่อพนักงาน..."
                    required searchable
                    value={assignEmployeeId}
                    onChange={setAssignEmployeeId}
                    data={(employees || []).map(emp => ({
                        value: emp.id,
                        label: `${emp.name}${emp.nick_name ? ` (${emp.nick_name})` : ''}${emp.employee_id ? ` - ${emp.employee_id}` : ''}`,
                    }))}
                    nothingFoundMessage="ไม่พบพนักงาน"
                />
                <Select
                    label="เลือกอุปกรณ์"
                    placeholder="ค้นหาอุปกรณ์..."
                    required searchable
                    value={assignEquipmentId}
                    onChange={setAssignEquipmentId}
                    data={availableEquipment.map(e => ({
                        value: e.id,
                        label: `${e.name}${e.brand ? ` (${e.brand})` : ''}${e.serial_number ? ` [${e.serial_number}]` : ''}`,
                    }))}
                    nothingFoundMessage="ไม่พบอุปกรณ์ที่พร้อมใช้"
                />
                <Textarea label="หมายเหตุ" placeholder="เช่น อุปกรณ์ประจำตำแหน่ง, อุปกรณ์ทดแทน..."
                    value={assignNotes} onChange={e => setAssignNotes(e.target.value)} minRows={2} />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button color="teal" onClick={onSubmit} loading={saving}>
                        มอบหมาย
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
