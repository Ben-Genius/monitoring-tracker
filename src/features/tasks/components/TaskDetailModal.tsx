import { useState, useEffect, useMemo } from 'react';
import {
    X, Calendar, Flag, User, Plus, Trash2, Send, ChevronRight, AlertTriangle, UserCheck,
    Clock, Check, MessageSquare, ListChecks, FileText, Pencil, ChevronDown, Link2, Paperclip,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
    useTask, useUpdateTask, useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask,
    useUpdateSubtask, useTaskComments, useCreateComment, useAcknowledgeTask, type Task, type TaskComment,
} from '../hooks/useTasks';
import { openEvidence } from '../hooks/useEvidence';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { canCoordinate } from '@/lib/permissions';
import { taskProgress, isStale, daysSinceMovement, isUpdateOverdue } from '../utils/accountability';
import { stageDef } from '../utils/stages';
import { useTaskMover, MoveMenu } from './TaskMover';

interface TaskDetailModalProps {
    taskId: string | null;
    open: boolean;
    onClose: () => void;
}

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

/** Baserow step names arrive as "A1220 - Plumbing pipeworks"; show the code apart so the words read first. */
function splitStepCode(title: string): { code: string | null; text: string } {
    const m = title.match(/^\s*([A-Z]{1,3}\d{2,6})\s*[-–:.]\s*(.+)$/);
    return m ? { code: m[1], text: m[2] } : { code: null, text: title };
}
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:00`).toISOString() : null);

/**
 * The one task panel, used from the board, the list, projects and the brief.
 * It reads top to bottom the way a person checks a task:
 * where is it and is it moving -> what is it -> what are the steps -> what's been said.
 */
export default function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
    const id = taskId || '';
    const { data: task, isLoading } = useTask(id);
    const { data: subtasks = [] } = useSubtasks(id);
    const { data: comments = [] } = useTaskComments(id);
    const updateTask = useUpdateTask(id);
    const createSubtask = useCreateSubtask();
    const toggleSubtask = useToggleSubtask(id);
    const deleteSubtask = useDeleteSubtask(id);
    const updateSubtask = useUpdateSubtask(id);
    const createComment = useCreateComment();
    const acknowledgeTask = useAcknowledgeTask();
    const mover = useTaskMover();
    const { user } = useAuth();

    const companyId = task?.project?.company_id ?? task?.company_id ?? undefined;
    const { data: users = [] } = useUsers(companyId);
    const { data: projects = [] } = useProjects();

    const [title, setTitle] = useState('');
    const [editingDescription, setEditingDescription] = useState(false);
    const [description, setDescription] = useState('');
    const [newStep, setNewStep] = useState('');
    const [editingStep, setEditingStep] = useState<{ id: string; title: string } | null>(null);
    const [update, setUpdate] = useState('');

    const loadedTitle = task?.title;
    const loadedDescription = task?.description;
    useEffect(() => {
        if (loadedTitle !== undefined) setTitle(loadedTitle);
        setDescription(loadedDescription || '');
    }, [loadedTitle, loadedDescription]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !mover.dialog) onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [open, onClose, mover.dialog]);

    const stepsDone = useMemo(() => subtasks.filter(s => s.is_completed).length, [subtasks]);

    if (!open || !taskId) return null;

    if (isLoading || !task) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            </div>
        );
    }

    // Everyone except the executive can work on a task; only coordinators
    // (admin, PA, leads) restructure it: owner, project, deadline.
    const canEdit = !!user && user.role !== 'executive';
    const canStructure = canCoordinate(user) || user?.role === 'lead';
    const isOwner = !!user && task.assignee_id === user.id;
    const isExecutive = user?.role === 'executive';
    const stage = stageDef(task.stage);
    const progress = taskProgress(task);
    const idle = daysSinceMovement(task);
    const stale = isStale(task);
    const creator = task.creator;
    const movable = { ...task, subtasks };

    const save = (patch: Parameters<typeof updateTask.mutate>[0], ok = 'Saved') =>
        updateTask.mutate(patch, {
            onSuccess: () => toast.success(ok, { id: `save-${task.id}` }),
            onError: (e: Error) => toast.error(e?.message || 'Could not save', { id: `save-${task.id}` }),
        });

    const saveTitle = () => {
        const t = title.trim();
        if (t && t !== task.title) save({ title: t }, 'Title saved'); else setTitle(task.title);
    };

    const addStep = (e: React.FormEvent) => {
        e.preventDefault();
        const t = newStep.trim();
        if (!t) return;
        createSubtask.mutate({ task_id: task.id, title: t }, { onSuccess: () => setNewStep('') });
    };

    const postUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        const t = update.trim();
        if (!t) return;
        createComment.mutate(
            { task_id: task.id, content: t, kind: isExecutive ? 'nudge' : 'comment' },
            {
                onSuccess: () => { setUpdate(''); toast.success(isExecutive ? 'Note sent to the team' : 'Comment posted'); },
                onError: (err: Error) => toast.error(err.message || 'Couldn’t post. Try again.'),
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={task.title}
                className="bg-surface dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
                {/* ── Header ───────────────────────────────────────────── */}
                <div className="border-b border-line dark:border-slate-800 px-4 sm:px-6 pt-4 pb-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-ink-muted">
                            <span className="truncate">{task.project?.company?.name || 'No company'}</span>
                            <ChevronRight className="h-3 w-3 shrink-0" />
                            {canStructure ? (
                                <select
                                    value={task.project_id || ''}
                                    onChange={e => save({ project_id: e.target.value || null }, 'Project changed')}
                                    className="min-w-0 max-w-full cursor-pointer truncate rounded-[4px] bg-transparent font-medium text-ink outline-none [field-sizing:content] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-100"
                                    aria-label="Project"
                                >
                                    <option value="">No project</option>
                                    {projects.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <span className="truncate text-ink-muted">{task.project?.name || 'No project'}</span>
                            )}
                        </div>
                        <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close"><X className="h-5 w-5 text-ink-muted" /></button>
                    </div>

                    {canEdit ? (
                        <textarea
                            value={title}
                            rows={1}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                            className="w-full resize-none bg-transparent text-xl font-bold leading-snug text-ink dark:text-slate-50 outline-none rounded-md hover:bg-paper dark:hover:bg-slate-800/50 focus:bg-paper px-1 -mx-1 [field-sizing:content]"
                            aria-label="Task title"
                        />
                    ) : (
                        <h2 className="text-xl font-bold leading-snug text-ink dark:text-slate-50">{task.title}</h2>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {mover.canMove ? (
                            <MoveMenu
                                current={task.stage}
                                onMove={s => mover.requestMove(movable, s)}
                                onUpdate={() => mover.requestUpdate(movable)}
                                align="left"
                                trigger={
                                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', stage.chip)}>
                                        <stage.icon className="h-3.5 w-3.5" /> {stage.label} <ChevronDown className="h-3 w-3 opacity-60" />
                                    </span>
                                }
                            />
                        ) : (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', stage.chip)}>
                                <stage.icon className="h-3.5 w-3.5" /> {stage.label}
                            </span>
                        )}
                        <button
                            disabled={!canEdit}
                            onClick={() => save({ is_urgent: !task.is_urgent }, task.is_urgent ? 'No longer urgent' : 'Marked urgent')}
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-default',
                                task.is_urgent ? 'border-red-600 bg-red-600 text-white' : 'border-line text-ink-muted hover:bg-paper dark:border-slate-700'
                            )}
                        >
                            <AlertTriangle className="h-3.5 w-3.5" /> {task.is_urgent ? 'Urgent' : canEdit ? 'Mark urgent' : 'Not urgent'}
                        </button>
                    </div>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="p-4 sm:p-6 space-y-7 md:border-r border-line dark:border-slate-800">

                            {/* 1. Is it moving? */}
                            <section className="rounded-xl border border-line dark:border-slate-800 p-4 space-y-3">
                                {task.stage === 'blockers' && (
                                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold">
                                                Blocked{task.blocker?.name ? <> — waiting on {task.blocker.name}</> : null}
                                            </p>
                                            <p className="mt-0.5">{task.blocker_description || 'No reason given yet.'}</p>
                                        </div>
                                        {mover.canMove && (
                                            <button onClick={() => mover.editBlocker(movable)} className="text-xs font-semibold underline underline-offset-2 shrink-0">Edit</button>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-baseline justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-ink dark:text-slate-100">How far along?</h3>
                                    <span className="text-2xl font-bold tabular-nums text-ink dark:text-slate-50">{progress}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-paper dark:bg-slate-800">
                                    <div className="h-full rounded-full bg-slate-600 transition-all dark:bg-slate-300" style={{ width: `${progress}%` }} />
                                </div>
                                {mover.canMove && (
                                    <div className="flex flex-wrap gap-2">
                                        {task.stage !== 'completed' && (
                                            <button onClick={() => mover.requestUpdate(movable)} className="h-9 rounded-[8px] border border-line px-3 text-[13px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500">
                                                Post an update
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                    <span className={cn('inline-flex items-center gap-1', stale ? 'font-semibold text-red-600' : 'text-ink-muted')}>
                                        <Clock className="h-3.5 w-3.5" />
                                        {idle == null ? 'Not moved yet' : idle === 0 ? 'Moved today' : `Last moved ${idle} day${idle === 1 ? '' : 's'} ago`}
                                        {stale && ' — over the 2-day limit'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-ink-muted">
                                        <UserCheck className="h-3.5 w-3.5" />
                                        {task.acknowledged_at ? <>Accepted {formatDate(task.acknowledged_at)}</>
                                            : task.assignee_id ? <span className="font-semibold text-ink dark:text-slate-100">Owner hasn't accepted yet</span> : 'No owner to accept'}
                                    </span>
                                    {!task.acknowledged_at && isOwner && task.stage !== 'completed' && (
                                        <Button size="sm" className="h-7 text-xs" disabled={acknowledgeTask.isPending}
                                            onClick={() => acknowledgeTask.mutate({ id: task.id, userId: user!.id }, { onSuccess: () => toast.success('Task accepted') })}>
                                            <Check className="h-3.5 w-3.5 mr-1" /> Accept this task
                                        </Button>
                                    )}
                                </div>
                            </section>

                            {/* 2. What is it? */}
                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-200">
                                        <FileText className="h-4 w-4 text-ink-muted" /> What needs to be done
                                    </h3>
                                    {canEdit && !editingDescription && (
                                        <button onClick={() => setEditingDescription(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
                                            <Pencil className="h-3.5 w-3.5" /> {task.description ? 'Edit' : 'Add'}
                                        </button>
                                    )}
                                </div>
                                {editingDescription ? (
                                    <div className="space-y-2">
                                        <textarea
                                            autoFocus
                                            rows={5}
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder={'What does "done" look like, and anything the owner needs to know.\n\ne.g. Get the signed wayleave form back from ECG Tema. Contact: Mr Owusu. Needed before cable laying on 10 Nov.'}
                                            className="w-full rounded-xl border border-line dark:border-slate-700 bg-surface dark:bg-slate-950 p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => { setDescription(task.description || ''); setEditingDescription(false); }}>Cancel</Button>
                                            <Button size="sm" onClick={() => { save({ description: description.trim() }, 'Description saved'); setEditingDescription(false); }}>Save</Button>
                                        </div>
                                    </div>
                                ) : task.description ? (
                                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink dark:text-slate-300">{task.description}</p>
                                ) : (
                                    <p className="rounded-xl border border-dashed border-line dark:border-slate-700 p-3 text-sm text-ink-muted">
                                        No description yet.{canEdit && ' Add one line on what "done" looks like, so the owner and their manager read it the same way.'}
                                    </p>
                                )}
                            </section>

                            {/* 3. Steps */}
                            <section className="space-y-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-200">
                                        <ListChecks className="h-4 w-4 text-ink-muted" /> Steps
                                    </h3>
                                    {subtasks.length > 0 && (
                                        <span className="text-xs font-semibold text-ink-muted">{stepsDone} of {subtasks.length} done</span>
                                    )}
                                </div>
                                {subtasks.length > 0 && (
                                    <div className="h-1.5 rounded-full bg-paper dark:bg-slate-800 overflow-hidden">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stepsDone / subtasks.length) * 100}%` }} />
                                    </div>
                                )}
                                <ol className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-line dark:border-slate-800 overflow-hidden empty:hidden">
                                    {subtasks.map((s, i) => (
                                        <li key={s.id} className="group flex items-start gap-3 px-3 py-2.5 bg-surface dark:bg-slate-900">
                                            <button
                                                disabled={!canEdit}
                                                onClick={() => toggleSubtask.mutate({ id: s.id, is_completed: !s.is_completed })}
                                                aria-label={s.is_completed ? `Mark step ${i + 1} not done` : `Mark step ${i + 1} done`}
                                                className={cn(
                                                    'mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors',
                                                    s.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-line-strong bg-surface hover:border-emerald-400 dark:bg-slate-900'
                                                )}
                                            >
                                                {s.is_completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                {editingStep?.id === s.id ? (
                                                    <input
                                                        autoFocus
                                                        value={editingStep.title}
                                                        onChange={e => setEditingStep({ id: s.id, title: e.target.value })}
                                                        onBlur={() => { const t = editingStep.title.trim(); if (t && t !== s.title) updateSubtask.mutate({ id: s.id, title: t }); setEditingStep(null); }}
                                                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingStep(null); }}
                                                        className="w-full rounded-md border border-blue-300 px-2 py-0.5 text-sm outline-none"
                                                    />
                                                ) : (
                                                    <button
                                                        disabled={!canEdit}
                                                        onClick={() => setEditingStep({ id: s.id, title: s.title })}
                                                        className={cn('text-left text-sm leading-snug', s.is_completed ? 'text-ink-muted line-through' : 'text-ink dark:text-slate-200')}
                                                    >
                                                        <span className="mr-1.5 text-ink-muted tabular-nums">{i + 1}.</span>{splitStepCode(s.title).text}
                                                        {splitStepCode(s.title).code && (
                                                            <span className="ml-2 rounded bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-muted no-underline dark:bg-slate-800">{splitStepCode(s.title).code}</span>
                                                        )}
                                                    </button>
                                                )}
                                                {(s.end_date || s.completed_date) && (
                                                    <p className="mt-0.5 text-[11px] text-ink-muted">
                                                        {s.is_completed && s.completed_date ? `Done ${formatDate(s.completed_date)}` : s.end_date ? `Due ${formatDate(s.end_date)}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => { if (confirmDelete(s.title)) deleteSubtask.mutate(s.id); }}
                                                    className="p-1 rounded-md text-ink-muted hover:text-red-700 hover:bg-red-50 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                                    aria-label={`Delete step ${i + 1}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                                {subtasks.length === 0 && (
                                    <p className="text-sm text-ink-muted">
                                        No steps yet.{canEdit && ' Break the task into small steps the owner can tick off — each tick shows it moving.'}
                                    </p>
                                )}
                                {canEdit && (
                                    <form onSubmit={addStep} className="flex gap-2">
                                        <input
                                            value={newStep}
                                            onChange={e => setNewStep(e.target.value)}
                                            placeholder="Add a step, e.g. Collect three supplier quotes"
                                            className="flex-1 h-10 rounded-lg border border-line dark:border-slate-700 bg-surface dark:bg-slate-950 px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:ring-2 focus:ring-progress/15 dark:text-slate-100 dark:placeholder:text-slate-500"
                                        />
                                        <Button type="submit" size="sm" className="h-10 bg-ink text-white hover:bg-ink/90 dark:bg-white dark:text-ink dark:hover:bg-white/90" disabled={!newStep.trim() || createSubtask.isPending}>
                                            <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Add step</span>
                                        </Button>
                                    </form>
                                )}
                            </section>

                            {/* 4. Updates */}
                            <section className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-200">
                                    <MessageSquare className="h-4 w-4 text-ink-faint" /> History and comments
                                    {comments.length > 0 && <span className="text-ink-muted font-normal">{comments.length}</span>}
                                </h3>
                                {comments.length === 0 && <p className="text-sm text-ink-faint">Nothing yet. Status changes, proof and comments appear here.</p>}
                                <ol className="space-y-4">
                                    {comments.map(c => <FeedEntry key={c.id} c={c} />)}
                                </ol>
                                {user && (
                                    <form onSubmit={postUpdate} className="space-y-1.5">
                                        {isExecutive && <p className="text-[13px] font-semibold text-ink">Leave a note for the team <span className="font-normal text-ink-faint">(optional)</span></p>}
                                        <div className="flex gap-2">
                                            <input
                                                value={update}
                                                onChange={e => setUpdate(e.target.value)}
                                                placeholder={isExecutive ? 'e.g. Can we get this done before the board meeting?' : 'Add a comment'}
                                                className="flex-1 h-10 rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:ring-2 focus:ring-progress/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                                            />
                                            <Button type="submit" size="sm" className="h-10 bg-ink text-white hover:bg-ink/90 dark:bg-white dark:text-ink dark:hover:bg-white/90" disabled={!update.trim() || createComment.isPending} aria-label={isExecutive ? 'Send note' : 'Post comment'}>
                                                <Send className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">{isExecutive ? 'Send note' : 'Post'}</span>
                                            </Button>
                                        </div>
                                        {isExecutive && <p className="text-[12px] text-ink-faint">The owner and your PA are told straight away.</p>}
                                    </form>
                                )}
                            </section>
                        </div>

                        {/* ── Side details ─────────────────────────────── */}
                        <aside className="p-4 sm:p-6 space-y-4 bg-paper/60 dark:bg-slate-900/60 border-t md:border-t-0 border-line dark:border-slate-800">
                            <Field icon={User} label="Owner">
                                {canStructure ? (
                                    <select
                                        value={task.assignee_id || ''}
                                        onChange={e => save(e.target.value ? { assignee_ids: [e.target.value] } : { assignee_id: null }, 'Owner changed')}
                                        className="w-full h-9 rounded-lg border border-line dark:border-slate-700 bg-surface px-2 text-sm text-ink dark:bg-slate-950 dark:text-slate-100"
                                    >
                                        <option value="">No owner</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                ) : <Value>{task.assignee?.name || 'No owner'}</Value>}
                            </Field>
                            <Field icon={Calendar} label="Deadline">
                                {canStructure ? (
                                    <input type="date" value={toDateInput(task.due_date)}
                                        onChange={e => save({ due_date: e.target.value || null }, 'Deadline saved')}
                                        className="w-full h-9 rounded-lg border border-line dark:border-slate-700 bg-surface px-2 text-sm text-ink dark:bg-slate-950 dark:text-slate-100" />
                                ) : <Value>{task.due_date ? formatDate(task.due_date) : 'None'}</Value>}
                            </Field>
                            <Field icon={Clock} label="Next update due" hint="When the owner will report back">
                                {canEdit ? (
                                    <input type="date" value={toDateInput(task.next_update_due)}
                                        onChange={e => save({ next_update_due: endOfDay(e.target.value) }, 'Next update date saved')}
                                        className={cn('w-full h-9 rounded-lg border bg-surface px-2 text-sm text-ink dark:bg-slate-950 dark:text-slate-100', isUpdateOverdue(task) ? 'border-red-300 text-red-700' : 'border-line dark:border-slate-700')} />
                                ) : <Value className={isUpdateOverdue(task) ? 'text-red-700' : ''}>{task.next_update_due ? formatDate(task.next_update_due) : 'Not set'}</Value>}
                            </Field>
                            <Field icon={Flag} label="Priority">
                                {canEdit ? (
                                    <select value={task.priority} onChange={e => save({ priority: e.target.value as Task['priority'] }, 'Priority saved')}
                                        className="w-full h-9 rounded-lg border border-line dark:border-slate-700 bg-surface px-2 text-sm text-ink dark:bg-slate-950 dark:text-slate-100 capitalize">
                                        {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                                    </select>
                                ) : <Value className="capitalize">{task.priority}</Value>}
                            </Field>
                            <div className="pt-2 border-t border-line/70 dark:border-slate-800 text-xs text-ink-muted space-y-1">
                                <p>Assigned by <span className="font-semibold text-ink dark:text-slate-300">{creator?.name || 'not recorded'}</span></p>
                                <p>Created {formatDate(task.created_at)}</p>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
            {mover.dialog}
        </div>
    );
}

function confirmDelete(title: string) {
    return window.confirm(`Delete the step "${title}"?`);
}

// A real <label> wraps the control, so every side field has an accessible name.
function Field({ icon: Icon, label, hint, children }: { icon: typeof User; label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted dark:text-slate-400">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
            </span>
            {children}
            {hint && <span className="block text-[12px] text-ink-muted dark:text-slate-400">{hint}</span>}
        </label>
    );
}

function Value({ children, className }: { children: React.ReactNode; className?: string }) {
    return <p className={cn('text-sm font-semibold text-ink dark:text-slate-200', className)}>{children}</p>;
}

function FeedEntry({ c }: { c: TaskComment }) {
    const who = c.user?.name || 'Unknown';
    const when = formatRelativeTime(c.created_at);
    const evidence = c.evidence ?? [];

    if (c.kind === 'nudge') {
        return (
            <li className="rounded-[10px] border-l-[3px] border-ink bg-paper px-3.5 py-3">
                <p className="text-[13px] font-semibold text-ink">Note from {who} <span className="font-normal text-ink-faint">{when}</span></p>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{c.comment}</p>
            </li>
        );
    }

    if (c.kind === 'status_update') {
        const fromS = c.from_stage ? stageDef(c.from_stage) : null;
        const toS = c.to_stage ? stageDef(c.to_stage) : null;
        const moved = fromS && toS && fromS.id !== toS.id;
        return (
            <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: toS?.accent ?? '#6B7684' }}>
                    {toS ? <toS.icon className="h-4 w-4" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-muted">
                        <span className="font-semibold text-ink">{who}</span>{' '}
                        {moved ? <>moved it from {fromS!.label} to <span className="font-semibold" style={{ color: toS!.accent }}>{toS!.label}</span></> : 'posted an update'}
                        {c.progress_percent != null && c.to_stage !== 'completed' ? <>, now {c.progress_percent}%</> : null}
                        <span className="text-ink-faint"> {when}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{c.comment}</p>
                    {evidence.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {evidence.map((e, i) => (
                                <li key={i}>
                                    <button
                                        onClick={() => openEvidence(e).catch(err => toast.error(err.message))}
                                        className="inline-flex max-w-[240px] items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-ink/30"
                                    >
                                        {e.kind === 'link' ? <Link2 className="h-3.5 w-3.5 text-ink-faint" /> : <Paperclip className="h-3.5 w-3.5 text-ink-faint" />}
                                        <span className="truncate">{e.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </li>
        );
    }

    return (
        <li className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-bold text-ink">{who.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-muted"><span className="font-semibold text-ink">{who}</span> <span className="text-ink-faint">{when}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{c.comment}</p>
            </div>
        </li>
    );
}
