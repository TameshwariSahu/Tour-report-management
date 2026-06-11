ALTER TABLE users
  CHANGE sap_id user_id varchar(20) NOT NULL;

ALTER TABLE users
  ADD COLUMN role enum('admin','department') NOT NULL DEFAULT 'admin' AFTER password;

ALTER TABLE users
  ADD COLUMN department_name varchar(100) DEFAULT NULL AFTER role;

ALTER TABLE users
  ADD COLUMN status enum('active','inactive') NOT NULL DEFAULT 'active' AFTER department_name;

ALTER TABLE users
  ADD KEY role (role);

ALTER TABLE users
  ADD KEY status (status);

INSERT IGNORE INTO users (user_id, password, role, department_name, status)
SELECT sap_id, password, 'department', department_name, status
FROM department_logins;
