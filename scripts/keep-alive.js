#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';

const envPath = new URL('../.env', import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const body = trimmed.replace(/^export\s+/, '');
    const eq = body.indexOf('=');
    if (eq === -1) continue;
    const key = body.slice(0, eq).trim();
    const val = body.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PING_INTERVAL_HOURS = parseInt(process.env.PING_INTERVAL_HOURS || '4', 10);

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

// Goes through PostgREST so the request reaches Postgres. RLS returns [] for the
// anon key, which is what we want: real database activity, no data transferred.
const PING_URL = `${SUPABASE_URL}/rest/v1/companies?select=id&limit=1`;

async function ping() {
  const start = Date.now();
  try {
    const res = await fetch(PING_URL, { headers: { apikey: ANON_KEY } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    await res.text();
    console.log(`[${new Date().toISOString()}] Supabase ping OK (${Date.now() - start}ms)`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ping failed: ${err.message}`);
    return false;
  }
}

const mode = process.argv[2] === 'once' ? 'once' : 'daemon';

(async () => {
  if (mode === 'once') {
    process.exit((await ping()) ? 0 : 1);
  } else {
    console.log(`Starting Supabase keep-alive daemon (every ${PING_INTERVAL_HOURS}h)`);
    await ping();
    setInterval(ping, PING_INTERVAL_HOURS * 60 * 60 * 1000);
  }
})();
