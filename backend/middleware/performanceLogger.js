/**
 * Performance Logger Middleware
 * Log performance metrics สำหรับ API requests (response time, query time, etc.)
 * 
 * Usage: app.use('/api', performanceLogger)
 */

/**
 * Performance logger middleware
 * Logs request/response time และ metrics อื่นๆ
 */
export function performanceLogger(req, res, next) {
  const startTime = Date.now()
  const startMemory = process.memoryUsage()

  // Store original methods
  const originalJson = res.json.bind(res)
  const originalEnd = res.end.bind(res)

  // Override json method to log performance
  res.json = function (data) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    const endMemory = process.memoryUsage()
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed

    // Log performance metrics only for slow requests (> 1000ms) or errors (>= 400)
    const shouldLog = responseTime > 1000 || res.statusCode >= 400
    if (shouldLog && (process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_LOGGING === 'true')) {
      console.log(`📊 Performance Metrics:`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString(),
      })
    }

    // Add performance headers (optional)
    if (process.env.ENABLE_PERFORMANCE_HEADERS === 'true') {
      res.setHeader('X-Response-Time', `${responseTime}ms`)
      res.setHeader('X-Memory-Used', `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    }

    return originalJson(data)
  }

  // Override end method to log performance
  res.end = function (chunk, encoding) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    const endMemory = process.memoryUsage()
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed

    // Log performance metrics only for slow requests (> 1000ms) or errors (>= 400)
    const shouldLog = responseTime > 1000 || res.statusCode >= 400
    if (shouldLog && (process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_LOGGING === 'true')) {
      console.log(`📊 Performance Metrics:`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString(),
      })
    }

    // Add performance headers (optional)
    if (process.env.ENABLE_PERFORMANCE_HEADERS === 'true') {
      res.setHeader('X-Response-Time', `${responseTime}ms`)
      res.setHeader('X-Memory-Used', `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    }

    return originalEnd(chunk, encoding)
  }

  next()
}

export default performanceLogger
