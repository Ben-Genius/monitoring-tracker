/**
 * Reads a WhatsApp message as a command. Forgiving on purpose: people type
 * on phones, on site, in a hurry. Numbers refer to the person's last task
 * list ("tasks").
 *
 *   tasks / hi / menu          the list
 *   2 50% formwork up          progress (25, 50 or 75) with what moved
 *   2 blocked waiting cement   blocked, with why
 *   2 done slab poured         done (with a photo, or a link in the text)
 *   accept 2  |  2 ok          accept
 *   LINK 123456                link this number (code from Settings)
 *   help
 */
export type Command =
    | { kind: 'link'; code: string }
    | { kind: 'list' }
    | { kind: 'help' }
    | { kind: 'accept'; n: number }
    | { kind: 'progress'; n: number; percent: number; note: string }
    | { kind: 'blocked'; n: number; note: string }
    | { kind: 'done'; n: number; note: string }
    | { kind: 'unknown' };

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseCommand(raw: string): Command {
    // "#2", "2.", "2:" and "2 -" all mean task 2.
    const text = clean(raw).replace(/^#/, '');
    const lower = text.toLowerCase();

    let m = lower.match(/^link\s*(\d{6})$/);
    if (m) return { kind: 'link', code: m[1] };
    if (/^(tasks?|list|my tasks|hi|hello|hey|menu|start|morning|good morning)\b[!. ]*$/.test(lower) || lower === '') return { kind: 'list' };
    if (/^(help|\?|how)$/.test(lower)) return { kind: 'help' };

    m = lower.match(/^(?:accept|ok|okay|yes|got it)\s*#?(\d{1,2})$/) ?? lower.match(/^(\d{1,2})\s*[.:-]?\s*(?:accept(?:ed)?|ok|okay|yes|got it)$/);
    if (m) return { kind: 'accept', n: Number(m[1]) };

    // The note keeps the person's own capitalisation.
    m = text.match(/^(\d{1,2})\s*[.:-]?\s*(\d{1,3})\s*(?:%|percent|pc)?\s*[.:-]?\s*(.*)$/i);
    if (m) return { kind: 'progress', n: Number(m[1]), percent: Number(m[2]), note: m[3] };

    m = text.match(/^(\d{1,2})\s*[.:-]?\s*(?:done|finished|complete(?:d)?|completed)\b\s*[.:-]?\s*(.*)$/i);
    if (m) return { kind: 'done', n: Number(m[1]), note: m[2] };

    m = text.match(/^(\d{1,2})\s*[.:-]?\s*(?:blocked|block|stuck|waiting)\b\s*[.:-]?\s*(.*)$/i);
    if (m) return { kind: 'blocked', n: Number(m[1]), note: m[2] };

    return { kind: 'unknown' };
}

/** The first web link in a note, used as proof for "done". */
export function firstLink(text: string): string | null {
    const m = text.match(/https?:\/\/[^\s<>"]+/i);
    return m ? m[0].replace(/[).,;]+$/, '') : null;
}
