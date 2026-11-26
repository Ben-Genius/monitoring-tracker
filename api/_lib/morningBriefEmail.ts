import { AT_RISK, BRIEF_SORTERS, classifyBriefTask, DAY_MS, type BriefSection } from '../../shared/briefRules.js';
import { button, emailShell, esc, FAINT, INK, label, LINE, MONO, MUTED, RED, SANS, TINT } from './emailStyle.js';

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
    /** A short AI-written summary (api/_lib/briefSummary.ts), when the organisation has turned it on. */
    summary?: string | null;
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


const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|rev|hon|sir|madam)\.?$/i;
/** "Mr Blay" and "Mr Kwame Blay" are "Mr Blay"; "Ama Owusu" becomes "Ama". Same as the app. */
export function addressAs(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && HONORIFICS.test(parts[0]) ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

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

const FACTS_PER_SECTION = 15;

/**
 * The brief as plain facts, for the AI summary: the same sections, order and
 * reasons as the email, so the summary never says something the email doesn't.
 */
export function briefFacts(tasks: EmailTask[], orgName: string, now = Date.now()): string {
    const s = groupBrief(tasks, now);
    const open = tasks.filter(t => t.stage !== 'completed').length;
    const lines = [`Organisation: ${orgName}`, `Open tasks: ${open}`, ''];
    for (const k of [...AT_RISK, 'unaccepted', 'moved', 'done'] as BriefSection[]) {
        lines.push(`${SECTION_TITLES[k]} (${s[k].length})`);
        for (const t of s[k].slice(0, FACTS_PER_SECTION)) {
            lines.push(`- ${t.title} | project: ${t.project?.name ?? 'none'} | owner: ${t.owner?.name ?? 'unassigned'} | ${reason(t, k, now)}`);
        }
        if (s[k].length > FACTS_PER_SECTION) lines.push(`- and ${s[k].length - FACTS_PER_SECTION} more`);
        lines.push('');
    }
    return lines.join('\n');
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
    const summary = opts.summary?.trim() || null;
    const textParts = [hello, '', opts.dateLabel, ''];
    if (summary) textParts.push(`IN SHORT`, summary, '(Written by AI from this morning’s tasks.)', '');
    textParts.push(attention ? `${attention} ${heroLine}` : heroLine, scope, '');
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

    // ── HTML: the shared Commit email look (emailStyle.ts). Red is kept for
    // the two states that can't wait: urgent and blocked.
    const isRed = (k: BriefSection) => k === 'urgent' || k === 'blocked';

    // Four counts across the top, so the shape of the day reads at a glance.
    const strip = AT_RISK.map((k, i) => {
        const n = s[k].length;
        const color = n && isRed(k) ? RED : n ? INK : FAINT;
        return `<td class="sc" width="25%" style="padding:14px 16px;${i ? `border-left:1px solid ${LINE};` : ''}vertical-align:top">
              <div style="${SANS};font-size:22px;line-height:1;font-weight:600;letter-spacing:-.02em;color:${color}">${n}</div>
              <div style="margin-top:6px">${label(SECTION_TITLES[k], FAINT)}</div>
            </td>`;
    }).join('');

    const sectionHtml = shownSections.filter(k => s[k].length).map(k => {
        const rows = s[k].slice(0, SHOWN_PER_SECTION).map(t => `
            <tr><td style="padding:14px 0;border-top:1px solid ${LINE}">
              <a href="${esc(`${opts.appUrl}/tasks?task=${encodeURIComponent(t.id)}`)}" style="${SANS};font-size:15px;font-weight:500;line-height:1.4;color:${INK};text-decoration:none">${esc(t.title)}</a>
              <div style="${MONO};font-size:12px;line-height:1.6;color:${FAINT};margin-top:2px">${esc([t.project?.name, t.owner?.name].filter(Boolean).join(' · ') || 'Unassigned')}</div>
              <div style="${SANS};font-size:13px;line-height:1.5;color:${isRed(k) ? RED : MUTED};margin-top:2px">${esc(reason(t, k, now))}</div>
            </td></tr>`).join('');
        const more = s[k].length > SHOWN_PER_SECTION
            ? `<tr><td style="padding:10px 0 0;border-top:1px solid ${LINE};${SANS};font-size:13px;color:${MUTED}">and ${s[k].length - SHOWN_PER_SECTION} more in the app</td></tr>` : '';
        return `
          <tr><td style="padding:28px 0 8px">${label(SECTION_TITLES[k], isRed(k) ? RED : MUTED)}&nbsp;&nbsp;${label(String(s[k].length), FAINT)}</td></tr>${rows}${more}`;
    }).join('');

    const body = `
      <tr><td class="px" style="padding:40px 40px 0">
        <p style="margin:0">${label(`${esc(opts.dateLabel)} &middot; ${esc(recipient.org_name)}`)}</p>
        <h1 class="h1" style="margin:14px 0 0;${SANS};font-size:30px;line-height:1.12;font-weight:600;letter-spacing:-.03em;color:${INK}">${esc(hello)}</h1>
      </td></tr>
${summary ? `
      <tr><td class="px" style="padding:20px 40px 0">
        <p style="margin:0">${label('In short')}</p>
        <p style="margin:8px 0 0;${SANS};font-size:16px;line-height:1.6;color:${INK}">${esc(summary)}</p>
        <p style="margin:6px 0 0;${SANS};font-size:12px;line-height:1.5;color:${FAINT}">Written by AI from this morning’s tasks. The lists below are the record.</p>
      </td></tr>` : ''}
      <tr><td class="px" style="padding:24px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;background:${TINT}">
          <tr><td style="padding:22px 20px 20px">
            ${attention ? `<div class="hero" style="${SANS};font-size:56px;line-height:1;font-weight:600;letter-spacing:-.04em;color:${severe ? RED : INK}">${attention}</div>` : ''}
            <div style="${SANS};font-size:16px;line-height:1.5;font-weight:500;color:${INK};margin-top:${attention ? 10 : 0}px">${esc(heroLine)}</div>
            <div style="${SANS};font-size:13px;line-height:1.6;color:${MUTED};margin-top:4px">${esc(scope)}</div>
          </td></tr>
          <tr><td style="border-top:1px solid ${LINE};padding:0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${strip}</tr></table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:0 40px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionHtml}</table>
      </td></tr>
      <tr><td class="px" style="padding:32px 40px 40px">${button(briefUrl, 'Open the full brief')}</td></tr>`;

    const html = emailShell({
        title: subject,
        // The inbox preview line: the summary reads best there when there is one.
        preheader: summary ?? (attention ? `${attention} ${heroLine}` : heroLine),
        label: 'Morning brief',
        origin: opts.appUrl,
        body,
        footer: `You get this at 7am because you oversee ${esc(recipient.org_name)} on Commit.
        <a href="${esc(opts.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Stop these emails</a> or change it in <a href="${esc(opts.appUrl)}/settings" style="color:${MUTED};text-decoration:underline">Settings</a>.
        <a href="${esc(opts.appUrl)}/privacy" style="color:${MUTED};text-decoration:underline">Privacy notice</a>.`,
    });

    return { subject, text, html, empty: openCount === 0 && s.done.length === 0 };
}
