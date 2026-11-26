import { useMemo } from 'react';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { dayLabel } from '../utils/days';
import { taskDue, taskStart, taskStatusWords, taskTone } from '../utils/taskDates';
import TimelineChart, { type TimelineGroup } from './TimelineChart';

/** Tasks on a timeline, grouped by project. A task needs a deadline to have a bar. */
export default function TaskTimeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
    const { groups, undated } = useMemo(() => {
        const byProject = new Map<string, TimelineGroup>();
        let none = 0;
        for (const t of tasks) {
            const due = taskDue(t);
            if (!due) { if (t.stage !== 'completed') none++; continue; }
            const start = taskStart(t) ?? due;
            const from = start > due ? due : start;
            const key = t.project_id ?? 'none';
            const group = byProject.get(key) ?? { id: key, label: t.project?.name ?? 'No project', rows: [] };
            group.rows.push({
                id: t.id,
                label: t.title,
                sublabel: t.assignee?.name,
                start: from,
                end: due,
                tone: taskTone(t),
                progress: t.stage === 'completed' ? 100 : t.progress_percent || 0,
                describe: `${t.title}${t.assignee?.name ? `, ${t.assignee.name}` : ''}, ${dayLabel(from)} to ${dayLabel(due)}, ${taskStatusWords(t)}`,
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
        return { groups: list, undated: none };
    }, [tasks, onOpen]);

    return (
        <TimelineChart groups={groups}
            emptyText="No tasks with a deadline match these filters. Set a deadline in a task to see it here."
            footnote={undated ? `${undated} open ${undated === 1 ? 'task has no deadline and isn’t' : 'tasks have no deadline and aren’t'} shown.` : undefined} />
    );
}
