SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tour_reports' AND COLUMN_NAME = 'leave_start_date') = 0,
  'ALTER TABLE tour_reports ADD COLUMN leave_start_date date DEFAULT NULL AFTER leave_details',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tour_reports' AND COLUMN_NAME = 'leave_end_date') = 0,
  'ALTER TABLE tour_reports ADD COLUMN leave_end_date date DEFAULT NULL AFTER leave_start_date',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
