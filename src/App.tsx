// v2026-05-22
import React, { useState, useMemo, ReactNode, FormEvent, useEffect, useRef, DragEvent, ChangeEvent, MouseEvent } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  Archive, Menu, X, Plus, SlidersHorizontal, MapPin, History,
  ChevronLeft, ChevronRight, Share2, Twitter, Facebook, Mail,
  ArrowLeft, ArrowRight, ExternalLink, Sparkles, Heart, Handshake,
  Camera, User, Upload, LogOut, Edit, Trash2, Image as ImageIcon, Check, Download,
  LayoutGrid, Lamp, Sofa, BookOpen, Armchair, Star, BookHeart, Pencil,
  ChevronUp, ChevronDown, Bookmark, PenLine, Maximize2,
} from 'lucide-react';
import { HeritageItem, Memory, ViewType } from './types.ts';
import ITEMS_DATA from '../data/items.json';
import SETTINGS_DATA from '../data/settings.json';

// ─── types ────────────────────────────────────────────────────────────────────

interface FamilyMemory {
  id: string;
  text: string;
  author: string;
  date: string;
  itemId?: string;
  imageUrl?: string;
  visibility?: 'public' | 'private'; // omitted = public
  pinned?: boolean; // cover fissa — al massimo uno per volta
}

const INITIAL_ITEMS: HeritageItem[] = ITEMS_DATA as HeritageItem[];

// Shuffle deterministico con seed — stesso ordine ad ogni reload
// Il seed deriva dagli ID dei ricordi: cambia solo quando aggiungi/rimuovi ricordi
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function memorySeed(memories: FamilyMemory[]): number {
  // Hash semplice degli ID — stabile finché la lista non cambia
  return memories.reduce((acc, m) => {
    for (let k = 0; k < m.id.length; k++) acc = (acc * 31 + m.id.charCodeAt(k)) & 0xffffffff;
    return acc;
  }, 0x12345678);
}

// Ordina: pinned primo, resto in ordine seeded stabile
function orderMemories(memories: FamilyMemory[]): FamilyMemory[] {
  const pinned = memories.filter(m => m.pinned);
  const rest = memories.filter(m => !m.pinned);
  const seed = memorySeed(rest);
  return [...pinned, ...seededShuffle(rest, seed)];
}

// ─── family memories — loaded from GitHub memories.json ─────────────────────
// All memories are managed via the Admin Panel and stored in data/memories.json

// ─── users database ───────────────────────────────────────────────────────────

const USERS: Record<string, string> = {
  olivia: 'olivia2026',
  aleria: 'aleria2026',
  emanuela: 'emanuela2026',
  gianmaria: 'gianmaria2026',
};

// ─── utils ────────────────────────────────────────────────────────────────────

const WhatsAppIcon = ({ size = 24, className = '', color = '#25D366' }: { size?: number; className?: string; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const resizeImage = (source: string | File): Promise<string> =>
  new Promise((resolve, reject) => {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;
    const img = new Image();
    img.onload = () => {
      if (isFile) URL.revokeObjectURL(url);
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      // Target ~200KB file = ~267KB base64, iterate down if needed
        const TARGET_B64 = 267000;
        let quality = 0.78;
        let result = c.toDataURL('image/jpeg', quality);
        while (result.length > TARGET_B64 && quality > 0.3) {
          quality -= 0.08;
          result = c.toDataURL('image/jpeg', quality);
        }
        resolve(result);
    };
    img.onerror = () => { if (isFile) URL.revokeObjectURL(url); typeof source === 'string' ? resolve(source) : reject(new Error('Errore immagine')); };
    img.src = url;
  });

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

// ─── Claude vision analysis ───────────────────────────────────────────────────

async function analyzeImageWithClaude(
  mainImageBase64: string,
  detailImages?: { base64: string; tipo: string }[]
): Promise<Partial<typeof emptyForm> | null> {
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const toB64 = (b: string) => b.includes(',') ? b.split(',')[1] : b;
  const toMime = (b: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' =>
    b.startsWith('data:image/png') ? 'image/png' : b.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

  const mainB64 = toB64(mainImageBase64);
  if (!mainB64 || mainB64.length < 100) { console.error('Base64 vuoto o invalido'); return null; }

  const callApi = async (messages: any[]): Promise<any> => {
    const tryModel = async (model: string) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: 1000, messages })
      });
      if (res.status === 529 || res.status === 503) return null;
      if (!res.ok) { const e = await res.json().catch(() => ({})); if ((e.error?.message || '').includes('overloaded')) return null; throw new Error(e.error?.message || `Errore ${res.status}`); }
      return res.json();
    };
    const data = await tryModel('claude-sonnet-4-6') ?? await tryModel('claude-haiku-4-5-20251001');
    if (!data) throw new Error('Server AI sovraccarico — riprova tra qualche minuto');
    return data;
  };

  // ── STEP 1: analisi dedicata marchi/firme sulle foto di dettaglio ─────────
  let marksContext = '';

  // Converti URL → base64 (funziona anche con GitHub raw via proxy immagine)
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Prova diretta prima
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('not ok');
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      try {
        // Fallback: carica via img tag e disegna su canvas
        return await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = () => resolve('');
          img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        });
      } catch { return ''; }
    }
  };

  const resolvedDetails: { base64: string; tipo: string }[] = [];
  for (const d of (detailImages || [])) {
    if (d.base64.startsWith('http')) {
      const b64 = await urlToBase64(d.base64);
      if (b64 && toB64(b64).length > 100) resolvedDetails.push({ base64: b64, tipo: d.tipo });
    } else if (toB64(d.base64).length > 100) {
      resolvedDetails.push(d);
    }
  }

  const validDetails = resolvedDetails;

  if (validDetails.length > 0) {
    const marksContent: any[] = [];
    validDetails.forEach(({ base64, tipo }) => {
      marksContent.push({ type: 'text', text: `Foto di dettaglio — "${tipo}":` });
      marksContent.push({ type: 'image', source: { type: 'base64', media_type: toMime(base64), data: toB64(base64) } });
    });
    marksContent.push({ type: 'text', text: `Sei un esperto di marchi, firme e punzoni su oggetti d'antiquariato e design industriale.
Esamina ogni immagine ricevuta con la massima attenzione.
Per ogni testo o simbolo visibile:
- Trascrivilo lettera per lettera esattamente come appare (anche se rovesciato o curvo)
- Usa [?] per caratteri incerti
- Descrivi posizione, tecnica (stampato / inciso / applicato / a rilievo) e materiale del supporto
- Se riconosci il marchio, cita produttore, paese e periodo con grado di certezza
- Se non riesci a leggere, descrivi forma e stile grafico

Rispondi in testo libero, in italiano, in modo preciso e conciso.` });

    try {
      const marksData = await callApi([{ role: 'user', content: marksContent }]);
      marksContext = marksData?.content?.[0]?.text || '';
    } catch { /* continua senza */ }
  }

  // ── STEP 2: analisi principale con contesto marchi già risolti ───────────
  const content: any[] = [
    { type: 'image', source: { type: 'base64', media_type: toMime(mainImageBase64), data: mainB64 } },
  ];

  // Foto di dettaglio — inserite con istruzioni prioritarie per marchi e firme
  // Inserisci contesto marchi già analizzati nel prompt principale
  const marksSection = marksContext
    ? `

MARCHI E FIRME GIÀ ANALIZZATI (da foto di dettaglio dedicate — usa questi dati come base certa per l'attribuzione):
${marksContext}`
    : '';

  content.push({
    type: 'text',
    text: `Sei un esperto antiquario e storico del design con conoscenza del mercato dell'arte e degli oggetti da collezione dal Seicento al Duemila: dipinti, stampe, libri antichi, mobili, ceramiche, argenteria, vetri, e design industriale italiano e internazionale del XX secolo (Liberty, Déco, Bauhaus, Mid-Century, Space Age, Memphis). Conosci case d'asta (Pandolfini, Christie's, Sotheby's, Wright, Quittenbaum, Catawiki) e produttori di design (Cassina, Kartell, Artemide, Knoll, Vitra, Zanotta, Stilnovo, Bitossi, Venini, Brionvega, Olivetti). Gli oggetti appartengono a una famiglia italiana borghese con viaggi in tutta Italia e in Europa: non fare mai assunzioni geografiche senza evidenza visiva.${marksSection}

CLASSIFICAZIONE OBBLIGATORIA:
• Antiquariato: prodotto prima del 1900, o fino al 1940 se di manifattura nota
• Modernariato: 1940–1980, design o artigianato di qualità
• Oggetto comune: produzione industriale post-1980 senza firma o valore collezionistico
→ Questa classificazione determina canale di vendita e fascia di prezzo. Non sovrastimare.

VOCABOLARIO CONTROLLATO — usa SOLO queste opzioni:

Sottocategorie per categoria:
• Illuminazione: Lampadario | Applique | Plafoniera | Piantana | Lanterna | Abat-jour | Lume da tavolo
• Mobili: Armadio | Credenza | Comò | Cassettiera | Scrittoio | Tavolo | Tavolo da pranzo | Consolle | Specchiera | Libreria | Comodino | Vetrina
• Sedute: Poltrona | Sedia | Divano | Sgabello | Panca | Chaise longue
• Quadri: Olio su tela | Olio su tavola | Acquerello | Tempera | Pastello | Stampa | Litografia | Incisione | Fotografia | Disegno
• Libri: Libro antico | Atlante | Rivista d'epoca | Manoscritto
• Oggetti: Orologio | Vaso | Scultura | Bronzo | Ceramica | Argenteria | Specchio | Candelabro | Posacenere | Strumento musicale | Giocattolo d'epoca

Stili ammessi: Art Déco | Art Nouveau | Barocco | Bauhaus | Biedermeier | Classico | Eclettico | Impero | Liberty | Luigi XV | Luigi XVI | Memphis | Mid-Century Modern | Modernista | Neoclassico | Pop | Rinascimentale | Rococò | Rustico toscano | Space Age | Vittoriano

REGOLE:
- Tutti i campi in italiano tranne catawikiDescriptionEN
- Non lasciare mai year, catawikiStyle, catawikiSubcategory vuoti — usa range plausibile con grado di certezza tra parentesi se incerto: es. "1950–1970 circa (stima visiva)"
- Prezzi sempre come range min–max realistico per vendita tra privati: non usare prezzi da casa d'aste come riferimento
- catawikiTitle: MAX 80 caratteri, conta i caratteri — esempio corretto: "Lampadario Liberty in bronzo e vetro soffiato, inizio XX sec." = 60 car. ✓
- Tono: autorevole e tecnico, come un esperto che parla a un collezionista informato — no aggettivi come "pregiato", "raffinato", "elegante"
- description e catawikiDescription: solo fatti sull'oggetto — no commenti su perizie necessarie, autenticità da verificare o provenienza incerta (queste note vanno solo in technicalNotes), "di grande interesse"

Procedi:
1. Classifica (antiquariato / modernariato / oggetto comune)
2. Materiali con indicatori cronologici: bachelite (1907–1950), compensato (post-1920), fibra di vetro (post-1950), ABS (post-1960), viti Phillips (post-1940)
3. Attribuzione graduata usando i marchi già analizzati come base certa
4. Per design: originale d'epoca / riedizione autorizzata / replica non autorizzata

Restituisci SOLO un oggetto JSON valido (nessun testo prima o dopo):
{
  "name": "nome breve descrittivo in italiano",
  "description": "2-3 frasi: diretta e precisa, fatti prima delle impressioni — no retorica museale, no commenti su perizie o autenticità",
  "category": "una tra: Mobili | Illuminazione | Sedute | Quadri | Porcellane | Tappeti | Giardino | Libri | Oggetti",
  "room": "stanza più probabile in italiano, vuoto se non deducibile",
  "year": "range obbligatorio anche se incerto — es: 1950–1970 circa (stima visiva)",
  "dimensions": "dimensioni stimate se visibili (es: 80×40×90 cm), altrimenti stringa vuota",
  "price": "range prezzo tra privati in euro — es: € 150–250",
  "technicalNotes": "materiali primari · secondari · tecnica · marchi/firme trascritti · stato conservazione · classificazione (antiquariato/modernariato/comune)",
  "wearCondition": "una tra: Ottimo | Buono | Discreto | Da restaurare",
  "catawikiTitle": "MAX 80 caratteri — conta prima di scrivere",
  "catawikiSubcategory": "dal vocabolario controllato sopra",
  "catawikiStyle": "dal vocabolario controllato sopra",
  "catawikiMaterial": "materiale principale specifico (es: Noce massello | ABS cromato | Vetro soffiato Murano)",
  "catawikiCountry": "paese di origine solo se deducibile, altrimenti Italia",
  "catawikiDescription": "IT: 3-5 frasi — cosa è · materiali · periodo · stato · attribuzione. Senza aggettivi da catalogo. MAX 500 car.",
  "catawikiRestored": false
}`
  });

  // Analisi principale — usa callApi già definita sopra (Sonnet + Haiku fallback)
  const data = await callApi([{ role: 'user', content }]);
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { return null; }
}

const emptyForm = {
  name: '', description: '', room: '', category: '', year: '', dimensions: '',
  status: 'Disponibile' as any, acquisitionType: 'Vendita' as any,
  price: '', catawikiUrl: '', imageUrl: '', technicalNotes: '',
  destination: 'Barberino' as any, estimatedValue: '', productCode: '', displayPrice: '',
  wearCondition: '' as any, shipping: '' as any,
  isFeatured: false, isImportant: false, order: 0, details: [] as { label: string; value: string }[], images: [] as string[],
  // Campi Catawiki
  catawikiTitle: '', catawikiCategory: '', catawikiSubcategory: '',
  catawikiStyle: '', catawikiMaterial: '', catawikiCountry: '',
  catawikiRestored: false, catawikiWeight: '',
  catawikiShippingAvailable: false, catawikiPickupAvailable: true,
  catawikiDescription: '', catawikiImages: [] as string[],
  catawikiSpecific: {} as Record<string, string | boolean>,
};

// ─── Prepara scheda Catawiki con AI ──────────────────────────────────────────

const CATAWIKI_STYLES = ['Art Déco', 'Art Nouveau', 'Barocco', 'Biedermeier', 'Classico', 'Eclettico', 'Impero', 'Liberty', 'Luigi XV', 'Luigi XVI', 'Modernista', 'Neoclassico', 'Rinascimentale', 'Rococò', 'Rustico', 'Vintage', 'Vittoriano', 'Altro'];
const CATAWIKI_COUNTRIES = ['Italia', 'Francia', 'Inghilterra', 'Germania', 'Spagna', 'Austria', 'Olanda', 'Belgio', 'Svizzera', 'Cina', 'Giappone', 'Altro'];
const CATAWIKI_CATEGORIES = ['Mobili antichi', 'Illuminazione antica', 'Sedute antiche', 'Quadri e stampe', 'Porcellane e ceramiche', 'Tappeti e tessuti', 'Orologi antichi', 'Argenteria', 'Oggetti decorativi', 'Libri antichi', 'Gioielli antichi', 'Sculture'];

async function prepareCatawikiWithAI(item: HeritageItem): Promise<Partial<typeof emptyForm> | null> {
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `Sei un esperto di aste Catawiki e antiquariato italiano. 
Dati dell'oggetto:
- Nome: ${item.name}
- Descrizione: ${item.description}
- Categoria: ${item.category}
- Anno/Epoca: ${item.year || 'non specificato'}
- Dimensioni: ${item.dimensions || 'non specificate'}
- Condizione: ${item.wearCondition || 'non specificata'}
- Note tecniche: ${item.technicalNotes || 'nessuna'}
- Prezzo stimato: ${item.estimatedValue || item.price || 'non specificato'}

Genera SOLO un JSON valido con questi campi per Catawiki (nessun testo prima o dopo):
{
  "catawikiTitle": "titolo ottimizzato per Catawiki MAX 60 caratteri, descrittivo e attraente",
  "catawikiCategory": "una tra: ${CATAWIKI_CATEGORIES.join(', ')}",
  "catawikiSubcategory": "sottocategoria specifica (es. Comò, Scrivania, Lampadario...)",
  "catawikiStyle": "uno tra: ${CATAWIKI_STYLES.join(', ')}",
  "catawikiMaterial": "materiale principale (es. Noce massello, Mogano, Bronzo dorato...)",
  "catawikiCountry": "uno tra: ${CATAWIKI_COUNTRIES.join(', ')}",
  "catawikiRestored": false,
  "catawikiDescription": "descrizione in italiano formale stile asta, 3-5 frasi, enfatizza qualità, epoca, stato conservazione e unicità. MAX 500 caratteri."
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Errore API'); }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { return null; }
}

// ─── helpers per esportare JSON ───────────────────────────────────────────────

function downloadJson(items: HeritageItem[]) {
  const clean = items.map(({ isFavorite, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'items.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCatawikiTxt(items: HeritageItem[]) {
  const compiled = items.filter(i =>
    i.catawikiTitle || i.catawikiDescription || i.catawikiCategory
  );
  if (compiled.length === 0) { alert('Nessuna scheda Catawiki compilata.'); return; }

  const sections = compiled.map((item, idx) => {
    const allPhotos = [item.imageUrl, ...(item.images || [])].filter(Boolean);
    const selectedPhotos = item.catawikiImages?.length ? item.catawikiImages : allPhotos.slice(0, 5);
    return [
      `════════════════════════════════════════`,
      `OGGETTO ${idx + 1} di ${compiled.length}: ${item.name}`,
      `════════════════════════════════════════`,
      `TITOLO:       ${item.catawikiTitle || ''}`,
      `CATEGORIA:    ${item.catawikiCategory || ''}${item.catawikiSubcategory ? ` > ${item.catawikiSubcategory}` : ''}`,
      `STILE:        ${item.catawikiStyle || ''}`,
      `MATERIALE:    ${item.catawikiMaterial || ''}`,
      `PAESE:        ${item.catawikiCountry || ''}`,
      `ANNO/PERIODO: ${item.year || ''}`,
      `DIMENSIONI:   ${item.dimensions || ''}`,
      `CONDIZIONE:   ${item.wearCondition || ''}`,
      `RESTAURATO:   ${item.catawikiRestored ? 'Si' : 'No'}`,
      `PESO:         ${item.catawikiWeight || 'n/d'}`,
      `SPEDIZIONE:   ${item.catawikiShippingAvailable ? 'Si' : 'No'}`,
      `RITIRO:       ${item.catawikiPickupAvailable ? 'Si' : 'No'}`,
      ``,
      `DESCRIZIONE:`,
      item.catawikiDescription || '',
      ``,
      `FOTO (${selectedPhotos.length}):`,
      ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
    ].join('\n');
  });

  const txt = sections.join('\n\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catawiki-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportSingleCatawiki(item: HeritageItem) {
  const allPhotos = [item.imageUrl, ...(item.images || [])].filter(Boolean);
  const selectedPhotos = item.catawikiImages?.length ? item.catawikiImages : allPhotos.slice(0, 5) as string[];
  const specific = Object.entries((item as any).catawikiSpecific || {})
    .filter(([, v]) => v !== '' && v !== false && v !== undefined)
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      return `${(label + ':').padEnd(20)} ${v === true ? 'Sì' : String(v)}`;
    });

  const lines = [
    `════════════════════════════════════════`,
    `${item.name.toUpperCase()}`,
    `Categoria Catawiki: ${item.catawikiCategory || '—'}`,
    `════════════════════════════════════════`,
    ``,
    `── IDENTIFICAZIONE ─────────────────────`,
    `Titolo lotto:      ${item.catawikiTitle || '—'}`,
    `Sottocategoria:    ${item.catawikiSubcategory || '—'}`,
    `Stile:             ${item.catawikiStyle || '—'}`,
    `Materiale:         ${item.catawikiMaterial || '—'}`,
    `Paese origine:     ${item.catawikiCountry || '—'}`,
    ``,
    `── CRONOLOGIA ──────────────────────────`,
    `Anno/Epoca:        ${item.year || '—'}`,
    ``,
    `── STATO ───────────────────────────────`,
    `Condizione:        ${item.wearCondition || '—'}`,
    `Restaurato:        ${item.catawikiRestored ? 'Sì' : 'No'}`,
    ``,
    `── MISURE ──────────────────────────────`,
    `Dimensioni:        ${item.dimensions || '—'}`,
    `Peso spedizione:   ${item.catawikiWeight || '—'} kg`,
    ``,
    `── LOGISTICA ───────────────────────────`,
    `Spedizione:        ${item.catawikiShippingAvailable ? 'Sì' : 'No'}`,
    `Ritiro:            ${item.catawikiPickupAvailable ? 'Sì' : 'No'}`,
  ];

  if (specific.length > 0) {
    lines.push('', `── DETTAGLI ${(item.catawikiCategory || 'CATEGORIA').toUpperCase()} ─────────────────────`);
    lines.push(...specific);
  }

  lines.push(
    ``,
    `── DESCRIZIONE ─────────────────────────`,
    item.catawikiDescription || '—',
    ``,
    `── FOTO (${selectedPhotos.length}) ──────────────────────────`,
    ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
  );

  const txt = lines.join('\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catawiki-${item.name.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── GitHub API ──────────────────────────────────────────────────────────────

const GITHUB_OWNER = 'gbaldo-create';
const GITHUB_REPO = 'Barbe2026';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'data/items.json';

async function getGitHubToken(): Promise<string | null> {
  return localStorage.getItem('b2026_github_token');
}

async function saveItemsToGitHub(items: HeritageItem[]): Promise<boolean> {
  const token = await getGitHubToken();
  if (!token) return false;

  const clean = items.map(({ isFavorite, ...rest }) => rest);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(clean, null, 2))));

  // Get current SHA
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });

  if (!res.ok) return false;
  const data = await res.json();
  const sha = data.sha;

  // Update file
  const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'update catalog', content, sha, branch: GITHUB_BRANCH })
  });

  return updateRes.ok;
}

const MEMORIES_PATH = 'data/memories.json';

async function saveMemoriesToGitHub(memories: FamilyMemory[]): Promise<boolean> {
  const token = await getGitHubToken();
  if (!token) return false;
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(memories, null, 2))));
  let sha: string | undefined;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MEMORIES_PATH}?ref=${GITHUB_BRANCH}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}
  const body: any = { message: 'update memories', content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MEMORIES_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

async function validateGitHubToken(token: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.ok;
}

async function saveSettingsToGitHub(settings: { heroImageUrl: string }): Promise<boolean> {
  const token = localStorage.getItem('b2026_github_token');
  if (!token) return false;

  const path = 'data/settings.json';
  const contentStr = JSON.stringify(settings, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(contentStr)));

  let sha: string | undefined;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}

  const body: any = { message: 'update settings', content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

async function uploadImageToGitHub(base64Data: string, fileName: string): Promise<string | null> {
  const token = localStorage.getItem('b2026_github_token');
  if (!token) return null;

  // Extract pure base64 without data:image/...;base64, prefix
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const path = `public/images/${fileName}`;

  // Check if file exists to get SHA
  let sha: string | undefined;
  try {
    const check = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}

  const body: any = { message: `upload image ${fileName}`, content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Upload immagine fallito:', res.status, err);
    return null;
  }
  // Return public URL
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

function getPublicBadge(status: string, acquisitionType?: string) {
  if (status === 'Disponibile' && acquisitionType === 'Lascito Affettivo') return { label: 'In adozione', cls: 'bg-emerald-700 text-white' };
  if (status === 'Disponibile') return { label: 'Disponibile', cls: 'bg-emerald-700 text-white' };
  if (status === 'Affidato') return { label: 'Affidato', cls: 'bg-heritage-ink/40 text-white' };
  if (status === 'Riservato') return { label: 'Riservato', cls: 'bg-heritage-ink/40 text-white' };
  if (status === 'Venduto') return { label: 'Venduto', cls: 'bg-heritage-ink/40 text-white' };
  return { label: 'Disponibile', cls: 'bg-emerald-700 text-white' };
}
function isAdozione(item: any): boolean {
  return item?.acquisitionType === 'Lascito Affettivo' || item?.acquisitionType === 'Famiglia' || item?.status === 'Affidato';
}
function getAdozioneLabel(item: any): string | null {
  if (item?.status === 'Affidato') return 'Affidato';
  if (item?.acquisitionType === 'Lascito Affettivo') return 'In adozione';
  return null;
}
// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ images, initialIndex, name, room, year, onClose }: {
  images: string[];
  initialIndex: number;
  name: string;
  room?: string;
  year?: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const valid = images.filter(i => i?.trim());

  // magnifier state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLDivElement>(null);

  // pinch zoom
  const lastPinchDist = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // reset zoom quando cambia foto
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsMagnifying(false);
  }, [idx]);

  // scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (zoom > 1) { setZoom(1); setOffset({ x: 0, y: 0 }); } else onClose(); }
      if (e.key === 'ArrowRight' && zoom === 1) setIdx(p => (p + 1) % valid.length);
      if (e.key === 'ArrowLeft' && zoom === 1) setIdx(p => (p - 1 + valid.length) % valid.length);
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setOffset({ x: 0, y: 0 }); return nz; });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [valid.length, onClose, zoom]);

  // mouse move per magnifier lente
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    if (isDragging && zoom > 1) {
      setOffset(prev => ({
        x: prev.x + (e.clientX - dragStart.x) / zoom,
        y: prev.y + (e.clientY - dragStart.y) / zoom,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = () => {
    if (zoom > 1) { setZoom(1); setOffset({ x: 0, y: 0 }); }
    else { setZoom(2.5); }
  };

  // touch pinch zoom + swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      setZoom(z => Math.max(1, Math.min(4, z * delta)));
    } else if (e.touches.length === 1 && zoom > 1) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      setOffset(prev => ({ x: prev.x + dx / zoom, y: prev.y + dy / zoom }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom === 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0) setIdx(p => (p + 1) % valid.length);
        else setIdx(p => (p - 1 + valid.length) % valid.length);
      }
    }
    if (zoom <= 1) setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] bg-[#1a1208] flex flex-col select-none"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-[11px] font-bold uppercase tracking-widest"
        >
          <ChevronLeft size={14} /> Torna all'oggetto
        </button>
        <div className="flex items-center gap-3">
          {/* Zoom controls desktop */}
          <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-full px-1 py-1">
            <button
              onClick={() => { setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setOffset({ x: 0, y: 0 }); return nz; })}}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 text-lg font-bold"
            >−</button>
            <span className="text-white/60 text-[11px] font-bold min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 text-lg font-bold"
            >+</button>
          </div>
          {/* Magnifier toggle desktop */}
          <button
            onClick={() => setIsMagnifying(m => !m)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${isMagnifying ? 'bg-heritage-gold text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
            title="Lente di ingrandimento"
          >
            🔍 Lente
          </button>
          <span className="text-white/60 text-[13px] font-bold">{idx + 1} / {valid.length}</span>
        </div>
      </div>

      {/* Foto principale */}
      <div
        ref={imgRef}
        className="flex-1 flex items-center justify-center px-4 min-h-0 relative overflow-hidden"
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : isMagnifying ? 'none' : 'zoom-in' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={valid[idx]}
            alt={name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            style={{
              maxHeight: 'calc(100vh - 260px)',
              transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Lente desktop */}
        {isMagnifying && zoom === 1 && (
          <div
            className="hidden md:block absolute pointer-events-none rounded-full border-2 border-heritage-gold shadow-2xl overflow-hidden"
            style={{
              width: 180,
              height: 180,
              left: `calc(${mousePos.x}% - 90px)`,
              top: `calc(${mousePos.y}% - 90px)`,
              backgroundImage: `url(${valid[idx]})`,
              backgroundSize: '400%',
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {/* Hint doppio tap mobile */}
        {zoom === 1 && (
          <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-[11px]">
            Doppio tap per zoom
          </div>
        )}

        {/* Frecce */}
        {valid.length > 1 && zoom === 1 && (
          <>
            <button onClick={() => setIdx(p => (p - 1 + valid.length) % valid.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setIdx(p => (p + 1) % valid.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Info oggetto */}
      <div className="px-6 py-2 flex-shrink-0 text-center">
        <p className="font-serif italic text-white text-lg leading-tight">{name}</p>
        {(room || year) && (
          <p className="font-serif italic text-heritage-gold/70 text-[12px] mt-0.5">
            {[room, year].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Dots */}
      {valid.length > 1 && (
        <div className="flex justify-center items-center gap-2 pb-2 flex-shrink-0">
          <span className="font-serif italic text-white/30 text-[11px] mr-1">scorri</span>
          {valid.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === idx ? 'bg-heritage-gold w-5 h-1.5' : 'bg-white/25 w-1.5 h-1.5'}`} />
          ))}
        </div>
      )}

      {/* Miniature */}
      {valid.length > 1 && (
        <div className="flex gap-2 justify-center px-4 pb-6 flex-shrink-0">
          {valid.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === idx ? 'border-heritage-gold scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}>
              <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── ExplorePanel ─────────────────────────────────────────────────────────────

const EXPLORE_CATEGORIES = [
  { name: 'Mobili',        icon: <Armchair size={22} /> },
  { name: 'Illuminazione', icon: <Lamp size={22} /> },
  { name: 'Sedute',        icon: <Sofa size={22} /> },
  { name: 'Quadri',        icon: <ImageIcon size={22} /> },
  { name: 'Libri',         icon: <BookOpen size={22} /> },
  { name: 'Altro',         icon: <Star size={22} /> },
];

const EXPLORE_ROOMS = [
  { name: 'Salotto',    subtitle: 'dove ci si ritrovava',     match: (r: string) => /salotto|salone|sala|soggiorno/i.test(r) },
  { name: 'Studio',     subtitle: 'la scrivania di papà',     match: (r: string) => /studio/i.test(r) },
  { name: 'Camera',     subtitle: 'i cassettoni, gli armadi', match: (r: string) => /camera/i.test(r) },
  { name: 'Biblioteca', subtitle: 'i libri di Franco',        match: (r: string) => /biblioteca/i.test(r) },
  { name: 'Cucina',     subtitle: 'il tavolo grande',          match: (r: string) => /cucina|dispensa|cantina|ingresso|atrio|scala/i.test(r) },
];

function ExplorePanel({
  isOpen, onClose, totalItems, categoriesWithCount, onExplore, mode = 'discover', isAdmin = false, favorites = [], showFavoritesOnly = false, onToggleFavoritesOnly,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalItems: number;
  categoriesWithCount: { name: string; count: number }[];
  onExplore: (opts: { category?: string; roomMatch?: (r: string) => boolean; catawikiOnly?: boolean }) => void;
  mode?: 'discover' | 'filter';
  isAdmin?: boolean;
  favorites?: string[];
  showFavoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
}) {
  const [selType, setSelType] = useState<'all' | 'category' | 'room' | 'catawiki'>('all');
  const [selCategory, setSelCategory] = useState<string | null>(null);
  const [selRoom, setSelRoom] = useState<string | null>(null);

  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 120) onClose();
  };

  const selectAll = () => { setSelType('all'); setSelCategory(null); setSelRoom(null); };
  const selectCat = (cat: string) => { setSelType('category'); setSelCategory(cat); setSelRoom(null); };
  const selectRoom = (room: string) => { setSelType('room'); setSelRoom(room); setSelCategory(null); };
  const selectCatawiki = () => { setSelType('catawiki'); setSelCategory(null); setSelRoom(null); };

  const handleConfirm = () => {
    if (selType === 'category' && selCategory) {
      onExplore({ category: selCategory });
    } else if (selType === 'room' && selRoom) {
      const roomDef = EXPLORE_ROOMS.find(r => r.name === selRoom);
      onExplore({ roomMatch: roomDef?.match });
    } else if (selType === 'catawiki') {
      onExplore({ catawikiOnly: true });
    } else {
      onExplore({});
    }
    onClose();
  };

  const countFor = (name: string) => categoriesWithCount.find(c => c.name === name)?.count ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ep-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-heritage-ink/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* ── MOBILE: bottom sheet ── */}
          <motion.div
            key="ep-sheet-mobile"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[210] bg-heritage-cream rounded-t-[24px] shadow-2xl flex flex-col"
            style={{ maxHeight: '92svh' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 flex-shrink-0">
              <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-4 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="font-serif italic text-[26px] text-heritage-ink leading-tight">
                  {mode === 'discover' ? <><span>Da dove vuoi </span><span className="not-italic font-bold">iniziare?</span></> : 'Filtra'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelType('all'); setSelCategory(null); setSelRoom(null); }} className="text-[12px] font-bold uppercase tracking-widest text-heritage-gold">Reset</button>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-heritage-ink/8">
                  <X size={15} className="text-heritage-ink/50" />
                </button>
              </div>
            </div>

            <div className="h-px bg-heritage-ink/8 mx-6 flex-shrink-0" />

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-6 pt-4 pb-2 space-y-5">

              {/* CATEGORIE */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Categorie</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={selectAll}
                    className={`col-span-2 flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-[#4a5a38] border-[#4a5a38] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    <span>Tutti</span>
                    <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${selType === 'all' ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{totalItems}</span>
                  </button>
                  {EXPLORE_CATEGORIES.map(cat => {
                    const active = selType === 'category' && selCategory === cat.name;
                    return (
                      <button key={cat.name} onClick={() => selectCat(cat.name)}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                        <span>{cat.name}</span>
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{countFor(cat.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STATO */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stato</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={selectAll}
                    className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    Tutti
                  </button>
                  <button onClick={selectCatawiki}
                    className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    Su Catawiki
                  </button>
                </div>
              </div>

              {/* STANZE */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stanza</p>
                <div className="flex flex-wrap gap-2">
                  {EXPLORE_ROOMS.map(room => {
                    const active = selType === 'room' && selRoom === room.name;
                    return (
                      <button key={room.name} onClick={() => selectRoom(room.name)}
                        className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                        {room.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* CTA fisso in fondo */}
            <div className="px-6 pb-8 pt-4 flex-shrink-0 space-y-3">
              {isAdmin && favorites.length > 0 && onToggleFavoritesOnly && (
                <button onClick={() => { onToggleFavoritesOnly(); onExplore({}); onClose(); }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                  <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                  I miei preferiti · {favorites.length}
                </button>
              )}
              <button onClick={handleConfirm}
                className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] active:opacity-90 transition-opacity">
                Mostra Risultati
              </button>
            </div>

          </motion.div>
          {/* ── DESKTOP: modale centrata ── */}
          <motion.div
            key="ep-sheet-desktop"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="hidden md:flex fixed inset-0 z-[210] items-center justify-center pointer-events-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-heritage-cream rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">

              {/* Header */}
              <div className="px-8 pt-7 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-serif italic text-[28px] text-heritage-ink leading-tight">
                    {mode === 'discover'
                      ? <>Da dove vuoi <span className="not-italic font-bold">iniziare?</span></>
                      : 'Filtra'}
                  </h2>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => { setSelType('all'); setSelCategory(null); setSelRoom(null); }} className="text-[12px] font-bold uppercase tracking-widest text-heritage-gold">Reset</button>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-heritage-ink/8 hover:bg-heritage-ink/15 transition-colors">
                    <X size={15} className="text-heritage-ink/50" />
                  </button>
                </div>
              </div>

              <div className="border-t border-heritage-ink/8 mx-8" />

              <div className="px-8 pt-5 pb-7 space-y-5">

                {/* CATEGORIE */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Categorie</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={selectAll}
                      className={`col-span-2 flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-[#4a5a38] border-[#4a5a38] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      <span>Tutti</span>
                      <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${selType === 'all' ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{totalItems}</span>
                    </button>
                    {EXPLORE_CATEGORIES.map(cat => {
                      const active = selType === 'category' && selCategory === cat.name;
                      return (
                        <button key={cat.name} onClick={() => selectCat(cat.name)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-[13px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                          <span>{cat.name}</span>
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-heritage-ink/6 text-heritage-ink/40'}`}>{countFor(cat.name)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STATO */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stato</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={selectAll}
                      className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'all' ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      Tutti
                    </button>
                    <button onClick={selectCatawiki}
                      className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                      Su Catawiki
                    </button>
                  </div>
                </div>

                {/* STANZE */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-heritage-ink/40 mb-3">Stanza</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPLORE_ROOMS.map(room => {
                      const active = selType === 'room' && selRoom === room.name;
                      return (
                        <button key={room.name} onClick={() => selectRoom(room.name)}
                          className={`px-5 py-2.5 rounded-full border font-bold text-[12px] uppercase tracking-wider transition-all ${active ? 'bg-heritage-ink border-heritage-ink text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                {isAdmin && favorites.length > 0 && onToggleFavoritesOnly && (
                  <button onClick={() => { onToggleFavoritesOnly(); onExplore({}); onClose(); }}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                    <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    I miei preferiti · {favorites.length}
                  </button>
                )}
                <button onClick={handleConfirm}
                  className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] hover:bg-heritage-ink/90 transition-colors">
                  Mostra Risultati
                </button>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function ScrollReveal({ children, className, delay = 0, y = 24 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


const AUTHOR_COLORS: Record<string,string> = { Emanuela: '#C5A059', Olivia: '#4A8B6B', Aleria: '#7B6B9A', Gianmaria: '#6B4A8B' };

function DesktopMemoriesView({ memories, loaderIndex, setLoaderIndex }: {
  memories: FamilyMemory[];
  loaderIndex: number;
  setLoaderIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const authors = ['Tutti', ...Array.from(new Set(memories.map(m => m.author).filter(Boolean)))];
  const filtered = activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor);
  const safeIdx = loaderIndex % Math.max(filtered.length, 1);
  const mem = filtered[safeIdx];

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {authors.map(a => (
          <button key={a} onClick={() => { setActiveAuthor(a); setLoaderIndex(0); }}
            style={{ borderColor: activeAuthor === a ? (AUTHOR_COLORS[a] || '#1C1A16') : 'rgba(28,26,22,0.12)', background: activeAuthor === a ? (AUTHOR_COLORS[a] || '#1C1A16') : 'transparent', color: activeAuthor === a ? 'white' : 'rgba(28,26,22,0.5)' }}
            className="px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.14em] transition-all"
          >{a}</button>
        ))}
      </div>
      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={`${activeAuthor}-${safeIdx}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="flex flex-col items-center w-full gap-4">
          {mem?.imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden border border-heritage-ink/10 cursor-zoom-in" style={{aspectRatio: '4/3'}} onClick={() => setLightboxUrl(mem.imageUrl!)}>
              <img src={mem.imageUrl} alt={mem.author || ""} className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-heritage-ink/90 text-lg font-heritage italic leading-relaxed text-center">"{mem?.text || ""}"</p>
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-bold uppercase tracking-[0.2em] text-[12px]" style={{ color: AUTHOR_COLORS[mem?.author || ''] || '#C5A059' }}>— {mem?.author || ""}</p>
            {mem?.date && <p className="text-heritage-ink/40 text-[11px] uppercase tracking-widest">{mem.date}</p>}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-6">
        <button onClick={() => setLoaderIndex(i => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))} className="w-10 h-10 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors">
          <ChevronLeft size={18} className="text-heritage-ink/60" />
        </button>
        <span className="text-[11px] text-heritage-ink/30 font-sans tracking-widest">{safeIdx + 1} / {filtered.length}</span>
        <button onClick={() => setLoaderIndex(i => (i + 1) % Math.max(filtered.length, 1))} className="w-10 h-10 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors">
          <ChevronRight size={18} className="text-heritage-ink/60" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<ViewType>(() => (sessionStorage.getItem('b2026_view') as ViewType) || 'home');
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const { scrollY } = useScroll();
  // Parallax hero: su mobile ridotto (max 40px), su desktop fino a 100px
  const heroParallax = useTransform(scrollY, [0, 600], [0, typeof window !== "undefined" && window.innerWidth < 768 ? 40 : 100]);
  const [items, setItems] = useState<HeritageItem[]>(() => {
    try { const c = localStorage.getItem('b2026_items'); return c ? JSON.parse(c) : INITIAL_ITEMS; }
    catch { return INITIAL_ITEMS; }
  });
  const alreadySeen = sessionStorage.getItem('b2026_loader_seen') === '1';
  const [isLoading, setIsLoading] = useState(!alreadySeen);
  const [dismissed, setDismissed] = useState(alreadySeen);
  const [loaderQuote, setLoaderQuote] = useState<{ text: string; author: string } | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(() => 0); // verrà aggiornato al primo caricamento
  const [loaderFromMenu, setLoaderFromMenu] = useState(false);
  const loaderFromMenuRef = useRef(false);
  const [showLoaderCover, setShowLoaderCover] = useState(false);
  useEffect(() => { loaderFromMenuRef.current = loaderFromMenu; }, [loaderFromMenu]);
  const [selectedItem, setSelectedItem] = useState<HeritageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [selectedStatus, setSelectedStatus] = useState('Tutti');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showNuovoDropdown, setShowNuovoDropdown] = useState(false);

  // Scroll robusto a una sezione
  const scrollToSection = (id: string, fromView?: string) => {
    const doScroll = (attempts = 0) => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (attempts < 10) { setTimeout(() => doScroll(attempts + 1), 80); }
    };
    if (fromView && fromView !== 'home') { setView('home'); setTimeout(() => doScroll(), 150); }
    else { doScroll(); }
  };

  // ── 🧪 Lab mode — visibile solo a gianmaria ──────────────────────────────
  const [labFeatures, setLabFeatures] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('b2026_lab') || '{}'); } catch { return {}; }
  });
  const isLab = (feature: string) => currentUser === 'gianmaria' && !!labFeatures[feature];
  const toggleLab = (feature: string) => {
    setLabFeatures(prev => {
      const next = { ...prev, [feature]: !prev[feature] };
      try { localStorage.setItem('b2026_lab', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [memories, setMemories] = useState<FamilyMemory[]>(() => {
    try { const c = localStorage.getItem('b2026_memories'); return c ? JSON.parse(c) : []; }
    catch { return []; }
  });
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<FamilyMemory | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeritageItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(() => localStorage.getItem('b2026_hero') || (SETTINGS_DATA as any).heroImageUrl || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=2000');
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [explorePanelMode, setExplorePanelMode] = useState<'discover' | 'filter'>('discover');
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('b2026_favs') || '[]'); } catch { return []; } });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isExplorePanelOpen, setIsExplorePanelOpen] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<((r: string) => boolean) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isCatawikiModalOpen, setIsCatawikiModalOpen] = useState(false);
  const [catawikiItem, setCatawikiItem] = useState<HeritageItem | null>(null);
  const [isPreparingCatawiki, setIsPreparingCatawiki] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');

  // Multi-user auth
  const [currentUser, setCurrentUser] = useState<string | null>(() => sessionStorage.getItem('b2026_user'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isAdmin = !!currentUser;

  // visibleMemories: public always; private only for logged-in users
  const visibleMemories = useMemo(() =>
    memories.filter(m => isAdmin || !m.visibility || m.visibility === 'public'),
  [memories, isAdmin]);
  const shuffledMemories = useMemo(() => orderMemories(visibleMemories), [visibleMemories]);

  useEffect(() => {
    if (alreadySeen) return;
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  // Al primo caricamento scegli un ricordo pubblico random + precarica le foto
  useEffect(() => {
    if (shuffledMemories.length > 0) {
      const publicMems = shuffledMemories.filter(m => m.visibility !== 'private');
      const pool = publicMems.length > 0 ? publicMems : shuffledMemories;
      const randomIdx = shuffledMemories.indexOf(pool[Math.floor(Math.random() * pool.length)]);
      setLoaderIndex(randomIdx >= 0 ? randomIdx : 0);
      setLoaderQuote({ text: shuffledMemories[randomIdx]?.text || '', author: shuffledMemories[randomIdx]?.author || '' });
      // Precarica la foto del ricordo scelto mentre l'orologio gira
      const mem = shuffledMemories[randomIdx >= 0 ? randomIdx : 0];
      if (mem?.imageUrl) {
        const img = new window.Image();
        img.src = mem.imageUrl;
      }
      // Precarica anche le prossime 3 per navigazione desktop
      [1,2,3].forEach(offset => {
        const m = shuffledMemories[(randomIdx + offset) % shuffledMemories.length];
        if (m?.imageUrl) { const i = new window.Image(); i.src = m.imageUrl; }
      });
    }
  }, [shuffledMemories.length]); // solo al primo caricamento

  useEffect(() => {
    sessionStorage.setItem('b2026_view', view);
    if (view === 'item-detail' && selectedItem) {
      sessionStorage.setItem('b2026_item_id', selectedItem.id);
    } else {
      sessionStorage.removeItem('b2026_item_id');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, selectedItem?.id]);


  useEffect(() => {
    // Ripristina da URL ?item=ID (link condivisi)
    const p = new URLSearchParams(window.location.search);
    const urlId = p.get('item');
    if (urlId) {
      const it = items.find(i => i.id === urlId);
      if (it) { setSelectedItem(it); setView('item-detail'); }
      window.history.replaceState({ view: 'item-detail', itemId: urlId }, '', `?item=${urlId}`);
      return;
    }
    // Ripristina da sessionStorage (refresh normale)
    const savedView = sessionStorage.getItem('b2026_view') as ViewType;
    const savedItemId = sessionStorage.getItem('b2026_item_id');
    if (savedView === 'item-detail' && savedItemId) {
      const it = items.find(i => i.id === savedItemId);
      if (it) { setSelectedItem(it); setView('item-detail'); }
    }
  }, [items]);

  // Browser back/forward support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Loader aperto da menu — torna alla home
      if (viewRef.current !== 'memories-reel-v2' && loaderFromMenuRef.current) {
        setDismissed(true);
        setLoaderFromMenu(false);
        setShowLoaderCover(false);
        return;
      }
      // Se il reel era aperto, torna alla home senza uscire dal sito
      if (viewRef.current === 'memories-reel-v2') {
        setView('home');
        return;
      }
      // Controlla anche URL params
      const p = new URLSearchParams(window.location.search);
      const urlId = p.get('item');
      if (urlId) {
        const found = items.find(i => i.id === urlId);
        if (found) { setSelectedItem(found); setView('item-detail'); return; }
      }
      if (e.state?.view === 'item-detail' && e.state?.itemId) {
        const found = items.find(i => i.id === e.state.itemId);
        if (found) { setSelectedItem(found); setView('item-detail'); }
      } else if (e.state?.view) {
        setView(e.state.view as ViewType);
        setSelectedItem(null);
        sessionStorage.removeItem('b2026_item_id');
      } else {
        setView('home');
        setSelectedItem(null);
        sessionStorage.removeItem('b2026_item_id');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [items]);

  // ── sync from GitHub on mount — GitHub è sempre source of truth ──
  const [isSyncing, setIsSyncing] = useState(true);
  useEffect(() => {
    const fetchFromGitHub = async () => {
      setIsSyncing(true);
      try {
        // Carica memories.json
        try {
          const memUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${MEMORIES_PATH}?t=${Date.now()}`;
          const memRes = await fetch(memUrl);
          if (memRes.ok) {
            const memData: FamilyMemory[] = await memRes.json();
            // Preserva i flag pinned dalla localStorage se GitHub non li ha ancora
            // (raw.githubusercontent può essere in ritardo rispetto al push)
            try {
              const local = localStorage.getItem('b2026_memories');
              if (local) {
                const localMems: FamilyMemory[] = JSON.parse(local);
                const localPins = new Map(localMems.filter(m => m.pinned).map(m => [m.id, true]));
                if (localPins.size > 0) {
                  memData.forEach(m => { if (localPins.has(m.id)) m.pinned = true; });
                }
              }
            } catch {}
            setMemories(memData);
            try { localStorage.setItem('b2026_memories', JSON.stringify(memData)); } catch {}
          }
        } catch {}

        const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_PATH}?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data: HeritageItem[] = await res.json();
        setItems(data);
        try {
          const forStorage = data.map(item => ({
            ...item,
            imageUrl: item.imageUrl?.startsWith('data:') ? '' : item.imageUrl,
            images: (item.images || []).filter(img => !img.startsWith('data:')),
          }));
          localStorage.setItem('b2026_items', JSON.stringify(forStorage));
        } catch {}
      } catch (e) {
        console.warn('Fetch GitHub fallito, uso dati locali/bundle', e);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchFromGitHub();
  }, []); // solo al mount

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── GitHub token state ──
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem('b2026_github_token'));
  const [isGithubTokenModalOpen, setIsGithubTokenModalOpen] = useState(false);
  useEffect(() => {
    const anyOpen = isItemModalOpen || isLoginModalOpen || isHeroModalOpen || isGithubTokenModalOpen || isExplorePanelOpen || isMemoryModalOpen || isMobileMenuOpen || showAdminDropdown;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
  }, [isItemModalOpen, isLoginModalOpen, isHeroModalOpen, isGithubTokenModalOpen, isExplorePanelOpen, isMemoryModalOpen, isMobileMenuOpen, showAdminDropdown]);

  // ── persist ──
  const persist = async (updated: HeritageItem[]) => {
    const clean = updated.map(({ isFavorite, ...rest }) => rest);
    // Strip base64 images before saving to localStorage to avoid quota exceeded
    const forStorage = clean.map(item => ({
      ...item,
      imageUrl: item.imageUrl?.startsWith('data:') ? '' : item.imageUrl,
      images: (item.images || []).filter(img => !img.startsWith('data:')),
    }));
    try { localStorage.setItem('b2026_items', JSON.stringify(forStorage)); } catch {}
    setItems(updated);
    // Save to GitHub if token available
    const token = localStorage.getItem('b2026_github_token');
    if (token) {
      const ok = await saveItemsToGitHub(updated);
      if (ok) showNotif('Salvato su GitHub ✓');
      else showNotif('Salvato in locale (GitHub non raggiungibile)', 'error');
    }
  };

  // ── merged ──
  const mergedItems = useMemo(() => items.map(item => {
    const imageUrl = item.imageUrl || item.images?.[0] || 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80';
    let category = (item.category || '').trim() || 'Altro';
    const nl = item.name?.toLowerCase() || '';
    const cl = category.toLowerCase();
    if (cl.includes('illumin') || nl.includes('lampadario') || nl.includes('lampada')) category = 'Illuminazione';
    else if (cl.includes('poltron') || cl.includes('sedute') || nl.includes('poltrona') || nl.includes('divano')) category = 'Sedute';
    return { ...item, category, imageUrl, images: item.images || [], isFavorite: favorites.includes(item.id) };
  }).sort((a: any, b: any) => {
    const ha = a.order != null, hb = b.order != null;
    if (ha && hb) return Number(a.order) - Number(b.order);
    if (ha) return -1; if (hb) return 1; return 0;
  }), [items, favorites]);

  const currentItem = useMemo(() => selectedItem ? mergedItems.find(i => i.id === selectedItem.id) || null : null, [selectedItem, mergedItems]);
  const relatedItems = useMemo(() => currentItem ? mergedItems.filter(i => i.id !== currentItem.id && (i.category === currentItem.category || i.room === currentItem.room)).slice(0, 3) : [], [currentItem, mergedItems]);
  const currentItemIndex = useMemo(() => currentItem ? mergedItems.findIndex(i => i.id === currentItem.id) : -1, [currentItem, mergedItems]);
  const prevItem = useMemo(() => currentItemIndex > 0 ? mergedItems[currentItemIndex - 1] : null, [currentItemIndex, mergedItems]);
  const nextItem = useMemo(() => currentItemIndex < mergedItems.length - 1 ? mergedItems[currentItemIndex + 1] : null, [currentItemIndex, mergedItems]);

  const categoriesWithCount = useMemo(() => {
    const c: Record<string, number> = {};
    mergedItems.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return [{ name: 'Tutti', count: mergedItems.length }, ...Object.keys(c).sort().map(n => ({ name: n, count: c[n] }))];
  }, [mergedItems]);

  const statusFilters = ['Tutti', 'In vendita', 'Su Catawiki', 'In adozione'];

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedItems.filter(item => {
      const mc = selectedCategory === 'Tutti' || item.category === selectedCategory;
      const mf = !showFavoritesOnly || item.isFavorite;
      const mr = !selectedRoomFilter || selectedRoomFilter(item.room || '');
      const mq = !q || item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.room?.toLowerCase().includes(q);
      let ms = true;
      if (selectedStatus !== 'Tutti') {
        if (selectedStatus === 'In vendita') ms = item.status === 'Disponibile' && !item.catawikiUrl?.trim();
        else if (selectedStatus === 'Su Catawiki') ms = !!item.catawikiUrl?.trim();
        else if (selectedStatus === 'In adozione') ms = item.status === 'Affidato';
      }
      return mc && mf && ms && mr && mq;
    });
  }, [mergedItems, selectedCategory, selectedStatus, showFavoritesOnly, selectedRoomFilter, searchQuery]);

  // Reset visibleCount when filters change
  useEffect(() => { setVisibleCount(12); }, [selectedCategory, selectedStatus, selectedRoomFilter, searchQuery, showFavoritesOnly]);

  // ── infinite scroll ──
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(v => Math.min(v + 12, filteredItems.length));
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredItems.length, view]);

  const handleBackToCatalog = (target: ViewType = 'catalog') => {
    window.history.pushState({ view: target }, '', window.location.pathname);
    sessionStorage.removeItem('b2026_item_id');
    setSelectedCategory('Tutti'); setSelectedStatus('Tutti');
    setSelectedRoomFilter(null);
    setSearchQuery('');
    setVisibleCount(12);
    setShowFavoritesOnly(false); setView(target);
    setSelectedItem(null); setIsMobileMenuOpen(false);
  };

  const handleExploreConfirm = ({ category, roomMatch, catawikiOnly }: { category?: string; roomMatch?: (r: string) => boolean; catawikiOnly?: boolean }) => {
    setSelectedCategory(category || 'Tutti');
    setSelectedStatus(catawikiOnly ? 'Su Catawiki' : 'Tutti');
    setSelectedRoomFilter(roomMatch ? () => roomMatch : null);
    setSearchQuery('');
    setVisibleCount(12);
    setShowFavoritesOnly(false);
    setSelectedItem(null);
    window.history.pushState({ view: 'catalog' }, '', window.location.pathname);
    setView('catalog');
  };

  const openItem = (item: HeritageItem) => {
    setSelectedItem(item);
    setView('item-detail');
    window.history.pushState({ view: 'item-detail', itemId: item.id }, '', `?item=${item.id}`);
  };

  const handlePrepareCatawiki = async (item: HeritageItem) => {
    setIsPreparingCatawiki(true);
    try {
      const result = await prepareCatawikiWithAI(item);
      if (result) {
        // Merge risultato AI con dati esistenti dell'oggetto
        const enriched: HeritageItem = {
          ...item,
          catawikiTitle: result.catawikiTitle || item.catawikiTitle || item.name.slice(0, 60),
          catawikiCategory: result.catawikiCategory || item.catawikiCategory || '',
          catawikiSubcategory: result.catawikiSubcategory || item.catawikiSubcategory || '',
          catawikiStyle: result.catawikiStyle || item.catawikiStyle || '',
          catawikiMaterial: result.catawikiMaterial || item.catawikiMaterial || '',
          catawikiCountry: result.catawikiCountry || item.catawikiCountry || 'Italia',
          catawikiRestored: (result as any).catawikiRestored ?? item.catawikiRestored ?? false,
          catawikiDescription: result.catawikiDescription || item.catawikiDescription || '',
          catawikiShippingAvailable: item.catawikiShippingAvailable ?? (item.shipping === 'Spedizione possibile'),
          catawikiPickupAvailable: item.catawikiPickupAvailable ?? true,
          catawikiImages: item.catawikiImages?.length ? item.catawikiImages :
            [item.imageUrl, ...(item.images || [])].filter(Boolean).slice(0, 5) as string[],
        };
        setCatawikiItem(enriched);
        setIsCatawikiModalOpen(true);
      } else {
        alert('Nessun risultato. Riprova.');
      }
    } catch (e: any) { alert('Errore: ' + e.message); }
    finally { setIsPreparingCatawiki(false); }
  };

  const handleSaveCatawikiData = async (updated: HeritageItem) => {
    await persist(items.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
    setCatawikiItem(null);
    setIsCatawikiModalOpen(false);
    showNotif('Scheda Catawiki salvata ✓');
  };

  const toggleFavorite = (itemId: string, e?: React.MouseEvent | MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('b2026_favs', JSON.stringify(next));
      return next;
    });
  };

  const toggleFeatured = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const updated = items.map(i => i.id === itemId ? { ...i, isFeatured: !i.isFeatured } : i);
    await persist(updated);
    showNotif(updated.find(i => i.id === itemId)?.isFeatured ? '★ In evidenza' : 'Rimosso dall\'evidenza');
  };

  const handleAddStory = async () => {
    if (!currentItem || !newStoryText.trim()) return;
    const story: Memory = { id: genId(), author: 'Famiglia', text: newStoryText.trim(), date: new Date().toISOString().split('T')[0], itemId: currentItem.id };
    await persist(items.map(i => i.id === currentItem.id ? { ...i, stories: [...(i.stories || []), story] } : i));
    setNewStoryText('');
    showNotif('Racconto aggiunto ✓');
  };

  const handleSaveItem = async (itemData: HeritageItem) => {
    let updated: HeritageItem[];
    if (editingItem) {
      updated = items.map(i => i.id === editingItem.id ? itemData : i);
    } else {
      itemData.id = genId();
      itemData.order = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 1;
      updated = [...items, itemData];
    }
    await persist(updated);
    // Aggiorna selectedItem così la scheda riflette subito le modifiche
    if (editingItem && selectedItem?.id === editingItem.id) {
      setSelectedItem(itemData);
    }
    setIsItemModalOpen(false); setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    await persist(items.filter(i => i.id !== itemId));
    setItemToDelete(null); handleBackToCatalog();
    showNotif('Oggetto eliminato');
  };

  const handleLogin = (username: string, pwd: string, token?: string) => {
    if (USERS[username] && USERS[username] === pwd) {
      sessionStorage.setItem('b2026_user', username);
      setCurrentUser(username);
      if (token) {
        localStorage.setItem('b2026_github_token', token);
        setGithubToken(token);
      }
      setIsLoginModalOpen(false);
      showNotif(`Benvenuto, ${username}! ✓`);
    } else {
      showNotif('Username o password errati', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('b2026_user');
    localStorage.removeItem('b2026_github_token');
    setCurrentUser(null);
    setGithubToken(null);
    showNotif('Logout effettuato');
  };

  // ─── render ───────────────────────────────────────────────────────────────

  // 🧪 Lab: Reel V1 (solo gianmaria)
  if (isLab('memories-reel') && view === 'memories-reel') {
    return <MemoriesReelView memories={shuffledMemories} onClose={() => setView('home')} />;
  }
  // Reel V2 — versione ufficiale mobile
  if (view === 'memories-reel-v2') {
    return <MemoriesReelV2 memories={shuffledMemories} onClose={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-heritage-cream overflow-x-hidden">

      {/* Loader */}
      <AnimatePresence>
        {(isLoading || !dismissed) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-heritage-cream px-6">
            {/* Cover mosaico — solo quando aperto da menu/hero su desktop */}
            {showLoaderCover && loaderFromMenu && (
              <ReelCover
                memories={shuffledMemories}
                onStart={() => setShowLoaderCover(false)}
              />
            )}
            <AnimatePresence mode="wait">
              {loaderFromMenu ? (
                <DesktopMemoriesView memories={shuffledMemories} loaderIndex={loaderIndex} setLoaderIndex={setLoaderIndex} />
              ) : isLoading ? (
                /* Orologio a ritroso — stato di caricamento */
                <motion.div key="loader-clock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-6">
                  <p className="text-heritage-ink/30 text-[11px] uppercase tracking-[0.22em] font-sans">BARBERINO …./2026</p>
                  <svg ref={(el) => {
                    if (!el || el.dataset.ticks) return;
                    el.dataset.ticks = '1';
                    const svg = el.getElementById ? el : el;
                    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
                    for (let i = 0; i < 60; i++) {
                      const angle = (i/60)*Math.PI*2;
                      const isHour = i%5===0;
                      const r1 = 39, r2 = isHour ? 31 : 35;
                      const x1 = 50+Math.sin(angle)*r1, y1 = 50-Math.cos(angle)*r1;
                      const x2 = 50+Math.sin(angle)*r2, y2 = 50-Math.cos(angle)*r2;
                      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
                      line.setAttribute('x1',x1); line.setAttribute('y1',y1);
                      line.setAttribute('x2',x2); line.setAttribute('y2',y2);
                      line.setAttribute('stroke', isHour ? 'rgba(107,79,34,0.55)' : 'rgba(107,79,34,0.2)');
                      line.setAttribute('stroke-width', isHour ? '1.5' : '0.6');
                      line.setAttribute('stroke-linecap','round');
                      g.appendChild(line);
                    }
                    el.insertBefore(g, el.firstChild.nextSibling);
                  }} width="100" height="100" viewBox="0 0 100 100">
                    <style>{`
                      @keyframes clockBack { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                      @keyframes clockBackSlow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                    `}</style>
                    <circle cx="50" cy="50" r="44" fill="rgba(251,246,237,0.5)" stroke="rgba(197,160,89,0.3)" strokeWidth="0.8"/>
                    <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(197,160,89,0.1)" strokeWidth="0.4"/>
                    <g style={{transformOrigin:'50px 50px', animation:'clockBackSlow 36s linear infinite'}}>
                      <line x1="50" y1="54" x2="50" y2="28" stroke="rgba(58,37,16,0.65)" strokeWidth="2.5" strokeLinecap="round"/>
                    </g>
                    <g style={{transformOrigin:'50px 50px', animation:'clockBack 5s linear infinite'}}>
                      <line x1="50" y1="56" x2="50" y2="13" stroke="#C5A059" strokeWidth="1.2" strokeLinecap="round"/>
                      <polygon points="50,13 48.3,20 51.7,20" fill="#C5A059"/>
                    </g>
                    <circle cx="50" cy="50" r="2.8" fill="#C5A059" stroke="rgba(107,79,34,0.4)" strokeWidth="0.5"/>
                    <circle cx="50" cy="50" r="1" fill="rgba(58,37,16,0.7)"/>
                  </svg>
                  <canvas ref={(el) => {
                    if (!el || (el as any)._morphRunning) return;
                    (el as any)._morphRunning = true;
                    const ctx = el.getContext('2d')!;
                    const W = el.width, H = el.height;
                    const randYear = () => String(Math.floor(Math.random()*(2026-1870+1))+1870);
                    let from = randYear(), to = randYear(), p = 0;
                    const loop = () => {
                      p += 0.055;
                      if (p >= 1) { p = 0; from = to; to = randYear(); }
                      const t = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
                      ctx.clearRect(0,0,W,H);
                      ctx.font = 'italic 38px Georgia, serif';
                      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                      ctx.save(); ctx.globalAlpha=1-t; ctx.filter=`blur(${(t*5).toFixed(1)}px)`; ctx.fillStyle='#1C1A16'; ctx.fillText(from,W/2,H/2); ctx.restore();
                      ctx.save(); ctx.globalAlpha=t; ctx.filter=`blur(${((1-t)*5).toFixed(1)}px)`; ctx.fillStyle='#1C1A16'; ctx.fillText(to,W/2,H/2); ctx.restore();
                      requestAnimationFrame(loop);
                    };
                    loop();
                  }} width={160} height={52} style={{display:'block'}} />
                  <p className="text-heritage-ink/35 text-sm font-heritage italic">Raccogliendo memorie e oggetti…</p>
                </motion.div>
              ) : (
                /* Ricordo pronto — orologio sparisce, contenuto appare */
                <motion.div key="loader-single" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} className="flex flex-col items-center max-w-lg w-full gap-5">
                  <p className="text-heritage-ink/30 text-[11px] uppercase tracking-[0.22em] font-sans">BARBERINO …./2026</p>
                  {shuffledMemories[loaderIndex]?.imageUrl && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.9, ease: [0.22,1,0.36,1] }} className="w-full max-w-xs rounded-2xl overflow-hidden border border-heritage-ink/10" style={{aspectRatio:'4/3'}}>
                      <img src={shuffledMemories[loaderIndex]?.imageUrl} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  )}
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="text-heritage-ink/90 text-xl font-heritage italic leading-relaxed text-center">"{shuffledMemories[loaderIndex]?.text || ""}"</motion.p>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.7 }} className="flex flex-col items-center gap-0.5">
                    <p className="text-heritage-gold font-bold uppercase tracking-[0.2em] text-[12px]">— {shuffledMemories[loaderIndex]?.author || ""}</p>
                    {shuffledMemories[loaderIndex]?.date && <p className="text-heritage-ink/40 text-[11px] uppercase tracking-widest">{shuffledMemories[loaderIndex]?.date}</p>}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-8 h-14 flex items-center justify-center">
              {(!isLoading || loaderFromMenu) && (
                <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, duration: 0.6 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if (!loaderFromMenu) sessionStorage.setItem('b2026_loader_seen', '1'); setDismissed(true); setLoaderFromMenu(false); setShowLoaderCover(false); }} className="px-10 py-4 bg-heritage-ink text-heritage-cream rounded-full text-sm font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-heritage-olive transition-colors flex items-center gap-3">
                  {loaderFromMenu ? 'Rientra' : 'Entra'} <ArrowRight size={16} />
                </motion.button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="fixed top-5 md:top-10 left-0 right-0 z-50 px-4 md:px-8 flex justify-center pointer-events-none">
        <header className="w-full max-w-7xl pointer-events-auto bg-emerald-950/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] md:rounded-[3rem] text-white">
          <div className="px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-3">
              {/* Logo — collassato su item-detail */}
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => handleBackToCatalog('home')}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 group-hover:bg-white transition-colors flex-shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M12 7v5l3 3"/>
                  </svg>
                </div>
                {view === 'item-detail' ? (
                  <span className="text-sm font-bold font-serif text-white leading-none tracking-tight">B26</span>
                ) : (
                  <div>
                    <h1 className="text-sm md:text-lg font-bold font-serif text-white leading-none">Barberino2026</h1>
                    <p className="text-[11px] uppercase tracking-[0.55em] text-heritage-gold/80 font-medium mt-0.5">Archivio</p>
                  </div>
                )}
              </div>
              {/* Back to catalog — solo su item-detail */}
              {view === 'item-detail' && (
                <button onClick={() => handleBackToCatalog()} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors border-l border-white/10 pl-3">
                  <ArrowLeft size={14} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Catalogo</span>
                </button>
              )}
            </motion.div>

            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:flex items-center gap-8">
              <NavItem active={view === 'catalog'} onClick={() => { setExplorePanelMode('discover'); handleBackToCatalog('catalog'); setTimeout(() => setIsExplorePanelOpen(true), view === 'catalog' ? 0 : 300); }} icon={<Archive size={18} />} label="Gli Oggetti di Casa" />
              <NavItem active={false} onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} icon={<Handshake size={18} />} label="Vendita / Adozione" />
              <NavItem active={false} onClick={() => { setLoaderIndex(Math.floor(Math.random() * Math.max(shuffledMemories.length, 1))); setLoaderFromMenu(true); setDismissed(false); }} icon={<Heart size={18} />} label="Ricordi" />
            </motion.nav>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2 md:gap-3">
              {isSyncing && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                  <div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] uppercase tracking-widest font-bold text-white/60">Sync...</span>
                </div>
              )}
              {currentUser ? (
                <div className="flex items-center gap-2 md:gap-3">
                  {!githubToken && (
                    <button onClick={() => setIsLoginModalOpen(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-[11px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/30 transition-all">
                      ⚠️ Token
                    </button>
                  )}
                  <div className="relative hidden sm:block">
                    <div className="flex items-center bg-heritage-gold text-white rounded-full shadow-md overflow-hidden">
                      <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold hover:bg-heritage-gold/80 transition-colors">
                        <Plus size={15} /><span className="hidden lg:inline">Nuovo</span>
                      </button>
                      <button onClick={() => setShowNuovoDropdown((v: boolean) => !v)} className="hidden lg:flex items-center px-2 py-2 border-l border-white/20 hover:bg-heritage-gold/80 transition-colors" aria-label="Scegli tipo">
                        <ChevronRight size={13} className={`transition-transform ${showNuovoDropdown ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {showNuovoDropdown && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.13 }}
                          className="absolute left-0 top-11 w-44 bg-emerald-950 border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl">
                          <div className="p-1.5 flex flex-col gap-0.5">
                            <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setShowNuovoDropdown(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/85 hover:bg-white/10 transition-colors text-[12px] text-left font-bold">
                              <Archive size={14} className="text-heritage-gold" /> Oggetto
                            </button>
                            <button onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowNuovoDropdown(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/85 hover:bg-white/10 transition-colors text-[12px] text-left font-bold">
                              <BookHeart size={14} className="text-heritage-gold" /> Ricordo
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => { setShowAdminDropdown(!showAdminDropdown); setShowNuovoDropdown(false); setIsMobileMenuOpen(false); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${showAdminDropdown ? 'bg-heritage-gold/20 border-heritage-gold/40 text-heritage-gold' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      <User size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all text-white shadow-sm">
                  <User size={14} /><span className="hidden sm:inline">Accedi</span>
                </button>
              )}
              <button className="lg:hidden w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setShowAdminDropdown(false); }}>
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </motion.div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex flex-col p-6 gap-4">
                  <button onClick={() => { handleBackToCatalog('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); setExplorePanelMode('discover'); setIsMobileMenuOpen(false); setTimeout(() => setIsExplorePanelOpen(true), view === 'catalog' ? 0 : 300); }} className={`flex items-center gap-3 p-3 rounded-xl ${view === 'catalog' ? 'bg-white/10 text-white' : 'text-white/60'}`}><Archive size={20} /><span className="font-heritage text-lg">Gli Oggetti di Casa</span></button>
                  <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('how-it-works', view); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Handshake size={20} /><span className="font-heritage text-lg">Vendita / Adozione</span></button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Heart size={20} /><span className="font-heritage text-lg">Ricordi</span></button>
                </div>
              </motion.div>
            )}
            {/* Admin dropdown — stesso stile hamburger */}
            <AnimatePresence>
            {showAdminDropdown && currentUser && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
                  <div className="w-10 h-10 bg-heritage-gold rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">{currentUser.slice(0,2).toUpperCase()}</div>
                  <div>
                    <p className="text-white font-heritage italic text-lg leading-tight">{currentUser}</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Editor</p>
                  </div>
                </div>
                <div className="flex flex-col p-6 gap-4">
                  <button onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><BookHeart size={20} /><span className="font-heritage text-lg">Gestisci ricordi</span></button>
                  <button onClick={() => { downloadJson(items); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><Download size={20} /><span className="font-heritage text-lg">Scarica items.json</span></button>
                  <button onClick={async () => { if (!confirm('Azzerare il prezzo display di tutti gli oggetti?')) return; const updated = items.map(i => ({ ...i, displayPrice: '' })); await persist(updated); setShowAdminDropdown(false); showNotif('Prezzi aggiornati ✓'); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><Edit size={20} /><span className="font-heritage text-lg">Azzera prezzi display</span></button>
                  <button onClick={() => { exportCatawikiTxt(items); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"><ExternalLink size={20} /><span className="font-heritage text-lg">Esporta Catawiki</span></button>
                  {currentUser === 'gianmaria' && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 font-bold">🧪 Lab</p>
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors" onClick={() => toggleLab('memories-reel')}>
                        <span className="flex items-center gap-3 text-white/60"><BookHeart size={20} /><span className="font-heritage text-lg">Reel Ricordi</span></span>
                        <span className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${labFeatures['memories-reel'] ? 'bg-heritage-gold' : 'bg-white/15'}`}>
                          <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${labFeatures['memories-reel'] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </div>
                      {labFeatures['memories-reel'] && (
                        <button onClick={() => { setView('memories-reel'); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-heritage-gold hover:bg-white/10 transition-colors w-full mt-1">
                          <span className="font-heritage text-lg">▶ Apri Reel v1</span>
                        </button>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors mt-1" onClick={() => toggleLab('memories-reel-v2')}>
                        <span className="flex items-center gap-3 text-white/60"><BookHeart size={20} /><span className="font-heritage text-lg">Reel v2 (loader)</span></span>
                        <span className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${labFeatures['memories-reel-v2'] ? 'bg-heritage-gold' : 'bg-white/15'}`}>
                          <span className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${labFeatures['memories-reel-v2'] ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </div>
                      {labFeatures['memories-reel-v2'] && (
                        <button onClick={() => { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-heritage-gold hover:bg-white/10 transition-colors w-full mt-1">
                          <span className="font-heritage text-lg">▶ Apri Reel v2</span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2">
                    <button onClick={() => { handleLogout(); setShowAdminDropdown(false); }} className="flex items-center gap-3 p-3 rounded-xl text-red-400/70 hover:bg-red-500/10 transition-colors w-full"><LogOut size={20} /><span className="font-heritage text-lg">Esci</span></button>
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </AnimatePresence>
        </header>
      </motion.div>

      {/* Views */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence>

          {/* ── HOME ── */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full">
              <section className="relative min-h-screen flex items-end overflow-hidden mb-24">
                <motion.div className="absolute inset-0 z-0" style={{ y: heroParallax }}>
                  <img src={heroImageUrl} className="w-full h-full object-cover object-right" alt="Barberino2026" />
                  <div className="absolute inset-0 bg-heritage-ink/10" />
                </motion.div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pb-44 md:pb-20">
                  {isAdmin && (
                    <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
                      <button onClick={() => setIsHeroModalOpen(true)} title="Cambia sfondo" className="w-9 h-9 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white/60 hover:text-white rounded-full border border-white/10 transition-all">
                        <ImageIcon size={14} />
                      </button>
                    </div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-md md:max-w-xl lg:max-w-[60%] xl:max-w-[70%] p-6 md:py-6 md:px-0 space-y-3 md:space-y-4">
                    <div>
                      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="text-heritage-gold text-[11px] uppercase tracking-[0.35em] font-bold mb-1 block">1 Corso Corsini</motion.span>
                      <h2 className="text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] leading-[1.02] font-serif text-white italic"><motion.span initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="block">Una casa che <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">cambia,</span></motion.span><motion.span initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="block">memorie che <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">restano.</span></motion.span></h2>
                    </div>
                    <p className="text-base md:text-lg text-white/75 leading-snug font-heritage italic">"Ogni oggetto che parte porta con sé un frammento di noi. Lo affidiamo a chi saprà amarlo."</p>
                    <div className="pt-1 flex flex-wrap items-center gap-3">
                      <button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="min-w-[200px] px-7 py-3.5 bg-heritage-gold text-white rounded-full font-bold uppercase tracking-widest text-[11px] md:text-[12px] hover:bg-white hover:text-heritage-ink transition-all shadow-xl group flex items-center justify-center gap-3">
                        Entra in Casa <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button onClick={() => { if (window.innerWidth < 1024) { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); } else { setLoaderIndex(0); setLoaderFromMenu(true); setDismissed(false); setShowLoaderCover(true); history.pushState({ loaderOpen: true }, ""); } }} className="min-w-[200px] px-7 py-3.5 bg-white/10 backdrop-blur-sm text-white border border-white/25 rounded-full font-bold uppercase tracking-widest text-[11px] md:text-[12px] hover:bg-white/20 transition-all group flex items-center justify-center gap-3">
                        Rivivi la storia <Heart size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">

                {/* ── SEZIONE 1: IN VENDITA / CATAWIKI / ADOZIONE ── */}
                <section className="border-y border-heritage-gold/15 -mx-4 md:-mx-6 px-4 md:px-6 py-2 md:py-16 mb-0 bg-heritage-cream/40">
                  <div className="max-w-4xl mx-auto">
                    <ScrollReveal><div className="flex items-center gap-3 mb-6"><span className="w-4 h-px bg-heritage-gold" /><span className="text-heritage-gold text-lg">✦</span><span className="w-4 h-px bg-heritage-gold" /></div><span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Scegli il tuo percorso</span>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Non stiamo vendendo oggetti.</span><br /><span className="font-serif italic text-heritage-gold">Stiamo affidando</span> <span className="font-display font-medium tracking-tight text-heritage-gold not-italic">ricordi.</span></h2>
                    </ScrollReveal>
                    <div className="w-11 h-px bg-heritage-gold opacity-70 my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                      <ScrollReveal delay={0.05}><div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">€</div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold mb-3 text-[13px]">Acquista</p>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage">Scegli l'oggetto che ti ha colpito e scrivici. Trattiamo insieme — siamo persone, non un negozio.</p>
                      </div></ScrollReveal>
                      <ScrollReveal delay={0.12}><div className="border border-heritage-gold/25 rounded-2xl p-7 bg-heritage-gold/8 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-gold/[0.06] leading-none pointer-events-none select-none">⟡</div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold text-[13px]">Partecipa all'asta</p>
                          <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2 py-0.5 rounded-full">asta</span>
                        </div>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage mb-4">Alcuni pezzi di pregio sono su Catawiki. Fai la tua offerta e portalo a casa attraverso la piattaforma.</p>
                        <div className="bg-heritage-gold/5 border border-heritage-gold/20 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2.5 py-1 rounded-full">Su Catawiki</span>
                            <ExternalLink size={10} className="text-heritage-gold/50" />
                          </div>
                          <p className="text-[13px] leading-relaxed text-heritage-ink italic font-heritage">Nel catalogo troverai questo badge con link diretto all'asta.</p>
                        </div>
                      </div></ScrollReveal>
                      <ScrollReveal delay={0.19}><div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden h-full">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">♡</div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold mb-3 text-[13px]">Adotta</p>
                        <p className="text-[17px] leading-relaxed text-heritage-ink font-heritage">Per alcuni oggetti non chiediamo nulla. Solo che vadano nelle mani giuste — qualcuno che li ami come li amava papà.</p>
                      </div></ScrollReveal>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 2: GALLERY IN EVIDENZA ── */}
                <div className="mt-16 md:mt-20 relative pb-8">
                  {/* Header sezione */}
                  <div className="flex items-end justify-between mb-6">
                    <ScrollReveal><div>
                      <span className="text-heritage-gold text-[10px] uppercase tracking-[0.35em] font-bold block mb-2">In evidenza</span>
                      <h3 className="text-4xl md:text-5xl text-heritage-ink leading-tight"><span className="font-serif italic">Da non </span><span className="font-display font-bold tracking-tight text-emerald-950 not-italic">perdere</span></h3>
                    </div></ScrollReveal>
                    <button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="group text-[11px] font-bold uppercase tracking-widest text-heritage-gold flex items-center gap-3 hover:opacity-70 transition-opacity">
                      Vedi tutto
                      <span className="w-7 h-7 flex items-center justify-center border border-heritage-gold/30 rounded-full group-hover:bg-heritage-gold group-hover:text-white group-hover:border-heritage-gold transition-all">
                        <ChevronRight size={12} />
                      </span>
                    </button>
                  </div>


                  {/* Mobile: 6 oggetti 1-2-1-2 | Desktop: bento 3col 7 oggetti */}
                  {(() => {
                    const all = [...mergedItems.filter(i => i.isFeatured), ...mergedItems.filter(i => !i.isFeatured)];
                    const m6 = all.slice(0, 6);
                    const [main, b, c, wide, e5, e6, e7] = all.slice(0, 7);

                    const renderCard = (item: typeof main, extraCls: string, h: number, delay = 0) => !item ? null : (
                      <motion.div
                        key={item.id}
                        className={`rounded-2xl overflow-hidden relative cursor-pointer group ${extraCls}`}
                        style={{minHeight: h}}
                        initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay }}
                        onClick={() => openItem(item)}
                      >
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700" /> : <div className="absolute inset-0 bg-heritage-ink/15" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/80 via-heritage-ink/20 to-transparent" />
                        {isAdmin && <button onClick={e => toggleFeatured(item.id, e)} className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all ${item.isFeatured ? 'bg-heritage-gold text-white' : 'bg-black/30 text-white/50 border border-white/20'}`}>★</button>}
                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                          <p className="text-heritage-gold text-[10px] uppercase tracking-[0.2em] font-bold mb-0.5">{item.category}</p>
                          <h4 className="text-white text-[19px] md:text-2xl leading-tight mb-0.5 line-clamp-3 w-[70%]"><span className="font-serif italic">{item.name.split(' ')[0]} </span><span className="font-sans font-bold">{item.name.split(' ').slice(1).join(' ')}</span></h4>
                          {item.catawikiUrl || isAdozione(item)
                            ? null
                            : (item as any).displayPrice && <p className="text-heritage-gold font-serif italic text-xs md:text-sm">{(item as any).displayPrice}</p>}
                        </div>
                      </motion.div>
                    );

                    return (
                      <>
                        {/* MOBILE — 1-2-1-2 */}
                        <div className="md:hidden flex flex-col gap-2">
                          {renderCard(m6[0], '', 300)}
                          <div className="grid grid-cols-2 gap-2">
                            {renderCard(m6[1], '', 200, 0.05)}
                            {renderCard(m6[2], '', 200, 0.1)}
                          </div>
                          {renderCard(m6[3], '', 300, 0.15)}
                          <div className="grid grid-cols-2 gap-2">
                            {renderCard(m6[4], '', 200, 0.2)}
                            {renderCard(m6[5], '', 200, 0.25)}
                          </div>
                        </div>

                        {/* DESKTOP — bento 3col */}
                        <div className="hidden md:grid md:grid-cols-3 gap-3">
                          {renderCard(main, 'md:row-span-2', 560)}
                          {renderCard(b, '', 230, 0.1)}
                          {renderCard(c, '', 230, 0.15)}
                          {renderCard(wide, 'md:col-span-2', 360, 0.2)}
                          {renderCard(e5, '', 280, 0.25)}
                          {renderCard(e6, '', 280, 0.3)}
                          {renderCard(e7, '', 280, 0.35)}
                        </div>
                      </>
                    );
                  })()}
                </div>

                </div>{/* chiude gallery full-width */}

              {/* ── SEZIONE 3: TRE PASSI — full width dark ── */}
              <section id="how-it-works" className="w-full py-10 md:py-14 bg-heritage-ink mt-10 md:mt-20" style={{ scrollMarginTop: '120px' }}>
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <ScrollReveal><div className="flex items-center gap-3 mb-6"><span className="w-4 h-px bg-heritage-gold" /><span className="text-heritage-gold text-lg">✦</span><span className="w-4 h-px bg-heritage-gold" /></div><span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Come funziona</span>
                  <h2 className="text-4xl md:text-5xl text-white leading-tight mb-2"><span className="font-serif italic">Semplice, umano.</span><br /><span className="font-serif italic text-heritage-gold">Da casa </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">a casa.</span></h2>
                  </ScrollReveal><div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                    {[
                      { n: '01', t: 'Sfoglia', b: 'Esplora il catalogo, trova quello che ti colpisce. Ogni oggetto ha un nome, una stanza, una storia. Alcuni sono su Catawiki.' },
                      { n: '02', t: 'Scrivici', b: 'Un messaggio WhatsApp basta — siamo persone, non un negozio. Ci accordiamo insieme su tutto.' },
                      { n: "03", t: "Porta a casa", b: "Ritiro a Cinisello Balsamo o spedizione concordata. L'oggetto riparte. Il ricordo resta." },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col gap-4">
                        <div className="font-serif text-[72px] text-heritage-gold opacity-60 leading-none">{s.n}</div>
                        <div className="w-7 h-px bg-heritage-gold opacity-60" />
                        <p className="text-[14px] tracking-[0.25em] uppercase font-bold text-white">{s.t}</p>
                        <p className="text-[17px] leading-loose text-white/70 italic font-heritage">{s.b}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center md:justify-start">
                    <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[12px] font-bold tracking-[0.2em] uppercase">
                      <WhatsAppIcon size={15} color="#fff" /> Scrivici su WhatsApp
                    </a>
                  </div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">{/* riapre max-w-7xl dopo Come funziona */}

                {/* ── SEZIONE 4: LA NOSTRA STORIA ── */}
                <section className="mt-10 md:mt-20 pt-8 md:pt-12 border-t border-heritage-ink/8">
                  <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">La nostra storia</span>
                  <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">La casa della</span><br /><span className="font-serif italic text-heritage-gold">famiglia </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">Manescalchi/Giorgi</span></h2>
                  <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start">
                    <div className="md:col-span-3 flex flex-col gap-8">
                      {[
                        { k: 'La casa', v: 'Ci sono case che sono più di quattro mura. Quella di Barberino di Mugello è cresciuta per oltre 160 anni, pezzo dopo pezzo, stagione dopo stagione. Ogni stanza aveva il suo carattere, ogni angolo il suo odore.' },
                        { k: 'Franco', v: 'Franco Manescalchi ci teneva a quella casa come a un essere vivente. Ogni mobile, ogni lampadario, ogni specchio era arrivato lì con una ragione — e ci era rimasto perché aveva trovato il suo posto.' },
                        { k: 'La scelta', v: 'Così hanno deciso: non vendere, ma affidare. Trovare persone che amino questi oggetti come li amava papà. Perché i ricordi non finiscono — continuano in chi li accoglie.' },
                      ].map((item, i) => (
                        <div key={i}>
                          <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-3">{item.k}</p>
                          <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage">{item.v}</p>
                          {i < 2 && <div className="w-px h-6 bg-heritage-gold/20 mt-8" />}
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-4">
                      <div className="bg-heritage-ink rounded-2xl px-8 py-10 text-center">
                        <div className="font-serif text-[68px] text-heritage-gold leading-none italic mb-2">160+</div>
                        <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-white/50">anni di storia</p>
                      </div>
                      <div className="bg-white rounded-2xl p-7 border border-heritage-ink/8">
                        <p className="font-serif text-[16px] leading-relaxed text-heritage-ink italic opacity-90 mb-4">"I ricordi che portano con sé non finiscono con noi. Sono per sempre."</p>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-heritage-gold">Aleria, Olivia ed Emanuela</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 5: LE VOCI DI CASA ── */}
                <section className="mt-10 md:mt-20 -mx-4 md:-mx-6 px-4 md:px-6 py-10 md:py-16 bg-heritage-cream/60">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end justify-between mb-4">
                      <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold">I ricordi di famiglia</span>
                      {visibleMemories.length > 0 && (
                        <button onClick={() => { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); }} className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-heritage-ink text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                          <BookHeart size={11} className="text-heritage-gold" /> Sfoglia
                        </button>
                      )}
                    </div>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Le voci </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">di casa</span></h2>
                    <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                    {/* Grid 3 colonne — card grande a sx su 2 righe */}
                    {visibleMemories.length === 0 ? (
                      <div className="text-center py-12 text-heritage-ink/30 italic font-heritage col-span-3">
                        {isSyncing ? 'Caricamento ricordi...' : 'Nessun ricordo ancora.'}
                      </div>
                    ) : (<>
                    <div className="hidden md:grid gap-4" style={{gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto'}}>
                      {shuffledMemories[0] && (() => { const mem = shuffledMemories[0]; const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col" style={{gridColumn: '1', gridRow: '1 / 3'}}>
                          {photo && <div className="overflow-hidden" style={{height: '240px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-6 pb-0" style={{height:'60px'}}><span className="font-serif text-5xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-6 flex flex-col flex-1 gap-4">
                            <p className="text-lg leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-4 mt-auto">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })()}
                      {shuffledMemories.slice(1, 5).map((mem: FamilyMemory, i: number) => { const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div key={mem.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="overflow-hidden" style={{height: '120px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-5 pb-0" style={{height:'40px'}}><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col flex-1 gap-3">
                            <p className="text-[15px] leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-2 border-t border-heritage-ink/8 pt-3 mt-auto">
                              <div className="w-6 h-6 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[10px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[12px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[9px] tracking-widest uppercase text-heritage-gold font-bold">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    {/* Mobile: 3 card verticali */}
                    <div className="md:hidden flex flex-col gap-4">
                      {shuffledMemories.slice(0, 3).map((mem: FamilyMemory, i: number) => { const photo = mem.imageUrl || null; const ini = mem.author.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase(); return (
                        <motion.div key={mem.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="h-48 overflow-hidden"><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="h-10 bg-heritage-cream/60 flex items-end px-5 pb-0"><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col gap-3">
                            <p className="text-base leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-3">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{ini}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.date}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    </>)}
                    {/* Link vedi tutti */}
                    <div className="flex justify-center mt-10">
                      <button onClick={() => { if (window.innerWidth < 1024) { setView('memories-reel-v2'); history.pushState({ reelOpen: true, prevView: 'home' }, ''); } else { setLoaderIndex(0); setLoaderFromMenu(true); setDismissed(false); setShowLoaderCover(true); history.pushState({ loaderOpen: true }, ""); } }} className="group flex items-center gap-3 px-8 py-4 bg-heritage-ink text-heritage-cream rounded-full text-[12px] font-bold uppercase tracking-widest hover:bg-heritage-olive transition-all shadow-lg">
                        Leggi tutti i ricordi <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </section>

              </div>{/* chiude max-w-7xl per Contatti full-width */}

              {/* ── SEZIONE 6: CONTATTI — full width cream ── */}
              <section className="w-full mt-12 md:mt-16 py-12 md:py-16 bg-[#EDE4D0]">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
                    <div>
                      <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Contatti</span>
                      <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Hai visto qualcosa</span><br /><span className="font-serif italic text-heritage-gold">che ti </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">parla?</span></h2>
                      <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-8" />
                      <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage mb-8">Non sei sicuro, vuoi vedere un oggetto dal vivo, o vuoi seguire un'asta su Catawiki? Ogni messaggio è il benvenuto. Rispondiamo entro poche ore.</p>
                      <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 py-4 bg-[#25D366] text-white rounded-full text-[12px] font-bold tracking-[0.2em] uppercase">
                        <WhatsAppIcon size={14} color="#fff" /> Scrivici su WhatsApp
                      </a>
                    </div>
                    <div className="flex flex-col gap-3 md:pt-14">
                      {[
                        { icon: <MapPin size={16} className="text-heritage-gold" />, label: 'Dove siamo', title: 'Viale Veneto 1', sub: 'Cinisello Balsamo (MI)', dark: false },
                        { icon: <History size={16} className="text-heritage-gold" />, label: 'Disponibilità', title: 'Su appuntamento', sub: 'Risposta garantita entro poche ore', dark: false },
                        { icon: <ArrowRight size={16} className="text-heritage-gold" />, label: 'Spedizione', title: 'Concordata insieme', sub: 'Tutta Italia', dark: false },
                        { icon: <ExternalLink size={16} className="text-heritage-gold" />, label: 'Aste online', title: 'Catawiki', sub: 'Pezzi selezionati', dark: true },
                      ].map((row, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 py-5 rounded-2xl border ${row.dark ? 'bg-heritage-ink border-heritage-ink' : 'bg-white border-heritage-ink/8'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${row.dark ? 'bg-heritage-gold/15' : 'bg-heritage-cream'}`}>{row.icon}</div>
                          <div>
                            <p className="text-[11px] tracking-[0.3em] uppercase font-bold text-heritage-gold mb-1">{row.label}</p>
                            <p className={`text-[15px] font-bold ${row.dark ? 'text-white' : 'text-heritage-ink'}`}>{row.title}</p>
                            <p className={`text-[14px] mt-0.5 ${row.dark ? 'text-white/60' : 'text-heritage-ink/65'}`}>{row.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

            </motion.div>
          )}

          {/* ── CATALOG ── */}
          {view === 'catalog' && (
            <motion.div key="catalog" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="max-w-7xl mx-auto px-4 md:px-6 pt-[180px] md:pt-[300px] pb-12">

              {/* Mobile title - in flow */}
              <div className="md:hidden mb-8">
                <h2 className="text-3xl font-serif italic text-heritage-ink leading-tight mb-2">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                <p className="text-heritage-ink/80 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
              </div>

              {/* Fixed block desktop: copre dall'alto fino alla filter bar */}
              {/* Desktop: blocco fisso con titolo + ricerca in alto, categorie sotto */}
              <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-heritage-cream shadow-[0_8px_32px_0_rgba(30,25,20,0.08)]">
                <div className="max-w-7xl mx-auto px-6">
                  {/* Riga titolo + ricerca + stato */}
                  <div className="pt-[156px] pb-3 flex items-end justify-between gap-8">
                    <div>
                      <h2 className="text-3xl md:text-5xl font-serif italic text-heritage-ink leading-tight mb-1">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                      <p className="text-heritage-ink/60 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
                    </div>
                    <div className="flex items-center gap-3 pb-1">
                      {/* Ricerca */}
                      <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca oggetto..." className="w-48 focus:w-64 transition-all duration-300 bg-white border border-heritage-ink/12 rounded-full px-4 py-2 text-[13px] focus:outline-none focus:border-heritage-gold placeholder-heritage-ink/30" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-heritage-ink/30 hover:text-heritage-ink"><X size={13} /></button>}
                      </div>
                      {/* Stato */}
                      <div className="flex items-center gap-1.5">
                        {statusFilters.map(s => <button key={s} onClick={() => { setSelectedStatus(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-3 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white/50 text-heritage-ink/50 hover:text-heritage-ink'}`}>{s}</button>)}
                      </div>
                      {isAdmin && <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`p-2 rounded-full transition-all border ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white/50 border-heritage-ink/5 text-heritage-ink/50'}`}><Heart size={15} fill={showFavoritesOnly ? 'currentColor' : 'none'} /></button>}
                    </div>
                  </div>
                  {/* Riga categorie */}
                  <div className="flex items-center gap-1.5 pb-3 border-t border-heritage-ink/6 pt-2.5">
                    {categoriesWithCount.map(cat => (
                      <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'text-heritage-ink/50 hover:text-heritage-ink'}`}>
                        <span>{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-white/20 text-white' : 'bg-heritage-ink/8 text-heritage-ink/50'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile: blocco cream pieno che copre da top-0 a top-96px */}
              <div className="md:hidden fixed top-0 left-0 right-0 z-[49] bg-heritage-cream" style={{ height: '96px' }} />

              <div className="fixed top-[96px] md:top-[280px] left-0 right-0 z-40 bg-heritage-cream border-b border-heritage-ink/10 px-4 md:hidden py-3 shadow-[0_4px_16px_0_rgba(30,25,20,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex md:hidden w-full items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-gold mb-0.5">Filtri Attivi</span>
                      <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink italic truncate max-w-[200px]">
                        {selectedRoomFilter ? `Stanza · ${selectedCategory !== 'Tutti' ? selectedCategory : 'Tutti'}` : selectedCategory}
                        {selectedStatus !== 'Tutti' ? ` · ${selectedStatus}` : ''}
                      </span>
                    </div>
                    <button onClick={() => setIsMobileFilterOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-heritage-ink text-white rounded-full text-[12px] font-bold uppercase tracking-widest"><SlidersHorizontal size={14} /> Filtra</button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isMobileFilterOpen && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileFilterOpen(false)} className="fixed inset-0 bg-heritage-ink/40 backdrop-blur-sm z-[110]" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-heritage-cream z-[120] rounded-t-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                      <div className="w-12 h-1.5 bg-heritage-ink/10 rounded-full mx-auto mb-8" />
                      <div className="space-y-8 pb-12">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-serif">Filtra</h3>
                          <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedCategory('Tutti'); setSelectedStatus('Tutti'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[12px] uppercase font-bold tracking-widest text-heritage-gold">Reset</button>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-heritage-ink/5 rounded-full text-heritage-ink/65"><X size={24} /></button>
                          </div>
                        </div>
                        <div>
                          <div className="relative mb-4">
                          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca oggetto..." className="w-full bg-heritage-cream/40 border border-heritage-ink/12 rounded-2xl px-5 py-3 text-[15px] focus:outline-none focus:border-heritage-gold placeholder-heritage-ink/30" />
                          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-heritage-ink/40"><X size={16} /></button>}
                        </div>
                        <h4 className="text-[12px] uppercase font-bold tracking-widest text-heritage-ink/65 mb-4">Categorie</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoriesWithCount.map(cat => <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-4 py-3 rounded-xl text-[12px] uppercase tracking-widest font-bold transition-all text-left flex justify-between items-center ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'bg-white text-heritage-ink/65 border border-heritage-ink/5'}`}><span>{cat.name}</span><span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-heritage-ink/5 text-heritage-ink/20'}`}>{cat.count}</span></button>)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[12px] uppercase font-bold tracking-widest text-heritage-ink/65 mb-4">Stato</h4>
                          <div className="flex flex-wrap gap-2">
                            {statusFilters.map(s => <button key={s} onClick={() => { setSelectedStatus(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-4 py-2 rounded-full text-[12px] uppercase tracking-widest font-bold ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white border border-heritage-ink/10 text-heritage-ink/65'}`}>{s}</button>)}
                          </div>
                        </div>
                        {isAdmin && favorites.length > 0 && (
                          <button onClick={() => { setShowFavoritesOnly(p => !p); setIsMobileFilterOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-bold text-[13px] uppercase tracking-[0.15em] transition-all ${showFavoritesOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-heritage-ink/10 text-heritage-ink'}`}>
                            <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                            I miei preferiti · {favorites.length}
                          </button>
                        )}
                        <button onClick={() => setIsMobileFilterOpen(false)} className="w-full flex items-center justify-center py-4 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-[0.2em] hover:bg-heritage-ink/90 transition-colors">Mostra Risultati</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="hidden md:block h-20" />
              {/* Risultati */}
              <div className="flex flex-wrap gap-4 md:gap-8">
                {filteredItems.slice(0, visibleCount).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index % 12, 11) * 0.055, ease: [0.22, 1, 0.36, 1] }}
                    className={`${(item.catawikiUrl || (item as any).isImportant || item.isFeatured) ? 'basis-full md:flex-grow md:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]' : 'flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]'}`}>
                    <ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onToggleFeatured={isAdmin ? toggleFeatured : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} showFeaturedBadge isHighlight={!!(item.catawikiUrl || item.isFeatured || (item as any).isImportant)} />
                  </motion.div>
                ))}
                {filteredItems.length === 0 && !isSyncing && (
                  <div className="w-full py-20 text-center border border-dashed border-heritage-ink/10 rounded-2xl">
                    {searchQuery ? (
                      <div className="space-y-3">
                        <p className="text-heritage-ink/65 italic font-serif text-lg">Nessun risultato per "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery('')} className="text-heritage-gold text-[12px] font-bold uppercase tracking-widest hover:underline">Cancella ricerca</button>
                      </div>
                    ) : (
                      <p className="text-heritage-ink/65 italic font-serif">Nessun oggetto trovato.</p>
                    )}
                  </div>
                )}
              </div>
              {/* Infinite scroll trigger */}
              {visibleCount < filteredItems.length && (
                <div ref={loaderRef} className="w-full flex justify-center py-10">
                  <div className="flex items-center gap-3 text-heritage-ink/40">
                    <div className="w-4 h-4 border-2 border-heritage-ink/20 border-t-heritage-gold rounded-full animate-spin" />
                    <span className="text-[12px] uppercase tracking-widest font-bold">Carico altri...</span>
                  </div>
                </div>
              )}
              {visibleCount >= filteredItems.length && filteredItems.length > 12 && (
                <p className="text-center text-[11px] uppercase tracking-widest font-bold text-heritage-ink/25 py-8">
                  {filteredItems.length} oggetti · fine catalogo
                </p>
              )}
            </motion.div>
          )}

          {/* ── DETAIL ── */}
          {view === 'item-detail' && currentItem && (
            <motion.div key={currentItem.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="pb-32 md:pb-12 bg-heritage-cream">

              {/* ── MOBILE HERO — foto + overlay con titolo e prezzo ── */}
              <div className="md:hidden relative" style={{marginTop: '-1px'}}>
                {/* Foto hero */}
                <div
                  className="relative overflow-hidden bg-heritage-ink/10 cursor-zoom-in"
                  style={{aspectRatio: "4/5", maxHeight: "70vh"}}
                  onClick={() => {
                    const imgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                    setLightboxImages(imgs);
                    setLightboxIndex(0);
                    setIsLightboxOpen(true);
                  }}
                >
                  {currentItem.imageUrl && <motion.img initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} src={currentItem.imageUrl} alt={currentItem.name} className="w-full h-full object-cover" />}
                  {!currentItem.imageUrl && <div className="w-full h-full flex items-center justify-center"><Camera size={48} className="text-heritage-ink/20" /></div>}

                  {/* Gradiente dal basso */}
                  <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/80 via-heritage-ink/20 to-transparent" />
                  {/* Hint lightbox — lente in alto a dx */}
                  <div className="absolute right-4 w-12 h-12 flex items-center justify-center rounded-full pointer-events-none" style={{top: "100px", background: "rgba(0,0,0,0.12)", filter: "saturate(0)"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>



                  {/* Bottom overlay: categoria + titolo + prezzo + badge */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    {/* Categoria */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-px bg-heritage-gold" />
                      <span className="text-heritage-gold text-[10px] uppercase tracking-[0.25em] font-bold">{currentItem.category}</span>
                    </div>
                    {/* Titolo — serif + sans serif */}
                    <h2 className="text-white leading-tight mb-3" style={{fontSize: '32px'}}>
                      <span className="font-serif italic">{currentItem.name.split(' ')[0]} </span>
                      <span className="font-display font-bold not-italic tracking-tight text-white">{currentItem.name.split(' ').slice(1).join(' ')}</span>
                    </h2>
                    {/* Prezzo + badge */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">Prezzo</p>
                        {currentItem.catawikiUrl ? (
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-[#7B1818]/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            Catawiki <ExternalLink size={10} />
                          </a>
                        ) : isAdozione(currentItem) ? (
                          <p className="text-white/70 font-serif italic text-xl">{getAdozioneLabel(currentItem)}</p>
                        ) : (
                          <>
                            <p className="text-heritage-gold font-serif italic text-2xl">{(currentItem as any).displayPrice || 'Su richiesta'}</p>
                            {isAdmin && (currentItem as any).displayPrice && (currentItem.price || currentItem.estimatedValue) && (
                              <p className="text-white/40 text-[10px] mt-0.5">rif. {currentItem.price || currentItem.estimatedValue}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(currentItem.images?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                            <ImageIcon size={11} className="text-white/80" />
                            <span className="text-white/80 text-[11px] font-bold">{1 + (currentItem.images?.length ?? 0)}</span>
                          </div>
                        )}
                        {(() => { const b = getPublicBadge(currentItem.status, (currentItem as any).acquisitionType); return (b.label === 'Disponibile' || b.label === 'In adozione') ? <span className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full"><span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" /></span><span className="text-white/80 text-[9px] font-bold uppercase tracking-wider">{b.label}</span></span> : <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full ${b.cls}`}>{b.label}</span>; })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strip miniature foto */}
                {(() => {
                  const allImgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                  return allImgs.length > 1 ? (
                    <div className="flex gap-2 px-4 py-3 bg-[#EDE4D0] border-b border-heritage-ink/8 overflow-x-auto" style={{scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', flexWrap: 'nowrap', touchAction: 'pan-x'}}>
                      {allImgs.map((img, i) => (
                        <button key={i} onClick={() => { setLightboxImages(allImgs); setLightboxIndex(i); setIsLightboxOpen(true); }}
                          style={{touchAction: 'manipulation'}}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === 0 ? 'border-heritage-gold' : 'border-transparent'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-48 bg-heritage-cream">

              {/* Desktop: back + prev/next */}
              <div className="hidden md:flex items-center justify-between mb-8">
                <button onClick={() => handleBackToCatalog()} className="flex items-center gap-2 text-heritage-ink/80 hover:text-heritage-ink group transition-colors"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-heritage">Ritorna alla Collezione</span></button>
                <div className="flex items-center gap-2">
                  {prevItem && <button onClick={() => openItem(prevItem)} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><ChevronLeft size={16} /><span>{prevItem.name.split(' ').slice(0,2).join(' ')}</span></button>}
                  {nextItem && <button onClick={() => openItem(nextItem)} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><span>{nextItem.name.split(' ').slice(0,2).join(' ')}</span><ChevronRight size={16} /></button>}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-16">
                {/* Desktop gallery */}
                <div className="hidden md:block space-y-8">
                  <ImageGallery
                    images={[currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[]}
                    name={currentItem.name}
                    status={currentItem.status}
                    acquisitionType={(currentItem as any).acquisitionType}
                    catawikiUrl={currentItem.catawikiUrl}
                    onOpenLightbox={(i) => {
                      const imgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                      setLightboxImages(imgs);
                      setLightboxIndex(i);
                      setIsLightboxOpen(true);
                    }}
                  />
                </div>

                <div className="flex flex-col">
                  <div className="flex-1">

                    {/* Desktop: categoria + titolo */}
                    <div className="hidden md:block">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-heritage-gold uppercase tracking-[0.3em] text-[12px] font-bold"><span className="w-8 h-[1px] bg-heritage-gold" />{currentItem.category}</div>
                        {isAdmin && <button onClick={e => toggleFavorite(currentItem.id, e)} className={`p-2.5 rounded-full transition-all border ${currentItem.isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-heritage-ink/5 border-heritage-ink/10 text-heritage-ink/65'}`}><Heart size={18} fill={currentItem.isFavorite ? 'currentColor' : 'none'} /></button>}
                      </div>
                      <h2 className="text-5xl md:text-6xl lg:text-6xl font-serif italic text-heritage-ink leading-[1.02] mb-8">
                        <span className="font-serif italic">{currentItem.name.split(' ')[0]} </span>
                        <span className="text-emerald-950 not-italic font-display font-bold tracking-tight">{currentItem.name.split(' ').slice(1).join(' ')}</span>
                      </h2>
                    </div>

                    {/* Admin tools — entrambe le viste */}
                    {isAdmin && (
                      <div className="flex gap-2 mb-5 flex-wrap">
                        <button onClick={() => { setEditingItem(currentItem); setIsItemModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-heritage-ink/8 text-heritage-ink rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-heritage-ink/15 transition-colors border border-heritage-ink/10"><Edit size={12} />Modifica</button>
                        <button onClick={() => setItemToDelete(currentItem.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-400 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-100 border border-red-100"><Trash2 size={12} />Elimina</button>
                        <button
                          onClick={() => handlePrepareCatawiki(currentItem)}
                          disabled={isPreparingCatawiki}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all ${isPreparingCatawiki ? 'bg-[#7B1818]/10 text-[#7B1818]/50 border-[#7B1818]/20 cursor-wait' : currentItem.catawikiTitle ? 'bg-[#7B1818]/10 text-[#7B1818] border-[#7B1818]/30 hover:bg-[#7B1818]/20' : 'bg-[#7B1818] text-white border-[#7B1818] hover:bg-[#5a1212]'}`}
                        >
                          {isPreparingCatawiki ? <><div className="w-3 h-3 border-2 border-[#7B1818]/50 border-t-transparent rounded-full animate-spin" />Elaborazione...</> : <>{currentItem.catawikiTitle ? '✓ Scheda Catawiki' : 'Prepara per Catawiki'}</>}
                        </button>
                        {currentItem.catawikiTitle && (
                          <button onClick={() => exportSingleCatawiki(currentItem)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-green-100 border border-green-200 transition-all">
                            <Upload size={12} />Scarica scheda
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── CARATTERISTICHE — pillole su mobile, DetailBox su desktop ── */}
                    <div className="md:hidden mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-heritage-gold">Caratteristiche</span>
                        <div className="flex-1 h-px bg-heritage-ink/8" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentItem.room && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Stanza</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.room}</span>
                          </div>
                        )}
                        {currentItem.year && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Epoca</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.year}</span>
                          </div>
                        )}
                        {currentItem.dimensions && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Dimensioni</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.dimensions}</span>
                          </div>
                        )}
                        {currentItem.wearCondition && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Condizione</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.wearCondition}</span>
                          </div>
                        )}
                        {currentItem.destination && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Si trova a</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.destination}</span>
                          </div>
                        )}
                        {currentItem.shipping && (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Spedizione</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{currentItem.shipping}</span>
                          </div>
                        )}
                        {currentItem.catawikiUrl ? (
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                            className="flex flex-col bg-[#7B1818] rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-white/60">Asta</span>
                            <span className="text-[13px] font-bold text-white flex items-center gap-1">Catawiki <ExternalLink size={10} /></span>
                          </a>
                        ) : (!isAdozione(currentItem) && (currentItem as any).displayPrice) ? (
                          <div className="flex flex-col bg-white border border-heritage-ink/8 rounded-xl px-3 py-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink">Prezzo</span>
                            <span className="text-[14px] font-serif italic text-heritage-ink">{(currentItem as any).displayPrice}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Desktop: caratteristiche come DetailBox */}
                    <div className="hidden md:block mb-6 border-t border-heritage-ink/10 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                        <div>
                          <DetailBox label="Stanza" value={currentItem.room} />
                          <DetailBox label="Epoca" value={currentItem.year || 'N/D'} />
                          <DetailBox label="Dimensioni" value={currentItem.dimensions || 'N/D'} />
                          {currentItem.wearCondition && <DetailBox label="Condizione" value={currentItem.wearCondition} />}
                        </div>
                        <div>
                          <DetailBox label="Dove si trova" value={currentItem.destination || 'N/D'} />
                          {currentItem.shipping && <DetailBox label="Spedizione" value={currentItem.shipping} />}
                          {currentItem.catawikiUrl ? (
                            <div className="pt-1 pb-1">
                              <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-1.5">Prezzo</p>
                              <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-[#7B1818] text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[#5a1212] transition-colors">
                                Vedi su Catawiki <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <>
                              {isAdozione(currentItem)
                                ? <DetailBox label="Stato" value={getAdozioneLabel(currentItem) ?? ''} />
                                : <DetailBox label="Prezzo" value={(currentItem as any).displayPrice || 'Su richiesta'} />}
                              {isAdmin && (currentItem as any).displayPrice && (currentItem.price || currentItem.estimatedValue) && (
                                <DetailBox label="Prezzo rif. (admin)" value={currentItem.price || currentItem.estimatedValue || ''} />
                              )}
                            </>
                          )}
                          {currentItem.productCode && <DetailBox label="Codice" value={currentItem.productCode} />}
                        </div>
                      </div>

                    </div>

                    {/* Descrizione */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3 md:hidden">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-heritage-gold">Descrizione</span>
                        <div className="flex-1 h-px bg-heritage-ink/8" />
                      </div>
                      {(() => {
                        const hasCatawiki = !!(currentItem.catawikiTitle || currentItem.catawikiDescription);
                        return hasCatawiki ? (
                          <AntiquarianSection item={currentItem} />
                        ) : (
                          <>
                            <h4 className="hidden md:block font-serif text-xl mb-4 italic">Descrizione e Storia</h4>
                            <p className="text-lg leading-relaxed text-heritage-ink/85 font-light mb-6">{currentItem.description}</p>
                            {currentItem.technicalNotes && (
                              <div className="p-5 bg-white rounded-2xl border border-heritage-ink/8">
                                <h5 className="text-[10px] uppercase tracking-widest font-bold mb-2 text-heritage-gold">Note tecniche</h5>
                                <p className="text-sm italic leading-relaxed text-heritage-ink/80">{currentItem.technicalNotes}</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>



{/* Ricordi rimossi temporaneamente */}
                  </div>

                  {/* CTA desktop */}
                  <div className="hidden md:flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a href={`https://wa.me/393394468130?text=${encodeURIComponent(`Buongiorno, vorrei informazioni su:
${currentItem.name}
${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 px-8 py-5 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all group shadow-xl"><WhatsAppIcon size={18} color="white" /><span className="font-heritage font-medium">Contatta su WhatsApp</span></a>
                      <button onClick={() => { const u = `${window.location.origin}?item=${currentItem.id}`; navigator.share ? navigator.share({ title: currentItem.name, url: u }).catch(() => {}) : (navigator.clipboard.writeText(u), showNotif('Link copiato!')); }} className="flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-heritage-ink/10 text-heritage-ink rounded-full hover:border-heritage-gold hover:text-heritage-gold transition-all group shadow-xl"><Share2 size={18} /><span className="font-heritage font-medium">Condividi</span></button>
                    </div>
                    <div className="flex items-center justify-center gap-6 py-4 border-t border-heritage-ink/5 mt-2">
                      <span className="text-[12px] uppercase tracking-[0.2em] font-bold opacity-60">Condividi su:</span>
                      <div className="flex gap-4">
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${currentItem.name} - ${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-[#25D366] transition-all hover:scale-110"><WhatsAppIcon size={18} color="currentColor" /></a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Facebook size={18} /></a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}&text=${encodeURIComponent(currentItem.name)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Twitter size={18} /></a>
                        <a href={`mailto:?subject=${encodeURIComponent(`Heritage: ${currentItem.name}`)}&body=${encodeURIComponent(`${window.location.origin}?item=${currentItem.id}`)}`} className="p-2 text-heritage-ink/65 hover:text-heritage-gold transition-all hover:scale-110"><Mail size={18} /></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* ── MOBILE STICKY BAR — crema leggera ── */}
              <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220, delay: 0.15 }} className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-heritage-cream/95 backdrop-blur-sm border-t border-heritage-ink/8 px-4 pt-2" style={{paddingBottom: "max(10px, env(safe-area-inset-bottom, 8px))"}}>
                {/* Price + WhatsApp row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {currentItem.catawikiUrl ? (
                      <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#7B1818] text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        Catawiki <ExternalLink size={10} />
                      </a>
                    ) : (
                      <>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/40 leading-none mb-0.5">Prezzo</p>
                        <p className="text-heritage-ink font-serif italic text-base leading-none truncate">{getAdozioneLabel(currentItem) ?? ((currentItem as any).displayPrice || 'Su richiesta')}</p>
                      </>
                    )}
                  </div>
                  <a href={`https://wa.me/393394468130?text=${encodeURIComponent(`Buongiorno, vorrei informazioni su:
${currentItem.name}
${window.location.origin}?item=${currentItem.id}`)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#128C7E] hover:bg-[#0e7066] text-white px-5 py-2.5 rounded-full font-bold text-[12px] uppercase tracking-wider flex-shrink-0 transition-colors">
                    <WhatsAppIcon size={14} color="white" /> WhatsApp
                  </a>
                </div>
              </motion.div>

              {relatedItems.length > 0 && (
                <div className="mt-10 pt-8 border-t border-heritage-ink/10">
                  <h3 className="text-3xl md:text-4xl text-heritage-ink leading-tight mb-12"><span className="font-serif italic">Ti potrebbe </span><span className="font-display font-bold not-italic tracking-tight text-emerald-950">interessare</span></h3>
                  <div className="hidden md:block h-20" />
              <div className="flex flex-wrap gap-4 md:gap-8">
                    {relatedItems.map(item => <div key={item.id} className="flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]"><ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onToggleFeatured={isAdmin ? toggleFeatured : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} showFeaturedBadge /></div>)}
                  </div>
                </div>
              )}
              </div>{/* chiude max-w-7xl */}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {window.matchMedia('(min-width: 768px)').matches && (
      <footer className="site-footer bg-heritage-ink text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg>
                </div>
                <div>
                  <p className="font-serif font-bold text-white leading-none">Barberino2026</p>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-heritage-gold/70 mt-0.5">Archivio di Famiglia</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-serif italic leading-relaxed">Una casa che cambia, ricordi che restano. Ogni oggetto porta con sé un frammento di storia.</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-heritage-gold mb-5">Esplora</p>
              <ul className="space-y-3">
                <li><button onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">La storia</button></li>
                <li><button onClick={() => { setExplorePanelMode('discover'); setIsExplorePanelOpen(true); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">Il catalogo</button></li>
                <li><button onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">Vendita e adozione</button></li>
                <li><button onClick={() => { setLoaderIndex(Math.floor(Math.random() * Math.max(shuffledMemories.length, 1))); setLoaderFromMenu(true); setDismissed(false); }} className="text-white/60 hover:text-white transition-colors text-sm font-serif italic">I ricordi</button></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-heritage-gold mb-5">Contatti</p>
              <p className="text-white/50 text-sm mb-5 font-serif italic">Scrivici per qualsiasi oggetto — siamo persone, non un negozio.</p>
              <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#128C7E] hover:bg-[#0e7066] text-white rounded-full text-[12px] font-bold uppercase tracking-wider transition-all">
                <WhatsAppIcon size={15} color="white" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/25 text-[11px] font-serif italic">1 Corso Corsini · Barberino di Mugello · 2026</p>
            <p className="text-white/25 text-[11px]">Custodito per le generazioni future</p>
          </div>
        </div>
      </footer>
      )}

      {/* ── Modals ── */}

      {/* Catawiki Modal */}
      <AnimatePresence>
        {isCatawikiModalOpen && catawikiItem && (
          <CatawikiModal
            key={catawikiItem.id}
            item={catawikiItem}
            onClose={() => { setIsCatawikiModalOpen(false); setCatawikiItem(null); }}
            onSave={handleSaveCatawikiData}
          />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            name={currentItem?.name || ''}
            room={currentItem?.room}
            year={currentItem?.year}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* MemoryModal */}
      <AnimatePresence>
        {isMemoryModalOpen && (
          <MemoryModal
            isOpen={isMemoryModalOpen}
            onClose={() => {
              setIsMemoryModalOpen(false);
              const saved = sessionStorage.getItem('b2026_scroll');
              if (saved) setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }), 0);
            }}
            editingMemory={editingMemory}
            memories={memories}
            items={items}
            onSave={(updated) => { setMemories(updated); try { localStorage.setItem('b2026_memories', JSON.stringify(updated)); } catch {} setIsMemoryModalOpen(false); const saved = sessionStorage.getItem('b2026_scroll'); if (saved) setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }), 0); }}
            onPinSave={(updated) => { setMemories(updated); try { localStorage.setItem('b2026_memories', JSON.stringify(updated)); } catch {} }}
            onNotify={showNotif}
          />
        )}
      </AnimatePresence>

      {/* ExplorePanel */}
      <ExplorePanel
        isOpen={isExplorePanelOpen}
        onClose={() => setIsExplorePanelOpen(false)}
        totalItems={mergedItems.length}
        categoriesWithCount={categoriesWithCount}
        onExplore={handleExploreConfirm}
        mode={explorePanelMode}
        isAdmin={isAdmin}
        favorites={favorites}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => { setShowFavoritesOnly(p => !p); handleBackToCatalog('catalog'); }}
      />

      {/* Login */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={() => setIsLoginModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between">
                <div><h3 className="text-xl font-serif">Accesso Famiglia</h3><p className="text-[12px] uppercase tracking-widest text-heritage-ink/65 font-bold mt-1">Operatori autorizzati</p></div>
                <button onClick={() => setIsLoginModalOpen(false)} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
              </div>
              <LoginForm onLogin={handleLogin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Form */}
      <ItemModal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} initialData={editingItem} onDelete={id => setItemToDelete(id)} nextOrder={items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 1} />

      {/* Hero modal */}
      <HeroImageModal isOpen={isHeroModalOpen} onClose={() => setIsHeroModalOpen(false)} initialUrl={heroImageUrl} onSave={async url => {
              setHeroImageUrl(url);
              localStorage.setItem('b2026_hero', url);
              setIsHeroModalOpen(false);
              const ok = await saveSettingsToGitHub({ heroImageUrl: url });
              showNotif(ok ? 'Sfondo aggiornato su tutti i dispositivi ✓' : 'Sfondo aggiornato solo in locale');
            }} />

      {/* Delete confirm */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-heritage-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setItemToDelete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
              <h3 className="text-2xl font-serif mb-2">Sei sicuro?</h3>
              <p className="text-heritage-ink/80 mb-8 text-sm leading-relaxed">Questa operazione eliminerà definitivamente l'oggetto. Potrai recuperarlo solo dal file items.json.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setItemToDelete(null)} className="px-6 py-3 rounded-xl border border-heritage-ink/10 text-sm font-bold uppercase tracking-widest hover:bg-heritage-cream">Annulla</button>
                <button onClick={() => handleDeleteItem(itemToDelete)} className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg">Elimina</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-heritage-ink text-white border-heritage-ink'}`}>
            {notification.type === 'error' ? <X size={18} /> : <Check size={18} />}
            <span className="text-sm font-bold uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB mobile — solo admin, solo mobile */}
      <AnimatePresence>
        {isAdmin && !isItemModalOpen && !isMemoryModalOpen && view !== 'item-detail' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="sm:hidden fixed right-6 bottom-6 z-[150] flex flex-col items-end gap-2"
          >
            {!githubToken && (
              <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-full text-[11px] font-bold uppercase tracking-widest shadow-xl"
              >
                ⚠️ Token mancante
              </motion.button>
            )}
            <AnimatePresence>
              {showNuovoDropdown && (
                <>
                  <motion.button
                    initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0, y: 10 }}
                    transition={{ delay: 0.05 }} whileTap={{ scale: 0.92 }}
                    onClick={() => { sessionStorage.setItem('b2026_scroll', String(window.scrollY)); setEditingMemory(null); setIsMemoryModalOpen(true); setShowNuovoDropdown(false); }}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-950 text-white rounded-full text-[12px] font-bold shadow-lg border border-white/20"
                  >
                    <BookHeart size={16} className="text-heritage-gold" /> Ricordo
                  </motion.button>
                  <motion.button
                    initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0, y: 10 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setShowNuovoDropdown(false); }}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-950 text-white rounded-full text-[12px] font-bold shadow-lg border border-white/20"
                  >
                    <Archive size={16} className="text-heritage-gold" /> Oggetto
                  </motion.button>
                </>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowNuovoDropdown((v: boolean) => !v)}
              className={`w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20 transition-colors ${showNuovoDropdown ? 'bg-heritage-ink' : 'bg-heritage-gold'}`}
            >
              <Plus size={28} className={`transition-transform duration-200 ${showNuovoDropdown ? 'rotate-45' : ''}`} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center gap-2 transition-all pb-1 border-b-2 font-heritage text-lg ${active ? 'border-heritage-gold text-heritage-gold font-bold' : 'border-transparent text-white/50 hover:text-white'}`}>{icon}<span>{label}</span></button>;
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-heritage-ink/6 last:border-b-0">
      <span className="block text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-0.5">{label}</span>
      <span className="block font-serif text-[15px] italic text-heritage-ink/85 leading-snug">{value}</span>
    </div>
  );
}

interface ItemCardProps { item: HeritageItem; onClick: () => void; onToggleFavorite?: (id: string, e: React.MouseEvent) => void; onToggleFeatured?: (id: string, e: React.MouseEvent) => void; isAdmin?: boolean; aspectClassName?: string; imageHeightRatio?: string; isFeaturedCard?: boolean; showFeaturedBadge?: boolean; isHighlight?: boolean; }

function ItemCard({ item, onClick, onToggleFavorite, onToggleFeatured, isAdmin, aspectClassName = 'aspect-[3/4]', imageHeightRatio, isFeaturedCard, showFeaturedBadge, isHighlight }: ItemCardProps) {
  return (
    <motion.div onClick={onClick} whileHover={{ y: -5, transition: { type: 'spring', stiffness: 320, damping: 24 } }} className={`group cursor-pointer overflow-hidden flex flex-col h-full w-full ${isFeaturedCard ? 'heritage-card border-none shadow-xl' : isHighlight ? 'heritage-card shadow-xl' : 'heritage-card'}`}>
      <div className={`overflow-hidden relative shrink-0 w-full ${imageHeightRatio ? '' : aspectClassName}`} style={imageHeightRatio ? { height: imageHeightRatio } : { aspectRatio: '3/4' }}>
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
        {isFeaturedCard && (
          <div className="absolute inset-0 flex flex-col justify-end">
            {/* Strong gradient always on mobile, hover on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" />
            {/* Blur pill behind text — mobile only */}
            <div className="relative z-10 p-4 lg:p-8 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
              <div className="md:hidden absolute inset-0 backdrop-blur-[2px] bg-black/10 rounded-b-2xl" />
              <div className="relative">
                <h4 className="text-white font-serif leading-[1.2] mb-1 text-xl lg:text-3xl">{item.name}</h4>
                <p className="text-heritage-gold text-[17px] lg:text-[18px] uppercase tracking-[0.2em] font-bold delay-75">{getAdozioneLabel(item) ?? ((item as any).displayPrice || 'Su Richiesta')}</p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-2">
          {onToggleFavorite && <button onClick={e => onToggleFavorite(item.id, e)} className={`p-2 rounded-full transition-all backdrop-blur-md border ${item.isFavorite ? 'bg-red-500/80 border-red-400 text-white shadow-lg' : 'bg-black/30 border-white/20 text-white/80'}`}><Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} /></button>}
          {showFeaturedBadge && onToggleFeatured && <button onClick={e => onToggleFeatured(item.id, e)} className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-sm transition-all ${item.isFeatured ? 'bg-heritage-gold/90 text-white' : 'bg-black/20 text-white/40 border border-white/15'}`}>★</button>}
          {item.productCode && <span className="bg-heritage-gold text-white px-2 md:px-3 py-1 rounded-full text-[11px] md:text-[11px] uppercase tracking-widest font-bold border border-white/20 shadow-lg">ID: {item.productCode}</span>}


        </div>
        {/* Badge in basso a sinistra — disponibilità + catawiki */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {item.catawikiUrl && <a href={item.catawikiUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="bg-[#7B1818]/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold">Catawiki</a>}
          {(() => {
            const b = getPublicBadge(item.status, (item as any).acquisitionType);
            const isAvail = b.label === 'Disponibile';
            return isAvail
              ? <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              : <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold ${b.cls}`}>{b.label}</span>;
          })()}
        </div>
      </div>
      <div className={`p-3 md:p-5 flex flex-col flex-grow ${item.catawikiUrl ? "bg-[#7B1818] text-white" : (item.isFeatured || (item as any).isImportant) ? "bg-heritage-ink text-white" : ""}`}>
        <span className="text-[11px] md:text-[12px] uppercase tracking-widest font-bold text-heritage-gold block mb-1">{item.category}</span>
        <h3 className={`text-[16px] md:text-xl font-serif leading-tight mb-2 line-clamp-3 w-[70%] md:w-full ${isHighlight ? 'text-white' : ''}`}>{item.name}</h3>
        <div className={`flex items-center gap-1.5 text-[12px] md:text-sm mb-3 font-medium ${item.catawikiUrl ? 'text-white/50' : item.isFeatured ? 'text-white/50' : 'text-heritage-ink/80'}`}><MapPin size={10} /><span className="truncate">{item.room}</span></div>
        <div className={`flex items-center justify-between text-heritage-gold pt-3 mt-auto ${isHighlight ? 'border-t border-heritage-gold/30' : 'border-t border-heritage-ink/5'}`}>
          <div className="flex flex-col">
            {!item.catawikiUrl && !isAdozione(item) && (item as any).displayPrice && (
              <span className={`text-[12px] md:text-sm font-serif italic mb-1 ${isHighlight ? 'text-heritage-gold' : 'text-heritage-ink/70'}`}>
                {(item as any).displayPrice}
              </span>
            )}
            <span className={`text-[11px] md:text-[12px] font-bold uppercase tracking-widest opacity-60 ${isHighlight ? "text-white" : ""}`}>Dettagli</span>
          </div>
          <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}

function ImageGallery({ images, name, status, acquisitionType, catawikiUrl, onOpenLightbox }: { images: string[]; name: string; status: string; acquisitionType?: string; catawikiUrl?: string; onOpenLightbox?: (index: number) => void }) {
  const [idx, setIdx] = useState(0);
  const valid = useMemo(() => images.filter(i => i?.trim()), [images]);
  if (!valid.length) return <div className="w-full aspect-[3/4] bg-heritage-ink/5 flex items-center justify-center rounded-2xl"><ImageIcon className="text-heritage-ink/20" size={48} /></div>;
  return (
    <div className="space-y-4">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-heritage-ink/5 bg-white relative group">
        <AnimatePresence mode="wait"><motion.img key={idx} src={valid[idx]} alt={name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-full object-cover" /></AnimatePresence>
        {/* Click to open lightbox */}
        {onOpenLightbox && (
          <div
            className="absolute inset-0 cursor-zoom-in z-10"
            onClick={() => onOpenLightbox(idx)}
          />
        )}
        <div className="absolute top-6 left-6 z-20 flex flex-col items-start gap-4">
          {(() => { const b = getPublicBadge(status, acquisitionType); return (b.label === 'Disponibile' || b.label === 'In adozione') ? <span className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full"><span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" /></span><span className="text-white/80 text-[9px] font-bold uppercase tracking-wider">{b.label}</span></span> : <span className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold ${b.cls}`}>{b.label}</span>; })()}
          {catawikiUrl && <span className="bg-[#7B1818] text-white px-4 py-2 rounded-full text-[12px] uppercase tracking-[0.2em] font-bold animate-pulse">su Catawiki</span>}
        </div>
        {valid.length > 1 && (<>
          <button onClick={e => { e.stopPropagation(); setIdx(p => (p - 1 + valid.length) % valid.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronLeft size={24} /></button>
          <button onClick={e => { e.stopPropagation(); setIdx(p => (p + 1) % valid.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronRight size={24} /></button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">{valid.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />)}</div>
        </>)}
      </div>
      {valid.length > 1 && <div className="flex gap-2 overflow-x-auto py-2">{valid.map((img, i) => <button key={i} onClick={() => setIdx(i)} className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-heritage-gold scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={img} alt={`${name} ${i}`} className="w-full h-full object-cover" /></button>)}</div>}
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (username: string, pwd: string, token?: string) => void }) {
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('b2026_github_token'));
  const [showToken, setShowToken] = useState(false);
  return (
    <form onSubmit={e => { e.preventDefault(); onLogin(username, pwd, token || undefined); }} className="p-8 space-y-6">
      <div className="p-4 bg-heritage-cream/30 rounded-2xl text-sm text-heritage-ink/80 leading-relaxed">
        <p className="font-bold text-sm uppercase tracking-widest text-heritage-ink/65 mb-2">Accesso riservato</p>
        <p>Familiari autorizzati: <strong>Olivia</strong>, <strong>Aleria</strong>, <strong>Emanuela</strong>, <strong>Gianmaria</strong></p>
      </div>
      <div className="space-y-2">
        <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block">Nome utente</label>
        <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="es. olivia" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-base transition-colors" required />
      </div>
      <div className="space-y-2">
        <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block">Password</label>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••••" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-base transition-colors" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block">GitHub Token <span className="text-heritage-gold">(per salvare online)</span></label>
          <button type="button" onClick={() => setShowToken(!showToken)} className="text-[11px] text-heritage-gold uppercase tracking-widest">{showToken ? 'nascondi' : 'mostra'}</button>
        </div>
        <input type={showToken ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_xxxx (opzionale)" className="w-full border-b border-heritage-ink/10 py-2 bg-transparent focus:outline-none focus:border-heritage-gold text-base transition-colors font-mono" />
        <p className="text-[11px] text-heritage-ink/60 italic">Senza token le modifiche restano solo nel browser</p>
      </div>
      <button type="submit" disabled={!username || !pwd} className="w-full heritage-button py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">Accedi</button>
    </form>
  );
}

function HeroImageModal({ isOpen, onClose, onSave, initialUrl }: { isOpen: boolean; onClose: () => void; onSave: (url: string) => void; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  useEffect(() => { setUrl(initialUrl); }, [initialUrl, isOpen]);
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f?.type.startsWith('image/')) { try { setUrl(await resizeImage(f)); } catch {} } };
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between"><h3 className="text-xl font-serif">Personalizza Sfondo Hero</h3><button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button></div>
          <div className="p-8 space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden border border-heritage-ink/5 bg-heritage-cream/10">{url ? <img src={url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-heritage-ink/20"><ImageIcon size={48} /></div>}</div>
            <label className="flex items-center justify-center gap-2 w-full py-4 bg-heritage-cream/20 border-2 border-dashed border-heritage-ink/10 rounded-2xl cursor-pointer hover:bg-heritage-cream/30"><Upload size={18} className="text-heritage-gold" /><span className="text-sm font-medium">Seleziona dal dispositivo</span><input type="file" className="hidden" accept="image/*" onChange={handleFile} /></label>
            <input value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-3 focus:outline-none focus:border-heritage-gold text-sm" placeholder="https://images.unsplash.com/..." />
            <button onClick={() => onSave(url)} disabled={!url} className="w-full heritage-button py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"><Sparkles size={18} />Aggiorna Sfondo</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MobileDetailsSection({ form, setForm, handleDetailImages }: { form: any; setForm: any; handleDetailImages: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-heritage-ink/8 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-5 py-4 bg-heritage-cream/40">
        <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/85">Dettagli aggiuntivi</span>
        <ChevronRight size={16} className={`text-heritage-gold transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="p-5 space-y-4 border-t border-heritage-ink/8 bg-heritage-cream/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Anno</label><input value={form.year} onChange={e => setForm((p: any) => ({ ...p, year: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Es. 1850" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo</label><input value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="€ 500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo di riferimento <span className="text-heritage-ink/30 normal-case font-normal tracking-normal">(solo admin)</span></label><input value={form.estimatedValue} onChange={e => setForm((p: any) => ({ ...p, estimatedValue: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="€ 1.500" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Prezzo display <span className="text-heritage-ink/30 normal-case font-normal tracking-normal">(visibile al pubblico)</span></label><input value={(form as any).displayPrice || ''} onChange={e => setForm((p: any) => ({ ...p, displayPrice: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Da definire / Su richiesta / € 350" /></div>
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Codice SKU</label><input value={form.productCode} onChange={e => setForm((p: any) => ({ ...p, productCode: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="ART-001" /></div>
          </div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Dimensioni</label><input value={form.dimensions} onChange={e => setForm((p: any) => ({ ...p, dimensions: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="120×60×80 cm" /></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Dettagli tecnici</label><textarea value={form.technicalNotes} onChange={e => setForm((p: any) => ({ ...p, technicalNotes: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold resize-none h-20 text-lg font-heritage italic" placeholder="Materiali, stato..." /></div>

          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Stato</label><select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Disponibile">Disponibile</option><option value="Riservato">Riservato</option><option value="Affidato">Affidato</option><option value="Non in Vendita">Non in Vendita</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Condizione</label><select value={form.wearCondition} onChange={e => setForm((p: any) => ({ ...p, wearCondition: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="">Non specificata</option><option value="Ottimo">Ottimo</option><option value="Buono">Buono</option><option value="Discreto">Discreto</option><option value="Da restaurare">Da restaurare</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Spedizione</label><select value={form.shipping} onChange={e => setForm((p: any) => ({ ...p, shipping: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="">Non specificata</option><option value="Ritiro in sede">Ritiro in sede</option><option value="Spedizione possibile">Spedizione possibile</option><option value="Solo ritiro">Solo ritiro</option><option value="Concordare">Concordare</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Destinazione</label><select value={form.destination} onChange={e => setForm((p: any) => ({ ...p, destination: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Barberino">Barberino</option><option value="Cinisello Balsamo">Cinisello Balsamo (MI)</option><option value="Torino">Torino</option><option value="Sorella">Sorella</option><option value="Altro">Altro</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Tipo acquisizione</label><select value={form.acquisitionType} onChange={e => setForm((p: any) => ({ ...p, acquisitionType: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none text-lg font-heritage italic"><option value="Vendita">Vendita</option><option value="Lascito Affettivo">Lascito Affettivo</option><option value="Famiglia">Famiglia</option></select></div>
          <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Link Catawiki</label><input value={form.catawikiUrl} onChange={e => setForm((p: any) => ({ ...p, catawikiUrl: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="https://www.catawiki.com/..." /></div>
          <div className="flex items-center gap-3 cursor-pointer py-1" onClick={() => setForm((p: any) => ({ ...p, isFeatured: !p.isFeatured }))}>
            <div className="relative flex-shrink-0"><div className={`w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`} /><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} /></div>
            <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/85">In evidenza (Home)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MemoryModal ──────────────────────────────────────────────────────────────

function MemoryModal({
  isOpen, onClose, editingMemory, memories, items, onSave, onPinSave, onNotify
}: {
  isOpen: boolean;
  onClose: () => void;
  editingMemory: FamilyMemory | null;
  memories: FamilyMemory[];
  items: HeritageItem[];
  onSave: (memories: FamilyMemory[]) => void;
  onPinSave: (memories: FamilyMemory[]) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = React.useState({ text: '', author: '', date: new Date().toISOString().split('T')[0], itemId: '', imageUrl: '', visibility: 'public' as 'public' | 'private' });
  const [imageBase64, setImageBase64] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [view, setView] = React.useState<'list' | 'form'>('list');
  const [editId, setEditId] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) { setView('list'); setEditId(null); }
  }, [isOpen]);

  const openNew = () => {
    setForm({ text: '', author: '', date: new Date().toISOString().split('T')[0], itemId: '', imageUrl: '', visibility: 'public' });
    setRawText(''); setImageBase64(''); setEditId(null); setView('form');
  };

  const openEdit = (m: FamilyMemory) => {
    setForm({ text: m.text, author: m.author, date: m.date, itemId: m.itemId || '', imageUrl: m.imageUrl || '', visibility: m.visibility || 'public' });
    setRawText(''); setImageBase64(''); setEditId(m.id); setView('form');
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const resized = await resizeImage(file);
      setImageBase64(resized);
      setForm(f => ({ ...f, imageUrl: resized })); // show preview immediately
    } catch { console.error('Errore resize foto ricordo'); }
    setIsUploading(false);
  };

  const handleAI = async () => {
    if (!rawText.trim()) return;
    setIsAiLoading(true);
    try {
      const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
      const linkedItem = items.find(i => i.id === form.itemId);
      const prompt = `Sei un ghostwriter che aiuta a trasformare appunti personali in brevi ricordi familiari scritti bene.

Trasforma questo appunto grezzo in un ricordo scritto in prima persona, caldo e concreto:
"${rawText}"
${linkedItem ? `L'oggetto associato è: ${linkedItem.name}` : ''}

Regole:
- 3-5 frasi, tono personale e diretto
- Prima persona singolare
- Concreto — luoghi, gesti, dettagli visivi
- Niente retorica sentimentale, no aggettivi come "indimenticabile" o "prezioso"
- Se c'è un oggetto associato, citalo naturalmente senza enfasi
- Lingua italiana

Rispondi SOLO con il testo del ricordo, nessun'altra parola.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, text: data.content?.[0]?.text?.trim() || f.text }));
      }
    } catch {}
    setIsAiLoading(false);
  };

  const handleSave = async () => {
    if (!form.text.trim() || !form.author.trim()) return;
    setIsUploading(true);
    let imageUrl = form.imageUrl;
    // Upload if we have a new base64 image (not already a remote URL)
    const needsUpload = imageBase64 && imageBase64.startsWith('data:');
    if (needsUpload) {
      const fileName = `memory_${Date.now()}.jpg`;
      const uploaded = await uploadImageToGitHub(imageBase64, fileName);
      if (uploaded) imageUrl = uploaded;
      // If no token, keep the base64 as local preview but warn
      else if (!imageUrl || imageUrl.startsWith('data:')) imageUrl = imageBase64;
    }
    const mem: FamilyMemory = {
      id: editId || `mem_${Date.now()}`,
      text: form.text.trim(),
      author: form.author.trim(),
      date: form.date,
      itemId: form.itemId || undefined,
      imageUrl: imageUrl || undefined,
      visibility: form.visibility,
    };
    const updated = editId ? memories.map(m => m.id === editId ? mem : m) : [...memories, mem];
    const saved = await saveMemoriesToGitHub(updated);
    onSave(updated);
    setIsUploading(false);
    if (saved) onNotify('Ricordo salvato su GitHub ✓');
    else onNotify('Salvato in locale (GitHub non raggiungibile)', 'error');
    setView('list');
  };

  const handleDelete = async (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    const saved = await saveMemoriesToGitHub(updated);
    onSave(updated);
    if (saved) onNotify('Ricordo eliminato ✓');
    else onNotify('Eliminato in locale (GitHub non raggiungibile)', 'error');
  };

  const handlePin = async (id: string) => {
    // Toggle: se è già pinned lo unpinna, altrimenti lo pinna (e rimuove il pin dagli altri)
    const isCurrentlyPinned = memories.find(m => m.id === id)?.pinned;
    const updated = memories.map(m => ({
      ...m,
      pinned: isCurrentlyPinned ? false : m.id === id,
    }));
    const saved = await saveMemoriesToGitHub(updated);
    onPinSave(updated); // non chiude la modale
    if (saved) onNotify(isCurrentlyPinned ? 'Cover rimossa ✓' : '📌 Cover impostata ✓');
    else onNotify('Salvato in locale (GitHub non raggiungibile)', 'error');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="mem-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — sale dal basso su mobile, centrata su desktop */}
      <div key="mem-sheet"
        className="fixed bottom-0 left-0 right-0 z-[301] bg-heritage-cream rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '95svh', touchAction: 'pan-y', transform: 'translateZ(0)', animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards', overflowX: 'hidden' }}
        onClick={e => e.stopPropagation()}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
            <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 md:py-4 border-b border-heritage-ink/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              {view === 'form' && (
                <button onClick={() => setView('list')} className="p-1.5 hover:bg-heritage-ink/8 rounded-full transition-colors">
                  <ArrowLeft size={18} className="text-heritage-ink/60" />
                </button>
              )}
              <h2 className="text-lg font-serif italic text-heritage-ink">
                {view === 'list' ? 'Ricordi di famiglia' : editId ? 'Modifica ricordo' : 'Nuovo ricordo'}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-heritage-ink/8 rounded-full transition-colors flex-shrink-0">
              <X size={18} className="text-heritage-ink/60" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden" style={{overflowX:'hidden'}} onTouchMove={e => e.stopPropagation()}>
            {view === 'list' ? (
              <div className="flex flex-col gap-3">
                <button onClick={openNew} className="flex items-center gap-2 bg-heritage-gold text-white px-4 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider w-fit">
                  <Plus size={14} /> Nuovo ricordo
                </button>
                {memories.length === 0 && (
                  <p className="text-heritage-ink/40 italic text-sm mt-4">Nessun ricordo ancora. Aggiungine uno!</p>
                )}
                {memories.map(m => {
                  const linked = items.find(i => i.id === m.itemId);
                  return (
                    <div key={m.id} className={`bg-white rounded-2xl border overflow-hidden ${m.pinned ? 'border-heritage-gold/50 ring-1 ring-heritage-gold/20' : 'border-heritage-ink/8'}`}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="w-full h-32 object-cover" />}
                      <div className="p-4">
                        <p className="text-heritage-ink text-sm leading-relaxed mb-2 line-clamp-3">{m.text}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-heritage-gold text-[11px] font-bold">{m.author}</span>
                            <span className="text-heritage-ink/30 text-[11px] ml-2">{m.date}</span>
                            {linked && <span className="text-heritage-ink/40 text-[11px] ml-2">· {linked.name.split(' ').slice(0,3).join(' ')}</span>}
                            {m.pinned && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-heritage-gold/15 text-heritage-gold px-1.5 py-0.5 rounded-full">📌 Cover</span>}
                            {m.visibility === 'private'
                              ? <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-heritage-ink/8 text-heritage-ink/50 px-1.5 py-0.5 rounded-full">🔒 Famiglia</span>
                              : <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">🌐 Tutti</span>
                            }
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePin(m.id)}
                              title={m.pinned ? 'Rimuovi dalla cover' : 'Imposta come cover'}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${m.pinned ? 'bg-heritage-gold text-white shadow-sm' : 'text-heritage-ink/30 hover:text-heritage-gold hover:bg-heritage-gold/10'}`}
                            >
                              <Bookmark size={17} className={m.pinned ? 'fill-white' : ''} />
                            </button>
                            <button onClick={() => openEdit(m)} title="Modifica" className="w-9 h-9 rounded-full flex items-center justify-center text-heritage-ink/40 hover:text-heritage-ink hover:bg-heritage-ink/8 transition-all">
                              <PenLine size={17} />
                            </button>
                            <button onClick={() => handleDelete(m.id)} title="Elimina" className="w-9 h-9 rounded-full flex items-center justify-center text-heritage-ink/25 hover:text-red-400 hover:bg-red-50 transition-all">
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Foto */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Foto (opzionale)</label>
                  <div className="rounded-2xl border-2 border-dashed border-heritage-ink/10 overflow-hidden bg-heritage-cream/20">
                    {(imageBase64 || form.imageUrl) ? (
                      <div className="relative h-44">
                        <img src={imageBase64 || form.imageUrl} alt="" className={`absolute inset-0 w-full h-full object-cover ${isUploading ? 'opacity-50 blur-sm' : ''}`} />
                        {isUploading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-7 h-7 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}
                        <button type="button" onClick={() => { setImageBase64(''); setForm(f => ({ ...f, imageUrl: '' })); }} className="absolute top-2 right-2 bg-white/90 text-heritage-ink px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow">Rimuovi</button>
                      </div>
                    ) : (
                      <div className="h-28 flex flex-col items-center justify-center gap-2 text-heritage-ink/30">
                        {isUploading
                          ? <><div className="w-7 h-7 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /><p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40">Elaborazione...</p></>
                          : <Camera size={28} />}
                      </div>
                    )}
                    {!isUploading && (
                      <div className="grid grid-cols-2 border-t border-heritage-ink/8">
                        <label className="flex flex-col items-center gap-1 py-2.5 cursor-pointer border-r border-heritage-ink/8 active:bg-heritage-cream/60">
                          <Camera size={16} className="text-heritage-gold" />
                          <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/50">Scatta</span>
                          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImage} />
                        </label>
                        <label className="flex flex-col items-center gap-1 py-2.5 cursor-pointer active:bg-heritage-cream/60">
                          <ImageIcon size={16} className="text-heritage-gold" />
                          <span className="text-[9px] uppercase tracking-widest font-bold text-heritage-ink/50">{(imageBase64 || form.imageUrl) ? 'Cambia' : 'Galleria'}</span>
                          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleImage} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Testo grezzo + AI */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Racconta in parole tue</label>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Scrivi qualcosa di grezzo: cosa ricordi, chi c'era, dove, quando..."
                    className="w-full bg-white border border-heritage-ink/12 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold resize-none"
                    style={{ fontSize: '16px', minHeight: '80px' }}
                  />
                  <button
                    onClick={handleAI}
                    disabled={!rawText.trim() || isAiLoading}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-950 text-heritage-gold rounded-full text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-emerald-900"
                  >
                    {isAiLoading ? <div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /> : <Sparkles size={13} />}
                    {isAiLoading ? 'Scrivo...' : '✦ Aiutami a scriverlo'}
                  </button>
                </div>

                {/* Testo finale */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Ricordo</label>
                  <textarea
                    value={form.text}
                    onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Il testo del ricordo..."
                    className="w-full bg-white border border-heritage-ink/12 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold resize-none"
                    style={{ fontSize: '16px', minHeight: '100px' }}
                  />
                </div>

                {/* Autore + data */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Autore</label>
                    <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Chi racconta" className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Data</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }} />
                  </div>
                </div>

                {/* Oggetto collegato */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Collega a un oggetto (opzionale)</label>
                  <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className="w-full bg-white border border-heritage-ink/12 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-heritage-gold" style={{ fontSize: '16px' }}>
                    <option value="">— Nessun oggetto —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>

                {/* Visibilità */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60 block mb-2">Visibilità</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['public', 'private'] as const).map(v => (
                      <button key={v} type="button"
                        onClick={() => setForm(f => ({ ...f, visibility: v }))}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-[12px] font-bold uppercase tracking-wide transition-all ${form.visibility === v ? (v === 'public' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-heritage-ink bg-heritage-ink/5 text-heritage-ink') : 'border-heritage-ink/10 text-heritage-ink/40 hover:border-heritage-ink/25'}`}>
                        {v === 'public' ? '🌐 Tutti' : '🔒 Solo famiglia'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-heritage-ink/35 italic mt-1.5">
                    {form.visibility === 'public' ? 'Visibile a tutti i visitatori' : 'Visibile solo agli utenti loggati'}
                  </p>
                </div>

                {/* Salva */}
                <button
                  onClick={handleSave}
                  disabled={!form.text.trim() || !form.author.trim() || isUploading}
                  className="w-full py-3 bg-heritage-ink text-white rounded-full font-bold text-[13px] uppercase tracking-wider disabled:opacity-40 transition-all hover:bg-emerald-950"
                >
                  {isUploading ? 'Salvataggio...' : editId ? 'Salva modifiche' : 'Aggiungi ricordo'}
                </button>
              </div>
            )}
          </div>
          {/* Bottone chiudi fisso in fondo — mobile only */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 px-6 pb-8 pt-3 bg-heritage-cream border-t border-heritage-ink/8 flex-shrink-0 z-10">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-heritage-ink text-white rounded-full font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <X size={15} /> Chiudi
            </button>
          </div>

          {/* Bottone chiudi fisso in fondo — mobile only */}
          <div className="md:hidden px-6 pb-8 pt-3 bg-heritage-cream border-t border-heritage-ink/8 flex-shrink-0">
            <button onClick={onClose}
              className="w-full py-3.5 bg-heritage-ink text-white rounded-full font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2">
              <X size={15} /> Chiudi
            </button>
          </div>
      </div>
    </AnimatePresence>
  );
}

// ─── AntiquarianSection ───────────────────────────────────────────────────────

function AntiquarianSection({ item }: { item: HeritageItem }) {
  const common = [
    { label: 'Sottocategoria', value: item.catawikiSubcategory },
    { label: 'Stile', value: item.catawikiStyle },
    { label: 'Materiale', value: item.catawikiMaterial },
    { label: 'Paese di origine', value: item.catawikiCountry },
    { label: 'Condizione', value: item.wearCondition },
    { label: 'Restaurato', value: item.catawikiRestored ? 'Sì' : undefined },
    { label: 'Peso spedizione', value: item.catawikiWeight ? `${item.catawikiWeight} kg` : undefined },
    { label: 'Spedizione', value: item.catawikiShippingAvailable ? 'Disponibile' : undefined },
    { label: 'Ritiro', value: item.catawikiPickupAvailable ? 'Disponibile' : undefined },
  ].filter(f => f.value);

  const specific = Object.entries((item as any).catawikiSpecific || {})
    .filter(([, v]) => v !== '' && v !== false && v !== undefined)
    .map(([k, v]) => ({
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      value: v === true ? 'Sì' : String(v),
    }));

  const hasDescription = !!item.catawikiDescription;
  const hasAny = common.length > 0 || specific.length > 0 || hasDescription;
  if (!hasAny) return null;

  return (
    <div className="mt-2 rounded-2xl border border-heritage-ink/12 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 bg-heritage-ink/4 border-b border-heritage-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold" />
          <h5 className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink">Scheda Antiquaria</h5>
        </div>
        {item.catawikiCategory && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-heritage-gold/15 text-heritage-gold rounded-full">
            {item.catawikiCategory}
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Descrizione */}
        {hasDescription && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-heritage-ink mb-2">Descrizione</p>
            <p className="text-base leading-relaxed text-heritage-ink/85 font-serif italic">{item.catawikiDescription}</p>
          </div>
        )}

        {/* Campi comuni */}
        {common.length > 0 && (
          <>
            {hasDescription && <div className="border-t border-heritage-ink/8" />}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {common.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-heritage-ink mb-0.5">{label}</p>
                  <p className="text-[15px] font-heritage italic text-heritage-ink">{String(value)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Campi specifici categoria */}
        {specific.length > 0 && (
          <>
            <div className="border-t border-heritage-ink/8" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-heritage-ink mb-4">Dettagli {item.catawikiCategory || 'categoria'}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {specific.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-heritage-ink mb-0.5">{label}</p>
                    <p className="text-[15px] font-heritage italic text-heritage-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CatawikiModal helpers (top-level per evitare re-mount su iOS) ─────────────

function CatawikiCopyBtn({ text, fk, copied, onCopy }: {
  text: string; fk: string; copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <button type="button" onClick={() => onCopy(text, fk)}
      className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${copied === fk ? 'bg-green-100 text-green-600' : 'bg-heritage-ink/8 text-heritage-ink/40 hover:bg-heritage-ink/15'}`}>
      {copied === fk ? '✓' : 'Copia'}
    </button>
  );
}

function CatawikiToggle({ val, onToggle }: { val: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
      <div className={`w-9 h-5 rounded-full transition-colors relative ${val ? 'bg-[#7B1818]' : 'bg-heritage-ink/15'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-[12px] font-bold text-heritage-ink/60">{val ? 'Sì' : 'No'}</span>
    </div>
  );
}

function CatawikiField({ label, value, isAi, options, onChange, copied, onCopy, fieldKey }: {
  label: string; value: string; isAi: boolean; options?: string[];
  onChange: (v: string) => void; copied: string | null;
  onCopy: (text: string, key: string) => void; fieldKey: string;
}) {
  const hasOptions = !!options;
  // "Altro" mode: valore non vuoto e non presente nelle opzioni, OPPURE utente ha scelto Altro
  const isCustomValue = hasOptions && value !== '' && !options!.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustomValue);

  // Sincronizza se il valore cambia dall'esterno (es. AI che compila)
  React.useEffect(() => {
    if (isCustomValue) setShowCustom(true);
  }, [isCustomValue]);

  const selectValue = hasOptions
    ? (options!.includes(value) ? value : (showCustom ? '__altro__' : ''))
    : value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{label}</p>
          {isAi && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
        </div>
        <CatawikiCopyBtn text={value || '—'} fk={fieldKey} copied={copied} onCopy={onCopy} />
      </div>
      {hasOptions ? (
        <>
          <select
            value={selectValue}
            onChange={e => {
              if (e.target.value === '__altro__') {
                setShowCustom(true);
                onChange('');
              } else {
                setShowCustom(false);
                onChange(e.target.value);
              }
            }}
            className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink appearance-none"
            style={{ fontSize: '16px' }}>
            <option value="">— seleziona —</option>
            {options!.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="__altro__">Altro (testo libero)</option>
          </select>
          {showCustom && (
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full border-b border-heritage-gold/60 py-2 bg-heritage-gold/5 px-1 focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink rounded"
              style={{ fontSize: '16px' }}
              placeholder="Scrivi qui..."
            />
          )}
        </>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic"
          style={{ fontSize: '16px' }}
          placeholder="—" />
      )}
    </div>
  );
}

// ─── CatawikiModal ────────────────────────────────────────────────────────────

// Mapping categoria app → categoria Catawiki
const CAT_MAP: Record<string, string> = {
  'Mobili': 'Mobili', 'Sedute': 'Mobili', 'Illuminazione': 'Illuminazione',
  'Quadri': 'Quadri', 'Libri': 'Libri',
  'Porcellane': 'Oggetti', 'Oggetti': 'Oggetti',
  'Tappeti': 'Arredo', 'Giardino': 'Arredo',
};

const CATAWIKI_CATS = ['Mobili', 'Illuminazione', 'Quadri', 'Libri', 'Oggetti', 'Arredo'] as const;
type CatawikiCat = typeof CATAWIKI_CATS[number];

// Campi specifici per categoria
const CAT_FIELDS: Record<CatawikiCat, { key: string; label: string; type?: string; options?: string[] }[]> = {
  Mobili: [
    { key: 'tipoMobile', label: 'Tipo mobile', options: ['Armadio', 'Cassettone', 'Comò', 'Credenza', 'Divano', 'Letto', 'Libreria', 'Poltrona', 'Scrivania', 'Sedia', 'Specchiera', 'Tavolo', 'Tavolino', 'Toilette', 'Altro'] },
    { key: 'designer', label: 'Designer / Ebanista' },
    { key: 'produttore', label: 'Produttore / Marchio' },
    { key: 'essenzaLegno', label: 'Essenza legno', options: ['Ciliegio', 'Ebano', 'Faggio', 'Frassino', 'Lacca', 'Mogano', 'Noce', 'Olmo', 'Pino', 'Quercia', 'Radica', 'Rovere', 'Teak', 'Altro'] },
    { key: 'materialeStruttura', label: 'Materiale struttura', options: ['Legno massello', 'Legno impiallacciato', 'Legno laccato', 'Metallo', 'Ferro battuto', 'Ottone', 'Misto legno-metallo', 'Altro'] },
    { key: 'materialeRivestimento', label: 'Materiale rivestimento', options: ['Velluto', 'Seta', 'Lino', 'Cotone', 'Pelle', 'Pelle sintetica', 'Damasco', 'Gobelin', 'Nessuno', 'Altro'] },
    { key: 'ferramenta', label: 'Ferramenta', options: ['Ottone', 'Bronzo', 'Ferro', 'Argento', 'Dorata', 'Originale', 'Sostituita', 'Assente'] },
    { key: 'finitura', label: 'Finitura', options: ['Cera', 'Lacca', 'Laccato bianco', 'Laccato nero', 'Noce scuro', 'Patinato', 'Verniciato', 'Naturale', 'Doratura', 'Altro'] },
    { key: 'colore', label: 'Colore', options: ['Beige', 'Bianco', 'Bordeaux', 'Bruno', 'Ciliegio', 'Crema', 'Dorato', 'Grigio', 'Mogano', 'Nero', 'Noce', 'Rosso', 'Verde', 'Altro'] },
    { key: 'stile', label: 'Stile', options: ['Art Déco', 'Art Nouveau', 'Barocco', 'Biedermeier', 'Design italiano', 'Eclettico', 'Impero', 'Liberty', 'Luigi XIV', 'Luigi XV', 'Luigi XVI', 'Modernista', 'Neoclassico', 'Rinascimentale', 'Rococò', 'Rustico toscano', 'Vittoriano', 'Altro'] },
    { key: 'numeroCassetti', label: 'N° cassetti', options: ['0', '1', '2', '3', '4', '5', '6+'] },
    { key: 'numeroAnte', label: 'N° ante', options: ['0', '1', '2', '3', '4+'] },
    { key: 'patinaOriginale', label: 'Patina originale', type: 'bool' },
    { key: 'difettiStrutturali', label: 'Difetti strutturali', options: ['Nessuno', 'Lievi graffi', 'Giunture allentate', 'Parte mancante', 'Crepe nel legno', 'Tarli (trattati)', 'Altro'] },
    { key: 'usuraSuperficie', label: 'Usura superficie', options: ['Nessuna', 'Minima', "Normale per l'età", 'Significativa', 'Da restaurare'] },
  ],
  Illuminazione: [
    { key: 'tipoLampada', label: 'Tipo', options: ['Lampadario', 'Applique', 'Piantana', 'Lampada da tavolo', 'Lanterna', 'Lume', 'Coppia', 'Altro'] },
    { key: 'materialeCorpo', label: 'Materiale corpo', options: ['Ottone', 'Bronzo', 'Ferro battuto', 'Ottone dorato', 'Acciaio', 'Alluminio', 'Legno', 'Ceramica', 'Vetro', 'Misto', 'Altro'] },
    { key: 'materialeDiffusore', label: 'Materiale diffusore', options: ['Cristallo', 'Vetro soffiato', 'Vetro opalino', 'Vetro colorato', 'Vetro molato', 'Tessuto', 'Pergamena', 'Nessuno', 'Altro'] },
    { key: 'numeroPuntiLuce', label: 'N° punti luce', options: ['1', '2', '3', '4', '5', '6', '8', '10', '12', '12+'] },
    { key: 'attacco', label: 'Attacco', options: ['E27', 'E14', 'B22', 'G9', 'G4', 'Da sostituire', 'Altro'] },
    { key: 'funzionante', label: 'Funzionante', type: 'bool' },
    { key: 'cablaggioAggiornato', label: 'Cablaggio aggiornato', type: 'bool' },
    { key: 'colore', label: 'Colore', options: ['Oro', 'Ottone antico', 'Bronzo', 'Nero', 'Bianco', 'Cromo', 'Multicolore', 'Trasparente', 'Altro'] },
    { key: 'stile', label: 'Stile', options: ['Art Déco', 'Art Nouveau', 'Barocco', 'Classico', 'Impero', 'Liberty', 'Modernista', 'Neoclassico', 'Rococò', 'Rustico', 'Vintage', 'Altro'] },
    { key: 'altezzaTotale', label: 'Altezza totale (cm)' },
    { key: 'diametro', label: 'Diametro (cm)' },
  ],
  Quadri: [
    { key: 'titoloOpera', label: 'Titolo opera' },
    { key: 'artista', label: 'Artista / Autore' },
    { key: 'atelierScuola', label: 'Atelier / Scuola', options: ['Scuola fiorentina', 'Scuola toscana', 'Scuola romana', 'Scuola veneziana', 'Scuola napoletana', 'Scuola fiamminga', 'Scuola francese', 'Ignoto', 'Altro'] },
    { key: 'firmato', label: 'Firmato', type: 'bool' },
    { key: 'datato', label: 'Datato', type: 'bool' },
    { key: 'tecnica', label: 'Tecnica', options: ['Olio su tela', 'Olio su tavola', 'Olio su cartone', 'Acrilico', 'Acquerello', 'Tempera', 'Tecnica mista', 'Pastello', 'Matita / Carboncino', 'Stampa', 'Incisione', 'Acquaforte', 'Litografia', 'Serigrafia', 'Altro'] },
    { key: 'supporto', label: 'Supporto', options: ['Tela', 'Tavola', 'Carta', 'Cartone', 'Metallo', 'Rame', 'Avorio', 'Altro'] },
    { key: 'soggetto', label: 'Soggetto', options: ['Paesaggio', 'Ritratto', 'Natura morta', 'Scena di genere', 'Scena storica', 'Scena religiosa', 'Marina', 'Veduta urbana', 'Animali', 'Nudo', 'Astratto', 'Altro'] },
    { key: 'movimentoArtistico', label: 'Movimento artistico', options: ['Barocco', 'Classicismo', 'Divisionismo', 'Espressionismo', 'Impressionismo', 'Liberty', 'Macchiaioli', 'Manierismo', 'Neoclassicismo', 'Realismo', 'Rinascimento', 'Romanticismo', 'Vedutismo', 'Altro'] },
    { key: 'altezzaConCornice', label: 'Altezza con cornice (cm)' },
    { key: 'larghezzaConCornice', label: 'Larghezza con cornice (cm)' },
    { key: 'certificatoAutenticita', label: 'Certificato autenticità', type: 'bool' },
    { key: 'provenienza', label: 'Provenienza / Galleria' },
    { key: 'esposizioni', label: 'Esposizioni / Pubblicazioni' },
    { key: 'restauriTela', label: 'Restauri / Craquelure', options: ['Nessuno', 'Lievi craquelure', 'Craquelure estesa', 'Restauri puntuali', 'Restauri visibili', 'Foderatura'] },
    { key: 'statoCornice', label: 'Stato cornice', options: ['Originale ottimo', 'Originale con usura', 'Restaurata', 'Sostituita', 'Assente'] },
  ],
  Libri: [
    { key: 'autore', label: 'Autore' },
    { key: 'curatore', label: 'Curatore / Traduttore' },
    { key: 'illustratore', label: 'Illustratore' },
    { key: 'editore', label: 'Editore' },
    { key: 'luogoPubblicazione', label: 'Luogo pubblicazione', options: ['Bologna', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Parigi', 'Londra', 'Berlino', 'Altro'] },
    { key: 'annoPubblicazione', label: 'Anno pubblicazione' },
    { key: 'edizione', label: 'Edizione', options: ['Prima edizione', 'Seconda edizione', 'Terza edizione', 'Edizione riveduta', 'Edizione numerata', 'Ristampa anastatica', 'Altro'] },
    { key: 'primaEdizione', label: 'Prima edizione', type: 'bool' },
    { key: 'tiraturaLimitata', label: 'Tiratura limitata', type: 'bool' },
    { key: 'numeroPagine', label: 'N° pagine' },
    { key: 'lingua', label: 'Lingua', options: ['Italiano', 'Latino', 'Francese', 'Inglese', 'Tedesco', 'Spagnolo', 'Greco antico', 'Multilingue', 'Altro'] },
    { key: 'rilegatura', label: 'Rilegatura', options: ['Cartonato', 'Brossura', 'Pergamena', 'Pelle', 'Tela', 'Mezza pelle', 'Piena pelle', 'Mezza tela', 'Altro'] },
    { key: 'dedicaAutografa', label: 'Dedica autografa', type: 'bool' },
    { key: 'firmaAutore', label: 'Firma autore', type: 'bool' },
    { key: 'conservazioneCopertina', label: 'Stato copertina', options: ['Ottimo', 'Buono', 'Discreto — usura normale', 'Con difetti (specificare)', 'Da restaurare'] },
    { key: 'pagineMancanti', label: 'Pagine mancanti', type: 'bool' },
    { key: 'annotazioni', label: 'Annotazioni / Macchie', options: ['Nessuna', 'Lievi foxing', 'Foxing esteso', 'Annotazioni a matita', 'Annotazioni a penna', 'Timbri bibliotecari', "Macchie d'umidità", 'Altro'] },
  ],
  Oggetti: [
    { key: 'tipoOggetto', label: 'Tipo oggetto', options: ['Barometro', 'Bronzetto', 'Candelabro', 'Ceramica', 'Ciotola', 'Cornice', 'Fermacarte', 'Giara', 'Orologio', 'Portachiavi', 'Radio', 'Scultura', 'Specchio', 'Statuetta', 'Strumento musicale', 'Vaso', 'Altro'] },
    { key: 'artista', label: 'Artista / Creatore' },
    { key: 'marchio', label: 'Marchio / Produttore' },
    { key: 'serie', label: 'Serie / Collezione' },
    { key: 'materialeSecondario', label: 'Materiale secondario', options: ['Avorio', 'Bronzo', 'Ceramica', 'Cristallo', 'Cuoio', 'Legno', 'Marmo', 'Metallo', 'Osso', 'Ottone', 'Pietra', 'Smalto', 'Tessuto', 'Vetro', 'Altro'] },
    { key: 'tecnica', label: 'Tecnica esecutiva', options: ['Cesellatura', 'Doratura', 'Forgiatura', 'Fusione a cera persa', 'Incisione', 'Intarsio', 'Lavorazione a mano', 'Manifattura', 'Pressofusione', 'Smaltatura', 'Tornitura', 'Altro'] },
    { key: 'colore', label: 'Colore', options: ['Bianco', 'Blu', 'Bruno', 'Dorato', 'Grigio', 'Multicolore', 'Nero', 'Rosso', 'Verde', 'Altro'] },
    { key: 'soggetto', label: 'Soggetto / Tema', options: ['Animali', 'Figura umana', 'Fiori', 'Geometrico', 'Mitologico', 'Natura', 'Paesaggio', 'Religioso', 'Simbolico', 'Altro'] },
    { key: 'motivoDecorativo', label: 'Motivo decorativo' },
    { key: 'manifattura', label: 'Manifattura', options: ['Capodimonte', 'Deruta', 'Doccia / Richard Ginori', 'Faenza', 'Meissen', 'Sèvres', 'Nove di Bassano', 'Manifattura toscana', 'Ignota', 'Altro'] },
    { key: 'altezza', label: 'Altezza (cm)' },
    { key: 'diametro', label: 'Diametro (cm)' },
    { key: 'crepeScheggiature', label: 'Crepe / Scheggiature', options: ['Nessuna', 'Microfessure (non visibili)', 'Scheggiatura minore', 'Crepa visibile', 'Restauro precedente', 'Più difetti'] },
    { key: 'partiMancanti', label: 'Parti mancanti', type: 'bool' },
    { key: 'testatoFunzionante', label: 'Testato e funzionante', type: 'bool' },
  ],
  Arredo: [
    { key: 'tipoArredo', label: 'Tipo', options: ['Tappeto', 'Kilim', 'Tessile / Arazzo', 'Cuscino', 'Mobile da giardino', 'Fontana', 'Altro'] },
    { key: 'materialeArredo', label: 'Materiale principale', options: ['Lana', 'Seta', 'Cotone', 'Lana e seta', 'Lana e cotone', 'Fibra vegetale', 'Ferro', 'Ghisa', 'Pietra', 'Altro'] },
    { key: 'tecnicaArredo', label: 'Tecnica', options: ['Annodato a mano', 'Tessuto a mano', 'Tessuto a macchina', 'Intrecciato', 'Ricamato', 'Kilim piatto', 'Altro'] },
    { key: 'origineManifattura', label: 'Origine / Manifattura', options: ['Afghanistan', 'Anatolia', 'Caucaso', 'Iran / Persia', 'Iraq', 'Italia', 'Marocco', 'Pakistan', 'Turchia', 'Altro'] },
    { key: 'motivoDecorativo', label: 'Motivo decorativo', options: ['Floreale', 'Geometrico', 'Medaglione', 'Mihrab', 'Paisley', 'Tribale', 'Altro'] },
    { key: 'colore', label: 'Colori predominanti', options: ['Beige / Avorio', 'Blu e rosso', 'Bordeaux', 'Marrone / Terracotta', 'Multicolore', 'Naturale', 'Nero e rosso', 'Verde', 'Altro'] },
    { key: 'nodiDm2', label: 'Nodi per dm² (tappeti)' },
    { key: 'altezzaTappeto', label: 'Altezza (cm)' },
    { key: 'larghezzaTappeto', label: 'Larghezza (cm)' },
    { key: 'usura', label: 'Usura / Strappi', options: ['Nessuna', "Minima — normale per l'età", 'Usura al centro', 'Usura ai bordi', 'Strappi riparati', 'Da restaurare'] },
    { key: 'colorisbiaditi', label: 'Colori sbiaditi', type: 'bool' },
  ],
};


// AI prompt per categoria
function buildCatawikiPrompt(item: HeritageItem, catawikiCat: CatawikiCat): string {
  const fields = CAT_FIELDS[catawikiCat];
  const specificFieldsJson = fields.map(f => {
    if (f.type === 'bool') return `  "${f.key}": false`;
    if (f.options) return `  "${f.key}": "una tra: ${f.options.join(', ')}"`;
    return `  "${f.key}": ""`;
  }).join(',\n');

  return `Sei un esperto antiquario e storico del design. Conosci case d'asta (Pandolfini, Christie's, Sotheby's, Wright, Quittenbaum, Catawiki) e produttori di design (Cassina, Kartell, Artemide, Knoll, Vitra, Zanotta, Stilnovo, Bitossi, Venini, Brionvega, Olivetti).

CLASSIFICAZIONE:
• Antiquariato: prima del 1900, o fino al 1940 se di manifattura nota
• Modernariato: 1940–1980, design o artigianato di qualità  
• Oggetto comune: produzione industriale post-1980 senza firma → non sovrastimare

STILI AMMESSI: Art Déco | Art Nouveau | Barocco | Bauhaus | Biedermeier | Classico | Eclettico | Impero | Liberty | Luigi XV | Luigi XVI | Memphis | Mid-Century Modern | Modernista | Neoclassico | Pop | Rinascimentale | Rococò | Rustico toscano | Space Age | Vittoriano

REGOLE:
- Tutti i campi in italiano
- Non lasciare mai catawikiStyle, catawikiSubcategory vuoti — usa vocabolario controllato sopra
- catawikiTitle: MAX 80 caratteri — es. "Lampadario Liberty bronzo e vetro soffiato, inizio XX sec." = 57 car. ✓
- Prezzi come range min–max coerente con canale indicato
- Tono: tecnico e diretto — no aggettivi come "pregiato", "raffinato", "elegante"
- Per plastiche vintage: segnala rischio acetone/solventi su bachelite, celluloide, plexiglas

Dati dell'oggetto:
- Nome: ${item.name}
- Descrizione: ${item.description}
- Categoria: ${item.category}
- Anno/Epoca: ${item.year || 'non specificato'}
- Dimensioni: ${item.dimensions || 'non specificate'}
- Condizione: ${item.wearCondition || 'non specificata'}
- Note tecniche: ${item.technicalNotes || 'nessuna'}
- Prezzo attuale: ${(item as any).estimatedValue || item.price || 'non specificato'}

Categoria Catawiki target: ${catawikiCat}

Genera SOLO un JSON valido (nessun testo prima o dopo):
{
  "catawikiTitle": "MAX 80 caratteri — conta prima di scrivere",
  "catawikiSubcategory": "dal vocabolario categoria ${catawikiCat}",
  "catawikiStyle": "uno degli stili ammessi sopra",
  "catawikiMaterial": "materiale principale specifico (es. Noce massello | Vetro soffiato Murano | ABS cromato)",
  "catawikiCountry": "paese di origine se deducibile, altrimenti Italia",
  "catawikiDescription": "3-5 frasi: cosa è · materiali · periodo · stato · attribuzione graduata se applicabile. Senza aggettivi da catalogo. MAX 500 caratteri.",
  "catawikiRestored": false,
${specificFieldsJson}
}`;
}

function CatawikiModal({ item, onClose, onSave }: {
  item: HeritageItem;
  onClose: () => void;
  onSave: (updated: HeritageItem) => Promise<void>;
}) {
  // Detect category
  const detectedCat = (CAT_MAP[item.category] || 'Oggetti') as CatawikiCat;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(item.catawikiCategory ? 2 : 1);
  const [catawikiCat, setCatawikiCat] = useState<CatawikiCat>(
    (CATAWIKI_CATS.includes(item.catawikiCategory as CatawikiCat) ? item.catawikiCategory : detectedCat) as CatawikiCat
  );
  const [common, setCommon] = useState({
    catawikiTitle: item.catawikiTitle || '',
    catawikiSubcategory: item.catawikiSubcategory || '',
    catawikiStyle: item.catawikiStyle || '',
    catawikiMaterial: item.catawikiMaterial || '',
    catawikiCountry: item.catawikiCountry || 'Italia',
    catawikiRestored: item.catawikiRestored ?? false,
    catawikiWeight: item.catawikiWeight || '',
    catawikiShippingAvailable: item.catawikiShippingAvailable ?? false,
    catawikiPickupAvailable: item.catawikiPickupAvailable ?? true,
    catawikiDescription: item.catawikiDescription || '',
    catawikiImages: (item.catawikiImages?.length ? item.catawikiImages : [item.imageUrl, ...(item.images || [])].filter(Boolean).slice(0, 5)) as string[],
  });
  const [specific, setSpecific] = useState<Record<string, string | boolean>>(
    (item as any).catawikiSpecific || {}
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const allImages = [item.imageUrl, ...(item.images || [])].filter(Boolean) as string[];
  const photoCount = common.catawikiImages.filter(Boolean).length;
  const copyToClipboard = (text: string, key: string) => {
    const done = () => { setCopied(key); setTimeout(() => setCopied(null), 3000); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else { fallbackCopy(text, done); }
  };

  const fallbackCopy = (text: string, done: () => void) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); } catch {}
    document.body.removeChild(ta);
  };

  const runAI = async () => {
    const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) return;
    setIsAiLoading(true);
    try {
      const prompt = buildCatawikiPrompt(item, catawikiCat);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
      });
      if (res.status === 529 || res.status === 503) throw new Error('Server AI sovraccarico — riprova tra qualche secondo');
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message?.includes('overloaded') ? 'Server AI sovraccarico — riprova tra qualche secondo' : e.error?.message || 'Errore API'); }
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Nessun JSON');
      const result = JSON.parse(match[0]);
      const newAiFields = new Set<string>();
      // Apply common fields
      const commonKeys = ['catawikiTitle','catawikiSubcategory','catawikiStyle','catawikiMaterial','catawikiCountry','catawikiDescription','catawikiRestored'];
      const newCommon = { ...common };
      commonKeys.forEach(k => {
        if (result[k] !== undefined && result[k] !== '' && result[k] !== false) {
          (newCommon as any)[k] = result[k];
          newAiFields.add(k);
        }
      });
      setCommon(newCommon);
      // Apply specific fields
      const newSpecific = { ...specific };
      CAT_FIELDS[catawikiCat].forEach(f => {
        if (result[f.key] !== undefined && result[f.key] !== '' && result[f.key] !== false) {
          newSpecific[f.key] = result[f.key];
          newAiFields.add(f.key);
        }
      });
      setSpecific(newSpecific);
      setAiFields(newAiFields);
      setStep(2);
    } catch (e: any) { alert('Errore AI: ' + e.message); }
    finally { setIsAiLoading(false); }
  };

  const buildExportLines = () => {
    const fields = CAT_FIELDS[catawikiCat];
    const selectedPhotos = common.catawikiImages.filter(Boolean);
    return [
      `════════════════════════════════════════`,
      `${item.name.toUpperCase()}`,
      `Categoria Catawiki: ${catawikiCat}`,
      `════════════════════════════════════════`,
      ``,
      `── IDENTIFICAZIONE ─────────────────────`,
      `Titolo lotto:      ${common.catawikiTitle || '—'}`,
      `Sottocategoria:    ${common.catawikiSubcategory || '—'}`,
      `Stile:             ${common.catawikiStyle || '—'}`,
      `Materiale:         ${common.catawikiMaterial || '—'}`,
      `Paese origine:     ${common.catawikiCountry || '—'}`,
      ``,
      `── CRONOLOGIA ──────────────────────────`,
      `Anno/Epoca:        ${item.year || '—'}`,
      ``,
      `── STATO ───────────────────────────────`,
      `Condizione:        ${item.wearCondition || '—'}`,
      `Restaurato:        ${common.catawikiRestored ? 'Sì' : 'No'}`,
      ``,
      `── MISURE ──────────────────────────────`,
      `Dimensioni:        ${item.dimensions || '—'}`,
      `Peso spedizione:   ${common.catawikiWeight || '—'} kg`,
      ``,
      `── LOGISTICA ───────────────────────────`,
      `Spedizione:        ${common.catawikiShippingAvailable ? 'Sì' : 'No'}`,
      `Ritiro:            ${common.catawikiPickupAvailable ? 'Sì' : 'No'}`,
      ``,
      `── ${catawikiCat.toUpperCase()} ─────────────────────────`,
      ...fields.map(f => {
        const val = specific[f.key];
        const display = val === true ? 'Sì' : val === false ? 'No' : (val || '—');
        return `${(f.label + ':').padEnd(20)} ${display}`;
      }),
      ``,
      `── DESCRIZIONE ─────────────────────────`,
      common.catawikiDescription || '—',
      ``,
      `── FOTO (${selectedPhotos.length}/5) ──────────────────────`,
      ...selectedPhotos.map((url, i) => `  ${i + 1}. ${url}`),
    ].join('\n');
  };

  const exportTxt = () => {
    const txt = buildExportLines();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catawiki-${item.name.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...item, ...common, catawikiCategory: catawikiCat, catawikiSpecific: specific } as HeritageItem);
      setSaveOk(true);
    } catch (e: any) { alert('Errore: ' + (e?.message || 'Riprova')); }
    finally { setIsSaving(false); }
  };

  const stepLabel = ['', 'Categoria', 'Campi comuni', 'Dettagli', 'Foto'][step];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-heritage-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden"
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '95svh', WebkitOverflowScrolling: 'touch' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-heritage-ink/8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7B1818] rounded-full flex items-center justify-center">
              <ExternalLink size={14} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[15px] text-heritage-ink">Scheda Catawiki</p>
              <p className="text-[11px] text-heritage-ink/50 font-serif italic">{item.name.slice(0, 35)}{item.name.length > 35 ? '…' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {[1,2,3,4].map(s => (
                <button key={s} onClick={() => s < step || saveOk ? setStep(s as any) : null}
                  className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${step === s ? 'bg-[#7B1818] text-white' : s < step ? 'bg-heritage-gold/30 text-heritage-gold cursor-pointer' : 'bg-heritage-ink/8 text-heritage-ink/30'}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={18} /></button>
          </div>
        </div>

        {/* Step label mobile */}
        <div className="px-6 py-2 bg-heritage-cream/30 border-b border-heritage-ink/5 flex items-center justify-between sm:hidden">
          <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">Step {step}/4 — {stepLabel}</p>
          <div className="flex gap-1">{[1,2,3,4].map(s => <div key={s} className={`w-6 h-1 rounded-full ${s <= step ? 'bg-[#7B1818]' : 'bg-heritage-ink/10'}`} />)}</div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-5">

          {/* ── STEP 1: Categoria ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/50 mb-1">Categoria rilevata</p>
                <p className="text-[13px] text-heritage-ink/40 font-serif italic mb-4">Basata su "{item.category}" — puoi cambiarla</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATAWIKI_CATS.map(cat => (
                    <button key={cat} onClick={() => setCatawikiCat(cat)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-left transition-all ${catawikiCat === cat ? 'border-[#7B1818] bg-[#7B1818]/5 text-[#7B1818]' : 'border-heritage-ink/10 text-heritage-ink/60 hover:border-heritage-ink/30'}`}>
                      <span className="font-bold text-[13px]">{cat}</span>
                      {catawikiCat === cat && <Check size={14} className="ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-heritage-gold/8 rounded-2xl border border-heritage-gold/20 flex items-start gap-3">
                <Sparkles size={16} className="text-heritage-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-gold mb-1">Pre-compila con AI</p>
                  <p className="text-[12px] text-heritage-ink/60 font-serif italic">Claude legge i dati dell'oggetto e compila i campi che riesce a dedurre. I campi incerti restano vuoti.</p>
                </div>
              </div>
              <button onClick={runAI} disabled={isAiLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-heritage-gold text-white rounded-2xl font-bold text-[12px] uppercase tracking-widest disabled:opacity-50">
                {isAiLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analisi in corso...</> : <><Sparkles size={14} />Pre-compila con AI e continua</>}
              </button>
              <button onClick={() => setStep(2)}
                className="w-full py-3 border border-heritage-ink/10 rounded-2xl text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40">
                Compila manualmente →
              </button>

              {/* Se scheda già compilata: copia rapida */}
              {item.catawikiTitle && (
                <div className="border-t border-heritage-ink/8 pt-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40 mb-3 text-center">Scheda già compilata</p>
                  <button
                    onClick={() => copyToClipboard(buildExportLines(), 'quickcopy')}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-[12px] font-bold uppercase tracking-widest transition-all ${copied === 'quickcopy' ? 'bg-green-50 border-green-200 text-green-600' : 'border-[#7B1818]/30 text-[#7B1818] bg-[#7B1818]/5 hover:bg-[#7B1818]/10'}`}>
                    {copied === 'quickcopy' ? <><Check size={14} />Copiato!</> : <><Upload size={14} />Copia scheda negli appunti</>}
                  </button>
                  <button
                    onClick={exportTxt}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 transition-all">
                    <Upload size={12} />Esporta .txt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Campi comuni ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Campi comuni</p>

              {/* Titolo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Titolo lotto *</p>
                    {aiFields.has('catawikiTitle') && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${common.catawikiTitle.length > 60 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{common.catawikiTitle.length}/60</span>
                    <CatawikiCopyBtn text={common.catawikiTitle} fk="title" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
                <input value={common.catawikiTitle} onChange={e => setCommon(p => ({ ...p, catawikiTitle: e.target.value }))}
                  className={`w-full border-b py-2 bg-transparent focus:outline-none font-heritage italic ${common.catawikiTitle.length > 60 ? 'border-red-300' : 'border-heritage-ink/20 focus:border-heritage-gold'}`}
                  style={{ fontSize: '16px' }}
                  placeholder="Titolo ottimizzato per Catawiki…" />
              </div>

              <CatawikiField label="Sottocategoria" fieldKey="catawikiSubcategory" value={common.catawikiSubcategory} isAi={aiFields.has('catawikiSubcategory')} onChange={v => setCommon(p => ({ ...p, catawikiSubcategory: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Stile" fieldKey="catawikiStyle" value={common.catawikiStyle} isAi={aiFields.has('catawikiStyle')} onChange={v => setCommon(p => ({ ...p, catawikiStyle: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Materiale principale" fieldKey="catawikiMaterial" value={common.catawikiMaterial} isAi={aiFields.has('catawikiMaterial')} onChange={v => setCommon(p => ({ ...p, catawikiMaterial: v }))} copied={copied} onCopy={copyToClipboard} />
              <CatawikiField label="Paese di origine" fieldKey="catawikiCountry" value={common.catawikiCountry} isAi={aiFields.has('catawikiCountry')} onChange={v => setCommon(p => ({ ...p, catawikiCountry: v }))} copied={copied} onCopy={copyToClipboard} />

              {/* Anno + Dimensioni read-only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Anno/Epoca</p>
                    <CatawikiCopyBtn text={item.year || '—'} fk="year" copied={copied} onCopy={copyToClipboard} />
                  </div>
                  <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.year || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Dimensioni</p>
                    <CatawikiCopyBtn text={item.dimensions || '—'} fk="dim" copied={copied} onCopy={copyToClipboard} />
                  </div>
                  <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.dimensions || '—'}</p>
                </div>
              </div>

              {/* Condizione read-only */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Condizione</p>
                  <CatawikiCopyBtn text={item.wearCondition || '—'} fk="cond" copied={copied} onCopy={copyToClipboard} />
                </div>
                <p className="py-2 text-[13px] font-heritage italic text-heritage-ink/60 border-b border-heritage-ink/8">{item.wearCondition || '—'}</p>
              </div>

              {/* Toggle */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {([
                  { key: 'catawikiRestored' as const, label: 'Restaurato' },
                  { key: 'catawikiShippingAvailable' as const, label: 'Spedizione' },
                  { key: 'catawikiPickupAvailable' as const, label: 'Ritiro' },
                ] as { key: keyof typeof common; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5 items-center p-3 bg-heritage-cream/30 rounded-xl">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{label}</p>
                    <CatawikiToggle val={!!common[key]} onToggle={() => setCommon(p => ({ ...p, [key]: !p[key] }))} />
                  </div>
                ))}
              </div>

              {/* Peso */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">Peso spedizione (kg)</p>
                <input value={common.catawikiWeight} onChange={e => setCommon(p => ({ ...p, catawikiWeight: e.target.value }))}
                  className="w-full border-b border-heritage-ink/20 py-2 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic"
                  style={{ fontSize: '16px' }}
                  placeholder="es. 12.5" type="number" step="0.1" />
              </div>
            </div>
          )}

          {/* ── STEP 3: Campi categoria ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Dettagli {catawikiCat}</p>
              {CAT_FIELDS[catawikiCat].map(f => (
                f.type === 'bool' ? (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b border-heritage-ink/8">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/50">{f.label}</p>
                      {aiFields.has(f.key) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                    </div>
                    <CatawikiToggle val={!!specific[f.key]} onToggle={() => setSpecific(p => ({ ...p, [f.key]: !p[f.key] }))} />
                  </div>
                ) : (
                  <CatawikiField key={f.key} label={f.label} fieldKey={f.key}
                    value={String(specific[f.key] ?? '')}
                    isAi={aiFields.has(f.key)}
                    options={f.options}
                    onChange={v => setSpecific(p => ({ ...p, [f.key]: v }))}
                    copied={copied} onCopy={copyToClipboard} />
                )
              ))}
            </div>
          )}

          {/* ── STEP 4: Descrizione + Foto ── */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Descrizione */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Descrizione</p>
                    {aiFields.has('catawikiDescription') && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${common.catawikiDescription.length > 500 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{common.catawikiDescription.length}/500</span>
                    <CatawikiCopyBtn text={common.catawikiDescription} fk="desc" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
                <textarea value={common.catawikiDescription} onChange={e => setCommon(p => ({ ...p, catawikiDescription: e.target.value }))}
                  className="w-full border border-heritage-ink/12 rounded-2xl p-4 bg-heritage-cream/20 focus:outline-none focus:border-heritage-gold resize-none font-heritage italic leading-relaxed"
                  style={{ fontSize: '16px' }}
                  rows={6} placeholder="Descrizione in stile asta Catawiki…" />
              </div>

              {/* Foto */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-[#7B1818]">Foto ({photoCount}/5)</p>
                  {photoCount < 5 && <p className="text-[11px] text-orange-500 font-bold">Mancano {5 - photoCount}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {allImages.map((img, i) => {
                    const sel = common.catawikiImages.includes(img);
                    const idx = common.catawikiImages.indexOf(img);
                    return (
                      <div key={i} onClick={() => {
                        setCommon(p => {
                          const imgs = p.catawikiImages.includes(img)
                            ? p.catawikiImages.filter(u => u !== img)
                            : p.catawikiImages.length < 5 ? [...p.catawikiImages, img] : p.catawikiImages;
                          return { ...p, catawikiImages: imgs };
                        });
                      }}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${sel ? 'border-[#7B1818]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                        {sel && <div className="absolute top-1 right-1 w-5 h-5 bg-[#7B1818] rounded-full flex items-center justify-center text-white text-[9px] font-bold">{idx + 1}</div>}
                      </div>
                    );
                  })}
                </div>
                {allImages.length === 0 && <p className="text-[12px] italic text-heritage-ink/40 text-center py-6">Nessuna foto disponibile — aggiungile dal form oggetto</p>}
              </div>

              {/* Copia tutto */}
              <button onClick={() => copyToClipboard(buildExportLines(), 'all')}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-[12px] font-bold uppercase tracking-widest transition-all ${copied === 'all' ? 'bg-green-50 border-green-200 text-green-600' : 'border-heritage-ink/10 text-heritage-ink/50 hover:bg-heritage-cream/40'}`}>
                {copied === 'all' ? '✓ Copiato!' : 'Copia tutto negli appunti'}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-heritage-ink/8 bg-white flex-shrink-0">
          <div className="flex gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(s => (s - 1) as any)}
                className="px-4 py-3 rounded-xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 flex-shrink-0">
                ← Indietro
              </button>
            ) : (
              <button onClick={onClose}
                className="px-4 py-3 rounded-xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/50 hover:bg-heritage-cream/40 flex-shrink-0">
                Annulla
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(s => (s + 1) as any)}
                className="flex-1 py-3 bg-[#7B1818] text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-[#5a1212] transition-colors">
                Avanti →
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <button onClick={saveOk ? exportTxt : handleSave} disabled={isSaving}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${saveOk ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#7B1818] hover:bg-[#5a1212] text-white'}`}>
                  {isSaving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvataggio...</>
                    : saveOk
                      ? <><Upload size={14} />Esporta .txt</>
                      : 'Salva scheda'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ItemFormContent (top-level per evitare re-mount su iOS) ──────────────────

function ItemFormContent({ form, setForm, isDragging, setIsDragging, isProcessingImage,
  isAnalyzing, detailImages, setDetailImages, uploadProgress, aiApplied,
  handleImageUpload, handleAddDetailImage, handleDetailImages, handleAnalyze,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isProcessingImage: boolean;
  isAnalyzing: boolean;
  detailImages: { base64: string; url: string; tipo: string }[];
  setDetailImages: React.Dispatch<React.SetStateAction<{ base64: string; url: string; tipo: string }[]>>;
  uploadProgress: { current: number; total: number } | null;
  aiApplied: Set<string>;
  handleImageUpload: (src: string | File) => void;
  handleAddDetailImage: (file: File, tipo: string) => void;
  handleDetailImages: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
}) {
  const Label = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{children}</span>
      {aiApplied.has(k) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
    </div>
  );
  const inputCls = "w-full border-b border-heritage-ink/15 py-2.5 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink";
  const sectionTitle = (t: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold flex-shrink-0" />
      <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{t}</p>
      <div className="flex-1 h-px bg-heritage-ink/8" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── FOTO PRINCIPALE ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Foto')}
        <div className="rounded-2xl border-2 border-dashed border-heritage-ink/10 overflow-hidden bg-heritage-cream/20">
          {form.imageUrl ? (
            <div className="relative h-52">
              <img src={form.imageUrl} className={`absolute inset-0 w-full h-full object-cover ${isProcessingImage ? 'opacity-50 blur-sm' : ''}`} />
              {isProcessingImage && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}
              <button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="absolute top-3 right-3 bg-white/90 text-heritage-ink px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow">Rimuovi</button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageUpload(f); }}
              className={`h-36 flex flex-col items-center justify-center gap-2 transition-colors ${isDragging ? 'bg-heritage-gold/10' : ''}`}>
              {isProcessingImage
                ? <><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /><p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/40">Elaborazione...</p></>
                : <Camera size={36} className="text-heritage-ink/20" />}
            </div>
          )}
          {!isProcessingImage && (
            <div className="grid grid-cols-2 border-t border-heritage-ink/8">
              <label className="flex flex-col items-center gap-1.5 py-3 cursor-pointer border-r border-heritage-ink/8 active:bg-heritage-cream/60">
                <Camera size={18} className="text-heritage-gold" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">Scatta</span>
                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              </label>
              <label className="flex flex-col items-center gap-1.5 py-3 cursor-pointer active:bg-heritage-cream/60">
                <ImageIcon size={18} className="text-heritage-gold" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">Galleria</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              </label>
            </div>
          )}
        </div>

        {/* Foto dettaglio */}
        {detailImages.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {detailImages.map((d, i) => (
              <div key={i} className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-heritage-ink/10"><img src={d.url} className="w-full h-full object-cover" /></div>
                <p className="text-[9px] uppercase tracking-wide font-bold text-heritage-ink/40 text-center mt-0.5 max-w-[64px] truncate">{d.tipo}</p>
                <button type="button" onClick={() => { setDetailImages(prev => prev.filter((_, j) => j !== i)); setForm(p => ({ ...p, images: p.images.filter(img => img !== d.url) })); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><X size={8} className="text-white" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {DETAIL_TYPES_IM.map(tipo => (
            <label key={tipo} className="flex items-center gap-1 px-2.5 py-1.5 bg-heritage-cream/60 rounded-full cursor-pointer active:bg-heritage-gold/20 border border-heritage-ink/8">
              <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/60">{tipo}</span>
              <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddDetailImage(f, tipo); }} />
            </label>
          ))}
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-heritage-gold/10 border border-heritage-gold/30 rounded-full cursor-pointer">
            <Upload size={11} className="text-heritage-gold" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-gold">Batch</span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleDetailImages} />
          </label>
        </div>
        {uploadProgress && (
          <div className="mt-2">
            <div className="h-1 bg-heritage-ink/8 rounded-full overflow-hidden"><div className="h-full bg-heritage-gold rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} /></div>
            <p className="text-[10px] text-heritage-ink/40 mt-1 uppercase tracking-widest font-bold">{uploadProgress.current}/{uploadProgress.total} foto</p>
          </div>
        )}

        {/* Analizza con AI */}
        {form.imageUrl && (
          <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[12px] uppercase tracking-widest transition-all ${isAnalyzing ? 'bg-heritage-gold/20 text-heritage-gold cursor-wait' : 'bg-heritage-gold text-white shadow-md'}`}>
            {isAnalyzing
              ? <><div className="w-4 h-4 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />Analisi in corso...</>
              : <><Sparkles size={14} />Analizza con Claude</>}
          </button>
        )}
        {aiApplied.size > 0 && (
          <p className="text-[10px] text-heritage-gold font-bold uppercase tracking-widest text-center mt-2">
            ✦ {aiApplied.size} campi compilati dall'AI — i badge dorati indicano i campi aggiornati
          </p>
        )}
      </div>

      {/* ── DATI BASE ───────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Dati oggetto')}
        <div className="space-y-5">
          <div>
            <Label k="name">Nome *</Label>
            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Scrittoio in noce" />
          </div>
          <div>
            <Label k="category">Categoria *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ITEM_CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c, catawikiCategory: CAT_MAP[c] || '' }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all ${form.category === c ? 'bg-heritage-ink text-white' : 'bg-heritage-ink/8 text-heritage-ink/60'}`}>
                  {c}{aiApplied.has('category') && form.category === c && <span className="ml-1 text-heritage-gold">✦</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label k="room">Stanza *</Label>
            <input required value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Salotto" />
          </div>
          <div>
            <Label k="description">Descrizione *</Label>
            <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none h-20`} style={{ fontSize: '16px' }} placeholder="Racconta la storia..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="year">Anno/Epoca</Label>
              <input value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 1850 circa" />
            </div>
            <div>
              <Label k="dimensions">Dimensioni</Label>
              <input value={form.dimensions} onChange={e => setForm(p => ({ ...p, dimensions: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 80×40×90 cm" />
            </div>
          </div>
          <div>
            <Label k="technicalNotes">Note tecniche</Label>
            <textarea value={form.technicalNotes} onChange={e => setForm(p => ({ ...p, technicalNotes: e.target.value }))} className={`${inputCls} resize-none h-16`} style={{ fontSize: '16px' }} placeholder="Materiali, tecnica, dettagli..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="wearCondition">Condizione</Label>
              <select value={form.wearCondition} onChange={e => setForm(p => ({ ...p, wearCondition: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="">—</option>
                <option value="Ottimo">Ottimo</option>
                <option value="Buono">Buono</option>
                <option value="Discreto">Discreto</option>
                <option value="Da restaurare">Da restaurare</option>
              </select>
            </div>
            <div>
              <Label k="price">Prezzo</Label>
              <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="€ 500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SCHEDA CATAWIKI ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Scheda Catawiki')}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label k="catawikiTitle">Titolo annuncio</Label>
              <span className={`text-[10px] font-bold ${form.catawikiTitle.length > 60 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{form.catawikiTitle.length}/60</span>
            </div>
            <input value={form.catawikiTitle} onChange={e => setForm(p => ({ ...p, catawikiTitle: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Titolo ottimizzato per Catawiki..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="catawikiSubcategory">Sottocategoria</Label>
              <input value={form.catawikiSubcategory} onChange={e => setForm(p => ({ ...p, catawikiSubcategory: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Comò" />
            </div>
            <div>
              <Label k="catawikiStyle">Stile</Label>
              <input value={form.catawikiStyle} onChange={e => setForm(p => ({ ...p, catawikiStyle: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Luigi XVI" />
            </div>
            <div>
              <Label k="catawikiMaterial">Materiale</Label>
              <input value={form.catawikiMaterial} onChange={e => setForm(p => ({ ...p, catawikiMaterial: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Noce massello" />
            </div>
            <div>
              <Label k="catawikiCountry">Paese origine</Label>
              <input value={form.catawikiCountry} onChange={e => setForm(p => ({ ...p, catawikiCountry: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. Italia" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label k="catawikiDescription">Descrizione catalogo</Label>
              <span className={`text-[10px] font-bold ${form.catawikiDescription.length > 500 ? 'text-red-500' : 'text-heritage-ink/30'}`}>{form.catawikiDescription.length}/500</span>
            </div>
            <textarea value={form.catawikiDescription} onChange={e => setForm(p => ({ ...p, catawikiDescription: e.target.value }))} className={`${inputCls} resize-none h-28`} style={{ fontSize: '16px' }} placeholder="Descrizione formale stile asta..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'catawikiRestored', l: 'Restaurato' },
              { k: 'catawikiShippingAvailable', l: 'Spedizione' },
              { k: 'catawikiPickupAvailable', l: 'Ritiro' },
            ].map(({ k, l }) => (
              <div key={k} className="flex flex-col items-center gap-1.5 p-3 bg-heritage-cream/30 rounded-xl cursor-pointer"
                onClick={() => setForm(p => ({ ...p, [k]: !(p as any)[k] }))}>
                <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/40">{l}</p>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${(form as any)[k] ? 'bg-[#7B1818]' : 'bg-heritage-ink/15'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[k] ? 'translate-x-4' : ''}`} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label k="catawikiWeight">Peso spedizione (kg)</Label>
            <input value={form.catawikiWeight} onChange={e => setForm(p => ({ ...p, catawikiWeight: e.target.value }))} type="number" step="0.1" className={inputCls} style={{ fontSize: '16px' }} placeholder="Es. 12.5" />
          </div>
        </div>
      </div>

      {/* ── DETTAGLI VENDITA ─────────────────────────────────────────── */}
      <div>
        {sectionTitle('Vendita e logistica')}
        <div className="space-y-5">

          {/* Stato — pillole */}
          <div>
            <Label k="status">Stato</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['Disponibile', 'Riservato', 'Affidato', 'Venduto'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                    form.status === s
                      ? s === 'Disponibile' ? 'bg-emerald-700 text-white border-emerald-700'
                      : s === 'Riservato' ? 'bg-heritage-gold text-white border-heritage-gold'
                      : s === 'Affidato' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-heritage-ink text-white border-heritage-ink'
                      : 'bg-transparent text-heritage-ink/50 border-heritage-ink/15 hover:border-heritage-ink/30'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Canale — pillole */}
          <div>
            <Label k="acquisitionType">Canale</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['Vendita', 'Catawiki', 'Lascito Affettivo', 'Famiglia'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(p => ({ ...p, acquisitionType: t, ...(t === 'Famiglia' ? { status: 'Affidato' } : {}) }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                    form.acquisitionType === t
                      ? 'bg-heritage-gold text-white border-heritage-gold'
                      : 'bg-transparent text-heritage-ink/50 border-heritage-ink/15 hover:border-heritage-gold/40'
                  }`}>
                  {t === 'Lascito Affettivo' ? 'Adozione / Regalo' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Prezzi — sempre visibili, readonly se non disponibile/in vendita */}
          {(() => {
            const editable = form.status === 'Disponibile';
            const lockedLabel = form.status === 'Riservato' ? 'Riservato' : form.status === 'Affidato' ? 'In adozione' : form.status === 'Venduto' ? 'Venduto' : '';
            return (
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border ${editable ? 'bg-heritage-ink/3 border-heritage-ink/8' : 'bg-heritage-ink/5 border-heritage-ink/12 opacity-70'}`}>
                <div>
                  <Label k="price">Prezzo rif. <span className="text-heritage-ink/30 normal-case font-normal tracking-normal text-[10px]">(solo admin)</span></Label>
                  <input
                    value={form.price}
                    onChange={e => editable && setForm(p => ({ ...p, price: e.target.value }))}
                    readOnly={!editable}
                    className={`${inputCls} ${!editable ? 'cursor-not-allowed' : ''}`}
                    style={{ fontSize: '16px' }}
                    placeholder="€ 280–380"
                  />
                </div>
                <div>
                  <Label k="displayPrice">Prezzo display <span className="text-heritage-ink/30 normal-case font-normal tracking-normal text-[10px]">(pubblico)</span></Label>
                  <input
                    value={editable ? ((form as any).displayPrice || '') : lockedLabel}
                    onChange={e => editable && setForm(p => ({ ...p, displayPrice: e.target.value } as any))}
                    readOnly={!editable}
                    className={`${inputCls} ${!editable ? 'cursor-not-allowed text-heritage-ink/50 italic' : ''}`}
                    style={{ fontSize: '16px' }}
                    placeholder="Da definire / € 350"
                  />
                </div>
                {!editable && <p className="col-span-2 text-[10px] text-heritage-ink/40 italic">Prezzi non modificabili per oggetti {form.status.toLowerCase()}</p>}
              </div>
            );
          })()}

          {/* Logistica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label k="destination">Dove si trova</Label>
              <select value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="Barberino">Barberino</option>
                <option value="Torino">Torino</option>
                <option value="Cinisello Balsamo">Cinisello Balsamo</option>
                <option value="Sorella">Sorella</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
            <div>
              <Label k="shipping">Spedizione</Label>
              <select value={form.shipping} onChange={e => setForm(p => ({ ...p, shipping: e.target.value as any }))} className={inputCls} style={{ fontSize: '16px' }}>
                <option value="">—</option>
                <option value="Ritiro in sede">Ritiro in sede</option>
                <option value="Spedizione possibile">Spedizione possibile</option>
                <option value="Solo ritiro">Solo ritiro</option>
                <option value="Concordare">Concordare</option>
              </select>
            </div>
          </div>

          <div>
            <Label k="catawikiUrl">Link Catawiki</Label>
            <input value={form.catawikiUrl} onChange={e => setForm(p => ({ ...p, catawikiUrl: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="https://www.catawiki.com/..." />
          </div>
          <div>
            <Label k="productCode">Codice</Label>
            <input value={form.productCode} onChange={e => setForm(p => ({ ...p, productCode: e.target.value }))} className={inputCls} style={{ fontSize: '16px' }} placeholder="ART-001" />
          </div>
          <div className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-heritage-ink/50">In evidenza (Home)</span>
          </div>
          <div className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setForm((p: any) => ({ ...p, isImportant: !p.isImportant }))}>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${(form as any).isImportant ? 'bg-heritage-ink' : 'bg-heritage-ink/10'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${(form as any).isImportant ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-heritage-ink/50">Importante (sfondo nero catalogo)</span>
          </div>
        </div>
      </div>

      {/* ── GALLERY ──────────────────────────────────────────────────── */}
      <div>
        {sectionTitle('Gallery foto')}
        <div className="flex flex-wrap gap-2">
          {form.images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group border border-heritage-ink/10">
              <img src={img} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100">
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
          ))}
          {form.images.length === 0 && (
            <p className="text-[12px] italic text-heritage-ink/40 w-full text-center py-6 border border-dashed border-heritage-ink/10 rounded-xl">Nessuna foto aggiuntiva</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── ItemModal ────────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = ['Mobili', 'Illuminazione', 'Sedute', 'Quadri', 'Porcellane', 'Tappeti', 'Giardino', 'Libri', 'Oggetti'];
const DETAIL_TYPES_IM = ['Firma / timbro', 'Hardware / cerniere', 'Etichetta', 'Dettaglio decorativo', 'Materiale / legno', 'Stato conservazione', 'Altro'];

function ItemModal({ isOpen, onClose, onSave, initialData, onDelete, nextOrder }: {
  isOpen: boolean; onClose: () => void; onSave: (item: HeritageItem) => Promise<void>;
  initialData?: HeritageItem | null; onDelete?: (id: string) => void; nextOrder: number;
}) {
  const [form, setForm] = useState({ ...emptyForm, order: nextOrder });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailImages, setDetailImages] = useState<{ base64: string; url: string; tipo: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [imageBase64ForAnalysis, setImageBase64ForAnalysis] = useState<string>('');
  const [aiApplied, setAiApplied] = useState<Set<string>>(new Set());
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 150) onClose(); };

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name || '', description: initialData.description || '',
        room: initialData.room || '', category: initialData.category || '',
        year: initialData.year || '', dimensions: initialData.dimensions || '',
        status: initialData.status || 'Disponibile', acquisitionType: initialData.acquisitionType || 'Vendita',
        price: initialData.price || '', catawikiUrl: initialData.catawikiUrl || '',
        imageUrl: initialData.imageUrl || '', technicalNotes: initialData.technicalNotes || '',
        destination: initialData.destination || 'Barberino', estimatedValue: initialData.estimatedValue || '',
        productCode: initialData.productCode || '', wearCondition: initialData.wearCondition || '',
        shipping: initialData.shipping || '', isFeatured: initialData.isFeatured || false, isImportant: (initialData as any).isImportant || false,
        order: initialData.order ?? nextOrder, details: initialData.details || [], images: initialData.images || [],
        catawikiTitle: initialData.catawikiTitle || '', catawikiCategory: initialData.catawikiCategory || '',
        catawikiSubcategory: initialData.catawikiSubcategory || '', catawikiStyle: initialData.catawikiStyle || '',
        catawikiMaterial: initialData.catawikiMaterial || '', catawikiCountry: initialData.catawikiCountry || '',
        catawikiRestored: initialData.catawikiRestored || false, catawikiWeight: initialData.catawikiWeight || '',
        catawikiShippingAvailable: initialData.catawikiShippingAvailable || false,
        catawikiPickupAvailable: initialData.catawikiPickupAvailable ?? true,
        catawikiDescription: initialData.catawikiDescription || '',
        catawikiImages: initialData.catawikiImages || [],
        catawikiSpecific: (initialData as any).catawikiSpecific || {},
        displayPrice: (initialData as any).displayPrice || initialData.price || '',
      });
    } else {
      setForm({ ...emptyForm, order: nextOrder });
    }
    // Popola detailImages con le foto già caricate (URL GitHub) per rianalisi
    if (initialData?.images && initialData.images.length > 0) {
      setDetailImages(initialData.images.map((url, i) => ({
        base64: url, // URL — verrà convertito in base64 in analyzeImageWithClaude
        url,
        tipo: i === 0 ? 'Dettaglio' : `Foto ${i + 1}`,
      })));
    } else {
      setDetailImages([]);
    }
    setAiApplied(new Set());
    setImageBase64ForAnalysis('');
  }, [initialData, isOpen, nextOrder]);

  // ── Upload foto principale ──────────────────────────────────────────────────
  const handleImageUpload = async (src: string | File) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(src);
      setImageBase64ForAnalysis(r);
      const token = localStorage.getItem('b2026_github_token');
      if (token && src instanceof File) {
        const fileName = `${Date.now()}-${(src as File).name.replace(/[^a-z0-9.]/gi, '-')}`;
        const url = await uploadImageToGitHub(r, fileName);
        if (url) { setForm(p => ({ ...p, imageUrl: url })); return; }
      }
      setForm(p => ({ ...p, imageUrl: r }));
    } catch { alert('Errore immagine.'); }
    finally { setIsProcessingImage(false); }
  };

  // ── Upload foto dettaglio ───────────────────────────────────────────────────
  const handleAddDetailImage = async (file: File, tipo: string) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(file);
      const token = localStorage.getItem('b2026_github_token');
      let url = r;
      if (token) {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
        url = await uploadImageToGitHub(r, fileName) || r;
      }
      setDetailImages(prev => [...prev, { base64: r, url, tipo }]);
      setForm(p => ({ ...p, images: [...p.images, url] }));
    } catch {}
    finally { setIsProcessingImage(false); }
  };

  const handleDetailImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setIsProcessingImage(true);
    setUploadProgress({ current: 0, total: imageFiles.length });
    const imgs = [...form.images];
    const newDetailImgs: { base64: string; url: string; tipo: string }[] = [];
    const token = localStorage.getItem('b2026_github_token');
    for (let i = 0; i < imageFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: imageFiles.length });
      try {
        const r = await resizeImage(imageFiles[i]);
        let url = r;
        if (token) {
          const fileName = `${Date.now()}-${imageFiles[i].name.replace(/[^a-z0-9.]/gi, '-')}`;
          url = await uploadImageToGitHub(r, fileName) || r;
        }
        imgs.push(url);
        newDetailImgs.push({ base64: r, url, tipo: 'Galleria' });
      } catch { console.error(`Errore su ${imageFiles[i].name}`); }
    }
    setForm(p => ({ ...p, images: imgs }));
    setDetailImages(prev => [...prev, ...newDetailImgs]);
    setIsProcessingImage(false);
    setUploadProgress(null);
    e.target.value = '';
  };

  // ── Analisi AI unificata ────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!imageBase64ForAnalysis && !form.imageUrl) return;
    setIsAnalyzing(true);
    try {
      let mainBase64 = imageBase64ForAnalysis;
      if (!mainBase64 && form.imageUrl) {
        const res = await fetch(form.imageUrl);
        const blob = await res.blob();
        mainBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      const result = await analyzeImageWithClaude(mainBase64, detailImages.length > 0 ? detailImages : undefined);
      if (!result) { alert('Nessun risultato. Riprova con una foto più nitida.'); return; }
      const r = result as any;
      const applied = new Set<string>();
      setForm(p => {
        const updated = { ...p };
        // Campi base
        const baseFields = ['name','description','category','room','year','dimensions','price','technicalNotes','wearCondition'];
        baseFields.forEach(k => { if (r[k]) { (updated as any)[k] = r[k]; applied.add(k); } });
        // Campi Catawiki
        const catFields = ['catawikiTitle','catawikiSubcategory','catawikiStyle','catawikiMaterial','catawikiCountry','catawikiDescription','catawikiRestored'];
        catFields.forEach(k => { if (r[k] !== undefined && r[k] !== '') { (updated as any)[k] = r[k]; applied.add(k); } });
        if (r.category) updated.catawikiCategory = CAT_MAP[r.category] || p.catawikiCategory;
        return updated;
      });
      setAiApplied(applied);
    } catch (e: any) { alert('Errore AI: ' + e.message); }
    finally { setIsAnalyzing(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try { await onSave({ ...form, id: initialData?.id || genId(), stories: initialData?.stories || [], displayPrice: (form as any).displayPrice || '' } as any); }
    finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  // ── Helper field label con badge AI ────────────────────────────────────────
  const Label = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{children}</span>
      {aiApplied.has(k) && <span className="text-[9px] bg-heritage-gold/20 text-heritage-gold font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
    </div>
  );

  const inputCls = "w-full border-b border-heritage-ink/15 py-2.5 bg-transparent focus:outline-none focus:border-heritage-gold font-heritage italic text-heritage-ink";
  const sectionTitle = (t: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-heritage-gold flex-shrink-0" />
      <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50">{t}</p>
      <div className="flex-1 h-px bg-heritage-ink/8" />
    </div>
  );

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* ── DESKTOP ── */}
      <motion.div key="desktop-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="hidden md:flex fixed inset-0 z-[101] items-center justify-center p-6 pointer-events-none">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl pointer-events-auto flex flex-col" style={{ maxHeight: '92vh' }}
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-8 py-5 border-b border-heritage-ink/8 flex items-center justify-between flex-shrink-0">
            <h3 className="text-2xl font-serif text-heritage-ink">{initialData ? `Modifica: ${initialData.name.split(' ').slice(0,4).join(' ')}` : 'Nuovo Oggetto'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
          </div>
          {/* Scrollable */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-8 py-6">
            <ItemFormContent
              form={form} setForm={setForm} isDragging={isDragging} setIsDragging={setIsDragging}
              isProcessingImage={isProcessingImage} isAnalyzing={isAnalyzing}
              detailImages={detailImages} setDetailImages={setDetailImages}
              uploadProgress={uploadProgress} aiApplied={aiApplied}
              handleImageUpload={handleImageUpload} handleAddDetailImage={handleAddDetailImage}
              handleDetailImages={handleDetailImages} handleAnalyze={handleAnalyze}
            />
            <div className="flex gap-4 pt-6 pb-2">
              {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-5 py-3.5 rounded-xl border border-red-100 text-red-500 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} />Elimina</button>}
              <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* ── MOBILE ── */}
      <motion.div key="mobile-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
        style={{ maxHeight: '95svh', overflowX: 'hidden' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
        </div>
        {/* Header */}
        <div className="px-6 py-3 border-b border-heritage-ink/5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-serif text-heritage-ink">{initialData ? `Modifica` : 'Nuovo Oggetto'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
        </div>
        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 pb-28">
          <ItemFormContent
              form={form} setForm={setForm} isDragging={isDragging} setIsDragging={setIsDragging}
              isProcessingImage={isProcessingImage} isAnalyzing={isAnalyzing}
              detailImages={detailImages} setDetailImages={setDetailImages}
              uploadProgress={uploadProgress} aiApplied={aiApplied}
              handleImageUpload={handleImageUpload} handleAddDetailImage={handleAddDetailImage}
              handleDetailImages={handleDetailImages} handleAnalyze={handleAnalyze}
            />
          <div className="flex gap-3 pt-6">
            {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-4 py-4 rounded-xl border border-red-100 text-red-500 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /></button>}
            <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

// build Fri May 22 12:06:43 UTC 2026

// deploy 20260520142743

// ─── 🧪 Lab: ReelPhotoCard ──────────────────────────────────────────────────────
function ReelPhotoCard({ src }: { src: string }) {
  const [imgH, setImgH] = React.useState(55);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    const landscape = ratio > 1.3;
    setIsLandscape(landscape);
    setImgH(55);
  };
  return (
    <div style={{ height: `${imgH}%`, overflow: 'hidden', flexShrink: 0, position: 'relative', transition: 'height 0.3s ease' }}>
      <img src={src} alt="" onLoad={onLoad} style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: 'center top',
      }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, transparent 0%, rgba(28,26,22,0.6) 50%, #1C1A16 90%, #1C1A16 100%)' }} />
    </div>
  );
}

// ─── 🧪 Lab: MemoriesReelView ────────────────────────────────────────────────
const REEL_COLORS: Record<string, string> = { Emanuela: '#8B6914', Aleria: '#2D5016', Olivia: '#1A3A5C' };
const REEL_AUTHORS = ['Tutti', 'Emanuela', 'Aleria', 'Olivia'];

function MemoriesReelView({ memories, onClose }: { memories: FamilyMemory[]; onClose: () => void }) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState(0);

  const filtered = React.useMemo(() =>
    activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor),
  [memories, activeAuthor]);

  React.useEffect(() => {
    setCurrent(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeAuthor]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight);
      if (idx >= filtered.length) {
        // Card fantasma raggiunta — jump silenzioso al primo dopo un frame
        setCurrent(0);
        requestAnimationFrame(() => {
          el.style.scrollSnapType = 'none';
          el.scrollTop = 0;
          requestAnimationFrame(() => {
            el.style.scrollSnapType = 'y mandatory';
          });
        });
      } else {
        setCurrent(idx);
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
  };

  const color = (author: string) => REEL_COLORS[author] || '#8B6914';
  const ini = (author: string) => author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#1C1A16' }}>

      {/* Filtri autori */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '48px 16px 12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {REEL_AUTHORS.map(a => {
              const active = activeAuthor === a;
              const c = REEL_COLORS[a];
              return (
                <button key={a} onClick={() => setActiveAuthor(a)} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  background: active ? (c || 'rgba(255,255,255,0.9)') : 'rgba(255,255,255,0.15)',
                  color: active ? (c ? 'white' : '#1C1A16') : 'rgba(255,255,255,0.7)',
                }}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((_, i) => (
          <div key={i} onClick={() => scrollTo(i)} style={{
            width: i === current ? 4 : 3,
            height: i === current ? 28 : 8,
            borderRadius: 100,
            background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.3s',
            cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Contatore + frecce */}
      <div style={{ position: 'absolute', bottom: 'max(40px, env(safe-area-inset-bottom, 0px) + 28px)', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => scrollTo(current === 0 ? filtered.length - 1 : current - 1)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', minWidth: 40, textAlign: 'center' as const }}>{current + 1} / {filtered.length}</span>
        <button onClick={() => scrollTo(current === filtered.length - 1 ? 0 : current + 1)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
      </div>

      {/* Scroll container */}
      <div ref={containerRef} style={{
        height: '100dvh', overflowY: 'scroll', overflowX: 'hidden',
        scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', overscrollBehavior: 'none',
      }}>
        {filtered.length === 0 ? (
          <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', gap: 16 }}>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 20 }}>Nessun ricordo</p>
            <button onClick={onClose} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 100, color: 'white', cursor: 'pointer' }}>Torna indietro</button>
          </div>
        ) : filtered.map((mem, i) => {
          const c = color(mem.author);
          const av = ini(mem.author);
          const hasImg = !!mem.imageUrl;

          return (
            <div key={mem.id} style={{
              height: '100dvh', width: '100%', flexShrink: 0,
              scrollSnapAlign: 'start', scrollSnapStop: 'always',
              display: 'flex', flexDirection: 'column',
              background: hasImg ? '#1C1A16' : '#F2EDE3',
              position: 'relative',
            }}>
              {hasImg ? (
                <>
                  <ReelPhotoCard src={mem.imageUrl || ''} />
                  <div style={{ flex: 1, padding: '20px 24px 160px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                      </div>
                    </div>
                    {/* Anno discreto */}
                    {mem.date && (
                      <div style={{ position: 'absolute', top: 12, right: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
                        {mem.date.slice(0,4)}
                      </div>
                    )}
                    <p style={{ fontSize: mem.text.length > 200 ? 16 : mem.text.length > 120 ? 18 : 20, lineHeight: 1.65, color: 'rgba(255,255,255,0.92)', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 32px 120px', position: 'relative', overflow: 'hidden' }}>
                  {/* Sfondo tenue per autore */}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 60%, ${c}08 0%, transparent 70%)` }} />
                  {/* Virgolettone */}
                  <div style={{ position: 'absolute', top: 180, left: 16, fontSize: 180, lineHeight: 1, color: c, opacity: 0.06, fontFamily: 'Georgia,serif', userSelect: 'none', pointerEvents: 'none' }}>"</div>
                  {/* Anno — solo se storico */}
                  {mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear() && (
                    <div style={{ position: 'absolute', bottom: 72, right: 24, fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(28,26,22,0.15)', fontFamily: 'sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
                      {mem.date.slice(0,4)}
                    </div>
                  )}
                  {/* Autore */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: `0 2px 8px ${c}40` }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                      {mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear() && (
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date.slice(0,4)}</p>
                      )}
                    </div>
                  </div>
                  {/* Testo */}
                  <p style={{ fontSize: mem.text.length > 200 ? 19 : mem.text.length > 120 ? 22 : 27, lineHeight: 1.7, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                </div>
              )}
            </div>
          );
        })}
        {/* Card fantasma — clone del primo per loop infinito */}
        {filtered.length > 0 && (() => {
          const mem = filtered[0];
          const c = color(mem.author);
          const av = ini(mem.author);
          const hasImg = !!mem.imageUrl;
          return (
            <div key="loop-clone" style={{
              height: '100dvh', width: '100%', flexShrink: 0,
              scrollSnapAlign: 'start', scrollSnapStop: 'always',
              display: 'flex', flexDirection: 'column',
              background: hasImg ? '#1C1A16' : '#F2EDE3',
              position: 'relative',
            }}>
              {hasImg ? (
                <>
                  <ReelPhotoCard src={mem.imageUrl || ''} />
                  <div style={{ flex: 1, padding: '20px 24px 160px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,0.92)', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0 }}>{mem.text}</p>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 28px 160px', position: 'relative' }}>
                  <div style={{ fontSize: 100, lineHeight: 1, color: c, opacity: 0.08, fontFamily: 'Georgia', position: 'absolute', top: 60, left: 20 }}>"</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c, fontFamily: 'sans-serif' }}>{mem.author}</p>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,7)}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 21, lineHeight: 1.55, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: 0, position: 'relative', zIndex: 1 }}>{mem.text}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
// ─── 🧪 Lab: ReelV2Photo ────────────────────────────────────────────────────
function ReelV2Photo({ src, year }: { src: string; year?: string }) {
  const [isPortrait, setIsPortrait] = React.useState(false);
  const shortYear = year ? year.slice(0,4) : null;
  return (
    <div style={{ width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 20, flexShrink: 0, boxShadow: '0 8px 32px rgba(28,26,22,0.12)', border: '1px solid rgba(28,26,22,0.06)', height: isPortrait ? 'auto' : 260, maxHeight: 320, position: 'relative' }}>
      <img src={src} alt=""
        onLoad={e => { const img = e.currentTarget; setIsPortrait(img.naturalHeight > img.naturalWidth * 1.1); }}
        style={{ width: '100%', height: isPortrait ? 'auto' : '100%', display: 'block', objectFit: 'cover', objectPosition: 'center top' }} />
      {shortYear && (
        <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 48, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,0.55)', fontFamily: '"Cormorant Garamond", "Cormorant", Georgia, serif', fontStyle: 'italic', letterSpacing: '-0.02em', userSelect: 'none', pointerEvents: 'none', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {shortYear}
        </div>
      )}
    </div>
  );
}

// ─── 🧪 Lab: MemoriesReelV2 — stile loader ───────────────────────────────────
// ─── Reel Cover — mosaico animato, una volta per sessione ───────────────────

const REEL_COVER_STYLE = `
  @keyframes reelSlowZoom {
    from { transform: scale(1); }
    to   { transform: scale(1.06); }
  }
  @keyframes reelGrain {
    0%,100% { transform: translate(0,0); }
    10%  { transform: translate(-2%,-3%); }
    30%  { transform: translate(3%,2%); }
    50%  { transform: translate(-1%,4%); }
    70%  { transform: translate(4%,-1%); }
    90%  { transform: translate(-3%,3%); }
  }
  @keyframes reelFadeOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.04); }
  }
  @keyframes lightboxIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes colorize {
    0%   { filter: grayscale(100%) brightness(0.85); }
    100% { filter: grayscale(0%) brightness(1); }
  }
  @keyframes qfade {
    0%   { opacity: 0; transform: translateY(5px); }
    8%   { opacity: 1; transform: translateY(0); }
    28%  { opacity: 1; transform: translateY(0); }
    36%  { opacity: 0; transform: translateY(-5px); }
    100% { opacity: 0; }
  }
  @keyframes qfade1 {
    0%   { opacity: 1; transform: translateY(0); }
    28%  { opacity: 1; transform: translateY(0); }
    36%  { opacity: 0; transform: translateY(-5px); }
    100% { opacity: 0; }
  }
  .cover-q1 { animation: qfade1 7s ease-in-out infinite 0s; }
  .cover-q2 { animation: qfade 7s ease-in-out infinite 2.33s; }
  .cover-q3 { animation: qfade 7s ease-in-out infinite 4.66s; }
  .cover-cell::after {
    content: '';
    position: absolute; inset: 0;
    border: 2px solid transparent;
    transition: border-color 0.15s;
    pointer-events: none;
    z-index: 2;
  }
  .cover-cell:hover::after { border-color: transparent; }
  .cover-cell-info {
    position: absolute; bottom: 7px; left: 8px;
    z-index: 3; opacity: 0;
    transform: translateY(3px);
    transition: opacity 0.2s, transform 0.2s;
  }
  .cover-cell:hover .cover-cell-info { opacity: 1; transform: translateY(0); }
`;

function ReelCover({ memories, onStart }: {
  memories: FamilyMemory[];
  onStart: (mem?: FamilyMemory) => void;
}) {
  const seed = React.useRef(Date.now()).current;

  // Seleziona 8 foto con foto, randomizzate
  const tiles: FamilyMemory[] = React.useMemo(() => {
    let s = seed;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
    const withPhoto = memories.filter(m => m.imageUrl);
    return [...withPhoto].sort(() => rnd() - 0.5).slice(0, 9);
  }, [memories, seed]);

  // Frasi casuali dai ricordi con testo
  const quotes = React.useMemo(() => {
    const withText = memories.filter(m => m.text && m.text.length > 20 && m.text.length < 120);
    let s = seed ^ 0xbeef;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
    const shuffled = [...withText].sort(() => rnd() - 0.5);
    return shuffled.slice(0, 3);
  }, [memories, seed]);

  // Layout fisso: 3 righe asimmetriche
  // Riga 1: [0 span2] [1]
  // Riga 2: [2] [3 span2]
  // Riga 3: [4] [5] [6]
  const LAYOUT: { idx: number; span2: boolean }[][] = [
    [{ idx: 0, span2: true }, { idx: 1, span2: false }],
    [{ idx: 2, span2: false }, { idx: 3, span2: true }],
    [{ idx: 4, span2: false }, { idx: 5, span2: false }, { idx: 6, span2: false }],
  ];

  const [visible, setVisible] = React.useState<Set<number>>(new Set());
  const [showButton, setShowButton] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);

  // Mostra il bottone quando almeno 5 foto sono caricate
  React.useEffect(() => {
    if (visible.size >= Math.min(5, tiles.length)) {
      const t = setTimeout(() => setShowButton(true), 400);
      return () => clearTimeout(t);
    }
  }, [visible.size, tiles.length]);

  const startWith = (mem?: FamilyMemory) => {
    setShowButton(false);
    setExiting(true);
    setTimeout(() => onStart(mem), 950);
  };

  // Swipe verso l'alto su tutta la cover
  const touchStartY = React.useRef<number>(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 60) startWith(); // swipe up > 60px
  };

  return (
    <>
      <style>{REEL_COVER_STYLE}</style>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', inset: 0, zIndex: 500, background: '#1C1A16', overflow: 'hidden',
          animation: exiting ? 'reelFadeOut 0.95s cubic-bezier(0.25,0.1,0.25,1) forwards' : 'none',
        }}
      >

        {/* ── MOSAICO ASIMMETRICO — layout esplicito senza buchi ── */}
        {(() => {
          const CELLS: { idx: number; col: string; row: string }[] = [
            { idx: 0, col: '1 / 3', row: '1 / 2' },
            { idx: 1, col: '3 / 4', row: '1 / 2' },
            { idx: 2, col: '1 / 2', row: '2 / 3' },
            { idx: 3, col: '2 / 4', row: '2 / 3' },
            { idx: 4, col: '1 / 2', row: '3 / 4' },
            { idx: 5, col: '2 / 3', row: '3 / 4' },
            { idx: 6, col: '3 / 4', row: '3 / 4' },
          ];
          return (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: 0,
              background: '#3A2E22',
            }}>
              {CELLS.map(({ idx, col, row }) => {
                const mem = tiles[idx % tiles.length];
                if (!mem) return null;
                const vis = visible.has(idx);
                return (
                  <div
                    key={idx}
                    className="cover-cell"
                    onClick={() => vis && startWith(mem)}
                    style={{
                      gridColumn: col, gridRow: row,
                      position: 'relative', overflow: 'hidden',
                      cursor: vis ? 'pointer' : 'default',
                    }}
                  >
                    <img
                      src={mem.imageUrl!}
                      alt=""
                      onLoad={() => setVisible(prev => new Set([...prev, idx]))}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        opacity: vis ? 1 : 0,
                        transition: 'opacity 0.65s cubic-bezier(0.25,0.1,0.25,1)',
                        animation: vis ? `reelSlowZoom ${12 + (idx % 3) * 4}s ease-in-out infinite alternate, colorize 2.5s cubic-bezier(0.4,0,0.2,1) ${idx * 0.12}s forwards` : 'none',
                        transformOrigin: 'center center',
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,26,22,0.15)', pointerEvents: 'none' }} />
                    <div className="cover-cell-info">
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'white', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', display: 'block', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{mem.author}</span>
                      {mem.date && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', display: 'block', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{mem.date.slice(0,4)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── GRADIENTE SUPERIORE — sfuma verso le frasi ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '28%',
          background: 'linear-gradient(to bottom, rgba(28,26,22,0.78) 0%, rgba(28,26,22,0.25) 50%, rgba(28,26,22,0) 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />

        {/* ── GRADIENTE INFERIORE — sfuma verso titolo ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '26%',
          background: 'linear-gradient(to top, rgba(28,26,22,1) 0%, rgba(28,26,22,0.65) 55%, rgba(28,26,22,0) 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />

        {/* ── GRAIN ── */}
        <div style={{
          position: 'absolute', inset: '-30%', zIndex: 4, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px', opacity: 0.04,
          animation: 'reelGrain 0.8s steps(1) infinite', mixBlendMode: 'overlay' as const,
        }} />

        {/* ── TITOLO + BOTTONE ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0 24px', paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 64px))',
          gap: 14,
          opacity: showButton ? 1 : 0,
          transform: showButton ? 'translateY(0)' : 'translateY(24px)',
          filter: showButton ? 'blur(0px)' : 'blur(6px)',
          transition: 'opacity 1.1s cubic-bezier(0.25,0.1,0.25,1), transform 1.1s cubic-bezier(0.25,0.1,0.25,1), filter 1.1s cubic-bezier(0.25,0.1,0.25,1)',
          pointerEvents: showButton ? 'auto' : 'none',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 2px', fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>BARBERINO …./2026</p>
          <p ref={(el) => {
            if (!el) return;
            const fit = () => {
              const maxW = window.innerWidth - 100; // 50px padding per lato
              let size = 52;
              el.style.fontSize = size + 'px';
              while (el.scrollWidth > maxW && size > 20) {
                size -= 1;
                el.style.fontSize = size + 'px';
              }
            };
            fit();
            window.addEventListener('resize', fit);
          }} style={{ margin: 0, lineHeight: 1.1, textShadow: '0 4px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', fontSize: 52 }}>
            <span style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', color: 'white' }}>Le voci di </span>
            <span className="text-heritage-gold not-italic font-display font-bold tracking-tight">casa</span>
          </p>
          {/* Anni in morphing */}
          <canvas ref={(el) => {
            if (!el || (el as any)._morphRunning) return;
            (el as any)._morphRunning = true;
            const ctx2 = el.getContext('2d')!;
            const W2 = el.width, H2 = el.height;
            const ry = () => String(Math.floor(Math.random()*(2026-1870+1))+1870);
            let fr = ry(), to2 = ry(), pr = 0;
            const loop2 = () => {
              pr += 0.055; if(pr>=1){pr=0;fr=to2;to2=ry();}
              const e = pr<0.5?2*pr*pr:-1+(4-2*pr)*pr;
              ctx2.clearRect(0,0,W2,H2);
              ctx2.font='italic 32px Georgia,serif'; ctx2.textAlign='center'; ctx2.textBaseline='middle';
              ctx2.save();ctx2.globalAlpha=1-e;ctx2.filter=`blur(${(e*4).toFixed(1)}px)`;ctx2.fillStyle='rgba(255,255,255,0.65)';ctx2.fillText(fr,W2/2,H2/2);ctx2.restore();
              ctx2.save();ctx2.globalAlpha=e;ctx2.filter=`blur(${((1-e)*4).toFixed(1)}px)`;ctx2.fillStyle='rgba(255,255,255,0.65)';ctx2.fillText(to2,W2/2,H2/2);ctx2.restore();
              requestAnimationFrame(loop2);
            };
            loop2();
          }} width={160} height={44} style={{display:'block', marginTop:4, marginBottom:2}} />
          <button onClick={() => startWith()} style={{
            padding: '16px 44px', borderRadius: 100,
            border: '1px solid rgba(197,160,89,0.55)', background: 'rgba(197,160,89,0.32)',
            backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)', fontFamily: 'sans-serif',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>Sfoglia i ricordi</button>
        </div>

      </div>
    </>
  );
}

function MemoriesReelV2({ memories, onClose }: { memories: FamilyMemory[]; onClose: () => void }) {
  const [activeAuthor, setActiveAuthor] = React.useState('Tutti');
  const [sortOrder, setSortOrder] = React.useState<'default' | 'asc' | 'desc'>('default');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState(0);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  // Cover mosaico — sempre all'apertura
  const [showCover, setShowCover] = React.useState(true);
  const pendingMemId = React.useRef<string | null>(null);

  const filtered = React.useMemo(() => {
    const base = activeAuthor === 'Tutti' ? memories : memories.filter(m => m.author === activeAuthor);
    if (sortOrder === 'asc') return [...base].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (sortOrder === 'desc') return [...base].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return base;
  }, [memories, activeAuthor, sortOrder]);

  const handleCoverDone = (mem?: FamilyMemory) => {
    if (mem) pendingMemId.current = mem.id;
    setShowCover(false);
  };

  // Quando cover sparisce, scorri al ricordo tappato
  React.useEffect(() => {
    if (showCover) return;
    const id = pendingMemId.current;
    if (!id) return;
    pendingMemId.current = null;
    const pos = filtered.findIndex(m => m.id === id);
    if (pos < 0) return;
    setCurrent(pos);
    // Aspetta che il container sia visibile e rendered
    setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      el.style.scrollSnapType = 'none';
      el.scrollTop = pos * el.clientHeight;
      requestAnimationFrame(() => { el.style.scrollSnapType = 'y mandatory'; });
    }, 100);
  }, [showCover]);


  React.useEffect(() => {
    setCurrent(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeAuthor, sortOrder]);

  React.useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const handler = () => {
      const h = el.clientHeight;
      const idx = Math.round(el.scrollTop / h);
      if (idx >= filtered.length) {
        setCurrent(0);
        requestAnimationFrame(() => {
          el.style.scrollSnapType = 'none';
          el.scrollTop = 0;
          requestAnimationFrame(() => { el.style.scrollSnapType = 'y mandatory'; });
        });
      } else { setCurrent(idx); }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [filtered.length]);

  const scrollTo = (idx: number) => {
    const el = containerRef.current; if (!el) return;
    el.scrollTo({ top: idx * el.clientHeight, behavior: 'smooth' });
  };

  const color = (author: string) => REEL_COLORS[author] || '#8B6914';
  const ini = (author: string) => author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Cover mosaico — sopra tutto, zIndex 500, fixed inset-0 indipendente */}
      {showCover && window.innerWidth < 1024 && <ReelCover memories={memories} onStart={handleCoverDone} />}

    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '-30px', zIndex: 400, background: '#F5F0E8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header filtri — fuori dal flusso dello scroll */}
      <div style={{ flexShrink: 0, padding: '10px 12px', background: '#F2EDE3', borderBottom: '1px solid rgba(28,26,22,0.06)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(28,26,22,0.08)', border: 'none', color: '#1C1A16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 14 }}>←</button>
          {REEL_AUTHORS.map(a => {
            const active = activeAuthor === a;
            const c = REEL_COLORS[a];
            return (
              <button key={a} onClick={() => setActiveAuthor(a)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 100, border: `1px solid ${active ? (c || '#1C1A16') : 'rgba(28,26,22,0.15)'}`, cursor: 'pointer',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                background: active ? (c || '#1C1A16') : 'white',
                color: active ? 'white' : 'rgba(28,26,22,0.5)',
                whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {a}
              </button>
            );
          })}
          <button
            onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : s === 'desc' ? 'default' : 'asc')}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
              background: sortOrder !== 'default' ? '#1C1A16' : 'rgba(28,26,22,0.08)',
              color: sortOrder !== 'default' ? '#C5A059' : 'rgba(28,26,22,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '⇅'}
          </button>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((_, i) => (
          <div key={i} onClick={() => scrollTo(i)} style={{ width: i === current ? 4 : 3, height: i === current ? 28 : 8, borderRadius: 100, background: i === current ? '#1C1A16' : 'rgba(28,26,22,0.2)', transition: 'all 0.3s', cursor: 'pointer' }} />
        ))}
      </div>

      {/* Frecce */}
      <div style={{ position: 'absolute', bottom: 'max(32px, env(safe-area-inset-bottom, 0px) + 16px)', right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button onClick={() => scrollTo(current === 0 ? filtered.length - 1 : current - 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(28,26,22,0.07)', border: 'none', color: '#1C1A16', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        <span style={{ color: 'rgba(28,26,22,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textAlign: 'center' as const }}>{current + 1}/{filtered.length}</span>
        <button onClick={() => scrollTo(current === filtered.length - 1 ? 0 : current + 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(28,26,22,0.07)', border: 'none', color: '#1C1A16', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
      </div>

      {/* Scroll container — inizia sotto la barra */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' as const, overscrollBehavior: 'none' }}>
        {filtered.map((mem, i) => {
          const c = color(mem.author);
          const av = ini(mem.author);
          const isHistoric = mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear();
          return (
            <div key={mem.id} style={{ height: '100%', width: '100%', flexShrink: 0, scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingLeft: 24, paddingRight: 24, paddingBottom: 90, boxSizing: 'border-box' as const, background: '#F5F0E8', minHeight: '100%' }}>
              {/* Foto con tap per fullscreen */}
              {mem.imageUrl && (
                <div onClick={() => setLightboxUrl(mem.imageUrl!)} style={{ cursor: 'zoom-in', position: 'relative' as const }}>
                  <ReelV2Photo src={mem.imageUrl || ''} year={mem.date?.slice(0,4)} />

                </div>
              )}
              {/* Senza foto — card colorata autore */}
              {!mem.imageUrl && (
                <div style={{ width: '100%', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 20, padding: '28px 22px 22px', position: 'relative' as const }}>
                  <div style={{ fontSize: 72, lineHeight: 1, color: c, opacity: 0.2, fontFamily: 'Georgia,serif', position: 'absolute' as const, top: 10, left: 16 }}>"</div>
                  <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '22px 0 18px', textAlign: 'left' as const, width: '100%' }}>{mem.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${c}25`, paddingTop: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                      {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>{mem.date?.slice(0,4)}</p>}
                    </div>
                  </div>
                </div>
              )}
              {mem.imageUrl && <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '0 0 20px', textAlign: 'left' as const, width: '100%' }}>{mem.text}</p>}
              {mem.imageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', borderTop: '1px solid rgba(28,26,22,0.08)', paddingTop: 14, width: '100%', marginTop: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                  {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>{mem.date?.slice(0,4)}</p>}
                </div>
              </div>
              )}
            </div>
          );
        })}
        {/* Clone primo per loop */}
        {filtered.length > 0 && (() => {
          const mem = filtered[0];
          const c = color(mem.author);
          const av = ini(mem.author);
          const isHistoric = mem.date && parseInt(mem.date.slice(0,4)) < new Date().getFullYear();
          return (
            <div key="v2-clone" style={{ height: '100%', width: '100%', flexShrink: 0, scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingLeft: 24, paddingRight: 24, paddingBottom: 90, boxSizing: 'border-box' as const, background: '#F5F0E8', minHeight: '100%' }}>
              {mem.imageUrl && (
                <div onClick={() => setLightboxUrl(mem.imageUrl!)} style={{ cursor: 'zoom-in', position: 'relative' as const }}>
                  <div style={{ width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', marginBottom: 24, flexShrink: 0, boxShadow: '0 8px 32px rgba(28,26,22,0.12)', border: '1px solid rgba(28,26,22,0.06)' }}>
                    <img src={mem.imageUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 260, objectFit: 'contain' }} />
                  </div>
                  <div style={{ position: 'absolute' as const, bottom: 34, right: 10, background: 'rgba(28,26,22,0.5)', borderRadius: 8, padding: '5px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' as const }}>
                    <Maximize2 size={13} color="#C5A059" strokeWidth={2} />
                  </div>
                </div>
              )}
              {!mem.imageUrl && (
                <div style={{ width: '100%', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 20, padding: '28px 22px 22px', position: 'relative' as const }}>
                  <div style={{ fontSize: 72, lineHeight: 1, color: c, opacity: 0.2, fontFamily: 'Georgia,serif', position: 'absolute' as const, top: 10, left: 16 }}>"</div>
                  <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '22px 0 18px', width: '100%' }}>{mem.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${c}25`, paddingTop: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                      {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,4)}</p>}
                    </div>
                  </div>
                </div>
              )}
              {mem.imageUrl && <p style={{ fontSize: mem.text.length > 200 ? 17 : mem.text.length > 120 ? 19 : 22, lineHeight: 1.65, color: '#1C1A16', fontFamily: 'Georgia,serif', fontStyle: 'italic', margin: '0 0 20px', width: '100%' }}>{mem.text}</p>}
              {mem.imageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', borderTop: '1px solid rgba(28,26,22,0.08)', paddingTop: 16, width: '100%' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{mem.author}</p>
                  {isHistoric && <p style={{ margin: 0, fontSize: 10, color: 'rgba(28,26,22,0.3)', fontFamily: 'sans-serif' }}>{mem.date?.slice(0,4)}</p>}
                </div>
              </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>

    {/* Lightbox fullscreen */}
    {lightboxUrl && (
      <div
        onClick={() => setLightboxUrl(null)}
        style={{
          position: 'fixed' as const, inset: 0, zIndex: 9999,
          background: 'rgba(28,26,22,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'lightboxIn 0.4s cubic-bezier(0.25,0.1,0.25,1)',
        }}
      >
        <button
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'absolute' as const, top: 20, right: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(197,160,89,0.15)',
            border: '1px solid rgba(197,160,89,0.3)',
            color: '#C5A059', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>
        <img
          src={lightboxUrl}
          alt=""
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '100%', maxHeight: '90vh',
            borderRadius: 12, objectFit: 'contain',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    )}
    </>
  );
}

