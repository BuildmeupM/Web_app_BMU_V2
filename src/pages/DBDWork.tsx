/**
 * DBD Work Page — กรมพัฒนาธุรกิจการค้า
 * Thin wrapper ที่ใช้ shared component RegistrationDeptWork
 */

import RegistrationDeptWork, { type DeptConfig } from '../components/Registration/RegistrationDeptWork'
import { TbBuildingBank } from 'react-icons/tb'

const DBD_CONFIG: DeptConfig = {
    department: 'dbd',
    title: 'กรมพัฒนาธุรกิจการค้า (DBD)',
    subtitle: 'จัดการงานจดทะเบียน แก้ไขเปลี่ยนแปลง และงาน DBD ทั้งหมด',
    icon: TbBuildingBank,
    gradient: 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 50%, #ab47bc 100%)',
    tableHeaderColor: '#6a1b9a',
}

export default function DBDWork() {
    return <RegistrationDeptWork config={DBD_CONFIG} />
}
