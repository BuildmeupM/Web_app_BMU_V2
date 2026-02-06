# 📖 Database Guide - BMU Work Management System

## 🎯 Overview

คู่มือการใช้งาน Database สำหรับ Developers และ Cursor AI Agent

## 🔌 Connection

### Development
```javascript
{
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'bmu_work_management',
  charset: 'utf8mb4'
}
```

### Production
```javascript
{
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
}
```

## 🔐 Security Best Practices

### 1. Parameterized Queries
✅ **DO:**
```javascript
// Good - Parameterized Query
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);
```

❌ **DON'T:**
```javascript
// Bad - SQL Injection Risk
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);
```

### 2. Prepared Statements
```javascript
const stmt = db.prepare('INSERT INTO employees (name, email) VALUES (?, ?)');
stmt.execute([name, email]);
```

### 3. Connection Pooling
```javascript
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'bmu_work_management'
});
```

## 📊 Common Queries

### 1. Get All Employees with Department
```sql
SELECT 
  e.id,
  e.employee_id,
  e.name,
  e.email,
  d.name AS department_name,
  p.name AS position_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
WHERE e.deleted_at IS NULL
ORDER BY e.created_at DESC;
```

### 2. Get Pending Leave Requests
```sql
SELECT 
  lr.id,
  lr.type,
  lr.start_date,
  lr.end_date,
  lr.days,
  e.name AS employee_name,
  u.name AS approver_name
FROM leave_requests lr
INNER JOIN employees e ON lr.employee_id = e.id
LEFT JOIN users u ON lr.approved_by = u.id
WHERE lr.status = 'pending'
  AND lr.deleted_at IS NULL
ORDER BY lr.created_at ASC;
```

### 3. Get Employee Attendance for Month
```sql
SELECT 
  a.date,
  a.check_in,
  a.check_out,
  a.status
FROM attendances a
WHERE a.employee_id = ?
  AND YEAR(a.date) = ?
  AND MONTH(a.date) = ?
  AND a.deleted_at IS NULL
ORDER BY a.date ASC;
```

### 4. Get Dashboard Stats (Admin)
```sql
-- Total Employees
SELECT COUNT(*) as total_employees
FROM employees
WHERE deleted_at IS NULL AND status = 'active';

-- Pending Leave Requests
SELECT COUNT(*) as pending_leaves
FROM leave_requests
WHERE status = 'pending' AND deleted_at IS NULL;

-- Today's Attendance
SELECT COUNT(*) as today_attendance
FROM attendances
WHERE date = CURDATE() AND deleted_at IS NULL;
```

## 🔄 Transactions

### Example: Approve Leave Request
```javascript
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  
  // Update leave request
  await connection.query(
    'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
    ['approved', userId, leaveRequestId]
  );
  
  // Create notification
  await connection.query(
    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
    [employeeUserId, 'leave_approved', 'การลาถูกอนุมัติ', 'การลาของคุณถูกอนุมัติแล้ว']
  );
  
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

## 📈 Performance Optimization

### 1. Use Indexes
```sql
-- Check if index exists
SHOW INDEXES FROM employees;

-- Create index if needed
CREATE INDEX idx_employees_department_id ON employees(department_id);
```

### 2. Use EXPLAIN
```sql
EXPLAIN SELECT * FROM employees WHERE department_id = '123';
```

### 3. Limit Results
```sql
-- Good - Use LIMIT
SELECT * FROM employees LIMIT 20 OFFSET 0;

-- Bad - Don't select all
SELECT * FROM employees;
```

### 4. Use JOIN Instead of Subqueries
```sql
-- Good - Use JOIN
SELECT e.*, d.name AS department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;

-- Bad - Subquery
SELECT e.*, 
  (SELECT name FROM departments WHERE id = e.department_id) AS department_name
FROM employees e;
```

## 🧪 Testing Queries

### 1. Insert Test Data
```sql
-- Insert test user
INSERT INTO users (id, username, email, password_hash, role, name)
VALUES (UUID(), 'testuser', 'test@example.com', '$2b$10$...', 'admin', 'Test User');

-- Insert test employee
INSERT INTO employees (id, employee_id, name, email, department_id, position_id, hire_date)
VALUES (UUID(), 'EMP001', 'John Doe', 'john@example.com', 'dept-id', 'pos-id', CURDATE());
```

### 2. Clean Test Data
```sql
-- Soft delete
UPDATE employees SET deleted_at = NOW() WHERE email LIKE '%@test.com';

-- Hard delete (only for testing)
DELETE FROM employees WHERE email LIKE '%@test.com';
```

## 🔍 Debugging

### 1. Check Table Structure
```sql
DESCRIBE employees;
SHOW CREATE TABLE employees;
```

### 2. Check Foreign Keys
```sql
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'bmu_work_management'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 3. Check Indexes
```sql
SHOW INDEXES FROM employees;
```

### 4. Monitor Slow Queries
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- View slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

## 📝 Common Patterns

### 1. Soft Delete Pattern
```sql
-- Select active records
SELECT * FROM employees WHERE deleted_at IS NULL;

-- Soft delete
UPDATE employees SET deleted_at = NOW() WHERE id = ?;

-- Restore
UPDATE employees SET deleted_at = NULL WHERE id = ?;
```

### 2. Pagination Pattern
```sql
-- Get total count
SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL;

-- Get paginated results
SELECT * FROM employees 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT ? OFFSET ?;
```

### 3. Search Pattern
```sql
-- Search employees by name or email
SELECT * FROM employees
WHERE deleted_at IS NULL
  AND (name LIKE ? OR email LIKE ?)
ORDER BY name ASC;
```

### 4. Status Update Pattern
```sql
-- Update status with timestamp
UPDATE leave_requests 
SET status = ?, 
    approved_by = ?, 
    approved_at = NOW(),
    updated_at = NOW()
WHERE id = ?;
```

## 🚨 Common Mistakes to Avoid

### ❌ Don't Use SELECT *
```sql
-- Bad
SELECT * FROM employees;

-- Good
SELECT id, name, email, department_id FROM employees;
```

### ❌ Don't Forget WHERE Clause
```sql
-- Bad - Updates all records
UPDATE employees SET status = 'inactive';

-- Good
UPDATE employees SET status = 'inactive' WHERE id = ?;
```

### ❌ Don't Forget Soft Delete Check
```sql
-- Bad - Includes deleted records
SELECT * FROM employees;

-- Good
SELECT * FROM employees WHERE deleted_at IS NULL;
```

### ❌ Don't Use String Concatenation for Queries
```sql
-- Bad - SQL Injection Risk
const query = `SELECT * FROM users WHERE email = '${email}'`;

-- Good - Parameterized
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);
```

## 📚 Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQL Best Practices](https://www.sqlstyle.guide/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

**Last Updated**: 2026-01-29
