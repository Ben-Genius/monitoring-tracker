import { useMemo } from 'react';
import type { Project } from '@/features/projects/hooks/useProjects';
import { useProjectMilestones } from '../hooks/useProjectMilestones';
import { dayLabel, toDay, today } from '../utils/days';
import TimelineChart, { type TimelineGroup, type TimelineRow } from './TimelineChart';

/** Projects from start to expected handover, with their milestones as markers. */
export default function ProjectTimeline({ projects, onOpen }: { projects: Project[]; onOpen: (id: string) => void }) {
    const { data: milestones = [] } = useProjectMilestones(projects.map(p => p.id));

    const { groups, undated } = useMemo(() => {
        const marksBy = new Map<string, TimelineRow['marks']>();
        for (const m of milestones) {
            const date = toDay(m.due_date);
            if (!date) continue;
            const done = m.status === 'completed' || !!m.completed_date;
            marksBy.set(m.project_id, [...(marksBy.get(m.project_id) ?? []), { date, label: m.name, done, late: !done && date < today() }]);
        }
        const rows: TimelineRow[] = [];
        let none = 0;
        for (const p of projects) {
            const end = toDay(p.expected_handover);
            if (!end) { none++; continue; }
            const start = toDay(p.start_date) ?? toDay(p.created_at) ?? end;
            const from = start > end ? end : start;
            const done = p.status === 'completed';
            const late = !done && end < today();
            const marks = marksBy.get(p.id) ?? [];
            const lateMarks = marks.filter(m => m.late).length;
            rows.push({
                id: p.id,
                label: p.name,
                sublabel: p.company?.name,
                start: from,
                end,
                tone: done ? 'done' : late || lateMarks ? 'attention' : 'neutral',
                marks,
                describe: `${p.name}${p.company?.name ? `, ${p.company.name}` : ''}, ${dayLabel(from)} to handover ${dayLabel(end)}`
                    + (done ? ', completed' : late ? ', past handover date' : '')
                    + (marks.length ? `, ${marks.length} milestone${marks.length === 1 ? '' : 's'}${lateMarks ? `, ${lateMarks} overdue` : ''}` : ''),
                onOpen: () => onOpen(p.id),
            });
        }
        rows.sort((a, b) => a.start.getTime() - b.start.getTime());
        const group: TimelineGroup = { id: 'projects', label: '', rows };
        return { groups: [group], undated: none };
    }, [projects, milestones, onOpen]);

    return (
        <TimelineChart groups={groups}
            emptyText="No projects to show. Projects need an expected handover date to appear on the timeline."
            footnote={undated ? `${undated} project${undated === 1 ? '' : 's'} without a handover date not shown.` : 'Diamonds are milestones.'} />
    );
}
