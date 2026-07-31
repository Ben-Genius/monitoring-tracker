import { useAuditLog } from '../hooks/useAuditLog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, PlusCircle, Trash2, ArrowRight, Upload, GitBranch } from 'lucide-react';

const actionIcons = {
    created: PlusCircle,
    updated: ArrowRight,
    deleted: Trash2,
    stage_changed: GitBranch,
    status_changed: CheckCircle2,
    imported: Upload,
};

const actionColors: Record<string, string> = {
    created: 'text-blue-600 bg-blue-50',
    updated: 'text-slate-600 bg-slate-50',
    deleted: 'text-red-600 bg-red-50',
    stage_changed: 'text-amber-600 bg-amber-50',
    status_changed: 'text-emerald-600 bg-emerald-50',
    imported: 'text-purple-600 bg-purple-50',
};

export function AuditFeed({ entityType, entityId }: { entityType: string; entityId: string }) {
    const { data: entries, isLoading } = useAuditLog(entityType, entityId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
            </div>
        );
    }

    if (!entries || entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No activity recorded</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Changes will appear here as the project evolves</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {entries.map((entry, i) => {
                const Icon = actionIcons[entry.action] || Clock;
                const colorClass = actionColors[entry.action] || 'text-slate-500 bg-slate-50';
                const isLast = i === entries.length - 1;

                return (
                    <div key={entry.id} className="flex gap-4 relative group">
                        {!isLast && (
                            <div className="absolute left-[15px] top-[34px] bottom-0 w-px bg-slate-100 dark:bg-slate-800" />
                        )}
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 border border-white dark:border-slate-900",
                            colorClass
                        )}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pb-6 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">
                                        {entry.summary}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {entry.user?.name && (
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                {entry.user.name}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                        colorClass
                                    )}>
                                        {entry.action.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
