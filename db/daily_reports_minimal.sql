-- Minimal daily report schema for coop_nextjs (no auth / no coop_back dependency)
-- MySQL / MariaDB

CREATE TABLE IF NOT EXISTS daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  student_id VARCHAR(20) NOT NULL,

  report_date DATE NOT NULL,
  work_start_time TIME DEFAULT NULL,
  work_end_time TIME DEFAULT NULL,
  department VARCHAR(255) DEFAULT NULL,

  work_summary MEDIUMTEXT,
  problem MEDIUMTEXT,
  fix_action MEDIUMTEXT,
  experience MEDIUMTEXT,
  suggestion MEDIUMTEXT,

  student_signature_name VARCHAR(255) DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_reports_student_date (student_id, report_date),
  KEY idx_daily_reports_student_id (student_id),
  KEY idx_daily_reports_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

