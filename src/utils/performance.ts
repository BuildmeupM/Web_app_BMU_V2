/**
 * Performance monitoring utilities
 * สำหรับ tracking และ monitoring performance ของ application
 */

interface PerformanceMark {
  name: string
  startTime: number
  endTime?: number
  duration?: number
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map()
  private enabled: boolean = import.meta.env.DEV

  /**
   * Start performance mark
   */
  markStart(name: string): void {
    if (!this.enabled) return

    const startTime = performance.now()
    this.marks.set(name, {
      name,
      startTime,
    })

    // Use browser Performance API if available
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`)
    }
  }

  /**
   * End performance mark and calculate duration
   */
  markEnd(name: string): number | null {
    if (!this.enabled) return null

    const mark = this.marks.get(name)
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - mark.startTime

    mark.endTime = endTime
    mark.duration = duration

    // Use browser Performance API if available
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name)
    try {
      const result = await fn()
      this.markEnd(name)
      return result
    } catch (error) {
      this.markEnd(name)
      throw error
    }
  }

  /**
   * Measure sync function execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    this.markStart(name)
    try {
      const result = fn()
      this.markEnd(name)
      return result
    } catch (error) {
      this.markEnd(name)
      throw error
    }
  }

  /**
   * Get all marks
   */
  getMarks(): PerformanceMark[] {
    return Array.from(this.marks.values())
  }

  /**
   * Clear all marks
   */
  clearMarks(): void {
    this.marks.clear()
  }

  /**
   * Get mark by name
   */
  getMark(name: string): PerformanceMark | undefined {
    return this.marks.get(name)
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Helper function to measure component render time
 */
export function measureRender(componentName: string) {
  return {
    start: () => performanceMonitor.markStart(`render-${componentName}`),
    end: () => performanceMonitor.markEnd(`render-${componentName}`),
  }
}

/**
 * Helper function to measure API call time
 */
export function measureAPI(apiName: string) {
  return {
    start: () => performanceMonitor.markStart(`api-${apiName}`),
    end: () => performanceMonitor.markEnd(`api-${apiName}`),
  }
}

/**
 * Helper function to measure user interaction time
 */
export function measureInteraction(interactionName: string) {
  return {
    start: () => performanceMonitor.markStart(`interaction-${interactionName}`),
    end: () => performanceMonitor.markEnd(`interaction-${interactionName}`),
  }
}
