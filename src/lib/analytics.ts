import type { PostHog } from 'posthog-js';

/**
 * Product analytics (PostHog, EU region), so we can see which teams are
 * actually using Pulse360 and where new ones drop off.
 *
 * What is sent, on purpose:
 * - Named events only (see AnalyticsEvent). Autocapture is off, because click
 *   text would carry task titles, i.e. our customers' business.
 * - People by their internal user id, with role and organisation id. Never
 *   names, emails, phone numbers or anything typed.
 * - No session replay.
 *
 * posthog-js loads after the page is idle so it never slows first paint.
 * Calls made before then are queued. With no VITE_PUBLIC_POSTHOG_KEY set
 * (local development, previews) nothing loads and nothing is sent.
 */

export type AnalyticsEvent =
    | 'organization_created'
    | 'sample_data_removed'
    | 'task_accepted'
    | 'task_update_posted'
    | 'brief_viewed'
    | 'brief_email_toggled'
    | 'user_invited';

type Props = Record<string, string | number | boolean | null | undefined>;

const KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
// Sent through our own domain (vercel.json rewrites /ingest to PostHog EU),
// so ad blockers don't silently drop it.
const API_HOST = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) || '/ingest';

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: ((ph: PostHog) => void)[] = [];

function load(): Promise<PostHog | null> {
    if (!KEY) return Promise.resolve(null);
    loading ??= import('posthog-js').then(({ default: posthog }) => {
        posthog.init(KEY, {
            api_host: API_HOST,
            ui_host: 'https://eu.posthog.com',
            person_profiles: 'identified_only',
            capture_pageview: 'history_change', // React Router navigations count as pageviews
            capture_pageleave: true,
            autocapture: false,
            // Project settings in PostHog can switch these on remotely; keep them off
            // here so clicks are never recorded. Web Vitals (page speed only) stay on.
            capture_dead_clicks: false,
            enable_heatmaps: false,
            disable_session_recording: true,
            disable_surveys: true,
            capture_exceptions: false,
            mask_all_text: true,
            mask_all_element_attributes: true,
        });
        client = posthog;
        queue.splice(0).forEach(fn => fn(posthog));
        return posthog;
    }).catch(() => null);
    return loading;
}

function withClient(fn: (ph: PostHog) => void) {
    if (!KEY) return;
    if (client) fn(client);
    else { queue.push(fn); void load(); }
}

/** Starts PostHog once the browser is idle. Called once from main.tsx. */
export function initAnalytics(): void {
    if (!KEY) return;
    const start = () => void load();
    if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 3000 });
    else setTimeout(start, 1500);
}

export function track(event: AnalyticsEvent, props?: Props): void {
    withClient(ph => ph.capture(event, props));
}

/** Ties events to the signed-in person, by id only. */
export function identify(user: { id: string; role: string; organization_id?: string | null }): void {
    withClient(ph => ph.identify(user.id, { role: user.role, organization_id: user.organization_id ?? null }));
}

/** On sign-out, so the next person on this device starts fresh. */
export function resetAnalytics(): void {
    if (client) client.reset();
}
