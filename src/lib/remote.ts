import {
  Upload,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { FamilyMemory } from './shared';

// ─── GitHub API ──────────────────────────────────────────────────────────────

export const GITHUB_OWNER = 'gbaldo-create';
export const GITHUB_REPO = 'Barbe2026';
export const GITHUB_BRANCH = 'main';
export const GITHUB_PATH = 'data/items.json';

export const MEMORIES_PATH = 'data/memories.json';

// ─── Salvataggi via server (/api) ────────────────────────────────────────────
// Token GitHub e permessi stanno sul server: il browser invia solo le modifiche.
export type SaveResult<T> = { ok: boolean; data?: T; error?: string };
export const saveErrorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Salvataggio non riuscito: controlla la connessione');

export async function saveMemoriesRemote(prev: FamilyMemory[], next: FamilyMemory[]): Promise<SaveResult<FamilyMemory[]>> {
  try { const r = await api.saveMemories(prev, next); return { ok: true, data: (r.memories as FamilyMemory[] | null) || next }; }
  catch (e) { return { ok: false, error: saveErrorMessage(e) }; }
}

export async function saveSettingsRemote(settings: { heroImageUrl: string }): Promise<SaveResult<true>> {
  try { await api.saveSettings(settings); return { ok: true, data: true }; }
  catch (e) { return { ok: false, error: saveErrorMessage(e) }; }
}

export async function uploadImage(base64Data: string, fileName: string): Promise<string | null> {
  try { return await api.upload(base64Data, fileName); }
  catch (e) { console.error('Upload immagine fallito:', e); return null; }
}
