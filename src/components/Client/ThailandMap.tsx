/**
 * Thailand Map SVG Component
 * แผนที่ประเทศไทยแบบ interactive — แสดงข้อมูลลูกค้าแยกจังหวัด
 *
 * ใช้ accurate SVG paths จาก @svg-maps/thailand
 * Color scale ตามจำนวนลูกค้า
 * Zoom & Pan ด้วย scroll wheel, drag, และปุ่ม +/−
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Box, Text, Paper, Group, Badge, Stack, ActionIcon, Tooltip } from '@mantine/core'
import { TbPlus, TbMinus, TbFocus2 } from 'react-icons/tb'
import { PROVINCES, SVG_VIEWBOX } from './thailandProvinceData'

// ─── Province name normalization map ─────────────────────────
const PROVINCE_NAME_MAP: Record<string, string> = {
    'กรุงเทพ': 'กรุงเทพมหานคร',
    'กทม': 'กรุงเทพมหานคร',
    'กทม.': 'กรุงเทพมหานคร',
}

function normalizeProvinceName(name: string): string {
    const trimmed = name.trim()
    return PROVINCE_NAME_MAP[trimmed] || trimmed
}

// ─── ViewBox helpers ────────────────────────────────────────

// Parse initial viewBox
const INITIAL_VIEWBOX = (() => {
    const parts = SVG_VIEWBOX.split(' ').map(Number)
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
})()

const MIN_ZOOM = 0.5
const MAX_ZOOM = 8
const ZOOM_STEP = 1.25

// ─── Color Scale ────────────────────────────────────────────

function getProvinceColor(count: number, maxCount: number): string {
    if (count === 0) return '#f1f3f5'
    const ratio = Math.min(count / Math.max(maxCount, 1), 1)
    const colors = [
        '#fff4e6', '#ffe8cc', '#ffd19a', '#ffb866',
        '#ffa03d', '#ff8c42', '#ff6b35', '#e55a2b', '#cc4f22',
    ]
    const index = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1)
    return colors[index]
}

// ─── Component Props ────────────────────────────────────────

interface ThailandMapProps {
    data: Array<{ province: string; count: number }>
    onProvinceClick?: (province: string) => void
}

// ─── Component ──────────────────────────────────────────────

export default function ThailandMap({ data, onProvinceClick }: ThailandMapProps) {
    const [hoveredProvince, setHoveredProvince] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    // Zoom & Pan state
    const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
    const [isPanning, setIsPanning] = useState(false)
    const panStartRef = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 })
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const zoom = INITIAL_VIEWBOX.w / viewBox.w // Current zoom level

    // Build province → count map
    const provinceCountMap = useMemo(() => {
        const map: Record<string, number> = {}
        data.forEach(d => {
            const normalized = normalizeProvinceName(d.province)
            map[normalized] = (map[normalized] || 0) + d.count
        })
        return map
    }, [data])

    const maxCount = useMemo(() => {
        const counts = Object.values(provinceCountMap)
        return counts.length > 0 ? Math.max(...counts) : 1
    }, [provinceCountMap])

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

        // Pan while dragging
        if (isPanning && svgRef.current) {
            const svgRect = svgRef.current.getBoundingClientRect()
            const scaleX = viewBox.w / svgRect.width
            const scaleY = viewBox.h / svgRect.height
            const dx = (e.clientX - panStartRef.current.x) * scaleX
            const dy = (e.clientY - panStartRef.current.y) * scaleY
            setViewBox(prev => ({
                ...prev,
                x: panStartRef.current.vbX - dx,
                y: panStartRef.current.vbY - dy,
            }))
        }
    }

    // Wheel zoom — use native listener with { passive: false } to allow preventDefault
    const viewBoxRef = useRef(viewBox)
    const zoomRef = useRef(zoom)
    viewBoxRef.current = viewBox
    zoomRef.current = zoom

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const svg = svgRef.current
            if (!svg) return

            const vb = viewBoxRef.current
            const currentZoom = zoomRef.current
            const rect = svg.getBoundingClientRect()
            const cursorX = vb.x + (e.clientX - rect.left) / rect.width * vb.w
            const cursorY = vb.y + (e.clientY - rect.top) / rect.height * vb.h

            const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * factor))
            const newW = INITIAL_VIEWBOX.w / newZoom
            const newH = INITIAL_VIEWBOX.h / newZoom

            const newX = cursorX - (cursorX - vb.x) * (newW / vb.w)
            const newY = cursorY - (cursorY - vb.y) * (newH / vb.h)

            setViewBox({ x: newX, y: newY, w: newW, h: newH })
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // left button
            setIsPanning(true)
            panStartRef.current = { x: e.clientX, y: e.clientY, vbX: viewBox.x, vbY: viewBox.y }
        }
    }

    const handleMouseUp = () => setIsPanning(false)
    const handleMouseLeave = () => {
        setIsPanning(false)
        setHoveredProvince(null)
    }

    // Zoom buttons
    const zoomIn = () => {
        const newZoom = Math.min(MAX_ZOOM, zoom * ZOOM_STEP)
        const newW = INITIAL_VIEWBOX.w / newZoom
        const newH = INITIAL_VIEWBOX.h / newZoom
        const cx = viewBox.x + viewBox.w / 2
        const cy = viewBox.y + viewBox.h / 2
        setViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH })
    }

    const zoomOut = () => {
        const newZoom = Math.max(MIN_ZOOM, zoom / ZOOM_STEP)
        const newW = INITIAL_VIEWBOX.w / newZoom
        const newH = INITIAL_VIEWBOX.h / newZoom
        const cx = viewBox.x + viewBox.w / 2
        const cy = viewBox.y + viewBox.h / 2
        setViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH })
    }

    const resetView = () => setViewBox(INITIAL_VIEWBOX)

    const hoveredCount = hoveredProvince ? (provinceCountMap[hoveredProvince] || 0) : 0
    const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`

    return (
        <Box ref={containerRef} pos="relative" onMouseMove={handleMouseMove}>
            {/* Zoom controls */}
            <Group
                gap={4}
                style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 50,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 8, padding: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}
            >
                <Tooltip label="ซูมเข้า" position="left">
                    <ActionIcon variant="subtle" size="sm" color="dark" onClick={zoomIn}>
                        <TbPlus size={16} />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label="ซูมออก" position="left">
                    <ActionIcon variant="subtle" size="sm" color="dark" onClick={zoomOut}>
                        <TbMinus size={16} />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label="รีเซ็ต" position="left">
                    <ActionIcon variant="subtle" size="sm" color="dark" onClick={resetView}>
                        <TbFocus2 size={16} />
                    </ActionIcon>
                </Tooltip>
                {zoom > 1.05 && (
                    <Badge size="xs" variant="light" color="gray">
                        {Math.round(zoom * 100)}%
                    </Badge>
                )}
            </Group>

            <svg
                ref={svgRef}
                viewBox={viewBoxStr}
                width="100%"
                height="100%"
                style={{
                    maxHeight: '700px',
                    display: 'block',
                    margin: '0 auto',
                    cursor: isPanning ? 'grabbing' : 'grab',
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                {/* Background */}
                <rect
                    x={viewBox.x} y={viewBox.y}
                    width={viewBox.w} height={viewBox.h}
                    fill="transparent"
                />

                {/* Province shapes */}
                {PROVINCES.map((prov) => {
                    const count = provinceCountMap[prov.name] || 0
                    const fillColor = getProvinceColor(count, maxCount)
                    const isHovered = hoveredProvince === prov.name

                    return (
                        <g key={prov.id}>
                            <path
                                d={prov.path}
                                fill={isHovered ? '#ff6b35' : fillColor}
                                stroke={isHovered ? '#cc4f22' : '#adb5bd'}
                                strokeWidth={(isHovered ? 2 : 0.5) / Math.max(zoom, 1)}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'fill 0.2s ease',
                                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(255,107,53,0.4))' : 'none',
                                }}
                                onMouseEnter={() => setHoveredProvince(prov.name)}
                                onMouseLeave={() => setHoveredProvince(null)}
                                onClick={(e) => {
                                    // Don't trigger click if user was panning
                                    if (Math.abs(e.clientX - panStartRef.current.x) < 5 &&
                                        Math.abs(e.clientY - panStartRef.current.y) < 5) {
                                        onProvinceClick?.(prov.name)
                                    }
                                }}
                            />
                            {/* Province count label */}
                            {count > 0 && (
                                <text
                                    x={prov.cx}
                                    y={prov.cy}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={7 / Math.max(zoom * 0.7, 1)}
                                    fontWeight="700"
                                    fill={count > maxCount * 0.5 ? '#fff' : '#333'}
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

            {/* Hover Tooltip */}
            {hoveredProvince && !isPanning && (
                <Paper
                    shadow="lg"
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                        position: 'absolute',
                        left: mousePos.x + 15,
                        top: mousePos.y - 10,
                        pointerEvents: 'none',
                        zIndex: 100,
                        backgroundColor: 'white',
                        minWidth: 160,
                    }}
                >
                    <Stack gap={4}>
                        <Text fw={700} size="sm">{hoveredProvince}</Text>
                        <Group gap="xs">
                            <Badge
                                size="lg"
                                variant="light"
                                color={hoveredCount > 0 ? 'orange' : 'gray'}
                            >
                                {hoveredCount} บริษัท
                            </Badge>
                        </Group>
                    </Stack>
                </Paper>
            )}

            {/* Legend */}
            <Group gap="xs" justify="center" mt="sm">
                <Text size="xs" c="dimmed">น้อย</Text>
                {['#f1f3f5', '#fff4e6', '#ffd19a', '#ffa03d', '#ff6b35', '#cc4f22'].map((color, i) => (
                    <Box
                        key={i}
                        style={{
                            width: 20,
                            height: 12,
                            backgroundColor: color,
                            borderRadius: 3,
                            border: '1px solid #dee2e6',
                        }}
                    />
                ))}
                <Text size="xs" c="dimmed">มาก</Text>
            </Group>
        </Box>
    )
}
