import { Outlet, useLocation } from 'react-router-dom'
import { AppShell, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Suspense, useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import LoadingSpinner from '../Loading/LoadingSpinner'

export default function Layout() {
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure()

  const toggleSidebar = () => setSidebarExpanded((prev) => !prev)

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

  // Auto-close mobile nav when navigating
  useEffect(() => {
    closeMobile()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell
      navbar={{
        width: sidebarExpanded ? 280 : 72,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      header={{ height: 70 }}
      padding="md"
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      <AppShell.Header>
        <Header mobileOpened={mobileOpened} onToggleMobile={toggleMobile} />
      </AppShell.Header>
      <AppShell.Navbar
        p={sidebarExpanded ? 'md' : 'xs'}
        style={{
          transition: 'width 300ms ease, padding 300ms ease',
          overflowX: 'hidden',
        }}
      >
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={toggleSidebar}
          isMobile={mobileOpened}
          onCloseMobile={closeMobile}
        />
      </AppShell.Navbar>
      <AppShell.Main
        style={{
          transition: 'padding-left 300ms ease',
        }}
      >
        {/* ✅ BUG-167: Suspense boundary เพื่อแสดง loading spinner ขณะ lazy-load component */}
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
