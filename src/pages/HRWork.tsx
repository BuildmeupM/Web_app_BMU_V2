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
    gradient: 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 50%, #ab47bc 100%)',
    tableHeaderColor: '#6a1b9a',
}

export default function HRWork() {
    return <RegistrationDeptWork config={HR_CONFIG} />
}
