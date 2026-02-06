import { UserRole } from '../store/authStore'

export interface RoutePermission {
  path: string
  label: string
  roles: UserRole[]
}

export const routePermissions: RoutePermission[] = [
  // 1. แดชบอร์ด - ทุกคน
  {
    path: '/dashboard',
    label: 'แดชบอร์ด',
    roles: ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 2. ข้อมูลพนักงาน - ทุกคน
  {
    path: '/employees',
    label: 'ข้อมูลพนักงาน',
    roles: ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 3. ลางาน/WFH - ทุกคน
  {
    path: '/leave',
    label: 'ลางาน/WFH',
    roles: ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 4. จัดการวันหยุด - admin, HR
  {
    path: '/holidays',
    label: 'จัดการวันหยุด',
    roles: ['admin', 'hr'],
  },
  // 5. ขอเบิกเงินเดือน - admin เท่านั้น
  {
    path: '/salary-advance',
    label: 'ขอเบิกเงินเดือน',
    roles: ['admin'],
  },
  // 6. ข้อมูลเข้าออฟฟิศ - ทุกคน
  {
    path: '/attendance',
    label: 'ข้อมูลเข้าออฟฟิศ',
    roles: ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 7. ข้อมูลลูกค้า - admin, audit
  {
    path: '/clients',
    label: 'ข้อมูลลูกค้า',
    roles: ['admin', 'audit'],
  },
  // 8. จัดงานรายเดือน - admin, audit
  {
    path: '/work-assignment',
    label: 'จัดงานรายเดือน',
    roles: ['admin', 'audit'],
  },
  // 9. คัดแยกเอกสาร - ปรับตามเดิม
  {
    path: '/document-sorting',
    label: 'คัดแยกเอกสาร',
    roles: ['admin', 'service'],
  },
  // 10. คีย์เอกสาร - ปรับตามเดิม
  {
    path: '/document-entry',
    label: 'คีย์เอกสาร',
    roles: ['admin', 'data_entry', 'data_entry_and_service'],
  },
  // 11. ตรวจภาษี - ปรับตามเดิม
  {
    path: '/tax-inspection',
    label: 'ตรวจภาษี',
    roles: ['admin', 'audit'],
  },
  // 12. สถานะยื่นภาษี - ปรับตามเดิม
  {
    path: '/tax-status',
    label: 'สถานะยื่นภาษี',
    roles: ['admin', 'data_entry_and_service', 'service'],
  },
  // 13. ยื่นภาษี - ปรับตามเดิม
  {
    path: '/tax-filing',
    label: 'ยื่นภาษี',
    roles: ['admin', 'data_entry_and_service'],
  },
  // 14. ตลาดกลางผู้ทำบัญชี - ทุกคน
  {
    path: '/accounting-marketplace',
    label: 'ตลาดกลางผู้ทำบัญชี',
    roles: ['admin', 'data_entry', 'data_entry_and_service', 'audit', 'service', 'hr'],
  },
  // 15. จัดการ User Accounts - admin เท่านั้น
  {
    path: '/users',
    label: 'จัดการ User Accounts',
    roles: ['admin'],
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
