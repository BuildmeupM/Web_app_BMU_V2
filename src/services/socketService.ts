/**
 * Socket.io Client Service
 * จัดการการเชื่อมต่อ WebSocket สำหรับ real-time updates
 */

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Create Socket.io connection
 * @param token - JWT token for authentication
 * @returns Socket instance
 */
export function createSocketConnection(token: string | null): Socket {
  // ✅ BUG-156 + Chat Fix: Reuse existing connection if active to preserve global listeners
  if (socket) {
    if (socket.connected) {
      return socket
    }
    socket.disconnect()
    socket = null // Clear old socket reference
  }

  // Helper function to get backend URL
  // If VITE_BACKEND_URL is set, use it
  // Otherwise, detect if we're accessing via IP and use the same IP for backend
  function getBackendUrl(): string {
    const envUrl = import.meta.env.VITE_BACKEND_URL
    
    if (envUrl && !envUrl.includes('localhost')) {
      // If VITE_BACKEND_URL is set and not localhost, use it
      return envUrl
    }
    
    // Check if we're accessing via IP address (not localhost)
    const currentHost = window.location.hostname
    
    // If accessing via IP (not localhost or 127.0.0.1), use same IP for backend
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '') {
      // Use same IP but backend port (3001)
      return `http://${currentHost}:3001`
    }
    
    // Default to localhost
    return envUrl || 'http://localhost:3001'
  }

  const backendUrl = getBackendUrl()

  socket = io(backendUrl, {
    auth: {
      token: token || undefined,
    },
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    // ✅ BUG-156: เพิ่ม timeout เพื่อป้องกันการรอ connection นานเกินไป
    timeout: 20000, // 20 seconds timeout
  })

  // Connection event handlers
  socket.on('connect', () => {
    console.log('🔌 [SocketService] Connected to WebSocket server', {
      socketId: socket?.id,
      backendUrl,
    })
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 [SocketService] Disconnected from WebSocket server', {
      reason,
    })
  })

  socket.on('connect_error', (error) => {
    console.error('❌ [SocketService] Connection error:', error.message)
    // ✅ BUG-156: แสดง error message ที่เป็นประโยชน์มากขึ้น
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
      console.error('⚠️ [SocketService] Backend server may not be running. Please check:', {
        backendUrl,
        message: 'Make sure backend server is running on ' + backendUrl,
      })
    }
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 [SocketService] Reconnected to WebSocket server', {
      attemptNumber,
    })
  })

  socket.on('reconnect_error', (error) => {
    console.error('❌ [SocketService] Reconnection error:', error.message)
  })

  socket.on('reconnect_failed', () => {
    console.error('❌ [SocketService] Reconnection failed - giving up')
  })

  return socket
}

/**
 * Get current socket instance
 * @returns Socket instance or null
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Disconnect socket connection
 */
export function disconnectSocket(): void {
  if (socket) {
    // ✅ BUG-156: ตรวจสอบว่า socket connected ก่อน disconnect
    // เพื่อป้องกัน error "WebSocket is closed before the connection is established"
    if (socket.connected) {
      socket.disconnect()
      console.log('🔌 [SocketService] Socket disconnected')
    } else {
      console.log('🔌 [SocketService] Socket was not connected, skipping disconnect')
    }
    socket = null
  }
}

/**
 * Check if socket is connected
 * @returns true if connected, false otherwise
 */
export function isSocketConnected(): boolean {
  return socket?.connected || false
}
