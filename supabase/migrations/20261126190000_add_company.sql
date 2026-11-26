-- Most organisations are one business, so sign-up now creates a single
-- company named after the organisation. Groups that run several businesses
-- add the others later: add_company() lets an organisation's admin do that
-- from Settings. The company always goes into the caller's own organisation.
--

-- It also fixes company names being unique across every customer: since
-- sign-up names the company after the organisation, a second customer called
-- "Acme" would be refused (and learn that the name was taken elsewhere).
-- Names are now unique within one organisation, ignoring case.

BEGIN;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS companies_org_name_key ON public.companies (organization_id, lower(name));

CREATE OR REPLACE FUNCTION public.add_company(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org UUID;
  v_id  UUID;
BEGIN
  SELECT organization_id INTO v_org
    FROM public.users
   WHERE id = auth.uid() AND role = 'admin' AND deactivated_at IS NULL;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'only an admin can add a company';
  END IF;

  p_name := btrim(p_name);
  IF coalesce(p_name, '') = '' OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'company name must be 1 to 120 characters';
  END IF;
  IF EXISTS (SELECT 1 FROM public.companies WHERE organization_id = v_org AND lower(name) = lower(p_name)) THEN
    RAISE EXCEPTION 'you already have a company called %', p_name;
  END IF;

  INSERT INTO public.companies (name, organization_id) VALUES (p_name, v_org) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_company(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_company(TEXT) TO authenticated;

COMMIT;
