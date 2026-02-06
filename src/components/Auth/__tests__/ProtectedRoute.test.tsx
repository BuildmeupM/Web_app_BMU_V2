/**
 * ProtectedRoute Component Tests
 * ทดสอบการทำงานของ ProtectedRoute component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import ProtectedRoute from '../ProtectedRoute'
import { useAuthStore } from '../../../store/authStore'

// Mock useAuthStore
vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">Navigate to {to}</div>,
  }
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is authenticated', () => {
    // Mock authenticated user
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      token: 'mock-token',
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    // Mock unauthenticated user
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      token: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should redirect to login
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
    expect(screen.getByText(/Navigate to \/login/)).toBeInTheDocument()
  })

  it('should redirect to login when token is missing', () => {
    // Mock user without token
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      token: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should redirect to login
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
  })
})
