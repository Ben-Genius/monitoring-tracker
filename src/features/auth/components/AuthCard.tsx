import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** The centred card used by the sign-up, welcome, forgot-password and reset-password pages. */
export default function AuthCard({ icon: Icon, title, subtitle, children }: {
    icon: LucideIcon;
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
}) {
    return (
        <main className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
            <div className="w-full max-w-md animate-spring-up">
                <Card className="rounded-2xl border-gray-200/60 dark:border-slate-700/60 shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                            <Icon className="w-6 h-6 text-primary" aria-hidden />
                        </div>
                        <h1 className="text-2xl font-bold text-center tracking-tight leading-none">{title}</h1>
                        {subtitle && <p className="text-center text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>}
                    </CardHeader>
                    <CardContent>{children}</CardContent>
                </Card>
            </div>
        </main>
    );
}
