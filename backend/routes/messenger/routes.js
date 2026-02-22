/**
 * Messenger Routes API
 * CRUD สำหรับตารางวิ่งแมส + จุดแวะ
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'

const router = express.Router()

// UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

// ============================================================
// Routes — ตารางวิ่ง
// ============================================================

// GET /api/messenger-routes — ดึงรายการตารางวิ่ง (filter by date range)
router.get('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { start_date, end_date, status } = req.query

        let query = `
            SELECT r.*,
                COUNT(s.id) as total_stops,
                SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_stops,
                SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_stops
            FROM messenger_routes r
            LEFT JOIN messenger_route_stops s ON s.route_id = r.id
            WHERE r.deleted_at IS NULL
        `
        const params = []

        if (start_date) {
            query += ' AND r.route_date >= ?'
            params.push(start_date)
        }
        if (end_date) {
            query += ' AND r.route_date <= ?'
            params.push(end_date)
        }
        if (status) {
            query += ' AND r.status = ?'
            params.push(status)
        }

        query += ' GROUP BY r.id ORDER BY r.route_date DESC, r.created_at DESC'

        const [routes] = await pool.execute(query, params)

        res.json({ success: true, data: { routes } })
    } catch (error) {
        console.error('Get messenger routes error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' })
    }
})

// GET /api/messenger-routes/:id — ดึงตารางวิ่ง + จุดแวะทั้งหมด
router.get('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        const [routes] = await pool.execute(
            'SELECT * FROM messenger_routes WHERE id = ? AND deleted_at IS NULL',
            [id]
        )

        if (routes.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบตารางวิ่ง' })
        }

        const [stops] = await pool.execute(
            'SELECT * FROM messenger_route_stops WHERE route_id = ? ORDER BY sort_order ASC',
            [id]
        )

        // Parse tasks JSON for each stop
        const parsedStops = stops.map(stop => ({
            ...stop,
            tasks: stop.tasks ? JSON.parse(stop.tasks) : []
        }))

        res.json({
            success: true,
            data: {
                route: { ...routes[0], stops: parsedStops }
            }
        })
    } catch (error) {
        console.error('Get messenger route detail error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// POST /api/messenger-routes — สร้างตารางวิ่งใหม่ (พร้อมจุดแวะ)
router.post('/', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()

        const { route_date, notes, stops, start_location, start_lat, start_lng } = req.body

        if (!route_date) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่' })
        }

        const routeId = generateUUID()
        let totalDistance = 0

        // Calculate total distance from stops
        if (stops && stops.length > 0) {
            totalDistance = stops.reduce((sum, s) => sum + (parseFloat(s.distance_km) || 0), 0)
        }

        // Save linked_task_ids for later status sync
        const { linked_task_ids } = req.body
        const linkedIdsJson = (linked_task_ids && Array.isArray(linked_task_ids) && linked_task_ids.length > 0)
            ? JSON.stringify(linked_task_ids) : null

        await connection.execute(
            `INSERT INTO messenger_routes (id, route_date, start_location, start_lat, start_lng, total_distance, notes, linked_task_ids, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [routeId, route_date, start_location || 'สำนักงาน', start_lat || null, start_lng || null, totalDistance, notes || null, linkedIdsJson, req.user?.id || null]
        )

        // Insert stops
        if (stops && stops.length > 0) {
            for (let i = 0; i < stops.length; i++) {
                const stop = stops[i]
                const stopId = generateUUID()

                // Parse estimated_time: accept "HH:MM", "HH:MM:SS", or extract minutes from text like "~50 นาที", "30min"
                let parsedTime = null
                if (stop.estimated_time) {
                    const timeStr = stop.estimated_time.trim()
                    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
                        // Already in HH:MM or HH:MM:SS format
                        parsedTime = timeStr.length <= 5 ? timeStr + ':00' : timeStr
                    } else {
                        // Try to extract minutes from text like "~50 นาที", "30 min", "50"
                        const minuteMatch = timeStr.match(/(\d+)/)
                        if (minuteMatch) {
                            const mins = parseInt(minuteMatch[1])
                            const h = Math.floor(mins / 60)
                            const m = mins % 60
                            parsedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
                        }
                    }
                }

                await connection.execute(
                    `INSERT INTO messenger_route_stops (id, route_id, sort_order, location_name, latitude, longitude, tasks, distance_km, estimated_time, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        stopId,
                        routeId,
                        i,
                        stop.location_name,
                        stop.latitude || null,
                        stop.longitude || null,
                        stop.tasks ? JSON.stringify(stop.tasks) : null,
                        parseFloat(stop.distance_km) || 0,
                        parsedTime,
                        stop.notes || null
                    ]
                )
            }
        }

        // Update linked registration_tasks → messenger_status = 'scheduled'
        if (linked_task_ids && Array.isArray(linked_task_ids) && linked_task_ids.length > 0) {
            const placeholders = linked_task_ids.map(() => '?').join(',')
            await connection.execute(
                `UPDATE registration_tasks SET messenger_status = 'scheduled' WHERE id IN (${placeholders})`,
                linked_task_ids
            )
        }

        await connection.commit()

        // Fetch created route
        const [created] = await connection.execute('SELECT * FROM messenger_routes WHERE id = ?', [routeId])
        const [createdStops] = await connection.execute(
            'SELECT * FROM messenger_route_stops WHERE route_id = ? ORDER BY sort_order',
            [routeId]
        )

        res.status(201).json({
            success: true,
            data: {
                route: {
                    ...created[0],
                    stops: createdStops.map(s => ({ ...s, tasks: s.tasks ? JSON.parse(s.tasks) : [] }))
                }
            }
        })
    } catch (error) {
        await connection.rollback()
        console.error('Create messenger route error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างตาราง' })
    } finally {
        connection.release()
    }
})

// PUT /api/messenger-routes/:id — แก้ไขตาราง
router.put('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params
        const { status, notes, start_location, start_lat, start_lng } = req.body

        const updates = []
        const params = []

        if (status !== undefined) { updates.push('status = ?'); params.push(status) }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }
        if (start_location !== undefined) { updates.push('start_location = ?'); params.push(start_location) }
        if (start_lat !== undefined) { updates.push('start_lat = ?'); params.push(start_lat) }
        if (start_lng !== undefined) { updates.push('start_lng = ?'); params.push(start_lng) }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัปเดต' })
        }

        params.push(id)
        await pool.execute(
            `UPDATE messenger_routes SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            params
        )

        // Sync linked tasks' messenger_status when route status changes
        if (status !== undefined) {
            const [routeRows] = await pool.execute('SELECT linked_task_ids FROM messenger_routes WHERE id = ?', [id])
            if (routeRows.length > 0 && routeRows[0].linked_task_ids) {
                let taskIds = routeRows[0].linked_task_ids
                if (typeof taskIds === 'string') taskIds = JSON.parse(taskIds)
                if (Array.isArray(taskIds) && taskIds.length > 0) {
                    const placeholders = taskIds.map(() => '?').join(',')
                    let taskStatus = 'pending'
                    if (status === 'completed') taskStatus = 'completed'
                    else if (status === 'in_progress' || status === 'planned') taskStatus = 'scheduled'
                    await pool.execute(
                        `UPDATE registration_tasks SET messenger_status = ? WHERE id IN (${placeholders})`,
                        [taskStatus, ...taskIds]
                    )
                }
            }
        }

        const [updated] = await pool.execute('SELECT * FROM messenger_routes WHERE id = ?', [id])
        res.json({ success: true, data: { route: updated[0] } })
    } catch (error) {
        console.error('Update messenger route error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// DELETE /api/messenger-routes/:id — soft delete + reset linked tasks
router.delete('/:id', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id } = req.params

        // Reset linked tasks' messenger_status back to 'pending'
        const [routeRows] = await pool.execute('SELECT linked_task_ids FROM messenger_routes WHERE id = ? AND deleted_at IS NULL', [id])
        if (routeRows.length > 0 && routeRows[0].linked_task_ids) {
            let taskIds = routeRows[0].linked_task_ids
            if (typeof taskIds === 'string') taskIds = JSON.parse(taskIds)
            if (Array.isArray(taskIds) && taskIds.length > 0) {
                const placeholders = taskIds.map(() => '?').join(',')
                await pool.execute(
                    `UPDATE registration_tasks SET messenger_status = 'pending' WHERE id IN (${placeholders})`,
                    taskIds
                )
            }
        }

        // Soft delete the route
        await pool.execute(
            'UPDATE messenger_routes SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
            [id]
        )
        res.json({ success: true, message: 'ลบตารางวิ่งแล้ว' })
    } catch (error) {
        console.error('Delete messenger route error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// ============================================================
// Stops — จุดแวะ
// ============================================================

// POST /api/messenger-routes/:id/stops — เพิ่มจุดแวะ
router.post('/:id/stops', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id: routeId } = req.params
        const { location_name, tasks, distance_km, estimated_time, notes } = req.body

        if (!location_name) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสถานที่' })
        }

        // Get max sort_order
        const [maxOrder] = await pool.execute(
            'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM messenger_route_stops WHERE route_id = ?',
            [routeId]
        )

        const stopId = generateUUID()
        const sortOrder = maxOrder[0].max_order + 1
        const dist = parseFloat(distance_km) || 0

        await pool.execute(
            `INSERT INTO messenger_route_stops (id, route_id, sort_order, location_name, tasks, distance_km, estimated_time, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [stopId, routeId, sortOrder, location_name, tasks ? JSON.stringify(tasks) : null, dist, estimated_time || null, notes || null]
        )

        // Recalculate total distance
        await recalcTotalDistance(routeId)

        const [created] = await pool.execute('SELECT * FROM messenger_route_stops WHERE id = ?', [stopId])
        const stop = created[0]
        res.status(201).json({
            success: true,
            data: { stop: { ...stop, tasks: stop.tasks ? JSON.parse(stop.tasks) : [] } }
        })
    } catch (error) {
        console.error('Add stop error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// PUT /api/messenger-routes/stops/:stopId — แก้ไขจุดแวะ
router.put('/stops/:stopId', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { stopId } = req.params
        const { location_name, tasks, distance_km, estimated_time, actual_time, status, notes } = req.body

        const updates = []
        const params = []

        if (location_name !== undefined) { updates.push('location_name = ?'); params.push(location_name) }
        if (tasks !== undefined) { updates.push('tasks = ?'); params.push(JSON.stringify(tasks)) }
        if (distance_km !== undefined) { updates.push('distance_km = ?'); params.push(parseFloat(distance_km) || 0) }
        if (estimated_time !== undefined) { updates.push('estimated_time = ?'); params.push(estimated_time) }
        if (actual_time !== undefined) { updates.push('actual_time = ?'); params.push(actual_time) }
        if (status !== undefined) { updates.push('status = ?'); params.push(status) }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }
        if (req.body.latitude !== undefined) { updates.push('latitude = ?'); params.push(req.body.latitude) }
        if (req.body.longitude !== undefined) { updates.push('longitude = ?'); params.push(req.body.longitude) }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัปเดต' })
        }

        params.push(stopId)
        await pool.execute(`UPDATE messenger_route_stops SET ${updates.join(', ')} WHERE id = ?`, params)

        // Get route_id to recalculate
        const [stop] = await pool.execute('SELECT * FROM messenger_route_stops WHERE id = ?', [stopId])
        if (stop.length > 0) {
            await recalcTotalDistance(stop[0].route_id)
        }

        res.json({
            success: true,
            data: { stop: { ...stop[0], tasks: stop[0].tasks ? JSON.parse(stop[0].tasks) : [] } }
        })
    } catch (error) {
        console.error('Update stop error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// DELETE /api/messenger-routes/stops/:stopId — ลบจุดแวะ
router.delete('/stops/:stopId', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { stopId } = req.params

        const [stop] = await pool.execute('SELECT route_id FROM messenger_route_stops WHERE id = ?', [stopId])
        if (stop.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบจุดแวะ' })
        }

        const routeId = stop[0].route_id
        await pool.execute('DELETE FROM messenger_route_stops WHERE id = ?', [stopId])
        await recalcTotalDistance(routeId)

        res.json({ success: true, message: 'ลบจุดแวะแล้ว' })
    } catch (error) {
        console.error('Delete stop error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// PUT /api/messenger-routes/:id/reorder — เรียงลำดับจุดแวะใหม่
router.put('/:id/reorder', authenticateToken, authorize('admin', 'registration'), async (req, res) => {
    try {
        const { id: routeId } = req.params
        const { stop_ids } = req.body // array of stop IDs in new order

        if (!stop_ids || !Array.isArray(stop_ids)) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุลำดับจุดแวะ' })
        }

        for (let i = 0; i < stop_ids.length; i++) {
            await pool.execute(
                'UPDATE messenger_route_stops SET sort_order = ? WHERE id = ? AND route_id = ?',
                [i, stop_ids[i], routeId]
            )
        }

        res.json({ success: true, message: 'เรียงลำดับใหม่แล้ว' })
    } catch (error) {
        console.error('Reorder stops error:', error)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' })
    }
})

// Helper: recalculate total distance
async function recalcTotalDistance(routeId) {
    const [result] = await pool.execute(
        'SELECT COALESCE(SUM(distance_km), 0) as total FROM messenger_route_stops WHERE route_id = ?',
        [routeId]
    )
    await pool.execute(
        'UPDATE messenger_routes SET total_distance = ? WHERE id = ?',
        [result[0].total, routeId]
    )
}

export default router
