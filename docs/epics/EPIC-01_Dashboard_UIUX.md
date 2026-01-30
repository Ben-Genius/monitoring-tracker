# EPIC-01: Dashboard UI/UX Overhaul

## 📋 Overview
Create a premium, high-performance dashboard for the Ghana National Firearm Licensing & Tracking Management System (NFLTMS) - applied here as "Monitoring Tracker" for construction projects (MacWest, CypressEnergy, Northbrook LRD). The dashboard serves as the central command center for project managers, engineers, and site supervisors.

## 🎯 Goals
- Provide immediate visibility into project health, task status, and financial metrics.
- Reduce "Idle Time" through prominent alerts and actionable insights.
- Ensure a seamless, responsive experience across desktop and tablet devices.
- Implement a split-screen, premium login experience.

## 👤 User Stories

### US-01: Premium Login Experience
- **As a** User,
- **I want** to see a professional login page with testimonials and stats,
- **So that** I feel confident in the platform's reliability and purpose.
- **Acceptance Criteria:**
  - Split-screen layout (desktop).
  - Testimonials slider/grid with Ghanaian professionals.
  - Custom logo and branding.

### US-02: Executive Dashboard View
- **As a** Project Manager,
- **I want** to see high-level KPIs (Tasks Completed, On-Time Delivery, Team Happiness),
- **So that** I can assess overall performance at a glance.
- **Acceptance Criteria:**
  - KPI Cards with trends.
  - Real-time data fetching from Supabase.

### US-03: Idle Task Management
- **As a** Site Supervisor,
- **I want** to be alerted of any "Idle" or "Blocked" tasks immediately,
- **So that** I can intervene and prevent delays.
- **Acceptance Criteria:**
  - "Idle Tasks" widget high up on the dashboard.
  - One-click navigation to the specific task.

### US-04: Project Financials
- **As a** Lead Engineer/Manager,
- **I want** to see project profitability and budget vs. actuals,
- **So that** I can keep projects financially healthy.
- **Acceptance Criteria:**
  - "Recent Projects" detailed list.
  - Profitability progress bars (Actual vs. Contract Value).
  - Company-specific color coding (MacWest: Indigo, Cypress: Purple, Northbrook: Pink).

### US-05: Navigation & Layout
- **As a** User,
- **I want** a collapsible sidebar and clean header,
- **So that** I can navigate easily without clutter.
- **Acceptance Criteria:**
  - Responsive Sidebar (collapsible on mobile).
  - Header with User Profile and Company switcher.

## 🛠 Technical Requirements
- **Framework:** React + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand + React Query
- **Database:** Supabase
- **Icons:** Lucide React

## 📅 Phases
1. **Phase 1:** Layout & Authentication (Login, Sidebar, Header) - *Completed*
2. **Phase 2:** Dashboard Widgets & Data Integration - *In Progress*
3. **Phase 3:** Advanced Analytics & Reporting - *Next*
