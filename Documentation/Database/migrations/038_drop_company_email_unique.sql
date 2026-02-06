-- Migration: Remove UNIQUE constraint from company_email to allow duplicate emails
-- This allows multiple employees to share the same company email or personal email

-- Drop the UNIQUE index on company_email if it exists
-- Note: You may need to adjust the index name based on your actual database schema

-- Check existing indexes on employees table first:
-- SHOW INDEX FROM employees WHERE Column_name = 'company_email';

-- Option 1: Drop by constraint name (adjust name if different)
-- ALTER TABLE employees DROP INDEX company_email;

-- Option 2: If using a different constraint name
-- ALTER TABLE employees DROP INDEX idx_employees_company_email;

-- For MySQL, use one of the following commands (uncomment and run the appropriate one):

-- If the constraint is named 'company_email' (auto-generated):
ALTER TABLE employees DROP INDEX company_email;

-- Alternative: If you need to find the exact index name first, run:
-- SHOW CREATE TABLE employees;
-- Then use the actual index name in the DROP INDEX command