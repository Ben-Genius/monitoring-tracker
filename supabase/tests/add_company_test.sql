-- Adding a company: admins only, always into their own organisation.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated, anon;
CREATE FUNCTION tests.check(label TEXT, ok BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;
CREATE FUNCTION tests.refused(label TEXT, stmt TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok  % (refused: %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: % (was allowed)', label;
END $$;
CREATE FUNCTION tests.sign_in(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, anon;

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'admin@home.test', 'Admin', 'admin',    'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000d1', 'lead@home.test',  'Lead',  'lead',     'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'adm@other.test',  'Out',   'admin',    'e1000000-0000-4000-8000-000000000001');

-- Not an admin: refused.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000d1');
SET LOCAL ROLE authenticated;
SELECT tests.refused('leads cannot add companies', $$SELECT add_company('Side business')$$);
RESET ROLE;

-- Signed out: refused (anon has no execute right at all).
SET LOCAL ROLE anon;
SELECT tests.refused('anonymous callers cannot add companies', $$SELECT add_company('Nope')$$);
RESET ROLE;

-- An admin adds one: it lands in their own organisation.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
SELECT add_company('  Asante Energy  ');
RESET ROLE;
SELECT tests.check('new company is in the admin''s organisation, name trimmed',
  EXISTS (SELECT 1 FROM companies WHERE name = 'Asante Energy' AND organization_id = '00000000-0000-4000-8000-000000000001'));

SET LOCAL ROLE authenticated;
SELECT tests.refused('duplicate names are refused, ignoring case', $$SELECT add_company('asante energy')$$);
SELECT tests.refused('blank names are refused', $$SELECT add_company('   ')$$);
SELECT tests.check('the admin can see the new company',
  EXISTS (SELECT 1 FROM companies WHERE name = 'Asante Energy'));
RESET ROLE;

-- Another organisation's admin can use the same name; it goes into their organisation, and they can't see ours.
SELECT tests.sign_in('ee000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
SELECT add_company('Asante Energy');
SELECT tests.check('other organisation sees only its own copy',
  (SELECT count(*) FROM companies WHERE name = 'Asante Energy') = 1);
RESET ROLE;
SELECT tests.check('each organisation has its own company',
  (SELECT count(DISTINCT organization_id) FROM companies WHERE name = 'Asante Energy') = 2);

-- Sign-up in a new organisation can reuse a name another customer already has.
INSERT INTO companies (name, organization_id) VALUES ('Home Co', 'e0000000-0000-4000-8000-00000000000e');
SELECT tests.check('same name allowed in a different organisation',
  (SELECT count(*) FROM companies WHERE name = 'Home Co') = 2);
SELECT tests.refused('same name refused within one organisation, ignoring case',
  $$INSERT INTO companies (name, organization_id) VALUES ('HOME CO', '00000000-0000-4000-8000-000000000001')$$);

ROLLBACK;
