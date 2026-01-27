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
