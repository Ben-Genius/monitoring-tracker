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
    chip: string;
    /** Accent colour for column headers and dots. */
    accent: string;
}

export const STAGES: StageDef[] = [
    { id: 'talking_stage', label: 'Talking stage', hint: 'Still being discussed, not assigned yet', icon: MessageSquare, chip: 'bg-sky-50 text-sky-700 border-sky-200', accent: '#0E7490' },
    { id: 'yet_to_start', label: 'Yet to start', hint: 'Assigned, work has not begun', icon: Circle, chip: 'bg-slate-100 text-slate-700 border-slate-200', accent: '#6B7684' },
    { id: 'in_progress', label: 'In progress', hint: 'Being worked on, move the % as it advances', icon: PlayCircle, chip: 'bg-blue-50 text-blue-700 border-blue-200', accent: '#1F5FD1' },
    { id: 'blockers', label: 'Blocked', hint: 'Stopped, waiting on someone or something', icon: AlertCircle, chip: 'bg-red-50 text-red-700 border-red-200', accent: '#B83A24' },
    { id: 'completed', label: 'Done', hint: 'Finished', icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: '#1F7A4D' },
];

export const stageDef = (id: Task['stage']): StageDef => STAGES.find(s => s.id === id) ?? STAGES[1];
export const stageLabel = (id: Task['stage']) => stageDef(id).label;
