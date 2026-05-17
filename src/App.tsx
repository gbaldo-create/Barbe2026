import React, { useState, useMemo, ReactNode, FormEvent, useEffect, useRef, DragEvent, ChangeEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Archive, Menu, X, Plus, SlidersHorizontal, MapPin, History,
  ChevronLeft, ChevronRight, Share2, Twitter, Facebook, Mail,
  ArrowLeft, ArrowRight, ExternalLink, Sparkles, Heart, Handshake,
  Camera, User, Upload, LogOut, Edit, Trash2, Image as ImageIcon, Check,
  LayoutGrid, Lamp, Sofa, BookOpen, Armchair, Star,
} from 'lucide-react';
import { HeritageItem, Memory, ViewType } from './types.ts';
import ITEMS_DATA from '../data/items.json';
import SETTINGS_DATA from '../data/settings.json';

// ─── types ────────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: HeritageItem[] = ITEMS_DATA as HeritageItem[];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── family memories (voci di casa) ──────────────────────────────────────────

const FAMILY_MEMORIES_BASE = [
  {
    text: 'La scrivania di papà era il suo mondo. Ci passava le sere dopo cena, tra carte e libri. Sul piano i segni di una vita di lavoro — cerchi di tazzine, appunti.',
    author: 'Emanuela',
    initials: 'EM',
    context: 'Le sere dopo cena',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/1778774757543-IMG-1369--1-.jpg' as string,
  },
  {
    text: "Il cassone all'ingresso era il primo mobile che vedevi entrando in casa. Papà ci teneva le coperte buone. Noi ci nascondevamo dentro da piccole, e lui faceva finta di non trovarci.",
    author: 'Aleria',
    initials: 'AL',
    context: "L'ingresso di casa",
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/1778838591027-IMG-1501-2--1-.jpg' as string,
  },
  {
    text: 'Il lampadario del salone lo accendeva solo nelle grandi occasioni. Quando si illuminava, i cristalli proiettavano riflessi dappertutto — sembrava di stare in un palazzo.',
    author: 'Olivia',
    initials: 'OL',
    context: 'Ogni Natale',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/1778772692079-IMG-1267.jpg' as string,
  },
  {
    text: 'Franco non era un uomo di molte parole, ma ogni gesto parlava per lui. La casa di Barberino era il suo modo di tenerci tutte insieme. Continua a farlo, anche adesso.',
    author: 'Emanuela',
    initials: 'EM',
    context: 'Per sempre',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/franco.jpg' as string,
  },
  {
    text: 'Il sabato mattina si andava al mercato in piazza tutti insieme. Papà contrattava con il formaggiaio, mamma sceglieva le verdure. Era il rito più bello della settimana.',
    author: 'Emanuela',
    initials: 'EM',
    context: 'Ogni sabato mattina',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/ricostruita%20(2).jpg' as string,
  },
  {
    text: "La grande cucina aveva il camino sempre acceso d'inverno. Ci si sedeva intorno dopo cena, e il tempo sembrava fermarsi.",
    author: 'Olivia',
    initials: 'OL',
    context: "Le sere d'inverno",
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: 'Quando nacque Emma, la quarta nipote, papà la guardava come se fosse la cosa più preziosa del mondo. Senza dirlo, naturalmente.',
    author: 'Aleria',
    initials: 'AL',
    context: 'La quarta nipote di Franco',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/emma.jpg' as string,
  },
  {
    text: 'Una mattina di agosto trovammo Macchia e Teresa sotto il fico. Papà disse subito di no. Li tenne entrambi senza discutere.',
    author: 'Olivia',
    initials: 'OL',
    context: 'Estate in giardino',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/bimbi.jpg' as string,
  },
  {
    text: 'Con nonna Lia bastava poco per scoppiare a ridere. Una parola, uno sguardo — e giù. Non sapevamo mai perché, ma non importava.',
    author: 'Aleria',
    initials: 'AL',
    context: 'Sempre',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/liaaleria.jpg' as string,
  },
  {
    text: "La ciccia bona alla brace era il rito dell'estate. Papà guardava il fuoco, la carne arrivava in tavola tardi, ma nessuno si lamentava mai.",
    author: 'Emanuela',
    initials: 'EM',
    context: 'Le estati a Barberino',
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: "L'olio buono di Franco — ogni anno ne portavamo qualche bottiglia a Torino. Non bastava mai, ma era un modo di portarsi un pezzo di casa.",
    author: 'Olivia',
    initials: 'OL',
    context: 'Il rituale del ritorno',
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: 'Il Pontabuchi era il podere di papà. Ci andava spesso, camminava tra gli olivi, controllava tutto. Tornava con le mani sporche di terra e soddisfatto.',
    author: 'Aleria',
    initials: 'AL',
    context: 'Il paese di Franco',
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: 'La Futa in auto con papà era una gara. Curve strette, finestrino aperto, Franco che non rallentava mai. Arrivavamo in cima con il cuore in gola e lui soddisfatto.',
    author: 'Emanuela',
    initials: 'EM',
    context: 'Il passo della Futa',
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: 'Il cronometro per il tragitto Torino-Barberino era una cosa seria. Tre ore e cinquantotto era il record. Non ricordiamo chi lo batteva, ma ognuna giurava di avercela fatta.',
    author: 'Olivia',
    initials: 'OL',
    context: 'Il viaggio di casa',
    itemId: null as string | null,
    imageUrl: '' as string,
  },
  {
    text: 'Mamma e Leap in giardino — lui sempre vicino a lei, lei sempre a parlargli come se capisse tutto. Probabilmente capiva.',
    author: 'Olivia',
    initials: 'OL',
    context: 'Il giardino di Barberino',
    itemId: null as string | null,
    imageUrl: 'https://raw.githubusercontent.com/gbaldo-create/Barbe2026/main/public/images/IMG_1547%204.jpg' as string,
  },
];
const FAMILY_MEMORIES = shuffleArray(FAMILY_MEMORIES_BASE);

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
  if (!apiKey) { alert('Aggiungi VITE_ANTHROPIC_API_KEY nel file .env.local'); return null; }

  const toB64 = (b: string) => b.includes(',') ? b.split(',')[1] : b;
  const toMime = (b: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' =>
    b.startsWith('data:image/png') ? 'image/png' : b.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

  const mainB64 = toB64(mainImageBase64);
  if (!mainB64 || mainB64.length < 100) { console.error('Base64 vuoto o invalido'); return null; }

  const content: any[] = [
    { type: 'image', source: { type: 'base64', media_type: toMime(mainImageBase64), data: mainB64 } },
  ];

  let detailPromptPart = '';
  if (detailImages && detailImages.length > 0) {
    detailImages.forEach(({ base64, tipo }) => {
      // Salta se è un URL e non base64
      if (base64.startsWith('http')) return;
      const b64 = toB64(base64);
      if (b64 && b64.length > 100) {
        content.push({ type: 'image', source: { type: 'base64', media_type: toMime(base64), data: b64 } });
        content.push({ type: 'text', text: `[Foto di dettaglio: ${tipo}]` });
      }
    });
    detailPromptPart = `\nHai anche ${detailImages.length} foto di dettaglio (${detailImages.map(d => d.tipo).join(', ')}). Usale per arricchire la descrizione, stimare meglio epoca e provenienza, e rilevare elementi significativi (firme, timbri, materiali, stato di conservazione).`;
  }

  content.push({
    type: 'text',
    text: `Sei un esperto di antiquariato e arredamento storico italiano. Analizza queste immagini e restituisci SOLO un oggetto JSON valido (nessun testo prima o dopo):\n{\n  "name": "nome breve e descrittivo in italiano",\n  "description": "descrizione evocativa di 2-3 frasi in italiano, stile archivio familiare",\n  "category": "una tra: Mobili, Illuminazione, Sedute, Quadri, Porcellane, Tappeti, Giardino, Libri, Oggetti",\n  "room": "stanza più probabile in una villa storica italiana",\n  "year": "epoca o anno stimato (es: Metà XVIII Secolo, 1950 circa)",\n  "dimensions": "dimensioni stimate se visibili (es: 80x40x90 cm), altrimenti stringa vuota",\n  "price": "prezzo di mercato stimato tra privati in euro (es: € 450), altrimenti stringa vuota",\n  "technicalNotes": "materiali, tecnica costruttiva, stato conservazione, elementi distintivi rilevati",\n  "wearCondition": "una tra: Ottimo, Buono, Discreto, Da restaurare"\n}` + detailPromptPart
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content }] })
  });

  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Errore API'); }
  const data = await res.json();
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
  destination: 'Barberino' as any, estimatedValue: '', productCode: '',
  wearCondition: '' as any, shipping: '' as any,
  isFeatured: false, order: 0, details: [] as { label: string; value: string }[], images: [] as string[]
};

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
  isOpen, onClose, totalItems, categoriesWithCount, onExplore,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalItems: number;
  categoriesWithCount: { name: string; count: number }[];
  onExplore: (opts: { category?: string; roomMatch?: (r: string) => boolean; catawikiOnly?: boolean }) => void;
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

          {/* ── MOBILE: bottom sheet — tutta nella viewport ── */}
          <motion.div
            key="ep-sheet-mobile"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[210] bg-[#f5f0e8] rounded-t-[24px] shadow-2xl"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2">
              <div className="w-8 h-1 bg-heritage-ink/15 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-1.5 pb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-heritage-gold">Archivio di famiglia</p>
              <h2 className="font-serif italic text-[22px] text-heritage-ink leading-tight">
                Da dove vuoi <span className="not-italic font-bold text-emerald-950">iniziare?</span>
              </h2>
            </div>

            <div className="h-px bg-heritage-ink/8 mx-5" />

            <div className="px-5 pt-2.5 pb-4 space-y-2.5">

              {/* Tutto */}
              <button onClick={selectAll} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${selType === 'all' ? 'bg-emerald-950 ring-2 ring-heritage-gold/30' : 'bg-emerald-950/90'}`}>
                <LayoutGrid size={18} className="text-heritage-gold flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="font-bold text-[15px] text-[#f5f0e8] leading-tight">Voglio vedere tutto</p>
                  <p className="font-serif italic text-[11px] text-heritage-gold/80">{totalItems} pezzi disponibili</p>
                </div>
                {selType === 'all' && <div className="w-4 h-4 rounded-full bg-heritage-gold flex items-center justify-center flex-shrink-0"><Check size={9} className="text-white" strokeWidth={3} /></div>}
              </button>

              {/* Categorie — 3 colonne */}
              <div className="grid grid-cols-3 gap-1.5">
                {EXPLORE_CATEGORIES.map(cat => {
                  const active = selType === 'category' && selCategory === cat.name;
                  return (
                    <button key={cat.name} onClick={() => selectCat(cat.name)}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-[1.5px] text-center transition-all ${active ? 'border-emerald-950 bg-white shadow-sm' : 'border-heritage-ink/10 bg-white'}`}>
                      <div className={active ? 'text-emerald-950' : 'text-heritage-gold'}>{React.cloneElement(cat.icon as React.ReactElement, { size: 16 })}</div>
                      <p className="font-bold text-[11px] text-heritage-ink leading-tight">{cat.name}</p>
                      <p className="font-serif italic text-[9px] text-heritage-ink/40">{countFor(cat.name)}</p>
                    </button>
                  );
                })}
              </div>

              {/* Stanze — pill su due righe */}
              <div className="flex flex-wrap gap-1.5">
                {EXPLORE_ROOMS.map(room => {
                  const active = selType === 'room' && selRoom === room.name;
                  return (
                    <button key={room.name} onClick={() => selectRoom(room.name)}
                      className={`flex flex-col px-3 py-1.5 rounded-full border-[1.5px] transition-all ${active ? 'bg-emerald-950 border-emerald-950' : 'bg-white border-heritage-ink/10'}`}>
                      <span className={`font-bold text-[12px] leading-tight ${active ? 'text-[#f5f0e8]' : 'text-heritage-ink'}`}>{room.name}</span>
                      <span className={`font-serif italic text-[10px] leading-tight ${active ? 'text-heritage-gold' : 'text-heritage-ink/40'}`}>{room.subtitle}</span>
                    </button>
                  );
                })}
              </div>

              {/* Catawiki */}
              <button onClick={selectCatawiki}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] shadow-lg' : 'bg-[#7B1818]/8 border-[#7B1818]/40'}`}>
                <div className={`flex-shrink-0 px-2.5 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider ${selType === 'catawiki' ? 'bg-white/20 text-white' : 'bg-[#7B1818] text-white'}`}>
                  Catawiki
                </div>
                <div className="text-left flex-1">
                  <p className={`font-bold text-[14px] leading-tight ${selType === 'catawiki' ? 'text-white' : 'text-[#7B1818]'}`}>Solo aste in corso</p>
                  <p className={`font-serif italic text-[11px] ${selType === 'catawiki' ? 'text-white/70' : 'text-[#7B1818]/60'}`}>Pezzi battuti all'asta</p>
                </div>
                {selType === 'catawiki' && <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-white" strokeWidth={3} /></div>}
              </button>

              {/* CTA */}
              <button onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-950 text-[#f5f0e8] rounded-xl font-bold text-[13px] uppercase tracking-[0.2em] active:bg-emerald-900 transition-colors shadow-lg">
                Mostra la selezione <ArrowRight size={13} />
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
            <div className="bg-[#f5f0e8] rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">

              {/* Header */}
              <div className="px-8 pt-7 pb-5 flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-heritage-gold mb-2">Archivio di famiglia</p>
                  <h2 className="font-serif italic text-[34px] text-heritage-ink leading-tight">
                    Da dove vuoi<br />
                    <span className="not-italic font-bold text-emerald-950">iniziare?</span>
                  </h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-heritage-ink/8 rounded-full transition-colors mt-1">
                  <X size={20} className="text-heritage-ink/50" />
                </button>
              </div>

              <div className="border-t border-heritage-ink/8 mx-8" />

              <div className="px-8 pt-5 pb-7 space-y-4">

                {/* Tutto */}
                <button onClick={selectAll} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${selType === 'all' ? 'bg-emerald-950 ring-2 ring-heritage-gold/40' : 'bg-emerald-950/90 hover:bg-emerald-950'}`}>
                  <LayoutGrid size={22} className="text-heritage-gold flex-shrink-0" />
                  <div className="text-left flex-1">
                    <p className="font-bold text-[18px] text-[#f5f0e8]">Voglio vedere tutto</p>
                    <p className="font-serif italic text-[14px] text-heritage-gold/80">{totalItems} pezzi disponibili</p>
                  </div>
                  {selType === 'all' && <div className="w-5 h-5 rounded-full bg-heritage-gold flex items-center justify-center flex-shrink-0"><Check size={11} className="text-white" strokeWidth={3} /></div>}
                </button>

                {/* Categorie */}
                <div className="grid grid-cols-3 gap-2">
                  {EXPLORE_CATEGORIES.map(cat => {
                    const active = selType === 'category' && selCategory === cat.name;
                    return (
                      <button key={cat.name} onClick={() => selectCat(cat.name)}
                        className={`flex flex-col gap-1.5 p-3 rounded-xl border-[1.5px] text-left transition-all ${active ? 'border-emerald-950 bg-white shadow-md' : 'border-heritage-ink/10 bg-white hover:border-heritage-gold/40'}`}>
                        <div className={active ? 'text-emerald-950' : 'text-heritage-gold'}>{cat.icon}</div>
                        <p className="font-bold text-[15px] text-heritage-ink">{cat.name}</p>
                        <p className="font-serif italic text-[13px] text-heritage-ink/50">{countFor(cat.name)} pezzi</p>
                      </button>
                    );
                  })}
                </div>

                {/* Stanze */}
                <div>
                  <p className="text-center font-serif italic text-[14px] text-heritage-ink/50 mb-2">oppure cammina per la casa</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPLORE_ROOMS.map(room => {
                      const active = selType === 'room' && selRoom === room.name;
                      return (
                        <button key={room.name} onClick={() => selectRoom(room.name)}
                          className={`flex flex-col px-4 py-2 rounded-full border-[1.5px] transition-all ${active ? 'bg-emerald-950 border-emerald-950' : 'bg-white border-heritage-ink/10 hover:border-heritage-gold/50'}`}>
                          <span className={`font-bold text-[14px] leading-tight ${active ? 'text-[#f5f0e8]' : 'text-heritage-ink'}`}>{room.name}</span>
                          <span className={`font-serif italic text-[12px] ${active ? 'text-heritage-gold' : 'text-heritage-ink/40'}`}>{room.subtitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catawiki — in evidenza granata */}
                <button onClick={selectCatawiki}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all ${selType === 'catawiki' ? 'bg-[#7B1818] border-[#7B1818] shadow-lg' : 'bg-[#7B1818]/8 border-[#7B1818]/50 hover:bg-[#7B1818]/15'}`}>
                  <div className={`flex-shrink-0 px-3 py-1.5 rounded-full font-bold text-[12px] uppercase tracking-wider ${selType === 'catawiki' ? 'bg-white/20 text-white' : 'bg-[#7B1818] text-white'}`}>
                    Catawiki
                  </div>
                  <div className="text-left flex-1">
                    <p className={`font-bold text-[16px] leading-tight ${selType === 'catawiki' ? 'text-white' : 'text-[#7B1818]'}`}>Solo aste in corso</p>
                    <p className={`font-serif italic text-[13px] ${selType === 'catawiki' ? 'text-white/70' : 'text-[#7B1818]/60'}`}>Pezzi battuti all'asta</p>
                  </div>
                  {selType === 'catawiki' && <div className="ml-auto w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0"><Check size={11} className="text-white" strokeWidth={3} /></div>}
                </button>

                {/* CTA */}
                <button onClick={handleConfirm}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-950 text-[#f5f0e8] rounded-2xl font-bold text-[14px] uppercase tracking-[0.2em] hover:bg-emerald-900 transition-colors shadow-lg">
                  Mostra la selezione <ArrowRight size={16} />
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

export default function App() {
  const [view, setView] = useState<ViewType>(() => (sessionStorage.getItem('b2026_view') as ViewType) || 'home');
  const [items, setItems] = useState<HeritageItem[]>(() => {
    try { const c = localStorage.getItem('b2026_items'); return c ? JSON.parse(c) : INITIAL_ITEMS; }
    catch { return INITIAL_ITEMS; }
  });
  const alreadySeen = sessionStorage.getItem('b2026_loader_seen') === '1';
  const [isLoading, setIsLoading] = useState(!alreadySeen);
  const [dismissed, setDismissed] = useState(alreadySeen);
  const [loaderQuote, setLoaderQuote] = useState<{ text: string; author: string } | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [loaderFromMenu, setLoaderFromMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HeritageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [selectedStatus, setSelectedStatus] = useState('Tutti');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeritageItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(() => localStorage.getItem('b2026_hero') || (SETTINGS_DATA as any).heroImageUrl || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=2000');
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('b2026_favs') || '[]'); } catch { return []; } });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isExplorePanelOpen, setIsExplorePanelOpen] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<((r: string) => boolean) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');

  // Multi-user auth
  const [currentUser, setCurrentUser] = useState<string | null>(() => sessionStorage.getItem('b2026_user'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isAdmin = !!currentUser;

  useEffect(() => {
    if (alreadySeen) return;
    const randomIdx = Math.floor(Math.random() * FAMILY_MEMORIES.length); setLoaderIndex(randomIdx); setLoaderQuote(FAMILY_MEMORIES[randomIdx]);
    setTimeout(() => setIsLoading(false), 1100);
  }, []);

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
    const anyOpen = isItemModalOpen || isLoginModalOpen || isHeroModalOpen || isGithubTokenModalOpen || isExplorePanelOpen;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
  }, [isItemModalOpen, isLoginModalOpen, isHeroModalOpen, isGithubTokenModalOpen, isExplorePanelOpen]);

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

  const toggleFavorite = (itemId: string, e?: MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('b2026_favs', JSON.stringify(next));
      return next;
    });
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

  return (
    <div className="min-h-screen flex flex-col bg-heritage-cream overflow-x-hidden">

      {/* Loader */}
      <AnimatePresence>
        {(isLoading || !dismissed) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-heritage-cream px-6">
            {/* Spinner — solo al caricamento normale */}
            {isLoading && !loaderFromMenu && (
              <div className="w-16 h-16 border-4 border-heritage-gold border-t-transparent rounded-full animate-spin mb-8" />
            )}
            <AnimatePresence mode="wait">
              {loaderFromMenu ? (
                <motion.div key={loaderIndex} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="flex flex-col items-center w-full max-w-sm gap-5">

                  {/* Foto */}
                  {FAMILY_MEMORIES[loaderIndex].imageUrl && (
                    <div className="w-full rounded-2xl overflow-hidden border border-heritage-ink/10" style={{aspectRatio: '4/3'}}>
                      <img src={FAMILY_MEMORIES[loaderIndex].imageUrl} alt={FAMILY_MEMORIES[loaderIndex].author} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Testo */}
                  <p className="text-heritage-ink/90 text-lg font-heritage italic leading-relaxed text-center">"{FAMILY_MEMORIES[loaderIndex].text}"</p>
                  <div className="flex flex-col items-center gap-0.5">
                    <p className="text-heritage-gold font-bold uppercase tracking-[0.2em] text-[12px]">— {FAMILY_MEMORIES[loaderIndex].author}</p>
                    <p className="text-heritage-ink/40 text-[11px] uppercase tracking-widest">{FAMILY_MEMORIES[loaderIndex].context}</p>
                  </div>

                  {/* Frecce */}
                  <div className="flex items-center gap-4">
                    <button onClick={() => setLoaderIndex(i => (i - 1 + FAMILY_MEMORIES.length) % FAMILY_MEMORIES.length)} className="w-11 h-11 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors"><ChevronLeft size={20} className="text-heritage-ink" /></button>
                    <button onClick={() => setLoaderIndex(i => (i + 1) % FAMILY_MEMORIES.length)} className="w-11 h-11 rounded-full bg-heritage-gold border-none flex items-center justify-center transition-colors"><ChevronRight size={20} className="text-white" /></button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={loaderIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex flex-col items-center max-w-lg w-full">
                  <h2 className="text-3xl font-serif mb-6 italic text-center">Raccogliendo i Ricordi...</h2>
                  {FAMILY_MEMORIES[loaderIndex].imageUrl && (
                    <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-heritage-ink/10 mb-4" style={{aspectRatio:'4/3'}}>
                      <img src={FAMILY_MEMORIES[loaderIndex].imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-heritage-ink/90 text-xl font-heritage italic leading-relaxed text-center">"{FAMILY_MEMORIES[loaderIndex].text}"</p>
                  <p className="text-heritage-gold font-bold uppercase tracking-[0.2em] text-[12px] mt-3">— {FAMILY_MEMORIES[loaderIndex].author}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-8 h-14 flex items-center justify-center">
              {(!isLoading || loaderFromMenu) && (
                <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if (!loaderFromMenu) sessionStorage.setItem('b2026_loader_seen', '1'); setDismissed(true); setLoaderFromMenu(false); }} className="px-10 py-4 bg-heritage-ink text-heritage-cream rounded-full text-sm font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-heritage-olive transition-colors flex items-center gap-3">
                  {loaderFromMenu ? 'Chiudi' : 'Entra'} <ArrowRight size={16} />
                </motion.button>
              )}
            </div>
            {/* Frecce navigazione ricordi — sempre visibili in basso */}
            {!loaderFromMenu && (
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
                <button
                  onClick={() => setLoaderIndex(i => (i - 1 + FAMILY_MEMORIES.length) % FAMILY_MEMORIES.length)}
                  className="w-9 h-9 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors"
                ><ChevronLeft size={16} className="text-heritage-ink/50" /></button>
                <button
                  onClick={() => setLoaderIndex(i => (i + 1) % FAMILY_MEMORIES.length)}
                  className="w-9 h-9 rounded-full border border-heritage-ink/15 flex items-center justify-center hover:bg-heritage-ink/5 transition-colors"
                ><ChevronRight size={16} className="text-heritage-ink/50" /></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="fixed top-5 md:top-10 left-0 right-0 z-50 px-4 md:px-8 flex justify-center pointer-events-none">
        <header className="w-full max-w-7xl pointer-events-auto bg-emerald-950/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] md:rounded-[3rem] text-white">
          <div className="px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo — collassato su item-detail */}
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => handleBackToCatalog('home')}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-heritage-gold rounded-full flex items-center justify-center text-emerald-950 group-hover:bg-white transition-colors flex-shrink-0">
                  <History size={18} />
                </div>
                {view === 'item-detail' ? (
                  <span className="text-sm font-bold font-serif text-white leading-none tracking-tight">B26</span>
                ) : (
                  <div>
                    <h1 className="text-sm md:text-lg font-bold font-serif text-white leading-none">Barberino2026</h1>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-heritage-gold/80 font-medium mt-1">Archivio di Famiglia</p>
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
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <NavItem active={view === 'catalog'} onClick={() => handleBackToCatalog('catalog')} icon={<Archive size={18} />} label="Gli Oggetti di Casa" />
              <NavItem active={false} onClick={() => { setView('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} icon={<Handshake size={18} />} label="Vendita / Adozione" />
              <NavItem active={false} onClick={() => { setLoaderIndex(Math.floor(Math.random() * FAMILY_MEMORIES.length)); setLoaderFromMenu(true); setDismissed(false); }} icon={<Heart size={18} />} label="Ricordi" />
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Syncing indicator */}
              {isSyncing && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                  <div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] uppercase tracking-widest font-bold text-white/60">Sync...</span>
                </div>
              )}
              {currentUser ? (
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Token warning badge */}
                  {!githubToken && (
                    <button onClick={() => setIsLoginModalOpen(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-[11px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/30 transition-all">
                      ⚠️ Token mancante
                    </button>
                  )}
                  <div className="hidden sm:flex gap-2">
                    <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }} className="flex items-center gap-2 bg-heritage-gold text-white px-4 py-2 rounded-full text-sm font-bold hover:scale-105 transition-all shadow-md">
                      <Plus size={16} /><span className="hidden lg:inline">Nuovo</span>
                    </button>
                    <button onClick={() => downloadJson(items)} title="Scarica items.json aggiornato" className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-bold border border-white/20 hover:bg-white/20 transition-all shadow-md">
                      <span className="hidden lg:inline">↓ items.json</span><span className="lg:hidden">↓</span>
                    </button>
                  </div>
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <p className="text-[11px] uppercase font-bold text-heritage-gold">{currentUser}</p>
                    <p className="text-[11px] uppercase font-bold text-white/40">Editor</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"><LogOut size={18} /></button>
                </div>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[11px] md:text-[12px] font-bold uppercase tracking-widest transition-all text-white shadow-sm">
                  <User size={14} /><span className="hidden xs:inline">Famiglia</span>
                </button>
              )}
              <button className="lg:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-emerald-900 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
                <div className="flex flex-col p-6 gap-4">
                  <button onClick={() => handleBackToCatalog('catalog')} className={`flex items-center gap-3 p-3 rounded-xl ${view === 'catalog' ? 'bg-white/10 text-white' : 'text-white/60'}`}><Archive size={20} /><span className="font-heritage text-lg">Gli Oggetti di Casa</span></button>
                  <button onClick={() => { setView('home'); setIsMobileMenuOpen(false); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 400); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Handshake size={20} /><span className="font-heritage text-lg">Vendita / Adozione</span></button>
                  <button onClick={() => { setLoaderIndex(Math.floor(Math.random() * FAMILY_MEMORIES.length)); setLoaderFromMenu(true); setDismissed(false); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl text-white/60"><Heart size={20} /><span className="font-heritage text-lg">Ricordi</span></button>
                  {isAdmin && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 heritage-button-gold w-full"><Plus size={18} /><span className="font-heritage">Nuovo Oggetto</span></button>
                      <button onClick={() => { downloadJson(items); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 bg-white/10 text-white p-3 rounded-xl border border-white/10"><span className="font-heritage">↓ Scarica items.json</span></button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      {/* Views */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence>

          {/* ── HOME ── */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <section className="relative min-h-screen flex items-end overflow-hidden mb-24">
                <div className="absolute inset-0 z-0">
                  <img src={heroImageUrl} className="w-full h-full object-cover object-right" alt="Barberino2026" />
                  <div className="absolute inset-0 bg-heritage-ink/10" />
                  {isAdmin && (
                    <div className="absolute top-24 right-6 md:bottom-10 md:top-auto md:right-10 z-30">
                      <button onClick={() => setIsHeroModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/30 hover:bg-white/30 transition-all shadow-2xl">
                        <ImageIcon size={16} /><span>Cambia Sfondo</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pb-44 md:pb-20">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-md md:max-w-xl lg:max-w-[50%] bg-heritage-cream/60 backdrop-blur-xl p-6 md:py-5 md:px-10 lg:py-6 lg:px-12 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border-l-[4px] md:border-l-[8px] border-heritage-gold space-y-2 md:space-y-3">
                    <div>
                      <span className="text-emerald-800/80 text-[12px] uppercase tracking-[0.3em] font-bold mb-0.5 block">1 Corso Corsini</span>
                      <h2 className="text-3xl md:text-4xl lg:text-5xl leading-[1.1] font-serif text-heritage-ink italic">Una casa che <span className="text-emerald-950 not-italic font-display font-bold tracking-tight">cambia,</span><br />ricordi che <span className="text-emerald-950 not-italic font-display font-bold tracking-tight">restano.</span></h2>
                    </div>
                    <p className="text-sm md:text-base text-heritage-ink/85 leading-snug font-heritage italic">"Ogni oggetto che parte porta con sé un frammento di noi. Lo affidiamo a chi saprà tenerlo."</p>
                    <div className="pt-1">
                      <button onClick={() => setIsExplorePanelOpen(true)} className="px-6 py-3 bg-heritage-ink text-white rounded-lg font-bold uppercase tracking-widest text-[11px] md:text-[12px] hover:bg-heritage-gold transition-all shadow-xl group flex items-center gap-3">
                        Esplora la Collezione <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-4 md:px-6">

                {/* ── SEZIONE 1: IN VENDITA / CATAWIKI / ADOZIONE ── */}
                <section className="border-y border-heritage-gold/15 -mx-4 md:-mx-6 px-4 md:px-6 py-16 md:py-24 mb-0 bg-heritage-cream/40">
                  <div className="max-w-4xl mx-auto">
                    <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Il nostro approccio</span>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Non stiamo vendendo oggetti.</span><br /><span className="font-serif italic text-heritage-gold">Stiamo affidando</span> <span className="font-display font-medium tracking-tight text-heritage-gold not-italic">ricordi.</span></h2>
                    <div className="w-11 h-px bg-heritage-gold opacity-70 my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                      {/* Vendita diretta */}
                      <div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">€</div>
                        <p className="text-[11px] tracking-[0.35em] uppercase font-bold text-heritage-gold mb-4">Vendita diretta</p>
                        <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage">Alcuni oggetti hanno attraversato un secolo. Il loro prezzo riconosce la storia, la mano che li ha creati, il tempo che li ha resi unici.</p>
                      </div>
                      {/* Catawiki */}
                      <div className="border border-heritage-gold/25 rounded-2xl p-7 bg-heritage-gold/8 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-gold/[0.06] leading-none pointer-events-none select-none">⟡</div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-[11px] tracking-[0.35em] uppercase font-bold text-heritage-gold">Su Catawiki</p>
                          <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2 py-0.5 rounded-full">asta</span>
                        </div>
                        <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage mb-4">Alcuni pezzi di pregio vengono battuti all'asta su Catawiki, piattaforma europea per oggetti da collezione.</p>
                        <div className="bg-heritage-gold/5 border border-heritage-gold/20 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] tracking-wider uppercase font-bold bg-[#7B1818] text-white px-2.5 py-1 rounded-full">Su Catawiki</span>
                            <ExternalLink size={10} className="text-heritage-gold/50" />
                          </div>
                          <p className="text-[13px] leading-relaxed text-heritage-ink/80 italic font-heritage">Nel catalogo troverai questo badge con link diretto all'asta.</p>
                        </div>
                      </div>
                      {/* Adozione */}
                      <div className="border border-heritage-ink/10 bg-white rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-4 right-5 font-serif text-[64px] text-heritage-ink/[0.04] leading-none pointer-events-none select-none">♡</div>
                        <p className="text-[11px] tracking-[0.35em] uppercase font-bold text-heritage-gold mb-4">In adozione</p>
                        <p className="text-[16px] leading-relaxed text-heritage-ink/90 italic font-heritage">Per questi non chiediamo nulla. Solo che finiscano nelle mani giuste — qualcuno che li faccia vivere ancora, come faceva papà.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SEZIONE 2: GALLERY IN EVIDENZA ── */}
                <div className="mt-12 md:mt-16 relative pb-8">
                  <div className="relative flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-16 gap-4">
                    <div className="space-y-3">
                      <span className="text-heritage-gold text-[11px] uppercase tracking-[0.35em] font-bold">In evidenza</span>
                      <h3 className="text-4xl md:text-5xl text-heritage-ink leading-tight"><span className="font-serif italic">Da non </span><span className="font-display font-medium tracking-tight text-emerald-950 not-italic">perdere</span></h3>
                      <div className="w-12 h-px bg-heritage-gold/30" />
                    </div>
                    <button onClick={() => setIsExplorePanelOpen(true)} className="group text-[11px] font-bold uppercase tracking-widest text-heritage-gold flex items-center gap-3 hover:opacity-70 transition-opacity self-start md:self-auto">
                      Vedi l'intera collezione <span className="p-2 border border-heritage-gold/20 rounded-full group-hover:bg-heritage-gold group-hover:text-white transition-all"><ChevronRight size={14} /></span>
                    </button>
                  </div>
                  <div className="relative grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[380px] lg:auto-rows-[360px]">
                    {[...mergedItems.filter(i => i.catawikiUrl?.trim()), ...mergedItems.filter(i => !i.catawikiUrl?.trim())].slice(0, 6).map((item, idx) => {
                      const cls = ['col-span-2 md:col-span-2 lg:col-span-2 lg:row-span-2', 'col-span-1 lg:col-span-1 lg:row-span-2', 'col-span-1 lg:col-span-2 lg:row-span-1', 'col-span-2 md:col-span-1 lg:col-span-1', 'col-span-1', 'col-span-1 md:col-span-2 lg:col-span-2'][idx] || '';
                      return (
                        <motion.div key={item.id} className={`${cls} flex`} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ delay: idx * 0.1, duration: 0.8 }}>
                          <ItemCard item={item} onClick={() => openItem(item)} onToggleFavorite={isAdmin ? toggleFavorite : undefined} isAdmin={isAdmin} imageHeightRatio="100%" isFeaturedCard />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

              </div>{/* chiude max-w-7xl per Come funziona full-width */}

              {/* ── SEZIONE 3: TRE PASSI — full width dark ── */}
              <section id="how-it-works" className="w-full py-12 md:py-16 bg-heritage-ink mt-12 md:mt-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">Come funziona</span>
                  <h2 className="text-4xl md:text-5xl text-white leading-tight mb-2"><span className="font-serif italic">Semplice, umano.</span><br /><span className="font-serif italic text-heritage-gold">Da casa </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">a casa.</span></h2>
                  <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                    {[
                      { n: '01', t: 'Sfoglia', b: 'Esplora il catalogo, trova quello che ti colpisce. Ogni oggetto ha un nome, una stanza, una storia. Alcuni sono su Catawiki.' },
                      { n: '02', t: 'Scrivici', b: 'Un messaggio WhatsApp basta — siamo persone, non un negozio. Ci accordiamo insieme su tutto.' },
                      { n: "03", t: "Porta a casa", b: "Ritiro a Cinisello Balsamo o spedizione concordata. L'oggetto riparte. Il ricordo resta." },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col gap-4">
                        <div className="font-serif text-[52px] text-heritage-gold opacity-80 leading-none">{s.n}</div>
                        <div className="w-7 h-px bg-heritage-gold opacity-60" />
                        <p className="text-[14px] tracking-[0.25em] uppercase font-bold text-white">{s.t}</p>
                        <p className="text-[16px] leading-relaxed text-white/70 italic font-heritage">{s.b}</p>
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
                <section className="mt-12 md:mt-16 pt-8 md:pt-12 border-t border-heritage-ink/8">
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
                <section className="mt-12 md:mt-16 -mx-4 md:-mx-6 px-4 md:px-6 py-12 md:py-16 bg-heritage-cream/60">
                  <div className="max-w-4xl mx-auto">
                    <span className="text-[12px] tracking-[0.35em] uppercase font-bold text-heritage-gold block mb-4">I ricordi di famiglia</span>
                    <h2 className="text-4xl md:text-5xl text-heritage-ink leading-tight mb-2"><span className="font-serif italic">Le voci </span><span className="font-display font-medium tracking-tight text-heritage-gold not-italic">di casa</span></h2>
                    <div className="w-11 h-px bg-heritage-gold/40 mt-5 mb-12" />
                    {/* Grid 3 colonne — card grande a sx su 2 righe */}
                    <div className="hidden md:grid gap-4" style={{gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto'}}>
                      {/* Card grande — colonna 1, righe 1+2 */}
                      {FAMILY_MEMORIES[0] && (() => { const mem = FAMILY_MEMORIES[0]; const photo = mem.imageUrl || null; return (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col" style={{gridColumn: '1', gridRow: '1 / 3'}}>
                          {photo && <div className="overflow-hidden" style={{height: '240px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-6 pb-0" style={{height:'60px'}}><span className="font-serif text-5xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-6 flex flex-col flex-1 gap-4">
                            <p className="text-lg leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-4 mt-auto">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{mem.initials}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.context}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })()}
                      {/* Card 2-5 — colonne 2 e 3 */}
                      {FAMILY_MEMORIES.slice(1, 5).map((mem, i) => { const photo = mem.imageUrl || null; return (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="overflow-hidden" style={{height: '120px'}}><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="bg-heritage-cream/60 flex items-end px-5 pb-0" style={{height:'40px'}}><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col flex-1 gap-3">
                            <p className="text-[15px] leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-2 border-t border-heritage-ink/8 pt-3 mt-auto">
                              <div className="w-6 h-6 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[10px] font-bold flex-shrink-0">{mem.initials}</div>
                              <div><p className="text-[12px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[9px] tracking-widest uppercase text-heritage-gold font-bold">{mem.context}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    {/* Mobile: 3 card verticali */}
                    <div className="md:hidden flex flex-col gap-4">
                      {FAMILY_MEMORIES.slice(0, 3).map((mem, i) => { const photo = mem.imageUrl || null; return (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl overflow-hidden border border-heritage-ink/8 flex flex-col">
                          {photo && <div className="h-48 overflow-hidden"><img src={photo} alt={mem.author} className="w-full h-full object-cover" /></div>}
                          {!photo && <div className="h-10 bg-heritage-cream/60 flex items-end px-5 pb-0"><span className="font-serif text-4xl text-heritage-gold opacity-15 leading-none">"</span></div>}
                          <div className="p-5 flex flex-col gap-3">
                            <p className="text-base leading-relaxed text-heritage-ink/90 italic font-heritage">{mem.text}</p>
                            <div className="flex items-center gap-3 border-t border-heritage-ink/8 pt-3">
                              <div className="w-7 h-7 rounded-full bg-heritage-ink text-heritage-gold flex items-center justify-center text-[11px] font-bold flex-shrink-0">{mem.initials}</div>
                              <div><p className="text-[13px] font-bold text-heritage-ink">{mem.author}</p><p className="text-[10px] tracking-widest uppercase text-heritage-gold font-bold mt-0.5">{mem.context}</p></div>
                            </div>
                          </div>
                        </motion.div>
                      ); })}
                    </div>
                    {/* Link vedi tutti */}
                    <div className="flex justify-center mt-10">
                      <button onClick={() => { setLoaderIndex(0); setLoaderFromMenu(true); setDismissed(false); }} className="group flex items-center gap-3 px-8 py-4 bg-heritage-ink text-heritage-cream rounded-full text-[12px] font-bold uppercase tracking-widest hover:bg-heritage-olive transition-all shadow-lg">
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
            <motion.div key="catalog" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-[320px] pb-12">

              {/* Mobile title - in flow */}
              <div className="md:hidden mb-8">
                <h2 className="text-3xl font-serif italic text-heritage-ink leading-tight mb-2">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                <p className="text-heritage-ink/80 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
              </div>

              {/* Fixed sticky block: cream bg from top, covers scrolling cards — desktop only */}
              <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-heritage-cream pt-[156px] px-6 pb-4 shadow-[0_8px_32px_0_rgba(30,25,20,0.10)]">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-4">
                    <h2 className="text-3xl md:text-5xl font-serif italic text-heritage-ink leading-tight mb-1">La <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">Collezione</span></h2>
                    <p className="text-heritage-ink/80 italic font-heritage text-sm">Oggetti che hanno fatto la nostra storia, pronti per una nuova vita.</p>
                  </div>
                </div>
              </div>

              <div className="md:fixed md:top-[256px] left-0 right-0 z-40 bg-heritage-cream border-b border-heritage-ink/10 px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden md:flex flex-wrap gap-2 items-center">
                    <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/60 mr-2">Categorie</span>
                    {categoriesWithCount.map(cat => (
                      <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); }} className={`px-4 py-2 rounded-full text-[12px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'bg-white/50 text-heritage-ink/65 hover:bg-heritage-cream'}`}>
                        <span>{cat.name}</span><span className={`text-[11px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-heritage-ink/5 text-heritage-ink/60'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="hidden md:flex items-center gap-3 ml-auto">
                    {/* Ricerca */}
                    <div className="relative">
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca oggetto..." className="w-40 focus:w-52 transition-all duration-300 bg-white/70 border border-heritage-ink/12 rounded-full px-4 py-1.5 text-[13px] focus:outline-none focus:border-heritage-gold placeholder-heritage-ink/30" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-heritage-ink/30 hover:text-heritage-ink"><X size={13} /></button>}
                    </div>
                    <span className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/60">Stato</span>
                    {statusFilters.map(s => <button key={s} onClick={() => setSelectedStatus(s)} className={`px-4 py-2 rounded-full text-[12px] uppercase tracking-widest font-bold transition-all ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white/50 text-heritage-ink/65'}`}>{s}</button>)}
                    {isAdmin && <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`ml-2 p-2 rounded-full transition-all border ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white/50 border-heritage-ink/5 text-heritage-ink/60'}`}><Heart size={16} fill={showFavoritesOnly ? 'currentColor' : 'none'} /></button>}
                  </div>
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
                            <button onClick={() => { setSelectedCategory('Tutti'); setSelectedStatus('Tutti'); }} className="text-[12px] uppercase font-bold tracking-widest text-heritage-gold">Reset</button>
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
                            {categoriesWithCount.map(cat => <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setSelectedRoomFilter(null); }} className={`px-4 py-3 rounded-xl text-[12px] uppercase tracking-widest font-bold transition-all text-left flex justify-between items-center ${selectedCategory === cat.name && !selectedRoomFilter ? 'bg-heritage-olive text-white' : 'bg-white text-heritage-ink/65 border border-heritage-ink/5'}`}><span>{cat.name}</span><span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-heritage-ink/5 text-heritage-ink/20'}`}>{cat.count}</span></button>)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[12px] uppercase font-bold tracking-widest text-heritage-ink/65 mb-4">Stato</h4>
                          <div className="flex flex-wrap gap-2">
                            {statusFilters.map(s => <button key={s} onClick={() => setSelectedStatus(s)} className={`px-4 py-2 rounded-full text-[12px] uppercase tracking-widest font-bold ${selectedStatus === s ? 'bg-heritage-ink text-white' : 'bg-white border border-heritage-ink/10 text-heritage-ink/65'}`}>{s}</button>)}
                          </div>
                        </div>
                        <button onClick={() => setIsMobileFilterOpen(false)} className="w-full heritage-button py-4 text-sm">Mostra Risultati</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="hidden md:block h-20" />
              {/* Risultati */}
              <div className="flex flex-wrap gap-4 md:gap-8">
                {filteredItems.slice(0, visibleCount).map((item, index) => (
                  <div key={item.id} className={`${index % 5 === 2 ? 'basis-full md:flex-grow md:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]' : 'flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]'}`}>
                    <ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} showFeaturedBadge />
                  </div>
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
            <motion.div key={currentItem.id} initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="pb-12 bg-heritage-cream">

              {/* Mobile: foto full-width sopra l'header */}
              <div className="md:hidden relative" style={{marginTop: '-1px'}}>
                <div
                  className="relative overflow-hidden bg-heritage-ink/10 cursor-zoom-in"
                  style={{aspectRatio: "3/4"}}
                  onClick={() => {
                    const imgs = [currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[];
                    setLightboxImages(imgs);
                    setLightboxIndex(0);
                    setIsLightboxOpen(true);
                  }}
                >
                  {currentItem.imageUrl && <img src={currentItem.imageUrl} alt={currentItem.name} className="w-full h-full object-cover" />}
                  {!currentItem.imageUrl && <div className="w-full h-full flex items-center justify-center"><Camera size={48} className="text-heritage-ink/20" /></div>}
                  {/* Badge stato */}
                  <div className="absolute bottom-4 left-4"><span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-heritage-olive text-white">{currentItem.status}</span></div>
                  {/* Hint zoom */}
                  {(currentItem.images?.length ?? 0) > 0 && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <ImageIcon size={12} className="text-white/80" />
                      <span className="text-white/80 text-[11px] font-bold">{1 + (currentItem.images?.length ?? 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prev/Next sotto la foto — mobile only */}
              {(prevItem || nextItem) && (
                <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-heritage-ink/8 bg-heritage-cream">
                  {prevItem ? (
                    <button onClick={() => openItem(prevItem)} className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50 hover:text-heritage-ink transition-colors">
                      <ArrowLeft size={13} />
                      <span className="truncate max-w-[120px]">{prevItem.name.split(' ').slice(0,3).join(' ')}</span>
                    </button>
                  ) : <div />}
                  {nextItem ? (
                    <button onClick={() => openItem(nextItem)} className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50 hover:text-heritage-ink transition-colors">
                      <span className="truncate max-w-[120px]">{nextItem.name.split(' ').slice(0,3).join(' ')}</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : <div />}
                </div>
              )}
              <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-48 bg-heritage-cream">
              {/* Desktop: back + prev/next */}
              <div className="hidden md:flex items-center justify-between mb-8">
                <button onClick={() => handleBackToCatalog()} className="flex items-center gap-2 text-heritage-ink/80 hover:text-heritage-ink group transition-colors"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span className="font-heritage">Ritorna alla Collezione</span></button>
                <div className="flex items-center gap-2">
                  {prevItem && <button onClick={() => openItem(prevItem)} className="flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><ChevronLeft size={16} /><span>{prevItem.name.split(' ').slice(0,2).join(' ')}</span></button>}
                  {nextItem && <button onClick={() => openItem(nextItem)} className="flex items-center gap-1.5 px-4 py-2 bg-heritage-ink/5 hover:bg-heritage-ink/10 rounded-full text-sm font-bold uppercase tracking-widest text-heritage-ink/60 transition-all"><span>{nextItem.name.split(' ').slice(0,2).join(' ')}</span><ChevronRight size={16} /></button>}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-16">
                <div className="hidden md:block space-y-8">
                  <ImageGallery
                    images={[currentItem.imageUrl, ...(currentItem.images || [])].filter(Boolean) as string[]}
                    name={currentItem.name}
                    status={currentItem.status}
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-heritage-gold uppercase tracking-[0.3em] text-[12px] font-bold"><span className="w-8 h-[1px] bg-heritage-gold" />{currentItem.category}</div>
                      {isAdmin && <button onClick={e => toggleFavorite(currentItem.id, e)} className={`p-2.5 rounded-full transition-all border ${currentItem.isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-heritage-ink/5 border-heritage-ink/10 text-heritage-ink/65'}`}><Heart size={18} fill={currentItem.isFavorite ? 'currentColor' : 'none'} /></button>}
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif italic text-heritage-ink leading-tight mb-6">{currentItem.name.split(' ')[0]} <span className="text-emerald-950 not-italic font-display font-medium tracking-tight">{currentItem.name.split(' ').slice(1).join(' ')}</span></h2>
                    {isAdmin && (
                      <div className="flex gap-4 mb-4">
                        <button onClick={() => { setEditingItem(currentItem); setIsItemModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-heritage-ink/8 text-heritage-ink rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-heritage-ink/15 transition-colors border border-heritage-ink/10"><Edit size={12} />Modifica</button>
                        <button onClick={() => setItemToDelete(currentItem.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-400 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-100 border border-red-100"><Trash2 size={12} />Elimina</button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 mb-4 py-6 border-t border-b border-heritage-ink/10 divide-x-0">
                      <DetailBox label="Stanza" value={currentItem.room} />
                      <DetailBox label="Epoca" value={currentItem.year || 'N/D'} />
                      <DetailBox label="Dimensioni" value={currentItem.dimensions || 'N/D'} />
                      <DetailBox label="Dove si trova" value={currentItem.destination || 'N/D'} />
                      <DetailBox label="Acquisizione" value={currentItem.acquisitionType} />
                      <DetailBox label="Prezzo / Valore" value={currentItem.price || currentItem.estimatedValue || 'Su richiesta'} />
                      {currentItem.wearCondition && <DetailBox label="Condizione" value={currentItem.wearCondition} />}
                      {currentItem.shipping && <DetailBox label="Spedizione" value={currentItem.shipping} />}
                      {currentItem.productCode && <DetailBox label="Codice" value={currentItem.productCode} />}
                      {currentItem.catawikiUrl && (
                        <div className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-widest font-bold opacity-60">Catawiki</span>
                          <a href={currentItem.catawikiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B1818]/10 text-[#7B1818] rounded-full text-[12px] font-bold uppercase tracking-wider hover:bg-[#7B1818]/20 w-fit">Vedi <ExternalLink size={10} /></a>
                        </div>
                      )}
                    </div>
                    <div className="prose prose-stone mb-12">
                      <h4 className="font-serif text-xl mb-4 italic">Descrizione e Storia</h4>
                      <p className="text-xl leading-relaxed text-heritage-ink/85 font-light mb-8">{currentItem.description}</p>
                      {currentItem.technicalNotes && <div className="mt-8 p-6 bg-heritage-cream/20 rounded-2xl border border-heritage-ink/5"><h5 className="text-[12px] uppercase tracking-widest font-bold opacity-70 mb-3 text-heritage-gold">Dettagli Tecnici</h5><p className="text-base italic leading-relaxed text-heritage-ink/85">{currentItem.technicalNotes}</p></div>}

                    </div>
                    {/* Stories */}
                    <div className="bg-white p-8 rounded-2xl border border-heritage-ink/5 mb-12">
                      <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-serif italic text-heritage-gold">Ricordi</h3><Sparkles size={18} className="text-heritage-gold opacity-50" /></div>
                      <div className="space-y-6">
                        {currentItem.stories.map(s => <div key={s.id} className="relative pl-6 border-l-2 border-heritage-gold/20"><p className="text-[12px] uppercase tracking-widest opacity-70 font-bold mb-2">{s.author} • {s.date}</p><p className="text-base italic leading-relaxed text-heritage-ink/90">"{s.text}"</p></div>)}
                        {currentItem.stories.length === 0 && <p className="text-sm italic text-heritage-ink/60 text-center py-4">Nessun ricordo ancora.</p>}
                      </div>
                      {isAdmin && (
                        <div className="mt-8 pt-8 border-t border-heritage-ink/5">
                          <textarea className="w-full p-4 bg-heritage-cream/30 border border-heritage-ink/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-heritage-gold resize-none h-24 mb-4 text-sm" placeholder="Aggiungi un ricordo..." value={newStoryText} onChange={e => setNewStoryText(e.target.value)} />
                          <button onClick={handleAddStory} disabled={!newStoryText} className="w-full heritage-button py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">Preserva il Racconto Familiare</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a href={`https://wa.me/393394468130?text=Buongiorno,%20vorrei%20informazioni%20su:%20${encodeURIComponent(currentItem.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 px-8 py-5 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all group shadow-xl"><WhatsAppIcon size={18} color="white" /><span className="font-heritage font-medium">Contatta su WhatsApp</span></a>
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
              {relatedItems.length > 0 && (
                <div className="mt-24 pt-24 border-t border-heritage-ink/10">
                  <h3 className="text-[12px] uppercase tracking-[0.2em] font-bold opacity-60 text-center mb-12">Ti potrebbe interessare anche...</h3>
                  <div className="hidden md:block h-20" />
              <div className="flex flex-wrap gap-4 md:gap-8">
                    {relatedItems.map(item => <div key={item.id} className="flex-grow basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-2rem)]"><ItemCard item={item} onToggleFavorite={isAdmin ? toggleFavorite : undefined} onClick={() => openItem(item)} isAdmin={isAdmin} /></div>)}
                  </div>
                </div>
              )}
              </div>{/* chiude max-w-7xl */}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-heritage-ink/5 bg-heritage-cream/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h4 className="font-serif text-2xl mb-4 italic text-heritage-ink">Ti interessa un pezzo o vuoi saperne di più?</h4>
            <a href="https://wa.me/393394468130" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition-all shadow-lg group"><WhatsAppIcon size={20} color="white" /><span className="font-heritage tracking-wide">Contattaci su WhatsApp</span></a>
          </div>
          <p className="text-sm font-serif opacity-70">Custodito per le generazioni future • 2026 • Barberino di Mugello</p>
        </div>
      </footer>

      {/* ── Modals ── */}

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

      {/* ExplorePanel */}
      <ExplorePanel
        isOpen={isExplorePanelOpen}
        onClose={() => setIsExplorePanelOpen(false)}
        totalItems={mergedItems.length}
        categoriesWithCount={categoriesWithCount}
        onExplore={handleExploreConfirm}
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
        {isAdmin && !isItemModalOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="sm:hidden fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3"
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
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
              className="w-16 h-16 bg-heritage-gold text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white"
            >
              <Plus size={28} />
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
  return <div className="flex flex-col gap-1 p-3 md:p-0 border-b border-heritage-ink/8 md:border-b-0 last:border-b-0"><span className="text-[10px] uppercase tracking-[0.2em] font-bold text-heritage-ink/50">{label}</span><span className="font-serif text-base md:text-lg italic text-heritage-ink/90">{value}</span></div>;
}

interface ItemCardProps { item: HeritageItem; onClick: () => void; onToggleFavorite?: (id: string, e: MouseEvent) => void; isAdmin?: boolean; aspectClassName?: string; imageHeightRatio?: string; isFeaturedCard?: boolean; showFeaturedBadge?: boolean; }

function ItemCard({ item, onClick, onToggleFavorite, isAdmin, aspectClassName = 'aspect-[3/4]', imageHeightRatio, isFeaturedCard, showFeaturedBadge }: ItemCardProps) {
  return (
    <div onClick={onClick} className={`group cursor-pointer hover:translate-y-[-4px] transition-all duration-500 overflow-hidden flex flex-col h-full w-full ${isFeaturedCard ? 'heritage-card border-none shadow-xl' : 'heritage-card'}`}>
      <div className={`overflow-hidden relative shrink-0 w-full ${imageHeightRatio ? '' : (aspectClassName)}`} style={imageHeightRatio ? { height: imageHeightRatio } : { aspectRatio: '3/4' }}>
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
                <p className="text-heritage-gold text-[17px] lg:text-[18px] uppercase tracking-[0.2em] font-bold delay-75">{item.estimatedValue || item.price || 'Su Richiesta'}</p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-2">
          {onToggleFavorite && <button onClick={e => onToggleFavorite(item.id, e)} className={`p-2 rounded-full transition-all backdrop-blur-md border ${item.isFavorite ? 'bg-red-500/80 border-red-400 text-white shadow-lg' : 'bg-black/30 border-white/20 text-white/80'}`}><Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} /></button>}
          {showFeaturedBadge && item.isFeatured && <span className="bg-heritage-gold text-white w-7 h-7 rounded-full flex items-center justify-center text-[13px] shadow-lg">★</span>}
          {item.productCode && <span className="bg-heritage-gold text-white px-2 md:px-3 py-1 rounded-full text-[11px] md:text-[11px] uppercase tracking-widest font-bold border border-white/20 shadow-lg">ID: {item.productCode}</span>}
          <span className={`px-2 md:px-3 py-1 rounded-full text-[11px] md:text-[11px] uppercase tracking-widest font-bold ${item.status === 'Disponibile' ? 'bg-heritage-olive text-white' : 'bg-heritage-gold/80 text-white'}`}>{item.status}</span>
          {item.catawikiUrl && <a href={item.catawikiUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="bg-[#7B1818] hover:bg-[#5a1212] text-white px-2 md:px-3 py-1 rounded-full text-[11px] md:text-[11px] uppercase tracking-widest font-bold animate-pulse">su Catawiki</a>}
        </div>
      </div>
      <div className="p-3 md:p-6 flex flex-col flex-grow">
        <span className="text-[11px] md:text-[12px] uppercase tracking-widest font-bold text-heritage-gold block mb-1">{item.category}</span>
        <h3 className="text-[14px] md:text-lg font-serif leading-tight mb-2 line-clamp-2">{item.name}</h3>
        <div className="flex items-center gap-1.5 text-[12px] md:text-sm text-heritage-ink/80 mb-3 font-medium"><MapPin size={10} /><span className="truncate">{item.room}</span></div>
        <div className="flex items-center justify-between text-heritage-gold pt-3 border-t border-heritage-ink/5 mt-auto">
          <div className="flex flex-col">{item.price && <span className="text-[12px] md:text-sm font-serif italic text-heritage-ink mb-1">{item.price}</span>}<span className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest opacity-60">Dettagli</span></div>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

function ImageGallery({ images, name, status, catawikiUrl, onOpenLightbox }: { images: string[]; name: string; status: string; catawikiUrl?: string; onOpenLightbox?: (index: number) => void }) {
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
          <span className={`px-4 py-1.5 rounded-full text-[12px] uppercase tracking-[0.2em] font-bold ${status === 'Disponibile' ? 'bg-heritage-olive text-white' : status === 'Riservato' ? 'bg-heritage-gold text-white' : 'bg-heritage-ink/40 text-white'}`}>{status}</span>
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
            <div className="space-y-1"><label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Valore stimato</label><input value={form.estimatedValue} onChange={e => setForm((p: any) => ({ ...p, estimatedValue: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-2.5 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="€ 1.500" /></div>
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

function ItemModal({ isOpen, onClose, onSave, initialData, onDelete, nextOrder }: { isOpen: boolean; onClose: () => void; onSave: (item: HeritageItem) => Promise<void>; initialData?: HeritageItem | null; onDelete?: (id: string) => void; nextOrder: number; }) {
  const [form, setForm] = useState({ ...emptyForm, order: nextOrder });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailImages, setDetailImages] = useState<{ base64: string; url: string; tipo: string }[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState<Partial<typeof emptyForm> | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  // Swipe to close
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 150) onClose(); };

  useEffect(() => {
    if (initialData) { setForm({ name: initialData.name || '', description: initialData.description || '', room: initialData.room || '', category: initialData.category || '', year: initialData.year || '', dimensions: initialData.dimensions || '', status: initialData.status || 'Disponibile', acquisitionType: initialData.acquisitionType || 'Vendita', price: initialData.price || '', catawikiUrl: initialData.catawikiUrl || '', imageUrl: initialData.imageUrl || '', technicalNotes: initialData.technicalNotes || '', destination: initialData.destination || 'Barberino', estimatedValue: initialData.estimatedValue || '', productCode: initialData.productCode || '', wearCondition: initialData.wearCondition || '', shipping: initialData.shipping || '', isFeatured: initialData.isFeatured || false, order: initialData.order, details: initialData.details || [], images: initialData.images || [] }); }
    else setForm({ ...emptyForm, order: nextOrder });
  }, [initialData, isOpen, nextOrder]);

  const [imageBase64ForAnalysis, setImageBase64ForAnalysis] = useState<string>('');

  const handleImageUpload = async (src: string | File) => {
    setIsProcessingImage(true);
    try {
      const r = await resizeImage(src);
      setImageBase64ForAnalysis(r);
      const token = localStorage.getItem('b2026_github_token');
      if (token && src instanceof File) {
        const fileName = `${Date.now()}-${src.name.replace(/[^a-z0-9.]/gi, '-')}`;
        const url = await uploadImageToGitHub(r, fileName);
        if (url) { setForm(p => ({ ...p, imageUrl: url })); return; }
      }
      setForm(p => ({ ...p, imageUrl: r }));
    } catch { alert("Errore immagine."); }
    finally { setIsProcessingImage(false); }
  };

  const handleAnalyze = async () => {
    if (!imageBase64ForAnalysis && !form.imageUrl) return;
    setIsAnalyzing(true);
    setAnalyzeResult(null);
    try {
      // Se non ho il base64 in memoria (oggetto esistente), scarico l'immagine e la converto
      let mainBase64 = imageBase64ForAnalysis;
      if (!mainBase64 && form.imageUrl) {
        try {
          const res = await fetch(form.imageUrl);
          const blob = await res.blob();
          mainBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          alert('Impossibile caricare l\'immagine principale per l\'analisi.');
          setIsAnalyzing(false);
          return;
        }
      }
      const result = await analyzeImageWithClaude(
        mainBase64,
        detailImages.length > 0 ? detailImages : undefined
      );
      if (result) {
        setAnalyzeResult(result);
        setShowApplyModal(true);
      } else { alert('Nessun risultato. Riprova con una foto più nitida.'); }
    } catch (e: any) { alert('Errore: ' + e.message); }
    finally { setIsAnalyzing(false); }
  };

  const applyAll = () => {
    if (!analyzeResult) return;
    setForm(p => ({
      ...p,
      name: (analyzeResult as any).name || p.name,
      description: (analyzeResult as any).description || p.description,
      category: (analyzeResult as any).category || p.category,
      room: (analyzeResult as any).room || p.room,
      year: (analyzeResult as any).year || p.year,
      dimensions: (analyzeResult as any).dimensions || p.dimensions,
      price: (analyzeResult as any).price || p.price,
      technicalNotes: (analyzeResult as any).technicalNotes || p.technicalNotes,
      wearCondition: (analyzeResult as any).wearCondition || p.wearCondition,
    }));
    setShowApplyModal(false);
    setAnalyzeResult(null);
  };

  const applyField = (field: string) => {
    if (!analyzeResult) return;
    setForm(p => ({ ...p, [field]: (analyzeResult as any)[field] || (p as any)[field] }));
  };

  // Aggiunge foto di dettaglio con tipo
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
      // Aggiungi anche alle images salvate
      setForm(p => ({ ...p, images: [...p.images, url] }));
    } catch {}
    finally { setIsProcessingImage(false); }
  };

  const handleDetailImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    setIsProcessingImage(true);
    const imgs = [...form.images];
    const token = localStorage.getItem('b2026_github_token');
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const r = await resizeImage(file);
          if (token) {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
            const url = await uploadImageToGitHub(r, fileName);
            imgs.push(url || r);
          } else { imgs.push(r); }
        } catch {}
      }
    }
    setForm(p => ({ ...p, images: imgs })); setIsProcessingImage(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try { await onSave({ ...form, id: initialData?.id || genId(), stories: initialData?.stories || [] }); }
    finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  // Campi applicabili campo per campo
  const APPLY_FIELDS = [
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrizione' },
    { key: 'category', label: 'Categoria' },
    { key: 'room', label: 'Stanza' },
    { key: 'year', label: 'Epoca' },
    { key: 'dimensions', label: 'Dimensioni' },
    { key: 'price', label: 'Prezzo' },
    { key: 'technicalNotes', label: 'Dettagli tecnici' },
    { key: 'wearCondition', label: 'Condizione' },
  ];

  const DETAIL_TYPES = ['Firma / timbro', 'Hardware / cerniere', 'Etichetta', 'Dettaglio decorativo', 'Materiale / legno', 'Stato conservazione', 'Altro'];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-heritage-ink/60 backdrop-blur-sm" onClick={onClose} />

      {/* Desktop: centered modal */}
      <motion.div
        key="desktop-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="hidden md:flex fixed inset-0 z-[101] items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-heritage-ink/5 flex items-center justify-between">
            <h3 className="text-2xl font-serif">{initialData ? `Modifica: ${initialData.name}` : 'Nuovo Oggetto'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto space-y-6">
            {/* Image upload */}
            <div>
              <label className="text-[12px] uppercase font-bold tracking-widest opacity-70 block mb-4">Immagine Principale</label>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageUpload(f); }} className={`relative h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden ${isDragging ? 'border-heritage-gold bg-heritage-gold/5' : 'border-heritage-ink/10 bg-heritage-cream/10'} ${form.imageUrl ? 'border-solid border-heritage-gold/30' : ''}`}>
                {form.imageUrl ? (<><img src={form.imageUrl} className={`absolute inset-0 w-full h-full object-cover ${isProcessingImage ? 'opacity-60 blur-sm' : 'opacity-80'}`} />{isProcessingImage && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}<div className="absolute inset-0 bg-heritage-ink/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="bg-white text-heritage-ink px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">Rimuovi</button></div></>) : (<><div className="p-4 bg-white rounded-full shadow-sm text-heritage-ink/60">{isProcessingImage ? <div className="w-6 h-6 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /> : <Upload size={24} />}</div><p className="text-sm font-medium">{isProcessingImage ? 'Elaborazione...' : "Trascina o"}</p>{!isProcessingImage && <label className="text-sm text-heritage-gold cursor-pointer hover:underline">sfoglia<input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} /></label>}</>)}
              </div>
              <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold text-sm mt-2" placeholder="oppure incolla un URL..." />
              {form.imageUrl && (
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className={`mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all border ${isAnalyzing ? 'bg-heritage-gold/20 text-heritage-gold border-heritage-gold/20 cursor-wait' : 'bg-heritage-gold text-white border-heritage-gold hover:bg-heritage-gold/90 shadow-md'}`}>
                  {isAnalyzing ? (<><div className="w-4 h-4 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />Analisi in corso...</>) : (<><Sparkles size={14} />Analizza con Claude — compila i campi automaticamente</>)}
                </button>
              )}
            </div>
            {/* Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              {[{ l: 'Nome *', k: 'name', p: 'Es. Scrittoio in Noce', span: 2, req: true }, { l: 'Stanza *', k: 'room', p: 'Es. Salotto', req: true }, { l: 'Anno/Epoca', k: 'year', p: 'Es. 1850 circa' }, { l: 'Dimensioni', k: 'dimensions', p: 'Es. 120x60x80 cm' }, { l: 'Prezzo', k: 'price', p: '€ 500' }, { l: 'Valore Stimato', k: 'estimatedValue', p: '€ 1.500' }, { l: 'Codice / SKU', k: 'productCode', p: 'ART-001' }].map(f => (
                <div key={f.k} className={`space-y-2 ${(f as any).span === 2 ? 'md:col-span-2' : ''}`}>
                  <label className="text-[12px] uppercase font-bold tracking-widest opacity-70">{f.l}</label>
                  <input required={f.req} value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold" placeholder={f.p} />
                </div>
              ))}
              <div className="md:col-span-2 space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Categoria *</label>
                <input required list="cat-list" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold" placeholder="Es. Mobili" />
                <datalist id="cat-list"><option value="Mobili" /><option value="Illuminazione" /><option value="Sedute" /><option value="Quadri" /><option value="Porcellane" /><option value="Tappeti" /><option value="Giardino" /><option value="Libri" /></datalist>
                <div className="flex flex-wrap gap-2">{['Mobili', 'Illuminazione', 'Sedute', 'Quadri'].map(c => <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c }))} className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold ${form.category === c ? 'bg-heritage-olive text-white' : 'bg-heritage-ink/5 text-heritage-ink/65'}`}>{c}</button>)}</div>
              </div>
              <div className="md:col-span-2 space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Descrizione *</label><textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold resize-none h-24" placeholder="Racconta la storia..." /></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Dettagli Tecnici</label><textarea value={form.technicalNotes} onChange={e => setForm(p => ({ ...p, technicalNotes: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none focus:border-heritage-gold resize-none h-20" placeholder="Materiali, stato..." /></div>

              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Stato</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm"><option value="Disponibile">Disponibile</option><option value="Riservato">Riservato</option><option value="Affidato">Affidato</option><option value="Non in Vendita">Non in Vendita</option></select></div>
              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Condizione</label><select value={form.wearCondition} onChange={e => setForm(p => ({ ...p, wearCondition: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm"><option value="">Non specificata</option><option value="Ottimo">Ottimo</option><option value="Buono">Buono</option><option value="Discreto">Discreto</option><option value="Da restaurare">Da restaurare</option></select></div>
              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Spedizione</label><select value={form.shipping} onChange={e => setForm(p => ({ ...p, shipping: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm"><option value="">Non specificata</option><option value="Ritiro in sede">Ritiro in sede</option><option value="Spedizione possibile">Spedizione possibile</option><option value="Solo ritiro">Solo ritiro</option><option value="Concordare">Concordare</option></select></div>
              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Destinazione</label><select value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none"><option value="Barberino">Barberino</option><option value="Cinisello Balsamo">Cinisello Balsamo (MI)</option><option value="Torino">Torino</option><option value="Sorella">Sorella</option><option value="Altro">Altro</option></select></div>
              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Tipo Acquisizione</label><select value={form.acquisitionType} onChange={e => setForm(p => ({ ...p, acquisitionType: e.target.value as any }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none"><option value="Vendita">Vendita</option><option value="Lascito Affettivo">Lascito Affettivo</option><option value="Famiglia">Famiglia</option></select></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Link Catawiki</label><input value={form.catawikiUrl} onChange={e => setForm(p => ({ ...p, catawikiUrl: e.target.value }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm" placeholder="https://www.catawiki.com/..." /></div>
              <div className="space-y-2"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Ordine</label><input type="number" value={form.order === undefined ? '' : form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value ? parseInt(e.target.value) : undefined }))} className="w-full bg-heritage-cream/20 border-b border-heritage-ink/10 py-2 focus:outline-none text-sm" placeholder="1 = primo" /></div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}>
                <div className="relative"><div className={`w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-heritage-gold' : 'bg-heritage-ink/10'}`} /><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} /></div>
                <span className="text-[12px] uppercase font-bold tracking-widest opacity-60">In evidenza (Home)</span>
              </div>
            </div>
            {/* Gallery */}
            <div className="p-4 bg-heritage-cream/10 rounded-2xl border border-heritage-ink/5">
              <div className="flex items-center justify-between mb-4"><label className="text-[12px] uppercase font-bold tracking-widest opacity-70">Gallery Foto</label><label className="text-[12px] uppercase font-bold text-heritage-gold cursor-pointer flex items-center gap-1"><Plus size={12} /> Aggiungi<input type="file" className="hidden" accept="image/*" multiple onChange={handleDetailImages} /></label></div>
              <div className="flex flex-wrap gap-3">{form.images.map((img, i) => <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-heritage-ink/10"><img src={img} className="w-full h-full object-cover" /><button type="button" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} className="absolute inset-0 bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><Trash2 size={16} className="text-white" /></button></div>)}{form.images.length === 0 && <p className="text-[12px] italic text-heritage-ink/60 w-full text-center py-4 border border-dashed border-heritage-ink/10 rounded-xl">Nessuna foto aggiuntiva</p>}</div>
            </div>
            <div className="flex gap-4 pt-2">
              {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-6 py-4 rounded-xl border border-red-100 text-red-600 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} />Elimina</button>}
              <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}</button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Mobile: bottom sheet */}
      <motion.div
        key="mobile-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[2rem] shadow-2xl flex flex-col pointer-events-auto"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
        </div>
        {/* Header */}
        <div className="px-6 py-4 border-b border-heritage-ink/5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-serif text-heritage-ink">{initialData ? `Modifica: ${initialData.name}` : 'Nuovo Oggetto'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-heritage-cream rounded-full"><X size={20} /></button>
        </div>
        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6 pb-10">

          {/* ── FOTO PRINCIPALE ── */}
          <div className="rounded-2xl border-2 border-dashed border-heritage-ink/10 overflow-hidden bg-heritage-cream/30">
            {form.imageUrl ? (
              <div className="relative h-48">
                <img src={form.imageUrl} className={`absolute inset-0 w-full h-full object-cover ${isProcessingImage ? 'opacity-60 blur-sm' : ''}`} />
                {isProcessingImage && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /></div>}
                <button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="absolute top-3 right-3 bg-white/90 text-heritage-ink px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow">Rimuovi</button>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center bg-heritage-cream/40">
                {isProcessingImage
                  ? <div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" /><p className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/50">Elaborazione...</p></div>
                  : <Camera size={40} className="text-heritage-ink/20" />}
              </div>
            )}
            {!isProcessingImage && (
              <div className="grid grid-cols-2 border-t border-heritage-ink/8">
                <label className="flex flex-col items-center gap-2 py-4 cursor-pointer border-r border-heritage-ink/8 active:bg-heritage-cream/60 transition-colors">
                  <Camera size={22} className="text-heritage-gold" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/80">Scatta foto</span>
                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                <label className="flex flex-col items-center gap-2 py-4 cursor-pointer active:bg-heritage-cream/60 transition-colors">
                  <ImageIcon size={22} className="text-heritage-gold" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/80">Galleria</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
              </div>
            )}
          </div>

          {/* ── FOTO DETTAGLIO ── */}
          <div className="rounded-2xl border border-heritage-ink/8 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-heritage-ink/8 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/70">Foto di dettaglio</p>
                <p className="text-[11px] font-serif italic text-heritage-ink/40 mt-0.5">firma, timbro, materiale, hardware...</p>
              </div>
            </div>
            {/* Preview foto dettaglio */}
            {detailImages.length > 0 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {detailImages.map((d, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-heritage-ink/10">
                      <img src={d.url} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[9px] uppercase tracking-wide font-bold text-heritage-ink/50 text-center mt-1 max-w-[80px] truncate">{d.tipo}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailImages(prev => prev.filter((_, j) => j !== i));
                        setForm(p => ({ ...p, images: p.images.filter(img => img !== d.url) }));
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Aggiungi con tipo */}
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {DETAIL_TYPES.map(tipo => (
                  <label key={tipo} className="flex items-center gap-1 px-3 py-1.5 bg-heritage-cream/60 rounded-full cursor-pointer active:bg-heritage-gold/20 transition-colors border border-heritage-ink/8">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-heritage-ink/70">{tipo}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAddDetailImage(f, tipo); }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Analizza con Claude ── */}
          <div className="flex items-center gap-3 p-4 bg-heritage-gold/8 rounded-2xl border border-heritage-gold/20">
            <Sparkles size={18} className="text-heritage-gold flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-gold">Analizza con Claude</p>
              <p className="text-[12px] font-heritage italic text-heritage-ink/70 mt-0.5">
                {detailImages.length > 0 ? `Foto principale + ${detailImages.length} dettagl${detailImages.length === 1 ? 'io' : 'i'}` : 'Dalla foto principale'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !form.imageUrl}
              className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                isAnalyzing ? 'bg-heritage-gold/20 text-heritage-gold cursor-wait' :
                !form.imageUrl ? 'bg-heritage-ink/5 text-heritage-ink/30 cursor-not-allowed' :
                'bg-heritage-gold text-white shadow-md'
              }`}
            >
              {isAnalyzing ? <><div className="w-3 h-3 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />...</> : 'Avvia'}
            </button>
          </div>

          {/* ── Essenziali ── */}
          <div>
            <p className="text-[13px] uppercase tracking-widest font-bold text-heritage-gold mb-4">Essenziali</p>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Nome *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-3 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Es. Scrittoio in noce" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Categoria *</label>
                <div className="flex flex-wrap gap-2 mb-2">{['Mobili', 'Illuminazione', 'Sedute', 'Quadri', 'Porcellane', 'Tappeti', 'Giardino', 'Libri'].map(c => <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c }))} className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold transition-all ${form.category === c ? 'bg-heritage-olive text-white' : 'bg-heritage-ink/8 text-heritage-ink/70'}`}>{c}</button>)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Stanza *</label>
                <input required value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-3 focus:outline-none focus:border-heritage-gold text-lg font-heritage italic" placeholder="Es. Salotto" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-widest font-bold text-heritage-ink/70">Descrizione *</label>
                <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-transparent border-b border-heritage-ink/20 py-3 focus:outline-none focus:border-heritage-gold resize-none h-24 text-lg font-heritage italic" placeholder="Racconta la storia..." />
              </div>
            </div>
          </div>

          {/* ── Dettagli collassabili ── */}
          <MobileDetailsSection form={form} setForm={setForm} handleDetailImages={handleDetailImages} />

          <div className="flex gap-4 pt-2 pb-4">
            {initialData && <button type="button" onClick={() => { onClose(); onDelete?.(initialData.id); }} className="px-5 py-4 rounded-xl border border-red-100 text-red-600 text-sm font-bold uppercase tracking-widest hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} />Elimina</button>}
            <button type="submit" disabled={isSaving} className="heritage-button flex-1 py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvataggio...</> : (initialData ? 'Salva Modifiche' : 'Aggiungi al Catalogo')}</button>
          </div>

        </form>
      </motion.div>

      {/* ── Modale Applica risultato AI ── */}
      <AnimatePresence>
        {showApplyModal && analyzeResult && (
          <>
            <motion.div
              key="apply-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-heritage-ink/50 backdrop-blur-sm"
              onClick={() => setShowApplyModal(false)}
            />
            <motion.div
              key="apply-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[310] bg-white rounded-t-[24px] shadow-2xl"
              style={{ maxHeight: '85dvh' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-heritage-ink/15 rounded-full" />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(85dvh - 20px)' }}>
                <div className="px-6 pt-4 pb-2 flex items-center gap-3 border-b border-heritage-ink/8">
                  <Sparkles size={18} className="text-heritage-gold" />
                  <div>
                    <p className="font-bold text-[14px] text-heritage-ink">Claude ha analizzato le foto</p>
                    <p className="text-[11px] text-heritage-ink/50 font-serif italic">Scegli cosa applicare</p>
                  </div>
                  <button onClick={() => setShowApplyModal(false)} className="ml-auto p-2 hover:bg-heritage-cream rounded-full"><X size={18} /></button>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {/* Applica tutto */}
                  <button
                    onClick={applyAll}
                    className="w-full flex items-center gap-3 px-5 py-4 bg-heritage-gold text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-heritage-gold/90 transition-colors shadow-md"
                  >
                    <Check size={16} /> Applica tutto
                  </button>
                  {/* Campo per campo */}
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-heritage-ink/50 mb-3">Oppure scegli campo per campo</p>
                    {APPLY_FIELDS.map(({ key, label }) => {
                      const val = (analyzeResult as any)[key];
                      if (!val) return null;
                      const current = (form as any)[key];
                      return (
                        <div key={key} className="flex items-start gap-3 p-3 bg-heritage-cream/40 rounded-xl border border-heritage-ink/8">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-heritage-gold mb-1">{label}</p>
                            <p className="text-[13px] text-heritage-ink leading-snug font-heritage italic truncate">{val}</p>
                            {current && current !== val && (
                              <p className="text-[11px] text-heritage-ink/40 mt-0.5 truncate">Attuale: {current}</p>
                            )}
                          </div>
                          <button
                            onClick={() => applyField(key)}
                            className="flex-shrink-0 px-3 py-1.5 bg-heritage-ink text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-heritage-olive transition-colors"
                          >
                            Usa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-6 pb-8">
                  <button onClick={() => setShowApplyModal(false)} className="w-full py-3 rounded-xl border border-heritage-ink/10 text-[12px] font-bold uppercase tracking-widest text-heritage-ink/60 hover:bg-heritage-cream/40">
                    Ignora risultati
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
