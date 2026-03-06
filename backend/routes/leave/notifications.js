import pool from '../../config/database.js'
import { generateUUID } from '../../utils/leaveHelpers.js'

/**
 * ตรวจสอบและสร้างแจ้งเตือนสำหรับผู้ใช้งานที่มี WFH ที่เลยกำหนดและยังไม่ส่งรายงาน
 * @param {import('express').Application} app - Express App instance สำหรับดึง io object
 */
export async function checkOverdueWFHReports(app) {
  try {
    console.log('🔍 Scheduled Job: Checking for overdue WFH reports to send notifications...')

    // 1. ดึงข้อมูลรายการ WFH ที่สถานะอนุมัติ, วันที่ <= วันปัจจุบัน, และยังไม่มี work_report
    // โดย Join กับ table users เพื่อเชื่อมให้ได้ user_id จาก employee_id
    const [overdueWFH] = await pool.execute(`
      SELECT wr.id as wfh_id, u.id as user_id, wr.wfh_date, wr.employee_id
      FROM wfh_requests wr
      INNER JOIN users u ON wr.employee_id = u.employee_id
      WHERE wr.status = 'อนุมัติแล้ว'
        AND wr.deleted_at IS NULL
        AND u.deleted_at IS NULL
        AND DATE(wr.wfh_date) <= CURDATE()
        AND (wr.work_report IS NULL OR wr.work_report = '')
    `)

    if (overdueWFH.length === 0) {
      console.log('✅ No overdue WFH reports found.')
      return
    }

    console.log(`⚠️ Found ${overdueWFH.length} overdue WFH reports. Checking existing notifications...`)

    let newNotificationsCount = 0
    const io = app.get('io')

    for (const req of overdueWFH) {
      const { wfh_id, user_id, wfh_date } = req

      // แปลงวันที่ให้สวยงามเพื่อแสดงในข้อความเตือน
      const dateObj = new Date(wfh_date)
      const formattedDate = dateObj.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

      // 2. เช็คว่ามีแจ้งเตือนของ WFH ID นี้และยังไม่ถูกลบไปแล้วหรือยัง
      const [existing] = await pool.execute(
        `
        SELECT id FROM notifications
        WHERE user_id = ? 
          AND type = 'wfh_reminder'
          AND related_entity_type = 'wfh_request'
          AND related_entity_id = ?
          AND deleted_at IS NULL
        `,
        [user_id, wfh_id]
      )

      if (existing.length > 0) {
        // มีการแจ้งเตือนอยู่แล้ว ข้ามไป
        continue
      }

      // 3. สร้าง Notification ใหม่ลง Database
      const notificationId = generateUUID()
      const title = 'แจ้งเตือน: ส่งรายงาน WFH'
      const message = `คุณมีรายงาน WFH ค้างส่งของวันที่ ${formattedDate} กรุณากดที่ปุ่มเพื่อส่งรายงาน`

      // ตั้งเวลาให้หมดอายุเองอัตโนมัติใน 3 วัน (ถ้าไม่ถูกลบด้วยวิธีอื่น)
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')

      try {
        await pool.execute(
          `
          INSERT INTO notifications (
            id, user_id, type, category, priority, title, message, icon, color,
            action_url, action_label, related_entity_type, related_entity_id,
            expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            notificationId,
            user_id,
            'wfh_reminder', // type
            'leave', // category
            'high', // priority (สีแดง)
            title,
            message,
            'TbAlertCircle', // icon ที่แมตช์ใน NotificationMenu
            'red', // สี icon แดงเตือน
            '/leave?tab=leave&sub-leave=dashboard&sub-wfh=pending', // Link นำทางตรงไปยังหน้า Pending WFH
            'กรอกรายงาน',
            'wfh_request', // entity type
            wfh_id, // entity id ที่ใช้อ้างอิงว่าเตือนของอันไหน
            expiresAt,
          ]
        )

        newNotificationsCount++

        // 4. ส่ง Socket Signal (Real-time updates) ให้เมนูกระดิ่งเด้งขึ้นทันที
        if (io) {
          const newNotif = {
            id: notificationId,
            user_id: user_id,
            type: 'wfh_reminder',
            title,
            message,
            icon: 'TbAlertCircle',
            color: 'red',
            action_url: '/leave?tab=leave&sub-leave=dashboard&sub-wfh=pending',
            action_label: 'กรอกรายงาน',
            created_at: new Date().toISOString(),
            is_read: 0,
            priority: 'urgent',
          }
          io.to(`user:${user_id}`).emit('notification:new', {
            notification: newNotif,
            unread_count_increment: 1,
          })
        }
      } catch (insertError) {
        // บางที notification type 'wfh_reminder' อาจจะไม่มีถ้าคอลัมน์ type เป็น ENUM แล้วไม่ได้อัปเดต
        // ในระบบนี้มักจะใช้ VARCHAR หรือไม่ต้องแก้ไข ENUM (รอดูถ้า Error)
        console.error(`❌ Error inserting notification for WFH ${wfh_id}:`, insertError)
      }
    }

    if (newNotificationsCount > 0) {
      console.log(`✅ Successfully sent ${newNotificationsCount} new WFH reminder notifications.`)
    } else {
      console.log('✅ No new WFH reminders needed (all already sent).')
    }
  } catch (error) {
    console.error('❌ Error in checkOverdueWFHReports:', error)
  }
}
