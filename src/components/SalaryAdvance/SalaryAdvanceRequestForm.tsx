/**
 * Salary Advance Request Form
 * Modal form สำหรับพนักงานกรอกขอเบิกเงินเดือนล่วงหน้า
 */

import { useState } from 'react'
import {
    Modal,
    TextInput,
    Button,
    Stack,
    Text,
    Group,
    Alert,
} from '@mantine/core'
import { TbCash, TbAlertCircle } from 'react-icons/tb'
import { salaryAdvanceService } from '../../services/salaryAdvanceService'
import { notifications } from '@mantine/notifications'

interface SalaryAdvanceRequestFormProps {
    opened: boolean
    onClose: () => void
    onSuccess?: () => void
}

export default function SalaryAdvanceRequestForm({
    opened,
    onClose,
    onSuccess,
}: SalaryAdvanceRequestFormProps) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        setError(null)

        const amountNum = parseFloat(amount.replace(/,/g, ''))
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setError('กรุณาระบุจำนวนเงินที่ถูกต้อง')
            return
        }

        try {
            setLoading(true)
            const response = await salaryAdvanceService.create({ amount: amountNum })
            if (response.success) {
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'ส่งคำขอเบิกเงินเดือนเรียบร้อยแล้ว',
                    color: 'green',
                })
                setAmount('')
                onClose()
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
        setAmount('')
        setError(null)
        onClose()
    }

    // Format number with commas
    const handleAmountChange = (value: string) => {
        // Remove non-numeric characters except dots
        const cleaned = value.replace(/[^0-9.]/g, '')
        // Format with commas
        const parts = cleaned.split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        setAmount(parts.join('.'))
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <TbCash size={22} color="var(--mantine-color-orange-6)" />
                    <Text fw={600} size="lg">ขอเบิกเงินเดือนล่วงหน้า</Text>
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

                <TextInput
                    label="จำนวนเงินที่ต้องการเบิก (บาท)"
                    placeholder="เช่น 5,000"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.currentTarget.value)}
                    required
                    leftSection={<TbCash size={16} />}
                    size="md"
                />

                <Text size="xs" c="dimmed">
                    * คำขอจะถูกส่งไปยัง Admin/HR เพื่อพิจารณาอนุมัติ
                </Text>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={handleClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        leftSection={<TbCash size={18} />}
                    >
                        ส่งคำขอเบิก
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
