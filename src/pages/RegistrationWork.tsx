/**
 * Registration Work — Dashboard งานทะเบียน
 * Analytics Dashboard — Style 2: Gradient Fill
 * แสดง KPI, Charts, Workload, Messenger Summary, Recent Tasks
 */

import { useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import {
    Container, Title, Stack, Card, Group, Text, Badge, Box, SimpleGrid,
    ThemeIcon, Paper, Progress, RingProgress, Table, Tooltip, Loader,
    Center, Skeleton, ActionIcon, Modal,
} from '@mantine/core'
import {
    TbClipboardData, TbBuildingBank, TbReceiptTax, TbShieldCheck, TbUsers,
    TbArrowRight, TbCircleDot, TbClock, TbCircleCheck, TbCash, TbUser,
    TbCalendar, TbBriefcase, TbTruck, TbMapPin, TbRoute, TbRefresh,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import {
    registrationTaskService,
    type DashboardSummary,
    type RegistrationTask,
} from '../services/registrationTaskService'

// Department config
const DEPT_CONFIG: Record<string, { label: string; shortLabel: string; color: string; gradient: string; icon: any; path: string }> = {
    dbd: { label: 'กรมพัฒนาธุรกิจการค้า', shortLabel: 'DBD', color: '#6a1b9a', gradient: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 50%, #ce93d8 100%)', icon: TbBuildingBank, path: '/registration-work/dbd' },
    rd: { label: 'กรมสรรพากร', shortLabel: 'RD', color: '#2e7d32', gradient: 'linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%)', icon: TbReceiptTax, path: '/registration-work/rd' },
    sso: { label: 'ประกันสังคม', shortLabel: 'SSO', color: '#1565c0', gradient: 'linear-gradient(135deg, #1565c0 0%, #1e88e5 50%, #42a5f5 100%)', icon: TbShieldCheck, path: '/registration-work/sso' },
    hr: { label: 'ฝ่ายบุคคล HR', shortLabel: 'HR', color: '#c62828', gradient: 'linear-gradient(135deg, #c62828 0%, #e53935 50%, #ef5350 100%)', icon: TbUsers, path: '/registration-work/hr' },
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#ff9800',
    in_progress: '#2196f3',
    completed: '#4caf50',
}

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
    paid_full: { label: 'ชำระเต็ม', color: '#4caf50' },
    deposit: { label: 'มัดจำ', color: '#ff9800' },
    free: { label: 'ไม่คิดค่าใช้จ่าย', color: '#9e9e9e' },
    unpaid: { label: 'ยังไม่ชำระ', color: '#f44336' },
}

export default function RegistrationWork() {
    const navigate = useNavigate()
    const [workloadDeptFilter, setWorkloadDeptFilter] = useState<string>('all')

    // Payment detail modal
    const [paymentModalOpened, setPaymentModalOpened] = useState(false)
    const [paymentModalLabel, setPaymentModalLabel] = useState<string>('')
    const [paymentTasks, setPaymentTasks] = useState<RegistrationTask[]>([])
    const [paymentLoading, setPaymentLoading] = useState(false)

    const openPaymentDetail = useCallback(async (statusKey: string, label: string) => {
        setPaymentModalLabel(label)
        setPaymentModalOpened(true)
        setPaymentLoading(true)
        try {
            const tasks = await registrationTaskService.getByPaymentStatus(statusKey)
            setPaymentTasks(tasks)
        } catch {
            setPaymentTasks([])
        } finally {
            setPaymentLoading(false)
        }
    }, [])

    const { data: summary, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<DashboardSummary>(
        'registration-dashboard-summary',
        () => registrationTaskService.getDashboardSummary(),
        { refetchInterval: 60000 },
    )

    const handleRefresh = useCallback(() => { refetch() }, [refetch])

    const lastUpdatedText = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : ''

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
        } catch { return dateStr }
    }

    if (isLoading || !summary) {
        return (
            <Container size="xl" py="md">
                <Stack gap="md">
                    <Skeleton height={90} radius="xl" />
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} height={100} radius="lg" />)}
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        {[1, 2].map(i => <Skeleton key={i} height={280} radius="lg" />)}
                    </SimpleGrid>
                </Stack>
            </Container>
        )
    }

    const { totals, byDepartment, payment, workload, recentTasks, messengerSummary } = summary

    // Total payment for percentage calc
    const totalPayment = payment.reduce((sum, p) => sum + p.count, 0)
    // Max workload for bar scale
    const maxWorkload = Math.max(...workload.map(w => w.total), 1)

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* ===== Header Banner ===== */}
                <Card
                    withBorder radius="xl" p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
                        border: 'none',
                    }}
                >
                    <Group gap="md">
                        <Box style={{
                            width: 56, height: 56, borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <TbClipboardData size={32} color="white" />
                        </Box>
                        <div style={{ flex: 1 }}>
                            <Title order={2} c="white" fw={700}>
                                Dashboard งานทะเบียน
                            </Title>
                            <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                ภาพรวมระบบจัดการงานทะเบียน ภาษี และประกันสังคม — ข้อมูลอัพเดทอัตโนมัติทุก 1 นาที
                            </Text>
                        </div>
                        {/* Refresh button + last updated */}
                        <Group gap="xs">
                            {lastUpdatedText && (
                                <Text size="xs" c="white" style={{ opacity: 0.7 }}>
                                    อัพเดทล่าสุด {lastUpdatedText}
                                </Text>
                            )}
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                radius="xl"
                                onClick={handleRefresh}
                                loading={isFetching}
                                styles={{
                                    root: {
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        color: 'white',
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                                    }
                                }}
                            >
                                <TbRefresh size={20} style={{
                                    animation: isFetching ? 'spin 1s linear infinite' : 'none',
                                }} />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Card>

                {/* ===== KPI Cards ===== */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    {[
                        { label: 'งานทั้งหมด', value: totals.all, icon: TbClipboardData, color: '#1565c0', bgColor: '#e3f2fd' },
                        { label: 'รอดำเนินการ', value: totals.pending, icon: TbClock, color: '#ff9800', bgColor: '#fff3e0' },
                        { label: 'กำลังดำเนินการ', value: totals.in_progress, icon: TbCircleDot, color: '#2196f3', bgColor: '#e3f2fd' },
                        { label: 'เสร็จสิ้น', value: totals.completed, icon: TbCircleCheck, color: '#4caf50', bgColor: '#e8f5e9' },
                    ].map((kpi) => (
                        <Card key={kpi.label} withBorder radius="lg" p="md"
                            style={{
                                transition: 'all 0.2s ease',
                                cursor: 'default',
                            }}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(-3px)'
                                e.currentTarget.style.boxShadow = `0 6px 20px ${kpi.color}25`
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = ''
                            }}
                        >
                            <Group gap="sm" justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">{kpi.label}</Text>
                                    <Text size="xl" fw={800} mt={4} style={{ color: kpi.color, fontSize: 32, lineHeight: 1 }}>
                                        {kpi.value.toLocaleString()}
                                    </Text>
                                </div>
                                <ThemeIcon size={48} radius="xl" style={{ backgroundColor: kpi.bgColor }}>
                                    <kpi.icon size={24} color={kpi.color} />
                                </ThemeIcon>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* ===== Section: Department Gradient Cards + Donut ===== */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {/* Department Status — Gradient Fill Cards with prominent sub-status */}
                    <Stack gap="sm">
                        <Group gap="xs" px={4}>
                            <TbBriefcase size={20} color="#1565c0" />
                            <Text fw={700} size="sm">สถานะงานแยกหน่วยงาน</Text>
                        </Group>
                        <SimpleGrid cols={2} spacing="sm">
                            {Object.entries(DEPT_CONFIG).map(([key, dept]) => {
                                const stats = byDepartment[key] || { pending: 0, in_progress: 0, completed: 0, total: 0 }
                                return (
                                    <Paper key={key}
                                        radius="xl" p="md"
                                        style={{
                                            cursor: 'pointer',
                                            background: dept.gradient,
                                            border: 'none',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            minHeight: 200,
                                        }}
                                        onClick={() => navigate(dept.path)}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
                                            e.currentTarget.style.boxShadow = `0 12px 32px ${dept.color}45`
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = ''
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                    >
                                        {/* Decorative circles */}
                                        <Box style={{
                                            position: 'absolute', top: -20, right: -20,
                                            width: 100, height: 100, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.08)',
                                        }} />
                                        <Box style={{
                                            position: 'absolute', bottom: -30, left: -15,
                                            width: 80, height: 80, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.05)',
                                        }} />

                                        {/* Header row */}
                                        <Group gap={8} mb={4}>
                                            <Box style={{
                                                width: 34, height: 34, borderRadius: 10,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <dept.icon size={18} color="white" />
                                            </Box>
                                            <div>
                                                <Text size="sm" fw={800} c="white">{dept.shortLabel}</Text>
                                                <Text size="xs" c="white" style={{ opacity: 0.75, lineHeight: 1.1 }}>{dept.label}</Text>
                                            </div>
                                        </Group>

                                        {/* Big total number */}
                                        <Text ta="center" fw={900} c="white" mt={2} mb={2}
                                            style={{ fontSize: 48, lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                                            {stats.total}
                                        </Text>
                                        <Text ta="center" size="xs" c="white" style={{ opacity: 0.7 }} mb="sm">
                                            งานทั้งหมด
                                        </Text>

                                        {/* ===== Sub-Status Bar Chart ===== */}
                                        <Stack gap={5}>
                                            {[
                                                { label: 'รอ', value: stats.pending, barColor: 'rgba(255,193,7,0.7)', emoji: '🟡' },
                                                { label: 'ดำเนินการ', value: stats.in_progress, barColor: 'rgba(33,150,243,0.7)', emoji: '🔵' },
                                                { label: 'เสร็จ', value: stats.completed, barColor: 'rgba(76,175,80,0.7)', emoji: '✅' },
                                            ].map(bar => (
                                                <Box key={bar.label}>
                                                    <Group justify="space-between" mb={2}>
                                                        <Text c="white" size="xs" fw={600} style={{ opacity: 0.9, fontSize: 10 }}>
                                                            {bar.emoji} {bar.label}
                                                        </Text>
                                                        <Text c="white" size="xs" fw={800} style={{ fontSize: 12 }}>
                                                            {bar.value}
                                                        </Text>
                                                    </Group>
                                                    <Box style={{
                                                        width: '100%',
                                                        height: 10,
                                                        borderRadius: 6,
                                                        backgroundColor: 'rgba(255,255,255,0.12)',
                                                        overflow: 'hidden',
                                                    }}>
                                                        <Box style={{
                                                            width: stats.total > 0 ? `${(bar.value / stats.total) * 100}%` : '0%',
                                                            height: '100%',
                                                            borderRadius: 6,
                                                            background: bar.barColor,
                                                            transition: 'width 0.5s ease',
                                                            minWidth: bar.value > 0 ? 8 : 0,
                                                        }} />
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Stack>

                                        {/* Arrow */}
                                        <Group justify="flex-end" mt={8}>
                                            <Box style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                backgroundColor: 'rgba(255,255,255,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <TbArrowRight size={14} color="white" />
                                            </Box>
                                        </Group>
                                    </Paper>
                                )
                            })}
                        </SimpleGrid>
                    </Stack>

                    {/* Donut Chart (RingProgress) */}
                    <Card withBorder radius="lg" p="md">
                        <Group gap="xs" mb="md">
                            <TbCircleDot size={20} color="#9c27b0" />
                            <Text fw={700} size="sm">สัดส่วนสถานะรวม</Text>
                        </Group>
                        <Center>
                            <RingProgress
                                size={200}
                                thickness={28}
                                roundCaps
                                sections={[
                                    { value: totals.all ? (totals.completed / totals.all) * 100 : 0, color: '#4caf50', tooltip: `เสร็จ ${totals.completed}` },
                                    { value: totals.all ? (totals.in_progress / totals.all) * 100 : 0, color: '#2196f3', tooltip: `ดำเนินการ ${totals.in_progress}` },
                                    { value: totals.all ? (totals.pending / totals.all) * 100 : 0, color: '#ff9800', tooltip: `รอ ${totals.pending}` },
                                ]}
                                label={
                                    <div style={{ textAlign: 'center' }}>
                                        <Text size="xl" fw={800} style={{ lineHeight: 1 }}>{totals.all}</Text>
                                        <Text size="xs" c="dimmed">งานทั้งหมด</Text>
                                    </div>
                                }
                            />
                        </Center>
                        <Group justify="center" mt="lg" gap="xl">
                            {[
                                { label: 'เสร็จสิ้น', count: totals.completed, color: '#4caf50', pct: totals.all ? Math.round((totals.completed / totals.all) * 100) : 0 },
                                { label: 'กำลังดำเนินการ', count: totals.in_progress, color: '#2196f3', pct: totals.all ? Math.round((totals.in_progress / totals.all) * 100) : 0 },
                                { label: 'รอดำเนินการ', count: totals.pending, color: '#ff9800', pct: totals.all ? Math.round((totals.pending / totals.all) * 100) : 0 },
                            ].map(item => (
                                <div key={item.label} style={{ textAlign: 'center' }}>
                                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color, margin: '0 auto 4px' }} />
                                    <Text size="xs" c="dimmed">{item.label}</Text>
                                    <Text size="sm" fw={700}>{item.count} ({item.pct}%)</Text>
                                </div>
                            ))}
                        </Group>
                        <Paper mt="lg" p="sm" radius="md" style={{ backgroundColor: '#f8f9fa', textAlign: 'center' }}>
                            <Group gap="xs" justify="center">
                                <TbUser size={18} color="#6a1b9a" />
                                <Text size="sm" c="dimmed">ลูกค้าทั้งหมด</Text>
                                <Text size="sm" fw={700} c="#6a1b9a">{totals.clients} ราย</Text>
                            </Group>
                        </Paper>
                    </Card>
                </SimpleGrid>

                {/* ===== Section: Payment Gradient + Workload ===== */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {/* Payment Status — Gradient Cards */}
                    <Stack gap="sm">
                        <Group gap="xs" px={4}>
                            <TbCash size={20} color="#f57c00" />
                            <Text fw={700} size="sm">สถานะการชำระเงิน</Text>
                        </Group>
                        <SimpleGrid cols={2} spacing="sm">
                            {[
                                { key: 'paid_full', icon: TbCircleCheck, label: 'ชำระเต็ม', gradient: 'linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%)', shadow: '#2e7d3240' },
                                { key: 'deposit', icon: TbCash, label: 'มัดจำ', gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ffb74d 100%)', shadow: '#e6510040' },
                                { key: 'free', icon: TbBriefcase, label: 'ไม่คิดค่าใช้จ่าย', gradient: 'linear-gradient(135deg, #546e7a 0%, #78909c 50%, #b0bec5 100%)', shadow: '#546e7a40' },
                                { key: 'unpaid', icon: TbClock, label: 'ยังไม่ชำระ', gradient: 'linear-gradient(135deg, #b71c1c 0%, #e53935 50%, #ef5350 100%)', shadow: '#b71c1c40' },
                            ].map(item => {
                                const found = payment.find(p => p.status === item.key)
                                const count = found?.count || 0
                                const pct = totalPayment ? Math.round((count / totalPayment) * 100) : 0
                                const IconComp = item.icon
                                return (
                                    <Paper key={item.key} radius="xl" p="md"
                                        style={{
                                            background: item.gradient,
                                            border: 'none',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            minHeight: 130,
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => openPaymentDetail(item.key, item.label)}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                                            e.currentTarget.style.boxShadow = `0 10px 28px ${item.shadow}`
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = ''
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                    >
                                        {/* Decorative circle */}
                                        <Box style={{
                                            position: 'absolute', top: -15, right: -15,
                                            width: 70, height: 70, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.1)',
                                        }} />
                                        <Box style={{
                                            position: 'absolute', bottom: -10, left: -10,
                                            width: 50, height: 50, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.06)',
                                        }} />

                                        <Group justify="space-between" align="flex-start">
                                            <Box style={{
                                                width: 38, height: 38, borderRadius: 12,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <IconComp size={20} color="white" />
                                            </Box>
                                            <Badge size="sm" radius="xl"
                                                styles={{ root: { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', border: 'none', fontWeight: 700 } }}>
                                                {pct}%
                                            </Badge>
                                        </Group>

                                        <Text fw={900} c="white" mt="sm"
                                            style={{ fontSize: 36, lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                                            {count}
                                        </Text>
                                        <Text size="sm" c="white" mt={4} style={{ opacity: 0.9 }} fw={600}>
                                            {item.label}
                                        </Text>
                                    </Paper>
                                )
                            })}
                        </SimpleGrid>
                    </Stack>

                    {/* Workload Summary — Card-based Design with Department Filter */}
                    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                        {/* Gradient header */}
                        <Box style={{
                            background: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
                            padding: '14px 18px',
                        }}>
                            <Group justify="space-between" align="center">
                                <Group gap="xs">
                                    <TbUsers size={20} color="white" />
                                    <Text fw={700} size="sm" c="white">สรุปงานตามผู้รับผิดชอบ</Text>
                                </Group>
                                <Text size="xs" c="white" style={{ opacity: 0.8 }}>ภาพรวมงานของพนักงานแต่ละคน</Text>
                            </Group>
                        </Box>

                        <Box p="md">
                            {/* Department filter chips */}
                            <Group gap="xs" mb="md">
                                {[
                                    { key: 'all', label: 'ทั้งหมด', color: '#455a64' },
                                    { key: 'dbd', label: 'DBD', color: '#6a1b9a' },
                                    { key: 'rd', label: 'RD', color: '#2e7d32' },
                                    { key: 'sso', label: 'SSO', color: '#1565c0' },
                                    { key: 'hr', label: 'HR', color: '#c62828' },
                                ].map(dept => (
                                    <Badge
                                        key={dept.key}
                                        size="md"
                                        radius="xl"
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: workloadDeptFilter === dept.key ? dept.color : '#f5f5f5',
                                            color: workloadDeptFilter === dept.key ? 'white' : '#666',
                                            border: workloadDeptFilter === dept.key ? 'none' : '1px solid #e0e0e0',
                                            transition: 'all 0.2s ease',
                                            fontWeight: 600,
                                            padding: '4px 14px',
                                        }}
                                        onClick={() => setWorkloadDeptFilter(dept.key)}
                                    >
                                        {dept.label}
                                    </Badge>
                                ))}
                            </Group>

                            {/* Person cards grid */}
                            {(() => {
                                // Filter and compute per-person stats based on selected dept
                                const filteredWorkload = workload.map(person => {
                                    if (workloadDeptFilter === 'all') return person
                                    const deptData = person.departments?.[workloadDeptFilter]
                                    if (!deptData) return null
                                    return { ...person, ...deptData }
                                }).filter(Boolean) as typeof workload

                                if (filteredWorkload.length === 0) {
                                    return <Center py="xl"><Text c="dimmed" size="sm">ยังไม่มีข้อมูล</Text></Center>
                                }

                                const AVATAR_COLORS = ['#e65100', '#6a1b9a', '#2e7d32', '#1565c0', '#c62828', '#00838f', '#4527a0', '#ef6c00', '#2e7d32', '#ad1457']

                                return (
                                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                        {filteredWorkload.map((person, idx) => {
                                            const completionPct = person.total > 0 ? Math.round((person.completed / person.total) * 100) : 0
                                            const initial = person.name?.charAt(0) || '?'
                                            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                                            const maxVal = Math.max(person.completed, person.in_progress, person.pending, 1)

                                            return (
                                                <Card key={person.name} withBorder radius="md" p="md"
                                                    style={{
                                                        transition: 'all 0.2s ease',
                                                        borderColor: '#eee',
                                                    }}
                                                >
                                                    {/* Top row: Avatar + Name + Ring */}
                                                    <Group justify="space-between" align="flex-start" mb="sm">
                                                        <Group gap="sm">
                                                            <Box style={{
                                                                width: 40, height: 40, borderRadius: '50%',
                                                                backgroundColor: avatarColor,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: 'white', fontWeight: 800, fontSize: 16,
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                            }}>
                                                                {initial}
                                                            </Box>
                                                            <div>
                                                                <Text size="sm" fw={700} style={{ lineHeight: 1.2 }}>{person.name}</Text>
                                                                <Text size="xs" c="dimmed">{person.total} งานทั้งหมด</Text>
                                                            </div>
                                                        </Group>
                                                        <RingProgress
                                                            size={44} thickness={5} roundCaps
                                                            sections={[{ value: completionPct, color: completionPct >= 80 ? '#4caf50' : completionPct >= 50 ? '#ff9800' : '#f44336' }]}
                                                            label={
                                                                <Text size="xs" fw={700} ta="center" style={{ fontSize: 10, color: completionPct >= 80 ? '#4caf50' : completionPct >= 50 ? '#ff9800' : '#f44336' }}>
                                                                    {completionPct}%
                                                                </Text>
                                                            }
                                                        />
                                                    </Group>

                                                    {/* Status bars */}
                                                    <Stack gap={6}>
                                                        {[
                                                            { label: 'เสร็จแล้ว', value: person.completed, color: '#4caf50', bgColor: '#e8f5e9' },
                                                            { label: 'กำลังทำ', value: person.in_progress, color: '#ff9800', bgColor: '#fff3e0' },
                                                            { label: 'รอดำเนิน', value: person.pending, color: '#f44336', bgColor: '#fce4ec' },
                                                        ].map(stat => (
                                                            <Group key={stat.label} gap="xs" wrap="nowrap">
                                                                <Text size="xs" c="dimmed" w={56} style={{ flexShrink: 0 }}>{stat.label}</Text>
                                                                <Box style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: stat.bgColor, overflow: 'hidden' }}>
                                                                    <Box style={{
                                                                        width: `${maxVal > 0 ? (stat.value / maxVal) * 100 : 0}%`,
                                                                        height: '100%',
                                                                        backgroundColor: stat.color,
                                                                        borderRadius: 4,
                                                                        transition: 'width 0.6s ease',
                                                                        minWidth: stat.value > 0 ? 8 : 0,
                                                                    }} />
                                                                </Box>
                                                                <Text size="xs" fw={700} w={20} ta="right" style={{ color: stat.color, flexShrink: 0 }}>
                                                                    {stat.value}
                                                                </Text>
                                                            </Group>
                                                        ))}
                                                    </Stack>
                                                </Card>
                                            )
                                        })}
                                    </SimpleGrid>
                                )
                            })()}
                        </Box>
                    </Card>
                </SimpleGrid>

                {/* ===== Messenger Route Summary ===== */}
                <Paper
                    radius="xl" p="lg"
                    style={{
                        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 30%, #1e88e5 60%, #42a5f5 100%)',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Decorative elements */}
                    <Box style={{
                        position: 'absolute', top: -30, right: -30,
                        width: 140, height: 140, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                    }} />
                    <Box style={{
                        position: 'absolute', bottom: -20, left: 60,
                        width: 100, height: 100, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)',
                    }} />
                    <Box style={{
                        position: 'absolute', top: 20, right: 200,
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                    }} />

                    {/* Header */}
                    <Group gap="xs" mb="md">
                        <Box style={{
                            width: 40, height: 40, borderRadius: 12,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <TbTruck size={22} color="white" />
                        </Box>
                        <div>
                            <Text fw={700} size="md" c="white">สรุปตารางวิ่งแมส</Text>
                            <Text size="xs" c="white" style={{ opacity: 0.7 }}>
                                ประจำเดือนนี้ — เดือน {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </Text>
                        </div>
                        <Box style={{ flex: 1 }} />
                        <Box
                            style={{
                                cursor: 'pointer',
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderRadius: 20,
                                padding: '6px 16px',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => navigate('/messenger-routes')}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
                            }}
                        >
                            <Group gap={4}>
                                <Text size="xs" c="white" fw={600}>ดูทั้งหมด</Text>
                                <TbArrowRight size={14} color="white" />
                            </Group>
                        </Box>
                    </Group>

                    {/* Stats Grid */}
                    <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="sm">
                        {[
                            { icon: TbRoute, value: messengerSummary?.total_routes || 0, label: 'ตารางวิ่งทั้งหมด', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                            { icon: TbCircleCheck, value: messengerSummary?.completed_routes || 0, label: 'เสร็จแล้ว', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                            { icon: TbTruck, value: messengerSummary?.active_routes || 0, label: 'กำลังวิ่ง', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                            { icon: TbCalendar, value: messengerSummary?.planned_routes || 0, label: 'รอวิ่ง', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                            { icon: TbMapPin, value: typeof messengerSummary?.total_distance === 'number' ? messengerSummary.total_distance.toFixed(0) : '0', label: 'กม. รวม', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                            { icon: TbClock, value: messengerSummary?.pending_tasks || 0, label: 'งานรอแมส', bg: 'rgba(255,167,38,0.3)', iconColor: 'white', labelColor: 'white' },
                        ].map((item) => {
                            const IconComp = item.icon
                            return (
                                <Box key={item.label} style={{
                                    backgroundColor: item.bg,
                                    borderRadius: 16,
                                    padding: '14px 10px',
                                    textAlign: 'center',
                                    backdropFilter: 'blur(4px)',
                                    border: '1.5px solid rgba(255,255,255,0.7)',
                                    transition: 'transform 0.2s ease, background-color 0.2s ease',
                                }}>
                                    <IconComp size={20} color={item.iconColor} />
                                    <Text c="white" fw={900} style={{ fontSize: 28, lineHeight: 1 }} mt={4}>
                                        {item.value}
                                    </Text>
                                    <Text c={item.labelColor} size="xs" mt={4} style={{ opacity: 0.85 }} fw={500}>
                                        {item.label}
                                    </Text>
                                </Box>
                            )
                        })}
                    </SimpleGrid>
                </Paper>

                {/* ===== Recent Tasks Table ===== */}
                <Card withBorder radius="lg" p="md">
                    <Group gap="xs" mb="md" justify="space-between">
                        <Group gap="xs">
                            <TbCalendar size={20} color="#37474f" />
                            <Text fw={700} size="sm">งานล่าสุด</Text>
                            <Badge size="xs" variant="light" color="gray">{recentTasks.length} รายการ</Badge>
                        </Group>
                    </Group>
                    {recentTasks.length === 0 ? (
                        <Center py="xl"><Text c="dimmed" size="sm">ยังไม่มีงาน</Text></Center>
                    ) : (
                        <Table highlightOnHover withTableBorder withColumnBorders={false}
                            styles={{
                                th: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' as const },
                                td: { fontSize: 13 },
                            }}
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>วันรับงาน</Table.Th>
                                    <Table.Th>ลูกค้า</Table.Th>
                                    <Table.Th>ประเภทงาน</Table.Th>
                                    <Table.Th>หน่วยงาน</Table.Th>
                                    <Table.Th>สถานะ</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {recentTasks.map((task) => {
                                    const deptCfg = DEPT_CONFIG[task.department]
                                    return (
                                        <Table.Tr
                                            key={task.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => deptCfg && navigate(deptCfg.path)}
                                        >
                                            <Table.Td>
                                                <Text size="sm">{formatDate(task.received_date)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>{task.client_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{(task as any).job_type_name || task.job_type}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {deptCfg && (
                                                    <Badge size="sm" variant="light" style={{
                                                        backgroundColor: deptCfg.color + '18',
                                                        color: deptCfg.color,
                                                        borderColor: deptCfg.color + '30',
                                                    }}>
                                                        {deptCfg.shortLabel}
                                                    </Badge>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : 'orange'}
                                                >
                                                    {STATUS_LABELS[task.status] || task.status}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    )}
                </Card>
            </Stack>

            {/* ===== Payment Detail Modal ===== */}
            <Modal
                opened={paymentModalOpened}
                onClose={() => setPaymentModalOpened(false)}
                title={
                    <Group gap="sm">
                        <TbCash size={20} color="#f57c00" />
                        <Text fw={700}>รายละเอียด — {paymentModalLabel}</Text>
                        <Badge size="sm" variant="light" color="orange">{paymentTasks.length} รายการ</Badge>
                    </Group>
                }
                size="xl"
                centered
                styles={{
                    header: { borderBottom: '1px solid #eee', paddingBottom: 12 },
                    body: { padding: '16px 20px' },
                }}
            >
                {paymentLoading ? (
                    <Center py="xl">
                        <Loader size="md" color="orange" />
                    </Center>
                ) : paymentTasks.length === 0 ? (
                    <Center py="xl">
                        <Text c="dimmed" size="sm">ไม่พบรายการงาน</Text>
                    </Center>
                ) : (
                    <Table highlightOnHover withTableBorder
                        styles={{
                            th: { fontSize: 12, fontWeight: 600, color: '#666' },
                            td: { fontSize: 13 },
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>วันรับงาน</Table.Th>
                                <Table.Th>ลูกค้า</Table.Th>
                                <Table.Th>ประเภทงาน</Table.Th>
                                <Table.Th>หน่วยงาน</Table.Th>
                                <Table.Th>สถานะงาน</Table.Th>
                                <Table.Th>ผู้รับผิดชอบ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {paymentTasks.map((task) => {
                                const deptCfg = DEPT_CONFIG[task.department]
                                return (
                                    <Table.Tr
                                        key={task.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setPaymentModalOpened(false)
                                            if (deptCfg) navigate(`${deptCfg.path}?task=${task.id}`)
                                        }}
                                    >
                                        <Table.Td>
                                            <Text size="sm">{formatDate(task.received_date)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{task.client_name}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{(task as any).job_type_name || task.job_type}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            {deptCfg && (
                                                <Badge size="sm" variant="light" style={{
                                                    backgroundColor: deptCfg.color + '18',
                                                    color: deptCfg.color,
                                                }}>
                                                    {deptCfg.shortLabel}
                                                </Badge>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color={task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : 'orange'}
                                            >
                                                {STATUS_LABELS[task.status] || task.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{task.responsible_name}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                )}
            </Modal>
        </Container>
    )
}
