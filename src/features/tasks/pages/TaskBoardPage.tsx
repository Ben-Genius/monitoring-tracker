import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDroppable,
    type Announcements,
} from '@dnd-kit/core';
import { subDays } from 'date-fns';
import { Plus, Search, List, LayoutGrid, UserRound } from 'lucide-react';
import { useTasks, Task } from '../hooks/useTasks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import TaskCard from '../components/TaskCard';
import TaskListView from '../components/TaskListView';
import TaskDetailModal from '../components/TaskDetailModal';
import CreateTaskModal from '../components/CreateTaskModal';
import { useTaskMover, TASK_MOVED_EVENT, type TaskMovedDetail } from '../components/TaskMover';
import { STAGES, type StageDef } from '../utils/stages';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { canCoordinate } from '@/lib/permissions';

type View = 'board' | 'list';
const VIEW_KEY = 'tasks-view';
/** Done shows recent finishes only; older ones are one click away. */
const RECENT_DONE_DAYS = 14;
/** Each column shows its most pressing cards first; the rest are one click away. */
const COLUMN_LIMIT = 25;

function initialView(): View {
    try {
        const saved = localStorage.getItem(VIEW_KEY);
        if (saved === 'board' || saved === 'list') return saved;
    } catch { /* storage blocked: use the default */ }
    return 'board';
}

const segBtn = (on: boolean) => cn(
    'inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
    on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-100'
);

export default function TaskBoardPage() {
    const { user } = useAuth();
    const canCreateTask = canCoordinate(user) || user?.role === 'lead';
    const isStaff = user?.role === 'employee';

    const { selectedCompanyId } = useCompanyStore();
    const { data: tasks, isLoading } = useTasks({
        company_id: selectedCompanyId === 'all' ? undefined : selectedCompanyId
    });
    const mover = useTaskMover();

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedTaskId = searchParams.get('task');
    const openTask = (id: string | null) => {
        const next = new URLSearchParams(searchParams);
        if (id) next.set('task', id); else next.delete('task');
        setSearchParams(next, { replace: !id });
    };

    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
    const qParam = searchParams.get('q');
    useEffect(() => { if (qParam != null) setSearchTerm(qParam); }, [qParam]);
    const [view, setViewState] = useState<View>(initialView);
    const setView = (v: View) => {
        setViewState(v);
        try { localStorage.setItem(VIEW_KEY, v); } catch { /* not remembered */ }
    };
    const [showAllDone, setShowAllDone] = useState(false);
    const [expanded, setExpanded] = useState<Set<Task['stage']>>(new Set());
    const expand = (stage: Task['stage']) => setExpanded(prev => new Set(prev).add(stage));
    // Staff open on their own work; coordinators open on everything.
    const [mineOnly, setMineOnly] = useState(isStaff);
    const [mobileStage, setMobileStage] = useState<Task['stage']>('in_progress');
    useEffect(() => { setMineOnly(user?.role === 'employee'); }, [user?.role]);
    // A new search or filter starts collapsed again.
    useEffect(() => { setExpanded(new Set()); }, [searchTerm, mineOnly]);

    // Highlight the card where it landed, so the person sees the move happened.
    const [justMoved, setJustMoved] = useState<string | null>(null);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const onMoved = (e: Event) => {
            const { id, stage } = (e as CustomEvent<TaskMovedDetail>).detail;
            setJustMoved(id);
            setMobileStage(stage);
            clearTimeout(timer);
            timer = setTimeout(() => setJustMoved(null), 4000);
        };
        window.addEventListener(TASK_MOVED_EVENT, onMoved);
        return () => { window.removeEventListener(TASK_MOVED_EVENT, onMoved); clearTimeout(timer); };
    }, []);
    const showCompany = selectedCompanyId === 'all';

    // Mouse: drag after moving 6px, so a click still opens the task.
    // Touch: press and hold, so the column can still be scrolled with a swipe.
    // Keyboard users move tasks with "Update status", which also asks for the required update.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
    );

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        const q = searchTerm.trim().toLowerCase();
        return tasks.filter((task: Task) => {
            if (mineOnly && user && task.assignee_id !== user.id && !task.assignees?.some(a => a.user.id === user.id)) return false;
            if (!q) return true;
            return task.title.toLowerCase().includes(q) ||
                task.description?.toLowerCase().includes(q) ||
                task.project?.name.toLowerCase().includes(q) ||
                task.assignee?.name.toLowerCase().includes(q);
        });
    }, [tasks, searchTerm, mineOnly, user]);

    // Old finished work is history, not something to act on. Searching still finds it.
    const { visibleTasks, hiddenDone } = useMemo(() => {
        if (showAllDone || searchTerm.trim()) return { visibleTasks: filteredTasks, hiddenDone: 0 };
        const cutoff = subDays(new Date(), RECENT_DONE_DAYS).getTime();
        const isOld = (t: Task) => t.stage === 'completed' && new Date(t.completed_at ?? t.updated_at).getTime() < cutoff;
        return { visibleTasks: filteredTasks.filter(t => !isOld(t)), hiddenDone: filteredTasks.filter(isOld).length };
    }, [filteredTasks, showAllDone, searchTerm]);

    const byStage = useMemo(() => {
        const map = new Map<Task['stage'], Task[]>();
        STAGES.forEach(s => map.set(s.id, []));
        visibleTasks.forEach(t => map.get(t.stage)?.push(t));
        map.forEach((list, stage) => list.sort(stage === 'completed'
            // Most recently finished first.
            ? (a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at)
            // Urgent first, then nearest deadline.
            : (a, b) => Number(b.is_urgent) - Number(a.is_urgent) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')));
        return map;
    }, [visibleTasks]);

    // "Talking stage" is pre-assignment pipeline; only show it when something is in it.
    const stages = STAGES.filter(s => s.id !== 'talking_stage' || (byStage.get('talking_stage')?.length ?? 0) > 0);
    const stageName = (id: unknown) => STAGES.find(s => s.id === id)?.label ?? 'a column';
    const titleOf = (id: unknown) => tasks?.find(t => t.id === id)?.title ?? 'Task';

    // Screen-reader messages name the task and column instead of reading out IDs.
    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
        onDragOver: ({ active, over }) => over ? `${titleOf(active.id)} is over ${stageName(over.id)}.` : `${titleOf(active.id)} is not over a column.`,
        onDragEnd: ({ active, over }) => over ? `${titleOf(active.id)} dropped on ${stageName(over.id)}. Confirm the move in the dialog.` : `${titleOf(active.id)} was not moved.`,
        onDragCancel: ({ active }) => `Move cancelled. ${titleOf(active.id)} stays where it was.`,
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveTask(tasks?.find((t: Task) => t.id === event.active.id) || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;
        const task = tasks?.find((t: Task) => t.id === active.id);
        if (task) mover.requestMove(task, over.id as Task['stage']);
    };

    const handleTaskComplete = (taskId: string, completed: boolean) => {
        const task = tasks?.find(t => t.id === taskId);
        if (task) mover.requestMove(task, completed ? 'completed' : 'in_progress');
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
                <Skeleton className="h-8 w-32" />
                <div className="mt-4 flex flex-1 gap-4 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-[300px] flex-shrink-0 space-y-3 rounded-[12px] border border-line bg-paper/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                            <Skeleton className="h-5 w-24" />
                            {[1, 2, 3].map(j => <Skeleton key={j} className="h-28 w-full rounded-[10px]" />)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const moveHandler = (task: Task) => (stage: Task['stage']) => mover.requestMove(task, stage);
    const cardProps = (task: Task) => ({
        task,
        onClick: () => openTask(task.id),
        onMove: mover.canMove ? moveHandler(task) : undefined,
        onUpdate: mover.canMove ? () => mover.requestUpdate(task) : undefined,
        justMoved: justMoved === task.id,
        showCompany,
    });
    const mobileAll = byStage.get(mobileStage) ?? [];
    const mobileTasks = expanded.has(mobileStage) ? mobileAll : mobileAll.slice(0, COLUMN_LIMIT);
    const moreButton = (stage: Task['stage'], total: number) => total > COLUMN_LIMIT && !expanded.has(stage) && (
        <button type="button" onClick={() => expand(stage)} className="w-full rounded-[8px] py-2 text-[13px] font-semibold text-progress hover:bg-surface hover:underline dark:text-blue-300 dark:hover:bg-slate-800">
            Show {total - COLUMN_LIMIT} more
        </button>
    );
    const doneFooter = hiddenDone > 0 && (
        <button type="button" onClick={() => setShowAllDone(true)} className="w-full rounded-[8px] py-2 text-[13px] font-semibold text-progress hover:bg-surface hover:underline dark:text-blue-300 dark:hover:bg-slate-800">
            Show {hiddenDone} older finished {hiddenDone === 1 ? 'task' : 'tasks'}
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-100px)] flex-col gap-4">
            {/* Title and the one primary action */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-[26px] font-bold tracking-tight text-ink dark:text-slate-100">Tasks</h1>
                    {mover.canMove ? (
                        <>
                            <p className="mt-0.5 hidden max-w-2xl text-sm text-ink-muted dark:text-slate-400 md:block">
                                Use <span className="font-semibold text-ink dark:text-slate-100">Update status</span> on a card, or drag it to another column. Each move asks for a short update; Done also needs proof.
                            </p>
                            {/* Phones: keep the how-to one tap away so the tasks start higher up. */}
                            <details className="mt-1 text-sm text-ink-muted dark:text-slate-400 md:hidden">
                                <summary className="cursor-pointer font-medium text-ink dark:text-slate-100">How moving works</summary>
                                <p className="mt-1">Use <span className="font-semibold text-ink dark:text-slate-100">Update status</span> on a card. Each move asks for a short update; Done also needs proof.</p>
                            </details>
                        </>
                    ) : (
                        <p className="mt-0.5 max-w-2xl text-sm text-ink-muted dark:text-slate-400">Every task across the companies you can see.</p>
                    )}
                </div>
                {canCreateTask && (
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progress dark:bg-white dark:text-ink dark:hover:bg-white/90"
                    >
                        <Plus className="h-4 w-4" aria-hidden /> New task
                    </button>
                )}
            </div>

            {/* One toolbar row: search, then filters and layout */}
            <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-sm">
                    <span className="sr-only">Search tasks, projects or people</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-slate-400" aria-hidden />
                    <input
                        type="search"
                        placeholder="Search tasks, projects, people"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 w-full rounded-[8px] border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => setMineOnly(m => !m)}
                    aria-pressed={mineOnly}
                    className={cn(
                        'inline-flex h-10 items-center gap-1.5 rounded-[8px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                        mineOnly ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line bg-surface text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    )}
                >
                    <UserRound className="h-4 w-4" aria-hidden /> My tasks
                </button>
                <div role="group" aria-label="Layout" className="ml-auto flex rounded-[8px] border border-line bg-surface p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')} className={segBtn(view === 'board')}>
                        <LayoutGrid className="h-4 w-4" aria-hidden /> Board
                    </button>
                    <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={segBtn(view === 'list')}>
                        <List className="h-4 w-4" aria-hidden /> List
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-0 flex-1">
                {view === 'list' ? (
                    <div className="h-full overflow-auto">
                        <TaskListView tasks={visibleTasks} onTaskClick={openTask} onTaskComplete={handleTaskComplete} hiddenDone={hiddenDone} onShowAllDone={() => setShowAllDone(true)} />
                    </div>
                ) : (
                    <>
                        {/* Phone: one stage at a time */}
                        <div className="flex h-full flex-col md:hidden">
                            <div role="group" aria-label="Stage" className="grid grid-cols-4 gap-1 rounded-[12px] border border-line bg-surface p-1 dark:border-slate-800 dark:bg-slate-900">
                                {stages.filter(s => s.id !== 'talking_stage').map(s => {
                                    const active = s.id === mobileStage;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setMobileStage(s.id)}
                                            className={cn(
                                                'rounded-[9px] px-1 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                                                active ? 'bg-paper text-ink dark:bg-slate-800 dark:text-slate-100' : 'text-ink-muted dark:text-slate-400'
                                            )}
                                        >
                                            <span className="block text-lg font-bold leading-none tabular-nums">{byStage.get(s.id)?.length ?? 0}</span>
                                            <span className="mt-1 block text-[12px] font-semibold leading-tight">{s.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex-1 space-y-3 overflow-y-auto pb-6 pt-3">
                                {mobileTasks.map(task => <TaskCard key={task.id} {...cardProps(task)} />)}
                                {mobileTasks.length === 0 && (
                                    <p className="py-12 text-center text-sm text-ink-muted dark:text-slate-400">
                                        {mineOnly ? 'None of your tasks are here.' : 'No tasks here.'}
                                    </p>
                                )}
                                {moreButton(mobileStage, mobileAll.length)}
                                {mobileStage === 'completed' && doneFooter}
                            </div>
                        </div>

                        {/* Tablet and up: the board */}
                        <div className="hidden h-full overflow-x-auto md:block">
                            <DndContext
                                sensors={sensors}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragCancel={() => setActiveTask(null)}
                                accessibility={{ announcements, screenReaderInstructions: { draggable: 'Drag with a mouse or touch. With a keyboard, use Update status on the card.' } }}
                            >
                                <div className="flex h-full items-start gap-4 pb-4">
                                    {stages.map((stage) => {
                                        const all = byStage.get(stage.id) ?? [];
                                        return (
                                        <TaskColumn
                                            key={stage.id}
                                            stage={stage}
                                            total={all.length}
                                            tasks={expanded.has(stage.id) ? all : all.slice(0, COLUMN_LIMIT)}
                                            // New tasks always start in Yet to start, so that is the only column offering +.
                                            onAddTask={canCreateTask && stage.id === 'yet_to_start' ? () => setIsCreateModalOpen(true) : undefined}
                                            cardProps={cardProps}
                                            dragging={!!activeTask && activeTask.stage !== stage.id}
                                            footer={<>{moreButton(stage.id, all.length)}{stage.id === 'completed' && doneFooter}</>}
                                            note={stage.id === 'completed' && hiddenDone > 0 ? `Last ${RECENT_DONE_DAYS} days` : undefined}
                                        />
                                        );
                                    })}
                                </div>
                                <DragOverlay dropAnimation={null}>
                                    {activeTask ? (
                                        <div className="pointer-events-none w-[284px] origin-center rotate-2 scale-105">
                                            <TaskCard task={activeTask} isDragging />
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </>
                )}
            </div>

            <CreateTaskModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <TaskDetailModal taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => openTask(null)} />
            {mover.dialog}
        </div>
    );
}

interface TaskColumnProps {
    stage: StageDef;
    tasks: Task[];
    /** Count of every task in the column, including any not drawn yet. */
    total: number;
    onAddTask?: () => void;
    cardProps: (task: Task) => React.ComponentProps<typeof TaskCard>;
    dragging: boolean;
    footer?: React.ReactNode;
    note?: string;
}

function TaskColumn({ stage, tasks, total, onAddTask, cardProps, dragging, footer, note }: TaskColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    return (
        <section
            ref={setNodeRef}
            aria-label={stage.label}
            className={cn(
                'flex max-h-full min-w-[250px] max-w-[380px] flex-1 flex-col rounded-[12px] border bg-paper/70 transition-colors dark:bg-slate-900/60',
                isOver ? 'border-2 border-ink dark:border-slate-200' : dragging ? 'border-dashed border-line-strong dark:border-slate-600' : 'border-line dark:border-slate-800'
            )}
        >
            <header className="flex items-start gap-2 border-b border-line px-3.5 pb-3 pt-3 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                    <h2 className="flex items-baseline gap-2 text-[14px] font-semibold text-ink dark:text-slate-100">
                        <span className="h-2 w-2 shrink-0 self-center rounded-full" style={{ backgroundColor: stage.accent }} aria-hidden />
                        {stage.label}
                        <span className="text-[13px] font-semibold tabular-nums text-ink-muted dark:text-slate-400">{total}</span>
                        {note && <span className="text-[12px] font-medium text-ink-muted dark:text-slate-400">· {note}</span>}
                    </h2>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-muted dark:text-slate-400">{stage.hint}</p>
                </div>
                {onAddTask && (
                    <button type="button" onClick={onAddTask} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-ink-muted hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="Add a task">
                        <Plus className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </header>

            <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {tasks.map((task) => <TaskCard key={task.id} {...cardProps(task)} />)}
                {total === 0 && (
                    <div className="flex items-center justify-center rounded-[10px] border border-dashed border-line-strong px-4 py-10 dark:border-slate-700">
                        <p className="text-center text-[12px] text-ink-muted dark:text-slate-400">
                            {dragging ? `Drop here to move to ${stage.label}` : 'Nothing here'}
                        </p>
                    </div>
                )}
                {footer}
            </div>
        </section>
    );
}
