import { MessageSquare, Circle, PlayCircle, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { Task } from '../hooks/useTasks';

/**
 * One place for stage names, so the board, the task panel, the list and the
 * brief all say the same thing. Labels follow the 29 Oct meeting:
 * yet to start -> in progress -> blocked -> done.
 */
export interface StageDef {
    id: Task['stage'];
    label: string;
    hint: string;
    icon: LucideIcon;
    /** Tailwind classes for a small status chip. */
    /** Status pill: neutral, except Blocked, which is the one stage that needs someone to act. */
    chip: string;
    /** Accent colour for column headers and dots. */
    accent: string;
}

export const STAGES: StageDef[] = [
    { id: 'talking_stage', label: 'Talking stage', hint: 'Still being discussed, not assigned yet', icon: MessageSquare, chip: 'bg-paper text-ink border-line dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700', accent: '#0E7490' },
    { id: 'yet_to_start', label: 'Yet to start', hint: 'Assigned, work has not begun', icon: Circle, chip: 'bg-paper text-ink border-line dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700', accent: '#6B7684' },
    { id: 'in_progress', label: 'In progress', hint: 'Being worked on, move the % as it advances', icon: PlayCircle, chip: 'bg-paper text-ink border-line dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700', accent: '#1F5FD1' },
    { id: 'blockers', label: 'Blocked', hint: 'Stopped, waiting on someone or something', icon: AlertCircle, chip: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/30', accent: '#B83A24' },
    { id: 'completed', label: 'Done', hint: 'Finished', icon: CheckCircle2, chip: 'bg-paper text-ink border-line dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700', accent: '#1F7A4D' },
];

export const stageDef = (id: Task['stage']): StageDef => STAGES.find(s => s.id === id) ?? STAGES[1];
export const stageLabel = (id: Task['stage']) => stageDef(id).label;
