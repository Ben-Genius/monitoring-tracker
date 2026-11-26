import { Fragment, useCallback, useRef, type ReactNode } from 'react';

/**
 * Mentions are stored inside comment text as @[Name](user-id). People only
 * ever see "@Name": the id is added when the comment is sent (encodeMentions)
 * and hidden again when it is shown (renderMentions). The database reads the
 * same format to notify whoever was mentioned
 * (supabase/migrations/20261126120000_realtime_and_mentions.sql).
 */

export interface Mentionable { id: string; name: string }

const TOKEN = /@\[([^\]]{1,120})\]\(([0-9a-fA-F-]{36})\)/g;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Turns each "@Name" the person picked into a token. Text they typed by hand stays as it is. */
export function encodeMentions(text: string, picked: Mentionable[]): string {
    let out = text;
    // Longest names first, so "@Ama Owusu" wins over "@Ama".
    for (const p of [...picked].sort((a, b) => b.name.length - a.name.length)) {
        const name = p.name.replace(/[[\]]/g, '');
        // Not inside a word or an email address, and not followed by more name.
        out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}._%+-])@${escapeRe(p.name)}(?![\\p{L}\\p{N}])`, 'gu'), `@[${name}](${p.id})`);
    }
    return out;
}

/** "@[Ama Owusu](id) please check" as text with the mention highlighted. */
export function renderMentions(text: string, meId?: string): ReactNode {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(TOKEN)) {
        const at = m.index ?? 0;
        if (at > last) parts.push(text.slice(last, at));
        const isMe = m[2] === meId;
        parts.push(
            <span key={at} className={isMe
                ? 'rounded bg-progress/10 px-0.5 font-semibold text-progress dark:bg-progress/20 dark:text-blue-300'
                : 'font-semibold text-progress dark:text-blue-300'}>
                @{m[1]}
            </span>,
        );
        last = at + m[0].length;
    }
    if (!parts.length) return text;
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

/** The people picked while writing one comment. */
export function useMentionPicks() {
    const picks = useRef(new Map<string, Mentionable>());
    const add = useCallback((p: Mentionable) => { picks.current.set(p.id, p); }, []);
    const reset = useCallback(() => picks.current.clear(), []);
    const encode = useCallback((text: string) => encodeMentions(text, [...picks.current.values()]), []);
    return { add, reset, encode };
}
