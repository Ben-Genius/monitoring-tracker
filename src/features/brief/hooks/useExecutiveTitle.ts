import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * How the brief refers to the executive it is prepared for: the
 * organisation's chosen title ("Mr Blay"), else the executive's own name,
 * else "the executive". Each customer sets this in organizations.executive_title.
 */
export function useExecutiveTitle(): string {
    const { data } = useQuery({
        queryKey: ['executive-title'],
        staleTime: 10 * 60 * 1000,
        queryFn: async (): Promise<string | null> => {
            const [org, exec] = await Promise.all([
                supabase.from('organizations').select('executive_title').maybeSingle(),
                supabase.from('users').select('name').eq('role', 'executive')
                    .is('deactivated_at', null).order('created_at').limit(1).maybeSingle(),
            ]);
            // Before the organisations migration is applied, org.error is set; fall through.
            return (org.data as { executive_title: string | null } | null)?.executive_title
                || (exec.data as { name: string } | null)?.name
                || null;
        },
    });
    return data ?? 'the executive';
}

/** For the start of a sentence: "the executive" → "The executive". */
export function capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
