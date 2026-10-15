// GET  /api/auth                         → utente collegato (o null)
// POST /api/auth {action:'login', username, password}
// POST /api/auth {action:'logout'}
// POST /api/auth {action:'change-password', current, next}
import { handler, readJson, send, fail } from './_lib/http.js';
import { hashPassword, verifyPassword } from './_lib/crypto.js';
import {
  checkEnvAdminPassword, endSession, findUser, getSession, loadDb, requireSession, startSession, toPublic, updateDb,
} from './_lib/auth.js';

const MAX_FAILED = 8;
const LOCK_MINUTES = 15;
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

export default handler(async (req, res) => {
  if (req.method === 'GET') {
    const s = await getSession(req);
    return send(res, 200, { user: s ? toPublic(s.user, s.db) : null });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Metodo non consentito');

  const body = await readJson<any>(req);

  if (body.action === 'logout') {
    endSession(req, res);
    return send(res, 200, { ok: true });
  }

  if (body.action === 'login') {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!username || !password) return fail(res, 400, 'Inserisci nome utente e password');

    const db = await loadDb();
    const user = findUser(db, username);
    const wrong = async () => { await pause(400); fail(res, 401, 'Nome utente o password errati'); };

    if (!user) return wrong();
    if (user.builtin) {
      if (!checkEnvAdminPassword(password)) return wrong();
      startSession(req, res, user);
      return send(res, 200, { user: toPublic(user, db) });
    }
    if (user.disabled) return fail(res, 403, 'Utente disattivato');
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const min = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return fail(res, 429, `Troppi tentativi: riprova tra ${min} minuti`);
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      await updateDb(d => {
        const u = d.users.find(x => x.username === user.username);
        if (u) {
          u.failed = (u.failed || 0) + 1;
          if (u.failed >= MAX_FAILED) { u.lockUntil = Date.now() + LOCK_MINUTES * 60000; u.failed = 0; }
        }
        return d;
      }, `auth: tentativo fallito (${user.username})`).catch(() => {});
      return wrong();
    }
    if (user.failed || user.lockUntil) {
      await updateDb(d => {
        const u = d.users.find(x => x.username === user.username);
        if (u) { delete u.failed; delete u.lockUntil; }
        return d;
      }, `auth: accesso (${user.username})`).catch(() => {});
    }
    startSession(req, res, user);
    return send(res, 200, { user: toPublic(user, db) });
  }

  if (body.action === 'change-password') {
    const { user } = await requireSession(req);
    if (user.builtin) return fail(res, 400, "La password dell'amministratore di emergenza si cambia nelle variabili d'ambiente di Vercel");
    const next = String(body.next || '');
    if (next.length < 8) return fail(res, 400, 'La nuova password deve avere almeno 8 caratteri');
    if (!(await verifyPassword(String(body.current || ''), user.passwordHash))) return fail(res, 401, 'Password attuale errata');
    const passwordHash = await hashPassword(next);
    const db = await updateDb(d => {
      const u = d.users.find(x => x.username === user.username);
      if (u) {
        u.passwordHash = passwordHash;
        u.sessionVersion = (u.sessionVersion || 0) + 1;
        u.mustChangePassword = false;
        u.updatedAt = new Date().toISOString();
      }
      return d;
    }, `users: cambio password (${user.username})`);
    const updated = db.users.find(x => x.username === user.username)!;
    startSession(req, res, updated);
    return send(res, 200, { user: toPublic(updated, db) });
  }

  fail(res, 400, 'Azione non valida');
});
