/**
 * Auth Service Tests
 * ทดสอบการทำงานของ authService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../authService'
import api from '../api'

// Mock api
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Login successful',
          data: {
            token: 'mock-jwt-token',
            user: {
              id: 1,
              employee_id: 'AC00001',
              full_name: 'Test User',
              email: 'test@example.com',
              role: 'admin',
            },
          },
        },
      }

      ;(api.post as any).mockResolvedValue(mockResponse)

      const result = await authService.login({
        username: 'test@example.com',
        password: 'password123',
      })

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'test@example.com',
        password: 'password123',
      })
      expect(result.data).toEqual(mockResponse.data.data)
    })

    it('should throw error with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid email or password',
          },
        },
      }

      ;(api.post as any).mockRejectedValue(mockError)

      await expect(
        authService.login({ username: 'wrong@example.com', password: 'wrongpassword' })
      ).rejects.toEqual(mockError)
    })

    it('should throw when API returns success: false', async () => {
      ;(api.post as any).mockResolvedValue({
        data: {
          success: false,
          message: 'Account locked',
        },
      })

      await expect(
        authService.login({ username: 'user@example.com', password: 'password' })
      ).rejects.toMatchObject({ message: 'Account locked' })
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      ;(api.post as any).mockResolvedValue({ data: { message: 'Logged out' } })

      await authService.logout()

      expect(api.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('should not throw when logout API fails', async () => {
      ;(api.post as any).mockRejectedValue(new Error('Network error'))

      await expect(authService.logout()).resolves.not.toThrow()
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'test',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      }

      ;(api.get as any).mockResolvedValue({
        data: {
          success: true,
          data: mockUser,
        },
      })

      const result = await authService.getCurrentUser()

      expect(api.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockUser)
    })

    it('should throw when API returns success: false', async () => {
      ;(api.get as any).mockResolvedValue({
        data: { success: false },
      })

      await expect(authService.getCurrentUser()).rejects.toThrow(
        'Failed to get current user'
      )
    })
  })
})
