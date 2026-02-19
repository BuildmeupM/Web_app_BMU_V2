/**
 * Activity Log Utility
 * ฟังก์ชันสำหรับเก็บ log กิจกรรมเข้าตาราง activity_logs
 * เรียกใช้จาก route files หลังจาก INSERT/UPDATE สำเร็จ
 */

import pool from '../config/database.js'

/**
 * บันทึก activity log เข้าฐานข้อมูล
 * @param {Object} params
 * @param {number} params.userId - users.id ของคนที่ทำรายการ
 * @param {string} [params.employeeId] - employee_id ของคนที่ทำรายการ
 * @param {string} [params.userName] - ชื่อ + ชื่อเล่น ของคนที่ทำรายการ
 * @param {string} params.action - ประเภทกิจกรรม: 'status_update', 'form_submit', 'data_create', 'data_edit', 'data_delete'
 * @param {string} params.page - หน้าที่ทำรายการ: 'document_sorting', 'document_entry', 'tax_inspection', 'tax_filing_status', 'tax_filing', 'accounting_marketplace'
 * @param {string} params.entityType - ประเภท entity: 'monthly_tax_data', 'document_entry_work', 'accounting_marketplace'
 * @param {string} [params.entityId] - ID ของ record ที่ถูกแก้ไข
 * @param {string} [params.build] - Build Code ของบริษัท
 * @param {string} [params.companyName] - ชื่อบริษัท
 * @param {string} [params.description] - สรุปสิ่งที่ทำ
 * @param {string} [params.fieldChanged] - field ที่เปลี่ยน
 * @param {string} [params.oldValue] - ค่าเดิม
 * @param {string} [params.newValue] - ค่าใหม่
 * @param {Object} [params.metadata] - ข้อมูลเพิ่มเติม
 * @param {string} [params.ipAddress] - IP address
 */
export async function logActivity({
    userId,
    employeeId = null,
    userName = null,
    action,
    page,
    entityType,
    entityId = null,
    build = null,
    companyName = null,
    description = null,
    fieldChanged = null,
    oldValue = null,
    newValue = null,
    metadata = null,
    ipAddress = null,
}) {
    try {
        await pool.execute(
            `INSERT INTO activity_logs 
        (user_id, employee_id, user_name, action, page, entity_type, entity_id, 
         build, company_name, description, field_changed, old_value, new_value, 
         metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                employeeId,
                userName,
                action,
                page,
                entityType,
                entityId,
                build,
                companyName,
                description,
                fieldChanged,
                oldValue ? String(oldValue).substring(0, 500) : null,
                newValue ? String(newValue).substring(0, 500) : null,
                metadata ? JSON.stringify(metadata) : null,
                ipAddress,
            ]
        )
    } catch (error) {
        // Log error but don't throw — logging should never break the main operation
        console.error('⚠️ [Activity Log] Failed to write log:', {
            error: error.message,
            userId,
            action,
            page,
        })
    }
}

/**
 * บันทึก activity log หลายรายการพร้อมกัน (batch)
 * @param {Array<Object>} logs - array ของ params เหมือน logActivity
 */
export async function logActivities(logs) {
    if (!logs || logs.length === 0) return

    try {
        const values = logs.map(log => [
            log.userId,
            log.employeeId || null,
            log.userName || null,
            log.action,
            log.page,
            log.entityType,
            log.entityId || null,
            log.build || null,
            log.companyName || null,
            log.description || null,
            log.fieldChanged || null,
            log.oldValue ? String(log.oldValue).substring(0, 500) : null,
            log.newValue ? String(log.newValue).substring(0, 500) : null,
            log.metadata ? JSON.stringify(log.metadata) : null,
            log.ipAddress || null,
        ])

        const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const flatValues = values.flat()

        await pool.execute(
            `INSERT INTO activity_logs 
        (user_id, employee_id, user_name, action, page, entity_type, entity_id, 
         build, company_name, description, field_changed, old_value, new_value, 
         metadata, ip_address)
       VALUES ${placeholders}`,
            flatValues
        )
    } catch (error) {
        console.error('⚠️ [Activity Log] Failed to write batch logs:', {
            error: error.message,
            count: logs.length,
        })
    }
}
