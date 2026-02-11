/**
 * Employee Statistics Routes
 * Routes สำหรับ statistics และ analytics
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/employees/statistics/by-month/:month
 * Get employees hired or resigned in a specific month
 * Access: Admin only
 * @param month - Format: YYYY-MM (e.g., "2025-08")
 * NOTE: This route must be defined BEFORE /statistics route to avoid route conflicts
 */
router.get('/statistics/by-month/:month', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { month } = req.params

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM',
      })
    }

    // Get employees hired in this month
    const [hiredEmployees] = await pool.execute(
      `SELECT 
        id,
        employee_id,
        full_name,
        nick_name,
        position,
        DATE_FORMAT(hire_date, '%Y-%m-%d') as hire_date
      FROM employees
      WHERE deleted_at IS NULL
        AND DATE_FORMAT(hire_date, '%Y-%m') = ?
      ORDER BY hire_date ASC`,
      [month]
    )

    // Get employees resigned in this month
    const [resignedEmployees] = await pool.execute(
      `SELECT 
        id,
        employee_id,
        full_name,
        nick_name,
        position,
        DATE_FORMAT(hire_date, '%Y-%m-%d') as hire_date,
        DATE_FORMAT(resignation_date, '%Y-%m-%d') as resignation_date
      FROM employees
      WHERE deleted_at IS NULL
        AND DATE_FORMAT(resignation_date, '%Y-%m') = ?
        AND resignation_date IS NOT NULL
      ORDER BY resignation_date ASC`,
      [month]
    )

    res.json({
      success: true,
      data: {
        month,
        hired: hiredEmployees,
        resigned: resignedEmployees,
      },
    })
  } catch (error) {
    console.error('Get employees by month error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * GET /api/employees/statistics
 * Get employee statistics (for Dashboard)
 * Access: Admin only
 */
router.get('/statistics', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    // Get total active and resigned employees
    const [statusCounts] = await pool.execute(
      `SELECT 
        status,
        COUNT(*) as count
      FROM employees
      WHERE deleted_at IS NULL
      GROUP BY status`
    )

    const totalActive = statusCounts.find((s) => s.status === 'active')?.count || 0
    const totalResigned = statusCounts.find((s) => s.status === 'resigned')?.count || 0

    // Get employees by position
    const [positionCounts] = await pool.execute(
      `SELECT 
        position,
        COUNT(*) as count
      FROM employees
      WHERE deleted_at IS NULL AND status = 'active'
      GROUP BY position
      ORDER BY count DESC`
    )

    // Get employees by gender
    const [genderCounts] = await pool.execute(
      `SELECT 
        gender,
        COUNT(*) as count
      FROM employees
      WHERE deleted_at IS NULL AND status = 'active'
      GROUP BY gender
      ORDER BY 
        CASE gender
          WHEN 'male' THEN 1
          WHEN 'female' THEN 2
          WHEN 'other' THEN 3
        END`
    )

    // Get hire/resignation trend for last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [hireTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(hire_date, '%Y-%m') as month,
        COUNT(*) as hired
      FROM employees
      WHERE deleted_at IS NULL
        AND hire_date >= ?
      GROUP BY DATE_FORMAT(hire_date, '%Y-%m')
      ORDER BY month ASC`,
      [sixMonthsAgo.toISOString().split('T')[0]]
    )

    const [resignTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(resignation_date, '%Y-%m') as month,
        COUNT(*) as resigned
      FROM employees
      WHERE deleted_at IS NULL
        AND resignation_date >= ?
        AND resignation_date IS NOT NULL
      GROUP BY DATE_FORMAT(resignation_date, '%Y-%m')
      ORDER BY month ASC`,
      [sixMonthsAgo.toISOString().split('T')[0]]
    )

    // Combine hire and resign trends
    const trendMap = new Map()

    hireTrend.forEach((item) => {
      trendMap.set(item.month, { month: item.month, hired: item.hired, resigned: 0 })
    })

    resignTrend.forEach((item) => {
      if (trendMap.has(item.month)) {
        trendMap.get(item.month).resigned = item.resigned
      } else {
        trendMap.set(item.month, { month: item.month, hired: 0, resigned: item.resigned })
      }
    })

    const hireTrend6Months = Array.from(trendMap.values())

    // Get employees for probation review (next 90 days)
    const today = new Date()
    const ninetyDaysLater = new Date()
    ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90)

    const [probationReviews] = await pool.execute(
      `SELECT 
        id,
        employee_id,
        full_name,
        nick_name,
        position,
        hire_date,
        probation_end_date,
        DATEDIFF(probation_end_date, CURDATE()) as days_until_review
      FROM employees
      WHERE deleted_at IS NULL
        AND status = 'active'
        AND probation_end_date IS NOT NULL
        AND probation_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY probation_end_date ASC`
    )

    res.json({
      success: true,
      data: {
        total_active: totalActive,
        total_resigned: totalResigned,
        by_position: positionCounts.map((p) => ({
          position: p.position,
          count: p.count,
        })),
        by_gender: genderCounts.map((g) => ({
          gender: g.gender,
          count: g.count,
        })),
        hire_trend_6months: hireTrend6Months,
        probation_reviews_next_90days: probationReviews.map((p) => ({
          id: p.id,
          employee_id: p.employee_id,
          full_name: p.full_name,
          nick_name: p.nick_name,
          position: p.position,
          hire_date: p.hire_date,
          probation_end_date: p.probation_end_date,
          days_until_review: p.days_until_review,
        })),
      },
    })
  } catch (error) {
    console.error('Get employee statistics error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router
