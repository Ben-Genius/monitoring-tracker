import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'lead' | 'employee';
    company_id: string;
}

interface AuthState {
    user: User | null;
    loading: boolean;
    initialized: boolean;
    /**
     * Set when Supabase authenticated the person but no matching row exists in
     * public.users. Without this the app looked signed-out while the session
     * was alive, so ProtectedRoute bounced to /login, App re-checked the
     * session, and the loop repeated. Surfacing it lets the UI say what is
     * actually wrong.
     */
    missingProfile: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    /** Subscribes to Supabase auth events. Returns an unsubscribe function. */
    subscribe: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    initialized: false,
    missingProfile: false,

    checkSession: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch user profile
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    set({
                        user: profile as User,
                        loading: false,
                        initialized: true,
                        missingProfile: false,
                    });
                    return;
                }

                // Authenticated, but no profile row: a real state, not a
                // signed-out one. Redirecting to /login here would loop.
                set({
                    user: null,
                    loading: false,
                    initialized: true,
                    missingProfile: true,
                });
                return;
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
        set({ user: null, loading: false, initialized: true, missingProfile: false });
    },

    subscribe: () => {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            // Supabase warns against awaiting inside this callback — it runs on
            // the internal lock and can deadlock. Defer any async work.
            if (event === 'SIGNED_OUT' || !session) {
                set({ user: null, loading: false, initialized: true, missingProfile: false });
                return;
            }

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setTimeout(() => {
                    void useAuthStore.getState().checkSession();
                }, 0);
            }
        });

        return () => data.subscription.unsubscribe();
    },

    signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    set({ user: profile as User, loading: false, missingProfile: false });
                } else {
                    // Signed in with no profile row. Reported explicitly rather
                    // than leaving the caller on a login screen that appears to
                    // have silently failed.
                    set({ loading: false, missingProfile: true });
                    throw new Error(
                        'Your account exists but has no profile in this workspace. Ask an admin to invite you.',
                    );
                }
            }
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    },

    signOut: async () => {
        set({ loading: true });
        await supabase.auth.signOut();
        set({ user: null, loading: false, missingProfile: false });
    },
}));

export function useAuth() {
    const store = useAuthStore();
    return store;
}
