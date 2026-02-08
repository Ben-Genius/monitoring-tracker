import { useState, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
    Plus,
    MessageSquare,
    Circle,
    PlayCircle,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    List,
    LayoutGrid
} from 'lucide-react';
import { useTasks, useUpdateTaskStage, Task } from '../hooks/useTasks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TaskCard from '../components/TaskCard';
import TaskListView from '../components/TaskListView';
import TaskDrawer from '../components/TaskDrawer';
import CreateTaskModal from '../components/CreateTaskModal';
import { cn, getCompanyTheme } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';

const baseStages = [
    { id: 'talking_stage', name: 'Talking Stage', color: 'bg-blue-500', icon: MessageSquare, tint: 'bg-blue-50/50' },
    { id: 'yet_to_start', name: 'Yet to Start', color: 'bg-slate-400', icon: Circle, tint: 'bg-slate-50/50' },
    { id: 'in_progress', name: 'In Progress', color: 'bg-primary', icon: PlayCircle, tint: 'bg-primary/5' },
    { id: 'blockers', name: 'Blockers', color: 'bg-warning', icon: AlertCircle, tint: 'bg-warning/10' },
    { id: 'completed', name: 'Completed', color: 'bg-success', icon: CheckCircle2, tint: 'bg-success/10' },
] as const;

export default function TaskBoardPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isLead = user?.role === 'lead';

    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: tasks, isLoading } = useTasks({
        company_id: selectedCompanyId === 'all' ? undefined : selectedCompanyId
    });
    const updateTaskStage = useUpdateTaskStage();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'list' | 'board'>('list');
    const searchQuery = searchTerm.toLowerCase();

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    const stages = useMemo(() => {
        return baseStages.map(stage => {
            if (stage.id === 'in_progress') {
                return {
                    ...stage,
                    color: `text-[${theme.primary}]`,
                    style: { color: theme.primary },
                    tintStyle: { backgroundColor: `${theme.primary}05` }
                };
            }
            return stage;
        });
    }, [theme]);

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((task: Task) =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.project?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tasks, searchQuery]);

    const getTasksByStage = (stageId: string) => {
        return filteredTasks.filter((task) => task.stage === stageId);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks?.find((t: Task) => t.id === event.active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const newStage = over.id as Task['stage'];

        // Find the task being dragged
        const task = tasks?.find((t: Task) => t.id === taskId);
        if (!task || task.stage === newStage) return;

        // Update task stage
        updateTaskStage.mutate({ id: taskId, stage: newStage });
    };

    const handleTaskComplete = (taskId: string, completed: boolean) => {
        const newStage = completed ? 'completed' : 'yet_to_start';
        updateTaskStage.mutate({ id: taskId, stage: newStage });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Tasks</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage and track all your tasks
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                view === 'list'
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <List className="h-4 w-4 inline mr-1.5" />
                            List
                        </button>
                        <button
                            onClick={() => setView('board')}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                view === 'board'
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4 inline mr-1.5" />
                            Board
                        </button>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search tasks..."
                            className="pl-9 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                    {(isAdmin || isLead) && (
                        <Button
                            size="sm"
                            className="h-9 transition-transform hover:scale-105"
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{
                                backgroundColor: theme.primary,
                                boxShadow: `0 10px 15px -3px ${theme.primary}30`
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {view === 'list' ? (
                    <TaskListView
                        tasks={filteredTasks}
                        onTaskClick={handleTaskClick}
                        onTaskComplete={handleTaskComplete}
                    />
                ) : (
                    <div className="h-full -mx-4 px-4 overflow-x-auto">
                        <DndContext
                            sensors={sensors}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="flex gap-6 h-full pb-4 items-start">
                                {stages.map((stage) => {
                                    const stageTasks = getTasksByStage(stage.id);
                                    return (
                                        <TaskColumn
                                            key={stage.id}
                                            stage={stage as any}
                                            tasks={stageTasks}
                                            stageId={stage.id}
                                            onAddTask={() => setIsCreateModalOpen(true)}
                                            onTaskClick={handleTaskClick}
                                            activeTheme={theme}
                                        />
                                    );
                                })}
                            </div>

                            <DragOverlay dropAnimation={null}>
                                {activeTask ? (
                                    <div className="rotate-3 scale-105 pointer-events-none origin-center">
                                        <TaskCard task={activeTask} isDragging />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                )}
            </div>

            <CreateTaskModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <TaskDrawer
                taskId={selectedTaskId}
                open={!!selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
            />
        </div>
    );
}

interface TaskColumnProps {
    stage: typeof baseStages[number] & { style?: React.CSSProperties, tintStyle?: React.CSSProperties };
    tasks: Task[];
    onAddTask: () => void;
    stageId: string;
    onTaskClick: (taskId: string) => void;
    activeTheme: { primary: string; accent: string };
}

function TaskColumn({ stage, tasks, onAddTask, stageId, onTaskClick, activeTheme }: TaskColumnProps) {
    const { setNodeRef } = useDroppable({
        id: stageId,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-shrink-0 w-[350px] rounded-xl flex flex-col max-h-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50",
                stage.tint
            )}
            style={stage.tintStyle}
        >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between sticky top-0 bg-transparent backdrop-blur-sm z-10">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn("p-1.5 rounded-md shadow-sm bg-white dark:bg-slate-800", stage.color.startsWith('bg-') ? stage.color.replace('bg-', 'text-') : '')}
                        style={stage.style}
                    >
                        <stage.icon className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none">{stage.name}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{tasks.length} tasks</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-md"
                    onClick={onAddTask}
                >
                    <Plus className="h-4 w-4 text-slate-500" />
                </Button>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 scrollbar-thin">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task.id)}
                    />
                ))}

                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
                            No tasks in this stage
                        </p>
                    </div>
                )}

                {tasks.length > 0 && (
                    <button
                        onClick={onAddTask}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                        onMouseEnter={(e) => (e.currentTarget.style.color = activeTheme.primary)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                        <Plus className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        Add Task
                    </button>
                )}
            </div>
        </div>
    );
}
