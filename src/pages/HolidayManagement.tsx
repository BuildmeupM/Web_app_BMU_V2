/**
 * Holiday Management Page
 * หน้าจัดการวันหยุดนักขัตฤกษ์สำหรับ Admin/HR
 */

import { useState, useMemo } from 'react'
import {
    Container,
    Title,
    Stack,
    Group,
    Button,
    Table,
    Badge,
    ActionIcon,
    Modal,
    TextInput,
    NumberInput,
    Switch,
    Text,
    Paper,
    LoadingOverlay,
    Alert,
    Menu,
    Select,
    SimpleGrid,
    Progress,
    Tooltip,
    Divider,
    ThemeIcon,
    RingProgress,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    TbPlus,
    TbEdit,
    TbTrash,
    TbCalendar,
    TbDots,
    TbAlertCircle,
    TbCheck,
} from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

import { useAuthStore } from '../store/authStore'
import * as holidayService from '../services/holidayService'
import type { Holiday } from '../services/holidayService'

dayjs.extend(buddhistEra)
dayjs.locale('th')

export default function HolidayManagement() {
    const user = useAuthStore((state) => state.user)
    const isAdmin = user?.role === 'admin' || user?.role === 'hr'
    const queryClient = useQueryClient()

    const [modalOpened, setModalOpened] = useState(false)
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear() + 543))
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form state
    const [formDate, setFormDate] = useState<Date | null>(null)
    const [formName, setFormName] = useState('')
    const [formNameEn, setFormNameEn] = useState('')
    const [formYear, setFormYear] = useState<number>(new Date().getFullYear() + 543)
    const [formActive, setFormActive] = useState(true)

    // Fetch holidays
    const { data: holidaysData, isLoading, error } = useQuery(
        ['holidays', selectedYear],
        () => holidayService.getHolidays(parseInt(selectedYear), false),
        { enabled: isAdmin }
    )

    // Create mutation
    const createMutation = useMutation(holidayService.createHoliday, {
        onSuccess: async (newHoliday) => {
            // Optimistic update: immediately add to cache for instant UI refresh
            queryClient.setQueryData(['holidays', selectedYear], (old: any) => {
                if (!old) return old
                const updatedHolidays = [...(old.data?.holidays || []), newHoliday]
                    .sort((a: Holiday, b: Holiday) => a.holiday_date.localeCompare(b.holiday_date))
                return {
                    ...old,
                    data: {
                        ...old.data,
                        holidays: updatedHolidays,
                        count: updatedHolidays.length,
                    }
                }
            })
            // Also refetch in background for consistency
            queryClient.invalidateQueries(['holidays'])
            notifications.show({
                title: 'สำเร็จ',
                message: 'เพิ่มวันหยุดเรียบร้อยแล้ว',
                color: 'green',
                icon: <TbCheck />,
            })
            handleCloseModal()
        },
        onError: (error: any) => {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error.response?.data?.message || 'ไม่สามารถเพิ่มวันหยุดได้',
                color: 'red',
            })
        },
    })

    // Update mutation
    const updateMutation = useMutation(
        ({ id, data }: { id: string; data: Partial<Holiday> }) => holidayService.updateHoliday(id, data),
        {
            onSuccess: async (updatedHoliday) => {
                // Optimistic update: replace updated holiday in cache
                queryClient.setQueryData(['holidays', selectedYear], (old: any) => {
                    if (!old) return old
                    const updatedHolidays = (old.data?.holidays || []).map((h: Holiday) =>
                        h.id === updatedHoliday.id ? updatedHoliday : h
                    ).sort((a: Holiday, b: Holiday) => a.holiday_date.localeCompare(b.holiday_date))
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            holidays: updatedHolidays,
                            count: updatedHolidays.length,
                        }
                    }
                })
                queryClient.invalidateQueries(['holidays'])
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'แก้ไขวันหยุดเรียบร้อยแล้ว',
                    color: 'green',
                    icon: <TbCheck />,
                })
                handleCloseModal()
            },
            onError: (error: any) => {
                notifications.show({
                    title: 'เกิดข้อผิดพลาด',
                    message: error.response?.data?.message || 'ไม่สามารถแก้ไขวันหยุดได้',
                    color: 'red',
                })
            },
        }
    )

    // Delete mutation
    const deleteMutation = useMutation(holidayService.deleteHoliday, {
        onSuccess: async (_data, deletedId) => {
            // Optimistic update: remove deleted holiday from cache
            queryClient.setQueryData(['holidays', selectedYear], (old: any) => {
                if (!old) return old
                const updatedHolidays = (old.data?.holidays || []).filter((h: Holiday) => h.id !== deletedId)
                return {
                    ...old,
                    data: {
                        ...old.data,
                        holidays: updatedHolidays,
                        count: updatedHolidays.length,
                    }
                }
            })
            queryClient.invalidateQueries(['holidays'])
            notifications.show({
                title: 'สำเร็จ',
                message: 'ลบวันหยุดเรียบร้อยแล้ว',
                color: 'green',
                icon: <TbCheck />,
            })
        },
        onError: (error: any) => {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error.response?.data?.message || 'ไม่สามารถลบวันหยุดได้',
                color: 'red',
            })
        },
    })

    const handleOpenModal = (holiday?: Holiday) => {
        if (holiday) {
            setEditingHoliday(holiday)
            setFormDate(new Date(holiday.holiday_date))
            setFormName(holiday.name)
            setFormNameEn(holiday.name_en || '')
            setFormYear(holiday.year)
            setFormActive(holiday.is_active)
        } else {
            setEditingHoliday(null)
            setFormDate(null)
            setFormName('')
            setFormNameEn('')
            setFormYear(new Date().getFullYear() + 543)
            setFormActive(true)
        }
        setModalOpened(true)
    }

    const handleCloseModal = () => {
        setModalOpened(false)
        setEditingHoliday(null)
        setFormDate(null)
        setFormName('')
        setFormNameEn('')
        setFormYear(new Date().getFullYear() + 543)
        setFormActive(true)
    }

    const handleSubmit = () => {
        if (!formDate || !formName || !formYear) {
            notifications.show({
                title: 'กรุณากรอกข้อมูลให้ครบ',
                message: 'วันที่, ชื่อวันหยุด และ ปี เป็นข้อมูลที่จำเป็น',
                color: 'orange',
            })
            return
        }

        const dateStr = dayjs(formDate).format('YYYY-MM-DD')

        if (editingHoliday) {
            updateMutation.mutate({
                id: editingHoliday.id,
                data: {
                    holiday_date: dateStr,
                    name: formName,
                    name_en: formNameEn || undefined,
                    year: formYear,
                    is_active: formActive,
                },
            })
        } else {
            createMutation.mutate({
                holiday_date: dateStr,
                name: formName,
                name_en: formNameEn || undefined,
                year: formYear,
            })
        }
    }

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id)
    }

    const handleConfirmDelete = () => {
        if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId)
            setDeleteConfirmId(null)
        }
    }

    const handleToggleActive = (holiday: Holiday) => {
        updateMutation.mutate({
            id: holiday.id,
            data: { is_active: !holiday.is_active },
        })
    }

    // Access control
    if (!isAdmin) {
        return (
            <Container size="xl">
                <Alert icon={<TbAlertCircle />} title="ไม่มีสิทธิ์เข้าถึง" color="red">
                    คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หน้านี้สำหรับ Admin และ HR เท่านั้น
                </Alert>
            </Container>
        )
    }

    const holidays = holidaysData?.data?.holidays || []

    // Generate year options (current year - 1 to current year + 5)
    const currentYear = new Date().getFullYear() + 543
    const yearOptions = Array.from({ length: 7 }, (_, i) => ({
        value: String(currentYear - 1 + i),
        label: `พ.ศ. ${currentYear - 1 + i}`,
    }))

    // Thai month names
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
        'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
        'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const thaiMonthsShort = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
        'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
        'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]

    // Monthly color palette
    const monthColors = [
        '#ff6b35', '#e8590c', '#d9480f', '#f76707',
        '#fd7e14', '#f59f00', '#fab005', '#40c057',
        '#12b886', '#15aabf', '#228be6', '#7950f2'
    ]

    // Monthly summary computation
    const monthlySummary = useMemo(() => {
        const summary = Array.from({ length: 12 }, (_, i) => ({
            month: i,
            name: thaiMonths[i],
            shortName: thaiMonthsShort[i],
            count: 0,
            activeCount: 0,
            holidays: [] as typeof holidays,
            color: monthColors[i],
        }))

        holidays.forEach((h) => {
            const month = new Date(h.holiday_date).getMonth()
            summary[month].count++
            summary[month].holidays.push(h)
            if (h.is_active) summary[month].activeCount++
        })

        const maxCount = Math.max(...summary.map(s => s.count), 1)
        return { months: summary, maxCount }
    }, [holidays])

    // Quarter summary
    const quarterSummary = useMemo(() => {
        const quarters = [
            { label: 'Q1 (ม.ค.-มี.ค.)', months: [0, 1, 2], color: '#ff6b35' },
            { label: 'Q2 (เม.ย.-มิ.ย.)', months: [3, 4, 5], color: '#f59f00' },
            { label: 'Q3 (ก.ค.-ก.ย.)', months: [6, 7, 8], color: '#40c057' },
            { label: 'Q4 (ต.ค.-ธ.ค.)', months: [9, 10, 11], color: '#228be6' },
        ]
        return quarters.map(q => ({
            ...q,
            count: q.months.reduce((sum, m) => sum + monthlySummary.months[m].count, 0),
        }))
    }, [monthlySummary])

    return (
        <Container size="xl">
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between">
                    <Group gap="xs">
                        <TbCalendar size={28} color="#ff6b35" />
                        <Title order={1}>จัดการวันหยุดประจำปี</Title>
                    </Group>
                    <Group>
                        <Select
                            placeholder="เลือกปี"
                            data={yearOptions}
                            value={selectedYear}
                            onChange={(val) => val && setSelectedYear(val)}
                            w={150}
                        />
                        <Button
                            leftSection={<TbPlus size={18} />}
                            radius="lg"
                            onClick={() => handleOpenModal()}
                            style={{ backgroundColor: '#ff6b35' }}
                        >
                            เพิ่มวันหยุด
                        </Button>
                    </Group>
                </Group>

                {/* Stats */}
                <Group>
                    <Paper p="md" radius="md" withBorder>
                        <Group>
                            <Text size="sm" c="dimmed">จำนวนวันหยุดทั้งหมด</Text>
                            <Badge size="lg" color="orange">{holidays.length} วัน</Badge>
                        </Group>
                    </Paper>
                    <Paper p="md" radius="md" withBorder>
                        <Group>
                            <Text size="sm" c="dimmed">ใช้งานอยู่</Text>
                            <Badge size="lg" color="green">{holidays.filter(h => h.is_active).length} วัน</Badge>
                        </Group>
                    </Paper>
                </Group>

                {/* ========== Monthly Summary Dashboard ========== */}
                {holidays.length > 0 && (
                    <Paper withBorder radius="md" p="lg">
                        <Group justify="space-between" mb="md">
                            <Text fw={700} size="lg">📊 สรุปวันหยุดรายเดือน — พ.ศ. {selectedYear}</Text>
                        </Group>

                        {/* Quarterly Summary with RingProgress */}
                        <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
                            {quarterSummary.map((q) => (
                                <Paper
                                    key={q.label}
                                    p="md"
                                    radius="md"
                                    style={{
                                        background: `linear-gradient(135deg, ${q.color}12 0%, ${q.color}08 100%)`,
                                        border: `1px solid ${q.color}30`,
                                    }}
                                >
                                    <Group justify="space-between" align="center">
                                        <Stack gap={4}>
                                            <Text size="xs" c="dimmed" fw={600}>{q.label}</Text>
                                            <Text size="xl" fw={800} c={q.color}>{q.count} <Text span size="sm" fw={500} c="dimmed">วัน</Text></Text>
                                        </Stack>
                                        <RingProgress
                                            size={50}
                                            thickness={5}
                                            roundCaps
                                            sections={[{
                                                value: holidays.length > 0 ? (q.count / holidays.length) * 100 : 0,
                                                color: q.color,
                                            }]}
                                            label={
                                                <Text ta="center" size="xs" fw={700}>
                                                    {holidays.length > 0 ? Math.round((q.count / holidays.length) * 100) : 0}%
                                                </Text>
                                            }
                                        />
                                    </Group>
                                </Paper>
                            ))}
                        </SimpleGrid>

                        <Divider mb="md" />

                        {/* Monthly Grid - 12 months */}
                        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 6 }} spacing="sm">
                            {monthlySummary.months.map((m) => (
                                <Tooltip
                                    key={m.month}
                                    multiline
                                    w={220}
                                    position="bottom"
                                    withArrow
                                    label={
                                        m.holidays.length > 0
                                            ? m.holidays.map(h => `• ${dayjs(h.holiday_date).format('D')} ${m.shortName} — ${h.name}`).join('\n')
                                            : 'ไม่มีวันหยุด'
                                    }
                                    styles={{ tooltip: { whiteSpace: 'pre-line', fontSize: 12 } }}
                                >
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            border: m.count > 0 ? `1.5px solid ${m.color}50` : '1px solid #e9ecef',
                                            background: m.count > 0 ? `${m.color}08` : '#fafafa',
                                            cursor: 'default',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            if (m.count > 0) {
                                                e.currentTarget.style.transform = 'translateY(-2px)'
                                                e.currentTarget.style.boxShadow = `0 4px 12px ${m.color}20`
                                            }
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            e.currentTarget.style.transform = ''
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                    >
                                        <Stack gap={6}>
                                            <Group justify="space-between" align="center">
                                                <Text size="xs" fw={600} c={m.count > 0 ? m.color : 'dimmed'}>
                                                    {m.name}
                                                </Text>
                                                {m.count > 0 && (
                                                    <ThemeIcon size={22} radius="xl" color={m.color} variant="light">
                                                        <Text size="xs" fw={700}>{m.count}</Text>
                                                    </ThemeIcon>
                                                )}
                                            </Group>
                                            <Text size="xl" fw={800} ta="center" c={m.count > 0 ? undefined : 'dimmed'}>
                                                {m.count > 0 ? m.count : '—'}
                                            </Text>
                                            <Text size="xs" c="dimmed" ta="center">
                                                {m.count > 0 ? `${m.count} วันหยุด` : 'ไม่มีวันหยุด'}
                                            </Text>
                                            <Progress
                                                value={(m.count / monthlySummary.maxCount) * 100}
                                                color={m.color}
                                                size="xs"
                                                radius="xl"
                                                style={{ opacity: m.count > 0 ? 1 : 0.3 }}
                                            />
                                        </Stack>
                                    </Paper>
                                </Tooltip>
                            ))}
                        </SimpleGrid>
                    </Paper>
                )}

                {/* Table */}
                <Paper withBorder radius="md" p="md" pos="relative">
                    <LoadingOverlay visible={isLoading} />

                    {error ? (
                        <Alert icon={<TbAlertCircle />} title="เกิดข้อผิดพลาด" color="red">
                            ไม่สามารถโหลดข้อมูลวันหยุดได้
                        </Alert>
                    ) : holidays.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">
                            ยังไม่มีวันหยุดในปี พ.ศ. {selectedYear}
                        </Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>วันที่</Table.Th>
                                    <Table.Th>ชื่อวันหยุด (ไทย)</Table.Th>
                                    <Table.Th>ชื่อวันหยุด (อังกฤษ)</Table.Th>
                                    <Table.Th>ปี</Table.Th>
                                    <Table.Th>สถานะ</Table.Th>
                                    <Table.Th w={100}></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {holidays.map((holiday) => (
                                    <Table.Tr key={holiday.id}>
                                        <Table.Td>
                                            <Text fw={500}>
                                                {dayjs(holiday.holiday_date).format('D MMMM BBBB')}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(holiday.holiday_date).format('dddd')}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>{holiday.name}</Table.Td>
                                        <Table.Td>
                                            <Text c={holiday.name_en ? undefined : 'dimmed'}>
                                                {holiday.name_en || '-'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>พ.ศ. {holiday.year}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={holiday.is_active ? 'green' : 'gray'}
                                                variant="light"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleToggleActive(holiday)}
                                            >
                                                {holiday.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Menu withinPortal position="bottom-end" shadow="sm">
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle" color="gray">
                                                        <TbDots size={18} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<TbEdit size={16} />}
                                                        onClick={() => handleOpenModal(holiday)}
                                                    >
                                                        แก้ไข
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<TbTrash size={16} />}
                                                        color="red"
                                                        onClick={() => handleDelete(holiday.id)}
                                                    >
                                                        ลบ
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>

            {/* Add/Edit Modal */}
            <Modal
                opened={modalOpened}
                onClose={handleCloseModal}
                title={editingHoliday ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'}
                size="md"
            >
                <Stack gap="md">
                    <DatePickerInput
                        label="วันที่"
                        placeholder="เลือกวันที่"
                        value={formDate}
                        onChange={setFormDate}
                        required
                        locale="th"
                        valueFormat="D MMMM YYYY"
                    />

                    <TextInput
                        label="ชื่อวันหยุด (ไทย)"
                        placeholder="เช่น วันขึ้นปีใหม่"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                    />

                    <TextInput
                        label="ชื่อวันหยุด (อังกฤษ)"
                        placeholder="เช่น New Year's Day"
                        value={formNameEn}
                        onChange={(e) => setFormNameEn(e.target.value)}
                    />

                    <NumberInput
                        label="ปี (พ.ศ.)"
                        placeholder="เช่น 2569"
                        value={formYear}
                        onChange={(val) => setFormYear(typeof val === 'number' ? val : currentYear)}
                        min={2500}
                        max={2600}
                        required
                    />

                    {editingHoliday && (
                        <Switch
                            label="เปิดใช้งาน"
                            checked={formActive}
                            onChange={(e) => setFormActive(e.currentTarget.checked)}
                        />
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={handleCloseModal}>
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={createMutation.isLoading || updateMutation.isLoading}
                            style={{ backgroundColor: '#ff6b35' }}
                        >
                            {editingHoliday ? 'บันทึก' : 'เพิ่ม'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title="ยืนยันการลบ"
                size="sm"
                centered
            >
                <Stack gap="md">
                    <Text>คุณแน่ใจหรือไม่ที่จะลบวันหยุดนี้?</Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => setDeleteConfirmId(null)}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="red"
                            onClick={handleConfirmDelete}
                            loading={deleteMutation.isLoading}
                        >
                            ลบ
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container >
    )
}
