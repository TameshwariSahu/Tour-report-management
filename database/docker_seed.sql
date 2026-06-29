USE tour_report_management;

INSERT IGNORE INTO users (user_id, password, role, department_name, status)
VALUES
  ('ADMIN_CIT', '$2a$10$8Yy3Aw3O1bsHmkz9q04VPek1ASpRov.KV0NjVfeqU/Z/Z1he9ranW', 'admin', NULL, 'active');

INSERT IGNORE INTO employees (sap_id, name, email, designation, grade, department, status)
VALUES
  ('87654321', 'Tameshwari Sahu', 'tameshwari@example.com', 'Engineer', 'RS8', 'C & IT', 'active'),
  ('12345678', 'Devendra Singh', 'devendra@example.com', 'Sr Manager', 'JO', 'C & IT', 'active');
