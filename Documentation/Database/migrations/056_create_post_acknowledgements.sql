-- Migration 056: Create Post Acknowledgements
-- สำหรับบันทึกสถานะการกดยอมรับ/รับทราบประกาศของพนักงาน

CREATE TABLE IF NOT EXISTS post_acknowledgements (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_post_acknowledgements (post_id, user_id),
    INDEX idx_post_acknowledgements_post (post_id),
    FOREIGN KEY (post_id) REFERENCES company_posts (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;