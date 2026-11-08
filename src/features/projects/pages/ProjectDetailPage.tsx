import { useState, useMemo, useRef, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Check, ChevronRight, FileText, Link2, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn, formatCurrency, formatCurrencyCompact, formatDate, getCompanyTheme } from '@/lib/utils';
import { canApprove } from '@/lib/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateApproval } from '@/features/approvals/hooks/useApprovals';
import { useTasks, type Task } from '@/features/tasks/hooks/useTasks';
import CreateTaskModal from '@/features/tasks/components/CreateTaskModal';
import TaskDetailModal from '@/features/tasks/components/TaskDetailModal';
import { AuditFeed } from '@/features/audit/components/AuditFeed';
import { tx } from '@/features/dashboard/components/tokens';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useProject } from '../hooks/useProjects';
import { useMilestones, useUpdateMilestone, useDeleteMilestone, type Milestone } from '../hooks/useMilestones';
import { useProjectComments, useCreateProjectComment, useProjectAttachments, useCreateProjectAttachment, type ProjectAttachment, type ProjectComment } from '../hooks/useProjectDetails';
import ProjectTimeline from '../components/ProjectTimeline';
import MilestoneDialog from '../components/MilestoneDialog';
import { STATUS_LABEL } from '../utils/projectRow';

const STAGE_LABEL: Record<Task['stage'], string> = {
    talking_stage: 'Talking stage',
    yet_to_start: 'Yet to start',
    in_progress: 'In progress',
    blockers: 'Blocked',
    completed: 'Done',
};
const STAGE_ORDER: Task['stage'][] = ['talking_stage', 'yet_to_start', 'in_progress', 'blockers', 'completed'];
const PRIORITY_LABEL: Record<Task['priority'], string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

/** Local calendar date as YYYY-MM-DD, to compare against date-only columns. */
const today = () => new Date().toLocaleDateString('en-CA');
const isOverdue = (due: string | null | undefined, done: boolean) => !!due && !done && due.slice(0, 10) < today();
const initials = (name: string) => name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();

const card = 'rounded-[14px] border border-line bg-surface dark:border-slate-800 dark:bg-slate-900';
const primaryBtn = 'bg-ink text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white';
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progress';

export default function ProjectDetailPage() {
    const { id = '' } = useParams();
    const { user } = useAuth();
    const { data: project, isLoading } = useProject(id);
    const { data: tasks = [], isLoading: tasksLoading } = useTasks({ project_id: id });
    const { data: comments = [], isLoading: commentsLoading } = useProjectComments(id);
    const { data: attachments = [] } = useProjectAttachments(id);
    const { data: milestones = [] } = useMilestones(id);
    const createAttachment = useCreateProjectAttachment();
    const createApproval = useCreateApproval();
    const createComment = useCreateProjectComment();
    const updateMilestone = useUpdateMilestone();
    const deleteMilestone = useDeleteMilestone();

    const [tab, setTab] = useState('overview');
    const [commentText, setCommentText] = useState('');
    const [descExpanded, setDescExpanded] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    // Every task figure on the page comes from this one list, so the counts always agree.
    const stats = useMemo(() => {
        const done = tasks.filter(t => t.stage === 'completed').length;
        const blocked = tasks.filter(t => t.stage === 'blockers').length;
        return { total: tasks.length, done, blocked, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
    }, [tasks]);
    const team = useMemo(() => [...new Set(tasks.map(t => t.assignee?.name).filter(Boolean) as string[])].sort(), [tasks]);
    // Blocked first, then overdue, then soonest due: the order someone chasing work needs.
    const openTasks = useMemo(() => tasks
        .filter(t => t.stage !== 'completed')
        .sort((a, b) =>
            Number(b.stage === 'blockers') - Number(a.stage === 'blockers') ||
            Number(isOverdue(b.due_date, false)) - Number(isOverdue(a.due_date, false)) ||
            (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')), [tasks]);
    const milestonesDone = milestones.filter(m => m.status === 'completed').length;

    const uploadFiles = async (list: FileList | null) => {
        if (!list || !id || !user) return;
        setUploading(true);
        try {
            for (const f of [...list]) {
                if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} is larger than 25 MB`); continue; }
                const path = `${id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]+/g, '_').slice(-80)}`;
                const { error } = await supabase.storage.from('project-files').upload(path, f, { contentType: f.type || undefined });
                if (error) throw new Error(`Couldn't upload ${f.name}: ${error.message}`);
                await createAttachment.mutateAsync({
                    project_id: id, file_name: f.name, file_type: f.type || 'file', file_size: f.size,
                    url: `storage://project-files/${path}`, uploaded_by: user.id,
                });
            }
            toast.success('Uploaded');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-32"><LoadingSpinner size="lg" /></div>;
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                <h1 className={cn('text-[22px] font-semibold', tx.ink)}>Project not found</h1>
                <p className={cn('text-[14px]', tx.muted)}>It may have been removed, or you may not have access to it.</p>
                <Button asChild variant="outline"><Link to="/projects">Back to projects</Link></Button>
            </div>
        );
    }

    const contract = Number(project.contract_value) || 0;
    const cost = Number(project.actual_cost) || 0;
    // A margin with no recorded cost would read as 100%, so it is left empty instead.
    const margin = contract > 0 && cost > 0 ? ((contract - cost) / contract) * 100 : null;
    // Approvals can only move an active project to completed (see useUpdateApproval).
    const canRequestCompletion = project.status === 'active' && canApprove(user);

    const requestCompletion = async () => {
        if (!user) return;
        try {
            await createApproval.mutateAsync({
                project_id: project.id,
                type: 'stage_transition',
                content: `Request to mark "${project.name}" as completed and handed over`,
                entity_type: 'project_completion',
                entity_id: project.id,
                requester_id: user.id,
                comments: `${stats.done} of ${stats.total} tasks done, ${milestonesDone} of ${milestones.length} milestones done.`,
            });
            toast.success('Sent for approval. The project moves to Handed over once it is approved.');
        } catch (error) {
            console.error(error);
            toast.error("Couldn't send the request. Try again.");
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied');
        } catch {
            toast.error("Couldn't copy the link");
        }
    };

    const addComment = async () => {
        if (!commentText.trim()) return;
        try {
            await createComment.mutateAsync({ project_id: project.id, content: commentText.trim() });
            setCommentText('');
        } catch (error) {
            console.error(error);
            toast.error("Couldn't post your comment. It's still in the box, so you can try again.");
        }
    };
    const onCommentKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); }
    };

    const companyName = project.company?.name;
    const description = project.description?.trim();
    const longDescription = !!description && description.length > 240;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <Link to="/projects" className={cn('inline-flex items-center gap-1.5 rounded-[6px] text-[14px] font-medium hover:text-ink dark:hover:text-slate-100', tx.muted, focusRing)}>
                        <ArrowLeft className="h-4 w-4" aria-hidden /> Projects
                    </Link>
                    <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
                        <Link2 className="h-4 w-4" aria-hidden /> Copy link
                    </Button>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                        <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]', tx.muted)}>
                            {companyName && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCompanyTheme(companyName).primary }} aria-hidden />
                                    {companyName}
                                </span>
                            )}
                            <span className={cn('rounded-[6px] border border-line px-2 py-0.5 text-[12px] font-medium dark:border-slate-700', tx.ink)}>
                                {STATUS_LABEL[project.status] ?? project.status}
                            </span>
                            {project.service_type && <span className="capitalize">{project.service_type}</span>}
                            {project.creator?.name && <span>Created by {project.creator.name}</span>}
                        </p>
                        <h1 className={cn('text-[26px] font-semibold leading-tight tracking-tight md:text-[30px]', tx.ink)}>{project.name}</h1>
                        {description ? (
                            <div className="max-w-3xl">
                                <p className={cn('text-[14px] leading-relaxed', tx.muted, !descExpanded && longDescription && 'line-clamp-3')}>{description}</p>
                                {longDescription && (
                                    <button type="button" onClick={() => setDescExpanded(v => !v)} aria-expanded={descExpanded} className={cn('mt-1 rounded-[4px] text-[13px] font-medium underline-offset-2 hover:underline', tx.ink, focusRing)}>
                                        {descExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className={cn('text-[14px]', tx.muted)}>No description yet.</p>
                        )}
                    </div>

                    {canRequestCompletion && (
                        <Button onClick={requestCompletion} disabled={createApproval.isPending} className={cn('shrink-0 gap-1.5', primaryBtn)}>
                            <Check className="h-4 w-4" aria-hidden />
                            {createApproval.isPending ? 'Sending…' : 'Request completion'}
                        </Button>
                    )}
                </div>

                {/* Key figures: each fact appears once on the page. */}
                <dl className={cn(card, 'grid grid-cols-2 gap-x-6 gap-y-5 p-5 lg:grid-cols-5')}>
                    <Figure label="Contract value" value={contract > 0 ? formatCurrency(contract) : 'Not set'} faint={contract === 0} />
                    <Figure
                        label="Margin"
                        value={margin === null ? 'No cost recorded' : `${margin.toFixed(1)}%`}
                        faint={margin === null}
                        danger={margin !== null && margin < 0}
                        sub={margin !== null ? `${formatCurrencyCompact(cost)} cost to date` : undefined}
                    />
                    <Figure
                        label="Dates"
                        value={project.expected_handover ? `Handover ${formatDate(project.expected_handover)}` : 'No handover date'}
                        faint={!project.expected_handover}
                        sub={project.start_date ? `Started ${formatDate(project.start_date)}` : undefined}
                    />
                    <div className="min-w-0">
                        <dt className={cn('text-[12px]', tx.muted)}>Tasks done</dt>
                        <dd className="mt-0.5">
                            {tasksLoading ? <span className={cn('text-[14px]', tx.muted)}>Loading…</span> : stats.total === 0 ? (
                                <span className={cn('text-[14px]', tx.muted)}>No tasks yet</span>
                            ) : (
                                <>
                                    <span className={cn('text-[15px] font-semibold tabular-nums', tx.ink)}>{stats.done} of {stats.total}</span>
                                    <span className={cn('ml-1.5 text-[13px] tabular-nums', tx.muted)}>{stats.pct}%</span>
                                    <div className="mt-2 h-1.5 max-w-[160px] overflow-hidden rounded-full bg-line dark:bg-slate-800" role="img" aria-label={`${stats.pct}% of tasks done`}>
                                        <div className="h-full rounded-full bg-slate-600 dark:bg-slate-300" style={{ width: `${stats.pct}%` }} />
                                    </div>
                                </>
                            )}
                        </dd>
                        {stats.blocked > 0 && <dd className="mt-1 text-[12.5px] font-semibold text-blocked dark:text-red-300">{stats.blocked} blocked</dd>}
                    </div>
                    <div className="min-w-0">
                        <dt className={cn('text-[12px]', tx.muted)}>People</dt>
                        <dd className="mt-1 flex items-center gap-2">
                            {team.length === 0 ? <span className={cn('text-[14px]', tx.muted)}>No one assigned</span> : (
                                <>
                                    <span className="flex -space-x-1.5" aria-hidden>
                                        {team.slice(0, 4).map(name => (
                                            <span key={name} title={name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-paper text-[10.5px] font-semibold text-ink dark:border-slate-900 dark:bg-slate-800 dark:text-slate-200">{initials(name)}</span>
                                        ))}
                                        {team.length > 4 && <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-[10.5px] font-semibold text-white dark:border-slate-900">+{team.length - 4}</span>}
                                    </span>
                                    <span className={cn('truncate text-[13px]', tx.muted)} title={team.join(', ')}>{team.length} {team.length === 1 ? 'person' : 'people'}</span>
                                </>
                            )}
                        </dd>
                    </div>
                </dl>
            </header>

            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
                {/* Scrolls sideways on narrow screens instead of clipping tabs off either edge. */}
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                    <TabsList label="Project sections" className="flex w-max justify-start gap-1 rounded-[10px] border border-line bg-surface p-1 dark:border-slate-800 dark:bg-slate-900">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'tasks', label: 'Tasks', count: tasks.length },
                            { id: 'discussion', label: 'Discussion', count: comments.length },
                            { id: 'activity', label: 'Activity' },
                            { id: 'files', label: 'Files', count: attachments.length },
                        ].map(t => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className={cn(
                                    'rounded-[7px] px-3.5 py-2 text-[13.5px] font-medium gap-1.5 focus-visible:ring-progress',
                                    tab === t.id ? cn(primaryBtn, 'shadow-none') : cn(tx.muted, 'hover:bg-paper hover:text-ink dark:hover:bg-slate-800 dark:hover:text-slate-100')
                                )}
                            >
                                {t.label}
                                {!!t.count && <span className="tabular-nums opacity-70">{t.count}</span>}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* --- Overview --- */}
                <TabsContent value="overview" className="mt-0 space-y-5 outline-none">
                    <ProjectTimeline status={project.status} />

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        {/* Milestones */}
                        <section aria-labelledby="ms-heading" className={cn(card, 'p-5 lg:col-span-3')}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 id="ms-heading" className={cn('text-[15px] font-semibold', tx.ink)}>Milestones</h2>
                                    {milestones.length > 0 && <p className={cn('text-[13px] tabular-nums', tx.muted)}>{milestonesDone} of {milestones.length} done</p>}
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setIsMilestoneOpen(true)} className="gap-1.5">
                                    <Plus className="h-4 w-4" aria-hidden /> Add milestone
                                </Button>
                            </div>

                            {milestones.length > 0 ? (
                                <ul className="mt-4 divide-y divide-line dark:divide-slate-800">
                                    {milestones.map(m => (
                                        <MilestoneRow
                                            key={m.id}
                                            milestone={m}
                                            onToggle={() => updateMilestone.mutate({
                                                id: m.id,
                                                status: m.status === 'completed' ? 'in_progress' : 'completed',
                                                completed_date: m.status === 'completed' ? null : today(),
                                            }, { onError: () => toast.error("Couldn't update the milestone") })}
                                            onDelete={() => {
                                                if (confirm(`Delete the milestone "${m.name}"? This can't be undone.`)) {
                                                    deleteMilestone.mutate({ id: m.id, project_id: id, name: m.name }, { onError: () => toast.error("Couldn't delete the milestone") });
                                                }
                                            }}
                                        />
                                    ))}
                                </ul>
                            ) : (
                                <div className="mt-4 rounded-[10px] border border-dashed border-line-strong px-4 py-8 text-center dark:border-slate-700">
                                    <p className={cn('text-[14px] font-medium', tx.ink)}>No milestones yet</p>
                                    <p className={cn('mx-auto mt-1 max-w-sm text-[13px]', tx.muted)}>Add the key delivery dates, like grid tie-in or handover, so everyone can see what's next.</p>
                                </div>
                            )}
                        </section>

                        {/* Open tasks */}
                        <section aria-labelledby="open-heading" className={cn(card, 'p-5 lg:col-span-2')}>
                            <h2 id="open-heading" className={cn('text-[15px] font-semibold', tx.ink)}>Open tasks</h2>
                            {tasksLoading ? (
                                <p className={cn('mt-4 text-[13px]', tx.muted)}>Loading tasks…</p>
                            ) : openTasks.length === 0 ? (
                                <p className={cn('mt-4 text-[13px]', tx.muted)}>{stats.total === 0 ? 'No tasks yet.' : 'Every task is done.'}</p>
                            ) : (
                                <ul className="mt-3 space-y-1">
                                    {openTasks.slice(0, 5).map(t => (
                                        <li key={t.id}>
                                            <button type="button" onClick={() => setSelectedTaskId(t.id)} className={cn('flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-paper dark:hover:bg-slate-800', focusRing)}>
                                                <span className="min-w-0 flex-1">
                                                    <span className={cn('block truncate text-[14px] font-medium', tx.ink)}>{t.title}</span>
                                                    <span className={cn('block text-[12.5px]', tx.muted)}>
                                                        {[t.assignee?.name, t.due_date && `Due ${formatDate(t.due_date)}`].filter(Boolean).join(' · ') || 'Unassigned'}
                                                    </span>
                                                </span>
                                                <StageTag stage={t.stage} overdue={isOverdue(t.due_date, false)} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {stats.total > 0 && (
                                <button type="button" onClick={() => setTab('tasks')} className={cn('mt-3 inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[13px] font-medium hover:bg-paper dark:hover:bg-slate-800', tx.ink, focusRing)}>
                                    View all {stats.total} tasks <ChevronRight className="h-4 w-4" aria-hidden />
                                </button>
                            )}
                        </section>
                    </div>
                </TabsContent>

                {/* --- Tasks --- */}
                <TabsContent value="tasks" className="mt-0 space-y-4 outline-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className={cn('text-[17px] font-semibold', tx.ink)}>Tasks</h2>
                            {stats.total > 0 && (
                                <p className={cn('text-[13px]', tx.muted)}>
                                    {STAGE_ORDER.map(s => {
                                        const n = tasks.filter(t => t.stage === s).length;
                                        return n ? `${n} ${STAGE_LABEL[s].toLowerCase()}` : null;
                                    }).filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                        <Button onClick={() => setIsCreateTaskOpen(true)} className={cn('gap-1.5', primaryBtn)}>
                            <Plus className="h-4 w-4" aria-hidden /> New task
                        </Button>
                    </div>

                    {tasksLoading ? (
                        <p className={cn('py-8 text-center text-[14px]', tx.muted)}>Loading tasks…</p>
                    ) : tasks.length > 0 ? (
                        <ul className={cn(card, 'divide-y divide-line overflow-hidden dark:divide-slate-800')}>
                            {tasks.map(task => {
                                const overdue = isOverdue(task.due_date, task.stage === 'completed');
                                return (
                                    <li key={task.id}>
                                        <button type="button" onClick={() => setSelectedTaskId(task.id)} className={cn('flex w-full items-start gap-4 px-4 py-3.5 text-left hover:bg-paper dark:hover:bg-slate-800/60', focusRing, '-outline-offset-2')}>
                                            <span className="min-w-0 flex-1">
                                                <span className={cn('block text-[14px] font-semibold', tx.ink, task.stage === 'completed' && 'font-medium')}>{task.title}</span>
                                                {task.description && <span className={cn('mt-0.5 block truncate text-[13px]', tx.muted)}>{task.description}</span>}
                                                <span className={cn('mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]', tx.muted)}>
                                                    <span className={cn(overdue && 'font-semibold text-blocked dark:text-red-300')}>
                                                        {task.due_date ? `${overdue ? 'Overdue · was due' : 'Due'} ${formatDate(task.due_date)}` : 'No due date'}
                                                    </span>
                                                    <span>{task.assignee?.name ?? 'Unassigned'}</span>
                                                    <span className={cn(task.priority === 'critical' && 'font-semibold text-blocked dark:text-red-300')}>{PRIORITY_LABEL[task.priority]} priority</span>
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <StageTag stage={task.stage} />
                                                <ChevronRight className={cn('h-4 w-4', tx.muted)} aria-hidden />
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="rounded-[14px] border border-dashed border-line-strong px-4 py-12 text-center dark:border-slate-700">
                            <p className={cn('text-[14px] font-medium', tx.ink)}>No tasks yet</p>
                            <p className={cn('mt-1 text-[13px]', tx.muted)}>Add the first task to start tracking work on this project.</p>
                            <Button onClick={() => setIsCreateTaskOpen(true)} className={cn('mt-4 gap-1.5', primaryBtn)}>
                                <Plus className="h-4 w-4" aria-hidden /> New task
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* --- Discussion --- */}
                <TabsContent value="discussion" className="mt-0 outline-none">
                    <section aria-labelledby="disc-heading" className={cn(card, 'max-w-3xl p-5 md:p-6')}>
                        <h2 id="disc-heading" className={cn('text-[17px] font-semibold', tx.ink)}>Discussion</h2>

                        <div className="mt-4 space-y-5">
                            {commentsLoading ? (
                                <p className={cn('text-[14px]', tx.muted)}>Loading comments…</p>
                            ) : comments.length === 0 ? (
                                <p className={cn('text-[14px]', tx.muted)}>No comments yet. Use this space for decisions and updates the whole project team should see.</p>
                            ) : comments.map(c => <CommentItem key={c.id} comment={c} />)}
                        </div>

                        <form onSubmit={e => { e.preventDefault(); addComment(); }} className="mt-6 border-t border-line pt-5 dark:border-slate-800">
                            <label htmlFor="comment" className={cn('mb-1.5 block text-[13px] font-medium', tx.ink)}>Add a comment</label>
                            <textarea
                                id="comment"
                                rows={3}
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={onCommentKey}
                                aria-describedby="comment-hint"
                                className="w-full resize-y rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <p id="comment-hint" className={cn('text-[12.5px]', tx.muted)}>Everyone on the project can see this. Ctrl or ⌘ + Enter to post.</p>
                                <Button type="submit" disabled={!commentText.trim() || createComment.isPending} className={primaryBtn}>
                                    {createComment.isPending ? 'Posting…' : 'Post comment'}
                                </Button>
                            </div>
                        </form>
                    </section>
                </TabsContent>

                {/* --- Activity --- */}
                <TabsContent value="activity" className="mt-0 outline-none">
                    <section aria-labelledby="act-heading" className={cn(card, 'p-5 md:p-6')}>
                        <h2 id="act-heading" className={cn('text-[17px] font-semibold', tx.ink)}>Change history</h2>
                        <p className={cn('text-[13px]', tx.muted)}>Every change to this project and who made it.</p>
                        <div className="mt-4"><AuditFeed entityType="project" entityId={id} /></div>
                    </section>
                </TabsContent>

                {/* --- Files --- */}
                <TabsContent value="files" className="mt-0 space-y-4 outline-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className={cn('text-[17px] font-semibold', tx.ink)}>Files</h2>
                            <p className={cn('text-[13px]', tx.muted)}>Contracts, drawings and site reports, up to 25 MB each.</p>
                        </div>
                        <Button onClick={() => fileInput.current?.click()} disabled={uploading} variant="outline" className="gap-1.5">
                            <Upload className="h-4 w-4" aria-hidden /> {uploading ? 'Uploading…' : 'Upload files'}
                        </Button>
                        <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={e => uploadFiles(e.target.files)} />
                    </div>

                    {attachments.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {attachments.map(a => <li key={a.id}><AttachmentCard asset={a} /></li>)}
                        </ul>
                    ) : (
                        <p className={cn('rounded-[14px] border border-dashed border-line-strong p-8 text-center text-[14px] dark:border-slate-700', tx.muted)}>
                            No files yet. Upload contracts, drawings and site reports so everyone works from the same copy.
                        </p>
                    )}
                </TabsContent>
            </Tabs>

            <CreateTaskModal open={isCreateTaskOpen} onClose={() => setIsCreateTaskOpen(false)} initialProjectId={id} />
            <TaskDetailModal taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
            <MilestoneDialog projectId={id} open={isMilestoneOpen} onClose={() => setIsMilestoneOpen(false)} />
        </div>
    );
}

// --- Sub-components ---

function Figure({ label, value, sub, faint, danger }: { label: string; value: string; sub?: string; faint?: boolean; danger?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className={cn('text-[12px]', tx.muted)}>{label}</dt>
            {/* Figures wrap rather than truncate, so a value is never shown cut off. */}
            <dd className={cn(
                'mt-0.5 break-words tabular-nums',
                faint ? cn('text-[14px]', tx.muted) : cn('text-[15px] font-semibold', danger ? 'text-blocked dark:text-red-300' : tx.ink)
            )}>
                {value}
            </dd>
            {sub && <dd className={cn('mt-0.5 break-words text-[12.5px] tabular-nums', tx.muted)}>{sub}</dd>}
        </div>
    );
}

/** Neutral stage label; only blocked and overdue work gets colour, because it needs action. */
function StageTag({ stage, overdue }: { stage: Task['stage']; overdue?: boolean }) {
    const alert = stage === 'blockers' || overdue;
    return (
        <span className={cn(
            'shrink-0 whitespace-nowrap rounded-[6px] border px-2 py-0.5 text-[12px] font-medium',
            alert ? 'border-blocked/30 bg-blocked/5 text-blocked dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-300' : cn('border-line dark:border-slate-700', tx.muted)
        )}>
            {stage === 'blockers' ? 'Blocked' : overdue ? 'Overdue' : STAGE_LABEL[stage] ?? stage}
        </span>
    );
}

function MilestoneRow({ milestone: m, onToggle, onDelete }: { milestone: Milestone; onToggle: () => void; onDelete: () => void }) {
    const done = m.status === 'completed';
    const overdue = m.status === 'overdue' || isOverdue(m.due_date, done || m.status === 'cancelled');
    return (
        <li className="flex items-start gap-3 py-3">
            <button
                type="button"
                onClick={onToggle}
                aria-pressed={done}
                aria-label={done ? `Mark "${m.name}" as not done` : `Mark "${m.name}" as done`}
                className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                    done ? 'border-ink bg-ink text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900' : 'border-line-strong hover:border-ink dark:border-slate-600 dark:hover:border-slate-300',
                    focusRing
                )}
            >
                {done && <Check className="h-3.5 w-3.5" aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
                <p className={cn('text-[14px] font-medium', done ? cn(tx.muted, 'line-through') : tx.ink)}>{m.name}</p>
                {m.description && <p className={cn('mt-0.5 line-clamp-2 text-[13px]', tx.muted)}>{m.description}</p>}
                <p className={cn('mt-1 text-[12.5px]', overdue ? 'font-semibold text-blocked dark:text-red-300' : tx.muted)}>
                    {done
                        ? `Done${m.completed_date ? ` ${formatDate(m.completed_date)}` : ''}`
                        : m.due_date
                            ? `${overdue ? 'Overdue · was due' : 'Due'} ${formatDate(m.due_date)}`
                            : m.status === 'cancelled' ? 'Cancelled' : 'No due date'}
                </p>
            </div>
            <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete milestone "${m.name}"`}
                className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] hover:bg-paper hover:text-blocked dark:hover:bg-slate-800 dark:hover:text-red-300', tx.muted, focusRing)}
            >
                <Trash2 className="h-4 w-4" aria-hidden />
            </button>
        </li>
    );
}

function CommentItem({ comment }: { comment: ProjectComment }) {
    const name = comment.user?.name ?? 'Former user';
    return (
        <article className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-semibold text-ink dark:bg-slate-800 dark:text-slate-200" aria-hidden>
                {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={cn('text-[13.5px] font-semibold', tx.ink)}>{name}</span>
                    <time dateTime={comment.created_at} className={cn('text-[12.5px]', tx.muted)}>{formatDate(comment.created_at)}</time>
                </p>
                <p className={cn('mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed', tx.ink)}>{comment.content}</p>
            </div>
        </article>
    );
}

function AttachmentCard({ asset }: { asset: ProjectAttachment }) {
    const open = async () => {
        if (!asset.url?.startsWith('storage://')) { window.open(asset.url, '_blank', 'noopener'); return; }
        const [, bucket, ...rest] = asset.url.replace('storage://', '/').split('/');
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(rest.join('/'), 600);
        if (error || !data) { toast.error('Couldn’t open the file'); return; }
        window.open(data.signedUrl, '_blank', 'noopener');
    };
    const size = asset.file_size ? `${(asset.file_size / 1024 / 1024).toFixed(1)} MB` : '';
    return (
        <button type="button" onClick={open} className={cn(card, 'block w-full p-4 text-left transition-colors hover:border-line-strong dark:hover:border-slate-700', focusRing)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-paper text-ink-muted dark:bg-slate-800 dark:text-slate-300">
                <FileText className="h-5 w-5" aria-hidden />
            </span>
            <span className={cn('mt-3 block truncate text-[14px] font-semibold', tx.ink)} title={asset.file_name}>{asset.file_name}</span>
            <span className={cn('mt-1 block text-[12.5px]', tx.muted)}>{[size, asset.created_at ? formatDate(asset.created_at) : ''].filter(Boolean).join(' · ')}</span>
        </button>
    );
}
