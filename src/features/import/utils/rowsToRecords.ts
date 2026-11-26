/** A spreadsheet cell as read-excel-file returns it. */
export type Cell = string | number | boolean | Date | null;

/**
 * Turns spreadsheet rows (first row = headings) into one record per row,
 * keyed by heading, the shape the column mapper and importer expect.
 *
 * - Empty cells become '' (the importer skips those fields).
 * - Fully empty rows are dropped.
 * - Dates become ISO strings, which Postgres accepts for date and timestamp
 *   columns. (The old xlsx library returned Excel serial numbers such as
 *   46351, which the database rejected.) Excel stores dates as fractions of a
 *   day, so a date can come back a few seconds before midnight: it is rounded
 *   to the minute, and a whole day is sent as YYYY-MM-DD.
 */
export function rowsToRecords(rows: Cell[][]): { columns: string[]; records: Record<string, string | number | boolean>[] } {
    if (!rows.length) return { columns: [], records: [] };
    const columns = rows[0].map((h, i) => String(h ?? '').trim() || `Column ${i + 1}`);
    const records = rows.slice(1)
        .filter(r => r.some(c => c !== null && c !== ''))
        .map(r => Object.fromEntries(columns.map((c, i) => {
            const v = r[i];
            return [c, v === null || v === undefined ? '' : v instanceof Date ? isoDate(v) : v];
        })));
    return { columns, records };
}

function isoDate(d: Date): string {
    const minute = 60_000;
    const rounded = new Date(Math.round(d.getTime() / minute) * minute);
    const iso = rounded.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}
