/**
 * Monthly Tax Data - Notification Functions
 * ฟังก์ชันจัดการ notifications สำหรับระบบภาษีรายเดือน
 *
 * แยกมาจาก monthly-tax-data.js เพื่อลดขนาดไฟล์
 * - createTaxInspectionCompletedNotification: แจ้งเมื่อผู้ตรวจตรวจเสร็จ
 * - createTaxReviewNotification: แจ้งเมื่อส่งรอตรวจ
 * - createSentToCustomerNotification: แจ้งเมื่อส่งลูกค้าแล้ว
 * - markTaxReviewNotificationsAsRead: อ่าน notification แล้ว
 */

import pool from '../../config/database.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

// =============================================
// Tax Inspection Completed Notification
// =============================================

/**
 * สร้าง notification เมื่อผู้ตรวจบันทึกข้อมูลแล้ว
 * @param {string} employeeId - Employee ID ของผู้รับผิดชอบทำบัญชี (accounting_responsible)
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} taxYear - Tax year
 * @param {number} taxMonth - Tax month
 * @param {string} monthlyTaxDataId - Monthly tax data ID
 * @param {string} pndStatus - สถานะ ภงด. ปัจจุบัน
 * @param {string} inspectorName - ชื่อผู้ตรวจ
 * @param {string} comment - คอมเมนต์บางส่วน (เช่น wht_response หรือ wht_submission_comment)
 * @param {string} relatedUserId - User ID ของผู้ตรวจ
 */
export async function createTaxInspectionCompletedNotification(
  employeeId,
  build,
  companyName,
  taxYear,
  taxMonth,
  monthlyTaxDataId,
  pndStatus,
  inspectorName,
  comment,
  relatedUserId
) {
  if (!employeeId) return null

  try {
    console.log(`🔍 Creating tax inspection completed notification for employee_id: ${employeeId}`)

    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
      [employeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${employeeId} - Notification will not be created`)
      return null
    }

    const userId = users[0].id
    console.log(`✅ Found user_id: ${userId} for employee_id: ${employeeId}`)
    console.log(`📧 Tax inspection completed notification will be sent to user_id: ${userId} (employee_id: ${employeeId})`)

    // แปลงสถานะเป็นข้อความภาษาไทย
    const statusLabels = {
      'edit': 'แก้ไข',
      'passed': 'ผ่าน',
      'paid': 'ชำระแล้ว',
      'receipt': 'รับใบเสร็จ',
      'inquiry': 'สอบถามลูกค้าเพิ่มเติม',
      'review': 'ตรวจสอบเพิ่มเติม',
      'needs_correction': 'แก้ไข',
      'pending_review': 'รอตรวจ',
      'pending_recheck': 'รอตรวจอีกครั้ง',
      'not_submitted': 'ไม่มียื่น',
    }
    const statusLabel = statusLabels[pndStatus] || pndStatus || 'ไม่ระบุ'

    // ตัดคอมเมนต์ให้เหลือ 100 ตัวอักษร
    const commentPreview = comment && comment.length > 100
      ? comment.substring(0, 100) + '...'
      : comment || ''

    const title = `ผู้ตรวจได้ตรวจสอบข้อมูลแล้ว`
    const message = `บริษัท ${companyName} (${build}) - ภ.ง.ด. เดือน ${taxMonth}/${taxYear}\nสถานะ: ${statusLabel}\nผู้ตรวจ: ${inspectorName}${commentPreview ? `\nคอมเมนต์: ${commentPreview}` : ''}`

    // Set expires_at to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    // Check if notification already exists (not read and not expired)
    const [existingNotifications] = await pool.execute(
      `SELECT id FROM notifications 
      WHERE user_id = ? 
        AND type = 'tax_inspection_completed'
        AND related_entity_type = 'monthly_tax_data' 
        AND related_entity_id = ? 
        AND is_read = FALSE 
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, monthlyTaxDataId]
    )

    // ถ้ามี notification ที่ยังไม่อ่านอยู่แล้ว → อัพเดทข้อมูลใหม่
    if (existingNotifications.length > 0) {
      const existingNotificationId = existingNotifications[0].id
      console.log(`🔄 Updating existing notification (not read): ${existingNotificationId}`)

      try {
        await pool.execute(
          `UPDATE notifications SET
            title = ?,
            message = ?,
            action_url = ?,
            related_user_id = ?,
            metadata = ?,
            expires_at = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            title,                    // 1. title
            message,                  // 2. message
            `/tax-status?build=${build}&year=${taxYear}&month=${taxMonth}`, // 3. action_url
            relatedUserId || null,    // 4. related_user_id
            JSON.stringify({          // 5. metadata
              build,
              company_name: companyName,
              tax_year: taxYear,
              tax_month: taxMonth,
              pnd_status: pndStatus,
              inspector_name: inspectorName,
              comment_preview: commentPreview,
            }),
            expiresAt,                // 6. expires_at
            existingNotificationId,   // 7. id (WHERE clause)
          ]
        )

        console.log(`✅ Updated tax inspection completed notification: ${existingNotificationId} for user_id: ${userId}, employee_id: ${employeeId}`)
        return existingNotificationId
      } catch (updateError) {
        console.error('❌ Error updating tax inspection completed notification:', updateError)
        throw updateError
      }
    }

    // ถ้าไม่มี notification ที่ยังไม่อ่าน → สร้างใหม่
    console.log(`✅ No existing unread notification found, creating new one`)

    const notificationId = generateUUID()

    console.log(`📝 Inserting notification:`, {
      notificationId,
      userId,
      title,
      message,
      expiresAt,
    })

    try {
      await pool.execute(
        `INSERT INTO notifications (
          id, user_id, type, category, priority, title, message, icon, color,
          action_url, action_label, related_user_id, related_entity_type,
          related_entity_id, metadata, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,          // 1. id
          userId,                   // 2. user_id
          'tax_inspection_completed', // 3. type
          'tax',                    // 4. category
          'high',                   // 5. priority
          title,                    // 6. title
          message,                  // 7. message
          'TbCheck',               // 8. icon
          'green',                  // 9. color
          `/tax-status?build=${build}&year=${taxYear}&month=${taxMonth}`, // 10. action_url
          'ดูรายละเอียด',           // 11. action_label
          relatedUserId || null,    // 12. related_user_id
          'monthly_tax_data',       // 13. related_entity_type
          monthlyTaxDataId,         // 14. related_entity_id
          JSON.stringify({          // 15. metadata
            build,
            company_name: companyName,
            tax_year: taxYear,
            tax_month: taxMonth,
            pnd_status: pndStatus,
            inspector_name: inspectorName,
            comment_preview: commentPreview,
          }),
          expiresAt,                // 16. expires_at
        ]
      )

      console.log(`✅ Created tax inspection completed notification: ${notificationId} for user_id: ${userId}, employee_id: ${employeeId}`)
      return notificationId
    } catch (insertError) {
      // Check if error is due to invalid ENUM value (migration not run)
      if (insertError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || insertError.code === 'WARN_DATA_TRUNCATED') {
        console.error(`❌ Invalid notification type 'tax_inspection_completed'. Please run migration 024_add_tax_inspection_completed_notification_type.sql`)
        console.error('Migration file:', 'Documentation/Database/migrations/024_add_tax_inspection_completed_notification_type.sql')
      }
      throw insertError
    }
  } catch (error) {
    console.error('❌ Error creating tax inspection completed notification:', error)
    return null
  }
}

// =============================================
// Tax Review Pending Notification
// =============================================

/**
 * สร้าง notification เมื่อส่งรอตรวจ
 * @param {string} employeeId - Employee ID ของผู้รับผิดชอบตรวจ
 * @param {string} notificationType - 'tax_review_pending' หรือ 'tax_review_pending_recheck'
 * @param {string} taxType - 'pnd' หรือ 'pp30'
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} taxYear - Tax year
 * @param {number} taxMonth - Tax month
 * @param {string} monthlyTaxDataId - Monthly tax data ID
 * @param {string} relatedUserId - User ID ของผู้ที่ส่งรอตรวจ
 */
export async function createTaxReviewNotification(
  employeeId,
  notificationType,
  taxType,
  build,
  companyName,
  taxYear,
  taxMonth,
  monthlyTaxDataId,
  relatedUserId
) {
  if (!employeeId) return null

  try {
    console.log(`🔍 Creating notification for employee_id: ${employeeId}, type: ${notificationType}`)

    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
      [employeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${employeeId} - Notification will not be created`)
      console.log(`   Please check if employee ${employeeId} has a user account in the users table`)
      return null
    }

    const userId = users[0].id
    console.log(`✅ Found user_id: ${userId} for employee_id: ${employeeId}`)

    // Check if notification already exists (not read and not expired)
    // ตรวจสอบเฉพาะ notification ที่ยังไม่อ่านและยังไม่หมดอายุ
    const [existingNotifications] = await pool.execute(
      `SELECT id FROM notifications 
      WHERE user_id = ? 
        AND type = ? 
        AND related_entity_type = 'monthly_tax_data' 
        AND related_entity_id = ? 
        AND is_read = FALSE 
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, notificationType, monthlyTaxDataId]
    )

    // ถ้ามี notification ที่ยังไม่อ่านอยู่แล้ว ไม่ต้องสร้างใหม่
    if (existingNotifications.length > 0) {
      console.log(`ℹ️ Notification already exists (not read): ${existingNotifications[0].id}`)
      return null
    }

    console.log(`✅ No existing unread notification found, creating new one`)

    const notificationId = generateUUID()
    const taxTypeLabel = taxType === 'pnd' ? 'ภ.ง.ด.' : 'ภ.พ. 30'
    const statusLabel = notificationType === 'tax_review_pending' ? 'รอตรวจ' : 'รอตรวจอีกครั้ง'
    const title = `มีข้อมูล${taxTypeLabel} ส่งรอตรวจ`
    const message = `บริษัท ${companyName} (${build}) - ${taxTypeLabel} เดือน ${taxMonth}/${taxYear} สถานะ: ${statusLabel}`

    // Set expires_at to 12 hours after creation (will be updated when read)
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    console.log(`📝 Inserting notification:`, {
      notificationId,
      userId,
      notificationType,
      title,
      message,
      expiresAt,
    })

    try {
      await pool.execute(
        `INSERT INTO notifications (
          id, user_id, type, category, priority, title, message, icon, color,
          action_url, action_label, related_user_id, related_entity_type,
          related_entity_id, metadata, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,          // 1. id
          userId,                   // 2. user_id
          notificationType,         // 3. type
          'tax',                    // 4. category
          'high',                   // 5. priority
          title,                    // 6. title
          message,                  // 7. message
          'TbAlertCircle',          // 8. icon
          'orange',                 // 9. color
          `/tax-inspection?build=${build}&year=${taxYear}&month=${taxMonth}`, // 10. action_url
          'ดูรายละเอียด',           // 11. action_label
          relatedUserId || null,    // 12. related_user_id
          'monthly_tax_data',       // 13. related_entity_type
          monthlyTaxDataId,         // 14. related_entity_id
          JSON.stringify({          // 15. metadata
            build,
            company_name: companyName,
            tax_type: taxType,
            tax_year: taxYear,
            tax_month: taxMonth,
          }),
          expiresAt,                // 16. expires_at
        ]
      )

      console.log(`✅ Created notification: ${notificationId} for user_id: ${userId}, employee_id: ${employeeId}, type: ${notificationType}`)
      return notificationId
    } catch (insertError) {
      // Check if error is due to invalid ENUM value (migration not run)
      if (insertError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || insertError.code === 'WARN_DATA_TRUNCATED') {
        console.error(`❌ Invalid notification type '${notificationType}'. Please run migration 022_add_tax_review_notification_types.sql`)
        console.error('Migration file:', 'Documentation/Database/migrations/022_add_tax_review_notification_types.sql')
      }
      throw insertError // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('❌ Error creating tax review notification:', error)
    console.error('Error details:', {
      employeeId,
      notificationType,
      taxType,
      build,
      companyName,
      taxYear,
      taxMonth,
      monthlyTaxDataId,
      errorMessage: error.message,
      errorCode: error.code,
      errorSqlState: error.sqlState,
    })
    return null
  }
}

// =============================================
// Sent To Customer Notification
// =============================================

/**
 * สร้าง notification เมื่อสถานะเปลี่ยนเป็น "ส่งลูกค้าแล้ว" (sent_to_customer)
 * @param {string} employeeId - Employee ID ของผู้ทำบัญชี (accounting_responsible)
 * @param {string} taxType - 'pnd' หรือ 'pp30'
 * @param {string} build - Build code
 * @param {string} companyName - Company name
 * @param {number} taxYear - Tax year
 * @param {number} taxMonth - Tax month
 * @param {string} monthlyTaxDataId - Monthly tax data ID
 * @param {string} relatedUserId - User ID ของผู้ที่เปลี่ยนสถานะ
 */
export async function createSentToCustomerNotification(
  employeeId,
  taxType,
  build,
  companyName,
  taxYear,
  taxMonth,
  monthlyTaxDataId,
  relatedUserId
) {
  if (!employeeId) return null

  try {
    console.log(`🔍 Creating sent_to_customer notification for employee_id: ${employeeId}, taxType: ${taxType}`)

    // Get user_id from employee_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE employee_id = ? AND deleted_at IS NULL',
      [employeeId]
    )

    if (users.length === 0) {
      console.log(`⚠️ No user found for employee_id: ${employeeId} - Notification will not be created`)
      return null
    }

    const userId = users[0].id
    console.log(`✅ Found user_id: ${userId} for employee_id: ${employeeId}`)

    // Check if notification already exists (not read and not expired)
    const notificationType = 'tax_data_updated' // Using existing notification type for sent_to_customer
    const [existingNotifications] = await pool.execute(
      `SELECT id FROM notifications 
      WHERE user_id = ? 
        AND type = ? 
        AND related_entity_type = 'monthly_tax_data' 
        AND related_entity_id = ? 
        AND is_read = FALSE 
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, notificationType, monthlyTaxDataId]
    )

    // ถ้ามี notification ที่ยังไม่อ่านอยู่แล้ว ไม่ต้องสร้างใหม่
    if (existingNotifications.length > 0) {
      console.log(`ℹ️ Sent to customer notification already exists (not read): ${existingNotifications[0].id}`)
      return null
    }

    console.log(`✅ No existing unread notification found, creating new one`)

    const notificationId = generateUUID()
    const taxTypeLabel = taxType === 'pnd' ? 'ภ.ง.ด.' : 'ภ.พ. 30'
    const title = `${taxTypeLabel} ส่งลูกค้าแล้ว`
    const message = `บริษัท ${companyName} (${build}) - ${taxTypeLabel} เดือน ${taxMonth}/${taxYear} สถานะ: ส่งลูกค้าแล้ว`

    // Set expires_at to 24 hours after creation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    console.log(`📝 Inserting sent_to_customer notification:`, {
      notificationId,
      userId,
      notificationType,
      title,
      message,
      expiresAt,
    })

    try {
      await pool.execute(
        `INSERT INTO notifications (
          id, user_id, type, category, priority, title, message, icon, color,
          action_url, action_label, related_user_id, related_entity_type,
          related_entity_id, metadata, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,          // 1. id
          userId,                   // 2. user_id
          notificationType,         // 3. type
          'tax',                    // 4. category
          'medium',                 // 5. priority
          title,                    // 6. title
          message,                  // 7. message
          'TbFileCheck',            // 8. icon
          'green',                  // 9. color
          `/tax-filing?build=${build}&year=${taxYear}&month=${taxMonth}`, // 10. action_url
          'ดูรายละเอียด',           // 11. action_label
          relatedUserId || null,    // 12. related_user_id
          'monthly_tax_data',       // 13. related_entity_type
          monthlyTaxDataId,         // 14. related_entity_id
          JSON.stringify({          // 15. metadata
            build,
            company_name: companyName,
            tax_type: taxType,
            tax_year: taxYear,
            tax_month: taxMonth,
            status: 'sent_to_customer',
          }),
          expiresAt,                // 16. expires_at
        ]
      )

      console.log(`✅ Created sent_to_customer notification: ${notificationId} for user_id: ${userId}, employee_id: ${employeeId}`)
      return notificationId
    } catch (insertError) {
      console.error(`❌ Error inserting sent_to_customer notification:`, insertError)
      throw insertError
    }
  } catch (error) {
    console.error('❌ Error creating sent_to_customer notification:', error)
    console.error('Error details:', {
      employeeId,
      taxType,
      build,
      companyName,
      taxYear,
      taxMonth,
      monthlyTaxDataId,
      errorMessage: error.message,
      errorCode: error.code,
    })
    return null
  }
}

// =============================================
// Mark Notifications As Read
// =============================================

/**
 * Mark notification as read when user views tax data
 * @param {string} monthlyTaxDataId - Monthly tax data ID
 * @param {string} userId - User ID ของผู้ที่เปิดดูข้อมูล
 */
export async function markTaxReviewNotificationsAsRead(monthlyTaxDataId, userId) {
  try {
    // Update notifications to read and set expires_at to 12 hours from now
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

    await pool.execute(
      `UPDATE notifications 
      SET is_read = TRUE, 
          read_at = NOW(), 
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE related_entity_type = 'monthly_tax_data' 
        AND related_entity_id = ? 
        AND user_id = ? 
        AND type IN ('tax_review_pending', 'tax_review_pending_recheck')
        AND is_read = FALSE 
        AND deleted_at IS NULL`,
      [expiresAt, monthlyTaxDataId, userId]
    )
  } catch (error) {
    console.error('Error marking tax review notifications as read:', error)
  }
}
