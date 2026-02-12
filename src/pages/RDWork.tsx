/**
 * RD Work Page — กรมสรรพากร
 * Thin wrapper ที่ใช้ shared component RegistrationDeptWork
 */

import RegistrationDeptWork, { type DeptConfig } from '../components/Registration/RegistrationDeptWork'
import { TbReceiptTax } from 'react-icons/tb'

const RD_CONFIG: DeptConfig = {
    department: 'rd',
    title: 'กรมสรรพากร (RD)',
    subtitle: 'จัดการงานภาษี ยื่นแบบ และงานกรมสรรพากรทั้งหมด',
    icon: TbReceiptTax,
    gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ffb74d 100%)',
    tableHeaderColor: '#e65100',
}

export default function RDWork() {
    return <RegistrationDeptWork config={RD_CONFIG} />
}
