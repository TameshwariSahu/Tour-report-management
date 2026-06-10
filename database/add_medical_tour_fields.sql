ALTER TABLE tour_reports
  ADD COLUMN medical_reference_no varchar(100) DEFAULT NULL AFTER purpose,
  ADD COLUMN medical_reference_date date DEFAULT NULL AFTER medical_reference_no,
  ADD COLUMN patient_name varchar(100) DEFAULT NULL AFTER medical_reference_date,
  ADD COLUMN patient_relation varchar(50) DEFAULT NULL AFTER patient_name,
  ADD COLUMN escort_employee_sap_id varchar(8) DEFAULT NULL AFTER patient_relation,
  ADD COLUMN return_vehicle_required enum('Yes','No') DEFAULT NULL AFTER escort_employee_sap_id,
  ADD COLUMN railway_availability varchar(255) DEFAULT NULL AFTER return_vehicle_required;
