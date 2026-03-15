import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Helper function to get backend URL
function getApiBaseUrl(): string {
  // Priority: VITE_API_URL > VITE_BACKEND_URL > VITE_API_BASE_URL
  const envUrl = import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL

  // If environment variable is set and valid (not localhost fallback needed)
  if (envUrl && envUrl.startsWith('http')) {
    // Ensure it ends with /api
    const baseUrl = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
    console.log('🌐 Using API URL from env:', baseUrl)
    return baseUrl
  }

  // Development fallback - localhost
  console.log('🌐 Using localhost API URL')
  return 'http://localhost:3001/api'
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
