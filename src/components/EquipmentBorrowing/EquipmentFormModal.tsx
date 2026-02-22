/**
 * EquipmentFormModal — Modal เพิ่ม/แก้ไขอุปกรณ์
 */
import {
    Stack, Group, Text, Modal, TextInput, Select, Divider,
    NumberInput, Textarea, Button,
} from '@mantine/core'
import { TbPackage } from 'react-icons/tb'
import type { Equipment } from '../../services/equipmentService'
import { categoryConfig, statusConfig } from './constants'

interface EquipmentFormModalProps {
    opened: boolean
    onClose: () => void
    editingEquipment: Equipment | null
    saving: boolean
    onSave: () => void
    // Form state
    formName: string; setFormName: (v: string) => void
    formCategory: string | null; setFormCategory: (v: string | null) => void
    formBrand: string; setFormBrand: (v: string) => void
    formModel: string; setFormModel: (v: string) => void
    formSerial: string; setFormSerial: (v: string) => void
    formStatus: string | null; setFormStatus: (v: string | null) => void
    formCpu: string; setFormCpu: (v: string) => void
    formRam: string; setFormRam: (v: string) => void
    formStorage: string; setFormStorage: (v: string) => void
    formDisplay: string; setFormDisplay: (v: string) => void
    formGpu: string; setFormGpu: (v: string) => void
    formOs: string; setFormOs: (v: string) => void
    formPurchaseDate: string; setFormPurchaseDate: (v: string) => void
    formWarrantyDate: string; setFormWarrantyDate: (v: string) => void
    formPrice: number | string; setFormPrice: (v: number | string) => void
    formDesc: string; setFormDesc: (v: string) => void
}

export default function EquipmentFormModal({
    opened, onClose, editingEquipment, saving, onSave,
    formName, setFormName, formCategory, setFormCategory,
    formBrand, setFormBrand, formModel, setFormModel,
    formSerial, setFormSerial, formStatus, setFormStatus,
    formCpu, setFormCpu, formRam, setFormRam,
    formStorage, setFormStorage, formDisplay, setFormDisplay,
    formGpu, setFormGpu, formOs, setFormOs,
    formPurchaseDate, setFormPurchaseDate, formWarrantyDate, setFormWarrantyDate,
    formPrice, setFormPrice, formDesc, setFormDesc,
}: EquipmentFormModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbPackage size={20} color="var(--mantine-color-teal-6)" />
                    <Text fw={600}>{editingEquipment ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</Text>
                </Group>
            }
            centered
            size="lg"
        >
            <Stack gap="md">
                <TextInput label="ชื่ออุปกรณ์" placeholder="เช่น Laptop Dell Latitude 5540" required
                    value={formName} onChange={e => setFormName(e.target.value)} />
                <Select label="หมวดหมู่" placeholder="เลือกหมวดหมู่" required
                    value={formCategory} onChange={setFormCategory}
                    data={Object.entries(categoryConfig).map(([v, c]) => ({ value: v, label: c.label }))} />
                <Group grow>
                    <TextInput label="ยี่ห้อ" placeholder="Dell, HP, Logitech..."
                        value={formBrand} onChange={e => setFormBrand(e.target.value)} />
                    <TextInput label="รุ่น" placeholder="Latitude 5540"
                        value={formModel} onChange={e => setFormModel(e.target.value)} />
                </Group>
                <TextInput label="S/N" placeholder="หมายเลข Serial Number"
                    value={formSerial} onChange={e => setFormSerial(e.target.value)} />
                {editingEquipment && (
                    <Select label="สถานะ" value={formStatus} onChange={setFormStatus}
                        data={Object.entries(statusConfig).map(([v, c]) => ({ value: v, label: c.label }))} />
                )}

                {/* ── สเปคคอมพิวเตอร์ ── */}
                <Divider label="สเปคคอมพิวเตอร์" labelPosition="center" />
                <Group grow>
                    <TextInput label="CPU" placeholder="Intel i7-13700H, AMD Ryzen 5..."
                        value={formCpu} onChange={e => setFormCpu(e.target.value)} />
                    <TextInput label="RAM" placeholder="16GB DDR5"
                        value={formRam} onChange={e => setFormRam(e.target.value)} />
                </Group>
                <Group grow>
                    <TextInput label="Storage" placeholder="512GB NVMe SSD"
                        value={formStorage} onChange={e => setFormStorage(e.target.value)} />
                    <TextInput label="GPU" placeholder="NVIDIA RTX 4060, Intel UHD..."
                        value={formGpu} onChange={e => setFormGpu(e.target.value)} />
                </Group>
                <Group grow>
                    <TextInput label="หน้าจอ" placeholder='15.6" FHD IPS, 24" 4K...'
                        value={formDisplay} onChange={e => setFormDisplay(e.target.value)} />
                    <TextInput label="ระบบปฏิบัติการ" placeholder="Windows 11 Pro, macOS..."
                        value={formOs} onChange={e => setFormOs(e.target.value)} />
                </Group>

                {/* ── ข้อมูลการซื้อ ── */}
                <Divider label="ข้อมูลการซื้อ / ประกัน" labelPosition="center" />
                <Group grow>
                    <TextInput label="วันที่ซื้อ" type="date"
                        value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)} />
                    <TextInput label="วันหมดประกัน" type="date"
                        value={formWarrantyDate} onChange={e => setFormWarrantyDate(e.target.value)} />
                </Group>
                <NumberInput label="ราคาซื้อ (บาท)" placeholder="0.00"
                    value={formPrice} onChange={setFormPrice}
                    min={0} decimalScale={2} thousandSeparator="," />

                <Textarea label="รายละเอียดเพิ่มเติม" placeholder="หมายเหตุอื่นๆ..."
                    value={formDesc} onChange={e => setFormDesc(e.target.value)} minRows={2} />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button color="teal" onClick={onSave} loading={saving}>
                        {editingEquipment ? 'บันทึก' : 'เพิ่ม'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
