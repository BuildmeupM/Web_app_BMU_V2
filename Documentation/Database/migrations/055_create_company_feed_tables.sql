-- Migration 055: Create Company Feed Tables
-- สร้างตาราง company_posts, post_comments, post_reactions, company_events
-- สำหรับระบบประกาศบริษัท / Social Feed / ปฏิทินบริษัท

-- 1. ตารางโพส/ประกาศ
CREATE TABLE IF NOT EXISTS company_posts (
    id VARCHAR(36) PRIMARY KEY,
    author_id VARCHAR(36) NOT NULL,
    category ENUM(
        'announcement',
        'news',
        'discussion'
    ) NOT NULL DEFAULT 'discussion',
    title VARCHAR(255) DEFAULT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_company_posts_author (author_id),z
    INDEX idx_company_posts_category (category),
    INDEX idx_company_posts_pinned (is_pinned),
    INDEX idx_company_posts_created (created_at DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. ตารางคอมเมนต์
CREATE TABLE IF NOT EXISTS post_comments (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_post_comments_post (post_id),
    INDEX idx_post_comments_author (author_id),
    FOREIGN KEY (post_id) REFERENCES company_posts (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. ตารางรีแอค/ไลค์
CREATE TABLE IF NOT EXISTS post_reactions (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    reaction_type ENUM('like', 'love', 'celebrate') NOT NULL DEFAULT 'like',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_post_reactions (post_id, user_id),
    INDEX idx_post_reactions_post (post_id),
    FOREIGN KEY (post_id) REFERENCES company_posts (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. ตารางอีเวนต์ปฏิทินบริษัท
CREATE TABLE IF NOT EXISTS company_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    event_date DATE NOT NULL,
    event_end_date DATE DEFAULT NULL,
    event_type ENUM(
        'meeting',
        'holiday',
        'deadline',
        'other'
    ) NOT NULL DEFAULT 'other',
    color VARCHAR(20) DEFAULT '#4263eb',
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_company_events_date (event_date),
    INDEX idx_company_events_type (event_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;