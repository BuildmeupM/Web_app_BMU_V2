/**
 * Socket.io Service
 * จัดการการส่ง WebSocket events สำหรับ real-time updates
 */

/**
 * Emit monthly-tax-data update event to specific employee rooms
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @param {Object} updatedData - Updated monthly tax data
 * @param {string[]} employeeIds - Array of employee IDs to notify
 */
export function emitMonthlyTaxDataUpdate(io, updatedData, employeeIds) {
  if (!io || !updatedData || !employeeIds || employeeIds.length === 0) {
    console.warn('⚠️ [SocketService] Invalid parameters for emitMonthlyTaxDataUpdate')
    return
  }

  // Remove null/undefined values
  const validEmployeeIds = employeeIds.filter(Boolean)

  if (validEmployeeIds.length === 0) {
    console.warn('⚠️ [SocketService] No valid employee IDs to notify')
    return
  }

  // Emit to each employee's room
  validEmployeeIds.forEach((employeeId) => {
    const room = `monthly-tax-data:${employeeId}`
    io.to(room).emit('monthly-tax-data:updated', updatedData)
    
    console.log('📤 [SocketService] Emitted monthly-tax-data:updated event', {
      room,
      employeeId,
      build: updatedData?.build,
      id: updatedData?.id,
    })
  })
}

/**
 * Get all connected clients in a specific room
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @param {string} room - Room name
 * @returns {Promise<number>} Number of clients in the room
 */
export async function getRoomClientCount(io, room) {
  if (!io || !room) {
    return 0
  }

  try {
    const sockets = await io.in(room).fetchSockets()
    return sockets.length
  } catch (error) {
    console.error('❌ [SocketService] Error getting room client count:', error)
    return 0
  }
}
