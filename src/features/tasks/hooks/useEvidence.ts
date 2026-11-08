import { supabase } from '@/lib/supabase';

export type Evidence =
    | { kind: 'file'; path: string; name: string; type: string; size: number }
    | { kind: 'link'; url: string; name: string };

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ACCEPT = 'image/*,application/pdf,.docx,.xlsx';

const safeName = (n: string) => n.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-80);

/** Uploads files to the private task-evidence bucket under <taskId>/. */
export async function uploadEvidence(taskId: string, files: File[]): Promise<Evidence[]> {
    const out: Evidence[] = [];
    for (const f of files) {
        if (f.size > MAX_EVIDENCE_BYTES) throw new Error(`${f.name} is larger than 10 MB.`);
        const path = `${taskId}/${crypto.randomUUID()}-${safeName(f.name)}`;
        const { error } = await supabase.storage.from('task-evidence').upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (error) throw new Error(`Couldn't upload ${f.name}: ${error.message}`);
        out.push({ kind: 'file', path, name: f.name, type: f.type, size: f.size });
    }
    return out;
}

/** Opens a stored evidence file in a new tab via a short-lived signed link. */
export async function openEvidence(e: Evidence) {
    if (e.kind === 'link') { window.open(e.url, '_blank', 'noopener'); return; }
    const win = window.open('', '_blank');
    const { data, error } = await supabase.storage.from('task-evidence').createSignedUrl(e.path, 600);
    if (error || !data) { win?.close(); throw new Error(error?.message || 'File not found'); }
    if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
}

export function normaliseLink(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    try {
        const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        return u.hostname.includes('.') ? u.toString() : null;
    } catch { return null; }
}
