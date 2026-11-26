/**
 * Class names and styles for the sign-in screens, which share the public
 * site's look (Geist, black and white, hairline borders, red only for problems).
 */

export const mono = { fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };
export const geist = { fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

export const authInput =
    'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-[15px] text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 ' +
    'focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/[.06] disabled:bg-neutral-50 disabled:text-neutral-500 [&:user-invalid]:border-[#C9361E] ' +
    'dark:border-[#2E2E2E] dark:bg-[#0A0A0A] dark:text-neutral-100 dark:focus:border-neutral-200 dark:focus:ring-white/10 dark:disabled:bg-[#111]';

export const authButton =
    'group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 text-[15px] font-medium text-white transition-[background-color,transform] ' +
    'hover:bg-neutral-800 active:scale-[.99] disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200';

export const authLink = 'font-medium text-neutral-950 underline-offset-4 hover:underline dark:text-white';
export const authMuted = 'text-neutral-500 dark:text-neutral-400';

/** Entrance motion in CSS, so nothing waits on a script. */
export const authMotion = `
@keyframes login-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.login-in { animation: login-rise .8s cubic-bezier(.16,1,.3,1) both; }
@media (prefers-reduced-motion: reduce) { .login-in { animation: none; } }
`;
export const delay = (s: number) => ({ animationDelay: `${s}s` });
