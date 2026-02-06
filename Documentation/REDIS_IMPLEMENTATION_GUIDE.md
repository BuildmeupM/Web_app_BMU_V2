# 🔴 Redis Implementation Guide - คู่มือการใช้งาน Redis Cache

**Last Updated**: 2026-02-03  
**Status**: 📋 Planning - Ready for Implementation

---

## 📋 Overview

เอกสารนี้อธิบายวิธีการ implement Redis Cache สำหรับ BMU Work Management System เพื่อเพิ่มประสิทธิภาพและรองรับการ scale ในอนาคต

---

## 🎯 เป้าหมาย

- ⚡ ลด Database Load 80-90%
- ⚡ ลด Response Time 60-80%
- ⚡ รองรับการ Scale ได้ดีขึ้น
- ⚡ Shared Cache ระหว่าง Multiple Server Instances

---

## 📊 Current State vs. Redis

### Current State (Node-Cache):
- ✅ In-Memory Cache (เร็วมาก)
- ❌ ไม่สามารถ share cache ระหว่าง server instances ได้
- ❌ Cache จะหายเมื่อ server restart
- ❌ จำกัดด้วย memory ของ single server

### Redis Cache:
- ✅ Shared Cache ระหว่าง multiple server instances
- ✅ Persistent Cache (ไม่หายเมื่อ server restart)
- ✅ รองรับการ scale ได้ดี
- ✅ มี TTL และ eviction policies
- ✅ รองรับ pub/sub สำหรับ real-time updates

---

## 🚀 Implementation Plan

### Phase 1: Setup Redis Server

#### Option 1: Local Development (Docker)

**⚠️ ต้องติดตั้ง Docker Desktop ก่อน** - ดูคู่มือ: `Documentation/DOCKER_SETUP_GUIDE.md`

```bash
# ตรวจสอบว่า Docker ทำงานแล้ว
docker --version

# Run Redis using Docker
docker run -d -p 6379:6379 --name redis-bmu redis:7-alpine

# ตรวจสอบว่า Redis ทำงานแล้ว
docker ps

# ควรเห็น redis-bmu container
```

**ถ้าเกิด error**: `docker: error during connect` → Docker Desktop ไม่ได้รันอยู่
- เปิด Docker Desktop จาก Start Menu
- รอให้ Docker Desktop เริ่มทำงาน
- ลองรันคำสั่งอีกครั้ง

#### Option 2: Cloud Redis (Production)
- **Railway**: Redis addon
- **Render**: Redis addon
- **AWS ElastiCache**: Managed Redis
- **DigitalOcean**: Managed Redis

---

### Phase 2: Install Redis Client

```bash
cd backend
npm install ioredis
```

---

### Phase 3: Create Redis Service

**File**: `backend/services/redisService.js`

```javascript
import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
})

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected')
})

redis.on('error', (err) => {
  console.error('❌ Redis error:', err)
})

redis.on('close', () => {
  console.log('🔌 Redis connection closed')
})

/**
 * Get value from Redis cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
export async function getCache(key) {
  try {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

/**
 * Set value in Redis cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 30)
 * @returns {Promise<boolean>} Success status
 */
export async function setCache(key, value, ttl = 30) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Redis set error:', error)
    return false
  }
}

/**
 * Delete cache by key
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCache(key) {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}

/**
 * Delete cache by pattern
 * @param {string} pattern - Pattern to match (e.g., 'GET:/api/monthly-tax-data*')
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deleteCacheByPattern(pattern) {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) return 0
    return await redis.del(...keys)
  } catch (error) {
    console.error('Redis delete pattern error:', error)
    return 0
  }
}

/**
 * Clear all cache
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllCache() {
  try {
    await redis.flushdb()
    return true
  } catch (error) {
    console.error('Redis flush error:', error)
    return false
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  try {
    const info = await redis.info('stats')
    const keyspace = await redis.info('keyspace')
    return {
      info,
      keyspace,
      connected: redis.status === 'ready',
    }
  } catch (error) {
    console.error('Redis stats error:', error)
    return null
  }
}

export default redis
```

---

### Phase 4: Update Cache Middleware

**File**: `backend/middleware/cache.js`

```javascript
import { getCache, setCache, deleteCacheByPattern } from '../services/redisService.js'
import NodeCache from 'node-cache'

// Fallback to NodeCache if Redis is not available
const nodeCache = new NodeCache({
  stdTTL: 30,
  checkperiod: 10,
  useClones: false,
  maxKeys: 1000,
})

// Check if Redis is available
let useRedis = false
try {
  const redis = await import('../services/redisService.js')
  useRedis = redis.default.status === 'ready'
} catch (error) {
  console.warn('⚠️ Redis not available, using NodeCache fallback')
}

export function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next()
  }

  // Skip caching for certain endpoints
  const skipCachePaths = ['/api/auth', '/health']
  const shouldSkipCache = skipCachePaths.some(path => req.path.startsWith(path))
  if (shouldSkipCache) {
    return next()
  }

  const cacheKey = generateCacheKey(req)

  // Check cache (Redis or NodeCache)
  if (useRedis) {
    getCache(cacheKey).then(cachedData => {
      if (cachedData) {
        return res.json(cachedData)
      }
      // Continue to next middleware
      next()
    })
  } else {
    // Fallback to NodeCache
    const cachedData = nodeCache.get(cacheKey)
    if (cachedData) {
      return res.json(cachedData)
    }
    next()
  }

  // Override json method to cache response
  const originalJson = res.json.bind(res)
  res.json = function (data) {
    if (res.statusCode === 200 && data) {
      const isMonthlyTaxData = req.path.includes('/monthly-tax-data')
      const ttl = isMonthlyTaxData ? 30 : undefined
      
      if (useRedis) {
        setCache(cacheKey, data, ttl)
      } else {
        nodeCache.set(cacheKey, data, ttl)
      }
    }
    return originalJson(data)
  }
}

export function invalidateCache(pattern) {
  if (useRedis) {
    deleteCacheByPattern(pattern)
  } else {
    // NodeCache fallback
    const keys = nodeCache.keys()
    const regex = new RegExp(pattern)
    keys.forEach(key => {
      if (regex.test(key)) {
        nodeCache.del(key)
      }
    })
  }
}
```

---

### Phase 5: Update Environment Variables

**File**: `backend/.env`

```env
# Redis Configuration (Optional - falls back to NodeCache if not set)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## 📊 Expected Performance Improvements

| Metric | Before (Node-Cache) | After (Redis) | Improvement |
|--------|---------------------|---------------|-------------|
| Database Load | High | **Low** | ⚡ 80-90% |
| Response Time | 200-500ms | **<100ms** | ⚡ 60-80% |
| Cache Hit Rate | 60-70% | **80-90%** | ⚡ 20-30% |
| Scalability | Single Server | **Multiple Servers** | ⚡ ∞ |

---

## ⚠️ Considerations

### 1. Redis Server Setup
- ต้อง setup Redis server ก่อนใช้งาน
- สำหรับ development: ใช้ Docker
- สำหรับ production: ใช้ managed Redis service

### 2. Fallback Strategy
- ถ้า Redis ไม่ available จะ fallback ไปใช้ NodeCache
- ระบบจะยังทำงานได้ปกติแม้ว่า Redis จะ down

### 3. Cache Invalidation
- ต้อง invalidate cache เมื่อมีการ update/delete
- ใช้ pattern matching เพื่อ invalidate multiple keys

### 4. Memory Management
- ตั้ง TTL ที่เหมาะสม (30 seconds สำหรับ monthly-tax-data)
- Monitor Redis memory usage
- ใช้ eviction policy (LRU) เมื่อ memory เต็ม

---

## 🔧 Testing

### 1. Test Redis Connection
```javascript
import redis from './services/redisService.js'

// Test connection
redis.ping().then(result => {
  console.log('Redis ping:', result) // Should return 'PONG'
})
```

### 2. Test Cache Operations
```javascript
import { getCache, setCache, deleteCache } from './services/redisService.js'

// Set cache
await setCache('test:key', { data: 'test' }, 60)

// Get cache
const value = await getCache('test:key')
console.log(value) // { data: 'test' }

// Delete cache
await deleteCache('test:key')
```

---

## 📚 References

- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Redis Eviction Policies](https://redis.io/docs/manual/eviction/)

---

**Last Updated**: 2026-02-03  
**Next Steps**: Setup Redis server และ implement Redis service
