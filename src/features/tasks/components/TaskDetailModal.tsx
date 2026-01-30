import { useState, useEffect } from 'react';
import { X, Calendar, Flag, User, MessageSquare, CheckSquare, Plus, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    useTask,
    useUpdateTask,
    useSubtasks,
    useCreateSubtask,
    useToggleSubtask,
    useDeleteSubtask,
    useTaskComments,
    useCreateComment,
    Task
} from '../hooks/useTasks';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface TaskDetailModalProps {
    taskId: string | null;
    open: boolean;
    onClose: () => void;
}

export default function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
    const { user: currentUser } = useAuth();
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

    useEffect(() => {
        if (task) {
            setDescription(task.description || '');
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
                    <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                            "h-3 w-3 rounded-full",
                            task.priority === 'critical' ? 'bg-red-500' :
                                task.priority === 'high' ? 'bg-orange-500' :
                                    task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                        )} />
                        <h2 className="text-xl font-bold text-slate-900 truncate">
                            {task.title}
                        </h2>
                        <Badge variant="outline" className="capitalize">
                            {task.stage.replace('_', ' ')}
                        </Badge>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
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
                                {!isEditingDescription && (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(true)}>
                                        Edit
                                    </Button>
                                )}
                            </div>
                            {isEditingDescription ? (
                                <div className="space-y-3">
                                    <textarea
                                        className="w-full min-h-[150px] p-4 text-slate-700 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a detailed description..."
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleUpdateDescription}>Save Changes</Button>
                                    </div>
                                </div>
                            ) : (
                                <p className={cn(
                                    "text-slate-600 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50/50 rounded-xl",
                                    !task.description && "italic text-slate-400"
                                )}>
                                    {task.description || "No description provided."}
                                </p>
                            )}
                        </section>

                        {/* Subtasks Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4" />
                                    Subtasks
                                    {subtasks && subtasks.length > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                                            {subtasks.filter(s => s.is_completed).length}/{subtasks.length}
                                        </span>
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

                            <div className="space-y-2">
                                {subtasks?.map((subtask) => (
                                    <div
                                        key={subtask.id}
                                        className="group flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <button
                                            onClick={() => toggleSubtask.mutate({ id: subtask.id, is_completed: !subtask.is_completed })}
                                            className={cn(
                                                "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                                subtask.is_completed ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                                            )}
                                        >
                                            {subtask.is_completed && <CheckSquare className="h-3 w-3" />}
                                        </button>
                                        <span className={cn(
                                            "flex-1 text-sm transition-all",
                                            subtask.is_completed ? "text-slate-400 line-through" : "text-slate-700 font-medium"
                                        )}>
                                            {subtask.title}
                                        </span>
                                        <button
                                            onClick={() => deleteSubtask.mutate(subtask.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Sidebar & Activity */}
                    <div className="flex-1 bg-slate-50/30 p-8 flex flex-col gap-8 overflow-y-auto scrollbar-thin">
                        {/* Meta Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Task Details</h3>
                            <div className="grid gap-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-500 w-20">Assignee</span>
                                    <span className="font-semibold text-slate-900">{task.assignee?.name || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-500 w-20">Due Date</span>
                                    <span className="font-semibold text-slate-900">{task.due_date ? formatDate(task.due_date) : 'No date set'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Flag className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-500 w-20">Priority</span>
                                    <Badge variant={
                                        task.priority === 'critical' ? 'destructive' :
                                            task.priority === 'high' ? 'warning' : 'outline'
                                    } className="capitalize">
                                        {task.priority}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="flex-1 flex flex-col min-h-0 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Activity
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
                                {comments?.map((comment) => (
                                    <div key={comment.id} className="flex gap-4">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-slate-500">
                                                {comment.user?.name?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {comment.user?.name || 'Unknown User'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDate(comment.created_at)}
                                                </span>
                                            </div>
                                            <div className="bg-white border rounded-xl rounded-tl-none p-3 shadow-sm border-slate-100">
                                                <p className="text-sm text-slate-600 break-words">
                                                    {comment.comment}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                        className="absolute right-3 bottom-3 p-1.5 text-primary hover:bg-slate-50 rounded-lg transition-colors"
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
