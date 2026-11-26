import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { track } from '@/lib/analytics';

/** What the sign-up form stores on the login until the organisation exists. */
export interface PendingSetup {
    name: string;
    org_name: string;
    company_name: string;
    with_sample: boolean;
}

export function pendingSetupFrom(meta: Record<string, unknown> | undefined): PendingSetup | null {
    if (!meta || typeof meta.org_name !== 'string' || typeof meta.company_name !== 'string') return null;
    return {
        name: typeof meta.name === 'string' ? meta.name : '',
        org_name: meta.org_name,
        company_name: meta.company_name,
        with_sample: meta.with_sample !== false,
    };
}

/**
 * Creates the organisation, first company and the founder's admin profile
 * (create_organization in supabase/migrations/20261125130000_…), then loads
 * the new profile into the auth store so the app opens signed in.
 */
export async function finishSetup(setup: PendingSetup): Promise<void> {
    const { error } = await supabase.rpc('create_organization', {
        p_org_name: setup.org_name,
        p_company_name: setup.company_name,
        p_name: setup.name,
        p_with_sample: setup.with_sample,
    });
    if (error) throw new Error(friendlySetupError(error.message));
    track('organization_created', { with_sample: setup.with_sample });
    await useAuthStore.getState().checkSession();
}

function friendlySetupError(message: string): string {
    if (/already belongs to a team/i.test(message)) {
        return 'This email already belongs to a team on Pulse360. Ask your admin to invite you, or sign up with a different email.';
    }
    if (/required|120 characters/i.test(message)) return message.charAt(0).toUpperCase() + message.slice(1) + '.';
    return `We couldn’t set up your organisation: ${message}`;
}
