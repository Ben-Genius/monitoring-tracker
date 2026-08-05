#!/usr/bin/env node
/**
 * Verifies that RLS is closed to anonymous callers.
 *
 * The anon key is public (it ships in the browser bundle), so the only thing
 * protecting your data is RLS. This script does exactly what an attacker would:
 * hits the REST API with nothing but that public key and reports what comes back.
 *
 * Expected after 20260803120000_enable_rls_core_tables.sql is applied:
 * every table reports 0 rows visible.
 *
 *   node scripts/verify-rls.mjs
 */
import { readFileSync } from 'node:fs';

// Load .env without adding a dependency
try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '');
    }
} catch {
    // no .env — fall back to real environment
}

const URL_BASE = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!URL_BASE || !ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const TABLES = [
    'companies', 'users', 'projects', 'tasks', 'milestones', 'subtasks',
    'approvals', 'audit_log', 'project_comments', 'project_attachments',
    'task_assignees',
];

let exposed = 0;

for (const table of TABLES) {
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?select=*`, {
        headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            Prefer: 'count=exact',
            Range: '0-0',
        },
    });

    const range = res.headers.get('content-range') || '';
    const total = Number(range.split('/')[1]);

    if (!res.ok) {
        console.log(`  OK       ${table.padEnd(20)} blocked (HTTP ${res.status})`);
    } else if (total > 0) {
        console.log(`  EXPOSED  ${table.padEnd(20)} ${total} row(s) readable anonymously`);
        exposed++;
    } else {
        // HTTP 200 with 0 rows is ambiguous: either RLS filtered everything out,
        // or the table is simply empty. Only a 4xx proves RLS is doing the work.
        console.log(`  UNKNOWN  ${table.padEnd(20)} 0 rows — empty table or RLS; inconclusive`);
    }
}

console.log(
    exposed === 0
        ? '\nNo tables leaked rows anonymously.'
        : `\n${exposed} table(s) still exposed — RLS is not protecting them.`
);
process.exit(exposed === 0 ? 0 : 1);
