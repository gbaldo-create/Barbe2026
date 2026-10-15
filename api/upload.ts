// POST /api/upload { fileName, data } — carica una foto in public/images (data = data URL o base64)
import { handler, readJson, send, fail } from './_lib/http.js';
import { can, requireSession } from './_lib/auth.js';
import { publicImageUrl, readFile, writeFile } from './_lib/store.js';

const MAX_BYTES = 4 * 1024 * 1024;
const EXT = /\.(jpe?g|png|webp|gif)$/i;

export default handler(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Metodo non consentito');
  const { user } = await requireSession(req);
  if (!can.upload(user.role)) return fail(res, 403, 'Non hai i permessi per caricare foto');

  const body = await readJson<any>(req);
  const raw = String(body.data || '');
  const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
  const buf = Buffer.from(base64, 'base64');
  if (!buf.length) return fail(res, 400, 'Immagine vuota');
  if (buf.length > MAX_BYTES) return fail(res, 413, 'Immagine troppo grande (max 4 MB)');

  let name = String(body.fileName || `${Date.now()}.jpg`).split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  if (!EXT.test(name)) name += '.jpg';
  let repoPath = `public/images/${name}`;
  if ((await readFile(repoPath)).content) repoPath = `public/images/${Date.now()}-${name}`; // non sovrascrive foto esistenti

  await writeFile(repoPath, buf, `upload image ${name} (${user.username})`, null);
  send(res, 200, { url: publicImageUrl(repoPath) });
});
