/**
 * useRealtimeUpdates Hook
 * Hook สำหรับ subscribe WebSocket updates สำหรับ monthly tax data
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import { useAuthStore } from '../store/authStore'
import { createSocketConnection } from '../services/socketService'
import { MonthlyTaxData } from '../services/monthlyTaxDataService'

/**
 * Hook สำหรับ subscribe real-time updates ของ monthly tax data
 * @param employeeId - Employee ID สำหรับ subscribe ไปยัง room ที่เกี่ยวข้อง
 */
export function useRealtimeUpdates(employeeId: string | null) {
  const queryClient = useQueryClient()
  const { token } = useAuthStore()
  const socketRef = useRef<ReturnType<typeof createSocketConnection> | null>(null)
  const subscribedEmployeeIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Skip if no employee ID or token
    if (!employeeId || !token) {
      return
    }

    // Skip if already subscribed to the same employee
    if (subscribedEmployeeIdRef.current === employeeId && socketRef.current?.connected) {
      return
    }

    // Create socket connection
    const socket = createSocketConnection(token)
    socketRef.current = socket

    // Subscribe to monthly-tax-data updates
    socket.on('connect', () => {
      socket.emit('subscribe:monthly-tax-data', { employeeId })
      subscribedEmployeeIdRef.current = employeeId
      console.log('📡 [useRealtimeUpdates] Subscribed to monthly-tax-data updates', {
        employeeId,
        socketId: socket.id,
      })
    })

      // Handle monthly-tax-data:updated event
      socket.on('monthly-tax-data:updated', (updatedData: MonthlyTaxData) => {
        console.log('📥 [useRealtimeUpdates] Received monthly-tax-data:updated event', {
          build: updatedData.build,
          id: updatedData.id,
          employeeId,
          pp30_status: updatedData.pp30_status,
          pp30_form: updatedData.pp30_form, // ⚠️ สำคัญ: เพิ่ม logging สำหรับ pp30_form
          pnd_status: updatedData.pnd_status,
          // 🔍 Debug: Log all pp30 related fields
          pp30_sent_to_customer_date: updatedData.pp30_sent_to_customer_date,
          pp30_review_returned_date: updatedData.pp30_review_returned_date,
          pp30_sent_for_review_date: updatedData.pp30_sent_for_review_date,
          vat_draft_completed_date: updatedData.vat_draft_completed_date,
        })

        // ⚠️ สำคัญ: Invalidate และ refetch queries เพื่อให้ได้ข้อมูลล่าสุดจาก server
        // ใช้วิธีนี้แทนการ update cache โดยตรงเพื่อให้แน่ใจว่าข้อมูลตรงกับฐานข้อมูล
        // ⚠️ ใช้ sequential refetch เพื่อหลีกเลี่ยง 429 errors
        
        const listQueryKeys = [
          ['monthly-tax-data', 'tax-status'],
          ['monthly-tax-data', 'tax-filing'],
          ['monthly-tax-data', 'tax-inspection'],
        ]
        
        const summaryQueryKeys = [
          ['monthly-tax-data-summary', 'tax-status'],
          ['monthly-tax-data-summary', 'tax-filing'],
          ['monthly-tax-data-summary', 'tax-inspection'],
        ]

        // Invalidate detail query if we have build/year/month
        let detailQueryKey: string[] | null = null
        if (updatedData.build && updatedData.tax_year && updatedData.tax_month) {
          detailQueryKey = [
            'monthly-tax-data',
            updatedData.build,
            String(updatedData.tax_year),
            String(updatedData.tax_month),
          ]
        }

        // Step 1: Invalidate all queries และบังคับ refetch ทันที (refetchType: 'active')
        // ⚠️ สำคัญ: ใช้ refetchType: 'active' เพื่อบังคับให้ refetch แม้ว่า refetchOnMount จะเป็น false
        
        // 🔍 Debug: Log active queries ก่อน invalidate
        if (import.meta.env.DEV) {
          listQueryKeys.forEach((queryKey) => {
            const activeQueries = queryClient.getQueriesData({ queryKey, exact: false })
            const activeQueriesFiltered = activeQueries.filter(() => {
              const queryState = queryClient.getQueryState(queryKey)
              return queryState?.status === 'success' || queryState?.status === 'loading'
            })
            console.log('🔍 [useRealtimeUpdates] Active queries before invalidate', {
              queryKey,
              totalQueries: activeQueries.length,
              activeQueries: activeQueriesFiltered.length,
              queryKeys: activeQueries.map(([key]) => key),
            })
          })
        }
        
        listQueryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries(queryKey)
        })
        summaryQueryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries(queryKey)
        })
        if (detailQueryKey) {
          queryClient.invalidateQueries(detailQueryKey)
        }

        console.log('🔄 [useRealtimeUpdates] Invalidated queries and triggered active refetch', {
          build: updatedData.build,
          employeeId,
          listQueries: listQueryKeys.length,
          summaryQueries: summaryQueryKeys.length,
          hasDetailQuery: !!detailQueryKey,
        })

        // Step 2: Sequential refetch เพื่อหลีกเลี่ยง burst requests
        // ⚠️ สำคัญ: Refetch ทันที (0ms) เพื่อให้อัพเดทเร็วที่สุด แต่ยังใช้ sequential เพื่อหลีกเลี่ยง 429
        // ⚠️ สำคัญ: ใช้ delay สั้นๆ (50ms) ระหว่างแต่ละ query เพื่อหลีกเลี่ยง 429 แต่ยังเร็ว
        ;(async () => {
          try {
            // Refetch list queries ก่อน (สำคัญที่สุด - ใช้สำหรับแสดงในตาราง)
            for (const queryKey of listQueryKeys) {
              // 🔍 Debug: Log active queries ก่อน refetch
              if (import.meta.env.DEV) {
                const allQueries = queryClient.getQueriesData({ queryKey, exact: false })
                const activeQueries = allQueries.filter(([key]) => {
                  const queryState = queryClient.getQueryState(key as string[])
                  return queryState?.status === 'success' || queryState?.status === 'loading'
                })
                console.log('🔍 [useRealtimeUpdates] Before refetch list query', {
                  queryKey,
                  allQueriesCount: allQueries.length,
                  activeQueriesCount: activeQueries.length,
                  activeQueryKeys: activeQueries.map(([key]) => key),
                })
              }
              
              // ⚠️ สำคัญ: ใช้ invalidateQueries กับ refetchType: 'active' เพื่อบังคับ refetch
              // แล้วรอให้ React Query refetch อัตโนมัติ (เร็วกว่าและเชื่อถือได้กว่า refetchQueries)
              queryClient.invalidateQueries(queryKey)
              
              // ⚠️ สำคัญ: รอสักครู่เพื่อให้ invalidateQueries trigger refetch
              await new Promise((resolve) => setTimeout(resolve, 100))
              
              console.log('✅ [useRealtimeUpdates] Invalidated and triggered refetch for list query', {
                queryKey,
                build: updatedData.build,
              })
              // รอ 50ms ระหว่างแต่ละ query เพื่อหลีกเลี่ยง 429 แต่ยังเร็ว
              await new Promise((resolve) => setTimeout(resolve, 50))
            }
            
            // Invalidate summary queries หลังจาก list queries เสร็จ (รองลงมา)
            for (const queryKey of summaryQueryKeys) {
              queryClient.invalidateQueries(queryKey)
              // ⚠️ สำคัญ: รอสักครู่เพื่อให้ invalidateQueries trigger refetch
              await new Promise((resolve) => setTimeout(resolve, 100))
              console.log('✅ [useRealtimeUpdates] Invalidated and triggered refetch for summary query', {
                queryKey,
              })
            }
            
            // Invalidate detail query ถ้ามี (สำหรับ modal)
            if (detailQueryKey) {
              queryClient.invalidateQueries(detailQueryKey)
              // ⚠️ สำคัญ: รอสักครู่เพื่อให้ invalidateQueries trigger refetch
              await new Promise((resolve) => setTimeout(resolve, 100))
              console.log('✅ [useRealtimeUpdates] Invalidated and triggered refetch for detail query', {
                queryKey: detailQueryKey,
              })
            }
            
            console.log('✅ [useRealtimeUpdates] Completed sequential refetch', {
              build: updatedData.build,
              employeeId,
              pnd_status: updatedData.pnd_status,
              pp30_status: updatedData.pp30_status,
              pp30_form: updatedData.pp30_form, // ⚠️ สำคัญ: เพิ่ม logging สำหรับ pp30_form
            })
            
            // 🔍 Debug: Log refetched data for the updated record
            if (import.meta.env.DEV) {
              const listQueries = queryClient.getQueriesData({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
              listQueries.forEach(([, queryData]: [unknown, unknown]) => {
                const data = queryData as Record<string, Record<string, MonthlyTaxData[]>> | null
                if (data?.data?.data) {
                  const matchingRecord = data.data.data.find((item: MonthlyTaxData) => item.id === updatedData.id || item.build === updatedData.build)
                  if (matchingRecord) {
                    console.log('🔍 [useRealtimeUpdates] Refetched data for updated record:', {
                      build: matchingRecord.build,
                      id: matchingRecord.id,
                      pp30_form_from_refetch: matchingRecord.pp30_form,
                      pp30_status_from_refetch: matchingRecord.pp30_status,
                      pp30_form_from_websocket: updatedData.pp30_form,
                      pp30_status_from_websocket: updatedData.pp30_status,
                      match: matchingRecord.pp30_form === updatedData.pp30_form,
                    })
                  }
                }
              })
            }
          } catch (error) {
            console.error('❌ [useRealtimeUpdates] Error during refetch:', error)
          }
        })() // ⚠️ สำคัญ: Refetch ทันที (0ms delay) เพื่อให้อัพเดทเร็วที่สุด
      })

    // Cleanup on unmount or employeeId change
    return () => {
      if (socketRef.current) {
        // Unsubscribe from room but DO NOT disconnect the shared global socket
        // because it is also used by the chat system in NotificationsMenu
        if (socketRef.current.connected && subscribedEmployeeIdRef.current) {
          try {
            socketRef.current.emit('unsubscribe:monthly-tax-data', {
              employeeId: subscribedEmployeeIdRef.current,
            })
            console.log('🔌 [useRealtimeUpdates] Unsubscribed from room')
          } catch (error) {
            console.warn('⚠️ [useRealtimeUpdates] Error unsubscribing:', error)
          }
        }
        
        // Only remove our own event listener, DO NOT call disconnectSocket()
        socketRef.current.off('monthly-tax-data:updated')
        
        socketRef.current = null
        subscribedEmployeeIdRef.current = null
        console.log('🔌 [useRealtimeUpdates] Cleaned up listeners (socket kept alive for chat)')
      }
    }
  }, [employeeId, token, queryClient])
}
