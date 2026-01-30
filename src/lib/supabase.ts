import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we're in demo mode (no real Supabase credentials)
export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types will be generated from Supabase
export type Database = {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    created_at?: string;
                };
            };
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    role: 'admin' | 'lead' | 'employee';
                    company_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name: string;
                    role: 'admin' | 'lead' | 'employee';
                    company_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    role?: 'admin' | 'lead' | 'employee';
                    company_id?: string;
                    created_at?: string;
                };
            };
            projects: {
                Row: {
                    id: string;
                    name: string;
                    company_id: string;
                    status: 'active' | 'completed' | 'on_hold';
                    contract_value: number;
                    actual_cost: number;
                    expected_handover: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    company_id: string;
                    status?: 'active' | 'completed' | 'on_hold';
                    contract_value: number;
                    actual_cost?: number;
                    expected_handover: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    company_id?: string;
                    status?: 'active' | 'completed' | 'on_hold';
                    contract_value?: number;
                    actual_cost?: number;
                    expected_handover?: string;
                    created_at?: string;
                };
            };
            tasks: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    project_id: string;
                    assignee_id: string;
                    stage: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
                    priority: 'low' | 'medium' | 'high' | 'critical';
                    due_date: string | null;
                    created_by: string;
                    created_at: string;
                    updated_at: string;
                    completed_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    project_id: string;
                    assignee_id: string;
                    stage?: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
                    priority?: 'low' | 'medium' | 'high' | 'critical';
                    due_date?: string | null;
                    created_by: string;
                    created_at?: string;
                    updated_at?: string;
                    completed_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    project_id?: string;
                    assignee_id?: string;
                    stage?: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
                    priority?: 'low' | 'medium' | 'high' | 'critical';
                    due_date?: string | null;
                    created_by?: string;
                    created_at?: string;
                    updated_at?: string;
                    completed_at?: string | null;
                };
            };
        };
    };
};
