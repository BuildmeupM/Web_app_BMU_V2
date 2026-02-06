-- Migration: 003_insert_users_with_hashes.sql
-- Description: Insert ข้อมูล users เริ่มต้น 28 รายการพร้อม password hashes ที่ hash แล้ว
-- Generated: 2026-01-29
-- Note: Password hashes ถูก generate ด้วย bcrypt (cost factor: 10)

-- User 1: admin
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'admin', 'admin@bmu.local', '$2b$10$wpxM711hi2TJZbNZx7YWuelBgXBzEE0EFEVtTI35Vbs3VAtgnlqL2', 'AC00010', 'เอ็ม', 'admin', 'ยุทธนา (เอ็ม)');

-- User 2: Ekkacha.A
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Ekkacha.A', 'Ekkacha.A@bmu.local', '$2b$10$vjJVv1bVri.zUl3y1ELGdePeDp4TXdUzK.WKKfdZyF/sTEM6dbYZi', 'IT00003', 'พี่เอ', 'admin', 'เอกชัย(พี่เอ)');

-- User 3: Panyakorn.plu
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Panyakorn.plu', 'Panyakorn.plu@bmu.local', '$2b$10$BfoUDZaSk7FdeH2/gnX.ieO/kC5nd265INpwDKLBVkIm2C9JzZnni', 'AC00035', 'ซอคเกอร์', 'data_entry', 'ปัญญากร (ซอคเกอร์)');

-- User 4: Suthasinee.pha
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Suthasinee.pha', 'Suthasinee.pha@bmu.local', '$2b$10$gd/0ofDDmwrxRU0CREQCHuBZco/dxOtozSx3v7Gacz7BUbmmRRUNO', 'STAC001', 'มิ้น', 'data_entry_and_service', 'สุธาสินี (มิ้น)');

-- User 5: Supaporn.too
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Supaporn.too', 'Supaporn.too@bmu.local', '$2b$10$XJlhb6YvTypukXHBT4Oweu9dPAYLTFnSD6CY5KtRgKqW.SouogXde', 'AC00016', 'ใบเฟิร์น', 'audit', 'สุภาภรณ์(ใบเฟิร์น)');

-- User 6: TTOP007
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'TTOP007', 'TTOP007@bmu.local', '$2b$10$5Mvsf196XPFTTxgdcnhEBuNCOY.pZbRSr2X406CXnZY55bFGdJL0G', 'AC00008', 'ท็อป', 'audit', 'ธวัชชัย(ท็อป)');

-- User 7: Butsaya.nae
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Butsaya.nae', 'Butsaya.nae@bmu.local', '$2b$10$EB9efGO6tST9zGQWtokGv.OIGxxNRiezlD6yVtsQakjZziDas3np6', 'AC00044', 'หญิง', 'audit', 'บุษญา(หญิง)');

-- User 8: Sawitree.sri
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Sawitree.sri', 'Sawitree.sri@bmu.local', '$2b$10$VJtZUg2iD3phnXBZ6HD3duQlr/7svhSMNsB0PswxzkPQppWBgOAVe', 'AC00034', 'มาดี', 'service', 'สาวิตรี(มาดี)');

-- User 9: Maythawinee.pim
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Maythawinee.pim', 'Maythawinee.pim@bmu.local', '$2b$10$aU7YxNsSEp8FdT78yu68aOky5J1BePwW6Sy00i.HqeWFWcEjWIVNK', 'AC00036', 'ปิ๋ม', 'data_entry', 'เมธวินี(ปิ๋ม)');

-- User 10: Kanlayanee.pin
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Kanlayanee.pin', 'Kanlayanee.pin@bmu.local', '$2b$10$TFMNnoA0OlAWbE.JxNqreODOquVfO49WXqx82P1XvXioqJSM/zmRy', 'AC00037', 'ปิ่น', 'data_entry_and_service', 'กัลยาณี(ปิ่น)');

-- User 11: Natthanicha.bua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Natthanicha.bua', 'Natthanicha.bua@bmu.local', '$2b$10$ZxTn6CaMrCWWba4w8bzFKeLoO9PEekHfWJEkBOYrfK54.IsxHjbRW', 'AC00017', 'บัว', 'audit', 'ณัฏฐนิชา(บัว)');

-- User 12: Nitirak.pro
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Nitirak.pro', 'Nitirak.pro@bmu.local', '$2b$10$YCzUWzw4e2DQBJhgnb4SWO9MGk094gDhg5OBnWWdmMzh.RplM.7PS', 'AC00038', 'โปร', 'data_entry_and_service', 'นิติรักษ์(โปร)');

-- User 13: Wiranya.wan
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Wiranya.wan', 'Wiranya.wan@bmu.local', '$2b$10$v40lIOlz9OHErHsZYvHYYuYxdqNywrGDceUZNrXfbjAHF1gpmWfgi', 'AC00039', 'วัน', 'data_entry_and_service', 'วิรัญญา(วัน)');

-- User 14: Siriluk.bua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Siriluk.bua', 'Siriluk.bua@bmu.local', '$2b$10$ZPra4fxIC0lDqlzywzIpN.40QHgs011pRcwh3xYZQKPrkSaPfxlKi', 'AC00018', 'บัว', 'audit', 'ศิริลักษณ์(บัว)');

-- User 15: Chayada.see
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Chayada.see', 'Chayada.see@bmu.local', '$2b$10$CbXOeB5zRKlVrsC2OjQiL.OONsTH6ZPNB56e4SRLQZYnzMsoqHFLy', 'AC00040', 'ซี', 'data_entry_and_service', 'ชยาดา(ซี)');

-- User 16: Kankanis.boo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Kankanis.boo', 'Kankanis.boo@bmu.local', '$2b$10$qiDbSj6itFGbwPoeBbUmi.x8FP9kR5xmBgt6FfmWvX9Vjb9PmsJBG', 'AC00040', 'หมาก', 'service', 'กันต์กนิษฐ์(หมาก)');

-- User 17: Kanokwan.pra
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Kanokwan.pra', 'Kanokwan.pra@bmu.local', '$2b$10$vkgNYBcxiz4.ur1rJCV4SuMcJV2hSfB8w0bELRfO18PAzqGyEKZNm', 'AC00041', 'ปราณ', 'service', 'กนกวรรณ(ปราณ)');

-- User 18: Sitthikorn.sak
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Sitthikorn.sak', 'Sitthikorn.sak@bmu.local', '$2b$10$cgmTlJ.ecrOjGbfEEA8PP.gWzfZ8FlFOf0UIQJEx15J0cPkVXFOuW', 'AC00042', 'สัก', 'service', 'สิทธิกร(สัก)');

-- User 19: Kuntida.fua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Kuntida.fua', 'Kuntida.fua@bmu.local', '$2b$10$m1o1nalgO.4cI7xOIMu5w.cVf9kl4lEfCTx6jya9r3cOjkfV7iwhW', 'AC00043', 'เฟิร์น', 'service', 'กุนทิดา(เฟิร์น)');

-- User 20: Rachchanon.tre
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Rachchanon.tre', 'Rachchanon.tre@bmu.local', '$2b$10$wmiQCgIq7RYjJMNva4isz.rqdGyrQkIRsDfs6O88ciUZmEVpsqMHe', 'AC00045', 'เต้', 'service', 'รัชชนน(เต้)');

-- User 21: Piyawat.pik
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Piyawat.pik', 'Piyawat.pik@bmu.local', '$2b$10$tCK0/8ml5ztAT0wTKjmNEO5RPxGiUNGgfPlcqVCfRAvNnstGMW.Py', 'AC00046', 'พิก', 'service', 'ปิยวัฒน์(พิก)');

-- User 22: supasuta.cha
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'supasuta.cha', 'supasuta.cha@bmu.local', '$2b$10$7/LLWY4612uc8kVfMa.4huZojAd3dUNBiPXx4KZdi9fabIeVgyN/i', 'AC00047', 'ชา', 'service', 'ศุภสุตา(ชา)');

-- User 23: Pongist.soo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Pongist.soo', 'Pongist.soo@bmu.local', '$2b$10$WhqXLJY4JVrvM/UHc6SkMuCE5s8k0qS8Xh7WFyV7w5uYIjBym7eXS', 'AC00048', 'ซู', 'service', 'พงศ์อิสต์(ซู)');

-- User 24: Supawan.nop
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Supawan.nop', 'Supawan.nop@bmu.local', '$2b$10$gfx16M2w5LP9JjoaDBTkhudWtVA2t6VMKWstGdnSUmOHhYQ4nYy0u', 'AC00049', 'นพ', 'service', 'ศุภวรรณ(นพ)');

-- User 25: Jirat.poo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Jirat.poo', 'Jirat.poo@bmu.local', '$2b$10$ykOi10mdG7pjeDeF1m5wbOp4nJkRNfUop5GVxtL3xKIKuaOCc9hzq', 'AC00050', 'ปู', 'service', 'จิรัฏฐ์(ปู)');

-- User 26: Supacha.nga
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Supacha.nga', 'Supacha.nga@bmu.local', '$2b$10$.71VECeZsjZFfbpuLnCc0e7voEEFCQffURG.YX3wM86upc.xVu0Xe', 'AC00051', 'งา', 'service', 'ศุภชา(งา)');

-- User 27: Chanida.san
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Chanida.san', 'Chanida.san@bmu.local', '$2b$10$0d4S0vlOLFiAgHHiHuO5LeKpwBqXa8Fu5y4kDZ25SBI4IZvjliCxu', 'AC00052', 'สัน', 'service', 'ชนิฎา(สัน)');

-- User 28: Panatta.kid
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)
VALUES (UUID(), 'Panatta.kid', 'Panatta.kid@bmu.local', '$2b$10$a/hBu7gg2C7NI217PvX9beKsAvruQtAFpkJz0V7GjEXA5uYCKXgP2', 'AC00053', 'คิด', 'service', 'ปนัดดา(คิด)');

-- ตรวจสอบจำนวน users ที่ insert
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
