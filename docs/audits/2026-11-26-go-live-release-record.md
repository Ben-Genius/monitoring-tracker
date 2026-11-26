# Release: feat/multi-tenant-orgs (uncommitted working tree) · Tier 3 · 26 Nov 2026

**Decision:** NO-GO (for public launch)

There's no P0, and every check that could run locally passes. Under the gate rules, though, two open P1s and a failed Security & privacy gate mean NO-GO:
- **D1:** no privacy notice.
- **D2:** live email confirmation is unconfirmed.

Neither needs code. Once they're closed and the end-to-end run below passes, this becomes a GO, or a CONDITIONAL GO with the P2s owned and dated.

**Scope:**
- Organisations, with each company's data kept separate
- Self-serve sign-up with a sample project
- Password reset
- Installable app that opens offline
- 7am morning brief email
- Code splitting and page preloading
- My work page
- PostHog usage tracking
- Public landing page, with login moved to `/login`

**Tier 3 because:** it changes sign-in, adds three database migrations (one rewrites primary keys and access rules), handles personal data (names, emails, usage events) and sends email.

| Gate | Status | Evidence |
|---|---|---|
| A Functionality | **Not reviewed** | **Run locally:** 68 of 68 SQL checks pass on a fresh Postgres with every migration applied (`scripts/test-db.sh`, exit 0). They cover tenant isolation, sign-up, sample data removal and the email brief functions. Typecheck passes for both app and API, and the production build passes. **Not run:** sign-up, invite, reset, brief and update flows against the real Supabase. The migrations aren't applied there and no test login was available. My work was checked only in a local harness with sample data. |
| B Usability & design | **Not reviewed** (signed-in pages) / Pass (public pages) | **Public pages** (landing, `/login`, `/start`): checked at 375 px and desktop, in light and dark mode. No sideways scroll and no placeholder copy. Loading, empty and error states are present on `/start` and `/welcome`. **Signed-in pages:** My work, Settings and Analytics were not seen with real data. |
| C Accessibility | **Partial**, so Not reviewed | **Measured on the public pages after fixes:** no text contrast failures, `<main>` and one `<h1>` present, no unlabelled inputs or unnamed buttons, focus visible on keyboard tab. **Fixed this session:** login button and brand text were 2.6:1 and are now 5.0:1. The decorative login collage is now hidden from screen readers. The sign-up and reset cards got a `<main>` and `<h1>`. **Not done:** screen reader pass, 200% zoom, and the signed-in pages. |
| D Performance | **Partial** | **Lab only:** local preview, no throttling. Transferred on first load: landing page 19 KB, `/login` 412 KB. Layout shift: 0.001 on landing, 0 on `/login`. Projects code went from 400 KB to 48 KB, and Analytics from 431 KB to 18 KB. PostHog loads after the page is idle. **LCP not measured:** the preview browser didn't report it. Field data won't exist until PostHog is switched on. |
| E Security & privacy | **Fail until the conditions below are met** | **Pass:** no secrets in the build or tracked files. The only key in the bundle has the public `anon` role. RLS isolation tests pass. The email and unsubscribe endpoints fail closed without their secret or a valid signature. PostHog sends ids only, with autocapture and replay off. **Added this session:** security headers (`nosniff`, `frame-ancestors 'none'`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`). **Dependencies:** `npm audit fix` cleared 12 of 17 advisories. Five remain: xlsx (high, no fix exists), zod (high, needs a breaking v4 upgrade), react-router (moderate, open redirect, needs a v7 upgrade), and esbuild (low, dev only). **Open:** live Supabase auth settings not reviewed (the connector is disconnected), and there is no privacy notice. |
| F Reliability & release readiness | **Partial** | **Pass:** `/api/ping` health check exists. The email job is idempotent: each person gets at most one email per day, and failed sends are retried. Vercel can roll back the front end instantly. **Open:** no error monitoring or alerting. The migrations are forward-only with no down scripts. The Resend batch call with `List-Unsubscribe` headers has not been sent for real. |

## Open defects

| ID | Sev | Issue | Owner | Fix |
|---|---|---|---|---|
| D1 | **P1** (partly closed) | **Drafted 26 Nov:** [privacy.html](../../privacy.html) (`/privacy`) and [terms.html](../../terms.html) (`/terms`). They are linked from the landing page, `/start`, `/login`, the invite email and the morning brief email. **Still open:** fill the highlighted placeholders (legal company name, registered address, DPC registration number, Supabase region, privacy and support emails), have a Ghanaian lawyer review both, confirm the retention periods, and register with the Data Protection Commission. | Product / legal | Fill the placeholders, get legal sign-off, register with the DPC. |
| D2 | **P1** | **Checked live 26 Nov with read-only queries:** project `lzywhitaxstskrodbvok` (us-east-2). The security advisor reports leaked-password protection is **off**. Email confirmation can't be read through the API, so check it in the dashboard. | Engineering | Follow step 6 of [the production migration runbook](2026-11-26-production-migration-runbook.md): email confirmation, Resend SMTP, redirect URLs, Turnstile, leaked-password protection. |
| D3 | ~~P2~~ Fixed | xlsx prototype-pollution and ReDoS advisories. **Fixed 26 Nov:** replaced it with read-excel-file 9.3.20 (MIT, maintained), via [rowsToRecords.ts](../../src/features/import/utils/rowsToRecords.ts). The reader chunk went from 429 KB to 66 KB. It also fixes a bug: the old library imported dates as Excel serial numbers (26 Nov 2026 came through as `46351.9999`), which the database rejected. They now arrive as `2026-11-26`. Old `.xls` files get a clear "save as .xlsx or CSV" message. Tested in Node and in the browser on an .xlsx with numbers, dates, empty cells, an empty row and Ghanaian characters. | Engineering | Done |
| D4 | ~~P2~~ Fixed | react-router-dom open-redirect advisory. **Fixed 26 Nov:** upgraded to v7.18.7 and removed the v6 opt-in flags, which are now the default. All 11 public and app routes smoke-tested in the production preview. | Engineering | Done |
| D5 | P2 | No error monitoring, so a broken sign-up or email job would go unseen. | Engineering | Add Sentry or similar, alert on `/api/send-morning-briefs` failures, and watch Vercel logs for the first week. |
| D6 | ~~P2~~ Resolved | Landing-page claims, now checked. Free = "one company" **holds as built**: only `create_organization` creates a company, and database rules block clients from adding more, so extra companies for Group customers are added by your team. "Pay by Mobile Money or card" matches the terms (invoiced; no in-app billing needed). | Product | Done; keep invoicing manual until billing exists |
| D7 | ~~P3~~ Fixed | zod memory-exhaustion advisory. **Fixed 26 Nov:** upgraded to zod 4.6.7, moved `invalid_type_error` to `error`, and checked that every form message is unchanged. | Engineering | Done |
| D8 | P3 | 34 existing lint warnings (one fewer after the import change). | Engineering | Backlog. |
| D9 | ~~P1~~ Closed | **Applied to production 26 Nov.** Before: per-role visibility baseline recorded, and every public table copied to the private schema `backup_20261126`. Applied in order: `brief_ready`, `organizations_tenant_layer`, `self_serve_organisations`, `morning_brief_email`. After: admin, executive, PA, lead and staff each see exactly the same task, project, user, company, comment, notification, invite, brief and milestone counts as before. A rolled-back rehearsal showed a new sign-up sees only its own sample data, sample removal works, and the PA can't see the new organisation. Migration history now matches the repo's 39 files exactly. | Engineering | Done. Drop `backup_20261126` once the release is confirmed. |

**Counts:** P0 0 · P1 2 · P2 1 · P3 1 (D3, D4, D6, D7, D9 closed). Dependencies: production audit has 1 low advisory left (esbuild, Windows dev server only).

## Conditions to move to GO

1. **Take a backup first.** Before migrating, take a Supabase backup or turn on point-in-time recovery. The migrations are forward-only, so a restore is the only way back.
2. **Follow [the production migration runbook](2026-11-26-production-migration-runbook.md)** (back up, repair the history, rehearse on a branch, push). It applies these in order:
   1. `20261105120000_brief_ready`
   1. `20261125120000_organizations_tenant_layer`
   2. `20261125130000_self_serve_organisations`
   3. `20261125140000_morning_brief_email`
3. **Fix D2's settings in Supabase** (owner: Engineering).
4. **Close D1:** fill the placeholders in `/privacy` and `/terms`, get legal sign-off, and register with the DPC (owner: Product/legal).
5. **On a Vercel preview deploy, run these journeys end to end:**
   - landing → Start free → confirm email → `/welcome` → dashboard with the sample banner
   - invite → accept → My work → Accept → post 50% → Done with proof
   - forgot password → reset
   - `/api/send-morning-briefs?test=<id>` arrives, and its unsubscribe link works
   - a deep link such as `/tasks` loads the app
   - the app opens offline after one visit
6. **Set the environment variables in Vercel:**
   - `APP_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `RESEND_API_KEY`
   - `BRIEF_FROM_EMAIL`
   - `VITE_PUBLIC_POSTHOG_KEY`
   - `VITE_PUBLIC_SALES_URL`
7. **Reset the compromised Android upload key** in Play Console, and change the old test passwords that were in the repo.

## Not reviewed
- **End-to-end journeys** on the target environment: no deploy, migrations not applied, no test login.
- **Live Supabase auth settings:** the Supabase connector failed to connect.
- **Screen reader, 200% zoom, and the signed-in pages** for accessibility.
- **LCP and field Web Vitals.**

## Approvals required
Engineering lead · QA · Product · Security (Tier 3). None have been given; this record doesn't sign for anyone.

## After release (first 72 h)
- **Watch:**
  - Vercel function errors on `send-morning-briefs`, `brief-unsubscribe` and `send-invite`
  - Supabase auth logs (sign-ups per hour)
  - the PostHog funnel: `organization_created`, then `user_invited`, then `task_update_posted`
  - Resend bounces and complaints
- **Roll back if:**
  - any cross-organisation data appears
  - sign-up fails for more than 5% of attempts
  - the morning email goes to the wrong people, or twice
- **Front end:** use Vercel instant rollback.
- **Database:** restore from the backup taken in condition 1. You can also turn off the email cron by removing it from `vercel.json` and redeploying.
