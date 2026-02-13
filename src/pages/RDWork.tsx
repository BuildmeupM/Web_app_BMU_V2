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
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%)',
    tableHeaderColor: '#2e7d32',
}

export default function RDWork() {
    return <RegistrationDeptWork config={RD_CONFIG} />
}
