-- Multi-tenant step 1: organisations.
--
-- Until now the whole database was one customer: three companies, and the
-- global roles (admin, executive, pa) could see every company in the database.
-- This adds an organisation above companies and confines everyone to their own.
--
-- How isolation works: every tenant table gets ONE restrictive policy,
-- "Same organisation only". Postgres ANDs restrictive policies with all the
-- permissive ones, so the existing policies (including the wide
-- has_global_access() ones) keep working inside an organisation but can never
-- reach across one. Nothing existing is rewritten except the SECURITY DEFINER
-- functions, which bypass RLS and so need their own organisation filter.
--
-- Fails closed: a row whose organisation cannot be worked out, or a user with
-- no organisation (or a deactivated one), sees nothing.
--
-- Everything that exists today goes into one organisation, "Default
-- organisation". Rename it with:
--   update organizations set name = '…', slug = '…' where slug = 'default';

BEGIN;

-- Policies call private.* helpers, which run with the caller's privileges.
GRANT USAGE ON SCHEMA private TO authenticated;

-- ── Organisations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  -- How the brief addresses the executive ("Mr Blay"). Null falls back to the
  -- executive's own name, then to "the executive".
  executive_title TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.organizations (id, name, slug, executive_title)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default organisation', 'default', 'Mr Blay')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS brand_primary   TEXT CHECK (brand_primary   ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS brand_secondary TEXT CHECK (brand_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS brand_accent    TEXT CHECK (brand_accent    ~ '^#[0-9A-Fa-f]{6}$');

UPDATE public.companies SET organization_id = '00000000-0000-4000-8000-000000000001'
 WHERE organization_id IS NULL;
ALTER TABLE public.companies ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON public.companies(organization_id);

-- Company colours used to be hardcoded in src/lib/utils.ts. They are data now.
UPDATE public.companies SET brand_primary = '#8B0000', brand_secondary = '#000000', brand_accent = '#FCA311'
 WHERE brand_primary IS NULL AND name ILIKE 'macwest%';
UPDATE public.companies SET brand_primary = '#006837', brand_secondary = '#F58220', brand_accent = '#4ADE80'
 WHERE brand_primary IS NULL AND name ILIKE 'cypress%';
UPDATE public.companies SET brand_primary = '#1E3A8A', brand_secondary = '#334155', brand_accent = '#38BDF8'
 WHERE brand_primary IS NULL AND name ILIKE 'northbrook%';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.users u SET organization_id = c.organization_id
  FROM public.companies c
 WHERE c.id = u.company_id AND u.organization_id IS NULL;
-- Global roles with no company belong to the only organisation there is today.
UPDATE public.users SET organization_id = '00000000-0000-4000-8000-000000000001'
 WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);

-- ── Helpers ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can look up a row's organisation without
-- tripping over the caller's own RLS (and without policy recursion).

CREATE OR REPLACE FUNCTION private.current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT organization_id FROM public.users
   WHERE id = auth.uid() AND deactivated_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION private.company_org(p_company UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT organization_id FROM public.companies WHERE id = p_company;
$$;

CREATE OR REPLACE FUNCTION private.project_org(p_project UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.organization_id FROM public.projects p
    JOIN public.companies c ON c.id = p.company_id
   WHERE p.id = p_project;
$$;

-- A task belongs to its project's company, or to its own company when it has
-- no project (see 20260805120000_fix_projectless_task_visibility.sql).
CREATE OR REPLACE FUNCTION private.task_org(p_task UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(pc.organization_id, tc.organization_id)
    FROM public.tasks t
    LEFT JOIN public.projects  p  ON p.id  = t.project_id
    LEFT JOIN public.companies pc ON pc.id = p.company_id
    LEFT JOIN public.companies tc ON tc.id = t.company_id
   WHERE t.id = p_task;
$$;

CREATE OR REPLACE FUNCTION private.user_org(p_user UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT organization_id FROM public.users WHERE id = p_user;
$$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'private.current_org_id()', 'private.company_org(uuid)', 'private.project_org(uuid)',
    'private.task_org(uuid)', 'private.user_org(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- New companies land in the creator's organisation unless told otherwise
-- (and the restrictive policy below refuses any other).
ALTER TABLE public.companies ALTER COLUMN organization_id SET DEFAULT private.current_org_id();

-- ── A user's organisation always follows their company ─────────────────────
-- Without this, anyone allowed to edit their own row could point it at
-- another organisation. Global roles with no company keep the organisation
-- they have; only the service role or a migration (no auth.uid()) can set it.

CREATE OR REPLACE FUNCTION private.sync_user_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    NEW.organization_id := (SELECT organization_id FROM public.companies WHERE id = NEW.company_id);
  ELSIF auth.uid() IS NOT NULL THEN
    NEW.organization_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.organization_id ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.sync_user_organization() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_user_organization_trigger ON public.users;
CREATE TRIGGER sync_user_organization_trigger
  BEFORE INSERT OR UPDATE OF company_id, organization_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_user_organization();

-- ── Brief days are per organisation ────────────────────────────────────────
-- brief_date alone was the key, which would give every customer one shared
-- "ready" flag per day.

ALTER TABLE public.brief_days
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.brief_days SET organization_id = '00000000-0000-4000-8000-000000000001'
 WHERE organization_id IS NULL;
ALTER TABLE public.brief_days
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.brief_days DROP CONSTRAINT IF EXISTS brief_days_pkey;
ALTER TABLE public.brief_days ADD CONSTRAINT brief_days_pkey PRIMARY KEY (organization_id, brief_date);

-- ── Same organisation only ─────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their organisation" ON public.organizations;
CREATE POLICY "Members can view their organisation" ON public.organizations
  FOR SELECT TO authenticated USING (id = (SELECT private.current_org_id()));
DROP POLICY IF EXISTS "Admins can update their organisation" ON public.organizations;
CREATE POLICY "Admins can update their organisation" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = (SELECT private.current_org_id()) AND (SELECT private.current_user_role()) = 'admin')
  WITH CHECK (id = (SELECT private.current_org_id()));
GRANT SELECT, UPDATE ON public.organizations TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- table,               expression that yields the row's organisation
    ('companies',           'organization_id'),
    ('projects',            'private.company_org(company_id)'),
    ('pipeline_projects',   'private.company_org(company_id)'),
    ('tasks',               'COALESCE(private.project_org(project_id), private.company_org(company_id))'),
    ('milestones',          'private.project_org(project_id)'),
    ('project_comments',    'private.project_org(project_id)'),
    ('project_attachments', 'private.project_org(project_id)'),
    ('approvals',           'private.project_org(project_id)'),
    ('subtasks',            'private.task_org(task_id)'),
    ('task_comments',       'private.task_org(task_id)'),
    ('task_assignees',      'private.task_org(task_id)'),
    ('brief_items',         'private.task_org(task_id)'),
    ('notifications',       'private.user_org(user_id)'),
    ('audit_log',           'private.user_org(user_id)'),
    ('pending_invites',     'private.company_org(company_id)'),
    ('brief_days',          'organization_id')
  ) AS t(tbl, org_expr)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Same organisation only" ON public.%I', r.tbl);
    EXECUTE format(
      'CREATE POLICY "Same organisation only" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (%s = (SELECT private.current_org_id())) '
      'WITH CHECK (%s = (SELECT private.current_org_id()))',
      r.tbl, r.org_expr, r.org_expr);
  END LOOP;
END $$;

-- Users: same idea, but a signed-in person can always see their own row, even
-- before they have an organisation (the signup and invite flows need that).
DROP POLICY IF EXISTS "Same organisation only" ON public.users;
CREATE POLICY "Same organisation only" ON public.users
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organization_id = (SELECT private.current_org_id()) OR id = auth.uid())
  WITH CHECK (organization_id = (SELECT private.current_org_id()) OR id = auth.uid());

-- ── SECURITY DEFINER functions bypass RLS: filter them by hand ─────────────

-- Notifications for PAs went to every PA in the database.
CREATE OR REPLACE FUNCTION private.notify_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_name TEXT;
  v_stage_label TEXT;
  v_recipients UUID[];
  v_title TEXT := NEW.title;
  v_org UUID;
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  v_org := private.task_org(NEW.id);
  SELECT name INTO v_actor_name FROM public.users WHERE id = v_actor;
  v_actor_name := COALESCE(v_actor_name, 'Someone');

  SELECT array_agg(DISTINCT r) INTO v_recipients FROM (
    SELECT NEW.created_by AS r
    UNION SELECT id FROM public.users WHERE role = 'pa' AND organization_id = v_org
  ) s WHERE r IS NOT NULL AND r <> v_actor;

  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id <> v_actor
     AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    VALUES (NEW.assignee_id, NEW.id, v_actor, 'assigned',
            v_actor_name || ' assigned you a task', v_title);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    v_stage_label := CASE NEW.stage
      WHEN 'yet_to_start' THEN 'Yet to start' WHEN 'in_progress' THEN 'In progress'
      WHEN 'blockers' THEN 'Blocked' WHEN 'completed' THEN 'Done' ELSE NEW.stage END;
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor,
           CASE WHEN NEW.stage = 'blockers' THEN 'blocked' ELSE 'stage_changed' END,
           v_actor_name || ' moved a task to ' || v_stage_label,
           v_title || CASE WHEN NEW.stage = 'blockers' AND NEW.blocker_description IS NOT NULL
                           THEN ' — ' || NEW.blocker_description ELSE '' END
    FROM unnest(v_recipients) r;
  END IF;

  IF NEW.stage = 'blockers' AND NEW.blocked_by IS NOT NULL AND NEW.blocked_by <> v_actor
     AND (NEW.blocked_by IS DISTINCT FROM OLD.blocked_by OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    VALUES (NEW.blocked_by, NEW.id, v_actor, 'blocking_you',
            v_actor_name || ' is waiting on you',
            v_title || COALESCE(' — ' || NEW.blocker_description, ''));
  END IF;

  IF NEW.progress_percent IS DISTINCT FROM OLD.progress_percent AND NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor, 'progress',
           v_actor_name || ' updated progress to ' || NEW.progress_percent || '%', v_title
    FROM unnest(v_recipients) r;
  END IF;

  IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor, 'accepted', v_actor_name || ' accepted a task', v_title
    FROM unnest(v_recipients) r;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.notify_task_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_author TEXT;
  v_org UUID;
BEGIN
  IF NEW.kind = 'status_update' THEN RETURN NEW; END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  SELECT name INTO v_author FROM public.users WHERE id = NEW.user_id;
  v_org := private.task_org(NEW.task_id);
  INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
  SELECT DISTINCT r, NEW.task_id, NEW.user_id,
         CASE WHEN NEW.kind = 'nudge' THEN 'nudge' ELSE 'comment' END,
         CASE WHEN NEW.kind = 'nudge' THEN COALESCE(v_author, 'The executive') || ' left a note on your task'
              ELSE COALESCE(v_author, 'Someone') || ' commented' END,
         v_task.title || ': ' || left(NEW.comment, 140)
  FROM (
    SELECT v_task.assignee_id AS r
    UNION SELECT v_task.created_by
    UNION SELECT id FROM public.users
           WHERE role = 'pa' AND NEW.kind = 'nudge' AND organization_id = v_org
  ) s
  WHERE r IS NOT NULL AND r <> NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.notify_task_comment() FROM PUBLIC, anon, authenticated;

-- people_access listed every user in the database to any global role.
CREATE OR REPLACE FUNCTION public.people_access()
RETURNS TABLE (user_id UUID, has_login BOOLEAN, last_sign_in_at TIMESTAMPTZ, deactivated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT u.id, au.id IS NOT NULL, au.last_sign_in_at, u.deactivated_at
    FROM public.users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.id = auth.uid()
          AND me.deactivated_at IS NULL
          AND me.organization_id = u.organization_id
          AND (
              me.role IN ('admin', 'executive', 'pa')
              OR (me.role = 'lead' AND me.company_id = u.company_id)
          )
    );
$$;
REVOKE ALL ON FUNCTION public.people_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.people_access() TO authenticated;

-- set_user_access let an admin deactivate anyone in the database, and counted
-- "the last admin" across every customer.
CREATE OR REPLACE FUNCTION public.set_user_access(p_user UUID, p_active BOOLEAN)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_me     UUID := auth.uid();
    v_org    UUID;
    v_target public.users%ROWTYPE;
    v_when   TIMESTAMPTZ := CASE WHEN p_active THEN NULL ELSE now() END;
BEGIN
    SELECT organization_id INTO v_org FROM public.users
     WHERE id = v_me AND role = 'admin' AND deactivated_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'only an admin can change who can sign in';
    END IF;

    IF p_user = v_me THEN
        RAISE EXCEPTION 'you cannot deactivate your own account';
    END IF;

    SELECT * INTO v_target FROM public.users WHERE id = p_user;
    -- Someone in another organisation gets the same answer as someone who
    -- does not exist, so the function cannot be used to probe for ids.
    IF NOT FOUND OR v_target.organization_id IS DISTINCT FROM v_org THEN
        RAISE EXCEPTION 'that person no longer exists';
    END IF;

    IF NOT p_active AND v_target.role = 'admin'
       AND NOT EXISTS (SELECT 1 FROM public.users
                        WHERE role = 'admin' AND deactivated_at IS NULL
                          AND organization_id = v_org AND id <> p_user) THEN
        RAISE EXCEPTION 'at least one admin must keep access';
    END IF;

    UPDATE public.users
       SET deactivated_at = v_when,
           deactivated_by = CASE WHEN p_active THEN NULL ELSE v_me END,
           updated_at = now()
     WHERE id = p_user;

    UPDATE auth.users
       SET banned_until = CASE WHEN p_active THEN NULL ELSE '2999-12-31 00:00:00+00'::TIMESTAMPTZ END
     WHERE id = p_user;

    IF NOT p_active THEN
        DELETE FROM auth.sessions WHERE user_id = p_user;
    END IF;

    INSERT INTO public.audit_log (entity_type, entity_id, action, field, old_value, new_value, summary, user_id)
    VALUES ('user', p_user, 'status_changed', 'access',
            CASE WHEN p_active THEN 'deactivated' ELSE 'active' END,
            CASE WHEN p_active THEN 'active' ELSE 'deactivated' END,
            CASE WHEN p_active THEN 'Restored access for ' ELSE 'Deactivated ' END || v_target.name,
            v_me);

    RETURN v_when;
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_access(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_access(UUID, BOOLEAN) TO authenticated;

COMMIT;
