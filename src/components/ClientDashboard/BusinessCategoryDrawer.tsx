/**
 * BusinessCategoryDrawer
 * Drawer แสดงประเภทย่อย → รายชื่อบริษัท (2 ระดับ)
 */

import {
    Drawer,
    Group,
    Text,
    Badge,
    Loader,
    Center,
    Table,
    ScrollArea,
    TextInput,
    Stack,
    Box,
    Paper,
    ActionIcon,
    Divider,
    ThemeIcon,
} from '@mantine/core'
import { TbBriefcase, TbSearch, TbArrowRight, TbArrowLeft, TbList } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useState, useMemo } from 'react'
import clientDashboardService from '../../services/clientDashboardService'
import { getCompanyStatusBadgeColor } from './constants'

interface BusinessCategoryDrawerProps {
    category: string | null
    color: string
    /** subcategory breakdown data from dashboard — passed from parent to avoid extra fetch */
    subcategories: Array<{ label: string; value: number; color: string }>
    opened: boolean
    onClose: () => void
}

const SUBCAT_COLORS = [
    '#42a5f5', '#ff8a65', '#81c784', '#ba68c8', '#4dd0e1',
    '#ffb74d', '#e57373', '#a1887f', '#90a4ae', '#7986cb',
]

export default function BusinessCategoryDrawer({
    category,
    color,
    subcategories,
    opened,
    onClose,
}: BusinessCategoryDrawerProps) {
    const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    // Fetch company list only when a subcategory (or "ทั้งหมด") is selected
    const fetchEnabled = !!category && opened && selectedSubcat !== null
    const { data: clients = [], isLoading: isLoadingClients } = useQuery(
        ['category-clients', category, selectedSubcat],
        () => clientDashboardService.getCategoryClients(
            category!,
            selectedSubcat === '__all__' ? undefined : selectedSubcat!
        ),
        { enabled: fetchEnabled, staleTime: 60_000 }
    )

    const filtered = useMemo(() => {
        if (!search.trim()) return clients
        const q = search.toLowerCase()
        return clients.filter(c =>
            c.company_name.toLowerCase().includes(q) ||
            c.build.toLowerCase().includes(q) ||
            (c.province || '').toLowerCase().includes(q)
        )
    }, [clients, search])

    const handleClose = () => {
        setSelectedSubcat(null)
        setSearch('')
        onClose()
    }

    const handleBack = () => {
        setSelectedSubcat(null)
        setSearch('')
    }

    // ── Title for the Drawer header ──────────────────────
    const drawerTitle = (
        <Group gap="sm" align="center">
            {selectedSubcat !== null && (
                <ActionIcon variant="subtle" color="gray" size="md" onClick={handleBack}>
                    <TbArrowLeft size={18} />
                </ActionIcon>
            )}
            <TbBriefcase size={20} color={color} />
            <Text fw={700} size="lg" lineClamp={1}>
                {selectedSubcat !== null && selectedSubcat !== '__all__'
                    ? selectedSubcat
                    : category || ''}
            </Text>
            {selectedSubcat !== null ? (
                <Badge size="lg" variant="light" style={{ backgroundColor: `${color}20`, color }}>
                    {clients.length} บริษัท
                </Badge>
            ) : (
                <Badge size="lg" variant="light" style={{ backgroundColor: `${color}20`, color }}>
                    {subcategories.reduce((sum, s) => sum + s.value, 0)} บริษัท
                </Badge>
            )}
        </Group>
    )

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            title={drawerTitle}
            position="right"
            size="xl"
            padding="lg"
            overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
        >
            {/* ── Level 1: Subcategory List ── */}
            {selectedSubcat === null && (
                <Stack gap="sm">
                    <Text size="xs" c="dimmed" mb={4}>เลือกประเภทย่อยเพื่อดูรายชื่อบริษัท</Text>

                    {/* "ทั้งหมด" option */}
                    <Paper
                        p="sm" radius="md" withBorder
                        style={{
                            borderLeft: `3px solid ${color}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateX(4px)'
                            e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateX(0)'
                            e.currentTarget.style.boxShadow = ''
                        }}
                        onClick={() => setSelectedSubcat('__all__')}
                    >
                        <Group justify="space-between">
                            <Group gap="xs">
                                <ThemeIcon size={28} radius="xl" style={{ background: color }} variant="filled">
                                    <TbList size={14} color="white" />
                                </ThemeIcon>
                                <Text size="sm" fw={600} c={color}>ดูทั้งหมด</Text>
                            </Group>
                            <Group gap={4}>
                                <Text fw={700} size="sm" c={color}>
                                    {subcategories.reduce((sum, s) => sum + s.value, 0)}
                                </Text>
                                <TbArrowRight size={14} color={color} />
                            </Group>
                        </Group>
                    </Paper>

                    <Divider label="หรือเลือกประเภทย่อย" labelPosition="center" />

                    <ScrollArea h="calc(100vh - 260px)">
                        <Stack gap="xs">
                            {subcategories.length === 0 ? (
                                <Center py="lg">
                                    <Text size="sm" c="dimmed">ไม่มีข้อมูลประเภทย่อย</Text>
                                </Center>
                            ) : (
                                subcategories.map((sub, i) => (
                                    <Paper
                                        key={i}
                                        p="sm" radius="md" withBorder
                                        style={{
                                            borderLeft: `3px solid ${sub.color || SUBCAT_COLORS[i % SUBCAT_COLORS.length]}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateX(4px)'
                                            e.currentTarget.style.boxShadow = `0 4px 12px ${sub.color}30`
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateX(0)'
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                        onClick={() => setSelectedSubcat(sub.label)}
                                    >
                                        <Group justify="space-between">
                                            <Text size="xs" lineClamp={1} style={{ maxWidth: '280px' }}>
                                                {sub.label}
                                            </Text>
                                            <Group gap={4}>
                                                <Text fw={700} size="sm" c={sub.color || SUBCAT_COLORS[i % SUBCAT_COLORS.length]}>
                                                    {sub.value}
                                                </Text>
                                                <TbArrowRight size={12} color={sub.color || SUBCAT_COLORS[i % SUBCAT_COLORS.length]} />
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))
                            )}
                        </Stack>
                    </ScrollArea>
                </Stack>
            )}

            {/* ── Level 2: Company List ── */}
            {selectedSubcat !== null && (
                <Stack gap="md">
                    {/* Breadcrumb */}
                    <Text size="xs" c="dimmed">
                        {category} {selectedSubcat !== '__all__' ? `→ ${selectedSubcat}` : '→ ทั้งหมด'}
                    </Text>

                    <TextInput
                        placeholder="ค้นหาชื่อบริษัท หรือ รหัส Build หรือ จังหวัด"
                        leftSection={<TbSearch size={16} />}
                        value={search}
                        onChange={e => setSearch(e.currentTarget.value)}
                        radius="xl"
                        size="sm"
                    />

                    {isLoadingClients ? (
                        <Center py="xl"><Loader color="teal" /></Center>
                    ) : (
                        <>
                            <Text size="xs" c="dimmed">
                                แสดง {filtered.length} จาก {clients.length} บริษัท
                            </Text>
                            <ScrollArea h="calc(100vh - 260px)">
                                <Box>
                                    {filtered.length === 0 ? (
                                        <Center py="xl">
                                            <Text size="sm" c="dimmed">ไม่พบข้อมูล</Text>
                                        </Center>
                                    ) : (
                                        <Table highlightOnHover stickyHeader>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th style={{ width: 40 }}>#</Table.Th>
                                                    <Table.Th>Build</Table.Th>
                                                    <Table.Th>ชื่อบริษัท</Table.Th>
                                                    <Table.Th ta="center">จังหวัด</Table.Th>
                                                    <Table.Th ta="center">สถานะ</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {filtered.map((client, i) => (
                                                    <Table.Tr key={client.build}>
                                                        <Table.Td>
                                                            <Text size="xs" c="dimmed">{i + 1}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge color="teal" size="sm" variant="light">
                                                                {client.build}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500} lineClamp={1}>
                                                                {client.company_name}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td ta="center">
                                                            <Text size="xs" c="dimmed">
                                                                {client.province || '-'}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td ta="center">
                                                            <Badge
                                                                size="sm" variant="light"
                                                                color={getCompanyStatusBadgeColor(client.company_status)}
                                                            >
                                                                {client.company_status}
                                                            </Badge>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    )}
                                </Box>
                            </ScrollArea>
                        </>
                    )}
                </Stack>
            )}
        </Drawer>
    )
}
