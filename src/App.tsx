import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout/Layout'
import InternalLayout from './components/Layout/InternalLayout'
import RegistrationLayout from './components/Layout/RegistrationLayout'
import MarketingLayout from './components/Layout/MarketingLayout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import LoadingFallback from './components/Loading/LoadingFallback'
import LoadingSpinner from './components/Loading/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { useHeartbeat } from './hooks/useHeartbeat'

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'))
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'))
const SalaryAdvance = lazy(() => import('./pages/SalaryAdvance'))
const OfficeAttendance = lazy(() => import('./pages/OfficeAttendance'))
const DocumentSorting = lazy(() => import('./pages/DocumentSorting'))
const DocumentEntry = lazy(() => import('./pages/DocumentEntry'))
const TaxInspection = lazy(() => import('./pages/TaxInspection'))
const TaxStatus = lazy(() => import('./pages/TaxStatus'))
const TaxFiling = lazy(() => import('./pages/TaxFiling'))
const WorkAssignment = lazy(() => import('./pages/WorkAssignment'))
const ClientManagement = lazy(() => import('./pages/ClientManagement'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const AccountingMarketplace = lazy(() => import('./pages/AccountingMarketplace'))
const HolidayManagement = lazy(() => import('./pages/HolidayManagement'))
const AccountingFeesManagement = lazy(() => import('./pages/AccountingFeesManagement'))
const AccountingFeesDashboard = lazy(() => import('./pages/AccountingFeesDashboard'))
const BotExportManagement = lazy(() => import('./pages/BotExportManagement'))
const AccountingFeeNotifications = lazy(() => import('./pages/AccountingFeeNotifications'))
const RegistrationWork = lazy(() => import('./pages/RegistrationWork'))
const RegistrationSettings = lazy(() => import('./pages/RegistrationSettings'))
const MessengerRoutes = lazy(() => import('./pages/MessengerRoutes'))
const MarketingWork = lazy(() => import('./pages/MarketingWork'))
const LoginActivity = lazy(() => import('./pages/LoginActivity'))

function App() {
  const { isAuthenticated, _hasHydrated, setHasHydrated } = useAuthStore()

  // Heartbeat — ส่งสัญญาณออนไลน์ทุก 2 นาที
  useHeartbeat()

  // ✅ BUG-168: Fallback hydration - ถ้า onRehydrateStorage ไม่ทำงานหรือทำงานช้า
  // ป้องกันปัญหาที่ component ไม่ render เมื่อ navigate ไปหน้าอื่นๆ
  // รอ 100ms ถ้ายังไม่ hydrated ให้ set เป็น true เพื่อให้ component render ได้
  useEffect(() => {
    if (!_hasHydrated) {
      const timer = setTimeout(() => {
        // ตรวจสอบว่า sessionStorage มีข้อมูลหรือไม่
        // ถ้ามีก็ถือว่า hydration ควรเสร็จแล้ว แต่ callback อาจไม่ทำงาน
        const stored = sessionStorage.getItem('auth-storage')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            // ถ้ามี state ใน storage แต่ _hasHydrated ยังเป็น false
            // แสดงว่า onRehydrateStorage ไม่ทำงาน ให้ set เป็น true
            if (parsed?.state) {
              if (import.meta.env.DEV) {
                console.log('[App] Fallback hydration: Setting _hasHydrated to true (storage exists)')
              }
              setHasHydrated(true)
            }
          } catch (e) {
            // ถ้า parse ไม่ได้ก็ set เป็น true เพื่อให้ component render ได้
            if (import.meta.env.DEV) {
              console.warn('[App] Fallback hydration: Parse error, setting _hasHydrated to true', e)
            }
            setHasHydrated(true)
          }
        } else {
          // ถ้าไม่มีข้อมูลใน storage ก็ set เป็น true เพื่อให้ component render ได้
          // (จะไม่มี auth state แต่ component จะ render และ redirect ไป login)
          if (import.meta.env.DEV) {
            console.log('[App] Fallback hydration: No storage, setting _hasHydrated to true')
          }
          setHasHydrated(true)
        }
      }, 100) // รอ 100ms เพื่อให้ hydration callback มีโอกาสทำงานก่อน
      return () => clearTimeout(timer)
    }
  }, [_hasHydrated, setHasHydrated])

  // ✅ Debug: Log hydration state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[App] Hydration state:', { _hasHydrated, isAuthenticated, hasToken: !!useAuthStore.getState().token })
    }
  }, [_hasHydrated, isAuthenticated])

  // ✅ รอ hydration เสร็จก่อน render routes เพื่อป้องกัน race condition
  if (!_hasHydrated) {
    return (
      <ErrorBoundary>
        <LoadingSpinner fullHeight message="กำลังโหลดระบบ..." />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Suspense fallback={<LoadingFallback />}>
                  <Login />
                </Suspense>
              )
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="employees"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <EmployeeManagement />
                </Suspense>
              }
            />
            <Route
              path="leave"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <LeaveManagement />
                </Suspense>
              }
            />
            <Route
              path="salary-advance"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <SalaryAdvance />
                </Suspense>
              }
            />
            <Route
              path="attendance"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <OfficeAttendance />
                </Suspense>
              }
            />
            <Route
              path="document-sorting"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DocumentSorting />
                </Suspense>
              }
            />
            <Route
              path="document-entry"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DocumentEntry />
                </Suspense>
              }
            />
            <Route
              path="tax-inspection"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TaxInspection />
                </Suspense>
              }
            />
            <Route
              path="tax-status"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TaxStatus />
                </Suspense>
              }
            />
            <Route
              path="tax-filing"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TaxFiling />
                </Suspense>
              }
            />
            <Route
              path="work-assignment"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <WorkAssignment />
                </Suspense>
              }
            />
            <Route
              path="clients"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ClientManagement />
                </Suspense>
              }
            />
            <Route
              path="users"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <UserManagement />
                </Suspense>
              }
            />
            <Route
              path="accounting-marketplace"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AccountingMarketplace />
                </Suspense>
              }
            />
            <Route
              path="holidays"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <HolidayManagement />
                </Suspense>
              }
            />
            <Route
              path="login-activity"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<LoadingFallback />}>
                    <LoginActivity />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Internal System Layout — แยก layout ของตัวเอง */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <InternalLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="accounting-fees-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'registration']}>
                  <Suspense fallback={<LoadingFallback />}>
                    <AccountingFeesDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="accounting-fees"
              element={
                <ProtectedRoute allowedRoles={['admin', 'registration']}>
                  <Suspense fallback={<LoadingFallback />}>
                    <AccountingFeesManagement />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="bot-export"
              element={
                <ProtectedRoute allowedRoles={['admin', 'registration']}>
                  <Suspense fallback={<LoadingFallback />}>
                    <BotExportManagement />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="accounting-fee-notifications"
              element={
                <ProtectedRoute allowedRoles={['admin', 'registration']}>
                  <Suspense fallback={<LoadingFallback />}>
                    <AccountingFeeNotifications />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Registration Work Layout — แยก layout งานทะเบียน */}
          <Route
            path="/registration-work"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registration']}>
                <RegistrationLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <RegistrationWork />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <RegistrationSettings />
                </Suspense>
              }
            />
            <Route
              path="messenger-routes"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MessengerRoutes />
                </Suspense>
              }
            />
          </Route>

          {/* Marketing Work Layout — แยก layout งานออกแบบ/การตลาด */}
          <Route
            path="/marketing-work"
            element={
              <ProtectedRoute allowedRoles={['admin', 'marketing']}>
                <MarketingLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MarketingWork />
                </Suspense>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
