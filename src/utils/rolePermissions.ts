import { UserRole } from '../store/authStore'

export interface RoutePermission {
  path: string
  label: string
  roles: UserRole[]
}

// ทุก Role
const allRoles: UserRole[] = ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr', 'registration', 'marketing']

export const routePermissions: RoutePermission[] = [
  // 1. แดชบอร์ด - ทุก Role
  {
    path: '/dashboard',
    label: 'แดชบอร์ด',
    roles: allRoles,
  },
  // 2. ข้อมูลพนักงาน - ทุก Role
  {
    path: '/employees',
    label: 'ข้อมูลพนักงาน',
    roles: allRoles,
  },
  // 3. ลางาน/WFH - ทุก Role
  {
    path: '/leave',
    label: 'ลางาน/WFH',
    roles: allRoles,
  },
  // 4. จัดการวันหยุด - admin, HR
  {
    path: '/holidays',
    label: 'จัดการวันหยุด',
    roles: ['admin', 'hr'],
  },
  // 5. ขอเบิกเงินเดือน - ทุก Role
  {
    path: '/salary-advance',
    label: 'ขอเบิกเงินเดือน',
    roles: allRoles,
  },
  // 6. ข้อมูลเข้าออฟฟิศ - ทุก Role
  {
    path: '/attendance',
    label: 'ข้อมูลเข้าออฟฟิศ',
    roles: allRoles,
  },
  // 7. ข้อมูลลูกค้า - admin, audit, registration
  {
    path: '/clients',
    label: 'ข้อมูลลูกค้า',
    roles: ['admin', 'audit', 'registration'],
  },
  // 7.1 Dashboard ลูกค้า - admin เท่านั้น
  {
    path: '/client-dashboard',
    label: 'Dashboard ลูกค้า',
    roles: ['admin'],
  },
  // 8. จัดงานรายเดือน - admin, audit
  {
    path: '/work-assignment',
    label: 'จัดงานรายเดือน',
    roles: ['admin', 'audit'],
  },
  // 9. คัดแยกเอกสาร - admin, service, audit
  {
    path: '/document-sorting',
    label: 'คัดแยกเอกสาร',
    roles: ['admin', 'service', 'audit'],
  },
  // 10. คีย์เอกสาร - admin, data_entry, data_entry_and_service
  {
    path: '/document-entry',
    label: 'คีย์เอกสาร',
    roles: ['admin', 'data_entry', 'data_entry_and_service'],
  },
  // 11. ตรวจภาษี - admin, audit
  {
    path: '/tax-inspection',
    label: 'ตรวจภาษี',
    roles: ['admin', 'audit'],
  },
  // 12. สถานะยื่นภาษี - admin, data_entry_and_service, service, audit
  {
    path: '/tax-status',
    label: 'สถานะยื่นภาษี',
    roles: ['admin', 'data_entry_and_service', 'service', 'audit'],
  },
  // 13. ยื่นภาษี - admin, data_entry_and_service, audit
  {
    path: '/tax-filing',
    label: 'ยื่นภาษี',
    roles: ['admin', 'data_entry_and_service', 'audit'],
  },
  // 14. ตลาดกลางผู้ทำบัญชี - ทุก Role ยกเว้น data_entry
  {
    path: '/accounting-marketplace',
    label: 'ตลาดกลางผู้ทำบัญชี',
    roles: ['admin', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 15. จัดการ User Accounts - admin เท่านั้น
  {
    path: '/users',
    label: 'จัดการ User Accounts',
    roles: ['admin'],
  },
  // 16. ประวัติการเข้าสู่ระบบ - admin เท่านั้น
  {
    path: '/login-activity',
    label: 'ประวัติการเข้าสู่ระบบ',
    roles: ['admin'],
  },
  // 17. รายงานข้อผิดพลาด - admin, audit, data_entry_and_service, service
  {
    path: '/error-reports',
    label: 'รายงานข้อผิดพลาด',
    roles: ['admin', 'audit', 'data_entry_and_service', 'service'],
  },
  // 18. Dashboard งานบัญชี - admin, audit, data_entry_and_service, service
  {
    path: '/accounting-dashboard',
    label: 'Dashboard งานบัญชี',
    roles: ['admin', 'audit', 'data_entry_and_service', 'service'],
  },
]

export const hasPermission = (userRole: UserRole, path: string): boolean => {
  const route = routePermissions.find((r) => r.path === path)
  if (!route) return false
  return route.roles.includes(userRole)
}

export const getAccessibleRoutes = (userRole: UserRole): RoutePermission[] => {
  return routePermissions.filter((route) => route.roles.includes(userRole))
}
