/**
 * AgencyCredentialsForm Component
 * Modal สำหรับเพิ่ม/แก้ไขรหัสผู้ใช้หน่วยงานราชการ
 */

import { useEffect } from 'react'
import {
    Modal,
    Stack,
    TextInput,
    Button,
    Group,
    Text,
    Grid,
    Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { AgencyCredentials } from '../../services/clientsService'

interface AgencyCredentialsFormProps {
    opened: boolean
    onClose: () => void
    onSubmit: (data: AgencyCredentials) => Promise<void>
    data?: AgencyCredentials | null
    build: string
}

export default function AgencyCredentialsForm({
    opened,
    onClose,
    onSubmit,
    data,
    build,
}: AgencyCredentialsFormProps) {
    const form = useForm({
        initialValues: {
            efiling_username: '',
            efiling_password: '',
            sso_username: '',
            sso_password: '',
            dbd_username: '',
            dbd_password: '',
            student_loan_username: '',
            student_loan_password: '',
            enforcement_username: '',
            enforcement_password: '',
        },
    })

    useEffect(() => {
        if (opened) {
            if (data) {
                form.setValues({
                    efiling_username: data.efiling_username || '',
                    efiling_password: data.efiling_password || '',
                    sso_username: data.sso_username || '',
                    sso_password: data.sso_password || '',
                    dbd_username: data.dbd_username || '',
                    dbd_password: data.dbd_password || '',
                    student_loan_username: data.student_loan_username || '',
                    student_loan_password: data.student_loan_password || '',
                    enforcement_username: data.enforcement_username || '',
                    enforcement_password: data.enforcement_password || '',
                })
            } else {
                form.reset()
            }
        }
    }, [opened, data])

    const handleSubmit = async (values: typeof form.values) => {
        const submitData: AgencyCredentials = {
            efiling_username: values.efiling_username || null,
            efiling_password: values.efiling_password || null,
            sso_username: values.sso_username || null,
            sso_password: values.sso_password || null,
            dbd_username: values.dbd_username || null,
            dbd_password: values.dbd_password || null,
            student_loan_username: values.student_loan_username || null,
            student_loan_password: values.student_loan_password || null,
            enforcement_username: values.enforcement_username || null,
            enforcement_password: values.enforcement_password || null,
        }
        await onSubmit(submitData)
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={4}>รหัสผู้ใช้หน่วยงานราชการ — {build}</Title>}
            size="lg"
            centered
            styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {[
                        { label: 'e-Filing (สรรพากร)', prefix: 'efiling' },
                        { label: 'ประกันสังคม (SSO)', prefix: 'sso' },
                        { label: 'กรมพัฒนาธุรกิจ (DBD)', prefix: 'dbd' },
                        { label: 'กยศ. (Student Loan)', prefix: 'student_loan' },
                        { label: 'บังคับคดี (Enforcement)', prefix: 'enforcement' },
                    ].map(({ label, prefix }) => (
                        <div key={prefix}>
                            <Text size="sm" fw={600} mb={4}>{label}</Text>
                            <Grid>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <TextInput
                                        label="Username"
                                        placeholder={`กรอก ${label} Username`}
                                        {...form.getInputProps(`${prefix}_username`)}
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <TextInput
                                        label="Password"
                                        placeholder={`กรอก ${label} Password`}
                                        {...form.getInputProps(`${prefix}_password`)}
                                    />
                                </Grid.Col>
                            </Grid>
                        </div>
                    ))}

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={onClose}>ยกเลิก</Button>
                        <Button type="submit" color="orange">บันทึก</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    )
}
