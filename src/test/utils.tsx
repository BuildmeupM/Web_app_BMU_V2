/**
 * Test Utilities
 * ฟังก์ชันช่วยเหลือสำหรับการทดสอบ
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Custom render function ที่รวม Providers ที่จำเป็น
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          {children}
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

/**
 * Mock functions สำหรับ API calls
 */
export const mockApiResponse = <T,>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export const mockApiError = (message: string, status = 500) => {
  return Promise.reject({
    response: {
      status,
      data: { message },
    },
  })
}

/**
 * Helper function สำหรับสร้าง mock user
 */
export const createMockUser = (overrides = {}) => {
  return {
    id: 1,
    employee_id: 'AC00001',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    ...overrides,
  }
}

/**
 * Helper function สำหรับสร้าง mock token
 */
export const createMockToken = () => {
  return 'mock-jwt-token-12345'
}

/**
 * Wait for async operations
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))
