# Database performance tune-up

From the live Supabase performance advisor on 26 Nov 2026.

> **Status: applied to production on 26 Nov 2026.** Every role's access is unchanged: admin, executive, PA, lead and staff each see identical counts on 10 tables. The migration history matches the repo's 43 files.
>
> **Speed** (production, average of 20 runs, before → after):
> - Task list: staff 22 → 10 ms, admin 14 → 10 ms, lead 15 → 14 ms.
> - Steps: staff 36 → 20 ms, admin 28 → 20 ms, lead 21 → 20 ms.
>
> **Advisor warnings:** 32 per-row user checks, 19 duplicate-rule warnings and 18 unindexed foreign keys, all now 0. What remains is informational: the `backup_20261126` copies (drop when ready) and indexes not yet used, which is expected at this data size.
>
> **Project file deletes:** the migration keeps today's behaviour, where any company member can delete any project file. Restricting it to the uploader or an admin is a separate decision.

## 1. Access rules that recheck the signed-in user on every row (about 30 rules)
Wrap `auth.uid()` in a subquery, as `(select auth.uid())`, so Postgres works it out once per query instead of once per row. Behaviour is unchanged.

## 2. Duplicate read and write rules: merge without changing who sees what
- **Identical duplicates (drop one of each pair):**
  - `project_attachments`: "Company members can read project_attachments" is the same as "Users can view attachments on projects in their company".
  - `project_comments`: "Company members can read project_comments" is the same as "Users can view comments on projects in their company".
- **Read rules already covered by a write rule with the same condition (drop the read rule):** the "Company members can read …" rules on approvals, milestones, subtasks and pipeline_projects.
- **Rule pairs to combine into one rule joined with OR:**
  - the global-role and company read rules on tasks, projects, users, companies, pipeline_projects and task_comments
  - the INSERT and UPDATE rule pairs on tasks
- **Split write rules so they stop also granting reads:**
  - `brief_days`, `brief_items`: split "PA and admin write …" into separate INSERT, UPDATE and DELETE rules.
  - `task_dependencies`: split "Plan links …" into INSERT and DELETE rules.

## 3. Security gap found during the audit (fix with this work)
- **Insert rules:** `project_comments` and `project_attachments` each have a loose insert rule beside a strict one. Because Postgres allows an insert if any rule passes, a signed-in person can insert a comment or file record under another person's id.
  - Drop "Users can create comments on projects in their company" and "Users can upload attachments to projects in their company".
  - The strict rules stay. They require `user_id` (comments) or `uploaded_by` (files) to equal `auth.uid()`, and the app already sets both: `useProjectDetails.ts` for comments, `ProjectDetailPage.tsx:94` for files.
- **Delete rules:** `project_attachments` has two. The broad "… from projects in their company" lets any company member delete any file. The intended rule (`20260803130000_fix_rls_security_gaps.sql`) allows only the uploader or an admin. Dropping the broad rule changes behaviour, so it needs your decision.

## 4. Foreign keys with no index (18)
Add an index for each foreign key the advisor lists. This is cheap and changes no behaviour.

## How to ship it
1. Write all of the above as one migration.
2. Run `scripts/test-db.sh`, and add checks that each role sees exactly what it saw before.
3. Apply it after re-running the per-role visibility comparison on live data, the same way as for the tenant migration.
