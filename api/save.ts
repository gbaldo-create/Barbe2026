// POST /api/save — salva oggetti, ricordi o impostazioni con controllo dei permessi.
// Oggetti e ricordi: il client invia solo le modifiche { upserts, deletes } e il server le
// applica all'ultima versione del file, così due persone che salvano insieme non si sovrascrivono.
import { handler, readJson, send, fail, HttpError } from './_lib/http.js';
import { can, ownsMemory, requireSession } from './_lib/auth.js';
import { updateJson } from './_lib/store.js';
import { updateMemories } from './_lib/memories.js';

type Rec = { id: string; [k: string]: unknown };

function cleanList(list: unknown, max = 2000): Rec[] {
  if (!Array.isArray(list)) return [];
  if (list.length > max) throw new HttpError(400, 'Troppi elementi');
  return list.map((x: any) => {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id) throw new HttpError(400, 'Elemento senza id');
    const { isFavorite, ...rest } = x; // i preferiti restano nel browser
    return rest as Rec;
  });
}

const cleanIds = (list: unknown) => (Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);

function apply(current: Rec[], upserts: Rec[], deletes: string[]): Rec[] {
  const del = new Set(deletes);
  const map = new Map(upserts.map(u => [u.id, u]));
  const out = current.filter(x => !del.has(x.id)).map(x => (map.has(x.id) ? map.get(x.id)! : x));
  const existing = new Set(out.map(x => x.id));
  for (const u of upserts) if (!existing.has(u.id) && !del.has(u.id)) out.push(u);
  return out;
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Metodo non consentito');
  const { user } = await requireSession(req);
  const body = await readJson<any>(req);
  const who = user.username;

  if (body.file === 'items') {
    if (!can.editItems(user.role)) return fail(res, 403, 'Non hai i permessi per modificare il catalogo');
    const upserts = cleanList(body.upserts);
    const deletes = cleanIds(body.deletes);
    const items = await updateJson<Rec[]>('data/items.json', [], cur => apply(cur, upserts, deletes), `update catalog (${who})`);
    return send(res, 200, { ok: true, items });
  }

  if (body.file === 'memories') {
    if (!can.writeOwnMemories(user.role)) return fail(res, 403, 'Non hai i permessi per scrivere ricordi');
    const upserts = cleanList(body.upserts);
    const deletes = cleanIds(body.deletes);
    const full = can.editAllMemories(user.role);
    const memories = await updateMemories(cur => {
      const byId = new Map(cur.map(m => [m.id, m]));
      for (const u of upserts) {
        const old = byId.get(u.id) as any;
        if (!full) {
          if (old && !ownsMemory(old, user)) throw new HttpError(403, 'Puoi modificare solo i tuoi ricordi');
          // la copertina (pinned) la scelgono solo editor e amministratori
          if (old && 'pinned' in old) u.pinned = old.pinned; else delete u.pinned;
        } else if (old && !('pinned' in u) && 'pinned' in old) {
          u.pinned = old.pinned; // il form di modifica non conosce il campo: lo conserviamo
        }
        if (old?.createdBy) u.createdBy = old.createdBy;
        else if (!old) u.createdBy = who;
      }
      if (!full) {
        for (const id of deletes) {
          const old = byId.get(id) as any;
          if (old && !ownsMemory(old, user)) throw new HttpError(403, 'Puoi eliminare solo i tuoi ricordi');
        }
      }
      return apply(cur as Rec[], upserts, deletes);
    }, `update memories (${who})`);
    return send(res, 200, { ok: true, memories });
  }

  if (body.file === 'settings') {
    if (!can.editSettings(user.role)) return fail(res, 403, 'Solo gli amministratori possono cambiare le impostazioni');
    const patch = body.settings && typeof body.settings === 'object' ? body.settings : {};
    const allowed = ['heroImageUrl'];
    const settings = await updateJson<Record<string, unknown>>('data/settings.json', {}, cur => {
      const next = { ...cur };
      for (const k of allowed) if (k in patch) next[k] = patch[k];
      return next;
    }, `update settings (${who})`);
    return send(res, 200, { ok: true, settings });
  }

  fail(res, 400, 'File non valido');
});
