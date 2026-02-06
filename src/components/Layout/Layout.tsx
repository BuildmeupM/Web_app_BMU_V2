import { Outlet, useLocation } from 'react-router-dom'
import { AppShell } from '@mantine/core'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

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
        {/* ✅ BUG-167: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน */}
        {/* ใช้ location.pathname + location.key เป็น key เพื่อให้ React unmount component เก่าและ mount component ใหม่ทุกครั้งที่ route เปลี่ยน */}
        {/* location.key จะเปลี่ยนทุกครั้งที่ navigate ไปยัง route ใหม่ */}
        <Outlet key={`${location.pathname}-${location.key}`} />
      </AppShell.Main>
    </AppShell>
  )
}
