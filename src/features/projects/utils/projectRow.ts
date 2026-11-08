import type { Project } from '../hooks/useProjects';

export const STATUS_LABEL: Record<Project['status'], string> = {
    bidding: 'Bidding',
    scheduled: 'Scheduled',
    active: 'Active',
    on_hold: 'On hold',
    completed: 'Completed',
};

/** A project plus the figures the list sorts and searches on. */
export interface ProjectRow extends Project {
    company_name: string;
    open_tasks: number;
    blocked_tasks: number;
    done_tasks: number;
    total_tasks: number;
    progress: number;
    /** Open work weighted by blockers, so the default sort surfaces trouble first. */
    attention: number;
    /** Null when no cost is recorded: a margin would be meaningless, not 100%. */
    margin: number | null;
}

export function toProjectRow(p: Project): ProjectRow {
    const tasks = p.tasks ?? [];
    const done = tasks.filter(t => t.stage === 'completed').length;
    const blocked = tasks.filter(t => t.stage === 'blockers').length;
    const open = tasks.length - done;
    const value = Number(p.contract_value) || 0;
    const cost = Number(p.actual_cost) || 0;
    return {
        ...p,
        company_name: p.company?.name ?? '',
        open_tasks: open,
        blocked_tasks: blocked,
        done_tasks: done,
        total_tasks: tasks.length,
        progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        attention: blocked * 1000 + open,
        margin: cost > 0 && value > 0 ? ((value - cost) / value) * 100 : null,
    };
}
