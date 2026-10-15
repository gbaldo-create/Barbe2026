// Lettura/scrittura file del repo: via GitHub API (produzione) oppure su disco (sviluppo locale, LOCAL_FS=1)
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const GITHUB_OWNER = process.env.GITHUB_OWNER || 'gbaldo-create';
export const GITHUB_REPO = process.env.GITHUB_REPO || 'Barbe2026';
export const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

export const isLocalFs = () => process.env.LOCAL_FS === '1';

export class ConflictError extends Error {}

export interface FileRef { content: Buffer | null; sha: string | null }

const API = 'https://api.github.com';
const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

function ghHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN non configurato sul server');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'barbe2026-site',
  };
}

const localPath = (p: string) => {
  const full = path.resolve(process.cwd(), p);
  if (!full.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error('Percorso non valido');
  return full;
};

const localDataPath = (p: string) => localPath(path.join('.local-data', p));

export async function readFile(p: string): Promise<FileRef> {
  if (isLocalFs()) {
    // in locale le modifiche ai dati stanno in .local-data/ (ignorata da git); se non ci sono, si legge il file del repo
    for (const candidate of [localDataPath(p), localPath(p)]) {
      try { return { content: await fs.readFile(candidate), sha: 'local' }; }
      catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    }
    return { content: null, sha: null };
  }
  const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodePath(p)}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders() });
  if (res.status === 404) return { content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub ${res.status} leggendo ${p}`);
  const data: any = await res.json();
  if (data.encoding === 'base64' && data.content) return { content: Buffer.from(data.content, 'base64'), sha: data.sha };
  // File > 1 MB: il contenuto va letto dal blob
  const blob = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs/${data.sha}`, { headers: ghHeaders() });
  if (!blob.ok) throw new Error(`GitHub ${blob.status} leggendo blob di ${p}`);
  const b: any = await blob.json();
  return { content: Buffer.from(b.content, 'base64'), sha: data.sha };
}

export async function writeFile(p: string, content: Buffer | string, message: string, sha: string | null): Promise<void> {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  if (isLocalFs()) {
    // le foto vanno in public/images per vederle subito; i dati in .local-data/ per non finire su GitHub per sbaglio
    const full = p.startsWith('public/') ? localPath(p) : localDataPath(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buf);
    return;
  }
  const body: Record<string, unknown> = { message, content: buf.toString('base64'), branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodePath(p)}`, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 409 || res.status === 422) {
    const err: any = await res.json().catch(() => ({}));
    if (res.status === 409 || String(err.message || '').toLowerCase().includes('sha')) throw new ConflictError(err.message || 'conflitto');
    throw new Error(`GitHub 422: ${err.message || 'richiesta non valida'}`);
  }
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`GitHub ${res.status} scrivendo ${p}: ${err.message || ''}`);
  }
}

/** Legge, modifica e riscrive un file; se un'altra persona ha salvato nel frattempo, riprova sul contenuto aggiornato. */
export async function updateFile<T>(
  p: string,
  decode: (buf: Buffer | null) => T,
  encode: (value: T) => string,
  mutate: (current: T) => T | Promise<T>,
  message: string,
  tries = 4,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const file = await readFile(p);
    const next = await mutate(decode(file.content));
    try {
      await writeFile(p, encode(next), message, file.sha === 'local' ? null : file.sha);
      return next;
    } catch (e) {
      if (e instanceof ConflictError && attempt < tries) {
        await new Promise(r => setTimeout(r, 250 * attempt));
        continue;
      }
      throw e;
    }
  }
}

export function updateJson<T>(p: string, fallback: T, mutate: (current: T) => T | Promise<T>, message: string) {
  return updateFile<T>(
    p,
    buf => (buf && buf.length ? JSON.parse(buf.toString('utf8')) : fallback),
    v => JSON.stringify(v, null, 2) + '\n',
    mutate,
    message,
  );
}

export function publicImageUrl(repoPath: string) {
  if (isLocalFs()) return '/' + repoPath.replace(/^public\//, '');
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${repoPath}`;
}
