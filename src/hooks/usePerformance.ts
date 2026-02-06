import { useEffect, useRef } from 'react'
import { performanceMonitor, measureRender } from '../utils/performance'

interface UsePerformanceOptions {
  componentName: string
  enabled?: boolean
  logThreshold?: number // Log only if duration exceeds threshold (ms)
}

/**
 * Hook to measure component render performance
 */
export function usePerformance({ componentName, enabled = true, logThreshold = 0 }: UsePerformanceOptions) {
  const renderCountRef = useRef(0)
  const isEnabled = enabled && import.meta.env.DEV

  useEffect(() => {
    if (!isEnabled) return

    renderCountRef.current++
    const markName = `${componentName}-render-${renderCountRef.current}`
    const { start, end } = measureRender(markName)

    start()

    return () => {
      const duration = end()
      if (duration !== null && duration > logThreshold) {
        console.log(`[Performance] ${componentName} render #${renderCountRef.current}: ${duration.toFixed(2)}ms`)
      }
    }
  })

  return {
    renderCount: renderCountRef.current,
  }
}

/**
 * Hook to measure async operation performance
 */
export function useAsyncPerformance() {
  const measure = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureAsync(name, fn)
  }

  return { measure }
}
