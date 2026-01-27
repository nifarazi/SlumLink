CREATE DATABASE IF NOT EXISTS slumlink
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE slumlink;


CREATE TABLE organizations (
  org_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  org_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,

  org_age INT UNSIGNED NOT NULL,

  password VARCHAR(100) NOT NULL,

  status ENUM('pending','accepted','rejected','suspended')
    NOT NULL DEFAULT 'pending',

  license_filename VARCHAR(255) NOT NULL,
  license_mimetype VARCHAR(100) NOT NULL,
  license_size BIGINT UNSIGNED NOT NULL,

  license_file LONGBLOB NOT NULL
);

-- ==================================================
-- Slum dwellers, spouses, children and requests
-- ==================================================

-- Main slum dwellers table (applications + accounts)
CREATE TABLE IF NOT EXISTS slum_dwellers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,  -- Assigned after insert via trigger in format SR######
  slum_code VARCHAR(8) DEFAULT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20),
  nid VARCHAR(30),
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  education VARCHAR(100),
  occupation VARCHAR(100),
  income VARCHAR(50),
  area VARCHAR(150),
  district VARCHAR(150),
  division VARCHAR(150),
  family_members INT UNSIGNED DEFAULT 0,
  -- account/application lifecycle
  status ENUM('pending','accepted','rejected','suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Spouse records. New additions/removals should be requested via the
-- `change_requests` table; `status` indicates current state.

CREATE TABLE IF NOT EXISTS spouses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  nid VARCHAR(30),
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  mobile VARCHAR(20),
  marriage_certificate LONGBLOB,
  divorce_certificate LONGBLOB,
  -- 'pending_add' used if inserted tentatively; prefer using change_requests
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
);


-- Children records. Same lifecycle as spouses.
drop TABLE IF EXISTS children;
CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  dob DATE,
  gender ENUM('Male','Female','Others') DEFAULT NULL,
  education VARCHAR(100),
  job VARCHAR(100),
  income VARCHAR(50),
  preferred_job VARCHAR(150),
  birth_certificate LONGBLOB,
  death_certificate LONGBLOB,
  status ENUM('active','pending_add','pending_remove') NOT NULL DEFAULT 'pending_add',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE
);

-- Requests created by slum dwellers for add/remove spouse/child or profile edits.
-- Admins review these and apply the approved changes.

-- ==================================================
-- Trigger: generate `slum_code` in format SR + zero-padded 6-digit id
-- ==================================================
DELIMITER $$
CREATE TRIGGER trg_slum_dwellers_after_insert
AFTER INSERT ON slum_dwellers
FOR EACH ROW
BEGIN
  -- update the generated slum_code based on the auto-increment id
  UPDATE slum_dwellers
    SET slum_code = CONCAT('SR', LPAD(NEW.id, 6, '0'))
    WHERE id = NEW.id;
END$$
DELIMITER ;

SELECT * FROM slum_dwellers;
SELECT * FROM spouses;
SELECT * FROM children;
SELECT * FROM organizations;

drop table spouses;
drop table children;
drop table slum_dwellers;

-- Fix for the slum_dwellers trigger error
-- Drop the problematic AFTER INSERT trigger
DROP TRIGGER IF EXISTS trg_slum_dwellers_after_insert;

-- Create a new BEFORE INSERT trigger that sets slum_code before insertion
DELIMITER $$
CREATE TRIGGER trg_slum_dwellers_before_insert
BEFORE INSERT ON slum_dwellers
FOR EACH ROW
BEGIN
  -- We can't use NEW.id because it's not assigned yet (AUTO_INCREMENT)
  -- So we'll use a different approach: set slum_code to NULL and update after
  -- Actually, let's compute the next ID value
  DECLARE next_id BIGINT;
  
  SELECT IFNULL(MAX(id), 0) + 1 INTO next_id FROM slum_dwellers;
  SET NEW.slum_code = CONCAT('SR', LPAD(next_id, 6, '0'));
END$$
DELIMITER ;


-- Add documents table for tracking new document uploads by residents
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- 'marriage_certificate', 'birth_certificate', 'nid_scan', etc.
  document_title VARCHAR(150),
  file_blob LONGBLOB NOT NULL,
  file_mimetype VARCHAR(100),
  file_size BIGINT UNSIGNED,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(150), -- Admin email or name
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,
  INDEX idx_slum_status (slum_id, status),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
