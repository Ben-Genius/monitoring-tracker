import { useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn, isImeComposing } from '@/lib/utils';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { Mentionable } from './mentions';

/**
 * A text input or textarea where typing "@" suggests teammates.
 *
 * Follows the combobox pattern: the field keeps focus and points at the
 * highlighted suggestion with aria-activedescendant. Arrow keys move, Enter
 * or Tab picks, Escape closes. Only people this user can already see are
 * suggested (row-level security decides), and deactivated people are left out.
 */

const MAX_SUGGESTIONS = 6;
// "@" at the start or after a space, then up to 30 name characters, right before the caret.
const TRIGGER = /(^|\s)@([\p{L}\p{N}.'-]{0,30})$/u;

type Props = {
    value: string;
    onChange: (value: string) => void;
    onPick: (person: Mentionable) => void;
    multiline?: boolean;
    className?: string;
    placeholder?: string;
    rows?: number;
    autoFocus?: boolean;
    'aria-label'?: string;
};

export default function MentionField({ value, onChange, onPick, multiline, className, ...rest }: Props) {
    const listId = useId();
    const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    const { data: users = [] } = useUsers();
    const [query, setQuery] = useState<string | null>(null);
    const [active, setActive] = useState(0);

    const people = useMemo(() => users
        .filter(u => !(u as { deactivated_at?: string | null }).deactivated_at)
        .map(u => ({ id: u.id, name: u.name })), [users]);

    const matches = useMemo(() => {
        if (query === null) return [];
        const q = query.toLowerCase();
        const scored = people
            .map(p => {
                const n = p.name.toLowerCase();
                const score = n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : -1;
                return { p, score };
            })
            .filter(x => x.score >= 0)
            .sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name));
        return scored.slice(0, MAX_SUGGESTIONS).map(x => x.p);
    }, [people, query]);

    const open = query !== null && matches.length > 0;

    const readTrigger = (el: HTMLInputElement | HTMLTextAreaElement) => {
        const before = el.value.slice(0, el.selectionStart ?? el.value.length);
        const m = before.match(TRIGGER);
        setQuery(m ? m[2] : null);
        setActive(0);
    };

    const pick = (p: Mentionable) => {
        const el = ref.current;
        if (!el) return;
        const caret = el.selectionStart ?? value.length;
        const before = value.slice(0, caret).replace(TRIGGER, (_all, space: string) => `${space}@${p.name} `);
        const next = before + value.slice(caret);
        onChange(next);
        onPick(p);
        setQuery(null);
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!open || isImeComposing(e)) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + matches.length) % matches.length); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[active]); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setQuery(null); }
    };

    const common = {
        ref,
        value,
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { onChange(e.target.value); readTrigger(e.target); },
        onKeyDown,
        onKeyUp: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) readTrigger(e.currentTarget);
        },
        onClick: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => readTrigger(e.currentTarget),
        onBlur: () => setQuery(null),
        'aria-autocomplete': 'list' as const,
        'aria-expanded': open,
        'aria-controls': open ? listId : undefined,
        'aria-activedescendant': open ? `${listId}-${active}` : undefined,
        className,
        ...rest,
    };

    return (
        <div className="relative flex-1">
            {multiline ? <textarea {...common} /> : <input {...common} />}
            {open && (
                <ul id={listId} role="listbox" aria-label="Mention a teammate"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-[10px] border border-line bg-surface p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {matches.map((p, i) => (
                        <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                            // mousedown, not click, so the field keeps focus
                            onMouseDown={e => { e.preventDefault(); pick(p); }}
                            onMouseEnter={() => setActive(i)}
                            className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-[7px] px-2.5 text-sm',
                                i === active ? 'bg-paper text-ink dark:bg-slate-800 dark:text-slate-100' : 'text-ink dark:text-slate-200')}>
                            <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[11px] font-bold dark:bg-white/10">
                                {p.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate">{p.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
