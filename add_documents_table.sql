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
