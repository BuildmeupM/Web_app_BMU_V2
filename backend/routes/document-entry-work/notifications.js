/**
 * Document Entry Work - Notification Helpers
 * แยกมาจาก document-entry-work.js
 * - createAccountingNotificationForDocumentEntry
 * - createReturnCommentNotification
 * - createDocumentEntryNotification
 */

import pool from '../../config/database.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

/**
 * Helper function: สร้าง notification สำหรับ accounting_responsible เมื่อสถานะการคีย์เอกสารเปลี่ยน
 * @param {string} accountingResponsibleEmployeeId - Employee ID ของ accounting_responsible
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} submissionCount - ครั้งที่ส่งงาน
 * @param {string} documentEntryWorkId - ID ของ document_entry_work
 * @param {number} workYear - Work year
 * @param {number} workMonth - Work month
 * @param {string} documentType - 'wht', 'vat', หรือ 'non_vat'
 * @param {string} status - 'กำลังดำเนินการ' หรือ 'ดำเนินการเสร็จแล้ว'
 * @returns {Promise<string|null>} Notification ID หรือ null
 */
async function createAccountingNotificationForDocumentEntry(
  accountingResponsibleEmployeeId,
  build,
  companyName,
  submissionCount,
  documentEntryWorkId,
  workYear,
  workMonth,
  documentType,
  status
) {
  if (!accountingResponsibleEmployeeId) {
    console.log('⚠️ No accounting_responsible - Notification will not be created')
    return null
  }

  try {
    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL LIMIT 1',
      [accountingResponsibleEmployeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${accountingResponsibleEmployeeId} - Notification will not be created`)
      return null
    }

    const userId = users[0].id

    // Map document type to Thai label
    const documentTypeLabels = {
      wht: 'เอกสารหัก ณ ที่จ่าย',
      vat: 'เอกสารมีภาษีมูลค่าเพิ่ม',
      non_vat: 'เอกสารไม่มีภาษีมูลค่าเพิ่ม',
    }
    const documentTypeLabel = documentTypeLabels[documentType] || documentType

    // Map status to notification message
    const statusMessages = {
      'กำลังดำเนินการ': `กำลังดำเนินการคีย์${documentTypeLabel}`,
      'ดำเนินการเสร็จแล้ว': `ดำเนินการคีย์${documentTypeLabel}เสร็จแล้ว`,
    }
    const message = statusMessages[status] || status

    const notificationId = generateUUID()

    // Map status to notification type
    const notificationType = status === 'ดำเนินการเสร็จแล้ว' ? 'document_entry_completed' : 'document_entry_pending'

    // Insert notification
    await pool.execute(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message, 
        icon, color, action_url, action_label,
        related_user_id, related_entity_type, related_entity_id, metadata, is_read, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        notificationId,
        userId,
        notificationType,
        'document',
        'medium',
        status === 'ดำเนินการเสร็จแล้ว' ? 'คีย์เอกสารเสร็จแล้ว' : 'กำลังคีย์เอกสาร',
        `${companyName} (ครั้งที่ ${submissionCount}): ${message}`,
        'TbFileText',
        status === 'ดำเนินการเสร็จแล้ว' ? 'green' : 'yellow',
        `/document-entry?build=${build}&year=${workYear}&month=${workMonth}`,
        'ดูรายละเอียด',
        userId,
        'document_entry_work',
        documentEntryWorkId,
        JSON.stringify({
          build,
          company_name: companyName,
          submission_count: submissionCount,
          document_type: documentType,
          document_type_label: documentTypeLabel,
          status,
          work_year: workYear,
          work_month: workMonth,
        }),
      ]
    )

    console.log(`✅ Created notification for accounting_responsible: ${accountingResponsibleEmployeeId}, status: ${status}`)
    return notificationId
  } catch (error) {
    console.error('Error creating accounting notification for document entry:', error)
    return null
  }
}

/**
 * Helper function: สร้าง notification สำหรับ accounting_responsible เมื่อ return_comment ถูกอัพเดต
 * @param {string} accountingResponsibleEmployeeId - Employee ID ของ accounting_responsible
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} submissionCount - ครั้งที่ส่งงาน
 * @param {string} documentEntryWorkId - ID ของ document_entry_work
 * @param {number} workYear - Work year
 * @param {number} workMonth - Work month
 * @param {string} returnComment - ข้อความความคิดเห็นส่งคืนงานคีย์
 * @returns {Promise<string|null>} Notification ID หรือ null
 */
async function createReturnCommentNotification(
  accountingResponsibleEmployeeId,
  build,
  companyName,
  submissionCount,
  documentEntryWorkId,
  workYear,
  workMonth,
  returnComment
) {
  if (!accountingResponsibleEmployeeId) {
    console.log('⚠️ No accounting_responsible - Return comment notification will not be created')
    return null
  }

  try {
    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL LIMIT 1',
      [accountingResponsibleEmployeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${accountingResponsibleEmployeeId} - Return comment notification will not be created`)
      return null
    }

    const userId = users[0].id

    const notificationId = generateUUID()
    const commentPreview = returnComment && returnComment.length > 100
      ? returnComment.substring(0, 100) + '...'
      : returnComment || 'ไม่มีข้อความ'

    // Insert notification
    await pool.execute(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message, 
        icon, color, action_url, action_label,
        related_user_id, related_entity_type, related_entity_id, metadata, is_read, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        notificationId,
        userId,
        'document_entry_pending',
        'document',
        'medium',
        'มีการอัพเดตความคิดเห็นส่งคืนงานคีย์',
        `${companyName} (ครั้งที่ ${submissionCount}): มีการอัพเดตความคิดเห็นส่งคืนงานคีย์\n"${commentPreview}"`,
        'TbFileText',
        'orange',
        `/document-entry?build=${build}&year=${workYear}&month=${workMonth}`,
        'ดูรายละเอียด',
        userId,
        'document_entry_work',
        documentEntryWorkId,
        JSON.stringify({
          build,
          company_name: companyName,
          submission_count: submissionCount,
          return_comment: returnComment,
          work_year: workYear,
          work_month: workMonth,
        }),
      ]
    )

    console.log(`✅ Created return comment notification for accounting_responsible: ${accountingResponsibleEmployeeId}`)
    return notificationId
  } catch (error) {
    console.error('Error creating return comment notification:', error)
    return null
  }
}

/**
 * Helper function: สร้าง notification สำหรับ document_entry_responsible
 * @param {string} documentEntryResponsibleEmployeeId - Employee ID ของ document_entry_responsible
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} submissionCount - ครั้งที่ส่งงาน
 * @param {string} documentEntryWorkId - ID ของ document_entry_work
 * @param {number} workYear - Work year
 * @param {number} workMonth - Work month
 * @returns {Promise<string|null>} Notification ID หรือ null
 */
async function createDocumentEntryNotification(
  documentEntryResponsibleEmployeeId,
  build,
  companyName,
  submissionCount,
  documentEntryWorkId,
  workYear,
  workMonth
) {
  if (!documentEntryResponsibleEmployeeId) {
    console.log('⚠️ No document_entry_responsible - Notification will not be created')
    return null
  }

  try {
    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
      [documentEntryResponsibleEmployeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${documentEntryResponsibleEmployeeId} - Notification will not be created`)
      return null
    }

    const userId = users[0].id

    const notificationId = generateUUID()
    const title = `มีการส่งข้อมูลการคัดแยกเอกสาร`
    const message = `บริษัท ${companyName} (${build}) - เดือน ${workMonth}/${workYear}\nครั้งที่ ${submissionCount}`

    // Set expires_at to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    // Insert notification
    // related_user_id = user_id ของพนักงานที่รับผิดชอบในการคีย์ (document_entry_responsible)
    await pool.execute(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message, 
        icon, color, action_url, action_label,
        related_user_id, related_entity_type, related_entity_id, metadata, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        userId,
        'document_entry_pending',
        'document',
        'medium',
        title,
        message,
        'TbFileText',
        'blue',
        `/document-entry?build=${build}&year=${workYear}&month=${workMonth}`,
        'ดูรายละเอียด',
        userId, // related_user_id = user_id ของพนักงานที่รับผิดชอบในการคีย์
        'document_entry_work',
        documentEntryWorkId,
        JSON.stringify({
          build,
          company_name: companyName,
          work_year: workYear,
          work_month: workMonth,
          submission_count: submissionCount,
        }),
        expiresAt,
      ]
    )

    console.log(`✅ Created notification for document_entry_responsible: ${documentEntryResponsibleEmployeeId}`)
    return notificationId
  } catch (error) {
    console.error('Error creating document entry notification:', error)
    return null
  }
}

export {
  createAccountingNotificationForDocumentEntry,
  createReturnCommentNotification,
  createDocumentEntryNotification,
}
