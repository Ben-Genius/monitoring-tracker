# EPIC-02: ECAS Accountability Loop, People Deactivation & Governance Engine

## 📋 Overview
The **ECAS (Execution, Control, Accountability, and Supervision) Loop** extends Pulse360 from a passive project management tool into an active operational governance system across our ventures (MacWest, CypressEnergy, Northbrook LRD).

This Epic establishes strict accountability loops for task execution, multi-layered security controls for employee onboarding and deactivation, automated foreign key cascading for invited team members, and an executive stage-transition approvals engine.

---

## 🎯 Goals & Business Objectives
- **Zero Orphaned Tasks**: Enforce task ownership, explicit acceptance, and blocker escalation before tasks become stale.
- **Leak-Proof Access Governance**: Enable real, instant account deactivation that revokes auth tokens, wipes active sessions, and bans sign-ins, with safeguards against locking out the last admin.
- **Seamless Invite Onboarding**: Allow team members to claim pre-imported engineering profiles without database foreign-key crashes, while refusing expired or deactivated accounts.
- **Executive Governance & Auditability**: Require formal administrative approval with justification notes for major project stage transitions (`planning` → `active` → `completed`).
- **Targeted Morning Briefings**: Distribute a priority-tiered exceptions report (`urgent` > `blocked` > `stuck` > `overdue` > `unaccepted`) to leadership without signal noise.

---

## 👤 Epic Use Cases & User Stories

### UC-01: Real-Time Account Deactivation & Session Revocation
- **User Story**: 
  - **As an** Administrator,
  - **I want** to deactivate an employee's access with immediate effect,
  - **So that** departed staff cannot access sensitive project documents, financials, or submit unauthorized updates.
- **Acceptance Criteria**:
  - `set_user_access(p_user uuid, p_active false)` updates `public.users.deactivated_at` and `public.users.deactivated_by`.
  - Database function sets `auth.users.banned_until = '2999-12-31 00:00:00+00'`, preventing any subsequent sign-in or token refresh.
  - Active sessions are immediately purged from `auth.sessions`, invalidating live browser tabs.
  - **Safeguard 1**: An admin cannot deactivate their own active account.
  - **Safeguard 2**: The system raises an exception if attempting to deactivate the last remaining administrator.
  - Changes are recorded in `public.audit_log` under entity type `'user'`.

---

### UC-02: Secure Invite Redemption & Foreign Key Cascade Repointing
- **User Story**:
  - **As an** Invited Engineer or Lead,
  - **I want** to redeem my invitation link and link my new login to my pre-assigned projects and tasks,
  - **So that** all my existing task assignments, notifications, and accountability records carry over without error.
- **Acceptance Criteria**:
  - `accept_invite(p_token text, p_name text)` verifies token validity, expiration, and recipient email matching.
  - If the profile has `deactivated_at IS NOT NULL`, the transaction aborts with `"this account has been deactivated"`.
  - Frontend [SignupPage.tsx](file:///Users/azaygenius/Desktop/Codebase/monitoring-tracker/src/features/auth/pages/SignupPage.tsx) traps deactivation errors, triggers `supabase.auth.signOut()`, and displays a clear explanation.
  - Updating `users.id` to the new `auth.uid()` automatically cascades via `ON UPDATE CASCADE` across:
    - `tasks.acknowledged_by`
    - `tasks.blocked_by`
    - `notifications.actor_id`
    - `notifications.user_id`
    - `brief_items.added_by`

---

### UC-03: Stage Transition Approvals & Governance Engine
- **User Story**:
  - **As an** Administrator or Project Director,
  - **I want** to review, audit, and approve project stage transitions requested by team leads,
  - **So that** projects only proceed when milestones, regulatory compliance, and deliverables are satisfied.
- **Acceptance Criteria**:
  - Approvals command center ([ApprovalsPage.tsx](file:///Users/azaygenius/Desktop/Codebase/monitoring-tracker/src/features/approvals/pages/ApprovalsPage.tsx)) displays a 4-tile KPI ribbon:
    - **Pending Review** (with visual urgency and action-required indicator)
    - **Approved** (completed transition volume)
    - **Declined** (rejected requests requiring revision)
    - **Total Requests** (overall historical throughput)
  - Interactive multi-status segmented tabs (`All Requests`, `Pending`, `Approved`, `Declined`) with live counters.
  - Instant text search across project titles, requester names, emails, and notes.
  - Review drawer requires explicit `<label>` and allows entering audit comments.
  - Approving a `stage_transition` with `project_completion` automatically triggers the transition:
    - `planning` → `active`
    - `active` → `completed`
  - Zero-CLS skeleton loaders prevent layout shift during data fetching.

---

### UC-04: Task Accountability & Exception Escalation
- **User Story**:
  - **As a** Project Lead or Lead Engineer,
  - **I want** team members to explicitly acknowledge assigned tasks and flag blockers with descriptions,
  - **So that** stalled execution is caught within 24–48 hours rather than weeks later.
- **Acceptance Criteria**:
  - Task data model supports ECAS fields:
    - `acknowledged_at` & `acknowledged_by`: records when an assignee accepted the task.
    - `blocked_by` & `blocker_description`: logs why work is paused and who flagged it.
    - `is_urgent`: flags high-risk issues requiring immediate leadership intervention.
    - `next_update_due` & `last_movement_at`: tracks velocity and flags stale items.
  - When a blocker is raised, a notification is dispatched to the team lead (`notifications` table).

---

### UC-05: Executive Morning Brief Engine (Mr. Blay Exceptions)
- **User Story**:
  - **As an** Executive (Mr. Blay) or Executive Assistant (PA),
  - **I want** a consolidated daily briefing containing only critical project exceptions,
  - **So that** leadership attention is directed strictly where intervention is needed.
- **Acceptance Criteria**:
  - Tasks land in exactly one priority-ordered section:
    $$\text{urgent} \succ \text{blocked} \succ \text{stuck} \succ \text{overdue} \succ \text{unaccepted}$$
  - PA can curate and add daily priority items into `public.brief_items`.
  - Accessible brief view with audio playback option, filter by venture, and quick-status actions.

---

### UC-06: People & Workload Oversight Directory
- **User Story**:
  - **As an** Administrator or Company Lead,
  - **I want** to see everyone with access to our company, their open workload, and their invitation status,
  - **So that** I can prevent team overload and maintain clean access controls.
- **Acceptance Criteria**:
  - People directory ([UserManagementPage.tsx](file:///Users/azaygenius/Desktop/Codebase/monitoring-tracker/src/features/users/pages/UserManagementPage.tsx)) supports:
    - Filtering by role: `admin`, `lead`, `employee`.
    - Filtering by access state: `Active`, `Invited`, `Deactivated`.
    - Sorting by Workload (open tasks count, overdue count).
  - Invite modal allows generating scoped invite links with company assignment and role definition.
  - Side panel ([PersonPanel.tsx](file:///Users/azaygenius/Desktop/Codebase/monitoring-tracker/src/features/users/components/PersonPanel.tsx)) displays active tasks, activity log, and deactivation controls.

---

## 🛠️ Technical Implementation & Architecture

### Database Migrations
| Migration File | Description |
|---|---|
| `20261105130000_people_deactivation_and_invite_hardening.sql` | Adds `deactivated_at` and `deactivated_by` to `users`. Adds `user` to `audit_log`. Implements `set_user_access` RPC with session deletion and `banned_until`. |
| `20261105140000_accept_invite_refuses_deactivated.sql` | Hardens `accept_invite` RPC to reject deactivated accounts before account linking. |
| `20261106090000_users_fks_follow_invite_repoint.sql` | Alters foreign key constraints on `tasks`, `notifications`, and `brief_items` to add `ON UPDATE CASCADE`. |

### Integration Verification Matrix
| Test Suite / Assertion | Verification Command | Status |
|---|---|---|
| Core Table Connectivity & Schema | `test-e2e-accountability.mjs [1/5]` | ✅ PASS |
| Cascading Foreign Keys (`tasks`, `notifications`, `brief_items`) | `test-e2e-accountability.mjs [2/5]` | ✅ PASS |
| Deactivation Security & Admin Privilege Safeguards | `test-e2e-accountability.mjs [3/5]` | ✅ PASS |
| Invite Acceptance Token & Deactivation Verification | `test-e2e-accountability.mjs [4/5]` | ✅ PASS |
| Approvals Governance & Stage Transition Map | `test-e2e-accountability.mjs [5/5]` | ✅ PASS |
| TypeScript & Production Bundle Compilation | `npm run build` | ✅ PASS (0 errors) |
| ESLint Rules & Code Style Standards | `npm run lint` | ✅ PASS (0 errors) |

