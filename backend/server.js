/**
 * BMU Work Management System - Backend API Server
 * Express.js server สำหรับ Backend API
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { testConnection } from './config/database.js'
import authRoutes from './routes/auth.js'
import employeeRoutes from './routes/employees.js'
import employeeStatsRoutes from './routes/employees-statistics.js'
import employeeImportRoutes from './routes/employees-import.js'
import leaveRequestRoutes from './routes/leave-requests.js'
import wfhRequestRoutes from './routes/wfh-requests.js'
import clientsRoutes from './routes/clients.js'
import workAssignmentsRoutes from './routes/work-assignments.js'
import monthlyTaxDataRoutes from './routes/monthly-tax-data.js'
import documentEntryWorkRoutes from './routes/document-entry-work.js'
import accountingMarketplaceRoutes from './routes/accounting-marketplace.js'
import usersRoutes from './routes/users.js'
import notificationsRoutes, { cleanupExpiredNotifications } from './routes/notifications.js'
import holidaysRoutes from './routes/holidays.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import cacheMiddleware, { invalidateCache } from './middleware/cache.js'
import performanceLogger from './middleware/performanceLogger.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0' // Use 0.0.0.0 to allow access from any IP address
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

// Parse CORS origins - support multiple origins separated by comma
const parseCorsOrigins = () => {
  const origins = CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  console.log('🌐 Configured CORS origins:', origins)
  return origins
}

const allowedOrigins = parseCorsOrigins()

// CORS origin function to allow both localhost and IP addresses in development
// and configured origins in production
const corsOriginFunction = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, or server-to-server)
  if (!origin) {
    return callback(null, true)
  }

  // In development, allow more flexibility
  if (process.env.NODE_ENV === 'development') {
    // Allow localhost on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true)
    }

    // Allow any IP address (for network access) - match pattern like http://192.168.1.100:3000
    if (/^http:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) {
      return callback(null, true)
    }
  }

  // Check against allowed origins (works for both dev and prod)
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return callback(null, true)
  }

  // Log rejected origin for debugging
  console.warn('⚠️ CORS rejected origin:', origin, '| Allowed:', allowedOrigins)
  callback(new Error('Not allowed by CORS'))
}

// CORS origin for Socket.io (can be a function or string/array)
const socketIoOrigin = process.env.NODE_ENV === 'development'
  ? (origin, callback) => {
    // In development, allow all origins
    callback(null, true)
  }
  : allowedOrigins.length > 1 ? allowedOrigins : CORS_ORIGIN

// Create HTTP server from Express app
const httpServer = createServer(app)

// Create Socket.io server instance
const io = new Server(httpServer, {
  cors: {
    origin: socketIoOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('🔌 [WebSocket] Client connected:', socket.id)

  // Handle subscription to monthly-tax-data updates
  socket.on('subscribe:monthly-tax-data', (data) => {
    if (data && data.employeeId) {
      const room = `monthly-tax-data:${data.employeeId}`
      socket.join(room)
      console.log('📡 [WebSocket] Client subscribed to room:', {
        socketId: socket.id,
        room,
        employeeId: data.employeeId,
      })
    }
  })

  // Handle unsubscription
  socket.on('unsubscribe:monthly-tax-data', (data) => {
    if (data && data.employeeId) {
      const room = `monthly-tax-data:${data.employeeId}`
      socket.leave(room)
      console.log('📡 [WebSocket] Client unsubscribed from room:', {
        socketId: socket.id,
        room,
        employeeId: data.employeeId,
      })
    }
  })

  // ✅ NOTIFICATIONS: Handle user subscription for real-time notifications
  socket.on('subscribe:user', (data) => {
    if (data && data.userId) {
      const room = `user:${data.userId}`
      socket.join(room)
      console.log('🔔 [WebSocket] User subscribed to notifications:', {
        socketId: socket.id,
        room,
        userId: data.userId,
      })
    }
  })

  // Handle user unsubscription from notifications
  socket.on('unsubscribe:user', (data) => {
    if (data && data.userId) {
      const room = `user:${data.userId}`
      socket.leave(room)
      console.log('🔔 [WebSocket] User unsubscribed from notifications:', {
        socketId: socket.id,
        room,
        userId: data.userId,
      })
    }
  })

  // Handle disconnection (log ถูกปิดเพื่อลดความรก - คง log เฉพาะ error)
  socket.on('disconnect', () => {
    // Disconnect logging disabled to reduce console clutter
  })

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('❌ [WebSocket] Socket error:', {
      socketId: socket.id,
      error: error.message,
    })
  })
})

// Store io instance in app for use in routes (avoid circular dependency)
app.set('io', io)

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // ปิดเพื่อให้ใช้งานได้ง่ายขึ้น
  })
)

// CORS - use corsOriginFunction for both dev and prod
app.use(
  cors({
    origin: corsOriginFunction,
    credentials: true,
  })
)

// ✅ Performance Optimization: Response Compression (gzip)
// Compress responses > 1KB to reduce network transfer time by 60-80%
// This significantly improves performance, especially for mobile users
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB (small responses don't benefit much)
  level: 6, // Compression level (1-9, 6 is a good balance between speed and compression ratio)
  filter: (req, res) => {
    // Don't compress if client explicitly requests no compression
    if (req.headers['x-no-compression']) {
      return false
    }
    // Use default compression filter
    return compression.filter(req, res)
  },
}))

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Performance logging (apply to all API routes)
app.use('/api', performanceLogger)

// Rate limiting (apply to all routes)
app.use('/api', apiRateLimiter)

// Cache middleware (apply to GET requests, skip auth endpoints)
app.use('/api', cacheMiddleware)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/auth', authRoutes)
// Mount specific routes BEFORE general routes to avoid route conflicts
// Statistics route must come before /:id route
app.use('/api/employees', employeeStatsRoutes)
app.use('/api/employees', employeeImportRoutes)
app.use('/api/employees', employeeRoutes) // This has /:id route, so it should be last
// Leave & WFH Routes
app.use('/api/leave-requests', leaveRequestRoutes)
app.use('/api/wfh-requests', wfhRequestRoutes)

// Workflow System Routes
app.use('/api/clients', clientsRoutes)
app.use('/api/work-assignments', workAssignmentsRoutes)
app.use('/api/monthly-tax-data', monthlyTaxDataRoutes)
// Mount specific routes BEFORE general routes to avoid route conflicts
// /:build/:year/:month route must come before /:id route
app.use('/api/document-entry-work', documentEntryWorkRoutes)
// Accounting Marketplace Routes
app.use('/api/accounting-marketplace', accountingMarketplaceRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/holidays', holidaysRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ [Express Error Handler] Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  })
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// ✅ Global Error Handlers - ป้องกัน server crash จาก unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ [CRITICAL] Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  })
  // ไม่ควร exit process ทันที แต่ควร log และให้ process manager (เช่น PM2) จัดการ
  // process.exit(1) // ⚠️ Comment out เพื่อให้ process manager จัดการ
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [CRITICAL] Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
  })
  // ไม่ควร exit process ทันที แต่ควร log และให้ process manager จัดการ
  // process.exit(1) // ⚠️ Comment out เพื่อให้ process manager จัดการ
})

// ✅ Handle SIGTERM และ SIGINT สำหรับ graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...')
  httpServer.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...')
  httpServer.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
})

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection()

    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection')
      // Retry after 5 seconds instead of exiting immediately
      setTimeout(() => {
        console.log('🔄 Retrying database connection...')
        startServer()
      }, 5000)
      return
    }

    httpServer.listen(PORT, HOST, () => {
      const localUrl = `http://localhost:${PORT}`
      const networkUrl = `http://${HOST === '0.0.0.0' ? 'YOUR_IP_ADDRESS' : HOST}:${PORT}`
      console.log(`🚀 Server is running on ${localUrl}`)
      if (HOST === '0.0.0.0') {
        console.log(`🌐 Server is accessible from network: http://YOUR_IP_ADDRESS:${PORT}`)
        console.log(`   💡 Replace YOUR_IP_ADDRESS with your actual IP address (e.g., 192.168.1.100)`)
      } else {
        console.log(`🌐 Server is accessible at: ${networkUrl}`)
      }
      console.log(`📡 API Base URL: ${localUrl}/api`)
      console.log(`🔌 WebSocket Server: ws://${HOST === '0.0.0.0' ? 'YOUR_IP_ADDRESS' : HOST}:${PORT}`)
      console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`)
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)

      // Start scheduled job for cleaning up expired notifications (every hour)
      setInterval(async () => {
        try {
          const result = await cleanupExpiredNotifications()
          if (result.success && result.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${result.deletedCount} expired notifications`)
          }
        } catch (error) {
          console.error('❌ Error in scheduled notification cleanup:', error)
          // Don't crash server if scheduled job fails
        }
      }, 60 * 60 * 1000) // Run every hour (60 minutes)

      console.log('⏰ Scheduled job started: Cleanup expired notifications (every hour)')
    })

    // ✅ Handle server errors
    httpServer.on('error', (error) => {
      console.error('❌ [HTTP Server Error]:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      })
      // Don't exit - let process manager handle restart if needed
    })
  } catch (error) {
    console.error('❌ [Start Server Error]:', {
      message: error.message,
      stack: error.stack,
    })
    // Retry after 5 seconds
    setTimeout(() => {
      console.log('🔄 Retrying server start...')
      startServer()
    }, 5000)
  }
}

startServer()
