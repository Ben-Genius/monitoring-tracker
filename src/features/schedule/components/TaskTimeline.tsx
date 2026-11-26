import { useMemo } from 'react';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { useDependencyPairs } from '@/features/tasks/hooks/useTaskLinks';
import { dayLabel, toDay } from '../utils/days';
import { taskDue, taskStart, taskStatusWords, taskTone } from '../utils/taskDates';
import TimelineChart, { type TimelineGroup, type TimelineLink } from './TimelineChart';

/**
 * Tasks on a timeline, grouped by project. A task needs a deadline to have a bar.
 * "Waits on" links are drawn between bars; a link turns red when the waiting
 * task is planned to start (or is due) before the task it waits on is due.
 */
export default function TaskTimeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
    const pairs = useDependencyPairs();

    const { groups, undated, links, conflicts } = useMemo(() => {
        const byId = new Map(tasks.map(t => [t.id, t]));

        // Links between two tasks that are both on the chart.
        const links: TimelineLink[] = [];
        const notes = new Map<string, string[]>();
        const note = (id: string, text: string) => notes.set(id, [...(notes.get(id) ?? []), text]);
        for (const p of pairs) {
            const waiting = byId.get(p.task_id), blocker = byId.get(p.depends_on);
            if (!waiting || !blocker) continue;
            const blockerDue = taskDue(blocker), waitingDue = taskDue(waiting);
            if (!blockerDue || !waitingDue) continue;
            const settled = blocker.stage === 'completed';
            // Only a planned start date counts: the fallback (when work began, or creation) isn't a plan.
            const plannedStart = toDay(waiting.start_date);
            const conflict = !settled && waiting.stage !== 'completed'
                && (waitingDue < blockerDue || (!!plannedStart && plannedStart < blockerDue));
            links.push({ from: blocker.id, to: waiting.id, conflict, settled });
            note(waiting.id, conflict
                ? `waits on ${blocker.title}, which is due ${dayLabel(blockerDue)}, after this is planned to start`
                : `waits on ${blocker.title}${settled ? ', done' : ''}`);
        }

        const byProject = new Map<string, TimelineGroup>();
        let none = 0;
        for (const t of tasks) {
            const due = taskDue(t);
            if (!due) { if (t.stage !== 'completed') none++; continue; }
            const start = taskStart(t) ?? due;
            const from = start > due ? due : start;
            const key = t.project_id ?? 'none';
            const group = byProject.get(key) ?? { id: key, label: t.project?.name ?? 'No project', rows: [] };
            const extra = notes.get(t.id);
            group.rows.push({
                id: t.id,
                label: t.title,
                sublabel: t.assignee?.name,
                start: from,
                end: due,
                tone: taskTone(t),
                progress: t.stage === 'completed' ? 100 : t.progress_percent || 0,
                describe: `${t.title}${t.assignee?.name ? `, ${t.assignee.name}` : ''}, ${dayLabel(from)} to ${dayLabel(due)}, ${taskStatusWords(t)}${extra ? `; ${extra.join('; ')}` : ''}`,
                onOpen: () => onOpen(t.id),
            });
            byProject.set(key, group);
        }
        const list = [...byProject.values()];
        list.forEach(g => g.rows.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime()));
        // Projects with something late or blocked first, then by earliest deadline.
        const firstEnd = (g: TimelineGroup) => Math.min(...g.rows.filter(r => r.tone !== 'done').map(r => r.end.getTime()), Infinity);
        const hasAttention = (g: TimelineGroup) => g.rows.some(r => r.tone === 'attention');
        list.sort((a, b) => Number(hasAttention(b)) - Number(hasAttention(a)) || firstEnd(a) - firstEnd(b) || a.label.localeCompare(b.label));
        return { groups: list, undated: none, links, conflicts: new Set(links.filter(l => l.conflict).map(l => l.to)).size };
    }, [tasks, onOpen, pairs]);

    const footnote = [
        conflicts ? `${conflicts} ${conflicts === 1 ? 'task is' : 'tasks are'} planned to start before what ${conflicts === 1 ? 'it waits' : 'they wait'} on is due (red lines).` : null,
        undated ? `${undated} open ${undated === 1 ? 'task has no deadline and isn’t' : 'tasks have no deadline and aren’t'} shown.` : null,
    ].filter(Boolean).join(' ');

    return (
        <TimelineChart groups={groups} links={links}
            emptyText="No tasks with a deadline match these filters. Set a deadline in a task to see it here."
            footnote={footnote || undefined} />
    );
}
