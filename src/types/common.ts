/**
 * Common UI Types
 * Reusable type patterns for components
 */

/** Generic modal state — tracks opened status and associated data */
export interface ModalState<T = unknown> {
  opened: boolean
  data: T | null
}

/** Create a fresh closed modal state */
export function closedModal<T = unknown>(): ModalState<T> {
  return { opened: false, data: null }
}

/** Create an open modal state with data */
export function openModal<T>(data: T): ModalState<T> {
  return { opened: true, data }
}

/** Column visibility as a string-keyed boolean map */
export type ColumnVisibility = Record<string, boolean>

/** Common filter state pattern */
export interface FilterState {
  search: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** Loading progress for bulk operations */
export interface LoadingProgress {
  current: number
  total: number
}

/** Table column definition */
export interface TableColumn<T = unknown> {
  key: string
  label: string
  sortable?: boolean
  width?: number | string
  render?: (item: T, index: number) => React.ReactNode
}
