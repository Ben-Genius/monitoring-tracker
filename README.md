# Monitoring Tracker

A comprehensive project and productivity tracking system for managing tasks, projects, and team performance across multiple companies.

## Features

- **Multi-Company Support**: Manage Macwest, Cypress, and Northbrook projects
- **Task Management**: Kanban board with 5-stage workflow
- **Financial Tracking**: Real-time profitability analysis
- **Anti-Idling System**: 48-hour idle task detection
- **Analytics Dashboard**: Comprehensive performance metrics
- **Pipeline Tracking**: Sales opportunity management

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + React Query
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   npm install @radix-ui/react-slot tailwindcss-animate
   ```

3. Create `.env.local` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── layout/         # Layout components (Sidebar, Header)
│   └── common/         # Common components (LoadingSpinner)
├── features/           # Feature modules
│   ├── auth/          # Authentication
│   ├── dashboard/     # Dashboard
│   ├── tasks/         # Task management
│   ├── projects/      # Project management
│   └── analytics/     # Analytics & reporting
├── lib/               # Utilities and configurations
└── styles/            # Global styles
```

## Development Roadmap

See `task.md` for detailed sprint breakdown and progress tracking.

## License

Proprietary - All rights reserved
