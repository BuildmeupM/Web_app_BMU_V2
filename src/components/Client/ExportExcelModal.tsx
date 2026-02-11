/**
 * ExportExcelModal Component
 * Modal สำหรับส่งออกข้อมูลสรุปค่าทำบัญชี/HR เป็น Excel
 * - Step 1: เลือกเดือนที่ต้องการสรุป
 * - Step 2: เลือกบริษัทที่ยกเว้นหัก ณ ที่จ่าย
 */

import { useState } from 'react'
import {
    Modal,
    Stack,
    Select,
    MultiSelect,
    Button,
    Group,
    Text,
    Stepper,
    Alert,
    Loader,
    Center,
    Badge,
    Box,
} from '@mantine/core'
import {
    TbFileSpreadsheet,
    TbCalendar,
    TbShieldCheck,
    TbDownload,
    TbArrowRight,
    TbArrowLeft,
    TbAlertCircle,
} from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import clientsService, { Client } from '../../services/clientsService'

interface ExportExcelModalProps {
    opened: boolean
    onClose: () => void
    clients: Client[]
}

const monthOptions = [
    { value: 'jan', label: 'มกราคม (ม.ค.)' },
    { value: 'feb', label: 'กุมภาพันธ์ (ก.พ.)' },
    { value: 'mar', label: 'มีนาคม (มี.ค.)' },
    { value: 'apr', label: 'เมษายน (เม.ย.)' },
    { value: 'may', label: 'พฤษภาคม (พ.ค.)' },
    { value: 'jun', label: 'มิถุนายน (มิ.ย.)' },
    { value: 'jul', label: 'กรกฎาคม (ก.ค.)' },
    { value: 'aug', label: 'สิงหาคม (ส.ค.)' },
    { value: 'sep', label: 'กันยายน (ก.ย.)' },
    { value: 'oct', label: 'ตุลาคม (ต.ค.)' },
    { value: 'nov', label: 'พฤศจิกายน (พ.ย.)' },
    { value: 'dec', label: 'ธันวาคม (ธ.ค.)' },
]

export default function ExportExcelModal({ opened, onClose, clients }: ExportExcelModalProps) {
    const [activeStep, setActiveStep] = useState(0)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [exemptBuilds, setExemptBuilds] = useState<string[]>([])
    const [exporting, setExporting] = useState(false)

    // Build company options for MultiSelect from clients list
    const companyOptions = clients
        .filter(c => c.company_status?.includes('รายเดือน'))
        .map(c => ({
            value: c.build,
            label: `[${c.build}] ${c.company_name}`,
        }))

    const handleExport = async () => {
        if (!selectedMonth) return

        setExporting(true)
        try {
            await clientsService.exportAccountingFeesExcel({
                month: selectedMonth,
                exempt_builds: exemptBuilds.join(','),
            })
            notifications.show({
                title: 'ส่งออกสำเร็จ',
                message: 'ไฟล์ Excel ถูกดาวน์โหลดเรียบร้อยแล้ว',
                color: 'green',
                icon: <TbFileSpreadsheet size={16} />,
            })
            handleClose()
        } catch (err: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: err?.message || 'ไม่สามารถส่งออกข้อมูลได้',
                color: 'red',
            })
        } finally {
            setExporting(false)
        }
    }

    const handleClose = () => {
        setActiveStep(0)
        setSelectedMonth(null)
        setExemptBuilds([])
        setExporting(false)
        onClose()
    }

    const canProceedStep1 = !!selectedMonth

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap={8}>
                    <TbFileSpreadsheet size={22} color="#ff6b35" />
                    <Text fw={700} size="lg">ส่งออกข้อมูล Excel</Text>
                </Group>
            }
            size="lg"
            radius="lg"
            centered
        >
            <Stack gap="lg">
                <Stepper
                    active={activeStep}
                    onStepClick={setActiveStep}
                    color="orange"
                    size="sm"
                    allowNextStepsSelect={false}
                >
                    {/* Step 1: เลือกเดือน */}
                    <Stepper.Step
                        label="เลือกเดือน"
                        description="เดือนที่ต้องการสรุป"
                        icon={<TbCalendar size={18} />}
                    >
                        <Stack gap="md" mt="md">
                            <Alert
                                icon={<TbAlertCircle size={16} />}
                                color="blue"
                                variant="light"
                                radius="md"
                            >
                                เลือกเดือนที่ต้องการสรุปยอดค่าทำบัญชีและค่าบริการ HR
                            </Alert>
                            <Select
                                label="เดือนที่ต้องการสรุป"
                                placeholder="เลือกเดือน..."
                                data={monthOptions}
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                size="md"
                                searchable
                                leftSection={<TbCalendar size={18} />}
                                styles={{
                                    input: { borderColor: '#ff6b35' },
                                }}
                            />
                            <Group justify="flex-end" mt="sm">
                                <Button
                                    onClick={() => setActiveStep(1)}
                                    disabled={!canProceedStep1}
                                    color="orange"
                                    rightSection={<TbArrowRight size={16} />}
                                >
                                    ถัดไป
                                </Button>
                            </Group>
                        </Stack>
                    </Stepper.Step>

                    {/* Step 2: ยกเว้นหัก ณ ที่จ่าย */}
                    <Stepper.Step
                        label="ยกเว้น WHT"
                        description="เลือกบริษัทยกเว้น"
                        icon={<TbShieldCheck size={18} />}
                    >
                        <Stack gap="md" mt="md">
                            <Alert
                                icon={<TbShieldCheck size={16} />}
                                color="yellow"
                                variant="light"
                                radius="md"
                            >
                                เลือกบริษัทที่ได้รับการยกเว้นหัก ณ ที่จ่าย (ถ้ามี) หากไม่มีสามารถข้ามขั้นตอนนี้ได้
                            </Alert>
                            <MultiSelect
                                label="บริษัทที่ยกเว้นหัก ณ ที่จ่าย"
                                placeholder="ค้นหาชื่อบริษัท..."
                                data={companyOptions}
                                value={exemptBuilds}
                                onChange={setExemptBuilds}
                                searchable
                                clearable
                                nothingFoundMessage="ไม่พบบริษัท"
                                maxDropdownHeight={250}
                                size="md"
                                leftSection={<TbShieldCheck size={18} />}
                            />
                            {exemptBuilds.length > 0 && (
                                <Box>
                                    <Text size="sm" c="dimmed" mb={4}>
                                        บริษัทที่ยกเว้น ({exemptBuilds.length} บริษัท):
                                    </Text>
                                    <Group gap={4}>
                                        {exemptBuilds.map(build => (
                                            <Badge key={build} size="sm" variant="light" color="yellow">
                                                {build}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Box>
                            )}
                            <Group justify="space-between" mt="sm">
                                <Button
                                    variant="light"
                                    onClick={() => setActiveStep(0)}
                                    leftSection={<TbArrowLeft size={16} />}
                                >
                                    ย้อนกลับ
                                </Button>
                                <Button
                                    color="green"
                                    onClick={handleExport}
                                    loading={exporting}
                                    leftSection={<TbDownload size={16} />}
                                >
                                    ส่งออก Excel
                                </Button>
                            </Group>
                        </Stack>
                    </Stepper.Step>
                </Stepper>

                {exporting && (
                    <Center py="md">
                        <Stack align="center" gap="xs">
                            <Loader color="orange" />
                            <Text size="sm" c="dimmed">กำลังสร้างไฟล์ Excel...</Text>
                        </Stack>
                    </Center>
                )}
            </Stack>
        </Modal>
    )
}
