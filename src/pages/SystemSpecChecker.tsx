/**
 * SystemSpecChecker — เช็คสเปคเครื่องตัวเอง + ข้อมูล Windows User
 * รัน PowerShell script เพื่อเก็บข้อมูลสเปคเครื่องคอมพิวเตอร์ + User Info
 */
import { useState, useEffect, useCallback } from 'react'
import {
    Container, Title, Text, Button, Group, Stack, Card, Badge,
    Grid, Box, CopyButton, Code, Paper, ThemeIcon, Divider,
    Loader, Alert, Tabs,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
    TbCpu, TbDeviceDesktop, TbDeviceSdCard, TbBrandWindows,
    TbNetwork, TbRefresh, TbCopy, TbCheck, TbTerminal2,
    TbInfoCircle, TbServer, TbUser, TbShield,
    TbFileSpreadsheet, TbFileText,
} from 'react-icons/tb'
import api from '../services/api'

interface RamSlot {
    slot: string
    size: string
    speed: string
    type: string
}

interface StorageDrive {
    model: string
    size: string
    type: string
}

interface SystemSpecData {
    hostname: string
    os_name: string
    os_version: string
    cpu_name: string
    cpu_cores: number
    cpu_threads: number
    ram_total_gb: number
    ram_type: string
    ram_speed_mhz: number
    ram_slots: RamSlot[]
    gpu_name: string
    gpu_vram: string
    storage_info: StorageDrive[]
    serial_number: string
    manufacturer: string
    model: string
    ip_address: string
    mac_address: string
    collected_at: string
}

interface UserInfoData {
    username: string
    domain: string
    full_name: string
    sid: string
    is_admin: boolean
    groups: string[]
    login_time: string
    login_method: string
    profile_path: string
    account_type: string
    ms_email: string
    ms_display_name: string
}

export default function SystemSpecChecker() {
    const [specs, setSpecs] = useState<SystemSpecData | null>(null)
    const [userInfo, setUserInfo] = useState<UserInfoData | null>(null)
    const [loading, setLoading] = useState(true)
    const [command, setCommand] = useState('')
    const [generating, setGenerating] = useState(false)
    const [polling, setPolling] = useState(false)

    const fetchSpecs = useCallback(async () => {
        try {
            const res = await api.get('/system-specs/me')
            if (res.data.success && res.data.data) {
                setSpecs(res.data.data)
                setPolling(false)
                setCommand('')
                return true
            }
            return false
        } catch {
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchUserInfo = useCallback(async () => {
        try {
            const res = await api.get('/system-specs/user-info')
            if (res.data.success && res.data.data) {
                setUserInfo(res.data.data)
            }
        } catch { /* user info is optional */ }
    }, [])

    useEffect(() => {
        fetchSpecs()
        fetchUserInfo()
    }, [fetchSpecs, fetchUserInfo])

    // Poll for specs + user info after generating command
    useEffect(() => {
        if (!polling) return
        const interval = setInterval(async () => {
            const found = await fetchSpecs()
            if (found) {
                await fetchUserInfo()
                setPolling(false)
                notifications.show({ title: '✅ สำเร็จ', message: 'ได้รับข้อมูลสเปคเครื่อง + User Info เรียบร้อย!', color: 'green' })
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [polling, fetchSpecs, fetchUserInfo])

    const handleGenerateCommand = async () => {
        setGenerating(true)
        try {
            const res = await api.post('/system-specs/generate-command')
            if (res.data.success) {
                setCommand(res.data.data.command)
                setPolling(true)
                notifications.show({ title: 'สร้างคำสั่งสำเร็จ', message: 'Copy คำสั่งแล้วไปรันใน PowerShell ได้เลย', color: 'blue' })
            }
        } catch {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถสร้างคำสั่งได้', color: 'red' })
        } finally {
            setGenerating(false)
        }
    }

    // ── Export Functions ──
    const buildExportData = () => {
        const lines: string[] = []
        const addLine = (label: string, value: string) => lines.push(`${label}: ${value}`)
        const addSection = (title: string) => { lines.push(''); lines.push(`=== ${title} ===`) }

        if (specs) {
            addSection('HARDWARE SPECS')
            addLine('Hostname', specs.hostname)
            addLine('Manufacturer', specs.manufacturer)
            addLine('Model', specs.model)
            addLine('S/N', specs.serial_number)
            addLine('CPU', specs.cpu_name)
            addLine('CPU Cores', `${specs.cpu_cores}`)
            addLine('CPU Threads', `${specs.cpu_threads}`)
            addLine('RAM Total', `${specs.ram_total_gb} GB`)
            addLine('RAM Type', specs.ram_type)
            addLine('RAM Speed', `${specs.ram_speed_mhz} MHz`)
            if (Array.isArray(specs.ram_slots)) {
                specs.ram_slots.forEach((slot, i) => {
                    addLine(`RAM Slot ${i + 1}`, `${slot.slot} - ${slot.size} ${slot.type} @ ${slot.speed}`)
                })
            }
            addLine('GPU', specs.gpu_name)
            addLine('GPU VRAM', specs.gpu_vram)
            if (Array.isArray(specs.storage_info)) {
                specs.storage_info.forEach((disk, i) => {
                    addLine(`Storage ${i + 1}`, `${disk.model} - ${disk.size} (${disk.type})`)
                })
            }
            addLine('OS', specs.os_name)
            addLine('OS Version', specs.os_version)
            addLine('IP Address', specs.ip_address)
            addLine('MAC Address', specs.mac_address)
        }

        if (userInfo) {
            addSection('WINDOWS USER INFO')
            addLine('Username', userInfo.username)
            addLine('Domain', userInfo.domain)
            addLine('Full Name', userInfo.full_name)
            addLine('SID', userInfo.sid)
            addLine('Admin', userInfo.is_admin ? 'Yes' : 'No')
            addLine('Account Type', userInfo.account_type)
            addLine('Login Time', userInfo.login_time)
            addLine('Login Method', userInfo.login_method)
            addLine('Profile Path', userInfo.profile_path)
            if (Array.isArray(userInfo.groups)) {
                addLine('Groups', userInfo.groups.join('; '))
            }
            addLine('Microsoft Email', userInfo.ms_email)
            addLine('Microsoft Display Name', userInfo.ms_display_name)
        }

        return lines
    }

    const exportTxt = () => {
        const lines = buildExportData()
        const content = lines.join('\n')
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        downloadBlob(blob, `system-report_${specs?.hostname || 'unknown'}.txt`)
    }

    const exportCsv = () => {
        const lines = buildExportData()
        // Convert to CSV: "Field","Value"
        const csvRows = ['"Field","Value"']
        lines.forEach(line => {
            const match = line.match(/^(.+?):\s*(.*)$/)
            if (match) {
                csvRows.push(`"${match[1]}","${match[2]}"`)
            } else if (line.startsWith('===')) {
                csvRows.push(`"${line}",""`)
            }
        })
        const content = csvRows.join('\n')
        const bom = '\uFEFF' // UTF-8 BOM for Excel
        const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })
        downloadBlob(blob, `system-report_${specs?.hostname || 'unknown'}.csv`)
    }

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <Box py="xl" ta="center">
                <Loader size="lg" />
                <Text mt="md" c="dimmed">กำลังโหลดข้อมูล...</Text>
            </Box>
        )
    }

    return (
        <Container size="xl" py="lg">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>🖥️ เช็คสเปคเครื่องตัวเอง</Title>
                    <Text c="dimmed" size="sm">ตรวจสอบข้อมูลฮาร์ดแวร์ + Windows User สำหรับฝ่าย IT</Text>
                </div>
                {specs && (
                    <Group gap="xs">
                        <Button
                            variant="light"
                            color="green"
                            leftSection={<TbFileSpreadsheet size={18} />}
                            onClick={exportCsv}
                        >
                            Export CSV
                        </Button>
                        <Button
                            variant="light"
                            color="gray"
                            leftSection={<TbFileText size={18} />}
                            onClick={exportTxt}
                        >
                            Export TXT
                        </Button>
                        <Button
                            variant="light"
                            leftSection={<TbRefresh size={18} />}
                            onClick={handleGenerateCommand}
                            loading={generating}
                        >
                            เช็คใหม่
                        </Button>
                    </Group>
                )}
            </Group>

            {/* ── ยังไม่มีข้อมูล → แสดงปุ่มสร้างคำสั่ง ── */}
            {!specs && !command && (
                <Paper p="xl" radius="md" withBorder ta="center" maw={600} mx="auto" mt={60}>
                    <ThemeIcon size={80} radius="xl" variant="light" color="teal" mx="auto">
                        <TbTerminal2 size={40} />
                    </ThemeIcon>
                    <Title order={3} mt="lg">ยังไม่มีข้อมูลสเปคเครื่อง</Title>
                    <Text c="dimmed" mt="xs" mb="xl">
                        กดปุ่มด้านล่างเพื่อสร้างคำสั่ง PowerShell → Copy ไปรันบนเครื่องของคุณ → ข้อมูลจะแสดงที่นี่
                    </Text>
                    <Button
                        size="lg"
                        leftSection={<TbTerminal2 size={20} />}
                        onClick={handleGenerateCommand}
                        loading={generating}
                    >
                        สร้างคำสั่งเช็คสเปค
                    </Button>
                </Paper>
            )}

            {/* ── คำสั่ง PowerShell ── */}
            {command && (
                <Paper p="lg" radius="md" withBorder mb="xl" bg="dark.8">
                    <Group justify="space-between" mb="sm">
                        <Group gap="xs">
                            <TbTerminal2 size={20} color="white" />
                            <Text fw={600} c="white">คำสั่ง PowerShell</Text>
                        </Group>
                        <CopyButton value={command}>
                            {({ copied, copy }) => (
                                <Button
                                    color={copied ? 'green' : 'teal'}
                                    variant="light"
                                    size="sm"
                                    leftSection={copied ? <TbCheck size={16} /> : <TbCopy size={16} />}
                                    onClick={copy}
                                >
                                    {copied ? 'Copied!' : 'Copy คำสั่ง'}
                                </Button>
                            )}
                        </CopyButton>
                    </Group>
                    <Code
                        block
                        p="md"
                        style={{
                            maxHeight: 120,
                            overflow: 'auto',
                            fontSize: 11,
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                            background: '#1a1b1e',
                            color: '#a9dc76',
                        }}
                    >
                        {command}
                    </Code>
                    <Alert mt="md" variant="light" color="blue" icon={<TbInfoCircle />}>
                        <Text size="sm">
                            <strong>วิธีใช้:</strong> 1) กดปุ่ม Copy คำสั่ง → 2) เปิด PowerShell บนเครื่องคุณ → 3) วาง (Ctrl+V) แล้วกด Enter → 4) ข้อมูลจะแสดงที่นี่อัตโนมัติ
                        </Text>
                    </Alert>
                    {polling && (
                        <Group mt="md" gap="xs" justify="center">
                            <Loader size="xs" />
                            <Text size="sm" c="dimmed">รอรับข้อมูลจากเครื่องของคุณ...</Text>
                        </Group>
                    )}
                </Paper>
            )}

            {/* ── แสดงข้อมูล (Tabs) ── */}
            {specs && (
                <>
                    <Text size="xs" c="dimmed" mb="md" ta="right">
                        อัปเดตล่าสุด: {new Date(specs.collected_at).toLocaleString('th-TH')}
                    </Text>

                    <Tabs defaultValue="specs" variant="outline">
                        <Tabs.List mb="md">
                            <Tabs.Tab value="specs" leftSection={<TbDeviceDesktop size={16} />}>
                                ฮาร์ดแวร์
                            </Tabs.Tab>
                            <Tabs.Tab
                                value="user"
                                leftSection={<TbUser size={16} />}
                                rightSection={userInfo ? <Badge size="xs" variant="filled" color="green" circle>✓</Badge> : null}
                            >
                                Windows User
                            </Tabs.Tab>
                        </Tabs.List>

                        {/* ── Tab: Hardware Specs ── */}
                        <Tabs.Panel value="specs">
                            <Grid gutter="md">
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbDeviceDesktop />}
                                        title="ข้อมูลเครื่อง"
                                        color="teal"
                                        items={[
                                            { label: 'ยี่ห้อ', value: specs.manufacturer || '-' },
                                            { label: 'รุ่น', value: specs.model || '-' },
                                            { label: 'S/N', value: specs.serial_number || '-' },
                                            { label: 'Hostname', value: specs.hostname || '-' },
                                        ]}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbCpu />}
                                        title="CPU (โปรเซสเซอร์)"
                                        color="blue"
                                        items={[
                                            { label: 'รุ่น', value: specs.cpu_name || '-' },
                                            { label: 'Cores', value: `${specs.cpu_cores || '-'} cores` },
                                            { label: 'Threads', value: `${specs.cpu_threads || '-'} threads` },
                                        ]}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbCpu />}
                                        title="RAM (หน่วยความจำ)"
                                        color="grape"
                                        items={[
                                            { label: 'ขนาดรวม', value: `${specs.ram_total_gb || '-'} GB` },
                                            { label: 'ชนิด', value: specs.ram_type || '-' },
                                            { label: 'ความเร็ว', value: specs.ram_speed_mhz ? `${specs.ram_speed_mhz} MHz` : '-' },
                                        ]}
                                    >
                                        {Array.isArray(specs.ram_slots) && specs.ram_slots.length > 0 && (
                                            <>
                                                <Divider my="xs" label="Slots" labelPosition="left" />
                                                {specs.ram_slots.map((slot, i) => (
                                                    <Group key={i} justify="space-between" py={4}>
                                                        <Text size="xs" c="dimmed">{slot.slot}</Text>
                                                        <Badge size="sm" variant="light">{slot.size} {slot.type} @ {slot.speed}</Badge>
                                                    </Group>
                                                ))}
                                            </>
                                        )}
                                    </SpecCard>
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbServer />}
                                        title="GPU (การ์ดจอ)"
                                        color="orange"
                                        items={[
                                            { label: 'รุ่น', value: specs.gpu_name || '-' },
                                            { label: 'VRAM', value: specs.gpu_vram || '-' },
                                        ]}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbDeviceSdCard />}
                                        title="Storage (ที่เก็บข้อมูล)"
                                        color="cyan"
                                        items={[]}
                                    >
                                        {Array.isArray(specs.storage_info) && specs.storage_info.length > 0 ? (
                                            specs.storage_info.map((disk, i) => (
                                                <Group key={i} justify="space-between" py={6}>
                                                    <Text size="sm" lineClamp={1} maw={200}>{disk.model || 'Drive ' + (i + 1)}</Text>
                                                    <Group gap="xs">
                                                        <Badge size="sm" variant="light" color={disk.type === 'SSD' ? 'green' : 'gray'}>{disk.type}</Badge>
                                                        <Badge size="sm" variant="outline">{disk.size}</Badge>
                                                    </Group>
                                                </Group>
                                            ))
                                        ) : (
                                            <Text size="sm" c="dimmed">ไม่พบข้อมูล</Text>
                                        )}
                                    </SpecCard>
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbBrandWindows />}
                                        title="ระบบปฏิบัติการ"
                                        color="indigo"
                                        items={[
                                            { label: 'OS', value: specs.os_name || '-' },
                                            { label: 'Version', value: specs.os_version || '-' },
                                        ]}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <SpecCard
                                        icon={<TbNetwork />}
                                        title="เครือข่าย"
                                        color="pink"
                                        items={[
                                            { label: 'IP Address', value: specs.ip_address || '-' },
                                            { label: 'MAC Address', value: specs.mac_address || '-' },
                                        ]}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Tabs.Panel>

                        {/* ── Tab: Windows User Info ── */}
                        <Tabs.Panel value="user">
                            {userInfo ? (
                                <Grid gutter="md">
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <SpecCard
                                            icon={<TbUser />}
                                            title="ข้อมูลบัญชี"
                                            color="teal"
                                            items={[
                                                { label: 'Username', value: userInfo.username },
                                                { label: 'Domain', value: userInfo.domain },
                                                { label: 'Full Name', value: userInfo.full_name },
                                                { label: 'Account Type', value: userInfo.account_type },
                                                { label: 'Profile Path', value: userInfo.profile_path },
                                            ]}
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <SpecCard
                                            icon={<TbShield />}
                                            title="สิทธิ์และความปลอดภัย"
                                            color={userInfo.is_admin ? 'red' : 'green'}
                                            items={[
                                                { label: 'SID', value: userInfo.sid },
                                                { label: 'Admin', value: userInfo.is_admin ? '✅ Yes (Administrator)' : '❌ No (Standard User)' },
                                                { label: 'Login Time', value: userInfo.login_time },
                                                { label: 'Login Method', value: userInfo.login_method },
                                            ]}
                                        />
                                    </Grid.Col>

                                    {/* Microsoft Account */}
                                    {userInfo.ms_email && userInfo.ms_email !== 'N/A' && (
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <SpecCard
                                                icon={<TbBrandWindows />}
                                                title="Microsoft Account"
                                                color="blue"
                                                items={[
                                                    { label: 'Email', value: userInfo.ms_email },
                                                    { label: 'Display Name', value: userInfo.ms_display_name || '-' },
                                                ]}
                                            />
                                        </Grid.Col>
                                    )}

                                    <Grid.Col span={12}>
                                        <Card shadow="sm" radius="md" withBorder>
                                            <Group gap="sm" mb="sm">
                                                <ThemeIcon size="md" variant="light" color="violet" radius="md">
                                                    <TbUser />
                                                </ThemeIcon>
                                                <Text fw={600} size="sm">Groups ({Array.isArray(userInfo.groups) ? userInfo.groups.length : 0})</Text>
                                            </Group>
                                            <Box
                                                style={{
                                                    maxHeight: 200,
                                                    overflow: 'auto',
                                                }}
                                            >
                                                <Stack gap={4}>
                                                    {Array.isArray(userInfo.groups) && userInfo.groups.length > 0 ? (
                                                        userInfo.groups.map((group, i) => (
                                                            <Badge key={i} variant="light" size="sm" style={{ width: 'fit-content' }}>
                                                                {group}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Text size="sm" c="dimmed">ไม่พบข้อมูล Groups</Text>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Card>
                                    </Grid.Col>
                                </Grid>
                            ) : (
                                <Paper p="xl" ta="center" withBorder radius="md">
                                    <ThemeIcon size={60} radius="xl" variant="light" color="gray" mx="auto">
                                        <TbUser size={30} />
                                    </ThemeIcon>
                                    <Text mt="md" c="dimmed">
                                        ยังไม่มีข้อมูล User Info — กดปุ่ม "เช็คใหม่" เพื่อเก็บข้อมูล
                                    </Text>
                                    <Text size="xs" c="dimmed" mt="xs">
                                        (ข้อมูล User Info เก็บอยู่ชั่วคราว 10 นาที ไม่บันทึกลงฐานข้อมูล)
                                    </Text>
                                </Paper>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </>
            )}
        </Container>
    )
}

/* ── Spec Card Component ── */
interface SpecCardProps {
    icon: React.ReactNode
    title: string
    color: string
    items: { label: string; value: string }[]
    children?: React.ReactNode
}

function SpecCard({ icon, title, color, items, children }: SpecCardProps) {
    return (
        <Card shadow="sm" radius="md" withBorder h="100%">
            <Group gap="sm" mb="sm">
                <ThemeIcon size="md" variant="light" color={color} radius="md">
                    {icon}
                </ThemeIcon>
                <Text fw={600} size="sm">{title}</Text>
            </Group>
            <Stack gap={4}>
                {items.map((item, i) => (
                    <Group key={i} justify="space-between" py={2}>
                        <Text size="sm" c="dimmed">{item.label}</Text>
                        <Text size="sm" fw={500} ta="right" maw="60%" lineClamp={1}>{item.value}</Text>
                    </Group>
                ))}
            </Stack>
            {children}
        </Card>
    )
}
