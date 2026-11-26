import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authButton, authInput, authMotion, delay, geist, mono } from './authStyles';

/**
 * The frame for every sign-in screen: the public site's header, one bordered
 * column split into the form and a decorative panel, and the site footer.
 */
export function AuthShell({ children, aside, cta = { to: '/login', label: 'Log in' } }: {
    children: ReactNode;
    aside?: ReactNode;
    /** The bordered button at the right of the header. */
    cta?: { to: string; label: string };
}) {
    return (
        <div className="min-h-screen bg-white text-neutral-950 antialiased dark:bg-[#0A0A0A] dark:text-neutral-100" style={geist}>
            <style>{authMotion}</style>

            <header className="border-b border-neutral-200 dark:border-[#1F1F1F]">
                <div className="mx-auto flex h-14 w-[min(1400px,100%-32px)] items-center gap-2 border-x border-neutral-200 px-4 dark:border-[#1F1F1F]">
                    <a href="/" className="mr-auto flex items-center gap-2.5 text-[16px] font-semibold tracking-tight">
                        <img src="/brand/commit-mark.png" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
                        Commit<span className="text-neutral-400">.</span>
                    </a>
                    <a href="/features" className="hidden rounded-md px-2.5 py-2 text-sm text-neutral-500 hover:text-neutral-950 sm:block dark:text-neutral-400 dark:hover:text-white">Features</a>
                    <a href="/pricing" className="hidden rounded-md px-2.5 py-2 text-sm text-neutral-500 hover:text-neutral-950 sm:block dark:text-neutral-400 dark:hover:text-white">Pricing</a>
                    <Link to={cta.to} className="inline-flex h-9 items-center rounded-lg border border-neutral-300 px-3.5 text-sm font-medium hover:bg-neutral-50 dark:border-[#2E2E2E] dark:hover:bg-[#111]">
                        {cta.label}
                    </Link>
                </div>
            </header>

            <main className="mx-auto grid min-h-[calc(100vh-56px-65px)] w-[min(1400px,100%-32px)] grid-cols-1 border-x border-neutral-200 lg:grid-cols-[1fr_1.1fr] dark:border-[#1F1F1F]">
                <section className="flex items-center px-5 py-16 sm:px-12 lg:px-16 lg:py-24">
                    <div className="w-full max-w-[420px]">{children}</div>
                </section>
                <section
                    aria-hidden="true"
                    className="hidden overflow-clip border-l border-neutral-200 bg-neutral-50 lg:block dark:border-[#1F1F1F] dark:bg-[#111]"
                    style={{ backgroundImage: 'radial-gradient(rgba(127,127,127,.28) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                >
                    {/* Stays centred in view while a long form scrolls beside it. */}
                    <div className="sticky top-0 flex h-[calc(100vh-56px)] items-center px-12 xl:px-20">
                        <div className="login-in w-full" style={delay(.2)}>{aside ?? <RulesAside />}</div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-neutral-200 dark:border-[#1F1F1F]">
                <div className="mx-auto flex w-[min(1400px,100%-32px)] flex-wrap items-center gap-x-6 gap-y-2 border-x border-neutral-200 px-6 py-6 text-[13px] text-neutral-500 dark:border-[#1F1F1F] dark:text-neutral-400" style={mono}>
                    <span className="mr-auto">© 2026 Commit</span>
                    <a href="/features" className="hover:text-neutral-950 dark:hover:text-white">Features</a>
                    <a href="/pricing" className="hover:text-neutral-950 dark:hover:text-white">Pricing</a>
                    <a href="/privacy" className="hover:text-neutral-950 dark:hover:text-white">Privacy</a>
                    <a href="/terms" className="hover:text-neutral-950 dark:hover:text-white">Terms</a>
                </div>
            </footer>
        </div>
    );
}

/** Small mono label, big heading, muted line under it. */
export function AuthHeading({ label, title, subtitle, id }: { label: string; title: ReactNode; subtitle?: ReactNode; id?: string }) {
    return (
        <>
            <p className="login-in text-[12px] font-medium uppercase tracking-[.08em] text-neutral-500 dark:text-neutral-400" style={{ ...mono, ...delay(0) }}>{label}</p>
            <h1 id={id} className="login-in mt-5 text-[40px] font-normal leading-[1.02] tracking-[-.05em] sm:text-[52px]" style={delay(.06)}>{title}</h1>
            {subtitle && <p className="login-in mt-4 text-[16px] leading-relaxed text-neutral-500 dark:text-neutral-400" style={delay(.12)}>{subtitle}</p>}
        </>
    );
}

/** A labelled field, with an optional hint under the label (linked for screen readers). */
export function Field({ id, label, hint, extra, children }: { id: string; label: string; hint?: string; extra?: ReactNode; children: ReactNode }) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
                {extra}
            </div>
            {hint && <p id={`${id}-hint`} className="-mt-0.5 mb-2 text-[12px] text-neutral-500 dark:text-neutral-400">{hint}</p>}
            {children}
        </div>
    );
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`${authInput} ${props.className ?? ''}`} />;
}

/** Password input with a show/hide toggle. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={show ? 'text' : 'password'} className={`${authInput} pr-12`} />
            {String(props.value ?? '').length > 0 && (
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
            )}
        </div>
    );
}

export function AuthError({ children }: { children: ReactNode }) {
    return (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-[#C9361E]/30 bg-[#C9361E]/[.06] px-3 py-2.5 text-[13px] text-[#A12A16] dark:border-[#FF6B52]/30 dark:text-[#FF8A75]">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            <span>{children}</span>
        </p>
    );
}

export function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
    return (
        <button type="submit" disabled={busy} className={`${authButton} mt-2`}>
            {busy ? (
                <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    {busyLabel}
                </>
            ) : (
                <>
                    {children}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </>
            )}
        </button>
    );
}

/** The bottom row: a short question and a link. */
export function AuthFooterRow({ text, to, children }: { text: ReactNode; to: string; children: ReactNode }) {
    return (
        <div className="login-in mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-neutral-200 pt-6 text-[14px] dark:border-[#1F1F1F]" style={delay(.24)}>
            <span className="text-neutral-500 dark:text-neutral-400">{text}</span>
            <Link to={to} className="font-medium underline-offset-4 hover:underline">{children}</Link>
        </div>
    );
}

/** Window frame used by the decorative panels. */
export function PreviewWindow({ path, children }: { path: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-[0_24px_48px_-28px_rgba(0,0,0,.25)] dark:border-[#2E2E2E] dark:bg-[#0A0A0A]">
            <div className="flex h-10 items-center gap-3 border-b border-neutral-200 px-3.5 dark:border-[#1F1F1F]">
                <span className="flex gap-1.5">{[0, 1, 2].map(i => <i key={i} className="h-2.5 w-2.5 rounded-full border border-neutral-300 dark:border-[#2E2E2E]" />)}</span>
                <span className="text-[12px] text-neutral-400" style={mono}>{path}</span>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

/** Default panel: the escalation rules, as on the Features page. */
function RulesAside() {
    const rows: [string, string, string, boolean?][] = [
        ['day 2', 'owner', 'post a quick update'],
        ['day 4', 'lead, assigner', 'worth a check-in'],
        ['day 7', 'leadership', 'gone quiet', true],
    ];
    return (
        <PreviewWindow path="escalation rules">
            <p className="text-[12px] text-neutral-400" style={mono}># in progress, no update</p>
            <ul className="mt-3 border-t border-neutral-200 dark:border-[#1F1F1F]">
                {rows.map(([d, who, note, hot]) => (
                    <li key={d} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-neutral-200 py-3 text-[13px] dark:border-[#1F1F1F]" style={mono}>
                        <span className="text-neutral-400">{d}</span>
                        <span>→ {who}</span>
                        <span className={hot ? 'text-[#C9361E] dark:text-[#FF6B52]' : 'text-neutral-400'}>{note}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-6 text-[22px] leading-tight tracking-[-.03em]">Projects planned. Work done. <span className="text-neutral-400">Everyone accountable.</span></p>
        </PreviewWindow>
    );
}
