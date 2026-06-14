-- DUMMY DATA SCRIPT

-- =====================================================
-- 1. PROJECTS
-- =====================================================

-- MacWest Projects
INSERT INTO public.projects (id, name, description, company_id, status, contract_value, actual_cost, expected_handover, created_by, created_at) VALUES 
('a1000000-0000-0000-0000-000000000001', 'Highway 401 Expansion', 'Expanding lanes and resurfacing.', 'ea1bab43-515e-4e66-b772-d909da83c2d7', 'active', 5500000.00, 1200000.00, '2026-12-01', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', NOW() - INTERVAL '30 days'),
('a1000000-0000-0000-0000-000000000002', 'Downtown High-rise Foundation', 'Foundation work for 40-story building.', 'ea1bab43-515e-4e66-b772-d909da83c2d7', 'completed', 2800000.00, 2650000.00, '2026-05-15', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', NOW() - INTERVAL '180 days');

-- CypressEnergy Projects
INSERT INTO public.projects (id, name, description, company_id, status, contract_value, actual_cost, expected_handover, created_by, created_at) VALUES 
('a2000000-0000-0000-0000-000000000001', 'Solar Farm Alpha', 'Installation of 50MW solar panel array.', 'af20c4a3-49cf-45fb-b8ca-e7cc05cdd55c', 'active', 12500000.00, 4300000.00, '2027-03-10', '241d8c15-ae01-49b3-b096-baac01eecb27', NOW() - INTERVAL '45 days'),
('a2000000-0000-0000-0000-000000000002', 'Wind Turbine Maintenance', 'Annual maintenance for offshore wind farm.', 'af20c4a3-49cf-45fb-b8ca-e7cc05cdd55c', 'planning', 850000.00, 0, '2026-10-20', '241d8c15-ae01-49b3-b096-baac01eecb27', NOW() - INTERVAL '5 days');

-- Northbrook LRD Projects
INSERT INTO public.projects (id, name, description, company_id, status, contract_value, actual_cost, expected_handover, created_by, created_at) VALUES 
('a3000000-0000-0000-0000-000000000001', 'Riverside Residential Complex', 'Development of 120-unit luxury apartments.', '2314405a-7551-41c3-9df6-3177262781f6', 'active', 35000000.00, 15000000.00, '2028-01-01', '683ae3a9-25ce-4369-80fc-a4cd572828c0', NOW() - INTERVAL '120 days'),
('a3000000-0000-0000-0000-000000000002', 'Commercial Plaza Phase 1', 'Retail space and parking garage construction.', '2314405a-7551-41c3-9df6-3177262781f6', 'on_hold', 8500000.00, 1200000.00, '2027-06-30', '683ae3a9-25ce-4369-80fc-a4cd572828c0', NOW() - INTERVAL '60 days');


-- =====================================================
-- 2. TASKS
-- =====================================================

-- Tasks for MacWest "Highway 401 Expansion"
INSERT INTO public.tasks (id, title, description, project_id, assignee_id, stage, priority, created_by, created_at, updated_at) VALUES 
(gen_random_uuid(), 'Site Survey and Environmental Assessment', 'Initial survey of the expansion route.', 'a1000000-0000-0000-0000-000000000001', 'a887beca-afeb-4619-a7c5-628ff0460eaa', 'completed', 'high', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'Paving Sector A', 'Lay down asphalt for the first 5km stretch.', 'a1000000-0000-0000-0000-000000000001', 'a887beca-afeb-4619-a7c5-628ff0460eaa', 'in_progress', 'critical', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'Procure Highway Barriers', 'Order concrete barriers from supplier.', 'a1000000-0000-0000-0000-000000000001', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', 'blockers', 'high', 'b24a09a1-cbf2-49a8-a3a6-8eea1696b13d', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days');

-- Tasks for CypressEnergy "Solar Farm Alpha"
INSERT INTO public.tasks (id, title, description, project_id, assignee_id, stage, priority, created_by, created_at, updated_at) VALUES 
(gen_random_uuid(), 'Clear land and grade terrain', 'Prepare the site for panel mounting structures.', 'a2000000-0000-0000-0000-000000000001', '30265384-4b36-44a2-be95-8851d30aeb2a', 'in_progress', 'medium', '241d8c15-ae01-49b3-b096-baac01eecb27', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'Install Mounting Racks', 'Erect the aluminum racks for the first 10,000 panels.', 'a2000000-0000-0000-0000-000000000001', '30265384-4b36-44a2-be95-8851d30aeb2a', 'yet_to_start', 'high', '241d8c15-ae01-49b3-b096-baac01eecb27', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'Grid Connection Approval', 'Finalize paperwork with local utility company.', 'a2000000-0000-0000-0000-000000000001', '241d8c15-ae01-49b3-b096-baac01eecb27', 'talking_stage', 'medium', '241d8c15-ae01-49b3-b096-baac01eecb27', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Tasks for Northbrook LRD "Riverside Residential Complex"
INSERT INTO public.tasks (id, title, description, project_id, assignee_id, stage, priority, created_by, created_at, updated_at) VALUES 
(gen_random_uuid(), 'Pour Concrete Foundation', 'Complete pouring for blocks A and B.', 'a3000000-0000-0000-0000-000000000001', '9bf7022f-be59-45f5-8c8b-e9bb0f088f6c', 'completed', 'critical', '683ae3a9-25ce-4369-80fc-a4cd572828c0', NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'Erect Steel Frame - Block A', 'Complete structural steel work for the main tower.', 'a3000000-0000-0000-0000-000000000001', '9bf7022f-be59-45f5-8c8b-e9bb0f088f6c', 'in_progress', 'high', '683ae3a9-25ce-4369-80fc-a4cd572828c0', NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), 'Plumbing Rough-in', 'Install main water lines for ground floor.', 'a3000000-0000-0000-0000-000000000001', '9bf7022f-be59-45f5-8c8b-e9bb0f088f6c', 'yet_to_start', 'medium', '683ae3a9-25ce-4369-80fc-a4cd572828c0', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');
