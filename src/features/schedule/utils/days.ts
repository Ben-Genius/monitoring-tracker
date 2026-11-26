import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';

/**
 * Calendar days, not instants. Deadlines and start dates are Postgres DATE
 * columns ("2026-11-26"); parseISO reads those as local midnight, so a
 * deadline never slides a day for people east or west of Greenwich.
 */
export type DayKey = string; // YYYY-MM-DD

export const dayKey = (d: Date): DayKey => format(d, 'yyyy-MM-dd');

/** A DATE column or an ISO timestamp, as a local calendar day. */
export function toDay(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export const today = () => startOfDay(new Date());
export const daysBetween = (a: Date, b: Date) => differenceInCalendarDays(b, a);
export { addDays };

/** Short, unambiguous labels: "26 Nov", "26 Nov 2027" outside this year. */
export function dayLabel(d: Date): string {
    return format(d, d.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM yyyy');
}
