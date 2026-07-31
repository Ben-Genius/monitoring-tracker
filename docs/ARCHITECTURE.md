# Monitoring Tracker — Architecture & Feature Documentation

**Version:** 1.0.0  
**Currency:** GHS (Ghanaian Cedi)  
**Stack:** Vite + React 18 + TypeScript · Supabase (PostgreSQL) · Tailwind CSS · shadcn/ui · Zustand + React Query · Recharts · Lucide Icons

---

## 1. Epic Overview

Monitoring Tracker is a multi-company project and productivity tracking system built for managing construction, logistics, energy, and infrastructure projects in Ghana. It provides real-time visibility into project health, task execution, financial performance, and team productivity across three operational companies:

| Company | Theme Color | Primary Focus |
|---|---|---|
| MacWest (MacWest Company Limited) | Indigo | Construction & infrastructure |
| CypressEnergy (Cypress Energy Solutions) | Purple | Energy & logistics |
| Northbrook LRD (Northbrook LRD Limited) | Pink | Mining & manpower |

### Core Purpose

Replace fragmented project tracking (spreadsheets, email, separate tools) with a unified, role-based command center that:
- Bridges **Admin oversight** (all companies) with **Lead autonomy** (per-company project management)
- Tracks **5-stage task workflow** from initial pitching (Talking Stage) through to Completion
- Computes **real-time project progress** via a weighted formula blending task completion and milestone achievement
- Flags **idle tasks** automatically after 48 hours of no stage movement
- Provides **financial health metrics** (contract value vs. actual cost, profitability ratios)
- Logs every state change in an **audit trail** for compliance and retrospectives

---

## 2. User Roles & Authentication

### Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Admin** | Global (all companies) | Full CRUD on all entities, approve/reject stage transitions, manage users, import data, access all company data |
| **Lead** | Own company | Create/manage projects and tasks, request stage transitions, manage milestones, add comments |
| **Employee** | Own company | View assigned tasks, update task stage, add subtasks, leave comments |

### Authentication Flow

1. Supabase Auth handles password-based login
2. On sign-in, the app fetches the user's profile row from the `users` table (id, email, name, role, company_id)
3. Authorization is enforced via PostgreSQL Row-Level Security (RLS) — all queries check that the user's `company_id` matches the data's owning company
4. The `useAuth` Zustand store (`src/features/auth/hooks/useAuth.ts`) manages session state globally

### Test Accounts

All use password `Test123!`:

| Email | Role | Company |
|---|---|---|
| `admin@example.com` | Admin | All |
| `lead@example.com` | Lead | MacWest |
| `lead.cypress@example.com` | Lead (Sarah Mensah) | CypressEnergy |
| `lead.northbrook@example.com` | Lead (Esi Amartey) | Northbrook LRD |

---

## 3. Database Schema

The database is a Supabase PostgreSQL instance with Row-Level Security enabled on all application tables. Below are only the tables core to the monitoring tracker (the public schema also contains unrelated `as_*`, `profiles`, `accounts`, `cards`, `transactions` tables from a separate app).

### Core Tables

#### `companies`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| name | TEXT | Unique |
| description | TEXT | Nullable |
| created_at / updated_at | TIMESTAMPTZ | |

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, references auth.users |
| email | TEXT | Unique |
| name | TEXT | |
| role | TEXT | Check: 'admin', 'lead', 'employee' |
| company_id | UUID | FK → companies.id, nullable |
| avatar_url | TEXT | Nullable |
| created_at / updated_at | TIMESTAMPTZ | |

#### `projects`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | |
| description | TEXT | Nullable |
| company_id | UUID | FK → companies.id |
| status | TEXT | Check: 'active', 'completed', 'on_hold' |
| service_type | TEXT | Nullable, check: 'construction', 'logistics', 'technical', 'manpower', 'energy', 'mining', 'infrastructure', 'consulting', 'other' |
| contract_value | NUMERIC | |
| actual_cost | NUMERIC | Default 0 |
| expected_handover | DATE | |
| start_date | DATE | Nullable |
| created_by | UUID | FK → users.id |
| created_at / updated_at | TIMESTAMPTZ | |

#### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| title | TEXT | |
| description | TEXT | Nullable |
| project_id | UUID | FK → projects.id, nullable (supports general tasks) |
| assignee_id | UUID | FK → users.id |
| stage | TEXT | Check: 'talking_stage', 'yet_to_start', 'in_progress', 'blockers', 'completed' |
| priority | TEXT | Check: 'low', 'medium', 'high', 'critical' |
| due_date | DATE | Nullable |
| estimated_hours | NUMERIC | Nullable |
| actual_hours | NUMERIC | Nullable |
| tags | TEXT[] | Nullable |
| blocker_description | TEXT | Nullable |
| started_at | TIMESTAMPTZ | Nullable |
| completed_at | TIMESTAMPTZ | Nullable |
| created_by | UUID | FK → users.id |
| created_at / updated_at | TIMESTAMPTZ | |

#### `task_assignees`
| Column | Type | Notes |
|---|---|---|
| task_id | UUID | FK → tasks.id |
| user_id | UUID | FK → users.id |
| assigned_at | TIMESTAMPTZ | |
| PK | (task_id, user_id) | Composite |
| Plus auto-increment `id` column | | |

#### `subtasks`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, CASCADE delete |
| title | TEXT | |
| is_completed | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

#### `task_comments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id |
| user_id | UUID | FK → users.id |
| comment | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | |

#### `milestones`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| name | TEXT | |
| description | TEXT | Nullable |
| due_date | DATE | Nullable |
| completed_date | DATE | Nullable |
| status | TEXT | Check: 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'. Auto-set to 'overdue' when past due_date |
| created_by | UUID | FK → users.id |
| created_at / updated_at | TIMESTAMPTZ | |

#### `project_comments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| project_id | UUID | FK → projects.id, CASCADE delete |
| user_id | UUID | FK → users.id |
| content | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | |

#### `project_attachments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| project_id | UUID | FK → projects.id, CASCADE delete |
| file_name | TEXT | |
| file_type | TEXT | |
| file_size | INTEGER | |
| url | TEXT | |
| uploaded_by | UUID | FK → users.id |
| created_at | TIMESTAMPTZ | |

#### `approvals`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| project_id | UUID | FK → projects.id |
| requester_id | UUID | FK → users.id |
| approved_by | UUID | FK → users.id, nullable |
| lead_id | UUID | FK → users.id, nullable |
| type | TEXT | |
| title | TEXT | Nullable |
| content | TEXT | |
| entity_type | TEXT | |
| entity_id | UUID | |
| status | TEXT | Check: 'pending', 'approved', 'rejected' |
| comments | TEXT | Nullable |
| created_at / updated_at | TIMESTAMPTZ | |

#### `pipeline_projects`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | |
| client_name | TEXT | |
| company_id | UUID | FK → companies.id |
| estimated_value | NUMERIC | |
| probability | INTEGER | 0–100 |
| stage | TEXT | Check: 'lead', 'qualified', 'proposal', 'negotiation', 'contract' |
| expected_close_date | DATE | Nullable |
| notes | TEXT | Nullable |
| created_by | UUID | FK → users.id, nullable |
| created_at / updated_at | TIMESTAMPTZ | |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| type | TEXT | Check: 'idle_task', 'profitability_alert', 'task_assigned', 'mention' |
| title | TEXT | |
| message | TEXT | |
| link | TEXT | Nullable |
| read | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

#### `audit_log`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| entity_type | TEXT | Check: 'project', 'task', 'milestone', 'approval', 'import' |
| entity_id | UUID | |
| action | TEXT | Check: 'created', 'updated', 'deleted', 'stage_changed', 'status_changed', 'imported' |
| field | TEXT | Nullable, name of the changed field |
| old_value | TEXT | Nullable |
| new_value | TEXT | Nullable |
| summary | TEXT | Human-readable description |
| user_id | UUID | FK → users.id, nullable |
| created_at | TIMESTAMPTZ | |

---

## 4. Feature Modules

### 4.1 Authentication (`src/features/auth/`)
- Zustand store for session state (`useAuthStore`)
- `LoginPage` — split-screen premium login with testimonials
- `SignupPage` — invitation-only registration
- `ProtectedRoute` — wraps layout, redirects to login if unauthenticated

### 4.2 Dashboard (`src/features/dashboard/`)
Central command center with:
- **KPI Cards** — Total task actions, open tasks, on-time delivery rate, profitability
- **Revenue Chart** — Monthly contract value trend (Recharts)
- **Recent Projects** — Company-themed project cards with profitability bars
- **Idle Tasks Alert** — Tasks with no stage change for 48+ hours, with one-click navigation
- **Task Progress** — Per-stage breakdown (Talking Stage → Completed)
- **Pipeline Overview** — Deal value by stage (lead → contract)

### 4.3 Projects (`src/features/projects/`)
Full project lifecycle management:
- **ProjectsPage** — Filterable/sortable project grid with search, compound AND filters, sort by name/status/value/date, company-themed cards, CSV/Excel import button
- **ProjectDetailPage** — Rich hero section (service badge, progress bar, timeline), tabs for:
  - **Overview** — Executive summary (KPIs, milestones), strategic milestones (checkable, addable, deletable, auto-overdue detection), ProjectTimeline component showing task + milestone progress
  - **Tasks** — Per-stage counts, task list with click-to-open TaskDrawer
  - **Discussion** — Collaboration feed with comments
  - **Activity** — Audit log timeline feed
  - **Vault** — Attachment grid
- **ProjectTimeline** — Visual stage progression with task counts and milestone percentage

#### Progress Calculation (`useProjectProgress`)
Weighted formula: **Progress = (Task Progress × 0.6) + (Milestone Progress × 0.4)**
- Task stage weights: completed=100%, in_progress=50%, blockers=30%, talking_stage=10%, yet_to_start=0%
- Milestone progress = completed milestones / total milestones

### 4.4 Tasks (`src/features/tasks/`)
- **TaskBoardPage** — Kanban board with 5 swimlanes (drag-and-drop stage updates), task drawer, create task modal
- **TaskDrawer** — Full task details with inline editing, assignee management, subtasks, comments, stage transitions
- **CreateTaskModal** — Task creation with multi-assignee support
- Hooks: `useTasks`, `useTask`, `useCreateTask`, `useUpdateTask`, `useUpdateTaskStage`, `useSubtasks`, `useTaskComments`

### 4.5 Milestones (`src/features/projects/hooks/useMilestones.ts`)
Integrated into project overview. Hooks: `useMilestones`, `useCreateMilestone`, `useUpdateMilestone`, `useDeleteMilestone`. Milestones auto-detect overdue status client-side by comparing `due_date` with current date.

### 4.6 Approvals (`src/features/approvals/`)
Stage transition workflow:
- Leads request transitions (e.g., Planning → Active, Active → Completed)
- Admins approve/reject from the ApprovalsPage
- `useApprovals`, `useCreateApproval`, `useUpdateApprovalStatus`

### 4.7 Audit Log (`src/features/audit/`)
Tracks all state changes automatically:
- **Hook:** `useAuditLog` (per entity), `useRecentAuditLogs` (dashboard feed)
- **Logger:** `supabaseLog()` — standalone async function callable from mutation functions (logs created/updated/deleted/stage_changed/status_changed events)
- **Integration Points:** Project create/update (status + budget), milestone create/update/delete, task create/update/stage change
- **UI:** `AuditFeed` component — timeline layout with action-type icons, color-coded badges, user attribution, relative timestamps; displayed in the ProjectDetailPage "Activity" tab

### 4.8 Analytics (`src/features/analytics/`)
- Comprehensive dashboards with Recharts
- Revenue trends, project distribution, profitability analysis
- Task completion rates, stage distribution, team performance

### 4.9 Pipeline (`src/features/pipeline/`)
Sales opportunity tracking:
- 5-stage pipeline (Lead → Qualified → Proposal → Negotiation → Contract)
- Estimated value tracking with probability percentages
- Expected close date management

### 4.10 Reports (`src/features/reports/`)
- Financial reports and summaries
- Performance metrics export

### 4.11 Filters (`src/features/filters/`)
Reusable filter/sort system:
- `useFilters` hook — manages filter state, compound AND logic, sort field/direction
- `FilterBar` component — search input, filter chips, sort dropdown, URL-param integration
- Applied on ProjectsPage

### 4.12 Import (`src/features/import/`)
CSV/Excel bulk import:
- `useImport` hook — papaparse + xlsx parsing, auto column mapping, batch upsert
- `ImportModal` — drag-and-drop file upload, entity-type selector (projects/tasks/milestones), preview table with mapped columns, import execution
- Accessible from ProjectsPage

### 4.13 Settings (`src/features/settings/`)
- User profile management
- Company configuration
- Notification preferences

### 4.14 User Management (`src/features/users/`)
- Admin-only user CRUD
- Role assignment, company assignment
- User listing and search

---

## 5. UI Component System

### Base Components (`src/components/ui/`)
Built on shadcn/ui with Radix primitives:
- `Button` — Multiple variants, sizes, loading state
- `Card` / `CardHeader` / `CardContent` — Flexible card system
- `Badge` — Status/priority/label display
- `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` — Tab navigation
- `ProgressBar` — 4 sizes (sm/md/lg/xl), 5 variants (default/success/warning/danger/info), label placement (inside/right/bottom), animate-on-mount

### Layout (`src/components/layout/`)
- `DashboardLayout` — Collapsible sidebar + header wrapper for all authenticated pages
- Sidebar with navigation links, company context, user profile
- Responsive (collapsible on mobile)

### Common (`src/components/common/`)
- `LoadingSpinner` — sizes: sm/md/lg

### Company Theming (`src/lib/utils.ts`)
Each company gets a unique color palette:
- **MacWest:** Indigo (#4338CA)
- **Cypress Energy:** Purple (#7C3AED)
- **Northbrook LRD:** Pink (#DB2777)
- **Global View (Admin):** Slate (#64748B)
- `getCompanyTheme(name)` returns `{ primary, light, gradient, label }`

---

## 6. Routing

| Path | Component | Access |
|---|---|---|
| `/` | LoginPage | Public |
| `/signup` | SignupPage | Public |
| `/dashboard` | DashboardPage | Authenticated |
| `/projects` | ProjectsPage | Authenticated |
| `/projects/:id` | ProjectDetailPage | Authenticated |
| `/tasks` | TaskBoardPage | Authenticated |
| `/analytics` | AnalyticsPage | Authenticated |
| `/pipeline` | PipelinePage | Authenticated |
| `/reports` | ReportsPage | Authenticated |
| `/settings` | SettingsPage | Authenticated |
| `/approvals` | ApprovalsPage | Authenticated |
| `/users` | UserManagementPage | Authenticated |

---

## 7. Key Architecture Decisions

### State Management
- **Zustand** for global state (auth session, sidebar state)
- **React Query** (@tanstack/react-query) for all server data fetching and mutations
  - Automatic cache invalidation on mutations
  - 5-minute stale time, no refetch on window focus

### RLS Security Model
Every table has Row-Level Security enabled. Policies use a `get_auth_company_id()` helper function to scope data access:
- SELECT: User can only see rows where `company_id = get_auth_company_id()` (or admin bypass)
- INSERT/UPDATE/DELETE: Same company-scoped check
- Admin role bypasses company restrictions for global operations

### Audit Logging
- Written at the hook level (inside mutation functions), not via database triggers
- Uses a standalone `supabaseLog()` utility to avoid React hook constraints
- Silently fails — logging never breaks the primary operation
- Indexed on `(entity_type, entity_id)` and `(created_at DESC)`

### Currency
All financial values in GHS (Ghanaian Cedi). Configurable in `src/lib/utils.ts`:8 via `formatCurrency`.

---

## 8. Development

### Commands
```bash
npm run dev       # Start dev server (port 5174)
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint
```

### Environment Variables
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
