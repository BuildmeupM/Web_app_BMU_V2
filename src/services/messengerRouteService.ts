/**
 * Messenger Route Service
 * API service สำหรับจัดการตารางวิ่งแมส
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken(): string | null {
    try {
        const authStorage = sessionStorage.getItem('auth-storage')
        if (authStorage) {
            const parsed = JSON.parse(authStorage)
            return parsed?.state?.token || null
        }
    } catch {
        return null
    }
    return null
}

// Types
export interface RouteStop {
    id?: string
    route_id?: string
    sort_order: number
    location_name: string
    latitude?: number | null
    longitude?: number | null
    tasks: string[]
    distance_km: number
    estimated_time?: string
    actual_time?: string
    status: 'pending' | 'completed' | 'failed'
    notes?: string
}

export interface MessengerRoute {
    id: string
    route_date: string
    start_location?: string
    start_lat?: number | null
    start_lng?: number | null
    total_distance: number
    status: 'planned' | 'in_progress' | 'completed'
    notes?: string
    created_by?: string
    created_at?: string
    updated_at?: string
    stops: RouteStop[]
    // Aggregated from list query
    total_stops?: number
    completed_stops?: number
    failed_stops?: number
}

export interface CreateRouteData {
    route_date: string
    notes?: string
    start_location?: string
    start_lat?: number | null
    start_lng?: number | null
    stops: (Omit<RouteStop, 'id' | 'route_id' | 'status'> & { latitude?: number | null; longitude?: number | null })[]
}

// ============================================================
// Routes API
// ============================================================

export async function getRoutes(params?: { start_date?: string; end_date?: string; status?: string }): Promise<MessengerRoute[]> {
    const token = getToken()
    const searchParams = new URLSearchParams()
    if (params?.start_date) searchParams.append('start_date', params.start_date)
    if (params?.end_date) searchParams.append('end_date', params.end_date)
    if (params?.status) searchParams.append('status', params.status)
    searchParams.append('_t', Date.now().toString())

    const response = await axios.get<{ success: boolean; data: { routes: MessengerRoute[] } }>(
        `${API_URL}/api/messenger-routes?${searchParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }
    )
    return response.data.data.routes
}

export async function getRouteDetail(id: string): Promise<MessengerRoute> {
    const token = getToken()
    const response = await axios.get<{ success: boolean; data: { route: MessengerRoute } }>(
        `${API_URL}/api/messenger-routes/${id}?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.route
}

export async function createRoute(data: CreateRouteData): Promise<MessengerRoute> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { route: MessengerRoute } }>(
        `${API_URL}/api/messenger-routes`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.route
}

export async function updateRoute(id: string, data: Partial<{ messenger_name: string; vehicle_plate: string; status: string; notes: string }>): Promise<MessengerRoute> {
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { route: MessengerRoute } }>(
        `${API_URL}/api/messenger-routes/${id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.route
}

export async function deleteRoute(id: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/messenger-routes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}

// ============================================================
// Stops API
// ============================================================

export async function addStop(routeId: string, data: Partial<RouteStop>): Promise<RouteStop> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { stop: RouteStop } }>(
        `${API_URL}/api/messenger-routes/${routeId}/stops`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.stop
}

export async function updateStop(stopId: string, data: Partial<RouteStop>): Promise<RouteStop> {
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { stop: RouteStop } }>(
        `${API_URL}/api/messenger-routes/stops/${stopId}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.stop
}

export async function deleteStop(stopId: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/messenger-routes/stops/${stopId}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}

export async function reorderStops(routeId: string, stopIds: string[]): Promise<void> {
    const token = getToken()
    await axios.put(
        `${API_URL}/api/messenger-routes/${routeId}/reorder`,
        { stop_ids: stopIds },
        { headers: { Authorization: `Bearer ${token}` } }
    )
}

// ============================================================
// Geocoding & Distance (OSRM free, Nominatim free)
// ============================================================

export interface GeoResult {
    lat: number
    lng: number
    display_name: string
}

/**
 * ค้นหาพิกัดจากชื่อสถานที่ (Nominatim / OpenStreetMap) — ฟรี, ไม่ต้อง API key
 * จำกัด 1 request/วินาที
 */
export async function geocodeLocation(query: string): Promise<GeoResult | null> {
    try {
        const params = new URLSearchParams({
            q: query + ', Thailand',
            format: 'json',
            limit: '1',
            addressdetails: '1',
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: { 'Accept-Language': 'th,en' }
        })
        const data = await res.json()
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name,
            }
        }
        return null
    } catch (err) {
        console.error('Geocode error:', err)
        return null
    }
}

/**
 * คำนวณระยะทางขับรถจริง (OSRM public demo server) — ฟรี, ไม่ต้อง API key
 * รับพิกัด 2 จุดขึ้นไป → คืนระยะทาง (km) + เวลา (นาที)
 */
export interface DistanceResult {
    distance_km: number
    duration_min: number
}

export async function calcDrivingDistance(
    coords: { lat: number; lng: number }[]
): Promise<DistanceResult | null> {
    if (coords.length < 2) return null
    try {
        // OSRM coords = "lng,lat;lng,lat;..."
        const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(';')
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false`
        )
        const data = await res.json()
        if (data.code === 'Ok' && data.routes?.length > 0) {
            return {
                distance_km: parseFloat((data.routes[0].distance / 1000).toFixed(1)),
                duration_min: Math.round(data.routes[0].duration / 60),
            }
        }
        return null
    } catch (err) {
        console.error('OSRM calc error:', err)
        return null
    }
}

// ============================================================
// Locations — สถานที่ที่บันทึกไว้
// ============================================================

export interface MessengerLocation {
    id: string
    name: string
    address?: string
    latitude?: number | null
    longitude?: number | null
    category: string
    is_default_start: boolean
    usage_count: number
    created_at?: string
}

export async function getLocations(): Promise<MessengerLocation[]> {
    const token = getToken()
    const response = await axios.get<{ success: boolean; data: { locations: MessengerLocation[] } }>(
        `${API_URL}/api/messenger-locations?_t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.locations
}

export async function createLocation(data: Partial<MessengerLocation>): Promise<MessengerLocation> {
    const token = getToken()
    const response = await axios.post<{ success: boolean; data: { location: MessengerLocation } }>(
        `${API_URL}/api/messenger-locations`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.location
}

export async function updateLocation(id: string, data: Partial<MessengerLocation>): Promise<MessengerLocation> {
    const token = getToken()
    const response = await axios.put<{ success: boolean; data: { location: MessengerLocation } }>(
        `${API_URL}/api/messenger-locations/${id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data.data.location
}

export async function incrementLocationUsage(id: string): Promise<void> {
    const token = getToken()
    await axios.put(
        `${API_URL}/api/messenger-locations/${id}/increment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    )
}

export async function deleteLocation(id: string): Promise<void> {
    const token = getToken()
    await axios.delete(`${API_URL}/api/messenger-locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
}
