/**
 * One person's due dates as an iCalendar feed (RFC 5545), for Google Calendar,
 * Outlook and Apple Calendar subscriptions. Each open task with a due date is
 * an all-day event on that date; the event UID is the task id, so a calendar
 * moves the event when the date changes and drops it when the task is done.
 */

export interface FeedTask {
    id: string;
    title: string;
    stage: string;
    priority: string;
    due_date: string; // YYYY-MM-DD
    is_urgent: boolean;
    updated_at: string | null;
    project: string | null;
}

export interface Feed {
    name: string;
    org_name: string | null;
    tasks: FeedTask[];
}

const STAGE: Record<string, string> = {
    talking_stage: 'Not accepted yet', yet_to_start: 'Not started', in_progress: 'In progress', blockers: 'Blocked', completed: 'Done',
};

/** Text values: escape backslash, semicolon, comma and line breaks. */
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes continue on the next line after a space, never splitting a character. */
function fold(line: string): string {
    const out: string[] = [];
    let cur = '';
    let bytes = 0;
    for (const ch of line) {
        const n = Buffer.byteLength(ch);
        if (bytes + n > (out.length ? 74 : 75)) {
            out.push(cur);
            cur = '';
            bytes = 0;
        }
        cur += ch;
        bytes += n;
    }
    out.push(cur);
    return out.join('\r\n ');
}

const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
const nextDay = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, '');
};
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function renderCalendar(feed: Feed, appUrl: string, now = new Date()): string {
    const calName = feed.org_name ? `Commit · ${feed.org_name}` : 'Commit';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Commit//Due dates//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${text(calName)}`,
        `X-WR-CALDESC:${text(`Tasks assigned to ${feed.name}, on their due dates.`)}`,
        // Ask calendar apps to check hourly (Google decides for itself, usually every few hours).
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        'X-PUBLISHED-TTL:PT1H',
    ];

    for (const t of feed.tasks) {
        if (!/^\d{4}-\d{2}-\d{2}/.test(t.due_date)) continue;
        const flag = t.stage === 'blockers' ? 'Blocked: ' : t.is_urgent ? 'Urgent: ' : '';
        const link = `${appUrl}/tasks?task=${encodeURIComponent(t.id)}`;
        const about = [
            t.project ? `Project: ${t.project}` : null,
            `Status: ${STAGE[t.stage] ?? t.stage}`,
            `Priority: ${t.priority[0]?.toUpperCase() ?? ''}${t.priority.slice(1)}`,
            '',
            `Open in Commit: ${link}`,
        ].filter(l => l !== null).join('\n');
        const changed = t.updated_at ? new Date(t.updated_at) : now;

        lines.push(
            'BEGIN:VEVENT',
            `UID:task-${t.id}@commit`,
            `DTSTAMP:${stamp(now)}`,
            `LAST-MODIFIED:${stamp(Number.isNaN(changed.getTime()) ? now : changed)}`,
            `DTSTART;VALUE=DATE:${day(t.due_date)}`,
            `DTEND;VALUE=DATE:${nextDay(t.due_date)}`,
            `SUMMARY:${text(flag + t.title)}`,
            `DESCRIPTION:${text(about)}`,
            `URL:${link}`,
            'TRANSP:TRANSPARENT', // shows the task without marking the person busy
            'END:VEVENT',
        );
    }

    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
}
