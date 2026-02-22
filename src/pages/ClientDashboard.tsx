/**
 * Client Dashboard Page
 * แดชบอร์ดข้อมูลลูกค้า — สถานะ, ประเภท, ขนาด, แผนที่ประเทศไทย
 *
 * Sub-components extracted to src/components/ClientDashboard/
 *   - constants.ts (color maps, region mapping, helpers)
 *   - DonutChart.tsx
 *   - HorizontalBarChart.tsx
 *   - StatCard.tsx
 *   - ProvinceDrawer.tsx (district map + client table)
 */

import { useState, useMemo } from 'react'
import {
    Container,
    Title,
    Stack,
    Card,
    Group,
    Text,
    SimpleGrid,
    Box,
    Paper,
    Badge,
    Loader,
    Center,
    Alert,
    Skeleton,
    ThemeIcon,
    ActionIcon,
    Chip,
} from '@mantine/core'
import {
    TbBuilding,
    TbX,
    TbFileInvoice,
    TbAlertCircle,
    TbMapPin,
    TbChartDonut,
    TbChartBar,
    TbUsers,
    TbBriefcase,
    TbArrowRight,
    TbWorld,
    TbCategory,
    TbRefresh,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import clientDashboardService from '../services/clientDashboardService'
import ThailandMap from '../components/Client/ThailandMap'

import {
    STATUS_COLORS,
    BUSINESS_TYPE_COLORS,
    COMPANY_SIZE_ORDER,
    REGION_COLORS,
    PROVINCE_REGION_MAP,
    getRegion,
    getCompanyStatusBadgeColor,
} from '../components/ClientDashboard/constants'
import { DonutChart, HorizontalBarChart, StatCard, ProvinceDrawer } from '../components/ClientDashboard'

// ─── Main Component ────────────────────────────────────────

export default function ClientDashboard() {
    const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
    const [drawerOpened, setDrawerOpened] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

    const { data: dashboard, isLoading, error, refetch, isFetching } = useQuery(
        ['client-dashboard', selectedStatuses],
        () => clientDashboardService.getDashboardData(
            selectedStatuses.length > 0 ? selectedStatuses : undefined
        ),
        { staleTime: 60_000, retry: 1 }
    )

    // ─── Derived data ────────────────────────────────

    const statusDonutData = useMemo(() => {
        if (!dashboard) return []
        return dashboard.byCompanyStatus.map(s => ({
            label: s.company_status,
            value: s.count,
            color: STATUS_COLORS[s.company_status] || '#999',
        }))
    }, [dashboard])

    const businessTypeBarData = useMemo(() => {
        if (!dashboard) return []
        return dashboard.byBusinessType.map(b => ({
            label: b.business_type,
            value: b.count,
            color: BUSINESS_TYPE_COLORS[b.business_type] || '#4facfe',
        }))
    }, [dashboard])

    const taxStatusData = useMemo(() => {
        if (!dashboard) return []
        return dashboard.byTaxRegistrationStatus.map(t => ({
            label: t.tax_registration_status,
            value: t.count,
            color: t.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' ? '#4caf50' : t.tax_registration_status === 'ยังไม่จดภาษีมูลค่าเพิ่ม' ? '#f44336' : '#999',
        }))
    }, [dashboard])

    const companySizeData = useMemo(() => {
        if (!dashboard) return []
        const sizeMap = new Map(dashboard.byCompanySize.map(s => [s.company_size, s.count]))
        return COMPANY_SIZE_ORDER
            .filter(s => sizeMap.has(s))
            .map(s => ({
                label: s,
                value: sizeMap.get(s) || 0,
                color: s === 'ไม่ระบุ' ? '#999' : '#4facfe',
            }))
    }, [dashboard])

    // Province data ranked
    const topProvinces = useMemo(() => {
        if (!dashboard) return []
        return dashboard.byProvince
            .filter(p => p.province !== 'ไม่ระบุ')
            .slice(0, 10)
    }, [dashboard])

    // Region data from provinces
    const regionDonutData = useMemo(() => {
        if (!dashboard) return []
        const regionMap: Record<string, number> = {}
        dashboard.byProvince.forEach(p => {
            if (p.province === 'ไม่ระบุ') {
                regionMap['ไม่ระบุ'] = (regionMap['ไม่ระบุ'] || 0) + p.count
            } else {
                const region = getRegion(p.province)
                regionMap[region] = (regionMap[region] || 0) + p.count
            }
        })
        return Object.entries(regionMap)
            .map(([label, value]) => ({
                label,
                value,
                color: REGION_COLORS[label] || '#999',
            }))
            .sort((a, b) => b.value - a.value)
    }, [dashboard])

    // Business category data
    const businessCategoryData = useMemo(() => {
        if (!dashboard) return []
        const CATEGORY_COLORS = [
            '#4facfe', '#ff6b35', '#66bb6a', '#ab47bc', '#26c6da',
            '#ffa726', '#ef5350', '#8d6e63', '#78909c', '#5c6bc0',
        ]
        return dashboard.byBusinessCategory
            .slice(0, 10)
            .map((d, i) => ({
                label: d.business_category,
                value: d.count,
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            }))
    }, [dashboard])

    // Business subcategory data (filtered by selected category)
    const businessSubcategoryData = useMemo(() => {
        if (!dashboard || !selectedCategory) return []
        const SUBCAT_COLORS = [
            '#42a5f5', '#ff8a65', '#81c784', '#ba68c8', '#4dd0e1',
            '#ffb74d', '#e57373', '#a1887f', '#90a4ae', '#7986cb',
        ]
        return dashboard.byBusinessSubcategory
            .filter(d => d.business_category === selectedCategory)
            .slice(0, 10)
            .map((d, i) => ({
                label: d.business_subcategory,
                value: d.count,
                color: SUBCAT_COLORS[i % SUBCAT_COLORS.length],
            }))
    }, [dashboard, selectedCategory])

    // ─── Handlers ────────────────────────────────────

    const handleProvinceClick = (province: string) => {
        setSelectedProvince(province)
        setDrawerOpened(true)
    }

    // ─── Stats ───────────────────────────────────────

    const activeCount = useMemo(() => {
        if (!dashboard) return 0
        return dashboard.byCompanyStatus
            .filter(s => s.company_status !== 'ยกเลิกทำ')
            .reduce((sum, s) => sum + s.count, 0)
    }, [dashboard])

    const cancelledCount = useMemo(() => {
        if (!dashboard) return 0
        return dashboard.byCompanyStatus
            .filter(s => s.company_status === 'ยกเลิกทำ')
            .reduce((sum, s) => sum + s.count, 0)
    }, [dashboard])

    const vatRegistered = useMemo(() => {
        if (!dashboard) return 0
        return dashboard.byTaxRegistrationStatus
            .filter(t => t.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม')
            .reduce((sum, t) => sum + t.count, 0)
    }, [dashboard])

    // ─── Render ──────────────────────────────────────

    if (error) {
        return (
            <Container size="xl" py="md">
                <Alert icon={<TbAlertCircle size={16} />} color="red">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard
                </Alert>
            </Container>
        )
    }

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                {/* ─── Header ─────────────────────────────────── */}
                <Group justify="space-between" align="center">
                    <Box>
                        <Title order={1} c="white" fw={700}>
                            แดชบอร์ดข้อมูลลูกค้า
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            ภาพรวมข้อมูลลูกค้าทั้งหมดในระบบ
                        </Text>
                    </Box>
                    <Group gap="sm">
                        {dashboard && (
                            <Badge size="xl" variant="gradient" gradient={{ from: '#ff6b35', to: '#ff8c42' }}>
                                ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Badge>
                        )}
                        <ActionIcon
                            variant="light"
                            color="orange"
                            size="lg"
                            radius="xl"
                            onClick={() => refetch()}
                            loading={isFetching}
                            title="รีเฟรชข้อมูล"
                        >
                            <TbRefresh size={20} />
                        </ActionIcon>
                    </Group>
                </Group>
                {/* ─── Stats Cards ────────────────────────────── */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} height={120} radius="xl" />
                        ))
                    ) : (
                        <>
                            <StatCard
                                icon={TbBuilding}
                                label="ลูกค้าทั้งหมด"
                                value={dashboard?.total || 0}
                                color="#ff6b35"
                                subtitle="ทุกสถานะรวม"
                            />
                            <StatCard
                                icon={TbUsers}
                                label="ลูกค้าที่ใช้บริการ"
                                value={activeCount}
                                color="#4caf50"
                                subtitle="ไม่รวมยกเลิกทำ"
                            />
                            <StatCard
                                icon={TbX}
                                label="ยกเลิกทำ"
                                value={cancelledCount}
                                color="#f44336"
                            />
                            <StatCard
                                icon={TbFileInvoice}
                                label="จดภาษีมูลค่าเพิ่ม"
                                value={vatRegistered}
                                color="#4facfe"
                            />
                        </>
                    )}
                </SimpleGrid>

                {/* ─── Charts Section ─────────────────────────── */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {/* Status Donut Chart */}
                    <Card
                        withBorder
                        radius="xl"
                        p="xl"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        }}
                    >
                        <Group gap="sm" mb="lg">
                            <ThemeIcon size={36} radius="xl" variant="light" color="orange">
                                <TbChartDonut size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="md">สัดส่วนสถานะบริษัท</Text>
                                <Text size="xs" c="dimmed">แสดงจำนวนลูกค้าแยกตามสถานะ</Text>
                            </Box>
                        </Group>
                        {isLoading ? (
                            <Center py="xl"><Loader color="orange" /></Center>
                        ) : (
                            <DonutChart data={statusDonutData} total={dashboard?.total || 0} />
                        )}
                    </Card>

                    {/* Business Type Bar Chart */}
                    <Card
                        withBorder
                        radius="xl"
                        p="xl"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        }}
                    >
                        <Group gap="sm" mb="lg">
                            <ThemeIcon size={36} radius="xl" variant="light" color="blue">
                                <TbChartBar size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="md">ประเภทกิจการ</Text>
                                <Text size="xs" c="dimmed">จำนวนลูกค้าแยกตามประเภทกิจการ</Text>
                            </Box>
                        </Group>
                        {isLoading ? (
                            <Center py="xl"><Loader color="blue" /></Center>
                        ) : (
                            <HorizontalBarChart
                                data={businessTypeBarData}
                                maxValue={Math.max(...businessTypeBarData.map(d => d.value), 1)}
                            />
                        )}
                    </Card>
                </SimpleGrid>

                {/* ─── Distribution Row ───────────────────────── */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                    {/* Tax Status */}
                    <Card withBorder radius="xl" p="lg">
                        <Group gap="sm" mb="md">
                            <ThemeIcon size={32} radius="xl" variant="light" color="green">
                                <TbFileInvoice size={18} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">สถานะจดภาษี</Text>
                        </Group>
                        {isLoading ? (
                            <Stack gap="xs">
                                <Skeleton height={40} />
                                <Skeleton height={40} />
                            </Stack>
                        ) : (
                            <Stack gap="xs">
                                {taxStatusData.map((t, i) => (
                                    <Paper
                                        key={i}
                                        p="sm"
                                        radius="md"
                                        withBorder
                                        style={{
                                            borderLeft: `3px solid ${t.color}`,
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(4px)'
                                            e.currentTarget.style.boxShadow = `0 4px 12px ${t.color}30`
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)'
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: '70%' }}>{t.label}</Text>
                                            <Text fw={700} size="md">{t.value}</Text>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Card>

                    {/* Company Size */}
                    <Card withBorder radius="xl" p="lg">
                        <Group gap="sm" mb="md">
                            <ThemeIcon size={32} radius="xl" variant="light" color="blue">
                                <TbBriefcase size={18} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">ขนาดบริษัท</Text>
                        </Group>
                        {isLoading ? (
                            <Stack gap="xs">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} height={30} />
                                ))}
                            </Stack>
                        ) : (
                            <HorizontalBarChart
                                data={companySizeData}
                                maxValue={Math.max(...companySizeData.map(d => d.value), 1)}
                            />
                        )}
                    </Card>

                    {/* Top Provinces */}
                    <Card withBorder radius="xl" p="lg">
                        <Group gap="sm" mb="md">
                            <ThemeIcon size={32} radius="xl" variant="light" color="orange">
                                <TbMapPin size={18} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">จังหวัดที่มีลูกค้ามากที่สุด</Text>
                        </Group>
                        {isLoading ? (
                            <Stack gap="xs">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} height={28} />
                                ))}
                            </Stack>
                        ) : (
                            <Stack gap={6}>
                                {topProvinces.map((p, i) => (
                                    <Group
                                        key={i}
                                        justify="space-between"
                                        style={{
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: 8,
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 107, 53, 0.06)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                        onClick={() => handleProvinceClick(p.province)}
                                    >
                                        <Group gap="xs">
                                            <Badge size="xs" variant="filled" color="orange" circle>{i + 1}</Badge>
                                            <Text size="xs">{p.province}</Text>
                                        </Group>
                                        <Group gap={4}>
                                            <Text size="xs" fw={700} c="orange">{p.count}</Text>
                                            <TbArrowRight size={12} color="#ff6b35" />
                                        </Group>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Card>
                </SimpleGrid>

                {/* ─── Region + Business Category Section ──────── */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {/* Regional Donut Chart */}
                    <Card
                        withBorder
                        radius="xl"
                        p="xl"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        }}
                    >
                        <Group gap="sm" mb="lg">
                            <ThemeIcon size={36} radius="xl" variant="light" color="violet">
                                <TbWorld size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="md">ภูมิภาค</Text>
                                <Text size="xs" c="dimmed">จำนวนลูกค้าแยกตามภูมิภาคของไทย</Text>
                            </Box>
                        </Group>
                        {isLoading ? (
                            <Center py="xl"><Loader color="violet" /></Center>
                        ) : (
                            <HorizontalBarChart
                                data={regionDonutData}
                                maxValue={Math.max(...regionDonutData.map(d => d.value), 1)}
                            />
                        )}
                    </Card>

                    {/* Business Category + Subcategory */}
                    <Card
                        withBorder
                        radius="xl"
                        p="xl"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        }}
                    >
                        <Group gap="sm" mb="lg" justify="space-between">
                            <Group gap="sm">
                                <ThemeIcon size={36} radius="xl" variant="light" color="teal">
                                    <TbCategory size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={700} size="md">
                                        {selectedCategory ? `ประเภทย่อย` : 'ประเภทธุรกิจ'}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {selectedCategory
                                            ? `ประเภทย่อยของ "${selectedCategory}"`
                                            : 'คลิกเพื่อดูประเภทย่อย'
                                        }
                                    </Text>
                                </Box>
                            </Group>
                            {selectedCategory && (
                                <Badge
                                    size="sm" variant="light" color="gray"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedCategory(null)}
                                >
                                    ← กลับ
                                </Badge>
                            )}
                        </Group>
                        {isLoading ? (
                            <Center py="xl"><Loader color="teal" /></Center>
                        ) : selectedCategory ? (
                            businessSubcategoryData.length > 0 ? (
                                <HorizontalBarChart
                                    data={businessSubcategoryData}
                                    maxValue={Math.max(...businessSubcategoryData.map(d => d.value), 1)}
                                />
                            ) : (
                                <Center py="lg">
                                    <Text size="sm" c="dimmed">ไม่มีข้อมูลประเภทย่อย</Text>
                                </Center>
                            )
                        ) : (
                            <Stack gap="xs">
                                {businessCategoryData.map((cat, i) => (
                                    <Paper
                                        key={i}
                                        p="sm"
                                        radius="md"
                                        withBorder
                                        style={{
                                            borderLeft: `3px solid ${cat.color}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(4px)'
                                            e.currentTarget.style.boxShadow = `0 4px 12px ${cat.color}30`
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)'
                                            e.currentTarget.style.boxShadow = ''
                                        }}
                                        onClick={() => setSelectedCategory(cat.label)}
                                    >
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <Text size="xs" lineClamp={1} style={{ maxWidth: '250px' }}>
                                                    {cat.label}
                                                </Text>
                                            </Group>
                                            <Group gap={4}>
                                                <Text fw={700} size="sm" c={cat.color}>{cat.value}</Text>
                                                <TbArrowRight size={12} color={cat.color} />
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Card>
                </SimpleGrid>

                {/* ─── Thailand Map Section ───────────────────── */}
                <Card
                    withBorder
                    radius="xl"
                    p="xl"
                    style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    }}
                >
                    <Group gap="sm" mb="lg" justify="space-between">
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" variant="gradient" gradient={{ from: '#ff6b35', to: '#ff8c42' }}>
                                <TbMapPin size={22} color="white" />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="lg">แผนที่การกระจายลูกค้า</Text>
                                <Text size="xs" c="dimmed">คลิกจังหวัดเพื่อดูรายละเอียดลูกค้า</Text>
                            </Box>
                        </Group>
                        {dashboard && (
                            <Group gap="xs">
                                <Badge size="md" variant="light" color="orange">
                                    {dashboard.byProvince.filter(p => p.province in PROVINCE_REGION_MAP).length} จังหวัด
                                </Badge>
                                <ActionIcon
                                    variant="light"
                                    color="orange"
                                    size="md"
                                    radius="xl"
                                    onClick={() => refetch()}
                                    loading={isFetching}
                                    title="รีเฟรชข้อมูลแผนที่"
                                >
                                    <TbRefresh size={16} />
                                </ActionIcon>
                            </Group>
                        )}
                    </Group>

                    {/* Status filter chips */}
                    <Group gap="sm" align="center" mb="md" p="sm" style={{ background: '#f8f9fa', borderRadius: 12 }}>
                        <Text size="xs" fw={600} c="dimmed">กรองสถานะ:</Text>
                        <Chip.Group multiple value={selectedStatuses} onChange={setSelectedStatuses}>
                            <Group gap={4}>
                                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                                    <Chip key={status} value={status} size="xs" variant="outline" color={color}>
                                        {status}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                        {selectedStatuses.length > 0 && (
                            <Badge size="xs" variant="light" color="gray" style={{ cursor: 'pointer' }} onClick={() => setSelectedStatuses([])}>
                                ล้าง
                            </Badge>
                        )}
                    </Group>

                    {isLoading ? (
                        <Center py="xl"><Loader color="orange" size="lg" /></Center>
                    ) : (
                        <ThailandMap
                            data={dashboard?.byProvince || []}
                            onProvinceClick={handleProvinceClick}
                        />
                    )}
                </Card>

                {/* ─── Recent Clients ─────────────────────────── */}
                <Card
                    withBorder
                    radius="xl"
                    p="xl"
                    style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                    }}
                >
                    <Group gap="sm" mb="lg">
                        <ThemeIcon size={36} radius="xl" variant="light" color="orange">
                            <TbBuilding size={20} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size="md">ลูกค้าที่เพิ่มล่าสุด</Text>
                            <Text size="xs" c="dimmed">10 รายล่าสุดที่เพิ่มเข้าระบบ</Text>
                        </Box>
                    </Group>

                    {isLoading ? (
                        <Stack gap="xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} height={40} />
                            ))}
                        </Stack>
                    ) : (
                        <Box style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13 }}>Build Code</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13 }}>ชื่อบริษัท</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 13 }}>สถานะ</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 13 }}>จังหวัด</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 13 }}>ประเภท</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 13 }}>วันที่เพิ่ม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(dashboard?.recentClients || []).map((client) => (
                                        <tr key={client.build} style={{ borderTop: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 12px' }}>
                                                <Badge color="orange" size="sm" variant="light">{client.build}</Badge>
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <Text size="sm" fw={500} lineClamp={1}>{client.company_name}</Text>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                                                <Badge size="sm" variant="light" color={getCompanyStatusBadgeColor(client.company_status)}>
                                                    {client.company_status}
                                                </Badge>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                                                <Text size="xs" c="dimmed">{client.province || '-'}</Text>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                                                <Text size="xs" c="dimmed">{client.business_type || '-'}</Text>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                                                <Text size="xs" c="dimmed">
                                                    {client.created_at ? new Date(client.created_at).toLocaleDateString('th-TH') : '-'}
                                                </Text>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    )}
                </Card>
            </Stack>

            {/* Province Drill-down Drawer */}
            <ProvinceDrawer
                province={selectedProvince}
                opened={drawerOpened}
                onClose={() => {
                    setDrawerOpened(false)
                    setSelectedProvince(null)
                }}
            />
        </Container>
    )
}
