/**
 * Messenger Routes Page (ตารางวิ่งแมส)
 * หน้าจัดการตารางวิ่งแมสเซนเจอร์
 * ✅ เลือกสถานที่จาก dropdown (Searchable + Creatable)
 * ✅ คำนวณระยะทางอัตโนมัติ (OSRM + Nominatim)
 * ✅ ระบุจุดเริ่มต้นได้
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import {
    Container, Stack, Card, Group, Text, Badge, Box, Title, Button,
    Loader, ThemeIcon, Modal, TextInput,
    Divider, SimpleGrid,
    Tabs,
    SegmentedControl
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import {
    TbTruckDelivery, TbPlus, TbTrash,
    TbCheck, TbMapPin, TbCurrentLocation, TbMotorbike, TbClipboardList, TbHistory,
    TbChartBar, TbRoad
} from 'react-icons/tb'
import {
    MessengerRoute, CreateRouteData, MessengerLocation, MessengerPendingTask,
    getRoutes, getRouteDetail, createRoute, updateRoute, deleteRoute,
    updateStop, geocodeLocation, calcDrivingDistance,
    getLocations, createLocation, incrementLocationUsage,
    getMessengerPendingTasks
} from '../services/messengerRouteService'
import {
    LocationSelect, statusConfig, stopStatusConfig, type FormStop,
    ActiveRoutesTab, PendingTasksTab, HistoryTab, DashboardTab,
    CreateRouteModal, RouteDetailModal
} from '../components/MessengerRoutes'


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

    // Tab + Pending tasks
    const [activeTab, setActiveTab] = useState<string | null>('dashboard')
    const [pendingTasks, setPendingTasks] = useState<MessengerPendingTask[]>([])
    const [pendingLoading, setPendingLoading] = useState(false)
    const [dashboardPeriod, setDashboardPeriod] = useState('all')

    // Selected pending tasks for route creation
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
    const [customDateStart, setCustomDateStart] = useState<Date | null>(null)
    const [customDateEnd, setCustomDateEnd] = useState<Date | null>(null)

    // Computed route categories
    const activeRoutes = useMemo(() => routes.filter(r => r.status === 'planned' || r.status === 'in_progress'), [routes])
    const completedRoutes = useMemo(() => routes.filter(r => r.status === 'completed'), [routes])

    // Filter routes by dashboard period
    const filteredDashboardRoutes = useMemo(() => {
        if (dashboardPeriod === 'all') return routes

        if (dashboardPeriod === 'custom') {
            if (!customDateStart && !customDateEnd) return routes
            return routes.filter(r => {
                const routeDate = new Date(r.route_date)
                const rd = new Date(routeDate.getFullYear(), routeDate.getMonth(), routeDate.getDate())
                if (customDateStart && !customDateEnd) return rd >= customDateStart
                if (!customDateStart && customDateEnd) return rd <= customDateEnd
                return rd >= customDateStart! && rd <= customDateEnd!
            })
        }

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        let startDate: Date
        if (dashboardPeriod === 'daily') {
            startDate = today
        } else if (dashboardPeriod === 'weekly') {
            const day = today.getDay()
            const mondayOffset = day === 0 ? -6 : 1 - day
            startDate = new Date(today)
            startDate.setDate(today.getDate() + mondayOffset)
        } else {
            // monthly
            startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        }

        return routes.filter(r => {
            const routeDate = new Date(r.route_date)
            return routeDate >= startDate && routeDate <= now
        })
    }, [routes, dashboardPeriod, customDateStart, customDateEnd])

    // Period label helper
    const periodLabel = useMemo(() => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const fmt = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

        if (dashboardPeriod === 'daily') return `วันนี้ (${fmt(today)})`
        if (dashboardPeriod === 'weekly') {
            const day = today.getDay()
            const mondayOffset = day === 0 ? -6 : 1 - day
            const monday = new Date(today)
            monday.setDate(today.getDate() + mondayOffset)
            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            return `สัปดาห์นี้ (${fmt(monday)} - ${fmt(sunday)})`
        }
        if (dashboardPeriod === 'monthly') {
            const monthName = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
            return `เดือนนี้ (${monthName})`
        }
        if (dashboardPeriod === 'custom') {
            if (customDateStart && customDateEnd) return `${fmt(customDateStart)} - ${fmt(customDateEnd)}`
            if (customDateStart) return `ตั้งแต่ ${fmt(customDateStart)}`
            if (customDateEnd) return `ถึง ${fmt(customDateEnd)}`
            return 'เลือกช่วงเวลา'
        }
        return 'ทั้งหมด'
    }, [dashboardPeriod, customDateStart, customDateEnd])

    // Dashboard stats — uses filteredDashboardRoutes
    const dashboardStats = useMemo(() => {
        const src = filteredDashboardRoutes
        const totalDistance = src.reduce((sum, r) => sum + Number(r.total_distance || 0), 0)
        const totalStops = src.reduce((sum, r) => sum + Number(r.total_stops || 0), 0)
        const completedStopsCount = src.reduce((sum, r) => sum + Number(r.completed_stops || 0), 0)
        const failedStopsCount = src.reduce((sum, r) => sum + Number(r.failed_stops || 0), 0)
        const pendingStopsCount = totalStops - completedStopsCount - failedStopsCount

        const routesByStatus = {
            planned: src.filter(r => r.status === 'planned').length,
            in_progress: src.filter(r => r.status === 'in_progress').length,
            completed: src.filter(r => r.status === 'completed').length,
        }

        const totalRoutes = src.length
        const routeStatusSections = totalRoutes > 0
            ? [
                { value: (routesByStatus.completed / totalRoutes) * 100, color: '#40c057', tooltip: `เสร็จสิ้น ${routesByStatus.completed}` },
                { value: (routesByStatus.in_progress / totalRoutes) * 100, color: '#fab005', tooltip: `กำลังวิ่ง ${routesByStatus.in_progress}` },
                { value: (routesByStatus.planned / totalRoutes) * 100, color: '#ff922b', tooltip: `วางแผน ${routesByStatus.planned}` },
            ]
            : [{ value: 100, color: '#e9ecef' }]

        const stopCompletionPct = totalStops > 0 ? Math.round((completedStopsCount / totalStops) * 100) : 0
        const stopFailedPct = totalStops > 0 ? Math.round((failedStopsCount / totalStops) * 100) : 0
        const stopPendingPct = totalStops > 0 ? 100 - stopCompletionPct - stopFailedPct : 0

        return {
            totalDistance, totalStops, completedStopsCount, failedStopsCount, pendingStopsCount,
            routesByStatus, totalRoutes, routeStatusSections,
            stopCompletionPct, stopFailedPct, stopPendingPct,
        }
    }, [filteredDashboardRoutes])

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

    const fetchPendingTasks = useCallback(async () => {
        setPendingLoading(true)
        try {
            const data = await getMessengerPendingTasks()
            setPendingTasks(data)
        } catch (error) {
            console.error('Fetch pending tasks error:', error)
        } finally {
            setPendingLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRoutes()
        fetchLocations()
        fetchPendingTasks()
    }, [fetchRoutes, fetchLocations, fetchPendingTasks])

    // ============================================================
    // Form helpers
    // ============================================================

    const resetForm = () => {
        setFormDate(new Date())
        setFormNotes('')
        setFormStops([])
        setSelectedTaskIds([])
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

    // Import selected pending tasks as form stops — match against saved locations for coordinates
    const [importingTasks, setImportingTasks] = useState(false)
    const importPendingTasks = async () => {
        const tasksToImport = pendingTasks.filter(t => selectedTaskIds.includes(t.id))
        if (tasksToImport.length === 0) return

        setImportingTasks(true)

        // Helper: find a saved location matching the destination name
        const findMatchingLocation = (destination: string | null | undefined) => {
            if (!destination) return null
            const destLower = destination.toLowerCase().trim()
            // Exact match first
            let match = locations.find(l => l.name.toLowerCase().trim() === destLower)
            if (match) return match
            // Partial match (destination contains location name or vice versa)
            match = locations.find(l =>
                destLower.includes(l.name.toLowerCase().trim()) ||
                l.name.toLowerCase().trim().includes(destLower)
            )
            return match || null
        }

        let matchedCount = 0
        const newStops: FormStop[] = tasksToImport.map(task => {
            const dest = task.messenger_destination || task.client_address || ''
            // Try to match against saved locations
            const matchedLoc = findMatchingLocation(dest) || findMatchingLocation(task.client_address)

            if (matchedLoc && matchedLoc.latitude && matchedLoc.longitude) {
                matchedCount++
                return {
                    location_name: matchedLoc.name,
                    location_id: matchedLoc.id,
                    tasks: [task.messenger_details || task.notes || `งาน: ${task.client_name}`].filter(Boolean),
                    distance_km: 0,
                    estimated_time: '',
                    notes: `ลูกค้า: ${task.client_name} | แผนก: ${task.department?.toUpperCase() || '-'}`,
                    lat: Number(matchedLoc.latitude),
                    lng: Number(matchedLoc.longitude),
                }
            }

            return {
                location_name: dest,
                location_id: null,
                tasks: [task.messenger_details || task.notes || `งาน: ${task.client_name}`].filter(Boolean),
                distance_km: 0,
                estimated_time: '',
                notes: `ลูกค้า: ${task.client_name} | แผนก: ${task.department?.toUpperCase() || '-'}`,
                lat: null,
                lng: null,
            }
        })

        // For stops that didn't match saved locations, try geocoding as fallback
        for (let i = 0; i < newStops.length; i++) {
            if (!newStops[i].lat || !newStops[i].lng) {
                const addr = newStops[i].location_name
                if (addr && addr.length >= 3) {
                    try {
                        const geo = await geocodeLocation(addr)
                        if (geo) {
                            newStops[i].lat = geo.lat
                            newStops[i].lng = geo.lng
                            matchedCount++
                        }
                    } catch { /* ignore */ }
                    await new Promise(r => setTimeout(r, 1100))
                }
            }
        }

        setFormStops(prev => [...prev, ...newStops])
        setImportingTasks(false)

        const unmatchedCount = newStops.length - matchedCount
        if (unmatchedCount > 0) {
            notifications.show({
                title: `นำเข้า ${newStops.length} จุดแวะ`,
                message: `หาพิกัดได้ ${matchedCount} จุด — อีก ${unmatchedCount} จุด กรุณาเลือกสถานที่จากรายการที่มี 📍`,
                color: matchedCount > 0 ? 'green' : 'orange'
            })
        } else {
            notifications.show({
                title: 'นำเข้าสำเร็จ ✅',
                message: `เพิ่ม ${newStops.length} จุดแวะ (มีพิกัดครบทุกจุด)`,
                color: 'green'
            })
        }
    }

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        )
    }

    const toggleAllTasks = () => {
        if (selectedTaskIds.length === pendingTasks.length) {
            setSelectedTaskIds([])
        } else {
            setSelectedTaskIds(pendingTasks.map(t => t.id))
        }
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

        if (formStops.length === 0) {
            notifications.show({ title: 'ไม่มีจุดแวะ', message: 'กรุณาเพิ่มจุดแวะก่อน', color: 'orange' })
            return
        }

        setCalcInProgress(true)
        try {
            const updatedStops = [...formStops]

            // Step 1: Geocode stops that don't have coordinates yet
            let newlyGeocoded = 0
            for (let i = 0; i < updatedStops.length; i++) {
                if (!updatedStops[i].lat || !updatedStops[i].lng) {
                    const addr = updatedStops[i].location_name
                    if (addr) {
                        try {
                            const geo = await geocodeLocation(addr)
                            if (geo) {
                                updatedStops[i] = { ...updatedStops[i], lat: geo.lat, lng: geo.lng }
                                newlyGeocoded++
                            }
                        } catch { /* ignore */ }
                        await new Promise(r => setTimeout(r, 1100))
                    }
                }
            }

            // Step 2: Filter stops that now have coordinates
            const stopsWithCoords = updatedStops
                .map((s, i) => ({ ...s, index: i }))
                .filter(s => s.lat && s.lng)

            if (stopsWithCoords.length === 0) {
                setFormStops(updatedStops)
                notifications.show({
                    title: 'ค้นหาพิกัดไม่สำเร็จ',
                    message: 'ไม่พบพิกัดจุดแวะ — กรุณาเปลี่ยนชื่อสถานที่เป็นที่อยู่จริง หรือเลือกจากรายการที่มี 📍',
                    color: 'orange'
                })
                setCalcInProgress(false)
                return
            }

            // Step 3: Calculate driving distances
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
            const msg = newlyGeocoded > 0
                ? `ค้นหาพิกัดใหม่ ${newlyGeocoded} จุด + คำนวณ ${stopsWithCoords.length} จุด เรียบร้อย`
                : `คำนวณ ${stopsWithCoords.length} จุด เรียบร้อย`
            notifications.show({ title: '✅ คำนวณระยะทางสำเร็จ', message: msg, color: 'green' })
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
                linked_task_ids: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
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
            fetchPendingTasks()
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

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmId) return
        const id = deleteConfirmId
        setDeleteConfirmId(null)
        try {
            await deleteRoute(id)
            notifications.show({ title: 'สำเร็จ', message: 'ลบตารางวิ่งแล้ว', color: 'green' })
            fetchRoutes()
        } catch (error: any) {
            console.error('Delete error:', error)
            notifications.show({ title: 'เกิดข้อผิดพลาด', message: error?.message || 'ไม่สามารถลบได้', color: 'red' })
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
                                    ระบบจัดการเส้นทางวิ่งแมสเซนเจอร์ — จัดเส้นทาง + คำนวณระยะทางอัตโนมัติ
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

                {/* Stats Cards */}
                <SimpleGrid cols={{ base: 2, sm: 4 }}>
                    <Card withBorder radius="lg" p="md" style={{ background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)', borderColor: '#ffcc80' }}>
                        <Group gap="md">
                            <ThemeIcon size={48} radius="md" variant="light" color="orange">
                                <TbClipboardList size={24} />
                            </ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed" fw={500}>รอวิ่งแมส</Text>
                                <Group gap={4} align="baseline">
                                    <Text size="xl" fw={700} c="orange.8">{pendingTasks.length}</Text>
                                    <Text size="sm" c="dimmed">งาน</Text>
                                </Group>
                            </div>
                        </Group>
                    </Card>
                    <Card withBorder radius="lg" p="md" style={{ background: 'linear-gradient(135deg, #fffde7, #fff9c4)', borderColor: '#fff176' }}>
                        <Group gap="md">
                            <ThemeIcon size={48} radius="md" variant="light" color="yellow">
                                <TbMotorbike size={24} />
                            </ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed" fw={500}>กำลังวิ่ง</Text>
                                <Group gap={4} align="baseline">
                                    <Text size="xl" fw={700} c="yellow.8">{activeRoutes.length}</Text>
                                    <Text size="sm" c="dimmed">เส้นทาง</Text>
                                </Group>
                            </div>
                        </Group>
                    </Card>
                    <Card withBorder radius="lg" p="md" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', borderColor: '#a5d6a7' }}>
                        <Group gap="md">
                            <ThemeIcon size={48} radius="md" variant="light" color="green">
                                <TbCheck size={24} />
                            </ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed" fw={500}>เสร็จแล้ว</Text>
                                <Group gap={4} align="baseline">
                                    <Text size="xl" fw={700} c="green.8">{completedRoutes.length}</Text>
                                    <Text size="sm" c="dimmed">เส้นทาง</Text>
                                </Group>
                            </div>
                        </Group>
                    </Card>
                    <Card withBorder radius="lg" p="md" style={{ background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)', borderColor: '#f48fb1' }}>
                        <Group gap="md">
                            <ThemeIcon size={48} radius="md" variant="light" color="pink">
                                <TbRoad size={24} />
                            </ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed" fw={500}>ระยะทางรวม</Text>
                                <Group gap={4} align="baseline">
                                    <Text size="xl" fw={700} c="pink.8">{dashboardStats.totalDistance.toFixed(1)}</Text>
                                    <Text size="sm" c="dimmed">km</Text>
                                </Group>
                            </div>
                        </Group>
                    </Card>
                </SimpleGrid>

                {/* Loading */}
                {loading && <Box ta="center" py="xl"><Loader size="md" /></Box>}

                {/* Tabs */}
                {!loading && (
                    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <Tabs.List style={{ backgroundColor: '#fafafa' }}>
                                <Tabs.Tab value="dashboard" leftSection={<TbChartBar size={16} />}>
                                    📊 แดชบอร์ด
                                </Tabs.Tab>
                                <Tabs.Tab value="active" leftSection={<TbMotorbike size={16} />}
                                    rightSection={activeRoutes.length > 0 ? <Badge size="xs" variant="light" color="orange" circle>{activeRoutes.length}</Badge> : null}
                                >
                                    กำลังวิ่ง
                                </Tabs.Tab>
                                <Tabs.Tab value="pending" leftSection={<TbClipboardList size={16} />}
                                    rightSection={pendingTasks.length > 0 ? <Badge size="xs" variant="light" color="orange" circle>{pendingTasks.length}</Badge> : null}
                                >
                                    รอวิ่งแมส
                                </Tabs.Tab>
                                <Tabs.Tab value="history" leftSection={<TbHistory size={16} />}
                                    rightSection={completedRoutes.length > 0 ? <Badge size="xs" variant="light" color="green" circle>{completedRoutes.length}</Badge> : null}
                                >
                                    ประวัติ
                                </Tabs.Tab>
                            </Tabs.List>

                            {/* ===== TAB: กำลังวิ่ง ===== */}
                            <Tabs.Panel value="active" p="md">
                                <ActiveRoutesTab
                                    routes={activeRoutes}
                                    onViewDetail={viewDetail}
                                    onDelete={handleDelete}
                                />
                            </Tabs.Panel>

                            {/* ===== TAB: รอวิ่งแมส ===== */}
                            <Tabs.Panel value="pending" p="md">
                                <PendingTasksTab
                                    tasks={pendingTasks}
                                    loading={pendingLoading}
                                />
                            </Tabs.Panel>

                            {/* ===== TAB: ประวัติ ===== */}
                            <Tabs.Panel value="history" p="md">
                                <HistoryTab
                                    routes={completedRoutes}
                                    onViewDetail={viewDetail}
                                />
                            </Tabs.Panel>

                            {/* ===== TAB: แดชบอร์ด ===== */}
                            <Tabs.Panel value="dashboard" p="md">
                                <DashboardTab
                                    filteredRoutes={filteredDashboardRoutes}
                                    dashboardStats={dashboardStats}
                                    periodLabel={periodLabel}
                                    dashboardPeriod={dashboardPeriod}
                                    setDashboardPeriod={setDashboardPeriod}
                                    customDateStart={customDateStart}
                                    setCustomDateStart={setCustomDateStart}
                                    customDateEnd={customDateEnd}
                                    setCustomDateEnd={setCustomDateEnd}
                                    onViewDetail={viewDetail}
                                    onDelete={handleDelete}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Card>
                )}
            </Stack>

            {/* Create Route Modal */}
            <CreateRouteModal
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                formDate={formDate}
                setFormDate={setFormDate}
                formNotes={formNotes}
                setFormNotes={setFormNotes}
                formStops={formStops}
                formTotalDistance={formTotalDistance}
                startLocation={startLocation}
                startLat={startLat}
                startLng={startLng}
                handleStartLocationChange={handleStartLocationChange}
                locations={locations}
                handleCreateNewLocation={handleCreateNewLocation}
                addFormStop={addFormStop}
                removeFormStop={removeFormStop}
                moveFormStop={moveFormStop}
                updateFormStop={updateFormStop}
                handleStopLocationChange={handleStopLocationChange}
                pendingTasks={pendingTasks}
                selectedTaskIds={selectedTaskIds}
                toggleTaskSelection={toggleTaskSelection}
                toggleAllTasks={toggleAllTasks}
                importPendingTasks={importPendingTasks}
                importingTasks={importingTasks}
                geocodedCount={geocodedCount}
                autoCalcAllDistances={autoCalcAllDistances}
                calcInProgress={calcInProgress}
                handleCreate={handleCreate}
                creating={creating}
            />

            {/* Route Detail Modal */}
            <RouteDetailModal
                opened={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedRoute(null) }}
                route={selectedRoute}
                loading={detailLoading}
                onUpdateRouteStatus={handleUpdateRouteStatus}
                onUpdateStopStatus={handleUpdateStopStatus}
            />

            {/* Create Location Modal */}
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
                            const parts = val.split(',').map(p => p.trim())
                            if (parts.length === 2 && parts[0] && parts[1]) {
                                setNewLocLat(parts[0])
                                setNewLocLng(parts[1])
                            } else if (val === '') {
                                setNewLocLat('')
                                setNewLocLng('')
                            } else {
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

            {/* Delete Confirmation Modal */}
            <Modal
                opened={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title={<Group gap="sm"><TbTrash size={20} color="red" /><Text fw={700} size="lg">ยืนยันการลบ</Text></Group>}
                size="sm"
                radius="lg"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">ต้องการลบตารางวิ่งนี้หรือไม่? การลบจะไม่สามารถกู้คืนได้</Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setDeleteConfirmId(null)}>ยกเลิก</Button>
                        <Button color="red" leftSection={<TbTrash size={16} />} onClick={confirmDelete}>ลบเส้นทาง</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    )
}
