-- Seed Data for General Tasks and Employees
-- This script safely inserts users if they don't exist and then creates tasks with multiple assignees.

DO $$
DECLARE
    -- Company ID (Required for Users)
    v_company_id uuid;

    -- User IDs
    v_japhet_id uuid;
    v_azay_id uuid;
    v_betty_id uuid;
    v_admin_id uuid; -- Added Admin ID
    v_colonel_id uuid;
    v_daniel_id uuid;
    v_francis_id uuid;
    v_eben_id uuid;
    v_jude_id uuid;
    
    -- Task IDs
    v_task1_id uuid;
    v_task2_id uuid;
    v_task3_id uuid;
    v_task4_id uuid;
    v_task5_id uuid;
    v_task6_id uuid;
    v_task7_id uuid;
BEGIN
    -- 0. Get a Company ID (Required for Users)
    -- We'll use the first available company. In production you might want to specify by name.
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company found in database. Please create a company first before seeding users.';
    END IF;


    -- 1. Ensure Users Exist (Idempotent Insert)
    
    -- Japhet
    SELECT id INTO v_japhet_id FROM users WHERE email = 'japhet@internal.com';
    IF v_japhet_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Japhet', 'japhet@internal.com', 'employee', v_company_id) RETURNING id INTO v_japhet_id;
    END IF;

    -- Azay
    SELECT id INTO v_azay_id FROM users WHERE email = 'azay@internal.com';
    IF v_azay_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Azay', 'azay@internal.com', 'lead', v_company_id) RETURNING id INTO v_azay_id;
    END IF;

    -- Admin
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    IF v_admin_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('System Admin', 'admin@internal.com', 'admin', v_company_id) RETURNING id INTO v_admin_id;
    END IF;

    -- Betty
    SELECT id INTO v_betty_id FROM users WHERE email = 'betty@internal.com';
    IF v_betty_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Betty', 'betty@internal.com', 'employee', v_company_id) RETURNING id INTO v_betty_id;
    END IF;

    -- Colonel (replaced Kenneth)
    SELECT id INTO v_colonel_id FROM users WHERE email = 'colonel@internal.com';
    IF v_colonel_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Colonel', 'colonel@internal.com', 'employee', v_company_id) RETURNING id INTO v_colonel_id;
    END IF;

    -- Daniel
    SELECT id INTO v_daniel_id FROM users WHERE email = 'daniel@internal.com';
    IF v_daniel_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Daniel', 'daniel@internal.com', 'employee', v_company_id) RETURNING id INTO v_daniel_id;
    END IF;

    -- Francis Degoil
    SELECT id INTO v_francis_id FROM users WHERE email = 'francis.degoil@internal.com';
    IF v_francis_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Francis Degoil', 'francis.degoil@internal.com', 'employee', v_company_id) RETURNING id INTO v_francis_id;
    END IF;

    -- CSIR - Ebenezar Adjo
    SELECT id INTO v_eben_id FROM users WHERE email = 'ebenezar.adjo@csir.external';
    IF v_eben_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('CSIR - Ebenezar Adjo', 'ebenezar.adjo@csir.external', 'employee', v_company_id) RETURNING id INTO v_eben_id;
    END IF;

    -- Jude
    SELECT id INTO v_jude_id FROM users WHERE email = 'jude@csir.external';
    IF v_jude_id IS NULL THEN
        INSERT INTO users (name, email, role, company_id) VALUES ('Jude', 'jude@csir.external', 'employee', v_company_id) RETURNING id INTO v_jude_id;
    END IF;


    -- 2. Insert Tasks (General Tasks, project_id IS NULL)
    
    -- Task 1
    INSERT INTO tasks (title, description, priority, due_date, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Submit Power Plant Company Letter',
        '- Change name on letter from Michael Blay to Efua
- Call Efua to confirm her official title with Power Plant Company and insert into letter
- Print 2 hard copies and get them signed (one to receive, one to submit)
- Go with Betty to submit the letter
- Follow up with Betty on responses after submission',
        'high',
        '2026-02-03',
        'yet_to_start',
        NULL, -- General Task
        v_japhet_id, -- Primary Assignee
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task1_id;

    -- Assignees for Task 1: Japhet, Azay, Betty
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task1_id, v_japhet_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task1_id, v_azay_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task1_id, v_betty_id) ON CONFLICT DO NOTHING;


    -- Task 2
    INSERT INTO tasks (title, description, priority, due_date, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Deliver District Assembly Letters',
        '- Draft introductory letter to district introducing the project
- Request specific information (similar to Hydra/Met data request)
- Prepare 2 copies and get signed
- Send draft to Boss and project lead for review/approval before delivery
- Arrange delivery to District Assembly (Monday morning preferred)
- Obtain receipt/acknowledged copy',
        'high',
        '2026-02-03',
        'yet_to_start',
        NULL,
        v_japhet_id,
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task2_id;

    -- Assignees for Task 2: Japhet
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task2_id, v_japhet_id) ON CONFLICT DO NOTHING;


    -- Task 3 (Updated for Colonel)
    INSERT INTO tasks (title, description, priority, due_date, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Power Tech Stakeholder Visit Coordination',
        '- Call Francis Degoil to set up meeting with Customs
- Have Francis set up meeting with GPHA
- Confirm warehouse arrangements with Daniel
- Arrange vehicles/transport for team (yourself, Japhet, Mr. Bonsu, others)
- Plan movement schedule (airport → breakfast → office → stakeholders → warehouse)
- Arrange lunch location
- Create detailed internal program with timings
- Post detailed internal timed program on internal page',
        'high',
        '2026-02-04',
        'yet_to_start',
        NULL,
        v_colonel_id, -- Primary Assignee (Colonel)
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task3_id;

    -- Assignees for Task 3: Colonel, Daniel, Francis Degoil
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task3_id, v_colonel_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task3_id, v_daniel_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task3_id, v_francis_id) ON CONFLICT DO NOTHING;


    -- Task 4
    INSERT INTO tasks (title, description, priority, due_date, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Gridco Site Visit',
        '- Liaise with Gridco contact person to confirm visit schedule
- Arrange pickup/vehicle and logistics for site visit
- Accompany Gridco team to project site for feasibility assessment',
        'high',
        '2026-02-05',
        'yet_to_start',
        NULL,
        v_japhet_id,
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task4_id;

    -- Assignees for Task 4: Japhet, Azay
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task4_id, v_japhet_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task4_id, v_azay_id) ON CONFLICT DO NOTHING;


    -- Task 5
    INSERT INTO tasks (title, description, priority, due_date, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'District Assembly Follow-Up',
        '- Visit District Assembly in person to follow up on Monday''s letter
- Use receipt copy from Monday''s submission',
        'medium',
        '2026-02-06',
        'yet_to_start',
        NULL,
        v_japhet_id,
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task5_id;

    -- Assignees for Task 5: Japhet
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task5_id, v_japhet_id) ON CONFLICT DO NOTHING;


    -- Task 6
    INSERT INTO tasks (title, description, priority, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Water Sampling Coordination',
        '- Work with CSIR - Ebenezar Adjo and Jude
- Send Jude the water sampling requirements/parameters
- Obtain quotation from Jude for sampling and testing
- Organize mobilization/logistics for Jude to visit project site
- Arrange for Jude to take water samples per requirements',
        'medium',
        'yet_to_start',
        NULL,
        v_japhet_id,
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task6_id;

    -- Assignees for Task 6: Japhet, Azay, CSIR - Ebenezar Adjo, Jude
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task6_id, v_japhet_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task6_id, v_azay_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task6_id, v_eben_id) ON CONFLICT DO NOTHING;
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task6_id, v_jude_id) ON CONFLICT DO NOTHING;


    -- Task 7
    INSERT INTO tasks (title, description, priority, stage, project_id, assignee_id, created_at, created_by)
    VALUES (
        'Regular Status Updates',
        '- Follow up closely on all assigned tasks
- Provide regular updates to Colonel (and as directed by Boss)',
        'medium',
        'in_progress', -- Ongoing -> in_progress
        NULL,
        v_japhet_id,
        NOW(),
        v_admin_id
    ) RETURNING id INTO v_task7_id;

    -- Assignees for Task 7: Japhet
    INSERT INTO task_assignees (task_id, user_id) VALUES (v_task7_id, v_japhet_id) ON CONFLICT DO NOTHING;

END $$;
