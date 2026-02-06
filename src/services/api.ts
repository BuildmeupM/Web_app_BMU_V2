import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Helper function to get backend URL
// If VITE_API_BASE_URL is set, use it
// Otherwise, detect if we're accessing via IP and use the same IP for backend
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  
  if (envUrl && !envUrl.includes('localhost')) {
    // If VITE_API_BASE_URL is set and not localhost, use it
    return envUrl
  }
  
  // Check if we're accessing via IP address (not localhost)
  const currentHost = window.location.hostname
  const currentPort = window.location.port || '3000'
  
  // If accessing via IP (not localhost or 127.0.0.1), use same IP for backend
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '') {
    // Use same IP but backend port (3001)
    return `http://${currentHost}:3001/api`
  }
  
  // Default to localhost
  return envUrl || 'http://localhost:3001/api'
}

const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Debug logging for PUT requests to document-entry-work
    if (config.method === 'put' && config.url?.includes('/document-entry-work/')) {
      console.log('🌐 Axios PUT request:', {
        url: config.url,
        data: config.data,
        headers: config.headers,
      })
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors with retry logic for 429 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle 429 Too Many Requests - ไม่ retry เพราะจะทำให้แย่ลง
    // ให้ React Query จัดการ retry แทน (แต่จะไม่ retry สำหรับ 429)
    if (error.response?.status === 429) {
      // ไม่ retry ใน axios interceptor - ให้ React Query จัดการ
      // เพิ่ม delay เพื่อไม่ให้เกิด requests ใหม่ทันที
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
