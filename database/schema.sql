CREATE DATABASE IF NOT EXISTS tour_report_management;
USE tour_report_management;

CREATE TABLE IF NOT EXISTS admins (
  id int NOT NULL AUTO_INCREMENT,
  sap_id varchar(8) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS employees (
  id int NOT NULL AUTO_INCREMENT,
  sap_id varchar(8) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  email varchar(150) NOT NULL UNIQUE,
  designation varchar(100) NOT NULL,
  grade varchar(20) NOT NULL,
  department varchar(100) NOT NULL,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY status (status)
);

CREATE TABLE IF NOT EXISTS employee_otps (
  id int NOT NULL AUTO_INCREMENT,
  employee_id int NOT NULL,
  otp_code varchar(6) NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp NULL DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employee_id (employee_id),
  KEY otp_code (otp_code),
  CONSTRAINT employee_otps_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS master_grades (
  id int NOT NULL AUTO_INCREMENT,
  grade_name varchar(20) NOT NULL UNIQUE,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS master_departments (
  id int NOT NULL AUTO_INCREMENT,
  department_name varchar(100) NOT NULL UNIQUE,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS master_destinations (
  id int NOT NULL AUTO_INCREMENT,
  destination_name varchar(150) NOT NULL UNIQUE,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tour_reports (
  id int NOT NULL AUTO_INCREMENT,
  employee_id int DEFAULT NULL,
  sap_id varchar(8) NOT NULL,
  name varchar(100) DEFAULT NULL,
  designation varchar(100) DEFAULT NULL,
  grade varchar(20) DEFAULT NULL,
  department varchar(100) DEFAULT NULL,
  tour_type varchar(50) DEFAULT NULL,
  purpose varchar(255) DEFAULT NULL,
  referred_hospital_name varchar(150) DEFAULT NULL,
  medical_reference_no varchar(100) DEFAULT NULL,
  medical_reference_date date DEFAULT NULL,
  patient_name varchar(100) DEFAULT NULL,
  patient_relation varchar(50) DEFAULT NULL,
  escort_employee_sap_id varchar(8) DEFAULT NULL,
  return_vehicle_required enum('Yes','No') DEFAULT NULL,
  railway_availability varchar(255) DEFAULT NULL,
  leave_availed enum('Yes','No') DEFAULT NULL,
  leave_details varchar(255) DEFAULT NULL,
  start_date date DEFAULT NULL,
  start_time time DEFAULT NULL,
  start_place varchar(150) DEFAULT NULL,
  end_date date DEFAULT NULL,
  end_time time DEFAULT NULL,
  destination varchar(150) DEFAULT NULL,
  mode_of_travel varchar(50) DEFAULT NULL,
  weekly_off varchar(20) DEFAULT NULL,
  approving_authority varchar(100) DEFAULT NULL,
  approval_note_path varchar(255) DEFAULT NULL,
  approval_note_name varchar(255) DEFAULT NULL,
  combined_pdf_path varchar(255) DEFAULT NULL,
  combined_pdf_name varchar(255) DEFAULT NULL,
  status enum('Draft','Pending','Approved','Rejected') NOT NULL DEFAULT 'Draft',
  rejection_reason text DEFAULT NULL,
  approved_by int DEFAULT NULL,
  approved_at timestamp NULL DEFAULT NULL,
  submitted_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sap_id (sap_id),
  KEY status (status),
  KEY start_date (start_date),
  KEY employee_id (employee_id),
  KEY approved_by (approved_by),
  CONSTRAINT tour_reports_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT tour_reports_admin_fk FOREIGN KEY (approved_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS tour_supporting_documents (
  id int NOT NULL AUTO_INCREMENT,
  tour_report_id int NOT NULL,
  file_name varchar(255) NOT NULL,
  file_path varchar(255) NOT NULL,
  file_type varchar(100) DEFAULT NULL,
  uploaded_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tour_report_id (tour_report_id),
  CONSTRAINT support_docs_report_fk FOREIGN KEY (tour_report_id) REFERENCES tour_reports(id) ON DELETE CASCADE
);

INSERT IGNORE INTO master_grades (grade_name)
VALUES ('RS1'), ('RS2'), ('RS3'), ('RS4'), ('RS5'), ('RS6'), ('RS7'), ('RS8');

INSERT IGNORE INTO master_departments (department_name)
VALUES ('C & IT'), ('Civil'), ('Electrical'), ('Mechanical'), ('Finance'), ('HR');

INSERT IGNORE INTO master_destinations (destination_name)
VALUES ('Bangalore'), ('Hyderabad'), ('Delhi'), ('Mumbai'), ('Raipur'), ('Nagpur'), ('Vishakhapatnam'), ('Mysore'), ('Ooty'), ('Goa');


