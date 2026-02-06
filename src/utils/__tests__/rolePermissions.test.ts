/**
 * rolePermissions Tests
 * ทดสอบ hasPermission, getAccessibleRoutes และ routePermissions
 */

import { describe, it, expect } from 'vitest'
import { hasPermission, getAccessibleRoutes, routePermissions } from '../rolePermissions'

describe('rolePermissions', () => {
  describe('routePermissions', () => {
    it('should have dashboard route for all roles', () => {
      const dashboard = routePermissions.find((r) => r.path === '/dashboard')
      expect(dashboard).toBeDefined()
      expect(dashboard?.roles).toEqual([
        'admin',
        'data_entry',
        'data_entry_and_service',
        'audit',
        'service',
      ])
    })

    it('should have document-sorting only for admin and service', () => {
      const route = routePermissions.find((r) => r.path === '/document-sorting')
      expect(route?.roles).toContain('admin')
      expect(route?.roles).toContain('service')
      expect(route?.roles).toHaveLength(2)
    })

    it('should have work-assignment only for admin', () => {
      const route = routePermissions.find((r) => r.path === '/work-assignment')
      expect(route?.roles).toEqual(['admin'])
    })
  })

  describe('hasPermission', () => {
    it('should return true when role has access to path', () => {
      expect(hasPermission('admin', '/dashboard')).toBe(true)
      expect(hasPermission('admin', '/work-assignment')).toBe(true)
      expect(hasPermission('service', '/document-sorting')).toBe(true)
      expect(hasPermission('audit', '/tax-inspection')).toBe(true)
    })

    it('should return false when role does not have access to path', () => {
      expect(hasPermission('data_entry', '/work-assignment')).toBe(false)
      expect(hasPermission('data_entry', '/document-sorting')).toBe(false)
      expect(hasPermission('service', '/tax-inspection')).toBe(false)
    })

    it('should return false for unknown path', () => {
      expect(hasPermission('admin', '/unknown-path')).toBe(false)
    })

    it('should allow data_entry_and_service for tax-status and tax-filing', () => {
      expect(hasPermission('data_entry_and_service', '/tax-status')).toBe(true)
      expect(hasPermission('data_entry_and_service', '/tax-filing')).toBe(true)
    })
  })

  describe('getAccessibleRoutes', () => {
    it('should return all routes for admin', () => {
      const routes = getAccessibleRoutes('admin')
      expect(routes.length).toBeGreaterThan(0)
      expect(routes.map((r) => r.path)).toContain('/dashboard')
      expect(routes.map((r) => r.path)).toContain('/work-assignment')
      expect(routes.map((r) => r.path)).toContain('/users')
    })

    it('should return fewer routes for data_entry than admin', () => {
      const adminRoutes = getAccessibleRoutes('admin')
      const dataEntryRoutes = getAccessibleRoutes('data_entry')
      expect(dataEntryRoutes.length).toBeLessThan(adminRoutes.length)
      expect(dataEntryRoutes.map((r) => r.path)).not.toContain('/work-assignment')
      expect(dataEntryRoutes.map((r) => r.path)).not.toContain('/users')
    })

    it('should return routes with label', () => {
      const routes = getAccessibleRoutes('service')
      expect(routes.every((r) => r.path && r.label && Array.isArray(r.roles))).toBe(true)
    })
  })
})
