/**
 * The shared look of Commit's emails (invite, morning brief), matching the
 * public site: black and white, the Commit mark, small mono labels, red only
 * for work that can't wait. Tables and inline styles throughout, because
 * that is what Gmail, Outlook and Apple Mail reliably render.
 */

export const INK = '#0A0A0A';
export const MUTED = '#5E5E5E';
export const FAINT = '#8F8F8F';
export const LINE = '#E8E8E8';
export const TINT = '#FAFAFA';
export const RED = '#C9361E';
export const SANS = `font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
export const MONO = `font-family:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Small uppercase mono label. */
export const label = (text: string, color = MUTED) =>
    `<span style="${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${color}">${text}</span>`;

/** Black button that works in every client (the cell carries the colour for Outlook). */
export const button = (href: string, text: string) => `
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="border-radius:8px;background:${INK}">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 22px;${SANS};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px">${text} &rarr;</a>
  </td>
</tr></table>`;

/**
 * The whole email: grey page, Commit header with a label on the right, a white
 * card holding `body` (rows of `<tr><td class="px">`), then `footer` lines.
 */
export function emailShell(o: { title: string; preheader: string; label: string; origin: string; body: string; footer: string }): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<style>
  @media (max-width: 600px) {
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 26px !important; }
    .k { width: 96px !important; }
    .hero { font-size: 48px !important; }
    .sc { padding: 12px 8px !important; }
    .sc span { letter-spacing: .02em !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F4F4F4;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4">
  <tr><td align="center" style="padding:32px 12px">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:0 4px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle">
            <img src="${esc(o.origin)}/brand/commit-mark.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;border:0">
            <span style="${SANS};font-size:17px;font-weight:600;color:${INK};vertical-align:middle;padding-left:8px;letter-spacing:-.01em">Commit<span style="color:${FAINT}">.</span></span>
          </td>
          <td align="right" style="vertical-align:middle">${label(esc(o.label), FAINT)}</td>
        </tr></table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${LINE};border-radius:12px">
${o.body}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:20px 8px 0;${SANS};font-size:12px;line-height:1.7;color:${FAINT}">${o.footer}</td></tr>
      <tr><td style="padding:16px 8px 0;${MONO};font-size:11px;letter-spacing:.06em;color:${FAINT}">COMMIT &middot; PROJECTS PLANNED. WORK DONE. EVERYONE ACCOUNTABLE.</td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;
}
