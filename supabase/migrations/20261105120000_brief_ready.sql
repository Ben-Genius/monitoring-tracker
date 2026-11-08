-- The PA marks a day's brief as ready, so Mr Blay can tell a finished brief from
-- one still being put together. Items stay in brief_items; this records only the
-- day's state. Same access rules as brief_items: global roles read, PA and admin write.

CREATE TABLE IF NOT EXISTS public.brief_days (
  brief_date  DATE PRIMARY KEY,
  ready_at    TIMESTAMPTZ,
  ready_by    UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brief_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global roles read brief days" ON public.brief_days;
CREATE POLICY "Global roles read brief days" ON public.brief_days
  FOR SELECT TO authenticated USING ((SELECT private.has_global_access()));

DROP POLICY IF EXISTS "PA and admin write brief days" ON public.brief_days;
CREATE POLICY "PA and admin write brief days" ON public.brief_days
  FOR ALL TO authenticated
  USING (COALESCE((SELECT u.role IN ('admin','pa') FROM public.users u WHERE u.id = auth.uid()), false))
  WITH CHECK (COALESCE((SELECT u.role IN ('admin','pa') FROM public.users u WHERE u.id = auth.uid()), false));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_days TO authenticated;
