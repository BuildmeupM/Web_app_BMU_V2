/**
 * Salary Advance Dashboard
 * Dashboard สรุปข้อมูลการเบิกเงินเดือนและขอเอกสาร สำหรับ Admin/HR
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Stack,
    SimpleGrid,
    Paper,
    Text,
    Group,
    Title,
    Loader,
    Center,
    Select,
    ThemeIcon,
    Badge,
    Table,
    Avatar,
    RingProgress,
    Button,
} from '@mantine/core'
import {
    TbCash,
    TbClock,
    TbCheck,
    TbX,
    TbFileText,
    TbFileDescription,
    TbTrendingUp,
    TbDownload,
} from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import { salaryAdvanceService, SalaryAdvanceDashboardResponse } from '../../services/salaryAdvanceService'

export default function SalaryAdvanceDashboard() {
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [data, setData] = useState<SalaryAdvanceDashboardResponse['data'] | null>(null)
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true)
            const response = await salaryAdvanceService.getDashboard({
                year: parseInt(selectedYear),
                month: parseInt(selectedMonth),
            })
            if (response.success) {
                setData(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error)
        } finally {
            setLoading(false)
        }
    }, [selectedYear, selectedMonth])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            await salaryAdvanceService.exportExcel({
                year: parseInt(selectedYear),
                month: parseInt(selectedMonth),
            })
            notifications.show({
                title: 'ส่งออกสำเร็จ',
                message: 'ไฟล์ Excel ถูกดาวน์โหลดเรียบร้อยแล้ว',
                color: 'green',
                icon: <TbDownload size={16} />,
            })
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

    const monthOptions = [
        { value: '1', label: 'มกราคม' },
        { value: '2', label: 'กุมภาพันธ์' },
        { value: '3', label: 'มีนาคม' },
        { value: '4', label: 'เมษายน' },
        { value: '5', label: 'พฤษภาคม' },
        { value: '6', label: 'มิถุนายน' },
        { value: '7', label: 'กรกฎาคม' },
        { value: '8', label: 'สิงหาคม' },
        { value: '9', label: 'กันยายน' },
        { value: '10', label: 'ตุลาคม' },
        { value: '11', label: 'พฤศจิกายน' },
        { value: '12', label: 'ธันวาคม' },
    ]

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = new Date().getFullYear() - i
        return { value: String(y), label: `${y + 543}` }
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    if (loading) {
        return (
            <Center py="xl">
                <Loader size="lg" />
            </Center>
        )
    }

    if (!data) {
        return (
            <Center py="xl">
                <Text c="dimmed">ไม่สามารถโหลดข้อมูล Dashboard ได้</Text>
            </Center>
        )
    }

    const { salary_advance, document_requests } = data
    const sa = salary_advance.summary
    const doc = document_requests.summary

    const totalRequests = sa.total_requests || 1 // prevent division by zero
    const approvedPct = Math.round((sa.approved_count / totalRequests) * 100)
    const pendingPct = Math.round((sa.pending_count / totalRequests) * 100)
    const rejectedPct = Math.round((sa.rejected_count / totalRequests) * 100)

    return (
        <Stack gap="lg">
            {/* Filters + Export */}
            <Group justify="space-between">
                <Group>
                    <Select
                        label="เดือน"
                        data={monthOptions}
                        value={selectedMonth}
                        onChange={(v) => v && setSelectedMonth(v)}
                        w={160}
                    />
                    <Select
                        label="ปี"
                        data={yearOptions}
                        value={selectedYear}
                        onChange={(v) => v && setSelectedYear(v)}
                        w={120}
                    />
                </Group>
                <Button
                    leftSection={<TbDownload size={18} />}
                    color="green"
                    variant="light"
                    loading={exporting}
                    onClick={handleExportExcel}
                    radius="lg"
                    mt="auto"
                >
                    ส่งออก Excel
                </Button>
            </Group>

            {/* Salary Advance Stats */}
            <Title order={4}>
                <Group gap="xs">
                    <TbCash size={22} />
                    สรุปการขอเบิกเงินเดือน
                </Group>
            </Title>

            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>คำขอทั้งหมด</Text>
                            <Text size="xl" fw={700}>{sa.total_requests}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="blue">
                            <TbFileText size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-yellow-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>รออนุมัติ</Text>
                            <Text size="xl" fw={700} c="yellow.7">{sa.pending_count}</Text>
                            <Text size="xs" c="dimmed">{formatCurrency(sa.total_pending_amount)}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="yellow">
                            <TbClock size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>อนุมัติแล้ว</Text>
                            <Text size="xl" fw={700} c="green.7">{sa.approved_count}</Text>
                            <Text size="xs" c="dimmed">{formatCurrency(sa.total_approved_amount)}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="green">
                            <TbCheck size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>ไม่อนุมัติ</Text>
                            <Text size="xl" fw={700} c="red.7">{sa.rejected_count}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="red">
                            <TbX size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>

            {/* Ring Progress + Top Requesters */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
                {/* Approval Status Ring */}
                <Paper p="lg" withBorder>
                    <Text fw={600} mb="md">สัดส่วนสถานะคำขอเบิก</Text>
                    <Center>
                        <RingProgress
                            size={180}
                            thickness={20}
                            roundCaps
                            sections={sa.total_requests > 0 ? [
                                { value: approvedPct, color: 'green', tooltip: `อนุมัติ ${approvedPct}%` },
                                { value: pendingPct, color: 'yellow', tooltip: `รออนุมัติ ${pendingPct}%` },
                                { value: rejectedPct, color: 'red', tooltip: `ไม่อนุมัติ ${rejectedPct}%` },
                            ] : [{ value: 100, color: 'gray.2' }]}
                            label={
                                <Center>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text size="xl" fw={700}>{sa.total_requests}</Text>
                                        <Text size="xs" c="dimmed">คำขอ</Text>
                                    </div>
                                </Center>
                            }
                        />
                    </Center>
                    <Group justify="center" mt="md" gap="lg">
                        <Group gap="xs"><Badge color="green" size="xs" circle /> <Text size="sm">อนุมัติ</Text></Group>
                        <Group gap="xs"><Badge color="yellow" size="xs" circle /> <Text size="sm">รออนุมัติ</Text></Group>
                        <Group gap="xs"><Badge color="red" size="xs" circle /> <Text size="sm">ไม่อนุมัติ</Text></Group>
                    </Group>
                </Paper>

                {/* Top Requesters */}
                <Paper p="lg" withBorder>
                    <Text fw={600} mb="md">
                        <Group gap="xs">
                            <TbTrendingUp size={18} />
                            พนักงานที่ขอเบิกเงินเดือนมากที่สุด
                        </Group>
                    </Text>
                    {salary_advance.top_requesters.length === 0 ? (
                        <Center py="lg">
                            <Text c="dimmed" size="sm">ไม่มีข้อมูล</Text>
                        </Center>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>พนักงาน</Table.Th>
                                    <Table.Th ta="center">จำนวนครั้ง</Table.Th>
                                    <Table.Th ta="right">ยอดรวม</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {salary_advance.top_requesters.map((emp) => (
                                    <Table.Tr key={emp.employee_id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar size="sm" radius="xl" color="orange">
                                                    {(emp.employee_nick_name || emp.employee_name || '?')[0]}
                                                </Avatar>
                                                <div>
                                                    <Text size="sm" fw={500}>{emp.employee_name}</Text>
                                                    <Text size="xs" c="dimmed">{emp.employee_position}</Text>
                                                </div>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Badge variant="light">{emp.request_count}</Badge>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm" fw={600}>{formatCurrency(emp.total_amount)}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </SimpleGrid>

            {/* Document Requests Stats */}
            <Title order={4} mt="md">
                <Group gap="xs">
                    <TbFileDescription size={22} />
                    สรุปการขอเอกสาร
                </Group>
            </Title>

            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-violet-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>คำขอเอกสารทั้งหมด</Text>
                            <Text size="xl" fw={700}>{doc.total_requests}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="violet">
                            <TbFileDescription size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-yellow-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>รออนุมัติ</Text>
                            <Text size="xl" fw={700} c="yellow.7">{doc.pending_count}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="yellow">
                            <TbClock size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-teal-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>รับรองการทำงาน</Text>
                            <Text size="xl" fw={700} c="teal.7">{doc.cert_work_count}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="teal">
                            <TbFileText size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper p="lg" withBorder style={{ borderLeft: '4px solid var(--mantine-color-indigo-6)' }}>
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>รับรองเงินเดือน</Text>
                            <Text size="xl" fw={700} c="indigo.7">{doc.cert_salary_count}</Text>
                        </div>
                        <ThemeIcon size="xl" radius="xl" variant="light" color="indigo">
                            <TbCash size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>
        </Stack>
    )
}
