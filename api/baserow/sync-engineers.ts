import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAllRows } from '../_lib/baserow.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import {
    mapEngineer,
    DEFAULT_ROLE,
    ENGINEER_COMPANY_ID,
    type MappedEngineer,
} from '../_lib/mapEngineer.js';
import {
    authorizeSync,
    isAllowedMethod,
    isDryRun,
} from '../_lib/authorizeSync.js';

/**
 * Mirrors the Baserow "Engineers" table into Supabase users.
 *
 * Matching order is baserow_id, then email. An engineer who already has a
 * tracker account is linked, never overwritten — in particular their role and
 * primary key are left alone, so syncing cannot demote an admin or break their
 * login.
 *
 *   POST /api/baserow/sync-engineers            apply
 *   POST /api/baserow/sync-engineers?dry=1      report only
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAllowedMethod(req)) {
        return res.status(405).json({ error: 'Use GET (cron) or POST' });
    }

    const auth = authorizeSync(req);
    if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
    }

    const dryRun = isDryRun(req);

    try {
        const db = supabaseAdmin();
        const rows = await listAllRows('engineers');
        const mapped = rows.map(mapEngineer);

        const { data: users, error: readErr } = await db
            .from('users')
            .select('id, email, name, phone, role, baserow_id');
        if (readErr) throw new Error(`Supabase user read failed: ${readErr.message}`);

        type ExistingUser = {
            id: string;
            email: string;
            name: string;
            phone: string | null;
            role: string;
            baserow_id: number | null;
        };
        const existing = (users ?? []) as unknown as ExistingUser[];

        const byBaserowId = new Map(
            existing.filter((u) => u.baserow_id !== null).map((u) => [u.baserow_id!, u]),
        );
        const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

        const toInsert: Record<string, unknown>[] = [];
        const toLink: { id: string; engineer: MappedEngineer }[] = [];
        let alreadyLinked = 0;

        for (const eng of mapped) {
            const prev =
                byBaserowId.get(eng.baserow_id) ?? byEmail.get(eng.email.toLowerCase());

            if (!prev) {
                toInsert.push({
                    // users.id has no default: normally it is supplied from
                    // auth.uid() at signup. Engineers have no auth account yet,
                    // so a placeholder key is generated here and later replaced
                    // by claim_user_profile() (the FKs cascade on update).
                    id: randomUUID(),
                    email: eng.email,
                    name: eng.name,
                    phone: eng.phone,
                    role: DEFAULT_ROLE,
                    company_id: ENGINEER_COMPANY_ID,
                    baserow_id: eng.baserow_id,
                });
                continue;
            }

            if (prev.baserow_id === eng.baserow_id && prev.phone === eng.phone) {
                alreadyLinked++;
                continue;
            }
            toLink.push({ id: prev.id, engineer: eng });
        }

        const placeholders = mapped.filter((e) => e.placeholderEmail).length;

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                baserowRows: mapped.length,
                wouldCreate: toInsert.length,
                wouldLinkExisting: toLink.length,
                alreadyLinked,
                placeholderEmails: placeholders,
                linkTargets: toLink.map((l) => l.engineer.email),
            });
        }

        if (toInsert.length > 0) {
            const { error } = await db.from('users').insert(toInsert);
            if (error) throw new Error(`Supabase insert failed: ${error.message}`);
        }

        // Linking updates only the Baserow-owned fields. id, role, email and
        // company_id are deliberately untouched on rows that already existed.
        for (const { id, engineer } of toLink) {
            const { error } = await db
                .from('users')
                .update({ baserow_id: engineer.baserow_id, phone: engineer.phone })
                .eq('id', id);
            if (error) throw new Error(`Supabase link failed: ${error.message}`);
        }

        return res.status(200).json({
            ok: true,
            baserowRows: mapped.length,
            created: toInsert.length,
            linkedExisting: toLink.length,
            alreadyLinked,
            placeholderEmails: placeholders,
        });
    } catch (err) {
        return res.status(502).json({ ok: false, error: (err as Error).message });
    }
}
