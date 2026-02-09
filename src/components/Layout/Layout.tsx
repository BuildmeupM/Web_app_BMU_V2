import { Outlet, useLocation } from 'react-router-dom'
import { AppShell, Box } from '@mantine/core'
import { Suspense, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import LoadingSpinner from '../Loading/LoadingSpinner'

export default function Layout() {
  const location = useLocation()

  // ✅ BUG-167: Log location changes เพื่อ debug
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Layout] Location changed:', {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        key: location.key,
        timestamp: new Date().toISOString(),
      })
    }
  }, [location])

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm' }}
      header={{ height: 70 }}
      padding="md"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main>
        {/* ✅ BUG-167: Suspense boundary เพื่อแสดง loading spinner ขณะ lazy-load component */}
        {/* เมื่อเปลี่ยน route → key เปลี่ยน → component เก่า unmount → Suspense จับ lazy loading → แสดง spinner */}
        <Suspense
          fallback={
            <Box style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner message="กำลังโหลดหน้า..." />
            </Box>
          }
        >
          <Outlet key={`${location.pathname}-${location.key}`} />
        </Suspense>
      </AppShell.Main>
    </AppShell>
  )
}
