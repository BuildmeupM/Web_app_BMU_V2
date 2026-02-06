/**
 * Axios Mock
 * Mock สำหรับ axios เพื่อใช้ในการทดสอบ
 */

import { vi } from 'vitest'

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  create: vi.fn(() => mockAxios),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
}

export default mockAxios
