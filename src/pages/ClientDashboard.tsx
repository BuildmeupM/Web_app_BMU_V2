/**
 * Client Dashboard Page
 * แดชบอร์ดข้อมูลลูกค้า — สถานะ, ประเภท, ขนาด, แผนที่ประเทศไทย
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
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
    Drawer,
    Table,
    Divider,
    ScrollArea,
    Skeleton,
    RingProgress,
    ThemeIcon,
    ActionIcon,
    Tooltip,
    Chip,
} from '@mantine/core'
import {
    TbBuilding,
    TbCalendar,
    TbCheck,
    TbX,
    TbCash,
    TbFileInvoice,
    TbFileOff,
    TbAlertCircle,
    TbMapPin,
    TbChartDonut,
    TbChartBar,
    TbUsers,
    TbBriefcase,
    TbArrowRight,
    TbPlus,
    TbMinus,
    TbFocus2,
    TbWorld,
    TbCategory,
    TbRefresh,
} from 'react-icons/tb'
import { useQuery } from 'react-query'
import clientDashboardService, { DashboardData, ProvinceClient } from '../services/clientDashboardService'
import ThailandMap from '../components/Client/ThailandMap'

// ─── Constants ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    'รายเดือน': '#4caf50',
    'รายเดือน / วางมือ': '#ff9800',
    'รายเดือน / จ่ายรายปี': '#4facfe',
    'รายเดือน / เดือนสุดท้าย': '#ff6b35',
    'ยกเลิกทำ': '#f44336',
}

const STATUS_ICONS: Record<string, any> = {
    'รายเดือน': TbCalendar,
    'รายเดือน / วางมือ': TbCheck,
    'รายเดือน / จ่ายรายปี': TbCash,
    'รายเดือน / เดือนสุดท้าย': TbFileInvoice,
    'ยกเลิกทำ': TbX,
}

const BUSINESS_TYPE_COLORS: Record<string, string> = {
    'บริษัทจำกัด': '#4facfe',
    'ห้างหุ้นส่วน': '#ff9800',
    'บริษัทมหาชนจำกัด': '#9c27b0',
    'ไม่ระบุ': '#999',
}

const COMPANY_SIZE_ORDER = ['SS', 'S', 'MM', 'M', 'LL', 'L', 'XL', 'XXL', 'ไม่ระบุ']

// ─── Province → Region Mapping ──────────────────────────────

const REGION_COLORS: Record<string, string> = {
    'กรุงเทพฯ และปริมณฑล': '#ff6b35',
    'ภาคกลาง': '#4facfe',
    'ภาคเหนือ': '#66bb6a',
    'ภาคตะวันออกเฉียงเหนือ': '#ab47bc',
    'ภาคตะวันออก': '#26c6da',
    'ภาคตะวันตก': '#ffa726',
    'ภาคใต้': '#ef5350',
    'ไม่ระบุ': '#999',
}

const PROVINCE_REGION_MAP: Record<string, string> = {
    // กรุงเทพฯ และปริมณฑล
    'กรุงเทพมหานคร': 'กรุงเทพฯ และปริมณฑล',
    'นนทบุรี': 'กรุงเทพฯ และปริมณฑล',
    'ปทุมธานี': 'กรุงเทพฯ และปริมณฑล',
    'สมุทรปราการ': 'กรุงเทพฯ และปริมณฑล',
    'สมุทรสาคร': 'กรุงเทพฯ และปริมณฑล',
    'นครปฐม': 'กรุงเทพฯ และปริมณฑล',
    // ภาคกลาง
    'พระนครศรีอยุธยา': 'ภาคกลาง', 'อ่างทอง': 'ภาคกลาง', 'สิงห์บุรี': 'ภาคกลาง',
    'ลพบุรี': 'ภาคกลาง', 'ชัยนาท': 'ภาคกลาง', 'สระบุรี': 'ภาคกลาง',
    'นครนายก': 'ภาคกลาง', 'สุพรรณบุรี': 'ภาคกลาง', 'สมุทรสงคราม': 'ภาคกลาง',
    'อุทัยธานี': 'ภาคกลาง', 'นครสวรรค์': 'ภาคกลาง',
    // ภาคเหนือ
    'เชียงใหม่': 'ภาคเหนือ', 'เชียงราย': 'ภาคเหนือ', 'ลำปาง': 'ภาคเหนือ',
    'ลำพูน': 'ภาคเหนือ', 'แพร่': 'ภาคเหนือ', 'น่าน': 'ภาคเหนือ',
    'พะเยา': 'ภาคเหนือ', 'แม่ฮ่องสอน': 'ภาคเหนือ',
    'สุโขทัย': 'ภาคเหนือ', 'พิษณุโลก': 'ภาคเหนือ',
    'พิจิตร': 'ภาคเหนือ', 'เพชรบูรณ์': 'ภาคเหนือ',
    'อุตรดิตถ์': 'ภาคเหนือ', 'กำแพงเพชร': 'ภาคเหนือ',
    // ภาคตะวันออกเฉียงเหนือ
    'นครราชสีมา': 'ภาคตะวันออกเฉียงเหนือ', 'ขอนแก่น': 'ภาคตะวันออกเฉียงเหนือ',
    'อุดรธานี': 'ภาคตะวันออกเฉียงเหนือ', 'หนองคาย': 'ภาคตะวันออกเฉียงเหนือ',
    'หนองบัวลำภู': 'ภาคตะวันออกเฉียงเหนือ', 'เลย': 'ภาคตะวันออกเฉียงเหนือ',
    'อุบลราชธานี': 'ภาคตะวันออกเฉียงเหนือ', 'ศรีสะเกษ': 'ภาคตะวันออกเฉียงเหนือ',
    'สกลนคร': 'ภาคตะวันออกเฉียงเหนือ', 'มุกดาหาร': 'ภาคตะวันออกเฉียงเหนือ',
    'กาฬสินธุ์': 'ภาคตะวันออกเฉียงเหนือ', 'ร้อยเอ็ด': 'ภาคตะวันออกเฉียงเหนือ',
    'มหาสารคาม': 'ภาคตะวันออกเฉียงเหนือ', 'อำนาจเจริญ': 'ภาคตะวันออกเฉียงเหนือ',
    'บุรีรัมย์': 'ภาคตะวันออกเฉียงเหนือ', 'สุรินทร์': 'ภาคตะวันออกเฉียงเหนือ',
    'ชัยภูมิ': 'ภาคตะวันออกเฉียงเหนือ', 'ยโสธร': 'ภาคตะวันออกเฉียงเหนือ',
    'นครพนม': 'ภาคตะวันออกเฉียงเหนือ', 'บึงกาฬ': 'ภาคตะวันออกเฉียงเหนือ',
    // ภาคตะวันออก
    'ชลบุรี': 'ภาคตะวันออก', 'ระยอง': 'ภาคตะวันออก', 'จันทบุรี': 'ภาคตะวันออก',
    'ตราด': 'ภาคตะวันออก', 'ฉะเชิงเทรา': 'ภาคตะวันออก',
    'ปราจีนบุรี': 'ภาคตะวันออก', 'สระแก้ว': 'ภาคตะวันออก',
    // ภาคตะวันตก
    'กาญจนบุรี': 'ภาคตะวันตก', 'ราชบุรี': 'ภาคตะวันตก',
    'ประจวบคีรีขันธ์': 'ภาคตะวันตก', 'เพชรบุรี': 'ภาคตะวันตก',
    'ตาก': 'ภาคตะวันตก',
    // ภาคใต้
    'ชุมพร': 'ภาคใต้', 'ระนอง': 'ภาคใต้', 'สุราษฎร์ธานี': 'ภาคใต้',
    'พังงา': 'ภาคใต้', 'กระบี่': 'ภาคใต้', 'นครศรีธรรมราช': 'ภาคใต้',
    'สงขลา': 'ภาคใต้', 'พัทลุง': 'ภาคใต้', 'ตรัง': 'ภาคใต้',
    'สตูล': 'ภาคใต้', 'ยะลา': 'ภาคใต้', 'ปัตตานี': 'ภาคใต้',
    'นราธิวาส': 'ภาคใต้', 'ภูเก็ต': 'ภาคใต้',
}

function getRegion(province: string): string {
    return PROVINCE_REGION_MAP[province] || 'ไม่ระบุ'
}

function getCompanyStatusBadgeColor(status: string): string {
    switch (status) {
        case 'รายเดือน': return 'green'
        case 'รายเดือน / วางมือ': return 'yellow'
        case 'รายเดือน / จ่ายรายปี': return 'blue'
        case 'รายเดือน / เดือนสุดท้าย': return 'orange'
        case 'ยกเลิกทำ': return 'red'
        default: return 'gray'
    }
}

// ─── Donut Chart (CSS) ─────────────────────────────────────

function DonutChart({
    data,
    total,
}: {
    data: Array<{ label: string; value: number; color: string }>
    total: number
}) {
    // Calculate ring segments for Mantine RingProgress
    const sections = data.map(d => ({
        value: total > 0 ? (d.value / total) * 100 : 0,
        color: d.color,
        tooltip: `${d.label}: ${d.value}`,
    }))

    return (
        <Box>
            <Center>
                <RingProgress
                    size={200}
                    thickness={28}
                    roundCaps
                    sections={sections}
                    label={
                        <Text ta="center" fw={700} size="xl">
                            {total}
                            <Text size="xs" c="dimmed" >รวม</Text>
                        </Text>
                    }
                />
            </Center>
            <Stack gap={6} mt="md">
                {data.map((d, i) => (
                    <Group key={i} gap="xs" justify="space-between">
                        <Group gap="xs">
                            <Box style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
                            <Text size="xs" c="dimmed">{d.label}</Text>
                        </Group>
                        <Group gap={4}>
                            <Text size="xs" fw={600}>{d.value}</Text>
                            <Text size="xs" c="dimmed">
                                ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                            </Text>
                        </Group>
                    </Group>
                ))}
            </Stack>
        </Box>
    )
}

// ─── Horizontal Bar Chart ──────────────────────────────────

function HorizontalBarChart({
    data,
    maxValue,
}: {
    data: Array<{ label: string; value: number; color: string }>
    maxValue: number
}) {
    return (
        <Stack gap="sm">
            {data.map((d, i) => (
                <Box key={i}>
                    <Group justify="space-between" mb={2}>
                        <Text size="xs" fw={500}>{d.label}</Text>
                        <Text size="xs" fw={700} c={d.color}>{d.value}</Text>
                    </Group>
                    <Box
                        style={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#f1f3f5',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            style={{
                                height: '100%',
                                width: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%`,
                                borderRadius: 5,
                                backgroundColor: d.color,
                                transition: 'width 0.6s ease',
                            }}
                        />
                    </Box>
                </Box>
            ))}
        </Stack>
    )
}

// ─── Stat Card ─────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    subtitle,
}: {
    icon: any
    label: string
    value: number | string
    color: string
    subtitle?: string
}) {
    return (
        <Paper
            p="lg"
            radius="xl"
            withBorder
            style={{
                borderLeft: `4px solid ${color}`,
                background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                transition: 'all 0.2s ease',
                cursor: 'default',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 25px ${color}20`
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
            }}
        >
            <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.5px' }}>
                        {label}
                    </Text>
                    <Text fw={800} size="2rem" c="#333" style={{ lineHeight: 1.1 }}>
                        {value}
                    </Text>
                    {subtitle && (
                        <Text size="xs" c="dimmed">{subtitle}</Text>
                    )}
                </Stack>
                <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    style={{ backgroundColor: `${color}15`, color }}
                >
                    <Icon size={24} />
                </ThemeIcon>
            </Group>
        </Paper>
    )
}

// ─── Province Clients Drawer (with District Map) ──────────

function getDistrictColor(count: number, maxCount: number): string {
    if (count === 0) return '#f8f9fa'
    const ratio = Math.min(count / Math.max(maxCount, 1), 1)
    const colors = [
        '#fff4e6', '#ffe8cc', '#ffd19a', '#ffb866',
        '#ffa03d', '#ff8c42', '#ff6b35', '#e55a2b', '#cc4f22',
    ]
    return colors[Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1)]
}

function ProvinceDrawer({
    province,
    opened,
    onClose,
}: {
    province: string | null
    opened: boolean
    onClose: () => void
}) {
    const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    // Zoom & Pan state for district map
    const [districtVB, setDistrictVB] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
    const [isPanningDistrict, setIsPanningDistrict] = useState(false)
    const districtPanRef = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 })
    const districtSvgRef = useRef<SVGSVGElement>(null)
    const districtMapContainerRef = useRef<HTMLDivElement>(null)
    const districtInitialVBRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

    // Fetch district client data from backend
    const { data: districtData, isLoading: isLoadingData } = useQuery(
        ['province-districts', province],
        () => clientDashboardService.getProvinceDistricts(province!),
        { enabled: !!province && opened }
    )

    // Fetch district map SVG from public/districts/
    const { data: mapData, isLoading: isLoadingMap } = useQuery(
        ['district-map', province],
        () => clientDashboardService.getDistrictMapData(province!),
        {
            enabled: !!province && opened, staleTime: Infinity,
            onSuccess: (data) => {
                if (data) {
                    const parts = data.viewBox.split(' ').map(Number)
                    const vb = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
                    districtInitialVBRef.current = vb
                    setDistrictVB(vb)
                }
            },
        }
    )

    // Zoom helpers for district map
    const districtZoom = (districtVB && districtInitialVBRef.current)
        ? districtInitialVBRef.current.w / districtVB.w : 1

    const districtZoomIn = () => {
        if (!districtVB || !districtInitialVBRef.current) return
        const init = districtInitialVBRef.current
        const newZoom = Math.min(8, districtZoom * 1.25)
        const newW = init.w / newZoom
        const newH = init.h / newZoom
        const cx = districtVB.x + districtVB.w / 2
        const cy = districtVB.y + districtVB.h / 2
        setDistrictVB({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH })
    }
    const districtZoomOut = () => {
        if (!districtVB || !districtInitialVBRef.current) return
        const init = districtInitialVBRef.current
        const newZoom = Math.max(0.5, districtZoom / 1.25)
        const newW = init.w / newZoom
        const newH = init.h / newZoom
        const cx = districtVB.x + districtVB.w / 2
        const cy = districtVB.y + districtVB.h / 2
        setDistrictVB({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH })
    }
    const districtResetView = () => {
        if (districtInitialVBRef.current) setDistrictVB(districtInitialVBRef.current)
    }

    // Use refs to avoid stale closures in the native wheel handler
    const districtVBRef = useRef(districtVB)
    const districtZoomRef = useRef(districtZoom)
    districtVBRef.current = districtVB
    districtZoomRef.current = districtZoom

    // Attach native wheel listener with { passive: false } so we can preventDefault
    // This prevents ScrollArea from intercepting the scroll
    useEffect(() => {
        const container = districtMapContainerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const vb = districtVBRef.current
            const currentZoom = districtZoomRef.current
            if (!vb || !districtInitialVBRef.current || !districtSvgRef.current) return
            const init = districtInitialVBRef.current
            const svg = districtSvgRef.current
            const rect = svg.getBoundingClientRect()
            const cursorX = vb.x + (e.clientX - rect.left) / rect.width * vb.w
            const cursorY = vb.y + (e.clientY - rect.top) / rect.height * vb.h
            const factor = e.deltaY > 0 ? 1 / 1.25 : 1.25
            const newZoom = Math.max(0.5, Math.min(8, currentZoom * factor))
            const newW = init.w / newZoom
            const newH = init.h / newZoom
            const newX = cursorX - (cursorX - vb.x) * (newW / vb.w)
            const newY = cursorY - (cursorY - vb.y) * (newH / vb.h)
            setDistrictVB({ x: newX, y: newY, w: newW, h: newH })
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [opened, mapData])

    const handleDistrictMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && districtVB) {
            setIsPanningDistrict(true)
            districtPanRef.current = { x: e.clientX, y: e.clientY, vbX: districtVB.x, vbY: districtVB.y }
        }
    }
    const handleDistrictMouseUp = () => setIsPanningDistrict(false)

    // Build district → count map
    const districtCountMap = useMemo(() => {
        if (!districtData) return {}
        const map: Record<string, number> = {}
        districtData.districtCounts.forEach(d => {
            map[d.district] = d.count
        })
        return map
    }, [districtData])

    const maxDistrictCount = useMemo(() => {
        const vals = Object.values(districtCountMap)
        return vals.length > 0 ? Math.max(...vals) : 1
    }, [districtCountMap])

    const totalClients = useMemo(() => {
        if (!districtData) return 0
        return districtData.districtCounts.reduce((sum, d) => sum + d.count, 0)
    }, [districtData])

    // Filter clients by selected district
    const filteredClients = useMemo(() => {
        if (!districtData) return []
        if (!selectedDistrict) return districtData.clients
        return districtData.clients.filter(c => c.district === selectedDistrict)
    }, [districtData, selectedDistrict])

    const handleMapMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        // Pan district map
        if (isPanningDistrict && districtVB && districtSvgRef.current) {
            const svgRect = districtSvgRef.current.getBoundingClientRect()
            const scaleX = districtVB.w / svgRect.width
            const scaleY = districtVB.h / svgRect.height
            const dx = (e.clientX - districtPanRef.current.x) * scaleX
            const dy = (e.clientY - districtPanRef.current.y) * scaleY
            setDistrictVB(prev => prev ? {
                ...prev,
                x: districtPanRef.current.vbX - dx,
                y: districtPanRef.current.vbY - dy,
            } : prev)
        }
    }

    const hoveredCount = hoveredDistrict ? (districtCountMap[hoveredDistrict] || 0) : 0

    // Reset selection when drawer closes or province changes
    const handleClose = () => {
        setSelectedDistrict(null)
        setHoveredDistrict(null)
        setIsPanningDistrict(false)
        if (districtInitialVBRef.current) setDistrictVB(districtInitialVBRef.current)
        onClose()
    }

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="sm">
                    <TbMapPin size={20} color="#ff6b35" />
                    <Text fw={700} size="lg">{province || ''}</Text>
                    {districtData && (
                        <>
                            <Badge size="lg" variant="light" color="orange">{totalClients} บริษัท</Badge>
                            <Badge size="md" variant="light" color="gray">
                                {districtData.districtCounts.length} อำเภอ/เขต
                            </Badge>
                        </>
                    )}
                </Group>
            }
            position="right"
            size="xl"
            padding="lg"
            overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
        >
            {(isLoadingData || isLoadingMap) ? (
                <Center py="xl"><Loader color="orange" /></Center>
            ) : (
                <ScrollArea h="calc(100vh - 120px)">
                    <Stack gap="lg">
                        {/* ─── District Map ─── */}
                        {mapData && mapData.districts.length > 0 ? (
                            <Paper p="md" radius="md" withBorder>
                                <Text fw={600} size="sm" mb="xs">
                                    แผนที่เขต/อำเภอ
                                    {selectedDistrict && (
                                        <Badge
                                            ml="sm" size="sm" variant="light" color="orange"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedDistrict(null)}
                                        >
                                            {selectedDistrict} ✕
                                        </Badge>
                                    )}
                                </Text>
                                <Box ref={districtMapContainerRef} pos="relative" onMouseMove={handleMapMouseMove}
                                    onMouseUp={handleDistrictMouseUp}
                                    onMouseLeave={() => { setIsPanningDistrict(false); setHoveredDistrict(null) }}
                                >
                                    {/* Zoom controls */}
                                    <Group
                                        gap={4}
                                        style={{
                                            position: 'absolute', top: 8, right: 8, zIndex: 50,
                                            backgroundColor: 'rgba(255,255,255,0.9)',
                                            borderRadius: 8, padding: 4,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                        }}
                                    >
                                        <Tooltip label="ซูมเข้า" position="left">
                                            <ActionIcon variant="subtle" size="sm" color="dark" onClick={districtZoomIn}>
                                                <TbPlus size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="ซูมออก" position="left">
                                            <ActionIcon variant="subtle" size="sm" color="dark" onClick={districtZoomOut}>
                                                <TbMinus size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="รีเซ็ต" position="left">
                                            <ActionIcon variant="subtle" size="sm" color="dark" onClick={districtResetView}>
                                                <TbFocus2 size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        {districtZoom > 1.05 && (
                                            <Badge size="xs" variant="light" color="gray">
                                                {Math.round(districtZoom * 100)}%
                                            </Badge>
                                        )}
                                    </Group>

                                    <svg
                                        ref={districtSvgRef}
                                        viewBox={districtVB ? `${districtVB.x} ${districtVB.y} ${districtVB.w} ${districtVB.h}` : mapData.viewBox}
                                        width="100%"
                                        style={{
                                            maxHeight: 400, display: 'block',
                                            cursor: isPanningDistrict ? 'grabbing' : 'grab',
                                        }}
                                        onMouseDown={handleDistrictMouseDown}
                                    >
                                        {mapData.districts.map((d) => {
                                            const count = districtCountMap[d.name] || 0
                                            const isHovered = hoveredDistrict === d.name
                                            const isSelected = selectedDistrict === d.name

                                            return (
                                                <g key={d.name}>
                                                    <path
                                                        d={d.path}
                                                        fill={
                                                            isSelected ? '#ff6b35'
                                                                : isHovered ? '#ffb866'
                                                                    : getDistrictColor(count, maxDistrictCount)
                                                        }
                                                        stroke={isSelected ? '#cc4f22' : isHovered ? '#ff8c42' : '#adb5bd'}
                                                        strokeWidth={(isSelected ? 2.5 : isHovered ? 2 : 0.8) / Math.max(districtZoom, 1)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            transition: 'fill 0.15s ease',
                                                        }}
                                                        onMouseEnter={() => setHoveredDistrict(d.name)}
                                                        onMouseLeave={() => setHoveredDistrict(null)}
                                                        onClick={(e) => {
                                                            if (Math.abs(e.clientX - districtPanRef.current.x) < 5 &&
                                                                Math.abs(e.clientY - districtPanRef.current.y) < 5) {
                                                                setSelectedDistrict(
                                                                    selectedDistrict === d.name ? null : d.name
                                                                )
                                                            }
                                                        }}
                                                    />
                                                    {count > 0 && (
                                                        <text
                                                            x={d.cx} y={d.cy}
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            fontSize={10 / Math.max(districtZoom * 0.7, 1)}
                                                            fontWeight="700"
                                                            fill={count > maxDistrictCount * 0.5 ? '#fff' : '#333'}
                                                            pointerEvents="none"
                                                            style={{ userSelect: 'none' }}
                                                        >
                                                            {count}
                                                        </text>
                                                    )}
                                                </g>
                                            )
                                        })}
                                    </svg>

                                    {/* Hover tooltip */}
                                    {hoveredDistrict && (
                                        <Paper
                                            shadow="lg" p="xs" radius="md" withBorder
                                            style={{
                                                position: 'absolute',
                                                left: Math.min(mousePos.x + 12, 300),
                                                top: mousePos.y - 10,
                                                pointerEvents: 'none',
                                                zIndex: 100,
                                                backgroundColor: 'white',
                                            }}
                                        >
                                            <Text fw={600} size="xs">{hoveredDistrict}</Text>
                                            <Badge size="sm" variant="light" color={hoveredCount > 0 ? 'orange' : 'gray'}>
                                                {hoveredCount} บริษัท
                                            </Badge>
                                        </Paper>
                                    )}
                                </Box>

                                {/* Legend */}
                                <Group gap="xs" justify="center" mt="xs">
                                    <Text size="xs" c="dimmed">น้อย</Text>
                                    {['#f8f9fa', '#fff4e6', '#ffd19a', '#ffa03d', '#ff6b35', '#cc4f22'].map((c, i) => (
                                        <Box
                                            key={i}
                                            style={{
                                                width: 16, height: 10,
                                                backgroundColor: c, borderRadius: 2,
                                                border: '1px solid #dee2e6',
                                            }}
                                        />
                                    ))}
                                    <Text size="xs" c="dimmed">มาก</Text>
                                </Group>
                            </Paper>
                        ) : !isLoadingMap && (
                            <Paper p="md" radius="md" withBorder>
                                <Text size="sm" c="dimmed" ta="center">ไม่มีข้อมูลแผนที่สำหรับจังหวัดนี้</Text>
                            </Paper>
                        )}

                        {/* ─── District Summary Bars ─── */}
                        {districtData && districtData.districtCounts.length > 0 && (
                            <Paper p="md" radius="md" withBorder>
                                <Text fw={600} size="sm" mb="sm">
                                    สรุปจำนวนลูกค้าแยกเขต/อำเภอ
                                </Text>
                                <Stack gap={4}>
                                    {districtData.districtCounts.map((d) => (
                                        <Group
                                            key={d.district}
                                            justify="space-between"
                                            style={{
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                backgroundColor: selectedDistrict === d.district
                                                    ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
                                                transition: 'background-color 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedDistrict !== d.district)
                                                    e.currentTarget.style.backgroundColor = 'rgba(255,107,53,0.05)'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedDistrict !== d.district)
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                            }}
                                            onClick={() => setSelectedDistrict(
                                                selectedDistrict === d.district ? null : d.district
                                            )}
                                        >
                                            <Text size="xs" fw={selectedDistrict === d.district ? 700 : 400}>
                                                {d.district}
                                            </Text>
                                            <Badge
                                                size="sm" variant="light"
                                                color={selectedDistrict === d.district ? 'orange' : 'gray'}
                                            >
                                                {d.count}
                                            </Badge>
                                        </Group>
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {/* ─── Client Table ─── */}
                        <Divider label={
                            selectedDistrict
                                ? `รายชื่อลูกค้า — ${selectedDistrict} (${filteredClients.length})`
                                : `รายชื่อลูกค้าทั้งหมด (${filteredClients.length})`
                        } labelPosition="center" />

                        {filteredClients.length === 0 ? (
                            <Center py="md">
                                <Text c="dimmed" size="sm">ไม่มีข้อมูลลูกค้า</Text>
                            </Center>
                        ) : (
                            <Table highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Build</Table.Th>
                                        <Table.Th>ชื่อบริษัท</Table.Th>
                                        <Table.Th ta="center">เขต/อำเภอ</Table.Th>
                                        <Table.Th ta="center">สถานะ</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filteredClients.map((client) => (
                                        <Table.Tr key={client.build}>
                                            <Table.Td>
                                                <Badge color="orange" size="sm" variant="light">{client.build}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500} lineClamp={1}>{client.company_name}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs" c="dimmed">{client.district}</Text>
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
                    </Stack>
                </ScrollArea>
            )}
        </Drawer>
    )
}

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
                        <Table.ScrollContainer minWidth={600}>
                            <Table highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Build Code</Table.Th>
                                        <Table.Th>ชื่อบริษัท</Table.Th>
                                        <Table.Th ta="center">สถานะ</Table.Th>
                                        <Table.Th ta="center">จังหวัด</Table.Th>
                                        <Table.Th ta="center">ประเภท</Table.Th>
                                        <Table.Th ta="center">วันที่เพิ่ม</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {(dashboard?.recentClients || []).map((client) => (
                                        <Table.Tr key={client.build}>
                                            <Table.Td>
                                                <Badge color="orange" size="sm" variant="light">{client.build}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500} lineClamp={1}>{client.company_name}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Badge size="sm" variant="light" color={getCompanyStatusBadgeColor(client.company_status)}>
                                                    {client.company_status}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs" c="dimmed">{client.province || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs" c="dimmed">{client.business_type || '-'}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text size="xs" c="dimmed">
                                                    {client.created_at ? new Date(client.created_at).toLocaleDateString('th-TH') : '-'}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
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
