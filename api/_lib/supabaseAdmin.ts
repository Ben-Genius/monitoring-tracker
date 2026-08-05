import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server-side jobs.
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY bypasses every RLS policy. It must never
 * reach the browser — no VITE_ prefix, and never import this from src/.
 * The sync needs it because it writes on behalf of no user, so there is no
 * auth.uid() for policies to evaluate.
 */
export function supabaseAdmin(): SupabaseClient {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error('VITE_SUPABASE_URL is not configured');
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
