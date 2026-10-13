// Server-side Data Investigator. The OpenAI key lives only here, in Vercel env vars,
// and never reaches the browser. The client sends a question and a week; the server
// loads the chart data itself, so the endpoint can't be used as a general AI proxy.
import { createClient } from '@supabase/supabase-js';

type Req = { method?: string; body?: any; headers: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => Res; json: (body: unknown) => void; setHeader: (k: string, v: string) => void };

const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
const MAX_QUESTION = 500;
const RATE_LIMIT = 20; // requests per IP per window (best effort; resets when the function cold-starts)
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const GREEN = '#10b981';
const BLUE = '#0ea5e9';
const GOLD = '#f59e0b';

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

const pct = (v: number | null) => (v === null || v === undefined ? 'n/a' : `${v}%`);

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'The Investigator is not configured yet.' });
  }

  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many questions. Try again in a few minutes.' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const week = typeof body.week === 'string' ? body.week : '';
  const selectedSongId = typeof body.selectedSongId === 'string' ? body.selectedSongId : null;

  if (!question) return res.status(400).json({ error: 'Ask a question about the chart.' });
  if (question.length > MAX_QUESTION) return res.status(400).json({ error: `Keep questions under ${MAX_QUESTION} characters.` });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return res.status(400).json({ error: 'Pick a chart week first.' });

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('chart_entries')
    .select(
      'song_id, rank, points, streaming_vol, streaming_pct, airplay_vol, airplay_pct, sales_vol, sales_pct, prev_rank, weeks_on_chart, peak_position, songs ( title, song_artists ( display_order, artists ( name ) ) )'
    )
    .eq('chart_week', week)
    .order('rank', { ascending: true });

  if (error) return res.status(500).json({ error: 'Could not load chart data.' });
  if (!data || !data.length) return res.status(404).json({ error: 'No chart data for that week.' });

  const rows = (data as any[]).map((e) => {
    const artists = [...(e.songs?.song_artists || [])]
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((sa: any) => sa.artists?.name)
      .filter(Boolean)
      .join(', ');
    const s = e.streaming_pct, a = e.airplay_pct, l = e.sales_pct;
    const dominant =
      s == null || a == null || l == null ? 'UNKNOWN' : s >= a && s >= l ? 'STREAMING' : a >= l ? 'AIRPLAY' : 'SALES';
    return {
      songId: e.song_id,
      rank: e.rank,
      title: e.songs?.title || 'Unknown',
      artist: artists || 'Unknown',
      points: e.points,
      streaming: e.streaming_vol,
      streamingPct: s,
      airplay: e.airplay_vol,
      airplayPct: a,
      sales: e.sales_vol,
      salesPct: l,
      prevRank: e.prev_rank,
      woc: e.weeks_on_chart,
      peak: e.peak_position,
      dominantMetric: dominant,
    };
  });
  const rankBy = (key: 'streaming' | 'airplay' | 'sales') => {
    const order = [...rows].sort((x, y) => (y[key] || 0) - (x[key] || 0)).map((r) => r.songId);
    return (id: string) => order.indexOf(id) + 1;
  };
  const strRank = rankBy('streaming'), airRank = rankBy('airplay'), salRank = rankBy('sales');
  const context = rows.map(({ songId, ...r }) => ({
    ...r,
    streamingRank: strRank(songId),
    airplayRank: airRank(songId),
    salesRank: salRank(songId),
  }));
  const selected = selectedSongId ? context[rows.findIndex((r) => r.songId === selectedSongId)] : undefined;

  const system = `You are the Data Investigator for SoundIntel BI, a Hot 100 industry projections dashboard.
Use ONLY the data provided below. Never guess or invent numbers. Only answer questions about this chart data;
if the question is unrelated, say you can only discuss this week's chart.

QUERY RULES
1. If the user names a specific song, analyze that song from the full chart data.
2. If the user says "it", "the song" or "this track", use the selected song.
3. For comparisons or rankings, use the full chart data.

CONTEXT
Week: ${week}
Selected song: ${selected ? `"${selected.title}" by ${selected.artist}` : 'None'}
${selected ? `Rank #${selected.rank}, ${selected.points} points. Streaming ${selected.streaming} (${pct(selected.streamingPct)}, #${selected.streamingRank}). Airplay ${selected.airplay} (${pct(selected.airplayPct)}, #${selected.airplayRank}). Sales ${selected.sales} (${pct(selected.salesPct)}, #${selected.salesRank}). Dominant: ${selected.dominantMetric}. Previous: ${selected.prevRank ? '#' + selected.prevRank : 'NEW'}. Weeks on chart: ${selected.woc}. Peak: #${selected.peak}.` : ''}

FULL CHART DATA (${context.length} songs)
${JSON.stringify(context)}

ANALYSIS RULES
- Dominant metric is the highest percentage share.
- "Streaming-driven" means streaming above 60%, "airplay-driven" means airplay above 40%, otherwise "balanced" (only if all three shares exist).
- If shares are missing, say so and skip mix labels.
- Cite specific numbers when comparing songs.
- Peak is the song's best historical rank. WoC is weeks on chart. A previous rank of 0 or null means new this week.

Respond with JSON only, in this shape:
{"text": "analysis citing actual numbers", "visual": {"type": "bar-chart", "title": "Chart title", "data": [{"name": "Streaming", "value": 0, "color": "${GREEN}"}, {"name": "Airplay", "value": 0, "color": "${BLUE}"}, {"name": "Sales", "value": 0, "color": "${GOLD}"}]}, "rationale": "what the numbers suggest"}`;

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        instructions: system,
        input: question,
        max_output_tokens: 900,
        text: { format: { type: 'json_object' } },
      }),
    });
    const payload: any = await r.json();
    if (!r.ok) {
      console.error('OpenAI error', r.status, payload?.error?.message);
      return res.status(502).json({ error: 'The Investigator is unavailable right now.' });
    }
    const text = (payload.output || [])
      .flatMap((o: any) => (o.type === 'message' ? o.content || [] : []))
      .filter((c: any) => c.type === 'output_text')
      .map((c: any) => c.text)
      .join('');
    const result = safeJson(text);
    if (!result || typeof result.text !== 'string') {
      return res.status(502).json({ error: 'The Investigator returned an unreadable answer. Try rephrasing.' });
    }
    return res.status(200).json({ text: result.text, visual: result.visual ?? null, rationale: result.rationale ?? '' });
  } catch (err) {
    console.error('Investigator failed', err);
    return res.status(502).json({ error: 'The Investigator is unavailable right now.' });
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
