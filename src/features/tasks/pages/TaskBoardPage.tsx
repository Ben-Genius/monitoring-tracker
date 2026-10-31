import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
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
import { cn, getCompanyTheme } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { canCoordinate } from '@/lib/permissions';

export default function TaskBoardPage() {
    const { user } = useAuth();
    const canCreateTask = canCoordinate(user) || user?.role === 'lead';
    const isStaff = user?.role === 'employee';

    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
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
    const [view, setView] = useState<'list' | 'board'>('board');
    // Staff open on their own work; coordinators open on everything.
    const [mineOnly, setMineOnly] = useState(isStaff);
    const [mobileStage, setMobileStage] = useState<Task['stage']>('in_progress');
    useEffect(() => { setMineOnly(user?.role === 'employee'); }, [user?.role]);

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

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);
    const theme = getCompanyTheme(currentCompanyName);

    // Mouse: drag after moving 6px, so a click still opens the task.
    // Touch: press and hold, so the column can still be scrolled with a swipe.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor)
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

    const byStage = useMemo(() => {
        const map = new Map<Task['stage'], Task[]>();
        STAGES.forEach(s => map.set(s.id, []));
        filteredTasks.forEach(t => map.get(t.stage)?.push(t));
        // Urgent first, then nearest deadline.
        map.forEach(list => list.sort((a, b) =>
            Number(b.is_urgent) - Number(a.is_urgent) ||
            (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
        ));
        return map;
    }, [filteredTasks]);

    // "Talking stage" is pre-assignment pipeline; only show it when something is in it.
    const stages = STAGES.filter(s => s.id !== 'talking_stage' || (byStage.get('talking_stage')?.length ?? 0) > 0);

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
            <div className="animate-fade-in flex flex-col h-[calc(100vh-100px)] space-y-4">
                <Skeleton className="h-8 w-32" />
                <div className="flex-1 flex gap-4 overflow-hidden mt-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-shrink-0 w-[300px] rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 p-3 space-y-3">
                            <Skeleton className="h-5 w-24" />
                            {[1, 2, 3].map(j => <Skeleton key={j} className="h-28 w-full rounded-xl" />)}
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
    const mobileTasks = byStage.get(mobileStage) ?? [];

    return (
        <div className="animate-fade-in flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                    <h1 className="text-[26px] font-bold tracking-tight text-ink">Tasks</h1>
                    <p className="mt-0.5 text-sm text-ink-muted max-w-2xl">
                        {mover.canMove
                            ? <>Use <span className="font-semibold text-ink">Update status</span> on a card<span className="hidden md:inline">, or drag it to another column</span>. Each move asks for a short update; Done also needs proof.</>
                            : 'Every task across the companies you can see.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(['board', 'list'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    view === v ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm" : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                {v === 'board' ? <LayoutGrid className="h-4 w-4 inline mr-1.5" /> : <List className="h-4 w-4 inline mr-1.5" />}
                                {v === 'board' ? 'Board' : 'List'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setMineOnly(m => !m)}
                        aria-pressed={mineOnly}
                        className={cn(
                            "h-9 px-3 rounded-lg border text-sm font-medium inline-flex items-center gap-1.5 transition-colors",
                            mineOnly ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                        )}
                        style={mineOnly ? { backgroundColor: theme.primary } : undefined}
                    >
                        <UserRound className="h-4 w-4" /> My tasks
                    </button>
                    <div className="relative w-full sm:w-60 order-last sm:order-none">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search tasks, projects, people..."
                            className="pl-9 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreateTask && (
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ backgroundColor: theme.primary }}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            New Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                {view === 'list' ? (
                    <div className="h-full overflow-auto">
                        <TaskListView tasks={filteredTasks} onTaskClick={openTask} onTaskComplete={handleTaskComplete} />
                    </div>
                ) : (
                    <>
                        {/* Phone: one stage at a time */}
                        <div className="md:hidden flex flex-col h-full">
                            <div className="grid grid-cols-4 gap-1 rounded-[12px] border border-line bg-surface p-1">
                                {stages.filter(s => s.id !== 'talking_stage').map(s => {
                                    const active = s.id === mobileStage;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setMobileStage(s.id)}
                                            className={cn(
                                                "relative rounded-[9px] px-1 py-2 text-center transition-colors",
                                                active ? "bg-paper text-ink" : "text-ink-muted"
                                            )}
                                        >
                                            <span className="block text-lg font-bold leading-none tabular-nums" style={active ? { color: s.accent } : undefined}>
                                                {byStage.get(s.id)?.length ?? 0}
                                            </span>
                                            <span className="mt-1 block text-[11px] font-semibold leading-tight">{s.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex-1 overflow-y-auto pt-3 space-y-3 pb-6">
                                {mobileTasks.map(task => <TaskCard key={task.id} {...cardProps(task)} />)}
                                {mobileTasks.length === 0 && (
                                    <p className="py-12 text-center text-sm text-slate-400">
                                        {mineOnly ? 'None of your tasks are here.' : 'No tasks here.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tablet and up: the board */}
                        <div className="hidden md:block h-full overflow-x-auto">
                            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
                                <div className="flex gap-4 h-full pb-4 items-start">
                                    {stages.map((stage) => (
                                        <TaskColumn
                                            key={stage.id}
                                            stage={stage}
                                            tasks={byStage.get(stage.id) ?? []}
                                            onAddTask={canCreateTask ? () => setIsCreateModalOpen(true) : undefined}
                                            cardProps={cardProps}
                                            dragging={!!activeTask && activeTask.stage !== stage.id}
                                        />
                                    ))}
                                </div>
                                <DragOverlay dropAnimation={null}>
                                    {activeTask ? (
                                        <div className="rotate-2 scale-105 pointer-events-none origin-center w-[284px]">
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
    onAddTask?: () => void;
    cardProps: (task: Task) => React.ComponentProps<typeof TaskCard>;
    dragging: boolean;
}

function TaskColumn({ stage, tasks, onAddTask, cardProps, dragging }: TaskColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    return (
        <section
            ref={setNodeRef}
            aria-label={stage.label}
            className={cn(
                "flex-1 min-w-[250px] max-w-[380px] flex flex-col max-h-full rounded-[12px] border bg-paper/70 transition-colors",
                isOver ? "border-2" : dragging ? "border-dashed border-line-strong" : "border-line"
            )}
            style={isOver ? { borderColor: stage.accent, backgroundColor: `${stage.accent}0f` } : undefined}
        >
            <header className="flex items-start gap-2 border-b border-line px-3.5 pb-3 pt-3" style={{ boxShadow: `inset 0 3px 0 ${stage.accent}` }}>
                <div className="min-w-0 flex-1">
                    <h2 className="flex items-baseline gap-2 text-[14px] font-semibold text-ink">
                        {stage.label}
                        <span className="text-[13px] font-semibold tabular-nums text-ink-faint">{tasks.length}</span>
                    </h2>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{stage.hint}</p>
                </div>
                {onAddTask && (
                    <button onClick={onAddTask} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-ink-muted hover:bg-surface hover:text-ink" aria-label={`Add a task to ${stage.label}`}>
                        <Plus className="h-4 w-4" />
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
                {tasks.map((task) => <TaskCard key={task.id} {...cardProps(task)} />)}
                {tasks.length === 0 && (
                    <div className="flex items-center justify-center rounded-[10px] border border-dashed border-line-strong px-4 py-10">
                        <p className="text-[12px] text-ink-faint text-center">
                            {dragging ? `Drop here to move to ${stage.label}` : 'Nothing here'}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
