import { track } from './analytics';

/**
 * Downloads rows as a CSV that opens cleanly in Excel (UTF-8 with a byte-order
 * mark, so names like "Ɔfori" survive). papaparse loads only when someone
 * exports.
 *
 * Cells that start with = + - @ are prefixed with ' so a spreadsheet never
 * runs them as a formula (CSV injection), e.g. a task titled "=HYPERLINK(…)".
 */
type Cell = string | number | boolean | null | undefined;

const unsafe = /^[=+\-@\t\r]/;
const safe = (v: Cell) => (typeof v === 'string' && unsafe.test(v) ? `'${v}` : v ?? '');

export async function downloadCsv(name: string, rows: Record<string, Cell>[], kind: 'tasks' | 'projects'): Promise<void> {
    const { default: Papa } = await import('papaparse');
    const clean = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));
    const csv = Papa.unparse(clean, { newline: '\r\n' });
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track('data_exported', { kind, rows: rows.length });
}

/** 2026-11-26 from a date or timestamp; blank when missing. */
export const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');
