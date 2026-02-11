/**
 * MonthlyFeesForm Component
 * Modal สำหรับเพิ่ม/แก้ไขค่าทำบัญชี-HR รายเดือน + Line Chat/Billing
 */

import { useEffect, useState } from 'react'
import {
    Modal,
    Stack,
    TextInput,
    NumberInput,
    Select,
    Button,
    Group,
    Text,
    Grid,
    Table,
    Divider,
    Title,
    ActionIcon,
    Tooltip,
    Box,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { TbCopy } from 'react-icons/tb'
import { AccountingFees } from '../../services/clientsService'

interface MonthlyFeesFormProps {
    opened: boolean
    onClose: () => void
    onSubmit: (data: AccountingFees) => Promise<void>
    data?: AccountingFees | null
    build: string
}

const lineChatTypeOptions = [
    { value: 'group', label: 'Group' },
    { value: 'userid', label: 'User ID' },
]

const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export default function MonthlyFeesForm({
    opened,
    onClose,
    onSubmit,
    data,
    build,
}: MonthlyFeesFormProps) {
    const [fillAccountingFee, setFillAccountingFee] = useState<number | string>('')
    const [fillHrFee, setFillHrFee] = useState<number | string>('')

    const form = useForm({
        initialValues: {
            fee_year: new Date().getFullYear(),
            peak_code: '',
            accounting_start_date: null as Date | null,
            accounting_end_date: null as Date | null,
            accounting_end_reason: '',
            accounting_fee_jan: '' as string | number,
            accounting_fee_feb: '' as string | number,
            accounting_fee_mar: '' as string | number,
            accounting_fee_apr: '' as string | number,
            accounting_fee_may: '' as string | number,
            accounting_fee_jun: '' as string | number,
            accounting_fee_jul: '' as string | number,
            accounting_fee_aug: '' as string | number,
            accounting_fee_sep: '' as string | number,
            accounting_fee_oct: '' as string | number,
            accounting_fee_nov: '' as string | number,
            accounting_fee_dec: '' as string | number,
            hr_fee_jan: '' as string | number,
            hr_fee_feb: '' as string | number,
            hr_fee_mar: '' as string | number,
            hr_fee_apr: '' as string | number,
            hr_fee_may: '' as string | number,
            hr_fee_jun: '' as string | number,
            hr_fee_jul: '' as string | number,
            hr_fee_aug: '' as string | number,
            hr_fee_sep: '' as string | number,
            hr_fee_oct: '' as string | number,
            hr_fee_nov: '' as string | number,
            hr_fee_dec: '' as string | number,
            line_chat_type: '',
            line_chat_id: '',
            line_billing_chat_type: '',
            line_billing_id: '',
            accounting_fee_image_url: '',
        },
    })

    const handleFillAllAccountingFees = () => {
        if (fillAccountingFee === '' || fillAccountingFee === undefined) return
        const values: Record<string, number> = {}
        monthKeys.forEach((k) => {
            values[`accounting_fee_${k}`] = Number(fillAccountingFee)
        })
        form.setValues(values)
    }

    const handleFillAllHrFees = () => {
        if (fillHrFee === '' || fillHrFee === undefined) return
        const values: Record<string, number> = {}
        monthKeys.forEach((k) => {
            values[`hr_fee_${k}`] = Number(fillHrFee)
        })
        form.setValues(values)
    }

    useEffect(() => {
        if (opened) {
            if (data) {
                form.setValues({
                    fee_year: data.fee_year || new Date().getFullYear(),
                    peak_code: data.peak_code || '',
                    accounting_start_date: data.accounting_start_date ? new Date(data.accounting_start_date) : null,
                    accounting_end_date: data.accounting_end_date ? new Date(data.accounting_end_date) : null,
                    accounting_end_reason: data.accounting_end_reason || '',
                    accounting_fee_jan: data.accounting_fee_jan ?? '',
                    accounting_fee_feb: data.accounting_fee_feb ?? '',
                    accounting_fee_mar: data.accounting_fee_mar ?? '',
                    accounting_fee_apr: data.accounting_fee_apr ?? '',
                    accounting_fee_may: data.accounting_fee_may ?? '',
                    accounting_fee_jun: data.accounting_fee_jun ?? '',
                    accounting_fee_jul: data.accounting_fee_jul ?? '',
                    accounting_fee_aug: data.accounting_fee_aug ?? '',
                    accounting_fee_sep: data.accounting_fee_sep ?? '',
                    accounting_fee_oct: data.accounting_fee_oct ?? '',
                    accounting_fee_nov: data.accounting_fee_nov ?? '',
                    accounting_fee_dec: data.accounting_fee_dec ?? '',
                    hr_fee_jan: data.hr_fee_jan ?? '',
                    hr_fee_feb: data.hr_fee_feb ?? '',
                    hr_fee_mar: data.hr_fee_mar ?? '',
                    hr_fee_apr: data.hr_fee_apr ?? '',
                    hr_fee_may: data.hr_fee_may ?? '',
                    hr_fee_jun: data.hr_fee_jun ?? '',
                    hr_fee_jul: data.hr_fee_jul ?? '',
                    hr_fee_aug: data.hr_fee_aug ?? '',
                    hr_fee_sep: data.hr_fee_sep ?? '',
                    hr_fee_oct: data.hr_fee_oct ?? '',
                    hr_fee_nov: data.hr_fee_nov ?? '',
                    hr_fee_dec: data.hr_fee_dec ?? '',
                    line_chat_type: data.line_chat_type || '',
                    line_chat_id: data.line_chat_id || '',
                    line_billing_chat_type: data.line_billing_chat_type || '',
                    line_billing_id: data.line_billing_id || '',
                    accounting_fee_image_url: data.accounting_fee_image_url || '',
                })
            } else {
                form.reset()
            }
        }
    }, [opened, data])

    const handleSubmit = async (values: typeof form.values) => {
        const submitData: AccountingFees = {
            fee_year: values.fee_year,
            peak_code: values.peak_code || null,
            accounting_start_date: values.accounting_start_date
                ? values.accounting_start_date.toISOString().split('T')[0]
                : undefined,
            accounting_end_date: values.accounting_end_date
                ? values.accounting_end_date.toISOString().split('T')[0]
                : undefined,
            accounting_end_reason: values.accounting_end_reason || null,
            accounting_fee_jan: values.accounting_fee_jan !== '' ? Number(values.accounting_fee_jan) : null,
            accounting_fee_feb: values.accounting_fee_feb !== '' ? Number(values.accounting_fee_feb) : null,
            accounting_fee_mar: values.accounting_fee_mar !== '' ? Number(values.accounting_fee_mar) : null,
            accounting_fee_apr: values.accounting_fee_apr !== '' ? Number(values.accounting_fee_apr) : null,
            accounting_fee_may: values.accounting_fee_may !== '' ? Number(values.accounting_fee_may) : null,
            accounting_fee_jun: values.accounting_fee_jun !== '' ? Number(values.accounting_fee_jun) : null,
            accounting_fee_jul: values.accounting_fee_jul !== '' ? Number(values.accounting_fee_jul) : null,
            accounting_fee_aug: values.accounting_fee_aug !== '' ? Number(values.accounting_fee_aug) : null,
            accounting_fee_sep: values.accounting_fee_sep !== '' ? Number(values.accounting_fee_sep) : null,
            accounting_fee_oct: values.accounting_fee_oct !== '' ? Number(values.accounting_fee_oct) : null,
            accounting_fee_nov: values.accounting_fee_nov !== '' ? Number(values.accounting_fee_nov) : null,
            accounting_fee_dec: values.accounting_fee_dec !== '' ? Number(values.accounting_fee_dec) : null,
            hr_fee_jan: values.hr_fee_jan !== '' ? Number(values.hr_fee_jan) : null,
            hr_fee_feb: values.hr_fee_feb !== '' ? Number(values.hr_fee_feb) : null,
            hr_fee_mar: values.hr_fee_mar !== '' ? Number(values.hr_fee_mar) : null,
            hr_fee_apr: values.hr_fee_apr !== '' ? Number(values.hr_fee_apr) : null,
            hr_fee_may: values.hr_fee_may !== '' ? Number(values.hr_fee_may) : null,
            hr_fee_jun: values.hr_fee_jun !== '' ? Number(values.hr_fee_jun) : null,
            hr_fee_jul: values.hr_fee_jul !== '' ? Number(values.hr_fee_jul) : null,
            hr_fee_aug: values.hr_fee_aug !== '' ? Number(values.hr_fee_aug) : null,
            hr_fee_sep: values.hr_fee_sep !== '' ? Number(values.hr_fee_sep) : null,
            hr_fee_oct: values.hr_fee_oct !== '' ? Number(values.hr_fee_oct) : null,
            hr_fee_nov: values.hr_fee_nov !== '' ? Number(values.hr_fee_nov) : null,
            hr_fee_dec: values.hr_fee_dec !== '' ? Number(values.hr_fee_dec) : null,
            line_chat_type: values.line_chat_type || null,
            line_chat_id: values.line_chat_id || null,
            line_billing_chat_type: values.line_billing_chat_type || null,
            line_billing_id: values.line_billing_id || null,
            accounting_fee_image_url: values.accounting_fee_image_url || null,
        }
        await onSubmit(submitData)
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Title order={4}>ค่าทำบัญชี / ค่าบริการ HR รายเดือน — {build}</Title>
            }
            size="90%"
            centered
            styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <NumberInput
                        label="ปีค่าธรรมเนียม"
                        placeholder="2568"
                        allowDecimal={false}
                        min={2500}
                        max={2600}
                        style={{ maxWidth: 200 }}
                        {...form.getInputProps('fee_year')}
                    />

                    <Divider label="ข้อมูลทั่วไป" labelPosition="center" />

                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <TextInput
                                label="Peak Code"
                                placeholder="กรอก Peak Code"
                                withAsterisk
                                {...form.getInputProps('peak_code')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <DateInput
                                label="วันเริ่มทำบัญชี"
                                placeholder="เลือกวันที่"
                                valueFormat="DD/MM/YYYY"
                                withAsterisk
                                clearable
                                {...form.getInputProps('accounting_start_date')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <DateInput
                                label="วันสิ้นสุดทำบัญชี"
                                placeholder="เลือกวันที่"
                                valueFormat="DD/MM/YYYY"
                                clearable
                                {...form.getInputProps('accounting_end_date')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <TextInput
                                label="เหตุผลสิ้นสุด"
                                placeholder="กรอกเหตุผล (ถ้ามี)"
                                {...form.getInputProps('accounting_end_reason')}
                            />
                        </Grid.Col>
                    </Grid>

                    <Divider label="ค่าทำบัญชี / ค่า HR รายเดือน" labelPosition="center" />

                    {/* Quick Fill - เติมทุกเดือน */}
                    <Box
                        p="sm"
                        style={{
                            border: '1px dashed #e0e0e0',
                            borderRadius: 8,
                            backgroundColor: '#fffaf5',
                        }}
                    >
                        <Text size="xs" c="dimmed" mb="xs" fw={500}>
                            เติมค่าเท่ากันทุกเดือน (สำหรับจ่ายรายปี)
                        </Text>
                        <Grid>
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Group gap="xs" align="flex-end">
                                    <NumberInput
                                        size="sm"
                                        label="ค่าบัญชีรายเดือน"
                                        placeholder="กรอกจำนวนเงิน"
                                        hideControls
                                        min={0}
                                        thousandSeparator=","
                                        allowDecimal={false}
                                        value={fillAccountingFee}
                                        onChange={(val) => setFillAccountingFee(val)}
                                        style={{ flex: 1 }}
                                    />
                                    <Tooltip label="เติมทุกเดือน (ค่าบัญชี)">
                                        <ActionIcon
                                            variant="filled"
                                            color="orange"
                                            size="lg"
                                            onClick={handleFillAllAccountingFees}
                                            mb={1}
                                        >
                                            <TbCopy size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <Group gap="xs" align="flex-end">
                                    <NumberInput
                                        size="sm"
                                        label="ค่า HR รายเดือน"
                                        placeholder="กรอกจำนวนเงิน"
                                        hideControls
                                        min={0}
                                        thousandSeparator=","
                                        allowDecimal={false}
                                        value={fillHrFee}
                                        onChange={(val) => setFillHrFee(val)}
                                        style={{ flex: 1 }}
                                    />
                                    <Tooltip label="เติมทุกเดือน (ค่า HR)">
                                        <ActionIcon
                                            variant="filled"
                                            color="orange"
                                            size="lg"
                                            onClick={handleFillAllHrFees}
                                            mb={1}
                                        >
                                            <TbCopy size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Table withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ width: 80 }}>ประเภท</Table.Th>
                                {monthLabels.map((m) => (
                                    <Table.Th key={m} style={{ textAlign: 'center', fontSize: 12, padding: '4px 2px' }}>{m}</Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td style={{ fontSize: 12, fontWeight: 500 }}>ค่าบัญชี</Table.Td>
                                {monthKeys.map((k) => (
                                    <Table.Td key={k} style={{ padding: '2px' }}>
                                        <NumberInput
                                            size="xs"
                                            placeholder="0"
                                            hideControls
                                            min={0}
                                            thousandSeparator=","
                                            allowDecimal={false}
                                            styles={{ input: { textAlign: 'right', padding: '4px 6px' } }}
                                            {...form.getInputProps(`accounting_fee_${k}`)}
                                        />
                                    </Table.Td>
                                ))}
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td style={{ fontSize: 12, fontWeight: 500 }}>ค่า HR</Table.Td>
                                {monthKeys.map((k) => (
                                    <Table.Td key={k} style={{ padding: '2px' }}>
                                        <NumberInput
                                            size="xs"
                                            placeholder="0"
                                            hideControls
                                            min={0}
                                            thousandSeparator=","
                                            allowDecimal={false}
                                            styles={{ input: { textAlign: 'right', padding: '4px 6px' } }}
                                            {...form.getInputProps(`hr_fee_${k}`)}
                                        />
                                    </Table.Td>
                                ))}
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>

                    <Divider label="Line Chat / Billing" labelPosition="center" />

                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <Select
                                label="Line Chat Type"
                                placeholder="เลือก"
                                data={lineChatTypeOptions}
                                clearable
                                {...form.getInputProps('line_chat_type')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <TextInput
                                label="Line Chat ID"
                                placeholder="กรอก Line Chat ID"
                                {...form.getInputProps('line_chat_id')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <Select
                                label="Line Billing Chat Type"
                                placeholder="เลือก"
                                data={lineChatTypeOptions}
                                clearable
                                {...form.getInputProps('line_billing_chat_type')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 3 }}>
                            <TextInput
                                label="Line Billing ID"
                                placeholder="กรอก Line Billing ID"
                                {...form.getInputProps('line_billing_id')}
                            />
                        </Grid.Col>
                    </Grid>

                    <Divider label="ลิงค์รูปค่าทำบัญชี" labelPosition="center" />

                    <TextInput
                        label="ลิงค์รูปค่าทำบัญชี"
                        placeholder="วางลิงค์รูปภาพที่นี่ เช่น https://..."
                        {...form.getInputProps('accounting_fee_image_url')}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={onClose}>ยกเลิก</Button>
                        <Button type="submit" color="orange">บันทึก</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    )
}
