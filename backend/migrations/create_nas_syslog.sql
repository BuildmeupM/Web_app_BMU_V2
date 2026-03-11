-- NAS Syslog Storage Table
-- Stores syslog events from NAS with 3-month retention
-- Excludes: read, host, user events (filtered at application level)

CREATE TABLE IF NOT EXISTS nas_syslog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  severity VARCHAR(10),
  service VARCHAR(50),
  event VARCHAR(30) NOT NULL,
  user VARCHAR(100),
  ip VARCHAR(45),
  file_type VARCHAR(20),
  size VARCHAR(50),
  path TEXT,
  raw_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_event (event),
  INDEX idx_user (user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
