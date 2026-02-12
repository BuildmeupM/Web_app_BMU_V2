import api from './api'

export interface PositionGroup {
    id?: string
    name: string
    color: string
    sort_order?: number
    positions: string[]
}

export const positionGroupService = {
    /**
     * ดึงรายการกลุ่มตำแหน่งทั้งหมด
     */
    getAll: async (): Promise<PositionGroup[]> => {
        const response = await api.get('/position-groups')
        return response.data.data
    },

    /**
     * บันทึก/อัปเดตกลุ่มตำแหน่งทั้งหมด (bulk update)
     */
    updateAll: async (groups: PositionGroup[]): Promise<PositionGroup[]> => {
        const response = await api.put('/position-groups', { groups })
        return response.data.data
    },
}
