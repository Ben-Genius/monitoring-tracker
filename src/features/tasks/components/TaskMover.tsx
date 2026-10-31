import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, X, Paperclip, Link2, FileText, Image as ImageIcon, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers } from '@/features/users/hooks/useUsers';
import { supabase } from '@/lib/supabase';
import { supabaseLog } from '@/features/audit/utils/log';
import { movePatch, type MoveTaskInput, type Task } from '../hooks/useTasks';
import { uploadEvidence, normaliseLink, EVIDENCE_ACCEPT, MAX_EVIDENCE_BYTES, type Evidence } from '../hooks/useEvidence';
import { STAGES, stageDef, type StageDef } from '../utils/stages';
import { PROGRESS_STEPS } from '../utils/accountability';

export type MovableTask = MoveTaskInput['task'] & {
    project?: { company_id: string } | null;
    company_id?: string | null;
    blocker_description?: string | null;
    blocked_by?: string | null;
    subtasks?: { is_completed: boolean }[];
};

/** Stages a person moves work through. Talking stage is pre-assignment and not a target. */
const TRACK: StageDef[] = STAGES.filter(s => s.id !== 'talking_stage');

/** Fired after a successful status change, so boards can highlight the card where it landed. */
export const TASK_MOVED_EVENT = 'task-moved';
export type TaskMovedDetail = { id: string; stage: Task['stage'] };

/**
 * Every status change goes through the update sheet. A move always says what
 * was done; Done also needs proof. The database enforces the proof rule too.
 */
export function useTaskMover() {
    const { user } = useAuth();
    const [pending, setPending] = useState<{ task: MovableTask; target: Task['stage'] } | null>(null);
    const canMove = !!user && user.role !== 'executive';

    const requestMove = (task: MovableTask, stage: Task['stage']) => {
        if (!canMove) return;
        setPending({ task, target: stage === 'talking_stage' ? 'yet_to_start' : stage });
    };
    /** Report progress or update a blocker without changing the stage. */
    const requestUpdate = (task: MovableTask) => { if (canMove) setPending({ task, target: task.stage }); };
    const editBlocker = requestUpdate;

    const dialog = pending ? (
        <StatusUpdateSheet task={pending.task} initialTarget={pending.target} onClose={() => setPending(null)} />
    ) : null;

    return { requestMove, requestUpdate, editBlocker, canMove, dialog };
}

function StatusUpdateSheet({ task, initialTarget, onClose }: { task: MovableTask; initialTarget: Task['stage']; onClose: () => void }) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const companyId = task.project?.company_id ?? task.company_id ?? undefined;
    const { data: users = [] } = useUsers(companyId);

    const [target, setTarget] = useState<Task['stage']>(initialTarget);
    const [note, setNote] = useState('');
    const [progress, setProgress] = useState<number>(Math.min(Math.max(task.progress_percent || 0, 25), 75));
    const [blockedBy, setBlockedBy] = useState(task.blocked_by ?? '');
    const [reason, setReason] = useState(task.stage === 'blockers' ? task.blocker_description ?? '' : '');
    const [files, setFiles] = useState<File[]>([]);
    const [links, setLinks] = useState<string[]>([]);
    const [linkDraft, setLinkDraft] = useState('');
    const [phase, setPhase] = useState<'edit' | 'saving' | 'done'>('edit');
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const from = stageDef(task.stage);
    const to = stageDef(target);
    const sameStage = target === task.stage;
    const steps = task.subtasks ?? [];
    const openSteps = steps.filter(s => !s.is_completed).length;
    // A link typed but not yet added still counts; it's added on submit.
    const draftLink = normaliseLink(linkDraft);
    const proofCount = files.length + links.length + (draftLink ? 1 : 0);

    const copy = useMemo(() => {
        if (target === 'completed') return { noteLabel: 'What was delivered?', notePh: 'e.g. Earthing test passed; certificate signed by ECG inspector and filed.', action: 'Mark as done' };
        if (target === 'blockers') return { noteLabel: 'What is blocking it?', notePh: 'e.g. Waiting for ECG to sign the wayleave form', action: sameStage ? 'Update blocker' : 'Mark as blocked' };
        if (target === 'in_progress') return sameStage
            ? { noteLabel: 'What moved since the last update?', notePh: 'e.g. Quotes received from two suppliers; choosing on Friday.', action: 'Post progress update' }
            : { noteLabel: task.stage === 'blockers' ? 'How was the blocker cleared?' : 'What are you starting with?', notePh: 'e.g. Site survey booked for Tuesday morning.', action: 'Move to In progress' };
        return { noteLabel: 'Why is it going back?', notePh: 'e.g. Client changed the scope; waiting for new drawings.', action: 'Move to Yet to start' };
    }, [target, sameStage, task.stage]);

    const text = target === 'blockers' ? reason : note;
    const missing = !text.trim() ? 'Write a short update first.'
        : target === 'completed' && proofCount === 0 ? 'Add a photo, file or link as proof of the finished work.'
            : null;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase === 'edit') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [phase, onClose]);

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        const ok = [...list].filter(f => {
            if (f.size > MAX_EVIDENCE_BYTES) { toast.error(`${f.name} is larger than 10 MB`); return false; }
            return true;
        });
        setFiles(prev => [...prev, ...ok]);
        if (ok.length) setError(null);
    };
    const addLink = () => {
        const url = normaliseLink(linkDraft);
        if (!url) { setError('That doesn’t look like a web link. Paste the full address.'); return; }
        setLinks(l => [...l, url]); setLinkDraft(''); setError(null);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (missing) { setError(missing); return; }
        if (linkDraft.trim() && !draftLink) { setError('That doesn’t look like a web link. Paste the full address or clear it.'); return; }
        const allLinks = draftLink ? [...links, draftLink] : links;
        setPhase('saving'); setError(null);
        try {
            const uploaded = await uploadEvidence(task.id, files);
            const evidence: Evidence[] = [...uploaded, ...allLinks.map(url => ({ kind: 'link' as const, url, name: new URL(url).hostname }))];
            const pct = target === 'in_progress' ? progress : null;

            // 1. The update itself (and its proof) goes on the task's record first...
            const { error: cErr } = await supabase.from('task_comments').insert({
                task_id: task.id, user_id: user!.id, comment: text.trim(), kind: 'status_update',
                from_stage: task.stage, to_stage: target, progress_percent: target === 'completed' ? 100 : pct, evidence,
            });
            if (cErr) throw cErr;

            // 2. ...then the task moves. The database refuses Done without step 1.
            const patch = movePatch({
                task, stage: target, actorId: user?.id, progress_percent: pct,
                blocker_description: target === 'blockers' ? reason.trim() : undefined,
                blocked_by: target === 'blockers' ? (blockedBy || null) : undefined,
            });
            const { error: tErr } = await supabase.from('tasks').update(patch).eq('id', task.id);
            if (tErr) throw tErr;

            if (!sameStage) {
                supabaseLog({
                    entity_type: 'task', entity_id: task.id, action: 'stage_changed', field: 'stage',
                    old_value: task.stage, new_value: target,
                    summary: `Task "${task.title}" moved from ${from.label} to ${to.label}`,
                });
            }
            qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, old => old?.map(t => (t.id === task.id ? ({ ...t, ...patch } as Task) : t)));
            ['tasks', 'task', 'comments', 'brief', 'notifications'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));

            setPhase('done');
            window.dispatchEvent(new CustomEvent<TaskMovedDetail>(TASK_MOVED_EVENT, { detail: { id: task.id, stage: target } }));
            toast.success(sameStage ? 'Update posted' : `Moved to ${to.label}`);
            setTimeout(onClose, 900);
        } catch (err) {
            setPhase('edit');
            setError(err instanceof Error ? err.message : 'Couldn’t save the update. Check your connection and try again.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/50 sm:p-4" onClick={() => phase === 'edit' && onClose()}>
            <form
                onClick={e => e.stopPropagation()}
                onSubmit={submit}
                aria-label="Update status"
                className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-[18px] sm:rounded-[14px] bg-surface shadow-sheet animate-in slide-in-from-bottom-6 duration-200"
            >
                {phase === 'done' ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ backgroundColor: to.accent }}>
                            <Check className="h-7 w-7" strokeWidth={3} />
                        </span>
                        <p className="text-lg font-semibold text-ink">{sameStage ? 'Update posted' : `Moved to ${to.label}`}</p>
                        <p className="text-sm text-ink-muted max-w-sm">{task.title}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start gap-3 px-5 pt-5">
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-ink-muted">{sameStage ? 'Post an update' : 'Change status'}</p>
                                <h2 className="mt-0.5 text-[17px] font-semibold leading-snug text-ink">{task.title}</h2>
                            </div>
                            <button type="button" onClick={onClose} disabled={phase === 'saving'} className="icon-btn -mr-2 -mt-2" aria-label="Close"><X className="h-5 w-5" /></button>
                        </div>

                        {/* The transition, drawn as the track it moves along */}
                        <div className="px-5 pt-4">
                            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="New status">
                                {TRACK.map(s => {
                                    const isTarget = s.id === target;
                                    const isCurrent = s.id === task.stage;
                                    return (
                                        <button
                                            type="button"
                                            key={s.id}
                                            role="radio"
                                            aria-checked={isTarget}
                                            onClick={() => { setTarget(s.id); setError(null); }}
                                            className={cn(
                                                'relative rounded-[10px] border px-2 py-2.5 text-left transition-colors',
                                                isTarget ? 'text-white border-transparent' : 'border-line bg-surface text-ink-muted hover:border-ink/30'
                                            )}
                                            style={isTarget ? { backgroundColor: s.accent } : undefined}
                                        >
                                            <s.icon className="h-4 w-4" style={isTarget ? undefined : { color: s.accent }} />
                                            <span className="mt-1.5 block text-[12px] font-semibold leading-tight">{s.label}</span>
                                            <span className={cn('block text-[11px] leading-tight', isTarget ? 'text-white/85' : 'text-ink-faint')}>
                                                {isCurrent && isTarget ? 'Stays here' : isCurrent ? 'Now' : isTarget ? 'Moving here' : ' '}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {!sameStage && (
                                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-muted">
                                    <span className="font-medium" style={{ color: from.accent }}>{from.label}</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                    <span className="font-semibold" style={{ color: to.accent }}>{to.label}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {target === 'in_progress' && (
                                <fieldset className="space-y-1.5">
                                    <legend className="text-[13px] font-semibold text-ink">How far along is it?</legend>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {PROGRESS_STEPS.filter(p => p > 0 && p < 100).map(p => (
                                            <button type="button" key={p} onClick={() => setProgress(p)}
                                                className={cn('h-10 rounded-[8px] border text-sm font-semibold tabular-nums',
                                                    progress === p ? 'border-progress bg-progress text-white' : 'border-line text-ink hover:border-progress/50')}>
                                                {p}%
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            <label className="block space-y-1.5">
                                <span className="text-[13px] font-semibold text-ink">{copy.noteLabel} <span className="text-blocked">*</span></span>
                                <textarea
                                    autoFocus
                                    rows={3}
                                    value={text}
                                    onChange={e => { (target === 'blockers' ? setReason : setNote)(e.target.value); setError(null); }}
                                    placeholder={copy.notePh}
                                    className="w-full rounded-[8px] border border-line bg-surface p-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-progress focus:ring-2 focus:ring-progress/15"
                                />
                            </label>

                            {target === 'blockers' && (
                                <label className="block space-y-1.5">
                                    <span className="text-[13px] font-semibold text-ink">Who is it waiting on?</span>
                                    <div className="relative">
                                        <select value={blockedBy} onChange={e => setBlockedBy(e.target.value)}
                                            className="h-10 w-full appearance-none rounded-[8px] border border-line bg-surface pl-3 pr-9 text-sm text-ink">
                                            <option value="">Someone outside the team</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-faint" />
                                    </div>
                                    <span className="block text-[12px] text-ink-faint">The person you pick is told the task is waiting on them.</span>
                                </label>
                            )}

                            {target === 'completed' && steps.length > 0 && openSteps > 0 && (
                                <p className="flex items-start gap-2 rounded-[8px] bg-amber-50 p-3 text-[13px] text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    {openSteps} of {steps.length} steps aren’t ticked yet. Tick them in the task if they’re finished.
                                </p>
                            )}

                            {/* Proof */}
                            <div className="space-y-2">
                                <p className="text-[13px] font-semibold text-ink">
                                    {target === 'completed' ? <>Proof of the finished work <span className="text-blocked">*</span></> : 'Photos, files or links'}
                                    {target !== 'completed' && <span className="font-normal text-ink-faint"> (optional)</span>}
                                </p>
                                {(files.length > 0 || links.length > 0) && (
                                    <ul className="space-y-1.5">
                                        {files.map((f, i) => (
                                            <li key={`f${i}`} className="flex items-center gap-2 rounded-[8px] border border-line px-3 py-2 text-sm">
                                                {f.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-ink-faint" /> : <FileText className="h-4 w-4 text-ink-faint" />}
                                                <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                                                <span className="text-[12px] text-ink-faint tabular-nums">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                                <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-ink-faint hover:text-blocked" aria-label={`Remove ${f.name}`}><X className="h-4 w-4" /></button>
                                            </li>
                                        ))}
                                        {links.map((l, i) => (
                                            <li key={`l${i}`} className="flex items-center gap-2 rounded-[8px] border border-line px-3 py-2 text-sm">
                                                <Link2 className="h-4 w-4 text-ink-faint" />
                                                <span className="min-w-0 flex-1 truncate text-ink">{l}</span>
                                                <button type="button" onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))} className="text-ink-faint hover:text-blocked" aria-label="Remove link"><X className="h-4 w-4" /></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button type="button" onClick={() => fileInput.current?.click()}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-dashed border-ink/25 px-3 text-sm font-medium text-ink hover:border-ink/50">
                                        <Paperclip className="h-4 w-4" /> Add photo or file
                                    </button>
                                    <input ref={fileInput} type="file" multiple accept={EVIDENCE_ACCEPT} className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                                    <div className="flex flex-1 gap-2">
                                        <input value={linkDraft} onChange={e => { setLinkDraft(e.target.value); setError(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                                            placeholder="Paste a link (Drive, OneDrive…)"
                                            className="h-10 min-w-0 flex-1 rounded-[8px] border border-line px-3 text-sm outline-none placeholder:text-ink-faint focus:border-progress" />
                                        <button type="button" onClick={addLink} disabled={!linkDraft.trim()} aria-label="Add link"
                                            className="h-10 rounded-[8px] border border-line px-3 text-sm font-medium text-ink disabled:opacity-40">Add</button>
                                    </div>
                                </div>
                            </div>

                            {error && <p role="alert" className="rounded-[8px] bg-red-50 px-3 py-2 text-[13px] font-medium text-blocked">{error}</p>}
                        </div>

                        <div className="flex gap-2 border-t border-line px-5 py-4">
                            <button type="button" onClick={onClose} disabled={phase === 'saving'}
                                className="h-11 flex-1 sm:flex-none sm:px-5 rounded-[8px] border border-line text-sm font-semibold text-ink">Cancel</button>
                            <button type="submit" disabled={phase === 'saving'}
                                className={cn('h-11 flex-[2] sm:flex-1 inline-flex items-center justify-center gap-2 rounded-[8px] text-sm font-semibold text-white transition-opacity', missing && 'opacity-60')}
                                style={{ backgroundColor: to.accent }}>
                                {phase === 'saving' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : copy.action}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>,
        document.body
    );
}

/**
 * "Update status" menu on cards: pick where the task goes, and the sheet
 * asks for the update. Rendered in a portal so later cards never cover it.
 */
export function MoveMenu({ current, onMove, onUpdate, trigger, align = 'right' }: {
    current: Task['stage'];
    onMove: (stage: Task['stage']) => void;
    onUpdate?: () => void;
    trigger?: ReactNode;
    align?: 'left' | 'right';
}) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btn = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const open = !!pos;
    const options = TRACK.filter(s => s.id !== current);

    const place = () => {
        if (!btn.current) return null;
        const r = btn.current.getBoundingClientRect();
        const W = 220, H = 48 + (options.length + (onUpdate ? 1 : 0)) * 42;
        const below = r.bottom + 4 + H <= window.innerHeight;
        const left = Math.min(Math.max(8, align === 'right' ? r.right - W : r.left), window.innerWidth - W - 8);
        return { top: below ? r.bottom + 4 : Math.max(8, r.top - H - 4), left };
    };
    const toggle = () => setPos(open ? null : place());

    useEffect(() => {
        if (!open) return;
        const close = (e: Event) => { const t = e.target as Node; if (!menu.current?.contains(t) && !btn.current?.contains(t)) setPos(null); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null); };
        // Follow the button when the page or a column scrolls; close only if it leaves the screen.
        const follow = () => {
            const r = btn.current?.getBoundingClientRect();
            if (!r || r.bottom < 0 || r.top > window.innerHeight) { setPos(null); return; }
            setPos(place());
        };
        document.addEventListener('pointerdown', close, true);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', follow);
        window.addEventListener('scroll', follow, true);
        return () => {
            document.removeEventListener('pointerdown', close, true);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', follow);
            window.removeEventListener('scroll', follow, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const pick = (fn: () => void) => { setPos(null); fn(); };

    return (
        <div className="relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <button ref={btn} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open}
                className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-[7px] border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink hover:border-ink/30">
                {trigger ?? <>Update status <ChevronDown className="h-3.5 w-3.5 text-ink-faint" /></>}
            </button>
            {pos && createPortal(
                <div ref={menu} role="menu" style={{ top: pos.top, left: pos.left }}
                    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
                    className="fixed z-[80] w-[220px] rounded-[12px] border border-line bg-surface p-1.5 shadow-pop">
                    {onUpdate && current !== 'completed' && (
                        <button role="menuitem" type="button" onClick={() => pick(onUpdate)}
                            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-paper">
                            <span className="h-2 w-2 rounded-full bg-ink/40" /> Post an update
                        </button>
                    )}
                    <p className="px-2.5 pb-1 pt-2 text-[12px] text-ink-faint">Move to</p>
                    {options.map(s => (
                        <button key={s.id} role="menuitem" type="button" onClick={() => pick(() => onMove(s.id))}
                            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm text-ink hover:bg-paper">
                            <s.icon className="h-4 w-4" style={{ color: s.accent }} />
                            <span className="flex-1">{s.label}</span>
                            {s.id === 'completed' && <span className="text-[11px] text-ink-faint">needs proof</span>}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
