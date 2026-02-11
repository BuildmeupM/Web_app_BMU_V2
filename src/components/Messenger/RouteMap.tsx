/**
 * RouteMap — แผนที่แสดงเส้นทางวิ่งแมส
 * ใช้ Leaflet + OpenStreetMap (ฟรี) + OSRM เส้นทางจริง
 */

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Box, Text, Badge, Loader, Stack, Group } from '@mantine/core'

// Fix Leaflet default icon issue in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom numbered marker icon
function createNumberedIcon(number: number, color: string = '#1976d2') {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${number}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    })
}

// Start icon (flag)
const startIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
        background-color: #2e7d32;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">🚩</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
})

// Status colors for stop markers
const statusColors: Record<string, string> = {
    pending: '#9e9e9e',
    completed: '#2e7d32',
    failed: '#c62828',
}

// Component to auto-fit bounds
function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap()
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])))
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
    }, [map, points])
    return null
}

// Types
interface RouteStop {
    id?: string
    sort_order: number
    location_name: string
    latitude?: number | null
    longitude?: number | null
    distance_km: number
    estimated_time?: string
    status: string
    tasks?: string[]
    notes?: string
}

interface RouteMapProps {
    startLocation?: string
    startLat?: number | null
    startLng?: number | null
    stops: RouteStop[]
    height?: number
}

export default function RouteMap({
    startLocation = 'จุดเริ่มต้น',
    startLat,
    startLng,
    stops,
    height = 400,
}: RouteMapProps) {
    const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([])
    const [loadingRoute, setLoadingRoute] = useState(false)

    // Collect all valid points
    const allPoints = useMemo(() => {
        const pts: { lat: number; lng: number; label: string; isStart?: boolean; stop?: RouteStop; index?: number }[] = []

        if (startLat && startLng) {
            pts.push({ lat: Number(startLat), lng: Number(startLng), label: startLocation, isStart: true })
        }

        stops.forEach((stop, i) => {
            if (stop.latitude && stop.longitude) {
                pts.push({
                    lat: Number(stop.latitude),
                    lng: Number(stop.longitude),
                    label: stop.location_name,
                    stop,
                    index: i + 1,
                })
            }
        })

        return pts
    }, [startLat, startLng, startLocation, stops])

    const mapCenter = useMemo<[number, number]>(() => {
        if (allPoints.length > 0) {
            return [allPoints[0].lat, allPoints[0].lng]
        }
        return [13.7563, 100.5018] // Bangkok default
    }, [allPoints])

    const boundsPoints = useMemo<[number, number][]>(() =>
        allPoints.map(p => [p.lat, p.lng] as [number, number]),
        [allPoints])

    // Fetch OSRM route geometry
    useEffect(() => {
        if (allPoints.length < 2) {
            setRouteGeometry([])
            return
        }

        const fetchRoute = async () => {
            setLoadingRoute(true)
            try {
                const coordStr = allPoints.map(p => `${p.lng},${p.lat}`).join(';')
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
                )
                const data = await res.json()
                if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
                    const coords = data.routes[0].geometry.coordinates.map(
                        (c: [number, number]) => [c[1], c[0]] as [number, number]
                    )
                    setRouteGeometry(coords)
                }
            } catch (err) {
                console.error('OSRM route fetch error:', err)
            } finally {
                setLoadingRoute(false)
            }
        }

        fetchRoute()
    }, [allPoints])

    // Not enough points
    if (allPoints.length === 0) {
        return (
            <Box p="md" ta="center" style={{ backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <Text c="dimmed" size="sm">📍 ไม่มีพิกัดสถานที่ — ไม่สามารถแสดงแผนที่ได้</Text>
            </Box>
        )
    }

    return (
        <Box style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #e0e0e0' }}>
            {loadingRoute && (
                <Box style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 1000,
                    backgroundColor: 'white', borderRadius: 8, padding: '4px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Loader size="xs" />
                    <Text size="xs">โหลดเส้นทาง...</Text>
                </Box>
            )}

            <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height, width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds points={boundsPoints} />

                {/* Route line */}
                {routeGeometry.length > 0 && (
                    <Polyline
                        positions={routeGeometry}
                        pathOptions={{
                            color: '#1976d2',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: undefined,
                        }}
                    />
                )}

                {/* Straight lines fallback if no OSRM route */}
                {routeGeometry.length === 0 && allPoints.length >= 2 && (
                    <Polyline
                        positions={allPoints.map(p => [p.lat, p.lng] as [number, number])}
                        pathOptions={{
                            color: '#90caf9',
                            weight: 3,
                            opacity: 0.6,
                            dashArray: '10, 10',
                        }}
                    />
                )}

                {/* Markers */}
                {allPoints.map((point, i) => (
                    <Marker
                        key={i}
                        position={[point.lat, point.lng]}
                        icon={point.isStart ? startIcon : createNumberedIcon(
                            point.index || i,
                            point.stop ? (statusColors[point.stop.status] || '#1976d2') : '#1976d2'
                        )}
                    >
                        <Popup>
                            <div style={{ minWidth: 150 }}>
                                <Text fw={700} size="sm">{point.isStart ? '🚩 ' : ''}{point.label}</Text>
                                {point.isStart && (
                                    <Text size="xs" c="dimmed">จุดเริ่มต้น</Text>
                                )}
                                {point.stop && (
                                    <>
                                        {point.stop.distance_km > 0 && (
                                            <Text size="xs" c="blue">📏 {Number(point.stop.distance_km).toFixed(1)} km</Text>
                                        )}
                                        {point.stop.estimated_time && (
                                            <Text size="xs" c="dimmed">⏰ {point.stop.estimated_time}</Text>
                                        )}
                                        {point.stop.tasks && point.stop.tasks.length > 0 && (
                                            <Text size="xs" mt={4}>📋 {point.stop.tasks.join(', ')}</Text>
                                        )}
                                        {point.stop.notes && (
                                            <Text size="xs" c="orange" mt={4}>📝 {point.stop.notes}</Text>
                                        )}
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend */}
            <Box style={{
                position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
                backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '6px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
                <Group gap={8}>
                    <Group gap={4}>
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2e7d32' }} />
                        <Text size="xs">เริ่มต้น</Text>
                    </Group>
                    <Group gap={4}>
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1976d2' }} />
                        <Text size="xs">จุดแวะ</Text>
                    </Group>
                    <Group gap={4}>
                        <Box style={{ width: 20, height: 3, backgroundColor: '#1976d2', borderRadius: 2 }} />
                        <Text size="xs">เส้นทาง</Text>
                    </Group>
                </Group>
            </Box>
        </Box>
    )
}
