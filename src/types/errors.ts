/**
 * Error types for better type safety
 */

export interface ApiError {
  message: string
  status?: number
  code?: string
  response?: {
    data?: {
      message?: string
      error?: string
    }
    status?: number
  }
}

export interface NetworkError extends Error {
  code?: string
  message: string
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'response' in error || 'status' in error)
  )
}

export function isNetworkError(error: unknown): error is NetworkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET')
  )
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}
