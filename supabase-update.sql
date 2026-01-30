-- =====================================================
-- SIMPLE FIX: Just update the company names
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check what companies exist
SELECT * FROM companies;

-- Update existing company names to correct ones
UPDATE companies 
SET name = 'MacWest', 
    description = 'MacWest Construction and Engineering' 
WHERE name IN ('Macwest', 'macwest');

UPDATE companies 
SET name = 'CypressEnergy', 
    description = 'CypressEnergy Infrastructure Development' 
WHERE name IN ('Cypress', 'cypress');

UPDATE companies 
SET name = 'Northbrook LRD', 
    description = 'Northbrook LRD Property Development' 
WHERE name IN ('Northbrook', 'northbrook');

-- Verify the changes
SELECT * FROM companies;
