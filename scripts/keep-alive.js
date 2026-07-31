#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';

const envPath = new URL('../.env', import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*export\s+(.+?)=(.+)\s*$/);
    const [key, val] = m ? [m[1], m[2]] : line.split('=');
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

async function ping() {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: ANON_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    console.log(`[${new Date().toISOString()}] Supabase ping OK (${Date.now() - start}ms)`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ping failed: ${err.message}`);
  }
}

const mode = process.argv[2] === 'once' ? 'once' : 'daemon';

(async () => {
  if (mode === 'once') {
    await ping();
    process.exit(0);
  } else {
    console.log(`Starting Supabase keep-alive daemon (every ${PING_INTERVAL_HOURS}h)`);
    await ping();
    setInterval(ping, PING_INTERVAL_HOURS * 60 * 60 * 1000);
  }
})();
