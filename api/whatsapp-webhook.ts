import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { downloadMedia, sendText, signatureIsValid } from './_lib/whatsapp/graph.js';
import { firstLink, parseCommand } from './_lib/whatsapp/parse.js';
import * as say from './_lib/whatsapp/messages.js';

/**
 * WhatsApp Business webhook: people update their own tasks by message.
 *
 *   GET   Meta's one-time verification (hub.challenge), using WHATSAPP_VERIFY_TOKEN
 *   POST  incoming messages, signed with WHATSAPP_APP_SECRET (checked; unsigned is refused)
 *
 * Every change goes through public.whatsapp_apply_update, which runs as the
 * person and enforces the app's rules (own tasks only, a note, proof for
 * done). See supabase/migrations/20261126130000_whatsapp_updates.sql.
 */

// Read the raw body ourselves: the signature is over the exact bytes Meta sent.
export const config = { api: { bodyParser: false } };

interface InboundMessage {
    id: string;
    from: string;
    type: string;
    text?: { body?: string };
    image?: { id: string; mime_type?: string; caption?: string };
    document?: { id: string; mime_type?: string; filename?: string; caption?: string };
}

async function rawBody(req: VercelRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
    return Buffer.concat(chunks);
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const ok = req.query['hub.mode'] === 'subscribe' && !!process.env.WHATSAPP_VERIFY_TOKEN
            && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN;
        return ok ? res.status(200).send(String(req.query['hub.challenge'] ?? '')) : res.status(403).send('Forbidden');
    }
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const body = await rawBody(req);
    if (!signatureIsValid(body, req.headers['x-hub-signature-256'] as string | undefined)) {
        return res.status(401).send('Bad signature');
    }

    let payload: { entry?: { changes?: { value?: { messages?: InboundMessage[] } }[] }[] };
    try { payload = JSON.parse(body.toString('utf8')); } catch { return res.status(400).send('Bad JSON'); }
    const messages = (payload.entry ?? []).flatMap(e => (e.changes ?? []).flatMap(c => c.value?.messages ?? []));

    const db = supabaseAdmin();
    for (const msg of messages) {
        try {
            const { data: fresh } = await db.rpc('whatsapp_claim_message', { p_message_id: msg.id });
            if (fresh !== true) continue; // already handled (Meta retries)
            const reply = await handle(db, msg);
            if (reply) await sendText(msg.from, reply);
        } catch (err) {
            console.error('whatsapp message failed', msg.id, (err as Error).message);
        }
    }
    // Always 200 once the signature is good, so Meta doesn't retry what we've handled.
    return res.status(200).send('ok');
}

type Db = ReturnType<typeof supabaseAdmin>;

async function handle(db: Db, msg: InboundMessage): Promise<string | null> {
    const phone = msg.from.replace(/\D/g, '');
    const media = msg.image ?? msg.document;
    const text = msg.text?.body ?? media?.caption ?? '';
    if (!['text', 'image', 'document'].includes(msg.type)) return say.UNKNOWN;

    const cmd = parseCommand(text);

    if (cmd.kind === 'link') {
        const { data: first } = await db.rpc('whatsapp_link', { p_phone: phone, p_code: cmd.code });
        return first ? say.linked(first as string) : say.BAD_CODE;
    }

    const { data: who } = await db.rpc('whatsapp_user', { p_phone: phone });
    const person = (who as { user_id: string; name: string }[] | null)?.[0];
    if (!person) return say.NOT_LINKED;
    const first = person.name.split(' ')[0];

    if (cmd.kind === 'help') return say.HELP;
    if (cmd.kind === 'unknown') return say.UNKNOWN;
    if (cmd.kind === 'list') {
        const { data: tasks } = await db.rpc('whatsapp_my_tasks', { p_user: person.user_id });
        return say.taskList(first, (tasks ?? []) as say.ListedTask[]);
    }

    const { data: taskId } = await db.rpc('whatsapp_task_at', { p_user: person.user_id, p_index: cmd.n });
    if (!taskId) {
        // Out of range, or the list is over a day old: show the current list so they can try again.
        const { data: tasks } = await db.rpc('whatsapp_my_tasks', { p_user: person.user_id });
        return `I couldn't find task ${cmd.n} in your list. Here it is again:\n\n${say.taskList(first, (tasks ?? []) as say.ListedTask[])}`;
    }

    // Proof for "done": the photo or document they sent, or a link in the note.
    let evidence: unknown[] = [];
    if (cmd.kind === 'done') {
        if (media) {
            try {
                const { bytes, mime } = await downloadMedia(media.id);
                const path = `${taskId}/wa-${msg.id.replace(/[^\w-]/g, '').slice(-24)}.${EXT[mime] ?? 'bin'}`;
                const { error } = await db.storage.from('task-evidence').upload(path, bytes, { contentType: mime, upsert: true });
                if (error) throw error;
                evidence = [{ kind: 'file', path, name: msg.document?.filename ?? 'WhatsApp photo', type: mime, size: bytes.length }];
            } catch {
                return say.PROOF_SAVE_FAILED;
            }
        } else {
            const url = firstLink(cmd.note);
            if (url) evidence = [{ kind: 'link', url, name: new URL(url).hostname }];
        }
    }

    const { data: result, error } = await db.rpc('whatsapp_apply_update', {
        p_user: person.user_id,
        p_task: taskId,
        p_action: cmd.kind,
        p_progress: cmd.kind === 'progress' ? cmd.percent : null,
        p_note: cmd.kind === 'accept' ? null : cmd.note,
        p_evidence: evidence,
    });
    if (error) {
        // Our own checks raise plain-language messages; anything else stays generic.
        const ours = error.code === 'P0001' || (error.code === '23514' && /proof/i.test(error.message));
        return ours ? error.message : 'Something went wrong saving that. Try again, or update it in the Pulse360 app.';
    }
    return `${result as string}\nSend *tasks* for your list.`;
}
