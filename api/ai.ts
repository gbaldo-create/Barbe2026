// POST /api/ai — inoltra la richiesta ad Anthropic con la chiave tenuta solo sul server.
// Controlla che l'utente abbia l'AI abilitata e non abbia superato il limite mensile; registra i consumi.
import { handler, readJson, send, fail } from './_lib/http.js';
import { monthKey, requireSession, updateDb } from './_lib/auth.js';

const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);
const MAX_TOKENS = 1500;

export default handler(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Metodo non consentito');
  const { user, db } = await requireSession(req);
  if (!user.ai?.enabled) return fail(res, 403, "L'AI non è abilitata per il tuo utente: chiedi all'amministratore");

  const month = monthKey();
  const limit = user.ai.monthlyLimit || 0;
  const used = db.usage[month]?.[user.username]?.calls || 0;
  if (limit > 0 && used >= limit) return fail(res, 429, `Hai raggiunto il limite di ${limit} richieste AI per questo mese`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(res, 503, 'AI non configurata sul server (manca ANTHROPIC_API_KEY)');

  const body = await readJson<any>(req);
  const model = String(body.model || '');
  if (!ALLOWED_MODELS.has(model)) return fail(res, 400, 'Modello non consentito');
  if (!Array.isArray(body.messages) || !body.messages.length) return fail(res, 400, 'Messaggi mancanti');

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS),
      messages: body.messages,
      ...(typeof body.system === 'string' ? { system: body.system } : {}),
    }),
  });
  const data: any = await upstream.json().catch(() => ({ error: { message: `Errore AI ${upstream.status}` } }));

  if (upstream.ok) {
    await updateDb(d => {
      d.usage[month] ||= {};
      const e = (d.usage[month][user.username] ||= { calls: 0, inputTokens: 0, outputTokens: 0 });
      e.calls += 1;
      e.inputTokens += data.usage?.input_tokens || 0;
      e.outputTokens += data.usage?.output_tokens || 0;
      return d;
    }, `ai usage (${user.username})`).catch(err => console.error('[ai] registrazione consumi fallita', err));
  }
  send(res, upstream.status, data);
});
