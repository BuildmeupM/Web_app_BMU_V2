/**
 * Activity Logs Routes
 * API endpoints สำหรับดู activity log (Admin + Audit only)
 */

import express from 'express'
import pool from '../../config/database.js'
import { authenticateToken, authorize } from '../../middleware/auth.js'
import xlsx from 'xlsx'

const router = express.Router()

// ทุก route ต้อง authenticate + admin/audit only
router.use(authenticateToken)
router.use(authorize('admin', 'audit'))

/**
 * GET /api/activity-logs/stats
 * สถิติรวมของ activity logs
 */
router.get('/stats', async (req, res) => {
    try {
        // จำนวน log วันนี้
        const [todayResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs WHERE DATE(created_at) = CURDATE()`
        )

        // จำนวน log สัปดาห์นี้
        const [weekResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
        )

        // จำนวน log เดือนนี้
        const [monthResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
        )

        // Active users วันนี้ (unique users ที่มี activity)
        const [activeUsersResult] = await pool.execute(
            `SELECT COUNT(DISTINCT user_id) as count FROM activity_logs 
       WHERE DATE(created_at) = CURDATE()`
        )

        // Top page วันนี้
        const [topPageResult] = await pool.execute(
            `SELECT page, COUNT(*) as count FROM activity_logs 
       WHERE DATE(created_at) = CURDATE()
       GROUP BY page ORDER BY count DESC LIMIT 1`
        )

        // จำนวนครั้ง correction (field_changed เป็น status และ new_value เป็น แก้ไข)
        const [correctionResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM activity_logs 
       WHERE new_value IN ('needs_correction', 'edit') 
       AND DATE(created_at) = CURDATE()`
        )

        res.json({
            success: true,
            data: {
                today: todayResult[0].count,
                thisWeek: weekResult[0].count,
                thisMonth: monthResult[0].count,
                activeUsersToday: activeUsersResult[0].count,
                topPage: topPageResult[0] || null,
                correctionsToday: correctionResult[0].count,
            },
        })
    } catch (error) {
        console.error('Error getting activity log stats:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/list
 * รายการ activity logs (pagination + filters)
 */
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const offset = (page - 1) * limit
        const { userId, pageName, action, taxMonth, taxYear, build, search, detailsStatus } = req.query

        let whereClause = 'WHERE 1=1'
        const params = []

        if (userId) {
            whereClause += ' AND al.user_id = ?'
            params.push(userId)
        }
        if (pageName) {
            whereClause += ' AND al.page = ?'
            params.push(pageName)
        }
        if (action) {
            if (action === 'status_correction') {
                whereClause += " AND al.new_value IN ('needs_correction', 'edit')"
            } else {
                whereClause += ' AND al.action = ?'
                params.push(action)
            }
        }
        if (taxMonth) {
            whereClause += " AND JSON_EXTRACT(al.metadata, '$.month') = ?"
            params.push(taxMonth)
        }
        if (taxYear) {
            whereClause += " AND JSON_EXTRACT(al.metadata, '$.year') = ?"
            params.push(taxYear)
        }
        if (build) {
            whereClause += ' AND al.build = ?'
            params.push(build)
        }
        if (detailsStatus) {
            whereClause += ' AND al.new_value = ?'
            params.push(detailsStatus)
        }
        if (search) {
            whereClause += ' AND (al.company_name LIKE ? OR al.description LIKE ? OR al.user_name LIKE ?)'
            const searchTerm = `%${search}%`
            params.push(searchTerm, searchTerm, searchTerm)
        }

        // Count total
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
            params
        )
        const total = countResult[0].total

        // Get data
        const [logs] = await pool.execute(
            `SELECT al.id, al.user_id, al.employee_id, al.user_name, al.action, al.page,
              al.entity_type, al.entity_id, al.build, al.company_name, al.description,
              al.field_changed, al.old_value, al.new_value, al.metadata, al.ip_address,
              al.created_at
       FROM activity_logs al
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
            params
        )

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        })
    } catch (error) {
        console.error('Error getting activity logs:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/chart
 * ข้อมูลกราฟ activity (7 หรือ 30 วัน)
 */
router.get('/chart', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7

        const [chartData] = await pool.execute(
            `SELECT 
         DATE(created_at) as date,
         COUNT(*) as total,
         SUM(CASE WHEN action = 'status_update' THEN 1 ELSE 0 END) as status_updates,
         SUM(CASE WHEN action = 'form_submit' THEN 1 ELSE 0 END) as form_submits,
         SUM(CASE WHEN action = 'data_create' THEN 1 ELSE 0 END) as data_creates,
         SUM(CASE WHEN action = 'data_edit' THEN 1 ELSE 0 END) as data_edits
       FROM activity_logs 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
            [days]
        )

        // Page breakdown
        const [pageBreakdown] = await pool.execute(
            `SELECT page, COUNT(*) as count
       FROM activity_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY page
       ORDER BY count DESC`,
            [days]
        )

        res.json({
            success: true,
            data: { chartData, pageBreakdown },
        })
    } catch (error) {
        console.error('Error getting activity chart data:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/employee-summary
 * สรุปจำนวน activity รายพนักงาน
 */
router.get('/employee-summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30
        const pageName = req.query.page || null

        let whereClause = 'WHERE al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'
        const params = [days]

        if (pageName) {
            whereClause += ' AND al.page = ?'
            params.push(pageName)
        }

        const [summary] = await pool.execute(
            `SELECT 
         al.user_id,
         al.user_name,
         al.employee_id,
         COUNT(*) as total_actions,
         SUM(CASE WHEN al.action = 'status_update' THEN 1 ELSE 0 END) as status_updates,
         SUM(CASE WHEN al.action = 'form_submit' THEN 1 ELSE 0 END) as form_submits,
         SUM(CASE WHEN al.action = 'data_edit' THEN 1 ELSE 0 END) as data_edits,
         MAX(al.created_at) as last_activity
       FROM activity_logs al
       ${whereClause}
       GROUP BY al.user_id, al.user_name, al.employee_id
       ORDER BY total_actions DESC`,
            params
        )

        res.json({
            success: true,
            data: summary,
        })
    } catch (error) {
        console.error('Error getting employee summary:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/correction-summary
 * สรุปจำนวนครั้งที่งานถูกส่งกลับ "แก้ไข" รายพนักงาน
 * คือ จำนวนลูกค้าที่พนักงานคนนั้นรับผิดชอบ แล้วมีสถานะเปลี่ยนเป็น แก้ไข
 */
router.get('/correction-summary', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30

        const [corrections] = await pool.execute(
            `SELECT 
         al.build,
         al.company_name,
         e.first_name,
         e.nick_name,
         COUNT(*) as correction_count,
         MAX(al.created_at) as last_correction
       FROM activity_logs al
       LEFT JOIN monthly_tax_data mtd ON al.build = mtd.build 
            AND mtd.tax_year = COALESCE(JSON_EXTRACT(al.metadata, '$.year'), YEAR(al.created_at))
            AND mtd.tax_month = COALESCE(JSON_EXTRACT(al.metadata, '$.month'), MONTH(al.created_at))
            AND mtd.deleted_at IS NULL
       LEFT JOIN employees e ON mtd.accounting_responsible = e.employee_id
       WHERE al.new_value IN ('needs_correction', 'edit')
         AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY al.build, al.company_name, e.first_name, e.nick_name
       ORDER BY correction_count DESC
       LIMIT 10`,
            [days]
        )

        // สรุปรวม
        const [totalResult] = await pool.execute(
            `SELECT COUNT(*) as total_corrections, 
              COUNT(DISTINCT build) as total_affected_companies
       FROM activity_logs 
       WHERE new_value IN ('needs_correction', 'edit')
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
            [days]
        )

        res.json({
            success: true,
            data: {
                corrections,
                summary: totalResult[0],
            },
        })
    } catch (error) {
        console.error('Error getting correction summary:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/activity-logs/audit-corrections
 * สรุปจำนวนการแก้ไขที่ผู้ตรวจเจอ จาก activity_logs
 * grouped by auditor, split WHT/VAT, พร้อมรายละเอียดบริษัท
 */
router.get('/audit-corrections', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear()
        const month = parseInt(req.query.month) || new Date().getMonth() + 1

        // ดึง correction logs โดย join กับ monthly_tax_data ตาม build + tax period
        // (ผู้ตรวจอาจ review งานเดือน ม.ค. ในเดือน ก.พ. ฉะนั้นต้อง join ตาม tax_year/tax_month)
        const [logs] = await pool.execute(
            `SELECT 
                al.employee_id,
                al.user_name,
                al.field_changed,
                al.new_value,
                al.old_value,
                al.build,
                al.company_name,
                al.created_at,
                e.first_name as accounting_responsible_first_name,
                e.nick_name as accounting_responsible_nick_name
            FROM activity_logs al
            INNER JOIN monthly_tax_data mtd ON al.build = mtd.build 
                AND mtd.tax_year = ? AND mtd.tax_month = ? AND mtd.deleted_at IS NULL
            LEFT JOIN employees e ON mtd.accounting_responsible = e.employee_id
            WHERE al.page = 'tax_inspection'
                AND al.new_value IN ('needs_correction', 'edit')
                AND al.field_changed IN ('pnd_status', 'pp30_form_status')
            ORDER BY al.created_at DESC`,
            [year, month]
        )

        // Group by auditor
        const auditorMap = new Map()

        for (const log of logs) {
            const empId = log.employee_id || 'unknown'
            if (!auditorMap.has(empId)) {
                auditorMap.set(empId, {
                    employee_id: empId,
                    user_name: log.user_name,
                    wht_corrections: 0,
                    vat_corrections: 0,
                    wht_companies: [],
                    vat_companies: [],
                })
            }
            const auditor = auditorMap.get(empId)

            const acctName = log.accounting_responsible_first_name && log.accounting_responsible_nick_name
                ? `${log.accounting_responsible_first_name}(${log.accounting_responsible_nick_name})`
                : log.accounting_responsible_first_name || log.accounting_responsible_nick_name || '-'

            const companyDetail = {
                build: log.build,
                company_name: log.company_name,
                status: log.new_value,
                old_status: log.old_value,
                accounting_responsible: acctName,
                created_at: log.created_at,
            }

            if (log.field_changed === 'pnd_status') {
                auditor.wht_corrections++
                auditor.wht_companies.push(companyDetail)
            } else if (log.field_changed === 'pp30_form_status') {
                auditor.vat_corrections++
                auditor.vat_companies.push(companyDetail)
            }
        }

        const auditors = Array.from(auditorMap.values())
            .sort((a, b) => (b.wht_corrections + b.vat_corrections) - (a.wht_corrections + a.vat_corrections))

        const totalWht = auditors.reduce((s, a) => s + a.wht_corrections, 0)
        const totalVat = auditors.reduce((s, a) => s + a.vat_corrections, 0)

        res.json({
            success: true,
            data: {
                auditors,
                total_wht: totalWht,
                total_vat: totalVat,
            },
        })
    } catch (error) {
        console.error('Error getting audit corrections:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})
export default router

/**
 * GET /api/activity-logs/chart-status-summary
 * สรุปกิจกรรมตามสถานะ (new_value) ประจำวัน
 */
router.get('/chart-status-summary', async (req, res) => {
    try {
        const dateParam = req.query.date; // YYYY-MM-DD
        const daysParam = req.query.days; // 7, 14, 30
        const pageName = req.query.pageName;
        const reviewer = req.query.reviewer;
        const accountant = req.query.accountant;

        let joinClause = "";
        let whereClause = "WHERE 1=1";
        const params = [];

        if (reviewer || accountant) {
            joinClause = `
                INNER JOIN monthly_tax_data mtd ON al.build = mtd.build 
                AND mtd.tax_year = COALESCE(JSON_EXTRACT(al.metadata, '$.year'), YEAR(al.created_at))
                AND mtd.tax_month = COALESCE(JSON_EXTRACT(al.metadata, '$.month'), MONTH(al.created_at))
                AND mtd.deleted_at IS NULL
            `;
            if (reviewer) {
                whereClause += " AND mtd.tax_inspection_responsible = ?";
                params.push(reviewer);
            }
            if (accountant) {
                whereClause += " AND mtd.accounting_responsible = ?";
                params.push(accountant);
            }
        }

        if (daysParam) {
            whereClause += " AND DATE(al.created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE(al.created_at) <= CURDATE()";
            params.push(parseInt(daysParam, 10) - 1);
        } else if (dateParam) {
            whereClause += " AND DATE(al.created_at) = ?";
            params.push(dateParam);
        } else {
            whereClause += " AND DATE(al.created_at) = CURDATE()";
        }

        if (pageName) {
            whereClause += " AND al.page = ?";
            params.push(pageName);
        }
        
        whereClause += " AND al.new_value IS NOT NULL AND al.new_value != ''";
        // Filter actions that update status
        whereClause += " AND al.action IN ('status_update', 'status_correction')";

        const [results] = await pool.execute(
            `SELECT al.new_value as status, COUNT(*) as count
             FROM activity_logs al
             ${joinClause}
             ${whereClause}
             GROUP BY al.new_value
             ORDER BY count DESC`,
             params
        );

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error getting chart status summary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/export-logs
 * ส่งออก Excel
 */
router.get('/export-logs', async (req, res) => {
    try {
        const { startDate, endDate, reviewer, accountant } = req.query;
        let whereClause = "WHERE 1=1";
        let joinClause = "";
        const params = [];

        if (reviewer || accountant) {
            joinClause = `
                INNER JOIN monthly_tax_data mtd ON al.build = mtd.build 
                AND mtd.tax_year = COALESCE(JSON_EXTRACT(al.metadata, '$.year'), YEAR(al.created_at))
                AND mtd.tax_month = COALESCE(JSON_EXTRACT(al.metadata, '$.month'), MONTH(al.created_at))
                AND mtd.deleted_at IS NULL
            `;
            if (reviewer) {
                whereClause += " AND mtd.tax_inspection_responsible = ?";
                params.push(reviewer);
            }
            if (accountant) {
                whereClause += " AND mtd.accounting_responsible = ?";
                params.push(accountant);
            }
        }

        if (startDate) {
            whereClause += " AND DATE(al.created_at) >= ?";
            params.push(startDate);
        }
        if (endDate) {
            whereClause += " AND DATE(al.created_at) <= ?";
            params.push(endDate);
        }

        const [logs] = await pool.execute(
            `SELECT 
              al.created_at as 'วัน-เวลา',
              al.user_name as 'ผู้ใช้งาน',
              al.action as 'การกระทำ',
              al.page as 'หน้า',
              al.build as 'Build',
              al.company_name as 'ชื่อบริษัท',
              al.description as 'รายละเอียด'
             FROM activity_logs al
             ${joinClause}
             ${whereClause}
             ORDER BY al.created_at DESC`,
             params
        );

        // Convert the JSON object array to a worksheet
        const ws = xlsx.utils.json_to_sheet(logs);

        ws['!cols'] = [
            { wch: 20 }, // วัน-เวลา
            { wch: 20 }, // ผู้ใช้งาน
            { wch: 20 }, // การกระทำ
            { wch: 15 }, // หน้า
            { wch: 10 }, // Build
            { wch: 30 }, // ชื่อบริษัท
            { wch: 40 }  // รายละเอียด
        ];

        // Create a workbook and append the worksheet
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Activity Logs");

        // Write to buffer
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        res.setHeader('Content-Disposition', 'attachment; filename="activity_logs.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        // Send buffer
        res.end(buffer);
    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ success: false, message: 'Internal server error while exporting' });
    }
});
