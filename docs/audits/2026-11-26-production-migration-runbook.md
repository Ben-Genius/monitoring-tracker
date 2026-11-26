# Production migration runbook · 26 Nov 2026

> **Status: done on 26 Nov 2026** through the Supabase connector. All four migrations are applied, each role's visibility is unchanged, and the history is aligned with the repo. The table copies are in the private schema `backup_20261126` (the history before repair is in `backup_20261126.schema_migrations_before_repair`). Still to do: step 6 (auth settings) and renaming the organisation. The steps below are kept for reference.

**Project:** `monitoring-tracker` (`lzywhitaxstskrodbvok`), us-east-2, Postgres 17
**Live data on 26 Nov:** 24 users, 3 companies, 37 projects, 277 tasks.

## What the live database is missing

I checked the live schema with read-only queries. The migration history Supabase keeps does not match the repo, but most of the schema is already there.

| Repo migration | Live schema | In live history? |
|---|---|---|
| `20260804120000` … `20260806120000` (11 files: invites, Baserow sync, archiving) | Applied | No |
| `20261029140000` … `20261105090000` (8 files: ECAS) | Applied | Under different version numbers (`20261029140758` …) |
| `20261105120000_brief_ready` | **Missing:** no `brief_days` table, so "Mark brief ready" fails in production today | No |
| `20261105130000`, `20261105140000`, `20261106090000`, `20261113090000` | Applied | No |
| `20261125120000_organizations_tenant_layer` | Missing | No |
| `20261125130000_self_serve_organisations` | Missing | No |
| `20261125140000_morning_brief_email` | Missing | No |

**Why this matters:** `supabase db push` compares version numbers, not the schema. Pushed as things stand, it would try to re-run 23 migrations that are already applied, some of them non-idempotent, and fail partway through. Repair the history first.

## Steps

### 1. Back up
```bash
supabase link --project-ref lzywhitaxstskrodbvok
```
```bash
supabase db dump --linked -f backup-2026-11-26-schema.sql
```
```bash
supabase db dump --linked --data-only -f backup-2026-11-26-data.sql
```
Keep both files out of git; they contain personal data.

If the project is on a paid plan, also confirm a fresh daily backup exists, or turn on point-in-time recovery, under Database → Backups.

### 2. Repair the migration history
This marks what is already in the schema as applied and removes the remote-only version numbers. It changes only the history table, not the schema.

```bash
supabase migration repair --linked --status reverted 20261029140758 20261029140823 20261029140906 20261030122313 20261030123303 20261030144754 20261031180001 20261031184529 20261031185527 20261105073144
```
```bash
supabase migration repair --linked --status applied 20260804120000 20260804130000 20260804140000 20260805120000 20260805130000 20260805140000 20260805150000 20260805160000 20260805170000 20260806120000 20261029140000 20261029150000 20261029160000 20261030100000 20261030110000 20261031120000 20261031190000 20261105090000 20261105130000 20261105140000 20261106090000 20261113090000
```
Then check that only these four are pending:
```bash
supabase migration list --linked
```
- `20261105120000_brief_ready`
- `20261125120000_organizations_tenant_layer`
- `20261125130000_self_serve_organisations`
- `20261125140000_morning_brief_email`

### 3. Rehearse on a branch first
Create a Supabase branch (Branching, a paid add-on) or restore the backup into a scratch project. Push there, then run the checks in step 5. The CI database job already proves the migrations apply cleanly on an empty database. The branch proves they apply cleanly on the real data.

### 4. Apply to production
```bash
supabase db push --linked
```
This applies the four pending migrations in order. Every existing company and user moves into the default organisation, named "Default organisation" until it's renamed.

### 5. Check
```sql
select (select count(*) from users) users,                                      -- expect 24
       (select count(*) from tasks) tasks,                                      -- expect 277
       (select count(*) from companies where organization_id is null) orphans,  -- expect 0
       (select count(*) from users where organization_id is null and company_id is not null) user_orphans; -- expect 0
update organizations set name = '<your group name>' where slug = 'default';
```
Then:
- Run Supabase → Advisors → Security and check nothing new has appeared.
- Sign in as an executive, a PA, a lead and a member of staff, and confirm each sees the same work as before.

### 6. Auth settings (dashboard, no SQL)
In Authentication:
- Email confirmation **on**.
- Custom SMTP through Resend.
- Redirect URLs include `/welcome` and `/reset-password`.
- CAPTCHA (Turnstile) on.
- **Leaked password protection on**. The advisor reports it is currently off.

### 7. Roll back if needed
- **Front end:** Vercel instant rollback.
- **Database:** restore the backup from step 1. The migrations are forward-only.

## Security advisor, 26 Nov (live)

| Finding | Verdict |
|---|---|
| `get_invite` callable by `anon` | Intended: the invite sign-up page reads the invite before the person has an account. The token is the secret. |
| `accept_invite`, `people_access`, `set_user_access` callable by signed-in users | Intended: each checks the caller's role and organisation inside the function. This is covered by `supabase/tests/tenant_isolation_test.sql` once the tenant migration is applied. |
| Leaked password protection disabled | **Turn on** (step 6). |
