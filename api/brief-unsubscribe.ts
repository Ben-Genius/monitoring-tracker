import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { verifyUnsubscribe } from './_lib/briefUnsubscribe.js';

/**
 * Turns off the 7am morning email from the link in its footer.
 *
 *   GET  /api/brief-unsubscribe?u=<user id>&s=<signature>   a page with a button
 *   POST the same URL                                       turns it off
 *
 * GET only shows a button, because mail scanners open links on their own and
 * must not unsubscribe anyone. Mail apps' one-click unsubscribe (RFC 8058,
 * the List-Unsubscribe-Post header) sends the POST directly.
 */

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; --ink:#17202B; --muted:#5B6673; --paper:#F4F6F8; --card:#fff; --line:#E3E7EC; }
  @media (prefers-color-scheme: dark) { :root { --ink:#E8ECF1; --muted:#9AA5B1; --paper:#0F151C; --card:#17202B; --line:#2A3542; } }
  body { margin:0; min-height:100dvh; display:grid; place-items:center; background:var(--paper); color:var(--ink);
         font:16px/1.5 'Public Sans',-apple-system,'Segoe UI',Roboto,sans-serif; padding:16px; box-sizing:border-box; }
  main { max-width:420px; width:100%; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:28px 24px; }
  h1 { font-size:20px; margin:0 0 8px; text-wrap:balance; }
  p { color:var(--muted); margin:0 0 20px; }
  button, a.btn { font:inherit; font-weight:600; border:0; border-radius:8px; padding:10px 18px; background:var(--ink); color:var(--card); cursor:pointer; text-decoration:none; display:inline-block; }
</style></head><body><main>${body}</main></body></html>`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { u, s } = req.query;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');

    if (!verifyUnsubscribe(u, s)) {
        return res.status(400).send(page('Link not valid', '<h1>This link isn’t valid</h1><p>Turn the morning email off in Pulse360 under Settings instead.</p>'));
    }

    if (req.method === 'GET') {
        return res.status(200).send(page('Stop the morning email',
            `<h1>Stop the 7am morning email?</h1><p>You can still read the brief in Pulse360 any time, and turn the email back on in Settings.</p>
             <form method="post"><button type="submit">Stop the emails</button></form>`));
    }
    if (req.method !== 'POST') return res.status(405).send(page('Not allowed', '<h1>Not allowed</h1>'));

    const { error } = await supabaseAdmin().rpc('unsubscribe_brief_email', { p_user: u });
    if (error) {
        return res.status(500).send(page('Try again', '<h1>That didn’t work</h1><p>Try the link again in a minute, or turn the email off in Settings.</p>'));
    }
    return res.status(200).send(page('Emails stopped',
        '<h1>You won’t get the morning email</h1><p>Changed your mind? Turn it back on in Pulse360 under Settings.</p><a class="btn" href="/settings">Open Settings</a>'));
}
