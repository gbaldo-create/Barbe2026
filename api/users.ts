// Gestione utenti — solo amministratori
// GET  /api/users                                   → elenco utenti con consumi AI del mese
// POST /api/users {action:'create', username, displayName, role, password, ai}
// POST /api/users {action:'update', username, displayName?, role?, ai?, disabled?}
// POST /api/users {action:'reset-password', username, password}
// POST /api/users {action:'delete', username}
import { handler, readJson, send, fail, HttpError } from './_lib/http.js';
import { hashPassword } from './_lib/crypto.js';
import { can, envAdmin, monthKey, requireSession, ROLES, toPublic, updateDb, type Role, type UsersDb } from './_lib/auth.js';

const USERNAME = /^[a-z0-9._-]{2,32}$/;

function list(db: UsersDb) {
  const admin = envAdmin();
  const month = monthKey();
  const rows = [...(admin ? [admin] : []), ...db.users].map(u => ({
    ...toPublic(u, db),
    usage: db.usage[month]?.[u.username] || { calls: 0, inputTokens: 0, outputTokens: 0 },
  }));
  return {
    users: rows,
    month,
    warning: db.unreadable ? 'Il file utenti esiste ma non si può leggere: controlla che USERS_KEY su Vercel sia quella usata per crearlo.' : undefined,
  };
}

function parseAi(ai: any, fallback = { enabled: false, monthlyLimit: 50 }) {
  if (!ai || typeof ai !== 'object') return fallback;
  const limit = Math.max(0, Math.min(10000, Math.floor(Number(ai.monthlyLimit ?? fallback.monthlyLimit) || 0)));
  return { enabled: !!ai.enabled, monthlyLimit: limit };
}

function ensureAdminLeft(d: UsersDb) {
  if (!envAdmin() && !d.users.some(u => u.role === 'admin' && !u.disabled)) {
    throw new HttpError(400, 'Deve restare almeno un amministratore attivo');
  }
}

function parseRole(r: unknown): Role {
  if (!ROLES.includes(r as Role)) throw new HttpError(400, 'Ruolo non valido');
  return r as Role;
}

export default handler(async (req, res) => {
  const { user, db } = await requireSession(req);
  if (!can.manageUsers(user.role)) return fail(res, 403, 'Solo gli amministratori possono gestire gli utenti');

  if (req.method === 'GET') return send(res, 200, list(db));
  if (req.method !== 'POST') return fail(res, 405, 'Metodo non consentito');

  const body = await readJson<any>(req);
  const username = String(body.username || '').trim().toLowerCase();
  if (!USERNAME.test(username)) return fail(res, 400, 'Nome utente non valido: 2-32 caratteri tra lettere minuscole, numeri, . _ -');
  if (envAdmin()?.username === username) return fail(res, 400, "L'amministratore di emergenza si gestisce dalle variabili d'ambiente di Vercel");
  const now = new Date().toISOString();
  const by = user.username;

  if (body.action === 'create') {
    const password = String(body.password || '');
    if (password.length < 8) return fail(res, 400, 'La password deve avere almeno 8 caratteri');
    const role = parseRole(body.role);
    const passwordHash = await hashPassword(password);
    const next = await updateDb(d => {
      if (d.users.some(u => u.username === username)) throw new HttpError(409, 'Esiste già un utente con questo nome');
      d.users.push({
        username,
        displayName: String(body.displayName || username).trim().slice(0, 60) || username,
        role,
        passwordHash,
        ai: parseAi(body.ai),
        mustChangePassword: true,
        sessionVersion: 1,
        createdAt: now,
      });
      return d;
    }, `users: creato ${username} (${by})`);
    return send(res, 200, list(next));
  }

  if (body.action === 'update') {
    const role = body.role !== undefined ? parseRole(body.role) : undefined;
    const next = await updateDb(d => {
      const u = d.users.find(x => x.username === username);
      if (!u) throw new HttpError(404, 'Utente non trovato');
      if (body.displayName !== undefined) u.displayName = String(body.displayName).trim().slice(0, 60) || u.displayName;
      if (role) u.role = role;
      if (body.ai !== undefined) u.ai = parseAi(body.ai, u.ai);
      if (body.disabled !== undefined) {
        u.disabled = !!body.disabled;
        if (u.disabled) u.sessionVersion = (u.sessionVersion || 0) + 1; // chiude le sessioni aperte
      }
      u.updatedAt = now;
      ensureAdminLeft(d);
      return d;
    }, `users: modificato ${username} (${by})`);
    return send(res, 200, list(next));
  }

  if (body.action === 'reset-password') {
    const password = String(body.password || '');
    if (password.length < 8) return fail(res, 400, 'La password deve avere almeno 8 caratteri');
    const passwordHash = await hashPassword(password);
    const next = await updateDb(d => {
      const u = d.users.find(x => x.username === username);
      if (!u) throw new HttpError(404, 'Utente non trovato');
      u.passwordHash = passwordHash;
      u.mustChangePassword = true;
      u.sessionVersion = (u.sessionVersion || 0) + 1;
      delete u.failed; delete u.lockUntil;
      u.updatedAt = now;
      return d;
    }, `users: nuova password per ${username} (${by})`);
    return send(res, 200, list(next));
  }

  if (body.action === 'delete') {
    if (username === user.username) return fail(res, 400, 'Non puoi eliminare il tuo stesso utente');
    const next = await updateDb(d => {
      const before = d.users.length;
      d.users = d.users.filter(u => u.username !== username);
      if (d.users.length === before) throw new HttpError(404, 'Utente non trovato');
      ensureAdminLeft(d);
      return d;
    }, `users: eliminato ${username} (${by})`);
    return send(res, 200, list(next));
  }

  fail(res, 400, 'Azione non valida');
});
