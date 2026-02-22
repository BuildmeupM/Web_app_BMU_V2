/**
 * DataEntryTab — Tab content for Data Entry (คีย์เอกสาร) view
 * แสดงสรุปข้อมูลจาก document_entry_work เท่านั้น
 */

import type { DocumentEntryWork } from '../../services/documentEntryWorkService'
import DocumentEntrySection from './DocumentEntrySection'

export default function DataEntryTab({
    entryData = [],
    employeeNameMap = new Map(),
}: {
    data?: unknown
    entryData?: DocumentEntryWork[]
    employeeNameMap?: Map<string, string>
}) {
    return <DocumentEntrySection data={entryData} employeeNameMap={employeeNameMap} />
}
