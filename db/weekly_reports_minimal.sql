-- Minimal weekly report schema for coop_nextjs (no auth / no coop_back dependency)
-- MySQL 8+

CREATE TABLE IF NOT EXISTS weekly_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- identify student directly (no login)
  student_id VARCHAR(20) NOT NULL,

  -- allow grouping by semester/term without depending on old system
  semester_year INT NOT NULL,
  semester_no TINYINT NOT NULL,

  -- weekly identity
  week_no TINYINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- weekly form content
  department VARCHAR(255) DEFAULT NULL,
  work_summary MEDIUMTEXT,
  problem MEDIUMTEXT,
  status ENUM('good', 'normal', 'worse', 'danger') NOT NULL DEFAULT 'normal',
  fix_action MEDIUMTEXT,
  course_fix_action MEDIUMTEXT,
  experience MEDIUMTEXT,
  suggestion MEDIUMTEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- one weekly record per student/semester/week
  UNIQUE KEY uq_weekly_reports_student_semester_week (
    student_id,
    semester_year,
    semester_no,
    week_no
  ),

  KEY idx_weekly_reports_student_id (student_id),
  KEY idx_weekly_reports_student_semester (student_id, semester_year, semester_no),
  KEY idx_weekly_reports_status (status),
  KEY idx_weekly_reports_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Optional view for quick export (sorted newest semester first, then week)
CREATE OR REPLACE VIEW v_weekly_reports_export AS
SELECT
  id,
  student_id,
  semester_year,
  semester_no,
  week_no,
  start_date,
  end_date,
  COALESCE(department, '') AS department,
  COALESCE(work_summary, '') AS work_summary,
  COALESCE(problem, '') AS problem,
  status,
  COALESCE(fix_action, '') AS fix_action,
  COALESCE(course_fix_action, '') AS course_fix_action,
  COALESCE(experience, '') AS experience,
  COALESCE(suggestion, '') AS suggestion,
  created_at,
  updated_at
FROM weekly_reports;
