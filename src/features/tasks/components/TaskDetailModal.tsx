import { useState, useEffect } from 'react';
import { X, Calendar, Flag, User, CheckSquare, Plus, Trash2, Send, Layout, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    useTask,
    useUpdateTask,
    useSubtasks,
    useCreateSubtask,
    useToggleSubtask,
    useDeleteSubtask,
    useTaskComments,
    useCreateComment
} from '../hooks/useTasks';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { cn, formatDate } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';

interface TaskDetailModalProps {
    taskId: string | null;
    open: boolean;
    onClose: () => void;
}

export default function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
    const { data: task, isLoading } = useTask(taskId || '');
    const { data: subtasks } = useSubtasks(taskId || '');
    const { data: comments } = useTaskComments(taskId || '');

    const updateTask = useUpdateTask(taskId || '');
    const createSubtask = useCreateSubtask();
    const toggleSubtask = useToggleSubtask(taskId || '');
    const deleteSubtask = useDeleteSubtask(taskId || '');
    const createComment = useCreateComment();

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [description, setDescription] = useState('');
    const [isEditingAssignee, setIsEditingAssignee] = useState(false);
    const [isEditingPriority, setIsEditingPriority] = useState(false);
    const [isEditingStage, setIsEditingStage] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [localAssignees, setLocalAssignees] = useState<string[]>([]);

    const { data: users } = useUsers(task?.project?.company_id);
    const { data: projects } = useProjects();

    useEffect(() => {
        if (task) {
            setDescription(task.description || '');
            setLocalAssignees(task.assignees?.map(a => a.user.id) || (task.assignee_id ? [task.assignee_id] : []));
        }
    }, [task]);

    if (!open || !taskId) return null;

    const handleUpdateDescription = async () => {
        await updateTask.mutateAsync({ description });
        setIsEditingDescription(false);
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        await createSubtask.mutateAsync({ task_id: taskId, title: newSubtaskTitle });
        setNewSubtaskTitle('');
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        await createComment.mutateAsync({ task_id: taskId, content: newComment });
        setNewComment('');
    };

    if (isLoading) return null;
    if (!task) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="relative">
                            <div
                                className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group w-fit"
                                onClick={() => setIsEditingProject(!isEditingProject)}
                            >
                                <Layout className="h-3 w-3" />
                                <span>{task.project?.company?.name || 'General'}</span>
                                <ChevronRight className="h-2.5 w-2.5" />
                                <span className={cn("text-slate-500 group-hover:text-primary", !task.project && "italic")}>
                                    {task.project?.name || 'General Task'}
                                </span>
                                <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] h-4 px-1 ml-2">Edit</Badge>
                            </div>

                            {isEditingProject && (
                                <div className="absolute top-full mt-2 left-0 bg-white border rounded-xl shadow-2xl z-50 min-w-[300px] p-2 animate-in fade-in zoom-in duration-200 max-h-[300px] overflow-y-auto">
                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 mb-1">Select Project</div>
                                    <button
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-xs font-bold rounded-md transition-colors flex items-center gap-2",
                                            !task.project_id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                        onClick={async () => {
                                            await updateTask.mutateAsync({ project_id: null as any }); // Cast to any to allow null if type is strict
                                            setIsEditingProject(false);
                                        }}
                                    >
                                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                                        General Task (No Project)
                                    </button>

                                    {projects?.map(project => (
                                        <button
                                            key={project.id}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-xs font-bold rounded-md transition-colors flex items-center gap-2",
                                                task.project_id === project.id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                                            )}
                                            onClick={async () => {
                                                await updateTask.mutateAsync({ project_id: project.id });
                                                setIsEditingProject(false);
                                            }}
                                        >
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            <div>
                                                <div className="text-slate-900">{project.name}</div>
                                                <div className="text-[9px] text-slate-400 font-normal">{project.company?.name || 'Global'}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-3 w-3 rounded-full shrink-0",
                                task.priority === 'critical' ? 'bg-red-500' :
                                    task.priority === 'high' ? 'bg-orange-500' :
                                        task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                            )} />
                            <h2 className="text-xl font-bold text-slate-900 truncate">
                                {task.title}
                            </h2>
                            <div className="relative group">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "capitalize bg-white border-slate-200 text-slate-600 font-bold px-2 py-0.5 whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors",
                                        isEditingStage && "ring-2 ring-primary/20 border-primary"
                                    )}
                                    onClick={() => setIsEditingStage(!isEditingStage)}
                                >
                                    {task.stage.replace('_', ' ')}
                                </Badge>
                                {isEditingStage && (
                                    <div className="absolute top-full mt-2 right-0 bg-white border rounded-xl shadow-2xl z-20 min-w-[160px] p-2 animate-in fade-in zoom-in duration-200">
                                        {['talking_stage', 'yet_to_start', 'in_progress', 'blockers', 'completed'].map((stage) => (
                                            <button
                                                key={stage}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs font-bold rounded-md transition-colors",
                                                    task.stage === stage ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                                                )}
                                                onClick={async () => {
                                                    await updateTask.mutateAsync({ stage: stage as any });
                                                    setIsEditingStage(false);
                                                }}
                                            >
                                                {stage.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md transition-colors ml-4">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto flex">
                    {/* Left Column - Main Details */}
                    <div className="flex-[2] p-8 space-y-8 border-r overflow-y-auto scrollbar-thin">
                        {/* Description Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Description</h3>
                            </div>
                            {isEditingDescription ? (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    <textarea
                                        className="w-full min-h-[150px] p-4 text-slate-700 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a detailed description..."
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleUpdateDescription} className="font-bold">Save Changes</Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsEditingDescription(true)}
                                    className={cn(
                                        "group relative text-slate-600 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50/50 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-all border border-transparent hover:border-slate-200",
                                        !task.description && "italic text-slate-400"
                                    )}
                                >
                                    {task.description || "No description provided. Click to add..."}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-500">Click to edit</Badge>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Subtasks Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4" />
                                    Subtasks
                                    {subtasks && subtasks.length > 0 && (
                                        <div className="flex items-center gap-3 flex-1 ml-4 justify-end">
                                            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${Math.round((subtasks.filter(s => s.is_completed).length / subtasks.length) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                {subtasks.filter(s => s.is_completed).length}/{subtasks.length} COMPLETED
                                            </span>
                                        </div>
                                    )}
                                </h3>
                            </div>

                            <form onSubmit={handleAddSubtask} className="relative">
                                <Plus className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Add a subtask..."
                                    className="pl-10 h-10 bg-slate-50/50 border-dashed hover:border-slate-400 transition-colors"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                />
                            </form>

                            <div className="space-y-1">
                                {subtasks?.map((subtask) => (
                                    <div
                                        key={subtask.id}
                                        className="group flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <button
                                            onClick={() => toggleSubtask.mutate({ id: subtask.id, is_completed: !subtask.is_completed })}
                                            className={cn(
                                                "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                                                subtask.is_completed
                                                    ? "bg-primary border-primary text-white scale-100"
                                                    : "border-slate-300 bg-white group-hover:border-primary/50"
                                            )}
                                        >
                                            {subtask.is_completed && <CheckSquare className="h-3.5 w-3.5" />}
                                        </button>
                                        <span className={cn(
                                            "flex-1 text-sm transition-all duration-300",
                                            subtask.is_completed ? "text-slate-400 line-through" : "text-slate-700 font-medium"
                                        )}>
                                            {subtask.title}
                                        </span>
                                        <button
                                            onClick={() => deleteSubtask.mutate(subtask.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {(!subtasks || subtasks.length === 0) && (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                        <p className="text-sm text-slate-400">No subtasks yet. Break it down!</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Sidebar & Activity */}
                    <div className="flex-1 bg-slate-50/30 p-8 flex flex-col gap-8 overflow-y-auto scrollbar-thin">
                        {/* Meta Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Task Details</h3>
                            <div className="grid gap-4">
                                {/* Assignee Selector */}
                                <div className="space-y-1.5 relative">
                                    <div className="flex items-center gap-3 text-sm">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-500 w-20">Assignee</span>
                                        <button
                                            onClick={() => setIsEditingAssignee(!isEditingAssignee)}
                                            className="font-bold text-slate-900 flex items-center gap-2 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors -ml-2"
                                        >
                                            {task.assignees && task.assignees.length > 0
                                                ? `${task.assignees.length} Assignee${task.assignees.length > 1 ? 's' : ''}`
                                                : (task.assignee?.name || 'Unassigned')}
                                        </button>
                                    </div>
                                    {isEditingAssignee ? (
                                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border rounded-xl shadow-2xl z-20 p-2 animate-in fade-in zoom-in duration-200 min-w-[250px]">
                                            <MultiSelect
                                                options={users?.map(u => ({ label: u.name, value: u.id })) || []}
                                                selected={localAssignees}
                                                onChange={setLocalAssignees}
                                                placeholder="Select assignees..."
                                            />
                                            <div className="mt-2 flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        // Reset to original on cancel
                                                        setLocalAssignees(task.assignees?.map(a => a.user.id) || []);
                                                        setIsEditingAssignee(false);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        await updateTask.mutateAsync({ assignee_ids: localAssignees });
                                                        setIsEditingAssignee(false);
                                                    }}
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="flex -space-x-2 overflow-hidden py-1 pl-1 cursor-pointer hover:opacity-80"
                                            onClick={() => setIsEditingAssignee(true)}
                                        >
                                            {task.assignees && task.assignees.length > 0 ? (
                                                <>
                                                    {task.assignees.slice(0, 3).map(({ user }) => (
                                                        <div
                                                            key={user.id}
                                                            title={user.name}
                                                            className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 overflow-hidden shadow-sm"
                                                        >
                                                            {user.name.charAt(0)}
                                                        </div>
                                                    ))}
                                                    {task.assignees.length > 3 && (
                                                        <div className="h-6 w-6 rounded-full bg-slate-50 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-sm relative z-0">
                                                            +{task.assignees.length - 3}
                                                        </div>
                                                    )}
                                                </>
                                            ) : task.assignee ? (
                                                <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                                                    {task.assignee.name.charAt(0)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 relative">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-500 w-20">Due Date</span>
                                        <button
                                            onClick={() => setIsEditingDueDate(!isEditingDueDate)}
                                            className="font-bold text-slate-900 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors -ml-2"
                                        >
                                            {task.due_date ? formatDate(task.due_date) : 'Set due date'}
                                        </button>
                                    </div>
                                    {isEditingDueDate && (
                                        <div className="absolute top-full mt-2 left-0 z-20 bg-white border rounded-xl shadow-xl p-3 animate-in fade-in zoom-in duration-200">
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="date"
                                                    className="p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                                                    onChange={async (e) => {
                                                        const date = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                        // If we want to save immediately:
                                                        if (date) {
                                                            await updateTask.mutateAsync({ due_date: date });
                                                            setIsEditingDueDate(false);
                                                        }
                                                    }}
                                                />
                                                <div className="flex justify-between items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 h-7 text-xs hover:text-red-600 hover:bg-red-50"
                                                        onClick={async () => {
                                                            await updateTask.mutateAsync({ due_date: null as any }); // Allow clearing date
                                                            setIsEditingDueDate(false);
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-7 text-xs"
                                                        onClick={() => setIsEditingDueDate(false)}
                                                    >
                                                        Close
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Priority Selector */}
                                <div className="space-y-1.5 relative">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Flag className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-500 w-20">Priority</span>
                                        <button
                                            onClick={() => setIsEditingPriority(!isEditingPriority)}
                                            className="hover:bg-slate-100 px-2 py-1 rounded-md transition-colors -ml-2"
                                        >
                                            <Badge variant={
                                                task.priority === 'critical' ? 'destructive' :
                                                    task.priority === 'high' ? 'warning' : 'outline'
                                            } className="capitalize font-bold">
                                                {task.priority}
                                            </Badge>
                                        </button>
                                    </div>
                                    {isEditingPriority && (
                                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border rounded-xl shadow-2xl z-20 p-2 animate-in fade-in zoom-in duration-200">
                                            {['low', 'medium', 'high', 'critical'].map((p) => (
                                                <button
                                                    key={p}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-xs font-bold rounded-md transition-colors flex items-center gap-2",
                                                        task.priority === p ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                    onClick={async () => {
                                                        await updateTask.mutateAsync({ priority: p as any });
                                                        setIsEditingPriority(false);
                                                    }}
                                                >
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        p === 'critical' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                                                    )} />
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="flex-1 flex flex-col min-h-0 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Task Feed
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
                                {comments?.map((comment) => (
                                    <div key={comment.id} className="flex gap-4 group/comment">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner flex items-center justify-center flex-shrink-0 border border-white">
                                            <span className="text-xs font-black text-slate-600">
                                                {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {comment.user?.name || 'Unknown User'}
                                                    </span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {formatDate(comment.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-white border rounded-2xl rounded-tl-none p-4 shadow-sm border-slate-100/80 group-hover/comment:border-primary/20 transition-colors">
                                                <p className="text-sm text-slate-600 leading-relaxed break-words">
                                                    {comment.comment}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!comments || comments.length === 0) && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                        <Activity className="h-8 w-8 opacity-20" />
                                        <p className="text-xs font-medium">No messages in this feed yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="pt-4 border-t">
                                <div className="relative">
                                    <textarea
                                        className="w-full min-h-[80px] p-3 pl-4 pr-12 text-sm text-slate-700 bg-white border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none shadow-sm"
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment(e as any);
                                            }
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-3 bottom-3 p-1.5 text-primary hover:bg-slate-50 rounded-md transition-colors"
                                        disabled={!newComment.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
