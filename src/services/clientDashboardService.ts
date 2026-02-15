/**
 * Client Dashboard Service
 * บริการเรียก API สำหรับ Dashboard ข้อมูลลูกค้า
 */

import api from './api'

// ─── Types ──────────────────────────────────────────────────

export interface DashboardData {
    total: number
    byCompanyStatus: Array<{ company_status: string; count: number }>
    byBusinessType: Array<{ business_type: string; count: number }>
    byTaxRegistrationStatus: Array<{ tax_registration_status: string; count: number }>
    byProvince: Array<{ province: string; count: number }>
    byCompanySize: Array<{ company_size: string; count: number }>
    byBusinessCategory: Array<{ business_category: string; count: number }>
    byBusinessSubcategory: Array<{ business_category: string; business_subcategory: string; count: number }>
    recentClients: Array<{
        build: string
        company_name: string
        company_status: string
        province: string | null
        business_type: string | null
        created_at: string
    }>
}

export interface ProvinceClient {
    build: string
    company_name: string
    company_status: string
    business_type: string | null
    tax_registration_status: string | null
    province: string | null
}

export interface DistrictCount {
    district: string
    count: number
}

export interface DistrictClient {
    build: string
    company_name: string
    company_status: string
    business_type: string | null
    tax_registration_status: string | null
    district: string
}

export interface ProvinceDistrictData {
    province: string
    districtCounts: DistrictCount[]
    clients: DistrictClient[]
}

export interface DistrictMapDistrict {
    name: string
    path: string
    cx: number
    cy: number
}

export interface DistrictMapData {
    province: string
    viewBox: string
    districts: DistrictMapDistrict[]
}

// ─── Service ────────────────────────────────────────────────

const clientDashboardService = {
    /**
     * Get client dashboard data (aggregated stats)
     */
    async getDashboardData(statuses?: string[]): Promise<DashboardData> {
        const params: Record<string, string> = {}
        if (statuses && statuses.length > 0) {
            params.statuses = statuses.join(',')
        }
        const response = await api.get<{ success: boolean; data: DashboardData }>('/clients/dashboard', { params })
        return response.data.data
    },

    /**
     * Get clients in a specific province (for drill-down)
     */
    async getProvinceClients(province: string): Promise<ProvinceClient[]> {
        const response = await api.get<{ success: boolean; data: ProvinceClient[] }>(
            '/clients/province-clients',
            { params: { province } }
        )
        return response.data.data
    },

    /**
     * Get district breakdown for a province (counts + client list)
     */
    async getProvinceDistricts(province: string): Promise<ProvinceDistrictData> {
        const response = await api.get<{ success: boolean; data: ProvinceDistrictData }>(
            '/clients/province-districts',
            { params: { province } }
        )
        return response.data.data
    },

    /**
     * Fetch district map SVG data for a province (lazy-loaded from public/districts/)
     */
    async getDistrictMapData(province: string): Promise<DistrictMapData | null> {
        try {
            const resp = await fetch(`/districts/${encodeURIComponent(province)}.json`)
            if (!resp.ok) return null
            return await resp.json()
        } catch {
            return null
        }
    },
}

export default clientDashboardService
