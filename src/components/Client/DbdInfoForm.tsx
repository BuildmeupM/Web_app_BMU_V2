/**
 * DbdInfoForm Component
 * Modal สำหรับเพิ่ม/แก้ไขข้อมูลกรมพัฒนาธุรกิจการค้า (DBD)
 */

import { useEffect } from 'react'
import {
    Modal,
    Stack,
    TextInput,
    NumberInput,
    Textarea,
    Button,
    Group,
    Grid,
    Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { DbdInfo } from '../../services/clientsService'

interface DbdInfoFormProps {
    opened: boolean
    onClose: () => void
    onSubmit: (data: DbdInfo) => Promise<void>
    data?: DbdInfo | null
    build: string
}

export default function DbdInfoForm({
    opened,
    onClose,
    onSubmit,
    data,
    build,
}: DbdInfoFormProps) {
    const form = useForm({
        initialValues: {
            accounting_period: '',
            registered_capital: '' as string | number,
            paid_capital: '' as string | number,
            business_code: '',
            business_objective_at_registration: '',
            latest_business_code: '',
            latest_business_objective: '',
        },
    })

    useEffect(() => {
        if (opened) {
            if (data) {
                form.setValues({
                    accounting_period: data.accounting_period || '',
                    registered_capital: data.registered_capital ?? '',
                    paid_capital: data.paid_capital ?? '',
                    business_code: data.business_code || '',
                    business_objective_at_registration: data.business_objective_at_registration || '',
                    latest_business_code: data.latest_business_code || '',
                    latest_business_objective: data.latest_business_objective || '',
                })
            } else {
                form.reset()
            }
        }
    }, [opened, data])

    const handleSubmit = async (values: typeof form.values) => {
        const submitData: DbdInfo = {
            accounting_period: values.accounting_period || null,
            registered_capital: values.registered_capital !== '' ? Number(values.registered_capital) : null,
            paid_capital: values.paid_capital !== '' ? Number(values.paid_capital) : null,
            business_code: values.business_code || null,
            business_objective_at_registration: values.business_objective_at_registration || null,
            latest_business_code: values.latest_business_code || null,
            latest_business_objective: values.latest_business_objective || null,
        }
        await onSubmit(submitData)
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={4}>ข้อมูลกรมพัฒนาธุรกิจ (DBD) — {build}</Title>}
            size="lg"
            centered
            styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <TextInput
                                label="รอบปีบัญชี"
                                placeholder="เช่น มกราคม - ธันวาคม"
                                {...form.getInputProps('accounting_period')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <NumberInput
                                label="ทุนจดทะเบียน (บาท)"
                                placeholder="0.00"
                                thousandSeparator=","
                                decimalScale={2}
                                min={0}
                                {...form.getInputProps('registered_capital')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <NumberInput
                                label="ทุนชำระแล้ว (บาท)"
                                placeholder="0.00"
                                thousandSeparator=","
                                decimalScale={2}
                                min={0}
                                {...form.getInputProps('paid_capital')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <TextInput
                                label="รหัสธุรกิจ"
                                placeholder="กรอกรหัสธุรกิจ"
                                {...form.getInputProps('business_code')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <TextInput
                                label="รหัสธุรกิจล่าสุด"
                                placeholder="กรอกรหัสธุรกิจล่าสุด"
                                {...form.getInputProps('latest_business_code')}
                            />
                        </Grid.Col>
                        <Grid.Col span={12}>
                            <Textarea
                                label="วัตถุประสงค์ที่จดทะเบียน"
                                placeholder="กรอกวัตถุประสงค์"
                                minRows={2}
                                {...form.getInputProps('business_objective_at_registration')}
                            />
                        </Grid.Col>
                        <Grid.Col span={12}>
                            <Textarea
                                label="วัตถุประสงค์ล่าสุด"
                                placeholder="กรอกวัตถุประสงค์ล่าสุด"
                                minRows={2}
                                {...form.getInputProps('latest_business_objective')}
                            />
                        </Grid.Col>
                    </Grid>

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={onClose}>ยกเลิก</Button>
                        <Button type="submit" color="orange">บันทึก</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    )
}
