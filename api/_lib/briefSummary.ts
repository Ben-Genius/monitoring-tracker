import Anthropic from '@anthropic-ai/sdk';

/**
 * Two or three plain sentences at the top of the morning brief, written by
 * Claude from the same facts the email lists (briefFacts in morningBriefEmail.ts).
 *
 * Only for organisations whose admin turned it on (organizations.ai_summary),
 * because the facts include task titles, project names and people's names.
 * Any failure returns null and the brief goes out without a summary: the
 * summary is a convenience, never a reason for the email to be late or missing.
 */

export const SUMMARY_MODEL = 'claude-opus-5-5';

const SYSTEM = `You write the opening lines of a morning brief for the leader of an organisation, often in Ghana or elsewhere in West Africa, who reads it on a phone before work.

From the facts you are given, write two or three short sentences, at most 70 words in all:
- Lead with what needs the reader today: anything urgent or blocked first, naming the task and who it is waiting on.
- Then one clause on the rest of the picture (stuck, overdue, not accepted), as counts unless one item stands out.
- If something finished or moved, end with it in a few words.
- If nothing needs attention, say so plainly in one sentence.

Use only the facts given. Do not guess causes, dates or names that are not there. Plain English, no greeting, no sign-off, no bullet points, no markdown, no emoji. Write numbers as digits.`;

let client: Anthropic | null = null;

export async function writeBriefSummary(facts: string): Promise<{ summary: string; model: string } | null> {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    // Short timeout and one retry: this runs inside the 7am email job.
    client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 });

    try {
        const response = await client.beta.messages.create({
            model: SUMMARY_MODEL,
            max_tokens: 2000,
            output_config: { effort: 'low' },
            // If Claude declines (a safety classifier false positive), the API retries on a suitable model.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: SYSTEM,
            messages: [{ role: 'user', content: `Facts for this morning:\n\n${facts}` }],
        });

        if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null;
        const text = response.content
            .flatMap(b => (b.type === 'text' ? [b.text] : []))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return null;
        // Guard the stored length (the table allows 1200 characters).
        return { summary: text.length > 1000 ? `${text.slice(0, 997).trimEnd()}…` : text, model: response.model };
    } catch (err) {
        if (err instanceof Anthropic.APIError) {
            console.error(`AI summary failed: ${err.status ?? 'network'} ${err.message}`);
        } else {
            console.error('AI summary failed:', err);
        }
        return null;
    }
}
