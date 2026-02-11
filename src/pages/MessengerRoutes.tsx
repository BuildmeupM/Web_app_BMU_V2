/**
 * Messenger Routes Page (ตารางวิ่งแมส)
 * หน้าจัดการตารางวิ่งแมสเซนเจอร์
 * ✅ เลือกสถานที่จาก dropdown (Searchable + Creatable)
 * ✅ คำนวณระยะทางอัตโนมัติ (OSRM + Nominatim)
 * ✅ ระบุจุดเริ่มต้นได้
 */

import { useState, useEffect, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import {
    Container, Stack, Card, Group, Text, Badge, Box, Title, Button,
    Loader, Table, ThemeIcon, ActionIcon, Tooltip, Modal, TextInput,
    Textarea, NumberInput, Select, Divider, SimpleGrid, Progress,
    Combobox, useCombobox, InputBase, Input
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import {
    TbTruckDelivery, TbPlus, TbTrash, TbEye, TbArrowUp, TbArrowDown,
    TbCheck, TbX, TbMapPin, TbRoute, TbClock, TbNotes, TbAlertTriangle,
    TbCalculator, TbCurrentLocation
} from 'react-icons/tb'
import {
    MessengerRoute, CreateRouteData, MessengerLocation,
    getRoutes, getRouteDetail, createRoute, updateRoute, deleteRoute,
    updateStop, geocodeLocation, calcDrivingDistance,
    getLocations, createLocation, incrementLocationUsage
} from '../services/messengerRouteService'
import RouteMap from '../components/Messenger/RouteMap'

// Status config
const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'วางแผน', color: 'orange' },
    in_progress: { label: 'กำลังดำเนินการ', color: 'orange' },
    completed: { label: 'เสร็จสิ้น', color: 'green' },
}

const stopStatusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
    pending: { label: 'รอดำเนินการ', color: 'gray', icon: TbClock },
    completed: { label: 'สำเร็จ', color: 'green', icon: TbCheck },
    failed: { label: 'ไม่สำเร็จ', color: 'red', icon: TbX },
}

// Form stop type
interface FormStop {
    location_name: string
    location_id: string | null
    tasks: string[]
    distance_km: number
    estimated_time: string
    notes: string
    lat: number | null
    lng: number | null
}

// ============================================================
// Location Select Component — Searchable + Creatable
// ============================================================
function LocationSelect({
    locations,
    value,
    onChange,
    onCreateNew,
    label,
    placeholder,
    size = 'sm',
}: {
    locations: MessengerLocation[]
    value: string
    onChange: (name: string, loc: MessengerLocation | null) => void
    onCreateNew: (name: string) => void
    label?: string
    placeholder?: string
    size?: string
}) {
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const [search, setSearch] = useState(value)

    useEffect(() => {
        setSearch(value)
    }, [value])

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(search.toLowerCase().trim())
    )

    const exactMatch = locations.some(loc => loc.name.toLowerCase() === search.toLowerCase().trim())

    const options = filteredLocations.map((loc) => {
        return (
            <Combobox.Option value={loc.id} key={loc.id}>
                <Group gap="xs">
                    <TbMapPin size={14} color="#666" />
                    <div>
                        <Text size="sm" fw={500}>{loc.name}</Text>
                        {loc.address && <Text size="xs" c="dimmed">{loc.address}</Text>}
                    </div>
                    {loc.category && (
                        <Badge size="xs" variant="light" color="gray" ml="auto">{loc.category}</Badge>
                    )}
                    {loc.latitude && loc.longitude && (
                        <Badge size="xs" variant="light" color="green">📍</Badge>
                    )}
                </Group>
            </Combobox.Option>
        )
    })

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
                if (val === '__create__') {
                    onCreateNew(search.trim())
                } else {
                    const loc = locations.find(l => l.id === val)
                    if (loc) {
                        onChange(loc.name, loc)
                        setSearch(loc.name)
                    }
                }
                combobox.closeDropdown()
            }}
        >
            <Combobox.Target>
                <InputBase
                    label={label}
                    placeholder={placeholder}
                    size={size as any}
                    leftSection={<TbMapPin size={14} />}
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value)
                        onChange(e.currentTarget.value, null)
                        combobox.openDropdown()
                        combobox.updateSelectedOptionIndex()
                    }}
                    onClick={() => combobox.openDropdown()}
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => combobox.closeDropdown()}
                />
            </Combobox.Target>

            <Combobox.Dropdown>
                <Combobox.Options>
                    {options.length > 0 ? options : (
                        <Combobox.Empty>ไม่พบสถานที่</Combobox.Empty>
                    )}
                    {search.trim() && !exactMatch && (
                        <Combobox.Option value="__create__" style={{ borderTop: '1px solid #eee' }}>
                            <Group gap="xs">
                                <TbPlus size={14} color="#228be6" />
                                <Text size="sm" c="blue">เพิ่ม "{search.trim()}" เป็นสถานที่ใหม่</Text>
                            </Group>
                        </Combobox.Option>
                    )}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}

// ============================================================
// Main Component
// ============================================================
export default function MessengerRoutes() {
    const [routes, setRoutes] = useState<MessengerRoute[]>([])
    const [loading, setLoading] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState<MessengerRoute | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Locations list
    const [locations, setLocations] = useState<MessengerLocation[]>([])
    const [locLoading, setLocLoading] = useState(false)

    // Create form state
    const [formDate, setFormDate] = useState<Date | null>(new Date())
    const [formNotes, setFormNotes] = useState('')
    const [formStops, setFormStops] = useState<FormStop[]>([])
    const [creating, setCreating] = useState(false)

    // Starting point
    const [startLocation, setStartLocation] = useState('')
    const [startLat, setStartLat] = useState<number | null>(null)
    const [startLng, setStartLng] = useState<number | null>(null)

    // Auto distance calc
    const [calcInProgress, setCalcInProgress] = useState(false)

    // Create Location Modal state
    const [newLocModalOpen, setNewLocModalOpen] = useState(false)
    const [newLocName, setNewLocName] = useState('')
    const [newLocLat, setNewLocLat] = useState<string>('')
    const [newLocLng, setNewLocLng] = useState<string>('')
    const [newLocCategory, setNewLocCategory] = useState('อื่นๆ')
    const [newLocForStart, setNewLocForStart] = useState(false)
    const [newLocStopIndex, setNewLocStopIndex] = useState<number | undefined>(undefined)
    const [newLocCreating, setNewLocCreating] = useState(false)
    const [newLocGeocoding, setNewLocGeocoding] = useState(false)

    // ============================================================
    // Fetch data
    // ============================================================

    const fetchRoutes = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getRoutes()
            setRoutes(data)
        } catch (error) {
            console.error('Fetch routes error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchLocations = useCallback(async () => {
        setLocLoading(true)
        try {
            const data = await getLocations()
            setLocations(data)

            // Set default start from locations
            const defaultStart = data.find(l => l.is_default_start)
            if (defaultStart && !startLocation) {
                setStartLocation(defaultStart.name)
                if (defaultStart.latitude && defaultStart.longitude) {
                    setStartLat(Number(defaultStart.latitude))
                    setStartLng(Number(defaultStart.longitude))
                }
            }
        } catch (error) {
            console.error('Fetch locations error:', error)
        } finally {
            setLocLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRoutes()
        fetchLocations()
    }, [fetchRoutes, fetchLocations])

    // ============================================================
    // Form helpers
    // ============================================================

    const resetForm = () => {
        setFormDate(new Date())
        setFormNotes('')
        setFormStops([])
        // Set default start
        const defaultStart = locations.find(l => l.is_default_start)
        if (defaultStart) {
            setStartLocation(defaultStart.name)
            setStartLat(defaultStart.latitude ? Number(defaultStart.latitude) : null)
            setStartLng(defaultStart.longitude ? Number(defaultStart.longitude) : null)
        } else {
            setStartLocation('')
            setStartLat(null)
            setStartLng(null)
        }
    }

    const addFormStop = () => {
        setFormStops(prev => [...prev, {
            location_name: '', location_id: null, tasks: [], distance_km: 0,
            estimated_time: '', notes: '', lat: null, lng: null,
        }])
    }

    const updateFormStop = (index: number, field: string, value: any) => {
        setFormStops(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    const removeFormStop = (index: number) => {
        setFormStops(prev => prev.filter((_, i) => i !== index))
    }

    const moveFormStop = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= formStops.length) return
        setFormStops(prev => {
            const updated = [...prev]
            const temp = updated[index]
            updated[index] = updated[newIndex]
            updated[newIndex] = temp
            return updated
        })
    }

    // ============================================================
    // Location select handlers
    // ============================================================

    const handleStartLocationChange = (name: string, loc: MessengerLocation | null) => {
        setStartLocation(name)
        if (loc) {
            setStartLat(loc.latitude ? Number(loc.latitude) : null)
            setStartLng(loc.longitude ? Number(loc.longitude) : null)
        } else {
            setStartLat(null)
            setStartLng(null)
        }
    }

    const handleStopLocationChange = (index: number, name: string, loc: MessengerLocation | null) => {
        setFormStops(prev => {
            const updated = [...prev]
            updated[index] = {
                ...updated[index],
                location_name: name,
                location_id: loc?.id || null,
                lat: loc?.latitude ? Number(loc.latitude) : null,
                lng: loc?.longitude ? Number(loc.longitude) : null,
            }
            return updated
        })
    }

    // Open create location modal (instead of instant create)
    const handleCreateNewLocation = async (name: string, forStart: boolean = false, stopIndex?: number) => {
        setNewLocName(name)
        setNewLocLat('')
        setNewLocLng('')
        setNewLocCategory('อื่นๆ')
        setNewLocForStart(forStart)
        setNewLocStopIndex(stopIndex)
        setNewLocModalOpen(true)

        // Auto-geocode in background as suggestion
        setNewLocGeocoding(true)
        try {
            const geo = await geocodeLocation(name)
            if (geo) {
                setNewLocLat(geo.lat.toFixed(7))
                setNewLocLng(geo.lng.toFixed(7))
            }
        } catch { /* ignore */ }
        setNewLocGeocoding(false)
    }

    // Confirm create location from modal
    const handleConfirmCreateLocation = async () => {
        if (!newLocName.trim()) {
            notifications.show({ title: 'กรุณากรอกชื่อสถานที่', message: '', color: 'red' })
            return
        }

        setNewLocCreating(true)
        try {
            const lat = newLocLat ? parseFloat(newLocLat) : undefined
            const lng = newLocLng ? parseFloat(newLocLng) : undefined

            const newLoc = await createLocation({
                name: newLocName.trim(),
                latitude: (lat && !isNaN(lat)) ? lat : undefined,
                longitude: (lng && !isNaN(lng)) ? lng : undefined,
                category: newLocCategory || 'อื่นๆ',
            })

            fetchLocations()

            const hasCoords = newLoc.latitude && newLoc.longitude
            notifications.show({
                title: '✅ เพิ่มสถานที่สำเร็จ',
                message: hasCoords
                    ? `"${newLoc.name}" — พิกัด (${Number(newLoc.latitude).toFixed(4)}, ${Number(newLoc.longitude).toFixed(4)})`
                    : `"${newLoc.name}" — ยังไม่มีพิกัด`,
                color: hasCoords ? 'green' : 'orange'
            })

            // Apply to the field
            if (newLocForStart) {
                setStartLocation(newLoc.name)
                setStartLat(newLoc.latitude ? Number(newLoc.latitude) : null)
                setStartLng(newLoc.longitude ? Number(newLoc.longitude) : null)
            } else if (newLocStopIndex !== undefined) {
                setFormStops(prev => {
                    const updated = [...prev]
                    updated[newLocStopIndex] = {
                        ...updated[newLocStopIndex],
                        location_name: newLoc.name,
                        location_id: newLoc.id,
                        lat: newLoc.latitude ? Number(newLoc.latitude) : null,
                        lng: newLoc.longitude ? Number(newLoc.longitude) : null,
                    }
                    return updated
                })
            }

            setNewLocModalOpen(false)
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเพิ่มสถานที่ได้', color: 'red' })
        } finally {
            setNewLocCreating(false)
        }
    }

    // ============================================================
    // Auto-calculate distance for all stops
    // ============================================================

    const autoCalcAllDistances = async () => {
        if (!startLat || !startLng) {
            notifications.show({ title: 'ไม่มีพิกัดจุดเริ่มต้น', message: 'กรุณาเลือกจุดเริ่มต้นที่มีพิกัด', color: 'orange' })
            return
        }

        const stopsWithCoords = formStops
            .map((s, i) => ({ ...s, index: i }))
            .filter(s => s.lat && s.lng)

        if (stopsWithCoords.length === 0) {
            notifications.show({ title: 'พิกัดไม่เพียงพอ', message: 'ต้องมีอย่างน้อย 1 จุดแวะที่มีพิกัด', color: 'orange' })
            return
        }

        setCalcInProgress(true)
        try {
            const updatedStops = [...formStops]

            for (let i = 0; i < stopsWithCoords.length; i++) {
                const fromPt = i === 0
                    ? { lat: startLat, lng: startLng }
                    : { lat: stopsWithCoords[i - 1].lat!, lng: stopsWithCoords[i - 1].lng! }
                const toPt = { lat: stopsWithCoords[i].lat!, lng: stopsWithCoords[i].lng! }

                const result = await calcDrivingDistance([fromPt, toPt])
                if (result) {
                    updatedStops[stopsWithCoords[i].index] = {
                        ...updatedStops[stopsWithCoords[i].index],
                        distance_km: result.distance_km,
                        estimated_time: `~${result.duration_min} นาที`,
                    }
                }

                if (i < stopsWithCoords.length - 1) {
                    await new Promise(r => setTimeout(r, 300))
                }
            }

            setFormStops(updatedStops)
            notifications.show({
                title: '✅ คำนวณระยะทางสำเร็จ',
                message: `คำนวณ ${stopsWithCoords.length} จุด เรียบร้อย`,
                color: 'green'
            })
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถคำนวณระยะทางได้', color: 'red' })
        } finally {
            setCalcInProgress(false)
        }
    }

    // ============================================================
    // Create Route
    // ============================================================

    const handleCreate = async () => {
        if (!formDate) {
            notifications.show({ title: 'กรุณากรอกข้อมูล', message: 'ต้องระบุวันที่', color: 'red' })
            return
        }

        setCreating(true)
        try {
            // Increment usage count for used locations
            for (const stop of formStops) {
                if (stop.location_id) {
                    incrementLocationUsage(stop.location_id).catch(() => { })
                }
            }

            const data: CreateRouteData = {
                route_date: formDate.toISOString().split('T')[0],
                notes: formNotes.trim() || undefined,
                start_location: startLocation.trim() || undefined,
                start_lat: startLat,
                start_lng: startLng,
                stops: formStops
                    .filter(s => s.location_name.trim())
                    .map((s, i) => ({
                        sort_order: i,
                        location_name: s.location_name.trim(),
                        tasks: s.tasks.filter(t => t.trim()),
                        distance_km: s.distance_km,
                        estimated_time: s.estimated_time || undefined,
                        notes: s.notes || undefined,
                        latitude: s.lat,
                        longitude: s.lng,
                    })),
            }

            await createRoute(data)
            notifications.show({ title: 'สำเร็จ', message: 'สร้างตารางวิ่งแล้ว', color: 'green' })
            setCreateModalOpen(false)
            resetForm()
            fetchRoutes()
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถสร้างตารางได้',
                color: 'red'
            })
        } finally {
            setCreating(false)
        }
    }

    // ============================================================
    // View Detail
    // ============================================================

    const viewDetail = async (id: string) => {
        setDetailLoading(true)
        setDetailModalOpen(true)
        try {
            const route = await getRouteDetail(id)
            setSelectedRoute(route)
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลได้', color: 'red' })
        } finally {
            setDetailLoading(false)
        }
    }

    const handleUpdateStopStatus = async (stopId: string, status: 'completed' | 'failed', notes?: string) => {
        try {
            await updateStop(stopId, { status, notes })
            if (selectedRoute) {
                const route = await getRouteDetail(selectedRoute.id)
                setSelectedRoute(route)
            }
            fetchRoutes()
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอัปเดตได้', color: 'red' })
        }
    }

    const handleUpdateRouteStatus = async (id: string, status: string) => {
        try {
            await updateRoute(id, { status })
            notifications.show({ title: 'สำเร็จ', message: 'อัปเดตสถานะแล้ว', color: 'green' })
            if (selectedRoute?.id === id) {
                const route = await getRouteDetail(id)
                setSelectedRoute(route)
            }
            fetchRoutes()
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอัปเดตได้', color: 'red' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('ต้องการลบตารางวิ่งนี้หรือไม่?')) return
        try {
            await deleteRoute(id)
            notifications.show({ title: 'สำเร็จ', message: 'ลบตารางวิ่งแล้ว', color: 'green' })
            fetchRoutes()
        } catch (error) {
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถลบได้', color: 'red' })
        }
    }

    // Computed
    const formTotalDistance = formStops.reduce((sum, s) => sum + (s.distance_km || 0), 0)
    const geocodedCount = formStops.filter(s => s.lat && s.lng).length

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header Banner */}
                <Card
                    withBorder radius="xl" p="lg"
                    style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)', border: 'none' }}
                >
                    <Group justify="space-between" align="center">
                        <Group gap="md">
                            <Box style={{
                                width: 56, height: 56, borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TbTruckDelivery size={32} color="white" />
                            </Box>
                            <div>
                                <Title order={2} c="white" fw={700}>ตารางวิ่งแมส</Title>
                                <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                                    ระบบจัดการเส้นทางวิ่งแมสเซนเจอร์ — เลือกสถานที่ + คำนวณอัตโนมัติ
                                </Text>
                            </div>
                        </Group>
                        <Button
                            variant="white" color="blue"
                            leftSection={<TbPlus size={18} />} radius="lg"
                            onClick={() => { resetForm(); setCreateModalOpen(true) }}
                            style={{ fontWeight: 600 }}
                        >
                            สร้างตาราง
                        </Button>
                    </Group>
                </Card>

                {/* Loading */}
                {loading && <Box ta="center" py="xl"><Loader size="md" /></Box>}

                {/* Empty state */}
                {!loading && routes.length === 0 && (
                    <Card withBorder radius="lg" p="xl">
                        <Stack align="center" gap="md" py="md">
                            <TbTruckDelivery size={48} color="#ccc" />
                            <Text c="dimmed" ta="center">ยังไม่มีตารางวิ่ง — กดปุ่ม "สร้างตาราง" เพื่อเริ่มต้น</Text>
                        </Stack>
                    </Card>
                )}

                {/* Routes Table */}
                {!loading && routes.length > 0 && (
                    <Card withBorder radius="lg" p="md">
                        <Text fw={600} size="md" mb="sm">📋 ตารางวิ่งทั้งหมด</Text>
                        <Table.ScrollContainer minWidth={700}>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>วันที่</Table.Th>
                                        <Table.Th ta="center">จุดแวะ</Table.Th>
                                        <Table.Th ta="center">สำเร็จ</Table.Th>
                                        <Table.Th ta="right">ระยะทาง</Table.Th>
                                        <Table.Th ta="center">สถานะ</Table.Th>
                                        <Table.Th ta="center">จัดการ</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {routes.map(route => {
                                        const st = statusConfig[route.status] || statusConfig.planned
                                        const totalStops = Number(route.total_stops) || 0
                                        const completedStops = Number(route.completed_stops) || 0
                                        const failedStops = Number(route.failed_stops) || 0
                                        const hasIssue = failedStops > 0
                                        return (
                                            <Table.Tr key={route.id}>
                                                <Table.Td>
                                                    {new Date(route.route_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </Table.Td>
                                                <Table.Td ta="center">{totalStops}</Table.Td>
                                                <Table.Td ta="center">
                                                    <Group gap={4} justify="center">
                                                        <Text size="sm" c={hasIssue ? 'red' : 'green'}>
                                                            {completedStops}/{totalStops}
                                                        </Text>
                                                        {hasIssue && (
                                                            <Tooltip label={`${failedStops} จุดไม่สำเร็จ`}>
                                                                <ThemeIcon size={16} variant="transparent" color="red">
                                                                    <TbAlertTriangle size={14} />
                                                                </ThemeIcon>
                                                            </Tooltip>
                                                        )}
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td ta="right">{Number(route.total_distance).toFixed(1)} km</Table.Td>
                                                <Table.Td ta="center">
                                                    <Badge size="sm" variant="light" color={st.color}>{st.label}</Badge>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Group gap={4} justify="center">
                                                        <Tooltip label="ดูรายละเอียด">
                                                            <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => viewDetail(route.id)}>
                                                                <TbEye size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Tooltip label="ลบ">
                                                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(route.id)}>
                                                                <TbTrash size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        )
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}
            </Stack>

            {/* ============================================================ */}
            {/* Create Route Modal */}
            {/* ============================================================ */}
            <Modal
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title={<Group gap="sm"><TbPlus size={20} /><Text fw={700} size="lg">สร้างตารางวิ่ง</Text></Group>}
                size="lg" radius="lg"
            >
                <Stack gap="md">
                    <SimpleGrid cols={2}>
                        <DateInput
                            label="วันที่วิ่ง" value={formDate} onChange={setFormDate}
                            required valueFormat="DD/MM/YYYY"
                        />
                        <Box>
                            <Text size="sm" fw={500} mb={4}>ระยะทางรวม</Text>
                            <Text size="lg" fw={700} c="orange">{formTotalDistance.toFixed(1)} km</Text>
                        </Box>
                    </SimpleGrid>

                    {/* ===== จุดเริ่มต้น ===== */}
                    <Divider
                        label={<Group gap={6}><TbCurrentLocation size={16} /><Text size="sm" fw={600}>จุดเริ่มต้น</Text></Group>}
                        labelPosition="center"
                    />

                    <Card withBorder radius="md" p="sm" style={{ backgroundColor: '#e8f5e9', borderColor: '#66bb6a' }}>
                        <LocationSelect
                            locations={locations}
                            value={startLocation}
                            onChange={handleStartLocationChange}
                            onCreateNew={(name) => handleCreateNewLocation(name, true)}
                            label="สถานที่เริ่มต้น"
                            placeholder="พิมพ์ค้นหาหรือเลือกจากรายการ..."
                        />
                        {startLat && startLng && (
                            <Text size="xs" c="dimmed" mt={4}>
                                ✅ พิกัด: {startLat.toFixed(5)}, {startLng.toFixed(5)}
                            </Text>
                        )}
                        {startLocation && !startLat && (
                            <Text size="xs" c="orange" mt={4}>
                                ⚠️ ยังไม่มีพิกัด — เลือกจากรายการที่มีเครื่องหมาย 📍
                            </Text>
                        )}
                    </Card>

                    <Textarea
                        label="หมายเหตุรวม" placeholder="หมายเหตุสำหรับทริปนี้..."
                        value={formNotes} onChange={(e) => setFormNotes(e.currentTarget.value)}
                        autosize minRows={2}
                    />

                    {/* ===== จุดแวะ ===== */}
                    <Divider label="จุดแวะ" labelPosition="center" />

                    {formStops.map((stop, index) => (
                        <Card key={index} withBorder radius="md" p="sm" style={{ backgroundColor: '#f8f9fa' }}>
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs">
                                    <Badge size="sm" variant="outline" color="gray">จุดที่ {index + 1}</Badge>
                                    {stop.lat && stop.lng && <Badge size="xs" variant="light" color="green">📍 มีพิกัด</Badge>}
                                </Group>
                                <Group gap={4}>
                                    <ActionIcon size="xs" variant="subtle" disabled={index === 0} onClick={() => moveFormStop(index, 'up')}>
                                        <TbArrowUp size={14} />
                                    </ActionIcon>
                                    <ActionIcon size="xs" variant="subtle" disabled={index === formStops.length - 1} onClick={() => moveFormStop(index, 'down')}>
                                        <TbArrowDown size={14} />
                                    </ActionIcon>
                                    <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeFormStop(index)}>
                                        <TbTrash size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <SimpleGrid cols={2} spacing="xs">
                                <LocationSelect
                                    locations={locations}
                                    value={stop.location_name}
                                    onChange={(name, loc) => handleStopLocationChange(index, name, loc)}
                                    onCreateNew={(name) => handleCreateNewLocation(name, false, index)}
                                    label="สถานที่"
                                    placeholder="พิมพ์ค้นหาหรือเลือก..."
                                />
                                <NumberInput
                                    label="ระยะทาง (km)" placeholder="0"
                                    value={stop.distance_km}
                                    onChange={(v) => updateFormStop(index, 'distance_km', v || 0)}
                                    size="sm" min={0} decimalScale={1}
                                    leftSection={<TbRoute size={14} />}
                                />
                            </SimpleGrid>

                            <SimpleGrid cols={2} spacing="xs" mt="xs">
                                <TextInput
                                    label="เวลาโดยประมาณ" placeholder="เช่น 09:00 หรือ ~30 นาที"
                                    value={stop.estimated_time}
                                    onChange={(e) => updateFormStop(index, 'estimated_time', e.currentTarget.value)}
                                    size="sm" leftSection={<TbClock size={14} />}
                                />
                                <TextInput
                                    label="งาน/เอกสาร" placeholder="เช่น จดทะเบียนบริษัท, ยื่น VAT"
                                    value={stop.tasks.join(', ')}
                                    onChange={(e) => updateFormStop(index, 'tasks', e.currentTarget.value.split(',').map(t => t.trim()))}
                                    size="sm"
                                />
                            </SimpleGrid>

                            <TextInput
                                label="หมายเหตุ" placeholder="หมายเหตุสำหรับจุดนี้..."
                                value={stop.notes}
                                onChange={(e) => updateFormStop(index, 'notes', e.currentTarget.value)}
                                size="sm" mt="xs" leftSection={<TbNotes size={14} />}
                            />
                        </Card>
                    ))}

                    <Button variant="light" leftSection={<TbPlus size={16} />} onClick={addFormStop} fullWidth>
                        เพิ่มจุดแวะ
                    </Button>

                    {/* Auto-calc distance */}
                    {formStops.length > 0 && (
                        <Card withBorder radius="md" p="sm" style={{ backgroundColor: '#fff3e0', borderColor: '#ffa726' }}>
                            <Group justify="space-between" align="center">
                                <div>
                                    <Text size="sm" fw={600} c="orange.8">
                                        <TbCalculator size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                        คำนวณระยะทางอัตโนมัติ
                                    </Text>
                                    <Text size="xs" c="dimmed" mt={2}>
                                        {geocodedCount}/{formStops.length} จุดมีพิกัด
                                        {startLat && startLng ? ' + จุดเริ่มต้น ✅' : ' — ยังไม่มีพิกัดจุดเริ่มต้น'}
                                    </Text>
                                </div>
                                <Button
                                    size="sm" color="orange"
                                    leftSection={<TbCalculator size={16} />}
                                    onClick={autoCalcAllDistances}
                                    loading={calcInProgress}
                                    disabled={!startLat || !startLng || geocodedCount === 0}
                                >
                                    คำนวณ
                                </Button>
                            </Group>
                            {calcInProgress && <Progress value={100} animated size="xs" mt="xs" color="orange" />}
                        </Card>
                    )}

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setCreateModalOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleCreate} loading={creating} leftSection={<TbCheck size={16} />}>
                            สร้างตาราง
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================================================ */}
            {/* Detail / View Modal */}
            {/* ============================================================ */}
            <Modal
                opened={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedRoute(null) }}
                title={<Group gap="sm"><TbEye size={20} /><Text fw={700} size="lg">รายละเอียดตารางวิ่ง</Text></Group>}
                size="lg" radius="lg"
            >
                {detailLoading && <Box ta="center" py="xl"><Loader /></Box>}

                {!detailLoading && selectedRoute && (
                    <Stack gap="md">
                        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#f0f7ff' }}>
                            <SimpleGrid cols={2} spacing="sm">
                                <div>
                                    <Text size="xs" c="dimmed">วันที่</Text>
                                    <Text fw={600}>
                                        {new Date(selectedRoute.route_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed">ระยะทางรวม</Text>
                                    <Text fw={700} c="blue" size="lg">{Number(selectedRoute.total_distance).toFixed(1)} km</Text>
                                </div>
                            </SimpleGrid>

                            {selectedRoute.start_location && (
                                <Box mt="sm" p="xs" style={{ backgroundColor: '#e8f5e9', borderRadius: 8 }}>
                                    <Text size="xs" c="dimmed">🚩 จุดเริ่มต้น:</Text>
                                    <Text size="sm" fw={500}>{selectedRoute.start_location}</Text>
                                </Box>
                            )}

                            {selectedRoute.notes && (
                                <Box mt="sm" p="xs" style={{ backgroundColor: '#fff3e0', borderRadius: 8 }}>
                                    <Text size="xs" c="dimmed">หมายเหตุ:</Text>
                                    <Text size="sm">{selectedRoute.notes}</Text>
                                </Box>
                            )}

                            <Group mt="sm" gap="xs">
                                <Text size="xs" c="dimmed">สถานะ:</Text>
                                <Select
                                    size="xs" value={selectedRoute.status}
                                    data={[
                                        { value: 'planned', label: '📝 วางแผน' },
                                        { value: 'in_progress', label: '🔄 กำลังดำเนินการ' },
                                        { value: 'completed', label: '✅ เสร็จสิ้น' },
                                    ]}
                                    onChange={(v) => v && handleUpdateRouteStatus(selectedRoute.id, v)}
                                    style={{ width: 180 }}
                                />
                            </Group>
                        </Card>

                        {/* 🗺️ Map */}
                        <Divider label="🗺️ แผนที่เส้นทาง" labelPosition="center" />
                        <RouteMap
                            startLocation={selectedRoute.start_location}
                            startLat={selectedRoute.start_lat}
                            startLng={selectedRoute.start_lng}
                            stops={selectedRoute.stops}
                            height={350}
                        />

                        <Divider label="เส้นทาง" labelPosition="center" />

                        {/* Starting point marker */}
                        {selectedRoute.start_location && (
                            <Box>
                                <Group gap="sm" align="flex-start">
                                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                                        <ThemeIcon size={32} radius="xl" color="teal" variant="filled">
                                            <TbCurrentLocation size={16} />
                                        </ThemeIcon>
                                        {selectedRoute.stops.length > 0 && (
                                            <Box style={{ width: 2, height: 40, backgroundColor: '#dee2e6', margin: '4px 0' }} />
                                        )}
                                    </Box>
                                    <Card withBorder radius="md" p="sm" style={{ flex: 1, backgroundColor: '#e8f5e9' }}>
                                        <Text fw={600} size="sm">🚩 {selectedRoute.start_location}</Text>
                                        <Text size="xs" c="dimmed">จุดเริ่มต้น</Text>
                                    </Card>
                                </Group>
                            </Box>
                        )}

                        {/* Stops Timeline */}
                        {selectedRoute.stops.map((stop, i) => {
                            const st = stopStatusConfig[stop.status] || stopStatusConfig.pending
                            const StIcon = st.icon
                            return (
                                <Box key={stop.id || i}>
                                    <Group gap="sm" align="flex-start">
                                        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                                            <ThemeIcon size={32} radius="xl" color={st.color} variant="filled">
                                                <StIcon size={16} />
                                            </ThemeIcon>
                                            {i < selectedRoute.stops.length - 1 && (
                                                <Box style={{ width: 2, height: 40, backgroundColor: '#dee2e6', margin: '4px 0' }} />
                                            )}
                                        </Box>
                                        <Card withBorder radius="md" p="sm" style={{ flex: 1 }}>
                                            <Group justify="space-between">
                                                <div>
                                                    <Text fw={600} size="sm">{stop.location_name}</Text>
                                                    {stop.estimated_time && <Text size="xs" c="dimmed">⏰ {stop.estimated_time}</Text>}
                                                </div>
                                                <Group gap="xs">
                                                    {stop.distance_km > 0 && (
                                                        <Badge size="xs" variant="light" color="blue">
                                                            {Number(stop.distance_km).toFixed(1)} km
                                                        </Badge>
                                                    )}
                                                    <Badge size="xs" variant="light" color={st.color}>{st.label}</Badge>
                                                </Group>
                                            </Group>

                                            {stop.tasks && stop.tasks.length > 0 && (
                                                <Group gap={4} mt={4}>
                                                    {stop.tasks.map((task, ti) => (
                                                        <Badge key={ti} size="xs" variant="outline" color="gray">📋 {task}</Badge>
                                                    ))}
                                                </Group>
                                            )}

                                            {stop.notes && (
                                                <Box mt={4} p={6} style={{
                                                    backgroundColor: stop.status === 'failed' ? '#ffebee' : '#fff8e1',
                                                    borderRadius: 6,
                                                    borderLeft: `3px solid ${stop.status === 'failed' ? '#e53935' : '#f9a825'}`,
                                                }}>
                                                    <Text size="xs">
                                                        {stop.status === 'failed' ? '⚠️' : '📝'} {stop.notes}
                                                    </Text>
                                                </Box>
                                            )}

                                            {stop.status === 'pending' && stop.id && (
                                                <Group gap="xs" mt="xs">
                                                    <Button size="xs" variant="light" color="green" leftSection={<TbCheck size={12} />}
                                                        onClick={() => handleUpdateStopStatus(stop.id!, 'completed')}>
                                                        สำเร็จ
                                                    </Button>
                                                    <Button size="xs" variant="light" color="red" leftSection={<TbX size={12} />}
                                                        onClick={() => {
                                                            const note = window.prompt('หมายเหตุ (เหตุผลที่ไม่สำเร็จ):')
                                                            if (note !== null) handleUpdateStopStatus(stop.id!, 'failed', note || undefined)
                                                        }}>
                                                        ไม่สำเร็จ
                                                    </Button>
                                                </Group>
                                            )}
                                        </Card>
                                    </Group>
                                </Box>
                            )
                        })}

                        {selectedRoute.stops.length === 0 && (
                            <Text c="dimmed" ta="center" py="md">ไม่มีจุดแวะ</Text>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* ============================================================ */}
            {/* Create Location Modal */}
            {/* ============================================================ */}
            <Modal
                opened={newLocModalOpen}
                onClose={() => setNewLocModalOpen(false)}
                title={<Group gap="sm"><TbMapPin size={20} /><Text fw={700} size="lg">เพิ่มสถานที่ใหม่</Text></Group>}
                size="md" radius="lg"
                styles={{ content: { overflow: 'visible' } }}
            >
                <Stack gap="md">
                    <TextInput
                        label="ชื่อสถานที่"
                        placeholder="เช่น กรมพัฒนาธุรกิจการค้า"
                        value={newLocName}
                        onChange={(e) => setNewLocName(e.currentTarget.value)}
                        required
                        leftSection={<TbMapPin size={16} />}
                    />

                    <TextInput
                        label="หมวดหมู่"
                        placeholder="เช่น สำนักงาน, ธนาคาร, ราชการ"
                        value={newLocCategory}
                        onChange={(e) => setNewLocCategory(e.currentTarget.value)}
                    />

                    <Divider label="📍 พิกัด (Latitude / Longitude)" labelPosition="center" />

                    {newLocGeocoding && (
                        <Group gap="xs" justify="center">
                            <Loader size="xs" />
                            <Text size="xs" c="dimmed">กำลังค้นหาพิกัดอัตโนมัติ...</Text>
                        </Group>
                    )}

                    <TextInput
                        label="วางพิกัดจาก Google Maps"
                        placeholder="เช่น 13.933055, 100.354641"
                        description="คัดลอกพิกัดจาก Google Maps แล้ววางที่นี่ (ระบบจะแยก Lat/Lng ให้อัตโนมัติ)"
                        leftSection={<TbCurrentLocation size={16} />}
                        value={newLocLat && newLocLng ? `${newLocLat}, ${newLocLng}` : ''}
                        onChange={(e) => {
                            const val = e.currentTarget.value.trim()
                            // Try to parse "lat, lng" format from Google Maps
                            const parts = val.split(',').map(p => p.trim())
                            if (parts.length === 2 && parts[0] && parts[1]) {
                                setNewLocLat(parts[0])
                                setNewLocLng(parts[1])
                            } else if (val === '') {
                                setNewLocLat('')
                                setNewLocLng('')
                            } else {
                                // Partial input — store in lat for now
                                setNewLocLat(val)
                                setNewLocLng('')
                            }
                        }}
                        styles={{
                            input: {
                                fontFamily: 'monospace',
                                fontSize: 14,
                            }
                        }}
                    />

                    {newLocLat && newLocLng && (
                        <SimpleGrid cols={2}>
                            <Box p="xs" style={{ backgroundColor: '#e8f5e9', borderRadius: 8 }}>
                                <Text size="xs" c="dimmed">Latitude (ละติจูด)</Text>
                                <Text fw={600} ff="monospace">{newLocLat}</Text>
                            </Box>
                            <Box p="xs" style={{ backgroundColor: '#e8f5e9', borderRadius: 8 }}>
                                <Text size="xs" c="dimmed">Longitude (ลองจิจูด)</Text>
                                <Text fw={600} ff="monospace">{newLocLng}</Text>
                            </Box>
                        </SimpleGrid>
                    )}

                    <Box p="xs" style={{ backgroundColor: '#e3f2fd', borderRadius: 8 }}>
                        <Text size="xs" c="dimmed">
                            💡 <strong>วิธีหาพิกัด:</strong> เปิด Google Maps → คลิกขวาที่สถานที่ → คลิกตัวเลขพิกัดเพื่อคัดลอก → วางที่ช่องด้านบน
                        </Text>
                    </Box>

                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" onClick={() => setNewLocModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleConfirmCreateLocation}
                            loading={newLocCreating}
                            leftSection={<TbCheck size={16} />}
                            gradient={{ from: 'teal', to: 'green', deg: 105 }}
                            variant="gradient"
                        >
                            บันทึกสถานที่
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    )
}
