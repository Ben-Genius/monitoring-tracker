import { useId, useState } from 'react';
import { Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { getCompanyTheme } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The organisation's companies, for admins. Most organisations are one
 * business; a group adds its other businesses here (add_company in
 * supabase/migrations/20261126190000_add_company.sql). With a second company,
 * the company switcher and pickers appear across the app.
 */
export default function CompaniesSetting() {
    const { data: companies = [] } = useCompanies();
    const qc = useQueryClient();
    const inputId = useId();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const add = useMutation({
        mutationFn: async (companyName: string) => {
            const { error } = await supabase.rpc('add_company', { p_name: companyName });
            if (error) throw new Error(error.message);
        },
        onSuccess: (_d, companyName) => {
            setName('');
            setError(null);
            qc.invalidateQueries({ queryKey: ['companies'] });
            toast.success(`${companyName} added. Switch between companies from the top bar.`);
        },
        onError: (e: Error) => {
            const m = e.message.replace(/^./, c => c.toUpperCase());
            setError(/already have a company/i.test(m) ? `${m}.` : `Couldn’t add the company. ${m}`);
        },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) { setError('Enter the company’s name.'); return; }
        add.mutate(trimmed);
    };

    return (
        <Card className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-line px-6 py-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-slate-500" aria-hidden />
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Companies</CardTitle>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">{companies.length}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-y divide-line dark:divide-slate-800">
                    {companies.map((c: { id: string; name: string; description?: string | null }) => (
                        <li key={c.id} className="flex items-center gap-2 px-6 py-3">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(c.name).primary }} aria-hidden />
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                        </li>
                    ))}
                </ul>

                <form onSubmit={submit} className="space-y-2 border-t border-line px-6 py-4 dark:border-slate-800" noValidate>
                    <label htmlFor={inputId} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Add a company</label>
                    <p id={`${inputId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
                        {companies.length <= 1
                            ? 'Run more than one business? Add each one here. Each company’s projects and people stay separate, and a company switcher appears in the top bar.'
                            : 'Each company’s projects and people stay separate. Switch between them from the top bar.'}
                    </p>
                    <div className="flex gap-2">
                        <Input
                            id={inputId}
                            value={name}
                            onChange={e => { setName(e.target.value); setError(null); }}
                            maxLength={120}
                            autoComplete="off"
                            aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
                            aria-invalid={!!error || undefined}
                        />
                        <Button type="submit" disabled={add.isPending} className="shrink-0">
                            {add.isPending ? 'Adding…' : 'Add'}
                        </Button>
                    </div>
                    {error && <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-blocked dark:text-red-300">{error}</p>}
                </form>
            </CardContent>
        </Card>
    );
}
