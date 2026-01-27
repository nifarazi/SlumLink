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


CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id BIGINT UNSIGNED NOT NULL,

  title VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  target_slum_area VARCHAR(150) NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL,

  target_gender ENUM('Any','Male','Female','Others') NOT NULL DEFAULT 'Any',
  age_group VARCHAR(60) NOT NULL,
  description TEXT,

  status ENUM('PENDING','IN_PROGRESS','COMPLETED','NOT_EXECUTED','CANCELLED')
    NOT NULL DEFAULT 'PENDING',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_campaign_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,

  INDEX idx_campaign_org (org_id),
  INDEX idx_campaign_status (status),
  INDEX idx_campaign_dates (start_date, end_date)
);

-- Aid types
CREATE TABLE IF NOT EXISTS aid_types (
  aid_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  requires_quantity TINYINT(1) NOT NULL DEFAULT 0,
  unit_label VARCHAR(40) NULL
);

INSERT IGNORE INTO aid_types (name, requires_quantity, unit_label) VALUES
('Food', 1, 'pack'),
('Clothing', 1, 'pcs'),
('Medicine', 1, 'pcs'),
('Cash', 1, 'BDT'),
('Skill Training', 0, NULL),
('Job Placement', 0, NULL);

-- Distribution sessions (Start Distribution)
CREATE TABLE IF NOT EXISTS distribution_sessions (
  session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  aid_type_id INT UNSIGNED NOT NULL,

  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,

  performed_by VARCHAR(150) NULL,

  CONSTRAINT fk_session_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,

  CONSTRAINT fk_session_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,

  CONSTRAINT fk_session_aid_type
    FOREIGN KEY (aid_type_id) REFERENCES aid_types(aid_type_id),

  INDEX idx_session_campaign (campaign_id),
  INDEX idx_session_org (org_id),
  INDEX idx_session_status (status)
);

-- Distribution entries (Aid History)
CREATE TABLE IF NOT EXISTS distribution_entries (
  entry_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  session_id BIGINT UNSIGNED NOT NULL,
  campaign_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,

  family_code VARCHAR(8) NOT NULL,  
  quantity INT UNSIGNED NULL,
  comment VARCHAR(500) NULL,

  distributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verification_method ENUM('CODE','QR') NOT NULL DEFAULT 'CODE',

  CONSTRAINT fk_entry_session
    FOREIGN KEY (session_id) REFERENCES distribution_sessions(session_id) ON DELETE CASCADE,

  CONSTRAINT fk_entry_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,

  CONSTRAINT fk_entry_org
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,

  CONSTRAINT fk_entry_family
    FOREIGN KEY (family_code) REFERENCES slum_dwellers(slum_code) ON DELETE RESTRICT,

  UNIQUE KEY uq_session_family (session_id, family_code),

  INDEX idx_family_history (family_code, distributed_at),
  INDEX idx_org_history (org_id, distributed_at),
  INDEX idx_campaign_history (campaign_id, distributed_at)
);

-- ==================================================
-- Complaints table
-- ==================================================
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slum_id VARCHAR(8) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(150) NOT NULL,
  attachment_filename VARCHAR(255) NOT NULL,
  attachment_mimetype VARCHAR(100) NOT NULL,
  attachment_size BIGINT UNSIGNED NOT NULL,
  attachment_file LONGBLOB NOT NULL,
  status ENUM('pending', 'in progress', 'resolved') NOT NULL DEFAULT 'pending',
  responded_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_complaint_dweller
    FOREIGN KEY (slum_id) REFERENCES slum_dwellers(slum_code) ON DELETE CASCADE,
  
  INDEX idx_complaint_slum (slum_id),
  INDEX idx_complaint_status (status),
  INDEX idx_complaint_created (created_at DESC)
);

SELECT * FROM complaints;