/**
 * Document Request Form
 * Modal form สำหรับขอเอกสาร (หนังสือรับรองการทำงาน / หนังสือรับรองเงินเดือน)
 */

import { useState } from 'react'
import {
    Modal,
    Select,
    Textarea,
    NumberInput,
    Button,
    Stack,
    Text,
    Group,
    Alert,
} from '@mantine/core'
import { TbFileDescription, TbAlertCircle } from 'react-icons/tb'
import { documentRequestService, DocumentRequest } from '../../services/documentRequestService'
import { notifications } from '@mantine/notifications'

interface DocumentRequestFormProps {
    opened: boolean
    onClose: () => void
    onSuccess?: () => void
}

export default function DocumentRequestForm({
    opened,
    onClose,
    onSuccess,
}: DocumentRequestFormProps) {
    const [documentType, setDocumentType] = useState<DocumentRequest['document_type'] | null>(null)
    const [purpose, setPurpose] = useState('')
    const [copies, setCopies] = useState<number>(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        setError(null)

        if (!documentType) {
            setError('กรุณาเลือกประเภทเอกสาร')
            return
        }

        try {
            setLoading(true)
            const response = await documentRequestService.create({
                document_type: documentType,
                purpose: purpose || undefined,
                copies,
            })
            if (response.success) {
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'ส่งคำขอเอกสารเรียบร้อยแล้ว',
                    color: 'green',
                })
                handleClose()
                onSuccess?.()
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setDocumentType(null)
        setPurpose('')
        setCopies(1)
        setError(null)
        onClose()
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <TbFileDescription size={22} color="var(--mantine-color-violet-6)" />
                    <Text fw={600} size="lg">ขอเอกสาร</Text>
                </Group>
            }
            size="md"
            centered
        >
            <Stack gap="md">
                {error && (
                    <Alert
                        icon={<TbAlertCircle size={18} />}
                        title="ข้อผิดพลาด"
                        color="red"
                        variant="light"
                    >
                        {error}
                    </Alert>
                )}

                <Select
                    label="ประเภทเอกสาร"
                    placeholder="เลือกประเภทเอกสาร"
                    data={[
                        { value: 'หนังสือรับรองการทำงาน', label: '📄 หนังสือรับรองการทำงาน' },
                        { value: 'หนังสือรับรองเงินเดือน', label: '💰 หนังสือรับรองเงินเดือน' },
                    ]}
                    value={documentType}
                    onChange={(v) => setDocumentType(v as DocumentRequest['document_type'])}
                    required
                    size="md"
                />

                <Textarea
                    label="วัตถุประสงค์ (ถ้ามี)"
                    placeholder="เช่น ใช้ยื่นสมัครสินเชื่อธนาคาร, ใช้ประกอบวีซ่า ฯลฯ"
                    value={purpose}
                    onChange={(e) => setPurpose(e.currentTarget.value)}
                    minRows={3}
                />

                <NumberInput
                    label="จำนวนฉบับ"
                    value={copies}
                    onChange={(v) => setCopies(typeof v === 'number' ? v : 1)}
                    min={1}
                    max={10}
                    size="md"
                />

                <Text size="xs" c="dimmed">
                    * คำขอจะถูกส่งไปยัง Admin/HR เพื่อพิจารณาอนุมัติและออกเอกสารให้
                </Text>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={handleClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        leftSection={<TbFileDescription size={18} />}
                        color="violet"
                    >
                        ส่งคำขอเอกสาร
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
