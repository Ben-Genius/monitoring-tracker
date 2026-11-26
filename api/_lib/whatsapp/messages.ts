/** What the WhatsApp assistant says. Short lines; WhatsApp renders *bold*. */

export interface ListedTask {
    title: string;
    stage: string;
    progress: number;
    due_date: string | null;
    needs_accept: boolean;
    urgent: boolean;
    project: string | null;
}

const MAX_TITLE = 60;
const cut = (s: string) => (s.length > MAX_TITLE ? s.slice(0, MAX_TITLE - 1) + '…' : s);

function due(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00Z');
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    if (days < 0) return `overdue since ${label}`;
    if (days === 0) return 'due today';
    if (days === 1) return 'due tomorrow';
    return `due ${label}`;
}

export function taskList(firstName: string, tasks: ListedTask[]): string {
    if (!tasks.length) return `Hi ${firstName}, you have no open tasks. 🎉\nNew tasks will appear here when they're assigned to you.`;
    const lines = tasks.map((t, i) => {
        const status = t.needs_accept ? 'not accepted yet'
            : t.stage === 'blockers' ? 'blocked'
            : t.stage === 'in_progress' ? `${t.progress}%`
            : 'not started';
        const bits = [status, due(t.due_date)].filter(Boolean).join(' · ');
        return `*${i + 1}.* ${t.urgent ? '⚠️ ' : ''}${cut(t.title)}\n     ${bits}${t.project ? ` · ${cut(t.project)}` : ''}`;
    });
    return [
        `Hi ${firstName}, your open tasks:`,
        '',
        ...lines,
        '',
        'Reply with the number, for example:',
        '• *1 50% formwork up*',
        '• *1 blocked waiting on cement*',
        '• *1 done slab poured* (attach a photo)',
        '• *accept 1*',
    ].join('\n');
}

export const HELP = [
    '*Commit on WhatsApp*',
    '',
    '• *tasks* — your open tasks, numbered',
    '• *2 50% what moved* — progress (25%, 50% or 75%)',
    '• *2 blocked why* — mark it blocked',
    '• *2 done what was delivered* — send it as the caption of a photo, or include a link',
    '• *accept 2* — accept a task you were given',
    '',
    'Updates go to your lead and the morning brief straight away.',
].join('\n');

export const NOT_LINKED = 'This WhatsApp number isn\'t linked to Commit yet. In Commit, open *Settings → WhatsApp* and follow the steps.';
export const BAD_CODE = 'That code didn\'t work. Codes last 15 minutes: get a fresh one in Commit under *Settings → WhatsApp*.';
export const linked = (first: string) => `You're linked, ${first}. ✅\nSend *tasks* to see your work, or *help* for how updates work.`;
export const UNKNOWN = 'Sorry, I didn\'t understand that. Send *tasks* for your list or *help* for examples.';
export const PROOF_SAVE_FAILED = 'I couldn\'t save the photo. Please send it again.';
