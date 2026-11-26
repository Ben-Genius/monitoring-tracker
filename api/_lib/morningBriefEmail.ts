import { AT_RISK, BRIEF_SORTERS, classifyBriefTask, DAY_MS, type BriefSection } from '../../shared/briefRules.js';

/**
 * Builds and renders the 7am morning brief email. Pure: no network, no
 * database, so it can be previewed locally (scripts/preview-brief-email.ts).
 *
 * The email is a summary that gets someone to open the app, not a copy of it:
 * a hero count of what needs them, the top few items in each problem section,
 * one line of good news, and a button to the full brief.
 */

export interface EmailTask {
    id: string;
    title: string;
    stage: string;
    due_date: string | null;
    blocker_description: string | null;
    progress_percent: number;
    acknowledged_at: string | null;
    next_update_due: string | null;
    last_movement_at: string | null;
    is_urgent: boolean;
    assignee_id: string | null;
    completed_at: string | null;
    project: { name: string } | null;
    owner: { name: string } | null;
    blocker: { name: string } | null;
}

export interface BriefRecipient {
    name: string;
    org_name: string;
}

export interface RenderOptions {
    appUrl: string;
    unsubscribeUrl: string;
    /** The recipient's local date, e.g. "Wednesday 25 November". */
    dateLabel: string;
    now?: number;
}

export interface RenderedEmail {
    subject: string;
    text: string;
    html: string;
    /** Nothing open and nothing done: not worth an email. */
    empty: boolean;
}

const SHOWN_PER_SECTION = 4;

const SECTION_TITLES: Record<BriefSection, string> = {
    urgent: 'Urgent', blocked: 'Blocked', stuck: 'Stuck', overdue: 'Overdue',
    unaccepted: 'Not accepted', moved: 'Moved today', done: 'Done',
};

const STAGE_LABELS: Record<string, string> = {
    talking_stage: 'Talking stage', yet_to_start: 'Yet to start', in_progress: 'In progress', blockers: 'Blocked', completed: 'Done',
};

// The two states that cannot wait get the one colour in the email.
const RED = '#B83A24';
const INK = '#17202B';
const MUTED = '#5B6673';
const LINE = '#E3E7EC';
const PAPER = '#F4F6F8';

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|rev|hon|sir|madam)\.?$/i;
/** "Mr Blay" and "Mr Kwame Blay" are "Mr Blay"; "Ama Owusu" becomes "Ama". Same as the app. */
export function addressAs(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && HONORIFICS.test(parts[0]) ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function daysSince(iso: string | null, now: number): number {
    return iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS)) : 0;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One short line saying why the task is in the brief. Mirrors briefMeta.reason in the app. */
function reason(t: EmailTask, section: BriefSection, now: number): string {
    const blocked = t.blocker?.name
        ? `Waiting on ${t.blocker.name}: ${t.blocker_description || 'no reason given'}`
        : t.blocker_description || 'No reason given';
    const stage = STAGE_LABELS[t.stage] ?? t.stage;
    switch (section) {
        case 'urgent': return t.stage === 'blockers' ? `Urgent and blocked. ${blocked}` : `${stage}, ${t.progress_percent}% done`;
        case 'blocked': return blocked;
        case 'stuck': return `No movement for ${plural(daysSince(t.last_movement_at, now), 'day')}, ${t.progress_percent}% done`;
        case 'overdue':
            return t.due_date && new Date(t.due_date).getTime() < now
                ? `Deadline was ${shortDate(t.due_date)}, ${plural(daysSince(t.due_date, now), 'day')} late`
                : `Promised update${t.next_update_due ? ` (${shortDate(t.next_update_due)})` : ''} not received`;
        case 'unaccepted': return 'Owner hasn’t accepted this yet';
        case 'moved': return `${stage}, now ${t.progress_percent}% done`;
        case 'done': return 'Completed';
    }
}

export function groupBrief(tasks: EmailTask[], now = Date.now()): Record<BriefSection, EmailTask[]> {
    const sections: Record<BriefSection, EmailTask[]> = { urgent: [], blocked: [], stuck: [], overdue: [], unaccepted: [], moved: [], done: [] };
    for (const t of tasks) {
        const s = classifyBriefTask(t, now);
        if (s) sections[s].push(t);
    }
    for (const [key, sort] of Object.entries(BRIEF_SORTERS)) sections[key as BriefSection].sort(sort);
    return sections;
}

export function renderMorningBrief(recipient: BriefRecipient, tasks: EmailTask[], opts: RenderOptions): RenderedEmail {
    const now = opts.now ?? Date.now();
    const s = groupBrief(tasks, now);
    const openCount = tasks.filter(t => t.stage !== 'completed').length;
    const attention = AT_RISK.reduce((n, k) => n + s[k].length, 0);
    const severe = s.urgent.length + s.blocked.length;
    const hello = `Good morning, ${addressAs(recipient.name)}`;
    const briefUrl = `${opts.appUrl}/brief?from=email`; // counted as brief_viewed from_email

    const breakdown = AT_RISK.filter(k => s[k].length).map(k => `${s[k].length} ${SECTION_TITLES[k].toLowerCase()}`).join(', ');
    const subject = attention
        ? `Morning brief: ${plural(attention, 'item needs', 'items need')} you${severe ? ` (${breakdown})` : ''}`
        : 'Morning brief: nothing needs you today';
    const goodNews = [s.moved.length && `${s.moved.length} moved`, s.done.length && `${s.done.length} done`].filter(Boolean).join(', ');
    const heroLine = attention
        ? `${attention === 1 ? 'needs' : 'need'} your attention: ${breakdown}.`
        : `Nothing is urgent, blocked, stuck or overdue.`;
    const scope = `${plural(openCount, 'open task')} across ${recipient.org_name}${goodNews ? `. In the last day: ${goodNews}.` : '.'}`;

    const shownSections: BriefSection[] = [...AT_RISK, 'unaccepted'];

    // ── Plain text ──
    const textParts = [hello, '', opts.dateLabel, '', attention ? `${attention} ${heroLine}` : heroLine, scope, ''];
    for (const k of shownSections) {
        if (!s[k].length) continue;
        textParts.push(`${SECTION_TITLES[k].toUpperCase()} (${s[k].length})`);
        for (const t of s[k].slice(0, SHOWN_PER_SECTION)) {
            textParts.push(`- ${t.title}${t.project ? ` · ${t.project.name}` : ''}${t.owner ? ` · ${t.owner.name}` : ''}`, `  ${reason(t, k, now)}`);
        }
        if (s[k].length > SHOWN_PER_SECTION) textParts.push(`  and ${s[k].length - SHOWN_PER_SECTION} more`);
        textParts.push('');
    }
    textParts.push(`Open the full brief: ${briefUrl}`, '', `You get this because you oversee ${recipient.org_name} on Commit. Stop these emails: ${opts.unsubscribeUrl}`, `Privacy notice: ${opts.appUrl}/privacy`);
    const text = textParts.join('\n');

    // ── HTML (tables and inline styles: what email clients render reliably) ──
    const font = `font-family:'Public Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
    const sectionHtml = shownSections.filter(k => s[k].length).map(k => {
        const red = k === 'urgent' || k === 'blocked';
        const rows = s[k].slice(0, SHOWN_PER_SECTION).map(t => `
            <tr><td style="padding:12px 0;border-top:1px solid ${LINE};${font}">
              <div style="font-size:15px;font-weight:600;color:${INK};line-height:1.4">${esc(t.title)}</div>
              <div style="font-size:13px;color:${MUTED};line-height:1.5">${esc([t.project?.name, t.owner?.name].filter(Boolean).join(' · ') || 'Unassigned')}</div>
              <div style="font-size:13px;color:${red ? RED : INK};line-height:1.5;margin-top:2px">${esc(reason(t, k, now))}</div>
            </td></tr>`).join('');
        const more = s[k].length > SHOWN_PER_SECTION
            ? `<tr><td style="padding:8px 0 0;border-top:1px solid ${LINE};font-size:13px;color:${MUTED};${font}">and ${s[k].length - SHOWN_PER_SECTION} more in the app</td></tr>` : '';
        return `
          <tr><td style="padding:24px 0 4px;${font}">
            <span style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${red ? RED : MUTED}">${SECTION_TITLES[k]}</span>
            <span style="font-size:12px;font-weight:700;color:${MUTED}">&nbsp;${s[k].length}</span>
          </td></tr>${rows}${more}`;
    }).join('');

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER}">
<div style="display:none;max-height:0;overflow:hidden">${esc(attention ? `${attention} ${heroLine}` : heroLine)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:14px">
    <tr><td style="padding:28px 24px 8px;${font}">
      <div style="font-size:13px;color:${MUTED}">${esc(opts.dateLabel)} · ${esc(recipient.org_name)}</div>
      <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3;color:${INK};font-weight:700">${esc(hello)}</h1>
    </td></tr>
    <tr><td style="padding:16px 24px 4px;${font}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border-radius:10px"><tr><td style="padding:18px 20px;${font}">
        ${attention ? `<div style="font-size:44px;line-height:1;font-weight:800;color:${severe ? RED : INK}">${attention}</div>` : ''}
        <div style="font-size:15px;line-height:1.5;color:${INK};margin-top:${attention ? 6 : 0}px;font-weight:600">${esc(heroLine)}</div>
        <div style="font-size:13px;line-height:1.5;color:${MUTED};margin-top:4px">${esc(scope)}</div>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:0 24px;${font}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionHtml}</table>
    </td></tr>
    <tr><td style="padding:28px 24px 28px;${font}">
      <a href="${esc(briefUrl)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px">Open the full brief</a>
    </td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:16px 24px;font-size:12px;line-height:1.6;color:${MUTED};${font}">
    You get this at 7am because you oversee ${esc(recipient.org_name)} on Commit.
    <a href="${esc(opts.unsubscribeUrl)}" style="color:${MUTED}">Stop these emails</a> or change it in <a href="${esc(opts.appUrl)}/settings" style="color:${MUTED}">Settings</a>.
    <a href="${esc(opts.appUrl)}/privacy" style="color:${MUTED}">Privacy notice</a>.
  </td></tr></table>
</td></tr></table>
</body></html>`;

    return { subject, text, html, empty: openCount === 0 && s.done.length === 0 };
}
