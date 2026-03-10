/**
 * TaxStatusDrawer
 * Drawer แสดงรายชื่อบริษัทตามสถานะจดภาษีที่เลือก
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
    ThemeIcon,
} from '@mantine/core'
import { TbFileInvoice, TbSearch } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { useState, useMemo } from 'react'
import api from '../../services/api'
import { getCompanyStatusBadgeColor } from './constants'

interface TaxClient {
    build: string
    company_name: string
    company_status: string
    business_category: string | null
    province: string | null
}

interface TaxStatusDrawerProps {
    taxStatus: string | null
    color: string
    opened: boolean
    onClose: () => void
}

async function fetchTaxStatusClients(status: string): Promise<TaxClient[]> {
    const response = await api.get<{ success: boolean; data: TaxClient[] }>(
        '/clients/tax-status-clients',
        { params: { status } }
    )
    return response.data.data
}

export default function TaxStatusDrawer({
    taxStatus,
    color,
    opened,
    onClose,
}: TaxStatusDrawerProps) {
    const [search, setSearch] = useState('')

    const { data: clients = [], isLoading } = useQuery(
        ['tax-status-clients', taxStatus],
        () => fetchTaxStatusClients(taxStatus!),
        { enabled: !!taxStatus && opened, staleTime: 60_000 }
    )

    const filtered = useMemo(() => {
        if (!search.trim()) return clients
        const q = search.toLowerCase()
        return clients.filter(c =>
            c.company_name.toLowerCase().includes(q) ||
            c.build.toLowerCase().includes(q) ||
            (c.province || '').toLowerCase().includes(q) ||
            (c.business_category || '').toLowerCase().includes(q)
        )
    }, [clients, search])

    const handleClose = () => {
        setSearch('')
        onClose()
    }

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="sm">
                    <ThemeIcon size={32} radius="xl" style={{ background: color }}>
                        <TbFileInvoice size={18} color="white" />
                    </ThemeIcon>
                    <Text fw={700} size="lg" lineClamp={1} style={{ maxWidth: 280 }}>
                        {taxStatus || ''}
                    </Text>
                    {clients.length > 0 && (
                        <Badge
                            size="lg"
                            variant="light"
                            style={{ backgroundColor: `${color}25`, color }}
                        >
                            {clients.length} บริษัท
                        </Badge>
                    )}
                </Group>
            }
            position="right"
            size="xl"
            padding="lg"
            overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
        >
            {isLoading ? (
                <Center py="xl"><Loader color="green" /></Center>
            ) : (
                <Stack gap="md">
                    <TextInput
                        placeholder="ค้นหาชื่อบริษัท, Build, จังหวัด หรือ ประเภทธุรกิจ"
                        leftSection={<TbSearch size={16} />}
                        value={search}
                        onChange={e => setSearch(e.currentTarget.value)}
                        radius="xl"
                        size="sm"
                    />

                    <Text size="xs" c="dimmed">
                        แสดง {filtered.length} จาก {clients.length} บริษัท
                    </Text>

                    <ScrollArea h="calc(100vh - 220px)">
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
                                                    <Badge color="orange" size="sm" variant="light">
                                                        {client.build}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Stack gap={1}>
                                                        <Text size="sm" fw={500} lineClamp={1}>
                                                            {client.company_name}
                                                        </Text>
                                                        {client.business_category && (
                                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                                {client.business_category}
                                                            </Text>
                                                        )}
                                                    </Stack>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Text size="xs" c="dimmed">
                                                        {client.province || '-'}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Badge
                                                        size="sm"
                                                        variant="light"
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
                </Stack>
            )}
        </Drawer>
    )
}
