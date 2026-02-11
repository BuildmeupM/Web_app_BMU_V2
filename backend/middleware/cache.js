/**
 * Cache Middleware
 * In-memory cache สำหรับลดการเรียก database ซ้ำ
 * ใช้ node-cache สำหรับ simple in-memory caching
 * 
 * Note: สำหรับ production scale, พิจารณาใช้ Redis แทน
 */

import NodeCache from 'node-cache'

// ✅ Performance Optimization: Create cache instance with optimized TTL
// TTL: 30 seconds เพื่อสอดคล้องกับ React Query staleTime (30s)
// ข้อมูลจะยังถูก invalidate เมื่อมีการ update/delete
const cache = new NodeCache({
  stdTTL: 30, // 30 seconds (แทน 5 minutes) - สอดคล้องกับ React Query staleTime
  checkperiod: 10, // Check for expired keys every 10 seconds (แทน 60s) - cleanup เร็วขึ้น
  useClones: false, // Don't clone values (better performance)
  maxKeys: 1000, // Limit cache size to prevent memory issues
})

/**
 * Generate cache key from request
 * Format: {method}:{path}:{queryString}
 */
function generateCacheKey(req) {
  const method = req.method.toUpperCase()
  const path = req.path || req.url.split('?')[0]
  const queryString = req.query ? JSON.stringify(req.query) : ''
  return `${method}:${path}:${queryString}`
}

/**
 * Cache middleware
 * Cache GET requests only (safe to cache)
 * Skip caching for authenticated endpoints that require fresh data
 */
export function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next()
  }

  // Skip caching for certain endpoints that require fresh data
  const skipCachePaths = [
    '/api/auth',
    '/health',
    '/api/clients/accounting-fees-export',
  ]

  const shouldSkipCache = skipCachePaths.some(path => req.path.startsWith(path))
  if (shouldSkipCache) {
    return next()
  }

  const cacheKey = generateCacheKey(req)

  // Check if data exists in cache
  const cachedData = cache.get(cacheKey)
  if (cachedData) {
    // Return cached data
    return res.json(cachedData)
  }

  // Store original json method
  const originalJson = res.json.bind(res)

  // Override json method to cache response
  res.json = function (data) {
    // Cache successful responses (status 200)
    // ✅ Performance Optimization: Cache GET requests with 30s TTL (สอดคล้องกับ React Query staleTime)
    if (res.statusCode === 200 && data) {
      // Use custom TTL for monthly-tax-data endpoints (30 seconds)
      const isMonthlyTaxData = req.path.includes('/monthly-tax-data')
      const ttl = isMonthlyTaxData ? 30 : undefined // Use default TTL (30s) for monthly-tax-data, undefined for others
      cache.set(cacheKey, data, ttl)
    }
    return originalJson(data)
  }

  next()
}

/**
 * Invalidate cache for specific pattern
 * Useful when data is updated/deleted
 */
export function invalidateCache(pattern) {
  const keys = cache.keys()
  const regex = new RegExp(pattern)

  keys.forEach(key => {
    if (regex.test(key)) {
      cache.del(key)
    }
  })
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.flushAll()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats()
}

export default cacheMiddleware
