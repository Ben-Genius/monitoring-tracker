import { button, emailShell, esc, FAINT, INK, label, LINE, MONO, MUTED, SANS, TINT } from './emailStyle.js';

/** The invite email, in the shared Commit email look (emailStyle.ts). */

export interface InviteEmailInput {
    /** Recipient's first name. */
    first: string;
    email: string;
    role: string;
    company: string | null;
    inviter: string | null;
    link: string;
    /** e.g. "3 December". */
    until: string;
    /** Site origin, for the logo and privacy link. */
    origin: string;
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin', executive: 'Executive', pa: 'Executive PA', lead: 'Project lead', employee: 'Staff',
};

/** What the role lets them do, in the second person (mirrors src/features/users/utils/people.ts). */
const ROLE_CAN: Record<string, string> = {
    admin: 'You’ll see the whole organisation, invite people, change settings and approve work.',
    executive: 'You’ll see the whole organisation and read the brief your PA prepares each morning.',
    pa: 'You’ll see the whole organisation, prepare the daily brief and chase tasks for leadership.',
    lead: 'You’ll create and assign tasks for your team and approve work when it’s done.',
    employee: 'You’ll see the tasks given to you and post updates and proof, from the app or WhatsApp.',
};

export const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

export function renderInviteEmail(i: InviteEmailInput): { subject: string; text: string; html: string } {
    const role = roleLabel(i.role);
    const team = i.company ?? 'your team';
    const can = ROLE_CAN[i.role] ?? '';
    const who = i.inviter ? `${i.inviter} has invited you` : 'You’ve been invited';
    const subject = i.company ? `Join ${i.company} on Commit` : 'You’ve been invited to Commit';
    const preheader = `${who} to join ${team} as ${role}. Set up your login by ${i.until}.`;

    const text = [
        `Hi ${i.first},`,
        '',
        `${who} to join ${team} on Commit as ${role}.${can ? ` ${can}` : ''}`,
        '',
        `Set up your login: ${i.link}`,
        `The link works until ${i.until}, and only once. Sign in with ${i.email}.`,
        '',
        `Not expecting this? Ignore it: nothing happens unless you choose a password.`,
        `How Commit handles your data: ${i.origin}/privacy`,
    ].join('\n');

    const row = (k: string, v: string, last = false) => `
              <tr>
                <td class="k" style="padding:12px 16px;${last ? '' : `border-bottom:1px solid ${LINE};`}${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${FAINT};width:120px;vertical-align:top">${k}</td>
                <td style="padding:12px 16px;${last ? '' : `border-bottom:1px solid ${LINE};`}${SANS};font-size:14px;color:${INK};vertical-align:top">${v}</td>
              </tr>`;

    const body = `
      <tr><td class="px" style="padding:40px 40px 8px">
        <p style="margin:0">${label('You’re invited')}</p>
        <h1 class="h1" style="margin:14px 0 0;${SANS};font-size:30px;line-height:1.12;font-weight:600;letter-spacing:-.03em;color:${INK}">Join ${esc(team)} on Commit</h1>
        <p style="margin:20px 0 0;${SANS};font-size:16px;line-height:1.6;color:${INK}">Hi ${esc(i.first)},</p>
        <p style="margin:8px 0 0;${SANS};font-size:16px;line-height:1.6;color:${MUTED}">${esc(who)} as <strong style="color:${INK};font-weight:600">${esc(role)}</strong>.${can ? ` ${esc(can)}` : ''}</p>
      </td></tr>
      <tr><td class="px" style="padding:28px 40px 0">${button(i.link, 'Set up your login')}</td></tr>
      <tr><td class="px" style="padding:28px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;background:${TINT}">
          ${row('Team', esc(team))}
          ${row('Role', esc(role))}
          ${row('Sign in with', `<span style="${MONO};font-size:13px">${esc(i.email)}</span>`)}
          ${row('Link expires', `${esc(i.until)} &middot; works once`, true)}
        </table>
      </td></tr>
      <tr><td class="px" style="padding:24px 40px 36px">
        <p style="margin:0;${SANS};font-size:13px;line-height:1.6;color:${MUTED}">Button not working? Paste this into your browser:</p>
        <p style="margin:6px 0 0;${MONO};font-size:12px;line-height:1.6;color:${INK};word-break:break-all"><a href="${esc(i.link)}" style="color:${INK};text-decoration:underline">${esc(i.link)}</a></p>
      </td></tr>`;

    const html = emailShell({
        title: subject, preheader, label: 'Invitation', origin: i.origin, body,
        footer: `Not expecting this? You can ignore it: nothing happens unless you choose a password.<br>
        How Commit handles your data: <a href="${esc(i.origin)}/privacy" style="color:${MUTED};text-decoration:underline">privacy notice</a>.`,
    });

    return { subject, text, html };
}
