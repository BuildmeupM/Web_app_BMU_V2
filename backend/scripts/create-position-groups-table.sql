-- =============================================
-- Position Groups Tables
-- สร้างตารางสำหรับจัดกลุ่มตำแหน่งพนักงาน
-- =============================================

-- ตารางกลุ่มตำแหน่ง
CREATE TABLE IF NOT EXISTS position_groups (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'orange',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตารางรายการตำแหน่งในแต่ละกลุ่ม
CREATE TABLE IF NOT EXISTS position_group_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  group_id VARCHAR(36) NOT NULL,
  position_name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES position_groups(id) ON DELETE CASCADE,
  UNIQUE KEY unique_position (position_name)
);

-- =============================================
-- Insert default data (ข้อมูลเริ่มต้นตาม hardcode เดิม)
-- =============================================

INSERT INTO position_groups (id, name, color, sort_order) VALUES
  (UUID(), 'กลุ่มบัญชี', 'orange', 1),
  (UUID(), 'กลุ่มทะเบียน', 'orange', 2),
  (UUID(), 'กลุ่มตรวจสอบภายใน / ปิดงบ', 'orange', 3),
  (UUID(), 'กลุ่มออกแบบ / การตลาด', 'orange', 4),
  (UUID(), 'กลุ่มนักพัฒนา / ข้อมูล / อุปกรณ์', 'orange', 5);

-- เพิ่มตำแหน่งเข้ากลุ่ม (ใช้ subquery เพื่อดึง group_id)
INSERT INTO position_group_items (id, group_id, position_name, sort_order)
SELECT UUID(), pg.id, pos.position_name, pos.sort_order
FROM position_groups pg
CROSS JOIN (
  SELECT 'บัญชี-หัวหน้าบัญชี' AS position_name, 1 AS sort_order UNION ALL
  SELECT 'บัญชี', 2 UNION ALL
  SELECT 'บัญชี-ทดลองงาน', 3 UNION ALL
  SELECT 'คีย์ข้อมูล', 4 UNION ALL
  SELECT 'บัญชี-ฝึกงาน', 5
) pos
WHERE pg.name = 'กลุ่มบัญชี';

INSERT INTO position_group_items (id, group_id, position_name, sort_order)
SELECT UUID(), pg.id, pos.position_name, pos.sort_order
FROM position_groups pg
CROSS JOIN (
  SELECT 'ทะเบียน' AS position_name, 1 AS sort_order
) pos
WHERE pg.name = 'กลุ่มทะเบียน';

INSERT INTO position_group_items (id, group_id, position_name, sort_order)
SELECT UUID(), pg.id, pos.position_name, pos.sort_order
FROM position_groups pg
CROSS JOIN (
  SELECT 'ตรวจสอบภายใน' AS position_name, 1 AS sort_order
) pos
WHERE pg.name = 'กลุ่มตรวจสอบภายใน / ปิดงบ';

INSERT INTO position_group_items (id, group_id, position_name, sort_order)
SELECT UUID(), pg.id, pos.position_name, pos.sort_order
FROM position_groups pg
CROSS JOIN (
  SELECT 'ออกแบบ' AS position_name, 1 AS sort_order UNION ALL
  SELECT 'การตลาด-ฝึกงาน', 2
) pos
WHERE pg.name = 'กลุ่มออกแบบ / การตลาด';

INSERT INTO position_group_items (id, group_id, position_name, sort_order)
SELECT UUID(), pg.id, pos.position_name, pos.sort_order
FROM position_groups pg
CROSS JOIN (
  SELECT 'ไอที' AS position_name, 1 AS sort_order
) pos
WHERE pg.name = 'กลุ่มนักพัฒนา / ข้อมูล / อุปกรณ์';
