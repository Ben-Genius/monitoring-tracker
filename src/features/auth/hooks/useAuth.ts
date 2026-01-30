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
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    initialized: false,

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
                    set({ user: profile as User, loading: false, initialized: true });
                    return;
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
        set({ user: null, loading: false, initialized: true });
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
                    set({ user: profile as User, loading: false });
                } else {
                    set({ loading: false }); // User authenticated but no profile
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
        set({ user: null, loading: false });
    },
}));

export function useAuth() {
    const store = useAuthStore();
    return store;
}
