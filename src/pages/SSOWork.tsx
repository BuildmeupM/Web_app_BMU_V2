/**
 * SSO Work Page — ประกันสังคม
 * Thin wrapper ที่ใช้ shared component RegistrationDeptWork
 */

import RegistrationDeptWork, { type DeptConfig } from '../components/Registration/RegistrationDeptWork'
import { TbShieldCheck } from 'react-icons/tb'

const SSO_CONFIG: DeptConfig = {
    department: 'sso',
    title: 'ประกันสังคม (SSO)',
    subtitle: 'จัดการงานประกันสังคม ขึ้นทะเบียน แจ้งเข้า-ออก และงาน สปส. ทั้งหมด',
    icon: TbShieldCheck,
    gradient: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
    tableHeaderColor: '#1565c0',
}

export default function SSOWork() {
    return <RegistrationDeptWork config={SSO_CONFIG} />
}
