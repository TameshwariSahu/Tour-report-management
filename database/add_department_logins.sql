CREATE TABLE IF NOT EXISTS department_logins (
  id int NOT NULL AUTO_INCREMENT,
  sap_id varchar(8) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  department_name varchar(100) NOT NULL,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY department_name (department_name),
  KEY status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
