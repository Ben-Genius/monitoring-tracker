import { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical } from 'lucide-react';
import { useTasks, useUpdateTaskStage, Task } from '../hooks/useTasks';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';

const stages = [
    { id: 'talking_stage', name: 'Talking Stage', color: 'talking' },
    { id: 'yet_to_start', name: 'Yet to Start', color: 'yetToStart' },
    { id: 'in_progress', name: 'In Progress', color: 'inProgress' },
    { id: 'blockers', name: 'Blockers', color: 'blocker' },
    { id: 'completed', name: 'Completed', color: 'completed' },
] as const;

export default function TaskBoardPage() {
    const { data: tasks, isLoading } = useTasks();
    const updateTaskStage = useUpdateTaskStage();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const getTasksByStage = (stageId: string) => {
        return tasks?.filter((task) => task.stage === stageId) || [];
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks?.find((t) => t.id === event.active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const newStage = over.id as Task['stage'];

        // Find the task being dragged
        const task = tasks?.find((t) => t.id === taskId);
        if (!task || task.stage === newStage) return;

        // Update task stage
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
                    <p className="text-gray-500 mt-1">
                        Manage and track tasks across all stages
                    </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages.map((stage) => {
                        const stageTasks = getTasksByStage(stage.id);
                        return (
                            <TaskColumn
                                key={stage.id}
                                stage={stage}
                                tasks={stageTasks}
                                stageId={stage.id}
                            />
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
                </DragOverlay>
            </DndContext>

            {/* Create Task Modal */}
            <CreateTaskModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}

interface TaskColumnProps {
    stage: typeof stages[number];
    tasks: Task[];
    stageId: string;
}

function TaskColumn({ stage, tasks, stageId }: TaskColumnProps) {
    const { useDroppable } = require('@dnd-kit/core');
    const { setNodeRef } = useDroppable({ id: stageId });

    return (
        <div className="flex-shrink-0 w-80">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full bg-${stage.color}`} />
                            <CardTitle className="text-sm font-semibold">
                                {stage.name}
                            </CardTitle>
                        </div>
                        <Badge variant="outline">{tasks.length}</Badge>
                    </div>
                </CardHeader>
                <CardContent ref={setNodeRef} className="space-y-3 min-h-[400px]">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No tasks in this stage
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
