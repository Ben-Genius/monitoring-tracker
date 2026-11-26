import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed one-click unsubscribe links for the morning email. The signature
 * proves the link came from us, so nobody can turn off someone else's email
 * by guessing their user id. Fails closed: with no secret there is no link.
 */

function secret(): string | null {
    return process.env.BRIEF_EMAIL_SECRET ?? process.env.CRON_SECRET ?? null;
}

function sign(userId: string, key: string): string {
    return createHmac('sha256', key).update(`brief-unsubscribe:${userId}`).digest('base64url');
}

export function unsubscribeUrl(appUrl: string, userId: string): string | null {
    const key = secret();
    if (!key) return null;
    return `${appUrl}/api/brief-unsubscribe?u=${encodeURIComponent(userId)}&s=${sign(userId, key)}`;
}

export function verifyUnsubscribe(userId: unknown, signature: unknown): userId is string {
    const key = secret();
    if (!key || typeof userId !== 'string' || typeof signature !== 'string') return false;
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
    const expected = Buffer.from(sign(userId, key));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
}
