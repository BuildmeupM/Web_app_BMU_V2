/**
 * Header Action Buttons Component
 * ปุ่ม "เริ่มต้นทั้งหมด" และ "เสร็จสิ้นทั้งหมด" สำหรับหัว Accordion
 */

import { useState } from 'react'
import { Button, Group } from '@mantine/core'
import { useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbBolt, TbCheck } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWork } from '../../services/documentEntryWorkService'

interface HeaderActionButtonsProps {
    entry: DocumentEntryWork
    disabled?: boolean
}

export default function HeaderActionButtons({ entry, disabled = false }: HeaderActionButtonsProps) {
    const queryClient = useQueryClient()
    const [isStartLoading, setIsStartLoading] = useState(false)
    const [isCompleteLoading, setIsCompleteLoading] = useState(false)

    // Check which document types need to be started (มีเอกสาร และยังไม่เริ่ม)
    const pendingStartTypes: Array<'wht' | 'vat' | 'non_vat'> = []
    if (
        entry.wht_document_count > 0 &&
        (entry.wht_entry_status === null || entry.wht_entry_status === 'ยังไม่ดำเนินการ')
    ) {
        pendingStartTypes.push('wht')
    }
    if (
        entry.vat_document_count > 0 &&
        (entry.vat_entry_status === null || entry.vat_entry_status === 'ยังไม่ดำเนินการ')
    ) {
        pendingStartTypes.push('vat')
    }
    if (
        entry.non_vat_document_count > 0 &&
        (entry.non_vat_entry_status === null || entry.non_vat_entry_status === 'ยังไม่ดำเนินการ')
    ) {
        pendingStartTypes.push('non_vat')
    }

    // Check which document types need to be completed (มีเอกสาร และกำลังดำเนินการ)
    const pendingCompleteTypes: Array<'wht' | 'vat' | 'non_vat'> = []
    if (
        entry.wht_document_count > 0 &&
        entry.wht_entry_status === 'กำลังดำเนินการ'
    ) {
        pendingCompleteTypes.push('wht')
    }
    if (
        entry.vat_document_count > 0 &&
        entry.vat_entry_status === 'กำลังดำเนินการ'
    ) {
        pendingCompleteTypes.push('vat')
    }
    if (
        entry.non_vat_document_count > 0 &&
        entry.non_vat_entry_status === 'กำลังดำเนินการ'
    ) {
        pendingCompleteTypes.push('non_vat')
    }

    const handleStartAll = async (e: React.MouseEvent) => {
        e.stopPropagation() // ป้องกันไม่ให้ Accordion เปิด/ปิด

        if (pendingStartTypes.length === 0) {
            return
        }

        setIsStartLoading(true)
        try {
            const promises = pendingStartTypes.map((docType) =>
                documentEntryWorkService.updateStatus(entry.id, {
                    document_type: docType,
                    status: 'กำลังดำเนินการ',
                })
            )
            await Promise.all(promises)

            notifications.show({
                title: 'สำเร็จ',
                message: `เริ่มต้น ${pendingStartTypes.length} ประเภทเอกสารสำเร็จ`,
                color: 'green',
                icon: <TbCheck size={16} />,
            })

            queryClient.invalidateQueries(['document-entry-work'])
            await queryClient.refetchQueries(['document-entry-work'])
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถเริ่มต้นได้',
                color: 'red',
            })
        } finally {
            setIsStartLoading(false)
        }
    }

    const handleCompleteAll = async (e: React.MouseEvent) => {
        e.stopPropagation() // ป้องกันไม่ให้ Accordion เปิด/ปิด

        if (pendingCompleteTypes.length === 0) {
            return
        }

        setIsCompleteLoading(true)
        try {
            const promises = pendingCompleteTypes.map((docType) =>
                documentEntryWorkService.updateStatus(entry.id, {
                    document_type: docType,
                    status: 'ดำเนินการเสร็จแล้ว',
                })
            )
            await Promise.all(promises)

            notifications.show({
                title: 'สำเร็จ',
                message: `เสร็จสิ้น ${pendingCompleteTypes.length} ประเภทเอกสารสำเร็จ`,
                color: 'green',
                icon: <TbCheck size={16} />,
            })

            queryClient.invalidateQueries(['document-entry-work'])
            await queryClient.refetchQueries(['document-entry-work'])
        } catch (error: any) {
            notifications.show({
                title: 'เกิดข้อผิดพลาด',
                message: error?.response?.data?.message || 'ไม่สามารถเสร็จสิ้นได้',
                color: 'red',
            })
        } finally {
            setIsCompleteLoading(false)
        }
    }

    // ถ้าไม่มีปุ่มให้แสดง return null
    if (pendingStartTypes.length === 0 && pendingCompleteTypes.length === 0) {
        return null
    }

    return (
        <Group gap="xs" onClick={(e) => e.stopPropagation()}>
            {/* ปุ่มเริ่มต้นทั้งหมด */}
            {pendingStartTypes.length > 0 && (
                <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<TbBolt size={14} />}
                    onClick={handleStartAll}
                    disabled={disabled || isStartLoading}
                    loading={isStartLoading}
                >
                    เริ่มต้นทั้งหมด
                </Button>
            )}

            {/* ปุ่มเสร็จสิ้นทั้งหมด */}
            {pendingCompleteTypes.length > 0 && (
                <Button
                    size="xs"
                    variant="outline"
                    color="green"
                    leftSection={<TbCheck size={14} />}
                    onClick={handleCompleteAll}
                    disabled={disabled || isCompleteLoading}
                    loading={isCompleteLoading}
                    style={{
                        borderColor: '#51cf66',
                        color: '#51cf66',
                    }}
                >
                    เสร็จสิ้นทั้งหมด
                </Button>
            )}
        </Group>
    )
}
