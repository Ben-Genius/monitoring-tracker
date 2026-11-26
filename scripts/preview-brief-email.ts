/**
 * Renders the 7am morning email with sample tasks, without sending anything.
 *
 *   node -e "require('esbuild').buildSync({entryPoints:['scripts/preview-brief-email.ts'],bundle:true,platform:'node',format:'esm',outfile:'out/preview.mjs'})"
 *   node out/preview.mjs out
 *
 * Writes brief.html, quiet.html and brief.txt to that folder.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMorningBrief, type EmailTask } from '../api/_lib/morningBriefEmail.js';

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();
const base: Omit<EmailTask, 'id' | 'title'> = {
    stage: 'in_progress', due_date: null, blocker_description: null, progress_percent: 50,
    acknowledged_at: ago(5), next_update_due: null, last_movement_at: ago(0.2), is_urgent: false,
    assignee_id: 'a', completed_at: null, project: { name: 'Warehouse extension' }, owner: { name: 'Kofi Mensah' }, blocker: null,
};
const tasks: EmailTask[] = [
    { ...base, id: '1', title: 'Fire inspection before handover', is_urgent: true, progress_percent: 25 },
    { ...base, id: '2', title: 'Steel delivery for the roof', stage: 'blockers', blocker: { name: 'Ama Owusu' }, blocker_description: 'Supplier wants the deposit first' },
    { ...base, id: '3', title: 'Electrical drawings sign-off', last_movement_at: ago(4), owner: { name: 'Yaw Boateng' } },
    { ...base, id: '4', title: 'Site survey report', stage: 'yet_to_start', due_date: ago(3), owner: { name: 'Ama Owusu' } },
    { ...base, id: '5', title: 'Hire two site supervisors', stage: 'yet_to_start', acknowledged_at: null },
    { ...base, id: '6', title: 'Order safety signage', progress_percent: 75 },
    { ...base, id: '7', title: 'Pour the foundation', stage: 'completed', completed_at: ago(0.3), progress_percent: 100 },
];
const opts = { appUrl: 'https://app.example', unsubscribeUrl: 'https://app.example/api/brief-unsubscribe?u=x&s=y', dateLabel: 'Wednesday 25 November', now };
const out = process.argv[2] ?? '.';
mkdirSync(out, { recursive: true });
const full = renderMorningBrief({ name: 'Mr Kwame Blay', org_name: 'Asante Holdings' }, tasks, opts);
const quiet = renderMorningBrief({ name: 'Ama Owusu', org_name: 'Asante Holdings' }, tasks.filter(t => ['6', '7'].includes(t.id)), opts);
writeFileSync(join(out, 'brief.html'), full.html);
writeFileSync(join(out, 'brief.txt'), `Subject: ${full.subject}\n\n${full.text}`);
writeFileSync(join(out, 'quiet.html'), quiet.html);
console.log(full.subject);
console.log(quiet.subject);
