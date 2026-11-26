import type { ComponentType } from 'react';

/**
 * The code for each signed-in page, loaded on demand (App.tsx wraps these in
 * React.lazy). Keeping the loaders here lets the sidebar fetch a page's code
 * before it is clicked, so moving between pages doesn't wait on the network.
 */
type PageModule = { default: ComponentType };

export const routeChunks = {
    '/dashboard': () => import('@/features/dashboard/pages/DashboardPage'),
    '/my-work': () => import('@/features/tasks/pages/MyWorkPage'),
    '/tasks': () => import('@/features/tasks/pages/TaskBoardPage'),
    '/workload': () => import('@/features/workload/pages/WorkloadPage'),
    '/projects': () => import('@/features/projects/pages/ProjectsPage'),
    '/analytics': () => import('@/features/analytics/pages/AnalyticsPage'),
    '/brief': () => import('@/features/brief/pages/BriefPage'),
    '/settings': () => import('@/features/settings/pages/SettingsPage'),
    '/users': () => import('@/features/users/pages/UserManagementPage'),
    '/approvals': () => import('@/features/approvals/pages/ApprovalsPage'),
} satisfies Record<string, () => Promise<PageModule>>;

export type RoutePath = keyof typeof routeChunks;

const started = new Set<string>();

/** Starts downloading a page's code. Safe to call repeatedly. */
export function prefetchRoute(path: string): void {
    if (started.has(path) || !(path in routeChunks)) return;
    started.add(path);
    // A failed prefetch is harmless: the click loads it again.
    routeChunks[path as RoutePath]().catch(() => started.delete(path));
}

/** On a slow or data-saving connection, only fetch what is actually opened. */
function connectionIsConstrained(): boolean {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g');
}

/** Fetches the given pages' code once the browser is idle. */
export function prefetchWhenIdle(paths: string[]): () => void {
    if (connectionIsConstrained()) return () => {};
    const run = () => paths.forEach(prefetchRoute);
    // Safari has no requestIdleCallback; a short delay does the same job there.
    if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(run, { timeout: 4000 });
        return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
}
