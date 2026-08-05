import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: "Missing Supabase env vars" });
  }

  try {
    const supabaseRes = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    if (!supabaseRes.ok) throw new Error(`HTTP ${supabaseRes.status}`);
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
