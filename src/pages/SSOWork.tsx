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
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%)',
    tableHeaderColor: '#2e7d32',
}

export default function SSOWork() {
    return <RegistrationDeptWork config={SSO_CONFIG} />
}
