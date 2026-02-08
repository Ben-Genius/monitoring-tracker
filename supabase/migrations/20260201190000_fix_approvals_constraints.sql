-- Fix approvals table constraints
-- Make lead_id nullable since not all approvals require a lead assignment
alter table approvals 
alter column lead_id drop not null;
 