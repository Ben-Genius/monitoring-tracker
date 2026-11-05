import { AlertTriangle, Ban, CalendarX, CheckCircle2, Clock, TrendingUp, UserX, type LucideIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { daysSinceMovement } from '@/features/tasks/utils/accountability';
import { stageDef } from '@/features/tasks/utils/stages';
import type { Brief, BriefSection, BriefTask } from '../hooks/useBrief';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SectionMeta {
    key: BriefSection;
    title: string;
    hint: string;
    icon: LucideIcon;
    /** Colour is reserved for the two states that cannot wait. Everything else stays neutral. */
    severe: boolean;
}

export const SECTIONS: SectionMeta[] = [
    { key: 'urgent', title: 'Urgent', hint: 'Flagged as an emergency', icon: AlertTriangle, severe: true },
    { key: 'blocked', title: 'Blocked', hint: 'Waiting on someone else', icon: Ban, severe: true },
    { key: 'stuck', title: 'Stuck', hint: 'In progress, no movement for 2+ days', icon: Clock, severe: false },
    { key: 'overdue', title: 'Overdue', hint: 'Past the deadline or the promised update', icon: CalendarX, severe: false },
    { key: 'unaccepted', title: 'Not accepted', hint: 'Assigned, but the owner hasn’t accepted it', icon: UserX, severe: false },
    { key: 'moved', title: 'Moved today', hint: 'Progress or status changed in the last 24 hours', icon: TrendingUp, severe: false },
    { key: 'done', title: 'Done', hint: 'Completed in the last 24 hours', icon: CheckCircle2, severe: false },
];

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|rev|hon|sir|madam)\.?$/i;
/** "Mr Blay" stays "Mr Blay"; "Ama Owusu" becomes "Ama". */
export function addressAs(name: string) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && HONORIFICS.test(parts[0]) ? `${parts[0]} ${parts[1]}` : parts[0];
}

export function greeting(d: Date) {
    const h = d.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function daysLate(iso: string | null) {
    return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)) : 0;
}

/** Tasks that need a decision or a nudge: the four problem sections. */
export function attentionCount(brief: Brief) {
    const s = brief.sections;
    return s.urgent.length + s.blocked.length + s.stuck.length + s.overdue.length;
}

/** One short line saying why this task is in the brief. */
export function reason(t: BriefTask, section: BriefSection): string {
    const blocked = t.blocker?.name
        ? `Waiting on ${t.blocker.name}: ${t.blocker_description || 'no reason given'}`
        : t.blocker_description || 'No reason given';
    switch (section) {
        case 'urgent': return t.stage === 'blockers' ? `Urgent and blocked. ${blocked}` : `${stageDef(t.stage).label}, ${t.progress_percent}% done`;
        case 'blocked': return blocked;
        case 'stuck': return `No movement for ${daysSinceMovement(t)} days, ${t.progress_percent}% done`;
        // Rows no longer carry a stage column, so overdue (the one reason that doesn't say it) adds the stage.
        case 'overdue':
            return t.due_date && new Date(t.due_date).getTime() < Date.now()
                ? `Deadline was ${formatDate(t.due_date)}, ${daysLate(t.due_date)} days late · ${stageDef(t.stage).label}`
                : `Promised update ${t.next_update_due ? formatDate(t.next_update_due) : ''} not received · ${stageDef(t.stage).label}`;
        case 'unaccepted': return 'Owner hasn’t accepted this yet';
        case 'moved': return `${stageDef(t.stage).label}, now ${t.progress_percent}% done`;
        case 'done': return t.completed_at ? `Completed ${formatDate(t.completed_at)}` : 'Completed';
    }
}
