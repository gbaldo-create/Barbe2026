// Helper HTTP comuni alle funzioni /api (funzionano sia su Vercel sia nel server locale di Vite)
import type { IncomingMessage, ServerResponse } from 'node:http';

export type Req = IncomingMessage & { body?: unknown };
export type Res = ServerResponse;

const MAX_BODY = 6 * 1024 * 1024; // 6 MB

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readJson<T = any>(req: Req): Promise<T> {
  // Su Vercel il body JSON arriva già interpretato
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : ({} as T);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
    return req.body as T;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'Richiesta troppo grande');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try { return text ? JSON.parse(text) : ({} as T); }
  catch { throw new HttpError(400, 'JSON non valido'); }
}

export function send(res: Res, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function fail(res: Res, status: number, message: string) {
  send(res, status, { error: { message } });
}

export function parseCookies(req: Req): Record<string, string> {
  const out: Record<string, string> = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isHttps(req: Req) {
  const proto = String(req.headers['x-forwarded-proto'] || '');
  const host = String(req.headers.host || '');
  return proto.includes('https') || !(host.startsWith('localhost') || host.startsWith('127.0.0.1'));
}

export function setCookie(res: Res, req: Req, name: string, value: string, maxAgeSec: number) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

/** Avvolge un handler: gestisce errori e blocca richieste non-JSON (protezione CSRF di base). */
export function handler(fn: (req: Req, res: Res) => Promise<void>) {
  return async (req: Req, res: Res) => {
    try {
      if (req.method === 'POST') {
        const ct = String(req.headers['content-type'] || '');
        if (!ct.includes('application/json')) return fail(res, 415, 'Content-Type deve essere application/json');
      }
      await fn(req, res);
    } catch (e: any) {
      if (e instanceof HttpError) return fail(res, e.status, e.message);
      console.error('[api]', e);
      fail(res, 500, e?.message || 'Errore del server');
    }
  };
}
