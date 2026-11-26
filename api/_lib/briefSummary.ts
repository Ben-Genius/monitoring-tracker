import Anthropic from '@anthropic-ai/sdk';

/**
 * Two or three plain sentences at the top of the morning brief, written by an
 * AI model from the same facts the email lists (briefFacts in morningBriefEmail.ts).
 *
 * Only for organisations whose admin turned it on (organizations.ai_summary),
 * because the facts include task titles, project names and people's names.
 *
 * Which model writes it, by environment variable:
 *   ANTHROPIC_API_KEY                       Claude (preferred)
 *   GEMINI_API_KEY + GEMINI_PAID=true       otherwise, Google Gemini via AI Studio
 *     GEMINI_MODEL                          optional, default gemini-3.5-flash-lite
 *
 * GEMINI_PAID must be set on purpose: on Google's free tier, Google uses what
 * it is sent to improve its products and people may review it, which the
 * privacy notice rules out. Only a key from a Google Cloud project with billing
 * turned on is excluded from that.
 *
 * Any failure returns null and the brief goes out without a summary: the
 * summary is a convenience, never a reason for the email to be late or missing.
 */

const CLAUDE_MODEL = 'claude-opus-5-5';
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 25_000;

const SYSTEM = `You write the opening lines of a morning brief for the leader of an organisation, often in Ghana or elsewhere in West Africa, who reads it on a phone before work.

From the facts you are given, write two or three short sentences, at most 70 words in all:
- Lead with what needs the reader today: anything urgent or blocked first, naming the task and who it is waiting on.
- Then one clause on the rest of the picture (stuck, overdue, not accepted), as counts unless one item stands out.
- If something finished or moved, end with it in a few words.
- If nothing needs attention, say so plainly in one sentence.

Use only the facts given. Do not guess causes, dates or names that are not there. Plain English, no greeting, no sign-off, no bullet points, no markdown, no emoji. Write numbers as digits.`;

type Written = { summary: string; model: string };

/** Which provider will write summaries with the current settings, for reports and logs. */
export function summaryProvider(): 'claude' | 'gemini' | null {
    if (process.env.ANTHROPIC_API_KEY) return 'claude';
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_PAID === 'true') return 'gemini';
    return null;
}

export async function writeBriefSummary(facts: string): Promise<Written | null> {
    const provider = summaryProvider();
    if (!provider) {
        if (process.env.GEMINI_API_KEY) console.error('AI summary skipped: GEMINI_API_KEY is set but GEMINI_PAID=true is not (see api/_lib/briefSummary.ts).');
        return null;
    }
    const input = `Facts for this morning:\n\n${facts}`;
    const written = provider === 'claude' ? await withClaude(input) : await withGemini(input);
    return written ? { ...written, summary: tidy(written.summary) } : null;
}

/** One paragraph, and short enough for the table (1200 characters). */
function tidy(text: string): string {
    const t = text.replace(/\s+/g, ' ').trim();
    return t.length > 1000 ? `${t.slice(0, 997).trimEnd()}…` : t;
}

// ── Claude ──────────────────────────────────────────────────────────────────

let anthropic: Anthropic | null = null;

async function withClaude(input: string): Promise<Written | null> {
    // Short timeout and one retry: this runs inside the 7am email job.
    anthropic ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    try {
        const response = await anthropic.beta.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 2000,
            output_config: { effort: 'low' },
            // If Claude declines (a safety classifier false positive), the API retries on a suitable model.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: SYSTEM,
            messages: [{ role: 'user', content: input }],
        });
        if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null;
        const text = response.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join(' ').trim();
        return text ? { summary: text, model: response.model } : null;
    } catch (err) {
        if (err instanceof Anthropic.APIError) console.error(`AI summary (Claude) failed: ${err.status ?? 'network'} ${err.message}`);
        else console.error('AI summary (Claude) failed:', err);
        return null;
    }
}

// ── Gemini (Google AI Studio, Interactions API) ─────────────────────────────

interface GeminiInteraction {
    status?: string;
    steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
    errors?: { code?: string | number; message?: string }[];
}

async function withGemini(input: string): Promise<Written | null> {
    const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
    try {
        const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
            method: 'POST',
            headers: {
                'x-goog-api-key': process.env.GEMINI_API_KEY!,
                'Content-Type': 'application/json',
                'Api-Revision': '2026-05-20',
            },
            body: JSON.stringify({
                model,
                system_instruction: SYSTEM,
                input,
                store: false, // nothing kept on Google's side for follow-up turns
                generation_config: { max_output_tokens: 1000, thinking_level: 'minimal' },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!resp.ok) {
            console.error(`AI summary (Gemini) failed: ${resp.status} ${(await resp.text()).slice(0, 300)}`);
            return null;
        }
        const data = (await resp.json()) as GeminiInteraction;
        // "incomplete" means it hit the token limit: the text may be cut off, so don't use it.
        if (data.status !== 'completed') {
            console.error(`AI summary (Gemini) not used: status ${data.status ?? 'unknown'}${data.errors?.length ? `, ${data.errors.map(e => e.message).join('; ')}` : ''}`);
            return null;
        }
        const text = (data.steps ?? [])
            .filter(s => s.type === 'model_output')
            .flatMap(s => s.content ?? [])
            .flatMap(c => (c.type === 'text' && c.text ? [c.text] : []))
            .join(' ')
            .trim();
        return text ? { summary: text, model } : null;
    } catch (err) {
        console.error('AI summary (Gemini) failed:', err);
        return null;
    }
}
