import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, ArrowRightLeft, UserPlus, Gauge, CheckCircle2, Hand } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useNotifications, useMarkNotificationsRead, type AppNotification } from '../hooks/useNotifications';

const ICONS: Record<AppNotification['type'], { icon: typeof Bell; tone: string }> = {
    assigned: { icon: UserPlus, tone: 'text-blue-600 bg-blue-50' },
    stage_changed: { icon: ArrowRightLeft, tone: 'text-slate-600 bg-slate-100' },
    blocked: { icon: AlertTriangle, tone: 'text-red-600 bg-red-50' },
    blocking_you: { icon: Hand, tone: 'text-red-600 bg-red-50' },
    progress: { icon: Gauge, tone: 'text-indigo-600 bg-indigo-50' },
    accepted: { icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
};

export default function NotificationsBell() {
    const { data: items = [] } = useNotifications();
    const markRead = useMarkNotificationsRead();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const unread = items.filter(n => !n.read_at).length;

    useEffect(() => {
        if (!open) return;
        const close = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [open]);

    const openItem = (n: AppNotification) => {
        if (!n.read_at) markRead.mutate([n.id]);
        setOpen(false);
        if (n.task_id) navigate(`/tasks?task=${n.task_id}`);
    };

    return (
        <div ref={ref} className="relative">
            <button
                className="relative icon-btn"
                onClick={() => setOpen(o => !o)}
                aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
                aria-expanded={open}
            >
                <Bell className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-16 sm:top-full sm:mt-2 z-50 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Notifications</p>
                        {unread > 0 && (
                            <button onClick={() => markRead.mutate('all')} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Mark all read</button>
                        )}
                    </div>
                    <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {items.length === 0 && (
                            <li className="px-4 py-10 text-center text-sm text-slate-400">
                                Nothing yet. You'll be told here when a task you assigned, own or are blocking moves.
                            </li>
                        )}
                        {items.map(n => {
                            const { icon: Icon, tone } = ICONS[n.type] ?? ICONS.stage_changed;
                            return (
                                <li key={n.id}>
                                    <button onClick={() => openItem(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50', !n.read_at && 'bg-blue-50/40 dark:bg-blue-950/20')}>
                                        <span className={cn('mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center', tone)}><Icon className="h-4 w-4" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className={cn('block text-sm leading-snug', n.read_at ? 'text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-50')}>{n.title}</span>
                                            {n.body && <span className="block text-xs text-slate-500 line-clamp-2">{n.body}</span>}
                                            <span className="block mt-0.5 text-[11px] text-slate-400">{formatRelativeTime(n.created_at)}</span>
                                        </span>
                                        {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
