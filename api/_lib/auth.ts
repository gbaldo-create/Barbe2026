// Utenti, ruoli, sessioni e consumi AI
import { decryptJson, encryptJson, safeEqual, signToken, verifyToken } from './crypto.js';
import { readFile, updateFile } from './store.js';
import { HttpError, parseCookies, setCookie, type Req, type Res } from './http.js';

export type Role = 'admin' | 'editor' | 'autore' | 'famiglia';
export const ROLES: Role[] = ['admin', 'editor', 'autore', 'famiglia'];

export interface StoredUser {
  username: string;
  displayName: string;
  role: Role;
  passwordHash: string;
  ai: { enabled: boolean; monthlyLimit: number }; // monthlyLimit 0 = senza limite
  disabled?: boolean;
  mustChangePassword?: boolean;
  sessionVersion: number;
  failed?: number;
  lockUntil?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UsageEntry { calls: number; inputTokens: number; outputTokens: number }

export interface UsersDb {
  users: StoredUser[];
  usage: Record<string, Record<string, UsageEntry>>; // { "2026-10": { username: {...} } }
  unreadable?: boolean; // file presente ma non decifrabile (USERS_KEY diversa)
}

export interface PublicUser {
  username: string;
  displayName: string;
  role: Role;
  ai: { enabled: boolean; monthlyLimit: number; used: number };
  builtin?: boolean;
  disabled?: boolean;
  mustChangePassword?: boolean;
}

export const USERS_PATH = 'data/private/users.enc.json';
const COOKIE = 'b2026_session';
const SESSION_DAYS = 30;

function secret(name: 'SESSION_SECRET' | 'USERS_KEY'): string {
  const v = process.env[name];
  if (!v || v.length < 24) throw new Error(`${name} mancante o troppo corto (min 24 caratteri) nelle variabili d'ambiente`);
  return v;
}

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

const emptyDb = (): UsersDb => ({ users: [], usage: {} });
const decodeDb = (buf: Buffer | null): UsersDb => {
  if (!buf || !buf.length) return emptyDb();
  let db: UsersDb;
  try { db = decryptJson<UsersDb>(buf.toString('utf8'), secret('USERS_KEY')); }
  catch { throw new HttpError(500, 'Il file utenti non si può leggere: USERS_KEY su Vercel è diversa da quella con cui è stato creato'); }
  return { users: db.users || [], usage: db.usage || {} };
};
const encodeDb = (db: UsersDb) => encryptJson({ users: db.users, usage: db.usage }, secret('USERS_KEY'), 'Utenti e consumi AI, cifrati: leggibili solo dal server con USERS_KEY.') + '\n';

export async function loadDb(): Promise<UsersDb> {
  const buf = (await readFile(USERS_PATH)).content;
  try { return decodeDb(buf); }
  catch (e) {
    // Chiave sbagliata: l'amministratore di emergenza deve poter entrare lo stesso per accorgersene
    console.error('[auth] impossibile decifrare il file utenti: USERS_KEY diversa da quella usata per crearlo', e);
    return { ...emptyDb(), unreadable: true };
  }
}

export function updateDb(mutate: (db: UsersDb) => UsersDb | Promise<UsersDb>, message: string) {
  return updateFile<UsersDb>(USERS_PATH, decodeDb, encodeDb, mutate, message);
}

// ── Amministratore di emergenza definito nelle variabili d'ambiente ─────────
export function envAdmin(): (StoredUser & { builtin: true }) | null {
  const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || password.length < 10) return null;
  return {
    username,
    displayName: process.env.ADMIN_DISPLAY_NAME || 'Amministratore',
    role: 'admin',
    passwordHash: '',
    ai: { enabled: true, monthlyLimit: 0 },
    sessionVersion: 0,
    createdAt: '',
    builtin: true,
  };
}

export function checkEnvAdminPassword(password: string) {
  return safeEqual(password, process.env.ADMIN_PASSWORD || '\u0000');
}

export function findUser(db: UsersDb, username: string): (StoredUser & { builtin?: boolean }) | null {
  const u = username.trim().toLowerCase();
  const admin = envAdmin();
  if (admin && admin.username === u) return admin;
  return db.users.find(x => x.username === u) || null;
}

export function toPublic(u: StoredUser & { builtin?: boolean }, db: UsersDb): PublicUser {
  return {
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    ai: { enabled: !!u.ai?.enabled, monthlyLimit: u.ai?.monthlyLimit || 0, used: db.usage[monthKey()]?.[u.username]?.calls || 0 },
    builtin: u.builtin || undefined,
    disabled: u.disabled || undefined,
    mustChangePassword: u.mustChangePassword || undefined,
  };
}

// ── Sessione ────────────────────────────────────────────────────────────────
interface SessionPayload { u: string; sv: number; exp: number }

export function startSession(req: Req, res: Res, user: StoredUser) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  setCookie(res, req, COOKIE, signToken({ u: user.username, sv: user.sessionVersion || 0, exp }, secret('SESSION_SECRET')), SESSION_DAYS * 86400);
}

export function endSession(req: Req, res: Res) {
  setCookie(res, req, COOKIE, '', 0);
}

export async function getSession(req: Req): Promise<{ user: StoredUser & { builtin?: boolean }; db: UsersDb } | null> {
  const payload = verifyToken<SessionPayload>(parseCookies(req)[COOKIE], secret('SESSION_SECRET'));
  if (!payload || payload.exp < Date.now()) return null;
  const db = await loadDb();
  const user = findUser(db, payload.u);
  if (!user || user.disabled || (user.sessionVersion || 0) !== payload.sv) return null;
  return { user, db };
}

export async function requireSession(req: Req) {
  const s = await getSession(req);
  if (!s) throw new HttpError(401, 'Sessione scaduta: accedi di nuovo');
  return s;
}

// ── Permessi (stessa tabella usata dal frontend in src/api.ts) ─────────────
export const can = {
  editItems: (r: Role) => r === 'admin' || r === 'editor',
  editAllMemories: (r: Role) => r === 'admin' || r === 'editor',
  writeOwnMemories: (r: Role) => r !== 'famiglia',
  editSettings: (r: Role) => r === 'admin',
  manageUsers: (r: Role) => r === 'admin',
  upload: (r: Role) => r !== 'famiglia',
};

export function ownsMemory(m: { createdBy?: string; author?: string }, user: StoredUser) {
  if (m.createdBy) return m.createdBy === user.username;
  return (m.author || '').trim().toLowerCase() === user.displayName.trim().toLowerCase();
}
