// Client delle funzioni server /api: login, salvataggi, foto, AI e gestione utenti.
// Nessun segreto qui: chiavi e token stanno solo sul server.

export type Role = 'admin' | 'editor' | 'autore' | 'famiglia';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Amministratore',
  editor: 'Editor',
  autore: 'Autore ricordi',
  famiglia: 'Famiglia',
};

export const ROLE_HINTS: Record<Role, string> = {
  admin: 'Tutto, compresi utenti e impostazioni',
  editor: 'Aggiunge e modifica oggetti e ricordi',
  autore: 'Scrive e modifica solo i propri ricordi',
  famiglia: 'Vede i ricordi privati, non modifica',
};

export interface SessionUser {
  username: string;
  displayName: string;
  role: Role;
  ai: { enabled: boolean; monthlyLimit: number; used: number };
  builtin?: boolean;
  disabled?: boolean;
  mustChangePassword?: boolean;
}

export interface AdminUserRow extends SessionUser {
  usage: { calls: number; inputTokens: number; outputTokens: number };
}

export interface UsersList { users: AdminUserRow[]; month: string; warning?: string }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error?.message || `Errore ${res.status}`, res.status);
  return data as T;
}

/** Permessi lato interfaccia (il server applica le stesse regole in api/_lib/auth.ts). */
export function permissions(u: SessionUser | null) {
  const r = u?.role;
  return {
    isLogged: !!u,
    canEditItems: r === 'admin' || r === 'editor',
    canEditAllMemories: r === 'admin' || r === 'editor',
    canWriteMemories: !!u && r !== 'famiglia',
    canEditSettings: r === 'admin',
    canManageUsers: r === 'admin',
    canUpload: !!u && r !== 'famiglia',
    canUseAI: !!u?.ai?.enabled,
  };
}

/** Confronta due elenchi per id e restituisce solo ciò che è cambiato. */
export function diffById<T extends { id: string }>(prev: T[], next: T[]) {
  const before = new Map(prev.map(x => [x.id, JSON.stringify(x)]));
  const nextIds = new Set(next.map(x => x.id));
  return {
    upserts: next.filter(x => before.get(x.id) !== JSON.stringify(x)),
    deletes: prev.filter(x => !nextIds.has(x.id)).map(x => x.id),
  };
}

export const api = {
  me: () => call<{ user: SessionUser | null }>('/api/auth').then(r => r.user),
  login: (username: string, password: string) => call<{ user: SessionUser }>('/api/auth', { action: 'login', username, password }).then(r => r.user),
  logout: () => call('/api/auth', { action: 'logout' }),
  changePassword: (current: string, next: string) => call<{ user: SessionUser }>('/api/auth', { action: 'change-password', current, next }).then(r => r.user),

  /** Tutti i ricordi, compresi i privati (solo utenti collegati). */
  memories: <T = any>() => call<{ memories: T[] }>('/api/memories').then(r => r.memories),

  saveItems: <T extends { id: string }>(prev: T[], next: T[]) => {
    const { upserts, deletes } = diffById(prev, next);
    if (!upserts.length && !deletes.length) return Promise.resolve({ ok: true, items: null as T[] | null });
    return call<{ ok: boolean; items: T[] }>('/api/save', { file: 'items', upserts, deletes });
  },
  saveMemories: <T extends { id: string }>(prev: T[], next: T[]) => {
    const { upserts, deletes } = diffById(prev, next);
    if (!upserts.length && !deletes.length) return Promise.resolve({ ok: true, memories: null as T[] | null });
    return call<{ ok: boolean; memories: T[] }>('/api/save', { file: 'memories', upserts, deletes });
  },
  saveSettings: (settings: { heroImageUrl?: string }) => call('/api/save', { file: 'settings', settings }),
  upload: (data: string, fileName: string) => call<{ url: string }>('/api/upload', { data, fileName }).then(r => r.url),

  /** Stesso formato della Messages API di Anthropic; restituisce la Response grezza. */
  ai: (body: { model: string; max_tokens: number; messages: unknown[]; system?: string }) =>
    fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }),

  users: {
    list: () => call<UsersList>('/api/users'),
    create: (u: { username: string; displayName: string; role: Role; password: string; ai: { enabled: boolean; monthlyLimit: number } }) =>
      call<UsersList>('/api/users', { action: 'create', ...u }),
    update: (username: string, patch: Partial<{ displayName: string; role: Role; ai: { enabled: boolean; monthlyLimit: number }; disabled: boolean }>) =>
      call<UsersList>('/api/users', { action: 'update', username, ...patch }),
    resetPassword: (username: string, password: string) =>
      call<UsersList>('/api/users', { action: 'reset-password', username, password }),
    remove: (username: string) => call<UsersList>('/api/users', { action: 'delete', username }),
  },
};

export function randomPassword(len = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => chars[n % chars.length]).join('');
}
