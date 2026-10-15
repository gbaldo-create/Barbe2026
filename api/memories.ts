// GET /api/memories — tutti i ricordi, compresi quelli privati (solo utenti collegati).
// Alla prima chiamata sposta nel file cifrato i ricordi privati rimasti in data/memories.json.
import { handler, send, fail } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';
import { loadAllMemories, updateMemories } from './_lib/memories.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'Metodo non consentito');
  const { user } = await requireSession(req);
  const { memories, needsMigration } = await loadAllMemories();
  if (needsMigration) {
    const moved = await updateMemories(all => all, `memories: ricordi privati spostati nel file cifrato (${user.username})`);
    return send(res, 200, { memories: moved });
  }
  send(res, 200, { memories });
});
