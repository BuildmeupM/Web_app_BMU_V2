/**
 * HR Work Page — งานฝ่ายบุคคล
 * Thin wrapper ที่ใช้ shared component RegistrationDeptWork
 */

import RegistrationDeptWork, { type DeptConfig } from '../components/Registration/RegistrationDeptWork'
import { TbUsers } from 'react-icons/tb'

const HR_CONFIG: DeptConfig = {
    department: 'hr',
    title: 'งานฝ่ายบุคคล HR',
    subtitle: 'จัดการงานฝ่ายบุคคล แรงงาน และงาน HR ทั้งหมด',
    icon: TbUsers,
    gradient: 'linear-gradient(135deg, #c62828 0%, #e53935 50%, #ef5350 100%)',
    tableHeaderColor: '#c62828',
}

export default function HRWork() {
    return <RegistrationDeptWork config={HR_CONFIG} />
}
