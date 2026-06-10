ALTER TABLE tour_reports
  ADD COLUMN referred_hospital_name varchar(150) DEFAULT NULL AFTER purpose,
  ADD COLUMN leave_availed enum('Yes','No') DEFAULT NULL AFTER railway_availability,
  ADD COLUMN leave_details varchar(255) DEFAULT NULL AFTER leave_availed;
