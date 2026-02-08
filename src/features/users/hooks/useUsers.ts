import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'lead' | 'employee';
    company_id: string | null;
}

export function useUsers(companyId?: string) {
    return useQuery({
        queryKey: ['users', companyId],
        queryFn: async () => {
            let query = supabase
                .from('users')
                .select('*')
                .order('name');

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as User[];
        },
    });
}
