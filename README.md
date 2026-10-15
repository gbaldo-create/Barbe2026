# Barberino2026 — Archivio di Famiglia

Sito catalogo degli oggetti di casa e dei ricordi di famiglia. React + Vite su **Vercel**; i dati stanno in questo repo GitHub.

## Come funziona

```
Browser ──► /api/* (funzioni Vercel) ──► GitHub (data/*.json, public/images)
                     │
                     └──► Anthropic (AI)
```

- **Lettura pubblica**: il sito legge `data/items.json` e `data/memories.json` (solo ricordi pubblici) da GitHub all'apertura.
- **Ricordi privati**: stanno cifrati in `data/private/memories.enc.json` e arrivano solo a chi ha fatto l'accesso, tramite `api/memories.ts`. Eventuali ricordi privati trovati in `data/memories.json` vengono spostati nel file cifrato automaticamente.
- **Scrittura**: solo tramite le funzioni in `api/`, che controllano utente e permessi e poi salvano su GitHub con un token tenuto **solo sul server**. Il browser invia solo le modifiche: se due persone salvano insieme, il server le unisce invece di sovrascrivere.
- **AI**: passa da `api/ai.ts`; la chiave Anthropic non arriva mai al browser. Ogni utente può avere l'AI attiva o no e un limite mensile; i consumi si vedono in *Gestione utenti*.
- **Utenti**: salvati cifrati (AES-256-GCM) in `data/private/users.enc.json`, password con scrypt. Si gestiscono dal sito: menu utente → *Gestione utenti*.
- I salvataggi di dati e foto **non** fanno ripartire il deploy su Vercel (vedi `ignoreCommand` in `vercel.json`); il codice e `data/settings.json` sì.

## Ruoli

| Ruolo | Cosa può fare |
|---|---|
| Amministratore | Tutto, compresi utenti, impostazioni e sfondo della home |
| Editor | Aggiunge e modifica oggetti e ricordi, carica foto |
| Autore ricordi | Scrive, modifica ed elimina solo i propri ricordi |
| Famiglia | Vede i ricordi privati, non modifica |
| Visitatore (senza accesso) | Catalogo e ricordi pubblici |

L'uso dell'AI è un permesso separato, attivabile per ogni utente.

## Variabili d'ambiente (Vercel → Settings → Environment Variables)

| Nome | A cosa serve |
|---|---|
| `SESSION_SECRET` | Firma i cookie di accesso (stringa casuale lunga) |
| `USERS_KEY` | Cifra utenti e ricordi privati. **Non perderla**: senza, utenti e ricordi privati non si possono più leggere |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Amministratore di emergenza, entra sempre |
| `ADMIN_DISPLAY_NAME` | Nome mostrato per l'amministratore di emergenza (facoltativo) |
| `GITHUB_TOKEN` | Token GitHub *fine-grained*, solo repo `Barbe2026`, permesso **Contents: Read and write** |
| `ANTHROPIC_API_KEY` | Chiave Anthropic (senza, le funzioni AI restano spente) |

Mai usare il prefisso `VITE_` per i segreti: Vite li inserisce nel codice pubblico del sito.

## Sviluppo in locale

```bash
npm install
npm run dev        # http://localhost:3000
```

- Le variabili stanno in `.env.local` (ignorato da git; modello in `.env.example`).
- In locale le funzioni `/api` girano dentro Vite. I salvataggi finiscono in `.local-data/` (ignorata da git) e le foto in `public/images`: il sito online e GitHub non vengono toccati.
- Per far salvare il sito locale direttamente su GitHub: in `.env.local` metti `LOCAL_FS=0` e `GITHUB_TOKEN`.

## Struttura

```
api/                     funzioni server (Vercel)
  _lib/                  sessioni, cifratura, accesso a GitHub, ricordi
  auth.ts                accesso, uscita, cambio password
  save.ts                salvataggio oggetti, ricordi, impostazioni
  memories.ts            ricordi completi (anche privati) per chi ha fatto l'accesso
  upload.ts              caricamento foto
  ai.ts                  proxy verso Anthropic con permessi e limiti
  users.ts               gestione utenti (solo amministratori)
data/                    items.json, memories.json, settings.json, private/ (file cifrati)
public/images/           foto usate dal catalogo e dai ricordi
src/
  App.tsx                componente principale: viste, stato, navigazione
  api.ts                 client delle funzioni /api e tabella permessi
  lib/                   shared (tipi e utilità), remote (salvataggi), ai, exports
  components/            ItemCard, ItemModal, CatawikiModal, MemoryModal, Lightbox,
                         ExplorePanel, MemoriesReel(V2), UsersAdmin, …
```

Le finestre di modifica (oggetto, Catawiki, ricordi, utenti) si caricano solo quando servono, così i visitatori scaricano meno codice.

Custodito per le generazioni future • 2026 • Barberino di Mugello
