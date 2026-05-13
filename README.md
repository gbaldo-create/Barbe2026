# Barberino2026 — Versione Statica

Nessun backend, nessun token, nessun Firebase. Solo file statici su GitHub + Vercel.

---

## Deploy in 5 minuti

### 1. Crea repo GitHub e carica il codice

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/TUO-USERNAME/barberino2026.git
git push -u origin main
```

### 2. Deploy su Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa il repo
2. *(Opzionale)* Aggiungi variabile d'ambiente: `VITE_ADMIN_PWD` = la tua password
3. Clicca **Deploy** — fatto.

---

## Come funziona

### Visitatori (pubblico)
Vedono il catalogo, le schede degli oggetti, i ricordi. Nessun login.

### Famiglia (admin)
1. Clicca **"Famiglia"** nell'header e inserisce la password (default: `barberino2026`)
2. Può aggiungere, modificare, eliminare oggetti e ricordi
3. Le modifiche sono salvate in **localStorage** (rimangono nel browser)
4. Clicca **↓ items.json** nell'header per scaricare il file aggiornato
5. Sostituisce `data/items.json` nel repo e fa push → Vercel rideploya in ~30 secondi

### Come aggiungere un oggetto con immagine

**Opzione A — URL esterno (più semplice)**
- Carica la foto su [imgbb.com](https://imgbb.com) o [imgur.com](https://imgur.com) gratis
- Copia il link diretto e incollalo nel form

**Opzione B — Immagine nel repo**
- Metti la foto in `public/images/nome-foto.jpg`
- Nel form usa come URL: `/images/nome-foto.jpg`

---

## Struttura

```
barberino2026/
├── data/
│   └── items.json        ← modifica questo per aggiornare il catalogo
├── public/
│   ├── favicon.svg
│   └── images/           ← foto degli oggetti (opzionale)
├── src/
│   ├── App.tsx           ← tutta la UI
│   ├── types.ts
│   ├── main.tsx
│   └── index.css
├── vercel.json
└── package.json
```

---

## Workflow di aggiornamento catalogo

```
Admin modifica sul sito
       ↓
Clicca "↓ items.json"
       ↓
Sostituisce data/items.json nel repo
       ↓
git add data/items.json && git commit -m "update" && git push
       ↓
Vercel rideploya automaticamente (~30 sec)
```

---

Custodito per le generazioni future • 2026 • Barberino di Mugello
