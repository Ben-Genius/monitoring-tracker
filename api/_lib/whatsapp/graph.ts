import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The WhatsApp Business Cloud API (Meta Graph API).
 *
 * Env: WHATSAPP_TOKEN (system-user access token), WHATSAPP_PHONE_NUMBER_ID,
 * WHATSAPP_APP_SECRET (signs incoming webhooks), optional WHATSAPP_GRAPH_VERSION.
 */
const version = () => process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';
const graph = (path: string) => `https://graph.facebook.com/${version()}/${path}`;

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

/** True if the body was signed by Meta with our app secret. Fails closed without a secret. */
export function signatureIsValid(rawBody: Buffer, header: string | undefined): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !header?.startsWith('sha256=')) return false;
    const expected = Buffer.from('sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex'));
    const given = Buffer.from(header);
    return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Replies within the 24-hour window the person's own message opened (no template needed). */
export async function sendText(to: string, body: string): Promise<void> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) throw new Error('WhatsApp sending is not configured');
    const res = await fetch(graph(`${phoneId}/messages`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: body.slice(0, 4000), preview_url: false } }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status}`);
}

/** Downloads a photo or document the person sent. */
export async function downloadMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WhatsApp is not configured');
    const meta = await fetch(graph(mediaId), { headers: { Authorization: `Bearer ${token}` } });
    if (!meta.ok) throw new Error(`media lookup failed: ${meta.status}`);
    const info = await meta.json() as { url?: string; mime_type?: string; file_size?: number };
    if (!info.url) throw new Error('media has no url');
    if ((info.file_size ?? 0) > MAX_MEDIA_BYTES) throw new Error('media too large');
    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!file.ok) throw new Error(`media download failed: ${file.status}`);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_MEDIA_BYTES) throw new Error('media too large');
    return { bytes, mime: info.mime_type ?? 'application/octet-stream' };
}
