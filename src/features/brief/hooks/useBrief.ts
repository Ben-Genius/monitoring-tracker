import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { awaitingAcceptance, isStale, isUpdateOverdue } from '@/features/tasks/utils/accountability';
import type { Task } from '@/features/tasks/hooks/useTasks';

/**
 * The morning brief: what Mr Blay needs to know across the three companies,
 * as exceptions rather than a full task list.
 *
 * Each open task lands in exactly one section, the most serious that applies,
 * so the same item never appears three times. Order of seriousness:
 * urgent > blocked > stuck > overdue > not accepted.
 */

export type BriefSection = 'urgent' | 'blocked' | 'stuck' | 'overdue' | 'unaccepted' | 'moved' | 'done';

export interface BriefTask {
    id: string;
    title: string;
    stage: Task['stage'];
    priority: Task['priority'];
    due_date: string | null;
    blocker_description: string | null;
    progress_percent: number;
    acknowledged_at: string | null;
    next_update_due: string | null;
    last_movement_at: string | null;
    is_urgent: boolean;
    assignee_id: string | null;
    completed_at: string | null;
    company_id: string | null;
    project: { name: string; company_id: string } | null;
    owner: { name: string } | null;
    blocker?: { name: string } | null;
}

export interface Brief {
    sections: Record<BriefSection, BriefTask[]>;
    openCount: number;
    byCompany: Record<string, { open: number; atRisk: number }>;
    generatedAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function companyOf(t: BriefTask): string | null {
    return t.project?.company_id ?? t.company_id;
}

function isPastDue(t: BriefTask, now: number): boolean {
    return !!t.due_date && new Date(t.due_date).getTime() < now;
}

function classify(t: BriefTask, now: number): BriefSection | null {
    if (t.stage === 'completed') return null;
    if (t.is_urgent) return 'urgent';
    if (t.stage === 'blockers') return 'blocked';
    if (isStale(t, now)) return 'stuck';
    if (isPastDue(t, now) || isUpdateOverdue(t, now)) return 'overdue';
    if (awaitingAcceptance(t)) return 'unaccepted';
    // Good news counts too: something that genuinely moved in the last day.
    if (t.last_movement_at && now - new Date(t.last_movement_at).getTime() < DAY_MS) return 'moved';
    return null;
}

const SORTERS: Partial<Record<BriefSection, (a: BriefTask, b: BriefTask) => number>> = {
    // Longest silence first.
    stuck: (a, b) => new Date(a.last_movement_at ?? 0).getTime() - new Date(b.last_movement_at ?? 0).getTime(),
    // Most overdue first.
    overdue: (a, b) => new Date(a.due_date ?? a.next_update_due ?? 0).getTime() - new Date(b.due_date ?? b.next_update_due ?? 0).getTime(),
    done: (a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime(),
};

export function useBrief(companyId: string) {
    return useQuery({
        queryKey: ['brief', companyId],
        refetchInterval: 5 * 60 * 1000,
        queryFn: async (): Promise<Brief> => {
            const now = Date.now();
            const since = new Date(now - DAY_MS).toISOString();

            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    id, title, stage, priority, due_date, blocker_description,
                    progress_percent, acknowledged_at, next_update_due, last_movement_at,
                    is_urgent, assignee_id, completed_at, company_id,
                    project:projects(name, company_id),
                    owner:users!tasks_assignee_id_fkey(name),
                    blocker:users!tasks_blocked_by_fkey(name)
                `)
                .is('archived_at', null)
                .or(`stage.neq.completed,completed_at.gte.${since}`);

            if (error) throw error;

            let tasks = (data ?? []) as unknown as BriefTask[];
            if (companyId !== 'all') tasks = tasks.filter(t => companyOf(t) === companyId);

            const sections: Brief['sections'] = { urgent: [], blocked: [], stuck: [], overdue: [], unaccepted: [], moved: [], done: [] };
            const byCompany: Brief['byCompany'] = {};
            let openCount = 0;

            for (const t of tasks) {
                const company = companyOf(t) ?? 'none';
                byCompany[company] ??= { open: 0, atRisk: 0 };

                if (t.stage === 'completed') {
                    sections.done.push(t);
                    continue;
                }
                openCount++;
                byCompany[company].open++;

                const section = classify(t, now);
                if (section) {
                    sections[section].push(t);
                    if (section !== 'unaccepted' && section !== 'moved') byCompany[company].atRisk++;
                }
            }

            for (const [key, sort] of Object.entries(SORTERS)) {
                sections[key as BriefSection].sort(sort);
            }

            return { sections, openCount, byCompany, generatedAt: new Date(now) };
        },
    });
}
