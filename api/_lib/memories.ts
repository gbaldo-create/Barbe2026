// Ricordi: i pubblici stanno in data/memories.json (leggibile da tutti),
// i privati in data/private/memories.enc.json, cifrati e leggibili solo dal server.
import { decryptJson, encryptJson } from './crypto.js';
import { ConflictError, readFile, writeFile } from './store.js';
import { HttpError } from './http.js';

export const PUBLIC_MEMORIES = 'data/memories.json';
export const PRIVATE_MEMORIES = 'data/private/memories.enc.json';

export type Mem = { id: string; visibility?: string; [k: string]: unknown };

const isPrivate = (m: Mem) => m.visibility === 'private';

function key() {
  const v = process.env.USERS_KEY;
  if (!v || v.length < 24) throw new Error("USERS_KEY mancante o troppo corto nelle variabili d'ambiente");
  return v;
}

async function readBoth() {
  const [pub, priv] = await Promise.all([readFile(PUBLIC_MEMORIES), readFile(PRIVATE_MEMORIES)]);
  const publicList: Mem[] = pub.content?.length ? JSON.parse(pub.content.toString('utf8')) : [];
  let privateList: Mem[] = [];
  if (priv.content?.length) {
    try { privateList = decryptJson<Mem[]>(priv.content.toString('utf8'), key()); }
    catch { throw new HttpError(500, 'I ricordi privati non si possono leggere: USERS_KEY è diversa da quella usata per cifrarli'); }
  }
  const privIds = new Set(privateList.map(m => m.id));
  // se un ricordo compare in entrambi (spostamento a metà), vale la versione privata
  const all = [...publicList.filter(m => !privIds.has(m.id)), ...privateList];
  return { pub, priv, publicList, privateList, all };
}

/** Tutti i ricordi (pubblici + privati) — solo per utenti collegati. */
export async function loadAllMemories() {
  const { all, publicList } = await readBoth();
  return { memories: all, needsMigration: publicList.some(isPrivate) };
}

/**
 * Legge entrambi i file, applica la modifica e li riscrive dividendo per visibilità.
 * Se nel frattempo qualcuno ha salvato, riprova sui dati aggiornati.
 */
export async function updateMemories(mutate: (all: Mem[]) => Mem[], message: string, tries = 4): Promise<Mem[]> {
  for (let attempt = 1; ; attempt++) {
    const { pub, priv, publicList, privateList, all } = await readBoth();
    const next = mutate(all.map(m => ({ ...m })));
    const nextPub = next.filter(m => !isPrivate(m));
    const nextPriv = next.filter(isPrivate);

    const writePriv = async () => {
      if (JSON.stringify(nextPriv) === JSON.stringify(privateList)) return;
      await writeFile(PRIVATE_MEMORIES, encryptJson(nextPriv, key(), 'Ricordi privati, cifrati: leggibili solo dal server con USERS_KEY.') + '\n',
        `${message} [privati]`, priv.sha === 'local' ? null : priv.sha);
    };
    const writePub = async () => {
      if (JSON.stringify(nextPub) === JSON.stringify(publicList)) return;
      await writeFile(PUBLIC_MEMORIES, JSON.stringify(nextPub, null, 2) + '\n', message, pub.sha === 'local' ? null : pub.sha);
    };

    try {
      // prima si scrive il file che "riceve" un ricordo, poi quello da cui esce: così non si perde mai nulla
      const privIds = new Set(privateList.map(m => m.id));
      const movedToPublic = nextPub.some(m => privIds.has(m.id));
      if (movedToPublic) { await writePub(); await writePriv(); }
      else { await writePriv(); await writePub(); }
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
