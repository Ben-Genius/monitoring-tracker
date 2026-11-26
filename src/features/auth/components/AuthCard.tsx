import type { ReactNode } from 'react';
import { AuthHeading, AuthShell } from './AuthLayout';
import { delay } from './authStyles';

/** A sign-in screen: the shared frame, a heading, and the page's form or message. */
export default function AuthCard({ label, title, subtitle, aside, cta, children }: {
    label: string;
    title: string;
    subtitle?: ReactNode;
    aside?: ReactNode;
    cta?: { to: string; label: string };
    children?: ReactNode;
}) {
    return (
        <AuthShell aside={aside} cta={cta}>
            <AuthHeading label={label} title={title} subtitle={subtitle} />
            {children && <div className="login-in mt-10" style={delay(.18)}>{children}</div>}
        </AuthShell>
    );
}
