# Epic & User Stories

## Epic: Multi-Company Project & Productivity Tracking System

**As a** project-driven organisation managing construction, energy, and infrastructure operations across multiple companies in Ghana,  
**I want** a unified platform to track projects, tasks, financials, and team performance in real time,  
**So that** I can ensure on-time delivery, maintain budget discipline, reduce idle time, and provide compliance-ready audit trails.

---

## User Stories

### US-01: Authentication & Role-Based Access
**As a** user (Admin, Lead, or Employee),  
**I want** to sign in securely and see only the data relevant to my company and role,  
**So that** sensitive project information remains scoped and I can focus on what matters to me.

- **Acceptance Criteria:**
  - Login with email + password
  - Split-screen premium login page with company branding
  - Admin sees all companies via "Global View"
  - Lead sees only their assigned company's data
  - Employee sees only their assigned tasks and projects

### US-02: Executive Dashboard
**As a** Lead or Admin,  
**I want** a command-centre dashboard with KPIs, revenue trends, and idle-task alerts,  
**So that** I can assess organisational health at a glance and intervene on problem areas immediately.

- **Acceptance Criteria:**
  - KPI cards: total task actions, open tasks, on-time delivery %, profitability
  - Monthly revenue trend chart
  - Recent projects list with company-themed profitability bars
  - Idle tasks widget for tasks stagnant 48+ hours
  - Task progress breakdown by stage

### US-03: Project Lifecycle Management
**As a** Lead,  
**I want** to create, track, and manage projects from kickoff through handover,  
**So that** I can control scope, timeline, budget, and deliverables in one place.

- **Acceptance Criteria:**
  - Create project with name, description, company, value, dates, service type
  - Filter and sort projects by status, value, date, service type
  - Project detail page with hero section, progress bar, timeline
  - Overview tab with executive summary and KPI metrics
  - Strategic milestones with checkable completion and auto-overdue detection
  - Project comments threaded discussion
  - Attachments vault for document storage

### US-04: Kanban Task Board
**As a** Lead or Employee,  
**I want** to move tasks through a visual 5-stage workflow (Talking Stage → Yet to Start → In Progress → Blockers → Completed),  
**So that** I can track execution status and identify bottlenecks at a glance.

- **Acceptance Criteria:**
  - Kanban board with 5 swimlanes
  - Drag-and-drop stage transitions
  - Task drawer with full detail view
  - Subtask checklists, comments, assignee management
  - Priority and due date tracking
  - Create tasks with multi-assignee support

### US-05: Real-Time Progress Tracking
**As a** Lead,  
**I want** to see a computed project progress percentage that blends task completion and milestone achievement,  
**So that** I can measure true project health beyond just task counts.

- **Acceptance Criteria:**
  - Weighted formula: 60% task progress + 40% milestone progress
  - Task stages weighted: completed=100%, in_progress=50%, blockers=30%, talking_stage=10%, yet_to_start=0%
  - Visual progress bar with dynamic colour (red → amber → green)
  - Insight bar showing task counts and milestone %

### US-06: Milestone Management
**As a** Lead,  
**I want** to define project milestones with due dates and mark them complete as they are achieved,  
**So that** I can track key delivery dates and phase completions separately from daily tasks.

- **Acceptance Criteria:**
  - Add milestones with name, description, due date
  - Check/uncheck completion with auto-date stamp
  - Auto-detect overdue milestones
  - Delete milestones
  - Empty state guidance

### US-07: Stage Transition Approvals
**As a** Lead,  
**I want** to request admin approval before moving projects to the next lifecycle stage,  
**So that** stage transitions are governed and auditable.

- **Acceptance Criteria:**
  - Lead clicks "Update Stage" to request transition
  - Request appears on Admin's Approvals page
  - Admin can approve or reject with comments
  - Approval/Rejection updates project status

### US-08: Financial Health Monitoring
**As a** Lead or Admin,  
**I want** to see contract vs actual cost with profitability indicators,  
**So that** I can identify budget risk early and keep projects financially healthy.

- **Acceptance Criteria:**
  - Financial margin percentage on project overview
  - Liquidity (contract value − actual cost) display
  - Health badges: Nominal (green), At Risk (amber), Critical (red)
  - All values displayed in GHS

### US-09: CSV/Excel Bulk Import
**As a** Lead or Admin,  
**I want** to import projects, tasks, or milestones from CSV or Excel files,  
**So that** I can onboard existing data quickly without manual entry.

- **Acceptance Criteria:**
  - Drag-and-drop file upload modal
  - Entity-type selector (projects/tasks/milestones)
  - Auto column-header mapping with preview table
  - Batch upsert into database
  - Success/error feedback

### US-10: Audit Log / Change History
**As a** Lead or Admin,  
**I want** a complete, timestamped audit trail of all state changes on projects, tasks, and milestones,  
**So that** I can review who changed what and when for compliance and retrospectives.

- **Acceptance Criteria:**
  - Automatic logging on all CREATE, UPDATE, DELETE operations
  - Stage changes and status changes recorded with old/new values
  - Activity tab on project detail page with timeline feed
  - Action-type icons and colour-coded badges
  - User attribution and timestamps

### US-11: Pipeline / Sales Opportunity Tracking
**As a** Lead,  
**I want** to track sales opportunities through a pipeline (Lead → Qualified → Proposal → Negotiation → Contract),  
**So that** I can manage deal progression and forecast revenue.

- **Acceptance Criteria:**
  - 5-stage pipeline with estimated value and probability
  - Expected close date tracking
  - Notes on each opportunity
  - Pipeline overview on dashboard

### US-12: Company-Themed Branding
**As a** User,  
**I want** each company to have distinct colour theming (MacWest = Indigo, CypressEnergy = Purple, Northbrook = Pink),  
**So that** I can visually distinguish between companies at a glance.

- **Acceptance Criteria:**
  - Company-specific accent colours on project cards, badges, buttons
  - Consistent theming across badges and interactive elements
  - Global View (Admin) uses neutral slate

### US-13: Multi-Company Data Isolation
**As a** Company Lead,  
**I want** to be confident that my company's data is invisible to other companies,  
**So that** proprietary project information remains confidential.

- **Acceptance Criteria:**
  - RLS enforced on all tables
  - Users scoped to their company_id
  - Admins have cross-company access
  - All queries automatically filtered by company

### US-14: Notifications & Alerts
**As a** User,  
**I want** to receive notifications for idle tasks, profitability alerts, and task assignments,  
**So that** I can respond to important events without polling the system.

- **Acceptance Criteria:**
  - Idle task notifications (48h+ stagnation)
  - Profitability alerts
  - Task assignment notifications
  - Read/unread state management

### US-15: Reports & Analytics
**As a** Admin,  
**I want** comprehensive reports on financial performance, task completion trends, and team productivity,  
**So that** I can make data-driven decisions and share insights with stakeholders.

- **Acceptance Criteria:**
  - Financial summaries and exportable reports
  - Charts and trend visualizations
  - Task completion rates over time
  - Team performance metrics
