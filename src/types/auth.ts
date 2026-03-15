/**
 * Auth Types
 * User roles and authentication state types
 */

/** All possible user roles in the system */
export type UserRole =
  | 'admin'
  | 'audit'
  | 'service'
  | 'data_entry'
  | 'data_entry_and_service'
  | 'viewer'

/** Logged-in user info (from JWT / auth store) */
export interface AuthUser {
  id: string
  employee_id: string
  name: string
  nick_name?: string
  email?: string
  role: UserRole
  status: 'active' | 'inactive'
  position?: string
  department?: string
  profile_image?: string | null
}

/** Auth store state shape */
export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
}

/** Check if user has admin-level access */
export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'audit'
}

/** Check if user has data entry access */
export function isDataEntryRole(role?: string): boolean {
  return role === 'data_entry' || role === 'data_entry_and_service'
}

/** Check if user has service access */
export function isServiceRole(role?: string): boolean {
  return role === 'service' || role === 'data_entry_and_service'
}
