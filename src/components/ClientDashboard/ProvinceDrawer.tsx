/**
 * ProvinceDrawer — Province drill-down drawer with interactive district map
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import {
    Group,
    Text,
    Badge,
    Loader,
    Center,
    Drawer,
    Table,
    Divider,
    ScrollArea,
    Paper,
    Box,
    Stack,
    ActionIcon,
    Tooltip,
} from '@mantine/core'
import { TbMapPin, TbPlus, TbMinus, TbFocus2 } from 'react-icons/tb'
import { useQuery } from 'react-query'
import clientDashboardService from '../../services/clientDashboardService'
import { getCompanyStatusBadgeColor } from './constants'

/* ─── District heat-map color helper ─── */
function getDistrictColor(count: number, maxCount: number): string {
    if (count === 0) return '#f8f9fa'
    const ratio = Math.min(count / Math.max(maxCount, 1), 1)
    const colors = [
        '#fff4e6', '#ffe8cc', '#ffd19a', '#ffb866',
        '#ffa03d', '#ff8c42', '#ff6b35', '#e55a2b', '#cc4f22',
    ]
    return colors[Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1)]
}

/* ═══════════════════════════════════════════════════
 *  ProvinceDrawer Component
 * ═══════════════════════════════════════════════════ */

export default function ProvinceDrawer({
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
